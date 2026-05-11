-- ============================================================================
-- 20260511_kit_bundle_master.sql
-- Kit / Bundle catalogue master with header + items child table.
--   • kit_bundle_master       — header (one row per bundle)
--   • kit_bundle_items        — child (one row per SKU inside a bundle)
--   • kit_bundle_master_audit — change log
--
-- Idempotency:
--   • UNIQUE KEY (bundle_code, tenant_id) on header → INSERT IGNORE skips dupes
--   • Header seeds use deterministic UUIDs so child rows can be safely
--     DELETE+INSERT on every run
--   • Vendor IDs resolved at runtime against vendor_master/p2p_schema_mt.vendors
--     by vendor_code so we don't hardcode tenant-specific UUIDs
-- ============================================================================

CREATE DATABASE IF NOT EXISTS kit_bundle_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ── Header ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kit_bundle_master.kit_bundle_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  bundle_code VARCHAR(50) NOT NULL,
  bundle_name VARCHAR(200) NOT NULL,
  vendor_id VARCHAR(36) NULL,
  vendor_code VARCHAR(50) NULL,
  vendor_name VARCHAR(200) NULL,
  description TEXT NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  approval_status ENUM('Approved','Pending Approval','Rejected','Draft') NOT NULL DEFAULT 'Approved',
  created_by VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bundle_code_tenant (bundle_code, tenant_id),
  INDEX idx_tenant (tenant_id),
  INDEX idx_vendor (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Items ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kit_bundle_master.kit_bundle_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  bundle_id VARCHAR(36) NOT NULL,
  line_number INT NOT NULL DEFAULT 0,
  item_code VARCHAR(80) NULL,
  item_name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  qty DECIMAL(18,4) NOT NULL DEFAULT 1,
  uom VARCHAR(40) NULL,
  unit_price DECIMAL(18,4) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(6,2) NOT NULL DEFAULT 0,
  hsn_code VARCHAR(20) NULL,
  mandatory TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bundle (bundle_id),
  CONSTRAINT fk_kit_bundle_items_bundle
    FOREIGN KEY (bundle_id) REFERENCES kit_bundle_master.kit_bundle_master(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Audit log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kit_bundle_master.kit_bundle_master_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  action VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_payload JSON,
  after_payload JSON,
  INDEX idx_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Seed bundles ───────────────────────────────────────────────────────────
-- 3 realistic bundles bound to real seeded vendors:
--   BCM-PTPL-2026-0001 — Onboarding Laptop Kit (TCS)
--   BCM-PTPL-2026-0002 — Workstation Desktop Kit (Wipro)
--   BCM-PTPL-2026-0003 — Light Manufacturing Tool Kit (Rajan)
-- Deterministic header UUIDs let child DELETE+INSERT survive re-runs.
SET @BUNDLE_1 := 'b1111111-1111-1111-1111-111111111101' COLLATE utf8mb4_0900_ai_ci;
SET @BUNDLE_2 := 'b1111111-1111-1111-1111-111111111102' COLLATE utf8mb4_0900_ai_ci;
SET @BUNDLE_3 := 'b1111111-1111-1111-1111-111111111103' COLLATE utf8mb4_0900_ai_ci;

SET @VEN_TCS := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-TCS-001' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_WIP := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-WIP-003' AND tenant_id = 'tenant-default-001' LIMIT 1);
SET @VEN_RAJ := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-RAJ-005' AND tenant_id = 'tenant-default-001' LIMIT 1);

INSERT IGNORE INTO kit_bundle_master.kit_bundle_master
  (id, tenant_id, bundle_code, bundle_name, vendor_id, vendor_code, vendor_name,
   description, status, approval_status, created_by)
VALUES
  (@BUNDLE_1,'tenant-default-001','BCM-PTPL-2026-0001','Onboarding Laptop Kit',
    @VEN_TCS,'V-TCS-001','Tata Consultancy Services Limited',
    'Standard new-hire laptop kit — laptop, charger, mouse, carry case',
    'Active','Approved','seed'),
  (@BUNDLE_2,'tenant-default-001','BCM-PTPL-2026-0002','Workstation Desktop Kit',
    @VEN_WIP,'V-WIP-003','Wipro Infrastructure Engineering Limited',
    'Engineering workstation kit — desktop tower, dual monitors, keyboard, mouse, speaker bar',
    'Active','Approved','seed'),
  (@BUNDLE_3,'tenant-default-001','BCM-PTPL-2026-0003','Light Manufacturing Tool Kit',
    @VEN_RAJ,'V-RAJ-005','Rajan Tooling Works',
    'Shop-floor consumable tool kit',
    'Active','Approved','seed');

DELETE FROM kit_bundle_master.kit_bundle_items
  WHERE bundle_id IN (@BUNDLE_1, @BUNDLE_2, @BUNDLE_3);

INSERT INTO kit_bundle_master.kit_bundle_items
  (id, bundle_id, line_number, item_code, item_name, description, qty, uom,
   unit_price, gst_rate, hsn_code, mandatory)
VALUES
  -- Bundle 1: Onboarding Laptop Kit
  (UUID(), @BUNDLE_1, 1, 'LAP-14IN-I7', '14" Business Laptop',           '14-inch i7 / 16GB / 512GB SSD', 1, 'NOS', 85000, 18, '84713000', 1),
  (UUID(), @BUNDLE_1, 2, 'CHG-90W-USBC','90W USB-C Charger',             'Original 90W AC adapter',       1, 'NOS',  2500, 18, '85044030', 1),
  (UUID(), @BUNDLE_1, 3, 'MSE-WRL-001','Wireless Mouse',                 'Standard wireless mouse',       1, 'NOS',   800, 18, '84716060', 0),
  (UUID(), @BUNDLE_1, 4, 'BAG-LAP-15','Laptop Carry Case',               '15-inch padded carry case',     1, 'NOS',  1200, 18, '42021290', 0),

  -- Bundle 2: Workstation Desktop Kit
  (UUID(), @BUNDLE_2, 1, 'DESK-TWR-I5','Desktop Tower i5',               '12th Gen i5 / 8GB / 1TB',       1, 'NOS', 45000, 18, '84713000', 1),
  (UUID(), @BUNDLE_2, 2, 'MON-24IN-FHD','24" FHD Monitor',               'Dual-monitor pair (left + right)',2,'NOS', 12000, 18, '85285210', 1),
  (UUID(), @BUNDLE_2, 3, 'KBD-USB-IND','USB Keyboard',                   'Indian-layout USB keyboard',    1, 'NOS',   600, 18, '84716070', 1),
  (UUID(), @BUNDLE_2, 4, 'MSE-USB-OPT','USB Optical Mouse',              'Standard wired mouse',          1, 'NOS',   400, 18, '84716060', 1),
  (UUID(), @BUNDLE_2, 5, 'SPK-USB-BAR','USB Speaker Bar',                'Stereo speaker bar',            1, 'NOS',  1500, 18, '85182200', 0),

  -- Bundle 3: Light Manufacturing Tool Kit
  (UUID(), @BUNDLE_3, 1, 'TOOL-WRENCH-SET','Wrench set 8–24mm',          '17-piece combination wrench set',1,'NOS',  3500, 18, '82041100', 1),
  (UUID(), @BUNDLE_3, 2, 'TOOL-SCREW-SET','Screwdriver set',             '20-piece precision driver set', 1, 'NOS',  1800, 18, '82054000', 1),
  (UUID(), @BUNDLE_3, 3, 'TOOL-PLIER-3PC','Pliers 3-piece',              'Combination + nose + cutting', 1, 'NOS',  1200, 18, '82032000', 1),
  (UUID(), @BUNDLE_3, 4, 'TOOL-HAMMER',   'Claw hammer 0.5kg',           'Heavy-duty claw hammer',        1, 'NOS',   700, 18, '82052000', 0);
