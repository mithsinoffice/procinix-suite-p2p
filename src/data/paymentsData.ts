export interface PaymentInvoice {
  id: string;
  invoiceNo: string;
  vendor: string;
  vendorCategory: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'pending' | 'approved' | 'scheduled' | 'paid' | 'overdue';
  priority: 'critical' | 'high' | 'medium' | 'low';
  paymentMode: 'RTGS' | 'NEFT' | 'Wire' | 'Check' | 'ACH' | 'Card';
  riskFlag?: 'duplicate' | 'suspicious' | 'sla-breach' | 'credit-term-breach' | 'statutory';
  earlyPaymentDiscount?: number;
  discountDate?: string;
  invoiceDate: string;
  category: 'Statutory' | 'Payroll' | 'Strategic Vendor' | 'Operational' | 'CapEx' | 'Services';
  approvedBy?: string;
  approvedDate?: string;
}

export const mockPayments: PaymentInvoice[] = [
  // Critical & Overdue
  {
    id: 'INV-2024-001',
    invoiceNo: 'GST-Q4-2024',
    vendor: 'Income Tax Department',
    vendorCategory: 'Government',
    amount: 2850000,
    currency: 'INR',
    dueDate: '2024-12-10',
    invoiceDate: '2024-11-10',
    status: 'overdue',
    priority: 'critical',
    paymentMode: 'RTGS',
    riskFlag: 'statutory',
    category: 'Statutory',
  },
  {
    id: 'INV-2024-002',
    invoiceNo: 'PRL-DEC-001',
    vendor: 'Employee Payroll',
    vendorCategory: 'Payroll',
    amount: 18500000,
    currency: 'INR',
    dueDate: '2024-12-13',
    invoiceDate: '2024-12-01',
    status: 'pending',
    priority: 'critical',
    paymentMode: 'NEFT',
    category: 'Payroll',
  },
  {
    id: 'INV-2024-003',
    invoiceNo: 'AWS-NOV-2024',
    vendor: 'Amazon Web Services',
    vendorCategory: 'Technology',
    amount: 1250000,
    currency: 'USD',
    dueDate: '2024-12-11',
    invoiceDate: '2024-11-15',
    status: 'overdue',
    priority: 'high',
    paymentMode: 'Wire',
    riskFlag: 'sla-breach',
    category: 'Strategic Vendor',
  },
  {
    id: 'INV-2024-004',
    invoiceNo: 'MSFT-LIC-2024',
    vendor: 'Microsoft Corporation',
    vendorCategory: 'Technology',
    amount: 875000,
    currency: 'USD',
    dueDate: '2024-12-13',
    invoiceDate: '2024-11-20',
    status: 'approved',
    priority: 'critical',
    paymentMode: 'Wire',
    category: 'Strategic Vendor',
    approvedBy: 'CFO',
    approvedDate: '2024-12-08',
  },

  // Due This Week
  {
    id: 'INV-2024-005',
    invoiceNo: 'ACC-SOFT-001',
    vendor: 'Accenture Solutions',
    vendorCategory: 'Consulting',
    amount: 3200000,
    currency: 'INR',
    dueDate: '2024-12-14',
    invoiceDate: '2024-11-14',
    status: 'approved',
    priority: 'high',
    paymentMode: 'RTGS',
    earlyPaymentDiscount: 64000,
    discountDate: '2024-12-12',
    category: 'Services',
    approvedBy: 'CFO',
    approvedDate: '2024-12-09',
  },
  {
    id: 'INV-2024-006',
    invoiceNo: 'REL-JIO-NOV',
    vendor: 'Reliance Jio',
    vendorCategory: 'Telecom',
    amount: 185000,
    currency: 'INR',
    dueDate: '2024-12-15',
    invoiceDate: '2024-11-25',
    status: 'approved',
    priority: 'medium',
    paymentMode: 'NEFT',
    category: 'Operational',
  },
  {
    id: 'INV-2024-007',
    invoiceNo: 'DHL-SHIP-1145',
    vendor: 'DHL Express',
    vendorCategory: 'Logistics',
    amount: 425000,
    currency: 'INR',
    dueDate: '2024-12-16',
    invoiceDate: '2024-11-26',
    status: 'pending',
    priority: 'medium',
    paymentMode: 'NEFT',
    category: 'Operational',
  },
  {
    id: 'INV-2024-008',
    invoiceNo: 'IBM-SERV-2024',
    vendor: 'IBM India',
    vendorCategory: 'Technology',
    amount: 2100000,
    currency: 'INR',
    dueDate: '2024-12-17',
    invoiceDate: '2024-11-17',
    status: 'approved',
    priority: 'high',
    paymentMode: 'RTGS',
    earlyPaymentDiscount: 42000,
    discountDate: '2024-12-13',
    category: 'Strategic Vendor',
    approvedBy: 'VP Finance',
    approvedDate: '2024-12-10',
  },

  // Near Future
  {
    id: 'INV-2024-009',
    invoiceNo: 'TCS-IT-NOV',
    vendor: 'Tata Consultancy Services',
    vendorCategory: 'Consulting',
    amount: 4500000,
    currency: 'INR',
    dueDate: '2024-12-20',
    invoiceDate: '2024-11-20',
    status: 'approved',
    priority: 'high',
    paymentMode: 'RTGS',
    category: 'Services',
    approvedBy: 'CFO',
    approvedDate: '2024-12-11',
  },
  {
    id: 'INV-2024-010',
    invoiceNo: 'INFRA-RENT-DEC',
    vendor: 'DLF Commercial',
    vendorCategory: 'Real Estate',
    amount: 1850000,
    currency: 'INR',
    dueDate: '2024-12-22',
    invoiceDate: '2024-12-01',
    status: 'approved',
    priority: 'medium',
    paymentMode: 'RTGS',
    category: 'Operational',
  },
  {
    id: 'INV-2024-011',
    invoiceNo: 'ORC-ERP-2024',
    vendor: 'Oracle Corporation',
    vendorCategory: 'Technology',
    amount: 1680000,
    currency: 'USD',
    dueDate: '2024-12-25',
    invoiceDate: '2024-11-25',
    status: 'pending',
    priority: 'high',
    paymentMode: 'Wire',
    category: 'Strategic Vendor',
  },
  {
    id: 'INV-2024-012',
    invoiceNo: 'SAP-LIC-Q4',
    vendor: 'SAP India',
    vendorCategory: 'Technology',
    amount: 3200000,
    currency: 'INR',
    dueDate: '2024-12-28',
    invoiceDate: '2024-11-28',
    status: 'pending',
    priority: 'high',
    paymentMode: 'RTGS',
    category: 'Strategic Vendor',
  },

  // 30-60 Days
  {
    id: 'INV-2024-013',
    invoiceNo: 'WIP-SOFT-001',
    vendor: 'Wipro Technologies',
    vendorCategory: 'Technology',
    amount: 2850000,
    currency: 'INR',
    dueDate: '2025-01-05',
    invoiceDate: '2024-12-05',
    status: 'pending',
    priority: 'medium',
    paymentMode: 'RTGS',
    category: 'Services',
  },
  {
    id: 'INV-2024-014',
    invoiceNo: 'GOO-ADS-DEC',
    vendor: 'Google India',
    vendorCategory: 'Marketing',
    amount: 950000,
    currency: 'USD',
    dueDate: '2025-01-10',
    invoiceDate: '2024-12-10',
    status: 'pending',
    priority: 'medium',
    paymentMode: 'Wire',
    category: 'Operational',
  },
  {
    id: 'INV-2024-015',
    invoiceNo: 'META-ADS-2024',
    vendor: 'Meta Platforms',
    vendorCategory: 'Marketing',
    amount: 625000,
    currency: 'USD',
    dueDate: '2025-01-15',
    invoiceDate: '2024-12-15',
    status: 'pending',
    priority: 'low',
    paymentMode: 'Wire',
    category: 'Operational',
  },

  // Duplicate Risk
  {
    id: 'INV-2024-016',
    invoiceNo: 'ACC-SOFT-001-DUP',
    vendor: 'Accenture Solutions',
    vendorCategory: 'Consulting',
    amount: 3200000,
    currency: 'INR',
    dueDate: '2024-12-14',
    invoiceDate: '2024-11-14',
    status: 'pending',
    priority: 'high',
    paymentMode: 'RTGS',
    riskFlag: 'duplicate',
    category: 'Services',
  },

  // Suspicious
  {
    id: 'INV-2024-017',
    invoiceNo: 'NEW-VEND-001',
    vendor: 'Quick Solutions Ltd',
    vendorCategory: 'Services',
    amount: 1250000,
    currency: 'INR',
    dueDate: '2024-12-18',
    invoiceDate: '2024-12-10',
    status: 'pending',
    priority: 'medium',
    paymentMode: 'RTGS',
    riskFlag: 'suspicious',
    category: 'Services',
  },

  // More operational
  {
    id: 'INV-2024-018',
    invoiceNo: 'UTIL-ELEC-NOV',
    vendor: 'BSES Electricity',
    vendorCategory: 'Utilities',
    amount: 385000,
    currency: 'INR',
    dueDate: '2024-12-19',
    invoiceDate: '2024-11-30',
    status: 'approved',
    priority: 'medium',
    paymentMode: 'NEFT',
    category: 'Operational',
  },
  {
    id: 'INV-2024-019',
    invoiceNo: 'UTIL-WAT-NOV',
    vendor: 'Delhi Jal Board',
    vendorCategory: 'Utilities',
    amount: 125000,
    currency: 'INR',
    dueDate: '2024-12-20',
    invoiceDate: '2024-11-30',
    status: 'approved',
    priority: 'low',
    paymentMode: 'NEFT',
    category: 'Operational',
  },
  {
    id: 'INV-2024-020',
    invoiceNo: 'CAPEX-SERVER-001',
    vendor: 'Dell Technologies',
    vendorCategory: 'Technology',
    amount: 8500000,
    currency: 'INR',
    dueDate: '2025-01-20',
    invoiceDate: '2024-12-01',
    status: 'pending',
    priority: 'medium',
    paymentMode: 'RTGS',
    category: 'CapEx',
  },
];

/** Aging buckets (amounts in ₹ Lakhs) from payable rows. */
export function getAgingData(rows: PaymentInvoice[] = mockPayments) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = {
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
  };

  rows.forEach((payment) => {
    if (payment.status === 'paid') return;
    if (!payment.dueDate) return;

    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue >= 0) {
      buckets['0-30'] += payment.amount;
    } else if (daysOverdue <= 30) {
      buckets['0-30'] += payment.amount;
    } else if (daysOverdue <= 60) {
      buckets['31-60'] += payment.amount;
    } else if (daysOverdue <= 90) {
      buckets['61-90'] += payment.amount;
    } else {
      buckets['90+'] += payment.amount;
    }
  });

  return [
    { period: '0-30 Days', amount: buckets['0-30'] / 100000 },
    { period: '31-60 Days', amount: buckets['31-60'] / 100000 },
    { period: '61-90 Days', amount: buckets['61-90'] / 100000 },
    { period: '90+ Days', amount: buckets['90+'] / 100000 },
  ];
}

export type TrendPoint = { date: string; paid: number; scheduled: number };

/** Last 14 days: paid (lakhs) from server map; scheduled = payables due that day (lakhs). */
export function buildPaymentTrendData(
  rows: PaymentInvoice[],
  paidByDay: Record<string, number> = {}
): TrendPoint[] {
  const result: TrendPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const paid = paidByDay[key] ?? 0;
    const scheduled =
      rows
        .filter((p) => p.status !== 'paid' && p.dueDate === key)
        .reduce((s, p) => s + p.amount, 0) / 100000;
    result.push({
      date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      paid,
      scheduled,
    });
  }
  return result;
}

// Daily payment trend (last 14 days) — mock fallback when no API paidByDay
export const getPaymentTrend = () => {
  return [
    { date: 'Nov 30', paid: 125, scheduled: 85 },
    { date: 'Dec 1', paid: 180, scheduled: 92 },
    { date: 'Dec 2', paid: 95, scheduled: 110 },
    { date: 'Dec 3', paid: 220, scheduled: 105 },
    { date: 'Dec 4', paid: 165, scheduled: 98 },
    { date: 'Dec 5', paid: 140, scheduled: 125 },
    { date: 'Dec 6', paid: 195, scheduled: 88 },
    { date: 'Dec 7', paid: 210, scheduled: 115 },
    { date: 'Dec 8', paid: 155, scheduled: 102 },
    { date: 'Dec 9', paid: 175, scheduled: 95 },
    { date: 'Dec 10', paid: 235, scheduled: 120 },
    { date: 'Dec 11', paid: 188, scheduled: 108 },
    { date: 'Dec 12', paid: 202, scheduled: 135 },
    { date: 'Dec 13', paid: 0, scheduled: 285 },
  ];
};

// Payables by vendor category
export function getCategoryBreakdown(rows: PaymentInvoice[] = mockPayments) {
  const categories: { [key: string]: number } = {};

  rows.forEach((payment) => {
    if (payment.status !== 'paid') {
      categories[payment.vendorCategory] =
        (categories[payment.vendorCategory] || 0) + payment.amount;
    }
  });

  return Object.entries(categories)
    .map(([name, value]) => ({ name, value: value / 100000 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

export type ProjectionPoint = { date: string; projected: number; actual: number };

/** Next 5 weeks of payable amounts (lakhs) from due dates; actual from paid batches not split here → 0. */
export function getProjectedOutflow(rows: PaymentInvoice[] = mockPayments): ProjectionPoint[] {
  if (rows.length === 0) {
    return [
      { date: 'Week 1', projected: 0, actual: 0 },
      { date: 'Week 2', projected: 0, actual: 0 },
      { date: 'Week 3', projected: 0, actual: 0 },
      { date: 'Week 4', projected: 0, actual: 0 },
      { date: 'Week 5', projected: 0, actual: 0 },
    ];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const buckets = [0, 0, 0, 0, 0];

  rows.forEach((p) => {
    if (p.status === 'paid' || !p.dueDate) return;
    const due = new Date(p.dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = due.getTime() - today.getTime();
    if (diff < 0) return;
    const w = Math.floor(diff / weekMs);
    if (w >= 0 && w < 5) buckets[w] += p.amount;
  });

  return buckets.map((amt, i) => ({
    date: `Week ${i + 1}`,
    projected: amt / 100000,
    actual: 0,
  }));
}
