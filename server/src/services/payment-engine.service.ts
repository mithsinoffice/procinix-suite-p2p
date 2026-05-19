// Pure helpers for the payment module. No Prisma — all DB I/O lives in the
// payments routes; these functions return data shapes the routes persist.
//
// Three areas:
//   1. MSME compliance — 45-day statutory deadline tracking
//   2. Late-payment interest (MSMED Act §16: 3x bank rate)
//   3. JV construction on batch execution (DR AP / CR Bank, plus TDS leg)
//
// Tested via Vitest with 18 specs — see payment-engine.test.ts.

import type { JournalEntryCreateInput } from './provision-engine.service.js'
import { periodOf } from './provision-engine.service.js'

// ── MSME statutory deadline (45 days max under MSMED Act §15) ─────────────
// vendorCreditDays is the agreed payment terms on the vendor master. The
// statute caps the legal limit at 45 days regardless of any contractual
// term beyond that — so the effective due date is the minimum of the two.
export function computeMsmePaymentDue(invoiceDate: Date, vendorCreditDays: number): Date {
  const days = Math.min(45, Math.max(0, vendorCreditDays))
  const due = new Date(invoiceDate.getTime())
  due.setUTCDate(due.getUTCDate() + days)
  return due
}

// Whole-day delta. Negative result = overdue. Same-day = 0.
export function computeMsmeDaysRemaining(msmePaymentDue: Date, today: Date): number {
  const dayMs = 86_400_000
  const dueMid = Date.UTC(msmePaymentDue.getUTCFullYear(), msmePaymentDue.getUTCMonth(), msmePaymentDue.getUTCDate())
  const todMid = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return Math.round((dueMid - todMid) / dayMs)
}

export type MsmePriority = 'CRITICAL' | 'AT_RISK' | 'NORMAL'

// CRITICAL <7d (red), AT_RISK 7-15d (amber), NORMAL >15d (green).
// Boundaries: 7 → CRITICAL (< 7 means 6 and below); 15 → AT_RISK (< 15 means
// 14 and below). Overdue (negative days) lands in CRITICAL.
export function getMsmePriority(daysRemaining: number): MsmePriority {
  if (daysRemaining < 7)  return 'CRITICAL'
  if (daysRemaining < 15) return 'AT_RISK'
  return 'NORMAL'
}

// MSMED Act §16 interest: 3 × RBI bank rate, compounded monthly. Simplified
// here to simple interest for batch-time display (the compounding can be
// computed at the finance-month-end if needed). rbiRate is the percentage
// (e.g. 6.5 for 6.5%).
export function computeInterest(amount: number, daysLate: number, rbiRate: number): number {
  if (amount <= 0 || daysLate <= 0) return 0
  const annualRate = (3 * rbiRate) / 100
  return Math.round(amount * annualRate * daysLate / 365 * 100) / 100
}

// ── Batch ref generation ──────────────────────────────────────────────────
export function generateBatchRef(sequence: number, year?: number): string {
  const y = year ?? new Date().getUTCFullYear()
  return `PAY-${y}-${String(sequence).padStart(4, '0')}`
}

// ── Batch totals ──────────────────────────────────────────────────────────
export interface BatchLineInput {
  invoiceAmount:   number
  tdsAmount:       number
  advanceAdjusted: number
  paymentAmount:   number
}

export interface BatchTotals {
  totalInvoice:    number
  totalTds:        number
  totalAdvanceAdj: number
  totalNetPayable: number
}

export function computeBatchTotals(lines: BatchLineInput[]): BatchTotals {
  return lines.reduce<BatchTotals>((acc, l) => ({
    totalInvoice:    round2(acc.totalInvoice    + Number(l.invoiceAmount   || 0)),
    totalTds:        round2(acc.totalTds        + Number(l.tdsAmount       || 0)),
    totalAdvanceAdj: round2(acc.totalAdvanceAdj + Number(l.advanceAdjusted || 0)),
    totalNetPayable: round2(acc.totalNetPayable + Number(l.paymentAmount   || 0)),
  }), { totalInvoice: 0, totalTds: 0, totalAdvanceAdj: 0, totalNetPayable: 0 })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Payment JV construction ───────────────────────────────────────────────
export interface PaymentGLCodes {
  apGlCode:        string  // Accounts Payable — credited (cleared) on payment
  bankGlCode:      string  // Bank account — debited (cash out)
  tdsPayableGlCode?: string // 194C / 194J / 194I payable — only if line.tdsAmount > 0
}

export interface PaymentLineForJv {
  id:            string
  tenantId:      string
  batchId:       string
  invoiceId:     string | null
  vendorId:      string
  paymentAmount: number
  tdsAmount:     number
  paymentMethod: string
}

// Returns 1-2 JVs per line:
//   JV-1: DR Accounts Payable (clears the liability), CR Bank (cash out)
//         — amount: paymentAmount + tdsAmount (the gross invoice amount
//         being settled; the AP balance was the gross at booking time).
//   JV-2 (only if tdsAmount > 0):
//         DR Bank-cleared portion / CR TDS Payable
//         — moves the withheld portion into the section-specific TDS
//         payable account. Posted on the same date as the cash JV.
//
// postingDate defaults to today; caller can override via opts.
export function buildPaymentJVs(
  line:    PaymentLineForJv,
  glCodes: PaymentGLCodes,
  createdBy: string,
  opts:    { postingDate?: Date; invoiceRef?: string } = {},
): JournalEntryCreateInput[] {
  const postingDate = opts.postingDate ?? new Date()
  const ref         = opts.invoiceRef ?? `Invoice ${line.invoiceId?.slice(0, 8) ?? line.id.slice(0, 8)}`
  const period      = periodOf(postingDate)

  const jvs: JournalEntryCreateInput[] = [{
    tenantId:    line.tenantId,
    entryDate:   postingDate,
    postingDate,
    period,
    entryType:   'MANUAL', // payment JVs reuse MANUAL — distinguished by narration + invoiceId
    status:      'POSTED',
    debitGlCode: glCodes.apGlCode,
    creditGlCode: glCodes.bankGlCode,
    amount:      line.paymentAmount,
    currencyCode: 'INR',
    narration:   `${ref} — payment via ${line.paymentMethod}`,
    invoiceId:   line.invoiceId,
    createdBy,
  }]

  if (line.tdsAmount > 0 && glCodes.tdsPayableGlCode) {
    jvs.push({
      tenantId:    line.tenantId,
      entryDate:   postingDate,
      postingDate,
      period,
      entryType:   'MANUAL',
      status:      'POSTED',
      debitGlCode: glCodes.apGlCode,
      creditGlCode: glCodes.tdsPayableGlCode,
      amount:      line.tdsAmount,
      currencyCode: 'INR',
      narration:   `${ref} — TDS withheld`,
      invoiceId:   line.invoiceId,
      createdBy,
    })
  }

  return jvs.map(jv => ({ ...jv, amount: round2(jv.amount) }))
}
