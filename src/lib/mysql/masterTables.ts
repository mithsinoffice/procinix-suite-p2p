import { ensureDomainDocument } from './documentStore';
import { mysqlApiRequest } from './client';

const STORAGE_PREFIX = 'procinix-s2p:relational-master';
const relationalMasterMemoryCache = new Map<string, unknown[]>();
const relationalMasterInFlight = new Map<string, Promise<unknown[]>>();

const MASTER_KEYS = [
  'category_master',
  'country_master',
  'state_master',
  'department_master',
  'tax_code_master',
  'item_category_master',
  'vendor_payment_terms_master',
  'item_master',
  'uom_master',
  'debit_note_reason_master',
  'cost_centre_master',
  'profit_centre_master',
  'employee_master',
  'contract_master',
  'vendor_master',
  'account_code_master',
  'bank_master',
  'roles_master',
  'user_master',
  'currency_master',
  'entity_master',
  'exchange_rate_master',
  'tds_section_master',
  'location_master',
  'gl_code_master',
  'vendor_group_master',
  'designation_master',
  'asset_category_master',
  'depreciation_method_master',
  'service_type_master',
  'expense_category_master',
  'kit_bundle_master',
  'rate_contract_master',
] as const;

export type MasterKey = (typeof MASTER_KEYS)[number];

function getStorageKey(masterKey: string) {
  return `${STORAGE_PREFIX}:${masterKey}`;
}

function normalizeKeyPart(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function isSeededVendorRecord(record: unknown) {
  if (!record || typeof record !== 'object') {
    return false;
  }

  const candidate = record as Record<string, unknown>;
  const id = normalizeKeyPart(candidate.id);
  const createdBy = normalizeKeyPart(candidate.createdBy);

  return id.startsWith('VEN-DEMO-') || id.startsWith('VEN-SUBKO-') || createdBy === 'SYSTEM';
}

function sanitizeVendorMasterRecords<T>(records: T[]): T[] {
  const filtered = records.filter((record) => !isSeededVendorRecord(record));
  const seenCodes = new Set<string>();
  const seenGstins = new Set<string>();
  const seenPans = new Set<string>();

  return filtered.filter((record) => {
    if (!record || typeof record !== 'object') {
      return true;
    }

    const candidate = record as Record<string, unknown>;
    const code = normalizeKeyPart(candidate.vendorCode || candidate.code);
    const gstin = normalizeKeyPart(candidate.gstin);
    const pan = normalizeKeyPart(candidate.pan);

    if (code && seenCodes.has(code)) {
      return false;
    }
    if (gstin && seenGstins.has(gstin)) {
      return false;
    }
    if (pan && seenPans.has(pan)) {
      return false;
    }

    if (code) seenCodes.add(code);
    if (gstin) seenGstins.add(gstin);
    if (pan) seenPans.add(pan);
    return true;
  });
}

function sanitizeEntityMasterRecords<T>(records: T[]): T[] {
  const byCode = new Map<string, T>();

  for (const record of records) {
    if (!record || typeof record !== 'object') {
      continue;
    }

    const candidate = record as Record<string, unknown>;
    const code = normalizeKeyPart(candidate.code || candidate.recordCode);
    if (!code) {
      byCode.set(`__id__:${String(candidate.id || Math.random())}`, record);
      continue;
    }

    const current = byCode.get(code);
    if (!current) {
      byCode.set(code, record);
      continue;
    }

    const currentObj = current as Record<string, unknown>;
    const currentApproval = normalizeKeyPart(currentObj.approvalStatus);
    const nextApproval = normalizeKeyPart(candidate.approvalStatus);
    const currentUpdated = String(currentObj.updatedAt || currentObj.createdAt || '');
    const nextUpdated = String(candidate.updatedAt || candidate.createdAt || '');

    const currentScore =
      (currentApproval === 'APPROVED'
        ? 4
        : currentApproval === 'PENDING APPROVAL'
          ? 3
          : currentApproval
            ? 2
            : 1) *
        1000000 +
      Date.parse(currentUpdated || '1970-01-01');
    const nextScore =
      (nextApproval === 'APPROVED'
        ? 4
        : nextApproval === 'PENDING APPROVAL'
          ? 3
          : nextApproval
            ? 2
            : 1) *
        1000000 +
      Date.parse(nextUpdated || '1970-01-01');

    if (nextScore >= currentScore) {
      byCode.set(code, record);
    }
  }

  return Array.from(byCode.values());
}

function sanitizeMasterRecords<T>(masterKey: string, records: T[]) {
  if (masterKey === 'vendor_master') {
    return sanitizeVendorMasterRecords(records);
  }
  if (masterKey === 'entity_master') {
    return sanitizeEntityMasterRecords(records);
  }
  return records;
}

function readLocal<T>(masterKey: string, fallback: T[]): T[] {
  const cached = relationalMasterMemoryCache.get(masterKey);
  if (cached) {
    return cached as T[];
  }

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(masterKey));
    const parsed = raw ? (JSON.parse(raw) as T[]) : fallback;
    const sanitized = sanitizeMasterRecords(masterKey, parsed);
    relationalMasterMemoryCache.set(masterKey, sanitized as unknown[]);
    return sanitized;
  } catch (error) {
    console.error(`Failed to read local master ${masterKey}`, error);
    return fallback;
  }
}

export function getCachedRelationalMasterRecords<T>(masterKey: MasterKey, fallback: T[]): T[] {
  return readLocal(masterKey, fallback);
}

function writeLocal<T>(masterKey: string, records: T[]) {
  const sanitized = sanitizeMasterRecords(masterKey, records);
  relationalMasterMemoryCache.set(masterKey, sanitized as unknown[]);

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(masterKey), JSON.stringify(sanitized));
  } catch (error) {
    console.error(`Failed to write local master ${masterKey}`, error);
  }
}

export function invalidateRelationalMasterRecords(masterKey: MasterKey) {
  relationalMasterMemoryCache.delete(masterKey);
  relationalMasterInFlight.delete(masterKey);

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(getStorageKey(masterKey));
    window.dispatchEvent(new CustomEvent('master-invalidated', { detail: { masterKey } }));
  } catch (error) {
    console.error(`Failed to invalidate local master ${masterKey}`, error);
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
  const inFlight = relationalMasterInFlight.get(masterKey);
  if (inFlight) {
    return inFlight as Promise<T[]>;
  }

  const loadPromise = (async () => {
    try {
      const response = await mysqlApiRequest<{ success: boolean; data: T[] }>(
        `/masters/${masterKey}`
      );
      const sanitizedResponse = sanitizeMasterRecords(masterKey, response.data);
      if (sanitizedResponse.length > 0) {
        writeLocal(masterKey, sanitizedResponse);
        return sanitizedResponse;
      }

      // Vendor master must never auto-seed scaffold/demo rows.
      if (masterKey === 'vendor_master') {
        writeLocal(masterKey, []);
        return [];
      }

      const legacyRecords = await readLegacyMasterRecords<T>(masterKey);
      const seedRecords = legacyRecords ?? fallback;
      await saveRelationalMasterRecords(masterKey, seedRecords);
      return seedRecords;
    } catch (error) {
      console.warn(`Falling back to local master storage for ${masterKey}`, error);
      if (masterKey === 'vendor_master') {
        return [];
      }
      return readLocal(masterKey, fallback);
    }
  })();

  relationalMasterInFlight.set(masterKey, loadPromise as Promise<unknown[]>);
  try {
    return await loadPromise;
  } finally {
    relationalMasterInFlight.delete(masterKey);
  }
}

export async function saveRelationalMasterRecords<T>(
  masterKey: MasterKey,
  records: T[]
): Promise<boolean> {
  const sanitizedRecords = sanitizeMasterRecords(masterKey, records);
  writeLocal(masterKey, sanitizedRecords);

  try {
    await mysqlApiRequest<{ success: boolean }>(`/masters/${masterKey}`, {
      method: 'PUT',
      body: JSON.stringify({ records: sanitizedRecords }),
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('master-saved', { detail: { masterKey } }));
    }
    return true;
  } catch (error) {
    // Re-throw so callers (and their try/catch toasts) see the real error.
    // Local cache is already updated above so reads stay consistent.
    console.warn(`MySQL master save failed for ${masterKey}. Local copy retained.`, error);
    throw error instanceof Error ? error : new Error(`MySQL master save failed for ${masterKey}`);
  }
}
