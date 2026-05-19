import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle, XCircle, Send, Loader2, Edit, PauseCircle, PlayCircle,
  ChevronLeft, ChevronRight, FileText,
} from 'lucide-react'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { formatDate, formatDateTime, formatCurrency, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { MatchScoreBadge } from '../../components/shared/MatchScoreBadge'
import { ChannelBadge } from '../../components/shared/ChannelBadge'
import { KycBadge } from '../../components/shared/KycBadge'
import { cn } from '../../lib/utils'

// ── OCR confidence chip ─────────────────────────────────────────────────────
// Gemini only returns a single `overall` confidence today. Every OCR'd field
// renders with the same score; if/when we extend the prompt to emit per-field
// confidence, the `score` prop will start carrying real per-field numbers.
function OcrChip({ score }: { score: number | null | undefined }) {
  if (score == null) return null
  const color = score >= 90 ? 'bg-green-50 text-green-700 border-green-200'
              : score >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200'
              :               'bg-red-50 text-red-700 border-red-200'
  const icon  = score >= 90 ? '✓' : score >= 70 ? '~' : '✗'
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ml-1.5', color)}>
      OCR {icon} {score}%
    </span>
  )
}

// ── Fuzzy match hint ────────────────────────────────────────────────────────
// Shown when the stored value diverges from the raw OCR value — gives the
// reviewer a quick "what did OCR see vs what was kept" diff.
function FuzzyMatchHint({ ocrValue, storedValue, confidence }: {
  ocrValue:    string | number | null | undefined
  storedValue: string | number | null | undefined
  confidence:  number | null | undefined
}) {
  const ocr    = ocrValue == null    ? '' : String(ocrValue)
  const stored = storedValue == null ? '' : String(storedValue)
  if (!confidence || confidence >= 99) return null
  if (!ocr || ocr === stored) return null
  return (
    <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50/50 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">Near matches</p>
      <div className="mt-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono">{stored}</span>
          <span className="text-xs text-green-600 font-medium">Used · {confidence}%</span>
        </div>
        <div className="flex items-center justify-between opacity-60">
          <span className="text-xs font-mono">{ocr}</span>
          <span className="text-xs text-muted-foreground">{Math.max(confidence - 12, 0)}%</span>
        </div>
      </div>
    </div>
  )
}

// ── Field with optional OCR chip + fuzzy hint ───────────────────────────────
function Field({ label, value, ocrScore, ocrValue, confidence, mono }: {
  label:       string
  value:       React.ReactNode
  ocrScore?:   number | null
  ocrValue?:   string | number | null
  confidence?: number | null
  mono?:       boolean
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-xs font-medium text-muted-foreground flex items-center">
        <span>{label}</span>
        <OcrChip score={ocrScore ?? null} />
      </label>
      <div className={cn('text-sm font-medium', mono && 'font-mono tabular-nums')}>{value ?? '—'}</div>
      {ocrValue != null && confidence != null && (
        <FuzzyMatchHint ocrValue={ocrValue} storedValue={value as any} confidence={confidence} />
      )}
    </div>
  )
}

// ── Left panel: collapsible document preview + OCR summary ──────────────────
function LeftPanel({ open, onToggle, fileUrl, fileName, mimeType, ocrConfidence, ingestedAt }: {
  open:          boolean
  onToggle:      () => void
  fileUrl?:      string | null
  fileName?:     string | null
  mimeType?:     string | null
  ocrConfidence: number | null
  ingestedAt:    string | null
}) {
  const isPdf = mimeType === 'application/pdf'
  return (
    <div className={cn(
      'flex flex-col border-r border-border bg-background relative transition-all flex-shrink-0',
      open ? 'w-96' : 'w-10',
    )}>
      <button
        onClick={onToggle}
        className="absolute top-4 -right-3 z-10 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted shadow-sm"
        aria-label={open ? 'Collapse preview' : 'Expand preview'}
      >
        {open ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {open && (
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
          {fileName && (
            <div className="flex items-center gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium truncate" title={fileName}>{fileName}</span>
            </div>
          )}

          {ocrConfidence != null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">OCR confidence</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full', ocrConfidence >= 80 ? 'bg-green-500' : ocrConfidence >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                  style={{ width: `${ocrConfidence}%` }}
                />
              </div>
              <span className={cn('font-medium', ocrConfidence >= 80 ? 'text-green-600' : ocrConfidence >= 60 ? 'text-amber-600' : 'text-red-600')}>
                {ocrConfidence}%
              </span>
            </div>
          )}

          <div className="flex-1 rounded-lg border border-border bg-muted/20 overflow-hidden min-h-0">
            {!fileUrl ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                <FileText className="h-6 w-6 opacity-40" />
                <span>Document not available</span>
                <span className="text-[10px] opacity-60">{fileName ?? 'No file on record'}</span>
              </div>
            ) : isPdf ? (
              <iframe src={fileUrl} className="w-full h-full border-0" title="Invoice preview" />
            ) : (
              <div className="h-full overflow-auto p-2">
                <img src={fileUrl} className="w-full object-contain" alt="Invoice preview" />
              </div>
            )}
          </div>

          {ingestedAt && (
            <p className="text-[10px] text-muted-foreground leading-tight">
              OCR extracted on {formatDateTime(ingestedAt)} · Model: gemini-2.5-flash
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Score card ──────────────────────────────────────────────────────────────
function ScoreCard({ label, score, max }: { label: string; score: number; max: number }) {
  const pct  = max > 0 ? (score / max) * 100 : 0
  const tone =
    pct >= 80 ? { box: 'border-green-200 bg-green-50',  bar: 'bg-green-500'  }
  : pct >= 50 ? { box: 'border-amber-200 bg-amber-50',  bar: 'bg-amber-500'  }
  :             { box: 'border-red-200 bg-red-50/50',   bar: 'bg-red-500'    }
  return (
    <div className={cn('rounded-xl border p-3 text-center', tone.box)}>
      <p className="text-lg font-bold tabular-nums">{score}<span className="text-xs text-muted-foreground font-normal">/{max}</span></p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', tone.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [leftOpen, setLeftOpen]       = useState(true)
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

  // OCR raw data — only EmailPollerOcrResult shape exists today (confidence.overall is a single number)
  const ocr           = (inv.ocrRawData ?? null) as null | { confidence?: { overall?: number }; invoiceNumber?: string | null; invoiceDate?: string | null; vendorGSTIN?: string | null; vendorPAN?: string | null; vendorName?: string | null; totalAmount?: number | null }
  const ocrConfidence = ocr?.confidence?.overall ?? inv.ocrConfidence ?? null
  const isOcrInvoice  = inv.channelType === 'EMAIL_INGEST' || !!ocr
  const fieldScore    = isOcrInvoice ? ocrConfidence : null

  const ingestedAuditLog = inv.auditLogs?.find((l: any) => l.action === 'EMAIL_INGESTED')
  const ingestedAt       = ingestedAuditLog?.createdAt ?? null

  // Score breakdown — points-out-of-max per the engine constants
  const scoreItems = scoreData ? [
    { label: 'Vendor KYC',     score: scoreData.vendorScore, max: 25 },
    { label: 'PO reference',   score: scoreData.poScore,     max: 20 },
    { label: 'Amount match',   score: scoreData.amountScore, max: 15 },
    { label: 'GRN match',      score: scoreData.grnScore,    max: 20 },
    { label: 'GST compliance', score: scoreData.gstScore,    max: 10 },
    { label: 'OCR confidence', score: scoreData.ocrScore,    max: 10 },
  ] : []

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={inv.invoiceNumber}
        description={`${inv.vendor?.legalName ?? 'Unmatched vendor'} · ${formatDate(inv.invoiceDate)}`}
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

      <div className="flex flex-1 h-full overflow-hidden">
        <LeftPanel
          open={leftOpen}
          onToggle={() => setLeftOpen(v => !v)}
          fileUrl={inv.fileUrl}
          fileName={inv.fileName}
          mimeType={inv.mimeType}
          ocrConfidence={ocrConfidence}
          ingestedAt={ingestedAt}
        />

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-5">

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

            {/* Section A — Invoice header */}
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">A. Invoice header</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Entity"        value={inv.entityId ? `${String(inv.entityId).slice(0, 8)}…` : '—'} />
                <Field label="Created by"    value={inv.createdByUserId ? `${String(inv.createdByUserId).slice(0, 8)}…` : '—'} />
                <Field label="Department"    value={inv.departmentId ? `${String(inv.departmentId).slice(0, 8)}…` : '—'} />
                <div />
                <Field
                  label="Vendor"
                  value={inv.vendor?.legalName ?? <span className="text-amber-600">Unmatched</span>}
                />
                <Field
                  label="Vendor GSTIN"
                  value={inv.vendorGSTIN}
                  ocrScore={fieldScore}
                  ocrValue={ocr?.vendorGSTIN}
                  confidence={ocrConfidence}
                  mono
                />
                <Field
                  label="Vendor PAN"
                  value={inv.vendorPAN ?? inv.vendor?.pan}
                  ocrScore={fieldScore}
                  ocrValue={ocr?.vendorPAN}
                  confidence={ocrConfidence}
                  mono
                />
                <Field label="Bill-to location" value={inv.billToLocationId ? `${String(inv.billToLocationId).slice(0, 8)}…` : '—'} />
                <Field
                  label="Invoice number"
                  value={inv.invoiceNumber}
                  ocrScore={fieldScore}
                  ocrValue={ocr?.invoiceNumber}
                  confidence={ocrConfidence}
                  mono
                />
                <Field
                  label="Invoice date"
                  value={formatDate(inv.invoiceDate)}
                  ocrScore={fieldScore}
                  ocrValue={ocr?.invoiceDate}
                  confidence={ocrConfidence}
                />
                <Field label="Due date" value={inv.dueDate ? formatDate(inv.dueDate) : '—'} />
                <Field label="Channel"  value={inv.channelType ?? 'MANUAL_UPLOAD'} />
                <Field label="Currency" value={currency} />
                <Field label="PO reference" value={inv.poRef ?? '—'} mono />
                <div className="sm:col-span-2">
                  <Field
                    label="IRN (e-Invoice)"
                    value={
                      inv.irnNumber ? (
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs break-all">{inv.irnNumber}</span>
                          {inv.irnVerified && (
                            <span className="rounded-full bg-green-50 border border-green-200 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                              Verified ✓
                            </span>
                          )}
                        </span>
                      ) : '—'
                    }
                  />
                </div>
              </div>
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

            {/* Total amount with fuzzy hint */}
            {ocr?.totalAmount != null && (
              <div className="rounded-lg border border-border p-3">
                <Field
                  label="Total amount"
                  value={formatCurrency(inv.totalAmount, currency)}
                  ocrScore={fieldScore}
                  ocrValue={ocr.totalAmount}
                  confidence={ocrConfidence}
                  mono
                />
              </div>
            )}

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

            {/* Match score — score cards */}
            {scoreData && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Match score breakdown</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {scoreItems.map(item => (
                    <ScoreCard key={item.label} label={item.label} score={item.score} max={item.max} />
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 p-3 rounded-xl bg-muted/20 border border-border">
                  <div className="text-3xl font-bold tabular-nums">{inv.matchScore ?? scoreData.totalScore}</div>
                  <div>
                    <p className="text-sm font-semibold">/100</p>
                    <p className="text-xs text-muted-foreground">Overall match score</p>
                  </div>
                  {(inv.apLane ?? scoreData.lane) && (
                    <span className={cn('ml-auto rounded-full px-3 py-1 text-xs font-bold border',
                      (inv.apLane ?? scoreData.lane) === 'STP'    ? 'bg-green-50 text-green-700 border-green-200' :
                      (inv.apLane ?? scoreData.lane) === 'REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                    'bg-red-50 text-red-700 border-red-200')}>
                      {inv.apLane ?? scoreData.lane} lane
                    </span>
                  )}
                </div>
                {Array.isArray(scoreData.guardrailsTriggered) && scoreData.guardrailsTriggered.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Guardrails triggered</p>
                    <div className="flex flex-wrap gap-1.5">
                      {scoreData.guardrailsTriggered.map((g: string) => (
                        <span key={g} className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
