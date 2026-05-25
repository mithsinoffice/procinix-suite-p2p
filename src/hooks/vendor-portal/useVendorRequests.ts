import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { STALE_TIMES } from '../../lib/query-client'

// ── Wire types ────────────────────────────────────────────────────────────

export interface RequestRow {
  id:                string
  requestCode:       string
  vendorLegalName:   string | null
  vendorEmail:       string
  vendorCountryCode: string | null
  vendorType:        string | null
  spendTier:         string | null
  status:            string
  riskMatrixRuleId:  string | null
  invitedAt:         string | null
  submittedAt:       string | null
  erpSyncStatus:     string | null
  profile:           { riskScore: number | null; riskTier: string | null } | null
  workflow:          { status: string; currentLevel: number; totalLevels: number } | null
}

export interface RequestListResponse {
  rows:  RequestRow[]
  total: number
  page:  number
  limit: number
}

export interface RequestFilters {
  status?:       string
  countryCode?:  string
  vendorType?:   string
  riskTier?:     string
  page?:         number
  limit?:        number
}

// ── Query keys ────────────────────────────────────────────────────────────

const keys = {
  all:    ()                     => ['vendor-portal', 'requests'] as const,
  list:   (f: RequestFilters)    => ['vendor-portal', 'requests', 'list', f] as const,
  detail: (id: string)           => ['vendor-portal', 'requests', 'detail', id] as const,
}

// ── Hooks ────────────────────────────────────────────────────────────────

/**
 * List onboarding requests for the desk view. Use LIST staleness — once a
 * request transitions (submitted, approved, ERP-synced), the row's status
 * changes and the user needs to see it reflected reasonably quickly.
 */
export function useVendorRequests(filters: RequestFilters = {}) {
  return useQuery({
    queryKey:  keys.list(filters),
    queryFn:   () => {
      const qs = new URLSearchParams()
      if (filters.status)      qs.set('status',      filters.status)
      if (filters.countryCode) qs.set('countryCode', filters.countryCode)
      if (filters.vendorType)  qs.set('vendorType',  filters.vendorType)
      if (filters.riskTier)    qs.set('riskTier',    filters.riskTier)
      if (filters.page)        qs.set('page',        String(filters.page))
      if (filters.limit)       qs.set('limit',       String(filters.limit))
      const path = `/api/vendor-portal/requests${qs.toString() ? `?${qs}` : ''}`
      return http.get<RequestListResponse>(path)
    },
    staleTime: STALE_TIMES.LIST,
  })
}

// ── Detail shape ──────────────────────────────────────────────────────────
// The /requests/:id endpoint returns the full request row + its profile +
// every child collection in a single payload. Typed loosely with `unknown`
// for arrays — the page-level adapter narrows them where it consumes them.
export interface RequestDetail {
  id:                string
  tenantId:          string
  requestCode:       string
  initiationType:    string
  status:            string
  vendorLegalName:   string | null
  vendorEmail:       string
  vendorCountryCode: string | null
  vendorType:        string | null
  industryCategory:  string | null
  estimatedSpend:    string | number | null
  spendTier:         string | null
  invitedAt:         string | null
  submittedAt:       string | null
  approvedAt:        string | null
  rejectedAt:        string | null
  rejectionReason:   string | null
  erpSyncStatus:     string | null
  erpVendorCode:     string | null
  createdAt:         string
  updatedAt:         string
  invitations?:      Array<{
    id: string; sentToEmail: string; sentAt: string; expiresAt: string;
    status: string; resendCount: number
  }>
  profile?: {
    id:         string
    legalName:  string
    tradeName:  string | null
    countryCode: string
    vendorType: string
    industryCategory: string | null
    website:    string | null
    currency:   string
    riskScore:  number | null
    riskTier:   string | null
    status:     string
    contacts:           unknown[]
    addresses:          unknown[]
    bankAccounts:       unknown[]
    complianceRecords:  unknown[]
    documents:          unknown[]
  } | null
  workflow?: {
    id:           string
    status:       string
    currentLevel: number
    totalLevels:  number
    startedAt:    string
    completedAt:  string | null
    slaDeadlineAt: string | null
    steps: Array<{
      id: string; level: number; stepName: string; approverRole: string;
      approverId: string | null; status: string; decision: string | null;
      comments: string | null; decidedAt: string | null; dueAt: string | null;
    }>
  } | null
}

/**
 * Single-request detail. Hits the Sprint-2 /requests/:id endpoint which
 * deep-includes profile + workflow + steps in one round-trip.
 */
export function useVendorRequest(id: string | null | undefined) {
  return useQuery({
    queryKey:  keys.detail(id ?? ''),
    queryFn:   () => http.get<RequestDetail>(`/api/vendor-portal/requests/${id}`),
    enabled:   !!id,
    staleTime: STALE_TIMES.DETAIL,
  })
}

// ── Workflow action mutations ─────────────────────────────────────────────

export interface ApproveResponse {
  ok:       true
  workflow: { id: string; status: string; currentLevel: number; totalLevels: number }
  request:  { id: string; status: string }
  finalized: boolean
}

export interface RejectResponse {
  ok:       true
  workflow: { id: string; status: string }
  request:  { id: string; status: string; rejectionReason: string | null }
}

export interface SendBackResponse {
  ok:       true
  workflow: { id: string; status: string; currentLevel: number }
  request:  { id: string; status: string }
}

function invalidateRequest(qc: ReturnType<typeof useQueryClient>, id: string) {
  // Approving / rejecting changes both the row in the list AND the detail
  // payload — invalidate both so the desk and the workspace stay in sync
  // without manual refreshes.
  qc.invalidateQueries({ queryKey: keys.all() })
  qc.invalidateQueries({ queryKey: keys.detail(id) })
}

export function useApproveRequest(id: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { comments?: string }) =>
      http.post<ApproveResponse>(`/api/vendor-portal/requests/${id}/approve`, input),
    onSuccess: () => { if (id) invalidateRequest(qc, id) },
  })
}

export function useRejectRequest(id: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { comments?: string; reason: string }) =>
      http.post<RejectResponse>(`/api/vendor-portal/requests/${id}/reject`, input),
    onSuccess: () => { if (id) invalidateRequest(qc, id) },
  })
}

export function useSendBackRequest(id: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { comments: string }) =>
      http.post<SendBackResponse>(`/api/vendor-portal/requests/${id}/send-back`, input),
    onSuccess: () => { if (id) invalidateRequest(qc, id) },
  })
}
