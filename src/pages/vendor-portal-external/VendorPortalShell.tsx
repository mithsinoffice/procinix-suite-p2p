import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Truck, FileText, Banknote, GitMerge, LogOut,
} from 'lucide-react'
import {
  useVendorPortalSession,
  useVendorPortalLogout,
} from '../../hooks/vendor-portal/useVendorPortalSession'

// External vendor portal shell — no buyer AppShell, no buyer JWT. Vendors
// land here after the magic-link login; the shell renders a slim sidebar
// + outlet, gates rendering on the vendor session probe, and bounces to
// /portal/login when the session is invalid.

const NAV_ITEMS = [
  { to: '/portal/vendor/dashboard', icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/portal/vendor/pos',       icon: ShoppingCart,    label: 'Purchase Orders'  },
  { to: '/portal/vendor/asn',       icon: Truck,           label: 'Shipments (ASN)'  },
  { to: '/portal/vendor/invoices',  icon: FileText,        label: 'Invoices'         },
  { to: '/portal/vendor/payments',  icon: Banknote,        label: 'Payments'         },
  { to: '/portal/vendor/recon',     icon: GitMerge,        label: 'Reconciliation'   },
]

export function VendorPortalShell() {
  const sessionQuery = useVendorPortalSession()
  const logoutFn     = useVendorPortalLogout()
  const navigate     = useNavigate()

  if (sessionQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Loading your vendor portal…
      </div>
    )
  }

  if (sessionQuery.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in to continue</h1>
          <p className="text-sm text-slate-500">
            Your session has expired or you're not signed in. Use the magic link from your most recent invitation to sign back in.
          </p>
          <button
            onClick={() => navigate('/portal/onboarding/demo')}
            className="px-5 py-2 rounded-md bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
          >
            Go to onboarding portal
          </button>
        </div>
      </div>
    )
  }

  async function handleLogout() {
    await logoutFn.mutateAsync().catch(() => {/* ignore */})
    navigate('/portal/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="font-semibold text-slate-900">Vendor Portal</div>
          <div className="text-xs text-slate-500 mt-0.5">Procinix S2P</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
