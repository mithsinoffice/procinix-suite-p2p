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
import { processMatch } from '../services/agents/matchAgent.mjs';

/**
 * Map match agent output → invoices.lane:
 *   matched + score≥90  → green
 *   matched/partial + score≥60 → amber
 *   anything else / no PO → red
 */
function laneFromMatchResult(matchResult, score) {
  const s = Number(score) || 0;
  if (matchResult === 'matched' && s >= 90) return 'green';
  if ((matchResult === 'matched' || matchResult === 'partial') && s >= 60) return 'amber';
  return 'red';
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

/**
 * Handle invoice action routes.
 * Returns true if handled, false to fall through to index.mjs.
 */
export async function handleInvoiceRoute(req, res, pathname, sendJson) {
  // POST /api/invoices — create
  // Used by InvoiceFormPO, NonPOInvoiceForm, and AIInvoiceCapture. Inserts a
  // row in p2p_schema_mt.invoices, then — if a po_number is supplied — fires
  // matchAgent and writes the resulting `lane` so the workbench STP gauge
  // reflects the new row immediately.
  if (req.method === 'POST' && pathname === '/api/invoices') {
    const tenantId = req.headers['x-tenant-id'] || 'tenant-default-001';
    const body = await readJsonBody(req);
    const id = randomUUID();
    const total = Number(body.total_amount) || 0;
    const subtotal = Number(body.subtotal) || total;
    const taxAmount = Number(body.tax_amount) || 0;
    const lifecycleState = body.lifecycle_state || 'Ingested';
    const dbStatus = body.status || (lifecycleState === 'Ingested' ? 'draft' : 'pending_approval');

    try {
      await query(
        `INSERT INTO invoices (
           id, tenant_id, entity_id,
           invoice_number, invoice_date, due_date,
           vendor_id, vendor_name, vendor_gstin,
           po_number, po_id,
           subtotal, tax_amount, total_amount, currency,
           source, status, lifecycle_state,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          id,
          tenantId,
          body.entity_id || null,
          body.invoice_number || null,
          body.invoice_date || null,
          body.due_date || null,
          body.vendor_id || null,
          body.vendor_name || null,
          body.vendor_gstin || null,
          body.po_number || null,
          body.po_id || null,
          subtotal,
          taxAmount,
          total,
          body.currency || 'INR',
          body.source || 'manual_entry',
          dbStatus,
          lifecycleState,
        ]
      );

      // FIX 11 — auto-trigger matchAgent when a po_number is supplied so
      // newly-created invoices get a real match_result + lane immediately,
      // making the workbench STP rate meaningful.
      let lane = 'red';
      if (body.po_number) {
        try {
          const matchResult = await processMatch(
            id,
            {
              po_number: body.po_number,
              vendor_name: body.vendor_name,
              total_amount: total,
              invoice_date: body.invoice_date,
            },
            body.entity_id || null,
            undefined,
            tenantId
          );
          lane = laneFromMatchResult(matchResult?.matchResult, matchResult?.matchScore);
        } catch (err) {
          console.warn('[invoices POST] auto-match failed:', err?.message || err);
        }
      } else if (lifecycleState === 'Under Verification') {
        lane = 'amber';
      } else if (lifecycleState === 'Ingested') {
        lane = 'pending';
      }
      await query('UPDATE invoices SET lane = ? WHERE id = ?', [lane, id]);

      const rows = await query('SELECT * FROM invoices WHERE id = ? LIMIT 1', [id]);
      return (sendJson(res, 200, { success: true, data: rows[0] }), true);
    } catch (err) {
      console.error('[invoices POST] insert failed:', err?.message || err);
      return (
        sendJson(res, 500, {
          success: false,
          error: err?.message || 'Failed to create invoice',
        }),
        true
      );
    }
  }

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

  // POST /api/invoices/:id/queue-for-payment — Processed → Queued for Payment.
  // Manual UI trigger from the InvoiceDetail page; the payment-batch flow
  // also flips this lifecycle_state implicitly via payments.mjs.
  const queueMatch = pathname.match(/^\/api\/invoices\/([^/]+)\/queue-for-payment$/);
  if (req.method === 'POST' && queueMatch) {
    const lookupId = queueMatch[1];
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return (sendJson(res, 400, { success: false, error: 'X-Tenant-Id header required' }), true);
    }
    const rows = await query(
      'SELECT id, lifecycle_state FROM invoices WHERE (id = ? OR invoice_number = ?) AND tenant_id = ? LIMIT 1',
      [lookupId, lookupId, tenantId]
    );
    if (!rows.length) {
      return (sendJson(res, 404, { success: false, error: 'Invoice not found' }), true);
    }
    const invoice = rows[0];
    if (invoice.lifecycle_state !== 'Processed') {
      return (
        sendJson(res, 422, {
          success: false,
          error: 'invalid_transition',
          message: `Cannot queue invoice in state: ${invoice.lifecycle_state}`,
        }),
        true
      );
    }
    await query(
      `UPDATE invoices
       SET lifecycle_state = 'Queued for Payment', updated_at = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [invoice.id, tenantId]
    );
    return (
      sendJson(res, 200, {
        success: true,
        data: { id: invoice.id, lifecycle_state: 'Queued for Payment' },
      }),
      true
    );
  }

  return false;
}
