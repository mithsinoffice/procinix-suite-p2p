-- ============================================================================
-- vendor_group_master — corporate-group registry (e.g. Tata Group)
-- + adds vendor_group_id / vendor_group_name to vendors so each vendor
--   belongs to exactly one group.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS vendor_group_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vendor_group_master.vendor_group_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  record_code VARCHAR(50) NOT NULL,
  record_name VARCHAR(200) NOT NULL,
  group_type VARCHAR(100),
  industry VARCHAR(100),
  headquarters VARCHAR(200),
  website VARCHAR(200),
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  approval_status ENUM('Approved','Pending Approval','Rejected') NOT NULL DEFAULT 'Approved',
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code_tenant (record_code, tenant_id),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vendor_group_master.vendor_group_master_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  action VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_payload JSON,
  after_payload JSON,
  INDEX idx_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Seed 5 demo groups for tenant-default-001 ──────────────────────────────
-- record_name carries group_name so the canonical generic-master adapter (which
-- projects record_name → name) keeps existing UIs working without remapping.
INSERT IGNORE INTO vendor_group_master.vendor_group_master
  (id, tenant_id, record_code, record_name, group_type, industry,
   headquarters, payload) VALUES
  (UUID(), 'tenant-default-001', 'GRP-001', 'Tata Group',     'Conglomerate', 'Diversified',     'Mumbai',     JSON_OBJECT('group_name','Tata Group','industry','Diversified')),
  (UUID(), 'tenant-default-001', 'GRP-002', 'Reliance Group', 'Conglomerate', 'Energy & Retail', 'Mumbai',     JSON_OBJECT('group_name','Reliance Group','industry','Energy & Retail')),
  (UUID(), 'tenant-default-001', 'GRP-003', 'Infosys Group',  'Technology',   'IT Services',     'Bengaluru',  JSON_OBJECT('group_name','Infosys Group','industry','IT Services')),
  (UUID(), 'tenant-default-001', 'GRP-004', 'Adani Group',    'Conglomerate', 'Infrastructure',  'Ahmedabad',  JSON_OBJECT('group_name','Adani Group','industry','Infrastructure')),
  (UUID(), 'tenant-default-001', 'GRP-005', 'Mahindra Group', 'Conglomerate', 'Automotive',      'Mumbai',     JSON_OBJECT('group_name','Mahindra Group','industry','Automotive'));

-- ── vendors gets vendor_group_id + vendor_group_name (each vendor → 1 group)
-- MySQL 8 doesn't support `ADD COLUMN IF NOT EXISTS` directly; the
-- INFORMATION_SCHEMA check below makes it idempotent.

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND COLUMN_NAME = 'vendor_group_id');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendors ADD COLUMN vendor_group_id VARCHAR(36) NULL AFTER vendor_legal_name',
  'SELECT ''skip vendors.vendor_group_id'' AS migration_note');
PREPARE s FROM @sqlstmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND COLUMN_NAME = 'vendor_group_name');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendors ADD COLUMN vendor_group_name VARCHAR(200) NULL AFTER vendor_group_id',
  'SELECT ''skip vendors.vendor_group_name'' AS migration_note');
PREPARE s FROM @sqlstmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND INDEX_NAME = 'idx_vendors_group');
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE vendors ADD INDEX idx_vendors_group (vendor_group_id)',
  'SELECT ''skip idx_vendors_group'' AS migration_note');
PREPARE s FROM @sqlstmt; EXECUTE s; DEALLOCATE PREPARE s;
