// TDS deduction engine — 8-step per ws1a-implementation-plan.md §2.8.
// Pure computation: returns the TDS result for a line item.
// Caller writes tds_* columns and updates tds_ytd_aggregates on Processed.

const TEN_CRORE = 100000000; // ₹10,00,00,000

/**
 * Derive the Indian financial year string for a date.
 */
function deriveFinancialYear(dateStr) {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  if (month >= 4) {
    return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
  }
  return `${year - 1}-${String(year % 100).padStart(2, '0')}`;
}

/**
 * Compute TDS for a single invoice line item.
 *
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {string} opts.vendorId
 * @param {string} opts.entityId
 * @param {string} opts.invoiceDate - ISO date string
 * @param {object} opts.lineItem - {taxable_amount, cgst_amount, sgst_amount, igst_amount, utgst_amount, cess_amount}
 * @param {{ query: Function }} opts.db
 * @param {Function} [opts.warn] - Optional logger for warnings (defaults to console.warn)
 * @returns {Promise<{tdsApplicable: boolean, tdsSection: string|null, tdsRate: number, tdsBaseAmount: number, tdsAmount: number, tdsThresholdExempted: boolean, tdsCertificateRef: string|null, exceptionReason?: string, ytdDelta?: {baseAmount: number, tdsAmount: number}}>}
 */
export async function computeTdsForLine({ tenantId, vendorId, entityId, invoiceDate, lineItem, db, warn = console.warn }) {
  const noTds = {
    tdsApplicable: false, tdsSection: null, tdsRate: 0,
    tdsBaseAmount: 0, tdsAmount: 0, tdsThresholdExempted: false,
    tdsCertificateRef: null,
  };

  // ── Step 2: Section resolution ─────────────────────
  // Entity override → vendor default → (section must be resolved externally;
  // if neither provides a section, TDS is not applicable)

  let resolvedSection = null;

  // 2a. Entity-level override
  if (entityId && vendorId) {
    const overrideRows = await db.query(
      'SELECT default_tds_section_override FROM vendor_entity_mappings WHERE vendor_id = ? AND entity_id = ?',
      [vendorId, entityId]
    );
    if (overrideRows?.length > 0 && overrideRows[0].default_tds_section_override) {
      resolvedSection = overrideRows[0].default_tds_section_override;
    }
  }

  // 2b. Vendor-level default (tds_sections JSON array — pick first)
  if (!resolvedSection && vendorId) {
    const complianceRows = await db.query(
      'SELECT tds_sections FROM vendor_pan_compliance WHERE vendor_id = ?',
      [vendorId]
    );
    if (complianceRows?.length > 0 && complianceRows[0].tds_sections) {
      let sections = complianceRows[0].tds_sections;
      if (typeof sections === 'string') {
        try { sections = JSON.parse(sections); } catch { sections = []; }
      }
      if (Array.isArray(sections) && sections.length > 0) {
        resolvedSection = sections[0];
      }
    }
  }

  if (!resolvedSection) {
    return noTds;
  }

  // ── 194Q buyer turnover gate ───────────────────────
  if (resolvedSection === '194Q') {
    const turnoverRows = await db.query(
      'SELECT prior_fy_turnover FROM tenants WHERE id = ?',
      [tenantId]
    );
    const turnover = turnoverRows?.[0]?.prior_fy_turnover;
    if (turnover == null || Number(turnover) <= TEN_CRORE) {
      return { ...noTds, tdsSection: '194Q' };
    }
  }

  // ── Step 1: Look up active tds_section_config ──────
  const configRows = await db.query(
    `SELECT * FROM tds_section_config
     WHERE tenant_id = ? AND tds_section = ? AND is_active = 1
       AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
     ORDER BY effective_from DESC LIMIT 1`,
    [tenantId, resolvedSection, invoiceDate, invoiceDate]
  );

  if (!configRows || configRows.length === 0) {
    return {
      ...noTds,
      tdsApplicable: true,
      tdsSection: resolvedSection,
      exceptionReason: 'tds_section_config_missing',
    };
  }

  const config = configRows[0];
  let rate = Number(config.default_rate);

  // ── Step 3 & 4: 206AB / 206AA checks ──────────────
  const panRows = await db.query(
    'SELECT pan, section_206ab, lower_tds_section, lower_tds_cert_number, lower_tds_cert_valid_from, lower_tds_cert_valid_to, lower_tds_cert_rate FROM vendor_pan_compliance WHERE vendor_id = ?',
    [vendorId]
  );
  const compliance = panRows?.[0] || {};

  let rate206ab = null;
  let rate206aa = null;

  // Step 3: 206AB
  const s206ab = compliance.section_206ab;
  if (s206ab === 'specified_person' || s206ab === 'non_filer') {
    rate206ab = Math.max(rate * 2, 5);
  }

  // Step 4: 206AA (PAN missing)
  const pan = compliance.pan;
  if (!pan || pan.trim() === '') {
    rate206aa = Number(config.pan_not_available_rate ?? 20);
  }

  // Apply whichever is higher (stacking rule)
  if (rate206ab != null && rate206aa != null) {
    rate = Math.max(rate206ab, rate206aa);
  } else if (rate206ab != null) {
    rate = rate206ab;
  } else if (rate206aa != null) {
    rate = rate206aa;
  }

  // ── Step 6: Lower TDS certificate check ────────────
  let tdsCertificateRef = null;
  const lowerSection = compliance.lower_tds_section;

  if (lowerSection && lowerSection !== 'not_applicable') {
    // Special case: section_206aa is semantically mismatched
    if (lowerSection === 'section_206aa') {
      warn('[TDS Engine] lower_tds_section=section_206aa is semantically mismatched — passing through to not_applicable handling. Enum cleanup logged to WS-1b.');
    } else if (lowerSection === resolvedSection || lowerSection === `section_${resolvedSection}`) {
      const certFrom = compliance.lower_tds_cert_valid_from;
      const certTo = compliance.lower_tds_cert_valid_to;
      const certRate = compliance.lower_tds_cert_rate;
      const certNumber = compliance.lower_tds_cert_number;

      if (!certFrom || !certTo || certRate == null || !certNumber) {
        return {
          tdsApplicable: true, tdsSection: resolvedSection, tdsRate: rate,
          tdsBaseAmount: 0, tdsAmount: 0, tdsThresholdExempted: false,
          tdsCertificateRef: null,
          exceptionReason: 'incomplete_lower_tds_certificate',
        };
      }

      const invDate = new Date(invoiceDate);
      const validFrom = new Date(certFrom);
      const validTo = new Date(certTo);
      if (invDate >= validFrom && invDate <= validTo) {
        rate = Number(certRate);
        tdsCertificateRef = certNumber;
      }
    }
  }

  // ── Step 5: Compute tdsBaseAmount ──────────────────
  const appliesTo = config.applies_to_base || 'excl_gst';
  let tdsBaseAmount = Number(lineItem.taxable_amount) || 0;

  if (appliesTo === 'incl_gst') {
    tdsBaseAmount += Number(lineItem.cgst_amount || 0)
      + Number(lineItem.sgst_amount || 0)
      + Number(lineItem.igst_amount || 0)
      + Number(lineItem.utgst_amount || 0)
      + Number(lineItem.cess_amount || 0);
  }
  // 'excl_gst' and 'service_charge_only' both use taxable_amount as-is

  // ── Step 7: Threshold + catch-up logic ─────────────
  const financialYear = deriveFinancialYear(invoiceDate);
  const behavior = config.threshold_crossing_behavior || 'catch_up';
  const annualThreshold = config.annual_aggregate_threshold != null ? Number(config.annual_aggregate_threshold) : null;
  const singleThreshold = config.single_invoice_threshold != null ? Number(config.single_invoice_threshold) : null;

  // Read YTD aggregate
  const ytdRows = await db.query(
    'SELECT ytd_base_amount, ytd_tds_amount FROM tds_ytd_aggregates WHERE tenant_id = ? AND vendor_id = ? AND entity_id = ? AND financial_year = ? AND tds_section = ?',
    [tenantId, vendorId, entityId, financialYear, resolvedSection]
  );
  const ytdBase = Number(ytdRows?.[0]?.ytd_base_amount ?? 0);
  const ytdTds = Number(ytdRows?.[0]?.ytd_tds_amount ?? 0);

  const newCumulativeBase = ytdBase + tdsBaseAmount;

  // Single-invoice threshold: triggers regardless of aggregate
  const singleTriggered = singleThreshold != null && tdsBaseAmount >= singleThreshold;

  let tdsAmount = 0;
  let tdsThresholdExempted = false;

  if (annualThreshold != null && !singleTriggered) {
    if (behavior === 'catch_up') {
      if (newCumulativeBase > annualThreshold) {
        if (ytdBase <= annualThreshold) {
          // Crossing threshold this invoice: catch-up on full cumulative
          tdsAmount = Math.round(newCumulativeBase * rate / 100 * 100) / 100 - ytdTds;
        } else {
          // Already above threshold: normal deduction on this line
          tdsAmount = Math.round(tdsBaseAmount * rate / 100 * 100) / 100;
        }
      } else {
        // Below threshold
        tdsThresholdExempted = true;
      }
    } else if (behavior === 'forward_only') {
      if (newCumulativeBase > annualThreshold) {
        tdsAmount = Math.round(tdsBaseAmount * rate / 100 * 100) / 100;
      } else {
        tdsThresholdExempted = true;
      }
    } else {
      // no_threshold — always apply
      tdsAmount = Math.round(tdsBaseAmount * rate / 100 * 100) / 100;
    }
  } else {
    // No annual threshold or single-invoice triggered
    tdsAmount = Math.round(tdsBaseAmount * rate / 100 * 100) / 100;
  }

  return {
    tdsApplicable: true,
    tdsSection: resolvedSection,
    tdsRate: rate,
    tdsBaseAmount,
    tdsAmount,
    tdsThresholdExempted,
    tdsCertificateRef,
    ytdDelta: { baseAmount: tdsBaseAmount, tdsAmount },
  };
}
