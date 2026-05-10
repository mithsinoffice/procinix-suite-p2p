/**
 * Procurement type definitions — mirrors the relational schema in
 * sql/mysql/migrations/20260510_procurement_relational.sql and the API
 * shapes returned by server/routes/procurement.mjs (camelCase adapters).
 */

export type PRType = 'regular' | 'catalogue' | 'kit_bundle' | 'service' | 'asset_capex' | 'blanket';

export type PRStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'converted_to_po'
  | 'cancelled';

export type POType = 'regular' | 'service' | 'asset_capex' | 'blanket';

export type POStatus =
  | 'draft'
  | 'issued'
  | 'partially_received'
  | 'fully_received'
  | 'invoiced'
  | 'closed'
  | 'cancelled';

export type GRNStatus = 'draft' | 'confirmed' | 'cancelled';
export type SRNStatus = 'draft' | 'confirmed' | 'cancelled';

export type MatchStatus = 'pending' | 'matched' | 'partial' | 'exception';
export type GSTType = 'IGST' | 'CGST_SGST' | 'exempt';
export type ItemType = 'material' | 'service' | 'asset' | 'kit';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface PRLineItem {
  id: string;
  prId?: string;
  lineNumber: number;
  itemType: ItemType;
  itemCode: string;
  itemDescription: string;
  vendorId: string | null;
  vendorName: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  priceVariancePct: number | null;
  parentLineId: string | null;
  isKitParent: boolean;
  servicePeriodFrom: string | null;
  servicePeriodTo: string | null;
  assetTag: string | null;
  depreciationYears: number | null;
  shipToLocation: string;
  deliveryDate: string | null;
  lineAmount: number;
  gstRate: number;
  gstType: GSTType;
  gstAmount: number;
  totalWithGst: number;
}

export interface PurchaseRequest {
  id: string;
  prRef: string;
  tenantId: string;
  entityId: string;
  entityCode: string;
  prType: PRType;
  requesterId: string;
  requesterName: string;
  department: string;
  costCentre: string;
  deliveryLocation: string;
  needByDate: string | null;
  businessJustification: string;
  priority: Priority;
  totalAmount: number;
  totalGst: number;
  currency: string;
  status: PRStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  blanketCeiling: number | null;
  blanketValidityFrom: string | null;
  blanketValidityTo: string | null;
  assetClass: string | null;
  capexBudgetRef: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lineItems: PRLineItem[];
}

export interface POLineItem {
  id: string;
  poId?: string;
  prItemId: string | null;
  lineNumber: number;
  itemType: ItemType;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineAmount: number;
  gstRate: number;
  gstType: GSTType;
  gstAmount: number;
  totalWithGst: number;
  shipToLocation: string;
  deliveryDate: string | null;
  qtyReceived: number;
  amountConsumed: number;
  matchStatus: MatchStatus;
}

export interface PurchaseOrder {
  id: string;
  poRef: string;
  tenantId: string;
  entityId: string;
  entityCode: string;
  vendorId: string;
  vendorName: string;
  vendorGstin: string | null;
  billToGstin: string | null;
  poType: POType;
  paymentTerms: string;
  deliveryTerms: string;
  totalAmount: number;
  totalGst: number;
  totalWithGst: number;
  blanketCeiling: number | null;
  blanketConsumed: number;
  blanketValidityFrom: string | null;
  blanketValidityTo: string | null;
  status: POStatus;
  issuedAt: string | null;
  closedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lineItems: POLineItem[];
}

export interface POPRLink {
  id: string;
  poId: string;
  prId: string;
  tenantId: string;
  createdAt: string;
}

export interface GRNItem {
  id: string;
  grnId: string;
  poItemId: string;
  lineNumber: number;
  itemDescription: string;
  qtyOrdered: number;
  qtyReceived: number;
  qtyAccepted: number;
  qtyRejected: number;
  rejectionReason: string | null;
  unit: string;
  unitPrice: number;
  lineAmount: number;
}

export interface GoodsReceiptNote {
  id: string;
  grnRef: string;
  poId: string;
  tenantId: string;
  entityId: string;
  entityCode: string;
  vendorId: string | null;
  receiptDate: string | null;
  receivedBy: string | null;
  deliveryNoteNo: string | null;
  vehicleNo: string | null;
  remarks: string | null;
  status: GRNStatus;
  confirmedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: GRNItem[];
}

export interface SRNItem {
  id: string;
  srnId: string;
  poItemId: string;
  lineNumber: number;
  serviceDescription: string;
  poLineValue: number;
  amountConsumed: number;
  consumptionPct: number;
  milestone: string;
  remarks: string;
}

export interface ServiceReceiptNote {
  id: string;
  srnRef: string;
  poId: string;
  tenantId: string;
  entityId: string;
  entityCode: string;
  vendorId: string | null;
  servicePeriodFrom: string | null;
  servicePeriodTo: string | null;
  receiptDate: string | null;
  acceptedBy: string | null;
  remarks: string | null;
  status: SRNStatus;
  confirmedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: SRNItem[];
}

export interface ProcurementAuditEntry {
  id: string;
  docType: 'PR' | 'PO' | 'GRN' | 'SRN';
  docId: string;
  docRef: string;
  action: string;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  remarks: string | null;
}

export interface ThreeWayMatchLine {
  poItemId: string;
  lineNumber: number;
  itemType: ItemType;
  matched: boolean;
  matchStatus: MatchStatus;
  /** Material lines */
  grnQty?: number;
  poQty?: number;
  /** Service lines */
  srnValue?: number;
  poLineValue?: number;
}

export interface ThreeWayMatchResult {
  poId: string;
  poRef: string;
  headerMatched: boolean;
  lines: ThreeWayMatchLine[];
  summary: {
    total: number;
    matched: number;
  };
}
