/**
 * @deprecated 2026-05-10 — superseded by ProcurementDataContext (relational
 * PR/PO/GRN/SRN backend). Use `useProcurementData().prs` instead.
 *
 * Last 2 consumers (CreatePurchaseOrder.tsx, PRSelectionPage.tsx) were
 * migrated in Sprint 2. This file is kept for one release cycle as a safety
 * net; safe to hard-delete after a release.
 *
 * PURCHASE REQUEST (PR) TRANSACTION DATA — mock-only. Do not add new
 * consumers.
 */

export interface PRLineItem {
  id: string;
  itemDescription: string;
  productId?: string;
  quantity: number;
  unitPrice: number;
  uom: string;
  amount: number;
  specifications?: string;
  department?: string;
  costCentre?: string;
}

export interface PurchaseRequestTransaction {
  id: string;
  prNumber: string;
  entityId: string;
  entityName: string;
  requestDate: string;
  requiredByDate: string;
  departmentId: string;
  departmentName: string;
  vendorId: string;
  vendorName: string;
  requestedBy: string;
  requestedByName: string;
  purpose: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Converted to PO' | 'Cancelled';
  lineItems: PRLineItem[];
  totalAmount: number;
  currency: string;
  costCentreId?: string;
  costCentreName?: string;
  projectId?: string;
  projectName?: string;
  approvedBy?: string;
  approvedDate?: string;
  linkedPOId?: string;
  linkedPONumber?: string;
  notes?: string;
  createdDate: string;
  modifiedDate: string;
}

// Mock PR Data
export const ALL_PURCHASE_REQUESTS: PurchaseRequestTransaction[] = [
  {
    id: 'PR-001',
    prNumber: 'PR-2024-001',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Roasters (India)',
    requestDate: '2024-12-01',
    requiredByDate: '2024-12-15',
    departmentId: 'DEPT-001',
    departmentName: 'IT Department',
    vendorId: 'VEN-001',
    vendorName: 'Tech Solutions India Pvt Ltd',
    requestedBy: 'USR-001',
    requestedByName: 'Rajesh Kumar',
    purpose: 'Laptop replacement for new hires',
    status: 'Approved',
    currency: 'INR',
    costCentreId: 'CC-IT-001',
    costCentreName: 'IT Infrastructure',
    lineItems: [
      {
        id: 'PRL-001-1',
        itemDescription: 'Dell Latitude 5520 Laptop',
        productId: 'PROD-LT-001',
        quantity: 5,
        unitPrice: 65000,
        uom: 'Each',
        amount: 325000,
        specifications: '11th Gen Intel i7, 16GB RAM, 512GB SSD',
        department: 'IT Department',
      },
      {
        id: 'PRL-001-2',
        itemDescription: 'Laptop Bag',
        quantity: 5,
        unitPrice: 2500,
        uom: 'Each',
        amount: 12500,
        department: 'IT Department',
      },
    ],
    totalAmount: 337500,
    approvedBy: 'Amit Sharma',
    approvedDate: '2024-12-05',
    createdDate: '2024-12-01',
    modifiedDate: '2024-12-05',
  },
  {
    id: 'PR-002',
    prNumber: 'PR-2024-002',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Roasters (India)',
    requestDate: '2024-12-03',
    requiredByDate: '2024-12-20',
    departmentId: 'DEPT-002',
    departmentName: 'Operations',
    vendorId: 'VEN-001',
    vendorName: 'Tech Solutions India Pvt Ltd',
    requestedBy: 'USR-002',
    requestedByName: 'Priya Verma',
    purpose: 'Office supplies and equipment',
    status: 'Approved',
    currency: 'INR',
    costCentreId: 'CC-OPS-001',
    costCentreName: 'Operations General',
    lineItems: [
      {
        id: 'PRL-002-1',
        itemDescription: 'HP LaserJet Pro MFP Printer',
        quantity: 2,
        unitPrice: 18500,
        uom: 'Each',
        amount: 37000,
        specifications: 'Print, Scan, Copy, Fax',
        department: 'Operations',
      },
      {
        id: 'PRL-002-2',
        itemDescription: 'A4 Copy Paper (500 sheets/pack)',
        quantity: 20,
        unitPrice: 350,
        uom: 'Pack',
        amount: 7000,
        department: 'Operations',
      },
    ],
    totalAmount: 44000,
    approvedBy: 'Amit Sharma',
    approvedDate: '2024-12-06',
    createdDate: '2024-12-03',
    modifiedDate: '2024-12-06',
  },
  {
    id: 'PR-003',
    prNumber: 'PR-2024-003',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Roasters (India)',
    requestDate: '2024-12-05',
    requiredByDate: '2024-12-25',
    departmentId: 'DEPT-003',
    departmentName: 'Marketing',
    vendorId: 'VEN-004',
    vendorName: 'Creative Print Solutions',
    requestedBy: 'USR-003',
    requestedByName: 'Sneha Patel',
    purpose: 'Marketing collateral printing',
    status: 'Approved',
    currency: 'INR',
    costCentreId: 'CC-MKT-001',
    costCentreName: 'Marketing Campaigns',
    lineItems: [
      {
        id: 'PRL-003-1',
        itemDescription: 'Product Brochures (A4, Full Color)',
        quantity: 5000,
        unitPrice: 12,
        uom: 'Each',
        amount: 60000,
        specifications: '350 GSM, Glossy Finish',
        department: 'Marketing',
      },
      {
        id: 'PRL-003-2',
        itemDescription: 'Business Cards',
        quantity: 1000,
        unitPrice: 5,
        uom: 'Each',
        amount: 5000,
        specifications: '300 GSM, Matt Lamination',
        department: 'Marketing',
      },
    ],
    totalAmount: 65000,
    approvedBy: 'Amit Sharma',
    approvedDate: '2024-12-08',
    createdDate: '2024-12-05',
    modifiedDate: '2024-12-08',
  },
  {
    id: 'PR-004',
    prNumber: 'PR-2024-004',
    entityId: 'ENT-SUBKO-UAE',
    entityName: 'Subko Coffee Roasters (UAE)',
    requestDate: '2024-12-07',
    requiredByDate: '2024-12-22',
    departmentId: 'DEPT-001',
    departmentName: 'IT Department',
    vendorId: 'VEN-UAE-001',
    vendorName: 'Emirates Tech Solutions',
    requestedBy: 'USR-UAE-001',
    requestedByName: 'Ahmed Hassan',
    purpose: 'Server equipment upgrade',
    status: 'Approved',
    currency: 'AED',
    costCentreId: 'CC-IT-UAE-001',
    costCentreName: 'IT Infrastructure UAE',
    lineItems: [
      {
        id: 'PRL-004-1',
        itemDescription: 'Dell PowerEdge R640 Server',
        quantity: 1,
        unitPrice: 25000,
        uom: 'Each',
        amount: 25000,
        specifications: '2x Intel Xeon, 64GB RAM, 4TB Storage',
        department: 'IT Department',
      },
    ],
    totalAmount: 25000,
    approvedBy: 'Mohammed Ali',
    approvedDate: '2024-12-09',
    createdDate: '2024-12-07',
    modifiedDate: '2024-12-09',
  },
  {
    id: 'PR-005',
    prNumber: 'PR-2024-005',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Roasters (India)',
    requestDate: '2024-12-10',
    requiredByDate: '2024-12-28',
    departmentId: 'DEPT-004',
    departmentName: 'Admin',
    vendorId: 'VEN-002',
    vendorName: 'Office Furniture Co',
    requestedBy: 'USR-004',
    requestedByName: 'Vikram Singh',
    purpose: 'Office furniture for new location',
    status: 'Pending Approval',
    currency: 'INR',
    costCentreId: 'CC-ADM-001',
    costCentreName: 'Administration',
    lineItems: [
      {
        id: 'PRL-005-1',
        itemDescription: 'Executive Office Desk',
        quantity: 10,
        unitPrice: 22000,
        uom: 'Each',
        amount: 220000,
        specifications: 'L-shaped, Wood finish',
        department: 'Admin',
      },
      {
        id: 'PRL-005-2',
        itemDescription: 'Ergonomic Office Chair',
        quantity: 10,
        unitPrice: 12000,
        uom: 'Each',
        amount: 120000,
        specifications: 'Mesh back, Adjustable height',
        department: 'Admin',
      },
    ],
    totalAmount: 340000,
    createdDate: '2024-12-10',
    modifiedDate: '2024-12-10',
  },
  {
    id: 'PR-006',
    prNumber: 'PR-2024-006',
    entityId: 'ENT-SUBKO-IN',
    entityName: 'Subko Coffee Roasters (India)',
    requestDate: '2024-12-12',
    requiredByDate: '2024-12-30',
    departmentId: 'DEPT-002',
    departmentName: 'Operations',
    vendorId: 'VEN-001',
    vendorName: 'Tech Solutions India Pvt Ltd',
    requestedBy: 'USR-002',
    requestedByName: 'Priya Verma',
    purpose: 'Additional IT equipment',
    status: 'Approved',
    currency: 'INR',
    costCentreId: 'CC-OPS-001',
    costCentreName: 'Operations General',
    lineItems: [
      {
        id: 'PRL-006-1',
        itemDescription: 'Dell Monitor 24 inch',
        quantity: 8,
        unitPrice: 12500,
        uom: 'Each',
        amount: 100000,
        specifications: 'Full HD, IPS Panel',
        department: 'Operations',
      },
      {
        id: 'PRL-006-2',
        itemDescription: 'Wireless Keyboard & Mouse Combo',
        quantity: 8,
        unitPrice: 1800,
        uom: 'Set',
        amount: 14400,
        department: 'Operations',
      },
    ],
    totalAmount: 114400,
    approvedBy: 'Amit Sharma',
    approvedDate: '2024-12-14',
    createdDate: '2024-12-12',
    modifiedDate: '2024-12-14',
  },
];

// Helper function to get PRs by entity
export function getPRsByEntity(entityId: string): PurchaseRequestTransaction[] {
  if (entityId === 'CONSOLIDATED') {
    return ALL_PURCHASE_REQUESTS;
  }
  return ALL_PURCHASE_REQUESTS.filter((pr) => pr.entityId === entityId);
}

// Helper function to get approved PRs only
export function getApprovedPRs(entityId: string): PurchaseRequestTransaction[] {
  const entityPRs = getPRsByEntity(entityId);
  return entityPRs.filter((pr) => pr.status === 'Approved');
}

// Helper function to get PRs by vendor
export function getPRsByVendor(entityId: string, vendorId: string): PurchaseRequestTransaction[] {
  const entityPRs = getApprovedPRs(entityId);
  return entityPRs.filter((pr) => pr.vendorId === vendorId);
}

// Helper function to get PR by ID
export function getPRById(prId: string): PurchaseRequestTransaction | undefined {
  return ALL_PURCHASE_REQUESTS.find((pr) => pr.id === prId);
}
