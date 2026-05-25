// Dashboard KPI calculations — pure helpers extracted from the route handler
// so the maths can be unit-tested without a Prisma client. The async wrapper
// in routes/dashboard.ts does the I/O and delegates the calculations here.

export interface InvoiceForKpi {
  /** Lane the invoice was routed to by the match agent. */
  apLane:      'STP' | 'REVIEW' | 'MANUAL' | string | null
  status:      string
  createdAt:   Date | string
  approvedAt?: Date | string | null
  matchScore?: number | null
  // `totalAmount` is intentionally NOT declared here even though callers
  // (routes/dashboard.ts) select it from Prisma. Adding it would force the
  // interface to also accept Prisma's `Decimal` type, which leaks decimal.js
  // into a file that's meant to be a pure helper. None of the calculators
  // below read it, so dropping it from the public shape is the cleaner fix.
}

const toDate = (d: Date | string): Date => d instanceof Date ? d : new Date(d)

// ── STP rate ────────────────────────────────────────────────────────────────
// Percentage of invoices routed to the STP lane. Counts every invoice in the
// supplied window — manual + review + STP — so the denominator stays honest
// when no invoices are STP-eligible.
export function calcStpRate(invoices: InvoiceForKpi[]): { rate: number; stpCount: number; totalCount: number } {
  if (invoices.length === 0) return { rate: 0, stpCount: 0, totalCount: 0 }
  const stpCount = invoices.filter(i => i.apLane === 'STP').length
  return {
    rate:       Math.round((stpCount / invoices.length) * 1000) / 10,   // 1 decimal
    stpCount,
    totalCount: invoices.length,
  }
}

// ── Avg processing time ─────────────────────────────────────────────────────
// Average days from createdAt → approvedAt over invoices that actually got
// approved in the window. Returns null when there's nothing to average so
// the UI can render "—" instead of "0.0 days".
export function calcAvgProcessingDays(invoices: InvoiceForKpi[]): number | null {
  const completed = invoices.filter(i => !!i.approvedAt && i.status === 'APPROVED')
  if (completed.length === 0) return null
  const totalMs = completed.reduce((s, i) => {
    return s + (toDate(i.approvedAt!).getTime() - toDate(i.createdAt).getTime())
  }, 0)
  const avgDays = totalMs / completed.length / 86_400_000
  return Math.round(avgDays * 10) / 10
}

// ── Match-score histogram ───────────────────────────────────────────────────
// Buckets per the prompt: 0–50, 51–70, 71–85, 86–100. Invoices with no score
// (null matchScore) are excluded so the chart doesn't show a misleading
// "low score" spike for unscored DRAFT rows.
export interface HistogramBucket { label: string; min: number; max: number; count: number }
export function matchScoreHistogram(invoices: InvoiceForKpi[]): HistogramBucket[] {
  const buckets: HistogramBucket[] = [
    { label: '0–50',   min: 0,   max: 50,  count: 0 },
    { label: '51–70',  min: 51,  max: 70,  count: 0 },
    { label: '71–85',  min: 71,  max: 85,  count: 0 },
    { label: '86–100', min: 86,  max: 100, count: 0 },
  ]
  for (const inv of invoices) {
    if (inv.matchScore == null) continue
    const s = inv.matchScore
    const b = buckets.find(b => s >= b.min && s <= b.max)
    if (b) b.count++
  }
  return buckets
}

// ── Lane distribution ──────────────────────────────────────────────────────
// {STP, REVIEW, MANUAL, UNCATEGORIZED} counts. Anything with a null/unknown
// apLane lands in UNCATEGORIZED so the donut total matches the invoice count.
export function calcLaneDistribution(invoices: InvoiceForKpi[]): { lane: string; count: number }[] {
  const counts: Record<string, number> = { STP: 0, REVIEW: 0, MANUAL: 0, UNCATEGORIZED: 0 }
  for (const inv of invoices) {
    const lane = inv.apLane
    if (lane === 'STP' || lane === 'REVIEW' || lane === 'MANUAL') counts[lane]++
    else counts.UNCATEGORIZED++
  }
  return Object.entries(counts)
    .filter(([, c]) => c > 0)
    .map(([lane, count]) => ({ lane, count }))
}

// ── Month bounds ────────────────────────────────────────────────────────────
// Returns the first millisecond of the given month and the last millisecond
// of the same month. Used by the route handler when callers pass no date
// range (defaults to "this month"). Pure so month-boundary tests can exercise
// it without faking system time.
export function monthBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
  const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

// ── Parse the dateFrom/dateTo query params with safe fallbacks ──────────────
// `now` is injectable so tests can pin the clock. Falls back to the current
// month when both params are missing. Invalid ISO strings are silently
// ignored — the fallback kicks in so the dashboard never 400s on a typo.
export function resolveDateRange(
  dateFrom: string | undefined,
  dateTo:   string | undefined,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const parse = (s: string | undefined): Date | null => {
    if (!s) return null
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }
  const from = parse(dateFrom)
  const to   = parse(dateTo)
  if (from && to)  return { start: from, end: to }
  if (from)        return { start: from, end: now }
  if (to)          return { start: new Date(0), end: to }
  return monthBounds(now)
}
