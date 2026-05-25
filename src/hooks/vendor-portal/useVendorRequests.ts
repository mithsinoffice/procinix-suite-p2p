import { useQuery } from '@tanstack/react-query'
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

/**
 * Single-request detail. Reads from the same list endpoint via the row
 * shape; the dedicated /requests/:id endpoint will land in Sprint 2 and
 * only the queryFn changes when it does.
 */
export function useVendorRequest(id: string | null) {
  return useQuery({
    queryKey:  keys.detail(id ?? ''),
    queryFn:   () => http.get<RequestRow>(`/api/vendor-portal/requests/${id}`),
    enabled:   !!id,
    staleTime: STALE_TIMES.DETAIL,
  })
}
