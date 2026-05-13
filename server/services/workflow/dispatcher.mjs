/**
 * Workflow dispatcher — turns a submitted document into one or more
 * `approvals` rows. Replaces the historic `assigned_to='1'` hardcoded
 * inserts (see ARCHITECTURE.md §6 for the old contract).
 *
 * Flow per spec PART 5:
 *   A) selectWorkflowForDocument → workflowConfig | null
 *      • null: insert single fallback row, log warning
 *      • configs exist but none match: return { blocked: true }
 *   B) Filter steps whose per-step `conditionJson` evaluates false
 *   C) Anti-fraud: every step must resolve to an independent approver;
 *      duplicate approvers are deduplicated with a warning
 *   D) Step 1 → 'pending', steps 2..N → 'pending_predecessor'
 *   E) invalidatePendingApprovalsSync + bell/email notification for step 1
 *
 * Returns { success, approvalId, blocked?, reason? }.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { evaluateConditions, selectWorkflowForDocument } from './conditionEvaluator.mjs';
import { resolveStepApprover } from './roleResolver.mjs';
import { invalidatePendingApprovalsSync } from '../approvals/approvalService.mjs';
import { sendApprovalRequestNotification } from '../notifications/notificationService.mjs';

const TOKEN_TTL_HOURS = 72;

/** 96-char hex token (48 random bytes). */
export function generateSecureToken() {
  return randomBytes(48).toString('hex');
}

function pad(value) {
  return value == null ? null : value;
}

async function tableHasRowsForType(documentType, db) {
  try {
    const [rows] = await db.execute(
      'SELECT COUNT(*) AS c FROM workflow_configurations WHERE LOWER(module_name) = LOWER(?)',
      [documentType]
    );
    return (rows?.[0]?.c || 0) > 0;
  } catch {
    return false;
  }
}

/**
 * The dispatcher. `db` is the mysql pool (pool.execute / pool.getConnection).
 *
 * @param {object} params
 * @param {string} params.documentType    e.g. 'ap_invoice'
 * @param {string} params.documentId
 * @param {string} [params.documentRef]   human-readable ref (PO-001 / INV-2026-…)
 * @param {string} [params.documentName]  e.g. vendor name + amount
 * @param {object} [params.documentPayload] for condition evaluation
 * @param {string} params.submittedBy
 * @param {string} [params.submittedByName]
 * @param {string} params.tenantId
 * @param {object} params.db
 * @returns {Promise<{ success?: boolean, approvalId?: string, blocked?: boolean, reason?: string, warnings?: string[], fallback?: boolean }>}
 */
export async function enqueueApprovalFromWorkflow(params) {
  const {
    documentType,
    documentId,
    documentRef,
    documentName,
    documentPayload = {},
    submittedBy,
    submittedByName,
    tenantId,
    db,
  } = params;

  if (!documentType || !documentId || !tenantId || !db) {
    return { blocked: true, reason: 'Missing documentType/documentId/tenantId/db' };
  }
  const warnings = [];

  // Step A: select workflow.
  const workflowConfig = await selectWorkflowForDocument(
    documentType,
    documentPayload,
    tenantId,
    db
  );

  if (!workflowConfig) {
    const anyExist = await tableHasRowsForType(documentType, db);
    if (anyExist) {
      return {
        blocked: true,
        reason: `No matching workflow for ${documentType} — every active workflow's conditions evaluated false.`,
      };
    }
    // No definition at all — drop to a "legacy" single-row insert and log.
    const approvalId = randomUUID();
    await db.execute(
      `INSERT INTO approvals
         (id, module, reference_id, status, assigned_to, submitted_by, approval_priority,
          step_number, total_steps, tenant_id, document_ref, document_name, token, token_expires_at)
       VALUES (?, ?, ?, 'pending', '1', ?, 'normal', 1, 1, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ${TOKEN_TTL_HOURS} HOUR))`,
      [
        approvalId,
        documentType,
        documentId,
        submittedBy || '1',
        tenantId,
        pad(documentRef),
        pad(documentName),
        generateSecureToken(),
      ]
    );
    invalidatePendingApprovalsSync();
    console.warn(
      `[Dispatcher] No workflow_configurations for ${documentType} — inserted fallback approval ${approvalId}`
    );
    return { success: true, approvalId, fallback: true, warnings: ['no_workflow_configured'] };
  }

  // Step B: filter steps by per-step conditions (if present).
  const allSteps = Array.isArray(workflowConfig.steps) ? workflowConfig.steps : [];
  const remainingSteps = [];
  for (const step of allSteps) {
    const conds = step.conditionJson || step.conditions || [];
    if (!Array.isArray(conds) || conds.length === 0) {
      remainingSteps.push(step);
      continue;
    }
    if (evaluateConditions(conds, documentPayload)) {
      remainingSteps.push(step);
    } else {
      // Step was filtered out — not an error, just per-condition skip.
      warnings.push(`step_skipped:${step.approverRole || 'unnamed'}`);
    }
  }

  if (remainingSteps.length === 0) {
    return {
      blocked: true,
      reason: 'Minimum one approval level required (all steps filtered out)',
    };
  }

  // Step C: resolve every step's approver, anti-fraud + cross-step dedup
  // tracking. Per spec PART 5: same approver across multiple steps logs a
  // warning but DOES NOT drop the step. Each step still gets its own row —
  // the warning is for the workflow admin to revisit the role mapping.
  const resolvedSteps = [];
  const seenApprovers = new Set();
  for (const step of remainingSteps) {
    const result = await resolveStepApprover(step, tenantId, submittedBy, db);
    if (result.blocked) {
      return { blocked: true, reason: result.reason };
    }
    // Prefer an approver who hasn't already been used upstream; fall back
    // to the first if no fresh candidate exists (warn so the operator knows).
    const fresh = result.approvers.find((u) => !seenApprovers.has(u));
    const approver = fresh || result.approvers[0];
    if (!fresh) {
      warnings.push(`duplicate_approver:${approver}@step${step.stepNumber || ''}`);
    }
    seenApprovers.add(approver);
    resolvedSteps.push({ step, approverUserId: approver });
  }

  // Step D + E: insert rows. First is 'pending', rest are 'pending_predecessor'.
  const parentId = randomUUID();
  const totalSteps = resolvedSteps.length;
  const step1 = resolvedSteps[0];
  const tokenStep1 = generateSecureToken();

  await db.execute(
    `INSERT INTO approvals
       (id, module, reference_id, status, assigned_to, submitted_by, approval_priority,
        step_number, total_steps, workflow_config_id, next_step_role,
        parent_approval_id, token, token_expires_at, tenant_id,
        document_ref, document_name)
     VALUES (?, ?, ?, 'pending', ?, ?, 'normal',
             1, ?, ?, ?,
             NULL, ?, DATE_ADD(NOW(), INTERVAL ${TOKEN_TTL_HOURS} HOUR), ?,
             ?, ?)`,
    [
      parentId,
      documentType,
      documentId,
      step1.approverUserId,
      submittedBy || '1',
      totalSteps,
      workflowConfig.id,
      resolvedSteps[1]?.step?.approverRole || null,
      tokenStep1,
      tenantId,
      pad(documentRef),
      pad(documentName),
    ]
  );

  for (let i = 1; i < resolvedSteps.length; i++) {
    const r = resolvedSteps[i];
    const stepId = randomUUID();
    await db.execute(
      `INSERT INTO approvals
         (id, module, reference_id, status, assigned_to, submitted_by, approval_priority,
          step_number, total_steps, workflow_config_id, next_step_role,
          parent_approval_id, token, token_expires_at, tenant_id,
          document_ref, document_name)
       VALUES (?, ?, ?, 'pending_predecessor', ?, ?, 'normal',
               ?, ?, ?, ?,
               ?, ?, DATE_ADD(NOW(), INTERVAL ${TOKEN_TTL_HOURS} HOUR), ?,
               ?, ?)`,
      [
        stepId,
        documentType,
        documentId,
        r.approverUserId,
        submittedBy || '1',
        i + 1,
        totalSteps,
        workflowConfig.id,
        resolvedSteps[i + 1]?.step?.approverRole || null,
        parentId,
        generateSecureToken(),
        tenantId,
        pad(documentRef),
        pad(documentName),
      ]
    );
  }

  invalidatePendingApprovalsSync();

  // Notification for step 1 only — subsequent steps are notified by the
  // step-advance logic in approveItem.
  await sendApprovalRequestNotification({
    approverUserId: step1.approverUserId,
    documentType,
    documentRef,
    documentName,
    amount:
      documentPayload?.invoice_amount ?? documentPayload?.total_amount ?? documentPayload?.amount,
    submittedByName: submittedByName || 'A user',
    approvalId: parentId,
    token: tokenStep1,
    tenantId,
    db,
  }).catch((err) => console.error('[Dispatcher] notification failed:', err.message));

  return {
    success: true,
    approvalId: parentId,
    warnings: warnings.length ? warnings : undefined,
  };
}
