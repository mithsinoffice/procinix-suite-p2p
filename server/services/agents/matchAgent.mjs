import { randomUUID } from 'node:crypto';
import { query, withTransaction, connExecute } from '../../mysql.mjs';

const AGENT_NAME = 'MatchAgent';
const AGENT_VERSION = '1.0.0';

// ── Match helpers (module-private, wrapped by DEFAULT_FETCHERS) ──

async function matchByPOExact(poNumber, entityId) {
  if (!poNumber) return null;

  const rows = await query(
    `SELECT id, po_number, vendor_name, total_amount,
            status, po_date
     FROM purchase_orders
     WHERE po_number = ? AND entity_id = ?
     LIMIT 1`,
    [poNumber, entityId]
  );

  return rows.length > 0 ? rows[0] : null;
}

async function matchByFuzzyPO(vendorName, totalAmount, invoiceDate, entityId) {
  if (!vendorName || !totalAmount) return null;

  const amountLow = totalAmount * 0.95;
  const amountHigh = totalAmount * 1.05;

  let dateCondition = '';
  const params = [vendorName, amountLow, amountHigh, entityId];

  if (invoiceDate) {
    dateCondition = 'AND ABS(DATEDIFF(po_date, ?)) <= 90';
    params.push(invoiceDate);
  }

  const rows = await query(
    `SELECT id, po_number, vendor_name, total_amount,
            status, po_date
     FROM purchase_orders
     WHERE vendor_name = ?
       AND total_amount BETWEEN ? AND ?
       AND entity_id = ?
       ${dateCondition}
     ORDER BY po_date DESC
     LIMIT 5`,
    params
  );

  return rows.length > 0 ? rows[0] : null;
}

async function checkRecurringPattern(vendorName, totalAmount) {
  if (!vendorName || !totalAmount) return null;

  const amountLow = totalAmount * 0.90;
  const amountHigh = totalAmount * 1.10;

  const rows = await query(
    `SELECT id, invoice_number, total_amount, invoice_date
     FROM invoices
     WHERE vendor_name = ?
       AND total_amount BETWEEN ? AND ?
       AND invoice_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     ORDER BY invoice_date DESC
     LIMIT 10`,
    [vendorName, amountLow, amountHigh]
  );

  return rows.length >= 3 ? rows : null;
}

// ── DEFAULT_FETCHERS ─────────────────────────────────
// Wraps the existing module-private helpers. WS-1b swaps getGRNsForPO
// to a relational table read; other fetchers swappable for testing.

export const DEFAULT_FETCHERS = Object.freeze({
  getPOExact: (poNumber, entityId) => matchByPOExact(poNumber, entityId),
  getPOFuzzy: (vendorName, amount, date, entityId) => matchByFuzzyPO(vendorName, amount, date, entityId),
  getRecurringInvoices: (vendorName, amount) => checkRecurringPattern(vendorName, amount),
  getGRNsForPO: (_poId) => Promise.resolve([]),  // WS-1a stub; WS-1b swaps in relational read
  getTolerances: (_tenantId, _vendorId) => Promise.resolve({
    twoWayAmountPct: 0.05,
    fuzzyAmountLow: 0.95,
    fuzzyAmountHigh: 1.05,
    fuzzyDateDays: 90,
    recurringAmountLow: 0.90,
    recurringAmountHigh: 1.10,
    recurringWindowMonths: 6,
  }),
  getSnapshotValues: (_poId, _grnIds) => Promise.resolve({
    po: null,
    grns: [],
    snapshotAt: new Date().toISOString(),
  }),
});

function computeVariances(extractedData, po) {
  const variances = {};

  if (po && extractedData.total_amount != null && po.total_amount != null) {
    const invoiceAmt = Number(extractedData.total_amount);
    const poAmt = Number(po.total_amount);
    if (poAmt !== 0) {
      variances.amount_variance_pct = parseFloat((((invoiceAmt - poAmt) / poAmt) * 100).toFixed(2));
    }
  }

  // Line-item level variances would require PO line items; compute at header level for now
  return variances;
}

// ── Main entry ────────────────────────────────────────

export async function processMatch(invoiceId, extractedData, entityId, fetchers = DEFAULT_FETCHERS) {
  const startTime = Date.now();

  try {
    const poNumber = extractedData.po_number || null;
    const vendorName = extractedData.vendor_name || null;
    const totalAmount = extractedData.total_amount ?? null;
    const invoiceDate = extractedData.invoice_date || null;

    let matchType = 'none';
    let poId = null;
    let matchedPoNumber = null;
    let matchConfidence = 0;
    let po = null;
    const explanationParts = [];

    // 1. 2-way PO exact match
    po = await fetchers.getPOExact(poNumber, entityId);
    if (po) {
      matchType = '2way_po';
      poId = po.id;
      matchedPoNumber = po.po_number;

      // Verify vendor name matches
      const vendorMatches = vendorName && po.vendor_name &&
        vendorName.toLowerCase().trim() === po.vendor_name.toLowerCase().trim();

      // Check amount tolerance (within 5%)
      const amountWithinTolerance = totalAmount != null && po.total_amount != null &&
        Math.abs(totalAmount - Number(po.total_amount)) / Number(po.total_amount) <= 0.05;

      if (vendorMatches && amountWithinTolerance) {
        matchConfidence = 0.98;
        explanationParts.push(`2-way PO match: PO ${po.po_number} found with exact vendor and amount within tolerance`);
      } else if (vendorMatches) {
        matchConfidence = 0.85;
        explanationParts.push(`2-way PO match: PO ${po.po_number} vendor matches but amount variance exceeds tolerance`);
      } else if (amountWithinTolerance) {
        matchConfidence = 0.80;
        explanationParts.push(`2-way PO match: PO ${po.po_number} amount matches but vendor name differs (invoice: "${vendorName}", PO: "${po.vendor_name}")`);
      } else {
        matchConfidence = 0.70;
        explanationParts.push(`2-way PO match: PO ${po.po_number} found but vendor and amount differ`);
      }

      // 2. 3-way PO+GRN check
      const grns = await fetchers.getGRNsForPO(poId);
      if (grns.length === 0) {
        explanationParts.push('3-way GRN verification not yet implemented — GRN records not checked');
      }
    }

    // 3. Fuzzy PO match
    if (!po) {
      po = await fetchers.getPOFuzzy(vendorName, totalAmount, invoiceDate, entityId);
      if (po) {
        matchType = 'service_po';
        poId = po.id;
        matchedPoNumber = po.po_number;
        matchConfidence = 0.72;
        explanationParts.push(
          `Fuzzy PO match: PO ${po.po_number} found for vendor "${vendorName}" ` +
          `with amount within 5% (PO: ${po.total_amount}, Invoice: ${totalAmount})` +
          (invoiceDate ? ` and date within 90 days of ${invoiceDate}` : '')
        );
      }
    }

    // 4. Recurring pattern
    if (!po) {
      const recurringInvoices = await fetchers.getRecurringInvoices(vendorName, totalAmount);
      if (recurringInvoices) {
        matchType = 'recurring';
        matchConfidence = 0.60;
        explanationParts.push(
          `Recurring pattern detected: ${recurringInvoices.length} invoices from "${vendorName}" ` +
          `with similar amounts (±10%) in the last 6 months. ` +
          `Recent amounts: ${recurringInvoices.slice(0, 3).map(r => r.total_amount).join(', ')}`
        );
      }
    }

    // 5. No match
    if (matchType === 'none') {
      explanationParts.push(
        `No match found. Searched: PO number="${poNumber || 'N/A'}", ` +
        `vendor="${vendorName || 'N/A'}", amount=${totalAmount ?? 'N/A'}, ` +
        `date=${invoiceDate || 'N/A'}`
      );
    }

    // Compute variances
    const variances = computeVariances(extractedData, po);
    if (variances.amount_variance_pct != null) {
      explanationParts.push(`Amount variance: ${variances.amount_variance_pct}%`);
    }

    const explanation = explanationParts.join('. ');

    // Persist match result
    const matchResultId = randomUUID();

    await withTransaction(async (conn) => {
      await connExecute(conn,
        `INSERT INTO ap_invoice_match_results
           (id, invoice_id, match_type, po_id, po_number, match_confidence,
            amount_variance_pct, line_match_details, explanation, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, NOW())`,
        [
          matchResultId, invoiceId, matchType, poId || null, matchedPoNumber || null,
          matchConfidence, variances?.amount_variance_pct || 0, JSON.stringify(variances || {}), explanation,
        ]
      );
    });

    // Log agent decision
    const processingTimeMs = Date.now() - startTime;
    const decision = matchType === 'none' ? 'unmatched'
      : matchConfidence >= 0.90 ? 'strong_match'
      : matchConfidence >= 0.70 ? 'partial_match'
      : 'weak_match';

    await query(
      `INSERT INTO ap_invoice_agent_decisions
         (id, invoice_id, agent_name, agent_version, decision, confidence, explanation,
          input_summary, output_summary, processing_time_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        randomUUID(), invoiceId, AGENT_NAME, AGENT_VERSION,
        decision, matchConfidence, explanation,
        JSON.stringify({ poNumber, vendorName, totalAmount, invoiceDate, entityId }),
        JSON.stringify({ matchResultId, matchType, poId, matchedPoNumber, matchConfidence, variances }),
        processingTimeMs,
      ]
    );

    console.log(`[${AGENT_NAME}] invoice ${invoiceId}: ${decision} — ${matchType}, confidence ${matchConfidence}`);

    return { matchResultId, matchType, poId, poNumber: matchedPoNumber, matchConfidence, variances, explanation };
  } catch (err) {
    const processingTimeMs = Date.now() - startTime;
    console.error(`[${AGENT_NAME}] invoice ${invoiceId}: error after ${processingTimeMs}ms —`, err.message);

    try {
      await query(
        `INSERT INTO ap_invoice_agent_decisions
           (id, invoice_id, agent_name, agent_version, decision, confidence, explanation,
            input_summary, output_summary, processing_time_ms, created_at)
         VALUES (?, ?, ?, ?, 'error', 0, ?, ?, NULL, ?, NOW())`,
        [
          randomUUID(), invoiceId, AGENT_NAME, AGENT_VERSION,
          `Match failed: ${err.message}`,
          JSON.stringify({ poNumber: extractedData?.po_number, vendorName: extractedData?.vendor_name }),
          processingTimeMs,
        ]
      );
    } catch (_) { /* swallow logging failure */ }

    throw err;
  }
}
