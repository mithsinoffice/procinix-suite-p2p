import { lazy, Suspense, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, FileText, CreditCard, Briefcase, TrendingUp, RefreshCw } from 'lucide-react'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { http } from '../../lib/http'
import { cn, toArray } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth.store'
import type { AnalyticsFilters } from '../../lib/api/analytics.api'

// Time-aware greeting — same brackets the Dashboard uses, extended with a
// late-night band (9pm–5am) per spec.
function timeGreeting(hour: number): string {
  if (hour >= 5  && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

// Subtitle copy reflects the user's primary role so the page lands with the
// right framing. Unknown roles fall back to the generic insight line.
function subtitleForRole(role?: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'TENANT_ADMIN':
    case 'MD':
      return 'Executive overview — drill down from KPI to action'
    case 'CFO':
      return 'CFO view — working capital, accruals, budget reforecast'
    case 'FINANCE_MANAGER':
      return 'AP & payments overview — DPO, MSME, exception register'
    case 'PROCUREMENT_HEAD':
      return 'Procurement view — maverick spend, cycle, vendor concentration'
    case 'AP_MANAGER':
    case 'AP_CLERK':
      return 'AP overview — touchless rate, aging, exception register'
    default:
      return 'Persona-driven insight dashboards — drill down from KPI to action'
  }
}

// Persona tabs lazy-load so initial route mount stays cheap.
const ProcurementTab = lazy(() => import('./tabs/ProcurementTab'))
const APTab          = lazy(() => import('./tabs/APTab'))
const PaymentsTab    = lazy(() => import('./tabs/PaymentsTab'))
const CFOTab         = lazy(() => import('./tabs/CFOTab'))
const CEOTab         = lazy(() => import('./tabs/CEOTab'))

type Persona = 'procurement' | 'ap' | 'payments' | 'cfo' | 'ceo'

const PERSONAS: { id: Persona; label: string; icon: typeof ShoppingCart }[] = [
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
  { id: 'ap',          label: 'AP',          icon: FileText      },
  { id: 'payments',    label: 'Payments',    icon: CreditCard    },
  { id: 'cfo',         label: 'CFO',         icon: Briefcase     },
  { id: 'ceo',         label: 'CEO',         icon: TrendingUp    },
]

// Period presets — FY (current FY-to-date), Q1 (current quarter to date),
// rolling 90/30. Each maps to a (dateFrom, dateTo) pair so the backend's
// resolveRange() picks them up directly.
type Preset = 'fy' | 'q1' | 'last_90d' | 'last_30d' | 'this_month'

function rangeForPreset(preset: Preset): AnalyticsFilters {
  const now = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  if (preset === 'this_month') {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    return { dateFrom: iso(from), dateTo: iso(now) }
  }
  if (preset === 'last_30d') {
    return { dateFrom: iso(new Date(now.getTime() - 30 * 86_400_000)), dateTo: iso(now) }
  }
  if (preset === 'last_90d') {
    return { dateFrom: iso(new Date(now.getTime() - 90 * 86_400_000)), dateTo: iso(now) }
  }
  if (preset === 'q1') {
    const fyApr = new Date(Date.UTC(now.getUTCFullYear() - (now.getUTCMonth() < 3 ? 1 : 0), 3, 1))
    const q1End = new Date(Date.UTC(fyApr.getUTCFullYear(), 6, 1))
    return { dateFrom: iso(fyApr), dateTo: iso(q1End) }
  }
  // FY → April 1 of current FY to today
  const fyStart = new Date(Date.UTC(now.getUTCFullYear() - (now.getUTCMonth() < 3 ? 1 : 0), 3, 1))
  return { dateFrom: iso(fyStart), dateTo: iso(now) }
}

export default function AnalyticsPage() {
  const user = useAuthStore(s => s.user)
  const greeting = timeGreeting(new Date().getHours())
  const subtitle = subtitleForRole(user?.role)
  const firstName = user?.name?.split(' ')[0] ?? ''

  const [persona, setPersona] = useState<Persona>('procurement')
  const [preset, setPreset]   = useState<Preset>('fy')
  const [entityId, setEntityId] = useState<string>('')

  const filters: AnalyticsFilters = {
    ...rangeForPreset(preset),
    ...(entityId ? { entityId } : {}),
  }

  // Entity dropdown — same shape as TopBar / dashboard. Falls back to
  // [] if the response is malformed so .map() can't crash.
  const { data: entitiesRaw } = useQuery({
    queryKey: ['masters', 'entities-list'],
    queryFn:  () => http.get<unknown>('/api/masters/entities?take=200&status=ACTIVE'),
  })
  const entities = toArray<{ id: string; name: string; code: string }>(entitiesRaw)

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Analytics"
        description="Persona-driven insight dashboards — drill down from KPI to action"
        backLabel="Dashboard"
        backTo="/dashboard"
        actions={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      {/* Greeting band — same vibe as the Dashboard so personas feel
          continuous; subtitle adapts to the user's role. */}
      <div className="px-4 sm:px-6 pt-5 pb-2">
        <h1 className="text-xl font-semibold">
          {greeting}{firstName && `, ${firstName}`} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      {/* Persona tabs — pill style, teal when active */}
      <div className="flex items-center gap-1.5 border-b border-border bg-background px-4 py-2.5 overflow-x-auto">
        {PERSONAS.map(p => {
          const active = persona === p.id
          const Icon = p.icon
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPersona(p.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                active
                  ? 'bg-teal-600 text-white'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
              )}>
              <Icon className="h-3.5 w-3.5" />
              {p.label}
            </button>
          )
        })}
        <div className="flex-1" />
        {/* Period filter */}
        <select
          value={preset}
          onChange={e => setPreset(e.target.value as Preset)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium">
          <option value="fy">FY to date</option>
          <option value="q1">Q1 to date</option>
          <option value="last_90d">Last 90 days</option>
          <option value="last_30d">Last 30 days</option>
          <option value="this_month">This month</option>
        </select>
        <select
          value={entityId}
          onChange={e => setEntityId(e.target.value)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium">
          <option value="">All entities</option>
          {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-muted/20">
        <Suspense fallback={<TabSkeleton />}>
          {persona === 'procurement' && <ProcurementTab filters={filters} />}
          {persona === 'ap'          && <APTab          filters={filters} />}
          {persona === 'payments'    && <PaymentsTab    filters={filters} />}
          {persona === 'cfo'         && <CFOTab         filters={filters} />}
          {persona === 'ceo'         && <CEOTab         filters={filters} />}
        </Suspense>
      </div>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
      <div className="h-64 rounded-xl bg-muted animate-pulse" />
    </div>
  )
}
