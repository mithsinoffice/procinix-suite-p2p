/**
 * Tenant-level payment configuration service.
 *
 *   getSettings(tenantId)              — fetch (auto-create on first read);
 *                                        falls back to defaults when DB
 *                                        unavailable (test envs).
 *   updateSettings(tenantId, patch)    — partial update; returns full row.
 *   resetSettings(tenantId)            — set every field back to defaults.
 *   getDefaultSettings()               — pure helper, no DB.
 *
 * The shape returned mirrors the column names but in camelCase so the
 * frontend can consume it directly.
 */

import { randomUUID } from 'node:crypto';
import { query } from '../../mysql.mjs';

const DEFAULT_SETTINGS = Object.freeze({
  flagBankChangedDays: 30,
  flagDuplicateInvDays: 30,
  flagAmountAnomalyMultiplier: 2.5,
  flagInvSplittingCount: 3,
  flagInvSplittingDays: 7,
  flagDualApprovalThreshold: 200000,
  flagRoundNumberMin: 50000,
  flagRoundNumberDivisor: 1000,
  businessHoursStart: '09:00:00',
  businessHoursEnd: '19:00:00',
  businessDays: 'MON,TUE,WED,THU,FRI',
  defaultPaymentMode: 'NEFT',
  rtgsThreshold: 200000,
  msmeWarningDays: 7,
  paymentApproverRoles: 'payment_approver,cfo,admin',
  defaultPayoutFormat: 'HDFC_BULK',
});

const COLUMN_TO_CAMEL = {
  flag_bank_changed_days: 'flagBankChangedDays',
  flag_duplicate_inv_days: 'flagDuplicateInvDays',
  flag_amount_anomaly_multiplier: 'flagAmountAnomalyMultiplier',
  flag_inv_splitting_count: 'flagInvSplittingCount',
  flag_inv_splitting_days: 'flagInvSplittingDays',
  flag_dual_approval_threshold: 'flagDualApprovalThreshold',
  flag_round_number_min: 'flagRoundNumberMin',
  flag_round_number_divisor: 'flagRoundNumberDivisor',
  business_hours_start: 'businessHoursStart',
  business_hours_end: 'businessHoursEnd',
  business_days: 'businessDays',
  default_payment_mode: 'defaultPaymentMode',
  rtgs_threshold: 'rtgsThreshold',
  msme_warning_days: 'msmeWarningDays',
  payment_approver_roles: 'paymentApproverRoles',
  default_payout_format: 'defaultPayoutFormat',
};

const NUMERIC_COLUMNS = new Set([
  'flag_bank_changed_days',
  'flag_duplicate_inv_days',
  'flag_amount_anomaly_multiplier',
  'flag_inv_splitting_count',
  'flag_inv_splitting_days',
  'flag_dual_approval_threshold',
  'flag_round_number_min',
  'flag_round_number_divisor',
  'rtgs_threshold',
  'msme_warning_days',
]);

const CAMEL_TO_COLUMN = Object.fromEntries(
  Object.entries(COLUMN_TO_CAMEL).map(([k, v]) => [v, k])
);

const VALID_PAYMENT_MODES = new Set(['NEFT', 'RTGS', 'IMPS', 'UPI']);
const VALID_PAYOUT_FORMATS = new Set(['HDFC_BULK', 'ICICI_BULK', 'GENERIC_CSV']);

export function getDefaultSettings() {
  // Return a fresh copy so callers can mutate without affecting the frozen base.
  return { ...DEFAULT_SETTINGS };
}

function adaptRow(row) {
  if (!row) return null;
  const out = {};
  for (const [col, camel] of Object.entries(COLUMN_TO_CAMEL)) {
    let v = row[col];
    if (v == null) {
      out[camel] = DEFAULT_SETTINGS[camel];
      continue;
    }
    if (NUMERIC_COLUMNS.has(col)) v = Number(v);
    out[camel] = v;
  }
  return out;
}

/**
 * Fetch settings for a tenant. Auto-creates a default row on first call so
 * subsequent updates have something to UPDATE. Falls back to defaults if
 * the DB / table is unavailable (lets tests exercise the evaluator without
 * a live DB).
 */
export async function getSettings(tenantId) {
  if (!tenantId) return getDefaultSettings();
  try {
    const rows = await query(
      'SELECT * FROM payment_settings WHERE tenant_id = ? LIMIT 1',
      [tenantId]
    );
    if (rows.length > 0) return adaptRow(rows[0]);
    // No row yet — try to seed one.
    try {
      await query(
        'INSERT IGNORE INTO payment_settings (id, tenant_id) VALUES (?, ?)',
        [randomUUID(), tenantId]
      );
      const after = await query(
        'SELECT * FROM payment_settings WHERE tenant_id = ? LIMIT 1',
        [tenantId]
      );
      if (after.length > 0) return adaptRow(after[0]);
    } catch {
      /* ignore seed failure — fall through to defaults */
    }
    return getDefaultSettings();
  } catch {
    return getDefaultSettings();
  }
}

/**
 * Update a subset of settings columns. Unknown keys are ignored.
 * Validates enum-style fields. Returns the full updated row.
 */
export async function updateSettings(tenantId, patch) {
  if (!tenantId) {
    const err = new Error('tenant_required');
    err.statusCode = 400;
    throw err;
  }
  if (!patch || typeof patch !== 'object') {
    const err = new Error('patch_required');
    err.statusCode = 400;
    throw err;
  }

  // Validate enum fields
  if (patch.defaultPaymentMode != null && !VALID_PAYMENT_MODES.has(patch.defaultPaymentMode)) {
    const err = new Error('invalid_default_payment_mode');
    err.statusCode = 400;
    throw err;
  }
  if (patch.defaultPayoutFormat != null && !VALID_PAYOUT_FORMATS.has(patch.defaultPayoutFormat)) {
    const err = new Error('invalid_default_payout_format');
    err.statusCode = 400;
    throw err;
  }

  // Ensure row exists
  await getSettings(tenantId);

  const sets = [];
  const params = [];
  for (const [camel, value] of Object.entries(patch)) {
    const col = CAMEL_TO_COLUMN[camel];
    if (!col) continue;
    sets.push(`${col} = ?`);
    params.push(value);
  }
  if (sets.length === 0) {
    return getSettings(tenantId);
  }
  params.push(tenantId);
  await query(
    `UPDATE payment_settings SET ${sets.join(', ')} WHERE tenant_id = ?`,
    params
  );
  return getSettings(tenantId);
}

/**
 * Reset every settings column back to defaults.
 */
export async function resetSettings(tenantId) {
  if (!tenantId) {
    const err = new Error('tenant_required');
    err.statusCode = 400;
    throw err;
  }
  // Ensure row exists, then update all fields explicitly to defaults.
  await getSettings(tenantId);
  const colsAndValues = Object.entries(DEFAULT_SETTINGS).map(([camel, value]) => [
    CAMEL_TO_COLUMN[camel],
    value,
  ]);
  const sets = colsAndValues.map(([col]) => `${col} = ?`).join(', ');
  const params = colsAndValues.map(([, v]) => v);
  params.push(tenantId);
  await query(`UPDATE payment_settings SET ${sets} WHERE tenant_id = ?`, params);
  return getSettings(tenantId);
}

// Exported for tests
export { COLUMN_TO_CAMEL, CAMEL_TO_COLUMN, DEFAULT_SETTINGS };
