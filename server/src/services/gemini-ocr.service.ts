// Gemini Vision OCR — extracts structured invoice data from PDF or image.
// Model is picked per-call by pickModelForOcr() — pro for images and large
// (likely scanned) PDFs because of its much better handwriting recognition;
// flash for small digital PDFs where speed/cost matter and the text layer is
// already clean. The chosen model is returned alongside the data so the UI
// can surface it ("OCR extracted · gemini-2.5-pro").

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { ok, err, type Result } from '../lib/result.js'

const API_KEY        = process.env.GEMINI_API_KEY ?? ''
const FLASH_MODEL    = process.env.GEMINI_MODEL_FLASH ?? 'gemini-2.5-flash'
const PRO_MODEL      = process.env.GEMINI_MODEL_PRO   ?? 'gemini-2.5-pro'

// Roughly 500 KB of raw bytes is our heuristic for "this PDF is probably a
// scan, not a digital invoice" — base64 expansion is ~1.33×, so 667 KB of
// base64 maps to 500 KB of raw bytes.
const PRO_ROUTE_RAW_BYTES = 500_000

export interface ModelPick {
  /** The Gemini model id, e.g. 'gemini-2.5-pro' */
  model:  string
  /** Why this model was chosen — surfaces in logs + (in dev) the error detail. */
  reason: 'image-input' | 'large-pdf' | 'small-digital-pdf'
}

/**
 * Pure picker — no I/O, exported for unit tests. Images and PDFs above the
 * raw-bytes threshold route to pro for handwriting fidelity; small PDFs stay
 * on flash. Individual model ids can be customised via GEMINI_MODEL_FLASH /
 * GEMINI_MODEL_PRO, but the routing decision itself is always input-driven —
 * a single global pin would defeat the point of having two models.
 */
export function pickModelForOcr(mimeType: string, base64Length: number): ModelPick {
  if (mimeType.startsWith('image/')) return { model: PRO_MODEL, reason: 'image-input' }
  const estimatedBytes = base64Length * 0.75
  if (estimatedBytes > PRO_ROUTE_RAW_BYTES) return { model: PRO_MODEL, reason: 'large-pdf' }
  return { model: FLASH_MODEL, reason: 'small-digital-pdf' }
}

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
  | 'buyerName'     | 'buyerGstin'   | 'placeOfSupply'
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
  /** "Place of Supply" line — preserved verbatim so the form can resolve
   *  either by state name ("Maharashtra") or by 2-digit GST state code
   *  ("27"). The frontend extracts the code via regex; falls back to
   *  buyerGstin[0..2] when this is null. */
  placeOfSupply:  string | null
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
  /** Gemini model id used for this extraction — set by extractInvoiceFromFile. */
  model?:         string
}

// ── Extraction prompt ──

const EXTRACTION_PROMPT = `You are an expert Indian GST invoice parser. Extract all data from this invoice and return ONLY a valid JSON object with no markdown, no explanation.

This document may be handwritten, printed, or a mix of both.
For handwritten content:
- Read characters carefully — distinguish 1/l/I, 0/O, 5/S, 8/B
- Numbers written in Indian style may use commas as thousands separators (e.g. "1,23,456"); strip commas before parsing
- Amounts may be written without the ₹ symbol — assume INR as the currency
- Line items may be laid out in a table with columns: particulars / description, qty, rate / unit price, amount
- Grand total may be written as "Total", "Grand Total", "Amount", "Rs." or similar at the bottom
- Vendor name is usually at the top of the document (header / letterhead)
- Date formats vary: DD/MM/YY, DD/MM/YYYY, DD-MM-YY, DD.MM.YYYY — always emit DD/MM/YYYY per the spec below
- If a field is genuinely illegible, return null for that field (do NOT guess — low confidence is better than wrong data)
- fieldConfidence (0-100) should reflect handwriting clarity:
    printed = 95-100, handwritten clear = 80-90, handwritten unclear = 50-70, illegible = 0



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
  "placeOfSupply": "verbatim Place of Supply line if printed (e.g. 'Maharashtra (27)' or 'Karnataka' or '27-Maharashtra') or null — look for labels 'Place of Supply', 'State of Supply', 'Bill-To State'",
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
    "placeOfSupply": 0-100,
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

  const pick = pickModelForOcr(mimeType, base64Data.length)

  try {
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({
      model: pick.model,
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
        } catch (e2) {
          console.error('[Gemini OCR] JSON parse failed', { model: pick.model, raw: text.slice(0, 500), err: e2 })
          return err({
            code: 'INTERNAL_ERROR' as const,
            message: `Gemini (${pick.model}) returned non-JSON response`,
            detail:  clean.slice(0, 300),
            details: { raw: text.slice(0, 300), model: pick.model, reason: pick.reason },
            httpStatus: 502,
          })
        }
      } else {
        console.error('[Gemini OCR] No JSON in response', { model: pick.model, raw: text.slice(0, 500) })
        return err({
          code: 'INTERNAL_ERROR' as const,
          message: `Gemini (${pick.model}) returned non-JSON response`,
          detail:  clean.slice(0, 300),
          details: { raw: text.slice(0, 300), model: pick.model, reason: pick.reason },
          httpStatus: 502,
        })
      }
    }

    parsed.model = pick.model
    return ok(parsed)
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    const stack  = e instanceof Error ? e.stack : undefined
    console.error('[Gemini OCR] generateContent threw', {
      model:    pick.model,
      reason:   pick.reason,
      mimeType,
      bytes:    Math.round(base64Data.length * 0.75),
      message:  errMsg,
      stack,
    })
    return err({
      code:    'EXTERNAL_SERVICE_ERROR' as const,
      message: `Gemini OCR failed (${pick.model})`,
      detail:  errMsg,
      details: { model: pick.model, reason: pick.reason },
      httpStatus: 502,
    })
  }
}

