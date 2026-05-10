/**
 * Payment Queue + Risk Flags — shared types.
 *
 * The server route `server/routes/payments.mjs` returns objects shaped
 * exactly like `PaymentQueueItem`. Keep these in sync if either side changes.
 */

export type PaymentStatus =
  | 'queued'
  | 'processing'
  | 'pending'
  | 'partial'
  | 'paid'
  | 'onhold'
  | 'flagged';

export type FlagSeverity = 'high' | 'medium' | 'low';

export type FlagId =
  | 'bank_changed'
  | 'vendor_blocked'
  | 'duplicate_inv'
  | 'name_mismatch'
  | 'dual_approval'
  | 'new_vendor'
  | 'amount_anomaly'
  | 'no_grn'
  | 'round_number'
  | 'inv_splitting'
  | 'advance_no_doc'
  | 'after_hours';

export interface RiskFlag {
  flagId: FlagId;
  severity: FlagSeverity;
  title: string;
  detail: string;
  /** Lucide icon name as a string — resolved client-side. */
  icon: string;
}

export interface ApprovalTrailEntry {
  by: string;
  role: string;
  at: string;
  action: string;
}

export interface PaymentQueueItem {
  id: string;
  /** Vendor or payee name */
  name: string;
  /** Invoice number (or advance reference) */
  ref: string;
  type: 'invoice' | 'advance';
  amount: number;
  paidAmt: number;
  invoiceDate: string;
  due: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: PaymentStatus;
  isMSME: boolean;
  isCritical: boolean;
  critTag: 'statutory' | 'advance' | null;
  dept: string;
  vendor: {
    gstin: string;
    pan: string;
    bank: string;
    masterName: string;
  };
  flags: RiskFlag[];
  cleared: boolean;
  clearanceNote: string;
  approvalTrail: ApprovalTrailEntry[];
  msmeRemaining: number | null;
}

export interface PaymentQueueFlagsSummary {
  count: number;
  totalValue: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface QueueListResponse {
  success: boolean;
  data: PaymentQueueItem[];
  page?: number;
  limit?: number;
  total?: number;
}

export interface QueueDetailResponse {
  success: boolean;
  data: PaymentQueueItem;
}

// ============================================================================
// Forecast (GET /api/ap/payment-forecast)
// ============================================================================

export type ForecastGroupBy =
  | 'due_date'
  | 'vendor'
  | 'department'
  | 'type'
  | 'priority'
  | 'msme_critical';

export type ForecastStatusFilter = 'all' | 'unpaid' | 'paid' | 'partial' | 'onhold';

export interface ForecastMeta {
  from: string;
  to: string;
  groupBy: string;
  totalOutflow: number;
  msmeOutflow: number;
  criticalOutflow: number;
  bankBalance: number | null;
  netCashPosition: number | null;
  bankConnected: boolean;
  currency: 'INR';
}

export interface ForecastChartPoint {
  date: string;
  total: number;
  msme: number;
  critical: number;
  standard: number;
}

export interface ForecastTableRow {
  groupKey: string;
  groupValue: string;
  count: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  msmeAmount: number;
  criticalAmount: number;
  earliestDue: string;
  latestDue: string;
  items?: PaymentQueueItem[];
}

export interface ForecastResponse {
  meta: ForecastMeta;
  chart: ForecastChartPoint[];
  table: ForecastTableRow[];
}

// ============================================================================
// Banking
// ============================================================================

export type BankName = 'HDFC' | 'ICICI' | 'SBI' | 'AXIS' | 'KOTAK' | 'OTHER';
export type AccountType = 'current' | 'savings' | 'cc';
export type IntegrationMode = 'connected' | 'manual';
export type PayoutFormat = 'HDFC_BULK' | 'ICICI_BULK' | 'GENERIC_CSV';
export type PaymentMode = 'NEFT' | 'RTGS' | 'IMPS' | 'UPI';
export type BatchStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'file_generated'
  | 'uploaded'
  | 'processing'
  | 'executed'
  | 'failed'
  | 'cancelled';
export type UtrStatus = 'pending' | 'confirmed' | 'failed';

export interface BankAccount {
  id: string;
  accountName: string;
  bankName: BankName;
  accountNumber: string;
  ifscCode: string;
  accountType: AccountType;
  integrationMode: IntegrationMode;
  payoutFormat: PayoutFormat;
  lastBalance: number | null;
  lastBalanceAt: string | null;
  bankGlCode: string | null;
  isActive: boolean;
  isDefault: boolean;
  entityId: string;
}

export interface PaymentBatch {
  id: string;
  batchRef: string;
  bankAccountId: string;
  totalAmount: number;
  itemCount: number;
  status: BatchStatus;
  integrationMode: IntegrationMode;
  paymentMode: PaymentMode;
  paymentDate: string | null;
  bankTransactionRef: string | null;
  initiatedAt: string | null;
  payoutFilePath: string | null;
  payoutFileFormat: string | null;
  fileGeneratedAt: string | null;
  uploadedAt: string | null;
  utrFilePath: string | null;
  utrIngestedAt: string | null;
  jvCreated: boolean;
  jvRef: string | null;
  jvCreatedAt: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentBatchItem {
  id: string;
  invoiceId: string;
  vendorId: string;
  vendorName: string;
  bankAccountNo: string;
  ifscCode: string;
  amount: number;
  paymentMode: PaymentMode;
  narration: string | null;
  clientRef: string;
  utr: string | null;
  utrStatus: UtrStatus;
  utrConfirmedAt: string | null;
  jvLineRef: string | null;
}

export interface BatchDetailResponse {
  batch: PaymentBatch;
  items: PaymentBatchItem[];
}

// ============================================================================
// Settings
// ============================================================================

// ============================================================================
// Vendor Advances
// ============================================================================

export type AdvanceType =
  | 'travel'
  | 'project'
  | 'procurement'
  | 'relocation'
  | 'training'
  | 'conference'
  | 'other';

export type AdvanceStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'queued_for_payment'
  | 'paid'
  | 'settled'
  | 'cancelled';

export interface VendorAdvance {
  id: string;
  advanceRef: string;
  tenantId: string;
  entityId: string;
  vendorId: string;
  vendorName: string;
  requesterId: string;
  requesterName: string;
  department: string;
  costCentre: string;
  purpose: string;
  advanceType: AdvanceType;
  amount: number;
  currency: string;
  requestedDate: string;
  requiredByDate: string;
  supportingDocUrl: string | null;
  supportingDocName: string | null;
  status: AdvanceStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  settlementDueDate: string | null;
  settledAmount: number;
  settlementDocUrl: string | null;
  settledAt: string | null;
  invoiceId: string | null;
  utr: string | null;
  paidAt: string | null;
  riskFlags: RiskFlag[];
  createdAt: string;
  updatedAt: string;
}

export interface AdvanceSummary {
  total: number;
  byStatus: Partial<Record<AdvanceStatus, number>>;
  overdueSettlement: number;
  totalAmount: number;
  pendingAmount: number;
}

export interface PaymentSettings {
  flagBankChangedDays: number;
  flagDuplicateInvDays: number;
  flagAmountAnomalyMultiplier: number;
  flagInvSplittingCount: number;
  flagInvSplittingDays: number;
  flagDualApprovalThreshold: number;
  flagRoundNumberMin: number;
  flagRoundNumberDivisor: number;
  businessHoursStart: string; // 'HH:MM:SS'
  businessHoursEnd: string;
  businessDays: string; // comma-separated 'MON,TUE,...'
  defaultPaymentMode: PaymentMode;
  rtgsThreshold: number;
  msmeWarningDays: number;
  paymentApproverRoles: string; // comma-separated lowercase role keys
  defaultPayoutFormat: PayoutFormat;
}
