import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Clock, KeyRound, Power, Loader2 } from 'lucide-react'
import { http } from '../../../lib/http'
import { MasterPageHeader } from '../../../components/masters/MasterFormLayout'
import { AuditTrailDrawer } from '../../../components/shared/AuditTrailDrawer'
import { formatDate } from '../../../lib/utils/formatters'
import { cn } from '../../../lib/utils'

interface EntityAccess { entityId: string; isActive: boolean }
interface User {
  id:                string
  name:              string
  email:             string
  role:              string
  additionalRoles?:  string[] | null
  employeeId?:       string | null
  isActive:          boolean
  status?:           string
  mustResetPassword: boolean
  lastLoginAt?:      string | null
  entityAccess?:     EntityAccess[]
}

const STATUS_TABS = ['ALL', 'ACTIVE', 'INACTIVE']
const ROLE_FILTERS = [
  { value: 'ALL',              label: 'All roles'        },
  { value: 'AP_CLERK',         label: 'AP Clerk'         },
  { value: 'AP_MANAGER',       label: 'AP Manager'       },
  { value: 'FINANCE_MANAGER',  label: 'Finance Manager'  },
  { value: 'CFO',              label: 'CFO'              },
  { value: 'MD',               label: 'MD / CEO'         },
  { value: 'APPROVER_L1',      label: 'Approver L1'      },
  { value: 'APPROVER_L2',      label: 'Approver L2'      },
  { value: 'APPROVER_L3',      label: 'Approver L3'      },
]

export default function UserListPage() {
  const navigate                  = useNavigate()
  const qc                        = useQueryClient()
  const [status, setStatus]       = useState('ALL')
  const [role, setRole]           = useState('ALL')
  const [search, setSearch]       = useState('')
  const [audit, setAudit]         = useState<{ id: string; name: string } | null>(null)
  const [resetFor, setResetFor]   = useState<User | null>(null)
  const [newPwd, setNewPwd]       = useState('')

  const { data, isLoading } = useQuery({
    queryKey:       ['users', status, role, search],
    staleTime:      30_000,
    gcTime:         0,
    retry:          false,
    refetchOnMount: true,
    queryFn:        () => {
      const p = new URLSearchParams()
      if (status !== 'ALL') p.set('status', status)
      if (role   !== 'ALL') p.set('role',   role)
      if (search)           p.set('search', search)
      return http.get<{ data: User[]; total: number }>(`/api/admin/users?${p}`)
    },
  })

  const { data: entities = [] } = useQuery({
    queryKey: ['entities-lookup'],
    queryFn:  () => http.get<any>('/api/masters/entities').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const entityMap = Object.fromEntries((entities as any[]).map(e => [e.id, e]))

  const users = data?.data ?? []
  const total = data?.total ?? 0

  const toggleActive = useMutation({
    mutationFn: (id: string) => http.post(`/api/admin/users/${id}/toggle-active`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const resetPassword = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      http.post(`/api/admin/users/${id}/reset-password`, { newPassword }),
    onSuccess:  () => { setResetFor(null); setNewPwd(''); qc.invalidateQueries({ queryKey: ['users'] }) },
  })

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Users"
        description={`${total} system user${total === 1 ? '' : 's'} — roles, entity access and password resets`}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['users'] })}
        actions={
          <>
            <input type="search" placeholder="Search name, email…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring w-56" />
            <button onClick={() => navigate('/masters/users/new')}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> New user
            </button>
          </>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-0 border-b border-border">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              status === s ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Role pills */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border overflow-x-auto sm:px-6">
        <span className="text-xs text-muted-foreground flex-shrink-0">Role</span>
        {ROLE_FILTERS.map(r => (
          <button key={r.value} onClick={() => setRole(r.value)}
            className={cn('rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
              role === r.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background hover:bg-muted')}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No users found</p>
            <button onClick={() => navigate('/masters/users/new')} className="mt-3 text-sm text-primary hover:underline">Add your first user</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0">
              <tr>
                {['Name', 'Email', 'Primary role', 'Additional roles', 'Entities', 'Employee link', 'Last login', 'Must reset', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const addl = Array.isArray(u.additionalRoles) ? u.additionalRoles : []
                const ents = (u.entityAccess ?? []).filter(e => e.isActive)
                return (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/20 cursor-pointer"
                    onClick={() => navigate(`/masters/users/${u.id}`)}>
                    <td className="px-3 py-3 font-medium">{u.name}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{u.email}</td>
                    <td className="px-3 py-3 text-xs">{u.role.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-3">
                      {addl.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                        <div className="flex flex-wrap gap-1">
                          {addl.slice(0, 2).map(r => (
                            <span key={r} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{r.replace(/_/g, ' ')}</span>
                          ))}
                          {addl.length > 2 && <span className="text-[10px] text-muted-foreground">+{addl.length - 2}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {ents.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                        <div className="flex flex-wrap gap-1">
                          {ents.slice(0, 2).map(e => (
                            <span key={e.entityId} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                              {entityMap[e.entityId]?.code ?? entityMap[e.entityId]?.name ?? '—'}
                            </span>
                          ))}
                          {ents.length > 2 && <span className="text-[10px] text-muted-foreground">+{ents.length - 2}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {u.employeeId
                        ? <span className="rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 text-[10px] font-medium">Linked</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}
                    </td>
                    <td className="px-3 py-3">
                      {u.mustResetPassword && (
                        <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-medium">Reset required</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {u.status === 'PENDING_APPROVAL' ? (
                        <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs font-medium">
                          Pending approval
                        </span>
                      ) : u.status === 'DRAFT' ? (
                        <span className="rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-xs font-medium">
                          Draft
                        </span>
                      ) : (
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium',
                          u.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-muted text-muted-foreground')}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/masters/users/${u.id}`)} title="Edit"
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setResetFor(u)} title="Reset password"
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => toggleActive.mutate(u.id)}
                          disabled={toggleActive.isPending}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                          className={cn('rounded p-1 hover:bg-muted disabled:opacity-50',
                            u.isActive ? 'text-red-600' : 'text-green-600')}>
                          {toggleActive.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => setAudit({ id: u.id, name: u.name })} title="Audit"
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                          <Clock className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Reset password modal */}
      {resetFor && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <p className="text-sm font-semibold mb-1">Reset password — {resetFor.name}</p>
            <p className="text-xs text-muted-foreground mb-4">User will not be forced to reset again unless you re-enable the flag.</p>
            <input type="password" placeholder="New password (min 8 chars)" value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => { setResetFor(null); setNewPwd('') }}
                className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => resetPassword.mutate({ id: resetFor.id, newPassword: newPwd })}
                disabled={newPwd.length < 8 || resetPassword.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {resetPassword.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Reset password
              </button>
            </div>
          </div>
        </div>
      )}

      <AuditTrailDrawer open={!!audit} onClose={() => setAudit(null)}
        entityType="user" entityId={audit?.id ?? ''} entityName={audit?.name ?? ''} />
    </div>
  )
}
