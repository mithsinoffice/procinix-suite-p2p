import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { PaymentNav } from './PaymentNav'
import { paymentsApi, type BatchStatus, type PaymentBatchRow } from '../../lib/api/payments.api'
import { formatINR, formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn, toArray } from '../../lib/utils'

type StatusTab = 'ALL' | BatchStatus

const STATUS_TABS: StatusTab[] = ['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'EXECUTED', 'FAILED']

export default function PaymentBatchListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [status, setStatus] = useState<StatusTab>('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['payments', 'batches', status],
    queryFn:  () => paymentsApi.listBatches({ status, take: 100 }),
  })
  const rows = toArray<PaymentBatchRow>(data?.data)

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Payment Batches"
        description="All payment batches across the tenant"
        backLabel="Queue"
        backTo="/payments"
        onRefresh={() => qc.invalidateQueries({ queryKey: ['payments', 'batches'] })}
        actions={
          <button onClick={() => navigate('/payments')}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            + Create from queue
          </button>
        }
      />

      <PaymentNav />

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-background overflow-x-auto px-4">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn(
              'px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              status === s ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}>
            {s === 'ALL' ? 'All' : formatStatus(s)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No payment batches in this status.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['Batch ref', 'Created', 'Lines', 'Total', 'TDS', 'MSME', 'Urgent', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b: PaymentBatchRow) => (
                <tr key={b.id} className="border-b border-border hover:bg-muted/20 cursor-pointer"
                  onClick={() => navigate(`/payments/batches/${b.id}`)}>
                  <td className="px-3 py-3 font-mono text-xs font-semibold text-primary">{b.batchRef}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{formatDate(b.createdAt)}</td>
                  <td className="px-3 py-3 text-xs">{b.lineCount}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-semibold">{formatINR(b.totalNetPayable)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatINR(b.totalTds)}</td>
                  <td className="px-3 py-3">
                    {b.containsMsme && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        MSME · {b.msmeVendorCount}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {b.isUrgent && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        <AlertTriangle className="h-3 w-3" /> URGENT
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(b.status))}>
                      {formatStatus(b.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
