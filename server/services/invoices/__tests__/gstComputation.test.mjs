import { describe, it, expect } from 'vitest';
import {
  computeGstForLine,
  validateGstAgainstOcr,
  loadGstValidationConfig,
} from '../gstComputation.mjs';

// ---------------------------------------------------------------------------
// computeGstForLine
// ---------------------------------------------------------------------------

describe('computeGstForLine — same-state (intra-state)', () => {
  it('splits 18% GST into 9% CGST + 9% SGST', () => {
    const result = computeGstForLine({
      taxableAmount: 10000, gstRate: 18,
      placeOfSupply: '27', receivingEntityState: '27',
    });
    expect(result.cgstAmount).toBe(900);
    expect(result.sgstAmount).toBe(900);
    expect(result.igstAmount).toBe(0);
    expect(result.utgstAmount).toBe(0);
    expect(result.totalGst).toBe(1800);
    expect(result.isInterState).toBe(false);
  });

  it('splits 5% GST into 2.5% + 2.5%', () => {
    const result = computeGstForLine({
      taxableAmount: 1000, gstRate: 5,
      placeOfSupply: '29', receivingEntityState: '29',
    });
    expect(result.cgstAmount).toBe(25);
    expect(result.sgstAmount).toBe(25);
    expect(result.totalGst).toBe(50);
  });

  it('handles zero GST rate', () => {
    const result = computeGstForLine({
      taxableAmount: 5000, gstRate: 0,
      placeOfSupply: '27', receivingEntityState: '27',
    });
    expect(result.totalGst).toBe(0);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
  });
});

describe('computeGstForLine — inter-state', () => {
  it('applies full rate as IGST when states differ', () => {
    const result = computeGstForLine({
      taxableAmount: 10000, gstRate: 18,
      placeOfSupply: '29', receivingEntityState: '27',
    });
    expect(result.igstAmount).toBe(1800);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.totalGst).toBe(1800);
    expect(result.isInterState).toBe(true);
  });
});

describe('computeGstForLine — UT territory (UTGST)', () => {
  it('uses UTGST instead of SGST for Chandigarh (04)', () => {
    const result = computeGstForLine({
      taxableAmount: 10000, gstRate: 18,
      placeOfSupply: '04', receivingEntityState: '04',
    });
    expect(result.cgstAmount).toBe(900);
    expect(result.utgstAmount).toBe(900);
    expect(result.sgstAmount).toBe(0);
    expect(result.isUtTerritory).toBe(true);
    expect(result.totalGst).toBe(1800);
  });

  it('uses UTGST for Andaman & Nicobar (35)', () => {
    const result = computeGstForLine({
      taxableAmount: 2000, gstRate: 12,
      placeOfSupply: '35', receivingEntityState: '35',
    });
    expect(result.cgstAmount).toBe(120);
    expect(result.utgstAmount).toBe(120);
    expect(result.sgstAmount).toBe(0);
  });

  it('uses UTGST for Lakshadweep (31)', () => {
    const result = computeGstForLine({
      taxableAmount: 5000, gstRate: 28,
      placeOfSupply: '31', receivingEntityState: '31',
    });
    expect(result.utgstAmount).toBe(700);
    expect(result.sgstAmount).toBe(0);
  });

  it('uses UTGST for Other territory (97)', () => {
    const result = computeGstForLine({
      taxableAmount: 1000, gstRate: 18,
      placeOfSupply: '97', receivingEntityState: '97',
    });
    expect(result.utgstAmount).toBe(90);
    expect(result.sgstAmount).toBe(0);
  });

  it('Delhi (07) uses SGST, not UTGST (legislative state for GST)', () => {
    const result = computeGstForLine({
      taxableAmount: 10000, gstRate: 18,
      placeOfSupply: '07', receivingEntityState: '07',
    });
    expect(result.sgstAmount).toBe(900);
    expect(result.utgstAmount).toBe(0);
    expect(result.isUtTerritory).toBe(false);
  });

  it('Puducherry (34) uses SGST, not UTGST', () => {
    const result = computeGstForLine({
      taxableAmount: 10000, gstRate: 18,
      placeOfSupply: '34', receivingEntityState: '34',
    });
    expect(result.sgstAmount).toBe(900);
    expect(result.utgstAmount).toBe(0);
    expect(result.isUtTerritory).toBe(false);
  });

  it('inter-state to UT uses IGST (not UTGST)', () => {
    const result = computeGstForLine({
      taxableAmount: 10000, gstRate: 18,
      placeOfSupply: '27', receivingEntityState: '04',
    });
    expect(result.igstAmount).toBe(1800);
    expect(result.utgstAmount).toBe(0);
    expect(result.isInterState).toBe(true);
  });
});

describe('computeGstForLine — RCM', () => {
  it('passes through isRcm flag', () => {
    const result = computeGstForLine({
      taxableAmount: 10000, gstRate: 18,
      placeOfSupply: '27', receivingEntityState: '27',
      isRcm: true,
    });
    expect(result.isRcm).toBe(true);
    expect(result.cgstAmount).toBe(900);
    expect(result.sgstAmount).toBe(900);
  });

  it('defaults isRcm to false', () => {
    const result = computeGstForLine({
      taxableAmount: 1000, gstRate: 5,
      placeOfSupply: '27', receivingEntityState: '27',
    });
    expect(result.isRcm).toBe(false);
  });
});

describe('computeGstForLine — cess', () => {
  it('computes cess on taxable amount separately', () => {
    const result = computeGstForLine({
      taxableAmount: 10000, gstRate: 28,
      placeOfSupply: '27', receivingEntityState: '27',
      cessRate: 12,
    });
    expect(result.cgstAmount).toBe(1400);
    expect(result.sgstAmount).toBe(1400);
    expect(result.cessAmount).toBe(1200);
    expect(result.totalGst).toBe(4000);
  });

  it('zero cess when cessRate is 0', () => {
    const result = computeGstForLine({
      taxableAmount: 10000, gstRate: 18,
      placeOfSupply: '27', receivingEntityState: '27',
      cessRate: 0,
    });
    expect(result.cessAmount).toBe(0);
  });
});

describe('computeGstForLine — banker\'s rounding', () => {
  it('rounds 0.005 to even (half-to-even)', () => {
    // 100.50 * 9% = 9.045 → should round to 9.04 (even)
    const result = computeGstForLine({
      taxableAmount: 100.50, gstRate: 18,
      placeOfSupply: '27', receivingEntityState: '27',
    });
    expect(result.cgstAmount).toBe(9.04); // 100.50 * 0.09 = 9.045 → 9.04
    expect(result.sgstAmount).toBe(9.04);
  });

  it('rounds 0.015 to even', () => {
    // 100.1666... * 9% = 9.015 → should round to 9.02 (even)
    const result = computeGstForLine({
      taxableAmount: 100.17, gstRate: 18,
      placeOfSupply: '27', receivingEntityState: '27',
    });
    // 100.17 * 0.09 = 9.0153 → rounds to 9.02
    expect(result.cgstAmount).toBe(9.02);
  });

  it('handles fractional taxable amounts', () => {
    const result = computeGstForLine({
      taxableAmount: 999.99, gstRate: 18,
      placeOfSupply: '29', receivingEntityState: '27',
    });
    // 999.99 * 0.18 = 179.9982 → 180.00
    expect(result.igstAmount).toBe(180.00);
  });
});

// ---------------------------------------------------------------------------
// validateGstAgainstOcr
// ---------------------------------------------------------------------------

describe('validateGstAgainstOcr — exact match', () => {
  it('returns exact when computed equals OCR', () => {
    const computed = { cgstAmount: 900, sgstAmount: 900, igstAmount: 0, utgstAmount: 0, cessAmount: 0, totalGst: 1800 };
    const ocr = { cgst_amount: 900, sgst_amount: 900, igst_amount: 0, utgst_amount: 0, cess_amount: 0, total_gst: 1800 };
    const result = validateGstAgainstOcr(computed, ocr);
    expect(result.status).toBe('exact');
    expect(result.useComputed).toBe(true);
  });
});

describe('validateGstAgainstOcr — within rounding tolerance', () => {
  it('returns exact when difference ≤ ₹1 (default rounding_tolerance)', () => {
    const computed = { cgstAmount: 900, sgstAmount: 900, igstAmount: 0, utgstAmount: 0, cessAmount: 0, totalGst: 1800 };
    const ocr = { cgst_amount: 900.50, sgst_amount: 900, total_gst: 1800.50 };
    const result = validateGstAgainstOcr(computed, ocr);
    expect(result.status).toBe('exact');
  });
});

describe('validateGstAgainstOcr — minor variance', () => {
  it('returns minor_variance when difference ≤ ₹10 (default minor_variance_rupees)', () => {
    const computed = { cgstAmount: 900, sgstAmount: 900, igstAmount: 0, utgstAmount: 0, cessAmount: 0, totalGst: 1800 };
    const ocr = { cgst_amount: 895, sgst_amount: 900, total_gst: 1795 };
    const result = validateGstAgainstOcr(computed, ocr);
    expect(result.status).toBe('minor_variance');
    expect(result.useComputed).toBe(true);
    expect(result.discrepancy).toBeDefined();
    expect(result.discrepancy.cgstAmount.difference).toBe(5);
  });

  it('returns minor_variance when difference ≤ 0.5% (default minor_variance_pct)', () => {
    // 0.4% variance on a large amount
    const computed = { cgstAmount: 10000, sgstAmount: 10000, igstAmount: 0, utgstAmount: 0, cessAmount: 0, totalGst: 20000 };
    const ocr = { cgst_amount: 10000, sgst_amount: 10000, total_gst: 20080 }; // 0.4% diff on totalGst
    const result = validateGstAgainstOcr(computed, ocr);
    expect(result.status).toBe('minor_variance');
    expect(result.useComputed).toBe(true);
  });
});

describe('validateGstAgainstOcr — material variance', () => {
  it('returns material_variance when difference > ₹10 and > 0.5%', () => {
    const computed = { cgstAmount: 900, sgstAmount: 900, igstAmount: 0, utgstAmount: 0, cessAmount: 0, totalGst: 1800 };
    const ocr = { cgst_amount: 800, sgst_amount: 900, total_gst: 1700 };
    const result = validateGstAgainstOcr(computed, ocr);
    expect(result.status).toBe('material_variance');
    expect(result.useComputed).toBe(false);
    expect(result.exceptionReason).toBe('gst_variance');
    expect(result.discrepancy).toBeDefined();
  });
});

describe('validateGstAgainstOcr — custom config', () => {
  it('uses custom rounding tolerance', () => {
    const computed = { cgstAmount: 900, sgstAmount: 900, igstAmount: 0, utgstAmount: 0, cessAmount: 0, totalGst: 1800 };
    const ocr = { cgst_amount: 898, sgst_amount: 900, total_gst: 1798 };
    const config = { rounding_tolerance_rupees: 3, minor_variance_rupees: 10, minor_variance_pct: 0.5 };
    const result = validateGstAgainstOcr(computed, ocr, config);
    expect(result.status).toBe('exact'); // ₹2 diff, within custom ₹3 tolerance
  });

  it('uses custom minor variance threshold', () => {
    const computed = { cgstAmount: 900, sgstAmount: 900, igstAmount: 0, utgstAmount: 0, cessAmount: 0, totalGst: 1800 };
    const ocr = { cgst_amount: 880, sgst_amount: 900, total_gst: 1780 };
    const config = { rounding_tolerance_rupees: 1, minor_variance_rupees: 25, minor_variance_pct: 0.5 };
    const result = validateGstAgainstOcr(computed, ocr, config);
    expect(result.status).toBe('minor_variance'); // ₹20 diff, within custom ₹25
  });
});

describe('validateGstAgainstOcr — missing OCR fields', () => {
  it('treats missing OCR fields as 0', () => {
    const computed = { cgstAmount: 900, sgstAmount: 900, igstAmount: 0, utgstAmount: 0, cessAmount: 0, totalGst: 1800 };
    const ocr = {}; // all missing
    const result = validateGstAgainstOcr(computed, ocr);
    expect(result.status).toBe('material_variance');
  });
});

// ---------------------------------------------------------------------------
// loadGstValidationConfig
// ---------------------------------------------------------------------------

describe('loadGstValidationConfig', () => {
  it('returns DB values when row exists', async () => {
    const db = {
      query: async () => [{
        rounding_tolerance_rupees: 2, minor_variance_rupees: 20,
        minor_variance_pct: 1, auto_correct_minor_variance: 1,
      }],
    };
    const config = await loadGstValidationConfig('t1', db);
    expect(config.rounding_tolerance_rupees).toBe(2);
    expect(config.minor_variance_rupees).toBe(20);
    expect(config.minor_variance_pct).toBe(1);
    expect(config.auto_correct_minor_variance).toBe(true);
  });

  it('returns defaults when no row exists', async () => {
    const db = { query: async () => [] };
    const config = await loadGstValidationConfig('t1', db);
    expect(config.rounding_tolerance_rupees).toBe(1);
    expect(config.minor_variance_rupees).toBe(10);
    expect(config.minor_variance_pct).toBe(0.5);
    expect(config.auto_correct_minor_variance).toBe(true);
  });

  it('returns defaults when query returns null', async () => {
    const db = { query: async () => null };
    const config = await loadGstValidationConfig('t1', db);
    expect(config.rounding_tolerance_rupees).toBe(1);
  });
});
