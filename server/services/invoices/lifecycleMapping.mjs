// Single source of truth for legacy status → lifecycle_state translation.
// Must produce identical output to the 2d SQL backfill CASE
// (sql/mysql/migrations/_ws1a_drafts/2d_seeds_and_backfills.sql, Section 2.1).

export const LIFECYCLE_STATES = Object.freeze({
  INGESTED:           'Ingested',
  OCR_EXTRACTED:      'OCR Extracted',
  UNDER_VERIFICATION: 'Under Verification',
  EXCEPTION_HOLD:     'Exception Hold',
  PROCESSED:          'Processed',
  QUEUED_FOR_PAYMENT: 'Queued for Payment',
  REJECTED:           'Rejected',
});

/**
 * Map a legacy invoices.status (+ optional processing_status) to a
 * lifecycle_state value.
 *
 * Returns null for unknown/unmapped inputs — callers must treat null
 * as "no lifecycle translation available; skip the OR clause".
 *
 * NOTE: The Q3 rule (approved + unresolved exception → Exception Hold)
 * requires a DB lookup and cannot be handled here. It is included in
 * the 2d SQL CASE but intentionally omitted from this JS helper because
 * none of the Item B filter sites need it (they filter by status value,
 * not by exception state).
 */
export function mapLegacyToLifecycle(status, processingStatus) {
  if (!status) return null;
  const normalized = status.toLowerCase();

  switch (normalized) {
    case 'draft':
      if (processingStatus) {
        const ps = processingStatus.toLowerCase();
        if (ps === 'exception' || ps === 'failed') {
          return LIFECYCLE_STATES.EXCEPTION_HOLD;
        }
      }
      return LIFECYCLE_STATES.INGESTED;

    case 'pending':
    case 'pending_approval':
    case 'pending approval':
    case 'changes_requested':
    case 'changes requested':
    case 'submitted':
    case 'in review':
      return LIFECYCLE_STATES.UNDER_VERIFICATION;

    case 'approved':
      return LIFECYCLE_STATES.PROCESSED;

    case 'rejected':
      return LIFECYCLE_STATES.REJECTED;

    case 'paid':
      return LIFECYCLE_STATES.PROCESSED;

    default:
      return null;
  }
}

/**
 * Map a legacy invoices.processing_status to a lifecycle_state value.
 *
 * Used by Site 5 (AP agentic invoices filter on processing_status).
 * Returns null for unknown/unmapped inputs — callers must skip the
 * OR clause when null.
 */
export function mapProcessingStatusToLifecycle(processingStatus) {
  if (!processingStatus) return null;
  const normalized = processingStatus.toLowerCase();

  switch (normalized) {
    case 'posted':    return LIFECYCLE_STATES.PROCESSED;
    case 'rejected':  return LIFECYCLE_STATES.REJECTED;
    case 'exception': return LIFECYCLE_STATES.EXCEPTION_HOLD;
    case 'failed':    return LIFECYCLE_STATES.EXCEPTION_HOLD;
    default:          return null;
  }
}
