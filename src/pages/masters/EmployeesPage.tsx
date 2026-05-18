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
    { key: 'code',          label: 'Employee code', type: 'text',      required: true },
    { key: 'name',          label: 'Full name',     type: 'text',      required: true },
    { key: 'email',         label: 'Email',         type: 'text',      required: true },
    { key: 'mobile',        label: 'Mobile',        type: 'text' },
    { key: 'pan',           label: 'PAN',           type: 'text' },
    { key: 'departmentId',  label: 'Department',    type: 'apiSelect', required: true, endpoint: '/api/masters/departments' },
    { key: 'designationId', label: 'Designation',   type: 'apiSelect', required: true, endpoint: '/api/masters/designations' },
    { key: 'locationId',    label: 'Location',      type: 'apiSelect',                  endpoint: '/api/masters/locations' },
    { key: 'joiningDate',   label: 'Joining date',  type: 'text' },
  ],
  csvHeaders: ['code', 'name', 'email', 'mobile', 'pan'],
  csvExample: { code: 'EMP001', name: 'Rahul Sharma', email: 'rahul@company.com', mobile: '9800000000', pan: 'ABCDE1234F' },
}

export default function EmployeesPage() { return <MasterListScreen config={config} /> }
