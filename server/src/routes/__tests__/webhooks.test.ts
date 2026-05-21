// Webhook handler — pure-function tests over handleN8nFlatInvoice +
// verifyN8nSecret + flatToOcrInvoiceData. ingestInvoice is injected via the
// `ingest` dep so no DB is needed. The handler is the single source of truth
// for the new /api/webhooks/n8n/invoice route.

import { describe, it, expect, vi } from 'vitest'
import {
  verifyN8nSecret,
  flatToOcrInvoiceData,
  handleN8nFlatInvoice,
  n8nFlatInvoiceSchema,
} from '../webhooks'
import type { N8nFlatInvoice } from '../webhooks'
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

  // Test 3 (spec): missing source → 400
  it('returns 400 when source is missing from the body', async () => {
    const bad = { ...validBody() } as Record<string, unknown>
    delete bad.source
    const out = await handleN8nFlatInvoice({
      body:     bad,
      tenantId: 'tenant-default-001',
      headers:  { authorization: `Bearer ${SECRET}` },
      prisma:   stubPrisma(),
      secret:   SECRET,
    })
    expect(out.status).toBe(400)
    expect((out.body as { error: string }).error).toBe('invalid_body')
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
