import { Link } from 'react-router-dom'
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-medium">404 — Page not found</h1>
      <Link to="/dashboard" className="text-sm text-primary underline-offset-4 hover:underline">Go to dashboard</Link>
    </div>
  )
}
