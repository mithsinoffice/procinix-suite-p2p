import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../mysql.mjs', () => ({
  query: vi.fn().mockResolvedValue([]),
  withTransaction: vi.fn(),
  connExecute: vi.fn(),
}));

import { query } from '../../mysql.mjs';
import {
  handlePaymentsRoute,
  evaluateRiskFlags,
  FLAG_CONFIG,
  isApprover,
  normaliseRole,
} from '../payments.mjs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReqRes(method, pathname, { headers = {}, body, search = '' } = {}) {
  const bodyChunks = body ? [Buffer.from(JSON.stringify(body))] : [];
  const req = {
    method,
    url: `${pathname}${search}`,
    headers: { host: 'localhost', ...headers },
    [Symbol.asyncIterator]: async function* () {
      yield* bodyChunks;
    },
  };
  const responses = [];
  const sendJson = (_res, status, payload) => responses.push({ status, payload });
  return { req, res: {}, responses, sendJson, pathname };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(query).mockResolvedValue([]);
});

// ── Pure flag evaluator ───────────────────────────────────────────────────────

describe('evaluateRiskFlags', () => {
  const baseInvoice = {
    id: 'inv-1',
    total_amount: 10000,
    invoice_date: '2026-05-01',
    po_number: null,
    invoice_type: 'invoice',
    attachment_path: null,
  };

  it('fires bank_changed when vendor bank updated_at is within the configured window', () => {
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const flags = evaluateRiskFlags({
      invoice: baseInvoice,
      vendor: { status: 'active', vendor_legal_name: 'Acme' },
      vendorBank: { updated_at: recent, account_name: 'Acme' },
      paidInvoiceCount: 5,
      vendorAvgAmount: 10000,
      recentVendorInvoices: [],
      hasMatchingGrn: true,
      approvalCount: 2,
    });
    expect(flags.some((f) => f.flagId === 'bank_changed')).toBe(true);
  });

  it('does NOT fire bank_changed when bank update is older than the window', () => {
    const oldDate = new Date(Date.now() - (FLAG_CONFIG.bankChangedDays + 5) * 24 * 60 * 60 * 1000);
    const flags = evaluateRiskFlags({
      invoice: baseInvoice,
      vendor: { status: 'active', vendor_legal_name: 'Acme' },
      vendorBank: { updated_at: oldDate, account_name: 'Acme' },
      paidInvoiceCount: 5,
      vendorAvgAmount: 10000,
      recentVendorInvoices: [],
      hasMatchingGrn: true,
      approvalCount: 2,
    });
    expect(flags.some((f) => f.flagId === 'bank_changed')).toBe(false);
  });

  it('fires duplicate_inv when same vendor + same amount exists in window', () => {
    const flags = evaluateRiskFlags({
      invoice: baseInvoice,
      vendor: { status: 'active', vendor_legal_name: 'Acme' },
      vendorBank: null,
      paidInvoiceCount: 5,
      vendorAvgAmount: 10000,
      recentVendorInvoices: [
        { id: 'inv-2', total_amount: 10000 },
        { id: 'inv-3', total_amount: 99 },
      ],
      hasMatchingGrn: true,
      approvalCount: 2,
    });
    expect(flags.some((f) => f.flagId === 'duplicate_inv')).toBe(true);
  });
});

// ── Approver role gate ────────────────────────────────────────────────────────

describe('approver role gate', () => {
  it('normaliseRole lowercases and underscores', () => {
    expect(normaliseRole('Payment Approver')).toBe('payment_approver');
    expect(normaliseRole('CFO')).toBe('cfo');
    expect(normaliseRole(undefined)).toBe('');
  });

  it('isApprover via x-user-role header', () => {
    expect(isApprover({ headers: { 'x-user-role': 'payment_approver' } })).toBe(true);
    expect(isApprover({ headers: { 'x-user-role': 'finance_executive' } })).toBe(false);
    expect(isApprover({ headers: {}, user: { role: 'admin' } })).toBe(true);
  });
});

// ── POST /api/ap/payment-queue/:id/clear-flags ────────────────────────────────

describe('handlePaymentsRoute — clear-flags', () => {
  it('rejects non-approver roles with 403', async () => {
    const ctx = makeReqRes('POST', '/api/ap/payment-queue/inv-1/clear-flags', {
      headers: { 'x-tenant-id': 'tenant-default-001', 'x-user-role': 'finance_executive' },
      body: { clearanceNote: 'looks fine' },
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(403);
    expect(ctx.responses[0].payload.error).toBe('approver_role_required');
  });

  it('requires clearanceNote (400 if empty)', async () => {
    const ctx = makeReqRes('POST', '/api/ap/payment-queue/inv-1/clear-flags', {
      headers: { 'x-tenant-id': 'tenant-default-001', 'x-user-role': 'cfo' },
      body: { clearanceNote: '   ' },
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(400);
    expect(ctx.responses[0].payload.error).toBe('clearanceNote required');
  });

  it('clears flags and releases hold for approver role', async () => {
    vi.mocked(query).mockResolvedValue({ affectedRows: 1 });
    const ctx = makeReqRes('POST', '/api/ap/payment-queue/inv-1/clear-flags', {
      headers: {
        'x-tenant-id': 'tenant-default-001',
        'x-user-role': 'payment_approver',
        'x-user-email': 'approver@example.com',
      },
      body: { clearanceNote: 'verified bank by phone' },
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    expect(ctx.responses[0].payload.data.clearedBy).toBe('approver@example.com');
    // Two UPDATEs: clear flags, release hold
    expect(vi.mocked(query)).toHaveBeenCalledTimes(2);
  });
});

// ── POST /api/ap/payment-queue/:id/due-date ───────────────────────────────────

describe('handlePaymentsRoute — due-date', () => {
  it('logs to invoice_audit_log on successful due-date change', async () => {
    // 1st query — SELECT current due_date (returns existing row)
    // 2nd query — UPDATE invoices
    // 3rd query — INSERT invoice_audit_log
    vi.mocked(query)
      .mockResolvedValueOnce([{ due_date: '2026-05-15' }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });

    const ctx = makeReqRes('POST', '/api/ap/payment-queue/inv-99/due-date', {
      headers: {
        'x-tenant-id': 'tenant-default-001',
        'x-user-email': 'editor@example.com',
      },
      body: { newDue: '2026-06-01', reason: 'vendor requested extension' },
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    expect(ctx.responses[0].payload.data.newDue).toBe('2026-06-01');
    // The audit-log INSERT call (3rd) should reference invoice_audit_log
    const auditCall = vi
      .mocked(query)
      .mock.calls.find((c) => String(c[0]).includes('invoice_audit_log'));
    expect(auditCall).toBeTruthy();
    expect(auditCall[1]).toEqual(
      expect.arrayContaining(['2026-05-15', '2026-06-01', 'vendor requested extension'])
    );
  });

  it('returns 400 when reason is missing', async () => {
    const ctx = makeReqRes('POST', '/api/ap/payment-queue/inv-99/due-date', {
      headers: { 'x-tenant-id': 'tenant-default-001' },
      body: { newDue: '2026-06-01' },
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(400);
    expect(ctx.responses[0].payload.error).toBe('reason required');
  });
});

// ── GET /api/ap/payment-forecast ─────────────────────────────────────────────

describe('handlePaymentsRoute — payment-forecast', () => {
  const TENANT = 'tenant-default-001';

  function forecastRequest({ from, to, groupBy, status, rows } = {}) {
    if (rows !== undefined) {
      vi.mocked(query).mockResolvedValueOnce(rows);
    }
    const search =
      '?' +
      [
        `tenantId=${TENANT}`,
        from ? `from=${from}` : '',
        to ? `to=${to}` : '',
        groupBy ? `groupBy=${groupBy}` : '',
        status ? `status=${status}` : '',
      ]
        .filter(Boolean)
        .join('&');
    return makeReqRes('GET', '/api/ap/payment-forecast', {
      headers: { 'x-tenant-id': TENANT },
      search,
    });
  }

  function fakeInvoiceRow(over = {}) {
    return {
      id: over.id ?? 'inv-1',
      invoice_number: over.invoice_number ?? 'INV-001',
      invoice_date: over.invoice_date ?? '2026-05-01',
      due_date: over.due_date ?? '2026-05-15',
      vendor_name: over.vendor_name ?? 'Acme Ltd',
      vendor_id: over.vendor_id ?? 'v1',
      vendor_gstin: over.vendor_gstin ?? '',
      po_number: over.po_number ?? null,
      currency: 'INR',
      total_amount: over.total_amount ?? 100000,
      lifecycle_state: over.lifecycle_state ?? 'Queued for Payment',
      approval_priority: over.approval_priority ?? 'normal',
      entity_id: 'e1',
      invoice_type: over.invoice_type ?? '',
      is_statutory: over.is_statutory ?? 0,
      cost_centre_name: over.cost_centre_name ?? '',
      is_msme: over.is_msme ?? 0,
      vendor_legal_name: over.vendor_legal_name ?? over.vendor_name ?? 'Acme Ltd',
      vendor_pan: '',
      payment_total: over.payment_total ?? 0,
      payment_count: 0,
    };
  }

  it('returns 400 when from or to is missing', async () => {
    const ctx = forecastRequest({ to: '2026-06-01' });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(400);
    expect(ctx.responses[0].payload.error).toMatch(/from and to/);
  });

  it('returns 400 when from > to', async () => {
    const ctx = forecastRequest({ from: '2026-07-01', to: '2026-06-01' });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(400);
    expect(ctx.responses[0].payload.error).toMatch(/on or before/);
  });

  it('groupBy=vendor returns rows keyed by vendor name', async () => {
    const ctx = forecastRequest({
      from: '2026-05-01',
      to: '2026-05-31',
      groupBy: 'vendor',
      rows: [
        fakeInvoiceRow({ id: '1', vendor_name: 'Alpha Co', total_amount: 50000 }),
        fakeInvoiceRow({ id: '2', vendor_name: 'Alpha Co', total_amount: 30000 }),
        fakeInvoiceRow({ id: '3', vendor_name: 'Beta Inc', total_amount: 70000 }),
      ],
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    const { table } = ctx.responses[0].payload;
    expect(table).toHaveLength(2);
    const alpha = table.find((r) => r.groupValue === 'Alpha Co');
    const beta = table.find((r) => r.groupValue === 'Beta Inc');
    expect(alpha.count).toBe(2);
    expect(alpha.totalAmount).toBe(80000);
    expect(beta.count).toBe(1);
    expect(beta.totalAmount).toBe(70000);
  });

  it('groupBy=department aggregates correctly', async () => {
    const ctx = forecastRequest({
      from: '2026-05-01',
      to: '2026-05-31',
      groupBy: 'department',
      rows: [
        fakeInvoiceRow({ id: '1', cost_centre_name: 'IT', total_amount: 50000 }),
        fakeInvoiceRow({ id: '2', cost_centre_name: 'IT', total_amount: 25000 }),
        fakeInvoiceRow({ id: '3', cost_centre_name: 'HR', total_amount: 10000 }),
        fakeInvoiceRow({ id: '4', cost_centre_name: '', total_amount: 5000 }),
      ],
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    const { table } = ctx.responses[0].payload;
    const it = table.find((r) => r.groupValue === 'IT');
    const hr = table.find((r) => r.groupValue === 'HR');
    const unassigned = table.find((r) => r.groupValue === 'Unassigned');
    expect(it.count).toBe(2);
    expect(it.totalAmount).toBe(75000);
    expect(hr.totalAmount).toBe(10000);
    expect(unassigned.totalAmount).toBe(5000);
  });

  it('only requests invoices with the right lifecycle states', async () => {
    const ctx = forecastRequest({
      from: '2026-05-01',
      to: '2026-05-31',
      rows: [],
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    const sqlCall = vi.mocked(query).mock.calls[0];
    const sqlText = String(sqlCall[0]);
    expect(sqlText).toMatch(/lifecycle_state IN/);
    const params = sqlCall[1];
    expect(params).toEqual(expect.arrayContaining(['Queued for Payment', 'Exception Hold']));
    expect(params).not.toEqual(expect.arrayContaining(['Paid']));
    expect(params).not.toEqual(expect.arrayContaining(['Rejected']));
  });

  it('msmeOutflow only counts vendors where is_msme = 1', async () => {
    const ctx = forecastRequest({
      from: '2026-05-01',
      to: '2026-05-31',
      groupBy: 'vendor',
      rows: [
        fakeInvoiceRow({ id: '1', vendor_name: 'MSME Co', is_msme: 1, total_amount: 60000 }),
        fakeInvoiceRow({ id: '2', vendor_name: 'Big Corp', is_msme: 0, total_amount: 200000 }),
        fakeInvoiceRow({ id: '3', vendor_name: 'MSME Co', is_msme: 1, total_amount: 40000 }),
      ],
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    const { meta } = ctx.responses[0].payload;
    expect(meta.totalOutflow).toBe(300000);
    expect(meta.msmeOutflow).toBe(100000);
  });
});

// ── Banking — payout file generator + UTR parser + JV creator ────────────────

import { generatePayoutFile } from '../../services/payments/payoutFileGenerator.mjs';
import { parseUTRFile } from '../../services/payments/utrIngestParser.mjs';
import { createPaymentJV } from '../../services/payments/jvCreator.mjs';
import { createBatchFromInvoices } from '../payments.mjs';

describe('generatePayoutFile — HDFC', () => {
  it('produces correct header, pipe delimiter and DD/MM/YYYY date', async () => {
    const file = await generatePayoutFile(
      { batch_ref: 'BATCH-20260510-001', payment_date: new Date('2026-05-09T00:00:00Z') },
      [
        {
          bank_account_no: '123456789012',
          ifsc_code: 'HDFC0001234',
          vendor_name: 'Acme Pvt Ltd',
          amount: 87500,
          payment_mode: 'NEFT',
          narration: 'INV-0449 payment',
          client_ref: 'PTPL-20260509-001',
        },
      ],
      'HDFC_BULK'
    );
    expect(file.filename).toBe('HDFC_BULK_20260509_BATCH-20260510-001.txt');
    expect(file.mimeType).toBe('text/plain');
    const lines = file.content.split(/\r\n|\n/).filter(Boolean);
    expect(lines[0]).toBe(
      'PAYMENT_DATE|BENE_ACCOUNT_NUMBER|BENE_IFSC|BENE_NAME|AMOUNT|PAYMENT_MODE|NARRATION|CLIENT_REF'
    );
    const fields = lines[1].split('|');
    expect(fields[0]).toBe('09/05/2026');
    expect(fields[1]).toBe('123456789012');
    expect(fields[2]).toBe('HDFC0001234');
    expect(fields[3]).toBe('Acme Pvt Ltd');
    expect(fields[4]).toBe('87500.00');
    expect(fields[7]).toBe('PTPL-20260509-001');
  });
});

describe('generatePayoutFile — ICICI', () => {
  it('produces correct header, comma delimiter and no date column in rows', async () => {
    const file = await generatePayoutFile(
      {
        batch_ref: 'BATCH-20260510-002',
        payment_date: new Date('2026-05-09T00:00:00Z'),
        debit_account_number: '9876543210',
      },
      [
        {
          bank_account_no: '123456789012',
          ifsc_code: 'ICIC0001234',
          vendor_name: 'Beta Inc',
          amount: 25000,
          payment_mode: 'RTGS',
          narration: 'invoice 0042',
          client_ref: 'PTPL-20260509-002',
        },
      ],
      'ICICI_BULK'
    );
    expect(file.filename).toBe('ICICI_BULK_20260509_BATCH-20260510-002.csv');
    const lines = file.content.split(/\r\n|\n/).filter(Boolean);
    expect(lines[0]).toBe(
      'Debit Account No,Beneficiary Account No,Beneficiary IFSC,Beneficiary Name,Amount,Payment Mode,Remarks,Unique Reference No'
    );
    const fields = lines[1].split(',');
    // First field is the debit account, not a date
    expect(fields[0]).toBe('9876543210');
    expect(fields[1]).toBe('123456789012');
    expect(fields[2]).toBe('ICIC0001234');
    expect(fields[4]).toBe('25000.00');
    expect(fields[5]).toBe('RTGS');
    expect(fields[7]).toBe('PTPL-20260509-002');
    // Sanity: no DD/MM/YYYY token anywhere in row
    expect(lines[1]).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('parseUTRFile — HDFC pipe-delimited', () => {
  it('maps CLIENT_REF → utr and normalises SUCCESS to confirmed', async () => {
    const content = [
      'CLIENT_REF|UTR_NUMBER|STATUS|AMOUNT|TXNDATE|REMARKS',
      'PTPL-20260509-001|UTR2026050900012345|SUCCESS|87500.00|09/05/2026|OK',
      'PTPL-20260509-002|UTR2026050900067890|FAILED|25000.00|09/05/2026|insufficient funds',
    ].join('\n');
    const rows = await parseUTRFile(content, 'auto');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      clientRef: 'PTPL-20260509-001',
      utr: 'UTR2026050900012345',
      status: 'confirmed',
      amount: 87500,
    });
    expect(rows[1].status).toBe('failed');
  });
});

describe('parseUTRFile — ICICI comma-delimited', () => {
  it('parses CSV with same normalisation', async () => {
    const content = [
      'Unique Reference No,UTR,Status,Amount,Date,Remarks',
      'PTPL-20260509-001,UTR2026050900099999,PROCESSED,12000.00,09/05/2026,ok',
      'PTPL-20260509-002,UTR2026050900088888,Pending,5000.00,09/05/2026,under review',
    ].join('\n');
    const rows = await parseUTRFile(content, 'auto');
    expect(rows).toHaveLength(2);
    expect(rows[0].status).toBe('confirmed');
    expect(rows[1].status).toBe('failed');
    expect(rows[0].utr).toBe('UTR2026050900099999');
  });
});

describe('POST /api/ap/banking/batches — guards', () => {
  it('rejects invoices with active flags (400)', async () => {
    // 1. lookup bank account → returns one row
    // 2. lookup invoices → one row with active_flags > 0
    vi.mocked(query)
      .mockResolvedValueOnce([
        {
          id: 'acct-1',
          tenant_id: 'tenant-default-001',
          integration_mode: 'manual',
          payout_format: 'HDFC_BULK',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'inv-1',
          invoice_number: 'INV-1',
          vendor_name: 'X',
          vendor_id: 'v1',
          total_amount: 1000,
          lifecycle_state: 'Queued for Payment',
          payment_total: 0,
          active_flags: 2,
        },
      ]);
    await expect(
      createBatchFromInvoices({
        tenantId: 'tenant-default-001',
        bankAccountId: 'acct-1',
        invoiceIds: ['inv-1'],
        paymentMode: 'NEFT',
      })
    ).rejects.toMatchObject({ message: 'invoice_has_active_flags', statusCode: 400 });
  });

  it('rejects invoices not in Queued for Payment (400)', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([
        {
          id: 'acct-1',
          tenant_id: 'tenant-default-001',
          integration_mode: 'manual',
          payout_format: 'HDFC_BULK',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'inv-1',
          invoice_number: 'INV-1',
          vendor_name: 'X',
          vendor_id: 'v1',
          total_amount: 1000,
          lifecycle_state: 'Processed',
          payment_total: 0,
          active_flags: 0,
        },
      ]);
    await expect(
      createBatchFromInvoices({
        tenantId: 'tenant-default-001',
        bankAccountId: 'acct-1',
        invoiceIds: ['inv-1'],
        paymentMode: 'NEFT',
      })
    ).rejects.toMatchObject({ message: 'invoice_not_queued_for_payment', statusCode: 400 });
  });
});

describe('POST /api/ap/banking/batches/:id/approve — role gate', () => {
  it('returns 403 for non-approver role', async () => {
    const ctx = makeReqRes('POST', '/api/ap/banking/batches/batch-1/approve', {
      headers: {
        'x-tenant-id': 'tenant-default-001',
        'x-user-role': 'finance_executive',
      },
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(403);
    expect(ctx.responses[0].payload.error).toBe('approver_role_required');
  });
});

// ── Settings — endpoints + live evaluator wiring ─────────────────────────────

describe('GET /api/ap/payment-settings', () => {
  it('returns default values when no custom row exists', async () => {
    // Empty SELECT → service inserts default row → SELECT returns it
    vi.mocked(query)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([
        {
          id: 'sett-1',
          tenant_id: 'tenant-default-001',
          flag_bank_changed_days: 30,
          flag_duplicate_inv_days: 30,
          flag_amount_anomaly_multiplier: 2.5,
          flag_inv_splitting_count: 3,
          flag_inv_splitting_days: 7,
          flag_dual_approval_threshold: 200000,
          flag_round_number_min: 50000,
          flag_round_number_divisor: 1000,
          business_hours_start: '09:00:00',
          business_hours_end: '19:00:00',
          business_days: 'MON,TUE,WED,THU,FRI',
          default_payment_mode: 'NEFT',
          rtgs_threshold: 200000,
          msme_warning_days: 7,
          payment_approver_roles: 'payment_approver,cfo,admin',
          default_payout_format: 'HDFC_BULK',
        },
      ]);
    const ctx = makeReqRes('GET', '/api/ap/payment-settings', {
      headers: { 'x-tenant-id': 'tenant-default-001' },
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    const data = ctx.responses[0].payload.data;
    expect(data.flagBankChangedDays).toBe(30);
    expect(data.flagAmountAnomalyMultiplier).toBe(2.5);
    expect(data.defaultPayoutFormat).toBe('HDFC_BULK');
  });
});

describe('PUT /api/ap/payment-settings', () => {
  it('returns 403 for non-admin role', async () => {
    const ctx = makeReqRes('PUT', '/api/ap/payment-settings', {
      headers: { 'x-tenant-id': 'tenant-default-001', 'x-user-role': 'payment_approver' },
      body: { flagBankChangedDays: 60 },
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(403);
    expect(ctx.responses[0].payload.error).toBe('admin_role_required');
  });

  it('updates flag_bank_changed_days correctly', async () => {
    // updateSettings flow: getSettings (3 queries: select empty, insert, select-after),
    // then UPDATE, then getSettings again (select returns row).
    vi.mocked(query)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ tenant_id: 'tenant-default-001', flag_bank_changed_days: 30 }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ tenant_id: 'tenant-default-001', flag_bank_changed_days: 60 }]);
    const ctx = makeReqRes('PUT', '/api/ap/payment-settings', {
      headers: { 'x-tenant-id': 'tenant-default-001', 'x-user-role': 'admin' },
      body: { flagBankChangedDays: 60 },
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    expect(ctx.responses[0].payload.data.flagBankChangedDays).toBe(60);
    // The UPDATE call should set flag_bank_changed_days = 60
    const updateCall = vi
      .mocked(query)
      .mock.calls.find((c) => String(c[0]).startsWith('UPDATE payment_settings'));
    expect(updateCall).toBeTruthy();
    expect(updateCall[0]).toMatch(/flag_bank_changed_days/);
    expect(updateCall[1]).toContain(60);
  });
});

describe('POST /api/ap/payment-settings/reset', () => {
  it('issues an UPDATE that sets every column back to defaults', async () => {
    // getSettings (auto-create) + UPDATE all + final getSettings (returns defaults)
    vi.mocked(query)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ tenant_id: 'tenant-default-001', flag_bank_changed_days: 30 }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([
        {
          tenant_id: 'tenant-default-001',
          flag_bank_changed_days: 30,
          flag_amount_anomaly_multiplier: 2.5,
          rtgs_threshold: 200000,
        },
      ]);
    const ctx = makeReqRes('POST', '/api/ap/payment-settings/reset', {
      headers: { 'x-tenant-id': 'tenant-default-001', 'x-user-role': 'admin' },
    });
    const handled = await handlePaymentsRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    const updateCall = vi
      .mocked(query)
      .mock.calls.find((c) => String(c[0]).startsWith('UPDATE payment_settings'));
    expect(updateCall).toBeTruthy();
    // Should hit every settings column
    expect(updateCall[0]).toMatch(/flag_bank_changed_days/);
    expect(updateCall[0]).toMatch(/rtgs_threshold/);
    expect(updateCall[0]).toMatch(/default_payout_format/);
  });
});

describe('evaluateRiskFlags — live settings overrides', () => {
  it('uses DB-loaded bank_changed_days threshold, not hardcoded 30', async () => {
    // Build settings with a 5-day window — a 10-day-old bank change should NOT fire
    const settings = {
      flagBankChangedDays: 5,
      flagDuplicateInvDays: 30,
      flagAmountAnomalyMultiplier: 2.5,
      flagInvSplittingCount: 3,
      flagInvSplittingDays: 7,
      flagDualApprovalThreshold: 200000,
      flagRoundNumberMin: 50000,
      flagRoundNumberDivisor: 1000,
      businessHoursStart: '09:00:00',
      businessHoursEnd: '19:00:00',
    };
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const flags = evaluateRiskFlags({
      invoice: { id: 'i', total_amount: 1000, invoice_date: '2026-05-01' },
      vendor: { status: 'active', vendor_legal_name: 'Acme' },
      vendorBank: { updated_at: tenDaysAgo, account_name: 'Acme' },
      paidInvoiceCount: 5,
      vendorAvgAmount: 1000,
      recentVendorInvoices: [],
      hasMatchingGrn: true,
      approvalCount: 2,
      settings,
    });
    expect(flags.some((f) => f.flagId === 'bank_changed')).toBe(false);

    // Same case but with 15-day setting → should fire
    const flags2 = evaluateRiskFlags({
      invoice: { id: 'i', total_amount: 1000, invoice_date: '2026-05-01' },
      vendor: { status: 'active', vendor_legal_name: 'Acme' },
      vendorBank: { updated_at: tenDaysAgo, account_name: 'Acme' },
      paidInvoiceCount: 5,
      vendorAvgAmount: 1000,
      recentVendorInvoices: [],
      hasMatchingGrn: true,
      approvalCount: 2,
      settings: { ...settings, flagBankChangedDays: 15 },
    });
    expect(flags2.some((f) => f.flagId === 'bank_changed')).toBe(true);
  });

  it('uses DB-loaded amount_anomaly multiplier, not hardcoded 2.5', async () => {
    // Tight multiplier → 2× should fire
    const flagsTight = evaluateRiskFlags({
      invoice: { id: 'i', total_amount: 2000, invoice_date: '2026-05-01' },
      vendor: { status: 'active', vendor_legal_name: 'Acme' },
      vendorBank: null,
      paidInvoiceCount: 5,
      vendorAvgAmount: 1000,
      recentVendorInvoices: [],
      hasMatchingGrn: true,
      approvalCount: 2,
      settings: {
        flagBankChangedDays: 30,
        flagDuplicateInvDays: 30,
        flagAmountAnomalyMultiplier: 1.5,
        flagInvSplittingCount: 3,
        flagInvSplittingDays: 7,
        flagDualApprovalThreshold: 200000,
        flagRoundNumberMin: 50000,
        flagRoundNumberDivisor: 1000,
        businessHoursStart: '09:00:00',
        businessHoursEnd: '19:00:00',
      },
    });
    expect(flagsTight.some((f) => f.flagId === 'amount_anomaly')).toBe(true);

    // Loose multiplier → 2× should NOT fire
    const flagsLoose = evaluateRiskFlags({
      invoice: { id: 'i', total_amount: 2000, invoice_date: '2026-05-01' },
      vendor: { status: 'active', vendor_legal_name: 'Acme' },
      vendorBank: null,
      paidInvoiceCount: 5,
      vendorAvgAmount: 1000,
      recentVendorInvoices: [],
      hasMatchingGrn: true,
      approvalCount: 2,
      settings: {
        flagBankChangedDays: 30,
        flagDuplicateInvDays: 30,
        flagAmountAnomalyMultiplier: 5,
        flagInvSplittingCount: 3,
        flagInvSplittingDays: 7,
        flagDualApprovalThreshold: 200000,
        flagRoundNumberMin: 50000,
        flagRoundNumberDivisor: 1000,
        businessHoursStart: '09:00:00',
        businessHoursEnd: '19:00:00',
      },
    });
    expect(flagsLoose.some((f) => f.flagId === 'amount_anomaly')).toBe(false);
  });
});

describe('createPaymentJV', () => {
  it('emits one DR (AP GL) and one CR (Bank GL) per item', async () => {
    // tableExists query → 0 rows (no journal_entries table)
    // audit-log INSERT
    vi.mocked(query).mockResolvedValueOnce([]).mockResolvedValueOnce({ affectedRows: 1 });
    const result = await createPaymentJV(
      { batch_ref: 'BATCH-X', payment_date: new Date('2026-05-09T00:00:00Z') },
      [
        { invoice_id: 'inv-1', invoice_ref: 'INV-1', vendor_name: 'A', amount: 1000 },
        { invoice_id: 'inv-2', invoice_ref: 'INV-2', vendor_name: 'B', amount: 2500 },
      ],
      'tenant-default-001'
    );
    expect(result.jvRef).toBe('JV-PAY-20260509-BATCH-X');
    expect(result.entries).toHaveLength(4);
    expect(result.entries[0]).toMatchObject({ type: 'DR', glCode: '2100', amount: 1000 });
    expect(result.entries[1]).toMatchObject({ type: 'CR', glCode: '1100', amount: 1000 });
    expect(result.entries[2]).toMatchObject({ type: 'DR', glCode: '2100', amount: 2500 });
    expect(result.entries[3]).toMatchObject({ type: 'CR', glCode: '1100', amount: 2500 });
  });
});
