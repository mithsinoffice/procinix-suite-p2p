import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { ensureDomainDocument, saveDomainDocument } from '../lib/mysql/documentStore';

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
}

interface ProcurementDataDocument {
  purchaseRequests: PurchaseRequestTransaction[];
}

interface ProcurementDataContextType {
  purchaseRequests: PurchaseRequestTransaction[];
  isHydrating: boolean;
  addPurchaseRequest: (request: PurchaseRequestTransaction) => void;
  updatePurchaseRequestStatus: (
    id: string,
    status: PurchaseRequestStatus,
    updates?: Partial<PurchaseRequestTransaction>
  ) => void;
}

const defaultProcurementData: ProcurementDataDocument = {
  purchaseRequests: [],
};

const ProcurementDataContext = createContext<ProcurementDataContextType | undefined>(undefined);

export function ProcurementDataProvider({ children }: { children: ReactNode }) {
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestTransaction[]>(
    defaultProcurementData.purchaseRequests
  );
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const document = await ensureDomainDocument('procurement_data', defaultProcurementData, {
        seedIfMissing: false,
      });
      if (!isMounted) {
        return;
      }

      setPurchaseRequests(document.purchaseRequests ?? []);
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

    saveDomainDocument('procurement_data', { purchaseRequests });
  }, [purchaseRequests, isHydrating]);

  const value = useMemo<ProcurementDataContextType>(
    () => ({
      purchaseRequests,
      isHydrating,
      addPurchaseRequest: (request) => {
        setPurchaseRequests((current) => [request, ...current]);
      },
      updatePurchaseRequestStatus: (id, status, updates = {}) => {
        setPurchaseRequests((current) =>
          current.map((request) =>
            request.id === id
              ? {
                  ...request,
                  ...updates,
                  status,
                }
              : request
          )
        );
      },
    }),
    [purchaseRequests, isHydrating]
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
