import { MasterListScreen, type MasterConfig } from '../../components/masters/MasterListScreen'

const config: MasterConfig = {
  title: 'Locations', singular: 'location',
  apiPath: '/api/masters/locations', entityType: 'location',
  workflowModule: 'LOCATION',
  columns: [
    { key: 'code',  label: 'Code',  mono: true },
    { key: 'name',  label: 'Name' },
    { key: 'city',  label: 'City' },
    { key: 'state', label: 'State' },
  ],
  fields: [
    { key: 'code',         label: 'Location code', type: 'text', required: true },
    { key: 'name',         label: 'Location name', type: 'text', required: true },
    { key: 'addressLine1', label: 'Address',       type: 'text', span: 2 },
    { key: 'city',         label: 'City',          type: 'text' },
    { key: 'state',        label: 'State',         type: 'text' },
    { key: 'pincode',      label: 'PIN code',      type: 'text' },
  ],
  csvHeaders: ['code', 'name', 'city', 'state', 'pincode'],
  csvExample: { code: 'MUM-HQ', name: 'Mumbai HQ', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
}

export default function LocationsPage() { return <MasterListScreen config={config} /> }
