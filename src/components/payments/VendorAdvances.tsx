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
    adv.status === 'paid' &&
    !!adv.settlementDueDate &&
    daysFromToday(adv.settlementDueDate) < 0
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

  const editable =
    isCreate || (advance != null && advance.status === 'draft');
  const showApproval = !isCreate && advance?.status === 'pending_approval';
  const showSettlement = !isCreate && advance?.status === 'paid';
  const dualApprovalWarning = form.amount > dualApprovalThreshold;

  const update = <K extends keyof DrawerForm>(k: K, v: DrawerForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = (): string | null => {
    if (form.amount <= 0) return 'Amount must be greater than zero';
    if (!form.requiredByDate || form.requiredByDate < todayIso())
      return 'Required-by date must be on or after today';
    if (
      form.settlementDueDate &&
      form.settlementDueDate <= form.requiredByDate
    )
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
                {advance.status.replace('_', ' ')}
              </span>
              {advance.invoiceId && (
                <span className="text-xs text-mercury-grey">Invoice: {advance.invoiceId.slice(0, 8)}</span>
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
                  if (!form.vendorId) update('vendorId', e.target.value.toLowerCase().replace(/\s+/g, '-'));
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
                {form.advanceType !== 'travel' && (
                  <span className="text-red-600">*</span>
                )}
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
                  <label className="block text-mercury-grey text-xs mb-1">
                    Settled amount
                  </label>
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
    <div className="grid grid-cols-4 gap-4 mb-4">
      <div className="bg-white rounded-xl border-2 border-silver p-4">
        <div className="text-sm text-mercury-grey mb-1">Total advances</div>
        <div className="text-2xl font-semibold text-ink">{totalCount}</div>
        <div className="text-xs text-mercury-grey">{formatINRCompact(summary?.totalAmount ?? 0)}</div>
      </div>
      <div className="bg-white rounded-xl border-2 border-amber-200 p-4">
        <div className="text-sm text-amber-700 mb-1">Pending approval</div>
        <div className="text-2xl font-semibold text-amber-800">{pendingCount}</div>
      </div>
      <button
        type="button"
        onClick={onJumpToQueue}
        className="bg-white rounded-xl border-2 border-blue-200 p-4 text-left hover:bg-blue-50 transition-colors"
      >
        <div className="text-sm text-blue-700 mb-1">Queued for payment</div>
        <div className="text-2xl font-semibold text-blue-800">{queuedCount}</div>
        <div className="text-xs text-blue-600 underline">Open Payment queue →</div>
      </button>
      <div className="bg-white rounded-xl border-2 border-red-200 p-4">
        <div className="text-sm text-red-600 mb-1">Overdue settlement</div>
        <div className="text-2xl font-semibold text-red-700">{overdue}</div>
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
          mysqlApiRequest<{ success: boolean; data: AdvanceSummary }>(
            '/ap/advances/summary'
          ),
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
    <div className="p-8 bg-cloud min-h-screen">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-ink mb-1">Vendor advances</h1>
          <p className="text-mercury-grey">
            Upfront payments to vendors before goods or services are delivered. Approved advances
            flow into the Payment queue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="px-4 py-2 border-2 border-silver bg-white rounded-lg text-mercury-grey text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New advance
          </button>
        </div>
      </div>

      <SummaryStrip summary={summary} onJumpToQueue={() => navigate('/ap/payments/queue')} />

      <div className="bg-white rounded-xl border-2 border-silver mb-4 p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={[
                  'px-3 py-1.5 text-xs rounded-full border-2',
                  active
                    ? 'bg-teal text-white border-teal'
                    : 'bg-white border-silver text-mercury-grey hover:text-ink',
                ].join(' ')}
              >
                {f.label}
                <span className="ml-1.5 text-[10px] opacity-80">{counts[f.key]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mercury-grey" />
          <input
            type="text"
            placeholder="Search vendor, ref, purpose…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border-2 border-silver rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-silver overflow-hidden">
        <div className="grid grid-cols-[140px_2fr_1fr_120px_140px_140px_120px_36px] gap-3 px-4 py-2 bg-cloud border-b-2 border-silver text-xs uppercase font-semibold text-mercury-grey">
          <span>Ref</span>
          <span>Vendor / purpose</span>
          <span>Type</span>
          <span className="text-right">Amount</span>
          <span>Required by</span>
          <span>Settlement</span>
          <span>Status</span>
          <span />
        </div>
        {loading ? (
          <div className="py-12 text-center text-mercury-grey text-sm">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-teal" />
            Loading advances…
          </div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center text-mercury-grey text-sm">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            {advances.length === 0 ? 'No advances yet' : 'No advances match filters'}
          </div>
        ) : (
          visible.map((adv) => {
            const overdue = isOverdueSettlement(adv);
            return (
              <button
                key={adv.id}
                type="button"
                onClick={() => openExisting(adv)}
                className="w-full grid grid-cols-[140px_2fr_1fr_120px_140px_140px_120px_36px] items-center gap-3 px-4 py-3 border-b border-silver hover:bg-cloud text-sm text-left"
              >
                <span className="font-mono text-xs text-ink">{adv.advanceRef}</span>
                <div className="min-w-0">
                  <div className="text-ink font-medium truncate">{adv.vendorName}</div>
                  <div className="text-xs text-mercury-grey truncate">{adv.purpose}</div>
                  <div className="text-[10px] text-mercury-grey/70">
                    {adv.requesterName}
                    {adv.department ? ` · ${adv.department}` : ''}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cloud text-mercury-grey capitalize w-fit">
                  {adv.advanceType}
                </span>
                <span className="text-right font-medium text-ink">{formatINR(adv.amount)}</span>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium w-fit ${urgencyChipClass(adv.requiredByDate)}`}
                >
                  {shortDate(adv.requiredByDate)}
                </span>
                <span className={`text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-mercury-grey'}`}>
                  {shortDate(adv.settlementDueDate)}
                  {overdue && (
                    <span className="ml-1 inline-flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> overdue
                    </span>
                  )}
                </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium w-fit ${STATUS_PILL[adv.status]}`}
                >
                  {adv.status.replace('_', ' ')}
                </span>
                <ChevronRight className="w-4 h-4 text-mercury-grey justify-self-end" />
              </button>
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
