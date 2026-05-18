import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'

// ── Route-level error boundary ───────────────────────────────────────────────
// React Router renders this in place of a matched route when a render/loader
// throws. Hooks here are safe because errorElement is mounted inside the
// RouterProvider tree.

export function RouteErrorPage() {
  const error    = useRouteError()
  const navigate = useNavigate()

  const message = isRouteErrorResponse(error)
    ? (error.data?.message ?? error.statusText)
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  const stack = error instanceof Error ? error.stack : JSON.stringify(error, null, 2)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <div className="text-4xl" aria-hidden>⚠️</div>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground max-w-md text-center">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
        >
          ← Go back
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          Dashboard
        </button>
      </div>
      {import.meta.env.DEV && (
        <pre className="mt-4 rounded-lg bg-muted p-4 text-xs text-left max-w-2xl overflow-auto whitespace-pre-wrap">
          {stack}
        </pre>
      )}
    </div>
  )
}

// ── Top-level class boundary ─────────────────────────────────────────────────
// Catches anything the route boundary can't — e.g. errors thrown by providers
// rendered outside RouterProvider. Class component because hooks aren't allowed
// in error boundaries.

interface ErrorBoundaryState { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
          <div className="text-4xl" aria-hidden>⚠️</div>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground max-w-md text-center">{this.state.error.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/dashboard' }}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            Go to Dashboard
          </button>
          {import.meta.env.DEV && this.state.error.stack && (
            <pre className="mt-4 rounded-lg bg-muted p-4 text-xs text-left max-w-2xl overflow-auto whitespace-pre-wrap">
              {this.state.error.stack}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
