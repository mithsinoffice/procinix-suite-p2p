import { useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useProcurementAnalytics, type AnalyticsFilters, type ProcurementMaverickPO, type ProcurementCycleHealth, type ProcurementSavingsCat, type ProcurementVendorCon, type ProcurementLeakage, type ProcurementComplianceTrend, type ProcurementSpendByCat } from '../../../lib/api/analytics.api'
import { formatINR, formatINRCompact } from '../../../lib/utils/formatters'
import { toArray, cn } from '../../../lib/utils'
import { KpiCard } from '../components/KpiCard'
import { HBarChart } from '../components/BarChart'
import { DrillDown, InsightCard } from '../components/DrillDown'

type Drill = null | 'maverick' | 'cycle' | 'savings' | 'concentration'

export default function ProcurementTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading, error } = useProcurementAnalytics(filters)
  const [drill, setDrill] = useState<Drill>(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
    )
  }
  // Surface server errors visibly — without this the previous tab fell back
  // to perpetual skeleton when the endpoint 500'd on a Prisma relation bug.
  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
        <p className="text-sm font-medium text-red-800">Procurement analytics failed to load.</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Unknown error — check server logs at /api/analytics/procurement'}
        </p>
      </div>
    )
  }

  const maverickPOs   = toArray<ProcurementMaverickPO>(data.maverickPOs)
  const cycleHealth   = toArray<ProcurementCycleHealth>(data.cycleHealthByStage)
  const savingsByCat  = toArray<ProcurementSavingsCat>(data.savingsByCategory)
  const vendorConc    = toArray<ProcurementVendorCon>(data.vendorConcentration)
  const leakage       = toArray<ProcurementLeakage>(data.savingsLeakage)
  const complianceTrend = toArray<ProcurementComplianceTrend>(data.poComplianceTrend)
  const spendByCat    = toArray<ProcurementSpendByCat>(data.spendByCategory)

  if (drill === 'maverick') {
    return (
      <DrillDown
        title="Maverick spend breakdown"
        subtitle={`${maverickPOs.length} POs without an upstream PR — ${data.maverickSpendPct}% of total spend`}
        onBack={() => setDrill(null)}>
        <InsightCard
          tone="amber"
          title="Why this matters"
          description="POs raised without a PR bypass budget gates and vendor pre-approval, leaking 1.5–3% of spend annually. Top fix: enforce PR-before-PO on categories above ₹50K."
        />
        <div className="mt-3 rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">PO ref</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Reason given</th>
              </tr>
            </thead>
            <tbody>
              {maverickPOs.map(po => (
                <tr key={po.poRef} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{po.poRef}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate">{po.vendorName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(po.amount)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{po.category}</td>
                  <td className="px-3 py-2 text-xs">{po.hasReason ? <span className="text-emerald-700">Yes</span> : <span className="text-red-700">Missing</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DrillDown>
    )
  }

  if (drill === 'cycle') {
    return (
      <DrillDown
        title="PR → PO cycle health"
        subtitle={`Average ${data.prToPoCycleDays}d · P50 ${data.prToPoCycleP50}d · P90 ${data.prToPoCycleP90}d`}
        onBack={() => setDrill(null)}>
        <div className="space-y-2">
          {cycleHealth.map(s => (
            <div key={s.stage} className="rounded-md border border-border bg-card p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{s.stage}</p>
                <p className="text-[10px] text-muted-foreground">Target {s.targetDays}d · P90 {s.p90Days}d</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">{s.avgDays}d</span>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium',
                  s.status === 'RED'   && 'bg-red-100 text-red-700',
                  s.status === 'AMBER' && 'bg-amber-100 text-amber-700',
                  s.status === 'OK'    && 'bg-emerald-100 text-emerald-700',
                )}>{s.status}</span>
              </div>
            </div>
          ))}
          <InsightCard
            tone="blue"
            title="What to do now"
            description="Auto-route approvals via the workflow engine — bottlenecks in PR draft → PR approve typically reflect single-approver chains. Add a parallel approver or auto-approve threshold for spend &lt; ₹25K."
          />
        </div>
      </DrillDown>
    )
  }

  if (drill === 'savings') {
    return (
      <DrillDown
        title="Savings by category"
        subtitle={`${formatINR(data.savingsAchieved)} achieved vs ${formatINR(data.savingsTarget)} target (3% of spend)`}
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-right">Baseline</th>
                <th className="px-3 py-2 text-right">Actual</th>
                <th className="px-3 py-2 text-right">Saving</th>
                <th className="px-3 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {savingsByCat.map(c => (
                <tr key={c.category} className="border-t border-border">
                  <td className="px-3 py-2">{c.category}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(c.baseline)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(c.actual)}</td>
                  <td className={cn('px-3 py-2 text-right tabular-nums font-medium', c.saving > 0 ? 'text-emerald-700' : 'text-muted-foreground')}>{formatINR(c.saving)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DrillDown>
    )
  }

  if (drill === 'concentration') {
    return (
      <DrillDown
        title="Top vendor concentration"
        subtitle="HIGH-risk vendors warrant a dual-source within 90 days"
        onBack={() => setDrill(null)}>
        <div className="space-y-2">
          {vendorConc.map(v => (
            <div key={v.vendorName} className="rounded-md border border-border bg-card p-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{v.vendorName}</span>
                  {v.isMsme && <span className="rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">MSME</span>}
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                    v.kycStatus === 'COMPLIANT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                    KYC {v.kycStatus.toLowerCase()}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatINR(v.spendAmount)} · {v.spendPct}% of spend</p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium',
                v.riskLevel === 'HIGH'   && 'bg-red-100 text-red-700',
                v.riskLevel === 'MEDIUM' && 'bg-amber-100 text-amber-700',
                v.riskLevel === 'LOW'    && 'bg-emerald-100 text-emerald-700')}>
                {v.riskLevel}
              </span>
            </div>
          ))}
        </div>
      </DrillDown>
    )
  }

  // Main view
  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Maverick spend"
          value={`${data.maverickSpendPct}%`}
          subtitle={formatINR(data.maverickSpendAmount)}
          tone={data.maverickSpendPct > 30 ? 'red' : data.maverickSpendPct > 15 ? 'amber' : 'green'}
          onClick={() => setDrill('maverick')}
        />
        <KpiCard
          label="PR → PO cycle"
          value={`${data.prToPoCycleDays}d`}
          subtitle={`P90 ${data.prToPoCycleP90}d`}
          tone={data.prToPoCycleDays > 7 ? 'amber' : 'green'}
          onClick={() => setDrill('cycle')}
        />
        <KpiCard
          label="Savings vs target"
          value={`${formatINRCompact(data.savingsAchieved)} / ${formatINRCompact(data.savingsTarget)}`}
          subtitle="3% target on total spend"
          tone={data.savingsAchieved >= data.savingsTarget ? 'green' : 'amber'}
          onClick={() => setDrill('savings')}
        />
        <KpiCard
          label="Contracted spend"
          value={`${data.contractedSpendPct}%`}
          subtitle={`Total spend ${formatINRCompact(data.totalSpend)}`}
          tone="teal"
        />
      </div>

      {/* Compliance trend + vendor concentration */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">PO compliance trend (6 months)</h3>
          {complianceTrend.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={complianceTrend}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#999" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#999" domain={[0, 100]} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="compliancePct" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Top vendor concentration</h3>
            <button
              type="button"
              onClick={() => setDrill('concentration')}
              className="text-[11px] text-teal-600 hover:underline">Detail →</button>
          </div>
          <HBarChart
            labelWidth={120}
            rows={vendorConc.map(v => ({
              label:   v.vendorName,
              value:   v.spendAmount,
              display: formatINRCompact(v.spendAmount) + ` · ${v.spendPct}%`,
              tone:    v.riskLevel === 'HIGH' ? 'red' : v.riskLevel === 'MEDIUM' ? 'amber' : 'teal',
            }))}
            onRowClick={() => setDrill('concentration')}
          />
        </div>
      </div>

      {/* Spend by category + savings leakage */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Spend by category</h3>
          <HBarChart
            labelWidth={130}
            rows={spendByCat.map(c => ({
              label: c.category,
              value: c.amount,
              display: formatINRCompact(c.amount) + (c.utilizationPct > 0 ? ` · ${c.utilizationPct}%` : ''),
              tone:  c.utilizationPct > 90 ? 'red' : c.utilizationPct > 70 ? 'amber' : 'teal',
            }))}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold mb-1">Savings leakage</h3>
          {leakage.map(l => (
            <InsightCard
              key={l.source}
              tone={l.amount > 100_000 ? 'red' : l.amount > 25_000 ? 'amber' : 'blue'}
              title={`${l.source} · ${formatINR(l.amount)}`}
              description={l.description}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
