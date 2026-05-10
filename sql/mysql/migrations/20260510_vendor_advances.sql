-- ============================================================================
-- Vendor Advances — relational replacement for the JSON-blob advances flow
-- ============================================================================
--   vendor_advances           — one row per advance request (full lifecycle)
--   advance_ref_sequence      — monotonic per-tenant counter for ADV-YYYY-NNNN
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_advances (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  advance_ref VARCHAR(50) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  vendor_id VARCHAR(100) NOT NULL,
  vendor_name VARCHAR(200) NOT NULL,
  requester_id VARCHAR(100) NOT NULL,
  requester_name VARCHAR(200) NOT NULL,
  department VARCHAR(100),
  cost_centre VARCHAR(100),
  purpose VARCHAR(500) NOT NULL,
  advance_type VARCHAR(20) NOT NULL DEFAULT 'other',
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  requested_date DATE NOT NULL,
  required_by_date DATE NOT NULL,
  supporting_doc_url VARCHAR(500),
  supporting_doc_name VARCHAR(200),
  -- Approval
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  approved_by VARCHAR(100),
  approved_at DATETIME,
  rejection_reason TEXT,
  -- Settlement
  settlement_due_date DATE,
  settled_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  settlement_doc_url VARCHAR(500),
  settled_at DATETIME,
  -- Payment (populated when advance moves to payment queue)
  invoice_id VARCHAR(100),
  utr VARCHAR(100),
  paid_at DATETIME,
  -- Risk flags (auto-populated by risk engine on queue)
  risk_flags JSON,
  -- Audit
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_advance_ref_tenant (tenant_id, advance_ref),
  INDEX idx_tenant (tenant_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_status (status),
  INDEX idx_ref (advance_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS advance_ref_sequence (
  tenant_id VARCHAR(100) NOT NULL PRIMARY KEY,
  ref_year INT NOT NULL DEFAULT 0,
  last_seq INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO advance_ref_sequence (tenant_id) VALUES ('tenant-default-001');
