-- =============================================================================
-- WS-1a  CHUNK 2b  —  ALTER TABLE additions on existing tables
-- =============================================================================
-- Scope:
--   1. Drift fixes: columns the form captures but INSERT/UPDATE discards
--      (client_erp_vendor_code on vendors; credit_days, credit_limit on
--      vendor_entity_mappings).
--   2. TDS engine additions: lower TDS certificate validity + rate on
--      vendor_pan_compliance; per-entity TDS section override on
--      vendor_entity_mappings.
--   3. KYC hybrid-model source-tracking columns: per-check on
--      vendor_pan_compliance (PAN, MSME, CIN, section_206ab); per-row on
--      vendor_gst_registrations and vendor_bank_accounts.
--   4. WS-1a invoice-level columns: lifecycle_state, financial_year,
--      service_period_{from,to}, resubmission_count, source_invoice_id,
--      rejection_reason_{code,note}, vendor_id, last_action{,_at},
--      expense_voucher_{status,id,posted_at,error,retry_count,payload},
--      match_{result,details,computed_at}, duplicate_{decision,checked_at,
--      override_by,override_reason}, supplier_gstin, recipient_gstin,
--      place_of_supply, gst_invoice_type, itc_{eligible,ineligible_reason}.
--   5. WS-1a invoice-line-item columns: TDS fields + GST breakdown.
--   6. Indexes for the new columns WS-1a reads on.
--
-- Idempotence pattern: `information_schema.COLUMNS` existence check wrapped in
-- `PREPARE ... EXECUTE` (matches sql/mysql/migrations/20260421_multi_tenant_entity.sql).
-- Safe to re-run on Azure (skips existing columns) and runs clean on fresh DBs.
--
-- Lifecycle state ENUM (authoritative, 7 states per Message 2):
--   'Ingested', 'OCR Extracted', 'Under Verification', 'Exception Hold',
--   'Processed', 'Queued for Payment', 'Rejected'
-- Resubmission is a FLAG (resubmission_count > 0 + source_invoice_id), NOT a state.
-- Legacy status='Pending Approval' maps to 'Under Verification' in the 2d backfill.
--
-- Notes on existing columns NOT re-added:
--   - invoice_line_items.hsn_sac VARCHAR(20) already exists — reuse that column
--     for HSN/SAC code; do NOT add a duplicate hsn_sac_code column.
--   - invoice_line_items.gst_rate DECIMAL(5,2) already exists — reuse.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Drift fixes on vendors  (client_erp_vendor_code)
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND COLUMN_NAME = 'client_erp_vendor_code');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendors ADD COLUMN client_erp_vendor_code VARCHAR(64) NULL AFTER vendor_code',
  'SELECT ''skip vendors.client_erp_vendor_code'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 2. TDS engine columns on vendor_pan_compliance  (lower TDS cert validity + rate)
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'lower_tds_cert_valid_from');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN lower_tds_cert_valid_from DATE NULL',
  'SELECT ''skip vendor_pan_compliance.lower_tds_cert_valid_from'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'lower_tds_cert_valid_to');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN lower_tds_cert_valid_to DATE NULL',
  'SELECT ''skip vendor_pan_compliance.lower_tds_cert_valid_to'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'lower_tds_cert_rate');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN lower_tds_cert_rate DECIMAL(5,2) NULL',
  'SELECT ''skip vendor_pan_compliance.lower_tds_cert_rate'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 3. KYC source-tracking on vendor_pan_compliance  (PAN, MSME, CIN, 206AB — 12 cols)
--    ENUM values aligned between kyc_provider_config.primary_provider and
--    kyc_check_config.provider_override per earlier decision: ('api_surepass',
--    'api_ongrid','manual','pending_verification','not_verified').
-- -----------------------------------------------------------------------------

-- PAN verification
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'pan_verification_source');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN pan_verification_source ENUM(''api_surepass'',''api_ongrid'',''manual'',''pending_verification'',''not_verified'') NOT NULL DEFAULT ''not_verified''',
  'SELECT ''skip vendor_pan_compliance.pan_verification_source'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'pan_verified_at');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN pan_verified_at DATETIME NULL',
  'SELECT ''skip vendor_pan_compliance.pan_verified_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'pan_verification_reference');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN pan_verification_reference VARCHAR(128) NULL',
  'SELECT ''skip vendor_pan_compliance.pan_verification_reference'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- MSME verification
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'msme_verification_source');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN msme_verification_source ENUM(''api_surepass'',''api_ongrid'',''manual'',''pending_verification'',''not_verified'') NOT NULL DEFAULT ''not_verified''',
  'SELECT ''skip vendor_pan_compliance.msme_verification_source'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'msme_verified_at');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN msme_verified_at DATETIME NULL',
  'SELECT ''skip vendor_pan_compliance.msme_verified_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'msme_verification_reference');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN msme_verification_reference VARCHAR(128) NULL',
  'SELECT ''skip vendor_pan_compliance.msme_verification_reference'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- CIN verification
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'cin_verification_source');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN cin_verification_source ENUM(''api_surepass'',''api_ongrid'',''manual'',''pending_verification'',''not_verified'') NOT NULL DEFAULT ''not_verified''',
  'SELECT ''skip vendor_pan_compliance.cin_verification_source'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'cin_verified_at');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN cin_verified_at DATETIME NULL',
  'SELECT ''skip vendor_pan_compliance.cin_verified_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'cin_verification_reference');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN cin_verification_reference VARCHAR(128) NULL',
  'SELECT ''skip vendor_pan_compliance.cin_verification_reference'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Section 206AB verification
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'section_206ab_verification_source');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN section_206ab_verification_source ENUM(''api_surepass'',''api_ongrid'',''manual'',''pending_verification'',''not_verified'') NOT NULL DEFAULT ''not_verified''',
  'SELECT ''skip vendor_pan_compliance.section_206ab_verification_source'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'section_206ab_verified_at');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN section_206ab_verified_at DATETIME NULL',
  'SELECT ''skip vendor_pan_compliance.section_206ab_verified_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_pan_compliance' AND COLUMN_NAME = 'section_206ab_verification_reference');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_pan_compliance ADD COLUMN section_206ab_verification_reference VARCHAR(128) NULL',
  'SELECT ''skip vendor_pan_compliance.section_206ab_verification_reference'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 4. KYC source-tracking on vendor_gst_registrations  (per-row, 4 cols)
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_gst_registrations' AND COLUMN_NAME = 'verification_source');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_gst_registrations ADD COLUMN verification_source ENUM(''api_surepass'',''api_ongrid'',''manual'',''pending_verification'',''not_verified'') NOT NULL DEFAULT ''not_verified''',
  'SELECT ''skip vendor_gst_registrations.verification_source'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_gst_registrations' AND COLUMN_NAME = 'verified_at');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_gst_registrations ADD COLUMN verified_at DATETIME NULL',
  'SELECT ''skip vendor_gst_registrations.verified_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_gst_registrations' AND COLUMN_NAME = 'verification_reference');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_gst_registrations ADD COLUMN verification_reference VARCHAR(128) NULL',
  'SELECT ''skip vendor_gst_registrations.verification_reference'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_gst_registrations' AND COLUMN_NAME = 'verification_raw_response');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_gst_registrations ADD COLUMN verification_raw_response JSON NULL',
  'SELECT ''skip vendor_gst_registrations.verification_raw_response'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 5. KYC source-tracking on vendor_bank_accounts  (per-row, 4 cols)
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_bank_accounts' AND COLUMN_NAME = 'verification_source');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_bank_accounts ADD COLUMN verification_source ENUM(''api_surepass'',''api_ongrid'',''manual'',''pending_verification'',''not_verified'') NOT NULL DEFAULT ''not_verified''',
  'SELECT ''skip vendor_bank_accounts.verification_source'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_bank_accounts' AND COLUMN_NAME = 'verified_at');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_bank_accounts ADD COLUMN verified_at DATETIME NULL',
  'SELECT ''skip vendor_bank_accounts.verified_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_bank_accounts' AND COLUMN_NAME = 'verification_reference');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_bank_accounts ADD COLUMN verification_reference VARCHAR(128) NULL',
  'SELECT ''skip vendor_bank_accounts.verification_reference'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_bank_accounts' AND COLUMN_NAME = 'verification_raw_response');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_bank_accounts ADD COLUMN verification_raw_response JSON NULL',
  'SELECT ''skip vendor_bank_accounts.verification_raw_response'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 6. Drift fixes + TDS override on vendor_entity_mappings
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_entity_mappings' AND COLUMN_NAME = 'credit_days');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_entity_mappings ADD COLUMN credit_days INT NULL',
  'SELECT ''skip vendor_entity_mappings.credit_days'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_entity_mappings' AND COLUMN_NAME = 'credit_limit');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_entity_mappings ADD COLUMN credit_limit DECIMAL(15,2) NULL',
  'SELECT ''skip vendor_entity_mappings.credit_limit'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_entity_mappings' AND COLUMN_NAME = 'default_tds_section_override');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendor_entity_mappings ADD COLUMN default_tds_section_override VARCHAR(16) NULL COMMENT ''Per-entity override; falls back to vendor_pan_compliance.tds_sections default''',
  'SELECT ''skip vendor_entity_mappings.default_tds_section_override'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 7. WS-1a lifecycle + audit columns on invoices
-- -----------------------------------------------------------------------------

-- lifecycle_state  (authoritative 7-state DAG per Message 2)
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'lifecycle_state');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN lifecycle_state ENUM(''Ingested'',''OCR Extracted'',''Under Verification'',''Exception Hold'',''Processed'',''Queued for Payment'',''Rejected'') NULL',
  'SELECT ''skip invoices.lifecycle_state'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- financial_year  (derived from invoice_date at save)
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'financial_year');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN financial_year VARCHAR(9) NULL',
  'SELECT ''skip invoices.financial_year'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- service_period_{from,to}
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'service_period_from');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN service_period_from DATE NULL',
  'SELECT ''skip invoices.service_period_from'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'service_period_to');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN service_period_to DATE NULL',
  'SELECT ''skip invoices.service_period_to'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- resubmission chain
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'resubmission_count');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN resubmission_count TINYINT NOT NULL DEFAULT 0',
  'SELECT ''skip invoices.resubmission_count'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'source_invoice_id');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN source_invoice_id VARCHAR(36) NULL COMMENT ''Parent invoice id when this row is a resubmission''',
  'SELECT ''skip invoices.source_invoice_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- rejection capture
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'rejection_reason_code');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN rejection_reason_code VARCHAR(64) NULL',
  'SELECT ''skip invoices.rejection_reason_code'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'rejection_reason_note');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN rejection_reason_note TEXT NULL',
  'SELECT ''skip invoices.rejection_reason_note'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vendor_id  (Q4 tier-duplicate-detection prerequisite)
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'vendor_id');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN vendor_id VARCHAR(36) NULL',
  'SELECT ''skip invoices.vendor_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vendor_id_match_confidence  (records the confidence of the vendor_name → vendor_id resolution; populated by backfill and by invoiceCreator on save)
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'vendor_id_match_confidence');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN vendor_id_match_confidence DECIMAL(5,2) NULL COMMENT ''0-100 score. 100=exact match on vendor_legal_name/trade_name/code; <100=fuzzy. NULL=unresolved.''',
  'SELECT ''skip invoices.vendor_id_match_confidence'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- last_action denormalization  (Q7 — volume-driven, app-layer sync)
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'last_action');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN last_action VARCHAR(32) NULL',
  'SELECT ''skip invoices.last_action'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'last_action_at');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN last_action_at DATETIME NULL',
  'SELECT ''skip invoices.last_action_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 8. Expense voucher columns on invoices  (Tally handoff at Processed transition)
--    Payment voucher fields live on payments table (WS-3), NOT on invoices.
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'expense_voucher_status');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN expense_voucher_status ENUM(''pending'',''posted'',''failed'',''retry'',''skipped'') NULL',
  'SELECT ''skip invoices.expense_voucher_status'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'expense_voucher_id');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN expense_voucher_id VARCHAR(128) NULL',
  'SELECT ''skip invoices.expense_voucher_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'expense_voucher_posted_at');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN expense_voucher_posted_at DATETIME NULL',
  'SELECT ''skip invoices.expense_voucher_posted_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'expense_voucher_error');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN expense_voucher_error TEXT NULL',
  'SELECT ''skip invoices.expense_voucher_error'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'expense_voucher_retry_count');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN expense_voucher_retry_count TINYINT NOT NULL DEFAULT 0',
  'SELECT ''skip invoices.expense_voucher_retry_count'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'expense_voucher_payload');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN expense_voucher_payload JSON NULL COMMENT ''Built at Processed transition; consumed by WS-2 Tally adapter''',
  'SELECT ''skip invoices.expense_voucher_payload'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 9. 3-way match persistence columns on invoices  (Q6 — snapshot-at-match-time)
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'match_result');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN match_result ENUM(''Fully Matched'',''Qty Mismatch'',''Rate Variance'',''Tolerance Breach'',''Partially Matched'',''Unmatched'',''Not Applicable'') NULL',
  'SELECT ''skip invoices.match_result'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'match_score');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN match_score DECIMAL(5,2) NULL COMMENT ''0-100 confidence from 3-way match engine; independent of match_result''',
  'SELECT ''skip invoices.match_score'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'match_details');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN match_details JSON NULL COMMENT ''Snapshot of PO/GRN qty/rate/tax at match time; reproducible from stored data alone''',
  'SELECT ''skip invoices.match_details'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'match_computed_at');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN match_computed_at DATETIME NULL',
  'SELECT ''skip invoices.match_computed_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 10. Duplicate detection columns on invoices  (Q4 — tiered)
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'duplicate_decision');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN duplicate_decision ENUM(''clear'',''tier_4_fuzzy'',''tier_3_cross_entity'',''tier_2_probable'',''tier_2b_cross_fy'',''tier_1_hard'') NULL',
  'SELECT ''skip invoices.duplicate_decision'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'duplicate_checked_at');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN duplicate_checked_at DATETIME NULL',
  'SELECT ''skip invoices.duplicate_checked_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'duplicate_override_by');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN duplicate_override_by VARCHAR(36) NULL',
  'SELECT ''skip invoices.duplicate_override_by'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'duplicate_override_at');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN duplicate_override_at DATETIME NULL',
  'SELECT ''skip invoices.duplicate_override_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'duplicate_override_reason');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN duplicate_override_reason TEXT NULL',
  'SELECT ''skip invoices.duplicate_override_reason'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 11. GST columns on invoices  (Level 3 match + place-of-supply + ITC)
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'supplier_gstin');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN supplier_gstin VARCHAR(15) NULL',
  'SELECT ''skip invoices.supplier_gstin'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'recipient_gstin');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN recipient_gstin VARCHAR(15) NULL',
  'SELECT ''skip invoices.recipient_gstin'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'place_of_supply');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN place_of_supply VARCHAR(2) NULL COMMENT ''GST state code (2 digits)''',
  'SELECT ''skip invoices.place_of_supply'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'gst_invoice_type');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN gst_invoice_type ENUM(''regular'',''rcm'',''sez_with_payment'',''sez_without_payment'',''export_with_payment'',''export_without_payment'',''composition'',''nil_rated'',''exempt'') NOT NULL DEFAULT ''regular''',
  'SELECT ''skip invoices.gst_invoice_type'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'itc_eligible');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN itc_eligible TINYINT(1) NOT NULL DEFAULT 1',
  'SELECT ''skip invoices.itc_eligible'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'itc_ineligible_reason');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoices ADD COLUMN itc_ineligible_reason VARCHAR(128) NULL',
  'SELECT ''skip invoices.itc_ineligible_reason'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 12. TDS line-level columns on invoice_line_items  (9-step engine output)
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'tds_applicable');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN tds_applicable TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT ''skip invoice_line_items.tds_applicable'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'tds_section');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN tds_section VARCHAR(16) NULL',
  'SELECT ''skip invoice_line_items.tds_section'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'tds_rate');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN tds_rate DECIMAL(5,2) NULL',
  'SELECT ''skip invoice_line_items.tds_rate'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'tds_base_amount');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN tds_base_amount DECIMAL(15,2) NULL',
  'SELECT ''skip invoice_line_items.tds_base_amount'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'tds_amount');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN tds_amount DECIMAL(15,2) NULL',
  'SELECT ''skip invoice_line_items.tds_amount'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'tds_threshold_exempted');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN tds_threshold_exempted TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT ''skip invoice_line_items.tds_threshold_exempted'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'tds_certificate_ref');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN tds_certificate_ref VARCHAR(64) NULL',
  'SELECT ''skip invoice_line_items.tds_certificate_ref'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 13. GST line-level breakdown on invoice_line_items
--     Reuses existing hsn_sac (VARCHAR(20)) and gst_rate (DECIMAL(5,2)) — no duplicates added.
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'taxable_amount');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN taxable_amount DECIMAL(15,2) NULL',
  'SELECT ''skip invoice_line_items.taxable_amount'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'cgst_amount');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN cgst_amount DECIMAL(15,2) NULL',
  'SELECT ''skip invoice_line_items.cgst_amount'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'sgst_amount');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN sgst_amount DECIMAL(15,2) NULL',
  'SELECT ''skip invoice_line_items.sgst_amount'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'igst_amount');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN igst_amount DECIMAL(15,2) NULL',
  'SELECT ''skip invoice_line_items.igst_amount'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'utgst_amount');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN utgst_amount DECIMAL(15,2) NULL',
  'SELECT ''skip invoice_line_items.utgst_amount'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'cess_rate');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN cess_rate DECIMAL(5,2) NULL',
  'SELECT ''skip invoice_line_items.cess_rate'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'cess_amount');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN cess_amount DECIMAL(15,2) NULL',
  'SELECT ''skip invoice_line_items.cess_amount'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_line_items' AND COLUMN_NAME = 'gst_ocr_discrepancy');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE invoice_line_items ADD COLUMN gst_ocr_discrepancy JSON NULL COMMENT ''OCR vs computed-GST variance details; material variance routes to exception''',
  'SELECT ''skip invoice_line_items.gst_ocr_discrepancy'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 14. Indexes for new WS-1a query patterns
-- -----------------------------------------------------------------------------

-- invoices(financial_year)
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_financial_year');
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_financial_year ON invoices (financial_year)',
  'SELECT ''skip idx_financial_year'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- invoices(service_period_from, service_period_to)
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_service_period');
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_service_period ON invoices (service_period_from, service_period_to)',
  'SELECT ''skip idx_service_period'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- invoices(last_action_at DESC)
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_last_action_at');
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_last_action_at ON invoices (last_action_at DESC)',
  'SELECT ''skip idx_last_action_at'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- invoices(vendor_id)
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_invoices_vendor_id');
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_invoices_vendor_id ON invoices (vendor_id)',
  'SELECT ''skip idx_invoices_vendor_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- invoices(source_invoice_id) — resubmission chain lookups
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_source_invoice_id');
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_source_invoice_id ON invoices (source_invoice_id)',
  'SELECT ''skip idx_source_invoice_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- invoices(supplier_gstin)
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_supplier_gstin');
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_supplier_gstin ON invoices (supplier_gstin)',
  'SELECT ''skip idx_supplier_gstin'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- invoices(place_of_supply)
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_place_of_supply');
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_place_of_supply ON invoices (place_of_supply)',
  'SELECT ''skip idx_place_of_supply'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- invoices(lifecycle_state) — listing filters, backfill queries
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_lifecycle_state');
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_lifecycle_state ON invoices (lifecycle_state)',
  'SELECT ''skip idx_lifecycle_state'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- invoices(duplicate_decision) — exception dashboards
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_duplicate_decision');
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_duplicate_decision ON invoices (duplicate_decision)',
  'SELECT ''skip idx_duplicate_decision'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- invoice_line_items(tds_section) — YTD aggregation queries
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoice_line_items' AND index_name = 'idx_tds_section');
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_tds_section ON invoice_line_items (tds_section)',
  'SELECT ''skip idx_tds_section'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
