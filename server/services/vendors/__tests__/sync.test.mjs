import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../mysql.mjs', () => ({
  query: vi.fn().mockResolvedValue([]),
  withTransaction: vi.fn(async (fn) => {
    // Wire a stub `conn` whose connExecute proxies to the mocked query.
    return fn({ __stub: true });
  }),
  connExecute: vi.fn().mockResolvedValue([]),
}));

import {
  projectMasterToOperationalRow,
  stateCodeFromGstin,
  syncVendorMasterRecord,
  backfillApprovedVendorMasters,
} from '../sync.mjs';
import { query, connExecute, withTransaction } from '../../../mysql.mjs';

beforeEach(() => {
  vi.mocked(query).mockReset();
  vi.mocked(query).mockResolvedValue([]);
  vi.mocked(connExecute).mockReset();
  vi.mocked(connExecute).mockResolvedValue([]);
  vi.mocked(withTransaction).mockReset();
  vi.mocked(withTransaction).mockImplementation(async (fn) => fn({ __stub: true }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('stateCodeFromGstin', () => {
  it('returns the first two digits for a valid GSTIN', () => {
    expect(stateCodeFromGstin('27AABCT0001Z1Z5')).toBe('27');
    expect(stateCodeFromGstin('07AABCZ0012O1Z3')).toBe('07');
  });

  it('returns null when prefix is non-numeric', () => {
    expect(stateCodeFromGstin('ABACDEFGHIJK1Z5')).toBeNull();
  });

  it('returns null for short / empty strings', () => {
    expect(stateCodeFromGstin('')).toBeNull();
    expect(stateCodeFromGstin('2')).toBeNull();
    expect(stateCodeFromGstin(null)).toBeNull();
  });
});

describe('projectMasterToOperationalRow', () => {
  it('tolerates snake_case payload keys (the canonical PUT shape)', () => {
    const out = projectMasterToOperationalRow({
      vendor_code: 'V-TEST-001',
      vendor_legal_name: 'Test Vendor Pvt Ltd',
      vendor_trade_name: 'Test Vendor',
      vendor_type: 'service_provider',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin_code: '400001',
      country: 'India',
      tenant_id: 'tenant-default-001',
    });
    expect(out.vendor_code).toBe('V-TEST-001');
    expect(out.vendor_legal_name).toBe('Test Vendor Pvt Ltd');
    expect(out.vendor_type).toBe('service_provider');
    expect(out.pin_code).toBe('400001');
    expect(out.tenant_id).toBe('tenant-default-001');
  });

  it('tolerates camelCase payload keys (legacy VendorMaster form)', () => {
    const out = projectMasterToOperationalRow({
      vendorCode: 'V-CAM-001',
      legalName: 'CamelCase Pvt Ltd',
      tradeName: 'CamelCase',
      vendorType: 'Supplier',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600032',
    });
    expect(out.vendor_code).toBe('V-CAM-001');
    expect(out.vendor_legal_name).toBe('CamelCase Pvt Ltd');
    expect(out.vendor_type).toBe('goods_supplier'); // 'Supplier' → goods_supplier
    expect(out.pin_code).toBe('600032');
    expect(out.country).toBe('India'); // default
    expect(out.tenant_id).toBe('tenant-default-001'); // default
  });

  it('throws when vendor_code or legal_name is missing', () => {
    expect(() => projectMasterToOperationalRow({ vendorCode: 'X' })).toThrow();
    expect(() => projectMasterToOperationalRow({ legalName: 'X' })).toThrow();
    expect(() => projectMasterToOperationalRow({})).toThrow();
  });

  it('normalises legacy vendor_type values to the operational enum', () => {
    expect(
      projectMasterToOperationalRow({
        vendorCode: 'V-1',
        legalName: 'X',
        vendorType: 'Service Provider',
      }).vendor_type
    ).toBe('service_provider');
    expect(
      projectMasterToOperationalRow({
        vendorCode: 'V-1',
        legalName: 'X',
        vendorType: 'Contractor',
      }).vendor_type
    ).toBe('service_provider');
    expect(
      projectMasterToOperationalRow({
        vendorCode: 'V-1',
        legalName: 'X',
        vendorType: 'Distributor',
      }).vendor_type
    ).toBe('goods_supplier');
  });
});

describe('syncVendorMasterRecord — approve path', () => {
  it('INSERTs when no operational row matches the master vendor_code or name', async () => {
    // findExistingOperationalVendor → both lookups return []
    vi.mocked(connExecute)
      .mockResolvedValueOnce([]) // SELECT by vendor_code
      .mockResolvedValueOnce([]) // SELECT by legal_name
      .mockResolvedValue([]); // every subsequent INSERT/UPDATE

    const result = await syncVendorMasterRecord(
      {
        vendor_code: 'V-NEW-001',
        vendor_legal_name: 'Newly Approved Vendor Pvt Ltd',
        vendor_type: 'service_provider',
        state: 'Maharashtra',
        tenant_id: 'tenant-default-001',
        gstin: '27AABCT0001Z1Z5',
        pan: 'AABCT0001Z',
      },
      'approve'
    );

    expect(result.action).toBe('inserted');
    const calls = vi.mocked(connExecute).mock.calls.map((c) => String(c[1]));
    // INSERT into vendors fired
    expect(calls.some((sql) => sql.includes('INSERT INTO p2p_schema_mt.vendors'))).toBe(true);
    // Side tables touched
    expect(
      calls.some((sql) => sql.includes('vendor_gst_registrations') && sql.includes('INSERT'))
    ).toBe(true);
    expect(calls.some((sql) => sql.includes('vendor_pan_compliance'))).toBe(true);
  });

  it('UPDATEs the matching row when vendor_code already exists', async () => {
    vi.mocked(connExecute)
      .mockResolvedValueOnce([
        {
          id: 'existing-uuid-1',
          vendor_code: 'V-OLD-001',
          vendor_legal_name: 'Old Vendor',
          status: 'inactive',
          is_active: 0,
        },
      ]) // SELECT by vendor_code (HIT)
      .mockResolvedValue([]); // subsequent ops

    const result = await syncVendorMasterRecord(
      {
        vendor_code: 'V-OLD-001',
        vendor_legal_name: 'Old Vendor Renamed Pvt Ltd',
        vendor_type: 'goods_supplier',
        state: 'Karnataka',
      },
      'approve'
    );

    expect(result.action).toBe('updated');
    expect(result.vendorId).toBe('existing-uuid-1');
    const updateCall = vi
      .mocked(connExecute)
      .mock.calls.find((c) => String(c[1]).includes('UPDATE p2p_schema_mt.vendors'));
    expect(updateCall).toBeDefined();
    // The UPDATE sets status='active' explicitly so a previously-deactivated
    // vendor reactivates on re-approval.
    expect(String(updateCall[1])).toContain("status = 'active'");
  });

  it('skips GST/PAN inserts when neither field is present on the master record', async () => {
    vi.mocked(connExecute)
      .mockResolvedValueOnce([]) // no match by vendor_code
      .mockResolvedValueOnce([]) // no match by legal_name
      .mockResolvedValue([]);

    await syncVendorMasterRecord(
      {
        vendor_code: 'V-MIN-001',
        vendor_legal_name: 'Minimal Vendor',
        // no gstin, no pan, no msme
      },
      'approve'
    );
    const calls = vi.mocked(connExecute).mock.calls.map((c) => String(c[1]));
    expect(calls.some((sql) => sql.includes('vendor_gst_registrations'))).toBe(false);
    expect(calls.some((sql) => sql.includes('vendor_pan_compliance'))).toBe(false);
  });

  it('derives state_code from GSTIN digits 1-2 and writes it to vendor_gst_registrations', async () => {
    vi.mocked(connExecute)
      .mockResolvedValueOnce([]) // no match by vendor_code
      .mockResolvedValueOnce([]) // no match by legal_name
      .mockResolvedValueOnce([]) // INSERT vendors
      .mockResolvedValueOnce([]) // SELECT existing gst row
      .mockResolvedValue([]); // INSERT gst row + side tables

    await syncVendorMasterRecord(
      {
        vendor_code: 'V-KA-001',
        vendor_legal_name: 'Karnataka Vendor',
        gstin: '29AABCV1234Q1Z5',
      },
      'approve'
    );

    const gstInsert = vi
      .mocked(connExecute)
      .mock.calls.find(
        (c) =>
          String(c[1]).includes('vendor_gst_registrations') &&
          String(c[1]).trimStart().startsWith('INSERT')
      );
    expect(gstInsert).toBeDefined();
    // Position of gst_state_code in the param list matches the SQL — the
    // mock records the call as [conn, sql, params], so params is index 2.
    const params = gstInsert[2];
    expect(params).toContain('29AABCV1234Q1Z5');
    expect(params).toContain('29');
  });
});

describe('syncVendorMasterRecord — reject path', () => {
  it('flips matching operational row to inactive', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([
        {
          id: 'existing-uuid-2',
          vendor_code: 'V-REJ-001',
          vendor_legal_name: 'Rejected Vendor',
          status: 'active',
          is_active: 1,
        },
      ])
      .mockResolvedValue([]);

    const result = await syncVendorMasterRecord(
      { vendor_code: 'V-REJ-001', vendor_legal_name: 'Rejected Vendor' },
      'reject'
    );
    expect(result.action).toBe('deactivated');
    const updateCall = vi
      .mocked(query)
      .mock.calls.find(
        (c) =>
          String(c[0]).includes('UPDATE p2p_schema_mt.vendors') && String(c[0]).includes('inactive')
      );
    expect(updateCall).toBeDefined();
  });

  it('no-ops when no operational row exists for the rejected master', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([]) // SELECT by vendor_code → empty
      .mockResolvedValueOnce([]) // SELECT by legal_name → empty
      .mockResolvedValue([]);

    const result = await syncVendorMasterRecord(
      { vendor_code: 'V-GHOST', vendor_legal_name: 'Ghost Vendor' },
      'reject'
    );
    expect(result.action).toBe('noop');
    // Critically: no UPDATE fired.
    const updateCalls = vi.mocked(query).mock.calls.filter((c) => String(c[0]).includes('UPDATE'));
    expect(updateCalls).toHaveLength(0);
  });
});

describe('syncVendorMasterRecord — unknown actions', () => {
  it('skips for request_info / approve_with_conditions / null', async () => {
    expect(
      (await syncVendorMasterRecord({ vendor_code: 'V', vendor_legal_name: 'X' }, 'request_info'))
        .skipped
    ).toBe(true);
    expect((await syncVendorMasterRecord(null, 'approve')).skipped).toBe(true);
  });
});

describe('backfillApprovedVendorMasters', () => {
  it('iterates approved master rows and upserts each idempotently', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([
        {
          id: 'm-1',
          record_code: 'V-BACK-001',
          record_name: 'Backfill Vendor 1',
          payload: JSON.stringify({
            vendor_code: 'V-BACK-001',
            vendor_legal_name: 'Backfill Vendor 1',
            tenant_id: 'tenant-default-001',
          }),
        },
        {
          id: 'm-2',
          record_code: 'V-BACK-002',
          record_name: 'Backfill Vendor 2',
          payload: { vendor_code: 'V-BACK-002', vendor_legal_name: 'Backfill Vendor 2' },
        },
      ])
      .mockResolvedValue([]);
    // Inside the transaction every connExecute returns [] (no existing match)
    // so both rows go through the INSERT branch.
    vi.mocked(connExecute).mockResolvedValue([]);

    const summary = await backfillApprovedVendorMasters();
    expect(summary.scanned).toBe(2);
    expect(summary.inserted).toBe(2);
    expect(summary.updated).toBe(0);
    expect(summary.errors).toBe(0);
  });

  it('skips rows whose payload is missing both vendor_code and legal_name', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([
        {
          id: 'm-bad',
          record_code: null,
          record_name: null,
          payload: '{}',
        },
      ])
      .mockResolvedValue([]);
    const summary = await backfillApprovedVendorMasters();
    expect(summary.scanned).toBe(1);
    expect(summary.inserted).toBe(0);
    expect(summary.errors).toBe(0);
  });

  it('returns a zero summary when the master table read fails (non-fatal)', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('schema not provisioned'));
    const summary = await backfillApprovedVendorMasters();
    expect(summary).toEqual({ scanned: 0, inserted: 0, updated: 0, errors: 0 });
  });
});
