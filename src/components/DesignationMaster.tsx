import { SimpleMasterScreen } from './ui/SimpleMasterScreen';

export function DesignationMaster() {
  return (
    <SimpleMasterScreen
      masterKey="designation_master"
      masterName="Designation Master"
      description="Job titles, hierarchy levels and approval limits."
      extraFields={[
        { key: 'level', label: 'Level', type: 'number' },
        { key: 'grade', label: 'Grade', fromPayload: true },
        {
          key: 'approvalLimit',
          label: 'Approval Limit (₹)',
          type: 'number',
          fromPayload: true,
          format: (v) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`),
        },
      ]}
    />
  );
}
