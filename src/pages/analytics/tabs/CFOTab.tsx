import { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCfoAnalytics, type AnalyticsFilters, type WcLeakageRow, type BsPositionRow, type CashForecastRow, type BudgetActualRow, type AmortForecastRow, type ProvisionAdequacyRow, type ReforecastSignal } from '../../../lib/api/analytics.api'
import { formatINR, formatINRCompact } from '../../../lib/utils/formatters'
import { toArray, cn } from '../../../lib/utils'
import { KpiCard } from '../components/KpiCard'
import { DrillDown, InsightCard } from '../components/DrillDown'

type Drill = null | 'apLiability' | 'wc' | 'bs' | 'budget' | 'cash'

export default function CFOTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useCfoAnalytics(filters)
  const [drill, setDrill] = useState<Drill>(null)

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
    )
  }

  const leakage   = toArray<WcLeakageRow>(data.wcLeakageBreakdown)
  const positions = toArray<BsPositionRow>(data.bsPositions)
  const forecast  = toArray<CashForecastRow>(data.cashForecast)
  const budgets   = toArray<BudgetActualRow>(data.budgetVsActual)
  const amort     = toArray<AmortForecastRow>(data.amortizationForecast)
  const provAdeq  = toArray<ProvisionAdequacyRow>(data.provisionAdequacy)
  const signals   = toArray<ReforecastSignal>(data.budgetReforecastSignals)

  if (drill === 'wc') {
    return (
      <DrillDown
        title="Working capital leakage"
        subtitle={`${formatINR(data.wcAtRisk)} at risk · ${formatINR(data.optimisationOpportunity)} recoverable`}
        onBack={() => setDrill(null)}>
        {leakage.map(l => (
          <InsightCard
            key={l.source}
            tone={l.amount > 200_000 ? 'red' : l.amount > 50_000 ? 'amber' : 'blue'}
            title={`${l.source} · ${formatINR(l.amount)}`}
            description={`${l.action} (${l.timeframe})`}
          />
        ))}
      </DrillDown>
    )
  }

  if (drill === 'bs') {
    return (
      <DrillDown
        title="Balance sheet positions"
        subtitle="AP, accruals, prepaid, TDS — point-in-time view"
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-right">MoM movement</th>
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Settlement</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.account} className="border-t border-border">
                  <td className="px-3 py-2">{p.account}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(p.balance)}</td>
                  <td className={cn('px-3 py-2 text-right tabular-nums',
                    p.movement > 0 ? 'text-red-700' : p.movement < 0 ? 'text-emerald-700' : 'text-muted-foreground')}>
                    {p.movement > 0 ? '+' : ''}{formatINR(p.movement)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium',
                      p.risk === 'RED'   && 'bg-red-100 text-red-700',
                      p.risk === 'AMBER' && 'bg-amber-100 text-amber-700',
                      p.risk === 'GREEN' && 'bg-emerald-100 text-emerald-700')}>{p.risk}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{p.settlementExpected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DrillDown>
    )
  }

  if (drill === 'budget') {
    return (
      <DrillDown
        title="Budget vs actual — reforecast table"
        subtitle="Run-rate projection compared against FY revised budget"
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-right">Budget</th>
                <th className="px-3 py-2 text-right">Actual</th>
                <th className="px-3 py-2 text-right">Util %</th>
                <th className="px-3 py-2 text-right">Run rate/mo</th>
                <th className="px-3 py-2 text-right">Projected FY</th>
                <th className="px-3 py-2">Signal</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map(b => (
                <tr key={b.category} className="border-t border-border">
                  <td className="px-3 py-2 max-w-[180px] truncate">{b.category}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(b.budget)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(b.actual)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.utilPct}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(b.monthlyRunRate)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(b.projectedFY)}</td>
                  <td className="px-3 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium',
                      b.signal === 'RED'   && 'bg-red-100 text-red-700',
                      b.signal === 'AMBER' && 'bg-amber-100 text-amber-700',
                      b.signal === 'GREEN' && 'bg-emerald-100 text-emerald-700')}>{b.signal}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {signals.length > 0 && (
          <div className="mt-3 space-y-2">
            {signals.map(s => (
              <InsightCard
                key={s.category}
                tone={s.signal === 'RED' ? 'red' : s.signal === 'AMBER' ? 'amber' : 'green'}
                title={s.category}
                description={s.detail}
              />
            ))}
          </div>
        )}
      </DrillDown>
    )
  }

  if (drill === 'cash') {
    return (
      <DrillDown
        title="Cash forecast — 8 weeks + 3 months"
        subtitle="Based on unpaid approved invoices and due-date distribution"
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast}>
                <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="#999" />
                <YAxis tick={{ fontSize: 10 }} stroke="#999" tickFormatter={v => formatINRCompact(v)} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="amount" fill="#0d9488" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </DrillDown>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="AP liability"
          value={formatINRCompact(data.totalApLiability)}
          subtitle={`${data.apLiabilityMoM >= 0 ? '+' : ''}${formatINRCompact(data.apLiabilityMoM)} vs last month`}
          tone={data.apLiabilityMoM > 0 ? 'amber' : 'green'}
          deltaTone="inverse"
          deltaDir={data.apLiabilityMoM > 0 ? 'up' : 'down'}
          onClick={() => setDrill('bs')}
        />
        <KpiCard
          label="WC at risk"
          value={formatINRCompact(data.wcAtRisk)}
          subtitle={`Recoverable ${formatINRCompact(data.optimisationOpportunity)}`}
          tone={data.wcAtRisk > 0 ? 'red' : 'green'}
          onClick={() => setDrill('wc')}
        />
        <KpiCard
          label="Provision balance"
          value={formatINRCompact(data.accruals.provisionBalance)}
          subtitle={`Reverses ${data.accruals.provisionReversalDate}`}
          tone="teal"
        />
        <KpiCard
          label="Prepaid balance"
          value={formatINRCompact(data.accruals.prepaidBalance)}
          subtitle={`${formatINRCompact(data.accruals.prepaidMonthlyRecognition)} / month recognised`}
          tone="blue"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Cash forecast (next 11 periods)</h3>
            <button onClick={() => setDrill('cash')} className="text-[11px] text-teal-600 hover:underline">Detail →</button>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast}>
                <XAxis dataKey="period" tick={{ fontSize: 9 }} stroke="#999" />
                <YAxis tick={{ fontSize: 10 }} stroke="#999" tickFormatter={v => formatINRCompact(v)} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="amount" fill="#0d9488" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Working capital leakage</h3>
            <button onClick={() => setDrill('wc')} className="text-[11px] text-teal-600 hover:underline">Detail →</button>
          </div>
          <div className="space-y-2">
            {leakage.map(l => (
              <div key={l.source} className="rounded-md border border-border p-2.5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{l.source}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{l.action} · {l.timeframe}</div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-red-700">{formatINRCompact(l.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Budget vs actual</h3>
            <button onClick={() => setDrill('budget')} className="text-[11px] text-teal-600 hover:underline">Reforecast →</button>
          </div>
          <div className="space-y-2">
            {budgets.slice(0, 6).map(b => (
              <div key={b.category} className="rounded-md border border-border p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate flex-1 mr-2">{b.category}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                    b.signal === 'RED'   && 'bg-red-100 text-red-700',
                    b.signal === 'AMBER' && 'bg-amber-100 text-amber-700',
                    b.signal === 'GREEN' && 'bg-emerald-100 text-emerald-700')}>{b.utilPct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div className={cn('h-full rounded-full',
                    b.signal === 'RED'   ? 'bg-red-500' :
                    b.signal === 'AMBER' ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, b.utilPct)}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                  {formatINRCompact(b.actual)} of {formatINRCompact(b.budget)} · projected {formatINRCompact(b.projectedFY)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Accrual snapshot</h3>
          <div className="space-y-1.5 text-sm">
            <Row label="Provision balance"  value={formatINR(data.accruals.provisionBalance)} />
            <Row label="Provision reverses" value={data.accruals.provisionReversalDate} />
            <Row label="Prepaid balance"    value={formatINR(data.accruals.prepaidBalance)} />
            <Row label="Prepaid monthly"    value={formatINR(data.accruals.prepaidMonthlyRecognition)} />
            <Row label="TDS payable"        value={formatINR(data.accruals.tdsPayable)} />
            <Row label="MSME interest risk" value={formatINR(data.accruals.msmeInterestRisk)} tone="red" />
          </div>

          {amort.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">Amortization next 6 months</h4>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={amort}>
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="#999" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#999" tickFormatter={v => formatINRCompact(v)} />
                    <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => formatINR(v)} />
                    <Bar dataKey="amount" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {provAdeq.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Provision adequacy</h3>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-[11px] font-medium text-muted-foreground">
                  <th className="px-3 py-2">Schedule</th>
                  <th className="px-3 py-2 text-right">Provision</th>
                  <th className="px-3 py-2 text-right">Actual</th>
                  <th className="px-3 py-2 text-right">Variance</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {provAdeq.map((p, i) => (
                  <tr key={`${p.item}-${i}`} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-[11px]">{p.item.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(p.provision)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(p.actual)}</td>
                    <td className={cn('px-3 py-2 text-right tabular-nums', p.variance > 0 ? 'text-red-700' : 'text-emerald-700')}>{p.variance > 0 ? '+' : ''}{formatINR(p.variance)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{p.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'red' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium tabular-nums', tone === 'red' && 'text-red-700')}>{value}</span>
    </div>
  )
}
