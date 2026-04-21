/**
 * ENTITY-SPECIFIC TRANSACTION DATA
 * 
 * Mock transaction datasets with proper entityId tagging for:
 * - Purchase Orders (PO)
 * - Goods Receipt Notes (GRN)
 * - AP Invoices
 * - Vendor Advances
 * - Debit Notes
 * - Payments
 * 
 * Each transaction is tagged with entityId to enable entity-specific filtering
 * and consolidated reporting with FX conversion.
 */

export interface POTransaction {
  id: string;
  poNumber: string;
  poDate: string;
  vendorId?: string;
  vendorCode: string;
  vendorName: string;
  entityId: string;
  entityName: string;
  totalAmount: number;
  currency: string;
  status: 'Draft' | 'Approved' | 'Partially Received' | 'Fully Received' | 'Closed';
  deliveryDate: string;
  costCentre?: string;
  department?: string;
  createdBy: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface GRNTransaction {
  id: string;
  grnNumber: string;
  grnDate: string;
  poNumber: string;
  vendorCode: string;
  vendorName: string;
  entityId: string;
  entityName: string;
  totalAmount: number;
  currency: string;
  status: 'Pending QC' | 'Accepted' | 'Rejected' | 'Partially Accepted';
  receivedBy: string;
}

export interface InvoiceTransaction {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  vendorCode: string;
  vendorName: string;
  entityId: string;
  entityName: string;
  totalAmount: number;
  currency: string;
  status: 'Pending Approval' | 'Approved' | 'Paid' | 'Partially Paid' | 'Overdue';
  dueDate: string;
  poNumber?: string;
  grnNumber?: string;
}

export interface VendorAdvanceTransaction {
  id: string;
  advanceNumber: string;
  advanceDate: string;
  vendorCode: string;
  vendorName: string;
  entityId: string;
  entityName: string;
  amount: number;
  currency: string;
  status: 'Pending Approval' | 'Approved' | 'Adjusted' | 'Refunded';
  purpose: string;
}

export interface DebitNoteTransaction {
  id: string;
  dnNumber: string;
  dnDate: string;
  vendorCode: string;
  vendorName: string;
  entityId: string;
  entityName: string;
  amount: number;
  currency: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Adjusted';
  reason: string;
  invoiceNumber?: string;
}

export interface PaymentTransaction {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  vendorCode: string;
  vendorName: string;
  entityId: string;
  entityName: string;
  amount: number;
  currency: string;
  status: 'Pending' | 'Processed' | 'Failed';
  paymentMode: 'NEFT' | 'RTGS' | 'Cheque' | 'UPI';
  invoiceNumbers: string[];
}

// ============================================================================
// SUBKO COFFEE INDIA - TRANSACTION DATA
// ============================================================================

export const SUBKO_INDIA_POS: POTransaction[] = [
  {
    id: 'PO-SUBKO-IN-001',
    poNumber: 'PO/IN/2024/001',
    poDate: '2024-12-01',
    vendorCode: 'VEN-001',
    vendorName: 'Arabica Coffee Suppliers',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 450000,
    currency: 'INR',
    status: 'Fully Received',
    deliveryDate: '2024-12-15',
    createdBy: 'Rajesh Kumar',
    approvedBy: 'CFO',
    approvedDate: '2024-12-02'
  },
  {
    id: 'PO-SUBKO-IN-002',
    poNumber: 'PO/IN/2024/002',
    poDate: '2024-12-03',
    vendorCode: 'VEN-002',
    vendorName: 'Packaging Materials Ltd',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 120000,
    currency: 'INR',
    status: 'Approved',
    deliveryDate: '2024-12-20',
    createdBy: 'Priya Sharma',
    approvedBy: 'Procurement Head',
    approvedDate: '2024-12-04'
  },
  {
    id: 'PO-SUBKO-IN-003',
    poNumber: 'PO/IN/2024/003',
    poDate: '2024-12-05',
    vendorCode: 'VEN-003',
    vendorName: 'Equipment Maintenance Services',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 85000,
    currency: 'INR',
    status: 'Partially Received',
    deliveryDate: '2024-12-18',
    createdBy: 'Amit Verma',
    approvedBy: 'Operations Manager',
    approvedDate: '2024-12-06'
  },
  {
    id: 'PO-SUBKO-IN-004',
    poNumber: 'PO/IN/2024/004',
    poDate: '2024-12-07',
    vendorCode: 'VEN-004',
    vendorName: 'Dairy Products Wholesalers',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 65000,
    currency: 'INR',
    status: 'Approved',
    deliveryDate: '2024-12-21',
    createdBy: 'Sneha Reddy',
    approvedBy: 'CFO',
    approvedDate: '2024-12-08'
  },
  {
    id: 'PO-SUBKO-IN-005',
    poNumber: 'PO/IN/2024/005',
    poDate: '2024-12-10',
    vendorCode: 'VEN-005',
    vendorName: 'Marketing Agency India',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 200000,
    currency: 'INR',
    status: 'Approved',
    deliveryDate: '2024-12-25',
    createdBy: 'Karthik Iyer',
    approvedBy: 'Marketing Head',
    approvedDate: '2024-12-11'
  },
  {
    id: 'PO-SUBKO-IN-006',
    poNumber: 'PO/IN/2024/006',
    poDate: '2024-12-12',
    vendorCode: 'VEN-006',
    vendorName: 'Cleaning Services Pvt Ltd',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 35000,
    currency: 'INR',
    status: 'Fully Received',
    deliveryDate: '2024-12-16',
    createdBy: 'Lakshmi Narayanan',
    approvedBy: 'Admin Head',
    approvedDate: '2024-12-13'
  },
  {
    id: 'PO-SUBKO-IN-007',
    poNumber: 'PO/IN/2024/007',
    poDate: '2024-12-14',
    vendorCode: 'VEN-007',
    vendorName: 'IT Solutions India',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 150000,
    currency: 'INR',
    status: 'Approved',
    deliveryDate: '2024-12-28',
    createdBy: 'Vivek Menon',
    approvedBy: 'IT Head',
    approvedDate: '2024-12-15'
  },
  {
    id: 'PO-SUBKO-IN-008',
    poNumber: 'PO/IN/2024/008',
    poDate: '2024-12-16',
    vendorCode: 'VEN-008',
    vendorName: 'Logistics Partners India',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 95000,
    currency: 'INR',
    status: 'Approved',
    deliveryDate: '2024-12-30',
    createdBy: 'Anil Kapoor',
    approvedBy: 'Supply Chain Head',
    approvedDate: '2024-12-17'
  }
];

export const SUBKO_INDIA_GRNS: GRNTransaction[] = [
  {
    id: 'GRN-SUBKO-IN-001',
    grnNumber: 'GRN/IN/2024/001',
    grnDate: '2024-12-15',
    poNumber: 'PO/IN/2024/001',
    vendorCode: 'VEN-001',
    vendorName: 'Arabica Coffee Suppliers',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 450000,
    currency: 'INR',
    status: 'Accepted',
    receivedBy: 'Warehouse Manager'
  },
  {
    id: 'GRN-SUBKO-IN-002',
    grnNumber: 'GRN/IN/2024/002',
    grnDate: '2024-12-18',
    poNumber: 'PO/IN/2024/003',
    vendorCode: 'VEN-003',
    vendorName: 'Equipment Maintenance Services',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 42500,
    currency: 'INR',
    status: 'Accepted',
    receivedBy: 'Operations Team'
  },
  {
    id: 'GRN-SUBKO-IN-003',
    grnNumber: 'GRN/IN/2024/003',
    grnDate: '2024-12-16',
    poNumber: 'PO/IN/2024/006',
    vendorCode: 'VEN-006',
    vendorName: 'Cleaning Services Pvt Ltd',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 35000,
    currency: 'INR',
    status: 'Accepted',
    receivedBy: 'Admin Team'
  }
];

export const SUBKO_INDIA_INVOICES: InvoiceTransaction[] = [
  {
    id: 'INV-SUBKO-IN-001',
    invoiceNumber: 'INV/2024/001',
    invoiceDate: '2024-12-15',
    vendorCode: 'VEN-001',
    vendorName: 'Arabica Coffee Suppliers',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 450000,
    currency: 'INR',
    status: 'Approved',
    dueDate: '2025-01-14',
    poNumber: 'PO/IN/2024/001',
    grnNumber: 'GRN/IN/2024/001'
  },
  {
    id: 'INV-SUBKO-IN-002',
    invoiceNumber: 'INV/2024/002',
    invoiceDate: '2024-12-18',
    vendorCode: 'VEN-003',
    vendorName: 'Equipment Maintenance Services',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 85000,
    currency: 'INR',
    status: 'Pending Approval',
    dueDate: '2025-01-17',
    poNumber: 'PO/IN/2024/003',
    grnNumber: 'GRN/IN/2024/002'
  },
  {
    id: 'INV-SUBKO-IN-003',
    invoiceNumber: 'INV/2024/003',
    invoiceDate: '2024-12-16',
    vendorCode: 'VEN-006',
    vendorName: 'Cleaning Services Pvt Ltd',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 35000,
    currency: 'INR',
    status: 'Paid',
    dueDate: '2025-01-15',
    poNumber: 'PO/IN/2024/006',
    grnNumber: 'GRN/IN/2024/003'
  },
  {
    id: 'INV-SUBKO-IN-004',
    invoiceNumber: 'INV/2024/004',
    invoiceDate: '2024-12-10',
    vendorCode: 'VEN-002',
    vendorName: 'Packaging Materials Ltd',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 120000,
    currency: 'INR',
    status: 'Approved',
    dueDate: '2025-01-09'
  },
  {
    id: 'INV-SUBKO-IN-005',
    invoiceNumber: 'INV/2024/005',
    invoiceDate: '2024-12-12',
    vendorCode: 'VEN-004',
    vendorName: 'Dairy Products Wholesalers',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 65000,
    currency: 'INR',
    status: 'Approved',
    dueDate: '2025-01-11'
  },
  {
    id: 'INV-SUBKO-IN-006',
    invoiceNumber: 'INV/2024/006',
    invoiceDate: '2024-12-14',
    vendorCode: 'VEN-005',
    vendorName: 'Marketing Agency India',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 200000,
    currency: 'INR',
    status: 'Pending Approval',
    dueDate: '2025-01-13'
  },
  {
    id: 'INV-SUBKO-IN-007',
    invoiceNumber: 'INV/2024/007',
    invoiceDate: '2024-12-16',
    vendorCode: 'VEN-007',
    vendorName: 'IT Solutions India',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 150000,
    currency: 'INR',
    status: 'Approved',
    dueDate: '2025-01-15'
  },
  {
    id: 'INV-SUBKO-IN-008',
    invoiceNumber: 'INV/2024/008',
    invoiceDate: '2024-12-17',
    vendorCode: 'VEN-008',
    vendorName: 'Logistics Partners India',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 95000,
    currency: 'INR',
    status: 'Pending Approval',
    dueDate: '2025-01-16'
  },
  {
    id: 'INV-SUBKO-IN-009',
    invoiceNumber: 'INV/2024/009',
    invoiceDate: '2024-11-20',
    vendorCode: 'VEN-001',
    vendorName: 'Arabica Coffee Suppliers',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 380000,
    currency: 'INR',
    status: 'Overdue',
    dueDate: '2024-12-20'
  },
  {
    id: 'INV-SUBKO-IN-010',
    invoiceNumber: 'INV/2024/010',
    invoiceDate: '2024-11-25',
    vendorCode: 'VEN-002',
    vendorName: 'Packaging Materials Ltd',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    totalAmount: 95000,
    currency: 'INR',
    status: 'Paid',
    dueDate: '2024-12-25'
  }
];

export const SUBKO_INDIA_ADVANCES: VendorAdvanceTransaction[] = [
  {
    id: 'ADV-SUBKO-IN-001',
    advanceNumber: 'ADV/IN/2024/001',
    advanceDate: '2024-11-15',
    vendorCode: 'VEN-001',
    vendorName: 'Arabica Coffee Suppliers',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    amount: 150000,
    currency: 'INR',
    status: 'Adjusted',
    purpose: 'Coffee Beans - Advance Payment'
  },
  {
    id: 'ADV-SUBKO-IN-002',
    advanceNumber: 'ADV/IN/2024/002',
    advanceDate: '2024-12-01',
    vendorCode: 'VEN-005',
    vendorName: 'Marketing Agency India',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    amount: 75000,
    currency: 'INR',
    status: 'Approved',
    purpose: 'Campaign Advance'
  },
  {
    id: 'ADV-SUBKO-IN-003',
    advanceNumber: 'ADV/IN/2024/003',
    advanceDate: '2024-12-05',
    vendorCode: 'VEN-007',
    vendorName: 'IT Solutions India',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    amount: 50000,
    currency: 'INR',
    status: 'Pending Approval',
    purpose: 'Software License Advance'
  },
  {
    id: 'ADV-SUBKO-IN-004',
    advanceNumber: 'ADV/IN/2024/004',
    advanceDate: '2024-12-08',
    vendorCode: 'VEN-003',
    vendorName: 'Equipment Maintenance Services',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    amount: 30000,
    currency: 'INR',
    status: 'Approved',
    purpose: 'Maintenance Contract Advance'
  },
  {
    id: 'ADV-SUBKO-IN-005',
    advanceNumber: 'ADV/IN/2024/005',
    advanceDate: '2024-12-10',
    vendorCode: 'VEN-002',
    vendorName: 'Packaging Materials Ltd',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    amount: 40000,
    currency: 'INR',
    status: 'Approved',
    purpose: 'Packaging Order Advance'
  }
];

export const SUBKO_INDIA_DEBIT_NOTES: DebitNoteTransaction[] = [
  {
    id: 'DN-SUBKO-IN-001',
    dnNumber: 'DN/IN/2024/001',
    dnDate: '2024-12-05',
    vendorCode: 'VEN-002',
    vendorName: 'Packaging Materials Ltd',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    amount: 5000,
    currency: 'INR',
    status: 'Approved',
    reason: 'Damaged Goods',
    invoiceNumber: 'INV/2024/004'
  },
  {
    id: 'DN-SUBKO-IN-002',
    dnNumber: 'DN/IN/2024/002',
    dnDate: '2024-12-08',
    vendorCode: 'VEN-004',
    vendorName: 'Dairy Products Wholesalers',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    amount: 3000,
    currency: 'INR',
    status: 'Pending Approval',
    reason: 'Quality Issue',
    invoiceNumber: 'INV/2024/005'
  },
  {
    id: 'DN-SUBKO-IN-003',
    dnNumber: 'DN/IN/2024/003',
    dnDate: '2024-12-12',
    vendorCode: 'VEN-001',
    vendorName: 'Arabica Coffee Suppliers',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    amount: 12000,
    currency: 'INR',
    status: 'Draft',
    reason: 'Short Delivery',
    invoiceNumber: 'INV/2024/001'
  },
  {
    id: 'DN-SUBKO-IN-004',
    dnNumber: 'DN/IN/2024/004',
    dnDate: '2024-12-14',
    vendorCode: 'VEN-008',
    vendorName: 'Logistics Partners India',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    amount: 7500,
    currency: 'INR',
    status: 'Approved',
    reason: 'Late Delivery Penalty'
  },
  {
    id: 'DN-SUBKO-IN-005',
    dnNumber: 'DN/IN/2024/005',
    dnDate: '2024-12-16',
    vendorCode: 'VEN-005',
    vendorName: 'Marketing Agency India',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Private Limited',
    amount: 15000,
    currency: 'INR',
    status: 'Pending Approval',
    reason: 'Service Not Delivered'
  }
];

// ============================================================================
// SUBKO COFFEE UAE - TRANSACTION DATA
// ============================================================================

export const SUBKO_UAE_POS: POTransaction[] = [
  {
    id: 'PO-SUBKO-UAE-001',
    poNumber: 'PO/UAE/2024/001',
    poDate: '2024-12-02',
    vendorCode: 'VEN-UAE-001',
    vendorName: 'Dubai Coffee Trading LLC',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 45000,
    currency: 'AED',
    status: 'Fully Received',
    deliveryDate: '2024-12-16',
    createdBy: 'Mohammed Al Maktoum',
    approvedBy: 'Regional Manager',
    approvedDate: '2024-12-03'
  },
  {
    id: 'PO-SUBKO-UAE-002',
    poNumber: 'PO/UAE/2024/002',
    poDate: '2024-12-04',
    vendorCode: 'VEN-UAE-002',
    vendorName: 'Emirates Packaging',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 12000,
    currency: 'AED',
    status: 'Approved',
    deliveryDate: '2024-12-22',
    createdBy: 'Sara Ahmed',
    approvedBy: 'Procurement Manager',
    approvedDate: '2024-12-05'
  },
  {
    id: 'PO-SUBKO-UAE-003',
    poNumber: 'PO/UAE/2024/003',
    poDate: '2024-12-06',
    vendorCode: 'VEN-UAE-003',
    vendorName: 'Gulf Equipment Services',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 8500,
    currency: 'AED',
    status: 'Partially Received',
    deliveryDate: '2024-12-19',
    createdBy: 'Ali Hassan',
    approvedBy: 'Operations Head',
    approvedDate: '2024-12-07'
  },
  {
    id: 'PO-SUBKO-UAE-004',
    poNumber: 'PO/UAE/2024/004',
    poDate: '2024-12-08',
    vendorCode: 'VEN-UAE-004',
    vendorName: 'Fresh Dairy Emirates',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 6800,
    currency: 'AED',
    status: 'Approved',
    deliveryDate: '2024-12-23',
    createdBy: 'Fatima Khalil',
    approvedBy: 'Regional Manager',
    approvedDate: '2024-12-09'
  },
  {
    id: 'PO-SUBKO-UAE-005',
    poNumber: 'PO/UAE/2024/005',
    poDate: '2024-12-11',
    vendorCode: 'VEN-UAE-005',
    vendorName: 'Digital Marketing Dubai',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 18000,
    currency: 'AED',
    status: 'Approved',
    deliveryDate: '2024-12-26',
    createdBy: 'Omar Ibrahim',
    approvedBy: 'Marketing Lead',
    approvedDate: '2024-12-12'
  },
  {
    id: 'PO-SUBKO-UAE-006',
    poNumber: 'PO/UAE/2024/006',
    poDate: '2024-12-13',
    vendorCode: 'VEN-UAE-006',
    vendorName: 'Facility Services LLC',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 3200,
    currency: 'AED',
    status: 'Fully Received',
    deliveryDate: '2024-12-17',
    createdBy: 'Layla Mansoor',
    approvedBy: 'Admin Manager',
    approvedDate: '2024-12-14'
  },
  {
    id: 'PO-SUBKO-UAE-007',
    poNumber: 'PO/UAE/2024/007',
    poDate: '2024-12-15',
    vendorCode: 'VEN-UAE-007',
    vendorName: 'Gulf IT Solutions',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 14000,
    currency: 'AED',
    status: 'Approved',
    deliveryDate: '2024-12-29',
    createdBy: 'Rashid Al Nasser',
    approvedBy: 'IT Manager',
    approvedDate: '2024-12-16'
  },
  {
    id: 'PO-SUBKO-UAE-008',
    poNumber: 'PO/UAE/2024/008',
    poDate: '2024-12-17',
    vendorCode: 'VEN-UAE-008',
    vendorName: 'Emirates Logistics',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 9200,
    currency: 'AED',
    status: 'Approved',
    deliveryDate: '2024-12-31',
    createdBy: 'Ahmed Rashid',
    approvedBy: 'Supply Chain Manager',
    approvedDate: '2024-12-18'
  }
];

export const SUBKO_UAE_GRNS: GRNTransaction[] = [
  {
    id: 'GRN-SUBKO-UAE-001',
    grnNumber: 'GRN/UAE/2024/001',
    grnDate: '2024-12-16',
    poNumber: 'PO/UAE/2024/001',
    vendorCode: 'VEN-UAE-001',
    vendorName: 'Dubai Coffee Trading LLC',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 45000,
    currency: 'AED',
    status: 'Accepted',
    receivedBy: 'Warehouse Supervisor'
  },
  {
    id: 'GRN-SUBKO-UAE-002',
    grnNumber: 'GRN/UAE/2024/002',
    grnDate: '2024-12-19',
    poNumber: 'PO/UAE/2024/003',
    vendorCode: 'VEN-UAE-003',
    vendorName: 'Gulf Equipment Services',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 4250,
    currency: 'AED',
    status: 'Accepted',
    receivedBy: 'Operations Team'
  },
  {
    id: 'GRN-SUBKO-UAE-003',
    grnNumber: 'GRN/UAE/2024/003',
    grnDate: '2024-12-17',
    poNumber: 'PO/UAE/2024/006',
    vendorCode: 'VEN-UAE-006',
    vendorName: 'Facility Services LLC',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 3200,
    currency: 'AED',
    status: 'Accepted',
    receivedBy: 'Admin Team'
  }
];

export const SUBKO_UAE_INVOICES: InvoiceTransaction[] = [
  {
    id: 'INV-SUBKO-UAE-001',
    invoiceNumber: 'INV/UAE/2024/001',
    invoiceDate: '2024-12-16',
    vendorCode: 'VEN-UAE-001',
    vendorName: 'Dubai Coffee Trading LLC',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 45000,
    currency: 'AED',
    status: 'Approved',
    dueDate: '2025-01-15',
    poNumber: 'PO/UAE/2024/001',
    grnNumber: 'GRN/UAE/2024/001'
  },
  {
    id: 'INV-SUBKO-UAE-002',
    invoiceNumber: 'INV/UAE/2024/002',
    invoiceDate: '2024-12-19',
    vendorCode: 'VEN-UAE-003',
    vendorName: 'Gulf Equipment Services',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 8500,
    currency: 'AED',
    status: 'Pending Approval',
    dueDate: '2025-01-18',
    poNumber: 'PO/UAE/2024/003',
    grnNumber: 'GRN/UAE/2024/002'
  },
  {
    id: 'INV-SUBKO-UAE-003',
    invoiceNumber: 'INV/UAE/2024/003',
    invoiceDate: '2024-12-17',
    vendorCode: 'VEN-UAE-006',
    vendorName: 'Facility Services LLC',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 3200,
    currency: 'AED',
    status: 'Paid',
    dueDate: '2025-01-16',
    poNumber: 'PO/UAE/2024/006',
    grnNumber: 'GRN/UAE/2024/003'
  },
  {
    id: 'INV-SUBKO-UAE-004',
    invoiceNumber: 'INV/UAE/2024/004',
    invoiceDate: '2024-12-11',
    vendorCode: 'VEN-UAE-002',
    vendorName: 'Emirates Packaging',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 12000,
    currency: 'AED',
    status: 'Approved',
    dueDate: '2025-01-10'
  },
  {
    id: 'INV-SUBKO-UAE-005',
    invoiceNumber: 'INV/UAE/2024/005',
    invoiceDate: '2024-12-13',
    vendorCode: 'VEN-UAE-004',
    vendorName: 'Fresh Dairy Emirates',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 6800,
    currency: 'AED',
    status: 'Approved',
    dueDate: '2025-01-12'
  },
  {
    id: 'INV-SUBKO-UAE-006',
    invoiceNumber: 'INV/UAE/2024/006',
    invoiceDate: '2024-12-15',
    vendorCode: 'VEN-UAE-005',
    vendorName: 'Digital Marketing Dubai',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 18000,
    currency: 'AED',
    status: 'Pending Approval',
    dueDate: '2025-01-14'
  },
  {
    id: 'INV-SUBKO-UAE-007',
    invoiceNumber: 'INV/UAE/2024/007',
    invoiceDate: '2024-12-17',
    vendorCode: 'VEN-UAE-007',
    vendorName: 'Gulf IT Solutions',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 14000,
    currency: 'AED',
    status: 'Approved',
    dueDate: '2025-01-16'
  },
  {
    id: 'INV-SUBKO-UAE-008',
    invoiceNumber: 'INV/UAE/2024/008',
    invoiceDate: '2024-12-18',
    vendorCode: 'VEN-UAE-008',
    vendorName: 'Emirates Logistics',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 9200,
    currency: 'AED',
    status: 'Pending Approval',
    dueDate: '2025-01-17'
  },
  {
    id: 'INV-SUBKO-UAE-009',
    invoiceNumber: 'INV/UAE/2024/009',
    invoiceDate: '2024-11-21',
    vendorCode: 'VEN-UAE-001',
    vendorName: 'Dubai Coffee Trading LLC',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 38000,
    currency: 'AED',
    status: 'Overdue',
    dueDate: '2024-12-21'
  },
  {
    id: 'INV-SUBKO-UAE-010',
    invoiceNumber: 'INV/UAE/2024/010',
    invoiceDate: '2024-11-26',
    vendorCode: 'VEN-UAE-002',
    vendorName: 'Emirates Packaging',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    totalAmount: 9500,
    currency: 'AED',
    status: 'Paid',
    dueDate: '2024-12-26'
  }
];

export const SUBKO_UAE_ADVANCES: VendorAdvanceTransaction[] = [
  {
    id: 'ADV-SUBKO-UAE-001',
    advanceNumber: 'ADV/UAE/2024/001',
    advanceDate: '2024-11-16',
    vendorCode: 'VEN-UAE-001',
    vendorName: 'Dubai Coffee Trading LLC',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    amount: 15000,
    currency: 'AED',
    status: 'Adjusted',
    purpose: 'Coffee Beans Advance'
  },
  {
    id: 'ADV-SUBKO-UAE-002',
    advanceNumber: 'ADV/UAE/2024/002',
    advanceDate: '2024-12-02',
    vendorCode: 'VEN-UAE-005',
    vendorName: 'Digital Marketing Dubai',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    amount: 7000,
    currency: 'AED',
    status: 'Approved',
    purpose: 'Marketing Campaign Advance'
  },
  {
    id: 'ADV-SUBKO-UAE-003',
    advanceNumber: 'ADV/UAE/2024/003',
    advanceDate: '2024-12-06',
    vendorCode: 'VEN-UAE-007',
    vendorName: 'Gulf IT Solutions',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    amount: 5000,
    currency: 'AED',
    status: 'Pending Approval',
    purpose: 'Software License Advance'
  },
  {
    id: 'ADV-SUBKO-UAE-004',
    advanceNumber: 'ADV/UAE/2024/004',
    advanceDate: '2024-12-09',
    vendorCode: 'VEN-UAE-003',
    vendorName: 'Gulf Equipment Services',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    amount: 3000,
    currency: 'AED',
    status: 'Approved',
    purpose: 'Equipment Maintenance Advance'
  },
  {
    id: 'ADV-SUBKO-UAE-005',
    advanceNumber: 'ADV/UAE/2024/005',
    advanceDate: '2024-12-11',
    vendorCode: 'VEN-UAE-002',
    vendorName: 'Emirates Packaging',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    amount: 4000,
    currency: 'AED',
    status: 'Approved',
    purpose: 'Packaging Order Advance'
  }
];

export const SUBKO_UAE_DEBIT_NOTES: DebitNoteTransaction[] = [
  {
    id: 'DN-SUBKO-UAE-001',
    dnNumber: 'DN/UAE/2024/001',
    dnDate: '2024-12-06',
    vendorCode: 'VEN-UAE-002',
    vendorName: 'Emirates Packaging',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    amount: 500,
    currency: 'AED',
    status: 'Approved',
    reason: 'Damaged Goods',
    invoiceNumber: 'INV/UAE/2024/004'
  },
  {
    id: 'DN-SUBKO-UAE-002',
    dnNumber: 'DN/UAE/2024/002',
    dnDate: '2024-12-09',
    vendorCode: 'VEN-UAE-004',
    vendorName: 'Fresh Dairy Emirates',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    amount: 300,
    currency: 'AED',
    status: 'Pending Approval',
    reason: 'Quality Issue',
    invoiceNumber: 'INV/UAE/2024/005'
  },
  {
    id: 'DN-SUBKO-UAE-003',
    dnNumber: 'DN/UAE/2024/003',
    dnDate: '2024-12-13',
    vendorCode: 'VEN-UAE-001',
    vendorName: 'Dubai Coffee Trading LLC',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    amount: 1200,
    currency: 'AED',
    status: 'Draft',
    reason: 'Short Delivery',
    invoiceNumber: 'INV/UAE/2024/001'
  },
  {
    id: 'DN-SUBKO-UAE-004',
    dnNumber: 'DN/UAE/2024/004',
    dnDate: '2024-12-15',
    vendorCode: 'VEN-UAE-008',
    vendorName: 'Emirates Logistics',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    amount: 750,
    currency: 'AED',
    status: 'Approved',
    reason: 'Late Delivery Penalty'
  },
  {
    id: 'DN-SUBKO-UAE-005',
    dnNumber: 'DN/UAE/2024/005',
    dnDate: '2024-12-17',
    vendorCode: 'VEN-UAE-005',
    vendorName: 'Digital Marketing Dubai',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee LLC',
    amount: 1500,
    currency: 'AED',
    status: 'Pending Approval',
    reason: 'Service Not Delivered'
  }
];

// ============================================================================
// PROCINIX INDIA - TRANSACTION DATA
// ============================================================================

export const PROCINIX_INDIA_POS: POTransaction[] = [
  {
    id: 'PO-PROC-IN-001',
    poNumber: 'PO/PROC/2024/001',
    poDate: '2024-12-03',
    vendorCode: 'VEN-PROC-001',
    vendorName: 'Tech Hardware Suppliers',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 280000,
    currency: 'INR',
    status: 'Fully Received',
    deliveryDate: '2024-12-17',
    createdBy: 'Nikhil Agarwal',
    approvedBy: 'CFO',
    approvedDate: '2024-12-04'
  },
  {
    id: 'PO-PROC-IN-002',
    poNumber: 'PO/PROC/2024/002',
    poDate: '2024-12-05',
    vendorCode: 'VEN-PROC-002',
    vendorName: 'Office Furniture India',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 95000,
    currency: 'INR',
    status: 'Approved',
    deliveryDate: '2024-12-24',
    createdBy: 'Divya Menon',
    approvedBy: 'Admin Head',
    approvedDate: '2024-12-06'
  },
  {
    id: 'PO-PROC-IN-003',
    poNumber: 'PO/PROC/2024/003',
    poDate: '2024-12-07',
    vendorCode: 'VEN-PROC-003',
    vendorName: 'Cloud Services Provider',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 175000,
    currency: 'INR',
    status: 'Approved',
    deliveryDate: '2024-12-20',
    createdBy: 'Rahul Desai',
    approvedBy: 'CTO',
    approvedDate: '2024-12-08'
  },
  {
    id: 'PO-PROC-IN-004',
    poNumber: 'PO/PROC/2024/004',
    poDate: '2024-12-09',
    vendorCode: 'VEN-PROC-004',
    vendorName: 'Consulting Services India',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 320000,
    currency: 'INR',
    status: 'Approved',
    deliveryDate: '2024-12-25',
    createdBy: 'Sanjay Kumar',
    approvedBy: 'CEO',
    approvedDate: '2024-12-10'
  },
  {
    id: 'PO-PROC-IN-005',
    poNumber: 'PO/PROC/2024/005',
    poDate: '2024-12-11',
    vendorCode: 'VEN-PROC-005',
    vendorName: 'Software License Vendor',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 450000,
    currency: 'INR',
    status: 'Partially Received',
    deliveryDate: '2024-12-27',
    createdBy: 'Meera Patel',
    approvedBy: 'CTO',
    approvedDate: '2024-12-12'
  },
  {
    id: 'PO-PROC-IN-006',
    poNumber: 'PO/PROC/2024/006',
    poDate: '2024-12-13',
    vendorCode: 'VEN-PROC-006',
    vendorName: 'Facility Management Services',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 65000,
    currency: 'INR',
    status: 'Fully Received',
    deliveryDate: '2024-12-18',
    createdBy: 'Arjun Nair',
    approvedBy: 'Admin Head',
    approvedDate: '2024-12-14'
  },
  {
    id: 'PO-PROC-IN-007',
    poNumber: 'PO/PROC/2024/007',
    poDate: '2024-12-15',
    vendorCode: 'VEN-PROC-007',
    vendorName: 'Training & Development Co',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 125000,
    currency: 'INR',
    status: 'Approved',
    deliveryDate: '2024-12-30',
    createdBy: 'Priyanka Singh',
    approvedBy: 'HR Head',
    approvedDate: '2024-12-16'
  },
  {
    id: 'PO-PROC-IN-008',
    poNumber: 'PO/PROC/2024/008',
    poDate: '2024-12-17',
    vendorCode: 'VEN-PROC-008',
    vendorName: 'Security Services Ltd',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 85000,
    currency: 'INR',
    status: 'Approved',
    deliveryDate: '2025-01-02',
    createdBy: 'Vijay Kumar',
    approvedBy: 'Operations Head',
    approvedDate: '2024-12-18'
  }
];

export const PROCINIX_INDIA_GRNS: GRNTransaction[] = [
  {
    id: 'GRN-PROC-IN-001',
    grnNumber: 'GRN/PROC/2024/001',
    grnDate: '2024-12-17',
    poNumber: 'PO/PROC/2024/001',
    vendorCode: 'VEN-PROC-001',
    vendorName: 'Tech Hardware Suppliers',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 280000,
    currency: 'INR',
    status: 'Accepted',
    receivedBy: 'IT Manager'
  },
  {
    id: 'GRN-PROC-IN-002',
    grnNumber: 'GRN/PROC/2024/002',
    grnDate: '2024-12-18',
    poNumber: 'PO/PROC/2024/006',
    vendorCode: 'VEN-PROC-006',
    vendorName: 'Facility Management Services',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 65000,
    currency: 'INR',
    status: 'Accepted',
    receivedBy: 'Admin Team'
  },
  {
    id: 'GRN-PROC-IN-003',
    grnNumber: 'GRN/PROC/2024/003',
    grnDate: '2024-12-27',
    poNumber: 'PO/PROC/2024/005',
    vendorCode: 'VEN-PROC-005',
    vendorName: 'Software License Vendor',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 225000,
    currency: 'INR',
    status: 'Accepted',
    receivedBy: 'IT Manager'
  }
];

export const PROCINIX_INDIA_INVOICES: InvoiceTransaction[] = [
  {
    id: 'INV-PROC-IN-001',
    invoiceNumber: 'INV/PROC/2024/001',
    invoiceDate: '2024-12-17',
    vendorCode: 'VEN-PROC-001',
    vendorName: 'Tech Hardware Suppliers',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 280000,
    currency: 'INR',
    status: 'Approved',
    dueDate: '2025-01-16',
    poNumber: 'PO/PROC/2024/001',
    grnNumber: 'GRN/PROC/2024/001'
  },
  {
    id: 'INV-PROC-IN-002',
    invoiceNumber: 'INV/PROC/2024/002',
    invoiceDate: '2024-12-18',
    vendorCode: 'VEN-PROC-006',
    vendorName: 'Facility Management Services',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 65000,
    currency: 'INR',
    status: 'Paid',
    dueDate: '2025-01-17',
    poNumber: 'PO/PROC/2024/006',
    grnNumber: 'GRN/PROC/2024/002'
  },
  {
    id: 'INV-PROC-IN-003',
    invoiceNumber: 'INV/PROC/2024/003',
    invoiceDate: '2024-12-12',
    vendorCode: 'VEN-PROC-002',
    vendorName: 'Office Furniture India',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 95000,
    currency: 'INR',
    status: 'Approved',
    dueDate: '2025-01-11'
  },
  {
    id: 'INV-PROC-IN-004',
    invoiceNumber: 'INV/PROC/2024/004',
    invoiceDate: '2024-12-14',
    vendorCode: 'VEN-PROC-003',
    vendorName: 'Cloud Services Provider',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 175000,
    currency: 'INR',
    status: 'Pending Approval',
    dueDate: '2025-01-13'
  },
  {
    id: 'INV-PROC-IN-005',
    invoiceNumber: 'INV/PROC/2024/005',
    invoiceDate: '2024-12-16',
    vendorCode: 'VEN-PROC-004',
    vendorName: 'Consulting Services India',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 320000,
    currency: 'INR',
    status: 'Approved',
    dueDate: '2025-01-15'
  },
  {
    id: 'INV-PROC-IN-006',
    invoiceNumber: 'INV/PROC/2024/006',
    invoiceDate: '2024-12-27',
    vendorCode: 'VEN-PROC-005',
    vendorName: 'Software License Vendor',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 450000,
    currency: 'INR',
    status: 'Pending Approval',
    dueDate: '2025-01-26',
    poNumber: 'PO/PROC/2024/005',
    grnNumber: 'GRN/PROC/2024/003'
  },
  {
    id: 'INV-PROC-IN-007',
    invoiceNumber: 'INV/PROC/2024/007',
    invoiceDate: '2024-12-18',
    vendorCode: 'VEN-PROC-007',
    vendorName: 'Training & Development Co',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 125000,
    currency: 'INR',
    status: 'Approved',
    dueDate: '2025-01-17'
  },
  {
    id: 'INV-PROC-IN-008',
    invoiceNumber: 'INV/PROC/2024/008',
    invoiceDate: '2024-12-19',
    vendorCode: 'VEN-PROC-008',
    vendorName: 'Security Services Ltd',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 85000,
    currency: 'INR',
    status: 'Pending Approval',
    dueDate: '2025-01-18'
  },
  {
    id: 'INV-PROC-IN-009',
    invoiceNumber: 'INV/PROC/2024/009',
    invoiceDate: '2024-11-22',
    vendorCode: 'VEN-PROC-001',
    vendorName: 'Tech Hardware Suppliers',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 220000,
    currency: 'INR',
    status: 'Overdue',
    dueDate: '2024-12-22'
  },
  {
    id: 'INV-PROC-IN-010',
    invoiceNumber: 'INV/PROC/2024/010',
    invoiceDate: '2024-11-27',
    vendorCode: 'VEN-PROC-003',
    vendorName: 'Cloud Services Provider',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    totalAmount: 160000,
    currency: 'INR',
    status: 'Paid',
    dueDate: '2024-12-27'
  }
];

export const PROCINIX_INDIA_ADVANCES: VendorAdvanceTransaction[] = [
  {
    id: 'ADV-PROC-IN-001',
    advanceNumber: 'ADV/PROC/2024/001',
    advanceDate: '2024-11-17',
    vendorCode: 'VEN-PROC-004',
    vendorName: 'Consulting Services India',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    amount: 100000,
    currency: 'INR',
    status: 'Adjusted',
    purpose: 'Consulting Project Advance'
  },
  {
    id: 'ADV-PROC-IN-002',
    advanceNumber: 'ADV/PROC/2024/002',
    advanceDate: '2024-12-03',
    vendorCode: 'VEN-PROC-005',
    vendorName: 'Software License Vendor',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    amount: 150000,
    currency: 'INR',
    status: 'Approved',
    purpose: 'Annual License Advance'
  },
  {
    id: 'ADV-PROC-IN-003',
    advanceNumber: 'ADV/PROC/2024/003',
    advanceDate: '2024-12-07',
    vendorCode: 'VEN-PROC-003',
    vendorName: 'Cloud Services Provider',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    amount: 75000,
    currency: 'INR',
    status: 'Pending Approval',
    purpose: 'Cloud Migration Advance'
  },
  {
    id: 'ADV-PROC-IN-004',
    advanceNumber: 'ADV/PROC/2024/004',
    advanceDate: '2024-12-10',
    vendorCode: 'VEN-PROC-007',
    vendorName: 'Training & Development Co',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    amount: 50000,
    currency: 'INR',
    status: 'Approved',
    purpose: 'Training Program Advance'
  },
  {
    id: 'ADV-PROC-IN-005',
    advanceNumber: 'ADV/PROC/2024/005',
    advanceDate: '2024-12-12',
    vendorCode: 'VEN-PROC-001',
    vendorName: 'Tech Hardware Suppliers',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    amount: 80000,
    currency: 'INR',
    status: 'Approved',
    purpose: 'Hardware Procurement Advance'
  }
];

export const PROCINIX_INDIA_DEBIT_NOTES: DebitNoteTransaction[] = [
  {
    id: 'DN-PROC-IN-001',
    dnNumber: 'DN/PROC/2024/001',
    dnDate: '2024-12-07',
    vendorCode: 'VEN-PROC-002',
    vendorName: 'Office Furniture India',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    amount: 8000,
    currency: 'INR',
    status: 'Approved',
    reason: 'Damaged Goods',
    invoiceNumber: 'INV/PROC/2024/003'
  },
  {
    id: 'DN-PROC-IN-002',
    dnNumber: 'DN/PROC/2024/002',
    dnDate: '2024-12-10',
    vendorCode: 'VEN-PROC-003',
    vendorName: 'Cloud Services Provider',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    amount: 12000,
    currency: 'INR',
    status: 'Pending Approval',
    reason: 'Service Downtime',
    invoiceNumber: 'INV/PROC/2024/004'
  },
  {
    id: 'DN-PROC-IN-003',
    dnNumber: 'DN/PROC/2024/003',
    dnDate: '2024-12-14',
    vendorCode: 'VEN-PROC-001',
    vendorName: 'Tech Hardware Suppliers',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    amount: 15000,
    currency: 'INR',
    status: 'Draft',
    reason: 'Warranty Claim',
    invoiceNumber: 'INV/PROC/2024/001'
  },
  {
    id: 'DN-PROC-IN-004',
    dnNumber: 'DN/PROC/2024/004',
    dnDate: '2024-12-16',
    vendorCode: 'VEN-PROC-008',
    vendorName: 'Security Services Ltd',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    amount: 6000,
    currency: 'INR',
    status: 'Approved',
    reason: 'Service Level Breach'
  },
  {
    id: 'DN-PROC-IN-005',
    dnNumber: 'DN/PROC/2024/005',
    dnDate: '2024-12-18',
    vendorCode: 'VEN-PROC-004',
    vendorName: 'Consulting Services India',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Solutions Private Limited',
    amount: 25000,
    currency: 'INR',
    status: 'Pending Approval',
    reason: 'Milestone Not Achieved'
  }
];

// ============================================================================
// AGGREGATED DATA EXPORTS
// ============================================================================

export const ALL_POS: POTransaction[] = [
  ...SUBKO_INDIA_POS,
  ...SUBKO_UAE_POS,
  ...PROCINIX_INDIA_POS
];

export const ALL_GRNS: GRNTransaction[] = [
  ...SUBKO_INDIA_GRNS,
  ...SUBKO_UAE_GRNS,
  ...PROCINIX_INDIA_GRNS
];

export const ALL_INVOICES: InvoiceTransaction[] = [
  ...SUBKO_INDIA_INVOICES,
  ...SUBKO_UAE_INVOICES,
  ...PROCINIX_INDIA_INVOICES
];

export const ALL_ADVANCES: VendorAdvanceTransaction[] = [
  ...SUBKO_INDIA_ADVANCES,
  ...SUBKO_UAE_ADVANCES,
  ...PROCINIX_INDIA_ADVANCES
];

export const ALL_DEBIT_NOTES: DebitNoteTransaction[] = [
  ...SUBKO_INDIA_DEBIT_NOTES,
  ...SUBKO_UAE_DEBIT_NOTES,
  ...PROCINIX_INDIA_DEBIT_NOTES
];
