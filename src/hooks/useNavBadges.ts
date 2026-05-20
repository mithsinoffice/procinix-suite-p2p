import { useQuery } from '@tanstack/react-query'
import { http } from '../lib/http'

// Sidebar badge counts. One round-trip per tenant per minute — every other
// alternative (per-item queries) explodes into N parallel calls on each route
// change. The endpoint catches its own errors and returns 0s, so this query
// only fails on transport-level errors (offline, 5xx).
export interface NavBadges {
  pendingApprovals:  number
  pendingInvoices:   number
  unmatchedInvoices: number
  paymentQueueCount: number
  pendingChallans:   number
  msmeAtRisk:        number
  kycGaps:           number
  failedErpSync:     number
  pendingProvisions: number
}

const ZERO: NavBadges = {
  pendingApprovals:  0,
  pendingInvoices:   0,
  unmatchedInvoices: 0,
  paymentQueueCount: 0,
  pendingChallans:   0,
  msmeAtRisk:        0,
  kycGaps:           0,
  failedErpSync:     0,
  pendingProvisions: 0,
}

export function useNavBadges() {
  const query = useQuery<NavBadges>({
    queryKey: ['nav', 'badges'],
    queryFn:  () => http.get<NavBadges>('/api/nav/badges'),
    staleTime: 60_000,       // 1 minute — keeps the badge fresh enough without thrashing
    refetchInterval: 60_000, // poll quietly while the tab is open
    refetchOnWindowFocus: true,
  })
  return { badges: query.data ?? ZERO, isLoading: query.isLoading }
}
