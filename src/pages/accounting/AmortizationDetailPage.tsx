import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, AlertTriangle, Circle } from 'lucide-react'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { accountingApi, type AmortizationTimelineRow } from '../../lib/api/accounting.api'
import { formatINR, formatDate } from '../../lib/utils/formatters'
import { cn, toArray } from '../../lib/utils'

export default function AmortizationDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['accounting', 'amort-timeline', id],
    queryFn:  () => accountingApi.getAmortizationTimeline(id),
    enabled:  !!id,
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col h-full">
        <MasterPageHeader
          title="Amortization schedule"
          description="Loading…"
          backLabel="Accounting"
          backTo="/accounting"
        />
        <div className="p-4 space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded bg-muted animate-pulse" />)}</div>
      </div>
    )
  }

  const { schedule } = data
  // toArray() guards against a malformed `timeline` field on the response
  // (null / missing key) — see [[utils.toArray]] in src/lib/utils.ts.
  const timeline = toArray<AmortizationTimelineRow>(data.timeline)
  const postedCount = timeline.filter(t => t.jv?.status === 'POSTED').length
  const dueThisMonth = timeline.filter(t => {
    if (t.jv) return false
    const now = new Date()
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return t.month <= period
  }).length
  const future = timeline.length - postedCount - dueThisMonth

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={`Amortization · ${schedule.invoice?.invoiceNumber ?? '—'}`}
        description={`${schedule.invoice?.vendor?.legalName ?? '—'} · ${formatDate(schedule.periodFrom)} → ${formatDate(schedule.periodTo)}`}
        backLabel="Accounting"
        backTo="/accounting"
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Header card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <button onClick={() => schedule.invoice && navigate(`/invoices/${schedule.invoice.id}`)}
                className="text-sm font-mono font-semibold text-primary hover:underline">
                {schedule.invoice?.invoiceNumber ?? '—'}
              </button>
              <p className="text-xs text-muted-foreground mt-0.5">{schedule.invoice?.vendor?.legalName ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Item: {schedule.item ?? '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-semibold tabular-nums">{formatINR(schedule.totalAmount)}</p>
              <p className="text-xs text-muted-foreground">{formatINR(schedule.monthlyAmount)} / month avg</p>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span>{postedCount} of {schedule.totalMonths} months posted</span>
              <span className="font-medium">{schedule.progressPct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, schedule.progressPct)}%` }} />
            </div>
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3">
          <SumStat label="Posted"        value={postedCount}     tone="green" />
          <SumStat label="Due this month" value={dueThisMonth}    tone="amber" />
          <SumStat label="Future"        value={future}          tone="default" />
        </div>

        {/* Timeline */}
        <div className="rounded-xl border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Month-by-month</h3>
          </div>
          <div className="divide-y divide-border">
            {timeline.map((t, i) => {
              const posted = t.jv?.status === 'POSTED'
              const now = new Date()
              const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
              const isCurrent = !posted && t.month === currentPeriod
              const isFuture  = !posted && !isCurrent
              return (
                <div key={t.month + i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-shrink-0">
                    {posted    && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    {isCurrent && <Clock className="h-5 w-5 text-amber-500 animate-pulse" />}
                    {isFuture  && <Circle className="h-5 w-5 text-muted-foreground/40" />}
                  </div>
                  <div className="flex-shrink-0 w-24">
                    <p className="text-sm font-medium">{t.month}</p>
                    <p className="text-[10px] text-muted-foreground">{t.daysInPeriod}d</p>
                  </div>
                  <div className="flex-1 text-xs text-muted-foreground">
                    DR {schedule.expenseGlCode} → CR {schedule.prepaidGlCode}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm tabular-nums">{formatINR(t.jv?.amount ?? t.plannedAmount)}</p>
                    {t.jv ? (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {t.jv.erpRef ?? '—'}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Not yet posted</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 w-20 text-right">
                    {t.jv ? (
                      <ErpChip status={t.jv.erpStatus} />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function SumStat({ label, value, tone }: { label: string; value: number; tone: 'green' | 'amber' | 'default' }) {
  const cls = tone === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-border bg-card'
  return (
    <div className={cn('rounded-lg border px-4 py-3', cls)}>
      <p className="text-xs">{label}</p>
      <p className="text-xl font-semibold tabular-nums mt-1">{value}</p>
    </div>
  )
}

function ErpChip({ status }: { status: string }) {
  const palette: Record<string, string> = {
    PENDING: 'bg-amber-50 border-amber-200 text-amber-700',
    SYNCED:  'bg-green-50 border-green-200 text-green-700',
    FAILED:  'bg-red-50 border-red-200 text-red-700',
    SKIPPED: 'bg-muted border-border text-muted-foreground',
  }
  const cls = palette[status] ?? palette.PENDING
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', cls)}>
      {status === 'SYNCED' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'FAILED' && <AlertTriangle className="h-3 w-3" />}
      {status.toLowerCase()}
    </span>
  )
}
