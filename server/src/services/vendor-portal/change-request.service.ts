// Vendor change-request service — Sprint 3.
//
// Buyer-initiated (or vendor-initiated) modifications to an already-onboarded
// vendor: bank account changes, address moves, contact swaps, tax-ID
// corrections, document refreshes. Routed through the universal Approval
// Desk via the parallel `approvalStatus` field — the desk's vendor-change
// chip picks these up alongside the onboarding requests.
//
// The state model is intentionally simple compared to the multi-step
// VendorApprovalWorkflow used for onboarding: change requests are a single
// approve/reject decision, not a multi-level workflow. If a buyer needs
// multi-step review for a particular change-type later, it should ride on
// VendorApprovalWorkflow rather than growing this service.

import type { PrismaClient } from '@prisma/client'

export type ChangeRequestError =
  | { code: 'NOT_FOUND';            message: string }
  | { code: 'WORKFLOW_INVALID_STATE'; message: string }

export interface CreateChangeRequestInput {
  vendorId:        string
  changeType:      string
  // Zod's z.unknown() infers as optional, so we mirror that here and treat
  // missing snapshots as `null` at persistence time. Callers should pass
  // both for a meaningful audit trail; the route's Zod schema doesn't
  // enforce presence so we don't double-enforce at the boundary.
  beforeSnapshot?: unknown
  afterSnapshot?:  unknown
  comments?:       string
  priority?:       'LOW' | 'MEDIUM' | 'HIGH'
  requestedByType?: 'BUYER' | 'VENDOR'
}

/**
 * Per-tenant CR-{YYYY}-{NNNN} sequence — same pattern as the onboarding
 * request code in invitation.service.ts. Scoped by year so a tenant can
 * see "how many change requests did we issue in 2026" at a glance.
 */
export async function nextChangeRequestCode(
  prisma:   PrismaClient,
  tenantId: string,
  now:      Date = new Date(),
): Promise<string> {
  const year   = now.getUTCFullYear()
  const prefix = `CR-${year}-`
  // Tenant scope is enforced via the join through VendorProfile → tenantId.
  const last = await prisma.vendorChangeRequest.findFirst({
    where:   {
      requestCode: { startsWith: prefix },
      vendor:      { tenantId },
    },
    orderBy: { requestCode: 'desc' },
    select:  { requestCode: true },
  })
  const next = last ? Number(last.requestCode.slice(prefix.length)) + 1 : 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

/**
 * Create a new change request against an existing vendor profile. Refuses
 * (NOT_FOUND) if the vendor doesn't belong to the caller's tenant — the
 * tenant gate is enforced via the VendorProfile join here so the buyer can't
 * spoof another tenant's vendorId from the URL.
 */
export async function createChangeRequest(
  prisma:        PrismaClient,
  tenantId:      string,
  userId:        string,
  input:         CreateChangeRequestInput,
) {
  const vendor = await prisma.vendorProfile.findFirst({
    where:  { id: input.vendorId, tenantId },
    select: { id: true },
  })
  if (!vendor) {
    return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: `Vendor ${input.vendorId} not found` } }
  }

  const requestCode = await nextChangeRequestCode(prisma, tenantId)
  const cr = await prisma.vendorChangeRequest.create({
    data: {
      vendorId:        vendor.id,
      requestCode,
      requestedByType: input.requestedByType ?? 'BUYER',
      requestedById:   userId,
      changeType:      input.changeType,
      priority:        input.priority ?? 'MEDIUM',
      status:          'PENDING',
      beforeSnapshot:  (input.beforeSnapshot ?? null) as never,
      afterSnapshot:   (input.afterSnapshot  ?? null) as never,
      comments:        input.comments,
      approvalStatus:  'PENDING',
    },
  })
  return { ok: true as const, changeRequest: cr }
}

/**
 * Approve a change request. Single-step decision (unlike onboarding):
 * status flips PENDING → APPROVED, the approver + timestamp are recorded,
 * and `approvalStatus` is mirrored so the universal desk can read either
 * field for its filter chips.
 *
 * Doesn't apply the after-snapshot to the live VendorProfile — that's
 * deliberately a separate step (the buyer might want to stage the change
 * until a specific go-live window). Sprint 4 will introduce an apply step.
 */
export async function approveChangeRequest(
  prisma:    PrismaClient,
  id:        string,
  tenantId:  string,
  userId:    string,
  comments:  string | undefined,
) {
  const cr = await prisma.vendorChangeRequest.findFirst({
    where: { id, vendor: { tenantId } },
  })
  if (!cr) return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'Change request not found' } }
  if (cr.status !== 'PENDING' && cr.status !== 'IN_PROGRESS') {
    return { ok: false as const, error: { code: 'WORKFLOW_INVALID_STATE' as const, message: `Change request is ${cr.status}` } }
  }

  const now = new Date()
  const updated = await prisma.vendorChangeRequest.update({
    where: { id: cr.id },
    data: {
      status:           'APPROVED',
      approvalStatus:   'APPROVED',
      approvedAt:       now,
      approvedByUserId: userId,
      // Append the approver's note to the existing comment if any —
      // keeps the audit trail readable on the detail page.
      comments: comments
        ? (cr.comments ? `${cr.comments}\n\n[Approver] ${comments}` : `[Approver] ${comments}`)
        : cr.comments,
    },
  })
  return { ok: true as const, changeRequest: updated }
}

export async function rejectChangeRequest(
  prisma:    PrismaClient,
  id:        string,
  tenantId:  string,
  _userId:   string,
  comments:  string | undefined,
  reason:    string,
) {
  const cr = await prisma.vendorChangeRequest.findFirst({
    where: { id, vendor: { tenantId } },
  })
  if (!cr) return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'Change request not found' } }
  if (cr.status !== 'PENDING' && cr.status !== 'IN_PROGRESS') {
    return { ok: false as const, error: { code: 'WORKFLOW_INVALID_STATE' as const, message: `Change request is ${cr.status}` } }
  }

  const now = new Date()
  const updated = await prisma.vendorChangeRequest.update({
    where: { id: cr.id },
    data: {
      status:          'REJECTED',
      approvalStatus:  'REJECTED',
      rejectedAt:      now,
      rejectionReason: reason,
      comments: comments
        ? (cr.comments ? `${cr.comments}\n\n[Rejector] ${comments}` : `[Rejector] ${comments}`)
        : cr.comments,
    },
  })
  return { ok: true as const, changeRequest: updated }
}
