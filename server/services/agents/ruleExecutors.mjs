/**
 * Rule Executors — each function validates a single value/field and
 * returns { passed: boolean, error?: string }.
 */

const SAFE_TABLE_RE = /^[A-Za-z0-9_]+$/;

function sanitizeIdentifier(name) {
  if (!SAFE_TABLE_RE.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return name;
}

// ─── Required ────────────────────────────────────────────────────
export function executeRequired(value) {
  if (value === null || value === undefined || value === '') {
    return { passed: false, error: 'Value is required' };
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { passed: false, error: 'Value is required (whitespace only)' };
  }
  return { passed: true };
}

// ─── Format (regex) ──────────────────────────────────────────────
export function executeFormat(value, pattern) {
  if (value === null || value === undefined || value === '') {
    return { passed: true }; // empty handled by Required rule
  }
  try {
    const re = new RegExp(pattern);
    if (!re.test(String(value))) {
      return { passed: false, error: `Value "${value}" does not match pattern ${pattern}` };
    }
    return { passed: true };
  } catch (err) {
    return { passed: false, error: `Invalid regex pattern: ${err.message}` };
  }
}

// ─── Duplicate check (SQL) ───────────────────────────────────────
export async function executeDuplicate(value, table, field, excludeId, queryFn) {
  if (value === null || value === undefined || value === '') {
    return { passed: true };
  }
  const safeTable = sanitizeIdentifier(table);
  const safeField = sanitizeIdentifier(field);

  let sql = `SELECT COUNT(*) AS cnt FROM ${safeTable} WHERE ${safeField} = ?`;
  const params = [value];

  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  try {
    const rows = await queryFn(sql, params);
    const count = rows[0]?.cnt ?? 0;
    if (count > 0) {
      return { passed: false, error: `Duplicate value "${value}" found in ${safeTable}.${safeField}` };
    }
    return { passed: true };
  } catch (err) {
    return { passed: false, error: `Duplicate check failed: ${err.message}` };
  }
}

// ─── Cross-reference (SQL lookup) ────────────────────────────────
export async function executeCrossReference(value, refTable, refField, queryFn) {
  if (value === null || value === undefined || value === '') {
    return { passed: true };
  }
  const safeTable = sanitizeIdentifier(refTable);
  const safeField = sanitizeIdentifier(refField);

  try {
    const rows = await queryFn(
      `SELECT COUNT(*) AS cnt FROM ${safeTable} WHERE ${safeField} = ?`,
      [value]
    );
    const count = rows[0]?.cnt ?? 0;
    if (count === 0) {
      return { passed: false, error: `No matching record for "${value}" in ${safeTable}.${safeField}` };
    }
    return { passed: true };
  } catch (err) {
    return { passed: false, error: `Cross-reference check failed: ${err.message}` };
  }
}

// ─── Math validation ─────────────────────────────────────────────
export function executeMathValidation(fields, formula, tolerance = 0) {
  try {
    // Build a safe evaluation context from field values
    const keys = Object.keys(fields);
    const values = keys.map((k) => Number(fields[k]) || 0);

    // Replace field references in formula with positional args
    let expr = formula;
    for (let i = 0; i < keys.length; i++) {
      expr = expr.replace(new RegExp(`\\b${keys[i]}\\b`, 'g'), `__v[${i}]`);
    }

    // eslint-disable-next-line no-new-func
    const fn = new Function('__v', `'use strict'; return (${expr});`);
    const result = fn(values);

    // A math validation passes if the expression evaluates to 0 (or within tolerance)
    const diff = Math.abs(Number(result));
    if (diff > tolerance) {
      return { passed: false, error: `Math validation failed: result=${result}, tolerance=${tolerance}` };
    }
    return { passed: true };
  } catch (err) {
    return { passed: false, error: `Math validation error: ${err.message}` };
  }
}

// ─── Threshold check ─────────────────────────────────────────────
export function executeThreshold(value, min, max) {
  if (value === null || value === undefined || value === '') {
    return { passed: true };
  }
  const num = Number(value);
  if (isNaN(num)) {
    return { passed: false, error: `Value "${value}" is not a number` };
  }
  if (min !== null && min !== undefined && num < min) {
    return { passed: false, error: `Value ${num} is below minimum ${min}` };
  }
  if (max !== null && max !== undefined && num > max) {
    return { passed: false, error: `Value ${num} exceeds maximum ${max}` };
  }
  return { passed: true };
}

// ─── Custom (sandboxed Function eval) ────────────────────────────
export function executeCustom(value, code) {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('value', `'use strict'; ${code}`);
    const result = fn(value);
    if (typeof result === 'object' && result !== null && 'passed' in result) {
      return result;
    }
    // Treat truthy return as pass
    if (result) {
      return { passed: true };
    }
    return { passed: false, error: 'Custom validation returned falsy' };
  } catch (err) {
    return { passed: false, error: `Custom rule error: ${err.message}` };
  }
}
