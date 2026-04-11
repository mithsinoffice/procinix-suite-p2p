import { randomUUID } from 'node:crypto';
import { query, withTransaction, connExecute } from '../../mysql.mjs';

const AGENT_NAME = 'WorkflowRoutingAgent';
const AGENT_VERSION = '1.0.0';

// ── Score extraction helpers ──────────────────────────

function extractScores(agentResults) {
  const { extraction, vendorMatch, duplicateCheck, matchResult, taxValidation, codingSuggestions } = agentResults;

  return {
    extraction_score_header: extraction?.headerScore ?? 0,
    extraction_score_lines: extraction?.linesScore ?? 0,
    vendor_match_score: vendorMatch?.matchConfidence ?? 0,
    duplicate_risk_score: duplicateCheck?.riskScore ?? 0,
    match_confidence: matchResult?.matchConfidence ?? 0,
    match_type: matchResult?.matchType ?? 'none',
    tax_validation_score: taxValidation?.score ?? 0,
    accounting_certainty_score: codingSuggestions?.overallCertainty ?? 0,

    // Hard-control flags
    is_duplicate: duplicateCheck?.isDuplicate ?? false,
    vendor_unresolved: vendorMatch?.isNewVendor ?? true,
    vendor_suspicious: vendorMatch?.isSuspicious ?? false,
    tax_issues: (taxValidation?.issues?.length ?? 0) > 0,
    arithmetic_valid: taxValidation?.arithmeticValid ?? false,
    match_found: matchResult?.matchType !== 'none' && matchResult?.matchType != null,
  };
}

// ── Lane determination ────────────────────────────────

function determineLane(scores) {
  const reasons = [];

  // ── RED checks (any single hard failure) ──
  if (scores.is_duplicate) {
    reasons.push('Duplicate detected (risk score > 70)');
  }
  if (scores.duplicate_risk_score > 10) {
    reasons.push(`Duplicate risk score ${scores.duplicate_risk_score} exceeds threshold of 10`);
  }
  if (scores.vendor_unresolved) {
    reasons.push('Vendor unresolved — not found in master data');
  }
  if (scores.tax_validation_score < 100 && scores.tax_issues) {
    reasons.push(`Tax validation failed (score ${scores.tax_validation_score}/100)`);
  }
  if (!scores.arithmetic_valid) {
    reasons.push('Arithmetic validation failed');
  }

  if (reasons.length > 0) {
    return { lane: 'RED', reasons };
  }

  // ── GREEN checks (ALL must pass) ──
  const greenChecks = [];
  let allGreen = true;

  if (scores.extraction_score_header >= 0.985) {
    greenChecks.push(`Header score ${scores.extraction_score_header} >= 0.985`);
  } else {
    allGreen = false;
  }

  if (scores.extraction_score_lines >= 0.97) {
    greenChecks.push(`Lines score ${scores.extraction_score_lines} >= 0.97`);
  } else {
    allGreen = false;
  }

  if (scores.vendor_match_score >= 0.99) {
    greenChecks.push(`Vendor match ${scores.vendor_match_score} >= 0.99`);
  } else {
    allGreen = false;
  }

  if (scores.duplicate_risk_score <= 1) {
    greenChecks.push(`Duplicate risk ${scores.duplicate_risk_score} <= 1`);
  } else {
    allGreen = false;
  }

  if (scores.tax_validation_score === 100) {
    greenChecks.push('Tax validation 100/100');
  } else {
    allGreen = false;
  }

  if (scores.accounting_certainty_score >= 0.97) {
    greenChecks.push(`Accounting certainty ${scores.accounting_certainty_score} >= 0.97`);
  } else {
    allGreen = false;
  }

  if (scores.match_found) {
    greenChecks.push(`Match found (${scores.match_type})`);
  } else {
    allGreen = false;
  }

  if (allGreen) {
    return { lane: 'GREEN', reasons: greenChecks };
  }

  // ── AMBER checks ──
  const amberReasons = [];

  if (scores.extraction_score_header >= 0.93 && scores.extraction_score_header < 0.985) {
    amberReasons.push(`Header score ${scores.extraction_score_header} in amber range (0.93–0.9849)`);
  }
  if (scores.extraction_score_lines >= 0.90 && scores.extraction_score_lines < 0.97) {
    amberReasons.push(`Lines score ${scores.extraction_score_lines} in amber range (0.90–0.9699)`);
  }
  if (scores.vendor_match_score >= 0.95 && scores.vendor_match_score < 0.99) {
    amberReasons.push(`Vendor match ${scores.vendor_match_score} in amber range (0.95–0.9899)`);
  }
  if (scores.accounting_certainty_score >= 0.90 && scores.accounting_certainty_score < 0.97) {
    amberReasons.push(`Accounting certainty ${scores.accounting_certainty_score} in amber range (0.90–0.9699)`);
  }

  if (amberReasons.length > 0) {
    return { lane: 'AMBER', reasons: amberReasons };
  }

  // Default to AMBER if not clearly GREEN and not RED
  return { lane: 'AMBER', reasons: ['Does not meet GREEN thresholds but no hard control failures detected'] };
}

// ── Posting readiness (weighted average) ──────────────

function computePostingReadiness(scores) {
  const weights = {
    extraction_score_header: 0.15,
    extraction_score_lines: 0.10,
    vendor_match_score: 0.20,
    duplicate_safe: 0.15,
    tax_validation: 0.20,
    accounting_certainty_score: 0.10,
    match_confidence: 0.10,
  };

  const duplicateSafe = Math.max(0, (100 - scores.duplicate_risk_score) / 100);
  const taxNormalized = scores.tax_validation_score / 100;

  const weighted =
    (scores.extraction_score_header * weights.extraction_score_header) +
    (scores.extraction_score_lines * weights.extraction_score_lines) +
    (scores.vendor_match_score * weights.vendor_match_score) +
    (duplicateSafe * weights.duplicate_safe) +
    (taxNormalized * weights.tax_validation) +
    (scores.accounting_certainty_score * weights.accounting_certainty_score) +
    (scores.match_confidence * weights.match_confidence);

  return parseFloat(weighted.toFixed(3));
}

// ── Review task type ──────────────────────────────────

function determineReviewType(lane, scores) {
  if (lane === 'GREEN') return null;

  if (scores.vendor_unresolved) return 'vendor_setup';
  if (scores.is_duplicate) return 'duplicate_review';
  if (scores.tax_issues) return 'tax_review';
  if (!scores.match_found) return 'po_match_review';
  if (scores.accounting_certainty_score < 0.90) return 'coding_review';

  return lane === 'RED' ? 'exception_review' : 'general_review';
}

// ── Main entry ────────────────────────────────────────

export async function processRouting(invoiceId, agentResults) {
  const startTime = Date.now();

  try {
    // Extract all scores
    const scores = extractScores(agentResults);

    // Determine lane
    const { lane, reasons } = determineLane(scores);
    const laneReason = reasons.join('; ');

    // Compute posting readiness
    const postingReadiness = computePostingReadiness(scores);

    // Determine review task type
    const reviewType = determineReviewType(lane, scores);

    // Build explanation
    const explanationParts = [
      `Lane: ${lane}`,
      `Reason(s): ${laneReason}`,
      `Posting readiness: ${(postingReadiness * 100).toFixed(1)}%`,
      `Scores — header: ${scores.extraction_score_header}, lines: ${scores.extraction_score_lines}, ` +
      `vendor: ${scores.vendor_match_score}, duplicate_risk: ${scores.duplicate_risk_score}, ` +
      `tax: ${scores.tax_validation_score}/100, accounting: ${scores.accounting_certainty_score}, ` +
      `match: ${scores.match_confidence} (${scores.match_type})`,
    ];
    if (reviewType) {
      explanationParts.push(`Review type: ${reviewType}`);
    }
    const explanation = explanationParts.join('. ');

    // Determine processing status based on lane
    const processingStatus = lane === 'GREEN' ? 'auto_posting'
      : lane === 'AMBER' ? 'pending_review'
      : 'exception';

    // Persist everything in a transaction
    const routeId = randomUUID();
    let assignedTo = null;

    await withTransaction(async (conn) => {
      // 1. Store workflow route
      await connExecute(conn,
        `INSERT INTO ap_invoice_workflow_routes
           (id, invoice_id, lane, lane_reason, posting_readiness_score,
            confidence_scores, review_type, explanation, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          routeId, invoiceId, lane, laneReason, postingReadiness,
          JSON.stringify(scores), reviewType, explanation,
        ]
      );

      // 2. Update invoices table
      await connExecute(conn,
        `UPDATE invoices
         SET lane = ?, posting_readiness_score = ?, processing_status = ?, updated_at = NOW()
         WHERE id = ?`,
        [lane, postingReadiness, processingStatus, invoiceId]
      );

      // 3. Lane-specific actions
      if (lane === 'GREEN') {
        await connExecute(conn,
          `INSERT INTO ap_invoice_posting_queue
             (id, invoice_id, auto_post_flag, posting_readiness_score, created_at)
           VALUES (?, ?, 1, ?, NOW())`,
          [randomUUID(), invoiceId, postingReadiness]
        );
      } else if (lane === 'AMBER') {
        await connExecute(conn,
          `INSERT INTO ap_invoice_review_tasks
             (id, invoice_id, review_type, lane, priority, status, created_at)
           VALUES (?, ?, ?, 'AMBER', 'medium', 'open', NOW())`,
          [randomUUID(), invoiceId, reviewType || 'general_review']
        );
      } else {
        // RED
        await connExecute(conn,
          `INSERT INTO ap_invoice_exception_cases
             (id, invoice_id, exception_type, lane, priority, status, reason, created_at)
           VALUES (?, ?, ?, 'RED', 'high', 'open', ?, NOW())`,
          [randomUUID(), invoiceId, reviewType || 'exception_review', laneReason]
        );
      }
    });

    // Log agent decision
    const processingTimeMs = Date.now() - startTime;

    await query(
      `INSERT INTO ap_invoice_agent_decisions
         (id, invoice_id, agent_name, agent_version, decision, confidence, explanation,
          input_summary, output_summary, processing_time_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        randomUUID(), invoiceId, AGENT_NAME, AGENT_VERSION,
        `routed_${lane.toLowerCase()}`,
        postingReadiness,
        explanation,
        JSON.stringify({
          extraction_score_header: scores.extraction_score_header,
          extraction_score_lines: scores.extraction_score_lines,
          vendor_match_score: scores.vendor_match_score,
          duplicate_risk_score: scores.duplicate_risk_score,
          tax_validation_score: scores.tax_validation_score,
          accounting_certainty_score: scores.accounting_certainty_score,
          match_confidence: scores.match_confidence,
        }),
        JSON.stringify({ routeId, lane, postingReadiness, reviewType, processingStatus }),
        processingTimeMs,
      ]
    );

    console.log(`[${AGENT_NAME}] invoice ${invoiceId}: routed ${lane} — readiness ${(postingReadiness * 100).toFixed(1)}%, ${reviewType || 'auto-post'}`);

    return {
      routeId,
      lane,
      laneReason,
      confidenceScores: scores,
      postingReadiness,
      assignedTo,
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
          `Routing failed: ${err.message}`,
          JSON.stringify({ invoiceId }),
          processingTimeMs,
        ]
      );
    } catch (_) { /* swallow logging failure */ }

    throw err;
  }
}
