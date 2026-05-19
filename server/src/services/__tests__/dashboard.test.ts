import { describe, it, expect } from 'vitest'
import {
  calcStpRate, calcAvgProcessingDays, matchScoreHistogram,
  calcLaneDistribution, monthBounds, resolveDateRange,
  type InvoiceForKpi,
} from '../dashboard.service'

const day = (offset: number) => new Date(2026, 4, 15 + offset, 12, 0, 0)   // May 15, 2026 noon

describe('calcStpRate', () => {
  it('returns 0% when no invoices', () => {
    const r = calcStpRate([])
    expect(r).toEqual({ rate: 0, stpCount: 0, totalCount: 0 })
  })

  it('1 STP out of 4 = 25.0%', () => {
    const invoices: InvoiceForKpi[] = [
      { apLane: 'STP',    status: 'APPROVED', createdAt: day(0) },
      { apLane: 'REVIEW', status: 'APPROVED', createdAt: day(0) },
      { apLane: 'MANUAL', status: 'DRAFT',    createdAt: day(0) },
      { apLane: 'MANUAL', status: 'DRAFT',    createdAt: day(0) },
    ]
    const r = calcStpRate(invoices)
    expect(r.rate).toBe(25.0)
    expect(r.stpCount).toBe(1)
    expect(r.totalCount).toBe(4)
  })

  it('100% STP', () => {
    const invoices: InvoiceForKpi[] = Array.from({ length: 5 }, () => ({
      apLane: 'STP' as const, status: 'APPROVED', createdAt: day(0),
    }))
    expect(calcStpRate(invoices).rate).toBe(100)
  })

  it('rounds to one decimal', () => {
    const invoices: InvoiceForKpi[] = [
      { apLane: 'STP',    status: 'APPROVED', createdAt: day(0) },
      { apLane: 'REVIEW', status: 'SUBMITTED', createdAt: day(0) },
      { apLane: 'REVIEW', status: 'SUBMITTED', createdAt: day(0) },
    ]
    // 1/3 = 33.333% → 33.3
    expect(calcStpRate(invoices).rate).toBe(33.3)
  })
})

describe('calcAvgProcessingDays', () => {
  it('returns null when no approved invoices', () => {
    expect(calcAvgProcessingDays([])).toBeNull()
    expect(calcAvgProcessingDays([{ apLane: 'MANUAL', status: 'DRAFT', createdAt: day(0) }])).toBeNull()
  })

  it('skips invoices without approvedAt', () => {
    const invoices: InvoiceForKpi[] = [
      { apLane: 'STP', status: 'APPROVED', createdAt: day(0), approvedAt: day(2) },   // 2 days
      { apLane: 'STP', status: 'APPROVED', createdAt: day(0) },                       // no approvedAt — skipped
    ]
    expect(calcAvgProcessingDays(invoices)).toBe(2)
  })

  it('averages over multiple approved invoices', () => {
    const invoices: InvoiceForKpi[] = [
      { apLane: 'STP',    status: 'APPROVED', createdAt: day(0), approvedAt: day(1) },
      { apLane: 'REVIEW', status: 'APPROVED', createdAt: day(0), approvedAt: day(5) },
      { apLane: 'MANUAL', status: 'APPROVED', createdAt: day(0), approvedAt: day(9) },
    ]
    // (1 + 5 + 9) / 3 = 5.0
    expect(calcAvgProcessingDays(invoices)).toBe(5)
  })

  it('only counts status APPROVED — PAID rows do not double-count', () => {
    const invoices: InvoiceForKpi[] = [
      { apLane: 'STP', status: 'APPROVED', createdAt: day(0), approvedAt: day(3) },
      { apLane: 'STP', status: 'PAID',     createdAt: day(0), approvedAt: day(7) },   // PAID — skipped
    ]
    expect(calcAvgProcessingDays(invoices)).toBe(3)
  })
})

describe('matchScoreHistogram', () => {
  it('returns 4 empty buckets when no invoices', () => {
    const buckets = matchScoreHistogram([])
    expect(buckets).toHaveLength(4)
    expect(buckets.every(b => b.count === 0)).toBe(true)
  })

  it('places scores in their correct bucket', () => {
    const invoices: InvoiceForKpi[] = [
      { apLane: 'MANUAL', status: 'DRAFT', createdAt: day(0), matchScore: 30  },
      { apLane: 'MANUAL', status: 'DRAFT', createdAt: day(0), matchScore: 50  },   // boundary — low bucket
      { apLane: 'REVIEW', status: 'DRAFT', createdAt: day(0), matchScore: 51  },   // boundary — next bucket
      { apLane: 'REVIEW', status: 'DRAFT', createdAt: day(0), matchScore: 70  },
      { apLane: 'STP',    status: 'DRAFT', createdAt: day(0), matchScore: 85  },
      { apLane: 'STP',    status: 'DRAFT', createdAt: day(0), matchScore: 100 },
    ]
    const buckets = matchScoreHistogram(invoices)
    expect(buckets[0].count).toBe(2)   // 0–50
    expect(buckets[1].count).toBe(2)   // 51–70
    expect(buckets[2].count).toBe(1)   // 71–85
    expect(buckets[3].count).toBe(1)   // 86–100
  })

  it('skips invoices with null matchScore', () => {
    const invoices: InvoiceForKpi[] = [
      { apLane: 'MANUAL', status: 'DRAFT', createdAt: day(0), matchScore: null },
      { apLane: 'STP',    status: 'DRAFT', createdAt: day(0), matchScore: 90   },
    ]
    const buckets = matchScoreHistogram(invoices)
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(1)
  })
})

describe('calcLaneDistribution', () => {
  it('returns empty array when no invoices', () => {
    expect(calcLaneDistribution([])).toEqual([])
  })

  it('groups by lane and drops empty lanes', () => {
    const invoices: InvoiceForKpi[] = [
      { apLane: 'STP',    status: 'APPROVED', createdAt: day(0) },
      { apLane: 'STP',    status: 'APPROVED', createdAt: day(0) },
      { apLane: 'REVIEW', status: 'SUBMITTED', createdAt: day(0) },
    ]
    const dist = calcLaneDistribution(invoices)
    expect(dist).toEqual([
      { lane: 'STP',    count: 2 },
      { lane: 'REVIEW', count: 1 },
    ])
  })

  it('buckets unknown/null lanes into UNCATEGORIZED', () => {
    const invoices: InvoiceForKpi[] = [
      { apLane: null,     status: 'DRAFT', createdAt: day(0) },
      { apLane: 'WHATIS', status: 'DRAFT', createdAt: day(0) },
    ]
    const dist = calcLaneDistribution(invoices)
    expect(dist).toEqual([{ lane: 'UNCATEGORIZED', count: 2 }])
  })
})

describe('monthBounds', () => {
  it('returns first millisecond of month and last millisecond of month', () => {
    // Sample: May 19, 2026 (DST does not apply in India — keep deterministic)
    const { start, end } = monthBounds(new Date(2026, 4, 19))
    expect(start.getDate()).toBe(1)
    expect(start.getHours()).toBe(0)
    expect(end.getDate()).toBe(31)
    expect(end.getHours()).toBe(23)
    expect(end.getMonth()).toBe(4)
  })

  it('handles end of February (28 days, non-leap)', () => {
    const { end } = monthBounds(new Date(2026, 1, 5))
    expect(end.getMonth()).toBe(1)
    expect(end.getDate()).toBe(28)
  })

  it('handles leap-year February (29 days)', () => {
    const { end } = monthBounds(new Date(2024, 1, 5))
    expect(end.getMonth()).toBe(1)
    expect(end.getDate()).toBe(29)
  })

  it('rolls correctly at year boundary (December)', () => {
    const { start, end } = monthBounds(new Date(2026, 11, 15))
    expect(start.getMonth()).toBe(11)
    expect(end.getMonth()).toBe(11)
    expect(end.getDate()).toBe(31)
  })
})

describe('resolveDateRange', () => {
  const pinnedNow = new Date(2026, 4, 19, 12, 0, 0)   // May 19, 2026

  it('falls back to current month when both params missing', () => {
    const r = resolveDateRange(undefined, undefined, pinnedNow)
    expect(r.start.getMonth()).toBe(4)
    expect(r.start.getDate()).toBe(1)
    expect(r.end.getDate()).toBe(31)
  })

  it('honours both dateFrom and dateTo when valid', () => {
    const r = resolveDateRange('2026-01-01', '2026-03-31', pinnedNow)
    expect(r.start.toISOString().slice(0, 10)).toBe('2026-01-01')
    expect(r.end.toISOString().slice(0, 10)).toBe('2026-03-31')
  })

  it('uses now as end when only dateFrom given', () => {
    const r = resolveDateRange('2026-01-01', undefined, pinnedNow)
    expect(r.end).toEqual(pinnedNow)
  })

  it('ignores invalid ISO strings and falls back', () => {
    const r = resolveDateRange('not-a-date', 'also-bogus', pinnedNow)
    expect(r.start.getMonth()).toBe(4)
    expect(r.start.getDate()).toBe(1)
  })
})
