import type { VendorInvitation } from '../types/vendorInvitation';

/** Vendor completed the onboarding form from the invitation link. */
export function hasVendorSubmission(inv: VendorInvitation): boolean {
  return Boolean(inv.submission?.submittedAt);
}

/** Buyer still needs to act (vendor submitted; not waiting on vendor corrections). */
export function isPendingBuyerReview(inv: VendorInvitation): boolean {
  if (!hasVendorSubmission(inv)) return false;
  return (
    inv.status === 'submitted_by_vendor' ||
    inv.status === 'pending_internal_review' ||
    inv.status === 'pending_approval'
  );
}

export function submissionSubmittedAt(inv: VendorInvitation): string {
  return inv.submission?.submittedAt ?? inv.createdAt;
}
