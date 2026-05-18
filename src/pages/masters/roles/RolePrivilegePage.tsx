import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Loader2, AlertTriangle, Shield, X } from 'lucide-react'
import { http, HttpError } from '../../../lib/http'
import { MasterPageHeader, FormInput, FormTextarea } from '../../../components/masters/MasterFormLayout'
import { cn } from '../../../lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const MODULES = ['INTAKE', 'PO', 'GRN', 'INVOICE', 'PAYMENT', 'VENDOR', 'BUDGET', 'MASTERS', 'ADMIN'] as const
const ACTIONS = ['create', 'view', 'edit', 'delete', 'submit', 'approve'] as const

type Module = typeof MODULES[number]
type Action = typeof ACTIONS[number]
type Permissions = Record<string, Record<string, boolean>>

interface Role {
  id:          string
  tenantId:    string
  roleCode:    string
  roleName:    string
  description?: string | null
  permissions: Permissions | null
  isSystem:    boolean
  status:      string
  createdAt:   string
  updatedAt:   string
}

const emptyPerms = (): Permissions => Object.fromEntries(
  MODULES.map(m => [m, Object.fromEntries(ACTIONS.map(a => [a, false]))])
) as Permissions

function countTrue(perms: Permissions | null): number {
  if (!perms) return 0
  return Object.values(perms).reduce(
    (sum, mod) => sum + Object.values(mod ?? {}).filter(Boolean).length,
    0,
  )
}

function modulesEnabledSummary(perms: Permissions | null): string[] {
  if (!perms) return []
  return MODULES.filter(m => Object.values(perms[m] ?? {}).some(Boolean))
}

// ── Editor modal ──────────────────────────────────────────────────────────────

function RoleEditor({ role, onClose }: { role: Role | 'new'; onClose: () => void }) {
  const qc = useQueryClient()
  const isNew = role === 'new'
  const initial: Role = isNew
    ? {
        id: '', tenantId: '', roleCode: '', roleName: '', description: '',
        permissions: emptyPerms(), isSystem: false, status: 'ACTIVE',
        createdAt: '', updatedAt: '',
      }
    : role

  const [roleCode,    setRoleCode]    = useState(initial.roleCode)
  const [roleName,    setRoleName]    = useState(initial.roleName)
  const [description, setDescription] = useState(initial.description ?? '')
  const [perms,       setPerms]       = useState<Permissions>(initial.permissions ?? emptyPerms())
  const [apiError,    setApiError]    = useState<string | null>(null)

  const isSystem = !isNew && initial.isSystem

  function togglePerm(mod: Module, action: Action) {
    setPerms(p => ({
      ...p,
      [mod]: { ...(p[mod] ?? {}), [action]: !(p[mod]?.[action]) },
    }))
  }

  function toggleAllInModule(mod: Module, value: boolean) {
    setPerms(p => ({
      ...p,
      [mod]: Object.fromEntries(ACTIONS.map(a => [a, value])),
    }))
  }

  function toggleAllInAction(action: Action, value: boolean) {
    setPerms(p => Object.fromEntries(
      MODULES.map(m => [m, { ...(p[m] ?? {}), [action]: value }]),
    ) as Permissions)
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        roleCode:    roleCode.toUpperCase().trim(),
        roleName:    roleName.trim(),
        description: description.trim() || null,
        permissions: perms,
        status:      'ACTIVE',
      }
      return isNew
        ? http.post<Role>('/api/masters/roles', payload)
        : http.put<Role>(`/api/masters/roles/${initial.id}`, payload)
    },
    onSuccess: () => {
      setApiError(null)
      qc.invalidateQueries({ queryKey: ['role-privileges'] })
      qc.invalidateQueries({ queryKey: ['my-permissions'] })
      onClose()
    },
    onError: (err: unknown) => {
      if (err instanceof HttpError)  setApiError(err.error.message || `Save failed (${err.error.status})`)
      else if (err instanceof Error) setApiError(err.message)
      else                           setApiError('Save failed — please retry')
    },
  })

  const total = countTrue(perms)
  const valid = roleCode.length >= 2 && roleName.length >= 2

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl bg-card shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">{isNew ? 'New role' : `Edit ${initial.roleName}`}</p>
              <p className="text-xs text-muted-foreground">{total} permission{total === 1 ? '' : 's'} enabled across {modulesEnabledSummary(perms).length} module{modulesEnabledSummary(perms).length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-auto px-6 py-5 space-y-5">

          {isSystem && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">System role</p>
                <p className="text-xs text-amber-700 mt-0.5">Changes affect every user assigned this role. Code and System flag cannot be changed.</p>
              </div>
            </div>
          )}

          {apiError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div><p className="text-sm font-medium text-red-700">Save failed</p><p className="text-xs text-red-600 mt-0.5">{apiError}</p></div>
            </div>
          )}

          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role code <span className="text-destructive">*</span></label>
              <FormInput value={roleCode} disabled={isSystem}
                placeholder="CUSTOM_ROLE_NAME"
                className="uppercase"
                onChange={e => setRoleCode(e.target.value.toUpperCase())} />
              <p className="text-xs text-muted-foreground">Short uppercase identifier — used in code and APIs</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Display name <span className="text-destructive">*</span></label>
              <FormInput value={roleName} placeholder="Custom Role"
                onChange={e => setRoleName(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <FormTextarea rows={2} value={description}
                placeholder="What this role can do, who it's for…"
                onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Permission matrix */}
          <div>
            <p className="text-sm font-semibold mb-2">Permission matrix</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground sticky left-0 bg-muted/40 z-10">Module</th>
                    {ACTIONS.map(a => {
                      const allOn = MODULES.every(m => perms[m]?.[a])
                      return (
                        <th key={a} className="px-3 py-2 text-center font-medium text-muted-foreground capitalize">
                          <div className="flex flex-col items-center gap-0.5">
                            <span>{a}</span>
                            <button type="button"
                              onClick={() => toggleAllInAction(a, !allOn)}
                              className="text-[10px] text-primary hover:underline">
                              {allOn ? 'none' : 'all'}
                            </button>
                          </div>
                        </th>
                      )
                    })}
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground w-16">All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MODULES.map(m => {
                    const allOn = ACTIONS.every(a => perms[m]?.[a])
                    return (
                      <tr key={m}>
                        <td className="px-3 py-2 font-medium sticky left-0 bg-card z-10">{m}</td>
                        {ACTIONS.map(a => (
                          <td key={a} className="px-3 py-2 text-center">
                            <input type="checkbox"
                              checked={!!perms[m]?.[a]}
                              onChange={() => togglePerm(m, a)}
                              className="h-4 w-4 rounded border-input accent-primary cursor-pointer" />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => toggleAllInModule(m, !allOn)}
                            className={cn('rounded px-2 py-0.5 text-[10px] font-medium',
                              allOn ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-muted hover:bg-muted/70')}>
                            {allOn ? 'none' : 'all'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use the per-column / per-row "all" buttons to toggle a whole module or a whole action quickly.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3 bg-muted/20">
          <button onClick={onClose}
            className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
          <button onClick={() => save.mutate()} disabled={!valid || save.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isNew ? 'Create role' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── List page ────────────────────────────────────────────────────────────────

export default function RolePrivilegePage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Role | 'new' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey:  ['role-privileges'],
    queryFn:   () => http.get<{ data: Role[]; total: number }>('/api/masters/roles'),
    staleTime: 30_000,
  })

  const roles = data?.data ?? []

  // Keep `editing` ref fresh after saves so the row in the table reflects edits if reopened
  useEffect(() => {
    if (editing && editing !== 'new') {
      const fresh = roles.find(r => r.id === (editing as Role).id)
      if (fresh && fresh.updatedAt !== (editing as Role).updatedAt) setEditing(fresh)
    }
  }, [roles, editing])

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Roles & Privileges"
        description="Define roles with module-level permissions. System roles ship with the product; custom roles can be added on top."
        onRefresh={() => qc.invalidateQueries({ queryKey: ['role-privileges'] })}
        actions={
          <button onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New role
          </button>
        }
      />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No roles defined</p>
            <button onClick={() => setEditing('new')} className="mt-3 text-sm text-primary hover:underline">Create the first role</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0">
              <tr>
                {['Code', 'Role name', 'Description', 'Type', 'Modules enabled', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map(r => {
                const mods = modulesEnabledSummary(r.permissions)
                return (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/20 cursor-pointer"
                    onClick={() => setEditing(r)}>
                    <td className="px-4 py-3 font-mono text-xs font-medium">{r.roleCode}</td>
                    <td className="px-4 py-3 font-medium">{r.roleName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[320px] truncate">{r.description ?? '—'}</td>
                    <td className="px-4 py-3">
                      {r.isSystem
                        ? <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-medium">System</span>
                        : <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Custom</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {mods.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : mods.slice(0, 4).map(m => (
                          <span key={m} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{m}</span>
                        ))}
                        {mods.length > 4 && <span className="text-[10px] text-muted-foreground">+{mods.length - 4}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium',
                        r.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-muted text-muted-foreground')}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditing(r)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing && <RoleEditor role={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
