import type { VendorMaster } from '../contexts/MasterDataContext';
import type { VendorInvitation } from '../types/vendorInvitation';
import type {
  VendorGovernanceDeskModel,
  GovernanceStatusTone,
  VendorGovernanceSummaryApiPayload,
} from '../types/vendorGovernance';
import { bucketInvitationStatus } from '../types/vendorGovernance';
import { isRecordMappedToEntity } from './masters/entityMapping';
import { formatInvitationDisplayId } from './invitationDisplay';
import { isPendingBuyerReview } from './vendorSubmissionReview';

const accent = '#00A9B7';

function invitationMatchesEntity(inv: VendorInvitation, entityId: string | null | undefined): boolean {
  if (!entityId || entityId === 'CONSOLIDATED') return true;
  const eid = inv.basic.entityId?.trim();
  if (!eid) return true;
  return eid === entityId;
}

function parseCreatedDate(v: VendorMaster): Date | null {
  const raw = v.createdDate?.trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function countInDateRange(
  vendors: VendorMaster[],
  entityId: string | null | undefined,
  start: Date,
  end: Date
): number {
  return vendors.filter((v) => {
    if (!isRecordMappedToEntity(v, entityId)) return false;
    if (v.status !== 'Active') return false;
    const d = parseCreatedDate(v);
    if (!d) return false;
    return d >= start && d < end;
  }).length;
}

function countInvitationsCreatedInRange(invitations: VendorInvitation[], start: Date, end: Date): number {
  return invitations.filter((inv) => {
    const d = new Date(inv.createdAt);
    return d >= start && d < end;
  }).length;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function statusUi(inv: VendorInvitation): { label: string; tone: GovernanceStatusTone } {
  switch (inv.status) {
    case 'invited':
      return { label: 'Draft', tone: 'gray' };
    case 'vendor_in_progress':
      return { label: 'Awaiting Vendor', tone: 'gray' };
    case 'changes_requested':
      return { label: 'Awaiting Vendor', tone: 'yellow' };
    case 'submitted_by_vendor':
    case 'pending_internal_review':
      return { label: 'Under Validation', tone: 'yellow' };
    case 'pending_approval':
      return { label: 'Under Approval', tone: 'blue' };
    case 'approved':
      return { label: 'Approved', tone: 'green' };
    case 'rejected':
      return { label: 'Rejected', tone: 'gray' };
    default:
      return { label: inv.status, tone: 'gray' };
  }
}

function dueFromExpires(expiresAt?: string): { label: string; dueTone: 'orange' | 'amber' | 'soft' } {
  if (!expiresAt) {
    return { label: 'Due soon', dueTone: 'soft' };
  }
  const exp = new Date(expiresAt);
  const now = new Date();
  const ms = exp.getTime() - now.getTime();
  const days = Math.ceil(ms / 864e5);
  if (days <= 0) return { label: 'Today', dueTone: 'orange' };
  if (days === 1) return { label: 'Tomorrow', dueTone: 'amber' };
  if (days === 2) return { label: 'In 2 days', dueTone: 'soft' };
  return { label: `In ${days} days`, dueTone: 'soft' };
}

function taskLabel(inv: VendorInvitation): string {
  if (inv.status === 'pending_internal_review') return 'Complete validation';
  if (inv.status === 'submitted_by_vendor') return 'Start internal review';
  return 'Review & Approve';
}

/**
 * Builds dashboard model from vendor master + invitations (same sources hydrated from backend via MasterDataContext / VendorInvitationContext).
 */
export function buildVendorGovernanceDeskModel(
  invitations: VendorInvitation[],
  vendors: VendorMaster[],
  entityId: string | null | undefined
): VendorGovernanceDeskModel {
  const scopedInv = invitations.filter((i) => invitationMatchesEntity(i, entityId));
  const scopedVendors = vendors.filter((v) => isRecordMappedToEntity(v, entityId));

  const now = new Date();
  const start30 = new Date(now.getTime() - 30 * 864e5);
  const start60 = new Date(now.getTime() - 60 * 864e5);

  const totalRequests = scopedInv.length;
  const prevInvWindow = countInvitationsCreatedInRange(scopedInv, start60, start30);
  const currInvWindow = countInvitationsCreatedInRange(scopedInv, start30, now);

  const activeVendors = scopedVendors.filter((v) => v.status === 'Active').length;
  const prevActiveNew = countInDateRange(scopedVendors, entityId, start60, start30);
  const currActiveNew = countInDateRange(scopedVendors, entityId, start30, now);

  const pendingStatuses: VendorInvitation['status'][] = [
    'submitted_by_vendor',
    'pending_internal_review',
    'pending_approval',
  ];
  const pendingInv = scopedInv.filter((i) => pendingStatuses.includes(i.status));
  const pendingApprovals = pendingInv.length;

  const highRiskVendors = scopedVendors.filter((v) => v.status === 'Blocked').length;

  const level1 = scopedInv.filter((i) =>
    ['submitted_by_vendor', 'pending_internal_review'].includes(i.status)
  ).length;
  const level2 = scopedInv.filter((i) => i.status === 'pending_approval').length;

  const recent = [...scopedInv]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((inv) => {
      const ui = statusUi(inv);
      return {
        id: inv.id,
        invitationId: inv.id,
        name: inv.basic.legalName || inv.basic.contactName || 'Vendor',
        displayId: formatInvitationDisplayId(inv),
        status: ui.label,
        tone: ui.tone,
        date: new Date(inv.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      };
    });

  const taskCandidates = scopedInv
    .filter((inv) => isPendingBuyerReview(inv) || inv.status === 'pending_internal_review')
    .sort((a, b) => {
      const ae = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
      const be = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
      return ae - be;
    })
    .slice(0, 8)
    .map((inv) => {
      const due = dueFromExpires(inv.expiresAt);
      return {
        invitationId: inv.id,
        vendor: inv.basic.legalName || inv.basic.contactName || 'Vendor',
        task: taskLabel(inv),
        due: due.label,
        dueTone: due.dueTone,
      };
    });

  const buckets: Record<string, number> = {
    Draft: 0,
    'Awaiting Vendor': 0,
    'Under Validation': 0,
    'Under Approval': 0,
    Completed: 0,
    Other: 0,
  };
  for (const inv of scopedInv) {
    const k = bucketInvitationStatus(inv.status);
    if (k === 'draft') buckets.Draft += 1;
    else if (k === 'awaiting_vendor') buckets['Awaiting Vendor'] += 1;
    else if (k === 'under_validation') buckets['Under Validation'] += 1;
    else if (k === 'under_approval') buckets['Under Approval'] += 1;
    else if (k === 'completed') buckets.Completed += 1;
    else buckets.Other += 1;
  }
  const invTotal = Math.max(1, scopedInv.length);
  const distColors: Record<string, string> = {
    Draft: '#6E7A82',
    'Awaiting Vendor': '#CA8A04',
    'Under Validation': '#4338CA',
    'Under Approval': accent,
    Completed: '#16A34A',
    Other: '#94A3B8',
  };
  const requestStatusDistribution = Object.entries(buckets)
    .filter(([, n]) => n > 0)
    .map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / invTotal) * 1000) / 10,
      color: distColors[label] ?? '#64748B',
    }));

  let completed = 0;
  let inProgress = 0;
  let blocked = 0;
  for (const inv of scopedInv) {
    if (inv.status === 'approved') completed += 1;
    else if (inv.status === 'rejected') blocked += 1;
    else if (inv.status !== 'invited') inProgress += 1;
  }

  const low = scopedVendors.filter((v) => v.status === 'Active').length;
  const med = scopedVendors.filter((v) => v.status === 'Inactive').length;
  const high = scopedVendors.filter((v) => v.status === 'Blocked').length;
  const vr = Math.max(1, scopedVendors.length);
  const riskDistribution = [
    { label: 'Low risk', count: low, pct: Math.round((low / vr) * 1000) / 10, color: '#16A34A' },
    { label: 'Medium risk', count: med, pct: Math.round((med / vr) * 1000) / 10, color: '#CA8A04' },
    { label: 'High risk', count: high, pct: Math.round((high / vr) * 1000) / 10, color: '#DC2626' },
  ];

  const blockedVendors = scopedVendors.filter((v) => v.status === 'Blocked').slice(0, 3);
  const highRiskAlerts = blockedVendors.map((v) => ({
    title: 'Blocked vendor',
    detail: `${v.legalName || v.name} — compliance review required`,
    severity: 'critical' as const,
  }));

  return {
    source: 'client',
    lastUpdatedAt: new Date().toISOString(),
    kpis: {
      totalRequests,
      activeVendors,
      pendingApprovals,
      highRiskVendors,
      trends: {
        totalRequestsPct: pctChange(currInvWindow, prevInvWindow),
        activeVendorsPct: pctChange(currActiveNew, prevActiveNew),
        /** Snapshot-based; needs time-series from backend — null until API provides */
        pendingApprovalsPct: null,
        highRiskVendorsPct: null,
      },
    },
    recentRequests: recent,
    upcomingTasks: taskCandidates,
    requestStatusDistribution,
    validationSummary: { completed, inProgress, blocked },
    riskDistribution,
    pendingByLevel: { level1, level2 },
    highRiskAlerts,
  };
}

/**
 * Deep-merge API summary over client-derived model (API fields win when present).
 */
export function mergeGovernanceSummary(
  base: VendorGovernanceDeskModel,
  api: VendorGovernanceSummaryApiPayload
): VendorGovernanceDeskModel {
  const k = api.kpis;
  return {
    ...base,
    source: 'api',
    lastUpdatedAt: api.lastUpdatedAt ?? base.lastUpdatedAt,
    kpis: {
      totalRequests: k?.totalRequests ?? base.kpis.totalRequests,
      activeVendors: k?.activeVendors ?? base.kpis.activeVendors,
      pendingApprovals: k?.pendingApprovals ?? base.kpis.pendingApprovals,
      highRiskVendors: k?.highRiskVendors ?? base.kpis.highRiskVendors,
      trends: {
        totalRequestsPct: k?.trends?.totalRequestsPct ?? base.kpis.trends.totalRequestsPct,
        activeVendorsPct: k?.trends?.activeVendorsPct ?? base.kpis.trends.activeVendorsPct,
        pendingApprovalsPct: k?.trends?.pendingApprovalsPct ?? base.kpis.trends.pendingApprovalsPct,
        highRiskVendorsPct: k?.trends?.highRiskVendorsPct ?? base.kpis.trends.highRiskVendorsPct,
      },
    },
    recentRequests: api.recentRequests ?? base.recentRequests,
    upcomingTasks: api.upcomingTasks ?? base.upcomingTasks,
    requestStatusDistribution: api.requestStatusDistribution ?? base.requestStatusDistribution,
    validationSummary: {
      ...base.validationSummary,
      ...(api.validationSummary ?? {}),
    },
    riskDistribution: api.riskDistribution ?? base.riskDistribution,
    pendingByLevel: {
      ...base.pendingByLevel,
      ...(api.pendingByLevel ?? {}),
    },
    highRiskAlerts: api.highRiskAlerts ?? base.highRiskAlerts,
  };
}
