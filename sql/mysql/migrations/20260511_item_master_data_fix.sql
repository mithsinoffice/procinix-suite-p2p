-- ============================================================================
-- 20260511_item_master_data_fix.sql
-- Data-quality fix for item_master.item_master:
--   • rcm_applicable      — 'Yes' for SAC-coded service rows, 'No' for HSN
--   • nature              — 'Service' for SAC, 'Asset' for ITM-IT-* hardware,
--                            'Product' for everything else
--   • gst_rate            — normalise to consistent string ('5','12','18','28');
--                            strips numeric whitespace / trailing %
--   • gl_account_code +
--     expenditure_type    — backfill defaults by procurement_category
--   • uom                 — backfill NOS / HRS / MONTH / PCS / SET by category
--
-- Idempotency: every UPDATE is keyed by item_code or by predicate on existing
-- fields and is safe to re-run.
-- ============================================================================

USE item_master;

-- ── 1. Normalise gst_rate string format (strip whitespace, drop trailing %) ─
UPDATE item_master.item_master
SET gst_rate = TRIM(REPLACE(gst_rate, '%', ''))
WHERE gst_rate IS NOT NULL
  AND (gst_rate LIKE '% %' OR gst_rate LIKE '%\%');

-- Round float-form rates to integer string when applicable (e.g. '18.00' → '18').
UPDATE item_master.item_master
SET gst_rate = CAST(CAST(gst_rate AS DECIMAL(5,2)) AS UNSIGNED)
WHERE gst_rate REGEXP '^[0-9]+\\.0+$';

-- ── 2. rcm_applicable: services (SAC) → Yes, goods (HSN) → No ──────────────
UPDATE item_master.item_master
SET rcm_applicable = 'Yes'
WHERE sac_code IS NOT NULL AND sac_code <> ''
  AND (rcm_applicable IS NULL OR rcm_applicable = '' OR rcm_applicable = 'No');

UPDATE item_master.item_master
SET rcm_applicable = 'No'
WHERE hsn_code IS NOT NULL AND hsn_code <> ''
  AND (sac_code IS NULL OR sac_code = '')
  AND (rcm_applicable IS NULL OR rcm_applicable = '');

-- ── 3. nature: SAC → Service, ITM-IT-* → Asset, else Product ───────────────
UPDATE item_master.item_master
SET nature = 'Service'
WHERE sac_code IS NOT NULL AND sac_code <> ''
  AND (nature IS NULL OR nature = '' OR nature = 'Product');

UPDATE item_master.item_master
SET nature = 'Asset'
WHERE item_code LIKE 'ITM-IT-%'
  AND expenditure_type = 'CAPEX'
  AND (nature IS NULL OR nature = '' OR nature = 'Product');

UPDATE item_master.item_master
SET nature = 'Product'
WHERE hsn_code IS NOT NULL AND hsn_code <> ''
  AND (nature IS NULL OR nature = '');

-- ── 4. expenditure_type: backfill by procurement_category ──────────────────
-- CAPEX for hardware/asset categories; OPEX for everything else.
UPDATE item_master.item_master
SET expenditure_type = 'CAPEX'
WHERE procurement_category IN ('IT Hardware','Furniture','Capital Goods')
  AND nature = 'Asset'
  AND (expenditure_type IS NULL OR expenditure_type = '');

UPDATE item_master.item_master
SET expenditure_type = 'OPEX'
WHERE (expenditure_type IS NULL OR expenditure_type = '');

-- ── 5. gl_account_code defaults by procurement_category ────────────────────
-- Only fill rows where the column is null/empty — never overwrite a curated GL.
UPDATE item_master.item_master
SET gl_account_code = '1601',
    gl_account_description = COALESCE(NULLIF(gl_account_description,''),'Computers & Peripherals')
WHERE procurement_category = 'IT Hardware'
  AND expenditure_type = 'CAPEX'
  AND (gl_account_code IS NULL OR gl_account_code = '');

UPDATE item_master.item_master
SET gl_account_code = '5601',
    gl_account_description = COALESCE(NULLIF(gl_account_description,''),'IT Consumables')
WHERE procurement_category = 'IT Hardware'
  AND expenditure_type = 'OPEX'
  AND (gl_account_code IS NULL OR gl_account_code = '');

UPDATE item_master.item_master
SET gl_account_code = '5901',
    gl_account_description = COALESCE(NULLIF(gl_account_description,''),'Office Supplies')
WHERE procurement_category = 'Office Supplies'
  AND (gl_account_code IS NULL OR gl_account_code = '');

UPDATE item_master.item_master
SET gl_account_code = '1700',
    gl_account_description = COALESCE(NULLIF(gl_account_description,''),'Furniture & Fixtures')
WHERE procurement_category = 'Furniture'
  AND (gl_account_code IS NULL OR gl_account_code = '');

UPDATE item_master.item_master
SET gl_account_code = '5701',
    gl_account_description = COALESCE(NULLIF(gl_account_description,''),'Repairs & Maintenance')
WHERE procurement_category = 'MRO'
  AND (gl_account_code IS NULL OR gl_account_code = '');

UPDATE item_master.item_master
SET gl_account_code = '5001',
    gl_account_description = COALESCE(NULLIF(gl_account_description,''),'Raw Materials')
WHERE procurement_category IN ('Raw Materials','Packaging')
  AND (gl_account_code IS NULL OR gl_account_code = '');

UPDATE item_master.item_master
SET gl_account_code = '5301',
    gl_account_description = COALESCE(NULLIF(gl_account_description,''),'Professional Fees')
WHERE procurement_category IN ('Professional Services','IT Services')
  AND (gl_account_code IS NULL OR gl_account_code = '');

UPDATE item_master.item_master
SET gl_account_code = '5401',
    gl_account_description = COALESCE(NULLIF(gl_account_description,''),'Travel & Conveyance')
WHERE procurement_category IN ('Travel & Admin','Logistics')
  AND (gl_account_code IS NULL OR gl_account_code = '');

UPDATE item_master.item_master
SET gl_account_code = '5901',
    gl_account_description = COALESCE(NULLIF(gl_account_description,''),'Miscellaneous')
WHERE (gl_account_code IS NULL OR gl_account_code = '');

-- ── 6. uom defaults by category ────────────────────────────────────────────
UPDATE item_master.item_master
SET uom = 'NOS'
WHERE procurement_category IN ('IT Hardware','Furniture')
  AND (uom IS NULL OR uom = '');

UPDATE item_master.item_master
SET uom = 'HRS'
WHERE procurement_category IN ('Professional Services')
  AND (uom IS NULL OR uom = '');

UPDATE item_master.item_master
SET uom = 'MONTH'
WHERE procurement_category IN ('IT Services')
  AND (uom IS NULL OR uom = '');

UPDATE item_master.item_master
SET uom = 'PCS'
WHERE procurement_category IN ('Office Supplies','Packaging','MRO')
  AND (uom IS NULL OR uom = '');

UPDATE item_master.item_master
SET uom = 'NOS'
WHERE uom IS NULL OR uom = '';
