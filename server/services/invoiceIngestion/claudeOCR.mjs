import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Shared prompt & helpers ─────────────────────────────

const SYSTEM_PROMPT = `You are an expert AP invoice data extraction AI for Indian GST invoices. Extract all fields from the provided invoice document and return ONLY valid JSON — no markdown fences, no explanation, no other text.

Return this exact JSON structure:
{
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "vendor_name": "string",
  "vendor_gstin": "string or null",
  "vendor_pan": "string or null",
  "vendor_email": "string or null",
  "bill_to_entity": "string or null",
  "bill_to_gstin": "string or null",
  "currency": "INR",
  "subtotal": 0,
  "tax_amount": 0,
  "tax_rate": null,
  "total_amount": 0,
  "po_number": "string or null",
  "irn": "string or null",
  "hsn_sac_summary": "string or null",
  "line_items": [
    {
      "description": "string",
      "quantity": 1,
      "unit_price": 0,
      "amount": 0,
      "hsn_sac": "string or null",
      "gst_rate": null
    }
  ],
  "payment_terms": "string or null",
  "bank_details": {
    "account_name": "string or null",
    "account_number": "string or null",
    "ifsc": "string or null",
    "bank_name": "string or null"
  },
  "notes": "string or null",
  "confidence_score": 0.95
}

Rules:
- All monetary values as numbers, not strings
- Dates as YYYY-MM-DD
- confidence_score between 0 and 1 based on your certainty
- If a field cannot be found, use null
- For line_items, extract every line item visible
- Parse both handwritten and printed invoices`;

const USER_PROMPT = 'Extract all invoice data from this document. Return ONLY the JSON object, nothing else.';

function parseJsonResponse(text) {
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  const data = JSON.parse(jsonStr);
  data.line_items = Array.isArray(data.line_items) ? data.line_items : [];
  data.confidence_score = typeof data.confidence_score === 'number'
    ? Math.max(0, Math.min(1, data.confidence_score))
    : 0.5;
  return data;
}

function toBase64(buffer) {
  return buffer.toString('base64');
}

function imageMediaType(mimeType) {
  const map = {
    'application/pdf': 'application/pdf',
    'image/png': 'image/png',
    'image/jpeg': 'image/jpeg',
    'image/tiff': 'image/png',
  };
  return map[mimeType] || 'image/png';
}

// ── Provider 1: Claude (Anthropic) ──────────────────────

async function extractWithClaude(buffer, mimeType) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-key-here' || apiKey === 'your-anthropic-api-key') {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  console.log('[OCR] Trying Claude (claude-sonnet-4-20250514)...');
  const client = new Anthropic({ apiKey });
  const base64 = toBase64(buffer);
  const isPdf = mimeType === 'application/pdf';
  const mediaType = imageMediaType(mimeType);

  const content = [
    {
      type: isPdf ? 'document' : 'image',
      source: { type: 'base64', media_type: mediaType, data: base64 },
      ...(isPdf ? { cache_control: { type: 'ephemeral' } } : {}),
    },
    { type: 'text', text: USER_PROMPT },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text response from Claude');

  const data = parseJsonResponse(textBlock.text);
  data._provider = 'claude';
  console.log('[OCR] Claude succeeded');
  return data;
}

// ── Provider 2: ChatGPT (OpenAI) ────────────────────────

async function extractWithOpenAI(buffer, mimeType) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your-openai-api-key') {
    throw new Error('OPENAI_API_KEY not set');
  }

  console.log('[OCR] Trying ChatGPT (gpt-4o)...');
  const client = new OpenAI({ apiKey });
  const base64 = toBase64(buffer);
  const isPdf = mimeType === 'application/pdf';

  // GPT-4o supports images directly; for PDFs send as base64 data URL
  const mediaType = isPdf ? 'application/pdf' : imageMediaType(mimeType);
  const dataUrl = `data:${mediaType};base64,${base64}`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: dataUrl, detail: 'high' },
        },
        { type: 'text', text: USER_PROMPT },
      ],
    },
  ];

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages,
  });

  const text = response.choices?.[0]?.message?.content;
  if (!text) throw new Error('No response from ChatGPT');

  const data = parseJsonResponse(text);
  data._provider = 'openai';
  console.log('[OCR] ChatGPT succeeded');
  return data;
}

// ── Provider 3: Gemini (Google) ─────────────────────────

async function extractWithGemini(buffer, mimeType) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === 'your-google-ai-api-key') {
    throw new Error('GOOGLE_AI_API_KEY not set');
  }

  console.log('[OCR] Trying Gemini (gemini-2.5-flash)...');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const base64 = toBase64(buffer);
  const mediaType = imageMediaType(mimeType);

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT + '\n\n' + USER_PROMPT },
    {
      inlineData: {
        mimeType: mediaType,
        data: base64,
      },
    },
  ]);

  const text = result.response.text();
  if (!text) throw new Error('No response from Gemini');

  const data = parseJsonResponse(text);
  data._provider = 'gemini';
  console.log('[OCR] Gemini succeeded');
  return data;
}

// ── Fallback chain: Claude → ChatGPT → Gemini ──────────

const PROVIDERS = [
  { name: 'Claude', fn: extractWithClaude },
  { name: 'ChatGPT', fn: extractWithOpenAI },
  { name: 'Gemini', fn: extractWithGemini },
];

export async function extractInvoiceData(attachmentBuffer, mimeType) {
  const errors = [];

  for (const provider of PROVIDERS) {
    try {
      return await provider.fn(attachmentBuffer, mimeType);
    } catch (err) {
      const msg = err.message || String(err);
      console.warn(`[OCR] ${provider.name} failed: ${msg}`);
      errors.push(`${provider.name}: ${msg}`);
    }
  }

  throw new Error(`All OCR providers failed:\n${errors.join('\n')}`);
}

// ── Status check ────────────────────────────────────────

export function getAvailableProviders() {
  const providers = [];
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-key-here') {
    providers.push('Claude');
  }
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key') {
    providers.push('ChatGPT');
  }
  if (process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'your-google-ai-api-key') {
    providers.push('Gemini');
  }
  return providers;
}
