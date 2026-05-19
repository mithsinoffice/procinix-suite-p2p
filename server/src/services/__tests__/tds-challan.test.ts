import { describe, it, expect } from 'vitest'
import { computeChallanDueDate, groupLinesByTdsSection } from '../tds-challan.service'

describe('computeChallanDueDate', () => {
  it('mid-year: May → 7-Jun', () => {
    expect(computeChallanDueDate('2026-05').toISOString().slice(0, 10)).toBe('2026-06-07')
  })

  it('December rolls to next January', () => {
    expect(computeChallanDueDate('2026-12').toISOString().slice(0, 10)).toBe('2027-01-07')
  })

  it('January → February (no rollover)', () => {
    expect(computeChallanDueDate('2026-01').toISOString().slice(0, 10)).toBe('2026-02-07')
  })

  it('February → March (works regardless of Feb length)', () => {
    expect(computeChallanDueDate('2026-02').toISOString().slice(0, 10)).toBe('2026-03-07')
    expect(computeChallanDueDate('2028-02').toISOString().slice(0, 10)).toBe('2028-03-07')
  })

  it('throws on malformed period', () => {
    expect(() => computeChallanDueDate('2026')).toThrow(/YYYY-MM/)
    expect(() => computeChallanDueDate('26-05')).toThrow()
    expect(() => computeChallanDueDate('2026/05')).toThrow()
  })
})

describe('groupLinesByTdsSection', () => {
  it('groups multiple lines by section', () => {
    const grouped = groupLinesByTdsSection([
      { tdsSection: '194C', tdsAmount: 1000 },
      { tdsSection: '194J', tdsAmount: 2500 },
      { tdsSection: '194C', tdsAmount: 500 },
    ])
    expect(grouped).toEqual([
      { tdsSection: '194C', amount: 1500 },
      { tdsSection: '194J', amount: 2500 },
    ])
  })

  it('skips lines with null section or zero amount', () => {
    const grouped = groupLinesByTdsSection([
      { tdsSection: '194C', tdsAmount: 1000 },
      { tdsSection: null,   tdsAmount: 500  },  // skipped
      { tdsSection: '194J', tdsAmount: 0    },  // skipped
    ])
    expect(grouped).toEqual([{ tdsSection: '194C', amount: 1000 }])
  })

  it('sorts output by section code for deterministic display', () => {
    const grouped = groupLinesByTdsSection([
      { tdsSection: '194Q', tdsAmount: 100 },
      { tdsSection: '194C', tdsAmount: 100 },
      { tdsSection: '194I', tdsAmount: 100 },
    ])
    expect(grouped.map(g => g.tdsSection)).toEqual(['194C', '194I', '194Q'])
  })

  it('rounds aggregated amount to 2 decimals (float-safe)', () => {
    const grouped = groupLinesByTdsSection([
      { tdsSection: '194C', tdsAmount: 0.1 },
      { tdsSection: '194C', tdsAmount: 0.2 },
    ])
    // 0.1 + 0.2 = 0.30000000000000004 in JS — rounding fixes it
    expect(grouped[0].amount).toBe(0.3)
  })

  it('empty input returns empty array', () => {
    expect(groupLinesByTdsSection([])).toEqual([])
  })
})
