import { Calculator } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

const config: MasterV2Config = {
  title: 'Depreciation Method Master',
  subtitle: 'SLM / WDV / DDB / UOP — referenced by Asset/CAPEX PRs.',
  icon: Calculator,
  masterKey: 'depreciation_method_master',
  columns: [{ key: 'shortCode', label: 'Short Code', fromPayload: true }],
  formSections: [
    {
      id: 'details',
      title: 'Details',
      stripe: 'blue',
      fields: [
        {
          key: 'shortCode',
          label: 'Short Code',
          fromPayload: true,
          placeholder: 'e.g. SLM',
        },
      ],
    },
  ],
};

export function DepreciationMethodMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
