// Gemini Vision OCR — extracts structured invoice data from PDF or image
// Uses gemini-2.0-flash for speed + cost efficiency
// Returns typed extraction with per-field confidence scores

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { ok, err, type Result } from '../lib/result.js'

const API_KEY = process.env.GEMINI_API_KEY ?? ''
const MODEL   = process.env.GEMINI_MODEL   ?? 'gemini-2.0-flash'

// ── Extracted invoice structure ──

export interface OcrLineItem {
  description:  string
  hsn?:         string
  quantity:     number
  unitPrice:    number
  amount:       number
  gstRate?:     number
  confidence:   number
}

// Per-field OCR confidence map — Gemini reports a 0–100 score for each scalar
// it extracted. Used by the match agent (e.g. narration confidence feeds the
// OCR bucket) and by InvoiceDetailPage (per-field OCR chips). Optional so old
// rows that pre-date this prompt change still parse without error.
export type OcrFieldConfidence = Partial<Record<
  | 'invoiceNumber' | 'invoiceDate'  | 'dueDate'
  | 'vendorName'    | 'vendorGstin'  | 'vendorPan'  | 'vendorAddress'
  | 'buyerName'     | 'buyerGstin'
  | 'poReference'   | 'irn'
  | 'subtotal'      | 'cgst' | 'sgst' | 'igst'
  | 'tdsRate'       | 'tdsAmount' | 'tdsSection' | 'totalTax' | 'totalAmount'
  | 'currency'
  | 'narration'     | 'periodFrom' | 'periodTo',
  number
>>

export interface OcrInvoiceData {
  invoiceNumber:  string | null
  invoiceDate:    string | null   // DD/MM/YYYY
  dueDate:        string | null
  vendorName:     string | null
  vendorGstin:    string | null
  vendorPan:      string | null
  vendorAddress:  string | null
  buyerName:      string | null
  buyerGstin:     string | null
  poReference:    string | null
  irn:            string | null   // e-invoice IRN
  lineItems:      OcrLineItem[]
  subtotal:       number | null
  cgst:           number | null
  sgst:           number | null
  igst:           number | null
  tdsRate:        number | null
  tdsAmount:      number | null
  tdsSection:     string | null
  totalTax:       number | null
  totalAmount:    number | null
  currency:       string
  isEInvoice:     boolean
  // Free-text narrative on the invoice ("Engagement for Q1 2026 audit services") —
  // captured for downstream readers (Section D of InvoiceDetailPage).
  narration:      string | null
  periodFrom:     string | null   // DD/MM/YYYY — billing period start
  periodTo:       string | null   // DD/MM/YYYY — billing period end
  overallConfidence: number       // 0–100 — fallback when fieldConfidence is sparse
  fieldConfidence?: OcrFieldConfidence
  rawText:        string
}

// ── Extraction prompt ──

const EXTRACTION_PROMPT = `You are an expert Indian GST invoice parser. Extract all data from this invoice and return ONLY a valid JSON object with no markdown, no explanation.

Return this exact structure:
{
  "invoiceNumber": "string or null",
  "invoiceDate": "DD/MM/YYYY or null",
  "dueDate": "DD/MM/YYYY or null",
  "vendorName": "exact legal name as printed",
  "vendorGstin": "15-char GSTIN or null",
  "vendorPan": "10-char PAN or null",
  "vendorAddress": "full address string or null",
  "buyerName": "buyer company name or null",
  "buyerGstin": "buyer GSTIN or null",
  "poReference": "PO number if printed on invoice or null",
  "irn": "64-char IRN if present (e-invoice) or null",
  "lineItems": [
    {
      "description": "item/service description",
      "hsn": "HSN/SAC code or null",
      "quantity": number,
      "unitPrice": number,
      "amount": number,
      "gstRate": GST percentage as number or null,
      "confidence": 0-100
    }
  ],
  "subtotal": number or null,
  "cgst": number or null,
  "sgst": number or null,
  "igst": number or null,
  "tdsRate": number or null,
  "tdsAmount": number or null,
  "tdsSection": "194C or 194J or 194I or 194H or other section code or null",
  "totalTax": number or null,
  "totalAmount": number or null,
  "currency": "INR",
  "isEInvoice": true if IRN present else false,
  "narration": "any free-text narrative / description of the engagement (e.g. 'Q1 2026 audit services'), or null",
  "periodFrom": "billing period start in DD/MM/YYYY (look for 'From', 'Service period', 'Billing period') or null",
  "periodTo": "billing period end in DD/MM/YYYY or null",
  "overallConfidence": 0-100 based on image quality and data completeness,
  "fieldConfidence": {
    "invoiceNumber": 0-100,
    "invoiceDate":   0-100,
    "dueDate":       0-100,
    "vendorName":    0-100,
    "vendorGstin":   0-100,
    "vendorPan":     0-100,
    "vendorAddress": 0-100,
    "poReference":   0-100,
    "irn":           0-100,
    "subtotal":      0-100,
    "cgst":          0-100,
    "sgst":          0-100,
    "igst":          0-100,
    "tdsAmount":     0-100,
    "totalAmount":   0-100,
    "currency":      0-100,
    "narration":     0-100,
    "periodFrom":    0-100,
    "periodTo":      0-100
  },
  "rawText": "first 500 chars of visible text on invoice"
}

Rules:
- All amounts as plain numbers (no commas, no ₹ symbol)
- Dates as DD/MM/YYYY
- GSTIN must be exactly 15 alphanumeric characters
- If a field is unclear or absent, use null AND set its fieldConfidence to 0
- fieldConfidence per key: 100 = absolutely certain, 80–99 = clear but minor doubt, 50–79 = best-effort guess, <50 = unreliable / inferred
- overallConfidence: 95+ = crystal clear, 80-94 = readable with minor issues, <80 = poor quality or unusual format
- Always include the fieldConfidence object even if some keys are 0; never omit it`

// ── Main OCR function ──

export async function extractInvoiceFromFile(
  base64Data: string,
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<Result<OcrInvoiceData>> {
  if (!API_KEY) {
    return err({ code: 'INTERNAL_ERROR' as const, message: 'GEMINI_API_KEY not configured', httpStatus: 500 })
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({
      model: MODEL,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    })

    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      { inlineData: { mimeType, data: base64Data } },
    ])

    const text = result.response.text().trim()
    // Strip markdown code fences if Gemini wraps response
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()

    let parsed: OcrInvoiceData
    try {
      parsed = JSON.parse(clean) as OcrInvoiceData
    } catch {
      // Fallback: try to extract the first JSON object embedded in the response
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]) as OcrInvoiceData
        } catch {
          return err({
            code: 'INTERNAL_ERROR' as const,
            message: `Gemini returned non-JSON response: ${clean.slice(0, 200)}`,
            details: { raw: text.slice(0, 300) },
            httpStatus: 502,
          })
        }
      } else {
        return err({
          code: 'INTERNAL_ERROR' as const,
          message: `Gemini returned non-JSON response: ${clean.slice(0, 200)}`,
          details: { raw: text.slice(0, 300) },
          httpStatus: 502,
        })
      }
    }

    return ok(parsed)
  } catch (e) {
    return err({
      code: 'EXTERNAL_SERVICE_ERROR' as const,
      message: `Gemini OCR failed: ${e instanceof Error ? e.message : String(e)}`,
      httpStatus: 502,
    })
  }
}

// ── Email-poller compat layer ────────────────────────────────────────────────
// Lighter shape with throw-on-error semantics (vs. the Result<> wrapper used by
// invoice-ingestion). Field names align with the Gemini email-poller's expectations.

export interface EmailPollerLineItem {
  description: string
  hsnCode:     string | null
  sacCode:     string | null
  quantity:    number
  uom:         string | null
  unitPrice:   number
  gstRate:     number
  amount:      number
}

export interface EmailPollerOcrResult {
  invoiceNumber: string | null
  invoiceDate:   string | null   // ISO YYYY-MM-DD (translated from DD/MM/YYYY)
  vendorName:    string | null
  vendorGSTIN:   string | null
  vendorPAN:     string | null
  vendorAddress: string | null
  buyerName:     string | null
  buyerGSTIN:    string | null
  irnNumber:     string | null
  lineItems:     EmailPollerLineItem[]
  subtotal:      number
  cgstAmount:    number
  sgstAmount:    number
  igstAmount:    number
  tdsAmount:     number
  totalAmount:   number
  confidence:    { overall: number }
}

// DD/MM/YYYY → YYYY-MM-DD
function toIsoDate(d: string | null): string | null {
  if (!d) return null
  const m = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (!m) return d  // assume already ISO
  const [, dd, mm, yyyy] = m
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function adapt(data: OcrInvoiceData): EmailPollerOcrResult {
  return {
    invoiceNumber: data.invoiceNumber,
    invoiceDate:   toIsoDate(data.invoiceDate),
    vendorName:    data.vendorName,
    vendorGSTIN:   data.vendorGstin,
    vendorPAN:     data.vendorPan,
    vendorAddress: data.vendorAddress,
    buyerName:     data.buyerName,
    buyerGSTIN:    data.buyerGstin,
    irnNumber:     data.irn,
    lineItems: (data.lineItems ?? []).map(l => ({
      description: l.description,
      hsnCode:     l.hsn ?? null,
      sacCode:     null,
      quantity:    Number(l.quantity) || 0,
      uom:         null,
      unitPrice:   Number(l.unitPrice) || 0,
      gstRate:     Number(l.gstRate) || 0,
      amount:      Number(l.amount) || 0,
    })),
    subtotal:    Number(data.subtotal)    || 0,
    cgstAmount:  Number(data.cgst)        || 0,
    sgstAmount:  Number(data.sgst)        || 0,
    igstAmount:  Number(data.igst)        || 0,
    tdsAmount:   Number(data.tdsAmount) || 0,
    totalAmount: Number(data.totalAmount) || 0,
    confidence:  { overall: Number(data.overallConfidence) || 0 },
  }
}

async function extractAndAdapt(
  base64: string,
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<EmailPollerOcrResult> {
  const result = await extractInvoiceFromFile(base64, mimeType)
  if (!result.ok) {
    throw new Error(result.error.message ?? 'OCR failed')
  }
  return adapt(result.data)
}

export function extractInvoiceFromPDF(base64: string): Promise<EmailPollerOcrResult> {
  return extractAndAdapt(base64, 'application/pdf')
}

export function extractInvoiceFromImage(base64: string, mimeType: string): Promise<EmailPollerOcrResult> {
  // Narrow the mimeType to what Gemini supports; default unknown image to PNG
  const supported = ['image/jpeg', 'image/png', 'image/webp'] as const
  const narrowed = (supported as readonly string[]).includes(mimeType)
    ? (mimeType as 'image/jpeg' | 'image/png' | 'image/webp')
    : 'image/png'
  return extractAndAdapt(base64, narrowed)
}
