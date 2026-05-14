import { MasterListScreen, type MasterConfig } from '../../components/masters/MasterListScreen'

const config: MasterConfig = {
  title: 'Tax Regimes', singular: 'tax regime',
  apiPath: '/api/masters/tax-regimes', entityType: 'taxRegime',
  columns: [
    { key: 'code',        label: 'Code',        mono: true },
    { key: 'name',        label: 'Name' },
    { key: 'description', label: 'Description' },
  ],
  fields: [
    { key: 'code',        label: 'Code',        type: 'text',     required: true },
    { key: 'name',        label: 'Name',        type: 'text',     required: true },
    { key: 'description', label: 'Description', type: 'textarea', span: 2 },
  ],
  csvHeaders: ['code', 'name', 'description'],
  csvExample: { code: 'GST-REG', name: 'GST Regular', description: 'Regular GST taxpayer regime' },
}

export default function TaxRegimesPage() { return <MasterListScreen config={config} /> }
