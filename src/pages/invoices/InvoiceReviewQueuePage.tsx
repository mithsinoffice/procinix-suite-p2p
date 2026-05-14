import { useNavigate } from 'react-router-dom'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { useInvoices } from '../../lib/api/invoices.api'
import { formatINR, formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { MatchScoreBadge } from '../../components/shared/MatchScoreBadge'
import { ChannelBadge } from '../../components/shared/ChannelBadge'
import { cn } from '../../lib/utils'

export default function InvoiceReviewQueuePage() {
  const navigate = useNavigate()
  const { data, isLoading } = useInvoices({ status: 'SUBMITTED' })
  const invoices = data?.pages.flatMap(p => p.data) ?? []

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="AP Review Queue"
        description={`${invoices.length} invoices need review`}
      />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">Queue is clear — no invoices need review</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {invoices.map((inv: any) => (
              <div
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="cursor-pointer px-4 py-4 hover:bg-muted/30 sm:px-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium font-mono">{inv.invoiceNumber}</p>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(inv.status))}>
                        {formatStatus(inv.status)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{inv.vendor?.legalName} · {formatDate(inv.invoiceDate)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {inv.channelType && (
                        <ChannelBadge
                          channelType={inv.channelType}
                          ocrConfidence={inv.ocrConfidence}
                          isEInvoice={inv.isEInvoice}
                        />
                      )}
                      {inv.matchScore !== null && inv.matchScore !== undefined && (
                        <MatchScoreBadge
                          score={inv.matchScore}
                          lane={inv.matchLane ?? 'MANUAL'}
                          compact
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatINR(inv.netPayable)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{inv.currency}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
