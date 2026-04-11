-- ═══════════════════════════════════════════════════════
-- Agentic AI Invoice Processing — Wave 1 Schema
-- 9-agent governed architecture with 3-lane routing
-- ═══════════════════════════════════════════════════════

-- ── Intake / Document ───────────────────────────────────

CREATE TABLE IF NOT EXISTS ap_invoice_intake_batches (
  id VARCHAR(36) PRIMARY KEY,
  source_channel ENUM('email','portal','upload','api','scan') NOT NULL,
  source_reference VARCHAR(500),
  entity_id VARCHAR(36),
  document_count INT DEFAULT 0,
  status ENUM('received','classifying','classified','failed') DEFAULT 'received',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_source (source_channel)
);

CREATE TABLE IF NOT EXISTS ap_invoice_documents (
  id VARCHAR(36) PRIMARY KEY,
  batch_id VARCHAR(36),
  invoice_id VARCHAR(36),
  document_type ENUM('invoice','credit_note','debit_note','supporting_doc','unknown') DEFAULT 'unknown',
  filename VARCHAR(500),
  mime_type VARCHAR(100),
  file_size_bytes INT,
  file_path TEXT,
  content_hash VARCHAR(128),
  page_count INT DEFAULT 1,
  quality_score DECIMAL(5,2),
  status ENUM('received','classified','extracting','extracted','failed') DEFAULT 'received',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_batch (batch_id),
  INDEX idx_invoice (invoice_id),
  INDEX idx_hash (content_hash),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS ap_invoice_document_hashes (
  id VARCHAR(36) PRIMARY KEY,
  content_hash VARCHAR(128) UNIQUE,
  document_id VARCHAR(36),
  invoice_id VARCHAR(36),
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hash (content_hash)
);

-- ── Extraction ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ap_invoice_extractions (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  document_id VARCHAR(36),
  provider VARCHAR(50),
  model_version VARCHAR(100),
  raw_response JSON,
  extraction_score_header DECIMAL(5,2),
  extraction_score_lines DECIMAL(5,2),
  overall_confidence DECIMAL(5,4),
  field_count INT DEFAULT 0,
  line_item_count INT DEFAULT 0,
  processing_time_ms INT,
  status ENUM('pending','completed','failed') DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS ap_invoice_field_confidence (
  id VARCHAR(36) PRIMARY KEY,
  extraction_id VARCHAR(36),
  invoice_id VARCHAR(36),
  field_name VARCHAR(100),
  field_value TEXT,
  confidence DECIMAL(5,4),
  evidence_text TEXT,
  evidence_page INT,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_value TEXT,
  edited_by VARCHAR(36),
  edited_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_extraction (extraction_id),
  INDEX idx_invoice (invoice_id),
  INDEX idx_field (field_name)
);

CREATE TABLE IF NOT EXISTS ap_invoice_extracted_line_items (
  id VARCHAR(36) PRIMARY KEY,
  extraction_id VARCHAR(36),
  invoice_id VARCHAR(36),
  line_number INT,
  description TEXT,
  quantity DECIMAL(15,3),
  unit_price DECIMAL(15,2),
  amount DECIMAL(15,2),
  hsn_sac VARCHAR(20),
  gst_rate DECIMAL(5,2),
  confidence DECIMAL(5,4),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_extraction (extraction_id),
  INDEX idx_invoice (invoice_id)
);

-- ── Matching / Validation ───────────────────────────────

CREATE TABLE IF NOT EXISTS ap_invoice_vendor_matches (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  method VARCHAR(50),
  matched_vendor_id VARCHAR(36),
  matched_vendor_name VARCHAR(255),
  match_confidence DECIMAL(5,4),
  alternate_candidates JSON,
  is_new_vendor BOOLEAN DEFAULT FALSE,
  is_suspicious BOOLEAN DEFAULT FALSE,
  explanation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id)
);

CREATE TABLE IF NOT EXISTS ap_invoice_duplicate_checks (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  check_type ENUM('exact','fuzzy','hash') NOT NULL,
  duplicate_invoice_id VARCHAR(36),
  risk_score DECIMAL(5,2) DEFAULT 0,
  match_details JSON,
  explanation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id),
  INDEX idx_risk (risk_score)
);

CREATE TABLE IF NOT EXISTS ap_invoice_match_results (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  match_type ENUM('2way_po','3way_po_grn','service_po','contract','recurring','none') DEFAULT 'none',
  po_id VARCHAR(36),
  po_number VARCHAR(100),
  grn_id VARCHAR(36),
  match_confidence DECIMAL(5,4),
  qty_variance_pct DECIMAL(5,2),
  rate_variance_pct DECIMAL(5,2),
  amount_variance_pct DECIMAL(5,2),
  line_match_details JSON,
  explanation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id)
);

CREATE TABLE IF NOT EXISTS ap_invoice_tax_validations (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  tax_type VARCHAR(20),
  expected_treatment VARCHAR(50),
  actual_treatment VARCHAR(50),
  arithmetic_valid BOOLEAN DEFAULT TRUE,
  gst_type_valid BOOLEAN DEFAULT TRUE,
  registration_valid BOOLEAN DEFAULT TRUE,
  withholding_applicable BOOLEAN DEFAULT FALSE,
  withholding_section VARCHAR(20),
  withholding_rate DECIMAL(5,2),
  issues JSON,
  score DECIMAL(5,2) DEFAULT 100,
  explanation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id)
);

CREATE TABLE IF NOT EXISTS ap_invoice_accounting_suggestions (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  line_item_id VARCHAR(36),
  gl_code VARCHAR(20),
  gl_name VARCHAR(255),
  cost_center VARCHAR(50),
  profit_center VARCHAR(50),
  project_code VARCHAR(50),
  tax_code VARCHAR(20),
  confidence DECIMAL(5,4),
  source VARCHAR(50),
  explanation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id)
);

-- ── Decision / Workflow ─────────────────────────────────

CREATE TABLE IF NOT EXISTS ap_invoice_agent_decisions (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  agent_name VARCHAR(50) NOT NULL,
  agent_version VARCHAR(20) DEFAULT '1.0',
  decision VARCHAR(50),
  confidence DECIMAL(5,4),
  explanation TEXT NOT NULL,
  input_summary JSON,
  output_summary JSON,
  processing_time_ms INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id),
  INDEX idx_agent (agent_name),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS ap_invoice_workflow_routes (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  lane ENUM('green','amber','red') NOT NULL,
  lane_reason TEXT,
  assigned_to VARCHAR(36),
  assigned_role VARCHAR(50),
  sla_hours INT DEFAULT 24,
  confidence_scores JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id),
  INDEX idx_lane (lane)
);

CREATE TABLE IF NOT EXISTS ap_invoice_posting_queue (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  posting_readiness_score DECIMAL(5,2),
  auto_post_flag BOOLEAN DEFAULT FALSE,
  auto_post_reason TEXT,
  posted_at DATETIME,
  posting_reference VARCHAR(100),
  status ENUM('queued','posting','posted','failed','held') DEFAULT 'queued',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS ap_invoice_review_tasks (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  task_type ENUM('field_review','vendor_query','tax_review','procurement_review','finance_approval') NOT NULL,
  assigned_to VARCHAR(36),
  fields_to_review JSON,
  status ENUM('open','in_progress','completed','cancelled') DEFAULT 'open',
  completed_by VARCHAR(36),
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id),
  INDEX idx_status (status),
  INDEX idx_assigned (assigned_to)
);

CREATE TABLE IF NOT EXISTS ap_invoice_exception_cases (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  exception_type VARCHAR(50) NOT NULL,
  exception_detail TEXT,
  severity ENUM('low','medium','high','critical') DEFAULT 'medium',
  category VARCHAR(50),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by VARCHAR(36),
  resolved_at DATETIME,
  resolution_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id),
  INDEX idx_type (exception_type),
  INDEX idx_severity (severity),
  INDEX idx_resolved (resolved)
);

-- ── Audit / Explainability ──────────────────────────────

CREATE TABLE IF NOT EXISTS ap_invoice_explainability_logs (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  stage VARCHAR(50),
  explanation TEXT NOT NULL,
  data_snapshot JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id),
  INDEX idx_stage (stage)
);

CREATE TABLE IF NOT EXISTS ap_invoice_reviewer_actions (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  action_type ENUM('approve','reject','correct','hold','query','escalate') NOT NULL,
  field_corrections JSON,
  comments TEXT,
  actor VARCHAR(36),
  actor_role VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice (invoice_id),
  INDEX idx_action (action_type)
);

-- ── Update existing invoices table (safe for re-runs) ──

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'invoices' AND column_name = 'lane');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE invoices ADD COLUMN lane VARCHAR(10) DEFAULT NULL, ADD COLUMN posting_readiness_score DECIMAL(5,2) DEFAULT NULL, ADD COLUMN auto_post_flag BOOLEAN DEFAULT FALSE, ADD COLUMN human_touched_flag BOOLEAN DEFAULT FALSE, ADD COLUMN extraction_model_version VARCHAR(100) DEFAULT NULL, ADD COLUMN document_id VARCHAR(36) DEFAULT NULL, ADD COLUMN batch_id VARCHAR(36) DEFAULT NULL, ADD COLUMN processing_status VARCHAR(50) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
