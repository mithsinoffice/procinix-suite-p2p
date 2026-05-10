import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

/**
 * N8N webhook OCR provider.
 *
 * When N8N_WEBHOOK_URL is set in the environment, geminiOCR.mjs delegates here
 * before invoking Gemini, making N8N the primary provider and Gemini the
 * fallback when N8N is unreachable.
 *
 * The exported function takes the file payload (path, Buffer, or Uint8Array),
 * filename, and mime type — adapts to whichever the caller already has.
 */

const DEFAULT_WEBHOOK = 'https://vishkar.app.n8n.cloud/webhook/invoice-extract';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

/** N8N returns nested `{ value, confidence, suggestions }` per field — flatten. */
function flatten(field) {
  if (field == null) return null;
  if (typeof field === 'object' && !Array.isArray(field) && 'value' in field) return field.value;
  return field;
}

function toNumber(field) {
  const v = flatten(field);
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[, ₹$]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

async function loadAsBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  if (typeof input === 'string') return await readFile(input);
  throw new Error('extractInvoiceDataN8N: input must be a Buffer, Uint8Array, or filepath string');
}

/** Anthropic fallback when N8N returns raw extracted text instead of structured JSON. */
async function structureViaAnthropic(rawText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY required when N8N returns raw text — cannot structure header fields'
    );
  }

  const prompt = `Extract Indian GST invoice header fields from the following text. Return ONLY a JSON object — no markdown fences, no commentary.

Required keys (use null when not present):
- invoice_number (string)
- vendor_name (string)
- vendor_gstin (15-char GSTIN)
- invoice_date (DD-MM-YYYY)
- due_date (DD-MM-YYYY or null)
- total_amount (number)
- subtotal (number)
- tax_amount (number)
- po_number (string or null)
- place_of_supply (string or null)
- currency (default "INR")

Text:
"""
${rawText}
"""`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
  }

  const json = await response.json();
  let text = json?.content?.[0]?.text || '';
  text = text.trim();
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Anthropic OCR returned non-JSON: ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`,
      { cause: err }
    );
  }
}

function looksLikeRawText(payload) {
  if (typeof payload === 'string') return true;
  if (!payload || typeof payload !== 'object') return false;
  const hasStructured =
    payload.invoice_number || payload.vendor_name || payload.lineItems || payload.line_items;
  if (hasStructured) return false;
  return Boolean(payload.text || payload.content || payload.raw_text || payload.extracted_text);
}

function extractRawText(payload) {
  if (typeof payload === 'string') return payload;
  return payload?.text || payload?.content || payload?.raw_text || payload?.extracted_text || '';
}

export async function extractInvoiceDataN8N(
  input,
  filename = 'invoice.pdf',
  mimeType = 'application/pdf'
) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || DEFAULT_WEBHOOK;
  console.log(`[OCR] N8N webhook: ${webhookUrl}`);

  const buffer = await loadAsBuffer(input);
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), filename);

  const response = await fetch(webhookUrl, { method: 'POST', body: form });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`N8N webhook failed ${response.status}: ${body || response.statusText}`);
  }

  const ct = response.headers.get('content-type') || '';
  let payload = ct.includes('application/json') ? await response.json() : await response.text();

  // n8n typically wraps responses in an array — unwrap a single-item envelope.
  if (Array.isArray(payload) && payload.length === 1) payload = payload[0];

  let header;
  if (looksLikeRawText(payload)) {
    console.log('[OCR] N8N returned raw text — structuring via Anthropic');
    header = await structureViaAnthropic(extractRawText(payload));
  } else {
    // N8N returns camelCase keys; fall back to snake_case for other providers
    header = {
      invoice_number: flatten(payload.invoiceNumber ?? payload.invoice_number),
      vendor_name: flatten(payload.vendorName ?? payload.vendor_name),
      vendor_gstin: flatten(payload.vendorGSTIN ?? payload.vendor_gstin),
      invoice_date: flatten(payload.invoiceDate ?? payload.invoice_date),
      due_date: flatten(payload.dueDate ?? payload.due_date),
      total_amount: toNumber(payload.grossAmount ?? payload.total_amount),
      subtotal: toNumber(payload.baseAmount ?? payload.subtotal),
      tax_amount: toNumber(payload.taxAmount ?? payload.tax_amount),
      po_number: flatten(payload.poNumber ?? payload.po_number),
      place_of_supply: flatten(payload.shipToLocation ?? payload.place_of_supply),
      currency: flatten(payload.currency) || 'INR',
      vendor_address: flatten(payload.billingLocation ?? payload.vendor_address),
      bill_to_name: flatten(payload.billToCompanyName ?? payload.bill_to_name),
    };
  }

  const rawLineItems = Array.isArray(payload?.lineItems)
    ? payload.lineItems
    : Array.isArray(payload?.line_items)
      ? payload.line_items
      : [];

  // N8N uses itemDescription + rate; other providers use description + amount
  const line_items = rawLineItems.map((item) => {
    const description = flatten(item.itemDescription ?? item.description);
    const quantity = toNumber(item.quantity) || 1;
    const unitRate = toNumber(item.rate) || toNumber(item.unit_price) || 0;
    const amount = unitRate ? quantity * unitRate : toNumber(item.amount);
    return {
      description: description == null ? null : String(description),
      quantity,
      unit_price: unitRate,
      amount,
      hsn_sac: flatten(item.hsn_sac) ?? null,
      gst_rate: flatten(item.gst_rate ?? item.gstRate) ?? null,
      interval: flatten(item.interval) ?? undefined,
    };
  });

  const rawPayments = Array.isArray(payload?.payments) ? payload.payments : [];
  const payments = rawPayments.map((p) => ({
    date: flatten(p.date),
    transaction_id: flatten(p.transactionId),
    mode: flatten(p.mode),
    amount: toNumber(p.amount),
  }));

  // N8N may return only line items (no header fields) for some document types.
  // Derive totals from line items when the header fields are absent.
  const derivedLineTotal = line_items.reduce((sum, li) => sum + (li.amount || 0), 0);
  const resolvedTotal = Number(header.total_amount) || derivedLineTotal;
  const resolvedSubtotal =
    Number(header.subtotal) ||
    (Number(header.tax_amount) ? resolvedTotal - Number(header.tax_amount) : derivedLineTotal);

  const result = {
    invoice_number: header.invoice_number || null,
    invoice_date: header.invoice_date || null,
    due_date: header.due_date || null,
    vendor_name: header.vendor_name || null,
    vendor_gstin: header.vendor_gstin || null,
    vendor_pan: null,
    vendor_address: header.vendor_address || null,
    vendor_state: null,
    bill_to_name: header.bill_to_name || null,
    bill_to_gstin: null,
    bill_to_address: null,
    bill_to_entity: null,
    currency: header.currency || 'INR',
    subtotal: resolvedSubtotal,
    tax_amount:
      Number(header.tax_amount) ||
      (resolvedTotal && resolvedSubtotal
        ? Math.round((resolvedTotal - resolvedSubtotal) * 100) / 100
        : 0),
    total_amount: resolvedTotal,
    po_number: header.po_number || null,
    place_of_supply: header.place_of_supply || null,
    line_items,
    payments,
    confidence_score: 0.85,
    confidence_scores: {},
    gstin_list: [],
    notes: null,
    bank_details: null,
    payment_terms: null,
    _provider: 'n8n',
    _model: 'n8n-webhook',
    _raw: payload,
    _status: flatten(payload?.status) || null,
  };

  console.log(
    `[OCR] N8N succeeded: invoice=${result.invoice_number || '?'} vendor=${result.vendor_name || '?'} amount=${result.total_amount} lines=${line_items.length}`
  );
  return result;
}
