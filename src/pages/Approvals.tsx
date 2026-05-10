import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ApprovalItem, ApprovalKPIs, ModuleCounts } from '../types/approvals';

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

// ── Module → tab + badge config ─────────────────────────────────────────────
const TABS = [
  { key: 'all', label: 'All', modules: [] as string[] },
  { key: 'ap_invoice', label: 'AP Invoices', modules: ['ap_invoice', 'non_po_invoice'] },
  { key: 'purchase_order', label: 'Purchase Orders', modules: ['purchase_order'] },
  { key: 'master_update', label: 'Master Updates', modules: ['master_update'] },
  {
    key: 'vendor_advance',
    label: 'Vendor Advances',
    modules: ['vendor_advance', 'vendor_onboarding'],
  },
  { key: 'payment', label: 'Payments', modules: ['payment'] },
];

const MODULE_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  ap_invoice: { bg: '#EEEDFE', fg: '#3C3489', label: 'Invoice' },
  non_po_invoice: { bg: '#EEEDFE', fg: '#3C3489', label: 'Invoice' },
  purchase_order: { bg: '#E1F5EE', fg: '#085041', label: 'Purchase Order' },
  master_update: { bg: '#E6F1FB', fg: '#0C447C', label: 'Master Update' },
  vendor_advance: { bg: '#E1F5EE', fg: '#085041', label: 'Vendor Advance' },
  vendor_onboarding: { bg: '#E1F5EE', fg: '#085041', label: 'Vendor Onboarding' },
  payment: { bg: '#F1EFE8', fg: '#5F5E5A', label: 'Payment' },
};

function modulePill(module: string) {
  return MODULE_BADGE[module] || { bg: '#F1EFE8', fg: '#5F5E5A', label: module };
}

function priorityBadge(item: ApprovalItem): { bg: string; fg: string; label: string } {
  if (item.sla_info?.breached && item.sla_info.breach_in_hours > 0) {
    return { bg: '#FCEBEB', fg: '#791F1F', label: 'Overdue' };
  }
  if (item.priority === 'critical' || item.priority === 'high') {
    return { bg: '#FAEEDA', fg: '#633806', label: 'SLA risk' };
  }
  if (item.msme_info?.is_critical || item.msme_info?.is_warning) {
    return { bg: '#FAEEDA', fg: '#633806', label: 'MSME' };
  }
  return { bg: '#EAF3DE', fg: '#27500A', label: 'Normal' };
}

function riskBadge(item: ApprovalItem): { bg: string; fg: string; label: string } {
  if (item.sla_info?.breached || item.priority === 'critical') {
    return { bg: '#FCEBEB', fg: '#791F1F', label: 'High' };
  }
  if (item.priority === 'high' || item.msme_info?.is_critical) {
    return { bg: '#FAEEDA', fg: '#633806', label: 'Medium' };
  }
  return { bg: '#EAF3DE', fg: '#27500A', label: 'Low' };
}

function ageDot(hours: number): { color: string; label: string } {
  if (hours > 48) return { color: '#A32D2D', label: `${Math.round(hours)}h` };
  if (hours >= 24) return { color: '#BA7517', label: `${Math.round(hours)}h` };
  return { color: '#27500A', label: `${Math.round(hours)}h` };
}

function MetricCard({
  label,
  value,
  tone,
  right,
}: {
  label: string;
  value: number | string;
  tone: string;
  right?: boolean;
}) {
  return (
    <div
      style={{
        padding: '10px 16px',
        borderRight: right ? '0.5px solid var(--color-fog)' : 'none',
        background: '#FFFFFF',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--color-mercury-grey)',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: tone }}>{value}</div>
    </div>
  );
}

function BulkConfirmModal({
  items,
  highRiskCount,
  busy,
  onConfirm,
  onCancel,
}: {
  items: ApprovalItem[];
  highRiskCount: number;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const fmtINR = (amt: number | undefined, currency = 'INR') =>
    amt == null
      ? '—'
      : new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(amt);
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 50,
        }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#FFFFFF',
          borderRadius: 12,
          padding: 24,
          maxWidth: 480,
          width: '92vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 51,
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--color-ink)',
            margin: 0,
            marginBottom: 12,
          }}
        >
          Approve {items.length} item{items.length === 1 ? '' : 's'}?
        </h3>
        {highRiskCount > 0 && (
          <div
            style={{
              padding: '8px 12px',
              background: '#FAEEDA',
              border: '1px solid #E1B964',
              borderRadius: 6,
              fontSize: 11,
              color: '#633806',
              marginBottom: 12,
            }}
          >
            ⚠ {highRiskCount} high-risk item{highRiskCount === 1 ? '' : 's'} included. Review before
            approving.
          </div>
        )}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            border: '0.5px solid var(--color-fog)',
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          {items.map((it) => {
            const mod = modulePill(it.module);
            return (
              <div
                key={it.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr 0.8fr',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderBottom: '0.5px solid var(--color-fog)',
                  fontSize: 11,
                }}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                  }}
                >
                  {it.invoice_number || it.po_number || it.reference_id}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 600,
                    background: mod.bg,
                    color: mod.fg,
                    width: 'fit-content',
                  }}
                >
                  {mod.label}
                </span>
                <span style={{ textAlign: 'right', color: 'var(--color-ink)' }}>
                  {fmtINR(it.display_amount, it.currency || 'INR')}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              height: 32,
              padding: '0 14px',
              background: '#FFFFFF',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-silver)',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              height: 32,
              padding: '0 14px',
              background: '#0F6E56',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Approving…' : 'Confirm approval'}
          </button>
        </div>
      </div>
    </>
  );
}

function detailRouteFor(item: ApprovalItem): string | null {
  const ref = item.reference_id;
  if (item.module === 'ap_invoice' || item.module === 'non_po_invoice') {
    return `/invoices/${encodeURIComponent(ref)}`;
  }
  if (item.module === 'purchase_order') {
    return `/purchase-orders`;
  }
  if (item.module === 'vendor_advance') {
    return `/ap/vendor-advances`;
  }
  return null;
}

export default function MyApprovalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<ApprovalKPIs | null>(null);
  const [queue, setQueue] = useState<ApprovalItem[]>([]);
  const [moduleCounts, setModuleCounts] = useState<ModuleCounts | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [selectedMasterRecord, setSelectedMasterRecord] =
    useState<PendingMasterApprovalResponseItem | null>(null);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [panelRejecting, setPanelRejecting] = useState(false);
  const [panelRejectReason, setPanelRejectReason] = useState('');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const userId = user?.id;
      const queueRes = await fetch(
        `/api/approvals/queue?module=${activeTab === 'all' ? '' : activeTab}`,
        { headers: authHeaders(userId) }
      );
      const data = (await queueRes.json()) as ApprovalItem[];
      setQueue(Array.isArray(data) ? data : []);
      // Pre-check every row on every refresh — user can uncheck.
      setSelectedIds(Array.isArray(data) ? data.map((d) => d.id) : []);
    } catch (error) {
      console.error('Failed to fetch approval queue', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user?.id]);

  const fetchMetrics = useCallback(async () => {
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
    }
  }, [user?.id]);

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
    setBulkBusy(true);
    try {
      const res = await fetch('/api/approvals/bulk-approve', {
        method: 'POST',
        headers: authHeaders(user?.id),
        body: JSON.stringify({ approval_ids: selectedIds }),
      });
      if (!res.ok) {
        alert('Bulk approve failed');
        return;
      }
      const approvedCount = selectedIds.length;
      setQueue((q) => q.filter((item) => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      setShowBulkConfirm(false);
      setToast(`${approvedCount} item${approvedCount > 1 ? 's' : ''} approved`);
      window.setTimeout(() => setToast(null), 3000);
      await refreshAfterAction();
    } finally {
      setBulkBusy(false);
    }
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

    if (item.module !== 'master_update') {
      const route = detailRouteFor(item);
      if (route) {
        navigate(route);
        return;
      }
      // Fallback to inline drawer for unmapped modules
      setSelectedApproval(item);
      return;
    }

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

  // Tab counts (from moduleCounts when available, else fallback to queue groupings)
  const tabCount = (key: string): number => {
    if (key === 'all') return moduleCounts?.all ?? queue.length;
    const tab = TABS.find((t) => t.key === key);
    if (!tab) return 0;
    return tab.modules.reduce((sum, m) => sum + (moduleCounts?.[m as keyof ModuleCounts] || 0), 0);
  };

  // Visible queue rows (scope by active tab, since the API may already scope it
  // — this also keeps client-side filtering correct on the 'all' tab).
  const visibleQueue = useMemo(() => {
    if (activeTab === 'all') return queue;
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab) return queue;
    return queue.filter((item) => tab.modules.includes(item.module));
  }, [queue, activeTab]);

  // Pending / urgent / msme / approved-today counts for metric strip
  const pendingCount = visibleQueue.length;
  const urgentCount = visibleQueue.filter((it) => it.sla_info?.breached).length;
  const msmeCount = visibleQueue.filter(
    (it) => it.msme_info?.is_critical || it.msme_info?.is_warning
  ).length;
  const approvedTodayCount = kpis?.approved_today ?? 0;

  const selectedItems = useMemo(
    () => visibleQueue.filter((it) => selectedIdSet.has(it.id)),
    [visibleQueue, selectedIdSet]
  );
  const highRiskInBulk = selectedItems.filter(
    (it) => it.sla_info?.breached || it.priority === 'critical'
  ).length;

  const fmtINR = (amt: number | undefined, currency = 'INR') =>
    amt == null
      ? '—'
      : new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(amt);

  return (
    <div style={{ background: 'var(--color-background-primary, #FFFFFF)', minHeight: '100%' }}>
      {/* Header — teal accent left border, title left + Bulk approve right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: '#FFFFFF',
          borderBottom: '0.5px solid var(--color-fog)',
          borderLeft: '3px solid #1D9E75',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 15,
              fontWeight: 500,
              margin: 0,
              color: 'var(--color-ink)',
              lineHeight: 1.3,
            }}
          >
            My approvals
          </h1>
          <p
            style={{
              fontSize: 11,
              color: 'var(--color-mercury-grey)',
              margin: '2px 0 0 0',
            }}
          >
            {pendingCount} item{pendingCount === 1 ? '' : 's'} awaiting your decision
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleExport}
            style={{
              height: 28,
              padding: '0 12px',
              background: '#FFFFFF',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-silver)',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Export
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0 || bulkBusy}
            onClick={() => setShowBulkConfirm(true)}
            style={{
              height: 28,
              padding: '0 12px',
              background: '#0F6E56',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedIds.length === 0 ? 0.5 : 1,
            }}
          >
            Bulk approve{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </button>
        </div>
      </div>

      {/* Metric strip — 4 cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: '#FFFFFF',
          borderBottom: '0.5px solid var(--color-fog)',
        }}
      >
        <MetricCard
          label="Pending"
          value={pendingCount}
          tone={pendingCount > 0 ? '#BA7517' : 'var(--color-ink)'}
          right
        />
        <MetricCard
          label="Urgent / SLA"
          value={urgentCount}
          tone={urgentCount > 0 ? '#A32D2D' : 'var(--color-ink)'}
          right
        />
        {msmeCount > 0 ? (
          <MetricCard label="MSME exposure" value={msmeCount} tone="#BA7517" right />
        ) : (
          <MetricCard label="Approved today" value={approvedTodayCount} tone="#0F6E56" right />
        )}
        <MetricCard label="Approved today" value={approvedTodayCount} tone="#0F6E56" />
      </div>

      {/* Filter tabs */}
      <div
        style={{
          background: '#FFFFFF',
          borderBottom: '0.5px solid var(--color-fog)',
          padding: '0 20px',
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tabCount(tab.key);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                height: 36,
                padding: '0 12px',
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#0F6E56' : 'var(--color-mercury-grey)',
                border: 'none',
                borderBottom: isActive ? '2px solid #0F6E56' : '2px solid transparent',
                fontSize: 12,
                fontWeight: isActive ? 500 : 400,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: '#E6F1FB',
                    color: '#0C447C',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bulk-approve bar */}
      {selectedIds.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            background: '#E1F5EE',
            borderBottom: '0.5px solid #5DCAA5',
          }}
        >
          <span style={{ fontSize: 12, color: '#0F6E56', fontWeight: 500 }}>
            {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowBulkConfirm(true)}
              disabled={bulkBusy}
              style={{
                height: 26,
                padding: '0 12px',
                background: '#0F6E56',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Approve selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{
                background: 'transparent',
                color: '#0F6E56',
                border: 'none',
                fontSize: 12,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '28px 0.7fr 1.8fr 1fr 0.8fr 0.6fr 0.7fr 1fr',
            alignItems: 'center',
            padding: '6px 20px',
            background: 'var(--color-background-secondary)',
            borderBottom: '0.5px solid var(--color-fog)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            color: 'var(--color-mercury-grey)',
          }}
        >
          <span />
          <span>Priority</span>
          <span>Document</span>
          <span>Requestor / Vendor</span>
          <span style={{ textAlign: 'right' }}>Amount</span>
          <span>Age</span>
          <span>Risk</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-mercury-grey)' }}>
            Loading approvals…
          </div>
        ) : visibleQueue.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-mercury-grey)' }}>
            No pending approvals
          </div>
        ) : (
          visibleQueue.map((item) => {
            const checked = selectedIdSet.has(item.id);
            const pBadge = priorityBadge(item);
            const rBadge = riskBadge(item);
            const ageInfo = ageDot(item.age_hours || 0);
            const mod = modulePill(item.module);
            return (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 0.7fr 1.8fr 1fr 0.8fr 0.6fr 0.7fr 1fr',
                  alignItems: 'center',
                  padding: '10px 20px',
                  borderBottom: '0.5px solid var(--color-fog)',
                  fontSize: 12,
                  background: '#FFFFFF',
                }}
                className="listing-row-hover"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => handleToggleSelect(item.id, e.target.checked)}
                  style={{ accentColor: '#0F6E56' }}
                  aria-label={`Select ${item.invoice_number || item.reference_id}`}
                />
                <span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 600,
                      background: pBadge.bg,
                      color: pBadge.fg,
                    }}
                  >
                    {pBadge.label}
                  </span>
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--color-ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.invoice_number || item.po_number || item.reference_id}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--color-mercury-grey)',
                      marginTop: 2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: mod.bg,
                        color: mod.fg,
                        fontSize: 9,
                        fontWeight: 600,
                      }}
                    >
                      {mod.label}
                    </span>
                    <span>{item.vendor_legal_name || item.entity_name || ''}</span>
                  </div>
                </div>
                <div style={{ minWidth: 0, fontSize: 12, color: 'var(--color-ink)' }}>
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.submitted_by_name || '—'}
                  </div>
                  {item.entity_name && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--color-mercury-grey)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.entity_name}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--color-ink)',
                  }}
                >
                  {item.display_amount != null
                    ? fmtINR(item.display_amount, item.currency || 'INR')
                    : '—'}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-ink)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 6,
                      background: ageInfo.color,
                      display: 'inline-block',
                    }}
                  />
                  {ageInfo.label}
                </div>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 600,
                      background: rBadge.bg,
                      color: rBadge.fg,
                    }}
                  >
                    {rBadge.label}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    disabled={actionBusyId === item.id}
                    onClick={() => handleApprove(item.id)}
                    style={{
                      height: 26,
                      padding: '0 10px',
                      background: '#EAF3DE',
                      color: '#27500A',
                      border: '1px solid #97C459',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {actionBusyId === item.id ? '…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    disabled={actionBusyId === item.id}
                    onClick={() => {
                      const reason = window.prompt('Reject reason') || '';
                      if (reason.trim()) handleReject(item.id, reason.trim());
                    }}
                    style={{
                      height: 26,
                      padding: '0 10px',
                      background: '#FCEBEB',
                      color: '#791F1F',
                      border: '1px solid #F09595',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleView(item)}
                    style={{
                      height: 26,
                      padding: '0 10px',
                      background: '#FFFFFF',
                      color: 'var(--color-ink)',
                      border: '1px solid var(--color-silver)',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bulk approve confirmation modal */}
      {showBulkConfirm && (
        <BulkConfirmModal
          items={selectedItems}
          highRiskCount={highRiskInBulk}
          busy={bulkBusy}
          onConfirm={handleBulkApprove}
          onCancel={() => setShowBulkConfirm(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            padding: '10px 16px',
            background: '#0F6E56',
            color: '#FFFFFF',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            zIndex: 60,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toast}
        </div>
      )}

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
