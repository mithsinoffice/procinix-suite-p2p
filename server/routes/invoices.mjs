/**
 * Invoice action routes — outside the 4092-line server/index.mjs monolith.
 *
 * POST /api/invoices/:id/submit
 *   Workbench "Submit for Approval": sets lifecycle_state = 'Under Verification',
 *   records validated_by / validated_at, creates an approvals row.
 *   Requires X-Tenant-Id header.
 *
 * POST /api/invoices/:id/approve
 * POST /api/invoices/:id/reject
 *   Approve / Reject from the InvoiceDetail action bar.
 *   Require X-Tenant-Id header.
 */

import { randomUUID } from 'node:crypto';
import { query } from '../mysql.mjs';
import { assertValidTransition } from '../services/invoices/lifecycleTransitions.mjs';

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

/**
 * Handle invoice action routes.
 * Returns true if handled, false to fall through to index.mjs.
 */
export async function handleInvoiceRoute(req, res, pathname, sendJson) {
  // POST /api/invoices/:id/submit
  const submitMatch = pathname.match(/^\/api\/invoices\/([^/]+)\/submit$/);
  if (req.method === 'POST' && submitMatch) {
    const invoiceId = submitMatch[1];
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return (sendJson(res, 400, { success: false, error: 'X-Tenant-Id header required' }), true);
    }
    const body = await readJsonBody(req);
    const validatedBy = body.validated_by || req.user?.email || null;

    const rows = await query(
      'SELECT id, lifecycle_state, status FROM invoices WHERE id = ? LIMIT 1',
      [invoiceId]
    );
    if (!rows.length) {
      return (sendJson(res, 404, { success: false, error: 'Invoice not found' }), true);
    }
    const invoice = rows[0];

    try {
      assertValidTransition(invoice.lifecycle_state ?? null, 'Under Verification');
    } catch (e) {
      return (sendJson(res, 422, { success: false, error: e.message }), true);
    }

    await query(
      `UPDATE invoices
       SET lifecycle_state = 'Under Verification',
           status = 'pending_approval',
           validated_by = ?,
           validated_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [validatedBy, invoiceId]
    );

    // Upsert approval record
    const existingApproval = await query(
      `SELECT id FROM approvals WHERE module = 'ap_invoice' AND reference_id = ? LIMIT 1`,
      [invoiceId]
    );
    if (!existingApproval.length) {
      await query(
        `INSERT INTO approvals (id, module, reference_id, status, assigned_to, submitted_by, created_at, approval_priority)
         VALUES (?, 'ap_invoice', ?, 'pending', ?, ?, NOW(), 'normal')`,
        [randomUUID(), invoiceId, tenantId, validatedBy || tenantId]
      );
    } else {
      await query(
        `UPDATE approvals SET status = 'pending', submitted_by = ?, updated_at = NOW()
         WHERE module = 'ap_invoice' AND reference_id = ?`,
        [validatedBy || tenantId, invoiceId]
      );
    }

    console.log(`[InvoiceRoute] Invoice ${invoiceId} submitted for approval by ${validatedBy}`);
    const updated = await query('SELECT * FROM invoices WHERE id = ? LIMIT 1', [invoiceId]);
    return (sendJson(res, 200, { success: true, data: updated[0] ?? null }), true);
  }

  // POST /api/invoices/:id/approve
  const approveMatch = pathname.match(/^\/api\/invoices\/([^/]+)\/approve$/);
  if (req.method === 'POST' && approveMatch) {
    const invoiceId = approveMatch[1];
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return (sendJson(res, 400, { success: false, error: 'X-Tenant-Id header required' }), true);
    }
    const body = await readJsonBody(req);
    const approvedBy = body.approved_by || req.user?.email || null;

    const rows = await query('SELECT id, lifecycle_state FROM invoices WHERE id = ? LIMIT 1', [
      invoiceId,
    ]);
    if (!rows.length) {
      return (sendJson(res, 404, { success: false, error: 'Invoice not found' }), true);
    }
    try {
      assertValidTransition(rows[0].lifecycle_state ?? null, 'Processed');
    } catch (e) {
      return (sendJson(res, 422, { success: false, error: e.message }), true);
    }

    await query(
      `UPDATE invoices
       SET lifecycle_state = 'Processed',
           status = 'approved',
           updated_at = NOW()
       WHERE id = ?`,
      [invoiceId]
    );
    await query(
      `UPDATE approvals SET status = 'approved', assigned_to = ?, updated_at = NOW()
       WHERE module = 'ap_invoice' AND reference_id = ?`,
      [approvedBy || tenantId, invoiceId]
    );

    console.log(`[InvoiceRoute] Invoice ${invoiceId} approved by ${approvedBy}`);
    const updated = await query('SELECT * FROM invoices WHERE id = ? LIMIT 1', [invoiceId]);
    return (sendJson(res, 200, { success: true, data: updated[0] ?? null }), true);
  }

  // POST /api/invoices/:id/reject
  const rejectMatch = pathname.match(/^\/api\/invoices\/([^/]+)\/reject$/);
  if (req.method === 'POST' && rejectMatch) {
    const invoiceId = rejectMatch[1];
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return (sendJson(res, 400, { success: false, error: 'X-Tenant-Id header required' }), true);
    }
    const body = await readJsonBody(req);
    const rejectedBy = body.rejected_by || req.user?.email || null;
    const reason = body.reason || '';

    const rows = await query('SELECT id, lifecycle_state FROM invoices WHERE id = ? LIMIT 1', [
      invoiceId,
    ]);
    if (!rows.length) {
      return (sendJson(res, 404, { success: false, error: 'Invoice not found' }), true);
    }
    try {
      assertValidTransition(rows[0].lifecycle_state ?? null, 'Rejected');
    } catch (e) {
      return (sendJson(res, 422, { success: false, error: e.message }), true);
    }

    await query(
      `UPDATE invoices
       SET lifecycle_state = 'Rejected',
           status = 'rejected',
           notes = CONCAT(COALESCE(notes, ''), IF(COALESCE(notes, '') = '', '', ' | '), ?),
           updated_at = NOW()
       WHERE id = ?`,
      [reason ? `Rejected: ${reason}` : 'Rejected', invoiceId]
    );
    await query(
      `UPDATE approvals SET status = 'rejected', assigned_to = ?, updated_at = NOW()
       WHERE module = 'ap_invoice' AND reference_id = ?`,
      [rejectedBy || tenantId, invoiceId]
    );

    console.log(`[InvoiceRoute] Invoice ${invoiceId} rejected by ${rejectedBy}`);
    const updated = await query('SELECT * FROM invoices WHERE id = ? LIMIT 1', [invoiceId]);
    return (sendJson(res, 200, { success: true, data: updated[0] ?? null }), true);
  }

  return false;
}
