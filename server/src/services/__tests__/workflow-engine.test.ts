import { describe, it, expect } from 'vitest'
import { computeAutoAdvance, selectDefinitionFromList, type AutoAdvanceStageInput } from '../workflow-engine.service'

// ── computeAutoAdvance ─────────────────────────────────────────────────────
// Walks consecutive AUTO_APPROVED-eligible stages from order 1 and returns
// (a) which orders to mark AUTO_APPROVED, (b) which order remains PENDING
// (null when every stage auto-approves and the instance is APPROVED on
// creation). The bug this guards: stage 1 was being set to AUTO_APPROVED with
// no advancement of currentStageOrder, leaving the workflow stuck.

describe('computeAutoAdvance', () => {
  it('returns next-pending = stage 1 when no auto-approval threshold is set', () => {
    const stages: AutoAdvanceStageInput[] = [
      { order: 1, autoApproveBelow: null },
      { order: 2, autoApproveBelow: null },
    ]
    const plan = computeAutoAdvance(stages, 50_000)
    expect(plan).toEqual({ autoApprovedOrders: [], nextPendingOrder: 1 })
  })

  it('auto-approves stage 1 only when amount is below its threshold', () => {
    const stages: AutoAdvanceStageInput[] = [
      { order: 1, autoApproveBelow: 10_000 },
      { order: 2, autoApproveBelow: null    },
    ]
    const plan = computeAutoAdvance(stages, 5_000)
    expect(plan.autoApprovedOrders).toEqual([1])
    expect(plan.nextPendingOrder).toBe(2)
  })

  it('does NOT auto-approve when amount is at or above the threshold', () => {
    const stages: AutoAdvanceStageInput[] = [
      { order: 1, autoApproveBelow: 10_000 },
      { order: 2, autoApproveBelow: null    },
    ]
    expect(computeAutoAdvance(stages, 10_000).autoApprovedOrders).toEqual([])
    expect(computeAutoAdvance(stages, 99_999).autoApprovedOrders).toEqual([])
  })

  it('auto-approves multiple consecutive stages, stops at first non-eligible', () => {
    const stages: AutoAdvanceStageInput[] = [
      { order: 1, autoApproveBelow: 100_000 },
      { order: 2, autoApproveBelow: 100_000 },
      { order: 3, autoApproveBelow: null    },
    ]
    const plan = computeAutoAdvance(stages, 50_000)
    expect(plan.autoApprovedOrders).toEqual([1, 2])
    expect(plan.nextPendingOrder).toBe(3)
  })

  it('all-auto-approval → nextPendingOrder is null (instance is APPROVED on create)', () => {
    const stages: AutoAdvanceStageInput[] = [
      { order: 1, autoApproveBelow: 100_000 },
      { order: 2, autoApproveBelow: 100_000 },
    ]
    const plan = computeAutoAdvance(stages, 1_000)
    expect(plan.autoApprovedOrders).toEqual([1, 2])
    expect(plan.nextPendingOrder).toBeNull()
  })

  it('non-contiguous: only stage 1 auto-eligible but stage 2 is not → only stage 1 auto, halt at stage 2', () => {
    // Even if stage 3 were eligible, we don't skip past a non-eligible stage 2.
    const stages: AutoAdvanceStageInput[] = [
      { order: 1, autoApproveBelow: 100_000 },
      { order: 2, autoApproveBelow: null    },
      { order: 3, autoApproveBelow: 100_000 },
    ]
    const plan = computeAutoAdvance(stages, 1_000)
    expect(plan.autoApprovedOrders).toEqual([1])
    expect(plan.nextPendingOrder).toBe(2)
  })

  it('sorts by order before evaluation (DB ordering not assumed)', () => {
    const stages: AutoAdvanceStageInput[] = [
      { order: 2, autoApproveBelow: null    },
      { order: 1, autoApproveBelow: 100_000 },
    ]
    const plan = computeAutoAdvance(stages, 1_000)
    expect(plan.autoApprovedOrders).toEqual([1])
    expect(plan.nextPendingOrder).toBe(2)
  })

  it('handles empty stage list — nothing to advance, no pending stage', () => {
    expect(computeAutoAdvance([], 0)).toEqual({ autoApprovedOrders: [], nextPendingOrder: null })
  })
})

// ── selectDefinitionFromList ───────────────────────────────────────────────
// Pure version of selectDefinition — the DB-loaded list is passed in directly.
// Covers the priority ladder for invoice (INV-STD-LOW/MID/HIGH/INV-DIRECT-L2)
// plus the entity/department scoping rules.

type Def = Parameters<typeof selectDefinitionFromList>[0][number]

const baseDef = (overrides: Partial<Def>): Def => ({
  id:           overrides.id ?? 'def-' + Math.random().toString(36).slice(2),
  entityId:     null,
  departmentId: null,
  isDefault:    false,
  conditions:   [],
  ...overrides,
})

describe('selectDefinitionFromList', () => {
  it('returns null when list is empty', () => {
    expect(selectDefinitionFromList([], null, null, {})).toBeNull()
  })

  it('matches a definition whose AND conditions all pass', () => {
    const def = baseDef({
      id: 'INV-STD-LOW',
      conditions: [{ field: 'totalAmount', operator: 'LT', value: '100000', logicGroup: 'AND' }],
    })
    expect(selectDefinitionFromList([def], null, null, { totalAmount: 50_000 })).toBe('INV-STD-LOW')
  })

  it('skips definitions whose AND conditions fail', () => {
    const def = baseDef({
      id: 'INV-STD-LOW',
      conditions: [{ field: 'totalAmount', operator: 'LT', value: '100000', logicGroup: 'AND' }],
    })
    expect(selectDefinitionFromList([def], null, null, { totalAmount: 200_000 })).toBeNull()
  })

  it('honours priority order — first matching wins (input is priority desc)', () => {
    const high = baseDef({
      id: 'INV-STD-HIGH',
      conditions: [{ field: 'totalAmount', operator: 'GTE', value: '500000', logicGroup: 'AND' }],
    })
    const mid = baseDef({
      id: 'INV-STD-MID',
      conditions: [
        { field: 'totalAmount', operator: 'GTE', value: '100000', logicGroup: 'AND' },
        { field: 'totalAmount', operator: 'LT',  value: '500000', logicGroup: 'AND' },
      ],
    })
    // Sorted DESC by priority (high first), record matches mid only.
    expect(selectDefinitionFromList([high, mid], null, null, { totalAmount: 250_000 })).toBe('INV-STD-MID')
  })

  it('INV-DIRECT-L2: matches when totalAmount >= 25K AND isPOInvoice == false', () => {
    const direct = baseDef({
      id: 'INV-DIRECT-L2',
      conditions: [
        { field: 'totalAmount', operator: 'GTE', value: '25000', logicGroup: 'AND' },
        { field: 'isPOInvoice', operator: 'EQ',  value: 'false', logicGroup: 'AND' },
      ],
    })
    expect(selectDefinitionFromList([direct], null, null, { totalAmount: 30_000, isPOInvoice: false })).toBe('INV-DIRECT-L2')
    // PO invoice → does NOT match (isPOInvoice=true)
    expect(selectDefinitionFromList([direct], null, null, { totalAmount: 30_000, isPOInvoice: true })).toBeNull()
    // Below threshold → does NOT match
    expect(selectDefinitionFromList([direct], null, null, { totalAmount: 20_000, isPOInvoice: false })).toBeNull()
  })

  it('falls back to a tenant-default definition (no entity/department scope, no conditions) when nothing matches', () => {
    const catchAll = baseDef({ id: 'INV-CATCHALL', isDefault: true })
    expect(selectDefinitionFromList([catchAll], null, null, { totalAmount: 1 })).toBe('INV-CATCHALL')
  })

  it('skips a definition whose entityId scope does not match', () => {
    const def = baseDef({ id: 'ENT-SCOPED', entityId: 'entity-A' })
    expect(selectDefinitionFromList([def], 'entity-B', null, {})).toBeNull()
    expect(selectDefinitionFromList([def], 'entity-A', null, {})).toBe('ENT-SCOPED')
  })

  it('skips a definition whose departmentId scope does not match', () => {
    const def = baseDef({ id: 'DEPT-SCOPED', departmentId: 'dept-A' })
    expect(selectDefinitionFromList([def], null, 'dept-B', {})).toBeNull()
    expect(selectDefinitionFromList([def], null, 'dept-A', {})).toBe('DEPT-SCOPED')
  })

  it('default fallback does NOT pick scoped definitions', () => {
    const scopedDefault = baseDef({ id: 'SCOPED-DEFAULT', isDefault: true, entityId: 'entity-A' })
    // Different entity → can't fall back to this one either.
    expect(selectDefinitionFromList([scopedDefault], 'entity-B', null, {})).toBeNull()
  })

  it('OR-group: at least one OR condition must pass alongside all ANDs', () => {
    const def = baseDef({
      id: 'OR-GROUP',
      conditions: [
        { field: 'totalAmount',  operator: 'GTE', value: '10000', logicGroup: 'AND' },
        { field: 'urgencyLevel', operator: 'EQ',  value: 'HIGH',  logicGroup: 'OR'  },
        { field: 'flag',         operator: 'EQ',  value: 'true',  logicGroup: 'OR'  },
      ],
    })
    // AND passes, no OR matches → fail
    expect(selectDefinitionFromList([def], null, null, { totalAmount: 20_000, urgencyLevel: 'LOW', flag: false })).toBeNull()
    // AND passes + one OR matches → pass
    expect(selectDefinitionFromList([def], null, null, { totalAmount: 20_000, urgencyLevel: 'HIGH', flag: false })).toBe('OR-GROUP')
  })
})
