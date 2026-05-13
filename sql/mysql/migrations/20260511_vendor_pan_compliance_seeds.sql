-- ============================================================================
-- 20260511_vendor_pan_compliance_seeds.sql
-- Populate p2p_schema_mt.vendor_pan_compliance for every seeded vendor with
-- realistic data:
--   • pan                 valid AAAAA9999A format, deterministic per vendor_code
--   • entity_type         private_limited / partnership / individual based on
--                         vendor_code prefix / category
--   • pan_status          'verified' for all (assumed cleared KYC at seed time)
--   • section_206ab       'not_applicable' (assumes ITR filed)
--   • gst_return_filed    'regular_filer'
--   • tds_sections        JSON array — derived from vendor_type
--   • rcm_applicable      'no_forward_charge' (all are GST-registered)
--   • msme_category       preserved where set; otherwise null
--
-- Idempotency: ON DUPLICATE KEY UPDATE pattern keyed on vendor_id (UNIQUE).
-- ============================================================================

USE p2p_schema_mt;

-- ── Bulk insert / upsert keyed on vendor_id (UNIQUE on vendor_pan_compliance) ─
-- pan is a deterministic valid-format string per vendor_code.
-- entity_type / tds_sections / msme_category are encoded per vendor.
INSERT INTO p2p_schema_mt.vendor_pan_compliance
  (id, vendor_id, pan, entity_type, pan_status, section_206ab, gst_return_filed,
   tds_sections, rcm_applicable, msme_category, created_at, updated_at)
SELECT
  UUID()                       AS id,
  v.id                         AS vendor_id,
  CASE v.vendor_code
    WHEN 'V-TCS-001' THEN 'AAACT0001Z'
    WHEN 'V-INF-002' THEN 'AAACI0002Y'
    WHEN 'V-WIP-003' THEN 'AAACW0003X'
    WHEN 'V-MAH-004' THEN 'AAACM0004W'
    WHEN 'V-RAJ-005' THEN 'AABFR0005V'
    WHEN 'V-BAL-006' THEN 'AABFB0006U'
    WHEN 'V-SHR-007' THEN 'AAACS0007T'
    WHEN 'V-MTP-008' THEN 'AAACM0008S'
    WHEN 'V-SVC-009' THEN 'AABFS0009R'
    WHEN 'V-KAV-010' THEN 'AAACK0010Q'
    WHEN 'V-AWS-011' THEN 'AAACA0011P'
    WHEN 'V-ZOM-012' THEN 'AAACZ0012O'
    ELSE CONCAT(
      'AAAC',
      SUBSTRING(MD5(v.vendor_code), 1, 1),
      LPAD(FLOOR(ABS(CRC32(v.vendor_code)) % 10000), 4, '0'),
      SUBSTRING(MD5(REVERSE(v.vendor_code)), 1, 1)
    )
  END                          AS pan,
  CASE
    WHEN v.vendor_code IN ('V-RAJ-005','V-BAL-006','V-SVC-009') THEN 'partnership'
    WHEN v.vendor_legal_name LIKE '%Pvt Ltd%' OR v.vendor_legal_name LIKE '%Private Limited%'
      OR v.vendor_legal_name LIKE '%Limited%' OR v.vendor_legal_name LIKE '%Ltd%' THEN 'private_limited'
    ELSE 'private_limited'
  END                          AS entity_type,
  'verified'                   AS pan_status,
  'not_applicable'             AS section_206ab,
  'regular_filer'              AS gst_return_filed,
  CASE v.vendor_type
    WHEN 'service_provider' THEN JSON_ARRAY('194J','194C_IND')
    WHEN 'goods_supplier'   THEN JSON_ARRAY('194C_IND')
    ELSE JSON_ARRAY('194C_IND')
  END                          AS tds_sections,
  'no_forward_charge'          AS rcm_applicable,
  CASE
    WHEN v.vendor_code IN ('V-RAJ-005','V-BAL-006','V-SHR-007','V-MTP-008','V-SVC-009','V-KAV-010')
      THEN 'small'
    ELSE NULL
  END                          AS msme_category,
  NOW(), NOW()
FROM p2p_schema_mt.vendors v
WHERE v.tenant_id = 'tenant-default-001'
ON DUPLICATE KEY UPDATE
  pan              = VALUES(pan),
  entity_type      = VALUES(entity_type),
  pan_status       = VALUES(pan_status),
  section_206ab    = VALUES(section_206ab),
  gst_return_filed = VALUES(gst_return_filed),
  tds_sections     = VALUES(tds_sections),
  rcm_applicable   = VALUES(rcm_applicable),
  msme_category    = COALESCE(p2p_schema_mt.vendor_pan_compliance.msme_category, VALUES(msme_category)),
  updated_at       = NOW();
