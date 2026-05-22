import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Loader2, Upload, FileText, AlertTriangle, Send, Info, Zap,
  ChevronLeft, ChevronRight, X, ScanLine, Edit3, Sparkles, ChevronDown, ChevronUp,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { http, HttpError } from '../../lib/http'
import { MasterPageHeader, FormInput, FormSelect, FormTextarea } from '../../components/masters/MasterFormLayout'
import { useAuthStore } from '../../stores/auth.store'
import { formatCurrency, formatDate, formatDateTime, formatStatus } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'
import {
  pickGl, computeJvEntries, jvTotals, computeCrossCheck, panFromGstin, normalizeStateCode, STATE_CODE_TO_NAME,
  type GlCodeRef,
} from '../../lib/invoice-form'

// Direct-invoice L2 threshold — also baked into WF-INV-DIRECT-L2 (prisma/seed.ts).
// Above this, the L2 approval workflow kicks in for direct (non-PO) invoices.
const L2_THRESHOLD = 25_000

// ── Types ───────────────────────────────────────────────────────────────────

interface LineItem {
  itemId?:         string
  itemCode?:       string
  description:     string
  quantity:        number
  uom?:            string
  unitPrice:       number
  discountPct?:    number
  discountAmount:  number
  taxableAmount:   number
  gstRate?:        number
  cgstAmount:      number
  sgstAmount:      number
  igstAmount:      number
  tdsRate?:        number
  tdsAmount:       number
  rcmApplicable:   boolean
  hsnCode?:        string
  sacCode?:        string
  glCodeId?:       string
  costCentreId?:   string
  profitCentreId?: string
  lineTotal:       number
}

interface FormValues {
  // Section A — header
  entityId:           string
  departmentId?:      string
  vendorId:           string
  vendorGSTIN?:       string
  vendorPAN?:         string
  billToLocationId?:  string
  invoiceNumber:      string
  invoiceDate:        string
  dueDate?:           string
  channelType:        string
  currencyCode:       string
  poRef?:             string
  irnNumber?:         string
  // Header-level cost allocation — required when direct (?type=direct), optional otherwise
  costCentreId?:      string
  glCodeId?:          string
  // Section B — financial summary (manual override of line-derived totals)
  baseAmount?:        number    // OCR-extracted or manual; cross-checked vs lines
  grossAmount?:       number    // OCR-extracted or manual; cross-checked vs base + tax
  // Section E — additional
  narration?:         string
  periodFrom?:        string
  periodTo?:          string
  retentionRequired?: boolean
  retentionAmount?:   number
  retentionGlCodeId?: string
  // Lines
  lines: LineItem[]
}

interface POSummary {
  id:             string
  poRef:          string
  poDate:         string
  vendorId:       string
  entityId:       string
  totalAmount:    string | number
  consumedAmount: string | number
  openValue:      number
  grnCount:       number
  status:         string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const toArray = (r: any) => Array.isArray(r) ? r : (r?.data ?? [])
const fmt = (n: number, ccy: string = 'INR') => formatCurrency(n || 0, ccy)

// Compact cell styles for inputs/selects inside the line-items table. twMerge
// (via FormInput/FormSelect's cn()) collapses the default padding/height so the
// controls render in the tight 36px row height.
const CELL_INPUT  = 'h-7 px-1.5 py-1 text-xs rounded border border-input bg-background focus:ring-1 focus:ring-ring outline-none w-full'
const CELL_SELECT = 'h-7 px-1.5 py-1 text-xs rounded border border-input bg-background outline-none w-full'
// Numeric cells right-align their value and hide the native spinner arrows
// so the rendered digits aren't clipped by the up/down chevron — that was
// what made Qty look blank in narrow columns.
const NUMERIC_INPUT = `${CELL_INPUT} text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0`

// Read a file as base64 (sans data: prefix) — used for OCR upload
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = e => resolve(((e.target?.result as string) || '').split(',')[1] ?? '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// OCR returns DD/MM/YYYY; HTML date input wants YYYY-MM-DD
function dmyToIso(s: string | null | undefined): string | undefined {
  if (!s) return undefined
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (!m) return s.length === 10 ? s : undefined
  const [, d, mo, y] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// Round to N decimal places. JS multiplication accumulates floating-point
// drift (e.g. 0.1 + 0.2 = 0.30000000000000004) — every monetary step in
// recalcLine is rounded so the displayed Amount/GST/TDS/Net don't carry
// "₹1,25,087.50" artefacts when the inputs are clean integers.
const round2 = (n: number) => Math.round(n * 100) / 100
const round3 = (n: number) => Math.round(n * 1000) / 1000

// GST split key — Indian GST is intrastate when vendor's GSTIN state code
// equals the bill-to location's state code. The form previously compared
// "27" (vendor.stateCode, numeric) to "Maharashtra" (entity.state, free
// text) and always flagged interstate. Both sides are now normalised to the
// 2-digit GST code via normalizeStateCode so the comparison is meaningful.
// Bill-to state — not entity state — drives the split per the GST regime.
function recalcLine(line: LineItem, vendorState: string, billToState: string): LineItem {
  // Inputs are normalised before multiplication so a stale floating-point
  // quantity (e.g. "1.0007") doesn't leak through into the line total.
  const qty       = round3(parseFloat(String(line.quantity   ?? 0))) || 0
  const unitPrice = round2(parseFloat(String(line.unitPrice  ?? 0))) || 0
  const discPct   = Number(line.discountPct) || 0
  const gstRate   = Number(line.gstRate)     || 0
  const tdsRate   = Number(line.tdsRate)     || 0

  const lineBase     = round2(qty * unitPrice)
  const discountAmt  = round2((lineBase * discPct) / 100)
  const taxableAmt   = round2(lineBase - discountAmt)
  const gstAmt       = round2((taxableAmt * gstRate) / 100)
  const tdsAmt       = round2((taxableAmt * tdsRate) / 100)
  const vCode        = normalizeStateCode(vendorState)
  const bCode        = normalizeStateCode(billToState)
  const isInterstate = !!vCode && !!bCode && vCode !== bCode
  // Split GST so cgst + sgst always equals gstAmt exactly — round the half
  // once and let sgst pick up the remainder.
  const halfGst      = round2(gstAmt / 2)
  const cgst         = isInterstate ? 0 : halfGst
  const sgst         = isInterstate ? 0 : round2(gstAmt - halfGst)
  const igst         = isInterstate ? gstAmt : 0
  const total        = round2(taxableAmt + gstAmt - tdsAmt)

  return { ...line, quantity: qty, unitPrice, discountAmount: discountAmt, taxableAmount: taxableAmt, cgstAmount: cgst, sgstAmount: sgst, igstAmount: igst, tdsAmount: tdsAmt, lineTotal: total }
}

function recalcTotals(lines: LineItem[]) {
  return {
    subtotal:       lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0),
    discountAmount: lines.reduce((s, l) => s + Number(l.discountAmount), 0),
    taxableAmount:  lines.reduce((s, l) => s + Number(l.taxableAmount), 0),
    cgstAmount:     lines.reduce((s, l) => s + Number(l.cgstAmount), 0),
    sgstAmount:     lines.reduce((s, l) => s + Number(l.sgstAmount), 0),
    igstAmount:     lines.reduce((s, l) => s + Number(l.igstAmount), 0),
    tdsAmount:      lines.reduce((s, l) => s + Number(l.tdsAmount), 0),
    totalAmount:    lines.reduce((s, l) => s + Number(l.lineTotal), 0),
    netPayable:     lines.reduce((s, l) => s + Number(l.lineTotal), 0),
  }
}

const emptyLine = (): LineItem => ({
  description: '', quantity: 1, unitPrice: 0, discountPct: 0,
  discountAmount: 0, taxableAmount: 0, gstRate: 0,
  cgstAmount: 0, sgstAmount: 0, igstAmount: 0, tdsRate: 0,
  tdsAmount: 0, rcmApplicable: false, lineTotal: 0,
})

// ── Sub-components ──────────────────────────────────────────────────────────

// Async LLM scoring runs after n8n ingest (invoice-scorer.service). When the
// scorer raises flags / validation issues / a vendor-match suggestion, the
// banner surfaces them on the edit form so the reviewer sees them before
// editing fields. Hidden when there's nothing to show.
interface LlmReviewFlag      { flag: string; reason: string; severity: 'critical' | 'high' | 'medium' | 'low' }
interface LlmValidationIssue { field: string; severity: 'error' | 'warning'; message: string }

// Item-master match result (one per line). Same shape the
// /api/items/match endpoint returns, plus a local autoSelected flag tracking
// whether we already pushed the best candidate into the Item dropdown so the
// chip can render "Matched" vs "Review" without a re-query.
interface ItemMatchEntry {
  itemId:            string
  itemCode:          string
  itemName:          string
  description:       string | null
  gstRate:           number | null
  tdsRate:           number | null
  defaultGlCode:     string | null
  defaultCostCentre: string | null
  sacHsnCode:        string | null
  confidence:        number
  matchType:         'EXACT' | 'HIGH' | 'FUZZY' | 'PARTIAL'
}
interface ItemMatchUI {
  inputDescription: string
  matches:          ItemMatchEntry[]
  bestMatch:        ItemMatchEntry | null
  autoSelect:       boolean
  autoSelected:     boolean   // true after we wrote the bestMatch into the form
}
interface LlmVendorSuggestion { suggestedName: string | null; gstin: string | null; confidence: number }

// ── Fuzzy duplicate banner ──────────────────────────────────────────────────
// Reads { isDuplicate, isSuspicious, matches } from
// GET /api/invoices/:id/duplicate-check (also returnable from
// /api/invoices/:id when the field is set during ingestion). EXACT matches
// render red and block-style; suspicious matches render amber with the rule
// label, confidence and a deep link to the matched invoice. Never blocks
// submission — the AP reviewer decides.
interface DuplicateMatchUI {
  invoiceId:     string
  invoiceNumber: string
  vendorName:    string
  totalAmount:   number
  invoiceDate:   string
  matchType:     'EXACT' | 'FUZZY_NUMBER' | 'FUZZY_AMOUNT' | 'FUZZY_VENDOR_DATE' | 'LINE_ITEM'
  confidence:    number
  reason:        string
}
interface DuplicateCheckUI {
  isDuplicate:  boolean
  isSuspicious: boolean
  matches:      DuplicateMatchUI[]
}

const MATCH_TYPE_LABELS: Record<DuplicateMatchUI['matchType'], string> = {
  EXACT:             'Exact',
  FUZZY_NUMBER:      'Fuzzy number',
  FUZZY_AMOUNT:      'Fuzzy amount',
  FUZZY_VENDOR_DATE: 'Vendor + date',
  LINE_ITEM:         'Line items',
}

function DuplicateBanner({ data, currency }: { data: DuplicateCheckUI | null | undefined; currency: string }) {
  if (!data || !data.matches?.length) return null
  const isExact = data.isDuplicate
  return (
    <div className={cn('rounded-xl border px-5 py-4 space-y-3',
      isExact ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/40')}>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className={cn('text-sm font-semibold', isExact ? 'text-red-800' : 'text-amber-800')}>
          {isExact ? '⚠ Exact duplicate detected' : '⚠ Possible duplicate — review required'}
        </h3>
        <span className="text-[10px] text-muted-foreground">{data.matches.length} match{data.matches.length === 1 ? '' : 'es'} · doesn&apos;t block submission</span>
      </div>
      <p className={cn('text-xs', isExact ? 'text-red-700' : 'text-amber-700')}>
        {isExact
          ? 'This invoice appears to already exist. Review before submitting.'
          : 'These invoices may be the same. Verify before submitting.'}
      </p>
      <ul className="space-y-1.5">
        {data.matches.map(m => (
          <li key={m.invoiceId} className="flex items-start gap-2 text-xs">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide flex-shrink-0',
              m.matchType === 'EXACT' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200')}>
              {MATCH_TYPE_LABELS[m.matchType]}
            </span>
            <span className="flex-1 leading-relaxed">
              <span className="font-mono font-medium">{m.invoiceNumber}</span>
              <span className="text-muted-foreground"> · {m.vendorName} · {formatCurrency(m.totalAmount, currency)} · {m.invoiceDate}</span>
              <br />
              <span className="text-muted-foreground">Reason: {m.reason} · Confidence: {Math.round(m.confidence * 100)}%</span>
            </span>
            <a
              href={`/invoices/${m.invoiceId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex-shrink-0"
            >
              View invoice →
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LlmReviewBanner({ inv }: { inv: any | null | undefined }) {
  if (!inv) return null
  const flags   = Array.isArray(inv.reviewFlags)      ? inv.reviewFlags      as LlmReviewFlag[]      : []
  const issues  = Array.isArray(inv.validationIssues) ? inv.validationIssues as LlmValidationIssue[] : []
  const sug     = (inv.vendorMatchSuggestion && (inv.vendorMatchSuggestion as LlmVendorSuggestion).confidence > 0.5)
    ? (inv.vendorMatchSuggestion as LlmVendorSuggestion)
    : null
  const showVendorChip = sug && !inv.vendorId
  const isHold = inv.recommendedAction === 'hold' && flags.length > 0
  if (!isHold && issues.length === 0 && !showVendorChip) return null

  const severityClass: Record<LlmReviewFlag['severity'], string> = {
    critical: 'bg-red-50 text-red-700 border-red-200',
    high:     'bg-amber-50 text-amber-700 border-amber-200',
    medium:   'bg-gray-100 text-gray-700 border-gray-200',
    low:      'bg-gray-50 text-gray-600 border-gray-200',
  }
  const sortedIssues = [...issues].sort((a, b) => (a.severity === 'error' ? -1 : 1) - (b.severity === 'error' ? -1 : 1))

  return (
    <div className={cn('rounded-xl border px-5 py-4 space-y-3', isHold ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/30')}>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className={cn('text-sm font-semibold', isHold ? 'text-red-800' : 'text-amber-800')}>
          {isHold ? 'On hold — AI review flags' : 'AI review notes'}
        </h3>
        <span className="text-[10px] text-muted-foreground">Auto-generated by invoice-scorer · resolve before submit</span>
      </div>

      {flags.length > 0 && (
        <ul className="space-y-1.5">
          {flags.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide flex-shrink-0', severityClass[f.severity] ?? severityClass.low)}>
                {f.severity}
              </span>
              <span className="leading-relaxed">
                <span className="font-medium">{f.flag}</span>
                <span className="text-muted-foreground"> — {f.reason}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {sortedIssues.length > 0 && (
        <div className="border-t border-current/10 pt-2 space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Validation issues</p>
          <ul className="space-y-0.5">
            {sortedIssues.map((it, i) => (
              <li key={i} className="text-xs flex items-baseline gap-2">
                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', it.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800')}>
                  {it.severity}
                </span>
                <span className="font-mono text-muted-foreground">{it.field}</span>
                <span>— {it.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showVendorChip && (
        <div className="border-t border-current/10 pt-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Suggested vendor</p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 text-teal-800 px-2.5 py-1 text-xs font-medium">
            {sug!.suggestedName ?? 'Unknown'}
            {sug!.gstin && <span className="text-[10px] font-mono text-teal-700/80">({sug!.gstin})</span>}
            <span className="text-[10px] text-teal-700/60">· {Math.round(sug!.confidence * 100)}% confidence</span>
          </span>
        </div>
      )}
    </div>
  )
}

// Per-section badge colour, matching the Figma palette. Each section gets a
// circular 28px badge with white letter inside.
const SECTION_BADGE_BG: Record<string, string> = {
  A: '#1D9E75', B: '#1D9E75', C: '#E8720C',
  D: '#7C3AED', E: '#2563EB', F: '#1E293B', G: '#64748B',
}

function SectionHeader({ letter, title, subtitle, action }: {
  letter:    string
  title:     string
  subtitle?: string
  action?:   React.ReactNode   // collapse arrow, etc.
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border pb-2 mb-4">
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: SECTION_BADGE_BG[letter] ?? '#1D9E75' }}
      >
        {letter}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// Header variant for sections that render with a dark bar (JV preview etc.).
function DarkSectionHeader({ letter, title, subtitle, action }: {
  letter:    string
  title:     string
  subtitle?: string
  action?:   React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 -m-6 mb-4 px-6 py-3 rounded-t-xl" style={{ background: '#1E293B' }}>
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: SECTION_BADGE_BG[letter] ?? '#1E293B', boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' }}
      >
        {letter}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight text-white">{title}</p>
        {subtitle && <p className="text-xs text-white/70 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function Field({ label, required, error, span, children }: {
  label: React.ReactNode; required?: boolean; error?: string; span?: boolean; children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', span && 'col-span-2')}>
      <label className={cn('text-sm font-medium', error && 'text-red-600')}>
        {label}{required && <span className={cn('ml-0.5', error ? 'text-red-600' : 'text-destructive')}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── OCR source / override indicator ─────────────────────────────────────────
// One icon per OCR-tracked field. Teal scan icon when the value still matches
// what OCR extracted; amber edit icon once the user overrides it. The pair of
// Sets (ocrFields + overriddenFields) is maintained by the form root via the
// markOcrFields helper + a single useEffect that diffs against ocrOriginalValues.
// Figma chip palette — text-first, no gradients. The OCR chip carries the
// per-field confidence percent when known. The Auto-filled chip flags
// derived values (PAN from GSTIN, due date from credit terms, totals).
const CHIP_OCR_STYLE      = { background: '#E6F1FB', color: '#185FA5', border: '1px solid #B5D4F4' } as const
const CHIP_AUTO_STYLE     = { background: '#E1F5EE', color: '#0F6E56', border: '1px solid #9FE1CB' } as const
const CHIP_OVERRIDE_STYLE = { background: '#FAEEDA', color: '#854F0B', border: '1px solid #FAC775' } as const

/** Small inline chip used in field labels and the OCR banner. */
function MetaChip({ icon, label, style, title }: {
  icon?:   React.ReactNode
  label:   string
  style:   React.CSSProperties
  title?:  string
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 align-middle ml-1 text-[10px] font-medium leading-none whitespace-nowrap"
      style={style}
    >
      {icon}
      {label}
    </span>
  )
}

function OcrFieldIndicator({ fieldKey, ocrFields, overriddenFields, ocrOriginalValues, ocrFieldConfidence }: {
  fieldKey:            string
  ocrFields:           Set<string>
  overriddenFields:    Set<string>
  ocrOriginalValues?:  Record<string, unknown>
  ocrFieldConfidence?: Record<string, number>
}) {
  if (overriddenFields.has(fieldKey)) {
    const orig = ocrOriginalValues?.[fieldKey]
    const tip  = orig != null && orig !== ''
      ? `Manually overridden · OCR read: ${String(orig)}`
      : 'Manually overridden'
    return (
      <MetaChip
        icon={<Edit3 className="h-2.5 w-2.5" />}
        label="Edited"
        style={CHIP_OVERRIDE_STYLE}
        title={tip}
      />
    )
  }
  if (ocrFields.has(fieldKey)) {
    const conf = ocrFieldConfidence?.[fieldKey]
    const label = typeof conf === 'number' ? `OCR ${Math.round(conf)}%` : 'OCR'
    return (
      <MetaChip
        icon={<ScanLine className="h-2.5 w-2.5" />}
        label={label}
        style={CHIP_OCR_STYLE}
        title="From OCR · original value preserved"
      />
    )
  }
  return null
}

/** Stand-alone Auto-filled chip — used on derived fields (PAN, totals, due
 *  date) that aren't OCR-sourced but the system fills in. */
// Item-master match chip + expandable suggestions. Rendered under the line's
// Item dropdown after OCR matching runs:
//   • autoSelected (conf ≥ 0.85) → green "Matched · 92%" chip
//   • bestMatch but no auto       → amber "Review match · 78%" chip with a
//                                    "{N} suggestions ›" expandable that lets
//                                    the user pick a candidate inline.
//   • no matches                  → muted "No match — pick manually" hint.
function ItemMatchCell({ data, expanded, onToggle, onPickSuggestion }: {
  data:             ItemMatchUI
  expanded:         boolean
  onToggle:         () => void
  onPickSuggestion: (itemId: string) => void
}) {
  const best = data.bestMatch
  if (!best) {
    return (
      <div className="mt-1 text-[10px] text-muted-foreground">
        No match — pick manually
      </div>
    )
  }
  const pct = Math.round(best.confidence * 100)
  if (data.autoSelected) {
    return (
      <div className="mt-1 flex items-center gap-1 text-[10px]">
        <span
          title={`OCR: "${data.inputDescription}"`}
          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 whitespace-nowrap"
        >
          <CheckCircle2 className="h-2.5 w-2.5" />
          Matched · {pct}%
        </span>
      </div>
    )
  }
  // Review match — surface suggestions on click.
  const rest = data.matches.length
  return (
    <div className="mt-1 text-[10px]">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700 whitespace-nowrap hover:bg-amber-100"
      >
        Review match · {pct}%
        {rest > 0 && <span className="text-amber-600">· {rest} suggestion{rest === 1 ? '' : 's'} {expanded ? '▾' : '▸'}</span>}
      </button>
      {expanded && (
        <div className="mt-1 rounded-md border border-border bg-popover p-1 space-y-0.5">
          {data.matches.map(m => (
            <button
              key={m.itemId}
              type="button"
              onClick={() => onPickSuggestion(m.itemId)}
              className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left hover:bg-muted"
            >
              <span className="truncate">{m.itemCode} — {m.itemName}</span>
              <span className="flex items-center gap-1 shrink-0">
                <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">{m.matchType}</span>
                <span className="text-[10px] font-medium text-foreground">{Math.round(m.confidence * 100)}%</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AutoFilledChip() {
  return (
    <span
      title="Auto-filled by the system"
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 align-middle ml-1 text-[10px] font-medium leading-none whitespace-nowrap"
      style={CHIP_AUTO_STYLE}
    >
      <Sparkles className="h-2.5 w-2.5" />
      Auto-filled
    </span>
  )
}

// "Edited" amber chip — appears next to the label after the icon when the
// reviewer overrides an OCR-populated value. Pair this with OcrOverrideHint
// below the input.
function EditedBadge({ fieldKey, overriddenFields }: { fieldKey: string; overriddenFields: Set<string> }) {
  if (!overriddenFields.has(fieldKey)) return null
  return (
    <span className="ml-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 align-middle">
      Edited
    </span>
  )
}

// Hint rendered below an overridden input, showing the original OCR value so
// the reviewer can audit the diff before submitting.
function OcrOverrideHint({ fieldKey, overriddenFields, ocrOriginalValues }: {
  fieldKey:          string
  overriddenFields:  Set<string>
  ocrOriginalValues: Record<string, unknown>
}) {
  if (!overriddenFields.has(fieldKey)) return null
  const orig = ocrOriginalValues[fieldKey]
  if (orig == null || orig === '') return null
  return (
    <p className="text-[10px] text-amber-700 mt-1">
      Manually overridden · OCR read &lsquo;{String(orig)}&rsquo;
    </p>
  )
}

// ── Left panel: file upload + preview + OCR trigger ─────────────────────────

interface LeftPanelProps {
  open:        boolean
  onToggle:    () => void
  file:        File | null
  fileURL:     string | null
  onFile:      (f: File | null) => void
  onExtract:   () => void
  ocrLoading:  boolean
  ocrError:    string | null
  ocrConfidence: number | null
  ocrModel:    string | null
  onDismissOcr: () => void
  // Server-stored attachment (edit mode). When set and no fresh local file is
  // chosen, the preview pane renders this URL via iframe / <img>.
  existingFileURL?:  string | null
  existingFileName?: string | null
  existingFileMime?: string | null
}

function LeftPanel({
  open, onToggle, file, fileURL, onFile, onExtract, ocrLoading, ocrError, ocrConfidence, ocrModel, onDismissOcr,
  existingFileURL, existingFileName, existingFileMime,
}: LeftPanelProps) {
  const [drag, setDrag] = useState(false)
  const inputRef        = useRef<HTMLInputElement>(null)

  // A fresh local upload trumps the server file. The preview shape (iframe vs
  // <img>) is decided by mime — both manual uploads and email attachments may
  // be PDFs or images.
  const previewURL  = fileURL ?? existingFileURL ?? null
  const previewMime = file?.type ?? existingFileMime ?? ''
  const previewIsImage = previewMime.startsWith('image/')
  const displayName = file?.name ?? existingFileName ?? null

  const handle = (f?: File | null) => {
    if (!f) return
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(f.type)) return
    onFile(f)
  }

  return (
    <div className={cn(
      'flex flex-col border-r border-border bg-background relative transition-all flex-shrink-0',
      open ? 'w-96' : 'w-10',
    )}>
      <button
        onClick={onToggle}
        className="absolute top-4 -right-3 z-10 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted shadow-sm"
        aria-label={open ? 'Collapse upload panel' : 'Expand upload panel'}
      >
        {open ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {open && (
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
          {/* Drop zone */}
          <div
            onDragOver ={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop     ={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]) }}
            onClick    ={() => inputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-5 cursor-pointer transition-colors',
              drag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30',
            )}
          >
            <input
              ref      ={inputRef}
              type     ="file"
              accept   =".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange ={e => handle(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex flex-col items-center gap-1 text-xs">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium text-center break-all px-2">{file.name}</span>
                <span className="text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
              </div>
            ) : existingFileURL ? (
              <div className="flex flex-col items-center gap-1 text-xs">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-medium">Replace attachment</p>
                <p className="text-[10px] text-muted-foreground">PDF · PNG · JPG · WEBP</p>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <p className="text-xs font-medium">Drop invoice here</p>
                <p className="text-[10px] text-muted-foreground">PDF · PNG · JPG · WEBP</p>
              </>
            )}
          </div>

          {file && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExtract}
                disabled={ocrLoading}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {ocrLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                {ocrLoading ? 'Extracting…' : 'Extract with OCR'}
              </button>
              <button
                type="button"
                onClick={onDismissOcr}
                className="rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                title="Skip OCR, fill manually"
              >
                Manual entry
              </button>
              <button
                type="button"
                onClick={() => onFile(null)}
                className="rounded-md border border-input p-1.5 text-muted-foreground hover:bg-muted"
                title="Remove file"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* OCR confidence bar moved below the preview pane per Figma. The
              right-panel banner is the primary readout; this is a compact
              echo right under the attachment. */}

          {ocrError && (() => {
            const isQuotaError = /429|quota|rate limit/i.test(ocrError)
            return (
              <div className={cn(
                'flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-xs',
                isQuotaError
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-destructive/30 bg-destructive/5 text-destructive',
              )}>
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {isQuotaError ? (
                    <p className="break-words">
                      Gemini free-tier quota exceeded.
                      <a
                        href="https://ai.google.dev/pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline ml-1"
                      >
                        Upgrade plan →
                      </a>
                    </p>
                  ) : (
                    <p className="break-words whitespace-pre-wrap">{ocrError}</p>
                  )}
                  <button
                    type="button"
                    onClick={onDismissOcr}
                    className="mt-1 underline font-medium hover:opacity-80"
                  >
                    Try manual entry instead
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Saved attachment filename row — shown when previewing a
              server-stored file. Mirrors the Figma "filename · size · pages"
              line; only filename is known reliably here. */}
          {!file && existingFileURL && displayName && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="font-medium truncate" title={displayName}>{displayName}</span>
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-muted whitespace-nowrap"
              >
                Replace attachment
              </button>
            </div>
          )}

          {/* Preview pane — fills remaining vertical space */}
          <div className="flex-1 rounded-lg border border-border bg-muted/20 overflow-hidden min-h-0">
            {!previewURL ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No document uploaded
              </div>
            ) : previewIsImage ? (
              <div className="h-full overflow-auto p-2">
                <img src={previewURL} className="w-full object-contain" alt="Invoice preview" />
              </div>
            ) : (
              <iframe src={previewURL} className="w-full h-full border-0" title="Invoice preview" />
            )}
          </div>

          {/* OCR confidence bar — sits directly under the preview per Figma */}
          {ocrConfidence != null && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">OCR Confidence</span>
                <span className={cn('text-xs font-semibold tabular-nums', ocrConfidence >= 80 ? 'text-teal-700' : ocrConfidence >= 60 ? 'text-amber-700' : 'text-red-700')}>
                  {ocrConfidence}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', ocrConfidence >= 80 ? 'bg-teal-500' : ocrConfidence >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                  style={{ width: `${ocrConfidence}%` }}
                />
              </div>
              {ocrModel && (
                <p className="text-[10px] text-muted-foreground">via <span className="font-mono">{ocrModel}</span></p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function InvoiceFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const location = useLocation()
  const isEdit   = !!id
  // Explicit /:id/edit path always allows editing (within editable statuses).
  // Bare /:id is a review URL — read-only when status is terminal/post-approval.
  const isExplicitEdit = location.pathname.endsWith('/edit')
  const qc       = useQueryClient()
  const authUser = useAuthStore(s => s.user)

  // Mode is derived from the ?type query param on the /invoices/new route.
  //   ?type=po     → PO selection panel above Section A, poRef populated by picker
  //   ?type=direct → no PO ref / no header cost-centre / GL / channel — line-level only
  //   no ?type     → modal overlay forcing the choice (only when creating new)
  //   editing      → ignore query, render full form; EMAIL-ingested invoices use the
  //                  same lean A→F layout as direct (no PO ref / no header CC/GL).
  const [searchParams, setSearchParams] = useSearchParams()
  const queryType = searchParams.get('type')
  const mode: 'edit' | 'po' | 'direct' | 'choose' =
    isEdit ? 'edit'
    : queryType === 'po'     ? 'po'
    : queryType === 'direct' ? 'direct'
    :                          'choose'

  // PO-mode selection state — single PO per invoice (matches the existing
  // POST /api/invoices poRefs[] payload). consumptionType + matchType flow
  // into the InvoicePOLink rows + Invoice.matchType at submit time.
  const [selectedPoId,    setSelectedPoId]    = useState<string | null>(null)
  const [consumptionType, setConsumptionType] = useState<'PARTIAL' | 'FULL'>('PARTIAL')
  const [matchType,       setMatchType]       = useState<'2way' | '3way'>('2way')

  const [leftOpen, setLeftOpen]   = useState(true)
  const [file, setFile]           = useState<File | null>(null)
  const [fileURL, setFileURL]     = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError]   = useState<string | null>(null)
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null)
  const [ocrModel,   setOcrModel]   = useState<string | null>(null)
  // State codes (2-digit GST format) drive intra/inter-state GST split. Both
  // sides feed through normalizeStateCode() so a vendor's "27" can be
  // compared to a location's "Maharashtra" cleanly.
  const [vendorState, setVendorState]   = useState('')   // vendor.stateCode (already "27"-style)
  const [billToState, setBillToState]   = useState('')   // bill-to location.state (free-text name)

  // Suppresses the overriddenFields diff for the next render — set to true
  // immediately before any programmatic setValue() (auto-calc, OCR prefill,
  // item-master preset, etc.) so the system's own writes don't get reported
  // as user overrides. The effect resets it after one diff cycle.
  const isApplyingPreset = useRef(false)

  // OCR provenance tracking. ocrFields lists every form field that was
  // populated from OCR data (manual upload or n8n ingestion). ocrOriginalValues
  // captures the exact value extracted by OCR so subsequent user edits flip the
  // field into overriddenFields. The indicator next to each tracked label
  // reads both Sets to pick scan-icon (teal) vs edit-icon (amber).
  const [ocrFields, setOcrFields]                     = useState<Set<string>>(new Set())
  const [ocrOriginalValues, setOcrOriginalValues]     = useState<Record<string, unknown>>({})
  const [overriddenFields, setOverriddenFields]       = useState<Set<string>>(new Set())
  // Per-field OCR confidence (0..100). Populated from editInvoice.ocrConfidenceMap
  // on edit-mode hydration; manual OCR run uses overallConfidence as a fallback.
  const [ocrFieldConfidence, setOcrFieldConfidence]   = useState<Record<string, number>>({})
  // Alternative OCR reads per field (e.g. n8n "suggestions"). When non-empty,
  // a "{N} nearest OCR reads ›" expandable surfaces below the input.
  const [ocrSuggestions, setOcrSuggestions]           = useState<Record<string, string[]>>({})
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set())
  // Section D (Retention) collapses by default — most invoices don't use it.
  // Section F (JV Preview) starts expanded since reviewers need to confirm it.
  const [retentionOpen, setRetentionOpen] = useState(false)
  const [jvOpen, setJvOpen]               = useState(true)

  // Per-line item-master match results (response from POST /api/items/match).
  // Keyed by line index so the cell renderer can fetch its own row's match
  // without re-running the matcher. `autoSelected` = true means the matcher's
  // best candidate was already pushed into the Item dropdown for the user.
  const [itemMatches, setItemMatches]               = useState<Record<number, ItemMatchUI>>({})
  const [expandedItemMatch, setExpandedItemMatch]   = useState<Set<number>>(new Set())

  // Manage object URL lifecycle to avoid leaks
  useEffect(() => {
    if (!file) { setFileURL(null); return }
    const url = URL.createObjectURL(file)
    setFileURL(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // ── Edit-mode load ────────────────────────────────────────────────────────
  const { data: editInvoice, isLoading: loadingInv } = useQuery({
    queryKey: ['invoices', id],
    queryFn:  () => http.get<any>(`/api/invoices/${id}`),
    enabled:  isEdit,
    staleTime: 0,
  })

  // Fuzzy duplicate check — on-demand re-run on edit so any new candidates
  // appearing after ingestion still surface in the banner. The endpoint is
  // cheap (one indexed findMany, in-memory rules) so 30s staleTime is fine.
  const { data: duplicateCheck } = useQuery({
    queryKey: ['invoice-duplicate-check', id],
    queryFn:  () => http.get<{ isDuplicate: boolean; isSuspicious: boolean; matches: unknown[] }>(`/api/invoices/${id}/duplicate-check`),
    enabled:  isEdit,
    staleTime: 30_000,
  })

  // Banner data resolution. Prefer the live re-check; fall back to the
  // persisted snapshot stored on the invoice at ingestion time (the LLM/
  // scorer pipeline runs duplicate-detector and writes duplicateMatches +
  // duplicateFlag to the row, so even if the on-load rules don't fire we
  // still surface what the system originally caught).
  const duplicateBannerData: DuplicateCheckUI | null = useMemo(() => {
    const liveMatches = (duplicateCheck && Array.isArray(duplicateCheck.matches)) ? duplicateCheck.matches : []
    if (liveMatches.length > 0) {
      return {
        isDuplicate:  !!duplicateCheck?.isDuplicate,
        isSuspicious: !!duplicateCheck?.isSuspicious,
        matches:      liveMatches as DuplicateMatchUI[],
      }
    }
    const persisted = editInvoice?.duplicateMatches
    if (Array.isArray(persisted) && persisted.length > 0) {
      return {
        isDuplicate:  editInvoice?.duplicateFlag === 'EXACT',
        isSuspicious: !!editInvoice?.duplicateFlag && editInvoice.duplicateFlag !== 'EXACT',
        matches:      persisted as DuplicateMatchUI[],
      }
    }
    return null
  }, [duplicateCheck, editInvoice])

  // EMAIL-ingested invoices have no PO; surface the clean A→F layout (no PO ref,
  // no header cost centre / GL code, no channel selector). PO-backed edits keep
  // the original fields visible so the user can review the linked PO ref.
  const isDirectLayout = mode === 'direct' || (mode === 'edit' && !editInvoice?.isPOInvoice)

  // Review-mode read-only gating. Bare /:id (no /edit) on a terminal or
  // in-workflow status renders the same A→F layout with all controls disabled
  // and submit hidden. /:id/edit always allows editing.
  const READ_ONLY_STATUSES = new Set([
    'SUBMITTED', 'PENDING_L1', 'PENDING_L2',
    'APPROVED', 'PAID', 'PAYMENT_INITIATED', 'REJECTED',
  ])
  const isReadOnly = isEdit && !isExplicitEdit
    && !!editInvoice?.status
    && READ_ONLY_STATUSES.has(String(editInvoice.status))

  // ── Reference data ────────────────────────────────────────────────────────
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn:  () => http.get<any>('/auth/me'),
    staleTime: 5 * 60_000,
  })
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-list'],
    queryFn:  () => http.get<any>('/api/masters/vendors').then(toArray),
    staleTime: 5 * 60_000,
  })
  const { data: entities = [] } = useQuery({
    queryKey: ['entities-list'],
    queryFn:  () => http.get<any>('/api/masters/entities').then(toArray),
    staleTime: 5 * 60_000,
  })
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn:  () => http.get<any>('/api/masters/departments').then(toArray),
    staleTime: 5 * 60_000,
  })
  const { data: locations = [] } = useQuery({
    queryKey: ['locations-list'],
    queryFn:  () => http.get<any>('/api/masters/locations').then(toArray),
    staleTime: 5 * 60_000,
  })
  const { data: glCodes = [] } = useQuery({
    queryKey: ['gl-codes-list'],
    queryFn:  () => http.get<any>('/api/masters/gl-codes').then(toArray),
    staleTime: 5 * 60_000,
  })
  const { data: costCentres = [] } = useQuery({
    queryKey: ['cost-centres-list'],
    queryFn:  () => http.get<any>('/api/masters/cost-centres').then(toArray),
    staleTime: 5 * 60_000,
  })
  const { data: items = [] } = useQuery({
    queryKey: ['items-list'],
    queryFn:  () => http.get<any>('/api/masters/items').then(toArray),
    staleTime: 5 * 60_000,
  })
  // Needed for the line-item Item-master auto-fill: items reference TDS via
  // tdsSectionId (FK) — we resolve the actual rate from defaultRate here.
  const { data: tdsSections = [] } = useQuery({
    queryKey: ['tds-sections-list'],
    queryFn:  () => http.get<any>('/api/masters/tds-sections').then(toArray),
    staleTime: 5 * 60_000,
  })

  // ── Form ──────────────────────────────────────────────────────────────────
  const { register, control, handleSubmit, setValue, getValues, reset, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        channelType:  'MANUAL_UPLOAD',
        currencyCode: 'INR',
        lines: [emptyLine()],
        retentionRequired: false,
      },
    })

  const { fields, append, remove, update, replace } = useFieldArray({ control, name: 'lines' })
  const lines        = useWatch({ control, name: 'lines' }) ?? []
  const vendorId     = useWatch({ control, name: 'vendorId' })
  const entityId     = useWatch({ control, name: 'entityId' })
  const invoiceDate  = useWatch({ control, name: 'invoiceDate' })
  const currencyCode = useWatch({ control, name: 'currencyCode' }) || 'INR'
  const retentionOn  = useWatch({ control, name: 'retentionRequired' }) ?? false

  const totals         = recalcTotals(lines)
  const selectedVendor = useMemo(() => (vendors as any[]).find((v: any) => v.id === vendorId), [vendorId, vendors])

  // Add (or refresh) OCR-source entries. The "key" matches what
  // OcrFieldIndicator uses: header fields use the form path directly
  // ("invoiceNumber"); line-item fields use the user-spec key shape
  // "line_{i}_{field}". `keyToFormPath` below maps back to an RHF path.
  const markOcrFields = useCallback((entries: Record<string, unknown>) => {
    setOcrFields(prev => {
      const next = new Set(prev)
      for (const k of Object.keys(entries)) next.add(k)
      return next
    })
    setOcrOriginalValues(prev => ({ ...prev, ...entries }))
  }, [])

  // Map a tracking key to an RHF form path (dot-separated). Header keys are
  // identical; line keys "line_3_description" → "lines.3.description".
  const keyToFormPath = (key: string): string => {
    const m = key.match(/^line_(\d+)_(.+)$/)
    return m ? `lines.${m[1]}.${m[2]}` : key
  }

  // Maintain overriddenFields by watching the entire form and diffing each
  // tracked field's current value against the captured OCR original. Empty
  // string vs nullish is treated as equal so a placeholder dropdown reset
  // doesn't appear as an override.
  const watchedAll = useWatch({ control })
  useEffect(() => {
    // System-initiated change (auto-calc, OCR prefill, item preset) just
    // landed in the form — don't flag it as a user override. Clear the flag
    // so the next genuine user edit diffs normally.
    if (isApplyingPreset.current) {
      isApplyingPreset.current = false
      return
    }
    if (ocrFields.size === 0) {
      if (overriddenFields.size > 0) setOverriddenFields(new Set())
      return
    }
    const next = new Set<string>()
    const resolve = (obj: any, path: string): unknown =>
      path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj)
    for (const key of ocrFields) {
      const cur  = resolve(watchedAll, keyToFormPath(key))
      const orig = ocrOriginalValues[key]
      const blank = (v: unknown) => v === '' || v == null
      const numericallyEqual = typeof cur === 'number' && typeof orig === 'number' && Math.abs(cur - orig) < 1e-9
      const equal = Object.is(cur, orig)
        || (blank(cur) && blank(orig))
        || numericallyEqual
      if (!equal) next.add(key)
    }
    // Skip setState when the membership is unchanged — avoids a re-render loop.
    if (next.size !== overriddenFields.size || [...next].some(k => !overriddenFields.has(k))) {
      setOverriddenFields(next)
    }
  }, [watchedAll, ocrFields, ocrOriginalValues, overriddenFields])

  // Closure helpers — capture the three OCR Sets so the JSX call-sites stay
  // tight. Each tracked field gets: indicator + edited badge in the label,
  // override hint below the input, and a thin amber border via inputCls.
  const indicator    = (key: string) => (
    <OcrFieldIndicator
      fieldKey={key}
      ocrFields={ocrFields}
      overriddenFields={overriddenFields}
      ocrOriginalValues={ocrOriginalValues}
      ocrFieldConfidence={ocrFieldConfidence}
    />
  )
  const editedBadge  = (key: string) => (
    <EditedBadge fieldKey={key} overriddenFields={overriddenFields} />
  )
  const overrideHint = (key: string) => (
    <OcrOverrideHint fieldKey={key} overriddenFields={overriddenFields} ocrOriginalValues={ocrOriginalValues} />
  )

  // "{N} nearest OCR reads ›" expandable. Renders only when the field has
  // ocrSuggestions entries. Clicking a chip fills the input via setValue —
  // RHF's setValue triggers the diff effect that toggles overriddenFields.
  const suggestionsBlock = (key: string) => {
    const list = ocrSuggestions[key]
    if (!list || list.length === 0) return null
    const expanded = expandedSuggestions.has(key)
    return (
      <div className="mt-1">
        <button
          type="button"
          onClick={() => setExpandedSuggestions(prev => {
            const next = new Set(prev)
            if (expanded) next.delete(key); else next.add(key)
            return next
          })}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 rotate-45" />
          {list.length} nearest OCR read{list.length === 1 ? '' : 's'} {expanded ? '▾' : '›'}
        </button>
        {expanded && (
          <div className="mt-1 flex flex-wrap gap-1">
            {list.map((alt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setValue(key as never, alt as never, { shouldDirty: true })}
                className="rounded-full border border-input bg-background px-2 py-0.5 text-[11px] hover:bg-muted font-mono"
              >
                {alt}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
  // Apply this className alongside the FormInput/FormSelect default so the
  // input border + bg shift when the reviewer overrides an OCR value.
  const overrideInputCls = (key: string) =>
    overriddenFields.has(key) ? 'border-amber-700/60 bg-amber-50/40' : ''

  // Edit-mode hydration — populate form values + OCR banner once the invoice
  // detail query resolves. Guarded with a ref so user edits aren't clobbered by
  // a refetch of the same invoice id. Date fields come back as ISO strings; the
  // <input type="date"> wants YYYY-MM-DD so we slice off the time portion.
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (!isEdit || !editInvoice || hydratedRef.current) return
    const isoDate = (d: string | null | undefined) => (typeof d === 'string' ? d.slice(0, 10) : undefined)
    reset({
      entityId:           editInvoice.entityId         ?? '',
      departmentId:       editInvoice.departmentId     ?? '',
      vendorId:           editInvoice.vendorId         ?? '',
      vendorGSTIN:        editInvoice.vendorGSTIN      ?? '',
      vendorPAN:          editInvoice.vendorPAN        ?? '',
      billToLocationId:   editInvoice.billToLocationId ?? '',
      invoiceNumber:      editInvoice.invoiceNumber    ?? '',
      invoiceDate:        isoDate(editInvoice.invoiceDate) ?? '',
      dueDate:            isoDate(editInvoice.dueDate),
      channelType:        editInvoice.channelType      ?? 'MANUAL_UPLOAD',
      currencyCode:       editInvoice.currencyCode     ?? 'INR',
      poRef:              editInvoice.poRef            ?? '',
      irnNumber:          editInvoice.irnNumber        ?? '',
      costCentreId:       editInvoice.costCentreId     ?? '',
      glCodeId:           editInvoice.glCodeId         ?? '',
      baseAmount:         Number(editInvoice.taxableAmount) || 0,
      // Gross fallback — for invoices ingested before the n8n mapper learned
      // to compute base+tax when grossAmount was 0. Sum the line GSTs as a
      // backup so the cross-check banner doesn't fire on legacy rows.
      grossAmount:
        (Number(editInvoice.totalAmount) || 0) > 0
          ? Number(editInvoice.totalAmount)
          : (Number(editInvoice.taxableAmount) || 0) +
            (Array.isArray(editInvoice.lines)
              ? editInvoice.lines.reduce(
                  (s: number, l: any) =>
                    s + (Number(l.cgstAmount) || 0) + (Number(l.sgstAmount) || 0) + (Number(l.igstAmount) || 0),
                  0,
                )
              : 0),
      narration:          editInvoice.narration  ?? '',
      periodFrom:         isoDate(editInvoice.periodFrom),
      periodTo:           isoDate(editInvoice.periodTo),
      retentionRequired:  !!editInvoice.retentionRequired,
      retentionAmount:    Number(editInvoice.retentionAmount) || 0,
      retentionGlCodeId:  editInvoice.retentionGlCodeId ?? '',
      lines: Array.isArray(editInvoice.lines) && editInvoice.lines.length > 0
        ? editInvoice.lines.map((l: any) => ({
            itemId:         l.itemId         ?? undefined,
            itemCode:       l.itemCode       ?? undefined,
            description:    l.description    ?? '',
            quantity:       Number(l.quantity)       || 0,
            uom:            l.uom            ?? undefined,
            unitPrice:      Number(l.unitPrice)      || 0,
            discountPct:    Number(l.discountPct)    || 0,
            discountAmount: Number(l.discountAmount) || 0,
            taxableAmount:  Number(l.taxableAmount)  || 0,
            gstRate:        Number(l.gstRate)        || 0,
            cgstAmount:     Number(l.cgstAmount)     || 0,
            sgstAmount:     Number(l.sgstAmount)     || 0,
            igstAmount:     Number(l.igstAmount)     || 0,
            tdsRate:        Number(l.tdsRate)        || 0,
            tdsAmount:      Number(l.tdsAmount)      || 0,
            rcmApplicable:  !!l.rcmApplicable,
            hsnCode:        l.hsnCode        ?? undefined,
            sacCode:        l.sacCode        ?? undefined,
            glCodeId:       l.glCodeId       ?? undefined,
            costCentreId:   l.costCentreId   ?? undefined,
            profitCentreId: l.profitCentreId ?? undefined,
            lineTotal:      Number(l.lineTotal)      || 0,
          }))
        : [emptyLine()],
    })
    if (typeof editInvoice.ocrConfidence === 'number') {
      setOcrConfidence(editInvoice.ocrConfidence)
    }

    // OCR provenance: when the invoice came in via email (channelType=EMAIL)
    // or carries any OCR confidence, treat the persisted fields as the OCR
    // originals so the scan-icon shows next to each tracked label. The diff
    // effect above will flip them to overridden once the user edits.
    const wasOcrSourced =
      editInvoice.channelType === 'EMAIL'
      || (typeof editInvoice.ocrConfidence === 'number' && editInvoice.ocrConfidence > 0)

    if (wasOcrSourced) {
      const isoStrOrEmpty = (d: string | null | undefined) => (typeof d === 'string' ? d.slice(0, 10) : '')
      const headerOrig: Record<string, unknown> = {
        invoiceNumber: editInvoice.invoiceNumber ?? '',
        invoiceDate:   isoStrOrEmpty(editInvoice.invoiceDate),
        dueDate:       isoStrOrEmpty(editInvoice.dueDate),
        vendorId:      editInvoice.vendorId    ?? '',
        vendorGSTIN:   editInvoice.vendorGSTIN ?? '',
        vendorPAN:     editInvoice.vendorPAN   ?? '',
        irnNumber:     editInvoice.irnNumber   ?? '',
        currencyCode:  editInvoice.currencyCode ?? 'INR',
        baseAmount:    Number(editInvoice.taxableAmount) || 0,
        grossAmount:   Number(editInvoice.totalAmount)   || 0,
        narration:     editInvoice.narration   ?? '',
        periodFrom:    isoStrOrEmpty(editInvoice.periodFrom),
        periodTo:      isoStrOrEmpty(editInvoice.periodTo),
      }
      const lineOrig: Record<string, unknown> = {}
      if (Array.isArray(editInvoice.lines)) {
        editInvoice.lines.forEach((l: any, i: number) => {
          lineOrig[`line_${i}_description`] = l.description       ?? ''
          lineOrig[`line_${i}_quantity`]    = Number(l.quantity)  || 0
          lineOrig[`line_${i}_unitPrice`]   = Number(l.unitPrice) || 0
          lineOrig[`line_${i}_gstRate`]     = Number(l.gstRate)   || 0
        })
      }
      markOcrFields({ ...headerOrig, ...lineOrig })

      // Per-field confidence — keys may match form paths directly (preferred)
      // or be normalised camelCase variants. We accept any non-null number
      // and store as 0..100 (Invoice scorer writes 0..1 floats, OCR providers
      // sometimes write 0..100 ints).
      const confMap = (editInvoice.ocrConfidenceMap ?? {}) as Record<string, unknown>
      const conf: Record<string, number> = {}
      for (const [k, v] of Object.entries(confMap)) {
        const num = typeof v === 'number' ? v : Number(v)
        if (!Number.isFinite(num)) continue
        conf[k] = num <= 1 ? Math.round(num * 100) : Math.round(num)
      }
      if (Object.keys(conf).length > 0) setOcrFieldConfidence(prev => ({ ...prev, ...conf }))

      // Suggestions per field — n8n payload writes
      // ocrRawData.suggestions: Record<string, string[]>. Manual OCR may add
      // alternatives via Gemini. When empty, the expandable stays hidden.
      const rawSugg = (editInvoice.ocrRawData as { suggestions?: Record<string, string[]> } | null)?.suggestions
      if (rawSugg && typeof rawSugg === 'object') {
        const cleaned: Record<string, string[]> = {}
        for (const [k, arr] of Object.entries(rawSugg)) {
          if (Array.isArray(arr) && arr.length > 0) cleaned[k] = arr.map(String).filter(Boolean)
        }
        if (Object.keys(cleaned).length > 0) setOcrSuggestions(prev => ({ ...prev, ...cleaned }))
      }
    }

    hydratedRef.current = true
  }, [isEdit, editInvoice, reset, markOcrFields])

  // Open POs for PO mode — only fires when vendor + entity are picked. Reuses
  // GET /api/po with hasOpenValue=true so fully-consumed POs are pre-filtered.
  const { data: openPOs = [], isLoading: posLoading } = useQuery<POSummary[]>({
    queryKey: ['po-list-for-invoice', vendorId, entityId],
    queryFn:  () => http.get<POSummary[]>(`/api/po?vendorId=${vendorId}&entityId=${entityId}&status=APPROVED&hasOpenValue=true`),
    enabled:  mode === 'po' && !!vendorId && !!entityId,
    staleTime: 30_000,
  })
  const selectedPo  = useMemo(() => (openPOs ?? []).find(p => p.id === selectedPoId) ?? null, [openPOs, selectedPoId])
  const triggersL2  = mode === 'direct' && (Number(totals.totalAmount) || 0) > L2_THRESHOLD

  // Auto-populate entity + department from /auth/me. Two passes:
  // (1) immediate — fires as soon as currentUser resolves
  // (2) retry — fires again once entities/departments dropdown options are
  //     loaded, because <select> may discard a value that doesn't match any
  //     option present at render time.
  // Only fills blank fields so the user can still override.
  useEffect(() => {
    if (currentUser?.entityId && !getValues('entityId')) {
      setValue('entityId', currentUser.entityId)
    }
    if (currentUser?.departmentId && !getValues('departmentId')) {
      setValue('departmentId', currentUser.departmentId)
    }
  }, [currentUser?.entityId, currentUser?.departmentId, getValues, setValue])

  useEffect(() => {
    if (!currentUser) return
    if (currentUser.entityId && !getValues('entityId') && (entities as any[]).length > 0) {
      setValue('entityId', currentUser.entityId, { shouldDirty: false })
    }
    if (currentUser.departmentId && !getValues('departmentId') && (departments as any[]).length > 0) {
      setValue('departmentId', currentUser.departmentId, { shouldDirty: false })
    }
  }, [currentUser, entities, departments, getValues, setValue])

  // Keep vendorState in sync with selected vendor (for GST interstate calc) + GSTIN auto-fill.
  // PAN is intentionally NOT set here — a separate effect derives it from the
  // GSTIN via panFromGstin so PAN stays consistent if the user picks a
  // different GSTIN registration in the dropdown.
  useEffect(() => {
    if (selectedVendor) {
      setValue('vendorGSTIN', selectedVendor.gstin ?? '')
      setVendorState(selectedVendor.stateCode ?? selectedVendor.state ?? '')
    } else {
      setValue('vendorGSTIN', '')
      setVendorState('')
    }
  }, [selectedVendor?.id, setValue])

  // PAN derives from chars 3-12 of the currently-selected GSTIN. Keeps PAN in
  // sync when the user picks a different registration from the multi-GSTIN
  // dropdown. Falls back to the vendor master's `pan` when GSTIN is too short
  // / not yet selected.
  const vendorGstinWatch = useWatch({ control, name: 'vendorGSTIN' })
  useEffect(() => {
    const derived = panFromGstin(vendorGstinWatch ?? '')
    // PAN auto-derive is a system write, not a user edit — flag it so the
    // override diff skips this transition.
    isApplyingPreset.current = true
    if (derived) setValue('vendorPAN', derived)
    else if (selectedVendor?.pan) setValue('vendorPAN', selectedVendor.pan)
    else setValue('vendorPAN', '')
  }, [vendorGstinWatch, selectedVendor?.pan, setValue])

  // Keep billToState in sync with the selected bill-to location. The GST
  // split is driven by VENDOR state vs BILL-TO state (not entity state) per
  // the India GST regime — so the line recalc depends on this value.
  const billToLocationIdWatch = useWatch({ control, name: 'billToLocationId' })
  useEffect(() => {
    const loc = (locations as any[]).find((x: any) => x.id === billToLocationIdWatch)
    setBillToState(loc?.state ?? '')
  }, [billToLocationIdWatch, locations])

  // Vendor TDS fallback per line — when a vendor with a configured TDS rate
  // is selected, push that rate onto any line that has no item-specific
  // override and no rate yet. Item-level rate (via applyItemPreset) wins
  // when an item is later picked; this just keeps the default sensible.
  useEffect(() => {
    if (!selectedVendor) return
    const vendorTdsRate = Number(selectedVendor.tdsRate) || 0
    if (vendorTdsRate <= 0) return
    const currentLines = (getValues('lines') as LineItem[] | undefined) ?? []
    let changed = false
    currentLines.forEach((l, i) => {
      if (!l.itemId && (!l.tdsRate || Number(l.tdsRate) === 0)) {
        isApplyingPreset.current = true
        setValue(`lines.${i}.tdsRate`, vendorTdsRate)
        const next = { ...l, tdsRate: vendorTdsRate }
        update(i, recalcLine(next, vendorState, billToState))
        changed = true
      }
    })
    if (!changed) { /* no-op so the lint deps stay honest */ }
  }, [selectedVendor, getValues, setValue, update, vendorState, billToState])

  // Auto-calc due date: invoiceDate + vendor.paymentTerms. Only fires when
  // dueDate is currently blank — preserves any value set by OCR or the user.
  // The isApplyingPreset flag tells the diff effect this is a system write,
  // so the chip doesn't flip to "Manually overridden".
  useEffect(() => {
    if (!invoiceDate || !selectedVendor?.paymentTerms) return
    const existing = getValues('dueDate')
    if (existing && String(existing).trim().length > 0) return
    const d = new Date(invoiceDate)
    if (isNaN(d.getTime())) return
    d.setDate(d.getDate() + Number(selectedVendor.paymentTerms))
    isApplyingPreset.current = true
    setValue('dueDate', d.toISOString().split('T')[0])
  }, [invoiceDate, selectedVendor?.id, setValue, getValues])

  // Line-level OCR icon — overlay placed top-right of the cell. Co-exists with
  // the existing "auto" badge in the GST/TDS cells (which uses middle-right).
  const lineOcrIcon = useCallback((idx: number, field: string) => {
    const key = `line_${idx}_${field}`
    if (overriddenFields.has(key)) {
      return (
        <span title="Manually overridden" className="pointer-events-none absolute right-1 top-0.5 inline-flex">
          <Edit3 className="h-3 w-3 text-amber-600" />
        </span>
      )
    }
    if (ocrFields.has(key)) {
      return (
        <span title="From OCR · click to override" className="pointer-events-none absolute right-1 top-0.5 inline-flex">
          <ScanLine className="h-3 w-3 text-teal-600" />
        </span>
      )
    }
    return null
  }, [ocrFields, overriddenFields])

  // Recalc a line whenever qty/price/rate changes. Reads from getValues()
  // (not the lagging useWatch snapshot) so an onChange handler that calls
  // recalc immediately after setValue sees the latest qty/rate.
  const recalc = useCallback((idx: number) => {
    const l = getValues(`lines.${idx}`)
    if (!l) return
    update(idx, recalcLine(l as LineItem, vendorState, billToState))
  }, [getValues, vendorState, billToState, update])

  // Item-master auto-fill: when the user picks an Item from the line dropdown,
  // pull gstRate, tdsRate (via tdsSectionId → defaultRate), hsn/sac, uom,
  // description, rcmApplicable onto the line, then run recalcLine so GST/TDS
  // amounts populate immediately. Manual overrides remain possible — the
  // user can still type a different GST% / TDS% after selection.
  const applyItemPreset = useCallback((idx: number, itemId: string) => {
    if (!itemId) return
    const it = (items as any[]).find((x: any) => x.id === itemId)
    if (!it) return

    const current = (getValues(`lines.${idx}`) as LineItem | undefined) ?? emptyLine()
    const section = (tdsSections as any[]).find((s: any) => s.id === it.tdsSectionId)
    // TDS rate resolution — prefer item-level, fall back to vendor-level so
    // services without an item-specific section still pick up the standard
    // vendor TDS (e.g. vendor.tdsRate = 2% for 194C).
    const itemTdsRate   = section ? Number(section.defaultRate) || 0 : 0
    const vendorTdsRate = Number(selectedVendor?.tdsRate) || 0
    const tdsRate       = itemTdsRate > 0 ? itemTdsRate : vendorTdsRate

    const next: LineItem = {
      ...current,
      itemId,
      itemCode:      it.itemCode ?? current.itemCode,
      description:   current.description || it.name || '',
      uom:           current.uom        || it.uom  || undefined,
      hsnCode:       it.hsnCode  ?? current.hsnCode,
      sacCode:       it.sacCode  ?? current.sacCode,
      gstRate:       Number(it.gstRate) || 0,
      tdsRate,
      rcmApplicable: it.rcmApplicable ?? current.rcmApplicable ?? false,
    }
    isApplyingPreset.current = true
    update(idx, recalcLine(next, vendorState, billToState))
  }, [items, tdsSections, vendorState, billToState, selectedVendor?.tdsRate, getValues, update])

  // Item-master fuzzy match — runs after OCR populates line descriptions.
  // POSTs the descriptions to /api/items/match, then for each line:
  //   • autoSelect === true (confidence ≥ 0.85)  → write itemId into the form
  //     and call applyItemPreset() so gstRate/tdsRate/HSN populate too.
  //   • else                                       → stash matches so the cell
  //     can render "Review match · N suggestions".
  // Failures are silent — matching is a nice-to-have, not blocking.
  const runItemMatching = useCallback(async (rows: Array<{ idx: number; description: string }>) => {
    const filtered = rows.filter(r => r.description && r.description.trim().length > 0)
    if (filtered.length === 0) return
    // Loading pill while the matcher runs — dismissed on both success and
    // error so the user always sees a state change.
    const matchToastId = toast.loading('Matching items…')
    try {
      const results = await http.post<Array<{
        inputDescription: string
        matches: ItemMatchEntry[]
        bestMatch: ItemMatchEntry | null
        autoSelect: boolean
      }>>('/api/items/match', { descriptions: filtered.map(r => r.description) })

      const next: Record<number, ItemMatchUI> = {}
      results.forEach((res, i) => {
        const idx          = filtered[i].idx
        const autoSelected = !!res.autoSelect && !!res.bestMatch
        next[idx] = { ...res, autoSelected }
        if (autoSelected && res.bestMatch) {
          const b = res.bestMatch
          isApplyingPreset.current = true
          setValue(`lines.${idx}.itemId`, b.itemId, { shouldDirty: false })
          applyItemPreset(idx, b.itemId)
          // Default GL + CC come back as codes (not ids) from the match
          // endpoint — resolve via the local masters so we can write the id
          // into the form.
          if (b.defaultGlCode) {
            const gl = (glCodes as any[]).find((g: any) => g.code === b.defaultGlCode)
            if (gl) { isApplyingPreset.current = true; setValue(`lines.${idx}.glCodeId`, gl.id, { shouldDirty: false }) }
          }
          if (b.defaultCostCentre) {
            const cc = (costCentres as any[]).find((c: any) => c.code === b.defaultCostCentre)
            if (cc) { isApplyingPreset.current = true; setValue(`lines.${idx}.costCentreId`, cc.id, { shouldDirty: false }) }
          }
        }
      })
      setItemMatches(prev => ({ ...prev, ...next }))
      toast.dismiss(matchToastId)
    } catch {
      // Non-blocking — let the user pick manually. Surface the failure so
      // they know auto-match didn't run.
      toast.error('Item matching unavailable', { id: matchToastId })
    }
  }, [setValue, glCodes, costCentres, applyItemPreset])

  // For edit-mode OCR-sourced invoices: once the persisted lines hydrate,
  // fuzzy-match any line that has a description but no itemId. Same matcher
  // the manual OCR path runs after extraction — keeps behaviour consistent
  // regardless of channel (manual upload vs email/n8n ingest).
  const matchTriggeredRef = useRef(false)
  useEffect(() => {
    if (!editInvoice || matchTriggeredRef.current) return
    if (!Array.isArray(editInvoice.lines)) return
    const wasOcrSourced =
      editInvoice.channelType === 'EMAIL'
      || (typeof editInvoice.ocrConfidence === 'number' && editInvoice.ocrConfidence > 0)
    if (!wasOcrSourced) return
    const toMatch = editInvoice.lines
      .map((l: any, i: number) => ({ idx: i, description: l.description ?? '', hasItem: !!l.itemId }))
      .filter((r: { hasItem: boolean; description: string }) => !r.hasItem && r.description.trim().length > 0)
      .map((r: { idx: number; description: string }) => ({ idx: r.idx, description: r.description }))
    if (toMatch.length === 0) return
    matchTriggeredRef.current = true
    runItemMatching(toMatch)
  }, [editInvoice, runItemMatching])

  // GL / CC resolvers for the JV preview
  const glLabel = useCallback((glId?: string) => {
    if (!glId) return '—'
    const g = (glCodes as any[]).find((x: any) => x.id === glId)
    return g ? g.code ?? glId : glId
  }, [glCodes])
  const glName = useCallback((glId?: string) => {
    if (!glId) return ''
    const g = (glCodes as any[]).find((x: any) => x.id === glId)
    return g?.name ?? ''
  }, [glCodes])
  const ccName = useCallback((ccId?: string) => {
    if (!ccId) return null
    const c = (costCentres as any[]).find((x: any) => x.id === ccId)
    return c ? (c.code ?? c.name) : null
  }, [costCentres])

  // Watch retention so the F-section JV builder re-runs when it changes.
  const retentionAmountWatch = useWatch({ control, name: 'retentionAmount' }) ?? 0
  const baseAmountWatch      = useWatch({ control, name: 'baseAmount'      }) ?? 0
  const grossAmountWatch     = useWatch({ control, name: 'grossAmount'     }) ?? 0

  // ── OCR extract ───────────────────────────────────────────────────────────
  const runOcr = useCallback(async () => {
    if (!file) return
    setOcrLoading(true)
    setOcrError(null)
    setOcrModel(null)
    // Sonner returns the toast id so we can dismiss the "loading" pill once
    // OCR finishes — success / error toasts replace it.
    const ocrToastId = toast.loading('Extracting data from invoice…')
    try {
      const base64Data = await fileToBase64(file)
      const res        = await http.post<{ ocr: any; matchedVendorId: string | null }>(
        '/api/invoices/ocr-extract',
        { base64Data, mimeType: file.type },
      )
      const { ocr, matchedVendorId } = res
      // Header fields that arrive from OCR — store both the form value and the
      // OCR original so OcrFieldIndicator can flip teal → amber on override.
      const ocrOriginals: Record<string, unknown> = {}
      if (ocr.invoiceNumber) { setValue('invoiceNumber', ocr.invoiceNumber); ocrOriginals.invoiceNumber = ocr.invoiceNumber }
      const invIso = dmyToIso(ocr.invoiceDate); if (invIso) { setValue('invoiceDate', invIso); ocrOriginals.invoiceDate = invIso }
      const dueIso = dmyToIso(ocr.dueDate);     if (dueIso) { setValue('dueDate', dueIso);       ocrOriginals.dueDate = dueIso }
      if (matchedVendorId)   { setValue('vendorId', matchedVendorId); ocrOriginals.vendorId = matchedVendorId }
      if (ocr.vendorGstin)   { setValue('vendorGSTIN', ocr.vendorGstin); ocrOriginals.vendorGSTIN = ocr.vendorGstin }
      if (ocr.vendorPan)     { setValue('vendorPAN', ocr.vendorPan);     ocrOriginals.vendorPAN   = ocr.vendorPan }
      if (ocr.irn)           { setValue('irnNumber', ocr.irn);           ocrOriginals.irnNumber   = ocr.irn }
      if (ocr.poReference)   { setValue('poRef', ocr.poReference) }

      // Resolve bill-to LOCATION from Place of Supply / buyer GSTIN. The OCR
      // returns "placeOfSupply" verbatim (e.g. "Maharashtra (27)") plus the
      // buyer's GSTIN; either source can yield the 2-digit state code which
      // we then match against locations.state.
      const supplyCode = normalizeStateCode(ocr.placeOfSupply)
        || (typeof ocr.buyerGstin === 'string' && ocr.buyerGstin.length >= 2
              ? ocr.buyerGstin.slice(0, 2)
              : '')
      if (supplyCode) {
        const wantName = STATE_CODE_TO_NAME[supplyCode]?.toLowerCase()
        const match = (locations as any[]).find((l: any) =>
          normalizeStateCode(l.state) === supplyCode
          || (wantName && String(l.state ?? '').toLowerCase() === wantName),
        )
        if (match && !getValues('billToLocationId')) {
          setValue('billToLocationId', match.id)
          ocrOriginals.billToLocationId = match.id
        }
      }

      // Resolve ENTITY from buyer GSTIN (exact match) or buyer name (fuzzy
      // substring). Only fills when the user hasn't already picked one — we
      // never override an explicit choice.
      if (!getValues('entityId')) {
        let entityMatch: any | null = null
        if (ocr.buyerGstin) {
          entityMatch = (entities as any[]).find((e: any) => e.gstin && String(e.gstin).toUpperCase() === String(ocr.buyerGstin).toUpperCase()) ?? null
        }
        if (!entityMatch && ocr.buyerName) {
          const lc = String(ocr.buyerName).toLowerCase()
          entityMatch = (entities as any[]).find((e: any) => {
            const en = String(e.name ?? '').toLowerCase()
            if (!en) return false
            return en === lc || lc.includes(en) || en.includes(lc)
          }) ?? null
        }
        if (entityMatch) {
          setValue('entityId', entityMatch.id)
          ocrOriginals.entityId = entityMatch.id
        }
      }

      // Snap a noisy OCR qty (e.g. "1.0007") to the nearest integer when it's
      // within 0.05 — Gemini occasionally reads "1 Month" as a non-integer
      // and the line total ends up "₹1,25,087.50" instead of "₹1,25,000".
      // Outside the tolerance, keep up to 3 decimal places.
      const snapQty = (raw: unknown): number => {
        const n = Number(raw)
        if (!Number.isFinite(n) || n <= 0) return 1
        const r = Math.round(n)
        if (Math.abs(n - r) < 0.05) return Math.max(1, r)
        return Math.max(0.001, Math.round(n * 1000) / 1000)
      }
      if (ocr.lineItems?.length) {
        replace(ocr.lineItems.map((l: any) => recalcLine({
          ...emptyLine(),
          description: l.description ?? '',
          // Accept any of Gemini's possible qty field names; default to 1
          // when missing so per-line "Net" math doesn't show zero.
          quantity:    snapQty(l.quantity ?? l.qty ?? l.units ?? l.pieces ?? l.count),
          unitPrice:   Math.round((Number(l.unitPrice ?? l.rate ?? l.price) || 0) * 100) / 100,
          gstRate:     Number(l.gstRate)   || 0,
          discountPct: Number(l.discountPct ?? l.discount) || 0,
          hsnCode:     l.hsn ?? undefined,
        }, vendorState, billToState)))
        ocr.lineItems.forEach((l: any, i: number) => {
          const qty       = snapQty(l.quantity ?? l.qty ?? l.units ?? l.pieces ?? l.count)
          const unitPrice = Math.round((Number(l.unitPrice ?? l.rate ?? l.price) || 0) * 100) / 100
          ocrOriginals[`line_${i}_description`] = l.description ?? ''
          ocrOriginals[`line_${i}_quantity`]    = qty
          ocrOriginals[`line_${i}_unitPrice`]   = unitPrice
          ocrOriginals[`line_${i}_gstRate`]     = Number(l.gstRate) || 0
        })
      }

      // Header amount fields — OCR's `subtotal` maps to baseAmount and
      // `totalAmount` to grossAmount. When grossAmount is missing/0 but
      // subtotal + line GSTs are present, fall back to the computed sum so
      // the cross-check banner doesn't fire on every OCR'd invoice.
      const ocrBase  = Number(ocr.subtotal)    || 0
      const ocrCgst  = Number(ocr.cgst)        || 0
      const ocrSgst  = Number(ocr.sgst)        || 0
      const ocrIgst  = Number(ocr.igst)        || 0
      const ocrTax   = Number(ocr.totalTax)    || (ocrCgst + ocrSgst + ocrIgst)
      const ocrGross = Number(ocr.totalAmount) || 0
      if (ocrBase > 0)  { setValue('baseAmount', ocrBase);  ocrOriginals.baseAmount  = ocrBase  }
      const grossFinal = ocrGross > 0 ? ocrGross : (ocrBase + ocrTax)
      if (grossFinal > 0) { setValue('grossAmount', grossFinal); ocrOriginals.grossAmount = grossFinal }

      if (Object.keys(ocrOriginals).length > 0) markOcrFields(ocrOriginals)
      setOcrConfidence(ocr.overallConfidence ?? null)
      setOcrModel(ocr.model ?? null)

      // Fuzzy-match each OCR line description against the item master so the
      // form pre-selects items with high confidence (≥0.85) and surfaces
      // suggestions for the rest. Matches are stored per-line index.
      if (ocr.lineItems?.length) {
        await runItemMatching(
          ocr.lineItems.map((l: any, i: number) => ({ idx: i, description: l.description ?? '' })),
        )
      }
      toast.dismiss(ocrToastId)
    } catch (err: any) {
      // The backend now returns { code, message, detail, details, httpStatus }.
      // Prefer the detail (raw Gemini error string) — it's what an engineer
      // needs to debug. Fall back to message, then a generic.
      const apiError = err?.error
      const detail   = apiError?.detail || apiError?.message || err?.message
      const msg      = detail ?? 'OCR failed — Gemini returned no error message'
      setOcrError(msg)
      // Replace the loading pill with a red error toast carrying the actual reason.
      toast.error(`OCR extraction failed — ${msg}`, { id: ocrToastId })
    } finally {
      setOcrLoading(false)
    }
  }, [file, setValue, getValues, locations, entities, replace, vendorState, billToState, markOcrFields, runItemMatching])

  const dismissOcr = useCallback(() => {
    setOcrError(null)
    setOcrConfidence(null)
    setOcrModel(null)
  }, [])

  // Builds the create/update payload with file bytes attached for the create
  // path. fileBase64/fileMimeType/fileName get stripped by the update route
  // (it spreads `data` and Prisma ignores unknown keys via the route handler),
  // but we only attach for new invoices to avoid re-uploading on every edit.
  // PO mode also threads poRefs[] + matchType into the create payload so the
  // backend creates the InvoicePOLink rows + bumps PO.consumedAmount.
  const buildPayload = useCallback(async (data: FormValues) => {
    const base: Record<string, unknown> = { ...data, ...totals }
    if (!isEdit && file) {
      base.fileBase64   = await fileToBase64(file)
      base.fileMimeType = file.type
      base.fileName     = file.name
    }
    if (!isEdit && mode === 'po' && selectedPoId) {
      base.poRefs   = [{ poId: selectedPoId, consumptionType, invoiceAmount: Number(totals.totalAmount) || 0 }]
      base.matchType = matchType
    }
    return base
  }, [file, isEdit, totals, mode, selectedPoId, consumptionType, matchType])

  // Extracts a clean message from HttpError / Error / unknown so the toast
  // shows the server's actual reason ("Cannot submit invoice in PAID
  // status") rather than a generic "Request failed".
  const apiMsg = (err: unknown): string => {
    if (err instanceof HttpError) {
      return err.error.message ?? `Request failed (${err.error.status})`
    }
    if (err instanceof Error) return err.message
    return 'Request failed'
  }

  // Navigation is deferred 1.5s after a success toast so the user has time
  // to read the confirmation before the page transitions. Earlier behaviour
  // navigated synchronously and felt instantaneous to the point of looking
  // like nothing happened.
  const NAV_DELAY_MS = 1500

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveDraft = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = await buildPayload(data)
      return isEdit
        ? http.put<any>(`/api/invoices/${id}`, payload)
        : http.post<any>('/api/invoices', payload)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success(isEdit ? 'Invoice updated' : 'Draft saved successfully')
      setTimeout(() => navigate(`/invoices/${res.id ?? id}`), NAV_DELAY_MS)
    },
    onError: (err) => toast.error(`${isEdit ? 'Update' : 'Save'} failed — ${apiMsg(err)}`),
  })

  const submitForApproval = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = await buildPayload(data)
      const inv = isEdit
        ? await http.put<any>(`/api/invoices/${id}`, payload)
        : await http.post<any>('/api/invoices', payload)
      await http.post(`/api/invoices/${inv.id}/submit`, {})
      return inv
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Submitted for approval')
      setTimeout(() => navigate(`/invoices/${res.id ?? id}`), NAV_DELAY_MS)
    },
    onError: (err) => toast.error(`Submit failed — ${apiMsg(err)}`),
  })

  // Smooth-scroll to the first invalid field on submit failure. RHF's default
  // shouldFocusError still fires focus(); this just adds a smooth scroll so
  // the user sees the red field appear in view rather than jumping silently.
  const scrollToFirstError = useCallback((errs: Record<string, unknown>) => {
    const firstKey = Object.keys(errs)[0]
    if (!firstKey) return
    const el = document.querySelector<HTMLElement>(`[name="${firstKey}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Defer focus so the smooth-scroll animation isn't preempted by focus().
      setTimeout(() => el.focus({ preventScroll: true }), 250)
    }
  }, [])

  if (isEdit && loadingInv) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  // Type-selector modal — only when creating new with no ?type query param.
  // Clicking a card flips ?type and the rest of the form mounts.
  if (mode === 'choose') {
    return (
      <InvoiceTypePicker
        onPick={t => setSearchParams({ type: t }, { replace: true })}
        onCancel={() => navigate('/invoices')}
      />
    )
  }

  const isPending = saveDraft.isPending || submitForApproval.isPending

  // ── Render ────────────────────────────────────────────────────────────────
  // Header title reflects whether we're in review (read-only), edit, or create mode.
  const headerTitle = !isEdit
    ? 'New Invoice'
    : isReadOnly ? 'Invoice' : 'Edit Invoice'

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={headerTitle}
        backLabel="Invoices"
        backTo="/invoices"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/invoices')}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">
              {isReadOnly ? 'Back to list' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <>
                <button type="button" disabled={isPending}
                  onClick={handleSubmit(d => saveDraft.mutate(d), scrollToFirstError)}
                  className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
                  {saveDraft.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : null}
                  Save draft
                </button>
                <button type="button" disabled={isPending}
                  onClick={handleSubmit(d => submitForApproval.mutate(d), scrollToFirstError)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  <Send className="h-3.5 w-3.5" />
                  Submit for approval
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Page subtitle chip strip — replaces the legacy single-line description.
          Sits between the MasterPageHeader and the left/right body. */}
      <div className="border-b border-border bg-background px-4 sm:px-6 py-2 flex items-center gap-1 flex-wrap">
        {['AP Invoice', 'OCR', 'GST auto-calc', '3-way match'].map(label => (
          <span
            key={label}
            className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT — collapsible upload + preview */}
        <LeftPanel
          open             ={leftOpen}
          onToggle         ={() => setLeftOpen(v => !v)}
          file             ={file}
          fileURL          ={fileURL}
          onFile           ={setFile}
          onExtract        ={runOcr}
          ocrLoading       ={ocrLoading}
          ocrError         ={ocrError}
          ocrConfidence    ={ocrConfidence}
          ocrModel         ={ocrModel}
          onDismissOcr     ={dismissOcr}
          existingFileURL  ={isEdit && editInvoice?.hasFile ? `/api/invoices/${id}/file` : null}
          existingFileName ={editInvoice?.fileName ?? null}
          existingFileMime ={editInvoice?.mimeType ?? null}
        />

        {/* RIGHT — scrollable form */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 sm:px-6 space-y-6 max-w-[1400px]">

            {/* PO selection panel — only when mode=po. Sits above Section A so
                vendor + entity + currency + poRef can be auto-populated before
                the user touches the rest of the form. */}
            {mode === 'po' && !isEdit && (
              <POSelectionPanel
                vendors={vendors as any[]}
                vendorId={vendorId ?? ''}
                onVendorChange={v => {
                  setValue('vendorId', v, { shouldDirty: true })
                  setSelectedPoId(null)
                }}
                entityId={entityId ?? ''}
                pos={openPOs}
                loading={posLoading}
                selectedPoId={selectedPoId}
                onSelectPo={po => {
                  setSelectedPoId(po.id)
                  setValue('vendorId',     po.vendorId,    { shouldDirty: true })
                  setValue('entityId',     po.entityId,    { shouldDirty: true })
                  setValue('poRef',        po.poRef,       { shouldDirty: true })
                  setValue('currencyCode', 'INR',          { shouldDirty: true })
                  // 3-way only available when a GRN exists for the PO.
                  if (po.grnCount === 0 && matchType === '3way') setMatchType('2way')
                }}
                consumptionType={consumptionType}
                onConsumptionChange={setConsumptionType}
                matchType={matchType}
                onMatchTypeChange={setMatchType}
                selectedPo={selectedPo}
                currency={currencyCode}
              />
            )}

            {/* Direct-mode L2 banner — kicks in when total crosses ₹25,000 */}
            {triggersL2 && (
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
                <Info className="h-4 w-4 text-blue-700 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  Amount exceeds ₹{L2_THRESHOLD.toLocaleString('en-IN')} — will route through{' '}
                  <span className="font-semibold">L2 approval</span> (Finance Manager → CFO) per workflow rule{' '}
                  <code className="font-mono text-xs">WF-INV-DIRECT-L2</code>.
                </p>
              </div>
            )}

            {/* Review-mode read-only banner — only on /:id when the invoice is in
                a terminal/post-workflow status. Tells the user why the form
                fields are greyed out. /:id/edit suppresses this. */}
            {isReadOnly && editInvoice && (
              <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <Info className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  View only — invoice is <span className="font-semibold">{formatStatus(String(editInvoice.status))}</span>. Open it from the Approval Desk or use a workflow action to change state.
                </p>
              </div>
            )}

            {/* Locked banner order above Section A:
                  1. OCR confidence + KYC chips (sticky at top)
                  2. Duplicate banner (live or persisted from ingestion)
                  3. LLM review flags / validation issues
                Section A renders immediately below. */}

            {/* (1) OCR confidence card — left-bordered teal banner with
                per-field stats. Tracks: total fields extracted, count at
                ≥85% confidence (auto-processable), count below 85% (needs
                review). Verified/Review chip switches on overall score. */}
            {ocrConfidence !== null && (() => {
              const trackedKeys = Array.from(ocrFields)
              const fieldsExtracted = trackedKeys.length
              const highConf = trackedKeys.filter(k => (ocrFieldConfidence[k] ?? ocrConfidence) >= 85).length
              const needsReview = fieldsExtracted - highConf
              const reviewRequired = ocrConfidence < 85
              return (
                <div
                  className="rounded-xl bg-teal-50/40 px-4 py-3 flex items-start gap-4 flex-wrap"
                  style={{ borderLeft: '3px solid #1D9E75', borderTop: '1px solid #B5E5D2', borderRight: '1px solid #B5E5D2', borderBottom: '1px solid #B5E5D2' }}
                >
                  <div className="flex items-center gap-2 min-w-[160px]">
                    <ScanLine className="h-4 w-4 text-teal-700" />
                    <span className="text-sm font-semibold text-teal-900">OCR Confidence</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={CHIP_OCR_STYLE}>OCR</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={reviewRequired ? CHIP_OVERRIDE_STYLE : CHIP_AUTO_STYLE}
                    >
                      {ocrConfidence}%
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={reviewRequired ? CHIP_OVERRIDE_STYLE : CHIP_AUTO_STYLE}
                    >
                      {reviewRequired ? 'Review required' : 'Verified'}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-5 text-right">
                    <div>
                      <p className="text-base font-semibold tabular-nums">{fieldsExtracted}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fields extracted</p>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-teal-700 tabular-nums">{highConf}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">High confidence</p>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-amber-700 tabular-nums">{needsReview}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Needs review</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-amber-100 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', ocrConfidence >= 80 ? 'bg-teal-500' : ocrConfidence >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                      style={{ width: `${ocrConfidence}%` }}
                    />
                  </div>
                  {(selectedVendor || ocrModel) && (
                    <div className="flex items-center gap-1.5 flex-wrap w-full">
                      {selectedVendor && (
                        <>
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            selectedVendor.kycPanStatus === 'VERIFIED' ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                            PAN {selectedVendor.kycPanStatus === 'VERIFIED' ? 'Valid' : 'Unverified'}
                          </span>
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            selectedVendor.kycGstStatus === 'VERIFIED' ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                            GST {selectedVendor.kycGstStatus === 'VERIFIED' ? 'Valid' : 'Unverified'}
                          </span>
                          {selectedVendor.kycBankStatus && (
                            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium',
                              selectedVendor.kycBankStatus === 'VERIFIED' ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                              Bank {selectedVendor.kycBankStatus === 'VERIFIED' ? 'Valid' : 'Unverified'}
                            </span>
                          )}
                        </>
                      )}
                      {ocrModel && (
                        <span className="text-[10px] text-muted-foreground">via {ocrModel}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* (2) Duplicate banner — live re-check OR persisted snapshot from
                ingestion. Falls back to editInvoice.duplicateMatches so the
                banner still shows when the on-load rules don't fire (e.g.
                similarity below threshold) but the system caught a duplicate
                via a different rule at ingest time. */}
            {isEdit && <DuplicateBanner data={duplicateBannerData} currency={currencyCode} />}

            {/* (3) LLM review banner — surfaces async invoice-scorer output:
                review flags, validation issues, vendor-match suggestion.
                No-ops on create. */}
            {isEdit && <LlmReviewBanner inv={editInvoice} />}

            {/* Sections A–G live inside a single <fieldset disabled={isReadOnly}>
                so review-mode (/:id without /edit, on a terminal status) disables
                every control in one place — RHF state stays intact for re-display
                without per-input wiring. */}
            <fieldset disabled={isReadOnly} className="space-y-6 m-0 p-0 border-0 min-w-0 disabled:opacity-95">

            {/* A. Invoice Header */}
            <div className="rounded-xl border border-border bg-card p-6">
              <SectionHeader letter="A" title="Invoice Header" subtitle="Core invoice identifiers and dates" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Entity" required error={errors.entityId?.message}>
                  <FormSelect {...register('entityId')}>
                    <option value="">Select entity…</option>
                    {(entities as any[]).map((e: any) => (
                      <option key={e.id} value={e.id}>{e.name}{e.code ? ` — ${e.code}` : ''}</option>
                    ))}
                  </FormSelect>
                </Field>
                <Field label="Created by">
                  <FormInput readOnly value={authUser?.name ?? '—'} className="bg-muted/40" />
                </Field>

                <Field label="Department">
                  <FormSelect {...register('departmentId')}>
                    <option value="">Select department…</option>
                    {(departments as any[]).map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}{d.code ? ` — ${d.code}` : ''}</option>
                    ))}
                  </FormSelect>
                </Field>
                <Field
                  required
                  label={<>Bill-to location <MetaChip label="Sets GST type" style={CHIP_OCR_STYLE} title="Intra/inter-state GST split derives from this location" /></>}
                >
                  <FormSelect {...register('billToLocationId')}>
                    <option value="">Select location…</option>
                    {(locations as any[]).map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name}{l.code ? ` — ${l.code}` : ''}</option>
                    ))}
                  </FormSelect>
                  {(() => {
                    // Intra-state vs inter-state hint — recalcLine uses the same
                    // comparison so this stays consistent.
                    const billToId = getValues('billToLocationId')
                    const billTo   = billToId ? (locations as any[]).find((l: any) => l.id === billToId) : null
                    if (!billTo?.state || !vendorState) return null
                    const same = String(billTo.state).toLowerCase() === String(vendorState).toLowerCase()
                    return (
                      <p className={cn('text-[10px] mt-1', same ? 'text-green-700' : 'text-blue-700')}>
                        {same ? 'Intra-state → CGST + SGST' : 'Inter-state → IGST'}
                      </p>
                    )
                  })()}
                </Field>

                <Field label={<>Vendor {indicator('vendorId')}{editedBadge('vendorId')}</>} required error={errors.vendorId?.message}>
                  <FormSelect {...register('vendorId')} className={overrideInputCls('vendorId')}>
                    <option value="">Select vendor…</option>
                    {(vendors as any[]).map((v: any) => (
                      <option key={v.id} value={v.id}>{v.legalName} — {v.vendorCode}</option>
                    ))}
                  </FormSelect>
                  {overrideHint('vendorId')}
                  {suggestionsBlock('vendorId')}
                </Field>
                <Field label={<>Vendor GSTIN {indicator('vendorGSTIN')}{editedBadge('vendorGSTIN')}</>}>
                  {/* Multi-GSTIN: vendor may have several registrations across states.
                      Today only the primary `vendor.gstin` is exposed by /api/masters/dropdown;
                      VendorGstRegistration rows can be wired here once an endpoint surfaces them. */}
                  <FormSelect {...register('vendorGSTIN')} className={cn('font-mono', overrideInputCls('vendorGSTIN'))}>
                    <option value="">Select GSTIN…</option>
                    {selectedVendor?.gstin && (
                      <option value={selectedVendor.gstin}>
                        {selectedVendor.gstin}
                        {selectedVendor.state ? ` — ${selectedVendor.state}` : ''}
                      </option>
                    )}
                  </FormSelect>
                  {(() => {
                    const currentGstin = getValues('vendorGSTIN')
                    if (!currentGstin) return null
                    const matched = selectedVendor?.gstin && currentGstin === selectedVendor.gstin
                    return matched
                      ? <p className="text-[10px] text-green-700 mt-1">✓ Matched master</p>
                      : <p className="text-[10px] text-amber-700 mt-1">⚠ Not in master</p>
                  })()}
                  {overrideHint('vendorGSTIN')}
                </Field>

                <Field label={<>Vendor PAN <AutoFilledChip />{editedBadge('vendorPAN')}</>}>
                  <FormInput readOnly placeholder="Auto from GSTIN" {...register('vendorPAN')} className={cn('font-mono bg-muted/40', overrideInputCls('vendorPAN'))} />
                  <p className="text-[10px] text-muted-foreground mt-1">Derived from chars 3–12 of GSTIN</p>
                  {overrideHint('vendorPAN')}
                </Field>
                <Field label={<>IRN (e-Invoice) {indicator('irnNumber')}{editedBadge('irnNumber')}</>}>
                  <FormInput placeholder="e-Invoice IRN — auto-populated from OCR" {...register('irnNumber')} className={overrideInputCls('irnNumber')} />
                  {!!editInvoice?.irnNumber && editInvoice?.irnVerified && (
                    <p className="text-[10px] text-green-700 mt-1">✓ QR code scanned · IRN verified</p>
                  )}
                  {overrideHint('irnNumber')}
                </Field>

                <Field label={<>Invoice number {indicator('invoiceNumber')}{editedBadge('invoiceNumber')}</>} required error={errors.invoiceNumber?.message}>
                  <FormInput placeholder="INV-2025-001" {...register('invoiceNumber')} className={overrideInputCls('invoiceNumber')} />
                  {overrideHint('invoiceNumber')}
                  {suggestionsBlock('invoiceNumber')}
                </Field>
                <Field label={<>Invoice date {indicator('invoiceDate')}{editedBadge('invoiceDate')}</>} required>
                  <FormInput type="date" {...register('invoiceDate')} className={overrideInputCls('invoiceDate')} />
                  {overrideHint('invoiceDate')}
                </Field>

                <Field label={<>Due date {indicator('dueDate')}{editedBadge('dueDate')}</>}>
                  <FormInput type="date" {...register('dueDate')} className={overrideInputCls('dueDate')} />
                  {overrideHint('dueDate')}
                </Field>
                {/* Channel — hidden on direct + email-edit forms (channelType stays in
                    form state via defaultValues / loaded invoice). PO-backed edits keep
                    the selector so the user can re-route a manually-uploaded invoice. */}
                {!isDirectLayout && (
                  <Field label="Channel">
                    <FormSelect {...register('channelType')}>
                      {['MANUAL_UPLOAD','EMAIL','VENDOR_PORTAL','API'].map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
                    </FormSelect>
                  </Field>
                )}

                <Field label={<>Currency {indicator('currencyCode')}{editedBadge('currencyCode')}</>}>
                  <FormSelect {...register('currencyCode')} className={overrideInputCls('currencyCode')}>
                    {['INR','USD','EUR','GBP','AED','SGD'].map(c => <option key={c}>{c}</option>)}
                  </FormSelect>
                  {overrideHint('currencyCode')}
                </Field>
                {/* PO reference / header cost centre / header GL code — only render on
                    PO-backed flows. Direct + email-edit invoices allocate per-line in
                    Section C; surfacing these at header level was a duplicate. */}
                {!isDirectLayout && (
                  <>
                    <Field label="PO reference">
                      <FormInput placeholder="PO-2025-0001" readOnly={mode === 'po' && !!selectedPoId}
                        className={cn(mode === 'po' && !!selectedPoId && 'bg-muted/40')}
                        {...register('poRef')} />
                    </Field>

                    <Field
                      label="Cost centre"
                      error={errors.costCentreId?.message as string | undefined}
                    >
                      <FormSelect
                        className={cn(errors.costCentreId && 'border-red-500 focus:ring-red-500')}
                        {...register('costCentreId')}
                      >
                        <option value="">Select cost centre…</option>
                        {(costCentres as any[]).filter((c: any) => c.status === 'ACTIVE').map((c: any) => (
                          <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                        ))}
                      </FormSelect>
                    </Field>
                    <Field
                      label="GL code"
                      error={errors.glCodeId?.message as string | undefined}
                    >
                      <FormSelect
                        className={cn(errors.glCodeId && 'border-red-500 focus:ring-red-500')}
                        {...register('glCodeId')}
                      >
                        <option value="">Select GL code…</option>
                        {(glCodes as any[]).filter((g: any) => g.status === 'ACTIVE').map((g: any) => (
                          <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
                        ))}
                      </FormSelect>
                    </Field>
                  </>
                )}

              </div>
            </div>

            {/* B. Financial summary — manual Base + Gross override, with a
                live cross-check banner against the line-item sums. Helps the
                reviewer reconcile what the invoice itself reports vs what
                Section C's lines add up to. Pure helper computeCrossCheck
                returns signed deltas so the banner can phrase the mismatch
                directionally. */}
            <div className="rounded-xl border border-border bg-card p-6">
              <SectionHeader letter="B" title="Financial Summary" subtitle="Invoice-reported amounts — cross-checked against line items" />
              <div className="grid grid-cols-2 gap-4">
                <Field label={<>Base amount * {indicator('baseAmount')}{editedBadge('baseAmount')}</>}>
                  <FormInput
                    type="number" step="0.01" min="0" placeholder="0.00"
                    {...register('baseAmount', { valueAsNumber: true })}
                    className={overrideInputCls('baseAmount')}
                  />
                  {overrideHint('baseAmount')}
                  {suggestionsBlock('baseAmount')}
                </Field>
                <Field label={<>Total taxes <AutoFilledChip /></>}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-sm font-semibold">
                      {fmt(totals.cgstAmount + totals.sgstAmount + totals.igstAmount, currencyCode)}
                    </span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">Auto</span>
                  </div>
                  {(totals.cgstAmount + totals.sgstAmount) > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      CGST {fmt(totals.cgstAmount, currencyCode)} + SGST {fmt(totals.sgstAmount, currencyCode)}
                    </p>
                  )}
                  {totals.igstAmount > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      IGST {fmt(totals.igstAmount, currencyCode)}
                    </p>
                  )}
                </Field>
                <Field label={<>Gross amount * {indicator('grossAmount')}{editedBadge('grossAmount')}</>} span>
                  <FormInput
                    type="number" step="0.01" min="0" placeholder="0.00"
                    {...register('grossAmount', { valueAsNumber: true })}
                    className={overrideInputCls('grossAmount')}
                  />
                  {overrideHint('grossAmount')}
                  {suggestionsBlock('grossAmount')}
                </Field>
                {(() => {
                  const xcheck = computeCrossCheck(
                    Number(baseAmountWatch) || 0,
                    Number(grossAmountWatch) || 0,
                    lines.map((l: LineItem) => ({
                      taxableAmount: Number(l.taxableAmount) || (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
                      cgstAmount:    Number(l.cgstAmount) || 0,
                      sgstAmount:    Number(l.sgstAmount) || 0,
                      igstAmount:    Number(l.igstAmount) || 0,
                    })),
                  )
                  return (
                    <div className="col-span-2">
                      {!xcheck.hasLines ? (
                        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                          Add line items to validate
                        </div>
                      ) : xcheck.baseMatch && xcheck.grossMatch ? (
                        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                          ✓ Base {fmt(Number(baseAmountWatch), currencyCode)} + Tax {fmt(totals.cgstAmount + totals.sgstAmount + totals.igstAmount, currencyCode)} = {fmt(Number(grossAmountWatch), currencyCode)} · balanced
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {!xcheck.baseMatch && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              ⚠ Base amount {fmt(Number(baseAmountWatch), currencyCode)} does not match line items sum {fmt(Number(baseAmountWatch) - xcheck.baseDelta, currencyCode)} (Δ {fmt(xcheck.baseDelta, currencyCode)})
                            </div>
                          )}
                          {!xcheck.grossMatch && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              ⚠ Gross {fmt(Number(grossAmountWatch), currencyCode)} does not match Base + Tax {fmt(Number(grossAmountWatch) - xcheck.grossDelta, currencyCode)} (Δ {fmt(xcheck.grossDelta, currencyCode)})
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* C. Line Items */}
            <div className="rounded-xl border border-border bg-card p-6">
              <SectionHeader letter="C" title="Line Items" subtitle="One row per product or service — GST auto-calculated" />
              <div className="overflow-x-auto w-full -mx-2">
                <table className="table-auto min-w-[1400px] w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[40px]">#</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[120px]">Item</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[150px]">Description</th>
                      <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap min-w-[80px]">Qty</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[70px]">UOM</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[90px]">Unit Price</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[55px]">Disc%</th>
                      <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap min-w-[80px]">Taxable</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[55px]">GST%</th>
                      <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap min-w-[75px]">CGST</th>
                      <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap min-w-[75px]">SGST</th>
                      <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap min-w-[75px]">IGST</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[55px]">
                        TDS%
                        {selectedVendor && Number(selectedVendor.tdsRate) > 0 && (
                          <span
                            className="ml-1 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700"
                            title={`Vendor TDS default — applies when no item override`}
                          >
                            {Number(selectedVendor.tdsRate)}%{selectedVendor.tdsSectionCode ? ` · ${selectedVendor.tdsSectionCode}` : ''}
                          </span>
                        )}
                      </th>
                      <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap min-w-[75px]">TDS</th>
                      <th className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap min-w-[45px]">RCM</th>
                      <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap min-w-[85px]">Net</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[120px]">GL</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[100px]">CC</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[30px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {fields.map((field, i) => {
                      const l        = lines[i] ?? {}
                      const itemReg  = register(`lines.${i}.itemId`)
                      const matchUI  = itemMatches[i]
                      const expanded = expandedItemMatch.has(i)
                      return (
                        <tr key={field.id} className="align-top hover:bg-muted/10">
                          <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-2 py-1 min-w-[180px]">
                            <FormSelect
                              className={CELL_SELECT}
                              {...itemReg}
                              onChange={(e) => {
                                itemReg.onChange(e)
                                applyItemPreset(i, e.target.value)
                                // User picked manually — clear the match
                                // banner for this row so we don't keep
                                // nagging "Review match" after they chose.
                                setItemMatches(prev => {
                                  if (!prev[i]) return prev
                                  const next = { ...prev }
                                  delete next[i]
                                  return next
                                })
                              }}
                            >
                              <option value="">Item…</option>
                              {(items as any[]).map((it: any) => <option key={it.id} value={it.id}>{it.itemCode ?? it.code} — {it.name}</option>)}
                            </FormSelect>
                            {matchUI && <ItemMatchCell
                              data     ={matchUI}
                              expanded ={expanded}
                              onToggle ={() => setExpandedItemMatch(prev => {
                                const next = new Set(prev)
                                if (next.has(i)) next.delete(i)
                                else             next.add(i)
                                return next
                              })}
                              onPickSuggestion={(itemId) => {
                                setValue(`lines.${i}.itemId`, itemId, { shouldDirty: true })
                                applyItemPreset(i, itemId)
                                setItemMatches(prev => {
                                  const next = { ...prev }
                                  delete next[i]
                                  return next
                                })
                                setExpandedItemMatch(prev => {
                                  const next = new Set(prev)
                                  next.delete(i)
                                  return next
                                })
                              }}
                            />}
                          </td>
                          <td className="px-2 py-1 relative">
                            <FormInput className={cn(CELL_INPUT, 'pr-5')} placeholder="Description" {...register(`lines.${i}.description`)} onBlur={() => recalc(i)} />
                            {lineOcrIcon(i, 'description')}
                          </td>
                          <td className="px-2 py-1 relative">
                            {(() => {
                              // Chain RHF's onChange with our recalc so taxable/GST update
                              // on every keystroke, not just blur. onBlur snaps an empty
                              // cell back to 1 so the line never reads as ₹0 by mistake.
                              const qtyReg = register(`lines.${i}.quantity`, { valueAsNumber: true })
                              return <FormInput
                                className={cn(NUMERIC_INPUT, 'pr-5')}
                                type="number" step="0.001" min="0.001" placeholder="1"
                                {...qtyReg}
                                onChange={(e) => { qtyReg.onChange(e); recalc(i) }}
                                onBlur={(e) => {
                                  qtyReg.onBlur(e)
                                  const v = e.currentTarget.valueAsNumber
                                  if (!v || isNaN(v) || v <= 0) {
                                    isApplyingPreset.current = true
                                    setValue(`lines.${i}.quantity`, 1)
                                  }
                                  recalc(i)
                                }}
                              />
                            })()}
                            {lineOcrIcon(i, 'quantity')}
                          </td>
                          <td className="px-2 py-1">
                            <FormInput className={CELL_INPUT} placeholder="Nos" {...register(`lines.${i}.uom`)} />
                          </td>
                          <td className="px-2 py-1 relative">
                            {(() => {
                              const upReg = register(`lines.${i}.unitPrice`, { valueAsNumber: true })
                              return <FormInput
                                className={cn(NUMERIC_INPUT, 'pr-5')}
                                type="number" step="0.01" min="0" placeholder="0.00"
                                {...upReg}
                                onChange={(e) => { upReg.onChange(e); recalc(i) }}
                                onBlur={(e) => { upReg.onBlur(e); recalc(i) }}
                              />
                            })()}
                            {lineOcrIcon(i, 'unitPrice')}
                          </td>
                          <td className="px-2 py-1">
                            {(() => {
                              const discReg = register(`lines.${i}.discountPct`, { valueAsNumber: true })
                              return <FormInput
                                className={NUMERIC_INPUT}
                                type="number" step="0.01" min="0" max="100" placeholder="0"
                                {...discReg}
                                onChange={(e) => { discReg.onChange(e); recalc(i) }}
                                onBlur={(e) => { discReg.onBlur(e); recalc(i) }}
                              />
                            })()}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums font-mono text-right whitespace-nowrap">
                            {fmt(l.taxableAmount, currencyCode)}
                          </td>
                          <td className="px-2 py-1 relative">
                            <FormInput
                              className={cn(CELL_INPUT, l.itemId && 'pr-9', !l.itemId && 'pr-5')}
                              type="number" step="0.01" min="0" placeholder="18"
                              {...register(`lines.${i}.gstRate`, { valueAsNumber: true })}
                              onBlur={() => recalc(i)}
                            />
                            {l.itemId ? (
                              <span
                                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-blue-200 bg-blue-50 px-1 text-[10px] font-medium text-blue-600"
                                title="Auto-filled from item master"
                              >
                                auto
                              </span>
                            ) : (
                              lineOcrIcon(i, 'gstRate')
                            )}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums font-mono text-right text-green-700 whitespace-nowrap">
                            {fmt(l.cgstAmount, currencyCode)}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums font-mono text-right text-green-700 whitespace-nowrap">
                            {fmt(l.sgstAmount, currencyCode)}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums font-mono text-right text-blue-700 whitespace-nowrap">
                            {fmt(l.igstAmount, currencyCode)}
                          </td>
                          <td className="px-2 py-1 relative">
                            <FormInput
                              className={cn(CELL_INPUT, l.itemId && 'pr-9')}
                              type="number" step="0.01" min="0" placeholder="10"
                              {...register(`lines.${i}.tdsRate`, { valueAsNumber: true })}
                              onBlur={() => recalc(i)}
                            />
                            {l.itemId && (
                              <span
                                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-blue-200 bg-blue-50 px-1 text-[10px] font-medium text-blue-600"
                                title="Auto-filled from item master"
                              >
                                auto
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums font-mono text-right text-amber-600 whitespace-nowrap">
                            {Number(l.tdsAmount) > 0 ? fmt(l.tdsAmount, currencyCode) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input type="checkbox" {...register(`lines.${i}.rcmApplicable`)} className="rounded border-input" />
                          </td>
                          <td className="px-2 py-1.5 tabular-nums font-mono text-right font-semibold whitespace-nowrap">
                            {fmt(l.lineTotal, currencyCode)}
                          </td>
                          <td className="px-2 py-1">
                            <FormSelect className={CELL_SELECT} {...register(`lines.${i}.glCodeId`)}>
                              <option value="">GL…</option>
                              {(glCodes as any[]).map((g: any) => <option key={g.id} value={g.id}>{g.code}</option>)}
                            </FormSelect>
                          </td>
                          <td className="px-2 py-1">
                            <FormSelect className={CELL_SELECT} {...register(`lines.${i}.costCentreId`)}>
                              <option value="">CC…</option>
                              {(costCentres as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
                            </FormSelect>
                          </td>
                          <td className="px-2 py-1.5">
                            {fields.length > 1 && (
                              <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}

                    {/* Grand total row */}
                    <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                      <td colSpan={7} className="px-2 py-2 text-right text-xs">Grand Total</td>
                      <td className="px-2 py-2 text-xs tabular-nums font-mono text-right whitespace-nowrap">{fmt(totals.taxableAmount, currencyCode)}</td>
                      <td />
                      <td className="px-2 py-2 text-xs tabular-nums font-mono text-right text-green-700 whitespace-nowrap">{fmt(totals.cgstAmount, currencyCode)}</td>
                      <td className="px-2 py-2 text-xs tabular-nums font-mono text-right text-green-700 whitespace-nowrap">{fmt(totals.sgstAmount, currencyCode)}</td>
                      <td className="px-2 py-2 text-xs tabular-nums font-mono text-right text-blue-700 whitespace-nowrap">{fmt(totals.igstAmount, currencyCode)}</td>
                      <td />
                      <td className="px-2 py-2 text-xs tabular-nums font-mono text-right text-amber-600 whitespace-nowrap">{fmt(totals.tdsAmount, currencyCode)}</td>
                      <td />
                      <td className="px-2 py-2 text-xs tabular-nums font-mono text-right font-bold whitespace-nowrap">{fmt(totals.netPayable, currencyCode)}</td>
                      <td colSpan={3} />
                    </tr>
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => append(emptyLine())}
                className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> Add line
              </button>
              {totals.igstAmount === 0 && totals.cgstAmount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">Intrastate supply — CGST + SGST applied</p>
              )}
              {totals.igstAmount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">Interstate supply — IGST applied</p>
              )}
            </div>

            {/* D. Retention — collapsible. Most invoices skip it, so the
                section stays collapsed by default; expand on click. */}
            <div className="rounded-xl border border-border bg-card p-6">
              <SectionHeader
                letter="D"
                title="Retention"
                subtitle="Hold back a portion of payment for warranty / quality milestones"
                action={
                  <button
                    type="button"
                    onClick={() => setRetentionOpen(v => !v)}
                    className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted"
                    aria-label={retentionOpen ? 'Collapse Retention' : 'Expand Retention'}
                  >
                    {retentionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                }
              />
              {retentionOpen && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Provision / Retention required">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" {...register('retentionRequired')} className="rounded border-input" />
                      <span className="text-muted-foreground">Retain a portion of payment for warranty / quality holdback</span>
                    </label>
                  </Field>
                  <div />

                  {retentionOn && (
                    <>
                      <Field label="Retention amount">
                        <FormInput type="number" step="0.01" min="0" placeholder="0.00"
                          {...register('retentionAmount', { valueAsNumber: true })} />
                      </Field>
                      <Field label="Retention GL code">
                        <FormSelect {...register('retentionGlCodeId')}>
                          <option value="">Select GL code…</option>
                          {(glCodes as any[]).map((g: any) => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
                        </FormSelect>
                      </Field>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* E. Narration & period — split out of the legacy "Additional Details" block. */}
            <div className="rounded-xl border border-border bg-card p-6">
              <SectionHeader letter="E" title="Narration & Period" subtitle="Free-text narration + billing-period dates" />
              <div className="grid grid-cols-2 gap-4">
                <Field label={<>Narration {indicator('narration')}{editedBadge('narration')}</>} span>
                  <FormTextarea rows={2} placeholder="Internal narration / description of expense…" {...register('narration')} className={overrideInputCls('narration')} />
                  {overrideHint('narration')}
                </Field>
                <Field label={<>Period of expense — from {indicator('periodFrom')}{editedBadge('periodFrom')}</>}>
                  <FormInput type="date" {...register('periodFrom')} className={overrideInputCls('periodFrom')} />
                  {overrideHint('periodFrom')}
                </Field>
                <Field label={<>Period of expense — to {indicator('periodTo')}{editedBadge('periodTo')}</>}>
                  <FormInput type="date" {...register('periodTo')} className={overrideInputCls('periodTo')} />
                  {overrideHint('periodTo')}
                </Field>
              </div>
            </div>

            {/* F. Accounting JV Preview — dark header, collapsible.
                Default expanded since reviewers need to confirm the JV
                before submission. */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-6">
              <DarkSectionHeader
                letter="F"
                title="Accounting JV Preview"
                subtitle="Auto-built from line items · GL mappings editable before submit"
                action={
                  <button
                    type="button"
                    onClick={() => setJvOpen(v => !v)}
                    className="ml-auto rounded-md p-1 text-white/80 hover:bg-white/10"
                    aria-label={jvOpen ? 'Collapse JV Preview' : 'Expand JV Preview'}
                  >
                    {jvOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                }
              />
              {jvOpen && (() => {
                const lineInputs = lines.map((l: LineItem) => ({
                  description:   l.description,
                  taxableAmount: Number(l.taxableAmount) || (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
                  cgstAmount:    Number(l.cgstAmount)    || 0,
                  sgstAmount:    Number(l.sgstAmount)    || 0,
                  igstAmount:    Number(l.igstAmount)    || 0,
                  tdsAmount:     Number(l.tdsAmount)     || 0,
                  glCode:        l.glCodeId ? glLabel(l.glCodeId) : undefined,
                  glName:        l.glCodeId ? glName(l.glCodeId) : undefined,
                  costCentre:    l.costCentreId ? ccName(l.costCentreId) : null,
                }))
                const jvCtx = {
                  apGl:        pickGl(glCodes as GlCodeRef[], { contains: ['Accounts', 'Payable'] }),
                  cgstGl:      pickGl(glCodes as GlCodeRef[], { contains: ['CGST'] }),
                  sgstGl:      pickGl(glCodes as GlCodeRef[], { contains: ['SGST'] }),
                  igstGl:      pickGl(glCodes as GlCodeRef[], { contains: ['IGST'] }),
                  tdsGl:       pickGl(glCodes as GlCodeRef[], { contains: ['TDS', 'Payable'] }),
                  retentionGl: pickGl(glCodes as GlCodeRef[], { contains: ['Retention'] }),
                }
                const entries = computeJvEntries(lineInputs, Number(retentionAmountWatch) || 0, jvCtx)
                const totalsJv = jvTotals(entries)
                return (
                  <>
                    <div className="overflow-x-auto -mx-2">
                      <table className="w-full table-auto text-xs">
                        <thead style={{ background: '#1E293B' }}>
                          <tr>
                            <th className="text-left py-2 px-2 font-medium text-white">Type</th>
                            <th className="text-left py-2 px-2 font-medium text-white">GL Code</th>
                            <th className="text-left py-2 px-2 font-medium text-white">GL Description</th>
                            <th className="text-left py-2 px-2 font-medium text-white">Cost Centre</th>
                            <th className="text-left py-2 px-2 font-medium text-white">Narration</th>
                            <th className="text-right py-2 px-2 font-medium text-white">Amount ₹</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.length === 0 && (
                            <tr><td colSpan={6} className="py-3 text-center text-muted-foreground">Add line items to preview JV</td></tr>
                          )}
                          {entries.map((e, i) => (
                            <tr key={i} className={cn('border-b border-border/50', e.type === 'DR' ? 'bg-blue-50/40' : 'bg-teal-50/40')}>
                              <td className="py-1.5 px-2">
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                                  style={{ background: e.type === 'DR' ? '#2563EB' : '#1D9E75' }}
                                >
                                  {e.type}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 font-mono">
                                {e.glCode ?? (
                                  <span className="inline-flex items-center gap-1 text-red-700 text-[10px] font-medium">
                                    <AlertTriangle className="h-3 w-3" /> GL not configured
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-2">{e.glDescription}</td>
                              <td className="py-1.5 px-2 text-muted-foreground">{e.costCentre ?? '—'}</td>
                              <td className="py-1.5 px-2 text-muted-foreground">{e.narration || '—'}</td>
                              <td className="py-1.5 px-2 text-right tabular-nums font-mono">{fmt(e.amount, currencyCode)}</td>
                            </tr>
                          ))}
                          <tr className={cn('border-t-2 border-border font-semibold', totalsJv.balanced ? 'bg-green-50/60' : 'bg-red-50/60')}>
                            <td colSpan={5} className="py-2 px-2 text-right">
                              Total Dr {fmt(totalsJv.totalDr, currencyCode)} · Total Cr {fmt(totalsJv.totalCr, currencyCode)}
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums font-mono">
                              {totalsJv.balanced ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-600 text-white px-2 py-0.5 text-[10px] font-semibold">
                                  ✓ Balanced
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-semibold">
                                  ✗ {fmt(Math.abs(totalsJv.delta), currencyCode)} difference
                                </span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground italic mt-2">
                      GL mappings auto-generated from item master · editable before submit · JV posted on approval
                    </p>
                  </>
                )
              })()}
              </div>
            </div>

            {/* G. Audit Trail — event-card layout, only renders when the
                invoice has audit log entries. Each event card carries a
                colored icon circle (teal for system/email, purple for AI/OCR,
                blue for user actions), an action chip, the actor + timestamp,
                and any structured detail keys. */}
            {isEdit && Array.isArray(editInvoice?.auditLogs) && editInvoice.auditLogs.length > 0 && (() => {
              const eventStyle = (action: string): { bg: string; chipBg: string; chipColor: string; icon: React.ReactNode } => {
                const a = action.toUpperCase()
                if (a.includes('EMAIL') || a.includes('INGEST') || a.includes('UPLOAD')) {
                  return { bg: '#E1F5EE', chipBg: '#1D9E75', chipColor: '#fff', icon: <FileText className="h-3 w-3 text-teal-700" /> }
                }
                if (a.includes('OCR') || a.includes('AI') || a.includes('SCORE') || a.includes('LLM')) {
                  return { bg: '#EEE4FB', chipBg: '#7C3AED', chipColor: '#fff', icon: <Sparkles className="h-3 w-3 text-purple-700" /> }
                }
                return { bg: '#E6F1FB', chipBg: '#2563EB', chipColor: '#fff', icon: <Edit3 className="h-3 w-3 text-blue-700" /> }
              }
              return (
                <div className="rounded-xl border border-border bg-card p-6">
                  <SectionHeader letter="G" title="Audit Trail" subtitle="Chronological event history · read-only" />
                  <div className="space-y-2">
                    {editInvoice.auditLogs.map((log: any) => {
                      const st = eventStyle(String(log.action))
                      return (
                        <div key={log.id} className="rounded-lg border border-border bg-background/60 px-3 py-2 flex items-start gap-3">
                          <div
                            className="mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: st.bg }}
                          >
                            {st.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                style={{ background: st.chipBg, color: st.chipColor }}
                              >
                                {String(log.action)}
                              </span>
                              {log.userName && <span className="text-xs text-muted-foreground">by {log.userName}</span>}
                            </div>
                            {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                {Object.entries(log.details as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{formatDateTime(log.createdAt)}</p>
                        </div>
                      )
                    })}
                  </div>
                  {Array.isArray(editInvoice.approvals) && editInvoice.approvals.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Legacy approval steps</p>
                      {editInvoice.approvals.map((step: any) => (
                        <div key={step.id} className="rounded-lg border border-border bg-background/60 px-3 py-2 flex items-start gap-3">
                          <div className={cn('mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                            step.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            step.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                            L{step.level}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold">{formatStatus(String(step.status))}</p>
                            {step.comments && <p className="text-xs text-muted-foreground">{step.comments}</p>}
                          </div>
                          {step.actionAt && <p className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{formatDate(step.actionAt)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            </fieldset>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Type-selector modal ─────────────────────────────────────────────────────
// Centred two-card picker, shown when /invoices/new is opened without ?type.
// Clicking a card updates the URL — the rest of InvoiceFormPage mounts on the
// next render with the matching mode.
function InvoiceTypePicker({ onPick, onCancel }: {
  onPick:   (t: 'po' | 'direct') => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-2xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold">New invoice</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pick a path</p>
          </div>
          <button onClick={onCancel} className="rounded-md p-1 hover:bg-muted" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
          <button
            onClick={() => onPick('po')}
            className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-teal-300 hover:ring-4 hover:ring-teal-100"
          >
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-2 text-teal-700">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold">PO-based invoice</h3>
            <p className="text-xs text-muted-foreground">References an approved PO. Supports 2-way or 3-way match.</p>
          </button>
          <button
            onClick={() => onPick('direct')}
            className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-blue-300 hover:ring-4 hover:ring-blue-100"
          >
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold">Direct invoice (no PO)</h3>
            <p className="text-xs text-muted-foreground">Utilities, reimbursements, one-off purchases.</p>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PO selection panel (mode=po only) ───────────────────────────────────────
// Renders above Section A. Vendor dropdown drives the open-PO list query;
// picking a PO sets the form's vendorId / entityId / currency / poRef and
// surfaces consumption-type + match-type toggles. The 3-way toggle is gated
// on the PO actually having a GRN.
function POSelectionPanel({
  vendors, vendorId, onVendorChange,
  entityId, pos, loading,
  selectedPoId, onSelectPo,
  consumptionType, onConsumptionChange,
  matchType, onMatchTypeChange,
  selectedPo, currency,
}: {
  vendors:             any[]
  vendorId:            string
  onVendorChange:      (v: string) => void
  entityId:            string
  pos:                 POSummary[]
  loading:             boolean
  selectedPoId:        string | null
  onSelectPo:          (po: POSummary) => void
  consumptionType:     'PARTIAL' | 'FULL'
  onConsumptionChange: (c: 'PARTIAL' | 'FULL') => void
  matchType:           '2way' | '3way'
  onMatchTypeChange:   (m: '2way' | '3way') => void
  selectedPo:          POSummary | null
  currency:            string
}) {
  const external = vendors.filter(v => v.status === 'ACTIVE' && v.vendorType !== 'INTERCOMPANY')
  const hasGrn   = (selectedPo?.grnCount ?? 0) > 0

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-teal-700" />
        <h3 className="text-sm font-semibold text-teal-900">Link a PO</h3>
        <span className="text-xs text-teal-700/80">Vendor, entity, currency &amp; PO ref will auto-fill</span>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Vendor</label>
        <FormSelect value={vendorId} onChange={e => onVendorChange(e.target.value)}>
          <option value="">Select vendor…</option>
          {external.map((v: any) => (
            <option key={v.id} value={v.id}>{v.legalName} — {v.vendorCode}</option>
          ))}
        </FormSelect>
      </div>

      {vendorId && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Open POs for this vendor + entity</label>
          {!entityId ? (
            <p className="text-xs text-amber-700 mt-1">Pick an entity in Section A first — POs are entity-scoped.</p>
          ) : loading ? (
            <p className="text-xs text-muted-foreground mt-1">Loading POs…</p>
          ) : pos.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-1">No open POs for this vendor on this entity.</p>
          ) : (
            <div className="mt-1 rounded-lg border border-border bg-background overflow-hidden">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Pick</th>
                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">PO ref</th>
                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">PO date</th>
                    <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Open value</th>
                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">GRNs</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map(po => {
                    const selected = po.id === selectedPoId
                    return (
                      <tr key={po.id} className={cn('border-b border-border last:border-0 cursor-pointer hover:bg-muted/30', selected && 'bg-teal-50')} onClick={() => onSelectPo(po)}>
                        <td className="px-3 py-1.5">
                          <input type="radio" checked={selected} onChange={() => onSelectPo(po)} />
                        </td>
                        <td className="px-3 py-1.5 font-mono">{po.poRef}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{formatDate(po.poDate)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-mono">{formatCurrency(po.openValue, currency)}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{po.grnCount}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedPo && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Consumption</label>
            <div className="mt-1 flex rounded-lg border border-input overflow-hidden">
              {(['PARTIAL', 'FULL'] as const).map(t => (
                <button
                  type="button" key={t}
                  onClick={() => onConsumptionChange(t)}
                  className={cn('flex-1 px-3 py-1.5 text-xs font-medium', consumptionType === t ? 'bg-teal-600 text-white' : 'bg-background hover:bg-muted')}
                >
                  {t === 'PARTIAL' ? 'Partial' : 'Full'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Match type</label>
            <div className="mt-1 flex rounded-lg border border-input overflow-hidden">
              {(['2way', '3way'] as const).map(t => {
                const disabled = t === '3way' && !hasGrn
                return (
                  <button
                    type="button" key={t}
                    onClick={() => !disabled && onMatchTypeChange(t)}
                    disabled={disabled}
                    title={disabled ? 'No GRN exists for this PO yet' : ''}
                    className={cn(
                      'flex-1 px-3 py-1.5 text-xs font-medium',
                      matchType === t ? 'bg-teal-600 text-white' : 'bg-background hover:bg-muted',
                      disabled && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {t === '2way' ? '2-way (Inv ↔ PO)' : '3-way (Inv ↔ PO ↔ GRN)'}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
