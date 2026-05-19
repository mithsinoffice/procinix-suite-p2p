// Purchase Requisition edit helpers — pure functions extracted for unit tests.
// The async route handler in routes/procurement.ts wraps these with DB I/O.

export interface PrSnapshot {
  status:            string
  departmentId?:     string | null
  locationId?:       string | null
  costCentreId?:     string | null
  notes?:            string | null
  narration?:        string | null
  requestedDeliveryDate?: Date | string | null
  estimatedTotal?:   number | string | null
}

export type EditableField =
  | 'departmentId' | 'locationId' | 'costCentreId'
  | 'notes' | 'narration' | 'requestedDeliveryDate'
  | 'lines' | 'estimatedTotal'

// Fields that can be changed in edit mode. Anything else in the payload
// (e.g. prRef, requesterId, entityId, createdAt) is silently ignored by
// the route handler — the test asserts this.
export const EDITABLE_FIELDS: readonly EditableField[] = [
  'departmentId', 'locationId', 'costCentreId',
  'notes', 'narration', 'requestedDeliveryDate',
  'lines', 'estimatedTotal',
] as const

export type EditabilityResult =
  | { ok: true }
  | { ok: false; reason: 'NOT_DRAFT'; status: string }

/**
 * A PR may only be edited while in DRAFT status. Once submitted, the only way
 * to modify it is the standard workflow reject → returns to DRAFT loop.
 */
export function validatePrEditable(pr: { status: string }): EditabilityResult {
  if (pr.status !== 'DRAFT') return { ok: false, reason: 'NOT_DRAFT', status: pr.status }
  return { ok: true }
}

/**
 * Compute which editable fields differ between the saved PR and the incoming
 * payload. Used to build a human-readable "Edited by X — fields changed: …"
 * audit log entry. Comparison is shallow + uses strict equality after coercion
 * for the date / number cases.
 */
export function diffPrFields(existing: PrSnapshot, incoming: Record<string, unknown>): string[] {
  const changed: string[] = []

  const coerce = (v: unknown): unknown => {
    if (v == null || v === '') return null
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
    return v
  }

  for (const field of EDITABLE_FIELDS) {
    if (!(field in incoming)) continue
    if (field === 'lines') {
      // Line-item diffs are common and noisy; collapse to a single "lines" entry.
      changed.push('lines')
      continue
    }
    const before = coerce((existing as Record<string, unknown>)[field])
    const after  = coerce(incoming[field])
    if (before !== after) changed.push(field)
  }
  return changed
}

/**
 * Sum line items to recompute `estimatedTotal`. Mirrors the create path's
 * formula. Returns 0 for empty / missing lines so the column never goes null.
 */
export function calcEstimatedTotal(lines: { qty?: number | string; estimatedPrice?: number | string }[] | undefined): number {
  if (!lines?.length) return 0
  return lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.estimatedPrice) || 0), 0)
}
