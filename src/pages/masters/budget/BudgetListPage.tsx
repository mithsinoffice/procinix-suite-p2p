import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { http } from '../../../lib/http'
import { MasterPageHeader, FormSelect } from '../../../components/masters/MasterFormLayout'
import { formatCurrency, formatStatus, getStatusColor } from '../../../lib/utils/formatters'
import { cn } from '../../../lib/utils'

const STATUS_TABS = ['ALL', 'DRAFT', 'ACTIVE', 'CLOSED']

function utilColour(pct: number) {
  if (pct >= 100) return { bar: 'bg-red-700',    text: 'text-red-700',    label: 'EXHAUSTED' }
  if (pct >= 90)  return { bar: 'bg-red-500',    text: 'text-red-600',    label: null }
  if (pct >= 75)  return { bar: 'bg-amber-500',  text: 'text-amber-600',  label: null }
  return                  { bar: 'bg-green-500', text: 'text-green-700',  label: null }
}

export default function BudgetListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('ALL')
  const [entityFilter, setEntityFilter] = useState('')

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budget-list', status, entityFilter],
    queryFn:  () => {
      const p = new URLSearchParams()
      if (status !== 'ALL') p.set('status', status)
      if (entityFilter)     p.set('entityId', entityFilter)
      return http.get<any>(`/api/budgets?${p}`).then((r: any) => Array.isArray(r) ? r : (r?.data ?? []))
    },
    staleTime: 30_000,
  })

  const { data: entities = [] } = useQuery({
    queryKey: ['entities-lookup'],
    queryFn:  () => http.get<any>('/api/masters/entities').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: glCodes = [] } = useQuery({
    queryKey: ['gl-codes-lookup'],
    queryFn:  () => http.get<any>('/api/masters/gl-codes').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: costCentres = [] } = useQuery({
    queryKey: ['cost-centres-lookup'],
    queryFn:  () => http.get<any>('/api/masters/cost-centres').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const entityMap = Object.fromEntries((entities as any[]).map(e => [e.id, e]))
  const glMap     = Object.fromEntries((glCodes as any[]).map(g => [g.id, g]))
  const ccMap     = Object.fromEntries((costCentres as any[]).map(c => [c.id, c]))

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Budgets"
        description="Multi-dimensional budgets with monthly/quarterly/annual periods, carry forward and tolerance zones"
        backLabel="Dashboard"
        backTo="/dashboard"
        actions={
          <button onClick={() => navigate('/budgets/new')}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New Budget
          </button>
        }
      />

      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
              status === s ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {s === 'ALL' ? 'All' : formatStatus(s)}
          </button>
        ))}
      </div>

      {(entities as any[]).length > 1 && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border sm:px-6">
          <span className="text-xs text-muted-foreground">Entity</span>
          <div className="w-56">
            <FormSelect value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
              <option value="">All entities</option>
              {(entities as any[]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </FormSelect>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">No budgets found</p>
            <button onClick={() => navigate('/budgets/new')} className="mt-3 text-sm text-primary hover:underline">Create first budget</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0">
              <tr>
                {['Budget Ref', 'Name', 'Entity', 'GL Code', 'Cost Centre', 'Period', 'Budget', 'Committed', 'Actual', 'Available', 'Utilisation', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {budgets.map((b: any) => {
                const pct = Number(b.utilisedPct)
                const col = utilColour(pct)
                return (
                  <tr key={b.id} onClick={() => navigate(`/budgets/${b.id}`)}
                    className="border-b border-border hover:bg-muted/20 cursor-pointer">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-primary">{b.budgetRef}</td>
                    <td className="px-3 py-3 text-xs font-medium">{b.name}</td>
                    <td className="px-3 py-3 text-xs">{entityMap[b.entityId]?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-xs font-mono">{b.glCodeId ? glMap[b.glCodeId]?.code ?? '—' : '—'}</td>
                    <td className="px-3 py-3 text-xs font-mono">{b.costCentreId ? ccMap[b.costCentreId]?.code ?? '—' : '—'}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{b.periodType}</td>
                    <td className="px-3 py-3 text-xs font-mono tabular-nums">{formatCurrency(b.revisedAmount)}</td>
                    <td className="px-3 py-3 text-xs font-mono tabular-nums text-amber-600">{formatCurrency(b.committedAmount)}</td>
                    <td className="px-3 py-3 text-xs font-mono tabular-nums text-blue-600">{formatCurrency(b.actualAmount)}</td>
                    <td className="px-3 py-3 text-xs font-mono tabular-nums font-semibold">{formatCurrency(b.availableAmount)}</td>
                    <td className="px-3 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn('h-full rounded-full', col.bar)} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className={cn('text-xs font-mono tabular-nums font-medium', col.text)}>{pct.toFixed(1)}%</span>
                        {col.label && (
                          <span className="rounded-full bg-red-50 border border-red-200 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">{col.label}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(b.status))}>
                        {formatStatus(b.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/budgets/${b.id}`)}
                          className="text-xs text-primary hover:underline">View</button>
                        {b.status === 'DRAFT' && (
                          <button onClick={() => navigate(`/budgets/${b.id}/edit`)}
                            className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
