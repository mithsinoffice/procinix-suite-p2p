import { MasterListScreen, type MasterConfig } from '../../components/masters/MasterListScreen'

const config: MasterConfig = {
  title: 'Employees', singular: 'employee',
  apiPath: '/api/masters/employees', entityType: 'employee',
  columns: [
    { key: 'code',  label: 'Emp code', mono: true },
    { key: 'name',  label: 'Name' },
    { key: 'email', label: 'Email' },
  ],
  fields: [
    { key: 'code',        label: 'Employee code', type: 'text',   required: true },
    { key: 'name',        label: 'Full name',     type: 'text',   required: true },
    { key: 'email',       label: 'Email',         type: 'text' },
    { key: 'mobile',      label: 'Mobile',        type: 'text' },
    { key: 'pan',         label: 'PAN',           type: 'text' },
    { key: 'joiningDate', label: 'Joining date',  type: 'text' },
  ],
  csvHeaders: ['code', 'name', 'email', 'mobile', 'pan'],
  csvExample: { code: 'EMP001', name: 'Rahul Sharma', email: 'rahul@company.com', mobile: '9800000000', pan: 'ABCDE1234F' },
}

export default function EmployeesPage() { return <MasterListScreen config={config} /> }
