import { mysqlApiRequest } from './client';

export type DocumentDomain =
  | 'master_data'
  | 'ap_data'
  | 'budget_data'
  | 'procurement_data'
  | 'master_workflows'
  /** Vendor invitation queue + portal state (JSON payload); MySQL: domain_documents / document API */
  | 'vendor_invitations'
  /** Workflow listings and configurator definitions (shared doc between WorkflowManagement + WorkflowConfigurator) */
  | 'workflows_config'
  /** Role/module access privilege rules */
  | 'access_rules'
  /** Portal user registry and vendor access state */
  | 'portal_users'
  /** Bulk upload mapping drafts — resume interrupted uploads */
  | 'upload_drafts';

interface EnsureDomainDocumentOptions {
  seedIfMissing?: boolean;
}

const STORAGE_PREFIX = 'procinix-subko-erp';

function getStorageKey(domain: DocumentDomain) {
  return `${STORAGE_PREFIX}:${domain}`;
}

function readLocal<T>(domain: DocumentDomain, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(domain));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.error(`Failed to read local document for ${domain}`, error);
    return fallback;
  }
}

function writeLocal<T>(domain: DocumentDomain, payload: T) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(domain), JSON.stringify(payload));
  } catch (error) {
    console.error(`Failed to write local document for ${domain}`, error);
  }
}

export async function ensureDomainDocument<T>(
  domain: DocumentDomain,
  fallback: T,
  options?: EnsureDomainDocumentOptions,
): Promise<T> {
  try {
    const response = await mysqlApiRequest<{ success: boolean; payload: T | null }>(`/documents/${domain}`);
    if (response.payload) {
      writeLocal(domain, response.payload);
      return response.payload;
    }

    const shouldSeed = options?.seedIfMissing ?? true;
    if (!shouldSeed) {
      writeLocal(domain, fallback);
      return fallback;
    }

    await saveDomainDocument(domain, fallback);
    return fallback;
  } catch (error) {
    console.warn(`Falling back to local storage for ${domain}`, error);
    return readLocal(domain, fallback);
  }
}

export async function saveDomainDocument<T>(domain: DocumentDomain, payload: T): Promise<void> {
  writeLocal(domain, payload);

  try {
    await mysqlApiRequest<{ success: boolean }>(`/documents/${domain}`, {
      method: 'PUT',
      body: JSON.stringify({ payload }),
    });
  } catch (error) {
    console.warn(`MySQL save failed for ${domain}. Local copy retained.`, error);
  }
}
