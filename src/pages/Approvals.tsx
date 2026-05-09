import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { ApprovalItem, ApprovalKPIs, ModuleCounts } from '../types/approvals';
import { ActionKPICard } from '../components/Approvals/ActionKPICard';
import { ApprovalQueueItem } from '../components/Approvals/ApprovalQueueItem';
import { ApprovalTabs } from '../components/Approvals/ApprovalTabs';
import { ApprovalsLegend } from '../components/Approvals/ApprovalsLegend';
import { MSMEAlertBanner } from '../components/Approvals/MSMEAlertBanner';
import { PerformanceKPICard } from '../components/Approvals/PerformanceKPICard';
import { UrgentSLABanner } from '../components/Approvals/UrgentSLABanner';

type PendingMasterApprovalResponseItem = {
  masterKey: string;
  recordId: string;
  record: Record<string, unknown>;
};

const MASTER_ROUTE_MAP: Record<string, string> = {
  category_master: '/masters/category-master',
  color_master: '/masters/color-master',
  country_master: '/masters/country-master',
  state_master: '/masters/state-master',
  tax_code_master: '/masters/tax-code-master',
  department_master: '/masters/department-master',
  cost_centre_master: '/masters/cost-centre-master',
  profit_centre_master: '/masters/profit-centre-master',
  employee_master: '/masters/employee-master',
  entity_master: '/masters/entity-master',
  currency_master: '/masters/currency-master',
  exchange_rate_master: '/masters/exchange-rate-master',
  user_master: '/masters/user-master',
  roles_master: '/masters/roles-master',
  uom_master: '/masters/uom-master',
  debit_note_reason_master: '/masters/debit-note-reason-master',
  item_category_master: '/masters/item-category-master',
  vendor_payment_terms_master: '/masters/vendor-payment-terms-master',
  product_master: '/masters/product-master',
  sku_master: '/masters/sku-master',
  size_master: '/masters/size-master',
  contract_master: '/masters/contract-master',
  vendor_master: '/vendors',
  vendor_group_master: '/masters/vendor-group-master',
  tds_section_master: '/masters/tds-section-master',
  location_master: '/masters/location-master',
  gl_code_master: '/masters/gl-code-master',
};

type ScrutinizerInsight = {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
};

function authHeaders(userId?: string): Record<string, string> {
  const key =
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('procinix.session.token')) ||
    import.meta.env.VITE_API_SECRET_KEY ||
    '';
  return {
    'Content-Type': 'application/json',
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
    ...(userId ? { 'x-user-id': userId } : {}),
  };
}

export default function MyApprovalsPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<ApprovalKPIs | null>(null);
  const [queue, setQueue] = useState<ApprovalItem[]>([]);
  const [moduleCounts, setModuleCounts] = useState<ModuleCounts | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [selectedMasterRecord, setSelectedMasterRecord] =
    useState<PendingMasterApprovalResponseItem | null>(null);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [panelRejecting, setPanelRejecting] = useState(false);
  const [panelRejectReason, setPanelRejectReason] = useState('');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const userId = user?.id;
      const queueRes = await fetch(
        `/api/approvals/queue?module=${activeTab === 'all' ? '' : activeTab}`,
        { headers: authHeaders(userId) }
      );
      setQueue(await queueRes.json());
    } catch (error) {
      console.error('Failed to fetch approval queue', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user?.id]);

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const userId = user?.id;
      const [kpisRes, countsRes] = await Promise.all([
        fetch(`/api/approvals/kpis?year=${new Date().getFullYear()}`, {
          headers: authHeaders(userId),
        }),
        fetch('/api/approvals/module-counts', { headers: authHeaders(userId) }),
      ]);
      setKpis(await kpisRes.json());
      setModuleCounts(await countsRes.json());
    } catch (error) {
      console.error('Failed to fetch approval metrics', error);
    } finally {
      setMetricsLoading(false);
    }
  }, [user?.id]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchQueue(), fetchMetrics()]);
  }, [fetchMetrics, fetchQueue]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    const interval = setInterval(fetchQueue, 60000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const refreshAfterAction = useCallback(async () => {
    await Promise.all([fetchQueue(), fetchMetrics()]);
  }, [fetchMetrics, fetchQueue]);

  const handleApprove = async (id: string) => {
    if (actionBusyId) return;
    setActionBusyId(id);
    try {
      const res = await fetch(`/api/approvals/${id}/approve`, {
        method: 'POST',
        headers: authHeaders(user?.id),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        alert(`Approve failed${text ? `: ${text}` : ''}`);
        return;
      }
      setQueue((q) => q.filter((item) => item.id !== id));
      if (selectedApproval?.id === id) {
        closeDetailDrawer();
      }
      await refreshAfterAction();
    } catch (error) {
      alert(`Approve failed: ${String(error)}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    if (actionBusyId) return;
    setActionBusyId(id);
    try {
      const res = await fetch(`/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: authHeaders(user?.id),
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        alert(`Reject failed${text ? `: ${text}` : ''}`);
        return;
      }
      setQueue((q) => q.filter((item) => item.id !== id));
      if (selectedApproval?.id === id) {
        closeDetailDrawer();
      }
      await refreshAfterAction();
    } catch (error) {
      alert(`Reject failed: ${String(error)}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    const res = await fetch('/api/approvals/bulk-approve', {
      method: 'POST',
      headers: authHeaders(user?.id),
      body: JSON.stringify({ approval_ids: selectedIds }),
    });
    if (!res.ok) {
      alert('Bulk approve failed');
      return;
    }
    setQueue((q) => q.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    await refreshAfterAction();
  };

  const handleToggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((entry) => entry !== id)));
  }, []);

  const handleExport = () => {
    const header = ['ID', 'Module', 'Ref', 'Vendor', 'Amount', 'AgeHours', 'Priority', 'Status'];
    const rows = queue.map((item) => [
      item.id,
      item.module,
      item.invoice_number || item.po_number || item.reference_id,
      item.vendor_legal_name || '',
      item.display_amount || 0,
      item.age_hours || 0,
      item.priority,
      item.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `approvals-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseMasterReference = (referenceId?: string) => {
    if (!referenceId || !referenceId.includes(':')) return null;
    const [masterKey, ...rest] = referenceId.split(':');
    const recordId = rest.join(':');
    if (!masterKey || !recordId) return null;
    return { masterKey, recordId };
  };

  const formatFieldLabel = (field: string) =>
    field
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\w/, (char) => char.toUpperCase());

  const formatFieldValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const handleView = async (item: ApprovalItem) => {
    setDrawerClosing(false);
    setPanelRejecting(false);
    setPanelRejectReason('');
    setSelectedMasterRecord(null);

    if (item.module !== 'master_update') return;

    const parsed = parseMasterReference(item.reference_id);
    if (!parsed) return;
    const masterRoute = MASTER_ROUTE_MAP[parsed.masterKey];
    if (masterRoute) {
      sessionStorage.setItem(
        'masterApprovalReviewContext',
        JSON.stringify({
          fromApprovals: true,
          approvalId: item.id,
          recordId: parsed.recordId,
          masterKey: parsed.masterKey,
          route: masterRoute,
          savedAt: Date.now(),
        })
      );
      const url = `${masterRoute}?fromApprovals=1&approvalId=${encodeURIComponent(item.id)}&recordId=${encodeURIComponent(parsed.recordId)}`;
      window.location.assign(url);
      return;
    }

    setSelectedApproval(item);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    try {
      const response = await fetch('/api/master-approvals/pending', {
        headers: authHeaders(user?.id),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        success?: boolean;
        data?: PendingMasterApprovalResponseItem[];
      };
      const matched = (payload.data || []).find(
        (entry) =>
          entry.masterKey === parsed.masterKey && String(entry.recordId) === String(parsed.recordId)
      );
      if (matched) {
        setSelectedMasterRecord(matched);
      }
    } catch (error) {
      console.warn('Failed to fetch full master approval record', error);
    }
  };

  const closeDetailDrawer = () => {
    setDrawerClosing(true);
    window.setTimeout(() => {
      setSelectedApproval(null);
      setSelectedMasterRecord(null);
      setDrawerClosing(false);
      setPanelRejecting(false);
      setPanelRejectReason('');
    }, 180);
  };

  const detailModuleLabel = (moduleName: string) => {
    const map: Record<string, string> = {
      ap_invoice: 'AP Invoice',
      non_po_invoice: 'AP Invoice',
      purchase_order: 'Purchase Order',
      payment: 'Payment',
      master_update: 'Master Update',
      vendor_onboarding: 'Vendor Onboarding',
      vendor_advance: 'Vendor Advance',
    };
    return map[moduleName] || moduleName;
  };

  const msmeAlerts = useMemo(
    () => queue.filter((item) => item.msme_info?.is_critical || item.msme_info?.is_warning),
    [queue]
  );
  const slaBreaches = useMemo(() => queue.filter((item) => item.sla_info?.breached), [queue]);
  const earliestMSMEDays =
    msmeAlerts.length > 0
      ? Math.min(...msmeAlerts.map((item) => item.msme_info?.days_remaining || 999))
      : 0;
  const masterRecordEntries = useMemo(() => {
    if (!selectedMasterRecord?.record) return [];
    const hiddenFields = new Set([
      'originalData',
      'entityMappings',
      'approvalStatus',
      'createdAt',
      'updatedAt',
    ]);
    return Object.entries(selectedMasterRecord.record)
      .filter(([key]) => !hiddenFields.has(key))
      .map(([key, value]) => ({
        key,
        label: formatFieldLabel(key),
        value: formatFieldValue(value),
      }));
  }, [selectedMasterRecord]);
  const masterRecordByKey = useMemo(() => {
    const out: Record<string, unknown> = {};
    if (!selectedMasterRecord?.record) return out;
    for (const [k, v] of Object.entries(selectedMasterRecord.record)) out[k] = v;
    return out;
  }, [selectedMasterRecord]);

  const scrutinizerInsights = useMemo<ScrutinizerInsight[]>(() => {
    if (!selectedMasterRecord) return [];
    const r = masterRecordByKey;
    const insights: ScrutinizerInsight[] = [];
    const key = selectedMasterRecord.masterKey;

    const requiredLikely = ['code', 'name', 'legalName', 'country', 'status', 'approvalStatus'];
    const missing = requiredLikely.filter((field) => {
      if (!(field in r)) return false;
      const value = r[field];
      return value === null || value === undefined || String(value).trim() === '';
    });
    if (missing.length > 0) {
      insights.push({
        severity: 'high',
        title: 'Required field gap detected',
        detail: `Review missing/blank fields: ${missing.join(', ')}.`,
      });
    }

    if (key === 'entity_master') {
      const country = String(r.country || '');
      const region = String(r.region || '');
      const pan = String(r.panNumber || '');
      const taxRegime = String(r.taxRegime || '');
      if (country === 'India' && region && region !== 'India') {
        insights.push({
          severity: 'high',
          title: 'Region-country mismatch',
          detail: 'Country is India but region is not India.',
        });
      }
      if (country !== 'India' && pan) {
        insights.push({
          severity: 'medium',
          title: 'PAN filled for non-India entity',
          detail: 'Verify PAN applicability for this jurisdiction.',
        });
      }
      if (country === 'India' && taxRegime && taxRegime !== 'GST') {
        insights.push({
          severity: 'medium',
          title: 'Unexpected tax regime',
          detail: `Entity is India based but tax regime is ${taxRegime}.`,
        });
      }
      if (!r.currency) {
        insights.push({
          severity: 'high',
          title: 'Currency missing',
          detail: 'Entity currency is blank; transactions may fail.',
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        severity: 'low',
        title: 'No critical anomalies detected',
        detail: 'Record appears structurally consistent for approval review.',
      });
    }
    return insights;
  }, [selectedMasterRecord, masterRecordByKey]);

  return (
    <div className="min-h-screen bg-[var(--color-cloud)] p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-semibold text-[var(--color-ink)]">My Approvals</h1>
          <p className="text-sm text-[var(--color-mercury-grey)]">
            Consolidated from AP Invoices, Purchase Orders, Payments, Vendor Onboarding & Masters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--color-teal-tint)] px-3 py-1 text-xs font-semibold text-[var(--color-teal-dark)]">
            YTD {new Date().getFullYear()} · As of {new Date().toLocaleDateString('en-IN')}
          </span>
          <button
            type="button"
            className="rounded-md border border-[var(--color-silver)] bg-white px-3 py-1.5 text-sm"
            onClick={handleExport}
          >
            Export
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--color-silver)] bg-white px-3 py-1.5 text-sm disabled:opacity-50"
            disabled={selectedIds.length === 0}
            onClick={handleBulkApprove}
          >
            Bulk approve
          </button>
        </div>
      </div>

      {Boolean((kpis?.msme_pending_count || 0) > 0) && (
        <MSMEAlertBanner
          alertCount={kpis?.msme_pending_count || 0}
          earliestDeadlineDays={earliestMSMEDays > 0 ? earliestMSMEDays : 15}
          onApproveFirst={() => setActiveTab('ap_invoice')}
        />
      )}
      <UrgentSLABanner breachedCount={slaBreaches.length} onReview={() => setActiveTab('all')} />

      {kpis && (
        <>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-mercury-grey)]">
            My approval performance
          </p>
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-5">
            <PerformanceKPICard
              variant="total"
              icon="✅"
              label="Total approved YTD"
              value={String(kpis.total_approvals_ytd)}
              trend="+15% vs last year"
              trendDirection="up"
            />
            <PerformanceKPICard
              variant="on-time"
              icon="🎯"
              label="On-time approval rate"
              value={`${kpis.on_time_rate}%`}
              trend={`${kpis.on_time_count} of ${kpis.total_approvals_ytd} on time`}
              trendDirection="up"
            />
            <PerformanceKPICard
              variant="avg-time"
              icon="⏱"
              label="Avg time per approval"
              value={`${kpis.avg_hours_per_approval}h`}
              trend={`${kpis.faster_than_team_percent}% faster than team`}
              trendDirection="up"
            />
            <PerformanceKPICard
              variant="rejections"
              icon="↩"
              label="Total rejections YTD"
              value={String(kpis.total_rejections)}
              trend={`${kpis.rejection_rate}% rejection rate`}
              trendDirection="down"
            />
            <PerformanceKPICard
              variant="value"
              icon="₹"
              label="Total value approved"
              value={new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(kpis.total_value_approved)}
              trend="+8% vs last year"
              trendDirection="up"
            />
          </div>
        </>
      )}

      {kpis && (
        <>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-mercury-grey)]">
            Action needed now
          </p>
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <ActionKPICard
              variant="pending"
              count={kpis.total_pending}
              label="Pending approvals"
              subtext="Awaiting your decision"
              badge="Pending"
              barPercent={kpis.total_pending ? (kpis.aging_count / kpis.total_pending) * 100 : 0}
              chips={[
                { label: 'AP invoices', count: moduleCounts?.ap_invoice || 0 },
                { label: 'Masters', count: moduleCounts?.master_update || 0 },
              ]}
            />
            <ActionKPICard
              variant="urgent"
              count={kpis.sla_breached_count}
              label="Aging > 2 days"
              subtext="SLA risk"
              badge="Urgent"
              barPercent={100}
              chips={[{ label: 'SLA risk', count: kpis.aging_count }]}
              onClick={() => setActiveTab('all')}
            />
            <ActionKPICard
              variant="msme"
              count={kpis.msme_pending_count}
              label="MSME pending"
              subtext="45-day legal exposure"
              badge="MSME"
              barPercent={
                kpis.msme_pending_count
                  ? (kpis.msme_deadline_alerts / kpis.msme_pending_count) * 100
                  : 0
              }
              chips={[{ label: 'Alerts', count: kpis.msme_deadline_alerts }]}
            />
            <ActionKPICard
              variant="aging"
              count={kpis.aging_count}
              label="Aging approvals"
              subtext="Crossed escalation threshold"
              badge="Aging"
              barPercent={kpis.total_pending ? (kpis.aging_count / kpis.total_pending) * 100 : 0}
              chips={[{ label: 'Pending', count: kpis.total_pending }]}
            />
          </div>
        </>
      )}

      {moduleCounts ? (
        <ApprovalTabs counts={moduleCounts} activeTab={activeTab} onChange={setActiveTab} />
      ) : metricsLoading ? (
        <div className="mb-3 rounded-lg border border-[var(--color-silver)] bg-white p-3 text-sm text-[var(--color-mercury-grey)]">
          Loading approval counts...
        </div>
      ) : null}
      <ApprovalsLegend />

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-lg border border-[var(--color-silver)] bg-white p-6 text-sm text-[var(--color-mercury-grey)]">
            Loading approvals...
          </div>
        ) : queue.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-silver)] bg-white p-6 text-sm text-[var(--color-mercury-grey)]">
            No pending approvals
          </div>
        ) : (
          queue.map((item) => (
            <ApprovalQueueItem
              key={item.id}
              item={item}
              selected={selectedIdSet.has(item.id)}
              onToggleSelect={handleToggleSelect}
              onApprove={handleApprove}
              onReject={handleReject}
              onView={handleView}
            />
          ))
        )}
      </div>

      {selectedApproval && (
        <div
          className={`rounded-xl border border-[var(--color-silver)] bg-white transition-opacity ${drawerClosing ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="border-b border-[var(--color-silver)] bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[var(--color-ink)]">
                  {detailModuleLabel(selectedApproval.module)} Review
                </p>
                <p className="text-sm text-[var(--color-mercury-grey)]">
                  {selectedApproval.invoice_number ||
                    selectedApproval.po_number ||
                    selectedApproval.reference_id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`approval-detail-status-badge ${selectedApproval.sla_info?.breached ? 'approval-detail-status-overdue' : 'approval-detail-status-pending'}`}
                >
                  {selectedApproval.sla_info?.breached ? 'OVERDUE' : 'Pending'}
                </span>
                <button
                  type="button"
                  className="approval-detail-back-btn"
                  onClick={closeDetailDrawer}
                >
                  ← Back to list
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[1.7fr_1fr]">
            <div className="pr-1">
              {selectedApproval.module !== 'master_update' && (
                <section className="approval-detail-section">
                  <p className="approval-detail-section-title">INVOICE / DOCUMENT DETAILS</p>
                  <div className="approval-detail-grid">
                    <p>
                      Invoice number:{' '}
                      <span>
                        {selectedApproval.invoice_number ||
                          selectedApproval.po_number ||
                          selectedApproval.reference_id}
                      </span>
                    </p>
                    <p>
                      Invoice date:{' '}
                      <span>
                        {selectedApproval.invoice_date
                          ? new Date(selectedApproval.invoice_date).toLocaleDateString('en-IN')
                          : '—'}
                      </span>
                    </p>
                    <p>
                      Amount:{' '}
                      <span>
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: selectedApproval.currency || 'INR',
                        }).format(selectedApproval.display_amount || 0)}{' '}
                        · {selectedApproval.currency || 'INR'}
                      </span>
                    </p>
                    <p>
                      Vendor: <span>{selectedApproval.vendor_legal_name || '—'}</span>
                    </p>
                  </div>
                </section>
              )}

              <section className="approval-detail-section">
                <p className="approval-detail-section-title">APPROVAL STATUS</p>
                <div className="approval-detail-grid">
                  <p>
                    Priority: <span>{selectedApproval.priority}</span>
                  </p>
                  <p>
                    Priority reason: <span>{selectedApproval.priority_reason || '—'}</span>
                  </p>
                  <p>
                    Submitted:{' '}
                    <span>{new Date(selectedApproval.created_at).toLocaleDateString('en-IN')}</span>
                  </p>
                  <p>
                    Age: <span>{selectedApproval.age_hours}h old</span>
                  </p>
                  <p>
                    SLA:{' '}
                    <span>
                      {selectedApproval.sla_info?.breached
                        ? `Breached at ${selectedApproval.sla_info?.breach_in_hours}h`
                        : 'Within SLA'}
                    </span>
                  </p>
                  <p>
                    Escalated: <span>{selectedApproval.sla_info?.breached ? 'Yes' : 'No'}</span>
                  </p>
                </div>
              </section>

              {(selectedApproval.msme_info || selectedApproval.msme_category) && (
                <section className="approval-detail-section">
                  <p className="approval-detail-section-title">MSME INFO</p>
                  <div className="approval-detail-grid">
                    <p>
                      MSME category:{' '}
                      <span>
                        {selectedApproval.msme_info?.msme_category ||
                          selectedApproval.msme_category ||
                          '—'}
                      </span>
                    </p>
                    <p>
                      45-day deadline:{' '}
                      <span>
                        {selectedApproval.msme_info?.deadline_date
                          ? new Date(selectedApproval.msme_info.deadline_date).toLocaleDateString(
                              'en-IN'
                            )
                          : '—'}
                      </span>
                    </p>
                    <p>
                      Days remaining:{' '}
                      <span>{selectedApproval.msme_info?.days_remaining ?? '—'}</span>
                    </p>
                  </div>
                </section>
              )}

              {selectedApproval.module === 'master_update' && (
                <section className="approval-detail-section">
                  <p className="approval-detail-section-title">ORIGINAL MASTER FORM (READ ONLY)</p>
                  {selectedMasterRecord ? (
                    <>
                      <div className="rounded-lg border border-[var(--color-silver)] bg-white p-3">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {masterRecordEntries.map((entry) => (
                            <div
                              key={entry.key}
                              className="rounded-md border border-[var(--color-silver)] bg-[#F9FBFD] px-3 py-2 text-xs"
                            >
                              <p className="text-[var(--color-mercury-grey)]">{entry.label}</p>
                              <p className="mt-1 break-all font-medium text-[var(--color-ink)]">
                                {entry.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      {MASTER_ROUTE_MAP[selectedMasterRecord.masterKey] && (
                        <div className="mt-3">
                          <button
                            type="button"
                            className="rounded-md border border-[var(--color-silver)] bg-white px-3 py-1.5 text-xs text-[var(--color-ink)]"
                            onClick={() =>
                              window.open(
                                MASTER_ROUTE_MAP[selectedMasterRecord.masterKey],
                                '_blank'
                              )
                            }
                          >
                            Open original master screen
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-[var(--color-mercury-grey)]">
                      Loading original master record details...
                    </p>
                  )}
                </section>
              )}
            </div>

            <aside className="rounded-lg border border-[#D7E8FF] bg-[#F6FAFF] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#1E3A8A]">
                Scrutinizer Insights
              </p>
              <div className="mt-3 space-y-2">
                {scrutinizerInsights.map((insight, index) => (
                  <div
                    key={`${insight.title}-${index}`}
                    className="rounded-md border border-[#DDE7F5] bg-white px-3 py-2"
                  >
                    <p
                      className={`text-xs font-semibold ${
                        insight.severity === 'high'
                          ? 'text-[#B91C1C]'
                          : insight.severity === 'medium'
                            ? 'text-[#B45309]'
                            : 'text-[#166534]'
                      }`}
                    >
                      {insight.severity.toUpperCase()} · {insight.title}
                    </p>
                    <p className="mt-1 text-xs text-[#475569]">{insight.detail}</p>
                  </div>
                ))}
              </div>
              {selectedMasterRecord && (
                <>
                  <p className="mt-3 text-xs text-[#475569]">
                    Master: <span className="font-medium">{selectedMasterRecord.masterKey}</span>
                  </p>
                  <p className="text-xs text-[#475569]">
                    Record ID:{' '}
                    <span className="font-medium break-all">{selectedMasterRecord.recordId}</span>
                  </p>
                </>
              )}
              <div className="mt-4 border-t border-[#D7E8FF] pt-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="approval-detail-approve-btn"
                    disabled={actionBusyId === selectedApproval.id}
                    style={
                      actionBusyId === selectedApproval.id
                        ? { opacity: 0.6, cursor: 'not-allowed' }
                        : undefined
                    }
                    onClick={async () => {
                      await handleApprove(selectedApproval.id);
                    }}
                  >
                    {actionBusyId === selectedApproval.id ? 'Approving…' : '✓ Approve'}
                  </button>
                  <button
                    type="button"
                    className="approval-detail-reject-btn"
                    disabled={actionBusyId === selectedApproval.id}
                    style={
                      actionBusyId === selectedApproval.id
                        ? { opacity: 0.6, cursor: 'not-allowed' }
                        : undefined
                    }
                    onClick={() => setPanelRejecting((prev) => !prev)}
                  >
                    ✗ Reject
                  </button>
                </div>
                {panelRejecting && (
                  <div className="mt-2 space-y-2">
                    <input
                      value={panelRejectReason}
                      onChange={(e) => setPanelRejectReason(e.target.value)}
                      className="approval-detail-reject-input"
                      placeholder="Enter reject reason"
                    />
                    <button
                      type="button"
                      className="approval-detail-reject-confirm"
                      disabled={!panelRejectReason.trim() || actionBusyId === selectedApproval.id}
                      onClick={async () => {
                        await handleReject(selectedApproval.id, panelRejectReason);
                      }}
                    >
                      {actionBusyId === selectedApproval.id ? 'Submitting…' : 'Submit rejection'}
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
