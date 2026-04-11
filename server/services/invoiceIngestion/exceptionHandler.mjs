import { randomUUID } from 'node:crypto';
import { query } from '../../mysql.mjs';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

async function insertException(invoiceId, type, detail, severity = 'medium') {
  await query(
    `INSERT INTO invoice_exceptions (id, invoice_id, exception_type, exception_detail, severity, created_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [randomUUID(), invoiceId, type, detail, severity]
  );
}

export async function handleExceptions(invoiceId, extractedData, validationResult, matchResult) {
  const exceptions = [];

  // DUPLICATE check
  if (extractedData.invoice_number && extractedData.vendor_name) {
    const dupes = await query(
      `SELECT id FROM invoices
       WHERE invoice_number = ? AND vendor_name = ? AND id != ?
       LIMIT 1`,
      [extractedData.invoice_number, extractedData.vendor_name, invoiceId]
    );
    if (dupes.length > 0) {
      const detail = `Duplicate: invoice ${extractedData.invoice_number} from ${extractedData.vendor_name} already exists (id: ${dupes[0].id})`;
      await insertException(invoiceId, 'DUPLICATE', detail, 'high');
      exceptions.push({ type: 'DUPLICATE', detail, severity: 'high' });
    }
  }

  // LOW_CONFIDENCE
  if (typeof extractedData.confidence_score === 'number' && extractedData.confidence_score < 0.7) {
    const detail = `Confidence score ${extractedData.confidence_score} is below threshold 0.7`;
    await insertException(invoiceId, 'LOW_CONFIDENCE', detail, 'medium');
    exceptions.push({ type: 'LOW_CONFIDENCE', detail, severity: 'medium' });
  }

  // AMOUNT_MISMATCH
  if (validationResult.warnings.some((w) => w.includes('line items sum') || w.includes('total_amount'))) {
    const detail = validationResult.warnings.filter((w) => w.includes('sum') || w.includes('total')).join('; ');
    await insertException(invoiceId, 'AMOUNT_MISMATCH', detail, 'high');
    exceptions.push({ type: 'AMOUNT_MISMATCH', detail, severity: 'high' });
  }

  // NO_PO_MATCH for high-value invoices
  if (!matchResult.matched && extractedData.total_amount > 10000) {
    const detail = `No PO match found for invoice amount ${extractedData.currency || 'INR'} ${extractedData.total_amount}`;
    await insertException(invoiceId, 'NO_PO_MATCH', detail, 'medium');
    exceptions.push({ type: 'NO_PO_MATCH', detail, severity: 'medium' });
  }

  // MISSING_FIELDS
  const missing = [];
  if (!extractedData.invoice_number) missing.push('invoice_number');
  if (!extractedData.invoice_date) missing.push('invoice_date');
  if (!extractedData.vendor_name) missing.push('vendor_name');
  if (!extractedData.total_amount) missing.push('total_amount');
  if (missing.length > 0) {
    const detail = `Missing required fields: ${missing.join(', ')}`;
    await insertException(invoiceId, 'MISSING_FIELDS', detail, 'high');
    exceptions.push({ type: 'MISSING_FIELDS', detail, severity: 'high' });
  }

  // GSTIN_MISMATCH — check against vendor master
  if (extractedData.vendor_gstin && GSTIN_REGEX.test(extractedData.vendor_gstin)) {
    try {
      const vendors = await query(
        `SELECT id, payload FROM vendor_master.vendor_master
         WHERE LOWER(record_name) LIKE LOWER(?)
         LIMIT 5`,
        [`%${extractedData.vendor_name?.substring(0, 20) || ''}%`]
      );
      for (const v of vendors) {
        const payload = typeof v.payload === 'string' ? JSON.parse(v.payload) : v.payload;
        const masterGstin = payload?.gstin || payload?.vendorGstin;
        if (masterGstin && masterGstin !== extractedData.vendor_gstin) {
          const detail = `Invoice GSTIN ${extractedData.vendor_gstin} does not match vendor master GSTIN ${masterGstin}`;
          await insertException(invoiceId, 'GSTIN_MISMATCH', detail, 'high');
          exceptions.push({ type: 'GSTIN_MISMATCH', detail, severity: 'high' });
          break;
        }
      }
    } catch {
      // vendor_master table may not exist — skip
    }
  }

  // DATE_ANOMALY
  if (extractedData.invoice_date) {
    const invoiceDate = new Date(extractedData.invoice_date);
    const now = new Date();
    const daysDiff = (now - invoiceDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      const detail = `Invoice date ${extractedData.invoice_date} is more than 1 year old`;
      await insertException(invoiceId, 'DATE_ANOMALY', detail, 'medium');
      exceptions.push({ type: 'DATE_ANOMALY', detail, severity: 'medium' });
    }
    if (daysDiff < -7) {
      const detail = `Invoice date ${extractedData.invoice_date} is more than 7 days in the future`;
      await insertException(invoiceId, 'DATE_ANOMALY', detail, 'high');
      exceptions.push({ type: 'DATE_ANOMALY', detail, severity: 'high' });
    }
  }

  return exceptions;
}
