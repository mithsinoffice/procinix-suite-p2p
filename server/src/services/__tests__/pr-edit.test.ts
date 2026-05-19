import { describe, it, expect } from 'vitest'
import {
  validatePrEditable, diffPrFields, calcEstimatedTotal,
  type PrSnapshot,
} from '../pr-edit.service'

const baseSnapshot: PrSnapshot = {
  status:                'DRAFT',
  departmentId:          'dept-1',
  locationId:            'loc-1',
  costCentreId:          'cc-1',
  notes:                 'Initial note',
  narration:             null,
  requestedDeliveryDate: '2026-06-01',
  estimatedTotal:        10_000,
}

// ── validatePrEditable ─────────────────────────────────────────────────────

describe('validatePrEditable', () => {
  it('allows edit when status is DRAFT', () => {
    expect(validatePrEditable({ status: 'DRAFT' })).toEqual({ ok: true })
  })

  it('blocks SUBMITTED PRs', () => {
    const r = validatePrEditable({ status: 'SUBMITTED' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('NOT_DRAFT')
  })

  it('blocks APPROVED, REJECTED, ON_HOLD — all non-DRAFT states', () => {
    for (const status of ['APPROVED', 'REJECTED', 'ON_HOLD', 'PENDING_L1']) {
      const r = validatePrEditable({ status })
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.reason).toBe('NOT_DRAFT')
        expect(r.status).toBe(status)
      }
    }
  })
})

// ── diffPrFields ───────────────────────────────────────────────────────────

describe('diffPrFields', () => {
  it('returns empty array when nothing changed', () => {
    expect(diffPrFields(baseSnapshot, {})).toEqual([])
  })

  it('detects a single field change', () => {
    expect(diffPrFields(baseSnapshot, { departmentId: 'dept-2' })).toEqual(['departmentId'])
  })

  it('detects multiple field changes in order', () => {
    const changed = diffPrFields(baseSnapshot, {
      departmentId: 'dept-2',
      costCentreId: 'cc-2',
      notes:        'Updated note',
    })
    expect(changed).toEqual(['departmentId', 'costCentreId', 'notes'])
  })

  it('ignores incoming fields that are not in the editable list', () => {
    const changed = diffPrFields(baseSnapshot, {
      // Non-editable fields the route should silently drop:
      prRef:       'PR-NEW',
      entityId:    'entity-other',
      requesterId: 'user-other',
      createdAt:   new Date(),
      // Editable field that does change:
      notes:       'New note',
    })
    expect(changed).toEqual(['notes'])
  })

  it('normalises date comparisons (Date vs ISO string vs full ISO)', () => {
    const changed = diffPrFields(
      { ...baseSnapshot, requestedDeliveryDate: new Date('2026-06-01T00:00:00.000Z') },
      { requestedDeliveryDate: '2026-06-01' },
    )
    expect(changed).toEqual([])
  })

  it('treats empty string as null for nullable fields', () => {
    const changed = diffPrFields({ ...baseSnapshot, notes: null }, { notes: '' })
    expect(changed).toEqual([])
  })

  it('collapses line-item changes to a single "lines" entry', () => {
    const changed = diffPrFields(baseSnapshot, {
      lines: [{ qty: 5, estimatedPrice: 100 }, { qty: 2, estimatedPrice: 50 }],
    })
    expect(changed).toEqual(['lines'])
  })
})

// ── calcEstimatedTotal ─────────────────────────────────────────────────────

describe('calcEstimatedTotal', () => {
  it('returns 0 for empty / undefined lines', () => {
    expect(calcEstimatedTotal(undefined)).toBe(0)
    expect(calcEstimatedTotal([])).toBe(0)
  })

  it('sums qty × estimatedPrice across lines', () => {
    expect(calcEstimatedTotal([
      { qty: 5, estimatedPrice: 100 },   // 500
      { qty: 2, estimatedPrice: 50 },    // 100
      { qty: 10, estimatedPrice: 25 },   // 250
    ])).toBe(850)
  })

  it('handles string inputs (frontend sends string-numbers)', () => {
    expect(calcEstimatedTotal([
      { qty: '5', estimatedPrice: '100.50' },
    ])).toBe(502.5)
  })

  it('treats missing/NaN values as 0 — does not throw', () => {
    expect(calcEstimatedTotal([
      { qty: undefined, estimatedPrice: 100 },
      { estimatedPrice: 50 },
      { qty: 3 },
    ])).toBe(0)
  })
})
