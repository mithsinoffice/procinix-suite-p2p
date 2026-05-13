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
import { query, getMysqlPool } from '../mysql.mjs';
import { assertValidTransition } from '../services/invoices/lifecycleTransitions.mjs';
import { processMatch } from '../services/agents/matchAgent.mjs';
import { invalidatePendingApprovalsSync } from '../services/approvals/approvalService.mjs';
import { enqueueApprovalFromWorkflow } from '../services/workflow/dispatcher.mjs';

/**
 * Invoice approval enqueue. Now routes through the workflow engine
 * (`enqueueApprovalFromWorkflow`) instead of hardcoding `assigned_to='1'`.
 *
 * Returns the dispatcher result verbatim, so callers can surface
 * `{ blocked, reason }` to the user (HTTP 422). Idempotency is preserved
 * by the pre-flight "is there already a pending row for this invoice?"
 * check — if yes we leave it alone (the existing dispatcher row is the
 * authoritative one).
 */
export async function ensureInvoiceApproval(invoiceId, submittedBy) {
  if (!invoiceId) return { skipped: true, reason: 'no_invoice_id' };
  const existing = await query(
    `SELECT id FROM approvals
      WHERE reference_id = ?
        AND module IN ('ap_invoice', 'non_po_invoice')
        AND status IN ('pending', 'pending_predecessor')
      LIMIT 1`,
    [invoiceId]
  );
  if (existing.length) {
    invalidatePendingApprovalsSync();
    return { approvalId: existing[0].id, action: 'noop_existing' };
  }
  // Hydrate the document payload for condition evaluation.
  const rows = await query(
    `SELECT id, invoice_number, vendor_name, vendor_id, total_amount,
            currency, po_number, tenant_id, validated_by, bill_to_entity
       FROM invoices
      WHERE id = ?
      LIMIT 1`,
    [invoiceId]
  );
  const invoice = rows[0];
  if (!invoice) return { skipped: true, reason: 'invoice_not_found' };

  const documentType = invoice.po_number ? 'ap_invoice' : 'non_po_invoice';
  const tenantId = invoice.tenant_id || 'tenant-default-001';
  const documentPayload = {
    invoice_amount: Number(invoice.total_amount) || 0,
    total_amount: Number(invoice.total_amount) || 0,
    currency: invoice.currency,
    vendor_id: invoice.vendor_id,
    entity: invoice.bill_to_entity,
    invoice_type: invoice.po_number ? 'po' : 'non_po',
  };

  const result = await enqueueApprovalFromWorkflow({
    documentType,
    documentId: invoiceId,
    documentRef: invoice.invoice_number || invoiceId,
    documentName: invoice.vendor_name
      ? `${invoice.vendor_name} — ${invoice.currency || 'INR'} ${invoice.total_amount || 0}`
      : null,
    documentPayload,
    submittedBy: submittedBy || invoice.validated_by || '1',
    submittedByName: submittedBy ? null : 'AP Team',
    tenantId,
    db: getMysqlPool(),
  });
  return result.blocked
    ? result
    : { approvalId: result.approvalId, action: result.fallback ? 'fallback' : 'inserted' };
}

/**
 * Backfill — runs once at server startup. Sweeps every invoice that's parked
 * in `Under Verification` (or a legacy pending status) without a matching
 * pending approvals row, and ensures one exists. Mirrors
 * `backfillApprovedVendorMasters` in `server/services/vendors/sync.mjs`:
 * idempotent (matched rows hit the UPDATE branch via `ensureInvoiceApproval`),
 * non-fatal on schema gaps, returns a `{ scanned, inserted, updated, errors }`
 * summary for the startup log.
 *
 * This covers the gap where `ensureInvoiceApproval` only ran on new submits —
 * invoices that were submitted BEFORE the wiring was in place stayed
 * invisible to My Approvals until backfilled.
 */
export async function backfillPendingInvoiceApprovals() {
  const summary = { scanned: 0, inserted: 0, updated: 0, errors: 0 };
  let rows;
  try {
    // `invoices` carries `validated_by` (workbench submitter) but not
    // `created_by` — early submissions before ingestion attribution went
    // through `processing_status` instead. Fall back to '1' on the helper
    // call when validated_by is null.
    rows = await query(
      `SELECT id, validated_by, lifecycle_state, status
         FROM invoices
        WHERE (
          lifecycle_state IN ('Under Verification', 'Pending Approval', 'pending_approval')
          OR LOWER(COALESCE(status, '')) IN
             ('pending_approval', 'pending approval', 'pending', 'submitted', 'in review')
        )
        AND LOWER(COALESCE(status, '')) NOT IN ('approved', 'rejected', 'cancelled')`
    );
  } catch (err) {
    console.warn('[invoiceApproval] backfill skipped — invoices read failed:', err?.message || err);
    return summary;
  }

  for (const row of rows) {
    summary.scanned += 1;
    try {
      const submittedBy = row.validated_by || '1';
      const result = await ensureInvoiceApproval(row.id, submittedBy);
      if (result?.action === 'inserted' || result?.action === 'fallback') summary.inserted += 1;
      else if (result?.action === 'noop_existing' || result?.action === 'updated')
        summary.updated += 1;
    } catch (err) {
      summary.errors += 1;
      console.warn(`[invoiceApproval] backfill row ${row.id} failed:`, err?.message || err);
    }
  }
  return summary;
}

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
           vendor_id, vendor_name, vendor_gstin, vendor_pan,
           po_number, po_id, irn,
           subtotal, tax_amount, total_amount, currency,
           source, status, lifecycle_state,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
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
          body.vendor_pan || null,
          body.po_number || null,
          body.po_id || null,
          body.irn || null,
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

      // Hardcoded single-level approval: any new invoice landing in
      // `Under Verification` (the canonical "submitted for approval" state)
      // gets a queue entry so My Approvals surfaces it. Drafts skip this —
      // the user hasn't asked for review yet.
      if (lifecycleState === 'Under Verification') {
        const submittedBy = req.headers['x-user-id'] || body.submitted_by || null;
        try {
          await ensureInvoiceApproval(id, submittedBy);
        } catch (err) {
          console.warn('[invoices POST] approvals insert failed:', err?.message || err);
        }
      }

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

    // Single source of truth for invoice approvals — see ensureInvoiceApproval
    // at the top of this file. assigned_to='1' (universal unclaimed), so any
    // logged-in user sees this in /approvals. The previous inline upsert
    // assigned_to=tenantId, which excluded the row from every user whose
    // approver id wasn't literally the tenant id.
    try {
      await ensureInvoiceApproval(invoiceId, validatedBy);
    } catch (err) {
      console.warn('[invoices /submit] approvals upsert failed:', err?.message || err);
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

  // GET /api/invoices/verify-irn?irn=&tenantId= — IRN sanity check.
  //
  // Pending the GSTN e-Invoice portal integration we accept any IRN that
  // satisfies the 64-hex-char shape per GSTN spec. If the same IRN already
  // exists on an invoice in this tenant the response also flags it so the
  // UI can warn about a likely duplicate.
  if (req.method === 'GET' && pathname === '/api/invoices/verify-irn') {
    const url = new URL(req.url, 'http://localhost');
    const irn = (url.searchParams.get('irn') || '').trim();
    const tenantId = req.headers['x-tenant-id'] || url.searchParams.get('tenantId');
    if (!irn) {
      return (sendJson(res, 400, { success: false, error: 'irn query param required' }), true);
    }
    if (!tenantId) {
      return (sendJson(res, 400, { success: false, error: 'tenantId required' }), true);
    }
    const wellFormed = /^[A-Fa-f0-9]{64}$/.test(irn);
    if (!wellFormed) {
      return (
        sendJson(res, 200, {
          success: true,
          valid: false,
          wellFormed: false,
          match: null,
        }),
        true
      );
    }
    const rows = await query(
      'SELECT id, invoice_number, vendor_name FROM invoices WHERE irn = ? AND tenant_id = ? LIMIT 1',
      [irn, tenantId]
    );
    return (
      sendJson(res, 200, {
        success: true,
        valid: true,
        wellFormed: true,
        existingInvoice: rows.length > 0,
        match: rows[0] || null,
      }),
      true
    );
  }

  // GET /api/invoices/check-duplicate?invoiceNumber=&vendorId=&tenantId=
  //
  // Two-stage duplicate check used by the Non-PO invoice form:
  //   • exact: same (invoice_number, vendor_id, tenant_id) on a non-cancelled
  //     row → hard-stop the submit.
  //   • fuzzy: top-3 similar invoice_numbers for the same vendor (Levenshtein
  //     distance ≤ 2 OR prefix match) → amber non-blocking warning.
  if (req.method === 'GET' && pathname === '/api/invoices/check-duplicate') {
    const url = new URL(req.url, 'http://localhost');
    const invoiceNumber = (url.searchParams.get('invoiceNumber') || '').trim();
    const vendorId = (url.searchParams.get('vendorId') || '').trim();
    const tenantId = req.headers['x-tenant-id'] || url.searchParams.get('tenantId');
    if (!invoiceNumber) {
      return (
        sendJson(res, 400, { success: false, error: 'invoiceNumber query param required' }),
        true
      );
    }
    if (!vendorId) {
      return (sendJson(res, 400, { success: false, error: 'vendorId query param required' }), true);
    }
    if (!tenantId) {
      return (sendJson(res, 400, { success: false, error: 'tenantId required' }), true);
    }

    // Exact match first — cancelled rows excluded so a re-entry after a
    // cancellation isn't falsely blocked.
    const exactRows = await query(
      `SELECT id, invoice_number, invoice_date, status
         FROM invoices
        WHERE invoice_number = ? AND vendor_id = ? AND tenant_id = ?
          AND (status IS NULL OR status NOT IN ('cancelled','rejected'))
        LIMIT 1`,
      [invoiceNumber, vendorId, tenantId]
    );
    if (exactRows.length) {
      const hit = exactRows[0];
      return (
        sendJson(res, 200, {
          success: true,
          exact: {
            id: hit.id,
            invoiceNumber: hit.invoice_number,
            invoiceDate: hit.invoice_date,
            status: hit.status,
          },
          fuzzy: [],
        }),
        true
      );
    }

    // Fuzzy stage — pull all this vendor's invoice numbers in this tenant
    // and rank by edit distance to the input. Caps at the top 3 with distance
    // ≤ 2 (so INV-001 / INV-0O1 / INV001 all surface for INV-001).
    const candidates = await query(
      `SELECT invoice_number, invoice_date
         FROM invoices
        WHERE vendor_id = ? AND tenant_id = ?
          AND invoice_number IS NOT NULL
          AND invoice_number != ''
          AND (status IS NULL OR status NOT IN ('cancelled','rejected'))
        ORDER BY created_at DESC
        LIMIT 200`,
      [vendorId, tenantId]
    );

    const lev = (a, b) => {
      if (a === b) return 0;
      if (!a.length) return b.length;
      if (!b.length) return a.length;
      const m = a.length;
      const n = b.length;
      const dp = new Array(n + 1);
      for (let j = 0; j <= n; j++) dp[j] = j;
      for (let i = 1; i <= m; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= n; j++) {
          const tmp = dp[j];
          dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
          prev = tmp;
        }
      }
      return dp[n];
    };
    const needle = invoiceNumber.toLowerCase();
    const scored = candidates
      .map((row) => ({
        invoiceNumber: row.invoice_number,
        invoiceDate: row.invoice_date,
        distance: lev(needle, String(row.invoice_number).toLowerCase()),
      }))
      .filter((r) => r.distance > 0 && r.distance <= 2)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    return (
      sendJson(res, 200, {
        success: true,
        exact: null,
        fuzzy: scored,
      }),
      true
    );
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
