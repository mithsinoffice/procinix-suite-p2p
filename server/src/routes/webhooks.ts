import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { timingSafeEqual } from 'node:crypto'
import { verifyWebhookSignature } from '../services/transbnk.service.js'
import { writeAuditLog, AuditAction } from '../lib/audit.js'
import { ingestInvoice } from '../services/invoice-ingestion.service.js'
import { scoreAndPersistInvoice } from '../services/invoice-scorer.service.js'
import type { OcrInvoiceData } from '../services/gemini-ocr.service.js'

// Pre-OCR'd invoice payload from n8n. OCR happens in n8n (Gemini/Mistral/etc),
// our server only persists and scores.
const n8nInvoiceSchema = z.object({
  tenantId:        z.string().uuid(),
  messageId:       z.string().min(1),               // dedup key (Gmail msg id, n8n exec id, …)
  channelType:     z.string().default('EMAIL_INGEST'),
  senderEmail:     z.string().email().optional().nullable(),
  subject:         z.string().optional().nullable(),
  attachmentName:  z.string().optional().nullable(),
  mimeType:        z.string().optional().nullable(),
  invoice: z.object({
    invoiceNumber: z.string().nullable().optional(),
    invoiceDate:   z.string().nullable().optional(), // ISO YYYY-MM-DD
    dueDate:       z.string().nullable().optional(),
    vendorGSTIN:   z.string().nullable().optional(),
    vendorPAN:     z.string().nullable().optional(),
    irnNumber:     z.string().nullable().optional(),
    subtotal:      z.number().default(0),
    cgstAmount:    z.number().default(0),
    sgstAmount:    z.number().default(0),
    igstAmount:    z.number().default(0),
    tdsAmount:     z.number().default(0),
    totalAmount:   z.number().default(0),
    ocrConfidence: z.number().min(0).max(100).optional().nullable(),
    lineItems: z.array(z.object({
      description: z.string().default('Line item'),
      hsnCode:     z.string().nullable().optional(),
      sacCode:     z.string().nullable().optional(),
      quantity:    z.number().default(1),
      uom:         z.string().nullable().optional(),
      unitPrice:   z.number().default(0),
      gstRate:     z.number().default(0),
      amount:      z.number().default(0),
    })).default([]),
  }),
})

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// ISO YYYY-MM-DD → DD/MM/YYYY (the format ingestInvoice expects on OcrInvoiceData)
function isoToDmy(iso: string | null | undefined): string | null {
  if (!iso) return null
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

// ── n8n auth: accept either `x-n8n-secret: <token>` or `Authorization: Bearer <token>`.
// Bearer is the standard machine-to-machine convention; x-n8n-secret kept for back-compat
// with workflows already configured.
export function verifyN8nSecret(
  headers: Record<string, string | string[] | undefined>,
  expected: string,
): boolean {
  if (!expected) return false
  const xSecret = (headers['x-n8n-secret'] as string | undefined) ?? ''
  if (xSecret && constantTimeEqual(xSecret, expected)) return true
  const auth = (headers['authorization'] as string | undefined) ?? ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (m && constantTimeEqual(m[1].trim(), expected)) return true
  return false
}

// ── Flat n8n payload (vendor-neutral, used by the new /api/webhooks/n8n/invoice route).
// Mirrors the shape n8n's HTTP node emits by default; translated into the Indian-GST
// flavoured OcrInvoiceData inside the handler.
// .strict() on every object so unknown keys are rejected with a clear 400
// instead of silently dropped. n8n payload-shape drift bit us once in dev —
// a per-field {value, confidence} envelope sailed past Zod's default-loose
// validation and the endpoint persisted an empty invoice. Strict mode forces
// the integrator to either match the shape or explicitly extend the schema.
export const n8nFlatInvoiceSchema = z.object({
  // Optional with default — n8n's native nested format omits `source` entirely
  // and the flat shape doesn't need to require it either (every call to this
  // endpoint is from n8n, so 'email' is the only meaningful value).
  source: z.literal('email').optional().default('email'),
  rawEmail: z.object({
    from:       z.string().optional().nullable(),
    subject:    z.string().optional().nullable(),
    receivedAt: z.string().optional().nullable(),
  }).strict().optional(),
  ocr: z.object({
    vendorName:    z.string().optional().nullable(),
    vendorGstin:   z.string().optional().nullable(),
    invoiceNumber: z.string().optional().nullable(),
    invoiceDate:   z.string().optional().nullable(),  // ISO YYYY-MM-DD
    dueDate:       z.string().optional().nullable(),
    currency:      z.string().optional().nullable(),
    subtotal:      z.number().optional().nullable(),
    taxAmount:     z.number().optional().nullable(),
    totalAmount:   z.number().optional().nullable(),
    lineItems: z.array(z.object({
      description: z.string().default('Line item'),
      quantity:    z.number().default(1),
      unitPrice:   z.number().default(0),
      amount:      z.number().default(0),
      hsn:         z.string().optional().nullable(),
    }).strict()).optional().default([]),
    bankDetails: z.object({
      accountNumber: z.string().optional().nullable(),
      ifsc:          z.string().optional().nullable(),
      bankName:      z.string().optional().nullable(),
    }).strict().optional().nullable(),
    poReference:   z.string().optional().nullable(),
    irn:           z.string().optional().nullable(),
  }).strict().optional(),
  attachmentUrl: z.string().optional().nullable(),
  confidence:    z.number().min(0).max(1).optional().nullable(),
}).strict()
export type N8nFlatInvoice = z.infer<typeof n8nFlatInvoiceSchema>

// Translate the flat n8n shape into OcrInvoiceData. India-specific tax splits
// (CGST/SGST/IGST) are not in the source — totalTax carries the aggregate, the
// reviewer splits it during invoice review. Exported for unit tests.
export function flatToOcrInvoiceData(body: N8nFlatInvoice): Partial<OcrInvoiceData> & { messageId: string } {
  // `body.ocr` is Zod-optional; the `{}` fallback widens to `OcrShape | {}`
  // and TS then refuses every property access. Cast back to the full shape —
  // every field below is read with `?? <default>` so undefined is handled.
  const ocr = (body.ocr ?? {}) as NonNullable<N8nFlatInvoice['ocr']>

  // Stable per-payload dedup key: prefer invoiceNumber+vendor combo, fall back
  // to a hash-like composite so retries with identical body collide.
  const dedupKey = [
    ocr.invoiceNumber ?? '',
    ocr.vendorGstin   ?? ocr.vendorName ?? '',
    body.rawEmail?.from ?? '',
    body.rawEmail?.receivedAt ?? '',
  ].join('|') || `flat:${Date.now()}`

  return {
    messageId:         dedupKey,
    invoiceNumber:     ocr.invoiceNumber ?? null,
    invoiceDate:       isoToDmy(ocr.invoiceDate),
    dueDate:           isoToDmy(ocr.dueDate),
    vendorName:        ocr.vendorName  ?? null,
    vendorGstin:       ocr.vendorGstin ?? null,
    poReference:       ocr.poReference ?? null,
    irn:               ocr.irn         ?? null,
    subtotal:          ocr.subtotal    ?? 0,
    totalTax:          ocr.taxAmount   ?? 0,
    totalAmount:       ocr.totalAmount ?? 0,
    cgst:              0,
    sgst:              0,
    igst:              0,
    currency:          ocr.currency    ?? 'INR',
    isEInvoice:        !!ocr.irn,
    overallConfidence: Math.round(((body.confidence ?? 0) * 100)),
    rawText:           '',
    lineItems: (ocr.lineItems ?? []).map(l => ({
      description: l.description,
      hsn:         l.hsn ?? undefined,
      quantity:    Number(l.quantity)  || 0,
      unitPrice:   Number(l.unitPrice) || 0,
      amount:      Number(l.amount)    || 0,
      gstRate:     0,
      confidence:  Math.round(((body.confidence ?? 0) * 100)),
    })),
  } as Partial<OcrInvoiceData> & { messageId: string }
}

// ── n8n native nested payload ───────────────────────────────────────────────
// n8n's HTTP node emits scalars as { value, confidence } envelopes nested
// under `invoice / vendor / amounts / lineItems`. Numeric fields commonly
// arrive as strings ("2030") because n8n's JSON nodes don't coerce numerics
// out of OCR providers. Both the schema (per-field envelope) and the mapper
// below handle that.
//
// Why two schemas instead of one: the flat shape is the documented spec for
// new integrations and the nested shape is what the live n8n workflow
// already emits. The handler detects which is which by checking for a
// top-level `invoice` key. Strict mode on both prevents silent shape drift.

const nestedScalarSchema = z.object({
  value:      z.union([z.string(), z.number()]).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  // n8n now emits a `suggestions[]` array per field with alternative OCR
  // reads. Optional for back-compat with the older shape that doesn't have it.
  // Values may be numeric on amounts or string on text fields — coerced to
  // strings when persisted into ocrRawData.suggestions.
  suggestions: z.array(z.union([z.string(), z.number()])).optional(),
}).strict()
type NestedScalar = z.infer<typeof nestedScalarSchema>

// Inner extracted-data envelope. n8n now wraps every OCR field under
// `extractedData`, plus adds a `customer` block, `payments[]`, and per-line
// `interval`. The legacy "native" shape (no wrapper, root-level invoice/
// vendor/etc.) is preserved via `n8nNativeInvoiceSchema` below for backwards
// compatibility with older workflow configurations.
const extractedDataSchema = z.object({
  invoice: z.object({
    invoiceNumber:   nestedScalarSchema.optional(),
    invoiceDate:     nestedScalarSchema.optional(),
    dueDate:         nestedScalarSchema.optional(),
    irnNumber:       nestedScalarSchema.optional(),
    poReference:     nestedScalarSchema.optional(),
    billingId:       nestedScalarSchema.optional(),
    domainName:      nestedScalarSchema.optional(),
    billingLocation: nestedScalarSchema.optional(),
    shipToLocation:  nestedScalarSchema.optional(),
  }).strict().optional(),
  vendor: z.object({
    vendorName:    nestedScalarSchema.optional(),
    vendorAddress: nestedScalarSchema.optional(),
    vendorGSTIN:   nestedScalarSchema.optional(),
    vendorPAN:     nestedScalarSchema.optional(),
  }).strict().optional(),
  customer: z.object({
    billToPerson:    nestedScalarSchema.optional(),
    billToCompany:   nestedScalarSchema.optional(),
    customerAddress: nestedScalarSchema.optional(),
    customerGSTIN:   nestedScalarSchema.optional(),
    customerPAN:     nestedScalarSchema.optional(),
    // 2-digit GST state code ("27" for Maharashtra) or state name. The
    // form's normalizeStateCode handles both representations.
    stateCode:       nestedScalarSchema.optional(),
  }).strict().optional(),
  amounts: z.object({
    baseAmount:  nestedScalarSchema.optional(),  // subtotal
    grossAmount: nestedScalarSchema.optional(),  // totalAmount
    taxAmount:   nestedScalarSchema.optional(),
    cgst:        nestedScalarSchema.optional(),
    sgst:        nestedScalarSchema.optional(),
    igst:        nestedScalarSchema.optional(),
    currency:    nestedScalarSchema.optional(),
  }).strict().optional(),
  lineItems: z.array(z.object({
    description: nestedScalarSchema.optional(),
    interval:    nestedScalarSchema.optional(),
    quantity:    nestedScalarSchema.optional(),
    rate:        nestedScalarSchema.optional(),
    amount:      nestedScalarSchema.optional(),
    hsn:         nestedScalarSchema.optional(),
  }).strict()).optional(),
  // payments[] carries any historical payment rows n8n picked up from the
  // PDF. Not mapped to the Invoice model — kept lenient so unknown shapes
  // don't fail parsing.
  payments: z.array(z.record(z.unknown())).optional(),
  status:   z.string().optional(),
}).strict()
type ExtractedData = z.infer<typeof extractedDataSchema>

// Original PDF/image attachment carried alongside extractedData. fileBase64
// is decoded and persisted via saveInvoiceFile so the left-panel preview
// works for email-ingested invoices.
const originalFileSchema = z.object({
  fileName:   z.string().optional(),
  mimeType:   z.string().optional(),
  fileSize:   z.string().optional(),
  binaryKey:  z.string().optional(),
  fileBase64: z.string().optional(),
}).strict()
type OriginalFile = z.infer<typeof originalFileSchema>

export const n8nNativeInvoiceSchema = z.object({
  // n8n's native shape doesn't carry `source` — accepted if present, ignored.
  source: z.literal('email').optional(),
  // New wrapped shape — n8n now puts the OCR fields under extractedData and
  // attaches the original file under originalFile. Both optional so the
  // legacy root-level layout below still parses cleanly.
  extractedData: extractedDataSchema.optional(),
  originalFile:  originalFileSchema.optional(),
  // Legacy root-level fields. When extractedData is set the new fields take
  // precedence and these are ignored.
  invoice: z.object({
    invoiceNumber: nestedScalarSchema.optional(),
    invoiceDate:   nestedScalarSchema.optional(),
    dueDate:       nestedScalarSchema.optional(),
    irnNumber:     nestedScalarSchema.optional(),
    poReference:   nestedScalarSchema.optional(),
  }).strict().optional(),
  vendor: z.object({
    vendorName:  nestedScalarSchema.optional(),
    vendorGSTIN: nestedScalarSchema.optional(),
    vendorPAN:   nestedScalarSchema.optional(),
  }).strict().optional(),
  amounts: z.object({
    baseAmount:  nestedScalarSchema.optional(),
    grossAmount: nestedScalarSchema.optional(),
    taxAmount:   nestedScalarSchema.optional(),
    cgst:        nestedScalarSchema.optional(),
    sgst:        nestedScalarSchema.optional(),
    igst:        nestedScalarSchema.optional(),
    currency:    nestedScalarSchema.optional(),
  }).strict().optional(),
  lineItems: z.array(z.object({
    description: nestedScalarSchema.optional(),
    quantity:    nestedScalarSchema.optional(),
    rate:        nestedScalarSchema.optional(),
    amount:      nestedScalarSchema.optional(),
    hsn:         nestedScalarSchema.optional(),
  }).strict()).optional(),
  // n8n stamps a status string on the body; recorded but not enforced.
  status: z.string().optional(),
  rawEmail: z.object({
    from:       z.string().optional().nullable(),
    subject:    z.string().optional().nullable(),
    receivedAt: z.string().optional().nullable(),
  }).strict().optional(),
  confidence: z.number().min(0).max(1).optional(),
}).strict()
export type N8nNativeInvoice = z.infer<typeof n8nNativeInvoiceSchema>

// Helpers for reading the nested envelope. Each field may be missing entirely,
// have a null value, or carry a string/number — all funnelled into safe types.

function readNestedString(f: NestedScalar | undefined): string | null {
  if (!f || f.value === null || f.value === undefined) return null
  return String(f.value).trim() || null
}

function readNestedNumber(f: NestedScalar | undefined): number {
  if (!f || f.value === null || f.value === undefined) return 0
  const n = typeof f.value === 'number' ? f.value : Number(String(f.value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function readNestedConfidence(f: NestedScalar | undefined): number {
  if (!f || f.confidence === undefined) return 0
  const c = Number(f.confidence)
  return Number.isFinite(c) ? Math.max(0, Math.min(1, c)) : 0
}

// Parse n8n's date strings into the DD/MM/YYYY format OcrInvoiceData expects.
// Accepts: ISO YYYY-MM-DD, "DD/MM/YYYY", "DD-MM-YYYY", "18 Jul 2026".
// We do NOT use Date.parse — it interprets bare date strings as midnight in
// LOCAL time, which becomes the previous day in UTC for any timezone east of
// UTC (an IST clock pushes "18 Jul 2026" to "17 Jul 2026" in getUTCDate()).
// All parsing here is explicit-regex against the literal string.
const MONTHS_3 = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
function parseFlexibleDate(s: string | null): string | null {
  if (!s) return null
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmy) return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`
  // "DD MMM YYYY" (n8n's common emit) — parsed without Date.parse so the
  // result is locale- and timezone-independent.
  const ddMmmYyyy = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/)
  if (ddMmmYyyy) {
    const dd  = ddMmmYyyy[1].padStart(2, '0')
    const mon = MONTHS_3.indexOf(ddMmmYyyy[2].slice(0, 3).toLowerCase())
    const yyyy = ddMmmYyyy[3]
    if (mon >= 0) return `${dd}/${String(mon + 1).padStart(2, '0')}/${yyyy}`
  }
  return s
}

// Reads `suggestions[]` off a nested-scalar field and returns a string array
// (n8n emits numerics for amount fields — coerced to string so the form's
// suggestions chips render uniformly).
function readNestedSuggestions(f: NestedScalar | undefined): string[] {
  if (!f?.suggestions || !Array.isArray(f.suggestions)) return []
  return f.suggestions.map(v => String(v)).filter(s => s.length > 0)
}

// Transformer — exported for unit tests. Same return shape as
// flatToOcrInvoiceData so the handler can call either and pipe straight into
// ingestInvoice(). Handles both shapes:
//   • new wrapped — `body.extractedData.{invoice,vendor,customer,amounts,
//     lineItems}` with `body.originalFile` for the PDF bytes
//   • legacy native — root-level `body.invoice / vendor / amounts / lineItems`
// New wrapped wins when `extractedData` is present.
export function mapN8nNativePayload(body: N8nNativeInvoice): Partial<OcrInvoiceData> & { messageId: string } {
  // Pick the data source. When the new wrapped shape is present, every field
  // comes from extractedData; the legacy root-level objects are ignored even
  // if also present (n8n shouldn't send both, but be defensive).
  const src: ExtractedData = body.extractedData ?? {
    invoice:   body.invoice,
    vendor:    body.vendor,
    amounts:   body.amounts,
    lineItems: body.lineItems,
  }
  const inv   = src.invoice   ?? {}
  const ven   = src.vendor    ?? {}
  const cust  = src.customer  ?? {}
  const amt   = src.amounts   ?? {}
  const lines = src.lineItems ?? []

  const invoiceNumber = readNestedString(inv.invoiceNumber)
  const vendorName    = readNestedString(ven.vendorName)
  const vendorGstin   = readNestedString(ven.vendorGSTIN)
  const irn           = readNestedString(inv.irnNumber)
  const buyerName     = readNestedString(cust.billToCompany)
  const buyerGstin    = readNestedString(cust.customerGSTIN)
  const placeOfSupply = readNestedString(cust.stateCode)

  const dedupKey = [
    invoiceNumber ?? '',
    vendorGstin   ?? vendorName ?? '',
    body.rawEmail?.from       ?? '',
    body.rawEmail?.receivedAt ?? '',
  ].join('|') || `n8n-native:${Date.now()}`

  // Per-field confidences average to a single overall score (0–100) so the
  // existing OcrInvoiceData.overallConfidence consumer doesn't need to change.
  const confidences = [
    readNestedConfidence(inv.invoiceNumber),
    readNestedConfidence(inv.invoiceDate),
    readNestedConfidence(ven.vendorName),
    readNestedConfidence(ven.vendorGSTIN),
    readNestedConfidence(amt.grossAmount),
  ].filter(c => c > 0)
  const overall = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : (body.confidence ?? 0)

  // Collect per-field `suggestions[]` keyed by RHF form path. The form's
  // edit-mode hydration reads invoice.ocrRawData.suggestions and feeds the
  // "{N} nearest OCR reads" chips. Only emit keys with non-empty arrays so
  // the UI logic stays tight.
  const suggestionPairs: Array<[string, string[]]> = [
    ['invoiceNumber',  readNestedSuggestions(inv.invoiceNumber)],
    ['invoiceDate',    readNestedSuggestions(inv.invoiceDate)],
    ['dueDate',        readNestedSuggestions(inv.dueDate)],
    ['vendorGSTIN',    readNestedSuggestions(ven.vendorGSTIN)],
    ['vendorPAN',      readNestedSuggestions(ven.vendorPAN)],
    ['baseAmount',     readNestedSuggestions(amt.baseAmount)],
    ['grossAmount',    readNestedSuggestions(amt.grossAmount)],
    ...lines.flatMap((l, i): Array<[string, string[]]> => [
      [`line_${i}_description`, readNestedSuggestions(l.description)],
      [`line_${i}_quantity`,    readNestedSuggestions(l.quantity)],
      [`line_${i}_unitPrice`,   readNestedSuggestions(l.rate)],
    ]),
  ]
  const suggestions: Record<string, string[]> = {}
  for (const [k, arr] of suggestionPairs) {
    if (arr.length > 0) suggestions[k] = arr
  }

  return {
    messageId:         dedupKey,
    invoiceNumber,
    invoiceDate:       parseFlexibleDate(readNestedString(inv.invoiceDate)),
    dueDate:           parseFlexibleDate(readNestedString(inv.dueDate)),
    vendorName,
    vendorGstin,
    vendorPan:         readNestedString(ven.vendorPAN),
    buyerName,
    buyerGstin,
    placeOfSupply,
    poReference:       readNestedString(inv.poReference),
    irn,
    subtotal:          readNestedNumber(amt.baseAmount),
    totalTax:          readNestedNumber(amt.taxAmount),
    // Gross fallback — n8n sometimes emits grossAmount as 0 when the source
    // PDF doesn't have a clean total line. If base + tax give a sensible
    // gross, use that instead so the form's mismatch banner doesn't fire on
    // every email-ingested invoice.
    totalAmount:       readNestedNumber(amt.grossAmount) > 0
                         ? readNestedNumber(amt.grossAmount)
                         : (readNestedNumber(amt.baseAmount) + readNestedNumber(amt.taxAmount)),
    cgst:              readNestedNumber(amt.cgst),
    sgst:              readNestedNumber(amt.sgst),
    igst:              readNestedNumber(amt.igst),
    currency:          readNestedString(amt.currency) ?? 'INR',
    isEInvoice:        !!irn,
    overallConfidence: Math.round(overall * 100),
    rawText:           '',
    lineItems: lines.map(l => ({
      description: readNestedString(l.description) ?? 'Line item',
      hsn:         readNestedString(l.hsn) ?? undefined,
      quantity:    readNestedNumber(l.quantity),
      unitPrice:   readNestedNumber(l.rate),
      amount:      readNestedNumber(l.amount),
      gstRate:     0,
      confidence:  Math.round(readNestedConfidence(l.amount) * 100),
    })),
    ...(Object.keys(suggestions).length > 0 ? { suggestions } : {}),
  } as Partial<OcrInvoiceData> & { messageId: string }
}

// Detect which shape the caller sent. Accepts both:
//   • new wrapped — `body.extractedData` present
//   • legacy native — root-level `body.invoice` present
// Anything else falls through to the flat schema. Tested in webhooks.test.ts.
export function isN8nNativeShape(body: unknown): boolean {
  if (!body || typeof body !== 'object' || body === null) return false
  const obj = body as Record<string, unknown>
  return 'extractedData' in obj || 'invoice' in obj
}

// Extracts originalFile (when n8n sends the new wrapped shape) so the route
// can persist the PDF alongside the invoice. Returns null when absent or
// when fileBase64 is missing — caller skips storage in that case.
export function getOriginalFile(body: unknown): OriginalFile | null {
  if (!body || typeof body !== 'object') return null
  const of = (body as { originalFile?: unknown }).originalFile
  if (!of || typeof of !== 'object') return null
  const parsed = originalFileSchema.safeParse(of)
  return parsed.success && parsed.data.fileBase64 ? parsed.data : null
}

// Pure handler — no Fastify dependency, easy to unit test.
// Resolves auth, validates query/body, delegates to ingestInvoice, normalises the
// response into the spec's { invoiceId, vendorMatched, status } shape.
export async function handleN8nFlatInvoice(deps: {
  body:     unknown
  tenantId: string | undefined
  headers:  Record<string, string | string[] | undefined>
  prisma:   PrismaClient
  secret:   string
  ip?:      string
  ingest?:  typeof ingestInvoice
  // Fired (sync) after a successful ingest so the route can kick off async
  // LLM scoring via setImmediate without blocking the 201 response. Tests
  // pass a mock to assert it was called with the right args.
  scoreAndPersist?: (invoiceId: string, ocrData: Partial<OcrInvoiceData>) => void
}): Promise<{ status: number; body: unknown }> {
  const ingest = deps.ingest ?? ingestInvoice

  if (!deps.secret) {
    return { status: 503, body: { error: 'webhook_not_configured' } }
  }
  if (!verifyN8nSecret(deps.headers, deps.secret)) {
    return { status: 401, body: { error: 'unauthorized' } }
  }
  if (!deps.tenantId) {
    return { status: 400, body: { error: 'missing_tenant', message: 'tenantId query param required' } }
  }

  // Branch on shape: n8n's live workflow already emits the nested
  // {value, confidence} format; the flat shape is the documented spec for
  // new integrations. Both schemas are strict so unknown keys still fail.
  let structuredData: Partial<OcrInvoiceData> & { messageId: string }
  let emailFrom:      string | undefined
  let emailSubject:   string | undefined

  // Original PDF/image bytes carried alongside the wrapped extractedData
  // shape. Threaded into ingestInvoice as base64Data so saveInvoiceFile
  // persists the document — fixes the "Document not available" preview for
  // email-ingested invoices.
  let originalFile: OriginalFile | null = null

  if (isN8nNativeShape(deps.body)) {
    const parsed = n8nNativeInvoiceSchema.safeParse(deps.body)
    if (!parsed.success) {
      return { status: 400, body: { error: 'invalid_body', issues: parsed.error.flatten() } }
    }
    structuredData = mapN8nNativePayload(parsed.data)
    emailFrom      = parsed.data.rawEmail?.from    ?? undefined
    emailSubject   = parsed.data.rawEmail?.subject ?? undefined
    originalFile   = getOriginalFile(deps.body)
  } else {
    const parsed = n8nFlatInvoiceSchema.safeParse(deps.body)
    if (!parsed.success) {
      return { status: 400, body: { error: 'invalid_body', issues: parsed.error.flatten() } }
    }
    structuredData = flatToOcrInvoiceData(parsed.data)
    emailFrom      = parsed.data.rawEmail?.from    ?? undefined
    emailSubject   = parsed.data.rawEmail?.subject ?? undefined
  }

  const tenant = await deps.prisma.tenant.findFirst({ where: { id: deps.tenantId } })
  if (!tenant) return { status: 404, body: { error: 'tenant_not_found' } }

  const systemUser = await deps.prisma.user.findFirst({
    where:   { tenantId: tenant.id, role: { in: ['SUPER_ADMIN', 'TENANT_ADMIN', 'AP_MANAGER'] } },
    orderBy: { createdAt: 'asc' },
    select:  { id: true },
  }) ?? await deps.prisma.user.findFirst({
    where:   { tenantId: tenant.id },
    orderBy: { createdAt: 'asc' },
    select:  { id: true },
  })
  if (!systemUser) return { status: 409, body: { error: 'no_user_for_tenant' } }

  // If n8n included the original PDF (new wrapped shape), pass it through
  // so saveInvoiceFile persists it. The mime types we accept must match
  // ingestInvoice's IngestPayload union — anything else is dropped silently
  // (n8n shouldn't be sending an unsupported file format anyway).
  const SUPPORTED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const
  type SupportedMime = typeof SUPPORTED_MIMES[number]
  const safeMime = originalFile?.mimeType && (SUPPORTED_MIMES as readonly string[]).includes(originalFile.mimeType)
    ? (originalFile.mimeType as SupportedMime)
    : 'application/pdf'

  const result = await ingest(
    deps.prisma,
    {
      channelType:  'EMAIL',
      structuredData,
      emailFrom,
      emailSubject,
      // base64Data + mimeType drive the file-save block in ingestInvoice.
      // structuredData being present means OCR is skipped — the file bytes
      // are stored purely for the detail-page preview.
      base64Data:   originalFile?.fileBase64,
      fileName:     originalFile?.fileName ?? 'invoice.pdf',
      mimeType:     safeMime,
    },
    { tenantId: tenant.id, userId: systemUser.id, ip: deps.ip },
  )

  if (!result.ok) {
    const httpStatus = result.error.httpStatus ?? 500
    // NOT_FOUND (no vendor match) → 404 with vendorMatched:false. ingestInvoice
    // currently requires a vendor match; surfacing that explicitly is more
    // useful than collapsing it into a generic 500.
    const isNoVendor  = result.error.code === 'NOT_FOUND'
    return {
      status: httpStatus,
      body: {
        error:         result.error.code,
        message:       result.error.message,
        vendorMatched: isNoVendor ? false : undefined,
      },
    }
  }

  // Fire async LLM scoring — runs after the 201 is flushed so n8n's webhook
  // timeout (~30 s) is never affected by an Anthropic/OpenAI round-trip.
  const invoiceId = result.data.invoiceId
  if (invoiceId) {
    if (deps.scoreAndPersist) {
      deps.scoreAndPersist(invoiceId, structuredData)
    } else {
      const prisma = deps.prisma
      setImmediate(() => {
        scoreAndPersistInvoice(prisma, invoiceId, structuredData).catch(err => {
          // Intentionally never rethrows — invoice already saved, scoring
          // failure leaves recommendedAction='needs_review' (the default).
          console.error('[invoice-scorer] failed for', invoiceId, err)
        })
      })
    }
  }

  return {
    status: 201,
    body: {
      invoiceId,
      vendorMatched: true,
      status:        'ingested',
    },
  }
}

export async function webhookRoutes(app: FastifyInstance) {
  app.post('/webhooks/transbnk', async (request, reply) => {
    const signature = (request.headers['x-transbnk-signature'] as string) ?? ''
    const isValid   = await verifyWebhookSignature(JSON.stringify(request.body), signature)
    if (!isValid && process.env.NODE_ENV === 'production') {
      app.log.warn({ ip: request.ip }, 'Transbnk webhook: invalid signature')
      return reply.code(401).send({ error: 'Invalid signature' })
    }
    const { transaction_id, status, utr, reference_id, failure_reason } = request.body as any
    app.log.info({ transaction_id, status, utr }, 'Transbnk webhook received')
    try {
      const payment = await app.prisma.payment.findFirst({
        where: { OR: [{ transbnkTransactionId: transaction_id }, { id: reference_id }] },
      })
      if (!payment) return reply.code(200).send({ received: true })

      const statusMap: Record<string, string> = { SUCCESS: 'COMPLETED', COMPLETED: 'COMPLETED', FAILED: 'FAILED', REVERSED: 'REVERSED', PROCESSING: 'PROCESSING' }
      const newStatus = statusMap[status?.toUpperCase()] ?? 'PROCESSING'

      await app.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus as any, transbnkUtr: utr ?? payment.transbnkUtr,
          transbnkRawStatus: status, transbnkFailureReason: failure_reason ?? null,
          ...(newStatus === 'COMPLETED' && { transbnkCompletedAt: new Date() }),
        },
      })
      if (newStatus === 'COMPLETED' && payment.invoiceId) {
        await app.prisma.invoice.update({ where: { id: payment.invoiceId }, data: { status: 'PAID' } })
      }
      await writeAuditLog(app.prisma, {
        tenantId: payment.tenantId, userId: 'system',
        action: newStatus === 'COMPLETED' ? AuditAction.PAYMENT_PROCESSED : 'payment.status_updated',
        entityType: 'payment', entityId: payment.id,
        after: { status: newStatus, utr, transaction_id },
      })
      return reply.code(200).send({ received: true })
    } catch (e) {
      app.log.error({ err: e, transaction_id }, 'Webhook processing error')
      return reply.code(200).send({ received: true })
    }
  })

  // N8N email invoice webhook
  // N8N monitors ap@procinix.ai → extracts PDF attachments → calls this endpoint
  app.post('/webhooks/n8n/invoice-email', async (request, reply) => {
    // Verify N8N shared secret (accepts either x-n8n-secret or Authorization: Bearer …)
    const secret = process.env.N8N_WEBHOOK_SECRET ?? ''
    if (secret && !verifyN8nSecret(request.headers as Record<string, string | string[] | undefined>, secret)) {
      app.log.warn({ ip: request.ip }, 'N8N webhook: invalid secret')
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const body = request.body as any
    const { from, subject, attachments = [] } = body

    app.log.info({ from, subject, attachmentCount: attachments.length }, 'N8N email invoice received')

    const results = []

    // Process each PDF/image attachment
    for (const att of attachments) {
      const mimeType = att.mimeType ?? att.mime_type ?? 'application/pdf'
      const base64   = att.data ?? att.base64 ?? att.content
      const fileName = att.filename ?? att.name ?? 'invoice.pdf'

      if (!base64) continue

      // Determine tenant from email recipient (for multi-tenant setups)
      // For now: use a default tenant — extend later for multi-tenant email routing
      const tenant = await app.prisma.tenant.findFirst({ where: { isActive: true } })
      if (!tenant) continue

      const systemUser = await app.prisma.user.findFirst({
        where: { tenantId: tenant.id, role: 'ADMIN' },
      })
      if (!systemUser) continue

      const result = await ingestInvoice(app.prisma, {
        channelType:  'EMAIL',
        base64Data:   base64,
        mimeType:     mimeType as any,
        fileName,
        emailFrom:    from,
        emailSubject: subject,
      }, {
        tenantId: tenant.id,
        userId:   systemUser.id,
      })

      results.push({ fileName, ok: result.ok, data: result.ok ? result.data : result.error.message })
    }

    return reply.code(200).send({ received: true, processed: results.length, results })
  })

  // ── n8n invoice-ingest webhook (pre-OCR'd JSON) ─────────────────────────────
  // n8n owns the OCR step (Gemini node, Mistral OCR, …) and POSTs structured
  // invoice data here. This route is a thin wrapper around the existing
  // ingestInvoice() service — vendor match (fuse.js fuzzy), dedup, invoice
  // create, match scoring, audit log, and InvoiceIngestionJob bookkeeping all
  // live there. We only add: webhook auth, body validation, and per-message
  // idempotency (so n8n retries don't double-create).
  app.post('/webhooks/n8n/invoice-ingest', async (request, reply) => {
    const secret = process.env.N8N_WEBHOOK_SECRET ?? ''
    if (!secret) {
      app.log.error('N8N_WEBHOOK_SECRET not configured — refusing all ingest webhooks')
      return reply.code(503).send({ error: 'webhook not configured' })
    }
    if (!verifyN8nSecret(request.headers as Record<string, string | string[] | undefined>, secret)) {
      app.log.warn({ ip: request.ip }, 'n8n invoice-ingest: bad secret')
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const parsed = n8nInvoiceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid body', issues: parsed.error.flatten() })
    }
    const body = parsed.data

    // Tenant + system user (for createdByUserId FK in ingestInvoice's ctx)
    const tenant = await app.prisma.tenant.findFirst({ where: { id: body.tenantId } })
    if (!tenant) return reply.code(404).send({ error: 'tenant not found' })

    const systemUser = await app.prisma.user.findFirst({
      where:   { tenantId: tenant.id, role: { in: ['SUPER_ADMIN', 'TENANT_ADMIN', 'AP_MANAGER'] } },
      orderBy: { createdAt: 'asc' },
      select:  { id: true },
    }) ?? await app.prisma.user.findFirst({
      where:   { tenantId: tenant.id },
      orderBy: { createdAt: 'asc' },
      select:  { id: true },
    })
    if (!systemUser) return reply.code(409).send({ error: 'no user for tenant' })

    // Per-message idempotency — match prior job whose extractedData carries the
    // same messageId. Catches n8n retries cleanly without a new table column.
    const priorJob = await app.prisma.invoiceIngestionJob.findFirst({
      where: {
        tenantId: tenant.id,
        extractedData: { path: '$.messageId', equals: body.messageId },
      },
      select: { id: true, invoiceId: true, status: true },
    })
    if (priorJob) {
      return reply.code(200).send({
        skipped:   'duplicate_message',
        jobId:     priorJob.id,
        invoiceId: priorJob.invoiceId,
        status:    priorJob.status,
      })
    }

    // Map the wire body → OcrInvoiceData. The messageId is stashed inside the
    // payload so the idempotency lookup above works on next call.
    const structuredData: Partial<OcrInvoiceData> & { messageId: string } = {
      messageId:     body.messageId,
      invoiceNumber: body.invoice.invoiceNumber ?? null,
      invoiceDate:   isoToDmy(body.invoice.invoiceDate),
      dueDate:       isoToDmy(body.invoice.dueDate),
      vendorGstin:   body.invoice.vendorGSTIN ?? null,
      vendorPan:     body.invoice.vendorPAN   ?? null,
      irn:           body.invoice.irnNumber   ?? null,
      subtotal:      body.invoice.subtotal,
      cgst:          body.invoice.cgstAmount,
      sgst:          body.invoice.sgstAmount,
      igst:          body.invoice.igstAmount,
      tdsAmount:     body.invoice.tdsAmount,
      tdsRate:       null,
      tdsSection:    null,
      totalTax:      body.invoice.cgstAmount + body.invoice.sgstAmount + body.invoice.igstAmount,
      totalAmount:   body.invoice.totalAmount,
      currency:      'INR',
      isEInvoice:    !!body.invoice.irnNumber,
      overallConfidence: body.invoice.ocrConfidence ?? 0,
      rawText:       '',
      lineItems: body.invoice.lineItems.map(l => ({
        description: l.description,
        hsn:         l.hsnCode ?? undefined,
        quantity:    l.quantity,
        unitPrice:   l.unitPrice,
        amount:      l.amount,
        gstRate:     l.gstRate,
        confidence:  body.invoice.ocrConfidence ?? 0,
      })),
    }

    const result = await ingestInvoice(
      app.prisma,
      {
        channelType:    'EMAIL',
        structuredData,
        emailFrom:      body.senderEmail   ?? undefined,
        emailSubject:   body.subject       ?? undefined,
        fileName:       body.attachmentName ?? 'invoice.pdf',
        mimeType:       (body.mimeType as any) ?? 'application/pdf',
      },
      { tenantId: tenant.id, userId: systemUser.id, ip: request.ip },
    )

    if (!result.ok) {
      // 409 from ingestInvoice = duplicate (tenant+vendor+invoiceNumber already exists)
      const status = result.error.httpStatus ?? 500
      return reply.code(status).send({ error: result.error.code, message: result.error.message })
    }

    return reply.code(201).send(result.data)
  })

  // ── n8n flat-shape webhook (canonical machine-to-machine entry) ─────────────
  // Same downstream as /webhooks/n8n/invoice-ingest, but with the flat payload
  // shape n8n's HTTP node emits by default, Bearer-token auth (with x-n8n-secret
  // as fallback), tenantId via query param, and a normalised response.
  app.post('/api/webhooks/n8n/invoice', async (request, reply) => {
    const out = await handleN8nFlatInvoice({
      body:     request.body,
      tenantId: (request.query as { tenantId?: string } | undefined)?.tenantId,
      headers:  request.headers as Record<string, string | string[] | undefined>,
      prisma:   app.prisma,
      secret:   process.env.N8N_WEBHOOK_SECRET ?? '',
      ip:       request.ip,
    })
    return reply.code(out.status).send(out.body)
  })
}
