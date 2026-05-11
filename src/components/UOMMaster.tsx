import { Ruler } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

/**
 * Migrated from bespoke 689-line drawer (2026-05-11). Entity mapping +
 * approval workflow preserved via V2 flags. UOM uses the universal
 * `recordCode` / `recordName` shape so no codeKey/nameKey overrides.
 */
const config: MasterV2Config = {
  title: 'UOM Master',
  subtitle: 'Units of measurement used across items, POs, invoices.',
  icon: Ruler,
  masterKey: 'uom_master',
  entityScoped: true,
  requiresApproval: true,
  columns: [{ key: 'description', label: 'Description' }],
  formSections: [
    {
      id: 'details',
      title: 'Details',
      stripe: 'blue',
      fields: [
        {
          key: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'e.g. "Kilograms" or "Pieces"',
        },
      ],
    },
  ],
};

export function UOMMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
