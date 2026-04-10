export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  currency: string;
  entity: string;
  branch: string;
  accountType: 'current' | 'savings' | 'overdraft' | 'cash-credit';
  isActive: boolean;
  isPrimary: boolean;
  currentBalance: number;
  availableBalance: number;
  dailyLimit: number;
  transactionLimit: number;
  defaultPaymentMode: string[];
  cutoffTime: string;
  failedTransactions24h: number;
  lastSyncTime: string;
  bankStatus: 'online' | 'offline' | 'maintenance';
}

export interface PaymentModeConfig {
  mode: 'RTGS' | 'NEFT' | 'IMPS' | 'UPI' | 'Wire' | 'Check' | 'ACH';
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  cutoffTime: string;
  processingTime: string;
  charges: number;
  description: string;
  supportedCurrencies: string[];
}

export const bankAccounts: BankAccount[] = [
  {
    id: 'BANK-001',
    bankName: 'HDFC Bank Ltd',
    accountName: 'Operating Account',
    accountNumber: '50200012345678',
    ifscCode: 'HDFC0001234',
    currency: 'INR',
    entity: 'Acme Corporation India Pvt Ltd',
    branch: 'Connaught Place, New Delhi',
    accountType: 'current',
    isActive: true,
    isPrimary: true,
    currentBalance: 45000000,
    availableBalance: 43500000,
    dailyLimit: 50000000,
    transactionLimit: 5000000,
    defaultPaymentMode: ['RTGS', 'NEFT', 'IMPS'],
    cutoffTime: '15:30',
    failedTransactions24h: 0,
    lastSyncTime: '2024-12-13T14:30:00',
    bankStatus: 'online',
  },
  {
    id: 'BANK-002',
    bankName: 'ICICI Bank Ltd',
    accountName: 'Payroll Account',
    accountNumber: '60100098765432',
    ifscCode: 'ICIC0001234',
    currency: 'INR',
    entity: 'Acme Corporation India Pvt Ltd',
    branch: 'Janpath, New Delhi',
    accountType: 'current',
    isActive: true,
    isPrimary: false,
    currentBalance: 22000000,
    availableBalance: 22000000,
    dailyLimit: 30000000,
    transactionLimit: 2000000,
    defaultPaymentMode: ['NEFT', 'IMPS', 'UPI'],
    cutoffTime: '16:00',
    failedTransactions24h: 1,
    lastSyncTime: '2024-12-13T14:25:00',
    bankStatus: 'online',
  },
  {
    id: 'BANK-003',
    bankName: 'State Bank of India',
    accountName: 'Statutory Payments Account',
    accountNumber: '31234567890123',
    ifscCode: 'SBIN0001234',
    currency: 'INR',
    entity: 'Acme Corporation India Pvt Ltd',
    branch: 'Parliament Street, New Delhi',
    accountType: 'current',
    isActive: true,
    isPrimary: false,
    currentBalance: 15000000,
    availableBalance: 15000000,
    dailyLimit: 25000000,
    transactionLimit: 5000000,
    defaultPaymentMode: ['RTGS', 'NEFT'],
    cutoffTime: '15:00',
    failedTransactions24h: 0,
    lastSyncTime: '2024-12-13T14:20:00',
    bankStatus: 'online',
  },
  {
    id: 'BANK-004',
    bankName: 'Citibank N.A.',
    accountName: 'USD Account',
    accountNumber: 'US1234567890',
    ifscCode: 'CITIUS33XXX',
    currency: 'USD',
    entity: 'Acme Corporation India Pvt Ltd',
    branch: 'Barakhamba Road, New Delhi',
    accountType: 'current',
    isActive: true,
    isPrimary: false,
    currentBalance: 8500000,
    availableBalance: 8200000,
    dailyLimit: 10000000,
    transactionLimit: 2000000,
    defaultPaymentMode: ['Wire'],
    cutoffTime: '14:00',
    failedTransactions24h: 2,
    lastSyncTime: '2024-12-13T14:15:00',
    bankStatus: 'online',
  },
  {
    id: 'BANK-005',
    bankName: 'Axis Bank Ltd',
    accountName: 'Vendor Payments Account',
    accountNumber: '91200056789012',
    ifscCode: 'UTIB0001234',
    currency: 'INR',
    entity: 'Acme Corporation India Pvt Ltd',
    branch: 'Nehru Place, New Delhi',
    accountType: 'current',
    isActive: true,
    isPrimary: false,
    currentBalance: 12000000,
    availableBalance: 11500000,
    dailyLimit: 20000000,
    transactionLimit: 3000000,
    defaultPaymentMode: ['RTGS', 'NEFT', 'UPI'],
    cutoffTime: '15:30',
    failedTransactions24h: 0,
    lastSyncTime: '2024-12-13T14:28:00',
    bankStatus: 'online',
  },
  {
    id: 'BANK-006',
    bankName: 'Standard Chartered Bank',
    accountName: 'Foreign Currency Account',
    accountNumber: 'SC9876543210',
    ifscCode: 'SCBL0036001',
    currency: 'EUR',
    entity: 'Acme Europe Operations',
    branch: 'Cannaught Circus, New Delhi',
    accountType: 'current',
    isActive: false,
    isPrimary: false,
    currentBalance: 500000,
    availableBalance: 500000,
    dailyLimit: 1000000,
    transactionLimit: 500000,
    defaultPaymentMode: ['Wire'],
    cutoffTime: '13:00',
    failedTransactions24h: 0,
    lastSyncTime: '2024-12-12T18:00:00',
    bankStatus: 'maintenance',
  },
];

export const paymentModes: PaymentModeConfig[] = [
  {
    mode: 'RTGS',
    enabled: true,
    minAmount: 200000,
    maxAmount: 50000000,
    cutoffTime: '15:30',
    processingTime: 'Same day (within cutoff)',
    charges: 25,
    description: 'Real Time Gross Settlement - for high-value payments',
    supportedCurrencies: ['INR'],
  },
  {
    mode: 'NEFT',
    enabled: true,
    minAmount: 1,
    maxAmount: 10000000,
    cutoffTime: '16:00',
    processingTime: '2-3 hours',
    charges: 5,
    description: 'National Electronic Funds Transfer - for regular payments',
    supportedCurrencies: ['INR'],
  },
  {
    mode: 'IMPS',
    enabled: true,
    minAmount: 1,
    maxAmount: 500000,
    cutoffTime: '24x7',
    processingTime: 'Instant',
    charges: 10,
    description: 'Immediate Payment Service - instant transfers 24x7',
    supportedCurrencies: ['INR'],
  },
  {
    mode: 'UPI',
    enabled: true,
    minAmount: 1,
    maxAmount: 100000,
    cutoffTime: '24x7',
    processingTime: 'Instant',
    charges: 0,
    description: 'Unified Payments Interface - instant low-value transfers',
    supportedCurrencies: ['INR'],
  },
  {
    mode: 'Wire',
    enabled: true,
    minAmount: 10000,
    maxAmount: 100000000,
    cutoffTime: '14:00',
    processingTime: '1-3 business days',
    charges: 500,
    description: 'International wire transfer via SWIFT',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SGD'],
  },
  {
    mode: 'Check',
    enabled: false,
    minAmount: 1000,
    maxAmount: 5000000,
    cutoffTime: '12:00',
    processingTime: '3-5 business days',
    charges: 50,
    description: 'Physical cheque issuance and dispatch',
    supportedCurrencies: ['INR'],
  },
  {
    mode: 'ACH',
    enabled: false,
    minAmount: 1,
    maxAmount: 1000000,
    cutoffTime: '16:00',
    processingTime: 'Next business day',
    charges: 2,
    description: 'Automated Clearing House - batch payments',
    supportedCurrencies: ['INR'],
  },
];

export const bankStatusHistory = [
  {
    bankId: 'BANK-004',
    timestamp: '2024-12-13T10:30:00',
    event: 'Failed Transaction',
    details: 'Wire transfer to Oracle Corporation failed - SWIFT code mismatch',
    severity: 'high',
  },
  {
    bankId: 'BANK-002',
    timestamp: '2024-12-13T09:15:00',
    event: 'Failed Transaction',
    details: 'NEFT to vendor account rejected - Account closed',
    severity: 'medium',
  },
  {
    bankId: 'BANK-006',
    timestamp: '2024-12-12T18:00:00',
    event: 'Maintenance',
    details: 'Bank scheduled maintenance - Expected to resume 14 Dec 08:00',
    severity: 'low',
  },
  {
    bankId: 'BANK-001',
    timestamp: '2024-12-13T08:00:00',
    event: 'Balance Sync',
    details: 'Daily balance reconciliation completed successfully',
    severity: 'info',
  },
];
