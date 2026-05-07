import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getActiveEntities, type CanonicalEntity } from './EntityRegistry';
import { isMysqlApiEnabled, mysqlApiRequest } from '../lib/mysql/client';

const SESSION_TOKEN_KEY = 'procinix.session.token';
const SESSION_USER_KEY  = 'procinix.session.user';

/** Shape returned by POST /api/auth/login and GET /api/auth/me. */
interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
  tenantId: string | null;
  defaultEntityId: string | null;
  tenantName?: string | null;
  tenantCode?: string | null;
  entities?: Array<{ id: string; name: string; code: string | null; isDefault?: boolean }>;
}

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

/** Build a full User object from the API login/me response. */
function buildUserFromApi(apiUser: ApiUser): User {
  const normalized: UserRole = normalizeRole(apiUser.role ?? undefined) ?? 'Admin';

  const platformEntities = (apiUser.entities ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    code: e.code ?? e.id,
  }));

  const mustSelect = platformEntities.length > 1;
  const defaultPlatformEntity =
    apiUser.entities?.find((e) => e.isDefault) ?? apiUser.entities?.[0];
  const currentPlatformEntityId = mustSelect ? undefined : defaultPlatformEntity?.id;

  const authEntities: Entity[] =
    platformEntities.length > 0
      ? platformEntities.map((e) => ({ id: e.id, name: e.name, code: e.code }))
      : mockEntities;

  const currentEntity = authEntities[0] ?? mockEntities[0];

  return {
    id: apiUser.id,
    name: apiUser.name || apiUser.email,
    email: apiUser.email,
    role: normalized,
    availableEntities: authEntities,
    currentEntity,
    tenantId: apiUser.tenantId ?? undefined,
    tenantName: apiUser.tenantName ?? undefined,
    tenantCode: apiUser.tenantCode ?? undefined,
    platformEntities: platformEntities.length > 0 ? platformEntities : undefined,
    currentPlatformEntityId,
    mustSelectPlatformEntity: mustSelect,
  };
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
    try {
      const stored = sessionStorage.getItem(SESSION_USER_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });

  const login = async (
    email: string,
    password: string,
    _options?: { tenantCode?: string },
  ): Promise<User | null> => {
    // Non-MySQL mode: mock users
    if (!isMysqlApiEnabled()) {
      const mockUser = mockUsers[email];
      if (mockUser && mockUser.password === password) {
        const { password: _pw, ...userWithoutPassword } = mockUser;
        setUser(userWithoutPassword);
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(userWithoutPassword));
        return userWithoutPassword;
      }
      return null;
    }

    try {
      const result = await mysqlApiRequest<{ token: string; user: ApiUser }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      );
      sessionStorage.setItem(SESSION_TOKEN_KEY, result.token);
      const built = buildUserFromApi(result.user);
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(built));
      setUser(built);
      return built;
    } catch {
      return null;
    }
  };

  const confirmPlatformEntity = (entityId: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next: User = {
        ...prev,
        currentPlatformEntityId: entityId,
        mustSelectPlatformEntity: false,
      };
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    if (isMysqlApiEnabled()) {
      mysqlApiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    }
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    setUser(null);
  };

  const refreshSession = async () => {
    if (!isMysqlApiEnabled() || !user) return;

    try {
      const result = await mysqlApiRequest<{ user: ApiUser }>('/auth/me');
      const refreshed = buildUserFromApi(result.user);
      if (user.currentEntity) {
        const match = refreshed.availableEntities.find((e) => e.id === user.currentEntity.id);
        refreshed.currentEntity = match ?? refreshed.currentEntity;
      }
      setUser(refreshed);
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(refreshed));
    } catch {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_USER_KEY);
      setUser(null);
    }
  };

  useEffect(() => {
    if (!isMysqlApiEnabled() || !user) return;

    refreshSession();

    const handleFocus = () => refreshSession();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user?.id]);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

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
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(updatedUser));
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
