import { UserCog } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

const config: MasterV2Config = {
  title: 'Designation Master',
  subtitle: 'Job titles, hierarchy levels and approval limits.',
  icon: UserCog,
  masterKey: 'designation_master',
  columns: [
    { key: 'level', label: 'Level', type: 'number' },
    { key: 'grade', label: 'Grade', fromPayload: true },
    {
      key: 'approvalLimit',
      label: 'Approval Limit (₹)',
      fromPayload: true,
      format: (v) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`),
    },
  ],
  formSections: [
    {
      id: 'details',
      title: 'Details',
      subtitle: 'Hierarchy level and approval ceiling for this role.',
      stripe: 'blue',
      fields: [
        { key: 'level', label: 'Level', type: 'number', required: true },
        { key: 'grade', label: 'Grade', fromPayload: true, placeholder: 'e.g. M1 / M2' },
        {
          key: 'approvalLimit',
          label: 'Approval Limit (₹)',
          type: 'currency',
          fromPayload: true,
          placeholder: '0',
        },
      ],
    },
  ],
};

export function DesignationMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
