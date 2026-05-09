import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import {
  MULTI_ENTITY_VENDORS,
  MULTI_ENTITY_BANKS,
  MULTI_ENTITY_COST_CENTRES,
  MULTI_ENTITY_TAX_CODES,
  MULTI_ENTITY_DEPARTMENTS,
} from './MultiEntityMasterData';
import { DEMO_VENDOR_DATASET } from './DemoVendorDataset';
import {
  ensureRelationalMasterRecords,
  saveRelationalMasterRecords,
} from '../lib/mysql/masterTables';
import { ensureDomainDocument, saveDomainDocument } from '../lib/mysql/documentStore';
import { isMysqlApiEnabled, mysqlApiRequest } from '../lib/mysql/client';
import { EntityScopeMapping, isRecordMappedToEntity } from '../lib/masters/entityMapping';

/**
 * MASTER DATA CONTEXT - SYSTEM OF RECORD
 *
 * This is the SINGLE SOURCE OF TRUTH for all master data across AP Automation.
 * All modules must consume data from this context - NO local/duplicate masters allowed.
 *
 * AP AUTOMATION MODULES IN SCOPE:
 * - Procurement
 * - Accounts Payable
 * - Payments
 * - Vendor Advances
 * - Vendor Onboarding
 * - Budgeting
 * - Masters
 *
 * GOVERNANCE RULES:
 * 1. Masters defined here are authoritative and immutable at the transaction level
 * 2. All dropdowns, selectors, and references MUST use these masters
 * 3. No module should create standalone/local master data
 * 4. Future screens must reuse shared selector components that consume this context
 */

// ============================================================================
// MASTER DATA INTERFACES (SYSTEM OF RECORD)
// ============================================================================

export interface VendorMaster {
  id: string;
  code: string;
  clientErpVendorCode?: string;
  name: string;
  legalName: string;
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Changes Requested';
  pan: string;
  gstin: string;
  email: string;
  phone: string;
  category: string;
  vendorType: 'Domestic' | 'Import';
  msmeRegistered: boolean;
  msmeNumber?: string;
  msmeCategory?: 'Micro' | 'Small' | 'Medium';
  status: 'Active' | 'Inactive' | 'Blocked';
  paymentTerms: string;
  creditDays: number;
  bankAccounts: BankAccountDetail[];
  addresses: VendorAddress[];
  createdBy: string;
  createdDate: string;
  approvedBy?: string;
  approvedDate?: string;
  // MULTI-ENTITY EXTENSION - ADDITIVE ONLY
  entityId?: string; // Optional for backward compatibility
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
  country?: string; // Vendor's country
  currency?: string; // Vendor's default currency
  // UAE-specific fields (conditional)
  vatRegistrationNumber?: string;
  emiratesId?: string;
  // India-specific fields (already exist, made optional for UAE)
  tdsApplicable?: boolean;
  tdsSection?: string;
  // ENHANCED TDS FIELDS - DEMO DATASET SUPPORT
  lowerTdsApplicable?: boolean;
  lowerTdsRate?: number;
  lowerTdsReference?: string;
  section206ABApplicable?: boolean;
  effectiveTdsRate?: number; // Calculated based on 206AB or lower TDS
}

export interface BankAccountDetail {
  id: string;
  accountNumber: string;
  accountName: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  accountType: 'Current' | 'Savings';
  isPrimary: boolean;
  verified: boolean;
  verifiedDate?: string;
}

export interface VendorAddress {
  id: string;
  type: 'Billing' | 'Shipping' | 'Registered';
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  country: string;
  gstin?: string;
  isPrimary: boolean;
}

export interface ItemMaster {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  subCategory: string;
  uom: string;
  hsnCode: string;
  gstRate: number;
  itemType: 'Goods' | 'Services';
  status: 'Active' | 'Inactive';
  entityId?: string;
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
  reorderLevel?: number;
  standardPrice?: number;
  createdBy: string;
  createdDate: string;
}

export interface POMaster {
  id: string;
  poNumber: string;
  poDate: string;
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  entityId: string;
  entityName: string;
  totalAmount: number;
  currency: string;
  paymentTerms: string;
  deliveryDate: string;
  status: 'Draft' | 'Approved' | 'Partially Received' | 'Fully Received' | 'Closed' | 'Cancelled';
  lineItems: POLineItem[];
  createdBy: string;
  createdDate: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface POLineItem {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  taxCode: string;
  gstRate: number;
  lineAmount: number;
  budgetCode?: string;
  costCentre?: string;
  projectCode?: string;
}

export interface AccountCodeMaster {
  id: string;
  code: string;
  name: string;
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  accountSubType: string;
  isActive: boolean;
  requiresCostCentre: boolean;
  requiresProject: boolean;
  level: number;
  parentCode?: string;
  entityId?: string;
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
}

export interface TaxCodeMaster {
  id: string;
  taxCode: string;
  taxType: 'GST' | 'TDS' | 'TCS' | 'Customs';
  taxName: string;
  taxRate: number;
  isActive: boolean;
  applicableFrom: string;
  applicableTo?: string;
  // For GST
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  cessRate?: number;
  // For TDS
  tdsSection?: string;
  tdsNature?: string;
  entityId?: string;
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
}

export interface EntityMaster {
  id: string;
  code: string;
  name: string;
  legalName: string;
  pan: string;
  gstin: string;
  entityType: 'Company' | 'Branch' | 'Division';
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  isActive: boolean;
  // MULTI-COUNTRY EXTENSION - ADDITIVE ONLY
  country: string;
  currency: string;
  taxRegime: 'GST' | 'VAT' | 'None';
  vatRegistrationNumber?: string; // For UAE entities
  taxIdentificationNumber?: string; // For other countries
}

export interface CostCentreMaster {
  id: string;
  code: string;
  name: string;
  description: string;
  departmentId: string;
  departmentName: string;
  headOfCentre: string;
  isActive: boolean;
  budgetAllocated?: number;
  entityId?: string;
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
}

export interface ProfitCentreMaster {
  id: string;
  code: string;
  name: string;
  description: string;
  headOfCentre: string;
  isActive: boolean;
  entityId?: string;
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
}

export interface ProjectMaster {
  id: string;
  code: string;
  name: string;
  description: string;
  projectManager: string;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Completed' | 'On Hold' | 'Cancelled';
  budgetAllocated?: number;
}

export interface BankMaster {
  id: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  accountNumber: string;
  accountName: string;
  accountType: 'Current' | 'Savings' | 'OD';
  entityId: string;
  entityName: string;
  entityMappings?: EntityScopeMapping[];
  currency: string;
  isActive: boolean;
  isPrimary: boolean;
}

export interface UserMaster {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  roles: string[];
  isActive: boolean;
}

export interface UOMMaster {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  entityId?: string;
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
}

export interface DepartmentMaster {
  id: string;
  code: string;
  name: string;
  description: string;
  headOfDepartment: string;
  isActive: boolean;
  entityId?: string;
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
}

export interface DebitNoteReasonMaster {
  id: string;
  code: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdDate: string;
  entityId?: string;
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
}

export interface TDSSectionMasterRecord {
  id: string;
  sectionCode: string;
  sectionName: string;
  description?: string;
  rateIndividual: number;
  rateCompany: number;
  rateNoTan?: number;
  thresholdAmount?: number;
  applicableTo?: string;
  status: 'Active' | 'Inactive';
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  entityMappings?: EntityScopeMapping[];
}

export interface VendorGroupMaster {
  code: string;
  name: string;
  relationshipType?: 'Third party' | 'Related party' | 'Associate' | 'JV';
  entities?: Array<{ id: string; name: string }>;
}

// ============================================================================
// MULTI-CURRENCY SUPPORT - ADDITIVE ONLY (NO TRANSACTION IMPACT)
// ============================================================================

export interface CurrencyMaster {
  id: string;
  code: string; // ISO 4217 code (INR, AED, USD)
  name: string;
  symbol: string;
  decimalPrecision: number; // Usually 2
  isActive: boolean;
  isBaseCurrency?: boolean; // For reporting reference
  entityId?: string;
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
}

export interface ExchangeRateMaster {
  id: string;
  fromCurrency: string; // Currency code
  toCurrency: string; // Currency code
  exchangeRate: number;
  rateType: 'Standard' | 'Custom'; // Future: Budget, Forecast, etc.
  effectiveFromDate: string;
  effectiveToDate?: string;
  isActive: boolean;
  createdBy: string;
  createdDate: string;
  lastUpdatedBy?: string;
  lastUpdatedDate?: string;
  entityId?: string;
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
}

// ============================================================================
// MOCK DATA (SYSTEM OF RECORD)
// In production, this would come from API/Database
// ============================================================================

const VENDOR_MASTER_DATA: VendorMaster[] = [...MULTI_ENTITY_VENDORS, ...DEMO_VENDOR_DATASET];

const ITEM_MASTER_DATA: ItemMaster[] = [];

const ENTITY_MASTER_DATA: EntityMaster[] = [
  {
    id: 'entity-ptpl-001',
    code: 'PTPL',
    name: 'Procinix Technologies Private Limited',
    legalName: 'Procinix Technologies Private Limited',
    pan: 'AABCP1234Q',
    gstin: '27AABCP1234Q1Z5',
    entityType: 'Company',
    address: 'A 1302 Sunteck City Avenue 1 Goregaon West Mumbai 400104',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400104',
    isActive: true,
    country: 'India',
    currency: 'INR',
    taxRegime: 'GST',
  },
  {
    id: 'entity-mtpl-001',
    code: 'MTPL',
    name: 'Mensbrand Technologies Private Limited',
    legalName: 'Mensbrand Technologies Private Limited',
    pan: 'AABCM5678Q',
    gstin: '27AABCM5678Q1Z3',
    entityType: 'Company',
    address: 'Mumbai Maharashtra',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400001',
    isActive: true,
    country: 'India',
    currency: 'INR',
    taxRegime: 'GST',
  },
];

const COST_CENTRE_MASTER_DATA: CostCentreMaster[] = [...MULTI_ENTITY_COST_CENTRES];

const PROFIT_CENTRE_MASTER_DATA: ProfitCentreMaster[] = [
  {
    id: 'PC-001',
    code: 'PC-SOUTH',
    name: 'South Region',
    description: 'Southern India operations',
    headOfCentre: 'Rajesh Kumar',
    isActive: true,
  },
  {
    id: 'PC-002',
    code: 'PC-WEST',
    name: 'West Region',
    description: 'Western India operations',
    headOfCentre: 'Priya Sharma',
    isActive: true,
  },
  {
    id: 'PC-003',
    code: 'PC-NORTH',
    name: 'North Region',
    description: 'Northern India operations',
    headOfCentre: 'Amit Patel',
    isActive: true,
  },
];

const ACCOUNT_CODE_MASTER_DATA: AccountCodeMaster[] = [
  {
    id: 'AC-001',
    code: '5001',
    name: 'Direct Materials',
    accountType: 'Expense',
    accountSubType: 'Cost of Goods Sold',
    isActive: true,
    requiresCostCentre: true,
    requiresProject: false,
    level: 2,
  },
  {
    id: 'AC-002',
    code: '5002',
    name: 'Contract Labor',
    accountType: 'Expense',
    accountSubType: 'Operating Expense',
    isActive: true,
    requiresCostCentre: true,
    requiresProject: false,
    level: 2,
  },
  {
    id: 'AC-003',
    code: '5003',
    name: 'IT Services',
    accountType: 'Expense',
    accountSubType: 'Operating Expense',
    isActive: true,
    requiresCostCentre: true,
    requiresProject: false,
    level: 2,
  },
  {
    id: 'AC-004',
    code: '5004',
    name: 'Office Supplies',
    accountType: 'Expense',
    accountSubType: 'Operating Expense',
    isActive: true,
    requiresCostCentre: true,
    requiresProject: false,
    level: 2,
  },
  {
    id: 'AC-005',
    code: '2001',
    name: 'Accounts Payable',
    accountType: 'Liability',
    accountSubType: 'Current Liability',
    isActive: true,
    requiresCostCentre: false,
    requiresProject: false,
    level: 2,
  },
];

const TAX_CODE_MASTER_DATA: TaxCodeMaster[] = [
  ...MULTI_ENTITY_TAX_CODES,
  {
    id: 'TAX-001',
    taxCode: 'GST18',
    taxType: 'GST',
    taxName: 'GST @ 18%',
    taxRate: 18,
    isActive: true,
    applicableFrom: '2017-07-01',
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
  },
  {
    id: 'TAX-002',
    taxCode: 'GST12',
    taxType: 'GST',
    taxName: 'GST @ 12%',
    taxRate: 12,
    isActive: true,
    applicableFrom: '2017-07-01',
    cgstRate: 6,
    sgstRate: 6,
    igstRate: 12,
  },
  {
    id: 'TAX-003',
    taxCode: 'GST5',
    taxType: 'GST',
    taxName: 'GST @ 5%',
    taxRate: 5,
    isActive: true,
    applicableFrom: '2017-07-01',
    cgstRate: 2.5,
    sgstRate: 2.5,
    igstRate: 5,
  },
  {
    id: 'TAX-004',
    taxCode: 'TDS194C',
    taxType: 'TDS',
    taxName: 'TDS u/s 194C - Contractors',
    taxRate: 2,
    isActive: true,
    applicableFrom: '2020-04-01',
    tdsSection: '194C',
    tdsNature: 'Payments to Contractors',
  },
  {
    id: 'TAX-005',
    taxCode: 'TDS194J',
    taxType: 'TDS',
    taxName: 'TDS u/s 194J - Professional Services',
    taxRate: 10,
    isActive: true,
    applicableFrom: '2020-04-01',
    tdsSection: '194J',
    tdsNature: 'Professional/Technical Services',
  },
];

const BANK_MASTER_DATA: BankMaster[] = [
  ...MULTI_ENTITY_BANKS,
  {
    id: 'BANK-001',
    bankName: 'HDFC Bank',
    branchName: 'MG Road Branch',
    ifscCode: 'HDFC0000123',
    accountNumber: '00123456789',
    accountName: 'ABC Pvt Ltd',
    accountType: 'Current',
    entityId: 'ENT-001',
    entityName: 'Bangalore Office',
    currency: 'INR',
    isActive: true,
    isPrimary: true,
  },
  {
    id: 'BANK-002',
    bankName: 'ICICI Bank',
    branchName: 'Koramangala Branch',
    ifscCode: 'ICIC0000456',
    accountNumber: '00456789012',
    accountName: 'ABC Pvt Ltd',
    accountType: 'Current',
    entityId: 'ENT-001',
    entityName: 'Bangalore Office',
    currency: 'INR',
    isActive: true,
    isPrimary: false,
  },
  {
    id: 'BANK-003',
    bankName: 'State Bank of India',
    branchName: 'Nariman Point Branch',
    ifscCode: 'SBIN0000789',
    accountNumber: '00789012345',
    accountName: 'ABC Pvt Ltd - Mumbai',
    accountType: 'Current',
    entityId: 'ENT-002',
    entityName: 'Mumbai Office',
    currency: 'INR',
    isActive: true,
    isPrimary: true,
  },
];

const UOM_MASTER_DATA: UOMMaster[] = [
  { id: 'UOM-001', code: 'KG', name: 'Kilogram', description: 'Unit of weight measurement', isActive: true },
  { id: 'UOM-002', code: 'LITRE', name: 'Litre', description: 'Unit of volume measurement', isActive: true },
  { id: 'UOM-003', code: 'NOS', name: 'Numbers', description: 'Count of items', isActive: true },
  { id: 'UOM-004', code: 'HOUR', name: 'Hour', description: 'Unit of time for services', isActive: true },
  { id: 'UOM-005', code: 'MT', name: 'Metric Ton', description: '1000 kilograms', isActive: true },
  { id: 'UOM-006', code: 'PKT', name: 'Packet', description: 'Standard packet', isActive: true },
];

const DEPARTMENT_MASTER_DATA: DepartmentMaster[] = [...MULTI_ENTITY_DEPARTMENTS];

const DEBIT_NOTE_REASON_MASTER_DATA: DebitNoteReasonMaster[] = [];
const VENDOR_GROUP_MASTER_DATA: VendorGroupMaster[] = [
  { code: 'VG001', name: 'Tata Group', relationshipType: 'Associate' },
  { code: 'VG002', name: 'Reliance Group', relationshipType: 'Related party' },
  { code: 'VG003', name: 'Aditya Birla Group', relationshipType: 'Associate' },
  { code: 'VG004', name: 'Mahindra Group', relationshipType: 'Third party' },
  { code: 'VG015', name: 'Independent Vendors', relationshipType: 'Third party' },
];

const TDS_SECTION_MASTER_DATA: TDSSectionMasterRecord[] = [
  {
    id: 'TDS-194C',
    sectionCode: '194C',
    sectionName: 'Payment to Contractors',
    description: 'TDS on payments to contractors and sub-contractors',
    rateIndividual: 1,
    rateCompany: 2,
    rateNoTan: 20,
    thresholdAmount: 30000,
    applicableTo: 'Contractors',
    status: 'Active',
    approvalStatus: 'Approved',
  },
  {
    id: 'TDS-194J',
    sectionCode: '194J',
    sectionName: 'Professional/Technical Services',
    description: 'TDS on professional and technical service fees',
    rateIndividual: 10,
    rateCompany: 10,
    rateNoTan: 20,
    thresholdAmount: 30000,
    applicableTo: 'Professionals',
    status: 'Active',
    approvalStatus: 'Approved',
  },
];

// ============================================================================
// CURRENCY MASTER DATA (MULTI-COUNTRY SUPPORT)
// Reference data only - NOT applied in transactions at this stage
// ============================================================================

const CURRENCY_MASTER_DATA: CurrencyMaster[] = [
  {
    id: 'CUR-001',
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    decimalPrecision: 2,
    isActive: true,
    isBaseCurrency: true, // Default base currency for reporting
  },
  {
    id: 'CUR-002',
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    decimalPrecision: 2,
    isActive: true,
    isBaseCurrency: false,
  },
  {
    id: 'CUR-003',
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimalPrecision: 2,
    isActive: true,
    isBaseCurrency: false,
  },
  {
    id: 'CUR-004',
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimalPrecision: 2,
    isActive: true,
    isBaseCurrency: false,
  },
  {
    id: 'CUR-005',
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimalPrecision: 2,
    isActive: true,
    isBaseCurrency: false,
  },
];

// ============================================================================
// EXCHANGE RATE MASTER DATA (DEMO SAFE - REFERENCE ONLY)
// These rates are NOT auto-applied to transactions
// Reserved for consolidated reporting and cross-entity analytics only
// ============================================================================

const EXCHANGE_RATE_MASTER_DATA: ExchangeRateMaster[] = [
  // INR to AED conversions
  {
    id: 'FX-001',
    fromCurrency: 'INR',
    toCurrency: 'AED',
    exchangeRate: 0.044, // 1 INR = 0.044 AED (approx)
    rateType: 'Standard',
    effectiveFromDate: '2024-01-01',
    isActive: true,
    createdBy: 'System',
    createdDate: '2024-01-01',
  },
  {
    id: 'FX-002',
    fromCurrency: 'AED',
    toCurrency: 'INR',
    exchangeRate: 22.68, // 1 AED = 22.68 INR (approx)
    rateType: 'Standard',
    effectiveFromDate: '2024-01-01',
    isActive: true,
    createdBy: 'System',
    createdDate: '2024-01-01',
  },
  // INR to USD conversions
  {
    id: 'FX-003',
    fromCurrency: 'INR',
    toCurrency: 'USD',
    exchangeRate: 0.012, // 1 INR = 0.012 USD (approx)
    rateType: 'Standard',
    effectiveFromDate: '2024-01-01',
    isActive: true,
    createdBy: 'System',
    createdDate: '2024-01-01',
  },
  {
    id: 'FX-004',
    fromCurrency: 'USD',
    toCurrency: 'INR',
    exchangeRate: 83.25, // 1 USD = 83.25 INR (approx)
    rateType: 'Standard',
    effectiveFromDate: '2024-01-01',
    isActive: true,
    createdBy: 'System',
    createdDate: '2024-01-01',
  },
  // AED to USD conversions
  {
    id: 'FX-005',
    fromCurrency: 'AED',
    toCurrency: 'USD',
    exchangeRate: 0.272, // 1 AED = 0.272 USD (approx)
    rateType: 'Standard',
    effectiveFromDate: '2024-01-01',
    isActive: true,
    createdBy: 'System',
    createdDate: '2024-01-01',
  },
  {
    id: 'FX-006',
    fromCurrency: 'USD',
    toCurrency: 'AED',
    exchangeRate: 3.67, // 1 USD = 3.67 AED (approx)
    rateType: 'Standard',
    effectiveFromDate: '2024-01-01',
    isActive: true,
    createdBy: 'System',
    createdDate: '2024-01-01',
  },
  // EUR conversions (for reference)
  {
    id: 'FX-007',
    fromCurrency: 'EUR',
    toCurrency: 'INR',
    exchangeRate: 90.5, // 1 EUR = 90.50 INR (approx)
    rateType: 'Standard',
    effectiveFromDate: '2024-01-01',
    isActive: true,
    createdBy: 'System',
    createdDate: '2024-01-01',
  },
  {
    id: 'FX-008',
    fromCurrency: 'INR',
    toCurrency: 'EUR',
    exchangeRate: 0.011, // 1 INR = 0.011 EUR (approx)
    rateType: 'Standard',
    effectiveFromDate: '2024-01-01',
    isActive: true,
    createdBy: 'System',
    createdDate: '2024-01-01',
  },
];

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

// Company interface for entity switcher
export interface Company {
  id: string;
  code: string;
  name: string;
}

// Role interface for RBAC
export interface RolePermissions {
  roleId: string;
  roleName: string;
  permissions: string[];
}

interface MasterDataContextType {
  // Vendors
  vendors: VendorMaster[];
  addVendor: (vendor: VendorMaster) => void;
  updateVendor: (vendor: VendorMaster) => void;
  getVendorById: (id: string) => VendorMaster | undefined;
  getVendorByCode: (code: string) => VendorMaster | undefined;
  getActiveVendors: () => VendorMaster[];
  getVendorsByEntity: (entityId: string) => VendorMaster[]; // MULTI-ENTITY FILTER

  // Items
  items: ItemMaster[];
  getItemById: (id: string) => ItemMaster | undefined;
  getItemByCode: (code: string) => ItemMaster | undefined;
  getActiveItems: () => ItemMaster[];

  // Entities
  entities: EntityMaster[];
  getEntityById: (id: string) => EntityMaster | undefined;
  getActiveEntities: () => EntityMaster[];
  getEntitiesByCountry: (country: string) => EntityMaster[]; // MULTI-COUNTRY FILTER

  // Cost Centres
  costCentres: CostCentreMaster[];
  getCostCentreById: (id: string) => CostCentreMaster | undefined;
  getActiveCostCentres: () => CostCentreMaster[];

  // Profit Centres
  profitCentres: ProfitCentreMaster[];
  getProfitCentreById: (id: string) => ProfitCentreMaster | undefined;
  getActiveProfitCentres: () => ProfitCentreMaster[];

  // Account Codes
  accountCodes: AccountCodeMaster[];
  getAccountCodeById: (id: string) => AccountCodeMaster | undefined;
  getAccountCodeByCode: (code: string) => AccountCodeMaster | undefined;
  getActiveAccountCodes: () => AccountCodeMaster[];

  // Tax Codes
  taxCodes: TaxCodeMaster[];
  getTaxCodeById: (id: string) => TaxCodeMaster | undefined;
  getActiveTaxCodes: () => TaxCodeMaster[];
  getGSTCodes: () => TaxCodeMaster[];
  getTDSCodes: () => TaxCodeMaster[];
  getVATCodes: () => TaxCodeMaster[]; // UAE VAT codes

  // Banks
  banks: BankMaster[];
  getBankById: (id: string) => BankMaster | undefined;
  getActiveBanks: () => BankMaster[];
  getBanksByEntity: (entityId: string) => BankMaster[];

  // UOMs
  uoms: UOMMaster[];
  getUOMById: (id: string) => UOMMaster | undefined;
  getUOMByCode: (code: string) => UOMMaster | undefined;
  getActiveUOMs: () => UOMMaster[];

  // Departments
  departments: DepartmentMaster[];
  getDepartmentById: (id: string) => DepartmentMaster | undefined;
  getActiveDepartments: () => DepartmentMaster[];

  // Debit Note Reasons
  debitNoteReasons: DebitNoteReasonMaster[];
  getDebitNoteReasonById: (id: string) => DebitNoteReasonMaster | undefined;
  getActiveDebitNoteReasons: () => DebitNoteReasonMaster[];

  // Vendor Groups
  vendorGroups: VendorGroupMaster[];

  // TDS Sections
  tdsSections: TDSSectionMasterRecord[];
  getTDSSectionByCode: (sectionCode: string) => TDSSectionMasterRecord | undefined;
  getActiveTDSSections: () => TDSSectionMasterRecord[];

  // Currencies
  currencies: CurrencyMaster[];
  getCurrencyById: (id: string) => CurrencyMaster | undefined;
  getCurrencyByCode: (code: string) => CurrencyMaster | undefined;
  getActiveCurrencies: () => CurrencyMaster[];

  // Exchange Rates
  exchangeRates: ExchangeRateMaster[];
  getExchangeRateById: (id: string) => ExchangeRateMaster | undefined;
  getActiveExchangeRates: () => ExchangeRateMaster[];
  getExchangeRate: (fromCurrency: string, toCurrency: string) => number | null; // Helper to get rate

  // ENTITY CONTEXT - GLOBAL STATE FOR HEADER/NAVIGATION
  currentCompany: Company | null;
  availableCompanies: Company[];
  switchCompany: (companyId: string) => void;
  currentRole: RolePermissions | null;
}

interface MasterDataDocument {
  vendors: VendorMaster[];
  items: ItemMaster[];
  entities: EntityMaster[];
  costCentres: CostCentreMaster[];
  profitCentres: ProfitCentreMaster[];
  accountCodes: AccountCodeMaster[];
  taxCodes: TaxCodeMaster[];
  banks: BankMaster[];
  uoms: UOMMaster[];
  departments: DepartmentMaster[];
  debitNoteReasons: DebitNoteReasonMaster[];
  vendorGroups: VendorGroupMaster[];
  tdsSections: TDSSectionMasterRecord[];
  currencies: CurrencyMaster[];
  exchangeRates: ExchangeRateMaster[];
}

interface MysqlItemRow {
  id: string;
  itemCode: string;
  itemName: string;
  itemDescription?: string;
  procurementCategory?: string;
  uom?: string;
  hsnCode?: string;
  gstRate?: string | number;
  itemStatus?: string;
  createdAt?: string;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const defaultDocument: MasterDataDocument = {
    vendors: VENDOR_MASTER_DATA,
    items: ITEM_MASTER_DATA,
    entities: ENTITY_MASTER_DATA,
    costCentres: COST_CENTRE_MASTER_DATA,
    profitCentres: PROFIT_CENTRE_MASTER_DATA,
    accountCodes: ACCOUNT_CODE_MASTER_DATA,
    taxCodes: TAX_CODE_MASTER_DATA,
    banks: BANK_MASTER_DATA,
    uoms: UOM_MASTER_DATA,
    departments: DEPARTMENT_MASTER_DATA,
    debitNoteReasons: DEBIT_NOTE_REASON_MASTER_DATA,
    vendorGroups: VENDOR_GROUP_MASTER_DATA,
    tdsSections: TDS_SECTION_MASTER_DATA,
    currencies: CURRENCY_MASTER_DATA,
    exchangeRates: EXCHANGE_RATE_MASTER_DATA,
  };

  const [vendors, setVendors] = useState<VendorMaster[]>(defaultDocument.vendors);
  const [items, setItems] = useState<ItemMaster[]>(defaultDocument.items);
  const [entities, setEntities] = useState<EntityMaster[]>(defaultDocument.entities);
  const [costCentres, setCostCentres] = useState<CostCentreMaster[]>(defaultDocument.costCentres);
  const [profitCentres, setProfitCentres] = useState<ProfitCentreMaster[]>(
    defaultDocument.profitCentres
  );
  const [accountCodes, setAccountCodes] = useState<AccountCodeMaster[]>(
    defaultDocument.accountCodes
  );
  const [taxCodes, setTaxCodes] = useState<TaxCodeMaster[]>(defaultDocument.taxCodes);
  const [banks, setBanks] = useState<BankMaster[]>(defaultDocument.banks);
  const [uoms, setUoms] = useState<UOMMaster[]>(defaultDocument.uoms);
  const [departments, setDepartments] = useState<DepartmentMaster[]>(defaultDocument.departments);
  const [debitNoteReasons, setDebitNoteReasons] = useState<DebitNoteReasonMaster[]>(
    defaultDocument.debitNoteReasons
  );
  const [vendorGroups, setVendorGroups] = useState<VendorGroupMaster[]>(
    defaultDocument.vendorGroups
  );
  const [tdsSections, setTdsSections] = useState<TDSSectionMasterRecord[]>(
    defaultDocument.tdsSections
  );
  const [currencies, setCurrencies] = useState<CurrencyMaster[]>(defaultDocument.currencies);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateMaster[]>(
    defaultDocument.exchangeRates
  );
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      if (isMysqlApiEnabled()) {
        const [
          vendorsData,
          entitiesData,
          costCentresData,
          profitCentresData,
          accountCodesData,
          taxCodesData,
          banksData,
          uomsData,
          departmentsData,
          debitNoteReasonsData,
          tdsSectionsData,
          currenciesData,
          exchangeRatesData,
          document,
          itemsResponse,
        ] = await Promise.all([
          ensureRelationalMasterRecords('vendor_master', defaultDocument.vendors),
          ensureRelationalMasterRecords('entity_master', defaultDocument.entities),
          ensureRelationalMasterRecords('cost_centre_master', defaultDocument.costCentres),
          ensureRelationalMasterRecords('profit_centre_master', defaultDocument.profitCentres),
          ensureRelationalMasterRecords('account_code_master', defaultDocument.accountCodes),
          ensureRelationalMasterRecords('tax_code_master', defaultDocument.taxCodes),
          ensureRelationalMasterRecords('bank_master', defaultDocument.banks),
          ensureRelationalMasterRecords('uom_master', defaultDocument.uoms),
          ensureRelationalMasterRecords('department_master', defaultDocument.departments),
          ensureRelationalMasterRecords(
            'debit_note_reason_master',
            defaultDocument.debitNoteReasons
          ),
          ensureRelationalMasterRecords('tds_section_master', defaultDocument.tdsSections),
          ensureRelationalMasterRecords('currency_master', defaultDocument.currencies),
          ensureRelationalMasterRecords('exchange_rate_master', defaultDocument.exchangeRates),
          ensureDomainDocument('master_data', defaultDocument),
          mysqlApiRequest<{ success: boolean; data: MysqlItemRow[] }>('/items').catch(() => ({
            success: false,
            data: [],
          })),
        ]);

        if (!isMounted) {
          return;
        }

        setVendors(vendorsData ?? defaultDocument.vendors);
        setItems(
          itemsResponse.data.length > 0
            ? itemsResponse.data.map((item) => ({
                id: item.id,
                code: item.itemCode,
                name: item.itemName,
                description: item.itemDescription ?? '',
                category: item.procurementCategory ?? '',
                subCategory: '',
                uom: item.uom ?? '',
                hsnCode: item.hsnCode ?? '',
                gstRate: Number(item.gstRate ?? 0),
                itemType: 'Goods' as const,
                status: (item.itemStatus === 'Inactive'
                  ? 'Inactive'
                  : 'Active') as ItemMaster['status'],
                createdBy: 'system',
                createdDate: item.createdAt?.split('T')[0] ?? '',
              }))
            : defaultDocument.items
        );
        setEntities(entitiesData ?? defaultDocument.entities);
        setCostCentres(costCentresData ?? defaultDocument.costCentres);
        setProfitCentres(profitCentresData ?? defaultDocument.profitCentres);
        setAccountCodes(accountCodesData ?? defaultDocument.accountCodes);
        setTaxCodes(taxCodesData ?? defaultDocument.taxCodes);
        setBanks(banksData ?? defaultDocument.banks);
        setUoms(uomsData ?? defaultDocument.uoms);
        setDepartments(departmentsData ?? defaultDocument.departments);
        setDebitNoteReasons(debitNoteReasonsData ?? defaultDocument.debitNoteReasons);
        setVendorGroups(document.vendorGroups ?? defaultDocument.vendorGroups);
        setTdsSections(tdsSectionsData ?? defaultDocument.tdsSections);
        setCurrencies(currenciesData ?? defaultDocument.currencies);
        setExchangeRates(exchangeRatesData ?? defaultDocument.exchangeRates);
        setIsHydrating(false);
        return;
      }

      const document = await ensureDomainDocument('master_data', defaultDocument);
      if (!isMounted) {
        return;
      }

      setVendors(document.vendors ?? defaultDocument.vendors);
      setItems(document.items ?? defaultDocument.items);
      setEntities(document.entities ?? defaultDocument.entities);
      setCostCentres(document.costCentres ?? defaultDocument.costCentres);
      setProfitCentres(document.profitCentres ?? defaultDocument.profitCentres);
      setAccountCodes(document.accountCodes ?? defaultDocument.accountCodes);
      setTaxCodes(document.taxCodes ?? defaultDocument.taxCodes);
      setBanks(document.banks ?? defaultDocument.banks);
      setUoms(document.uoms ?? defaultDocument.uoms);
      setDepartments(document.departments ?? defaultDocument.departments);
      setDebitNoteReasons(document.debitNoteReasons ?? defaultDocument.debitNoteReasons);
      setVendorGroups(document.vendorGroups ?? defaultDocument.vendorGroups);
      setTdsSections(document.tdsSections ?? defaultDocument.tdsSections);
      setCurrencies(document.currencies ?? defaultDocument.currencies);
      setExchangeRates(document.exchangeRates ?? defaultDocument.exchangeRates);
      setIsHydrating(false);
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    if (isMysqlApiEnabled()) {
      saveRelationalMasterRecords('vendor_master', vendors);
      saveRelationalMasterRecords('account_code_master', accountCodes);
      saveRelationalMasterRecords('bank_master', banks);
      saveRelationalMasterRecords('tds_section_master', tdsSections);
      saveDomainDocument('master_data', {
        vendors,
        items,
        entities,
        costCentres,
        profitCentres,
        accountCodes,
        taxCodes,
        banks,
        uoms,
        departments,
        debitNoteReasons,
        vendorGroups,
        tdsSections,
        currencies,
        exchangeRates,
      });
      return;
    }

    saveDomainDocument('master_data', {
      vendors,
      items,
      entities,
      costCentres,
      profitCentres,
      accountCodes,
      taxCodes,
      banks,
      uoms,
      departments,
      debitNoteReasons,
      vendorGroups,
      tdsSections,
      currencies,
      exchangeRates,
    });
  }, [
    accountCodes,
    banks,
    costCentres,
    currencies,
    debitNoteReasons,
    vendorGroups,
    departments,
    entities,
    exchangeRates,
    isHydrating,
    items,
    profitCentres,
    taxCodes,
    tdsSections,
    uoms,
    vendors,
  ]);

  // Vendor helpers
  const getVendorById = (id: string) => vendors.find((v) => v.id === id);
  const getVendorByCode = (code: string) => vendors.find((v) => v.code === code);
  const getActiveVendors = () =>
    vendors.filter(
      (v) =>
        v.status === 'Active' &&
        (v.approvalStatus ?? 'Approved') === 'Approved' &&
        isRecordMappedToEntity(v, currentCompany?.id)
    );
  const getVendorsByEntity = (entityId: string) =>
    vendors.filter((v) => v.status === 'Active' && isRecordMappedToEntity(v, entityId));

  // Item helpers
  const getItemById = (id: string) => items.find((i) => i.id === id);
  const getItemByCode = (code: string) => items.find((i) => i.code === code);
  const getActiveItems = () =>
    items.filter((i) => i.status === 'Active' && isRecordMappedToEntity(i, currentCompany?.id));

  // Entity helpers
  const getEntityById = (id: string) => entities.find((e) => e.id === id);
  const getActiveEntities = () => entities.filter((e) => e.isActive);
  const getEntitiesByCountry = (country: string) =>
    entities.filter((e) => e.country === country && e.isActive);

  // Cost Centre helpers
  const getCostCentreById = (id: string) => costCentres.find((c) => c.id === id);
  const getActiveCostCentres = () =>
    costCentres.filter((c) => c.isActive && isRecordMappedToEntity(c, currentCompany?.id));

  // Profit Centre helpers
  const getProfitCentreById = (id: string) => profitCentres.find((p) => p.id === id);
  const getActiveProfitCentres = () =>
    profitCentres.filter((p) => p.isActive && isRecordMappedToEntity(p, currentCompany?.id));

  // Account Code helpers
  const getAccountCodeById = (id: string) => accountCodes.find((a) => a.id === id);
  const getAccountCodeByCode = (code: string) => accountCodes.find((a) => a.code === code);
  const getActiveAccountCodes = () =>
    accountCodes.filter((a) => a.isActive && isRecordMappedToEntity(a, currentCompany?.id));

  // Tax Code helpers
  const getTaxCodeById = (id: string) => taxCodes.find((t) => t.id === id);
  const getActiveTaxCodes = () =>
    taxCodes.filter((t) => t.isActive && isRecordMappedToEntity(t, currentCompany?.id));
  const getGSTCodes = () =>
    taxCodes.filter(
      (t) => t.taxType === 'GST' && t.isActive && isRecordMappedToEntity(t, currentCompany?.id)
    );
  const getTDSCodes = () =>
    taxCodes.filter(
      (t) => t.taxType === 'TDS' && t.isActive && isRecordMappedToEntity(t, currentCompany?.id)
    );
  const getVATCodes = () => [];

  // Bank helpers
  const getBankById = (id: string) => banks.find((b) => b.id === id);
  const getActiveBanks = () =>
    banks.filter((b) => b.isActive && isRecordMappedToEntity(b, currentCompany?.id));
  const getBanksByEntity = (entityId: string) =>
    banks.filter((b) => b.isActive && isRecordMappedToEntity(b, entityId));

  // UOM helpers
  const getUOMById = (id: string) => uoms.find((u) => u.id === id);
  const getUOMByCode = (code: string) => uoms.find((u) => u.code === code);
  const getActiveUOMs = () =>
    uoms.filter((u) => u.isActive && isRecordMappedToEntity(u, currentCompany?.id));

  // Department helpers
  const getDepartmentById = (id: string) => departments.find((d) => d.id === id);
  const getActiveDepartments = () =>
    departments.filter((d) => d.isActive && isRecordMappedToEntity(d, currentCompany?.id));

  // Debit Note Reason helpers
  const getDebitNoteReasonById = (id: string) => debitNoteReasons.find((d) => d.id === id);
  const getActiveDebitNoteReasons = () =>
    debitNoteReasons.filter(
      (d) => d.status === 'Active' && isRecordMappedToEntity(d, currentCompany?.id)
    );

  // TDS Section helpers
  const getTDSSectionByCode = (sectionCode: string) =>
    tdsSections.find((section) => section.sectionCode === sectionCode);
  const getActiveTDSSections = () =>
    tdsSections.filter(
      (section) =>
        section.status === 'Active' &&
        (section.approvalStatus ?? 'Approved') === 'Approved' &&
        isRecordMappedToEntity(section, currentCompany?.id)
    );

  // Currency helpers
  const getCurrencyById = (id: string) => currencies.find((c) => c.id === id);
  const getCurrencyByCode = (code: string) => currencies.find((c) => c.code === code);
  const getActiveCurrencies = () =>
    currencies.filter((c) => c.isActive && isRecordMappedToEntity(c, currentCompany?.id));

  // Exchange Rate helpers
  const getExchangeRateById = (id: string) => exchangeRates.find((e) => e.id === id);
  const getActiveExchangeRates = () =>
    exchangeRates.filter((e) => e.isActive && isRecordMappedToEntity(e, currentCompany?.id));
  const getExchangeRate = (fromCurrency: string, toCurrency: string) => {
    const rate = exchangeRates.find(
      (e) => e.fromCurrency === fromCurrency && e.toCurrency === toCurrency
    );
    return rate ? rate.exchangeRate : null;
  };

  // ENTITY CONTEXT - GLOBAL STATE FOR HEADER/NAVIGATION
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [currentRole, setCurrentRole] = useState<RolePermissions | null>(null);

  // Initialize availableCompanies from Entity Master on mount
  useEffect(() => {
    const activeEntities = entities.filter((e) => e.isActive);
    const companies: Company[] = activeEntities.map((e) => ({
      id: e.id,
      code: e.code,
      name: e.name,
    }));

    setAvailableCompanies(companies);

    // Auto-select first entity if no entity is selected
    if (!currentCompany && companies.length > 0) {
      setCurrentCompany(companies[0]);

      // Also set default role
      setCurrentRole({
        roleId: 'role-cfo',
        roleName: 'CFO View',
        permissions: ['*'],
      });
    }
  }, []); // Run once on mount

  const switchCompany = (companyId: string) => {
    // Handle special CONSOLIDATED view
    if (companyId === 'CONSOLIDATED') {
      setCurrentCompany({
        id: 'CONSOLIDATED',
        code: 'CONSOLIDATED',
        name: 'Consolidated View',
      });
      return;
    }

    // Handle regular entity selection
    const company = availableCompanies.find((c) => c.id === companyId);
    if (company) {
      setCurrentCompany(company);
    }
  };

  const value: MasterDataContextType = {
    vendors,
    addVendor: (vendor) => {
      setVendors((current) => [vendor, ...current]);
    },
    updateVendor: (vendor) => {
      setVendors((current) => current.map((v) => (v.id === vendor.id ? vendor : v)));
    },
    getVendorById,
    getVendorByCode,
    getActiveVendors,
    getVendorsByEntity,
    items,
    getItemById,
    getItemByCode,
    getActiveItems,
    entities,
    getEntityById,
    getActiveEntities,
    getEntitiesByCountry,
    costCentres,
    getCostCentreById,
    getActiveCostCentres,
    profitCentres,
    getProfitCentreById,
    getActiveProfitCentres,
    accountCodes,
    getAccountCodeById,
    getAccountCodeByCode,
    getActiveAccountCodes,
    taxCodes,
    getTaxCodeById,
    getActiveTaxCodes,
    getGSTCodes,
    getTDSCodes,
    getVATCodes,
    banks,
    getBankById,
    getActiveBanks,
    getBanksByEntity,
    uoms,
    getUOMById,
    getUOMByCode,
    getActiveUOMs,
    departments,
    getDepartmentById,
    getActiveDepartments,
    debitNoteReasons,
    getDebitNoteReasonById,
    getActiveDebitNoteReasons,
    vendorGroups,
    tdsSections,
    getTDSSectionByCode,
    getActiveTDSSections,
    currencies,
    getCurrencyById,
    getCurrencyByCode,
    getActiveCurrencies,
    exchangeRates,
    getExchangeRateById,
    getActiveExchangeRates,
    getExchangeRate,
    currentCompany,
    availableCompanies,
    switchCompany,
    currentRole,
  };

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
}

// ============================================================================
// HOOK TO CONSUME MASTER DATA
// ============================================================================

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}

/**
 * GOVERNANCE NOTE:
 *
 * All future components MUST use useMasterData() hook to access master data.
 * DO NOT create local arrays, hardcoded dropdowns, or duplicate master definitions.
 *
 * Example usage:
 * ```
 * const { vendors, getActiveVendors } = useMasterData();
 * const activeVendors = getActiveVendors();
 * ```
 */
