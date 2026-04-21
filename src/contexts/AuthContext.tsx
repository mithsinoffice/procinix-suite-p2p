import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getActiveEntities, resolveEntity, type CanonicalEntity } from './EntityRegistry';
import { isMysqlApiEnabled, mysqlApiRequest } from '../lib/mysql/client';

export type UserRole =
  | 'Super Admin'
  | 'Admin'
  | 'PO Creator'
  | 'PO Approver'
  | 'GRN Manager'
  | 'Location Manager';

export interface Entity {
  id: string;
  name: string;
  code: string;
  logo?: string;
}

export interface User {
  id: string;
  employeeId?: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: UserRole[]; // Support multiple roles
  location?: string; // For Location Managers
  department?: string;
  avatar?: string;
  availableEntities: Entity[];
  currentEntity: Entity;
  /** Platform tenant (MySQL `tenants` / `user_master.tenant_id`). */
  tenantId?: string;
  tenantName?: string;
  tenantCode?: string;
  /** Platform entities from `entities` + `user_entity_access`. */
  platformEntities?: { id: string; name: string; code: string }[];
  currentPlatformEntityId?: string;
  /** When true, user must confirm entity on full-screen gate after login. */
  mustSelectPlatformEntity?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string,
    options?: { tenantCode?: string },
  ) => Promise<User | null>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isAuthenticated: boolean;
  switchEntity: (entityId: string) => void;
  confirmPlatformEntity: (entityId: string) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// ENTITY REGISTRY INTEGRATION - CANONICAL ENTITIES
// ============================================================================

// Convert canonical entities to Auth entity format
function toAuthEntity(canonical: CanonicalEntity): Entity {
  return {
    id: canonical.id,
    name: canonical.name,
    code: canonical.code,
    logo: canonical.logo
  };
}

// Get active entities from canonical registry
const mockEntities: Entity[] = getActiveEntities().map(toAuthEntity);

// Legacy entities kept for backward compatibility (hidden from switcher)
// These exist only to prevent breaking old dataset references
const legacyEntitiesHidden: Entity[] = [
  { id: 'E003', name: 'Procinix Retail India', code: 'PRI' }
];

interface MasterEmployeeRecord {
  id: string;
  empCode?: string;
  empName?: string;
  email?: string;
  phone?: string;
  department?: string;
  status?: string;
  approvalStatus?: string;
}

interface MasterUserRoleAssignment {
  roleId?: string;
  entityId?: string;
  roleName?: string;
  roleCode?: string;
  status?: string;
  validFrom?: string;
  validTo?: string;
}

interface MasterUserEntityAccess {
  entityId?: string;
  isDefault?: boolean;
  status?: string;
}

interface MasterUserRecord {
  id: string;
  employeeId?: string;
  userCode?: string;
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  role?: string;
  roles?: string[] | string;
  status?: string;
  approvalStatus?: string;
  password?: string;
  loginPassword?: string;
  tempPassword?: string;
  location?: string;
  locked?: boolean;
  accessExpiryDate?: string;
  access_expiry_date?: string;
  defaultEntityId?: string;
  default_entity_id?: string;
  userRoles?: MasterUserRoleAssignment[];
  user_roles?: MasterUserRoleAssignment[];
  userEntityAccess?: MasterUserEntityAccess[];
  user_entity_access?: MasterUserEntityAccess[];
}

interface MasterRoleRecord {
  id: string;
  roleCode?: string;
  roleName?: string;
  description?: string;
  permissions?: string[] | string;
  status?: string;
  approvalStatus?: string;
}

// Mock users for demonstration
const mockUsers: Record<string, User & { password: string }> = {
  'rajesh.kumar@procinix.ai': {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@procinix.ai',
    password: 'admin123',
    role: 'Admin',
    department: 'IT',
    avatar: '',
    availableEntities: mockEntities,
    currentEntity: mockEntities[0]
  },
  'priya.sharma@procinix.ai': {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya.sharma@procinix.ai',
    password: 'creator123',
    role: 'PO Creator',
    department: 'Procurement',
    avatar: '',
    availableEntities: mockEntities,
    currentEntity: mockEntities[0]
  },
  'amit.patel@procinix.ai': {
    id: '3',
    name: 'Amit Patel',
    email: 'amit.patel@procinix.ai',
    password: 'approver123',
    role: 'PO Approver',
    department: 'Finance',
    avatar: '',
    availableEntities: mockEntities,
    currentEntity: mockEntities[0]
  },
  'sunita.reddy@procinix.ai': {
    id: '4',
    name: 'Sunita Reddy',
    email: 'sunita.reddy@procinix.ai',
    password: 'grn123',
    role: 'GRN Manager',
    department: 'Warehouse',
    avatar: '',
    availableEntities: mockEntities,
    currentEntity: mockEntities[0]
  },
  'vikram.shah@procinix.ai': {
    id: '5',
    name: 'Vikram Shah',
    email: 'vikram.shah@procinix.ai',
    password: 'mumbai123',
    role: 'Location Manager',
    location: 'Mumbai Warehouse',
    department: 'Operations',
    avatar: '',
    availableEntities: mockEntities,
    currentEntity: mockEntities[0]
  },
  'anjali.iyer@procinix.ai': {
    id: '6',
    name: 'Anjali Iyer',
    email: 'anjali.iyer@procinix.ai',
    password: 'bangalore123',
    role: 'Location Manager',
    location: 'Bangalore Store',
    department: 'Operations',
    avatar: '',
    availableEntities: mockEntities,
    currentEntity: mockEntities[0]
  },
  'rahul.desai@procinix.ai': {
    id: '7',
    name: 'Rahul Desai',
    email: 'rahul.desai@procinix.ai',
    password: 'pune123',
    role: 'Location Manager',
    location: 'Pune Store',
    department: 'Operations',
    avatar: '',
    availableEntities: mockEntities,
    currentEntity: mockEntities[0]
  },
  'karthik.menon@procinix.ai': {
    id: '8',
    name: 'Karthik Menon',
    email: 'karthik.menon@procinix.ai',
    password: 'multi123',
    role: 'PO Creator',
    roles: ['PO Creator', 'PO Approver', 'GRN Manager'],
    department: 'Procurement & Finance',
    avatar: '',
    availableEntities: mockEntities,
    currentEntity: mockEntities[0]
  }
};

const allowedRoles: UserRole[] = [
  'Super Admin',
  'Admin',
  'PO Creator',
  'PO Approver',
  'GRN Manager',
  'Location Manager',
];

const roleAliases: Record<string, UserRole> = {
  'super admin': 'Super Admin',
  super_admin: 'Super Admin',
  admin: 'Admin',
  administrator: 'Admin',
  'system administrator': 'Admin',
  po_creator: 'PO Creator',
  'po creator': 'PO Creator',
  po_approver: 'PO Approver',
  'po approver': 'PO Approver',
  grn_mgr: 'GRN Manager',
  'grn manager': 'GRN Manager',
  loc_mgr: 'Location Manager',
  'location manager': 'Location Manager',
};

function normalizeRole(value?: string): UserRole | null {
  if (!value) {
    return null;
  }

  const exact = allowedRoles.find((role) => role.toLowerCase() === value.toLowerCase());
  if (exact) {
    return exact;
  }

  return roleAliases[value.trim().toLowerCase()] ?? null;
}

function parseRoles(value?: string[] | string, fallback?: string): UserRole[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',').map((part) => part.trim()).filter(Boolean)
      : fallback
        ? [fallback]
        : [];

  return rawValues
    .map((entry) => normalizeRole(entry))
    .filter((entry): entry is UserRole => entry !== null);
}

function isActiveMasterStatus(status?: string) {
  if (!status) {
    return true;
  }

  return status.toLowerCase() !== 'inactive';
}

function isApprovedMasterStatus(status?: string) {
  if (!status) {
    return true;
  }

  return !['rejected'].includes(status.toLowerCase());
}

function resolvePassword(record: MasterUserRecord) {
  return record.password ?? record.loginPassword ?? record.tempPassword ?? '';
}

function resolveRoleRecord(record: MasterRoleRecord): UserRole | null {
  return normalizeRole(record.roleName) ?? normalizeRole(record.roleCode);
}

function isRoleAssignmentActiveToday(entry: MasterUserRoleAssignment): boolean {
  if (entry.status === 'Inactive') {
    return false;
  }
  const today = new Date().toISOString().split('T')[0];
  if (entry.validFrom && entry.validFrom > today) {
    return false;
  }
  if (entry.validTo && entry.validTo < today) {
    return false;
  }
  return true;
}

function getRolesFromEntityScopedAssignments(userRecord: MasterUserRecord): string[] {
  const rows = userRecord.userRoles ?? userRecord.user_roles;
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }
  const keys: string[] = [];
  for (const entry of rows) {
    if (!isRoleAssignmentActiveToday(entry)) {
      continue;
    }
    const name = entry.roleName?.trim();
    const code = entry.roleCode?.trim();
    if (name) {
      keys.push(name);
    } else if (code) {
      keys.push(code);
    }
  }
  return keys;
}

function getUserAssignedRoles(userRecord: MasterUserRecord): string[] {
  const fromChild = getRolesFromEntityScopedAssignments(userRecord);
  if (fromChild.length > 0) {
    return fromChild;
  }

  const entries = Array.isArray(userRecord.roles)
    ? userRecord.roles
    : typeof userRecord.roles === 'string'
      ? userRecord.roles.split(',').map((part) => part.trim()).filter(Boolean)
      : userRecord.role
        ? [userRecord.role]
        : [];

  return entries.filter(Boolean);
}

function resolveAuthEntityList(userRecord: MasterUserRecord): Entity[] {
  const access = userRecord.userEntityAccess ?? userRecord.user_entity_access;
  if (!Array.isArray(access) || access.length === 0) {
    return mockEntities;
  }

  const canonical = getActiveEntities().map(toAuthEntity);
  const byId = new Map(canonical.map((entity) => [entity.id, entity]));
  for (const entity of legacyEntitiesHidden) {
    byId.set(entity.id, entity);
  }

  const activeRows = access.filter((row) => row.status !== 'Inactive' && row.entityId?.trim());
  if (activeRows.length === 0) {
    return mockEntities;
  }

  const resolved: Entity[] = [];
  for (const row of activeRows) {
    const id = row.entityId!.trim();
    const found = byId.get(id);
    if (found) {
      resolved.push(found);
    } else {
      resolved.push({ id, name: id, code: id });
    }
  }

  return resolved.length > 0 ? resolved : mockEntities;
}

function resolveCurrentEntity(userRecord: MasterUserRecord, available: Entity[]): Entity {
  const defaultId = userRecord.defaultEntityId ?? userRecord.default_entity_id;
  if (defaultId) {
    const match = available.find((entity) => entity.id === defaultId);
    if (match) {
      return match;
    }
  }

  const access = userRecord.userEntityAccess ?? userRecord.user_entity_access;
  if (Array.isArray(access)) {
    const defaultRow = access.find((row) => row.isDefault && row.entityId?.trim() && row.status !== 'Inactive');
    if (defaultRow?.entityId) {
      const match = available.find((entity) => entity.id === defaultRow.entityId);
      if (match) {
        return match;
      }
    }
  }

  return available[0] ?? mockEntities[0];
}

function mapMasterUserToAuthUser(
  userRecord: MasterUserRecord,
  matchedRoleRecords: MasterRoleRecord[],
  employeeRecord?: MasterEmployeeRecord | null,
): User | null {
  const roles = matchedRoleRecords
    .map((record) => resolveRoleRecord(record))
    .filter((role): role is UserRole => role !== null);
  const primaryRole = roles[0];
  if (!primaryRole) {
    return null;
  }

  const availableEntities = resolveAuthEntityList(userRecord);
  const currentEntity = resolveCurrentEntity(userRecord, availableEntities);

  return {
    id: String(userRecord.id),
    employeeId: userRecord.employeeId,
    name: employeeRecord?.empName ?? userRecord.name ?? 'User',
    email: employeeRecord?.email ?? userRecord.email ?? '',
    role: primaryRole,
    roles: roles.length > 1 ? roles : undefined,
    location: userRecord.location,
    department: employeeRecord?.department ?? userRecord.department ?? undefined,
    avatar: '',
    availableEntities,
    currentEntity,
  };
}

async function resolveAuthUserFromMasters(identity: { email?: string; employeeId?: string }): Promise<User | null> {
  const [userResponse, employeeResponse, roleResponse] = await Promise.all([
    mysqlApiRequest<{ success: boolean; data: MasterUserRecord[] }>('/masters/user_master'),
    mysqlApiRequest<{ success: boolean; data: MasterEmployeeRecord[] }>('/masters/employee_master'),
    mysqlApiRequest<{ success: boolean; data: MasterRoleRecord[] }>('/masters/roles_master'),
  ]);

  const normalizedEmail = identity.email?.trim().toLowerCase();
  const normalizedEmployeeId = identity.employeeId?.trim().toLowerCase();
  const userRecord = userResponse.data.find((record) => {
    const recordEmail = record.email?.trim().toLowerCase();
    const recordEmployeeId = record.employeeId?.trim().toLowerCase();
    return (
      (Boolean(normalizedEmployeeId) && recordEmployeeId === normalizedEmployeeId ||
        Boolean(normalizedEmail) && recordEmail === normalizedEmail) &&
      isActiveMasterStatus(record.status) &&
      isApprovedMasterStatus(record.approvalStatus)
    );
  });

  if (!userRecord) {
    return null;
  }

  if (userRecord.locked === true) {
    return null;
  }

  const expiryRaw = userRecord.accessExpiryDate ?? userRecord.access_expiry_date;
  if (typeof expiryRaw === 'string' && expiryRaw.trim()) {
    const expiry = expiryRaw.trim().slice(0, 10);
    const today = new Date().toISOString().split('T')[0];
    if (expiry < today) {
      return null;
    }
  }

  const approvedRoles = roleResponse.data.filter((record) => (
    isActiveMasterStatus(record.status) &&
    isApprovedMasterStatus(record.approvalStatus)
  ));

  const assignedRoleKeys = getUserAssignedRoles(userRecord);
  const childRows = userRecord.userRoles ?? userRecord.user_roles;
  const useChildMatch = Array.isArray(childRows) && childRows.length > 0;

  if (assignedRoleKeys.length === 0 && !useChildMatch) {
    return null;
  }

  const matchedRoles = approvedRoles.filter((record) => {
    const normalizedRecordRole = resolveRoleRecord(record);
    if (useChildMatch) {
      return (childRows as MasterUserRoleAssignment[]).some((assignment) => {
        if (!isRoleAssignmentActiveToday(assignment)) {
          return false;
        }
        const idMatch =
          Boolean(assignment.roleId) && assignment.roleId === record.id;
        const nameMatch =
          Boolean(assignment.roleName) &&
          record.roleName?.trim().toLowerCase() === assignment.roleName!.trim().toLowerCase();
        const codeMatch =
          Boolean(assignment.roleCode) &&
          record.roleCode?.trim().toLowerCase() === assignment.roleCode!.trim().toLowerCase();
        return idMatch || nameMatch || codeMatch;
      });
    }
    return assignedRoleKeys.some((assignedRole) => {
      const normalizedAssignedRole = normalizeRole(assignedRole);
      return (
        record.roleName?.trim().toLowerCase() === assignedRole.trim().toLowerCase() ||
        record.roleCode?.trim().toLowerCase() === assignedRole.trim().toLowerCase() ||
        (normalizedAssignedRole !== null && normalizedRecordRole === normalizedAssignedRole)
      );
    });
  });

  if (matchedRoles.length === 0) {
    return null;
  }

  const employeeRecord = employeeResponse.data.find((record) => {
    const matchesEmployeeId =
      Boolean(userRecord.employeeId) &&
      record.empCode?.trim().toLowerCase() === userRecord.employeeId?.trim().toLowerCase();
    const matchesEmail =
      Boolean(userRecord.email) &&
      record.email?.trim().toLowerCase() === userRecord.email?.trim().toLowerCase();

    return (
      (matchesEmployeeId || matchesEmail) &&
      isActiveMasterStatus(record.status) &&
      isApprovedMasterStatus(record.approvalStatus)
    );
  });

  if (!employeeRecord) {
    return null;
  }

  return mapMasterUserToAuthUser(userRecord, matchedRoles, employeeRecord);
}

interface PlatformContextResponse {
  ok: boolean;
  tenantId?: string;
  tenantName?: string;
  tenantCode?: string;
  entities?: Array<{ id: string; name: string; code?: string | null; isDefault?: boolean }>;
  defaultPlatformEntityId?: string | null;
  error?: string;
}

function mergePlatformIntoUser(user: User, ctx: PlatformContextResponse): User {
  if (!ctx.ok || !ctx.tenantId) {
    return user;
  }
  const entities = ctx.entities ?? [];
  const platformEntities = entities.map((e) => ({
    id: e.id,
    name: e.name,
    code: (e.code || e.id) as string,
  }));
  const mustSelect = entities.length > 1;
  const defaultRow =
    entities.find((e) => e.isDefault) || entities.find((e) => e.id === ctx.defaultPlatformEntityId) || entities[0];
  const fromUserDefault =
    ctx.defaultPlatformEntityId && entities.some((e) => e.id === ctx.defaultPlatformEntityId)
      ? ctx.defaultPlatformEntityId
      : defaultRow?.id;
  const currentPlatformEntityId = mustSelect ? undefined : fromUserDefault;
  return {
    ...user,
    tenantId: ctx.tenantId,
    tenantName: ctx.tenantName,
    tenantCode: ctx.tenantCode,
    platformEntities,
    currentPlatformEntityId,
    mustSelectPlatformEntity: mustSelect,
  };
}

async function loginFromMasters(email: string, password: string): Promise<User | null> {
  const resolvedUser = await resolveAuthUserFromMasters({ email });
  if (!resolvedUser) {
    return null;
  }

  const userResponse = await mysqlApiRequest<{ success: boolean; data: MasterUserRecord[] }>('/masters/user_master');
  const userRecord = userResponse.data.find((record) => (
    record.employeeId?.trim().toLowerCase() === resolvedUser.employeeId?.trim().toLowerCase() ||
    record.email?.trim().toLowerCase() === email.trim().toLowerCase()
  ));

  if (!userRecord || resolvePassword(userRecord) !== password) {
    return null;
  }

  return resolvedUser;
}

// Role-based permissions mapping
const adminPermissionList = [
    'view_dashboard',
    'create_po',
    'view_po',
    'edit_po',
    'delete_po',
    'approve_po',
    'reject_po',
    'create_grn',
    'view_grn',
    'allocate_grn',
    'accept_allocation',
    'view_vendors',
    'create_vendor',
    'edit_vendor',
    'delete_vendor',
    'view_reports',
    'manage_users',
    'view_masters',
    'edit_masters',
    'approve_masters',
    'view_settings',
];

const rolePermissions: Record<UserRole, string[]> = {
  'Super Admin': [...adminPermissionList, 'manage_tenants', 'manage_platform_entities'],
  'Admin': adminPermissionList,
  'PO Creator': [
    'view_dashboard',
    'create_po',
    'view_po',
    'edit_po',
    'view_vendors',
    'view_masters',
    'view_reports'
  ],
  'PO Approver': [
    'view_dashboard',
    'view_po',
    'approve_po',
    'reject_po',
    'view_vendors',
    'view_masters',
    'view_reports'
  ],
  'GRN Manager': [
    'view_dashboard',
    'view_po',
    'create_grn',
    'view_grn',
    'allocate_grn',
    'view_vendors',
    'view_masters',
    'view_reports'
  ],
  'Location Manager': [
    'view_dashboard',
    'view_grn',
    'accept_allocation',
    'view_reports'
  ]
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const login = async (
    email: string,
    password: string,
    options?: { tenantCode?: string },
  ): Promise<User | null> => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (isMysqlApiEnabled()) {
      try {
        const masterUser = await loginFromMasters(email, password);
        if (!masterUser) {
          return null;
        }
        let merged: User = masterUser;
        try {
          const ctx = await mysqlApiRequest<PlatformContextResponse>('/auth/platform-context', {
            method: 'POST',
            body: JSON.stringify({
              email,
              password,
              tenantCode: options?.tenantCode?.trim() || undefined,
            }),
          });
          if (ctx.ok) {
            merged = mergePlatformIntoUser(masterUser, ctx);
          }
        } catch (err) {
          console.warn('platform-context failed', err);
        }
        setUser(merged);
        localStorage.setItem('user', JSON.stringify(merged));
        return merged;
      } catch (error) {
        console.warn('Master-backed login failed while MySQL mode is enabled', error);
        return null;
      }
    }

    const mockUser = mockUsers[email];

    if (mockUser && mockUser.password === password) {
      const { password: _, ...userWithoutPassword } = mockUser;
      setUser(userWithoutPassword);
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      return userWithoutPassword;
    }

    return null;
  };

  const confirmPlatformEntity = (entityId: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next: User = {
        ...prev,
        currentPlatformEntityId: entityId,
        mustSelectPlatformEntity: false,
      };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const refreshSession = async () => {
    if (!isMysqlApiEnabled() || !user) {
      return;
    }

    try {
      const refreshedUser = await resolveAuthUserFromMasters({
        email: user.email,
        employeeId: user.employeeId,
      });

      if (!refreshedUser) {
        return;
      }

      if (user.currentEntity) {
        const matchingEntity = refreshedUser.availableEntities.find((entity) => entity.id === user.currentEntity.id);
        refreshedUser.currentEntity = matchingEntity ?? refreshedUser.currentEntity;
      }

      setUser(refreshedUser);
      localStorage.setItem('user', JSON.stringify(refreshedUser));
    } catch (error) {
      console.warn('Failed to refresh current user session from masters', error);
    }
  };

  useEffect(() => {
    if (!isMysqlApiEnabled() || !user) {
      return;
    }

    refreshSession();

    const handleFocus = () => {
      refreshSession();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user?.email, user?.employeeId]);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Check permissions for all roles if user has multiple roles
    if (user.roles && user.roles.length > 0) {
      return user.roles.some(role => rolePermissions[role]?.includes(permission));
    }
    
    return rolePermissions[user.role]?.includes(permission) || false;
  };

  const switchEntity = (entityId: string) => {
    if (user) {
      const newEntity = user.availableEntities.find(e => e.id === entityId);
      if (newEntity) {
        const updatedUser = { ...user, currentEntity: newEntity };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        hasPermission,
        isAuthenticated: !!user,
        switchEntity,
        confirmPlatformEntity,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
