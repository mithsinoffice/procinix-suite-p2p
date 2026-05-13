import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useLogin } from '../../lib/api/auth.api'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../lib/utils'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

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
      // error handled by mutation onError in query client
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-xl font-bold text-primary-foreground">P</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Procinix</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* API error */}
          {login.isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {(login.error as any)?.error?.message ?? 'Invalid email or password'}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@company.com"
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors',
                'placeholder:text-muted-foreground',
                'focus:ring-2 focus:ring-ring focus:ring-offset-1',
                errors.email ? 'border-destructive' : 'border-input'
              )}
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(
                  'w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm outline-none transition-colors',
                  'placeholder:text-muted-foreground',
                  'focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  errors.password ? 'border-destructive' : 'border-input'
                )}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={login.isPending}
            className={cn(
              'w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground',
              'transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-60',
              'flex items-center justify-center gap-2'
            )}
          >
            {login.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Procinix S2P · Enterprise Edition
        </p>
      </div>
    </div>
  )
}
