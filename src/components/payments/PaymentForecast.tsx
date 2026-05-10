import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Landmark,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { mysqlApiRequest } from '../../lib/mysql/client';
import { formatINR, formatINRCompact } from '../../lib/formatCurrency';
import type {
  ForecastChartPoint,
  ForecastGroupBy,
  ForecastResponse,
  ForecastStatusFilter,
  ForecastTableRow,
  PaymentQueueItem,
} from '../../types/payments';

// ============================================================================
// Date helpers (native — no date-fns dep)
// ============================================================================

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(base: string, days: number) {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function startOfMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
function endOfMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}
function startOfWeekIso(): string {
  const d = new Date();
  const day = (d.getUTCDay() || 7) - 1; // Mon=0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}
function endOfWeekIso(): string {
  return addDaysIso(startOfWeekIso(), 6);
}
function shortDateLabel(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// ============================================================================
// Preset config
// ============================================================================

type Preset = 'this_week' | 'this_month' | 'next_30' | 'custom';
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'this_week', label: 'This week' },
  { key: 'this_month', label: 'This month' },
  { key: 'next_30', label: 'Next 30 days' },
  { key: 'custom', label: 'Custom' },
];

function presetRange(p: Preset): { from: string; to: string } | null {
  if (p === 'this_week') return { from: startOfWeekIso(), to: endOfWeekIso() };
  if (p === 'this_month') return { from: startOfMonthIso(), to: endOfMonthIso() };
  if (p === 'next_30') return { from: todayIso(), to: addDaysIso(todayIso(), 30) };
  return null;
}

// ============================================================================
// Group-by config
// ============================================================================

const GROUP_BY_OPTIONS: { key: ForecastGroupBy; label: string }[] = [
  { key: 'due_date', label: 'Due date' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'department', label: 'Department' },
  { key: 'type', label: 'Payment type' },
  { key: 'priority', label: 'Priority' },
  { key: 'msme_critical', label: 'MSME / Critical' },
];

const STATUS_OPTIONS: { key: ForecastStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'partial', label: 'Partial' },
  { key: 'onhold', label: 'On hold' },
];

// ============================================================================
// Sub-components
// ============================================================================

function MetricCard({
  label,
  value,
  tone,
  sub,
  subLink,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'amber' | 'red' | 'green' | 'grey';
  sub?: string;
  subLink?: { to: string; label: string };
}) {
  const tones: Record<string, string> = {
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    red: 'text-red-600',
    green: 'text-green-700',
    grey: 'text-mercury-grey',
  };
  return (
    <div className="bg-white rounded-xl border-2 border-silver p-4">
      <div className="text-sm text-mercury-grey mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${tones[tone]}`}>{value}</div>
      {sub && (
        <div className="text-xs text-mercury-grey mt-1">
          {sub}
          {subLink && (
            <a href={subLink.to} className="ml-1 text-teal hover:underline">
              {subLink.label}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function DateRangeBar({
  preset,
  from,
  to,
  onPreset,
  onCustomFrom,
  onCustomTo,
}: {
  preset: Preset;
  from: string;
  to: string;
  onPreset: (p: Preset) => void;
  onCustomFrom: (v: string) => void;
  onCustomTo: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="w-4 h-4 text-mercury-grey" />
      <div className="inline-flex border-2 border-silver rounded-lg p-1 bg-white">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPreset(p.key)}
            className={[
              'px-3 py-1 text-xs rounded-md',
              preset === p.key ? 'bg-teal text-white' : 'text-mercury-grey hover:text-ink',
            ].join(' ')}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <>
          <input
            type="date"
            value={from}
            onChange={(e) => onCustomFrom(e.target.value)}
            className="px-2 py-1 border-2 border-silver rounded-md text-sm"
          />
          <span className="text-mercury-grey text-sm">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onCustomTo(e.target.value)}
            className="px-2 py-1 border-2 border-silver rounded-md text-sm"
          />
        </>
      )}
    </div>
  );
}

function MsmeCallout({
  msmeOutflow,
  vendorBreakdown,
}: {
  msmeOutflow: number;
  vendorBreakdown: { vendor: string; amount: number; earliestDue: string }[];
}) {
  if (!(msmeOutflow > 0)) return null;
  const top3 = vendorBreakdown.slice(0, 3);
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-amber-800">
            MSME obligations in this period: {formatINR(msmeOutflow)} across{' '}
            {vendorBreakdown.length} vendor{vendorBreakdown.length === 1 ? '' : 's'}
          </div>
          <div className="text-sm text-amber-700/80 mb-2">45-day MSMED Act limit applies</div>
          {top3.length > 0 && (
            <ul className="text-xs text-amber-800/90 space-y-0.5">
              {top3.map((v) => (
                <li key={v.vendor}>
                  <span className="font-medium">{v.vendor}</span> — {formatINR(v.amount)}, earliest
                  due {v.earliestDue ? shortDateLabel(v.earliestDue) : '—'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ForecastChart({
  data,
  loading,
}: {
  data: ForecastChartPoint[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="h-[280px] flex items-end gap-2 px-4 animate-pulse">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-silver rounded-t"
            style={{ height: `${20 + ((i * 17) % 60)}%` }}
          />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-mercury-grey">
        No outflow data in this period.
      </div>
    );
  }
  const chartData = data.map((d) => ({
    ...d,
    label: shortDateLabel(d.date),
  }));
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height={280} debounce={1}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
          <XAxis
            dataKey="label"
            style={{ fontSize: '11px', fill: 'var(--color-mercury-grey)' }}
          />
          <YAxis
            style={{ fontSize: '11px', fill: 'var(--color-mercury-grey)' }}
            tickFormatter={(v) => formatINRCompact(Number(v))}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const total = payload.reduce(
                (acc, p) => acc + (typeof p.value === 'number' ? p.value : 0),
                0
              );
              return (
                <div className="bg-white border-2 border-silver rounded-lg shadow-lg p-3 text-xs">
                  <div className="font-semibold text-ink mb-1">{label}</div>
                  <div className="text-mercury-grey mb-2">Total: {formatINR(total)}</div>
                  {payload.map((p) => (
                    <div key={p.dataKey} className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-ink capitalize">{p.dataKey as string}</span>
                      <span className="ml-auto font-medium text-ink">
                        {formatINR(Number(p.value) || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="critical" stackId="a" fill="#F87171" name="Critical" />
          <Bar dataKey="msme" stackId="a" fill="#FBBF24" name="MSME" />
          <Bar dataKey="standard" stackId="a" fill="#60A5FA" name="Standard" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ItemRow({ item }: { item: PaymentQueueItem }) {
  const dueLabel = item.due ? shortDateLabel(item.due) : '—';
  return (
    <div className="grid grid-cols-[2fr_80px_1fr_120px_100px] items-center gap-3 px-6 py-2 border-t border-silver text-sm">
      <div className="min-w-0">
        <div className="text-ink truncate">{item.ref}</div>
        <div className="text-xs text-mercury-grey truncate">{item.name}</div>
      </div>
      <span className="text-xs text-mercury-grey capitalize">{item.type}</span>
      <span className="text-right text-ink">{formatINR(item.amount)}</span>
      <span className="text-mercury-grey">{dueLabel}</span>
      <span className="text-xs capitalize text-mercury-grey">{item.status}</span>
    </div>
  );
}

function TableSection({
  rows,
  groupBy,
  loading,
}: {
  rows: ForecastTableRow[];
  groupBy: ForecastGroupBy;
  loading: boolean;
}) {
  type SortKey = 'totalAmount' | 'count' | 'earliestDue' | 'msmeAmount';
  const [sortBy, setSortBy] = useState<SortKey>('totalAmount');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortBy === 'totalAmount') return b.totalAmount - a.totalAmount;
      if (sortBy === 'count') return b.count - a.count;
      if (sortBy === 'earliestDue')
        return (a.earliestDue || '9999').localeCompare(b.earliestDue || '9999');
      if (sortBy === 'msmeAmount') return b.msmeAmount - a.msmeAmount;
      return 0;
    });
    return copy;
  }, [rows, sortBy]);

  const showMsmeCol = groupBy === 'vendor' || groupBy === 'msme_critical' || groupBy === 'department';
  const supportsExpand = groupBy !== 'due_date';
  const groupLabel = GROUP_BY_OPTIONS.find((o) => o.key === groupBy)?.label ?? '';

  function toggle(k: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-silver p-6 animate-pulse">
        <div className="h-4 bg-silver rounded w-32 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-cloud rounded mb-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-silver overflow-hidden">
      <div className="px-6 py-4 border-b-2 border-silver flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Forecast breakdown</h2>
        <span className="text-xs text-mercury-grey">By {groupLabel.toLowerCase()}</span>
      </div>
      {sortedRows.length === 0 ? (
        <div className="py-12 text-center text-mercury-grey text-sm">
          No payments due in this period
        </div>
      ) : (
        <>
          <div
            className={[
              'grid items-center gap-3 px-6 py-3 bg-cloud border-b-2 border-silver text-xs uppercase font-semibold text-mercury-grey',
              showMsmeCol
                ? 'grid-cols-[28px_2fr_80px_140px_140px_120px_120px_140px]'
                : 'grid-cols-[28px_2fr_80px_140px_140px_120px_120px]',
            ].join(' ')}
          >
            <span />
            <button
              type="button"
              onClick={() => setSortBy('count')}
              className="text-left hover:text-ink"
            >
              {groupLabel}
            </button>
            <button
              type="button"
              onClick={() => setSortBy('count')}
              className="text-right hover:text-ink"
            >
              Count
            </button>
            <button
              type="button"
              onClick={() => setSortBy('totalAmount')}
              className="text-right hover:text-ink"
            >
              Total
            </button>
            <span className="text-right">Outstanding</span>
            <button
              type="button"
              onClick={() => setSortBy('earliestDue')}
              className="text-left hover:text-ink"
            >
              Earliest
            </button>
            <span className="text-left">Latest</span>
            {showMsmeCol && (
              <button
                type="button"
                onClick={() => setSortBy('msmeAmount')}
                className="text-right hover:text-ink"
              >
                MSME
              </button>
            )}
          </div>

          {sortedRows.map((row) => {
            const isOpen = expanded.has(row.groupKey);
            const canExpand = supportsExpand && row.items && row.items.length > 0;
            return (
              <div key={row.groupKey}>
                <button
                  type="button"
                  onClick={() => canExpand && toggle(row.groupKey)}
                  className={[
                    'w-full grid items-center gap-3 px-6 py-3 border-b border-silver text-sm text-left',
                    canExpand ? 'hover:bg-cloud cursor-pointer' : 'cursor-default',
                    showMsmeCol
                      ? 'grid-cols-[28px_2fr_80px_140px_140px_120px_120px_140px]'
                      : 'grid-cols-[28px_2fr_80px_140px_140px_120px_120px]',
                  ].join(' ')}
                >
                  <span className="text-mercury-grey">
                    {canExpand ? (
                      isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )
                    ) : null}
                  </span>
                  <span className="min-w-0 flex items-center gap-2">
                    <span className="text-ink font-medium truncate">{row.groupValue}</span>
                    {groupBy === 'vendor' && row.msmeAmount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                        MSME
                      </span>
                    )}
                  </span>
                  <span className="text-right text-mercury-grey">{row.count}</span>
                  <span className="text-right text-ink font-medium">
                    {formatINR(row.totalAmount)}
                  </span>
                  <span className="text-right text-mercury-grey">
                    {formatINR(row.outstandingAmount)}
                  </span>
                  <span className="text-mercury-grey">
                    {row.earliestDue ? shortDateLabel(row.earliestDue) : '—'}
                  </span>
                  <span className="text-mercury-grey">
                    {row.latestDue ? shortDateLabel(row.latestDue) : '—'}
                  </span>
                  {showMsmeCol && (
                    <span className="text-right text-amber-700">
                      {row.msmeAmount > 0 ? formatINR(row.msmeAmount) : '—'}
                    </span>
                  )}
                </button>
                {isOpen && canExpand && row.items && (
                  <div className="bg-cloud/40">
                    {row.items.map((it) => (
                      <ItemRow key={it.id} item={it} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================

export function PaymentForecast() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? null;
  const entityId = user?.currentPlatformEntityId ?? null;

  const [preset, setPreset] = useState<Preset>('this_month');
  const [from, setFrom] = useState<string>(() => startOfMonthIso());
  const [to, setTo] = useState<string>(() => endOfMonthIso());
  const [groupBy, setGroupBy] = useState<ForecastGroupBy>('due_date');
  const [status, setStatus] = useState<ForecastStatusFilter>('unpaid');

  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Apply a preset → recompute dates
  const applyPreset = useCallback((p: Preset) => {
    setPreset(p);
    const r = presetRange(p);
    if (r) {
      setFrom(r.from);
      setTo(r.to);
    }
  }, []);

  // Auto-fetch when from/to/groupBy/status/tenant change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tenantId || !from || !to) {
        setForecast(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('tenantId', tenantId);
        if (entityId) params.set('entityId', entityId);
        params.set('from', from);
        params.set('to', to);
        params.set('groupBy', groupBy);
        params.set('status', status);
        const res = await mysqlApiRequest<{ success: boolean; data?: never } & ForecastResponse>(
          `/ap/payment-forecast?${params.toString()}`
        );
        if (!cancelled) setForecast(res);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load forecast');
          setForecast(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, entityId, from, to, groupBy, status, reloadKey]);

  // MSME breakdown for callout (top vendors by MSME amount)
  const msmeVendorBreakdown = useMemo(() => {
    if (!forecast) return [];
    if (forecast.meta.groupBy === 'vendor') {
      return forecast.table
        .filter((r) => r.msmeAmount > 0)
        .map((r) => ({
          vendor: r.groupValue,
          amount: r.msmeAmount,
          earliestDue: r.earliestDue,
        }))
        .sort((a, b) => b.amount - a.amount);
    }
    // groupBy is not vendor — derive from any items[] we have
    const map = new Map<string, { vendor: string; amount: number; earliestDue: string }>();
    for (const row of forecast.table) {
      for (const it of row.items ?? []) {
        if (!it.isMSME) continue;
        const cur = map.get(it.name) ?? {
          vendor: it.name,
          amount: 0,
          earliestDue: it.due,
        };
        cur.amount += it.amount;
        if (!cur.earliestDue || (it.due && it.due < cur.earliestDue)) cur.earliestDue = it.due;
        map.set(it.name, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [forecast]);

  const meta = forecast?.meta;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-ink mb-1">Payment forecast</h1>
          <p className="text-mercury-grey">
            Cash outflow projection by due date, with MSME and statutory breakdowns.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border-2 border-silver bg-white rounded-lg text-mercury-grey"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Controls bar */}
      <div className="bg-white rounded-xl border-2 border-silver p-4 mb-4 flex flex-wrap items-center gap-4">
        <DateRangeBar
          preset={preset}
          from={from}
          to={to}
          onPreset={applyPreset}
          onCustomFrom={(v) => {
            setPreset('custom');
            setFrom(v);
          }}
          onCustomTo={(v) => {
            setPreset('custom');
            setTo(v);
          }}
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-mercury-grey">Group by</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as ForecastGroupBy)}
            className="px-2 py-1.5 border-2 border-silver rounded-lg text-sm bg-white"
          >
            {GROUP_BY_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-mercury-grey">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ForecastStatusFilter)}
            className="px-2 py-1.5 border-2 border-silver rounded-lg text-sm bg-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="ml-auto px-4 py-1.5 bg-teal hover:bg-teal-dark text-white text-sm rounded-lg"
        >
          Apply
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <MetricCard
          label="Total outflow"
          value={meta ? formatINRCompact(meta.totalOutflow) : '—'}
          tone="blue"
        />
        <MetricCard
          label="MSME obligations"
          value={meta ? formatINRCompact(meta.msmeOutflow) : '—'}
          tone="amber"
          sub="45-day compliance"
        />
        <MetricCard
          label="Critical / statutory"
          value={meta ? formatINRCompact(meta.criticalOutflow) : '—'}
          tone="red"
        />
        <MetricCard
          label="Net cash position"
          value={
            meta && meta.netCashPosition !== null ? formatINRCompact(meta.netCashPosition) : '—'
          }
          tone={
            meta && meta.netCashPosition !== null
              ? meta.netCashPosition >= 0
                ? 'green'
                : 'red'
              : 'grey'
          }
          sub={meta && !meta.bankConnected ? 'Bank balance not connected' : undefined}
          subLink={
            meta && !meta.bankConnected
              ? { to: '/ap/payments/banking', label: '→ Connect bank' }
              : undefined
          }
        />
      </div>

      {/* MSME callout */}
      <MsmeCallout
        msmeOutflow={meta?.msmeOutflow ?? 0}
        vendorBreakdown={msmeVendorBreakdown}
      />

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <div className="font-semibold text-red-700">Failed to load forecast</div>
              <div className="text-sm text-red-600/80">{error}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl border-2 border-silver p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-mercury-grey" />
            Daily cash outflow
          </h2>
          {forecast && forecast.chart.length > 0 && (
            <span className="text-xs text-mercury-grey">
              {forecast.chart.length} bucket{forecast.chart.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <ForecastChart data={forecast?.chart ?? []} loading={loading} />
      </div>

      {/* Table */}
      <TableSection rows={forecast?.table ?? []} groupBy={groupBy} loading={loading} />

      {/* Connect-bank ghost row (decorative; nav button) */}
      {meta && !meta.bankConnected && (
        <button
          type="button"
          onClick={() => navigate('/ap/payments/banking')}
          className="mt-4 w-full bg-white border-2 border-dashed border-silver rounded-xl p-4 flex items-center justify-center gap-2 text-mercury-grey hover:text-ink hover:border-teal"
        >
          <Landmark className="w-4 h-4" />
          <span className="text-sm">Connect a bank account to enable Net cash position</span>
        </button>
      )}

      {/* Decorative legend / unused icons keep tree-shaking honest */}
      <span className="hidden">
        <Users />
        <TrendingUp />
      </span>
    </div>
  );
}

export default PaymentForecast;
