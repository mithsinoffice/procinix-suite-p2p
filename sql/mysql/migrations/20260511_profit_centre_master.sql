-- ============================================================================
-- 20260511_profit_centre_master.sql
-- Canonical profit_centre_master with 8 PTPL seeds.
--   • Tenant scope: tenant-default-001
--   • Entity scope: entity-ptpl-001 (lives in payload.entityId)
--   • UNIQUE KEY (record_code, tenant_id) → idempotent re-runs
--   • Standard canonical shape: id / tenant_id / record_code / record_name /
--     status / approval_status / payload (JSON) → wired through generic
--     /api/masters/profit_centre_master handler in server/index.mjs
-- ============================================================================

CREATE DATABASE IF NOT EXISTS profit_centre_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS profit_centre_master.profit_centre_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  record_code VARCHAR(50) NOT NULL,
  record_name VARCHAR(200) NOT NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  approval_status ENUM('Approved','Pending Approval','Rejected','Draft') NOT NULL DEFAULT 'Approved',
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code_tenant (record_code, tenant_id),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS profit_centre_master.profit_centre_master_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  action VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_payload JSON,
  after_payload JSON,
  INDEX idx_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO profit_centre_master.profit_centre_master
  (id, tenant_id, record_code, record_name, status, approval_status, payload) VALUES
  (UUID(),'tenant-default-001','PCM-PTPL-2026-0001','Software Services',           'Active','Approved',
    JSON_OBJECT('entityId','entity-ptpl-001','entityCode','PTPL','description','Revenue from software product engineering and SaaS subscriptions','head','VP Engineering')),
  (UUID(),'tenant-default-001','PCM-PTPL-2026-0002','Consulting & Advisory',       'Active','Approved',
    JSON_OBJECT('entityId','entity-ptpl-001','entityCode','PTPL','description','Revenue from consulting engagements','head','VP Consulting')),
  (UUID(),'tenant-default-001','PCM-PTPL-2026-0003','Implementation Services',     'Active','Approved',
    JSON_OBJECT('entityId','entity-ptpl-001','entityCode','PTPL','description','Customer onboarding and implementation revenue','head','VP Delivery')),
  (UUID(),'tenant-default-001','PCM-PTPL-2026-0004','Managed Services',            'Active','Approved',
    JSON_OBJECT('entityId','entity-ptpl-001','entityCode','PTPL','description','AMC + managed hosting + L1/L2 support','head','Director Managed Services')),
  (UUID(),'tenant-default-001','PCM-PTPL-2026-0005','Training & Certification',    'Active','Approved',
    JSON_OBJECT('entityId','entity-ptpl-001','entityCode','PTPL','description','Customer + partner training revenue','head','Director Enablement')),
  (UUID(),'tenant-default-001','PCM-PTPL-2026-0006','Partner Revenue',             'Active','Approved',
    JSON_OBJECT('entityId','entity-ptpl-001','entityCode','PTPL','description','Channel + reseller commissions','head','VP Partnerships')),
  (UUID(),'tenant-default-001','PCM-PTPL-2026-0007','Corporate / Shared Services', 'Active','Approved',
    JSON_OBJECT('entityId','entity-ptpl-001','entityCode','PTPL','description','Corporate overhead allocation centre','head','CFO')),
  (UUID(),'tenant-default-001','PCM-PTPL-2026-0008','Research & Innovation',       'Active','Approved',
    JSON_OBJECT('entityId','entity-ptpl-001','entityCode','PTPL','description','R&D investment centre','head','CTO'));
