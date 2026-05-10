import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../mysql.mjs', () => ({
  query: vi.fn().mockResolvedValue([]),
  withTransaction: vi.fn(async (fn) => {
    // Provide a stub conn that hands every query back to the same vi.fn() so
    // tests can assert on it. .execute() returns [rows, fields].
    const { query: q } = await import('../../mysql.mjs');
    const conn = {
      execute: async (sql, params) => {
        const rows = await q(sql, params);
        return [Array.isArray(rows) ? rows : [], []];
      },
    };
    return fn(conn);
  }),
  connExecute: vi.fn(async (conn, sql, params) => {
    const { query: q } = await import('../../mysql.mjs');
    return q(sql, params);
  }),
}));

import { query } from '../../mysql.mjs';
import { handleAdvancesRoute, validateCreateOrUpdate } from '../advances.mjs';

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
  // mockReset (not clearAllMocks) — fully drains the mockResolvedValueOnce
  // queue so a test's mocks don't leak into the next.
  vi.mocked(query).mockReset();
  vi.mocked(query).mockResolvedValue([]);
});

function tomorrowIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function yesterdayIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const validBody = () => ({
  vendorId: 'v1',
  vendorName: 'Acme',
  requesterId: 'u1',
  requesterName: 'Alice',
  purpose: 'Quarterly travel for vendor onsite',
  advanceType: 'travel',
  amount: 50000,
  requiredByDate: tomorrowIso(),
  // settlementDueDate intentionally omitted so the validate() helper skips
  // the "must be after requiredByDate" check.
});

// ── 1. POST /api/ap/advances — create ─────────────────────────────────────

describe('POST /api/ap/advances', () => {
  it('creates an advance with auto-generated ADV ref', async () => {
    // Sequence: nextAdvanceRef does INSERT IGNORE, SELECT FOR UPDATE, UPDATE.
    // Then the route does INSERT into vendor_advances, then SELECT to read back.
    vi.mocked(query)
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT IGNORE seq
      .mockResolvedValueOnce([{ ref_year: new Date().getUTCFullYear(), last_seq: 41 }]) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE seq
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT vendor_advances
      .mockResolvedValueOnce([
        {
          id: 'a1',
          advance_ref: `ADV-${new Date().getUTCFullYear()}-0042`,
          tenant_id: 'tenant-default-001',
          entity_id: 'tenant-default-001',
          vendor_id: 'v1',
          vendor_name: 'Acme',
          requester_id: 'u1',
          requester_name: 'Alice',
          purpose: 'Quarterly travel for vendor onsite',
          advance_type: 'travel',
          amount: 50000,
          currency: 'INR',
          requested_date: '2026-05-10',
          required_by_date: tomorrowIso(),
          status: 'draft',
        },
      ]); // SELECT readback

    const ctx = makeReqRes('POST', '/api/ap/advances', {
      headers: { 'x-tenant-id': 'tenant-default-001' },
      body: validBody(),
    });
    const handled = await handleAdvancesRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    expect(ctx.responses[0].payload.data.advanceRef).toMatch(/^ADV-\d{4}-\d{4}$/);
  });

  it('rejects when amount <= 0 (400)', async () => {
    const ctx = makeReqRes('POST', '/api/ap/advances', {
      headers: { 'x-tenant-id': 'tenant-default-001' },
      body: { ...validBody(), amount: 0 },
    });
    const handled = await handleAdvancesRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(400);
    expect(ctx.responses[0].payload.error).toMatch(/amount/);
  });

  it('rejects when required_by_date is in the past (400)', async () => {
    const ctx = makeReqRes('POST', '/api/ap/advances', {
      headers: { 'x-tenant-id': 'tenant-default-001' },
      body: { ...validBody(), requiredByDate: yesterdayIso() },
    });
    const handled = await handleAdvancesRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(400);
    expect(ctx.responses[0].payload.error).toMatch(/requiredByDate/);
  });
});

// ── 2. POST /api/ap/advances/:id/submit ───────────────────────────────────

describe('POST /api/ap/advances/:id/submit', () => {
  it('moves draft → pending_approval', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ status: 'draft' }])
      .mockResolvedValueOnce({ affectedRows: 1 });
    const ctx = makeReqRes('POST', '/api/ap/advances/a1/submit', {
      headers: { 'x-tenant-id': 'tenant-default-001' },
    });
    const handled = await handleAdvancesRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    expect(ctx.responses[0].payload.data.status).toBe('pending_approval');
  });
});

// ── 3. POST /api/ap/advances/:id/approve ──────────────────────────────────

describe('POST /api/ap/advances/:id/approve', () => {
  it('returns 403 for non-approver role', async () => {
    const ctx = makeReqRes('POST', '/api/ap/advances/a1/approve', {
      headers: {
        'x-tenant-id': 'tenant-default-001',
        'x-user-role': 'finance_executive',
      },
    });
    const handled = await handleAdvancesRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(403);
    expect(ctx.responses[0].payload.error).toBe('approver_role_required');
  });

  it('moves pending_approval → approved for approver role', async () => {
    // isPaymentApprover -> getSettings (3 calls) returns admin in default
    vi.mocked(query)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([
        {
          tenant_id: 'tenant-default-001',
          payment_approver_roles: 'payment_approver,cfo,admin',
        },
      ])
      .mockResolvedValueOnce([{ status: 'pending_approval' }])
      .mockResolvedValueOnce({ affectedRows: 1 });
    const ctx = makeReqRes('POST', '/api/ap/advances/a1/approve', {
      headers: {
        'x-tenant-id': 'tenant-default-001',
        'x-user-role': 'payment_approver',
        'x-user-email': 'a@example.com',
      },
    });
    const handled = await handleAdvancesRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    expect(ctx.responses[0].payload.data.status).toBe('approved');
  });
});

// ── 4. POST /api/ap/advances/:id/queue ────────────────────────────────────

describe('POST /api/ap/advances/:id/queue', () => {
  it('creates an invoice row and flips advance to queued_for_payment', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([
        {
          id: 'a1',
          advance_ref: 'ADV-2026-0001',
          tenant_id: 'tenant-default-001',
          entity_id: 'tenant-default-001',
          vendor_id: 'v1',
          vendor_name: 'Acme',
          purpose: 'Quarterly travel',
          advance_type: 'travel',
          amount: 50000,
          currency: 'INR',
          requested_date: '2026-05-10',
          required_by_date: tomorrowIso(),
          status: 'approved',
          supporting_doc_url: 'https://uploads/doc.pdf',
        },
      ])
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT into invoices
      .mockResolvedValueOnce({ affectedRows: 1 }); // UPDATE vendor_advances

    const ctx = makeReqRes('POST', '/api/ap/advances/a1/queue', {
      headers: { 'x-tenant-id': 'tenant-default-001' },
    });
    const handled = await handleAdvancesRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    expect(ctx.responses[0].payload.data.status).toBe('queued_for_payment');
    // Verify INSERT into invoices happened
    const insertCall = vi
      .mocked(query)
      .mock.calls.find((c) => /INSERT INTO invoices/.test(String(c[0])));
    expect(insertCall).toBeTruthy();
    // type='advance' and lifecycle='Queued for Payment' should be in the SQL
    expect(String(insertCall[0])).toMatch(/'advance'/);
    expect(String(insertCall[0])).toMatch(/'Queued for Payment'/);
  });

  it('fires advance_no_doc flag when type != travel and no supporting doc', async () => {
    vi.mocked(query).mockResolvedValueOnce([
      {
        id: 'a2',
        advance_ref: 'ADV-2026-0002',
        tenant_id: 'tenant-default-001',
        entity_id: 'tenant-default-001',
        vendor_id: 'v1',
        vendor_name: 'Acme',
        purpose: 'Project setup',
        advance_type: 'project',
        amount: 100000,
        currency: 'INR',
        requested_date: '2026-05-10',
        required_by_date: tomorrowIso(),
        status: 'approved',
        supporting_doc_url: null,
      },
    ]);
    // remaining queries return success
    vi.mocked(query).mockResolvedValue({ affectedRows: 1 });

    const ctx = makeReqRes('POST', '/api/ap/advances/a2/queue', {
      headers: { 'x-tenant-id': 'tenant-default-001' },
    });
    const handled = await handleAdvancesRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    const flags = ctx.responses[0].payload.data.riskFlags;
    expect(Array.isArray(flags)).toBe(true);
    expect(flags.some((f) => f.flagId === 'advance_no_doc')).toBe(true);
  });
});

// ── 5. POST /api/ap/advances/:id/settle ───────────────────────────────────

describe('POST /api/ap/advances/:id/settle', () => {
  it('updates settled_amount and sets status=settled', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ status: 'paid', amount: 80000 }])
      .mockResolvedValueOnce({ affectedRows: 1 });
    const ctx = makeReqRes('POST', '/api/ap/advances/a1/settle', {
      headers: { 'x-tenant-id': 'tenant-default-001' },
      body: { settledAmount: 75000 },
    });
    const handled = await handleAdvancesRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    expect(ctx.responses[0].payload.data.status).toBe('settled');
    expect(ctx.responses[0].payload.data.settledAmount).toBe(75000);
    const updateCall = vi
      .mocked(query)
      .mock.calls.find((c) => /UPDATE vendor_advances\s+SET status = 'settled'/.test(String(c[0])));
    expect(updateCall).toBeTruthy();
  });
});

// ── 6. GET /api/ap/advances/summary ───────────────────────────────────────

describe('GET /api/ap/advances/summary', () => {
  it('byStatus counts are correct', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([
        { status: 'draft', cnt: 2, total_amount: 100000, pending_amount: 100000 },
        { status: 'pending_approval', cnt: 3, total_amount: 300000, pending_amount: 300000 },
        { status: 'paid', cnt: 1, total_amount: 50000, pending_amount: 50000 },
        { status: 'settled', cnt: 4, total_amount: 200000, pending_amount: 0 },
      ])
      .mockResolvedValueOnce([{ cnt: 1 }]); // overdue settlement count

    const ctx = makeReqRes('GET', '/api/ap/advances/summary', {
      headers: { 'x-tenant-id': 'tenant-default-001' },
    });
    const handled = await handleAdvancesRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    const data = ctx.responses[0].payload.data;
    expect(data.total).toBe(10);
    expect(data.byStatus.draft).toBe(2);
    expect(data.byStatus.pending_approval).toBe(3);
    expect(data.byStatus.paid).toBe(1);
    expect(data.byStatus.settled).toBe(4);
    expect(data.overdueSettlement).toBe(1);
  });
});

// ── 7. validation helper coverage ─────────────────────────────────────────

describe('validateCreateOrUpdate', () => {
  it('travel advances are exempt from supporting-doc requirement', () => {
    const errors = validateCreateOrUpdate({
      vendorId: 'v1',
      vendorName: 'Acme',
      requesterId: 'u1',
      requesterName: 'Alice',
      purpose: 'Conference travel for the team',
      advanceType: 'travel',
      amount: 50000,
      requiredByDate: tomorrowIso(),
    });
    expect(errors).toEqual([]);
  });
});
