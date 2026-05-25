import { Outlet, NavLink, useNavigate, useLocation, matchPath } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, ShoppingCart, ClipboardList,
  FileText, Users, GitBranch, Database,
  Shield, Truck, LogOut, X, PiggyBank, Calculator, BarChart3,
  ChevronDown, Wallet, ReceiptText, FileBarChart, Banknote,
  ListChecks, AlertTriangle, Building2, GitPullRequest, Mail,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import { usePermissions } from '../../hooks/usePermission'
import { useNavBadges } from '../../hooks/useNavBadges'
import { http } from '../../lib/http'
import { queryClient } from '../../lib/query-client'
import { cn } from '../../lib/utils'
import { TopBar } from './TopBar'

// Section model — drives the whole sidebar render. Each section groups N
// nav items; an item may have sub-items that expand inline under it. Module
// keys map to the existing NAV_VIEW_PERMISSION matrix below so RBAC still
// gates visibility per item. Badge keys point at fields on useNavBadges so
// counts stay live without per-item queries.
type IconType = ComponentType<{ className?: string }>
type BadgeKey =
  | 'pendingApprovals' | 'pendingInvoices' | 'unmatchedInvoices'
  | 'paymentQueueCount' | 'pendingChallans' | 'msmeAtRisk'
  | 'kycGaps' | 'failedErpSync' | 'pendingProvisions'
type BadgeTone = 'red' | 'amber' | 'teal' | 'neutral'

interface SubItem {
  to:       string
  label:    string
  badge?:   BadgeKey
  tone?:    BadgeTone
  comingSoon?: boolean
}
interface Item {
  to:        string
  icon:      IconType
  label:     string
  title?:    string
  module?:   string         // permission key — falls through to ALWAYS_VISIBLE if undefined
  badge?:    BadgeKey
  tone?:     BadgeTone
  subItems?: SubItem[]
  newBadge?: boolean        // small "New" pill (e.g. Provisions until Part 2 ships)
}
interface Section {
  id:    string
  label: string
  items: Item[]
}

// Permission map (view-gate). Items without a module are visible regardless of
// perms — that's intentional for entry points (Dashboard, Analytics) and admin
// surfaces (Masters, Admin).
const NAV_VIEW_PERMISSION: Record<string, string> = {
  '/intake':              'INTAKE',
  '/purchase-orders':     'PO',
  '/grn':                 'GRN',
  '/invoices':            'INVOICE',
  '/payments':            'PAYMENT',
  '/vendors':             'VENDOR',
  '/budgets':             'BUDGET',
  '/masters':             'MASTERS',
  '/accounting':          'ACCOUNTING',
  '/accounting/provisions': 'ACCOUNTING',
}

// 8 sections + Workflow Engine (standalone) + Configuration. Routes are kept
// stable — labels change but no /paths move. Intake stays on /intake (the
// existing PR route); Budget overview hits /budgets (existing route, just
// re-labelled here).
const SECTIONS: Section[] = [
  {
    id:    'overview',
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', title: 'Operational view — daily KPIs at a glance' },
      { to: '/analytics', icon: BarChart3,       label: 'Analytics', title: 'Deep-dive · drill-down · persona views' },
      { to: '/approvals', icon: CheckSquare,     label: 'Approval Desk', badge: 'pendingApprovals', tone: 'red' },
    ],
  },
  {
    id:    'budget',
    label: 'Budget',
    items: [
      { to: '/budgets',                  icon: PiggyBank, label: 'Budget overview', module: 'BUDGET' },
      { to: '/masters/financial-years',  icon: Calculator, label: 'Financial years' },
    ],
  },
  {
    id:    'procurement',
    label: 'Procurement',
    items: [
      {
        to: '/intake', icon: ClipboardList, label: 'Purchase Requests', module: 'INTAKE',
        subItems: [
          { to: '/intake',                  label: 'All PRs' },
          { to: '/intake?status=draft',     label: 'My drafts' },
          { to: '/intake?status=pending',   label: 'Pending', badge: 'pendingApprovals', tone: 'amber' },
        ],
      },
      {
        to: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders', module: 'PO',
        subItems: [
          { to: '/purchase-orders',                 label: 'All POs' },
          { to: '/purchase-orders?status=open',     label: 'Open POs' },
          { to: '/purchase-orders?tab=grn-status',  label: 'PO vs GRN' },
        ],
      },
      {
        to: '/grn', icon: Truck, label: 'GRN / SRN', module: 'GRN',
        subItems: [
          { to: '/grn?type=goods',   label: 'Goods receipts' },
          { to: '/grn?type=service', label: 'Service receipts' },
          { to: '/grn?type=returns', label: 'Returns' },
        ],
      },
    ],
  },
  {
    id:    'ap',
    label: 'Accounts Payable',
    items: [
      {
        to: '/invoices', icon: FileText, label: 'Invoices', module: 'INVOICE',
        badge: 'pendingInvoices', tone: 'amber',
        subItems: [
          { to: '/invoices',                       label: 'All invoices' },
          { to: '/invoices?status=unmatched',      label: 'Unmatched', badge: 'unmatchedInvoices', tone: 'red' },
          { to: '/invoices?status=pending',        label: 'Pending', badge: 'pendingInvoices', tone: 'amber' },
          { to: '/invoices?type=debit-note',       label: 'Debit notes' },
        ],
      },
      {
        // /advances doesn't exist yet — surfacing as Coming Soon rather than a
        // broken link. When the advances module lands, just flip comingSoon=false.
        to: '/advances', icon: Wallet, label: 'Advances',
        subItems: [
          { to: '/advances',                        label: 'All advances',          comingSoon: true },
          { to: '/advances?status=approved',        label: 'Pending disbursement',  comingSoon: true },
          { to: '/advances?status=unadjusted',      label: 'Unadjusted',            comingSoon: true },
        ],
      },
    ],
  },
  {
    id:    'payments',
    label: 'Payments',
    items: [
      { to: '/payments',              icon: Banknote,    label: 'Payment queue', module: 'PAYMENT', badge: 'paymentQueueCount', tone: 'red' },
      {
        to: '/payments/batches', icon: ListChecks, label: 'Payment batches', module: 'PAYMENT',
        subItems: [
          { to: '/payments/batches',                  label: 'All batches' },
          { to: '/payments/batches?status=pending',   label: 'Pending' },
          { to: '/payments/batches?status=executed',  label: 'Executed' },
        ],
      },
      { to: '/payments/tds-challans', icon: ReceiptText, label: 'TDS challans', module: 'PAYMENT', badge: 'pendingChallans', tone: 'amber' },
      // /payments/msme not wired as a standalone route — surfacing as a tab
      // query so PaymentQueuePage can pick it up (and degrade gracefully if it
      // doesn't yet handle the param). MSME-at-risk count is still live.
      { to: '/payments?tab=msme', icon: AlertTriangle, label: 'MSME register', module: 'PAYMENT', badge: 'msmeAtRisk', tone: 'red' },
    ],
  },
  {
    id:    'accounting',
    label: 'Accounting',
    items: [
      {
        // /accounting/provisions resolves once Part 2 lands; until then router
        // redirects to /accounting via the fallback in the route table.
        to: '/accounting/provisions', icon: PiggyBank, label: 'Provisions', module: 'ACCOUNTING',
        badge: 'pendingProvisions', tone: 'amber', newBadge: true,
        subItems: [
          { to: '/accounting/provisions',              label: 'Overview' },
          { to: '/accounting/provisions?tab=register', label: 'Provision register' },
          { to: '/accounting/provisions?tab=mom',      label: 'Month-on-month' },
          { to: '/accounting/provisions?tab=manual',   label: 'Manual additions' },
        ],
      },
      {
        to: '/accounting', icon: Calculator, label: 'Amortization', module: 'ACCOUNTING',
        subItems: [
          { to: '/accounting?tab=amortization',     label: 'Active schedules' },
        ],
      },
      {
        to: '/accounting', icon: FileBarChart, label: 'Journal entries', module: 'ACCOUNTING',
        subItems: [
          { to: '/accounting?tab=journal', label: 'All entries' },
          { to: '/accounting?tab=erp',     label: 'ERP sync log', badge: 'failedErpSync', tone: 'red' },
        ],
      },
      { to: '/accounting?tab=close', icon: Calculator, label: 'Month-end close', module: 'ACCOUNTING' },
    ],
  },
  {
    // Renamed from 'vendor-portal' (id + label) to free up the name for the
    // governance/onboarding module under /vendor-portal/*. This section still
    // covers the existing /vendors master data — directory, KYC, MSME, etc.
    id:    'vendor-master',
    label: 'Vendor Master',
    items: [
      { to: '/vendors',               icon: Users,    label: 'Vendor directory', module: 'VENDOR' },
      { to: '/vendors?tab=kyc',       icon: Shield,   label: 'KYC status',       module: 'VENDOR', badge: 'kycGaps', tone: 'red' },
      { to: '/vendors?tab=msme',      icon: Building2, label: 'MSME vendors',    module: 'VENDOR' },
      // The next two are Coming Soon — VendorListPage doesn't render these
      // tabs yet. Flip comingSoon=false once they exist.
      { to: '/vendors?tab=scorecard', icon: BarChart3, label: 'Vendor scorecard', module: 'VENDOR',
        subItems: [{ to: '/vendors?tab=scorecard', label: 'Coming soon', comingSoon: true }],
      },
      { to: '/vendors?tab=contracts', icon: FileText, label: 'Contracts',        module: 'VENDOR',
        subItems: [{ to: '/vendors?tab=contracts', label: 'Coming soon', comingSoon: true }],
      },
    ],
  },
  {
    // Governance & onboarding module (Figma-exported, mounted under
    // /vendor-portal/*). Lives alongside Vendor Master rather than replacing
    // it — masters describe existing vendors; governance covers the lifecycle
    // workflow that produces them.
    id:    'vendor-governance',
    label: 'Vendor Governance',
    items: [
      { to: '/vendor-portal',                 icon: Building2,       label: 'Onboarding Hub' },
      { to: '/vendor-portal/requests',        icon: FileText,        label: 'Requests' },
      { to: '/vendor-portal/approvals',       icon: CheckSquare,     label: 'Approval Workspace' },
      { to: '/vendor-portal/risk',            icon: AlertTriangle,   label: 'Risk Dashboard' },
      { to: '/vendor-portal/change-requests', icon: GitPullRequest,  label: 'Change Requests' },
      { to: '/vendor-portal/validation',      icon: Shield,          label: 'Validation' },
      { to: '/vendor-portal/implementation',  icon: ListChecks,      label: 'Implementation' },
      { to: '/vendor-portal/invitations',     icon: Mail,            label: 'Invitations' },
    ],
  },
  {
    id:    'configuration',
    label: 'Configuration',
    items: [
      {
        to: '/masters', icon: Database, label: 'Masters',
        subItems: [
          { to: '/masters/items',        label: 'Items & services' },
          { to: '/masters/users',        label: 'Users & roles' },
          { to: '/masters/gl-codes',     label: 'GL codes' },
          { to: '/masters/cost-centres', label: 'Cost centres' },
          { to: '/masters/departments',  label: 'Departments' },
          { to: '/masters/locations',    label: 'Locations' },
          { to: '/masters/tax-codes',    label: 'Tax codes' },
          { to: '/masters/currencies',   label: 'Currency' },
        ],
      },
    ],
  },
]

// Workflow Engine is rendered standalone (not nested under any section) with a
// slightly different style — a teal ENGINE pill — so it reads as a distinct
// surface from the master-data items inside Configuration.
const WORKFLOW_ITEM: Item = {
  to: '/workflow-engine', icon: GitBranch, label: 'Workflow Engine',
  title: 'Configure approval workflows · view live instances',
}

// Persisted active section key — survives soft navigation so re-entering a
// page with a deeply collapsed sidebar doesn't disorient the user.
const ACTIVE_SECTION_KEY = 'procinix.nav.activeSection'

// 5s = long enough to register the click + scan, short enough that the sidebar
// reflows back to a clean, tight state. Hovering any open section resets its
// own timer so users mid-scan don't watch panels close under them.
const AUTO_COLLAPSE_MS = 5_000

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  red:     'bg-red-500/15 text-red-300 border border-red-500/30',
  amber:   'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  teal:    'bg-[#00A9B7]/15 text-[#7FDDE3] border border-[#00A9B7]/40',
  neutral: 'bg-[#0D3538] text-[#D6F7F9] border border-[#0D3538]',
}

function Badge({ value, tone = 'neutral' }: { value: number; tone?: BadgeTone }) {
  if (!value || value <= 0) return null
  return (
    <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none', BADGE_TONE_CLASSES[tone])}>
      {value > 99 ? '99+' : value}
    </span>
  )
}

// Match an item's route against the current pathname. The first segment is the
// load-bearing bit — query strings are ignored because they don't change the
// page component.
function routeMatchesPath(itemTo: string, currentPath: string): boolean {
  const itemBase = itemTo.split('?')[0]
  return matchPath({ path: itemBase, end: false }, currentPath) != null
}

// Walk SECTIONS and pick the section that contains the current route. Falls
// back to 'overview' so the sidebar never opens completely blank.
function sectionForPath(path: string): string {
  for (const section of SECTIONS) {
    for (const item of section.items) {
      if (routeMatchesPath(item.to, path)) return section.id
    }
  }
  return 'overview'
}

export function AppShell() {
  const [open, setOpen] = useState(false)
  const { user, clearUser } = useAuthStore()
  const { data: perms } = usePermissions()
  const { badges } = useNavBadges()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const navigate = useNavigate()
  const location = useLocation()

  // Active section persistence — sessionStorage so soft nav doesn't reset, but
  // a fresh tab starts from current-route logic.
  const initialSection = useMemo(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(ACTIVE_SECTION_KEY) : null
    return stored ?? sectionForPath(location.pathname)
  }, [location.pathname])

  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set([initialSection]))
  const [activeSection, setActiveSection] = useState<string>(initialSection)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // On route change, ensure the section housing the new route is expanded and
  // becomes the active one. Other sections start their 5s timer.
  useEffect(() => {
    const sectionId = sectionForPath(location.pathname)
    setActiveSection(sectionId)
    sessionStorage.setItem(ACTIVE_SECTION_KEY, sectionId)
    setOpenSections(prev => {
      if (prev.has(sectionId)) return prev
      const next = new Set(prev)
      next.add(sectionId)
      return next
    })
  // location.pathname is the only signal that should re-fire this effect.
  }, [location.pathname])

  // Schedule auto-collapse for every open section that isn't active. Hovering
  // any open section cancels its timer (see onMouseEnter below).
  useEffect(() => {
    const timers = timersRef.current
    // Clear any timer for the now-active section so it stays put.
    const activeTimer = timers.get(activeSection)
    if (activeTimer) {
      clearTimeout(activeTimer)
      timers.delete(activeSection)
    }

    for (const sectionId of openSections) {
      if (sectionId === activeSection) continue
      if (timers.has(sectionId)) continue
      const timer = setTimeout(() => {
        setOpenSections(prev => {
          const next = new Set(prev)
          next.delete(sectionId)
          return next
        })
        timers.delete(sectionId)
      }, AUTO_COLLAPSE_MS)
      timers.set(sectionId, timer)
    }

    return () => {
      // On unmount, clear every outstanding timer so deferred setState calls
      // don't fire against an unmounted component.
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
    }
  }, [openSections, activeSection])

  function cancelTimer(sectionId: string) {
    const t = timersRef.current.get(sectionId)
    if (t) {
      clearTimeout(t)
      timersRef.current.delete(sectionId)
    }
  }

  function toggleSection(sectionId: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
        cancelTimer(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
    setActiveSection(sectionId)
    sessionStorage.setItem(ACTIVE_SECTION_KEY, sectionId)
  }

  function handleItemClick(sectionId: string) {
    setActiveSection(sectionId)
    sessionStorage.setItem(ACTIVE_SECTION_KEY, sectionId)
    cancelTimer(sectionId)
    setOpen(false)
  }

  // Permission gate — same logic as before, but operating per-item now that
  // sections aren't permission-aware (always show the section header; hide
  // items inside that are blocked).
  function isItemVisible(item: Item): boolean {
    const moduleKey = item.module ?? NAV_VIEW_PERMISSION[item.to.split('?')[0]]
    if (!moduleKey || isSuperAdmin) return true
    if (!perms) return true
    return perms?.[moduleKey]?.view ?? false
  }

  async function handleLogout() {
    try { await http.post('/auth/logout', {}) } catch { /* ignore */ }
    clearUser()
    queryClient.clear()
    navigate('/login')
  }

  // Filter sections — drop sections whose every item is permission-blocked so
  // the sidebar doesn't show empty group headers.
  const visibleSections = useMemo(() => {
    return SECTIONS
      .map(s => ({ ...s, items: s.items.filter(isItemVisible) }))
      .filter(s => s.items.length > 0)
  // perms is the only dep — section data is module-scoped above.
  }, [perms, isSuperAdmin])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#0D3538] bg-[#051A1C] transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-[#0D3538] px-4">
          <img
            src="/logos/procinix-logo.png"
            alt="Procinix"
            className="h-10 w-auto object-contain"
            style={{ mixBlendMode: 'screen' }}
          />
          <button className="ml-auto lg:hidden text-[#D6F7F9]" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sections */}
        {/* Linear/Notion-style rhythm: generous py-3 on the scroll container,
            sections separated by mb-1, section headers in uppercase text-xs
            with tracking-wider and py-2.5 padding for comfortable scanning. */}
        <nav className="flex-1 overflow-y-auto py-3">
          {visibleSections.map(section => {
            const isOpen = openSections.has(section.id)
            return (
              <div
                key={section.id}
                className="px-2 mb-1"
                onMouseEnter={() => isOpen && cancelTimer(section.id)}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#5BA0A3] hover:text-[#D6F7F9]"
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen ? 'rotate-0' : '-rotate-90')}
                  />
                </button>
                <div
                  className={cn(
                    'overflow-hidden transition-[max-height,opacity] duration-[250ms] ease-in-out',
                    isOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0',
                  )}
                >
                  <div className="space-y-0.5 pb-1">
                    {section.items.map(item => (
                      <NavItem
                        key={item.to + item.label}
                        item={item}
                        badges={badges}
                        currentPath={location.pathname}
                        currentSearch={location.search}
                        onClick={() => handleItemClick(section.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Workflow Engine — standalone, no section group */}
          <div className="mt-3 border-t border-[#0D3538] px-2 pt-3">
            <NavLink
              to={WORKFLOW_ITEM.to}
              title={WORKFLOW_ITEM.title}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'border-[#00A9B7]/40 bg-[rgba(0,169,183,0.2)] text-[#00A9B7] font-medium'
                  : 'border-[#0D3538] text-[#7BBFC2] hover:border-[#00A9B7]/30 hover:bg-[#0D3538] hover:text-white'
              )}
            >
              <WORKFLOW_ITEM.icon className="h-4 w-4 flex-shrink-0" />
              <span>{WORKFLOW_ITEM.label}</span>
              <span className="ml-auto rounded-full bg-[#00A9B7]/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#7FDDE3]">
                Engine
              </span>
            </NavLink>
          </div>

          {/* Admin — only visible to SUPER_ADMIN */}
          {isSuperAdmin && (
            <div className="mt-3 px-2">
              <NavLink
                to="/admin/tenants"
                onClick={() => setOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[rgba(0,169,183,0.2)] text-[#00A9B7] font-medium'
                    : 'text-[#7BBFC2] hover:bg-[#0D3538] hover:text-white'
                )}
              >
                <Shield className="h-4 w-4 flex-shrink-0" />
                Admin
              </NavLink>
            </div>
          )}
        </nav>

        {/* User */}
        <div className="border-t border-[#0D3538] p-3">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0D3538] text-xs font-medium text-white flex-shrink-0">
              {user?.name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-white">{user?.name}</p>
              <p className="text-xs truncate text-[#7BBFC2]">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-[#7BBFC2] hover:text-white">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

interface NavItemProps {
  item:          Item
  badges:        ReturnType<typeof useNavBadges>['badges']
  currentPath:   string
  currentSearch: string
  onClick:       () => void
}

function NavItem({ item, badges, currentPath, currentSearch, onClick }: NavItemProps) {
  const [subOpen, setSubOpen] = useState(false)
  const Icon = item.icon
  const isActive = routeMatchesPath(item.to, currentPath)

  // Auto-expand the sub-tree when the current route matches any of its
  // sub-items — keeps deeply linked URLs visually rooted in the sidebar.
  useEffect(() => {
    if (!item.subItems) return
    const onMyTree = item.subItems.some(s => {
      const [p, q] = s.to.split('?')
      if (p !== currentPath) return false
      return q ? currentSearch.includes(q) : true
    })
    if (onMyTree) setSubOpen(true)
  }, [currentPath, currentSearch, item.subItems])

  const badgeValue = item.badge ? badges[item.badge] : 0

  // Items with sub-items render as a parent-row that toggles the tray rather
  // than navigating directly. Items without sub-items behave as plain
  // NavLinks. Both surface the same active-row treatment so visual rhythm
  // stays consistent.
  if (item.subItems && item.subItems.length > 0) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setSubOpen(o => !o)}
          title={item.title}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            isActive
              ? 'bg-[rgba(0,169,183,0.2)] text-[#00A9B7] font-medium'
              : 'text-[#7BBFC2] hover:bg-[#0D3538] hover:text-white',
          )}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.newBadge && (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
              New
            </span>
          )}
          <Badge value={badgeValue} tone={item.tone} />
          <ChevronDown className={cn('h-3 w-3 flex-shrink-0 transition-transform duration-200', subOpen ? 'rotate-0' : '-rotate-90')} />
        </button>
        <div className={cn(
          'overflow-hidden transition-[max-height,opacity] duration-[250ms] ease-in-out',
          subOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
        )}>
          <div className="ml-7 mt-0.5 space-y-0.5 border-l border-[#0D3538] pl-3 pb-1">
            {item.subItems.map(sub => (
              <SubNavLink
                key={sub.to + sub.label}
                sub={sub}
                badges={badges}
                onClick={onClick}
                currentPath={currentPath}
                currentSearch={currentSearch}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <NavLink
      to={item.to}
      title={item.title}
      onClick={onClick}
      className={({ isActive: linkActive }) => cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        linkActive
          ? 'bg-[rgba(0,169,183,0.2)] text-[#00A9B7] font-medium'
          : 'text-[#7BBFC2] hover:bg-[#0D3538] hover:text-white',
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.newBadge && (
        <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
          New
        </span>
      )}
      <Badge value={badgeValue} tone={item.tone} />
    </NavLink>
  )
}

interface SubNavLinkProps {
  sub:           SubItem
  badges:        ReturnType<typeof useNavBadges>['badges']
  onClick:       () => void
  currentPath:   string
  currentSearch: string
}

function SubNavLink({ sub, badges, onClick, currentPath, currentSearch }: SubNavLinkProps) {
  const [path, queryRaw] = sub.to.split('?')
  const query = queryRaw ? `?${queryRaw}` : ''

  // Exact-ish match: same path and (if the sub specifies query params) those
  // params present in the current location.search. Keeps "All …" sub-items
  // from highlighting alongside filtered tabs.
  const isActive = currentPath === path && (
    queryRaw
      ? currentSearch === query
      : currentSearch === '' || currentSearch === query
  )

  const value = sub.badge ? badges[sub.badge] : 0

  if (sub.comingSoon) {
    return (
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#4F8B8E] cursor-not-allowed"
        title="Coming soon"
      >
        <span className="flex-1">{sub.label}</span>
        <span className="rounded-full border border-[#0D3538] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#5BA0A3]">
          Soon
        </span>
      </div>
    )
  }

  return (
    <NavLink
      to={sub.to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
        isActive ? 'text-[#00A9B7] font-medium' : 'text-[#7BBFC2] hover:bg-[#0D3538] hover:text-white',
      )}
    >
      <span className="flex-1">{sub.label}</span>
      <Badge value={value} tone={sub.tone} />
    </NavLink>
  )
}
