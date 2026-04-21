export interface BOELineInput {
  id: string;
  value?: number;
  qty?: number;
  weight?: number;
  baseAmount?: number;
}

export interface BOEChargeInput {
  id: string;
  amount: number;
}

export type BOEApportionMethod = 'value' | 'qty' | 'weight' | 'equal';

export interface BOELineWithApportion extends BOELineInput {
  allocatedCharge: number;
  landedCost: number;
}

function toPositive(value?: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(Number(value), 0);
}

export function apportionBOECharges(
  lines: BOELineInput[],
  charges: BOEChargeInput[],
  method: BOEApportionMethod
): BOELineWithApportion[] {
  if (lines.length === 0) {
    return [];
  }

  const totalCharges = charges.reduce((sum, charge) => sum + toPositive(charge.amount), 0);
  if (totalCharges <= 0) {
    return lines.map((line) => ({
      ...line,
      allocatedCharge: 0,
      landedCost: toPositive(line.baseAmount ?? line.value),
    }));
  }

  const denominator =
    method === 'value'
      ? lines.reduce((sum, line) => sum + toPositive(line.value ?? line.baseAmount), 0)
      : method === 'qty'
        ? lines.reduce((sum, line) => sum + toPositive(line.qty), 0)
        : method === 'weight'
          ? lines.reduce((sum, line) => sum + toPositive(line.weight), 0)
          : lines.length;

  const safeDenominator = denominator > 0 ? denominator : lines.length;

  return lines.map((line) => {
    const base =
      method === 'value'
        ? toPositive(line.value ?? line.baseAmount)
        : method === 'qty'
          ? toPositive(line.qty)
          : method === 'weight'
            ? toPositive(line.weight)
            : 1;
    const share = safeDenominator > 0 ? base / safeDenominator : 0;
    const allocatedCharge = totalCharges * share;
    const landedCost = toPositive(line.baseAmount ?? line.value) + allocatedCharge;

    return {
      ...line,
      allocatedCharge,
      landedCost,
    };
  });
}

