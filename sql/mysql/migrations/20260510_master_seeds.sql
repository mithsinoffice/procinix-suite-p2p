-- ============================================================================
-- Seed location_master and gl_code_master with starter data.
-- Both tables existed but were empty (audited 2026-05-10).
-- INSERT IGNORE so re-runs are safe.
-- ============================================================================

-- ── location_master ─────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS location_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS location_master.location_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-default-001',
  record_code VARCHAR(50),
  record_name VARCHAR(200),
  status VARCHAR(40),
  approval_status VARCHAR(40),
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id),
  INDEX idx_record_code (record_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Existing location_master.location_master (created before tenancy) does not
-- carry a tenant_id column. The generic /api/masters handler returns rows
-- regardless of tenant for these tenant-agnostic masters, so we don't add
-- one here. tenant scope lives in payload.tenant_id for downstream filtering.
INSERT IGNORE INTO location_master.location_master
  (id, record_code, record_name, status, approval_status, payload) VALUES
  (UUID(), 'LOC-001', 'Mumbai Warehouse', 'Active', 'Approved',
   JSON_OBJECT('type','Warehouse','city','Mumbai','state','Maharashtra','tenant_id','tenant-default-001')),
  (UUID(), 'LOC-002', 'Bangalore Store',  'Active', 'Approved',
   JSON_OBJECT('type','Store','city','Bangalore','state','Karnataka','tenant_id','tenant-default-001')),
  (UUID(), 'LOC-003', 'Delhi Hub',        'Active', 'Approved',
   JSON_OBJECT('type','Warehouse','city','Delhi','state','Delhi','tenant_id','tenant-default-001')),
  (UUID(), 'LOC-004', 'Pune Office',      'Active', 'Approved',
   JSON_OBJECT('type','Office','city','Pune','state','Maharashtra','tenant_id','tenant-default-001')),
  (UUID(), 'LOC-005', 'Chennai Plant',    'Active', 'Approved',
   JSON_OBJECT('type','Factory','city','Chennai','state','Tamil Nadu','tenant_id','tenant-default-001'));

-- ── gl_code_master (chart of accounts) ──────────────────────────────────────
CREATE DATABASE IF NOT EXISTS gl_code_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS gl_code_master.gl_code_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-default-001',
  record_code VARCHAR(50),
  record_name VARCHAR(200),
  status VARCHAR(40),
  approval_status VARCHAR(40),
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id),
  INDEX idx_record_code (record_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Existing gl_code_master.gl_code_master (created before tenancy) does not
-- carry a tenant_id column. tenant scope lives in payload.tenant_id.
INSERT IGNORE INTO gl_code_master.gl_code_master
  (id, record_code, record_name, status, approval_status, payload) VALUES
  (UUID(), '1100', 'Cash & Bank',           'Active', 'Approved', JSON_OBJECT('type','Asset','category','Current Asset','tenant_id','tenant-default-001')),
  (UUID(), '1200', 'Accounts Receivable',   'Active', 'Approved', JSON_OBJECT('type','Asset','category','Current Asset','tenant_id','tenant-default-001')),
  (UUID(), '2100', 'Accounts Payable',      'Active', 'Approved', JSON_OBJECT('type','Liability','category','Current Liability','tenant_id','tenant-default-001')),
  (UUID(), '2200', 'TDS Payable',           'Active', 'Approved', JSON_OBJECT('type','Liability','category','Current Liability','tenant_id','tenant-default-001')),
  (UUID(), '2300', 'GST Payable',           'Active', 'Approved', JSON_OBJECT('type','Liability','category','Current Liability','tenant_id','tenant-default-001')),
  (UUID(), '4100', 'Revenue - Services',    'Active', 'Approved', JSON_OBJECT('type','Revenue','category','Operating','tenant_id','tenant-default-001')),
  (UUID(), '5100', 'Cost of Goods Sold',    'Active', 'Approved', JSON_OBJECT('type','Expense','category','COGS','tenant_id','tenant-default-001')),
  (UUID(), '5200', 'Operating Expenses',    'Active', 'Approved', JSON_OBJECT('type','Expense','category','Operating','tenant_id','tenant-default-001')),
  (UUID(), '5300', 'Professional Services', 'Active', 'Approved', JSON_OBJECT('type','Expense','category','Operating','tenant_id','tenant-default-001')),
  (UUID(), '5400', 'Travel & Entertainment','Active', 'Approved', JSON_OBJECT('type','Expense','category','Operating','tenant_id','tenant-default-001')),
  (UUID(), '5500', 'Rent & Utilities',      'Active', 'Approved', JSON_OBJECT('type','Expense','category','Operating','tenant_id','tenant-default-001')),
  (UUID(), '5600', 'IT & Technology',       'Active', 'Approved', JSON_OBJECT('type','Expense','category','Operating','tenant_id','tenant-default-001'));
