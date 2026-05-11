-- ============================================================================
-- 20260511_rate_contract_master.sql
-- Rate Contract master — pre-negotiated vendor × item agreements.
--   • rate_contract_master       — header (one row per contract)
--   • rate_contract_items        — child (one row per item line)
--   • rate_contract_master_audit — change log
--
-- Lookup model:
--   On every invoice line, if (vendor_id, item_code) matches an Active +
--   not-expired contract for this tenant, the agreed rate / gst / hsn auto-
--   fill into the invoice form. See /api/masters/rate_contract/lookup.
--
-- Idempotency:
--   • UNIQUE KEY (contract_code, tenant_id) on header → INSERT IGNORE skips dupes
--   • UNIQUE KEY (contract_id, item_code) on child   → INSERT IGNORE skips dupes
--   • Header seeds use deterministic UUIDs so child rows can be safely
--     DELETE+INSERT on re-runs.
--   • Vendor / item references resolved at runtime by code so we don't hardcode
--     tenant-specific UUIDs.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS rate_contract_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ── Header ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_contract_master.rate_contract_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  contract_code VARCHAR(50) NOT NULL,
  contract_name VARCHAR(200) NOT NULL,
  vendor_id VARCHAR(36) NULL,
  vendor_code VARCHAR(50) NULL,
  vendor_name VARCHAR(200) NULL,
  entity_id VARCHAR(36) NULL,
  entity_code VARCHAR(50) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status ENUM('active','inactive','expired') NOT NULL DEFAULT 'active',
  approval_status ENUM('Approved','Pending Approval','Rejected','Draft') NOT NULL DEFAULT 'Approved',
  notes TEXT NULL,
  created_by VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contract_code_tenant (contract_code, tenant_id),
  INDEX idx_tenant_vendor_status (tenant_id, vendor_id, status),
  INDEX idx_tenant (tenant_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_entity (entity_id),
  INDEX idx_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Items ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_contract_master.rate_contract_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  contract_id VARCHAR(36) NOT NULL,
  item_id VARCHAR(36) NULL,
  item_code VARCHAR(80) NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  agreed_rate DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  uom VARCHAR(40) NULL,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  hsn_code VARCHAR(20) NULL,
  line_number INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contract (contract_id),
  INDEX idx_item_code (item_code),
  UNIQUE KEY uq_contract_item_code (contract_id, item_code),
  CONSTRAINT fk_rate_contract_items_contract
    FOREIGN KEY (contract_id) REFERENCES rate_contract_master.rate_contract_master(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Audit log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_contract_master.rate_contract_master_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  action VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_payload JSON,
  after_payload JSON,
  INDEX idx_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Seed contracts ─────────────────────────────────────────────────────────
-- 2 realistic contracts bound to real seeded vendors + items:
--   RCM-PTPL-2026-0001 — TCS Laptop & Accessories (active, FY26)
--   RCM-PTPL-2026-0002 — Rajan Manufacturing Tools (active, FY26)
-- Deterministic header UUIDs let child DELETE+INSERT survive re-runs.
SET @RCM_1 := 'rc111111-1111-1111-1111-111111111101' COLLATE utf8mb4_0900_ai_ci;
SET @RCM_2 := 'rc111111-1111-1111-1111-111111111102' COLLATE utf8mb4_0900_ai_ci;

SET @VEN_TCS := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-TCS-001' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_TCS_NAME := (SELECT name FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-TCS-001' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_RAJ := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-RAJ-005' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_RAJ_NAME := (SELECT name FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-RAJ-005' AND tenant_id = 'tenant-default-001' LIMIT 1);

INSERT IGNORE INTO rate_contract_master.rate_contract_master
  (id, tenant_id, contract_code, contract_name, vendor_id, vendor_code, vendor_name,
   entity_id, entity_code, start_date, end_date, status, approval_status, notes, created_by)
VALUES
  (@RCM_1,'tenant-default-001','RCM-PTPL-2026-0001','TCS Laptop & Accessories FY26',
    @VEN_TCS,'V-TCS-001', @VEN_TCS_NAME,
    'entity-ptpl-001','PTPL','2026-04-01','2027-03-31',
    'active','Approved',
    'Pre-negotiated rates for standard onboarding laptop kits valid through FY26.',
    'seed'),
  (@RCM_2,'tenant-default-001','RCM-PTPL-2026-0002','Rajan Manufacturing Tools FY26',
    @VEN_RAJ,'V-RAJ-005', @VEN_RAJ_NAME,
    'entity-ptpl-001','PTPL','2026-04-01','2027-03-31',
    'active','Approved',
    'Shop-floor consumable tool kit pre-negotiated rates for MSME vendor.',
    'seed');

-- Replace child item rows on every run (deterministic header UUIDs).
DELETE FROM rate_contract_master.rate_contract_items
  WHERE contract_id IN (@RCM_1, @RCM_2);

INSERT INTO rate_contract_master.rate_contract_items
  (id, contract_id, item_id, item_code, item_name, agreed_rate, currency, uom,
   gst_rate, hsn_code, line_number)
VALUES
  -- Contract 1 — TCS Laptop & Accessories
  (UUID(), @RCM_1, NULL, 'LAP-14IN-I7',  '14" Business Laptop',        85000, 'INR','NOS', 18, '84713000', 1),
  (UUID(), @RCM_1, NULL, 'CHG-90W-USBC', '90W USB-C Charger',           2500, 'INR','NOS', 18, '85044030', 2),
  (UUID(), @RCM_1, NULL, 'MSE-WRL-001',  'Wireless Mouse',               800, 'INR','NOS', 18, '84716060', 3),
  (UUID(), @RCM_1, NULL, 'BAG-LAP-15',   'Laptop Carry Case',           1200, 'INR','NOS', 18, '42021290', 4),

  -- Contract 2 — Rajan Manufacturing Tools
  (UUID(), @RCM_2, NULL, 'TOOL-WRENCH-SET','Wrench set 8-24mm',         3500, 'INR','NOS', 18, '82041100', 1),
  (UUID(), @RCM_2, NULL, 'TOOL-SCREW-SET', 'Screwdriver set',           1800, 'INR','NOS', 18, '82054000', 2),
  (UUID(), @RCM_2, NULL, 'TOOL-PLIER-3PC', 'Pliers 3-piece',            1200, 'INR','NOS', 18, '82032000', 3),
  (UUID(), @RCM_2, NULL, 'TOOL-HAMMER',    'Claw hammer 0.5kg',          700, 'INR','NOS', 18, '82052000', 4);
