import { isMysqlApiEnabled, mysqlApiRequest } from '../mysql/client';

export interface MasterApprovalChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface MasterApprovalItem {
  id: string;
  type: 'Master';
  module: string;
  title: string;
  submittedBy: string;
  submittedDate: string;
  submittedTime: string;
  priority: 'High' | 'Medium' | 'Low';
  daysWaiting: number;
  details: Record<string, string>;
  changes: MasterApprovalChange[];
  route: string;
  masterKey: string;
  recordId: string;
}

interface WorkflowStep {
  approverRole: string;
}

interface WorkflowConfiguration {
  workflowName: string;
  module: string;
  status: string;
  steps: WorkflowStep[];
}

interface PendingApprovalResponseItem {
  masterKey: string;
  recordId: string;
  record: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  latestAudit?: {
    actionType?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    changedAt?: string;
  } | null;
}

interface MasterDefinition {
  key: string;
  label: string;
  route: string;
  codeFields: string[];
  nameFields: string[];
}

const MASTER_DEFINITIONS: MasterDefinition[] = [
  { key: 'category_master', label: 'Category Master', route: '/masters/category-master', codeFields: ['categoryCode'], nameFields: ['categoryName'] },
  { key: 'color_master', label: 'Color Master', route: '/masters/color-master', codeFields: ['colorCode'], nameFields: ['colorName'] },
  { key: 'country_master', label: 'Country Master', route: '/masters/country-master', codeFields: ['countryCode', 'code'], nameFields: ['countryName', 'name'] },
  { key: 'state_master', label: 'State Master', route: '/masters/state-master', codeFields: ['stateCode', 'code'], nameFields: ['stateName', 'name'] },
  { key: 'tax_code_master', label: 'Tax Code Master', route: '/masters/tax-code-master', codeFields: ['taxCode', 'code'], nameFields: ['taxName', 'name'] },
  { key: 'department_master', label: 'Department Master', route: '/masters/department-master', codeFields: ['deptCode', 'code'], nameFields: ['deptName', 'name'] },
  { key: 'cost_centre_master', label: 'Cost Centre Master', route: '/masters/cost-centre-master', codeFields: ['costCentreCode', 'code'], nameFields: ['costCentreName', 'name'] },
  { key: 'profit_centre_master', label: 'Profit Centre Master', route: '/masters/profit-centre-master', codeFields: ['profitCentreCode', 'code'], nameFields: ['profitCentreName', 'name'] },
  { key: 'employee_master', label: 'Employee Master', route: '/masters/employee-master', codeFields: ['empCode', 'employeeId', 'code'], nameFields: ['empName', 'name'] },
  { key: 'entity_master', label: 'Entity Master', route: '/masters/entity-master', codeFields: ['code'], nameFields: ['legalName', 'name'] },
  { key: 'currency_master', label: 'Currency Master', route: '/masters/currency-master', codeFields: ['code'], nameFields: ['name'] },
  { key: 'exchange_rate_master', label: 'Exchange Rate Master', route: '/masters/exchange-rate-master', codeFields: ['fromCurrency'], nameFields: ['fromCurrency', 'name'] },
  { key: 'user_master', label: 'User Master', route: '/masters/user-master', codeFields: ['userCode', 'employeeId', 'code'], nameFields: ['name'] },
  { key: 'roles_master', label: 'Roles Master', route: '/masters/roles-master', codeFields: ['roleCode', 'code'], nameFields: ['roleName', 'name'] },
  { key: 'uom_master', label: 'UOM Master', route: '/masters/uom-master', codeFields: ['code'], nameFields: ['name'] },
  { key: 'debit_note_reason_master', label: 'Debit Note Reason Master', route: '/masters/debit-note-reason-master', codeFields: ['code'], nameFields: ['name'] },
  { key: 'item_category_master', label: 'Item Category Master', route: '/masters/item-category-master', codeFields: ['code'], nameFields: ['name'] },
  { key: 'vendor_payment_terms_master', label: 'Vendor Payment Terms Master', route: '/masters/vendor-payment-terms-master', codeFields: ['code'], nameFields: ['description', 'name'] },
  { key: 'product_master', label: 'Product Master', route: '/masters/product-master', codeFields: ['productCode', 'code'], nameFields: ['productName', 'name'] },
  { key: 'sku_master', label: 'SKU Master', route: '/masters/sku-master', codeFields: ['skuCode', 'code'], nameFields: ['skuName', 'product', 'name'] },
  { key: 'size_master', label: 'Size Master', route: '/masters/size-master', codeFields: ['sizeCode', 'code'], nameFields: ['sizeName', 'name'] },
  { key: 'contract_master', label: 'Contract Master', route: '/masters/contract-master', codeFields: ['contractId', 'code'], nameFields: ['vendorName', 'name'] },
  { key: 'vendor_master', label: 'Vendor Master', route: '/vendors', codeFields: ['code'], nameFields: ['legalName', 'name'] },
];

function getRecordValue(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '';
}

function getApprovalStatus(record: Record<string, unknown>) {
  const approvalStatus = record.approvalStatus;
  if (typeof approvalStatus === 'string' && approvalStatus.trim()) {
    return approvalStatus;
  }

  return '';
}

function isPendingApprovalStatus(status: string) {
  return ['Draft', 'Pending Approval', 'Pending', 'Changes Requested'].includes(status);
}

function stringifyValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function titleCase(field: string) {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function getMasterChanges(
  record: Record<string, unknown>,
  audit?: PendingApprovalResponseItem['latestAudit'],
) {
  const previous =
    audit?.oldValues && typeof audit.oldValues === 'object'
      ? audit.oldValues
      : record.originalData && typeof record.originalData === 'object'
        ? (record.originalData as Record<string, unknown>)
        : null;

  if (!previous) {
    return [];
  }

  const current =
    audit?.newValues && typeof audit.newValues === 'object'
      ? audit.newValues
      : record;

  const ignoredFields = new Set([
    'originalData',
    'approvalStatus',
    'updatedAt',
    'createdAt',
    '_workflowActor',
    '_workflowComments',
  ]);
  const keys = Array.from(
    new Set([...Object.keys(previous), ...Object.keys(current)]),
  ).filter((key) => !ignoredFields.has(key));

  return keys
    .map((key) => {
      const oldValue = stringifyValue(previous[key]);
      const newValue = stringifyValue(current[key]);
      if (oldValue === newValue) {
        return null;
      }

      return {
        field: titleCase(key),
        oldValue: oldValue || '-',
        newValue: newValue || '-',
      } satisfies MasterApprovalChange;
    })
    .filter((change): change is MasterApprovalChange => change !== null);
}

function getDaysWaiting(submittedDate: string) {
  const submitted = new Date(submittedDate);
  const diffMs = Date.now() - submitted.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getPriority(status: string, changes: MasterApprovalChange[]) {
  if (status === 'Changes Requested') {
    return 'High';
  }

  if (changes.length >= 4) {
    return 'High';
  }

  if (changes.length >= 2) {
    return 'Medium';
  }

  return 'Low';
}

function findWorkflow(workflows: WorkflowConfiguration[], label: string) {
  return workflows.find(
    (workflow) =>
      workflow.status === 'Active' &&
      workflow.module.toLowerCase() === label.toLowerCase(),
  );
}

export async function fetchPendingMasterApprovals(): Promise<MasterApprovalItem[]> {
  if (!isMysqlApiEnabled()) {
    return [];
  }

  const [workflowResponse, pendingResponse] = await Promise.all([
    mysqlApiRequest<{ success: boolean; data: WorkflowConfiguration[] }>('/workflows/configurations').catch(() => ({ success: false, data: [] })),
    mysqlApiRequest<{ success: boolean; data: PendingApprovalResponseItem[] }>('/master-approvals/pending').catch(() => ({
      success: false,
      data: [],
    })),
  ]);

  return MASTER_DEFINITIONS.flatMap((definition) => {
    const workflow = findWorkflow(workflowResponse.data, definition.label);
    const approverRole = workflow?.steps?.[0]?.approverRole ?? 'Configured Approver';
    const workflowName = workflow?.workflowName ?? `${definition.label} Approval`;
    const pendingItems = pendingResponse.data.filter((item) => item.masterKey === definition.key);

    return pendingItems
      .filter((item) => isPendingApprovalStatus(getApprovalStatus(item.record)))
      .map((item) => {
        const record = item.record;
        const recordCode = getRecordValue(record, definition.codeFields);
        const recordName = getRecordValue(record, definition.nameFields) || recordCode || String(record.id ?? 'Record');
        const changes = getMasterChanges(record, item.latestAudit);
        const submittedSource = item.latestAudit?.changedAt ?? item.updatedAt ?? item.createdAt ?? new Date().toISOString();
        const submittedTimestamp = new Date(submittedSource);
        const submittedDate = submittedTimestamp.toISOString().split('T')[0];
        const submittedTime = submittedTimestamp.toLocaleTimeString('en-IN', { hour12: false });
        const approvalStatus = getApprovalStatus(record);
        const submittedBy =
          typeof item.latestAudit?.newValues?._workflowActor === 'string'
            ? item.latestAudit.newValues._workflowActor
            : typeof record.createdBy === 'string'
              ? record.createdBy
              : 'System';

        return {
          id: `${definition.key}:${String(item.recordId)}`,
          type: 'Master',
          module: 'Masters',
          title: `${definition.label} - ${recordName}`,
          submittedBy,
          submittedDate,
          submittedTime,
          priority: getPriority(approvalStatus, changes),
          daysWaiting: getDaysWaiting(submittedDate),
          details: {
            recordType: definition.label,
            recordName,
            recordCode: recordCode || '-',
            approvalStatus,
            workflowName,
            approverRole,
          },
          changes,
          route: definition.route,
          masterKey: definition.key,
          recordId: String(item.recordId),
        } satisfies MasterApprovalItem;
      });
  });
}

export async function updateMasterApprovalStatus(
  masterKey: string,
  recordId: string,
  action: 'approve' | 'reject' | 'request_info',
  options?: { actor?: string; comments?: string },
) {
  await mysqlApiRequest(`/master-approvals/${masterKey}/${recordId}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action,
      actor: options?.actor ?? 'Approver',
      comments: options?.comments ?? '',
    }),
  });
}
