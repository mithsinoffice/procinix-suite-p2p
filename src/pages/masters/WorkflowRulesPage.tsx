import { MasterListScreen, type MasterConfig } from '../../components/masters/MasterListScreen'

const config: MasterConfig = {
  title: 'Workflow Rules', singular: 'workflow rule',
  apiPath: '/api/masters/workflow-rules', entityType: 'workflowRule',
  columns: [
    { key: 'code',   label: 'Code',   mono: true },
    { key: 'name',   label: 'Name' },
    { key: 'module', label: 'Module' },
    { key: 'levels', label: 'Levels' },
  ],
  fields: [
    { key: 'code',       label: 'Rule code',          type: 'text',   required: true },
    { key: 'name',       label: 'Rule name',          type: 'text',   required: true },
    { key: 'module',     label: 'Module',             type: 'select', required: true,
      options: ['INVOICE', 'PAYMENT', 'VENDOR', 'PO', 'PR'] },
    { key: 'levels',     label: 'Approval levels',    type: 'number' },
    { key: 'amountFrom', label: 'Amount from (₹)',    type: 'number' },
    { key: 'amountTo',   label: 'Amount to (₹)',      type: 'number' },
    { key: 'approverL1', label: 'L1 Approver role',   type: 'text' },
    { key: 'approverL2', label: 'L2 Approver role',   type: 'text' },
    { key: 'approverL3', label: 'L3 Approver role',   type: 'text' },
  ],
  csvHeaders: ['code', 'name', 'module', 'levels', 'amountFrom', 'amountTo'],
  csvExample: { code: 'INV-STD', name: 'Invoice Standard', module: 'INVOICE', levels: '1', amountFrom: '0', amountTo: '100000' },
}

export default function WorkflowRulesPage() { return <MasterListScreen config={config} /> }
