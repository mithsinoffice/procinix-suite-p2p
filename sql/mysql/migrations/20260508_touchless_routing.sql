-- Migration: touchless routing columns for invoices
-- Uses INFORMATION_SCHEMA guard (Azure MySQL 8.0 compatible — ADD COLUMN IF NOT EXISTS is unavailable).

SET @col1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'touchless');
SET @stmt1 = IF(@col1_exists = 0,
  'ALTER TABLE invoices ADD COLUMN touchless TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT ''skip touchless'' AS note');
PREPARE s FROM @stmt1; EXECUTE s; DEALLOCATE PREPARE s;

SET @col2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'touchless_score');
SET @stmt2 = IF(@col2_exists = 0,
  'ALTER TABLE invoices ADD COLUMN touchless_score DECIMAL(5,4) NULL',
  'SELECT ''skip touchless_score'' AS note');
PREPARE s FROM @stmt2; EXECUTE s; DEALLOCATE PREPARE s;

SET @col3_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'touchless_fail_reasons');
SET @stmt3 = IF(@col3_exists = 0,
  'ALTER TABLE invoices ADD COLUMN touchless_fail_reasons JSON NULL',
  'SELECT ''skip touchless_fail_reasons'' AS note');
PREPARE s FROM @stmt3; EXECUTE s; DEALLOCATE PREPARE s;

SET @col4_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'validated_by');
SET @stmt4 = IF(@col4_exists = 0,
  'ALTER TABLE invoices ADD COLUMN validated_by VARCHAR(255) NULL',
  'SELECT ''skip validated_by'' AS note');
PREPARE s FROM @stmt4; EXECUTE s; DEALLOCATE PREPARE s;

SET @col5_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'validated_at');
SET @stmt5 = IF(@col5_exists = 0,
  'ALTER TABLE invoices ADD COLUMN validated_at DATETIME NULL',
  'SELECT ''skip validated_at'' AS note');
PREPARE s FROM @stmt5; EXECUTE s; DEALLOCATE PREPARE s;
