// Webhook handler — pure-function tests over handleN8nFlatInvoice +
// verifyN8nSecret + flatToOcrInvoiceData. ingestInvoice is injected via the
// `ingest` dep so no DB is needed. The handler is the single source of truth
// for the new /api/webhooks/n8n/invoice route.

import { describe, it, expect, vi } from 'vitest'
import {
  verifyN8nSecret,
  flatToOcrInvoiceData,
  handleN8nFlatInvoice,
  isN8nNativeShape,
  mapN8nNativePayload,
  n8nFlatInvoiceSchema,
  n8nNativeInvoiceSchema,
} from '../webhooks'
import type { N8nFlatInvoice, N8nNativeInvoice } from '../webhooks'
import { ok, err } from '../../lib/result.js'

const SECRET = 'test-secret-abc123'

// Minimal Prisma stub — enough to satisfy the tenant + user lookups in the
// handler. Returns a tenant + system user; real ingest logic is mocked via the
// injected `ingest` dep.
function stubPrisma(): any {
  return {
    tenant:  { findFirst: vi.fn().mockResolvedValue({ id: 'tenant-default-001' }) },
    user:    { findFirst: vi.fn().mockResolvedValue({ id: 'user-system-001' }) },
    // The default async scoreAndPersist path (production wiring) writes back
    // to invoice via prisma.invoice.update. Stubbed so tests that exercise
    // the default path don't log spurious stderr.
    invoice: { update:    vi.fn().mockResolvedValue({ id: 'inv-stub' }) },
  }
}

function validBody(): N8nFlatInvoice {
  return {
    source: 'email',
    rawEmail: {
      from:       'vendor@example.com',
      subject:    'Invoice #1234',
      receivedAt: '2026-05-21T06:00:00Z',
    },
    ocr: {
      vendorName:    'Acme Supplies Pvt Ltd',
      vendorGstin:   '27AAAAA0000A1Z5',
      invoiceNumber: 'INV-1234',
      invoiceDate:   '2026-05-15',
      dueDate:       '2026-06-14',
      currency:      'INR',
      subtotal:      10000,
      taxAmount:     1800,
      totalAmount:   11800,
      lineItems: [
        { description: 'Widget', quantity: 10, unitPrice: 1000, amount: 10000, hsn: '8471' },
      ],
      poReference: 'PO-77',
      irn:         null,
    },
    confidence: 0.92,
  }
}

// ── 1. verifyN8nSecret ──────────────────────────────────────────────────────

describe('verifyN8nSecret', () => {
  it('returns false when no secret configured', () => {
    expect(verifyN8nSecret({ authorization: 'Bearer ' + SECRET }, '')).toBe(false)
  })

  it('returns false when no header sent', () => {
    expect(verifyN8nSecret({}, SECRET)).toBe(false)
  })

  it('accepts x-n8n-secret header (legacy)', () => {
    expect(verifyN8nSecret({ 'x-n8n-secret': SECRET }, SECRET)).toBe(true)
  })

  it('accepts Authorization: Bearer <token>', () => {
    expect(verifyN8nSecret({ authorization: `Bearer ${SECRET}` }, SECRET)).toBe(true)
  })

  it('Bearer match is case-insensitive on the scheme prefix', () => {
    expect(verifyN8nSecret({ authorization: `bearer ${SECRET}` }, SECRET)).toBe(true)
  })

  it('rejects a wrong secret on either header', () => {
    expect(verifyN8nSecret({ 'x-n8n-secret': 'wrong' }, SECRET)).toBe(false)
    expect(verifyN8nSecret({ authorization: 'Bearer wrong' }, SECRET)).toBe(false)
  })
})

// ── 2. flatToOcrInvoiceData ─────────────────────────────────────────────────

describe('flatToOcrInvoiceData', () => {
  it('translates ISO YYYY-MM-DD dates → DD/MM/YYYY (the format ingestInvoice expects)', () => {
    const out = flatToOcrInvoiceData(validBody())
    expect(out.invoiceDate).toBe('15/05/2026')
    expect(out.dueDate).toBe('14/06/2026')
  })

  it('defaults currency to INR when missing', () => {
    const body = validBody()
    body.ocr!.currency = null
    expect(flatToOcrInvoiceData(body).currency).toBe('INR')
  })

  it('puts the flat taxAmount into totalTax and zeroes the GST split fields', () => {
    const out = flatToOcrInvoiceData(validBody())
    expect(out.totalTax).toBe(1800)
    expect(out.cgst).toBe(0)
    expect(out.sgst).toBe(0)
    expect(out.igst).toBe(0)
  })

  it('marks isEInvoice true when irn is present', () => {
    const body = validBody()
    body.ocr!.irn = '12345678901234567890'
    expect(flatToOcrInvoiceData(body).isEInvoice).toBe(true)
  })

  it('builds a stable messageId from invoice number + vendor + sender + receivedAt', () => {
    const out1 = flatToOcrInvoiceData(validBody())
    const out2 = flatToOcrInvoiceData(validBody())
    expect(out1.messageId).toBe(out2.messageId)
    expect(out1.messageId.length).toBeGreaterThan(0)
  })
})

// ── 3. handleN8nFlatInvoice — the 6 spec scenarios ──────────────────────────

describe('handleN8nFlatInvoice', () => {
  // Test 1: missing secret env → 503 (refuse all). Distinct from a bad caller
  // secret; surfacing it loud helps ops catch a deployment misconfig.
  it('returns 503 when N8N_WEBHOOK_SECRET is not configured', async () => {
    const out = await handleN8nFlatInvoice({
      body:     validBody(),
      tenantId: 'tenant-default-001',
      headers:  { authorization: 'Bearer anything' },
      prisma:   stubPrisma(),
      secret:   '',
    })
    expect(out.status).toBe(503)
  })

  // Test 1 (spec): missing secret header → 401
  it('returns 401 when no auth header is sent', async () => {
    const out = await handleN8nFlatInvoice({
      body:     validBody(),
      tenantId: 'tenant-default-001',
      headers:  {},
      prisma:   stubPrisma(),
      secret:   SECRET,
    })
    expect(out.status).toBe(401)
    expect(out.body).toEqual({ error: 'unauthorized' })
  })

  // Test 2 (spec): wrong secret → 401
  it('returns 401 when the Bearer token is wrong', async () => {
    const out = await handleN8nFlatInvoice({
      body:     validBody(),
      tenantId: 'tenant-default-001',
      headers:  { authorization: 'Bearer wrong-token' },
      prisma:   stubPrisma(),
      secret:   SECRET,
    })
    expect(out.status).toBe(401)
  })

  // Source is optional and defaults to 'email' — n8n's native nested format
  // omits it, and the flat shape doesn't need to require it. A missing
  // source on an otherwise-valid flat body should now succeed (201).
  it('defaults source to "email" when missing from a flat body', async () => {
    const noSource = { ...validBody() } as Record<string, unknown>
    delete noSource.source
    const fakeIngest = vi.fn().mockResolvedValue(
      ok({ jobId: 'job-1', invoiceId: 'inv-1', lane: 'auto-stp', score: 92 }),
    )
    const out = await handleN8nFlatInvoice({
      body:     noSource,
      tenantId: 'tenant-default-001',
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
      ingest:   fakeIngest as never,
      scoreAndPersist: vi.fn(),
    })
    expect(out.status).toBe(201)
  })

  // Additional 400: missing tenantId query param
  it('returns 400 when tenantId query param is missing', async () => {
    const out = await handleN8nFlatInvoice({
      body:     validBody(),
      tenantId: undefined,
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
    })
    expect(out.status).toBe(400)
    expect((out.body as { error: string }).error).toBe('missing_tenant')
  })

  // Test 4 (spec): valid payload, vendor matched → 201 with vendorMatched=true
  it('returns 201 with vendorMatched=true when ingest succeeds', async () => {
    const fakeIngest = vi.fn().mockResolvedValue(
      ok({ jobId: 'job-1', invoiceId: 'inv-1', lane: 'auto-stp', score: 92 }),
    )
    const out = await handleN8nFlatInvoice({
      body:     validBody(),
      tenantId: 'tenant-default-001',
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
      ingest:   fakeIngest as never,
    })
    expect(out.status).toBe(201)
    expect(out.body).toEqual({
      invoiceId:     'inv-1',
      vendorMatched: true,
      status:        'ingested',
    })
    expect(fakeIngest).toHaveBeenCalledTimes(1)
  })

  // Test 5 (spec, adapted): vendor not matched → 404 with vendorMatched=false.
  // DEVIATION from the literal spec (which asked for 201): the existing
  // ingestInvoice() pipeline returns 404 when no vendor matches because all
  // downstream features (3-way match, audit trail, payment routing) assume a
  // vendor exists. Surfacing the 404 to n8n is more honest than auto-creating
  // a vendorless draft. n8n can be configured to route 404s into a manual
  // review queue.
  it('returns 404 with vendorMatched=false when no vendor matches', async () => {
    const fakeIngest = vi.fn().mockResolvedValue(
      err({ code: 'NOT_FOUND', message: 'No matching vendor', httpStatus: 404 }),
    )
    const out = await handleN8nFlatInvoice({
      body:     validBody(),
      tenantId: 'tenant-default-001',
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
      ingest:   fakeIngest as never,
    })
    expect(out.status).toBe(404)
    expect((out.body as { vendorMatched: boolean }).vendorMatched).toBe(false)
  })

  // Test 6 (spec): duplicate invoice number → 409
  it('returns 409 when ingest reports duplicate', async () => {
    const fakeIngest = vi.fn().mockResolvedValue(
      err({ code: 'DUPLICATE_RECORD', message: 'Invoice INV-1234 already exists', httpStatus: 409 }),
    )
    const out = await handleN8nFlatInvoice({
      body:     validBody(),
      tenantId: 'tenant-default-001',
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
      ingest:   fakeIngest as never,
    })
    expect(out.status).toBe(409)
    expect((out.body as { error: string }).error).toBe('DUPLICATE_RECORD')
  })

  // Async LLM scoring is enqueued on success — handler invokes the injected
  // scoreAndPersist callback with the created invoice id + structured OCR
  // data. The production wrapper schedules this via setImmediate so the 201
  // response is flushed before the OpenAI round-trip.
  it('invokes scoreAndPersist with invoiceId + structuredData on 201', async () => {
    const fakeIngest = vi.fn().mockResolvedValue(
      ok({ jobId: 'job-1', invoiceId: 'inv-new-001', lane: 'auto-stp', score: 92 }),
    )
    const scoreAndPersist = vi.fn()
    const out = await handleN8nFlatInvoice({
      body:     validBody(),
      tenantId: 'tenant-default-001',
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
      ingest:   fakeIngest as never,
      scoreAndPersist,
    })
    expect(out.status).toBe(201)
    expect(scoreAndPersist).toHaveBeenCalledTimes(1)
    expect(scoreAndPersist.mock.calls[0][0]).toBe('inv-new-001')
    const ocrArg = scoreAndPersist.mock.calls[0][1]
    expect(ocrArg.vendorName).toBe('Acme Supplies Pvt Ltd')
    expect(ocrArg.invoiceNumber).toBe('INV-1234')
  })

  it('does NOT invoke scoreAndPersist when ingest fails', async () => {
    const fakeIngest = vi.fn().mockResolvedValue(
      err({ code: 'DUPLICATE_RECORD', message: 'dupe', httpStatus: 409 }),
    )
    const scoreAndPersist = vi.fn()
    await handleN8nFlatInvoice({
      body:     validBody(),
      tenantId: 'tenant-default-001',
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
      ingest:   fakeIngest as never,
      scoreAndPersist,
    })
    expect(scoreAndPersist).not.toHaveBeenCalled()
  })
})

// ── 4. Zod schema sanity — guards against accidental shape drift ────────────

describe('n8nFlatInvoiceSchema', () => {
  it('rejects body when source is not "email"', () => {
    const out = n8nFlatInvoiceSchema.safeParse({ source: 'sms' })
    expect(out.success).toBe(false)
  })

  it('accepts a minimal body (source only)', () => {
    const out = n8nFlatInvoiceSchema.safeParse({ source: 'email' })
    expect(out.success).toBe(true)
  })

  // Guards against silent shape drift. Without .strict() the old n8n payload
  // (per-field {value, confidence} envelopes nested under invoice/vendor/
  // amounts) passed validation as just {source:'email'} — the request
  // persisted an empty invoice with no data. .strict() turns that into a
  // visible 400 with the unrecognised keys listed.
  it('rejects unknown root-level keys via .strict()', () => {
    const out = n8nFlatInvoiceSchema.safeParse({
      source: 'email',
      invoice: { invoiceNumber: { value: 'X', confidence: 1 } },
      vendor:  { vendorName: { value: 'Y', confidence: 1 } },
    })
    expect(out.success).toBe(false)
    if (!out.success) {
      const issues = out.error.flatten()
      expect(JSON.stringify(issues)).toMatch(/unrecognized|Unrecognized/i)
    }
  })

  it('rejects unknown keys inside ocr', () => {
    const out = n8nFlatInvoiceSchema.safeParse({
      source: 'email',
      ocr: { vendorName: 'A', vendor_gstin_wrong: 'X' },  // typo'd key
    })
    expect(out.success).toBe(false)
  })
})

// ── 5. n8n native nested shape ──────────────────────────────────────────────

const NATIVE_BODY: Record<string, unknown> = {
  invoice: {
    invoiceNumber: { value: 'KWE-2026-001', confidence: 0.9 },
    invoiceDate:   { value: '18 Jul 2026',  confidence: 0.7 },
  },
  vendor: {
    vendorName:  { value: 'KWALITY INDUSTRIAL ELECTRIC SOLUTIONS', confidence: 1 },
    vendorGSTIN: { value: '27AABCK1234N1Z1',                       confidence: 0.8 },
  },
  amounts: {
    baseAmount:  { value: '2030', confidence: 1 },
    grossAmount: { value: '2030', confidence: 1 },
    currency:    { value: 'INR',  confidence: 1 },
  },
  lineItems: [
    { description: { value: 'MCB Box',         confidence: 1 },
      quantity:    { value: '1',               confidence: 1 },
      rate:        { value: '130',             confidence: 1 },
      amount:      { value: '130',             confidence: 1 } },
    { description: { value: '25A 4P MCB Long', confidence: 1 },
      quantity:    { value: '1',               confidence: 1 },
      rate:        { value: '1800',            confidence: 1 },
      amount:      { value: '1800',            confidence: 1 } },
  ],
  status: 'needs_review',
}

describe('isN8nNativeShape', () => {
  it('returns true when body has a top-level `invoice` object', () => {
    expect(isN8nNativeShape(NATIVE_BODY)).toBe(true)
  })

  it('returns false for flat-shape bodies', () => {
    expect(isN8nNativeShape(validBody())).toBe(false)
  })

  it('returns false for non-object bodies', () => {
    expect(isN8nNativeShape(null)).toBe(false)
    expect(isN8nNativeShape('string')).toBe(false)
    expect(isN8nNativeShape(undefined)).toBe(false)
  })
})

describe('n8nNativeInvoiceSchema', () => {
  it("accepts n8n's native nested payload as-is", () => {
    const out = n8nNativeInvoiceSchema.safeParse(NATIVE_BODY)
    expect(out.success).toBe(true)
  })

  it('still rejects unknown root-level keys via .strict()', () => {
    const out = n8nNativeInvoiceSchema.safeParse({ ...NATIVE_BODY, extraJunk: true })
    expect(out.success).toBe(false)
  })

  it('rejects unknown keys inside a nested scalar envelope', () => {
    const out = n8nNativeInvoiceSchema.safeParse({
      invoice: { invoiceNumber: { value: 'X', confidence: 0.9, source: 'gemini' } },
    })
    expect(out.success).toBe(false)
  })
})

describe('mapN8nNativePayload', () => {
  it('unwraps {value, confidence} envelopes into flat scalars', () => {
    const parsed = n8nNativeInvoiceSchema.parse(NATIVE_BODY) as N8nNativeInvoice
    const out = mapN8nNativePayload(parsed)
    expect(out.invoiceNumber).toBe('KWE-2026-001')
    expect(out.vendorName).toBe('KWALITY INDUSTRIAL ELECTRIC SOLUTIONS')
    expect(out.vendorGstin).toBe('27AABCK1234N1Z1')
  })

  it('parses dd-MMM-yyyy dates into DD/MM/YYYY (the OcrInvoiceData format)', () => {
    const parsed = n8nNativeInvoiceSchema.parse(NATIVE_BODY) as N8nNativeInvoice
    const out = mapN8nNativePayload(parsed)
    expect(out.invoiceDate).toBe('18/07/2026')
  })

  it('coerces string amount values to numbers (n8n emits "2030" not 2030)', () => {
    const parsed = n8nNativeInvoiceSchema.parse(NATIVE_BODY) as N8nNativeInvoice
    const out = mapN8nNativePayload(parsed)
    expect(out.subtotal).toBe(2030)
    expect(out.totalAmount).toBe(2030)
  })

  it('maps lineItems.rate → unitPrice and coerces line numerics', () => {
    const parsed = n8nNativeInvoiceSchema.parse(NATIVE_BODY) as N8nNativeInvoice
    const out = mapN8nNativePayload(parsed)
    expect(out.lineItems).toHaveLength(2)
    expect(out.lineItems![0]).toEqual(expect.objectContaining({
      description: 'MCB Box',
      quantity:    1,
      unitPrice:   130,
      amount:      130,
    }))
    expect(out.lineItems![1].unitPrice).toBe(1800)
  })

  it('averages per-field confidences into overallConfidence (0–100)', () => {
    const parsed = n8nNativeInvoiceSchema.parse(NATIVE_BODY) as N8nNativeInvoice
    const out = mapN8nNativePayload(parsed)
    // confidences present: 0.9 (invoiceNumber) + 0.7 (invoiceDate) + 1 (vendorName)
    //                    + 0.8 (vendorGSTIN) + 1 (grossAmount)  = 4.4 / 5 = 0.88
    expect(out.overallConfidence).toBe(88)
  })

  it('builds a stable messageId from invoiceNumber + vendor + sender', () => {
    const parsed = n8nNativeInvoiceSchema.parse(NATIVE_BODY) as N8nNativeInvoice
    const a = mapN8nNativePayload(parsed)
    const b = mapN8nNativePayload(parsed)
    expect(a.messageId).toBe(b.messageId)
    expect(a.messageId).toContain('KWE-2026-001')
    expect(a.messageId).toContain('27AABCK1234N1Z1')
  })

  it('falls back to INR when currency.value is missing', () => {
    const noCurrency = JSON.parse(JSON.stringify(NATIVE_BODY))
    delete noCurrency.amounts.currency
    const parsed = n8nNativeInvoiceSchema.parse(noCurrency) as N8nNativeInvoice
    expect(mapN8nNativePayload(parsed).currency).toBe('INR')
  })
})

describe('handleN8nFlatInvoice — native nested shape', () => {
  it('routes a nested payload through mapN8nNativePayload and ingests on 201', async () => {
    const fakeIngest = vi.fn().mockResolvedValue(
      ok({ jobId: 'job-1', invoiceId: 'inv-native-001', lane: 'auto-stp', score: 88 }),
    )
    const scoreAndPersist = vi.fn()
    const out = await handleN8nFlatInvoice({
      body:     NATIVE_BODY,
      tenantId: 'tenant-default-001',
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
      ingest:   fakeIngest as never,
      scoreAndPersist,
    })
    expect(out.status).toBe(201)
    // The mapped OCR data should reach ingest with the unwrapped values
    const ingestCall = fakeIngest.mock.calls[0][1]
    expect(ingestCall.structuredData.invoiceNumber).toBe('KWE-2026-001')
    expect(ingestCall.structuredData.vendorName).toBe('KWALITY INDUSTRIAL ELECTRIC SOLUTIONS')
    expect(ingestCall.structuredData.totalAmount).toBe(2030)
    // And scoring should fire with the same shape
    expect(scoreAndPersist).toHaveBeenCalledWith('inv-native-001', expect.objectContaining({
      invoiceNumber: 'KWE-2026-001',
      vendorGstin:   '27AABCK1234N1Z1',
    }))
  })

  it('returns 400 with a clear schema error when nested body has unknown root keys', async () => {
    const out = await handleN8nFlatInvoice({
      body:     { ...NATIVE_BODY, surprise: true },
      tenantId: 'tenant-default-001',
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
      ingest:   vi.fn() as never,
      scoreAndPersist: vi.fn(),
    })
    expect(out.status).toBe(400)
    expect((out.body as { error: string }).error).toBe('invalid_body')
  })
})

// ── New wrapped shape — body.extractedData + body.originalFile ───────────────
// n8n now wraps every OCR field under `extractedData` and ships the original
// PDF as base64 under `originalFile`. The transformer must read from there,
// surface customer/buyer fields, extract per-field suggestions, and the
// handler must persist the PDF via saveInvoiceFile.

const WRAPPED_BODY: Record<string, unknown> = {
  extractedData: {
    invoice: {
      invoiceNumber: { value: 'KWE-2026-001', confidence: 0.95, suggestions: ['KWE-2026-001', 'KWE-2026-OO1'] },
      invoiceDate:   { value: '18 Jul 2026',  confidence: 0.7 },
    },
    vendor: {
      vendorName:  { value: 'KWALITY INDUSTRIAL ELECTRIC SOLUTIONS', confidence: 1 },
      vendorGSTIN: { value: '27AABCK1234N1Z1',                       confidence: 0.8 },
    },
    customer: {
      billToCompany: { value: 'Procinix Technologies Pvt Ltd', confidence: 0.95 },
      customerGSTIN: { value: '27AAACP1234Q1ZS',               confidence: 0.95 },
      stateCode:     { value: 'Maharashtra (27)',              confidence: 0.9 },
    },
    amounts: {
      baseAmount:  { value: '2030', confidence: 1, suggestions: ['2030', '2.030'] },
      grossAmount: { value: '2030', confidence: 1 },
      currency:    { value: 'INR',  confidence: 1 },
    },
    lineItems: [
      { description: { value: 'MCB Box',          confidence: 1 },
        quantity:    { value: '1',                confidence: 1 },
        rate:        { value: '130',              confidence: 1 },
        amount:      { value: '130',              confidence: 1 } },
      { description: { value: '25A 4P MCB Long',  confidence: 1 },
        quantity:    { value: '1',                confidence: 1 },
        rate:        { value: '100',              confidence: 1 },
        amount:      { value: '100',              confidence: 1 } },
      { description: { value: '23B 4PMoney can',  confidence: 1 },
        quantity:    { value: '1',                confidence: 1 },
        rate:        { value: '1800',             confidence: 1 },
        amount:      { value: '1800',             confidence: 1 } },
    ],
    status: 'needs_review',
  },
  originalFile: {
    fileName:   'KWE-invoice.pdf',
    mimeType:   'application/pdf',
    fileSize:   '2.01 MB',
    fileBase64: Buffer.from('%PDF-1.4 fake pdf bytes for test').toString('base64'),
  },
}

describe('mapN8nNativePayload — wrapped shape', () => {
  it('reads fields out of extractedData.{invoice,vendor,amounts,lineItems}', () => {
    const parsed = n8nNativeInvoiceSchema.parse(WRAPPED_BODY) as N8nNativeInvoice
    const out = mapN8nNativePayload(parsed)
    expect(out.invoiceNumber).toBe('KWE-2026-001')
    expect(out.vendorName).toBe('KWALITY INDUSTRIAL ELECTRIC SOLUTIONS')
    expect(out.subtotal).toBe(2030)
    expect(out.totalAmount).toBe(2030)
    expect(out.lineItems).toHaveLength(3)
    expect(out.lineItems![0].description).toBe('MCB Box')
    expect(out.lineItems![2].description).toBe('23B 4PMoney can')
  })

  it('maps extractedData.customer onto buyerName / buyerGstin / placeOfSupply', () => {
    const parsed = n8nNativeInvoiceSchema.parse(WRAPPED_BODY) as N8nNativeInvoice
    const out = mapN8nNativePayload(parsed)
    expect(out.buyerName).toBe('Procinix Technologies Pvt Ltd')
    expect(out.buyerGstin).toBe('27AAACP1234Q1ZS')
    expect(out.placeOfSupply).toBe('Maharashtra (27)')
  })

  it('collects per-field suggestions[] keyed by RHF form path', () => {
    const parsed = n8nNativeInvoiceSchema.parse(WRAPPED_BODY) as N8nNativeInvoice
    const out = mapN8nNativePayload(parsed) as Record<string, unknown> & { suggestions?: Record<string, string[]> }
    expect(out.suggestions).toBeDefined()
    expect(out.suggestions!.invoiceNumber).toEqual(['KWE-2026-001', 'KWE-2026-OO1'])
    expect(out.suggestions!.baseAmount).toEqual(['2030', '2.030'])
  })

  it('omits the suggestions key entirely when no field carries any', () => {
    const noSugg = JSON.parse(JSON.stringify(WRAPPED_BODY))
    delete noSugg.extractedData.invoice.invoiceNumber.suggestions
    delete noSugg.extractedData.amounts.baseAmount.suggestions
    const parsed = n8nNativeInvoiceSchema.parse(noSugg) as N8nNativeInvoice
    const out = mapN8nNativePayload(parsed) as Record<string, unknown>
    expect(out.suggestions).toBeUndefined()
  })

  // Backwards-compat — old root-level shape still parses + maps the same way.
  it('still handles the legacy root-level shape (no extractedData wrapper)', () => {
    const parsed = n8nNativeInvoiceSchema.parse(NATIVE_BODY) as N8nNativeInvoice
    const out = mapN8nNativePayload(parsed)
    expect(out.invoiceNumber).toBe('KWE-2026-001')
    expect(out.vendorName).toBe('KWALITY INDUSTRIAL ELECTRIC SOLUTIONS')
    expect(out.totalAmount).toBe(2030)
  })
})

describe('isN8nNativeShape — both shapes', () => {
  it('returns true for the new wrapped shape (body.extractedData)', () => {
    expect(isN8nNativeShape(WRAPPED_BODY)).toBe(true)
  })
  it('returns true for the legacy root-level shape (body.invoice)', () => {
    expect(isN8nNativeShape(NATIVE_BODY)).toBe(true)
  })
})

describe('handleN8nFlatInvoice — wrapped shape with originalFile', () => {
  it('threads originalFile.fileBase64 into ingestInvoice as base64Data', async () => {
    const fakeIngest = vi.fn().mockResolvedValue(
      ok({ jobId: 'job-w', invoiceId: 'inv-wrapped-001', lane: 'auto-stp', score: 88 }),
    )
    const out = await handleN8nFlatInvoice({
      body:     WRAPPED_BODY,
      tenantId: 'tenant-default-001',
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
      ingest:   fakeIngest as never,
      scoreAndPersist: vi.fn(),
    })
    expect(out.status).toBe(201)
    const ingestPayload = fakeIngest.mock.calls[0][1]
    expect(ingestPayload.structuredData.invoiceNumber).toBe('KWE-2026-001')
    expect(ingestPayload.base64Data).toBe((WRAPPED_BODY.originalFile as { fileBase64: string }).fileBase64)
    expect(ingestPayload.fileName).toBe('KWE-invoice.pdf')
    expect(ingestPayload.mimeType).toBe('application/pdf')
  })

  it('omits base64Data when originalFile is absent (legacy shape)', async () => {
    const fakeIngest = vi.fn().mockResolvedValue(
      ok({ jobId: 'job-l', invoiceId: 'inv-legacy-001' }),
    )
    await handleN8nFlatInvoice({
      body:     NATIVE_BODY,
      tenantId: 'tenant-default-001',
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
      ingest:   fakeIngest as never,
      scoreAndPersist: vi.fn(),
    })
    const ingestPayload = fakeIngest.mock.calls[0][1]
    expect(ingestPayload.base64Data).toBeUndefined()
  })
})
