import { describe, it, expect } from 'vitest'
import { sanitisePayload } from '../payload'

// Two crash patterns this helper defends against, both triggered by raw
// form-driven request bodies going straight to Prisma:
//
//   1. Form echoes back the GET response → body contains `id` / `tenantId` /
//      `createdAt` / `updatedAt` → Prisma rejects them on update.
//   2. `<input type="date">` blank → `""` → Prisma DateTime? expects
//      "ISO-8601 DateTime", emits "premature end of input" and the request
//      crashes with a bare 500.
//
// Same trap for optional FK String? columns (`tdsSectionId: ""`) — those
// fail the foreign-key constraint at the DB layer.

describe('sanitisePayload', () => {
  it('strips id / tenantId / createdAt / updatedAt / _count', () => {
    const out = sanitisePayload({
      id: 'abc', tenantId: 'xyz', createdAt: '2026-01-01', updatedAt: '2026-01-02',
      _count: { lines: 3 },
      name: 'Keep me', status: 'ACTIVE',
    })
    expect(out).toEqual({ name: 'Keep me', status: 'ACTIVE' })
  })

  it('coerces empty-string nullable fields to null', () => {
    const out = sanitisePayload(
      { name: 'x', dueDate: '', periodFrom: '', periodTo: '2026-05-01' },
      { nullableFields: ['dueDate', 'periodFrom', 'periodTo'] },
    )
    expect(out.dueDate).toBeNull()
    expect(out.periodFrom).toBeNull()
    expect(out.periodTo).toBe('2026-05-01')   // non-empty preserved
    expect(out.name).toBe('x')
  })

  it('leaves empty strings alone for fields NOT in nullableFields', () => {
    // Plain optional String columns accept "" — only DateTime?/FK columns need coercion.
    const out = sanitisePayload(
      { name: '', description: '', dueDate: '' },
      { nullableFields: ['dueDate'] },
    )
    expect(out.name).toBe('')
    expect(out.description).toBe('')
    expect(out.dueDate).toBeNull()
  })

  it('preserves null values as null (no double-coercion)', () => {
    const out = sanitisePayload(
      { dueDate: null, periodFrom: null },
      { nullableFields: ['dueDate', 'periodFrom'] },
    )
    expect(out.dueDate).toBeNull()
    expect(out.periodFrom).toBeNull()
  })

  it('preserves valid date strings', () => {
    const out = sanitisePayload(
      { dueDate: '2026-05-01', invoiceDate: '2026-04-15' },
      { nullableFields: ['dueDate'] },
    )
    expect(out.dueDate).toBe('2026-05-01')
    expect(out.invoiceDate).toBe('2026-04-15')
  })

  it('preserves numbers / booleans / nested objects untouched', () => {
    const out = sanitisePayload({
      gstRate: 18, rcmApplicable: false, ocrRawData: { confidence: 92, model: 'pro' },
    })
    expect(out.gstRate).toBe(18)
    expect(out.rcmApplicable).toBe(false)
    expect(out.ocrRawData).toEqual({ confidence: 92, model: 'pro' })
  })

  it('handles non-object inputs without throwing', () => {
    expect(sanitisePayload(null)).toEqual({})
    expect(sanitisePayload(undefined)).toEqual({})
    expect(sanitisePayload('string')).toEqual({})
    expect(sanitisePayload(42)).toEqual({})
    expect(sanitisePayload([1, 2, 3])).toEqual({})   // arrays not allowed as payloads
  })

  it('strips immutable fields BEFORE checking nullable fields (no interaction)', () => {
    const out = sanitisePayload(
      { id: 'must-strip', dueDate: '', name: 'keep' },
      { nullableFields: ['dueDate'] },
    )
    expect(out).not.toHaveProperty('id')
    expect(out.dueDate).toBeNull()
    expect(out.name).toBe('keep')
  })

  it('returns a fresh object — does not mutate the input', () => {
    const input = { id: 'x', name: 'y', dueDate: '' }
    const out = sanitisePayload(input, { nullableFields: ['dueDate'] })
    expect(input.id).toBe('x')               // original untouched
    expect(input.dueDate).toBe('')           // original untouched
    expect(out).not.toBe(input)
  })
})
