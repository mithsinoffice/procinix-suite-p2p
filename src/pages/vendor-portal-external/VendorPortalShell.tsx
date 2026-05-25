import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import {
  useVendorPortalSession,
  useVendorPortalLogout,
} from '../../hooks/vendor-portal/useVendorPortalSession'

// External vendor portal shell (Sprint 5 — topbar layout).
//
// Sprint 4 shipped this as a sidebar; the topbar makes the portal feel
// like a vendor-facing SaaS surface rather than the buyer's internal ERP.
// Layout: logo + label (left) · nav (centre) · vendor email + sign-out
// (right). Below the topbar: subtle slate-50 page background that contains
// the routed page content via <Outlet />. Mobile breakpoint (<lg)
// collapses the centre nav into a hamburger drawer.

const NAV_ITEMS = [
  { to: '/portal/vendor/dashboard', label: 'Dashboard'        },
  { to: '/portal/vendor/pos',       label: 'Purchase Orders'  },
  { to: '/portal/vendor/asn',       label: 'Shipments'        },
  { to: '/portal/vendor/invoices',  label: 'Invoices'         },
  { to: '/portal/vendor/payments',  label: 'Payments'         },
  { to: '/portal/vendor/recon',     label: 'Reconciliation'   },
]

export function VendorPortalShell() {
  const sessionQuery = useVendorPortalSession()
  const logoutFn     = useVendorPortalLogout()
  const navigate     = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (sessionQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Loading your vendor portal…
      </div>
    )
  }

  if (sessionQuery.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in to continue</h1>
          <p className="text-sm text-slate-500">
            Your session has expired. Sign back in with the magic link from your invitation.
          </p>
          <button
            onClick={() => navigate('/portal/vendor/login')}
            className="px-5 py-2 rounded-md bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
          >
            Go to sign-in
          </button>
        </div>
      </div>
    )
  }

  async function handleLogout() {
    await logoutFn.mutateAsync().catch(() => {/* already gone */})
    navigate('/portal/vendor/login')
  }

  // The probe query response carries a totals payload — we don't need the
  // company name field here yet, so display the vendor email from a future
  // session-enrichment hook. For now, render '—' until the API exposes it.
  const vendorEmail = '' // populated when /session/me lands

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200">
        <div className="px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Left — logo + label */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-md bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 leading-none">Procinix</div>
              <div className="text-[11px] text-slate-500 leading-none mt-0.5">Vendor Portal</div>
            </div>
          </div>

          {/* Centre — desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right — identity + sign out */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {vendorEmail && (
              <span className="hidden md:inline-block text-xs text-slate-500 max-w-[200px] truncate">
                {vendorEmail}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen(open => !open)}
              className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <nav className="lg:hidden border-t border-slate-200 px-4 py-3 space-y-1">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100"
            >
              Sign out
            </button>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
