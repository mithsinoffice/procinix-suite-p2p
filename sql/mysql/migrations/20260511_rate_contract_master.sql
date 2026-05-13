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
-- 4 realistic contracts bound to real seeded vendors + items:
--   RCM-PTPL-2026-0001 — TCS Laptop & Accessories (active, FY26)
--   RCM-PTPL-2026-0002 — Rajan Manufacturing Tools (active, FY26)
--   RCM-PTPL-2026-0003 — Shree Fab Office Supplies (active, FY26)
--   RCM-PTPL-2026-0004 — Wipro IT Peripherals (active, FY26)
-- Deterministic header UUIDs let child DELETE+INSERT survive re-runs.
SET @RCM_1 := 'rc111111-1111-1111-1111-111111111101' COLLATE utf8mb4_0900_ai_ci;
SET @RCM_2 := 'rc111111-1111-1111-1111-111111111102' COLLATE utf8mb4_0900_ai_ci;
SET @RCM_3 := 'rc111111-1111-1111-1111-111111111103' COLLATE utf8mb4_0900_ai_ci;
SET @RCM_4 := 'rc111111-1111-1111-1111-111111111104' COLLATE utf8mb4_0900_ai_ci;

SET @VEN_TCS := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-TCS-001' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_TCS_NAME := (SELECT name FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-TCS-001' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_RAJ := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-RAJ-005' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_RAJ_NAME := (SELECT name FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-RAJ-005' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_SHR := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-SHR-007' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_SHR_NAME := (SELECT name FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-SHR-007' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_WIP := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-WIP-003' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_WIP_NAME := (SELECT name FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-WIP-003' AND tenant_id = 'tenant-default-001' LIMIT 1);

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
    'seed'),
  (@RCM_3,'tenant-default-001','RCM-PTPL-2026-0003','Shree Fab Office Supplies FY26',
    @VEN_SHR,'V-SHR-007', @VEN_SHR_NAME,
    'entity-ptpl-001','PTPL','2026-04-01','2027-03-31',
    'active','Approved',
    'Office supplies rate card with MSME vendor — paper, pens, staples, markers.',
    'seed'),
  (@RCM_4,'tenant-default-001','RCM-PTPL-2026-0004','Wipro IT Peripherals FY26',
    @VEN_WIP,'V-WIP-003', @VEN_WIP_NAME,
    'entity-ptpl-001','PTPL','2026-04-01','2027-03-31',
    'active','Approved',
    'Desktop peripherals rate card — monitors, keyboards, mice, speaker bars.',
    'seed');

-- Resolve item_master UUIDs at runtime by item_code so item_id FK is populated
-- and aliased into ITM-* canonical codes (set up by 20260511_item_master_v2.sql).
SET @ITM_IT_006 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-IT-006' LIMIT 1);
SET @ITM_IT_007 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-IT-007' LIMIT 1);
SET @ITM_IT_008 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-IT-008' LIMIT 1);
SET @ITM_IT_009 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-IT-009' LIMIT 1);
SET @ITM_IT_011 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-IT-011' LIMIT 1);
SET @ITM_IT_012 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-IT-012' LIMIT 1);
SET @ITM_IT_013 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-IT-013' LIMIT 1);
SET @ITM_IT_014 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-IT-014' LIMIT 1);
SET @ITM_MRO_005 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-MRO-005' LIMIT 1);
SET @ITM_MRO_006 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-MRO-006' LIMIT 1);
SET @ITM_MRO_007 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-MRO-007' LIMIT 1);
SET @ITM_MRO_008 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-MRO-008' LIMIT 1);
SET @ITM_OFF_001 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-OFF-001' LIMIT 1);
SET @ITM_OFF_002 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-OFF-002' LIMIT 1);
SET @ITM_OFF_003 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-OFF-003' LIMIT 1);
SET @ITM_OFF_004 := (SELECT id FROM item_master.item_master WHERE item_code = 'ITM-OFF-004' LIMIT 1);

-- Replace child item rows on every run (deterministic header UUIDs).
DELETE FROM rate_contract_master.rate_contract_items
  WHERE contract_id IN (@RCM_1, @RCM_2, @RCM_3, @RCM_4);

INSERT INTO rate_contract_master.rate_contract_items
  (id, contract_id, item_id, item_code, item_name, agreed_rate, currency, uom,
   gst_rate, hsn_code, line_number)
VALUES
  -- Contract 1 — TCS Laptop & Accessories (ITM-IT-006..009)
  (UUID(), @RCM_1, @ITM_IT_006, 'ITM-IT-006', 'Laptop 14-inch i7',     85000, 'INR','NOS', 18, '84713000', 1),
  (UUID(), @RCM_1, @ITM_IT_007, 'ITM-IT-007', '90W USB-C Charger',      2500, 'INR','NOS', 18, '85044030', 2),
  (UUID(), @RCM_1, @ITM_IT_008, 'ITM-IT-008', 'Wireless Mouse',          800, 'INR','NOS', 18, '84716060', 3),
  (UUID(), @RCM_1, @ITM_IT_009, 'ITM-IT-009', 'Laptop Carry Case',      1200, 'INR','NOS', 18, '42021290', 4),

  -- Contract 2 — Rajan Manufacturing Tools (ITM-MRO-005..008)
  (UUID(), @RCM_2, @ITM_MRO_005, 'ITM-MRO-005', 'Wrench Set 8-24mm',    3500, 'INR','SET', 18, '82041100', 1),
  (UUID(), @RCM_2, @ITM_MRO_006, 'ITM-MRO-006', 'Screwdriver Set',      1800, 'INR','SET', 18, '82054000', 2),
  (UUID(), @RCM_2, @ITM_MRO_007, 'ITM-MRO-007', 'Pliers 3-piece',       1200, 'INR','SET', 18, '82032000', 3),
  (UUID(), @RCM_2, @ITM_MRO_008, 'ITM-MRO-008', 'Claw Hammer 0.5kg',     700, 'INR','NOS', 18, '82052000', 4),

  -- Contract 3 — Shree Fab Office Supplies (ITM-OFF-001..004)
  (UUID(), @RCM_3, @ITM_OFF_001, 'ITM-OFF-001', 'A4 Copier Paper (500 sheets)',     250, 'INR','PCK', 12, '4802', 1),
  (UUID(), @RCM_3, @ITM_OFF_002, 'ITM-OFF-002', 'Ballpoint Pen (Blue, Pack of 10)',  45, 'INR','PCK', 18, '9608', 2),
  (UUID(), @RCM_3, @ITM_OFF_003, 'ITM-OFF-003', 'Staples (Box of 5000)',            200, 'INR','BOX', 18, '8305', 3),
  (UUID(), @RCM_3, @ITM_OFF_004, 'ITM-OFF-004', 'Whiteboard Marker Set (Pack of 4)',130, 'INR','PCK', 18, '9608', 4),

  -- Contract 4 — Wipro IT Peripherals (ITM-IT-011..014)
  (UUID(), @RCM_4, @ITM_IT_011, 'ITM-IT-011', '24-inch FHD Monitor',  11500, 'INR','NOS', 18, '85285210', 1),
  (UUID(), @RCM_4, @ITM_IT_012, 'ITM-IT-012', 'USB Keyboard',           550, 'INR','NOS', 18, '84716070', 2),
  (UUID(), @RCM_4, @ITM_IT_013, 'ITM-IT-013', 'USB Optical Mouse',      350, 'INR','NOS', 18, '84716060', 3),
  (UUID(), @RCM_4, @ITM_IT_014, 'ITM-IT-014', 'USB Speaker Bar',       1400, 'INR','NOS', 18, '85182200', 4);
