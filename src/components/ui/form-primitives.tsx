import type { ReactNode, CSSProperties } from 'react';
import { useMemo } from 'react';
import { ArrowLeft, Save, Send, ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  SaveStatus type                                                    */
/* ------------------------------------------------------------------ */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/* ------------------------------------------------------------------ */
/*  FormShell                                                          */
/*  Wraps an entire transaction form: back button, title, action bar.  */
/* ------------------------------------------------------------------ */
export function FormShell({
  title,
  subtitle,
  variant = 'transaction',
  onBack,
  onCancel,
  onSaveDraft,
  onSubmit,
  submitLabel = 'Submit for Approval',
  draftLabel = 'Save Draft',
  saveStatus = 'idle',
  completeness,
  extraActions,
  masterName,
  modeLabel,
  draftStatus,
  submitDisabled,
  headerExtra,
  children,
}: {
  title: string;
  subtitle?: string;
  variant?: 'transaction' | 'master';
  onBack: () => void;
  onCancel?: () => void;
  onSaveDraft?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  draftLabel?: string;
  saveStatus?: SaveStatus;
  completeness?: number | { filled: number; total: number };
  extraActions?: ReactNode;
  masterName?: string;
  modeLabel?: string;
  draftStatus?: string;
  submitDisabled?: boolean;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  const completenessPercent =
    typeof completeness === 'number'
      ? completeness
      : completeness && completeness.total > 0
      ? Math.round((completeness.filled / completeness.total) * 100)
      : 0;

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 bg-white shadow-sm"
        style={{ borderBottom: '2px solid var(--color-silver)' }}
      >
        <div className="px-8 py-4">
          {/* Breadcrumbs */}
          {masterName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <a href="/masters" style={{ fontSize: 12, color: 'var(--color-teal)', textDecoration: 'none', fontWeight: 500 }}>Masters</a>
              <ChevronRight style={{ width: 12, height: 12, color: 'var(--color-mercury-grey)' }} />
              <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} style={{ fontSize: 12, color: 'var(--color-teal)', textDecoration: 'none', fontWeight: 500 }}>{masterName}</a>
              <ChevronRight style={{ width: 12, height: 12, color: 'var(--color-mercury-grey)' }} />
              <span style={{ fontSize: 12, color: 'var(--color-ink)', fontWeight: 600 }}>{title}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl" style={{ color: 'var(--color-ink)' }}>
                    {title}
                  </h1>
                  {modeLabel && (
                    <span className="badge-teal text-xs">{modeLabel}</span>
                  )}
                  {draftStatus && (
                    <span className="badge-neutral text-xs">{draftStatus}</span>
                  )}
                  {headerExtra}
                </div>
                {subtitle && (
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {completeness !== undefined && (
                <div className="flex items-center gap-2 mr-2">
                  <div
                    className="w-24 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-silver)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(completenessPercent, 100)}%`,
                        backgroundColor:
                          completenessPercent >= 100
                            ? '#16A34A'
                            : completenessPercent >= 50
                            ? '#D97706'
                            : 'var(--color-error)',
                      }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    {Math.round(completenessPercent)}%
                  </span>
                </div>
              )}
              {saveStatus === 'saving' && (
                <span className="text-xs px-2 py-1 rounded" style={{ color: '#D97706', backgroundColor: '#FEF3C7' }}>
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-xs px-2 py-1 rounded" style={{ color: '#16A34A', backgroundColor: '#DCFCE7' }}>
                  Saved
                </span>
              )}
              {extraActions}
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: '#FFFFFF', color: 'var(--color-ink)', border: '1px solid var(--color-silver)' }}
                >
                  Cancel
                </button>
              )}
              {onSaveDraft && (
                <button
                  type="button"
                  onClick={onSaveDraft}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                >
                  <Save className="w-4 h-4" />
                  {draftLabel}
                </button>
              )}
              {onSubmit && (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitDisabled}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: submitDisabled ? 'var(--color-silver)' : 'var(--color-teal)' }}
                >
                  <Send className="w-4 h-4" />
                  {submitLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-8 max-w-7xl mx-auto">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FormSection                                                        */
/*  A white card with a title and a grid of fields.                    */
/* ------------------------------------------------------------------ */
export function FormSection({
  title,
  subtitle,
  columns = 2,
  icon,
  action,
  children,
  className,
  style,
  flat = false,
}: {
  title: string;
  subtitle?: string;
  columns?: 1 | 2 | 3 | 4;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** When true, drops the outer white card styling so the section can sit inside a single parent container. */
  flat?: boolean;
}) {
  const gridClass =
    columns === 1
      ? 'grid grid-cols-1 gap-6'
      : columns === 2
      ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
      : columns === 3
      ? 'grid grid-cols-3 gap-6'
      : 'grid grid-cols-4 gap-6';

  const outerClass = flat
    ? `py-6 ${className ?? ''}`
    : `bg-white rounded-xl border-2 p-6 mb-6 ${className ?? ''}`;
  const outerStyle: CSSProperties = flat
    ? { borderTop: '1px solid var(--color-silver)', ...style }
    : { borderColor: 'var(--color-silver)', ...style };

  return (
    <div className={outerClass} style={outerStyle}>
      {(title || icon || action) && (
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h2 className={flat ? 'text-base' : 'text-xl'} style={{ color: 'var(--color-ink)', fontWeight: flat ? 600 : undefined }}>
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={gridClass}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PxFormField                                                        */
/*  Label + child control wrapper. Adds required asterisk & error.     */
/* ------------------------------------------------------------------ */
export function PxFormField({
  label,
  required,
  error,
  hint,
  filled,
  colSpan,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  filled?: boolean;
  colSpan?: number;
  children: ReactNode;
}) {
  const spanClass = colSpan ? `col-span-${colSpan}` : '';

  return (
    <div className={spanClass}>
      <label
        className="text-sm mb-2 block"
        style={{ color: filled ? 'var(--color-ink)' : 'var(--color-mercury-grey)' }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--color-error-dark)' }}> *</span>
        )}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--color-error-dark)' }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CheckCard                                                          */
/*  A toggle card with title, subtitle, and a checkbox/switch.         */
/* ------------------------------------------------------------------ */
export function CheckCard({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl cursor-pointer"
      style={{
        border: `1px solid ${checked ? 'var(--color-teal)' : 'var(--color-silver)'}`,
        backgroundColor: checked ? 'var(--color-teal-tint, #ECFEFF)' : '#FFFFFF',
      }}
      onClick={() => onChange(!checked)}
    >
      <div>
        <p className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-mercury-grey)' }}>
            {subtitle}
          </p>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5"
        style={{ accentColor: 'var(--color-teal)' }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
