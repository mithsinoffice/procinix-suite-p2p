import { describe, it, expect } from 'vitest';
import { getVendorLedger, getInvoiceEntries, getPaymentEntries } from '../vendorLedger.mjs';

// ---------------------------------------------------------------------------
// Mock DB helper
// ---------------------------------------------------------------------------

function makeDb({ invoices = [], payments = [], openingBalance = 0 } = {}) {
  return {
    query: async (sql) => {
      if (sql.includes('vendor_opening_balances')) {
        return openingBalance != null ? [{ balance_amount: openingBalance }] : [];
      }
      if (sql.includes('FROM invoices')) return invoices;
      if (sql.includes('FROM payments')) return payments;
      return [];
    },
  };
}

// ---------------------------------------------------------------------------
// getInvoiceEntries
// ---------------------------------------------------------------------------

describe('getInvoiceEntries', () => {
  it('returns credit entries for processed invoices', async () => {
    const db = makeDb({
      invoices: [
        {
          id: 'i1',
          invoice_number: 'INV-001',
          invoice_date: '2026-01-15',
          total_amount: 10000,
          lifecycle_state: 'Processed',
        },
        {
          id: 'i2',
          invoice_number: 'INV-002',
          invoice_date: '2026-01-20',
          total_amount: 5000,
          lifecycle_state: 'Processed',
        },
      ],
    });

    const entries = await getInvoiceEntries('v1', 'e1', '2026-01-01', '2026-01-31', db);

    expect(entries).toHaveLength(2);
    expect(entries[0].doc_type).toBe('invoice');
    expect(entries[0].credit).toBe(10000);
    expect(entries[0].debit).toBe(0);
    expect(entries[0].source_table).toBe('invoices');
    expect(entries[0].doc_ref).toBe('INV-001');
  });

  it('returns empty array when no invoices', async () => {
    const db = makeDb({ invoices: [] });
    const entries = await getInvoiceEntries('v1', 'e1', '2026-01-01', '2026-01-31', db);
    expect(entries).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getPaymentEntries
// ---------------------------------------------------------------------------

describe('getPaymentEntries', () => {
  it('returns debit entries for confirmed payments', async () => {
    const db = makeDb({
      payments: [
        {
          id: 'p1',
          payment_date: '2026-01-25',
          amount: 8000,
          utr: 'UTR123',
          status: 'confirmed',
          invoice_id: 'i1',
          invoice_number: 'INV-001',
        },
      ],
    });

    const entries = await getPaymentEntries('v1', 'e1', '2026-01-01', '2026-01-31', db);

    expect(entries).toHaveLength(1);
    expect(entries[0].doc_type).toBe('payment');
    expect(entries[0].debit).toBe(8000);
    expect(entries[0].credit).toBe(0);
    expect(entries[0].source_table).toBe('payments');
    expect(entries[0].doc_ref).toBe('UTR123');
  });

  it('uses fallback doc_ref when UTR is null', async () => {
    const db = makeDb({
      payments: [
        {
          id: 'abcd1234-5678',
          payment_date: '2026-01-25',
          amount: 3000,
          utr: null,
          status: 'confirmed',
          invoice_id: 'i1',
          invoice_number: 'INV-001',
        },
      ],
    });

    const entries = await getPaymentEntries('v1', 'e1', '2026-01-01', '2026-01-31', db);
    expect(entries[0].doc_ref).toBe('PAY-abcd1234');
  });
});

// ---------------------------------------------------------------------------
// getVendorLedger — combined
// ---------------------------------------------------------------------------

describe('getVendorLedger — combined entries sorted by date', () => {
  it('merges and sorts invoice + payment entries chronologically', async () => {
    const db = makeDb({
      invoices: [
        {
          id: 'i1',
          invoice_number: 'INV-001',
          invoice_date: '2026-01-15',
          total_amount: 10000,
          lifecycle_state: 'Processed',
        },
        {
          id: 'i2',
          invoice_number: 'INV-002',
          invoice_date: '2026-01-25',
          total_amount: 5000,
          lifecycle_state: 'Processed',
        },
      ],
      payments: [
        {
          id: 'p1',
          payment_date: '2026-01-20',
          amount: 8000,
          utr: 'UTR1',
          status: 'confirmed',
          invoice_id: 'i1',
          invoice_number: 'INV-001',
        },
      ],
    });

    const ledger = await getVendorLedger({
      vendorId: 'v1',
      entityId: 'e1',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      db,
    });

    expect(ledger.entries).toHaveLength(3);
    // Sorted: Jan 15 invoice, Jan 20 payment, Jan 25 invoice
    expect(ledger.entries[0].doc_ref).toBe('INV-001');
    expect(ledger.entries[1].doc_ref).toBe('UTR1');
    expect(ledger.entries[2].doc_ref).toBe('INV-002');
  });

  it('invoices sort before payments on same date', async () => {
    const db = makeDb({
      invoices: [
        {
          id: 'i1',
          invoice_number: 'INV-001',
          invoice_date: '2026-01-15',
          total_amount: 10000,
          lifecycle_state: 'Processed',
        },
      ],
      payments: [
        {
          id: 'p1',
          payment_date: '2026-01-15',
          amount: 10000,
          utr: 'UTR1',
          status: 'confirmed',
          invoice_id: 'i1',
          invoice_number: 'INV-001',
        },
      ],
    });

    const ledger = await getVendorLedger({
      vendorId: 'v1',
      entityId: 'e1',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      db,
    });

    expect(ledger.entries[0].doc_type).toBe('invoice');
    expect(ledger.entries[1].doc_type).toBe('payment');
  });
});

// ---------------------------------------------------------------------------
// getVendorLedger — opening balance
// ---------------------------------------------------------------------------

describe('getVendorLedger — opening balance', () => {
  it('applies opening balance from vendor_opening_balances', async () => {
    const db = makeDb({
      openingBalance: 25000,
      invoices: [
        {
          id: 'i1',
          invoice_number: 'INV-001',
          invoice_date: '2026-01-15',
          total_amount: 10000,
          lifecycle_state: 'Processed',
        },
      ],
    });

    const ledger = await getVendorLedger({
      vendorId: 'v1',
      entityId: 'e1',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      db,
    });

    expect(ledger.openingBalance).toBe(25000);
  });

  it('defaults opening balance to 0 when no row exists', async () => {
    const db = makeDb({ openingBalance: null });

    const ledger = await getVendorLedger({
      vendorId: 'v1',
      entityId: 'e1',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      db,
    });

    expect(ledger.openingBalance).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getVendorLedger — closing balance math
// ---------------------------------------------------------------------------

describe('getVendorLedger — closing balance', () => {
  it('computes closing = opening + credits - debits', async () => {
    const db = makeDb({
      openingBalance: 5000,
      invoices: [
        {
          id: 'i1',
          invoice_number: 'INV-001',
          invoice_date: '2026-01-10',
          total_amount: 20000,
          lifecycle_state: 'Processed',
        },
        {
          id: 'i2',
          invoice_number: 'INV-002',
          invoice_date: '2026-01-20',
          total_amount: 15000,
          lifecycle_state: 'Processed',
        },
      ],
      payments: [
        {
          id: 'p1',
          payment_date: '2026-01-15',
          amount: 12000,
          utr: 'UTR1',
          status: 'confirmed',
          invoice_id: 'i1',
          invoice_number: 'INV-001',
        },
      ],
    });

    const ledger = await getVendorLedger({
      vendorId: 'v1',
      entityId: 'e1',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      db,
    });

    // opening 5000 + credits (20000 + 15000) - debits (12000) = 28000
    expect(ledger.closingBalance).toBe(28000);
  });

  it('closing equals opening when no entries', async () => {
    const db = makeDb({ openingBalance: 7500 });

    const ledger = await getVendorLedger({
      vendorId: 'v1',
      entityId: 'e1',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      db,
    });

    expect(ledger.closingBalance).toBe(7500);
    expect(ledger.entries).toHaveLength(0);
  });

  it('closing can go negative (overpayment)', async () => {
    const db = makeDb({
      openingBalance: 0,
      payments: [
        {
          id: 'p1',
          payment_date: '2026-01-15',
          amount: 5000,
          utr: 'UTR1',
          status: 'confirmed',
          invoice_id: 'i1',
          invoice_number: 'INV-001',
        },
      ],
    });

    const ledger = await getVendorLedger({
      vendorId: 'v1',
      entityId: 'e1',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      db,
    });

    expect(ledger.closingBalance).toBe(-5000);
  });
});

// ---------------------------------------------------------------------------
// getVendorLedger — invoice-only / payment-only
// ---------------------------------------------------------------------------

describe('getVendorLedger — single source', () => {
  it('works with invoice entries only', async () => {
    const db = makeDb({
      invoices: [
        {
          id: 'i1',
          invoice_number: 'INV-001',
          invoice_date: '2026-01-15',
          total_amount: 10000,
          lifecycle_state: 'Processed',
        },
      ],
    });

    const ledger = await getVendorLedger({
      vendorId: 'v1',
      entityId: 'e1',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      db,
    });

    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0].doc_type).toBe('invoice');
    expect(ledger.closingBalance).toBe(10000);
  });

  it('works with payment entries only', async () => {
    const db = makeDb({
      payments: [
        {
          id: 'p1',
          payment_date: '2026-01-20',
          amount: 3000,
          utr: 'UTR1',
          status: 'confirmed',
          invoice_id: 'i1',
          invoice_number: 'INV-001',
        },
      ],
    });

    const ledger = await getVendorLedger({
      vendorId: 'v1',
      entityId: 'e1',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      db,
    });

    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0].doc_type).toBe('payment');
    expect(ledger.closingBalance).toBe(-3000);
  });
});

// ---------------------------------------------------------------------------
// getVendorLedger — missing entityId throws
// ---------------------------------------------------------------------------

describe('getVendorLedger — entity scoping', () => {
  it('throws when entityId is not provided', async () => {
    const db = makeDb();
    await expect(
      getVendorLedger({
        vendorId: 'v1',
        entityId: null,
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
        db,
      })
    ).rejects.toThrow('entityId is required');
  });

  it('throws when entityId is undefined', async () => {
    const db = makeDb();
    await expect(
      getVendorLedger({ vendorId: 'v1', fromDate: '2026-01-01', toDate: '2026-01-31', db })
    ).rejects.toThrow('entityId is required');
  });

  it('throws when entityId is empty string', async () => {
    const db = makeDb();
    await expect(
      getVendorLedger({
        vendorId: 'v1',
        entityId: '',
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
        db,
      })
    ).rejects.toThrow('entityId is required');
  });
});
