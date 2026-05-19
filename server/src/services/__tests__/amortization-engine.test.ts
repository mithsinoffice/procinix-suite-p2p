import { describe, it, expect } from 'vitest'
import {
  computeAmortizationSchedule, isAmortizationDue,
  buildAmortizationJV, buildAccrualJV,
  type AmortizationScheduleInput,
} from '../amortization-engine.service'

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))

const baseSchedule: AmortizationScheduleInput = {
  id: 'amort-1', tenantId: 't-1', invoiceId: 'inv-12345678', invoiceLineId: null,
  totalAmount: 12000, monthlyAmount: 1000,
  periodFrom: utc(2026, 1, 1), periodTo: utc(2026, 12, 31), totalMonths: 12,
  basis: 'STRAIGHT_LINE', status: 'ACTIVE',
  expenseGlCode: '5201', prepaidGlCode: '1601', apGlCode: '2101',
}

describe('computeAmortizationSchedule — STRAIGHT_LINE', () => {
  it('12-month full-year split: ₹12000 / 12 = ₹1000/month', () => {
    const rows = computeAmortizationSchedule(12000, utc(2026, 1, 1), utc(2026, 12, 31), 'STRAIGHT_LINE')
    expect(rows).toHaveLength(12)
    expect(rows[0]).toMatchObject({ month: '2026-01', amount: 1000 })
    expect(rows[11]).toMatchObject({ month: '2026-12', amount: 1000 })
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(12000)
  })

  it('rounding remainder goes to last month: ₹1000 / 3 months', () => {
    const rows = computeAmortizationSchedule(1000, utc(2026, 1, 1), utc(2026, 3, 31), 'STRAIGHT_LINE')
    expect(rows).toHaveLength(3)
    expect(rows[0].amount).toBe(333.33)
    expect(rows[1].amount).toBe(333.33)
    expect(rows[2].amount).toBe(333.34) // remainder
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBeCloseTo(1000, 2)
  })

  it('single-month: entire amount in that month', () => {
    const rows = computeAmortizationSchedule(5000, utc(2026, 5, 1), utc(2026, 5, 31), 'STRAIGHT_LINE')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ month: '2026-05', amount: 5000 })
  })

  it('partial first/last month still counts as full month under STRAIGHT_LINE', () => {
    // Jan 15 → Mar 14 = touches 3 months (Jan, Feb, Mar)
    const rows = computeAmortizationSchedule(900, utc(2026, 1, 15), utc(2026, 3, 14), 'STRAIGHT_LINE')
    expect(rows).toHaveLength(3)
    expect(rows[0].amount).toBe(300)
    expect(rows[1].amount).toBe(300)
    expect(rows[2].amount).toBe(300)
  })
})

describe('computeAmortizationSchedule — DAY_APPORTIONED', () => {
  it('full calendar year matches STRAIGHT_LINE within rounding', () => {
    const rows = computeAmortizationSchedule(12000, utc(2026, 1, 1), utc(2026, 12, 31), 'DAY_APPORTIONED')
    expect(rows).toHaveLength(12)
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBeCloseTo(12000, 2)
    // Feb (28 days) should be slightly less than Jan (31 days)
    expect(rows[1].amount).toBeLessThan(rows[0].amount)
  })

  it('partial first month gets day-weighted share', () => {
    // Jan 16 → Feb 28 (2026 non-leap). Jan: 16 days (16..31), Feb: 28 days. Total: 44 days
    const rows = computeAmortizationSchedule(4400, utc(2026, 1, 16), utc(2026, 2, 28), 'DAY_APPORTIONED')
    expect(rows).toHaveLength(2)
    expect(rows[0].amount).toBeCloseTo((16 / 44) * 4400, 0)
    expect(rows[0].daysInPeriod).toBe(16)
    expect(rows[1].daysInPeriod).toBe(28)
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBeCloseTo(4400, 2)
  })

  it('partial last month gets remainder to clear rounding drift', () => {
    const rows = computeAmortizationSchedule(1000, utc(2026, 1, 1), utc(2026, 2, 10), 'DAY_APPORTIONED')
    expect(rows).toHaveLength(2)
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBeCloseTo(1000, 2)
  })

  it('single-month with partial dates: entire amount', () => {
    const rows = computeAmortizationSchedule(5000, utc(2026, 5, 10), utc(2026, 5, 25), 'DAY_APPORTIONED')
    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe(5000)
    expect(rows[0].daysInPeriod).toBe(16)
  })

  it('leap year February gets 29 days', () => {
    const rows = computeAmortizationSchedule(2900, utc(2028, 2, 1), utc(2028, 2, 29), 'DAY_APPORTIONED')
    expect(rows[0].daysInPeriod).toBe(29)
  })
})

describe('computeAmortizationSchedule — edge cases', () => {
  it('throws on negative totalAmount', () => {
    expect(() => computeAmortizationSchedule(-100, utc(2026, 1, 1), utc(2026, 3, 31), 'STRAIGHT_LINE')).toThrow()
  })

  it('throws on periodTo < periodFrom', () => {
    expect(() => computeAmortizationSchedule(100, utc(2026, 3, 1), utc(2026, 1, 1), 'STRAIGHT_LINE')).toThrow()
  })

  it('zero amount → zero per month', () => {
    const rows = computeAmortizationSchedule(0, utc(2026, 1, 1), utc(2026, 3, 31), 'STRAIGHT_LINE')
    expect(rows.every(r => r.amount === 0)).toBe(true)
  })
})

describe('isAmortizationDue', () => {
  it('returns true when month within range and not yet posted', () => {
    expect(isAmortizationDue(baseSchedule, '2026-05', new Set())).toBe(true)
  })

  it('returns false when month already posted', () => {
    expect(isAmortizationDue(baseSchedule, '2026-05', new Set(['2026-05']))).toBe(false)
  })

  it('returns false when month before periodFrom', () => {
    expect(isAmortizationDue(baseSchedule, '2025-12', new Set())).toBe(false)
  })

  it('returns false when month after periodTo', () => {
    expect(isAmortizationDue(baseSchedule, '2027-01', new Set())).toBe(false)
  })

  it('returns false when schedule status is COMPLETED', () => {
    expect(isAmortizationDue({ ...baseSchedule, status: 'COMPLETED' }, '2026-05', new Set())).toBe(false)
  })
})

describe('buildAmortizationJV', () => {
  it('builds AMORTIZATION JV with DR=expense, CR=prepaid', () => {
    const jv = buildAmortizationJV(baseSchedule, '2026-05', 1000, 'user-1', { invoiceRef: 'INV-001' })
    expect(jv.entryType).toBe('AMORTIZATION')
    expect(jv.debitGlCode).toBe('5201')
    expect(jv.creditGlCode).toBe('1601')
    expect(jv.amount).toBe(1000)
    expect(jv.period).toBe('2026-05')
    expect(jv.amortizationScheduleId).toBe('amort-1')
    expect(jv.narration).toBe('INV-001 — May 2026 amortization')
    expect(jv.postingDate.toISOString().slice(0, 10)).toBe('2026-05-31')
  })
})

describe('buildAccrualJV', () => {
  it('builds ACCRUAL JV with caller-specified GLs', () => {
    const jv = buildAccrualJV(
      { id: 'inv-1', tenantId: 't-1', totalAmount: 12000, invoiceDate: utc(2026, 1, 5), invoiceRef: 'INV-001' },
      { debitGlCode: '1601', creditGlCode: '2101' },
      'user-1',
    )
    expect(jv.entryType).toBe('ACCRUAL')
    expect(jv.debitGlCode).toBe('1601')
    expect(jv.creditGlCode).toBe('2101')
    expect(jv.amount).toBe(12000)
    expect(jv.invoiceId).toBe('inv-1')
    expect(jv.period).toBe('2026-01')
    expect(jv.narration).toContain('INV-001')
  })
})
