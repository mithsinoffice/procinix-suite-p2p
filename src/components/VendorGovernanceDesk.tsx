import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Users,
  Clock,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Building2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useMasterData } from '../contexts/MasterDataContext';
import { useVendorInvitations } from '../contexts/VendorInvitationContext';
import { buildVendorGovernanceDeskModel, mergeGovernanceSummary } from '../lib/vendorGovernanceStats';
import { fetchVendorGovernanceSummary } from '../lib/vendorGovernanceApi';
import { isMysqlApiEnabled } from '../lib/mysql/client';
import type { VendorGovernanceDeskModel, VendorGovernanceSummaryApiPayload } from '../types/vendorGovernance';

const surface = '#F6F9FC';
const border = '#E1E6EA';
const textMuted = '#6E7A82';
const textMain = '#0A0F14';
const accent = '#00A9B7';

function formatTrendLine(pct: number | null): { trend: 'up' | 'down' | 'flat'; label: string } | null {
  if (pct === null || Number.isNaN(pct)) {
    return null;
  }
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return {
    trend: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat',
    label: `${sign}${rounded}% vs prior 30 days`,
  };
}

function KpiCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend: ReturnType<typeof formatTrendLine>;
}) {
  const trendColor =
    trend === null ? textMuted : trend.trend === 'up' ? '#047857' : trend.trend === 'down' ? '#B91C1C' : textMuted;
  const TrendIcon = trend?.trend === 'up' ? TrendingUp : TrendingDown;
  return (
    <div
      className="rounded-xl p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 min-w-0 h-full"
      style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide leading-tight" style={{ color: textMuted }}>
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-semibold tabular-nums mt-1" style={{ color: textMain }}>
            {value}
          </p>
        </div>
        <div
          className="rounded-full w-11 h-11 flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}18` }}
        >
          {icon}
        </div>
      </div>
      <div
        className="flex items-start gap-1.5 text-[10px] sm:text-xs font-medium min-h-[2.25rem] sm:min-h-[1.25rem] leading-snug"
        style={{ color: trendColor }}
      >
        {trend === null ? (
          <span className="break-words" style={{ color: textMuted }}>
            No comparison data
          </span>
        ) : trend.trend === 'flat' ? (
          <span className="break-words" style={{ color: textMuted }}>
            {trend.label}
          </span>
        ) : (
          <>
            <TrendIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="break-words min-w-0">{trend.label}</span>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: 'yellow' | 'blue' | 'gray' | 'green' }) {
  const map = {
    yellow: { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
    blue: { bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE' },
    gray: { bg: '#F1F4F6', color: '#6E7A82', border: '#E1E6EA' },
    green: { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
  };
  const s = map[tone];
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {label}
    </span>
  );
}

function DueBadge({ label, tone }: { label: string; tone: 'orange' | 'amber' | 'soft' }) {
  const map = {
    orange: { bg: '#FFF7ED', color: '#C2410C' },
    amber: { bg: '#FFFBEB', color: '#B45309' },
    soft: { bg: '#F1F4F6', color: '#6E7A82' },
  };
  const s = map[tone];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: s.bg, color: s.color }}>
      {label}
    </span>
  );
}

function ValidationBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: surface }}>
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function AlertCard({
  title,
  detail,
  severity,
}: {
  title: string;
  detail: string;
  severity: 'critical' | 'urgent';
}) {
  const critical = severity === 'critical';
  return (
    <div
      className="rounded-lg p-3 text-sm"
      style={{
        border: critical ? '1px solid #FECACA' : '1px solid #FDE68A',
        backgroundColor: critical ? '#FEF2F2' : '#FFFBEB',
      }}
    >
      <p className="font-medium" style={{ color: critical ? '#991B1B' : '#B45309' }}>
        {title}
      </p>
      <p className="text-xs mt-1" style={{ color: textMuted }}>
        {detail}
      </p>
    </div>
  );
}

export function VendorGovernanceDesk() {
  const { vendors, currentCompany } = useMasterData();
  const { invitations } = useVendorInvitations();
  const [apiOverlay, setApiOverlay] = useState<VendorGovernanceSummaryApiPayload | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const clientModel = useMemo(
    () => buildVendorGovernanceDeskModel(invitations, vendors, currentCompany?.id),
    [invitations, vendors, currentCompany?.id]
  );

  const model: VendorGovernanceDeskModel = useMemo(() => {
    if (!apiOverlay) return clientModel;
    return mergeGovernanceSummary(clientModel, apiOverlay);
  }, [clientModel, apiOverlay]);

  const loadApiSummary = useCallback(async () => {
    if (!isMysqlApiEnabled()) {
      setApiOverlay(null);
      return;
    }
    setApiLoading(true);
    setFetchError(null);
    try {
      const data = await fetchVendorGovernanceSummary(currentCompany?.id);
      setApiOverlay(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Summary request failed');
      setApiOverlay(null);
    } finally {
      setApiLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    void loadApiSummary();
  }, [loadApiSummary]);

  const lastUpdated = useMemo(() => {
    const d = new Date(model.lastUpdatedAt);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [model.lastUpdatedAt]);

  const vSum = Math.max(1, model.validationSummary.completed + model.validationSummary.inProgress + model.validationSummary.blocked);

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: surface, minHeight: '100%' }}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: textMuted }}>
            Vendor Governance
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: textMain }}>
            Vendor Governance Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: textMuted }}>
            Overview of vendor onboarding and compliance activities. KPIs reflect synced vendor master and invitation
            data{isMysqlApiEnabled() ? ', with optional server summary when available' : ''}.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadApiSummary()}
            disabled={apiLoading || !isMysqlApiEnabled()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-opacity disabled:opacity-50"
            style={{ borderColor: border, color: textMain, backgroundColor: '#fff' }}
            title={!isMysqlApiEnabled() ? 'Set VITE_API_BASE_URL to refresh server summary' : 'Refresh server summary'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${apiLoading ? 'animate-spin' : ''}`} />
            Refresh data
          </button>
          <p className="text-sm text-right" style={{ color: textMuted }}>
            Last updated {lastUpdated}
            {model.source === 'api' && (
              <span className="block text-xs mt-0.5" style={{ color: accent }}>
                Server summary merged
              </span>
            )}
          </p>
        </div>
      </div>

      {fetchError && (
        <p className="text-sm mb-4 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2', color: '#991B1B' }}>
          {fetchError}
        </p>
      )}

      {/* Single row: 4 columns always; narrow viewports scroll horizontally (min width) so KPIs never stack */}
      <div className="w-full overflow-x-auto overflow-y-visible mb-8 pb-1">
        <div className="grid w-full min-w-[640px] grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Total Requests"
          value={model.kpis.totalRequests}
          icon={<FileText className="w-5 h-5" style={{ color: accent }} />}
          trend={formatTrendLine(model.kpis.trends.totalRequestsPct)}
        />
        <KpiCard
          label="Active Vendors"
          value={model.kpis.activeVendors.toLocaleString()}
          icon={<Users className="w-5 h-5" style={{ color: accent }} />}
          trend={formatTrendLine(model.kpis.trends.activeVendorsPct)}
        />
        <KpiCard
          label="Pending Approvals"
          value={model.kpis.pendingApprovals}
          icon={<Clock className="w-5 h-5" style={{ color: accent }} />}
          trend={formatTrendLine(model.kpis.trends.pendingApprovalsPct)}
        />
        <KpiCard
          label="High Risk Vendors"
          value={model.kpis.highRiskVendors}
          icon={<ShieldAlert className="w-5 h-5" style={{ color: accent }} />}
          trend={formatTrendLine(model.kpis.trends.highRiskVendorsPct)}
        />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <section
              className="rounded-xl flex flex-col min-h-0 min-w-0"
              style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0 rounded-t-xl"
                style={{ borderBottom: `1px solid ${border}` }}
              >
                <h2 className="text-sm font-semibold" style={{ color: textMain }}>
                  Recent Vendor Requests
                </h2>
                <Link to="/vendor-management/review" className="text-xs font-medium hover:underline" style={{ color: accent }}>
                  View All
                </Link>
              </div>
              {model.recentRequests.length === 0 ? (
                <p className="px-5 py-8 text-sm text-center" style={{ color: textMuted }}>
                  No vendor requests for this entity yet. Invitations appear here after you send invites.
                </p>
              ) : (
                <ul className="divide-y" style={{ borderColor: border }}>
                  {model.recentRequests.map((row) => (
                    <li key={row.id} className="px-5 py-4 flex gap-3">
                      <Link
                        to={`/vendor-management/review/${row.invitationId}`}
                        className="flex gap-3 flex-1 min-w-0 rounded-lg -m-1 p-1 hover:bg-black/[0.02]"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: surface }}
                        >
                          <Building2 className="w-5 h-5" style={{ color: accent }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: textMain }}>
                            {row.name}
                          </p>
                          <p className="text-xs font-mono mt-0.5" style={{ color: textMuted }}>
                            {row.displayId}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <StatusBadge label={row.status} tone={row.tone} />
                            <span className="text-xs" style={{ color: textMuted }}>
                              {row.date}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div
                className="px-5 py-4 shrink-0 rounded-b-xl"
                style={{ backgroundColor: '#E8F8FA', borderTop: `1px solid ${border}` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm font-medium break-words min-w-0" style={{ color: textMain }}>
                    Preview Vendor Self-Service Portal
                  </p>
                  <Link
                    to="/vendor-management/invite-vendors"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white shrink-0"
                    style={{ backgroundColor: accent }}
                  >
                    Open Portal
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </section>

            <section
              className="rounded-xl flex flex-col min-h-0 min-w-0 h-full"
              style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0 rounded-t-xl"
                style={{ borderBottom: `1px solid ${border}` }}
              >
                <h2 className="text-sm font-semibold" style={{ color: textMain }}>
                  Upcoming Tasks
                </h2>
              </div>
              {model.upcomingTasks.length === 0 ? (
                <p className="px-5 py-8 text-sm text-center break-words" style={{ color: textMuted }}>
                  No tasks awaiting action. Pending reviews will show here.
                </p>
              ) : (
                <ul className="divide-y flex-1 min-w-0" style={{ borderColor: border }}>
                  {model.upcomingTasks.map((t) => (
                    <li key={t.invitationId} className="px-5 py-4 min-w-0">
                      <Link
                        to={`/vendor-management/review/${t.invitationId}`}
                        className="block rounded-lg -m-1 p-1 hover:bg-black/[0.02] min-w-0"
                      >
                        <p
                          className="text-sm font-medium break-words [overflow-wrap:anywhere] whitespace-normal"
                          style={{ color: textMain }}
                        >
                          {t.vendor}
                        </p>
                        <p
                          className="text-xs mt-1 break-words [overflow-wrap:anywhere] whitespace-normal leading-relaxed"
                          style={{ color: textMuted }}
                        >
                          {t.task}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <DueBadge label={t.due} tone={t.dueTone} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="px-5 py-3 text-center shrink-0 rounded-b-xl" style={{ borderTop: `1px solid ${border}` }}>
                <Link to="/vendor-management/review" className="text-xs font-medium hover:underline" style={{ color: accent }}>
                  View All Tasks
                </Link>
              </div>
            </section>
          </div>

          <section
            className="rounded-xl p-5 lg:hidden"
            style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: textMain }}>
              Request status distribution
            </h2>
            {model.requestStatusDistribution.length === 0 ? (
              <p className="text-sm" style={{ color: textMuted }}>
                No invitations to chart yet.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                {model.requestStatusDistribution.map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between mb-1">
                      <span style={{ color: textMuted }}>{row.label}</span>
                      <span style={{ color: textMain }}>
                        {row.count} ({row.pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: surface }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, row.pct)}%`, backgroundColor: row.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="xl:col-span-4 space-y-6">
          <section
            className="rounded-xl p-5"
            style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: textMain }}>
              Insights
            </h2>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: textMuted }}>
              Validation summary
            </h3>
            <div className="space-y-3 mb-6">
              {(
                [
                  { label: 'Completed', n: model.validationSummary.completed, color: '#16A34A' },
                  { label: 'In progress', n: model.validationSummary.inProgress, color: '#CA8A04' },
                  { label: 'Blocked', n: model.validationSummary.blocked, color: '#DC2626' },
                ] as const
              ).map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: textMuted }}>{row.label}</span>
                    <span style={{ color: textMain }}>{row.n}</span>
                  </div>
                  <ValidationBar value={row.n} total={vSum} color={row.color} />
                </div>
              ))}
            </div>

            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: textMuted }}>
              High-risk alerts
            </h3>
            <div className="space-y-3 mb-6">
              {model.highRiskAlerts.length === 0 ? (
                <p className="text-sm" style={{ color: textMuted }}>
                  No blocked vendors flagged for this entity.
                </p>
              ) : (
                model.highRiskAlerts.map((a, i) => (
                  <AlertCard key={`${a.title}-${i}`} title={a.title} detail={a.detail} severity={a.severity} />
                ))
              )}
            </div>

            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: textMuted }}>
              Pending approvals
            </h3>
            <p className="text-sm font-medium mb-2" style={{ color: textMain }}>
              Awaiting your action
            </p>
            <p className="text-2xl font-semibold mb-4" style={{ color: accent }}>
              {model.kpis.pendingApprovals}
            </p>
            <ul className="text-sm space-y-2" style={{ color: textMuted }}>
              <li className="flex justify-between">
                <span>Level 1 (validation)</span>
                <span style={{ color: textMain }}>{model.pendingByLevel.level1}</span>
              </li>
              <li className="flex justify-between">
                <span>Level 2 (approval)</span>
                <span style={{ color: textMain }}>{model.pendingByLevel.level2}</span>
              </li>
            </ul>
          </section>

          <section
            className="rounded-xl p-5 hidden lg:block"
            style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: textMain }}>
              Risk distribution
            </h2>
            {model.riskDistribution.every((r) => r.count === 0) ? (
              <p className="text-sm" style={{ color: textMuted }}>
                No vendors for this entity yet.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                {model.riskDistribution.map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between mb-1">
                      <span style={{ color: textMuted }}>{row.label}</span>
                      <span style={{ color: textMain }}>
                        {row.count} ({row.pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: surface }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, row.pct)}%`, backgroundColor: row.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
