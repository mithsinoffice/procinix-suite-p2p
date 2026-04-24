import { describe, it, expect } from 'vitest';
import {
  validateGstinFormat,
  extractPanFromGstin,
  extractStateCodeFromGstin,
  validateGstinMatch,
} from '../gstinValidation.mjs';

// ---------------------------------------------------------------------------
// Known-valid GSTINs for testing.
// These use the standard mod-36 checksum algorithm.
// Constructed: state + PAN + entity + Z + computed check digit.
// ---------------------------------------------------------------------------

// Helper: compute check digit for test fixture construction
function computeCheck(first14) {
  const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const v = CHARS.indexOf(first14[i]);
    const f = (i % 2 === 0) ? 1 : 2;
    const p = v * f;
    total += Math.floor(p / 36) + (p % 36);
  }
  return CHARS[(36 - (total % 36)) % 36];
}

// Build a valid GSTIN from components
function buildGstin(stateCode, pan, entityCode) {
  const first14 = `${stateCode}${pan}${entityCode}Z`;
  return first14 + computeCheck(first14);
}

// Test fixtures
const VALID_GSTIN_MH = buildGstin('27', 'AABCU9603R', '1');  // Maharashtra
const VALID_GSTIN_KA = buildGstin('29', 'AADCB2230M', '1');  // Karnataka
const VALID_GSTIN_DL = buildGstin('07', 'AAACH7409R', '1');  // Delhi
const VALID_GSTIN_TN = buildGstin('33', 'AABCT1332L', '1');  // Tamil Nadu
const VALID_GSTIN_97 = buildGstin('97', 'AABCU9603R', '1');  // Other territory

// ---------------------------------------------------------------------------
// validateGstinFormat
// ---------------------------------------------------------------------------

describe('validateGstinFormat — valid GSTINs', () => {
  it('validates Maharashtra GSTIN', () => {
    const result = validateGstinFormat(VALID_GSTIN_MH);
    expect(result.valid).toBe(true);
    expect(result.components.stateCode).toBe('27');
    expect(result.components.pan).toBe('AABCU9603R');
    expect(result.components.entityCode).toBe('1');
  });

  it('validates Karnataka GSTIN', () => {
    const result = validateGstinFormat(VALID_GSTIN_KA);
    expect(result.valid).toBe(true);
    expect(result.components.stateCode).toBe('29');
  });

  it('validates Delhi GSTIN', () => {
    const result = validateGstinFormat(VALID_GSTIN_DL);
    expect(result.valid).toBe(true);
    expect(result.components.stateCode).toBe('07');
  });

  it('validates Tamil Nadu GSTIN', () => {
    const result = validateGstinFormat(VALID_GSTIN_TN);
    expect(result.valid).toBe(true);
    expect(result.components.stateCode).toBe('33');
  });

  it('validates state code 97 (other territory)', () => {
    const result = validateGstinFormat(VALID_GSTIN_97);
    expect(result.valid).toBe(true);
    expect(result.components.stateCode).toBe('97');
  });
});

describe('validateGstinFormat — lowercase normalization', () => {
  it('normalizes lowercase input to uppercase and validates', () => {
    const lower = VALID_GSTIN_MH.toLowerCase();
    const result = validateGstinFormat(lower);
    expect(result.valid).toBe(true);
    expect(result.components.pan).toBe('AABCU9603R');
  });

  it('normalizes mixed case', () => {
    const mixed = VALID_GSTIN_KA.substring(0, 5).toLowerCase() + VALID_GSTIN_KA.substring(5);
    const result = validateGstinFormat(mixed);
    expect(result.valid).toBe(true);
  });
});

describe('validateGstinFormat — invalid inputs', () => {
  it('rejects null', () => {
    const result = validateGstinFormat(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('rejects undefined', () => {
    const result = validateGstinFormat(undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects empty string', () => {
    const result = validateGstinFormat('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('rejects wrong length (14 chars)', () => {
    const result = validateGstinFormat('27AABCU9603R1Z');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('15 characters');
  });

  it('rejects wrong length (16 chars)', () => {
    const result = validateGstinFormat('27AABCU9603R1Z00');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('15 characters');
  });
});

describe('validateGstinFormat — invalid state codes', () => {
  it('rejects state code 00', () => {
    const gstin = buildGstin('00', 'AABCU9603R', '1');
    // Override state code to 00 (computeCheck runs on the 00 version)
    const result = validateGstinFormat(gstin);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid state code');
  });

  it('rejects state code 39', () => {
    const gstin = buildGstin('39', 'AABCU9603R', '1');
    const result = validateGstinFormat(gstin);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid state code');
  });

  it('rejects state code 50', () => {
    const gstin = buildGstin('50', 'AABCU9603R', '1');
    const result = validateGstinFormat(gstin);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid state code');
  });
});

describe('validateGstinFormat — invalid checksum', () => {
  it('rejects a GSTIN with wrong check digit', () => {
    // Take a valid GSTIN and flip the last character
    const original = VALID_GSTIN_MH;
    const wrongCheck = original[14] === '0' ? '1' : '0';
    const tampered = original.substring(0, 14) + wrongCheck;
    const result = validateGstinFormat(tampered);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Checksum mismatch');
  });
});

describe('validateGstinFormat — format violations', () => {
  it('rejects GSTIN with digits in PAN alpha positions', () => {
    const result = validateGstinFormat('27112CU9603R1ZQ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('format invalid');
  });

  it('rejects GSTIN without Z at position 13', () => {
    // Replace Z with A
    const noZ = VALID_GSTIN_MH.substring(0, 13) + 'A' + VALID_GSTIN_MH[14];
    const result = validateGstinFormat(noZ);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('format invalid');
  });

  it('rejects GSTIN with special characters', () => {
    const result = validateGstinFormat('27AABCU9603R1Z@');
    expect(result.valid).toBe(false);
  });
});

describe('validateGstinFormat — whitespace handling', () => {
  it('trims leading/trailing whitespace', () => {
    const result = validateGstinFormat(`  ${VALID_GSTIN_MH}  `);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// extractPanFromGstin
// ---------------------------------------------------------------------------

describe('extractPanFromGstin', () => {
  it('extracts PAN from valid GSTIN', () => {
    expect(extractPanFromGstin(VALID_GSTIN_MH)).toBe('AABCU9603R');
  });

  it('extracts PAN from lowercase GSTIN', () => {
    expect(extractPanFromGstin(VALID_GSTIN_KA.toLowerCase())).toBe('AADCB2230M');
  });

  it('returns null for null input', () => {
    expect(extractPanFromGstin(null)).toBeNull();
  });

  it('returns null for wrong length', () => {
    expect(extractPanFromGstin('TOOSHORT')).toBeNull();
  });

  it('returns null for numeric PAN positions', () => {
    expect(extractPanFromGstin('271234567890X1ZQ')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractStateCodeFromGstin
// ---------------------------------------------------------------------------

describe('extractStateCodeFromGstin', () => {
  it('extracts state code from valid GSTIN', () => {
    expect(extractStateCodeFromGstin(VALID_GSTIN_MH)).toBe('27');
  });

  it('extracts state code 07 (Delhi)', () => {
    expect(extractStateCodeFromGstin(VALID_GSTIN_DL)).toBe('07');
  });

  it('returns null for invalid state code', () => {
    expect(extractStateCodeFromGstin('00AABCU9603R1ZQ')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(extractStateCodeFromGstin(null)).toBeNull();
  });

  it('returns null for too-short input', () => {
    expect(extractStateCodeFromGstin('2')).toBeNull();
  });

  it('normalizes lowercase', () => {
    expect(extractStateCodeFromGstin(VALID_GSTIN_TN.toLowerCase())).toBe('33');
  });
});

// ---------------------------------------------------------------------------
// validateGstinMatch — Level 3 match validation
// ---------------------------------------------------------------------------

function makeDb(overrides = {}) {
  const defaults = {
    registrations: [],
    panRows: [],
  };
  const data = { ...defaults, ...overrides };

  return {
    query: async (sql, _params) => {
      if (sql.includes('vendor_gst_registrations')) return data.registrations;
      if (sql.includes('vendor_pan_compliance')) return data.panRows;
      return [];
    },
  };
}

// Reuse VALID_GSTIN_MH which has PAN=AABCU9603R and state=27
const SUPPLIER_PAN = 'AABCU9603R';

describe('validateGstinMatch — supplier GSTIN checks', () => {
  it('returns ok when supplier GSTIN matches a registered GSTIN', async () => {
    const db = makeDb({
      registrations: [{ gstin: VALID_GSTIN_MH, gst_state_code: '27' }],
      panRows: [{ pan: SUPPLIER_PAN }],
    });

    const result = await validateGstinMatch({
      supplierGstin: VALID_GSTIN_MH, vendorId: 'v1', db,
    });

    expect(result.ok).toBe(true);
    expect(result.checks).toHaveLength(0);
  });

  it('blocks when supplier GSTIN not in vendor registrations', async () => {
    const db = makeDb({
      registrations: [{ gstin: VALID_GSTIN_KA, gst_state_code: '29' }],
      panRows: [{ pan: SUPPLIER_PAN }],
    });

    const result = await validateGstinMatch({
      supplierGstin: VALID_GSTIN_MH, vendorId: 'v1', db,
    });

    expect(result.ok).toBe(false);
    const block = result.checks.find((c) => c.code === 'supplier_gstin_not_registered');
    expect(block).toBeDefined();
    expect(block.severity).toBe('block');
  });

  it('warns on state code mismatch between GSTIN and vendor primary state', async () => {
    const db = makeDb({
      registrations: [{ gstin: VALID_GSTIN_MH, gst_state_code: '29' }], // MH GSTIN but KA state code
      panRows: [{ pan: SUPPLIER_PAN }],
    });

    const result = await validateGstinMatch({
      supplierGstin: VALID_GSTIN_MH, vendorId: 'v1', db,
    });

    const warn = result.checks.find((c) => c.code === 'supplier_state_mismatch');
    expect(warn).toBeDefined();
    expect(warn.severity).toBe('warn');
    expect(warn.detail).toContain('27');
    expect(warn.detail).toContain('29');
  });

  it('blocks on PAN mismatch (fraud signal)', async () => {
    const db = makeDb({
      registrations: [{ gstin: VALID_GSTIN_MH, gst_state_code: '27' }],
      panRows: [{ pan: 'ZZZZZ9999Z' }], // different PAN
    });

    const result = await validateGstinMatch({
      supplierGstin: VALID_GSTIN_MH, vendorId: 'v1', db,
    });

    expect(result.ok).toBe(false);
    const block = result.checks.find((c) => c.code === 'supplier_pan_mismatch_fraud_signal');
    expect(block).toBeDefined();
    expect(block.severity).toBe('block');
    expect(block.detail).toContain(SUPPLIER_PAN);
    expect(block.detail).toContain('ZZZZZ9999Z');
  });

  it('state mismatch is warn-only, does not block', async () => {
    // GSTIN registered but state differs — warn but ok remains true (no blocks)
    const db = makeDb({
      registrations: [{ gstin: VALID_GSTIN_MH, gst_state_code: '29' }],
      panRows: [{ pan: SUPPLIER_PAN }],
    });

    const result = await validateGstinMatch({
      supplierGstin: VALID_GSTIN_MH, vendorId: 'v1', db,
    });

    expect(result.ok).toBe(true); // warn doesn't block
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].severity).toBe('warn');
  });
});

describe('validateGstinMatch — format-invalid early return', () => {
  it('returns block immediately for invalid format supplier GSTIN', async () => {
    const db = makeDb();
    const result = await validateGstinMatch({
      supplierGstin: 'INVALID', vendorId: 'v1', db,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].code).toBe('invalid_gstin_format');
    expect(result.checks[0].severity).toBe('block');
  });

  it('returns block for invalid format recipient GSTIN', async () => {
    const db = makeDb({
      registrations: [{ gstin: VALID_GSTIN_MH, gst_state_code: '27' }],
      panRows: [{ pan: SUPPLIER_PAN }],
    });
    const result = await validateGstinMatch({
      supplierGstin: VALID_GSTIN_MH, vendorId: 'v1',
      recipientGstin: 'BAD', entityId: 'e1', db,
    });

    const recipientBlock = result.checks.find((c) => c.detail?.startsWith('Recipient'));
    expect(recipientBlock).toBeDefined();
    expect(recipientBlock.code).toBe('invalid_gstin_format');
  });
});

describe('validateGstinMatch — no vendorId / no supplierGstin', () => {
  it('returns ok with empty checks when supplierGstin is null', async () => {
    const db = makeDb();
    const result = await validateGstinMatch({
      supplierGstin: null, vendorId: 'v1', db,
    });

    expect(result.ok).toBe(true);
    expect(result.checks).toHaveLength(0);
  });

  it('skips vendor checks when vendorId is null', async () => {
    const db = makeDb();
    const result = await validateGstinMatch({
      supplierGstin: VALID_GSTIN_MH, vendorId: null, db,
    });

    expect(result.ok).toBe(true);
    expect(result.checks).toHaveLength(0);
  });
});

describe('validateGstinMatch — recipient GSTIN stub', () => {
  it('does not block on valid recipient GSTIN (entity check stubbed)', async () => {
    const db = makeDb({
      registrations: [{ gstin: VALID_GSTIN_MH, gst_state_code: '27' }],
      panRows: [{ pan: SUPPLIER_PAN }],
    });

    const result = await validateGstinMatch({
      supplierGstin: VALID_GSTIN_MH, vendorId: 'v1',
      recipientGstin: VALID_GSTIN_KA, entityId: 'e1', db,
    });

    // Recipient check is stubbed — no additional blocks from entity matching
    expect(result.ok).toBe(true);
  });
});

describe('validateGstinMatch — multiple checks accumulate', () => {
  it('returns both GSTIN-not-registered block AND PAN mismatch block', async () => {
    const db = makeDb({
      registrations: [{ gstin: VALID_GSTIN_KA, gst_state_code: '29' }],
      panRows: [{ pan: 'ZZZZZ9999Z' }],
    });

    const result = await validateGstinMatch({
      supplierGstin: VALID_GSTIN_MH, vendorId: 'v1', db,
    });

    expect(result.ok).toBe(false);
    expect(result.checks.filter((c) => c.severity === 'block')).toHaveLength(2);
    const codes = result.checks.map((c) => c.code);
    expect(codes).toContain('supplier_gstin_not_registered');
    expect(codes).toContain('supplier_pan_mismatch_fraud_signal');
  });
});
