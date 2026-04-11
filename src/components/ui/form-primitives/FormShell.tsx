import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DraftStatusPill } from './DraftStatusPill';
import { CompletenessBar } from './CompletenessBar';
import { FormFooter } from './FormFooter';
import type { SaveStatus } from './AutoSaveIndicator';

export function FormShell({
  title,
  subtitle,
  modeLabel,
  variant = 'master',
  draftStatus,
  completeness,
  onBack,
  onCancel,
  onSaveDraft,
  onSubmit,
  submitLabel = 'Submit',
  draftLabel = 'Save Draft',
  submitDisabled,
  saveStatus,
  children,
}: {
  title: string;
  subtitle: string;
  modeLabel: string;
  variant?: 'master' | 'transaction';
  draftStatus?: string;
  completeness?: { filled: number; total: number };
  onBack: () => void;
  onCancel: () => void;
  onSaveDraft?: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  draftLabel?: string;
  submitDisabled?: boolean;
  saveStatus?: SaveStatus;
  children: ReactNode;
}) {
  const isMaster = variant === 'master';

  return (
    <div
      className="w-full min-w-0 max-w-full box-border min-h-screen"
      style={{ backgroundColor: isMaster ? 'var(--color-cloud)' : undefined }}
    >
      {/* Header */}
      <div className={isMaster ? 'px-8 pt-8 pb-4' : 'bg-white px-8 py-6'} style={!isMaster ? { borderBottom: '1px solid var(--color-silver)' } : undefined}>
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg transition-colors"
            style={{
              color: 'var(--color-mercury-grey)',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-silver)',
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-ink)' }}>
                {title}
              </h1>
              <span className="badge-teal text-xs">{modeLabel}</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              {subtitle}
            </p>
          </div>
          {draftStatus && <DraftStatusPill status={draftStatus} />}
        </div>

        {completeness && (
          <CompletenessBar
            filledCount={completeness.filled}
            totalCount={completeness.total}
            className="mt-4 max-w-md"
          />
        )}
      </div>

      {/* Body */}
      {isMaster ? (
        <div className="px-8 pb-8">
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{
              border: '1px solid var(--color-silver)',
              boxShadow: '0 8px 32px rgba(15, 23, 42, 0.06)',
            }}
          >
            <div className="px-8 py-8">{children}</div>
            <FormFooter
              onCancel={onCancel}
              onSaveDraft={onSaveDraft}
              onSubmit={onSubmit}
              submitLabel={submitLabel}
              draftLabel={draftLabel}
              submitDisabled={submitDisabled}
              saveStatus={saveStatus}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="p-8">{children}</div>
          <div
            className="sticky bottom-0 bg-white"
            style={{ boxShadow: '0 -4px 16px rgba(15, 23, 42, 0.06)' }}
          >
            <FormFooter
              onCancel={onCancel}
              onSaveDraft={onSaveDraft}
              onSubmit={onSubmit}
              submitLabel={submitLabel}
              draftLabel={draftLabel}
              submitDisabled={submitDisabled}
              saveStatus={saveStatus}
            />
          </div>
        </>
      )}
    </div>
  );
}
