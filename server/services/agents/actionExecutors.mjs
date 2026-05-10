/**
 * Action Executors — each function performs an action after agent validation.
 */

import { randomUUID } from 'node:crypto';

const SAFE_TABLE_RE = /^[A-Za-z0-9_]+$/;

function sanitizeIdentifier(name) {
  if (!SAFE_TABLE_RE.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return name;
}

// ─── Create Record ───────────────────────────────────────────────
export async function executeCreateRecord(queryFn, data, mapping, table) {
  const safeTable = sanitizeIdentifier(table);
  const id = randomUUID();

  // mapping: { dbColumn: dataField, ... }
  const columns = ['id'];
  const placeholders = ['?'];
  const values = [id];

  if (mapping && typeof mapping === 'object') {
    for (const [col, field] of Object.entries(mapping)) {
      columns.push(sanitizeIdentifier(col));
      placeholders.push('?');
      values.push(data[field] ?? null);
    }
  }

  const sql = `INSERT INTO ${safeTable} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
  await queryFn(sql, values);
  return { success: true, id };
}

// ─── Link Entity ────────────────────────────────────────────────
export async function executeLinkEntity(queryFn, recordId, entityId, linkTable) {
  const safeTable = sanitizeIdentifier(linkTable);
  const id = randomUUID();

  await queryFn(
    `INSERT INTO ${safeTable} (id, record_id, entity_id, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [id, recordId, entityId]
  );
  return { success: true, id };
}

// ─── Trigger Approval ───────────────────────────────────────────
export async function executeTriggerApproval(queryFn, recordId, routingLogic, agentId) {
  const logId = randomUUID();

  await queryFn(
    `INSERT INTO p2p_schema_mt.agent_run_logs (id, agent_id, trigger_data, results, accuracy_score, touchless, duration_ms)
     VALUES (?, ?, ?, ?, 0, FALSE, 0)`,
    [
      logId,
      agentId,
      JSON.stringify({ recordId, action: 'trigger_approval' }),
      JSON.stringify({ routingLogic, status: 'approval_triggered' }),
    ]
  );

  return { success: true, logId, routingLogic };
}

// ─── Send Notification (log only for v1) ────────────────────────
export async function executeSendNotification(recipients, template, data) {
  console.log('[Agent Notification] Recipients:', recipients);
  console.log('[Agent Notification] Template:', template);
  console.log('[Agent Notification] Data:', JSON.stringify(data).slice(0, 500));
  return { success: true, message: 'Notification logged (email not wired in v1)', recipients };
}

// ─── Create Exception ───────────────────────────────────────────
export async function executeCreateException(queryFn, recordId, type, severity, detail) {
  const id = randomUUID();

  await queryFn(
    `INSERT INTO p2p_schema_mt.agent_run_logs (id, agent_id, trigger_data, results, accuracy_score, touchless, duration_ms)
     VALUES (?, ?, ?, ?, 0, FALSE, 0)`,
    [
      id,
      recordId,
      JSON.stringify({ action: 'create_exception', type }),
      JSON.stringify({ severity, detail, status: 'exception_created' }),
    ]
  );

  return { success: true, id, type, severity };
}

// ─── Webhook ─────────────────────────────────────────────────────
export async function executeWebhook(url, payload, headers = {}) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const status = response.status;
    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    return { success: status >= 200 && status < 300, status, body };
  } catch (err) {
    return { success: false, error: `Webhook failed: ${err.message}` };
  }
}
