import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useAuthStore } from './stores/auth.store'

const LoginPage          = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'))
const InvoiceListPage         = lazy(() => import('./pages/invoices/InvoiceListPage'))
const InvoiceDetailPage       = lazy(() => import('./pages/invoices/InvoiceDetailPage'))
const InvoiceNewPage          = lazy(() => import('./pages/invoices/InvoiceNewPage'))
const InvoiceReviewQueuePage  = lazy(() => import('./pages/invoices/InvoiceReviewQueuePage'))
const PaymentListPage    = lazy(() => import('./pages/payments/PaymentListPage'))
const PaymentDetailPage  = lazy(() => import('./pages/payments/PaymentDetailPage'))
const VendorListPage     = lazy(() => import('./pages/masters/vendors/VendorListPage'))
const VendorDetailPage   = lazy(() => import('./pages/masters/vendors/VendorDetailPage'))
const VendorFormPage     = lazy(() => import('./pages/masters/vendors/VendorFormPage'))
const MastersPage        = lazy(() => import('./pages/masters/MastersPage'))
const GlCodesPage        = lazy(() => import('./pages/masters/GlCodesPage'))
const DepartmentsPage    = lazy(() => import('./pages/masters/DepartmentsPage'))
const CostCentresPage    = lazy(() => import('./pages/masters/CostCentresPage'))
const TaxCodesPage       = lazy(() => import('./pages/masters/TaxCodesPage'))
const DesignationsPage   = lazy(() => import('./pages/masters/DesignationsPage'))
const EntitiesPage       = lazy(() => import('./pages/masters/EntitiesPage'))
const LocationsPage      = lazy(() => import('./pages/masters/LocationsPage'))
const EmployeesPage      = lazy(() => import('./pages/masters/EmployeesPage'))
const WorkflowRulesPage  = lazy(() => import('./pages/masters/WorkflowRulesPage'))
const TaxRegimesPage     = lazy(() => import('./pages/masters/TaxRegimesPage'))
const FinancialYearsPage = lazy(() => import('./pages/masters/FinancialYearsPage'))
const CountryMasterPage  = lazy(() => import('./pages/masters/CountryMasterPage'))
const StateMasterPage    = lazy(() => import('./pages/masters/StateMasterPage'))
const CityMasterPage     = lazy(() => import('./pages/masters/CityMasterPage'))
const CurrencyMasterPage = lazy(() => import('./pages/masters/CurrencyMasterPage'))
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
    </div>
  )
}

function RequireAuth() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/login', element: <S><LoginPage /></S> },
  {
    element: <RequireAuth />,
    children: [{
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard', element: <S><DashboardPage /></S> },
        { path: 'invoices', children: [
          { index: true,      element: <S><InvoiceListPage /></S> },
          { path: 'new',      element: <S><InvoiceNewPage /></S> },
          { path: 'review',   element: <S><InvoiceReviewQueuePage /></S> },
          { path: ':id',      element: <S><InvoiceDetailPage /></S> },
        ]},
        { path: 'payments', children: [
          { index: true, element: <S><PaymentListPage /></S> },
          { path: ':id', element: <S><PaymentDetailPage /></S> },
        ]},
        { path: 'masters', children: [
          { index: true,              element: <S><MastersPage /></S>                        },
          { path: 'vendors',          element: <S><VendorListPage /></S>                     },
          { path: 'vendors/new',      element: <S><VendorFormPage mode="create" /></S>       },
          { path: 'vendors/:id',      element: <S><VendorDetailPage /></S>                   },
          { path: 'vendors/:id/edit', element: <S><VendorFormPage mode="edit" /></S>         },
          { path: 'gl-codes',         element: <S><GlCodesPage /></S>                        },
          { path: 'departments',      element: <S><DepartmentsPage /></S>                    },
          { path: 'cost-centres',     element: <S><CostCentresPage /></S>                    },
          { path: 'tax-codes',         element: <S><TaxCodesPage /></S>                        },
          { path: 'designations',      element: <S><DesignationsPage /></S>                    },
          { path: 'entities',          element: <S><EntitiesPage /></S>                        },
          { path: 'locations',         element: <S><LocationsPage /></S>                       },
          { path: 'employees',         element: <S><EmployeesPage /></S>                       },
          { path: 'workflow-rules',    element: <S><WorkflowRulesPage /></S>                   },
          { path: 'tax-regimes',       element: <S><TaxRegimesPage /></S>                      },
          { path: 'financial-years',   element: <S><FinancialYearsPage /></S>                  },
          { path: 'countries',         element: <S><CountryMasterPage /></S>                    },
          { path: 'states',            element: <S><StateMasterPage /></S>                      },
          { path: 'cities',            element: <S><CityMasterPage /></S>                       },
          { path: 'currencies',        element: <S><CurrencyMasterPage /></S>                   },
        ]},
      ],
    }],
  },
  { path: '*', element: <S><NotFoundPage /></S> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
