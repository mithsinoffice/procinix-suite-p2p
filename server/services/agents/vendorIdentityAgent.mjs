import { randomUUID } from 'node:crypto';
import { query } from '../../mysql.mjs';

const AGENT_NAME = 'VendorIdentityAgent';
const AGENT_VERSION = '1.0.0';

// ── Match helpers ──────────────────────────────────────

async function matchByGstin(gstin) {
  if (!gstin) return null;
  const rows = await query(
    `SELECT id, payload FROM vendor_master.vendor_master
     WHERE JSON_UNQUOTE(JSON_EXTRACT(payload, '$.gstin')) = ?
     LIMIT 5`,
    [gstin]
  );
  if (rows.length === 0) return null;
  return {
    method: 'gstin_exact',
    confidence: 0.99,
    matches: rows,
  };
}

async function matchByPan(pan) {
  if (!pan) return null;
  const rows = await query(
    `SELECT id, payload FROM vendor_master.vendor_master
     WHERE JSON_UNQUOTE(JSON_EXTRACT(payload, '$.pan')) = ?
     LIMIT 5`,
    [pan]
  );
  if (rows.length === 0) return null;
  return {
    method: 'pan_exact',
    confidence: 0.95,
    matches: rows,
  };
}

async function matchByName(vendorName) {
  if (!vendorName || vendorName.trim().length < 3) return null;
  const searchTerm = `%${vendorName.trim()}%`;
  const rows = await query(
    `SELECT id, payload FROM vendor_master.vendor_master
     WHERE JSON_UNQUOTE(JSON_EXTRACT(payload, '$.legal_name')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(payload, '$.trade_name')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(payload, '$.vendor_name')) LIKE ?
     LIMIT 10`,
    [searchTerm, searchTerm, searchTerm]
  );
  if (rows.length === 0) return null;
  // Confidence decreases with more ambiguous results
  const confidence = rows.length === 1 ? 0.9 : rows.length <= 3 ? 0.75 : 0.6;
  return {
    method: 'name_fuzzy',
    confidence,
    matches: rows,
  };
}

async function matchByEmailDomain(email) {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1];
  if (!domain) return null;
  const rows = await query(
    `SELECT id, payload FROM vendor_master.vendor_master
     WHERE JSON_UNQUOTE(JSON_EXTRACT(payload, '$.email')) LIKE ?
     LIMIT 5`,
    [`%@${domain}`]
  );
  if (rows.length === 0) return null;
  return {
    method: 'email_domain',
    confidence: 0.7,
    matches: rows,
  };
}

function parseVendorPayload(row) {
  try {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    return {
      id: row.id,
      name: payload.legal_name || payload.trade_name || payload.vendor_name || 'Unknown',
      payload,
    };
  } catch {
    return { id: row.id, name: 'Unknown', payload: {} };
  }
}

// ── Main entry ─────────────────────────────────────────

export async function processVendorMatch(invoiceId, extractedData) {
  const startTime = Date.now();

  try {
    const vendorName = extractedData.vendor_name || null;
    const vendorGstin = extractedData.vendor_gstin || null;
    const vendorPan = extractedData.vendor_pan || null;
    const vendorEmail = extractedData.vendor_email || null;

    // Try match methods in priority order
    const result =
      (await matchByGstin(vendorGstin)) ||
      (await matchByPan(vendorPan)) ||
      (await matchByName(vendorName)) ||
      (await matchByEmailDomain(vendorEmail));

    let matchedVendorId = null;
    let matchedVendorName = null;
    let matchConfidence = 0;
    let method = 'none';
    let isNewVendor = true;
    let isSuspicious = false;
    let alternates = [];

    if (result) {
      const parsed = result.matches.map(parseVendorPayload);
      const primary = parsed[0];

      matchedVendorId = primary.id;
      matchedVendorName = primary.name;
      matchConfidence = result.confidence;
      method = result.method;
      isNewVendor = false;
      alternates = parsed
        .slice(1)
        .map((p) => ({ id: p.id, name: p.name, confidence: result.confidence - 0.05 }));

      // Flag suspicious if name fuzzy match has many results or low confidence
      if (result.method === 'name_fuzzy' && result.matches.length > 3) {
        isSuspicious = true;
      }
    }

    // Build explanation
    const explanationParts = [];
    if (result) {
      explanationParts.push(
        `Vendor matched via ${method.replace('_', ' ').toUpperCase()}` +
          (vendorGstin && method === 'gstin_exact' ? ` ${vendorGstin}` : '') +
          (vendorPan && method === 'pan_exact' ? ` ${vendorPan}` : '') +
          ` with ${Math.round(matchConfidence * 100)}% confidence`
      );
      explanationParts.push(`matched to "${matchedVendorName}" (${matchedVendorId})`);
      if (alternates.length > 0) {
        explanationParts.push(`${alternates.length} alternate(s) found`);
      }
    } else {
      explanationParts.push('No vendor match found in master data');
      explanationParts.push(
        `searched: GSTIN=${vendorGstin || 'N/A'}, PAN=${vendorPan || 'N/A'}, name="${vendorName || 'N/A'}", email=${vendorEmail || 'N/A'}`
      );
      explanationParts.push('flagged as new vendor');
    }
    if (isSuspicious) {
      explanationParts.push('SUSPICIOUS: multiple ambiguous matches');
    }
    const explanation = explanationParts.join('; ');

    // Persist vendor match record
    const vendorMatchId = randomUUID();
    await query(
      `INSERT INTO ap_invoice_vendor_matches
         (id, invoice_id, matched_vendor_id, matched_vendor_name, match_confidence,
          method, is_new_vendor, is_suspicious, alternate_candidates, explanation, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        vendorMatchId,
        invoiceId,
        matchedVendorId,
        matchedVendorName,
        matchConfidence,
        method,
        isNewVendor ? 1 : 0,
        isSuspicious ? 1 : 0,
        JSON.stringify(alternates),
        explanation,
      ]
    );

    // Log agent decision
    const processingTimeMs = Date.now() - startTime;
    const decision = isNewVendor ? 'new_vendor' : isSuspicious ? 'suspicious_match' : 'matched';

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
        matchConfidence,
        explanation,
        JSON.stringify({ vendorName, vendorGstin, vendorPan, vendorEmail }),
        JSON.stringify({
          vendorMatchId,
          matchedVendorId,
          method,
          isNewVendor,
          isSuspicious,
          alternateCount: alternates.length,
        }),
        processingTimeMs,
      ]
    );

    console.log(
      `[${AGENT_NAME}] invoice ${invoiceId}: ${decision} — ${method}, confidence ${matchConfidence}${isNewVendor ? ', NEW VENDOR' : ''}`
    );

    return {
      vendorMatchId,
      matchedVendorId,
      matchedVendorName,
      matchConfidence,
      method,
      isNewVendor,
      isSuspicious,
      alternates,
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
          `Vendor match failed: ${err.message}`,
          JSON.stringify({ vendorName: extractedData?.vendor_name }),
          processingTimeMs,
        ]
      );
    } catch (_) {
      /* swallow logging failure */
    }

    throw err;
  }
}
