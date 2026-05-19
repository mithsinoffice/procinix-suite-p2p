import { describe, it, expect } from 'vitest'
import {
  validateMasterSubmittable, resolveMasterStatusAfterSubmit,
  resolveMasterStatusAfterReject, ENTITY_TO_WF_MODULE,
} from '../master-submit.service'

// Pure-helper specs for the shared "submit for approval" flow used by every
// bespoke and generic-CRUD master. Keeps the rule (DRAFT/REJECTED submittable,
// rest blocked) and the post-workflow status resolution pinned at the test
// level — a future regression that flips status='ACTIVE' on submit, or that
// silently allows resubmitting a PENDING_APPROVAL record, fails here.

describe('validateMasterSubmittable', () => {
  it('DRAFT → submittable', () => {
    expect(validateMasterSubmittable('vendor', 'DRAFT')).toEqual({ ok: true })
  })

  it('REJECTED → submittable (re-submission after rejection loop)', () => {
    expect(validateMasterSubmittable('vendor', 'REJECTED')).toEqual({ ok: true })
  })

  it('PENDING_APPROVAL → NOT submittable (already in flight)', () => {
    const r = validateMasterSubmittable('budget', 'PENDING_APPROVAL')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('NOT_SUBMITTABLE')
    expect(r.status).toBe('PENDING_APPROVAL')
    expect(r.message).toMatch(/Only DRAFT or REJECTED/)
    expect(r.message).toContain('budget')
  })

  it('ACTIVE → NOT submittable (already approved)', () => {
    const r = validateMasterSubmittable('currency', 'ACTIVE')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('NOT_SUBMITTABLE')
  })

  it('INACTIVE → NOT submittable', () => {
    expect(validateMasterSubmittable('user', 'INACTIVE').ok).toBe(false)
  })

  it('entity label is interpolated into the error message', () => {
    const r = validateMasterSubmittable('item category', 'ACTIVE')
    expect(r.message).toContain('item category')
    expect(r.message).toContain('ACTIVE')
  })
})

describe('resolveMasterStatusAfterSubmit', () => {
  it('workflow ok + auto-approved → ACTIVE', () => {
    expect(resolveMasterStatusAfterSubmit({ ok: true, autoApproved: true })).toBe('ACTIVE')
  })

  it('workflow ok + multi-stage → PENDING_APPROVAL', () => {
    expect(resolveMasterStatusAfterSubmit({ ok: true, autoApproved: false })).toBe('PENDING_APPROVAL')
  })

  it('NO_WORKFLOW_DEFINED → PENDING_APPROVAL (still leaves DRAFT)', () => {
    expect(resolveMasterStatusAfterSubmit({ ok: false, noWorkflowDefined: true })).toBe('PENDING_APPROVAL')
  })
})

describe('resolveMasterStatusAfterReject', () => {
  it('RETURN_TO_DRAFT → DRAFT', () => {
    expect(resolveMasterStatusAfterReject('RETURN_TO_DRAFT')).toBe('DRAFT')
  })

  it('RETURN_TO_PREV_STAGE → DRAFT (single-stage default flow has no previous stage)', () => {
    expect(resolveMasterStatusAfterReject('RETURN_TO_PREV_STAGE')).toBe('DRAFT')
  })

  it('REQUEST_INFO → PENDING_APPROVAL (chat thread keeps the request open)', () => {
    expect(resolveMasterStatusAfterReject('REQUEST_INFO')).toBe('PENDING_APPROVAL')
  })
})

describe('ENTITY_TO_WF_MODULE — load-bearing alignment', () => {
  it('covers all 8 in-scope masters', () => {
    expect(ENTITY_TO_WF_MODULE).toMatchObject({
      vendor:         'VENDOR',
      employee:       'EMPLOYEE',
      user:           'USER',
      budget:         'BUDGET',
      financial_year: 'FINANCIAL_YEAR',
      currency:       'CURRENCY',
      profit_centre:  'PROFIT_CENTRE',
      item_category:  'ITEM_CATEGORY',
    })
  })
})
