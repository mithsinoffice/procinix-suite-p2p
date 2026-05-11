import { Wrench } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

const config: MasterV2Config = {
  title: 'Service Type Master',
  subtitle: 'Service categories used by Service PRs (IT, Consulting, Logistics, …).',
  icon: Wrench,
  masterKey: 'service_type_master',
  columns: [{ key: 'defaultTdsSection', label: 'Default TDS', fromPayload: true }],
  formSections: [
    {
      id: 'tax',
      title: 'Tax defaults',
      subtitle: 'Default TDS section applied when this service type is selected on a PR / invoice.',
      stripe: 'blue',
      fields: [
        {
          key: 'defaultTdsSection',
          label: 'Default TDS Section',
          fromPayload: true,
          placeholder: 'e.g. 194J',
        },
      ],
    },
  ],
};

export function ServiceTypeMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
