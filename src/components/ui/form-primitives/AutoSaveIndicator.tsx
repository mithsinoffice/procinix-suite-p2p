import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function AutoSaveIndicator({
  status,
  className,
}: {
  status: SaveStatus;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {status === 'saving' && (
        <span className="badge-teal">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving...
        </span>
      )}
      {status === 'saved' && (
        <span className="badge-success">
          <CheckCircle className="w-3 h-3" /> Saved
        </span>
      )}
      {status === 'error' && (
        <span className="badge-error">
          <AlertCircle className="w-3 h-3" /> Save failed
        </span>
      )}
      <kbd
        className="text-xs px-1.5 py-0.5 rounded border hidden sm:inline-block"
        style={{
          borderColor: 'var(--color-silver)',
          color: 'var(--color-slate)',
          backgroundColor: 'var(--color-cloud)',
        }}
      >
        {navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl'}+S
      </kbd>
    </div>
  );
}
