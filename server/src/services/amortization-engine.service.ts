// Pure helpers for the prepaid/amortization cycle. Mirrors provision-engine
// in shape: returns "create inputs" the caller persists. No Prisma here.
//
// Triggered by invoice approval when the invoice has period_from / period_to
// spanning > 1 calendar month. Phase 3 posts:
//   1. ACCRUAL JV — DR prepaid, CR AP, full invoice amount
//   2. AmortizationSchedule row — splits totalAmount across calendar months
//   3. First-month AMORTIZATION JV (if periodFrom is in the current month)
// Subsequent months come from the month-end job (Phase 4).
//
// Two split modes:
//   STRAIGHT_LINE   — totalAmount ÷ numberOfMonths, last month gets remainder
//   DAY_APPORTIONED — per-month amount = (daysInMonth ∩ [from,to] / totalDays)
//                     × totalAmount, last month picks up the rounding remainder

import type { JournalEntryCreateInput } from './provision-engine.service.js'
import { periodOf } from './provision-engine.service.js'

export type AmortizationBasis = 'STRAIGHT_LINE' | 'DAY_APPORTIONED'

export interface AmortizationScheduleInput {
  id:            string
  tenantId:      string
  invoiceId:     string
  invoiceLineId: string | null
  totalAmount:   number
  monthlyAmount: number
  periodFrom:    Date
  periodTo:      Date
  totalMonths:   Int
  basis:         AmortizationBasis | string
  status:        'ACTIVE' | 'COMPLETED' | 'CANCELLED' | string
  expenseGlCode: string
  prepaidGlCode: string
  apGlCode:      string
}

type Int = number

export interface AmortizationMonthRow {
  month:         string  // YYYY-MM
  amount:        number
  daysInPeriod:  number
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function daysBetweenInclusive(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.round(ms / 86_400_000) + 1
}

// Walk every calendar month touched by [from..to] and compute the day overlap
// each month contributes. Used for both modes — STRAIGHT_LINE just counts
// "months touched" to derive numberOfMonths, DAY_APPORTIONED uses the actual
// daysInPeriod for the weight.
function monthSpans(from: Date, to: Date): { year: number, month: number, start: Date, end: Date, days: number }[] {
  const result: { year: number, month: number, start: Date, end: Date, days: number }[] = []
  let y = from.getUTCFullYear()
  let m = from.getUTCMonth()
  const endY = to.getUTCFullYear()
  const endM = to.getUTCMonth()

  while (y < endY || (y === endY && m <= endM)) {
    const monthStart = new Date(Date.UTC(y, m, 1))
    const monthEnd   = new Date(Date.UTC(y, m + 1, 0))
    const segStart   = monthStart < from ? from : monthStart
    const segEnd     = monthEnd   > to   ? to   : monthEnd
    const days       = daysBetweenInclusive(segStart, segEnd)
    result.push({ year: y, month: m, start: segStart, end: segEnd, days })
    m++
    if (m > 11) { m = 0; y++ }
  }
  return result
}

export function computeAmortizationSchedule(
  totalAmount: number,
  periodFrom:  Date,
  periodTo:    Date,
  basis:       AmortizationBasis,
): AmortizationMonthRow[] {
  if (totalAmount < 0) throw new Error('totalAmount must be non-negative')
  if (periodTo < periodFrom) throw new Error('periodTo must be >= periodFrom')

  const months = monthSpans(periodFrom, periodTo)
  if (months.length === 0) return []

  // Single-month edge case — all amount lands in that month
  if (months.length === 1) {
    const m = months[0]
    return [{
      month:        `${m.year}-${pad2(m.month + 1)}`,
      amount:       round2(totalAmount),
      daysInPeriod: m.days,
    }]
  }

  if (basis === 'STRAIGHT_LINE') {
    const per = round2(totalAmount / months.length)
    const rows = months.map((m, idx) => {
      const last = idx === months.length - 1
      return {
        month:        `${m.year}-${pad2(m.month + 1)}`,
        // Last month picks up the remainder to avoid rounding drift
        amount:       last ? round2(totalAmount - per * (months.length - 1)) : per,
        daysInPeriod: m.days,
      }
    })
    return rows
  }

  // DAY_APPORTIONED
  const totalDays = daysBetweenInclusive(periodFrom, periodTo)
  let accumulated = 0
  const rows = months.map((m, idx) => {
    const last = idx === months.length - 1
    let amount: number
    if (last) {
      amount = round2(totalAmount - accumulated)
    } else {
      amount = round2((m.days / totalDays) * totalAmount)
      accumulated += amount
    }
    return {
      month:        `${m.year}-${pad2(m.month + 1)}`,
      amount,
      daysInPeriod: m.days,
    }
  })
  return rows
}

// `alreadyPosted` is the set of YYYY-MM months for which an AMORTIZATION JV
// already exists for this schedule (caller queries journal_entries by
// amortizationScheduleId). Pure check — DB stays in the route.
export function isAmortizationDue(
  schedule:      AmortizationScheduleInput,
  forMonth:      string,
  alreadyPosted: Set<string>,
): boolean {
  if (schedule.status !== 'ACTIVE') return false
  if (alreadyPosted.has(forMonth)) return false
  // forMonth must be within [periodFrom..periodTo]
  const fromMonth = periodOf(schedule.periodFrom)
  const toMonth   = periodOf(schedule.periodTo)
  return forMonth >= fromMonth && forMonth <= toMonth
}

function lastDayOfPeriodMonth(monthStr: string): Date {
  const [yStr, mStr] = monthStr.split('-')
  const y = Number(yStr), m = Number(mStr) - 1
  return new Date(Date.UTC(y, m + 1, 0))
}

export function buildAmortizationJV(
  schedule: AmortizationScheduleInput,
  month:    string,
  amount:   number,
  createdBy: string,
  opts: { invoiceRef?: string } = {},
): JournalEntryCreateInput {
  const postingDate = lastDayOfPeriodMonth(month)
  const monthIdx    = Number(month.split('-')[1]) - 1
  const yearStr     = month.split('-')[0]
  const monthName   = MONTHS_SHORT[monthIdx]
  const ref         = opts.invoiceRef ?? `Invoice ${schedule.invoiceId.slice(0, 8)}`
  return {
    tenantId:               schedule.tenantId,
    entryDate:              postingDate,
    postingDate,
    period:                 month,
    entryType:              'AMORTIZATION',
    status:                 'POSTED',
    debitGlCode:            schedule.expenseGlCode,
    creditGlCode:           schedule.prepaidGlCode,
    amount,
    currencyCode:           'INR',
    narration:              `${ref} — ${monthName} ${yearStr} amortization`,
    invoiceId:              schedule.invoiceId,
    invoiceLineId:          schedule.invoiceLineId,
    amortizationScheduleId: schedule.id,
    createdBy,
  }
}

// ACCRUAL JV — fires once on invoice approval. Two flavors:
//   period > 1 month → DR prepaid, CR AP, full invoice amount (then
//                       AMORTIZATION JVs drain prepaid into expense each month)
//   single/no period → DR expense, CR AP (caller decides which GLs to pass)
export function buildAccrualJV(
  invoice: {
    id:           string
    tenantId:     string
    totalAmount:  number
    invoiceDate:  Date
    invoiceRef?:  string | null
    currencyCode?: string | null
  },
  glCodes:   { debitGlCode: string, creditGlCode: string },
  createdBy: string,
): JournalEntryCreateInput {
  const ref = invoice.invoiceRef ?? `Invoice ${invoice.id.slice(0, 8)}`
  return {
    tenantId:     invoice.tenantId,
    entryDate:    invoice.invoiceDate,
    postingDate:  invoice.invoiceDate,
    period:       periodOf(invoice.invoiceDate),
    entryType:    'ACCRUAL',
    status:       'POSTED',
    debitGlCode:  glCodes.debitGlCode,
    creditGlCode: glCodes.creditGlCode,
    amount:       invoice.totalAmount,
    currencyCode: invoice.currencyCode ?? 'INR',
    narration:    `${ref} — accrual`,
    invoiceId:    invoice.id,
    createdBy,
  }
}
