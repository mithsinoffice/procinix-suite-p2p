import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ensureDomainDocument, saveDomainDocument } from '../lib/mysql/documentStore';

// ============= INTERFACES =============

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  vendorName: string;
  vendorCode: string;
  invoiceType: 'PO' | 'Non-PO' | 'Expense';
  poNumber?: string;
  totalAmount: number;
  currency: string;
  status: 'Draft' | 'Pending Approval' | 'Under Review' | 'Approved' | 'Rejected' | 'Paid' | 'Partially Paid';
  dueDate?: string;
  approver?: string;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';
  matchStatus?: '3-Way Matched' | 'Partially Matched' | 'Unmatched';
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  vendorCode: string;
  vendorGSTIN: string;
  date: string;
  amount: number;
  openAmount: number; // Amount yet to be invoiced
  status: 'Draft' | 'Issued' | 'Partially Received' | 'Fully Received' | 'Closed / Cancelled';
  department: string;
  shipToState?: string;
  type: 'Goods' | 'Services';
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  milestones?: Milestone[]; // Optional milestones for PO-based advances
  lineItems: POLineItem[];
}

export interface Milestone {
  id: string;
  poNumber: string;
  name: string;
  description: string;
  amount: number;
  dueDate: string;
  eligibleAdvanceAmount: number;
  advanceUtilized: number;
  remainingEligibleAmount: number;
  status: 'Pending' | 'In Progress' | 'Completed';
}

export interface POLineItem {
  id: string;
  itemCode: string;
  itemName: string;
  itemDescription: string;
  accountCode: string;
  accountDescription: string;
  qty: number;
  receivedQty: number;
  invoicedQty: number;
  remainingQty: number;
  unitPrice: number;
  amount: number;
  gstPercent: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  grossAmount: number;
  tdsPercent: number;
  tdsSection?: string;
  tdsAmount: number;
  netAmount: number;
  costCentre: string;
  profitCentre: string;
  project: string;
}

export interface GRN {
  id: string;
  grnNumber: string;
  poNumber: string;
  vendor: string;
  receiptDate: string;
  amount: number;
  qtyReceived: number;
  poQty: number;
  status: 'Pending' | 'Partial' | 'Complete';
  allocationStatus: 'Not Allocated' | 'Partially Allocated' | 'Fully Allocated' | 'Accepted';
  lineItems: GRNLineItem[];
  po?: PurchaseOrder;
}

export interface GRNLineItem {
  id: string;
  grnNumber: string;
  poLineItemId: string;
  itemCode: string;
  itemName: string;
  itemDescription: string;
  qtyOrdered: number;
  qtyReceived: number;
  qtyAccepted: number;
  qtyRejected: number;
  unitPrice: number;
  amount: number;
}

export interface Vendor {
  code: string;
  name: string;
  gstin: string;
  type: 'Domestic' | 'International';
  paymentTerms: string;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  category: string;
}

export interface Advance {
  id: string;
  advanceNumber: string;
  vendor: string;
  vendorCode: string;
  type: 'PO-linked' | 'On-account';
  reference: string; // PO Number or Advance Reference
  originalAmount: number;
  adjustedAmount: number;
  openBalance: number;
  date: string;
  status: 'Open' | 'Partially Adjusted' | 'Fully Adjusted';
}

export interface AdvanceRequest {
  id: string;
  requestNumber: string;
  vendor: string;
  vendorCode: string;
  vendorGSTIN: string;
  advanceType: 'PO-based' | 'On-Account';
  poNumber?: string;
  milestoneId?: string;
  milestoneName?: string;
  requestedAmount: number;
  advancePercentage?: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  advanceDate: string;
  purpose: string;
  tdsApplicable: boolean;
  tdsSection?: string;
  tdsRate: number;
  tdsAmount: number;
  netPayable: number;
  approvalWorkflow: 'Auto' | 'Manual';
  approvers: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  escalationTimeline: number; // hours
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Cancelled';
  paymentStatus: 'Pending' | 'In Queue' | 'Processed' | 'Failed';
  approvedAmount?: number;
  approvedDate?: string;
  rejectionReason?: string;
  createdBy: string;
  createdDate: string;
  submittedDate?: string;
}

export interface AdvanceUtilization {
  id: string;
  advanceNumber: string;
  vendor: string;
  vendorCode: string;
  originalAmount: number;
  adjustments: AdvanceAdjustment[];
  remainingBalance: number;
  status: 'Open' | 'Partially Adjusted' | 'Fully Adjusted';
}

export interface AdvanceAdjustment {
  id: string;
  adjustmentDate: string;
  invoiceNumber: string;
  adjustedAmount: number;
  narration: string;
}

export interface DebitNoteLine {
  id: string;
  itemCode: string;
  itemName: string;
  referenceQty: number;
  invoicedQty: number;
  debitQty: number;
  uom: string;
  rate: number;
  debitAmount: number;
  expenseGL?: string;
}

export interface DebitNote {
  id: string;
  debitNoteNumber: string;
  debitNoteDate: string;
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  vendorAPAccount?: string;
  referenceType: 'Invoice' | 'GRN';
  referenceNumber: string;
  referenceId: string;
  reasonId: string;
  reasonName: string;
  debitAmount: number;
  currency: string;
  status: 'Draft' | 'Pending Approval' | 'Issued' | 'Adjusted' | 'Closed' | 'Rejected';
  lineItems: DebitNoteLine[];
  createdBy: string;
  createdDate: string;
  issuedBy?: string;
  issuedDate?: string;
}

// ============= MOCK DATA =============

const mockVendors: Vendor[] = [
  { code: 'V001', name: 'Acme Supplies Ltd', gstin: '27AAAAA0000A1Z5', type: 'Domestic', paymentTerms: 'Net 30', currency: 'INR', category: 'Contractor' },
  { code: 'V002', name: 'Global Tech Solutions', gstin: '27BBBBB0000B1Z5', type: 'Domestic', paymentTerms: 'Net 45', currency: 'INR', category: 'Professional Services' },
  { code: 'V003', name: 'Office Depot India', gstin: '27CCCCC0000C1Z5', type: 'Domestic', paymentTerms: 'Net 15', currency: 'INR', category: 'MSME' },
  { code: 'V004', name: 'Engineering Parts Co', gstin: '27DDDDD0000D1Z5', type: 'Domestic', paymentTerms: 'Net 60', currency: 'INR', category: 'Contractor' },
  { code: 'V005', name: 'Marketing Materials Inc', gstin: '27EEEEE0000E1Z5', type: 'Domestic', paymentTerms: 'Net 30', currency: 'INR', category: 'Commission' },
  { code: 'V006', name: 'Facility Services Ltd', gstin: '27FFFFF0000F1Z5', type: 'Domestic', paymentTerms: 'Net 30', currency: 'INR', category: 'Rent' },
];

const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    poNumber: 'PO-2024-001',
    vendor: 'Acme Supplies Ltd',
    vendorCode: 'V001',
    vendorGSTIN: '27AAAAA0000A1Z5',
    date: '2024-12-10',
    amount: 125000,
    openAmount: 81250, // 65% open
    status: 'Issued',
    department: 'IT',
    type: 'Goods',
    currency: 'INR',
    milestones: [
      {
        id: 'M1-PO1',
        poNumber: 'PO-2024-001',
        name: 'Initial Delivery',
        description: 'Delivery of first batch of IT equipment',
        amount: 50000,
        dueDate: '2024-12-15',
        eligibleAdvanceAmount: 20000,
        advanceUtilized: 0,
        remainingEligibleAmount: 20000,
        status: 'Pending'
      },
      {
        id: 'M2-PO1',
        poNumber: 'PO-2024-001',
        name: 'Final Delivery',
        description: 'Delivery of remaining IT equipment',
        amount: 75000,
        dueDate: '2024-12-20',
        eligibleAdvanceAmount: 30000,
        advanceUtilized: 0,
        remainingEligibleAmount: 30000,
        status: 'Pending'
      }
    ],
    lineItems: [
      {
        id: 'PO1-L1',
        itemCode: 'IT-LAP-001',
        itemName: 'Dell Laptop XPS 15',
        itemDescription: 'Dell XPS 15 - Intel i7, 16GB RAM, 512GB SSD',
        accountCode: 'ACC-5001',
        accountDescription: 'IT Equipment',
        qty: 10,
        receivedQty: 10,
        invoicedQty: 0,
        remainingQty: 10,
        unitPrice: 85000,
        amount: 850000,
        gstPercent: 18,
        gstAmount: 153000,
        cgst: 76500,
        sgst: 76500,
        igst: 0,
        grossAmount: 1003000,
        tdsPercent: 2,
        tdsAmount: 17000,
        netAmount: 986000,
        costCentre: 'CC-IT-001',
        profitCentre: 'PC-CORP-001',
        project: 'PRJ-2024-IT-INFRA'
      },
      {
        id: 'PO1-L2',
        itemCode: 'IT-MON-001',
        itemName: 'Dell Monitor 27"',
        itemDescription: 'Dell 27" 4K Monitor - USB-C',
        accountCode: 'ACC-5001',
        accountDescription: 'IT Equipment',
        qty: 15,
        receivedQty: 15,
        invoicedQty: 0,
        remainingQty: 15,
        unitPrice: 25000,
        amount: 375000,
        gstPercent: 18,
        gstAmount: 67500,
        cgst: 33750,
        sgst: 33750,
        igst: 0,
        grossAmount: 442500,
        tdsPercent: 2,
        tdsAmount: 7500,
        netAmount: 435000,
        costCentre: 'CC-IT-001',
        profitCentre: 'PC-CORP-001',
        project: 'PRJ-2024-IT-INFRA'
      }
    ]
  },
  {
    id: '2',
    poNumber: 'PO-2024-002',
    vendor: 'Global Tech Solutions',
    vendorCode: 'V002',
    vendorGSTIN: '27BBBBB0000B1Z5',
    date: '2024-12-09',
    amount: 450000,
    openAmount: 292500, // 65% open
    status: 'Partially Received',
    department: 'Operations',
    type: 'Services',
    currency: 'INR',
    milestones: [
      {
        id: 'M1-PO2',
        poNumber: 'PO-2024-002',
        name: 'Setup & Configuration',
        description: 'Initial cloud infrastructure setup',
        amount: 150000,
        dueDate: '2024-12-18',
        eligibleAdvanceAmount: 60000,
        advanceUtilized: 0,
        remainingEligibleAmount: 60000,
        status: 'In Progress'
      },
      {
        id: 'M2-PO2',
        poNumber: 'PO-2024-002',
        name: 'Go Live',
        description: 'Production deployment and go-live',
        amount: 200000,
        dueDate: '2024-12-28',
        eligibleAdvanceAmount: 80000,
        advanceUtilized: 0,
        remainingEligibleAmount: 80000,
        status: 'Pending'
      },
      {
        id: 'M3-PO2',
        poNumber: 'PO-2024-002',
        name: 'Support & Maintenance',
        description: 'Post go-live support for 3 months',
        amount: 100000,
        dueDate: '2025-01-15',
        eligibleAdvanceAmount: 40000,
        advanceUtilized: 0,
        remainingEligibleAmount: 40000,
        status: 'Pending'
      }
    ],
    lineItems: [
      {
        id: 'PO2-L1',
        itemCode: 'SRV-CLOUD-001',
        itemName: 'Cloud Hosting Services',
        itemDescription: 'AWS Cloud Services - Annual License',
        accountCode: 'ACC-6001',
        accountDescription: 'Cloud Services',
        qty: 1,
        receivedQty: 0,
        invoicedQty: 0,
        remainingQty: 1,
        unitPrice: 450000,
        amount: 450000,
        gstPercent: 18,
        gstAmount: 81000,
        cgst: 40500,
        sgst: 40500,
        igst: 0,
        grossAmount: 531000,
        tdsPercent: 10,
        tdsAmount: 45000,
        netAmount: 486000,
        costCentre: 'CC-OPS-001',
        profitCentre: 'PC-TECH-001',
        project: 'PRJ-2024-CLOUD'
      }
    ]
  },
  {
    id: '3',
    poNumber: 'PO-2024-003',
    vendor: 'Office Depot India',
    vendorCode: 'V003',
    vendorGSTIN: '27CCCCC0000C1Z5',
    date: '2024-12-08',
    amount: 45200,
    openAmount: 29380, // 65% open
    status: 'Fully Received',
    department: 'Admin',
    type: 'Goods',
    currency: 'INR',
    lineItems: [
      {
        id: 'PO3-L1',
        itemCode: 'OFF-CHR-001',
        itemName: 'Office Chair',
        itemDescription: 'Ergonomic Office Chair - Mesh Back',
        accountCode: 'ACC-5002',
        accountDescription: 'Office Furniture',
        qty: 25,
        receivedQty: 25,
        invoicedQty: 0,
        remainingQty: 25,
        unitPrice: 8500,
        amount: 212500,
        gstPercent: 12,
        gstAmount: 25500,
        cgst: 12750,
        sgst: 12750,
        igst: 0,
        grossAmount: 238000,
        tdsPercent: 1,
        tdsAmount: 2125,
        netAmount: 235875,
        costCentre: 'CC-ADM-001',
        profitCentre: 'PC-CORP-001',
        project: ''
      }
    ]
  }
];

const mockGRNs: GRN[] = [
  {
    id: '1',
    grnNumber: 'GRN-2024-001',
    poNumber: 'PO-2024-001',
    vendor: 'Acme Supplies Ltd',
    receiptDate: '2024-12-11',
    amount: 125000,
    qtyReceived: 10,
    poQty: 10,
    status: 'Complete',
    allocationStatus: 'Accepted',
    lineItems: [
      {
        id: 'GRN1-L1',
        grnNumber: 'GRN-2024-001',
        poLineItemId: 'PO1-L1',
        itemCode: 'IT-LAP-001',
        itemName: 'Dell Laptop XPS 15',
        itemDescription: 'Dell XPS 15 - Intel i7, 16GB RAM, 512GB SSD',
        qtyOrdered: 10,
        qtyReceived: 10,
        qtyAccepted: 10,
        qtyRejected: 0,
        unitPrice: 85000,
        amount: 850000
      }
    ]
  },
  {
    id: '2',
    grnNumber: 'GRN-2024-002',
    poNumber: 'PO-2024-001',
    vendor: 'Acme Supplies Ltd',
    receiptDate: '2024-12-12',
    amount: 375000,
    qtyReceived: 15,
    poQty: 15,
    status: 'Complete',
    allocationStatus: 'Accepted',
    lineItems: [
      {
        id: 'GRN2-L1',
        grnNumber: 'GRN-2024-002',
        poLineItemId: 'PO1-L2',
        itemCode: 'IT-MON-001',
        itemName: 'Dell Monitor 27"',
        itemDescription: 'Dell 27" 4K Monitor - USB-C',
        qtyOrdered: 15,
        qtyReceived: 15,
        qtyAccepted: 15,
        qtyRejected: 0,
        unitPrice: 25000,
        amount: 375000
      }
    ]
  },
  {
    id: '3',
    grnNumber: 'GRN-2024-003',
    poNumber: 'PO-2024-003',
    vendor: 'Office Depot India',
    receiptDate: '2024-12-10',
    amount: 212500,
    qtyReceived: 25,
    poQty: 25,
    status: 'Complete',
    allocationStatus: 'Accepted',
    lineItems: [
      {
        id: 'GRN3-L1',
        grnNumber: 'GRN-2024-003',
        poLineItemId: 'PO3-L1',
        itemCode: 'OFF-CHR-001',
        itemName: 'Office Chair',
        itemDescription: 'Ergonomic Office Chair - Mesh Back',
        qtyOrdered: 25,
        qtyReceived: 25,
        qtyAccepted: 25,
        qtyRejected: 0,
        unitPrice: 8500,
        amount: 212500
      }
    ]
  }
];

const mockAdvances: Advance[] = [
  {
    id: '1',
    advanceNumber: 'ADV-2024-001',
    vendor: 'Acme Supplies Ltd',
    vendorCode: 'V001',
    type: 'PO-linked',
    reference: 'PO-2024-001',
    originalAmount: 50000,
    adjustedAmount: 20000,
    openBalance: 30000,
    date: '2024-11-15',
    status: 'Partially Adjusted'
  },
  {
    id: '2',
    advanceNumber: 'ADV-2024-002',
    vendor: 'Acme Supplies Ltd',
    vendorCode: 'V001',
    type: 'On-account',
    reference: 'ADV/2024/001',
    originalAmount: 75000,
    adjustedAmount: 25000,
    openBalance: 50000,
    date: '2024-11-20',
    status: 'Partially Adjusted'
  },
  {
    id: '3',
    advanceNumber: 'ADV-2024-003',
    vendor: 'Global Tech Solutions',
    vendorCode: 'V002',
    type: 'PO-linked',
    reference: 'PO-2024-002',
    originalAmount: 100000,
    adjustedAmount: 0,
    openBalance: 100000,
    date: '2024-11-25',
    status: 'Open'
  }
];

const mockAdvanceRequests: AdvanceRequest[] = [
  {
    id: '1',
    requestNumber: 'AR-2024-001',
    vendor: 'Acme Supplies Ltd',
    vendorCode: 'V001',
    vendorGSTIN: '27AAAAA0000A1Z5',
    advanceType: 'PO-based',
    poNumber: 'PO-2024-001',
    milestoneId: 'M1',
    milestoneName: 'Initial Setup',
    requestedAmount: 20000,
    advancePercentage: 40,
    currency: 'INR',
    advanceDate: '2024-12-01',
    purpose: 'Initial setup and configuration of IT equipment',
    tdsApplicable: true,
    tdsSection: '194C',
    tdsRate: 2,
    tdsAmount: 400,
    netPayable: 19600,
    approvalWorkflow: 'Manual',
    approvers: ['John Doe', 'Jane Smith'],
    priority: 'High',
    escalationTimeline: 48,
    status: 'Submitted',
    paymentStatus: 'Pending',
    approvedAmount: 19600,
    approvedDate: '2024-12-02',
    rejectionReason: '',
    createdBy: 'John Doe',
    createdDate: '2024-12-01',
    submittedDate: '2024-12-01'
  },
  {
    id: '2',
    requestNumber: 'AR-2024-002',
    vendor: 'Acme Supplies Ltd',
    vendorCode: 'V001',
    vendorGSTIN: '27AAAAA0000A1Z5',
    advanceType: 'On-Account',
    requestedAmount: 30000,
    currency: 'INR',
    advanceDate: '2024-12-05',
    purpose: 'General expenses for IT department',
    tdsApplicable: false,
    tdsSection: '',
    tdsRate: 0,
    tdsAmount: 0,
    netPayable: 30000,
    approvalWorkflow: 'Auto',
    approvers: [],
    priority: 'Medium',
    escalationTimeline: 24,
    status: 'Approved',
    paymentStatus: 'In Queue',
    approvedAmount: 30000,
    approvedDate: '2024-12-06',
    rejectionReason: '',
    createdBy: 'Jane Smith',
    createdDate: '2024-12-05',
    submittedDate: '2024-12-05'
  }
];

const mockAdvanceUtilizations: AdvanceUtilization[] = [
  {
    id: '1',
    advanceNumber: 'ADV-2024-001',
    vendor: 'Acme Supplies Ltd',
    vendorCode: 'V001',
    originalAmount: 50000,
    adjustments: [
      {
        id: 'A1',
        adjustmentDate: '2024-12-03',
        invoiceNumber: 'INV-2024-001',
        adjustedAmount: 20000,
        narration: 'Payment for initial setup'
      }
    ],
    remainingBalance: 30000,
    status: 'Partially Adjusted'
  },
  {
    id: '2',
    advanceNumber: 'ADV-2024-002',
    vendor: 'Acme Supplies Ltd',
    vendorCode: 'V001',
    originalAmount: 75000,
    adjustments: [
      {
        id: 'A2',
        adjustmentDate: '2024-12-04',
        invoiceNumber: 'INV-2024-002',
        adjustedAmount: 25000,
        narration: 'Payment for general expenses'
      }
    ],
    remainingBalance: 50000,
    status: 'Partially Adjusted'
  }
];

const mockDebitNotes: DebitNote[] = [
  {
    id: 'DN-001',
    debitNoteNumber: 'DN-2024-001',
    debitNoteDate: '2024-12-15',
    vendorId: 'VEN-SUBKO-001',
    vendorName: 'ABC Coffee Suppliers',
    vendorCode: 'VEN-2001',
    vendorAPAccount: '2100-001',
    referenceType: 'Invoice',
    referenceNumber: 'INV-2024-001',
    referenceId: 'INV-001',
    reasonId: 'DNR-001',
    reasonName: 'Short Supply',
    debitAmount: 15000,
    currency: 'INR',
    status: 'Issued',
    lineItems: [],
    createdBy: 'Priya Sharma',
    createdDate: '2024-12-15T09:30:00',
    issuedBy: 'Rajesh Kumar',
    issuedDate: '2024-12-15T10:45:00',
  },
  {
    id: 'DN-002',
    debitNoteNumber: 'DN-2024-002',
    debitNoteDate: '2024-12-16',
    vendorId: 'VEN-SUBKO-002',
    vendorName: 'FreshBeans India Pvt Ltd',
    vendorCode: 'VEN-2002',
    vendorAPAccount: '2100-002',
    referenceType: 'Invoice',
    referenceNumber: 'INV-2024-005',
    referenceId: 'INV-005',
    reasonId: 'DNR-002',
    reasonName: 'Price Difference',
    debitAmount: 8500,
    currency: 'INR',
    status: 'Draft',
    lineItems: [],
    createdBy: 'Rajesh Kumar',
    createdDate: '2024-12-16T08:45:00',
  },
  {
    id: 'DN-003',
    debitNoteNumber: 'DN-2024-003',
    debitNoteDate: '2024-12-14',
    vendorId: 'VEN-SUBKO-003',
    vendorName: 'Packaging Solutions Co',
    vendorCode: 'VEN-2003',
    vendorAPAccount: '2100-003',
    referenceType: 'GRN',
    referenceNumber: 'GRN-2024-056',
    referenceId: 'GRN-056',
    reasonId: 'DNR-003',
    reasonName: 'Quality / Damage',
    debitAmount: 12000,
    currency: 'INR',
    status: 'Adjusted',
    lineItems: [],
    createdBy: 'Amit Patel',
    createdDate: '2024-12-14T11:10:00',
  },
];

const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    invoiceDate: '2024-12-15',
    vendorName: 'Acme Supplies Ltd',
    vendorCode: 'V001',
    invoiceType: 'PO',
    poNumber: 'PO-2024-001',
    totalAmount: 1225000,
    currency: 'INR',
    status: 'Pending Approval',
    dueDate: '2025-01-14',
    approver: 'John Smith',
    paymentStatus: 'Unpaid',
    matchStatus: '3-Way Matched'
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    invoiceDate: '2024-12-14',
    vendorName: 'Global Tech Solutions',
    vendorCode: 'V002',
    invoiceType: 'PO',
    poNumber: 'PO-2024-002',
    totalAmount: 157500,
    currency: 'INR',
    status: 'Approved',
    dueDate: '2025-01-28',
    approver: 'Jane Doe',
    paymentStatus: 'Unpaid',
    matchStatus: 'Partially Matched'
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    invoiceDate: '2024-12-13',
    vendorName: 'Office Depot India',
    vendorCode: 'V003',
    invoiceType: 'PO',
    poNumber: 'PO-2024-003',
    totalAmount: 238000,
    currency: 'INR',
    status: 'Paid',
    dueDate: '2024-12-28',
    approver: 'Mike Johnson',
    paymentStatus: 'Paid',
    matchStatus: '3-Way Matched'
  },
  {
    id: '4',
    invoiceNumber: 'INV-2024-004',
    invoiceDate: '2024-12-12',
    vendorName: 'Engineering Parts Co',
    vendorCode: 'V004',
    invoiceType: 'Non-PO',
    totalAmount: 85000,
    currency: 'INR',
    status: 'Approved',
    dueDate: '2025-02-11',
    approver: 'Sarah Williams',
    paymentStatus: 'Unpaid',
    matchStatus: 'Unmatched'
  },
  {
    id: '5',
    invoiceNumber: 'INV-2024-005',
    invoiceDate: '2024-12-11',
    vendorName: 'Marketing Materials Inc',
    vendorCode: 'V005',
    invoiceType: 'Non-PO',
    totalAmount: 125000,
    currency: 'INR',
    status: 'Under Review',
    dueDate: '2025-01-10',
    approver: 'David Brown',
    paymentStatus: 'Unpaid',
    matchStatus: 'Unmatched'
  },
  {
    id: '6',
    invoiceNumber: 'INV-2024-006',
    invoiceDate: '2024-12-10',
    vendorName: 'Facility Services Ltd',
    vendorCode: 'V006',
    invoiceType: 'Expense',
    totalAmount: 65000,
    currency: 'INR',
    status: 'Rejected',
    dueDate: '2025-01-09',
    approver: 'Emma Davis',
    paymentStatus: 'Unpaid',
    matchStatus: 'Unmatched'
  },
  {
    id: '7',
    invoiceNumber: 'INV-2024-007',
    invoiceDate: '2024-12-09',
    vendorName: 'Acme Supplies Ltd',
    vendorCode: 'V001',
    invoiceType: 'PO',
    poNumber: 'PO-2024-001',
    totalAmount: 442500,
    currency: 'INR',
    status: 'Paid',
    dueDate: '2025-01-08',
    approver: 'John Smith',
    paymentStatus: 'Paid',
    matchStatus: '3-Way Matched'
  },
  {
    id: '8',
    invoiceNumber: 'INV-2024-008',
    invoiceDate: '2024-12-08',
    vendorName: 'Global Tech Solutions',
    vendorCode: 'V002',
    invoiceType: 'Expense',
    totalAmount: 95000,
    currency: 'INR',
    status: 'Pending Approval',
    dueDate: '2024-12-22',
    approver: 'Jane Doe',
    paymentStatus: 'Unpaid',
    matchStatus: 'Unmatched'
  }
];

// ============= CONTEXT =============

interface APDataContextType {
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  grns: GRN[];
  advances: Advance[];
  advanceRequests: AdvanceRequest[];
  advanceUtilizations: AdvanceUtilization[];
  invoices: Invoice[];
  debitNotes: DebitNote[];
  isHydrating: boolean;
  getVendorByCode: (code: string) => Vendor | undefined;
  getPOsByVendor: (vendorCode: string) => PurchaseOrder[];
  getGRNsByPO: (poNumber: string) => GRN[];
  getAdvancesByVendor: (vendorCode: string) => Advance[];
  getPOByNumber: (poNumber: string) => PurchaseOrder | undefined;
  getDebitNoteById: (id: string) => DebitNote | undefined;
  addGRN: (grn: GRN) => void;
  addInvoice: (invoice: Invoice) => void;
  addDebitNote: (debitNote: DebitNote) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  updateDebitNote: (id: string, updates: Partial<DebitNote>) => void;
  updateAdvanceRequest: (id: string, updates: Partial<AdvanceRequest>) => void;
  updateGRN: (id: string, updates: Partial<GRN>) => void;
}

const APDataContext = createContext<APDataContextType | undefined>(undefined);

interface APDataDocument {
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  grns: GRN[];
  advances: Advance[];
  advanceRequests: AdvanceRequest[];
  advanceUtilizations: AdvanceUtilization[];
  invoices: Invoice[];
  debitNotes: DebitNote[];
}

export function APDataProvider({ children }: { children: ReactNode }) {
  const defaultDocument: APDataDocument = {
    vendors: mockVendors,
    purchaseOrders: mockPurchaseOrders,
    grns: mockGRNs,
    advances: mockAdvances,
    advanceRequests: mockAdvanceRequests,
    advanceUtilizations: mockAdvanceUtilizations,
    invoices: mockInvoices,
    debitNotes: mockDebitNotes,
  };

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [advanceRequests, setAdvanceRequests] = useState<AdvanceRequest[]>([]);
  const [advanceUtilizations, setAdvanceUtilizations] = useState<AdvanceUtilization[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const document = await ensureDomainDocument('ap_data', defaultDocument, { seedIfMissing: false });
      if (!isMounted) {
        return;
      }

      setVendors(document.vendors ?? defaultDocument.vendors);
      setPurchaseOrders(document.purchaseOrders ?? defaultDocument.purchaseOrders);
      setGRNs(document.grns ?? defaultDocument.grns);
      setAdvances(document.advances ?? defaultDocument.advances);
      setAdvanceRequests(document.advanceRequests ?? defaultDocument.advanceRequests);
      setAdvanceUtilizations(document.advanceUtilizations ?? defaultDocument.advanceUtilizations);
      setInvoices(document.invoices ?? defaultDocument.invoices);
      setDebitNotes(document.debitNotes ?? defaultDocument.debitNotes);
      setIsHydrating(false);
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch AI-ingested invoices from MySQL and merge into state
  useEffect(() => {
    if (isHydrating) return;
    let cancelled = false;

    const fetchIngested = async () => {
      try {
        const res = await fetch('/api/invoices?source=email_ingestion');
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data) || cancelled) return;

        const mapped: Invoice[] = json.data.map((row: any) => {
          const hasPO = !!row.po_number || !!row.po_id;
          const statusMap: Record<string, Invoice['status']> = {
            pending_approval: 'Pending Approval',
            draft: 'Draft',
            approved: 'Approved',
            rejected: 'Rejected',
            paid: 'Paid',
          };
          return {
            id: row.id,
            invoiceNumber: row.invoice_number || 'AI-Extracted',
            invoiceDate: row.invoice_date ? String(row.invoice_date).split('T')[0] : '',
            vendorName: row.vendor_name || '',
            vendorCode: row.vendor_gstin || '',
            invoiceType: hasPO ? 'PO' as const : 'Non-PO' as const,
            poNumber: row.po_number || undefined,
            totalAmount: Number(row.total_amount) || 0,
            currency: row.currency || 'INR',
            status: statusMap[row.status] || 'Pending Approval' as const,
            dueDate: row.due_date ? String(row.due_date).split('T')[0] : undefined,
            paymentStatus: 'Unpaid' as const,
            matchStatus: hasPO ? '3-Way Matched' as const : undefined,
            _source: 'ai_ingestion',
            _dbId: row.id,
            _hasPO: hasPO,
          };
        });

        // Replace all AI-ingested invoices with fresh DB data (removes stale duplicates)
        setInvoices((current) => {
          const nonAI = current.filter((i: any) => i._source !== 'ai_ingestion');
          return [...mapped, ...nonAI];
        });
      } catch {
        // API may not be running
      }
    };

    fetchIngested();
  }, [isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    saveDomainDocument('ap_data', {
      vendors,
      purchaseOrders,
      grns,
      advances,
      advanceRequests,
      advanceUtilizations,
      invoices,
      debitNotes,
    });
  }, [advances, advanceRequests, advanceUtilizations, debitNotes, grns, invoices, isHydrating, purchaseOrders, vendors]);

  const getVendorByCode = (code: string) => {
    return vendors.find(v => v.code === code);
  };

  const getPOsByVendor = (vendorCode: string) => {
    return purchaseOrders.filter(po => po.vendorCode === vendorCode && po.status !== 'Closed / Cancelled');
  };

  const getGRNsByPO = (poNumber: string) => {
    return grns.filter(grn => grn.poNumber === poNumber);
  };

  const getAdvancesByVendor = (vendorCode: string) => {
    return advances.filter(adv => adv.vendorCode === vendorCode && adv.openBalance > 0);
  };

  const getPOByNumber = (poNumber: string) => {
    return purchaseOrders.find(po => po.poNumber === poNumber);
  };

  const getDebitNoteById = (id: string) => {
    return debitNotes.find((debitNote) => debitNote.id === id);
  };

  const addGRN = (grn: GRN) => {
    setGRNs((current) => [grn, ...current]);
  };

  const addInvoice = (invoice: Invoice) => {
    setInvoices((current) => [invoice, ...current]);
  };

  const addDebitNote = (debitNote: DebitNote) => {
    setDebitNotes((current) => [debitNote, ...current]);
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices((current) =>
      current.map((invoice) => (
        invoice.id === id
          ? { ...invoice, ...updates }
          : invoice
      ))
    );
  };

  const updateDebitNote = (id: string, updates: Partial<DebitNote>) => {
    setDebitNotes((current) =>
      current.map((debitNote) => (
        debitNote.id === id
          ? { ...debitNote, ...updates }
          : debitNote
      ))
    );
  };

  const updateAdvanceRequest = (id: string, updates: Partial<AdvanceRequest>) => {
    setAdvanceRequests((current) =>
      current.map((request) => (
        request.id === id
          ? { ...request, ...updates }
          : request
      ))
    );
  };

  const updateGRN = (id: string, updates: Partial<GRN>) => {
    setGRNs((current) =>
      current.map((grn) => (
        grn.id === id
          ? { ...grn, ...updates }
          : grn
      ))
    );
  };

  return (
    <APDataContext.Provider
      value={{
        vendors,
        purchaseOrders,
        grns,
        advances,
        advanceRequests,
        advanceUtilizations,
        invoices,
        debitNotes,
        isHydrating,
        getVendorByCode,
        getPOsByVendor,
        getGRNsByPO,
        getAdvancesByVendor,
        getPOByNumber,
        getDebitNoteById,
        addGRN,
        addInvoice,
        addDebitNote,
        updateInvoice,
        updateDebitNote,
        updateAdvanceRequest,
        updateGRN
      }}
    >
      {children}
    </APDataContext.Provider>
  );
}

export function useAPData() {
  const context = useContext(APDataContext);
  if (context === undefined) {
    throw new Error('useAPData must be used within an APDataProvider');
  }
  return context;
}
