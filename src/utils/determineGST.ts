export interface GSTItemMasterInput {
  gstRate: number;
  rcmCategory: boolean;
}

export interface GSTVendorMasterInput {
  gstReg: 'reg' | 'urd' | 'comp' | 'foreign';
}

export interface GSTInvoiceFlagsInput {
  rcm: boolean;
  exempt: boolean;
  sez: boolean;
  interState: boolean;
  import: boolean;
  itcblock?: boolean;
}

export interface DetermineGSTInput {
  itemMaster: GSTItemMasterInput;
  vendorMaster: GSTVendorMasterInput;
  invoiceFlags: GSTInvoiceFlagsInput;
  amount: number;
}

export interface DetermineGSTResult {
  igst: number;
  cgst: number;
  sgst: number;
  isRcm: boolean;
  itcEligible: boolean;
  gstRule: string;
}

export function determineGST(input: DetermineGSTInput): DetermineGSTResult {
  const { itemMaster, vendorMaster, invoiceFlags, amount } = input;
  const taxable = Number.isFinite(amount) ? Math.max(amount, 0) : 0;
  const rate = Number.isFinite(itemMaster.gstRate) ? Math.max(itemMaster.gstRate, 0) : 0;

  if (invoiceFlags.exempt || invoiceFlags.sez) {
    return {
      igst: 0,
      cgst: 0,
      sgst: 0,
      isRcm: false,
      itcEligible: false,
      gstRule: invoiceFlags.exempt ? 'exempt' : 'sez_zero_rated',
    };
  }

  if (vendorMaster.gstReg === 'comp') {
    return {
      igst: 0,
      cgst: (taxable * 1) / 100,
      sgst: (taxable * 1) / 100,
      isRcm: true,
      itcEligible: false,
      gstRule: 'composition_1_plus_1',
    };
  }

  const isRcm =
    invoiceFlags.rcm ||
    vendorMaster.gstReg === 'urd' ||
    itemMaster.rcmCategory === true;

  const interOrImport = invoiceFlags.interState || invoiceFlags.import;
  const igst = interOrImport ? (taxable * rate) / 100 : 0;
  const cgst = interOrImport ? 0 : (taxable * (rate / 2)) / 100;
  const sgst = interOrImport ? 0 : (taxable * (rate / 2)) / 100;
  const itcEligible = !isRcm && !invoiceFlags.itcblock;

  return {
    igst,
    cgst,
    sgst,
    isRcm,
    itcEligible,
    gstRule: interOrImport ? (invoiceFlags.import ? 'import_igst' : 'inter_state_igst') : 'intra_state_cgst_sgst',
  };
}

