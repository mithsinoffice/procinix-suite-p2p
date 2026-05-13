/**
 * Vendor master ↔ operational vendors sync.
 *
 * `vendor_master.vendor_master` is the governance/approval table; rows live
 * there in `Draft` / `Pending Approval` / `Approved` / `Rejected` states.
 * `p2p_schema_mt.vendors` is the operational table read by invoice / PO /
 * GRN dropdowns and the agent pipeline. The two are decoupled by design —
 * approval gating happens in the governance table; transactional reads happen
 * in the operational table.
 *
 * This module bridges them:
 *   • `syncVendorMasterRecord(record, action)` — call from the approval
 *     workflow. On `approve`, upserts the operational row + side tables. On
 *     `reject`, deactivates the operational row (status='inactive'). On any
 *     other action: no-op.
 *   • `backfillApprovedVendorMasters()` — startup hook. Idempotently ensures
 *     every `vendor_master` row with `approval_status='Approved'` exists in
 *     `p2p_schema_mt.vendors`. Skips rows that are already in sync so re-runs
 *     are cheap.
 *
 * Pure write helpers — accept the master record as an object so unit tests
 * can mock the DB without booting a real connection.
 */

import { randomUUID } from 'node:crypto';
import { query, withTransaction, connExecute } from '../../mysql.mjs';

const DEFAULT_TENANT_ID = 'tenant-default-001';

/**
 * Read a value from the master record's payload tolerating both camelCase
 * and snake_case keys. The PUT handler merges previous DB row + incoming
 * payload, so the same logical field can land under either spelling.
 */
function pick(record, ...keys) {
  if (!record || typeof record !== 'object') return null;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

/**
 * Normalise vendor_type to one of the operational table's expected values.
 * The legacy form often emits 'Supplier' / 'Service Provider' / 'Contractor';
 * the operational table uses 'goods_supplier' / 'service_provider'.
 */
function normaliseVendorType(raw) {
  const value = String(raw ?? '')
    .toLowerCase()
    .trim();
  if (!value) return 'goods_supplier';
  if (value.includes('service')) return 'service_provider';
  if (value.includes('contractor')) return 'service_provider';
  if (value.includes('supplier') || value.includes('goods')) return 'goods_supplier';
  if (value === 'service_provider' || value === 'goods_supplier') return value;
  return 'goods_supplier';
}

/**
 * Project a vendor_master record (camelCase or snake_case payload keys) into
 * the column shape required by `p2p_schema_mt.vendors`. Exported for tests.
 */
export function projectMasterToOperationalRow(record) {
  if (!record || typeof record !== 'object') {
    throw new Error('projectMasterToOperationalRow: record is required');
  }

  const vendorCode = pick(record, 'vendorCode', 'vendor_code', 'code', 'recordCode');
  const legalName = pick(
    record,
    'legalName',
    'vendor_legal_name',
    'vendorLegalName',
    'name',
    'recordName'
  );
  if (!vendorCode || !legalName) {
    throw new Error('projectMasterToOperationalRow: vendor_code and legal_name are required');
  }

  const tradeName = pick(record, 'tradeName', 'vendor_trade_name', 'vendorTradeName');
  const vendorGroupName = pick(record, 'vendorGroupName', 'vendor_group_name', 'group');
  const vendorGroupCode = pick(record, 'vendorGroupCode', 'vendor_group_code', 'groupCode');

  return {
    vendor_code: String(vendorCode).trim(),
    vendor_legal_name: String(legalName).trim(),
    vendor_trade_name: tradeName ? String(tradeName).trim() : null,
    vendor_group_name: vendorGroupName ? String(vendorGroupName).trim() : null,
    vendor_group_code: vendorGroupCode ? String(vendorGroupCode).trim() : null,
    vendor_type: normaliseVendorType(pick(record, 'vendorType', 'vendor_type')),
    address_line: pick(record, 'address', 'address_line', 'addressLine'),
    city: pick(record, 'city'),
    state: pick(record, 'state'),
    pin_code: pick(record, 'pincode', 'pin_code', 'pinCode'),
    country: pick(record, 'country') ?? 'India',
    tenant_id: pick(record, 'tenant_id', 'tenantId') ?? DEFAULT_TENANT_ID,
  };
}

/** First two characters of a GSTIN — the state code (01..38). */
export function stateCodeFromGstin(gstin) {
  const trimmed = String(gstin ?? '')
    .trim()
    .toUpperCase();
  if (trimmed.length < 2) return null;
  const code = trimmed.substring(0, 2);
  return /^\d{2}$/.test(code) ? code : null;
}

/**
 * Find an existing operational vendor row that matches the master record by
 * vendor_code first, then by legal_name (case-insensitive). Returns the row
 * or null.
 */
async function findExistingOperationalVendor(executor, projected) {
  const byCode = await executor.query(
    `SELECT id, vendor_code, vendor_legal_name, status, is_active
       FROM p2p_schema_mt.vendors
      WHERE vendor_code = ?
      LIMIT 1`,
    [projected.vendor_code]
  );
  if (byCode[0]) return byCode[0];

  const byName = await executor.query(
    `SELECT id, vendor_code, vendor_legal_name, status, is_active
       FROM p2p_schema_mt.vendors
      WHERE LOWER(vendor_legal_name) = LOWER(?)
      LIMIT 1`,
    [projected.vendor_legal_name]
  );
  return byName[0] ?? null;
}

/**
 * Upsert the side-table GST row when the master record carries a GSTIN.
 * One primary registration per vendor (sort_order=0). Skipped silently when
 * no GSTIN is present — many master rows are mid-flow and lack one.
 */
async function upsertGstRegistration(executor, vendorId, record) {
  const gstin = pick(record, 'gstin', 'gstinNumber', 'gst_number');
  if (!gstin) return;
  const gstinTrim = String(gstin).trim().toUpperCase();
  if (!gstinTrim) return;

  const stateCode = stateCodeFromGstin(gstinTrim);
  const state = pick(record, 'state');
  const city = pick(record, 'city');
  const pin = pick(record, 'pincode', 'pin_code');
  const address = pick(record, 'address', 'address_line');

  // Replace the primary row (is_primary=1; sort_order=0 as the secondary
  // tiebreaker on legacy rows that pre-date the is_primary backfill). Other
  // multi-state registrations stay untouched.
  const existing = await executor.query(
    `SELECT id FROM p2p_schema_mt.vendor_gst_registrations
      WHERE vendor_id = ?
      ORDER BY is_primary DESC, sort_order ASC, created_at ASC
      LIMIT 1`,
    [vendorId]
  );
  if (existing[0]) {
    await executor.query(
      `UPDATE p2p_schema_mt.vendor_gst_registrations
          SET gstin = ?, gst_state_code = ?, state = ?, city = ?,
              pin_code = ?, address = ?, status = 'active', is_primary = 1
        WHERE id = ?`,
      [gstinTrim, stateCode, state, city, pin, address, existing[0].id]
    );
  } else {
    await executor.query(
      `INSERT INTO p2p_schema_mt.vendor_gst_registrations
         (id, vendor_id, gstin, gst_type, state, gst_state_code, city,
          pin_code, address, status, is_primary, sort_order)
       VALUES (?, ?, ?, 'regular', ?, ?, ?, ?, ?, 'active', 1, 0)`,
      [randomUUID(), vendorId, gstinTrim, state, stateCode, city, pin, address]
    );
  }
}

/**
 * Upsert PAN + MSME side-table values. Mirrors the existing seeds: one row
 * per vendor (UNIQUE on vendor_id). Skipped if neither PAN nor MSME flag is
 * present in the master record.
 */
async function upsertPanCompliance(executor, vendorId, record) {
  const pan = pick(record, 'pan', 'panNumber', 'pan_number');
  const msmeCategory =
    pick(record, 'msmeCategory', 'msme_category') ??
    (pick(record, 'msmeFlag', 'msme_flag', 'isMsme') ? 'small' : null);
  const tdsSection = pick(record, 'tdsSection', 'tds_section');
  if (!pan && !msmeCategory && !tdsSection) return;

  const panTrim = pan ? String(pan).trim().toUpperCase() : null;
  const tdsArray = tdsSection ? JSON.stringify([String(tdsSection).trim()]) : null;

  await executor.query(
    `INSERT INTO p2p_schema_mt.vendor_pan_compliance
       (id, vendor_id, pan, msme_category, tds_sections, pan_status)
     VALUES (?, ?, ?, ?, CAST(? AS JSON), 'verified')
     ON DUPLICATE KEY UPDATE
       pan = COALESCE(VALUES(pan), pan),
       msme_category = COALESCE(VALUES(msme_category), msme_category),
       tds_sections = COALESCE(VALUES(tds_sections), tds_sections),
       updated_at = CURRENT_TIMESTAMP`,
    [randomUUID(), vendorId, panTrim, msmeCategory, tdsArray]
  );
}

/**
 * Approve path: insert or update the operational row, then upsert side
 * tables. The vendors table marks status='active' + is_active=1 so the
 * dropdown filter (`status === 'active'`) lights up immediately.
 */
async function upsertOperationalVendor(record) {
  const projected = projectMasterToOperationalRow(record);

  return withTransaction(async (conn) => {
    const executor = {
      query: (sql, params = []) => connExecute(conn, sql, params),
    };

    const existing = await findExistingOperationalVendor(executor, projected);
    let vendorId;
    let action;

    if (existing) {
      vendorId = existing.id;
      action = 'updated';
      await executor.query(
        `UPDATE p2p_schema_mt.vendors
            SET vendor_legal_name = ?, vendor_trade_name = ?,
                vendor_group_name = ?, vendor_group_code = ?,
                vendor_type = ?, address_line = ?, city = ?, state = ?,
                pin_code = ?, country = ?, status = 'active', is_active = 1,
                tenant_id = COALESCE(?, tenant_id),
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [
          projected.vendor_legal_name,
          projected.vendor_trade_name,
          projected.vendor_group_name,
          projected.vendor_group_code,
          projected.vendor_type,
          projected.address_line,
          projected.city,
          projected.state,
          projected.pin_code,
          projected.country,
          projected.tenant_id,
          vendorId,
        ]
      );
    } else {
      vendorId = randomUUID();
      action = 'inserted';
      await executor.query(
        `INSERT INTO p2p_schema_mt.vendors
           (id, vendor_code, vendor_legal_name, vendor_trade_name,
            vendor_group_name, vendor_group_code, vendor_type, address_line,
            city, state, pin_code, country, status, is_active, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?)`,
        [
          vendorId,
          projected.vendor_code,
          projected.vendor_legal_name,
          projected.vendor_trade_name,
          projected.vendor_group_name,
          projected.vendor_group_code,
          projected.vendor_type,
          projected.address_line,
          projected.city,
          projected.state,
          projected.pin_code,
          projected.country,
          projected.tenant_id,
        ]
      );
    }

    await upsertGstRegistration(executor, vendorId, record);
    await upsertPanCompliance(executor, vendorId, record);

    return { vendorId, action };
  });
}

/**
 * Reject path: locate the operational row (by vendor_code, then legal_name)
 * and flip status to 'inactive'. Never deletes — invoices / POs that already
 * reference the vendor must not lose their FK. If the row doesn't exist,
 * silent no-op (nothing to deactivate).
 */
async function deactivateOperationalVendor(record) {
  const projected = projectMasterToOperationalRow(record);
  const executor = {
    query: (sql, params = []) => query(sql, params),
  };
  const existing = await findExistingOperationalVendor(executor, projected);
  if (!existing) return { vendorId: null, action: 'noop' };

  await query(
    `UPDATE p2p_schema_mt.vendors
        SET status = 'inactive', is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [existing.id]
  );
  return { vendorId: existing.id, action: 'deactivated' };
}

/**
 * Entry point called from `updateGenericMasterApproval` after a vendor_master
 * row's approval status changes. Routes by action:
 *   • approve / request_info → upsert (request_info is treated as "still
 *     valid, just needs more data"; the data so far stays active downstream).
 *   • reject → deactivate.
 *   • anything else → no-op.
 */
export async function syncVendorMasterRecord(record, action) {
  if (!record) {
    return { skipped: true, reason: 'no_record' };
  }
  try {
    if (action === 'approve') {
      return await upsertOperationalVendor(record);
    }
    if (action === 'reject') {
      return await deactivateOperationalVendor(record);
    }
    return { skipped: true, reason: `action:${action}` };
  } catch (err) {
    // Never surface DB errors to the approver — the master approval already
    // committed. Log loudly so ops sees the dropout.
    console.error('[vendorSync] syncVendorMasterRecord failed:', err?.message || err);
    return { error: String(err?.message || err) };
  }
}

/**
 * Backfill — runs once at startup. Reads every Approved vendor_master row,
 * upserts each into the operational table (idempotent: row matches are
 * dedup'd by vendor_code first, then legal_name). Re-runs are cheap because
 * matched rows just hit the UPDATE branch with the same values.
 *
 * Returns a summary `{ scanned, inserted, updated, errors }` so the startup
 * log can show ops what happened.
 */
export async function backfillApprovedVendorMasters() {
  const summary = { scanned: 0, inserted: 0, updated: 0, errors: 0 };
  let rows;
  try {
    rows = await query(
      `SELECT id, record_code, record_name, payload
         FROM vendor_master.vendor_master
        WHERE approval_status = 'Approved'`
    );
  } catch (err) {
    console.warn(
      '[vendorSync] backfill skipped — vendor_master.vendor_master read failed:',
      err?.message || err
    );
    return summary;
  }

  for (const row of rows) {
    summary.scanned += 1;
    try {
      const payload =
        typeof row.payload === 'string' ? JSON.parse(row.payload || '{}') : row.payload || {};
      // The payload often lacks the top-level identity fields the projector
      // needs, so merge in record_code / record_name as fallbacks.
      const merged = {
        ...payload,
        recordCode: payload?.recordCode ?? row.record_code,
        recordName: payload?.recordName ?? row.record_name,
      };
      // Skip rows that can't be projected (missing both vendor_code and
      // legal_name). Better than crashing the whole backfill on bad data.
      if (!pick(merged, 'vendorCode', 'vendor_code', 'code', 'recordCode')) continue;
      if (!pick(merged, 'legalName', 'vendor_legal_name', 'name', 'recordName')) continue;

      const result = await upsertOperationalVendor(merged);
      if (result?.action === 'inserted') summary.inserted += 1;
      if (result?.action === 'updated') summary.updated += 1;
    } catch (err) {
      summary.errors += 1;
      console.warn(
        `[vendorSync] backfill row ${row.record_code ?? row.id} failed:`,
        err?.message || err
      );
    }
  }
  return summary;
}
