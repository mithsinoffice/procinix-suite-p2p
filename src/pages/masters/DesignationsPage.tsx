import { MasterListScreen, type MasterConfig } from '../../components/masters/MasterListScreen'

const config: MasterConfig = {
  title: 'Designations', singular: 'designation',
  apiPath: '/api/masters/designations', entityType: 'designation',
  columns: [
    { key: 'code',  label: 'Code',  mono: true },
    { key: 'name',  label: 'Name' },
    { key: 'level', label: 'Level' },
  ],
  fields: [
    { key: 'code',  label: 'Code',                       type: 'text',   required: true },
    { key: 'name',  label: 'Name',                       type: 'text',   required: true },
    { key: 'level', label: 'Hierarchy level (1=top)',     type: 'number' },
  ],
  csvHeaders: ['code', 'name', 'level'],
  csvExample: { code: 'MGR', name: 'Manager', level: '4' },
}

export default function DesignationsPage() { return <MasterListScreen config={config} /> }
