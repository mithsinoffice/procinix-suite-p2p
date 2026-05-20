import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { AlertTriangle, Clock, ListChecks, ShieldAlert, Banknote } from 'lucide-react'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { PaymentNav } from './PaymentNav'
import { paymentsApi, type QueueRow, type QueuePriority } from '../../lib/api/payments.api'
import { formatINR, formatDate } from '../../lib/utils/formatters'
import { cn, toArray } from '../../lib/utils'

type Tab = 'ALL' | 'MSME' | 'OVERDUE' | 'URGENT' | 'DUE_WEEK' | 'ADVANCES'

const TABS: { id: Tab; label: string; badge: keyof import('../../lib/api/payments.api').QueueSummary }[] = [
  { id: 'ALL',      label: 'All',           badge: 'total'       },
  { id: 'MSME',     label: 'MSME at risk',  badge: 'msmeAtRisk'  },
  { id: 'OVERDUE',  label: 'Overdue',       badge: 'overdue'     },
  { id: 'URGENT',   label: 'Urgent',        badge: 'urgent'      },
  { id: 'DUE_WEEK', label: 'Due this week', badge: 'dueThisWeek' },
  { id: 'ADVANCES', label: 'Advances',      badge: 'advances'    },
]

export default function PaymentQueuePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('ALL')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Map tab → server query params. The "Due this week" tab is client-side
  // filtered (server has no `dueWithin7days` filter — it has dueBefore which
  // we set to today+7d).
  const queryParams = useMemo(() => {
    if (tab === 'MSME')     return { priority: 'MSME'     as QueuePriority }
    if (tab === 'OVERDUE')  return { priority: 'OVERDUE'  as QueuePriority }
    if (tab === 'URGENT')   return { priority: 'URGENT'   as QueuePriority }
    if (tab === 'ADVANCES') return { type:     'ADVANCE'  as const }
    if (tab === 'DUE_WEEK') {
      const week = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
      return { dueBefore: week }
    }
    return {}
  }, [tab])

  const { data: queueResp, isLoading } = useQuery({
    queryKey: ['payments', 'queue', tab],
    queryFn:  () => paymentsApi.queue(queryParams),
    refetchInterval: 60_000,
  })
  const rows = toArray<QueueRow>(queueResp?.data)

  const { data: summary } = useQuery({
    queryKey: ['payments', 'queue-summary'],
    queryFn:  () => paymentsApi.queueSummary(),
    refetchInterval: 60_000,
  })

  const refresh = useMutation({
    mutationFn: () => paymentsApi.msmeRefresh(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['payments'] }),
  })

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id))
  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(rows.map(r => r.id)))
  }
  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }

  const selectedRows = useMemo(() => rows.filter(r => selected.has(r.id)), [rows, selected])
  const selectedTotal = selectedRows.reduce((s, r) => s + r.finalPayable, 0)

  function createBatchFromSelected() {
    const payload = selectedRows.map(r => ({
      id:         r.id,
      type:       r.type,
      vendorName: r.vendorName,
      vendorId:   r.vendorId,
      ref:        r.ref,
      invoiceAmount: r.invoiceAmount,
      tdsAmount:     r.tdsAmount,
      finalPayable:  r.finalPayable,
      isMsme:        r.isMsme,
    }))
    sessionStorage.setItem('payment.batch.draft', JSON.stringify(payload))
    navigate('/payments/batches/new')
  }

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Payment Queue"
        description="Approved invoices and advances awaiting payment — MSME tracker, urgent flags, TDS"
        backLabel="Dashboard"
        backTo="/dashboard"
        onRefresh={() => qc.invalidateQueries({ queryKey: ['payments'] })}
        actions={
          <button onClick={() => refresh.mutate()} disabled={refresh.isPending}
            className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
            {refresh.isPending ? 'Refreshing MSME…' : 'Refresh MSME flags'}
          </button>
        }
      />

      <PaymentNav />

      {/* KPI strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-4 sm:px-6 py-3 border-b border-border bg-background">
          <Kpi label="Urgent"      value={summary.urgent}      tone={summary.urgent > 0 ? 'amber' : 'default'} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
          <Kpi label="MSME at risk" value={summary.msmeAtRisk}  tone={summary.msmeAtRisk > 0 ? 'red' : 'default'} icon={<ShieldAlert className="h-3.5 w-3.5" />} />
          <Kpi label="Overdue"     value={summary.overdue}     tone={summary.overdue > 0 ? 'red' : 'default'} icon={<Clock className="h-3.5 w-3.5" />} />
          <Kpi label="Due in 7d"   value={summary.dueThisWeek} icon={<ListChecks className="h-3.5 w-3.5" />} />
          <Kpi label="Advances"    value={summary.advances}    icon={<Banknote className="h-3.5 w-3.5" />} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-background overflow-x-auto px-4">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelected(new Set()) }}
            className={cn(
              'px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}>
            {t.label}
            {summary && (
              <span className="ml-1.5 text-[10px] text-muted-foreground">{summary[t.badge] ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-2 sm:px-6 text-xs">
          <span className="text-amber-900">
            <strong>{selected.size}</strong> selected · total <strong>{formatINR(selectedTotal)}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="text-amber-700 hover:underline">Clear</button>
            <button onClick={createBatchFromSelected}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">
              Create payment batch →
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">Nothing in this lane.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="w-8 px-3 py-2.5"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Ref</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Vendor</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">MSME</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Due date</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Days</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Invoice</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">TDS</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Net</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Final</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Priority</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: QueueRow) => (
                <tr key={r.id} className={cn('border-b border-border hover:bg-muted/20',
                  selected.has(r.id) && 'bg-primary/5',
                )}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} /></td>
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-primary">{r.ref}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium border',
                      r.type === 'INVOICE' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-purple-50 border-purple-200 text-purple-700',
                    )}>{r.type === 'INVOICE' ? 'Invoice' : 'Advance'}</span>
                  </td>
                  <td className="px-3 py-2.5 max-w-[180px] truncate">
                    <div className="text-sm">{r.vendorName ?? '—'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{r.vendorCode ?? ''}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    {r.isMsme ? (
                      <MsmeChip priority={r.msmePriority} days={r.msmeDaysRemaining} category={r.msmeCategory} />
                    ) : <span className="text-[10px] text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{r.dueDate ? formatDate(r.dueDate) : '—'}</td>
                  <td className="px-3 py-2.5">
                    {r.isOverdue ? (
                      <span className="text-[10px] font-semibold text-red-700">{r.overdueDays}d overdue</span>
                    ) : r.msmeDaysRemaining != null ? (
                      <span className={cn('text-[10px] font-medium',
                        r.msmeDaysRemaining < 0 ? 'text-red-700' :
                        r.msmeDaysRemaining < 7 ? 'text-red-700' :
                        r.msmeDaysRemaining < 15 ? 'text-amber-700' : 'text-muted-foreground'
                      )}>{r.msmeDaysRemaining}d left</span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatINR(r.invoiceAmount)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatINR(r.tdsAmount)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatINR(r.netPayable)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatINR(r.finalPayable)}</td>
                  <td className="px-3 py-2.5"><PriorityChip row={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, tone = 'default', icon }: { label: string; value: number; tone?: 'red' | 'amber' | 'default'; icon: React.ReactNode }) {
  const cls = tone === 'red' ? 'border-red-200 bg-red-50 text-red-800'
            : tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-border bg-card'
  return (
    <div className={cn('flex items-center justify-between rounded-lg border px-3 py-2', cls)}>
      <div>
        <div className="text-[10px] uppercase tracking-wide">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
      <div className={cn('opacity-60', tone === 'default' && 'text-muted-foreground')}>{icon}</div>
    </div>
  )
}

function MsmeChip({ priority, days, category }: { priority: 'CRITICAL' | 'AT_RISK' | 'NORMAL' | null; days: number | null; category: string | null }) {
  const cls = priority === 'CRITICAL' || (days != null && days < 0) ? 'bg-red-50 border-red-200 text-red-700'
            : priority === 'AT_RISK'  ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-green-50 border-green-200 text-green-700'
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold', cls)}>
      MSME{category ? ` · ${category[0]}` : ''}
    </span>
  )
}

function PriorityChip({ row }: { row: QueueRow }) {
  if (row.isOverdue) {
    return <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">🔴 OVERDUE</span>
  }
  if (row.isUrgent) {
    return <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">🟠 URGENT</span>
  }
  if (row.isMsme && row.msmePriority === 'CRITICAL') {
    return <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">MSME CRITICAL</span>
  }
  if (row.isMsme && row.msmePriority === 'AT_RISK') {
    return <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">MSME AT RISK</span>
  }
  if (row.dueDate) {
    const days = Math.floor((new Date(row.dueDate).getTime() - Date.now()) / 86_400_000)
    if (days >= 0 && days <= 7) {
      return <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">🔵 DUE SOON</span>
    }
  }
  return <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">NORMAL</span>
}
