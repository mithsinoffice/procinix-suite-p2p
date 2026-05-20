// Pure-function tests for the provisioning helpers. No DB required —
// everything under test is in provision.service.ts and operates over
// caller-supplied fixtures.

import { describe, it, expect } from 'vitest'
import {
  detectPromoteToRecurring,
  detectAmountDrift,
  detectGaps,
  generateProposals,
  classifyPattern,
  buildMoMRows,
  consecutiveMonths,
  isPeriodApplicable,
  type ManualOccurrence,
  type DriftObservation,
  type GapObservation,
  type ItemForProposal,
  type MoMCell,
} from '../provision.service.js'

describe('consecutiveMonths', () => {
  it('returns true for adjacent months', () => {
    expect(consecutiveMonths('2026-01', '2026-02')).toBe(true)
    expect(consecutiveMonths('2026-12', '2027-01')).toBe(true)
  })
  it('returns false for same / non-adjacent months', () => {
    expect(consecutiveMonths('2026-01', '2026-01')).toBe(false)
    expect(consecutiveMonths('2026-01', '2026-03')).toBe(false)
    expect(consecutiveMonths('2026-03', '2026-01')).toBe(false)
  })
})

describe('isPeriodApplicable', () => {
  it('MONTHLY applies every period', () => {
    expect(isPeriodApplicable('MONTHLY', '2026-05')).toBe(true)
    expect(isPeriodApplicable(null,      '2026-05')).toBe(true)
  })
  it('QUARTERLY only on FY quarter-ends', () => {
    expect(isPeriodApplicable('QUARTERLY', '2026-03')).toBe(true)  // Q4 FY26
    expect(isPeriodApplicable('QUARTERLY', '2026-06')).toBe(true)  // Q1 FY27
    expect(isPeriodApplicable('QUARTERLY', '2026-09')).toBe(true)
    expect(isPeriodApplicable('QUARTERLY', '2026-12')).toBe(true)
    expect(isPeriodApplicable('QUARTERLY', '2026-05')).toBe(false)
    expect(isPeriodApplicable('QUARTERLY', '2026-07')).toBe(false)
  })
  it('YEARLY only on March (FY close)', () => {
    expect(isPeriodApplicable('YEARLY', '2026-03')).toBe(true)
    expect(isPeriodApplicable('YEARLY', '2026-12')).toBe(false)
  })
})

describe('detectPromoteToRecurring', () => {
  it('suggests promote when 2+ consecutive months same vendor + same amount', () => {
    const occurrences: ManualOccurrence[] = [
      { itemId: 'manual::audit', description: 'Audit Q4', vendorId: 'v1', vendorName: 'PWC', period: '2026-01', amount: 100_000 },
      { itemId: 'manual::audit', description: 'Audit Q4', vendorId: 'v1', vendorName: 'PWC', period: '2026-02', amount: 100_000 },
    ]
    const out = detectPromoteToRecurring(occurrences)
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('PROMOTE_TO_RECURRING')
    expect(out[0].suggestedAmount).toBe(100_000)
    expect(out[0].confidence).toBe('HIGH')
  })
  it('does not suggest with a single month', () => {
    const out = detectPromoteToRecurring([
      { itemId: 'manual::x', description: 'X', vendorId: 'v', period: '2026-01', amount: 100 },
    ])
    expect(out).toHaveLength(0)
  })
  it('does not suggest when amounts diverge', () => {
    const out = detectPromoteToRecurring([
      { itemId: 'manual::x', description: 'X', vendorId: 'v', period: '2026-01', amount: 100 },
      { itemId: 'manual::x', description: 'X', vendorId: 'v', period: '2026-02', amount: 200 },
    ])
    expect(out).toHaveLength(0)
  })
})

describe('detectAmountDrift', () => {
  it('suggests update when actuals are >20% above provision for 2+ months', () => {
    const obs: DriftObservation[] = [
      { itemId: 'i1', description: 'Rent', period: '2026-01', provisionAmount: 100_000, invoiceAmount: 130_000 },
      { itemId: 'i1', description: 'Rent', period: '2026-02', provisionAmount: 100_000, invoiceAmount: 135_000 },
    ]
    const out = detectAmountDrift(obs)
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('UPDATE_PROVISION_AMOUNT')
    expect(out[0].suggestedAmount).toBe(132_500) // round(avg(130k + 135k))
    expect(out[0].confidence).toBe('MEDIUM')
  })
  it('does not suggest when drift is under threshold', () => {
    const obs: DriftObservation[] = [
      { itemId: 'i1', description: 'Rent', period: '2026-01', provisionAmount: 100_000, invoiceAmount: 110_000 },
      { itemId: 'i1', description: 'Rent', period: '2026-02', provisionAmount: 100_000, invoiceAmount: 115_000 },
    ]
    expect(detectAmountDrift(obs)).toHaveLength(0)
  })
  it('does not suggest with a single overshoot', () => {
    const obs: DriftObservation[] = [
      { itemId: 'i1', description: 'Rent', period: '2026-01', provisionAmount: 100_000, invoiceAmount: 140_000 },
    ]
    expect(detectAmountDrift(obs)).toHaveLength(0)
  })
})

describe('detectGaps', () => {
  it('suggests backdate JV when 2+ consecutive MISS', () => {
    const obs: GapObservation[] = [
      { itemId: 'i1', description: 'AMC', period: '2026-01', status: 'MISS' },
      { itemId: 'i1', description: 'AMC', period: '2026-02', status: 'MISS' },
    ]
    const out = detectGaps(obs)
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('BACKDATE_JV')
    expect(out[0].confidence).toBe('HIGH')
    expect(out[0].canAccept).toBe(false)
  })
  it('does not suggest with a single MISS', () => {
    const obs: GapObservation[] = [
      { itemId: 'i1', description: 'AMC', period: '2026-01', status: 'MISS' },
    ]
    expect(detectGaps(obs)).toHaveLength(0)
  })
  it('resets run when a non-MISS month sits between MISS months', () => {
    const obs: GapObservation[] = [
      { itemId: 'i1', description: 'AMC', period: '2026-01', status: 'MISS' },
      { itemId: 'i1', description: 'AMC', period: '2026-02', status: 'PROV' },
      { itemId: 'i1', description: 'AMC', period: '2026-03', status: 'MISS' },
    ]
    expect(detectGaps(obs)).toHaveLength(0)
  })
})

describe('generateProposals', () => {
  const items: ItemForProposal[] = [
    { itemId: 'rent', description: 'Office Rent', provisionAmount: 100_000, provisionFrequency: 'MONTHLY',
      expenseGlCode: '5010', provisionGlCode: '2002', tdsSection: '194I' },
    { itemId: 'audit', description: 'Statutory Audit', provisionAmount: 50_000, provisionFrequency: 'QUARTERLY',
      expenseGlCode: '5031', provisionGlCode: '2003', tdsSection: '194J' },
  ]

  it('marks item as invoice-covered when invoice exists for period', () => {
    const out = generateProposals(items, '2026-01', [
      { itemId: 'rent', invoiceId: 'inv1', invoiceRef: 'INV-001', amount: 100_000 },
    ])
    const rent = out.find(p => p.itemId === 'rent')!
    expect(rent.invoiceCovered).toBe(true)
    expect(rent.invoiceRef).toBe('INV-001')
  })
  it('keeps item DRAFT (uncovered) when no invoice exists', () => {
    const out = generateProposals(items, '2026-01', [])
    const rent = out.find(p => p.itemId === 'rent')!
    expect(rent.invoiceCovered).toBe(false)
    expect(rent.status).toBe('DRAFT')
    expect(rent.proposedAmount).toBe(100_000)
  })
  it('skips QUARTERLY items in non-quarter-end periods', () => {
    const out = generateProposals(items, '2026-01', []) // January isn't a Q end
    expect(out.find(p => p.itemId === 'audit')).toBeUndefined()
  })
  it('includes QUARTERLY items in quarter-end periods', () => {
    const out = generateProposals(items, '2026-03', []) // March = Q4 close
    expect(out.find(p => p.itemId === 'audit')).toBeDefined()
  })
  it('uses persisted draft amount over master amount when present', () => {
    const persisted = [{
      id: 'pp1', itemId: 'rent', description: 'Office Rent',
      proposedAmount: 110_000, isManual: false, source: 'ITEM_MASTER',
      status: 'DRAFT', invoiceCovered: false,
      expenseGlCode: '5010', provisionGlCode: '2002', tdsSection: '194I',
      frequency: 'MONTHLY',
    }]
    const out = generateProposals(items, '2026-01', [], persisted)
    const rent = out.find(p => p.itemId === 'rent')!
    expect(rent.proposedAmount).toBe(110_000)
    expect(rent.id).toBe('pp1')
  })
})

describe('classifyPattern', () => {
  it('classifies consistent provisions as CONSISTENT', () => {
    const months: Record<string, MoMCell> = {
      '2026-01': { status: 'PROV', amount: 100 },
      '2026-02': { status: 'PROV', amount: 100 },
      '2026-03': { status: 'PROV', amount: 100 },
    }
    expect(classifyPattern(months, ['2026-01', '2026-02', '2026-03'])).toBe('CONSISTENT')
  })
  it('classifies 2+ MISS as GAPS', () => {
    const months: Record<string, MoMCell> = {
      '2026-01': { status: 'MISS', amount: 0 },
      '2026-02': { status: 'MISS', amount: 0 },
    }
    expect(classifyPattern(months, ['2026-01', '2026-02'])).toBe('GAPS')
  })
  it('classifies all-manual as MANUAL', () => {
    const months: Record<string, MoMCell> = {
      '2026-01': { status: 'MAN', amount: 100, isManual: true },
      '2026-02': { status: 'MAN', amount: 100, isManual: true },
    }
    expect(classifyPattern(months, ['2026-01', '2026-02'])).toBe('MANUAL')
  })
  it('classifies sustained INV > PROV*1.2 as UNDER_PROVISION', () => {
    const months: Record<string, MoMCell> = {
      '2026-01': { status: 'PROV', amount: 100 },
      '2026-02': { status: 'INV',  amount: 150 },
      '2026-03': { status: 'INV',  amount: 160 },
    }
    expect(classifyPattern(months, ['2026-01', '2026-02', '2026-03'])).toBe('UNDER_PROVISION')
  })
})

describe('buildMoMRows', () => {
  it('aggregates totals + gap count + pattern per item', () => {
    const items = [{ itemId: 'rent', description: 'Rent', masterAmount: 100, frequency: 'MONTHLY' }]
    const cells = new Map<string, Record<string, MoMCell>>()
    cells.set('rent', {
      '2026-01': { status: 'PROV', amount: 100 },
      '2026-02': { status: 'MISS', amount: 0 },
      '2026-03': { status: 'PROV', amount: 100 },
    })
    const rows = buildMoMRows(items, cells, ['2026-01', '2026-02', '2026-03'])
    expect(rows).toHaveLength(1)
    expect(rows[0].totalAmount).toBe(200)
    expect(rows[0].gapCount).toBe(1)
    // Single MISS isn't enough to flip to GAPS pattern.
    expect(rows[0].pattern).toBe('CONSISTENT')
  })
})
