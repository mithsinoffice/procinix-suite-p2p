/**
 * UTR acknowledgement file parser.
 *
 * Auto-detects HDFC (pipe-delimited) vs ICICI (comma-delimited) format from
 * the first non-empty line. The two formats share the same logical columns:
 *
 *   HDFC:   CLIENT_REF|UTR_NUMBER|STATUS|AMOUNT|TXNDATE|REMARKS
 *   ICICI:  Unique Reference No,UTR,Status,Amount,Date,Remarks
 *
 * Status normalisation: any case-insensitive match of "SUCCESS"/"PROCESSED"
 * → "confirmed"; everything else → "failed".
 */

const SUCCESS_STATUSES = new Set(['SUCCESS', 'PROCESSED', 'COMPLETED', 'EXECUTED', 'OK']);

function normaliseStatus(raw) {
  const s = String(raw || '')
    .trim()
    .toUpperCase();
  return SUCCESS_STATUSES.has(s) ? 'confirmed' : 'failed';
}

function detectDelimiter(line) {
  // Pipe wins when present — both delimiters could co-exist in a remarks
  // field, but a header line won't have those.
  if (line.includes('|')) return '|';
  if (line.includes(',')) return ',';
  return null;
}

function looksLikeHeader(fields) {
  // A data row will have at least one digit somewhere (UTR, amount, date,
  // or numeric client-ref). A header row is purely textual labels.
  if (fields.length < 4) return false;
  const anyDigit = fields.some((f) => /\d/.test(String(f ?? '')));
  if (anyDigit) return false;
  const joined = fields.join(' ').toUpperCase();
  return /CLIENT|UNIQUE|UTR|STATUS|AMOUNT|REFERENCE|REMARKS/.test(joined);
}

function splitCsvLine(line) {
  // Minimal CSV split that respects quoted fields.
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function splitPipeLine(line) {
  return line.split('|').map((s) => s.trim());
}

function parseAmount(raw) {
  const cleaned = String(raw || '').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse a UTR acknowledgement file's text content.
 *
 * @param {string} content — raw text (UTF-8) of the file
 * @param {'auto'|'HDFC'|'ICICI'} [format='auto']
 * @returns {Array<{
 *   clientRef: string,
 *   utr: string,
 *   status: 'confirmed'|'failed',
 *   amount: number,
 *   transactionDate: string,
 *   remarks: string
 * }>}
 */
export async function parseUTRFile(content, format = 'auto') {
  if (typeof content !== 'string' || content.trim() === '') {
    return [];
  }

  const lines = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  let delimiter = null;
  if (format === 'HDFC') delimiter = '|';
  else if (format === 'ICICI') delimiter = ',';
  else delimiter = detectDelimiter(lines[0]);
  if (!delimiter) return [];

  const split = delimiter === '|' ? splitPipeLine : splitCsvLine;

  // Skip header line if present
  let startIdx = 0;
  const firstFields = split(lines[0]);
  if (looksLikeHeader(firstFields)) startIdx = 1;

  const rows = [];
  for (let i = startIdx; i < lines.length; i++) {
    const fields = split(lines[i]);
    if (fields.length < 5) continue;
    const [clientRef, utr, status, amount, txnDate, ...rest] = fields;
    rows.push({
      clientRef: String(clientRef || '').trim(),
      utr: String(utr || '').trim(),
      status: normaliseStatus(status),
      amount: parseAmount(amount),
      transactionDate: String(txnDate || '').trim(),
      remarks: rest.join(delimiter === '|' ? '|' : ',').trim(),
    });
  }
  return rows;
}

// Exported for tests
export { normaliseStatus, detectDelimiter };
