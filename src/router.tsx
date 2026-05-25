import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RouteErrorPage } from './components/ErrorBoundary'
import { useAuthStore } from './stores/auth.store'

const LoginPage          = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'))
const AnalyticsPage      = lazy(() => import('./pages/analytics/AnalyticsPage'))
const InvoiceListPage         = lazy(() => import('./pages/invoices/InvoiceListPage'))
const InvoiceFormPage         = lazy(() => import('./pages/invoices/InvoiceFormPage'))
const PaymentQueuePage        = lazy(() => import('./pages/payments/PaymentQueuePage'))
const PaymentBatchListPage    = lazy(() => import('./pages/payments/PaymentBatchListPage'))
const PaymentBatchDetailPage  = lazy(() => import('./pages/payments/PaymentBatchDetailPage'))
const CreatePaymentBatch      = lazy(() => import('./pages/payments/CreatePaymentBatch'))
const TdsChallanPage          = lazy(() => import('./pages/payments/TdsChallanPage'))
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
const EmployeeFormPage   = lazy(() => import('./pages/masters/EmployeeFormPage'))
const UserListPage       = lazy(() => import('./pages/masters/users/UserListPage'))
const UserFormPage       = lazy(() => import('./pages/masters/users/UserFormPage'))
const RolePrivilegePage  = lazy(() => import('./pages/masters/roles/RolePrivilegePage'))
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
const BudgetListPage                = lazy(() => import('./pages/masters/budget/BudgetListPage'))
const BudgetFormPage                = lazy(() => import('./pages/masters/budget/BudgetFormPage'))
const BudgetDetailPage              = lazy(() => import('./pages/masters/budget/BudgetDetailPage'))
const ApprovalDeskPage              = lazy(() => import('./pages/approvals/ApprovalDeskPage'))
const IntakePage                    = lazy(() => import('./pages/intake/IntakePage'))
const PurchaseOrdersPage            = lazy(() => import('./pages/purchase-orders/PurchaseOrdersPage'))
const PRFormPage                    = lazy(() => import('./pages/purchase-orders/PRFormPage'))
const POFormPage                    = lazy(() => import('./pages/purchase-orders/POFormPage'))
const GRNPage                       = lazy(() => import('./pages/grn/GRNPage'))
const GRNFormPage                   = lazy(() => import('./pages/grn/GRNFormPage'))
const AdminTenantsPage              = lazy(() => import('./pages/admin/AdminTenantsPage'))
const AccountingPage                = lazy(() => import('./pages/accounting/AccountingPage'))
const AmortizationDetailPage        = lazy(() => import('./pages/accounting/AmortizationDetailPage'))
const ProvisionsPage                = lazy(() => import('./pages/accounting/provisions/ProvisionsPage'))
const NotFoundPage           = lazy(() => import('./pages/NotFoundPage'))

// Vendor Portal — Governance & Onboarding Module.
// All page files use NAMED exports (`export function FooPage`), so each lazy
// import is wrapped with `.then(m => ({ default: m.FooPage }))` to satisfy
// React.lazy's `{ default: ComponentType }` contract.
const VendorPortalHomePage          = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorPortalHomePage').then(m => ({ default: m.VendorPortalHomePage })))
const VendorRequestsPage            = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorRequestsPage').then(m => ({ default: m.VendorRequestsPage })))
const VendorRequestEditPage         = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorRequestEditPage').then(m => ({ default: m.VendorRequestEditPage })))
const ApprovalWorkspacePage         = lazy(() => import('./modules/vendor-portal/src/app/pages/ApprovalWorkspacePage').then(m => ({ default: m.ApprovalWorkspacePage })))
const VendorApprovalPage            = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorApprovalPage').then(m => ({ default: m.VendorApprovalPage })))
const Vendor360ConsolePage          = lazy(() => import('./modules/vendor-portal/src/app/pages/Vendor360ConsolePage').then(m => ({ default: m.Vendor360ConsolePage })))
const VendorProfilePage             = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorProfilePage').then(m => ({ default: m.VendorProfilePage })))
const VendorChangeRequestsPage      = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorChangeRequestsPage').then(m => ({ default: m.VendorChangeRequestsPage })))
const VendorChangeRequestDetailPage = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorChangeRequestDetailPage').then(m => ({ default: m.VendorChangeRequestDetailPage })))
const VendorRiskDashboard           = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorRiskDashboard').then(m => ({ default: m.VendorRiskDashboard })))
const ValidationDashboardPage       = lazy(() => import('./modules/vendor-portal/src/app/pages/ValidationDashboardPage').then(m => ({ default: m.ValidationDashboardPage })))
const ImplementationConsole         = lazy(() => import('./modules/vendor-portal/src/app/pages/ImplementationConsole').then(m => ({ default: m.ImplementationConsole })))
const VendorSuccessPage             = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorSuccessPage').then(m => ({ default: m.VendorSuccessPage })))
const VendorInvitationsPage         = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorInvitationsPage').then(m => ({ default: m.VendorInvitationsPage })))
const VendorPortalUsersPage         = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorPortalUsersPage').then(m => ({ default: m.VendorPortalUsersPage })))
const WorkflowConfigConsole         = lazy(() => import('./modules/vendor-portal/src/app/pages/WorkflowConfigConsole').then(m => ({ default: m.WorkflowConfigConsole })))
const VendorPortalPage              = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorPortalPage').then(m => ({ default: m.VendorPortalPage })))
const VendorPortalRequestDetailPage = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorPortalRequestDetailPage').then(m => ({ default: m.VendorPortalRequestDetailPage })))
const VendorSelfServicePortal       = lazy(() => import('./modules/vendor-portal/src/app/pages/VendorSelfServicePortal').then(m => ({ default: m.VendorSelfServicePortal })))

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
  { path: '/login', element: <S><LoginPage /></S>, errorElement: <RouteErrorPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [{
      element: <AppShell />,
      errorElement: <RouteErrorPage />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard',       element: <S><DashboardPage /></S>       },
        { path: 'analytics',       element: <S><AnalyticsPage /></S>       },
        { path: 'approvals',       element: <S><ApprovalDeskPage /></S>    },
        { path: 'intake',                   element: <S><IntakePage /></S>          },
        { path: 'intake/new',               element: <S><PRFormPage /></S>          },
        { path: 'intake/:id',               element: <S><PRFormPage /></S>          },
        { path: 'purchase-orders',          element: <S><PurchaseOrdersPage /></S> },
        { path: 'purchase-orders/new',      element: <S><POFormPage /></S>          },
        { path: 'purchase-orders/:id',      element: <S><POFormPage /></S>          },
        { path: 'grn',                      element: <S><GRNPage /></S>             },
        { path: 'grn/new',                  element: <S><GRNFormPage /></S>         },
        { path: 'grn/:id',                  element: <S><GRNFormPage /></S>         },
        { path: 'budgets',                  element: <S><BudgetListPage /></S>      },
        { path: 'budgets/new',              element: <S><BudgetFormPage /></S>      },
        { path: 'budgets/:id',              element: <S><BudgetDetailPage /></S>    },
        { path: 'budgets/:id/edit',         element: <S><BudgetFormPage /></S>      },
        { path: 'workflow-engine',          element: <S><WorkflowDefinitionsPage /></S>    },
        { path: 'workflow-engine/new',      element: <S><WorkflowDefinitionFormPage /></S> },
        { path: 'workflow-engine/:id/edit', element: <S><WorkflowDefinitionFormPage /></S> },
        { path: 'vendors',         element: <S><VendorListPage /></S>      },
        { path: 'vendors/new',     element: <S><VendorFormPage mode="create" /></S> },
        { path: 'vendors/:id',     element: <S><VendorDetailPage /></S>    },
        { path: 'vendors/:id/edit', element: <S><VendorFormPage mode="edit" /></S> },
        { path: 'invoices', children: [
          { index: true,        element: <S><InvoiceListPage /></S> },
          // Single A→F form drives create / edit / review. /:id renders read-only
          // when the invoice is in a terminal/post-workflow status; /:id/edit
          // always allows editing. /new with no ?type shows the type-picker modal.
          { path: 'new',        element: <S><InvoiceFormPage /></S> },
          { path: ':id',        element: <S><InvoiceFormPage /></S> },
          { path: ':id/edit',   element: <S><InvoiceFormPage /></S> },
        ]},
        { path: 'payments', children: [
          { index: true,             element: <S><PaymentQueuePage /></S> },
          { path: 'batches',         element: <S><PaymentBatchListPage /></S> },
          { path: 'batches/new',     element: <S><CreatePaymentBatch /></S> },
          { path: 'batches/:id',     element: <S><PaymentBatchDetailPage /></S> },
          { path: 'tds-challans',    element: <S><TdsChallanPage /></S> },
        ]},
        { path: 'accounting', children: [
          { index: true,                element: <S><AccountingPage /></S> },
          { path: 'amortization/:id',   element: <S><AmortizationDetailPage /></S> },
          { path: 'provisions',         element: <S><ProvisionsPage /></S> },
        ]},
        { path: 'masters', children: [
          { index: true,              element: <S><MastersPage /></S>                        },
          { path: 'gl-codes',         element: <S><GlCodesPage /></S>                        },
          { path: 'departments',      element: <S><DepartmentsPage /></S>                    },
          { path: 'cost-centres',     element: <S><CostCentresPage /></S>                    },
          { path: 'tax-codes',         element: <S><TaxCodesPage /></S>                        },
          { path: 'designations',      element: <S><DesignationsPage /></S>                    },
          { path: 'entities',          element: <S><EntitiesPage /></S>                        },
          { path: 'locations',         element: <S><LocationsPage /></S>                       },
          { path: 'employees',         element: <S><EmployeesPage /></S>                       },
          { path: 'employees/new',     element: <S><EmployeeFormPage /></S>                    },
          { path: 'employees/:id',     element: <S><EmployeeFormPage /></S>                    },
          { path: 'users',             element: <S><UserListPage /></S>                        },
          { path: 'users/new',         element: <S><UserFormPage /></S>                        },
          { path: 'users/:id',         element: <S><UserFormPage /></S>                        },
          { path: 'roles',             element: <S><RolePrivilegePage /></S>                   },
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
        ]},
        { path: 'admin', children: [
          { path: 'tenants', element: <S><AdminTenantsPage /></S> },
        ]},
        { path: 'vendor-portal', children: [
          { index: true,                 element: <S><VendorPortalHomePage /></S>              },
          { path: 'requests',            element: <S><VendorRequestsPage /></S>                },
          { path: 'requests/:id',        element: <S><VendorRequestEditPage /></S>             },
          { path: 'approvals',           element: <S><ApprovalWorkspacePage /></S>             },
          { path: 'approvals/:id',       element: <S><VendorApprovalPage /></S>                },
          { path: 'vendors/:id/360',     element: <S><Vendor360ConsolePage /></S>              },
          { path: 'vendors/:id/profile', element: <S><VendorProfilePage /></S>                 },
          { path: 'change-requests',     element: <S><VendorChangeRequestsPage /></S>          },
          { path: 'change-requests/:id', element: <S><VendorChangeRequestDetailPage /></S>     },
          { path: 'risk',                element: <S><VendorRiskDashboard /></S>               },
          { path: 'validation',          element: <S><ValidationDashboardPage /></S>           },
          { path: 'implementation',      element: <S><ImplementationConsole /></S>             },
          { path: 'success',             element: <S><VendorSuccessPage /></S>                 },
          { path: 'invitations',         element: <S><VendorInvitationsPage /></S>             },
          { path: 'users',               element: <S><VendorPortalUsersPage /></S>             },
          { path: 'workflow-config',     element: <S><WorkflowConfigConsole /></S>             },
          { path: 'portal',              element: <S><VendorPortalPage /></S>                  },
          { path: 'portal/:id',          element: <S><VendorPortalRequestDetailPage /></S>     },
        ]},
      ],
    }],
  },
  // Unauthenticated vendor self-service onboarding — entered via a tokenised
  // email link, so it sits OUTSIDE RequireAuth alongside /login.
  { path: '/portal/onboarding/:token', element: <S><VendorSelfServicePortal /></S>, errorElement: <RouteErrorPage /> },
  { path: '*', element: <S><NotFoundPage /></S>, errorElement: <RouteErrorPage /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
