import { useState } from 'react'
import { useApAnalytics, type AnalyticsFilters, type AgingBucket as AgingRow, type AgingItem, type StpReadinessItem, type ExceptionRow, type OcrAccuracyRow, type MatchTypeRow, type MatchRange } from '../../../lib/api/analytics.api'
import { formatINR, formatINRCompact } from '../../../lib/utils/formatters'
import { toArray, cn } from '../../../lib/utils'
import { KpiCard } from '../components/KpiCard'
import { HBarChart } from '../components/BarChart'
import { AgingBars } from '../components/AgingBars'
import { DrillDown, InsightCard } from '../components/DrillDown'

type Drill = null | 'dpo' | 'stp' | 'exceptions' | 'aging' | 'ocr'

export default function APTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useApAnalytics(filters)
  const [drill, setDrill] = useState<Drill>(null)

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
    )
  }

  const aging      = toArray<AgingRow>(data.agingBuckets)
  const agingItems = toArray<AgingItem>(data.agingDrillDown)
  const stpReady   = toArray<StpReadinessItem>(data.stpReadiness)
  const matchByType = toArray<MatchTypeRow>(data.matchByType)
  const matchDist  = toArray<MatchRange>(data.matchScoreDistribution)
  const exceptions = toArray<ExceptionRow>(data.exceptionRegister)
  const ocr        = toArray<OcrAccuracyRow>(data.ocrAccuracy)

  if (drill === 'dpo') {
    return (
      <DrillDown
        title="DPO composition"
        subtitle={`${data.dpo}d current · ${data.dpoTarget}d target`}
        onBack={() => setDrill(null)}>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <KpiCard label="AP balance" value={formatINR(data.meta.apBalance)} subtitle="Sum of unpaid approved invoices" />
          <KpiCard label="Period spend" value={formatINR(data.meta.periodSpend)} subtitle="Approved invoices in window" />
        </div>
        <InsightCard
          tone={data.dpo > data.dpoTarget ? 'red' : 'green'}
          title={`Working-capital impact: ${formatINR(data.dpoWcImpact)}`}
          description={data.dpo > data.dpoTarget
            ? `Cash locked beyond target — paying ${data.dpo - data.dpoTarget} days slower than peer benchmark. Renegotiate vendor terms or accelerate batches.`
            : 'DPO at or under target — discipline holding. Watch for MSME breach risk if you stretch further.'}
        />
      </DrillDown>
    )
  }

  if (drill === 'stp') {
    return (
      <DrillDown
        title="STP readiness — what's blocking touchless processing"
        subtitle={`Current ${data.touchlessRate}% touchless · annual saving at 85%: ${formatINR(data.annualSavingFromSTP)}`}
        onBack={() => setDrill(null)}>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          {stpReady.map(s => (
            <InsightCard
              key={s.guardrail}
              tone={s.count > 5 ? 'red' : s.count > 0 ? 'amber' : 'green'}
              title={`${s.guardrail} · ${s.count} invoice(s)`}
              description={`${s.fixDescription} · score impact +${s.scoreImpact}`}
            />
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Match score distribution</h4>
          <HBarChart
            labelWidth={70}
            rows={matchDist.map(r => ({
              label: r.range,
              value: r.count,
              display: `${r.count} inv`,
              tone:  r.range === '86-100' ? 'emerald' : r.range === '71-85' ? 'teal' : r.range === '51-70' ? 'amber' : 'red',
            }))}
          />
        </div>
      </DrillDown>
    )
  }

  if (drill === 'aging') {
    return (
      <DrillDown
        title="Overdue invoices by bucket"
        subtitle={`${data.overdueCount} invoices · ${formatINR(data.overdueAmount)}`}
        onBack={() => setDrill(null)}>
        <AgingBars buckets={aging} />
        <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Age</th>
                <th className="px-3 py-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {agingItems.slice(0, 12).map(i => (
                <tr key={i.invoiceRef} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{i.invoiceRef}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate">
                    {i.vendorName}
                    {i.isMsme && <span className="ml-1 rounded-full bg-amber-50 border border-amber-200 px-1 py-0.5 text-[9px] font-semibold text-amber-700">MSME</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(i.amount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{i.ageDays}d</td>
                  <td className="px-3 py-2 text-[10px] text-red-700">{i.penaltyRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DrillDown>
    )
  }

  if (drill === 'exceptions') {
    return (
      <DrillDown
        title="Exception register"
        subtitle={`${data.exceptionRate}% exception rate · ${data.duplicatesBlocked} duplicates blocked`}
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Count</th>
                <th className="px-3 py-2 text-right">Avg cycle impact (days)</th>
                <th className="px-3 py-2">Owner</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map(e => (
                <tr key={e.type} className="border-t border-border">
                  <td className="px-3 py-2">{e.type}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{e.count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">+{e.avgCycleImpact}d</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{e.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DrillDown>
    )
  }

  if (drill === 'ocr') {
    return (
      <DrillDown
        title="OCR field accuracy"
        subtitle="Per-field confidence — printed vs handwritten invoices"
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Field</th>
                <th className="px-3 py-2 text-right">Printed</th>
                <th className="px-3 py-2 text-right">Handwritten</th>
              </tr>
            </thead>
            <tbody>
              {ocr.map(f => (
                <tr key={f.field} className="border-t border-border">
                  <td className="px-3 py-2">{f.field}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.printedPct}%</td>
                  <td className={cn('px-3 py-2 text-right tabular-nums', f.handwrittenPct < 80 && 'text-red-700')}>{f.handwrittenPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <InsightCard
          tone="blue"
          title="What to do now"
          description="Handwritten invoices route to Gemini Pro automatically. Train the prompt by adding common confusions to the vendor master's ocrKeywords field (e.g., '0/O', '5/S')."
        />
      </DrillDown>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="DPO"
          value={`${data.dpo}d`}
          subtitle={`Target ${data.dpoTarget}d`}
          tone={data.dpo > data.dpoTarget + 5 ? 'red' : data.dpo > data.dpoTarget ? 'amber' : 'green'}
          deltaTone="inverse"
          deltaDir={data.dpo > data.dpoTarget ? 'up' : 'down'}
          delta={`${data.dpo > data.dpoTarget ? '+' : ''}${(data.dpo - data.dpoTarget).toFixed(1)}d vs target`}
          onClick={() => setDrill('dpo')}
        />
        <KpiCard
          label="Touchless STP rate"
          value={`${data.touchlessRate}%`}
          subtitle={`${data.invoiceCount} invoices · saving ₹${(847 - 42)}/auto invoice`}
          tone={data.touchlessRate > 75 ? 'green' : data.touchlessRate > 50 ? 'amber' : 'red'}
          onClick={() => setDrill('stp')}
        />
        <KpiCard
          label="Overdue"
          value={`${data.overdueCount}`}
          subtitle={formatINR(data.overdueAmount)}
          tone={data.overdueCount === 0 ? 'green' : 'red'}
          onClick={() => setDrill('aging')}
        />
        <KpiCard
          label="Exception rate"
          value={`${data.exceptionRate}%`}
          subtitle={`${data.duplicatesBlocked} duplicates blocked`}
          tone={data.exceptionRate > 20 ? 'red' : data.exceptionRate > 10 ? 'amber' : 'green'}
          onClick={() => setDrill('exceptions')}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Aging breakdown</h3>
            <button onClick={() => setDrill('aging')} className="text-[11px] text-teal-600 hover:underline">Detail →</button>
          </div>
          <AgingBars buckets={aging} onClick={() => setDrill('aging')} />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Match by type</h3>
          <div className="space-y-2">
            {matchByType.map(m => {
              const passRate = m.count > 0 ? Math.round((m.autoPass / m.count) * 100) : 0
              return (
                <div key={m.type} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{m.type}</span>
                    <span className="text-[11px] tabular-nums">{m.autoPass}/{m.count} auto · {passRate}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${passRate}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">STP readiness</h3>
            <button onClick={() => setDrill('stp')} className="text-[11px] text-teal-600 hover:underline">Fix →</button>
          </div>
          <div className="space-y-2">
            {stpReady.map(s => (
              <div key={s.guardrail} className="rounded-md border border-border bg-card p-2.5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.guardrail}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{s.fixDescription}</div>
                </div>
                <span className={cn(
                  'flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  s.count > 5 ? 'bg-red-100 text-red-700' : s.count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
                )}>
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Cost per invoice</h3>
            <button onClick={() => setDrill('ocr')} className="text-[11px] text-teal-600 hover:underline">OCR detail →</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border bg-card p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Current blended</p>
              <p className="text-xl font-semibold tabular-nums">{formatINR(data.costPerInvoice)}</p>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Auto (STP)</p>
              <p className="text-xl font-semibold tabular-nums text-emerald-700">{formatINR(data.costPerInvoiceAuto)}</p>
            </div>
          </div>
          <InsightCard
            tone="blue"
            title={`Reach 85% STP → save ${formatINRCompact(data.annualSavingFromSTP)}/year`}
            description={`Blended cost drops from ₹${data.costPerInvoice} → ₹${data.costPerInvoiceAuto} per invoice at the touchless threshold.`}
          />
        </div>
      </div>
    </div>
  )
}
