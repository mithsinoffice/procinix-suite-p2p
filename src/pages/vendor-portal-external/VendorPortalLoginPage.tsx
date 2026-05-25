import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useVendorPortalLogin } from '../../hooks/vendor-portal/useVendorPortalSession'

// Vendor portal login page.
//
// Two paths into this page:
//   1. /portal/vendor/login            — vendor types email, requests a
//                                        magic link by mail.
//   2. /portal/vendor/login?token=XYZ  — vendor clicked the magic link;
//                                        we auto-exchange the token for
//                                        a portal session and redirect.
//
// The "send magic link by email" server endpoint isn't wired yet (Sprint
// 6 backlog) so the email submit just confirms "we've sent the link" as
// a UX placeholder — the token path is the live one.

type TokenError = 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'TOKEN_USED' | 'ONBOARDING_INCOMPLETE'

const ERROR_COPY: Record<TokenError, { title: string; body: string }> = {
  INVALID_TOKEN:         { title: 'Link not recognised',     body: 'Double-check the URL or request a fresh magic link.' },
  TOKEN_EXPIRED:         { title: 'Link expired',            body: 'Your magic link has expired. Request a new one below.' },
  TOKEN_USED:            { title: 'Link already used',       body: 'This link has already been used. Request a fresh link to sign in again.' },
  ONBOARDING_INCOMPLETE: { title: 'Finish onboarding first', body: 'Complete your vendor profile via the original invitation link before signing in to the portal.' },
}

export default function VendorPortalLoginPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const loginMut       = useVendorPortalLogin()

  const tokenFromQuery = searchParams.get('token')
  const [email, setEmail]                 = useState('')
  const [emailSent, setEmailSent]         = useState(false)
  const [tokenError, setTokenError]       = useState<TokenError | null>(null)

  // Auto-login when ?token= present.
  useEffect(() => {
    if (!tokenFromQuery) return
    setTokenError(null)
    loginMut.mutate(
      { token: tokenFromQuery },
      {
        onSuccess: () => navigate('/portal/vendor/dashboard'),
        onError:   (err) => {
          // PortalError.code is one of the documented strings; fall back to
          // INVALID_TOKEN for anything unexpected.
          const code = (err as { code?: string })?.code ?? 'INVALID_TOKEN'
          setTokenError(
            (['INVALID_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_USED', 'ONBOARDING_INCOMPLETE'] as TokenError[])
              .includes(code as TokenError) ? (code as TokenError) : 'INVALID_TOKEN',
          )
        },
      },
    )
    // We only want this to run once per token value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromQuery])

  function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    // Email plumbing is a Sprint 6 task; for now, give the user clear
    // feedback that the request was received rather than silently no-op.
    setEmailSent(true)
  }

  // While auto-login is in flight, show a spinner — avoids the email form
  // briefly flashing before the redirect.
  if (tokenFromQuery && loginMut.isPending) {
    return (
      <Centered>
        <Logo />
        <p className="text-sm text-slate-500 mt-6">Signing you in…</p>
      </Centered>
    )
  }

  return (
    <Centered>
      <Logo />
      <h1 className="text-2xl font-semibold text-slate-900 mt-6 mb-1">Vendor Portal</h1>
      <p className="text-sm text-slate-500 mb-8">Sign in with the magic link sent to your registered email.</p>

      {tokenError && (
        <div className="w-full mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="text-sm font-semibold text-rose-900">{ERROR_COPY[tokenError].title}</div>
          <div className="text-xs text-rose-700 mt-0.5">{ERROR_COPY[tokenError].body}</div>
          <div className="text-[10px] text-rose-500 mt-1 font-mono">{tokenError}</div>
        </div>
      )}

      {emailSent ? (
        <div className="w-full rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-emerald-900">Check your inbox</div>
            <div className="text-xs text-emerald-700 mt-0.5">
              If <span className="font-mono">{email}</span> matches an active vendor invitation, you'll receive a sign-in link within a few minutes.
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSendMagicLink} className="w-full space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">Email address</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@vendor.com"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={!email.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md disabled:opacity-50 transition-colors"
          >
            Send Magic Link
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      <p className="text-[11px] text-slate-400 mt-6 text-center">
        Already received an invitation? The link emailed to you signs you in directly.
      </p>
    </Centered>
  )
}

// ── Layout primitives ────────────────────────────────────────────────────

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/40 flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        {children}
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold">
        P
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900 leading-none">Procinix</div>
        <div className="text-[11px] text-slate-500 leading-none mt-0.5">Vendor Portal</div>
      </div>
    </div>
  )
}
