import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

const STATUS_TABS = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']

const BUDGET_CHIP: Record<string, string> = {
  OK:         'bg-green-50 text-green-700 border-green-200',
  WARNING:    'bg-amber-50 text-amber-700 border-amber-200',
  HARD_BLOCK: 'bg-red-50 text-red-700 border-red-200',
  SOFT_BLOCK: 'bg-orange-50 text-orange-700 border-orange-200',
  NO_BUDGET:  'bg-muted text-muted-foreground border-border',
}

const PRIORITY_CHIP: Record<string, string> = {
  NORMAL:    'bg-muted text-muted-foreground border-border',
  URGENT:    'bg-amber-50 text-amber-700 border-amber-200',
  EMERGENCY: 'bg-red-50 text-red-700 border-red-200',
}

export default function IntakePage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [status, setStatus] = useState('ALL')

  const { data: prs = [], isLoading } = useQuery({
    queryKey: ['pr-list', status],
    queryFn: () => {
      const p = new URLSearchParams()
      if (status !== 'ALL') p.set('status', status)
      return http.get<any>(`/api/pr?${p}`).then((r: any) => Array.isArray(r) ? r : (r?.data ?? []))
    },
    staleTime: 30_000,
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-lookup'],
    queryFn:  () => http.get<any>('/api/masters/departments').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const deptMap = Object.fromEntries((departments as any[]).map(d => [d.id, d]))

  const submitMutation = useMutation({
    mutationFn: (id: string) => http.post(`/api/pr/${id}/submit`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['pr-list'] }),
  })
  const approveMutation = useMutation({
    mutationFn: (id: string) => http.post(`/api/pr/${id}/approve`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['pr-list'] }),
  })

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Intake"
        description="Purchase requisitions — budget-checked and workflow-driven"
        backLabel="Dashboard"
        backTo="/dashboard"
        actions={
          <button onClick={() => navigate('/intake/new')}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New Intake
          </button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
              status === s ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {s === 'ALL' ? 'All' : formatStatus(s)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : prs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">No intake requests found</p>
            <button onClick={() => navigate('/intake/new')} className="mt-3 text-sm text-primary hover:underline">Create first intake</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0">
              <tr>
                {['PR Ref', 'Type', 'Department', 'Required By', 'Est. Amount', 'Budget', 'Priority', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prs.map((pr: any) => (
                <tr key={pr.id} onClick={() => navigate(`/intake/${pr.id}`)}
                  className="border-b border-border hover:bg-muted/20 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{pr.prRef}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{pr.prType}</td>
                  <td className="px-4 py-3 text-xs">{deptMap[pr.departmentId]?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(pr.requiredBy)}</td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums">{formatCurrency(pr.estimatedTotal, pr.currencyCode)}</td>
                  <td className="px-4 py-3">
                    {pr.budgetStatus ? (
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold border', BUDGET_CHIP[pr.budgetStatus] ?? BUDGET_CHIP.NO_BUDGET)}>
                        {pr.budgetStatus === 'NO_BUDGET' ? 'No budget' : pr.budgetStatus.replace('_', ' ')}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium border', PRIORITY_CHIP[pr.priority] ?? PRIORITY_CHIP.NORMAL)}>
                      {pr.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(pr.status))}>
                      {formatStatus(pr.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/intake/${pr.id}`)}
                        className="text-xs text-primary hover:underline">View</button>
                      {pr.status === 'DRAFT' && (
                        <>
                          <button onClick={() => navigate(`/intake/${pr.id}`)}
                            className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                          <button onClick={() => submitMutation.mutate(pr.id)} disabled={submitMutation.isPending}
                            className="text-xs text-primary hover:underline disabled:opacity-50">Submit</button>
                        </>
                      )}
                      {pr.status === 'SUBMITTED' && (
                        <button onClick={() => approveMutation.mutate(pr.id)} disabled={approveMutation.isPending}
                          className="text-xs text-green-700 hover:underline disabled:opacity-50">Approve</button>
                      )}
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
