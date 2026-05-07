import { randomUUID } from 'node:crypto';
import { query } from '../../mysql.mjs';

const AGENT_NAME = 'DuplicateFraudAgent';
const AGENT_VERSION = '1.0.0';

// ── Check functions ────────────────────────────────────

async function checkExactDuplicate(invoiceId, invoiceNumber, vendorName) {
  if (!invoiceNumber || !vendorName) return null;

  const rows = await query(
    `SELECT id, invoice_number, vendor_name, total_amount, invoice_date
     FROM invoices
     WHERE invoice_number = ? AND vendor_name = ? AND id != ?
     LIMIT 5`,
    [invoiceNumber, vendorName, invoiceId]
  );

  if (rows.length === 0) return null;

  return {
    check_type: 'exact',
    risk_score: 100,
    duplicate_invoice_id: rows.map((r) => r.id),
    details: `Exact match: invoice_number="${invoiceNumber}" + vendor="${vendorName}" found in ${rows.length} existing record(s)`,
    matches: rows,
  };
}

async function checkFuzzyDuplicate(invoiceId, invoiceNumber, vendorName, totalAmount, invoiceDate) {
  if (!invoiceNumber || !vendorName || !totalAmount) return null;

  // Use first 6 chars of invoice number for prefix match
  const prefix = invoiceNumber.slice(0, Math.min(6, invoiceNumber.length));
  if (prefix.length < 3) return null;

  const amountLow = totalAmount * 0.99;
  const amountHigh = totalAmount * 1.01;

  let dateCondition = '';
  const params = [`${prefix}%`, vendorName, amountLow, amountHigh, invoiceId];

  if (invoiceDate) {
    dateCondition = 'AND ABS(DATEDIFF(invoice_date, ?)) <= 7';
    params.splice(4, 0, invoiceDate);
  }

  const rows = await query(
    `SELECT id, invoice_number, vendor_name, total_amount, invoice_date
     FROM invoices
     WHERE invoice_number LIKE ? AND vendor_name = ?
       AND total_amount BETWEEN ? AND ?
       ${dateCondition}
       AND id != ?
     LIMIT 5`,
    params
  );

  if (rows.length === 0) return null;

  return {
    check_type: 'fuzzy',
    risk_score: 70,
    duplicate_invoice_id: rows.map((r) => r.id),
    details: `Fuzzy match: prefix "${prefix}*" + vendor "${vendorName}" + amount within 1% of ${totalAmount}${invoiceDate ? ` + date within 7 days of ${invoiceDate}` : ''} — ${rows.length} match(es)`,
    matches: rows,
  };
}

async function checkHashDuplicate(invoiceId, contentHash) {
  if (!contentHash) return null;

  const rows = await query(
    `SELECT dh.id, dh.document_id, dh.content_hash
     FROM ap_invoice_document_hashes dh
     LEFT JOIN ap_invoice_documents doc ON doc.id = dh.document_id
     WHERE dh.content_hash = ?
     LIMIT 5`,
    [contentHash]
  );

  // Filter out rows that belong to the same invoice
  const others = rows.filter((r) => r.document_id !== invoiceId);
  if (others.length === 0) return null;

  return {
    check_type: 'hash',
    risk_score: 90,
    duplicate_invoice_id: others.map((r) => r.document_id),
    details: `Content hash ${contentHash.slice(0, 12)}... found on ${others.length} other document(s)`,
    matches: others,
  };
}

// ── Main entry ─────────────────────────────────────────

export async function processDuplicateCheck(invoiceId, extractedData, contentHash) {
  const startTime = Date.now();

  try {
    const invoiceNumber = extractedData.invoice_number || null;
    const vendorName = extractedData.vendor_name || null;
    const totalAmount = extractedData.total_amount ?? null;
    const invoiceDate = extractedData.invoice_date || null;

    // Run all three checks
    const results = await Promise.all([
      checkExactDuplicate(invoiceId, invoiceNumber, vendorName),
      checkFuzzyDuplicate(invoiceId, invoiceNumber, vendorName, totalAmount, invoiceDate),
      checkHashDuplicate(invoiceId, contentHash),
    ]);

    const checks = results.filter(Boolean);
    const riskScore = checks.length > 0 ? Math.max(...checks.map((c) => c.risk_score)) : 0;
    const isDuplicate = riskScore >= 70;

    // Persist each check
    for (const check of checks) {
      await query(
        `INSERT INTO ap_invoice_duplicate_checks
           (id, invoice_id, check_type, risk_score, duplicate_invoice_id, match_details, explanation, created_at)
         VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, NOW())`,
        [
          randomUUID(),
          invoiceId,
          check.check_type,
          check.risk_score,
          Array.isArray(check.duplicate_invoice_id)
            ? check.duplicate_invoice_id[0]
            : check.duplicate_invoice_id || null,
          JSON.stringify(check.details || check.matches || {}),
          check.details || '',
        ]
      );
    }

    // Build explanation
    const explanationParts = [];
    if (checks.length === 0) {
      explanationParts.push(
        `No duplicates found for invoice "${invoiceNumber}" from "${vendorName}"`
      );
    } else {
      for (const check of checks) {
        explanationParts.push(
          `[${check.check_type.toUpperCase()} risk=${check.risk_score}] ${check.details}`
        );
      }
    }
    explanationParts.push(`Overall risk score: ${riskScore}/100`);
    const explanation = explanationParts.join('. ');

    // Log agent decision
    const processingTimeMs = Date.now() - startTime;
    const decision = riskScore >= 90 ? 'high_risk' : riskScore >= 70 ? 'medium_risk' : 'clear';

    await query(
      `INSERT INTO ap_invoice_agent_decisions
         (id, invoice_id, agent_name, agent_version, decision, confidence, explanation,
          input_summary, output_summary, processing_time_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        randomUUID(),
        invoiceId,
        AGENT_NAME,
        AGENT_VERSION,
        decision,
        parseFloat(((100 - riskScore) / 100).toFixed(2)), // confidence of NOT being duplicate
        explanation,
        JSON.stringify({
          invoiceNumber,
          vendorName,
          totalAmount,
          invoiceDate,
          contentHash: contentHash?.slice(0, 16),
        }),
        JSON.stringify({
          checksRun: checks.length,
          riskScore,
          isDuplicate,
          checkTypes: checks.map((c) => c.check_type),
        }),
        processingTimeMs,
      ]
    );

    console.log(
      `[${AGENT_NAME}] invoice ${invoiceId}: ${decision} — risk ${riskScore}, ${checks.length} check(s) flagged`
    );

    return {
      checks: checks.map(({ matches, ...rest }) => rest), // strip raw rows from return
      riskScore,
      isDuplicate,
      explanation,
    };
  } catch (err) {
    const processingTimeMs = Date.now() - startTime;
    console.error(
      `[${AGENT_NAME}] invoice ${invoiceId}: error after ${processingTimeMs}ms —`,
      err.message
    );

    try {
      await query(
        `INSERT INTO ap_invoice_agent_decisions
           (id, invoice_id, agent_name, agent_version, decision, confidence, explanation,
            input_summary, output_summary, processing_time_ms, created_at)
         VALUES (?, ?, ?, ?, 'error', 0, ?, ?, NULL, ?, NOW())`,
        [
          randomUUID(),
          invoiceId,
          AGENT_NAME,
          AGENT_VERSION,
          `Duplicate check failed: ${err.message}`,
          JSON.stringify({ invoiceNumber: extractedData?.invoice_number }),
          processingTimeMs,
        ]
      );
    } catch (_) {
      /* swallow logging failure */
    }

    throw err;
  }
}
