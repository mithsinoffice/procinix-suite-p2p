/**
 * Procurement domain route — PR / PO / GRN / SRN.
 *
 * Replaces the JSON-blob ProcurementDataContext with a relational backend:
 * doc_ref_sequences (collision-safe numbering), purchase_requests +
 * purchase_request_items, purchase_orders_proc + purchase_order_items
 * (the legacy `purchase_orders` table is kept untouched for invoice
 * matching), po_pr_links, goods_receipt_notes + grn_items,
 * service_receipt_notes + srn_items, procurement_audit_log.
 *
 * Endpoints (all tenant-scoped via X-Tenant-Id):
 *   PRs:  GET /api/procurement/prs[, summary, /:id, /:id/audit]
 *         POST … create / submit / approve / reject / cancel
 *         PUT  /:id  (draft only)
 *   POs:  GET /api/procurement/pos[, /:id, /:id/audit, /:id/match-status]
 *         POST … create / issue / close / cancel
 *         PUT  /:id  (draft only)
 *   GRN:  GET /api/procurement/grns[, /:id, /:id/audit]
 *         POST … create / confirm
 *   SRN:  GET /api/procurement/srns[, /:id, /:id/audit]
 *         POST … create / confirm
 */

import { randomUUID } from 'node:crypto';
import { query, withTransaction, connExecute } from '../mysql.mjs';
import { isPaymentApprover } from './payments.mjs';

// ── Constants ───────────────────────────────────────────────────────────────

const VALID_PR_TYPES = new Set([
  'regular',
  'catalogue',
  'kit_bundle',
  'service',
  'asset_capex',
  'blanket',
]);
const VALID_PO_TYPES = new Set(['regular', 'service', 'asset_capex', 'blanket']);
const VALID_PR_STATUSES = new Set([
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'converted_to_po',
  'cancelled',
]);
const VALID_PO_STATUSES = new Set([
  'draft',
  'issued',
  'partially_received',
  'fully_received',
  'invoiced',
  'closed',
  'cancelled',
]);
const VALID_RECEIPT_STATUSES = new Set(['draft', 'confirmed', 'cancelled']);
const VALID_ITEM_TYPES = new Set(['material', 'service', 'asset', 'kit']);
const VALID_GST_TYPES = new Set(['IGST', 'CGST_SGST', 'exempt']);

// ── Request helpers ─────────────────────────────────────────────────────────

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

// ── Doc ref generator (collision-safe, per tenant/entity/year/doc-type) ─────

/**
 * Returns the next ref string like `PR-PTPL-2026-0001`. Runs inside a
 * transaction with SELECT ... FOR UPDATE so two concurrent callers can't
 * grab the same number. Auto-creates the row on first use.
 */
export async function nextDocRef(tenantId, entityCode, docType) {
  const year = new Date().getUTCFullYear();
  return withTransaction(async (conn) => {
    await connExecute(
      conn,
      `INSERT INTO doc_ref_sequences (id, tenant_id, entity_code, doc_type, year, last_seq)
         VALUES (?, ?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE tenant_id = tenant_id`,
      [randomUUID(), tenantId, entityCode, docType, year]
    );
    const [rows] = await conn.execute(
      `SELECT last_seq FROM doc_ref_sequences
        WHERE tenant_id = ? AND entity_code = ? AND doc_type = ? AND year = ?
        FOR UPDATE`,
      [tenantId, entityCode, docType, year]
    );
    const last = rows[0]?.last_seq ?? 0;
    const seq = Number(last) + 1;
    await connExecute(
      conn,
      `UPDATE doc_ref_sequences SET last_seq = ?
        WHERE tenant_id = ? AND entity_code = ? AND doc_type = ? AND year = ?`,
      [seq, tenantId, entityCode, docType, year]
    );
    return `${docType}-${entityCode}-${year}-${String(seq).padStart(4, '0')}`;
  });
}

// ── GST auto-calculation ────────────────────────────────────────────────────

/**
 * Compute GST for a single line. State code = first 2 digits of GSTIN.
 * vendorState === entityState → CGST_SGST, else IGST. Missing GSTIN → IGST
 * (safer default for inter-state goods).
 */
export function computeLineGst({ lineAmount, gstRate, vendorGstin, entityGstin }) {
  const amt = Number(lineAmount) || 0;
  const rate = Number(gstRate) || 0;
  const vState = String(vendorGstin || '').slice(0, 2);
  const eState = String(entityGstin || '').slice(0, 2);
  let gstType = 'IGST';
  if (rate === 0) {
    gstType = 'exempt';
  } else if (vState && eState && vState === eState) {
    gstType = 'CGST_SGST';
  }
  const gstAmount = +(amt * (rate / 100)).toFixed(2);
  return { gstType, gstAmount, totalWithGst: +(amt + gstAmount).toFixed(2) };
}

// ── Audit log helper ────────────────────────────────────────────────────────

async function writeAudit({
  conn,
  tenantId,
  docType,
  docId,
  docRef,
  action,
  changedBy,
  changedByName,
  fieldName = null,
  oldValue = null,
  newValue = null,
  remarks = null,
}) {
  const sql = `INSERT INTO procurement_audit_log
      (id, tenant_id, doc_type, doc_id, doc_ref, action, changed_by, changed_by_name,
       changed_at, field_name, old_value, new_value, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)`;
  const params = [
    randomUUID(),
    tenantId,
    docType,
    docId,
    docRef,
    action,
    changedBy || null,
    changedByName || null,
    fieldName,
    oldValue == null ? null : String(oldValue).slice(0, 65000),
    newValue == null ? null : String(newValue).slice(0, 65000),
    remarks,
  ];
  if (conn) await connExecute(conn, sql, params);
  else await query(sql, params);
}

// ── Adapters (DB row → API shape) ───────────────────────────────────────────

function adaptPR(row, items = []) {
  if (!row) return null;
  return {
    id: row.id,
    prRef: row.pr_ref,
    tenantId: row.tenant_id,
    entityId: row.entity_id,
    entityCode: row.entity_code,
    prType: row.pr_type,
    requesterId: row.requester_id,
    requesterName: row.requester_name,
    department: row.department || '',
    costCentre: row.cost_centre || '',
    deliveryLocation: row.delivery_location || '',
    needByDate: row.need_by_date ? String(row.need_by_date).slice(0, 10) : null,
    businessJustification: row.business_justification || '',
    priority: row.priority || 'medium',
    totalAmount: Number(row.total_amount) || 0,
    totalGst: Number(row.total_gst) || 0,
    currency: row.currency || 'INR',
    status: row.status,
    approvedBy: row.approved_by ?? null,
    approvedAt: row.approved_at ?? null,
    rejectedBy: row.rejected_by ?? null,
    rejectedAt: row.rejected_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    blanketCeiling: row.blanket_ceiling != null ? Number(row.blanket_ceiling) : null,
    blanketValidityFrom: row.blanket_validity_from
      ? String(row.blanket_validity_from).slice(0, 10)
      : null,
    blanketValidityTo: row.blanket_validity_to
      ? String(row.blanket_validity_to).slice(0, 10)
      : null,
    assetClass: row.asset_class ?? null,
    capexBudgetRef: row.capex_budget_ref ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lineItems: items.map(adaptPRItem),
  };
}

function adaptPRItem(row) {
  return {
    id: row.id,
    prId: row.pr_id,
    lineNumber: row.line_number,
    itemType: row.item_type,
    itemCode: row.item_code || '',
    itemDescription: row.item_description || '',
    vendorId: row.vendor_id || null,
    vendorName: row.vendor_name || null,
    quantity: Number(row.quantity) || 0,
    unit: row.unit || '',
    unitPrice: Number(row.unit_price) || 0,
    priceVariancePct: row.price_variance_pct != null ? Number(row.price_variance_pct) : null,
    parentLineId: row.parent_line_id ?? null,
    isKitParent: !!row.is_kit_parent,
    servicePeriodFrom: row.service_period_from
      ? String(row.service_period_from).slice(0, 10)
      : null,
    servicePeriodTo: row.service_period_to ? String(row.service_period_to).slice(0, 10) : null,
    assetTag: row.asset_tag ?? null,
    depreciationYears: row.depreciation_years ?? null,
    shipToLocation: row.ship_to_location || '',
    deliveryDate: row.delivery_date ? String(row.delivery_date).slice(0, 10) : null,
    lineAmount: Number(row.line_amount) || 0,
    gstRate: Number(row.gst_rate) || 0,
    gstType: row.gst_type || 'IGST',
    gstAmount: Number(row.gst_amount) || 0,
    totalWithGst: Number(row.total_with_gst) || 0,
  };
}

function adaptPO(row, items = []) {
  if (!row) return null;
  return {
    id: row.id,
    poRef: row.po_ref,
    tenantId: row.tenant_id,
    entityId: row.entity_id,
    entityCode: row.entity_code,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    vendorGstin: row.vendor_gstin || null,
    billToGstin: row.bill_to_gstin || null,
    poType: row.po_type,
    paymentTerms: row.payment_terms || '',
    deliveryTerms: row.delivery_terms || '',
    totalAmount: Number(row.total_amount) || 0,
    totalGst: Number(row.total_gst) || 0,
    totalWithGst: Number(row.total_with_gst) || 0,
    blanketCeiling: row.blanket_ceiling != null ? Number(row.blanket_ceiling) : null,
    blanketConsumed: Number(row.blanket_consumed) || 0,
    blanketValidityFrom: row.blanket_validity_from
      ? String(row.blanket_validity_from).slice(0, 10)
      : null,
    blanketValidityTo: row.blanket_validity_to
      ? String(row.blanket_validity_to).slice(0, 10)
      : null,
    status: row.status,
    issuedAt: row.issued_at ?? null,
    closedAt: row.closed_at ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lineItems: items.map(adaptPOItem),
  };
}

function adaptPOItem(row) {
  return {
    id: row.id,
    poId: row.po_id,
    prItemId: row.pr_item_id ?? null,
    lineNumber: row.line_number,
    itemType: row.item_type,
    itemCode: row.item_code || '',
    itemDescription: row.item_description || '',
    quantity: Number(row.quantity) || 0,
    unit: row.unit || '',
    unitPrice: Number(row.unit_price) || 0,
    lineAmount: Number(row.line_amount) || 0,
    gstRate: Number(row.gst_rate) || 0,
    gstType: row.gst_type || 'IGST',
    gstAmount: Number(row.gst_amount) || 0,
    totalWithGst: Number(row.total_with_gst) || 0,
    shipToLocation: row.ship_to_location || '',
    deliveryDate: row.delivery_date ? String(row.delivery_date).slice(0, 10) : null,
    qtyReceived: Number(row.qty_received) || 0,
    amountConsumed: Number(row.amount_consumed) || 0,
    matchStatus: row.match_status || 'pending',
  };
}

function adaptGRN(row, items = []) {
  if (!row) return null;
  return {
    id: row.id,
    grnRef: row.grn_ref,
    poId: row.po_id,
    tenantId: row.tenant_id,
    entityId: row.entity_id,
    entityCode: row.entity_code,
    vendorId: row.vendor_id ?? null,
    receiptDate: row.receipt_date ? String(row.receipt_date).slice(0, 10) : null,
    receivedBy: row.received_by ?? null,
    deliveryNoteNo: row.delivery_note_no ?? null,
    vehicleNo: row.vehicle_no ?? null,
    remarks: row.remarks ?? null,
    status: row.status,
    confirmedAt: row.confirmed_at ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((it) => ({
      id: it.id,
      grnId: it.grn_id,
      poItemId: it.po_item_id,
      lineNumber: it.line_number,
      itemDescription: it.item_description || '',
      qtyOrdered: Number(it.qty_ordered) || 0,
      qtyReceived: Number(it.qty_received) || 0,
      qtyAccepted: Number(it.qty_accepted) || 0,
      qtyRejected: Number(it.qty_rejected) || 0,
      rejectionReason: it.rejection_reason ?? null,
      unit: it.unit || '',
      unitPrice: Number(it.unit_price) || 0,
      lineAmount: Number(it.line_amount) || 0,
    })),
  };
}

function adaptSRN(row, items = []) {
  if (!row) return null;
  return {
    id: row.id,
    srnRef: row.srn_ref,
    poId: row.po_id,
    tenantId: row.tenant_id,
    entityId: row.entity_id,
    entityCode: row.entity_code,
    vendorId: row.vendor_id ?? null,
    servicePeriodFrom: row.service_period_from
      ? String(row.service_period_from).slice(0, 10)
      : null,
    servicePeriodTo: row.service_period_to ? String(row.service_period_to).slice(0, 10) : null,
    receiptDate: row.receipt_date ? String(row.receipt_date).slice(0, 10) : null,
    acceptedBy: row.accepted_by ?? null,
    remarks: row.remarks ?? null,
    status: row.status,
    confirmedAt: row.confirmed_at ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((it) => ({
      id: it.id,
      srnId: it.srn_id,
      poItemId: it.po_item_id,
      lineNumber: it.line_number,
      serviceDescription: it.service_description || '',
      poLineValue: Number(it.po_line_value) || 0,
      amountConsumed: Number(it.amount_consumed) || 0,
      consumptionPct: Number(it.consumption_pct) || 0,
      milestone: it.milestone || '',
      remarks: it.remarks || '',
    })),
  };
}

// ── 3-way match (exported for agent pipeline) ───────────────────────────────

/**
 * Line-level 3-way match for a procurement PO. For each line:
 *   • material lines  → matched if SUM(grn_items.qty_accepted) ≥ poLine.quantity
 *   • service lines   → matched if SUM(srn_items.amount_consumed) ≥ poLine.line_amount
 * Header-level matched only if every line is matched.
 *
 * Side effect: updates purchase_order_items.match_status per line.
 *
 * Returns null when poId is null/empty so non-PO invoices can be skipped.
 */
export async function evaluatePOMatch(poId, tenantId) {
  if (!poId || !tenantId) return null;
  const poRows = await query(
    `SELECT id, po_ref, status FROM purchase_orders_proc WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [poId, tenantId]
  );
  if (!poRows.length) return null;
  const po = poRows[0];

  const lines = await query(
    `SELECT id, line_number, item_type, quantity, line_amount, match_status
       FROM purchase_order_items WHERE po_id = ? AND tenant_id = ?
       ORDER BY line_number`,
    [poId, tenantId]
  );

  const grnAgg = await query(
    `SELECT po_item_id, COALESCE(SUM(qty_accepted), 0) AS qty_total
       FROM grn_items gi
       JOIN goods_receipt_notes g ON g.id = gi.grn_id
       WHERE g.po_id = ? AND g.tenant_id = ? AND g.status = 'confirmed'
       GROUP BY po_item_id`,
    [poId, tenantId]
  );
  const grnByItem = new Map(grnAgg.map((r) => [r.po_item_id, Number(r.qty_total) || 0]));

  const srnAgg = await query(
    `SELECT po_item_id, COALESCE(SUM(amount_consumed), 0) AS amt_total
       FROM srn_items si
       JOIN service_receipt_notes s ON s.id = si.srn_id
       WHERE s.po_id = ? AND s.tenant_id = ? AND s.status = 'confirmed'
       GROUP BY po_item_id`,
    [poId, tenantId]
  );
  const srnByItem = new Map(srnAgg.map((r) => [r.po_item_id, Number(r.amt_total) || 0]));

  const lineResults = [];
  let allMatched = true;
  for (const line of lines) {
    const grnQty = grnByItem.get(line.id) || 0;
    const srnVal = srnByItem.get(line.id) || 0;
    let matched;
    let detail;
    if (line.item_type === 'service') {
      const target = Number(line.line_amount) || 0;
      matched = srnVal >= target && target > 0;
      detail = { srnValue: srnVal, poLineValue: target };
    } else {
      const target = Number(line.quantity) || 0;
      matched = grnQty >= target && target > 0;
      detail = { grnQty, poQty: target };
    }
    if (!matched) allMatched = false;
    const newStatus = matched
      ? 'matched'
      : grnQty > 0 || srnVal > 0
        ? 'partial'
        : line.match_status === 'exception'
          ? 'exception'
          : 'pending';
    if (newStatus !== line.match_status) {
      await query(`UPDATE purchase_order_items SET match_status = ? WHERE id = ?`, [
        newStatus,
        line.id,
      ]);
    }
    lineResults.push({
      poItemId: line.id,
      lineNumber: line.line_number,
      itemType: line.item_type,
      matched,
      matchStatus: newStatus,
      ...detail,
    });
  }

  return {
    poId,
    poRef: po.po_ref,
    headerMatched: allMatched && lineResults.length > 0,
    lines: lineResults,
    summary: {
      total: lineResults.length,
      matched: lineResults.filter((l) => l.matched).length,
    },
  };
}

// ── Validation ──────────────────────────────────────────────────────────────

function validatePRPayload(body, { partial = false } = {}) {
  const errors = [];
  const required = ['entityId', 'entityCode', 'prType', 'requesterId', 'requesterName'];
  if (!partial) {
    for (const k of required) {
      if (body[k] == null || body[k] === '') errors.push(`${k} required`);
    }
  }
  if (body.prType != null && !VALID_PR_TYPES.has(body.prType)) {
    errors.push(`prType must be one of: ${[...VALID_PR_TYPES].join(', ')}`);
  }
  if (Array.isArray(body.lineItems)) {
    body.lineItems.forEach((li, idx) => {
      if (li.itemType && !VALID_ITEM_TYPES.has(li.itemType)) {
        errors.push(`lineItems[${idx}].itemType invalid`);
      }
      if (li.quantity != null && Number(li.quantity) < 0) {
        errors.push(`lineItems[${idx}].quantity must be >= 0`);
      }
      if (li.unitPrice != null && Number(li.unitPrice) < 0) {
        errors.push(`lineItems[${idx}].unitPrice must be >= 0`);
      }
      // Regular PR vendor requirement: every line must have a vendor.
      if (body.prType === 'regular' && !li.vendorId && !li.vendorName) {
        errors.push(`lineItems[${idx}].vendor required for Regular PR`);
      }
    });
  }
  return errors;
}

function validatePOPayload(body) {
  const errors = [];
  const required = ['entityId', 'entityCode', 'vendorId', 'vendorName', 'poType'];
  for (const k of required) {
    if (body[k] == null || body[k] === '') errors.push(`${k} required`);
  }
  if (body.poType != null && !VALID_PO_TYPES.has(body.poType)) {
    errors.push(`poType must be one of: ${[...VALID_PO_TYPES].join(', ')}`);
  }
  if (!Array.isArray(body.prIds) || body.prIds.length === 0) {
    errors.push('prIds required (non-empty array)');
  }
  return errors;
}

function validateGRNPayload(body) {
  const errors = [];
  if (!body.poId) errors.push('poId required');
  if (!body.receiptDate) errors.push('receiptDate required');
  if (!Array.isArray(body.items) || body.items.length === 0) errors.push('items required');
  if (body.entityId == null || body.entityCode == null) {
    errors.push('entityId & entityCode required');
  }
  return errors;
}

function validateSRNPayload(body) {
  const errors = [];
  if (!body.poId) errors.push('poId required');
  if (!body.receiptDate) errors.push('receiptDate required');
  if (!Array.isArray(body.items) || body.items.length === 0) errors.push('items required');
  if (body.entityId == null || body.entityCode == null) {
    errors.push('entityId & entityCode required');
  }
  return errors;
}

// ── PR endpoints ────────────────────────────────────────────────────────────

async function handleListPRs(req, res, sendJson, url, tenantId) {
  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';
  const conds = ['tenant_id = ?'];
  const params = [tenantId];
  if (status && VALID_PR_STATUSES.has(status)) {
    conds.push('status = ?');
    params.push(status);
  }
  if (search) {
    conds.push('(pr_ref LIKE ? OR requester_name LIKE ? OR department LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const rows = await query(
    `SELECT * FROM purchase_requests WHERE ${conds.join(' AND ')}
       ORDER BY created_at DESC LIMIT 200`,
    params
  );
  sendJson(res, 200, { success: true, data: rows.map((r) => adaptPR(r)) });
}

async function handlePRSummary(req, res, sendJson, tenantId) {
  const rows = await query(
    `SELECT status, COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS amt
       FROM purchase_requests WHERE tenant_id = ? GROUP BY status`,
    [tenantId]
  );
  const byStatus = {};
  let total = 0;
  let totalAmount = 0;
  for (const r of rows) {
    byStatus[r.status] = Number(r.cnt) || 0;
    total += Number(r.cnt) || 0;
    totalAmount += Number(r.amt) || 0;
  }
  sendJson(res, 200, { success: true, data: { total, byStatus, totalAmount } });
}

async function handleGetPR(req, res, sendJson, tenantId, prId) {
  const headers = await query(
    `SELECT * FROM purchase_requests WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [prId, tenantId]
  );
  if (!headers.length) {
    sendJson(res, 404, { success: false, error: 'pr_not_found' });
    return;
  }
  const items = await query(
    `SELECT * FROM purchase_request_items WHERE pr_id = ? AND tenant_id = ? ORDER BY line_number`,
    [prId, tenantId]
  );
  sendJson(res, 200, { success: true, data: adaptPR(headers[0], items) });
}

async function handleCreatePR(req, res, sendJson, tenantId, body) {
  const errors = validatePRPayload(body);
  if (errors.length) {
    sendJson(res, 400, { success: false, error: 'validation_failed', details: errors });
    return;
  }
  const id = randomUUID();
  const prRef = await nextDocRef(tenantId, body.entityCode, 'PR');
  const actorId = readActorId(req) || body.requesterId || 'system';
  const actorName = readActorName(req) || body.requesterName || 'System';
  const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
  // Compute totals
  let totalAmount = 0;
  let totalGst = 0;
  const enrichedItems = lineItems.map((li, idx) => {
    const qty = Number(li.quantity) || 0;
    const price = Number(li.unitPrice) || 0;
    const lineAmount = +(qty * price).toFixed(2);
    const { gstType, gstAmount, totalWithGst } = computeLineGst({
      lineAmount,
      gstRate: li.gstRate,
      vendorGstin: li.vendorGstin || '',
      entityGstin: body.entityGstin || '',
    });
    totalAmount += lineAmount;
    totalGst += gstAmount;
    return { ...li, idx, lineAmount, gstType, gstAmount, totalWithGst };
  });

  await withTransaction(async (conn) => {
    await connExecute(
      conn,
      `INSERT INTO purchase_requests (
         id, pr_ref, tenant_id, entity_id, entity_code, pr_type, requester_id, requester_name,
         department, cost_centre, delivery_location, need_by_date, business_justification,
         priority, total_amount, total_gst, currency, status, blanket_ceiling,
         blanket_validity_from, blanket_validity_to, asset_class, capex_budget_ref, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
      [
        id,
        prRef,
        tenantId,
        body.entityId,
        body.entityCode,
        body.prType,
        body.requesterId,
        body.requesterName,
        body.department || null,
        body.costCentre || null,
        body.deliveryLocation || null,
        body.needByDate || null,
        body.businessJustification || null,
        body.priority || 'medium',
        +totalAmount.toFixed(2),
        +totalGst.toFixed(2),
        body.currency || 'INR',
        body.blanketCeiling != null ? Number(body.blanketCeiling) : null,
        body.blanketValidityFrom || null,
        body.blanketValidityTo || null,
        body.assetClass || null,
        body.capexBudgetRef || null,
        actorId,
      ]
    );
    for (const li of enrichedItems) {
      await connExecute(
        conn,
        `INSERT INTO purchase_request_items (
           id, pr_id, tenant_id, line_number, item_type, item_code, item_description,
           vendor_id, vendor_name, quantity, unit, unit_price, price_variance_pct,
           parent_line_id, is_kit_parent, service_period_from, service_period_to,
           asset_tag, depreciation_years, ship_to_location, delivery_date,
           line_amount, gst_rate, gst_type, gst_amount, total_with_gst
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          id,
          tenantId,
          li.idx + 1,
          li.itemType || 'material',
          li.itemCode || null,
          li.itemDescription || li.itemName || null,
          li.vendorId || null,
          li.vendorName || null,
          Number(li.quantity) || 0,
          li.unit || null,
          Number(li.unitPrice) || 0,
          li.priceVariancePct != null ? Number(li.priceVariancePct) : null,
          li.parentLineId || null,
          li.isKitParent ? 1 : 0,
          li.servicePeriodFrom || null,
          li.servicePeriodTo || null,
          li.assetTag || null,
          li.depreciationYears || null,
          li.shipToLocation || body.deliveryLocation || null,
          li.deliveryDate || body.needByDate || null,
          li.lineAmount,
          Number(li.gstRate) || 0,
          li.gstType,
          li.gstAmount,
          li.totalWithGst,
        ]
      );
    }
    await writeAudit({
      conn,
      tenantId,
      docType: 'PR',
      docId: id,
      docRef: prRef,
      action: 'created',
      changedBy: actorId,
      changedByName: actorName,
      remarks: `PR created (${enrichedItems.length} line items)`,
    });
  });

  const head = await query(`SELECT * FROM purchase_requests WHERE id = ? LIMIT 1`, [id]);
  const items = await query(
    `SELECT * FROM purchase_request_items WHERE pr_id = ? ORDER BY line_number`,
    [id]
  );
  sendJson(res, 200, { success: true, data: adaptPR(head[0], items) });
}

async function handleUpdatePR(req, res, sendJson, tenantId, prId, body) {
  const head = await query(
    `SELECT * FROM purchase_requests WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [prId, tenantId]
  );
  if (!head.length) {
    sendJson(res, 404, { success: false, error: 'pr_not_found' });
    return;
  }
  if (head[0].status !== 'draft') {
    sendJson(res, 400, { success: false, error: 'pr_not_editable', status: head[0].status });
    return;
  }
  const errors = validatePRPayload(body, { partial: true });
  if (errors.length) {
    sendJson(res, 400, { success: false, error: 'validation_failed', details: errors });
    return;
  }
  const fields = [];
  const params = [];
  const setIf = (col, val) => {
    if (val !== undefined) {
      fields.push(`${col} = ?`);
      params.push(val);
    }
  };
  setIf('department', body.department);
  setIf('cost_centre', body.costCentre);
  setIf('delivery_location', body.deliveryLocation);
  setIf('need_by_date', body.needByDate);
  setIf('business_justification', body.businessJustification);
  setIf('priority', body.priority);
  if (fields.length === 0 && !Array.isArray(body.lineItems)) {
    sendJson(res, 400, { success: false, error: 'no_changes' });
    return;
  }
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';

  await withTransaction(async (conn) => {
    if (fields.length) {
      params.push(prId, tenantId);
      await connExecute(
        conn,
        `UPDATE purchase_requests SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND tenant_id = ?`,
        params
      );
    }
    if (Array.isArray(body.lineItems)) {
      await connExecute(conn, `DELETE FROM purchase_request_items WHERE pr_id = ?`, [prId]);
      let totalAmount = 0;
      let totalGst = 0;
      for (let i = 0; i < body.lineItems.length; i++) {
        const li = body.lineItems[i];
        const qty = Number(li.quantity) || 0;
        const price = Number(li.unitPrice) || 0;
        const lineAmount = +(qty * price).toFixed(2);
        const { gstType, gstAmount, totalWithGst } = computeLineGst({
          lineAmount,
          gstRate: li.gstRate,
          vendorGstin: li.vendorGstin || '',
          entityGstin: body.entityGstin || '',
        });
        totalAmount += lineAmount;
        totalGst += gstAmount;
        await connExecute(
          conn,
          `INSERT INTO purchase_request_items (
             id, pr_id, tenant_id, line_number, item_type, item_code, item_description,
             vendor_id, vendor_name, quantity, unit, unit_price, line_amount,
             gst_rate, gst_type, gst_amount, total_with_gst
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            prId,
            tenantId,
            i + 1,
            li.itemType || 'material',
            li.itemCode || null,
            li.itemDescription || li.itemName || null,
            li.vendorId || null,
            li.vendorName || null,
            qty,
            li.unit || null,
            price,
            lineAmount,
            Number(li.gstRate) || 0,
            gstType,
            gstAmount,
            totalWithGst,
          ]
        );
      }
      await connExecute(
        conn,
        `UPDATE purchase_requests SET total_amount = ?, total_gst = ?,
             updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [+totalAmount.toFixed(2), +totalGst.toFixed(2), prId]
      );
    }
    await writeAudit({
      conn,
      tenantId,
      docType: 'PR',
      docId: prId,
      docRef: head[0].pr_ref,
      action: 'updated',
      changedBy: actorId,
      changedByName: actorName,
      remarks: 'PR draft edited',
    });
  });

  await handleGetPR(req, res, sendJson, tenantId, prId);
}

async function handleTransitionPR(req, res, sendJson, tenantId, prId, action, body) {
  const head = await query(
    `SELECT * FROM purchase_requests WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [prId, tenantId]
  );
  if (!head.length) {
    sendJson(res, 404, { success: false, error: 'pr_not_found' });
    return;
  }
  const cur = head[0];
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';

  if (action === 'submit') {
    if (cur.status !== 'draft') {
      sendJson(res, 400, { success: false, error: 'invalid_transition', from: cur.status });
      return;
    }
    await query(
      `UPDATE purchase_requests SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      [prId]
    );
    await writeAudit({
      tenantId,
      docType: 'PR',
      docId: prId,
      docRef: cur.pr_ref,
      action: 'submitted',
      changedBy: actorId,
      changedByName: actorName,
      fieldName: 'status',
      oldValue: cur.status,
      newValue: 'pending_approval',
    });
    sendJson(res, 200, { success: true, data: { id: prId, status: 'pending_approval' } });
    return;
  }
  if (action === 'approve') {
    if (!(await isPaymentApprover(req, tenantId))) {
      sendJson(res, 403, { success: false, error: 'not_approver' });
      return;
    }
    if (cur.status !== 'pending_approval') {
      sendJson(res, 400, { success: false, error: 'invalid_transition', from: cur.status });
      return;
    }
    await query(
      `UPDATE purchase_requests SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [actorId, prId]
    );
    await writeAudit({
      tenantId,
      docType: 'PR',
      docId: prId,
      docRef: cur.pr_ref,
      action: 'approved',
      changedBy: actorId,
      changedByName: actorName,
      fieldName: 'status',
      oldValue: cur.status,
      newValue: 'approved',
    });
    sendJson(res, 200, { success: true, data: { id: prId, status: 'approved' } });
    return;
  }
  if (action === 'reject') {
    if (!(await isPaymentApprover(req, tenantId))) {
      sendJson(res, 403, { success: false, error: 'not_approver' });
      return;
    }
    if (cur.status !== 'pending_approval') {
      sendJson(res, 400, { success: false, error: 'invalid_transition', from: cur.status });
      return;
    }
    const reason = String(body?.reason || '').trim() || 'No reason provided';
    await query(
      `UPDATE purchase_requests SET status = 'rejected', rejected_by = ?, rejected_at = CURRENT_TIMESTAMP,
           rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [actorId, reason, prId]
    );
    await writeAudit({
      tenantId,
      docType: 'PR',
      docId: prId,
      docRef: cur.pr_ref,
      action: 'rejected',
      changedBy: actorId,
      changedByName: actorName,
      fieldName: 'status',
      oldValue: cur.status,
      newValue: 'rejected',
      remarks: reason,
    });
    sendJson(res, 200, { success: true, data: { id: prId, status: 'rejected' } });
    return;
  }
  if (action === 'cancel') {
    if (!['draft', 'pending_approval'].includes(cur.status)) {
      sendJson(res, 400, { success: false, error: 'invalid_transition', from: cur.status });
      return;
    }
    await query(
      `UPDATE purchase_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [prId]
    );
    await writeAudit({
      tenantId,
      docType: 'PR',
      docId: prId,
      docRef: cur.pr_ref,
      action: 'cancelled',
      changedBy: actorId,
      changedByName: actorName,
      fieldName: 'status',
      oldValue: cur.status,
      newValue: 'cancelled',
    });
    sendJson(res, 200, { success: true, data: { id: prId, status: 'cancelled' } });
    return;
  }
  sendJson(res, 400, { success: false, error: 'unknown_action' });
}

async function handleAuditTrail(req, res, sendJson, tenantId, docType, docId) {
  const rows = await query(
    `SELECT * FROM procurement_audit_log
       WHERE tenant_id = ? AND doc_type = ? AND doc_id = ?
       ORDER BY changed_at ASC`,
    [tenantId, docType, docId]
  );
  sendJson(res, 200, {
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      docType: r.doc_type,
      docId: r.doc_id,
      docRef: r.doc_ref,
      action: r.action,
      changedBy: r.changed_by ?? null,
      changedByName: r.changed_by_name ?? null,
      changedAt: r.changed_at,
      fieldName: r.field_name ?? null,
      oldValue: r.old_value ?? null,
      newValue: r.new_value ?? null,
      remarks: r.remarks ?? null,
    })),
  });
}

// ── PO endpoints ────────────────────────────────────────────────────────────

async function handleListPOs(req, res, sendJson, url, tenantId) {
  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';
  const conds = ['tenant_id = ?'];
  const params = [tenantId];
  if (status && VALID_PO_STATUSES.has(status)) {
    conds.push('status = ?');
    params.push(status);
  }
  if (search) {
    conds.push('(po_ref LIKE ? OR vendor_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const rows = await query(
    `SELECT * FROM purchase_orders_proc WHERE ${conds.join(' AND ')}
       ORDER BY created_at DESC LIMIT 200`,
    params
  );
  sendJson(res, 200, { success: true, data: rows.map((r) => adaptPO(r)) });
}

async function handleGetPO(req, res, sendJson, tenantId, poId) {
  const headers = await query(
    `SELECT * FROM purchase_orders_proc WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [poId, tenantId]
  );
  if (!headers.length) {
    sendJson(res, 404, { success: false, error: 'po_not_found' });
    return;
  }
  const items = await query(
    `SELECT * FROM purchase_order_items WHERE po_id = ? AND tenant_id = ? ORDER BY line_number`,
    [poId, tenantId]
  );
  sendJson(res, 200, { success: true, data: adaptPO(headers[0], items) });
}

async function handleCreatePO(req, res, sendJson, tenantId, body) {
  const errors = validatePOPayload(body);
  if (errors.length) {
    sendJson(res, 400, { success: false, error: 'validation_failed', details: errors });
    return;
  }

  // Validate PRs: same tenant + all approved + same vendor + not converted
  const prs = await query(
    `SELECT id, pr_ref, tenant_id, status FROM purchase_requests
       WHERE id IN (${body.prIds.map(() => '?').join(',')})`,
    body.prIds
  );
  if (prs.length !== body.prIds.length) {
    sendJson(res, 400, { success: false, error: 'pr_not_found' });
    return;
  }
  for (const pr of prs) {
    if (pr.tenant_id !== tenantId) {
      sendJson(res, 400, { success: false, error: 'pr_tenant_mismatch', prId: pr.id });
      return;
    }
    if (pr.status !== 'approved') {
      sendJson(res, 400, {
        success: false,
        error: 'pr_not_approved',
        prId: pr.id,
        status: pr.status,
      });
      return;
    }
  }

  // Check no PR already converted_to_po (covered by status check above, but double-guard)
  const prItems = await query(
    `SELECT * FROM purchase_request_items
       WHERE pr_id IN (${body.prIds.map(() => '?').join(',')})
       ORDER BY pr_id, line_number`,
    body.prIds
  );
  // Same-vendor check: every line item should have the same vendor_id (or fall back to header vendor)
  const distinctVendors = new Set();
  for (const li of prItems) {
    if (li.vendor_id) distinctVendors.add(li.vendor_id);
  }
  if (distinctVendors.size > 1) {
    sendJson(res, 400, {
      success: false,
      error: 'mixed_vendors',
      details: `PRs span ${distinctVendors.size} vendors — single PO requires single vendor`,
    });
    return;
  }
  if (distinctVendors.size === 1 && !distinctVendors.has(body.vendorId)) {
    sendJson(res, 400, {
      success: false,
      error: 'vendor_mismatch',
      details: 'PR line vendor differs from PO header vendor',
    });
    return;
  }

  const id = randomUUID();
  const poRef = await nextDocRef(tenantId, body.entityCode, 'PO');
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';

  // Compute line amounts + GST per line using vendor + bill-to GSTINs
  let totalAmount = 0;
  let totalGst = 0;
  const enrichedLines = (
    Array.isArray(body.lineItems) && body.lineItems.length > 0
      ? body.lineItems
      : prItems.map((it) => ({
          prItemId: it.id,
          itemType: it.item_type,
          itemCode: it.item_code,
          itemDescription: it.item_description,
          quantity: Number(it.quantity) || 0,
          unit: it.unit,
          unitPrice: Number(it.unit_price) || 0,
          gstRate: Number(it.gst_rate) || 0,
          shipToLocation: it.ship_to_location,
          deliveryDate: it.delivery_date ? String(it.delivery_date).slice(0, 10) : null,
        }))
  ).map((li, idx) => {
    const qty = Number(li.quantity) || 0;
    const price = Number(li.unitPrice) || 0;
    const lineAmount = +(qty * price).toFixed(2);
    const { gstType, gstAmount, totalWithGst } = computeLineGst({
      lineAmount,
      gstRate: li.gstRate,
      vendorGstin: body.vendorGstin || '',
      entityGstin: body.billToGstin || '',
    });
    totalAmount += lineAmount;
    totalGst += gstAmount;
    return { ...li, idx, lineAmount, gstType, gstAmount, totalWithGst };
  });

  await withTransaction(async (conn) => {
    await connExecute(
      conn,
      `INSERT INTO purchase_orders_proc (
         id, po_ref, tenant_id, entity_id, entity_code, vendor_id, vendor_name,
         vendor_gstin, bill_to_gstin, po_type, payment_terms, delivery_terms,
         total_amount, total_gst, total_with_gst, blanket_ceiling, blanket_consumed,
         blanket_validity_from, blanket_validity_to, status, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'draft', ?)`,
      [
        id,
        poRef,
        tenantId,
        body.entityId,
        body.entityCode,
        body.vendorId,
        body.vendorName,
        body.vendorGstin || null,
        body.billToGstin || null,
        body.poType,
        body.paymentTerms || null,
        body.deliveryTerms || null,
        +totalAmount.toFixed(2),
        +totalGst.toFixed(2),
        +(totalAmount + totalGst).toFixed(2),
        body.blanketCeiling != null ? Number(body.blanketCeiling) : null,
        body.blanketValidityFrom || null,
        body.blanketValidityTo || null,
        actorId,
      ]
    );
    for (const li of enrichedLines) {
      await connExecute(
        conn,
        `INSERT INTO purchase_order_items (
           id, po_id, pr_item_id, tenant_id, line_number, item_type, item_code,
           item_description, quantity, unit, unit_price, line_amount, gst_rate,
           gst_type, gst_amount, total_with_gst, ship_to_location, delivery_date,
           qty_received, amount_consumed, match_status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'pending')`,
        [
          randomUUID(),
          id,
          li.prItemId || null,
          tenantId,
          li.idx + 1,
          li.itemType || 'material',
          li.itemCode || null,
          li.itemDescription || null,
          Number(li.quantity) || 0,
          li.unit || null,
          Number(li.unitPrice) || 0,
          li.lineAmount,
          Number(li.gstRate) || 0,
          li.gstType,
          li.gstAmount,
          li.totalWithGst,
          li.shipToLocation || null,
          li.deliveryDate || null,
        ]
      );
    }
    // Create po_pr_links + flip PR status
    for (const prId of body.prIds) {
      await connExecute(
        conn,
        `INSERT INTO po_pr_links (id, po_id, pr_id, tenant_id) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE po_id = po_id`,
        [randomUUID(), id, prId, tenantId]
      );
      await connExecute(
        conn,
        `UPDATE purchase_requests SET status = 'converted_to_po', updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        [prId]
      );
    }
    await writeAudit({
      conn,
      tenantId,
      docType: 'PO',
      docId: id,
      docRef: poRef,
      action: 'created',
      changedBy: actorId,
      changedByName: actorName,
      remarks: `PO created from ${body.prIds.length} PR(s)`,
    });
  });

  const head = await query(`SELECT * FROM purchase_orders_proc WHERE id = ? LIMIT 1`, [id]);
  const items = await query(
    `SELECT * FROM purchase_order_items WHERE po_id = ? ORDER BY line_number`,
    [id]
  );
  sendJson(res, 200, { success: true, data: adaptPO(head[0], items) });
}

async function handleUpdatePO(req, res, sendJson, tenantId, poId, body) {
  const head = await query(
    `SELECT * FROM purchase_orders_proc WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [poId, tenantId]
  );
  if (!head.length) {
    sendJson(res, 404, { success: false, error: 'po_not_found' });
    return;
  }
  if (head[0].status !== 'draft') {
    sendJson(res, 400, { success: false, error: 'po_not_editable', status: head[0].status });
    return;
  }
  const fields = [];
  const params = [];
  if (body.paymentTerms !== undefined) {
    fields.push('payment_terms = ?');
    params.push(body.paymentTerms);
  }
  if (body.deliveryTerms !== undefined) {
    fields.push('delivery_terms = ?');
    params.push(body.deliveryTerms);
  }
  if (fields.length === 0) {
    sendJson(res, 400, { success: false, error: 'no_changes' });
    return;
  }
  params.push(poId);
  await query(
    `UPDATE purchase_orders_proc SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';
  await writeAudit({
    tenantId,
    docType: 'PO',
    docId: poId,
    docRef: head[0].po_ref,
    action: 'updated',
    changedBy: actorId,
    changedByName: actorName,
    remarks: 'PO draft edited',
  });
  await handleGetPO(req, res, sendJson, tenantId, poId);
}

async function handleTransitionPO(req, res, sendJson, tenantId, poId, action, body) {
  const head = await query(
    `SELECT * FROM purchase_orders_proc WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [poId, tenantId]
  );
  if (!head.length) {
    sendJson(res, 404, { success: false, error: 'po_not_found' });
    return;
  }
  const cur = head[0];
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';

  if (action === 'issue') {
    if (cur.status !== 'draft') {
      sendJson(res, 400, { success: false, error: 'invalid_transition', from: cur.status });
      return;
    }
    await query(
      `UPDATE purchase_orders_proc SET status = 'issued', issued_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [poId]
    );
    await writeAudit({
      tenantId,
      docType: 'PO',
      docId: poId,
      docRef: cur.po_ref,
      action: 'issued',
      changedBy: actorId,
      changedByName: actorName,
      fieldName: 'status',
      oldValue: cur.status,
      newValue: 'issued',
    });
    sendJson(res, 200, { success: true, data: { id: poId, status: 'issued' } });
    return;
  }
  if (action === 'close') {
    if (!['issued', 'partially_received', 'fully_received', 'invoiced'].includes(cur.status)) {
      sendJson(res, 400, { success: false, error: 'invalid_transition', from: cur.status });
      return;
    }
    await query(
      `UPDATE purchase_orders_proc SET status = 'closed', closed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [poId]
    );
    await writeAudit({
      tenantId,
      docType: 'PO',
      docId: poId,
      docRef: cur.po_ref,
      action: 'closed',
      changedBy: actorId,
      changedByName: actorName,
      fieldName: 'status',
      oldValue: cur.status,
      newValue: 'closed',
      remarks: body?.remarks || null,
    });
    sendJson(res, 200, { success: true, data: { id: poId, status: 'closed' } });
    return;
  }
  if (action === 'cancel') {
    if (!['draft', 'issued'].includes(cur.status)) {
      sendJson(res, 400, { success: false, error: 'invalid_transition', from: cur.status });
      return;
    }
    await query(
      `UPDATE purchase_orders_proc SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [poId]
    );
    await writeAudit({
      tenantId,
      docType: 'PO',
      docId: poId,
      docRef: cur.po_ref,
      action: 'cancelled',
      changedBy: actorId,
      changedByName: actorName,
      fieldName: 'status',
      oldValue: cur.status,
      newValue: 'cancelled',
      remarks: body?.reason || null,
    });
    sendJson(res, 200, { success: true, data: { id: poId, status: 'cancelled' } });
    return;
  }
  sendJson(res, 400, { success: false, error: 'unknown_action' });
}

async function handlePOMatchStatus(req, res, sendJson, tenantId, poId) {
  const result = await evaluatePOMatch(poId, tenantId);
  if (!result) {
    sendJson(res, 404, { success: false, error: 'po_not_found' });
    return;
  }
  sendJson(res, 200, { success: true, data: result });
}

// ── Receipt header status helper ────────────────────────────────────────────

async function refreshPOReceiptStatus(conn, poId, tenantId) {
  const lines = await connExecute(
    conn,
    `SELECT id, item_type, quantity, line_amount, qty_received, amount_consumed
       FROM purchase_order_items WHERE po_id = ? AND tenant_id = ?`,
    [poId, tenantId]
  );
  if (!lines.length) return;
  let anyReceived = false;
  let allSatisfied = true;
  for (const l of lines) {
    if (l.item_type === 'service') {
      const amt = Number(l.amount_consumed) || 0;
      const target = Number(l.line_amount) || 0;
      if (amt > 0) anyReceived = true;
      if (target <= 0 || amt < target) allSatisfied = false;
    } else {
      const qty = Number(l.qty_received) || 0;
      const target = Number(l.quantity) || 0;
      if (qty > 0) anyReceived = true;
      if (target <= 0 || qty < target) allSatisfied = false;
    }
  }
  let newStatus = null;
  if (allSatisfied) newStatus = 'fully_received';
  else if (anyReceived) newStatus = 'partially_received';
  if (newStatus) {
    await connExecute(
      conn,
      `UPDATE purchase_orders_proc SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status IN ('issued','partially_received')`,
      [newStatus, poId]
    );
  }
}

// ── GRN endpoints ───────────────────────────────────────────────────────────

async function handleListGRNs(req, res, sendJson, url, tenantId) {
  const conds = ['tenant_id = ?'];
  const params = [tenantId];
  const status = url.searchParams.get('status') || '';
  if (status && VALID_RECEIPT_STATUSES.has(status)) {
    conds.push('status = ?');
    params.push(status);
  }
  const poId = url.searchParams.get('poId');
  if (poId) {
    conds.push('po_id = ?');
    params.push(poId);
  }
  const rows = await query(
    `SELECT * FROM goods_receipt_notes WHERE ${conds.join(' AND ')}
       ORDER BY created_at DESC LIMIT 200`,
    params
  );
  sendJson(res, 200, { success: true, data: rows.map((r) => adaptGRN(r)) });
}

async function handleGetGRN(req, res, sendJson, tenantId, grnId) {
  const head = await query(
    `SELECT * FROM goods_receipt_notes WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [grnId, tenantId]
  );
  if (!head.length) {
    sendJson(res, 404, { success: false, error: 'grn_not_found' });
    return;
  }
  const items = await query(
    `SELECT * FROM grn_items WHERE grn_id = ? AND tenant_id = ? ORDER BY line_number`,
    [grnId, tenantId]
  );
  sendJson(res, 200, { success: true, data: adaptGRN(head[0], items) });
}

async function handleCreateGRN(req, res, sendJson, tenantId, body) {
  const errors = validateGRNPayload(body);
  if (errors.length) {
    sendJson(res, 400, { success: false, error: 'validation_failed', details: errors });
    return;
  }
  // Verify PO + per-line over-receipt protection
  const po = await query(
    `SELECT id, po_ref, status FROM purchase_orders_proc WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [body.poId, tenantId]
  );
  if (!po.length) {
    sendJson(res, 400, { success: false, error: 'po_not_found' });
    return;
  }
  const poItems = await query(
    `SELECT id, line_number, quantity, qty_received, item_description, unit, unit_price
       FROM purchase_order_items WHERE po_id = ? AND tenant_id = ?`,
    [body.poId, tenantId]
  );
  const itemMap = new Map(poItems.map((it) => [it.id, it]));
  for (const inItem of body.items) {
    const poi = itemMap.get(inItem.poItemId);
    if (!poi) {
      sendJson(res, 400, {
        success: false,
        error: 'po_item_not_found',
        poItemId: inItem.poItemId,
      });
      return;
    }
    const newQty = Number(inItem.qtyReceived) || 0;
    const target = Number(poi.quantity) || 0;
    const already = Number(poi.qty_received) || 0;
    if (newQty <= 0) {
      sendJson(res, 400, { success: false, error: 'qty_must_be_positive' });
      return;
    }
    if (already + newQty > target) {
      sendJson(res, 400, {
        success: false,
        error: 'over_receipt',
        poItemId: inItem.poItemId,
        ordered: target,
        alreadyReceived: already,
        attempted: newQty,
      });
      return;
    }
  }

  const id = randomUUID();
  const grnRef = await nextDocRef(tenantId, body.entityCode, 'GRN');
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';

  await withTransaction(async (conn) => {
    await connExecute(
      conn,
      `INSERT INTO goods_receipt_notes (
         id, grn_ref, po_id, tenant_id, entity_id, entity_code, vendor_id, receipt_date,
         received_by, delivery_note_no, vehicle_no, remarks, status, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [
        id,
        grnRef,
        body.poId,
        tenantId,
        body.entityId,
        body.entityCode,
        body.vendorId || null,
        body.receiptDate,
        body.receivedBy || actorName,
        body.deliveryNoteNo || null,
        body.vehicleNo || null,
        body.remarks || null,
        actorId,
      ]
    );
    for (let i = 0; i < body.items.length; i++) {
      const it = body.items[i];
      const poi = itemMap.get(it.poItemId);
      const qtyReceived = Number(it.qtyReceived) || 0;
      const qtyAccepted =
        it.qtyAccepted != null
          ? Number(it.qtyAccepted)
          : qtyReceived - (Number(it.qtyRejected) || 0);
      const qtyRejected = Number(it.qtyRejected) || 0;
      const unitPrice = Number(it.unitPrice) || Number(poi.unit_price) || 0;
      const lineAmount = +(qtyAccepted * unitPrice).toFixed(2);
      await connExecute(
        conn,
        `INSERT INTO grn_items (
           id, grn_id, po_item_id, tenant_id, line_number, item_description,
           qty_ordered, qty_received, qty_accepted, qty_rejected, rejection_reason,
           unit, unit_price, line_amount
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          id,
          it.poItemId,
          tenantId,
          i + 1,
          it.itemDescription || poi.item_description || null,
          Number(poi.quantity) || 0,
          qtyReceived,
          qtyAccepted,
          qtyRejected,
          it.rejectionReason || null,
          it.unit || poi.unit || null,
          unitPrice,
          lineAmount,
        ]
      );
    }
    await writeAudit({
      conn,
      tenantId,
      docType: 'GRN',
      docId: id,
      docRef: grnRef,
      action: 'created',
      changedBy: actorId,
      changedByName: actorName,
      remarks: `GRN draft created against PO ${po[0].po_ref}`,
    });
  });

  const head = await query(`SELECT * FROM goods_receipt_notes WHERE id = ? LIMIT 1`, [id]);
  const items = await query(`SELECT * FROM grn_items WHERE grn_id = ? ORDER BY line_number`, [id]);
  sendJson(res, 200, { success: true, data: adaptGRN(head[0], items) });
}

async function handleConfirmGRN(req, res, sendJson, tenantId, grnId) {
  const head = await query(
    `SELECT * FROM goods_receipt_notes WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [grnId, tenantId]
  );
  if (!head.length) {
    sendJson(res, 404, { success: false, error: 'grn_not_found' });
    return;
  }
  if (head[0].status !== 'draft') {
    sendJson(res, 400, { success: false, error: 'invalid_transition', from: head[0].status });
    return;
  }
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';

  await withTransaction(async (conn) => {
    await connExecute(
      conn,
      `UPDATE goods_receipt_notes SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [grnId]
    );
    // Roll up qty_received onto purchase_order_items
    const items = await connExecute(
      conn,
      `SELECT po_item_id, qty_accepted FROM grn_items WHERE grn_id = ?`,
      [grnId]
    );
    for (const it of items) {
      await connExecute(
        conn,
        `UPDATE purchase_order_items SET qty_received = qty_received + ? WHERE id = ?`,
        [Number(it.qty_accepted) || 0, it.po_item_id]
      );
    }
    await refreshPOReceiptStatus(conn, head[0].po_id, tenantId);
    await writeAudit({
      conn,
      tenantId,
      docType: 'GRN',
      docId: grnId,
      docRef: head[0].grn_ref,
      action: 'confirmed',
      changedBy: actorId,
      changedByName: actorName,
      fieldName: 'status',
      oldValue: 'draft',
      newValue: 'confirmed',
    });
  });

  // Re-evaluate match status (best effort)
  try {
    await evaluatePOMatch(head[0].po_id, tenantId);
  } catch {
    /* non-critical */
  }

  sendJson(res, 200, { success: true, data: { id: grnId, status: 'confirmed' } });
}

// ── SRN endpoints ───────────────────────────────────────────────────────────

async function handleListSRNs(req, res, sendJson, url, tenantId) {
  const conds = ['tenant_id = ?'];
  const params = [tenantId];
  const status = url.searchParams.get('status') || '';
  if (status && VALID_RECEIPT_STATUSES.has(status)) {
    conds.push('status = ?');
    params.push(status);
  }
  const poId = url.searchParams.get('poId');
  if (poId) {
    conds.push('po_id = ?');
    params.push(poId);
  }
  const rows = await query(
    `SELECT * FROM service_receipt_notes WHERE ${conds.join(' AND ')}
       ORDER BY created_at DESC LIMIT 200`,
    params
  );
  sendJson(res, 200, { success: true, data: rows.map((r) => adaptSRN(r)) });
}

async function handleGetSRN(req, res, sendJson, tenantId, srnId) {
  const head = await query(
    `SELECT * FROM service_receipt_notes WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [srnId, tenantId]
  );
  if (!head.length) {
    sendJson(res, 404, { success: false, error: 'srn_not_found' });
    return;
  }
  const items = await query(
    `SELECT * FROM srn_items WHERE srn_id = ? AND tenant_id = ? ORDER BY line_number`,
    [srnId, tenantId]
  );
  sendJson(res, 200, { success: true, data: adaptSRN(head[0], items) });
}

async function handleCreateSRN(req, res, sendJson, tenantId, body) {
  const errors = validateSRNPayload(body);
  if (errors.length) {
    sendJson(res, 400, { success: false, error: 'validation_failed', details: errors });
    return;
  }
  const po = await query(
    `SELECT id, po_ref FROM purchase_orders_proc WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [body.poId, tenantId]
  );
  if (!po.length) {
    sendJson(res, 400, { success: false, error: 'po_not_found' });
    return;
  }
  const poItems = await query(
    `SELECT id, line_number, line_amount, amount_consumed
       FROM purchase_order_items WHERE po_id = ? AND tenant_id = ?`,
    [body.poId, tenantId]
  );
  const itemMap = new Map(poItems.map((it) => [it.id, it]));
  for (const inItem of body.items) {
    const poi = itemMap.get(inItem.poItemId);
    if (!poi) {
      sendJson(res, 400, {
        success: false,
        error: 'po_item_not_found',
        poItemId: inItem.poItemId,
      });
      return;
    }
    const target = Number(poi.line_amount) || 0;
    const already = Number(poi.amount_consumed) || 0;
    const newAmt = Number(inItem.amountConsumed) || 0;
    if (newAmt <= 0) {
      sendJson(res, 400, { success: false, error: 'amount_must_be_positive' });
      return;
    }
    if (already + newAmt > target) {
      sendJson(res, 400, {
        success: false,
        error: 'over_consumption',
        poItemId: inItem.poItemId,
        poLineValue: target,
        alreadyConsumed: already,
        attempted: newAmt,
      });
      return;
    }
  }

  const id = randomUUID();
  const srnRef = await nextDocRef(tenantId, body.entityCode, 'SRN');
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';

  await withTransaction(async (conn) => {
    await connExecute(
      conn,
      `INSERT INTO service_receipt_notes (
         id, srn_ref, po_id, tenant_id, entity_id, entity_code, vendor_id,
         service_period_from, service_period_to, receipt_date, accepted_by, remarks,
         status, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [
        id,
        srnRef,
        body.poId,
        tenantId,
        body.entityId,
        body.entityCode,
        body.vendorId || null,
        body.servicePeriodFrom || null,
        body.servicePeriodTo || null,
        body.receiptDate,
        body.acceptedBy || actorName,
        body.remarks || null,
        actorId,
      ]
    );
    for (let i = 0; i < body.items.length; i++) {
      const it = body.items[i];
      const poi = itemMap.get(it.poItemId);
      const target = Number(poi.line_amount) || 0;
      const newAmt = Number(it.amountConsumed) || 0;
      const pct = target > 0 ? +((newAmt / target) * 100).toFixed(2) : 0;
      await connExecute(
        conn,
        `INSERT INTO srn_items (
           id, srn_id, po_item_id, tenant_id, line_number, service_description,
           po_line_value, amount_consumed, consumption_pct, milestone, remarks
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          id,
          it.poItemId,
          tenantId,
          i + 1,
          it.serviceDescription || null,
          target,
          newAmt,
          pct,
          it.milestone || null,
          it.remarks || null,
        ]
      );
    }
    await writeAudit({
      conn,
      tenantId,
      docType: 'SRN',
      docId: id,
      docRef: srnRef,
      action: 'created',
      changedBy: actorId,
      changedByName: actorName,
      remarks: `SRN draft created against PO ${po[0].po_ref}`,
    });
  });

  const head = await query(`SELECT * FROM service_receipt_notes WHERE id = ? LIMIT 1`, [id]);
  const items = await query(`SELECT * FROM srn_items WHERE srn_id = ? ORDER BY line_number`, [id]);
  sendJson(res, 200, { success: true, data: adaptSRN(head[0], items) });
}

async function handleConfirmSRN(req, res, sendJson, tenantId, srnId) {
  const head = await query(
    `SELECT * FROM service_receipt_notes WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [srnId, tenantId]
  );
  if (!head.length) {
    sendJson(res, 404, { success: false, error: 'srn_not_found' });
    return;
  }
  if (head[0].status !== 'draft') {
    sendJson(res, 400, { success: false, error: 'invalid_transition', from: head[0].status });
    return;
  }
  const actorId = readActorId(req) || 'system';
  const actorName = readActorName(req) || 'System';

  await withTransaction(async (conn) => {
    await connExecute(
      conn,
      `UPDATE service_receipt_notes SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [srnId]
    );
    const items = await connExecute(
      conn,
      `SELECT po_item_id, amount_consumed FROM srn_items WHERE srn_id = ?`,
      [srnId]
    );
    for (const it of items) {
      await connExecute(
        conn,
        `UPDATE purchase_order_items SET amount_consumed = amount_consumed + ? WHERE id = ?`,
        [Number(it.amount_consumed) || 0, it.po_item_id]
      );
    }
    await refreshPOReceiptStatus(conn, head[0].po_id, tenantId);
    await writeAudit({
      conn,
      tenantId,
      docType: 'SRN',
      docId: srnId,
      docRef: head[0].srn_ref,
      action: 'confirmed',
      changedBy: actorId,
      changedByName: actorName,
      fieldName: 'status',
      oldValue: 'draft',
      newValue: 'confirmed',
    });
  });

  try {
    await evaluatePOMatch(head[0].po_id, tenantId);
  } catch {
    /* non-critical */
  }

  sendJson(res, 200, { success: true, data: { id: srnId, status: 'confirmed' } });
}

// ── Main route handler ─────────────────────────────────────────────────────

export async function handleProcurementRoute(req, res, pathname, sendJson) {
  if (!pathname.startsWith('/api/procurement/')) return false;

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const tenantId = readTenant(req, url);
  if (!tenantId) {
    sendJson(res, 400, { success: false, error: 'tenant_required' });
    return true;
  }

  try {
    // PRs ───────────────────────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/procurement/prs') {
      await handleListPRs(req, res, sendJson, url, tenantId);
      return true;
    }
    if (req.method === 'GET' && pathname === '/api/procurement/prs/summary') {
      await handlePRSummary(req, res, sendJson, tenantId);
      return true;
    }
    if (req.method === 'POST' && pathname === '/api/procurement/prs') {
      const body = await readJsonBody(req);
      await handleCreatePR(req, res, sendJson, tenantId, body);
      return true;
    }
    let m = pathname.match(/^\/api\/procurement\/prs\/([^/]+)\/audit$/);
    if (m && req.method === 'GET') {
      await handleAuditTrail(req, res, sendJson, tenantId, 'PR', m[1]);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/prs\/([^/]+)\/(submit|approve|reject|cancel)$/);
    if (m && req.method === 'POST') {
      const body = await readJsonBody(req);
      await handleTransitionPR(req, res, sendJson, tenantId, m[1], m[2], body);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/prs\/([^/]+)$/);
    if (m && req.method === 'GET') {
      await handleGetPR(req, res, sendJson, tenantId, m[1]);
      return true;
    }
    if (m && req.method === 'PUT') {
      const body = await readJsonBody(req);
      await handleUpdatePR(req, res, sendJson, tenantId, m[1], body);
      return true;
    }

    // POs ───────────────────────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/procurement/pos') {
      await handleListPOs(req, res, sendJson, url, tenantId);
      return true;
    }
    if (req.method === 'POST' && pathname === '/api/procurement/pos') {
      const body = await readJsonBody(req);
      await handleCreatePO(req, res, sendJson, tenantId, body);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/pos\/([^/]+)\/audit$/);
    if (m && req.method === 'GET') {
      await handleAuditTrail(req, res, sendJson, tenantId, 'PO', m[1]);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/pos\/([^/]+)\/match-status$/);
    if (m && req.method === 'GET') {
      await handlePOMatchStatus(req, res, sendJson, tenantId, m[1]);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/pos\/([^/]+)\/(issue|close|cancel)$/);
    if (m && req.method === 'POST') {
      const body = await readJsonBody(req);
      await handleTransitionPO(req, res, sendJson, tenantId, m[1], m[2], body);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/pos\/([^/]+)$/);
    if (m && req.method === 'GET') {
      await handleGetPO(req, res, sendJson, tenantId, m[1]);
      return true;
    }
    if (m && req.method === 'PUT') {
      const body = await readJsonBody(req);
      await handleUpdatePO(req, res, sendJson, tenantId, m[1], body);
      return true;
    }

    // GRNs ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/procurement/grns') {
      await handleListGRNs(req, res, sendJson, url, tenantId);
      return true;
    }
    if (req.method === 'POST' && pathname === '/api/procurement/grns') {
      const body = await readJsonBody(req);
      await handleCreateGRN(req, res, sendJson, tenantId, body);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/grns\/([^/]+)\/audit$/);
    if (m && req.method === 'GET') {
      await handleAuditTrail(req, res, sendJson, tenantId, 'GRN', m[1]);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/grns\/([^/]+)\/confirm$/);
    if (m && req.method === 'POST') {
      await handleConfirmGRN(req, res, sendJson, tenantId, m[1]);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/grns\/([^/]+)$/);
    if (m && req.method === 'GET') {
      await handleGetGRN(req, res, sendJson, tenantId, m[1]);
      return true;
    }

    // SRNs ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/procurement/srns') {
      await handleListSRNs(req, res, sendJson, url, tenantId);
      return true;
    }
    if (req.method === 'POST' && pathname === '/api/procurement/srns') {
      const body = await readJsonBody(req);
      await handleCreateSRN(req, res, sendJson, tenantId, body);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/srns\/([^/]+)\/audit$/);
    if (m && req.method === 'GET') {
      await handleAuditTrail(req, res, sendJson, tenantId, 'SRN', m[1]);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/srns\/([^/]+)\/confirm$/);
    if (m && req.method === 'POST') {
      await handleConfirmSRN(req, res, sendJson, tenantId, m[1]);
      return true;
    }
    m = pathname.match(/^\/api\/procurement\/srns\/([^/]+)$/);
    if (m && req.method === 'GET') {
      await handleGetSRN(req, res, sendJson, tenantId, m[1]);
      return true;
    }
  } catch (err) {
    console.error('[procurement] error:', err);
    sendJson(res, 500, { success: false, error: err.message || 'internal_error' });
    return true;
  }

  return false;
}

// Re-export for tests
export { validatePRPayload, validatePOPayload, validateGRNPayload, validateSRNPayload };
