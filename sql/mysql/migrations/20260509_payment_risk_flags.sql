-- Payment Queue + Risk Flags
-- ============================================================================
-- 1. invoice_risk_flags: per-invoice flag fires from the 12-rule evaluator.
--    Cleared by approver-only workflow (cleared_by + clearance_note required).
-- 2. invoice_audit_log: extend with change_type/old_value/new_value/reason
--    so due-date edits and other field-level changes are auditable.
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_risk_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  flag_id VARCHAR(50) NOT NULL,
  severity ENUM('high','medium','low') NOT NULL,
  detail TEXT,
  is_cleared TINYINT(1) NOT NULL DEFAULT 0,
  cleared_by VARCHAR(100),
  clearance_note TEXT,
  cleared_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id, tenant_id),
  INDEX idx_cleared (is_cleared),
  INDEX idx_tenant_severity (tenant_id, severity, is_cleared)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- invoice_audit_log: add field-change columns. The base table already has
-- id, tenant_id, invoice_id, action, from_state, to_state, actor_id,
-- actor_source, reason_code, reason_note, created_at — so we add the four
-- new columns guarded by INFORMATION_SCHEMA so this migration is idempotent.

SET @sql := (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'invoice_audit_log'
      AND COLUMN_NAME = 'change_type') = 0,
  'ALTER TABLE invoice_audit_log ADD COLUMN change_type VARCHAR(50) NULL AFTER action',
  'SELECT ''skip change_type'' AS migration_note'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'invoice_audit_log'
      AND COLUMN_NAME = 'old_value') = 0,
  'ALTER TABLE invoice_audit_log ADD COLUMN old_value TEXT NULL AFTER change_type',
  'SELECT ''skip old_value'' AS migration_note'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'invoice_audit_log'
      AND COLUMN_NAME = 'new_value') = 0,
  'ALTER TABLE invoice_audit_log ADD COLUMN new_value TEXT NULL AFTER old_value',
  'SELECT ''skip new_value'' AS migration_note'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'invoice_audit_log'
      AND COLUMN_NAME = 'reason') = 0,
  'ALTER TABLE invoice_audit_log ADD COLUMN reason TEXT NULL AFTER new_value',
  'SELECT ''skip reason'' AS migration_note'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
