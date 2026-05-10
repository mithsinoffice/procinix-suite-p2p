-- ============================================================================
-- UPLOAD SOURCE TRACKING + AUDIT TABLE ALIGNMENT — 2026-05-10
-- ============================================================================
-- 1. Add upload_source column to item_master (canonical erp_master_* tables
--    already carry it inside payload JSON, so no schema change there).
-- 2. Backfill the 40 ITM-PTPL rows that landed via bulk upload — flip them
--    to approval_status = 'Approved' and tag upload_source = 'bulk_upload'.
-- 3. Align vendor_group_master_audit to the standard audit schema so
--    appendMasterVersion's INSERT no longer fails with
--    `Unknown column 'action_type'`. Adds the standard column trio
--    (action_type / old_values / new_values) and backfills from the legacy
--    columns (action / before_payload / after_payload) for any rows already
--    written.
-- ============================================================================

-- ── 1. item_master.upload_source column ─────────────────────────────────────
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'item_master'
    AND TABLE_NAME   = 'item_master'
    AND COLUMN_NAME  = 'upload_source'
);
SET @stmt := IF(
  @col_exists = 0,
  'ALTER TABLE item_master.item_master ADD COLUMN upload_source VARCHAR(50) NULL AFTER tenant_id',
  'SELECT 1'
);
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

-- ── 2. Backfill ITM-PTPL bulk upload rows ───────────────────────────────────
UPDATE item_master.item_master
SET approval_status = 'Approved',
    upload_source = 'bulk_upload'
WHERE item_code LIKE 'ITM-PTPL-%';

-- ── 3a. vendor_group_master_audit: add standard columns if missing ─────────
SET @at_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'vendor_group_master'
    AND TABLE_NAME   = 'vendor_group_master_audit'
    AND COLUMN_NAME  = 'action_type'
);
SET @stmt := IF(
  @at_exists = 0,
  'ALTER TABLE vendor_group_master.vendor_group_master_audit ADD COLUMN action_type VARCHAR(40) NULL AFTER record_id',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @ov_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'vendor_group_master'
    AND TABLE_NAME   = 'vendor_group_master_audit'
    AND COLUMN_NAME  = 'old_values'
);
SET @stmt := IF(
  @ov_exists = 0,
  'ALTER TABLE vendor_group_master.vendor_group_master_audit ADD COLUMN old_values JSON NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @nv_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'vendor_group_master'
    AND TABLE_NAME   = 'vendor_group_master_audit'
    AND COLUMN_NAME  = 'new_values'
);
SET @stmt := IF(
  @nv_exists = 0,
  'ALTER TABLE vendor_group_master.vendor_group_master_audit ADD COLUMN new_values JSON NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 3b. Backfill standard columns from legacy ones ──────────────────────────
UPDATE vendor_group_master.vendor_group_master_audit
SET action_type = COALESCE(action_type, action),
    old_values  = COALESCE(old_values, before_payload),
    new_values  = COALESCE(new_values, after_payload)
WHERE action_type IS NULL OR old_values IS NULL OR new_values IS NULL;

-- ── 3c. Make legacy NOT NULL columns nullable so new inserts (which write
--        the modern action_type / old_values / new_values trio) don't fail
--        on the legacy `action` / `before_payload` / `after_payload`.
SET @sql := (
  SELECT CONCAT(
    'ALTER TABLE vendor_group_master.vendor_group_master_audit MODIFY COLUMN action ',
    UPPER(COLUMN_TYPE), ' NULL'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'vendor_group_master'
    AND TABLE_NAME   = 'vendor_group_master_audit'
    AND COLUMN_NAME  = 'action'
    AND IS_NULLABLE  = 'NO'
);
SET @sql := IFNULL(@sql, 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
