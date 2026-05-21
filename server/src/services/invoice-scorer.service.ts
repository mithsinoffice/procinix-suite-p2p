// Async LLM invoice scorer — called after n8n ingest persists a row.
// Returns per-field confidence + validation issues + review flags + a
// vendor-match suggestion. The webhook handler fires this with
// `setImmediate` so the 201 response to n8n is never blocked by the API
// round-trip.
//
// Safety contract: this function MUST NOT throw. If OPENAI_API_KEY is
// missing, the SDK errors, the API returns garbage, or JSON.parse fails,
// the function returns a `fallbackResult()` with overallScore=0 and
// recommendedAction='needs_review'. The invoice still gets a write that
// stamps `llmScoredAt` + `validationIssues` so the UI can show "scoring
// unavailable" instead of an empty card.

import OpenAI from 'openai'
import { Prisma, type PrismaClient } from '@prisma/client'
import type { OcrInvoiceData } from './gemini-ocr.service.js'

const MODEL = 'gpt-4o-mini'

export interface InvoiceFieldScores {
  invoiceNumber: number
  invoiceDate:   number
  vendorName:    number
  vendorGstin:   number
  vendorPan:     number
  totalAmount:   number
  taxAmount:     number
  currency:      number
  lineItems:     number
}

export interface InvoiceValidationIssue {
  field:    string
  severity: 'error' | 'warning'
  message:  string
}

export interface InvoiceReviewFlag {
  flag:     string
  reason:   string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface InvoiceVendorMatchSuggestion {
  suggestedName: string | null
  gstin:         string | null
  confidence:    number
}

export type InvoiceRecommendedAction = 'auto_process' | 'needs_review' | 'hold'

export interface InvoiceScoringResult {
  fieldScores:           InvoiceFieldScores
  validationIssues:      InvoiceValidationIssue[]
  vendorMatchSuggestion: InvoiceVendorMatchSuggestion
  reviewFlags:           InvoiceReviewFlag[]
  overallScore:          number
  recommendedAction:     InvoiceRecommendedAction
  scoredAt:              string
}

// Builder is exported so tests can assert prompt content without invoking the API.
export function buildScoringPrompt(data: Partial<OcrInvoiceData>): string {
  const lines = (data.lineItems ?? [])
    .map(l => `- ${l.description}: qty ${l.quantity} × ${l.unitPrice} = ${l.amount}`)
    .join('\n') || '(none extracted)'

  return [
    'Score this OCR-extracted invoice data:',
    '',
    `Vendor: ${data.vendorName ?? '—'} | GSTIN: ${data.vendorGstin ?? '—'} | PAN: ${data.vendorPan ?? '—'}`,
    `Invoice #: ${data.invoiceNumber ?? '—'} | Date: ${data.invoiceDate ?? '—'}`,
    `Total: ${data.currency ?? 'INR'} ${data.totalAmount ?? 0} | Tax: ${data.totalTax ?? 0}`,
    `IGST: ${data.igst ?? 0} | CGST: ${data.cgst ?? 0} | SGST: ${data.sgst ?? 0}`,
    `Line items (${(data.lineItems ?? []).length}):`,
    lines,
    '',
    'Return JSON matching this exact schema:',
    '{',
    '  "fieldScores": {',
    '    "invoiceNumber": <0-1, 0 if blank>,',
    '    "invoiceDate": <0-1, check realistic date>,',
    '    "vendorName": <0-1>,',
    '    "vendorGstin": <0-1, validate 15-char Indian GSTIN format>,',
    '    "vendorPan": <0-1, validate 10-char PAN format>,',
    '    "totalAmount": <0-1, 0 if zero>,',
    '    "taxAmount": <0-1>,',
    '    "currency": <0-1>,',
    '    "lineItems": <0-1, check amounts cross-add to total>',
    '  },',
    '  "validationIssues": [{ "field": "...", "severity": "error"|"warning", "message": "..." }],',
    '  "vendorMatchSuggestion": { "suggestedName": string|null, "gstin": string|null, "confidence": <0-1> },',
    '  "reviewFlags": [{ "flag": "...", "reason": "...", "severity": "critical"|"high"|"medium"|"low" }],',
    '  "overallScore": <min of invoiceNumber + vendorGstin + totalAmount scores>,',
    '  "recommendedAction": "auto_process"|"needs_review"|"hold"',
    '}',
    '',
    "Rules for recommendedAction:",
    "- 'hold' if any critical reviewFlag present",
    "- 'auto_process' if overallScore >= 0.85 and 0 errors",
    "- 'needs_review' otherwise",
  ].join('\n')
}

const SYSTEM_PROMPT = 'You are an invoice validation expert for an Indian B2B procurement system. Analyse the OCR-extracted invoice data and return a JSON scoring result. Be strict — Indian GST invoices have mandatory fields. Respond ONLY with valid JSON.'

// Coerce any free-form JSON shape from the model into the strict result type.
// The model is instructed to return our exact schema, but a defensive parse
// keeps a single malformed field from collapsing the whole record.
function normaliseScoringPayload(raw: unknown): InvoiceScoringResult {
  const obj = (raw ?? {}) as Record<string, unknown>
  const fieldScores = (obj.fieldScores ?? {}) as Partial<InvoiceFieldScores>
  const num = (v: unknown, lo = 0, hi = 1): number => {
    const n = Number(v)
    if (!Number.isFinite(n)) return 0
    return Math.max(lo, Math.min(hi, n))
  }

  const safeFieldScores: InvoiceFieldScores = {
    invoiceNumber: num(fieldScores.invoiceNumber),
    invoiceDate:   num(fieldScores.invoiceDate),
    vendorName:    num(fieldScores.vendorName),
    vendorGstin:   num(fieldScores.vendorGstin),
    vendorPan:     num(fieldScores.vendorPan),
    totalAmount:   num(fieldScores.totalAmount),
    taxAmount:     num(fieldScores.taxAmount),
    currency:      num(fieldScores.currency),
    lineItems:     num(fieldScores.lineItems),
  }

  const validationIssues: InvoiceValidationIssue[] = Array.isArray(obj.validationIssues)
    ? (obj.validationIssues as unknown[]).map(v => {
        const i = (v ?? {}) as Record<string, unknown>
        const severity = i.severity === 'error' ? 'error' : 'warning'
        return { field: String(i.field ?? ''), severity, message: String(i.message ?? '') }
      })
    : []

  const reviewFlags: InvoiceReviewFlag[] = Array.isArray(obj.reviewFlags)
    ? (obj.reviewFlags as unknown[]).map(v => {
        const f = (v ?? {}) as Record<string, unknown>
        const sev = String(f.severity ?? 'low')
        const severity = (['critical', 'high', 'medium', 'low'].includes(sev) ? sev : 'low') as InvoiceReviewFlag['severity']
        return { flag: String(f.flag ?? ''), reason: String(f.reason ?? ''), severity }
      })
    : []

  const vms = (obj.vendorMatchSuggestion ?? {}) as Record<string, unknown>
  const vendorMatchSuggestion: InvoiceVendorMatchSuggestion = {
    suggestedName: typeof vms.suggestedName === 'string' ? vms.suggestedName : null,
    gstin:         typeof vms.gstin === 'string' ? vms.gstin : null,
    confidence:    num(vms.confidence),
  }

  const action = obj.recommendedAction
  const recommendedAction: InvoiceRecommendedAction = (['auto_process', 'needs_review', 'hold'].includes(action as string)
    ? (action as InvoiceRecommendedAction)
    : 'needs_review')

  return {
    fieldScores:           safeFieldScores,
    validationIssues,
    vendorMatchSuggestion,
    reviewFlags,
    overallScore:          num(obj.overallScore),
    recommendedAction,
    scoredAt:              new Date().toISOString(),
  }
}

function fallbackResult(reason: string): InvoiceScoringResult {
  return {
    fieldScores: {
      invoiceNumber: 0, invoiceDate: 0, vendorName: 0, vendorGstin: 0,
      vendorPan: 0, totalAmount: 0, taxAmount: 0, currency: 0, lineItems: 0,
    },
    validationIssues: [
      { field: 'system', severity: 'warning', message: `LLM scoring unavailable — manual review required (${reason})` },
    ],
    vendorMatchSuggestion: { suggestedName: null, gstin: null, confidence: 0 },
    reviewFlags:           [],
    overallScore:          0,
    recommendedAction:     'needs_review',
    scoredAt:              new Date().toISOString(),
  }
}

// Lazy-init the client so tests that don't set OPENAI_API_KEY don't trip the
// SDK's eager-validation. A new instance per call is cheap; the SDK keeps an
// underlying connection pool keyed by base URL.
function makeClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

// Optional dep injection: pass `client` in tests; production uses the default.
export async function scoreInvoiceWithLLM(
  invoiceData: Partial<OcrInvoiceData>,
  deps: { client?: OpenAI | null } = {},
): Promise<InvoiceScoringResult> {
  const client = deps.client === undefined ? makeClient() : deps.client
  if (!client) return fallbackResult('OPENAI_API_KEY not set')

  try {
    const response = await client.chat.completions.create({
      model:           MODEL,
      max_tokens:      1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildScoringPrompt(invoiceData) },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''
    if (!raw) return fallbackResult('empty response')

    // response_format=json_object guarantees the model returns valid JSON,
    // but a model that ignored the constraint shouldn't take down the
    // pipeline. Strip any accidental markdown fences before parsing.
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return fallbackResult('JSON parse failed')
    }
    return normaliseScoringPayload(parsed)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return fallbackResult(`API error: ${msg}`)
  }
}

// Run scoring + persist the result on the invoice row. Called by the n8n
// webhook handler via `setImmediate` so it runs after the 201 response is
// flushed. Status is only overridden to ON_HOLD when the LLM flags it — the
// other recommendedAction values stay as metadata on the row.
//
// existing uppercase enum (DRAFT|PENDING_L1|…|ON_HOLD|PAID). The lowercase
// 'on_hold' from the prompt would have broken every status filter in the app.
export async function scoreAndPersistInvoice(
  prisma:      PrismaClient,
  invoiceId:   string,
  invoiceData: Partial<OcrInvoiceData>,
  deps: { scorer?: typeof scoreInvoiceWithLLM } = {},
): Promise<InvoiceScoringResult> {
  const scorer = deps.scorer ?? scoreInvoiceWithLLM
  const result = await scorer(invoiceData)

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      ocrConfidenceMap:      result.fieldScores           as unknown as Prisma.InputJsonValue,
      ocrConfidence:         Math.round(result.overallScore * 100),
      validationIssues:      result.validationIssues      as unknown as Prisma.InputJsonValue,
      reviewFlags:           result.reviewFlags           as unknown as Prisma.InputJsonValue,
      vendorMatchSuggestion: result.vendorMatchSuggestion as unknown as Prisma.InputJsonValue,
      recommendedAction:     result.recommendedAction,
      llmScoredAt:           new Date(result.scoredAt),
      ...(result.recommendedAction === 'hold' ? { status: 'ON_HOLD' } : {}),
    },
  })

  return result
}
