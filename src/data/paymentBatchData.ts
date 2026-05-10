export interface BatchInvoice {
  id: string;
  invoiceNo: string;
  vendor: string;
  vendorAccount: string;
  ifscCode: string;
  amount: number;
  currency: string;
  dueDate: string;
  category: string;
}

export interface ApprovalAction {
  id: string;
  approverName: string;
  approverRole: string;
  action: 'approved' | 'rejected' | 'pending' | 'requested-info';
  timestamp?: string;
  comments?: string;
  level: number;
}

export interface ExecutionDetail {
  id: string;
  invoiceNo: string;
  vendor: string;
  amount: number;
  status: 'success' | 'failed' | 'pending' | 'processing';
  utr?: string; // Unique Transaction Reference
  failureReason?: string;
  executedAt?: string;
}

export interface PaymentBatch {
  id: string;
  batchNo: string;
  totalAmount: number;
  currency: string;
  invoiceCount: number;
  paymentDate: string;
  paymentMode: 'RTGS' | 'NEFT' | 'Wire' | 'Check' | 'UPI' | 'ACH';
  status:
    | 'draft'
    | 'pending-approval'
    | 'approved'
    | 'executed'
    | 'failed'
    | 'partially-executed'
    | 'rejected';
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  executedBy?: string;
  executedAt?: string;
  bankAccount: {
    accountName: string;
    accountNo: string;
    bankName: string;
  };
  invoices: BatchInvoice[];
  approvalChain: ApprovalAction[];
  executionDetails?: ExecutionDetail[];
  bankFileGenerated?: boolean;
  bankFileGeneratedAt?: string;
  sentToBank?: boolean;
  sentToBankAt?: string;
  comments?: string;
}

/** List view row (API list endpoint omits line items and approval chain). */
export type PaymentBatchListRow = Pick<
  PaymentBatch,
  | 'id'
  | 'batchNo'
  | 'totalAmount'
  | 'currency'
  | 'invoiceCount'
  | 'paymentDate'
  | 'paymentMode'
  | 'status'
  | 'createdBy'
  | 'createdAt'
>;

export const mockPaymentBatches: PaymentBatch[] = [
  // Pending Approval
  {
    id: 'BATCH-001',
    batchNo: 'PB-2024-12-001',
    totalAmount: 22600000,
    currency: 'INR',
    invoiceCount: 3,
    paymentDate: '2024-12-15',
    paymentMode: 'RTGS',
    status: 'pending-approval',
    createdBy: 'Rajesh Kumar (AP Executive)',
    createdAt: '2024-12-13T09:30:00',
    bankAccount: {
      accountName: 'HDFC Bank - Operating Account',
      accountNo: '50200012345678',
      bankName: 'HDFC Bank Ltd',
    },
    invoices: [
      {
        id: 'INV-001',
        invoiceNo: 'GST-Q4-2024',
        vendor: 'Income Tax Department',
        vendorAccount: '1234567890',
        ifscCode: 'SBIN0001234',
        amount: 2850000,
        currency: 'INR',
        dueDate: '2024-12-15',
        category: 'Statutory',
      },
      {
        id: 'INV-002',
        invoiceNo: 'PRL-DEC-001',
        vendor: 'Employee Payroll',
        vendorAccount: '9876543210',
        ifscCode: 'HDFC0001234',
        amount: 18500000,
        currency: 'INR',
        dueDate: '2024-12-15',
        category: 'Payroll',
      },
      {
        id: 'INV-003',
        invoiceNo: 'TDS-NOV-2024',
        vendor: 'Tax Authority',
        vendorAccount: '5555666677',
        ifscCode: 'SBIN0005678',
        amount: 1250000,
        currency: 'INR',
        dueDate: '2024-12-16',
        category: 'Statutory',
      },
    ],
    approvalChain: [
      {
        id: 'APP-001',
        approverName: 'Priya Sharma',
        approverRole: 'AP Manager',
        action: 'approved',
        timestamp: '2024-12-13T10:15:00',
        comments: 'Verified all statutory invoices. Documents in order.',
        level: 1,
      },
      {
        id: 'APP-002',
        approverName: 'Amit Patel',
        approverRole: 'CFO',
        action: 'pending',
        level: 2,
      },
    ],
    comments: 'Critical statutory payments for Q4 2024. Urgent approval required.',
  },

  // Approved - Ready for Execution
  {
    id: 'BATCH-002',
    batchNo: 'PB-2024-12-002',
    totalAmount: 8250000,
    currency: 'INR',
    invoiceCount: 4,
    paymentDate: '2024-12-14',
    paymentMode: 'NEFT',
    status: 'approved',
    createdBy: 'Sanjay Verma (AP Executive)',
    createdAt: '2024-12-12T14:20:00',
    approvedBy: 'Amit Patel (CFO)',
    approvedAt: '2024-12-13T11:30:00',
    bankAccount: {
      accountName: 'HDFC Bank - Operating Account',
      accountNo: '50200012345678',
      bankName: 'HDFC Bank Ltd',
    },
    invoices: [
      {
        id: 'INV-004',
        invoiceNo: 'ACC-SOFT-001',
        vendor: 'Accenture Solutions',
        vendorAccount: '3344556677',
        ifscCode: 'ICIC0001234',
        amount: 3200000,
        currency: 'INR',
        dueDate: '2024-12-18',
        category: 'Consulting',
      },
      {
        id: 'INV-005',
        invoiceNo: 'IBM-SERV-2024',
        vendor: 'IBM India',
        vendorAccount: '2233445566',
        ifscCode: 'HDFC0005678',
        amount: 2100000,
        currency: 'INR',
        dueDate: '2024-12-20',
        category: 'Technology',
      },
      {
        id: 'INV-006',
        invoiceNo: 'WIP-SOFT-Q4',
        vendor: 'Wipro Technologies',
        vendorAccount: '7788990011',
        ifscCode: 'ICIC0005678',
        amount: 2850000,
        currency: 'INR',
        dueDate: '2024-12-22',
        category: 'Technology',
      },
      {
        id: 'INV-007',
        invoiceNo: 'UTIL-ELEC-NOV',
        vendor: 'BSES Electricity',
        vendorAccount: '4455667788',
        ifscCode: 'SBIN0002345',
        amount: 385000,
        currency: 'INR',
        dueDate: '2024-12-24',
        category: 'Utilities',
      },
    ],
    approvalChain: [
      {
        id: 'APP-003',
        approverName: 'Priya Sharma',
        approverRole: 'AP Manager',
        action: 'approved',
        timestamp: '2024-12-12T16:00:00',
        comments: 'All invoices verified. Early payment discounts captured.',
        level: 1,
      },
      {
        id: 'APP-004',
        approverName: 'Amit Patel',
        approverRole: 'CFO',
        action: 'approved',
        timestamp: '2024-12-13T11:30:00',
        comments: 'Approved for payment on 14th Dec. Good cash position.',
        level: 2,
      },
    ],
    bankFileGenerated: true,
    bankFileGeneratedAt: '2024-12-13T11:45:00',
    comments: 'Payment batch with early payment discounts - ₹1.91L savings.',
  },

  // Executed Successfully
  {
    id: 'BATCH-003',
    batchNo: 'PB-2024-12-003',
    totalAmount: 1795000,
    currency: 'INR',
    invoiceCount: 3,
    paymentDate: '2024-12-12',
    paymentMode: 'NEFT',
    status: 'executed',
    createdBy: 'Rajesh Kumar (AP Executive)',
    createdAt: '2024-12-11T10:00:00',
    approvedBy: 'Priya Sharma (AP Manager)',
    approvedAt: '2024-12-11T14:30:00',
    executedBy: 'Vikram Singh (Treasury)',
    executedAt: '2024-12-12T10:15:00',
    bankAccount: {
      accountName: 'HDFC Bank - Operating Account',
      accountNo: '50200012345678',
      bankName: 'HDFC Bank Ltd',
    },
    invoices: [
      {
        id: 'INV-008',
        invoiceNo: 'REL-JIO-NOV',
        vendor: 'Reliance Jio',
        vendorAccount: '1122334455',
        ifscCode: 'HDFC0003456',
        amount: 185000,
        currency: 'INR',
        dueDate: '2024-12-20',
        category: 'Telecom',
      },
      {
        id: 'INV-009',
        invoiceNo: 'DHL-SHIP-1145',
        vendor: 'DHL Express',
        vendorAccount: '9988776655',
        ifscCode: 'ICIC0002345',
        amount: 425000,
        currency: 'INR',
        dueDate: '2024-12-21',
        category: 'Logistics',
      },
      {
        id: 'INV-010',
        invoiceNo: 'INFRA-RENT-DEC',
        vendor: 'DLF Commercial',
        vendorAccount: '6677889900',
        ifscCode: 'HDFC0004567',
        amount: 1850000,
        currency: 'INR',
        dueDate: '2024-12-28',
        category: 'Real Estate',
      },
    ],
    approvalChain: [
      {
        id: 'APP-005',
        approverName: 'Priya Sharma',
        approverRole: 'AP Manager',
        action: 'approved',
        timestamp: '2024-12-11T14:30:00',
        comments: 'Routine operational payments approved.',
        level: 1,
      },
    ],
    executionDetails: [
      {
        id: 'EXE-001',
        invoiceNo: 'REL-JIO-NOV',
        vendor: 'Reliance Jio',
        amount: 185000,
        status: 'success',
        utr: 'HDFC24121200145678',
        executedAt: '2024-12-12T10:15:23',
      },
      {
        id: 'EXE-002',
        invoiceNo: 'DHL-SHIP-1145',
        vendor: 'DHL Express',
        amount: 425000,
        status: 'success',
        utr: 'HDFC24121200145679',
        executedAt: '2024-12-12T10:15:24',
      },
      {
        id: 'EXE-003',
        invoiceNo: 'INFRA-RENT-DEC',
        vendor: 'DLF Commercial',
        amount: 1850000,
        status: 'success',
        utr: 'HDFC24121200145680',
        executedAt: '2024-12-12T10:15:25',
      },
    ],
    bankFileGenerated: true,
    bankFileGeneratedAt: '2024-12-11T14:45:00',
    sentToBank: true,
    sentToBankAt: '2024-12-12T10:00:00',
    comments: 'All payments executed successfully via NEFT.',
  },

  // Partially Executed
  {
    id: 'BATCH-004',
    batchNo: 'PB-2024-12-004',
    totalAmount: 3700000,
    currency: 'USD',
    invoiceCount: 3,
    paymentDate: '2024-12-13',
    paymentMode: 'Wire',
    status: 'partially-executed',
    createdBy: 'Meera Nair (AP Executive)',
    createdAt: '2024-12-10T11:00:00',
    approvedBy: 'Amit Patel (CFO)',
    approvedAt: '2024-12-12T09:00:00',
    executedBy: 'Vikram Singh (Treasury)',
    executedAt: '2024-12-13T11:30:00',
    bankAccount: {
      accountName: 'Citibank - USD Account',
      accountNo: 'US1234567890',
      bankName: 'Citibank N.A.',
    },
    invoices: [
      {
        id: 'INV-011',
        invoiceNo: 'MSFT-LIC-2024',
        vendor: 'Microsoft Corporation',
        vendorAccount: 'US9876543210',
        ifscCode: 'CITIUS33XXX',
        amount: 875000,
        currency: 'USD',
        dueDate: '2024-12-17',
        category: 'Technology',
      },
      {
        id: 'INV-012',
        invoiceNo: 'AWS-NOV-2024',
        vendor: 'Amazon Web Services',
        vendorAccount: 'US1122334455',
        ifscCode: 'CITIUS33XXX',
        amount: 1250000,
        currency: 'USD',
        dueDate: '2024-12-19',
        category: 'Technology',
      },
      {
        id: 'INV-013',
        invoiceNo: 'ORC-ERP-2024',
        vendor: 'Oracle Corporation',
        vendorAccount: 'US5566778899',
        ifscCode: 'CITIUS33XXX',
        amount: 1680000,
        currency: 'USD',
        dueDate: '2024-12-23',
        category: 'Technology',
      },
    ],
    approvalChain: [
      {
        id: 'APP-006',
        approverName: 'Priya Sharma',
        approverRole: 'AP Manager',
        action: 'approved',
        timestamp: '2024-12-10T15:00:00',
        comments: 'USD payments for international vendors verified.',
        level: 1,
      },
      {
        id: 'APP-007',
        approverName: 'Amit Patel',
        approverRole: 'CFO',
        action: 'approved',
        timestamp: '2024-12-12T09:00:00',
        comments: 'Approved. Ensure forex rates are locked.',
        level: 2,
      },
    ],
    executionDetails: [
      {
        id: 'EXE-004',
        invoiceNo: 'MSFT-LIC-2024',
        vendor: 'Microsoft Corporation',
        amount: 875000,
        status: 'success',
        utr: 'CITI24121300234567',
        executedAt: '2024-12-13T11:30:15',
      },
      {
        id: 'EXE-005',
        invoiceNo: 'AWS-NOV-2024',
        vendor: 'Amazon Web Services',
        amount: 1250000,
        status: 'success',
        utr: 'CITI24121300234568',
        executedAt: '2024-12-13T11:30:16',
      },
      {
        id: 'EXE-006',
        invoiceNo: 'ORC-ERP-2024',
        vendor: 'Oracle Corporation',
        amount: 1680000,
        status: 'failed',
        failureReason: 'Beneficiary account validation failed - SWIFT code mismatch',
        executedAt: '2024-12-13T11:30:17',
      },
    ],
    bankFileGenerated: true,
    bankFileGeneratedAt: '2024-12-12T09:30:00',
    sentToBank: true,
    sentToBankAt: '2024-12-13T11:15:00',
    comments: 'International wire transfers. One payment failed - requires correction.',
  },

  // Rejected
  {
    id: 'BATCH-005',
    batchNo: 'PB-2024-12-005',
    totalAmount: 1250000,
    currency: 'INR',
    invoiceCount: 1,
    paymentDate: '2024-12-18',
    paymentMode: 'RTGS',
    status: 'rejected',
    createdBy: 'Sanjay Verma (AP Executive)',
    createdAt: '2024-12-11T16:00:00',
    bankAccount: {
      accountName: 'HDFC Bank - Operating Account',
      accountNo: '50200012345678',
      bankName: 'HDFC Bank Ltd',
    },
    invoices: [
      {
        id: 'INV-014',
        invoiceNo: 'NEW-VEND-001',
        vendor: 'Quick Solutions Ltd',
        vendorAccount: '3344556677',
        ifscCode: 'SBIN0009999',
        amount: 1250000,
        currency: 'INR',
        dueDate: '2024-12-18',
        category: 'Services',
      },
    ],
    approvalChain: [
      {
        id: 'APP-008',
        approverName: 'Priya Sharma',
        approverRole: 'AP Manager',
        action: 'rejected',
        timestamp: '2024-12-12T10:00:00',
        comments:
          'Vendor not in approved vendor list. KYC documents missing. Please complete vendor onboarding first.',
        level: 1,
      },
    ],
    comments: 'New vendor payment - requires vendor master approval first.',
  },
];
