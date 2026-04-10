/**
 * Domain Model Types
 * TypeScript types for all entities in the enterprise procurement system
 * Inferred from UI fields, forms, and tables across the application
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export type UUID = string;
export type ISODateString = string;
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'SGD' | 'AED';
export type EntityCode = string;

export interface AuditFields {
  createdAt: ISODateString;
  createdBy: UUID;
  createdByName?: string;
  updatedAt: ISODateString;
  updatedBy: UUID;
  updatedByName?: string;
}

export interface WorkflowFields {
  workflowStatus: WorkflowStatus;
  workflowStage?: string;
  currentApprover?: UUID;
  currentApproverName?: string;
  approvalHistory?: ApprovalHistoryEntry[];
}

export type WorkflowStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'MORE_INFO_REQUIRED';

export type WorkflowAction = 
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'REQUEST_MORE_INFO'
  | 'CANCEL'
  | 'RECALL';

export interface ApprovalHistoryEntry {
  id: UUID;
  approverUserId: UUID;
  approverName: string;
  action: WorkflowAction;
  comments?: string;
  timestamp: ISODateString;
  stage: string;
}

// ============================================================================
// ENTITY
// ============================================================================

export interface Entity {
  id: UUID;
  entityCode: EntityCode;
  entityName: string;
  legalName: string;
  taxId: string;
  baseCurrency: CurrencyCode;
  country: string;
  address: Address;
  contactInfo: ContactInfo;
  isActive: boolean;
  fiscalYearStart: string; // MM-DD format
  workflowStatus: WorkflowStatus;
  ...AuditFields;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  website?: string;
}

// ============================================================================
// VENDOR
// ============================================================================

export interface Vendor {
  id: UUID;
  vendorCode: string;
  vendorName: string;
  legalName: string;
  vendorType: 'SUPPLIER' | 'SERVICE_PROVIDER' | 'CONTRACTOR';
  category: string[];
  taxId: string;
  gstNumber?: string;
  panNumber?: string;
  isMSME: boolean;
  msmeNumber?: string;
  paymentTerms: string;
  creditDays: number;
  bankDetails: BankDetails[];
  address: Address;
  contactInfo: ContactInfo;
  primaryContact: ContactPerson;
  alternateContacts?: ContactPerson[];
  isActive: boolean;
  onboardingDate: ISODateString;
  rating?: number;
  workflowStatus: WorkflowStatus;
  ...AuditFields;
}

export interface BankDetails {
  id: UUID;
  bankName: string;
  accountNumber: string;
  accountName: string;
  ifscCode: string;
  swiftCode?: string;
  branchName?: string;
  isPrimary: boolean;
}

export interface ContactPerson {
  name: string;
  email: string;
  phone: string;
  designation?: string;
}

// ============================================================================
// ITEM MASTER
// ============================================================================

export interface Item {
  id: UUID;
  itemCode: string;
  itemName: string;
  description: string;
  category: string;
  subCategory?: string;
  uom: string;
  alternateUOMs?: AlternateUOM[];
  hsnCode?: string;
  sacCode?: string;
  itemType: 'GOODS' | 'SERVICE' | 'ASSET';
  isStocked: boolean;
  reorderLevel?: number;
  reorderQuantity?: number;
  standardCost?: number;
  lastPurchasePrice?: number;
  specifications?: Record<string, any>;
  isActive: boolean;
  workflowStatus: WorkflowStatus;
  ...AuditFields;
}

export interface AlternateUOM {
  uom: string;
  conversionFactor: number;
}

// ============================================================================
// PURCHASE REQUISITION
// ============================================================================

export interface PurchaseRequisition {
  id: UUID;
  prNumber: string;
  prType: PRType;
  prDate: ISODateString;
  requesterUserId: UUID;
  requesterName: string;
  departmentId: UUID;
  departmentName: string;
  entityId: UUID;
  entityCode: EntityCode;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  requiredByDate: ISODateString;
  purpose: string;
  justification?: string;
  lineItems: PRLineItem[];
  totalAmount: number;
  currency: CurrencyCode;
  budgetId?: UUID;
  costCenterId?: UUID;
  projectId?: UUID;
  attachments?: Attachment[];
  workflowStatus: WorkflowStatus;
  convertedToPO: boolean;
  poNumbers?: string[];
  ...AuditFields & WorkflowFields;
}

export type PRType = 
  | 'REGULAR'
  | 'CATALOGUE'
  | 'SERVICE'
  | 'ASSET_CAPEX'
  | 'KIT_BUNDLE'
  | 'BLANKET';

export interface PRLineItem {
  id: UUID;
  lineNumber: number;
  itemId?: UUID;
  itemCode?: string;
  itemName: string;
  description: string;
  quantity: number;
  uom: string;
  estimatedUnitPrice?: number;
  estimatedTotalPrice?: number;
  requiredByDate: ISODateString;
  specifications?: string;
  suggestedVendors?: UUID[];
  accountCode?: string;
  costCenterId?: UUID;
  projectId?: UUID;
}

// ============================================================================
// PURCHASE ORDER
// ============================================================================

export interface PurchaseOrder {
  id: UUID;
  poNumber: string;
  poDate: ISODateString;
  poType: 'STANDARD' | 'BLANKET' | 'CONTRACT';
  vendorId: UUID;
  vendorCode: string;
  vendorName: string;
  entityId: UUID;
  entityCode: EntityCode;
  currency: CurrencyCode;
  exchangeRate: number;
  paymentTerms: string;
  creditDays: number;
  deliveryAddress: Address;
  deliveryDate: ISODateString;
  incoterms?: string;
  lineItems: POLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  advanceAmount?: number;
  notes?: string;
  termsAndConditions?: string;
  attachments?: Attachment[];
  prReferences?: UUID[];
  workflowStatus: WorkflowStatus;
  grnStatus: GRNStatus;
  invoiceStatus: InvoiceStatus;
  ...AuditFields & WorkflowFields;
}

export interface POLineItem {
  id: UUID;
  lineNumber: number;
  prLineItemId?: UUID;
  itemId?: UUID;
  itemCode?: string;
  itemName: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxCode?: string;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  deliveryDate: ISODateString;
  accountCode?: string;
  costCenterId?: UUID;
  projectId?: UUID;
  grnQuantity: number;
  invoicedQuantity: number;
  remainingQuantity: number;
}

export type GRNStatus = 'NOT_RECEIVED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED';
export type InvoiceStatus = 'NOT_INVOICED' | 'PARTIALLY_INVOICED' | 'FULLY_INVOICED';

// ============================================================================
// GOODS RECEIPT NOTE (GRN)
// ============================================================================

export interface GoodsReceiptNote {
  id: UUID;
  grnNumber: string;
  grnDate: ISODateString;
  grnType: 'GOODS' | 'SERVICE';
  poId: UUID;
  poNumber: string;
  vendorId: UUID;
  vendorName: string;
  entityId: UUID;
  entityCode: EntityCode;
  receivedBy: UUID;
  receivedByName: string;
  receiptLocation: string;
  deliveryNoteNumber?: string;
  deliveryNoteDate?: ISODateString;
  lineItems: GRNLineItem[];
  notes?: string;
  qualityInspectionStatus?: 'PENDING' | 'PASSED' | 'FAILED';
  attachments?: Attachment[];
  workflowStatus: WorkflowStatus;
  ...AuditFields;
}

export interface GRNLineItem {
  id: UUID;
  lineNumber: number;
  poLineItemId: UUID;
  itemId?: UUID;
  itemCode?: string;
  itemName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  uom: string;
  unitPrice: number;
  lineTotal: number;
  remarks?: string;
}

// ============================================================================
// INVOICE
// ============================================================================

export interface Invoice {
  id: UUID;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  invoiceDate: ISODateString;
  dueDate: ISODateString;
  vendorId: UUID;
  vendorCode: string;
  vendorName: string;
  entityId: UUID;
  entityCode: EntityCode;
  currency: CurrencyCode;
  exchangeRate: number;
  poId?: UUID;
  poNumber?: string;
  grnIds?: UUID[];
  grnNumbers?: string[];
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount?: number;
  taxAmount: number;
  tdsAmount?: number;
  tdsPercent?: number;
  totalAmount: number;
  amountInBaseCurrency: number;
  paymentTerms: string;
  isMSMEVendor: boolean;
  msmePaymentDueDate?: ISODateString;
  notes?: string;
  attachments?: Attachment[];
  ocrData?: OCRData;
  matchingStatus?: MatchingStatus;
  exceptionFlags?: ExceptionFlag[];
  workflowStatus: WorkflowStatus;
  paymentStatus: PaymentStatus;
  ...AuditFields & WorkflowFields;
}

export type InvoiceType = 'PO_BASED' | 'NON_PO' | 'ADVANCE' | 'DEBIT_NOTE_BASED';

export interface InvoiceLineItem {
  id: UUID;
  lineNumber: number;
  poLineItemId?: UUID;
  grnLineItemId?: UUID;
  itemId?: UUID;
  itemCode?: string;
  itemName: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxCode?: string;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  accountCode?: string;
  costCenterId?: UUID;
  projectId?: UUID;
  // Matching fields for PO-based invoices
  poQuantity?: number;
  grnQuantity?: number;
  invoicedQuantity: number;
  priceVariance?: number;
  quantityVariance?: number;
}

export interface OCRData {
  confidenceScore: number;
  extractedFields: Record<string, OCRField>;
  rawText: string;
  processingTimestamp: ISODateString;
}

export interface OCRField {
  value: string;
  confidence: number;
  boundingBox?: number[];
}

export type MatchingStatus = 
  | 'NOT_APPLICABLE'
  | 'TWO_WAY_MATCHED'
  | 'THREE_WAY_MATCHED'
  | 'VARIANCE_DETECTED'
  | 'MISMATCH';

export interface ExceptionFlag {
  type: ExceptionType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  field?: string;
  autoResolvable: boolean;
}

export type ExceptionType =
  | 'PRICE_VARIANCE'
  | 'QUANTITY_VARIANCE'
  | 'TAX_MISMATCH'
  | 'DUPLICATE_INVOICE'
  | 'MISSING_PO'
  | 'MISSING_GRN'
  | 'PAYMENT_TERMS_MISMATCH'
  | 'VENDOR_MISMATCH'
  | 'CURRENCY_MISMATCH';

export type PaymentStatus = 
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'PAYMENT_SCHEDULED';

// ============================================================================
// DEBIT NOTE
// ============================================================================

export interface DebitNote {
  id: UUID;
  debitNoteNumber: string;
  debitNoteDate: ISODateString;
  vendorId: UUID;
  vendorCode: string;
  vendorName: string;
  entityId: UUID;
  entityCode: EntityCode;
  currency: CurrencyCode;
  exchangeRate: number;
  invoiceId?: UUID;
  invoiceNumber?: string;
  poId?: UUID;
  poNumber?: string;
  reasonCode: string;
  reasonDescription: string;
  lineItems: DebitNoteLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountInBaseCurrency: number;
  notes?: string;
  attachments?: Attachment[];
  settlementMethod: 'VENDOR_PAYMENT' | 'ADJUST_FUTURE_INVOICE' | 'CREDIT_MEMO';
  settlementStatus: 'PENDING' | 'SETTLED' | 'PARTIALLY_SETTLED';
  workflowStatus: WorkflowStatus;
  ...AuditFields & WorkflowFields;
}

export interface DebitNoteLineItem {
  id: UUID;
  lineNumber: number;
  invoiceLineItemId?: UUID;
  itemId?: UUID;
  itemCode?: string;
  itemName: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  taxCode?: string;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
}

// ============================================================================
// ADVANCE PAYMENT
// ============================================================================

export interface AdvancePayment {
  id: UUID;
  advanceNumber: string;
  advanceDate: ISODateString;
  vendorId: UUID;
  vendorCode: string;
  vendorName: string;
  entityId: UUID;
  entityCode: EntityCode;
  currency: CurrencyCode;
  advanceAmount: number;
  purpose: string;
  justification: string;
  poId?: UUID;
  poNumber?: string;
  dueReturnDate?: ISODateString;
  utilizationDeadline?: ISODateString;
  utilizationStatus: 'NOT_UTILIZED' | 'PARTIALLY_UTILIZED' | 'FULLY_UTILIZED' | 'RETURNED';
  utilizationRecords?: UtilizationRecord[];
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  workflowStatus: WorkflowStatus;
  ...AuditFields & WorkflowFields;
}

export interface UtilizationRecord {
  id: UUID;
  utilizationDate: ISODateString;
  invoiceId?: UUID;
  invoiceNumber?: string;
  utilizedAmount: number;
  notes?: string;
}

// ============================================================================
// PAYMENT
// ============================================================================

export interface Payment {
  id: UUID;
  paymentNumber: string;
  paymentDate: ISODateString;
  paymentMethod: PaymentMethod;
  vendorId: UUID;
  vendorName: string;
  entityId: UUID;
  entityCode: EntityCode;
  currency: CurrencyCode;
  amount: number;
  amountInBaseCurrency: number;
  bankAccountId: UUID;
  invoiceIds: UUID[];
  invoiceNumbers: string[];
  reference?: string;
  utrNumber?: string;
  paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  workflowStatus: WorkflowStatus;
  ...AuditFields & WorkflowFields;
}

export type PaymentMethod = 
  | 'BANK_TRANSFER'
  | 'RTGS'
  | 'NEFT'
  | 'IMPS'
  | 'CHEQUE'
  | 'DEMAND_DRAFT'
  | 'CASH';

export interface PaymentBatch {
  id: UUID;
  batchNumber: string;
  batchDate: ISODateString;
  entityId: UUID;
  entityCode: EntityCode;
  totalAmount: number;
  currency: CurrencyCode;
  paymentCount: number;
  payments: Payment[];
  bankAccountId: UUID;
  scheduledDate?: ISODateString;
  processingStatus: 'DRAFT' | 'READY' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  workflowStatus: WorkflowStatus;
  ...AuditFields & WorkflowFields;
}

// ============================================================================
// BUDGET
// ============================================================================

export interface Budget {
  id: UUID;
  budgetCode: string;
  budgetName: string;
  fiscalYear: string;
  budgetType: 'ANNUAL' | 'PROJECT' | 'DEPARTMENT';
  entityId: UUID;
  entityCode: EntityCode;
  departmentId?: UUID;
  costCenterId?: UUID;
  currency: CurrencyCode;
  totalBudget: number;
  allocatedAmount: number;
  committedAmount: number;
  actualSpend: number;
  availableAmount: number;
  lineItems: BudgetLineItem[];
  phasingMonths?: MonthlyPhasing[];
  controlType: 'SOFT' | 'HARD';
  alertThresholds: {
    warning: number;  // percentage
    critical: number; // percentage
  };
  workflowStatus: WorkflowStatus;
  ...AuditFields & WorkflowFields;
}

export interface BudgetLineItem {
  id: UUID;
  accountCode: string;
  accountName: string;
  budgetedAmount: number;
  allocatedAmount: number;
  committedAmount: number;
  actualSpend: number;
  availableAmount: number;
  notes?: string;
}

export interface MonthlyPhasing {
  month: string; // YYYY-MM
  percentage: number;
  amount: number;
}

// ============================================================================
// MASTER DATA
// ============================================================================

export interface CostCenter {
  id: UUID;
  code: string;
  name: string;
  description?: string;
  parentId?: UUID;
  entityId: UUID;
  isActive: boolean;
  workflowStatus: WorkflowStatus;
  ...AuditFields;
}

export interface ProfitCenter {
  id: UUID;
  code: string;
  name: string;
  description?: string;
  entityId: UUID;
  isActive: boolean;
  workflowStatus: WorkflowStatus;
  ...AuditFields;
}

export interface Department {
  id: UUID;
  code: string;
  name: string;
  description?: string;
  headUserId?: UUID;
  parentId?: UUID;
  entityId: UUID;
  isActive: boolean;
  workflowStatus: WorkflowStatus;
  ...AuditFields;
}

export interface GLAccount {
  id: UUID;
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  category: string;
  subCategory?: string;
  parentId?: UUID;
  isActive: boolean;
  entityId: UUID;
  workflowStatus: WorkflowStatus;
  ...AuditFields;
}

export interface TaxCode {
  id: UUID;
  code: string;
  name: string;
  taxType: 'GST' | 'VAT' | 'SALES_TAX' | 'CUSTOMS' | 'TDS' | 'OTHER';
  rate: number;
  description?: string;
  applicableFrom: ISODateString;
  applicableUntil?: ISODateString;
  isActive: boolean;
  entityId: UUID;
  workflowStatus: WorkflowStatus;
  ...AuditFields;
}

export interface Currency {
  id: UUID;
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  workflowStatus: WorkflowStatus;
  ...AuditFields;
}

export interface ExchangeRate {
  id: UUID;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  effectiveDate: ISODateString;
  expiryDate?: ISODateString;
  source: 'MANUAL' | 'CENTRAL_BANK' | 'MARKET' | 'SYSTEM';
  entityId?: UUID;
  isActive: boolean;
  ...AuditFields;
}

export interface User {
  id: UUID;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  employeeCode?: string;
  departmentId?: UUID;
  roleIds: UUID[];
  entityIds: UUID[];
  defaultEntityId: UUID;
  isActive: boolean;
  lastLoginAt?: ISODateString;
  ...AuditFields;
}

export interface Role {
  id: UUID;
  code: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isActive: boolean;
  ...AuditFields;
}

export interface Permission {
  module: string;
  resource: string;
  actions: ('CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE')[];
}

// ============================================================================
// ATTACHMENTS
// ============================================================================

export interface Attachment {
  id: UUID;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadedBy: UUID;
  uploadedAt: ISODateString;
  description?: string;
}

// ============================================================================
// REPORTS & ANALYTICS
// ============================================================================

export interface SpendAnalytics {
  totalSpend: number;
  period: string;
  byVendor: VendorSpend[];
  byCategory: CategorySpend[];
  byDepartment: DepartmentSpend[];
  byEntity: EntitySpend[];
  trends: SpendTrend[];
}

export interface VendorSpend {
  vendorId: UUID;
  vendorName: string;
  totalSpend: number;
  invoiceCount: number;
  averageInvoiceValue: number;
}

export interface CategorySpend {
  category: string;
  totalSpend: number;
  percentage: number;
}

export interface DepartmentSpend {
  departmentId: UUID;
  departmentName: string;
  totalSpend: number;
  budgetedAmount: number;
  variance: number;
}

export interface EntitySpend {
  entityId: UUID;
  entityName: string;
  totalSpend: number;
  currency: CurrencyCode;
}

export interface SpendTrend {
  period: string; // YYYY-MM
  amount: number;
  invoiceCount: number;
}

// ============================================================================
// CASH FLOW
// ============================================================================

export interface CashFlowForecast {
  id: UUID;
  forecastDate: ISODateString;
  forecastType: '13_WEEK' | 'MONTHLY' | 'ANNUAL';
  entityId: UUID;
  currency: CurrencyCode;
  openingBalance: number;
  projectedInflows: CashFlowItem[];
  projectedOutflows: CashFlowItem[];
  closingBalance: number;
  scenarioName?: string;
  ...AuditFields;
}

export interface CashFlowItem {
  date: ISODateString;
  category: string;
  description: string;
  amount: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: 'COMMITTED' | 'FORECASTED' | 'PROJECTED';
}

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

export interface DashboardMetrics {
  totalInvoices: number;
  totalInvoiceValue: number;
  pendingApprovals: number;
  overdueInvoices: number;
  upcomingPayments: number;
  cashPosition: number;
  budgetUtilization: number;
  poComplianceRate: number;
  averageApprovalTime: number;
  vendorOnTimeRate: number;
}

// ============================================================================
// TYPE UTILITIES
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
