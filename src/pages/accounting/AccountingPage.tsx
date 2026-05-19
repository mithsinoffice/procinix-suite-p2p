import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle, Clock, RefreshCw, Send, ChevronRight, PauseCircle, PlayCircle } from 'lucide-react'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { accountingApi, type JournalEntry, type ProvisionScheduleRow, type AmortizationScheduleRow, type MonthEndResult } from '../../lib/api/accounting.api'
import { formatINR, formatINRCompact, formatDate } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

type Tab = 'overview' | 'journal' | 'provision' | 'amort' | 'monthend' | 'erp'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview'             },
  { id: 'journal',   label: 'Journal entries'      },
  { id: 'provision', label: 'Provision schedules'  },
  { id: 'amort',     label: 'Amortization schedules' },
  { id: 'monthend',  label: 'Month-end close'      },
  { id: 'erp',       label: 'ERP sync log'         },
]

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const qc = useQueryClient()

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Accounting"
        description="Provisions, amortization, journal entries, ERP push and month-end close"
        backLabel="Dashboard"
        backTo="/dashboard"
        onRefresh={() => qc.invalidateQueries({ queryKey: ['accounting'] })}
      />

      <div className="flex items-center gap-1 px-4 border-b border-border bg-background overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {tab === 'overview'  && <OverviewTab onJumpTab={setTab} />}
        {tab === 'journal'   && <JournalTab  />}
        {tab === 'provision' && <ProvisionTab />}
        {tab === 'amort'     && <AmortTab     />}
        {tab === 'monthend'  && <MonthEndTab />}
        {tab === 'erp'       && <ErpTab      />}
      </div>
    </div>
  )
}

// ── Overview ────────────────────────────────────────────────────────────
function OverviewTab({ onJumpTab }: { onJumpTab: (t: Tab) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['accounting', 'dashboard'],
    queryFn:  () => accountingApi.getDashboard(),
    refetchInterval: 60_000,
  })

  if (isLoading || !data) return <KpiSkeleton />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="JVs posted (month)" value={data.jvsPostedThisMonth} hint={`Period ${data.period}`} />
        <Kpi label="Pending ERP push"   value={data.jvsPending}         hint="Awaiting sync" />
        <Kpi label="ERP failures"       value={data.erpFailures}        tone={data.erpFailures > 0 ? 'red' : 'default'} />
        <Kpi label="Active schedules"   value={data.activeSchedules}    hint={`${data.activeProvisionSchedules} prov · ${data.activeAmortizationSchedules} amort`} />
      </div>

      {data.erpFailures > 0 && (
        <Banner tone="red" icon={<AlertTriangle className="h-4 w-4" />}>
          <span><strong>{data.erpFailures} ERP push{data.erpFailures > 1 ? 'es' : ''} failed</strong> — retry required before period close.</span>
          <button onClick={() => onJumpTab('erp')} className="ml-auto rounded-md bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50">Go to ERP sync log →</button>
        </Banner>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <SummaryCard
          title="Provisions this month"
          count={data.provisionsThisMonth.count}
          amount={data.provisionsThisMonth.amount}
          action={() => onJumpTab('provision')}
        />
        <SummaryCard
          title="Amortizations this month"
          count={data.amortizationsThisMonth.count}
          amount={data.amortizationsThisMonth.amount}
          action={() => onJumpTab('amort')}
        />
      </div>
    </div>
  )
}

// ── Journal entries ─────────────────────────────────────────────────────
function JournalTab() {
  const qc = useQueryClient()
  const [period, setPeriod] = useState('')
  const [entryType, setEntryType] = useState('')
  const [erpStatus, setErpStatus] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['accounting', 'jvs', period, entryType, erpStatus],
    queryFn:  () => accountingApi.listJvs({ period, entryType, erpStatus, take: 100 }),
  })
  const rows = data?.data ?? []

  const pushBulk = useMutation({
    mutationFn: () => accountingApi.pushBulk(selected),
    onSuccess:  () => { setSelected([]); qc.invalidateQueries({ queryKey: ['accounting'] }) },
  })

  const pushOne = useMutation({
    mutationFn: (id: string) => accountingApi.pushJv(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['accounting'] }),
  })

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <FilterInput label="Period" placeholder="YYYY-MM" value={period} onChange={setPeriod} width="w-28" />
        <FilterSelect label="Type" value={entryType} onChange={setEntryType} options={[
          { v: '',                      l: 'All types'    },
          { v: 'PROVISION',             l: 'Provision'    },
          { v: 'PROVISION_REVERSAL',    l: 'Reversal'     },
          { v: 'PROVISION_NULLIFIED',   l: 'Nullified'    },
          { v: 'ACCRUAL',               l: 'Accrual'      },
          { v: 'AMORTIZATION',          l: 'Amortization' },
        ]} />
        <FilterSelect label="ERP status" value={erpStatus} onChange={setErpStatus} options={[
          { v: '',        l: 'All ERP statuses' },
          { v: 'PENDING', l: 'Pending'          },
          { v: 'SYNCED',  l: 'Synced'           },
          { v: 'FAILED',  l: 'Failed'           },
        ]} />
        <div className="flex-1" />
        {selected.length > 0 && (
          <button
            onClick={() => pushBulk.mutate()}
            disabled={pushBulk.isPending}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            <Send className="h-3.5 w-3.5" />
            Push {selected.length} to ERP
          </button>
        )}
      </div>

      {isLoading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState message="No journal entries yet" /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="w-8 px-3 py-2.5"></th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Narration</th>
                <th className="px-3 py-2.5">DR</th>
                <th className="px-3 py-2.5">CR</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">ERP</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(j => (
                <tr key={j.id} className={cn('border-t border-border hover:bg-muted/20',
                  j.erpStatus === 'FAILED'  && 'bg-red-50/40',
                  j.erpStatus === 'PENDING' && 'bg-amber-50/30',
                )}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selected.includes(j.id)} onChange={() => toggle(j.id)} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs">{formatDate(j.postingDate)}</td>
                  <td className="px-3 py-2.5"><EntryTypeChip type={j.entryType} status={j.status} /></td>
                  <td className="px-3 py-2.5 max-w-[280px] truncate" title={j.narration}>{j.narration}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{j.debitGlCode}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{j.creditGlCode}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatINR(j.amount)}</td>
                  <td className="px-3 py-2.5"><ErpChip status={j.erpStatus} /></td>
                  <td className="px-3 py-2.5">
                    {j.erpStatus === 'PENDING' && (
                      <button onClick={() => pushOne.mutate(j.id)} disabled={pushOne.isPending}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {j.erpStatus === 'FAILED' && (
                      <button onClick={() => pushOne.mutate(j.id)} disabled={pushOne.isPending}
                        className="rounded p-1 text-red-700 hover:bg-red-100">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Provision schedules ─────────────────────────────────────────────────
function ProvisionTab() {
  const qc = useQueryClient()
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['accounting', 'provision-schedules'],
    queryFn:  () => accountingApi.listProvisionSchedules(),
  })

  const patch = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'PAUSED' | 'CLOSED' }) =>
      accountingApi.patchProvisionSchedule(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting'] }),
  })

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Provision runs last day of the month → auto-reverses 1st of next month. Invoice mid-month nullifies any open provision.
      </div>

      {isLoading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState message="No provision schedules yet" /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2.5">Item</th>
                <th className="px-3 py-2.5">Frequency</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">Last run</th>
                <th className="px-3 py-2.5">Next due</th>
                <th className="px-3 py-2.5">GL pair</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: ProvisionScheduleRow) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-sm">{r.item?.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.item?.itemCode ?? '—'}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-violet-50 border border-violet-200 text-violet-700">
                      {r.frequency}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatINR(r.amount)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.lastRunDate ? formatDate(r.lastRunDate) : '—'}</td>
                  <td className="px-3 py-2.5 text-xs">{r.nextRunDate ? formatDate(r.nextRunDate) : '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.expenseGlCode} / {r.provisionGlCode}</td>
                  <td className="px-3 py-2.5"><StatusChip status={r.status} /></td>
                  <td className="px-3 py-2.5">
                    {r.status === 'ACTIVE' && (
                      <button title="Pause" onClick={() => patch.mutate({ id: r.id, status: 'PAUSED' })}
                        className="rounded p-1 text-amber-700 hover:bg-amber-50">
                        <PauseCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {r.status === 'PAUSED' && (
                      <button title="Resume" onClick={() => patch.mutate({ id: r.id, status: 'ACTIVE' })}
                        className="rounded p-1 text-green-700 hover:bg-green-50">
                        <PlayCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Amortization schedules ──────────────────────────────────────────────
function AmortTab() {
  const navigate = useNavigate()
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['accounting', 'amort-schedules'],
    queryFn:  () => accountingApi.listAmortizationSchedules(),
  })

  return (
    <div className="space-y-3">
      {isLoading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState message="No amortization schedules yet" /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2.5">Invoice</th>
                <th className="px-3 py-2.5">Vendor</th>
                <th className="px-3 py-2.5">Item</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5">Period</th>
                <th className="px-3 py-2.5">Progress</th>
                <th className="px-3 py-2.5 text-right">Monthly</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: AmortizationScheduleRow) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20 cursor-pointer"
                  onClick={() => navigate(`/accounting/amortization/${r.id}`)}>
                  <td className="px-3 py-2.5">
                    <div className="font-mono text-xs font-semibold text-primary">{r.invoice?.invoiceNumber ?? '—'}</div>
                  </td>
                  <td className="px-3 py-2.5 text-sm max-w-[200px] truncate">{r.invoice?.vendor?.legalName ?? '—'}</td>
                  <td className="px-3 py-2.5 text-sm">{r.item ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatINR(r.totalAmount)}</td>
                  <td className="px-3 py-2.5 text-xs">{formatDate(r.periodFrom)} → {formatDate(r.periodTo)}</td>
                  <td className="px-3 py-2.5 min-w-[140px]">
                    <ProgressBar pct={r.progressPct} />
                    <div className="text-[10px] text-muted-foreground mt-1">{r.postedMonths} of {r.totalMonths} months</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatINR(r.monthlyAmount)}</td>
                  <td className="px-3 py-2.5"><StatusChip status={r.status} /></td>
                  <td className="px-3 py-2.5">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Month-end close ─────────────────────────────────────────────────────
function MonthEndTab() {
  const qc = useQueryClient()
  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  const [period, setPeriod] = useState(defaultPeriod)
  const [preview, setPreview] = useState<MonthEndResult | null>(null)
  const [committed, setCommitted] = useState<MonthEndResult | null>(null)

  const previewMut = useMutation({
    mutationFn: () => accountingApi.previewMonthEnd(period),
    onSuccess:  (data) => { setPreview(data); setCommitted(null) },
  })
  const runMut = useMutation({
    mutationFn: () => accountingApi.runMonthEnd(period),
    onSuccess:  (data) => { setCommitted(data); setPreview(null); qc.invalidateQueries({ queryKey: ['accounting'] }) },
  })

  const totals = useMemo(() => {
    const src = preview ?? committed
    if (!src) return null
    const provAmount = src.jvs.filter(j => j.entryType === 'PROVISION').reduce((s, j) => s + j.amount, 0)
    const amortAmount = src.jvs.filter(j => j.entryType === 'AMORTIZATION').reduce((s, j) => s + j.amount, 0)
    return { provAmount, amortAmount }
  }, [preview, committed])

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Run month-end</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Period</label>
          <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="YYYY-MM"
            className="rounded-md border border-input px-3 py-1.5 text-sm w-28 font-mono" />
          <div className="flex-1" />
          <button onClick={() => previewMut.mutate()} disabled={previewMut.isPending}
            className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
            Preview
          </button>
          <button onClick={() => runMut.mutate()} disabled={runMut.isPending || !preview}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            Run month-end
          </button>
        </div>

        {totals && (
          <div className="rounded-md bg-muted/40 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span>Provisions to post</span><span className="tabular-nums">{formatINR(totals.provAmount)}</span></div>
            <div className="flex justify-between"><span>Amortizations to post</span><span className="tabular-nums">{formatINR(totals.amortAmount)}</span></div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Reversals to execute</span><span>{(preview ?? committed)?.reversalsExecuted ?? 0}</span></div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Reversals skipped (nullified)</span><span>{(preview ?? committed)?.reversalsSkipped ?? 0}</span></div>
          </div>
        )}

        {committed && (
          <Banner tone="green" icon={<CheckCircle2 className="h-4 w-4" />}>
            <span>Month-end committed for {committed.period} — {committed.jvs.length} JVs posted.</span>
          </Banner>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">What will be posted</h3>
        {!(preview ?? committed) ? (
          <p className="text-xs text-muted-foreground">Run preview to see the breakdown.</p>
        ) : (
          <div className="space-y-1 max-h-[480px] overflow-auto">
            {(preview ?? committed)!.jvs.map((j, i) => (
              <div key={`${j.id}-${i}`} className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5 text-xs">
                <EntryTypeChip type={j.entryType} status="POSTED" />
                <span className="font-mono text-[10px]">{j.debit} → {j.credit}</span>
                <span className="flex-1 truncate text-muted-foreground" title={j.narration}>{j.narration}</span>
                <span className="tabular-nums">{formatINR(j.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ERP sync log ───────────────────────────────────────────────────────
function ErpTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['accounting', 'erp-jvs'],
    queryFn:  () => accountingApi.listJvs({ erpStatus: 'FAILED', take: 100 }),
  })
  const failed = data?.data ?? []

  const retryAll = useMutation({
    mutationFn: () => accountingApi.retryAll(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['accounting'] }),
  })
  const retryOne = useMutation({
    mutationFn: (id: string) => accountingApi.retryJv(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['accounting'] }),
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">All JVs that failed ERP push. Retries cap at 3 attempts per JV.</p>
        {failed.length > 0 && (
          <button onClick={() => retryAll.mutate()} disabled={retryAll.isPending}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            <RefreshCw className="h-3.5 w-3.5" /> Retry all failed
          </button>
        )}
      </div>

      {isLoading ? <TableSkeleton /> : failed.length === 0 ? (
        <EmptyState message="No failed ERP pushes" sub="Everything in sync." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2.5">JV ref</th>
                <th className="px-3 py-2.5">Pushed at</th>
                <th className="px-3 py-2.5">ERP ref</th>
                <th className="px-3 py-2.5">Retries</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {failed.map((j: JournalEntry) => (
                <tr key={j.id} className="border-t border-border bg-red-50/40">
                  <td className="px-3 py-2.5 font-mono text-xs">{j.id.slice(0, 8)}</td>
                  <td className="px-3 py-2.5 text-xs">{j.erpPushedAt ? formatDate(j.erpPushedAt) : '—'}</td>
                  <td className="px-3 py-2.5 text-xs">{j.erpRef ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs">{j.retryCount} / 3</td>
                  <td className="px-3 py-2.5"><ErpChip status={j.erpStatus} /></td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => retryOne.mutate(j.id)} disabled={retryOne.isPending || j.retryCount >= 3}
                      className="rounded p-1 text-red-700 hover:bg-red-100 disabled:opacity-40">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── shared small components ─────────────────────────────────────────────
function Kpi({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: 'red' | 'default' }) {
  return (
    <div className={cn('rounded-xl border bg-card p-4', tone === 'red' ? 'border-red-300 bg-red-50/40' : 'border-border')}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-2xl font-semibold mt-1 tabular-nums', tone === 'red' && 'text-red-700')}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  )
}

function SummaryCard({ title, count, amount, action }: { title: string; count: number; amount: number; action: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="text-lg font-semibold mt-1">{count} JV{count !== 1 ? 's' : ''} · {formatINRCompact(amount)}</div>
      </div>
      <button onClick={action} className="text-xs text-primary font-medium hover:underline">View →</button>
    </div>
  )
}

function Banner({ tone, icon, children }: { tone: 'red' | 'amber' | 'green'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === 'red'
    ? 'bg-red-50 border-red-200 text-red-800'
    : tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-green-50 border-green-200 text-green-800'
  return (
    <div className={cn('flex items-center gap-2 rounded-md border px-3 py-2 text-sm', cls)}>
      {icon}{children}
    </div>
  )
}

function FilterInput({ label, placeholder, value, onChange, width }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void; width?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={cn('rounded-md border border-input px-2 py-1 text-xs font-mono', width)} />
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="rounded-md border border-input px-2 py-1 text-xs">
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )
}

function EntryTypeChip({ type, status }: { type: string; status: string }) {
  const palette: Record<string, string> = {
    PROVISION:            'bg-violet-50 border-violet-200 text-violet-700',
    PROVISION_REVERSAL:   'bg-slate-50 border-slate-200 text-slate-700',
    PROVISION_NULLIFIED:  'bg-orange-50 border-orange-200 text-orange-700',
    ACCRUAL:              'bg-sky-50 border-sky-200 text-sky-700',
    AMORTIZATION:         'bg-emerald-50 border-emerald-200 text-emerald-700',
    MANUAL:               'bg-muted border-border text-muted-foreground',
  }
  const label = type.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, m => m.toUpperCase())
  const cls = palette[type] ?? palette.MANUAL
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', cls)}>{label}</span>
      {status !== 'POSTED' && (
        <span className="text-[10px] text-muted-foreground">{status.replace(/_/g, ' ').toLowerCase()}</span>
      )}
    </span>
  )
}

function ErpChip({ status }: { status: string }) {
  const palette: Record<string, string> = {
    PENDING: 'bg-amber-50 border-amber-200 text-amber-700',
    SYNCED:  'bg-green-50 border-green-200 text-green-700',
    FAILED:  'bg-red-50 border-red-200 text-red-700',
    SKIPPED: 'bg-muted border-border text-muted-foreground',
    MANUAL_OVERRIDE: 'bg-slate-50 border-slate-200 text-slate-700',
  }
  const cls = palette[status] ?? palette.PENDING
  const label = status === 'MANUAL_OVERRIDE' ? 'Manual' : status.toLowerCase()
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', cls)}>
      {status === 'PENDING' && <Clock className="h-3 w-3" />}
      {status === 'SYNCED'  && <CheckCircle2 className="h-3 w-3" />}
      {status === 'FAILED'  && <AlertTriangle className="h-3 w-3" />}
      {label}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  const palette: Record<string, string> = {
    ACTIVE:    'bg-green-50 border-green-200 text-green-700',
    PAUSED:    'bg-amber-50 border-amber-200 text-amber-700',
    CLOSED:    'bg-muted border-border text-muted-foreground',
    COMPLETED: 'bg-blue-50 border-blue-200 text-blue-700',
    CANCELLED: 'bg-muted border-border text-muted-foreground',
  }
  const cls = palette[status] ?? palette.ACTIVE
  return <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', cls)}>{status.toLowerCase()}</span>
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="h-1.5 w-full rounded-full bg-muted">
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${clamped}%` }} />
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
    </div>
  )
}

function TableSkeleton() {
  return <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
}

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}
