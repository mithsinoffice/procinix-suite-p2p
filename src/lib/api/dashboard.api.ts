import { useQuery } from '@tanstack/react-query'
import { http } from '../http'
import { queryKeys, STALE_TIMES } from '../query-client'

// ── Filter params shared by /kpis and /charts ──────────────────────────────

export interface DashboardFilters {
  entityId?: string
  dateFrom?: string   // ISO YYYY-MM-DD
  dateTo?:   string
}

function toQuery(f: DashboardFilters | undefined): string {
  if (!f) return ''
  const parts: string[] = []
  if (f.entityId) parts.push(`entityId=${encodeURIComponent(f.entityId)}`)
  if (f.dateFrom) parts.push(`dateFrom=${encodeURIComponent(f.dateFrom)}`)
  if (f.dateTo)   parts.push(`dateTo=${encodeURIComponent(f.dateTo)}`)
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

// ── KPI response ───────────────────────────────────────────────────────────

export interface PendingApproval {
  id:            string
  invoiceNumber: string
  netPayable:    number
  totalAmount:   number
  status:        string
  invoiceDate:   string
  dueDate?:      string | null
  createdAt:     string
  vendor:        { legalName: string; vendorCode: string } | null
  daysPending:   number
  approverName:  string | null
  approverLevel: number | null
}

export interface DashboardKpis {
  pendingApprovalsCount: number
  pendingApprovals:      PendingApproval[]
  overdueCount:          number
  overdueAmount:         number
  monthlySpend:          number
  monthlyTds:            number
  quarterTds:            number
  stpRate:               number   // 0–100, one decimal
  stpCount:              number
  avgProcessingDays:     number | null
  totalVendors:          number
  msmeDueIn7Days?:       { count: number; amount: number }
  paymentBatchesPending?: number
  invoicesThisMonth:     number
  invoicesByStatus:      { status: string; count: number }[]
  balance?:              { availableBalance: number; currentBalance: number; currency: string; asOf: string }
  dateRange:             { from: string; to: string }
  generatedAt:           string
}

export interface SpendTrendPoint { month: string; spend: number; tds: number; count: number }
export interface SpendByGl       { glCodeId?: string; glCode: string; name: string; amount: number }

// ── Charts response ────────────────────────────────────────────────────────

export interface DashboardCharts {
  statusLast30:   { status: string; count: number }[]
  laneDonut:      { lane: string; count: number }[]
  topVendors:     { vendorId: string | null; legalName: string; vendorCode: string; amount: number }[]
  matchHistogram: { label: string; min: number; max: number; count: number }[]
  dateRange:      { from: string; to: string }
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useDashboardKpis(filters?: DashboardFilters) {
  const qs = toQuery(filters)
  return useQuery({
    queryKey:  ['dashboard', 'kpis', filters ?? {}],
    queryFn:   () => http.get<DashboardKpis>(`/api/dashboard/kpis${qs}`),
    staleTime: STALE_TIMES.DASHBOARD,
    refetchInterval: 60_000, // auto-refresh every 60s
  })
}

export function useDashboardCharts(filters?: DashboardFilters) {
  const qs = toQuery(filters)
  return useQuery({
    queryKey:  ['dashboard', 'charts', filters ?? {}],
    queryFn:   () => http.get<DashboardCharts>(`/api/dashboard/charts${qs}`),
    staleTime: STALE_TIMES.DASHBOARD,
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
    queryFn:   () => http.get<unknown[]>('/api/dashboard/activity'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
