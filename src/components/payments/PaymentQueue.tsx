import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Ban,
  CheckCircle,
  ChevronRight,
  Clock,
  Copy,
  FileWarning,
  Flag,
  Hash,
  Moon,
  Package,
  RefreshCw,
  Scissors,
  Search,
  TrendingUp,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mysqlApiRequest } from '../../lib/mysql/client';
import {
  listingHeader,
  listingTitle,
  listingSubtitle,
  listingPrimaryBtn,
  listingPage,
  metricStrip,
  metricCard,
  metricLabel,
  metricValue,
  listingTh,
  badgeBase,
  rowActionBtn,
} from '../ui/listingStyles';
import type { FlagSeverity, PaymentQueueItem, PaymentStatus, RiskFlag } from '../../types/payments';

// 7 columns: Payee/Ref | Type | Amount | Due | Age | Risk | Actions
// Amount given slightly more room than Due to comfortably hold ₹X,XX,XXX
// without truncation. minmax(0, …) prevents grid items from bleeding into
// neighbours when content exceeds the track size.
const COLUMNS =
  'minmax(0, 1.8fr) minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 0.7fr) minmax(0, 0.8fr) minmax(0, 1fr)';

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

function fmtINR(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
function compactINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return fmtINR(n);
}
function daysFromToday(iso: string) {
  if (!iso) return 0;
  const d = new Date(iso);
  const t = new Date();
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / (24 * 60 * 60 * 1000));
}

// ============================================================================
// Flag icon resolver
// ============================================================================

const FLAG_ICONS: Record<string, typeof Flag> = {
  Banknote,
  Ban,
  Copy,
  AlertTriangle,
  UserCheck,
  UserPlus,
  TrendingUp,
  Package,
  Hash,
  Scissors,
  FileWarning,
  Moon,
};
function FlagIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = FLAG_ICONS[name] ?? Flag;
  return <Cmp className={className} />;
}

// ============================================================================
// Queue metrics card row
// ============================================================================

interface MetricsProps {
  totalValue: number;
  flaggedValue: number;
  outstanding: number;
  paidThisCycle: number;
  flaggedCount: number;
}
function QueueMetrics({
  totalValue,
  flaggedValue,
  outstanding,
  paidThisCycle,
  flaggedCount,
}: MetricsProps) {
  const cards = [
    { label: 'Total value', value: compactINR(totalValue), tone: 'var(--color-ink)' },
    {
      label: `Flagged & held (${flaggedCount})`,
      value: compactINR(flaggedValue),
      tone: flaggedCount > 0 ? '#A32D2D' : 'var(--color-ink)',
    },
    { label: 'Outstanding', value: compactINR(outstanding), tone: '#BA7517' },
    { label: 'Paid this cycle', value: compactINR(paidThisCycle), tone: '#0F6E56' },
  ];
  return (
    <div style={metricStrip}>
      {cards.map((c) => (
        <div key={c.label} style={metricCard}>
          <div style={metricLabel}>{c.label}</div>
          <div style={{ ...metricValue, color: c.tone }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Filter pills + sort
// ============================================================================

type FilterKey =
  | 'all'
  | 'flagged'
  | 'critical'
  | 'msme'
  | 'overdue'
  | 'partial'
  | 'onhold'
  | 'paid';

const FILTERS: { key: FilterKey; label: string; icon?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'flagged', label: '🚩 Flagged' },
  { key: 'critical', label: 'Critical' },
  { key: 'msme', label: 'MSME' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'partial', label: 'Partial' },
  { key: 'onhold', label: 'On hold' },
  { key: 'paid', label: 'Paid' },
];

function FilterPills({
  active,
  counts,
  onChange,
}: {
  active: FilterKey;
  counts: Record<FilterKey, number>;
  onChange: (k: FilterKey) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {FILTERS.map((f) => {
        const isActive = f.key === active;
        const isFlagged = f.key === 'flagged';
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
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
              ...(isActive
                ? isFlagged
                  ? { background: '#FCEBEB', color: '#A32D2D', borderColor: '#F4B5B5' }
                  : { background: '#0F6E56', color: '#FFFFFF', borderColor: '#0F6E56' }
                : {
                    background: '#FFFFFF',
                    color: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border-tertiary)',
                  }),
            }}
          >
            <span>{f.label}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 20,
                background: isActive
                  ? 'rgba(255,255,255,0.2)'
                  : isFlagged
                    ? '#FCEBEB'
                    : 'var(--color-background-secondary)',
                color: isActive
                  ? 'currentColor'
                  : isFlagged
                    ? '#A32D2D'
                    : 'var(--color-text-secondary)',
              }}
            >
              {counts[f.key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type SortKey = 'priority' | 'due' | 'amount_desc' | 'msme';
function SortSelect({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortKey)}
      style={{
        height: 32,
        padding: '0 12px',
        borderRadius: 'var(--border-radius-md)',
        border: '0.5px solid var(--color-border-tertiary)',
        background: '#FFFFFF',
        color: 'var(--color-text-primary)',
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      <option value="priority">Sort: Priority</option>
      <option value="due">Sort: Due date</option>
      <option value="amount_desc">Sort: Amount desc</option>
      <option value="msme">Sort: MSME deadline</option>
    </select>
  );
}

// ============================================================================
// Flagged alert banner
// ============================================================================

function FlaggedAlert({
  count,
  totalValue,
  onReview,
}: {
  count: number;
  totalValue: number;
  onReview: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
        <Flag className="w-5 h-5 text-red-600" />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-red-700">
          {count} flagged invoice{count > 1 ? 's' : ''} held — {compactINR(totalValue)}
        </div>
        <div className="text-sm text-red-600/80">
          Awaiting approver review. High-severity flags auto-hold the invoice.
        </div>
      </div>
      <button
        type="button"
        onClick={onReview}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
      >
        Review now
      </button>
    </div>
  );
}

// ============================================================================
// Queue row
// ============================================================================

function FlagBadge({ flags }: { flags: RiskFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <span style={{ ...badgeBase, background: '#FCEBEB', color: '#791F1F' }}>
      {flags.length} flag{flags.length > 1 ? 's' : ''}
    </span>
  );
}

function typeBadgeColors(type: string, isMSME: boolean): { bg: string; fg: string; label: string } {
  if (isMSME) return { bg: '#FAEEDA', fg: '#633806', label: 'MSME' };
  if (type === 'advance') return { bg: '#E1F5EE', fg: '#085041', label: 'Advance' };
  return { bg: '#EEEDFE', fg: '#3C3489', label: 'Invoice' };
}

function ageDotForDue(dueIso: string, status: PaymentStatus): { color: string; label: string } {
  if (!dueIso) return { color: '#9AA3AD', label: '—' };
  if (status === 'paid') return { color: '#0F6E56', label: 'Paid' };
  const d = daysFromToday(dueIso);
  // Dot colour communicates urgency; label shows magnitude only.
  if (d < 0) return { color: '#A32D2D', label: `${Math.abs(d)}d` };
  if (d <= 7) return { color: '#BA7517', label: `${d}d` };
  return { color: '#9AA3AD', label: `${d}d` };
}

function formatDueShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function QueueHeaderRow() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMNS,
        alignItems: 'center',
        background: 'var(--color-background-secondary)',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
      }}
    >
      <div style={listingTh}>Payee / Ref</div>
      <div style={listingTh}>Type</div>
      <div style={{ ...listingTh, textAlign: 'right' }}>Amount</div>
      <div style={listingTh}>Due date</div>
      <div style={listingTh}>Age</div>
      <div style={listingTh}>Risk flags</div>
      <div style={{ ...listingTh, textAlign: 'right' }}>Actions</div>
    </div>
  );
}

function QueueRow({
  item,
  onView,
  onPay,
  onHold,
}: {
  item: PaymentQueueItem;
  onView: (item: PaymentQueueItem) => void;
  onPay: (item: PaymentQueueItem) => void;
  onHold: (item: PaymentQueueItem) => void;
}) {
  const isFlagged = item.flags.length > 0 && !item.cleared;
  const due = daysFromToday(item.due || '');
  const overdue = item.due && due < 0 && item.status !== 'paid';
  const tBadge = typeBadgeColors(item.type, item.isMSME);
  const age = ageDotForDue(item.due, item.status);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMNS,
        alignItems: 'center',
        padding: '12px 24px',
        minHeight: 52,
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        background: isFlagged ? '#FFF6F6' : '#FFFFFF',
        borderLeft: isFlagged ? '3px solid #A32D2D' : '3px solid transparent',
      }}
      className="listing-row-hover"
    >
      {/* Payee / ref */}
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
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
          {item.name}
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
          {item.ref}
          {item.dept ? ` · ${item.dept}` : ''}
        </div>
      </div>
      {/* Type */}
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <span style={{ ...badgeBase, background: tBadge.bg, color: tBadge.fg }}>
          {tBadge.label}
          {item.isMSME && item.msmeRemaining !== null ? ` ${item.msmeRemaining}d` : ''}
        </span>
      </div>
      {/* Amount */}
      <div
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textAlign: 'right',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
        }}
      >
        <div
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fmtINR(item.amount)}
        </div>
        {item.paidAmt > 0 && item.paidAmt < item.amount && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              fontWeight: 400,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Paid {fmtINR(item.paidAmt)}
          </div>
        )}
      </div>
      {/* Due date */}
      <div
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 12,
          color: overdue ? '#A32D2D' : 'var(--color-text-primary)',
          fontWeight: overdue ? 500 : 400,
        }}
      >
        {formatDueShort(item.due)}
      </div>
      {/* Age */}
      <div
        style={{
          minWidth: 0,
          overflow: 'hidden',
          fontSize: 12,
          color: 'var(--color-text-primary)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 6,
            background: age.color,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        {age.label}
      </div>
      {/* Risk flags */}
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        {isFlagged ? (
          <FlagBadge flags={item.flags} />
        ) : (
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>—</span>
        )}
      </div>
      {/* Actions */}
      <div
        style={{
          minWidth: 0,
          overflow: 'hidden',
          display: 'flex',
          gap: 6,
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPay(item);
          }}
          disabled={isFlagged || item.status === 'paid'}
          style={{
            ...rowActionBtn,
            background: isFlagged || item.status === 'paid' ? '#F1EFE8' : '#0F6E56',
            color: isFlagged || item.status === 'paid' ? '#9AA3AD' : '#FFFFFF',
            borderColor: isFlagged || item.status === 'paid' ? '#F1EFE8' : '#0F6E56',
            fontWeight: 500,
            cursor: isFlagged || item.status === 'paid' ? 'not-allowed' : 'pointer',
          }}
        >
          Pay
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHold(item);
          }}
          style={rowActionBtn}
        >
          {item.status === 'onhold' ? 'Release' : 'Hold'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onView(item);
          }}
          aria-label="View details"
          style={{ ...rowActionBtn, width: 30, padding: 0, justifyContent: 'center' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Detail drawer
// ============================================================================

type DrawerTab = 'details' | 'flags' | 'trail';

function DetailDrawer({
  item,
  isApprover,
  onClose,
  onClearFlags,
  onToggleHold,
  onPay,
  onEditDue,
}: {
  item: PaymentQueueItem | null;
  isApprover: boolean;
  onClose: () => void;
  onClearFlags: (note: string) => Promise<void>;
  onToggleHold: () => Promise<void>;
  onPay: () => void;
  onEditDue: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>('details');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (item) {
      setTab(item.flags.length > 0 && !item.cleared ? 'flags' : 'details');
      setNote('');
      setBusy(false);
    }
  }, [item?.id]);

  if (!item) return null;
  const flagCount = item.flags.length;
  const grouped: Record<FlagSeverity, RiskFlag[]> = {
    high: item.flags.filter((f) => f.severity === 'high'),
    medium: item.flags.filter((f) => f.severity === 'medium'),
    low: item.flags.filter((f) => f.severity === 'low'),
  };
  const hasUncleared = flagCount > 0 && !item.cleared;

  const submitClear = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await onClearFlags(note.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 bottom-0 w-[520px] bg-white z-50 shadow-xl flex flex-col"
        aria-label="Payment detail"
      >
        <header className="px-6 py-4 border-b-2 border-silver flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm text-mercury-grey">{item.ref}</div>
            <h2 className="text-lg font-semibold text-ink truncate">{item.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-cloud rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-mercury-grey" />
          </button>
        </header>

        <nav className="flex border-b-2 border-silver" aria-label="Detail tabs">
          {(
            [
              { key: 'details', label: 'Details' },
              { key: 'flags', label: 'Risk flags', badge: flagCount },
              { key: 'trail', label: 'Approval trail' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                'px-4 py-3 text-sm font-medium border-b-2 -mb-[2px] transition-colors flex items-center gap-2',
                tab === t.key
                  ? 'border-teal text-teal'
                  : 'border-transparent text-mercury-grey hover:text-ink',
              ].join(' ')}
            >
              <span>{t.label}</span>
              {'badge' in t && t.badge && t.badge > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'details' && (
            <div className="space-y-4 text-sm">
              <Field label="Amount" value={fmtINR(item.amount)} />
              <Field label="Outstanding" value={fmtINR(item.amount - item.paidAmt)} />
              <Field label="Invoice date" value={item.invoiceDate || '—'} />
              <Field
                label="Due date"
                value={item.due || '—'}
                action={
                  <button
                    type="button"
                    onClick={onEditDue}
                    className="text-xs text-teal hover:underline"
                  >
                    Edit
                  </button>
                }
              />
              <Field label="Status" value={item.status} capitalize />
              <Field label="Priority" value={item.priority} capitalize />
              <Field label="Department" value={item.dept || '—'} />
              <hr className="border-silver" />
              <Field label="Vendor master name" value={item.vendor.masterName || '—'} />
              <Field label="GSTIN" value={item.vendor.gstin || '—'} />
              <Field label="PAN" value={item.vendor.pan || '—'} />
              <Field label="Bank" value={item.vendor.bank || '—'} />
              {item.isMSME && item.msmeRemaining !== null && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-purple-700 text-sm">
                  <strong>MSME 45-day:</strong> {item.msmeRemaining} day(s) remaining
                </div>
              )}
            </div>
          )}

          {tab === 'flags' && (
            <div className="space-y-4">
              {flagCount === 0 ? (
                <div className="flex flex-col items-center py-8 text-mercury-grey">
                  <CheckCircle className="w-10 h-10 mb-2" />
                  <p>No risk flags</p>
                </div>
              ) : (
                <>
                  {item.cleared && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                      <strong>Cleared.</strong> {item.clearanceNote || ''}
                    </div>
                  )}
                  {!isApprover && hasUncleared && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      Awaiting approver review.
                    </div>
                  )}
                  {(['high', 'medium', 'low'] as FlagSeverity[]).map((sev) =>
                    grouped[sev].length === 0 ? null : (
                      <div key={sev}>
                        <div className="text-xs font-bold uppercase text-mercury-grey mb-2">
                          {sev}
                        </div>
                        <div className="space-y-2">
                          {grouped[sev].map((f) => (
                            <div
                              key={f.flagId}
                              className={[
                                'flex items-start gap-3 p-3 rounded-lg border',
                                sev === 'high'
                                  ? 'bg-red-50 border-red-200'
                                  : sev === 'medium'
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-slate-50 border-slate-200',
                              ].join(' ')}
                            >
                              <FlagIcon
                                name={f.icon}
                                className={[
                                  'w-5 h-5 flex-shrink-0',
                                  sev === 'high'
                                    ? 'text-red-600'
                                    : sev === 'medium'
                                      ? 'text-amber-700'
                                      : 'text-slate-500',
                                ].join(' ')}
                              />
                              <div>
                                <div className="font-semibold text-ink">{f.title}</div>
                                <div className="text-xs text-mercury-grey">{f.detail}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {isApprover && hasUncleared && (
                    <div className="border-t-2 border-silver pt-4 mt-4">
                      <label className="block text-sm font-medium text-ink mb-2">
                        Clearance note <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder="Why is it safe to clear these flags?"
                        className="w-full p-2 border-2 border-silver rounded-lg text-sm text-ink"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 px-4 py-2 border-2 border-silver rounded-lg text-sm text-mercury-grey hover:bg-cloud"
                        >
                          Keep on hold
                        </button>
                        <button
                          type="button"
                          onClick={submitClear}
                          disabled={!note.trim() || busy}
                          className="flex-1 px-4 py-2 bg-teal hover:bg-teal-dark text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {busy ? 'Clearing…' : 'Clear flags & release'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'trail' && (
            <div className="space-y-3">
              {item.approvalTrail.length === 0 ? (
                <p className="text-sm text-mercury-grey">No approval activity yet.</p>
              ) : (
                <ol className="relative border-l-2 border-silver ml-2 space-y-4 pl-4">
                  {item.approvalTrail.map((entry, idx) => (
                    <li key={idx} className="relative">
                      <span className="absolute -left-[18px] top-1.5 w-3 h-3 rounded-full bg-teal" />
                      <div className="text-sm text-ink font-medium">{entry.action}</div>
                      <div className="text-xs text-mercury-grey">
                        {entry.by}
                        {entry.role && ` · ${entry.role}`} ·{' '}
                        {entry.at ? new Date(entry.at).toLocaleString('en-IN') : ''}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t-2 border-silver flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleHold}
            disabled={hasUncleared}
            className="flex-1 px-4 py-2 border-2 border-silver text-sm rounded-lg text-mercury-grey hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {item.status === 'onhold' ? 'Release hold' : 'Put on hold'}
          </button>
          <button
            type="button"
            onClick={onPay}
            disabled={hasUncleared || item.status === 'paid'}
            className="flex-1 px-4 py-2 bg-teal hover:bg-teal-dark text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Pay
          </button>
        </footer>
      </aside>
    </>
  );
}

function Field({
  label,
  value,
  action,
  capitalize,
}: {
  label: string;
  value: string | number;
  action?: React.ReactNode;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-mercury-grey">{label}</span>
      <span className={`text-ink text-right ${capitalize ? 'capitalize' : ''}`}>
        {value}
        {action ? <span className="ml-2">{action}</span> : null}
      </span>
    </div>
  );
}

// ============================================================================
// Due-date modal
// ============================================================================

function DueDateModal({
  item,
  onClose,
  onSave,
}: {
  item: PaymentQueueItem;
  onClose: () => void;
  onSave: (newDue: string, reason: string) => Promise<void>;
}) {
  const [newDue, setNewDue] = useState(item.due || '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const days = newDue ? daysFromToday(newDue) : 0;
  const urgencyClass =
    days < 0 ? 'text-red-600' : days <= 3 ? 'text-amber-700' : 'text-mercury-grey';

  return (
    <ModalShell onClose={onClose} title="Edit due date">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-mercury-grey mb-1">Current due</label>
          <div className="text-ink">{item.due || '—'}</div>
        </div>
        <div>
          <label className="block text-sm text-mercury-grey mb-1">New due date</label>
          <input
            type="date"
            value={newDue}
            onChange={(e) => setNewDue(e.target.value)}
            className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink"
          />
          {newDue && (
            <p className={`text-xs mt-1 ${urgencyClass}`}>
              {days < 0 ? `${Math.abs(days)} days overdue` : `Due in ${days} day(s)`}
              {item.isMSME && ` · MSME 45-day applies`}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm text-mercury-grey mb-1">
            Reason <span className="text-red-600">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why is the due date being changed?"
            className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border-2 border-silver rounded-lg text-mercury-grey hover:bg-cloud"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!newDue || !reason.trim() || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(newDue, reason.trim());
            } finally {
              setBusy(false);
            }
          }}
          className="flex-1 px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Saving…' : 'Update due date'}
        </button>
      </div>
    </ModalShell>
  );
}

// ============================================================================
// Pay modal
// ============================================================================

type PayPaymentMode = 'NEFT' | 'RTGS' | 'IMPS' | 'UPI';

function PayModal({
  item,
  onClose,
  onPay,
  rtgsThreshold = 200000,
  defaultMode = 'NEFT',
}: {
  item: PaymentQueueItem;
  onClose: () => void;
  onPay: (data: {
    payAmt: number;
    payDate: string;
    utr: string;
    newStatus: PaymentStatus;
    paymentMode: PayPaymentMode;
  }) => Promise<void>;
  rtgsThreshold?: number;
  defaultMode?: PayPaymentMode;
}) {
  const outstanding = Math.max(0, item.amount - item.paidAmt);
  const [payAmt, setPayAmt] = useState<number>(outstanding);
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [utr, setUtr] = useState('');
  const [paymentMode, setPaymentMode] = useState<PayPaymentMode>(defaultMode);
  const [modeManuallySet, setModeManuallySet] = useState(false);
  const [busy, setBusy] = useState(false);
  const isFull = payAmt >= outstanding && payAmt > 0;
  const rtgsAuto = !modeManuallySet && payAmt > rtgsThreshold;

  // Auto-bump to RTGS when amount crosses threshold (only if user hasn't picked manually)
  useEffect(() => {
    if (!modeManuallySet && payAmt > rtgsThreshold && paymentMode !== 'RTGS') {
      setPaymentMode('RTGS');
    } else if (!modeManuallySet && payAmt <= rtgsThreshold && paymentMode === 'RTGS') {
      setPaymentMode(defaultMode);
    }
  }, [payAmt, rtgsThreshold, paymentMode, defaultMode, modeManuallySet]);

  return (
    <ModalShell onClose={onClose} title="Record payment">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Invoice total" value={fmtINR(item.amount)} />
          <Field label="Outstanding" value={fmtINR(outstanding)} />
        </div>
        <div>
          <label className="block text-sm text-mercury-grey mb-1">Pay amount</label>
          <input
            type="number"
            min={0}
            max={outstanding}
            value={payAmt}
            onChange={(e) => setPayAmt(Number(e.target.value))}
            className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink"
          />
          <div className="flex gap-1 mt-2">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPayAmt(Math.round((outstanding * p) / 100))}
                className="flex-1 px-2 py-1 text-xs border border-silver rounded-md text-mercury-grey hover:bg-cloud"
              >
                {p}%
              </button>
            ))}
          </div>
          <p className="text-xs mt-2 text-mercury-grey">
            {isFull ? 'Full payment' : 'Partial payment'} · Remaining{' '}
            {fmtINR(Math.max(0, outstanding - payAmt))}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-mercury-grey mb-1">Payment date</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink"
            />
          </div>
          <div>
            <label className="block text-sm text-mercury-grey mb-1">UTR / Ref</label>
            <input
              type="text"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. UTR123456789"
              className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-mercury-grey mb-1">Payment mode</label>
          <select
            value={paymentMode}
            onChange={(e) => {
              setModeManuallySet(true);
              setPaymentMode(e.target.value as PayPaymentMode);
            }}
            className="w-full px-3 py-2 border-2 border-silver rounded-lg text-ink"
          >
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="IMPS">IMPS</option>
            <option value="UPI">UPI</option>
          </select>
          {rtgsAuto && (
            <p className="text-xs text-mercury-grey mt-1">
              RTGS auto-selected (amount &gt; {fmtINR(rtgsThreshold)})
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border-2 border-silver rounded-lg text-mercury-grey hover:bg-cloud"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || !(payAmt > 0)}
          onClick={async () => {
            setBusy(true);
            try {
              await onPay({
                payAmt,
                payDate,
                utr,
                newStatus: isFull ? 'paid' : 'partial',
                paymentMode,
              });
            } finally {
              setBusy(false);
            }
          }}
          className="flex-1 px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Posting…' : isFull ? 'Mark as paid' : 'Record partial payment'}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} aria-hidden />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-[480px] max-w-[92vw]">
        <div className="px-6 py-4 border-b-2 border-silver flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-cloud rounded-lg">
            <X className="w-5 h-5 text-mercury-grey" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </>
  );
}

// ============================================================================
// Main page
// ============================================================================

export function PaymentQueue() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? null;
  const entityId = user?.currentPlatformEntityId ?? null;

  // Live approver-roles list from /ap/payment-settings (settings.payment_approver_roles).
  // Falls back to the static APPROVER_ROLES set on first paint / fetch failure.
  const [liveApproverRoles, setLiveApproverRoles] = useState<Set<string>>(APPROVER_ROLES);
  const isApprover = liveApproverRoles.has(normaliseRole(user?.role));

  const [items, setItems] = useState<PaymentQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('priority');
  const [search, setSearch] = useState('');
  const [rtgsThreshold, setRtgsThreshold] = useState<number>(200000);
  const [defaultMode, setDefaultMode] = useState<PayPaymentMode>('NEFT');

  const [selected, setSelected] = useState<PaymentQueueItem | null>(null);
  const [showDueDate, setShowDueDate] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  // Fetch tenant settings once for RTGS threshold, default mode, and the
  // live payment_approver_roles list used by isApprover.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tenantId) return;
      try {
        const res = await mysqlApiRequest<{
          success: boolean;
          data: {
            rtgsThreshold?: number;
            defaultPaymentMode?: PayPaymentMode;
            paymentApproverRoles?: string;
          };
        }>('/ap/payment-settings');
        if (cancelled) return;
        if (res.success) {
          if (typeof res.data.rtgsThreshold === 'number') setRtgsThreshold(res.data.rtgsThreshold);
          if (res.data.defaultPaymentMode) setDefaultMode(res.data.defaultPaymentMode);
          if (res.data.paymentApproverRoles) {
            const roles = res.data.paymentApproverRoles
              .split(',')
              .map((r) => r.trim().toLowerCase().replace(/\s+/g, '_'))
              .filter(Boolean);
            if (roles.length > 0) setLiveApproverRoles(new Set(roles));
          }
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tenantId) {
        setItems([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const q = new URLSearchParams();
        q.set('tenantId', tenantId);
        if (entityId) q.set('entityId', entityId);
        const res = await mysqlApiRequest<{ success: boolean; data: PaymentQueueItem[] }>(
          `/ap/payment-queue?${q.toString()}`
        );
        if (!cancelled) setItems(res.data ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load payment queue');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, entityId, reloadKey]);

  // Counts per filter
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: items.length,
      flagged: 0,
      critical: 0,
      msme: 0,
      overdue: 0,
      partial: 0,
      onhold: 0,
      paid: 0,
    };
    for (const it of items) {
      if (it.flags.length > 0 && !it.cleared) c.flagged += 1;
      if (it.priority === 'critical' || it.isCritical) c.critical += 1;
      if (it.isMSME) c.msme += 1;
      if (it.due && daysFromToday(it.due) < 0 && it.status !== 'paid') c.overdue += 1;
      if (it.status === 'partial') c.partial += 1;
      if (it.status === 'onhold') c.onhold += 1;
      if (it.status === 'paid') c.paid += 1;
    }
    return c;
  }, [items]);

  // Filter + search + sort
  const visible = useMemo(() => {
    let arr = [...items];
    if (filter !== 'all') {
      arr = arr.filter((it) => {
        if (filter === 'flagged') return it.flags.length > 0 && !it.cleared;
        if (filter === 'critical') return it.priority === 'critical' || it.isCritical;
        if (filter === 'msme') return it.isMSME;
        if (filter === 'overdue')
          return it.due && daysFromToday(it.due) < 0 && it.status !== 'paid';
        if (filter === 'partial') return it.status === 'partial';
        if (filter === 'onhold') return it.status === 'onhold';
        if (filter === 'paid') return it.status === 'paid';
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.ref.toLowerCase().includes(q) ||
          it.vendor.gstin.toLowerCase().includes(q)
      );
    }
    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    arr.sort((a, b) => {
      if (sort === 'priority') return priorityRank[a.priority] - priorityRank[b.priority];
      if (sort === 'due') return (a.due || '9999').localeCompare(b.due || '9999');
      if (sort === 'amount_desc') return b.amount - a.amount;
      if (sort === 'msme') {
        const am = a.msmeRemaining ?? 9999;
        const bm = b.msmeRemaining ?? 9999;
        return am - bm;
      }
      return 0;
    });
    return arr;
  }, [items, filter, search, sort]);

  // Grouped sections when filter=all
  const sections = useMemo(() => {
    if (filter !== 'all') return [{ label: '', rows: visible }];
    const flagged = visible.filter((it) => it.flags.length > 0 && !it.cleared);
    const critical = visible.filter(
      (it) => (it.priority === 'critical' || it.isCritical) && !flagged.includes(it)
    );
    const msme = visible.filter(
      (it) => it.isMSME && !flagged.includes(it) && !critical.includes(it)
    );
    const standard = visible.filter(
      (it) => !flagged.includes(it) && !critical.includes(it) && !msme.includes(it)
    );
    return [
      { label: '🚩 Flagged & auto-held', rows: flagged },
      { label: 'Critical', rows: critical },
      { label: 'MSME 45-day', rows: msme },
      { label: 'Standard', rows: standard },
    ].filter((s) => s.rows.length > 0);
  }, [filter, visible]);

  // Metrics
  const totalValue = items.reduce((s, it) => s + it.amount, 0);
  const flaggedItems = items.filter((it) => it.flags.length > 0 && !it.cleared);
  const flaggedValue = flaggedItems.reduce((s, it) => s + it.amount, 0);
  const outstanding = items.reduce((s, it) => s + Math.max(0, it.amount - it.paidAmt), 0);
  const paidThisCycle = items
    .filter((it) => it.status === 'paid')
    .reduce((s, it) => s + it.paidAmt, 0);

  // Mutations
  const handleClearFlags = async (note: string) => {
    if (!selected) return;
    await mysqlApiRequest(`/ap/payment-queue/${selected.id}/clear-flags`, {
      method: 'POST',
      body: JSON.stringify({ clearanceNote: note }),
    });
    setSelected(null);
    refresh();
  };
  const handleToggleHold = async () => {
    if (!selected) return;
    await mysqlApiRequest(`/ap/payment-queue/${selected.id}/hold`, { method: 'POST' });
    setSelected(null);
    refresh();
  };
  const handleEditDue = async (newDue: string, reason: string) => {
    if (!selected) return;
    await mysqlApiRequest(`/ap/payment-queue/${selected.id}/due-date`, {
      method: 'POST',
      body: JSON.stringify({ newDue, reason }),
    });
    setShowDueDate(false);
    setSelected(null);
    refresh();
  };
  const handlePay = async (data: {
    payAmt: number;
    payDate: string;
    utr: string;
    newStatus: PaymentStatus;
    paymentMode: PayPaymentMode;
  }) => {
    if (!selected) return;
    await mysqlApiRequest(`/ap/payment-queue/${selected.id}/pay`, {
      method: 'POST',
      // Server expects payment_mode (snake_case) but tolerates camelCase too;
      // include both for safety.
      body: JSON.stringify({
        ...data,
        paymentMode: data.paymentMode,
        payment_mode: data.paymentMode.toLowerCase(),
      }),
    });
    setShowPay(false);
    setSelected(null);
    refresh();
  };

  // Helper to open Pay/Hold modals from row buttons (set selected first then open modal).
  const openPay = useCallback((it: PaymentQueueItem) => {
    setSelected(it);
    setShowPay(true);
  }, []);
  const openHold = useCallback(async (it: PaymentQueueItem) => {
    try {
      await mysqlApiRequest(`/ap/payment-queue/${it.id}/hold`, { method: 'POST' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Hold toggle failed');
    }
  }, []);

  return (
    <div style={listingPage}>
      <div style={listingHeader}>
        <div>
          <h1 style={listingTitle}>Payment queue</h1>
          <p style={listingSubtitle}>Invoices and advances ready for payment.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={refresh} disabled={loading} style={rowActionBtn}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button type="button" style={listingPrimaryBtn} onClick={() => alert('Coming soon')}>
            Create batch
          </button>
        </div>
      </div>

      <QueueMetrics
        totalValue={totalValue}
        flaggedValue={flaggedValue}
        outstanding={outstanding}
        paidThisCycle={paidThisCycle}
        flaggedCount={flaggedItems.length}
      />

      <FlaggedAlert
        count={flaggedItems.length}
        totalValue={flaggedValue}
        onReview={() => setFilter('flagged')}
      />

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
        <FilterPills active={filter} counts={counts} onChange={setFilter} />
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
            placeholder="Search payee, ref, GSTIN…"
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
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {error && (
        <div
          style={{
            padding: '12px 24px',
            background: '#FCEBEB',
            borderBottom: '0.5px solid #F09595',
            color: '#A32D2D',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ background: '#FFFFFF' }}>
        <QueueHeaderRow />
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
              className="animate-spin"
              size={20}
              style={{ display: 'inline-block', marginRight: 8 }}
            />
            Loading payment queue…
          </div>
        ) : sections.length === 0 || sections.every((s) => s.rows.length === 0) ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--color-mercury-grey)',
              fontSize: 12,
            }}
          >
            <CheckCircle size={24} style={{ display: 'inline-block', marginRight: 8 }} />
            {items.length === 0 ? 'No invoices in queue' : 'No invoices match filters'}
          </div>
        ) : (
          sections.map((s) => (
            <div key={s.label}>
              {s.label && (
                <div
                  style={{
                    padding: '6px 24px',
                    background: 'var(--color-background-secondary)',
                    borderBottom: '0.5px solid var(--color-border-tertiary)',
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>{s.label}</span>
                  <span
                    style={{
                      background: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: 20,
                      color: 'var(--color-text-secondary)',
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {s.rows.length}
                  </span>
                </div>
              )}
              {s.rows.map((it) => (
                <QueueRow
                  key={it.id}
                  item={it}
                  onView={(item) => setSelected(item)}
                  onPay={openPay}
                  onHold={openHold}
                />
              ))}
            </div>
          ))
        )}
      </div>

      <DetailDrawer
        item={selected}
        isApprover={isApprover}
        onClose={() => setSelected(null)}
        onClearFlags={handleClearFlags}
        onToggleHold={handleToggleHold}
        onPay={() => setShowPay(true)}
        onEditDue={() => setShowDueDate(true)}
      />

      {selected && showDueDate && (
        <DueDateModal
          item={selected}
          onClose={() => setShowDueDate(false)}
          onSave={handleEditDue}
        />
      )}
      {selected && showPay && (
        <PayModal
          item={selected}
          onClose={() => setShowPay(false)}
          onPay={handlePay}
          rtgsThreshold={rtgsThreshold}
          defaultMode={defaultMode}
        />
      )}
    </div>
  );
}

export default PaymentQueue;
