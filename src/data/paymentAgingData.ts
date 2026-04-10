export interface VendorAging {
  vendor: string;
  vendorCode: string;
  days0_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
  totalOutstanding: number;
  onHold: boolean;
  slaBreaches: number;
}

export interface InvoiceAgingDetail {
  id: string;
  invoiceNo: string;
  vendor: string;
  dueDate: string;
  aging: number;
  amount: number;
  currency: string;
  status: string;
  riskFlag: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

export interface DepartmentOverdue {
  department: string;
  overdue: number;
  total: number;
  percentage: number;
}

export interface AgingMovement {
  month: string;
  current: number;
  days0_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
}

export const kpiData = {
  averageDPO: 42,
  previousDPO: 38,
  overdueInvoices: 28,
  totalInvoices: 156,
  vendorsOnHold: 4,
  totalVendors: 89,
  slaBreaches: 12,
  totalDue: 234,
  totalOutstanding: 45600000,
  overdueAmount: 8900000,
};

export const agingMovementData: AgingMovement[] = [
  { month: 'Oct', current: 12500000, days0_30: 18200000, days31_60: 8400000, days61_90: 4200000, days90Plus: 2100000 },
  { month: 'Nov', current: 14800000, days0_30: 16900000, days31_60: 9100000, days61_90: 4800000, days90Plus: 2400000 },
  { month: 'Dec', current: 16200000, days0_30: 15400000, days31_60: 7800000, days61_90: 3900000, days90Plus: 2300000 },
];

export const vendorAgingData: VendorAging[] = [
  {
    vendor: 'Accenture Solutions',
    vendorCode: 'V-CONS-001',
    days0_30: 3200000,
    days31_60: 1800000,
    days61_90: 0,
    days90Plus: 0,
    totalOutstanding: 5000000,
    onHold: false,
    slaBreaches: 0,
  },
  {
    vendor: 'Tata Consultancy Services',
    vendorCode: 'V-CONS-002',
    days0_30: 4500000,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    totalOutstanding: 4500000,
    onHold: false,
    slaBreaches: 0,
  },
  {
    vendor: 'IBM India',
    vendorCode: 'V-TECH-002',
    days0_30: 2100000,
    days31_60: 850000,
    days61_90: 420000,
    days90Plus: 0,
    totalOutstanding: 3370000,
    onHold: false,
    slaBreaches: 1,
  },
  {
    vendor: 'Wipro Technologies',
    vendorCode: 'V-TECH-003',
    days0_30: 2850000,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    totalOutstanding: 2850000,
    onHold: false,
    slaBreaches: 0,
  },
  {
    vendor: 'Microsoft Corporation',
    vendorCode: 'V-TECH-001',
    days0_30: 0,
    days31_60: 875000,
    days61_90: 650000,
    days90Plus: 0,
    totalOutstanding: 1525000,
    onHold: false,
    slaBreaches: 1,
  },
  {
    vendor: 'Amazon Web Services',
    vendorCode: 'V-TECH-004',
    days0_30: 1250000,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    totalOutstanding: 1250000,
    onHold: false,
    slaBreaches: 0,
  },
  {
    vendor: 'Oracle Corporation',
    vendorCode: 'V-TECH-005',
    days0_30: 0,
    days31_60: 1680000,
    days61_90: 0,
    days90Plus: 420000,
    totalOutstanding: 2100000,
    onHold: true,
    slaBreaches: 3,
  },
  {
    vendor: 'SAP India',
    vendorCode: 'V-TECH-006',
    days0_30: 0,
    days31_60: 0,
    days61_90: 3200000,
    days90Plus: 0,
    totalOutstanding: 3200000,
    onHold: true,
    slaBreaches: 2,
  },
  {
    vendor: 'Google India',
    vendorCode: 'V-MKT-001',
    days0_30: 950000,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    totalOutstanding: 950000,
    onHold: false,
    slaBreaches: 0,
  },
  {
    vendor: 'Meta Platforms',
    vendorCode: 'V-MKT-002',
    days0_30: 625000,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    totalOutstanding: 625000,
    onHold: false,
    slaBreaches: 0,
  },
  {
    vendor: 'DLF Commercial',
    vendorCode: 'V-RE-001',
    days0_30: 1850000,
    days31_60: 1850000,
    days61_90: 0,
    days90Plus: 0,
    totalOutstanding: 3700000,
    onHold: false,
    slaBreaches: 0,
  },
  {
    vendor: 'BSES Electricity',
    vendorCode: 'V-UTL-001',
    days0_30: 385000,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 125000,
    totalOutstanding: 510000,
    onHold: false,
    slaBreaches: 1,
  },
  {
    vendor: 'FedEx India',
    vendorCode: 'V-LOG-002',
    days0_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 295000,
    totalOutstanding: 295000,
    onHold: true,
    slaBreaches: 2,
  },
  {
    vendor: 'DHL Express',
    vendorCode: 'V-LOG-001',
    days0_30: 425000,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    totalOutstanding: 425000,
    onHold: false,
    slaBreaches: 0,
  },
  {
    vendor: 'Reliance Jio',
    vendorCode: 'V-TEL-001',
    days0_30: 185000,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    totalOutstanding: 185000,
    onHold: false,
    slaBreaches: 0,
  },
  {
    vendor: 'Office Supplies Co',
    vendorCode: 'V-SUP-001',
    days0_30: 0,
    days31_60: 0,
    days61_90: 145000,
    days90Plus: 0,
    totalOutstanding: 145000,
    onHold: true,
    slaBreaches: 1,
  },
];

export const invoiceAgingDetails: InvoiceAgingDetail[] = [
  {
    id: 'INV-001',
    invoiceNo: 'FED-SHIP-1023',
    vendor: 'FedEx India',
    dueDate: '2024-12-10',
    aging: 3,
    amount: 295000,
    currency: 'INR',
    status: 'overdue',
    riskFlag: 'high',
    category: 'Logistics',
  },
  {
    id: 'INV-002',
    invoiceNo: 'STA-SUPP-890',
    vendor: 'Office Supplies Co',
    dueDate: '2024-12-08',
    aging: 5,
    amount: 145000,
    currency: 'INR',
    status: 'overdue',
    riskFlag: 'high',
    category: 'Supplies',
  },
  {
    id: 'INV-003',
    invoiceNo: 'UTIL-WAT-OCT',
    vendor: 'BSES Electricity',
    dueDate: '2024-11-05',
    aging: 38,
    amount: 125000,
    currency: 'INR',
    status: 'overdue',
    riskFlag: 'critical',
    category: 'Utilities',
  },
  {
    id: 'INV-004',
    invoiceNo: 'ORC-OLD-2023',
    vendor: 'Oracle Corporation',
    dueDate: '2024-10-15',
    aging: 59,
    amount: 420000,
    currency: 'USD',
    status: 'on-hold',
    riskFlag: 'critical',
    category: 'Technology',
  },
  {
    id: 'INV-005',
    invoiceNo: 'GST-Q4-2024',
    vendor: 'Income Tax Department',
    dueDate: '2024-12-15',
    aging: -2,
    amount: 2850000,
    currency: 'INR',
    status: 'approved',
    riskFlag: 'critical',
    category: 'Statutory',
  },
  {
    id: 'INV-006',
    invoiceNo: 'PRL-DEC-001',
    vendor: 'Employee Payroll',
    dueDate: '2024-12-15',
    aging: -2,
    amount: 18500000,
    currency: 'INR',
    status: 'approved',
    riskFlag: 'critical',
    category: 'Payroll',
  },
  {
    id: 'INV-007',
    invoiceNo: 'SAP-LIC-Q3',
    vendor: 'SAP India',
    dueDate: '2024-11-27',
    aging: 16,
    amount: 3200000,
    currency: 'INR',
    status: 'on-hold',
    riskFlag: 'high',
    category: 'Technology',
  },
  {
    id: 'INV-008',
    invoiceNo: 'ACC-SOFT-001',
    vendor: 'Accenture Solutions',
    dueDate: '2024-12-18',
    aging: -5,
    amount: 3200000,
    currency: 'INR',
    status: 'approved',
    riskFlag: 'medium',
    category: 'Consulting',
  },
  {
    id: 'INV-009',
    invoiceNo: 'TCS-IT-NOV',
    vendor: 'Tata Consultancy Services',
    dueDate: '2024-12-25',
    aging: -12,
    amount: 4500000,
    currency: 'INR',
    status: 'approved',
    riskFlag: 'low',
    category: 'Consulting',
  },
  {
    id: 'INV-010',
    invoiceNo: 'MSFT-LIC-2024',
    vendor: 'Microsoft Corporation',
    dueDate: '2024-12-05',
    aging: 8,
    amount: 875000,
    currency: 'USD',
    status: 'approved',
    riskFlag: 'medium',
    category: 'Technology',
  },
];

export const departmentOverdueData: DepartmentOverdue[] = [
  { department: 'Technology', overdue: 3200000, total: 15200000, percentage: 21 },
  { department: 'Operations', overdue: 2100000, total: 8900000, percentage: 24 },
  { department: 'Marketing', overdue: 850000, total: 6500000, percentage: 13 },
  { department: 'Finance', overdue: 1200000, total: 5800000, percentage: 21 },
  { department: 'HR', overdue: 420000, total: 3200000, percentage: 13 },
  { department: 'Admin', overdue: 650000, total: 2800000, percentage: 23 },
  { department: 'Sales', overdue: 480000, total: 3200000, percentage: 15 },
];

// Vendor-wise aging for stacked bar chart
export const vendorAgingChartData = vendorAgingData.slice(0, 10).map(v => ({
  vendor: v.vendor.split(' ')[0], // Short name for chart
  '0-30': v.days0_30 / 100000, // Convert to lakhs
  '31-60': v.days31_60 / 100000,
  '61-90': v.days61_90 / 100000,
  '90+': v.days90Plus / 100000,
}));
