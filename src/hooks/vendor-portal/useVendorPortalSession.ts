// Vendor portal session hooks — Sprint 4.
//
// Same bypass-the-shared-http reasoning as Sprint 1's useOnboardingPortal:
// the public /api/portal/vendor/session/login endpoint isn't behind buyer
// JWT, and a 401 from it would otherwise trigger the shared http helper's
// /auth/refresh dance which is wrong here. Direct fetch instead.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const SESSION_STORAGE_KEY = 'procinix.vendor-portal.session-token'

export interface VendorPortalSession {
  sessionToken: string
  vendorId:     string
  email:        string
  expiresAt:    string
}

// ── Token storage ────────────────────────────────────────────────────────
// The login response sets an httpOnly cookie (Secure / SameSite=Strict in
// prod) so the browser sends it automatically on subsequent requests. We
// also stash a copy in sessionStorage so client-side hooks can read it
// for the X-Vendor-Token header — useful when the page sits cross-origin
// from the API at any point.

function readToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(SESSION_STORAGE_KEY)
}

function writeToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) window.sessionStorage.setItem(SESSION_STORAGE_KEY, token)
  else       window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
}

async function vendorFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (token) headers['X-Vendor-Token'] = token
  const res = await fetch(path, { ...init, headers, credentials: 'include' })
  if (!res.ok) {
    let body: unknown = null
    try { body = await res.json() } catch { /* not JSON */ }
    const code = (body as { error?: string } | null)?.error ?? 'REQUEST_FAILED'
    throw new VendorPortalError(code, res.status)
  }
  return res.json() as Promise<T>
}

// Export so route handlers / pages can branch on `err.code` without
// instanceof checks against a string-typed class.
export class VendorPortalError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code)
    this.name = 'VendorPortalError'
  }
}
// Re-export the fetch helper so the transactions hook file can reuse it
// without recreating the token-injection logic.
export { vendorFetch }

// ── Hooks ────────────────────────────────────────────────────────────────

/**
 * Probe the current session. Used by the portal pages to gate rendering
 * (redirect to /portal/login when no valid session). We hit a lightweight
 * /recon endpoint — any 200 confirms the session; 401 indicates we need
 * to log in again.
 */
export function useVendorPortalSession() {
  return useQuery({
    queryKey: ['vendor-portal', 'session'],
    queryFn:  async () => {
      const token = readToken()
      if (!token) throw new VendorPortalError('VENDOR_SESSION_INVALID', 401)
      // /recon is cheap and always defined; treats 200 as "session live".
      return vendorFetch<{ totalInvoiced: number }>('/api/portal/vendor/recon')
    },
    retry:     false,
    staleTime: 60_000,
  })
}

export function useVendorPortalLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string }) => {
      const res = await vendorFetch<VendorPortalSession>('/api/portal/vendor/session/login', {
        method: 'POST',
        body:   JSON.stringify(input),
      })
      writeToken(res.sessionToken)
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-portal', 'session'] })
    },
  })
}

export function useVendorPortalLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await vendorFetch<{ success: true }>('/api/portal/vendor/session/logout', { method: 'POST' })
      } finally {
        writeToken(null)
      }
    },
    onSuccess: () => {
      qc.clear() // drop every cached vendor-portal query
    },
  })
}
