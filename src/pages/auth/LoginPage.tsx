import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react'
import { useLogin } from '../../lib/api/auth.api'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../lib/utils'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

const features = [
  { icon: '⚡', label: 'Touchless AP — 98% match score' },
  { icon: '🔍', label: 'Gemini OCR invoice ingestion' },
  { icon: '🛡️', label: 'Vendor KYC — PAN, GST, Bank' },
  { icon: '🔄', label: 'Dynamic workflow engine' },
  { icon: '📊', label: 'Real-time AP dashboard' },
  { icon: '🏦', label: 'Transbnk payment integration' },
]

export default function LoginPage() {
  const navigate        = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const login           = useLogin()
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormValues) {
    try {
      await login.mutateAsync(data)
      navigate('/dashboard', { replace: true })
    } catch {
      // error surfaced via login.isError
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Left panel (hidden on mobile) ──────────────────────────────── */}
      <div
        className="hidden md:flex md:w-2/5 flex-col justify-between px-12 py-14"
        style={{ backgroundColor: '#051A1C' }}
      >
        {/* Logo + tagline */}
        <div className="flex flex-col items-center gap-4">
          <img
            src="/logos/procinix-logo.png"
            alt="Procinix"
            className="h-12 w-auto"
            style={{ mixBlendMode: 'screen' }}
          />
          <p
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: '#00A9B7' }}
          >
            Automation &amp; Beyond
          </p>
        </div>

        {/* Feature list */}
        <ul className="space-y-5">
          {features.map(f => (
            <li key={f.label} className="flex items-center gap-3">
              <span className="text-xl leading-none">{f.icon}</span>
              <span className="text-sm text-white/80">{f.label}</span>
            </li>
          ))}
        </ul>

        {/* Copyright */}
        <p className="text-xs text-center" style={{ color: '#7BBFC2' }}>
          © 2025 Procinix Technologies Pvt Ltd
        </p>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────── */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12"
        style={{ backgroundColor: '#F6F9FC' }}
      >
        {/* Mobile logo (visible only below md) */}
        <div className="mb-8 flex flex-col items-center gap-2 md:hidden">
          <img
            src="/logos/procinix-logo.png"
            alt="Procinix"
            className="h-10 w-auto"
          />
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#00A9B7' }}>
            Automation &amp; Beyond
          </p>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500">Sign in to your Procinix workspace</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* API error banner */}
            {login.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {(login.error as any)?.error?.message ?? 'Invalid email or password'}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@company.com"
                  className={cn(
                    'w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors',
                    'placeholder:text-gray-400',
                    'focus:ring-2 focus:ring-offset-1',
                    errors.email
                      ? 'border-red-400 focus:ring-red-300'
                      : 'border-gray-200 focus:border-[#00A9B7] focus:ring-[#00A9B7]/30'
                  )}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    'w-full rounded-lg border bg-white py-2.5 pl-9 pr-10 text-sm text-gray-900 outline-none transition-colors',
                    'placeholder:text-gray-400',
                    'focus:ring-2 focus:ring-offset-1',
                    errors.password
                      ? 'border-red-400 focus:ring-red-300'
                      : 'border-gray-200 focus:border-[#00A9B7] focus:ring-[#00A9B7]/30'
                  )}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={login.isPending}
              className={cn(
                'w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity',
                'flex items-center justify-center gap-2',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-60',
                'hover:opacity-90'
              )}
              style={{ backgroundColor: '#00A9B7', '--tw-ring-color': '#00A9B7' } as React.CSSProperties}
            >
              {login.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Enterprise P2P · Secured by Procinix
          </p>
        </div>
      </div>
    </div>
  )
}
