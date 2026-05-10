-- ============================================================================
-- 20260510_debit_notes.sql — relational debit notes (header + line items).
--   debit_notes        — header (vendor, reference type/id, reason, status)
--   debit_note_items   — per-line breakdown
--   debit_notes_audit  — append-only audit trail
-- All tenant-scoped via tenant_id; UNIQUE on (tenant_id, debit_note_number).
-- ============================================================================

CREATE TABLE IF NOT EXISTS debit_notes (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  debit_note_number VARCHAR(64) NOT NULL,
  debit_note_date DATE NOT NULL,
  vendor_id VARCHAR(100),
  vendor_name VARCHAR(300) NOT NULL,
  vendor_code VARCHAR(64),
  vendor_ap_account VARCHAR(64),
  reference_type ENUM('Invoice','GRN') NOT NULL,
  reference_number VARCHAR(100),
  reference_id VARCHAR(100),
  reason_id VARCHAR(64),
  reason_name VARCHAR(200),
  debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('Draft','Pending Approval','Issued','Adjusted','Closed','Rejected')
    NOT NULL DEFAULT 'Draft',
  notes TEXT,
  created_by VARCHAR(100),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  issued_by VARCHAR(100),
  issued_at DATETIME,
  approved_by VARCHAR(100),
  approved_at DATETIME,
  rejected_by VARCHAR(100),
  rejected_at DATETIME,
  rejection_reason TEXT,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dn_number_tenant (tenant_id, debit_note_number),
  INDEX idx_dn_tenant (tenant_id),
  INDEX idx_dn_vendor (vendor_id),
  INDEX idx_dn_status (status),
  INDEX idx_dn_ref (reference_type, reference_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS debit_note_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  debit_note_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  line_number INT NOT NULL,
  item_code VARCHAR(100),
  item_name VARCHAR(300),
  reference_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  invoiced_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  debit_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  uom VARCHAR(50),
  rate DECIMAL(15,2) NOT NULL DEFAULT 0,
  debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  expense_gl VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dni_dn (debit_note_id),
  INDEX idx_dni_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS debit_notes_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  debit_note_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  action VARCHAR(40) NOT NULL,
  actor_id VARCHAR(100),
  actor_name VARCHAR(200),
  remarks TEXT,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dna_dn (debit_note_id),
  INDEX idx_dna_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
