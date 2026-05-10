// Central data service for aggregating and calculating report metrics
// This service pulls data from operational modules and calculates KPIs

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  date: string;
  amount: number;
  status: 'Draft' | 'Issued' | 'Partially Received' | 'Fully Received' | 'Closed / Cancelled';
  department: string;
  createdDate?: string;
  approvedDate?: string;
  issuedDate?: string;
}

interface GRN {
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
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  totalPOs: number;
  totalSpend: number;
  status: string;
  onTimeDelivery?: number;
  qualityScore?: number;
  responseTime?: number;
}

// Mock data storage (in real app, this would come from Supabase)
class ReportDataService {
  private static purchaseOrders: PurchaseOrder[] = [
    {
      id: '1',
      poNumber: 'PO-2024-001',
      vendor: 'Acme Supplies Ltd',
      date: '2024-12-10',
      amount: 125000,
      status: 'Issued',
      department: 'IT',
      createdDate: '2024-12-08',
      approvedDate: '2024-12-09',
      issuedDate: '2024-12-10',
    },
    {
      id: '2',
      poNumber: 'PO-2024-002',
      vendor: 'Global Tech Solutions',
      date: '2024-12-09',
      amount: 89500,
      status: 'Partially Received',
      department: 'Operations',
      createdDate: '2024-12-06',
      approvedDate: '2024-12-08',
      issuedDate: '2024-12-09',
    },
    {
      id: '3',
      poNumber: 'PO-2024-003',
      vendor: 'Office Depot India',
      date: '2024-12-08',
      amount: 45200,
      status: 'Fully Received',
      department: 'Admin',
      createdDate: '2024-12-05',
      approvedDate: '2024-12-07',
      issuedDate: '2024-12-08',
    },
    {
      id: '4',
      poNumber: 'PO-2024-004',
      vendor: 'Engineering Parts Co',
      date: '2024-12-07',
      amount: 210000,
      status: 'Issued',
      department: 'Manufacturing',
      createdDate: '2024-12-04',
      approvedDate: '2024-12-06',
      issuedDate: '2024-12-07',
    },
    {
      id: '5',
      poNumber: 'PO-2024-005',
      vendor: 'Marketing Materials Inc',
      date: '2024-12-06',
      amount: 68000,
      status: 'Draft',
      department: 'Marketing',
      createdDate: '2024-12-05',
    },
    {
      id: '6',
      poNumber: 'PO-2024-006',
      vendor: 'Facility Services Ltd',
      date: '2024-12-05',
      amount: 32500,
      status: 'Closed / Cancelled',
      department: 'Facilities',
      createdDate: '2024-12-03',
      approvedDate: '2024-12-04',
    },
    {
      id: '7',
      poNumber: 'PO-2024-007',
      vendor: 'Tata Steel Ltd.',
      date: '2024-11-28',
      amount: 4500000,
      status: 'Fully Received',
      department: 'Operations',
      createdDate: '2024-11-25',
      approvedDate: '2024-11-27',
      issuedDate: '2024-11-28',
    },
    {
      id: '8',
      poNumber: 'PO-2024-008',
      vendor: 'Reliance Industries',
      date: '2024-11-25',
      amount: 3860000,
      status: 'Issued',
      department: 'Operations',
      createdDate: '2024-11-22',
      approvedDate: '2024-11-24',
      issuedDate: '2024-11-25',
    },
    {
      id: '9',
      poNumber: 'PO-2024-009',
      vendor: 'Infosys Technologies',
      date: '2024-11-20',
      amount: 2840000,
      status: 'Fully Received',
      department: 'IT',
      createdDate: '2024-11-17',
      approvedDate: '2024-11-19',
      issuedDate: '2024-11-20',
    },
    {
      id: '10',
      poNumber: 'PO-2024-010',
      vendor: 'Wipro Ltd.',
      date: '2024-11-15',
      amount: 2470000,
      status: 'Partially Received',
      department: 'IT',
      createdDate: '2024-11-12',
      approvedDate: '2024-11-14',
      issuedDate: '2024-11-15',
    },
    {
      id: '11',
      poNumber: 'PO-2024-011',
      vendor: 'HCL Technologies',
      date: '2024-11-10',
      amount: 2250000,
      status: 'Issued',
      department: 'IT',
      createdDate: '2024-11-07',
      approvedDate: '2024-11-09',
      issuedDate: '2024-11-10',
    },
    {
      id: '12',
      poNumber: 'PO-2024-012',
      vendor: 'Larsen & Toubro',
      date: '2024-11-05',
      amount: 3280000,
      status: 'Fully Received',
      department: 'Manufacturing',
      createdDate: '2024-11-02',
      approvedDate: '2024-11-04',
      issuedDate: '2024-11-05',
    },
  ];

  private static grns: GRN[] = [
    {
      id: '1',
      grnNumber: 'GRN-2024-001',
      poNumber: 'PO-2024-001',
      vendor: 'Acme Supplies Ltd',
      receiptDate: '2024-12-11',
      amount: 125000,
      qtyReceived: 50,
      poQty: 50,
      status: 'Complete',
      allocationStatus: 'Accepted',
    },
    {
      id: '2',
      grnNumber: 'GRN-2024-002',
      poNumber: 'PO-2024-002',
      vendor: 'Global Tech Solutions',
      receiptDate: '2024-12-10',
      amount: 450000,
      qtyReceived: 1000,
      poQty: 1000,
      status: 'Complete',
      allocationStatus: 'Partially Allocated',
    },
    {
      id: '3',
      grnNumber: 'GRN-2024-003',
      poNumber: 'PO-2024-003',
      vendor: 'Office Depot India',
      receiptDate: '2024-12-09',
      amount: 45200,
      qtyReceived: 25,
      poQty: 25,
      status: 'Complete',
      allocationStatus: 'Accepted',
    },
    {
      id: '4',
      grnNumber: 'GRN-2024-004',
      poNumber: 'PO-2024-007',
      vendor: 'Tata Steel Ltd.',
      receiptDate: '2024-12-01',
      amount: 4500000,
      qtyReceived: 1000,
      poQty: 1000,
      status: 'Complete',
      allocationStatus: 'Accepted',
    },
    {
      id: '5',
      grnNumber: 'GRN-2024-005',
      poNumber: 'PO-2024-009',
      vendor: 'Infosys Technologies',
      receiptDate: '2024-11-25',
      amount: 2840000,
      qtyReceived: 100,
      poQty: 100,
      status: 'Complete',
      allocationStatus: 'Accepted',
    },
    {
      id: '6',
      grnNumber: 'GRN-2024-006',
      poNumber: 'PO-2024-010',
      vendor: 'Wipro Ltd.',
      receiptDate: '2024-11-20',
      amount: 1235000,
      qtyReceived: 50,
      poQty: 100,
      status: 'Partial',
      allocationStatus: 'Partially Allocated',
    },
  ];

  private static vendors: Vendor[] = [
    {
      id: '1',
      name: 'Tata Steel Ltd.',
      email: 'procurement@tatasteel.com',
      phone: '+91 9876543211',
      category: 'Raw Materials',
      totalPOs: 45,
      totalSpend: 45200000,
      status: 'Active',
      onTimeDelivery: 92,
      qualityScore: 95,
      responseTime: 2.1,
    },
    {
      id: '2',
      name: 'Reliance Industries',
      email: 'vendor@reliance.com',
      phone: '+91 9876543212',
      category: 'Raw Materials',
      totalPOs: 38,
      totalSpend: 38600000,
      status: 'Active',
      onTimeDelivery: 88,
      qualityScore: 91,
      responseTime: 2.8,
    },
    {
      id: '3',
      name: 'Larsen & Toubro',
      email: 'sales@lt.com',
      phone: '+91 9876543213',
      category: 'Equipment',
      totalPOs: 32,
      totalSpend: 32800000,
      status: 'Active',
      onTimeDelivery: 90,
      qualityScore: 93,
      responseTime: 2.3,
    },
    {
      id: '4',
      name: 'Infosys Technologies',
      email: 'contact@infosys.com',
      phone: '+91 9876543214',
      category: 'IT Services',
      totalPOs: 28,
      totalSpend: 28400000,
      status: 'Active',
      onTimeDelivery: 94,
      qualityScore: 96,
      responseTime: 1.5,
    },
    {
      id: '5',
      name: 'Wipro Ltd.',
      email: 'sales@wipro.com',
      phone: '+91 9876543215',
      category: 'IT Services',
      totalPOs: 24,
      totalSpend: 24700000,
      status: 'Active',
      onTimeDelivery: 91,
      qualityScore: 94,
      responseTime: 1.8,
    },
    {
      id: '6',
      name: 'HCL Technologies',
      email: 'vendor@hcl.com',
      phone: '+91 9876543216',
      category: 'IT Services',
      totalPOs: 22,
      totalSpend: 22500000,
      status: 'Active',
      onTimeDelivery: 89,
      qualityScore: 92,
      responseTime: 2.2,
    },
    {
      id: '7',
      name: 'Acme Supplies Ltd',
      email: 'contact@acmesupplies.com',
      phone: '+91 9876543210',
      category: 'Office Supplies',
      totalPOs: 24,
      totalSpend: 1250000,
      status: 'Active',
      onTimeDelivery: 85,
      qualityScore: 88,
      responseTime: 3.1,
    },
    {
      id: '8',
      name: 'Global Tech Solutions',
      email: 'info@globaltech.com',
      phone: '+91 9876543220',
      category: 'IT Hardware',
      totalPOs: 18,
      totalSpend: 2450000,
      status: 'Active',
      onTimeDelivery: 87,
      qualityScore: 90,
      responseTime: 2.5,
    },
  ];

  // Calculate Total PO Value (YTD)
  static getTotalPOValue(): number {
    return this.purchaseOrders
      .filter((po) => po.status !== 'Closed / Cancelled' && po.status !== 'Draft')
      .reduce((sum, po) => sum + po.amount, 0);
  }

  // Calculate Open PO Value (Not Fully Received)
  static getOpenPOValue(): number {
    return this.purchaseOrders
      .filter((po) => po.status === 'Issued' || po.status === 'Partially Received')
      .reduce((sum, po) => sum + po.amount, 0);
  }

  // Get Pending GRN Count
  static getPendingGRNCount(): number {
    return this.grns.filter((grn) => grn.allocationStatus !== 'Accepted').length;
  }

  // Calculate Average PO Processing Time (in days)
  static getAvgPOProcessingTime(): number {
    const processedPOs = this.purchaseOrders.filter((po) => po.createdDate && po.issuedDate);
    if (processedPOs.length === 0) return 0;

    const totalDays = processedPOs.reduce((sum, po) => {
      const created = new Date(po.createdDate!);
      const issued = new Date(po.issuedDate!);
      const days = Math.ceil((issued.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return parseFloat((totalDays / processedPOs.length).toFixed(1));
  }

  // Get PR to PO Conversion Rate
  static getPRtoPOConversionRate(): number {
    // Mock: Assuming 245 PRs created, 221 converted to POs
    return 90.2;
  }

  // Get all Purchase Orders
  static getAllPurchaseOrders(): PurchaseOrder[] {
    return this.purchaseOrders;
  }

  // Get all GRNs
  static getAllGRNs(): GRN[] {
    return this.grns;
  }

  // Get all Vendors
  static getAllVendors(): Vendor[] {
    return this.vendors;
  }

  // Get Top Vendors by Spend
  static getTopVendorsBySpend(limit: number = 10): Array<{ vendor: string; spend: number }> {
    return this.vendors
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, limit)
      .map((v) => ({ vendor: v.name, spend: v.totalSpend / 10000000 })); // Convert to Crore
  }

  // Get Vendor Performance Data
  static getVendorPerformanceData() {
    return this.vendors.slice(0, 8).map((vendor) => ({
      vendor: vendor.name,
      totalPOs: vendor.totalPOs,
      totalSpend: vendor.totalSpend,
      onTimeDelivery: vendor.onTimeDelivery || 85,
      qualityScore: vendor.qualityScore || 88,
      avgResponseTime: vendor.responseTime || 2.5,
      riskLevel:
        vendor.onTimeDelivery! >= 90 ? 'Low' : vendor.onTimeDelivery! >= 85 ? 'Medium' : 'High',
    }));
  }

  // Get Department-wise Spend
  static getDepartmentSpend(): Array<{
    department: string;
    budget: number;
    actual: number;
    committed: number;
  }> {
    const deptMap = new Map<string, { budget: number; actual: number; committed: number }>();

    // Calculate actual spend by department
    this.purchaseOrders.forEach((po) => {
      if (!deptMap.has(po.department)) {
        deptMap.set(po.department, { budget: 0, actual: 0, committed: 0 });
      }
      const dept = deptMap.get(po.department)!;

      if (po.status === 'Fully Received') {
        dept.actual += po.amount / 10000000; // Convert to Crore
      } else if (po.status === 'Issued' || po.status === 'Partially Received') {
        dept.committed += po.amount / 10000000;
      }
    });

    // Add mock budgets (in real app, would come from budget master)
    const budgets: Record<string, number> = {
      IT: 45,
      Operations: 85,
      Marketing: 32,
      Manufacturing: 55,
      Admin: 18,
      Facilities: 15,
    };

    const result: Array<{ department: string; budget: number; actual: number; committed: number }> =
      [];
    deptMap.forEach((value, dept) => {
      result.push({
        department: dept,
        budget: budgets[dept] || 20,
        actual: parseFloat(value.actual.toFixed(1)),
        committed: parseFloat(value.committed.toFixed(1)),
      });
    });

    return result;
  }

  // Get Monthly Spend Trend
  static getMonthlySpendTrend() {
    // Mock monthly data - in real app would aggregate by month
    return [
      { month: 'Jan', spend: 18.5, budget: 20.0 },
      { month: 'Feb', spend: 19.2, budget: 20.0 },
      { month: 'Mar', spend: 21.8, budget: 22.0 },
      { month: 'Apr', spend: 20.5, budget: 22.0 },
      { month: 'May', spend: 22.3, budget: 22.5 },
      { month: 'Jun', spend: 23.1, budget: 22.5 },
      { month: 'Jul', spend: 21.8, budget: 22.0 },
      { month: 'Aug', spend: 20.2, budget: 22.0 },
      { month: 'Sep', spend: 22.6, budget: 23.0 },
      { month: 'Oct', spend: 24.1, budget: 23.0 },
      { month: 'Nov', spend: 23.8, budget: 23.5 },
      { month: 'Dec', spend: 25.2, budget: 24.0 },
    ];
  }

  // Get Open Commitments (for CFO Desk)
  static getOpenCommitments() {
    return this.purchaseOrders
      .filter((po) => po.status === 'Issued' || po.status === 'Partially Received')
      .slice(0, 8)
      .map((po) => {
        const dueDate = new Date(po.date);
        dueDate.setDate(dueDate.getDate() + 30); // Assume 30 days payment term
        const today = new Date('2024-12-13');
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          poNumber: po.poNumber,
          vendor: po.vendor,
          amount: po.amount / 10000000, // Convert to Crore
          dueDate: dueDate.toISOString().split('T')[0],
          paymentStatus: daysUntilDue < 0 ? 'Overdue' : daysUntilDue <= 5 ? 'Pending' : 'Approved',
          daysUntilDue,
        };
      });
  }

  // Calculate Total Spend YTD
  static getTotalSpendYTD(): number {
    const totalSpend = this.purchaseOrders
      .filter((po) => po.status !== 'Draft' && po.status !== 'Closed / Cancelled')
      .reduce((sum, po) => sum + po.amount, 0);
    return parseFloat((totalSpend / 10000000).toFixed(1)); // Convert to Crore
  }

  // Calculate Compliance Score
  static getComplianceScore(): number {
    // Mock calculation: based on approved POs vs total POs
    const total = this.purchaseOrders.length;
    const compliant = this.purchaseOrders.filter((po) => po.approvedDate).length;
    return Math.round((compliant / total) * 100);
  }

  // Get Strategic vs Non-Strategic Vendor Split
  static getStrategicVendorSplit() {
    const strategicVendors = [
      'Tata Steel Ltd.',
      'Reliance Industries',
      'Larsen & Toubro',
      'Infosys Technologies',
      'Wipro Ltd.',
      'HCL Technologies',
    ];

    let strategicSpend = 0;
    let nonStrategicSpend = 0;

    this.vendors.forEach((vendor) => {
      if (strategicVendors.includes(vendor.name)) {
        strategicSpend += vendor.totalSpend;
      } else {
        nonStrategicSpend += vendor.totalSpend;
      }
    });

    const total = strategicSpend + nonStrategicSpend;

    return [
      {
        name: 'Strategic Vendors',
        value: parseFloat((strategicSpend / 10000000).toFixed(1)),
        percentage: parseFloat(((strategicSpend / total) * 100).toFixed(1)),
        color: 'var(--color-teal)',
      },
      {
        name: 'Non-Strategic Vendors',
        value: parseFloat((nonStrategicSpend / 10000000).toFixed(1)),
        percentage: parseFloat(((nonStrategicSpend / total) * 100).toFixed(1)),
        color: '#94A3B8',
      },
    ];
  }
}

export default ReportDataService;
