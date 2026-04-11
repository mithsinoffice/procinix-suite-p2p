import { Progress } from '../progress';
import { cn } from '../utils';

export function CompletenessBar({
  filledCount,
  totalCount,
  className,
}: {
  filledCount: number;
  totalCount: number;
  className?: string;
}) {
  const pct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Progress value={pct} className="h-2 flex-1" />
      <span
        className="text-xs font-medium whitespace-nowrap"
        style={{ color: 'var(--color-mercury-grey)' }}
      >
        {filledCount}/{totalCount} fields ({pct}%)
      </span>
    </div>
  );
}
