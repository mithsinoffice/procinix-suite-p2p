export type TDSSection = '194C' | '194J' | '194I' | '194Q' | 'None';
export type VendorType = 'company' | 'indiv';

export interface TDSItemMasterInput {
  tdsSec: TDSSection;
  threshold: number;
}

export interface TDSVendorMasterInput {
  type: VendorType;
  panValid: boolean;
  lowerCert: boolean;
  lowerRate: number;
  tdsExempt: boolean;
  itrFiled: boolean;
}

export interface DetermineTDSInput {
  itemMaster: TDSItemMasterInput;
  vendorMaster: TDSVendorMasterInput;
  amount: number;
}

export type TDSOverride =
  | 'exempt'
  | '206AA'
  | '206AB'
  | 'lowerCert'
  | 'noSection'
  | 'belowThreshold'
  | 'standard';

export interface DetermineTDSResult {
  sec: TDSSection;
  rate: number;
  tdsA: number;
  surcharge: number;
  cess: number;
  netTDS: number;
  override: TDSOverride;
  reason: string;
}

function getStandardRate(section: TDSSection, vendorType: VendorType): number {
  if (section === '194C') {
    return vendorType === 'company' ? 2 : 1;
  }
  if (section === '194J') {
    return 10;
  }
  if (section === '194I') {
    return 10;
  }
  if (section === '194Q') {
    return 0.1;
  }
  return 0;
}

function buildAmounts(amount: number, rate: number, vendorType: VendorType) {
  const taxable = Number.isFinite(amount) ? Math.max(amount, 0) : 0;
  const tdsA = (taxable * rate) / 100;

  let surchargeRate = 0;
  if (vendorType === 'company' && taxable > 10_00_00_000) {
    surchargeRate = 15;
  } else if (vendorType === 'company' && taxable > 1_00_00_000) {
    surchargeRate = 10;
  }

  const surcharge = (tdsA * surchargeRate) / 100;
  const cess = ((tdsA + surcharge) * 4) / 100;
  const netTDS = tdsA + surcharge + cess;

  return { tdsA, surcharge, cess, netTDS };
}

function buildZero(sec: TDSSection, override: TDSOverride, reason: string): DetermineTDSResult {
  return {
    sec,
    rate: 0,
    tdsA: 0,
    surcharge: 0,
    cess: 0,
    netTDS: 0,
    override,
    reason,
  };
}

export function determineTDS(input: DetermineTDSInput): DetermineTDSResult {
  const { itemMaster, vendorMaster, amount } = input;
  const section = itemMaster.tdsSec;
  const standardRate = getStandardRate(section, vendorMaster.type);

  if (vendorMaster.tdsExempt) {
    return buildZero('None', 'exempt', 'Vendor is marked as TDS exempt.');
  }

  if (!vendorMaster.panValid) {
    const rate = Math.max(standardRate, 20);
    const amounts = buildAmounts(amount, rate, vendorMaster.type);
    return {
      sec: section,
      rate,
      ...amounts,
      override: '206AA',
      reason: 'PAN invalid/missing: Sec 206AA applied at 20% or higher standard rate.',
    };
  }

  if (!vendorMaster.itrFiled) {
    const rate = Math.max(standardRate, 5);
    const amounts = buildAmounts(amount, rate, vendorMaster.type);
    return {
      sec: section,
      rate,
      ...amounts,
      override: '206AB',
      reason: 'ITR not filed for 2 years: Sec 206AB applied at higher of standard rate or 5%.',
    };
  }

  if (vendorMaster.lowerCert) {
    const rate = Math.max(vendorMaster.lowerRate, 0);
    const amounts = buildAmounts(amount, rate, vendorMaster.type);
    return {
      sec: section,
      rate,
      ...amounts,
      override: 'lowerCert',
      reason: 'Lower deduction certificate available: Form 13 rate applied.',
    };
  }

  if (section === 'None') {
    return buildZero('None', 'noSection', 'No TDS section configured on item master.');
  }

  if (amount < itemMaster.threshold) {
    return buildZero(
      section,
      'belowThreshold',
      `Taxable value is below configured threshold (${itemMaster.threshold}).`
    );
  }

  const amounts = buildAmounts(amount, standardRate, vendorMaster.type);
  return {
    sec: section,
    rate: standardRate,
    ...amounts,
    override: 'standard',
    reason: 'Standard TDS section rate applied on taxable value only (excluding GST).',
  };
}
