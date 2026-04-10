import { createContext, useContext, useState, ReactNode } from 'react';

// Permission types
export type PermissionKey = string; // e.g., "AP_INVOICE.VIEW", "AP_INVOICE.CREATE", "AP_INVOICE.APPROVE"

export interface UserRole {
  roleId: string;
  roleName: string;
  permissions: PermissionKey[];
}

export interface Company {
  id: string;
  name: string;
  code: string;
}

interface PermissionRBACContextType {
  currentRole: UserRole;
  availableRoles: UserRole[];
  currentCompany: Company;
  availableCompanies: Company[];
  switchRole: (roleId: string) => void;
  switchCompany: (companyId: string) => void;
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  hasAllPermissions: (permissions: PermissionKey[]) => boolean;
}

const PermissionRBACContext = createContext<PermissionRBACContextType | undefined>(undefined);

// Define all available permissions in the system
const ALL_PERMISSIONS = {
  // AP Automation Permissions
  AP_INVOICE: {
    VIEW: 'AP_INVOICE.VIEW',
    CREATE: 'AP_INVOICE.CREATE',
    EDIT: 'AP_INVOICE.EDIT',
    DELETE: 'AP_INVOICE.DELETE',
    APPROVE: 'AP_INVOICE.APPROVE',
    REJECT: 'AP_INVOICE.REJECT',
    POST: 'AP_INVOICE.POST',
  },
  PAYMENT_RUN: {
    VIEW: 'PAYMENT_RUN.VIEW',
    CREATE: 'PAYMENT_RUN.CREATE',
    EXECUTE: 'PAYMENT_RUN.EXECUTE',
    APPROVE: 'PAYMENT_RUN.APPROVE',
  },
  PURCHASE_ORDER: {
    VIEW: 'PURCHASE_ORDER.VIEW',
    CREATE: 'PURCHASE_ORDER.CREATE',
    EDIT: 'PURCHASE_ORDER.EDIT',
    DELETE: 'PURCHASE_ORDER.DELETE',
    APPROVE: 'PURCHASE_ORDER.APPROVE',
  },
  GRN: {
    VIEW: 'GRN.VIEW',
    CREATE: 'GRN.CREATE',
    EDIT: 'GRN.EDIT',
    APPROVE: 'GRN.APPROVE',
  },
  VENDOR: {
    VIEW: 'VENDOR.VIEW',
    CREATE: 'VENDOR.CREATE',
    EDIT: 'VENDOR.EDIT',
    DELETE: 'VENDOR.DELETE',
  },
  CASHFLOW: {
    VIEW: 'CASHFLOW.VIEW',
    FORECAST: 'CASHFLOW.FORECAST',
  },
  
  // AR Automation Permissions
  AR_INVOICE: {
    VIEW: 'AR_INVOICE.VIEW',
    CREATE: 'AR_INVOICE.CREATE',
    EDIT: 'AR_INVOICE.EDIT',
    APPROVE: 'AR_INVOICE.APPROVE',
  },
  CUSTOMER: {
    VIEW: 'CUSTOMER.VIEW',
    CREATE: 'CUSTOMER.CREATE',
    EDIT: 'CUSTOMER.EDIT',
  },
  COLLECTION: {
    VIEW: 'COLLECTION.VIEW',
    MANAGE: 'COLLECTION.MANAGE',
    APPROVE: 'COLLECTION.APPROVE',
  },
  CREDIT_MGMT: {
    VIEW: 'CREDIT_MGMT.VIEW',
    MANAGE: 'CREDIT_MGMT.MANAGE',
    APPROVE: 'CREDIT_MGMT.APPROVE',
  },
  
  // R2R Automation Permissions
  GENERAL_LEDGER: {
    VIEW: 'GENERAL_LEDGER.VIEW',
    POST: 'GENERAL_LEDGER.POST',
    REVERSE: 'GENERAL_LEDGER.REVERSE',
  },
  RECONCILIATION: {
    VIEW: 'RECONCILIATION.VIEW',
    PERFORM: 'RECONCILIATION.PERFORM',
    APPROVE: 'RECONCILIATION.APPROVE',
  },
  FINANCIAL_CLOSE: {
    VIEW: 'FINANCIAL_CLOSE.VIEW',
    EXECUTE: 'FINANCIAL_CLOSE.EXECUTE',
    APPROVE: 'FINANCIAL_CLOSE.APPROVE',
  },
  CONSOLIDATION: {
    VIEW: 'CONSOLIDATION.VIEW',
    EXECUTE: 'CONSOLIDATION.EXECUTE',
  },
  
  // Masters Permissions
  MASTERS: {
    VIEW: 'MASTERS.VIEW',
    CREATE: 'MASTERS.CREATE',
    EDIT: 'MASTERS.EDIT',
    DELETE: 'MASTERS.DELETE',
    APPROVE: 'MASTERS.APPROVE',
  },
  
  // Reports Permissions
  REPORTS: {
    VIEW: 'REPORTS.VIEW',
    EXPORT: 'REPORTS.EXPORT',
    SCHEDULE: 'REPORTS.SCHEDULE',
  },
  
  // Global Permissions
  DASHBOARD: {
    VIEW: 'DASHBOARD.VIEW',
    CUSTOMIZE: 'DASHBOARD.CUSTOMIZE',
  },
  APPROVALS: {
    VIEW: 'APPROVALS.VIEW',
    APPROVE: 'APPROVALS.APPROVE',
    REJECT: 'APPROVALS.REJECT',
  },
  TASKS: {
    VIEW: 'TASKS.VIEW',
    MANAGE: 'TASKS.MANAGE',
  },
  AUDIT_LOG: {
    VIEW: 'AUDIT_LOG.VIEW',
    EXPORT: 'AUDIT_LOG.EXPORT',
  },
  SETTINGS: {
    VIEW: 'SETTINGS.VIEW',
    EDIT: 'SETTINGS.EDIT',
  },
  AI_CAPTURE: {
    VIEW: 'AI_CAPTURE.VIEW',
    USE: 'AI_CAPTURE.USE',
  },
};

// Predefined roles with granular permissions
const userRolesData: UserRole[] = [
  {
    roleId: 'super-admin',
    roleName: 'Super Admin',
    permissions: [
      // Full access to everything
      ...Object.values(ALL_PERMISSIONS.AP_INVOICE),
      ...Object.values(ALL_PERMISSIONS.PAYMENT_RUN),
      ...Object.values(ALL_PERMISSIONS.PURCHASE_ORDER),
      ...Object.values(ALL_PERMISSIONS.GRN),
      ...Object.values(ALL_PERMISSIONS.VENDOR),
      ...Object.values(ALL_PERMISSIONS.CASHFLOW),
      ...Object.values(ALL_PERMISSIONS.AR_INVOICE),
      ...Object.values(ALL_PERMISSIONS.CUSTOMER),
      ...Object.values(ALL_PERMISSIONS.COLLECTION),
      ...Object.values(ALL_PERMISSIONS.CREDIT_MGMT),
      ...Object.values(ALL_PERMISSIONS.GENERAL_LEDGER),
      ...Object.values(ALL_PERMISSIONS.RECONCILIATION),
      ...Object.values(ALL_PERMISSIONS.FINANCIAL_CLOSE),
      ...Object.values(ALL_PERMISSIONS.CONSOLIDATION),
      ...Object.values(ALL_PERMISSIONS.MASTERS),
      ...Object.values(ALL_PERMISSIONS.REPORTS),
      ...Object.values(ALL_PERMISSIONS.DASHBOARD),
      ...Object.values(ALL_PERMISSIONS.APPROVALS),
      ...Object.values(ALL_PERMISSIONS.TASKS),
      ...Object.values(ALL_PERMISSIONS.AUDIT_LOG),
      ...Object.values(ALL_PERMISSIONS.SETTINGS),
      ...Object.values(ALL_PERMISSIONS.AI_CAPTURE),
    ]
  },
  {
    roleId: 'ap-manager',
    roleName: 'AP Manager',
    permissions: [
      // AP Full Access
      ALL_PERMISSIONS.AP_INVOICE.VIEW,
      ALL_PERMISSIONS.AP_INVOICE.CREATE,
      ALL_PERMISSIONS.AP_INVOICE.EDIT,
      ALL_PERMISSIONS.AP_INVOICE.APPROVE,
      ALL_PERMISSIONS.AP_INVOICE.POST,
      ALL_PERMISSIONS.PAYMENT_RUN.VIEW,
      ALL_PERMISSIONS.PAYMENT_RUN.CREATE,
      ALL_PERMISSIONS.PAYMENT_RUN.APPROVE,
      ALL_PERMISSIONS.PURCHASE_ORDER.VIEW,
      ALL_PERMISSIONS.PURCHASE_ORDER.CREATE,
      ALL_PERMISSIONS.PURCHASE_ORDER.EDIT,
      ALL_PERMISSIONS.PURCHASE_ORDER.APPROVE,
      ALL_PERMISSIONS.GRN.VIEW,
      ALL_PERMISSIONS.GRN.CREATE,
      ALL_PERMISSIONS.GRN.EDIT,
      ALL_PERMISSIONS.GRN.APPROVE,
      ALL_PERMISSIONS.VENDOR.VIEW,
      ALL_PERMISSIONS.CASHFLOW.VIEW,
      ALL_PERMISSIONS.CASHFLOW.FORECAST,
      ALL_PERMISSIONS.AI_CAPTURE.VIEW,
      ALL_PERMISSIONS.AI_CAPTURE.USE,
      // Masters & Reports
      ALL_PERMISSIONS.MASTERS.VIEW,
      ALL_PERMISSIONS.MASTERS.CREATE,
      ALL_PERMISSIONS.MASTERS.EDIT,
      ALL_PERMISSIONS.REPORTS.VIEW,
      ALL_PERMISSIONS.REPORTS.EXPORT,
      // Global
      ALL_PERMISSIONS.DASHBOARD.VIEW,
      ALL_PERMISSIONS.APPROVALS.VIEW,
      ALL_PERMISSIONS.APPROVALS.APPROVE,
      ALL_PERMISSIONS.TASKS.VIEW,
      ALL_PERMISSIONS.TASKS.MANAGE,
      ALL_PERMISSIONS.AUDIT_LOG.VIEW,
    ]
  },
  {
    roleId: 'ap-clerk',
    roleName: 'AP Clerk',
    permissions: [
      // AP Limited Access
      ALL_PERMISSIONS.AP_INVOICE.VIEW,
      ALL_PERMISSIONS.AP_INVOICE.CREATE,
      ALL_PERMISSIONS.AP_INVOICE.EDIT,
      ALL_PERMISSIONS.PAYMENT_RUN.VIEW,
      ALL_PERMISSIONS.PURCHASE_ORDER.VIEW,
      ALL_PERMISSIONS.GRN.VIEW,
      ALL_PERMISSIONS.GRN.CREATE,
      ALL_PERMISSIONS.VENDOR.VIEW,
      ALL_PERMISSIONS.AI_CAPTURE.VIEW,
      ALL_PERMISSIONS.AI_CAPTURE.USE,
      // Masters (View Only)
      ALL_PERMISSIONS.MASTERS.VIEW,
      // Global
      ALL_PERMISSIONS.DASHBOARD.VIEW,
      ALL_PERMISSIONS.TASKS.VIEW,
    ]
  },
  {
    roleId: 'cfo',
    roleName: 'CFO',
    permissions: [
      // View All + Approve Critical Items
      ALL_PERMISSIONS.AP_INVOICE.VIEW,
      ALL_PERMISSIONS.AP_INVOICE.APPROVE,
      ALL_PERMISSIONS.PAYMENT_RUN.VIEW,
      ALL_PERMISSIONS.PAYMENT_RUN.APPROVE,
      ALL_PERMISSIONS.PURCHASE_ORDER.VIEW,
      ALL_PERMISSIONS.PURCHASE_ORDER.APPROVE,
      ALL_PERMISSIONS.GRN.VIEW,
      ALL_PERMISSIONS.VENDOR.VIEW,
      ALL_PERMISSIONS.CASHFLOW.VIEW,
      ALL_PERMISSIONS.CASHFLOW.FORECAST,
      // AR View
      ALL_PERMISSIONS.AR_INVOICE.VIEW,
      ALL_PERMISSIONS.CUSTOMER.VIEW,
      ALL_PERMISSIONS.COLLECTION.VIEW,
      ALL_PERMISSIONS.CREDIT_MGMT.VIEW,
      ALL_PERMISSIONS.CREDIT_MGMT.APPROVE,
      // R2R View
      ALL_PERMISSIONS.GENERAL_LEDGER.VIEW,
      ALL_PERMISSIONS.RECONCILIATION.VIEW,
      ALL_PERMISSIONS.RECONCILIATION.APPROVE,
      ALL_PERMISSIONS.FINANCIAL_CLOSE.VIEW,
      ALL_PERMISSIONS.FINANCIAL_CLOSE.APPROVE,
      ALL_PERMISSIONS.CONSOLIDATION.VIEW,
      // Masters & Reports
      ALL_PERMISSIONS.MASTERS.VIEW,
      ALL_PERMISSIONS.REPORTS.VIEW,
      ALL_PERMISSIONS.REPORTS.EXPORT,
      // Global
      ALL_PERMISSIONS.DASHBOARD.VIEW,
      ALL_PERMISSIONS.DASHBOARD.CUSTOMIZE,
      ALL_PERMISSIONS.APPROVALS.VIEW,
      ALL_PERMISSIONS.APPROVALS.APPROVE,
      ALL_PERMISSIONS.AUDIT_LOG.VIEW,
      ALL_PERMISSIONS.AUDIT_LOG.EXPORT,
    ]
  },
  {
    roleId: 'ar-manager',
    roleName: 'AR Manager',
    permissions: [
      // AR Full Access
      ALL_PERMISSIONS.AR_INVOICE.VIEW,
      ALL_PERMISSIONS.AR_INVOICE.CREATE,
      ALL_PERMISSIONS.AR_INVOICE.EDIT,
      ALL_PERMISSIONS.AR_INVOICE.APPROVE,
      ALL_PERMISSIONS.CUSTOMER.VIEW,
      ALL_PERMISSIONS.CUSTOMER.CREATE,
      ALL_PERMISSIONS.CUSTOMER.EDIT,
      ALL_PERMISSIONS.COLLECTION.VIEW,
      ALL_PERMISSIONS.COLLECTION.MANAGE,
      ALL_PERMISSIONS.COLLECTION.APPROVE,
      ALL_PERMISSIONS.CREDIT_MGMT.VIEW,
      ALL_PERMISSIONS.CREDIT_MGMT.MANAGE,
      ALL_PERMISSIONS.CREDIT_MGMT.APPROVE,
      // Masters & Reports
      ALL_PERMISSIONS.MASTERS.VIEW,
      ALL_PERMISSIONS.MASTERS.EDIT,
      ALL_PERMISSIONS.REPORTS.VIEW,
      ALL_PERMISSIONS.REPORTS.EXPORT,
      // Global
      ALL_PERMISSIONS.DASHBOARD.VIEW,
      ALL_PERMISSIONS.APPROVALS.VIEW,
      ALL_PERMISSIONS.APPROVALS.APPROVE,
      ALL_PERMISSIONS.TASKS.VIEW,
      ALL_PERMISSIONS.TASKS.MANAGE,
      ALL_PERMISSIONS.AUDIT_LOG.VIEW,
    ]
  },
  {
    roleId: 'finance-controller',
    roleName: 'Finance Controller',
    permissions: [
      // AP View
      ALL_PERMISSIONS.AP_INVOICE.VIEW,
      ALL_PERMISSIONS.PAYMENT_RUN.VIEW,
      ALL_PERMISSIONS.PURCHASE_ORDER.VIEW,
      ALL_PERMISSIONS.GRN.VIEW,
      ALL_PERMISSIONS.VENDOR.VIEW,
      ALL_PERMISSIONS.CASHFLOW.VIEW,
      // AR View
      ALL_PERMISSIONS.AR_INVOICE.VIEW,
      ALL_PERMISSIONS.CUSTOMER.VIEW,
      ALL_PERMISSIONS.COLLECTION.VIEW,
      ALL_PERMISSIONS.CREDIT_MGMT.VIEW,
      // R2R Full Access
      ALL_PERMISSIONS.GENERAL_LEDGER.VIEW,
      ALL_PERMISSIONS.GENERAL_LEDGER.POST,
      ALL_PERMISSIONS.GENERAL_LEDGER.REVERSE,
      ALL_PERMISSIONS.RECONCILIATION.VIEW,
      ALL_PERMISSIONS.RECONCILIATION.PERFORM,
      ALL_PERMISSIONS.RECONCILIATION.APPROVE,
      ALL_PERMISSIONS.FINANCIAL_CLOSE.VIEW,
      ALL_PERMISSIONS.FINANCIAL_CLOSE.EXECUTE,
      ALL_PERMISSIONS.CONSOLIDATION.VIEW,
      ALL_PERMISSIONS.CONSOLIDATION.EXECUTE,
      // Masters & Reports
      ALL_PERMISSIONS.MASTERS.VIEW,
      ALL_PERMISSIONS.MASTERS.EDIT,
      ALL_PERMISSIONS.REPORTS.VIEW,
      ALL_PERMISSIONS.REPORTS.EXPORT,
      // Global
      ALL_PERMISSIONS.DASHBOARD.VIEW,
      ALL_PERMISSIONS.APPROVALS.VIEW,
      ALL_PERMISSIONS.APPROVALS.APPROVE,
      ALL_PERMISSIONS.AUDIT_LOG.VIEW,
    ]
  },
  {
    roleId: 'accounts-payable-approver',
    roleName: 'AP Approver',
    permissions: [
      // AP Approval Focus
      ALL_PERMISSIONS.AP_INVOICE.VIEW,
      ALL_PERMISSIONS.AP_INVOICE.APPROVE,
      ALL_PERMISSIONS.AP_INVOICE.REJECT,
      ALL_PERMISSIONS.PAYMENT_RUN.VIEW,
      ALL_PERMISSIONS.PAYMENT_RUN.APPROVE,
      ALL_PERMISSIONS.PURCHASE_ORDER.VIEW,
      ALL_PERMISSIONS.PURCHASE_ORDER.APPROVE,
      ALL_PERMISSIONS.GRN.VIEW,
      ALL_PERMISSIONS.GRN.APPROVE,
      // View Only
      ALL_PERMISSIONS.VENDOR.VIEW,
      ALL_PERMISSIONS.MASTERS.VIEW,
      ALL_PERMISSIONS.REPORTS.VIEW,
      // Global
      ALL_PERMISSIONS.DASHBOARD.VIEW,
      ALL_PERMISSIONS.APPROVALS.VIEW,
      ALL_PERMISSIONS.APPROVALS.APPROVE,
      ALL_PERMISSIONS.TASKS.VIEW,
    ]
  }
];

const companiesData: Company[] = [
  { id: 'comp-1', name: 'Acme Manufacturing Inc.', code: 'AMI' },
  { id: 'comp-2', name: 'Global Textiles Ltd.', code: 'GTL' },
  { id: 'comp-3', name: 'TechCorp Industries', code: 'TCI' },
  { id: 'comp-4', name: 'Premium Fabrics Co.', code: 'PFC' },
];

export function PermissionRBACProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>(userRolesData[0]);
  const [currentCompany, setCurrentCompany] = useState<Company>(companiesData[0]);

  const switchRole = (roleId: string) => {
    const role = userRolesData.find(r => r.roleId === roleId);
    if (role) {
      setCurrentRole(role);
    }
  };

  const switchCompany = (companyId: string) => {
    const company = companiesData.find(c => c.id === companyId);
    if (company) {
      setCurrentCompany(company);
    }
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    return currentRole.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: PermissionKey[]): boolean => {
    return permissions.some(perm => currentRole.permissions.includes(perm));
  };

  const hasAllPermissions = (permissions: PermissionKey[]): boolean => {
    return permissions.every(perm => currentRole.permissions.includes(perm));
  };

  return (
    <PermissionRBACContext.Provider
      value={{
        currentRole,
        availableRoles: userRolesData,
        currentCompany,
        availableCompanies: companiesData,
        switchRole,
        switchCompany,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
      }}
    >
      {children}
    </PermissionRBACContext.Provider>
  );
}

export function usePermissionRBAC() {
  const context = useContext(PermissionRBACContext);
  if (context === undefined) {
    throw new Error('usePermissionRBAC must be used within a PermissionRBACProvider');
  }
  return context;
}

export { ALL_PERMISSIONS };
