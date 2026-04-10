/**
 * ENTITY-SCOPED TRANSACTION DATA
 * 
 * Realistic mock transaction data for:
 * - Purchase Orders
 * - Invoices
 * - Debit Notes
 * - GRNs
 * - Advances
 * - Payments
 * 
 * ALL DATA IS ENTITY-KEYED for dynamic dashboard filtering
 * 
 * SAFETY:
 * - Additive to existing prototype
 * - No modifications to existing logic
 * - Entity-aware for dashboard rebinding
 */

import type { POMaster } from './MasterDataContext';

// ============================================================================
// PURCHASE ORDERS - ENTITY-SCOPED
// ============================================================================

export const ENTITY_SCOPED_POS: POMaster[] = [
  // ──────────────────────────────────────────────────────────────────────
  // SUBKO COFFEE INDIA - PURCHASE ORDERS
  // ──────────────────────────────────────────────────────────────────────
  {
    id: 'PO-SUBKO-IN-001',
    poNumber: 'SUBKO/BLR/2024/001',
    poDate: '2024-01-05',
    vendorId: 'VEN-SUBKO-IN-001',
    vendorCode: 'COORG-COFFEE',
    vendorName: 'Coorg Coffee Estates',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Pvt Ltd – India',
    totalAmount: 425000,
    currency: 'INR',
    paymentTerms: 'Net 30',
    deliveryDate: '2024-01-15',
    status: 'Fully Received',
    lineItems: [
      {
        id: 'LI-001',
        itemId: 'ITEM-001',
        itemCode: 'COFFEE-ARABICA-001',
        itemName: 'Arabica Coffee Beans – Raw',
        description: 'Premium Arabica beans from Coorg',
        quantity: 500,
        uom: 'KG',
        unitPrice: 850,
        taxCode: 'GST5',
        gstRate: 5,
        lineAmount: 425000,
        costCentre: 'CC-SUBKO-IN-001', // Production - Bangalore
        budgetCode: 'BUD-2024-PROD'
      }
    ],
    createdBy: 'Kavita Singh',
    createdDate: '2024-01-05',
    approvedBy: 'Suresh Iyer',
    approvedDate: '2024-01-06'
  },
  {
    id: 'PO-SUBKO-IN-002',
    poNumber: 'SUBKO/BLR/2024/002',
    poDate: '2024-01-08',
    vendorId: 'VEN-SUBKO-IN-002',
    vendorCode: 'PREMIUM-PKG',
    vendorName: 'Premium Packaging Solutions',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Pvt Ltd – India',
    totalAmount: 185000,
    currency: 'INR',
    paymentTerms: 'Net 45',
    deliveryDate: '2024-01-20',
    status: 'Approved',
    lineItems: [
      {
        id: 'LI-002',
        itemId: 'ITEM-005',
        itemCode: 'PKG-CUPS-250',
        itemName: 'Coffee Cups – 250ml',
        description: 'Branded coffee cups with logo',
        quantity: 10000,
        uom: 'NOS',
        unitPrice: 15,
        taxCode: 'GST18',
        gstRate: 18,
        lineAmount: 150000,
        costCentre: 'CC-SUBKO-IN-001',
        budgetCode: 'BUD-2024-PROD'
      },
      {
        id: 'LI-003',
        itemId: 'ITEM-006',
        itemCode: 'PKG-LIDS',
        itemName: 'Coffee Lids',
        description: 'Lids for 250ml cups',
        quantity: 10000,
        uom: 'NOS',
        unitPrice: 3.5,
        taxCode: 'GST18',
        gstRate: 18,
        lineAmount: 35000,
        costCentre: 'CC-SUBKO-IN-001',
        budgetCode: 'BUD-2024-PROD'
      }
    ],
    createdBy: 'Kavita Singh',
    createdDate: '2024-01-08',
    approvedBy: 'Suresh Iyer',
    approvedDate: '2024-01-09'
  },
  {
    id: 'PO-SUBKO-IN-003',
    poNumber: 'SUBKO/BLR/2024/003',
    poDate: '2024-01-12',
    vendorId: 'VEN-SUBKO-IN-001',
    vendorCode: 'COORG-COFFEE',
    vendorName: 'Coorg Coffee Estates',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Pvt Ltd – India',
    totalAmount: 255000,
    currency: 'INR',
    paymentTerms: 'Net 30',
    deliveryDate: '2024-01-25',
    status: 'Partially Received',
    lineItems: [
      {
        id: 'LI-004',
        itemId: 'ITEM-002',
        itemCode: 'COFFEE-ROBUSTA-001',
        itemName: 'Robusta Coffee Beans – Raw',
        description: 'Robusta beans for blends',
        quantity: 300,
        uom: 'KG',
        unitPrice: 850,
        taxCode: 'GST5',
        gstRate: 5,
        lineAmount: 255000,
        costCentre: 'CC-SUBKO-IN-001',
        budgetCode: 'BUD-2024-PROD'
      }
    ],
    createdBy: 'Kavita Singh',
    createdDate: '2024-01-12',
    approvedBy: 'Suresh Iyer',
    approvedDate: '2024-01-13'
  },
  {
    id: 'PO-SUBKO-IN-004',
    poNumber: 'SUBKO/BLR/2024/004',
    poDate: '2024-01-15',
    vendorId: 'VEN-SUBKO-IN-003',
    vendorCode: 'URBAN-LOG',
    vendorName: 'Urban Logistics Pvt Ltd',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Pvt Ltd – India',
    totalAmount: 125000,
    currency: 'INR',
    paymentTerms: 'Net 15',
    deliveryDate: '2024-01-30',
    status: 'Approved',
    lineItems: [
      {
        id: 'LI-005',
        itemId: 'ITEM-010',
        itemCode: 'SVC-HOUSEKEEP',
        itemName: 'Housekeeping Services',
        description: 'Monthly housekeeping contract',
        quantity: 100,
        uom: 'HOUR',
        unitPrice: 1250,
        taxCode: 'GST18',
        gstRate: 18,
        lineAmount: 125000,
        costCentre: 'CC-SUBKO-IN-004', // Administration
        budgetCode: 'BUD-2024-ADMIN'
      }
    ],
    createdBy: 'Priya Sharma',
    createdDate: '2024-01-15',
    approvedBy: 'Suresh Iyer',
    approvedDate: '2024-01-16'
  },
  {
    id: 'PO-SUBKO-IN-005',
    poNumber: 'SUBKO/BLR/2024/005',
    poDate: '2024-01-18',
    vendorId: 'VEN-SUBKO-IN-002',
    vendorCode: 'PREMIUM-PKG',
    vendorName: 'Premium Packaging Solutions',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Pvt Ltd – India',
    totalAmount: 345000,
    currency: 'INR',
    paymentTerms: 'Net 45',
    deliveryDate: '2024-02-05',
    status: 'Draft',
    lineItems: [
      {
        id: 'LI-006',
        itemId: 'ITEM-007',
        itemCode: 'PKG-PAPER-BAGS',
        itemName: 'Paper Bags',
        description: 'Eco-friendly paper bags',
        quantity: 5000,
        uom: 'NOS',
        unitPrice: 25,
        taxCode: 'GST12',
        gstRate: 12,
        lineAmount: 125000,
        costCentre: 'CC-SUBKO-IN-001',
        budgetCode: 'BUD-2024-PROD'
      },
      {
        id: 'LI-007',
        itemId: 'ITEM-009',
        itemCode: 'PKG-CARTONS',
        itemName: 'Carton Boxes – Shipping',
        description: 'Shipping cartons',
        quantity: 2000,
        uom: 'NOS',
        unitPrice: 110,
        taxCode: 'GST12',
        gstRate: 12,
        lineAmount: 220000,
        costCentre: 'CC-SUBKO-IN-001',
        budgetCode: 'BUD-2024-PROD'
      }
    ],
    createdBy: 'Kavita Singh',
    createdDate: '2024-01-18'
  },

  // ──────────────────────────────────────────────────────────────────────
  // SUBKO COFFEE DUBAI - PURCHASE ORDERS
  // ──────────────────────────────────────────────────────────────────────
  {
    id: 'PO-SUBKO-UAE-001',
    poNumber: 'SUBKO/DXB/2024/001',
    poDate: '2024-01-10',
    vendorId: 'VEN-SUBKO-UAE-001',
    vendorCode: 'ARABIAN-COFFEE',
    vendorName: 'Arabian Coffee Trading LLC',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee – Dubai',
    totalAmount: 45000,
    currency: 'AED',
    paymentTerms: 'Net 30',
    deliveryDate: '2024-01-20',
    status: 'Fully Received',
    lineItems: [
      {
        id: 'LI-008',
        itemId: 'ITEM-001',
        itemCode: 'COFFEE-ARABICA-001',
        itemName: 'Arabica Coffee Beans – Raw',
        description: 'Premium Arabica for UAE market',
        quantity: 200,
        uom: 'KG',
        unitPrice: 225,
        taxCode: 'VAT5',
        gstRate: 5,
        lineAmount: 45000,
        costCentre: 'CC-SUBKO-UAE-001', // Retail Operations
        budgetCode: 'BUD-2024-RETAIL-UAE'
      }
    ],
    createdBy: 'Khalid Bin Saeed',
    createdDate: '2024-01-10',
    approvedBy: 'Noor Rahman',
    approvedDate: '2024-01-11'
  },
  {
    id: 'PO-SUBKO-UAE-002',
    poNumber: 'SUBKO/DXB/2024/002',
    poDate: '2024-01-14',
    vendorId: 'VEN-SUBKO-UAE-002',
    vendorCode: 'GULF-PKG',
    vendorName: 'Gulf Packaging Industries',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee – Dubai',
    totalAmount: 28000,
    currency: 'AED',
    paymentTerms: 'Net 45',
    deliveryDate: '2024-01-28',
    status: 'Approved',
    lineItems: [
      {
        id: 'LI-009',
        itemId: 'ITEM-005',
        itemCode: 'PKG-CUPS-250',
        itemName: 'Coffee Cups – 250ml',
        description: 'Coffee cups for UAE stores',
        quantity: 5000,
        uom: 'NOS',
        unitPrice: 4.5,
        taxCode: 'VAT5',
        gstRate: 5,
        lineAmount: 22500,
        costCentre: 'CC-SUBKO-UAE-001',
        budgetCode: 'BUD-2024-RETAIL-UAE'
      },
      {
        id: 'LI-010',
        itemId: 'ITEM-006',
        itemCode: 'PKG-LIDS',
        itemName: 'Coffee Lids',
        description: 'Lids for cups',
        quantity: 5000,
        uom: 'NOS',
        unitPrice: 1.1,
        taxCode: 'VAT5',
        gstRate: 5,
        lineAmount: 5500,
        costCentre: 'CC-SUBKO-UAE-001',
        budgetCode: 'BUD-2024-RETAIL-UAE'
      }
    ],
    createdBy: 'Khalid Bin Saeed',
    createdDate: '2024-01-14',
    approvedBy: 'Noor Rahman',
    approvedDate: '2024-01-15'
  },
  {
    id: 'PO-SUBKO-UAE-003',
    poNumber: 'SUBKO/DXB/2024/003',
    poDate: '2024-01-17',
    vendorId: 'VEN-SUBKO-UAE-003',
    vendorCode: 'EMIRATES-LOG',
    vendorName: 'Emirates Logistics Services',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee – Dubai',
    totalAmount: 15000,
    currency: 'AED',
    paymentTerms: 'Net 15',
    deliveryDate: '2024-01-31',
    status: 'Approved',
    lineItems: [
      {
        id: 'LI-011',
        itemId: 'ITEM-010',
        itemCode: 'SVC-HOUSEKEEP',
        itemName: 'Housekeeping Services',
        description: 'Store cleaning services',
        quantity: 50,
        uom: 'HOUR',
        unitPrice: 300,
        taxCode: 'VAT5',
        gstRate: 5,
        lineAmount: 15000,
        costCentre: 'CC-SUBKO-UAE-003', // Administration
        budgetCode: 'BUD-2024-ADMIN-UAE'
      }
    ],
    createdBy: 'Rashid Hussain',
    createdDate: '2024-01-17',
    approvedBy: 'Noor Rahman',
    approvedDate: '2024-01-18'
  },

  // ──────────────────────────────────────────────────────────────────────
  // PROCINIX INDIA - PURCHASE ORDERS
  // ──────────────────────────────────────────────────────────────────────
  {
    id: 'PO-PROC-IN-001',
    poNumber: 'PROC/MUM/2024/001',
    poDate: '2024-01-06',
    vendorId: 'VEN-PROCINIX-IN-001',
    vendorCode: 'TECH-SOL',
    vendorName: 'Tech Solutions India Pvt Ltd',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Ltd – India',
    totalAmount: 850000,
    currency: 'INR',
    paymentTerms: 'Net 30',
    deliveryDate: '2024-01-31',
    status: 'Fully Received',
    lineItems: [
      {
        id: 'LI-012',
        itemId: 'ITEM-011',
        itemCode: 'SVC-IT-CONSULTING',
        itemName: 'IT Consulting Services',
        description: 'Cloud migration consulting',
        quantity: 200,
        uom: 'HOUR',
        unitPrice: 4250,
        taxCode: 'GST18',
        gstRate: 18,
        lineAmount: 850000,
        costCentre: 'CC-PROC-IN-001', // Technology
        budgetCode: 'BUD-2024-TECH',
        projectCode: 'PROJ-CLOUD-2024'
      }
    ],
    createdBy: 'Rajesh Patel',
    createdDate: '2024-01-06',
    approvedBy: 'Suresh Pillai',
    approvedDate: '2024-01-07'
  },
  {
    id: 'PO-PROC-IN-002',
    poNumber: 'PROC/MUM/2024/002',
    poDate: '2024-01-09',
    vendorId: 'VEN-PROCINIX-IN-002',
    vendorCode: 'OFFICE-MART',
    vendorName: 'Office Mart Supplies',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Ltd – India',
    totalAmount: 125000,
    currency: 'INR',
    paymentTerms: 'Net 30',
    deliveryDate: '2024-01-25',
    status: 'Approved',
    lineItems: [
      {
        id: 'LI-013',
        itemId: 'ITEM-012',
        itemCode: 'OFF-SUPPLIES-001',
        itemName: 'Office Supplies',
        description: 'Stationery and supplies',
        quantity: 1,
        uom: 'LOT',
        unitPrice: 125000,
        taxCode: 'GST18',
        gstRate: 18,
        lineAmount: 125000,
        costCentre: 'CC-PROC-IN-010', // Administration
        budgetCode: 'BUD-2024-ADMIN'
      }
    ],
    createdBy: 'Meera Banerjee',
    createdDate: '2024-01-09',
    approvedBy: 'Suresh Pillai',
    approvedDate: '2024-01-10'
  },
  {
    id: 'PO-PROC-IN-003',
    poNumber: 'PROC/MUM/2024/003',
    poDate: '2024-01-13',
    vendorId: 'VEN-PROCINIX-IN-001',
    vendorCode: 'TECH-SOL',
    vendorName: 'Tech Solutions India Pvt Ltd',
    entityId: 'ENT-PROCINIX-IN',
    entityName: 'Procinix Ltd – India',
    totalAmount: 1250000,
    currency: 'INR',
    paymentTerms: 'Net 45',
    deliveryDate: '2024-02-15',
    status: 'Approved',
    lineItems: [
      {
        id: 'LI-014',
        itemId: 'ITEM-013',
        itemCode: 'SVC-CLOUD-INFRA',
        itemName: 'Cloud Infrastructure Services',
        description: 'AWS infrastructure setup',
        quantity: 150,
        uom: 'HOUR',
        unitPrice: 8333.33,
        taxCode: 'GST18',
        gstRate: 18,
        lineAmount: 1250000,
        costCentre: 'CC-PROC-IN-005', // DevOps & Infrastructure
        budgetCode: 'BUD-2024-INFRA',
        projectCode: 'PROJ-CLOUD-2024'
      }
    ],
    createdBy: 'Karthik Venkat',
    createdDate: '2024-01-13',
    approvedBy: 'Suresh Pillai',
    approvedDate: '2024-01-14'
  }
];

// ============================================================================
// DASHBOARD METRICS HELPERS
// ============================================================================

export function getEntityPOs(entityId: string | 'All'): POMaster[] {
  if (entityId === 'All') {
    return ENTITY_SCOPED_POS;
  }
  return ENTITY_SCOPED_POS.filter(po => po.entityId === entityId);
}

export function getEntityPOSummary(entityId: string | 'All') {
  const pos = getEntityPOs(entityId);
  
  const totalPOs = pos.length;
  const totalValue = pos.reduce((sum, po) => sum + po.totalAmount, 0);
  const approved = pos.filter(po => po.status === 'Approved').length;
  const fullyReceived = pos.filter(po => po.status === 'Fully Received').length;
  const partiallyReceived = pos.filter(po => po.status === 'Partially Received').length;
  const draft = pos.filter(po => po.status === 'Draft').length;
  
  // Get currency - if "All", return null (will need multi-currency handling)
  const currency = entityId === 'All' ? null : (pos[0]?.currency || 'INR');
  
  return {
    totalPOs,
    totalValue,
    approved,
    fullyReceived,
    partiallyReceived,
    draft,
    currency,
    avgPOValue: totalPOs > 0 ? totalValue / totalPOs : 0
  };
}

export function getEntityPOTrend(entityId: string | 'All', months: number = 6) {
  const pos = getEntityPOs(entityId);
  
  // Group by month
  const monthlyData: Record<string, { count: number; value: number }> = {};
  
  pos.forEach(po => {
    const month = po.poDate.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { count: 0, value: 0 };
    }
    monthlyData[month].count++;
    monthlyData[month].value += po.totalAmount;
  });
  
  return Object.entries(monthlyData).map(([month, data]) => ({
    month,
    count: data.count,
    value: data.value
  })).sort((a, b) => a.month.localeCompare(b.month));
}

export function getEntityVendorSpend(entityId: string | 'All', topN: number = 5) {
  const pos = getEntityPOs(entityId);
  
  // Group by vendor
  const vendorSpend: Record<string, { name: string; totalSpend: number }> = {};
  
  pos.forEach(po => {
    if (!vendorSpend[po.vendorId]) {
      vendorSpend[po.vendorId] = { name: po.vendorName, totalSpend: 0 };
    }
    vendorSpend[po.vendorId].totalSpend += po.totalAmount;
  });
  
  return Object.values(vendorSpend)
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, topN);
}

export function getEntityCostCenterSpend(entityId: string | 'All', topN: number = 5) {
  const pos = getEntityPOs(entityId);
  
  // Group by cost center
  const ccSpend: Record<string, { name: string; totalSpend: number }> = {};
  
  pos.forEach(po => {
    po.lineItems.forEach(item => {
      const cc = item.costCentre || 'Unallocated';
      if (!ccSpend[cc]) {
        ccSpend[cc] = { name: cc, totalSpend: 0 };
      }
      ccSpend[cc].totalSpend += item.lineAmount;
    });
  });
  
  return Object.values(ccSpend)
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, topN);
}

// ============================================================================
// CURRENCY FORMATTING HELPERS
// ============================================================================

export const CURRENCY_SYMBOLS: Record<string, string> = {
  'INR': '₹',
  'AED': 'د.إ',
  'USD': '$',
  'EUR': '€',
  'GBP': '£'
};

export function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return `${symbol}${formatted}`;
}

export function getEntityCurrency(entityId: string): string {
  if (entityId === 'ENT-SUBKO-IN' || entityId === 'ENT-PROCINIX-IN') {
    return 'INR';
  }
  if (entityId === 'ENT-SUBKO-UAE') {
    return 'AED';
  }
  return 'INR'; // Default
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const TRANSACTION_DATA_SUMMARY = {
  totalPOs: ENTITY_SCOPED_POS.length,
  entitiesWithData: 3,
  entities: {
    'ENT-SUBKO-IN': {
      name: 'Subko Coffee Pvt Ltd – India',
      poCount: ENTITY_SCOPED_POS.filter(po => po.entityId === 'ENT-SUBKO-IN').length,
      currency: 'INR'
    },
    'ENT-SUBKO-UAE': {
      name: 'Subko Coffee – Dubai',
      poCount: ENTITY_SCOPED_POS.filter(po => po.entityId === 'ENT-SUBKO-UAE').length,
      currency: 'AED'
    },
    'ENT-PROCINIX-IN': {
      name: 'Procinix Ltd – India',
      poCount: ENTITY_SCOPED_POS.filter(po => po.entityId === 'ENT-PROCINIX-IN').length,
      currency: 'INR'
    }
  }
};
