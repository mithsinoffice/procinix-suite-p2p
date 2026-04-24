import { describe, it, expect } from 'vitest';
import {
  detectDuplicates,
  normalizeVendorName,
  loadDuplicateConfig,
} from '../duplicateDetection.mjs';

// ---------------------------------------------------------------------------
// normalizeVendorName
// ---------------------------------------------------------------------------

describe('normalizeVendorName', () => {
  it('lowercases and trims', () => {
    expect(normalizeVendorName('  Acme Corp  ')).toBe('acme');
  });

  it('strips "Ltd"', () => {
    expect(normalizeVendorName('Acme Ltd')).toBe('acme');
  });

  it('strips "Pvt Ltd"', () => {
    expect(normalizeVendorName('Acme Pvt Ltd')).toBe('acme');
  });

  it('strips "Pvt Limited"', () => {
    expect(normalizeVendorName('Acme Pvt Limited')).toBe('acme');
  });

  it('strips "Private Limited"', () => {
    expect(normalizeVendorName('Acme Private Limited')).toBe('acme');
  });

  it('strips "Inc"', () => {
    expect(normalizeVendorName('Acme Inc')).toBe('acme');
  });

  it('strips "Limited"', () => {
    expect(normalizeVendorName('Acme Limited')).toBe('acme');
  });

  it('strips "LLP"', () => {
    expect(normalizeVendorName('Acme LLP')).toBe('acme');
  });

  it('strips "Corporation"', () => {
    expect(normalizeVendorName('Acme Corporation')).toBe('acme');
  });

  it('strips "Co"', () => {
    expect(normalizeVendorName('Acme Co')).toBe('acme');
  });

  it('removes punctuation', () => {
    // "Acme (India) Pvt. Ltd." → punct strip → "Acme India Pvt Ltd" → suffix "Pvt Ltd" → "Acme India"
    expect(normalizeVendorName('Acme (India) Pvt. Ltd.')).toBe('acme india');
  });

  it('collapses whitespace', () => {
    expect(normalizeVendorName('Acme   Consulting   Services')).toBe('acme consulting services');
  });

  it('returns empty string for null', () => {
    expect(normalizeVendorName(null)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(normalizeVendorName('')).toBe('');
  });

  it('handles name that is just a suffix', () => {
    expect(normalizeVendorName('Ltd')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// loadDuplicateConfig
// ---------------------------------------------------------------------------

describe('loadDuplicateConfig', () => {
  it('returns config row when present', async () => {
    const db = { query: async () => [{ fuzzy_match_threshold: 70, fuzzy_prefix_length: 6 }] };
    const config = await loadDuplicateConfig('t1', db);
    expect(config.fuzzy_match_threshold).toBe(70);
  });

  it('throws when no config row (Q5 rule)', async () => {
    const db = { query: async () => [] };
    await expect(loadDuplicateConfig('t1', db)).rejects.toThrow('invoice_duplicate_config row missing');
  });

  it('throws when query returns null', async () => {
    const db = { query: async () => null };
    await expect(loadDuplicateConfig('t1', db)).rejects.toThrow('invoice_duplicate_config row missing');
  });
});

// ---------------------------------------------------------------------------
// Mock DB helper
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  fuzzy_match_threshold: 70,
  fuzzy_prefix_length: 6,
  amount_tolerance_pct: 1.00,
  date_window_days: 7,
  period_overlap_identical_points: 40,
  period_overlap_contained_points: 30,
  period_overlap_partial_points: 15,
};

function makeDb({ configRow = DEFAULT_CONFIG, candidates = [], fuzzyCandidates = [] } = {}) {
  return {
    query: async (sql) => {
      if (sql.includes('invoice_duplicate_config')) return [configRow];
      if (sql.includes('LEFT(invoice_number')) return fuzzyCandidates;
      if (sql.includes('invoice_number = ?')) return candidates;
      return [];
    },
  };
}

const BASE_INVOICE = {
  id: 'inv-new',
  vendor_id: 'v1',
  vendor_name: 'Acme Corp',
  invoice_number: 'INV-001',
  financial_year: '2025-26',
  invoice_date: '2026-01-15',
  total_amount: 10000,
  tenant_id: 't1',
  entity_id: 'e1',
  source_invoice_id: null,
  service_period_from: '2026-01-01',
  service_period_to: '2026-01-31',
};

// ---------------------------------------------------------------------------
// detectDuplicates — Tier 1 (hard block)
// ---------------------------------------------------------------------------

describe('detectDuplicates — Tier 1 hard block', () => {
  it('detects Tier 1 when all fields match', async () => {
    const db = makeDb({
      candidates: [{
        id: 'inv-existing', vendor_id: 'v1', vendor_name: 'Acme Corp',
        invoice_number: 'INV-001', financial_year: '2025-26',
        invoice_date: '2026-01-15', total_amount: 10000, entity_id: 'e1',
      }],
    });

    const result = await detectDuplicates({ invoice: BASE_INVOICE, tenantId: 't1', db });
    expect(result.decision).toBe('tier_1_hard');
    expect(result.overrideRequired).toBe(true);
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// detectDuplicates — Tier 2 (probable)
// ---------------------------------------------------------------------------

describe('detectDuplicates — Tier 2 probable', () => {
  it('detects Tier 2 when FY + entity match but amount differs', async () => {
    const db = makeDb({
      candidates: [{
        id: 'inv-existing', vendor_id: 'v1', vendor_name: 'Acme Corp',
        invoice_number: 'INV-001', financial_year: '2025-26',
        invoice_date: '2026-01-15', total_amount: 15000, entity_id: 'e1', // different amount
      }],
    });

    const result = await detectDuplicates({ invoice: BASE_INVOICE, tenantId: 't1', db });
    expect(result.decision).toBe('tier_2_probable');
    expect(result.overrideRequired).toBe(true);
  });

  it('detects Tier 2 when FY + entity match but date differs', async () => {
    const db = makeDb({
      candidates: [{
        id: 'inv-existing', vendor_id: 'v1', vendor_name: 'Acme Corp',
        invoice_number: 'INV-001', financial_year: '2025-26',
        invoice_date: '2026-02-01', total_amount: 10000, entity_id: 'e1', // different date
      }],
    });

    const result = await detectDuplicates({ invoice: BASE_INVOICE, tenantId: 't1', db });
    expect(result.decision).toBe('tier_2_probable');
  });
});

// ---------------------------------------------------------------------------
// detectDuplicates — Tier 2b (cross-FY silent accept)
// ---------------------------------------------------------------------------

describe('detectDuplicates — Tier 2b cross-FY', () => {
  it('detects Tier 2b when same entity but different FY', async () => {
    const db = makeDb({
      candidates: [{
        id: 'inv-existing', vendor_id: 'v1', vendor_name: 'Acme Corp',
        invoice_number: 'INV-001', financial_year: '2024-25', // different FY
        invoice_date: '2025-12-15', total_amount: 10000, entity_id: 'e1',
      }],
    });

    const result = await detectDuplicates({ invoice: BASE_INVOICE, tenantId: 't1', db });
    expect(result.decision).toBe('tier_2b_cross_fy');
    expect(result.overrideRequired).toBe(false); // silent accept
  });
});

// ---------------------------------------------------------------------------
// detectDuplicates — Tier 3 (cross-entity warn)
// ---------------------------------------------------------------------------

describe('detectDuplicates — Tier 3 cross-entity', () => {
  it('detects Tier 3 when same tenant but different entity', async () => {
    const db = makeDb({
      candidates: [{
        id: 'inv-existing', vendor_id: 'v1', vendor_name: 'Acme Corp',
        invoice_number: 'INV-001', financial_year: '2025-26',
        invoice_date: '2026-01-15', total_amount: 10000, entity_id: 'e2', // different entity
      }],
    });

    const result = await detectDuplicates({ invoice: BASE_INVOICE, tenantId: 't1', db });
    expect(result.decision).toBe('tier_3_cross_entity');
    expect(result.overrideRequired).toBe(false); // warn only
  });
});

// ---------------------------------------------------------------------------
// detectDuplicates — Tier 4 (fuzzy)
// ---------------------------------------------------------------------------

describe('detectDuplicates — Tier 4 fuzzy', () => {
  it('detects Tier 4 when fuzzy score exceeds threshold', async () => {
    const db = makeDb({
      candidates: [], // no exact invoice_number matches
      fuzzyCandidates: [{
        id: 'inv-fuzzy', vendor_id: 'v1', vendor_name: 'Acme Corp',
        invoice_number: 'INV-002', // same prefix "INV-00"
        invoice_date: '2026-01-16', // within 7-day window
        total_amount: 10050, // within 1% tolerance
        service_period_from: '2026-01-01', service_period_to: '2026-01-31', // identical period
      }],
    });

    const result = await detectDuplicates({ invoice: BASE_INVOICE, tenantId: 't1', db });
    expect(result.decision).toBe('tier_4_fuzzy');
    expect(result.overrideRequired).toBe(true);
    const fuzzyMatch = result.matches.find((m) => m.tier === 'tier_4');
    expect(fuzzyMatch).toBeDefined();
    // Score: 20 (prefix) + 25 (amount) + 15 (date) + 40 (identical period) = 100
    expect(fuzzyMatch.score).toBe(100);
  });

  it('returns clear when fuzzy score below threshold', async () => {
    const db = makeDb({
      candidates: [],
      fuzzyCandidates: [{
        id: 'inv-fuzzy', vendor_id: 'v1', vendor_name: 'Acme Corp',
        invoice_number: 'INV-002',
        invoice_date: '2026-06-01', // outside 7-day window
        total_amount: 50000, // outside 1% tolerance
        service_period_from: null, service_period_to: null,
      }],
    });

    const result = await detectDuplicates({ invoice: BASE_INVOICE, tenantId: 't1', db });
    expect(result.decision).toBe('clear');
  });
});

// ---------------------------------------------------------------------------
// detectDuplicates — source_invoice_id exclusion
// ---------------------------------------------------------------------------

describe('detectDuplicates — resubmission exclusion', () => {
  it('excludes source_invoice_id from candidates', async () => {
    const resubmitInvoice = { ...BASE_INVOICE, source_invoice_id: 'inv-parent' };
    let capturedSql = '';
    const db = {
      query: async (sql) => {
        if (sql.includes('invoice_duplicate_config')) return [DEFAULT_CONFIG];
        capturedSql = sql;
        return [];
      },
    };

    await detectDuplicates({ invoice: resubmitInvoice, tenantId: 't1', db });
    // The SQL should exclude both self AND source_invoice_id
    expect(capturedSql).toContain('id != ?');
    // Two id != ? clauses (self + source)
    const idExclusions = (capturedSql.match(/id != \?/g) || []).length;
    expect(idExclusions).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// detectDuplicates — vendor_name fallback
// ---------------------------------------------------------------------------

describe('detectDuplicates — vendor_name fallback (no vendor_id)', () => {
  it('matches via normalized vendor_name when vendor_id is null', async () => {
    const noVendorIdInvoice = { ...BASE_INVOICE, vendor_id: null };
    const db = makeDb({
      candidates: [{
        id: 'inv-existing', vendor_id: null, vendor_name: 'ACME Corp', // normalizes to "acme" (same as "Acme Corp")
        invoice_number: 'INV-001', financial_year: '2025-26',
        invoice_date: '2026-01-15', total_amount: 10000, entity_id: 'e1',
      }],
    });

    const result = await detectDuplicates({ invoice: noVendorIdInvoice, tenantId: 't1', db });
    expect(result.decision).toBe('tier_1_hard');
    expect(result.vendorFallback).toBe(true);
    expect(result.overrideRequired).toBe(true);
  });

  it('does not match when normalized vendor names differ', async () => {
    const noVendorIdInvoice = { ...BASE_INVOICE, vendor_id: null };
    const db = makeDb({
      candidates: [{
        id: 'inv-existing', vendor_id: null, vendor_name: 'Different Company',
        invoice_number: 'INV-001', financial_year: '2025-26',
        invoice_date: '2026-01-15', total_amount: 10000, entity_id: 'e1',
      }],
    });

    const result = await detectDuplicates({ invoice: noVendorIdInvoice, tenantId: 't1', db });
    expect(result.decision).toBe('clear');
  });
});

// ---------------------------------------------------------------------------
// detectDuplicates — no match (clear)
// ---------------------------------------------------------------------------

describe('detectDuplicates — clear', () => {
  it('returns clear when no candidates found', async () => {
    const db = makeDb({ candidates: [] });
    const result = await detectDuplicates({ invoice: BASE_INVOICE, tenantId: 't1', db });
    expect(result.decision).toBe('clear');
    expect(result.overrideRequired).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  it('returns clear when invoice has no invoice_number', async () => {
    const noNumInvoice = { ...BASE_INVOICE, invoice_number: null };
    const db = makeDb();
    const result = await detectDuplicates({ invoice: noNumInvoice, tenantId: 't1', db });
    expect(result.decision).toBe('clear');
  });
});

// ---------------------------------------------------------------------------
// detectDuplicates — tier priority
// ---------------------------------------------------------------------------

describe('detectDuplicates — tier priority', () => {
  it('picks highest tier when multiple candidates match at different tiers', async () => {
    const db = makeDb({
      candidates: [
        // Tier 3 match (different entity)
        { id: 'inv-t3', vendor_id: 'v1', vendor_name: 'Acme Corp',
          invoice_number: 'INV-001', financial_year: '2025-26',
          invoice_date: '2026-01-15', total_amount: 10000, entity_id: 'e2' },
        // Tier 1 match (all fields)
        { id: 'inv-t1', vendor_id: 'v1', vendor_name: 'Acme Corp',
          invoice_number: 'INV-001', financial_year: '2025-26',
          invoice_date: '2026-01-15', total_amount: 10000, entity_id: 'e1' },
      ],
    });

    const result = await detectDuplicates({ invoice: BASE_INVOICE, tenantId: 't1', db });
    expect(result.decision).toBe('tier_1_hard');
  });
});
