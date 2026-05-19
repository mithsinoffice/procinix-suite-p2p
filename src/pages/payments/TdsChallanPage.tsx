import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { PaymentNav } from './PaymentNav'
import { paymentsApi, type TdsChallan } from '../../lib/api/payments.api'
import { formatINR, formatDate } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

export default function TdsChallanPage() {
  const qc = useQueryClient()
  const [period, setPeriod] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [depositOpen, setDepositOpen] = useState<TdsChallan | null>(null)
  const [challanNumber, setChallanNumber] = useState('')
  const [depositedAt, setDepositedAt] = useState(() => new Date().toISOString().slice(0, 10))

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['payments', 'tds-challans', period, statusFilter],
    queryFn:  () => paymentsApi.listChallans({ period: period || undefined, status: statusFilter || undefined }),
  })

  const markDeposited = useMutation({
    mutationFn: (id: string) => paymentsApi.markChallanDeposited(id, { challanNumber, depositedAt }),
    onSuccess:  () => {
      setDepositOpen(null); setChallanNumber('')
      qc.invalidateQueries({ queryKey: ['payments', 'tds-challans'] })
    },
  })

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="TDS Challans"
        description="Monthly aggregates due to the government by the 7th of the following month"
        backLabel="Payments"
        backTo="/payments"
        onRefresh={() => qc.invalidateQueries({ queryKey: ['payments', 'tds-challans'] })}
      />

      <PaymentNav />

      {/* Filters */}
      <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-2 sm:px-6 text-xs">
        <label>Period</label>
        <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="YYYY-MM"
          className="rounded-md border border-input px-2 py-1 w-28 font-mono" />
        <label>Status</label>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-md border border-input px-2 py-1">
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="DEPOSITED">Deposited</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No TDS challans for the selected filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['Period', 'Section', 'Amount', 'Due date', 'Days', 'Status', 'Challan no', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c: TdsChallan) => (
                <tr key={c.id} className={cn('border-b border-border hover:bg-muted/20',
                  c.effectiveStatus === 'OVERDUE' && 'bg-red-50/40',
                )}>
                  <td className="px-3 py-3 font-mono text-xs">{c.period}</td>
                  <td className="px-3 py-3 font-mono text-xs">{c.tdsSection}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-semibold">{formatINR(c.amount)}</td>
                  <td className="px-3 py-3 text-xs">{formatDate(c.dueDate)}</td>
                  <td className="px-3 py-3 text-xs">
                    {c.daysToDue >= 0
                      ? <span className={cn(c.daysToDue <= 3 ? 'text-amber-700 font-medium' : 'text-muted-foreground')}>{c.daysToDue}d</span>
                      : <span className="text-red-700 font-semibold">{-c.daysToDue}d overdue</span>}
                  </td>
                  <td className="px-3 py-3"><ChallanStatusChip status={c.effectiveStatus} /></td>
                  <td className="px-3 py-3 font-mono text-xs">{c.challanNumber ?? '—'}</td>
                  <td className="px-3 py-3">
                    {c.status === 'PENDING' && (
                      <button onClick={() => setDepositOpen(c)}
                        className="rounded-md border border-green-200 text-green-700 px-2 py-1 text-[10px] font-medium hover:bg-green-50">
                        Mark deposited
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Deposit modal */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDepositOpen(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold mb-3">Mark challan deposited</h2>
            <p className="text-xs text-muted-foreground mb-3">
              {depositOpen.period} · {depositOpen.tdsSection} · {formatINR(depositOpen.amount)}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Challan number</label>
                <input value={challanNumber} onChange={e => setChallanNumber(e.target.value)} placeholder="e.g. 12345-202605"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Deposited on</label>
                <input type="date" value={depositedAt} onChange={e => setDepositedAt(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm mt-1" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setDepositOpen(null)}
                className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => markDeposited.mutate(depositOpen.id)} disabled={!challanNumber.trim() || markDeposited.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60">
                <CheckCircle2 className="h-3.5 w-3.5" /> Mark deposited
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChallanStatusChip({ status }: { status: 'PENDING' | 'DEPOSITED' | 'OVERDUE' }) {
  const cls = status === 'DEPOSITED' ? 'bg-green-50 border-green-200 text-green-700'
            : status === 'OVERDUE'   ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
  return (
    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', cls)}>
      {status.toLowerCase()}
    </span>
  )
}
