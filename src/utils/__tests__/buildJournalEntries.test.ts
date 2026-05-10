import { describe, expect, it } from 'vitest';
import { buildJournalEntries } from '../buildJournalEntries';

describe('buildJournalEntries', () => {
  it('builds standard journal entries', () => {
    const out = buildJournalEntries({
      lines: [
        {
          taxableAmount: 1000,
          cgst: 90,
          sgst: 90,
          isRcm: false,
          exempt: false,
          itcEligible: true,
          tdsAmount: 20,
          tdsSection: '194C',
          tdsRate: 2,
          expenseGlCode: 'EXP-001',
        },
      ],
    });
    expect(out.entries.length).toBeGreaterThan(0);
    expect(out.balanced).toBe(true);
  });

  it('builds RCM entries', () => {
    const out = buildJournalEntries({
      lines: [{ taxableAmount: 1000, igst: 180, isRcm: true, tdsAmount: 0 }],
    });
    const rcmPayable = out.entries.find((entry) => entry.glCode === 'RCM_PAYABLE');
    expect(rcmPayable?.cr).toBe(180);
  });

  it('handles exempt line', () => {
    const out = buildJournalEntries({
      lines: [{ taxableAmount: 1000, exempt: true, tdsAmount: 0 }],
    });
    const taxEntries = out.entries.filter((entry) => entry.glCode.includes('ITC'));
    expect(taxEntries.length).toBe(0);
  });

  it('adds retention and advance recovery credits', () => {
    const out = buildJournalEntries({
      lines: [{ taxableAmount: 1000, tdsAmount: 0 }],
      retention: { amount: 100, glCode: 'RET-001' },
      advances: [{ recoveryAmount: 50, advanceGlCode: 'ADV-001' }],
    });
    expect(out.entries.some((entry) => entry.glCode === 'RET-001')).toBe(true);
    expect(out.entries.some((entry) => entry.glCode === 'ADV-001')).toBe(true);
  });

  it('supports multi-line', () => {
    const out = buildJournalEntries({
      lines: [
        { taxableAmount: 1000, tdsAmount: 10 },
        { taxableAmount: 500, tdsAmount: 5 },
      ],
    });
    expect(out.entries.filter((entry) => entry.particulars.includes('Expense')).length).toBe(2);
  });
});
