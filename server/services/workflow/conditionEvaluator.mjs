/**
 * Workflow condition evaluator + workflow selector.
 *
 * `workflow_configurations.conditions` is a JSON array of
 *   { field, operator, value, logicalOp? }
 *
 * `field` is a flat key (e.g. "invoice_amount", "department") and is matched
 * against the document either at the same key or under a dotted alias from
 * `workflow_field_registry.field_source` (e.g. "document.total_amount"). The
 * dispatcher passes the documentPayload, so callers don't have to flatten.
 *
 * Pure functions only — no DB, no React, no side effects. Trivially unit
 * testable. The `selectWorkflowForDocument` consumer is the only DB-touching
 * helper here and it takes the `query` function injected for testability.
 */

const NUMERIC_OPS = new Set(['gt', 'lt', 'gte', 'lte']);
const STRING_OPS = new Set(['contains']);
const SET_OPS = new Set(['in', 'not_in']);
const EQUALITY_OPS = new Set(['eq', 'neq']);

function readField(document, field) {
  if (!document || !field) return undefined;
  // Direct match wins ("invoice_amount" → document.invoice_amount).
  if (Object.prototype.hasOwnProperty.call(document, field)) return document[field];
  // Common aliasing: a few document shapes write total_amount but the form
  // condition uses invoice_amount. Try the obvious fallbacks before giving up.
  const fallbackMap = {
    invoice_amount: ['total_amount', 'amount'],
    total_amount: ['amount', 'invoice_amount'],
    amount: ['total_amount', 'invoice_amount'],
    department: ['department_name', 'dept'],
    entity: ['entity_id', 'entity_name', 'bill_to_entity'],
    vendor_id: ['vendor_code'],
    rcm_applicable: ['rcm', 'rcmApplicable'],
  };
  const fallbacks = fallbackMap[field];
  if (fallbacks) {
    for (const alt of fallbacks) {
      if (Object.prototype.hasOwnProperty.call(document, alt)) return document[alt];
    }
  }
  return undefined;
}

function toNumber(value) {
  if (value == null) return NaN;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function toStringTrimLower(value) {
  if (value == null) return '';
  return String(value).trim().toLowerCase();
}

function toBoolean(value) {
  if (value === true || value === false) return value;
  const s = toStringTrimLower(value);
  if (s === 'true' || s === '1' || s === 'yes' || s === 'y') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'n' || s === '') return false;
  return Boolean(value);
}

/**
 * Evaluate ONE condition against the document.
 * Returns boolean. Unknown operators and unreadable fields return false.
 */
export function evaluateSingleCondition(condition, document) {
  if (!condition || typeof condition !== 'object') return false;
  const { field, operator, value } = condition;
  if (!field || !operator) return false;
  const op = String(operator).toLowerCase();
  const docValue = readField(document, field);

  if (NUMERIC_OPS.has(op)) {
    const a = toNumber(docValue);
    const b = toNumber(value);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (op === 'gt') return a > b;
    if (op === 'lt') return a < b;
    if (op === 'gte') return a >= b;
    if (op === 'lte') return a <= b;
  }
  if (EQUALITY_OPS.has(op)) {
    // Equality is tolerant: compare as strings (case-insensitive), but also
    // as numbers when both sides parse — covers "100" == 100.
    const aN = toNumber(docValue);
    const bN = toNumber(value);
    if (Number.isFinite(aN) && Number.isFinite(bN)) {
      return op === 'eq' ? aN === bN : aN !== bN;
    }
    // Booleans: handle "true"/"false" strings + booleans uniformly.
    if (typeof docValue === 'boolean' || typeof value === 'boolean') {
      return op === 'eq'
        ? toBoolean(docValue) === toBoolean(value)
        : toBoolean(docValue) !== toBoolean(value);
    }
    const eq = toStringTrimLower(docValue) === toStringTrimLower(value);
    return op === 'eq' ? eq : !eq;
  }
  if (STRING_OPS.has(op)) {
    return toStringTrimLower(docValue).includes(toStringTrimLower(value));
  }
  if (SET_OPS.has(op)) {
    // `value` may be array or comma-separated string.
    const arr = Array.isArray(value) ? value : String(value ?? '').split(',');
    const target = toStringTrimLower(docValue);
    const set = new Set(arr.map((v) => toStringTrimLower(v)));
    return op === 'in' ? set.has(target) : !set.has(target);
  }
  return false;
}

/**
 * Evaluate an array of conditions. Each condition carries an optional
 * `logicalOp` (AND/OR) that gates the NEXT condition. Default AND.
 * Empty/missing array returns true (matches everything — "always run").
 */
export function evaluateConditions(conditions, document) {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  let acc = evaluateSingleCondition(conditions[0], document);
  for (let i = 1; i < conditions.length; i++) {
    const prevOp = String(conditions[i - 1]?.logicalOp || 'AND').toUpperCase();
    const cur = evaluateSingleCondition(conditions[i], document);
    if (prevOp === 'OR') acc = acc || cur;
    else acc = acc && cur;
  }
  return Boolean(acc);
}

/**
 * Find the highest-priority Active workflow configuration whose conditions
 * match the document. Ordering rule (spec PART 3):
 *   1. Configs with conditions go before configs without (more specific first)
 *   2. Within each bucket, older configs win (deterministic, predictable)
 *
 * `db` is the mysql connection pool (provides `execute`).
 * Returns a normalised workflow object or null.
 */
export async function selectWorkflowForDocument(documentType, document, tenantId, db) {
  if (!documentType) return null;
  const [rows] = await db.execute(
    `SELECT id, workflow_name, module_name, description, trigger_event,
            conditions, steps, status, created_date, created_at
       FROM workflow_configurations
      WHERE LOWER(module_name) = LOWER(?)
        AND status = 'Active'
      ORDER BY created_at ASC`,
    [documentType]
  );

  if (!rows || rows.length === 0) {
    // Some seeds use the human-readable label as `module_name` (e.g.
    // "Purchase Orders"). Fall back to a sloppy match so legacy seeds still
    // resolve. Restrictive enough to avoid cross-document collisions.
    const labelMap = {
      ap_invoice: ['Accounts Payable Invoice', 'AP Invoice', 'Invoice'],
      non_po_invoice: ['Non-PO Invoice', 'Invoice'],
      purchase_order: ['Purchase Orders', 'Purchase Order'],
      purchase_request: ['Purchase Requisition', 'Purchase Request'],
      grn: ['Goods Receipt', 'GRN'],
      payment: ['Payment'],
      vendor_advance: ['Vendor Advance'],
      debit_note: ['Debit Note'],
      master_update: ['Master Update', 'Vendor Master'],
    };
    const labels = labelMap[documentType] || [];
    if (labels.length === 0) return null;
    const placeholders = labels.map(() => '?').join(',');
    const [fbRows] = await db.execute(
      `SELECT id, workflow_name, module_name, description, trigger_event,
              conditions, steps, status, created_date, created_at
         FROM workflow_configurations
        WHERE module_name IN (${placeholders})
          AND status = 'Active'
        ORDER BY created_at ASC`,
      labels
    );
    if (!fbRows || fbRows.length === 0) return null;
    return pickMatchingConfig(fbRows, document);
  }

  return pickMatchingConfig(rows, document);
}

function parseJsonColumn(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function pickMatchingConfig(rows, document) {
  // Normalise + bucket by has-conditions vs no-conditions.
  const normalised = rows.map((row) => ({
    id: row.id,
    workflowName: row.workflow_name,
    moduleName: row.module_name,
    description: row.description,
    triggerEvent: row.trigger_event,
    conditions: parseJsonColumn(row.conditions, []),
    steps: parseJsonColumn(row.steps, []),
    status: row.status,
    createdAt: row.created_at,
  }));
  const withConds = normalised.filter(
    (c) => Array.isArray(c.conditions) && c.conditions.length > 0
  );
  const noConds = normalised.filter(
    (c) => !Array.isArray(c.conditions) || c.conditions.length === 0
  );
  for (const candidate of withConds) {
    if (evaluateConditions(candidate.conditions, document)) return candidate;
  }
  // No conditional rule matched — fall through to the unconditional default.
  return noConds[0] || null;
}
