import { ChevronLeft } from 'lucide-react'
import { type ReactNode } from 'react'
import { cn } from '../../../lib/utils'

export interface DrillDownProps {
  title:     string
  subtitle?: string
  onBack:    () => void
  children:  ReactNode
}

// Reusable drill-down wrapper. Renders breadcrumb + back button +
// fade-in container for the detail view. Used inside every persona tab
// so KPI clicks open a focused detail panel instead of navigating away.
export function DrillDown({ title, subtitle, onBack, children }: DrillDownProps) {
  return (
    <div className="animate-in fade-in duration-150">
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}

// Insight card — left-border accent + tinted background, used in drill-downs
// for "What to do now" recommendations. Five tones for severity / type.
export interface InsightCardProps {
  tone:        'red' | 'amber' | 'green' | 'blue' | 'neutral'
  title:       string
  description: string
  action?:     string
  onAction?:   () => void
}

const TONE_CLASSES: Record<InsightCardProps['tone'], { border: string; bg: string; title: string }> = {
  red:     { border: 'border-l-red-500',    bg: 'bg-red-50/60',    title: 'text-red-800'    },
  amber:   { border: 'border-l-amber-500',  bg: 'bg-amber-50/60',  title: 'text-amber-900'  },
  green:   { border: 'border-l-emerald-500', bg: 'bg-emerald-50/60', title: 'text-emerald-900' },
  blue:    { border: 'border-l-blue-500',   bg: 'bg-blue-50/60',   title: 'text-blue-900'   },
  neutral: { border: 'border-l-muted-foreground', bg: 'bg-muted/40', title: 'text-foreground' },
}

export function InsightCard({ tone, title, description, action, onAction }: InsightCardProps) {
  const c = TONE_CLASSES[tone]
  return (
    <div className={cn('rounded-md border border-border border-l-[3px] p-3', c.border, c.bg)}>
      <div className={cn('text-sm font-medium', c.title)}>{title}</div>
      <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 text-[11px] font-medium text-teal-700 hover:text-teal-800 hover:underline">
          {action} →
        </button>
      )}
    </div>
  )
}
