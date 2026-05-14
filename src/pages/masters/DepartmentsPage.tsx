import { MasterListScreen, type MasterConfig } from '../../components/masters/MasterListScreen'

const config: MasterConfig = {
  title:      'Departments',
  singular:   'department',
  apiPath:    '/api/masters/departments',
  entityType: 'department',
  columns: [
    { key: 'code', label: 'Code', mono: true },
    { key: 'name', label: 'Name' },
  ],
  fields: [
    { key: 'code', label: 'Department code', type: 'text', required: true },
    { key: 'name', label: 'Department name', type: 'text', required: true },
  ],
  csvHeaders: ['code', 'name'],
  csvExample: { code: 'ENGG', name: 'Engineering' },
}

export default function DepartmentsPage() {
  return <MasterListScreen config={config} />
}
