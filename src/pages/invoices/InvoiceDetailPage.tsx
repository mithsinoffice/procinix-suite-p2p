import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Send, Loader2, Edit, PauseCircle, PlayCircle } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { formatDate, formatDateTime, formatCurrency, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { MatchScoreBadge } from '../../components/shared/MatchScoreBadge'
import { ChannelBadge } from '../../components/shared/ChannelBadge'
import { KycBadge } from '../../components/shared/KycBadge'
import { cn } from '../../lib/utils'

export default function InvoiceDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [rejectNote, setRejectNote]   = useState('')
  const [holdReason, setHoldReason]   = useState('')
  const [showReject, setShowReject]   = useState(false)
  const [showHold, setShowHold]       = useState(false)

  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoices', id],
    queryFn:  () => http.get<any>(`/api/invoices/${id}`),
    enabled:  !!id,
    staleTime: 30_000,
  })

  const { data: scoreData } = useQuery({
    queryKey: ['invoices', id, 'score'],
    queryFn:  () => http.get<any>(`/api/invoices/${id}/score`),
    enabled:  !!id && !!inv,
  })

  const mutOpts = (_action: string) => ({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  const submit      = useMutation({ mutationFn: () => http.post(`/api/invoices/${id}/submit`, {}), ...mutOpts('submit') })
  const approve     = useMutation({ mutationFn: (c?: string) => http.post(`/api/invoices/${id}/approve`, { comments: c }), ...mutOpts('approve') })
  const reject      = useMutation({ mutationFn: (r: string) => http.post(`/api/invoices/${id}/reject`, { comments: r }), ...mutOpts('reject') })
  const hold        = useMutation({ mutationFn: (r: string) => http.post(`/api/invoices/${id}/hold`, { reason: r }), ...mutOpts('hold') })
  const releaseHold = useMutation({ mutationFn: () => http.post(`/api/invoices/${id}/release-hold`, {}), ...mutOpts('release') })

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
      </div>
    )
  }
  if (!inv) return <div className="p-6 text-sm text-muted-foreground">Invoice not found</div>

  const status      = inv.status as string
  const currency    = inv.currencyCode ?? 'INR'
  const isWfManaged = !!inv.workflowInstanceId
  const canSubmit   = status === 'DRAFT' || status === 'REJECTED'
  const canApprove  = !isWfManaged && (status === 'SUBMITTED' || status === 'PENDING_L1' || status === 'PENDING_L2')
  const canHold     = !isWfManaged && (status === 'SUBMITTED' || status === 'PENDING_L1' || status === 'PENDING_L2')
  const canRelease  = !isWfManaged && status === 'ON_HOLD'
  const canEdit     = status === 'DRAFT' || status === 'REJECTED'

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={inv.invoiceNumber}
        description={`${inv.vendor?.legalName} · ${formatDate(inv.invoiceDate)}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <button onClick={() => navigate(`/invoices/${id}/edit`)}
                className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">
                <Edit className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            {canSubmit && (
              <button onClick={() => submit.mutate()} disabled={submit.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Submit
              </button>
            )}
            {canApprove && (
              <>
                <button onClick={() => approve.mutate(undefined)} disabled={approve.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60">
                  <CheckCircle className="h-3.5 w-3.5" /> Approve
                </button>
                <button onClick={() => setShowReject(v => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </>
            )}
            {canHold && (
              <button onClick={() => setShowHold(v => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50">
                <PauseCircle className="h-3.5 w-3.5" /> Hold
              </button>
            )}
            {canRelease && (
              <button onClick={() => releaseHold.mutate()} disabled={releaseHold.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-green-400 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-60">
                <PlayCircle className="h-3.5 w-3.5" /> Release hold
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-5">

          {/* Status + channel + match score */}
          <div className="flex flex-wrap items-start gap-3">
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', getStatusColor(status))}>
              {formatStatus(status)}
            </span>
            <ChannelBadge channelType={inv.channelType ?? 'MANUAL_UPLOAD'} ocrConfidence={inv.ocrConfidence} isEInvoice={!!inv.irnNumber} />
            {inv.apLane && (
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold border',
                inv.apLane === 'STP'    ? 'bg-green-50 text-green-700 border-green-200' :
                inv.apLane === 'REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                          'bg-red-50 text-red-700 border-red-200')}>
                {inv.apLane} lane
              </span>
            )}
            {inv.matchScore != null && (
              <MatchScoreBadge score={inv.matchScore} lane={inv.apLane ?? 'MANUAL'} guardrails={scoreData?.guardrailsTriggered} compact />
            )}
          </div>

          {/* Reject / Hold input panels */}
          {showReject && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm font-medium text-destructive">Rejection reason *</p>
              <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Required — explain why this invoice is being rejected…" />
              <button onClick={() => { if (rejectNote.trim()) { reject.mutate(rejectNote); setShowReject(false) } }}
                disabled={!rejectNote.trim() || reject.isPending}
                className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                Confirm rejection
              </button>
            </div>
          )}
          {showHold && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="text-sm font-medium text-amber-700">Hold reason</p>
              <textarea value={holdReason} onChange={e => setHoldReason(e.target.value)} rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Optional — reason for placing on hold…" />
              <button onClick={() => { hold.mutate(holdReason); setShowHold(false) }} disabled={hold.isPending}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                Confirm hold
              </button>
            </div>
          )}

          {/* Invoice header info */}
          <div className="rounded-xl border border-border bg-card p-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { label: 'Vendor',        value: inv.vendor?.legalName },
              { label: 'Vendor code',   value: inv.vendor?.vendorCode },
              { label: 'Invoice date',  value: formatDate(inv.invoiceDate) },
              { label: 'Due date',      value: inv.dueDate ? formatDate(inv.dueDate) : '—' },
              { label: 'Currency',      value: inv.currencyCode ?? 'INR' },
              { label: 'PO reference',  value: inv.poRef ?? '—' },
              { label: 'IRN',           value: inv.irnNumber ?? '—' },
              { label: 'Created by',    value: inv.createdByUserId?.slice(0, 8) + '…' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* KYC chips */}
          {inv.vendor && (
            <div className="flex flex-wrap gap-2">
              <KycBadge label="PAN" status={inv.vendor.kycPanStatus} />
              <KycBadge label="GST" status={inv.vendor.kycGstStatus} />
              <KycBadge label="Bank" status={inv.vendor.kycBankStatus} />
            </div>
          )}

          {/* Financial summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Subtotal',    value: inv.subtotal },
              { label: 'GST',         value: (Number(inv.cgstAmount) + Number(inv.sgstAmount) + Number(inv.igstAmount)) },
              { label: 'TDS',         value: inv.tdsAmount },
              { label: 'Net payable', value: inv.netPayable },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold tabular-nums mt-0.5">{formatCurrency(value, currency)}</p>
              </div>
            ))}
          </div>

          {/* GST breakdown */}
          {(Number(inv.cgstAmount) > 0 || Number(inv.igstAmount) > 0) && (
            <div className="rounded-lg border border-border p-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">CGST</p>
                <p className="font-mono tabular-nums text-green-700">{formatCurrency(inv.cgstAmount, currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">SGST</p>
                <p className="font-mono tabular-nums text-green-700">{formatCurrency(inv.sgstAmount, currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IGST</p>
                <p className="font-mono tabular-nums text-blue-700">{formatCurrency(inv.igstAmount, currency)}</p>
              </div>
            </div>
          )}

          {/* Match score bar */}
          {scoreData && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Match score breakdown</p>
              {[
                { label: 'Vendor KYC',      score: scoreData.vendorScore },
                { label: 'PO reference',    score: scoreData.poScore },
                { label: 'Amount match',    score: scoreData.amountScore },
                { label: 'GRN match',       score: scoreData.grnScore },
                { label: 'GST compliance',  score: scoreData.gstScore },
                { label: 'OCR confidence',  score: scoreData.ocrScore },
              ].map(({ label, score }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-32 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all',
                      score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                      style={{ width: `${score}%` }} />
                  </div>
                  <span className="text-xs font-mono w-8 text-right">{score}</span>
                </div>
              ))}
            </div>
          )}

          {/* Line items */}
          {inv.lines?.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="border-b border-border bg-muted/40 px-4 py-2.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line items</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border">
                    <tr>
                      {['#','Description','Qty','UOM','Unit Price','Taxable','CGST','SGST','IGST','TDS','RCM','Total'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inv.lines.map((line: any) => (
                      <tr key={line.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">{line.lineNumber}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate">{line.description}</td>
                        <td className="px-3 py-2 tabular-nums">{line.quantity}</td>
                        <td className="px-3 py-2">{line.uom ?? '—'}</td>
                        <td className="px-3 py-2 tabular-nums font-mono">{formatCurrency(line.unitPrice, currency)}</td>
                        <td className="px-3 py-2 tabular-nums font-mono">{formatCurrency(line.taxableAmount, currency)}</td>
                        <td className="px-3 py-2 tabular-nums font-mono text-green-700">{formatCurrency(line.cgstAmount, currency)}</td>
                        <td className="px-3 py-2 tabular-nums font-mono text-green-700">{formatCurrency(line.sgstAmount, currency)}</td>
                        <td className="px-3 py-2 tabular-nums font-mono text-blue-700">{formatCurrency(line.igstAmount, currency)}</td>
                        <td className="px-3 py-2 tabular-nums font-mono text-amber-600">{formatCurrency(line.tdsAmount, currency)}</td>
                        <td className="px-3 py-2 text-center">{line.rcmApplicable ? '✓' : '—'}</td>
                        <td className="px-3 py-2 tabular-nums font-mono font-semibold">{formatCurrency(line.lineTotal, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit trail */}
          {inv.auditLogs?.length > 0 && (
            <div className="rounded-xl border border-border p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Audit trail</p>
              <div className="space-y-3">
                {inv.auditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-primary">
                        {log.action.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{formatStatus(log.action)}</span>
                        {log.userName && <span className="text-xs text-muted-foreground">by {log.userName}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {Object.entries(log.details as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy approval steps */}
          {inv.approvals?.length > 0 && (
            <div className="rounded-xl border border-border p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approval steps</p>
              {inv.approvals.map((step: any) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className={cn('mt-0.5 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold',
                    step.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    step.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                    L{step.level}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{formatStatus(step.status)}</p>
                    {step.comments && <p className="text-xs text-muted-foreground">{step.comments}</p>}
                    {step.actionAt && <p className="text-xs text-muted-foreground">{formatDate(step.actionAt)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Workflow panel */}
          {inv.workflowInstanceId && (
            <WorkflowPanel
              invoiceId={inv.id}
              workflowInstanceId={inv.workflowInstanceId}
              onAction={() => qc.invalidateQueries({ queryKey: ['invoices', id] })}
            />
          )}

        </div>
      </div>
    </div>
  )
}

// ── Workflow panel ───────────────────────────────────────────────────────────

function WorkflowPanel({ invoiceId: _invoiceId, workflowInstanceId, onAction }: {
  invoiceId: string
  workflowInstanceId: string
  onAction: () => void
}) {
  const qcPanel = useQueryClient()
  const { data: instance } = useQuery({
    queryKey: ['workflow-instance', workflowInstanceId],
    queryFn:  () => http.get<any>(`/api/workflow/instances/${workflowInstanceId}`),
    staleTime: 15_000,
  })

  const [mode, setMode]         = useState<'approve' | 'reject' | 'hold' | 'info' | null>(null)
  const [comments, setComments] = useState('')
  const [rejectMode, setRejectMode] = useState<'RETURN_TO_DRAFT' | 'RETURN_TO_PREV_STAGE'>('RETURN_TO_DRAFT')

  const invalidate = () => {
    qcPanel.invalidateQueries({ queryKey: ['workflow-instance', workflowInstanceId] })
    onAction()
    setMode(null)
    setComments('')
  }

  const approve    = useMutation({ mutationFn: () => http.post(`/api/workflow/instances/${workflowInstanceId}/approve`, { comments }), onSuccess: invalidate })
  const reject     = useMutation({ mutationFn: () => http.post(`/api/workflow/instances/${workflowInstanceId}/reject`, { mode: rejectMode, comments }), onSuccess: invalidate })
  const hold       = useMutation({ mutationFn: () => http.post(`/api/workflow/instances/${workflowInstanceId}/hold`, { reason: comments }), onSuccess: invalidate })
  const requestInfo = useMutation({ mutationFn: () => http.post(`/api/workflow/instances/${workflowInstanceId}/reject`, { mode: 'REQUEST_INFO', comments }), onSuccess: invalidate })

  if (!instance) return null

  const currentStage = instance.stages?.find((s: any) => s.status === 'PENDING' || s.status === 'INFO_REQUESTED')

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <div>
          <p className="text-sm font-semibold">Approval Workflow</p>
          <p className="text-xs text-muted-foreground">{instance.definition?.name ?? 'Standard workflow'}</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold border',
          instance.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
          instance.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
          instance.status === 'ON_HOLD'  ? 'bg-amber-50 text-amber-700 border-amber-200' :
          'bg-blue-50 text-blue-700 border-blue-200')}>
          {instance.status}
        </span>
      </div>

      {/* Stage timeline */}
      <div className="px-4 py-3 space-y-2">
        {instance.stages?.map((stage: any, i: number) => (
          <div key={stage.id} className="flex items-center gap-3">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
              stage.status === 'APPROVED'       ? 'bg-green-100 text-green-700' :
              stage.status === 'REJECTED'       ? 'bg-red-100 text-red-700' :
              stage.status === 'PENDING'        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400' :
              stage.status === 'INFO_REQUESTED' ? 'bg-amber-100 text-amber-700' :
              stage.status === 'AUTO_APPROVED'  ? 'bg-green-50 text-green-500' :
              'bg-muted text-muted-foreground')}>
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">{stage.stageName}</p>
                <span className="text-xs text-muted-foreground">{stage.approverRole ?? ''}</span>
              </div>
              {stage.comments && <p className="text-xs text-muted-foreground mt-0.5 italic">"{stage.comments}"</p>}
              {stage.actionAt && <p className="text-xs text-muted-foreground">{formatDate(stage.actionAt)}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Action area — only when a stage is pending */}
      {currentStage && instance.status === 'IN_PROGRESS' && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Pending: <span className="font-semibold text-foreground">{currentStage.stageName}</span>
          </p>

          {!mode && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setMode('approve')}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                ✓ Approve
              </button>
              <button onClick={() => setMode('reject')}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                ✗ Reject
              </button>
              <button onClick={() => setMode('info')}
                className="flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
                ? Request info
              </button>
              <button onClick={() => setMode('hold')}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
                ⏸ Hold
              </button>
            </div>
          )}

          {mode && (
            <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
              <p className="text-xs font-semibold capitalize">{mode === 'info' ? 'Request information' : mode}</p>
              {mode === 'reject' && (
                <div className="flex gap-2">
                  {(['RETURN_TO_DRAFT', 'RETURN_TO_PREV_STAGE'] as const).map(m => (
                    <button key={m} onClick={() => setRejectMode(m)}
                      className={cn('px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                        rejectMode === m ? 'bg-red-600 text-white border-red-600' : 'border-border text-muted-foreground hover:bg-muted')}>
                      {m === 'RETURN_TO_DRAFT' ? 'Return to draft' : 'Previous stage'}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder={
                  mode === 'approve' ? 'Add approval comments (optional)…' :
                  mode === 'reject'  ? 'Rejection reason (required)…' :
                  mode === 'info'    ? 'What information do you need?…' :
                  'Reason for hold…'
                }
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => { setMode(null); setComments('') }}
                  className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-muted">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (mode === 'approve') approve.mutate()
                    if (mode === 'reject')  reject.mutate()
                    if (mode === 'hold')    hold.mutate()
                    if (mode === 'info')    requestInfo.mutate()
                  }}
                  disabled={(['reject', 'hold', 'info'] as const).includes(mode as any) && !comments.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat thread */}
      {instance.chats?.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Discussion thread</p>
          <div className="space-y-2">
            {instance.chats.map((chat: any) => (
              <div key={chat.id} className={cn('rounded-lg p-2.5 text-xs',
                chat.messageType === 'INFO_REQUEST' ? 'bg-amber-50 border border-amber-200' :
                chat.messageType === 'INFO_REPLY'   ? 'bg-blue-50 border border-blue-200' :
                'bg-muted/40')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{chat.senderName}</span>
                  <span className="text-muted-foreground">{formatDate(chat.createdAt)}</span>
                </div>
                <p>{chat.message}</p>
              </div>
            ))}
          </div>
          {instance.chats?.some((c: any) => c.messageType === 'INFO_REQUEST') && (
            <ReplyBox instanceId={workflowInstanceId} onReplied={invalidate} />
          )}
        </div>
      )}
    </div>
  )
}

function ReplyBox({ instanceId, onReplied }: { instanceId: string; onReplied: () => void }) {
  const [reply, setReply] = useState('')
  const send = useMutation({
    mutationFn: () => http.post(`/api/workflow/instances/${instanceId}/chat`, { message: reply, messageType: 'INFO_REPLY', attachments: [] }),
    onSuccess:  () => { setReply(''); onReplied() },
  })
  return (
    <div className="mt-2 flex gap-2">
      <textarea value={reply} onChange={e => setReply(e.target.value)}
        placeholder="Reply with additional information…" rows={2}
        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
      <button onClick={() => send.mutate()} disabled={!reply.trim() || send.isPending}
        className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
        Send
      </button>
    </div>
  )
}
