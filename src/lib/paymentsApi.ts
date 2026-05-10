import { mysqlApiBaseUrl, buildMysqlApiHeaders } from './mysql/client';
import type { ProposalInvoice } from '../data/paymentProposalData';
import type { PaymentBatch, PaymentBatchListRow } from '../data/paymentBatchData';
import type { PaymentInvoice } from '../data/paymentsData';

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

export function paymentApiHeaders(
  tenantId: string,
  entityId?: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    ...buildMysqlApiHeaders(),
    ...actorHeaders(),
    'X-Tenant-Id': tenantId,
  };
  if (entityId) headers['X-Entity-Id'] = entityId;
  return headers;
}

async function parseJson<T>(res: Response): Promise<T> {
  const payload = (await res.json().catch(() => null)) as T & { error?: string; success?: boolean };
  if (!res.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : `HTTP ${res.status}`);
  }
  return payload as T;
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
  const res = await fetch(`${mysqlApiBaseUrl}/ap/payments-dashboard?${q.toString()}`, {
    headers: paymentApiHeaders(tenantId, entityId),
  });
  const body = await parseJson<{ success: boolean; data: PaymentsDashboardPayload }>(res);
  return body.data;
}

export async function fetchPayableInvoices(
  tenantId: string,
  entityId?: string | null
): Promise<ProposalInvoice[]> {
  const q = new URLSearchParams({ tenantId });
  if (entityId) q.set('entityId', entityId);
  const res = await fetch(`${mysqlApiBaseUrl}/ap/payable-invoices?${q.toString()}`, {
    headers: paymentApiHeaders(tenantId, entityId),
  });
  const body = await parseJson<{ success: boolean; data: ProposalInvoice[] }>(res);
  return body.data || [];
}

export async function fetchPaymentBatches(tenantId: string): Promise<PaymentBatchListRow[]> {
  const q = new URLSearchParams({ tenantId });
  const res = await fetch(`${mysqlApiBaseUrl}/ap/payment-batches?${q.toString()}`, {
    headers: paymentApiHeaders(tenantId),
  });
  const body = await parseJson<{ success: boolean; data: PaymentBatchListRow[] }>(res);
  return body.data || [];
}

export async function fetchPaymentBatchDetail(
  tenantId: string,
  batchId: string
): Promise<PaymentBatch> {
  const q = new URLSearchParams({ tenantId });
  const res = await fetch(
    `${mysqlApiBaseUrl}/ap/payment-batches/${encodeURIComponent(batchId)}?${q}`,
    {
      headers: paymentApiHeaders(tenantId),
    }
  );
  const body = await parseJson<{ success: boolean; data: PaymentBatch }>(res);
  return body.data;
}

export async function createPaymentBatchApi(
  tenantId: string,
  invoiceIds: string[],
  opts?: { entityId?: string | null }
): Promise<{ id: string; batchNo: string; status: string; totalAmount: number; currency: string }> {
  const res = await fetch(`${mysqlApiBaseUrl}/ap/payment-batches`, {
    method: 'POST',
    headers: paymentApiHeaders(tenantId, opts?.entityId),
    body: JSON.stringify({ tenantId, invoiceIds, entityId: opts?.entityId || undefined }),
  });
  const body = await parseJson<{
    success: boolean;
    data: { id: string; batchNo: string; status: string; totalAmount: number; currency: string };
  }>(res);
  return body.data;
}

export async function submitPaymentBatchApi(tenantId: string, batchId: string): Promise<void> {
  const res = await fetch(
    `${mysqlApiBaseUrl}/ap/payment-batches/${encodeURIComponent(batchId)}/submit`,
    {
      method: 'POST',
      headers: paymentApiHeaders(tenantId),
      body: JSON.stringify({ tenantId }),
    }
  );
  await parseJson(res);
}

export async function approvePaymentBatchApi(
  tenantId: string,
  batchId: string,
  body: { comments?: string; paymentDate?: string; paymentMode?: string }
): Promise<void> {
  const res = await fetch(
    `${mysqlApiBaseUrl}/ap/payment-batches/${encodeURIComponent(batchId)}/approve`,
    {
      method: 'POST',
      headers: paymentApiHeaders(tenantId),
      body: JSON.stringify({ tenantId, ...body }),
    }
  );
  await parseJson(res);
}

export async function rejectPaymentBatchApi(
  tenantId: string,
  batchId: string,
  comments: string
): Promise<void> {
  const res = await fetch(
    `${mysqlApiBaseUrl}/ap/payment-batches/${encodeURIComponent(batchId)}/reject`,
    {
      method: 'POST',
      headers: paymentApiHeaders(tenantId),
      body: JSON.stringify({ tenantId, comments }),
    }
  );
  await parseJson(res);
}

export async function executePaymentBatchApi(tenantId: string, batchId: string): Promise<void> {
  const res = await fetch(
    `${mysqlApiBaseUrl}/ap/payment-batches/${encodeURIComponent(batchId)}/execute`,
    {
      method: 'POST',
      headers: paymentApiHeaders(tenantId),
      body: JSON.stringify({ tenantId }),
    }
  );
  await parseJson(res);
}
