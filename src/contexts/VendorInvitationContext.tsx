import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ensureDomainDocument, saveDomainDocument } from '../lib/supabase/documentStore';
import { useMasterData } from './MasterDataContext';
import type { VendorMaster } from './MasterDataContext';
import type {
  VendorInvitation,
  VendorInviteBasics,
  VendorInvitationStatus,
  VendorSubmissionPayload,
} from '../types/vendorInvitation';

/** Legacy localStorage key (pre–MySQL document sync); migrated into `vendor_invitations` domain */
const LEGACY_STORAGE_KEY = 'procinix-subko:vendor-invitations';

export type VendorInvitationsDocument = { invitations: VendorInvitation[] };

function migrateLegacyInvitations(): VendorInvitation[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VendorInvitation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function newToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `vi_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  return `vi_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function nextVendorCode(existingCodes: Set<string>): string {
  let n = 9000;
  let code = `V-INV-${n}`;
  while (existingCodes.has(code)) {
    n += 1;
    code = `V-INV-${n}`;
  }
  return code;
}

interface VendorInvitationContextValue {
  invitations: VendorInvitation[];
  createInvitation: (basic: VendorInviteBasics, invitedByName?: string) => VendorInvitation;
  extendInvitationExpiry: (id: string) => void;
  getById: (id: string) => VendorInvitation | undefined;
  getByToken: (token: string) => VendorInvitation | undefined;
  updateStatus: (id: string, status: VendorInvitationStatus, patch?: Partial<VendorInvitation>) => void;
  markVendorOpened: (token: string) => void;
  saveVendorSubmission: (token: string, submission: VendorSubmissionPayload) => void;
  setInternalNotes: (id: string, notes: string) => void;
  submitForInternalApproval: (id: string) => void;
  requestChanges: (id: string, message: string) => void;
  rejectInvitation: (id: string, reason: string) => void;
  approveAndCreateVendorMaster: (id: string) => { ok: true; code: string } | { ok: false; error: string };
  buildInvitationUrl: (token: string) => string;
}

const VendorInvitationContext = createContext<VendorInvitationContextValue | undefined>(
  undefined
);

export function VendorInvitationProvider({ children }: { children: ReactNode }) {
  const { addVendor, vendors, entities, getEntityById } = useMasterData();
  const [invitations, setInvitations] = useState<VendorInvitation[]>(() => migrateLegacyInvitations());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const fallback: VendorInvitationsDocument = { invitations: migrateLegacyInvitations() };
      const doc = await ensureDomainDocument<VendorInvitationsDocument>('vendor_invitations', fallback);
      if (!alive) return;
      setInvitations(doc.invitations ?? []);
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveDomainDocument('vendor_invitations', { invitations });
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [invitations, hydrated]);

  const buildInvitationUrl = useCallback((token: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/vendor-invite/${token}`;
  }, []);

  const createInvitation = useCallback(
    (basic: VendorInviteBasics, invitedByName?: string): VendorInvitation => {
      let created!: VendorInvitation;
      setInvitations((prev) => {
        const nextSeq = prev.reduce((m, i) => Math.max(m, i.displaySequence ?? 0), 0) + 1;
        created = {
          id: `inv-${Date.now()}`,
          token: newToken(),
          status: 'invited',
          basic: { ...basic },
          createdAt: new Date().toISOString(),
          displaySequence: nextSeq,
          invitedByName: invitedByName?.trim() || 'Procurement',
          expiresAt: new Date(Date.now() + 14 * 864e5).toISOString(),
        };
        return [created, ...prev];
      });
      return created;
    },
    []
  );

  const extendInvitationExpiry = useCallback((id: string) => {
    setInvitations((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const base = i.expiresAt ? new Date(i.expiresAt) : new Date();
        const next = new Date(Math.max(base.getTime(), Date.now()) + 14 * 864e5);
        return { ...i, expiresAt: next.toISOString() };
      })
    );
  }, []);

  const getById = useCallback(
    (id: string) => invitations.find((i) => i.id === id),
    [invitations]
  );

  const getByToken = useCallback(
    (token: string) => invitations.find((i) => i.token === token),
    [invitations]
  );

  const updateStatus = useCallback(
    (id: string, status: VendorInvitationStatus, patch?: Partial<VendorInvitation>) => {
      setInvitations((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...patch, status } : i))
      );
    },
    []
  );

  const markVendorOpened = useCallback((token: string) => {
    setInvitations((prev) =>
      prev.map((i) => {
        if (i.token !== token) return i;
        if (i.status !== 'invited') return i;
        return {
          ...i,
          status: 'vendor_in_progress',
          vendorOpenedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const saveVendorSubmission = useCallback((token: string, submission: VendorSubmissionPayload) => {
    setInvitations((prev) =>
      prev.map((i) => {
        if (i.token !== token) return i;
        return {
          ...i,
          status: 'submitted_by_vendor',
          submission,
          rejectedReason: undefined,
        };
      })
    );
  }, []);

  const setInternalNotes = useCallback((id: string, notes: string) => {
    setInvitations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, internalNotes: notes } : i))
    );
  }, []);

  const submitForInternalApproval = useCallback((id: string) => {
    setInvitations((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: 'pending_approval',
              submittedForApprovalAt: new Date().toISOString(),
            }
          : i
      )
    );
  }, []);

  const requestChanges = useCallback((id: string, message: string) => {
    setInvitations((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: 'changes_requested',
              rejectedReason: message,
              submission: undefined,
            }
          : i
      )
    );
  }, []);

  const rejectInvitation = useCallback((id: string, reason: string) => {
    updateStatus(id, 'rejected', { rejectedReason: reason });
  }, [updateStatus]);

  const approveAndCreateVendorMaster = useCallback(
    (id: string): { ok: true; code: string } | { ok: false; error: string } => {
      const inv = invitations.find((x) => x.id === id);
      if (!inv || !inv.submission) {
        return { ok: false, error: 'Invitation or submission not found.' };
      }
      if (inv.status === 'approved') {
        return { ok: false, error: 'Already approved.' };
      }

      const codeSet = new Set(vendors.map((v) => v.code));
      const code = nextVendorCode(codeSet);
      const b = inv.basic;
      const s = inv.submission;
      const entity =
        (b.entityId && getEntityById(b.entityId)) || entities[0];
      if (!entity) {
        return { ok: false, error: 'No entity configured for this invitation.' };
      }

      const bankId = `ba-${inv.id}`;
      const addrId = `addr-${inv.id}`;

      const master: VendorMaster = {
        id: `vm-${inv.id}`,
        code,
        name: s.tradeName.trim() || b.legalName.trim(),
        legalName: b.legalName.trim(),
        pan: b.pan.trim().toUpperCase(),
        gstin: s.gstin.trim().toUpperCase(),
        email: b.email.trim(),
        phone: s.phone.trim(),
        category: b.category,
        vendorType: s.vendorType,
        msmeRegistered: false,
        status: 'Active',
        paymentTerms: 'Net 30',
        creditDays: 30,
        bankAccounts: [
          {
            id: bankId,
            accountNumber: s.bankAccountNumber,
            accountName: s.bankAccountName,
            ifscCode: s.bankIfsc.toUpperCase(),
            bankName: s.bankName,
            branchName: s.city || '—',
            accountType: 'Current',
            isPrimary: true,
            verified: s.bankValidated,
          },
        ],
        addresses: [
          {
            id: addrId,
            type: 'Registered',
            addressLine1: s.addressLine1,
            city: s.city,
            state: s.state,
            stateCode: s.state.slice(0, 2).toUpperCase(),
            pincode: s.pincode,
            country: s.country,
            gstin: s.gstin,
            isPrimary: true,
          },
        ],
        createdBy: 'vendor-invitation',
        createdDate: new Date().toISOString().split('T')[0],
        approvedBy: 'system',
        approvedDate: new Date().toISOString().split('T')[0],
        entityId: entity.id,
        entityName: entity.name,
        country: b.countryName?.trim() || s.country,
        currency: 'INR',
        tdsApplicable: false,
      };

      addVendor(master);

      setInvitations((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                status: 'approved',
                approvedAt: new Date().toISOString(),
                createdVendorId: master.id,
                createdVendorCode: code,
              }
            : x
        )
      );

      return { ok: true, code };
    },
    [addVendor, entities, getEntityById, invitations, vendors]
  );

  const value = useMemo<VendorInvitationContextValue>(
    () => ({
      invitations,
      createInvitation,
      extendInvitationExpiry,
      getById,
      getByToken,
      updateStatus,
      markVendorOpened,
      saveVendorSubmission,
      setInternalNotes,
      submitForInternalApproval,
      requestChanges,
      rejectInvitation,
      approveAndCreateVendorMaster,
      buildInvitationUrl,
    }),
    [
      invitations,
      createInvitation,
      extendInvitationExpiry,
      getById,
      getByToken,
      updateStatus,
      markVendorOpened,
      saveVendorSubmission,
      setInternalNotes,
      submitForInternalApproval,
      requestChanges,
      rejectInvitation,
      approveAndCreateVendorMaster,
      buildInvitationUrl,
    ]
  );

  return (
    <VendorInvitationContext.Provider value={value}>{children}</VendorInvitationContext.Provider>
  );
}

export function useVendorInvitations() {
  const ctx = useContext(VendorInvitationContext);
  if (!ctx) {
    throw new Error('useVendorInvitations must be used within VendorInvitationProvider');
  }
  return ctx;
}
