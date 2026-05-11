import { Users } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

/**
 * Migrated from bespoke 617-line drawer (2026-05-11). Entity mapping +
 * approval workflow preserved via V2 flags. `relationshipType` is the
 * Ind-AS / related-party classification carried into vendor disclosures.
 */
const RELATIONSHIP_TYPES = ['Third party', 'Related party', 'Associate', 'JV'];

const config: MasterV2Config = {
  title: 'Vendor Group Master',
  subtitle: 'Vendor groups for related-party tracking and consolidated reporting.',
  icon: Users,
  masterKey: 'vendor_group_master',
  codeKey: 'groupCode',
  nameKey: 'groupName',
  entityScoped: true,
  requiresApproval: true,
  columns: [
    { key: 'relationshipType', label: 'Relationship' },
    { key: 'clientErpVendorGroupCode', label: 'ERP Code' },
  ],
  formSections: [
    {
      id: 'classification',
      title: 'Classification',
      subtitle: 'Related-party classification drives Ind-AS disclosures.',
      stripe: 'blue',
      fields: [
        {
          key: 'relationshipType',
          label: 'Relationship Type',
          type: 'select',
          options: RELATIONSHIP_TYPES,
          required: true,
        },
        { key: 'clientErpVendorGroupCode', label: 'Client ERP Code' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ],
    },
  ],
};

export function VendorGroupMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
