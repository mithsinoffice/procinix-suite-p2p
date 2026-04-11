import { randomUUID } from 'node:crypto';
import { query, withTransaction, connExecute } from '../../mysql.mjs';

const AGENT_NAME = 'CodingAgent';
const AGENT_VERSION = '1.0.0';

// ── Keyword → GL code mapping ─────────────────────────

const KEYWORD_GL_MAP = [
  { keywords: ['cloud', 'hosting', 'server', 'aws', 'azure'], glCode: '6200-IT', glName: 'IT Services' },
  { keywords: ['license', 'software', 'saas'], glCode: '6210-SW', glName: 'Software Licenses' },
  { keywords: ['rent', 'lease', 'office'], glCode: '6300-RE', glName: 'Rent & Lease' },
  { keywords: ['travel', 'cab', 'flight', 'hotel'], glCode: '6400-TR', glName: 'Travel' },
  { keywords: ['consulting', 'advisory', 'professional'], glCode: '6500-PR', glName: 'Professional Services' },
  { keywords: ['raw material', 'supplies', 'packaging'], glCode: '5001-RM', glName: 'Raw Materials' },
];

const DEFAULT_GL = { glCode: '6900-GE', glName: 'General Expense' };

// ── Helpers ───────────────────────────────────────────

function matchKeyword(description) {
  if (!description) return null;
  const lower = description.toLowerCase();
  for (const entry of KEYWORD_GL_MAP) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return { glCode: entry.glCode, glName: entry.glName, matchedKeyword: kw };
      }
    }
  }
  return null;
}

async function getVendorHistory(vendorId, vendorName) {
  // Try by vendor_id first, fall back to vendor_name
  let rows = [];

  if (vendorName) {
    rows = await query(
      `SELECT id, metadata
       FROM invoices
       WHERE vendor_name = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [vendorName]
    );
  }

  return rows;
}

function extractHistoryCoding(historyRows) {
  // Find the most commonly used GL code, cost center, profit center
  const glCodes = {};
  const costCenters = {};
  const profitCenters = {};

  for (const row of historyRows) {
    // Try to get coding from ap_invoice_accounting_suggestions via invoice metadata
    const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
    const coding = meta?.coding || {};
    if (coding.glCode) glCodes[coding.glCode] = (glCodes[coding.glCode] || 0) + 1;
    if (coding.costCenter) costCenters[coding.costCenter] = (costCenters[coding.costCenter] || 0) + 1;
    if (coding.profitCenter) profitCenters[coding.profitCenter] = (profitCenters[coding.profitCenter] || 0) + 1;
  }

  const topGL = Object.entries(glCodes).sort((a, b) => b[1] - a[1])[0];
  const topCC = Object.entries(costCenters).sort((a, b) => b[1] - a[1])[0];
  const topPC = Object.entries(profitCenters).sort((a, b) => b[1] - a[1])[0];

  if (!topGL) return null;

  return {
    glCode: topGL[0],
    glName: null, // We don't have the name from history
    costCenter: topCC ? topCC[0] : 'CC-GENERAL',
    profitCenter: topPC ? topPC[0] : 'PC-GENERAL',
    usageCount: topGL[1],
    totalInvoices: historyRows.length,
  };
}

// ── Main entry ────────────────────────────────────────

export async function processCoding(invoiceId, extractedData, vendorMatchResult, matchResult) {
  const startTime = Date.now();

  try {
    const vendorName = extractedData.vendor_name || null;
    const lineItems = Array.isArray(extractedData.line_items) ? extractedData.line_items : [];
    const vendorId = vendorMatchResult?.matchedVendorId || null;

    // Determine PO-based coding if available
    let poCoding = null;
    if (matchResult && matchResult.poId) {
      // PO table doesn't have GL columns — check accounting suggestions for the PO's invoices
      const poSuggestions = await query(
        `SELECT gl_code, cost_center, profit_center FROM ap_invoice_accounting_suggestions
         WHERE invoice_id IN (SELECT id FROM invoices WHERE po_id = ?)
         LIMIT 1`,
        [matchResult.poId]
      );
      if (poSuggestions.length > 0 && poSuggestions[0].gl_code) {
        poCoding = {
          glCode: poSuggestions[0].gl_code,
          costCenter: poSuggestions[0].cost_center || 'CC-GENERAL',
          profitCenter: poSuggestions[0].profit_center || 'PC-GENERAL',
        };
      }
    }

    // Determine vendor-history coding
    let historyCoding = null;
    if (!poCoding) {
      const historyRows = await getVendorHistory(vendorId, vendorName);
      if (historyRows.length > 0) {
        historyCoding = extractHistoryCoding(historyRows);
      }
    }

    // Build per-line-item suggestions
    const suggestions = [];

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      let glCode, glName, costCenter, profitCenter, confidence, source;

      if (poCoding) {
        // Source 1: PO-based
        glCode = poCoding.glCode;
        glName = null;
        costCenter = poCoding.costCenter;
        profitCenter = poCoding.profitCenter;
        confidence = 0.98;
        source = 'purchase_order';
      } else if (historyCoding) {
        // Source 2: Vendor history
        glCode = historyCoding.glCode;
        glName = historyCoding.glName;
        costCenter = historyCoding.costCenter;
        profitCenter = historyCoding.profitCenter;
        confidence = 0.90;
        source = 'vendor_history';
      } else {
        // Source 3/4: Keyword or fallback
        const kwMatch = matchKeyword(item.description);
        if (kwMatch) {
          glCode = kwMatch.glCode;
          glName = kwMatch.glName;
          confidence = 0.75;
          source = `keyword:${kwMatch.matchedKeyword}`;
        } else {
          glCode = DEFAULT_GL.glCode;
          glName = DEFAULT_GL.glName;
          confidence = 0.50;
          source = 'default_fallback';
        }
        costCenter = 'CC-GENERAL';
        profitCenter = 'PC-GENERAL';
      }

      suggestions.push({
        lineNumber: i + 1,
        lineItemId: item.id || null,
        description: item.description || null,
        glCode,
        glName,
        costCenter,
        profitCenter,
        confidence,
        source,
      });
    }

    // If no line items, generate a single header-level suggestion
    if (suggestions.length === 0) {
      let glCode, glName, costCenter, profitCenter, confidence, source;

      if (poCoding) {
        glCode = poCoding.glCode;
        glName = null;
        costCenter = poCoding.costCenter;
        profitCenter = poCoding.profitCenter;
        confidence = 0.98;
        source = 'purchase_order';
      } else if (historyCoding) {
        glCode = historyCoding.glCode;
        glName = historyCoding.glName;
        costCenter = historyCoding.costCenter;
        profitCenter = historyCoding.profitCenter;
        confidence = 0.90;
        source = 'vendor_history';
      } else {
        glCode = DEFAULT_GL.glCode;
        glName = DEFAULT_GL.glName;
        costCenter = 'CC-GENERAL';
        profitCenter = 'PC-GENERAL';
        confidence = 0.50;
        source = 'default_fallback';
      }

      suggestions.push({
        lineNumber: 1,
        lineItemId: null,
        description: null,
        glCode,
        glName,
        costCenter,
        profitCenter,
        confidence,
        source,
      });
    }

    // Compute overall certainty (average confidence)
    const overallCertainty = parseFloat(
      (suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length).toFixed(3)
    );

    // Build explanation
    const primarySource = suggestions[0]?.source || 'unknown';
    const explanationParts = [];

    if (poCoding) {
      explanationParts.push(`Coding derived from matched PO (${matchResult.poNumber}): GL ${poCoding.glCode}, CC ${poCoding.costCenter}, PC ${poCoding.profitCenter}`);
    } else if (historyCoding) {
      explanationParts.push(`Coding derived from vendor history: GL ${historyCoding.glCode} used ${historyCoding.usageCount}/${historyCoding.totalInvoices} times for "${vendorName}"`);
    } else {
      const kwCount = suggestions.filter(s => s.source.startsWith('keyword:')).length;
      const fallbackCount = suggestions.filter(s => s.source === 'default_fallback').length;
      explanationParts.push(`Coding derived from keyword matching (${kwCount} matched) and fallback defaults (${fallbackCount})`);
    }

    explanationParts.push(`${suggestions.length} line-item suggestion(s) generated, overall certainty: ${overallCertainty}`);
    const explanation = explanationParts.join('. ');

    // Persist suggestions
    await withTransaction(async (conn) => {
      for (const s of suggestions) {
        await connExecute(conn,
          `INSERT INTO ap_invoice_accounting_suggestions
             (id, invoice_id, line_item_id, gl_code, gl_name,
              cost_center, profit_center, confidence, source, explanation, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            randomUUID(), invoiceId, s.lineItemId || null,
            s.glCode, s.glName, s.costCenter, s.profitCenter,
            s.confidence, s.source, s.description || null,
          ]
        );
      }
    });

    // Log agent decision
    const processingTimeMs = Date.now() - startTime;
    const decision = overallCertainty >= 0.90 ? 'high_certainty'
      : overallCertainty >= 0.70 ? 'medium_certainty'
      : 'low_certainty';

    await query(
      `INSERT INTO ap_invoice_agent_decisions
         (id, invoice_id, agent_name, agent_version, decision, confidence, explanation,
          input_summary, output_summary, processing_time_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        randomUUID(), invoiceId, AGENT_NAME, AGENT_VERSION,
        decision, overallCertainty, explanation,
        JSON.stringify({ vendorName, vendorId, poId: matchResult?.poId, lineItemCount: lineItems.length }),
        JSON.stringify({ suggestionCount: suggestions.length, overallCertainty, primarySource }),
        processingTimeMs,
      ]
    );

    console.log(`[${AGENT_NAME}] invoice ${invoiceId}: ${decision} — ${suggestions.length} suggestions, certainty ${overallCertainty}, source ${primarySource}`);

    return { suggestions, overallCertainty, explanation };
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
          `Coding suggestion failed: ${err.message}`,
          JSON.stringify({ vendorName: extractedData?.vendor_name }),
          processingTimeMs,
        ]
      );
    } catch (_) { /* swallow logging failure */ }

    throw err;
  }
}
