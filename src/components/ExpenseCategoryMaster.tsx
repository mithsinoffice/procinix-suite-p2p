import { Receipt } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

const config: MasterV2Config = {
  title: 'Expense Category Master',
  subtitle: 'Expense categories used by Non-PO Invoice form (Travel, Marketing, Utilities, …).',
  icon: Receipt,
  masterKey: 'expense_category_master',
  columns: [{ key: 'defaultGl', label: 'Default GL', fromPayload: true }],
  formSections: [
    {
      id: 'gl',
      title: 'GL mapping',
      subtitle: 'Default GL account suggested when this expense category is picked on an invoice.',
      stripe: 'blue',
      fields: [
        {
          key: 'defaultGl',
          label: 'Default GL',
          fromPayload: true,
          placeholder: 'e.g. 5301 Professional fees',
        },
      ],
    },
  ],
};

export function ExpenseCategoryMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
