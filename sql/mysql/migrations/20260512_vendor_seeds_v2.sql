-- ============================================================================
-- 20260512_vendor_seeds_v2.sql
--
-- Brings the V-* seed vendor set up to 20 realistic Indian mid-market vendors
-- with full data: GSTIN, PAN, registered address with pincode, vendor_type,
-- bank account + IFSC, primary SPOC email + phone, MSME flag where applicable,
-- and TDS sections.
--
-- Scope: 12 existing V-XXX-NNN (V-TCS-001 .. V-ZOM-012) get enriched in place;
-- 8 new V-XXX-NNN (V-CYR-013 .. V-PRX-020) are inserted. Test rows (TEST-*),
-- user-created rows (V-MNZPNKS8 / VC-* / VND-*) are NOT touched — this
-- migration only affects vendor_codes in the explicit 20-row set below.
--
-- Mix: IT services (TCS, Infosys, Wipro, AWS), logistics (Mahindra), hardware
-- / parts manufacturers (Rajan, Balaji, Shree Fab, Micro Tech, Sri Venkat),
-- utilities (Kaveri), catering/aggregator (Zomato), legal (Cyril Amarchand),
-- consulting (Deloitte), facility mgmt (JLL), travel (Thomas Cook), office
-- supplies (Office Mart), catering/food services (Sodexo), IT distribution
-- (Redington), small consulting (Praxis).
--
-- GSTIN format: stateCode(2) + PAN(10) + entityNum(1) + 'Z' + checkDigit(1).
-- States used: Maharashtra (27), Karnataka (29), Delhi (07), Tamil Nadu (33),
-- Gujarat (24), Telangana (36) — all valid Indian state codes.
--
-- PAN format: AAAAA9999A. 4th char encodes entity type — 'C' for company,
-- 'F' for firm/partnership. MSME vendors use 'F'.
--
-- Idempotency: vendors UNIQUE on vendor_code → ON DUPLICATE KEY UPDATE
-- enriches existing rows. vendor_pan_compliance UNIQUE on vendor_id → same.
-- Child tables (vendor_gst_registrations / vendor_bank_accounts /
-- vendor_spocs) have no UNIQUE on vendor_id — guarded with WHERE NOT EXISTS
-- keyed on (vendor_id, natural_key) so re-runs are no-ops.
--
-- payment_terms (30/45/60) is NOT stored on the vendor row — schema has no
-- such column. Vendor-level default payment terms live in
-- vendor_payment_terms_master and are picked at invoice creation time.
-- ============================================================================

USE p2p_schema_mt;

-- ── 1. Upsert 20 vendors with full address + pin_code + group ─────────────
INSERT INTO p2p_schema_mt.vendors
  (id, vendor_code, vendor_legal_name, vendor_trade_name, vendor_group_name,
   vendor_type, address_line, city, state, pin_code, country, status, is_active, tenant_id)
VALUES
  (UUID(),'V-TCS-001','Tata Consultancy Services Limited',          'TCS',                  'Tata Group',     'service_provider','Nirmal Building, 9th Floor, Nariman Point','Mumbai',   'Maharashtra','400021','India','active',1,'tenant-default-001'),
  (UUID(),'V-INF-002','Infosys BPM Limited',                         'Infosys BPM',          NULL,             'service_provider','Plot 26/3, 26/4 & 26/6, Electronics City Phase 1','Bangalore','Karnataka',  '560100','India','active',1,'tenant-default-001'),
  (UUID(),'V-WIP-003','Wipro Infrastructure Engineering Limited',    'Wipro Infra',          'Wipro Group',    'service_provider','Doddakannelli, Sarjapur Road',         'Bangalore','Karnataka',  '560035','India','active',1,'tenant-default-001'),
  (UUID(),'V-MAH-004','Mahindra Logistics Limited',                  'Mahindra Logistics',   'Mahindra Group', 'service_provider','Mahindra Towers, Dr G M Bhosale Marg, Worli','Mumbai',   'Maharashtra','400018','India','active',1,'tenant-default-001'),
  (UUID(),'V-RAJ-005','Rajan Tooling Works',                         'Rajan Tooling',        NULL,             'goods_supplier',  'Plot 47, GIDC Industrial Estate, Makarpura','Vadodara', 'Gujarat',    '390010','India','active',1,'tenant-default-001'),
  (UUID(),'V-BAL-006','Balaji Micro Components',                     'Balaji Components',    NULL,             'goods_supplier',  'No 12, SIDCO Industrial Estate, Guindy','Chennai',  'Tamil Nadu', '600032','India','active',1,'tenant-default-001'),
  (UUID(),'V-SHR-007','Shree Fab Works Pvt Ltd',                     'Shree Fab',            NULL,             'goods_supplier',  'Plot 18, MIDC Bhosari Industrial Area','Pune',     'Maharashtra','411026','India','active',1,'tenant-default-001'),
  (UUID(),'V-MTP-008','Micro Tech Plastics Pvt Ltd',                 'Micro Tech',           NULL,             'goods_supplier',  'Gala 7, Vasai Industrial Estate, Vasai East','Mumbai',   'Maharashtra','401208','India','active',1,'tenant-default-001'),
  (UUID(),'V-SVC-009','Sri Venkat Castings',                         'Sri Venkat',           NULL,             'goods_supplier',  'Plot 9, IDA Jeedimetla',                'Hyderabad','Telangana',  '500055','India','active',1,'tenant-default-001'),
  (UUID(),'V-KAV-010','Kaveri Power & Light Ltd',                    'Kaveri Power',         NULL,             'goods_supplier',  'No 56, Whitefield Industrial Area',     'Bangalore','Karnataka',  '560066','India','active',1,'tenant-default-001'),
  (UUID(),'V-AWS-011','Amazon Web Services India Private Limited',   'AWS India',            NULL,             'service_provider','7th Floor, Tower A, DLF Building No 5, Cyber City','Gurugram','Haryana',   '122002','India','active',1,'tenant-default-001'),
  (UUID(),'V-ZOM-012','Zomato Limited',                              'Zomato',               NULL,             'service_provider','Ground Floor, 12A, 94 Meghdoot, Nehru Place','New Delhi','Delhi',      '110019','India','active',1,'tenant-default-001'),
  (UUID(),'V-CYR-013','Cyril Amarchand Mangaldas',                   'CAM Legal',            NULL,             'service_provider','Peninsula Chambers, Peninsula Corporate Park, Lower Parel','Mumbai',   'Maharashtra','400013','India','active',1,'tenant-default-001'),
  (UUID(),'V-DEL-014','Deloitte Haskins & Sells LLP',                'Deloitte India',       NULL,             'service_provider','One International Center, Tower 3, Senapati Bapat Marg','Mumbai',   'Maharashtra','400013','India','active',1,'tenant-default-001'),
  (UUID(),'V-JLL-015','Jones Lang LaSalle Property Consultants India Pvt Ltd','JLL India',   NULL,             'service_provider','Level 3, Prestige Nebula, Cubbon Road',  'Bangalore','Karnataka',  '560001','India','active',1,'tenant-default-001'),
  (UUID(),'V-TCK-016','Thomas Cook (India) Limited',                 'Thomas Cook',          NULL,             'service_provider','Thomas Cook Building, Dr DN Road, Fort','Mumbai',   'Maharashtra','400001','India','active',1,'tenant-default-001'),
  (UUID(),'V-OFM-017','Office Mart Supplies Private Limited',        'Office Mart',          NULL,             'goods_supplier',  'Plot 14, Okhla Industrial Estate Phase II','New Delhi','Delhi',      '110020','India','active',1,'tenant-default-001'),
  (UUID(),'V-SOD-018','Sodexo Food Solutions India Private Limited', 'Sodexo India',         NULL,             'service_provider','21st Floor, Tower 4, Equinox Business Park, LBS Marg','Mumbai',   'Maharashtra','400070','India','active',1,'tenant-default-001'),
  (UUID(),'V-RED-019','Redington Limited',                           'Redington',            NULL,             'goods_supplier',  'SPL Guindy House, 95 Mount Road, Guindy','Chennai',  'Tamil Nadu', '600032','India','active',1,'tenant-default-001'),
  (UUID(),'V-PRX-020','Praxis Consulting Private Limited',           'Praxis Consulting',    NULL,             'service_provider','3rd Floor, Brigade Tech Gardens, Whitefield','Bangalore','Karnataka',  '560066','India','active',1,'tenant-default-001')
ON DUPLICATE KEY UPDATE
  vendor_legal_name = VALUES(vendor_legal_name),
  vendor_trade_name = VALUES(vendor_trade_name),
  vendor_group_name = VALUES(vendor_group_name),
  vendor_type       = VALUES(vendor_type),
  address_line      = VALUES(address_line),
  city              = VALUES(city),
  state             = VALUES(state),
  pin_code          = VALUES(pin_code),
  country           = VALUES(country),
  status            = VALUES(status),
  is_active         = VALUES(is_active),
  updated_at        = NOW();

-- Backfill vendor_group_id where vendor_group_name has a matching master row.
UPDATE p2p_schema_mt.vendors v
JOIN vendor_group_master.vendor_group_master g
  ON g.tenant_id = v.tenant_id
 AND g.record_name = v.vendor_group_name
SET v.vendor_group_id = g.id, v.vendor_group_code = g.record_code
WHERE v.vendor_group_name IS NOT NULL
  AND v.vendor_code IN
    ('V-TCS-001','V-INF-002','V-WIP-003','V-MAH-004','V-RAJ-005','V-BAL-006',
     'V-SHR-007','V-MTP-008','V-SVC-009','V-KAV-010','V-AWS-011','V-ZOM-012',
     'V-CYR-013','V-DEL-014','V-JLL-015','V-TCK-016','V-OFM-017','V-SOD-018',
     'V-RED-019','V-PRX-020');

-- ── 2. Upsert vendor_pan_compliance (UNIQUE on vendor_id) ─────────────────
INSERT INTO p2p_schema_mt.vendor_pan_compliance
  (id, vendor_id, pan, entity_type, pan_status, section_206ab, gst_return_filed,
   tds_sections, rcm_applicable, msme_category, kyc_verified, created_at, updated_at)
SELECT
  UUID() AS id,
  v.id   AS vendor_id,
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
    WHEN 'V-CYR-013' THEN 'AAFCC0013N'
    WHEN 'V-DEL-014' THEN 'AAFCD0014M'
    WHEN 'V-JLL-015' THEN 'AAACJ0015L'
    WHEN 'V-TCK-016' THEN 'AAACT0016K'
    WHEN 'V-OFM-017' THEN 'AAACO0017J'
    WHEN 'V-SOD-018' THEN 'AAACS0018I'
    WHEN 'V-RED-019' THEN 'AAACR0019H'
    WHEN 'V-PRX-020' THEN 'AAACP0020G'
  END AS pan,
  CASE
    WHEN v.vendor_code IN ('V-RAJ-005','V-BAL-006','V-SVC-009') THEN 'partnership'
    WHEN v.vendor_code IN ('V-CYR-013','V-DEL-014')             THEN 'llp'
    ELSE 'private_limited'
  END AS entity_type,
  'verified'         AS pan_status,
  'not_applicable'   AS section_206ab,
  'regular_filer'    AS gst_return_filed,
  CASE v.vendor_type
    WHEN 'service_provider' THEN JSON_ARRAY('194J','194C_IND')
    WHEN 'goods_supplier'   THEN JSON_ARRAY('194C_IND')
    ELSE JSON_ARRAY('194C_IND')
  END AS tds_sections,
  'no_forward_charge' AS rcm_applicable,
  CASE
    WHEN v.vendor_code IN
      ('V-RAJ-005','V-BAL-006','V-SHR-007','V-MTP-008','V-SVC-009','V-KAV-010','V-PRX-020')
      THEN 'small'
    ELSE NULL
  END AS msme_category,
  1 AS kyc_verified,
  NOW(), NOW()
FROM p2p_schema_mt.vendors v
WHERE v.vendor_code IN
  ('V-TCS-001','V-INF-002','V-WIP-003','V-MAH-004','V-RAJ-005','V-BAL-006',
   'V-SHR-007','V-MTP-008','V-SVC-009','V-KAV-010','V-AWS-011','V-ZOM-012',
   'V-CYR-013','V-DEL-014','V-JLL-015','V-TCK-016','V-OFM-017','V-SOD-018',
   'V-RED-019','V-PRX-020')
ON DUPLICATE KEY UPDATE
  pan              = VALUES(pan),
  entity_type      = VALUES(entity_type),
  pan_status       = VALUES(pan_status),
  section_206ab    = VALUES(section_206ab),
  gst_return_filed = VALUES(gst_return_filed),
  tds_sections     = VALUES(tds_sections),
  rcm_applicable   = VALUES(rcm_applicable),
  msme_category    = VALUES(msme_category),
  kyc_verified     = VALUES(kyc_verified),
  updated_at       = NOW();

-- ── 3. Insert vendor_gst_registrations (one primary GSTIN per vendor) ─────
-- vendor_gst_registrations has no UNIQUE constraint — guard with NOT EXISTS
-- on (vendor_id, gstin). Re-runs become no-ops.
INSERT INTO p2p_schema_mt.vendor_gst_registrations
  (id, vendor_id, gstin, gst_type, state, gst_state_code, city, pin_code,
   address, status, sort_order, created_at)
SELECT
  UUID() AS id,
  v.id   AS vendor_id,
  CASE v.vendor_code
    WHEN 'V-TCS-001' THEN '27AAACT0001Z1Z5'
    WHEN 'V-INF-002' THEN '29AAACI0002Y1Z3'
    WHEN 'V-WIP-003' THEN '29AAACW0003X1Z1'
    WHEN 'V-MAH-004' THEN '27AAACM0004W1Z9'
    WHEN 'V-RAJ-005' THEN '24AABFR0005V1Z7'
    WHEN 'V-BAL-006' THEN '33AABFB0006U1Z5'
    WHEN 'V-SHR-007' THEN '27AAACS0007T1Z3'
    WHEN 'V-MTP-008' THEN '27AAACM0008S1Z1'
    WHEN 'V-SVC-009' THEN '36AABFS0009R1Z9'
    WHEN 'V-KAV-010' THEN '29AAACK0010Q1Z7'
    WHEN 'V-AWS-011' THEN '06AAACA0011P1Z5'
    WHEN 'V-ZOM-012' THEN '07AAACZ0012O1Z3'
    WHEN 'V-CYR-013' THEN '27AAFCC0013N1Z1'
    WHEN 'V-DEL-014' THEN '27AAFCD0014M1Z9'
    WHEN 'V-JLL-015' THEN '29AAACJ0015L1Z7'
    WHEN 'V-TCK-016' THEN '27AAACT0016K1Z5'
    WHEN 'V-OFM-017' THEN '07AAACO0017J1Z3'
    WHEN 'V-SOD-018' THEN '27AAACS0018I1Z1'
    WHEN 'V-RED-019' THEN '33AAACR0019H1Z9'
    WHEN 'V-PRX-020' THEN '29AAACP0020G1Z7'
  END AS gstin,
  'regular' AS gst_type,
  v.state,
  CASE v.state
    WHEN 'Maharashtra' THEN '27'
    WHEN 'Karnataka'   THEN '29'
    WHEN 'Delhi'       THEN '07'
    WHEN 'Tamil Nadu'  THEN '33'
    WHEN 'Gujarat'     THEN '24'
    WHEN 'Telangana'   THEN '36'
    WHEN 'Haryana'     THEN '06'
  END AS gst_state_code,
  v.city,
  v.pin_code,
  v.address_line,
  'active' AS status,
  0 AS sort_order,
  NOW()
FROM p2p_schema_mt.vendors v
WHERE v.vendor_code IN
  ('V-TCS-001','V-INF-002','V-WIP-003','V-MAH-004','V-RAJ-005','V-BAL-006',
   'V-SHR-007','V-MTP-008','V-SVC-009','V-KAV-010','V-AWS-011','V-ZOM-012',
   'V-CYR-013','V-DEL-014','V-JLL-015','V-TCK-016','V-OFM-017','V-SOD-018',
   'V-RED-019','V-PRX-020')
  AND NOT EXISTS (
    SELECT 1 FROM p2p_schema_mt.vendor_gst_registrations g
    WHERE g.vendor_id = v.id
  );

-- ── 4. Insert vendor_bank_accounts (one primary current account per vendor)
INSERT INTO p2p_schema_mt.vendor_bank_accounts
  (id, vendor_id, account_number, ifsc_code, branch_name, bank_name,
   account_type, currency, is_primary, status, sort_order, created_at)
SELECT
  UUID() AS id,
  v.id   AS vendor_id,
  CASE v.vendor_code
    WHEN 'V-TCS-001' THEN '50100012345001'
    WHEN 'V-INF-002' THEN '00601610002034'
    WHEN 'V-WIP-003' THEN '50100023456012'
    WHEN 'V-MAH-004' THEN '00481230045678'
    WHEN 'V-RAJ-005' THEN '38912450005678'
    WHEN 'V-BAL-006' THEN '60412380006001'
    WHEN 'V-SHR-007' THEN '50100034567023'
    WHEN 'V-MTP-008' THEN '00481230008910'
    WHEN 'V-SVC-009' THEN '38912450009123'
    WHEN 'V-KAV-010' THEN '00601610010456'
    WHEN 'V-AWS-011' THEN '50100045678034'
    WHEN 'V-ZOM-012' THEN '00481230012789'
    WHEN 'V-CYR-013' THEN '50100056789045'
    WHEN 'V-DEL-014' THEN '00601610014567'
    WHEN 'V-JLL-015' THEN '50100067890056'
    WHEN 'V-TCK-016' THEN '00481230016890'
    WHEN 'V-OFM-017' THEN '38912450017234'
    WHEN 'V-SOD-018' THEN '50100078901067'
    WHEN 'V-RED-019' THEN '60412380019345'
    WHEN 'V-PRX-020' THEN '00601610020678'
  END AS account_number,
  CASE v.vendor_code
    WHEN 'V-TCS-001' THEN 'HDFC0000240'
    WHEN 'V-INF-002' THEN 'ICIC0000601'
    WHEN 'V-WIP-003' THEN 'HDFC0000123'
    WHEN 'V-MAH-004' THEN 'KKBK0000958'
    WHEN 'V-RAJ-005' THEN 'SBIN0008912'
    WHEN 'V-BAL-006' THEN 'UTIB0000064'
    WHEN 'V-SHR-007' THEN 'HDFC0000412'
    WHEN 'V-MTP-008' THEN 'KKBK0000823'
    WHEN 'V-SVC-009' THEN 'SBIN0008789'
    WHEN 'V-KAV-010' THEN 'ICIC0000189'
    WHEN 'V-AWS-011' THEN 'HDFC0000003'
    WHEN 'V-ZOM-012' THEN 'KKBK0000178'
    WHEN 'V-CYR-013' THEN 'HDFC0000060'
    WHEN 'V-DEL-014' THEN 'ICIC0000007'
    WHEN 'V-JLL-015' THEN 'HDFC0000045'
    WHEN 'V-TCK-016' THEN 'KKBK0000022'
    WHEN 'V-OFM-017' THEN 'SBIN0000691'
    WHEN 'V-SOD-018' THEN 'HDFC0000216'
    WHEN 'V-RED-019' THEN 'UTIB0000204'
    WHEN 'V-PRX-020' THEN 'ICIC0000256'
  END AS ifsc_code,
  CASE v.vendor_code
    WHEN 'V-TCS-001' THEN 'Nariman Point'
    WHEN 'V-INF-002' THEN 'Electronics City'
    WHEN 'V-WIP-003' THEN 'Sarjapur Road'
    WHEN 'V-MAH-004' THEN 'Worli'
    WHEN 'V-RAJ-005' THEN 'Makarpura GIDC'
    WHEN 'V-BAL-006' THEN 'Guindy'
    WHEN 'V-SHR-007' THEN 'Bhosari'
    WHEN 'V-MTP-008' THEN 'Vasai East'
    WHEN 'V-SVC-009' THEN 'Jeedimetla'
    WHEN 'V-KAV-010' THEN 'Whitefield'
    WHEN 'V-AWS-011' THEN 'Cyber City Gurugram'
    WHEN 'V-ZOM-012' THEN 'Nehru Place'
    WHEN 'V-CYR-013' THEN 'Lower Parel'
    WHEN 'V-DEL-014' THEN 'Lower Parel'
    WHEN 'V-JLL-015' THEN 'MG Road'
    WHEN 'V-TCK-016' THEN 'Fort Mumbai'
    WHEN 'V-OFM-017' THEN 'Okhla Phase II'
    WHEN 'V-SOD-018' THEN 'Kanjurmarg'
    WHEN 'V-RED-019' THEN 'Guindy'
    WHEN 'V-PRX-020' THEN 'Whitefield'
  END AS branch_name,
  CASE
    WHEN v.vendor_code IN ('V-TCS-001','V-WIP-003','V-SHR-007','V-AWS-011','V-CYR-013','V-JLL-015','V-SOD-018') THEN 'HDFC Bank'
    WHEN v.vendor_code IN ('V-INF-002','V-KAV-010','V-DEL-014','V-PRX-020') THEN 'ICICI Bank'
    WHEN v.vendor_code IN ('V-MAH-004','V-MTP-008','V-ZOM-012','V-TCK-016') THEN 'Kotak Mahindra Bank'
    WHEN v.vendor_code IN ('V-RAJ-005','V-SVC-009','V-OFM-017') THEN 'State Bank of India'
    WHEN v.vendor_code IN ('V-BAL-006','V-RED-019') THEN 'Axis Bank'
    ELSE 'HDFC Bank'
  END AS bank_name,
  'current' AS account_type,
  'INR' AS currency,
  1 AS is_primary,
  'active' AS status,
  0 AS sort_order,
  NOW()
FROM p2p_schema_mt.vendors v
WHERE v.vendor_code IN
  ('V-TCS-001','V-INF-002','V-WIP-003','V-MAH-004','V-RAJ-005','V-BAL-006',
   'V-SHR-007','V-MTP-008','V-SVC-009','V-KAV-010','V-AWS-011','V-ZOM-012',
   'V-CYR-013','V-DEL-014','V-JLL-015','V-TCK-016','V-OFM-017','V-SOD-018',
   'V-RED-019','V-PRX-020')
  AND NOT EXISTS (
    SELECT 1 FROM p2p_schema_mt.vendor_bank_accounts b
    WHERE b.vendor_id = v.id AND b.is_primary = 1
  );

-- ── 5. Insert vendor_spocs (one primary SPOC per vendor with email + phone)
INSERT INTO p2p_schema_mt.vendor_spocs
  (id, vendor_id, spoc_name, designation, email, phone, is_primary,
   location_label, city, state, pin_code, sort_order, created_at)
SELECT
  UUID() AS id,
  v.id   AS vendor_id,
  CASE v.vendor_code
    WHEN 'V-TCS-001' THEN 'Anjali Iyer'
    WHEN 'V-INF-002' THEN 'Vikram Bhatt'
    WHEN 'V-WIP-003' THEN 'Sneha Reddy'
    WHEN 'V-MAH-004' THEN 'Rakesh Patil'
    WHEN 'V-RAJ-005' THEN 'Rajan Mehta'
    WHEN 'V-BAL-006' THEN 'Murugan Selvam'
    WHEN 'V-SHR-007' THEN 'Sunil Joshi'
    WHEN 'V-MTP-008' THEN 'Pratik Shah'
    WHEN 'V-SVC-009' THEN 'Srinivas Rao'
    WHEN 'V-KAV-010' THEN 'Chandrika Bhat'
    WHEN 'V-AWS-011' THEN 'Karthik Subramanian'
    WHEN 'V-ZOM-012' THEN 'Anushka Kapoor'
    WHEN 'V-CYR-013' THEN 'Arvind Mangaldas'
    WHEN 'V-DEL-014' THEN 'Priya Krishnan'
    WHEN 'V-JLL-015' THEN 'Manish Agarwal'
    WHEN 'V-TCK-016' THEN 'Neha Khanna'
    WHEN 'V-OFM-017' THEN 'Deepak Verma'
    WHEN 'V-SOD-018' THEN 'Lavanya Pillai'
    WHEN 'V-RED-019' THEN 'Balaji Krishnan'
    WHEN 'V-PRX-020' THEN 'Aakash Menon'
  END AS spoc_name,
  CASE v.vendor_code
    WHEN 'V-TCS-001' THEN 'Account Director'
    WHEN 'V-INF-002' THEN 'Client Partner'
    WHEN 'V-WIP-003' THEN 'Account Manager'
    WHEN 'V-MAH-004' THEN 'Key Account Manager'
    WHEN 'V-RAJ-005' THEN 'Proprietor'
    WHEN 'V-BAL-006' THEN 'Sales Head'
    WHEN 'V-SHR-007' THEN 'Director'
    WHEN 'V-MTP-008' THEN 'Sales Manager'
    WHEN 'V-SVC-009' THEN 'Partner'
    WHEN 'V-KAV-010' THEN 'Regional Sales Head'
    WHEN 'V-AWS-011' THEN 'Enterprise Account Manager'
    WHEN 'V-ZOM-012' THEN 'Corporate Sales Lead'
    WHEN 'V-CYR-013' THEN 'Partner'
    WHEN 'V-DEL-014' THEN 'Senior Manager'
    WHEN 'V-JLL-015' THEN 'Account Director'
    WHEN 'V-TCK-016' THEN 'Corporate Travel Manager'
    WHEN 'V-OFM-017' THEN 'Key Account Manager'
    WHEN 'V-SOD-018' THEN 'Client Services Manager'
    WHEN 'V-RED-019' THEN 'Channel Sales Head'
    WHEN 'V-PRX-020' THEN 'Director'
  END AS designation,
  CASE v.vendor_code
    WHEN 'V-TCS-001' THEN 'anjali.iyer@tcs.com'
    WHEN 'V-INF-002' THEN 'vikram.bhatt@infosysbpm.com'
    WHEN 'V-WIP-003' THEN 'sneha.reddy@wipro.com'
    WHEN 'V-MAH-004' THEN 'rakesh.patil@mahindralogistics.com'
    WHEN 'V-RAJ-005' THEN 'rajan@rajantooling.in'
    WHEN 'V-BAL-006' THEN 'murugan@balajicomponents.in'
    WHEN 'V-SHR-007' THEN 'sunil.joshi@shreefab.in'
    WHEN 'V-MTP-008' THEN 'pratik.shah@microtechplastics.in'
    WHEN 'V-SVC-009' THEN 'srinivas@srivenkatcastings.in'
    WHEN 'V-KAV-010' THEN 'chandrika.bhat@kaveripower.in'
    WHEN 'V-AWS-011' THEN 'karthik@amazon.com'
    WHEN 'V-ZOM-012' THEN 'anushka.kapoor@zomato.com'
    WHEN 'V-CYR-013' THEN 'arvind.mangaldas@cyrilshroff.com'
    WHEN 'V-DEL-014' THEN 'priyak@deloitte.com'
    WHEN 'V-JLL-015' THEN 'manish.agarwal@ap.jll.com'
    WHEN 'V-TCK-016' THEN 'neha.khanna@thomascook.in'
    WHEN 'V-OFM-017' THEN 'deepak.verma@officemart.in'
    WHEN 'V-SOD-018' THEN 'lavanya.pillai@sodexo.com'
    WHEN 'V-RED-019' THEN 'balaji.k@redington.co.in'
    WHEN 'V-PRX-020' THEN 'aakash.menon@praxisconsulting.in'
  END AS email,
  CASE v.vendor_code
    WHEN 'V-TCS-001' THEN '+91 98201 12345'
    WHEN 'V-INF-002' THEN '+91 98452 23456'
    WHEN 'V-WIP-003' THEN '+91 98453 34567'
    WHEN 'V-MAH-004' THEN '+91 98204 45678'
    WHEN 'V-RAJ-005' THEN '+91 98245 56789'
    WHEN 'V-BAL-006' THEN '+91 98404 67890'
    WHEN 'V-SHR-007' THEN '+91 98225 78901'
    WHEN 'V-MTP-008' THEN '+91 98206 89012'
    WHEN 'V-SVC-009' THEN '+91 98480 90123'
    WHEN 'V-KAV-010' THEN '+91 98454 01234'
    WHEN 'V-AWS-011' THEN '+91 98101 23456'
    WHEN 'V-ZOM-012' THEN '+91 98109 34567'
    WHEN 'V-CYR-013' THEN '+91 98205 45670'
    WHEN 'V-DEL-014' THEN '+91 98208 56781'
    WHEN 'V-JLL-015' THEN '+91 98456 67892'
    WHEN 'V-TCK-016' THEN '+91 98209 78903'
    WHEN 'V-OFM-017' THEN '+91 98102 89014'
    WHEN 'V-SOD-018' THEN '+91 98207 90125'
    WHEN 'V-RED-019' THEN '+91 98407 01236'
    WHEN 'V-PRX-020' THEN '+91 98459 12347'
  END AS phone,
  1 AS is_primary,
  CONCAT(v.city, ' Office') AS location_label,
  v.city,
  v.state,
  v.pin_code,
  0 AS sort_order,
  NOW()
FROM p2p_schema_mt.vendors v
WHERE v.vendor_code IN
  ('V-TCS-001','V-INF-002','V-WIP-003','V-MAH-004','V-RAJ-005','V-BAL-006',
   'V-SHR-007','V-MTP-008','V-SVC-009','V-KAV-010','V-AWS-011','V-ZOM-012',
   'V-CYR-013','V-DEL-014','V-JLL-015','V-TCK-016','V-OFM-017','V-SOD-018',
   'V-RED-019','V-PRX-020')
  AND NOT EXISTS (
    SELECT 1 FROM p2p_schema_mt.vendor_spocs s
    WHERE s.vendor_id = v.id AND s.is_primary = 1
  );
