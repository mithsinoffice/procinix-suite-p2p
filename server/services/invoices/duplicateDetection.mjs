// Duplicate tiered-detection engine per ws1a-implementation-plan.md §2.2.
// Pure function — returns detection result, does not mutate DB.
// Caller writes duplicate_decision + duplicate_checked_at to invoices.

// Suffixes stripped during vendor name normalization (case-insensitive).
// Order matters: longer suffixes first to avoid partial strip
// (e.g. "Pvt Ltd" before "Pvt", "Corporation" before "Corp").
const VENDOR_SUFFIXES = [
  'private limited', 'pvt ltd', 'pvt limited',
  'corporation', 'limited', 'corp', 'inc', 'llp', 'pvt', 'ltd', 'co',
];

/**
 * Normalize a vendor name for fallback duplicate matching.
 * Strips whitespace, punctuation, case-folds, removes common suffixes.
 */
export function normalizeVendorName(name) {
  if (!name || typeof name !== 'string') return '';
  let normalized = name.toLowerCase().trim();
  // Remove punctuation (periods, commas, dashes, parentheses)
  normalized = normalized.replace(/[.,\-()]/g, ' ');
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  // Remove suffixes (longest first)
  for (const suffix of VENDOR_SUFFIXES) {
    if (normalized.endsWith(` ${suffix}`)) {
      normalized = normalized.slice(0, -(suffix.length + 1)).trim();
      break;
    }
    if (normalized === suffix) {
      normalized = '';
      break;
    }
  }
  return normalized.trim();
}

/**
 * Load invoice_duplicate_config for a tenant.
 * Throws if no config row exists (per Q5 — no hardcoded fallback).
 */
export async function loadDuplicateConfig(tenantId, db) {
  const rows = await db.query(
    'SELECT * FROM invoice_duplicate_config WHERE tenant_id = ?',
    [tenantId]
  );
  if (!rows || rows.length === 0) {
    throw new Error(`invoice_duplicate_config row missing for tenant ${tenantId}. Cannot fall back to hardcoded defaults (Q5 rule).`);
  }
  return rows[0];
}

/**
 * Compute period-overlap score between two service periods.
 * Returns points per §2.2: identical=40, contained=30, partial=15, none=0.
 */
function computePeriodOverlap(fromA, toA, fromB, toB, config) {
  if (!fromA || !toA || !fromB || !toB) return 0;

  const a0 = new Date(fromA).getTime();
  const a1 = new Date(toA).getTime();
  const b0 = new Date(fromB).getTime();
  const b1 = new Date(toB).getTime();

  if (isNaN(a0) || isNaN(a1) || isNaN(b0) || isNaN(b1)) return 0;

  // Identical
  if (a0 === b0 && a1 === b1) {
    return Number(config.period_overlap_identical_points ?? 40);
  }
  // One fully contained in the other
  if ((a0 >= b0 && a1 <= b1) || (b0 >= a0 && b1 <= a1)) {
    return Number(config.period_overlap_contained_points ?? 30);
  }
  // Partial overlap
  if (a0 <= b1 && b0 <= a1) {
    return Number(config.period_overlap_partial_points ?? 15);
  }
  return 0;
}

/**
 * Run 5-tier duplicate detection.
 *
 * @param {object} opts
 * @param {object} opts.invoice - The invoice being checked (must include:
 *   id, vendor_id, vendor_name, invoice_number, financial_year, invoice_date,
 *   total_amount, tenant_id, entity_id, source_invoice_id,
 *   service_period_from, service_period_to)
 * @param {string} opts.tenantId
 * @param {{ query: Function }} opts.db
 * @returns {Promise<{tier: string|null, decision: string, matches: object[], overrideRequired: boolean, vendorFallback: boolean}>}
 */
export async function detectDuplicates({ invoice, tenantId, db }) {
  const config = await loadDuplicateConfig(tenantId, db);

  const vendorId = invoice.vendor_id || null;
  const invoiceNumber = invoice.invoice_number || null;
  const financialYear = invoice.financial_year || null;
  const entityId = invoice.entity_id || null;
  const sourceInvoiceId = invoice.source_invoice_id || null;

  if (!invoiceNumber) {
    return { tier: null, decision: 'clear', matches: [], overrideRequired: false, vendorFallback: false };
  }

  // Build candidate query — all invoices with same invoice_number + tenant_id,
  // excluding self and source_invoice_id (resubmission exception).
  let candidateSql = 'SELECT id, vendor_id, vendor_name, invoice_number, financial_year, invoice_date, total_amount, entity_id, service_period_from, service_period_to FROM invoices WHERE tenant_id = ? AND invoice_number = ? AND id != ?';
  const candidateParams = [tenantId, invoiceNumber, invoice.id];

  if (sourceInvoiceId) {
    candidateSql += ' AND id != ?';
    candidateParams.push(sourceInvoiceId);
  }

  const candidates = await db.query(candidateSql, candidateParams) || [];

  // Determine vendor matching strategy
  let vendorFallback = false;
  let normalizedInvoiceVendor = '';
  if (!vendorId) {
    vendorFallback = true;
    normalizedInvoiceVendor = normalizeVendorName(invoice.vendor_name);
  }

  // Evaluate each candidate against tiers (highest severity first)
  let bestTier = null;
  let bestDecision = 'clear';
  let overrideRequired = false;
  const allMatches = [];

  const tierPriority = { tier_1_hard: 5, tier_2_probable: 4, tier_2b_cross_fy: 2, tier_3_cross_entity: 1, tier_4_fuzzy: 3 };

  for (const candidate of candidates) {
    // Vendor match check
    let vendorMatches = false;
    if (vendorId) {
      vendorMatches = candidate.vendor_id === vendorId;
    } else {
      const normalizedCandidate = normalizeVendorName(candidate.vendor_name);
      vendorMatches = normalizedInvoiceVendor !== '' && normalizedCandidate !== '' && normalizedInvoiceVendor === normalizedCandidate;
    }

    if (!vendorMatches) continue;

    const sameFY = financialYear && candidate.financial_year && financialYear === candidate.financial_year;
    const sameEntity = entityId && candidate.entity_id && entityId === candidate.entity_id;
    const sameDate = invoice.invoice_date && candidate.invoice_date &&
      String(invoice.invoice_date).substring(0, 10) === String(candidate.invoice_date).substring(0, 10);
    const sameAmount = invoice.total_amount != null && candidate.total_amount != null &&
      Number(invoice.total_amount) === Number(candidate.total_amount);

    let tier = null;
    let decision = null;

    // Tier 1: all fields match
    if (sameFY && sameEntity && sameDate && sameAmount) {
      tier = 'tier_1';
      decision = 'tier_1_hard';
    }
    // Tier 2: FY + entity match, date or amount differs
    else if (sameFY && sameEntity) {
      tier = 'tier_2';
      decision = 'tier_2_probable';
    }
    // Tier 2b: same entity, different FY (cross-FY reuse)
    else if (sameEntity && !sameFY && candidate.financial_year) {
      tier = 'tier_2b';
      decision = 'tier_2b_cross_fy';
    }
    // Tier 3: same tenant (already filtered), different entity
    else if (!sameEntity) {
      tier = 'tier_3';
      decision = 'tier_3_cross_entity';
    }

    if (decision) {
      allMatches.push({ candidateId: candidate.id, tier, decision, vendorFallback });

      if ((tierPriority[decision] ?? 0) > (tierPriority[bestDecision] ?? 0)) {
        bestTier = tier;
        bestDecision = decision;
      }
    }
  }

  // Tier 4 fuzzy — runs if no hard/probable match found and config has threshold
  if (bestDecision === 'clear' || bestDecision === 'tier_2b_cross_fy' || bestDecision === 'tier_3_cross_entity') {
    const fuzzyResult = await runFuzzyCheck(invoice, tenantId, config, db, sourceInvoiceId);
    if (fuzzyResult) {
      allMatches.push(...fuzzyResult.matches);
      if ((tierPriority.tier_4_fuzzy ?? 0) > (tierPriority[bestDecision] ?? 0)) {
        bestTier = 'tier_4';
        bestDecision = 'tier_4_fuzzy';
      }
    }
  }

  // Determine override requirement
  if (bestDecision === 'tier_1_hard' || bestDecision === 'tier_2_probable' || bestDecision === 'tier_4_fuzzy') {
    overrideRequired = true;
  }
  // Vendor fallback → always require override regardless of tier
  if (vendorFallback && bestDecision !== 'clear' && bestDecision !== 'tier_2b_cross_fy') {
    overrideRequired = true;
  }

  return { tier: bestTier, decision: bestDecision, matches: allMatches, overrideRequired, vendorFallback };
}

/**
 * Tier 4 fuzzy matching using invoice_duplicate_config values.
 * Uses prefix match + amount tolerance + date window + period-overlap.
 */
async function runFuzzyCheck(invoice, tenantId, config, db, sourceInvoiceId) {
  const threshold = Number(config.fuzzy_match_threshold);
  const prefixLength = Number(config.fuzzy_prefix_length);
  const amountTolerancePct = Number(config.amount_tolerance_pct);
  const dateWindowDays = Number(config.date_window_days);

  if (!threshold || !prefixLength) return null;

  const invoiceNumber = invoice.invoice_number || '';
  const prefix = invoiceNumber.substring(0, prefixLength);
  if (!prefix) return null;

  // Find candidates by prefix (different invoice_number, same tenant)
  let sql = 'SELECT id, invoice_number, vendor_id, vendor_name, invoice_date, total_amount, service_period_from, service_period_to FROM invoices WHERE tenant_id = ? AND LEFT(invoice_number, ?) = ? AND invoice_number != ? AND id != ?';
  const params = [tenantId, prefixLength, prefix, invoiceNumber, invoice.id];
  if (sourceInvoiceId) {
    sql += ' AND id != ?';
    params.push(sourceInvoiceId);
  }
  sql += ' LIMIT 50';

  const fuzzyCandidates = await db.query(sql, params);
  if (!fuzzyCandidates || fuzzyCandidates.length === 0) return null;

  const matches = [];

  for (const candidate of fuzzyCandidates) {
    let score = 0;

    // Vendor match (required for fuzzy)
    const vendorId = invoice.vendor_id || null;
    let vendorMatches = false;
    if (vendorId && candidate.vendor_id) {
      vendorMatches = vendorId === candidate.vendor_id;
    } else {
      vendorMatches = normalizeVendorName(invoice.vendor_name) === normalizeVendorName(candidate.vendor_name);
    }
    if (!vendorMatches) continue;

    // Prefix match (always true since query filtered by prefix)
    score += 20;

    // Amount tolerance
    if (invoice.total_amount != null && candidate.total_amount != null) {
      const pctDiff = Math.abs(Number(invoice.total_amount) - Number(candidate.total_amount)) / Math.abs(Number(candidate.total_amount) || 1) * 100;
      if (pctDiff <= amountTolerancePct) {
        score += 25;
      }
    }

    // Date window
    if (invoice.invoice_date && candidate.invoice_date) {
      const daysDiff = Math.abs(
        (new Date(invoice.invoice_date).getTime() - new Date(candidate.invoice_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= dateWindowDays) {
        score += 15;
      }
    }

    // Period overlap
    score += computePeriodOverlap(
      invoice.service_period_from, invoice.service_period_to,
      candidate.service_period_from, candidate.service_period_to,
      config
    );

    if (score >= threshold) {
      matches.push({
        candidateId: candidate.id,
        tier: 'tier_4',
        decision: 'tier_4_fuzzy',
        score,
        vendorFallback: !vendorId,
      });
    }
  }

  return matches.length > 0 ? { matches } : null;
}
