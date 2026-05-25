import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { STALE_TIMES } from '../../lib/query-client'

// ── Wire types ────────────────────────────────────────────────────────────

export interface InvitationRow {
  id:              string
  requestId:       string
  requestCode:     string
  vendorLegalName: string | null
  vendorEmail:     string
  sentAt:          string
  expiresAt:       string
  status:          string  // PENDING | ACCEPTED | EXPIRED | BOUNCED
  requestStatus:   string  // INVITED | IN_PROGRESS | UNDER_REVIEW | …
  resendCount:     number
}

export interface InvitationListResponse {
  rows:  InvitationRow[]
  total: number
  page:  number
  limit: number
}

export interface InvitationFilters {
  status?: string
  page?:   number
  limit?:  number
}

export interface CreateInvitationInput {
  vendorLegalName?:   string
  vendorEmail:        string
  vendorCountryCode?: string
  vendorType?:        string
  industryCategory?:  string
  estimatedSpend?:    number
}

export interface CreateInvitationResponse {
  invitationId:   string
  requestId:      string
  requestCode:    string
  portalToken:    string
  tokenExpiresAt: string
  vendorEmail:    string
}

// ── Query keys ────────────────────────────────────────────────────────────

const keys = {
  all:  ()                          => ['vendor-portal', 'invitations'] as const,
  list: (f: InvitationFilters)      => ['vendor-portal', 'invitations', 'list', f] as const,
}

// ── Hooks ────────────────────────────────────────────────────────────────

/**
 * List sent invitations with the buyer-side filters. Polls infrequently —
 * invitation rows don't change without an action, so we lean on the
 * invalidation in `useCreateInvitation` to drive freshness.
 */
export function useVendorInvitations(filters: InvitationFilters = {}) {
  return useQuery({
    queryKey:  keys.list(filters),
    queryFn:   () => {
      const qs = new URLSearchParams()
      if (filters.status) qs.set('status', filters.status)
      if (filters.page)   qs.set('page',   String(filters.page))
      if (filters.limit)  qs.set('limit',  String(filters.limit))
      const path = `/api/vendor-portal/invitations${qs.toString() ? `?${qs}` : ''}`
      return http.get<InvitationListResponse>(path)
    },
    staleTime: STALE_TIMES.LIST,
  })
}

/**
 * Create a new invitation. Invalidates every list query so the new row
 * shows up at the top regardless of the active filter set. No optimistic
 * cache write — the server assigns requestCode and portalToken, so we
 * can't synthesise a complete row client-side.
 */
export function useCreateInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      http.post<CreateInvitationResponse>('/api/vendor-portal/invitations', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all() })
    },
  })
}

export interface ResendResponse {
  invitationId:   string
  requestId:      string
  portalToken:    string
  tokenExpiresAt: string
  resendCount:    number
}

/**
 * Resend an existing invitation. Mints a fresh portalToken on the server
 * and creates a new VendorOnboardingInvitation row; the previous one is
 * marked EXPIRED. The endpoint refuses on requests past INVITED so an
 * in-flight vendor session isn't disrupted.
 */
export function useResendInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      http.post<ResendResponse>(`/api/vendor-portal/invitations/${id}/resend`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all() })
    },
  })
}
