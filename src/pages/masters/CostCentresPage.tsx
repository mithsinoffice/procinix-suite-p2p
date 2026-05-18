import { MasterListScreen, type MasterConfig } from '../../components/masters/MasterListScreen'

const config: MasterConfig = {
  title:          'Cost Centres',
  singular:       'cost centre',
  apiPath:        '/api/masters/cost-centres',
  entityType:     'costCentre',
  workflowModule: 'COST_CENTRE',
  columns: [
    { key: 'code', label: 'Code', mono: true },
    { key: 'name', label: 'Name' },
  ],
  fields: [
    { key: 'code', label: 'Cost centre code', type: 'text', required: true },
    { key: 'name', label: 'Cost centre name', type: 'text', required: true },
  ],
  csvHeaders: ['code', 'name'],
  csvExample: { code: 'CC-CORP', name: 'Corporate' },
}

export default function CostCentresPage() {
  return <MasterListScreen config={config} />
}
