import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'

const LoginPage          = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'))
const InvoiceListPage    = lazy(() => import('./pages/invoices/InvoiceListPage'))
const InvoiceDetailPage  = lazy(() => import('./pages/invoices/InvoiceDetailPage'))
const InvoiceNewPage     = lazy(() => import('./pages/invoices/InvoiceNewPage'))
const PaymentListPage    = lazy(() => import('./pages/payments/PaymentListPage'))
const PaymentDetailPage  = lazy(() => import('./pages/payments/PaymentDetailPage'))
const VendorListPage     = lazy(() => import('./pages/masters/vendors/VendorListPage'))
const VendorDetailPage   = lazy(() => import('./pages/masters/vendors/VendorDetailPage'))
const VendorFormPage     = lazy(() => import('./pages/masters/vendors/VendorFormPage'))
const MastersPage        = lazy(() => import('./pages/masters/MastersPage'))
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
      // AppShell will be imported here once built
      element: <Outlet />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard', element: <S><DashboardPage /></S> },
        { path: 'invoices', children: [
          { index: true,  element: <S><InvoiceListPage /></S> },
          { path: 'new',  element: <S><InvoiceNewPage /></S> },
          { path: ':id',  element: <S><InvoiceDetailPage /></S> },
        ]},
        { path: 'payments', children: [
          { index: true, element: <S><PaymentListPage /></S> },
          { path: ':id', element: <S><PaymentDetailPage /></S> },
        ]},
        { path: 'masters', children: [
          { index: true, element: <S><MastersPage /></S> },
          { path: 'vendors', children: [
            { index: true,        element: <S><VendorListPage /></S> },
            { path: 'new',        element: <S><VendorFormPage mode="create" /></S> },
            { path: ':id',        element: <S><VendorDetailPage /></S> },
            { path: ':id/edit',   element: <S><VendorFormPage mode="edit" /></S> },
          ]},
        ]},
      ],
    }],
  },
  { path: '*', element: <S><NotFoundPage /></S> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
