import { lazy, Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MasterPageHeader } from '../../../components/masters/MasterFormLayout'
import { cn } from '../../../lib/utils'

type Tab = 'overview' | 'register' | 'mom' | 'manual'
const TAB_LABEL: Record<Tab, string> = {
  overview: 'Overview',
  register: 'Provision register',
  mom:      'Month-on-month',
  manual:   'Manual additions',
}
const TAB_ORDER: Tab[] = ['overview', 'register', 'mom', 'manual']

// Lazy each tab so the route lands fast and unused tabs never download.
const ProvisionOverviewTab = lazy(() => import('./ProvisionOverviewTab'))
const ProvisionRegisterTab = lazy(() => import('./ProvisionRegisterTab'))
const ProvisionMoMTab      = lazy(() => import('./ProvisionMoMTab'))
const ManualAdditionsTab   = lazy(() => import('./ManualAdditionsTab'))

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

export default function ProvisionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryTab = (searchParams.get('tab') as Tab) ?? 'overview'
  const [tab, setTab] = useState<Tab>(TAB_ORDER.includes(queryTab) ? queryTab : 'overview')
  const [period, setPeriod] = useState<string>(searchParams.get('period') ?? currentPeriod())

  // Keep the URL in sync so deep-links land on the right tab and period.
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'overview') next.delete('tab'); else next.set('tab', tab)
    if (period === currentPeriod()) next.delete('period'); else next.set('period', period)
    setSearchParams(next, { replace: true })
  // searchParams is intentionally excluded to avoid update-loops; tab+period
  // are the only signals we want to react to.
  }, [tab, period])

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Provisions"
        description="Month-end provisioning · register · pattern analysis"
        backLabel="Accounting"
        backTo="/accounting"
        actions={
          <PeriodSelector value={period} onChange={setPeriod} />
        }
      />

      {/* Tab strip */}
      <div className="border-b border-border bg-background px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TAB_ORDER.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                tab === t
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-muted/20">
        <Suspense fallback={<TabSkeleton />}>
          {tab === 'overview' && <ProvisionOverviewTab period={period} />}
          {tab === 'register' && <ProvisionRegisterTab period={period} />}
          {tab === 'mom'      && <ProvisionMoMTab />}
          {tab === 'manual'   && <ManualAdditionsTab period={period} />}
        </Suspense>
      </div>
    </div>
  )
}

function PeriodSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Generate the last 12 months as period options — finance teams almost
  // always work near the current month so a quick switcher is enough.
  const options: string[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    options.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
    >
      {options.map(p => (
        <option key={p} value={p}>{formatPeriod(p)}</option>
      ))}
    </select>
  )
}

function formatPeriod(p: string): string {
  const [y, m] = p.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, 1))
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function TabSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
      </div>
      <div className="h-64 rounded-xl bg-muted animate-pulse" />
    </div>
  )
}
