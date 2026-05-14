// Gemini Vision OCR — extracts structured invoice data from PDF or image
// Uses gemini-1.5-flash for speed + cost efficiency
// Returns typed extraction with per-field confidence scores

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { ok, err, type Result } from '../lib/result.js'

const API_KEY = process.env.GEMINI_API_KEY ?? ''
const MODEL   = process.env.GEMINI_MODEL   ?? 'gemini-1.5-flash'

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
  totalTax:       number | null
  totalAmount:    number | null
  currency:       string
  isEInvoice:     boolean
  overallConfidence: number       // 0–100
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
  "totalTax": number or null,
  "totalAmount": number or null,
  "currency": "INR",
  "isEInvoice": true if IRN present else false,
  "overallConfidence": 0-100 based on image quality and data completeness,
  "rawText": "first 500 chars of visible text on invoice"
}

Rules:
- All amounts as plain numbers (no commas, no ₹ symbol)
- Dates as DD/MM/YYYY
- GSTIN must be exactly 15 alphanumeric characters
- If a field is unclear or absent, use null
- overallConfidence: 95+ = crystal clear, 80-94 = readable with minor issues, <80 = poor quality or unusual format`

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
      return err({
        code: 'INTERNAL_ERROR' as const,
        message: 'Gemini returned non-JSON response',
        details: { raw: text.slice(0, 300) },
        httpStatus: 502,
      })
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
