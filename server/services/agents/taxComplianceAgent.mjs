import { randomUUID } from 'node:crypto';
import { query } from '../../mysql.mjs';

const AGENT_NAME = 'TaxComplianceAgent';
const AGENT_VERSION = '1.0.0';

// ── GST state code map ────────────────────────────────

const GST_STATE_MAP = {
  '01': 'JK', '02': 'HP', '03': 'PB', '04': 'CH', '05': 'UK',
  '06': 'HR', '07': 'DL', '08': 'RJ', '09': 'UP', '10': 'BR',
  '19': 'WB', '20': 'JH', '21': 'OD', '22': 'CG', '23': 'MP',
  '24': 'GJ', '27': 'MH', '29': 'KA', '30': 'GA', '32': 'KL',
  '33': 'TN', '36': 'TS', '37': 'AP',
};

const VALID_GST_RATES = [0, 5, 12, 18, 28];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

// ── Check functions ───────────────────────────────────

function checkArithmetic(subtotal, taxAmount, totalAmount) {
  if (subtotal == null || taxAmount == null || totalAmount == null) {
    return { pass: false, explanation: 'Missing subtotal, tax_amount, or total_amount — cannot verify arithmetic' };
  }

  const expected = parseFloat((Number(subtotal) + Number(taxAmount)).toFixed(2));
  const actual = Number(totalAmount);
  const diff = Math.abs(expected - actual);

  if (diff <= 0.01) {
    return { pass: true, explanation: `Arithmetic valid: ${subtotal} + ${taxAmount} = ${expected} matches total ${actual}` };
  }

  return {
    pass: false,
    explanation: `Arithmetic mismatch: ${subtotal} + ${taxAmount} = ${expected}, but total is ${actual} (difference: ${diff.toFixed(2)})`,
  };
}

function checkLineSum(lineItems, subtotal) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return { pass: true, explanation: 'No line items to validate against subtotal' };
  }
  if (subtotal == null) {
    return { pass: false, explanation: 'Subtotal missing — cannot verify line item sum' };
  }

  const lineSum = parseFloat(
    lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toFixed(2)
  );
  const expected = Number(subtotal);
  const diff = Math.abs(lineSum - expected);

  if (diff <= 0.01) {
    return { pass: true, explanation: `Line sum valid: ${lineItems.length} items totalling ${lineSum} matches subtotal ${expected}` };
  }

  return {
    pass: false,
    explanation: `Line sum mismatch: ${lineItems.length} items totalling ${lineSum}, but subtotal is ${expected} (difference: ${diff.toFixed(2)})`,
  };
}

function checkGstType(vendorGstin, billToGstin) {
  if (!vendorGstin || !billToGstin) {
    return { pass: true, expectedType: null, explanation: 'One or both GSTINs missing — GST type check skipped' };
  }

  const vendorState = vendorGstin.substring(0, 2);
  const billToState = billToGstin.substring(0, 2);
  const vendorStateName = GST_STATE_MAP[vendorState] || vendorState;
  const billToStateName = GST_STATE_MAP[billToState] || billToState;

  const sameState = vendorState === billToState;
  const expectedType = sameState ? 'CGST+SGST' : 'IGST';

  return {
    pass: true,
    expectedType,
    explanation: `Vendor state: ${vendorStateName} (${vendorState}), Bill-to state: ${billToStateName} (${billToState}) → ${sameState ? 'intra-state' : 'inter-state'} → expected ${expectedType}`,
  };
}

function checkGstinFormat(vendorGstin, billToGstin) {
  const issues = [];
  let pass = true;

  if (vendorGstin) {
    if (!GSTIN_REGEX.test(vendorGstin)) {
      pass = false;
      issues.push(`Vendor GSTIN "${vendorGstin}" does not match 15-char GSTIN pattern`);
    } else {
      const stateCode = vendorGstin.substring(0, 2);
      if (!GST_STATE_MAP[stateCode]) {
        issues.push(`Vendor GSTIN state code "${stateCode}" is not a recognized state`);
      }
    }
  }

  if (billToGstin) {
    if (!GSTIN_REGEX.test(billToGstin)) {
      pass = false;
      issues.push(`Bill-to GSTIN "${billToGstin}" does not match 15-char GSTIN pattern`);
    } else {
      const stateCode = billToGstin.substring(0, 2);
      if (!GST_STATE_MAP[stateCode]) {
        issues.push(`Bill-to GSTIN state code "${stateCode}" is not a recognized state`);
      }
    }
  }

  const explanation = issues.length > 0
    ? issues.join('; ')
    : `GSTIN format valid${vendorGstin ? ` (vendor: ${vendorGstin})` : ''}${billToGstin ? ` (bill-to: ${billToGstin})` : ''}`;

  return { pass, explanation };
}

function checkTaxRateConsistency(lineItems) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return { pass: true, explanation: 'No line items to validate GST rates' };
  }

  const invalidItems = [];
  for (let i = 0; i < lineItems.length; i++) {
    const rate = lineItems[i].gst_rate;
    if (rate != null && !VALID_GST_RATES.includes(Number(rate))) {
      invalidItems.push({ line: i + 1, rate, description: lineItems[i].description || `Line ${i + 1}` });
    }
  }

  if (invalidItems.length === 0) {
    const rates = [...new Set(lineItems.map(li => li.gst_rate).filter(r => r != null))];
    return { pass: true, explanation: `All line item GST rates are valid standard rates: ${rates.join(', ')}%` };
  }

  return {
    pass: false,
    explanation: `Non-standard GST rates found: ${invalidItems.map(i => `line ${i.line} ("${i.description}") has rate ${i.rate}%`).join('; ')}. Valid rates: ${VALID_GST_RATES.join(', ')}%`,
  };
}

function checkWithholding(totalAmount) {
  if (totalAmount == null || Number(totalAmount) <= 30000) {
    return {
      applicable: false,
      section: null,
      explanation: totalAmount == null
        ? 'Total amount missing — cannot assess TDS applicability'
        : `Total amount ${totalAmount} is ≤ 30,000 — TDS not applicable`,
    };
  }

  // For now, flag as applicable and suggest likely sections
  // Actual determination requires invoice category (goods vs services)
  return {
    applicable: true,
    section: '194C/194J',
    explanation: `Total amount ${totalAmount} exceeds 30,000 threshold — TDS likely applicable under section 194C (goods/contracts) or 194J (professional/technical services). Actual section depends on invoice category.`,
  };
}

// ── Main entry ────────────────────────────────────────

export async function processTaxValidation(invoiceId, extractedData) {
  const startTime = Date.now();

  try {
    const vendorGstin = extractedData.vendor_gstin || null;
    const billToGstin = extractedData.bill_to_gstin || null;
    const subtotal = extractedData.subtotal ?? null;
    const taxAmount = extractedData.tax_amount ?? null;
    const totalAmount = extractedData.total_amount ?? null;
    const lineItems = Array.isArray(extractedData.line_items) ? extractedData.line_items : [];

    // Run all checks
    const arithmeticResult = checkArithmetic(subtotal, taxAmount, totalAmount);
    const lineSumResult = checkLineSum(lineItems, subtotal);
    const gstTypeResult = checkGstType(vendorGstin, billToGstin);
    const gstinFormatResult = checkGstinFormat(vendorGstin, billToGstin);
    const taxRateResult = checkTaxRateConsistency(lineItems);
    const withholdingResult = checkWithholding(totalAmount);

    // Collect all checks into an array
    const allChecks = [
      { name: 'arithmetic', ...arithmeticResult },
      { name: 'line_sum', ...lineSumResult },
      { name: 'gst_type', pass: gstTypeResult.pass, ...gstTypeResult },
      { name: 'gstin_format', ...gstinFormatResult },
      { name: 'tax_rate_consistency', ...taxRateResult },
    ];

    // Compute score: 100 base, deduct per failure
    const failures = allChecks.filter(c => !c.pass);
    const deductionPerFailure = 20;
    const score = Math.max(0, 100 - (failures.length * deductionPerFailure));

    // Collect issues
    const issues = failures.map(f => ({
      check: f.name,
      explanation: f.explanation,
    }));

    // Build explanation
    const explanationParts = allChecks.map(c => `[${c.name.toUpperCase()} ${c.pass ? 'PASS' : 'FAIL'}] ${c.explanation}`);
    if (withholdingResult.applicable) {
      explanationParts.push(`[WITHHOLDING] ${withholdingResult.explanation}`);
    }
    explanationParts.push(`Tax validation score: ${score}/100`);
    const explanation = explanationParts.join('. ');

    // Persist tax validation record
    const taxValidationId = randomUUID();
    await query(
      `INSERT INTO ap_invoice_tax_validations
         (id, invoice_id, score, arithmetic_valid, line_sum_valid, gst_type_valid,
          expected_gst_type, registration_valid, tax_rates_valid,
          withholding_applicable, withholding_section, issues, explanation, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        taxValidationId, invoiceId, score,
        arithmeticResult.pass ? 1 : 0,
        lineSumResult.pass ? 1 : 0,
        gstTypeResult.pass ? 1 : 0,
        gstTypeResult.expectedType || null,
        gstinFormatResult.pass ? 1 : 0,
        taxRateResult.pass ? 1 : 0,
        withholdingResult.applicable ? 1 : 0,
        withholdingResult.section,
        JSON.stringify(issues),
        explanation,
      ]
    );

    // Log agent decision
    const processingTimeMs = Date.now() - startTime;
    const decision = score === 100 ? 'all_pass'
      : score >= 60 ? 'partial_pass'
      : 'fail';

    await query(
      `INSERT INTO ap_invoice_agent_decisions
         (id, invoice_id, agent_name, agent_version, decision, confidence, explanation,
          input_summary, output_summary, processing_time_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        randomUUID(), invoiceId, AGENT_NAME, AGENT_VERSION,
        decision,
        parseFloat((score / 100).toFixed(2)),
        explanation,
        JSON.stringify({ vendorGstin, billToGstin, subtotal, taxAmount, totalAmount, lineItemCount: lineItems.length }),
        JSON.stringify({ taxValidationId, score, failedChecks: failures.map(f => f.name), withholdingApplicable: withholdingResult.applicable }),
        processingTimeMs,
      ]
    );

    console.log(`[${AGENT_NAME}] invoice ${invoiceId}: ${decision} — score ${score}/100, ${failures.length} failure(s)`);

    return {
      taxValidationId,
      score,
      arithmeticValid: arithmeticResult.pass,
      gstTypeValid: gstTypeResult.pass,
      registrationValid: gstinFormatResult.pass,
      withholdingApplicable: withholdingResult.applicable,
      withholdingSection: withholdingResult.section,
      issues,
      explanation,
    };
  } catch (err) {
    const processingTimeMs = Date.now() - startTime;
    console.error(`[${AGENT_NAME}] invoice ${invoiceId}: error after ${processingTimeMs}ms —`, err.message);

    try {
      await query(
        `INSERT INTO ap_invoice_agent_decisions
           (id, invoice_id, agent_name, agent_version, decision, confidence, explanation,
            input_summary, output_summary, processing_time_ms, created_at)
         VALUES (?, ?, ?, ?, 'error', 0, ?, ?, NULL, ?, NOW())`,
        [
          randomUUID(), invoiceId, AGENT_NAME, AGENT_VERSION,
          `Tax validation failed: ${err.message}`,
          JSON.stringify({ vendorGstin: extractedData?.vendor_gstin }),
          processingTimeMs,
        ]
      );
    } catch (_) { /* swallow logging failure */ }

    throw err;
  }
}
