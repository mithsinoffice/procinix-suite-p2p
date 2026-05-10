import { useMemo } from 'react';

interface NarrationValue {
  narration?: string;
  vendorNarration?: string;
  internalRemarks?: string;
}

interface NarrationFieldProps {
  value: NarrationValue;
  onChange: (next: NarrationValue) => void;
  formContext: {
    invoiceNo?: string;
    invoiceDate?: string;
    vendorName?: string;
    vendorGroupName?: string;
    poRef?: string;
  };
}

const TEMPLATES = [
  'Purchase',
  'Works contract',
  'Service',
  'RCM',
  'Import',
  'Advance adjustment',
] as const;

function composeTemplate(
  template: (typeof TEMPLATES)[number],
  context: NarrationFieldProps['formContext']
) {
  const base = `Inv ${context.invoiceNo || '-'} dated ${context.invoiceDate || '-'} for ${context.vendorName || 'Vendor'}`;
  const group = context.vendorGroupName ? ` (${context.vendorGroupName})` : '';
  const po = context.poRef ? ` against PO ${context.poRef}` : '';
  return `${template}: ${base}${group}${po}.`;
}

export function NarrationField({ value, onChange, formContext }: NarrationFieldProps) {
  const templateButtons = useMemo(() => TEMPLATES, []);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
          Narration (JV / voucher)
        </label>
        <div className="flex gap-2 flex-wrap mb-2">
          {templateButtons.map((template) => (
            <button
              key={template}
              type="button"
              className="px-2 py-1 rounded border text-xs"
              style={{ borderColor: 'var(--color-silver)' }}
              onClick={() =>
                onChange({
                  ...value,
                  narration: composeTemplate(template, formContext),
                })
              }
            >
              {template}
            </button>
          ))}
        </div>
        <textarea
          value={value.narration || ''}
          onChange={(event) => onChange({ ...value, narration: event.target.value })}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--color-silver)' }}
        />
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
          Vendor invoice narration
        </label>
        <textarea
          value={value.vendorNarration || ''}
          onChange={(event) => onChange({ ...value, vendorNarration: event.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--color-silver)' }}
        />
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
          Internal remarks
        </label>
        <textarea
          value={value.internalRemarks || ''}
          onChange={(event) => onChange({ ...value, internalRemarks: event.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--color-silver)' }}
        />
      </div>
    </div>
  );
}
