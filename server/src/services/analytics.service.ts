// Pure helpers for the analytics module. No Prisma — DB I/O lives in routes;
// these compute the KPI numbers from already-loaded data so each formula is
// directly unit-testable (see __tests__/analytics.test.ts).

// ── DPO (Days Payable Outstanding) ────────────────────────────────────────
// DPO = (AP balance / total spend over the period) × days-in-period.
// Returns 0 when there's no spend (can't divide); negative balance is clamped
// to 0 (defensive — a credit AP balance is structurally meaningless here).
export function computeDpo(
  apBalance: number,
  totalSpend: number,
  daysInPeriod = 30,
): number {
  if (totalSpend <= 0) return 0
  const ap = Math.max(0, apBalance)
  return Math.round((ap / totalSpend) * daysInPeriod * 10) / 10
}

// ── Maverick spend % (POs without a linked PR) ────────────────────────────
// Maverick = no upstream PR ⇒ unplanned/uncontrolled buy. Returned as a
// percentage 0-100, one decimal. Returns 0 when there are no POs (avoids NaN).
export function computeMaverickPct(
  posWithoutPr: number,
  totalPos: number,
): number {
  if (totalPos <= 0) return 0
  return Math.round((posWithoutPr / totalPos) * 1000) / 10
}

// ── On-time payment rate ──────────────────────────────────────────────────
// Of all invoices that have been paid (or are due now), how many landed on
// or before their dueDate? Invoices without a dueDate are excluded from
// both numerator and denominator (can't judge timeliness without one).
export interface OnTimeInvoice {
  dueDate:   Date | null
  paidAt:    Date | null
  status:    string   // 'PAID' | 'APPROVED' | ...
}

export function computeOnTimeRate(invoices: OnTimeInvoice[]): number {
  const judgeable = invoices.filter(i => i.dueDate)
  if (judgeable.length === 0) return 0
  const onTime = judgeable.filter(i => {
    if (i.status === 'PAID' && i.paidAt) {
      return i.paidAt.getTime() <= i.dueDate!.getTime()
    }
    // Not yet paid → "on time" only if due date is still in the future
    return Date.now() <= i.dueDate!.getTime()
  })
  return Math.round((onTime.length / judgeable.length) * 1000) / 10
}

// ── MSME days remaining ───────────────────────────────────────────────────
// Whole-day delta between the statutory deadline and today. Negative result
// = breached; the route uses this to flag invoices for the MSME register.
// Mirrors the payment-engine implementation (kept independent here so
// analytics can be tested without pulling payment-engine into the dep graph).
export function computeMsmeDaysRemaining(deadline: Date, today: Date): number {
  const dayMs = 86_400_000
  const dueMid = Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate())
  const todMid = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return Math.round((dueMid - todMid) / dayMs)
}

// ── Budget utilisation with run-rate projection ───────────────────────────
// Returns the standard utilisation pct (used / total) plus a projected
// full-year spend based on the current monthly run rate. A signal is
// surfaced when the projection blows past budget — "RED" for overrun, "AMBER"
// for near-overrun (within tolerance), "GREEN" otherwise.
export interface BudgetUtilisationInput {
  budget:        number    // revised budget for the FY
  committed:     number    // PO commitments (open)
  actual:        number    // invoice actuals
  monthsElapsed: number    // 0-12 — how many months of the FY have completed
  toleranceZonePct?: number  // default 10 — within this of 100% = AMBER
}

export interface BudgetUtilisationResult {
  utilPct:        number    // (committed+actual) / budget * 100, 1 decimal
  monthlyRunRate: number    // actual / monthsElapsed
  projectedFY:    number    // monthlyRunRate * 12
  variance:       number    // projectedFY - budget (positive = overrun)
  signal:         'RED' | 'AMBER' | 'GREEN'
}

export function computeBudgetUtilisation(
  input: BudgetUtilisationInput,
): BudgetUtilisationResult {
  const tolerance = input.toleranceZonePct ?? 10
  const used      = input.committed + input.actual
  const utilPct   = input.budget > 0
    ? Math.round((used / input.budget) * 1000) / 10
    : 0
  const monthlyRunRate = input.monthsElapsed > 0
    ? Math.round((input.actual / input.monthsElapsed) * 100) / 100
    : 0
  const projectedFY = Math.round(monthlyRunRate * 12 * 100) / 100
  const variance    = Math.round((projectedFY - input.budget) * 100) / 100

  let signal: 'RED' | 'AMBER' | 'GREEN' = 'GREEN'
  if (input.budget > 0) {
    const projPct = (projectedFY / input.budget) * 100
    if (projPct > 100) signal = 'RED'
    else if (projPct > (100 - tolerance)) signal = 'AMBER'
  }

  return { utilPct, monthlyRunRate, projectedFY, variance, signal }
}

// ── Cycle days helper (avg / p50 / p90) ───────────────────────────────────
// Returns whole-day rounded percentiles. Used by procurement to surface PR
// → PO cycle health and AP to surface invoice → approval cycle health.
export function computeCyclePercentiles(deltas: number[]): {
  avg: number; p50: number; p90: number;
} {
  if (deltas.length === 0) return { avg: 0, p50: 0, p90: 0 }
  const sorted = [...deltas].sort((a, b) => a - b)
  const avg = Math.round((sorted.reduce((s, n) => s + n, 0) / sorted.length) * 10) / 10
  const p50 = sorted[Math.floor(sorted.length * 0.5)]
  const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))]
  return { avg, p50, p90 }
}

// ── Vendor concentration risk ─────────────────────────────────────────────
// Risk level rises as a single vendor's share of spend grows — concentration
// in one supplier is a continuity-of-supply risk.
//  ≥40% → HIGH, ≥20% → MEDIUM, otherwise LOW.
export function classifyVendorRisk(spendPct: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (spendPct >= 40) return 'HIGH'
  if (spendPct >= 20) return 'MEDIUM'
  return 'LOW'
}

// ── Aging bucket classifier ───────────────────────────────────────────────
// Standard 0-30 / 31-60 / 61-90 / 90+ buckets for AP aging.
export type AgingBucket = '0-30' | '31-60' | '61-90' | '90+'

export function classifyAging(ageDays: number): AgingBucket {
  if (ageDays <= 30) return '0-30'
  if (ageDays <= 60) return '31-60'
  if (ageDays <= 90) return '61-90'
  return '90+'
}

// ── P2P maturity composite (0-100) ────────────────────────────────────────
// Five-dimension composite score. Each dimension is supplied 0-100; the
// composite is the simple average (equal weighting). Exported so the CEO
// tab can request individual dimension scores from the same calculator the
// composite uses.
export interface MaturityDimensions {
  digitisation:      number   // touchless / STP
  controlsCompliance: number  // approval workflow, segregation, audit trail
  workingCapital:    number   // DPO discipline + MSME compliance
  vendorRisk:        number   // concentration, KYC, MSME register
  insightAnalytics:  number   // historical data captured, real-time KPIs
}

export function computeMaturityScore(d: MaturityDimensions): number {
  const total = d.digitisation + d.controlsCompliance + d.workingCapital + d.vendorRisk + d.insightAnalytics
  return Math.round(total / 5)
}
