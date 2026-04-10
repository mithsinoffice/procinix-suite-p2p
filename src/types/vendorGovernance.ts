import type { VendorInvitationStatus } from './vendorInvitation';

export type GovernanceStatusTone = 'yellow' | 'blue' | 'gray' | 'green';

export interface VendorGovernanceKpiTrends {
  /** Percent change vs prior 30-day window; null when not comparable */
  totalRequestsPct: number | null;
  activeVendorsPct: number | null;
  pendingApprovalsPct: number | null;
  highRiskVendorsPct: number | null;
}

export interface VendorGovernanceDeskModel {
  source: 'client' | 'api';
  lastUpdatedAt: string;
  kpis: {
    totalRequests: number;
    activeVendors: number;
    pendingApprovals: number;
    highRiskVendors: number;
    trends: VendorGovernanceKpiTrends;
  };
  recentRequests: Array<{
    id: string;
    invitationId: string;
    name: string;
    displayId: string;
    status: string;
    tone: GovernanceStatusTone;
    date: string;
  }>;
  upcomingTasks: Array<{
    invitationId: string;
    vendor: string;
    task: string;
    due: string;
    dueTone: 'orange' | 'amber' | 'soft';
  }>;
  requestStatusDistribution: Array<{ label: string; count: number; pct: number; color: string }>;
  validationSummary: {
    completed: number;
    inProgress: number;
    blocked: number;
  };
  riskDistribution: Array<{ label: string; count: number; pct: number; color: string }>;
  pendingByLevel: { level1: number; level2: number };
  highRiskAlerts: Array<{ title: string; detail: string; severity: 'critical' | 'urgent' }>;
}

/** Optional MySQL API payload shape — backend can return this from GET /vendor-governance/summary */
export interface VendorGovernanceSummaryApiPayload {
  lastUpdatedAt?: string;
  kpis?: Partial<VendorGovernanceDeskModel['kpis']> & {
    trends?: Partial<VendorGovernanceKpiTrends>;
  };
  recentRequests?: VendorGovernanceDeskModel['recentRequests'];
  upcomingTasks?: VendorGovernanceDeskModel['upcomingTasks'];
  requestStatusDistribution?: VendorGovernanceDeskModel['requestStatusDistribution'];
  validationSummary?: Partial<VendorGovernanceDeskModel['validationSummary']>;
  riskDistribution?: VendorGovernanceDeskModel['riskDistribution'];
  pendingByLevel?: Partial<VendorGovernanceDeskModel['pendingByLevel']>;
  highRiskAlerts?: VendorGovernanceDeskModel['highRiskAlerts'];
}

export type StatusBucketKey =
  | 'draft'
  | 'awaiting_vendor'
  | 'under_validation'
  | 'under_approval'
  | 'completed'
  | 'other';

export function bucketInvitationStatus(status: VendorInvitationStatus): StatusBucketKey {
  switch (status) {
    case 'invited':
      return 'draft';
    case 'vendor_in_progress':
    case 'changes_requested':
      return 'awaiting_vendor';
    case 'submitted_by_vendor':
    case 'pending_internal_review':
      return 'under_validation';
    case 'pending_approval':
      return 'under_approval';
    case 'approved':
      return 'completed';
    case 'rejected':
      return 'other';
    default:
      return 'other';
  }
}
