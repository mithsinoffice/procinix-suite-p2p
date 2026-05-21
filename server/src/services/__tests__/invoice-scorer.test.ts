// Pure-function specs for the async invoice scorer. The OpenAI client is
// injected via the `deps.client` argument so no network calls happen — we
// stub `chat.completions.create` per scenario and assert the parsed shape +
// the safety contract (never throw, always return InvoiceScoringResult).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildScoringPrompt,
  scoreInvoiceWithLLM,
  scoreAndPersistInvoice,
  type InvoiceScoringResult,
} from '../invoice-scorer.service'
import type { OcrInvoiceData } from '../gemini-ocr.service'

function sampleInvoiceData(): Partial<OcrInvoiceData> {
  return {
    invoiceNumber: 'INV-1234',
    invoiceDate:   '15/05/2026',
    vendorName:    'Acme Supplies Pvt Ltd',
    vendorGstin:   '27AAAAA0000A1Z5',
    vendorPan:     'AAAAA0000A',
    totalAmount:   11800,
    totalTax:      1800,
    subtotal:      10000,
    cgst:          0,
    sgst:          0,
    igst:          1800,
    currency:      'INR',
    lineItems: [
      { description: 'Widget', quantity: 10, unitPrice: 1000, amount: 10000, gstRate: 18, confidence: 90 },
      { description: 'Gizmo',  quantity: 5,  unitPrice: 200,  amount: 1000,  gstRate: 18, confidence: 88 },
    ],
  }
}

// Minimal fake OpenAI client — only the .chat.completions.create surface the
// scorer touches. content is per-test.
function makeFakeClient(content: string | undefined, behaviour: 'ok' | 'throw' = 'ok'): any {
  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async () => {
          if (behaviour === 'throw') throw new Error('network down')
          return { choices: [{ message: { content } }] }
        }),
      },
    },
  }
}

// Capture+restore OPENAI_API_KEY around tests so we can simulate the
// "key missing" branch without leaking into other suites.
const ORIGINAL_KEY = process.env.OPENAI_API_KEY

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'sk-test-key-not-real'
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.OPENAI_API_KEY
  else                            process.env.OPENAI_API_KEY = ORIGINAL_KEY
})

// ── 1. buildScoringPrompt — pure builder ────────────────────────────────────

describe('buildScoringPrompt', () => {
  it('embeds the vendor name in the prompt', () => {
    const prompt = buildScoringPrompt(sampleInvoiceData())
    expect(prompt).toContain('Acme Supplies Pvt Ltd')
  })

  it('embeds each line item description', () => {
    const prompt = buildScoringPrompt(sampleInvoiceData())
    expect(prompt).toContain('Widget')
    expect(prompt).toContain('Gizmo')
  })

  it('shows GSTIN and total in the header line', () => {
    const prompt = buildScoringPrompt(sampleInvoiceData())
    expect(prompt).toContain('27AAAAA0000A1Z5')
    expect(prompt).toContain('INR 11800')
  })

  it('handles invoices with no line items gracefully', () => {
    const prompt = buildScoringPrompt({ ...sampleInvoiceData(), lineItems: [] })
    expect(prompt).toContain('Line items (0)')
    expect(prompt).toContain('(none extracted)')
  })

  it('falls back to "—" when fields are null', () => {
    const prompt = buildScoringPrompt({
      vendorName: null, vendorGstin: null, vendorPan: null,
      invoiceNumber: null, invoiceDate: null,
    } as Partial<OcrInvoiceData>)
    expect(prompt).toContain('Vendor: — | GSTIN: — | PAN: —')
  })
})

// ── 2. scoreInvoiceWithLLM — happy path + safety contract ───────────────────

describe('scoreInvoiceWithLLM', () => {
  // Test 1 (spec): valid response parsed correctly
  it('parses a valid OpenAI response into InvoiceScoringResult', async () => {
    const llmJson = {
      fieldScores: {
        invoiceNumber: 1, invoiceDate: 0.9, vendorName: 1, vendorGstin: 0.95,
        vendorPan: 0.9, totalAmount: 1, taxAmount: 0.85, currency: 1, lineItems: 0.8,
      },
      validationIssues: [{ field: 'taxAmount', severity: 'warning', message: 'check IGST split' }],
      vendorMatchSuggestion: { suggestedName: 'Acme Supplies Pvt Ltd', gstin: '27AAAAA0000A1Z5', confidence: 0.95 },
      reviewFlags: [],
      overallScore: 0.95,
      recommendedAction: 'auto_process',
    }
    const client = makeFakeClient(JSON.stringify(llmJson))
    const result = await scoreInvoiceWithLLM(sampleInvoiceData(), { client })

    expect(result.fieldScores.vendorName).toBe(1)
    expect(result.recommendedAction).toBe('auto_process')
    expect(typeof result.scoredAt).toBe('string')
    expect(new Date(result.scoredAt).toString()).not.toBe('Invalid Date')
    expect(result.overallScore).toBeGreaterThanOrEqual(0)
    expect(result.overallScore).toBeLessThanOrEqual(1)
  })

  // Test 2 (spec): malformed JSON → fallback
  it('returns fallback when content is malformed JSON', async () => {
    const client = makeFakeClient('this is not json at all {{')
    const result = await scoreInvoiceWithLLM(sampleInvoiceData(), { client })

    expect(result.recommendedAction).toBe('needs_review')
    expect(result.overallScore).toBe(0)
    expect(result.validationIssues[0].field).toBe('system')
    expect(result.validationIssues[0].message).toMatch(/manual review/i)
  })

  // Test 2b: unexpected JSON shape → coerced to safe defaults via normaliser
  it('normalises an unexpected JSON shape into safe defaults', async () => {
    const client = makeFakeClient(JSON.stringify({ foo: 'bar', recommendedAction: 'not-a-real-value' }))
    const result = await scoreInvoiceWithLLM(sampleInvoiceData(), { client })

    expect(result.recommendedAction).toBe('needs_review')
    expect(result.fieldScores.invoiceNumber).toBe(0)
    expect(result.validationIssues).toEqual([])
  })

  // Test 3 (spec): API key missing → fallback, no SDK call
  it('returns fallback when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY
    // Passing client=null forces the "no client" path even with the env shim.
    const result = await scoreInvoiceWithLLM(sampleInvoiceData(), { client: null })
    expect(result.recommendedAction).toBe('needs_review')
    expect(result.validationIssues[0].message).toMatch(/OPENAI_API_KEY/)
  })

  // Test 4 (spec): API throws network error → fallback
  it('returns fallback when the OpenAI call throws', async () => {
    const client = makeFakeClient(undefined, 'throw')
    const result = await scoreInvoiceWithLLM(sampleInvoiceData(), { client })

    expect(result.recommendedAction).toBe('needs_review')
    expect(result.validationIssues[0].message).toMatch(/API error/)
  })

  // Test 5 (spec): markdown fences around JSON → still parses
  it('strips markdown fences before JSON.parse', async () => {
    const inner = {
      fieldScores: {
        invoiceNumber: 1, invoiceDate: 1, vendorName: 1, vendorGstin: 1,
        vendorPan: 1, totalAmount: 1, taxAmount: 1, currency: 1, lineItems: 1,
      },
      validationIssues: [],
      vendorMatchSuggestion: { suggestedName: null, gstin: null, confidence: 0 },
      reviewFlags: [],
      overallScore: 1,
      recommendedAction: 'auto_process',
    }
    const fenced = '```json\n' + JSON.stringify(inner) + '\n```'
    const client = makeFakeClient(fenced)
    const result = await scoreInvoiceWithLLM(sampleInvoiceData(), { client })

    expect(result.recommendedAction).toBe('auto_process')
    expect(result.overallScore).toBe(1)
  })

  // Defensive: numbers outside [0,1] should be clamped, not crash
  it('clamps out-of-range field scores into [0,1]', async () => {
    const client = makeFakeClient(JSON.stringify({
      fieldScores: { invoiceNumber: 5, invoiceDate: -1, vendorName: 0.5, vendorGstin: 1, vendorPan: 0, totalAmount: 0, taxAmount: 0, currency: 0, lineItems: 0 },
      overallScore: 1.5,
      recommendedAction: 'auto_process',
    }))
    const result = await scoreInvoiceWithLLM(sampleInvoiceData(), { client })
    expect(result.fieldScores.invoiceNumber).toBe(1)
    expect(result.fieldScores.invoiceDate).toBe(0)
    expect(result.overallScore).toBe(1)
  })
})

// ── 3. scoreAndPersistInvoice — DB write + ON_HOLD mapping ──────────────────

describe('scoreAndPersistInvoice', () => {
  it("writes the scoring result and does NOT touch status when recommendedAction !== 'hold'", async () => {
    const updateFn = vi.fn().mockResolvedValue({})
    const prisma: any = { invoice: { update: updateFn } }

    const fakeScorer = async (): Promise<InvoiceScoringResult> => ({
      fieldScores: { invoiceNumber: 1, invoiceDate: 1, vendorName: 1, vendorGstin: 1, vendorPan: 1, totalAmount: 1, taxAmount: 1, currency: 1, lineItems: 1 },
      validationIssues:      [],
      vendorMatchSuggestion: { suggestedName: 'Acme', gstin: null, confidence: 0.9 },
      reviewFlags:           [],
      overallScore:          0.95,
      recommendedAction:     'auto_process',
      scoredAt:              new Date().toISOString(),
    })

    await scoreAndPersistInvoice(prisma, 'inv-1', sampleInvoiceData(), { scorer: fakeScorer })

    expect(updateFn).toHaveBeenCalledTimes(1)
    const call = updateFn.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'inv-1' })
    expect(call.data.recommendedAction).toBe('auto_process')
    expect(call.data.ocrConfidence).toBe(95)   // overallScore * 100, rounded
    expect(call.data.status).toBeUndefined()    // status NOT overridden
    expect(call.data.llmScoredAt).toBeInstanceOf(Date)
  })

  it("sets status to 'ON_HOLD' (existing uppercase enum) when recommendedAction === 'hold'", async () => {
    const updateFn = vi.fn().mockResolvedValue({})
    const prisma: any = { invoice: { update: updateFn } }

    const fakeScorer = async (): Promise<InvoiceScoringResult> => ({
      fieldScores: { invoiceNumber: 0, invoiceDate: 0, vendorName: 0, vendorGstin: 0, vendorPan: 0, totalAmount: 0, taxAmount: 0, currency: 0, lineItems: 0 },
      validationIssues:      [],
      vendorMatchSuggestion: { suggestedName: null, gstin: null, confidence: 0 },
      reviewFlags:           [{ flag: 'duplicate_gstin', reason: 'GSTIN matches another vendor', severity: 'critical' }],
      overallScore:          0,
      recommendedAction:     'hold',
      scoredAt:              new Date().toISOString(),
    })

    await scoreAndPersistInvoice(prisma, 'inv-2', sampleInvoiceData(), { scorer: fakeScorer })

    expect(updateFn.mock.calls[0][0].data.status).toBe('ON_HOLD')
  })
})
