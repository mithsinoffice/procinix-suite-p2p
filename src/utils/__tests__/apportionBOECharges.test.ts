import { describe, expect, it } from 'vitest';
import { apportionBOECharges } from '../apportionBOECharges';

const lines = [
  { id: 'L1', value: 100, qty: 2, weight: 10, baseAmount: 100 },
  { id: 'L2', value: 300, qty: 1, weight: 30, baseAmount: 300 },
];
const charges = [{ id: 'C1', amount: 40 }];

describe('apportionBOECharges', () => {
  it('allocates by value', () => {
    const out = apportionBOECharges(lines, charges, 'value');
    expect(out[0].allocatedCharge).toBeCloseTo(10);
    expect(out[1].allocatedCharge).toBeCloseTo(30);
  });

  it('allocates by qty', () => {
    const out = apportionBOECharges(lines, charges, 'qty');
    expect(out[0].allocatedCharge).toBeCloseTo(26.6667, 3);
    expect(out[1].allocatedCharge).toBeCloseTo(13.3333, 3);
  });

  it('allocates by weight', () => {
    const out = apportionBOECharges(lines, charges, 'weight');
    expect(out[0].allocatedCharge).toBeCloseTo(10);
    expect(out[1].allocatedCharge).toBeCloseTo(30);
  });

  it('allocates equally', () => {
    const out = apportionBOECharges(lines, charges, 'equal');
    expect(out[0].allocatedCharge).toBeCloseTo(20);
    expect(out[1].allocatedCharge).toBeCloseTo(20);
  });

  it('handles zero charges', () => {
    const out = apportionBOECharges(lines, [{ id: 'C1', amount: 0 }], 'value');
    expect(out[0].allocatedCharge).toBe(0);
    expect(out[1].allocatedCharge).toBe(0);
  });
});

