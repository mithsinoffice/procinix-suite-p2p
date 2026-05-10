import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Building2,
  Clock,
  Flag,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mysqlApiRequest } from '../../lib/mysql/client';
import { formatINRCompact } from '../../lib/formatCurrency';
import type { PaymentMode, PaymentSettings, PayoutFormat } from '../../types/payments';

// ============================================================================
// Helpers
// ============================================================================

const ADMIN_ROLES = new Set(['admin']);
function normaliseRole(role: string | null | undefined) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
type Day = (typeof ALL_DAYS)[number];

const ROLE_OPTIONS: { key: string; label: string }[] = [
  { key: 'admin', label: 'Admin' },
  { key: 'cfo', label: 'CFO' },
  { key: 'payment_approver', label: 'Payment Approver' },
  { key: 'finance_manager', label: 'Finance Manager' },
];

function shallowEqual(a: PaymentSettings | null, b: PaymentSettings | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ks = Object.keys(a) as (keyof PaymentSettings)[];
  for (const k of ks) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function parseDays(s: string): Set<Day> {
  return new Set(
    s
      .split(',')
      .map((d) => d.trim().toUpperCase())
      .filter((d) => (ALL_DAYS as readonly string[]).includes(d)) as Day[]
  );
}
function joinDays(set: Set<Day>): string {
  return ALL_DAYS.filter((d) => set.has(d)).join(',');
}

function parseRoles(s: string): Set<string> {
  return new Set(s.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean));
}
function joinRoles(set: Set<string>): string {
  return [...set].join(',');
}

// ============================================================================
// Card primitive
// ============================================================================

function Card({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border-2 border-silver">
      <header className="px-6 py-4 border-b-2 border-silver flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg bg-cloud flex items-center justify-center text-mercury-grey">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-mercury-grey">{subtitle}</p>}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function NumberField({
  label,
  description,
  value,
  onChange,
  step = 1,
  suffix,
  disabled,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-ink font-medium">{label}</label>
      {description && <p className="text-xs text-mercury-grey mb-1">{description}</p>}
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-32 px-3 py-1.5 border-2 border-silver rounded-lg text-ink disabled:bg-cloud disabled:cursor-not-allowed"
        />
        {suffix && <span className="text-xs text-mercury-grey">{suffix}</span>}
      </div>
    </div>
  );
}

function CurrencyField({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-ink font-medium">{label}</label>
      {description && <p className="text-xs text-mercury-grey mb-1">{description}</p>}
      <div className="flex items-center gap-2">
        <span className="text-mercury-grey text-sm">₹</span>
        <input
          type="number"
          min={0}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-44 px-3 py-1.5 border-2 border-silver rounded-lg text-ink disabled:bg-cloud disabled:cursor-not-allowed"
        />
        <span className="text-xs text-mercury-grey">{formatINRCompact(value || 0)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================

export function PaymentSettings() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? null;
  const isAdmin = ADMIN_ROLES.has(normaliseRole(user?.role));

  const [loaded, setLoaded] = useState<PaymentSettings | null>(null);
  const [form, setForm] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const dirty = !shallowEqual(loaded, form);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tenantId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await mysqlApiRequest<{ success: boolean; data: PaymentSettings }>(
          '/ap/payment-settings'
        );
        if (cancelled) return;
        setLoaded(res.data);
        setForm(res.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, reloadKey]);

  // beforeunload warning when dirty
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const update = useCallback(<K extends keyof PaymentSettings>(k: K, v: PaymentSettings[K]) => {
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));
  }, []);

  const save = async () => {
    if (!form || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const patch: Partial<PaymentSettings> = {};
      const ks = Object.keys(form) as (keyof PaymentSettings)[];
      for (const k of ks) {
        if (loaded && form[k] !== loaded[k]) (patch as Record<string, unknown>)[k] = form[k];
      }
      const res = await mysqlApiRequest<{ success: boolean; data: PaymentSettings }>(
        '/ap/payment-settings',
        { method: 'PUT', body: JSON.stringify(patch) }
      );
      setLoaded(res.data);
      setForm(res.data);
      setToast('Settings saved');
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setShowResetConfirm(false);
    setSaving(true);
    setError(null);
    try {
      const res = await mysqlApiRequest<{ success: boolean; data: PaymentSettings }>(
        '/ap/payment-settings/reset',
        { method: 'POST' }
      );
      setLoaded(res.data);
      setForm(res.data);
      setToast('Reset to defaults');
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const dayState = useMemo(() => parseDays(form?.businessDays ?? ''), [form?.businessDays]);
  const roleState = useMemo(
    () => parseRoles(form?.paymentApproverRoles ?? ''),
    [form?.paymentApproverRoles]
  );

  const toggleDay = (d: Day) => {
    const next = new Set(dayState);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    if (form) update('businessDays', joinDays(next));
  };
  const toggleRole = (r: string) => {
    const next = new Set(roleState);
    if (next.has(r)) next.delete(r);
    else next.add(r);
    if (form) update('paymentApproverRoles', joinRoles(next));
  };

  if (loading || !form) {
    return (
      <div className="p-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border-2 border-silver rounded-xl p-6 animate-pulse">
            <div className="h-5 bg-silver rounded w-48 mb-3" />
            <div className="h-4 bg-cloud rounded w-3/4 mb-2" />
            <div className="h-4 bg-cloud rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const disabled = !isAdmin || saving;

  return (
    <div className="p-8 space-y-4 pb-24">
      <div>
        <h1 className="text-3xl font-semibold text-ink mb-1">Payment settings</h1>
        <p className="text-mercury-grey">
          Risk-flag thresholds, business hours and payment defaults — applied tenant-wide.
        </p>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-800">Read-only view</div>
            <div className="text-sm text-amber-700/90">
              These settings can only be changed by an administrator. Contact your Procinix admin to
              update payment configuration.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-red-700">Error</div>
            <div className="text-sm text-red-600/80">{error}</div>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Card 1 — Risk flag thresholds */}
      <Card
        title="Risk flag thresholds"
        subtitle="Changes take effect on the next payment queue refresh"
        icon={<Flag className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <NumberField
            label="Bank account changed"
            description="Flag when vendor bank updated within N days"
            value={form.flagBankChangedDays}
            onChange={(v) => update('flagBankChangedDays', v)}
            suffix="days"
            disabled={disabled}
          />
          <NumberField
            label="Duplicate invoice"
            description="Flag duplicate invoices within N-day window"
            value={form.flagDuplicateInvDays}
            onChange={(v) => update('flagDuplicateInvDays', v)}
            suffix="days"
            disabled={disabled}
          />
          <NumberField
            label="Amount anomaly"
            description="Flag when invoice > N× vendor historical average"
            value={form.flagAmountAnomalyMultiplier}
            onChange={(v) => update('flagAmountAnomalyMultiplier', v)}
            step={0.1}
            suffix="× average"
            disabled={disabled}
          />
          <div>
            <label className="block text-sm text-ink font-medium">Invoice splitting</label>
            <p className="text-xs text-mercury-grey mb-1">
              Flag when same vendor has N+ invoices in M days
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.flagInvSplittingCount}
                onChange={(e) => update('flagInvSplittingCount', Number(e.target.value))}
                disabled={disabled}
                className="w-20 px-3 py-1.5 border-2 border-silver rounded-lg text-ink disabled:bg-cloud disabled:cursor-not-allowed"
              />
              <span className="text-xs text-mercury-grey">invoices in</span>
              <input
                type="number"
                value={form.flagInvSplittingDays}
                onChange={(e) => update('flagInvSplittingDays', Number(e.target.value))}
                disabled={disabled}
                className="w-20 px-3 py-1.5 border-2 border-silver rounded-lg text-ink disabled:bg-cloud disabled:cursor-not-allowed"
              />
              <span className="text-xs text-mercury-grey">days</span>
            </div>
          </div>
          <CurrencyField
            label="Dual approval threshold"
            description="Require dual approval above this amount"
            value={form.flagDualApprovalThreshold}
            onChange={(v) => update('flagDualApprovalThreshold', v)}
            disabled={disabled}
          />
          <CurrencyField
            label="Round number minimum"
            description="Flag round numbers above this amount"
            value={form.flagRoundNumberMin}
            onChange={(v) => update('flagRoundNumberMin', v)}
            disabled={disabled}
          />
          <NumberField
            label="Round number divisor"
            description="Flag amounts exactly divisible by this (e.g. 1000)"
            value={form.flagRoundNumberDivisor}
            onChange={(v) => update('flagRoundNumberDivisor', v)}
            disabled={disabled}
          />
        </div>
      </Card>

      {/* Card 2 — Business hours */}
      <Card
        title="Business hours"
        subtitle="Used by the 'after-hours approval' flag"
        icon={<Clock className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm text-ink font-medium">Start</label>
              <input
                type="time"
                value={(form.businessHoursStart || '09:00:00').slice(0, 5)}
                onChange={(e) => update('businessHoursStart', `${e.target.value}:00`)}
                disabled={disabled}
                className="px-3 py-1.5 border-2 border-silver rounded-lg text-ink disabled:bg-cloud disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm text-ink font-medium">End</label>
              <input
                type="time"
                value={(form.businessHoursEnd || '19:00:00').slice(0, 5)}
                onChange={(e) => update('businessHoursEnd', `${e.target.value}:00`)}
                disabled={disabled}
                className="px-3 py-1.5 border-2 border-silver rounded-lg text-ink disabled:bg-cloud disabled:cursor-not-allowed"
              />
            </div>
            <span className="text-xs text-mercury-grey pb-2">IST (UTC+5:30)</span>
          </div>
          <div>
            <label className="block text-sm text-ink font-medium mb-2">Working days</label>
            <div className="flex gap-1">
              {ALL_DAYS.map((d) => {
                const active = dayState.has(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    disabled={disabled}
                    className={[
                      'px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors',
                      active
                        ? 'bg-teal text-white border-teal'
                        : 'bg-white text-mercury-grey border-silver hover:border-mercury-grey',
                      disabled ? 'opacity-60 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {d.slice(0, 1) + d.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Card 3 — Payment defaults */}
      <Card
        title="Payment defaults"
        icon={<Banknote className="w-4 h-4" />}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-ink font-medium mb-2">Default payment mode</label>
            <div className="flex gap-2">
              {(['NEFT', 'RTGS', 'IMPS', 'UPI'] as PaymentMode[]).map((m) => (
                <label
                  key={m}
                  className={[
                    'flex items-center gap-2 px-3 py-1.5 border-2 rounded-lg cursor-pointer text-sm',
                    form.defaultPaymentMode === m
                      ? 'bg-teal/10 border-teal text-teal'
                      : 'bg-white border-silver text-mercury-grey hover:text-ink',
                    disabled ? 'opacity-60 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    checked={form.defaultPaymentMode === m}
                    onChange={() => update('defaultPaymentMode', m)}
                    disabled={disabled}
                    className="hidden"
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>
          <CurrencyField
            label="RTGS auto-select threshold"
            description="Auto-select RTGS for batches above this amount"
            value={form.rtgsThreshold}
            onChange={(v) => update('rtgsThreshold', v)}
            disabled={disabled}
          />
          <NumberField
            label="MSME warning lead time"
            description="Show MSME breach warning N days before 45-day limit"
            value={form.msmeWarningDays}
            onChange={(v) => update('msmeWarningDays', v)}
            suffix="days"
            disabled={disabled}
          />
        </div>
      </Card>

      {/* Card 4 — Approver configuration */}
      <Card
        title="Payment approver roles"
        subtitle="These roles can review and clear risk flags and approve payment batches"
        icon={<UserCheck className="w-4 h-4" />}
      >
        <div className="space-y-3">
          {roleState.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {[...roleState].map((r) => (
                <span
                  key={r}
                  className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium capitalize"
                >
                  {r.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((r) => {
              const checked = roleState.has(r.key);
              return (
                <label
                  key={r.key}
                  className="flex items-center gap-2 p-2 border-2 border-silver rounded-lg cursor-pointer hover:bg-cloud"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(r.key)}
                    disabled={disabled}
                  />
                  <span className="text-sm text-ink">{r.label}</span>
                  <span className="text-xs text-mercury-grey ml-auto">{r.key}</span>
                </label>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Card 5 — Payout file format */}
      <Card title="Default payout file format" icon={<Building2 className="w-4 h-4" />}>
        <div className="space-y-2">
          {(
            [
              {
                key: 'HDFC_BULK',
                title: 'HDFC Bulk Upload (.txt)',
                desc: 'Pipe-delimited format for HDFC Corporate NetBanking',
              },
              {
                key: 'ICICI_BULK',
                title: 'ICICI CIB Bulk (.csv)',
                desc: 'Comma-delimited format for ICICI Corporate Internet Banking',
              },
              {
                key: 'GENERIC_CSV',
                title: 'Generic CSV (.csv)',
                desc: 'Standard CSV with explicit date column, compatible with most banks',
              },
            ] as { key: PayoutFormat; title: string; desc: string }[]
          ).map((opt) => (
            <label
              key={opt.key}
              className={[
                'flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer',
                form.defaultPayoutFormat === opt.key
                  ? 'bg-teal/5 border-teal'
                  : 'bg-white border-silver hover:bg-cloud',
                disabled ? 'opacity-60 cursor-not-allowed' : '',
              ].join(' ')}
            >
              <input
                type="radio"
                checked={form.defaultPayoutFormat === opt.key}
                onChange={() => update('defaultPayoutFormat', opt.key)}
                disabled={disabled}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-ink">{opt.title}</div>
                <div className="text-xs text-mercury-grey">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Save bar — always at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-silver px-8 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Unsaved changes
            </span>
          )}
          {toast && (
            <span className="text-xs text-green-700 font-medium">{toast}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={saving}
              className="text-xs text-mercury-grey hover:text-red-600 hover:underline"
            >
              Reset to defaults
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || disabled}
            className="flex items-center gap-2 px-5 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setShowResetConfirm(false)}
            aria-hidden
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-[420px] max-w-[92vw] p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-ink">Reset all settings?</h3>
                <p className="text-sm text-mercury-grey">
                  All thresholds, business hours, payment defaults and approver roles will be
                  restored to their factory defaults. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 border-2 border-silver rounded-lg text-sm text-mercury-grey hover:bg-cloud"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        </>
      )}

      {/* Decorative — keeps tree-shaking honest */}
      <span className="hidden">
        <Shield />
        <Users />
      </span>
    </div>
  );
}

export default PaymentSettings;
