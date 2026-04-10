/**
 * Vendor self-registration / invitation workflow (onboarding).
 * Persisted via VendorInvitationContext (localStorage; API can mirror later).
 */

export type VendorInvitationStatus =
  | 'invited'
  | 'vendor_in_progress'
  | 'submitted_by_vendor'
  | 'pending_internal_review'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

/** Fields captured by internal user when sending invite */
export interface VendorInviteBasics {
  legalName: string;
  pan: string;
  category: string;
  email: string;
  contactName: string;
  /** Entity Master — inviting company (required for new invites) */
  entityId?: string;
  entityName?: string;
  /** Country Master (required for new invites) */
  countryCode?: string;
  countryName?: string;
  /** Optional note shown to vendor on the portal */
  message?: string;
}

/** Uploaded doc metadata (binary stored elsewhere in production) */
export interface VendorInvitationDocument {
  id: string;
  label: string;
  fileName: string;
  uploadedAt: string;
}

/** Extended data submitted by vendor via portal */
export interface VendorSubmissionPayload {
  tradeName: string;
  phone: string;
  gstin: string;
  vendorType: 'Domestic' | 'Import';
  /** Primary address */
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  /** Bank */
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  /** KYC validation flags (mock / client-side checks) */
  panValidated: boolean;
  gstinValidated: boolean;
  bankValidated: boolean;
  documents: VendorInvitationDocument[];
  submittedAt: string;
  /** Notes from vendor */
  vendorNotes?: string;
}

export interface VendorInvitation {
  id: string;
  token: string;
  status: VendorInvitationStatus;
  basic: VendorInviteBasics;
  createdAt: string;
  /** Monotonic per environment for INV-YYYY-NNN */
  displaySequence?: number;
  /** Shown in invitations table */
  invitedByName?: string;
  /** ISO — invitation link validity (default 14 days from create) */
  expiresAt?: string;
  createdBy?: string;
  /** When vendor last opened the link */
  vendorOpenedAt?: string;
  /** Full vendor submission */
  submission?: VendorSubmissionPayload;
  /** Internal review */
  internalNotes?: string;
  submittedForApprovalAt?: string;
  approvedAt?: string;
  rejectedReason?: string;
  /** Set when approved — link to created master */
  createdVendorId?: string;
  createdVendorCode?: string;
}
