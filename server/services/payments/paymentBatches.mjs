import { randomUUID } from 'node:crypto';
import { query, withTransaction, connExecute } from '../../mysql.mjs';
import { LIFECYCLE_STATES } from '../invoices/lifecycleMapping.mjs';

const PAYMENT_SUBQUERY = `
  SELECT invoice_id,
         SUM(amount) AS payment_total,
         COUNT(id) AS payment_count
  FROM payments WHERE status = 'confirmed' GROUP BY invoice_id
`;

let tablesReady = false;

export async function ensurePaymentBatchTables() {
  if (tablesReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS payment_batches (
      id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      entity_id VARCHAR(36) NULL,
      batch_no VARCHAR(64) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'draft',
      payment_date DATE NULL,
      payment_mode VARCHAR(32) NULL DEFAULT 'neft',
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      total_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      created_by_email VARCHAR(255) NULL,
      created_by_name VARCHAR(255) NULL,
      approved_by_email VARCHAR(255) NULL,
      approved_at DATETIME NULL,
      executed_by_email VARCHAR(255) NULL,
      executed_at DATETIME NULL,
      bank_account_json JSON NULL,
      comments TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_payment_batches_no_tenant (tenant_id, batch_no),
      KEY idx_pb_tenant_status (tenant_id, status),
      KEY idx_pb_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS payment_batch_lines (
      id VARCHAR(36) NOT NULL,
      batch_id VARCHAR(36) NOT NULL,
      invoice_id VARCHAR(36) NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_pbl_batch_invoice (batch_id, invoice_id),
      KEY idx_pbl_invoice (invoice_id),
      KEY idx_pbl_batch (batch_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  tablesReady = true;
}

function normalizePaymentMode(mode) {
  const m = String(mode || 'neft')
    .trim()
    .toLowerCase();
  if (
    ['neft', 'rtgs', 'imps', 'cheque', 'upi', 'cash', 'internal_transfer', 'wire', 'ach'].includes(
      m
    )
  ) {
    return m === 'wire' ? 'neft' : m === 'ach' ? 'neft' : m;
  }
  return 'neft';
}

function displayPaymentMode(mode) {
  const m = normalizePaymentMode(mode);
  return m.toUpperCase();
}

function outstandingFromRow(row) {
  const total = Number(row.total_amount) || 0;
  const paid = Number(row.payment_total) || 0;
  return Math.max(0, total - paid);
}

/** Invoices with balance, eligible lifecycle, not locked in an open batch. */
export async function listPayableInvoices({ tenantId, entityId }) {
  await ensurePaymentBatchTables();
  if (!tenantId) {
    const err = new Error('tenant_required');
    err.statusCode = 400;
    throw err;
  }

  const params = [tenantId];
  let entityClause = '';
  if (entityId) {
    entityClause = ' AND i.entity_id = ? ';
    params.push(entityId);
  }

  const sql = `
    SELECT i.id, i.invoice_number, i.invoice_date, i.due_date, i.vendor_name, i.vendor_id,
           i.currency, i.total_amount, i.lifecycle_state, i.approval_priority,
           v.vendor_code,
           COALESCE(pay.payment_total, 0) AS payment_total,
           COALESCE(pay.payment_count, 0) AS payment_count
    FROM invoices i
    LEFT JOIN vendors v ON v.id = i.vendor_id
    LEFT JOIN (${PAYMENT_SUBQUERY}) pay ON pay.invoice_id = i.id
    WHERE i.tenant_id = ?
      ${entityClause}
      AND i.lifecycle_state IN (?, ?)
      AND (COALESCE(i.total_amount, 0) - COALESCE(pay.payment_total, 0)) > 0.009
      AND NOT EXISTS (
        SELECT 1 FROM payment_batch_lines pbl
        INNER JOIN payment_batches pb ON pb.id = pbl.batch_id
        WHERE pbl.invoice_id = i.id
          AND pb.status IN ('draft', 'pending-approval', 'approved')
      )
    ORDER BY COALESCE(i.due_date, i.invoice_date) ASC, i.id ASC
  `;

  params.push(LIFECYCLE_STATES.PROCESSED, LIFECYCLE_STATES.QUEUED_FOR_PAYMENT);
  const rows = await query(sql, params);

  return rows.map((row) => {
    const out = outstandingFromRow(row);
    const due = row.due_date ? new Date(row.due_date) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let aging = 0;
    if (due) {
      due.setHours(0, 0, 0, 0);
      aging = Math.round((today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
    }
    const pr = String(row.approval_priority || 'normal').toLowerCase();
    const priority =
      pr === 'critical' ? 'critical' : pr === 'high' ? 'high' : pr === 'low' ? 'low' : 'normal';

    return {
      id: row.id,
      invoiceNo: row.invoice_number || row.id,
      vendor: row.vendor_name || '—',
      vendorCode: row.vendor_code || (row.vendor_id ? String(row.vendor_id).slice(0, 10) : '—'),
      invoiceDate: row.invoice_date ? String(row.invoice_date).slice(0, 10) : '',
      dueDate: row.due_date ? String(row.due_date).slice(0, 10) : '',
      amount: out,
      currency: row.currency || 'INR',
      aging,
      priority,
      paymentMode: displayPaymentMode('neft'),
      status: 'approved',
      category: 'General',
      isStatutory: false,
      lifecycleState: row.lifecycle_state,
      paymentTotal: Number(row.payment_total) || 0,
      paymentCount: Number(row.payment_count) || 0,
    };
  });
}

async function assertInvoicesPayable(tenantId, invoiceIds, conn) {
  const run = conn ? (sql, p) => connExecute(conn, sql, p) : query;
  const placeholders = invoiceIds.map(() => '?').join(',');
  const rows = await run(
    `
    SELECT i.id, i.tenant_id, i.entity_id, i.lifecycle_state, i.total_amount,
           COALESCE(pay.payment_total, 0) AS payment_total
    FROM invoices i
    LEFT JOIN (${PAYMENT_SUBQUERY}) pay ON pay.invoice_id = i.id
    WHERE i.id IN (${placeholders})
    `,
    invoiceIds
  );
  if (rows.length !== invoiceIds.length) {
    const err = new Error('invoice_not_found');
    err.statusCode = 404;
    throw err;
  }
  for (const r of rows) {
    if (String(r.tenant_id) !== String(tenantId)) {
      const err = new Error('tenant_mismatch');
      err.statusCode = 403;
      throw err;
    }
    const ls = r.lifecycle_state;
    if (ls !== LIFECYCLE_STATES.PROCESSED && ls !== LIFECYCLE_STATES.QUEUED_FOR_PAYMENT) {
      const err = new Error('invoice_not_payable_state');
      err.statusCode = 422;
      throw err;
    }
    const out = outstandingFromRow(r);
    if (out <= 0) {
      const err = new Error('invoice_already_fully_paid');
      err.statusCode = 422;
      throw err;
    }
  }

  const locked = await run(
    `
    SELECT pbl.invoice_id
    FROM payment_batch_lines pbl
    INNER JOIN payment_batches pb ON pb.id = pbl.batch_id
    WHERE pbl.invoice_id IN (${placeholders})
      AND pb.status IN ('draft', 'pending-approval', 'approved')
    `,
    invoiceIds
  );
  if (locked.length > 0) {
    const err = new Error('invoice_in_open_batch');
    err.statusCode = 409;
    err.invoiceIds = locked.map((x) => x.invoice_id);
    throw err;
  }
  return rows;
}

function nextBatchNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `PB-${y}${m}${day}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createPaymentBatch({
  tenantId,
  entityId,
  invoiceIds,
  amountsByInvoiceId,
  createdByEmail,
  createdByName,
}) {
  await ensurePaymentBatchTables();
  if (!tenantId) {
    const err = new Error('tenant_required');
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    const err = new Error('invoice_ids_required');
    err.statusCode = 400;
    throw err;
  }

  return withTransaction(async (conn) => {
    const invRows = await assertInvoicesPayable(tenantId, invoiceIds, conn);
    const byId = Object.fromEntries(invRows.map((r) => [r.id, r]));

    let total = 0;
    const lines = [];
    let sort = 0;
    for (const invId of invoiceIds) {
      const r = byId[invId];
      const defaultOut = outstandingFromRow(r);
      const raw = amountsByInvoiceId?.[invId];
      const amt = raw != null ? Number(raw) : defaultOut;
      if (!Number.isFinite(amt) || amt <= 0) {
        const err = new Error('invalid_line_amount');
        err.statusCode = 422;
        throw err;
      }
      if (amt - defaultOut > 0.01) {
        const err = new Error('amount_exceeds_outstanding');
        err.statusCode = 422;
        throw err;
      }
      total += amt;
      lines.push({ invId, amt, sort: sort++ });
    }

    const batchId = randomUUID();
    const batchNo = nextBatchNo();
    const firstEntity = entityId || invRows[0]?.entity_id || null;
    const [curRow] = await connExecute(conn, 'SELECT currency FROM invoices WHERE id = ? LIMIT 1', [
      invoiceIds[0],
    ]);
    const currency = curRow?.currency || 'INR';

    await connExecute(
      conn,
      `INSERT INTO payment_batches (
        id, tenant_id, entity_id, batch_no, status, payment_date, payment_mode, currency, total_amount,
        created_by_email, created_by_name, bank_account_json
      ) VALUES (?, ?, ?, ?, 'draft', NULL, 'neft', ?, ?, ?, ?, JSON_OBJECT('accountName','Operating','accountNo','—','bankName','—'))`,
      [
        batchId,
        tenantId,
        firstEntity,
        batchNo,
        currency,
        total,
        createdByEmail || null,
        createdByName || null,
      ]
    );

    for (const line of lines) {
      await connExecute(
        conn,
        'INSERT INTO payment_batch_lines (id, batch_id, invoice_id, amount, sort_order) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), batchId, line.invId, line.amt, line.sort]
      );
    }

    return { id: batchId, batchNo, status: 'draft', totalAmount: total, currency };
  });
}

export async function listPaymentBatches({ tenantId }) {
  await ensurePaymentBatchTables();
  if (!tenantId) {
    const err = new Error('tenant_required');
    err.statusCode = 400;
    throw err;
  }
  const rows = await query(
    `
    SELECT pb.*,
           (SELECT COUNT(*) FROM payment_batch_lines l WHERE l.batch_id = pb.id) AS line_count
    FROM payment_batches pb
    WHERE pb.tenant_id = ?
    ORDER BY pb.created_at DESC
    LIMIT 200
    `,
    [tenantId]
  );
  return rows.map(mapBatchListRow);
}

function mapBatchListRow(pb) {
  const createdBy =
    pb.created_by_name || pb.created_by_email
      ? `${pb.created_by_name || 'User'}${pb.created_by_email ? ` (${pb.created_by_email})` : ''}`
      : '—';
  const payDate = pb.payment_date || pb.created_at;
  return {
    id: pb.id,
    batchNo: pb.batch_no,
    totalAmount: Number(pb.total_amount) || 0,
    currency: pb.currency || 'INR',
    invoiceCount: Number(pb.line_count) || 0,
    paymentDate: payDate ? String(payDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    paymentMode: displayPaymentMode(pb.payment_mode),
    status: pb.status,
    createdBy,
    createdAt: pb.created_at ? new Date(pb.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function getPaymentBatchDetail({ tenantId, batchId }) {
  await ensurePaymentBatchTables();
  const [pb] = await query('SELECT * FROM payment_batches WHERE id = ? AND tenant_id = ? LIMIT 1', [
    batchId,
    tenantId,
  ]);
  if (!pb) {
    const err = new Error('batch_not_found');
    err.statusCode = 404;
    throw err;
  }

  const lines = await query(
    `
    SELECT pbl.*, i.invoice_number, i.vendor_name, i.vendor_id, v.vendor_code
    FROM payment_batch_lines pbl
    INNER JOIN invoices i ON i.id = pbl.invoice_id
    LEFT JOIN vendors v ON v.id = i.vendor_id
    WHERE pbl.batch_id = ?
    ORDER BY pbl.sort_order ASC, pbl.id ASC
    `,
    [batchId]
  );

  let bank = { accountName: 'Operating', accountNo: '—', bankName: '—' };
  if (pb.bank_account_json) {
    try {
      const b =
        typeof pb.bank_account_json === 'string'
          ? JSON.parse(pb.bank_account_json)
          : pb.bank_account_json;
      bank = { ...bank, ...b };
    } catch {
      /* keep default */
    }
  }

  const createdBy =
    pb.created_by_name || pb.created_by_email
      ? `${pb.created_by_name || 'User'} (${pb.created_by_email || '—'})`
      : '—';

  const invoices = lines.map((l) => ({
    id: l.invoice_id,
    invoiceNo: l.invoice_number || l.invoice_id,
    vendor: l.vendor_name || '—',
    vendorAccount: '—',
    ifscCode: '—',
    amount: Number(l.amount) || 0,
    currency: pb.currency || 'INR',
    dueDate: '',
    category: 'General',
  }));

  const approvalChain = [];
  if (pb.approved_by_email && pb.approved_at) {
    approvalChain.push({
      id: randomUUID(),
      approverName: pb.approved_by_email,
      approverRole: 'Approver',
      action: 'approved',
      timestamp: new Date(pb.approved_at).toISOString(),
      comments: pb.comments || undefined,
      level: 1,
    });
  } else if (pb.status === 'pending-approval') {
    approvalChain.push({
      id: 'pend-1',
      approverName: 'Treasury',
      approverRole: 'Pending',
      action: 'pending',
      level: 1,
    });
  }

  let executionDetails;
  if (pb.status === 'executed') {
    const pays = await query(
      `SELECT p.id, p.invoice_id, p.amount, p.utr, p.payment_date, i.invoice_number, i.vendor_name
       FROM payments p
       INNER JOIN invoices i ON i.id = p.invoice_id
       WHERE p.notes = ? AND p.status = 'confirmed'`,
      [`payment_batch:${batchId}`]
    );
    executionDetails = pays.map((p) => ({
      id: p.id,
      invoiceNo: p.invoice_number,
      vendor: p.vendor_name,
      amount: Number(p.amount) || 0,
      status: 'success',
      utr: p.utr || undefined,
      executedAt: p.payment_date ? String(p.payment_date) : undefined,
    }));
  }

  const payDate = pb.payment_date || pb.created_at;

  return {
    id: pb.id,
    batchNo: pb.batch_no,
    totalAmount: Number(pb.total_amount) || 0,
    currency: pb.currency || 'INR',
    invoiceCount: lines.length,
    paymentDate: payDate ? String(payDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    paymentMode: displayPaymentMode(pb.payment_mode),
    status: pb.status,
    createdBy,
    createdAt: pb.created_at ? new Date(pb.created_at).toISOString() : new Date().toISOString(),
    approvedBy: pb.approved_by_email || undefined,
    approvedAt: pb.approved_at ? new Date(pb.approved_at).toISOString() : undefined,
    executedBy: pb.executed_by_email || undefined,
    executedAt: pb.executed_at ? new Date(pb.executed_at).toISOString() : undefined,
    bankAccount: bank,
    invoices,
    approvalChain,
    executionDetails,
    bankFileGenerated: pb.status === 'approved' || pb.status === 'executed',
    bankFileGeneratedAt: pb.approved_at ? new Date(pb.approved_at).toISOString() : undefined,
    sentToBank: pb.status === 'executed',
    sentToBankAt: pb.executed_at ? new Date(pb.executed_at).toISOString() : undefined,
    comments: pb.comments || undefined,
  };
}

export async function submitPaymentBatch({ tenantId, batchId, actorEmail }) {
  await ensurePaymentBatchTables();
  const [pb] = await query(
    'SELECT id, status FROM payment_batches WHERE id = ? AND tenant_id = ?',
    [batchId, tenantId]
  );
  if (!pb) {
    const err = new Error('batch_not_found');
    err.statusCode = 404;
    throw err;
  }
  if (pb.status !== 'draft') {
    const err = new Error('invalid_batch_status');
    err.statusCode = 409;
    throw err;
  }
  await query(
    "UPDATE payment_batches SET status = 'pending-approval', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [batchId]
  );
  return { ok: true, status: 'pending-approval' };
}

export async function approvePaymentBatch({
  tenantId,
  batchId,
  actorEmail,
  comments,
  paymentDate,
  paymentMode,
}) {
  await ensurePaymentBatchTables();
  const [pb] = await query('SELECT * FROM payment_batches WHERE id = ? AND tenant_id = ?', [
    batchId,
    tenantId,
  ]);
  if (!pb) {
    const err = new Error('batch_not_found');
    err.statusCode = 404;
    throw err;
  }
  if (pb.status !== 'pending-approval') {
    const err = new Error('invalid_batch_status');
    err.statusCode = 409;
    throw err;
  }
  const mode = normalizePaymentMode(paymentMode || pb.payment_mode);
  const pdate = paymentDate || new Date().toISOString().slice(0, 10);
  await query(
    `UPDATE payment_batches SET status = 'approved', approved_by_email = ?, approved_at = NOW(),
     payment_mode = ?, payment_date = ?, comments = COALESCE(?, comments), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [actorEmail || null, mode, pdate, comments || null, batchId]
  );
  return { ok: true, status: 'approved' };
}

export async function rejectPaymentBatch({ tenantId, batchId, actorEmail, comments }) {
  await ensurePaymentBatchTables();
  const [pb] = await query(
    'SELECT id, status FROM payment_batches WHERE id = ? AND tenant_id = ?',
    [batchId, tenantId]
  );
  if (!pb) {
    const err = new Error('batch_not_found');
    err.statusCode = 404;
    throw err;
  }
  if (pb.status !== 'pending-approval') {
    const err = new Error('invalid_batch_status');
    err.statusCode = 409;
    throw err;
  }
  await query(
    "UPDATE payment_batches SET status = 'rejected', comments = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [comments || 'Rejected', batchId]
  );
  return { ok: true, status: 'rejected' };
}

export async function executePaymentBatch({ tenantId, batchId, actorEmail }) {
  await ensurePaymentBatchTables();
  const [pb] = await query('SELECT * FROM payment_batches WHERE id = ? AND tenant_id = ?', [
    batchId,
    tenantId,
  ]);
  if (!pb) {
    const err = new Error('batch_not_found');
    err.statusCode = 404;
    throw err;
  }
  if (pb.status !== 'approved') {
    const err = new Error('batch_not_approved');
    err.statusCode = 409;
    throw err;
  }

  const lines = await query(
    'SELECT * FROM payment_batch_lines WHERE batch_id = ? ORDER BY sort_order, id',
    [batchId]
  );
  if (!lines.length) {
    const err = new Error('batch_empty');
    err.statusCode = 422;
    throw err;
  }

  const paymentDate = pb.payment_date || new Date().toISOString().slice(0, 10);
  const mode = normalizePaymentMode(pb.payment_mode);

  await withTransaction(async (conn) => {
    for (const line of lines) {
      const [inv] = await connExecute(
        conn,
        'SELECT id, tenant_id, entity_id, total_amount FROM invoices WHERE id = ? LIMIT 1',
        [line.invoice_id]
      );
      if (!inv) continue;

      const [agg] = await connExecute(
        conn,
        `SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE invoice_id = ? AND status = 'confirmed'`,
        [line.invoice_id]
      );
      const paid = Number(agg?.paid) || 0;
      const total = Number(inv.total_amount) || 0;
      const outstanding = Math.max(0, total - paid);
      const payAmt = Math.min(Number(line.amount) || 0, outstanding);
      if (payAmt <= 0) continue;

      const utr = `PB-${batchId.slice(0, 8)}-${line.invoice_id.slice(0, 8)}`.toUpperCase();
      await connExecute(
        conn,
        `INSERT INTO payments (id, tenant_id, entity_id, invoice_id, payment_date, utr, amount, payment_mode, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
        [
          randomUUID(),
          inv.tenant_id || tenantId,
          inv.entity_id,
          line.invoice_id,
          paymentDate,
          utr,
          payAmt,
          mode,
          `payment_batch:${batchId}`,
        ]
      );

      const [agg2] = await connExecute(
        conn,
        `SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE invoice_id = ? AND status = 'confirmed'`,
        [line.invoice_id]
      );
      const paid2 = Number(agg2?.paid) || 0;
      if (paid2 + 0.009 >= total && total > 0) {
        await connExecute(
          conn,
          "UPDATE invoices SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [line.invoice_id]
        );
      }
    }

    await connExecute(
      conn,
      `UPDATE payment_batches SET status = 'executed', executed_by_email = ?, executed_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [actorEmail || null, batchId]
    );
  });

  return { ok: true, status: 'executed' };
}
