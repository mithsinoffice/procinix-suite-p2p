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

// nextDocRef pulls in procurement.mjs — stub it so we don't need the full
// doc_ref_sequences SQL roundtrip in tests.
vi.mock('../procurement.mjs', () => ({
  nextDocRef: vi.fn(async (tenantId, entityCode, docType) => {
    return `${docType}-${entityCode}-2026-9999`;
  }),
}));

import { query } from '../../mysql.mjs';
import { handleMastersRoute, validateEmployeeFields, normalisePhone } from '../masters.mjs';

function makeReqRes(method, pathname, { headers = {}, body } = {}) {
  const bodyChunks = body ? [Buffer.from(JSON.stringify(body))] : [];
  const req = {
    method,
    url: pathname,
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
});

// ── Employee validation (pure helper) ──────────────────────────────────────

describe('validateEmployeeFields', () => {
  it('accepts a well-formed payload', () => {
    const r = validateEmployeeFields({
      firstName: 'Arjun',
      lastName: 'Mehta',
      email: 'arjun.mehta@procinix.ai',
      phone: '9810000001',
      panNumber: 'AAAPM1234A',
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.normalised.email).toBe('arjun.mehta@procinix.ai');
    expect(r.normalised.phone).toBe('9810000001');
    expect(r.normalised.pan).toBe('AAAPM1234A');
  });

  it('rejects a 1-char first name (regex)', () => {
    const r = validateEmployeeFields({
      firstName: 'A',
      lastName: 'Mehta',
      email: 'a@x.com',
      phone: '9810000001',
    });
    expect(r.valid).toBe(false);
    expect(r.errors[0].field).toBe('firstName');
  });

  it('rejects digits in last name', () => {
    const r = validateEmployeeFields({
      firstName: 'Arjun',
      lastName: 'Meh7a',
      email: 'a@x.com',
      phone: '9810000001',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === 'lastName')).toBe(true);
  });

  it('rejects a bad email', () => {
    const r = validateEmployeeFields({
      firstName: 'Arjun',
      lastName: 'Mehta',
      email: 'not-an-email',
      phone: '9810000001',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === 'email')).toBe(true);
  });

  it('rejects phone numbers that are not Indian mobile format', () => {
    const r = validateEmployeeFields({
      firstName: 'Arjun',
      lastName: 'Mehta',
      email: 'a@x.com',
      phone: '12345',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === 'phone')).toBe(true);
  });

  it('normalises +91 and 0 prefixes on phone', () => {
    expect(normalisePhone('+919810000001')).toBe('9810000001');
    expect(normalisePhone('09810000001')).toBe('9810000001');
    expect(normalisePhone('9810000001')).toBe('9810000001');
  });

  it('rejects malformed PAN but accepts valid one', () => {
    const bad = validateEmployeeFields({
      firstName: 'Arjun',
      lastName: 'Mehta',
      email: 'a@x.com',
      phone: '9810000001',
      panNumber: 'XYZ123',
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => e.field === 'panNumber')).toBe(true);

    const good = validateEmployeeFields({
      firstName: 'Arjun',
      lastName: 'Mehta',
      email: 'a@x.com',
      phone: '9810000001',
      panNumber: 'aaapm1234a',
    });
    expect(good.valid).toBe(true);
    expect(good.normalised.pan).toBe('AAAPM1234A');
  });
});

// ── /api/masters/employee_master — GET / PUT ────────────────────────────────

describe('GET /api/masters/employee_master', () => {
  it('returns projected employee records', async () => {
    vi.mocked(query).mockResolvedValueOnce([
      {
        id: 'e1',
        tenant_id: 'tenant-default-001',
        employee_code: 'EMP-PTPL-2026-0001',
        first_name: 'Arjun',
        last_name: 'Mehta',
        email: 'arjun.mehta@procinix.ai',
        phone: '9810000001',
        department_id: 'd1',
        department_name: 'Finance',
        designation_id: 'g1',
        designation_name: 'CEO',
        location_id: 'l1',
        location_name: 'Mumbai HQ',
        employment_type: 'full_time',
        status: 'active',
        approval_status: 'Approved',
        pan_number: 'AAAPM1234A',
        date_of_joining: new Date('2018-04-01'),
        date_of_leaving: null,
        entity_id: 'entity-ptpl-001',
        entity_code: 'PTPL',
      },
    ]);

    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'GET',
      '/api/masters/employee_master',
      { headers: { 'x-tenant-id': 'tenant-default-001' } }
    );
    const handled = await handleMastersRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(200);
    expect(responses[0].payload.data).toHaveLength(1);
    const rec = responses[0].payload.data[0];
    expect(rec.recordCode).toBe('EMP-PTPL-2026-0001');
    expect(rec.recordName).toBe('Arjun Mehta');
    expect(rec.firstName).toBe('Arjun');
    expect(rec.email).toBe('arjun.mehta@procinix.ai');
    expect(rec.payload.departmentId).toBe('d1');
  });
});

describe('PUT /api/masters/employee_master', () => {
  it('rejects payloads that fail name regex with 400', async () => {
    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'PUT',
      '/api/masters/employee_master',
      {
        headers: { 'x-tenant-id': 'tenant-default-001' },
        body: {
          records: [
            {
              firstName: 'X',
              lastName: 'Mehta',
              email: 'a@x.com',
              phone: '9810000001',
              employeeCode: 'EMP-1',
            },
          ],
        },
      }
    );
    const handled = await handleMastersRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(400);
    expect(responses[0].payload.success).toBe(false);
    expect(responses[0].payload.details?.[0]?.field).toBe('firstName');
  });

  it('rejects duplicate email already in DB with 409', async () => {
    // Pre-scan validation runs once on the records list (no DB calls yet).
    // Then the route reads existing rows to cross-check uniqueness.
    vi.mocked(query).mockResolvedValueOnce([
      {
        id: 'other-id',
        email: 'arjun.mehta@procinix.ai',
        phone: '9999999999',
        pan_number: null,
      },
    ]);

    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'PUT',
      '/api/masters/employee_master',
      {
        headers: { 'x-tenant-id': 'tenant-default-001' },
        body: {
          records: [
            {
              id: 'new-id',
              firstName: 'Arjun',
              lastName: 'Mehta',
              email: 'arjun.mehta@procinix.ai',
              phone: '9810000001',
              employeeCode: 'EMP-1',
            },
          ],
        },
      }
    );
    const handled = await handleMastersRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(409);
    expect(responses[0].payload.error).toMatch(/email_in_use/);
  });

  it('accepts a valid new record (writes INSERT + audit)', async () => {
    // Sequence: existing-row cross-check → INSERT employee → SELECT previous (empty for new) → INSERT employee row + audit
    vi.mocked(query)
      .mockResolvedValueOnce([]) // SELECT existing for cross-check
      .mockResolvedValueOnce([]) // SELECT previous row (none for create)
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT employee
      .mockResolvedValueOnce({ affectedRows: 1 }); // INSERT audit

    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'PUT',
      '/api/masters/employee_master',
      {
        headers: { 'x-tenant-id': 'tenant-default-001' },
        body: {
          records: [
            {
              firstName: 'Priya',
              lastName: 'Nair',
              email: 'priya.nair@procinix.ai',
              phone: '+919810000004',
              employeeCode: 'EMP-PTPL-2026-0004',
            },
          ],
        },
      }
    );
    const handled = await handleMastersRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(200);
    expect(responses[0].payload.success).toBe(true);
  });
});

// ── /api/masters/kit_bundle_master ─────────────────────────────────────────

describe('GET /api/masters/kit_bundle_master', () => {
  it('joins items[] into each bundle record', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([
        {
          id: 'b1',
          tenant_id: 'tenant-default-001',
          bundle_code: 'BCM-PTPL-2026-0001',
          bundle_name: 'Onboarding Laptop Kit',
          vendor_id: 'v1',
          vendor_code: 'V-TCS-001',
          vendor_name: 'TCS',
          description: 'Test',
          status: 'Active',
          approval_status: 'Approved',
          created_by: 'seed',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'i1',
          bundle_id: 'b1',
          line_number: 1,
          item_code: 'LAP-1',
          item_name: 'Laptop',
          description: null,
          qty: 1,
          uom: 'NOS',
          unit_price: 85000,
          gst_rate: 18,
          hsn_code: '84713000',
          mandatory: 1,
        },
      ]);

    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'GET',
      '/api/masters/kit_bundle_master',
      { headers: { 'x-tenant-id': 'tenant-default-001' } }
    );
    const handled = await handleMastersRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(200);
    expect(responses[0].payload.data[0].bundleCode).toBe('BCM-PTPL-2026-0001');
    expect(responses[0].payload.data[0].payload.items).toHaveLength(1);
    expect(responses[0].payload.data[0].payload.items[0].mandatory).toBe(true);
  });
});

describe('PUT /api/masters/kit_bundle_master', () => {
  it('upserts header + replaces child items in one transaction', async () => {
    // Sequence inside upsertKitBundles for a NEW bundle:
    //   1. SELECT existing by id  (empty)
    //   2. SELECT existing by code (empty)
    //   3. nextDocRef (stubbed) — does not hit query
    //   4. INSERT header (via conn.execute → query in mock)
    //   5. DELETE items
    //   6. INSERT item (only one in this test)
    //   7. INSERT audit
    vi.mocked(query)
      .mockResolvedValueOnce([]) // SELECT by id
      .mockResolvedValueOnce([]) // SELECT by code
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT header
      .mockResolvedValueOnce({ affectedRows: 0 }) // DELETE items
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT item
      .mockResolvedValueOnce({ affectedRows: 1 }); // INSERT audit

    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'PUT',
      '/api/masters/kit_bundle_master',
      {
        headers: { 'x-tenant-id': 'tenant-default-001' },
        body: {
          records: [
            {
              bundleName: 'Test Bundle',
              vendorId: 'v-1',
              vendorCode: 'V-1',
              vendorName: 'Test Vendor',
              status: 'Active',
              approvalStatus: 'Approved',
              payload: {
                items: [
                  {
                    itemName: 'Laptop',
                    qty: 1,
                    uom: 'NOS',
                    unitPrice: 50000,
                    gstRate: 18,
                    mandatory: true,
                  },
                ],
              },
            },
          ],
        },
      }
    );
    const handled = await handleMastersRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(200);
    expect(responses[0].payload.success).toBe(true);
    expect(responses[0].payload.count).toBe(1);
  });

  it('rejects records missing bundle_name', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([]) // SELECT by id
      .mockResolvedValueOnce([]); // SELECT by code

    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'PUT',
      '/api/masters/kit_bundle_master',
      {
        headers: { 'x-tenant-id': 'tenant-default-001' },
        body: {
          records: [
            { vendorId: 'v-1', payload: { items: [] } }, // no bundleName
          ],
        },
      }
    );
    const handled = await handleMastersRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(500);
    expect(responses[0].payload.error).toMatch(/bundle_name_required/);
  });
});

// ── Tenant-required guard ──────────────────────────────────────────────────

describe('tenant guard', () => {
  it('returns 400 when X-Tenant-Id is missing', async () => {
    const { req, res, sendJson, responses, pathname } = makeReqRes(
      'GET',
      '/api/masters/employee_master'
    );
    const handled = await handleMastersRoute(req, res, pathname, sendJson);
    expect(handled).toBe(true);
    expect(responses[0].status).toBe(400);
    expect(responses[0].payload.error).toBe('tenant_required');
  });
});
