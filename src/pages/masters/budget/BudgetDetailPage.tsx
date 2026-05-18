import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, History } from 'lucide-react'
import { http } from '../../../lib/http'
import {
  MasterPageHeader, FormInput, FormTextarea,
} from '../../../components/masters/MasterFormLayout'
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '../../../lib/utils/formatters'
import { cn } from '../../../lib/utils'

function utilColour(pct: number) {
  if (pct >= 100) return { bar: 'bg-red-700',    text: 'text-red-700',    badge: 'bg-red-50 text-red-700 border-red-200', label: 'EXHAUSTED' }
  if (pct >= 90)  return { bar: 'bg-red-500',    text: 'text-red-600',    badge: 'bg-red-50 text-red-700 border-red-200', label: null }
  if (pct >= 75)  return { bar: 'bg-amber-500',  text: 'text-amber-600',  badge: 'bg-amber-50 text-amber-700 border-amber-200', label: null }
  return                  { bar: 'bg-green-500', text: 'text-green-700',  badge: 'bg-green-50 text-green-700 border-green-200', label: null }
}

function availColour(availPct: number) {
  if (availPct < 10) return 'bg-red-50 border-red-200 text-red-700'
  if (availPct < 25) return 'bg-amber-50 border-amber-200 text-amber-700'
  return 'bg-green-50 border-green-200 text-green-700'
}

export default function BudgetDetailPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const qc       = useQueryClient()
  const [showRevise, setShowRevise] = useState(false)
  const [reviseAmount, setReviseAmount] = useState('')
  const [reviseReason, setReviseReason] = useState('')

  const { data: budget, isLoading } = useQuery({
    queryKey: ['budget', id],
    queryFn:  () => http.get<any>(`/api/budgets/${id}`),
    enabled:  !!id,
    staleTime: 0,
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
  const entityMap = Object.fromEntries((entities as any[]).map(e => [e.id, e]))
  const glMap     = Object.fromEntries((glCodes as any[]).map(g => [g.id, g]))

  const revise = useMutation({
    mutationFn: () => http.post(`/api/budgets/${id}/revise`, {
      revisedAmount: Number(reviseAmount),
      reason:        reviseReason,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget', id] })
      qc.invalidateQueries({ queryKey: ['budget-list'] })
      setShowRevise(false)
      setReviseAmount('')
      setReviseReason('')
    },
  })

  if (isLoading || !budget) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  const revised   = Number(budget.revisedAmount)
  const committed = Number(budget.committedAmount)
  const actual    = Number(budget.actualAmount)
  const available = revised - committed - actual
  const used      = committed + actual
  const utilPct   = revised > 0 ? (used / revised) * 100 : 0
  const availPct  = revised > 0 ? (available / revised) * 100 : 0
  const col       = utilColour(utilPct)

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={`${budget.budgetRef} — ${budget.name}`}
        description={`${entityMap[budget.entityId]?.name ?? '—'} · ${budget.glCodeId ? glMap[budget.glCodeId]?.code ?? '—' : 'All GLs'} · ${budget.periodType}`}
        backLabel="Budget"
        backTo="/budgets"
        actions={
          <div className="flex items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(budget.status))}>
              {formatStatus(budget.status)}
            </span>
            {budget.status === 'DRAFT' && (
              <button onClick={() => navigate(`/budgets/${id}/edit`)}
                className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            {budget.status === 'ACTIVE' && (
              <button onClick={() => setShowRevise(s => !s)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                <History className="h-3.5 w-3.5" /> Revise Budget
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Approved Budget" value={formatCurrency(revised)} tone="bg-card border-border" />
            <Card label="Committed (POs)" value={formatCurrency(committed)} tone="bg-amber-50 border-amber-200 text-amber-700" />
            <Card label="Actual (Invoices)" value={formatCurrency(actual)} tone="bg-blue-50 border-blue-200 text-blue-700" />
            <Card label="Available" value={formatCurrency(available)} tone={availColour(availPct)} />
          </div>

          {/* Utilisation bar */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Utilisation</p>
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-mono tabular-nums font-semibold', col.text)}>{utilPct.toFixed(1)}%</span>
                {col.label && (
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', col.badge)}>{col.label}</span>
                )}
              </div>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', col.bar)} style={{ width: `${Math.min(100, utilPct)}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Used: {formatCurrency(used)}</span>
              <span>Tolerance: ±{Number(budget.toleranceZonePct)}% · {budget.hardBlock ? 'Hard block ON' : 'Soft block'}</span>
            </div>
          </div>

          {/* Revise form */}
          {showRevise && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4">
              <p className="text-sm font-semibold">Revise Budget</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">New Amount (₹)</label>
                  <FormInput type="number" step="0.01" min="0" placeholder={String(revised)}
                    value={reviseAmount} onChange={e => setReviseAmount(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <FormTextarea rows={3} placeholder="Why this revision is needed…"
                  value={reviseReason} onChange={e => setReviseReason(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowRevise(false)}
                  className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => revise.mutate()}
                  disabled={revise.isPending || !reviseAmount || !reviseReason}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  {revise.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Submit revision
                </button>
              </div>
            </div>
          )}

          {/* Period breakdown */}
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm font-semibold mb-3">Period Breakdown</p>
            {(budget.periods ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No period breakdown configured</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border">
                      {['Period', 'Allocated', 'Committed', 'Actual', 'Available', 'Utilisation'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {budget.periods.map((p: any) => {
                      const pAlloc = Number(p.allocatedAmount)
                      const pComm  = Number(p.committedAmount)
                      const pAct   = Number(p.actualAmount)
                      const pAvail = pAlloc - pComm - pAct
                      const pPct   = pAlloc > 0 ? ((pComm + pAct) / pAlloc) * 100 : 0
                      const pCol   = utilColour(pPct)
                      return (
                        <tr key={p.id}>
                          <td className="px-3 py-3 font-medium">{p.periodLabel}</td>
                          <td className="px-3 py-3 font-mono tabular-nums">{formatCurrency(pAlloc)}</td>
                          <td className="px-3 py-3 font-mono tabular-nums text-amber-600">{formatCurrency(pComm)}</td>
                          <td className="px-3 py-3 font-mono tabular-nums text-blue-600">{formatCurrency(pAct)}</td>
                          <td className="px-3 py-3 font-mono tabular-nums font-semibold">{formatCurrency(pAvail)}</td>
                          <td className="px-3 py-3 min-w-[160px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={cn('h-full rounded-full', pCol.bar)} style={{ width: `${Math.min(100, pPct)}%` }} />
                              </div>
                              <span className={cn('text-xs font-mono tabular-nums', pCol.text)}>{pPct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Revision history */}
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm font-semibold mb-3">Revision History</p>
            {(budget.revisions ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No revisions yet — original budget is the current amount</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border">
                      {['Rev #', 'Previous Amount', 'Revised Amount', 'Change', 'Reason', 'Approved By', 'Date'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {budget.revisions.map((r: any) => {
                      const delta = Number(r.revisedAmount) - Number(r.previousAmount)
                      return (
                        <tr key={r.id}>
                          <td className="px-3 py-3 font-mono font-semibold">R{r.revisionNo}</td>
                          <td className="px-3 py-3 font-mono tabular-nums">{formatCurrency(r.previousAmount)}</td>
                          <td className="px-3 py-3 font-mono tabular-nums">{formatCurrency(r.revisedAmount)}</td>
                          <td className={cn('px-3 py-3 font-mono tabular-nums font-medium', delta >= 0 ? 'text-green-700' : 'text-red-700')}>
                            {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
                          </td>
                          <td className="px-3 py-3 max-w-[280px] truncate" title={r.reason}>{r.reason}</td>
                          <td className="px-3 py-3 text-muted-foreground">{r.approvedBy ?? '—'}</td>
                          <td className="px-3 py-3 text-muted-foreground">{formatDate(r.createdAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

function Card({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={cn('rounded-xl border p-4', tone)}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-lg font-bold font-mono tabular-nums mt-1">{value}</p>
    </div>
  )
}
