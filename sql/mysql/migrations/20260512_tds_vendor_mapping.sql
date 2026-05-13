-- ════════════════════════════════════════════════════════════════════════════
-- 20260512 — TDS section master normalisation + vendor → tds_section mapping
--
-- FIX 1: tds_section_master.tds_section_master — 10 canonical sections
--        Clean test pollution, add UNIQUE KEY on record_code, INSERT … ON
--        DUPLICATE KEY UPDATE so re-runs are no-op.
--
-- FIX 2: p2p_schema_mt.vendors — add `tds_section` column + map each vendor
--        to its statutory section based on vendor_type. MSME-flagged vendors
--        (vendor_pan_compliance.msme_category IS NOT NULL) keep their current
--        section (lower TDS rate by statute).
--
-- FIX 2b: vendor_pan_compliance.tds_sections JSON — synced from vendor.tds_section.
--
-- Idempotent: ALTER ADD COLUMN tolerated by applyAdHocMigrations.mjs;
-- ON DUPLICATE KEY UPDATE protects the seeds.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Purge test rows from tds_section_master ───────────────────────────────
DELETE FROM tds_section_master.tds_section_master WHERE id LIKE 'test-tds%';

-- ── 2) Add UNIQUE KEY on record_code (safe after dedupe) ─────────────────────
-- This is what makes ON DUPLICATE KEY UPDATE match by record_code below.
ALTER TABLE tds_section_master.tds_section_master
  ADD UNIQUE KEY uq_record_code (record_code);

-- ── 3) Upsert the 10 canonical sections ──────────────────────────────────────
-- Payload follows the shape the front-end already reads (rateIndividual /
-- rateCompany / rateNoTan / thresholdAmount / sectionCode / sectionName /
-- applicableTo / description). `record_code` is the natural key.
INSERT INTO tds_section_master.tds_section_master
  (id, record_code, record_name, status, approval_status, payload)
VALUES
  ('tds-194C', '194C',
   'Contractor / Sub-contractor Payments', 'Active', 'Approved',
   CAST('{"sectionCode":"194C","sectionName":"Contractor / Sub-contractor Payments","applicableTo":"Contractors","description":"TDS on payments to contractors and sub-contractors","rateIndividual":1,"rateCompany":2,"rateNoTan":20,"thresholdAmount":30000,"isActive":true,"status":"Active"}' AS JSON)),

  ('tds-194J', '194J',
   'Professional / Technical Services', 'Active', 'Approved',
   CAST('{"sectionCode":"194J","sectionName":"Professional / Technical Services","applicableTo":"Professionals","description":"TDS on fees for professional or technical services","rateIndividual":10,"rateCompany":10,"rateNoTan":20,"thresholdAmount":30000,"isActive":true,"status":"Active"}' AS JSON)),

  ('tds-194I-a', '194I(a)',
   'Rent on Plant & Machinery', 'Active', 'Approved',
   CAST('{"sectionCode":"194I(a)","sectionName":"Rent on Plant & Machinery","applicableTo":"All","description":"TDS on rent for plant and machinery","rateIndividual":2,"rateCompany":2,"rateNoTan":20,"thresholdAmount":240000,"isActive":true,"status":"Active"}' AS JSON)),

  ('tds-194I-b', '194I(b)',
   'Rent on Land / Building', 'Active', 'Approved',
   CAST('{"sectionCode":"194I(b)","sectionName":"Rent on Land / Building","applicableTo":"All","description":"TDS on rent for land, building or furniture","rateIndividual":10,"rateCompany":10,"rateNoTan":20,"thresholdAmount":240000,"isActive":true,"status":"Active"}' AS JSON)),

  ('tds-194H', '194H',
   'Commission / Brokerage', 'Active', 'Approved',
   CAST('{"sectionCode":"194H","sectionName":"Commission / Brokerage","applicableTo":"All","description":"TDS on commission and brokerage payments","rateIndividual":5,"rateCompany":5,"rateNoTan":20,"thresholdAmount":15000,"isActive":true,"status":"Active"}' AS JSON)),

  ('tds-194D', '194D',
   'Insurance Commission', 'Active', 'Approved',
   CAST('{"sectionCode":"194D","sectionName":"Insurance Commission","applicableTo":"All","description":"TDS on insurance commission","rateIndividual":5,"rateCompany":10,"rateNoTan":20,"thresholdAmount":15000,"isActive":true,"status":"Active"}' AS JSON)),

  ('tds-194A', '194A',
   'Interest (other than securities)', 'Active', 'Approved',
   CAST('{"sectionCode":"194A","sectionName":"Interest (other than securities)","applicableTo":"All","description":"TDS on interest other than interest on securities","rateIndividual":10,"rateCompany":10,"rateNoTan":20,"thresholdAmount":5000,"isActive":true,"status":"Active"}' AS JSON)),

  ('tds-194Q', '194Q',
   'Purchase of Goods', 'Active', 'Approved',
   CAST('{"sectionCode":"194Q","sectionName":"Purchase of Goods","applicableTo":"Buyers","description":"TDS on purchase of goods beyond threshold","rateIndividual":0.1,"rateCompany":0.1,"rateNoTan":5,"thresholdAmount":5000000,"isActive":true,"status":"Active"}' AS JSON)),

  ('tds-206AA', '206AA',
   'No-PAN Surcharge', 'Active', 'Approved',
   CAST('{"sectionCode":"206AA","sectionName":"No-PAN Surcharge","applicableTo":"All","description":"Higher TDS rate when deductee has not furnished PAN","rateIndividual":20,"rateCompany":20,"rateNoTan":20,"thresholdAmount":0,"isActive":true,"status":"Active"}' AS JSON)),

  ('tds-206AB', '206AB',
   'Non-Filer Surcharge', 'Active', 'Approved',
   CAST('{"sectionCode":"206AB","sectionName":"Non-Filer Surcharge","applicableTo":"All","description":"Higher TDS rate for non-filers of income tax returns","rateIndividual":5,"rateCompany":5,"rateNoTan":20,"thresholdAmount":0,"isActive":true,"status":"Active"}' AS JSON))
ON DUPLICATE KEY UPDATE
  record_name = VALUES(record_name),
  status = VALUES(status),
  approval_status = VALUES(approval_status),
  payload = VALUES(payload),
  updated_at = CURRENT_TIMESTAMP;

-- ── 4) Add tds_section column to operational vendors ─────────────────────────
ALTER TABLE vendors ADD COLUMN tds_section VARCHAR(20) NULL;
ALTER TABLE vendors ADD INDEX idx_tds_section (tds_section);

-- ── 5) Map vendors → 194J (services) or 194Q (goods). MSME-flagged vendors
--     keep their current TDS section (lower-TDS regime by statute). MSME flag
--     lives in vendor_pan_compliance.msme_category (non-NULL = registered).
UPDATE vendors v
  LEFT JOIN vendor_pan_compliance pc ON pc.vendor_id = v.id
   SET v.tds_section = '194J',
       v.updated_at = CURRENT_TIMESTAMP
 WHERE v.vendor_type = 'service_provider'
   AND COALESCE(pc.msme_category, '') = '';

UPDATE vendors v
  LEFT JOIN vendor_pan_compliance pc ON pc.vendor_id = v.id
   SET v.tds_section = '194Q',
       v.updated_at = CURRENT_TIMESTAMP
 WHERE v.vendor_type = 'goods_supplier'
   AND COALESCE(pc.msme_category, '') = '';

-- ── 6) Sync vendor_pan_compliance.tds_sections JSON from vendor.tds_section.
--     We replace the array wholesale: ['194J'] for services, ['194Q'] for
--     goods. MSME rows are skipped (same WHERE clause).
UPDATE vendor_pan_compliance pc
  JOIN vendors v ON v.id = pc.vendor_id
   SET pc.tds_sections = CAST('["194J"]' AS JSON),
       pc.updated_at = CURRENT_TIMESTAMP
 WHERE v.vendor_type = 'service_provider'
   AND COALESCE(pc.msme_category, '') = '';

UPDATE vendor_pan_compliance pc
  JOIN vendors v ON v.id = pc.vendor_id
   SET pc.tds_sections = CAST('["194Q"]' AS JSON),
       pc.updated_at = CURRENT_TIMESTAMP
 WHERE v.vendor_type = 'goods_supplier'
   AND COALESCE(pc.msme_category, '') = '';
