import { useMutation, useQuery } from '@tanstack/react-query'

// ── Wire types ────────────────────────────────────────────────────────────

export type OnboardingTokenError = 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'TOKEN_USED'

export interface OnboardingPortalContext {
  request: {
    requestCode:       string
    vendorLegalName:   string | null
    vendorEmail:       string
    vendorCountryCode: string | null
    vendorType:        string | null
  }
  countryConfig: {
    countryName:         string
    requiredDocuments:   unknown
    taxIdLabel:          string
    taxIdFormat:         string | null
    bankFieldsRequired:  unknown
    sanctionListsToCheck: unknown
  } | null
  appliedRiskWeights: unknown
}

export interface SubmitOnboardingPayload {
  profile: {
    legalName:          string
    tradeName?:         string
    registrationNumber?: string
    incorporationDate?: string | null
    countryCode:        string
    vendorType:         string
    industryCategory?:  string
    website?:           string
    currency?:          string
    annualRevenue?:     number
    employeeCount?:     number
    dunsNumber?:        string
  }
  contacts:          unknown[]
  addresses:         unknown[]
  bankAccounts:      unknown[]
  complianceRecords: unknown[]
}

export interface SubmitOnboardingResponse {
  requestCode:     string
  vendorProfileId: string
  workflowId:      string
  message:         string
}

// ── Why this hook bypasses src/lib/http ───────────────────────────────────
// The shared `http` helper auto-retries 401 via `/auth/refresh`, which is
// the right behaviour for buyer routes but masks the real `INVALID_TOKEN |
// TOKEN_EXPIRED | TOKEN_USED` payload coming back from the public portal
// endpoints. The self-service page needs to render distinct copy for each
// token-error variant, so we call fetch directly here and surface the
// server's error code unchanged.

async function fetchPortal<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) {
    // Try to surface the structured error body; fall back to a generic
    // "INVALID_TOKEN" if the response wasn't JSON-shaped.
    let body: unknown = null
    try { body = await res.json() } catch { /* not JSON — ignore */ }
    const code = (body as { error?: string } | null)?.error ?? 'INVALID_TOKEN'
    throw new PortalError(code as OnboardingTokenError, res.status)
  }
  return res.json() as Promise<T>
}

export class PortalError extends Error {
  constructor(public readonly code: OnboardingTokenError | string, public readonly status: number) {
    super(code)
    this.name = 'PortalError'
  }
}

// ── Hooks ────────────────────────────────────────────────────────────────

/**
 * Fetch the onboarding portal context for a token. Used by the
 * self-service page to render the form (or the appropriate error state).
 * No auth required.
 */
export function useOnboardingToken(token: string | null) {
  return useQuery({
    queryKey: ['vendor-portal', 'public', 'onboarding', token ?? ''],
    queryFn:  () => fetchPortal<OnboardingPortalContext>(`/api/portal/onboarding/${token}`),
    enabled:  !!token,
    // Don't retry on token errors — they won't recover by themselves.
    retry:    false,
  })
}

/**
 * Submit the completed onboarding payload. On success the token is burned
 * server-side, so callers should redirect to a confirmation page rather
 * than re-rendering the form.
 */
export function useSubmitOnboarding(token: string | null) {
  return useMutation({
    mutationFn: (payload: SubmitOnboardingPayload) =>
      fetchPortal<SubmitOnboardingResponse>(`/api/portal/onboarding/${token}/submit`, {
        method: 'POST',
        body:   JSON.stringify(payload),
      }),
  })
}
