import { Target } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

const config: MasterV2Config = {
  title: 'Profit Centre Master',
  subtitle: 'Profit centres used to track revenue and contribution by business unit.',
  icon: Target,
  masterKey: 'profit_centre_master',
  entityScoped: true,
  requiresApproval: true,
  columns: [
    { key: 'description', label: 'Description', fromPayload: true },
    { key: 'head', label: 'Head', fromPayload: true },
    { key: 'entityCode', label: 'Entity', fromPayload: true },
  ],
  formSections: [
    {
      id: 'details',
      title: 'Profit Centre Details',
      subtitle: 'Identification + the leader who owns the contribution number.',
      stripe: 'blue',
      fields: [
        {
          key: 'description',
          label: 'Description',
          type: 'textarea',
          fromPayload: true,
          placeholder: 'What revenue / contribution this centre tracks',
        },
        {
          key: 'head',
          label: 'Centre Head',
          fromPayload: true,
          placeholder: 'Name of person accountable',
        },
        {
          key: 'entityCode',
          label: 'Entity Code',
          fromPayload: true,
          placeholder: 'PTPL / MTPL',
        },
      ],
    },
  ],
};

export function ProfitCentreMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
