import { describe, it, expect } from 'vitest'
import {
  augmentPOWithOpenValue,
  filterByOpenValue,
  validatePOConsumption,
} from '../po-consumption.service'

describe('augmentPOWithOpenValue', () => {
  it('computes openValue as totalAmount - consumedAmount', () => {
    const aug = augmentPOWithOpenValue({
      id:             'po-1',
      poRef:          'PO-001',
      totalAmount:    1000,
      consumedAmount: 250,
      _count:         { grns: 2 },
    })
    expect(aug.openValue).toBe(750)
    expect(aug.grnCount).toBe(2)
  })

  it('handles string-decimal inputs (Prisma Decimal serialization)', () => {
    const aug = augmentPOWithOpenValue({
      id:             'po-2',
      poRef:          'PO-002',
      totalAmount:    '1500.50',
      consumedAmount: '500.25',
    })
    expect(aug.openValue).toBeCloseTo(1000.25, 2)
    expect(aug.grnCount).toBe(0)
  })

  it('returns openValue of 0 when fully consumed', () => {
    const aug = augmentPOWithOpenValue({
      id:             'po-3',
      poRef:          'PO-003',
      totalAmount:    500,
      consumedAmount: 500,
      _count:         { grns: 1 },
    })
    expect(aug.openValue).toBe(0)
    expect(aug.grnCount).toBe(1)
  })
})

describe('filterByOpenValue', () => {
  const sample = [
    augmentPOWithOpenValue({ id: 'a', poRef: 'A', totalAmount: 1000, consumedAmount: 0 }),
    augmentPOWithOpenValue({ id: 'b', poRef: 'B', totalAmount: 500,  consumedAmount: 500 }),
    augmentPOWithOpenValue({ id: 'c', poRef: 'C', totalAmount: 200,  consumedAmount: 100 }),
  ]

  it('returns all rows when hasOpenValue is false', () => {
    expect(filterByOpenValue(sample, false)).toHaveLength(3)
  })

  it('drops fully-consumed rows when hasOpenValue is true', () => {
    const filtered = filterByOpenValue(sample, true)
    expect(filtered.map(p => p.id)).toEqual(['a', 'c'])
  })

  it('drops rows that are over-consumed (defensive — should not happen)', () => {
    const overdrawn = [
      ...sample,
      augmentPOWithOpenValue({ id: 'd', poRef: 'D', totalAmount: 100, consumedAmount: 150 }),
    ]
    expect(filterByOpenValue(overdrawn, true).map(p => p.id)).toEqual(['a', 'c'])
  })
})

describe('validatePOConsumption', () => {
  const pos = [
    { id: 'po-1', poRef: 'PO-001', totalAmount: 1000, consumedAmount: 200 },  // open: 800
    { id: 'po-2', poRef: 'PO-002', totalAmount: 500,  consumedAmount: 0   },  // open: 500
  ]

  it('passes when invoiceAmount is within openValue', () => {
    const result = validatePOConsumption(
      [{ poId: 'po-1', invoiceAmount: 800 }, { poId: 'po-2', invoiceAmount: 500 }],
      pos,
    )
    expect(result.ok).toBe(true)
  })

  it('passes when invoiceAmount is below openValue', () => {
    const result = validatePOConsumption(
      [{ poId: 'po-1', invoiceAmount: 100 }],
      pos,
    )
    expect(result.ok).toBe(true)
  })

  it('fails AMOUNT_EXCEEDS when invoiceAmount > openValue', () => {
    const result = validatePOConsumption(
      [{ poId: 'po-1', invoiceAmount: 900 }],
      pos,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('AMOUNT_EXCEEDS')
      if (result.error.code === 'AMOUNT_EXCEEDS') {
        expect(result.error.poRef).toBe('PO-001')
        expect(result.error.openValue).toBe(800)
      }
    }
  })

  it('fails PO_NOT_FOUND when poId is not in the supplied list', () => {
    const result = validatePOConsumption(
      [{ poId: 'po-missing', invoiceAmount: 100 }],
      pos,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PO_NOT_FOUND')
      if (result.error.code === 'PO_NOT_FOUND') {
        expect(result.error.poId).toBe('po-missing')
      }
    }
  })

  it('tolerates float drift of <= 0.01 (rounded comparison)', () => {
    const result = validatePOConsumption(
      [{ poId: 'po-1', invoiceAmount: 800.005 }],   // 0.005 over the limit but within tolerance
      pos,
    )
    expect(result.ok).toBe(true)
  })

  it('fails fast on the first invalid link without checking the rest', () => {
    const result = validatePOConsumption(
      [
        { poId: 'po-1', invoiceAmount: 9999 }, // exceeds 800
        { poId: 'po-2', invoiceAmount: 0   }, // would be fine
      ],
      pos,
    )
    expect(result.ok).toBe(false)
    if (!result.ok && result.error.code === 'AMOUNT_EXCEEDS') {
      expect(result.error.poRef).toBe('PO-001')
    }
  })
})
