import { randomUUID } from 'node:crypto';
import { getGenericMasterKeys, getQualifiedTableName } from '../../masterStorage.mjs';
import { LIFECYCLE_STATES } from '../invoices/lifecycleMapping.mjs';

const DEFAULT_SLA_HOURS = 48;
const DEFAULT_ESCALATION_HOURS = 36;
const PENDING_MASTER_STATUSES = ['pending approval', 'pending_approval', 'pending', 'draft', 'changes requested'];
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
  if (!approval || approval.module !== 'master_update') return;
  const parsed = parseMasterReference(approval.reference_id);
  if (!parsed) return;
  const tableName = getQualifiedTableName(parsed.masterKey);
  if (!tableName) return;

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
      COALESCE(NULLIF(i.entity_id, ''), ?, '1'),
      COALESCE(NULLIF(i.entity_id, ''), ?, '1'),
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
    [LIFECYCLE_STATES.UNDER_VERIFICATION, approverId, approverId]
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
  for (const masterKey of masterKeys) {
    const tableName = getQualifiedTableName(masterKey);
    if (!tableName) continue;

    await db.execute(
      `UPDATE ${tableName} m
       JOIN (
         SELECT a.reference_id, a.status
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
       WHERE LOWER(COALESCE(m.approval_status, '')) NOT IN ('approved', 'rejected')`,
      [masterKey, masterKey, masterKey]
    );
  }

  for (const masterKey of masterKeys) {
    const tableName = getQualifiedTableName(masterKey);
    if (!tableName) continue;

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
  }

  // Normalize legacy master approvals to shared queue visibility.
  await db.execute(
    `UPDATE approvals
     SET assigned_to = '1'
     WHERE module = 'master_update'
       AND status = 'pending'
       AND COALESCE(assigned_to, '') <> '1'`
  );

  // 4) Auto-close stale pending approvals whose source is no longer pending.
  await db.execute(
    `UPDATE approvals a
     LEFT JOIN invoices i ON a.reference_id = i.id AND a.module IN ('ap_invoice', 'non_po_invoice')
     SET a.status = 'approved',
         a.completed_at = COALESCE(a.completed_at, NOW()),
         a.approved_at = COALESCE(a.approved_at, NOW())
     WHERE a.status = 'pending'
       AND a.module IN ('ap_invoice', 'non_po_invoice')
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

async function ensurePendingApprovalsSynced(db, approverId = '1') {
  const now = Date.now();
  if (pendingSyncPromise) {
    await pendingSyncPromise;
    return;
  }

  if (now - lastSyncAt < SYNC_DEBOUNCE_MS) {
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
    legal_note: 'MSMED Act 2006 — payment beyond 45 days attracts compound interest at 3× bank rate',
  };
}

export async function getApprovalQueue(approverId, filters, db) {
  const whereParts = ["(a.assigned_to = ? OR a.assigned_to = '1')", "a.status = 'pending'"];
  const params = [approverId];
  if (filters?.module) {
    whereParts.push('a.module = ?');
    params.push(filters.module);
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
  const fasterPercent = teamAvgMinutes > 0 ? Math.round(((teamAvgMinutes - avgMinutes) / teamAvgMinutes) * 100) : 0;

  return {
    total_approvals_ytd: Number(stats.total_approvals ?? 0),
    on_time_rate: Number(stats.total_approvals ?? 0) > 0 ? Math.round((Number(stats.on_time ?? 0) / Number(stats.total_approvals)) * 100) : 0,
    on_time_count: Number(stats.on_time ?? 0),
    avg_hours_per_approval: Math.round((avgMinutes / 60) * 10) / 10,
    faster_than_team_percent: fasterPercent,
    total_rejections: Number(stats.rejected ?? 0),
    rejection_rate: Number(stats.total_approvals ?? 0) > 0 ? Math.round((Number(stats.rejected ?? 0) / Number(stats.total_approvals)) * 100) : 0,
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

async function triggerNextWorkflowStep(approval, action, conn) {
  await conn.execute(
    `INSERT INTO agent_run_logs (id, agent_name, status, input_json, output_json, run_at)
     VALUES (?, 'approval_workflow', 'completed', CAST(? AS JSON), CAST(? AS JSON), NOW())`,
    [
      randomUUID(),
      JSON.stringify({ approval_id: approval.id, action }),
      JSON.stringify({ success: true }),
    ]
  ).catch(() => undefined);
}

async function sendApprovalNotification(approval, action) {
  console.log(`[Approvals] Notification: ${action} for approval ${approval.id}`);
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
        reason = ?
      WHERE id = ? AND (assigned_to = ? OR assigned_to = '1') AND status = 'pending'`,
      [approverId, reason, approvalId, approverId]
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

export async function getMSMEAlerts(approverId, db) {
  const queue = await getApprovalQueue(approverId, { module: 'ap_invoice', limit: 500, page: 1 }, db);
  return queue.filter((item) => item.msme_info?.is_critical || item.msme_info?.is_warning);
}
