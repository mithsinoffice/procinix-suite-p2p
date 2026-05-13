/**
 * Workflow Engine HTTP routes (PART 2, 8, 10 of the engine build).
 *
 * Per CLAUDE.md "No inline routes in server/index.mjs". Wired into the
 * dispatcher chain in index.mjs alongside the other domain handlers.
 *
 *   GET   /api/workflow/fields?documentType=&tenantId=
 *   POST  /api/workflow/configurations/:id/clone
 *   GET   /api/approvals/action?token=&action=approve|reject
 *   GET   /api/approvals/reject-remarks?token=
 *   POST  /api/approvals/reject-with-remarks
 *   GET   /api/notifications/unread-count?userId=&tenantId=
 */

import { randomUUID } from 'node:crypto';
import { query, getMysqlPool, getConnection } from '../mysql.mjs';
import { approveItem, rejectItem } from '../services/approvals/approvalService.mjs';

// ── 5-minute in-memory cache for /api/workflow/fields ──────────────────────
const FIELDS_CACHE_TTL_MS = 5 * 60 * 1000;
const fieldsCache = new Map(); // key: `${tenantId}::${documentType}` → { at, payload }

function readTenant(req, url) {
  return req.headers['x-tenant-id'] || url.searchParams.get('tenantId') || 'tenant-default-001';
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

async function hydrateOptions(field) {
  if (!field.source_table || !field.source_column) return [];
  // Whitelist guard — only allow safe table/column identifiers (alnum + _).
  if (!/^[A-Za-z0-9_]+$/.test(field.source_table) || !/^[A-Za-z0-9_]+$/.test(field.source_column)) {
    return [];
  }
  try {
    const rows = await query(
      `SELECT DISTINCT \`${field.source_column}\` AS v FROM ${field.source_table}
        WHERE \`${field.source_column}\` IS NOT NULL
        ORDER BY \`${field.source_column}\` LIMIT 200`
    );
    return rows.map((r) => r.v).filter((v) => v != null && String(v).length > 0);
  } catch {
    // Master table missing on this DB — return empty options, the field is
    // still usable as a free-text condition.
    return [];
  }
}

export async function handleWorkflowsRoute(req, res, pathname, sendJson) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // ── GET /api/workflow/fields?documentType= ─────────────────────────────
  if (req.method === 'GET' && pathname === '/api/workflow/fields') {
    const tenantId = readTenant(req, url);
    const documentType = url.searchParams.get('documentType');
    if (!documentType) {
      sendJson(res, 400, { success: false, error: 'documentType required' });
      return true;
    }
    const cacheKey = `${tenantId}::${documentType}`;
    const hit = fieldsCache.get(cacheKey);
    if (hit && Date.now() - hit.at < FIELDS_CACHE_TTL_MS) {
      sendJson(res, 200, hit.payload);
      return true;
    }
    const rows = await query(
      `SELECT id, field_key, field_label, field_source, source_table, source_column, data_type
         FROM workflow_field_registry
        WHERE document_type = ?
          AND (tenant_id IS NULL OR tenant_id = ?)
        ORDER BY field_label`,
      [documentType, tenantId]
    );
    const fields = await Promise.all(
      rows.map(async (r) => ({
        key: r.field_key,
        label: r.field_label,
        dataType: r.data_type,
        source: r.field_source,
        options: await hydrateOptions(r),
      }))
    );
    const payload = { success: true, fields };
    fieldsCache.set(cacheKey, { at: Date.now(), payload });
    sendJson(res, 200, payload);
    return true;
  }

  // ── GET /api/workflow/configurations  — list all ───────────────────────
  if (req.method === 'GET' && pathname === '/api/workflow/configurations') {
    const rows = await query(
      `SELECT id, workflow_name AS workflowName, module_name AS module,
              description, trigger_event AS triggerEvent,
              conditions, steps, status, created_date AS createdDate,
              created_at AS createdAt, updated_at AS updatedAt
         FROM workflow_configurations
        ORDER BY updated_at DESC, created_at DESC`
    );
    const data = rows.map((row) => ({
      ...row,
      conditions:
        typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions || [],
      steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps || [],
    }));
    sendJson(res, 200, { success: true, data });
    return true;
  }

  // ── GET /api/workflow/configurations/:id  — single config ──────────────
  const getOneMatch = pathname.match(/^\/api\/workflow\/configurations\/([^/]+)$/);
  if (req.method === 'GET' && getOneMatch) {
    const id = getOneMatch[1];
    const rows = await query(
      `SELECT id, workflow_name AS workflowName, module_name AS module,
              description, trigger_event AS triggerEvent,
              conditions, steps, status, created_date AS createdDate,
              created_at AS createdAt, updated_at AS updatedAt
         FROM workflow_configurations WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) {
      sendJson(res, 404, { success: false, error: 'not_found' });
      return true;
    }
    const row = rows[0];
    const data = {
      ...row,
      conditions:
        typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions || [],
      steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps || [],
    };
    sendJson(res, 200, { success: true, data });
    return true;
  }

  // ── POST /api/workflow/configurations  — upsert single config ──────────
  if (req.method === 'POST' && pathname === '/api/workflow/configurations') {
    const body = await readJsonBody(req).catch(() => ({}));
    const id = body.id || randomUUID();
    const status = body.status === 'Active' ? 'Active' : 'Draft';
    const conditions = JSON.stringify(body.conditions ?? []);
    const steps = JSON.stringify(body.steps ?? []);
    await query(
      `INSERT INTO workflow_configurations
         (id, workflow_name, module_name, description, trigger_event,
          conditions, steps, status, created_date)
       VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, CURRENT_DATE)
       ON DUPLICATE KEY UPDATE
         workflow_name = VALUES(workflow_name),
         module_name = VALUES(module_name),
         description = VALUES(description),
         trigger_event = VALUES(trigger_event),
         conditions = VALUES(conditions),
         steps = VALUES(steps),
         status = VALUES(status),
         updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        body.workflowName ?? body.name ?? 'Untitled Workflow',
        body.module ?? body.documentType ?? '',
        body.description ?? '',
        body.triggerEvent ?? 'On Record Submission',
        conditions,
        steps,
        status,
      ]
    );
    sendJson(res, 200, { success: true, id });
    return true;
  }

  // ── PATCH /api/workflow/configurations/:id  — partial update (status toggle) ─
  const patchMatch = pathname.match(/^\/api\/workflow\/configurations\/([^/]+)$/);
  if (req.method === 'PATCH' && patchMatch) {
    const id = patchMatch[1];
    const body = await readJsonBody(req).catch(() => ({}));
    const fields = [];
    const params = [];
    if (typeof body.status === 'string') {
      fields.push('status = ?');
      params.push(body.status);
    }
    if (typeof body.workflowName === 'string') {
      fields.push('workflow_name = ?');
      params.push(body.workflowName);
    }
    if (typeof body.description === 'string') {
      fields.push('description = ?');
      params.push(body.description);
    }
    if (fields.length === 0) {
      sendJson(res, 400, { success: false, error: 'no_fields_to_update' });
      return true;
    }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    const result = await query(
      `UPDATE workflow_configurations SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    sendJson(res, 200, { success: true, affected: result.affectedRows ?? 0 });
    return true;
  }

  // ── DELETE /api/workflow/configurations/:id ─────────────────────────────
  if (req.method === 'DELETE' && patchMatch) {
    const id = patchMatch[1];
    const result = await query(`DELETE FROM workflow_configurations WHERE id = ?`, [id]);
    sendJson(res, 200, { success: true, affected: result.affectedRows ?? 0 });
    return true;
  }

  // ── POST /api/workflow/assistant — plain-English → workflow draft ───────
  // Best-effort: when ANTHROPIC_API_KEY is present, asks Claude to parse the
  // prompt into a `{ steps[], conditions[] }` draft. Without the key falls
  // back to a small deterministic keyword parser so dev environments and
  // smoke tests don't require the API.
  if (req.method === 'POST' && pathname === '/api/workflow/assistant') {
    const body = await readJsonBody(req).catch(() => ({}));
    const prompt = String(body.prompt || '').trim();
    if (!prompt) {
      sendJson(res, 400, { success: false, error: 'prompt required' });
      return true;
    }
    const documentType = String(body.documentType || 'ap_invoice');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const aiPrompt = `Parse this plain-English workflow description into a JSON object with two arrays: \`steps\` and \`conditions\`. Return ONLY a JSON object — no markdown fences, no commentary.

Schema:
{
  "steps": [
    { "stepNumber": 1, "approverRole": "Finance Manager", "isMandatory": true, "allowDelegation": false }
  ],
  "conditions": [
    { "field": "invoice_amount", "operator": "gt", "value": "50000", "logicalOp": "AND" }
  ]
}

Operators: gt, lt, gte, lte, eq, neq, contains, in, not_in.
Approver roles: pick from this list — Finance Manager, HOD, CFO, Procurement Head, Admin, Procurement Manager, Location Manager, PO Approver, Invoice Approver, Master Approver.

Document type: ${documentType}
Description:
"""
${prompt}
"""`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
            max_tokens: 1024,
            messages: [{ role: 'user', content: aiPrompt }],
          }),
        });
        if (!response.ok) {
          throw new Error(`Anthropic ${response.status}`);
        }
        const json = await response.json();
        let text = json?.content?.[0]?.text || '';
        text = text.trim();
        if (text.startsWith('```')) {
          text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const parsed = JSON.parse(text);
        sendJson(res, 200, {
          success: true,
          source: 'anthropic',
          steps: Array.isArray(parsed.steps) ? parsed.steps : [],
          conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
        });
        return true;
      } catch (err) {
        console.warn('[workflow assistant] Anthropic failed, using fallback:', err.message);
        // fall through to deterministic parser
      }
    }

    // Deterministic keyword parser. Catches the obvious patterns; everything
    // else gets a single default step the user can edit.
    const lower = prompt.toLowerCase();
    const steps = [];
    const conditions = [];
    const roleHints = [
      { keyword: 'finance manager', role: 'Finance Manager' },
      { keyword: 'hod', role: 'HOD' },
      { keyword: 'cfo', role: 'CFO' },
      { keyword: 'procurement head', role: 'Procurement Head' },
      { keyword: 'procurement manager', role: 'Procurement Manager' },
      { keyword: 'admin', role: 'Admin' },
      { keyword: 'location manager', role: 'Location Manager' },
      { keyword: 'po approver', role: 'PO Approver' },
    ];
    for (const hint of roleHints) {
      if (lower.includes(hint.keyword)) {
        steps.push({
          stepNumber: steps.length + 1,
          approverRole: hint.role,
          isMandatory: true,
          allowDelegation: false,
        });
      }
    }
    if (steps.length === 0) {
      steps.push({
        stepNumber: 1,
        approverRole: 'Finance Manager',
        isMandatory: true,
        allowDelegation: false,
      });
    }
    const amountMatch = lower.match(
      /(?:above|over|greater than|more than|exceeds?)\s*(?:rs\.?|₹|inr)?\s*([\d,]+)/
    );
    if (amountMatch) {
      conditions.push({
        field: 'invoice_amount',
        operator: 'gt',
        value: amountMatch[1].replace(/,/g, ''),
        logicalOp: 'AND',
      });
    }
    sendJson(res, 200, {
      success: true,
      source: apiKey ? 'fallback' : 'fallback_no_key',
      steps,
      conditions,
    });
    return true;
  }

  // ── GET /api/user-roles/distinct  — distinct role_names per tenant ──────
  if (req.method === 'GET' && pathname === '/api/user-roles/distinct') {
    const tenantId = readTenant(req, url);
    const rows = await query(
      `SELECT DISTINCT role_name FROM user_roles WHERE tenant_id = ? ORDER BY role_name`,
      [tenantId]
    );
    sendJson(res, 200, { success: true, roles: rows.map((r) => r.role_name) });
    return true;
  }

  // ── GET /api/user-roles?role=  — users mapped to a given role ───────────
  if (req.method === 'GET' && pathname === '/api/user-roles') {
    const tenantId = readTenant(req, url);
    const role = url.searchParams.get('role') || '';
    if (!role) {
      sendJson(res, 400, { success: false, error: 'role query param required' });
      return true;
    }
    const rows = await query(
      `SELECT ur.user_id,
              JSON_UNQUOTE(JSON_EXTRACT(u.payload, '$.email')) AS email,
              u.record_name AS name
         FROM user_roles ur
         LEFT JOIN erp_master_users u ON u.id = ur.user_id
        WHERE ur.tenant_id = ? AND LOWER(ur.role_name) = LOWER(?)
        ORDER BY ur.is_primary DESC, u.record_name`,
      [tenantId, role]
    );
    sendJson(res, 200, { success: true, users: rows });
    return true;
  }

  // ── POST /api/workflow/configurations/:id/clone ────────────────────────
  const cloneMatch = pathname.match(/^\/api\/workflow\/configurations\/([^/]+)\/clone$/);
  if (req.method === 'POST' && cloneMatch) {
    const sourceId = cloneMatch[1];
    const body = await readJsonBody(req).catch(() => ({}));
    const rows = await query(`SELECT * FROM workflow_configurations WHERE id = ? LIMIT 1`, [
      sourceId,
    ]);
    if (!rows.length) {
      sendJson(res, 404, { success: false, error: 'source_not_found' });
      return true;
    }
    const src = rows[0];
    const newId = randomUUID();
    const targetModule = body.targetDocumentType || src.module_name;
    const conds =
      typeof src.conditions === 'string' ? src.conditions : JSON.stringify(src.conditions ?? []);
    const steps = typeof src.steps === 'string' ? src.steps : JSON.stringify(src.steps ?? []);
    await query(
      `INSERT INTO workflow_configurations
         (id, workflow_name, module_name, description, trigger_event,
          conditions, steps, status, created_date)
       VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), 'Draft', CURRENT_DATE)`,
      [
        newId,
        `${src.workflow_name} (Copy)`,
        targetModule,
        src.description,
        src.trigger_event,
        conds,
        steps,
      ]
    );
    sendJson(res, 200, { success: true, id: newId });
    return true;
  }

  // ── GET /api/approvals/action?token=&action= ───────────────────────────
  if (req.method === 'GET' && pathname === '/api/approvals/action') {
    const token = url.searchParams.get('token') || '';
    const action = url.searchParams.get('action') || '';
    if (!token || !['approve', 'reject'].includes(action)) {
      sendHtml(res, 400, '<h1>Invalid request</h1><p>Missing token or action.</p>');
      return true;
    }
    const rows = await query(
      `SELECT * FROM approvals
        WHERE token = ?
          AND token_expires_at > NOW()
          AND status = 'pending'
        LIMIT 1`,
      [token]
    );
    if (!rows.length) {
      sendHtml(
        res,
        200,
        '<h1>Link expired or already used</h1><p>Please open the Approvals dashboard to take action.</p>'
      );
      return true;
    }
    const approval = rows[0];
    if (action === 'approve') {
      try {
        await approveItem(
          approval.id,
          approval.assigned_to,
          'Approved via email link',
          getMysqlPool()
        );
        sendHtml(
          res,
          200,
          `<h1>Approved</h1><p>${approval.document_ref || approval.id} approved.</p>`
        );
      } catch (err) {
        sendHtml(res, 500, `<h1>Failed</h1><p>${err.message}</p>`);
      }
      return true;
    }
    // action === 'reject' → redirect to remarks form
    res.writeHead(302, {
      Location: `/api/approvals/reject-remarks?token=${encodeURIComponent(token)}`,
    });
    res.end();
    return true;
  }

  // ── GET /api/approvals/reject-remarks?token= ───────────────────────────
  if (req.method === 'GET' && pathname === '/api/approvals/reject-remarks') {
    const token = url.searchParams.get('token') || '';
    const rows = await query(
      `SELECT id, document_ref, document_name
         FROM approvals
        WHERE token = ?
          AND token_expires_at > NOW()
          AND status = 'pending'
        LIMIT 1`,
      [token]
    );
    if (!rows.length) {
      sendHtml(res, 200, '<h1>Link expired or already used</h1>');
      return true;
    }
    const a = rows[0];
    const safeRef = String(a.document_ref || a.id).replace(/[<>&"]/g, '');
    const safeName = String(a.document_name || '').replace(/[<>&"]/g, '');
    sendHtml(
      res,
      200,
      `<!doctype html><html><body style="font-family:Arial;max-width:600px;margin:40px auto;padding:20px">
        <h2>Reject: ${safeRef}</h2>
        <p>${safeName}</p>
        <form method="POST" action="/api/approvals/reject-with-remarks" style="margin-top:16px">
          <input type="hidden" name="token" value="${token}">
          <label>Please provide rejection reason (required):</label><br>
          <textarea name="remarks" rows="5" required style="width:100%;margin-top:8px;padding:8px"></textarea><br>
          <button type="submit" style="margin-top:12px;background:#B0322F;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer">Submit rejection</button>
        </form>
      </body></html>`
    );
    return true;
  }

  // ── POST /api/approvals/reject-with-remarks ────────────────────────────
  if (req.method === 'POST' && pathname === '/api/approvals/reject-with-remarks') {
    const ct = req.headers['content-type'] || '';
    let token = '';
    let remarks = '';
    if (ct.includes('application/json')) {
      const body = await readJsonBody(req).catch(() => ({}));
      token = body.token || '';
      remarks = body.remarks || '';
    } else {
      // application/x-www-form-urlencoded
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString('utf8');
      const params = new URLSearchParams(raw);
      token = params.get('token') || '';
      remarks = params.get('remarks') || '';
    }
    if (!token || !remarks) {
      sendHtml(res, 400, '<h1>Missing token or remarks</h1>');
      return true;
    }
    const rows = await query(
      `SELECT * FROM approvals
        WHERE token = ?
          AND token_expires_at > NOW()
          AND status = 'pending'
        LIMIT 1`,
      [token]
    );
    if (!rows.length) {
      sendHtml(res, 200, '<h1>Link expired or already used</h1>');
      return true;
    }
    const approval = rows[0];
    try {
      await rejectItem(approval.id, approval.assigned_to, remarks, getMysqlPool());
      sendHtml(
        res,
        200,
        `<h1>Rejected</h1><p>${approval.document_ref || approval.id} rejected.</p>`
      );
    } catch (err) {
      sendHtml(res, 500, `<h1>Failed</h1><p>${err.message}</p>`);
    }
    return true;
  }

  // ── GET /api/notifications/unread-count?userId= ────────────────────────
  if (req.method === 'GET' && pathname === '/api/notifications/unread-count') {
    const tenantId = readTenant(req, url);
    const userId = url.searchParams.get('userId') || req.headers['x-user-id'] || null;
    if (!userId) {
      sendJson(res, 400, { success: false, error: 'userId required' });
      return true;
    }
    const rows = await query(
      `SELECT COUNT(*) AS c FROM notifications
        WHERE user_id = ? AND tenant_id = ? AND is_read = 0`,
      [userId, tenantId]
    );
    sendJson(res, 200, { success: true, count: rows[0]?.c || 0 });
    return true;
  }

  // ── GET /api/notifications?userId= — list ──────────────────────────────
  if (req.method === 'GET' && pathname === '/api/notifications') {
    const tenantId = readTenant(req, url);
    const userId = url.searchParams.get('userId') || req.headers['x-user-id'] || null;
    if (!userId) {
      sendJson(res, 400, { success: false, error: 'userId required' });
      return true;
    }
    const rows = await query(
      `SELECT id, type, title, body, link, is_read, created_at
         FROM notifications
        WHERE user_id = ? AND tenant_id = ?
        ORDER BY created_at DESC
        LIMIT 50`,
      [userId, tenantId]
    );
    sendJson(res, 200, { success: true, data: rows });
    return true;
  }

  // ── POST /api/notifications/:id/read — mark as read ───────────────────
  const readMatch = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (req.method === 'POST' && readMatch) {
    await query('UPDATE notifications SET is_read = 1 WHERE id = ?', [readMatch[1]]);
    sendJson(res, 200, { success: true });
    return true;
  }

  // Suppress unused-export warning for getConnection import — kept for future
  // multi-statement endpoints (e.g. transactional clone with row-level locking).
  void getConnection;
  return false;
}
