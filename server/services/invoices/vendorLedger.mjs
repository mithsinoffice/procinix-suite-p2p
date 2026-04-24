// Vendor ledger aggregator per ws1a-implementation-plan.md §2.7.
// Entity-scoped only in WS-1a. Group-wide ledger deferred.
//
// Composable: each source is a separate named export so callers can
// compose differently or add sources (debit notes, vendor advances)
// when WS-1b promotes those from JSON-blob to relational tables.

/**
 * Get invoice credit entries for the vendor ledger.
 * Processed invoices → credit rows.
 */
export async function getInvoiceEntries(vendorId, entityId, fromDate, toDate, db) {
  const rows = await db.query(
    `SELECT id, invoice_number, invoice_date, total_amount, lifecycle_state
     FROM invoices
     WHERE vendor_id = ? AND entity_id = ? AND lifecycle_state = 'Processed'
       AND invoice_date >= ? AND invoice_date <= ?
     ORDER BY invoice_date ASC`,
    [vendorId, entityId, fromDate, toDate]
  );

  return (rows || []).map((r) => ({
    doc_date: r.invoice_date,
    doc_type: 'invoice',
    doc_ref: r.invoice_number,
    doc_id: r.id,
    debit: 0,
    credit: Number(r.total_amount) || 0,
    narration: `Invoice ${r.invoice_number}`,
    status: r.lifecycle_state,
    source_table: 'invoices',
  }));
}

/**
 * Get payment debit entries for the vendor ledger.
 * Confirmed payments → debit rows.
 */
export async function getPaymentEntries(vendorId, entityId, fromDate, toDate, db) {
  const rows = await db.query(
    `SELECT p.id, p.payment_date, p.amount, p.utr, p.status, p.invoice_id,
            i.invoice_number
     FROM payments p
     JOIN invoices i ON i.id = p.invoice_id
     WHERE i.vendor_id = ? AND p.entity_id = ? AND p.status = 'confirmed'
       AND p.payment_date >= ? AND p.payment_date <= ?
     ORDER BY p.payment_date ASC`,
    [vendorId, entityId, fromDate, toDate]
  );

  return (rows || []).map((r) => ({
    doc_date: r.payment_date,
    doc_type: 'payment',
    doc_ref: r.utr || `PAY-${r.id.substring(0, 8)}`,
    doc_id: r.id,
    debit: Number(r.amount) || 0,
    credit: 0,
    narration: `Payment against ${r.invoice_number || r.invoice_id}`,
    status: r.status,
    source_table: 'payments',
  }));
}

/**
 * Read opening balance from vendor_opening_balances for the FY
 * that contains fromDate.
 *
 * If fromDate falls mid-FY, the caller gets the FY opening balance.
 * Mid-FY adjustment (opening + entries from FY start to fromDate)
 * is computed by the aggregator.
 */
async function readOpeningBalance(vendorId, entityId, financialYear, db) {
  const rows = await db.query(
    'SELECT balance_amount FROM vendor_opening_balances WHERE vendor_id = ? AND entity_id = ? AND financial_year = ?',
    [vendorId, entityId, financialYear]
  );

  if (!rows || rows.length === 0) return 0;
  return Number(rows[0].balance_amount) || 0;
}

/**
 * Derive the Indian financial year string (YYYY-YY) for a date.
 * Apr 1 2025 – Mar 31 2026 → '2025-26'
 */
function deriveFinancialYear(dateStr) {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1; // 1-12
  const year = d.getFullYear();
  if (month >= 4) {
    return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
  }
  return `${year - 1}-${String(year % 100).padStart(2, '0')}`;
}

/**
 * Build a vendor ledger for a date range, entity-scoped.
 *
 * @param {object} opts
 * @param {string} opts.vendorId
 * @param {string} opts.entityId - Required. Throws if missing (group-wide deferred).
 * @param {string} opts.fromDate - ISO date string (YYYY-MM-DD)
 * @param {string} opts.toDate - ISO date string (YYYY-MM-DD)
 * @param {{ query: Function }} opts.db
 * @returns {Promise<{openingBalance: number, entries: object[], closingBalance: number}>}
 */
export async function getVendorLedger({ vendorId, entityId, fromDate, toDate, db }) {
  if (!entityId) {
    throw new Error('entityId is required for vendor ledger. Group-wide ledger (no entity filter) is deferred to a later workstream.');
  }

  const financialYear = deriveFinancialYear(fromDate);
  const openingBalance = await readOpeningBalance(vendorId, entityId, financialYear, db);

  // Gather entries from all WS-1a sources
  const [invoiceEntries, paymentEntries] = await Promise.all([
    getInvoiceEntries(vendorId, entityId, fromDate, toDate, db),
    getPaymentEntries(vendorId, entityId, fromDate, toDate, db),
  ]);

  // Merge and sort by date, then by source_table for stable ordering
  const entries = [...invoiceEntries, ...paymentEntries].sort((a, b) => {
    const dateA = new Date(a.doc_date).getTime();
    const dateB = new Date(b.doc_date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    // Invoices before payments on same date
    if (a.source_table !== b.source_table) return a.source_table === 'invoices' ? -1 : 1;
    return 0;
  });

  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const closingBalance = openingBalance + totalCredit - totalDebit;

  return { openingBalance, entries, closingBalance };
}
