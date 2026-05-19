// Pure helpers for the item-master change-request flow.
//
// Policy: when an ACTIVE item is edited, material fields (tax-impacting,
// finance-sensitive) cannot be mutated directly — they go through a
// workflow-gated change request. Non-material fields (description, OCR
// keywords, advance flag, RCM toggle) save directly.
//
// All helpers are pure — Decimal coercion via Number() for cross-Prisma-
// representation compatibility. Decoupled from Prisma so the rules can be
// unit-tested without a live DB.

export const MATERIAL_FIELDS = [
  'gstRate',
  'tdsSectionId',
  'hsnCode',
  'sacCode',
  'provisionRequired',
  'provisionAmount',
  'provisionFrequency',
  'provisionBasis',
] as const

export type MaterialField = typeof MATERIAL_FIELDS[number]

// Numeric material fields whose values may arrive as string or number from
// Prisma Decimal columns. Listed explicitly so HSN/SAC codes (digit strings
// that must preserve leading zeros) are never coerced to Number.
const NUMERIC_MATERIAL_FIELDS = new Set<string>([
  'gstRate', 'provisionAmount',
])

// Treat null/undefined/'' as the same "absent" value when comparing field
// values for diff purposes. For NUMERIC_MATERIAL_FIELDS, also normalise the
// Decimal-as-string vs Decimal-as-number drift (Prisma hydrates Decimals
// inconsistently across query paths). HSN/SAC codes stay strings because
// '00614' and 614 are different items.
function normaliseForCompare(field: string, v: unknown): unknown {
  if (v === null || v === undefined || v === '') return null
  if (NUMERIC_MATERIAL_FIELDS.has(field) && (typeof v === 'string' || typeof v === 'number')) {
    const n = Number(v)
    return Number.isFinite(n) ? n : v
  }
  return v
}

// Storage normalisation: keep the value the caller sent (preserves HSN
// string-ness), but collapse '' → null so the persisted diff and downstream
// apply step never see Prisma-rejecting empty strings.
function normaliseForStorage(v: unknown): unknown {
  return v === '' || v === undefined ? null : v
}

export interface MaterialDiff {
  hasMaterialChange: boolean
  fields: MaterialField[]
  before: Partial<Record<MaterialField, unknown>>
  after:  Partial<Record<MaterialField, unknown>>
}

// Compare two item snapshots and return the diff of MATERIAL fields only.
// Non-material edits are ignored — they're allowed to save directly via the
// existing PUT route. The caller decides what to do with the result:
// hasMaterialChange=true → create a change request; false → regular PUT.
export function detectMaterialChange(
  oldItem: Record<string, unknown>,
  newItem: Record<string, unknown>,
): MaterialDiff {
  const before: Partial<Record<MaterialField, unknown>> = {}
  const after:  Partial<Record<MaterialField, unknown>> = {}
  const fields: MaterialField[] = []

  for (const f of MATERIAL_FIELDS) {
    // Only consider fields the caller actually sent — `undefined` in newItem
    // means "not edited", which must not register as a diff.
    if (!(f in newItem)) continue
    const o = normaliseForCompare(f, oldItem[f])
    const n = normaliseForCompare(f, newItem[f])
    if (o !== n) {
      // Comparison uses normalised values; STORAGE preserves original
      // values (so HSN '998314' isn't coerced to a number), with empty-
      // string collapsed to null for Prisma-safe round-trip on apply.
      before[f] = normaliseForStorage(oldItem[f])
      after[f]  = normaliseForStorage(newItem[f])
      fields.push(f)
    }
  }

  return {
    hasMaterialChange: fields.length > 0,
    fields,
    before,
    after,
  }
}

export interface ChangeRequestPayload {
  before: Record<string, unknown>
  after:  Record<string, unknown>
  fields: string[]
}

// Build the payload to persist on the ItemMasterChangeRequest.changedFields
// JSON column. Stores both before and after so the approval UI can render a
// side-by-side comparison; on apply, only `after` is used to mutate the item.
export function buildChangeRequestPayload(diff: MaterialDiff): ChangeRequestPayload {
  return {
    before: diff.before as Record<string, unknown>,
    after:  diff.after  as Record<string, unknown>,
    fields: diff.fields,
  }
}

// Apply an approved change request's `after` block to the live item. Only
// the listed fields are touched — everything else is preserved. Returns the
// update payload (caller wraps with prisma.itemMaster.update). Coerces
// Decimal-bound numbers from string back to number so Prisma's Decimal
// validator accepts them.
export function applyChangeDiff(after: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(after)) {
    if (!MATERIAL_FIELDS.includes(k as MaterialField)) continue   // belt + suspenders
    if (v === null) {
      out[k] = null
      continue
    }
    // Decimal columns can be re-fed as number or string; Prisma accepts both.
    // Strings already-numeric stay strings, which is fine.
    out[k] = v
  }
  return out
}

// Validate a change-request submission. Returns the error to send to the
// client, or null when the request is valid. Centralises the "can this be
// submitted now?" rules so route + tests stay aligned.
export interface ChangeRequestValidation {
  ok:      boolean
  reason?: 'ITEM_NOT_ACTIVE' | 'NO_MATERIAL_CHANGE' | 'PENDING_CHANGE_EXISTS'
  message?: string
}

export function validateChangeRequest(
  itemStatus: string,
  diff: MaterialDiff,
  hasPendingChange: boolean,
): ChangeRequestValidation {
  if (itemStatus !== 'ACTIVE') {
    return {
      ok: false,
      reason: 'ITEM_NOT_ACTIVE',
      message: `Change requests only apply to ACTIVE items. Edit directly for items in ${itemStatus}.`,
    }
  }
  if (!diff.hasMaterialChange) {
    return {
      ok: false,
      reason: 'NO_MATERIAL_CHANGE',
      message: 'No material fields changed — use the standard edit path for non-material updates.',
    }
  }
  if (hasPendingChange) {
    return {
      ok: false,
      reason: 'PENDING_CHANGE_EXISTS',
      message: 'A pending change request already exists for this item. Approve or reject the existing request first.',
    }
  }
  return { ok: true }
}
