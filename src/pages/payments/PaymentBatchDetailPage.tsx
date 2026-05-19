import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Clock, Send, Loader2 } from 'lucide-react'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { paymentsApi, type ExecuteBatchLine, type PaymentBatchLine } from '../../lib/api/payments.api'
import { formatINR, formatDate, formatDateTime, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

export default function PaymentBatchDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [urgentOpen, setUrgentOpen] = useState(false)
  const [urgentReason, setUrgentReason] = useState('')
  const [execOpen, setExecOpen] = useState(false)
  const [execLines, setExecLines] = useState<Record<string, ExecuteBatchLine>>({})

  const { data: batch, isLoading } = useQuery({
    queryKey: ['payments', 'batch', id],
    queryFn:  () => paymentsApi.getBatch(id),
    enabled:  !!id,
  })

  const submit = useMutation({
    mutationFn: () => paymentsApi.submitBatch(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['payments'] }),
  })
  const flagUrgent = useMutation({
    mutationFn: () => paymentsApi.flagUrgent(id, urgentReason),
    onSuccess:  () => { setUrgentOpen(false); setUrgentReason(''); qc.invalidateQueries({ queryKey: ['payments'] }) },
  })
  const execute = useMutation({
    mutationFn: () => paymentsApi.executeBatch(id, {
      lines: Object.values(execLines).filter(l => !!l.lineId),
    }),
    onSuccess: () => { setExecOpen(false); setExecLines({}); qc.invalidateQueries({ queryKey: ['payments'] }) },
  })

  if (isLoading || !batch) {
    return (
      <div className="flex flex-col h-full">
        <MasterPageHeader title="Loading…" backLabel="Batches" backTo="/payments/batches" />
        <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded bg-muted animate-pulse" />)}</div>
      </div>
    )
  }

  const canSubmit  = batch.status === 'DRAFT'
  const canExecute = batch.status === 'APPROVED'
  const canFlag    = batch.status === 'DRAFT' || batch.status === 'PENDING_APPROVAL'

  // Group lines by TDS section for Section D
  const tdsBySection = batch.lines.reduce<Record<string, { amount: number; count: number }>>((acc, l) => {
    if (!l.tdsSection || l.tdsAmount <= 0) return acc
    const k = l.tdsSection
    acc[k] = { amount: (acc[k]?.amount ?? 0) + l.tdsAmount, count: (acc[k]?.count ?? 0) + 1 }
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={batch.batchRef}
        description={`${batch.lineCount} lines · created ${formatDateTime(batch.createdAt)}${batch.isUrgent ? ' · URGENT' : ''}`}
        backLabel="Batches"
        backTo="/payments/batches"
        actions={
          <div className="flex items-center gap-2">
            {canFlag && !batch.isUrgent && (
              <button onClick={() => setUrgentOpen(v => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-amber-200 text-amber-700 px-3 py-1.5 text-xs font-medium hover:bg-amber-50">
                <AlertTriangle className="h-3.5 w-3.5" /> Flag urgent
              </button>
            )}
            {canSubmit && (
              <button onClick={() => submit.mutate()} disabled={submit.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Submit for approval
              </button>
            )}
            {canExecute && (
              <button onClick={() => setExecOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Execute payment
              </button>
            )}
          </div>
        }
      />

      {batch.isUrgent && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 sm:px-6 text-xs text-amber-800">
          <strong>URGENT batch:</strong> {batch.urgentReason ?? '(no reason recorded)'}
        </div>
      )}

      {urgentOpen && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6 flex items-center gap-2">
          <input value={urgentReason} onChange={e => setUrgentReason(e.target.value)}
            placeholder="Reason for urgency"
            className="flex-1 rounded-md border border-amber-200 bg-white px-3 py-1.5 text-sm" />
          <button onClick={() => flagUrgent.mutate()} disabled={!urgentReason.trim() || flagUrgent.isPending}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60">
            Flag urgent
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        {/* Section A — Summary */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Batch summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Status" value={
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(batch.status))}>
                {formatStatus(batch.status)}
              </span>
            } />
            <Stat label="Total payment" value={formatINR(batch.totalNetPayable)} bold />
            <Stat label="TDS withheld"  value={formatINR(batch.totalTds)} />
            <Stat label="MSME vendors"  value={batch.containsMsme ? `${batch.msmeVendorCount}` : '0'}
              tone={batch.containsMsme ? 'amber' : 'default'} />
          </div>
        </div>

        {/* Section B — Lines */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-2.5">
            <h3 className="text-sm font-semibold">Payment lines · {batch.lines.length}</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Ref</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">TDS</th>
                <th className="px-3 py-2">UTR / Cheque</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {batch.lines.map((l: PaymentBatchLine) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2 max-w-[180px] truncate">
                    <div className="flex items-center gap-1">
                      {l.isMsme && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">MSME</span>
                      )}
                      {l.vendor?.legalName ?? '—'}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{l.invoice?.invoiceNumber ?? l.invoiceId?.slice(0, 8) ?? l.advanceId?.slice(0, 8) ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">{l.paymentMethod}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(l.paymentAmount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatINR(l.tdsAmount)}</td>
                  <td className="px-3 py-2 text-xs font-mono">{l.utrNumber ?? l.chequeNumber ?? '—'}</td>
                  <td className="px-3 py-2"><LineStatusChip status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section C — MSME tracking */}
        {batch.containsMsme && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> MSME tracking
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground">
                  <th className="py-1.5">Vendor</th>
                  <th className="py-1.5">Category</th>
                  <th className="py-1.5">Due</th>
                  <th className="py-1.5">Days remaining</th>
                  <th className="py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {batch.lines.filter(l => l.isMsme).map(l => (
                  <tr key={l.id} className="border-t border-amber-200/60">
                    <td className="py-1.5">{l.vendor?.legalName ?? '—'}</td>
                    <td className="py-1.5 text-xs">{l.vendor?.msmeCategory ?? '—'}</td>
                    <td className="py-1.5 text-xs">{l.msmePaymentDue ? formatDate(l.msmePaymentDue) : '—'}</td>
                    <td className="py-1.5 text-xs">
                      {l.msmeDaysRemaining != null
                        ? <span className={cn(l.msmeDaysRemaining < 0 ? 'text-red-700' : l.msmeDaysRemaining < 7 ? 'text-red-700' : 'text-amber-700')}>{l.msmeDaysRemaining}d</span>
                        : '—'}
                    </td>
                    <td className="py-1.5">
                      {l.status === 'PAID'
                        ? <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">PAID ON TIME</span>
                        : l.msmeDaysRemaining != null && l.msmeDaysRemaining < 0
                          ? <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">BREACHED</span>
                          : <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">AT RISK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section D — TDS summary */}
        {Object.keys(tdsBySection).length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">TDS summary</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground">
                  <th className="py-1.5">Section</th>
                  <th className="py-1.5">Lines</th>
                  <th className="py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(tdsBySection).map(([section, agg]) => (
                  <tr key={section} className="border-t border-border">
                    <td className="py-1.5 font-mono text-xs">{section}</td>
                    <td className="py-1.5 text-xs">{agg.count}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatINR(agg.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-muted-foreground mt-2">Challans auto-generated on execution — see Payments → TDS challans.</p>
          </div>
        )}

        {/* Section E — Workflow (link to existing panel) */}
        {batch.workflowInstanceId && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">Workflow</h3>
            <a href={`/workflow#${batch.workflowInstanceId}`}
              onClick={e => { e.preventDefault(); navigate(`/workflow`) }}
              className="text-xs text-primary hover:underline">View workflow instance →</a>
          </div>
        )}
      </div>

      {/* Execute modal */}
      {execOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setExecOpen(false)}>
          <div className="w-full max-w-3xl rounded-xl bg-card p-5 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold mb-3">Execute payment batch</h2>
            <p className="text-xs text-muted-foreground mb-4">Capture UTR (NEFT/RTGS/IMPS) or cheque number per line. Lines left blank stay PENDING.</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground">
                  <th className="py-1.5">Vendor</th>
                  <th className="py-1.5">Method</th>
                  <th className="py-1.5">UTR / Cheque</th>
                  <th className="py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {batch.lines.filter(l => l.status === 'PENDING').map(l => {
                  const key = l.id
                  const v = execLines[key] ?? { lineId: l.id }
                  return (
                    <tr key={l.id} className="border-t border-border">
                      <td className="py-1.5 max-w-[160px] truncate">{l.vendor?.legalName ?? '—'}</td>
                      <td className="py-1.5 text-xs">{l.paymentMethod}</td>
                      <td className="py-1.5">
                        <input value={l.paymentMethod === 'CHEQUE' ? (v.chequeNumber ?? '') : (v.utrNumber ?? '')}
                          onChange={e => setExecLines(prev => ({
                            ...prev,
                            [key]: { lineId: l.id, ...(l.paymentMethod === 'CHEQUE' ? { chequeNumber: e.target.value } : { utrNumber: e.target.value }) },
                          }))}
                          placeholder={l.paymentMethod === 'CHEQUE' ? 'Cheque #' : 'UTR'}
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-mono" />
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{formatINR(l.paymentAmount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setExecOpen(false)}
                className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => execute.mutate()} disabled={execute.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60">
                {execute.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Execute &amp; post JVs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, bold, tone }: { label: string; value: React.ReactNode; bold?: boolean; tone?: 'amber' | 'red' | 'default' }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className={cn('mt-0.5',
        bold && 'text-lg font-semibold tabular-nums',
        tone === 'amber' && 'text-amber-700',
        tone === 'red'   && 'text-red-700',
      )}>{value}</div>
    </div>
  )
}

function LineStatusChip({ status }: { status: 'PENDING' | 'PAID' | 'FAILED' }) {
  const cls = status === 'PAID'    ? 'bg-green-50 border-green-200 text-green-700'
            : status === 'FAILED'  ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', cls)}>
      {status === 'PENDING' && <Clock className="h-3 w-3" />}
      {status === 'PAID'    && <CheckCircle2 className="h-3 w-3" />}
      {status === 'FAILED'  && <AlertTriangle className="h-3 w-3" />}
      {status.toLowerCase()}
    </span>
  )
}
