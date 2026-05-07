import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { query } from '../../mysql.mjs';
import {
  mapProcessingStatusToLifecycle,
  mapLegacyToLifecycle,
  LIFECYCLE_STATES,
} from '../invoices/lifecycleMapping.mjs';
import { processIntake } from './intakeAgent.mjs';
import { processExtraction } from './extractionAgent.mjs';
import { processVendorMatch } from './vendorIdentityAgent.mjs';
import { processDuplicateCheck } from './duplicateFraudAgent.mjs';
import { processMatch } from './matchAgent.mjs';
import { processTaxValidation } from './taxComplianceAgent.mjs';
import { processCoding } from './codingAgent.mjs';
import { processRouting } from './workflowRoutingAgent.mjs';
import { runAgent } from './agentRunner.mjs';
import { getAppMailFrom } from '../../appMail.mjs';

// ── Retry constants ─────────────────────────────────────────────────────────

export const MAX_AGENT_RETRIES = 3;
// Delays for attempt 1 → 2 → 3: 30 s, 2 min, 10 min
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000];

let _retryTableReady = false;

async function ensureRetryTable() {
  if (_retryTableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS agent_retry_queue (
      id            VARCHAR(36)  NOT NULL,
      invoice_id    VARCHAR(36)  NOT NULL,
      agent_name    VARCHAR(100) NOT NULL,
      attempt_count INT          NOT NULL DEFAULT 1,
      next_retry_at DATETIME     NOT NULL,
      status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
      last_error    TEXT         NULL,
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_arq_invoice (invoice_id),
      KEY idx_arq_retry (next_retry_at, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  _retryTableReady = true;
}

// ── Structured metrics ───────────────────────────────────────────────────────

export function emitMetric(invoiceId, agent, durationMs, status, attempt = 1) {
  console.log(
    JSON.stringify({
      event: 'agent_run',
      invoice_id: invoiceId,
      agent,
      duration_ms: durationMs,
      status,
      attempt,
      ts: new Date().toISOString(),
    })
  );
}

// ── Exception + retry helpers ────────────────────────────────────────────────

async function recordAgentException(invoiceId, agentName, err, attempt = 1) {
  try {
    await query(
      `INSERT INTO invoice_exceptions (id, invoice_id, exception_type, exception_detail, severity, created_at)
       VALUES (?, ?, 'AGENT_FAILURE', ?, 'high', CURRENT_TIMESTAMP)`,
      [
        randomUUID(),
        invoiceId,
        JSON.stringify({
          agent: agentName,
          message: err.message,
          stack: err.stack?.substring(0, 2000),
          attempt,
        }),
      ]
    );
  } catch {
    /* non-critical */
  }
}

async function scheduleRetry(invoiceId, agentName, attempt, lastErr) {
  await ensureRetryTable();
  const delayMs = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
  const nextAt = new Date(Date.now() + delayMs).toISOString().slice(0, 19).replace('T', ' ');
  try {
    await query(
      `INSERT INTO agent_retry_queue (id, invoice_id, agent_name, attempt_count, next_retry_at, status, last_error)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE
         agent_name = VALUES(agent_name),
         attempt_count = VALUES(attempt_count),
         next_retry_at = VALUES(next_retry_at),
         status = 'pending',
         last_error = VALUES(last_error),
         updated_at = CURRENT_TIMESTAMP`,
      [randomUUID(), invoiceId, agentName, attempt, nextAt, lastErr?.message ?? null]
    );
  } catch (err) {
    console.error('[Orchestrator] scheduleRetry failed:', err.message);
  }
}

async function markExhausted(invoiceId, agentName, lastErr) {
  try {
    await query(
      `UPDATE agent_retry_queue SET status = 'exhausted', updated_at = CURRENT_TIMESTAMP
       WHERE invoice_id = ?`,
      [invoiceId]
    );
    await query(
      `UPDATE invoices SET processing_status = 'agent_failed', lifecycle_state = ?,
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [LIFECYCLE_STATES.EXCEPTION_HOLD, invoiceId]
    );
    await sendAgentFailureAlert(invoiceId, agentName, lastErr);
  } catch (err) {
    console.error('[Orchestrator] markExhausted failed:', err.message);
  }
}

async function sendAgentFailureAlert(invoiceId, agentName, lastErr) {
  const to = process.env.ALERTS_EMAIL?.trim() || process.env.MAIL_FROM?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  if (!to || !smtpHost) {
    console.warn(
      `[Orchestrator] Invoice ${invoiceId} — retries exhausted; no SMTP configured for alert`
    );
    return;
  }
  try {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
    await transporter.sendMail({
      from: getAppMailFrom(),
      to,
      subject: `[Alert] Invoice ${invoiceId} — agent pipeline exhausted retries`,
      text:
        `Invoice ${invoiceId} failed the agent pipeline after ${MAX_AGENT_RETRIES} attempts.\n\n` +
        `Last failing agent: ${agentName}\n` +
        `Error: ${lastErr?.message ?? 'unknown'}\n`,
    });
  } catch (err) {
    console.error('[Orchestrator] Alert email failed:', err.message);
  }
}

// ── Safe fallbacks used when an individual agent step fails ──────────────────
// These allow downstream steps to continue; the invoice is still retried later.

const FALLBACK_VENDOR_MATCH = {
  matchedVendorName: null,
  matchConfidence: 0,
  method: 'agent_failed',
  isNewVendor: true,
  explanation: 'Agent failed',
};
const FALLBACK_DUP_CHECK = {
  riskScore: 0,
  isDuplicate: false,
  checks: [],
  explanation: 'Agent failed',
};
const FALLBACK_MATCH = {
  matchType: 'none',
  poNumber: null,
  matchConfidence: 0,
  poId: null,
  explanation: 'Agent failed',
};
const FALLBACK_TAX = {
  score: 100,
  arithmeticValid: true,
  gstTypeValid: true,
  issues: [],
  explanation: 'Agent failed',
};
const FALLBACK_CODING = { overallCertainty: 0, suggestions: [], explanation: 'Agent failed' };
const FALLBACK_ROUTING = {
  lane: 'manual',
  postingReadiness: 'not_ready',
  laneReason: 'Agent failed',
  explanation: 'Agent failed',
  confidenceScores: {},
};

// Returns a step-runner bound to this invoice run's failedAgents array.
function makeStepRunner(invoiceId, failedAgents, attempt = 1) {
  return async function step(name, fallback, fn) {
    const t0 = Date.now();
    try {
      const result = await fn();
      emitMetric(invoiceId, name, Date.now() - t0, 'ok', attempt);
      return result;
    } catch (err) {
      emitMetric(invoiceId, name, Date.now() - t0, 'error', attempt);
      await recordAgentException(invoiceId, name, err, attempt);
      failedAgents.push({ name, error: err });
      return fallback;
    }
  };
}

// ── Internal helpers (unchanged) ─────────────────────────────────────────────

async function logExplainability(invoiceId, stage, explanation, data) {
  try {
    await query(
      `INSERT INTO ap_invoice_explainability_logs (id, invoice_id, stage, explanation, data_snapshot, created_at)
       VALUES (?, ?, ?, ?, CAST(? AS JSON), CURRENT_TIMESTAMP)`,
      [randomUUID(), invoiceId, stage, explanation, JSON.stringify(data || {})]
    );
  } catch {
    /* non-critical */
  }
}

// NOTE: transition guard bypassed — automated pipeline flow, not user-facing
async function updateInvoiceStatus(invoiceId, status) {
  try {
    const mappedLifecycle = mapProcessingStatusToLifecycle(status);
    if (mappedLifecycle) {
      await query(
        'UPDATE invoices SET processing_status = ?, lifecycle_state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, mappedLifecycle, invoiceId]
      );
    } else {
      await query(
        'UPDATE invoices SET processing_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, invoiceId]
      );
    }
  } catch {
    /* non-critical */
  }
}

async function runAgentBuilderRuntime(invoiceId, extractedData, pipelineResult) {
  if (process.env.ENABLE_AGENT_BUILDER_RUNTIME !== 'true') {
    return;
  }

  const activeAgents = await query(
    `
      SELECT id, name, module, status
      FROM p2p_schema_mt.agents
      WHERE status = 'Active'
        AND (
          module = 'Accounts Payable'
          OR module = 'AP'
          OR module = 'Invoices'
        )
      ORDER BY updated_at DESC
    `
  );

  if (!Array.isArray(activeAgents) || activeAgents.length === 0) {
    pipelineResult.steps.agentBuilder = {
      enabled: true,
      executed: 0,
      results: [],
    };
    return;
  }

  const results = [];
  for (const agent of activeAgents) {
    try {
      const output = await runAgent(query, agent.id, extractedData, {
        mode: 'ingestion-runtime',
        invoiceId,
      });
      results.push({
        agentId: agent.id,
        agentName: agent.name,
        passed: output.passed,
        confidence: output.confidence,
        touchless: output.touchless,
        logId: output.logId,
      });
    } catch (err) {
      results.push({
        agentId: agent.id,
        agentName: agent.name,
        error: err.message,
      });
    }
  }

  pipelineResult.steps.agentBuilder = {
    enabled: true,
    executed: activeAgents.length,
    results,
  };
}

// ── Main email pipeline ───────────────────────────────────────────────────────

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
      // NOTE: transition guard bypassed — automated pipeline flow, not user-facing
      const invoiceId = randomUUID();
      pipelineResult.invoiceId = invoiceId;

      await query(
        `INSERT INTO invoices (id, status, source, processing_status, lifecycle_state, document_id, batch_id, created_at, updated_at)
         VALUES (?, 'draft', 'email_ingestion', 'extracting', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [invoiceId, LIFECYCLE_STATES.INGESTED, intake.documentId, intake.batchId]
      );

      const extraction = await processExtraction(
        invoiceId,
        intake.documentId,
        attachment.buffer,
        attachment.mimeType
      );
      pipelineResult.steps.extraction = {
        success: true,
        headerScore: extraction.headerScore,
        linesScore: extraction.linesScore,
        confidence: extraction.overallConfidence,
        provider: extraction.provider,
        lineItemCount: extraction.extractedData?.line_items?.length || 0,
      };

      // ── Hard duplicate block: check invoice_number + vendor_name before proceeding
      const ed = extraction.extractedData;
      if (ed.invoice_number && ed.vendor_name) {
        const existingInv = await query(
          'SELECT id FROM invoices WHERE invoice_number = ? AND vendor_name = ? AND id != ? LIMIT 1',
          [ed.invoice_number, ed.vendor_name, invoiceId]
        );
        if (existingInv.length > 0) {
          console.log(
            `[Orchestrator] ⚠ DUPLICATE BLOCKED: ${ed.invoice_number} from ${ed.vendor_name} already exists (${existingInv[0].id})`
          );
          await query('DELETE FROM invoices WHERE id = ?', [invoiceId]);
          pipelineResult.steps.extraction.duplicateBlocked = true;
          pipelineResult.steps.extraction.existingInvoiceId = existingInv[0].id;
          pipelineResult.success = true;
          pipelineResult.error = null;
          results.push(pipelineResult);
          continue;
        }
      }

      // Update invoice with extracted data
      // NOTE: transition guard bypassed — automated pipeline flow, not user-facing
      await query(
        `UPDATE invoices SET
          invoice_number = ?, invoice_date = ?, due_date = ?,
          vendor_name = ?, vendor_gstin = ?, vendor_pan = ?, vendor_email = ?,
          bill_to_entity = ?, bill_to_gstin = ?,
          currency = ?, subtotal = ?, tax_amount = ?, total_amount = ?,
          po_number = ?, payment_terms = ?, notes = ?,
          metadata = CAST(? AS JSON),
          extraction_model_version = ?,
          processing_status = 'extracted', lifecycle_state = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          ed.invoice_number,
          ed.invoice_date,
          ed.due_date,
          ed.vendor_name,
          ed.vendor_gstin,
          ed.vendor_pan,
          ed.vendor_email,
          ed.bill_to_entity,
          ed.bill_to_gstin,
          ed.currency || 'INR',
          ed.subtotal || 0,
          ed.tax_amount || 0,
          ed.total_amount || 0,
          ed.po_number,
          ed.payment_terms ? String(ed.payment_terms).substring(0, 65000) : null,
          ed.notes,
          JSON.stringify({
            extractedData: ed,
            extraction: { headerScore: extraction.headerScore, linesScore: extraction.linesScore },
          }),
          extraction.provider,
          LIFECYCLE_STATES.OCR_EXTRACTED,
          invoiceId,
        ]
      );

      if (Array.isArray(ed.line_items)) {
        for (let i = 0; i < ed.line_items.length; i++) {
          const li = ed.line_items[i];
          await query(
            `INSERT INTO invoice_line_items (id, invoice_id, line_number, description, quantity, unit_price, amount, hsn_sac, gst_rate, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
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

      await logExplainability(invoiceId, 'extraction', extraction.explanation, {
        provider: extraction.provider,
        confidence: extraction.overallConfidence,
      });
      await updateInvoiceStatus(invoiceId, 'extracted');

      // ── STEPS 3-8: individually wrapped with fallbacks ─────────────────────
      const failedAgents = [];
      const step = makeStepRunner(invoiceId, failedAgents);

      // ── STEP 3: Vendor Identity Agent ──
      const vendorMatch = await step('vendorIdentityAgent', FALLBACK_VENDOR_MATCH, () =>
        processVendorMatch(invoiceId, ed)
      );
      pipelineResult.steps.vendorMatch = {
        success: !failedAgents.some((a) => a.name === 'vendorIdentityAgent'),
        matchedVendorName: vendorMatch.matchedVendorName,
        confidence: vendorMatch.matchConfidence,
        method: vendorMatch.method,
        isNewVendor: vendorMatch.isNewVendor,
      };
      await logExplainability(invoiceId, 'vendor_match', vendorMatch.explanation, vendorMatch);
      await updateInvoiceStatus(
        invoiceId,
        vendorMatch.isNewVendor ? 'vendor_unresolved' : 'vendor_matched'
      );

      await runAgentBuilderRuntime(invoiceId, ed, pipelineResult);

      // ── STEP 4: Duplicate & Fraud Agent ──
      const dupCheck = await step('duplicateFraudAgent', FALLBACK_DUP_CHECK, () =>
        processDuplicateCheck(invoiceId, ed, intake.contentHash)
      );
      pipelineResult.steps.duplicateCheck = {
        success: !failedAgents.some((a) => a.name === 'duplicateFraudAgent'),
        riskScore: dupCheck.riskScore,
        isDuplicate: dupCheck.isDuplicate,
        checksRun: dupCheck.checks?.length || 0,
      };
      await logExplainability(invoiceId, 'duplicate_check', dupCheck.explanation, dupCheck);
      if (dupCheck.isDuplicate) {
        await updateInvoiceStatus(invoiceId, 'duplicate_suspected');
      }

      // ── STEP 5: Match Agent ──
      const matchResult = await step('matchAgent', FALLBACK_MATCH, () =>
        processMatch(invoiceId, ed, null)
      );
      pipelineResult.steps.match = {
        success: !failedAgents.some((a) => a.name === 'matchAgent'),
        matchType: matchResult.matchType,
        poNumber: matchResult.poNumber,
        confidence: matchResult.matchConfidence,
      };
      await logExplainability(invoiceId, 'po_match', matchResult.explanation, matchResult);
      await updateInvoiceStatus(
        invoiceId,
        matchResult.matchType !== 'none' ? 'matched' : 'validation_in_progress'
      );
      if (matchResult.poId) {
        await query('UPDATE invoices SET po_id = ?, po_number = ? WHERE id = ?', [
          matchResult.poId,
          matchResult.poNumber,
          invoiceId,
        ]);
      }

      // ── STEP 6: Tax & Compliance Agent ──
      const taxResult = await step('taxComplianceAgent', FALLBACK_TAX, () =>
        processTaxValidation(invoiceId, ed)
      );
      pipelineResult.steps.taxValidation = {
        success: !failedAgents.some((a) => a.name === 'taxComplianceAgent'),
        score: taxResult.score,
        arithmeticValid: taxResult.arithmeticValid,
        gstTypeValid: taxResult.gstTypeValid,
        issueCount: taxResult.issues?.length || 0,
      };
      await logExplainability(invoiceId, 'tax_validation', taxResult.explanation, taxResult);
      if (taxResult.score < 100) {
        await updateInvoiceStatus(invoiceId, 'tax_failed');
      }

      // ── STEP 7: Coding Agent ──
      const coding = await step('codingAgent', FALLBACK_CODING, () =>
        processCoding(invoiceId, ed, vendorMatch, matchResult)
      );
      pipelineResult.steps.coding = {
        success: !failedAgents.some((a) => a.name === 'codingAgent'),
        overallCertainty: coding.overallCertainty,
        suggestionCount: coding.suggestions?.length || 0,
      };
      await logExplainability(invoiceId, 'accounting_coding', coding.explanation, coding);

      // ── STEP 8: Workflow Routing Agent ──
      const routing = await step('workflowRoutingAgent', FALLBACK_ROUTING, () =>
        processRouting(invoiceId, {
          extraction,
          vendorMatch,
          duplicateCheck: dupCheck,
          matchResult,
          taxValidation: taxResult,
          codingSuggestions: coding,
        })
      );
      pipelineResult.steps.routing = {
        success: !failedAgents.some((a) => a.name === 'workflowRoutingAgent'),
        lane: routing.lane,
        postingReadiness: routing.postingReadiness,
        laneReason: routing.laneReason,
      };
      pipelineResult.lane = routing.lane;
      await logExplainability(
        invoiceId,
        'workflow_routing',
        `Invoice routed to ${routing.lane.toUpperCase()} lane. ${routing.explanation}`,
        {
          lane: routing.lane,
          scores: routing.confidenceScores,
          readiness: routing.postingReadiness,
        }
      );

      if (email._logId) {
        await query(
          `UPDATE invoice_ingestion_log
           SET invoice_ids = JSON_ARRAY_APPEND(COALESCE(invoice_ids, JSON_ARRAY()), '$', ?),
               status = 'processed', processed_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [invoiceId, email._logId]
        );
      }
      await query('UPDATE ap_invoice_documents SET invoice_id = ?, status = ? WHERE id = ?', [
        invoiceId,
        'extracted',
        intake.documentId,
      ]);

      pipelineResult.success = true;
      const elapsed = Date.now() - startTime;
      console.log(
        `[Orchestrator] ✓ ${attachment.filename} → invoice ${invoiceId} → ${routing.lane.toUpperCase()} lane (${elapsed}ms)`
      );

      // Schedule retry if any step failed (pipeline completed but not perfectly)
      if (failedAgents.length > 0) {
        const first = failedAgents[0];
        console.warn(
          `[Orchestrator] ↻ Invoice ${invoiceId} — ${failedAgents.length} agent(s) failed; scheduling retry`
        );
        await scheduleRetry(invoiceId, first.name, 1, first.error);
      }
    } catch (err) {
      pipelineResult.error = err.message;
      console.error(`[Orchestrator] ✗ ${attachment.filename}: ${err.message}`);
      console.error(err.stack);

      if (email._logId) {
        try {
          await query(
            'UPDATE invoice_ingestion_log SET status = ?, error_message = ? WHERE id = ?',
            ['failed', err.message, email._logId]
          );
        } catch {
          /* ignore */
        }
      }

      if (pipelineResult.invoiceId) {
        await updateInvoiceStatus(pipelineResult.invoiceId, 'failed');
        // Treat catastrophic failure as attempt 1 and schedule retry
        await scheduleRetry(pipelineResult.invoiceId, 'pipeline', 1, err);
      }
    }

    results.push(pipelineResult);
  }

  return results;
}

// ── Retry pipeline: re-runs agents 3-8 for an existing invoice ───────────────

export async function reprocessAgentPipeline(invoiceId) {
  await ensureRetryTable();

  // Read invoice + extracted data from DB
  const rows = await query(`SELECT id, metadata, document_id FROM invoices WHERE id = ? LIMIT 1`, [
    invoiceId,
  ]);
  if (!rows.length) {
    console.warn(`[Orchestrator] reprocessAgentPipeline: invoice ${invoiceId} not found`);
    return null;
  }
  const invoice = rows[0];
  const metadata =
    typeof invoice.metadata === 'string' ? JSON.parse(invoice.metadata) : (invoice.metadata ?? {});
  const extractedData = metadata.extractedData ?? {};

  // Current attempt count from retry queue
  const retryRows = await query(
    `SELECT attempt_count FROM agent_retry_queue WHERE invoice_id = ? LIMIT 1`,
    [invoiceId]
  );
  const currentAttempt = retryRows[0]?.attempt_count ?? 1;

  const failedAgents = [];
  const step = makeStepRunner(invoiceId, failedAgents, currentAttempt);

  const vendorMatch = await step('vendorIdentityAgent', FALLBACK_VENDOR_MATCH, () =>
    processVendorMatch(invoiceId, extractedData)
  );
  await updateInvoiceStatus(
    invoiceId,
    vendorMatch.isNewVendor ? 'vendor_unresolved' : 'vendor_matched'
  );

  const dupCheck = await step('duplicateFraudAgent', FALLBACK_DUP_CHECK, () =>
    processDuplicateCheck(invoiceId, extractedData, null)
  );
  if (dupCheck.isDuplicate) await updateInvoiceStatus(invoiceId, 'duplicate_suspected');

  const matchResult = await step('matchAgent', FALLBACK_MATCH, () =>
    processMatch(invoiceId, extractedData, null)
  );
  await updateInvoiceStatus(
    invoiceId,
    matchResult.matchType !== 'none' ? 'matched' : 'validation_in_progress'
  );
  if (matchResult.poId) {
    await query('UPDATE invoices SET po_id = ?, po_number = ? WHERE id = ?', [
      matchResult.poId,
      matchResult.poNumber,
      invoiceId,
    ]);
  }

  const taxResult = await step('taxComplianceAgent', FALLBACK_TAX, () =>
    processTaxValidation(invoiceId, extractedData)
  );
  if (taxResult.score < 100) await updateInvoiceStatus(invoiceId, 'tax_failed');

  const coding = await step('codingAgent', FALLBACK_CODING, () =>
    processCoding(invoiceId, extractedData, vendorMatch, matchResult)
  );

  const routing = await step('workflowRoutingAgent', FALLBACK_ROUTING, () =>
    processRouting(invoiceId, {
      extraction: metadata.extraction ?? {},
      vendorMatch,
      duplicateCheck: dupCheck,
      matchResult,
      taxValidation: taxResult,
      codingSuggestions: coding,
    })
  );

  if (failedAgents.length === 0) {
    await query(
      `UPDATE agent_retry_queue SET status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE invoice_id = ?`,
      [invoiceId]
    );
    console.log(
      `[Orchestrator] ✓ Retry succeeded for invoice ${invoiceId} (attempt ${currentAttempt})`
    );
    return { success: true, lane: routing.lane };
  }

  // Still failing — decide whether to retry or exhaust
  const nextAttempt = currentAttempt + 1;
  const first = failedAgents[0];
  if (nextAttempt > MAX_AGENT_RETRIES) {
    console.error(
      `[Orchestrator] ✗ Invoice ${invoiceId} exhausted all ${MAX_AGENT_RETRIES} retries`
    );
    await markExhausted(invoiceId, first.name, first.error);
  } else {
    console.warn(
      `[Orchestrator] ↻ Invoice ${invoiceId} — retry ${nextAttempt}/${MAX_AGENT_RETRIES}`
    );
    await scheduleRetry(invoiceId, first.name, nextAttempt, first.error);
  }

  return { success: false, failedAgents: failedAgents.map((a) => a.name) };
}

// ── Retry scheduler ──────────────────────────────────────────────────────────

export async function processRetryQueue() {
  await ensureRetryTable();
  const due = await query(
    `SELECT invoice_id FROM agent_retry_queue WHERE status = 'pending' AND next_retry_at <= CURRENT_TIMESTAMP`
  );
  for (const row of due) {
    try {
      await reprocessAgentPipeline(row.invoice_id);
    } catch (err) {
      console.error(`[Orchestrator] Retry processing failed for ${row.invoice_id}:`, err.message);
    }
  }
}

let _retryTimer = null;

export function startAgentRetryScheduler(intervalMs = 30_000) {
  if (_retryTimer) return;
  _retryTimer = setInterval(async () => {
    try {
      await processRetryQueue();
    } catch (err) {
      console.error('[Orchestrator] processRetryQueue error:', err.message);
    }
  }, intervalMs);
  // Don't block Node.js from exiting normally
  if (typeof _retryTimer.unref === 'function') _retryTimer.unref();
  console.log(`[Orchestrator] Agent retry scheduler started (interval: ${intervalMs}ms)`);
}

export function stopAgentRetryScheduler() {
  if (_retryTimer) {
    clearInterval(_retryTimer);
    _retryTimer = null;
  }
}

// ── Manual retry endpoint helper ─────────────────────────────────────────────

export async function resetAndRequeueInvoice(invoiceId) {
  await ensureRetryTable();
  // Reset attempt count so the pipeline gets a clean run
  await query(
    `UPDATE agent_retry_queue
     SET attempt_count = 0, status = 'pending', next_retry_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE invoice_id = ?`,
    [invoiceId]
  );
  return reprocessAgentPipeline(invoiceId);
}
