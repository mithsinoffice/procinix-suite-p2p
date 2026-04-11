const VALID_CURRENCIES = new Set([
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'AUD', 'CAD', 'CHF',
  'CNY', 'HKD', 'MYR', 'THB', 'SAR', 'QAR', 'BHD', 'OMR', 'KWD', 'ZAR',
]);

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function isValidDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
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
  if (typeof data.subtotal === 'number' && typeof data.tax_amount === 'number' && typeof data.total_amount === 'number') {
    const expected = data.subtotal + data.tax_amount;
    if (Math.abs(expected - data.total_amount) > 0.01) {
      warnings.push(`total_amount (${data.total_amount}) != subtotal (${data.subtotal}) + tax_amount (${data.tax_amount}) = ${expected}`);
    }
  }

  // Line items sum check
  if (Array.isArray(data.line_items) && data.line_items.length > 0 && typeof data.subtotal === 'number') {
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
  if (data.vendor_gstin && !GSTIN_REGEX.test(data.vendor_gstin)) {
    warnings.push(`vendor_gstin "${data.vendor_gstin}" does not match GST format`);
  }

  const requiresManualReview =
    errors.length > 0 ||
    (typeof data.confidence_score === 'number' && data.confidence_score < 0.7);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiresManualReview,
  };
}
