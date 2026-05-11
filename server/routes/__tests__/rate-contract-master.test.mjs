import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────

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
  connExecute: vi.fn(async (conn, sql, params) => {
    const { query: q } = await import('../../mysql.mjs');
    return q(sql, params);
  }),
}));

vi.mock('../procurement.mjs', () => ({
  nextDocRef: vi.fn(async (tenantId, entityCode, docType) => {
    return `${docType}-${entityCode}-2026-9999`;
  }),
}));

import { query } from '../../mysql.mjs';
import { handleRateContractMasterRoute, lookupRateContract } from '../rate-contract-master.mjs';

function makeReqRes(method, fullUrl, { headers = {}, body } = {}) {
  const bodyChunks = body ? [Buffer.from(JSON.stringify(body))] : [];
  const url = new URL(fullUrl, 'http://localhost');
  const req = {
    method,
    url: `${url.pathname}${url.search}`,
    headers: { host: 'localhost', ...headers },
    [Symbol.asyncIterator]: async function* () {
      yield* bodyChunks;
    },
  };
  const responses = [];
  const sendJson = (_res, status, payload) => responses.push({ status, payload });
  return { req, res: {}, responses, sendJson, pathname: url.pathname };
}

beforeEach(() => {
  vi.mocked(query).mockReset();
  vi.mocked(query).mockResolvedValue([]);
});

// ── lookupRateContract pure helper ─────────────────────────────────────────

describe('lookupRateContract', () => {
  it('returns matched=false when vendorId or itemCode missing', async () => {
    const r1 = await lookupRateContract({ tenantId: 't1', vendorId: '', itemCode: 'X' });
    const r2 = await lookupRateContract({ tenantId: 't1', vendorId: 'v1', itemCode: '' });
    expect(r1.matched).toBe(false);
    expect(r2.matched).toBe(false);
  });

  it('returns matched payload when SQL returns a row', async () => {
    vi.mocked(query).mockResolvedValueOnce([
      {
        contract_id: 'rc1',
        contract_code: 'RCM-PTPL-2026-0001',
        contract_name: 'TCS Laptop FY26',
        end_date: '2027-03-31',
        agreed_rate: '85000.00',
        currency: 'INR',
        uom: 'NOS',
        gst_rate: '18.00',
        hsn_code: '84713000',
        item_name: '14" Business Laptop',
      },
    ]);
    const r = await lookupRateContract({
      tenantId: 'tenant-default-001',
      vendorId: 'v-tcs',
      itemCode: 'LAP-14IN-I7',
      entityId: 'entity-ptpl-001',
    });
    expect(r.matched).toBe(true);
    if (r.matched) {
      expect(r.contractCode).toBe('RCM-PTPL-2026-0001');
      expect(r.agreedRate).toBe(85000);
      expect(r.gstRate).toBe(18);
      expect(r.hsnCode).toBe('84713000');
    }
  });

  it('returns matched=false when SQL returns no rows', async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    const r = await lookupRateContract({
      tenantId: 'tenant-default-001',
      vendorId: 'v-unknown',
      itemCode: 'NO-SUCH-ITEM',
    });
    expect(r.matched).toBe(false);
  });
});

// ── GET /api/masters/rate_contract/lookup endpoint ─────────────────────────

describe('GET /api/masters/rate_contract/lookup', () => {
  it('400 when X-Tenant-Id missing', async () => {
    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'GET',
      '/api/masters/rate_contract/lookup?vendorId=v1&itemCode=I1'
    );
    const handled = await handleRateContractMasterRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(400);
    expect(responses[0].payload.error).toBe('tenant_required');
  });

  it('matched: returns contract details when vendor+item+entity hit an active row', async () => {
    vi.mocked(query).mockResolvedValueOnce([
      {
        contract_id: 'rc1',
        contract_code: 'RCM-PTPL-2026-0001',
        contract_name: 'TCS Laptop FY26',
        end_date: '2027-03-31',
        agreed_rate: '85000.00',
        currency: 'INR',
        uom: 'NOS',
        gst_rate: '18.00',
        hsn_code: '84713000',
        item_name: '14" Business Laptop',
      },
    ]);
    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'GET',
      '/api/masters/rate_contract/lookup?vendorId=v-tcs&itemCode=LAP-14IN-I7&entityId=entity-ptpl-001',
      { headers: { 'x-tenant-id': 'tenant-default-001' } }
    );
    const handled = await handleRateContractMasterRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(200);
    expect(responses[0].payload.success).toBe(true);
    expect(responses[0].payload.matched).toBe(true);
    expect(responses[0].payload.contractCode).toBe('RCM-PTPL-2026-0001');
    expect(responses[0].payload.agreedRate).toBe(85000);
    expect(responses[0].payload.gstRate).toBe(18);
    expect(responses[0].payload.hsnCode).toBe('84713000');
  });

  it('not matched: returns matched=false when vendor+item pair has no active contract', async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'GET',
      '/api/masters/rate_contract/lookup?vendorId=v-no-match&itemCode=NO-CONTRACT-ITEM',
      { headers: { 'x-tenant-id': 'tenant-default-001' } }
    );
    const handled = await handleRateContractMasterRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(200);
    expect(responses[0].payload.success).toBe(true);
    expect(responses[0].payload.matched).toBe(false);
  });

  it('expired contract: SQL clause filters expired rows out → matched=false', async () => {
    // The SQL guard `end_date >= CURRENT_DATE()` excludes expired rows at the
    // DB layer. We simulate this by returning an empty result set even though
    // the contract exists conceptually. Verify the SQL was sent with the
    // CURRENT_DATE() guard and the agreed_rate of a 2025-expired contract is
    // never surfaced.
    vi.mocked(query).mockResolvedValueOnce([]);
    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'GET',
      '/api/masters/rate_contract/lookup?vendorId=v-tcs&itemCode=LAP-14IN-I7',
      { headers: { 'x-tenant-id': 'tenant-default-001' } }
    );
    const handled = await handleRateContractMasterRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].payload.matched).toBe(false);
    // Verify the date guard is in the SQL.
    const sqlCall = vi.mocked(query).mock.calls[0]?.[0] ?? '';
    expect(sqlCall).toMatch(/end_date IS NULL OR h\.end_date >= CURRENT_DATE/i);
    expect(sqlCall).toMatch(/h\.status = 'active'/);
  });

  it('wrong tenant: rows in another tenant are filtered out by tenant_id WHERE clause → matched=false', async () => {
    // The query is parameterised by tenantId. We assert that the tenant param
    // is the first WHERE value, and a "wrong" tenant returns no rows.
    vi.mocked(query).mockResolvedValueOnce([]);
    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'GET',
      '/api/masters/rate_contract/lookup?vendorId=v-tcs&itemCode=LAP-14IN-I7',
      { headers: { 'x-tenant-id': 'tenant-other' } }
    );
    const handled = await handleRateContractMasterRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].payload.matched).toBe(false);
    const params = vi.mocked(query).mock.calls[0]?.[1] ?? [];
    // tenant_id is the first WHERE parameter.
    expect(params[0]).toBe('tenant-other');
    // vendor_id is the second.
    expect(params[1]).toBe('v-tcs');
  });
});

// ── PUT /api/masters/rate_contract_master ──────────────────────────────────

describe('PUT /api/masters/rate_contract_master', () => {
  it('400 when contract_name is missing', async () => {
    // No existing-row lookups should run because validation fails first.
    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'PUT',
      '/api/masters/rate_contract_master',
      {
        headers: { 'x-tenant-id': 'tenant-default-001' },
        body: {
          records: [
            {
              contractCode: 'RCM-PTPL-2026-0099',
              vendorId: 'v-tcs',
              startDate: '2026-04-01',
              endDate: '2027-03-31',
              items: [],
            },
          ],
        },
      }
    );
    // Mock the existing-row pre-lookup calls.
    vi.mocked(query).mockResolvedValue([]);
    const handled = await handleRateContractMasterRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(400);
    expect(responses[0].payload.error).toMatch(/contract_name_required/);
  });
});
