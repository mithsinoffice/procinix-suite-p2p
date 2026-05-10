import { query } from '../../mysql.mjs';

const CONFIDENCE_THRESHOLD = 0.95; // CHECK 1 gate
const CFO_THRESHOLD = 1_000_000; // ₹10 lakh

/**
 * Validate GSTIN format: 2-digit state code + 10-char PAN + 1 + Z + 2 chars
 * Pattern: \d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}
 */
function isValidGstin(gstin) {
  if (!gstin) return false;
  return /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.trim().toUpperCase());
}

/**
 * Evaluate whether an invoice qualifies for touchless (straight-through) processing.
 *
 * Runs 10 sequential checks. Stops at first failure for hold/exception decisions;
 * collects all workbench reasons before returning.
 *
 * @param {string}  invoiceId      DB UUID of the newly-inserted invoice
 * @param {object}  extractedData  Parsed OCR output from the agent pipeline
 * @param {string}  tenantId       Tenant scoping for DB queries
 * @returns {Promise<TouchlessResult>}
 */
export async function evaluateTouchless(invoiceId, extractedData, tenantId) {
  const reasons = [];

  // ─── CHECK 1: OCR confidence ────────────────────────────────────
  const overallConfidence =
    extractedData.ocr_overall_confidence ?? extractedData.confidence_score ?? 0;
  const confidence = overallConfidence > 1 ? overallConfidence / 100 : overallConfidence;

  if (confidence < CONFIDENCE_THRESHOLD) {
    reasons.push(
      `OCR confidence below ${CONFIDENCE_THRESHOLD * 100}% (actual: ${Math.round(confidence * 100)}%)`
    );
    return buildResult('workbench', reasons, 'ap_team', 'medium', confidence);
  }

  // ─── CHECK 2: Vendor exists in master ───────────────────────────
  let vendorRow = null;
  if (extractedData.vendor_gstin) {
    const vendorRows = await query(
      `SELECT v.id, v.vendor_legal_name, vpc.msme_category, vpc.tds_sections
       FROM erp_master_vendors v
       LEFT JOIN vendor_pan_compliance vpc ON vpc.vendor_id = v.id
       WHERE v.vendor_gstin = ? AND (v.tenant_id = ? OR v.tenant_id IS NULL)
       LIMIT 1`,
      [extractedData.vendor_gstin.trim().toUpperCase(), tenantId]
    );
    vendorRow = vendorRows?.[0] ?? null;
  }

  if (!vendorRow && extractedData.vendor_name) {
    const vendorRows = await query(
      `SELECT v.id, v.vendor_legal_name, vpc.msme_category, vpc.tds_sections
       FROM erp_master_vendors v
       LEFT JOIN vendor_pan_compliance vpc ON vpc.vendor_id = v.id
       WHERE (v.vendor_legal_name = ? OR v.vendor_trade_name = ?)
         AND (v.tenant_id = ? OR v.tenant_id IS NULL)
       LIMIT 1`,
      [extractedData.vendor_name, extractedData.vendor_name, tenantId]
    );
    vendorRow = vendorRows?.[0] ?? null;
  }

  if (!vendorRow) {
    reasons.push(`Vendor not found in master — GSTIN: ${extractedData.vendor_gstin || '(none)'}`);
    return buildResult('workbench', reasons, 'ap_team', 'medium', confidence);
  }

  // ─── CHECK 3: GSTIN format ──────────────────────────────────────
  if (extractedData.vendor_gstin && !isValidGstin(extractedData.vendor_gstin)) {
    reasons.push(`Invalid GSTIN format: ${extractedData.vendor_gstin}`);
    return buildResult('exception', reasons, 'ap_team', 'high', confidence);
  }

  // ─── CHECK 4: Duplicate invoice ─────────────────────────────────
  if (extractedData.vendor_gstin && extractedData.invoice_number) {
    const dupRows = await query(
      `SELECT id FROM invoices
       WHERE vendor_gstin = ?
         AND invoice_number = ?
         AND id <> ?
       LIMIT 1`,
      [
        extractedData.vendor_gstin.trim().toUpperCase(),
        extractedData.invoice_number.trim(),
        invoiceId,
      ]
    );
    if (dupRows?.length > 0) {
      reasons.push(`Duplicate invoice detected — existing ID: ${dupRows[0].id}`);
      return buildResult('hold', reasons, 'ap_team', 'critical', confidence);
    }
  }

  // ─── CHECK 5: PO matching ────────────────────────────────────────
  if (extractedData.po_number) {
    const poRows = await query(
      `SELECT id, total_amount FROM purchase_orders
       WHERE po_number = ?
         AND (tenant_id = ? OR tenant_id IS NULL)
       LIMIT 1`,
      [extractedData.po_number.trim(), tenantId]
    );
    if (!poRows?.length) {
      reasons.push(`PO number not found: ${extractedData.po_number}`);
      return buildResult('workbench', reasons, 'ap_team', 'medium', confidence);
    }
    const poAmount = Number(poRows[0].total_amount);
    const invoiceAmount = Number(extractedData.total_amount ?? 0);
    if (invoiceAmount > poAmount * 1.02) {
      reasons.push(
        `Invoice amount ₹${invoiceAmount.toLocaleString('en-IN')} exceeds PO by >2% (PO: ₹${poAmount.toLocaleString('en-IN')})`
      );
      return buildResult('exception', reasons, 'finance', 'high', confidence);
    }
  }

  // ─── CHECK 6: MSME 45-day rule ──────────────────────────────────
  if (vendorRow.msme_category) {
    const invoiceDate = extractedData.invoice_date ? new Date(extractedData.invoice_date) : null;
    const dueDate = extractedData.due_date ? new Date(extractedData.due_date) : null;
    if (invoiceDate && dueDate) {
      const maxDueDate = new Date(invoiceDate);
      maxDueDate.setDate(maxDueDate.getDate() + 45);
      if (dueDate > maxDueDate) {
        reasons.push(
          `MSME vendor (${vendorRow.msme_category}): due date ${dueDate.toISOString().slice(0, 10)} exceeds 45-day rule (max: ${maxDueDate.toISOString().slice(0, 10)})`
        );
        return buildResult('exception', reasons, 'finance', 'high', confidence);
      }
    }
  }

  // ─── CHECK 7: CFO threshold (>₹10L) ────────────────────────────
  const totalAmount = Number(extractedData.total_amount ?? 0);
  if (totalAmount > CFO_THRESHOLD) {
    reasons.push(
      `Invoice amount ₹${totalAmount.toLocaleString('en-IN')} exceeds ₹10L — CFO approval required`
    );
    return buildResult('exception', reasons, 'cfo', 'high', confidence);
  }

  // ─── CHECK 8: TDS threshold ──────────────────────────────────────
  if (vendorRow.id && vendorRow.tds_sections) {
    try {
      const sections =
        typeof vendorRow.tds_sections === 'string'
          ? JSON.parse(vendorRow.tds_sections)
          : vendorRow.tds_sections;
      const primarySection = Array.isArray(sections) ? sections[0] : sections?.default;
      if (primarySection) {
        const fy = getFiscalYear();
        const ytdRows = await query(
          `SELECT COALESCE(ytd_base_amount, 0) AS ytd_base
           FROM tds_ytd_aggregates
           WHERE vendor_id = ? AND financial_year = ? AND tds_section = ?
             AND (tenant_id = ? OR tenant_id IS NULL)
           LIMIT 1`,
          [vendorRow.id, fy, primarySection, tenantId]
        );
        const configRows = await query(
          `SELECT threshold_amount FROM tds_section_config
           WHERE tds_section = ? AND is_active = 1
             AND (tenant_id = ? OR tenant_id IS NULL)
           ORDER BY effective_from DESC LIMIT 1`,
          [primarySection, tenantId]
        );
        if (configRows?.length) {
          const threshold = Number(configRows[0].threshold_amount ?? 0);
          const ytdBase = Number(ytdRows?.[0]?.ytd_base ?? 0);
          if (threshold > 0 && ytdBase + totalAmount > threshold) {
            reasons.push(
              `TDS threshold exceeded for section ${primarySection} (YTD: ₹${ytdBase.toLocaleString('en-IN')}, threshold: ₹${threshold.toLocaleString('en-IN')})`
            );
            return buildResult('exception', reasons, 'tax_team', 'medium', confidence);
          }
        }
      }
    } catch {
      // TDS table may be empty; skip check rather than block touchless
    }
  }

  // ─── CHECK 9: First-time vendor ─────────────────────────────────
  const approvedCount = await query(
    `SELECT COUNT(*) AS n FROM invoices
     WHERE vendor_gstin = ?
       AND lifecycle_state IN ('Under Verification', 'Processed', 'Queued for Payment')
       AND id <> ?`,
    [extractedData.vendor_gstin || '', invoiceId]
  );
  if (Number(approvedCount?.[0]?.n ?? 0) === 0) {
    reasons.push('First invoice from this vendor — additional verification needed');
    return buildResult('workbench', reasons, 'ap_team', 'medium', confidence);
  }

  // ─── CHECK 10: All passed → TOUCHLESS ───────────────────────────
  return {
    decision: 'touchless',
    reasons: ['All touchless checks passed'],
    autoApprove: true,
    lifecycleState: 'Under Verification',
    assignTo: 'auto',
    priority: 'low',
    confidence,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function buildResult(decision, reasons, assignTo, priority, confidence) {
  const lcMap = {
    touchless: 'Under Verification',
    workbench: 'Ingested',
    exception: 'Exception Hold',
    hold: 'Exception Hold',
  };
  return {
    decision,
    reasons,
    autoApprove: false,
    lifecycleState: lcMap[decision] ?? 'Ingested',
    assignTo,
    priority,
    confidence,
  };
}

function getFiscalYear() {
  const now = new Date();
  const year = now.getFullYear();
  // Indian fiscal year: Apr–Mar
  return now.getMonth() >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}
