export interface JournalEntry {
  seq: number;
  particulars: string;
  glCode: string;
  costCentre?: string;
  vendorGroup?: string;
  dr: number;
  cr: number;
  note?: string;
}

export interface JournalLineInput {
  description?: string;
  taxableAmount: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  isRcm?: boolean;
  exempt?: boolean;
  itcEligible?: boolean;
  tdsAmount?: number;
  tdsSection?: string;
  tdsRate?: number;
  expenseGlCode?: string;
  costCentre?: string;
}

export interface BuildJournalInput {
  lines: JournalLineInput[];
  vendor?: {
    groupCode?: string;
    groupName?: string;
  };
  retention?: {
    amount?: number;
    glCode?: string;
    releaseCondition?: string;
  };
  advances?: Array<{
    recoveryAmount?: number;
    advanceGlCode?: string;
    reference?: string;
  }>;
}

export interface BuildJournalResult {
  entries: JournalEntry[];
  totalDr: number;
  totalCr: number;
  balanced: boolean;
}

function n(value?: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value);
}

export function buildJournalEntries(input: BuildJournalInput): BuildJournalResult {
  const entries: JournalEntry[] = [];
  const vendorGroup = [input.vendor?.groupCode, input.vendor?.groupName].filter(Boolean).join(' · ');
  let seq = 1;

  for (const [lineIndex, line] of input.lines.entries()) {
    const taxable = n(line.taxableAmount);
    const igst = n(line.igst);
    const cgst = n(line.cgst);
    const sgst = n(line.sgst);
    const tdsAmount = n(line.tdsAmount);
    const gstTotal = igst + cgst + sgst;
    const netVendor =
      taxable + (line.isRcm ? 0 : gstTotal) - tdsAmount;
    const label = line.description || `Line ${lineIndex + 1}`;

    entries.push({
      seq: seq++,
      particulars: `${label} - Expense`,
      glCode: line.expenseGlCode || 'EXPENSE_GL',
      costCentre: line.costCentre,
      vendorGroup,
      dr: taxable,
      cr: 0,
      note: 'Taxable value debit',
    });

    if (!line.isRcm && !line.exempt && line.itcEligible) {
      if (igst > 0) {
        entries.push({
          seq: seq++,
          particulars: `${label} - IGST ITC`,
          glCode: 'IGST_ITC',
          costCentre: line.costCentre,
          vendorGroup,
          dr: igst,
          cr: 0,
          note: 'Input IGST eligible',
        });
      }
      if (cgst > 0) {
        entries.push({
          seq: seq++,
          particulars: `${label} - CGST ITC`,
          glCode: 'CGST_ITC',
          costCentre: line.costCentre,
          vendorGroup,
          dr: cgst,
          cr: 0,
          note: 'Input CGST eligible',
        });
      }
      if (sgst > 0) {
        entries.push({
          seq: seq++,
          particulars: `${label} - SGST ITC`,
          glCode: 'SGST_ITC',
          costCentre: line.costCentre,
          vendorGroup,
          dr: sgst,
          cr: 0,
          note: 'Input SGST eligible',
        });
      }
    }

    if (line.isRcm && gstTotal > 0) {
      entries.push({
        seq: seq++,
        particulars: `${label} - RCM ITC Deferred`,
        glCode: 'RCM_ITC_DEFERRED',
        costCentre: line.costCentre,
        vendorGroup,
        dr: gstTotal,
        cr: 0,
        note: 'RCM input tax deferred debit',
      });
      entries.push({
        seq: seq++,
        particulars: `${label} - RCM Payable`,
        glCode: 'RCM_PAYABLE',
        costCentre: line.costCentre,
        vendorGroup,
        dr: 0,
        cr: gstTotal,
        note: 'RCM payable credit',
      });
    }

    if (tdsAmount > 0) {
      entries.push({
        seq: seq++,
        particulars: `${label} - TDS Payable`,
        glCode: 'TDS_PAYABLE',
        costCentre: line.costCentre,
        vendorGroup,
        dr: 0,
        cr: tdsAmount,
        note: `TDS ${line.tdsSection || ''} @ ${n(line.tdsRate)}%`,
      });
    }

    entries.push({
      seq: seq++,
      particulars: `${label} - Vendor AP`,
      glCode: 'VENDOR_AP',
      costCentre: line.costCentre,
      vendorGroup,
      dr: 0,
      cr: netVendor,
      note: 'Net payable to vendor',
    });
  }

  const retentionAmount = n(input.retention?.amount);
  if (retentionAmount > 0) {
    entries.push({
      seq: seq++,
      particulars: 'Retention Payable',
      glCode: input.retention?.glCode || 'RETENTION_PAYABLE',
      vendorGroup,
      dr: 0,
      cr: retentionAmount,
      note: input.retention?.releaseCondition || 'Retention configured on invoice',
    });
  }

  for (const advance of input.advances || []) {
    const recoveryAmount = n(advance.recoveryAmount);
    if (recoveryAmount <= 0) continue;
    entries.push({
      seq: seq++,
      particulars: 'Advance Recovery',
      glCode: advance.advanceGlCode || 'ADVANCE_RECOVERY',
      vendorGroup,
      dr: 0,
      cr: recoveryAmount,
      note: advance.reference || 'Recovered from vendor advance',
    });
  }

  const totalDr = entries.reduce((sum, entry) => sum + n(entry.dr), 0);
  const totalCr = entries.reduce((sum, entry) => sum + n(entry.cr), 0);
  const balanced = Math.abs(totalDr - totalCr) < 0.0001;

  return {
    entries,
    totalDr,
    totalCr,
    balanced,
  };
}

