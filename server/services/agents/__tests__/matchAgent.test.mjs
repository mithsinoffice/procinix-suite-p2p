import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mysql.mjs before importing matchAgent so DB calls don't run
vi.mock('../../../mysql.mjs', () => ({
  query: vi.fn().mockResolvedValue([]),
  withTransaction: vi.fn(async (fn) => {
    const mockConn = {};
    return fn(mockConn);
  }),
  connExecute: vi.fn().mockResolvedValue([]),
}));

const { processMatch, DEFAULT_FETCHERS, deriveMatchResult } = await import('../matchAgent.mjs');
const { connExecute } = await import('../../../mysql.mjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchers(overrides = {}) {
  return {
    getPOExact: vi.fn().mockResolvedValue(null),
    getPOFuzzy: vi.fn().mockResolvedValue(null),
    getRecurringInvoices: vi.fn().mockResolvedValue(null),
    getGRNsForPO: vi.fn().mockResolvedValue([]),
    getTolerances: vi.fn().mockResolvedValue({}),
    getSnapshotValues: vi
      .fn()
      .mockResolvedValue({ po: null, grns: [], snapshotAt: '2026-04-24T00:00:00.000Z' }),
    ...overrides,
  };
}

const baseExtractedData = {
  po_number: 'PO-001',
  vendor_name: 'Acme Corp',
  total_amount: 10000,
  invoice_date: '2026-04-01',
};

// ---------------------------------------------------------------------------
// DEFAULT_FETCHERS structure
// ---------------------------------------------------------------------------

describe('DEFAULT_FETCHERS', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_FETCHERS)).toBe(true);
  });

  it('has all 6 fetcher keys', () => {
    const keys = Object.keys(DEFAULT_FETCHERS).sort();
    expect(keys).toEqual([
      'getGRNsForPO',
      'getPOExact',
      'getPOFuzzy',
      'getRecurringInvoices',
      'getSnapshotValues',
      'getTolerances',
    ]);
  });

  it('getGRNsForPO returns empty array (WS-1a stub)', async () => {
    const result = await DEFAULT_FETCHERS.getGRNsForPO('some-po-id');
    expect(result).toEqual([]);
  });

  it('getTolerances returns hardcoded values', async () => {
    const tol = await DEFAULT_FETCHERS.getTolerances('t1', 'v1');
    expect(tol.twoWayAmountPct).toBe(0.05);
    expect(tol.fuzzyDateDays).toBe(90);
    expect(tol.recurringWindowMonths).toBe(6);
  });

  it('getSnapshotValues returns stub structure', async () => {
    const snap = await DEFAULT_FETCHERS.getSnapshotValues('po1', []);
    expect(snap.po).toBeNull();
    expect(snap.grns).toEqual([]);
    expect(snap.snapshotAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Orchestration with mock fetchers
// ---------------------------------------------------------------------------

describe('processMatch — orchestration via fetchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getPOExact first with poNumber and entityId', async () => {
    const fetchers = makeFetchers();
    await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    expect(fetchers.getPOExact).toHaveBeenCalledWith('PO-001', 'entity-1');
  });

  it('on exact match, calls getGRNsForPO with the matched PO id', async () => {
    const fetchers = makeFetchers({
      getPOExact: vi.fn().mockResolvedValue({
        id: 'po-123',
        po_number: 'PO-001',
        vendor_name: 'Acme Corp',
        total_amount: 10000,
      }),
    });

    const result = await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    expect(fetchers.getGRNsForPO).toHaveBeenCalledWith('po-123');
    expect(result.matchType).toBe('2way_po');
    expect(result.matchConfidence).toBe(0.98);
  });

  it('skips getPOFuzzy and getRecurringInvoices when exact match found', async () => {
    const fetchers = makeFetchers({
      getPOExact: vi.fn().mockResolvedValue({
        id: 'po-123',
        po_number: 'PO-001',
        vendor_name: 'Acme Corp',
        total_amount: 10000,
      }),
    });

    await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    expect(fetchers.getPOFuzzy).not.toHaveBeenCalled();
    expect(fetchers.getRecurringInvoices).not.toHaveBeenCalled();
  });

  it('falls back to getPOFuzzy when exact match returns null', async () => {
    const fetchers = makeFetchers({
      getPOFuzzy: vi.fn().mockResolvedValue({
        id: 'po-456',
        po_number: 'PO-002',
        vendor_name: 'Acme Corp',
        total_amount: 10200,
      }),
    });

    const result = await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    expect(fetchers.getPOExact).toHaveBeenCalled();
    expect(fetchers.getPOFuzzy).toHaveBeenCalledWith('Acme Corp', 10000, '2026-04-01', 'entity-1');
    expect(result.matchType).toBe('service_po');
    expect(result.matchConfidence).toBe(0.72);
  });

  it('falls back to getRecurringInvoices when both PO matchers return null', async () => {
    const fetchers = makeFetchers({
      getRecurringInvoices: vi.fn().mockResolvedValue([
        { id: 'i1', invoice_number: 'INV-1', total_amount: 9900, invoice_date: '2026-01-01' },
        { id: 'i2', invoice_number: 'INV-2', total_amount: 10100, invoice_date: '2026-02-01' },
        { id: 'i3', invoice_number: 'INV-3', total_amount: 10000, invoice_date: '2026-03-01' },
      ]),
    });

    const result = await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    expect(fetchers.getRecurringInvoices).toHaveBeenCalledWith('Acme Corp', 10000);
    expect(result.matchType).toBe('recurring');
    expect(result.matchConfidence).toBe(0.6);
  });

  it('returns matchType=none when all fetchers return null', async () => {
    const fetchers = makeFetchers();

    const result = await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    expect(result.matchType).toBe('none');
    expect(result.matchConfidence).toBe(0);
  });

  it('GRN stub returning [] produces "not yet implemented" explanation', async () => {
    const fetchers = makeFetchers({
      getPOExact: vi.fn().mockResolvedValue({
        id: 'po-123',
        po_number: 'PO-001',
        vendor_name: 'Acme Corp',
        total_amount: 10000,
      }),
      getGRNsForPO: vi.fn().mockResolvedValue([]),
    });

    const result = await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    expect(result.explanation).toContain('GRN verification not yet implemented');
  });

  it('exact match with vendor mismatch yields confidence 0.80', async () => {
    const fetchers = makeFetchers({
      getPOExact: vi.fn().mockResolvedValue({
        id: 'po-123',
        po_number: 'PO-001',
        vendor_name: 'Different Vendor',
        total_amount: 10000,
      }),
    });

    const result = await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    expect(result.matchConfidence).toBe(0.8);
    expect(result.explanation).toContain('vendor name differs');
  });

  it('exact match with amount variance yields confidence 0.85', async () => {
    const fetchers = makeFetchers({
      getPOExact: vi.fn().mockResolvedValue({
        id: 'po-123',
        po_number: 'PO-001',
        vendor_name: 'Acme Corp',
        total_amount: 20000,
      }),
    });

    const result = await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    expect(result.matchConfidence).toBe(0.85);
    expect(result.explanation).toContain('amount variance exceeds tolerance');
  });
});

// ---------------------------------------------------------------------------
// deriveMatchResult — 7-value ENUM mapping
// ---------------------------------------------------------------------------

describe('deriveMatchResult', () => {
  it('returns Not Applicable when no PO reference and matchType is none', () => {
    expect(deriveMatchResult('none', null, { vendor_name: 'X', total_amount: 100 }, {})).toBe(
      'Not Applicable'
    );
  });

  it('returns Unmatched when matchType is none but PO number was present', () => {
    expect(deriveMatchResult('none', null, { po_number: 'PO-1', total_amount: 100 }, {})).toBe(
      'Unmatched'
    );
  });

  it('returns Fully Matched when PO matched and amount within 5%', () => {
    const po = { total_amount: 10000 };
    const ed = { po_number: 'PO-1', total_amount: 10400 }; // 4% variance
    expect(deriveMatchResult('2way_po', po, ed, {})).toBe('Fully Matched');
  });

  it('returns Tolerance Breach when amount between 5% and 10%', () => {
    const po = { total_amount: 10000 };
    const ed = { po_number: 'PO-1', total_amount: 10800 }; // 8% variance
    expect(deriveMatchResult('2way_po', po, ed, {})).toBe('Tolerance Breach');
  });

  it('returns Rate Variance when amount exceeds 10%', () => {
    const po = { total_amount: 10000 };
    const ed = { po_number: 'PO-1', total_amount: 12000 }; // 20% variance
    expect(deriveMatchResult('2way_po', po, ed, {})).toBe('Rate Variance');
  });

  it('returns Partially Matched for recurring pattern', () => {
    expect(deriveMatchResult('recurring', null, { vendor_name: 'X', total_amount: 100 }, {})).toBe(
      'Partially Matched'
    );
  });

  it('returns Partially Matched when PO matched but amounts missing', () => {
    const po = { total_amount: null };
    const ed = { po_number: 'PO-1', total_amount: null };
    expect(deriveMatchResult('service_po', po, ed, {})).toBe('Partially Matched');
  });
});

// ---------------------------------------------------------------------------
// match persistence — UPDATE invoices fires with correct values
// ---------------------------------------------------------------------------

describe('processMatch — match persistence to invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes match_result, match_score, match_details to invoices in transaction', async () => {
    const fetchers = makeFetchers({
      getPOExact: vi.fn().mockResolvedValue({
        id: 'po-123',
        po_number: 'PO-001',
        vendor_name: 'Acme Corp',
        total_amount: 10000,
      }),
    });

    const result = await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    // connExecute is called twice in the transaction: INSERT + UPDATE
    expect(connExecute).toHaveBeenCalledTimes(2);

    const updateCall = connExecute.mock.calls[1];
    const updateSql = updateCall[1];
    const updateParams = updateCall[2];

    expect(updateSql).toContain('UPDATE invoices');
    expect(updateSql).toContain('match_result');
    expect(updateSql).toContain('match_score');
    expect(updateSql).toContain('match_details');
    expect(updateSql).toContain('match_computed_at');

    expect(updateParams[0]).toBe('Fully Matched'); // match_result
    expect(updateParams[1]).toBe(98); // match_score (0.98 * 100)
    expect(updateParams[3]).toBe('inv-1'); // invoice_id
    expect(result.matchResult).toBe('Fully Matched');
    expect(result.matchScore).toBe(98);
  });

  it('writes Unmatched when no match found and PO was referenced', async () => {
    const fetchers = makeFetchers();
    const result = await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    const updateCall = connExecute.mock.calls[1];
    expect(updateCall[2][0]).toBe('Unmatched');
    expect(result.matchResult).toBe('Unmatched');
    expect(result.matchScore).toBe(0);
  });

  it('writes Not Applicable when no PO reference on invoice', async () => {
    const fetchers = makeFetchers();
    const noPOData = { vendor_name: 'Acme', total_amount: 5000, invoice_date: '2026-01-01' };
    const result = await processMatch('inv-1', noPOData, 'entity-1', fetchers);

    const updateCall = connExecute.mock.calls[1];
    expect(updateCall[2][0]).toBe('Not Applicable');
    expect(result.matchResult).toBe('Not Applicable');
  });

  it('writes Tolerance Breach when amount between 5% and 10%', async () => {
    const fetchers = makeFetchers({
      getPOExact: vi.fn().mockResolvedValue({
        id: 'po-123',
        po_number: 'PO-001',
        vendor_name: 'Acme Corp',
        total_amount: 10000,
      }),
    });
    // 8% variance
    const data = { ...baseExtractedData, total_amount: 10800 };
    const result = await processMatch('inv-1', data, 'entity-1', fetchers);

    const updateCall = connExecute.mock.calls[1];
    expect(updateCall[2][0]).toBe('Tolerance Breach');
    expect(result.matchResult).toBe('Tolerance Breach');
  });

  it('writes Rate Variance when amount exceeds 10%', async () => {
    const fetchers = makeFetchers({
      getPOExact: vi.fn().mockResolvedValue({
        id: 'po-123',
        po_number: 'PO-001',
        vendor_name: 'Acme Corp',
        total_amount: 10000,
      }),
    });
    // 25% variance
    const data = { ...baseExtractedData, total_amount: 12500 };
    const result = await processMatch('inv-1', data, 'entity-1', fetchers);

    const updateCall = connExecute.mock.calls[1];
    expect(updateCall[2][0]).toBe('Rate Variance');
    expect(result.matchResult).toBe('Rate Variance');
  });

  it('writes Partially Matched for recurring pattern', async () => {
    const fetchers = makeFetchers({
      getRecurringInvoices: vi.fn().mockResolvedValue([
        { id: 'i1', invoice_number: 'INV-1', total_amount: 9900, invoice_date: '2026-01-01' },
        { id: 'i2', invoice_number: 'INV-2', total_amount: 10100, invoice_date: '2026-02-01' },
        { id: 'i3', invoice_number: 'INV-3', total_amount: 10000, invoice_date: '2026-03-01' },
      ]),
    });
    const noPOData = { vendor_name: 'Acme Corp', total_amount: 10000, invoice_date: '2026-04-01' };
    const result = await processMatch('inv-1', noPOData, 'entity-1', fetchers);

    const updateCall = connExecute.mock.calls[1];
    expect(updateCall[2][0]).toBe('Partially Matched');
    expect(result.matchResult).toBe('Partially Matched');
  });

  it('match_details JSON contains snapshot structure', async () => {
    const fetchers = makeFetchers({
      getPOExact: vi.fn().mockResolvedValue({
        id: 'po-123',
        po_number: 'PO-001',
        vendor_name: 'Acme Corp',
        total_amount: 10000,
      }),
    });

    await processMatch('inv-1', baseExtractedData, 'entity-1', fetchers);

    const updateCall = connExecute.mock.calls[1];
    const matchDetailsJson = JSON.parse(updateCall[2][2]);
    expect(matchDetailsJson).toHaveProperty('matchType', '2way_po');
    expect(matchDetailsJson).toHaveProperty('variances');
    expect(matchDetailsJson).toHaveProperty('po');
    expect(matchDetailsJson).toHaveProperty('grns');
    expect(matchDetailsJson).toHaveProperty('snapshotAt');
  });
});
