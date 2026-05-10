import type { ReactNode } from 'react';
import { cn } from '../utils';

const COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
};

export function FormSection({
  title,
  children,
  columns = 2,
  className,
}: {
  title: string;
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div className={cn('mb-8', className)}>
      <div className="flex items-center gap-2.5 mb-5">
        <span className="px-section-dot" />
        <span className="px-section-label">{title}</span>
        <hr className="flex-1 border-0 h-px" style={{ backgroundColor: 'var(--color-silver)' }} />
      </div>
      <div className={cn('grid gap-x-6 gap-y-5', COLS[columns])}>{children}</div>
    </div>
  );
}
