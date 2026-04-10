import { isMysqlApiEnabled, mysqlApiRequest } from './mysql/client';
import type { VendorGovernanceSummaryApiPayload } from '../types/vendorGovernance';

/**
 * Optional aggregated governance metrics from the API.
 * Implement `GET /vendor-governance/summary` on the MySQL backend (see `VendorGovernanceSummaryApiPayload`).
 * When missing or offline, the desk uses client-side aggregation from synced vendor + invitation documents.
 */
export async function fetchVendorGovernanceSummary(
  entityId?: string | null
): Promise<VendorGovernanceSummaryApiPayload | null> {
  if (!isMysqlApiEnabled()) {
    return null;
  }
  try {
    const q =
      entityId && entityId !== 'CONSOLIDATED'
        ? `?entityId=${encodeURIComponent(entityId)}`
        : '';
    const res = await mysqlApiRequest<{ success: boolean; data?: VendorGovernanceSummaryApiPayload }>(
      `/vendor-governance/summary${q}`
    );
    return res.success && res.data ? res.data : null;
  } catch {
    return null;
  }
}
