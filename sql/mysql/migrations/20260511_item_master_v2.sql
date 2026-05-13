-- ============================================================================
-- 20260511_item_master_v2.sql
-- Item Master V2:
--   1. Adds 4 columns to item_master.item_master:
--        standard_price       DECIMAL(15,2) NOT NULL DEFAULT 0
--        item_type            ENUM('material','service','asset','kit') NOT NULL DEFAULT 'material'
--        tax_code_id          VARCHAR(36) NULL   — logical FK → tax_code_master.tax_code_master.id
--        expense_category_id  VARCHAR(36) NULL   — logical FK → expense_category_master.expense_category_master.id
--      No DB-level FK constraints. Referenced masters live in separate MySQL
--      databases on this deployment; cross-DB FK enforcement isn't portable
--      and the canonical resolution stays at the application layer.
--   2. Backfills standard_price + item_type onto the original 25 ITM-* seed
--      rows (item_master_seeds, 2026-05-10) using mid-market reference prices.
--   3. Inserts 13 new ITM-* rows that converge with kit_bundle and rate-
--      contract item codes. Manufacturer codes preserved as item_alias for
--      cross-reference with the original kit/contract seeds.
--
-- Idempotency:
--   • INFORMATION_SCHEMA-guarded ALTERs skip if column already exists.
--   • UPDATEs are key-based by item_code and are no-ops on re-run when the
--     value matches.
--   • INSERT IGNORE on item_code UNIQUE skips dupes on re-run.
-- ============================================================================

USE item_master;

-- ── 1. ADD COLUMN standard_price ───────────────────────────────────────────
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = 'item_master' AND TABLE_NAME = 'item_master'
               AND COLUMN_NAME = 'standard_price');
SET @stmt := IF(@col = 0,
  'ALTER TABLE item_master.item_master ADD COLUMN standard_price DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER gst_rate',
  'SELECT ''skip standard_price'' AS migration_note');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2. ADD COLUMN item_type ────────────────────────────────────────────────
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = 'item_master' AND TABLE_NAME = 'item_master'
               AND COLUMN_NAME = 'item_type');
SET @stmt := IF(@col = 0,
  "ALTER TABLE item_master.item_master ADD COLUMN item_type ENUM('material','service','asset','kit') NOT NULL DEFAULT 'material' AFTER standard_price",
  'SELECT ''skip item_type'' AS migration_note');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 3. ADD COLUMN tax_code_id ──────────────────────────────────────────────
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = 'item_master' AND TABLE_NAME = 'item_master'
               AND COLUMN_NAME = 'tax_code_id');
SET @stmt := IF(@col = 0,
  'ALTER TABLE item_master.item_master ADD COLUMN tax_code_id VARCHAR(36) NULL AFTER item_type',
  'SELECT ''skip tax_code_id'' AS migration_note');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 4. ADD COLUMN expense_category_id ──────────────────────────────────────
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = 'item_master' AND TABLE_NAME = 'item_master'
               AND COLUMN_NAME = 'expense_category_id');
SET @stmt := IF(@col = 0,
  'ALTER TABLE item_master.item_master ADD COLUMN expense_category_id VARCHAR(36) NULL AFTER tax_code_id',
  'SELECT ''skip expense_category_id'' AS migration_note');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 5. Backfill item_type on existing 25 seed rows ─────────────────────────
-- Default rule: CAPEX → asset, SAC-coded service rows → service, else material.
UPDATE item_master.item_master
SET item_type = CASE
  WHEN sac_code IS NOT NULL AND sac_code <> '' THEN 'service'
  WHEN expenditure_type = 'CAPEX' THEN 'asset'
  ELSE 'material'
END
WHERE tenant_id = 'tenant-default-001' AND item_type = 'material';

-- ── 6. Backfill standard_price on existing 25 seed rows ────────────────────
UPDATE item_master.item_master SET standard_price = 55000 WHERE item_code = 'ITM-IT-001';
UPDATE item_master.item_master SET standard_price = 28000 WHERE item_code = 'ITM-IT-002';
UPDATE item_master.item_master SET standard_price =  5500 WHERE item_code = 'ITM-IT-003';
UPDATE item_master.item_master SET standard_price = 14000 WHERE item_code = 'ITM-IT-004';
UPDATE item_master.item_master SET standard_price =  3200 WHERE item_code = 'ITM-IT-005';
UPDATE item_master.item_master SET standard_price =   280 WHERE item_code = 'ITM-OFF-001';
UPDATE item_master.item_master SET standard_price =    50 WHERE item_code = 'ITM-OFF-002';
UPDATE item_master.item_master SET standard_price =   220 WHERE item_code = 'ITM-OFF-003';
UPDATE item_master.item_master SET standard_price =   150 WHERE item_code = 'ITM-OFF-004';
UPDATE item_master.item_master SET standard_price =   350 WHERE item_code = 'ITM-OFF-005';
UPDATE item_master.item_master SET standard_price = 12000 WHERE item_code = 'ITM-FUR-001';
UPDATE item_master.item_master SET standard_price = 25000 WHERE item_code = 'ITM-FUR-002';
UPDATE item_master.item_master SET standard_price = 18000 WHERE item_code = 'ITM-FUR-003';
UPDATE item_master.item_master SET standard_price =  4200 WHERE item_code = 'ITM-RAW-001';
UPDATE item_master.item_master SET standard_price =   320 WHERE item_code = 'ITM-RAW-002';
UPDATE item_master.item_master SET standard_price =   120 WHERE item_code = 'ITM-PKG-001';
UPDATE item_master.item_master SET standard_price =   950 WHERE item_code = 'ITM-PKG-002';
UPDATE item_master.item_master SET standard_price =   280 WHERE item_code = 'ITM-MRO-001';
UPDATE item_master.item_master SET standard_price =  1800 WHERE item_code = 'ITM-MRO-002';
UPDATE item_master.item_master SET standard_price =   850 WHERE item_code = 'ITM-MRO-003';
UPDATE item_master.item_master SET standard_price =  3500 WHERE item_code = 'ITM-MRO-004';
UPDATE item_master.item_master SET standard_price = 12000 WHERE item_code = 'ITM-SVC-001';
UPDATE item_master.item_master SET standard_price =  2500 WHERE item_code = 'ITM-SVC-002';
UPDATE item_master.item_master SET standard_price =   150 WHERE item_code = 'ITM-SVC-003';
UPDATE item_master.item_master SET standard_price = 18000 WHERE item_code = 'ITM-SVC-004';

-- ── 7. New 13 rows: kit + rate-contract item codes converge into item_master
-- Manufacturer codes (LAP-14IN-I7, …) preserved as item_alias so the original
-- kit_bundle / rate_contract seeds still cross-reference (via alias lookup at
-- the app layer).
INSERT IGNORE INTO item_master.item_master (
  id, item_code, item_alias, item_name, item_status, item_description, uom,
  procurement_category, expenditure_type, gl_account_code, gl_account_description,
  hsn_code, sac_code, gst_rate, standard_price, item_type,
  po_required, approval_status, tenant_id
) VALUES
  -- ── Onboarding laptop kit (TCS rate contract — kit BCM-PTPL-2026-0001) ──
  (UUID(), 'ITM-IT-006', 'LAP-14IN-I7', 'Laptop 14-inch i7', 'Active',
   '14-inch i7 / 16GB / 512GB SSD business laptop', 'NOS',
   'IT Hardware', 'CAPEX', '1601', 'Computers & Peripherals',
   '84713000', NULL, '18', 85000, 'asset', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-IT-007', 'CHG-90W-USBC', '90W USB-C Charger', 'Active',
   'Original 90W AC adapter', 'NOS',
   'IT Hardware', 'OPEX', '5601', 'IT Consumables',
   '85044030', NULL, '18', 2500, 'material', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-IT-008', 'MSE-WRL-001', 'Wireless Mouse', 'Active',
   'Standard wireless mouse', 'NOS',
   'IT Hardware', 'OPEX', '5601', 'IT Consumables',
   '84716060', NULL, '18', 800, 'material', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-IT-009', 'BAG-LAP-15', 'Laptop Carry Case', 'Active',
   '15-inch padded carry case', 'NOS',
   'IT Hardware', 'OPEX', '5601', 'IT Consumables',
   '42021290', NULL, '18', 1200, 'material', 'No', 'Approved', 'tenant-default-001'),

  -- ── Workstation desktop kit (Wipro IT peripherals — kit BCM-PTPL-2026-0002) ──
  (UUID(), 'ITM-IT-010', 'DESK-TWR-I5', 'Desktop Tower i5', 'Active',
   '12th Gen i5 / 8GB / 1TB desktop tower', 'NOS',
   'IT Hardware', 'CAPEX', '1601', 'Computers & Peripherals',
   '84713000', NULL, '18', 45000, 'asset', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-IT-011', 'MON-24IN-FHD', '24-inch FHD Monitor', 'Active',
   '24-inch full HD desktop monitor', 'NOS',
   'IT Hardware', 'CAPEX', '1601', 'Computers & Peripherals',
   '85285210', NULL, '18', 12000, 'asset', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-IT-012', 'KBD-USB-IND', 'USB Keyboard', 'Active',
   'Indian-layout USB keyboard', 'NOS',
   'IT Hardware', 'OPEX', '5601', 'IT Consumables',
   '84716070', NULL, '18', 600, 'material', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-IT-013', 'MSE-USB-OPT', 'USB Optical Mouse', 'Active',
   'Standard USB optical mouse', 'NOS',
   'IT Hardware', 'OPEX', '5601', 'IT Consumables',
   '84716060', NULL, '18', 400, 'material', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-IT-014', 'SPK-USB-BAR', 'USB Speaker Bar', 'Active',
   'Stereo USB speaker bar', 'NOS',
   'IT Hardware', 'OPEX', '5601', 'IT Consumables',
   '85182200', NULL, '18', 1500, 'material', 'No', 'Approved', 'tenant-default-001'),

  -- ── Light manufacturing tool kit (Rajan MSME — kit BCM-PTPL-2026-0003) ──
  (UUID(), 'ITM-MRO-005', 'TOOL-WRENCH-SET', 'Wrench Set 8-24mm', 'Active',
   '17-piece combination wrench set', 'SET',
   'MRO', 'OPEX', '5701', 'Repairs & Maintenance',
   '82041100', NULL, '18', 3500, 'material', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-MRO-006', 'TOOL-SCREW-SET', 'Screwdriver Set', 'Active',
   '20-piece precision screwdriver set', 'SET',
   'MRO', 'OPEX', '5701', 'Repairs & Maintenance',
   '82054000', NULL, '18', 1800, 'material', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-MRO-007', 'TOOL-PLIER-3PC', 'Pliers 3-piece', 'Active',
   'Combination + nose + cutting pliers', 'SET',
   'MRO', 'OPEX', '5701', 'Repairs & Maintenance',
   '82032000', NULL, '18', 1200, 'material', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-MRO-008', 'TOOL-HAMMER', 'Claw Hammer 0.5kg', 'Active',
   'Heavy-duty claw hammer', 'NOS',
   'MRO', 'OPEX', '5701', 'Repairs & Maintenance',
   '82052000', NULL, '18', 700, 'material', 'No', 'Approved', 'tenant-default-001');
