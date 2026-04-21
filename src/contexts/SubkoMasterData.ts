/**
 * SUBKO COFFEE - REALISTIC MASTER DATA
 * Populated with business-credible demo data for P2P scenarios
 */

import { 
  VendorMaster, 
  ItemMaster, 
  DepartmentMaster, 
  UOMMaster, 
  DebitNoteReasonMaster,
  CostCentreMaster
} from './MasterDataContext';

// ============================================================================
// SUBKO COFFEE - VENDOR MASTER DATA
// ============================================================================

export const SUBKO_VENDORS: VendorMaster[] = [
  {
    id: 'VEN-SUBKO-001',
    code: 'VEN-2001',
    name: 'ABC Coffee Suppliers',
    legalName: 'ABC Coffee Suppliers Private Limited',
    pan: 'AABCA1234C',
    gstin: '29AABCA1234C1Z1',
    email: 'orders@abccoffee.in',
    phone: '+91 9845612345',
    category: 'Coffee Suppliers',
    vendorType: 'Domestic',
    msmeRegistered: true,
    msmeNumber: 'MSME-KA-29-456789',
    msmeCategory: 'Small',
    status: 'Active',
    paymentTerms: 'Net 30 Days',
    creditDays: 30,
    tdsApplicable: false, // Goods supplier - no TDS
    bankAccounts: [{
      id: 'BA-SUBKO-001',
      accountNumber: '501234567890',
      accountName: 'ABC Coffee Suppliers Pvt Ltd',
      ifscCode: 'HDFC0001856',
      bankName: 'HDFC Bank',
      branchName: 'Indiranagar',
      accountType: 'Current',
      isPrimary: true,
      verified: true,
      verifiedDate: '2024-01-10'
    }],
    addresses: [{
      id: 'ADDR-SUBKO-001',
      type: 'Registered',
      addressLine1: 'Plot 45, Coffee Estate Road',
      addressLine2: 'Chickmagalur District',
      city: 'Chickmagalur',
      state: 'Karnataka',
      stateCode: 'KA',
      pincode: '577101',
      country: 'India',
      gstin: '29AABCA1234C1Z1',
      isPrimary: true
    }],
    createdBy: 'Admin',
    createdDate: '2024-01-05',
    approvalStatus: 'Approved',
    approvedBy: 'Procurement Head',
    approvedDate: '2024-01-08'
  },
  {
    id: 'VEN-SUBKO-002',
    code: 'VEN-2002',
    name: 'FreshBeans India Pvt Ltd',
    legalName: 'FreshBeans India Private Limited',
    pan: 'AABFR5678B',
    gstin: '27AABFR5678B1Z2',
    email: 'sales@freshbeans.co.in',
    phone: '+91 9876512340',
    category: 'Coffee Suppliers',
    vendorType: 'Domestic',
    msmeRegistered: false,
    status: 'Active',
    approvalStatus: 'Pending Approval',
    paymentTerms: 'Net 15 Days',
    creditDays: 15,
    tdsApplicable: false, // Goods supplier - no TDS
    bankAccounts: [{
      id: 'BA-SUBKO-002',
      accountNumber: '601234567890',
      accountName: 'FreshBeans India Pvt Ltd',
      ifscCode: 'ICIC0002567',
      bankName: 'ICICI Bank',
      branchName: 'Andheri East',
      accountType: 'Current',
      isPrimary: true,
      verified: true,
      verifiedDate: '2024-02-15'
    }],
    addresses: [{
      id: 'ADDR-SUBKO-002',
      type: 'Registered',
      addressLine1: 'Building 12, Saki Vihar Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      stateCode: 'MH',
      pincode: '400072',
      country: 'India',
      gstin: '27AABFR5678B1Z2',
      isPrimary: true
    },
    {
      id: 'ADDR-SUBKO-002-BILLING',
      type: 'Billing',
      addressLine1: 'Building 12, Saki Vihar Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      stateCode: 'MH',
      pincode: '400072',
      country: 'India',
      gstin: '27AABFR5678B1Z2',
      isPrimary: true
    }],
    createdBy: 'Admin',
    createdDate: '2024-02-10'
  },
  {
    id: 'VEN-SUBKO-003',
    code: 'VEN-2003',
    name: 'Packaging Solutions Co',
    legalName: 'Packaging Solutions Company Private Limited',
    pan: 'AABPS9012P',
    gstin: '29AABPS9012P1Z3',
    email: 'contact@packagingsolutions.in',
    phone: '+91 9845698745',
    category: 'Packaging Materials',
    vendorType: 'Domestic',
    msmeRegistered: true,
    msmeNumber: 'MSME-KA-29-234567',
    msmeCategory: 'Micro',
    status: 'Active',
    approvalStatus: 'Draft',
    paymentTerms: 'Net 45 Days',
    creditDays: 45,
    tdsApplicable: false, // Goods supplier - no TDS
    bankAccounts: [{
      id: 'BA-SUBKO-003',
      accountNumber: '701234567890',
      accountName: 'Packaging Solutions Co Pvt Ltd',
      ifscCode: 'SBIN0012345',
      bankName: 'State Bank of India',
      branchName: 'Peenya Industrial Area',
      accountType: 'Current',
      isPrimary: true,
      verified: true,
      verifiedDate: '2024-03-01'
    }],
    addresses: [{
      id: 'ADDR-SUBKO-003',
      type: 'Registered',
      addressLine1: 'Unit 23, Peenya Industrial Area, Phase 2',
      city: 'Bangalore',
      state: 'Karnataka',
      stateCode: 'KA',
      pincode: '560058',
      country: 'India',
      gstin: '29AABPS9012P1Z3',
      isPrimary: true
    }],
    createdBy: 'Admin',
    createdDate: '2024-02-25'
  },
  {
    id: 'VEN-SUBKO-004',
    code: 'VEN-2004',
    name: 'Dairy Fresh Suppliers',
    legalName: 'Dairy Fresh Suppliers Private Limited',
    pan: 'AABDF3456D',
    gstin: '29AABDF3456D1Z4',
    email: 'orders@dairyfresh.in',
    phone: '+91 9876523456',
    category: 'Dairy Products',
    vendorType: 'Domestic',
    msmeRegistered: true,
    msmeNumber: 'MSME-KA-29-345678',
    msmeCategory: 'Small',
    status: 'Active',
    approvalStatus: 'Rejected',
    paymentTerms: 'Net 7 Days',
    creditDays: 7,
    tdsApplicable: false, // Goods supplier - no TDS
    bankAccounts: [{
      id: 'BA-SUBKO-004',
      accountNumber: '801234567890',
      accountName: 'Dairy Fresh Suppliers Pvt Ltd',
      ifscCode: 'HDFC0003456',
      bankName: 'HDFC Bank',
      branchName: 'Whitefield',
      accountType: 'Current',
      isPrimary: true,
      verified: true,
      verifiedDate: '2024-01-20'
    }],
    addresses: [{
      id: 'ADDR-SUBKO-004',
      type: 'Registered',
      addressLine1: 'No. 67, Dairy Farm Road',
      city: 'Bangalore',
      state: 'Karnataka',
      stateCode: 'KA',
      pincode: '560066',
      country: 'India',
      gstin: '29AABDF3456D1Z4',
      isPrimary: true
    }],
    createdBy: 'Admin',
    createdDate: '2024-01-15'
  },
  {
    id: 'VEN-SUBKO-005',
    code: 'VEN-2005',
    name: 'Facility Management Services',
    legalName: 'Facility Management Services India Private Limited',
    pan: 'AABFM7890F',
    gstin: '29AABFM7890F1Z5',
    email: 'services@fmsindia.com',
    phone: '+91 9845687452',
    category: 'Services',
    vendorType: 'Domestic',
    msmeRegistered: false,
    status: 'Active',
    paymentTerms: 'Net 30 Days',
    creditDays: 30,
    tdsApplicable: true, // Service supplier - TDS applicable
    tdsSection: '194J', // Professional/Technical Services - 10%
    bankAccounts: [{
      id: 'BA-SUBKO-005',
      accountNumber: '901234567890',
      accountName: 'Facility Management Services India Pvt Ltd',
      ifscCode: 'ICIC0004567',
      bankName: 'ICICI Bank',
      branchName: 'Koramangala',
      accountType: 'Current',
      isPrimary: true,
      verified: true,
      verifiedDate: '2024-03-10'
    }],
    addresses: [{
      id: 'ADDR-SUBKO-005',
      type: 'Registered',
      addressLine1: 'Tower A, Tech Park, 5th Floor',
      city: 'Bangalore',
      state: 'Karnataka',
      stateCode: 'KA',
      pincode: '560095',
      country: 'India',
      gstin: '29AABFM7890F1Z5',
      isPrimary: true
    },
    {
      id: 'ADDR-SUBKO-005-BILLING',
      type: 'Billing',
      addressLine1: 'Tower A, Tech Park, 5th Floor',
      city: 'Bangalore',
      state: 'Karnataka',
      stateCode: 'KA',
      pincode: '560095',
      country: 'India',
      gstin: '29AABFM7890F1Z5',
      isPrimary: true
    }],
    createdBy: 'Admin',
    createdDate: '2024-03-05',
    approvedBy: 'Operations Head',
    approvedDate: '2024-03-08'
  }
];

// ============================================================================
// SUBKO COFFEE - ITEM/SERVICE MASTER DATA
// ============================================================================

export const SUBKO_ITEMS: ItemMaster[] = [
  {
    id: 'ITEM-SUBKO-001',
    code: 'ITM-COFFEE-001',
    name: 'Arabica Coffee Beans – Raw',
    description: 'Premium Arabica coffee beans from Chickmagalur estates',
    category: 'Coffee',
    subCategory: 'Raw Materials',
    uom: 'KG',
    hsnCode: '0901',
    gstRate: 5,
    itemType: 'Goods',
    status: 'Active',
    standardPrice: 850,
    reorderLevel: 500,
    createdBy: 'Admin',
    createdDate: '2024-01-05'
  },
  {
    id: 'ITEM-SUBKO-002',
    code: 'ITM-COFFEE-002',
    name: 'Robusta Coffee Beans – Raw',
    description: 'High-quality Robusta coffee beans',
    category: 'Coffee',
    subCategory: 'Raw Materials',
    uom: 'KG',
    hsnCode: '0901',
    gstRate: 5,
    itemType: 'Goods',
    status: 'Active',
    standardPrice: 650,
    reorderLevel: 300,
    createdBy: 'Admin',
    createdDate: '2024-01-05'
  },
  {
    id: 'ITEM-SUBKO-003',
    code: 'ITM-DAIRY-001',
    name: 'Milk Powder – Dairy',
    description: 'Full cream milk powder for beverages',
    category: 'Dairy Products',
    subCategory: 'Raw Materials',
    uom: 'KG',
    hsnCode: '0402',
    gstRate: 5,
    itemType: 'Goods',
    status: 'Active',
    standardPrice: 425,
    reorderLevel: 200,
    createdBy: 'Admin',
    createdDate: '2024-01-05'
  },
  {
    id: 'ITEM-SUBKO-004',
    code: 'ITM-PKG-001',
    name: 'Paper Cups – Packaging',
    description: 'Disposable paper cups 250ml with lids',
    category: 'Packaging',
    subCategory: 'Consumables',
    uom: 'NOS',
    hsnCode: '4823',
    gstRate: 18,
    itemType: 'Goods',
    status: 'Active',
    standardPrice: 3.5,
    reorderLevel: 5000,
    createdBy: 'Admin',
    createdDate: '2024-01-05'
  },
  {
    id: 'ITEM-SUBKO-005',
    code: 'ITM-PKG-002',
    name: 'Coffee Bags – Packaging',
    description: 'Kraft paper bags with valve for coffee (250g)',
    category: 'Packaging',
    subCategory: 'Consumables',
    uom: 'NOS',
    hsnCode: '4819',
    gstRate: 12,
    itemType: 'Goods',
    status: 'Active',
    standardPrice: 12,
    reorderLevel: 2000,
    createdBy: 'Admin',
    createdDate: '2024-01-05'
  },
  {
    id: 'ITEM-SUBKO-006',
    code: 'ITM-SERV-001',
    name: 'Housekeeping Services',
    description: 'Daily housekeeping and cleaning services',
    category: 'Services',
    subCategory: 'Facility Management',
    uom: 'HOUR',
    hsnCode: '999711',
    gstRate: 18,
    itemType: 'Services',
    status: 'Active',
    standardPrice: 250,
    createdBy: 'Admin',
    createdDate: '2024-01-05'
  },
  {
    id: 'ITEM-SUBKO-007',
    code: 'ITM-SERV-002',
    name: 'Equipment Maintenance',
    description: 'Coffee machine and equipment maintenance',
    category: 'Services',
    subCategory: 'Maintenance',
    uom: 'HOUR',
    hsnCode: '999712',
    gstRate: 18,
    itemType: 'Services',
    status: 'Active',
    standardPrice: 800,
    createdBy: 'Admin',
    createdDate: '2024-01-05'
  },
  {
    id: 'ITEM-SUBKO-008',
    code: 'ITM-DAIRY-002',
    name: 'Fresh Milk',
    description: 'Pasteurized full cream milk',
    category: 'Dairy Products',
    subCategory: 'Perishables',
    uom: 'LITRE',
    hsnCode: '0401',
    gstRate: 0,
    itemType: 'Goods',
    status: 'Active',
    standardPrice: 65,
    reorderLevel: 100,
    createdBy: 'Admin',
    createdDate: '2024-01-05'
  },
  {
    id: 'ITEM-SUBKO-009',
    code: 'ITM-PKG-003',
    name: 'Carton Boxes – Shipping',
    description: 'Corrugated shipping boxes for bulk orders',
    category: 'Packaging',
    subCategory: 'Logistics',
    uom: 'NOS',
    hsnCode: '4819',
    gstRate: 12,
    itemType: 'Goods',
    status: 'Active',
    standardPrice: 45,
    reorderLevel: 500,
    createdBy: 'Admin',
    createdDate: '2024-01-05'
  }
];

// ============================================================================
// SUBKO COFFEE - UOM MASTER DATA
// ============================================================================

export const SUBKO_UOM: UOMMaster[] = [
  { id: 'UOM-001', code: 'KG', name: 'Kilogram', description: 'Unit of weight measurement', isActive: true },
  { id: 'UOM-002', code: 'LITRE', name: 'Litre', description: 'Unit of volume measurement', isActive: true },
  { id: 'UOM-003', code: 'NOS', name: 'Numbers', description: 'Count of items', isActive: true },
  { id: 'UOM-004', code: 'HOUR', name: 'Hour', description: 'Unit of time for services', isActive: true },
  { id: 'UOM-005', code: 'MT', name: 'Metric Ton', description: '1000 kilograms', isActive: true },
  { id: 'UOM-006', code: 'PKT', name: 'Packet', description: 'Standard packet', isActive: true }
];

// ============================================================================
// SUBKO COFFEE - DEPARTMENT MASTER DATA
// ============================================================================

export const SUBKO_DEPARTMENTS: DepartmentMaster[] = [
  { id: 'DEPT-SUBKO-001', code: 'DEPT-PROD', name: 'Production', description: 'Coffee roasting and production operations', headOfDepartment: 'Ramesh Kumar', isActive: true },
  { id: 'DEPT-SUBKO-002', code: 'DEPT-FIN', name: 'Finance', description: 'Finance and accounting operations', headOfDepartment: 'Priya Sharma', isActive: true },
  { id: 'DEPT-SUBKO-003', code: 'DEPT-OPS', name: 'Operations', description: 'Store operations and logistics', headOfDepartment: 'Amit Patel', isActive: true },
  { id: 'DEPT-SUBKO-004', code: 'DEPT-PROC', name: 'Procurement', description: 'Sourcing and vendor management', headOfDepartment: 'Kavita Singh', isActive: true },
  { id: 'DEPT-SUBKO-005', code: 'DEPT-HR', name: 'Human Resources', description: 'HR and administration', headOfDepartment: 'Suresh Iyer', isActive: true }
];

// ============================================================================
// SUBKO COFFEE - COST CENTRE MASTER DATA
// ============================================================================

export const SUBKO_COST_CENTRES: CostCentreMaster[] = [
  { id: 'CC-SUBKO-001', code: 'CC-PROD-001', name: 'Production - Roasting', description: 'Coffee roasting operations', departmentId: 'DEPT-SUBKO-001', departmentName: 'Production', headOfCentre: 'Ramesh Kumar', isActive: true, budgetAllocated: 5000000 },
  { id: 'CC-SUBKO-002', code: 'CC-FIN-001', name: 'Finance & Accounts', description: 'Finance department', departmentId: 'DEPT-SUBKO-002', departmentName: 'Finance', headOfCentre: 'Priya Sharma', isActive: true, budgetAllocated: 1000000 },
  { id: 'CC-SUBKO-003', code: 'CC-OPS-001', name: 'Store Operations', description: 'Cafe and retail operations', departmentId: 'DEPT-SUBKO-003', departmentName: 'Operations', headOfCentre: 'Amit Patel', isActive: true, budgetAllocated: 3000000 },
  { id: 'CC-SUBKO-004', code: 'CC-PROC-001', name: 'Procurement', description: 'Sourcing and procurement', departmentId: 'DEPT-SUBKO-004', departmentName: 'Procurement', headOfCentre: 'Kavita Singh', isActive: true, budgetAllocated: 8000000 }
];

// ============================================================================
// SUBKO COFFEE - DEBIT NOTE REASON MASTER DATA
// ============================================================================

export const SUBKO_DEBIT_NOTE_REASONS: DebitNoteReasonMaster[] = [
  { id: 'DNR-001', code: 'DNR-SHORT', name: 'Short Supply', description: 'Quantity received is less than invoiced', status: 'Active', createdBy: 'Admin', createdDate: '2024-01-10' },
  { id: 'DNR-002', code: 'DNR-PRICE', name: 'Price Difference', description: 'Invoice price higher than agreed/PO price', status: 'Active', createdBy: 'Admin', createdDate: '2024-01-10' },
  { id: 'DNR-003', code: 'DNR-QUALITY', name: 'Quality / Damage', description: 'Defective or damaged goods received', status: 'Active', createdBy: 'Admin', createdDate: '2024-01-10' },
  { id: 'DNR-004', code: 'DNR-CALC', name: 'Calculation Error', description: 'Mathematical error in invoice', status: 'Active', createdBy: 'Admin', createdDate: '2024-01-10' },
  { id: 'DNR-005', code: 'DNR-TAX', name: 'Tax Error', description: 'Incorrect tax rate or amount applied', status: 'Active', createdBy: 'Admin', createdDate: '2024-01-10' }
];