import { describe, it, expect } from 'vitest'
import {
  computeMsmePaymentDue, computeMsmeDaysRemaining, getMsmePriority,
  computeInterest, buildPaymentJVs, computeBatchTotals, generateBatchRef,
} from '../payment-engine.service'

// All UTC dates so day-of-week / DST never throws off the assertions.
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))

describe('computeMsmePaymentDue', () => {
  it('caps at 45 days when vendor credit term > 45', () => {
    const due = computeMsmePaymentDue(utc(2026, 1, 1), 60)
    expect(due.toISOString().slice(0, 10)).toBe('2026-02-15')  // Jan 1 + 45d
  })

  it('uses vendor credit days when shorter than 45', () => {
    const due = computeMsmePaymentDue(utc(2026, 1, 1), 30)
    expect(due.toISOString().slice(0, 10)).toBe('2026-01-31')
  })

  it('exact boundary at 45 days uses 45', () => {
    const due = computeMsmePaymentDue(utc(2026, 1, 1), 45)
    expect(due.toISOString().slice(0, 10)).toBe('2026-02-15')
  })

  it('negative or zero credit days clamps to 0 (due immediately)', () => {
    expect(computeMsmePaymentDue(utc(2026, 1, 1),   0).toISOString().slice(0, 10)).toBe('2026-01-01')
    expect(computeMsmePaymentDue(utc(2026, 1, 1), -10).toISOString().slice(0, 10)).toBe('2026-01-01')
  })

  it('handles month rollover correctly', () => {
    expect(computeMsmePaymentDue(utc(2026, 1, 20), 30).toISOString().slice(0, 10)).toBe('2026-02-19')
  })
})

describe('computeMsmeDaysRemaining', () => {
  it('returns positive count when due is in future', () => {
    expect(computeMsmeDaysRemaining(utc(2026, 5, 30), utc(2026, 5, 20))).toBe(10)
  })

  it('returns 0 on the day of due date', () => {
    expect(computeMsmeDaysRemaining(utc(2026, 5, 20), utc(2026, 5, 20))).toBe(0)
  })

  it('returns negative when overdue', () => {
    expect(computeMsmeDaysRemaining(utc(2026, 5, 15), utc(2026, 5, 20))).toBe(-5)
  })
})

describe('getMsmePriority', () => {
  it('CRITICAL when daysRemaining < 7', () => {
    expect(getMsmePriority(6)).toBe('CRITICAL')
    expect(getMsmePriority(0)).toBe('CRITICAL')
    expect(getMsmePriority(-3)).toBe('CRITICAL')  // overdue counts as critical
  })

  it('AT_RISK when daysRemaining 7-14', () => {
    expect(getMsmePriority(7)).toBe('AT_RISK')
    expect(getMsmePriority(14)).toBe('AT_RISK')
  })

  it('NORMAL when daysRemaining >= 15', () => {
    expect(getMsmePriority(15)).toBe('NORMAL')
    expect(getMsmePriority(45)).toBe('NORMAL')
  })

  it('boundary: 7 is AT_RISK, 6 is CRITICAL', () => {
    expect(getMsmePriority(6)).toBe('CRITICAL')
    expect(getMsmePriority(7)).toBe('AT_RISK')
  })

  it('boundary: 15 is NORMAL, 14 is AT_RISK', () => {
    expect(getMsmePriority(14)).toBe('AT_RISK')
    expect(getMsmePriority(15)).toBe('NORMAL')
  })
})

describe('computeInterest', () => {
  it('standard MSME interest at 3x bank rate', () => {
    // ₹100,000 @ 30 days, RBI 6.5% → 3*6.5% = 19.5% annual → 100000*0.195*30/365 ≈ ₹1,602.74
    expect(computeInterest(100_000, 30, 6.5)).toBeCloseTo(1602.74, 2)
  })

  it('zero days late → zero interest', () => {
    expect(computeInterest(100_000, 0, 6.5)).toBe(0)
  })

  it('zero amount → zero interest', () => {
    expect(computeInterest(0, 30, 6.5)).toBe(0)
  })

  it('negative days late → zero (not refund)', () => {
    expect(computeInterest(100_000, -5, 6.5)).toBe(0)
  })
})

describe('buildPaymentJVs', () => {
  const baseLine = {
    id: 'line-1', tenantId: 't-1', batchId: 'b-1', invoiceId: 'inv-12345678', vendorId: 'v-1',
    paymentAmount: 90_000, tdsAmount: 10_000, paymentMethod: 'NEFT',
  }
  const gls = { apGlCode: '2030', bankGlCode: '1002', tdsPayableGlCode: '2010' }

  it('returns 2 JVs when tdsAmount > 0', () => {
    const jvs = buildPaymentJVs(baseLine, gls, 'user-1', { postingDate: utc(2026, 5, 15) })
    expect(jvs).toHaveLength(2)
    expect(jvs[0]).toMatchObject({
      debitGlCode: '2030', creditGlCode: '1002', amount: 90_000, entryType: 'MANUAL',
    })
    expect(jvs[1]).toMatchObject({
      debitGlCode: '2030', creditGlCode: '2010', amount: 10_000, entryType: 'MANUAL',
    })
  })

  it('returns 1 JV when tdsAmount = 0', () => {
    const jvs = buildPaymentJVs({ ...baseLine, paymentAmount: 100_000, tdsAmount: 0 }, gls, 'user-1')
    expect(jvs).toHaveLength(1)
    expect(jvs[0].amount).toBe(100_000)
  })

  it('partial payment: amount matches paymentAmount, not invoice gross', () => {
    const jvs = buildPaymentJVs({ ...baseLine, paymentAmount: 45_000, tdsAmount: 5_000 }, gls, 'user-1')
    expect(jvs[0].amount).toBe(45_000)  // cash leg = paymentAmount
    expect(jvs[1].amount).toBe(5_000)   // TDS leg = tdsAmount
  })

  it('narration encodes the payment method', () => {
    const jvs = buildPaymentJVs(baseLine, gls, 'user-1')
    expect(jvs[0].narration).toContain('NEFT')
  })

  it('period derived from postingDate', () => {
    const jvs = buildPaymentJVs(baseLine, gls, 'user-1', { postingDate: utc(2026, 7, 31) })
    expect(jvs[0].period).toBe('2026-07')
    expect(jvs[1].period).toBe('2026-07')
  })
})

describe('computeBatchTotals', () => {
  it('sums across multiple lines', () => {
    const totals = computeBatchTotals([
      { invoiceAmount: 100_000, tdsAmount: 10_000, advanceAdjusted: 0,     paymentAmount: 90_000 },
      { invoiceAmount:  50_000, tdsAmount:  2_000, advanceAdjusted: 5_000, paymentAmount: 43_000 },
    ])
    expect(totals).toEqual({
      totalInvoice:    150_000,
      totalTds:         12_000,
      totalAdvanceAdj:   5_000,
      totalNetPayable: 133_000,
    })
  })

  it('empty array returns zeros', () => {
    expect(computeBatchTotals([])).toEqual({
      totalInvoice: 0, totalTds: 0, totalAdvanceAdj: 0, totalNetPayable: 0,
    })
  })
})

describe('generateBatchRef', () => {
  it('formats as PAY-YYYY-NNNN', () => {
    expect(generateBatchRef(1, 2026)).toBe('PAY-2026-0001')
    expect(generateBatchRef(42, 2026)).toBe('PAY-2026-0042')
    expect(generateBatchRef(9999, 2026)).toBe('PAY-2026-9999')
  })

  it('defaults to current year when omitted', () => {
    const y = new Date().getUTCFullYear()
    expect(generateBatchRef(1)).toBe(`PAY-${y}-0001`)
  })
})
