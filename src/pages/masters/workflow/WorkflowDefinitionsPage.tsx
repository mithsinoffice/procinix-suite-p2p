import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Eye, Copy, GitBranch } from 'lucide-react'
import { http } from '../../../lib/http'
import { MasterPageHeader } from '../../../components/masters/MasterFormLayout'
import { cn } from '../../../lib/utils'
import { formatStatus, getStatusColor } from '../../../lib/utils/formatters'

interface WfStage      { id: string; order: number; name: string }
interface WfCondition  { id: string }
interface WfDefinition {
  id: string; code: string; name: string; module: string
  entityId?: string; departmentId?: string; priority: number
  isDefault: boolean; status: string; description?: string
  stages: WfStage[]; conditions: WfCondition[]
  _count: { instances: number }
}

const MODULE_PILLS = [
  { id: 'ALL',     label: 'All'     },
  { id: 'INVOICE', label: 'Invoice' },
  { id: 'VENDOR',  label: 'Vendor'  },
  { id: 'PAYMENT', label: 'Payment' },
  { id: 'PR',      label: 'PR'      },
  { id: 'PO',      label: 'PO'      },
]

const STATUS_TABS = [
  { id: 'ALL',      label: 'All'      },
  { id: 'ACTIVE',   label: 'Active'   },
  { id: 'DRAFT',    label: 'Draft'    },
  { id: 'ARCHIVED', label: 'Archived' },
]

const MODULE_COLORS: Record<string, string> = {
  INVOICE: 'bg-violet-50 border-violet-200 text-violet-700',
  VENDOR:  'bg-rose-50 border-rose-200 text-rose-700',
  PAYMENT: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  PR:      'bg-amber-50 border-amber-200 text-amber-700',
  PO:      'bg-blue-50 border-blue-200 text-blue-700',
}

export default function WorkflowDefinitionsPage() {
  const navigate     = useNavigate()
  const qc           = useQueryClient()
  const [module, setModule]       = useState('ALL')
  const [statusTab, setStatusTab] = useState('ALL')

  const { data: defs = [], isLoading } = useQuery({
    queryKey:       ['workflow-definitions', module, statusTab],
    staleTime:      30_000,
    gcTime:         0,
    refetchOnMount: true,
    queryFn: () => {
      const p = new URLSearchParams()
      if (module !== 'ALL')    p.set('module', module)
      if (statusTab !== 'ALL') p.set('status', statusTab)
      return http.get<WfDefinition[]>(`/api/workflow/definitions?${p}`)
    },
  })

  const duplicate = useMutation({
    mutationFn: (id: string) =>
      http.post<WfDefinition>(`/api/workflow/definitions/${id}/duplicate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-definitions'] }),
  })

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Workflow Definitions"
        description="Define approval stages, conditions and routing rules for each module"
        backLabel="Workflow"
        backTo="/workflow"
        onRefresh={() => qc.invalidateQueries({ queryKey: ['workflow-definitions'] })}
        actions={
          <button
            onClick={() => navigate('/masters/workflow-definitions/new')}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Add New
          </button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {STATUS_TABS.map(t => (
          <button key={t.id} onClick={() => setStatusTab(t.id)}
            className={cn(
              'px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              statusTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Module filter pills */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-background">
        <span className="text-xs text-muted-foreground font-medium">Module:</span>
        <div className="flex items-center rounded-lg border border-input overflow-hidden">
          {MODULE_PILLS.map(p => (
            <button key={p.id} onClick={() => setModule(p.id)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium transition-colors',
                module === p.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : defs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <GitBranch className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No workflow definitions found</p>
            <button
              onClick={() => navigate('/masters/workflow-definitions/new')}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Create first workflow
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0">
              <tr>
                {['Code', 'Name', 'Module', 'Priority', 'Stages', 'Conditions', 'Instances', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {defs.map(def => (
                <tr key={def.id} className="border-b border-border hover:bg-muted/20 cursor-pointer"
                  onClick={() => navigate(`/masters/workflow-definitions/${def.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{def.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-xs">{def.name}</div>
                    {def.isDefault && (
                      <span className="text-[10px] font-medium text-amber-600">Default fallback</span>
                    )}
                    {def.description && (
                      <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{def.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium border',
                      MODULE_COLORS[def.module] ?? 'bg-muted border-border text-muted-foreground',
                    )}>
                      {def.module}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums font-medium">{def.priority}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700">
                      {def.stages.length} {def.stages.length === 1 ? 'stage' : 'stages'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                    {def.conditions.length || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                    {def._count.instances}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(def.status))}>
                      {formatStatus(def.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => navigate(`/masters/workflow-definitions/${def.id}`)}
                        title="Edit"
                        className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/masters/workflow-definitions/${def.id}`)}
                        title="View stages"
                        className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => duplicate.mutate(def.id)}
                        title="Duplicate"
                        disabled={duplicate.isPending}
                        className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
