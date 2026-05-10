const VALID_CURRENCIES = new Set([
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SGD',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'HKD',
  'MYR',
  'THB',
  'SAR',
  'QAR',
  'BHD',
  'OMR',
  'KWD',
  'ZAR',
]);

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

function getStandardTDSRate(section, vendorType) {
  if (section === '194C') return vendorType === 'company' ? 2 : 1;
  if (section === '194J') return 10;
  if (section === '194I') return 10;
  if (section === '194Q') return 0.1;
  return 0;
}

function determineExpectedTDSRate(line = {}, vendor = {}) {
  const section = line.tds_section || line.tdsSection || 'None';
  const standardRate = getStandardTDSRate(section, vendor.vendor_type || 'company');
  if (vendor.tds_exempt) return 0;
  if (!vendor.pan_valid) return Math.max(standardRate, 20);
  if (vendor.itr_filed === false) return Math.max(standardRate, 5);
  if (vendor.lower_cert) return Number(vendor.lower_rate || 0);
  if (section === 'None') return 0;
  const threshold = Number(line.tds_threshold || 0);
  const taxable = Number(line.amount || line.taxable_amount || 0);
  if (taxable < threshold) return 0;
  return standardRate;
}

function validateAndCleanGSTIN(raw) {
  if (!raw) return { valid: false, cleaned: null };
  const cleaned = raw
    .toString()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
  const match = cleaned.match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]/);
  if (!match) return { valid: false, cleaned: null };
  return { valid: true, cleaned: match[0] };
}

function isValidDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  // JS silently rolls over invalid dates (Apr 31 → May 1). Check the string matches the parsed date.
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, day] = dateStr.split('-').map(Number);
    return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
  }
  return true;
}

function sanitizeDate(dateStr) {
  if (!dateStr) return null;
  if (isValidDate(dateStr)) return dateStr;
  // Try to fix common AI extraction errors (Apr 31 → Apr 30, Feb 30 → Feb 28)
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

function isFutureDate(dateStr, toleranceDays = 7) {
  const d = new Date(dateStr);
  const limit = new Date();
  limit.setDate(limit.getDate() + toleranceDays);
  return d > limit;
}

export function validateInvoiceData(data) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!data.invoice_number || !String(data.invoice_number).trim()) {
    errors.push('invoice_number is required');
  }
  if (!data.invoice_date) {
    errors.push('invoice_date is required');
  } else if (!isValidDate(data.invoice_date)) {
    errors.push('invoice_date is not a valid date');
  } else if (isFutureDate(data.invoice_date)) {
    errors.push('invoice_date is more than 7 days in the future');
  }
  if (!data.vendor_name || !String(data.vendor_name).trim()) {
    errors.push('vendor_name is required');
  }
  if (data.total_amount === null || data.total_amount === undefined || data.total_amount <= 0) {
    errors.push('total_amount must be > 0');
  }
  if (!data.currency) {
    errors.push('currency is required');
  } else if (!VALID_CURRENCIES.has(data.currency.toUpperCase())) {
    warnings.push(`currency "${data.currency}" is not a recognized ISO 4217 code`);
  }

  // Math checks
  if (
    typeof data.subtotal === 'number' &&
    typeof data.tax_amount === 'number' &&
    typeof data.total_amount === 'number'
  ) {
    const expected = data.subtotal + data.tax_amount;
    if (Math.abs(expected - data.total_amount) > 0.01) {
      warnings.push(
        `total_amount (${data.total_amount}) != subtotal (${data.subtotal}) + tax_amount (${data.tax_amount}) = ${expected}`
      );
    }
  }

  // Line items sum check
  if (
    Array.isArray(data.line_items) &&
    data.line_items.length > 0 &&
    typeof data.subtotal === 'number'
  ) {
    const lineSum = data.line_items.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
    if (Math.abs(lineSum - data.subtotal) > 0.01) {
      warnings.push(`line items sum (${lineSum}) != subtotal (${data.subtotal})`);
    }
  }

  // Confidence check
  if (typeof data.confidence_score === 'number' && data.confidence_score < 0.7) {
    warnings.push(`Low confidence score: ${data.confidence_score}`);
  }

  // GSTIN validation
  if (data.vendor_gstin) {
    const vendor = validateAndCleanGSTIN(data.vendor_gstin);
    if (!vendor.valid || !GSTIN_REGEX.test(vendor.cleaned)) {
      warnings.push(`vendor_gstin "${data.vendor_gstin}" does not match GST format`);
    }
  }
  if (data.bill_to_gstin) {
    const billTo = validateAndCleanGSTIN(data.bill_to_gstin);
    if (!billTo.valid || !GSTIN_REGEX.test(billTo.cleaned)) {
      warnings.push(`bill_to_gstin "${data.bill_to_gstin}" does not match GST format`);
    }
  }

  const requiresManualReview =
    errors.length > 0 || (typeof data.confidence_score === 'number' && data.confidence_score < 0.7);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiresManualReview,
  };
}

export async function validateInvoiceDataWithPolicy(data, options = {}) {
  const result = validateInvoiceData(data);
  const { existingInvoiceByVendorInvoiceNo, vendor, fiscalYear } = options;

  if (existingInvoiceByVendorInvoiceNo) {
    result.valid = false;
    result.errors.push('Duplicate invoice detected for vendor + invoice number + fiscal year');
    result.httpStatus = 409;
  }

  const lineItems = Array.isArray(data.line_items) ? data.line_items : [];
  const taxableTotal = lineItems.reduce(
    (sum, item) => sum + Number(item.taxable_amount ?? item.amount ?? 0),
    0
  );
  const gstTotal = lineItems.reduce(
    (sum, item) => sum + Number(item.igst || 0) + Number(item.cgst || 0) + Number(item.sgst || 0),
    0
  );
  const headerTotal = Number(data.total_amount || 0);
  if (Math.abs(taxableTotal + gstTotal - headerTotal) > 1) {
    result.valid = false;
    result.errors.push(
      'Header total mismatch: taxable + GST does not reconcile within rounding tolerance'
    );
  }

  for (const [idx, line] of lineItems.entries()) {
    const expected = determineExpectedTDSRate(line, vendor || {});
    const submitted = Number(line.tds_rate || line.tdsRate || 0);
    if (Math.abs(expected - submitted) > 0.1) {
      result.valid = false;
      result.errors.push(
        `Line ${idx + 1} TDS rate mismatch: expected ${expected.toFixed(2)}%, submitted ${submitted.toFixed(2)}%`
      );
      result.httpStatus = 422;
    }
  }

  if (vendor?.is_msme && data.invoice_date) {
    const due = new Date(data.invoice_date);
    due.setDate(due.getDate() + 45);
    result.msmePaymentDueDate = due.toISOString().slice(0, 10);
  } else {
    result.msmePaymentDueDate = null;
  }

  result.fiscalYear = fiscalYear || null;
  return result;
}
