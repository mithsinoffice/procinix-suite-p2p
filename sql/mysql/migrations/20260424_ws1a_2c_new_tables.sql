-- =============================================================================
-- WS-1a  CHUNK 2c  —  CREATE new WS-1a tables
-- =============================================================================
--
-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │  NOTE — No FOREIGN KEY constraints are added in this chunk.               │
-- │                                                                           │
-- │  The `tenants` and `entities` tables use COLLATE=utf8mb4_unicode_ci (set  │
-- │  by 20260421_multi_tenant_entity.sql), while business tables (invoices,   │
-- │  vendors, purchase_orders, etc.) use utf8mb4_0900_ai_ci. Adding an FK to  │
-- │  `tenants(id)` from a new table would force a collation downgrade on the  │
-- │  new table, which would then break JOINs against invoices.tenant_id with  │
-- │  "Illegal mix of collations" errors.                                      │
-- │                                                                           │
-- │  This collation mismatch predates WS-1a (it is NOT drift WS-1a created).  │
-- │  Schema-wide collation harmonization + retroactive FK addition is logged  │
-- │  on the WS-1b gap list.                                                   │
-- │                                                                           │
-- │  Do NOT add FKs here assuming this is an oversight.                       │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- Scope: 10 new tables that didn't exist before WS-1a.
--
--   Section A — Core transactional tables (2)
--     invoice_audit_log          per-invoice event/state history
--     payments                   minimal payment ledger (expanded in WS-3)
--
--   Section B — Per-tenant config tables (6)
--     invoice_rejection_reasons  Q1 dropdown config
--     invoice_duplicate_config   Q4/Q5 tiered-detection + period-overlap
--     tds_section_config         effective-dated TDS rates + thresholds
--     gst_validation_config      OCR variance tolerances
--     kyc_provider_config        per-tenant KYC provider + credentials ref
--     kyc_check_config           per-tenant + per-check-type opt-in
--
--   Section C — Derived / aggregate tables (2)
--     tds_ytd_aggregates         YTD base/TDS per vendor × entity × section
--     vendor_opening_balances    FY opening balances per vendor × entity
--
-- FK policy (per approved option b + rider):
--   - FKs allowed between new tables
--   - FKs allowed from new tables to clean existing tables (tenants if clean)
--   - NO FKs from new tables to drift-filled parents (vendors, invoices, etc.)
--
-- Outcome: NO foreign keys in this chunk. Two reasons:
--   1. The 10 new tables are independent — no natural between-new-tables FK.
--   2. `tenants` is NOT a clean FK target: it was created by 20260421 with
--      COLLATE=utf8mb4_unicode_ci, while every baseline business table uses
--      utf8mb4_0900_ai_ci. Creating FK to tenants(id) would force new tables
--      to `_unicode_ci`, which would then break JOINs against invoices.tenant_id
--      with "Illegal mix of collations" errors. The existing schema already
--      carries tenant_id without FK enforcement (see invoices, purchase_orders);
--      new tables follow that pattern for consistency.
--
--   WS-1b gap list addition: harmonize schema-wide collation, then retroactively
--   add tenant_id FKs across both existing and new tables.
--
-- All new tables use ENGINE=InnoDB, CHARSET=utf8mb4, COLLATE=utf8mb4_0900_ai_ci
-- to match the baseline (chunk 2a).
--
-- ⚠ Open items flagged inline:
--   1. invoice_duplicate_config columns that are INTENTIONALLY NULLABLE and
--      will be seeded NULL in 2d:
--
--         fuzzy_prefix_weight
--         fuzzy_amount_weight
--         fuzzy_date_weight
--         amount_tolerance_rupees
--
--      The current duplicate agent (duplicateFraudAgent.mjs) uses binary AND
--      logic with a single per-check-type risk_score (exact=100, fuzzy=70,
--      hash=90) and does NOT use weighted composite scoring. These weight
--      columns exist to support the Q4 tiered engine that WS-1a server
--      commits will ship later; when that commit lands, it includes UPDATE
--      statements to populate these columns. Until then they are NULL and
--      the engine falls back to the current binary behavior.
--
--      Per Q5 "Agent code must NOT fall back to hardcoded defaults if row
--      missing" — the config row must exist (seeded in 2d for the default
--      tenant) even with NULL weights; agent code decides what to do when
--      reading NULLs. This prevents silent drift.
--
--      amount_tolerance_rupees is NULL because the current agent uses only
--      amount_tolerance_pct (±1%). Absolute-rupees tolerance is a new Q4
--      capability; its seed comes with the Q4 engine commit.
--
--      DO NOT treat these NULLs as an oversight.
--
--   2. TDS section_config seed rows are deferred to the TDS seed step of the
--      proceed order; schema lands here, defaults land separately.
-- =============================================================================


-- ============================================================================
-- SECTION A — Core transactional tables
-- ============================================================================

-- -----------------------------------------------------------------------------
-- invoice_audit_log
--   Per-invoice history of state transitions, rejections, resubmissions,
--   match recomputes, exception resolutions, etc. Written in the same
--   transaction as the application-layer last_action sync (Q7).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `invoice_audit_log` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NULL,
  `invoice_id` VARCHAR(36) NOT NULL,
  `action` VARCHAR(64) NOT NULL COMMENT 'verb: verify|reject|resubmit|exception_raised|exception_resolved|match_computed|lifecycle_transition|voucher_posted|migrated_to_exception_hold|cross_fy_invoice_number_reuse etc',
  `from_state` VARCHAR(32) NULL,
  `to_state` VARCHAR(32) NULL,
  `actor_id` VARCHAR(36) NULL,
  `actor_name` VARCHAR(255) NULL,
  `actor_role` VARCHAR(64) NULL,
  `actor_source` ENUM('user','agent','system','backfill') NULL COMMENT 'how the event was initiated',
  `reason_code` VARCHAR(64) NULL,
  `reason_note` TEXT NULL,
  `payload_before` JSON NULL COMMENT 'relevant invoice fields before this event',
  `payload_after` JSON NULL COMMENT 'relevant invoice fields after this event',
  `invoice_state_hash` VARCHAR(64) NULL COMMENT 'hash of invoice state for drift/invariant checks',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_id` (`invoice_id`),
  KEY `idx_invoice_created` (`invoice_id`, `created_at`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at` DESC),
  KEY `idx_tenant_created` (`tenant_id`, `created_at`),
  KEY `idx_actor_source` (`actor_source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- payments
--   Minimal ledger. One invoice → many payments. Expanded in WS-3 with
--   overpayment handling, vendor advance reconciliation, payment reversals,
--   FX, etc. No FK to invoices (drift-filled parent).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NULL,
  `entity_id` VARCHAR(36) NULL COMMENT 'Payer entity. Kept NULL-able in WS-1a; synthesis-from-paid and WS-3 insert paths populate from source invoice. Tighten to NOT NULL in WS-3 once verified.',
  `invoice_id` VARCHAR(36) NOT NULL,
  `payment_date` DATE NOT NULL,
  `utr` VARCHAR(64) NULL COMMENT 'Unique Transaction Reference from bank',
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_mode` VARCHAR(32) NOT NULL COMMENT 'neft|rtgs|imps|cheque|upi|cash|internal_transfer etc',
  `status` ENUM('queued','initiated','confirmed','failed','reconciled') NOT NULL,
  `notes` TEXT NULL COMMENT 'Reconciliation notes, synthesis markers (e.g. historical backfill), or operator annotations',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_id` (`invoice_id`),
  KEY `idx_status` (`status`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_payments_entity` (`entity_id`),
  KEY `idx_payment_date` (`payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
-- SECTION B — Per-tenant config tables
-- ============================================================================

-- -----------------------------------------------------------------------------
-- invoice_rejection_reasons
--   Per-tenant dropdown values for the rejection reason_code field on
--   invoices. Seed rows (Data error, Missing documentation, Vendor error,
--   Policy violation, Duplicate, Quality issue, Other) populate in chunk 2d.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `invoice_rejection_reasons` (
  `tenant_id` VARCHAR(36) NOT NULL,
  `reason_code` VARCHAR(64) NOT NULL,
  `display_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tenant_id`, `reason_code`),
  KEY `idx_tenant_active_sort` (`tenant_id`, `is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- invoice_duplicate_config
--   Per-tenant tiered-detection + period-overlap signal config (Q4/Q5).
--   period_overlap_* defaults are per Message 2 (40/30/15).
--   fuzzy_* columns are NULLABLE here — chunk 2d seeds them from extracted
--   hard-coded values in the current duplicate agent code to honor Q5's
--   "zero-behavior-change" requirement.
--   Agent code MUST NOT fall back to hard-coded defaults if row missing (Q5).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `invoice_duplicate_config` (
  `tenant_id` VARCHAR(36) NOT NULL,
  -- Period overlap signal (Q4 — defaults from Message 2)
  `period_overlap_identical_points` INT NOT NULL DEFAULT 40,
  `period_overlap_contained_points` INT NOT NULL DEFAULT 30,
  `period_overlap_partial_points` INT NOT NULL DEFAULT 15,
  -- Tier 4 fuzzy match config (defaults sourced from agent code in chunk 2d)
  `fuzzy_match_threshold` INT NULL COMMENT 'Composite score threshold to trigger tier_4_fuzzy; seed from agent code',
  `fuzzy_prefix_length` INT NULL COMMENT 'Length of invoice_number prefix to match (current agent uses 6)',
  `fuzzy_prefix_weight` INT NULL COMMENT 'Q4 weighted-tier: points for prefix match. NULL until Q4 engine commit lands — see header note.',
  `fuzzy_amount_weight` INT NULL COMMENT 'Q4 weighted-tier: points for amount within tolerance. NULL until Q4 engine commit — see header note.',
  `fuzzy_date_weight` INT NULL COMMENT 'Q4 weighted-tier: points for invoice_date within date_window_days. NULL until Q4 engine commit — see header note.',
  `amount_tolerance_pct` DECIMAL(5,2) NULL,
  `amount_tolerance_rupees` DECIMAL(10,2) NULL COMMENT 'Q4 absolute-rupees tolerance. NULL until Q4 engine commit — current agent uses pct only.',
  `date_window_days` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- tds_section_config
--   Effective-dated TDS rates + thresholds per tenant × section. Engine
--   step 1: look up the row with max effective_from ≤ invoice_date where
--   (effective_to IS NULL OR effective_to ≥ invoice_date).
--
--   verification_status + verified_by/at/note track whether a seeded rate
--   has been reviewed by a tax consultant (per earlier decision — distinguish
--   'verified' from 'assumed_from_training' / 'pending_consultant_review').
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `tds_section_config` (
  `tenant_id` VARCHAR(36) NOT NULL,
  `tds_section` VARCHAR(16) NOT NULL,
  `section_name` VARCHAR(128) NOT NULL,
  `default_rate` DECIMAL(5,2) NOT NULL,
  `single_invoice_threshold` DECIMAL(15,2) NULL,
  `annual_aggregate_threshold` DECIMAL(15,2) NULL,
  `threshold_crossing_behavior` ENUM('catch_up','forward_only','no_threshold') NOT NULL,
  `applies_to_base` ENUM('invoice_total','line_amount','excl_gst','incl_gst') NOT NULL,
  `pan_not_available_rate` DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `verification_status` ENUM('verified','assumed_from_training','pending_consultant_review') NOT NULL DEFAULT 'pending_consultant_review',
  `verified_by` VARCHAR(128) NULL,
  `verified_at` DATETIME NULL,
  `verification_note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tenant_id`, `tds_section`, `effective_from`),
  KEY `idx_tenant_section_active` (`tenant_id`, `tds_section`, `is_active`),
  KEY `idx_tenant_effective_from` (`tenant_id`, `effective_from`),
  KEY `idx_verification_status` (`verification_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- gst_validation_config
--   Per-tenant OCR variance tolerances for GST auto-correct / exception
--   routing. Defaults per Message 2 (₹1 rounding, ₹10 / 0.5% minor, auto-correct on).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `gst_validation_config` (
  `tenant_id` VARCHAR(36) NOT NULL,
  `rounding_tolerance_rupees` DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  `minor_variance_rupees` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  `minor_variance_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.50,
  `auto_correct_minor_variance` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- kyc_provider_config
--   Per-tenant KYC routing. Default on tenant creation: kyc_enabled=FALSE,
--   primary_provider='manual'. API adapters land in WS-KYC.
--   api_credentials_ref is a secrets-vault pointer, NOT the raw keys.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `kyc_provider_config` (
  `tenant_id` VARCHAR(36) NOT NULL,
  `kyc_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `primary_provider` ENUM('surepass','ongrid','manual') NOT NULL DEFAULT 'manual',
  `fallback_provider` ENUM('surepass','ongrid','none') NOT NULL DEFAULT 'none',
  `api_credentials_ref` VARCHAR(128) NULL COMMENT 'Reference to secrets vault; never store raw keys here',
  `api_unavailable_behavior` ENUM('block','pending_retry') NOT NULL DEFAULT 'block',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- kyc_check_config
--   Per-tenant × per-check-type opt-in. provider_override=NULL means use
--   kyc_provider_config.primary_provider for this check.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `kyc_check_config` (
  `tenant_id` VARCHAR(36) NOT NULL,
  `check_type` ENUM('pan','gstin','msme','cin','section_206ab','bank_account','director_kyc') NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `is_mandatory` TINYINT(1) NOT NULL DEFAULT 0,
  `provider_override` ENUM('surepass','ongrid','manual') NULL COMMENT 'NULL = use tenant default from kyc_provider_config',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tenant_id`, `check_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
-- SECTION C — Derived / aggregate tables
-- ============================================================================

-- -----------------------------------------------------------------------------
-- tds_ytd_aggregates
--   Running YTD base + TDS amounts keyed by vendor × entity × FY × section.
--   Updated on invoice Processed transition (TDS engine step 9).
--   Threshold catch-up math reads these values at engine step 5.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `tds_ytd_aggregates` (
  `tenant_id` VARCHAR(36) NOT NULL,
  `vendor_id` VARCHAR(36) NOT NULL,
  `entity_id` VARCHAR(36) NOT NULL,
  `financial_year` VARCHAR(9) NOT NULL,
  `tds_section` VARCHAR(16) NOT NULL,
  `ytd_base_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `ytd_tds_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `invoice_count` INT NOT NULL DEFAULT 0 COMMENT 'Number of invoices contributing to this YTD aggregate',
  `last_computed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tenant_id`, `vendor_id`, `entity_id`, `financial_year`, `tds_section`),
  KEY `idx_vendor_fy` (`vendor_id`, `financial_year`),
  KEY `idx_tenant_fy_section` (`tenant_id`, `financial_year`, `tds_section`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- vendor_opening_balances
--   FY opening balance per vendor × entity. Feeds the vendor ledger
--   aggregator as the seed row; subsequent Processed invoices + Confirmed
--   payments accumulate on top.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `vendor_opening_balances` (
  `tenant_id` VARCHAR(36) NULL,
  `vendor_id` VARCHAR(36) NOT NULL,
  `entity_id` VARCHAR(36) NOT NULL,
  `financial_year` VARCHAR(9) NOT NULL,
  `as_of_date` DATE NOT NULL,
  `balance_amount` DECIMAL(15,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`vendor_id`, `entity_id`, `financial_year`),
  KEY `idx_tenant_fy` (`tenant_id`, `financial_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
