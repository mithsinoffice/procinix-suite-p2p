import type { ReactNode } from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '../utils';

export function PxFormField({
  label,
  required,
  hint,
  error,
  filled,
  children,
  className,
  colSpan,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  filled?: boolean;
  children: ReactNode;
  className?: string;
  colSpan?: 1 | 2;
}) {
  return (
    <div className={cn('space-y-1.5', colSpan === 2 && 'md:col-span-2', className)}>
      <div className="flex items-center gap-1.5">
        <label className="px-label" style={{ marginBottom: 0 }}>
          {label}
          {required && <span className="px-required" />}
        </label>
        {required && filled && (
          <CheckCircle
            className="w-3.5 h-3.5 flex-shrink-0"
            style={{ color: 'var(--color-success)' }}
          />
        )}
      </div>
      {children}
      {hint && !error && (
        <p className="text-xs" style={{ color: 'var(--color-slate)' }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
