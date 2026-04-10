import { getSupabaseHeaders, supabaseRestUrl } from './client';
import { ensureDomainDocument } from './documentStore';
import { isMysqlApiEnabled, mysqlApiRequest } from '../mysql/client';

const STORAGE_PREFIX = 'procinix-subko-erp:relational-master';

const MASTER_TABLES = {
  category_master: 'erp_master_categories',
  color_master: 'erp_master_colors',
  country_master: 'erp_master_countries',
  state_master: 'erp_master_states',
  department_master: 'erp_master_departments',
  tax_code_master: 'erp_master_tax_codes',
  size_master: 'erp_master_sizes',
  item_category_master: 'erp_master_item_categories',
  vendor_payment_terms_master: 'erp_master_vendor_payment_terms',
  product_master: 'erp_master_products',
  sku_master: 'erp_master_skus',
  uom_master: 'erp_master_uoms',
  debit_note_reason_master: 'erp_master_debit_note_reasons',
  cost_centre_master: 'erp_master_cost_centres',
  profit_centre_master: 'erp_master_profit_centres',
  employee_master: 'erp_master_employees',
  contract_master: 'erp_master_contracts',
  vendor_master: 'erp_master_vendors',
  account_code_master: 'erp_master_account_codes',
  bank_master: 'erp_master_banks',
  roles_master: 'roles',
  user_master: 'users',
  currency_master: 'erp_master_currencies',
  entity_master: 'entities',
  exchange_rate_master: 'erp_master_exchange_rates'
} as const;

type MasterKey = keyof typeof MASTER_TABLES;

interface MasterRow<T> {
  id: string;
  record_code: string | null;
  record_name: string | null;
  status: string | null;
  approval_status: string | null;
  payload: T;
  updated_at?: string;
}

interface ExistingEntityRow {
  id: string;
  code: string;
  name: string;
  country: string | null;
  base_currency: string | null;
  owner: string | null;
  status: string;
  legal_name?: string | null;
  tax_regime?: string | null;
  created_at?: string;
  updated_at?: string;
  version_no?: number;
}

interface ExistingRoleRow {
  id: string;
  code: string;
  name: string;
  permissions: unknown;
  status: string;
  description?: string | null;
  approval_status?: string | null;
  created_at?: string;
  updated_at?: string;
  version_no?: number;
}

interface ExistingUserRow {
  id: string;
  code: string | null;
  full_name: string;
  email: string;
  primary_role: string | null;
  status: string;
  department?: string | null;
  phone?: string | null;
  approval_status?: string | null;
  created_at?: string;
  updated_at?: string;
  version_no?: number;
  employee_id?: string | null;
  username?: string | null;
  user_type?: string | null;
  login_method?: string | null;
  locked?: boolean | null;
  password_reset_required?: boolean | null;
  access_expiry_date?: string | null;
  default_entity_id?: string | null;
  remarks?: string | null;
  user_entity_access?: unknown;
  user_roles?: unknown;
}

function getStorageKey(masterKey: string) {
  return `${STORAGE_PREFIX}:${masterKey}`;
}

function readLocal<T>(masterKey: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(masterKey));
    return raw ? (JSON.parse(raw) as T[]) : fallback;
  } catch (error) {
    console.error(`Failed to read local master ${masterKey}`, error);
    return fallback;
  }
}

function writeLocal<T>(masterKey: string, records: T[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(masterKey), JSON.stringify(records));
  } catch (error) {
    console.error(`Failed to write local master ${masterKey}`, error);
  }
}

function inferRecordCode(record: Record<string, unknown>) {
  return (
    record.code ??
    record.categoryCode ??
    record.colorCode ??
    record.countryCode ??
    record.stateCode ??
    record.deptCode ??
    record.taxCode ??
    record.sizeCode ??
    record.costCentreCode ??
    record.profitCentreCode ??
    record.empCode ??
    record.contractId ??
    record.roleCode ??
    record.userCode ??
    record.employeeId ??
    record.skuCode ??
    record.productCode ??
    record.fromCurrency ??
    null
  );
}

function inferRecordName(record: Record<string, unknown>) {
  return (
    record.name ??
    record.categoryName ??
    record.colorName ??
    record.countryName ??
    record.stateName ??
    record.deptName ??
    record.description ??
    record.sizeName ??
    record.costCentreName ??
    record.profitCentreName ??
    record.empName ??
    record.roleName ??
    record.productName ??
    record.legalName ??
    record.fromCurrency ??
    null
  );
}

function inferStatus(record: Record<string, unknown>) {
  const status = record.status;
  if (typeof status === 'string') {
    return status;
  }

  if (typeof record.isActive === 'boolean') {
    return record.isActive ? 'Active' : 'Inactive';
  }

  return null;
}

function inferApprovalStatus(record: Record<string, unknown>) {
  const approvalStatus = record.approvalStatus;
  return typeof approvalStatus === 'string' ? approvalStatus : null;
}

function getTableName(masterKey: MasterKey) {
  return MASTER_TABLES[masterKey];
}

function isExistingTableMaster(masterKey: MasterKey) {
  return masterKey === 'entity_master' || masterKey === 'roles_master' || masterKey === 'user_master';
}

function derivePrimaryRoleFromUserPayload(record: Record<string, unknown>): string {
  const rows = record.userRoles;
  if (Array.isArray(rows) && rows.length > 0) {
    const list = rows as Array<{ status?: string; roleName?: string; roleCode?: string }>;
    const active = list.find((r) => r.status !== 'Inactive');
    const pick = active ?? list[0];
    return String(pick?.roleName ?? pick?.roleCode ?? '');
  }
  return String(record.role ?? '');
}

function mapExistingRowToRecord<T>(masterKey: MasterKey, row: ExistingEntityRow | ExistingRoleRow | ExistingUserRow): T {
  if (masterKey === 'entity_master') {
    const entity = row as ExistingEntityRow;
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      legalName: entity.legal_name ?? entity.name,
      country: entity.country ?? '',
      currency: entity.base_currency ?? '',
      taxRegime: entity.tax_regime ?? 'GST',
      isActive: entity.status === 'Active'
    } as T;
  }

  if (masterKey === 'roles_master') {
    const role = row as ExistingRoleRow;
    return {
      id: role.id,
      roleCode: role.code,
      roleName: role.name,
      description: role.description ?? '',
      userCount: 0,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
      status: role.status as 'Active' | 'Inactive' | 'Pending Approval',
      createdDate: role.created_at?.split('T')[0] ?? '',
      approvalStatus: role.approval_status ?? 'Approved'
    } as T;
  }

  const user = row as ExistingUserRow;
  const empId = user.employee_id?.trim() || '';
  const codeVal = user.code?.trim() || '';
  const mappedUserCode = empId ? codeVal : '';
  const mappedEmployeeId = empId || codeVal;

  return {
    id: user.id,
    userCode: mappedUserCode,
    employeeId: mappedEmployeeId,
    name: user.full_name,
    email: user.email,
    username: user.username ?? '',
    userType: user.user_type ?? '',
    loginMethod: user.login_method ?? 'Password',
    locked: Boolean(user.locked),
    passwordResetRequired: Boolean(user.password_reset_required),
    accessExpiryDate: user.access_expiry_date ?? '',
    defaultEntityId: user.default_entity_id ?? '',
    remarks: user.remarks ?? '',
    status: user.status as 'Active' | 'Inactive' | 'Pending Approval',
    createdDate: user.created_at?.split('T')[0] ?? '',
    approvalStatus: user.approval_status ?? 'Approved',
    userEntityAccess: Array.isArray(user.user_entity_access) ? user.user_entity_access : [],
    userRoles: Array.isArray(user.user_roles) ? user.user_roles : [],
  } as T;
}

function mapRecordToExistingRow(masterKey: MasterKey, record: Record<string, unknown>) {
  const timestamp = new Date().toISOString();

  if (masterKey === 'entity_master') {
    return {
      id: String(record.id),
      code: String(record.code ?? ''),
      name: String(record.name ?? record.legalName ?? ''),
      legal_name: String(record.legalName ?? record.name ?? ''),
      country: String(record.country ?? ''),
      base_currency: String(record.currency ?? ''),
      tax_regime: String(record.taxRegime ?? 'GST'),
      status: record.isActive === false ? 'Inactive' : 'Active',
      updated_at: timestamp
    };
  }

  if (masterKey === 'roles_master') {
    return {
      id: String(record.id),
      code: String(record.roleCode ?? ''),
      name: String(record.roleName ?? ''),
      description: String(record.description ?? ''),
      permissions: Array.isArray(record.permissions) ? record.permissions : [],
      status: String(record.status ?? 'Active'),
      approval_status: String(record.approvalStatus ?? 'Approved'),
      updated_at: timestamp
    };
  }

  const userCode = String(record.userCode ?? '').trim();
  const employeeId = String(record.employeeId ?? '').trim();
  const codeForRow = userCode || employeeId;

  return {
    id: String(record.id),
    code: codeForRow,
    employee_id: employeeId,
    full_name: String(record.name ?? ''),
    email: String(record.email ?? ''),
    phone: '',
    department: '',
    primary_role: derivePrimaryRoleFromUserPayload(record),
    status: String(record.status ?? 'Active'),
    approval_status: String(record.approvalStatus ?? 'Approved'),
    updated_at: timestamp,
    username: String(record.username ?? ''),
    user_type: String(record.userType ?? ''),
    login_method: String(record.loginMethod ?? 'Password'),
    locked: Boolean(record.locked),
    password_reset_required: Boolean(record.passwordResetRequired),
    access_expiry_date: String(record.accessExpiryDate ?? ''),
    default_entity_id: String(record.defaultEntityId ?? ''),
    remarks: String(record.remarks ?? ''),
    user_entity_access: Array.isArray(record.userEntityAccess) ? record.userEntityAccess : [],
    user_roles: Array.isArray(record.userRoles) ? record.userRoles : []
  };
}

async function appendMasterVersion(
  masterKey: MasterKey,
  recordId: string,
  oldValues: unknown,
  newValues: unknown,
  actionType: 'CREATE' | 'UPDATE' | 'DELETE'
) {
  try {
    await fetch(
      `${supabaseRestUrl}/master_record_versions`,
      {
        method: 'POST',
        headers: getSupabaseHeaders('resolution=merge-duplicates'),
        body: JSON.stringify([
          {
            master_record_id: recordId,
            module_key: masterKey,
            action_type: actionType,
            old_values: oldValues ?? {},
            new_values: newValues ?? {},
            version_no: 1
          }
        ])
      }
    );
  } catch (error) {
    console.warn(`Failed to append master version for ${masterKey}/${recordId}`, error);
  }
}

async function readLegacyMasterRecords<T>(masterKey: string): Promise<T[] | null> {
  try {
    const document = await ensureDomainDocument<Record<string, unknown[]>>('master_workflows', {});
    const records = document[masterKey] as T[] | undefined;
    return records && records.length > 0 ? records : null;
  } catch (error) {
    console.warn(`Legacy master read failed for ${masterKey}`, error);
    return null;
  }
}

export async function ensureRelationalMasterRecords<T>(
  masterKey: MasterKey,
  fallback: T[]
): Promise<T[]> {
  if (isMysqlApiEnabled()) {
    try {
      const response = await mysqlApiRequest<{ success: boolean; data: T[] }>(`/masters/${masterKey}`);
      if (response.data.length > 0) {
        writeLocal(masterKey, response.data);
        return response.data;
      }

      const legacyRecords = await readLegacyMasterRecords<T>(masterKey);
      const seedRecords = legacyRecords ?? fallback;
      await saveRelationalMasterRecords(masterKey, seedRecords);
      return seedRecords;
    } catch (error) {
      console.warn(`Falling back to local master storage for ${masterKey}`, error);
      return readLocal(masterKey, fallback);
    }
  }

  const tableName = getTableName(masterKey);

  try {
    const response = await fetch(
      isExistingTableMaster(masterKey)
        ? `${supabaseRestUrl}/${tableName}?select=*&order=updated_at.asc`
        : `${supabaseRestUrl}/${tableName}?select=payload&order=updated_at.asc`,
      {
        method: 'GET',
        headers: getSupabaseHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${tableName}: ${response.status}`);
    }

    const rows = (await response.json()) as Array<{ payload: T }>;
    if (rows.length > 0) {
      const records = isExistingTableMaster(masterKey)
        ? (rows as Array<ExistingEntityRow | ExistingRoleRow | ExistingUserRow>).map((row) =>
            mapExistingRowToRecord<T>(masterKey, row)
          )
        : rows.map((row) => row.payload);
      writeLocal(masterKey, records);
      return records;
    }

    const legacyRecords = await readLegacyMasterRecords<T>(masterKey);
    const seedRecords = legacyRecords ?? fallback;
    await saveRelationalMasterRecords(masterKey, seedRecords);
    return seedRecords;
  } catch (error) {
    console.warn(`Falling back to local master storage for ${masterKey}`, error);
    return readLocal(masterKey, fallback);
  }
}

export async function saveRelationalMasterRecords<T>(
  masterKey: MasterKey,
  records: T[]
): Promise<boolean> {
  writeLocal(masterKey, records);

  if (isMysqlApiEnabled()) {
    try {
      await mysqlApiRequest<{ success: boolean }>(`/masters/${masterKey}`, {
        method: 'PUT',
        body: JSON.stringify({ records }),
      });
      return true;
    } catch (error) {
      console.warn(`MySQL master save failed for ${masterKey}. Local copy retained.`, error);
      return false;
    }
  }

  const tableName = getTableName(masterKey);
  const rows = records.map((record, index) => {
    const payload = record as Record<string, unknown>;
    const id = String(payload.id ?? `${masterKey}-${index + 1}`);

    if (isExistingTableMaster(masterKey)) {
      return mapRecordToExistingRow(masterKey, { ...payload, id });
    }

    return {
      id,
      record_code: (inferRecordCode(payload) as string | null) ?? null,
      record_name: (inferRecordName(payload) as string | null) ?? null,
      status: inferStatus(payload),
      approval_status: inferApprovalStatus(payload),
      payload: record,
      updated_at: new Date().toISOString()
    } satisfies MasterRow<T>;
  });

  try {
    const existingResponse = await fetch(
      `${supabaseRestUrl}/${tableName}?select=id`,
      {
        method: 'GET',
        headers: getSupabaseHeaders()
      }
    );

    if (!existingResponse.ok) {
      throw new Error(`Failed to fetch existing ids for ${tableName}: ${existingResponse.status}`);
    }

    const existingRows = (await existingResponse.json()) as Array<{ id: string }>;
    const currentIds = new Set(rows.map((row) => row.id));
    const idsToDelete = existingRows
      .map((row) => row.id)
      .filter((id) => !currentIds.has(id));

    const previousLocal = readLocal<T>(masterKey, []);
    const previousById = new Map(
      previousLocal.map((record) => {
        const payload = record as Record<string, unknown>;
        return [String(payload.id), record];
      })
    );

    if (rows.length > 0) {
      const upsertResponse = await fetch(
        `${supabaseRestUrl}/${tableName}`,
        {
          method: 'POST',
          headers: getSupabaseHeaders('resolution=merge-duplicates'),
          body: JSON.stringify(rows)
        }
      );

      if (!upsertResponse.ok) {
        throw new Error(`Failed to upsert ${tableName}: ${upsertResponse.status}`);
      }

      if (isExistingTableMaster(masterKey)) {
        for (const record of records) {
          const payload = record as Record<string, unknown>;
          const id = String(payload.id);
          const previousRecord = previousById.get(id);
          await appendMasterVersion(
            masterKey,
            id,
            previousRecord ?? {},
            record,
            previousRecord ? 'UPDATE' : 'CREATE'
          );
        }
      }
    }

    if (idsToDelete.length > 0) {
      const deleteResponse = await fetch(
        `${supabaseRestUrl}/${tableName}?id=in.(${idsToDelete.map((id) => `"${id}"`).join(',')})`,
        {
          method: 'DELETE',
          headers: getSupabaseHeaders()
        }
      );

      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete stale rows in ${tableName}: ${deleteResponse.status}`);
      }

      if (isExistingTableMaster(masterKey)) {
        for (const id of idsToDelete) {
          await appendMasterVersion(
            masterKey,
            id,
            previousById.get(id) ?? {},
            {},
            'DELETE'
          );
        }
      }
    }
  } catch (error) {
    console.warn(`Supabase relational save failed for ${masterKey}. Local copy retained.`, error);
    return false;
  }

  return true;
}
