/**
 * Payout file generator — Mode B (Manual upload to bank portal).
 *
 * Three output formats are supported. All produce ASCII text with CRLF line
 * endings (banks parse Windows-style files reliably).
 *
 *   HDFC_BULK    — pipe-delimited TXT  (HDFC Corporate NetBanking)
 *   ICICI_BULK   — comma-delimited CSV (ICICI CIB / iMobile)
 *   GENERIC_CSV  — fallback CSV with explicit Date column
 */

const SUPPORTED_FORMATS = new Set(['HDFC_BULK', 'ICICI_BULK', 'GENERIC_CSV']);

function pad2(n) {
  return String(n).padStart(2, '0');
}

function ddmmyyyy(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function yyyymmdd(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function moneyFixed(n) {
  return (Number(n) || 0).toFixed(2);
}

function sanitiseCsvField(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function sanitisePipeField(v) {
  // HDFC bulk format does not allow the `|` character or newlines in fields.
  return String(v ?? '').replace(/\|/g, '/').replace(/[\r\n]+/g, ' ');
}

function buildHdfc(batch, items) {
  const header =
    'PAYMENT_DATE|BENE_ACCOUNT_NUMBER|BENE_IFSC|BENE_NAME|AMOUNT|PAYMENT_MODE|NARRATION|CLIENT_REF';
  const date = batch.payment_date || new Date();
  const lines = items.map((it) =>
    [
      ddmmyyyy(date),
      it.bank_account_no,
      it.ifsc_code,
      sanitisePipeField(it.vendor_name),
      moneyFixed(it.amount),
      String(it.payment_mode || 'NEFT').toUpperCase(),
      sanitisePipeField(it.narration || ''),
      it.client_ref,
    ].join('|')
  );
  const content = [header, ...lines].join('\r\n') + '\r\n';
  const filename = `HDFC_BULK_${yyyymmdd(date)}_${batch.batch_ref}.txt`;
  return { filename, content, mimeType: 'text/plain' };
}

function buildIcici(batch, items) {
  const header =
    'Debit Account No,Beneficiary Account No,Beneficiary IFSC,Beneficiary Name,Amount,Payment Mode,Remarks,Unique Reference No';
  const date = batch.payment_date || new Date();
  const debit = batch.debit_account_number || '';
  const lines = items.map((it) =>
    [
      sanitiseCsvField(debit),
      sanitiseCsvField(it.bank_account_no),
      sanitiseCsvField(it.ifsc_code),
      sanitiseCsvField(it.vendor_name),
      moneyFixed(it.amount),
      String(it.payment_mode || 'NEFT').toUpperCase(),
      sanitiseCsvField(it.narration || ''),
      sanitiseCsvField(it.client_ref),
    ].join(',')
  );
  const content = [header, ...lines].join('\r\n') + '\r\n';
  const filename = `ICICI_BULK_${yyyymmdd(date)}_${batch.batch_ref}.csv`;
  return { filename, content, mimeType: 'text/csv' };
}

function buildGenericCsv(batch, items) {
  const header =
    'Payment Date,Debit Account No,Beneficiary Account No,Beneficiary IFSC,Beneficiary Name,Amount,Payment Mode,Remarks,Unique Reference No';
  const date = batch.payment_date || new Date();
  const debit = batch.debit_account_number || '';
  const lines = items.map((it) =>
    [
      ddmmyyyy(date),
      sanitiseCsvField(debit),
      sanitiseCsvField(it.bank_account_no),
      sanitiseCsvField(it.ifsc_code),
      sanitiseCsvField(it.vendor_name),
      moneyFixed(it.amount),
      String(it.payment_mode || 'NEFT').toUpperCase(),
      sanitiseCsvField(it.narration || ''),
      sanitiseCsvField(it.client_ref),
    ].join(',')
  );
  const content = [header, ...lines].join('\r\n') + '\r\n';
  const filename = `PAYOUT_${yyyymmdd(date)}_${batch.batch_ref}.csv`;
  return { filename, content, mimeType: 'text/csv' };
}

/**
 * Build the payout file for a batch + line items.
 *
 * @param {object} batch  — { batch_ref, payment_date, debit_account_number? }
 * @param {Array<object>} items — { bank_account_no, ifsc_code, vendor_name,
 *   amount, payment_mode, narration, client_ref }
 * @param {'HDFC_BULK'|'ICICI_BULK'|'GENERIC_CSV'} format
 * @returns {{ filename: string, content: string, mimeType: string }}
 */
export async function generatePayoutFile(batch, items, format) {
  if (!SUPPORTED_FORMATS.has(format)) {
    throw new Error(
      `Unsupported payout format: ${format}. Use one of ${[...SUPPORTED_FORMATS].join(', ')}`
    );
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Payout file requires at least one line item');
  }

  if (format === 'HDFC_BULK') return buildHdfc(batch, items);
  if (format === 'ICICI_BULK') return buildIcici(batch, items);
  return buildGenericCsv(batch, items);
}

// Exported for tests
export { buildHdfc, buildIcici, buildGenericCsv, ddmmyyyy };
