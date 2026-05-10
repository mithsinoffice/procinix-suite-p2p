import { randomUUID } from 'node:crypto';
import { withTransaction, connExecute } from '../../mysql.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const UPLOADS_DIR = path.resolve('uploads', 'ingested');

function sanitizeDateForMysql(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  // JS silently fixes invalid dates (Apr 31 → May 1). Use the corrected date.
  return d.toISOString().split('T')[0];
}

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
        sanitizeDateForMysql(extractedData.invoice_date),
        sanitizeDateForMysql(extractedData.due_date),
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
          vendorGroupCode: extractedData.vendorGroupCode || null,
          vendorGroupName: extractedData.vendorGroupName || null,
          gstr2bMatched: Boolean(extractedData.gstr2bMatched),
          msmePaymentDueDate: extractedData.msmePaymentDueDate || null,
          journalEntries: extractedData.journalEntries || [],
          retentionAmount: extractedData.retentionAmount || 0,
          retentionGLCode: extractedData.retentionGLCode || null,
          retentionReleaseCondition: extractedData.retentionReleaseCondition || null,
          advanceAdjustments: extractedData.advanceAdjustments || [],
          boeDetails: extractedData.boeDetails || null,
          narration: extractedData.narration || null,
          vendorNarration: extractedData.vendorNarration || null,
          internalRemarks: extractedData.internalRemarks || null,
          approvalMatrix: extractedData.approvalMatrix || [],
          confidence_score: extractedData.confidence_score,
          ocrScores: {
            fields: extractedData.ocr_field_scores || {},
            conflicts: extractedData.ocr_conflicts || {},
            overall_confidence:
              extractedData.ocr_overall_confidence ?? extractedData.confidence_score ?? 0,
            fields_matched: extractedData.fields_matched ?? 0,
            fields_conflicted: extractedData.fields_conflicted ?? 0,
            fields_low_confidence: extractedData.fields_low_confidence ?? 0,
            fields_not_found: extractedData.fields_not_found ?? 0,
            touchless_eligible: Boolean(extractedData.touchless_eligible),
          },
        }),
        attachmentPath,
        entityId || null,
      ]
    );

    const vendorRows = await connExecute(
      conn,
      `SELECT v.id, vpc.msme_category
       FROM vendors v
       LEFT JOIN vendor_pan_compliance vpc ON vpc.vendor_id = v.id
       WHERE v.vendor_legal_name = ? OR v.vendor_trade_name = ? OR v.vendor_code = ?
       LIMIT 1`,
      [
        extractedData.vendor_name || '',
        extractedData.vendor_name || '',
        extractedData.vendor_code || '',
      ]
    );
    const vendorInfo = vendorRows?.[0];
    if (vendorInfo?.msme_category) {
      const invoiceDate = sanitizeDateForMysql(extractedData.invoice_date)
        ? new Date(sanitizeDateForMysql(extractedData.invoice_date))
        : new Date();
      const deadline = new Date(invoiceDate);
      deadline.setDate(deadline.getDate() + 45);
      await connExecute(
        conn,
        `UPDATE invoices SET
          is_msme_vendor = 1,
          msme_category = ?,
          msme_45day_deadline = ?,
          msme_days_remaining = DATEDIFF(?, CURDATE())
        WHERE id = ?`,
        [
          vendorInfo.msme_category,
          deadline.toISOString().slice(0, 10),
          deadline.toISOString().slice(0, 10),
          invoiceId,
        ]
      );
    }

    if (status === 'pending_approval') {
      await connExecute(
        conn,
        `INSERT INTO approvals (
          id, module, reference_id, status, assigned_to, submitted_by,
          created_at, approval_priority
        ) VALUES (?, 'ap_invoice', ?, 'pending', ?, ?, NOW(), 'normal')`,
        [randomUUID(), invoiceId, entityId || '1', entityId || '1']
      );
    }

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
       SET
         invoice_ids = JSON_ARRAY_APPEND(COALESCE(invoice_ids, JSON_ARRAY()), '$', ?),
         ocr_field_scores = CAST(? AS JSON),
         ocr_conflicts = CAST(? AS JSON),
         ocr_overall_confidence = ?,
         fields_matched = ?,
         fields_conflicted = ?,
         fields_low_confidence = ?,
         fields_not_found = ?
       WHERE id = ?`,
      [
        invoiceId,
        JSON.stringify(extractedData.ocr_field_scores || {}),
        JSON.stringify(extractedData.ocr_conflicts || {}),
        Number((extractedData.ocr_overall_confidence ?? 0) * 100),
        Number(extractedData.fields_matched ?? 0),
        Number(extractedData.fields_conflicted ?? 0),
        Number(extractedData.fields_low_confidence ?? 0),
        Number(extractedData.fields_not_found ?? 0),
        ingestionLogId,
      ]
    );

    return { invoiceId, status };
  });
}
