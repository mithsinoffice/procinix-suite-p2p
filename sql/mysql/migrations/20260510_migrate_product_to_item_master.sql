-- ============================================================================
-- ITEM MASTER MIGRATION — 2026-05-10
-- ----------------------------------------------------------------------------
-- The bulk-upload "Item Master" UI was previously routed to
-- product_master.product_master via masterKey 'product_master', but /api/items
-- (and the PR form item picker) reads from item_master.item_master. Result:
-- 40 ITM-PTPL-* rows uploaded by the user landed in product_master and never
-- surfaced in the UI.
--
-- This migration moves rows whose payload carries `itemCode` from
-- product_master into item_master with the correct flat-schema mapping.
-- Idempotent via the uq_item_master_item_code UNIQUE index. Rows that
-- successfully migrate are then removed from product_master to prevent
-- double-bookkeeping.
-- ============================================================================

INSERT IGNORE INTO item_master.item_master (
  id, item_code, item_name, item_status, item_description, uom,
  procurement_category, hsn_code, sac_code, gst_rate, approval_status,
  tenant_id, created_at, updated_at
)
SELECT
  pm.id,
  JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.itemCode'))                            AS item_code,
  COALESCE(JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.itemName')), pm.record_name) AS item_name,
  COALESCE(pm.status, 'Active')                                                   AS item_status,
  JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.description'))                         AS item_description,
  JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.uom'))                                 AS uom,
  JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.category'))                            AS procurement_category,
  -- HSN if numeric and not starting with 99 (services), else leave blank
  CASE
    WHEN JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.hsnSacCode')) NOT LIKE '99%'
      THEN JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.hsnSacCode'))
    ELSE NULL
  END                                                                             AS hsn_code,
  CASE
    WHEN JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.hsnSacCode')) LIKE '99%'
      THEN JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.hsnSacCode'))
    ELSE NULL
  END                                                                             AS sac_code,
  CAST(JSON_EXTRACT(pm.payload, '$.taxRate') AS CHAR)                             AS gst_rate,
  COALESCE(pm.approval_status, 'Pending Approval')                                AS approval_status,
  'tenant-default-001'                                                            AS tenant_id,
  pm.created_at,
  pm.updated_at
FROM product_master.product_master pm
WHERE JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.itemCode')) LIKE 'ITM-%';

-- Now delete from product_master only those rows whose item_code successfully
-- landed in item_master (matches by item_code). Safer than deleting blindly:
-- if the INSERT IGNORE skipped a row due to duplicate item_code, we keep the
-- product_master copy as a safety net.
DELETE pm FROM product_master.product_master pm
INNER JOIN item_master.item_master im
  ON im.item_code = JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.itemCode'))
 AND im.id = pm.id
WHERE JSON_UNQUOTE(JSON_EXTRACT(pm.payload, '$.itemCode')) LIKE 'ITM-%';
