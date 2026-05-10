/**
 * Row-level validator for Master Bulk Upload.
 *
 * Given a parsed sheet, a chosen master schema, and a resolved column mapping,
 * return a ValidationResult with per-row canonical records and issues. This
 * module does NOT query the database — FK checks are handled downstream in
 * masterPrerequisites.ts.
 */

import type {
  ColumnMapping,
  FieldType,
  MasterFieldDef,
  MasterSchema,
  ParsedSheet,
  ValidatedRow,
  ValidationIssue,
  ValidationResult,
  ValidationSummary,
} from './bulkUploadTypes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

function parseBoolean(raw: unknown): boolean | null {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') {
    if (raw === 1) return true;
    if (raw === 0) return false;
    return null;
  }
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase();
    if (v === 'true' || v === 'yes' || v === '1') return true;
    if (v === 'false' || v === 'no' || v === '0') return false;
  }
  return null;
}

function toIsoDate(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw.toISOString();
  }
  if (typeof raw === 'number') {
    // Excel serials are handled by SheetJS when cellDates:true is set,
    // but allow numeric fallback via Date constructor just in case.
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/**
 * Convert a raw cell value into the canonical typed representation for the
 * given field type. Returns null when the value is blank. For enums, returns
 * the canonical-cased enumValue on match, otherwise the trimmed string so the
 * validator can report a precise error.
 */
export function coerceValue(raw: unknown, type: FieldType, enumValues?: string[]): unknown {
  if (isBlank(raw)) return null;

  switch (type) {
    case 'string':
    case 'email':
    case 'url':
      return String(raw).trim();

    case 'number': {
      if (typeof raw === 'number') return raw;
      const n = Number(String(raw).trim());
      return Number.isFinite(n) ? n : String(raw).trim();
    }

    case 'integer': {
      if (typeof raw === 'number') return raw;
      const n = Number(String(raw).trim());
      return Number.isFinite(n) ? n : String(raw).trim();
    }

    case 'boolean': {
      const parsed = parseBoolean(raw);
      return parsed === null ? String(raw).trim() : parsed;
    }

    case 'date': {
      const iso = toIsoDate(raw);
      return iso === null ? String(raw).trim() : iso;
    }

    case 'enum': {
      const s = String(raw).trim();
      if (!enumValues || enumValues.length === 0) return s;
      const canonical = enumValues.find((v) => v.toLowerCase() === s.toLowerCase());
      return canonical ?? s;
    }

    default:
      return raw;
  }
}

function validateFieldValue(
  field: MasterFieldDef,
  value: unknown,
  rowIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (isBlank(value)) {
    return issues; // required check handled by caller
  }

  switch (field.type) {
    case 'email': {
      if (typeof value !== 'string' || !EMAIL_RE.test(value)) {
        issues.push({
          rowIndex,
          field: field.key,
          severity: 'error',
          message: `${field.label} must be a valid email address`,
        });
      }
      break;
    }
    case 'url': {
      if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
        issues.push({
          rowIndex,
          field: field.key,
          severity: 'error',
          message: `${field.label} must start with http:// or https://`,
        });
      }
      break;
    }
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push({
          rowIndex,
          field: field.key,
          severity: 'error',
          message: `${field.label} must be a valid number`,
        });
      }
      break;
    }
    case 'integer': {
      if (typeof value !== 'number' || !Number.isFinite(value) || value % 1 !== 0) {
        issues.push({
          rowIndex,
          field: field.key,
          severity: 'error',
          message: `${field.label} must be a whole number`,
        });
      }
      break;
    }
    case 'date': {
      if (typeof value !== 'string' || isNaN(new Date(value).getTime())) {
        issues.push({
          rowIndex,
          field: field.key,
          severity: 'error',
          message: `${field.label} must be a valid date`,
        });
      }
      break;
    }
    case 'enum': {
      const allowed = field.enumValues ?? [];
      const match =
        typeof value === 'string' && allowed.some((v) => v.toLowerCase() === value.toLowerCase());
      if (!match) {
        issues.push({
          rowIndex,
          field: field.key,
          severity: 'error',
          message: `${field.label} must be one of: ${allowed.join(', ')}`,
        });
      }
      break;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        issues.push({
          rowIndex,
          field: field.key,
          severity: 'error',
          message: `${field.label} must be true/false, yes/no, or 1/0`,
        });
      }
      break;
    }
    case 'string':
    default:
      break;
  }

  return issues;
}

/**
 * Validate every row in the sheet against the given schema + mapping,
 * producing canonical records ready for upsert.
 */
export function validateRows(
  sheet: ParsedSheet,
  schema: MasterSchema,
  mapping: ColumnMapping
): ValidationResult {
  const rows: ValidatedRow[] = [];
  const allIssues: ValidationIssue[] = [];

  sheet.rows.forEach((row, rowIndex) => {
    const record: Record<string, unknown> = {};
    const rowIssues: ValidationIssue[] = [];

    for (const field of schema.fields) {
      const rawHeader = mapping[field.key] ?? null;
      const rawCell = rawHeader !== null ? row[rawHeader] : undefined;

      let coerced = coerceValue(rawCell, field.type, field.enumValues);

      if (isBlank(coerced) && field.defaultValue !== undefined) {
        coerced = field.defaultValue;
      }

      // Required check
      if (field.required && isBlank(coerced)) {
        rowIssues.push({
          rowIndex,
          field: field.key,
          severity: 'error',
          message: `${field.label} is required`,
        });
        record[field.key] = null;
        continue;
      }

      // Type-specific rules
      if (!isBlank(coerced)) {
        const fieldIssues = validateFieldValue(field, coerced, rowIndex);
        rowIssues.push(...fieldIssues);
      }

      // Foreign keys are passed through as trimmed strings — resolution
      // happens in masterPrerequisites.ts against live master data.
      if (field.foreignKey && !isBlank(coerced)) {
        record[field.key] = String(coerced).trim();
      } else {
        record[field.key] = isBlank(coerced) ? null : coerced;
      }
    }

    allIssues.push(...rowIssues);
    rows.push({
      rowIndex,
      record,
      issues: rowIssues,
      valid: rowIssues.every((i) => i.severity !== 'error'),
    });
  });

  const summary: ValidationSummary = {
    total: rows.length,
    valid: rows.filter((r) => r.valid && r.issues.length === 0).length,
    withWarnings: rows.filter((r) => r.issues.some((i) => i.severity === 'warning')).length,
    withErrors: rows.filter((r) => r.issues.some((i) => i.severity === 'error')).length,
  };

  return { rows, issues: allIssues, summary };
}
