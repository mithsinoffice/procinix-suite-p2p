import { Building2 } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

/**
 * Migrated from bespoke 700-line drawer + ApprovalModal + EntityMappingSelector
 * to the standard V2 config (2026-05-11). Approval workflow is preserved via
 * `requiresApproval: true` (View-mode footer shows Approve/Reject; submit
 * goes to Pending Approval). Entity scoping is preserved via
 * `entityScoped: true` (V2 mounts `<EntityMappingSelector>` inside the form).
 */
const config: MasterV2Config = {
  title: 'Department Master',
  subtitle: 'Organisational departments — owners, scope, and approval state.',
  icon: Building2,
  masterKey: 'department_master',
  codeKey: 'deptCode',
  nameKey: 'deptName',
  entityScoped: true,
  requiresApproval: true,
  columns: [{ key: 'headOfDept', label: 'Head of Dept' }],
  formSections: [
    {
      id: 'details',
      title: 'Details',
      subtitle: 'Department head and any descriptive notes.',
      stripe: 'blue',
      fields: [{ key: 'headOfDept', label: 'Head of Department', required: true }],
    },
  ],
};

export function DepartmentMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
