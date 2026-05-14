import { useState, useDeferredValue } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../lib/http'
import {
  Building2, Calculator, MapPin, Receipt, Package, Users,
  Globe, Calendar, Wallet, GitBranch, Briefcase, Shield,
  User, Flag, LayoutGrid, List, Search, DollarSign,
} from 'lucide-react'
import { cn } from '../../lib/utils'

// ── Master definitions ──

interface MasterDef {
  key:        string
  title:      string
  desc:       string
  icon:       React.ElementType
  iconBg:     string
  iconColor:  string
  to:         string
  countApi?:  string
  status:     'live' | 'coming_soon'
}

const MASTER_GROUPS: { group: string; color: string; masters: MasterDef[] }[] = [
  {
    group: 'Organisation',
    color: 'text-blue-600',
    masters: [
      { key: 'entity',      title: 'Entities',      desc: 'Legal entities, subsidiaries and branches',    icon: Building2,  iconBg: 'bg-blue-50',    iconColor: 'text-blue-600',    to: '/masters/entities',        countApi: '/api/masters/entities?take=1',       status: 'live'        },
      { key: 'department',  title: 'Departments',   desc: 'Company department structure',                 icon: Package,    iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-600',  to: '/masters/departments',     countApi: '/api/masters/departments?take=1',    status: 'live'        },
      { key: 'designation', title: 'Designations',  desc: 'Job titles and hierarchy levels',              icon: Briefcase,  iconBg: 'bg-violet-50',  iconColor: 'text-violet-600',  to: '/masters/designations',    countApi: '/api/masters/designations?take=1',   status: 'live'        },
      { key: 'employee',    title: 'Employees',     desc: 'Employee master with HR details',              icon: User,       iconBg: 'bg-sky-50',     iconColor: 'text-sky-600',     to: '/masters/employees',       countApi: '/api/masters/employees?take=1',      status: 'live'        },
      { key: 'location',    title: 'Locations',     desc: 'Office, warehouse and branch locations',       icon: MapPin,     iconBg: 'bg-cyan-50',    iconColor: 'text-cyan-600',    to: '/masters/locations',       countApi: '/api/masters/locations?take=1',      status: 'live'        },
    ],
  },
  {
    group: 'Financial',
    color: 'text-emerald-600',
    masters: [
      { key: 'glCode',     title: 'Chart of Accounts', desc: 'GL codes and account type mapping',         icon: Calculator, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', to: '/masters/gl-codes',        countApi: '/api/masters/gl-codes?take=1',       status: 'live'        },
      { key: 'costCentre', title: 'Cost Centres',  desc: 'Cost centre and profit centre allocation',      icon: DollarSign, iconBg: 'bg-teal-50',    iconColor: 'text-teal-600',    to: '/masters/cost-centres',    countApi: '/api/masters/cost-centres?take=1',   status: 'live'        },
      { key: 'fy',         title: 'Financial Years', desc: 'Fiscal year periods and current year',        icon: Calendar,   iconBg: 'bg-green-50',   iconColor: 'text-green-600',   to: '/masters/financial-years', countApi: '/api/masters/financial-years',        status: 'live'        },
      { key: 'currency',   title: 'Currencies',    desc: 'Currency master with exchange rates',           icon: Wallet,     iconBg: 'bg-lime-50',    iconColor: 'text-lime-600',    to: '/masters/geography',       countApi: '/api/masters/currencies',            status: 'live'        },
    ],
  },
  {
    group: 'Tax & Statutory',
    color: 'text-orange-600',
    masters: [
      { key: 'taxRegime', title: 'Tax Regimes', desc: 'GST, VAT, WHT — drives compliance rules',         icon: Shield,     iconBg: 'bg-orange-50',  iconColor: 'text-orange-600',  to: '/masters/tax-regimes',     countApi: '/api/masters/tax-regimes?take=1',    status: 'live'        },
      { key: 'taxCode',   title: 'Tax Codes',   desc: 'GST slabs and tax rates for invoice lines',       icon: Receipt,    iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   to: '/masters/tax-codes',       countApi: '/api/masters/tax-codes?take=1',      status: 'live'        },
    ],
  },
  {
    group: 'Procurement',
    color: 'text-rose-600',
    masters: [
      { key: 'vendor',   title: 'Vendors',        desc: 'Suppliers, contractors — KYC + bank verified',  icon: Users,      iconBg: 'bg-rose-50',    iconColor: 'text-rose-600',    to: '/masters/vendors',         countApi: '/api/masters/vendors?take=1',         status: 'live'        },
      { key: 'workflow', title: 'Workflow Rules',  desc: 'Approval routing and amount thresholds',        icon: GitBranch,  iconBg: 'bg-pink-50',    iconColor: 'text-pink-600',    to: '/masters/workflow-rules',  countApi: '/api/masters/workflow-rules?take=1', status: 'live'        },
    ],
  },
  {
    group: 'Geography & Localisation',
    color: 'text-purple-600',
    masters: [
      { key: 'geography', title: 'Countries & States', desc: 'System-seeded country and state data',     icon: Globe,      iconBg: 'bg-purple-50',  iconColor: 'text-purple-600',  to: '/masters/geography',       countApi: '/api/masters/countries',             status: 'live'        },
      { key: 'holiday',   title: 'Holiday Calendar',   desc: 'Public and optional holiday schedules',    icon: Flag,       iconBg: 'bg-fuchsia-50', iconColor: 'text-fuchsia-600', to: '/masters/geography',       countApi: undefined,                            status: 'coming_soon' },
    ],
  },
]

// ── Count fetcher per master ──

function useMasterCount(api?: string): number | null {
  const { data } = useQuery({
    queryKey:  ['master-count', api],
    queryFn:   async () => {
      if (!api) return null
      try {
        const res = await http.get<any>(api)
        return res?.total ?? (Array.isArray(res) ? res.length : null)
      } catch {
        return null
      }
    },
    enabled:   !!api,
    staleTime: 5 * 60_000,
    retry:     false,
  })
  return data ?? null
}

// ── Individual master card ──

function MasterCard({ master }: { master: MasterDef }) {
  const navigate = useNavigate()
  const count    = useMasterCount(master.countApi)
  const Icon     = master.icon

  return (
    <button
      onClick={() => navigate(master.to)}
      disabled={master.status === 'coming_soon'}
      className={cn(
        'group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-all',
        'hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5',
        master.status === 'coming_soon' && 'opacity-50 cursor-not-allowed hover:shadow-none hover:translate-y-0'
      )}
    >
      {/* Status badge */}
      <div className="absolute top-4 right-4">
        {master.status === 'live' ? (
          <span className="flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Live
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Soon</span>
        )}
      </div>

      {/* Icon */}
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', master.iconBg)}>
        <Icon className={cn('h-5 w-5', master.iconColor)} />
      </div>

      {/* Title + count */}
      <div>
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold">{master.title}</p>
          {count !== null && count > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{count} active</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{master.desc}</p>
      </div>
    </button>
  )
}

// ── Main page ──

export default function MastersPage() {
  const [search, setSearch]   = useState('')
  const [view, setView]       = useState<'grid' | 'list'>('grid')
  const [groupBy, setGroupBy] = useState(true)
  const deferred              = useDeferredValue(search)

  const allMasters = MASTER_GROUPS.flatMap(g => g.masters)
  const filtered   = deferred
    ? allMasters.filter(m => m.title.toLowerCase().includes(deferred.toLowerCase()) || m.desc.toLowerCase().includes(deferred.toLowerCase()))
    : null

  const totalLive = allMasters.filter(m => m.status === 'live').length

  return (
    <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Masters</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure global reference data used across all modules</p>
        <p className="text-xs text-muted-foreground mt-0.5">{totalLive} of {allMasters.length} masters live</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search masters…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Group toggle */}
        <div className="flex items-center rounded-lg border border-input overflow-hidden">
          <button
            onClick={() => setGroupBy(true)}
            className={cn('px-3 py-2 text-xs font-medium transition-colors', groupBy ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
          >
            Group by category
          </button>
          <button
            onClick={() => setGroupBy(false)}
            className={cn('px-3 py-2 text-xs font-medium transition-colors', !groupBy ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
          >
            Show all
          </button>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-input overflow-hidden">
          <button onClick={() => setView('grid')} className={cn('p-2 transition-colors', view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView('list')} className={cn('p-2 transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search results */}
      {filtered ? (
        <div>
          <p className="text-xs text-muted-foreground mb-3">{filtered.length} results for "{deferred}"</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(m => <MasterCard key={m.key} master={m} />)}
          </div>
        </div>
      ) : groupBy ? (
        /* Grouped view */
        <div className="space-y-8">
          {MASTER_GROUPS.map(group => (
            <div key={group.group}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={cn('text-sm font-semibold', group.color)}>{group.group}</h2>
                <span className="text-xs text-muted-foreground">{group.masters.length} masters</span>
              </div>
              <div className={cn(
                view === 'grid'
                  ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'flex flex-col gap-2'
              )}>
                {group.masters.map(m => (
                  view === 'grid'
                    ? <MasterCard key={m.key} master={m} />
                    : <MasterListRow key={m.key} master={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat view */
        <div className={cn(
          view === 'grid'
            ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'flex flex-col gap-2'
        )}>
          {allMasters.map(m => (
            view === 'grid'
              ? <MasterCard key={m.key} master={m} />
              : <MasterListRow key={m.key} master={m} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── List row view ──

function MasterListRow({ master }: { master: MasterDef }) {
  const navigate = useNavigate()
  const count    = useMasterCount(master.countApi)
  const Icon     = master.icon

  return (
    <button
      onClick={() => navigate(master.to)}
      disabled={master.status === 'coming_soon'}
      className={cn(
        'flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all',
        'hover:shadow-sm hover:border-primary/30',
        master.status === 'coming_soon' && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0', master.iconBg)}>
        <Icon className={cn('h-4 w-4', master.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{master.title}</p>
        <p className="text-xs text-muted-foreground truncate">{master.desc}</p>
      </div>
      {count !== null && (
        <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{count} active</span>
      )}
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0',
        master.status === 'live' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-muted text-muted-foreground'
      )}>
        {master.status === 'live' ? 'Live' : 'Soon'}
      </span>
    </button>
  )
}
