import { AutoSaveIndicator, type SaveStatus } from './AutoSaveIndicator';

export function FormFooter({
  onCancel,
  onSaveDraft,
  onSubmit,
  submitLabel = 'Submit',
  draftLabel = 'Save Draft',
  cancelLabel = 'Cancel',
  submitDisabled,
  saveStatus,
}: {
  onCancel: () => void;
  onSaveDraft?: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  draftLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  saveStatus?: SaveStatus;
}) {
  return (
    <div
      className="px-8 py-4 flex items-center justify-between"
      style={{ borderTop: '1px solid var(--color-silver)' }}
    >
      <div className="flex items-center gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        {onSaveDraft && (
          <button
            type="button"
            className="btn-secondary"
            style={{
              borderColor: 'var(--color-teal-light)',
              color: 'var(--color-teal-dark)',
            }}
            onClick={onSaveDraft}
          >
            {draftLabel}
          </button>
        )}
        {saveStatus && <AutoSaveIndicator status={saveStatus} />}
      </div>
      <button
        type="button"
        className="btn-primary"
        onClick={onSubmit}
        disabled={submitDisabled}
      >
        {submitLabel}
      </button>
    </div>
  );
}
