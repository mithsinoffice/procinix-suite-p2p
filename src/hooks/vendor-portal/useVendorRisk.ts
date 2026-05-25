import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { STALE_TIMES } from '../../lib/query-client'

// ── Wire types ───────────────────────────────────────────────────────────

export interface RiskDashboardKpis {
  totalVendors:        number
  highRiskCount:       number
  criticalRiskCount:   number
  newAlertsCount:      number
  sanctionsMatchCount: number
  expiringDocsCount:   number
}

export interface RiskTrendPoint {
  month:    string  // "2026-02"
  LOW:      number
  MEDIUM:   number
  HIGH:     number
  CRITICAL: number
}

export interface GeographicRiskRow {
  countryCode:   string
  vendorCount:   number
  avgRiskScore:  number
  riskPercent:   number
}

export interface CategoryRiskRow {
  category:      string
  vendorCount:   number
  avgRiskScore:  number
}

export interface HighRiskVendor {
  id:                string
  vendorCode:        string | null
  legalName:         string
  countryCode:       string
  industryCategory:  string | null
  riskScore:         number | null
  riskTier:          string | null
  status:            string
  primaryRiskFactor: string
}

export interface SanctionsAlert {
  id:                string
  screeningProvider: string
  listName:          string
  matchType:         string | null
  matchScore:        number | null
  screenedAt:        string
  vendor:            { id: string; legalName: string; vendorCode: string | null }
}

export interface ExpiringDocAlert {
  id:             string
  documentType:   string
  documentNumber: string | null
  expiresAt:      string | null
  vendor:         { id: string; legalName: string; vendorCode: string | null }
}

export interface RiskDashboardResponse {
  kpis:             RiskDashboardKpis
  riskDistribution: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number }
  riskTrend:        RiskTrendPoint[]
  geographicRisk:   GeographicRiskRow[]
  categoryRisk:     CategoryRiskRow[]
  highRiskVendors:  HighRiskVendor[]
  recentAlerts: {
    sanctions: SanctionsAlert[]
    expiring:  ExpiringDocAlert[]
  }
}

export interface ScoreVendorResponse {
  riskScore: number
  riskTier:  'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  breakdown: {
    buckets:  { financialRisk: number; geopoliticalRisk: number; complianceRisk: number; operationalRisk: number }
    weights:  { financialRisk: number; geopoliticalRisk: number; complianceRisk: number; operationalRisk: number }
    weighted: { financialRisk: number; geopoliticalRisk: number; complianceRisk: number; operationalRisk: number }
    factors:  Array<{ key: string; label: string; bucket: string; points: number; detail: string }>
    total:    number
    tier:     string
  }
}

// ── Query keys ───────────────────────────────────────────────────────────

const keys = {
  dashboard: () => ['vendor-portal', 'risk', 'dashboard'] as const,
  vendor:    (id: string) => ['vendor-portal', 'risk', 'vendor', id] as const,
}

// ── Hooks ────────────────────────────────────────────────────────────────

export function useRiskDashboard() {
  return useQuery({
    queryKey:  keys.dashboard(),
    queryFn:   () => http.get<RiskDashboardResponse>('/api/vendor-portal/risk/dashboard'),
    // Dashboard data changes only when scoring runs or new alerts land —
    // 60s feels right vs the more aggressive list-page polling.
    staleTime: STALE_TIMES.DASHBOARD,
  })
}

/**
 * Trigger a fresh risk-score calculation for a specific vendor. Server
 * persists the new score on VendorProfile + VendorRiskHistory; the
 * dashboard query is invalidated so the page reflects the new breakdown.
 */
export function useScoreVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vendorId: string) =>
      http.post<ScoreVendorResponse>(`/api/vendor-portal/risk/score/${vendorId}`, {}),
    onSuccess: (_data, vendorId) => {
      qc.invalidateQueries({ queryKey: keys.dashboard() })
      qc.invalidateQueries({ queryKey: keys.vendor(vendorId) })
      // The vendor's row in the requests list also reflects the new
      // score/tier via the join through VendorProfile.
      qc.invalidateQueries({ queryKey: ['vendor-portal', 'requests'] })
    },
  })
}
