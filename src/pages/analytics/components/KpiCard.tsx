import { ArrowUpRight, ArrowDownRight, MoveRight } from 'lucide-react'
import { cn } from '../../../lib/utils'

// Enterprise-style KPI card. Optional drill-down arrow renders top-right.
// Delta colour reflects whether the change is good for the business — so for
// "DPO" or "Maverick %" the caller should pass deltaTone='inverse' so a
// drop renders green (improvement) and a rise renders red (deterioration).
export interface KpiCardProps {
  label:       string
  value:       string
  subtitle?:   string
  delta?:      string                              // e.g. "+12%"
  deltaTone?:  'normal' | 'inverse'                // inverse: lower-is-better
  deltaDir?:   'up' | 'down' | 'flat'
  tone?:       'default' | 'red' | 'amber' | 'green' | 'teal' | 'blue'
  onClick?:    () => void
  className?:  string
}

export function KpiCard({
  label, value, subtitle, delta, deltaDir = 'flat', deltaTone = 'normal', tone = 'default', onClick, className,
}: KpiCardProps) {
  const clickable = !!onClick
  const valueColor = tone === 'red' ? 'text-red-700' :
                     tone === 'amber' ? 'text-amber-700' :
                     tone === 'green' ? 'text-emerald-700' :
                     tone === 'teal'  ? 'text-teal-700' :
                     tone === 'blue'  ? 'text-blue-700'  : 'text-foreground'
  let deltaColor = 'text-muted-foreground'
  if (delta && deltaDir !== 'flat') {
    const improving = deltaTone === 'inverse'
      ? deltaDir === 'down'   // lower is better
      : deltaDir === 'up'
    deltaColor = improving ? 'text-emerald-600' : 'text-red-600'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        'group relative w-full text-left rounded-xl border border-border bg-card p-4 transition-all',
        clickable ? 'hover:border-teal-500 hover:shadow-sm cursor-pointer' : 'cursor-default',
        className,
      )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {clickable && (
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-teal-600 transition-colors" />
        )}
      </div>
      <div className={cn('text-[22px] font-medium tabular-nums leading-tight', valueColor)}>{value}</div>
      {delta && (
        <div className={cn('flex items-center gap-1 mt-1 text-[11px] font-medium', deltaColor)}>
          {deltaDir === 'up'   && <ArrowUpRight   className="h-3 w-3" />}
          {deltaDir === 'down' && <ArrowDownRight className="h-3 w-3" />}
          {deltaDir === 'flat' && <MoveRight       className="h-3 w-3" />}
          <span>{delta}</span>
        </div>
      )}
      {subtitle && <div className="text-[10px] text-muted-foreground mt-1">{subtitle}</div>}
    </button>
  )
}
