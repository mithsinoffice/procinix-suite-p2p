import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ensureDomainDocument, saveDomainDocument } from '../lib/mysql/documentStore';
import { mysqlApiRequest } from '../lib/mysql/client';

// Aggregates surfaced by `/api/budget/summary` and `/api/budget/departments`.
// The full collections (budgets/revisions/transfers/scenarios/policies) still
// hydrate from the JSON blob — those don't have a relational source yet.
export interface BudgetSummary {
  totalBudget: number;
  committed: number;
  actual: number;
  available: number;
  count: number;
  byStatus: Record<string, number>;
  utilizationPercent: number;
}
export interface DepartmentBudget {
  department: string;
  budget: number;
  committed: number;
  actual: number;
  available: number;
  count: number;
  utilizationPercent: number;
}

// Budget Types
export type BudgetType = 'Original' | 'Interim' | 'Revised' | 'Forecast';
export type BudgetStatus =
  | 'Draft'
  | 'Submitted'
  | 'In Approval'
  | 'Approved'
  | 'Rejected'
  | 'Active'
  | 'Closed';
export type AllocationPeriod = 'Monthly' | 'Quarterly' | 'Annual';
export type ControlType = 'Hard Stop' | 'Soft Warning' | 'Advisory';
export type ScenarioType = 'Base' | 'Optimistic' | 'Conservative' | 'Custom';

export interface BudgetDimension {
  department?: string;
  expenseCategory?: string;
  glAccountCode?: string;
  location?: string;
  costCentre?: string;
  profitCentre?: string;
  project?: string;
}

export interface BudgetAllocation {
  period: string;
  plannedAmount: number;
  revisedAmount?: number;
  comments?: string;
}

export interface Budget {
  id: string;
  budgetNumber: string;
  budgetName: string;
  budgetOwner: string;
  financialYear: string;
  budgetType: BudgetType;
  currency: string;
  totalAmount: number;
  dimensions: BudgetDimension;
  allocations: BudgetAllocation[];
  allocationPeriod: AllocationPeriod;
  status: BudgetStatus;
  createdBy: string;
  createdDate: string;
  approvedBy?: string;
  approvedDate?: string;
  committed: number;
  actual: number;
  available: number;
  utilizationPercent: number;
  linkedPOs: string[];
  linkedInvoices: string[];
  revisionHistory: BudgetRevision[];
  approvalWorkflow: ApprovalStep[];
}

export interface BudgetRevision {
  id: string;
  budgetId: string;
  revisionNumber: number;
  revisionReason: string;
  originalAmount: number;
  revisedAmount: number;
  netChange: number;
  effectiveDate: string;
  requestedBy: string;
  approvedBy?: string;
  approvedDate?: string;
  status: BudgetStatus;
}

export interface BudgetTransfer {
  id: string;
  transferNumber: string;
  transferDate: string;
  sourceBudget: string;
  sourceBudgetName: string;
  targetBudget: string;
  targetBudgetName: string;
  transferAmount: number;
  transferReason: string;
  requestedBy: string;
  approvedBy?: string;
  approvedDate?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
}

export interface BudgetScenario {
  id: string;
  scenarioName: string;
  scenarioType: ScenarioType;
  baseScenarioId?: string;
  adjustmentPercent: number;
  timeHorizon: string;
  projectedBudget: number;
  projectedCommitted: number;
  projectedActual: number;
  projectedAvailable: number;
  breachRisk: 'Low' | 'Medium' | 'High';
  createdBy: string;
  createdDate: string;
}

export interface BudgetPolicy {
  id: string;
  policyName: string;
  controlType: ControlType;
  thresholdPercent: number;
  applicableDimensions: BudgetDimension;
  overridePermissions: string[];
  alertRecipients: string[];
  isActive: boolean;
  createdBy: string;
  createdDate: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
}

export interface ApprovalStep {
  level: number;
  approverRole: string;
  approver: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  comments?: string;
  actionDate?: string;
  slaHours: number;
  slaDue: string;
  overdue: boolean;
}

interface BudgetDataContextType {
  budgets: Budget[];
  revisions: BudgetRevision[];
  transfers: BudgetTransfer[];
  scenarios: BudgetScenario[];
  policies: BudgetPolicy[];
  /** API-derived aggregates from /api/budget/summary (null until loaded). */
  apiSummary: BudgetSummary | null;
  /** API-derived department breakdown from /api/budget/departments. */
  apiDepartments: DepartmentBudget[];
  isHydrating: boolean;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addRevision: (revision: BudgetRevision) => void;
  addTransfer: (transfer: BudgetTransfer) => void;
  addScenario: (scenario: BudgetScenario) => void;
  addPolicy: (policy: BudgetPolicy) => void;
  updatePolicy: (id: string, updates: Partial<BudgetPolicy>) => void;
}

const BudgetDataContext = createContext<BudgetDataContextType | undefined>(undefined);

interface BudgetDataDocument {
  budgets: Budget[];
  revisions: BudgetRevision[];
  transfers: BudgetTransfer[];
  scenarios: BudgetScenario[];
  policies: BudgetPolicy[];
}

export function BudgetDataProvider({ children }: { children: ReactNode }) {
  const defaultDocument: BudgetDataDocument = {
    budgets: [
      {
        id: 'BDG-ACIL-METRO-P2-001',
        budgetNumber: 'BDG-ACIL-METRO-P2-001',
        budgetName: 'ACIL - Metro Station Phase 2 - Materials',
        budgetOwner: 'Rajesh Kumar (Project Manager)',
        financialYear: 'FY2025',
        budgetType: 'Original',
        currency: 'INR',
        totalAmount: 550000000,
        dimensions: {
          department: 'Projects',
          expenseCategory: 'Materials',
          glAccountCode: '520000',
          location: 'Delhi NCR',
          costCentre: 'ACIL-METRO-P2',
          profitCentre: 'PC-PROJECTS',
          project: 'ACIL-METRO-P2',
        },
        allocations: [
          { period: 'Apr 2025', plannedAmount: 45833333, revisedAmount: 45833333 },
          { period: 'May 2025', plannedAmount: 45833333, revisedAmount: 45833333 },
          { period: 'Jun 2025', plannedAmount: 45833333, revisedAmount: 45833333 },
        ],
        allocationPeriod: 'Monthly',
        status: 'Approved',
        createdBy: 'Rajesh Kumar',
        createdDate: '2025-03-01',
        approvedBy: 'Amit Sharma (CFO)',
        approvedDate: '2025-03-15',
        committed: 158000000,
        actual: 72000000,
        available: 320000000,
        utilizationPercent: 41.8,
        linkedPOs: ['PO-2025-1001', 'PO-2025-1045'],
        linkedInvoices: ['INV-2025-2234'],
        revisionHistory: [],
        approvalWorkflow: [
          {
            level: 1,
            approverRole: 'Project Manager',
            approver: 'Rajesh Kumar',
            status: 'Approved',
            comments: 'Approved as per project plan',
            actionDate: '2025-03-05',
            slaHours: 48,
            slaDue: '2025-03-07',
            overdue: false,
          },
        ],
      },
    ],
    revisions: [
      {
        id: 'REV-ACIL-001',
        budgetId: 'BDG-ACIL-METRO-P2-001',
        revisionNumber: 1,
        revisionReason: 'Additional excavation work required due to soil conditions',
        originalAmount: 450000000,
        revisedAmount: 480000000,
        netChange: 30000000,
        effectiveDate: '2025-07-01',
        requestedBy: 'Rajesh Kumar',
        status: 'Submitted',
      },
    ],
    transfers: [],
    scenarios: [
      {
        id: 'SCN-001',
        scenarioName: 'Monsoon Delay Impact - 15% Cost Increase',
        scenarioType: 'Conservative',
        adjustmentPercent: 15,
        timeHorizon: 'FY2025-26',
        projectedBudget: 1380000000,
        projectedCommitted: 492200000,
        projectedActual: 245650000,
        projectedAvailable: 642150000,
        breachRisk: 'Medium',
        createdBy: 'Priya Mehta',
        createdDate: '2025-05-15',
      },
    ],
    policies: [
      {
        id: 'POL-ACIL-001',
        policyName: 'Project Budget - Hard Stop at 90%',
        controlType: 'Hard Stop',
        thresholdPercent: 90,
        applicableDimensions: {
          project: 'ACIL-METRO-P2',
          expenseCategory: 'Materials',
        },
        overridePermissions: ['CFO', 'Project Director'],
        alertRecipients: ['rajesh.kumar@company.com', 'amit.sharma@company.com'],
        isActive: true,
        createdBy: 'Amit Sharma',
        createdDate: '2025-03-01',
      },
    ],
  };

  const [budgets, setBudgets] = useState<Budget[]>(defaultDocument.budgets);
  const [revisions, setRevisions] = useState<BudgetRevision[]>(defaultDocument.revisions);
  const [transfers, setTransfers] = useState<BudgetTransfer[]>(defaultDocument.transfers);
  const [scenarios, setScenarios] = useState<BudgetScenario[]>(defaultDocument.scenarios);
  const [policies, setPolicies] = useState<BudgetPolicy[]>(defaultDocument.policies);
  const [apiSummary, setApiSummary] = useState<BudgetSummary | null>(null);
  const [apiDepartments, setApiDepartments] = useState<DepartmentBudget[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      // Full collections still load from the JSON blob — no relational source
      // for these yet. The /api/budget/{summary,departments} endpoints below
      // give the dashboard a real API surface; if either fails, derive from
      // the same blob so the UI never breaks.
      const document = await ensureDomainDocument('budget_data', defaultDocument);
      if (!isMounted) {
        return;
      }

      setBudgets(document.budgets ?? defaultDocument.budgets);
      setRevisions(document.revisions ?? defaultDocument.revisions);
      setTransfers(document.transfers ?? defaultDocument.transfers);
      setScenarios(document.scenarios ?? defaultDocument.scenarios);
      setPolicies(document.policies ?? defaultDocument.policies);

      try {
        const [summaryRes, deptRes] = await Promise.all([
          mysqlApiRequest<{ success: boolean; data: BudgetSummary }>('/budget/summary').catch(
            () => null
          ),
          mysqlApiRequest<{ success: boolean; data: { departments: DepartmentBudget[] } }>(
            '/budget/departments'
          ).catch(() => null),
        ]);
        if (isMounted) {
          if (summaryRes?.success) setApiSummary(summaryRes.data);
          if (deptRes?.success) setApiDepartments(deptRes.data.departments ?? []);
        }
      } catch {
        // API unavailable — leave aggregates empty; the dashboard can derive
        // from `budgets[]` directly until the endpoints respond.
      }

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

    saveDomainDocument('budget_data', {
      budgets,
      revisions,
      transfers,
      scenarios,
      policies,
    });
  }, [budgets, isHydrating, policies, revisions, scenarios, transfers]);

  const addBudget = (budget: Budget) => {
    setBudgets((prev) => [...prev, budget]);
  };

  const updateBudget = (id: string, updates: Partial<Budget>) => {
    setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  const addRevision = (revision: BudgetRevision) => {
    setRevisions((prev) => [...prev, revision]);
  };

  const addTransfer = (transfer: BudgetTransfer) => {
    setTransfers((prev) => [...prev, transfer]);
  };

  const addScenario = (scenario: BudgetScenario) => {
    setScenarios((prev) => [...prev, scenario]);
  };

  const addPolicy = (policy: BudgetPolicy) => {
    setPolicies((prev) => [...prev, policy]);
  };

  const updatePolicy = (id: string, updates: Partial<BudgetPolicy>) => {
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  return (
    <BudgetDataContext.Provider
      value={{
        budgets,
        revisions,
        transfers,
        scenarios,
        policies,
        apiSummary,
        apiDepartments,
        isHydrating,
        addBudget,
        updateBudget,
        deleteBudget,
        addRevision,
        addTransfer,
        addScenario,
        addPolicy,
        updatePolicy,
      }}
    >
      {children}
    </BudgetDataContext.Provider>
  );
}

export function useBudgetData() {
  const context = useContext(BudgetDataContext);
  if (context === undefined) {
    throw new Error('useBudgetData must be used within a BudgetDataProvider');
  }
  return context;
}
