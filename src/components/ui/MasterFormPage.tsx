import type { ReactNode } from 'react';
import { ArrowLeft, X } from 'lucide-react';

/** @deprecated Use FormShell from './form-primitives' instead. */
export function MasterFormPage({
  title,
  subtitle,
  modeLabel,
  onBack,
  onCancel,
  onSaveDraft,
  onSubmit,
  submitLabel,
  draftLabel = 'Save Draft',
  /**
   * `flat` = white card header (no gradient), white footer (no #FCFDFE tint), and plain form body (no inner #FBFEFF panel).
   * `default` keeps the premium chrome; use `formBodyVariant` only when `chromeVariant` is `default`.
   */
  chromeVariant = 'default',
  /** Ignored when `chromeVariant` is `flat` (body is always plain). */
  formBodyVariant = 'tinted',
  children,
}: {
  title: string;
  subtitle: string;
  modeLabel: string;
  onBack: () => void;
  onCancel: () => void;
  onSaveDraft?: () => void;
  onSubmit: () => void;
  submitLabel: string;
  draftLabel?: string;
  chromeVariant?: 'default' | 'flat';
  formBodyVariant?: 'tinted' | 'plain';
  children: ReactNode;
}) {
  const isFlatChrome = chromeVariant === 'flat';
  const usePlainBody = isFlatChrome || formBodyVariant === 'plain';

  return (
    <div
      className="p-8 w-full min-w-0 max-w-full box-border"
      style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}
    >
      <div className="mb-8 flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl transition-colors"
          style={{
            color: 'var(--color-mercury-grey)',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-fog)',
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>
              {title}
            </h1>
            <span
              className="px-3 py-1 rounded-full text-xs"
              style={{ backgroundColor: '#ECFEFF', color: '#0F8A95', fontWeight: 700 }}
            >
              {modeLabel}
            </span>
          </div>
          <p style={{ color: 'var(--color-mercury-grey)' }}>{subtitle}</p>
        </div>
      </div>

      <div
        className="rounded-[28px] overflow-hidden bg-white w-full min-w-0"
        style={{
          border: '1px solid var(--color-fog)',
          boxShadow: '0 24px 56px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          className="px-8 py-6 flex items-center justify-between"
          style={{
            borderBottom: '1px solid #E8F0F4',
            ...(isFlatChrome
              ? { backgroundColor: '#FFFFFF' }
              : { background: 'linear-gradient(180deg, #FBFEFF 0%, #F4FAFD 100%)' }),
          }}
        >
          <div>
            <p className="text-sm mb-1" style={{ color: '#0F8A95', fontWeight: 700 }}>
              {modeLabel}
            </p>
            <h2 className="text-2xl" style={{ color: 'var(--color-ink)' }}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl transition-colors"
            style={{
              color: 'var(--color-mercury-grey)',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-fog)',
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 py-8 w-full min-w-0 box-border">
          {usePlainBody ? (
            children
          ) : (
            <div
              className="rounded-[24px] p-6"
              style={{ backgroundColor: '#FBFEFF', border: '1px solid #E8F0F4' }}
            >
              {children}
            </div>
          )}
        </div>

        <div
          className="px-8 py-5 flex items-center justify-end gap-3"
          style={{
            borderTop: '1px solid #E8F0F4',
            backgroundColor: isFlatChrome ? '#FFFFFF' : '#FCFDFE',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl"
            style={{
              border: '1px solid var(--color-fog)',
              color: 'var(--color-mercury-grey)',
              backgroundColor: '#FFFFFF',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          {onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              className="px-5 py-2.5 rounded-xl"
              style={{
                border: '1px solid #BFE8EC',
                color: '#0F8A95',
                backgroundColor: '#ECFEFF',
                fontWeight: 700,
              }}
            >
              {draftLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            className="px-5 py-2.5 rounded-xl text-white"
            style={{
              backgroundColor: 'var(--color-teal)',
              fontWeight: 700,
              boxShadow: '0 12px 24px rgba(0, 169, 183, 0.18)',
            }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
