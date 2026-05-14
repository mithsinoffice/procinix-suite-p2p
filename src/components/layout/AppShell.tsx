import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, CreditCard, Database, LogOut, Menu, X, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import { http } from '../../lib/http'
import { queryClient } from '../../lib/query-client'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices',        icon: FileText,         label: 'Invoices'  },
  { to: '/invoices/review', icon: AlertCircle,      label: 'AP Queue'  },
  { to: '/payments',        icon: CreditCard,       label: 'Payments'  },
  { to: '/masters',         icon: Database,         label: 'Masters'   },
]

export function AppShell() {
  const [open, setOpen] = useState(false)
  const { user, clearUser } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    try { await http.post('/auth/logout', {}) } catch { /* ignore */ }
    clearUser()
    queryClient.clear()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-[#1E2D45] bg-[#0A1628] transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-[#1E2D45] px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#00A9B7]">
            <span className="text-xs font-bold text-white">P</span>
          </div>
          <span className="font-semibold text-sm text-white">Procinix</span>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-4 w-4 text-[#8B9BB4]" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-[#00A9B7]/20 text-[#00A9B7] font-medium'
                  : 'text-[#8B9BB4] hover:bg-white/10 hover:text-white'
              )}
              onClick={() => setOpen(false)}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-[#1E2D45] p-3">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E2D45] text-xs font-medium text-white flex-shrink-0">
              {user?.name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-white">{user?.name}</p>
              <p className="text-xs truncate text-[#8B9BB4]">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-[#8B9BB4] hover:text-white">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <button onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <span className="font-semibold text-sm">Procinix</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
