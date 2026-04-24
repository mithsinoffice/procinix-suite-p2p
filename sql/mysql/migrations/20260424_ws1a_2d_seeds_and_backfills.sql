-- =============================================================================
-- WS-1a  CHUNK 2d  —  Seeds + Backfills
-- =============================================================================
-- Runs AFTER chunks 2a (baseline CREATEs), 2b (ALTERs), 2c (new tables).
-- Assumes at least one ACTIVE row exists in `tenants` (seeded by the
-- 20260421_multi_tenant_entity.sql migration).
--
-- Multi-tenant seeding: every config seed uses `INSERT … SELECT FROM tenants
-- WHERE status='ACTIVE'` to apply to all currently-active tenants. On Azure
-- dev this produces rows for both `tenant-default-001` and the PTPL tenant
-- (confirmed via `SELECT id, name FROM tenants` during chunk 2d verification).
-- Adding a new tenant later requires a seed-on-tenant-creation hook in app
-- code — logged to WS-1a client-commits backlog.
--
-- Structure:
--   Section 1 — Seeds for new config tables (applied per ACTIVE tenant)
--     1.1  invoice_rejection_reasons        (7 seed rows per Message 2 Q1)
--     1.2  invoice_duplicate_config         (1 row; current duplicate agent values)
--     1.3  gst_validation_config            (1 row; Message 2 defaults)
--     1.4  kyc_provider_config              (1 row; kyc_enabled=FALSE, manual-only)
--     1.5  kyc_check_config                 (7 rows; all check types disabled)
--
--   Section 2 — Backfills on invoices (ALTER-added columns from chunk 2b)
--     2.1  lifecycle_state                  (CASE from status + processing_status)
--     2.2  financial_year                   (India Apr-Mar FY derived from invoice_date)
--     2.3  vendor_id + vendor_id_match_confidence  (name → vendor lookup)
--     2.4  last_action / last_action_at     (seed from updated_at)
--
--   Section 3 — Paid-invoice payment synthesis
--     3.1  Log rows being skipped (NULL total_amount)
--     3.2  Synthesize payment rows for historical status='paid' invoices
--
--   Section 4 — Audit log entries for the backfill itself
--     4.1  Per-invoice 'lifecycle_state_backfilled' entry
--     4.2  Q3 'migrated_to_exception_hold' entry (Approved + unresolved exception)
--
-- Idempotence:
--   - All INSERTs use patterns that skip existing rows (ON DUPLICATE KEY UPDATE
--     with no-op SET; or NOT EXISTS subquery).
--   - All UPDATEs guard with WHERE <target> IS NULL so repeat runs skip rows.
--   - Audit log INSERTs guard with NOT EXISTS on (invoice_id, action) to
--     prevent duplicate entries on re-run.
--
-- Output logging:
--   The migration runner captures SELECT outputs from the SELECT statements
--   marked with `tag` column (e.g., 'paid_synthesis_skipped', 'vendor_id_unresolved').
--   Review these rows after running the migration to catch data-quality issues.
-- =============================================================================


-- ============================================================================
-- SECTION 1 — SEEDS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1  invoice_rejection_reasons  (Message 2 Q1 — 7 seed reasons × all tenants)
-- ----------------------------------------------------------------------------

INSERT INTO invoice_rejection_reasons (tenant_id, reason_code, display_name, description, is_active, sort_order)
SELECT t.id, seeds.reason_code, seeds.display_name, seeds.description, seeds.is_active, seeds.sort_order
  FROM tenants t
 CROSS JOIN (
           SELECT 'data_error'           AS reason_code, 'Data error'            AS display_name, 'Incorrect invoice data (amounts, dates, line items)'             AS description, TRUE AS is_active, 10 AS sort_order
 UNION ALL SELECT 'missing_documentation',                'Missing documentation',                'Supporting documents (PO, GRN, SOW) missing or incomplete',                      TRUE,              20
 UNION ALL SELECT 'vendor_error',                         'Vendor error',                         'Vendor raised invoice incorrectly; needs revision',                              TRUE,              30
 UNION ALL SELECT 'policy_violation',                     'Policy violation',                     'Invoice violates approval/spend/tax policy',                                     TRUE,              40
 UNION ALL SELECT 'duplicate',                            'Duplicate',                            'Confirmed duplicate of prior invoice',                                           TRUE,              50
 UNION ALL SELECT 'quality_issue',                        'Quality issue',                        'Goods/services received did not meet quality standards',                         TRUE,              60
 UNION ALL SELECT 'other',                                'Other',                                'Rejection reason not covered by standard codes (requires note)',                 TRUE,              99
 ) seeds
 WHERE t.status = 'ACTIVE'
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description  = VALUES(description);


-- ----------------------------------------------------------------------------
-- 1.2  invoice_duplicate_config  (current duplicate agent hardcoded values × all tenants)
--       Extracted from server/services/agents/duplicateFraudAgent.mjs.
--       See 2c header block for why the Q4 weight columns are seeded NULL.
-- ----------------------------------------------------------------------------

INSERT INTO invoice_duplicate_config (
  tenant_id,
  period_overlap_identical_points, period_overlap_contained_points, period_overlap_partial_points,
  fuzzy_match_threshold, fuzzy_prefix_length,
  amount_tolerance_pct, date_window_days
)
SELECT
  t.id,
  40, 30, 15,            -- Message 2 Q4 defaults (period overlap)
  70, 6,                 -- current agent: risk_score threshold = 70; prefix slice(0,6)
  1.00, 7                -- current agent: amount ±1%, date ±7 days
  FROM tenants t
 WHERE t.status = 'ACTIVE'
ON DUPLICATE KEY UPDATE
  period_overlap_identical_points = VALUES(period_overlap_identical_points),
  period_overlap_contained_points = VALUES(period_overlap_contained_points),
  period_overlap_partial_points   = VALUES(period_overlap_partial_points),
  fuzzy_match_threshold = VALUES(fuzzy_match_threshold),
  fuzzy_prefix_length   = VALUES(fuzzy_prefix_length),
  amount_tolerance_pct  = VALUES(amount_tolerance_pct),
  date_window_days      = VALUES(date_window_days);


-- ----------------------------------------------------------------------------
-- 1.3  gst_validation_config  (Message 2 GST defaults × all tenants; column
--       defaults cover all values, INSERT ensures a row exists per tenant)
-- ----------------------------------------------------------------------------

INSERT INTO gst_validation_config (tenant_id)
SELECT t.id FROM tenants t WHERE t.status = 'ACTIVE'
ON DUPLICATE KEY UPDATE tenant_id = VALUES(tenant_id);


-- ----------------------------------------------------------------------------
-- 1.4  kyc_provider_config  (hybrid-model default: manual-only × all tenants)
-- ----------------------------------------------------------------------------

INSERT INTO kyc_provider_config (tenant_id, kyc_enabled, primary_provider, fallback_provider, api_unavailable_behavior)
SELECT t.id, 0, 'manual', 'none', 'block'
  FROM tenants t
 WHERE t.status = 'ACTIVE'
ON DUPLICATE KEY UPDATE tenant_id = VALUES(tenant_id);


-- ----------------------------------------------------------------------------
-- 1.5  kyc_check_config  (7 check types × all tenants, all disabled at seed)
-- ----------------------------------------------------------------------------

INSERT INTO kyc_check_config (tenant_id, check_type, enabled, is_mandatory, provider_override)
SELECT t.id, checks.check_type, 0, 0, NULL
  FROM tenants t
 CROSS JOIN (
           SELECT 'pan'           AS check_type
 UNION ALL SELECT 'gstin'
 UNION ALL SELECT 'msme'
 UNION ALL SELECT 'cin'
 UNION ALL SELECT 'section_206ab'
 UNION ALL SELECT 'bank_account'
 UNION ALL SELECT 'director_kyc'
 ) checks
 WHERE t.status = 'ACTIVE'
ON DUPLICATE KEY UPDATE
  enabled           = VALUES(enabled),
  is_mandatory      = VALUES(is_mandatory),
  provider_override = VALUES(provider_override);


-- ============================================================================
-- SECTION 2 — BACKFILLS ON invoices
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1  lifecycle_state  (CASE from status + processing_status)
--
--       LOWER(status) is used because legacy data has mixed-case values
--       ('Rejected' vs 'pending_approval' vs 'draft' observed on Azure dev).
--
--       processing_status cross-reference: a 'draft' row with
--       processing_status IN ('exception','failed') is genuinely in an
--       exception state (OCR or validation broke) — mapping to Ingested would
--       hide it from the exception queue. Route to Exception Hold instead.
--
--       Rows with unknown legacy status values are left NULL for manual
--       triage; downstream code should treat NULL lifecycle_state as
--       needs-review.
-- ----------------------------------------------------------------------------

UPDATE invoices SET lifecycle_state = CASE
  WHEN LOWER(status) = 'draft' AND processing_status IN ('exception', 'failed')  THEN 'Exception Hold'
  WHEN LOWER(status) = 'draft'                                                   THEN 'Ingested'
  WHEN LOWER(status) IN ('pending', 'pending_approval', 'changes_requested')     THEN 'Under Verification'
  WHEN LOWER(status) = 'approved' AND EXISTS (
      SELECT 1 FROM invoice_exceptions ie WHERE ie.invoice_id = invoices.id AND ie.resolved = 0
    ) THEN 'Exception Hold'
  WHEN LOWER(status) = 'approved'                                                THEN 'Processed'
  WHEN LOWER(status) = 'rejected'                                                THEN 'Rejected'
  WHEN LOWER(status) = 'paid'                                                    THEN 'Processed'
  ELSE NULL
END
WHERE lifecycle_state IS NULL;

-- Log any invoices whose status didn't map (lifecycle_state still NULL)
SELECT 'lifecycle_unmapped' AS tag, id, status, processing_status
  FROM invoices
 WHERE lifecycle_state IS NULL;


-- ----------------------------------------------------------------------------
-- 2.2  financial_year  (India Apr-Mar FY; format 'YYYY-YY')
--       Apr 1 2025 - Mar 31 2026 → '2025-26'
-- ----------------------------------------------------------------------------

UPDATE invoices
   SET financial_year = CASE
     WHEN MONTH(invoice_date) >= 4
       THEN CONCAT(YEAR(invoice_date), '-', LPAD(MOD(YEAR(invoice_date) + 1, 100), 2, '0'))
     ELSE CONCAT(YEAR(invoice_date) - 1, '-', LPAD(MOD(YEAR(invoice_date), 100), 2, '0'))
   END
 WHERE invoice_date IS NOT NULL
   AND financial_year IS NULL;


-- ----------------------------------------------------------------------------
-- 2.3  vendor_id + vendor_id_match_confidence  (resolve from vendor_name)
--
--       Match priority (highest confidence first):
--         1. vendor_legal_name exact  → confidence 100
--         2. vendor_code exact        → confidence 100
--         3. vendor_trade_name exact  → confidence 90
--
--       Multiple vendors matching: ROW_NUMBER() picks the highest-priority row.
--       Uses MySQL 8 window function (target DB is MySQL 8.x).
-- ----------------------------------------------------------------------------

UPDATE invoices i
  LEFT JOIN (
    SELECT invoice_id, vendor_id, confidence
      FROM (
        SELECT
          inv.id AS invoice_id,
          v.id   AS vendor_id,
          CASE
            WHEN v.vendor_legal_name = inv.vendor_name THEN 100.00
            WHEN v.vendor_code       = inv.vendor_name THEN 100.00
            WHEN v.vendor_trade_name = inv.vendor_name THEN 90.00
          END AS confidence,
          ROW_NUMBER() OVER (
            PARTITION BY inv.id
            ORDER BY CASE
              WHEN v.vendor_legal_name = inv.vendor_name THEN 1
              WHEN v.vendor_code       = inv.vendor_name THEN 2
              WHEN v.vendor_trade_name = inv.vendor_name THEN 3
            END
          ) AS rn
          FROM invoices inv
          JOIN vendors v
            ON v.vendor_legal_name = inv.vendor_name
            OR v.vendor_trade_name = inv.vendor_name
            OR v.vendor_code       = inv.vendor_name
         WHERE inv.vendor_id IS NULL
           AND inv.vendor_name IS NOT NULL
      ) ranked
     WHERE rn = 1
  ) best
    ON best.invoice_id = i.id
   SET i.vendor_id = best.vendor_id,
       i.vendor_id_match_confidence = best.confidence
 WHERE i.vendor_id IS NULL
   AND best.vendor_id IS NOT NULL;

-- Log invoices whose vendor_name could not be resolved
SELECT 'vendor_id_unresolved' AS tag, id, vendor_name
  FROM invoices
 WHERE vendor_id IS NULL
   AND vendor_name IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 2.4  last_action / last_action_at  (seed from created_at for legacy rows)
--       Q7: denormalized columns driven by application-layer audit writes.
--       No audit history exists yet for legacy rows; approximation:
--
--       Rationale for COALESCE(created_at, updated_at, NOW()):
--       On Azure dev, ALL 10 invoices share an identical updated_at
--       (2026-04-21 08:05:17) because 20260421_multi_tenant_entity.sql
--       mass-touched the table adding tenant_id/entity_id. So updated_at
--       is a batch-write artifact, not a genuine last-action signal.
--       created_at varies naturally (2026-04-11 onwards), so it's the
--       honest proxy for the row's last real action (= its ingestion time).
--       Falls back to updated_at then NOW() if created_at is NULL on
--       other environments.
-- ----------------------------------------------------------------------------

UPDATE invoices
   SET last_action    = 'legacy_backfill',
       last_action_at = COALESCE(created_at, updated_at, NOW())
 WHERE last_action_at IS NULL;


-- ============================================================================
-- SECTION 3 — PAID-INVOICE PAYMENT SYNTHESIS
-- ============================================================================
-- Historical invoices with LOWER(status)='paid' need a corresponding payment
-- row so the payments ledger reflects their executed state. Current Azure dev
-- has zero Paid invoices, but staging / customer environments may have them.
--
-- Edge cases:
--   1. invoices.total_amount IS NULL  → skip row, log to audit output
--   2. Payment row already exists     → skip row silently (idempotent)
--   3. payment_mode set to 'unknown'  → payments.payment_mode is VARCHAR(32)
--      so any string is valid; 'unknown' is the historical-marker convention
--   4. payment_date: best-effort COALESCE(updated_at, created_at, NOW())
--   5. notes column carries synthesis marker for later audit / cleanup
-- ============================================================================

-- 3.1  Log rows being skipped due to NULL total_amount (pre-synthesis audit)

SELECT 'paid_synthesis_skipped_null_amount' AS tag,
       i.id, i.invoice_number, i.status, i.total_amount, i.created_at
  FROM invoices i
  LEFT JOIN payments p ON p.invoice_id = i.id
 WHERE LOWER(i.status) = 'paid'
   AND i.total_amount IS NULL
   AND p.id IS NULL;


-- 3.2  Synthesize payment rows for eligible historical Paid invoices

INSERT INTO payments
  (id, tenant_id, entity_id, invoice_id, payment_date, utr, amount, payment_mode, status, notes, created_at)
SELECT
  UUID(),
  i.tenant_id,
  i.entity_id,
  i.id,
  COALESCE(i.updated_at, i.created_at, NOW()),
  NULL,
  i.total_amount,
  'unknown',
  'confirmed',
  'Synthesized from historical status=paid during WS-1a migration',
  NOW()
  FROM invoices i
  LEFT JOIN payments p ON p.invoice_id = i.id
 WHERE LOWER(i.status) = 'paid'
   AND i.total_amount IS NOT NULL
   AND p.id IS NULL;

-- Report count of synthesized rows
SELECT 'paid_synthesis_count' AS tag, COUNT(*) AS synthesized_rows
  FROM payments
 WHERE notes = 'Synthesized from historical status=paid during WS-1a migration';


-- ============================================================================
-- SECTION 4 — AUDIT LOG ENTRIES FOR THIS BACKFILL
-- ============================================================================
-- Every invoice whose lifecycle_state was just set gets an audit entry.
-- Every Approved+unresolved-exception invoice that migrated to Exception Hold
-- gets an additional entry per Q3 rider.
--
-- NOT EXISTS guards ensure idempotence: re-running the migration doesn't
-- duplicate audit entries.
-- ============================================================================

-- 4.1  Per-invoice lifecycle_state backfill audit entry
INSERT INTO invoice_audit_log
  (id, tenant_id, invoice_id, action, from_state, to_state, actor_source, reason_code, reason_note, created_at)
SELECT
  UUID(),
  i.tenant_id,
  i.id,
  'lifecycle_state_backfilled',
  NULL,
  i.lifecycle_state,
  'backfill',
  'ws1a_migration',
  CONCAT('Legacy status=', COALESCE(i.status, 'NULL'),
         ', processing_status=', COALESCE(i.processing_status, 'NULL')),
  NOW()
  FROM invoices i
 WHERE i.lifecycle_state IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM invoice_audit_log al
      WHERE al.invoice_id = i.id
        AND al.action = 'lifecycle_state_backfilled'
   );


-- 4.2  Q3 Approved + unresolved exception → Exception Hold audit entry
INSERT INTO invoice_audit_log
  (id, tenant_id, invoice_id, action, from_state, to_state, actor_source, reason_code, reason_note, created_at)
SELECT
  UUID(),
  i.tenant_id,
  i.id,
  'migrated_to_exception_hold',
  'Approved',
  'Exception Hold',
  'backfill',
  'unresolved_exception_at_migration',
  CONCAT(
    'Migrated because ',
    (SELECT COUNT(*) FROM invoice_exceptions ie WHERE ie.invoice_id = i.id AND ie.resolved = 0),
    ' unresolved exception(s) existed at migration time'
  ),
  NOW()
  FROM invoices i
 WHERE LOWER(i.status) = 'approved'
   AND EXISTS (
     SELECT 1 FROM invoice_exceptions ie
      WHERE ie.invoice_id = i.id
        AND ie.resolved = 0
   )
   AND NOT EXISTS (
     SELECT 1 FROM invoice_audit_log al
      WHERE al.invoice_id = i.id
        AND al.action = 'migrated_to_exception_hold'
   );


-- ----------------------------------------------------------------------------
-- End of chunk 2d. After this file runs on Azure dev, the expected state:
--   - 5 config tables have rows for BOTH active tenants
--     (tenant-default-001 and 4755d4d4-76fb-4578-babd-2bcb7084da06 / PTPL)
--     Row counts per table (2 tenants):
--       invoice_rejection_reasons:   14 rows  (7 reasons × 2 tenants)
--       invoice_duplicate_config:     2 rows  (1 × 2)
--       gst_validation_config:        2 rows
--       kyc_provider_config:          2 rows
--       kyc_check_config:            14 rows  (7 check types × 2 tenants)
--   - 10 invoices have lifecycle_state / financial_year / last_action populated
--     (last_action_at sourced from created_at, varying naturally 2026-04-11+)
--   - vendor_id backfill runs but dev data has bare vendor_name strings that
--     likely don't match the 2 existing vendors records (observe the
--     'vendor_id_unresolved' output)
--   - 0 payment rows synthesized (no Paid invoices on dev)
--   - 10 audit log entries written (one per invoice; plus 0 migrated_to_exception_hold)
-- ----------------------------------------------------------------------------
