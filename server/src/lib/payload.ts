// Sanitise a form-driven create/update payload before handing it to Prisma.
//
// Two problems this solves, both of which crash Prisma with bare-500 responses
// when the request body comes straight off a React form:
//
// 1. Immutable / auto-managed fields. Forms that echo back a GET response
//    include `id`, `tenantId`, `createdAt`, `updatedAt`, `_count`. Prisma
//    rejects them on update/create.
//
// 2. Empty-string nullable fields. HTML `<input type="date">` produces `""`
//    when blank, but Prisma `DateTime?` columns expect `null` or a valid
//    ISO-8601 string — empty string → "premature end of input". Same trap
//    for optional FK string columns (`tdsSectionId: ""`) — those fail the
//    foreign-key constraint at the DB layer.
//
// Usage:
//   const data = sanitisePayload(req.body, {
//     nullableFields: ['dueDate', 'periodFrom', 'periodTo', 'tdsSectionId'],
//   })

export interface SanitiseOptions {
  // Names of fields whose empty-string value should be coerced to `null`.
  // Use for all DateTime? columns and any FK String? columns the form may
  // surface as empty.
  nullableFields?: readonly string[]
  // Extra field names to remove outright. Use for relation accessors and
  // derived fields that the GET response includes (e.g. `vendor`, `lines`,
  // `_count`, `hasFile`) — they crash Prisma when echoed into update().
  stripFields?: readonly string[]
}

const IMMUTABLE_FIELDS = ['id', 'tenantId', 'createdAt', 'updatedAt', '_count'] as const

export function sanitisePayload(
  body: unknown,
  options: SanitiseOptions = {},
): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {}
  const out: Record<string, unknown> = { ...(body as Record<string, unknown>) }
  for (const f of IMMUTABLE_FIELDS) delete out[f]
  for (const f of options.stripFields ?? []) delete out[f]
  for (const f of options.nullableFields ?? []) {
    if (out[f] === '') out[f] = null
  }
  return out
}
