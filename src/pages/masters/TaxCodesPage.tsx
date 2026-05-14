import { MasterListScreen, type MasterConfig } from '../../components/masters/MasterListScreen'

const config: MasterConfig = {
  title:      'Tax Codes',
  singular:   'tax code',
  apiPath:    '/api/masters/tax-codes',
  entityType: 'taxCode',
  columns: [
    { key: 'code',        label: 'Code',   mono: true },
    { key: 'description', label: 'Description' },
    { key: 'cgstRate',    label: 'CGST %'  },
    { key: 'sgstRate',    label: 'SGST %'  },
    { key: 'igstRate',    label: 'IGST %'  },
  ],
  fields: [
    { key: 'code',        label: 'Tax code',    type: 'text',   required: true },
    { key: 'description', label: 'Description', type: 'text',   required: true },
    { key: 'cgstRate',    label: 'CGST rate %', type: 'number', required: true, step: '0.5' },
    { key: 'sgstRate',    label: 'SGST rate %', type: 'number', required: true, step: '0.5' },
    { key: 'igstRate',    label: 'IGST rate %', type: 'number', required: true, step: '0.5' },
  ],
  csvHeaders: ['code', 'description', 'cgstRate', 'sgstRate', 'igstRate'],
  csvExample: { code: 'GST18', description: 'GST 18%', cgstRate: '9', sgstRate: '9', igstRate: '18' },
}

export default function TaxCodesPage() {
  return <MasterListScreen config={config} />
}
