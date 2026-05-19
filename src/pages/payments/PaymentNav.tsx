import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'

// Sub-nav rendered under MasterPageHeader on every Payments page. Three top-
// level surfaces: queue (work to do today), batches (history + drill-down),
// TDS challans (compliance). Each page's own status/category tabs live
// below this strip.

const LINKS = [
  { to: '/payments',              label: 'Queue',         end: true },
  { to: '/payments/batches',      label: 'Batches',       end: false },
  { to: '/payments/tds-challans', label: 'TDS Challans',  end: false },
]

export function PaymentNav() {
  return (
    <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-4 sm:px-6">
      {LINKS.map(l => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) => cn(
            'px-3 py-2 text-xs font-medium transition-colors border-b-2',
            isActive
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {l.label}
        </NavLink>
      ))}
    </div>
  )
}
