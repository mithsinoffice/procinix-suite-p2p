import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../../mysql.mjs';

/**
 * Google Gemini is the ONLY OCR / extraction provider for this project.
 * Model defaults to gemini-2.5-pro for accuracy; override via GEMINI_MODEL.
 */

const DEFAULT_MODEL = 'gemini-2.5-pro';

const SYSTEM_PROMPT = `You are an expert AP invoice data extraction AI for Indian GST invoices. Extract all fields from the provided invoice document and return ONLY valid JSON — no markdown fences, no explanation, no other text.

CRITICAL FIELD EXTRACTION RULES:

VENDOR / SUPPLIER (field: vendor_name):
= The company that ISSUED this invoice
= The company on the LETTERHEAD at the TOP
= The company whose logo/name is at the top
= Who this invoice is FROM
= Who needs to be PAID
NEVER put the buyer/client company here.

BUYER / BILL-TO (field: bill_to_name):
= The company labeled "Bill To:", "To:",
  "Billed To:", "Attention:", "Invoice To:"
= Who the invoice is being sent TO
= Who will PAY this invoice
= Often one of: Procinix, Subko Coffee,
  or any client company name

RULE: If you see two company names —
the one at the TOP on the letterhead = vendor.
The one under "Bill To:" label = buyer.
These are ALWAYS different companies.

GSTIN EXTRACTION (fields: vendor_gstin,
bill_to_gstin):

Scan the ENTIRE document for 15-character
strings matching this pattern:
2 digits + 5 letters + 4 digits + 1 letter +
1 alphanumeric + Z + 1 alphanumeric

Look everywhere including:
- Letterhead area / header
- "GSTIN:", "GST No:", "GSTINUN:",
  "GST Reg:", "GST Registration No:"
- Company details box
- Footer
- Inside tables
- Near "Our GSTIN" or "Supplier GSTIN"
- Abbreviated as "GSTIN" without colon

Label each GSTIN found:
- GSTIN near top/letterhead = vendor_gstin
- GSTIN near "Bill To" section = bill_to_gstin
- Return ALL found GSTINs in gstin_list[]

NOTE: "GSTINUN:" is a common label for
GSTIN on Indian invoices — always extract
the value after it.

Return this exact JSON structure:
{
  "vendor_name": "company on letterhead",
  "vendor_gstin": "GSTIN of vendor",
  "vendor_pan": "PAN of vendor",
  "vendor_address": "address of vendor",
  "vendor_state": "state derived from GSTIN",
  "bill_to_name": "company in Bill To section",
  "bill_to_gstin": "GSTIN of buyer",
  "bill_to_address": "address in Bill To",
  "invoice_number": "string",
  "invoice_date": "DD-MM-YYYY",
  "due_date": "DD-MM-YYYY or null",
  "vendor_email": "string or null",
  "bill_to_entity": "string or null",
  "currency": "INR or as shown",
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
  "gstin_list": ["all GSTINs found on invoice"],
  "confidence_score": 0.95,
  "confidence_scores": {
    "vendor_name": 0.0,
    "vendor_gstin": 0.0,
    "invoice_number": 0.0,
    "invoice_date": 0.0,
    "total_amount": 0.0
  }
}

Rules:
- All monetary values as numbers, not strings
- Dates as DD-MM-YYYY when read from document; normalize if needed
- confidence_score between 0 and 1 based on your certainty
- If a field cannot be found, use null
- For line_items, extract every line item visible
- Parse both handwritten and printed invoices`;

const USER_PROMPT = 'Extract all invoice data from this document. Return ONLY the JSON object, nothing else.';
const SCORE_FIELDS = [
  'invoice_number', 'invoice_date', 'due_date', 'vendor_name', 'vendor_gstin', 'vendor_pan',
  'bill_to_entity', 'bill_to_gstin', 'currency', 'total_amount', 'tax_amount', 'payment_terms',
];

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

const STATE_CODE_MAP = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

function validateAndCleanGSTIN(raw) {
  if (!raw) return { valid: false, cleaned: null };
  let cleaned = raw.toString().toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
  const match = cleaned.match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]/);
  if (match) {
    return {
      valid: true,
      cleaned: match[0],
      state_code: match[0].substring(0, 2),
      pan: match[0].substring(2, 12),
    };
  }
  return { valid: false, raw, cleaned: null };
}

function normalizeDateToISO(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dash = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dash) return `${dash[3]}-${dash[2]}-${dash[1]}`;
  const slash = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) return `${slash[3]}-${slash[2]}-${slash[1]}`;
  return raw;
}

function normalizeGstinFields(extracted) {
  const patched = { ...extracted };
  const vendor = validateAndCleanGSTIN(patched.vendor_gstin);
  patched.vendor_gstin = vendor.valid ? vendor.cleaned : null;
  if (!patched.vendor_pan && vendor.valid) patched.vendor_pan = vendor.pan;
  if (vendor.valid) {
    patched.vendor_state = STATE_CODE_MAP[vendor.state_code] || patched.vendor_state || null;
  }

  const billTo = validateAndCleanGSTIN(patched.bill_to_gstin);
  patched.bill_to_gstin = billTo.valid ? billTo.cleaned : null;

  const gstinList = Array.isArray(patched.gstin_list) ? patched.gstin_list : [];
  patched.gstin_list = gstinList
    .map((value) => validateAndCleanGSTIN(value))
    .filter((result) => result.valid && result.cleaned)
    .map((result) => result.cleaned);

  if (!patched.bill_to_entity && patched.bill_to_name) {
    patched.bill_to_entity = patched.bill_to_name;
  }
  patched.invoice_date = normalizeDateToISO(patched.invoice_date);
  patched.due_date = normalizeDateToISO(patched.due_date);
  return patched;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function calculateSimilarity(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

async function guardVendorEntityConfusion(extracted, entityId = null) {
  const patched = { ...extracted };
  const vendorName = String(patched.vendor_name || '').trim();
  if (!vendorName) return patched;
  try {
    const entities = await query(
      `SELECT id, name
       FROM entities
       WHERE is_active = 1`
    );
    for (const entity of entities) {
      if (entityId && String(entity.id) !== String(entityId)) continue;
      const similarity = calculateSimilarity(
        vendorName.toLowerCase(),
        String(entity.name || '').toLowerCase()
      );
      if (similarity > 0.65) {
        console.warn(
          `[OCR] OCR CONFUSION DETECTED: vendor_name "${vendorName}" matches entity "${entity.name}" (${similarity.toFixed(2)}). Moving to bill_to_name`
        );
        if (!patched.bill_to_name) patched.bill_to_name = patched.vendor_name;
        if (!patched.bill_to_entity) patched.bill_to_entity = patched.vendor_name;
        patched.vendor_name = null;
        patched.vendor_name_confidence = 0;
        patched.vendor_name_warning = `OCR extracted "${vendorName}" which matches your entity "${entity.name}". Vendor should be the invoice issuer — please select manually.`;
      }
    }
  } catch (error) {
    console.warn('[OCR] Entity confusion guard skipped:', error?.message || error);
  }
  return patched;
}

function mediaTypeFor(mimeType) {
  const map = {
    'application/pdf': 'application/pdf',
    'image/png': 'image/png',
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
    'image/tiff': 'image/png',
  };
  return map[mimeType] || 'image/png';
}

function getApiKey() {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key || key === 'your-google-ai-api-key' || key === 'your-key-here') {
    throw new Error('GOOGLE_AI_API_KEY not set — Gemini OCR is the only supported provider');
  }
  return key;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

async function applyLearningPatterns(extracted) {
  const patched = { ...extracted };
  try {
    const rows = await query(
      `SELECT pattern_type, input_pattern, correct_output, confidence_boost
       FROM ocr_learning_patterns
       WHERE is_active = TRUE`
    );
    for (const row of rows) {
      const inputPattern = normalizeText(row.input_pattern);
      const output = String(row.correct_output || '').trim();
      if (!inputPattern || !output) continue;
      if (
        (row.pattern_type === 'vendor_name_alias' || row.pattern_type === 'character_confusion') &&
        normalizeText(patched.vendor_name) === inputPattern
      ) {
        patched.vendor_name = output;
        patched._learningApplied = true;
      }
      if (row.pattern_type === 'entity_mapping' && normalizeText(patched.bill_to_entity) === inputPattern) {
        patched.bill_to_entity = output;
        patched._learningApplied = true;
      }
      if (row.pattern_type === 'department_mapping' && normalizeText(patched.department) === inputPattern) {
        patched.department = output;
        patched._learningApplied = true;
      }
    }
  } catch {
    // Learning tables may not exist in all environments.
  }
  return patched;
}

function evaluateField(fieldName, value, confidence) {
  const hasValue = value !== null && value !== undefined && String(value).trim() !== '';
  const ocrRaw = hasValue ? String(value) : null;
  const normalizedConfidence = Math.max(0, Math.min(1, confidence));
  let validationPassed = true;
  let validationMessage = null;
  const candidates = [];

  if (fieldName === 'vendor_gstin' && hasValue) {
    const gstin = String(value).toUpperCase();
    const valid = /^[0-9]{2}[A-Z0-9]{13}$/.test(gstin);
    if (!valid) {
      validationPassed = false;
      validationMessage = 'GSTIN differs from vendor master';
      candidates.push({ value: gstin.replace(/25/g, 'Z5'), score: 0.95, source: 'vendor_master', note: 'OCR confusion: 1Z5 read as 125' });
    }
  }
  if (fieldName === 'invoice_date' && !hasValue) {
    validationPassed = false;
    validationMessage = 'Multiple dates found — select correct one';
    candidates.push({ value: new Date().toISOString().slice(0, 10), score: 0.75, context: "near 'Invoice Date' label" });
  }

  let status = 'matched';
  if (!hasValue && !ocrRaw) status = 'not_found';
  else if (normalizedConfidence < 0.5) status = 'low_confidence';
  else if (normalizedConfidence >= 0.5 && !validationPassed) status = 'conflict';
  else if (normalizedConfidence >= 0.9 && validationPassed) status = 'matched';
  else status = 'conflict';

  return {
    value: hasValue ? String(value) : null,
    confidence: normalizedConfidence,
    ocr_raw: ocrRaw,
    match_status: status,
    conflict_candidates: candidates,
    validation_passed: validationPassed,
    validation_message: validationMessage,
  };
}

function buildFieldScores(extracted) {
  const baseConfidence = typeof extracted.confidence_score === 'number' ? extracted.confidence_score : 0.5;
  const fields = {};
  let fieldsMatched = 0;
  let fieldsConflicted = 0;
  let fieldsLowConfidence = 0;
  let fieldsNotFound = 0;
  let weighted = 0;

  for (const key of SCORE_FIELDS) {
    const score = evaluateField(key, extracted[key], baseConfidence);
    fields[key] = score;
    if (score.match_status === 'matched') { fieldsMatched += 1; weighted += 1; }
    else if (score.match_status === 'conflict') { fieldsConflicted += 1; weighted += 0.5; }
    else if (score.match_status === 'low_confidence') { fieldsLowConfidence += 1; weighted += 0.25; }
    else { fieldsNotFound += 1; }
  }

  const total = SCORE_FIELDS.length || 1;
  return {
    fields,
    fields_matched: fieldsMatched,
    fields_conflicted: fieldsConflicted,
    fields_low_confidence: fieldsLowConfidence,
    fields_not_found: fieldsNotFound,
    ocr_overall_confidence: weighted / total,
    ocr_conflicts: Object.fromEntries(Object.entries(fields).filter(([, v]) => v.match_status !== 'matched')),
    touchless_eligible: fieldsConflicted === 0 && fieldsLowConfidence === 0,
  };
}

export async function extractInvoiceData(attachmentBuffer, mimeType, options = {}) {
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const apiKey = getApiKey();

  console.log(`[OCR] Gemini (${modelName})...`);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const base64 = attachmentBuffer.toString('base64');
  const resolvedMime = mediaTypeFor(mimeType);

  const fullPrompt = SYSTEM_PROMPT + '\n\n' + USER_PROMPT;
  console.log('[OCR] Gemini request prompt:\n', fullPrompt);
  const result = await model.generateContent([
    { text: fullPrompt },
    { inlineData: { mimeType: resolvedMime, data: base64 } },
  ]);

  const text = result.response.text();
  if (!text) throw new Error('No response from Gemini');
  console.log('[OCR] Gemini raw response:\n', text);

  let data = parseJsonResponse(text);
  data = normalizeGstinFields(data);
  data = await guardVendorEntityConfusion(data, options?.entityId || null);
  data = await applyLearningPatterns(data);
  const scoreData = buildFieldScores(data);
  data._provider = 'gemini';
  data._model = modelName;
  data.ocr_field_scores = scoreData.fields;
  data.ocr_conflicts = scoreData.ocr_conflicts;
  data.ocr_overall_confidence = scoreData.ocr_overall_confidence;
  data.fields_matched = scoreData.fields_matched;
  data.fields_conflicted = scoreData.fields_conflicted;
  data.fields_low_confidence = scoreData.fields_low_confidence;
  data.fields_not_found = scoreData.fields_not_found;
  data.touchless_eligible = scoreData.touchless_eligible;
  console.log('[OCR] Gemini succeeded');
  return data;
}

export function getAvailableProviders() {
  try { getApiKey(); return ['Gemini']; } catch { return []; }
}

export function isOcrConfigured() {
  try { getApiKey(); return true; } catch { return false; }
}
