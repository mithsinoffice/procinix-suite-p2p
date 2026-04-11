import { query } from '../../mysql.mjs';

export async function matchToPO(extractedData, entityId) {
  const poNumber = extractedData.po_number;
  const vendorName = extractedData.vendor_name;
  const totalAmount = extractedData.total_amount;
  const invoiceDate = extractedData.invoice_date;

  // 1. EXACT match on PO number
  if (poNumber) {
    const rows = await query(
      `SELECT id, po_number, vendor_name, total_amount, po_date
       FROM purchase_orders
       WHERE po_number = ? AND (entity_id = ? OR ? IS NULL)
       LIMIT 1`,
      [poNumber, entityId, entityId]
    );

    if (rows.length > 0) {
      return {
        matched: true,
        matchType: 'exact',
        poId: rows[0].id,
        poNumber: rows[0].po_number,
        matchConfidence: 1.0,
        matchNotes: `Exact match on PO number ${poNumber}`,
      };
    }
  }

  // 2. FUZZY match: vendor + amount within 5% + date within 90 days
  if (vendorName && totalAmount > 0) {
    const amountLow = totalAmount * 0.95;
    const amountHigh = totalAmount * 1.05;

    const rows = await query(
      `SELECT id, po_number, vendor_name, total_amount, po_date
       FROM purchase_orders
       WHERE LOWER(vendor_name) LIKE LOWER(?)
         AND total_amount BETWEEN ? AND ?
         AND (entity_id = ? OR ? IS NULL)
       ORDER BY po_date DESC
       LIMIT 5`,
      [`%${vendorName.substring(0, 20)}%`, amountLow, amountHigh, entityId, entityId]
    );

    if (rows.length > 0) {
      // Filter by date proximity
      const invoiceDateMs = invoiceDate ? new Date(invoiceDate).getTime() : Date.now();
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

      for (const row of rows) {
        const poDateMs = row.po_date ? new Date(row.po_date).getTime() : 0;
        if (Math.abs(invoiceDateMs - poDateMs) <= ninetyDaysMs) {
          const amountDiff = Math.abs(row.total_amount - totalAmount) / totalAmount;
          const confidence = Math.max(0.6, 1 - amountDiff);

          return {
            matched: true,
            matchType: 'fuzzy',
            poId: row.id,
            poNumber: row.po_number,
            matchConfidence: Number(confidence.toFixed(2)),
            matchNotes: `Fuzzy match: vendor "${row.vendor_name}", amount ${row.total_amount} (${(amountDiff * 100).toFixed(1)}% diff), PO date ${row.po_date}`,
          };
        }
      }
    }

    // 3. PARTIAL match: vendor name only
    const vendorRows = await query(
      `SELECT id, po_number, vendor_name, total_amount
       FROM purchase_orders
       WHERE LOWER(vendor_name) LIKE LOWER(?)
         AND (entity_id = ? OR ? IS NULL)
       ORDER BY created_at DESC
       LIMIT 1`,
      [`%${vendorName.substring(0, 20)}%`, entityId, entityId]
    );

    if (vendorRows.length > 0) {
      return {
        matched: false,
        matchType: 'partial',
        poId: vendorRows[0].id,
        poNumber: vendorRows[0].po_number,
        matchConfidence: 0.3,
        matchNotes: `Partial match: vendor "${vendorRows[0].vendor_name}" found but amount/date don't match`,
      };
    }
  }

  // 4. NO match
  return {
    matched: false,
    matchType: 'none',
    poId: null,
    poNumber: null,
    matchConfidence: 0,
    matchNotes: 'No matching PO found',
  };
}
