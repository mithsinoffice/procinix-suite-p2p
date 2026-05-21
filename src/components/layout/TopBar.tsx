import { useLocation, useNavigate, matchPath } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Menu, Bell, Building2, ChevronDown, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'
import { http } from '../../lib/http'
import { queryClient } from '../../lib/query-client'
import { cn, toArray } from '../../lib/utils'

// Route → page title. Longest-prefix match wins (so '/invoices/new' shows 'Invoices').
const PATH_TITLES: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/approvals':       'Approval Desk',
  '/budgets':         'Budgets',
  '/intake':          'Intake',
  '/purchase-orders': 'Purchase Orders',
  '/grn':             'GRN',
  '/invoices':        'Invoices',
  '/payments':        'Payments',
  '/vendors':         'Vendors',
  '/workflow-engine': 'Workflow Engine',
  '/masters':         'Masters',
  '/admin/tenants':   'Admin · Tenants',
  '/profile':         'Profile',
}

function getPageTitle(pathname: string): string {
  if (PATH_TITLES[pathname]) return PATH_TITLES[pathname]
  const match = Object.keys(PATH_TITLES)
    .filter(k => pathname.startsWith(k + '/') || matchPath(`${k}/*`, pathname))
    .sort((a, b) => b.length - a.length)[0]
  return match ? PATH_TITLES[match] : 'Procinix'
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface TopBarProps {
  onMenuOpen: () => void
}

export function TopBar({ onMenuOpen }: TopBarProps) {
  const navigate    = useNavigate()
  const { pathname } = useLocation()
  const { user, clearUser } = useAuthStore()
  const title    = getPageTitle(pathname)
  const initials = getInitials(user?.name)

  // Pending-approvals badge — refresh every minute so the count stays live
  // without being noisy. Empty array on error so the bell still renders.
  const { data: pendingApprovals } = useQuery({
    queryKey: ['pending-approvals-count'],
    queryFn:  () => http.get<any[]>('/api/invoices/pending-approvals').catch(() => []),
    staleTime:       30_000,
    refetchInterval: 60_000,
    enabled: !!user,
  })
  const pendingCount = Array.isArray(pendingApprovals) ? pendingApprovals.length : 0

  // Resolve current user's default entity → entity name for the chip
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn:  () => http.get<any>('/auth/me'),
    staleTime: 5 * 60_000,
    enabled:   !!user,
  })
  const { data: entities } = useQuery({
    queryKey: ['entities'],
    queryFn:  async () => toArray<{ id: string; code: string; name: string }>(await http.get<unknown>('/api/masters/entities')),
    staleTime: 10 * 60_000,
    enabled:   !!user,
  })
  // Belt-and-suspenders: even though the queryFn always returns an array and
  // the destructure has its own default, guard the consumer call too so a
  // briefly-undefined state during cache transitions can't crash the chrome.
  const entityList    = toArray<{ id: string; code: string; name: string }>(entities)
  const currentEntity = entityList.find(e => e.id === currentUser?.entityId)
  const entityDisplay = currentEntity?.name ?? currentUser?.tenantCode ?? user?.tenantCode ?? '…'

  async function handleLogout() {
    try { await http.post('/auth/logout', {}) } catch { /* ignore */ }
    clearUser()
    queryClient.clear()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      {/* Left: mobile menu + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuOpen}
          className="lg:hidden text-muted-foreground hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold truncate">{title}</h1>
      </div>

      {/* Right: entity chip + notifications + user menu */}
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium" title={currentEntity?.code ?? user?.tenantCode ?? ''}>
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="truncate max-w-[180px]">{entityDisplay}</span>
        </span>

        <button
          onClick={() => navigate('/approvals')}
          className="relative rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`${pendingCount} pending approvals`}
        >
          <Bell className="h-4 w-4" />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-1 rounded-md p-0.5 hover:bg-muted outline-none focus:ring-2 focus:ring-ring"
              aria-label="User menu"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {initials}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className={cn(
                'z-50 w-60 rounded-md border border-border bg-popover p-1 shadow-md',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              )}
            >
              <div className="px-2 py-2">
                <p className="text-sm font-medium truncate">{user?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
                {user?.role && (
                  <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {user.role}
                  </span>
                )}
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={() => navigate('/profile')}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Profile settings
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={handleLogout}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
