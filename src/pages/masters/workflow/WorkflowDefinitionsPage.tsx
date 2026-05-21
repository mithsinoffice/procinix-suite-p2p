import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Copy, Power, Trash2, GitBranch } from 'lucide-react'
import { http } from '../../../lib/http'
import { MasterPageHeader } from '../../../components/masters/MasterFormLayout'
import { cn, toArray } from '../../../lib/utils'

// Workflow listing — designed to match the listingStyles pattern the rest
// of the v2 admin surfaces use (horizontal chip filter, doc-type tag chips,
// row actions: edit/clone/toggle/delete). Engine model is unchanged —
// each row is a WorkflowDefinition with stages + conditions arrays.

interface WfStage     { id: string; order: number; name: string }
interface WfCondition { id: string }
interface WfDefinition {
  id:           string
  code:         string
  name:         string
  module:       string
  description?: string
  status:       string
  priority:     number
  isDefault:    boolean
  updatedAt:    string
  stages:       WfStage[]
  conditions:   WfCondition[]
  _count:       { instances: number }
}

// Module pills — keeps the same option set as the configurator's module
// dropdown so a workflow created there is filterable here. Counts are live
// from the loaded definitions; ALL is computed.
const MODULE_PILLS: { id: string; label: string }[] = [
  { id: 'ALL',         label: 'All'              },
  { id: 'INVOICE',     label: 'Invoice'          },
  { id: 'PR',          label: 'Purchase request' },
  { id: 'PO',          label: 'Purchase order'   },
  { id: 'GRN',         label: 'GRN'              },
  { id: 'PAYMENT',     label: 'Payment'          },
  { id: 'PROVISION',   label: 'Provision'        },
  { id: 'VENDOR',      label: 'Vendor'           },
  { id: 'BUDGET',      label: 'Budget'           },
  { id: 'MASTER',      label: 'Masters'          },
]

// Modules that are master-data approvals (the "Masters" chip aggregates
// these). Kept as a Set for O(1) membership in the filter predicate.
const MASTER_MODULES = new Set([
  'DEPARTMENT', 'GL_CODE', 'COST_CENTRE', 'EMPLOYEE', 'DESIGNATION',
  'LOCATION', 'ITEM', 'ITEM_CHANGE', 'ITEM_CATEGORY', 'VENDOR_CATEGORY',
  'FINANCIAL_YEAR', 'TAX_CODE', 'TDS_SECTION', 'ENTITY', 'USER',
  'CURRENCY', 'PROFIT_CENTRE',
])

function moduleLabel(m: string): string {
  const lookup: Record<string, string> = {
    INVOICE: 'Invoice', PR: 'Purchase request', PO: 'Purchase order',
    GRN: 'GRN', PAYMENT: 'Payment', PROVISION: 'Provision', VENDOR: 'Vendor',
    BUDGET: 'Budget',
  }
  if (lookup[m]) return lookup[m]
  // Master modules render as their human form ("Gl Code" → "GL code")
  return m.toLowerCase().split('_').map((s, i) => i === 0 ? s[0].toUpperCase() + s.slice(1) : s).join(' ')
}

function formatRelativeDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30)  return `${diffDays}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WorkflowDefinitionsPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [module, setModule]   = useState<string>('ALL')
  const [confirm, setConfirm] = useState<WfDefinition | null>(null)

  const { data: raw, isLoading } = useQuery({
    queryKey:       ['workflow-definitions'],
    staleTime:      30_000,
    queryFn:        () => http.get<WfDefinition[]>('/api/workflow/definitions'),
  })
  const defs = toArray<WfDefinition>(raw)

  // Counts shown on the filter chips — computed from the loaded set so
  // they stay live without an extra round-trip per chip.
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: defs.length, MASTER: 0 }
    for (const d of defs) {
      c[d.module] = (c[d.module] ?? 0) + 1
      if (MASTER_MODULES.has(d.module)) c.MASTER = (c.MASTER ?? 0) + 1
    }
    return c
  }, [defs])

  const filtered = useMemo(() => {
    if (module === 'ALL')    return defs
    if (module === 'MASTER') return defs.filter(d => MASTER_MODULES.has(d.module))
    return defs.filter(d => d.module === module)
  }, [defs, module])

  const clone = useMutation({
    mutationFn: (id: string) => http.post<{ id: string }>(`/api/workflow/definitions/${id}/clone`, {}),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['workflow-definitions'] })
      navigate(`/workflow-engine/${res.id}/edit`)
    },
  })

  const toggle = useMutation({
    mutationFn: (def: WfDefinition) =>
      http.patch(`/api/workflow/definitions/${def.id}`, {
        status: def.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-definitions'] }),
  })

  const del = useMutation({
    mutationFn: (id: string) => http.delete(`/api/workflow/definitions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-definitions'] })
      setConfirm(null)
    },
    onError: () => setConfirm(null),
  })

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Workflow engine"
        description="Define approval chains for every document type"
        backLabel="Dashboard"
        backTo="/dashboard"
        actions={
          <button
            onClick={() => navigate('/workflow-engine/new')}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New workflow
          </button>
        }
      />

      {/* Module filter chips — horizontal scrollable. Counts derived from
          loaded set so they don't require a separate stats endpoint. */}
      <div className="flex items-center gap-1.5 border-b border-border bg-background px-4 py-3 overflow-x-auto">
        {MODULE_PILLS.map(p => {
          const active = module === p.id
          const count = counts[p.id] ?? 0
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setModule(p.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border whitespace-nowrap transition-colors',
                active
                  ? 'bg-[#E1F5EE] text-[#0F6E56] border-[#1D9E75]'
                  : 'bg-background text-muted-foreground border-input hover:bg-muted',
              )}
            >
              {p.label}
              <span className={cn(
                'rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                active ? 'bg-[#1D9E75]/20 text-[#0F6E56]' : 'bg-muted text-muted-foreground',
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <GitBranch className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No workflows yet</p>
            <button
              onClick={() => navigate('/workflow-engine/new')}
              className="mt-3 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Create your first one
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0">
              <tr>
                {['Name', 'Document type', 'Steps', 'Conditions', 'Status', 'Last modified', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(def => (
                <tr key={def.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/workflow-engine/${def.id}/edit`)}
                      className="text-left"
                    >
                      <div className="font-medium text-xs">{def.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{def.code}</div>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted/60 text-muted-foreground border border-input">
                      {moduleLabel(def.module)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums">{def.stages.length}</td>
                  <td className="px-4 py-3 text-xs tabular-nums">
                    {def.conditions.length > 0
                      ? <span className="text-[#854F0B] font-medium">{def.conditions.length} condition{def.conditions.length === 1 ? '' : 's'}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {def.status === 'ACTIVE' ? (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#E1F5EE] text-[#0F6E56] border border-[#1D9E75]">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">
                    {formatRelativeDate(def.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => navigate(`/workflow-engine/${def.id}/edit`)}
                        title="Edit"
                        className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => clone.mutate(def.id)}
                        disabled={clone.isPending}
                        title="Clone"
                        className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggle.mutate(def)}
                        disabled={toggle.isPending}
                        title={def.status === 'ACTIVE' ? 'Set to Draft' : 'Activate'}
                        className={cn(
                          'rounded p-1.5 hover:bg-muted',
                          def.status === 'ACTIVE' ? 'text-teal-600 hover:text-teal-700' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirm(def)}
                        title="Delete"
                        className="rounded p-1.5 text-muted-foreground hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation — backend rejects with 409 if instances exist,
          so we don't need a separate "warning" UI for that case. */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl bg-background p-5 shadow-xl border border-border max-w-sm w-full">
            <h3 className="text-sm font-semibold mb-2">Delete workflow?</h3>
            <p className="text-xs text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{confirm.name}</span>
            </p>
            <p className="text-[11px] text-muted-foreground mb-4">
              This will permanently remove the workflow definition + its stages and conditions.
              In-flight instances will block the delete.
            </p>
            {del.isError && (
              <p className="text-[11px] text-red-700 mb-3">
                {del.error instanceof Error ? del.error.message : 'Delete failed'}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => del.mutate(confirm.id)}
                disabled={del.isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
