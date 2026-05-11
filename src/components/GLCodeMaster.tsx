import { BookOpen } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

/**
 * Migrated from bespoke 588-line drawer (2026-05-11). Entity mapping +
 * approval workflow preserved via V2 flags. `glType` rendered as a select
 * with the original 9-value option set.
 */
const GL_TYPE_OPTIONS = [
  'expense',
  'asset',
  'liability',
  'revenue',
  'cogs',
  'tax',
  'stock',
  'bank',
  'other',
];

const config: MasterV2Config = {
  title: 'GL Code Master',
  subtitle: 'General-ledger accounts referenced by invoices, journals, and cost centres.',
  icon: BookOpen,
  masterKey: 'gl_code_master',
  codeKey: 'glCode',
  nameKey: 'glDescription',
  entityScoped: true,
  requiresApproval: true,
  columns: [{ key: 'glType', label: 'Type' }],
  formSections: [
    {
      id: 'classification',
      title: 'Classification',
      subtitle: 'GL type drives downstream reporting buckets — P&L vs balance-sheet.',
      stripe: 'blue',
      fields: [
        {
          key: 'glType',
          label: 'GL Type',
          type: 'select',
          options: GL_TYPE_OPTIONS,
          required: true,
        },
      ],
    },
  ],
};

export function GLCodeMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
