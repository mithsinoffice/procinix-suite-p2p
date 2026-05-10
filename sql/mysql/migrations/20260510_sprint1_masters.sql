-- ============================================================================
-- 20260510_sprint1_masters.sql
-- Sprint 1: 4 new masters + 12 vendor seeds.
--   New databases / tables:
--     asset_category_master        (8 rows)
--     depreciation_method_master   (4 rows)
--     service_type_master          (13 rows)
--     expense_category_master      (11 rows)
--   Vendors: +12 seed rows on p2p_schema_mt.vendors. (vendors has no
--     `is_msme` column — MSME tracking lives on vendor_pan_compliance per
--     20260424_ws1a_2a; this seed only fills the basic vendor row. MSME
--     compliance rows can follow via the KYC flow.)
--
-- Each new master has UNIQUE KEY uq_code_tenant (record_code, tenant_id) so
-- INSERT IGNORE is idempotent on re-run.
-- ============================================================================

-- ── asset_category_master ──────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS asset_category_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS asset_category_master.asset_category_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  record_code VARCHAR(50) NOT NULL,
  record_name VARCHAR(200) NOT NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  approval_status ENUM('Approved','Pending Approval','Rejected') NOT NULL DEFAULT 'Approved',
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code_tenant (record_code, tenant_id),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS asset_category_master.asset_category_master_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  action VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_payload JSON,
  after_payload JSON,
  INDEX idx_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO asset_category_master.asset_category_master
  (id, tenant_id, record_code, record_name, status, approval_status, payload) VALUES
  (UUID(),'tenant-default-001','AC-001','Machinery & Equipment',     'Active','Approved',JSON_OBJECT('depreciationDefault','SLM','usefulLifeYears',15)),
  (UUID(),'tenant-default-001','AC-002','Vehicles & Transport',      'Active','Approved',JSON_OBJECT('depreciationDefault','WDV','usefulLifeYears',8)),
  (UUID(),'tenant-default-001','AC-003','IT Hardware',               'Active','Approved',JSON_OBJECT('depreciationDefault','SLM','usefulLifeYears',5)),
  (UUID(),'tenant-default-001','AC-004','IT Software & Licenses',    'Active','Approved',JSON_OBJECT('depreciationDefault','SLM','usefulLifeYears',3)),
  (UUID(),'tenant-default-001','AC-005','Office Furniture & Fixtures','Active','Approved',JSON_OBJECT('depreciationDefault','SLM','usefulLifeYears',10)),
  (UUID(),'tenant-default-001','AC-006','Infrastructure & Civil',    'Active','Approved',JSON_OBJECT('depreciationDefault','SLM','usefulLifeYears',30)),
  (UUID(),'tenant-default-001','AC-007','Land & Building',           'Active','Approved',JSON_OBJECT('depreciationDefault','none','usefulLifeYears',60)),
  (UUID(),'tenant-default-001','AC-008','Other Assets',              'Active','Approved',JSON_OBJECT('depreciationDefault','SLM','usefulLifeYears',5));

-- ── depreciation_method_master ─────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS depreciation_method_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS depreciation_method_master.depreciation_method_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  record_code VARCHAR(50) NOT NULL,
  record_name VARCHAR(200) NOT NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  approval_status ENUM('Approved','Pending Approval','Rejected') NOT NULL DEFAULT 'Approved',
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code_tenant (record_code, tenant_id),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS depreciation_method_master.depreciation_method_master_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  action VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_payload JSON,
  after_payload JSON,
  INDEX idx_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO depreciation_method_master.depreciation_method_master
  (id, tenant_id, record_code, record_name, status, approval_status, payload) VALUES
  (UUID(),'tenant-default-001','DM-001','Straight Line Method (SLM)',    'Active','Approved',JSON_OBJECT('shortCode','SLM')),
  (UUID(),'tenant-default-001','DM-002','Written Down Value (WDV)',      'Active','Approved',JSON_OBJECT('shortCode','WDV')),
  (UUID(),'tenant-default-001','DM-003','Double Declining Balance',      'Active','Approved',JSON_OBJECT('shortCode','DDB')),
  (UUID(),'tenant-default-001','DM-004','Units of Production',           'Active','Approved',JSON_OBJECT('shortCode','UOP'));

-- ── service_type_master ────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS service_type_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS service_type_master.service_type_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  record_code VARCHAR(50) NOT NULL,
  record_name VARCHAR(200) NOT NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  approval_status ENUM('Approved','Pending Approval','Rejected') NOT NULL DEFAULT 'Approved',
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code_tenant (record_code, tenant_id),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS service_type_master.service_type_master_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  action VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_payload JSON,
  after_payload JSON,
  INDEX idx_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO service_type_master.service_type_master
  (id, tenant_id, record_code, record_name, status, approval_status, payload) VALUES
  (UUID(),'tenant-default-001','ST-001','IT Services',                'Active','Approved',JSON_OBJECT('defaultTdsSection','194J')),
  (UUID(),'tenant-default-001','ST-002','Consulting & Advisory',      'Active','Approved',JSON_OBJECT('defaultTdsSection','194J')),
  (UUID(),'tenant-default-001','ST-003','Legal & Compliance',         'Active','Approved',JSON_OBJECT('defaultTdsSection','194J')),
  (UUID(),'tenant-default-001','ST-004','Facility Management',        'Active','Approved',JSON_OBJECT('defaultTdsSection','194C')),
  (UUID(),'tenant-default-001','ST-005','Security Services',          'Active','Approved',JSON_OBJECT('defaultTdsSection','194C')),
  (UUID(),'tenant-default-001','ST-006','Logistics & Transport',      'Active','Approved',JSON_OBJECT('defaultTdsSection','194C')),
  (UUID(),'tenant-default-001','ST-007','Marketing & PR',             'Active','Approved',JSON_OBJECT('defaultTdsSection','194J')),
  (UUID(),'tenant-default-001','ST-008','Training & Development',     'Active','Approved',JSON_OBJECT('defaultTdsSection','194J')),
  (UUID(),'tenant-default-001','ST-009','Manpower Services',          'Active','Approved',JSON_OBJECT('defaultTdsSection','194C')),
  (UUID(),'tenant-default-001','ST-010','AMC & Maintenance',          'Active','Approved',JSON_OBJECT('defaultTdsSection','194C')),
  (UUID(),'tenant-default-001','ST-011','Cloud & SaaS',               'Active','Approved',JSON_OBJECT('defaultTdsSection','194J')),
  (UUID(),'tenant-default-001','ST-012','Audit & Accounting',         'Active','Approved',JSON_OBJECT('defaultTdsSection','194J')),
  (UUID(),'tenant-default-001','ST-013','Other Services',             'Active','Approved',JSON_OBJECT('defaultTdsSection','194J'));

-- ── expense_category_master ────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS expense_category_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS expense_category_master.expense_category_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  record_code VARCHAR(50) NOT NULL,
  record_name VARCHAR(200) NOT NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  approval_status ENUM('Approved','Pending Approval','Rejected') NOT NULL DEFAULT 'Approved',
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code_tenant (record_code, tenant_id),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS expense_category_master.expense_category_master_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  action VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_payload JSON,
  after_payload JSON,
  INDEX idx_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO expense_category_master.expense_category_master
  (id, tenant_id, record_code, record_name, status, approval_status, payload) VALUES
  (UUID(),'tenant-default-001','EC-001','Professional Services',    'Active','Approved',JSON_OBJECT('defaultGl','5301')),
  (UUID(),'tenant-default-001','EC-002','Consulting Fees',          'Active','Approved',JSON_OBJECT('defaultGl','5301')),
  (UUID(),'tenant-default-001','EC-003','Marketing & Advertising',  'Active','Approved',JSON_OBJECT('defaultGl','5501')),
  (UUID(),'tenant-default-001','EC-004','Travel & Accommodation',   'Active','Approved',JSON_OBJECT('defaultGl','5401')),
  (UUID(),'tenant-default-001','EC-005','IT & Software',            'Active','Approved',JSON_OBJECT('defaultGl','5601')),
  (UUID(),'tenant-default-001','EC-006','Office Supplies',          'Active','Approved',JSON_OBJECT('defaultGl','5901')),
  (UUID(),'tenant-default-001','EC-007','Repairs & Maintenance',    'Active','Approved',JSON_OBJECT('defaultGl','5701')),
  (UUID(),'tenant-default-001','EC-008','Utilities',                'Active','Approved',JSON_OBJECT('defaultGl','5202')),
  (UUID(),'tenant-default-001','EC-009','Legal & Compliance',       'Active','Approved',JSON_OBJECT('defaultGl','5301')),
  (UUID(),'tenant-default-001','EC-010','Training & Development',   'Active','Approved',JSON_OBJECT('defaultGl','5102')),
  (UUID(),'tenant-default-001','EC-011','Miscellaneous',            'Active','Approved',JSON_OBJECT('defaultGl','5901'));

-- ── 12 vendor seeds (p2p_schema_mt.vendors) ────────────────────────────────
-- Idempotency: vendors.vendor_code is UNIQUE so INSERT IGNORE skips re-runs.
-- vendor_group_name is set; vendor_group_id stays null (groups exist on
-- vendor_group_master but the linking step is a separate concern). MSME flag
-- not stored on vendors table — see header note.
INSERT IGNORE INTO p2p_schema_mt.vendors
  (id, vendor_code, vendor_legal_name, vendor_trade_name, vendor_group_name,
   vendor_type, address_line, city, state, country, status, is_active, tenant_id)
VALUES
  (UUID(),'V-TCS-001',  'Tata Consultancy Services Limited','TCS',                'Tata Group','service_provider', NULL,'Mumbai',   'Maharashtra','India','active',1,'tenant-default-001'),
  (UUID(),'V-INF-002',  'Infosys BPM Limited',              'Infosys BPM',        NULL,        'service_provider', NULL,'Bangalore','Karnataka',  'India','active',1,'tenant-default-001'),
  (UUID(),'V-WIP-003',  'Wipro Infrastructure Engineering Limited','Wipro Infra', 'Wipro Group','service_provider',NULL,'Bangalore','Karnataka',  'India','active',1,'tenant-default-001'),
  (UUID(),'V-MAH-004',  'Mahindra Logistics Limited',       'Mahindra Logistics', 'Mahindra Group','service_provider',NULL,'Mumbai','Maharashtra','India','active',1,'tenant-default-001'),
  (UUID(),'V-RAJ-005',  'Rajan Tooling Works',              'Rajan Tooling',      NULL,        'goods_supplier',   NULL,'Vadodara', 'Gujarat',    'India','active',1,'tenant-default-001'),
  (UUID(),'V-BAL-006',  'Balaji Micro Components',          'Balaji Components',  NULL,        'goods_supplier',   NULL,'Chennai',  'Tamil Nadu', 'India','active',1,'tenant-default-001'),
  (UUID(),'V-SHR-007',  'Shree Fab Works Pvt Ltd',          'Shree Fab',          NULL,        'goods_supplier',   NULL,'Pune',     'Maharashtra','India','active',1,'tenant-default-001'),
  (UUID(),'V-MTP-008',  'Micro Tech Plastics Pvt Ltd',      'Micro Tech',         NULL,        'goods_supplier',   NULL,'Mumbai',   'Maharashtra','India','active',1,'tenant-default-001'),
  (UUID(),'V-SVC-009',  'Sri Venkat Castings',              'Sri Venkat',         NULL,        'goods_supplier',   NULL,'Hyderabad','Telangana',  'India','active',1,'tenant-default-001'),
  (UUID(),'V-KAV-010',  'Kaveri Power & Light Ltd',         'Kaveri Power',       NULL,        'goods_supplier',   NULL,'Bangalore','Karnataka',  'India','active',1,'tenant-default-001'),
  (UUID(),'V-AWS-011',  'Amazon Web Services India',        'AWS India',          NULL,        'service_provider', NULL,'New Delhi','Delhi',      'India','active',1,'tenant-default-001'),
  (UUID(),'V-ZOM-012',  'Zomato Platform Ltd',              'Zomato',             NULL,        'service_provider', NULL,'New Delhi','Delhi',      'India','active',1,'tenant-default-001');

-- Backfill vendor_group_id for the 4 vendors with known groups, by joining on
-- record_code in vendor_group_master. Idempotent — runs each invocation but
-- only updates when match exists.
UPDATE p2p_schema_mt.vendors v
JOIN vendor_group_master.vendor_group_master g
  ON g.tenant_id = v.tenant_id
 AND g.record_name = v.vendor_group_name
SET v.vendor_group_id = g.id, v.vendor_group_code = g.record_code
WHERE v.vendor_group_name IS NOT NULL AND v.vendor_group_id IS NULL;

-- Compliance: per-vendor PAN/MSME row marking the 6 MSME vendors as 'small'.
-- vendor_pan_compliance has FK to vendors.id; we look up by vendor_code.
INSERT IGNORE INTO p2p_schema_mt.vendor_pan_compliance
  (id, vendor_id, msme_category, pan_status, created_at, updated_at)
SELECT UUID(), v.id, 'small', 'not_verified', NOW(), NOW()
FROM p2p_schema_mt.vendors v
WHERE v.vendor_code IN ('V-RAJ-005','V-BAL-006','V-SHR-007','V-MTP-008','V-SVC-009','V-KAV-010')
  AND NOT EXISTS (
    SELECT 1 FROM p2p_schema_mt.vendor_pan_compliance c WHERE c.vendor_id = v.id
  );
