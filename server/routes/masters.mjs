/**
 * Masters domain route — bespoke override for masters whose underlying
 * tables do NOT use the canonical `record_code / record_name / payload`
 * shape that the generic /api/masters/<key> handler in server/index.mjs
 * understands.
 *
 * Currently overrides:
 *   • kit_bundle_master — header + items child table; GET joins items, PUT
 *     upserts header and DELETE+INSERTs items in one transaction.
 *   • employee_master — FK columns (department_id / designation_id /
 *     location_id / reporting_manager_id / cost_centre_id / profit_centre_id)
 *     instead of an opaque payload JSON. GET projects FK columns into a flat
 *     V2-compatible shape so SimpleMasterScreenV2 + useIncrementalMasterRecords
 *     can drive the listing/form. PUT validates names + email + phone +
 *     PAN and writes structured columns.
 *
 * Everything else passes through to the inline canonical handler in
 * server/index.mjs (registered AFTER this route file). Registration order
 * matters: this file must be wired before the inline `/api/masters/<key>`
 * branches so the bespoke masters never hit the canonical path.
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

// ── Employee validation rules (exported for tests) ─────────────────────────

const NAME_REGEX = /^[A-Za-z\s\-']{2,50}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PHONE_REGEX = /^(\+91|0)?[6-9]\d{9}$/;

/** Strip +91 / leading 0 so two formats of the same number compare equal. */
export function normalisePhone(raw) {
  const digits = String(raw ?? '')
    .replace(/[\s\-()]/g, '')
    .replace(/^(\+91|0)/, '');
  return digits;
}

export function validateEmployeeFields(input, { isUpdate = false } = {}) {
  const errors = [];
  const firstName = String(input.firstName ?? input.first_name ?? '').trim();
  const lastName = String(input.lastName ?? input.last_name ?? '').trim();
  const email = String(input.email ?? '')
    .trim()
    .toLowerCase();
  const phoneRaw = String(input.phone ?? '').trim();
  const pan = String(input.panNumber ?? input.pan_number ?? '')
    .trim()
    .toUpperCase();

  if (!firstName) errors.push({ field: 'firstName', message: 'First name is required' });
  else if (!NAME_REGEX.test(firstName))
    errors.push({
      field: 'firstName',
      message: 'First name must be 2–50 letters (spaces, hyphen, apostrophe allowed)',
    });

  if (!lastName) errors.push({ field: 'lastName', message: 'Last name is required' });
  else if (!NAME_REGEX.test(lastName))
    errors.push({ field: 'lastName', message: 'Last name must be 2–50 letters' });

  if (!email) errors.push({ field: 'email', message: 'Email is required' });
  else if (!EMAIL_REGEX.test(email))
    errors.push({ field: 'email', message: 'Email format is invalid' });

  if (!phoneRaw) errors.push({ field: 'phone', message: 'Phone is required' });
  else if (!PHONE_REGEX.test(phoneRaw.replace(/[\s\-()]/g, '')))
    errors.push({ field: 'phone', message: 'Phone must be a valid Indian mobile number' });

  if (pan && !PAN_REGEX.test(pan))
    errors.push({ field: 'panNumber', message: 'PAN must match ABCDE1234F' });

  // unused on first-pass; isUpdate kept for future expansion
  void isUpdate;

  return {
    valid: errors.length === 0,
    errors,
    normalised: { firstName, lastName, email, phone: normalisePhone(phoneRaw), pan },
  };
}

// ── kit_bundle_master ──────────────────────────────────────────────────────

function rowToBundleRecord(headerRow, itemRows) {
  return {
    id: String(headerRow.id),
    recordCode: headerRow.bundle_code,
    bundleCode: headerRow.bundle_code,
    code: headerRow.bundle_code,
    recordName: headerRow.bundle_name,
    bundleName: headerRow.bundle_name,
    name: headerRow.bundle_name,
    vendorId: headerRow.vendor_id,
    vendorCode: headerRow.vendor_code,
    vendorName: headerRow.vendor_name,
    description: headerRow.description,
    status: headerRow.status,
    approvalStatus: headerRow.approval_status,
    createdBy: headerRow.created_by,
    createdAt: headerRow.created_at,
    updatedAt: headerRow.updated_at,
    payload: {
      vendorId: headerRow.vendor_id,
      vendorCode: headerRow.vendor_code,
      vendorName: headerRow.vendor_name,
      description: headerRow.description,
      items: itemRows.map((row) => ({
        id: String(row.id),
        lineNumber: Number(row.line_number ?? 0),
        itemCode: row.item_code ?? '',
        itemName: row.item_name ?? '',
        description: row.description ?? '',
        qty: Number(row.qty ?? 0),
        uom: row.uom ?? '',
        unitPrice: Number(row.unit_price ?? 0),
        gstRate: Number(row.gst_rate ?? 0),
        hsnCode: row.hsn_code ?? '',
        mandatory: Number(row.mandatory ?? 0) === 1,
      })),
    },
  };
}

async function listKitBundles(tenantId) {
  const headers = await query(
    `SELECT id, tenant_id, bundle_code, bundle_name, vendor_id, vendor_code,
            vendor_name, description, status, approval_status, created_by,
            created_at, updated_at
       FROM kit_bundle_master.kit_bundle_master
      WHERE tenant_id = ?
      ORDER BY bundle_code ASC`,
    [tenantId]
  );
  if (headers.length === 0) return [];
  const ids = headers.map((h) => h.id);
  const placeholders = ids.map(() => '?').join(',');
  const items = await query(
    `SELECT id, bundle_id, line_number, item_code, item_name, description,
            qty, uom, unit_price, gst_rate, hsn_code, mandatory
       FROM kit_bundle_master.kit_bundle_items
      WHERE bundle_id IN (${placeholders})
      ORDER BY bundle_id ASC, line_number ASC`,
    ids
  );
  const itemsByBundle = new Map();
  for (const item of items) {
    const list = itemsByBundle.get(item.bundle_id) ?? [];
    list.push(item);
    itemsByBundle.set(item.bundle_id, list);
  }
  return headers.map((h) => rowToBundleRecord(h, itemsByBundle.get(h.id) ?? []));
}

async function getKitBundleById(tenantId, id) {
  const headers = await query(
    `SELECT * FROM kit_bundle_master.kit_bundle_master WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [id, tenantId]
  );
  if (headers.length === 0) return null;
  const items = await query(
    `SELECT * FROM kit_bundle_master.kit_bundle_items WHERE bundle_id = ? ORDER BY line_number ASC`,
    [id]
  );
  return rowToBundleRecord(headers[0], items);
}

function extractBundleItems(record) {
  const payload = record?.payload && typeof record.payload === 'object' ? record.payload : {};
  const items = Array.isArray(record?.items)
    ? record.items
    : Array.isArray(payload.items)
      ? payload.items
      : [];
  return items
    .filter((it) => it && (it.itemName || it.item_name))
    .map((it, index) => ({
      lineNumber: Number(it.lineNumber ?? it.line_number ?? index + 1),
      itemCode: String(it.itemCode ?? it.item_code ?? '').trim(),
      itemName: String(it.itemName ?? it.item_name ?? '').trim(),
      description: String(it.description ?? '').trim(),
      qty: Number(it.qty ?? it.quantity ?? 1) || 1,
      uom: String(it.uom ?? 'NOS').trim(),
      unitPrice: Number(it.unitPrice ?? it.unit_price ?? 0) || 0,
      gstRate: Number(it.gstRate ?? it.gst_rate ?? 0) || 0,
      hsnCode: String(it.hsnCode ?? it.hsn_code ?? '').trim(),
      mandatory: it.mandatory === undefined ? true : Boolean(it.mandatory),
    }));
}

async function upsertKitBundles(tenantId, actorId, records, entityCode) {
  for (const record of records) {
    const payload = record?.payload && typeof record.payload === 'object' ? record.payload : {};
    const incomingCode = String(
      record?.bundleCode ?? record?.recordCode ?? record?.code ?? ''
    ).trim();
    const id = record?.id ? String(record.id) : null;

    let bundleCode = incomingCode;
    let bundleId = id;

    // Find existing by id or code
    let existing = null;
    if (bundleId) {
      const rows = await query(
        `SELECT * FROM kit_bundle_master.kit_bundle_master WHERE id = ? AND tenant_id = ? LIMIT 1`,
        [bundleId, tenantId]
      );
      existing = rows[0] ?? null;
    }
    if (!existing && bundleCode) {
      const rows = await query(
        `SELECT * FROM kit_bundle_master.kit_bundle_master WHERE bundle_code = ? AND tenant_id = ? LIMIT 1`,
        [bundleCode, tenantId]
      );
      existing = rows[0] ?? null;
      if (existing) bundleId = existing.id;
    }

    if (!existing && !bundleCode) {
      bundleCode = await nextDocRef(tenantId, entityCode || 'PTPL', 'BCM');
    }
    if (!bundleId) bundleId = randomUUID();

    const bundleName = String(
      record?.bundleName ?? record?.recordName ?? record?.name ?? ''
    ).trim();
    if (!bundleName) {
      throw new Error('bundle_name_required');
    }

    const vendorId = payload.vendorId ?? record?.vendorId ?? null;
    const vendorCode = payload.vendorCode ?? record?.vendorCode ?? null;
    const vendorName = payload.vendorName ?? record?.vendorName ?? null;
    const description = payload.description ?? record?.description ?? null;
    const status = String(record?.status ?? existing?.status ?? 'Active');
    const approvalStatus = String(
      record?.approvalStatus ?? existing?.approval_status ?? 'Approved'
    );

    const items = extractBundleItems(record);

    await withTransaction(async (conn) => {
      await connExecute(
        conn,
        `INSERT INTO kit_bundle_master.kit_bundle_master
            (id, tenant_id, bundle_code, bundle_name, vendor_id, vendor_code,
             vendor_name, description, status, approval_status, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            bundle_name = VALUES(bundle_name),
            vendor_id = VALUES(vendor_id),
            vendor_code = VALUES(vendor_code),
            vendor_name = VALUES(vendor_name),
            description = VALUES(description),
            status = VALUES(status),
            approval_status = VALUES(approval_status),
            updated_at = CURRENT_TIMESTAMP`,
        [
          bundleId,
          tenantId,
          bundleCode,
          bundleName,
          vendorId,
          vendorCode,
          vendorName,
          description,
          status,
          approvalStatus,
          actorId,
        ]
      );

      // Replace child items
      await connExecute(
        conn,
        `DELETE FROM kit_bundle_master.kit_bundle_items WHERE bundle_id = ?`,
        [bundleId]
      );
      for (const item of items) {
        await connExecute(
          conn,
          `INSERT INTO kit_bundle_master.kit_bundle_items
              (id, bundle_id, line_number, item_code, item_name, description,
               qty, uom, unit_price, gst_rate, hsn_code, mandatory)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            bundleId,
            item.lineNumber,
            item.itemCode || null,
            item.itemName,
            item.description || null,
            item.qty,
            item.uom || null,
            item.unitPrice,
            item.gstRate,
            item.hsnCode || null,
            item.mandatory ? 1 : 0,
          ]
        );
      }

      // Audit
      await connExecute(
        conn,
        `INSERT INTO kit_bundle_master.kit_bundle_master_audit
            (id, record_id, action, changed_by, before_payload, after_payload)
          VALUES (?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON))`,
        [
          randomUUID(),
          bundleId,
          existing ? 'UPDATE' : 'CREATE',
          actorId,
          JSON.stringify(existing ?? {}),
          JSON.stringify({
            bundleCode,
            bundleName,
            vendorId,
            vendorCode,
            vendorName,
            status,
            approvalStatus,
            items,
          }),
        ]
      );
    });
  }
}

// ── employee_master ────────────────────────────────────────────────────────

function rowToEmployeeRecord(row) {
  return {
    id: String(row.id),
    recordCode: row.employee_code,
    employeeCode: row.employee_code,
    code: row.employee_code,
    recordName: `${row.first_name} ${row.last_name}`.trim(),
    name: `${row.first_name} ${row.last_name}`.trim(),
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    panNumber: row.pan_number ?? '',
    departmentId: row.department_id ?? '',
    departmentName: row.department_name ?? '',
    designationId: row.designation_id ?? '',
    designationName: row.designation_name ?? '',
    locationId: row.location_id ?? '',
    locationName: row.location_name ?? '',
    reportingManagerId: row.reporting_manager_id ?? '',
    reportingManagerName: row.reporting_manager_name ?? '',
    costCentreId: row.cost_centre_id ?? '',
    costCentreName: row.cost_centre_name ?? '',
    profitCentreId: row.profit_centre_id ?? '',
    profitCentreName: row.profit_centre_name ?? '',
    employmentType: row.employment_type ?? 'full_time',
    status: row.status ?? 'active',
    approvalStatus: row.approval_status ?? 'Approved',
    dateOfJoining: row.date_of_joining
      ? new Date(row.date_of_joining).toISOString().slice(0, 10)
      : '',
    dateOfLeaving: row.date_of_leaving
      ? new Date(row.date_of_leaving).toISOString().slice(0, 10)
      : '',
    entityId: row.entity_id ?? '',
    entityCode: row.entity_code ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payload: {
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      panNumber: row.pan_number ?? '',
      departmentId: row.department_id ?? '',
      departmentName: row.department_name ?? '',
      designationId: row.designation_id ?? '',
      designationName: row.designation_name ?? '',
      locationId: row.location_id ?? '',
      locationName: row.location_name ?? '',
      reportingManagerId: row.reporting_manager_id ?? '',
      reportingManagerName: row.reporting_manager_name ?? '',
      costCentreId: row.cost_centre_id ?? '',
      costCentreName: row.cost_centre_name ?? '',
      profitCentreId: row.profit_centre_id ?? '',
      profitCentreName: row.profit_centre_name ?? '',
      employmentType: row.employment_type ?? 'full_time',
      dateOfJoining: row.date_of_joining
        ? new Date(row.date_of_joining).toISOString().slice(0, 10)
        : '',
      dateOfLeaving: row.date_of_leaving
        ? new Date(row.date_of_leaving).toISOString().slice(0, 10)
        : '',
      entityId: row.entity_id ?? '',
      entityCode: row.entity_code ?? '',
    },
  };
}

async function listEmployees(tenantId) {
  const rows = await query(
    `SELECT * FROM employee_master.employee_master
       WHERE tenant_id = ?
       ORDER BY employee_code ASC`,
    [tenantId]
  );
  return rows.map(rowToEmployeeRecord);
}

async function upsertEmployees(tenantId, actorId, records, entityCode) {
  // Pre-scan for in-batch duplicates and existing rows for uniqueness checks.
  const emailMap = new Map();
  const phoneMap = new Map();
  const panMap = new Map();

  for (const record of records) {
    const payload = record?.payload && typeof record.payload === 'object' ? record.payload : {};
    const flat = { ...payload, ...record };
    const v = validateEmployeeFields(flat);
    if (!v.valid) {
      const message = v.errors.map((e) => `${e.field}: ${e.message}`).join(' · ');
      const err = new Error(`employee_validation_failed: ${message}`);
      err.details = v.errors;
      throw err;
    }
    const id = String(record?.id ?? '');
    if (emailMap.has(v.normalised.email)) {
      const err = new Error(`duplicate_email: ${v.normalised.email}`);
      err.details = [{ field: 'email', message: 'Duplicate email in submitted batch' }];
      throw err;
    }
    emailMap.set(v.normalised.email, id);
    if (v.normalised.phone) {
      if (phoneMap.has(v.normalised.phone)) {
        const err = new Error(`duplicate_phone: ${v.normalised.phone}`);
        err.details = [{ field: 'phone', message: 'Duplicate phone in submitted batch' }];
        throw err;
      }
      phoneMap.set(v.normalised.phone, id);
    }
    if (v.normalised.pan) {
      if (panMap.has(v.normalised.pan)) {
        const err = new Error(`duplicate_pan: ${v.normalised.pan}`);
        err.details = [{ field: 'panNumber', message: 'Duplicate PAN in submitted batch' }];
        throw err;
      }
      panMap.set(v.normalised.pan, id);
    }
  }

  // Cross-check against existing rows (exclude same id for updates).
  const existing = await query(
    `SELECT id, email, phone, pan_number FROM employee_master.employee_master
       WHERE tenant_id = ?`,
    [tenantId]
  );
  const existingByEmail = new Map();
  const existingByPhone = new Map();
  const existingByPan = new Map();
  for (const row of existing) {
    if (row.email) existingByEmail.set(String(row.email).toLowerCase(), row.id);
    if (row.phone) existingByPhone.set(normalisePhone(row.phone), row.id);
    if (row.pan_number) existingByPan.set(String(row.pan_number).toUpperCase(), row.id);
  }

  for (const [email, incomingId] of emailMap.entries()) {
    const owner = existingByEmail.get(email);
    if (owner && owner !== incomingId) {
      const err = new Error(`email_in_use: ${email}`);
      err.statusCode = 409;
      err.details = [{ field: 'email', message: `Email ${email} is already used` }];
      throw err;
    }
  }
  for (const [phone, incomingId] of phoneMap.entries()) {
    const owner = existingByPhone.get(phone);
    if (owner && owner !== incomingId) {
      const err = new Error(`phone_in_use: ${phone}`);
      err.statusCode = 409;
      err.details = [{ field: 'phone', message: `Phone ${phone} is already used` }];
      throw err;
    }
  }
  for (const [pan, incomingId] of panMap.entries()) {
    const owner = existingByPan.get(pan);
    if (owner && owner !== incomingId) {
      const err = new Error(`pan_in_use: ${pan}`);
      err.statusCode = 409;
      err.details = [{ field: 'panNumber', message: `PAN ${pan} is already used` }];
      throw err;
    }
  }

  for (const record of records) {
    const payload = record?.payload && typeof record.payload === 'object' ? record.payload : {};
    const flat = { ...payload, ...record };
    const v = validateEmployeeFields(flat);
    const id = record?.id ? String(record.id) : randomUUID();
    let employeeCode = String(
      record?.employeeCode ?? record?.recordCode ?? record?.code ?? flat.employeeCode ?? ''
    ).trim();
    if (!employeeCode) {
      employeeCode = await nextDocRef(tenantId, entityCode || 'PTPL', 'EMP');
    }

    const status = String(record?.status ?? flat.status ?? 'active');
    const approvalStatus = String(record?.approvalStatus ?? flat.approvalStatus ?? 'Approved');
    const employmentType = String(flat.employmentType ?? 'full_time');
    const dateOfJoining = flat.dateOfJoining ? String(flat.dateOfJoining).slice(0, 10) : null;
    const dateOfLeaving = flat.dateOfLeaving ? String(flat.dateOfLeaving).slice(0, 10) : null;

    const prevRows = await query(
      `SELECT * FROM employee_master.employee_master WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId]
    );
    const previous = prevRows[0] ?? null;

    await query(
      `INSERT INTO employee_master.employee_master (
          id, tenant_id, employee_code, first_name, last_name, email, phone,
          department_id, department_name, designation_id, designation_name,
          location_id, location_name, reporting_manager_id, reporting_manager_name,
          cost_centre_id, cost_centre_name, profit_centre_id, profit_centre_name,
          employment_type, status, approval_status, date_of_joining, date_of_leaving,
          pan_number, entity_id, entity_code, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
          first_name = VALUES(first_name),
          last_name = VALUES(last_name),
          email = VALUES(email),
          phone = VALUES(phone),
          department_id = VALUES(department_id),
          department_name = VALUES(department_name),
          designation_id = VALUES(designation_id),
          designation_name = VALUES(designation_name),
          location_id = VALUES(location_id),
          location_name = VALUES(location_name),
          reporting_manager_id = VALUES(reporting_manager_id),
          reporting_manager_name = VALUES(reporting_manager_name),
          cost_centre_id = VALUES(cost_centre_id),
          cost_centre_name = VALUES(cost_centre_name),
          profit_centre_id = VALUES(profit_centre_id),
          profit_centre_name = VALUES(profit_centre_name),
          employment_type = VALUES(employment_type),
          status = VALUES(status),
          approval_status = VALUES(approval_status),
          date_of_joining = VALUES(date_of_joining),
          date_of_leaving = VALUES(date_of_leaving),
          pan_number = VALUES(pan_number),
          entity_id = VALUES(entity_id),
          entity_code = VALUES(entity_code),
          updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        tenantId,
        employeeCode,
        v.normalised.firstName,
        v.normalised.lastName,
        v.normalised.email,
        v.normalised.phone,
        flat.departmentId || null,
        flat.departmentName || null,
        flat.designationId || null,
        flat.designationName || null,
        flat.locationId || null,
        flat.locationName || null,
        flat.reportingManagerId || null,
        flat.reportingManagerName || null,
        flat.costCentreId || null,
        flat.costCentreName || null,
        flat.profitCentreId || null,
        flat.profitCentreName || null,
        employmentType,
        status,
        approvalStatus,
        dateOfJoining,
        dateOfLeaving,
        v.normalised.pan || null,
        flat.entityId || null,
        flat.entityCode || null,
        actorId,
      ]
    );

    await query(
      `INSERT INTO employee_master.employee_master_audit
          (id, record_id, action, changed_by, before_payload, after_payload)
        VALUES (?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON))`,
      [
        randomUUID(),
        id,
        previous ? 'UPDATE' : 'CREATE',
        actorId,
        JSON.stringify(previous ?? {}),
        JSON.stringify({
          employeeCode,
          firstName: v.normalised.firstName,
          lastName: v.normalised.lastName,
          email: v.normalised.email,
          phone: v.normalised.phone,
          panNumber: v.normalised.pan,
          status,
          approvalStatus,
        }),
      ]
    );
  }
}

// ── Public route handler ───────────────────────────────────────────────────

export async function handleMastersRoute(req, res, pathname, sendJson) {
  // Only intercept the two bespoke masters; everything else falls through to
  // the generic /api/masters/<key> branches still inline in server/index.mjs.
  const kitMatch = pathname === '/api/masters/kit_bundle_master';
  const kitIdMatch = pathname.match(/^\/api\/masters\/kit_bundle_master\/([^/]+)$/);
  const empMatch = pathname === '/api/masters/employee_master';
  if (!kitMatch && !kitIdMatch && !empMatch) return false;

  const tenantId = readTenant(req);
  if (!tenantId) {
    sendJson(res, 400, { success: false, error: 'tenant_required' });
    return true;
  }

  try {
    if (kitIdMatch && req.method === 'GET') {
      const record = await getKitBundleById(tenantId, kitIdMatch[1]);
      if (!record) {
        sendJson(res, 404, { success: false, error: 'not_found' });
        return true;
      }
      sendJson(res, 200, { success: true, data: record });
      return true;
    }
    if (kitMatch && req.method === 'GET') {
      const records = await listKitBundles(tenantId);
      sendJson(res, 200, { success: true, data: records });
      return true;
    }
    if (kitMatch && req.method === 'PUT') {
      const body = await readJsonBody(req);
      const records = Array.isArray(body.records) ? body.records : [];
      const entityCode = String(body.entityCode ?? body.entity_code ?? 'PTPL');
      await upsertKitBundles(tenantId, readActor(req), records, entityCode);
      sendJson(res, 200, { success: true, count: records.length });
      return true;
    }
    if (kitMatch && req.method === 'POST') {
      const body = await readJsonBody(req);
      const entityCode = String(body.entityCode ?? body.entity_code ?? 'PTPL');
      const records = [body];
      await upsertKitBundles(tenantId, readActor(req), records, entityCode);
      sendJson(res, 201, { success: true });
      return true;
    }

    if (empMatch && req.method === 'GET') {
      const records = await listEmployees(tenantId);
      sendJson(res, 200, { success: true, data: records });
      return true;
    }
    if (empMatch && req.method === 'PUT') {
      const body = await readJsonBody(req);
      const records = Array.isArray(body.records) ? body.records : [];
      const entityCode = String(body.entityCode ?? body.entity_code ?? 'PTPL');
      await upsertEmployees(tenantId, readActor(req), records, entityCode);
      sendJson(res, 200, { success: true, count: records.length });
      return true;
    }
    if (empMatch && req.method === 'POST') {
      const body = await readJsonBody(req);
      const entityCode = String(body.entityCode ?? body.entity_code ?? 'PTPL');
      const records = [body];
      await upsertEmployees(tenantId, readActor(req), records, entityCode);
      sendJson(res, 201, { success: true });
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
