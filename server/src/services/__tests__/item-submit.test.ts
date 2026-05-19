import { describe, it, expect } from 'vitest'
import {
  validateItemSubmittable,
  resolveItemStatusAfterSubmit,
  resolveItemStatusAfterReject,
} from '../item-submit.service'

// ── validateItemSubmittable ────────────────────────────────────────────────
// Guards POST /api/masters/items/:id/submit. The rule: DRAFT or REJECTED
// items are submittable, everything else (already PENDING_APPROVAL, ACTIVE,
// INACTIVE) is a 422. Stops re-submission from double-creating workflow
// instances and from kicking off approval for an already-active record.

describe('validateItemSubmittable', () => {
  it('DRAFT → submittable', () => {
    expect(validateItemSubmittable('DRAFT')).toEqual({ ok: true })
  })

  it('REJECTED → submittable (re-submission after rejection loop)', () => {
    expect(validateItemSubmittable('REJECTED')).toEqual({ ok: true })
  })

  it('PENDING_APPROVAL → NOT submittable (already in flight)', () => {
    const r = validateItemSubmittable('PENDING_APPROVAL')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('NOT_SUBMITTABLE')
    expect(r.status).toBe('PENDING_APPROVAL')
    expect(r.message).toMatch(/Only DRAFT or REJECTED/)
  })

  it('ACTIVE → NOT submittable (already approved)', () => {
    const r = validateItemSubmittable('ACTIVE')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('NOT_SUBMITTABLE')
    expect(r.status).toBe('ACTIVE')
  })

  it('INACTIVE → NOT submittable', () => {
    expect(validateItemSubmittable('INACTIVE').ok).toBe(false)
  })

  it('unknown status → NOT submittable (defensive)', () => {
    expect(validateItemSubmittable('WAT').ok).toBe(false)
  })
})

// ── resolveItemStatusAfterSubmit ───────────────────────────────────────────
// Decides the status to flip the item to after startWorkflow() returns.

describe('resolveItemStatusAfterSubmit', () => {
  it('workflow succeeded + autoApproved → ACTIVE (every stage auto-passed)', () => {
    expect(resolveItemStatusAfterSubmit({ ok: true, autoApproved: true })).toBe('ACTIVE')
  })

  it('workflow succeeded, stages pending → PENDING_APPROVAL', () => {
    expect(resolveItemStatusAfterSubmit({ ok: true, autoApproved: false })).toBe('PENDING_APPROVAL')
  })

  it('no workflow defined for tenant → still PENDING_APPROVAL (visibly leaves DRAFT)', () => {
    // Matches the invoice/PR/PO submit pattern — caller wants the record to
    // leave DRAFT even when no workflow definition exists, so it shows up in
    // the right tab. A TENANT_ADMIN can manually approve later.
    expect(resolveItemStatusAfterSubmit({ ok: false, noWorkflowDefined: true })).toBe('PENDING_APPROVAL')
  })

  it('workflow succeeded, autoApproved undefined → PENDING_APPROVAL (default false)', () => {
    expect(resolveItemStatusAfterSubmit({ ok: true })).toBe('PENDING_APPROVAL')
  })
})

// ── resolveItemStatusAfterReject ───────────────────────────────────────────
// Item workflows are single-stage in the default seed (WF-ITEM-001:
// TENANT_ADMIN approver). There's no "previous stage" — RETURN_TO_PREV
// collapses to DRAFT same as RETURN_TO_DRAFT. REQUEST_INFO holds the item
// in PENDING_APPROVAL while the chat resolves.

describe('resolveItemStatusAfterReject', () => {
  it('RETURN_TO_DRAFT → DRAFT (allows resubmit)', () => {
    expect(resolveItemStatusAfterReject('RETURN_TO_DRAFT')).toBe('DRAFT')
  })

  it('RETURN_TO_PREV_STAGE → DRAFT (single-stage workflow has no prev stage)', () => {
    expect(resolveItemStatusAfterReject('RETURN_TO_PREV_STAGE')).toBe('DRAFT')
  })

  it('REQUEST_INFO → PENDING_APPROVAL (held in workflow)', () => {
    expect(resolveItemStatusAfterReject('REQUEST_INFO')).toBe('PENDING_APPROVAL')
  })
})
