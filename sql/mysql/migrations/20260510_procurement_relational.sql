-- ============================================================================
-- Procurement Relational — PR / PO / GRN / SRN
-- ============================================================================
--   doc_ref_sequences          — collision-safe per tenant/entity/year/doc-type
--   purchase_requests + items  — PR header + lines (multi-type)
--   purchase_orders   + items  — PO header + lines (with consumption tracking)
--   po_pr_links                — many-to-many PR↔PO link
--   goods_receipt_notes + items
--   service_receipt_notes + items
--   procurement_audit_log      — unified audit trail (PR/PO/GRN/SRN)
--
-- Idempotent: every table is CREATE TABLE IF NOT EXISTS, every seed is
-- INSERT IGNORE.
-- ============================================================================

-- ── doc_ref_sequences ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doc_ref_sequences (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  entity_code VARCHAR(50) NOT NULL,
  doc_type ENUM('PR', 'PO', 'GRN', 'SRN') NOT NULL,
  year INT NOT NULL,
  last_seq INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sequence (tenant_id, entity_code, doc_type, year),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── purchase_requests + items ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_requests (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  pr_ref VARCHAR(50) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  entity_code VARCHAR(50) NOT NULL,
  pr_type ENUM('regular','catalogue','kit_bundle','service','asset_capex','blanket') NOT NULL DEFAULT 'regular',
  requester_id VARCHAR(100) NOT NULL,
  requester_name VARCHAR(200) NOT NULL,
  department VARCHAR(100),
  cost_centre VARCHAR(100),
  delivery_location VARCHAR(200),
  need_by_date DATE,
  business_justification TEXT,
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_gst DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('draft','pending_approval','approved','rejected','converted_to_po','cancelled') NOT NULL DEFAULT 'draft',
  approved_by VARCHAR(100),
  approved_at DATETIME,
  rejected_by VARCHAR(100),
  rejected_at DATETIME,
  rejection_reason TEXT,
  -- blanket-PR specific
  blanket_ceiling DECIMAL(15,2),
  blanket_validity_from DATE,
  blanket_validity_to DATE,
  -- asset/capex specific
  asset_class VARCHAR(100),
  capex_budget_ref VARCHAR(100),
  created_by VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pr_ref_tenant (tenant_id, pr_ref),
  INDEX idx_pr_tenant (tenant_id),
  INDEX idx_pr_status (status),
  INDEX idx_pr_entity (entity_id),
  INDEX idx_pr_ref (pr_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS purchase_request_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  pr_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  line_number INT NOT NULL,
  item_type ENUM('material','service','asset','kit') NOT NULL DEFAULT 'material',
  item_code VARCHAR(100),
  item_description VARCHAR(500),
  vendor_id VARCHAR(100),
  vendor_name VARCHAR(200),
  quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  unit VARCHAR(50),
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  price_variance_pct DECIMAL(7,2),
  parent_line_id VARCHAR(36),
  is_kit_parent TINYINT(1) NOT NULL DEFAULT 0,
  service_period_from DATE,
  service_period_to DATE,
  asset_tag VARCHAR(100),
  depreciation_years INT,
  ship_to_location VARCHAR(200),
  delivery_date DATE,
  line_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_type ENUM('IGST','CGST_SGST','exempt') NOT NULL DEFAULT 'IGST',
  gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_with_gst DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pri_pr (pr_id),
  INDEX idx_pri_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── purchase_orders + items ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders_proc (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  po_ref VARCHAR(50) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  entity_code VARCHAR(50) NOT NULL,
  vendor_id VARCHAR(100) NOT NULL,
  vendor_name VARCHAR(200) NOT NULL,
  vendor_gstin VARCHAR(20),
  bill_to_gstin VARCHAR(20),
  po_type ENUM('regular','service','asset_capex','blanket') NOT NULL DEFAULT 'regular',
  payment_terms VARCHAR(200),
  delivery_terms VARCHAR(200),
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_gst DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_with_gst DECIMAL(15,2) NOT NULL DEFAULT 0,
  blanket_ceiling DECIMAL(15,2),
  blanket_consumed DECIMAL(15,2) NOT NULL DEFAULT 0,
  blanket_validity_from DATE,
  blanket_validity_to DATE,
  status ENUM('draft','issued','partially_received','fully_received','invoiced','closed','cancelled') NOT NULL DEFAULT 'draft',
  issued_at DATETIME,
  closed_at DATETIME,
  created_by VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_po_ref_tenant (tenant_id, po_ref),
  INDEX idx_po_tenant (tenant_id),
  INDEX idx_po_status (status),
  INDEX idx_po_vendor (vendor_id),
  INDEX idx_po_entity (entity_id),
  INDEX idx_po_ref (po_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  po_id VARCHAR(36) NOT NULL,
  pr_item_id VARCHAR(36),
  tenant_id VARCHAR(100) NOT NULL,
  line_number INT NOT NULL,
  item_type ENUM('material','service','asset','kit') NOT NULL DEFAULT 'material',
  item_code VARCHAR(100),
  item_description VARCHAR(500),
  quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  unit VARCHAR(50),
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  line_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_type ENUM('IGST','CGST_SGST','exempt') NOT NULL DEFAULT 'IGST',
  gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_with_gst DECIMAL(15,2) NOT NULL DEFAULT 0,
  ship_to_location VARCHAR(200),
  delivery_date DATE,
  qty_received DECIMAL(15,3) NOT NULL DEFAULT 0,
  amount_consumed DECIMAL(15,2) NOT NULL DEFAULT 0,
  match_status ENUM('pending','matched','partial','exception') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_poi_po (po_id),
  INDEX idx_poi_tenant (tenant_id),
  INDEX idx_poi_pri (pr_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS po_pr_links (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  po_id VARCHAR(36) NOT NULL,
  pr_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_po_pr (po_id, pr_id),
  INDEX idx_ppl_pr (pr_id),
  INDEX idx_ppl_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── goods_receipt_notes + items (GRN) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS goods_receipt_notes (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  grn_ref VARCHAR(50) NOT NULL,
  po_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  entity_code VARCHAR(50) NOT NULL,
  vendor_id VARCHAR(100),
  receipt_date DATE NOT NULL,
  received_by VARCHAR(100),
  delivery_note_no VARCHAR(100),
  vehicle_no VARCHAR(50),
  remarks TEXT,
  status ENUM('draft','confirmed','cancelled') NOT NULL DEFAULT 'draft',
  confirmed_at DATETIME,
  created_by VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_grn_ref_tenant (tenant_id, grn_ref),
  INDEX idx_grn_tenant (tenant_id),
  INDEX idx_grn_po (po_id),
  INDEX idx_grn_status (status),
  INDEX idx_grn_ref (grn_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS grn_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  grn_id VARCHAR(36) NOT NULL,
  po_item_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  line_number INT NOT NULL,
  item_description VARCHAR(500),
  qty_ordered DECIMAL(15,3) NOT NULL DEFAULT 0,
  qty_received DECIMAL(15,3) NOT NULL DEFAULT 0,
  qty_accepted DECIMAL(15,3) NOT NULL DEFAULT 0,
  qty_rejected DECIMAL(15,3) NOT NULL DEFAULT 0,
  rejection_reason VARCHAR(500),
  unit VARCHAR(50),
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  line_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_grni_grn (grn_id),
  INDEX idx_grni_poi (po_item_id),
  INDEX idx_grni_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── service_receipt_notes + items (SRN) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_receipt_notes (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  srn_ref VARCHAR(50) NOT NULL,
  po_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  entity_code VARCHAR(50) NOT NULL,
  vendor_id VARCHAR(100),
  service_period_from DATE,
  service_period_to DATE,
  receipt_date DATE NOT NULL,
  accepted_by VARCHAR(100),
  remarks TEXT,
  status ENUM('draft','confirmed','cancelled') NOT NULL DEFAULT 'draft',
  confirmed_at DATETIME,
  created_by VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_srn_ref_tenant (tenant_id, srn_ref),
  INDEX idx_srn_tenant (tenant_id),
  INDEX idx_srn_po (po_id),
  INDEX idx_srn_status (status),
  INDEX idx_srn_ref (srn_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS srn_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  srn_id VARCHAR(36) NOT NULL,
  po_item_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  line_number INT NOT NULL,
  service_description VARCHAR(500),
  po_line_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_consumed DECIMAL(15,2) NOT NULL DEFAULT 0,
  consumption_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  milestone VARCHAR(200),
  remarks VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_srni_srn (srn_id),
  INDEX idx_srni_poi (po_item_id),
  INDEX idx_srni_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── procurement_audit_log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procurement_audit_log (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  doc_type ENUM('PR','PO','GRN','SRN') NOT NULL,
  doc_id VARCHAR(36) NOT NULL,
  doc_ref VARCHAR(50) NOT NULL,
  action VARCHAR(80) NOT NULL,
  changed_by VARCHAR(100),
  changed_by_name VARCHAR(200),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  remarks TEXT,
  INDEX idx_doc (doc_type, doc_id),
  INDEX idx_pal_tenant (tenant_id),
  INDEX idx_pal_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Seed doc_ref_sequences for tenant-default-001 / PTPL ────────────────────
INSERT IGNORE INTO doc_ref_sequences (id, tenant_id, entity_code, doc_type, year, last_seq) VALUES
  (UUID(), 'tenant-default-001', 'PTPL', 'PR',  YEAR(CURDATE()), 0),
  (UUID(), 'tenant-default-001', 'PTPL', 'PO',  YEAR(CURDATE()), 0),
  (UUID(), 'tenant-default-001', 'PTPL', 'GRN', YEAR(CURDATE()), 0),
  (UUID(), 'tenant-default-001', 'PTPL', 'SRN', YEAR(CURDATE()), 0);
