import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock mysql.mjs so `query` is observable.
vi.mock('../../mysql.mjs', () => ({
  query: vi.fn().mockResolvedValue([]),
  withTransaction: vi.fn(),
  connExecute: vi.fn(),
  getMysqlPool: vi.fn(() => ({ execute: vi.fn() })),
}));

// Approvals sync mock — the dispatcher (mocked below) is the only call site
// that touches the sync, but ensureInvoiceApproval still imports it.
vi.mock('../../services/approvals/approvalService.mjs', () => ({
  invalidatePendingApprovalsSync: vi.fn(),
}));

// Workflow dispatcher is the new dispatcher target. Tests assert on what
// ensureInvoiceApproval passes through; the engine itself is exercised by
// smokeWorkflowE2E.mjs end-to-end.
vi.mock('../../services/workflow/dispatcher.mjs', () => ({
  enqueueApprovalFromWorkflow: vi.fn(async () => ({
    success: true,
    approvalId: 'mock-approval-id',
  })),
}));

// Heavyweight match agent stub.
vi.mock('../../services/agents/matchAgent.mjs', () => ({
  processMatch: vi.fn(),
}));

import { query } from '../../mysql.mjs';
import { invalidatePendingApprovalsSync } from '../../services/approvals/approvalService.mjs';
import { enqueueApprovalFromWorkflow } from '../../services/workflow/dispatcher.mjs';
import { ensureInvoiceApproval, backfillPendingInvoiceApprovals } from '../invoices.mjs';

beforeEach(() => {
  vi.mocked(query).mockReset();
  vi.mocked(query).mockResolvedValue([]);
  vi.mocked(invalidatePendingApprovalsSync).mockReset();
  vi.mocked(enqueueApprovalFromWorkflow).mockReset();
  vi.mocked(enqueueApprovalFromWorkflow).mockResolvedValue({
    success: true,
    approvalId: 'mock-approval-id',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ensureInvoiceApproval', () => {
  it('skips when invoiceId is missing', async () => {
    const result = await ensureInvoiceApproval('', 'user-1');
    expect(result.skipped).toBe(true);
    expect(query).not.toHaveBeenCalled();
    expect(enqueueApprovalFromWorkflow).not.toHaveBeenCalled();
  });

  it('routes a fresh invoice through the workflow dispatcher', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([]) // SELECT existing → empty
      .mockResolvedValueOnce([
        {
          id: 'invoice-uuid-1',
          invoice_number: 'INV-0001',
          vendor_name: 'Acme',
          vendor_id: 'V-1',
          total_amount: '12500',
          currency: 'INR',
          po_number: null,
          tenant_id: 'tenant-default-001',
          validated_by: 'user-42',
          bill_to_entity: 'Procinix',
        },
      ]); // SELECT invoice payload

    const result = await ensureInvoiceApproval('invoice-uuid-1', 'user-42');
    expect(result.action).toBe('inserted');
    expect(result.approvalId).toBe('mock-approval-id');

    const dispatchCall = vi.mocked(enqueueApprovalFromWorkflow).mock.calls[0][0];
    expect(dispatchCall.documentType).toBe('non_po_invoice'); // no po_number
    expect(dispatchCall.documentId).toBe('invoice-uuid-1');
    expect(dispatchCall.submittedBy).toBe('user-42');
    expect(dispatchCall.tenantId).toBe('tenant-default-001');
    expect(dispatchCall.documentPayload.invoice_amount).toBe(12500);
  });

  it('routes po-matched invoice as documentType=ap_invoice', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'invoice-uuid-2',
          invoice_number: 'INV-0002',
          vendor_name: 'Beta',
          vendor_id: 'V-2',
          total_amount: '5000',
          currency: 'INR',
          po_number: 'PO-1',
          tenant_id: 'tenant-default-001',
          validated_by: null,
          bill_to_entity: null,
        },
      ]);

    await ensureInvoiceApproval('invoice-uuid-2', 'user-9');
    expect(vi.mocked(enqueueApprovalFromWorkflow).mock.calls[0][0].documentType).toBe('ap_invoice');
  });

  it('returns noop_existing when a pending approval already exists', async () => {
    vi.mocked(query).mockResolvedValueOnce([{ id: 'existing-approval-id' }]);

    const result = await ensureInvoiceApproval('invoice-uuid-3', 'user-99');
    expect(result.action).toBe('noop_existing');
    expect(result.approvalId).toBe('existing-approval-id');
    expect(enqueueApprovalFromWorkflow).not.toHaveBeenCalled();
  });

  it('surfaces blocked result from the dispatcher (HTTP 422 path)', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'invoice-uuid-4',
          invoice_number: 'INV-X',
          vendor_name: 'V',
          vendor_id: 'V-4',
          total_amount: '0',
          currency: 'INR',
          po_number: null,
          tenant_id: 'tenant-default-001',
          validated_by: 'user-x',
          bill_to_entity: null,
        },
      ]);
    vi.mocked(enqueueApprovalFromWorkflow).mockResolvedValueOnce({
      blocked: true,
      reason: 'No independent approver available',
    });
    const result = await ensureInvoiceApproval('invoice-uuid-4', 'user-x');
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/independent approver/);
  });
});

describe('backfillPendingInvoiceApprovals', () => {
  it('iterates pending invoices and routes each through the dispatcher', async () => {
    // 1st query: SELECT pending invoices
    vi.mocked(query).mockResolvedValueOnce([
      {
        id: 'inv-back-1',
        validated_by: null,
        lifecycle_state: 'Under Verification',
        status: 'pending_approval',
      },
      {
        id: 'inv-back-2',
        validated_by: 'user-b',
        lifecycle_state: 'Under Verification',
        status: 'pending_approval',
      },
    ]);
    // For each invoice ensureInvoiceApproval does: SELECT existing (empty),
    // SELECT invoice payload. 2 invoices × 2 = 4 follow-up queries.
    const stubInvoice = (id, validatedBy) => ({
      id,
      invoice_number: id,
      vendor_name: 'V',
      vendor_id: 'V-?',
      total_amount: '0',
      currency: 'INR',
      po_number: null,
      tenant_id: 'tenant-default-001',
      validated_by: validatedBy,
      bill_to_entity: null,
    });
    vi.mocked(query)
      .mockResolvedValueOnce([]) // existing → empty
      .mockResolvedValueOnce([stubInvoice('inv-back-1', null)])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([stubInvoice('inv-back-2', 'user-b')]);

    const summary = await backfillPendingInvoiceApprovals();
    expect(summary.scanned).toBe(2);
    expect(summary.inserted).toBe(2);
    expect(summary.errors).toBe(0);
    // Dispatcher called twice.
    expect(enqueueApprovalFromWorkflow).toHaveBeenCalledTimes(2);
    expect(vi.mocked(enqueueApprovalFromWorkflow).mock.calls[0][0].submittedBy).toBe('1');
    expect(vi.mocked(enqueueApprovalFromWorkflow).mock.calls[1][0].submittedBy).toBe('user-b');
  });

  it('hits the noop_existing branch when an approvals row already exists', async () => {
    vi.mocked(query).mockResolvedValueOnce([{ id: 'inv-back-3', validated_by: null }]);
    vi.mocked(query).mockResolvedValueOnce([{ id: 'pre-existing-approval' }]); // existing

    const summary = await backfillPendingInvoiceApprovals();
    expect(summary.scanned).toBe(1);
    // backfill counter classifies noop_existing as 'updated' to mirror the
    // old behaviour (one queue row covered).
    expect(summary.updated + summary.inserted).toBe(1);
    expect(enqueueApprovalFromWorkflow).not.toHaveBeenCalled();
  });

  it('returns a zero summary when the invoices read fails (non-fatal)', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('schema not provisioned'));
    const summary = await backfillPendingInvoiceApprovals();
    expect(summary).toEqual({ scanned: 0, inserted: 0, updated: 0, errors: 0 });
  });
});
