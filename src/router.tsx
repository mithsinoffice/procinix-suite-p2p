import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useAuthStore } from './stores/auth.store'

const LoginPage          = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'))
const InvoiceListPage         = lazy(() => import('./pages/invoices/InvoiceListPage'))
const InvoiceDetailPage       = lazy(() => import('./pages/invoices/InvoiceDetailPage'))
const InvoiceFormPage         = lazy(() => import('./pages/invoices/InvoiceFormPage'))
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
const FxRateMasterPage       = lazy(() => import('./pages/masters/FxRateMasterPage'))
const VendorCategoryPage     = lazy(() => import('./pages/masters/VendorCategoryPage'))
const VendorGroupPage        = lazy(() => import('./pages/masters/VendorGroupPage'))
const ProfitCentrePage       = lazy(() => import('./pages/masters/ProfitCentrePage'))
const TdsSectionsPage        = lazy(() => import('./pages/masters/TdsSectionsPage'))
const ItemMasterPage                = lazy(() => import('./pages/masters/items/ItemMasterPage'))
const ItemFormPage                  = lazy(() => import('./pages/masters/items/ItemFormPage'))
const ItemCategoryPage              = lazy(() => import('./pages/masters/items/ItemCategoryPage'))
const WorkflowDefinitionsPage       = lazy(() => import('./pages/masters/workflow/WorkflowDefinitionsPage'))
const WorkflowDefinitionFormPage    = lazy(() => import('./pages/masters/workflow/WorkflowDefinitionFormPage'))
const ApprovalDeskPage              = lazy(() => import('./pages/approvals/ApprovalDeskPage'))
const PurchaseOrdersPage            = lazy(() => import('./pages/purchase-orders/PurchaseOrdersPage'))
const GRNPage                       = lazy(() => import('./pages/grn/GRNPage'))
const WorkflowHubPage               = lazy(() => import('./pages/workflow/WorkflowHubPage'))
const AdminTenantsPage              = lazy(() => import('./pages/admin/AdminTenantsPage'))
const NotFoundPage           = lazy(() => import('./pages/NotFoundPage'))

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
        { path: 'dashboard',       element: <S><DashboardPage /></S>       },
        { path: 'approvals',       element: <S><ApprovalDeskPage /></S>    },
        { path: 'purchase-orders', element: <S><PurchaseOrdersPage /></S>  },
        { path: 'grn',             element: <S><GRNPage /></S>             },
        { path: 'workflow',        element: <S><WorkflowHubPage /></S>     },
        { path: 'vendors',         element: <S><VendorListPage /></S>      },
        { path: 'vendors/new',     element: <S><VendorFormPage mode="create" /></S> },
        { path: 'vendors/:id',     element: <S><VendorDetailPage /></S>    },
        { path: 'vendors/:id/edit', element: <S><VendorFormPage mode="edit" /></S> },
        { path: 'invoices', children: [
          { index: true,        element: <S><InvoiceListPage /></S>      },
          { path: 'new',        element: <S><InvoiceFormPage /></S>      },
          { path: 'review',     element: <S><InvoiceReviewQueuePage /></S> },
          { path: ':id',        element: <S><InvoiceDetailPage /></S>   },
          { path: ':id/edit',   element: <S><InvoiceFormPage /></S>      },
          { path: ':id/legacy', element: <S><InvoiceNewPage /></S>       },
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
          { path: 'currencies',         element: <S><CurrencyMasterPage /></S>                  },
          { path: 'fx-rates',          element: <S><FxRateMasterPage /></S>                     },
          { path: 'vendor-categories', element: <S><VendorCategoryPage /></S>                  },
          { path: 'vendor-groups',     element: <S><VendorGroupPage /></S>                     },
          { path: 'profit-centres',    element: <S><ProfitCentrePage /></S>                    },
          { path: 'tds-sections',      element: <S><TdsSectionsPage /></S>                     },
          { path: 'items',                        element: <S><ItemMasterPage /></S>                    },
          { path: 'items/new',                    element: <S><ItemFormPage /></S>                      },
          { path: 'items/:id',                    element: <S><ItemFormPage /></S>                      },
          { path: 'item-categories',              element: <S><ItemCategoryPage /></S>                  },
          { path: 'workflow-definitions',         element: <S><WorkflowDefinitionsPage /></S>           },
          { path: 'workflow-definitions/new',     element: <S><WorkflowDefinitionFormPage /></S>        },
          { path: 'workflow-definitions/:id',     element: <S><WorkflowDefinitionFormPage /></S>        },
        ]},
        { path: 'admin', children: [
          { path: 'tenants', element: <S><AdminTenantsPage /></S> },
        ]},
      ],
    }],
  },
  { path: '*', element: <S><NotFoundPage /></S> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
