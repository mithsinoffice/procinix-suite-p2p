// GSTIN Level 1 validation: format + checksum (offline, always-on).
// Per ws1a-implementation-plan.md §2.9.
//
// GSTIN structure (15 chars):
//   [0-1]  State code (2 digits, 01-38 or 97)
//   [2-11] PAN (10 chars: 5 alpha + 4 digits + 1 alpha)
//   [12]   Entity code (1 alphanumeric, 1-9 or A-Z)
//   [13]   Fixed 'Z' (reserved for future use)
//   [14]   Check digit (mod-36 checksum)

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

// Valid Indian state/UT codes as of 2025.
// 01-38 are assigned states/UTs; 97 = other territory.
const VALID_STATE_CODES = new Set([
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
  '31', '32', '33', '34', '35', '36', '37', '38',
  '97',
]);

// Base-36 character set for checksum computation.
const CHAR_SET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Compute the GSTIN mod-36 check digit.
 *
 * Algorithm:
 *   For each of the first 14 characters (positions 0-13):
 *     1. Map character to its base-36 value (0-35).
 *     2. Multiply by factor: 1 for even positions, 2 for odd positions.
 *     3. Compute: quotient = floor(product / 36), remainder = product % 36.
 *     4. Add quotient + remainder to running total.
 *   Final: remainder = total % 36; check = (36 - remainder) % 36.
 *   Map check value back to base-36 character.
 */
function computeCheckDigit(gstin14) {
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const charValue = CHAR_SET.indexOf(gstin14[i]);
    if (charValue < 0) return null;
    const factor = (i % 2 === 0) ? 1 : 2;
    const product = charValue * factor;
    total += Math.floor(product / 36) + (product % 36);
  }
  const remainder = total % 36;
  const checkValue = (36 - remainder) % 36;
  return CHAR_SET[checkValue];
}

/**
 * Level 1 GSTIN validation: format + checksum.
 * Always operates offline — no network calls.
 *
 * @param {string} gstin - The GSTIN string to validate.
 * @returns {{ valid: boolean, error?: string, components?: { stateCode: string, pan: string, entityCode: string, checkDigit: string } }}
 */
export function validateGstinFormat(gstin) {
  if (!gstin || typeof gstin !== 'string') {
    return { valid: false, error: 'GSTIN is required' };
  }

  const normalized = gstin.trim().toUpperCase();

  if (normalized.length !== 15) {
    return { valid: false, error: `GSTIN must be 15 characters, got ${normalized.length}` };
  }

  if (!GSTIN_REGEX.test(normalized)) {
    return { valid: false, error: 'GSTIN format invalid: expected [2-digit state][PAN][entity][Z][check]' };
  }

  const stateCode = normalized.substring(0, 2);
  if (!VALID_STATE_CODES.has(stateCode)) {
    return { valid: false, error: `Invalid state code: ${stateCode}` };
  }

  const pan = normalized.substring(2, 12);
  if (!PAN_REGEX.test(pan)) {
    return { valid: false, error: `Invalid PAN embedded in GSTIN: ${pan}` };
  }

  const expectedCheck = computeCheckDigit(normalized.substring(0, 14));
  if (expectedCheck === null) {
    return { valid: false, error: 'Checksum computation failed — invalid characters' };
  }
  if (normalized[14] !== expectedCheck) {
    return { valid: false, error: `Checksum mismatch: expected ${expectedCheck}, got ${normalized[14]}` };
  }

  return {
    valid: true,
    components: {
      stateCode,
      pan,
      entityCode: normalized[12],
      checkDigit: normalized[14],
    },
  };
}

/**
 * Extract the PAN (chars 3-12, i.e. index 2-11) from a GSTIN.
 * Returns null if the GSTIN is invalid.
 */
export function extractPanFromGstin(gstin) {
  if (!gstin || typeof gstin !== 'string') return null;
  const normalized = gstin.trim().toUpperCase();
  if (normalized.length !== 15) return null;
  const pan = normalized.substring(2, 12);
  return PAN_REGEX.test(pan) ? pan : null;
}

/**
 * Extract the 2-digit state code from a GSTIN.
 * Returns null if the GSTIN is too short or state code is invalid.
 */
export function extractStateCodeFromGstin(gstin) {
  if (!gstin || typeof gstin !== 'string') return null;
  const normalized = gstin.trim().toUpperCase();
  if (normalized.length < 2) return null;
  const stateCode = normalized.substring(0, 2);
  return VALID_STATE_CODES.has(stateCode) ? stateCode : null;
}

// ── Level 3: match validation at invoice save ────────
// Per ws1a-implementation-plan.md §2.9 Level 3.
//
// Checks supplier GSTIN against vendor master and recipient GSTIN
// against entity registrations. Called at invoice save time.

/**
 * Level 3 GSTIN match validation.
 *
 * @param {object} opts
 * @param {string} opts.supplierGstin - Supplier GSTIN from the invoice
 * @param {string} opts.vendorId - Vendor ID to check against
 * @param {string} [opts.recipientGstin] - Recipient GSTIN from the invoice
 * @param {string} [opts.entityId] - Entity ID for recipient check
 * @param {object} opts.db - Database query interface { query(sql, params) }
 * @returns {Promise<{ok: boolean, checks: Array<{severity: 'block'|'warn', code: string, detail: string}>}>}
 */
export async function validateGstinMatch({ supplierGstin, vendorId, recipientGstin, entityId, db }) {
  const checks = [];

  // --- Supplier GSTIN checks ---
  if (supplierGstin) {
    const formatResult = validateGstinFormat(supplierGstin);
    if (!formatResult.valid) {
      checks.push({ severity: 'block', code: 'invalid_gstin_format', detail: `Supplier GSTIN: ${formatResult.error}` });
      return { ok: false, checks };
    }

    const normalized = supplierGstin.trim().toUpperCase();
    const supplierPan = extractPanFromGstin(normalized);
    const supplierState = extractStateCodeFromGstin(normalized);

    if (vendorId) {
      // Check 1: Supplier GSTIN must match one of vendor's active registrations
      const registrations = await db.query(
        "SELECT gstin, gst_state_code FROM vendor_gst_registrations WHERE vendor_id = ? AND status = 'active'",
        [vendorId]
      );
      const registeredGstins = registrations.map((r) => (r.gstin || '').trim().toUpperCase());
      if (!registeredGstins.includes(normalized)) {
        checks.push({
          severity: 'block',
          code: 'supplier_gstin_not_registered',
          detail: `Supplier GSTIN ${normalized} not found in vendor's active GST registrations`,
        });
      }

      // Check 2: State code in GSTIN vs vendor's primary state (from first registration's gst_state_code)
      if (supplierState && registrations.length > 0) {
        const primaryStateCode = registrations[0].gst_state_code;
        if (primaryStateCode && primaryStateCode !== supplierState) {
          checks.push({
            severity: 'warn',
            code: 'supplier_state_mismatch',
            detail: `Supplier GSTIN state ${supplierState} differs from vendor primary state ${primaryStateCode}`,
          });
        }
      }

      // Check 3: PAN embedded in GSTIN vs vendor's PAN on vendor_pan_compliance
      if (supplierPan) {
        const panRows = await db.query(
          'SELECT pan FROM vendor_pan_compliance WHERE vendor_id = ?',
          [vendorId]
        );
        if (panRows.length > 0 && panRows[0].pan) {
          const vendorPan = panRows[0].pan.trim().toUpperCase();
          if (vendorPan !== supplierPan) {
            checks.push({
              severity: 'block',
              code: 'supplier_pan_mismatch_fraud_signal',
              detail: `PAN in supplier GSTIN (${supplierPan}) does not match vendor PAN (${vendorPan})`,
            });
          }
        }
      }
    }
  }

  // --- Recipient GSTIN checks ---
  if (recipientGstin && entityId) {
    const formatResult = validateGstinFormat(recipientGstin);
    if (!formatResult.valid) {
      checks.push({ severity: 'block', code: 'invalid_gstin_format', detail: `Recipient GSTIN: ${formatResult.error}` });
      return { ok: checks.every((c) => c.severity !== 'block') ? true : false, checks };
    }

    // TODO WS-1a-client: entity GSTIN source
    // The entities table does not have GSTIN columns yet. When entity
    // GST registrations are added (either as a related table or JSON column),
    // wire in the recipient match checks here following the same pattern:
    // 1. Recipient GSTIN must match entity's registered GSTINs → block
    // 2. State code mismatch → warn
    // 3. PAN mismatch → block
  }

  const hasBlock = checks.some((c) => c.severity === 'block');
  return { ok: !hasBlock, checks };
}
