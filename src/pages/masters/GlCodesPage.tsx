import { MasterListScreen, type MasterConfig } from '../../components/masters/MasterListScreen'

const config: MasterConfig = {
  title:          'GL Codes',
  singular:       'GL code',
  apiPath:        '/api/masters/gl-codes',
  entityType:     'glCode',
  workflowModule: 'GL_CODE',
  columns: [
    { key: 'code', label: 'Code', mono: true },
    { key: 'name', label: 'Name' },
    { key: 'accountType', label: 'Type' },
  ],
  fields: [
    { key: 'code',        label: 'GL Code',      type: 'text',   required: true  },
    { key: 'name',        label: 'Name',          type: 'text',   required: true  },
    { key: 'accountType', label: 'Account type',  type: 'select', required: true,
      options: ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY'] },
    { key: 'description', label: 'Description',   type: 'textarea', span: 2 },
  ],
  csvHeaders: ['code', 'name', 'accountType', 'description'],
  csvExample: { code: '5001', name: 'Software Subscriptions', accountType: 'EXPENSE', description: 'SaaS and software costs' },
}

export default function GlCodesPage() {
  return <MasterListScreen config={config} />
}
