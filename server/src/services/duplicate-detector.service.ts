// Fuzzy duplicate-invoice detection.
//
// Runs after every ingestion path (email/n8n, manual upload, vendor portal)
// and on-demand via GET /api/invoices/:id/duplicate-check.
//
// Design:
//   - One Prisma findMany pulls every candidate that *could* match (same
//     invoice number, same vendor, or same GSTIN, within the tenant, excluding
//     rejected/cancelled rows and the source invoice itself).
//   - Five rules evaluate in memory; the highest-confidence match per
//     candidate wins. No N+1 queries.
//   - Pure helpers (`levenshtein`, `similarity`, `runRulesInMemory`) are
//     exported so the test suite can pin behaviour without a DB.

import type { PrismaClient } from '@prisma/client'

// ── Types ───────────────────────────────────────────────────────────────────

export interface IncomingInvoice {
  invoiceNumber?: string
  vendorId?:      string
  vendorName?:    string
  vendorGstin?:   string
  totalAmount?:   number
  invoiceDate?:   string         // YYYY-MM-DD or any Date-parseable form
  lineItems?:     { description: string; amount: number }[]
  /** Exclude this invoice from candidate set — used on edit-mode re-checks. */
  sourceId?:      string
}

export type MatchType =
  | 'EXACT'
  | 'FUZZY_NUMBER'
  | 'FUZZY_AMOUNT'
  | 'FUZZY_VENDOR_DATE'
  | 'LINE_ITEM'

export interface DuplicateMatch {
  invoiceId:     string
  invoiceNumber: string
  vendorName:    string
  totalAmount:   number
  invoiceDate:   string          // ISO YYYY-MM-DD
  matchType:     MatchType
  confidence:    number          // 0..1
  reason:        string
}

export interface DuplicateCheckResult {
  isDuplicate:  boolean
  isSuspicious: boolean
  matches:      DuplicateMatch[]
}

/** Candidate row shape expected by the in-memory rule runner. Mirrors what
 *  the Prisma findMany returns with the lines + vendor includes. */
export interface CandidateInvoice {
  id:            string
  invoiceNumber: string
  vendorId:      string | null
  vendorGSTIN:   string | null
  invoiceDate:   Date | string
  totalAmount:   number | string | { toString(): string }
  vendor?:       { legalName?: string | null } | null
  lines?:        { description: string | null; lineTotal: number | string | { toString(): string } }[]
}

const EXCLUDED_STATUSES = ['REJECTED', 'CANCELLED']

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Standard Levenshtein edit distance. Pure JS, no external dep. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = new Array<number>(n + 1)
  let curr = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    const tmp = prev; prev = curr; curr = tmp
  }
  return prev[n]
}

/** Similarity in [0, 1] derived from Levenshtein / max length. */
export function similarity(a: string, b: string): number {
  if (a === '' && b === '') return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (v == null) return 0
  return Number(typeof v === 'object' && 'toString' in (v as object) ? (v as { toString(): string }).toString() : v)
}

function toIsoDate(d: Date | string): string {
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 10)
}

function daysBetween(a: Date | string, b: Date | string): number {
  const da = (a instanceof Date ? a : new Date(a)).getTime()
  const db = (b instanceof Date ? b : new Date(b)).getTime()
  if (Number.isNaN(da) || Number.isNaN(db)) return Infinity
  return Math.abs(da - db) / 86_400_000
}

function pctDiff(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1)
  return Math.abs(a - b) / denom
}

// ── Rule engine (pure) ──────────────────────────────────────────────────────

/** Runs every rule against the pre-fetched candidate list. Highest-confidence
 *  match wins per candidate. Returns matches sorted by confidence desc. */
export function runRulesInMemory(
  incoming: IncomingInvoice,
  candidates: CandidateInvoice[],
): DuplicateCheckResult {
  const byCandidate = new Map<string, DuplicateMatch>()

  const incNum  = (incoming.invoiceNumber ?? '').trim()
  const incAmt  = typeof incoming.totalAmount === 'number' ? incoming.totalAmount : null
  const incDate = incoming.invoiceDate ? new Date(incoming.invoiceDate) : null

  const promote = (c: CandidateInvoice, partial: { matchType: MatchType; confidence: number; reason: string }) => {
    const existing = byCandidate.get(c.id)
    if (existing && existing.confidence >= partial.confidence) return
    byCandidate.set(c.id, {
      invoiceId:     c.id,
      invoiceNumber: c.invoiceNumber,
      vendorName:    c.vendor?.legalName ?? 'Unknown',
      totalAmount:   toNum(c.totalAmount),
      invoiceDate:   toIsoDate(c.invoiceDate),
      matchType:     partial.matchType,
      confidence:    partial.confidence,
      reason:        partial.reason,
    })
  }

  for (const c of candidates) {
    if (incoming.sourceId && c.id === incoming.sourceId) continue

    const cNum = (c.invoiceNumber ?? '').trim()
    const cAmt = toNum(c.totalAmount)
    const sameVendor = !!(
      (incoming.vendorId   && c.vendorId    && incoming.vendorId   === c.vendorId)
      || (incoming.vendorGstin && c.vendorGSTIN && incoming.vendorGstin === c.vendorGSTIN)
    )

    // Rule 1 — EXACT invoice number (already tenant-scoped via the DB filter).
    if (incNum && cNum && incNum === cNum) {
      promote(c, {
        matchType:  'EXACT',
        confidence: 1.0,
        reason:     `Exact match on invoice number "${cNum}"`,
      })
      continue
    }

    // Rule 2 — FUZZY_NUMBER: same vendor + similar invoice number.
    if (incNum && cNum && sameVendor) {
      const sim = similarity(incNum, cNum)
      if (sim >= 0.85) {
        promote(c, {
          matchType:  'FUZZY_NUMBER',
          confidence: 0.9,
          reason:     `Similar invoice number (${Math.round(sim * 100)}%): "${incNum}" ↔ "${cNum}"`,
        })
      }
    }

    // Rule 3 — FUZZY_AMOUNT: same vendor + ±2% amount + ±7 days + different number.
    if (sameVendor && incAmt != null && incDate && incNum !== cNum) {
      const pct  = pctDiff(cAmt, incAmt)
      const days = daysBetween(incDate, c.invoiceDate)
      if (pct <= 0.02 && days <= 7) {
        promote(c, {
          matchType:  'FUZZY_AMOUNT',
          confidence: 0.85,
          reason:     `Same vendor, similar amount (±2%), within 7 days`,
        })
      }
    }

    // Rule 4 — FUZZY_VENDOR_DATE: same vendor + exact date + ±10% amount.
    if (sameVendor && incAmt != null && incDate) {
      const incIso  = toIsoDate(incDate)
      const candIso = toIsoDate(c.invoiceDate)
      if (incIso && candIso && incIso === candIso) {
        const pct = pctDiff(cAmt, incAmt)
        if (pct <= 0.10) {
          promote(c, {
            matchType:  'FUZZY_VENDOR_DATE',
            confidence: 0.75,
            reason:     `Same vendor and date, similar amount`,
          })
        }
      }
    }

    // Rule 5 — LINE_ITEM: same vendor + ≥2 line descriptions/amounts match.
    if (sameVendor && incoming.lineItems?.length && c.lines?.length) {
      const incLines = incoming.lineItems.map(l => ({
        desc: l.description.trim().toLowerCase(),
        amt:  l.amount,
      }))
      let hits = 0
      for (const cl of c.lines) {
        const cDesc = (cl.description ?? '').trim().toLowerCase()
        const cAmt2 = toNum(cl.lineTotal)
        if (incLines.some(il => il.desc === cDesc && Math.abs(il.amt - cAmt2) < 0.01)) {
          hits++
        }
      }
      if (hits >= 2) {
        promote(c, {
          matchType:  'LINE_ITEM',
          confidence: 0.8,
          reason:     `${hits} matching line items found on another invoice`,
        })
      }
    }
  }

  const matches = [...byCandidate.values()].sort((a, b) => b.confidence - a.confidence)
  const isDuplicate  = matches.some(m => m.matchType === 'EXACT')
  const isSuspicious = matches.some(m => m.matchType !== 'EXACT')
  return { isDuplicate, isSuspicious, matches }
}

// ── DB-bound entry point ────────────────────────────────────────────────────

export async function detectDuplicates(
  incoming: IncomingInvoice,
  tenantId: string,
  db: PrismaClient,
): Promise<DuplicateCheckResult> {
  // Build the OR list so we only scan candidates that *could* match. Skip the
  // query entirely when there's nothing useful to look up against.
  const or: Record<string, unknown>[] = []
  if (incoming.invoiceNumber) or.push({ invoiceNumber: incoming.invoiceNumber })
  if (incoming.vendorId)      or.push({ vendorId:      incoming.vendorId })
  if (incoming.vendorGstin)   or.push({ vendorGSTIN:   incoming.vendorGstin })
  if (or.length === 0) {
    return { isDuplicate: false, isSuspicious: false, matches: [] }
  }

  const where: Record<string, unknown> = {
    tenantId,
    status: { notIn: EXCLUDED_STATUSES },
    OR: or,
  }
  if (incoming.sourceId) where.id = { not: incoming.sourceId }

  const candidates = await db.invoice.findMany({
    where: where as never,
    include: {
      vendor: { select: { legalName: true } },
      ...(incoming.lineItems && incoming.lineItems.length > 0
        ? { lines: { select: { description: true, lineTotal: true } } }
        : {}),
    },
    take: 200,
  }) as unknown as CandidateInvoice[]

  return runRulesInMemory(incoming, candidates)
}
