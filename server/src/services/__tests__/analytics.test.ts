import { describe, it, expect } from 'vitest'
import {
  computeDpo,
  computeMaverickPct,
  computeOnTimeRate,
  computeMsmeDaysRemaining,
  computeBudgetUtilisation,
  computeCyclePercentiles,
  classifyVendorRisk,
  classifyAging,
  computeMaturityScore,
} from '../analytics.service.js'

describe('computeDpo', () => {
  it('returns 0 when there is no spend', () => {
    expect(computeDpo(100_000, 0)).toBe(0)
  })
  it('computes (AP / spend) × 30 to one decimal', () => {
    // 350k AP on 300k month → 35 days
    expect(computeDpo(350_000, 300_000, 30)).toBe(35)
  })
  it('clamps negative AP balances to 0', () => {
    expect(computeDpo(-50_000, 300_000)).toBe(0)
  })
  it('handles fully-paid AP (balance=0)', () => {
    expect(computeDpo(0, 300_000)).toBe(0)
  })
  it('respects daysInPeriod override (e.g. quarterly DPO)', () => {
    // 350k AP on 900k quarter (90d): DPO = 35 days
    expect(computeDpo(350_000, 900_000, 90)).toBe(35)
  })
})

describe('computeMaverickPct', () => {
  it('returns 0 when there are no POs', () => {
    expect(computeMaverickPct(0, 0)).toBe(0)
  })
  it('returns 0 when every PO has a PR', () => {
    expect(computeMaverickPct(0, 25)).toBe(0)
  })
  it('returns 100 when no POs have a PR', () => {
    expect(computeMaverickPct(15, 15)).toBe(100)
  })
  it('rounds to one decimal', () => {
    // 10 maverick / 15 total = 66.6666... → 66.7
    expect(computeMaverickPct(10, 15)).toBe(66.7)
  })
})

describe('computeOnTimeRate', () => {
  const today = Date.now()
  it('returns 0 when there are no judgeable invoices', () => {
    expect(computeOnTimeRate([])).toBe(0)
    expect(computeOnTimeRate([{ dueDate: null, paidAt: null, status: 'APPROVED' }])).toBe(0)
  })
  it('returns 0 when every paid invoice is late', () => {
    const past   = new Date(today - 30 * 86_400_000)
    const paidAt = new Date(today - 5 * 86_400_000)  // paid 25 days late
    expect(computeOnTimeRate([{ dueDate: past, paidAt, status: 'PAID' }])).toBe(0)
  })
  it('returns 100 when every paid invoice is on or before due date', () => {
    const due    = new Date(today - 10 * 86_400_000)
    const paidAt = new Date(today - 15 * 86_400_000)  // paid 5 days early
    expect(computeOnTimeRate([{ dueDate: due, paidAt, status: 'PAID' }])).toBe(100)
  })
  it('mixes paid + unpaid invoices correctly', () => {
    const past    = new Date(today - 10 * 86_400_000)
    const future  = new Date(today + 10 * 86_400_000)
    const paidLate = new Date(today - 2 * 86_400_000)
    const rate = computeOnTimeRate([
      { dueDate: past,   paidAt: paidLate, status: 'PAID'      },  // late → no
      { dueDate: future, paidAt: null,     status: 'APPROVED'  },  // unpaid+still in window → yes
      { dueDate: past,   paidAt: null,     status: 'APPROVED'  },  // unpaid+past due → no
    ])
    // 1/3 on time → 33.3
    expect(rate).toBe(33.3)
  })
})

describe('computeMsmeDaysRemaining', () => {
  it('returns 0 on the deadline day (same date)', () => {
    const d = new Date('2026-05-20T00:00:00Z')
    expect(computeMsmeDaysRemaining(d, d)).toBe(0)
  })
  it('returns positive count when deadline is in the future', () => {
    expect(computeMsmeDaysRemaining(
      new Date('2026-05-30T00:00:00Z'),
      new Date('2026-05-20T00:00:00Z'),
    )).toBe(10)
  })
  it('returns negative count when overdue', () => {
    expect(computeMsmeDaysRemaining(
      new Date('2026-05-10T00:00:00Z'),
      new Date('2026-05-20T00:00:00Z'),
    )).toBe(-10)
  })
  it('ignores time-of-day — works on calendar dates only', () => {
    // 18:00 UTC and 06:00 UTC same calendar day → 0 days delta
    expect(computeMsmeDaysRemaining(
      new Date('2026-05-20T18:00:00Z'),
      new Date('2026-05-20T06:00:00Z'),
    )).toBe(0)
  })
})

describe('computeBudgetUtilisation', () => {
  it('GREEN when projection lands well below budget', () => {
    const r = computeBudgetUtilisation({
      budget: 1_200_000, committed: 100_000, actual: 100_000, monthsElapsed: 2,
    })
    // run rate 50k/mo → projected 600k → 50% of budget → GREEN
    expect(r.signal).toBe('GREEN')
    expect(r.projectedFY).toBe(600_000)
    expect(r.utilPct).toBe(16.7) // 200k / 1.2M
  })
  it('AMBER inside tolerance zone (default 10%)', () => {
    const r = computeBudgetUtilisation({
      budget: 1_200_000, committed: 0, actual: 95_000, monthsElapsed: 1,
    })
    // run rate 95k/mo → projected 1.14M → 95% → within 10% of 100% → AMBER
    expect(r.signal).toBe('AMBER')
  })
  it('RED when projection overshoots budget', () => {
    const r = computeBudgetUtilisation({
      budget: 1_200_000, committed: 0, actual: 150_000, monthsElapsed: 1,
    })
    // run rate 150k/mo → projected 1.8M → 150% → RED
    expect(r.signal).toBe('RED')
    expect(r.variance).toBe(600_000)
  })
  it('handles monthsElapsed=0 without dividing by zero', () => {
    const r = computeBudgetUtilisation({
      budget: 1_200_000, committed: 50_000, actual: 0, monthsElapsed: 0,
    })
    expect(r.monthlyRunRate).toBe(0)
    expect(r.projectedFY).toBe(0)
    expect(r.signal).toBe('GREEN')
  })
  it('handles budget=0 (utilPct=0, no signal calc)', () => {
    const r = computeBudgetUtilisation({
      budget: 0, committed: 10_000, actual: 5_000, monthsElapsed: 1,
    })
    expect(r.utilPct).toBe(0)
    expect(r.signal).toBe('GREEN')
  })
})

describe('computeCyclePercentiles', () => {
  it('returns zeros on empty input', () => {
    expect(computeCyclePercentiles([])).toEqual({ avg: 0, p50: 0, p90: 0 })
  })
  it('computes avg / p50 / p90 from sorted distribution', () => {
    const r = computeCyclePercentiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(r.avg).toBe(5.5)
    expect(r.p50).toBe(6)  // floor(10*0.5) = index 5 → value 6
    expect(r.p90).toBe(10) // floor(10*0.9) = index 9 → value 10
  })
})

describe('classifyVendorRisk', () => {
  it('HIGH at ≥40%', () => {
    expect(classifyVendorRisk(40)).toBe('HIGH')
    expect(classifyVendorRisk(75)).toBe('HIGH')
  })
  it('MEDIUM at 20–39%', () => {
    expect(classifyVendorRisk(20)).toBe('MEDIUM')
    expect(classifyVendorRisk(39.9)).toBe('MEDIUM')
  })
  it('LOW below 20%', () => {
    expect(classifyVendorRisk(0)).toBe('LOW')
    expect(classifyVendorRisk(19.9)).toBe('LOW')
  })
})

describe('classifyAging', () => {
  it('buckets at boundaries 30 / 60 / 90', () => {
    expect(classifyAging(0)).toBe('0-30')
    expect(classifyAging(30)).toBe('0-30')
    expect(classifyAging(31)).toBe('31-60')
    expect(classifyAging(60)).toBe('31-60')
    expect(classifyAging(61)).toBe('61-90')
    expect(classifyAging(90)).toBe('61-90')
    expect(classifyAging(91)).toBe('90+')
    expect(classifyAging(365)).toBe('90+')
  })
})

describe('computeMaturityScore', () => {
  it('averages five dimensions equally', () => {
    expect(computeMaturityScore({
      digitisation: 80, controlsCompliance: 70, workingCapital: 60, vendorRisk: 50, insightAnalytics: 40,
    })).toBe(60)
  })
  it('clamps to integer (round nearest)', () => {
    // (10 + 20 + 30 + 40 + 51) / 5 = 30.2 → 30
    expect(computeMaturityScore({
      digitisation: 10, controlsCompliance: 20, workingCapital: 30, vendorRisk: 40, insightAnalytics: 51,
    })).toBe(30)
  })
})
