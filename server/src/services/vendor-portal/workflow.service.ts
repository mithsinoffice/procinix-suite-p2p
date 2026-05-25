// Vendor approval workflow transitions — Sprint 2.
//
// Three terminal-ish state changes (approve / reject / send-back) and all of
// them mutate the same triplet of rows: the current VendorApprovalStep,
// the parent VendorApprovalWorkflow, and the originating
// VendorOnboardingRequest. Each transition wraps those writes in a Prisma
// transaction so an interrupted action can't leave the workflow in a
// half-applied state.
//
// `currentStep` is identified by (workflowId, level === workflow.currentLevel)
// rather than by id, so the routes don't need to look it up first and the
// service tolerates stale clients posting against the wrong step number.

import type { Prisma, PrismaClient } from '@prisma/client'

export type WorkflowTransitionError =
  | { code: 'NOT_FOUND';            message: string }
  | { code: 'WORKFLOW_INVALID_STATE'; message: string }

export interface ApproveResult {
  ok:       true
  workflow: {
    id:           string
    status:       string
    currentLevel: number
    totalLevels:  number
  }
  request: {
    id:     string
    status: string
  }
  finalized: boolean // true when the approval closed the workflow
}

export interface RejectResult {
  ok: true
  workflow: { id: string; status: string }
  request:  { id: string; status: string; rejectionReason: string | null }
}

export interface SendBackResult {
  ok: true
  workflow: { id: string; status: string; currentLevel: number }
  request:  { id: string; status: string }
}

// ── Approve ───────────────────────────────────────────────────────────────

/**
 * Approve the workflow's current step. When the step is the LAST one
 * (level === totalLevels) the request flips to APPROVED + approvedAt. Otherwise
 * the workflow advances to the next level — the next step row already exists
 * (created upfront at submit time) so we just bump `currentLevel`.
 */
export async function approveCurrentStep(
  prisma:     PrismaClient,
  requestId:  string,
  tenantId:   string,
  approverId: string,
  comments:   string | undefined,
): Promise<ApproveResult | { ok: false; error: WorkflowTransitionError }> {
  return prisma.$transaction(async (tx) => {
    const wf = await tx.vendorApprovalWorkflow.findFirst({
      where: { requestId, tenantId },
    })
    if (!wf) return { ok: false as const, error: { code: 'NOT_FOUND', message: 'Workflow not found for request' } }
    if (wf.status !== 'IN_PROGRESS' && wf.status !== 'PENDING') {
      return { ok: false as const, error: { code: 'WORKFLOW_INVALID_STATE', message: `Workflow is ${wf.status}` } }
    }

    const step = await tx.vendorApprovalStep.findFirst({
      where: { workflowId: wf.id, level: wf.currentLevel },
    })
    if (!step) return { ok: false as const, error: { code: 'NOT_FOUND', message: 'Current step not found' } }
    if (step.status !== 'PENDING') {
      return { ok: false as const, error: { code: 'WORKFLOW_INVALID_STATE', message: `Step is already ${step.status}` } }
    }

    const now = new Date()

    await tx.vendorApprovalStep.update({
      where: { id: step.id },
      data:  {
        status:    'APPROVED',
        decision:  'APPROVED',
        comments:  comments ?? null,
        approverId,
        decidedAt: now,
      },
    })

    const isLastLevel = wf.currentLevel >= wf.totalLevels

    if (isLastLevel) {
      const updatedWf = await tx.vendorApprovalWorkflow.update({
        where: { id: wf.id },
        data:  { status: 'APPROVED', completedAt: now },
      })
      const updatedReq = await tx.vendorOnboardingRequest.update({
        where: { id: requestId },
        data:  { status: 'APPROVED', approvedAt: now },
      })
      return {
        ok: true as const,
        workflow: { id: updatedWf.id, status: updatedWf.status, currentLevel: updatedWf.currentLevel, totalLevels: updatedWf.totalLevels },
        request:  { id: updatedReq.id, status: updatedReq.status },
        finalized: true,
      }
    }

    // Advance to the next level. The next step row was pre-created at submit
    // time with status PENDING; we don't need to insert anything.
    const updatedWf = await tx.vendorApprovalWorkflow.update({
      where: { id: wf.id },
      data:  { currentLevel: wf.currentLevel + 1 },
    })
    return {
      ok: true as const,
      workflow: { id: updatedWf.id, status: updatedWf.status, currentLevel: updatedWf.currentLevel, totalLevels: updatedWf.totalLevels },
      request:  { id: requestId, status: 'IN_PROGRESS' },
      finalized: false,
    }
  })
}

// ── Reject ────────────────────────────────────────────────────────────────

/**
 * Reject the workflow at its current step. Closes the workflow, marks the
 * request REJECTED with a stored reason, leaves any remaining pre-created
 * future steps untouched (they remain PENDING in the DB so the audit trail
 * preserves the originally-intended path).
 */
export async function rejectWorkflow(
  prisma:     PrismaClient,
  requestId:  string,
  tenantId:   string,
  approverId: string,
  comments:   string | undefined,
  reason:     string,
): Promise<RejectResult | { ok: false; error: WorkflowTransitionError }> {
  return prisma.$transaction(async (tx) => {
    const wf = await tx.vendorApprovalWorkflow.findFirst({
      where: { requestId, tenantId },
    })
    if (!wf) return { ok: false as const, error: { code: 'NOT_FOUND', message: 'Workflow not found for request' } }
    if (wf.status !== 'IN_PROGRESS' && wf.status !== 'PENDING') {
      return { ok: false as const, error: { code: 'WORKFLOW_INVALID_STATE', message: `Workflow is ${wf.status}` } }
    }

    const step = await tx.vendorApprovalStep.findFirst({
      where: { workflowId: wf.id, level: wf.currentLevel },
    })
    if (!step) return { ok: false as const, error: { code: 'NOT_FOUND', message: 'Current step not found' } }

    const now = new Date()

    await tx.vendorApprovalStep.update({
      where: { id: step.id },
      data:  {
        status:    'REJECTED',
        decision:  'REJECTED',
        comments:  comments ?? null,
        approverId,
        decidedAt: now,
      },
    })

    const updatedWf = await tx.vendorApprovalWorkflow.update({
      where: { id: wf.id },
      data:  { status: 'REJECTED', completedAt: now },
    })
    const updatedReq = await tx.vendorOnboardingRequest.update({
      where: { id: requestId },
      data:  { status: 'REJECTED', rejectedAt: now, rejectionReason: reason },
    })

    return {
      ok: true as const,
      workflow: { id: updatedWf.id, status: updatedWf.status },
      request:  { id: updatedReq.id, status: updatedReq.status, rejectionReason: updatedReq.rejectionReason },
    }
  })
}

// ── Send back ─────────────────────────────────────────────────────────────

/**
 * Send the request back one level. The current step is marked SENT_BACK,
 * the workflow rolls back to the previous level, and the previous step gets
 * a fresh PENDING state so the earlier approver can re-decide on the new
 * context the current approver supplied via `comments`.
 *
 * Edge case: send-back from level 1 has no prior step. The route should
 * reject that case before calling — but as a defence we return INVALID_STATE
 * here too.
 */
export async function sendBackWorkflow(
  prisma:     PrismaClient,
  requestId:  string,
  tenantId:   string,
  approverId: string,
  comments:   string | undefined,
): Promise<SendBackResult | { ok: false; error: WorkflowTransitionError }> {
  return prisma.$transaction(async (tx) => {
    const wf = await tx.vendorApprovalWorkflow.findFirst({
      where: { requestId, tenantId },
    })
    if (!wf) return { ok: false as const, error: { code: 'NOT_FOUND', message: 'Workflow not found for request' } }
    if (wf.status !== 'IN_PROGRESS' && wf.status !== 'PENDING') {
      return { ok: false as const, error: { code: 'WORKFLOW_INVALID_STATE', message: `Workflow is ${wf.status}` } }
    }
    if (wf.currentLevel <= 1) {
      return { ok: false as const, error: { code: 'WORKFLOW_INVALID_STATE', message: 'Cannot send back from level 1' } }
    }

    const currentStep = await tx.vendorApprovalStep.findFirst({
      where: { workflowId: wf.id, level: wf.currentLevel },
    })
    if (!currentStep) return { ok: false as const, error: { code: 'NOT_FOUND', message: 'Current step not found' } }

    const now = new Date()

    await tx.vendorApprovalStep.update({
      where: { id: currentStep.id },
      data:  {
        status:    'SENT_BACK',
        comments:  comments ?? null,
        approverId,
        decidedAt: now,
      } satisfies Prisma.VendorApprovalStepUncheckedUpdateInput,
    })

    // Re-open the prior step so the previous approver gets it back. Their
    // earlier decision history stays on the audit log via the
    // workflow_audit table (when that lands) — for now we just flip status.
    await tx.vendorApprovalStep.updateMany({
      where: { workflowId: wf.id, level: wf.currentLevel - 1 },
      data:  { status: 'PENDING', decidedAt: null, decision: null },
    })

    const updatedWf = await tx.vendorApprovalWorkflow.update({
      where: { id: wf.id },
      data:  { status: 'IN_PROGRESS', currentLevel: wf.currentLevel - 1 },
    })
    const updatedReq = await tx.vendorOnboardingRequest.update({
      where: { id: requestId },
      data:  { status: 'IN_PROGRESS' },
    })

    return {
      ok: true as const,
      workflow: { id: updatedWf.id, status: updatedWf.status, currentLevel: updatedWf.currentLevel },
      request:  { id: updatedReq.id, status: updatedReq.status },
    }
  })
}
