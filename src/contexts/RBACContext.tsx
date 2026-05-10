import { createContext, useContext, useState, ReactNode } from 'react';

export type Permission = 'view' | 'edit' | 'approve' | 'none';

export interface ModulePermission {
  modulePath: string;
  permission: Permission;
}

export interface RolePermissions {
  roleName: string;
  roleId: string;
  pillars: {
    ap: boolean;
    ar: boolean;
    r2r: boolean;
  };
  modules: ModulePermission[];
}

export interface Company {
  id: string;
  name: string;
  code: string;
}

interface RBACContextType {
  currentRole: RolePermissions;
  availableRoles: RolePermissions[];
  currentCompany: Company;
  availableCompanies: Company[];
  switchRole: (roleId: string) => void;
  switchCompany: (companyId: string) => void;
  hasAccess: (modulePath: string) => Permission;
  hasPillarAccess: (pillar: 'ap' | 'ar' | 'r2r') => boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

// Predefined roles with permissions
const rolePermissionsData: RolePermissions[] = [
  {
    roleName: 'Super Admin',
    roleId: 'super-admin',
    pillars: { ap: true, ar: true, r2r: true },
    modules: [
      { modulePath: '/dashboard', permission: 'edit' },
      { modulePath: '/purchase-orders', permission: 'edit' },
      { modulePath: '/goods-receipt', permission: 'edit' },
      { modulePath: '/invoices', permission: 'edit' },
      { modulePath: '/vendors', permission: 'edit' },
      { modulePath: '/ar/', permission: 'edit' },
      { modulePath: '/r2r/', permission: 'edit' },
      { modulePath: '/masters/', permission: 'edit' },
      { modulePath: '/reports/', permission: 'edit' },
      { modulePath: '/approvals', permission: 'approve' },
      { modulePath: '/tasks', permission: 'edit' },
      { modulePath: '/audit-log', permission: 'view' },
      { modulePath: '/settings', permission: 'edit' },
    ],
  },
  {
    roleName: 'AP Manager',
    roleId: 'ap-manager',
    pillars: { ap: true, ar: false, r2r: false },
    modules: [
      { modulePath: '/dashboard', permission: 'view' },
      { modulePath: '/purchase-orders', permission: 'edit' },
      { modulePath: '/goods-receipt', permission: 'edit' },
      { modulePath: '/invoices', permission: 'edit' },
      { modulePath: '/vendors', permission: 'view' },
      { modulePath: '/masters/category-master', permission: 'view' },
      { modulePath: '/masters/item-master', permission: 'view' },
      { modulePath: '/reports/procurement-head-desk', permission: 'view' },
      { modulePath: '/approvals', permission: 'approve' },
      { modulePath: '/tasks', permission: 'edit' },
      { modulePath: '/audit-log', permission: 'view' },
    ],
  },
  {
    roleName: 'AP Clerk',
    roleId: 'ap-clerk',
    pillars: { ap: true, ar: false, r2r: false },
    modules: [
      { modulePath: '/dashboard', permission: 'view' },
      { modulePath: '/purchase-orders', permission: 'view' },
      { modulePath: '/goods-receipt', permission: 'edit' },
      { modulePath: '/invoices', permission: 'edit' },
      { modulePath: '/vendors', permission: 'view' },
      { modulePath: '/masters/category-master', permission: 'view' },
      { modulePath: '/tasks', permission: 'view' },
    ],
  },
  {
    roleName: 'CFO',
    roleId: 'cfo',
    pillars: { ap: true, ar: true, r2r: true },
    modules: [
      { modulePath: '/dashboard', permission: 'view' },
      { modulePath: '/purchase-orders', permission: 'view' },
      { modulePath: '/goods-receipt', permission: 'view' },
      { modulePath: '/invoices', permission: 'view' },
      { modulePath: '/vendors', permission: 'view' },
      { modulePath: '/ar/', permission: 'view' },
      { modulePath: '/r2r/', permission: 'view' },
      { modulePath: '/reports/', permission: 'view' },
      { modulePath: '/approvals', permission: 'approve' },
      { modulePath: '/audit-log', permission: 'view' },
    ],
  },
  {
    roleName: 'AR Manager',
    roleId: 'ar-manager',
    pillars: { ap: false, ar: true, r2r: false },
    modules: [
      { modulePath: '/dashboard', permission: 'view' },
      { modulePath: '/ar/', permission: 'edit' },
      { modulePath: '/ar/masters/', permission: 'view' },
      { modulePath: '/ar/reports/', permission: 'view' },
      { modulePath: '/approvals', permission: 'approve' },
      { modulePath: '/tasks', permission: 'edit' },
      { modulePath: '/audit-log', permission: 'view' },
    ],
  },
  {
    roleName: 'Finance Controller',
    roleId: 'finance-controller',
    pillars: { ap: true, ar: true, r2r: true },
    modules: [
      { modulePath: '/dashboard', permission: 'view' },
      { modulePath: '/purchase-orders', permission: 'view' },
      { modulePath: '/invoices', permission: 'view' },
      { modulePath: '/ar/', permission: 'view' },
      { modulePath: '/r2r/', permission: 'edit' },
      { modulePath: '/reports/', permission: 'view' },
      { modulePath: '/approvals', permission: 'approve' },
      { modulePath: '/audit-log', permission: 'view' },
    ],
  },
];

const companiesData: Company[] = [
  { id: 'comp-1', name: 'Acme Manufacturing Inc.', code: 'AMI' },
  { id: 'comp-2', name: 'Global Textiles Ltd.', code: 'GTL' },
  { id: 'comp-3', name: 'TechCorp Industries', code: 'TCI' },
  { id: 'comp-4', name: 'Premium Fabrics Co.', code: 'PFC' },
];

export function RBACProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<RolePermissions>(rolePermissionsData[0]);
  const [currentCompany, setCurrentCompany] = useState<Company>(companiesData[0]);

  const switchRole = (roleId: string) => {
    const role = rolePermissionsData.find((r) => r.roleId === roleId);
    if (role) {
      setCurrentRole(role);
    }
  };

  const switchCompany = (companyId: string) => {
    const company = companiesData.find((c) => c.id === companyId);
    if (company) {
      setCurrentCompany(company);
    }
  };

  const hasAccess = (modulePath: string): Permission => {
    // Check exact match first
    const exactMatch = currentRole.modules.find((m) => m.modulePath === modulePath);
    if (exactMatch) return exactMatch.permission;

    // Check if any parent path matches
    const parentMatch = currentRole.modules.find(
      (m) => modulePath.startsWith(m.modulePath) && m.modulePath !== modulePath
    );
    if (parentMatch) return parentMatch.permission;

    return 'none';
  };

  const hasPillarAccess = (pillar: 'ap' | 'ar' | 'r2r'): boolean => {
    return currentRole.pillars[pillar];
  };

  return (
    <RBACContext.Provider
      value={{
        currentRole,
        availableRoles: rolePermissionsData,
        currentCompany,
        availableCompanies: companiesData,
        switchRole,
        switchCompany,
        hasAccess,
        hasPillarAccess,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
}
