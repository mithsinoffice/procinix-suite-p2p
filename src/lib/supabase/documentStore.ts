import { getSupabaseHeaders, supabaseRestUrl } from './client';
import { isMysqlApiEnabled, mysqlApiRequest } from '../mysql/client';

export type DocumentDomain =
  | 'master_data'
  | 'ap_data'
  | 'budget_data'
  | 'procurement_data'
  | 'master_workflows'
  /** Vendor invitation queue + portal state (JSON payload); MySQL: domain_documents / document API */
  | 'vendor_invitations';

const TABLE_NAME = 'erp_document_store';
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

export async function ensureDomainDocument<T>(domain: DocumentDomain, fallback: T): Promise<T> {
  if (isMysqlApiEnabled()) {
    try {
      const response = await mysqlApiRequest<{ success: boolean; payload: T | null }>(`/documents/${domain}`);
      if (response.payload) {
        writeLocal(domain, response.payload);
        return response.payload;
      }

      await saveDomainDocument(domain, fallback);
      return fallback;
    } catch (error) {
      console.warn(`Falling back to local storage for ${domain}`, error);
      return readLocal(domain, fallback);
    }
  }

  try {
    const response = await fetch(
      `${supabaseRestUrl}/${TABLE_NAME}?domain=eq.${encodeURIComponent(domain)}&select=payload`,
      {
        method: 'GET',
        headers: getSupabaseHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${domain}: ${response.status}`);
    }

    const data = (await response.json()) as Array<{ payload?: T }>;

    if (data[0]?.payload) {
      writeLocal(domain, data[0].payload as T);
      return data[0].payload as T;
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

  if (isMysqlApiEnabled()) {
    try {
      await mysqlApiRequest<{ success: boolean }>(`/documents/${domain}`, {
        method: 'PUT',
        body: JSON.stringify({ payload }),
      });
    } catch (error) {
      console.warn(`MySQL save failed for ${domain}. Local copy retained.`, error);
    }
    return;
  }

  try {
    const response = await fetch(
      `${supabaseRestUrl}/${TABLE_NAME}`,
      {
        method: 'POST',
        headers: getSupabaseHeaders('resolution=merge-duplicates'),
        body: JSON.stringify([
          {
        domain,
        payload,
        updated_at: new Date().toISOString()
          }
        ])
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to persist ${domain}: ${response.status}`);
    }
  } catch (error) {
    console.warn(`Supabase save failed for ${domain}. Local copy retained.`, error);
  }
}
