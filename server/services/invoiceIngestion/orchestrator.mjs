import { extractInvoiceData } from './geminiOCR.mjs';
import { validateInvoiceData } from './validator.mjs';
import { matchToPO } from './poMatcher.mjs';
import { createInvoiceFromExtraction } from './invoiceCreator.mjs';
import { handleExceptions } from './exceptionHandler.mjs';
import { triggerWorkflow } from './workflowTrigger.mjs';
import { query } from '../../mysql.mjs';

async function updateIngestionLog(logId, status, errorMessage = null, invoiceIds = null) {
  const sets = ['status = ?', 'processed_at = CURRENT_TIMESTAMP'];
  const params = [status];
  if (errorMessage) {
    sets.push('error_message = ?');
    params.push(errorMessage);
  }
  params.push(logId);
  await query(`UPDATE invoice_ingestion_log SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function processInvoiceEmail(email) {
  const logId = email._logId;
  const results = [];

  await updateIngestionLog(logId, 'processing');

  for (const attachment of email.attachments) {
    const stepResults = {
      filename: attachment.filename,
      steps: {},
      success: false,
      invoiceId: null,
      error: null,
    };

    try {
      // Step 1: OCR extraction
      console.log(`[Orchestrator] Extracting data from ${attachment.filename}...`);
      const extractedData = await extractInvoiceData(attachment.buffer, attachment.mimeType);
      stepResults.steps.ocr = { success: true, confidence: extractedData.confidence_score };

      // Step 2: Validation
      const validationResult = validateInvoiceData(extractedData);
      stepResults.steps.validation = {
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        requiresManualReview: validationResult.requiresManualReview,
      };

      // Step 3: PO matching
      const matchResult = await matchToPO(extractedData, null);
      stepResults.steps.poMatch = {
        matched: matchResult.matched,
        matchType: matchResult.matchType,
        poNumber: matchResult.poNumber,
        confidence: matchResult.matchConfidence,
      };

      // Step 4: Create invoice
      const { invoiceId, status } = await createInvoiceFromExtraction(
        extractedData,
        validationResult,
        matchResult,
        logId,
        null,
        attachment.buffer,
        attachment.filename
      );
      stepResults.invoiceId = invoiceId;
      stepResults.steps.invoiceCreated = { invoiceId, status };

      // Step 5: Exception handling
      const exceptions = await handleExceptions(
        invoiceId,
        extractedData,
        validationResult,
        matchResult
      );
      stepResults.steps.exceptions = exceptions;

      // Step 6: Workflow trigger
      const workflowResult = await triggerWorkflow(invoiceId, validationResult, matchResult);
      stepResults.steps.workflow = workflowResult;

      stepResults.success = true;
      console.log(
        `[Orchestrator] Successfully processed ${attachment.filename} → invoice ${invoiceId}`
      );
    } catch (err) {
      stepResults.error = err.message;
      console.error(`[Orchestrator] Failed to process ${attachment.filename}:`, err.message);
    }

    results.push(stepResults);
  }

  const allSuccess = results.every((r) => r.success);
  const anySuccess = results.some((r) => r.success);

  if (allSuccess) {
    await updateIngestionLog(logId, 'processed');
  } else if (anySuccess) {
    await updateIngestionLog(
      logId,
      'processed',
      `Partial: ${results.filter((r) => !r.success).length} attachment(s) failed`
    );
  } else {
    const errors = results
      .map((r) => r.error)
      .filter(Boolean)
      .join('; ');
    await updateIngestionLog(logId, 'failed', errors);
  }

  return results;
}
