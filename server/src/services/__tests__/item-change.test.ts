import { describe, it, expect } from 'vitest'
import {
  detectMaterialChange,
  applyChangeDiff,
  validateChangeRequest,
  buildChangeRequestPayload,
  MATERIAL_FIELDS,
} from '../item-change.service'

// ── detectMaterialChange ──────────────────────────────────────────────────
// Compares two item snapshots and returns the diff of MATERIAL fields only.
// Non-material edits (description, ocrKeywords, rcmApplicable, etc.) are
// invisible to this helper — they pass straight through the regular PUT path.

describe('detectMaterialChange', () => {
  it('no fields edited → no material change', () => {
    const diff = detectMaterialChange({ gstRate: 18 }, {})
    expect(diff.hasMaterialChange).toBe(false)
    expect(diff.fields).toEqual([])
  })

  it('only non-material fields edited → no material change', () => {
    // Description, ocrKeywords, rcmApplicable are explicitly NOT material.
    const diff = detectMaterialChange(
      { description: 'old', ocrKeywords: 'a', rcmApplicable: false, gstRate: 18 },
      { description: 'new', ocrKeywords: 'b', rcmApplicable: true },
    )
    expect(diff.hasMaterialChange).toBe(false)
    expect(diff.fields).toEqual([])
  })

  it('gstRate changed → material change', () => {
    const diff = detectMaterialChange({ gstRate: 18 }, { gstRate: 12 })
    expect(diff.hasMaterialChange).toBe(true)
    expect(diff.fields).toEqual(['gstRate'])
    expect(diff.before).toEqual({ gstRate: 18 })
    expect(diff.after).toEqual({ gstRate: 12 })
  })

  it('multiple material fields changed → all captured', () => {
    const diff = detectMaterialChange(
      { gstRate: 18, hsnCode: '998314', provisionRequired: false },
      { gstRate: 12, hsnCode: '998311', provisionRequired: true,
        description: 'unrelated' },   // non-material, ignored
    )
    expect(diff.hasMaterialChange).toBe(true)
    expect(diff.fields.sort()).toEqual(['gstRate', 'hsnCode', 'provisionRequired'])
    expect(diff.after).toEqual({ gstRate: 12, hsnCode: '998311', provisionRequired: true })
  })

  it('Decimal-as-string vs Decimal-as-number → still detects no change (Prisma drift)', () => {
    // Prisma sometimes hydrates Decimal as "18" (string) and sometimes as 18
    // (number) depending on the query path. Both must compare equal — the bug
    // would be flagging a fake change on every edit.
    expect(detectMaterialChange({ gstRate: '18' }, { gstRate: 18 }).hasMaterialChange).toBe(false)
    expect(detectMaterialChange({ gstRate: '18.00' }, { gstRate: 18 }).hasMaterialChange).toBe(false)
  })

  it('null vs undefined vs empty-string → all treated as "absent" (no diff)', () => {
    expect(detectMaterialChange({ tdsSectionId: null },      { tdsSectionId: '' }).hasMaterialChange).toBe(false)
    expect(detectMaterialChange({ tdsSectionId: '' },        { tdsSectionId: null }).hasMaterialChange).toBe(false)
    expect(detectMaterialChange({ tdsSectionId: undefined }, { tdsSectionId: '' }).hasMaterialChange).toBe(false)
  })

  it('field absent in newItem (not edited) does NOT register as change', () => {
    // The form may only send the fields it edited. Old item has gstRate=18;
    // new item doesn't mention gstRate — must not flag as a change.
    const diff = detectMaterialChange({ gstRate: 18, hsnCode: '998314' }, { hsnCode: '998311' })
    expect(diff.fields).toEqual(['hsnCode'])
  })

  it('clearing a material field (value → null) IS a material change', () => {
    const diff = detectMaterialChange({ tdsSectionId: 'sec-1' }, { tdsSectionId: '' })
    expect(diff.hasMaterialChange).toBe(true)
    expect(diff.fields).toEqual(['tdsSectionId'])
    expect(diff.after).toEqual({ tdsSectionId: null })
  })
})

// ── validateChangeRequest ──────────────────────────────────────────────────

describe('validateChangeRequest', () => {
  const goodDiff = { hasMaterialChange: true, fields: ['gstRate' as const], before: {}, after: {} }

  it('ACTIVE + material diff + no pending → ok', () => {
    expect(validateChangeRequest('ACTIVE', goodDiff, false)).toEqual({ ok: true })
  })

  it('DRAFT item → ITEM_NOT_ACTIVE (edit directly path)', () => {
    const r = validateChangeRequest('DRAFT', goodDiff, false)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('ITEM_NOT_ACTIVE')
    expect(r.message).toMatch(/Edit directly/)
  })

  it('PENDING_APPROVAL item → ITEM_NOT_ACTIVE', () => {
    expect(validateChangeRequest('PENDING_APPROVAL', goodDiff, false).reason).toBe('ITEM_NOT_ACTIVE')
  })

  it('no material diff → NO_MATERIAL_CHANGE (caller should use PUT)', () => {
    const r = validateChangeRequest('ACTIVE', { ...goodDiff, hasMaterialChange: false, fields: [] }, false)
    expect(r.reason).toBe('NO_MATERIAL_CHANGE')
  })

  it('pending change already exists → PENDING_CHANGE_EXISTS', () => {
    const r = validateChangeRequest('ACTIVE', goodDiff, true)
    expect(r.reason).toBe('PENDING_CHANGE_EXISTS')
    expect(r.message).toMatch(/already exists/)
  })
})

// ── applyChangeDiff ────────────────────────────────────────────────────────

describe('applyChangeDiff', () => {
  it('returns only the material fields from the after block', () => {
    const out = applyChangeDiff({ gstRate: 12, hsnCode: '998311' })
    expect(out).toEqual({ gstRate: 12, hsnCode: '998311' })
  })

  it('null values are preserved (clearing a field)', () => {
    expect(applyChangeDiff({ tdsSectionId: null })).toEqual({ tdsSectionId: null })
  })

  it('strips any non-material keys that snuck into the payload', () => {
    // Defence-in-depth: if someone manually crafted a change request with
    // non-material fields, the apply step ignores them.
    const out = applyChangeDiff({ gstRate: 12, description: 'tampered', notes: 'tampered' })
    expect(out).toEqual({ gstRate: 12 })
    expect(out).not.toHaveProperty('description')
    expect(out).not.toHaveProperty('notes')
  })

  it('empty diff → empty payload (no-op apply)', () => {
    expect(applyChangeDiff({})).toEqual({})
  })
})

// ── buildChangeRequestPayload ──────────────────────────────────────────────

describe('buildChangeRequestPayload', () => {
  it('shapes the diff into the persisted JSON envelope', () => {
    const diff = detectMaterialChange(
      { gstRate: 18, hsnCode: '998314' },
      { gstRate: 12, hsnCode: '998311' },
    )
    const payload = buildChangeRequestPayload(diff)
    expect(payload.fields.sort()).toEqual(['gstRate', 'hsnCode'])
    expect(payload.before).toEqual({ gstRate: 18, hsnCode: '998314' })
    expect(payload.after).toEqual({ gstRate: 12, hsnCode: '998311' })
  })
})

// ── MATERIAL_FIELDS contract ───────────────────────────────────────────────

describe('MATERIAL_FIELDS', () => {
  it('explicitly lists the policy-decided material fields, nothing else', () => {
    // Locks the policy: changing this list is a deliberate decision, not an
    // incidental code change. Pinning prevents accidental scope expansion.
    expect([...MATERIAL_FIELDS].sort()).toEqual([
      'gstRate',
      'hsnCode',
      'provisionAmount',
      'provisionBasis',
      'provisionFrequency',
      'provisionRequired',
      'sacCode',
      'tdsSectionId',
    ])
  })
})
