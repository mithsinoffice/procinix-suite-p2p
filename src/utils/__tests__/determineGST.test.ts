import { describe, expect, it } from 'vitest';
import { determineGST } from '../determineGST';

const baseItem = { gstRate: 18, rcmCategory: false };
const baseVendor = { gstReg: 'reg' as const };
const baseFlags = {
  rcm: false,
  exempt: false,
  sez: false,
  interState: false,
  import: false,
  itcblock: false,
};

describe('determineGST', () => {
  it('handles intra-state standard GST split', () => {
    const out = determineGST({
      itemMaster: baseItem,
      vendorMaster: baseVendor,
      invoiceFlags: baseFlags,
      amount: 1000,
    });
    expect(out.cgst).toBe(90);
    expect(out.sgst).toBe(90);
    expect(out.igst).toBe(0);
  });

  it('handles inter-state standard GST', () => {
    const out = determineGST({
      itemMaster: baseItem,
      vendorMaster: baseVendor,
      invoiceFlags: { ...baseFlags, interState: true },
      amount: 1000,
    });
    expect(out.igst).toBe(180);
    expect(out.cgst).toBe(0);
    expect(out.sgst).toBe(0);
  });

  it('URD triggers RCM', () => {
    const out = determineGST({
      itemMaster: baseItem,
      vendorMaster: { gstReg: 'urd' },
      invoiceFlags: baseFlags,
      amount: 1000,
    });
    expect(out.isRcm).toBe(true);
  });

  it('RCM flag triggers RCM', () => {
    const out = determineGST({
      itemMaster: baseItem,
      vendorMaster: baseVendor,
      invoiceFlags: { ...baseFlags, rcm: true },
      amount: 1000,
    });
    expect(out.isRcm).toBe(true);
  });

  it('rcmCategory item triggers RCM', () => {
    const out = determineGST({
      itemMaster: { ...baseItem, rcmCategory: true },
      vendorMaster: baseVendor,
      invoiceFlags: baseFlags,
      amount: 1000,
    });
    expect(out.isRcm).toBe(true);
  });

  it('exempt zeros all taxes', () => {
    const out = determineGST({
      itemMaster: baseItem,
      vendorMaster: baseVendor,
      invoiceFlags: { ...baseFlags, exempt: true },
      amount: 1000,
    });
    expect(out.igst + out.cgst + out.sgst).toBe(0);
  });

  it('SEZ zeros all taxes', () => {
    const out = determineGST({
      itemMaster: baseItem,
      vendorMaster: baseVendor,
      invoiceFlags: { ...baseFlags, sez: true },
      amount: 1000,
    });
    expect(out.igst + out.cgst + out.sgst).toBe(0);
  });

  it('composition dealer applies 1% + 1%', () => {
    const out = determineGST({
      itemMaster: baseItem,
      vendorMaster: { gstReg: 'comp' },
      invoiceFlags: baseFlags,
      amount: 1000,
    });
    expect(out.cgst).toBe(10);
    expect(out.sgst).toBe(10);
    expect(out.isRcm).toBe(true);
  });

  it('import uses IGST', () => {
    const out = determineGST({
      itemMaster: baseItem,
      vendorMaster: baseVendor,
      invoiceFlags: { ...baseFlags, import: true },
      amount: 1000,
    });
    expect(out.igst).toBe(180);
  });

  it('blocks ITC when itcblock flag is true', () => {
    const out = determineGST({
      itemMaster: baseItem,
      vendorMaster: baseVendor,
      invoiceFlags: { ...baseFlags, itcblock: true },
      amount: 1000,
    });
    expect(out.itcEligible).toBe(false);
  });
});

