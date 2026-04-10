/**
 * SUBKO COFFEE - STANDARDIZED STATUS LABELS & COLORS
 * 
 * Canonical status definitions and visual styling for all transaction types
 * NO AI, NO CUSTOM STYLES - Strict enterprise-grade standards
 */

// =============================================================================
// STATUS TYPE DEFINITIONS
// =============================================================================

export type PRStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
export type POStatus = 'Draft' | 'Issued' | 'Cancelled' | 'Closed';
export type GRNStatus = 'Draft' | 'Confirmed' | 'Partially Received' | 'Closed';
export type InvoiceStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'On Hold' | 'Paid';
export type AdvanceStatus = 'Draft' | 'Requested' | 'Adjusted' | 'Closed';
export type DebitNoteStatus = 'Draft' | 'Issued' | 'Adjusted' | 'Closed';
export type PaymentStatus = 'Draft' | 'Released' | 'Paid' | 'Failed';

export type AllStatuses = PRStatus | POStatus | GRNStatus | InvoiceStatus | AdvanceStatus | DebitNoteStatus | PaymentStatus;

// =============================================================================
// STATUS COLOR MAPPING (CANONICAL)
// =============================================================================

interface StatusStyle {
  bg: string;
  color: string;
}

export const getStatusStyle = (status: AllStatuses): StatusStyle => {
  // Draft → neutral grey
  if (status === 'Draft') {
    return { bg: '#F6F9FC', color: '#6E7A82' };
  }
  
  // Pending / Requested → amber
  if (status === 'Pending Approval' || status === 'Requested') {
    return { bg: '#FFF3E0', color: '#F57C00' };
  }
  
  // Approved / Issued / Released → blue
  if (status === 'Approved' || status === 'Issued' || status === 'Released' || status === 'Confirmed') {
    return { bg: '#E3F2FD', color: '#1976D2' };
  }
  
  // Paid / Closed / Adjusted → green
  if (status === 'Paid' || status === 'Closed' || status === 'Adjusted') {
    return { bg: '#E8F5E9', color: '#2E7D32' };
  }
  
  // Failed / Rejected / Cancelled → red
  if (status === 'Failed' || status === 'Rejected' || status === 'Cancelled') {
    return { bg: '#FEE2E2', color: '#DC2626' };
  }
  
  // On Hold / Partially Received → amber
  if (status === 'On Hold' || status === 'Partially Received') {
    return { bg: '#FFF3E0', color: '#F57C00' };
  }
  
  // Fallback
  return { bg: '#F6F9FC', color: '#6E7A82' };
};

// =============================================================================
// STATUS BADGE COMPONENT (REUSABLE)
// =============================================================================

interface StatusBadgeProps {
  status: AllStatuses;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = getStatusStyle(status);
  return (
    <span
      className={`px-3 py-1 rounded-full text-sm ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.color,
        fontWeight: '500'
      }}
    >
      {status}
    </span>
  );
}

// =============================================================================
// BUTTON LABEL STANDARDS
// =============================================================================

export const ButtonLabels = {
  // Primary Actions
  PRIMARY: {
    SUBMIT_FOR_APPROVAL: 'Submit for Approval',
    ISSUE_PO: 'Issue PO',
    CONFIRM_RECEIPT: 'Confirm Receipt',
    SAVE_INVOICE: 'Save Invoice',
    MATCH_INVOICE: 'Match Invoice',
    REQUEST_ADVANCE: 'Request Advance',
    ADJUST_AGAINST_INVOICE: 'Adjust Against Invoice',
    ISSUE_DEBIT_NOTE: 'Issue Debit Note',
    RELEASE_PAYMENT: 'Release Payment',
    MARK_AS_PAID: 'Mark as Paid',
  },
  
  // Secondary Actions
  SECONDARY: {
    SAVE_DRAFT: 'Save Draft',
    CANCEL: 'Cancel',
    BACK: 'Back',
  }
} as const;
