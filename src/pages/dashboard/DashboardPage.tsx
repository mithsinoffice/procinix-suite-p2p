import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import {
  Clock, AlertTriangle, TrendingUp, FileText, Zap, Timer,
  RefreshCw, ArrowRight, ShieldAlert, Banknote,
} from 'lucide-react'
import {
  useDashboardKpis, useDashboardCharts, type DashboardFilters, type PendingApproval,
} from '../../lib/api/dashboard.api'
import { useApproveInvoice } from '../../lib/api/invoices.api'
import { useMasterData } from '../../hooks/useMasterData'
import { useAuthStore } from '../../stores/auth.store'
import { formatINR, formatINRCompact, formatStatus, formatDate } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'
import { useQueryClient } from '@tanstack/react-query'

// Teal brand palette — also used to colour lane/status segments deterministically.
const CHART_COLORS = ['#1D9E75', '#0F6E56', '#9FE1CB', '#E1F5EE', '#085041', '#04342C', '#3B82F6', '#F59E0B']
const LANE_COLORS: Record<string, string> = {
  STP:           '#1D9E75',
  REVIEW:        '#F59E0B',
  MANUAL:        '#EF4444',
  UNCATEGORIZED: '#9CA3AF',
}

// ── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon:    React.ElementType
  label:   string
  value:   string
  sub?:    string
  color:   string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn('rounded-xl border border-border bg-card p-4 space-y-2', onClick && 'cursor-pointer hover:shadow-sm transition-shadow')}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-full', color)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function KpiSkeleton() {
  return <div className="rounded-xl border border-border bg-card p-4 h-28 animate-pulse bg-muted" />
}

// ── Section card ────────────────────────────────────────────────────────────
function SectionCard({ title, action, onAction, children, className }: {
  title:     string
  action?:   string
  onAction?: () => void
  children:  React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && (
          <button onClick={onAction} className="flex items-center gap-1 text-xs text-primary hover:underline">
            {action} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Date-range presets ──────────────────────────────────────────────────────
type RangePreset = 'this_month' | 'last_month' | 'last_3_months' | 'custom'

function rangeForPreset(preset: RangePreset): { dateFrom?: string; dateTo?: string } {
  const now    = new Date()
  const iso    = (d: Date) => d.toISOString().slice(0, 10)
  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { dateFrom: iso(start), dateTo: iso(end) }
  }
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end   = new Date(now.getFullYear(), now.getMonth(), 0)
    return { dateFrom: iso(start), dateTo: iso(end) }
  }
  if (preset === 'last_3_months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { dateFrom: iso(start), dateTo: iso(end) }
  }
  return {}
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const user     = useAuthStore(s => s.user)
  const masters  = useMasterData()

  const [entityId,    setEntityId]    = useState<string>('')
  const [preset,      setPreset]      = useState<RangePreset>('this_month')
  const [customFrom,  setCustomFrom]  = useState<string>('')
  const [customTo,    setCustomTo]    = useState<string>('')

  // Materialise the active filter object — falls back to preset when not custom.
  const filters: DashboardFilters = useMemo(() => {
    const dr = preset === 'custom'
      ? { dateFrom: customFrom || undefined, dateTo: customTo || undefined }
      : rangeForPreset(preset)
    return {
      ...(entityId ? { entityId } : {}),
      ...dr,
    }
  }, [entityId, preset, customFrom, customTo])

  const { data: kpis,   isLoading: loadingKpis,   isFetching: refetchingKpis }   = useDashboardKpis(filters)
  const { data: charts, isLoading: loadingCharts, isFetching: refetchingCharts } = useDashboardCharts(filters)

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['dashboard', 'kpis'] })
    qc.invalidateQueries({ queryKey: ['dashboard', 'charts'] })
  }
  const refreshing = refetchingKpis || refetchingCharts

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6 max-w-7xl mx-auto">

      {/* Greeting + filters row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AP overview for the selected period</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs"
          >
            <option value="">All entities</option>
            {masters.entities.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select
            value={preset}
            onChange={e => setPreset(e.target.value as RangePreset)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs"
          >
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="last_3_months">Last 3 months</option>
            <option value="custom">Custom</option>
          </select>
          {preset === 'custom' && (
            <>
              <input
                type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
              />
              <input
                type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
              />
            </>
          )}
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-input bg-background h-8 px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI grid — 6 cards on the prompt's spec */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {loadingKpis ? (
          <>{Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}</>
        ) : kpis ? (
          <>
            <KpiCard
              icon={Clock} label="Pending approvals"
              value={String(kpis.pendingApprovalsCount)}
              sub="L1 + L2 + L3"
              color="bg-amber-100 text-amber-600"
              onClick={() => navigate('/approvals')}
            />
            <KpiCard
              icon={TrendingUp} label="Invoice value (period)"
              value={formatINRCompact(kpis.monthlySpend)}
              sub={`${kpis.invoicesThisMonth} invoices`}
              color="bg-blue-100 text-blue-600"
            />
            <KpiCard
              icon={AlertTriangle} label="Overdue"
              value={String(kpis.overdueCount)}
              sub={kpis.overdueAmount > 0 ? formatINRCompact(kpis.overdueAmount) : 'None overdue'}
              color={kpis.overdueCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}
            />
            <KpiCard
              icon={Zap} label="STP rate"
              value={`${kpis.stpRate}%`}
              sub={`${kpis.stpCount} auto-approved`}
              color="bg-teal-100 text-teal-600"
            />
            <KpiCard
              icon={Timer} label="Avg processing"
              value={kpis.avgProcessingDays != null ? `${kpis.avgProcessingDays} d` : '—'}
              sub="Created → approved"
              color="bg-purple-100 text-purple-600"
            />
            <KpiCard
              icon={FileText} label="TDS (period)"
              value={formatINRCompact(kpis.monthlyTds)}
              sub={`FY: ${formatINRCompact(kpis.quarterTds)}`}
              color="bg-indigo-100 text-indigo-600"
              onClick={() => navigate('/payments/tds-challans')}
            />
            <KpiCard
              icon={ShieldAlert} label="MSME due 7d"
              value={String(kpis.msmeDueIn7Days?.count ?? 0)}
              sub={kpis.msmeDueIn7Days?.amount ? formatINRCompact(kpis.msmeDueIn7Days.amount) : 'None at risk'}
              color={(kpis.msmeDueIn7Days?.count ?? 0) > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}
              onClick={() => navigate('/payments?priority=MSME')}
            />
            <KpiCard
              icon={Banknote} label="Payment batches pending"
              value={String(kpis.paymentBatchesPending ?? 0)}
              sub="Awaiting approval"
              color={(kpis.paymentBatchesPending ?? 0) > 0 ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'}
              onClick={() => navigate('/payments/batches?status=PENDING_APPROVAL')}
            />
          </>
        ) : null}
      </div>

      {/* Charts row 1 — Status bar (last 30d) + Lane donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Invoice volume by status (last 30 days)" className="lg:col-span-2">
          <div className="h-56">
            {loadingCharts ? (
              <div className="h-full rounded-lg bg-muted animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.statusLast30 ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-tertiary)" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatStatus} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    formatter={(v: number) => [v, 'Invoices']}
                    labelFormatter={(l: string) => formatStatus(l)}
                  />
                  <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                    {(charts?.statusLast30 ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Lane distribution (period)">
          <div className="h-56">
            {loadingCharts ? (
              <div className="h-full rounded-lg bg-muted animate-pulse" />
            ) : (charts?.laneDonut?.length ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No invoices in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.laneDonut ?? []}
                    dataKey="count"
                    nameKey="lane"
                    cx="50%" cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {(charts?.laneDonut ?? []).map((d, i) => (
                      <Cell key={i} fill={LANE_COLORS[d.lane] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, n]} />
                  <Legend
                    formatter={(v: string) => <span style={{ fontSize: 11 }}>{v}</span>}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Charts row 2 — Top vendors + Match score histogram */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Top 5 vendors by invoice value (period)">
          <div className="h-56">
            {loadingCharts ? (
              <div className="h-full rounded-lg bg-muted animate-pulse" />
            ) : (charts?.topVendors?.length ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No invoices in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.topVendors ?? []} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <XAxis type="number" tickFormatter={v => formatINRCompact(v)} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="legalName"
                    type="category"
                    tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                    width={120}
                  />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Bar dataKey="amount" name="Spend" radius={[0, 3, 3, 0]}>
                    {(charts?.topVendors ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Match score distribution (period)">
          <div className="h-56">
            {loadingCharts ? (
              <div className="h-full rounded-lg bg-muted animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.matchHistogram ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-tertiary)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip formatter={(v: number) => [v, 'Invoices']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(charts?.matchHistogram ?? []).map((b, i) => {
                      // Colour each bucket distinctly — red for low, green for high.
                      const tone = b.min >= 86 ? '#1D9E75'
                                : b.min >= 71 ? '#9FE1CB'
                                : b.min >= 51 ? '#F59E0B'
                                :               '#EF4444'
                      return <Cell key={i} fill={tone} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Pending approvals table */}
      <SectionCard
        title={`Pending approvals (${kpis?.pendingApprovalsCount ?? 0})`}
        action="Open approval desk"
        onAction={() => navigate('/approvals')}
      >
        {loadingKpis ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : (kpis?.pendingApprovals?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No pending approvals 🎉</p>
        ) : (
          <PendingApprovalsTable rows={kpis!.pendingApprovals} />
        )}
      </SectionCard>

    </div>
  )
}

// ── Pending approvals table ─────────────────────────────────────────────────
// Sorted by daysPending descending so the most-aged invoices surface first.
function PendingApprovalsTable({ rows }: { rows: PendingApproval[] }) {
  return (
    <div className="-mx-4 -mb-4 overflow-x-auto border-t border-border">
      <table className="w-full text-xs">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            {['Invoice no', 'Vendor', 'Invoice date', 'Amount', 'Days pending', 'Approver', 'Action'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <PendingApprovalRow key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PendingApprovalRow({ row }: { row: PendingApproval }) {
  const navigate = useNavigate()
  const approve  = useApproveInvoice(row.id)
  const aged     = row.daysPending > 2
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20">
      <td className="px-3 py-2 font-mono">{row.invoiceNumber}</td>
      <td className="px-3 py-2 max-w-[220px] truncate">{row.vendor?.legalName ?? 'Unmatched vendor'}</td>
      <td className="px-3 py-2 text-muted-foreground">{formatDate(row.invoiceDate)}</td>
      <td className="px-3 py-2 tabular-nums font-mono">{formatINR(row.netPayable)}</td>
      <td className={cn('px-3 py-2 tabular-nums', aged ? 'text-amber-600 font-medium' : '')}>
        {row.daysPending} d
      </td>
      <td className="px-3 py-2">
        {row.approverName ? (
          <span>
            {row.approverName}
            {row.approverLevel != null && <span className="text-muted-foreground ml-1">· L{row.approverLevel}</span>}
          </span>
        ) : '—'}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => approve.mutate(undefined)}
            disabled={approve.isPending}
            className="rounded-md bg-green-50 border border-green-200 px-2 py-1 text-[11px] font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
          >
            {approve.isPending ? '…' : '✓ Approve'}
          </button>
          <button
            onClick={() => navigate(`/invoices/${row.id}`)}
            className="rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-muted"
          >
            View
          </button>
        </div>
      </td>
    </tr>
  )
}
