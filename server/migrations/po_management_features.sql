-- PO Management Features: Force Closure, Auto Expiry, PO Amendment
-- Migration created 2026-04-12

CREATE TABLE IF NOT EXISTS p2p_schema_mt.po_amendments (
  id VARCHAR(36) PRIMARY KEY,
  po_id VARCHAR(36) NOT NULL,
  amendment_number INT NOT NULL,
  amendment_type ENUM('price','quantity','delivery','full') NOT NULL,
  amendment_reason TEXT,
  supporting_document_url VARCHAR(500),
  vendor_acknowledged BOOLEAN DEFAULT FALSE,
  original_value DECIMAL(15,2),
  amended_value DECIMAL(15,2),
  value_change DECIMAL(15,2),
  value_change_pct DECIMAL(5,2),
  changes_json JSON,
  status ENUM('draft','pending_approval','approved','rejected') DEFAULT 'draft',
  submitted_by VARCHAR(36),
  submitted_at DATETIME,
  approved_by VARCHAR(36),
  approved_at DATETIME,
  rejected_by VARCHAR(36),
  rejected_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_po_id (po_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS p2p_schema_mt.po_amendment_line_changes (
  id VARCHAR(36) PRIMARY KEY,
  amendment_id VARCHAR(36) NOT NULL,
  po_line_item_id VARCHAR(36) NOT NULL,
  field_changed VARCHAR(50),
  original_value VARCHAR(500),
  new_value VARCHAR(500),
  change_reason VARCHAR(200),
  INDEX idx_amendment_id (amendment_id)
);

CREATE TABLE IF NOT EXISTS p2p_schema_mt.po_expiry_log (
  id VARCHAR(36) PRIMARY KEY,
  po_id VARCHAR(36) NOT NULL,
  event_type ENUM('reminder_sent','expired','auto_closed','extended','manually_closed'),
  event_detail TEXT,
  triggered_by VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_po_id (po_id)
);
