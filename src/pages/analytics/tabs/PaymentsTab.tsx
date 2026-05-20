import { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { usePaymentsAnalytics, type AnalyticsFilters, type CashOutflowWeek, type MsmeVendorRow, type EarlyPayVendorRow, type TdsBySectionRow, type PaymentMethodRow, type PaymentQueueRow } from '../../../lib/api/analytics.api'
import { formatINR, formatINRCompact } from '../../../lib/utils/formatters'
import { toArray, cn } from '../../../lib/utils'
import { KpiCard } from '../components/KpiCard'
import { DrillDown, InsightCard } from '../components/DrillDown'

type Drill = null | 'onTime' | 'cash' | 'msme' | 'earlyPay' | 'tds' | 'queue'

export default function PaymentsTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = usePaymentsAnalytics(filters)
  const [drill, setDrill] = useState<Drill>(null)

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
    )
  }

  const weekly  = toArray<CashOutflowWeek>(data.cashOutflowByWeek)
  const msme    = toArray<MsmeVendorRow>(data.msmeCompliance?.vendors)
  const earlyV  = toArray<EarlyPayVendorRow>(data.earlyPayVendors)
  const tds     = toArray<TdsBySectionRow>(data.tdsBySection)
  const methods = toArray<PaymentMethodRow>(data.paymentMethodMix)
  const queue   = toArray<PaymentQueueRow>(data.paymentQueue)

  if (drill === 'cash') {
    return (
      <DrillDown
        title="Cash outflow forecast"
        subtitle={`${formatINR(data.cashOutflow30d)} total over next 30 days`}
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="#999" />
                <YAxis tick={{ fontSize: 10 }} stroke="#999" tickFormatter={v => formatINRCompact(v)} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => formatINR(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="amount"        name="Total"   fill="#0d9488" />
                <Bar dataKey="msmeAmount"    name="MSME"    fill="#f59e0b" />
                <Bar dataKey="overdueAmount" name="Overdue" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="w-full mt-4 text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Week</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">MSME</th>
                <th className="px-3 py-2 text-right">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map(w => (
                <tr key={w.week} className="border-t border-border">
                  <td className="px-3 py-2">{w.week}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(w.amount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-700">{formatINR(w.msmeAmount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-700">{formatINR(w.overdueAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DrillDown>
    )
  }

  if (drill === 'msme') {
    return (
      <DrillDown
        title="MSME compliance register"
        subtitle={`${data.msmeCompliance.total} active · ${data.msmeCompliance.atRisk} at risk · ${data.msmeCompliance.breached} breached`}
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Cat.</th>
                <th className="px-3 py-2">Udyam</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Deadline</th>
                <th className="px-3 py-2 text-right">Days</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Penalty</th>
              </tr>
            </thead>
            <tbody>
              {msme.map((v, i) => (
                <tr key={`${v.vendorName}-${i}`} className="border-t border-border">
                  <td className="px-3 py-2">{v.vendorName}</td>
                  <td className="px-3 py-2 text-xs">{v.category}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{v.udyamReg}</td>
                  <td className="px-3 py-2 text-xs">{v.invoiceDate}</td>
                  <td className="px-3 py-2 text-xs">{v.deadlineDate}</td>
                  <td className={cn('px-3 py-2 text-right tabular-nums font-medium',
                    v.daysRemaining < 0 && 'text-red-700',
                    v.daysRemaining >= 0 && v.daysRemaining < 7 && 'text-amber-700',
                  )}>
                    {v.daysRemaining < 0 ? `${v.daysRemaining}` : `${v.daysRemaining}d`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(v.amount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-700">{v.penaltyIfBreached > 0 ? formatINR(v.penaltyIfBreached) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <InsightCard
          tone="red"
          title="MSMED Act §16 — 3× bank rate interest if breached"
          description="Statutory deadline = invoice date + min(45, vendor.paymentTerms). Pay the at-risk batch this week to clear the register before month-end."
        />
      </DrillDown>
    )
  }

  if (drill === 'earlyPay') {
    return (
      <DrillDown
        title="Early-pay discount opportunity"
        subtitle={`${formatINR(data.earlyPayOpportunity)} available · ${data.earlyPayDiscountCapture}% captured`}
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Terms</th>
                <th className="px-3 py-2 text-right">Invoice</th>
                <th className="px-3 py-2 text-right">Discount</th>
                <th className="px-3 py-2">Pay by</th>
                <th className="px-3 py-2 text-right">Days left</th>
              </tr>
            </thead>
            <tbody>
              {earlyV.map((v, i) => (
                <tr key={`${v.vendorName}-${i}`} className="border-t border-border">
                  <td className="px-3 py-2">{v.vendorName}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{v.terms}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(v.invoiceAmount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{formatINR(v.discount)}</td>
                  <td className="px-3 py-2 text-xs">{v.payBy}</td>
                  <td className={cn('px-3 py-2 text-right tabular-nums', v.daysLeft <= 2 && 'text-red-700')}>{v.daysLeft}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DrillDown>
    )
  }

  if (drill === 'tds') {
    return (
      <DrillDown
        title="TDS payable register"
        subtitle={`${formatINR(data.tdsUndeposited)} undeposited across ${tds.length} section(s)`}
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tds.map((t, i) => (
                <tr key={`${t.section}-${t.period}-${i}`} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{t.section}</td>
                  <td className="px-3 py-2 text-xs">{t.period}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(t.amount)}</td>
                  <td className="px-3 py-2 text-xs">{t.dueDate}</td>
                  <td className="px-3 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium',
                      t.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                      t.status === 'DEPOSITED' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700')}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DrillDown>
    )
  }

  if (drill === 'queue') {
    return (
      <DrillDown
        title="Optimised payment queue"
        subtitle="Recommended order — MSME first, then by due date"
        onBack={() => setDrill(null)}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2 font-mono">Ref</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Pay by</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((q, i) => (
                <tr key={`${q.invoiceRef}-${i}`} className="border-t border-border">
                  <td className="px-3 py-2 text-xs font-medium">{q.priority}</td>
                  <td className="px-3 py-2">
                    {q.vendorName}
                    {q.isMsme && <span className="ml-1 rounded-full bg-amber-50 border border-amber-200 px-1 py-0.5 text-[9px] font-semibold text-amber-700">MSME</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{q.invoiceRef}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(q.amount)}</td>
                  <td className="px-3 py-2 text-xs">{q.dueDate}</td>
                  <td className="px-3 py-2 text-xs">{q.recommendedPayDate}</td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground">{q.priorityReason}</td>
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
          label="On-time rate"
          value={`${data.onTimeRate}%`}
          subtitle={`Target ${data.onTimeTarget}%`}
          tone={data.onTimeRate >= data.onTimeTarget ? 'green' : data.onTimeRate >= 70 ? 'amber' : 'red'}
        />
        <KpiCard
          label="Cash outflow 30d"
          value={formatINRCompact(data.cashOutflow30d)}
          subtitle={`${queue.length} invoices queued`}
          tone="teal"
          onClick={() => setDrill('cash')}
        />
        <KpiCard
          label="MSME register"
          value={`${data.msmeCompliance.total}`}
          subtitle={`${data.msmeCompliance.atRisk} at risk · ${data.msmeCompliance.breached} breached`}
          tone={data.msmeCompliance.breached > 0 ? 'red' : data.msmeCompliance.atRisk > 0 ? 'amber' : 'green'}
          onClick={() => setDrill('msme')}
        />
        <KpiCard
          label="Early-pay opportunity"
          value={formatINRCompact(data.earlyPayOpportunity)}
          subtitle={`${data.earlyPayDiscountCapture}% captured`}
          tone={data.earlyPayOpportunity > 0 ? 'amber' : 'green'}
          onClick={() => setDrill('earlyPay')}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">4-week cash outflow</h3>
            <button onClick={() => setDrill('cash')} className="text-[11px] text-teal-600 hover:underline">Detail →</button>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="#999" />
                <YAxis tick={{ fontSize: 10 }} stroke="#999" tickFormatter={v => formatINRCompact(v)} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="amount" fill="#0d9488" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Payment method mix</h3>
            <span className="text-[11px] text-muted-foreground">Executed batches</span>
          </div>
          <div className="space-y-2">
            {methods.length === 0 ? (
              <p className="text-xs text-muted-foreground">No executed payments yet.</p>
            ) : methods.map(m => {
              const total = methods.reduce((s, x) => s + x.amount, 0)
              const pct = total > 0 ? Math.round((m.amount / total) * 100) : 0
              return (
                <div key={m.method} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{m.method}</span>
                    <span className="text-[11px] tabular-nums">{m.count} · {formatINRCompact(m.amount)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">TDS payable</h3>
            <button onClick={() => setDrill('tds')} className="text-[11px] text-teal-600 hover:underline">Sections →</button>
          </div>
          <div className="text-3xl font-semibold tabular-nums">{formatINRCompact(data.tdsUndeposited)}</div>
          <p className="text-[10px] text-muted-foreground mt-1">{tds.length} active section(s) · due 7th of next month</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">ERP sync</h3>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Synced</span>
              <span className="font-medium tabular-nums text-emerald-700">{data.erpSyncStatus.synced}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-medium tabular-nums text-amber-700">{data.erpSyncStatus.pending}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Failed</span>
              <span className="font-medium tabular-nums text-red-700">{data.erpSyncStatus.failed}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Payment queue</h3>
            <button onClick={() => setDrill('queue')} className="text-[11px] text-teal-600 hover:underline">Order →</button>
          </div>
          <div className="text-3xl font-semibold tabular-nums">{queue.length}</div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Top: {queue[0]?.vendorName ?? '—'} · {formatINRCompact(queue[0]?.amount ?? 0)}
          </p>
        </div>
      </div>

      {data.latePaymentPenalties > 0 && (
        <InsightCard
          tone="red"
          title={`Late-payment penalties this period: ${formatINR(data.latePaymentPenalties)}`}
          description="MSME breach interest accrued under §16. Pay the affected invoices and refile the register to clear the penalty trail."
        />
      )}
    </div>
  )
}
