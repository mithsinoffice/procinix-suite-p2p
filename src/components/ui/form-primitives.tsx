import type { ReactNode, CSSProperties } from 'react';
import { useMemo } from 'react';
import { ArrowLeft, Save, Send } from 'lucide-react';

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
  onSaveDraft,
  onSubmit,
  submitLabel = 'Submit for Approval',
  draftLabel = 'Save Draft',
  saveStatus = 'idle',
  completeness,
  extraActions,
  children,
}: {
  title: string;
  subtitle?: string;
  variant?: 'transaction' | 'master';
  onBack: () => void;
  onSaveDraft?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  draftLabel?: string;
  saveStatus?: SaveStatus;
  completeness?: number;
  extraActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 bg-white shadow-sm"
        style={{ borderBottom: '2px solid var(--color-silver)' }}
      >
        <div className="px-8 py-4">
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
                <h1 className="text-2xl" style={{ color: 'var(--color-ink)' }}>
                  {title}
                </h1>
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
                        width: `${Math.min(completeness, 100)}%`,
                        backgroundColor:
                          completeness >= 100
                            ? '#16A34A'
                            : completeness >= 50
                            ? '#D97706'
                            : 'var(--color-error)',
                      }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    {Math.round(completeness)}%
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
                  className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: 'var(--color-teal)' }}
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
  children,
  className,
  style,
}: {
  title: string;
  subtitle?: string;
  columns?: 1 | 2 | 3 | 4;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const gridClass =
    columns === 1
      ? 'grid grid-cols-1 gap-6'
      : columns === 2
      ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
      : columns === 3
      ? 'grid grid-cols-3 gap-6'
      : 'grid grid-cols-4 gap-6';

  return (
    <div
      className={`bg-white rounded-xl border-2 p-6 mb-6 ${className ?? ''}`}
      style={{ borderColor: 'var(--color-silver)', ...style }}
    >
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-6">
          {icon}
          <div>
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                {subtitle}
              </p>
            )}
          </div>
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
  colSpan,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  colSpan?: number;
  children: ReactNode;
}) {
  const spanClass = colSpan ? `col-span-${colSpan}` : '';

  return (
    <div className={spanClass}>
      <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>
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
