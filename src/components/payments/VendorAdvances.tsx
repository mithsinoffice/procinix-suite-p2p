import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mysqlApiRequest } from '../../lib/mysql/client';
import { formatINR, formatINRCompact } from '../../lib/formatCurrency';
import {
  listingHeader,
  listingTitle,
  listingSubtitle,
  listingPrimaryBtn,
  listingPage,
  listingTh,
  listingTd,
  listingTdPrimary,
  listingTdMuted,
  metricStrip,
  metricCard,
  metricLabel,
  metricValue,
  metricSubLabel,
  badgeBase,
  rowActionBtn,
  formatStatusLabel,
  tableHeaderBg,
} from '../ui/listingStyles';

const ADVANCE_COLUMNS = '1.2fr 2fr 0.8fr 0.9fr 0.9fr 0.9fr 0.9fr 0.8fr';
import type {
  AdvanceStatus,
  AdvanceSummary,
  AdvanceType,
  VendorAdvance,
} from '../../types/payments';

// ============================================================================
// Helpers
// ============================================================================

const APPROVER_ROLES = new Set(['payment_approver', 'cfo', 'admin']);
function normaliseRole(role: string | null | undefined) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

const TYPE_OPTIONS: { key: AdvanceType; label: string }[] = [
  { key: 'travel', label: 'Travel' },
  { key: 'project', label: 'Project' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'relocation', label: 'Relocation' },
  { key: 'training', label: 'Training' },
  { key: 'conference', label: 'Conference' },
  { key: 'other', label: 'Other' },
];

const STATUS_PILL: Record<AdvanceStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-50 text-amber-700',
  approved: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-600',
  queued_for_payment: 'bg-cyan-50 text-cyan-700',
  paid: 'bg-purple-50 text-purple-700',
  settled: 'bg-green-50 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

type FilterKey =
  | 'all'
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'queued_for_payment'
  | 'paid'
  | 'overdue_settlement';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'pending_approval', label: 'Pending approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'queued_for_payment', label: 'In payment queue' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue_settlement', label: 'Overdue settlement' },
];

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function daysFromToday(iso: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  const t = new Date();
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / (24 * 60 * 60 * 1000));
}

function urgencyChipClass(iso: string): string {
  const d = daysFromToday(iso);
  if (d < 0) return 'bg-red-50 text-red-600';
  if (d <= 7) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function isOverdueSettlement(adv: VendorAdvance): boolean {
  return (
    adv.status === 'paid' && !!adv.settlementDueDate && daysFromToday(adv.settlementDueDate) < 0
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, n: number): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ============================================================================
// Form drawer
// ============================================================================

interface DrawerForm {
  vendorId: string;
  vendorName: string;
  advanceType: AdvanceType;
  purpose: string;
  amount: number;
  currency: string;
  requiredByDate: string;
  settlementDueDate: string;
  department: string;
  costCentre: string;
  supportingDocUrl: string;
  supportingDocName: string;
}

function emptyForm(): DrawerForm {
  return {
    vendorId: '',
    vendorName: '',
    advanceType: 'other',
    purpose: '',
    amount: 0,
    currency: 'INR',
    requiredByDate: addDaysIso(todayIso(), 7),
    settlementDueDate: addDaysIso(todayIso(), 37),
    department: '',
    costCentre: '',
    supportingDocUrl: '',
    supportingDocName: '',
  };
}

function fromAdvance(adv: VendorAdvance): DrawerForm {
  return {
    vendorId: adv.vendorId,
    vendorName: adv.vendorName,
    advanceType: adv.advanceType,
    purpose: adv.purpose,
    amount: adv.amount,
    currency: adv.currency,
    requiredByDate: adv.requiredByDate,
    settlementDueDate: adv.settlementDueDate || addDaysIso(adv.requiredByDate, 30),
    department: adv.department,
    costCentre: adv.costCentre,
    supportingDocUrl: adv.supportingDocUrl || '',
    supportingDocName: adv.supportingDocName || '',
  };
}

interface DrawerProps {
  advance: VendorAdvance | null;
  isCreate: boolean;
  isApprover: boolean;
  dualApprovalThreshold: number;
  requesterId: string;
  requesterName: string;
  onClose: () => void;
  onCreated: (a: VendorAdvance) => void;
  onUpdated: (a: VendorAdvance) => void;
  onAction: () => void;
}

function AdvanceDrawer({
  advance,
  isCreate,
  isApprover,
  dualApprovalThreshold,
  requesterId,
  requesterName,
  onClose,
  onCreated,
  onUpdated,
  onAction,
}: DrawerProps) {
  const [form, setForm] = useState<DrawerForm>(() =>
    advance ? fromAdvance(advance) : emptyForm()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [settledAmount, setSettledAmount] = useState<number>(advance?.amount ?? 0);

  // Auto-suggest settlement_due_date = required_by + 30 when required_by changes
  useEffect(() => {
    if (form.requiredByDate && !form.settlementDueDate) {
      setForm((prev) => ({ ...prev, settlementDueDate: addDaysIso(form.requiredByDate, 30) }));
    }
  }, [form.requiredByDate]);

  const editable = isCreate || (advance != null && advance.status === 'draft');
  const showApproval = !isCreate && advance?.status === 'pending_approval';
  const showSettlement = !isCreate && advance?.status === 'paid';
  const dualApprovalWarning = form.amount > dualApprovalThreshold;

  const update = <K extends keyof DrawerForm>(k: K, v: DrawerForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = (): string | null => {
    if (form.amount <= 0) return 'Amount must be greater than zero';
    if (!form.requiredByDate || form.requiredByDate < todayIso())
      return 'Required-by date must be on or after today';
    if (form.settlementDueDate && form.settlementDueDate <= form.requiredByDate)
      return 'Settlement due date must be after required-by date';
    if (form.purpose.trim().length < 10) return 'Purpose must be at least 10 characters';
    if (form.advanceType !== 'travel' && !form.supportingDocUrl)
      return 'Supporting document is required for non-travel advances';
    if (!form.vendorId || !form.vendorName) return 'Vendor is required';
    return null;
  };

  const submitForm = async (asDraft: boolean) => {
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        requesterId,
        requesterName,
      };
      let result: VendorAdvance;
      if (isCreate) {
        const res = await mysqlApiRequest<{ success: boolean; data: VendorAdvance }>(
          '/ap/advances',
          { method: 'POST', body: JSON.stringify(payload) }
        );
        result = res.data;
        onCreated(result);
      } else {
        const res = await mysqlApiRequest<{ success: boolean; data: VendorAdvance }>(
          `/ap/advances/${advance!.id}`,
          { method: 'PUT', body: JSON.stringify(payload) }
        );
        result = res.data;
        onUpdated(result);
      }
      if (!asDraft) {
        // Submit for approval
        await mysqlApiRequest(`/ap/advances/${result.id}/submit`, { method: 'POST' });
        onAction();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const callAction = async (
    path: 'approve' | 'reject' | 'queue' | 'settle' | 'cancel',
    extra?: Record<string, unknown>
  ) => {
    if (!advance) return;
    setBusy(true);
    setError(null);
    try {
      if (path === 'cancel') {
        await mysqlApiRequest(`/ap/advances/${advance.id}`, { method: 'DELETE' });
      } else {
        await mysqlApiRequest(`/ap/advances/${advance.id}/${path}`, {
          method: 'POST',
          body: JSON.stringify(extra ?? {}),
        });
      }
      onAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${path} failed`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden />
      <aside className="fixed top-0 right-0 bottom-0 w-[560px] bg-white z-50 shadow-xl flex flex-col">
        <header className="px-6 py-4 border-b-2 border-silver flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs text-mercury-grey">
              {advance ? advance.advanceRef : 'New advance'}
            </div>
            <h2 className="text-lg font-semibold text-ink truncate">
              {isCreate ? 'Create vendor advance' : `${advance!.vendorName}`}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-cloud rounded-lg">
            <X className="w-5 h-5 text-mercury-grey" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* Status pill for existing advance */}
          {!isCreate && advance && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STATUS_PILL[advance.status]}`}
              >
                {formatStatusLabel(advance.status)}
              </span>
              {advance.invoiceId && (
                <span className="text-xs text-mercury-grey">
                  Invoice: {advance.invoiceId.slice(0, 8)}
                </span>
              )}
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-mercury-grey text-xs mb-1">Vendor</label>
              <input
                type="text"
                value={form.vendorName}
                onChange={(e) => {
                  update('vendorName', e.target.value);
                  if (!form.vendorId)
                    update('vendorId', e.target.value.toLowerCase().replace(/\s+/g, '-'));
                }}
                disabled={!editable}
                placeholder="Vendor name"
                className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink disabled:bg-cloud"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-mercury-grey text-xs mb-1">Advance type</label>
                <select
                  value={form.advanceType}
                  onChange={(e) => update('advanceType', e.target.value as AdvanceType)}
                  disabled={!editable}
                  className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink disabled:bg-cloud"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-mercury-grey text-xs mb-1">Amount</label>
                <input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => update('amount', Number(e.target.value))}
                  disabled={!editable}
                  className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink disabled:bg-cloud"
                />
                {dualApprovalWarning && editable && (
                  <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Requires dual approval
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-mercury-grey text-xs mb-1">Purpose</label>
              <textarea
                value={form.purpose}
                onChange={(e) => update('purpose', e.target.value)}
                disabled={!editable}
                rows={3}
                placeholder="Min 10 characters describing the advance"
                className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink disabled:bg-cloud"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-mercury-grey text-xs mb-1">Required by</label>
                <input
                  type="date"
                  value={form.requiredByDate}
                  onChange={(e) => update('requiredByDate', e.target.value)}
                  disabled={!editable}
                  className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink disabled:bg-cloud"
                />
              </div>
              <div>
                <label className="block text-mercury-grey text-xs mb-1">Settlement due</label>
                <input
                  type="date"
                  value={form.settlementDueDate}
                  onChange={(e) => update('settlementDueDate', e.target.value)}
                  disabled={!editable}
                  className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink disabled:bg-cloud"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-mercury-grey text-xs mb-1">Department</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => update('department', e.target.value)}
                  disabled={!editable}
                  className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink disabled:bg-cloud"
                />
              </div>
              <div>
                <label className="block text-mercury-grey text-xs mb-1">Cost centre</label>
                <input
                  type="text"
                  value={form.costCentre}
                  onChange={(e) => update('costCentre', e.target.value)}
                  disabled={!editable}
                  className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink disabled:bg-cloud"
                />
              </div>
            </div>
            <div>
              <label className="block text-mercury-grey text-xs mb-1">
                Supporting document URL{' '}
                {form.advanceType !== 'travel' && <span className="text-red-600">*</span>}
              </label>
              <input
                type="text"
                value={form.supportingDocUrl}
                onChange={(e) => update('supportingDocUrl', e.target.value)}
                disabled={!editable}
                placeholder="https://… or uploads/<file>.pdf"
                className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink disabled:bg-cloud"
              />
              {form.advanceType === 'travel' && (
                <p className="text-xs text-mercury-grey mt-1">
                  Travel advances are exempt from the supporting-doc requirement.
                </p>
              )}
            </div>
          </div>

          {/* Approval panel */}
          {showApproval && isApprover && !rejectMode && (
            <div className="border-t-2 border-silver pt-4 space-y-2">
              <div className="font-semibold text-ink">Approval</div>
              <div className="text-xs text-mercury-grey">
                Submitted by {advance?.requesterName} on{' '}
                {advance ? new Date(advance.createdAt).toLocaleString('en-IN') : ''}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => callAction('approve')}
                  disabled={busy}
                  className="flex-1 px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setRejectMode(true)}
                  disabled={busy}
                  className="flex-1 px-4 py-2 border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
          {showApproval && isApprover && rejectMode && (
            <div className="border-t-2 border-silver pt-4 space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Reason for rejection (required)"
                className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectMode(false)}
                  className="flex-1 px-4 py-2 border-2 border-silver text-mercury-grey rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectReason.trim() || busy}
                  onClick={() => callAction('reject', { reason: rejectReason.trim() })}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  Confirm reject
                </button>
              </div>
            </div>
          )}
          {showApproval && !isApprover && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
              Awaiting approver review.
            </div>
          )}

          {/* Settlement panel */}
          {showSettlement && (
            <div className="border-t-2 border-silver pt-4 space-y-2">
              <div className="font-semibold text-ink">Settlement</div>
              <div className="text-xs text-mercury-grey">
                Settle the advance once the related expense documents are submitted.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-mercury-grey text-xs mb-1">Settled amount</label>
                  <input
                    type="number"
                    value={settledAmount}
                    onChange={(e) => setSettledAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => callAction('settle', { settledAmount })}
                disabled={busy || !(settledAmount > 0)}
                className="w-full px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Record settlement
              </button>
            </div>
          )}

          {/* Approved → Queue */}
          {!isCreate && advance?.status === 'approved' && (
            <div className="border-t-2 border-silver pt-4">
              <button
                type="button"
                onClick={() => callAction('queue')}
                disabled={busy}
                className="w-full px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Wallet className="inline w-4 h-4 mr-1" /> Queue for payment
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {editable && (
          <footer className="px-6 py-4 border-t-2 border-silver flex gap-2">
            {!isCreate && (
              <button
                type="button"
                onClick={() => callAction('cancel')}
                disabled={busy}
                className="px-4 py-2 border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm"
              >
                <Trash2 className="inline w-4 h-4 mr-1" /> Cancel draft
              </button>
            )}
            <button
              type="button"
              onClick={() => submitForm(true)}
              disabled={busy}
              className="flex-1 px-4 py-2 border-2 border-silver text-mercury-grey hover:bg-cloud rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={() => submitForm(false)}
              disabled={busy}
              className="flex-1 px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {busy ? 'Submitting…' : 'Save & submit'}
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}

// ============================================================================
// Summary strip
// ============================================================================

function SummaryStrip({
  summary,
  onJumpToQueue,
}: {
  summary: AdvanceSummary | null;
  onJumpToQueue: () => void;
}) {
  const totalCount = summary?.total ?? 0;
  const pendingCount = summary?.byStatus.pending_approval ?? 0;
  const queuedCount = summary?.byStatus.queued_for_payment ?? 0;
  const overdue = summary?.overdueSettlement ?? 0;
  return (
    <div style={metricStrip}>
      <div style={metricCard}>
        <div style={metricLabel}>Total advances</div>
        <div style={metricValue}>{totalCount}</div>
        <div style={metricSubLabel}>{formatINRCompact(summary?.totalAmount ?? 0)}</div>
      </div>
      <div style={metricCard}>
        <div style={metricLabel}>Pending approval</div>
        <div style={{ ...metricValue, color: pendingCount > 0 ? '#BA7517' : 'var(--color-ink)' }}>
          {pendingCount}
        </div>
      </div>
      <button
        type="button"
        onClick={onJumpToQueue}
        style={{
          ...metricCard,
          textAlign: 'left',
          cursor: 'pointer',
          border: 'none',
        }}
      >
        <div style={metricLabel}>Queued for payment</div>
        <div style={{ ...metricValue, color: queuedCount > 0 ? '#0F6E56' : 'var(--color-ink)' }}>
          {queuedCount}
        </div>
        <div style={{ ...metricSubLabel, color: '#0F6E56', textDecoration: 'underline' }}>
          Open Payment queue →
        </div>
      </button>
      <div style={metricCard}>
        <div style={metricLabel}>Overdue settlement</div>
        <div style={{ ...metricValue, color: overdue > 0 ? '#A32D2D' : 'var(--color-ink)' }}>
          {overdue}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export function VendorAdvances() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? null;
  const isApprover = APPROVER_ROLES.has(normaliseRole(user?.role));

  const [advances, setAdvances] = useState<VendorAdvance[]>([]);
  const [summary, setSummary] = useState<AdvanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [selected, setSelected] = useState<VendorAdvance | null>(null);
  const [dualApprovalThreshold, setDualApprovalThreshold] = useState(200000);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tenantId) return;
      setLoading(true);
      try {
        const [list, sum] = await Promise.all([
          mysqlApiRequest<{ success: boolean; data: VendorAdvance[] }>('/ap/advances'),
          mysqlApiRequest<{ success: boolean; data: AdvanceSummary }>('/ap/advances/summary'),
        ]);
        if (cancelled) return;
        setAdvances(list.data || []);
        setSummary(sum.data || null);
      } catch {
        if (!cancelled) {
          setAdvances([]);
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, reloadKey]);

  // Pull threshold from payment-settings (used by drawer's dual-approval warning)
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await mysqlApiRequest<{
          success: boolean;
          data: { flagDualApprovalThreshold?: number };
        }>('/ap/payment-settings');
        if (!cancelled && res.success && typeof res.data.flagDualApprovalThreshold === 'number') {
          setDualApprovalThreshold(res.data.flagDualApprovalThreshold);
        }
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const visible = useMemo(() => {
    let arr = advances;
    if (filter === 'overdue_settlement') {
      arr = arr.filter(isOverdueSettlement);
    } else if (filter !== 'all') {
      arr = arr.filter((a) => a.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (a) =>
          a.vendorName.toLowerCase().includes(q) ||
          a.advanceRef.toLowerCase().includes(q) ||
          a.purpose.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [advances, filter, search]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: advances.length,
      draft: 0,
      pending_approval: 0,
      approved: 0,
      queued_for_payment: 0,
      paid: 0,
      overdue_settlement: 0,
    };
    for (const a of advances) {
      if (a.status === 'draft') c.draft += 1;
      if (a.status === 'pending_approval') c.pending_approval += 1;
      if (a.status === 'approved') c.approved += 1;
      if (a.status === 'queued_for_payment') c.queued_for_payment += 1;
      if (a.status === 'paid') c.paid += 1;
      if (isOverdueSettlement(a)) c.overdue_settlement += 1;
    }
    return c;
  }, [advances]);

  const openCreate = () => {
    setSelected(null);
    setShowDrawer(true);
  };
  const openExisting = (adv: VendorAdvance) => {
    setSelected(adv);
    setShowDrawer(true);
  };

  return (
    <div style={listingPage}>
      <div style={listingHeader}>
        <div>
          <h1 style={listingTitle}>Vendor advances</h1>
          <p style={listingSubtitle}>
            Upfront payments to vendors. Approved advances flow into the Payment queue.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={refresh} style={rowActionBtn}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" onClick={openCreate} style={listingPrimaryBtn}>
            <Plus size={14} /> New advance
          </button>
        </div>
      </div>

      <SummaryStrip summary={summary} onJumpToQueue={() => navigate('/ap/payments/queue')} />

      <div
        style={{
          padding: '8px 24px',
          background: 'var(--color-background-secondary)',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  border: '0.5px solid',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  ...(active
                    ? { background: '#0F6E56', color: '#FFFFFF', borderColor: '#0F6E56' }
                    : {
                        background: '#FFFFFF',
                        color: 'var(--color-text-secondary)',
                        borderColor: 'var(--color-border-tertiary)',
                      }),
                }}
              >
                {f.label}
                <span style={{ fontSize: 11, opacity: 0.85 }}>{counts[f.key]}</span>
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-secondary)',
            }}
          />
          <input
            type="text"
            placeholder="Search vendor, ref, purpose…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 32,
              padding: '0 12px 0 32px',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 12,
              background: '#FFFFFF',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      </div>

      <div style={{ background: '#FFFFFF' }}>
        {/* Header — identical grid template to body rows */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: ADVANCE_COLUMNS,
            alignItems: 'center',
            background: tableHeaderBg,
            borderBottom: '0.5px solid var(--color-nav-panel-border)',
          }}
        >
          <div style={listingTh}>Ref</div>
          <div style={listingTh}>Vendor / Purpose</div>
          <div style={listingTh}>Type</div>
          <div style={{ ...listingTh, textAlign: 'right' }}>Amount</div>
          <div style={listingTh}>Required by</div>
          <div style={listingTh}>Settlement</div>
          <div style={listingTh}>Status</div>
          <div style={{ ...listingTh, textAlign: 'right' }}>Actions</div>
        </div>
        {loading ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--color-mercury-grey)',
              fontSize: 12,
            }}
          >
            <RefreshCw
              size={20}
              className="animate-spin"
              style={{ display: 'inline-block', marginRight: 8 }}
            />
            Loading advances…
          </div>
        ) : visible.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--color-mercury-grey)',
              fontSize: 12,
            }}
          >
            <CheckCircle size={20} style={{ display: 'inline-block', marginRight: 8 }} />
            {advances.length === 0 ? 'No advances yet' : 'No advances match filters'}
          </div>
        ) : (
          visible.map((adv) => {
            const overdue = isOverdueSettlement(adv);
            const requiredOverdue = daysFromToday(adv.requiredByDate) < 0;
            const nextStatusAction =
              adv.status === 'draft'
                ? { label: 'Submit' }
                : adv.status === 'pending_approval' && isApprover
                  ? { label: 'Approve' }
                  : adv.status === 'approved'
                    ? { label: 'Queue' }
                    : adv.status === 'paid'
                      ? { label: 'Settle' }
                      : null;
            const urgency = urgencyChipClass(adv.requiredByDate);
            const reqByBadge =
              urgency === 'bg-red-50 text-red-600'
                ? { background: '#FCEBEB', color: '#A32D2D' }
                : urgency === 'bg-amber-50 text-amber-700'
                  ? { background: '#FAEEDA', color: '#633806' }
                  : { background: '#F1EFE8', color: '#5F5E5A' };
            const statusBadge =
              adv.status === 'rejected'
                ? { background: '#FCEBEB', color: '#A32D2D' }
                : adv.status === 'pending_approval'
                  ? { background: '#FAEEDA', color: '#633806' }
                  : adv.status === 'approved' || adv.status === 'queued_for_payment'
                    ? { background: '#E6F1FB', color: '#0C447C' }
                    : adv.status === 'paid' || adv.status === 'settled'
                      ? { background: '#EAF3DE', color: '#27500A' }
                      : { background: '#F1EFE8', color: '#5F5E5A' };
            return (
              <div
                key={adv.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: ADVANCE_COLUMNS,
                  alignItems: 'center',
                  borderBottom: '0.5px solid var(--color-border-tertiary)',
                  background: '#FFFFFF',
                  minHeight: 52,
                }}
                className="listing-row-hover"
              >
                <div
                  style={{
                    ...listingTdPrimary,
                    fontFamily: 'monospace',
                    fontSize: 12,
                  }}
                >
                  {adv.advanceRef}
                </div>
                <div style={{ ...listingTd, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {adv.vendorName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {adv.purpose}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    {adv.requesterName}
                    {adv.department ? ` · ${adv.department}` : ''}
                  </div>
                </div>
                <div style={listingTd}>
                  <span
                    style={{
                      ...badgeBase,
                      background: '#E1F5EE',
                      color: '#085041',
                      textTransform: 'capitalize',
                    }}
                  >
                    {adv.advanceType}
                  </span>
                </div>
                <div style={{ ...listingTdPrimary, textAlign: 'right' }}>
                  {formatINR(adv.amount)}
                </div>
                <div
                  style={{
                    ...listingTd,
                    color: requiredOverdue ? '#A32D2D' : 'var(--color-text-primary)',
                    fontWeight: requiredOverdue ? 500 : 400,
                  }}
                >
                  <span style={{ ...badgeBase, ...reqByBadge }}>
                    {shortDate(adv.requiredByDate)}
                  </span>
                </div>
                <div
                  style={{
                    ...(overdue ? listingTdPrimary : listingTdMuted),
                    color: overdue ? '#A32D2D' : 'var(--color-text-secondary)',
                  }}
                >
                  {shortDate(adv.settlementDueDate)}
                  {overdue && (
                    <span style={{ marginLeft: 6, fontSize: 11 }}>
                      <Clock size={11} style={{ display: 'inline-block' }} /> overdue
                    </span>
                  )}
                </div>
                <div style={listingTd}>
                  <span style={{ ...badgeBase, ...statusBadge }}>
                    {formatStatusLabel(adv.status)}
                  </span>
                </div>
                <div
                  style={{
                    ...listingTd,
                    display: 'flex',
                    gap: 6,
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                  }}
                >
                  <button type="button" onClick={() => openExisting(adv)} style={rowActionBtn}>
                    View
                  </button>
                  {nextStatusAction && (
                    <button
                      type="button"
                      onClick={() => openExisting(adv)}
                      style={{
                        ...rowActionBtn,
                        background: '#0F6E56',
                        color: '#FFFFFF',
                        borderColor: '#0F6E56',
                        fontWeight: 500,
                      }}
                    >
                      {nextStatusAction.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showDrawer && (
        <AdvanceDrawer
          advance={selected}
          isCreate={selected == null}
          isApprover={isApprover}
          dualApprovalThreshold={dualApprovalThreshold}
          requesterId={user?.id ?? 'demo-user'}
          requesterName={user?.name ?? 'Demo User'}
          onClose={() => {
            setShowDrawer(false);
            setSelected(null);
          }}
          onCreated={(a) => setSelected(a)}
          onUpdated={(a) => setSelected(a)}
          onAction={() => {
            setShowDrawer(false);
            setSelected(null);
            refresh();
          }}
        />
      )}

      {/* Decorative — keep imports tree-shake-honest */}
      <span className="hidden">
        <Banknote />
        <FileText />
      </span>
    </div>
  );
}

export default VendorAdvances;
