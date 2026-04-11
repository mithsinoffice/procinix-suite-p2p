import { randomUUID } from 'node:crypto';
import { query, withTransaction, connExecute } from '../../mysql.mjs';
import { extractInvoiceData } from '../invoiceIngestion/claudeOCR.mjs';

const AGENT_NAME = 'ExtractionAgent';
const AGENT_VERSION = '1.0.0';

// ── Header fields we track for confidence ──────────────

const HEADER_FIELDS = [
  'invoice_number', 'invoice_date', 'due_date', 'vendor_name', 'vendor_gstin',
  'vendor_pan', 'vendor_email', 'bill_to_entity', 'bill_to_gstin', 'currency',
  'subtotal', 'tax_amount', 'tax_rate', 'total_amount', 'po_number', 'irn',
  'hsn_sac_summary', 'payment_terms', 'notes',
];

// ── Per-field confidence estimation ────────────────────

function estimateFieldConfidence(key, value) {
  if (value === null || value === undefined || value === '') return 0;

  // Numeric fields — must be a valid number
  if (['subtotal', 'tax_amount', 'tax_rate', 'total_amount'].includes(key)) {
    const n = Number(value);
    if (isNaN(n)) return 0.3;
    return n > 0 ? 0.97 : 0.8;
  }

  // GSTIN format: 15-char alphanumeric
  if (key === 'vendor_gstin' || key === 'bill_to_gstin') {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(value) ? 0.99 : 0.6;
  }

  // PAN format: 10-char
  if (key === 'vendor_pan') {
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value) ? 0.98 : 0.55;
  }

  // Date fields
  if (key === 'invoice_date' || key === 'due_date') {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? 0.97 : 0.6;
  }

  // Non-empty string → high confidence
  if (typeof value === 'string' && value.trim().length > 0) return 0.95;

  return 0.9;
}

function estimateLineItemConfidence(item) {
  let score = 0.7;
  if (item.description && item.description.trim().length > 0) score += 0.1;
  if (typeof item.amount === 'number' && item.amount > 0) score += 0.1;
  if (typeof item.quantity === 'number' && item.quantity > 0) score += 0.05;
  return Math.min(1, parseFloat(score.toFixed(2)));
}

// ── Main entry ─────────────────────────────────────────

export async function processExtraction(invoiceId, documentId, buffer, mimeType) {
  const startTime = Date.now();

  try {
    // 1. Call OCR
    const extractedData = await extractInvoiceData(buffer, mimeType);
    const provider = extractedData._provider || 'unknown';
    const ocrConfidence = extractedData.confidence_score ?? 0.5;

    // 2. Compute per-field confidence for header
    const fieldConfidences = {};
    for (const key of HEADER_FIELDS) {
      fieldConfidences[key] = estimateFieldConfidence(key, extractedData[key]);
    }
    const headerScores = Object.values(fieldConfidences);
    const headerScore = headerScores.length
      ? parseFloat((headerScores.reduce((a, b) => a + b, 0) / headerScores.length).toFixed(3))
      : 0;

    // 3. Compute line-item confidence
    const lineItems = Array.isArray(extractedData.line_items) ? extractedData.line_items : [];
    const lineScores = lineItems.map(estimateLineItemConfidence);
    const linesScore = lineScores.length
      ? parseFloat((lineScores.reduce((a, b) => a + b, 0) / lineScores.length).toFixed(3))
      : 0;

    // 4. Overall confidence: weighted blend of OCR + header + lines
    const overallConfidence = parseFloat(
      (0.4 * ocrConfidence + 0.35 * headerScore + 0.25 * linesScore).toFixed(3)
    );

    // 5. Persist in transaction
    const extractionId = randomUUID();

    await withTransaction(async (conn) => {
      // Extraction record
      await connExecute(conn,
        `INSERT INTO ap_invoice_extractions
           (id, invoice_id, document_id, provider, raw_response, extracted_data,
            extraction_score_header, extraction_score_lines, overall_confidence, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          extractionId, invoiceId, documentId, provider,
          JSON.stringify(extractedData), JSON.stringify(extractedData),
          headerScore, linesScore, overallConfidence,
        ]
      );

      // Per-field confidence
      for (const [field, confidence] of Object.entries(fieldConfidences)) {
        await connExecute(conn,
          `INSERT INTO ap_invoice_field_confidence
             (id, extraction_id, invoice_id, field_name, field_value, confidence, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            randomUUID(), extractionId, invoiceId, field,
            extractedData[field] != null ? String(extractedData[field]).slice(0, 500) : null,
            confidence,
          ]
        );
      }

      // Line items
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        await connExecute(conn,
          `INSERT INTO ap_invoice_extracted_line_items
             (id, extraction_id, invoice_id, line_number, description, quantity,
              unit_price, amount, hsn_sac, gst_rate, confidence, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            randomUUID(), extractionId, invoiceId, i + 1,
            item.description || null,
            item.quantity ?? null,
            item.unit_price ?? null,
            item.amount ?? null,
            item.hsn_sac || null,
            item.gst_rate ?? null,
            lineScores[i],
          ]
        );
      }
    });

    // 6. Build explanation
    const explanation =
      `Extracted via ${provider} with OCR confidence ${ocrConfidence}. ` +
      `Header score: ${headerScore} (${HEADER_FIELDS.length} fields), ` +
      `Line-items score: ${linesScore} (${lineItems.length} items). ` +
      `Overall confidence: ${overallConfidence}.`;

    // 7. Log agent decision
    const processingTimeMs = Date.now() - startTime;
    const decision = overallConfidence >= 0.7 ? 'extracted' : 'low_confidence';

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
        overallConfidence,
        explanation,
        JSON.stringify({ documentId, mimeType, provider }),
        JSON.stringify({ extractionId, headerScore, linesScore, lineItemCount: lineItems.length }),
        processingTimeMs,
      ]
    );

    console.log(`[${AGENT_NAME}] invoice ${invoiceId}: ${decision} via ${provider}, confidence ${overallConfidence}, ${lineItems.length} line items`);

    return { extractionId, extractedData, headerScore, linesScore, overallConfidence, provider, explanation };
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
          `Extraction failed: ${err.message}`,
          JSON.stringify({ documentId, mimeType }),
          processingTimeMs,
        ]
      );
    } catch (_) { /* swallow logging failure */ }

    throw err;
  }
}
