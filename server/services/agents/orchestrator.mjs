import { randomUUID } from 'node:crypto';
import { query } from '../../mysql.mjs';
import { processIntake } from './intakeAgent.mjs';
import { processExtraction } from './extractionAgent.mjs';
import { processVendorMatch } from './vendorIdentityAgent.mjs';
import { processDuplicateCheck } from './duplicateFraudAgent.mjs';
import { processMatch } from './matchAgent.mjs';
import { processTaxValidation } from './taxComplianceAgent.mjs';
import { processCoding } from './codingAgent.mjs';
import { processRouting } from './workflowRoutingAgent.mjs';

/**
 * Governed Multi-Agent Orchestrator
 *
 * Pipeline: Intake → Extraction → VendorIdentity → DuplicateFraud
 *           → Match → TaxCompliance → Coding → WorkflowRouting
 *
 * Each agent runs in sequence. If an agent fails, the pipeline
 * continues where possible but logs the failure. One failed
 * attachment never stops others.
 */

async function logExplainability(invoiceId, stage, explanation, data) {
  try {
    await query(
      `INSERT INTO ap_invoice_explainability_logs (id, invoice_id, stage, explanation, data_snapshot, created_at)
       VALUES (?, ?, ?, ?, CAST(? AS JSON), CURRENT_TIMESTAMP)`,
      [randomUUID(), invoiceId, stage, explanation, JSON.stringify(data || {})]
    );
  } catch { /* non-critical */ }
}

async function updateInvoiceStatus(invoiceId, status) {
  try {
    await query(
      'UPDATE invoices SET processing_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, invoiceId]
    );
  } catch { /* non-critical */ }
}

export async function processInvoiceWithAgents(email) {
  const results = [];

  for (const attachment of email.attachments) {
    const pipelineResult = {
      filename: attachment.filename,
      steps: {},
      invoiceId: null,
      lane: null,
      success: false,
      error: null,
    };

    const startTime = Date.now();

    try {
      // ── STEP 1: Intake Agent ────────────────────────────
      console.log(`[Orchestrator] ═══ Processing: ${attachment.filename} ═══`);
      const intake = await processIntake(
        attachment.buffer,
        attachment.filename,
        attachment.mimeType,
        'email',
        email.messageId,
        null
      );
      pipelineResult.steps.intake = {
        success: true,
        documentId: intake.documentId,
        batchId: intake.batchId,
        documentType: intake.documentType,
        isDuplicate: intake.isDuplicate,
      };

      if (intake.isDuplicate) {
        console.log(`[Orchestrator] ⚠ Content duplicate detected — skipping extraction`);
        pipelineResult.steps.intake.skipped = 'Content hash duplicate';
        pipelineResult.success = true;
        results.push(pipelineResult);
        continue;
      }

      // ── STEP 2: Extraction Agent ────────────────────────
      // Create a placeholder invoice record first
      const invoiceId = randomUUID();
      pipelineResult.invoiceId = invoiceId;

      await query(
        `INSERT INTO invoices (id, status, source, processing_status, document_id, batch_id, created_at, updated_at)
         VALUES (?, 'draft', 'email_ingestion', 'extracting', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [invoiceId, intake.documentId, intake.batchId]
      );

      const extraction = await processExtraction(invoiceId, intake.documentId, attachment.buffer, attachment.mimeType);
      pipelineResult.steps.extraction = {
        success: true,
        headerScore: extraction.headerScore,
        linesScore: extraction.linesScore,
        confidence: extraction.overallConfidence,
        provider: extraction.provider,
        lineItemCount: extraction.extractedData?.line_items?.length || 0,
      };

      // Update invoice with extracted data
      const ed = extraction.extractedData;
      await query(
        `UPDATE invoices SET
          invoice_number = ?, invoice_date = ?, due_date = ?,
          vendor_name = ?, vendor_gstin = ?, vendor_pan = ?, vendor_email = ?,
          bill_to_entity = ?, bill_to_gstin = ?,
          currency = ?, subtotal = ?, tax_amount = ?, total_amount = ?,
          po_number = ?, payment_terms = ?, notes = ?,
          metadata = CAST(? AS JSON),
          extraction_model_version = ?,
          processing_status = 'extracted',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          ed.invoice_number, ed.invoice_date, ed.due_date,
          ed.vendor_name, ed.vendor_gstin, ed.vendor_pan, ed.vendor_email,
          ed.bill_to_entity, ed.bill_to_gstin,
          ed.currency || 'INR', ed.subtotal || 0, ed.tax_amount || 0, ed.total_amount || 0,
          ed.po_number, ed.payment_terms ? String(ed.payment_terms).substring(0, 65000) : null, ed.notes,
          JSON.stringify({ extractedData: ed, extraction: { headerScore: extraction.headerScore, linesScore: extraction.linesScore } }),
          extraction.provider,
          invoiceId,
        ]
      );

      // Insert line items into main invoice_line_items table too
      if (Array.isArray(ed.line_items)) {
        for (let i = 0; i < ed.line_items.length; i++) {
          const li = ed.line_items[i];
          await query(
            `INSERT INTO invoice_line_items (id, invoice_id, line_number, description, quantity, unit_price, amount, hsn_sac, gst_rate, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [randomUUID(), invoiceId, i + 1, li.description || '', li.quantity || 0, li.unit_price || 0, li.amount || 0, li.hsn_sac || null, li.gst_rate || null]
          );
        }
      }

      await logExplainability(invoiceId, 'extraction', extraction.explanation, { provider: extraction.provider, confidence: extraction.overallConfidence });
      await updateInvoiceStatus(invoiceId, 'extracted');

      // ── STEP 3: Vendor Identity Agent ───────────────────
      const vendorMatch = await processVendorMatch(invoiceId, ed);
      pipelineResult.steps.vendorMatch = {
        success: true,
        matchedVendorName: vendorMatch.matchedVendorName,
        confidence: vendorMatch.matchConfidence,
        method: vendorMatch.method,
        isNewVendor: vendorMatch.isNewVendor,
      };
      await logExplainability(invoiceId, 'vendor_match', vendorMatch.explanation, vendorMatch);
      await updateInvoiceStatus(invoiceId, vendorMatch.isNewVendor ? 'vendor_unresolved' : 'vendor_matched');

      // ── STEP 4: Duplicate & Fraud Agent ─────────────────
      const dupCheck = await processDuplicateCheck(invoiceId, ed, intake.contentHash);
      pipelineResult.steps.duplicateCheck = {
        success: true,
        riskScore: dupCheck.riskScore,
        isDuplicate: dupCheck.isDuplicate,
        checksRun: dupCheck.checks?.length || 0,
      };
      await logExplainability(invoiceId, 'duplicate_check', dupCheck.explanation, dupCheck);
      if (dupCheck.isDuplicate) {
        await updateInvoiceStatus(invoiceId, 'duplicate_suspected');
      }

      // ── STEP 5: Match Agent ─────────────────────────────
      const matchResult = await processMatch(invoiceId, ed, null);
      pipelineResult.steps.match = {
        success: true,
        matchType: matchResult.matchType,
        poNumber: matchResult.poNumber,
        confidence: matchResult.matchConfidence,
      };
      await logExplainability(invoiceId, 'po_match', matchResult.explanation, matchResult);
      await updateInvoiceStatus(invoiceId, matchResult.matchType !== 'none' ? 'matched' : 'validation_in_progress');

      // Update invoice with PO if matched
      if (matchResult.poId) {
        await query('UPDATE invoices SET po_id = ?, po_number = ? WHERE id = ?', [matchResult.poId, matchResult.poNumber, invoiceId]);
      }

      // ── STEP 6: Tax & Compliance Agent ──────────────────
      const taxResult = await processTaxValidation(invoiceId, ed);
      pipelineResult.steps.taxValidation = {
        success: true,
        score: taxResult.score,
        arithmeticValid: taxResult.arithmeticValid,
        gstTypeValid: taxResult.gstTypeValid,
        issueCount: taxResult.issues?.length || 0,
      };
      await logExplainability(invoiceId, 'tax_validation', taxResult.explanation, taxResult);
      if (taxResult.score < 100) {
        await updateInvoiceStatus(invoiceId, 'tax_failed');
      }

      // ── STEP 7: Coding Agent ────────────────────────────
      const coding = await processCoding(invoiceId, ed, vendorMatch, matchResult);
      pipelineResult.steps.coding = {
        success: true,
        overallCertainty: coding.overallCertainty,
        suggestionCount: coding.suggestions?.length || 0,
      };
      await logExplainability(invoiceId, 'accounting_coding', coding.explanation, coding);

      // ── STEP 8: Workflow Routing Agent ──────────────────
      const routing = await processRouting(invoiceId, {
        extraction,
        vendorMatch,
        duplicateCheck: dupCheck,
        matchResult,
        taxValidation: taxResult,
        codingSuggestions: coding,
      });
      pipelineResult.steps.routing = {
        success: true,
        lane: routing.lane,
        postingReadiness: routing.postingReadiness,
        laneReason: routing.laneReason,
      };
      pipelineResult.lane = routing.lane;
      await logExplainability(invoiceId, 'workflow_routing',
        `Invoice routed to ${routing.lane.toUpperCase()} lane. ${routing.explanation}`,
        { lane: routing.lane, scores: routing.confidenceScores, readiness: routing.postingReadiness }
      );

      // Update ingestion log if available
      if (email._logId) {
        await query(
          `UPDATE invoice_ingestion_log
           SET invoice_ids = JSON_ARRAY_APPEND(COALESCE(invoice_ids, JSON_ARRAY()), '$', ?),
               status = 'processed', processed_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [invoiceId, email._logId]
        );
      }

      // Update document reference
      await query('UPDATE ap_invoice_documents SET invoice_id = ?, status = ? WHERE id = ?', [invoiceId, 'extracted', intake.documentId]);

      pipelineResult.success = true;
      const elapsed = Date.now() - startTime;
      console.log(`[Orchestrator] ✓ ${attachment.filename} → invoice ${invoiceId} → ${routing.lane.toUpperCase()} lane (${elapsed}ms)`);

    } catch (err) {
      pipelineResult.error = err.message;
      console.error(`[Orchestrator] ✗ ${attachment.filename}: ${err.message}`);
      console.error(err.stack);

      // Update ingestion log with failure
      if (email._logId) {
        try {
          await query(
            'UPDATE invoice_ingestion_log SET status = ?, error_message = ? WHERE id = ?',
            ['failed', err.message, email._logId]
          );
        } catch { /* ignore */ }
      }

      // Update invoice status if we have one
      if (pipelineResult.invoiceId) {
        await updateInvoiceStatus(pipelineResult.invoiceId, 'failed');
      }
    }

    results.push(pipelineResult);
  }

  return results;
}
