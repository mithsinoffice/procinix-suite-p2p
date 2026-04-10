export interface ProposalInvoice {
  id: string;
  invoiceNo: string;
  vendor: string;
  vendorCode: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  aging: number;
  priority: 'critical' | 'high' | 'normal' | 'low';
  paymentMode: 'RTGS' | 'NEFT' | 'Wire' | 'Check' | 'ACH';
  status: 'approved' | 'on-hold' | 'pending-approval';
  earlyPaymentDiscount?: {
    amount: number;
    percentage: number;
    validUntil: string;
  };
  category: string;
  isStatutory: boolean;
}

export const mockProposalInvoices: ProposalInvoice[] = [
  // Critical & Statutory - Due Soon
  {
    id: 'INV-001',
    invoiceNo: 'GST-Q4-2024',
    vendor: 'Income Tax Department',
    vendorCode: 'V-GOV-001',
    invoiceDate: '2024-11-10',
    dueDate: '2024-12-15',
    amount: 2850000,
    currency: 'INR',
    aging: -2,
    priority: 'critical',
    paymentMode: 'RTGS',
    status: 'approved',
    category: 'Statutory',
    isStatutory: true
  },
  {
    id: 'INV-002',
    invoiceNo: 'PRL-DEC-001',
    vendor: 'Employee Payroll',
    vendorCode: 'V-INT-001',
    invoiceDate: '2024-12-01',
    dueDate: '2024-12-15',
    amount: 18500000,
    currency: 'INR',
    aging: -2,
    priority: 'critical',
    paymentMode: 'NEFT',
    status: 'approved',
    category: 'Payroll',
    isStatutory: false
  },
  {
    id: 'INV-003',
    invoiceNo: 'TDS-NOV-2024',
    vendor: 'Tax Authority',
    vendorCode: 'V-GOV-002',
    invoiceDate: '2024-11-30',
    dueDate: '2024-12-16',
    amount: 1250000,
    currency: 'INR',
    aging: -3,
    priority: 'critical',
    paymentMode: 'RTGS',
    status: 'approved',
    category: 'Statutory',
    isStatutory: true
  },

  // High Priority with Discounts
  {
    id: 'INV-004',
    invoiceNo: 'ACC-SOFT-001',
    vendor: 'Accenture Solutions',
    vendorCode: 'V-CONS-001',
    invoiceDate: '2024-11-14',
    dueDate: '2024-12-18',
    amount: 3200000,
    currency: 'INR',
    aging: -5,
    priority: 'high',
    paymentMode: 'RTGS',
    status: 'approved',
    earlyPaymentDiscount: {
      amount: 64000,
      percentage: 2,
      validUntil: '2024-12-14'
    },
    category: 'Consulting',
    isStatutory: false
  },
  {
    id: 'INV-005',
    invoiceNo: 'IBM-SERV-2024',
    vendor: 'IBM India',
    vendorCode: 'V-TECH-002',
    invoiceDate: '2024-11-17',
    dueDate: '2024-12-20',
    amount: 2100000,
    currency: 'INR',
    aging: -7,
    priority: 'high',
    paymentMode: 'RTGS',
    status: 'approved',
    earlyPaymentDiscount: {
      amount: 42000,
      percentage: 2,
      validUntil: '2024-12-15'
    },
    category: 'Technology',
    isStatutory: false
  },
  {
    id: 'INV-006',
    invoiceNo: 'WIP-SOFT-Q4',
    vendor: 'Wipro Technologies',
    vendorCode: 'V-TECH-003',
    invoiceDate: '2024-11-20',
    dueDate: '2024-12-22',
    amount: 2850000,
    currency: 'INR',
    aging: -9,
    priority: 'high',
    paymentMode: 'RTGS',
    status: 'approved',
    earlyPaymentDiscount: {
      amount: 85500,
      percentage: 3,
      validUntil: '2024-12-14'
    },
    category: 'Technology',
    isStatutory: false
  },

  // Normal Priority - Due Soon
  {
    id: 'INV-007',
    invoiceNo: 'MSFT-LIC-2024',
    vendor: 'Microsoft Corporation',
    vendorCode: 'V-TECH-001',
    invoiceDate: '2024-11-20',
    dueDate: '2024-12-17',
    amount: 875000,
    currency: 'USD',
    aging: -4,
    priority: 'normal',
    paymentMode: 'Wire',
    status: 'approved',
    category: 'Technology',
    isStatutory: false
  },
  {
    id: 'INV-008',
    invoiceNo: 'AWS-NOV-2024',
    vendor: 'Amazon Web Services',
    vendorCode: 'V-TECH-004',
    invoiceDate: '2024-11-15',
    dueDate: '2024-12-19',
    amount: 1250000,
    currency: 'USD',
    aging: -6,
    priority: 'normal',
    paymentMode: 'Wire',
    status: 'approved',
    category: 'Technology',
    isStatutory: false
  },
  {
    id: 'INV-009',
    invoiceNo: 'REL-JIO-NOV',
    vendor: 'Reliance Jio',
    vendorCode: 'V-TEL-001',
    invoiceDate: '2024-11-25',
    dueDate: '2024-12-20',
    amount: 185000,
    currency: 'INR',
    aging: -7,
    priority: 'normal',
    paymentMode: 'NEFT',
    status: 'approved',
    category: 'Telecom',
    isStatutory: false
  },
  {
    id: 'INV-010',
    invoiceNo: 'DHL-SHIP-1145',
    vendor: 'DHL Express',
    vendorCode: 'V-LOG-001',
    invoiceDate: '2024-11-26',
    dueDate: '2024-12-21',
    amount: 425000,
    currency: 'INR',
    aging: -8,
    priority: 'normal',
    paymentMode: 'NEFT',
    status: 'approved',
    category: 'Logistics',
    isStatutory: false
  },

  // Further Out - Normal Priority
  {
    id: 'INV-011',
    invoiceNo: 'TCS-IT-NOV',
    vendor: 'Tata Consultancy Services',
    vendorCode: 'V-CONS-002',
    invoiceDate: '2024-11-20',
    dueDate: '2024-12-25',
    amount: 4500000,
    currency: 'INR',
    aging: -12,
    priority: 'normal',
    paymentMode: 'RTGS',
    status: 'approved',
    category: 'Consulting',
    isStatutory: false
  },
  {
    id: 'INV-012',
    invoiceNo: 'INFRA-RENT-DEC',
    vendor: 'DLF Commercial',
    vendorCode: 'V-RE-001',
    invoiceDate: '2024-12-01',
    dueDate: '2024-12-28',
    amount: 1850000,
    currency: 'INR',
    aging: -15,
    priority: 'normal',
    paymentMode: 'RTGS',
    status: 'approved',
    category: 'Real Estate',
    isStatutory: false
  },
  {
    id: 'INV-013',
    invoiceNo: 'UTIL-ELEC-NOV',
    vendor: 'BSES Electricity',
    vendorCode: 'V-UTL-001',
    invoiceDate: '2024-11-30',
    dueDate: '2024-12-24',
    amount: 385000,
    currency: 'INR',
    aging: -11,
    priority: 'normal',
    paymentMode: 'NEFT',
    status: 'approved',
    category: 'Utilities',
    isStatutory: false
  },
  {
    id: 'INV-014',
    invoiceNo: 'UTIL-WAT-NOV',
    vendor: 'Delhi Jal Board',
    vendorCode: 'V-UTL-002',
    invoiceDate: '2024-11-30',
    dueDate: '2024-12-26',
    amount: 125000,
    currency: 'INR',
    aging: -13,
    priority: 'low',
    paymentMode: 'NEFT',
    status: 'approved',
    category: 'Utilities',
    isStatutory: false
  },

  // On Hold
  {
    id: 'INV-015',
    invoiceNo: 'ORC-ERP-2024',
    vendor: 'Oracle Corporation',
    vendorCode: 'V-TECH-005',
    invoiceDate: '2024-11-25',
    dueDate: '2024-12-23',
    amount: 1680000,
    currency: 'USD',
    aging: -10,
    priority: 'high',
    paymentMode: 'Wire',
    status: 'on-hold',
    category: 'Technology',
    isStatutory: false
  },
  {
    id: 'INV-016',
    invoiceNo: 'SAP-LIC-Q4',
    vendor: 'SAP India',
    vendorCode: 'V-TECH-006',
    invoiceDate: '2024-11-28',
    dueDate: '2024-12-27',
    amount: 3200000,
    currency: 'INR',
    aging: -14,
    priority: 'high',
    paymentMode: 'RTGS',
    status: 'on-hold',
    category: 'Technology',
    isStatutory: false
  },

  // More Normal Priority
  {
    id: 'INV-017',
    invoiceNo: 'GOO-ADS-DEC',
    vendor: 'Google India',
    vendorCode: 'V-MKT-001',
    invoiceDate: '2024-12-10',
    dueDate: '2025-01-05',
    amount: 950000,
    currency: 'USD',
    aging: -23,
    priority: 'normal',
    paymentMode: 'Wire',
    status: 'approved',
    category: 'Marketing',
    isStatutory: false
  },
  {
    id: 'INV-018',
    invoiceNo: 'META-ADS-2024',
    vendor: 'Meta Platforms',
    vendorCode: 'V-MKT-002',
    invoiceDate: '2024-12-15',
    dueDate: '2025-01-10',
    amount: 625000,
    currency: 'USD',
    aging: -28,
    priority: 'low',
    paymentMode: 'Wire',
    status: 'approved',
    category: 'Marketing',
    isStatutory: false
  },

  // Overdue
  {
    id: 'INV-019',
    invoiceNo: 'FED-SHIP-1023',
    vendor: 'FedEx India',
    vendorCode: 'V-LOG-002',
    invoiceDate: '2024-11-01',
    dueDate: '2024-12-10',
    amount: 295000,
    currency: 'INR',
    aging: 3,
    priority: 'high',
    paymentMode: 'NEFT',
    status: 'approved',
    category: 'Logistics',
    isStatutory: false
  },
  {
    id: 'INV-020',
    invoiceNo: 'STA-SUPP-890',
    vendor: 'Office Supplies Co',
    vendorCode: 'V-SUP-001',
    invoiceDate: '2024-10-28',
    dueDate: '2024-12-08',
    amount: 145000,
    currency: 'INR',
    aging: 5,
    priority: 'normal',
    paymentMode: 'NEFT',
    status: 'approved',
    category: 'Supplies',
    isStatutory: false
  }
];

// Bank account balances
export const cashBalances = {
  INR: {
    accountName: 'HDFC Bank - Operating Account',
    accountNo: '50200012345678',
    balance: 45000000,
    currency: 'INR'
  },
  USD: {
    accountName: 'Citibank - USD Account',
    accountNo: 'US1234567890',
    balance: 8500000,
    currency: 'USD'
  }
};
