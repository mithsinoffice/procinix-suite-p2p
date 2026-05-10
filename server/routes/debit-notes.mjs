/**
 * Debit Notes domain route — list / detail / create / approve / reject.
 * All endpoints tenant-scoped via X-Tenant-Id (or ?tenantId= query).
 *
 *   GET    /api/ap/debit-notes              list (paginated, filterable by status/search)
 *   GET    /api/ap/debit-notes/:id          detail (header + line items)
 *   POST   /api/ap/debit-notes              create draft
 *   POST   /api/ap/debit-notes/:id/approve  Pending Approval → Issued (approver gate via isPaymentApprover)
 *   POST   /api/ap/debit-notes/:id/reject   Pending Approval → Rejected
 *
 * Audit rows are written to `debit_notes_audit` on every state change.
 */

import { randomUUID } from 'node:crypto';
import { query, withTransaction, connExecute } from '../mysql.mjs';
import { isPaymentApprover } from './payments.mjs';

const VALID_STATUSES = new Set([
  'Draft',
  'Pending Approval',
  'Issued',
  'Adjusted',
  'Closed',
  'Rejected',
]);

// ── Request helpers ────────────────────────────────────────────────────────

function readTenant(req, url) {
  const h = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
  if (h && String(h).trim()) return String(h).trim();
  const q = url?.searchParams?.get?.('tenantId');
  return q ? String(q).trim() : '';
}

function readActorId(req) {
  return String(req.user?.userId || req.user?.id || req.headers['x-user-id'] || '').trim();
}

function readActorName(req) {
  return String(req.user?.name || req.headers['x-user-name'] || '').trim();
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

// ── Adapters (DB row → API shape, camelCase) ───────────────────────────────

function adaptHeader(row, items = []) {
  if (!row) return null;
  return {
    id: row.id,
    debitNoteNumber: row.debit_note_number,
    debitNoteDate: row.debit_note_date ? String(row.debit_note_date).slice(0, 10) : null,
    tenantId: row.tenant_id,
    entityId: row.entity_id,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    vendorCode: row.vendor_code,
    vendorAPAccount: row.vendor_ap_account,
    referenceType: row.reference_type,
    referenceNumber: row.reference_number,
    referenceId: row.reference_id,
    reasonId: row.reason_id,
    reasonName: row.reason_name,
    debitAmount: Number(row.debit_amount) || 0,
    currency: row.currency || 'INR',
    status: row.status,
    notes: row.notes,
    createdBy: row.created_by,
    createdDate: row.created_at,
    issuedBy: row.issued_by,
    issuedDate: row.issued_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
    lineItems: items.map((i) => ({
      id: i.id,
      itemCode: i.item_code || '',
      itemName: i.item_name || '',
      referenceQty: Number(i.reference_qty) || 0,
      invoicedQty: Number(i.invoiced_qty) || 0,
      debitQty: Number(i.debit_qty) || 0,
      uom: i.uom || '',
      rate: Number(i.rate) || 0,
      debitAmount: Number(i.debit_amount) || 0,
      expenseGL: i.expense_gl || undefined,
    })),
  };
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateCreate(body) {
  const errors = [];
  const required = ['vendorName', 'referenceType', 'debitNoteDate', 'entityId'];
  for (const k of required) {
    if (!body[k] || String(body[k]).trim() === '') errors.push(`${k} required`);
  }
  if (body.referenceType && !['Invoice', 'GRN'].includes(body.referenceType)) {
    errors.push('referenceType must be Invoice or GRN');
  }
  if (body.debitAmount != null && Number(body.debitAmount) < 0) {
    errors.push('debitAmount must be >= 0');
  }
  return errors;
}

// ── Audit helper ───────────────────────────────────────────────────────────

async function writeAudit(conn, { tenantId, debitNoteId, action, actorId, actorName, remarks }) {
  const sql = `INSERT INTO debit_notes_audit
      (id, debit_note_id, tenant_id, action, actor_id, actor_name, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    randomUUID(),
    debitNoteId,
    tenantId,
    action,
    actorId || null,
    actorName || null,
    remarks || null,
  ];
  if (conn) await connExecute(conn, sql, params);
  else await query(sql, params);
}

// ── Endpoints ──────────────────────────────────────────────────────────────

async function handleList(req, res, sendJson, url, tenantId) {
  const conds = ['tenant_id = ?'];
  const params = [tenantId];
  const status = url.searchParams.get('status') || '';
  if (status && VALID_STATUSES.has(status)) {
    conds.push('status = ?');
    params.push(status);
  }
  const search = url.searchParams.get('search') || '';
  if (search) {
    conds.push(
      '(debit_note_number LIKE ? OR vendor_name LIKE ? OR reference_number LIKE ? OR reason_name LIKE ?)'
    );
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 200);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  const rows = await query(
    `SELECT * FROM debit_notes WHERE ${conds.join(' AND ')}
       ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  sendJson(res, 200, { success: true, data: rows.map((r) => adaptHeader(r)) });
}

async function handleDetail(req, res, sendJson, tenantId, id) {
  const head = await query(`SELECT * FROM debit_notes WHERE id = ? AND tenant_id = ? LIMIT 1`, [
    id,
    tenantId,
  ]);
  if (!head.length) {
    sendJson(res, 404, { success: false, error: 'debit_note_not_found' });
    return;
  }
  const items = await query(
    `SELECT * FROM debit_note_items WHERE debit_note_id = ? AND tenant_id = ?
       ORDER BY line_number`,
    [id, tenantId]
  );
  sendJson(res, 200, { success: true, data: adaptHeader(head[0], items) });
}

async function handleCreate(req, res, sendJson, tenantId, body) {
  const errors = validateCreate(body);
  if (errors.length) {
    sendJson(res, 400, { success: false, error: 'validation_failed', details: errors });
    return;
  }
  const id = randomUUID();
  const dnNumber =
    body.debitNoteNumber ||
    `DN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
      Math.random() * 10000
    )
      .toString()
      .padStart(4, '0')}`;
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';
  const status = body.status && VALID_STATUSES.has(body.status) ? body.status : 'Draft';
  const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
  const computedAmount = lineItems.reduce((sum, li) => sum + (Number(li.debitAmount) || 0), 0);
  const debitAmount = body.debitAmount != null ? Number(body.debitAmount) : computedAmount;

  await withTransaction(async (conn) => {
    await connExecute(
      conn,
      `INSERT INTO debit_notes (
         id, tenant_id, entity_id, debit_note_number, debit_note_date,
         vendor_id, vendor_name, vendor_code, vendor_ap_account,
         reference_type, reference_number, reference_id, reason_id, reason_name,
         debit_amount, currency, status, notes, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tenantId,
        body.entityId,
        dnNumber,
        body.debitNoteDate,
        body.vendorId || null,
        body.vendorName,
        body.vendorCode || null,
        body.vendorAPAccount || null,
        body.referenceType,
        body.referenceNumber || null,
        body.referenceId || null,
        body.reasonId || null,
        body.reasonName || null,
        debitAmount,
        body.currency || 'INR',
        status,
        body.notes || null,
        actorId,
      ]
    );
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      await connExecute(
        conn,
        `INSERT INTO debit_note_items (
           id, debit_note_id, tenant_id, line_number, item_code, item_name,
           reference_qty, invoiced_qty, debit_qty, uom, rate, debit_amount, expense_gl
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          id,
          tenantId,
          i + 1,
          li.itemCode || null,
          li.itemName || null,
          Number(li.referenceQty) || 0,
          Number(li.invoicedQty) || 0,
          Number(li.debitQty) || 0,
          li.uom || null,
          Number(li.rate) || 0,
          Number(li.debitAmount) || 0,
          li.expenseGL || null,
        ]
      );
    }
    await writeAudit(conn, {
      tenantId,
      debitNoteId: id,
      action: 'created',
      actorId,
      actorName,
      remarks: `Debit note ${dnNumber} created (${lineItems.length} line items)`,
    });
  });

  const head = await query(`SELECT * FROM debit_notes WHERE id = ? LIMIT 1`, [id]);
  const items = await query(
    `SELECT * FROM debit_note_items WHERE debit_note_id = ? ORDER BY line_number`,
    [id]
  );
  sendJson(res, 200, { success: true, data: adaptHeader(head[0], items) });
}

async function handleApprove(req, res, sendJson, tenantId, id) {
  if (!(await isPaymentApprover(req, tenantId))) {
    sendJson(res, 403, { success: false, error: 'not_approver' });
    return;
  }
  const head = await query(`SELECT * FROM debit_notes WHERE id = ? AND tenant_id = ? LIMIT 1`, [
    id,
    tenantId,
  ]);
  if (!head.length) {
    sendJson(res, 404, { success: false, error: 'debit_note_not_found' });
    return;
  }
  if (!['Draft', 'Pending Approval'].includes(head[0].status)) {
    sendJson(res, 400, {
      success: false,
      error: 'invalid_transition',
      from: head[0].status,
    });
    return;
  }
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';
  await query(
    `UPDATE debit_notes
        SET status = 'Issued', approved_by = ?, approved_at = CURRENT_TIMESTAMP,
            issued_by = ?, issued_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [actorId, actorId, id]
  );
  await writeAudit(null, {
    tenantId,
    debitNoteId: id,
    action: 'approved',
    actorId,
    actorName,
    remarks: 'Debit note approved + issued',
  });
  sendJson(res, 200, { success: true, data: { id, status: 'Issued' } });
}

async function handleReject(req, res, sendJson, tenantId, id, body) {
  if (!(await isPaymentApprover(req, tenantId))) {
    sendJson(res, 403, { success: false, error: 'not_approver' });
    return;
  }
  const head = await query(`SELECT * FROM debit_notes WHERE id = ? AND tenant_id = ? LIMIT 1`, [
    id,
    tenantId,
  ]);
  if (!head.length) {
    sendJson(res, 404, { success: false, error: 'debit_note_not_found' });
    return;
  }
  if (!['Draft', 'Pending Approval'].includes(head[0].status)) {
    sendJson(res, 400, {
      success: false,
      error: 'invalid_transition',
      from: head[0].status,
    });
    return;
  }
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';
  const reason = String(body?.reason || '').trim() || 'No reason provided';
  await query(
    `UPDATE debit_notes
        SET status = 'Rejected', rejected_by = ?, rejected_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
      WHERE id = ?`,
    [actorId, reason, id]
  );
  await writeAudit(null, {
    tenantId,
    debitNoteId: id,
    action: 'rejected',
    actorId,
    actorName,
    remarks: reason,
  });
  sendJson(res, 200, { success: true, data: { id, status: 'Rejected' } });
}

// ── Main route handler ────────────────────────────────────────────────────

export async function handleDebitNotesRoute(req, res, pathname, sendJson) {
  if (!pathname.startsWith('/api/ap/debit-notes')) return false;
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const tenantId = readTenant(req, url);
  if (!tenantId) {
    sendJson(res, 400, { success: false, error: 'tenant_required' });
    return true;
  }

  try {
    if (req.method === 'GET' && pathname === '/api/ap/debit-notes') {
      await handleList(req, res, sendJson, url, tenantId);
      return true;
    }
    if (req.method === 'POST' && pathname === '/api/ap/debit-notes') {
      const body = await readJsonBody(req);
      await handleCreate(req, res, sendJson, tenantId, body);
      return true;
    }
    let m = pathname.match(/^\/api\/ap\/debit-notes\/([^/]+)\/approve$/);
    if (m && req.method === 'POST') {
      await handleApprove(req, res, sendJson, tenantId, m[1]);
      return true;
    }
    m = pathname.match(/^\/api\/ap\/debit-notes\/([^/]+)\/reject$/);
    if (m && req.method === 'POST') {
      const body = await readJsonBody(req);
      await handleReject(req, res, sendJson, tenantId, m[1], body);
      return true;
    }
    m = pathname.match(/^\/api\/ap\/debit-notes\/([^/]+)$/);
    if (m && req.method === 'GET') {
      await handleDetail(req, res, sendJson, tenantId, m[1]);
      return true;
    }
  } catch (err) {
    console.error('[debit-notes] error:', err);
    sendJson(res, 500, { success: false, error: err.message || 'internal_error' });
    return true;
  }
  return false;
}
