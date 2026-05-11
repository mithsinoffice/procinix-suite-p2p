import { MapPin } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

/**
 * Migrated from bespoke 693-line drawer (2026-05-11). Entity mapping +
 * approval workflow preserved via V2's `entityScoped` / `requiresApproval`
 * flags. Address fields moved into a single section so they wrap cleanly
 * in V2's 2-column grid.
 */
const config: MasterV2Config = {
  title: 'Location Master',
  subtitle: 'Plants, warehouses, offices, regional hubs — physical locations of operation.',
  icon: MapPin,
  masterKey: 'location_master',
  codeKey: 'locationCode',
  nameKey: 'locationName',
  entityScoped: true,
  requiresApproval: true,
  columns: [
    { key: 'locationType', label: 'Type' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
  ],
  formSections: [
    {
      id: 'classification',
      title: 'Classification',
      stripe: 'blue',
      fields: [
        {
          key: 'locationType',
          label: 'Location Type',
          type: 'select',
          options: ['Plant', 'Warehouse', 'Office', 'Regional Hub', 'Store', 'Depot'],
          required: true,
        },
        { key: 'parentEntity', label: 'Parent Entity' },
      ],
    },
    {
      id: 'address',
      title: 'Address',
      subtitle: 'Postal address for shipping documents and tax registrations.',
      stripe: 'blue',
      fields: [
        { key: 'address', label: 'Street Address' },
        { key: 'city', label: 'City', required: true },
        { key: 'state', label: 'State', required: true },
        { key: 'pincode', label: 'Pincode' },
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      stripe: 'blue',
      fields: [
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'contactPhone', label: 'Contact Phone' },
      ],
    },
  ],
};

export function LocationMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
