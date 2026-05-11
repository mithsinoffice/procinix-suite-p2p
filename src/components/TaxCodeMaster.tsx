import { Percent } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

/**
 * Migrated from bespoke 700-line drawer (2026-05-11). Entity mapping +
 * approval workflow preserved via V2 flags.
 */
const config: MasterV2Config = {
  title: 'Tax Code Master',
  subtitle: 'GST / TDS / cess tax codes — referenced on invoices and POs.',
  icon: Percent,
  masterKey: 'tax_code_master',
  codeKey: 'taxCode',
  nameKey: 'description',
  entityScoped: true,
  requiresApproval: true,
  columns: [
    {
      key: 'taxRate',
      label: 'Rate (%)',
      format: (v) => (v == null || v === '' ? '—' : `${Number(v).toFixed(2)}%`),
    },
  ],
  formSections: [
    {
      id: 'rate',
      title: 'Rate',
      subtitle: 'Effective rate applied when this tax code is selected.',
      stripe: 'blue',
      fields: [
        {
          key: 'taxRate',
          label: 'Tax Rate (%)',
          type: 'number',
          required: true,
          placeholder: 'e.g. 18',
        },
      ],
    },
  ],
};

export function TaxCodeMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
