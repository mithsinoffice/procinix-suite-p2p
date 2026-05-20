import { cn } from '../../../lib/utils'
import { formatINR } from '../../../lib/utils/formatters'

export interface AgingBar {
  bucket:   string   // '0-30', '31-60', '61-90', '90+'
  count:    number
  amount:   number
  pct:      number   // 0-100
  wcImpact: number
  action:   string
}

export interface AgingBarsProps {
  buckets: AgingBar[]
  onClick?: (bucket: AgingBar) => void
}

// Bucket colours map to age severity. The 90+ bucket reads red because any
// invoice that has aged past 90 days past due is a write-off-review risk.
const BUCKET_TONE: Record<string, string> = {
  '0-30':   'bg-emerald-500',
  '31-60':  'bg-amber-500',
  '61-90':  'bg-orange-500',
  '90+':    'bg-red-500',
}

export function AgingBars({ buckets, onClick }: AgingBarsProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {buckets.map(b => (
        <button
          key={b.bucket}
          type="button"
          onClick={() => onClick?.(b)}
          className={cn(
            'group rounded-lg border border-border bg-card p-3 text-left transition-all',
            onClick && 'hover:border-teal-500 cursor-pointer',
          )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">{b.bucket} days</span>
            <span className={cn('inline-block h-2 w-2 rounded-full', BUCKET_TONE[b.bucket] ?? 'bg-muted')} />
          </div>
          <div className="text-lg font-semibold tabular-nums">{b.count}</div>
          <div className="text-[11px] text-muted-foreground tabular-nums">{formatINR(b.amount)}</div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
            <div className={cn('h-full rounded-full', BUCKET_TONE[b.bucket] ?? 'bg-muted-foreground')} style={{ width: `${Math.min(100, b.pct)}%` }} />
          </div>
          <div className="mt-1.5 text-[10px] text-muted-foreground">{b.action}</div>
        </button>
      ))}
    </div>
  )
}
