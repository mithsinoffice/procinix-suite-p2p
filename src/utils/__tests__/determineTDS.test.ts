import { describe, expect, it } from 'vitest';
import { determineTDS } from '../determineTDS';

const baseVendor = {
  type: 'company' as const,
  panValid: true,
  lowerCert: false,
  lowerRate: 0,
  tdsExempt: false,
  itrFiled: true,
};

describe('determineTDS', () => {
  it('applies standard company rate per section', () => {
    const r194c = determineTDS({
      itemMaster: { tdsSec: '194C', threshold: 0 },
      vendorMaster: baseVendor,
      amount: 100000,
    });
    const r194j = determineTDS({
      itemMaster: { tdsSec: '194J', threshold: 0 },
      vendorMaster: baseVendor,
      amount: 100000,
    });
    expect(r194c.rate).toBe(2);
    expect(r194j.rate).toBe(10);
  });

  it('uses 1% for individual on 194C', () => {
    const out = determineTDS({
      itemMaster: { tdsSec: '194C', threshold: 0 },
      vendorMaster: { ...baseVendor, type: 'indiv' },
      amount: 100000,
    });
    expect(out.rate).toBe(1);
  });

  it('returns zero when below threshold', () => {
    const out = determineTDS({
      itemMaster: { tdsSec: '194J', threshold: 50000 },
      vendorMaster: baseVendor,
      amount: 30000,
    });
    expect(out.tdsA).toBe(0);
    expect(out.override).toBe('belowThreshold');
  });

  it('applies 206AA at 20%', () => {
    const out = determineTDS({
      itemMaster: { tdsSec: '194C', threshold: 0 },
      vendorMaster: { ...baseVendor, panValid: false },
      amount: 100000,
    });
    expect(out.override).toBe('206AA');
    expect(out.rate).toBe(20);
  });

  it('applies 206AB at max(standard,5)', () => {
    const out = determineTDS({
      itemMaster: { tdsSec: '194Q', threshold: 0 },
      vendorMaster: { ...baseVendor, itrFiled: false },
      amount: 100000,
    });
    expect(out.override).toBe('206AB');
    expect(out.rate).toBe(5);
  });

  it('applies lower certificate rate', () => {
    const out = determineTDS({
      itemMaster: { tdsSec: '194J', threshold: 0 },
      vendorMaster: { ...baseVendor, lowerCert: true, lowerRate: 2.5 },
      amount: 100000,
    });
    expect(out.override).toBe('lowerCert');
    expect(out.rate).toBe(2.5);
  });

  it('returns zero for exempt vendor', () => {
    const out = determineTDS({
      itemMaster: { tdsSec: '194J', threshold: 0 },
      vendorMaster: { ...baseVendor, tdsExempt: true },
      amount: 100000,
    });
    expect(out.override).toBe('exempt');
    expect(out.netTDS).toBe(0);
  });

  it('returns zero for no section', () => {
    const out = determineTDS({
      itemMaster: { tdsSec: 'None', threshold: 0 },
      vendorMaster: baseVendor,
      amount: 100000,
    });
    expect(out.override).toBe('noSection');
    expect(out.tdsA).toBe(0);
  });

  it('calculates on taxable value only (not GST inclusive)', () => {
    const out = determineTDS({
      itemMaster: { tdsSec: '194C', threshold: 0 },
      vendorMaster: baseVendor,
      amount: 100000,
    });
    expect(out.tdsA).toBe(2000);
  });

  it('calculates surcharge and cess above 1Cr', () => {
    const out = determineTDS({
      itemMaster: { tdsSec: '194C', threshold: 0 },
      vendorMaster: baseVendor,
      amount: 1_50_00_000,
    });
    expect(out.surcharge).toBeGreaterThan(0);
    expect(out.cess).toBeGreaterThan(0);
    expect(out.netTDS).toBeCloseTo(out.tdsA + out.surcharge + out.cess, 2);
  });
});
