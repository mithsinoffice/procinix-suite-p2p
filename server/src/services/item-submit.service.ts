// Pure helpers for the item-master submit-for-approval flow. Decoupled from
// Prisma so the rules can be unit-tested without a live DB.

export type ItemStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'REJECTED'

export interface ItemSubmitValidation {
  ok: boolean
  reason?: 'NOT_SUBMITTABLE'
  status?: ItemStatus
  message?: string
}

// An item is submittable when it's in DRAFT (first time submitting) or
// REJECTED (resubmission after rejection). Any other status is a no-op or
// out-of-order action — we surface 422 rather than silently re-creating a
// workflow instance on an already-PENDING_APPROVAL or ACTIVE record.
export function validateItemSubmittable(status: string): ItemSubmitValidation {
  if (status === 'DRAFT' || status === 'REJECTED') return { ok: true }
  return {
    ok: false,
    reason: 'NOT_SUBMITTABLE',
    status: status as ItemStatus,
    message: `Cannot submit — item is ${status}. Only DRAFT or REJECTED items can be submitted for approval.`,
  }
}

// Decide the post-workflow status given the engine's response. Mirrors the
// invoice/PR/PO pattern: workflow auto-approves below threshold → ACTIVE
// directly; otherwise PENDING_APPROVAL while stages run; no definition found
// (NO_WORKFLOW_DEFINED) → still flip to PENDING_APPROVAL so the master goes
// out of DRAFT (some legacy tenants have no item workflow defined).
export interface WorkflowOutcome {
  ok: boolean
  autoApproved?: boolean
  noWorkflowDefined?: boolean
}

export function resolveItemStatusAfterSubmit(outcome: WorkflowOutcome): ItemStatus {
  if (outcome.ok && outcome.autoApproved) return 'ACTIVE'
  return 'PENDING_APPROVAL'
}

// Decide the post-reject status for an item workflow. Item workflows are
// typically single-stage (TENANT_ADMIN approver), so there is no "previous
// stage" to return to — both RETURN_TO_DRAFT and RETURN_TO_PREV_STAGE flip
// the item back to DRAFT so the requester can edit and resubmit.
// REQUEST_INFO keeps the item in PENDING_APPROVAL while the chat thread
// resolves.
export function resolveItemStatusAfterReject(
  mode: 'RETURN_TO_DRAFT' | 'RETURN_TO_PREV_STAGE' | 'REQUEST_INFO',
): ItemStatus {
  if (mode === 'REQUEST_INFO') return 'PENDING_APPROVAL'
  return 'DRAFT'
}
