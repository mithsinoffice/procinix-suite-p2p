import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { STALE_TIMES } from '../../lib/query-client'

// ── Wire types ───────────────────────────────────────────────────────────

export interface ChangeRequestRow {
  id:              string
  requestCode:     string
  vendorId:        string
  changeType:      string
  priority:        string
  status:          string
  approvalStatus:  string | null
  requestedByType: string
  requestedAt:     string
  vendor:          { id: string; legalName: string; vendorCode: string | null }
}

export interface ChangeRequestListResponse {
  rows:  ChangeRequestRow[]
  total: number
  page:  number
  limit: number
}

export interface ChangeRequestFilters {
  status?:     string
  changeType?: string
  vendorId?:   string
  page?:       number
  limit?:      number
}

export interface ChangeRequestDetail {
  id:               string
  requestCode:      string
  vendorId:         string
  changeType:       string
  priority:         string
  status:           string
  approvalStatus:   string | null
  requestedByType:  string
  requestedById:    string
  beforeSnapshot:   unknown
  afterSnapshot:    unknown
  comments:         string | null
  requestedAt:      string
  approvedAt:       string | null
  approvedByUserId: string | null
  rejectedAt:       string | null
  rejectionReason:  string | null
  vendor: {
    id:               string
    vendorCode:       string | null
    legalName:        string
    tradeName:        string | null
    countryCode:      string
    vendorType:       string
    riskScore:        number | null
    riskTier:         string | null
    status:           string
  }
}

export interface CreateChangeRequestInput {
  vendorId:        string
  changeType:      string
  beforeSnapshot:  unknown
  afterSnapshot:   unknown
  comments?:       string
  priority?:       'LOW' | 'MEDIUM' | 'HIGH'
  requestedByType?: 'BUYER' | 'VENDOR'
}

// ── Query keys ───────────────────────────────────────────────────────────

const keys = {
  all:    ()                          => ['vendor-portal', 'change-requests'] as const,
  list:   (f: ChangeRequestFilters)   => ['vendor-portal', 'change-requests', 'list', f] as const,
  detail: (id: string)                => ['vendor-portal', 'change-requests', 'detail', id] as const,
}

// ── Hooks ────────────────────────────────────────────────────────────────

export function useVendorChangeRequests(filters: ChangeRequestFilters = {}) {
  return useQuery({
    queryKey:  keys.list(filters),
    queryFn:   () => {
      const qs = new URLSearchParams()
      if (filters.status)     qs.set('status',     filters.status)
      if (filters.changeType) qs.set('changeType', filters.changeType)
      if (filters.vendorId)   qs.set('vendorId',   filters.vendorId)
      if (filters.page)       qs.set('page',       String(filters.page))
      if (filters.limit)      qs.set('limit',      String(filters.limit))
      const path = `/api/vendor-portal/change-requests${qs.toString() ? `?${qs}` : ''}`
      return http.get<ChangeRequestListResponse>(path)
    },
    staleTime: STALE_TIMES.LIST,
  })
}

export function useVendorChangeRequest(id: string | null | undefined) {
  return useQuery({
    queryKey:  keys.detail(id ?? ''),
    queryFn:   () => http.get<ChangeRequestDetail>(`/api/vendor-portal/change-requests/${id}`),
    enabled:   !!id,
    staleTime: STALE_TIMES.DETAIL,
  })
}

function invalidate(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: keys.all() })
  if (id) qc.invalidateQueries({ queryKey: keys.detail(id) })
  // The universal approval desk surfaces VENDOR_CHANGE rows — invalidate
  // so its chip count updates too.
  qc.invalidateQueries({ queryKey: ['approval-desk'] })
}

export function useCreateChangeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateChangeRequestInput) =>
      http.post<ChangeRequestDetail>('/api/vendor-portal/change-requests', input),
    onSuccess: (data) => invalidate(qc, data.id),
  })
}

export function useApproveChangeRequest(id: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { comments?: string }) =>
      http.post<ChangeRequestDetail>(`/api/vendor-portal/change-requests/${id}/approve`, input),
    onSuccess: () => { if (id) invalidate(qc, id) },
  })
}

export function useRejectChangeRequest(id: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { comments?: string; reason: string }) =>
      http.post<ChangeRequestDetail>(`/api/vendor-portal/change-requests/${id}/reject`, input),
    onSuccess: () => { if (id) invalidate(qc, id) },
  })
}
