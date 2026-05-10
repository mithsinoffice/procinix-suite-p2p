import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ensureDomainDocument, saveDomainDocument } from '../lib/mysql/documentStore';
import { mysqlApiRequest } from '../lib/mysql/client';
import type {
  GoodsReceiptNote,
  POStatus as RelPOStatus,
  ProcurementAuditEntry,
  PRStatus as RelPRStatus,
  PRType as RelPRType,
  PurchaseOrder,
  PurchaseRequest,
  ServiceReceiptNote,
  ThreeWayMatchResult,
} from '../types/procurement';

/**
 * ProcurementDataContext — relational backend with JSON-blob fallback.
 *
 * Primary path: GET /api/procurement/{prs|pos|grns|srns} via mysqlApiRequest.
 * Fallback: ensureDomainDocument('procurement_data') is read on hydrate when
 * the API call fails or returns empty. The Title-case `purchaseRequests`
 * shape (PurchaseRequestTransaction) is retained for backward compatibility
 * with existing forms (RegularPRForm, PRListing, PRtoPOConversionEnhanced)
 * — those map to/from the relational shape via mapRelationalToLegacy /
 * mapLegacyToRelational.
 */

// ── Legacy (Title-case) shape kept for backward-compat ─────────────────────

export type PurchaseRequestType =
  | 'Catalogue'
  | 'Regular'
  | 'Service'
  | 'Kit/Bundle'
  | 'Asset/CAPEX'
  | 'Blanket';

export type PurchaseRequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending Approval'
  | 'In Review'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Converted to PO';

export type PurchaseRequestRisk = 'Low' | 'Medium' | 'High';

export interface PurchaseRequestTransaction {
  id: string;
  prNumber: string;
  type: PurchaseRequestType;
  entity: string;
  requestor: string;
  department: string;
  costCentre: string;
  needByDate: string;
  deliveryLocation?: string;
  totalAmount: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  status: PurchaseRequestStatus;
  nextApprover: string;
  aiRiskLevel: PurchaseRequestRisk;
  createdDate: string;
  submittedDate?: string;
  vendor?: string;
  linkedPO?: string;
  itemCount: number;
  justification: string;
  policyFlags: string[];
  agingDays?: number;
  lineItems?: Array<Record<string, unknown>>;
  // Internal flag — true when this record came from the relational API
  _relationalId?: string;
}

interface ProcurementDataDocument {
  purchaseRequests: PurchaseRequestTransaction[];
}

const defaultProcurementData: ProcurementDataDocument = {
  purchaseRequests: [],
};

// ── Mappers (relational ↔ legacy) ──────────────────────────────────────────

const PR_TYPE_TO_LEGACY: Record<RelPRType, PurchaseRequestType> = {
  catalogue: 'Catalogue',
  regular: 'Regular',
  service: 'Service',
  kit_bundle: 'Kit/Bundle',
  asset_capex: 'Asset/CAPEX',
  blanket: 'Blanket',
};

const PR_TYPE_FROM_LEGACY: Record<PurchaseRequestType, RelPRType> = {
  Catalogue: 'catalogue',
  Regular: 'regular',
  Service: 'service',
  'Kit/Bundle': 'kit_bundle',
  'Asset/CAPEX': 'asset_capex',
  Blanket: 'blanket',
};

const PR_STATUS_TO_LEGACY: Record<RelPRStatus, PurchaseRequestStatus> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  converted_to_po: 'Converted to PO',
  cancelled: 'Cancelled',
};

const PR_STATUS_FROM_LEGACY: Record<PurchaseRequestStatus, RelPRStatus> = {
  Draft: 'draft',
  Submitted: 'pending_approval',
  'Pending Approval': 'pending_approval',
  'In Review': 'pending_approval',
  Approved: 'approved',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
  'Converted to PO': 'converted_to_po',
};

function mapRelationalToLegacy(pr: PurchaseRequest): PurchaseRequestTransaction {
  return {
    id: pr.id,
    prNumber: pr.prRef,
    type: PR_TYPE_TO_LEGACY[pr.prType],
    entity: pr.entityCode,
    requestor: pr.requesterName,
    department: pr.department || '',
    costCentre: pr.costCentre || '',
    needByDate: pr.needByDate || '',
    deliveryLocation: pr.deliveryLocation || '',
    totalAmount: pr.totalAmount,
    currency: (pr.currency as PurchaseRequestTransaction['currency']) || 'INR',
    status: PR_STATUS_TO_LEGACY[pr.status],
    nextApprover: pr.status === 'pending_approval' ? 'Department Head' : '—',
    aiRiskLevel: pr.totalAmount > 1000000 ? 'Medium' : 'Low',
    createdDate: pr.createdAt ? String(pr.createdAt).slice(0, 10) : '',
    submittedDate: pr.approvedAt ? String(pr.approvedAt).slice(0, 10) : undefined,
    vendor: pr.lineItems?.[0]?.vendorName ?? undefined,
    itemCount: pr.lineItems?.length ?? 0,
    justification: pr.businessJustification || '',
    policyFlags: pr.totalAmount > 1000000 ? ['Budget Review'] : [],
    lineItems: pr.lineItems as unknown as Array<Record<string, unknown>>,
    _relationalId: pr.id,
  };
}

function getTenantId(): string {
  try {
    const raw = sessionStorage.getItem('procinix.session.user');
    if (!raw) return 'tenant-default-001';
    const parsed = JSON.parse(raw);
    return parsed?.tenantId || 'tenant-default-001';
  } catch {
    return 'tenant-default-001';
  }
}

function tenantHeaders(): Record<string, string> {
  return { 'X-Tenant-Id': getTenantId() };
}

// ── Typed API helpers ──────────────────────────────────────────────────────

interface ApiOk<T> {
  success: true;
  data: T;
}
interface ApiErr {
  success: false;
  error: string;
  details?: unknown;
}
type ApiResult<T> = ApiOk<T> | ApiErr;

export async function fetchPRs(): Promise<PurchaseRequest[]> {
  const res = (await mysqlApiRequest('/procurement/prs', { headers: tenantHeaders() })) as
    | ApiResult<PurchaseRequest[]>
    | undefined;
  if (res && res.success) return res.data || [];
  return [];
}

export async function fetchPR(id: string): Promise<PurchaseRequest | null> {
  const res = (await mysqlApiRequest(`/procurement/prs/${id}`, {
    headers: tenantHeaders(),
  })) as ApiResult<PurchaseRequest> | undefined;
  return res && res.success ? res.data : null;
}

export async function createPRApi(
  payload: Partial<PurchaseRequest> & { lineItems?: unknown[] }
): Promise<PurchaseRequest | null> {
  const res = (await mysqlApiRequest('/procurement/prs', {
    method: 'POST',
    headers: tenantHeaders(),
    body: JSON.stringify(payload),
  })) as ApiResult<PurchaseRequest> | undefined;
  return res && res.success ? res.data : null;
}

export async function transitionPRApi(
  id: string,
  action: 'submit' | 'approve' | 'reject' | 'cancel',
  body?: Record<string, unknown>
): Promise<{ id: string; status: string } | null> {
  const res = (await mysqlApiRequest(`/procurement/prs/${id}/${action}`, {
    method: 'POST',
    headers: tenantHeaders(),
    body: JSON.stringify(body || {}),
  })) as ApiResult<{ id: string; status: string }> | undefined;
  return res && res.success ? res.data : null;
}

export async function fetchPOs(): Promise<PurchaseOrder[]> {
  const res = (await mysqlApiRequest('/procurement/pos', { headers: tenantHeaders() })) as
    | ApiResult<PurchaseOrder[]>
    | undefined;
  if (res && res.success) return res.data || [];
  return [];
}

export async function fetchPO(id: string): Promise<PurchaseOrder | null> {
  const res = (await mysqlApiRequest(`/procurement/pos/${id}`, {
    headers: tenantHeaders(),
  })) as ApiResult<PurchaseOrder> | undefined;
  return res && res.success ? res.data : null;
}

export async function createPOApi(
  payload: Partial<PurchaseOrder> & { prIds: string[] }
): Promise<PurchaseOrder | null> {
  const res = (await mysqlApiRequest('/procurement/pos', {
    method: 'POST',
    headers: tenantHeaders(),
    body: JSON.stringify(payload),
  })) as ApiResult<PurchaseOrder> | undefined;
  return res && res.success ? res.data : null;
}

export async function fetchGRNs(): Promise<GoodsReceiptNote[]> {
  const res = (await mysqlApiRequest('/procurement/grns', { headers: tenantHeaders() })) as
    | ApiResult<GoodsReceiptNote[]>
    | undefined;
  return res && res.success ? res.data || [] : [];
}

export async function fetchSRNs(): Promise<ServiceReceiptNote[]> {
  const res = (await mysqlApiRequest('/procurement/srns', { headers: tenantHeaders() })) as
    | ApiResult<ServiceReceiptNote[]>
    | undefined;
  return res && res.success ? res.data || [] : [];
}

export async function fetchAuditTrail(
  docType: 'prs' | 'pos' | 'grns' | 'srns',
  id: string
): Promise<ProcurementAuditEntry[]> {
  const res = (await mysqlApiRequest(`/procurement/${docType}/${id}/audit`, {
    headers: tenantHeaders(),
  })) as ApiResult<ProcurementAuditEntry[]> | undefined;
  return res && res.success ? res.data || [] : [];
}

export async function fetchPOMatchStatus(id: string): Promise<ThreeWayMatchResult | null> {
  const res = (await mysqlApiRequest(`/procurement/pos/${id}/match-status`, {
    headers: tenantHeaders(),
  })) as ApiResult<ThreeWayMatchResult> | undefined;
  return res && res.success ? res.data : null;
}

// ── Context ────────────────────────────────────────────────────────────────

interface ProcurementDataContextType {
  // Backward-compat (legacy) shape used by existing forms/listings
  purchaseRequests: PurchaseRequestTransaction[];
  isHydrating: boolean;
  addPurchaseRequest: (request: PurchaseRequestTransaction) => Promise<void> | void;
  updatePurchaseRequestStatus: (
    id: string,
    status: PurchaseRequestStatus,
    updates?: Partial<PurchaseRequestTransaction>
  ) => Promise<void> | void;
  // New relational helpers
  refresh: () => Promise<void>;
  prs: PurchaseRequest[];
  pos: PurchaseOrder[];
  grns: GoodsReceiptNote[];
  srns: ServiceReceiptNote[];
  reloadAll: () => Promise<void>;
}

const ProcurementDataContext = createContext<ProcurementDataContextType | undefined>(undefined);

export function ProcurementDataProvider({ children }: { children: ReactNode }) {
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GoodsReceiptNote[]>([]);
  const [srns, setSrns] = useState<ServiceReceiptNote[]>([]);
  const [legacyFallback, setLegacyFallback] = useState<PurchaseRequestTransaction[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [apiPRs, apiPOs, apiGRNs, apiSRNs] = await Promise.all([
        fetchPRs(),
        fetchPOs(),
        fetchGRNs(),
        fetchSRNs(),
      ]);
      // Empty result from API → check whether we should fall back to blob
      if (apiPRs.length === 0 && apiPOs.length === 0) {
        const blob = await ensureDomainDocument('procurement_data', defaultProcurementData, {
          seedIfMissing: false,
        });
        if (blob.purchaseRequests && blob.purchaseRequests.length > 0) {
          setLegacyFallback(blob.purchaseRequests);
          setUsingFallback(true);
          setPrs([]);
          setPos([]);
          setGrns([]);
          setSrns([]);
          return;
        }
      }
      setUsingFallback(false);
      setLegacyFallback([]);
      setPrs(apiPRs);
      setPos(apiPOs);
      setGrns(apiGRNs);
      setSrns(apiSRNs);
    } catch (err) {
      // API call failed entirely — fall back to blob
      console.warn('[ProcurementDataContext] API failed, using blob fallback:', err);
      try {
        const blob = await ensureDomainDocument('procurement_data', defaultProcurementData, {
          seedIfMissing: false,
        });
        setLegacyFallback(blob.purchaseRequests || []);
        setUsingFallback(true);
      } catch {
        setLegacyFallback([]);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refresh();
      if (mounted) setIsHydrating(false);
    })();
    return () => {
      mounted = false;
    };
  }, [refresh]);

  // Derived: legacy-shape purchaseRequests for existing components
  const purchaseRequests: PurchaseRequestTransaction[] = useMemo(() => {
    if (usingFallback) return legacyFallback;
    return prs.map(mapRelationalToLegacy);
  }, [prs, legacyFallback, usingFallback]);

  // Legacy add — maps Title-case to relational + posts to API. Falls back to
  // blob save (the original behaviour) when the API write fails so existing
  // forms keep working in offline/dev modes.
  const addPurchaseRequest = useCallback(
    async (request: PurchaseRequestTransaction) => {
      const relPRType = PR_TYPE_FROM_LEGACY[request.type];
      const relStatus = PR_STATUS_FROM_LEGACY[request.status];
      try {
        const created = await createPRApi({
          entityId: request.entity,
          entityCode: request.entity,
          prType: relPRType,
          requesterId: request.requestor,
          requesterName: request.requestor,
          department: request.department,
          costCentre: request.costCentre,
          deliveryLocation: request.deliveryLocation,
          needByDate: request.needByDate,
          businessJustification: request.justification,
          priority: 'medium',
          currency: request.currency,
          lineItems: (request.lineItems || []) as unknown[],
        } as Partial<PurchaseRequest> & { lineItems?: unknown[] });
        if (created) {
          // If the legacy form submitted an "approval" status, fire the submit transition too
          if (relStatus !== 'draft') {
            await transitionPRApi(created.id, 'submit');
          }
          await refresh();
          return;
        }
      } catch (err) {
        console.warn('[ProcurementDataContext] createPRApi failed, persisting to blob:', err);
      }
      // Blob fallback — preserves the original behaviour
      setLegacyFallback((current) => {
        const next = [request, ...current];
        saveDomainDocument('procurement_data', { purchaseRequests: next });
        return next;
      });
      setUsingFallback(true);
    },
    [refresh]
  );

  const updatePurchaseRequestStatus = useCallback(
    async (
      id: string,
      status: PurchaseRequestStatus,
      updates: Partial<PurchaseRequestTransaction> = {}
    ) => {
      const relStatus = PR_STATUS_FROM_LEGACY[status];
      // Map status → API action
      let action: 'submit' | 'approve' | 'reject' | 'cancel' | null = null;
      if (relStatus === 'pending_approval') action = 'submit';
      else if (relStatus === 'approved') action = 'approve';
      else if (relStatus === 'rejected') action = 'reject';
      else if (relStatus === 'cancelled') action = 'cancel';

      // Resolve relational id — `id` may be either the DB UUID or the legacy
      // pr-number (prRef). Look up if necessary.
      let relId = id;
      const match = prs.find((p) => p.id === id || p.prRef === id);
      if (match) relId = match.id;

      if (action && relId) {
        try {
          const result = await transitionPRApi(relId, action, {
            reason: updates.policyFlags?.join(', '),
          });
          if (result) {
            await refresh();
            return;
          }
        } catch (err) {
          console.warn('[ProcurementDataContext] transitionPRApi failed, falling back:', err);
        }
      }

      // Blob fallback — update legacy state in place
      setLegacyFallback((current) => {
        const next = current.map((r) => (r.id === id ? { ...r, ...updates, status } : r));
        saveDomainDocument('procurement_data', { purchaseRequests: next });
        return next;
      });
    },
    [prs, refresh]
  );

  const value = useMemo<ProcurementDataContextType>(
    () => ({
      purchaseRequests,
      isHydrating,
      addPurchaseRequest,
      updatePurchaseRequestStatus,
      refresh,
      prs,
      pos,
      grns,
      srns,
      reloadAll: refresh,
    }),
    [
      purchaseRequests,
      isHydrating,
      addPurchaseRequest,
      updatePurchaseRequestStatus,
      refresh,
      prs,
      pos,
      grns,
      srns,
    ]
  );

  return (
    <ProcurementDataContext.Provider value={value}>{children}</ProcurementDataContext.Provider>
  );
}

export function useProcurementData() {
  const context = useContext(ProcurementDataContext);
  if (!context) {
    throw new Error('useProcurementData must be used within a ProcurementDataProvider');
  }
  return context;
}
