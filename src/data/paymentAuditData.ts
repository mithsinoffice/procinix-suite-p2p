export interface PaymentTrace {
  invoiceNo: string;
  vendor: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'pending' | 'cancelled';
  timeline: {
    stage: string;
    user: string;
    role: string;
    timestamp: string;
    action: string;
    details?: string;
  }[];
  bankReference?: string;
  paymentMode: string;
}

export interface PaymentReport {
  period: string;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  totalAmount: number;
  discountsCaptured: number;
  discountsMissed: number;
}

export interface VendorPaymentHistory {
  vendor: string;
  vendorCode: string;
  totalPaid: number;
  paymentsCount: number;
  averagePaymentTime: number;
  onTimePercentage: number;
  lastPaymentDate: string;
  lastPaymentAmount: number;
}

export const paymentTraces: PaymentTrace[] = [
  {
    invoiceNo: 'REL-JIO-NOV',
    vendor: 'Reliance Jio',
    amount: 185000,
    currency: 'INR',
    status: 'completed',
    paymentMode: 'NEFT',
    bankReference: 'HDFC24121200145678',
    timeline: [
      {
        stage: 'Invoice Created',
        user: 'Rajesh Kumar',
        role: 'AP Executive',
        timestamp: '2024-12-01T10:00:00',
        action: 'Created invoice in system',
        details: 'Invoice uploaded with 3-way matching',
      },
      {
        stage: 'Invoice Verified',
        user: 'Priya Sharma',
        role: 'AP Manager',
        timestamp: '2024-12-01T14:30:00',
        action: 'Verified invoice details',
        details: 'GRN matched, amount verified',
      },
      {
        stage: 'Invoice Approved',
        user: 'Amit Patel',
        role: 'CFO',
        timestamp: '2024-12-02T09:15:00',
        action: 'Approved for payment',
      },
      {
        stage: 'Added to Payment Batch',
        user: 'Rajesh Kumar',
        role: 'AP Executive',
        timestamp: '2024-12-11T10:00:00',
        action: 'Included in batch PB-2024-12-003',
      },
      {
        stage: 'Batch Approved',
        user: 'Priya Sharma',
        role: 'AP Manager',
        timestamp: '2024-12-11T14:30:00',
        action: 'Approved payment batch',
        details: 'Routine operational payments approved',
      },
      {
        stage: 'Payment Executed',
        user: 'Vikram Singh',
        role: 'Treasury',
        timestamp: '2024-12-12T10:15:23',
        action: 'Payment executed via NEFT',
        details: 'UTR: HDFC24121200145678',
      },
      {
        stage: 'Payment Confirmed',
        user: 'System',
        role: 'Automated',
        timestamp: '2024-12-12T12:30:00',
        action: 'Bank confirmation received',
        details: 'Payment successfully credited to vendor account',
      },
    ],
  },
  {
    invoiceNo: 'ORC-ERP-2024',
    vendor: 'Oracle Corporation',
    amount: 1680000,
    currency: 'USD',
    status: 'failed',
    paymentMode: 'Wire',
    timeline: [
      {
        stage: 'Invoice Created',
        user: 'Meera Nair',
        role: 'AP Executive',
        timestamp: '2024-12-05T11:00:00',
        action: 'Created invoice in system',
      },
      {
        stage: 'Invoice Approved',
        user: 'Priya Sharma',
        role: 'AP Manager',
        timestamp: '2024-12-10T15:00:00',
        action: 'Approved for payment',
      },
      {
        stage: 'Added to Payment Batch',
        user: 'Meera Nair',
        role: 'AP Executive',
        timestamp: '2024-12-10T11:00:00',
        action: 'Included in batch PB-2024-12-004',
      },
      {
        stage: 'Batch Approved',
        user: 'Amit Patel',
        role: 'CFO',
        timestamp: '2024-12-12T09:00:00',
        action: 'Approved payment batch',
        details: 'Approved. Ensure forex rates are locked',
      },
      {
        stage: 'Payment Execution Failed',
        user: 'Vikram Singh',
        role: 'Treasury',
        timestamp: '2024-12-13T11:30:17',
        action: 'Wire transfer failed',
        details: 'Beneficiary account validation failed - SWIFT code mismatch',
      },
      {
        stage: 'Vendor Contacted',
        user: 'Meera Nair',
        role: 'AP Executive',
        timestamp: '2024-12-13T14:00:00',
        action: 'Requested correct SWIFT details',
        details: 'Email sent to vendor procurement team',
      },
    ],
  },
  {
    invoiceNo: 'GST-Q4-2024',
    vendor: 'Income Tax Department',
    amount: 2850000,
    currency: 'INR',
    status: 'pending',
    paymentMode: 'RTGS',
    timeline: [
      {
        stage: 'Invoice Created',
        user: 'Rajesh Kumar',
        role: 'AP Executive',
        timestamp: '2024-11-10T09:30:00',
        action: 'Created statutory invoice',
        details: 'Q4 GST payment obligation',
      },
      {
        stage: 'Invoice Verified',
        user: 'Priya Sharma',
        role: 'AP Manager',
        timestamp: '2024-12-13T10:15:00',
        action: 'Verified all statutory invoices',
        details: 'Documents in order',
      },
      {
        stage: 'Added to Payment Batch',
        user: 'Rajesh Kumar',
        role: 'AP Executive',
        timestamp: '2024-12-13T09:30:00',
        action: 'Included in batch PB-2024-12-001',
        details: 'Critical statutory payments for Q4 2024',
      },
      {
        stage: 'Level 1 Approved',
        user: 'Priya Sharma',
        role: 'AP Manager',
        timestamp: '2024-12-13T10:15:00',
        action: 'Level 1 approval granted',
      },
      {
        stage: 'Pending Final Approval',
        user: 'Amit Patel',
        role: 'CFO',
        timestamp: 'Pending',
        action: 'Awaiting CFO approval',
      },
    ],
  },
];

export const paymentReports: PaymentReport[] = [
  {
    period: 'December 2024',
    totalPayments: 45,
    successfulPayments: 42,
    failedPayments: 3,
    totalAmount: 125000000,
    discountsCaptured: 1910000,
    discountsMissed: 420000,
  },
  {
    period: 'November 2024',
    totalPayments: 52,
    successfulPayments: 50,
    failedPayments: 2,
    totalAmount: 142000000,
    discountsCaptured: 2150000,
    discountsMissed: 380000,
  },
  {
    period: 'October 2024',
    totalPayments: 48,
    successfulPayments: 46,
    failedPayments: 2,
    totalAmount: 138000000,
    discountsCaptured: 1980000,
    discountsMissed: 520000,
  },
];

export const vendorPaymentHistory: VendorPaymentHistory[] = [
  {
    vendor: 'Accenture Solutions',
    vendorCode: 'V-CONS-001',
    totalPaid: 38400000,
    paymentsCount: 12,
    averagePaymentTime: 32,
    onTimePercentage: 92,
    lastPaymentDate: '2024-12-10',
    lastPaymentAmount: 3200000,
  },
  {
    vendor: 'Tata Consultancy Services',
    vendorCode: 'V-CONS-002',
    totalPaid: 54000000,
    paymentsCount: 12,
    averagePaymentTime: 28,
    onTimePercentage: 100,
    lastPaymentDate: '2024-11-28',
    lastPaymentAmount: 4500000,
  },
  {
    vendor: 'IBM India',
    vendorCode: 'V-TECH-002',
    totalPaid: 25200000,
    paymentsCount: 12,
    averagePaymentTime: 35,
    onTimePercentage: 83,
    lastPaymentDate: '2024-12-05',
    lastPaymentAmount: 2100000,
  },
  {
    vendor: 'Wipro Technologies',
    vendorCode: 'V-TECH-003',
    totalPaid: 34200000,
    paymentsCount: 12,
    averagePaymentTime: 30,
    onTimePercentage: 92,
    lastPaymentDate: '2024-12-08',
    lastPaymentAmount: 2850000,
  },
  {
    vendor: 'Microsoft Corporation',
    vendorCode: 'V-TECH-001',
    totalPaid: 10500000,
    paymentsCount: 12,
    averagePaymentTime: 38,
    onTimePercentage: 75,
    lastPaymentDate: '2024-11-30',
    lastPaymentAmount: 875000,
  },
  {
    vendor: 'Amazon Web Services',
    vendorCode: 'V-TECH-004',
    totalPaid: 15000000,
    paymentsCount: 12,
    averagePaymentTime: 25,
    onTimePercentage: 100,
    lastPaymentDate: '2024-12-01',
    lastPaymentAmount: 1250000,
  },
  {
    vendor: 'DLF Commercial',
    vendorCode: 'V-RE-001',
    totalPaid: 22200000,
    paymentsCount: 12,
    averagePaymentTime: 5,
    onTimePercentage: 100,
    lastPaymentDate: '2024-12-01',
    lastPaymentAmount: 1850000,
  },
  {
    vendor: 'Reliance Jio',
    vendorCode: 'V-TEL-001',
    totalPaid: 2220000,
    paymentsCount: 12,
    averagePaymentTime: 15,
    onTimePercentage: 100,
    lastPaymentDate: '2024-12-12',
    lastPaymentAmount: 185000,
  },
];
