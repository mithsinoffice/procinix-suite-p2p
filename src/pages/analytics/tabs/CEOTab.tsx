import { useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceDot } from 'recharts'
import { useCeoAnalytics, type AnalyticsFilters, type MaturityDimensionRow, type StrategicInitiative, type SpendTrendRow, type CeoVendorConRow, type RiskRegisterRow, type KeyAlert } from '../../../lib/api/analytics.api'
import { formatINR, formatINRCompact } from '../../../lib/utils/formatters'
import { toArray, cn } from '../../../lib/utils'
import { KpiCard } from '../components/KpiCard'
import { HBarChart } from '../components/BarChart'
import { DrillDown, InsightCard } from '../components/DrillDown'

type Drill = null | 'maturity' | 'initiatives' | 'spend' | 'vendor' | 'risk'

export default function CEOTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useCeoAnalytics(filters)
  const [drill, setDrill] = useState<Drill>(null)

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
    )
  }

  const maturity   = toArray<MaturityDimensionRow>(data.maturityDimensions)
  const initiatives = toArray<StrategicInitiative>(data.strategicInitiatives)
  const spendTrend = toArray<SpendTrendRow>(data.spendTrend)
  const vendorConc = toArray<CeoVendorConRow>(data.vendorConcentration)
  const riskReg    = toArray<RiskRegisterRow>(data.riskRegister)
  const alerts     = toArray<KeyAlert>(data.keyAlerts)

  if (drill === 'maturity') {
    return (
      <DrillDown
        title="P2P maturity by dimension"
        subtitle={`Composite ${data.p2pMaturityScore}/100 · benchmark ${data.p2pMaturityBenchmark}`}
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Dimension</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-right">Benchmark</th>
                <th className="px-3 py-2 text-right">Gap</th>
                <th className="px-3 py-2 text-right">Annual impact</th>
              </tr>
            </thead>
            <tbody>
              {maturity.map(m => (
                <tr key={m.dimension} className="border-t border-border">
                  <td className="px-3 py-2">{m.dimension}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{m.score}/{m.maxScore}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{m.benchmark}</td>
                  <td className={cn('px-3 py-2 text-right tabular-nums', m.gap > 10 ? 'text-red-700' : 'text-amber-700')}>{m.gap > 0 ? `-${m.gap}` : '0'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{formatINR(m.annualImpact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DrillDown>
    )
  }

  if (drill === 'initiatives') {
    return (
      <DrillDown
        title="Strategic initiatives"
        subtitle="Top 3 ranked by ROI · paybackMonths sorted ascending"
        onBack={() => setDrill(null)}>
        <div className="space-y-3">
          {initiatives.map(i => (
            <div key={i.rank} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-teal-600 text-white text-[10px] font-semibold">{i.rank}</span>
                    <h4 className="text-sm font-semibold">{i.title}</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{i.implementation}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-semibold tabular-nums text-emerald-700">{formatINRCompact(i.annualBenefit)}</div>
                  <div className="text-[10px] text-muted-foreground">{i.roi} ROI · {i.paybackMonths}mo payback</div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-[9px] uppercase text-muted-foreground">Effort</div>
                  <div className="font-medium">{i.effort}</div>
                </div>
                <div className="rounded-md bg-red-50 border border-red-100 p-2">
                  <div className="text-[9px] uppercase text-red-700">Current</div>
                  <div className="text-red-900">{i.currentState}</div>
                </div>
                <div className="rounded-md bg-emerald-50 border border-emerald-100 p-2">
                  <div className="text-[9px] uppercase text-emerald-700">Target</div>
                  <div className="text-emerald-900">{i.targetState}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DrillDown>
    )
  }

  if (drill === 'spend') {
    const anomalies = spendTrend.filter(t => t.isAnomaly)
    return (
      <DrillDown
        title="Spend trend — 6 months"
        subtitle={`FY total ${formatINR(data.totalSpendFY)} · annualised ${formatINR(data.spendAnnualised)}`}
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#999" />
                <YAxis tick={{ fontSize: 10 }} stroke="#999" tickFormatter={v => formatINRCompact(v)} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => formatINR(v)} />
                <Line type="monotone" dataKey="amount" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                {anomalies.map(a => (
                  <ReferenceDot key={a.month} x={a.month} y={a.amount} r={6} fill="#dc2626" stroke="#fff" strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {anomalies.length > 0 && (
          <div className="mt-3 space-y-2">
            {anomalies.map(a => (
              <InsightCard key={a.month} tone="red" title={`Anomaly · ${a.month}`} description={`${formatINR(a.amount)} — ${a.anomalyNote}`} />
            ))}
          </div>
        )}
      </DrillDown>
    )
  }

  if (drill === 'vendor') {
    return (
      <DrillDown
        title="Vendor concentration"
        subtitle="Continuity-of-supply risk by share of total PO spend"
        onBack={() => setDrill(null)}>
        <HBarChart
          labelWidth={140}
          rows={vendorConc.map(v => ({
            label: v.vendorName,
            value: v.spendPct,
            display: `${v.spendPct}% · ${v.risk}`,
            tone:  v.risk === 'HIGH' ? 'red' : v.risk === 'MEDIUM' ? 'amber' : 'teal',
          }))}
        />
        <div className="mt-3 space-y-2">
          {vendorConc.map(v => (
            <InsightCard
              key={v.vendorName}
              tone={v.risk === 'HIGH' ? 'red' : v.risk === 'MEDIUM' ? 'amber' : 'green'}
              title={`${v.vendorName} · ${v.risk}`}
              description={v.action}
            />
          ))}
        </div>
      </DrillDown>
    )
  }

  if (drill === 'risk') {
    return (
      <DrillDown
        title="Risk register"
        subtitle="Quantified exposures requiring board-level visibility"
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2 text-right">Exposure</th>
                <th className="px-3 py-2">Deadline</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Decision</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {riskReg.map((r, i) => (
                <tr key={`${r.risk}-${i}`} className="border-t border-border">
                  <td className="px-3 py-2">{r.risk}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.exposure > 0 ? formatINR(r.exposure) : '—'}</td>
                  <td className="px-3 py-2 text-xs">{r.deadline}</td>
                  <td className="px-3 py-2 text-xs">{r.owner}</td>
                  <td className="px-3 py-2 text-xs">{r.decisionNeeded}</td>
                  <td className="px-3 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium',
                      r.status === 'RED'   && 'bg-red-100 text-red-700',
                      r.status === 'AMBER' && 'bg-amber-100 text-amber-700',
                      r.status === 'GREEN' && 'bg-emerald-100 text-emerald-700')}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DrillDown>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total spend (FY)"
          value={formatINRCompact(data.totalSpendFY)}
          subtitle={`Annualised ${formatINRCompact(data.spendAnnualised)}`}
          tone="teal"
          onClick={() => setDrill('spend')}
        />
        <KpiCard
          label="P2P maturity"
          value={`${data.p2pMaturityScore}/100`}
          subtitle={`Benchmark ${data.p2pMaturityBenchmark}`}
          tone={data.p2pMaturityScore >= data.p2pMaturityBenchmark ? 'green' : data.p2pMaturityScore >= 60 ? 'amber' : 'red'}
          onClick={() => setDrill('maturity')}
        />
        <KpiCard
          label="Working capital at risk"
          value={formatINRCompact(data.wcAtRisk)}
          subtitle={`${data.maverickPct.toFixed(1)}% maverick · ${data.contractedPct}% contracted`}
          tone={data.wcAtRisk > 0 ? 'red' : 'green'}
        />
        <KpiCard
          label="Financial risk exposure"
          value={formatINRCompact(data.financialRiskExposure)}
          subtitle="Quantified across register"
          tone={data.financialRiskExposure > 0 ? 'amber' : 'green'}
          onClick={() => setDrill('risk')}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Spend trend (6 months)</h3>
            <button onClick={() => setDrill('spend')} className="text-[11px] text-teal-600 hover:underline">Detail →</button>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#999" />
                <YAxis tick={{ fontSize: 10 }} stroke="#999" tickFormatter={v => formatINRCompact(v)} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => formatINR(v)} />
                <Line type="monotone" dataKey="amount" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Key alerts</h3>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <InsightCard
                key={`${a.type}-${i}`}
                tone={a.urgency === 'HIGH' ? 'red' : a.urgency === 'MEDIUM' ? 'amber' : 'blue'}
                title={a.message}
                description={a.action}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Maturity dimensions</h3>
            <button onClick={() => setDrill('maturity')} className="text-[11px] text-teal-600 hover:underline">Detail →</button>
          </div>
          <HBarChart
            labelWidth={130}
            rows={maturity.map(m => ({
              label: m.dimension,
              value: m.score,
              display: `${m.score} / ${m.benchmark}`,
              tone:  m.score >= m.benchmark ? 'emerald' : m.gap > 15 ? 'red' : 'amber',
            }))}
            onRowClick={() => setDrill('maturity')}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Vendor concentration</h3>
            <button onClick={() => setDrill('vendor')} className="text-[11px] text-teal-600 hover:underline">Detail →</button>
          </div>
          <HBarChart
            labelWidth={130}
            rows={vendorConc.map(v => ({
              label: v.vendorName,
              value: v.spendPct,
              display: `${v.spendPct}%`,
              tone:  v.risk === 'HIGH' ? 'red' : v.risk === 'MEDIUM' ? 'amber' : 'teal',
            }))}
            onRowClick={() => setDrill('vendor')}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Strategic initiatives — top 3 by ROI</h3>
          <button onClick={() => setDrill('initiatives')} className="text-[11px] text-teal-600 hover:underline">All initiatives →</button>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {initiatives.map(i => (
            <div key={i.rank} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-teal-600 text-white text-[10px] font-semibold">{i.rank}</span>
                <h4 className="text-sm font-semibold flex-1 truncate">{i.title}</h4>
              </div>
              <div className="text-xs text-emerald-700 font-semibold tabular-nums">{formatINRCompact(i.annualBenefit)}/yr</div>
              <div className="text-[10px] text-muted-foreground">{i.roi} · {i.paybackMonths}mo · {i.effort}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
