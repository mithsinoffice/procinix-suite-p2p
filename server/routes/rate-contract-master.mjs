/**
 * Rate Contract master domain route.
 *
 * Pre-negotiated vendor × item rate agreements. Each contract has a header
 * (vendor, entity, start/end date, status) and a list of line items
 * (item_code, agreed_rate, currency, uom, gst_rate, hsn_code).
 *
 * Endpoints (all tenant-scoped via X-Tenant-Id):
 *   GET  /api/masters/rate_contract_master                 list with filters
 *   GET  /api/masters/rate_contract_master/:id             detail + items[]
 *   POST /api/masters/rate_contract_master                 create header + items
 *   PUT  /api/masters/rate_contract_master                 upsert (V2 batch path)
 *   PUT  /api/masters/rate_contract_master/:id             update one
 *   GET  /api/masters/rate_contract/lookup                 vendor×item lookup
 *
 * Lookup endpoint is the load-bearing one — every invoice line on
 * InvoiceFormDirectV2 / NonPOInvoiceForm calls it to auto-fill agreed rates.
 *
 * Registered BEFORE the generic /api/masters/<key> handler in server/index.mjs
 * because this master uses a bespoke header + items schema, not the canonical
 * record_code/record_name/payload shape.
 */

import { randomUUID } from 'node:crypto';
import { query, withTransaction, connExecute } from '../mysql.mjs';
import { nextDocRef } from './procurement.mjs';

// ── Helpers ────────────────────────────────────────────────────────────────

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

function readTenant(req) {
  const h = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
  return h ? String(h).trim() : '';
}

function readActor(req) {
  return String(req.user?.userId || req.user?.id || req.headers['x-user-id'] || 'system').trim();
}

function readQueryParams(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  return url.searchParams;
}

function toIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.slice(0, 10);
}

// ── DB row → API record adapters ───────────────────────────────────────────

function rowToContractRecord(headerRow, itemRows) {
  const items = itemRows.map((row) => ({
    id: String(row.id),
    itemId: row.item_id ?? '',
    itemCode: row.item_code ?? '',
    itemName: row.item_name ?? '',
    agreedRate: Number(row.agreed_rate ?? 0),
    currency: row.currency ?? 'INR',
    uom: row.uom ?? '',
    gstRate: Number(row.gst_rate ?? 0),
    hsnCode: row.hsn_code ?? '',
    lineNumber: Number(row.line_number ?? 0),
  }));
  return {
    id: String(headerRow.id),
    recordCode: headerRow.contract_code,
    contractCode: headerRow.contract_code,
    code: headerRow.contract_code,
    recordName: headerRow.contract_name,
    contractName: headerRow.contract_name,
    name: headerRow.contract_name,
    vendorId: headerRow.vendor_id ?? '',
    vendorCode: headerRow.vendor_code ?? '',
    vendorName: headerRow.vendor_name ?? '',
    entityId: headerRow.entity_id ?? '',
    entityCode: headerRow.entity_code ?? '',
    startDate: toIsoDate(headerRow.start_date),
    endDate: toIsoDate(headerRow.end_date),
    status: headerRow.status ?? 'active',
    approvalStatus: headerRow.approval_status ?? 'Approved',
    notes: headerRow.notes ?? '',
    createdBy: headerRow.created_by ?? '',
    createdAt: headerRow.created_at,
    updatedAt: headerRow.updated_at,
    items,
    payload: {
      vendorId: headerRow.vendor_id ?? '',
      vendorCode: headerRow.vendor_code ?? '',
      vendorName: headerRow.vendor_name ?? '',
      entityId: headerRow.entity_id ?? '',
      entityCode: headerRow.entity_code ?? '',
      startDate: toIsoDate(headerRow.start_date),
      endDate: toIsoDate(headerRow.end_date),
      notes: headerRow.notes ?? '',
      items,
    },
  };
}

// ── List / detail ──────────────────────────────────────────────────────────

async function listRateContracts(tenantId, filters = {}) {
  const where = ['tenant_id = ?'];
  const params = [tenantId];
  if (filters.vendorId) {
    where.push('vendor_id = ?');
    params.push(filters.vendorId);
  }
  if (filters.entityId) {
    where.push('entity_id = ?');
    params.push(filters.entityId);
  }
  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.search) {
    where.push('(contract_code LIKE ? OR contract_name LIKE ? OR vendor_name LIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }
  const headers = await query(
    `SELECT id, tenant_id, contract_code, contract_name, vendor_id, vendor_code,
            vendor_name, entity_id, entity_code, start_date, end_date, status,
            approval_status, notes, created_by, created_at, updated_at
       FROM rate_contract_master.rate_contract_master
      WHERE ${where.join(' AND ')}
      ORDER BY contract_code ASC`,
    params
  );
  if (headers.length === 0) return [];
  const ids = headers.map((h) => h.id);
  const placeholders = ids.map(() => '?').join(',');
  const items = await query(
    `SELECT id, contract_id, item_id, item_code, item_name, agreed_rate,
            currency, uom, gst_rate, hsn_code, line_number
       FROM rate_contract_master.rate_contract_items
      WHERE contract_id IN (${placeholders})
      ORDER BY contract_id ASC, line_number ASC`,
    ids
  );
  const itemsByContract = new Map();
  for (const item of items) {
    const list = itemsByContract.get(item.contract_id) ?? [];
    list.push(item);
    itemsByContract.set(item.contract_id, list);
  }
  return headers.map((h) => rowToContractRecord(h, itemsByContract.get(h.id) ?? []));
}

async function getRateContractById(tenantId, id) {
  const headers = await query(
    `SELECT * FROM rate_contract_master.rate_contract_master
      WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [id, tenantId]
  );
  if (headers.length === 0) return null;
  const items = await query(
    `SELECT * FROM rate_contract_master.rate_contract_items
      WHERE contract_id = ? ORDER BY line_number ASC`,
    [id]
  );
  return rowToContractRecord(headers[0], items);
}

// ── Lookup (the load-bearing endpoint for invoice forms) ───────────────────

export async function lookupRateContract({ tenantId, vendorId, itemCode, entityId }) {
  if (!tenantId || !vendorId || !itemCode) {
    return { matched: false };
  }
  const today = new Date().toISOString().slice(0, 10);
  const params = [tenantId, vendorId];
  let entitySql = '';
  if (entityId) {
    entitySql = 'AND (h.entity_id = ? OR h.entity_id IS NULL OR h.entity_id = ?)';
    params.push(entityId, '');
  }
  // Active + non-expired contract whose item line matches the requested code.
  const rows = await query(
    `SELECT h.id AS contract_id, h.contract_code, h.contract_name, h.end_date,
            i.agreed_rate, i.currency, i.uom, i.gst_rate, i.hsn_code, i.item_name
       FROM rate_contract_master.rate_contract_master h
       JOIN rate_contract_master.rate_contract_items i ON i.contract_id = h.id
      WHERE h.tenant_id = ?
        AND h.vendor_id = ?
        AND h.status = 'active'
        AND (h.end_date IS NULL OR h.end_date >= CURRENT_DATE())
        ${entitySql}
        AND i.item_code = ?
      ORDER BY h.end_date DESC, h.updated_at DESC
      LIMIT 1`,
    [...params, itemCode]
  );
  if (rows.length === 0) return { matched: false };
  const row = rows[0];
  return {
    matched: true,
    contractId: String(row.contract_id),
    contractCode: row.contract_code,
    contractName: row.contract_name,
    endDate: toIsoDate(row.end_date),
    agreedRate: Number(row.agreed_rate ?? 0),
    currency: row.currency ?? 'INR',
    uom: row.uom ?? '',
    gstRate: Number(row.gst_rate ?? 0),
    hsnCode: row.hsn_code ?? '',
    itemName: row.item_name ?? '',
    today,
  };
}

// ── Create / update ────────────────────────────────────────────────────────

function extractItems(record) {
  const payload = record?.payload && typeof record.payload === 'object' ? record.payload : {};
  const items = Array.isArray(record?.items)
    ? record.items
    : Array.isArray(payload.items)
      ? payload.items
      : [];
  return items
    .filter((it) => it && (it.itemCode || it.item_code))
    .map((it, index) => ({
      itemId: String(it.itemId ?? it.item_id ?? '').trim() || null,
      itemCode: String(it.itemCode ?? it.item_code ?? '').trim(),
      itemName: String(it.itemName ?? it.item_name ?? '').trim(),
      agreedRate: Number(it.agreedRate ?? it.agreed_rate ?? 0) || 0,
      currency: String(it.currency ?? 'INR').trim() || 'INR',
      uom: String(it.uom ?? '').trim() || null,
      gstRate: Number(it.gstRate ?? it.gst_rate ?? 0) || 0,
      hsnCode: String(it.hsnCode ?? it.hsn_code ?? '').trim() || null,
      lineNumber: Number(it.lineNumber ?? it.line_number ?? index + 1),
    }));
}

async function upsertRateContracts(tenantId, actorId, records, entityCode) {
  for (const record of records) {
    const payload = record?.payload && typeof record.payload === 'object' ? record.payload : {};
    const flat = { ...payload, ...record };
    const incomingCode = String(
      record?.contractCode ?? record?.recordCode ?? record?.code ?? ''
    ).trim();
    const id = record?.id ? String(record.id) : null;

    let contractCode = incomingCode;
    let contractId = id;

    let existing = null;
    if (contractId) {
      const rows = await query(
        `SELECT * FROM rate_contract_master.rate_contract_master
          WHERE id = ? AND tenant_id = ? LIMIT 1`,
        [contractId, tenantId]
      );
      existing = rows[0] ?? null;
    }
    if (!existing && contractCode) {
      const rows = await query(
        `SELECT * FROM rate_contract_master.rate_contract_master
          WHERE contract_code = ? AND tenant_id = ? LIMIT 1`,
        [contractCode, tenantId]
      );
      existing = rows[0] ?? null;
      if (existing) contractId = existing.id;
    }
    if (!existing && !contractCode) {
      contractCode = await nextDocRef(tenantId, entityCode || 'PTPL', 'RCM');
    }
    if (!contractId) contractId = randomUUID();

    const contractName = String(
      record?.contractName ?? record?.recordName ?? record?.name ?? flat.contractName ?? ''
    ).trim();
    if (!contractName) {
      const err = new Error('contract_name_required');
      err.statusCode = 400;
      err.details = [{ field: 'contractName', message: 'Contract name is required' }];
      throw err;
    }

    const vendorId = flat.vendorId || null;
    const vendorCode = flat.vendorCode || null;
    const vendorName = flat.vendorName || null;
    const entityId = flat.entityId || null;
    const entityCodeRow = flat.entityCode || entityCode || 'PTPL';
    const startDate = flat.startDate ? String(flat.startDate).slice(0, 10) : null;
    const endDate = flat.endDate ? String(flat.endDate).slice(0, 10) : null;
    const rawStatus = String(record?.status ?? flat.status ?? 'active').toLowerCase();
    const status = ['active', 'inactive', 'expired'].includes(rawStatus) ? rawStatus : 'active';
    const approvalStatus = String(record?.approvalStatus ?? flat.approvalStatus ?? 'Approved');
    const notes = flat.notes ?? null;

    const items = extractItems(record);

    await withTransaction(async (conn) => {
      await connExecute(
        conn,
        `INSERT INTO rate_contract_master.rate_contract_master
            (id, tenant_id, contract_code, contract_name, vendor_id, vendor_code,
             vendor_name, entity_id, entity_code, start_date, end_date, status,
             approval_status, notes, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            contract_name = VALUES(contract_name),
            vendor_id = VALUES(vendor_id),
            vendor_code = VALUES(vendor_code),
            vendor_name = VALUES(vendor_name),
            entity_id = VALUES(entity_id),
            entity_code = VALUES(entity_code),
            start_date = VALUES(start_date),
            end_date = VALUES(end_date),
            status = VALUES(status),
            approval_status = VALUES(approval_status),
            notes = VALUES(notes),
            updated_at = CURRENT_TIMESTAMP`,
        [
          contractId,
          tenantId,
          contractCode,
          contractName,
          vendorId,
          vendorCode,
          vendorName,
          entityId,
          entityCodeRow,
          startDate,
          endDate,
          status,
          approvalStatus,
          notes,
          actorId,
        ]
      );

      // Replace child rows. Unique constraint (contract_id, item_code) means
      // partial updates would collide on the same code, so DELETE + INSERT is
      // the safest approach and matches the kit-bundle pattern.
      await connExecute(
        conn,
        `DELETE FROM rate_contract_master.rate_contract_items WHERE contract_id = ?`,
        [contractId]
      );
      for (const item of items) {
        await connExecute(
          conn,
          `INSERT INTO rate_contract_master.rate_contract_items
              (id, contract_id, item_id, item_code, item_name, agreed_rate,
               currency, uom, gst_rate, hsn_code, line_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            contractId,
            item.itemId,
            item.itemCode,
            item.itemName || item.itemCode,
            item.agreedRate,
            item.currency,
            item.uom,
            item.gstRate,
            item.hsnCode,
            item.lineNumber,
          ]
        );
      }

      await connExecute(
        conn,
        `INSERT INTO rate_contract_master.rate_contract_master_audit
            (id, record_id, action, changed_by, before_payload, after_payload)
          VALUES (?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON))`,
        [
          randomUUID(),
          contractId,
          existing ? 'UPDATE' : 'CREATE',
          actorId,
          JSON.stringify(existing ?? {}),
          JSON.stringify({
            contractCode,
            contractName,
            vendorId,
            vendorCode,
            vendorName,
            entityId,
            entityCode: entityCodeRow,
            startDate,
            endDate,
            status,
            approvalStatus,
            items,
          }),
        ]
      );
    });
  }
}

// ── Public route handler ───────────────────────────────────────────────────

const KEY = 'rate_contract_master';
const LIST_PATH = `/api/masters/${KEY}`;
const ID_PATH_RE = new RegExp(`^/api/masters/${KEY}/([^/]+)$`);
const LOOKUP_PATH = '/api/masters/rate_contract/lookup';

export async function handleRateContractMasterRoute(req, res, pathname, sendJson) {
  if (pathname !== LIST_PATH && pathname !== LOOKUP_PATH && !ID_PATH_RE.test(pathname)) {
    return false;
  }

  const tenantId = readTenant(req);
  if (!tenantId) {
    sendJson(res, 400, { success: false, error: 'tenant_required' });
    return true;
  }

  try {
    if (pathname === LOOKUP_PATH && req.method === 'GET') {
      const params = readQueryParams(req);
      const result = await lookupRateContract({
        tenantId,
        vendorId: params.get('vendorId') || '',
        itemCode: params.get('itemCode') || '',
        entityId: params.get('entityId') || '',
      });
      sendJson(res, 200, { success: true, ...result });
      return true;
    }

    const idMatch = pathname.match(ID_PATH_RE);
    if (idMatch && req.method === 'GET') {
      const record = await getRateContractById(tenantId, idMatch[1]);
      if (!record) {
        sendJson(res, 404, { success: false, error: 'not_found' });
        return true;
      }
      sendJson(res, 200, { success: true, data: record });
      return true;
    }

    if (pathname === LIST_PATH && req.method === 'GET') {
      const params = readQueryParams(req);
      const records = await listRateContracts(tenantId, {
        vendorId: params.get('vendorId') || '',
        entityId: params.get('entityId') || '',
        status: params.get('status') || '',
        search: params.get('search') || '',
      });
      sendJson(res, 200, { success: true, data: records });
      return true;
    }

    if (pathname === LIST_PATH && req.method === 'POST') {
      const body = await readJsonBody(req);
      const entityCode = String(body.entityCode ?? body.entity_code ?? 'PTPL');
      await upsertRateContracts(tenantId, readActor(req), [body], entityCode);
      sendJson(res, 201, { success: true });
      return true;
    }

    if (pathname === LIST_PATH && req.method === 'PUT') {
      const body = await readJsonBody(req);
      const records = Array.isArray(body.records) ? body.records : [body];
      const entityCode = String(body.entityCode ?? body.entity_code ?? 'PTPL');
      await upsertRateContracts(tenantId, readActor(req), records, entityCode);
      sendJson(res, 200, { success: true, count: records.length });
      return true;
    }

    if (idMatch && req.method === 'PUT') {
      const body = await readJsonBody(req);
      const entityCode = String(body.entityCode ?? body.entity_code ?? 'PTPL');
      await upsertRateContracts(
        tenantId,
        readActor(req),
        [{ ...body, id: idMatch[1] }],
        entityCode
      );
      sendJson(res, 200, { success: true });
      return true;
    }
  } catch (err) {
    const status = err.statusCode || (err.details ? 400 : 500);
    sendJson(res, status, {
      success: false,
      error: err.message || 'internal_error',
      details: err.details || undefined,
    });
    return true;
  }

  return false;
}
