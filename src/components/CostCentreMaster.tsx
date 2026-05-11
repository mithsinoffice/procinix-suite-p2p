import { Layers } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

/**
 * Migrated from bespoke 876-line drawer (2026-05-11). Entity mapping +
 * approval workflow preserved via V2 flags. `budgetLimit` rendered as
 * currency in both the listing and the form.
 */
const config: MasterV2Config = {
  title: 'Cost Centre Master',
  subtitle: 'Cost centres for departmental budget tracking and reporting.',
  icon: Layers,
  masterKey: 'cost_centre_master',
  codeKey: 'costCentreCode',
  nameKey: 'costCentreName',
  entityScoped: true,
  requiresApproval: true,
  columns: [
    { key: 'department', label: 'Department' },
    { key: 'manager', label: 'Manager' },
    {
      key: 'budgetLimit',
      label: 'Budget Limit (₹)',
      format: (v) => (v == null || v === '' ? '—' : `₹${Number(v).toLocaleString('en-IN')}`),
    },
  ],
  formSections: [
    {
      id: 'ownership',
      title: 'Ownership',
      subtitle: 'Department and manager accountable for this cost centre.',
      stripe: 'blue',
      fields: [
        { key: 'department', label: 'Department', required: true },
        { key: 'manager', label: 'Manager' },
      ],
    },
    {
      id: 'budget',
      title: 'Budget',
      stripe: 'amber',
      fields: [
        {
          key: 'budgetLimit',
          label: 'Annual Budget Limit (₹)',
          type: 'currency',
          placeholder: '0',
        },
      ],
    },
  ],
};

export function CostCentreMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
