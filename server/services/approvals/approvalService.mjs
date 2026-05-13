import { randomUUID } from 'node:crypto';
import { getGenericMasterKeys, getQualifiedTableName } from '../../masterStorage.mjs';
import { LIFECYCLE_STATES } from '../invoices/lifecycleMapping.mjs';

const DEFAULT_SLA_HOURS = 48;
const DEFAULT_ESCALATION_HOURS = 36;
const PENDING_MASTER_STATUSES = [
  'pending approval',
  'pending_approval',
  'pending',
  'draft',
  'changes requested',
];
let ensuredReferenceIdColumn = false;
const SYNC_DEBOUNCE_MS = 60000;
let pendingSyncPromise = null;
let lastSyncAt = 0;
let syncLoopHandle = null;

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseMasterReference(referenceId) {
  if (!referenceId || typeof referenceId !== 'string' || !referenceId.includes(':')) return null;
  const [masterKey, ...rest] = referenceId.split(':');
  const recordId = rest.join(':');
  if (!masterKey || !recordId) return null;
  return { masterKey, recordId };
}

async function syncMasterSourceApprovalStatus(conn, approval, nextStatus) {
  if (!approval) return;

  // Invoice approvals — flip the invoice's lifecycle_state + status only on
  // the FINAL workflow step (or single-step legacy rows). Approving step 1
  // of a 3-step chain MUST leave the invoice in Under Verification — the
  // workflow engine still has steps 2..N to play out. Rejection always
  // terminates the document immediately, regardless of step.
  if (approval.module === 'ap_invoice' || approval.module === 'non_po_invoice') {
    const totalSteps = Number(approval.total_steps) || 1;
    const stepNumber = Number(approval.step_number) || 1;
    const isFinalStep = stepNumber >= totalSteps;
    if (nextStatus === 'Approved' && isFinalStep) {
      await conn.execute(
        `UPDATE invoices
            SET lifecycle_state = 'Processed',
                status = 'approved',
                updated_at = NOW()
          WHERE id = ?`,
        [approval.reference_id]
      );
    } else if (nextStatus === 'Rejected') {
      await conn.execute(
        `UPDATE invoices
            SET lifecycle_state = 'Rejected',
                status = 'rejected',
                updated_at = NOW()
          WHERE id = ?`,
        [approval.reference_id]
      );
    }
    return;
  }

  if (approval.module !== 'master_update') return;
  const parsed = parseMasterReference(approval.reference_id);
  if (!parsed) return;
  const tableName = getQualifiedTableName(parsed.masterKey);
  if (!tableName) return;

  // Same guard as the invoice branch: a master row only flips on the FINAL
  // workflow step (or any step on rejection). Intermediate approvals leave
  // the master in Pending Approval / Changes Requested.
  const totalSteps = Number(approval.total_steps) || 1;
  const stepNumber = Number(approval.step_number) || 1;
  const isFinalStep = stepNumber >= totalSteps;
  if (nextStatus === 'Approved' && !isFinalStep) return;

  await conn.execute(
    `UPDATE ${tableName}
     SET approval_status = ?,
         payload = JSON_SET(
           COALESCE(payload, JSON_OBJECT()),
           '$.approvalStatus', ?,
           '$.updatedAt', DATE_FORMAT(CURRENT_TIMESTAMP, '%Y-%m-%dT%H:%i:%sZ')
         ),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [nextStatus, nextStatus, parsed.recordId]
  );
}

async function syncPendingApprovals(db, approverId = '1') {
  if (!ensuredReferenceIdColumn) {
    try {
      await db.execute('ALTER TABLE approvals MODIFY COLUMN reference_id VARCHAR(128) NOT NULL');
    } catch {
      // Safe no-op if DDL permission/definition differs in a given environment.
    } finally {
      ensuredReferenceIdColumn = true;
    }
  }

  // 1) Upsert pending invoices into approvals queue.
  //
  // `assigned_to = '1'` is the universal unclaimed marker — the queue filter
  // is `(a.assigned_to = approverId OR a.assigned_to = '1')`, so any
  // logged-in user can see and action these. Previously this column was set
  // to `COALESCE(entity_id, approverId, '1')` which made invoices invisible
  // to users whose id wasn't literally the entity UUID. `submitted_by` keeps
  // the approverId fallback so audit-trail aggregation works.
  await db.execute(
    `INSERT INTO approvals (
      id, module, reference_id, status, assigned_to, submitted_by, created_at, approval_priority
    )
    SELECT
      UUID(),
      CASE
        WHEN (i.po_id IS NULL OR i.po_id = '' OR i.po_number IS NULL OR i.po_number = '')
          THEN 'non_po_invoice'
        ELSE 'ap_invoice'
      END,
      i.id,
      'pending',
      '1',
      COALESCE(NULLIF(i.validated_by, ''), ?, '1'),
      COALESCE(i.created_at, NOW()),
      'normal'
    FROM invoices i
    WHERE (LOWER(COALESCE(i.status, '')) IN ('pending_approval', 'pending approval', 'pending', 'submitted', 'in review')
           OR i.lifecycle_state = ?)
      AND NOT EXISTS (
        SELECT 1
        FROM approvals a
        WHERE a.reference_id = i.id
          AND a.module IN ('ap_invoice', 'non_po_invoice')
          AND a.status = 'pending'
      )`,
    [approverId, LIFECYCLE_STATES.UNDER_VERIFICATION]
  );

  // 2) Upsert pending POs.
  await db.execute(
    `INSERT INTO approvals (
      id, module, reference_id, status, assigned_to, submitted_by, created_at, approval_priority
    )
    SELECT
      UUID(),
      'purchase_order',
      po.id,
      'pending',
      COALESCE(NULLIF(po.entity_id, ''), ?, '1'),
      COALESCE(NULLIF(po.entity_id, ''), ?, '1'),
      COALESCE(po.created_at, NOW()),
      'normal'
    FROM purchase_orders po
    WHERE LOWER(COALESCE(po.status, '')) IN ('pending_approval', 'pending approval', 'pending', 'submitted', 'in review')
      AND NOT EXISTS (
        SELECT 1
        FROM approvals a
        WHERE a.reference_id = po.id
          AND a.module = 'purchase_order'
          AND a.status = 'pending'
      )`,
    [approverId, approverId]
  );

  // 3) Upsert pending master approvals from current dedicated master tables.
  // reference_id is namespaced as "<master_key>:<record_id>" to avoid collisions across master tables.
  const masterKeys = getGenericMasterKeys();

  // First heal source master rows from the latest processed approval decision.
  // This fixes older environments where approve/reject updated the approvals row
  // but did not persist the terminal status back to the source master record.
  //
  // CRITICAL: only heal when the audit decision is fresher than the master
  // row's `updated_at`. Without this guard, a fresh edit that intentionally
  // drops a previously-Approved record back to Pending Approval gets auto-
  // re-flipped to Approved by an old audit row — defeating the whole
  // re-approval flow. See bug history: entity_master edits would briefly show
  // Pending then "auto-approve" because this sync ran ~5s later and clobbered
  // the master row using an audit row from the previous approval cycle.
  for (const masterKey of masterKeys) {
    const tableName = getQualifiedTableName(masterKey);
    if (!tableName) continue;

    try {
      await db.execute(
        `UPDATE ${tableName} m
       JOIN (
         SELECT a.reference_id, a.status,
                COALESCE(a.completed_at, a.approved_at, a.rejected_at, a.created_at) AS resolved_at
         FROM approvals a
         JOIN (
           SELECT reference_id, MAX(COALESCE(completed_at, approved_at, rejected_at, created_at)) AS latest_ts
           FROM approvals
           WHERE module = 'master_update'
             AND reference_id LIKE CONCAT(?, ':%')
             AND status IN ('approved', 'rejected')
           GROUP BY reference_id
         ) latest
           ON latest.reference_id = a.reference_id
          AND COALESCE(a.completed_at, a.approved_at, a.rejected_at, a.created_at) = latest.latest_ts
         WHERE a.module = 'master_update'
           AND a.reference_id LIKE CONCAT(?, ':%')
           AND a.status IN ('approved', 'rejected')
       ) resolved
         ON resolved.reference_id = CONCAT(?, ':', m.id)
       SET m.approval_status = CASE
             WHEN resolved.status = 'approved' THEN 'Approved'
             WHEN resolved.status = 'rejected' THEN 'Rejected'
             ELSE m.approval_status
           END,
       m.payload = JSON_SET(
             COALESCE(m.payload, JSON_OBJECT()),
             '$.approvalStatus',
             CASE
               WHEN resolved.status = 'approved' THEN 'Approved'
               WHEN resolved.status = 'rejected' THEN 'Rejected'
               ELSE COALESCE(JSON_UNQUOTE(JSON_EXTRACT(m.payload, '$.approvalStatus')), m.approval_status, 'Pending Approval')
             END
           ),
       m.updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(COALESCE(m.approval_status, '')) NOT IN ('approved', 'rejected')
         AND resolved.resolved_at > COALESCE(m.updated_at, m.created_at)`,
        [masterKey, masterKey, masterKey]
      );
    } catch (err) {
      // ER_BAD_DB_ERROR / ER_NO_SUCH_TABLE on dev DBs where a per-master
      // schema hasn't been provisioned. The heal is best-effort; missing
      // tables just mean nothing to heal.
      if (!['ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE'].includes(err?.code)) {
        throw err;
      }
    }
  }

  for (const masterKey of masterKeys) {
    const tableName = getQualifiedTableName(masterKey);
    if (!tableName) continue;

    try {
      await db.execute(
        `INSERT INTO approvals (
        id, module, reference_id, status, assigned_to, submitted_by, created_at, approval_priority
      )
      SELECT
        UUID(),
        'master_update',
        CONCAT(?, ':', m.id),
        'pending',
        '1',
        COALESCE(NULLIF(?, ''), '1'),
        COALESCE(m.updated_at, m.created_at, NOW()),
        'normal'
      FROM ${tableName} m
      WHERE LOWER(COALESCE(m.approval_status, '')) IN (${PENDING_MASTER_STATUSES.map(() => '?').join(', ')})
        AND LOWER(COALESCE(m.status, 'active')) <> 'inactive'
        AND NOT EXISTS (
          SELECT 1
          FROM approvals a
          WHERE a.reference_id = CONCAT(?, ':', m.id)
            AND a.module = 'master_update'
            AND a.status = 'pending'
        )`,
        [masterKey, approverId, ...PENDING_MASTER_STATUSES, masterKey]
      );
    } catch (err) {
      if (!['ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE'].includes(err?.code)) {
        throw err;
      }
    }
  }

  // Normalize legacy master approvals to shared queue visibility.
  // Skip workflow-engine rows — those carry a resolved approver id that
  // must not be overwritten with the universal '1' sentinel.
  await db.execute(
    `UPDATE approvals
     SET assigned_to = '1'
     WHERE module = 'master_update'
       AND status = 'pending'
       AND workflow_config_id IS NULL
       AND COALESCE(assigned_to, '') <> '1'`
  );

  // 4) Auto-close stale pending approvals whose source is no longer pending.
  //    Only applies to LEGACY rows (workflow_config_id IS NULL). Workflow-
  //    engine rows are not auto-closed — the dispatcher and triggerNextWorkflowStep
  //    own that lifecycle (rejection paths cascade pending_predecessor → cancelled).
  await db.execute(
    `UPDATE approvals a
     LEFT JOIN invoices i ON a.reference_id = i.id AND a.module IN ('ap_invoice', 'non_po_invoice')
     SET a.status = 'approved',
         a.completed_at = COALESCE(a.completed_at, NOW()),
         a.approved_at = COALESCE(a.approved_at, NOW())
     WHERE a.status = 'pending'
       AND a.module IN ('ap_invoice', 'non_po_invoice')
       AND a.workflow_config_id IS NULL
       AND (
         i.id IS NULL
         OR (
           LOWER(COALESCE(i.status, '')) NOT IN ('pending_approval', 'pending approval', 'pending', 'submitted', 'in review')
           AND (i.lifecycle_state IS NULL OR i.lifecycle_state != ?)
         )
       )`,
    [LIFECYCLE_STATES.UNDER_VERIFICATION]
  );

  await db.execute(
    `UPDATE approvals a
     LEFT JOIN purchase_orders po ON a.reference_id = po.id AND a.module = 'purchase_order'
     SET a.status = 'approved',
         a.completed_at = COALESCE(a.completed_at, NOW()),
         a.approved_at = COALESCE(a.approved_at, NOW())
     WHERE a.status = 'pending'
       AND a.module = 'purchase_order'
       AND (
         po.id IS NULL
         OR LOWER(COALESCE(po.status, '')) NOT IN ('pending_approval', 'pending approval', 'pending', 'submitted', 'in review')
       )`
  );

  for (const masterKey of masterKeys) {
    const tableName = getQualifiedTableName(masterKey);
    if (!tableName) continue;

    await db.execute(
      `UPDATE approvals a
       LEFT JOIN ${tableName} m
         ON a.reference_id = CONCAT(?, ':', m.id)
         AND a.module = 'master_update'
       SET a.status = 'approved',
           a.completed_at = COALESCE(a.completed_at, NOW()),
           a.approved_at = COALESCE(a.approved_at, NOW())
       WHERE a.status = 'pending'
         AND a.module = 'master_update'
         AND a.reference_id LIKE CONCAT(?, ':%')
         AND (
           m.id IS NULL
           OR LOWER(COALESCE(m.approval_status, '')) NOT IN (${PENDING_MASTER_STATUSES.map(() => '?').join(', ')})
         )`,
      [masterKey, masterKey, ...PENDING_MASTER_STATUSES]
    );
  }
}

async function ensurePendingApprovalsSynced(db, approverId = '1', options = {}) {
  const force = options.force === true;
  if (pendingSyncPromise) {
    await pendingSyncPromise;
    return;
  }

  if (!force && Date.now() - lastSyncAt < SYNC_DEBOUNCE_MS) {
    return;
  }

  pendingSyncPromise = syncPendingApprovals(db, approverId)
    .then(() => {
      lastSyncAt = Date.now();
    })
    .finally(() => {
      pendingSyncPromise = null;
    });

  await pendingSyncPromise;
}

export function triggerApprovalSync(db, approverId = '1') {
  ensurePendingApprovalsSynced(db, approverId).catch((error) => {
    console.error('[Approvals] background sync failed', error);
  });
}

/**
 * Awaitable sync — used by the queue/KPI endpoints so that a fresh user fetch
 * always reflects the latest pending master rows. `force=true` short-circuits
 * the 60s debounce: explicit user reads must never miss a submission that
 * happened seconds ago. The debounce still gates the background loop and the
 * post-PUT trigger, where missing one window is harmless.
 */
export async function awaitApprovalSync(db, approverId = '1', options = {}) {
  try {
    await ensurePendingApprovalsSynced(db, approverId, options);
  } catch (error) {
    console.error('[Approvals] foreground sync failed', error);
  }
}

/**
 * Reset the debounce so the next sync runs full. Called from the master PUT
 * path the moment a master row lands in a pending state — the next time the
 * Approvals queue is opened, the sync is guaranteed to insert the new row.
 */
export function invalidatePendingApprovalsSync() {
  lastSyncAt = 0;
}

/**
 * Hardcoded single-level master approval — the master twin of
 * `ensureInvoiceApproval`. Idempotently UPSERTs an approvals row for the
 * given (masterKey, recordId). Used by:
 *   • The canonical PUT /api/masters/<key> handler when a record lands in a
 *     pending state.
 *   • The `backfillAllPendingApprovals` startup hook (which sweeps every
 *     master table and re-runs this helper).
 *
 * Schema mapping note: the `approvals` table is shared across modules and
 * doesn't carry `document_type` / `document_id` / `document_ref` /
 * `document_name` columns. The conventional encoding is:
 *   module       = 'master_update'                  (the enum value)
 *   reference_id = `${masterKey}:${recordId}`        (the dispatcher key)
 * `recordCode` / `recordName` / `tenantId` are accepted on the helper API
 * for future portability and currently only flow through the per-master
 * row at queue read time (the queue JOINs the master table for display).
 *
 * `approvals` has no `updated_at` column — the UPDATE only resets
 * `submitted_by` + `assigned_to` (the universal '1' unclaimed marker).
 */
export async function ensureMasterApproval(db, options = {}) {
  const masterKey = options.masterKey;
  const recordId = options.recordId;
  if (!masterKey || !recordId) {
    return { skipped: true, reason: 'missing_masterKey_or_recordId' };
  }
  const submittedBy = options.submittedBy || '1';
  const recordCode = options.recordCode || null;
  const recordName = options.recordName || null;
  const tenantId = options.tenantId || 'tenant-default-001';
  const referenceId = `${masterKey}:${recordId}`;

  const [existingRows] = await db.execute(
    `SELECT id FROM approvals
      WHERE module = 'master_update'
        AND reference_id = ?
        AND status IN ('pending', 'pending_predecessor')
      LIMIT 1`,
    [referenceId]
  );

  if (existingRows && existingRows.length) {
    invalidatePendingApprovalsSync();
    return { approvalId: existingRows[0].id, action: 'noop_existing' };
  }

  // Dispatch through the workflow engine instead of inserting a hardcoded
  // assigned_to='1' row. Lazy-required to avoid the circular import (the
  // dispatcher imports invalidatePendingApprovalsSync from this module).
  const { enqueueApprovalFromWorkflow } = await import('../workflow/dispatcher.mjs');
  const result = await enqueueApprovalFromWorkflow({
    documentType: 'master_update',
    documentId: referenceId,
    documentRef: recordCode || referenceId,
    documentName: recordName || masterKey,
    documentPayload: { master_type: masterKey, submitted_by: submittedBy },
    submittedBy,
    submittedByName: null,
    tenantId,
    db,
  });
  if (result.blocked) return result;
  return { approvalId: result.approvalId, action: result.fallback ? 'fallback' : 'inserted' };
}

/**
 * Combined startup backfill — sweeps every master in MASTER_STORAGE plus the
 * invoices table and ensures a matching pending approvals row exists for
 * each pending record. Idempotent (existing rows hit UPDATE branch). Each
 * master is wrapped in its own try/catch so a schema-gap on one doesn't
 * block the others (e.g. fresh dev DBs may lack some master tables).
 *
 * The `ensureInvoice` callback is dependency-injected so this module doesn't
 * have to import from server/routes/invoices.mjs — that would create a
 * circular dependency (invoices.mjs already imports
 * `invalidatePendingApprovalsSync` from here).
 *
 * @param {object} db                 — { execute(sql, params): Promise<[rows]> }
 * @param {object} [opts]
 * @param {Function} [opts.ensureInvoice]  async (invoiceId, submittedBy) → result
 * @returns {Promise<{
 *   masters: { scanned, inserted, updated, errors, perKey: Record<string, object> },
 *   invoices: { scanned, inserted, updated, errors }
 * }>}
 */
export async function backfillAllPendingApprovals(db, opts = {}) {
  const summary = {
    masters: { scanned: 0, inserted: 0, updated: 0, errors: 0, perKey: {} },
    invoices: { scanned: 0, inserted: 0, updated: 0, errors: 0 },
  };

  // ── Step A — Masters backfill ───────────────────────────────────────────
  // Iterates every key in MASTER_STORAGE. `getGenericMasterKeys()` returns
  // the canonical-schema masters (record_code/record_name/payload). Bespoke
  // masters (item_master, kit_bundle_master, employee_master,
  // rate_contract_master) have their own identifier columns and approval
  // flows; we handle item_master here using its flat columns, and skip the
  // other bespoke ones (their own route files manage their queue entries
  // when approval workflows are wired). On dev DBs where a master schema
  // hasn't been provisioned, MySQL returns ER_BAD_DB_ERROR (1049) or
  // ER_NO_SUCH_TABLE (1146) — both treated as silent skips (logged but
  // not counted as errors).
  const SILENT_SKIP_ERRORS = new Set(['ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR']);
  const BESPOKE_SKIP_KEYS = new Set([
    'kit_bundle_master',
    'employee_master',
    'rate_contract_master',
  ]);

  const genericKeys = getGenericMasterKeys();
  const allKeys = [...genericKeys, 'item_master'];
  for (const masterKey of allKeys) {
    if (BESPOKE_SKIP_KEYS.has(masterKey)) continue;

    const perKey = { scanned: 0, inserted: 0, updated: 0, errors: 0 };
    summary.masters.perKey[masterKey] = perKey;
    try {
      const tableName = getQualifiedTableName(masterKey);
      if (!tableName) continue;

      const identCols =
        masterKey === 'item_master'
          ? 'm.id, m.item_code AS record_code, m.item_name AS record_name'
          : 'm.id, m.record_code, m.record_name';

      const [rows] = await db.execute(
        `SELECT ${identCols}
           FROM ${tableName} m
          WHERE m.approval_status IN ('Pending Approval', 'Pending', 'pending_approval', 'Draft')
            AND NOT EXISTS (
              SELECT 1 FROM approvals a
              WHERE a.module = 'master_update'
                AND a.reference_id = CONCAT(?, ':', m.id)
                AND a.status = 'pending'
            )`,
        [masterKey]
      );

      for (const row of rows || []) {
        perKey.scanned += 1;
        summary.masters.scanned += 1;
        try {
          const result = await ensureMasterApproval(db, {
            masterKey,
            recordId: row.id,
            recordCode: row.record_code,
            recordName: row.record_name,
            submittedBy: '1',
          });
          if (result?.action === 'inserted') {
            perKey.inserted += 1;
            summary.masters.inserted += 1;
          }
          if (result?.action === 'updated') {
            perKey.updated += 1;
            summary.masters.updated += 1;
          }
        } catch (err) {
          perKey.errors += 1;
          summary.masters.errors += 1;
          console.warn(`[approvalsBackfill] ${masterKey}:${row.id} failed:`, err?.message || err);
        }
      }
    } catch (err) {
      // Whole-master failure. ER_BAD_DB_ERROR / ER_NO_SUCH_TABLE on a dev
      // DB that hasn't been fully seeded — log once, treat as a skip
      // (don't bump errors).
      const code = err?.code;
      if (SILENT_SKIP_ERRORS.has(code)) {
        console.warn(
          `[approvalsBackfill] master ${masterKey} skipped (${code}): ${err?.sqlMessage || err?.message}`
        );
      } else {
        perKey.errors += 1;
        summary.masters.errors += 1;
        console.warn(`[approvalsBackfill] master ${masterKey} skipped:`, err?.message || err);
      }
    }
  }

  // ── Step B — Invoices backfill ──────────────────────────────────────────
  // Routed through the caller's `ensureInvoice` helper to avoid a circular
  // import. Same lifecycle/status filter as the standalone helper.
  try {
    const [invoiceRows] = await db.execute(
      `SELECT i.id, i.validated_by, i.lifecycle_state, i.status
         FROM invoices i
        WHERE (
          i.lifecycle_state IN ('Under Verification', 'Pending Approval', 'pending_approval', 'Submitted')
          OR LOWER(COALESCE(i.status, '')) IN
             ('pending_approval', 'pending approval', 'pending', 'submitted', 'in review')
        )
        AND LOWER(COALESCE(i.status, '')) NOT IN ('approved', 'rejected', 'cancelled')
        AND NOT EXISTS (
          SELECT 1 FROM approvals a
          WHERE a.reference_id = i.id
            AND a.module IN ('ap_invoice', 'non_po_invoice')
            AND a.status = 'pending'
        )`
    );
    if (typeof opts.ensureInvoice === 'function') {
      for (const row of invoiceRows || []) {
        summary.invoices.scanned += 1;
        try {
          const result = await opts.ensureInvoice(row.id, row.validated_by || '1');
          if (result?.action === 'inserted') summary.invoices.inserted += 1;
          if (result?.action === 'updated') summary.invoices.updated += 1;
        } catch (err) {
          summary.invoices.errors += 1;
          console.warn(`[approvalsBackfill] invoice ${row.id} failed:`, err?.message || err);
        }
      }
    }
  } catch (err) {
    console.warn('[approvalsBackfill] invoices sweep skipped:', err?.message || err);
  }

  return summary;
}

export function startApprovalSyncLoop(db, approverId = '1', intervalMs = SYNC_DEBOUNCE_MS) {
  if (syncLoopHandle) return syncLoopHandle;
  triggerApprovalSync(db, approverId);
  syncLoopHandle = setInterval(() => {
    triggerApprovalSync(db, approverId);
  }, intervalMs);
  return syncLoopHandle;
}

function calculatePriorityFromRow(approval) {
  let priority = 'normal';
  let reason = approval.priority_reason ?? null;

  const now = new Date();
  const submittedAt = toDate(approval.created_at) || now;
  const ageHours = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);
  const slaHours = Number(approval.sla_hours ?? DEFAULT_SLA_HOURS);
  const escalationHours = Number(approval.escalation_hours ?? DEFAULT_ESCALATION_HOURS);

  if (ageHours > slaHours) {
    priority = 'critical';
    reason = `SLA breached — ${Math.round(ageHours - slaHours)}h overdue`;
  } else if (ageHours > escalationHours) {
    priority = 'high';
    reason = `SLA breach in ${Math.max(0, Math.round(slaHours - ageHours))}h`;
  }

  if (approval.msme_category && approval.msme_45day_deadline) {
    const deadline = toDate(approval.msme_45day_deadline);
    if (deadline) {
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 15 && priority !== 'critical') {
        priority = 'critical';
        reason = `MSME 45-day deadline: ${daysRemaining} days remaining`;
      }
    }
  }

  return { priority, reason };
}

export async function calculatePriority(approval, db) {
  let priority = 'normal';
  let reason = null;

  const now = new Date();
  const submittedAt = toDate(approval.created_at) || now;
  const ageHours = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);

  const [slaRows] = await db.execute(
    `SELECT * FROM approval_sla_config
     WHERE module = ? AND is_active = 1
     LIMIT 1`,
    [approval.module]
  );
  const slaConfig = slaRows?.[0];
  const slaHours = Number(slaConfig?.sla_hours ?? DEFAULT_SLA_HOURS);
  const escalationHours = Number(slaConfig?.escalation_hours ?? DEFAULT_ESCALATION_HOURS);

  if (ageHours > slaHours) {
    priority = 'critical';
    reason = `SLA breached — ${Math.round(ageHours - slaHours)}h overdue`;
    await db.execute(
      `UPDATE approvals SET
       sla_breached = 1,
       sla_breached_at = COALESCE(sla_breached_at, NOW()),
       approval_priority = 'critical',
       priority_reason = ?
       WHERE id = ?`,
      [reason, approval.id]
    );
  } else if (ageHours > escalationHours) {
    priority = 'high';
    reason = `SLA breach in ${Math.max(0, Math.round(slaHours - ageHours))}h`;
  }

  if (approval.msme_category && approval.msme_45day_deadline) {
    const deadline = toDate(approval.msme_45day_deadline);
    if (deadline) {
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 15 && priority !== 'critical') {
        priority = 'critical';
        reason = `MSME 45-day deadline: ${daysRemaining} days remaining`;
      }
    }
  }

  return { priority, reason };
}

export function getMSMEDeadlineInfo(invoice, vendor) {
  if (!vendor?.msme_category || !invoice?.invoice_date) return null;

  const invoiceDate = toDate(invoice.invoice_date);
  if (!invoiceDate) return null;
  const deadline = new Date(invoiceDate);
  deadline.setDate(deadline.getDate() + 45);

  const now = new Date();
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysUsed = 45 - daysRemaining;
  const percentUsed = Math.min(100, Math.max(0, Math.round((daysUsed / 45) * 100)));

  return {
    invoice_date: invoiceDate.toISOString(),
    deadline_date: deadline.toISOString(),
    days_remaining: daysRemaining,
    days_used: daysUsed,
    percent_used: percentUsed,
    is_overdue: daysRemaining < 0,
    is_critical: daysRemaining <= 7,
    is_warning: daysRemaining <= 15,
    msme_category: vendor.msme_category,
    legal_note:
      'MSMED Act 2006 — payment beyond 45 days attracts compound interest at 3× bank rate',
  };
}

export async function getApprovalQueue(approverId, filters, db) {
  const whereParts = ["(a.assigned_to = ? OR a.assigned_to = '1')", "a.status = 'pending'"];
  const params = [approverId];
  if (filters?.module) {
    // AP Invoices tab in the UI groups both `ap_invoice` (PO-matched) and
    // `non_po_invoice` modules under one filter. Expand the WHERE so a
    // single ?module=ap_invoice query returns both. Other modules are
    // matched exactly.
    if (filters.module === 'ap_invoice') {
      whereParts.push('a.module IN (?, ?)');
      params.push('ap_invoice', 'non_po_invoice');
    } else {
      whereParts.push('a.module = ?');
      params.push(filters.module);
    }
  }
  if (filters?.priority) {
    whereParts.push('COALESCE(a.approval_priority, "normal") = ?');
    params.push(filters.priority);
  }

  const limit = Number.isFinite(Number(filters?.limit)) ? Number(filters?.limit) : 100;
  const page = Math.max(1, Number(filters?.page ?? 1));
  const offset = (page - 1) * limit;

  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const safeOffset = Math.max(0, Math.trunc(offset));
  const queryParams = [...params];

  const [rows] = await db.execute(
    `SELECT
      a.*,
      i.invoice_number,
      i.invoice_date,
      i.total_amount AS invoice_amount,
      i.currency,
      i.vendor_name,
      i.vendor_gstin,
      i.entity_id,
      i.msme_45day_deadline,
      i.is_msme_vendor,
      i.msme_category AS invoice_msme_category,
      po.po_number,
      po.total_amount AS po_amount,
      po.vendor_name AS po_vendor_name,
      po.entity_id AS po_entity_id,
      COALESCE(i.vendor_name, po.vendor_name) AS vendor_legal_name,
      NULL AS vendor_id,
      NULL AS vendor_code,
      COALESCE(i.msme_category, NULL) AS msme_category,
      e.record_name AS entity_name,
      TIMESTAMPDIFF(HOUR, a.created_at, NOW()) AS age_hours,
      TIMESTAMPDIFF(MINUTE, a.created_at, NOW()) AS age_minutes,
      COALESCE(sla.sla_hours, ${DEFAULT_SLA_HOURS}) AS sla_hours,
      COALESCE(sla.escalation_hours, ${DEFAULT_ESCALATION_HOURS}) AS escalation_hours,
      (COALESCE(sla.sla_hours, ${DEFAULT_SLA_HOURS}) - TIMESTAMPDIFF(HOUR, a.created_at, NOW())) AS sla_hours_remaining
    FROM approvals a
    LEFT JOIN invoices i
      ON a.reference_id = i.id
      AND a.module IN ('ap_invoice', 'non_po_invoice')
    LEFT JOIN purchase_orders po
      ON a.reference_id = po.id
      AND a.module = 'purchase_order'
    LEFT JOIN erp_master_entities e
      ON COALESCE(i.entity_id, po.entity_id) = e.id
    LEFT JOIN approval_sla_config sla
      ON a.module = sla.module AND sla.is_active = 1
    WHERE ${whereParts.join(' AND ')}
    ORDER BY
      CASE
        WHEN COALESCE(i.is_msme_vendor, 0) = 1
          AND DATEDIFF(DATE_ADD(i.invoice_date, INTERVAL 45 DAY), NOW()) <= 15 THEN 1
        WHEN a.sla_breached = 1 THEN 2
        WHEN TIMESTAMPDIFF(HOUR, a.created_at, NOW()) > COALESCE(sla.escalation_hours, ${DEFAULT_ESCALATION_HOURS}) THEN 3
        ELSE 4
      END ASC,
      a.created_at ASC
    LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    queryParams
  );

  return rows.map((row) => {
    const { priority, reason } = calculatePriorityFromRow(row);
    const msmeCategory = row.msme_category || row.invoice_msme_category || null;
    const msmeInfo = msmeCategory
      ? getMSMEDeadlineInfo({ invoice_date: row.invoice_date }, { msme_category: msmeCategory })
      : null;

    const slaHours = Number(row.sla_hours ?? DEFAULT_SLA_HOURS);
    const ageHours = Number(row.age_hours ?? 0);
    const hoursRemaining = Number(row.sla_hours_remaining ?? slaHours);

    return {
      ...row,
      priority,
      priority_reason: reason ?? row.priority_reason ?? null,
      vendor_legal_name: row.vendor_legal_name || row.vendor_name || row.po_vendor_name || null,
      display_amount: Number(row.invoice_amount ?? row.po_amount ?? 0),
      msme_info: msmeInfo,
      sla_info: {
        sla_hours: slaHours,
        age_hours: ageHours,
        hours_remaining: hoursRemaining,
        percent_used: Math.min(100, Math.round((ageHours / Math.max(1, slaHours)) * 100)),
        breached: Boolean(row.sla_breached),
        breach_in_hours: hoursRemaining,
      },
    };
  });
}

export async function getApprovalKPIs(approverId, year, db) {
  const yearStart = `${year}-01-01`;
  const nextYearStart = `${year + 1}-01-01`;
  const [ytdRows] = await db.execute(
    `SELECT
      COUNT(*) AS total_approvals,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN sla_breached = 0 AND status <> 'pending' THEN 1 ELSE 0 END) AS on_time,
      AVG(CASE WHEN completed_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) ELSE NULL END) AS avg_minutes,
      COUNT(DISTINCT MONTH(created_at)) AS active_months
    FROM approvals
    WHERE (assigned_to = ? OR assigned_to = '1')
      AND created_at >= ?
      AND created_at < ?
      AND status <> 'pending'`,
    [approverId, yearStart, nextYearStart]
  );

  const [valueRows] = await db.execute(
    `SELECT COALESCE(SUM(COALESCE(i.total_amount, 0) + COALESCE(po.total_amount, 0)), 0) AS total_value
     FROM approvals a
     LEFT JOIN invoices i ON a.reference_id = i.id AND a.module IN ('ap_invoice', 'non_po_invoice')
     LEFT JOIN purchase_orders po ON a.reference_id = po.id AND a.module = 'purchase_order'
     WHERE (a.assigned_to = ? OR a.assigned_to = '1')
       AND a.created_at >= ?
       AND a.created_at < ?
       AND a.status = 'approved'`,
    [approverId, yearStart, nextYearStart]
  );

  const [pendingRows] = await db.execute(
    `SELECT
      COUNT(DISTINCT a.id) AS total_pending,
      SUM(CASE WHEN a.sla_breached = 1 THEN 1 ELSE 0 END) AS sla_breached,
      SUM(CASE WHEN TIMESTAMPDIFF(HOUR, a.created_at, NOW()) > COALESCE(sla.escalation_hours, ?) THEN 1 ELSE 0 END) AS aging,
      COALESCE(SUM(COALESCE(i.total_amount, 0) + COALESCE(po.total_amount, 0)), 0) AS pending_value,
      SUM(CASE WHEN COALESCE(i.is_msme_vendor, 0) = 1 OR COALESCE(i.msme_category, '') <> '' THEN 1 ELSE 0 END) AS msme_count,
      SUM(CASE
        WHEN i.invoice_date IS NOT NULL
          AND DATE_ADD(i.invoice_date, INTERVAL 45 DAY) <= DATE_ADD(NOW(), INTERVAL 15 DAY)
          AND (COALESCE(i.is_msme_vendor, 0) = 1 OR COALESCE(i.msme_category, '') <> '')
        THEN 1 ELSE 0 END) AS msme_deadline_alert_count
    FROM approvals a
    LEFT JOIN invoices i ON a.reference_id = i.id AND a.module IN ('ap_invoice', 'non_po_invoice')
    LEFT JOIN purchase_orders po ON a.reference_id = po.id AND a.module = 'purchase_order'
    LEFT JOIN approval_sla_config sla ON a.module = sla.module
    WHERE (a.assigned_to = ? OR a.assigned_to = '1')
      AND a.status = 'pending'`,
    [DEFAULT_ESCALATION_HOURS, approverId]
  );

  const [teamRows] = await db.execute(
    `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) AS team_avg
     FROM approvals
     WHERE created_at >= ?
       AND created_at < ?
       AND status <> 'pending'
       AND completed_at IS NOT NULL`,
    [yearStart, nextYearStart]
  );

  const stats = ytdRows[0] ?? {};
  const pending = pendingRows[0] ?? {};
  const avgMinutes = Number(stats.avg_minutes ?? 0);
  const teamAvgMinutes = Number(teamRows?.[0]?.team_avg ?? 0);
  const fasterPercent =
    teamAvgMinutes > 0 ? Math.round(((teamAvgMinutes - avgMinutes) / teamAvgMinutes) * 100) : 0;

  return {
    total_approvals_ytd: Number(stats.total_approvals ?? 0),
    on_time_rate:
      Number(stats.total_approvals ?? 0) > 0
        ? Math.round((Number(stats.on_time ?? 0) / Number(stats.total_approvals)) * 100)
        : 0,
    on_time_count: Number(stats.on_time ?? 0),
    avg_hours_per_approval: Math.round((avgMinutes / 60) * 10) / 10,
    faster_than_team_percent: fasterPercent,
    total_rejections: Number(stats.rejected ?? 0),
    rejection_rate:
      Number(stats.total_approvals ?? 0) > 0
        ? Math.round((Number(stats.rejected ?? 0) / Number(stats.total_approvals)) * 100)
        : 0,
    total_value_approved: Number(valueRows?.[0]?.total_value ?? 0),
    avg_approvals_per_month:
      Number(stats.active_months ?? 0) > 0
        ? Math.round(Number(stats.total_approvals ?? 0) / Number(stats.active_months))
        : 0,
    total_pending: Number(pending.total_pending ?? 0),
    sla_breached_count: Number(pending.sla_breached ?? 0),
    aging_count: Number(pending.aging ?? 0),
    pending_value: Number(pending.pending_value ?? 0),
    approved_today: 0,
    msme_pending_count: Number(pending.msme_count ?? 0),
    msme_deadline_alerts: Number(pending.msme_deadline_alert_count ?? 0),
  };
}

export async function getModuleCounts(approverId, db) {
  const [rows] = await db.execute(
    `SELECT module, COUNT(*) AS cnt
     FROM approvals
     WHERE (assigned_to = ? OR assigned_to = '1') AND status = 'pending'
     GROUP BY module`,
    [approverId]
  );
  const counts = {};
  for (const row of rows) {
    counts[row.module] = Number(row.cnt);
  }
  return {
    all: rows.reduce((sum, row) => sum + Number(row.cnt), 0),
    ap_invoice: counts.ap_invoice || 0,
    non_po_invoice: counts.non_po_invoice || 0,
    purchase_order: counts.purchase_order || 0,
    payment: counts.payment || 0,
    master_update: counts.master_update || 0,
    vendor_onboarding: counts.vendor_onboarding || 0,
    vendor_advance: counts.vendor_advance || 0,
  };
}

/**
 * Step advancement (PART 7). Called inside the approve/reject transactions.
 *
 *   approved + more steps remain  → promote step N+1 from pending_predecessor
 *                                    to pending; notify its approver.
 *   approved + final step        → notify the submitter that everything is done.
 *   rejected                     → cancel every pending_predecessor row for
 *                                    the same parent + notify the submitter.
 */
async function triggerNextWorkflowStep(approval, action, conn) {
  try {
    if (action === 'approved') {
      const totalSteps = Number(approval.total_steps) || 1;
      const currentStep = Number(approval.step_number) || 1;
      const parentId = approval.parent_approval_id || approval.id;

      if (currentStep >= totalSteps) {
        // Final approval reached. Submitter notification fires post-commit.
        return;
      }

      const nextStepNumber = currentStep + 1;
      const [nextRows] = await conn.execute(
        `SELECT id, assigned_to, document_ref, document_name, module, token
           FROM approvals
          WHERE (parent_approval_id = ? OR id = ?)
            AND reference_id = ?
            AND step_number = ?
            AND status = 'pending_predecessor'
          LIMIT 1`,
        [parentId, parentId, approval.reference_id, nextStepNumber]
      );
      const next = nextRows?.[0];
      if (!next) return;

      await conn.execute(
        `UPDATE approvals
            SET status = 'pending',
                token_expires_at = DATE_ADD(NOW(), INTERVAL 72 HOUR)
          WHERE id = ?`,
        [next.id]
      );
    } else if (action === 'rejected') {
      const parentId = approval.parent_approval_id || approval.id;
      await conn.execute(
        `UPDATE approvals
            SET status = 'cancelled',
                completed_at = NOW()
          WHERE (parent_approval_id = ? OR id = ?)
            AND reference_id = ?
            AND status = 'pending_predecessor'`,
        [parentId, parentId, approval.reference_id]
      );
    }
  } catch (err) {
    console.error('[Approvals] triggerNextWorkflowStep failed:', err.message);
  }
  await conn
    .execute(
      `INSERT INTO agent_run_logs (id, agent_name, status, input_json, output_json, run_at)
     VALUES (?, 'approval_workflow', 'completed', CAST(? AS JSON), CAST(? AS JSON), NOW())`,
      [
        randomUUID(),
        JSON.stringify({ approval_id: approval.id, action }),
        JSON.stringify({ success: true }),
      ]
    )
    .catch(() => undefined);
}

/**
 * Post-commit notifier. Reads the freshest approval row (or parent) to
 * decide whether to notify the next approver, the submitter on full
 * completion, or the submitter on rejection.
 */
async function sendApprovalNotification(approval, action) {
  if (!approval) return;
  const tenantId = approval.tenant_id || 'tenant-default-001';
  const [
    { getMysqlPool },
    {
      sendApprovalRequestNotification,
      sendApprovalCompleteNotification,
      sendRejectionNotification,
    },
  ] = await Promise.all([
    import('../../mysql.mjs'),
    import('../notifications/notificationService.mjs'),
  ]);
  const db = getMysqlPool();
  const totalSteps = Number(approval.total_steps) || 1;
  const currentStep = Number(approval.step_number) || 1;
  const parentId = approval.parent_approval_id || approval.id;

  try {
    if (action === 'approved' && currentStep < totalSteps) {
      const [nextRows] = await db.execute(
        `SELECT id, assigned_to, document_ref, document_name, module, token
           FROM approvals
          WHERE (parent_approval_id = ? OR id = ?)
            AND reference_id = ?
            AND step_number = ?
            AND status = 'pending'
          LIMIT 1`,
        [parentId, parentId, approval.reference_id, currentStep + 1]
      );
      const next = nextRows?.[0];
      if (next) {
        await sendApprovalRequestNotification({
          approverUserId: next.assigned_to,
          documentType: next.module,
          documentRef: next.document_ref,
          documentName: next.document_name,
          amount: null,
          submittedByName: 'Workflow advanced',
          approvalId: next.id,
          token: next.token,
          tenantId,
          db,
        });
      }
    } else if (action === 'approved' && currentStep >= totalSteps) {
      await sendApprovalCompleteNotification({
        submittedByUserId: approval.submitted_by,
        tenantId,
        documentRef: approval.document_ref,
        documentName: approval.document_name,
        db,
      });
    } else if (action === 'rejected') {
      await sendRejectionNotification({
        submittedByUserId: approval.submitted_by,
        tenantId,
        documentRef: approval.document_ref,
        documentName: approval.document_name,
        remarks: approval.rejection_remarks || approval.reason || null,
        db,
      });
    }
  } catch (err) {
    console.error('[Approvals] sendApprovalNotification failed:', err.message);
  }
}

export async function approveItem(approvalId, approverId, comments, db) {
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const [result] = await conn.execute(
      `UPDATE approvals SET
        status = 'approved',
        approved_by = ?,
        approved_at = NOW(),
        completed_at = NOW(),
        comments = COALESCE(?, comments)
      WHERE id = ? AND (assigned_to = ? OR assigned_to = '1') AND status = 'pending'`,
      [approverId, comments || null, approvalId, approverId]
    );
    if (result.affectedRows === 0) {
      throw new Error('Approval not found or already processed');
    }

    const [approvalRows] = await conn.execute('SELECT * FROM approvals WHERE id = ?', [approvalId]);
    const approval = approvalRows?.[0];
    if (!approval) throw new Error('Approval not found');
    await syncMasterSourceApprovalStatus(conn, approval, 'Approved');

    await triggerNextWorkflowStep(approval, 'approved', conn);
    await conn.commit();
    await sendApprovalNotification(approval, 'approved');
    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function rejectItem(approvalId, approverId, reason, db) {
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const [result] = await conn.execute(
      `UPDATE approvals SET
        status = 'rejected',
        rejected_by = ?,
        rejected_at = NOW(),
        completed_at = NOW(),
        reason = ?,
        rejection_remarks = ?
      WHERE id = ? AND (assigned_to = ? OR assigned_to = '1') AND status = 'pending'`,
      [approverId, reason, reason, approvalId, approverId]
    );
    if (result.affectedRows === 0) {
      throw new Error('Approval not found or already processed');
    }

    const [approvalRows] = await conn.execute('SELECT * FROM approvals WHERE id = ?', [approvalId]);
    const approval = approvalRows?.[0];
    if (approval) {
      await syncMasterSourceApprovalStatus(conn, approval, 'Rejected');
      await triggerNextWorkflowStep(approval, 'rejected', conn);
    }
    await conn.commit();
    if (approval) {
      await sendApprovalNotification(approval, 'rejected');
    }
    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function bulkApprove(approvalIds, approverId, db, comments = 'Bulk approved') {
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    for (const id of approvalIds) {
      const [result] = await conn.execute(
        `UPDATE approvals SET
          status = 'approved',
          approved_by = ?,
          approved_at = NOW(),
          completed_at = NOW(),
          comments = COALESCE(?, comments)
        WHERE id = ? AND (assigned_to = ? OR assigned_to = '1') AND status = 'pending'`,
        [approverId, comments, id, approverId]
      );
      if (result.affectedRows === 0) {
        throw new Error(`Approval ${id} not found or already processed`);
      }

      const [approvalRows] = await conn.execute('SELECT * FROM approvals WHERE id = ?', [id]);
      const approval = approvalRows?.[0];
      if (approval) {
        await syncMasterSourceApprovalStatus(conn, approval, 'Approved');
      }
    }
    await conn.commit();
    return { success: true, count: approvalIds.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getApprovalDetail(approvalId, approverId, db) {
  const [rows] = await db.execute(
    `SELECT a.*, i.invoice_number, i.invoice_date, i.total_amount AS invoice_amount, i.currency,
      i.vendor_name, po.po_number, po.total_amount AS po_amount, po.vendor_name AS po_vendor_name
    FROM approvals a
    LEFT JOIN invoices i ON a.reference_id = i.id AND a.module IN ('ap_invoice', 'non_po_invoice')
    LEFT JOIN purchase_orders po ON a.reference_id = po.id AND a.module = 'purchase_order'
    WHERE a.id = ? AND (a.assigned_to = ? OR a.assigned_to = '1')
    LIMIT 1`,
    [approvalId, approverId]
  );
  return rows?.[0] ?? null;
}

export async function askForInfo(approvalId, approverId, comment, db) {
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const [result] = await conn.execute(
      `UPDATE approvals SET
        comments = ?,
        updated_at = NOW()
      WHERE id = ? AND (assigned_to = ? OR assigned_to = '1') AND status = 'pending'`,
      [comment, approvalId, approverId]
    );
    if (result.affectedRows === 0) {
      throw new Error('Approval not found or already processed');
    }
    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getMSMEAlerts(approverId, db) {
  const queue = await getApprovalQueue(
    approverId,
    { module: 'ap_invoice', limit: 500, page: 1 },
    db
  );
  return queue.filter((item) => item.msme_info?.is_critical || item.msme_info?.is_warning);
}
