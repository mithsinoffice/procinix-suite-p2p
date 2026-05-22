// Pure helpers for the direct-invoice form. Extracted so they're unit-
// testable in isolation — the form file uses RHF (per CLAUDE.md HARD RULE)
// and pulls these via plain function calls during recalc.

export interface GstSplit {
  cgst: number
  sgst: number
  igst: number
}

export interface JvEntry {
  type:        'DR' | 'CR'
  glCode:      string | null   // null when no GL resolved (UI shows "GL not configured")
  glName:      string | null
  glDescription: string
  costCentre:  string | null
  narration:   string
  amount:      number
}

export interface CrossCheck {
  baseMatch:    boolean
  grossMatch:   boolean
  /** Δ between base and lineItems sum (signed: positive ⇒ base > lines). */
  baseDelta:    number
  /** Δ between (base + tax) and gross (signed: positive ⇒ gross > base + tax). */
  grossDelta:   number
  hasLines:     boolean
}

// ── Pure: GST split ─────────────────────────────────────────────────────────
//
// India GST regime: first 2 digits of GSTIN encode the state. When vendor's
// state matches the bill-to / entity state, the tax is intra-state (CGST +
// SGST, 50/50). When different, it's inter-state (IGST in full). Either
// GSTIN missing falls back to intra-state — the reviewer corrects on the
// form. Same logic the server-side ingest applies.

export function computeGstSplit(
  vendorGstin:      string | null | undefined,
  billToStateCode:  string | null | undefined,
  amount:           number,
  gstRate:          number,
): GstSplit {
  const tax = (Number(amount) || 0) * ((Number(gstRate) || 0) / 100)
  if (tax === 0) return { cgst: 0, sgst: 0, igst: 0 }

  const vendorState = vendorGstin ? vendorGstin.slice(0, 2) : null
  const interState  = vendorState !== null && billToStateCode !== null && billToStateCode !== undefined && vendorState !== billToStateCode

  if (interState) return { cgst: 0, sgst: 0, igst: tax }
  return { cgst: tax / 2, sgst: tax / 2, igst: 0 }
}

// ── Pure: line totals ───────────────────────────────────────────────────────
//
// Folds qty × rate, discount, GST split, TDS into a single line snapshot.
// Mirrors the existing `recalcLine` in InvoiceFormPage but with a smaller,
// test-friendly surface.

export interface LineItemInput {
  quantity:       number
  unitPrice:      number
  gstRate?:       number
  tdsRate?:       number
  discountPct?:   number
}

export interface LineItemTotals {
  taxableAmount: number
  cgst:          number
  sgst:          number
  igst:          number
  tdsAmount:     number
  /** Line total = taxable + GST − TDS. The TDS is withheld at payment, but
   * carried on the line so the JV picks it up. */
  total:         number
}

// Rounding helpers — JS multiplication accumulates floating-point drift
// (e.g. 0.1 + 0.2 = 0.30000000000000004). Every monetary intermediate value
// is rounded so "qty=1, rate=125000" doesn't yield "125000.0000001". The
// same helpers are inlined into the form's local recalcLine.
const round2 = (n: number) => Math.round(n * 100) / 100
const round3 = (n: number) => Math.round(n * 1000) / 1000

export function computeLineItemTotals(
  line:    LineItemInput,
  split:   GstSplit,
  tdsRate: number | undefined = undefined,
): LineItemTotals {
  const qty           = round3(Number(line.quantity)  || 0)
  const unitPrice     = round2(Number(line.unitPrice) || 0)
  const discountPct   = Number(line.discountPct) || 0
  const tdsPct        = Number(tdsRate ?? line.tdsRate) || 0

  const lineBase      = round2(qty * unitPrice)
  const discountAmt   = round2((lineBase * discountPct) / 100)
  const taxableAmount = round2(lineBase - discountAmt)
  const gstTotal      = round2(split.cgst + split.sgst + split.igst)
  const tdsAmount     = round2((taxableAmount * tdsPct) / 100)
  const total         = round2(taxableAmount + gstTotal - tdsAmount)

  return {
    taxableAmount,
    cgst:      round2(split.cgst),
    sgst:      round2(split.sgst),
    igst:      round2(split.igst),
    tdsAmount,
    total,
  }
}

// ── Pure: cross-check ───────────────────────────────────────────────────────
//
// The reviewer enters Base + Gross in the financial summary; the line items
// determine their own taxable + tax sum. Three balances need to hold:
//   1. base   == Σ taxableAmount      (lines back up the base figure)
//   2. base + Σ tax = gross           (the GST adds up)
// Both are reported as boolean + signed delta so the UI can phrase the
// mismatch directionally ("amount higher than lines by ₹X").

export interface CrossCheckLineInput {
  taxableAmount?: number
  cgstAmount?:    number
  sgstAmount?:    number
  igstAmount?:    number
}

const TOLERANCE = 0.5  // ₹0.50 — paise rounding tolerance on small invoices

export function computeCrossCheck(
  baseAmount:  number,
  grossAmount: number,
  lines:       CrossCheckLineInput[],
): CrossCheck {
  const base  = Number(baseAmount)  || 0
  const gross = Number(grossAmount) || 0

  const linesTaxable = lines.reduce((s, l) => s + (Number(l.taxableAmount) || 0), 0)
  const linesTax     = lines.reduce((s, l) => s + (Number(l.cgstAmount) || 0) + (Number(l.sgstAmount) || 0) + (Number(l.igstAmount) || 0), 0)

  // Δ tolerance scales with magnitude so multi-line paise rounding doesn't
  // flag false mismatches on large invoices.
  const tol = Math.max(TOLERANCE, Math.max(base, gross) * 0.002)

  const baseDelta  = base - linesTaxable
  const grossDelta = gross - (base + linesTax)

  return {
    baseMatch:  lines.length === 0 ? true : Math.abs(baseDelta)  < tol,
    grossMatch: lines.length === 0 ? true : Math.abs(grossDelta) < tol,
    baseDelta,
    grossDelta,
    hasLines:   lines.length > 0,
  }
}

// ── Pure: GL picker ─────────────────────────────────────────────────────────
//
// The JV preview needs to look up specific GLs (Accounts Payable, Input GST,
// TDS Payable, Retention). The seeded chart is not perfectly uniform — AP is
// split across "Accounts Payable — IT Vendors / Services / Rent", TDS by
// section (194Q / 194C / 194I / 194J). This picker takes a list of name
// patterns to match against and returns the first match. Returns null when
// nothing resolves — the JV UI surfaces "GL not configured" instead of
// crashing on a hard-coded code.

export interface GlCodeRef {
  id:          string
  code:        string
  name:        string
  accountType?: string
}

export function pickGl(
  codes:    GlCodeRef[],
  match:    { contains?: string[]; code?: string; accountType?: string },
): GlCodeRef | null {
  const candidates = codes.filter(c => {
    if (match.code && c.code !== match.code) return false
    if (match.accountType && c.accountType && c.accountType !== match.accountType) return false
    if (match.contains && match.contains.length > 0) {
      const lower = c.name.toLowerCase()
      // ALL `contains` terms must appear in the name (AND semantics).
      return match.contains.every(needle => lower.includes(needle.toLowerCase()))
    }
    return true
  })
  return candidates[0] ?? null
}

// ── Pure: JV entries ────────────────────────────────────────────────────────
//
// Builds a balanced Dr=Cr set from form state. The reviewer sees a
// best-effort preview; final posting happens on approve in the accounting
// module. When a GL can't be resolved (e.g. Input CGST/SGST/IGST aren't in
// the seed), the entry carries glCode=null and the UI flags "GL not
// configured" so the user can pick one before submit.

export interface JvLineInput {
  description?:   string
  taxableAmount:  number
  cgstAmount:     number
  sgstAmount:     number
  igstAmount:     number
  tdsAmount:      number
  glCodeId?:      string
  /** Resolved GL info — caller looks up id → name/code before passing. */
  glCode?:        string
  glName?:        string
  costCentre?:    string | null
}

export interface JvBuildContext {
  /** Resolved GL refs for the AP-side credits. null when not resolved. */
  apGl:        GlCodeRef | null
  cgstGl:      GlCodeRef | null
  sgstGl:      GlCodeRef | null
  igstGl:      GlCodeRef | null
  tdsGl:       GlCodeRef | null
  retentionGl: GlCodeRef | null
}

export function computeJvEntries(
  lines:        JvLineInput[],
  retention:    number,
  ctx:          JvBuildContext,
): JvEntry[] {
  const out: JvEntry[] = []

  // DR side — per-line expense + per-line input GST. Each line gets its own
  // expense Dr so the JV mirrors line allocation; the GST debits are
  // aggregated separately at the bottom of the DR block.
  let cgstTotal = 0
  let sgstTotal = 0
  let igstTotal = 0
  let tdsTotal  = 0

  for (const l of lines) {
    if ((Number(l.taxableAmount) || 0) > 0) {
      out.push({
        type:        'DR',
        glCode:      l.glCode ?? null,
        glName:      l.glName ?? null,
        glDescription: l.glName ?? (l.glCode ?? 'Expense'),
        costCentre:  l.costCentre ?? null,
        narration:   l.description ?? '',
        amount:      Number(l.taxableAmount) || 0,
      })
    }
    cgstTotal += Number(l.cgstAmount) || 0
    sgstTotal += Number(l.sgstAmount) || 0
    igstTotal += Number(l.igstAmount) || 0
    tdsTotal  += Number(l.tdsAmount)  || 0
  }

  if (cgstTotal > 0) {
    out.push({
      type:        'DR',
      glCode:      ctx.cgstGl?.code ?? null,
      glName:      ctx.cgstGl?.name ?? null,
      glDescription: ctx.cgstGl?.name ?? 'Input CGST',
      costCentre:  null,
      narration:   'Input CGST',
      amount:      cgstTotal,
    })
  }
  if (sgstTotal > 0) {
    out.push({
      type:        'DR',
      glCode:      ctx.sgstGl?.code ?? null,
      glName:      ctx.sgstGl?.name ?? null,
      glDescription: ctx.sgstGl?.name ?? 'Input SGST',
      costCentre:  null,
      narration:   'Input SGST',
      amount:      sgstTotal,
    })
  }
  if (igstTotal > 0) {
    out.push({
      type:        'DR',
      glCode:      ctx.igstGl?.code ?? null,
      glName:      ctx.igstGl?.name ?? null,
      glDescription: ctx.igstGl?.name ?? 'Input IGST',
      costCentre:  null,
      narration:   'Input IGST',
      amount:      igstTotal,
    })
  }

  // CR side — AP for the net payable (line totals minus retention), separate
  // Retention Payable Cr when retention > 0, separate TDS Payable Cr for the
  // withholding.
  const lineGrosses = lines.reduce(
    (s, l) => s + (Number(l.taxableAmount) || 0) + (Number(l.cgstAmount) || 0) + (Number(l.sgstAmount) || 0) + (Number(l.igstAmount) || 0),
    0,
  )
  const netToVendor = lineGrosses - tdsTotal - retention

  if (netToVendor > 0) {
    out.push({
      type:        'CR',
      glCode:      ctx.apGl?.code ?? null,
      glName:      ctx.apGl?.name ?? null,
      glDescription: ctx.apGl?.name ?? 'Accounts Payable',
      costCentre:  null,
      narration:   'Net payable to vendor',
      amount:      netToVendor,
    })
  }
  if (retention > 0) {
    out.push({
      type:        'CR',
      glCode:      ctx.retentionGl?.code ?? null,
      glName:      ctx.retentionGl?.name ?? null,
      glDescription: ctx.retentionGl?.name ?? 'Retention Payable',
      costCentre:  null,
      narration:   'Retention withheld',
      amount:      retention,
    })
  }
  if (tdsTotal > 0) {
    out.push({
      type:        'CR',
      glCode:      ctx.tdsGl?.code ?? null,
      glName:      ctx.tdsGl?.name ?? null,
      glDescription: ctx.tdsGl?.name ?? 'TDS Payable',
      costCentre:  null,
      narration:   'TDS withheld',
      amount:      tdsTotal,
    })
  }

  return out
}

export function jvTotals(entries: JvEntry[]): { totalDr: number; totalCr: number; balanced: boolean; delta: number } {
  const totalDr = entries.filter(e => e.type === 'DR').reduce((s, e) => s + e.amount, 0)
  const totalCr = entries.filter(e => e.type === 'CR').reduce((s, e) => s + e.amount, 0)
  const delta   = totalDr - totalCr
  return { totalDr, totalCr, balanced: Math.abs(delta) < 0.5, delta }
}

// ── Pure: PAN from GSTIN ────────────────────────────────────────────────────
// Indian GSTIN format: 2-digit state + 10-char PAN + 1-char entity + Z + checksum.
// Chars 3-12 (0-indexed 2-12) are the PAN.

export function panFromGstin(gstin: string | null | undefined): string | null {
  if (!gstin || gstin.length < 12) return null
  return gstin.slice(2, 12).toUpperCase()
}

// ── Pure: state-code lookup ─────────────────────────────────────────────────
// India GST state codes (2-digit) map to canonical state names. Used by the
// invoice form to align three inconsistent inputs:
//   - Vendor.stateCode (numeric "27")
//   - Entity.state (free text "Maharashtra")
//   - Location.state (free text "Maharashtra")
// Without normalisation the GST split compares "27" to "Maharashtra" and
// always reports interstate (wrong CGST/SGST/IGST split).
export const STATE_CODE_TO_NAME: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
}

const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODE_TO_NAME).map(([code, name]) => [name.toLowerCase(), code]),
)

// Normalise any state representation to its 2-digit GST code. Accepts:
//   "27"                          → "27"
//   "Maharashtra"                 → "27"
//   "maharashtra"                 → "27"
//   "Maharashtra (27)"            → "27"   (parses the parenthesised code)
//   "27-Maharashtra"              → "27"   (prefix code)
//   "Place of Supply: Maharashtra" → "27"  (suffix lookup)
//   ""                            → ""
//   null / undefined / unknown    → ""
export function normalizeStateCode(s: string | null | undefined): string {
  if (!s) return ''
  const str = String(s).trim()
  if (!str) return ''
  // Bare 2-digit code
  const bare = str.match(/^(\d{2})$/)
  if (bare) return bare[1]
  // Parenthesised code "Maharashtra (27)"
  const paren = str.match(/\((\d{2})\)/)
  if (paren) return paren[1]
  // Prefix code "27-Maharashtra" / "27 Maharashtra"
  const prefix = str.match(/^(\d{2})[\s\-–:]/)
  if (prefix) return prefix[1]
  // Exact name lookup
  const lc = str.toLowerCase()
  if (STATE_NAME_TO_CODE[lc]) return STATE_NAME_TO_CODE[lc]
  // Last-resort: any known state name appearing as a token in the string.
  // Catches "Place of Supply: Maharashtra" and similar prefixes.
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    // Word-boundary match so "goa" doesn't match "gangtok".
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i')
    if (re.test(str)) return code
  }
  return ''
}
