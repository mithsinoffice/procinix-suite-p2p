export type PermissionAction = 'view' | 'create' | 'edit' | 'approve' | 'export' | 'configure';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
  export: boolean;
  configure: boolean;
}

export interface Module {
  id: string;
  name: string;
  section: 'AP Automation' | 'AR Automation' | 'R2R Automation';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
}

export const modules: Module[] = [
  // AP Automation
  { id: 'procurement', name: 'Procurement', section: 'AP Automation' },
  { id: 'ap-invoices', name: 'AP Invoices', section: 'AP Automation' },
  { id: 'payments', name: 'Payments', section: 'AP Automation' },
  { id: 'vendor-master', name: 'Vendor Master', section: 'AP Automation' },
  
  // AR Automation
  { id: 'sales-invoices', name: 'Sales Invoices', section: 'AR Automation' },
  { id: 'collections', name: 'Collections', section: 'AR Automation' },
  { id: 'credit-notes', name: 'Credit Notes', section: 'AR Automation' },
  
  // R2R Automation
  { id: 'journals', name: 'Journals', section: 'R2R Automation' },
  { id: 'financial-statements', name: 'Financial Statements', section: 'R2R Automation' },
  { id: 'cashflow', name: 'Cashflow', section: 'R2R Automation' },
  { id: 'consolidation', name: 'Consolidation', section: 'R2R Automation' },
];

export const roles: Role[] = [
  { id: 'ap-executive', name: 'AP Executive', description: 'Handles AP data entry and basic operations', color: '#3B82F6' },
  { id: 'ap-manager', name: 'AP Manager', description: 'Manages AP processes and approvals', color: '#2563EB' },
  { id: 'payments-maker', name: 'Payments Maker', description: 'Creates payment batches', color: '#06B6D4' },
  { id: 'payments-checker', name: 'Payments Checker', description: 'Approves payment batches', color: '#0891B2' },
  { id: 'vendor-master-admin', name: 'Vendor Master Admin', description: 'Manages vendor master data', color: '#8B5CF6' },
  { id: 'ar-executive', name: 'AR Executive', description: 'Handles AR data entry and basic operations', color: '#10B981' },
  { id: 'ar-manager', name: 'AR Manager', description: 'Manages AR processes and approvals', color: '#059669' },
  { id: 'gl-accountant', name: 'GL Accountant', description: 'Posts journal entries and reconciles GL', color: '#F59E0B' },
  { id: 'r2r-manager', name: 'R2R Manager', description: 'Manages record-to-report processes', color: '#D97706' },
  { id: 'cfo', name: 'CFO', description: 'Chief Financial Officer - strategic oversight', color: '#EF4444' },
  { id: 'ceo', name: 'CEO', description: 'Chief Executive Officer - executive oversight', color: '#DC2626' },
  { id: 'auditor', name: 'Auditor', description: 'View-only access for audit purposes', color: '#6B7280' },
  { id: 'system-admin', name: 'System Admin', description: 'Full system configuration access', color: '#0A0F14' },
];

export type PermissionMatrix = {
  [roleId: string]: {
    [moduleId: string]: ModulePermissions;
  };
};

// Comprehensive permission matrix
export const permissionMatrix: PermissionMatrix = {
  'ap-executive': {
    'procurement': { view: true, create: true, edit: true, approve: false, export: true, configure: false },
    'ap-invoices': { view: true, create: true, edit: true, approve: false, export: true, configure: false },
    'payments': { view: true, create: false, edit: false, approve: false, export: false, configure: false },
    'vendor-master': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'sales-invoices': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'collections': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'credit-notes': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'journals': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'financial-statements': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'cashflow': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'consolidation': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
  },
  'ap-manager': {
    'procurement': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'ap-invoices': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'payments': { view: true, create: true, edit: true, approve: true, export: true, configure: false },
    'vendor-master': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'sales-invoices': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'collections': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'credit-notes': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'journals': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'financial-statements': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'cashflow': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'consolidation': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
  },
  'payments-maker': {
    'procurement': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'ap-invoices': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'payments': { view: true, create: true, edit: true, approve: false, export: true, configure: false },
    'vendor-master': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'sales-invoices': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'collections': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'credit-notes': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'journals': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'financial-statements': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'cashflow': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'consolidation': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
  },
  'payments-checker': {
    'procurement': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'ap-invoices': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'payments': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'vendor-master': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'sales-invoices': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'collections': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'credit-notes': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'journals': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'financial-statements': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'cashflow': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'consolidation': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
  },
  'vendor-master-admin': {
    'procurement': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'ap-invoices': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'payments': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'vendor-master': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'sales-invoices': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'collections': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'credit-notes': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'journals': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'financial-statements': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'cashflow': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'consolidation': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
  },
  'ar-executive': {
    'procurement': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'ap-invoices': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'payments': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'vendor-master': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'sales-invoices': { view: true, create: true, edit: true, approve: false, export: true, configure: false },
    'collections': { view: true, create: true, edit: true, approve: false, export: true, configure: false },
    'credit-notes': { view: true, create: true, edit: true, approve: false, export: true, configure: false },
    'journals': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'financial-statements': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'cashflow': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'consolidation': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
  },
  'ar-manager': {
    'procurement': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'ap-invoices': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'payments': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'vendor-master': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
    'sales-invoices': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'collections': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'credit-notes': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'journals': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'financial-statements': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'cashflow': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'consolidation': { view: false, create: false, edit: false, approve: false, export: false, configure: false },
  },
  'gl-accountant': {
    'procurement': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'ap-invoices': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'payments': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'vendor-master': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'sales-invoices': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'collections': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'credit-notes': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'journals': { view: true, create: true, edit: true, approve: false, export: true, configure: false },
    'financial-statements': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'cashflow': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'consolidation': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
  },
  'r2r-manager': {
    'procurement': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'ap-invoices': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'payments': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'vendor-master': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'sales-invoices': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'collections': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'credit-notes': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'journals': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'financial-statements': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'cashflow': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'consolidation': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
  },
  'cfo': {
    'procurement': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'ap-invoices': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'payments': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'vendor-master': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'sales-invoices': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'collections': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'credit-notes': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'journals': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'financial-statements': { view: true, create: false, edit: false, approve: true, export: true, configure: true },
    'cashflow': { view: true, create: false, edit: false, approve: true, export: true, configure: true },
    'consolidation': { view: true, create: false, edit: false, approve: true, export: true, configure: true },
  },
  'ceo': {
    'procurement': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'ap-invoices': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'payments': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'vendor-master': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'sales-invoices': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'collections': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'credit-notes': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'journals': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'financial-statements': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
    'cashflow': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'consolidation': { view: true, create: false, edit: false, approve: true, export: true, configure: false },
  },
  'auditor': {
    'procurement': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'ap-invoices': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'payments': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'vendor-master': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'sales-invoices': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'collections': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'credit-notes': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'journals': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'financial-statements': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'cashflow': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
    'consolidation': { view: true, create: false, edit: false, approve: false, export: true, configure: false },
  },
  'system-admin': {
    'procurement': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'ap-invoices': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'payments': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'vendor-master': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'sales-invoices': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'collections': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'credit-notes': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'journals': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'financial-statements': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'cashflow': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
    'consolidation': { view: true, create: true, edit: true, approve: true, export: true, configure: true },
  },
};
