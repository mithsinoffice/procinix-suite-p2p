import { MasterListScreen, type MasterConfig } from '../../components/masters/MasterListScreen'

const config: MasterConfig = {
  title: 'Entities', singular: 'entity',
  apiPath: '/api/masters/entities', entityType: 'entity',
  columns: [
    { key: 'code',  label: 'Code',      mono: true },
    { key: 'name',  label: 'Legal name' },
    { key: 'gstin', label: 'GSTIN',     mono: true },
    { key: 'state', label: 'State' },
  ],
  fields: [
    { key: 'code',         label: 'Entity code',  type: 'text', required: true },
    { key: 'name',         label: 'Legal name',   type: 'text', required: true },
    { key: 'gstin',        label: 'GSTIN',        type: 'text' },
    { key: 'pan',          label: 'PAN',          type: 'text' },
    { key: 'tan',          label: 'TAN',          type: 'text' },
    { key: 'addressLine1', label: 'Address',      type: 'text', span: 2 },
    { key: 'city',         label: 'City',         type: 'text' },
    { key: 'state',        label: 'State',        type: 'text' },
    { key: 'pincode',      label: 'PIN code',     type: 'text' },
  ],
  csvHeaders: ['code', 'name', 'gstin', 'pan', 'city', 'state'],
  csvExample: { code: 'PTPL', name: 'Procinix Technologies Pvt Ltd', gstin: '27AABCP1234R1ZV', pan: 'AABCP1234R', city: 'Mumbai', state: 'Maharashtra' },
}

export default function EntitiesPage() { return <MasterListScreen config={config} /> }
