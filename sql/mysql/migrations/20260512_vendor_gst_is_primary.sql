-- ============================================================================
-- 20260512_vendor_gst_is_primary.sql
--
-- Adds `is_primary` to vendor_gst_registrations (mirrors the convention used
-- by `vendor_spocs.is_primary` and `vendor_bank_accounts.is_primary`).
--
-- Backfills `is_primary = 1` for every vendor's first (sort_order=0) GST row.
-- This is the row consumers (vendor listing, invoice forms, compliance
-- projection) treat as the canonical GSTIN. Vendors with multiple
-- registrations (multi-state) keep `is_primary=0` on the secondary rows.
--
-- Idempotent — re-runs are no-ops:
--   • ALTER TABLE is guarded via INFORMATION_SCHEMA so a re-run skips the
--     ADD COLUMN.
--   • UPDATE is keyed on the primary-flag staying at 0, so once set it's not
--     toggled back.
-- ============================================================================

USE p2p_schema_mt;

-- 1. Add `is_primary` column when missing.
SET @col_exists := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = 'p2p_schema_mt'
     AND TABLE_NAME   = 'vendor_gst_registrations'
     AND COLUMN_NAME  = 'is_primary'
);
SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE p2p_schema_mt.vendor_gst_registrations ADD COLUMN is_primary TINYINT(1) NOT NULL DEFAULT 0 AFTER status',
  'SELECT ''vendor_gst_registrations.is_primary already exists'' AS migration_note'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Backfill `is_primary=1` for the canonical row per vendor.
--
-- Strategy: for each vendor pick its lowest sort_order, oldest created_at
-- GST row whose `gstin` is non-empty. Set its is_primary=1. Other rows for
-- the same vendor (if any) stay at 0.
UPDATE p2p_schema_mt.vendor_gst_registrations g
JOIN (
  SELECT vendor_id,
         (SELECT id
            FROM p2p_schema_mt.vendor_gst_registrations
           WHERE vendor_id = outer_g.vendor_id
             AND gstin IS NOT NULL AND gstin <> ''
           ORDER BY sort_order ASC, created_at ASC
           LIMIT 1) AS canonical_id
    FROM p2p_schema_mt.vendor_gst_registrations outer_g
   GROUP BY vendor_id
) primary_pick
  ON primary_pick.canonical_id = g.id
SET g.is_primary = 1
WHERE g.is_primary = 0;

-- 3. Defence-in-depth: ensure no vendor has two `is_primary=1` rows (only the
-- canonical pick above should be flagged). Flips any stragglers back to 0.
UPDATE p2p_schema_mt.vendor_gst_registrations g
JOIN (
  SELECT vendor_id, MIN(id) AS keep_id
    FROM p2p_schema_mt.vendor_gst_registrations
   WHERE is_primary = 1
   GROUP BY vendor_id
  HAVING COUNT(*) > 1
) dup
  ON dup.vendor_id = g.vendor_id
SET g.is_primary = 0
WHERE g.is_primary = 1
  AND g.id <> dup.keep_id;
