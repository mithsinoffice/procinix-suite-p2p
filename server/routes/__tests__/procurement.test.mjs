import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../mysql.mjs', () => ({
  query: vi.fn().mockResolvedValue([]),
  withTransaction: vi.fn(async (fn) => {
    const { query: q } = await import('../../mysql.mjs');
    const conn = {
      execute: async (sql, params) => {
        const rows = await q(sql, params);
        return [Array.isArray(rows) ? rows : [], []];
      },
    };
    return fn(conn);
  }),
  connExecute: vi.fn(async (_conn, sql, params) => {
    const { query: q } = await import('../../mysql.mjs');
    return q(sql, params);
  }),
}));

vi.mock('../payments.mjs', () => ({
  isPaymentApprover: vi.fn().mockResolvedValue(false),
}));

import { query } from '../../mysql.mjs';
import { isPaymentApprover } from '../payments.mjs';
import {
  handleProcurementRoute,
  computeLineGst,
  evaluatePOMatch,
  nextDocRef,
} from '../procurement.mjs';

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
  vi.mocked(query).mockReset();
  vi.mocked(query).mockResolvedValue([]);
  vi.mocked(isPaymentApprover).mockReset();
  vi.mocked(isPaymentApprover).mockResolvedValue(false);
});

// Sequence of mock returns for a successful nextDocRef + INSERT-readback flow.
// Each test below builds its own sequence.

const TENANT = 'tenant-default-001';
const ENTITY_ID = 'entity-ptpl-001';

// ── 1. PR create: generates correct ref PR-PTPL-2026-NNNN ────────────────────

describe('POST /api/procurement/prs (create)', () => {
  it('1. generates a correctly-formatted PR ref (PR-PTPL-{year}-NNNN)', async () => {
    const year = new Date().getUTCFullYear();
    vi.mocked(query)
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT ON DUPLICATE seq
      .mockResolvedValueOnce([{ last_seq: 0 }]) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE seq
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT purchase_requests
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT line item
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT audit
      .mockResolvedValueOnce([
        {
          id: 'pr1',
          pr_ref: `PR-PTPL-${year}-0001`,
          tenant_id: TENANT,
          entity_id: ENTITY_ID,
          entity_code: 'PTPL',
          pr_type: 'regular',
          requester_id: 'u1',
          requester_name: 'Alice',
          status: 'draft',
          total_amount: 100,
          total_gst: 18,
        },
      ]) // SELECT readback header
      .mockResolvedValueOnce([]); // SELECT readback items

    const ctx = makeReqRes('POST', '/api/procurement/prs', {
      headers: { 'x-tenant-id': TENANT },
      body: {
        entityId: ENTITY_ID,
        entityCode: 'PTPL',
        prType: 'regular',
        requesterId: 'u1',
        requesterName: 'Alice',
        lineItems: [
          {
            itemType: 'material',
            itemCode: 'A1',
            itemDescription: 'Widget',
            vendorId: 'v1',
            vendorName: 'Acme',
            quantity: 10,
            unitPrice: 10,
            gstRate: 18,
          },
        ],
      },
    });
    const handled = await handleProcurementRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(handled).toBe(true);
    expect(ctx.responses[0].status).toBe(200);
    expect(ctx.responses[0].payload.data.prRef).toMatch(/^PR-PTPL-\d{4}-\d{4}$/);
  });

  // ── 2. PR create rejects line items with no vendor on Regular PR ─────────

  it('2. rejects Regular PR line items missing a vendor (400)', async () => {
    const ctx = makeReqRes('POST', '/api/procurement/prs', {
      headers: { 'x-tenant-id': TENANT },
      body: {
        entityId: ENTITY_ID,
        entityCode: 'PTPL',
        prType: 'regular',
        requesterId: 'u1',
        requesterName: 'Alice',
        lineItems: [
          {
            itemType: 'material',
            itemCode: 'A1',
            itemDescription: 'Widget',
            quantity: 1,
            unitPrice: 100,
            gstRate: 18,
            // vendor missing
          },
        ],
      },
    });
    await handleProcurementRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(ctx.responses[0].status).toBe(400);
    expect(ctx.responses[0].payload.error).toBe('validation_failed');
    expect(ctx.responses[0].payload.details.join(';')).toMatch(/vendor required/);
  });
});

// ── 3. PR submit: draft → pending_approval ────────────────────────────────────

describe('POST /api/procurement/prs/:id/submit', () => {
  it('3. transitions a draft PR to pending_approval', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: 'pr1', pr_ref: 'PR-PTPL-2026-0001', status: 'draft' }]) // SELECT existing
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE status
      .mockResolvedValueOnce({ affectedRows: 1 }); // INSERT audit

    const ctx = makeReqRes('POST', '/api/procurement/prs/pr1/submit', {
      headers: { 'x-tenant-id': TENANT },
    });
    await handleProcurementRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(ctx.responses[0].status).toBe(200);
    expect(ctx.responses[0].payload.data.status).toBe('pending_approval');
  });
});

// ── 4. PR approve: 403 for non-approver ──────────────────────────────────────

describe('POST /api/procurement/prs/:id/approve', () => {
  it('4. returns 403 when the caller is not a payment approver', async () => {
    vi.mocked(query).mockResolvedValueOnce([
      { id: 'pr1', pr_ref: 'PR-PTPL-2026-0001', status: 'pending_approval' },
    ]);
    vi.mocked(isPaymentApprover).mockResolvedValueOnce(false);

    const ctx = makeReqRes('POST', '/api/procurement/prs/pr1/approve', {
      headers: { 'x-tenant-id': TENANT, 'x-user-role': 'analyst' },
    });
    await handleProcurementRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(ctx.responses[0].status).toBe(403);
    expect(ctx.responses[0].payload.error).toBe('not_approver');
  });
});

// ── 5. PO create: rejects PRs from different vendors ─────────────────────────

describe('POST /api/procurement/pos (multi-vendor guard)', () => {
  it('5. rejects creating a PO when PR line items span multiple vendors', async () => {
    // SELECT prs by ids, all approved + same tenant
    vi.mocked(query)
      .mockResolvedValueOnce([
        { id: 'pr1', pr_ref: 'PR-PTPL-2026-0001', tenant_id: TENANT, status: 'approved' },
        { id: 'pr2', pr_ref: 'PR-PTPL-2026-0002', tenant_id: TENANT, status: 'approved' },
      ])
      .mockResolvedValueOnce([
        {
          id: 'l1',
          pr_id: 'pr1',
          vendor_id: 'v1',
          item_type: 'material',
          quantity: 1,
          unit_price: 100,
          gst_rate: 18,
        },
        {
          id: 'l2',
          pr_id: 'pr2',
          vendor_id: 'v2',
          item_type: 'material',
          quantity: 1,
          unit_price: 100,
          gst_rate: 18,
        },
      ]);

    const ctx = makeReqRes('POST', '/api/procurement/pos', {
      headers: { 'x-tenant-id': TENANT },
      body: {
        entityId: ENTITY_ID,
        entityCode: 'PTPL',
        vendorId: 'v1',
        vendorName: 'Acme',
        poType: 'regular',
        prIds: ['pr1', 'pr2'],
      },
    });
    await handleProcurementRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(ctx.responses[0].status).toBe(400);
    expect(ctx.responses[0].payload.error).toBe('mixed_vendors');
  });
});

// ── 6 & 7. GST calc: IGST vs CGST_SGST ────────────────────────────────────────

describe('computeLineGst', () => {
  it('6. applies IGST when vendor state code != entity state code', () => {
    const result = computeLineGst({
      lineAmount: 1000,
      gstRate: 18,
      vendorGstin: '07ABCDE1234A1Z5', // 07 = Delhi
      entityGstin: '27AABCP1234Q1Z5', // 27 = Maharashtra
    });
    expect(result.gstType).toBe('IGST');
    expect(result.gstAmount).toBe(180);
    expect(result.totalWithGst).toBe(1180);
  });

  it('7. applies CGST_SGST when vendor and entity share state code', () => {
    const result = computeLineGst({
      lineAmount: 2000,
      gstRate: 18,
      vendorGstin: '27ABCDE1234A1Z5', // 27 = Maharashtra
      entityGstin: '27AABCP1234Q1Z5', // 27 = Maharashtra
    });
    expect(result.gstType).toBe('CGST_SGST');
    expect(result.gstAmount).toBe(360);
    expect(result.totalWithGst).toBe(2360);
  });
});

// ── 8. PO create: po_pr_links inserted per PR ────────────────────────────────

describe('POST /api/procurement/pos (link rows)', () => {
  it('8. inserts a po_pr_links row for every PR converted', async () => {
    const year = new Date().getUTCFullYear();
    vi.mocked(query)
      .mockResolvedValueOnce([
        { id: 'pr1', pr_ref: 'PR-PTPL-2026-0001', tenant_id: TENANT, status: 'approved' },
      ]) // SELECT prs
      .mockResolvedValueOnce([
        {
          id: 'l1',
          pr_id: 'pr1',
          vendor_id: 'v1',
          item_type: 'material',
          item_code: 'A',
          item_description: 'X',
          quantity: 5,
          unit: 'ea',
          unit_price: 10,
          gst_rate: 18,
        },
      ]) // SELECT line items
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT seq
      .mockResolvedValueOnce([{ last_seq: 0 }])
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE seq
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT po header
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT po line
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT po_pr_link
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE pr status
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT audit
      .mockResolvedValueOnce([
        {
          id: 'po1',
          po_ref: `PO-PTPL-${year}-0001`,
          tenant_id: TENANT,
          entity_id: ENTITY_ID,
          entity_code: 'PTPL',
          vendor_id: 'v1',
          vendor_name: 'Acme',
          po_type: 'regular',
          status: 'draft',
        },
      ]) // SELECT readback header
      .mockResolvedValueOnce([]); // SELECT readback items

    const ctx = makeReqRes('POST', '/api/procurement/pos', {
      headers: { 'x-tenant-id': TENANT },
      body: {
        entityId: ENTITY_ID,
        entityCode: 'PTPL',
        vendorId: 'v1',
        vendorName: 'Acme',
        poType: 'regular',
        prIds: ['pr1'],
      },
    });
    await handleProcurementRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(ctx.responses[0].status).toBe(200);
    // Verify INSERT into po_pr_links was issued
    const callArgs = vi.mocked(query).mock.calls.map((c) => c[0]);
    expect(callArgs.some((sql) => /INSERT INTO po_pr_links/.test(sql))).toBe(true);
    // And that PR status was flipped
    expect(
      callArgs.some((sql) => /UPDATE purchase_requests SET status = 'converted_to_po'/.test(sql))
    ).toBe(true);
  });
});

// ── 9. GRN create: rejects over-receipt ──────────────────────────────────────

describe('POST /api/procurement/grns (over-receipt guard)', () => {
  it('9. rejects qty > (PO qty - already received) with 400', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: 'po1', po_ref: 'PO-PTPL-2026-0001', status: 'issued' }])
      .mockResolvedValueOnce([
        {
          id: 'poi1',
          line_number: 1,
          quantity: 10,
          qty_received: 7,
          item_description: 'X',
          unit: 'ea',
          unit_price: 10,
        },
      ]);

    const ctx = makeReqRes('POST', '/api/procurement/grns', {
      headers: { 'x-tenant-id': TENANT },
      body: {
        poId: 'po1',
        entityId: ENTITY_ID,
        entityCode: 'PTPL',
        receiptDate: '2026-05-10',
        items: [{ poItemId: 'poi1', qtyReceived: 5 }], // 7 + 5 = 12 > 10
      },
    });
    await handleProcurementRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(ctx.responses[0].status).toBe(400);
    expect(ctx.responses[0].payload.error).toBe('over_receipt');
  });
});

// ── 10. GRN confirm flips PO to 'partially_received' ────────────────────────

describe('POST /api/procurement/grns/:id/confirm (PO partial)', () => {
  it('10. flips PO status to partially_received when some lines received', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([
        {
          id: 'grn1',
          grn_ref: 'GRN-PTPL-2026-0001',
          po_id: 'po1',
          tenant_id: TENANT,
          status: 'draft',
        },
      ]) // SELECT GRN
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE confirmed
      .mockResolvedValueOnce([{ po_item_id: 'poi1', qty_accepted: 3 }]) // SELECT items
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE poi qty_received
      .mockResolvedValueOnce([
        {
          id: 'poi1',
          item_type: 'material',
          quantity: 10,
          line_amount: 100,
          qty_received: 3,
          amount_consumed: 0,
        },
      ]) // SELECT lines for status refresh
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE PO status
      .mockResolvedValueOnce({ affectedRows: 1 }); // INSERT audit

    const ctx = makeReqRes('POST', '/api/procurement/grns/grn1/confirm', {
      headers: { 'x-tenant-id': TENANT },
    });
    await handleProcurementRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(ctx.responses[0].status).toBe(200);
    const callArgs = vi.mocked(query).mock.calls;
    const poUpdate = callArgs.find(
      (c) =>
        /UPDATE purchase_orders_proc SET status = \?/.test(c[0]) &&
        c[1]?.[0] === 'partially_received'
    );
    expect(poUpdate).toBeTruthy();
  });
});

// ── 11. GRN confirm flips PO to 'fully_received' ────────────────────────────

describe('POST /api/procurement/grns/:id/confirm (PO fully received)', () => {
  it('11. flips PO status to fully_received when all lines fully received', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([
        {
          id: 'grn1',
          grn_ref: 'GRN-PTPL-2026-0001',
          po_id: 'po1',
          tenant_id: TENANT,
          status: 'draft',
        },
      ])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ po_item_id: 'poi1', qty_accepted: 10 }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([
        {
          id: 'poi1',
          item_type: 'material',
          quantity: 10,
          line_amount: 100,
          qty_received: 10,
          amount_consumed: 0,
        },
      ])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });

    const ctx = makeReqRes('POST', '/api/procurement/grns/grn1/confirm', {
      headers: { 'x-tenant-id': TENANT },
    });
    await handleProcurementRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(ctx.responses[0].status).toBe(200);
    const callArgs = vi.mocked(query).mock.calls;
    const fullyMatched = callArgs.find(
      (c) =>
        /UPDATE purchase_orders_proc SET status = \?/.test(c[0]) && c[1]?.[0] === 'fully_received'
    );
    expect(fullyMatched).toBeTruthy();
  });
});

// ── 12. SRN create rejects over-consumption ─────────────────────────────────

describe('POST /api/procurement/srns (over-consumption guard)', () => {
  it('12. rejects amount > (PO line value - already consumed) with 400', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: 'po1', po_ref: 'PO-PTPL-2026-0001' }]) // SELECT po
      .mockResolvedValueOnce([
        { id: 'poi1', line_number: 1, line_amount: 1000, amount_consumed: 800 },
      ]); // SELECT po items

    const ctx = makeReqRes('POST', '/api/procurement/srns', {
      headers: { 'x-tenant-id': TENANT },
      body: {
        poId: 'po1',
        entityId: ENTITY_ID,
        entityCode: 'PTPL',
        receiptDate: '2026-05-10',
        items: [{ poItemId: 'poi1', amountConsumed: 300 }], // 800 + 300 > 1000
      },
    });
    await handleProcurementRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(ctx.responses[0].status).toBe(400);
    expect(ctx.responses[0].payload.error).toBe('over_consumption');
  });
});

// ── 13 & 14. evaluatePOMatch line-level matching ─────────────────────────────

describe('evaluatePOMatch (3-way match)', () => {
  it('13. line-level match passes when GRN qty >= PO qty', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: 'po1', po_ref: 'PO-PTPL-2026-0001', status: 'fully_received' }])
      .mockResolvedValueOnce([
        {
          id: 'poi1',
          line_number: 1,
          item_type: 'material',
          quantity: 10,
          line_amount: 100,
          match_status: 'pending',
        },
      ])
      .mockResolvedValueOnce([{ po_item_id: 'poi1', qty_total: 10 }]) // GRN aggregates
      .mockResolvedValueOnce([]) // SRN aggregates
      .mockResolvedValueOnce({ affectedRows: 1 }); // UPDATE match_status

    const result = await evaluatePOMatch('po1', TENANT);
    expect(result).toBeTruthy();
    expect(result.headerMatched).toBe(true);
    expect(result.lines[0].matched).toBe(true);
    expect(result.lines[0].matchStatus).toBe('matched');
  });

  it('14. line-level match fails when GRN qty < PO qty', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([
        { id: 'po1', po_ref: 'PO-PTPL-2026-0001', status: 'partially_received' },
      ])
      .mockResolvedValueOnce([
        {
          id: 'poi1',
          line_number: 1,
          item_type: 'material',
          quantity: 10,
          line_amount: 100,
          match_status: 'pending',
        },
      ])
      .mockResolvedValueOnce([{ po_item_id: 'poi1', qty_total: 5 }]) // partial GRN
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ affectedRows: 1 });

    const result = await evaluatePOMatch('po1', TENANT);
    expect(result.headerMatched).toBe(false);
    expect(result.lines[0].matched).toBe(false);
    expect(result.lines[0].matchStatus).toBe('partial');
  });
});

// ── 15. Audit log: every state change writes a procurement_audit_log row ────

describe('procurement_audit_log writes', () => {
  it('15. PR submit writes an audit row', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: 'pr1', pr_ref: 'PR-PTPL-2026-0001', status: 'draft' }])
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE
      .mockResolvedValueOnce({ affectedRows: 1 }); // INSERT audit

    const ctx = makeReqRes('POST', '/api/procurement/prs/pr1/submit', {
      headers: { 'x-tenant-id': TENANT },
    });
    await handleProcurementRoute(ctx.req, ctx.res, ctx.pathname, ctx.sendJson);
    expect(ctx.responses[0].status).toBe(200);
    const callArgs = vi.mocked(query).mock.calls.map((c) => c[0]);
    expect(callArgs.some((sql) => /INSERT INTO procurement_audit_log/.test(sql))).toBe(true);
  });
});

// ── nextDocRef export coverage ──────────────────────────────────────────────

describe('nextDocRef', () => {
  it('returns a properly formatted PR-PTPL-{year}-NNNN ref', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ last_seq: 0 }])
      .mockResolvedValueOnce({ affectedRows: 1 });
    const ref = await nextDocRef(TENANT, 'PTPL', 'PR');
    expect(ref).toMatch(/^PR-PTPL-\d{4}-\d{4}$/);
  });
});
