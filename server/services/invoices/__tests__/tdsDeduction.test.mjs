import { describe, it, expect, vi } from 'vitest';
import { computeTdsForLine } from '../tdsDeduction.mjs';

// ---------------------------------------------------------------------------
// Mock DB helper
// ---------------------------------------------------------------------------

function makeDb({
  entityOverride = null,
  vendorSections = [],
  compliance = {},
  config = null,
  ytd = null,
  tenantTurnover = null,
} = {}) {
  return {
    query: async (sql, params) => {
      if (sql.includes('vendor_entity_mappings')) {
        return entityOverride ? [{ default_tds_section_override: entityOverride }] : [];
      }
      if (sql.includes('tds_sections')) {
        return [{ tds_sections: vendorSections }];
      }
      if (sql.includes('tds_section_config')) {
        return config ? [config] : [];
      }
      if (sql.includes('vendor_pan_compliance') && !sql.includes('tds_sections')) {
        return [compliance];
      }
      if (sql.includes('tds_ytd_aggregates')) {
        return ytd ? [ytd] : [];
      }
      if (sql.includes('prior_fy_turnover')) {
        return tenantTurnover != null ? [{ prior_fy_turnover: tenantTurnover }] : [];
      }
      return [];
    },
  };
}

const BASE_CONFIG = {
  default_rate: 10,
  pan_not_available_rate: 20,
  applies_to_base: 'excl_gst',
  threshold_crossing_behavior: 'catch_up',
  annual_aggregate_threshold: 30000,
  single_invoice_threshold: null,
  is_active: 1,
};

const BASE_LINE = { taxable_amount: 10000, cgst_amount: 900, sgst_amount: 900 };

const BASE_COMPLIANCE = { pan: 'AABCU9603R', section_206ab: 'not_applicable', lower_tds_section: 'not_applicable' };

const OPTS = { tenantId: 't1', vendorId: 'v1', entityId: 'e1', invoiceDate: '2026-01-15' };

// ---------------------------------------------------------------------------
// Step 2: Section resolution order
// ---------------------------------------------------------------------------

describe('TDS engine — section resolution', () => {
  it('uses entity override when present', async () => {
    const db = makeDb({
      entityOverride: '194C_IND',
      vendorSections: ['194J_PRO'],
      config: { ...BASE_CONFIG, tds_section: '194C_IND' },
      compliance: BASE_COMPLIANCE,
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsApplicable).toBe(true);
    expect(r.tdsSection).toBe('194C_IND');
  });

  it('falls back to vendor tds_sections when no entity override', async () => {
    const db = makeDb({
      vendorSections: ['194J_PRO'],
      config: { ...BASE_CONFIG },
      compliance: BASE_COMPLIANCE,
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsSection).toBe('194J_PRO');
  });

  it('returns tdsApplicable=false when no section resolvable', async () => {
    const db = makeDb({ vendorSections: [] });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsApplicable).toBe(false);
    expect(r.tdsSection).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Step 3: 206AB
// ---------------------------------------------------------------------------

describe('TDS engine — 206AB', () => {
  it('applies 2x rate when section_206ab=specified_person', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, annual_aggregate_threshold: null },
      compliance: { ...BASE_COMPLIANCE, section_206ab: 'specified_person' },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsRate).toBe(20); // 2 × 10%
  });

  it('applies minimum 5% for 206AB even when 2x < 5', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, default_rate: 2, annual_aggregate_threshold: null },
      compliance: { ...BASE_COMPLIANCE, section_206ab: 'non_filer' },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsRate).toBe(5); // max(2×2, 5) = 5
  });
});

// ---------------------------------------------------------------------------
// Step 4: 206AA (PAN missing)
// ---------------------------------------------------------------------------

describe('TDS engine — 206AA (PAN missing)', () => {
  it('applies pan_not_available_rate when PAN missing', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, annual_aggregate_threshold: null },
      compliance: { ...BASE_COMPLIANCE, pan: null },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsRate).toBe(20);
  });

  it('applies pan_not_available_rate when PAN is empty string', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, annual_aggregate_threshold: null },
      compliance: { ...BASE_COMPLIANCE, pan: '  ' },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsRate).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Step 3+4: 206AB stacking with 206AA
// ---------------------------------------------------------------------------

describe('TDS engine — 206AB + 206AA stacking', () => {
  it('uses higher of 206AB and 206AA when both apply', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, default_rate: 10, pan_not_available_rate: 20, annual_aggregate_threshold: null },
      compliance: { pan: null, section_206ab: 'specified_person', lower_tds_section: 'not_applicable' },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    // 206AB: max(2×10, 5) = 20. 206AA: 20. Higher = 20.
    expect(r.tdsRate).toBe(20);
  });

  it('206AB wins when higher than 206AA', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, default_rate: 15, pan_not_available_rate: 20, annual_aggregate_threshold: null },
      compliance: { pan: null, section_206ab: 'non_filer', lower_tds_section: 'not_applicable' },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    // 206AB: max(2×15, 5) = 30. 206AA: 20. Higher = 30.
    expect(r.tdsRate).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// Step 5: applies_to_base variants
// ---------------------------------------------------------------------------

describe('TDS engine — applies_to_base', () => {
  it('excl_gst uses taxable_amount only', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, applies_to_base: 'excl_gst', annual_aggregate_threshold: null },
      compliance: BASE_COMPLIANCE,
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsBaseAmount).toBe(10000);
  });

  it('incl_gst adds GST components to base', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, applies_to_base: 'incl_gst', annual_aggregate_threshold: null },
      compliance: BASE_COMPLIANCE,
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    // 10000 + 900 + 900 = 11800
    expect(r.tdsBaseAmount).toBe(11800);
  });
});

// ---------------------------------------------------------------------------
// Step 6: Lower TDS certificate
// ---------------------------------------------------------------------------

describe('TDS engine — lower TDS certificate', () => {
  it('applies cert rate when section matches and dates valid', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, annual_aggregate_threshold: null },
      compliance: {
        pan: 'AABCU9603R', section_206ab: 'not_applicable',
        lower_tds_section: '194C_IND',
        lower_tds_cert_number: 'CERT-001',
        lower_tds_cert_valid_from: '2025-04-01',
        lower_tds_cert_valid_to: '2026-03-31',
        lower_tds_cert_rate: 2,
      },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsRate).toBe(2);
    expect(r.tdsCertificateRef).toBe('CERT-001');
  });

  it('returns exception when cert fields incomplete', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG },
      compliance: {
        pan: 'AABCU9603R', section_206ab: 'not_applicable',
        lower_tds_section: '194C_IND',
        lower_tds_cert_number: 'CERT-001',
        lower_tds_cert_valid_from: '2025-04-01',
        lower_tds_cert_valid_to: null, // missing
        lower_tds_cert_rate: null, // missing
      },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.exceptionReason).toBe('incomplete_lower_tds_certificate');
  });

  it('logs warning for section_206aa and passes through', async () => {
    const warnFn = vi.fn();
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, annual_aggregate_threshold: null },
      compliance: {
        pan: 'AABCU9603R', section_206ab: 'not_applicable',
        lower_tds_section: 'section_206aa',
      },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db, warn: warnFn });
    expect(warnFn).toHaveBeenCalledWith(expect.stringContaining('section_206aa'));
    expect(r.tdsRate).toBe(10); // original rate, not modified
  });
});

// ---------------------------------------------------------------------------
// Step 7: Threshold catch-up
// ---------------------------------------------------------------------------

describe('TDS engine — threshold catch-up', () => {
  it('exempts when aggregate below threshold', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, annual_aggregate_threshold: 30000 },
      compliance: BASE_COMPLIANCE,
      ytd: { ytd_base_amount: 10000, ytd_tds_amount: 0 },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: { taxable_amount: 5000 }, db });
    // 10000 + 5000 = 15000 < 30000 → exempt
    expect(r.tdsThresholdExempted).toBe(true);
    expect(r.tdsAmount).toBe(0);
  });

  it('catches up on full cumulative when crossing threshold', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, annual_aggregate_threshold: 30000, default_rate: 10 },
      compliance: BASE_COMPLIANCE,
      ytd: { ytd_base_amount: 25000, ytd_tds_amount: 0 },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: { taxable_amount: 10000 }, db });
    // cumulative = 25000 + 10000 = 35000 > 30000
    // catch-up: 35000 * 10% = 3500 - 0 (prev TDS) = 3500
    expect(r.tdsAmount).toBe(3500);
    expect(r.tdsThresholdExempted).toBe(false);
  });

  it('applies normal rate when already above threshold', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, annual_aggregate_threshold: 30000, default_rate: 10 },
      compliance: BASE_COMPLIANCE,
      ytd: { ytd_base_amount: 40000, ytd_tds_amount: 4000 },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: { taxable_amount: 10000 }, db });
    // Already above: 10000 * 10% = 1000
    expect(r.tdsAmount).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// Step 7: Single-invoice threshold
// ---------------------------------------------------------------------------

describe('TDS engine — single-invoice threshold', () => {
  it('triggers deduction when single line exceeds single-invoice threshold', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, annual_aggregate_threshold: 100000, single_invoice_threshold: 20000, default_rate: 10 },
      compliance: BASE_COMPLIANCE,
      ytd: { ytd_base_amount: 0, ytd_tds_amount: 0 },
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: { taxable_amount: 25000 }, db });
    // single_invoice_threshold=20000, line=25000 → triggers
    expect(r.tdsAmount).toBe(2500);
    expect(r.tdsThresholdExempted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Missing config exception
// ---------------------------------------------------------------------------

describe('TDS engine — missing config', () => {
  it('returns tds_section_config_missing when no config row', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: null, // no config row
      compliance: BASE_COMPLIANCE,
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.exceptionReason).toBe('tds_section_config_missing');
    expect(r.tdsApplicable).toBe(true);
    expect(r.tdsSection).toBe('194C_IND');
  });
});

// ---------------------------------------------------------------------------
// 194Q buyer turnover gate
// ---------------------------------------------------------------------------

describe('TDS engine — 194Q gate', () => {
  it('returns tdsApplicable=false when buyer turnover ≤ ₹10 crore', async () => {
    const db = makeDb({
      vendorSections: ['194Q'],
      config: { ...BASE_CONFIG },
      compliance: BASE_COMPLIANCE,
      tenantTurnover: 50000000, // ₹5 crore
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsApplicable).toBe(false);
    expect(r.tdsSection).toBe('194Q'); // recorded for audit
  });

  it('returns tdsApplicable=false when turnover not set', async () => {
    const db = makeDb({
      vendorSections: ['194Q'],
      config: { ...BASE_CONFIG },
      compliance: BASE_COMPLIANCE,
      tenantTurnover: null,
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsApplicable).toBe(false);
    expect(r.tdsSection).toBe('194Q');
  });

  it('proceeds normally when turnover > ₹10 crore', async () => {
    const db = makeDb({
      vendorSections: ['194Q'],
      config: { ...BASE_CONFIG, annual_aggregate_threshold: null },
      compliance: BASE_COMPLIANCE,
      tenantTurnover: 200000000, // ₹20 crore
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.tdsApplicable).toBe(true);
    expect(r.tdsAmount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ytdDelta returned for caller
// ---------------------------------------------------------------------------

describe('TDS engine — ytdDelta', () => {
  it('returns ytdDelta with baseAmount and tdsAmount', async () => {
    const db = makeDb({
      vendorSections: ['194C_IND'],
      config: { ...BASE_CONFIG, annual_aggregate_threshold: null },
      compliance: BASE_COMPLIANCE,
    });

    const r = await computeTdsForLine({ ...OPTS, lineItem: BASE_LINE, db });
    expect(r.ytdDelta).toBeDefined();
    expect(r.ytdDelta.baseAmount).toBe(10000);
    expect(r.ytdDelta.tdsAmount).toBe(1000);
  });
});
