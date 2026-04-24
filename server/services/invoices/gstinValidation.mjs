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
