import { useQuery } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { STALE_TIMES } from '../../lib/query-client'

// Wire types kept loose with `unknown[]` for nested collections — the
// 360 page is the only consumer and it narrows per-section at the
// render site. Sticking to a single big interface keeps the hook
// surface minimal.
export interface Vendor360Response {
  profile: {
    id:               string
    vendorCode:       string | null
    legalName:        string
    tradeName:        string | null
    countryCode:      string
    vendorType:       string
    industryCategory: string | null
    website:          string | null
    currency:         string
    annualRevenue:    number | null
    employeeCount:    number | null
    riskScore:        number | null
    riskTier:         string | null
    lastRiskScoredAt: string | null
    status:           string
    isErpSynced:      boolean
  }
  contacts:          unknown[]
  addresses:         unknown[]
  bankAccounts:      unknown[]
  complianceRecords: unknown[]
  documents:         unknown[]
  screenings:        unknown[]
  changeRequests:    unknown[]
  riskHistory:       Array<{ scoredAt: string; riskScore: number; riskTier: string }>
  onboardingRequest: {
    id: string; requestCode: string; status: string; initiationType: string;
    invitedAt: string | null; submittedAt: string | null; approvedAt: string | null;
  } | null
  workflow: {
    id: string; status: string; currentLevel: number; totalLevels: number;
    steps: Array<{ id: string; level: number; stepName: string; approverRole: string; status: string; decision: string | null; comments: string | null }>;
  } | null
  recentInvoices: Array<{
    id: string; invoiceNumber: string; invoiceDate: string;
    totalAmount: unknown; status: string; paymentStatus: string; currencyCode: string;
  }>
  totalSpend: number
}

export function useVendor360(vendorId: string | null | undefined) {
  return useQuery({
    queryKey:  ['vendor-portal', 'vendor360', vendorId ?? ''],
    queryFn:   () => http.get<Vendor360Response>(`/api/vendor-portal/vendors/${vendorId}/360`),
    enabled:   !!vendorId,
    staleTime: STALE_TIMES.DETAIL,
  })
}
