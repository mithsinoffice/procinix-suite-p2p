import { mysqlApiRequest } from './mysql/client';
import type { ProposalInvoice } from '../data/paymentProposalData';
import type { PaymentBatch, PaymentBatchListRow } from '../data/paymentBatchData';
import type { PaymentInvoice } from '../data/paymentsData';

/**
 * Payments API client.
 *
 * All requests go through mysqlApiRequest (CLAUDE.md convention #5 — no raw
 * fetch in frontend code). mysqlApiRequest handles base URL, auth + tenant +
 * actor headers, and propagates server `details` arrays via ApiRequestError.
 *
 * Note: paths start with `/<route>` (no leading `/api`) — VITE_API_BASE_URL
 * already ends with `/api`.
 */

function actorHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  try {
    const raw =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('procinix.session.user')
        : null;
    if (raw) {
      const u = JSON.parse(raw) as { email?: string; name?: string };
      if (u.email) h['X-User-Email'] = u.email;
      if (u.name) h['X-User-Name'] = u.name;
    }
  } catch {
    /* ignore */
  }
  return h;
}

function tenantHeaders(tenantId: string, entityId?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    ...actorHeaders(),
    'X-Tenant-Id': tenantId,
  };
  if (entityId) headers['X-Entity-Id'] = entityId;
  return headers;
}

export type PaymentsDashboardPayload = {
  invoices: PaymentInvoice[];
  paidByDay: Record<string, number>;
};

export async function fetchPaymentsDashboard(
  tenantId: string,
  entityId?: string | null
): Promise<PaymentsDashboardPayload> {
  const q = new URLSearchParams({ tenantId });
  if (entityId) q.set('entityId', entityId);
  const body = await mysqlApiRequest<{ success: boolean; data: PaymentsDashboardPayload }>(
    `/ap/payments-dashboard?${q.toString()}`,
    { headers: tenantHeaders(tenantId, entityId) }
  );
  return body.data;
}

export async function fetchPayableInvoices(
  tenantId: string,
  entityId?: string | null
): Promise<ProposalInvoice[]> {
  const q = new URLSearchParams({ tenantId });
  if (entityId) q.set('entityId', entityId);
  const body = await mysqlApiRequest<{ success: boolean; data: ProposalInvoice[] }>(
    `/ap/payable-invoices?${q.toString()}`,
    { headers: tenantHeaders(tenantId, entityId) }
  );
  return body.data || [];
}

export async function fetchPaymentBatches(tenantId: string): Promise<PaymentBatchListRow[]> {
  const q = new URLSearchParams({ tenantId });
  const body = await mysqlApiRequest<{ success: boolean; data: PaymentBatchListRow[] }>(
    `/ap/payment-batches?${q.toString()}`,
    { headers: tenantHeaders(tenantId) }
  );
  return body.data || [];
}

export async function fetchPaymentBatchDetail(
  tenantId: string,
  batchId: string
): Promise<PaymentBatch> {
  const q = new URLSearchParams({ tenantId });
  const body = await mysqlApiRequest<{ success: boolean; data: PaymentBatch }>(
    `/ap/payment-batches/${encodeURIComponent(batchId)}?${q}`,
    { headers: tenantHeaders(tenantId) }
  );
  return body.data;
}

export async function createPaymentBatchApi(
  tenantId: string,
  invoiceIds: string[],
  opts?: { entityId?: string | null }
): Promise<{ id: string; batchNo: string; status: string; totalAmount: number; currency: string }> {
  const body = await mysqlApiRequest<{
    success: boolean;
    data: { id: string; batchNo: string; status: string; totalAmount: number; currency: string };
  }>(`/ap/payment-batches`, {
    method: 'POST',
    headers: tenantHeaders(tenantId, opts?.entityId),
    body: JSON.stringify({ tenantId, invoiceIds, entityId: opts?.entityId || undefined }),
  });
  return body.data;
}

export async function submitPaymentBatchApi(tenantId: string, batchId: string): Promise<void> {
  await mysqlApiRequest(`/ap/payment-batches/${encodeURIComponent(batchId)}/submit`, {
    method: 'POST',
    headers: tenantHeaders(tenantId),
    body: JSON.stringify({ tenantId }),
  });
}

export async function approvePaymentBatchApi(
  tenantId: string,
  batchId: string,
  body: { comments?: string; paymentDate?: string; paymentMode?: string }
): Promise<void> {
  await mysqlApiRequest(`/ap/payment-batches/${encodeURIComponent(batchId)}/approve`, {
    method: 'POST',
    headers: tenantHeaders(tenantId),
    body: JSON.stringify({ tenantId, ...body }),
  });
}

export async function rejectPaymentBatchApi(
  tenantId: string,
  batchId: string,
  comments: string
): Promise<void> {
  await mysqlApiRequest(`/ap/payment-batches/${encodeURIComponent(batchId)}/reject`, {
    method: 'POST',
    headers: tenantHeaders(tenantId),
    body: JSON.stringify({ tenantId, comments }),
  });
}

export async function executePaymentBatchApi(tenantId: string, batchId: string): Promise<void> {
  await mysqlApiRequest(`/ap/payment-batches/${encodeURIComponent(batchId)}/execute`, {
    method: 'POST',
    headers: tenantHeaders(tenantId),
    body: JSON.stringify({ tenantId }),
  });
}
