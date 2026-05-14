import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Send, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useInvoice, useSubmitInvoice, useApproveInvoice, useRejectInvoice } from '../../lib/api/invoices.api'
import { formatINR, formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { PageSkeleton } from '../../components/shared/PageSkeleton'
import { cn } from '../../lib/utils'
import { MatchScoreBadge } from '../../components/shared/MatchScoreBadge'
import { ChannelBadge } from '../../components/shared/ChannelBadge'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../lib/http'

export default function InvoiceDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { data: inv, isLoading } = useInvoice(id ?? '')
  const submit       = useSubmitInvoice(id ?? '')
  const approve      = useApproveInvoice(id ?? '')
  const reject       = useRejectInvoice(id ?? '')
  const [rejectNote, setRejectNote] = useState('')
  const [showReject, setShowReject] = useState(false)

  const { data: scoreData } = useQuery({
    queryKey: ['invoices', id, 'score'],
    queryFn:  () => http.get<{ guardrailsTriggered: string[] }>(`/api/invoices/${id}/score`),
    enabled:  !!id && !!inv,
  })

  if (isLoading) return <PageSkeleton />
  if (!inv) return <div className="p-6 text-sm text-muted-foreground">Invoice not found</div>

  const canSubmit  = inv.status === 'DRAFT'
  const canApprove = inv.status === 'PENDING_L1' || inv.status === 'PENDING_L2'

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold font-mono">{inv.invoiceNumber}</h1>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(inv.status))}>
              {formatStatus(inv.status)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{inv.vendor.legalName} · {formatDate(inv.invoiceDate)}</p>
        </div>

        <div className="flex items-center gap-2">
          {canSubmit && (
            <button onClick={() => submit.mutate()} disabled={submit.isPending}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit
            </button>
          )}
          {canApprove && (
            <>
              <button onClick={() => approve.mutate(undefined)} disabled={approve.isPending}
                className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60">
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </button>
              <button onClick={() => setShowReject(v => !v)}
                className="flex items-center gap-1.5 rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reject form */}
      {showReject && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 space-y-2">
          <p className="text-sm font-medium text-destructive">Rejection reason</p>
          <textarea
            value={rejectNote} onChange={e => setRejectNote(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={2} placeholder="Required — explain why this invoice is being rejected…"
          />
          <button
            onClick={() => { if (rejectNote.trim()) { reject.mutate(rejectNote); setShowReject(false) } }}
            disabled={!rejectNote.trim() || reject.isPending}
            className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Confirm rejection
          </button>
        </div>
      )}

      {/* Channel + OCR + Match score */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <ChannelBadge
          channelType={(inv as any).channelType ?? 'MANUAL_UPLOAD'}
          ocrConfidence={(inv as any).ocrConfidence}
          isEInvoice={(inv as any).isEInvoice}
        />
        {(inv as any).matchScore !== null && (inv as any).matchScore !== undefined && (
          <MatchScoreBadge
            score={(inv as any).matchScore}
            lane={(inv as any).matchLane ?? 'MANUAL'}
            guardrails={scoreData?.guardrailsTriggered}
            compact
          />
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Subtotal',    value: formatINR(inv.subtotal)   },
          { label: 'GST',         value: formatINR(inv.taxAmount)  },
          { label: 'TDS',         value: formatINR(inv.tdsAmount)  },
          { label: 'Net payable', value: formatINR(inv.netPayable) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold tabular-nums mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Lines */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-4 py-2.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line items</p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              {['#', 'Description', 'Qty', 'Unit price', 'Amount'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inv.lines.map(line => (
              <tr key={line.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{line.lineNumber}</td>
                <td className="px-4 py-2.5">{line.description}</td>
                <td className="px-4 py-2.5 tabular-nums">{line.quantity}</td>
                <td className="px-4 py-2.5 tabular-nums">{formatINR(line.unitPrice)}</td>
                <td className="px-4 py-2.5 tabular-nums font-medium">{formatINR(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approval timeline */}
      {inv.approvals.length > 0 && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approval timeline</p>
          {inv.approvals.map(step => (
            <div key={step.id} className="flex items-start gap-3">
              <div className={cn('mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0',
                step.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                step.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
              )}>
                <span className="text-[10px] font-bold">L{step.level}</span>
              </div>
              <div>
                <p className="text-sm font-medium">{formatStatus(step.status)}</p>
                {step.comments && <p className="text-xs text-muted-foreground mt-0.5">{step.comments}</p>}
                {step.actionAt && <p className="text-xs text-muted-foreground">{formatDate(step.actionAt)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back link */}
      <button onClick={() => navigate('/invoices')} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to invoices
      </button>
    </div>
  )
}
