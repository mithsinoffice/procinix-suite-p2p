import { describe, it, expect } from 'vitest';
import {
  mapLegacyToLifecycle,
  mapProcessingStatusToLifecycle,
  LIFECYCLE_STATES,
} from '../lifecycleMapping.mjs';

// ---------------------------------------------------------------------------
// Cross-check: JS helper must produce identical output to the 2d SQL CASE.
//
// The 2d SQL backfill CASE (2d_seeds_and_backfills.sql Section 2.1):
//   LOWER(status)='draft' + processing_status IN ('exception','failed')  → 'Exception Hold'
//   LOWER(status)='draft'                                                → 'Ingested'
//   LOWER(status) IN ('pending','pending_approval','changes_requested')  → 'Under Verification'
//   LOWER(status)='approved'                                             → 'Processed'
//   LOWER(status)='rejected'                                             → 'Rejected'
//   LOWER(status)='paid'                                                 → 'Processed'
//   ELSE                                                                 → NULL
//
// Note: Q3 rule (approved + unresolved exception → Exception Hold) requires
// a DB lookup and is intentionally omitted from the JS helper.
// ---------------------------------------------------------------------------

describe('mapLegacyToLifecycle', () => {
  describe('cross-check with 2d SQL CASE (Azure dev observed combinations)', () => {
    const cases = [
      // [status, processingStatus, expectedLifecycle]
      ['draft', 'exception', LIFECYCLE_STATES.EXCEPTION_HOLD],
      ['draft', 'failed', LIFECYCLE_STATES.EXCEPTION_HOLD],
      ['draft', null, LIFECYCLE_STATES.INGESTED],
      ['pending_approval', null, LIFECYCLE_STATES.UNDER_VERIFICATION],
      ['Rejected', 'rejected', LIFECYCLE_STATES.REJECTED],
      ['approved', null, LIFECYCLE_STATES.PROCESSED],
      ['paid', null, LIFECYCLE_STATES.PROCESSED],
      ['approved', 'posted', LIFECYCLE_STATES.PROCESSED],
    ];

    it.each(cases)('status=%s, processing_status=%s → %s', (status, processingStatus, expected) => {
      expect(mapLegacyToLifecycle(status, processingStatus)).toBe(expected);
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase', () => {
      expect(mapLegacyToLifecycle('DRAFT')).toBe(LIFECYCLE_STATES.INGESTED);
      expect(mapLegacyToLifecycle('PENDING_APPROVAL')).toBe(LIFECYCLE_STATES.UNDER_VERIFICATION);
    });

    it('handles mixed case', () => {
      expect(mapLegacyToLifecycle('Draft')).toBe(LIFECYCLE_STATES.INGESTED);
      expect(mapLegacyToLifecycle('Pending_Approval')).toBe(LIFECYCLE_STATES.UNDER_VERIFICATION);
    });
  });

  describe('additional legacy status variants from approvalService IN clause', () => {
    it('maps "pending approval" (space) to Under Verification', () => {
      expect(mapLegacyToLifecycle('pending approval')).toBe(LIFECYCLE_STATES.UNDER_VERIFICATION);
    });

    it('maps "pending" to Under Verification', () => {
      expect(mapLegacyToLifecycle('pending')).toBe(LIFECYCLE_STATES.UNDER_VERIFICATION);
    });

    it('maps "submitted" to Under Verification', () => {
      expect(mapLegacyToLifecycle('submitted')).toBe(LIFECYCLE_STATES.UNDER_VERIFICATION);
    });

    it('maps "in review" to Under Verification', () => {
      expect(mapLegacyToLifecycle('in review')).toBe(LIFECYCLE_STATES.UNDER_VERIFICATION);
    });

    it('maps "changes_requested" to Under Verification', () => {
      expect(mapLegacyToLifecycle('changes_requested')).toBe(LIFECYCLE_STATES.UNDER_VERIFICATION);
    });
  });

  describe('null/unknown handling', () => {
    it('returns null for null status', () => {
      expect(mapLegacyToLifecycle(null)).toBeNull();
    });

    it('returns null for undefined status', () => {
      expect(mapLegacyToLifecycle(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(mapLegacyToLifecycle('')).toBeNull();
    });

    it('returns null for unknown status', () => {
      expect(mapLegacyToLifecycle('some_unknown_status')).toBeNull();
    });
  });

  describe('idempotency', () => {
    it('returns the same value on repeated calls', () => {
      const first = mapLegacyToLifecycle('draft', 'exception');
      const second = mapLegacyToLifecycle('draft', 'exception');
      expect(first).toBe(second);
      expect(first).toBe(LIFECYCLE_STATES.EXCEPTION_HOLD);
    });
  });
});

describe('mapProcessingStatusToLifecycle', () => {
  describe('known mappings', () => {
    const cases = [
      ['posted', LIFECYCLE_STATES.PROCESSED],
      ['rejected', LIFECYCLE_STATES.REJECTED],
      ['exception', LIFECYCLE_STATES.EXCEPTION_HOLD],
      ['failed', LIFECYCLE_STATES.EXCEPTION_HOLD],
    ];

    it.each(cases)('processing_status=%s → %s', (processingStatus, expected) => {
      expect(mapProcessingStatusToLifecycle(processingStatus)).toBe(expected);
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase', () => {
      expect(mapProcessingStatusToLifecycle('POSTED')).toBe(LIFECYCLE_STATES.PROCESSED);
      expect(mapProcessingStatusToLifecycle('EXCEPTION')).toBe(LIFECYCLE_STATES.EXCEPTION_HOLD);
    });
  });

  describe('null/unknown handling', () => {
    it('returns null for null', () => {
      expect(mapProcessingStatusToLifecycle(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(mapProcessingStatusToLifecycle(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(mapProcessingStatusToLifecycle('')).toBeNull();
    });

    it('returns null for unknown value', () => {
      expect(mapProcessingStatusToLifecycle('pending')).toBeNull();
    });
  });

  describe('idempotency', () => {
    it('returns the same value on repeated calls', () => {
      const first = mapProcessingStatusToLifecycle('exception');
      const second = mapProcessingStatusToLifecycle('exception');
      expect(first).toBe(second);
      expect(first).toBe(LIFECYCLE_STATES.EXCEPTION_HOLD);
    });
  });
});

describe('LIFECYCLE_STATES', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(LIFECYCLE_STATES)).toBe(true);
  });

  it('contains all 7 states', () => {
    expect(Object.keys(LIFECYCLE_STATES)).toHaveLength(7);
    expect(LIFECYCLE_STATES.INGESTED).toBe('Ingested');
    expect(LIFECYCLE_STATES.OCR_EXTRACTED).toBe('OCR Extracted');
    expect(LIFECYCLE_STATES.UNDER_VERIFICATION).toBe('Under Verification');
    expect(LIFECYCLE_STATES.EXCEPTION_HOLD).toBe('Exception Hold');
    expect(LIFECYCLE_STATES.PROCESSED).toBe('Processed');
    expect(LIFECYCLE_STATES.QUEUED_FOR_PAYMENT).toBe('Queued for Payment');
    expect(LIFECYCLE_STATES.REJECTED).toBe('Rejected');
  });
});
