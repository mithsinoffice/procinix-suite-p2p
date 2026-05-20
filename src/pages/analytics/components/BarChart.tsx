import { cn } from '../../../lib/utils'

export type BarTone = 'teal' | 'amber' | 'red' | 'blue' | 'emerald' | 'muted'

export interface HBarRow {
  label: string
  value: number       // raw numeric value (drives width relative to max)
  display?: string    // override display (e.g. ₹ formatted)
  tone?:   BarTone
}

export interface HBarChartProps {
  rows:       HBarRow[]
  labelWidth?: number       // px width of the label column (default 85)
  onRowClick?: (row: HBarRow, index: number) => void
}

const TONE_BG: Record<BarTone, string> = {
  teal:    'bg-teal-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  muted:   'bg-muted-foreground/40',
}

// Horizontal bar chart — each row is a flex layout: label, track, value.
// Used across persona tabs for compact rankings (top vendors, cycle stages,
// match-score histogram, etc.). Rows are clickable when onRowClick is set.
export function HBarChart({ rows, labelWidth = 85, onRowClick }: HBarChartProps) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => {
        const pct = Math.max(2, Math.round((r.value / max) * 100))
        const tone = r.tone ?? 'teal'
        const clickable = !!onRowClick
        return (
          <button
            key={`${r.label}-${i}`}
            type="button"
            onClick={() => onRowClick?.(r, i)}
            disabled={!clickable}
            className={cn(
              'flex items-center gap-2 w-full text-left',
              clickable ? 'hover:bg-muted/40 rounded-sm cursor-pointer' : 'cursor-default',
            )}>
            <div
              className="flex-shrink-0 text-[11px] text-muted-foreground text-right truncate"
              style={{ width: labelWidth }}
              title={r.label}>
              {r.label}
            </div>
            <div className="flex-1 h-5 rounded-sm bg-muted/40 relative overflow-hidden">
              <div className={cn('h-full transition-all', TONE_BG[tone])} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex-shrink-0 text-[11px] font-medium tabular-nums w-24 text-right">
              {r.display ?? r.value.toLocaleString('en-IN')}
            </div>
          </button>
        )
      })}
    </div>
  )
}
