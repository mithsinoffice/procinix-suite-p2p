import { createHash, randomUUID } from 'node:crypto';
import { query, withTransaction, connExecute } from '../../mysql.mjs';

const AGENT_NAME = 'IntakeAgent';
const AGENT_VERSION = '1.0.0';

// ── Document-type heuristics ───────────────────────────

const TYPE_PATTERNS = [
  { pattern: /credit[\s_-]?note/i, type: 'credit_note' },
  { pattern: /debit[\s_-]?note/i, type: 'debit_note' },
  { pattern: /invoice|inv[_\s-]|bill|tax[\s_-]?invoice/i, type: 'invoice' },
  { pattern: /receipt|voucher|challan|delivery|packing/i, type: 'supporting_doc' },
];

const VALID_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
]);

function classifyDocument(filename, bufferSize) {
  const lower = (filename || '').toLowerCase();
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(lower)) return type;
  }
  // If file is very small (<5 KB) and not clearly an invoice, mark unknown
  if (bufferSize < 5_000) return 'unknown';
  // Default to invoice for standard document mime types
  return 'invoice';
}

function computeQualityScore(buffer, mimeType, filename) {
  let score = 1.0;
  const size = buffer.length;

  // Penalise invalid or uncommon MIME types
  if (!VALID_MIME_TYPES.has(mimeType)) score -= 0.3;

  // Very small files (<10 KB) are suspect
  if (size < 10_000) score -= 0.2;
  // Very large files (>50 MB) may be problematic
  if (size > 50_000_000) score -= 0.1;

  // No filename
  if (!filename) score -= 0.1;

  return Math.max(0, Math.min(1, parseFloat(score.toFixed(2))));
}

// ── Main entry ─────────────────────────────────────────

export async function processIntake(
  buffer,
  filename,
  mimeType,
  sourceChannel,
  sourceReference,
  entityId
) {
  const startTime = Date.now();
  const invoiceId = null; // Not yet created at intake stage

  try {
    // 1. Classify document
    const documentType = classifyDocument(filename, buffer.length);

    // 2. Hash for dedup
    const contentHash = createHash('sha256').update(buffer).digest('hex');

    // 3. Check for existing hash
    const existingRows = await query(
      'SELECT id, document_id FROM ap_invoice_document_hashes WHERE content_hash = ? LIMIT 1',
      [contentHash]
    );
    const isDuplicate = existingRows.length > 0;

    // 4. Assess quality
    const qualityScore = computeQualityScore(buffer, mimeType, filename);

    // 5. Write records in a transaction
    const { documentId, batchId } = await withTransaction(async (conn) => {
      const bId = randomUUID();
      await connExecute(
        conn,
        `INSERT INTO ap_invoice_intake_batches
           (id, source_channel, source_reference, entity_id, status, created_at)
         VALUES (?, ?, ?, ?, 'received', NOW())`,
        [bId, sourceChannel, sourceReference, entityId || null]
      );

      const dId = randomUUID();
      await connExecute(
        conn,
        `INSERT INTO ap_invoice_documents
           (id, batch_id, filename, mime_type, file_size_bytes, document_type, quality_score, content_hash, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'received', NOW())`,
        [dId, bId, filename, mimeType, buffer.length, documentType, qualityScore, contentHash]
      );

      if (!isDuplicate) {
        await connExecute(
          conn,
          `INSERT INTO ap_invoice_document_hashes (id, document_id, content_hash, first_seen_at)
           VALUES (?, ?, ?, NOW())`,
          [randomUUID(), dId, contentHash]
        );
      }

      return { documentId: dId, batchId: bId };
    });

    // 6. Build explanation
    const parts = [];
    parts.push(`Document classified as "${documentType}" from ${sourceChannel}`);
    parts.push(`file "${filename}" (${(buffer.length / 1024).toFixed(1)} KB, ${mimeType})`);
    parts.push(`quality score ${qualityScore}`);
    if (isDuplicate) {
      parts.push(`DUPLICATE detected — hash ${contentHash.slice(0, 12)}... already exists`);
    }
    const explanation = parts.join('; ');

    // 7. Log agent decision
    const processingTimeMs = Date.now() - startTime;
    const decision = isDuplicate ? 'duplicate' : qualityScore < 0.5 ? 'low_quality' : 'accepted';

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
        qualityScore,
        explanation,
        JSON.stringify({ filename, mimeType, sourceChannel, fileSize: buffer.length }),
        JSON.stringify({ documentId, batchId, documentType, contentHash, isDuplicate }),
        processingTimeMs,
      ]
    );

    console.log(
      `[${AGENT_NAME}] document ${documentId}: ${decision} — ${documentType}, quality ${qualityScore}${isDuplicate ? ', DUPLICATE' : ''}`
    );

    return {
      documentId,
      batchId,
      documentType,
      contentHash,
      qualityScore,
      isDuplicate,
      explanation,
    };
  } catch (err) {
    const processingTimeMs = Date.now() - startTime;
    console.error(`[${AGENT_NAME}] error after ${processingTimeMs}ms:`, err.message);

    // Best-effort decision log for the failure
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
          `Error: ${err.message}`,
          JSON.stringify({ filename, mimeType, sourceChannel }),
          processingTimeMs,
        ]
      );
    } catch (_) {
      /* swallow logging failure */
    }

    throw err;
  }
}
