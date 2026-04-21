import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ensureDomainDocument, saveDomainDocument } from '../lib/mysql/documentStore';
import type { PortalUser, PortalUserStatus } from '../types/portalUser';

export type PortalUsersDocument = { users: PortalUser[] };

function nextUserSerial(existing: PortalUser[]): string {
  let max = 0;
  for (const u of existing) {
    const m = /^USR-(\d+)$/.exec(u.userId);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `USR-${String(max + 1).padStart(3, '0')}`;
}

export type AddPortalUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  role: string;
  status?: PortalUserStatus;
};

interface PortalUsersContextValue {
  users: PortalUser[];
  hydrated: boolean;
  addUser: (input: AddPortalUserInput) => PortalUser;
  updateUser: (
    id: string,
    patch: Partial<
      Pick<PortalUser, 'firstName' | 'lastName' | 'email' | 'role' | 'status' | 'vendorId' | 'vendorCode' | 'vendorName'>
    >
  ) => void;
  suspendUser: (id: string) => void;
  activateUser: (id: string) => void;
}

const PortalUsersContext = createContext<PortalUsersContextValue | undefined>(undefined);

export function PortalUsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const fallback: PortalUsersDocument = { users: [] };
      const doc = await ensureDomainDocument<PortalUsersDocument>('portal_users', fallback);
      if (!alive) return;
      setUsers(doc.users ?? []);
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveDomainDocument('portal_users', { users });
  }, [users, hydrated]);

  const addUser = useCallback((input: AddPortalUserInput) => {
    const now = new Date().toISOString();
    let created: PortalUser | undefined;
    setUsers((prev) => {
      const userId = nextUserSerial(prev);
      created = {
        id: `pu-${Date.now()}`,
        userId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email.trim().toLowerCase(),
        vendorId: input.vendorId,
        vendorCode: input.vendorCode,
        vendorName: input.vendorName,
        role: input.role,
        status: input.status ?? 'pending',
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
      };
      return [...prev, created];
    });
    if (!created) {
      throw new Error('Failed to add portal user');
    }
    return created;
  }, []);

  const updateUser = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<PortalUser, 'firstName' | 'lastName' | 'email' | 'role' | 'status' | 'vendorId' | 'vendorCode' | 'vendorName'>
      >
    ) => {
      const now = new Date().toISOString();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                ...patch,
                email: patch.email !== undefined ? patch.email.trim().toLowerCase() : u.email,
                firstName: patch.firstName !== undefined ? patch.firstName.trim() : u.firstName,
                lastName: patch.lastName !== undefined ? patch.lastName.trim() : u.lastName,
                updatedAt: now,
              }
            : u
        )
      );
    },
    []
  );

  const suspendUser = useCallback((id: string) => {
    const now = new Date().toISOString();
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'suspended' as const, updatedAt: now } : u)));
  }, []);

  const activateUser = useCallback((id: string) => {
    const now = new Date().toISOString();
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'active' as const, updatedAt: now } : u)));
  }, []);

  const value = useMemo(
    () => ({
      users,
      hydrated,
      addUser,
      updateUser,
      suspendUser,
      activateUser,
    }),
    [users, hydrated, addUser, updateUser, suspendUser, activateUser]
  );

  return <PortalUsersContext.Provider value={value}>{children}</PortalUsersContext.Provider>;
}

export function usePortalUsers() {
  const ctx = useContext(PortalUsersContext);
  if (!ctx) {
    throw new Error('usePortalUsers must be used within PortalUsersProvider');
  }
  return ctx;
}
