import { randomUUID } from 'node:crypto';
import { withTransaction, connExecute } from '../../mysql.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const UPLOADS_DIR = path.resolve('uploads', 'ingested');

export async function createInvoiceFromExtraction(
  extractedData,
  validationResult,
  matchResult,
  ingestionLogId,
  entityId,
  attachmentBuffer,
  attachmentFilename
) {
  return withTransaction(async (conn) => {
    const invoiceId = randomUUID();
    const status = validationResult.requiresManualReview ? 'draft' : 'pending_approval';

    // Save attachment to disk
    let attachmentPath = null;
    if (attachmentBuffer && attachmentFilename) {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      const safeName = `${invoiceId}_${attachmentFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      attachmentPath = path.join(UPLOADS_DIR, safeName);
      await fs.writeFile(attachmentPath, attachmentBuffer);
    }

    // Insert invoice
    await connExecute(
      conn,
      `INSERT INTO invoices (
        id, invoice_number, invoice_date, due_date,
        vendor_name, vendor_gstin, vendor_pan, vendor_email,
        bill_to_entity, bill_to_gstin,
        currency, subtotal, tax_amount, tax_rate, total_amount,
        po_number, po_id, irn, hsn_sac_summary,
        payment_terms, bank_details, notes,
        status, source, ingestion_log_id, metadata,
        attachment_path, entity_id,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, CAST(? AS JSON), ?,
        ?, 'email_ingestion', ?, CAST(? AS JSON),
        ?, ?,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
      [
        invoiceId,
        extractedData.invoice_number,
        extractedData.invoice_date,
        extractedData.due_date || null,
        extractedData.vendor_name,
        extractedData.vendor_gstin || null,
        extractedData.vendor_pan || null,
        extractedData.vendor_email || null,
        extractedData.bill_to_entity || null,
        extractedData.bill_to_gstin || null,
        extractedData.currency || 'INR',
        extractedData.subtotal || 0,
        extractedData.tax_amount || 0,
        extractedData.tax_rate || null,
        extractedData.total_amount || 0,
        extractedData.po_number || null,
        matchResult.matched ? matchResult.poId : null,
        extractedData.irn || null,
        extractedData.hsn_sac_summary || null,
        extractedData.payment_terms || null,
        JSON.stringify(extractedData.bank_details || null),
        extractedData.notes || null,
        status,
        ingestionLogId,
        JSON.stringify({
          extractedData,
          validationResult,
          matchResult,
          confidence_score: extractedData.confidence_score,
        }),
        attachmentPath,
        entityId || null,
      ]
    );

    // Insert line items
    if (Array.isArray(extractedData.line_items)) {
      for (let i = 0; i < extractedData.line_items.length; i++) {
        const li = extractedData.line_items[i];
        await connExecute(
          conn,
          `INSERT INTO invoice_line_items (
            id, invoice_id, line_number, description,
            quantity, unit_price, amount, hsn_sac, gst_rate,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            randomUUID(),
            invoiceId,
            i + 1,
            li.description || '',
            li.quantity || 0,
            li.unit_price || 0,
            li.amount || 0,
            li.hsn_sac || null,
            li.gst_rate || null,
          ]
        );
      }
    }

    // Update ingestion log with invoice ID
    await connExecute(
      conn,
      `UPDATE invoice_ingestion_log
       SET invoice_ids = JSON_ARRAY_APPEND(COALESCE(invoice_ids, JSON_ARRAY()), '$', ?)
       WHERE id = ?`,
      [invoiceId, ingestionLogId]
    );

    return { invoiceId, status };
  });
}
