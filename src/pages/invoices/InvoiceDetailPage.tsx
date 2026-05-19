import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle, XCircle, Send, Loader2, Edit, PauseCircle, PlayCircle,
  ChevronLeft, ChevronRight, FileText, ExternalLink,
} from 'lucide-react'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { formatDate, formatDateTime, formatCurrency, formatStatus, getStatusColor } from '../../lib/utils/formatters'
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


// ── Read-only field — visually matches InvoiceFormPage's input rows ─────────
function ReadOnlyField({ label, value, chip, hint }: {
  label: string
  value: React.ReactNode
  chip?: React.ReactNode
  hint?: React.ReactNode
}) {
  const isEmpty = value == null || value === ''
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        {chip}
      </label>
      <div className="flex min-h-9 w-full items-center rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm">
        {isEmpty ? <span className="text-muted-foreground">—</span> : value}
      </div>
      {hint}
    </div>
  )
}

// ── Section wrapper — A/B/C lettered cards like InvoiceFormPage ─────────────
function Section({ letter, title, subtitle, children }: {
  letter:    string
  title:     string
  subtitle?: string
  children:  React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">
          <span className="text-primary font-bold mr-1.5">{letter}.</span>
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">
        {children}
      </div>
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
          {(fileName || fileUrl) && (
            <div className="flex items-center gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="font-medium truncate flex-1" title={fileName ?? ''}>{fileName ?? 'Attachment'}</span>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-input px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </a>
              )}
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

// ── Field-level chips ───────────────────────────────────────────────────────
// Green pill — used when a per-field exact-match check passes against the
// vendor master (GSTIN, PAN, currency). The score on this chip is NOT inherited
// from OCR confidence — that was the bug the match-agent refactor fixed.
function MatchChip({ matched, label }: { matched: boolean; label?: string }) {
  const color = matched
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-red-50 text-red-700 border-red-200'
  const text = matched ? (label ?? 'Exact match · 100%') : (label ?? 'Mismatch')
  return (
    <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ml-1.5', color)}>
      {text}
    </span>
  )
}

// Blue pill — flags an auto-computed value (due-date from paymentTerms,
// HSN/GST/TDS pulled from item_master). Hover reveals the source.
function AutoChip({ label, title }: { label: string; title?: string }) {
  return (
    <span title={title} className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[10px] font-medium ml-1.5">
      Auto · {label}
    </span>
  )
}

// Method chip — how the vendor was resolved by the match agent.
function MappingChip({ method }: { method: string | null | undefined }) {
  if (!method) return null
  const map: Record<string, { label: string; tone: string }> = {
    gstin_lookup: { label: 'GSTIN lookup',  tone: 'bg-green-50 text-green-700 border-green-200' },
    fuzzy_name:   { label: 'Fuzzy name',    tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    email_domain: { label: 'Email domain',  tone: 'bg-blue-50 text-blue-700 border-blue-200'  },
    manual:       { label: 'Manual',        tone: 'bg-muted text-foreground border-input'     },
  }
  const m = map[method] ?? { label: method, tone: 'bg-muted text-foreground border-input' }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ml-1.5', m.tone)}>
      Mapped via {m.label}
    </span>
  )
}

// Inline amber warning rendered inside ReadOnlyField.value when an expected
// field is null and we want to surface remediation in-context.
function FieldWarning({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
      <span className="rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-medium">!</span>
      {children}
    </span>
  )
}

// Top-3 vendor near-matches block — shown beneath the Vendor field when the
// match agent's confidence is < 98 (so the reviewer can pick the right one).
function VendorNearMatches({ matches }: { matches: VendorNearMatch[] | null | undefined }) {
  if (!matches || matches.length === 0) return null
  return (
    <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50/40 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">Near matches</p>
      <div className="mt-1 space-y-1">
        {matches.map(m => (
          <div key={m.id} className="flex items-center justify-between">
            <span className="text-xs">
              <span className="font-medium">{m.legalName}</span>
              <span className="text-muted-foreground ml-1.5">{m.vendorCode}</span>
            </span>
            <span className={cn(
              'text-xs font-medium tabular-nums',
              m.score >= 98 ? 'text-green-600' : m.score >= 80 ? 'text-amber-600' : 'text-muted-foreground',
            )}>
              {m.score}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface VendorNearMatch { id: string; legalName: string; vendorCode: string; gstin?: string | null; score: number }
interface ItemCandidate   { id: string; itemCode: string; name: string; description: string | null; hsnCode: string | null; gstRate: number | null; score: number }

// ── Line items table ────────────────────────────────────────────────────────
// Each row shows the resolved item-master name as the headline + match-score
// badge, with the raw OCR description rendered smaller below it. HSN / GST /
// TDS section appear as blue "auto" chips because they come from the item
// master, not the OCR text. A footer row cross-checks the sum against the
// Section B subtotal — red callout when it diverges.
function LineItemsTable({ lines, currency, subtotal }: { lines: any[]; currency: string; subtotal: number }) {
  const lineSum = lines.reduce((s, l) => s + Number(l.lineTotal ?? 0), 0)
  const match   = Math.abs(lineSum - subtotal) < 0.5
  return (
    <div className="-mx-5 -mb-5 overflow-x-auto border-t border-border">
      <table className="w-full text-xs">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            {['#','Item / description','Qty','Unit price','Base','GST amt','TDS','Total'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line: any) => {
            const matchScore = Number(line.itemMatchScore ?? 0)
            const isMapped   = !!line.itemId
            const isStrong   = isMapped && matchScore >= 98
            const candidates = (line.itemCandidates ?? []) as ItemCandidate[]
            // Item-master gstRate wins (it's the authoritative rate); fall back
            // to the line's own gstRate (set by ingestion when no match), then 0.
            const gstRate    = Number(line.item?.gstRate ?? line.gstRate ?? 0)
            const tdsRate    = Number(line.tdsRate ?? 0)
            const baseAmt    = Number(line.quantity) * Number(line.unitPrice)
            const gstAmt     = baseAmt * (gstRate / 100)
            const tdsAmt     = baseAmt * (tdsRate / 100)
            const itemName   = line.itemName ?? line.item?.name ?? null
            const hsn        = line.item?.hsnCode ?? line.hsnCode ?? null
            return (
              <tr key={line.id} className="border-b border-border last:border-0 align-top">
                <td className="px-3 py-2 text-muted-foreground">{line.lineNumber}</td>
                <td className="px-3 py-2 max-w-[320px]">
                  {/* Line 1: primary headline — item master name when mapped, otherwise OCR text + Unmatched badge */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {itemName ? (
                      <span className="font-medium">{itemName}</span>
                    ) : (
                      <>
                        <span className="font-medium">{line.description}</span>
                        <span className="rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[10px] font-medium">
                          Unmatched
                        </span>
                      </>
                    )}
                  </div>

                  {/* Line 2: OCR raw description (2-line clamp + tooltip) — only when distinct from headline */}
                  {itemName && line.description && line.description !== itemName && (
                    <p
                      className="text-[10px] text-muted-foreground mt-0.5 overflow-hidden"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                      title={line.description}
                    >
                      OCR: {line.description}
                    </p>
                  )}

                  {/* Line 3: match score badge + HSN chip + GST rate chip */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {isMapped && (
                      <span className={cn(
                        'rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                        isStrong ? 'bg-green-50 text-green-700 border-green-200'
                                 : 'bg-amber-50 text-amber-700 border-amber-200',
                      )}>
                        {matchScore > 0 ? `Match · ${matchScore}%` : 'Mapped'}
                      </span>
                    )}
                    {hsn && (
                      <span className="rounded-full border border-input bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">
                        HSN {hsn}
                      </span>
                    )}
                    {gstRate > 0 && (
                      <span className="rounded-full border border-input bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">
                        GST {gstRate}%
                      </span>
                    )}
                  </div>

                  {!isStrong && candidates.length > 1 && (
                    <details className="mt-1 text-[10px]">
                      <summary className="cursor-pointer text-amber-700 font-medium">
                        Pick from {candidates.length} candidates
                      </summary>
                      <div className="mt-1 space-y-0.5">
                        {candidates.map(c => (
                          <div key={c.id} className="flex items-center justify-between">
                            <span>{c.name} <span className="text-muted-foreground">{c.itemCode}</span></span>
                            <span className="tabular-nums">{c.score}%</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">{Number(line.quantity)}</td>
                <td className="px-3 py-2 tabular-nums font-mono">{formatCurrency(line.unitPrice, currency)}</td>
                <td className="px-3 py-2 tabular-nums font-mono">
                  <span>{formatCurrency(baseAmt, currency)}</span>
                  <span className="ml-1 rounded-full border border-green-200 bg-green-50 text-green-700 px-1 py-0.5 text-[9px] font-medium">= Q×R</span>
                </td>
                <td className="px-3 py-2 tabular-nums font-mono text-teal-700">
                  {formatCurrency(gstAmt, currency)}
                </td>
                <td className="px-3 py-2 tabular-nums font-mono text-amber-700">
                  {formatCurrency(tdsAmt, currency)}
                </td>
                <td className="px-3 py-2 tabular-nums font-mono font-semibold">{formatCurrency(line.lineTotal, currency)}</td>
              </tr>
            )
          })}
          <tr className={cn('border-t border-border', match ? 'bg-green-50/40' : 'bg-red-50/40')}>
            <td colSpan={4} className="px-3 py-2 text-right text-[11px] font-medium">
              Line items sum
            </td>
            <td className="px-3 py-2 tabular-nums font-mono font-semibold">{formatCurrency(lineSum, currency)}</td>
            <td colSpan={3} className={cn('px-3 py-2 text-[11px] font-medium', match ? 'text-green-700' : 'text-red-700')}>
              {match
                ? '= Financial summary subtotal · 100%'
                : `≠ subtotal ${formatCurrency(subtotal, currency)} (Δ ${formatCurrency(subtotal - lineSum, currency)})`}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Match-score banner — full-width teal banner above the lettered sections ─
// Visually distinct from the Section cards: tinted background, no letter prefix,
// large overall score as the headline. The 78/100 pill that used to live in
// the status row is removed — this banner is the canonical place to read the
// score from.
function ScoreBanner({
  totalScore, lane, scoreItems, guardrails, ingestedAt, ocrModel,
}: {
  totalScore:  number | null
  lane:        string | null
  scoreItems:  { label: string; score: number; max: number }[]
  guardrails:  string[]
  ingestedAt:  string | null
  ocrModel:    string
}) {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/30 px-5 py-4 space-y-4">
      {/* Headline row — large score + lane + OCR meta top-right */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold text-teal-700 tabular-nums leading-none">
            {totalScore ?? '—'}
          </span>
          <span className="text-sm text-teal-700/80 font-medium">/100 overall match score</span>
          {lane && (
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold border',
              lane === 'STP'    ? 'bg-green-50 text-green-700 border-green-200' :
              lane === 'REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-red-50 text-red-700 border-red-200')}>
              {lane} lane
            </span>
          )}
        </div>
        {ingestedAt && (
          <p className="text-[10px] text-muted-foreground leading-tight text-right">
            OCR · {ocrModel}<br />
            {formatDateTime(ingestedAt)}
          </p>
        )}
      </div>

      {/* Six score cards — fill the row, one per bucket */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {scoreItems.map(item => (
          <ScoreCard key={item.label} label={item.label} score={item.score} max={item.max} />
        ))}
      </div>

      {/* Guardrails row — only when something tripped */}
      {guardrails.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold text-amber-700 mb-1">Guardrails triggered</p>
          <div className="flex flex-wrap gap-1.5">
            {guardrails.map(g => (
              <span key={g} className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}
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

  // Lookup data — masters endpoints sometimes return [], sometimes { data: [] }.
  const toArray = (r: any): any[] => Array.isArray(r) ? r : (r?.data ?? [])
  const { data: entities = [] } = useQuery({
    queryKey: ['entities-list'],
    queryFn:  () => http.get<any>('/api/masters/entities').then(toArray),
    staleTime: 10 * 60_000,
  })
  const { data: usersList = [] } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn:  () => http.get<any>('/api/admin/users').then(toArray),
    staleTime: 10 * 60_000,
  })
  const { data: locations = [] } = useQuery({
    queryKey: ['locations-list'],
    queryFn:  () => http.get<any>('/api/masters/locations').then(toArray),
    staleTime: 10 * 60_000,
  })
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn:  () => http.get<any>('/api/masters/departments').then(toArray),
    staleTime: 10 * 60_000,
  })

  const entityName     = (id?: string | null) => (entities as any[]).find((e: any) => e.id === id)?.name ?? (id ?? '—')
  const userName       = (id?: string | null) => (usersList as any[]).find((u: any) => u.id === id)?.name ?? (id ?? '—')
  const locationName   = (id?: string | null) => (locations as any[]).find((l: any) => l.id === id)?.name ?? (id ?? '—')
  const departmentName = (id?: string | null) => (departments as any[]).find((d: any) => d.id === id)?.name ?? (id ?? '—')

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

  // OCR raw data — the Gemini extractor now emits per-field confidence via
  // `fieldConfidence`. Legacy rows pre-dating that prompt change carry only
  // `confidence.overall`; per-field readers fall back to overall so chips
  // still render. attachmentData/attachmentMime are stripped server-side —
  // bytes are streamed via GET /api/invoices/:id/file.
  type OcrFieldKey =
    | 'invoiceNumber' | 'invoiceDate' | 'dueDate'
    | 'vendorName'    | 'vendorGstin' | 'vendorPan'
    | 'subtotal'      | 'totalAmount' | 'currency'
    | 'narration'     | 'periodFrom'  | 'periodTo'
  const ocr = (inv.ocrRawData ?? null) as null | {
    confidence?:    { overall?: number }
    overallConfidence?: number
    invoiceNumber?: string | null
    invoiceDate?:   string | null
    dueDate?:       string | null
    vendorGSTIN?:   string | null
    vendorGstin?:   string | null
    vendorPAN?:     string | null
    vendorPan?:     string | null
    vendorName?:    string | null
    poReference?:   string | null
    totalAmount?:   number | null
    subtotal?:      number | null
    currency?:      string | null
    narration?:     string | null
    periodFrom?:    string | null
    periodTo?:      string | null
    fieldConfidence?: Partial<Record<OcrFieldKey, number>>
  }
  const ocrConfidence = ocr?.confidence?.overall ?? ocr?.overallConfidence ?? inv.ocrConfidence ?? null
  const isOcrInvoice  = inv.channelType === 'EMAIL_INGEST' || !!ocr
  // Pull per-field confidence, falling back to overall (so legacy rows still chip).
  const fieldConf = (key: OcrFieldKey): number | null => {
    if (!isOcrInvoice) return null
    return ocr?.fieldConfidence?.[key] ?? ocrConfidence
  }

  // Score breakdown from the match agent — InvoiceMatchScore.scoreBreakdown
  // carries vendorNearMatches[], itemMatchAvgScore, currencyMatch, narrationConfidence.
  const breakdown = (scoreData?.scoreBreakdown ?? null) as null | {
    vendorMatchMethod?:   string | null
    vendorNearMatches?:   VendorNearMatch[]
    itemMatchAvgScore?:   number
    currencyMatch?:       boolean
    narrationConfidence?: number
  }
  const vendorNearMatches = breakdown?.vendorNearMatches ?? []
  const vendorMatchMethod = inv.vendorMatchMethod ?? breakdown?.vendorMatchMethod ?? null

  // Per-field exact-match outcomes (rendered as green chips on Section A).
  // Computed frontend-side — the match agent doesn't expose these as fields
  // because they're trivially derivable from the raw values.
  const vendorGstin     = inv.vendorGSTIN ?? inv.vendor?.gstin ?? null
  const vendorPan       = inv.vendorPAN   ?? inv.vendor?.pan   ?? null
  const ocrGstinClean   = (ocr?.vendorGstin ?? ocr?.vendorGSTIN ?? '').trim().toUpperCase() || null
  const ocrPanClean     = (ocr?.vendorPan   ?? ocr?.vendorPAN   ?? '').trim().toUpperCase() || null
  const gstinExactMatch = !!vendorGstin && !!ocrGstinClean && vendorGstin.toUpperCase() === ocrGstinClean
  const panExactMatch   = !!vendorPan   && !!ocrPanClean   && vendorPan.toUpperCase()   === ocrPanClean
  const currencyExactMatch = breakdown?.currencyMatch ?? true   // true when match agent didn't flag a mismatch

  // Stream bytes through the auth'd endpoint — covers both disk-stored uploads
  // (manual flow) and the email-poller's JSON-blob bytes (legacy back-compat).
  // The server's hasFile flag drives whether the LeftPanel renders the iframe
  // or the "Document not available" placeholder.
  const previewMime = inv.mimeType ?? 'application/pdf'
  const previewUrl  = inv.hasFile ? `/api/invoices/${id}/file` : null

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
        backLabel="Invoices"
        backTo="/invoices"
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
          fileUrl={previewUrl}
          fileName={inv.fileName}
          mimeType={previewMime}
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
              {/* Lane badge and match score moved to the ScoreBanner above Section A. */}
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

            {/* KYC chips — vendor-level KYC status row, sits above sections */}
            {inv.vendor && (
              <div className="flex flex-wrap gap-2">
                <KycBadge label="PAN" status={inv.vendor.kycPanStatus} />
                <KycBadge label="GST" status={inv.vendor.kycGstStatus} />
                <KycBadge label="Bank" status={inv.vendor.kycBankStatus} />
              </div>
            )}

            {/* Match score banner — moved out of Section D, always above the form */}
            {scoreData && (
              <ScoreBanner
                totalScore={inv.matchScore ?? scoreData.totalScore ?? null}
                lane={inv.apLane ?? scoreData.lane ?? null}
                scoreItems={scoreItems}
                guardrails={Array.isArray(scoreData.guardrailsTriggered) ? scoreData.guardrailsTriggered : []}
                ingestedAt={ingestedAt}
                ocrModel="gemini-2.5-flash"
              />
            )}

            {/* Section A — Invoice Header */}
            <Section letter="A" title="Invoice Header" subtitle="Core invoice identifiers and dates">
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyField label="Entity"      value={entityName(inv.entityId)} />
                <ReadOnlyField label="Created by"  value={userName(inv.createdByUserId)} />
                <ReadOnlyField
                  label="Department"
                  value={inv.departmentId
                    ? departmentName(inv.departmentId)
                    : <FieldWarning>Not set on user profile — configure in user master</FieldWarning>}
                />
                <ReadOnlyField label="Bill-to location" value={locationName(inv.billToLocationId)} />

                {/* Vendor — mapping method chip + OCR confidence chip + near-matches block below */}
                <div className="col-span-2">
                  <ReadOnlyField
                    label="Vendor"
                    value={inv.vendor?.legalName ?? <FieldWarning>Unmatched — pick from near-matches below</FieldWarning>}
                    chip={
                      <>
                        <OcrChip score={fieldConf('vendorName')} />
                        <MappingChip method={vendorMatchMethod} />
                      </>
                    }
                    hint={
                      (fieldConf('vendorName') ?? 100) < 98
                        ? <VendorNearMatches matches={vendorNearMatches} />
                        : undefined
                    }
                  />
                </div>

                <ReadOnlyField
                  label="Vendor GSTIN"
                  value={<span className="font-mono">{vendorGstin ?? '—'}</span>}
                  chip={vendorGstin ? <MatchChip matched={gstinExactMatch} /> : undefined}
                />
                <ReadOnlyField
                  label="Vendor PAN"
                  value={<span className="font-mono">{vendorPan ?? '—'}</span>}
                  chip={vendorPan ? <MatchChip matched={panExactMatch} /> : undefined}
                />

                <ReadOnlyField
                  label="Invoice number"
                  value={<span className="font-mono font-medium">{inv.invoiceNumber}</span>}
                  chip={<OcrChip score={fieldConf('invoiceNumber')} />}
                />
                <ReadOnlyField
                  label="Invoice date"
                  value={formatDate(inv.invoiceDate)}
                  chip={<OcrChip score={fieldConf('invoiceDate')} />}
                />

                {/* Due date — three states:
                    1. inv.dueDate matches invoice_date + paymentTerms → AutoChip
                    2. inv.dueDate set but differs → manually entered / OCR-extracted, no chip
                    3. inv.dueDate null + paymentTerms null → FieldWarning */}
                {(() => {
                  const paymentTerms     = inv.vendor?.paymentTerms ?? null
                  const proposedDueDate  = paymentTerms != null && inv.invoiceDate
                    ? new Date(new Date(inv.invoiceDate).getTime() + paymentTerms * 86_400_000)
                    : null
                  const sameYmd = (a: Date, b: Date) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
                  const dueIsAutoComputed = inv.dueDate && proposedDueDate && sameYmd(new Date(inv.dueDate), proposedDueDate)
                  return (
                    <ReadOnlyField
                      label="Due date"
                      value={
                        inv.dueDate
                          ? formatDate(inv.dueDate)
                          : (paymentTerms == null
                              ? <FieldWarning>Payment term not set on vendor master — enter due date manually</FieldWarning>
                              : formatDate(proposedDueDate!))
                      }
                      chip={
                        dueIsAutoComputed || (!inv.dueDate && paymentTerms != null)
                          ? <AutoChip label={`${paymentTerms}-day net`} title={`Computed as invoice date + ${paymentTerms} days from vendor.paymentTerms`} />
                          : undefined
                      }
                    />
                  )
                })()}

                <ReadOnlyField
                  label="Currency"
                  value={currency}
                  chip={isOcrInvoice ? <MatchChip matched={currencyExactMatch} label={currencyExactMatch ? 'Exact match · 100%' : 'Mismatch'} /> : undefined}
                />
                <ReadOnlyField
                  label="Channel"
                  value={
                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs font-medium">
                      {(inv.channelType ?? 'MANUAL_UPLOAD').replace(/_/g, ' ')}
                    </span>
                  }
                />

                <ReadOnlyField
                  label="PO reference"
                  value={inv.poRef
                    ? <span className="font-mono">{inv.poRef}</span>
                    : <FieldWarning>No PO linked — reduces match score by 20 pts</FieldWarning>}
                />
                <div />

                {inv.irnNumber && (
                  <div className="col-span-2">
                    <ReadOnlyField
                      label="IRN (e-Invoice)"
                      value={
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-xs break-all">{inv.irnNumber}</span>
                          {inv.irnVerified && (
                            <span className="rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-xs font-medium ml-2 flex-shrink-0">
                              e-Invoice ✓
                            </span>
                          )}
                        </div>
                      }
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* Section B — Financial Summary (simplified to 4 fields with cross-check footnotes) */}
            <Section letter="B" title="Financial Summary" subtitle="Base, GST, total, TDS — auto cross-checked">
              <div className="grid grid-cols-1 gap-4">
                {(() => {
                  const subtotal    = Number(inv.subtotal) || 0
                  const gstTotal    = Number(inv.cgstAmount) + Number(inv.sgstAmount) + Number(inv.igstAmount)
                  const totalAmount = Number(inv.totalAmount) || 0
                  const tdsAmount   = Number(inv.tdsAmount) || 0
                  const netPayable  = Number(inv.netPayable) || (totalAmount - tdsAmount)
                  // Cross-checks — base+gst should equal total; lines should sum to base.
                  const lineSum     = (inv.lines ?? []).reduce((s: number, l: any) => s + Number(l.lineTotal ?? 0), 0)
                  const lineMatch   = Math.abs(lineSum - subtotal) < 0.5
                  const sumMatch    = Math.abs(subtotal + gstTotal - totalAmount) < 0.5
                  const gstSplit    = Number(inv.igstAmount) > 0 ? 'IGST' : 'CGST + SGST'
                  return (
                    <>
                      <ReadOnlyField
                        label="Base amount (subtotal)"
                        value={<span className="font-mono tabular-nums">{formatCurrency(subtotal, currency)}</span>}
                        chip={<OcrChip score={fieldConf('subtotal')} />}
                        hint={
                          <p className={cn('text-[11px] mt-1', lineMatch ? 'text-green-600' : 'text-red-600')}>
                            {lineMatch ? 'Matches line item total · 100%' : `Line items sum ${formatCurrency(lineSum, currency)} — discrepancy ${formatCurrency(subtotal - lineSum, currency)}`}
                          </p>
                        }
                      />
                      <ReadOnlyField
                        label="GST total"
                        value={<span className="font-mono tabular-nums">{formatCurrency(gstTotal, currency)}</span>}
                        chip={<AutoChip label={gstSplit} title="Auto-summed from CGST + SGST + IGST" />}
                        hint={
                          <p className="text-[11px] mt-1 text-muted-foreground">
                            {gstSplit} · CGST {formatCurrency(inv.cgstAmount, currency)} · SGST {formatCurrency(inv.sgstAmount, currency)} · IGST {formatCurrency(inv.igstAmount, currency)}
                          </p>
                        }
                      />
                      <ReadOnlyField
                        label="Total amount"
                        value={<span className="font-mono tabular-nums font-semibold">{formatCurrency(totalAmount, currency)}</span>}
                        chip={<OcrChip score={fieldConf('totalAmount')} />}
                        hint={
                          <p className={cn('text-[11px] mt-1', sumMatch ? 'text-green-600' : 'text-red-600')}>
                            {sumMatch ? 'Base + GST = Total · 100%' : `Base + GST = ${formatCurrency(subtotal + gstTotal, currency)} — does not match`}
                          </p>
                        }
                      />
                      <ReadOnlyField
                        label="TDS deducted"
                        value={<span className="font-mono tabular-nums text-amber-700">{formatCurrency(tdsAmount, currency)}</span>}
                        chip={tdsAmount > 0
                          ? <AutoChip label={`Sec ${(ocr as any)?.tdsSection ?? '194J'} · ${Math.round((tdsAmount / Math.max(subtotal, 1)) * 100)}%`} />
                          : undefined}
                        hint={
                          <p className="text-[11px] mt-1 text-muted-foreground">
                            Net payable = <span className="font-mono">{formatCurrency(netPayable, currency)}</span>
                          </p>
                        }
                      />
                    </>
                  )
                })()}
              </div>
            </Section>

            {/* Section C — Line items (mapped to item_master with per-row match scores) */}
            {inv.lines?.length > 0 && (
              <Section letter="C" title="Line Items" subtitle={`${inv.lines.length} line${inv.lines.length === 1 ? '' : 's'} · mapped to item master`}>
                <LineItemsTable lines={inv.lines} currency={currency} subtotal={Number(inv.subtotal) || 0} />
              </Section>
            )}

            {/* Section D (new) — Narration & period of expense */}
            <Section letter="D" title="Narration & Period of Expense" subtitle="Free-text narrative + billing period">
              <div className="grid grid-cols-1 gap-4">
                <ReadOnlyField
                  label="Narration"
                  value={inv.narration ?? <span className="text-muted-foreground">— not extracted —</span>}
                  chip={<OcrChip score={fieldConf('narration')} />}
                />
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField
                    label="Period from"
                    value={inv.periodFrom ? formatDate(inv.periodFrom) : '—'}
                    chip={<OcrChip score={fieldConf('periodFrom')} />}
                  />
                  <ReadOnlyField
                    label="Period to"
                    value={inv.periodTo ? formatDate(inv.periodTo) : '—'}
                    chip={<OcrChip score={fieldConf('periodTo')} />}
                  />
                </div>
              </div>
            </Section>

            {/* Section E — Audit Trail */}
            {(inv.auditLogs?.length > 0 || inv.approvals?.length > 0) && (
              <Section letter="E" title="Audit Trail" subtitle="Chronological event history and legacy approval steps">
                {inv.auditLogs?.length > 0 && (
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
                )}

                {inv.approvals?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legacy approval steps</p>
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
              </Section>
            )}

            {/* Section F — Approval Workflow */}
            {inv.workflowInstanceId && (
              <Section letter="F" title="Approval Workflow" subtitle="Stage timeline and discussion thread">
                <div className="-m-5">
                  <WorkflowPanel
                    invoiceId={inv.id}
                    workflowInstanceId={inv.workflowInstanceId}
                    onAction={() => qc.invalidateQueries({ queryKey: ['invoices', id] })}
                  />
                </div>
              </Section>
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
    <div className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{instance.definition?.name ?? 'Standard workflow'}</p>
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
