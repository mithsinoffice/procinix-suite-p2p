import { useQuery } from '@tanstack/react-query'
import { http } from '../http'
import { queryKeys, STALE_TIMES } from '../query-client'

export interface PendingApproval {
  id: string; invoiceNumber: string; netPayable: number; status: string
  invoiceDate: string; dueDate?: string; createdAt: string
  vendor: { legalName: string; vendorCode: string }
}

export interface DashboardKpis {
  pendingApprovalsCount: number
  pendingApprovals:      PendingApproval[]
  overdueCount:          number
  overdueAmount:         number
  monthlySpend:          number
  quarterTds:            number
  totalVendors:          number
  invoicesThisMonth:     number
  invoicesByStatus:      { status: string; count: number }[]
  balance?:              { availableBalance: number; currentBalance: number; currency: string; asOf: string }
  generatedAt:           string
}

export interface SpendTrendPoint {
  month: string; spend: number; tds: number; count: number
}

export interface SpendByGl {
  glCodeId?: string; glCode: string; name: string; amount: number
}

export function useDashboardKpis() {
  return useQuery({
    queryKey:  queryKeys.dashboard.kpis(),
    queryFn:   () => http.get<DashboardKpis>('/api/dashboard/kpis'),
    staleTime: STALE_TIMES.DASHBOARD,
    refetchInterval: 60_000, // auto-refresh every 60s
  })
}

export function useSpendTrend() {
  return useQuery({
    queryKey:  queryKeys.dashboard.spendTrend('current'),
    queryFn:   () => http.get<SpendTrendPoint[]>('/api/dashboard/spend-trend'),
    staleTime: STALE_TIMES.DASHBOARD,
  })
}

export function useSpendByGl() {
  return useQuery({
    queryKey:  ['dashboard', 'spend-by-gl'],
    queryFn:   () => http.get<SpendByGl[]>('/api/dashboard/spend-by-gl'),
    staleTime: STALE_TIMES.DASHBOARD,
  })
}

export function useRecentActivity() {
  return useQuery({
    queryKey:  ['dashboard', 'activity'],
    queryFn:   () => http.get<any[]>('/api/dashboard/activity'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
