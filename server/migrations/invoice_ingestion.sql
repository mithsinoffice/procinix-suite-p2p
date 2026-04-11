CREATE TABLE IF NOT EXISTS invoice_ingestion_log (
  id VARCHAR(36) PRIMARY KEY,
  message_id VARCHAR(500) UNIQUE,
  sender_email VARCHAR(255),
  sender_name VARCHAR(255),
  subject TEXT,
  received_at DATETIME,
  attachment_count INT DEFAULT 0,
  status ENUM('received','processing','processed','failed','skipped') DEFAULT 'received',
  error_message TEXT,
  processed_at DATETIME,
  invoice_ids JSON,
  raw_email_meta JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_exceptions (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  exception_type VARCHAR(50),
  exception_detail TEXT,
  severity ENUM('low','medium','high') DEFAULT 'medium',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by VARCHAR(36),
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_resolved (resolved)
);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(36) PRIMARY KEY,
  invoice_number VARCHAR(100),
  invoice_date DATE,
  due_date DATE,
  vendor_name VARCHAR(255),
  vendor_gstin VARCHAR(20),
  vendor_pan VARCHAR(15),
  vendor_email VARCHAR(255),
  bill_to_entity VARCHAR(255),
  bill_to_gstin VARCHAR(20),
  currency VARCHAR(10) DEFAULT 'INR',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  tax_rate DECIMAL(5,2),
  total_amount DECIMAL(15,2) DEFAULT 0,
  po_number VARCHAR(100),
  po_id VARCHAR(36),
  irn VARCHAR(255),
  hsn_sac_summary TEXT,
  payment_terms VARCHAR(255),
  bank_details JSON,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  source VARCHAR(50) DEFAULT 'manual',
  ingestion_log_id VARCHAR(36),
  metadata JSON,
  attachment_path TEXT,
  entity_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_vendor (vendor_name),
  INDEX idx_source (source)
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  line_number INT,
  description TEXT,
  quantity DECIMAL(15,3) DEFAULT 0,
  unit_price DECIMAL(15,2) DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  hsn_sac VARCHAR(20),
  gst_rate DECIMAL(5,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_id (invoice_id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(36) PRIMARY KEY,
  po_number VARCHAR(100),
  vendor_name VARCHAR(255),
  total_amount DECIMAL(15,2) DEFAULT 0,
  po_date DATE,
  entity_id VARCHAR(36),
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_po_number (po_number),
  INDEX idx_vendor (vendor_name)
);
