import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import {
  Clock, AlertTriangle, TrendingUp, Banknote,
  CheckCircle, FileText, Users, ArrowRight,
} from 'lucide-react'
import { useDashboardKpis, useSpendTrend, useSpendByGl, useRecentActivity } from '../../lib/api/dashboard.api'
import { useApproveInvoice } from '../../lib/api/invoices.api'
import { useAuthStore } from '../../stores/auth.store'
import { formatINR, formatINRCompact, formatStatus } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

// ── Colour palette (teal brand) ──
const CHART_COLORS = ['#1D9E75', '#0F6E56', '#9FE1CB', '#E1F5EE', '#085041', '#04342C', '#3B82F6', '#F59E0B']

// ── KPI card ──
function KpiCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ElementType; label: string; value: string; sub?: string
  color: string; onClick?: () => void
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

// ── Section header ──
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1 text-xs text-primary hover:underline">
          {action} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ── Custom tooltip for charts ──
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatINRCompact(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const user     = useAuthStore(s => s.user)
  const { data: kpis,      isLoading: loadingKpis }  = useDashboardKpis()
  const { data: trend,     isLoading: loadingTrend }  = useSpendTrend()
  const { data: byGl,      isLoading: loadingGl    }  = useSpendByGl()
  const { data: _activity                           }  = useRecentActivity()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  function KpiSkeleton() {
    return <div className="rounded-xl border border-border bg-card p-4 h-28 animate-pulse bg-muted" />
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 max-w-7xl mx-auto">

      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here's your AP overview for today</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loadingKpis ? (
          <>
            {[...Array(8)].map((_, i) => <KpiSkeleton key={i} />)}
          </>
        ) : kpis ? (
          <>
            <KpiCard
              icon={Clock} label="Pending approvals"
              value={String(kpis.pendingApprovalsCount)}
              sub="Need your action"
              color="bg-amber-100 text-amber-600"
              onClick={() => navigate('/invoices/review')}
            />
            <KpiCard
              icon={AlertTriangle} label="Overdue invoices"
              value={String(kpis.overdueCount)}
              sub={kpis.overdueAmount > 0 ? formatINRCompact(kpis.overdueAmount) : 'None overdue'}
              color={kpis.overdueCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}
            />
            <KpiCard
              icon={TrendingUp} label="This month AP"
              value={formatINRCompact(kpis.monthlySpend)}
              sub={`${kpis.invoicesThisMonth} invoices`}
              color="bg-blue-100 text-blue-600"
            />
            <KpiCard
              icon={Banknote} label="Available balance"
              value={kpis.balance ? formatINRCompact(kpis.balance.availableBalance) : '—'}
              sub={kpis.balance ? 'Live from bank' : 'Connect Transbnk'}
              color="bg-teal-100 text-teal-600"
            />
            <KpiCard
              icon={FileText} label="Quarter TDS"
              value={formatINRCompact(kpis.quarterTds)}
              sub="Current FY quarter"
              color="bg-purple-100 text-purple-600"
              onClick={() => navigate('/payments/tds')}
            />
            <KpiCard
              icon={Users} label="Active vendors"
              value={String(kpis.totalVendors)}
              sub="KYC verified"
              color="bg-indigo-100 text-indigo-600"
              onClick={() => navigate('/masters/vendors')}
            />
            {kpis.invoicesByStatus.slice(0, 2).map(s => (
              <KpiCard
                key={s.status}
                icon={CheckCircle} label={formatStatus(s.status)}
                value={String(s.count)}
                sub="Invoices"
                color="bg-gray-100 text-gray-600"
              />
            ))}
          </>
        ) : null}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Spend trend — takes 2/3 width */}
        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <SectionHeader title="6-month spend trend" />
          <div className="mt-4 h-52">
            {loadingTrend ? (
              <div className="h-full rounded-lg bg-muted animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => formatINRCompact(v)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="spend" name="Spend" stroke="#1D9E75" strokeWidth={2} fill="url(#spendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Invoice status donut */}
        <div className="rounded-xl border border-border bg-card p-4">
          <SectionHeader title="Invoice status" />
          <div className="mt-4 h-52 flex items-center justify-center">
            {loadingKpis || !kpis ? (
              <div className="h-40 w-40 rounded-full bg-muted animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kpis.invoicesByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%" cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {kpis.invoicesByStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [v, formatStatus(n)]} />
                  <Legend
                    formatter={(v: any) => <span style={{ fontSize: 11 }}>{formatStatus(v)}</span>}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Pending approvals list */}
        <div className="rounded-xl border border-border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <SectionHeader
              title={`Pending approvals (${kpis?.pendingApprovalsCount ?? 0})`}
              action="View all"
              onAction={() => navigate('/invoices/review')}
            />
          </div>
          {loadingKpis ? (
            <div className="space-y-2 p-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : !kpis?.pendingApprovals.length ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm text-muted-foreground">No pending approvals 🎉</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {kpis.pendingApprovals.map(inv => (
                <PendingApprovalRow key={inv.id} inv={inv} onAction={() => navigate(`/invoices/${inv.id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Spend by GL code */}
        <div className="rounded-xl border border-border bg-card p-4">
          <SectionHeader title="Spend by GL (FY)" />
          <div className="mt-4 h-52">
            {loadingGl ? (
              <div className="h-full rounded-lg bg-muted animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byGl} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <XAxis type="number" tickFormatter={v => formatINRCompact(v)} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="glCode" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(v: any) => formatINR(v)} />
                  <Bar dataKey="amount" name="Spend" radius={[0, 3, 3, 0]}>
                    {byGl?.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}

// ── Pending approval row with quick-approve ──
function PendingApprovalRow({ inv, onAction }: { inv: any; onAction: () => void }) {
  const approve = useApproveInvoice(inv.id)
  const daysOld = Math.floor((Date.now() - new Date(inv.createdAt).getTime()) / 86_400_000)

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onAction}>
        <p className="text-sm font-medium truncate">{inv.vendor.legalName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</span>
          {daysOld > 2 && (
            <span className="text-xs text-amber-600">{daysOld}d waiting</span>
          )}
        </div>
      </div>
      <p className="text-sm font-semibold tabular-nums flex-shrink-0">{formatINR(inv.netPayable)}</p>
      <button
        onClick={() => approve.mutate(undefined)}
        disabled={approve.isPending}
        className="flex-shrink-0 rounded-md bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
      >
        {approve.isPending ? '…' : '✓ Approve'}
      </button>
    </div>
  )
}
