ALTER TABLE invoice_ingestion_log
  ADD COLUMN ocr_field_scores JSON NULL,
  ADD COLUMN ocr_conflicts JSON NULL,
  ADD COLUMN ocr_overall_confidence DECIMAL(5,2) NULL,
  ADD COLUMN fields_matched INT DEFAULT 0,
  ADD COLUMN fields_conflicted INT DEFAULT 0,
  ADD COLUMN fields_low_confidence INT DEFAULT 0,
  ADD COLUMN fields_not_found INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS ocr_field_corrections (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  ingestion_log_id VARCHAR(36),
  vendor_id VARCHAR(36),
  entity_id VARCHAR(36),
  field_name VARCHAR(100) NOT NULL,
  ocr_extracted_value TEXT,
  correct_value TEXT,
  correction_type ENUM(
    'vendor_name_mapping',
    'gstin_ocr_error',
    'date_selection',
    'department_mapping',
    'amount_format',
    'custom'
  ) NOT NULL,
  correction_description TEXT,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by VARCHAR(36),
  confirmed_at DATETIME,
  applied_to_learning BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vendor (vendor_id),
  INDEX idx_field (field_name),
  INDEX idx_confirmed (confirmed)
);

CREATE TABLE IF NOT EXISTS ocr_learning_patterns (
  id VARCHAR(36) PRIMARY KEY,
  pattern_type ENUM(
    'vendor_name_alias',
    'character_confusion',
    'department_mapping',
    'date_position',
    'amount_format',
    'entity_mapping'
  ) NOT NULL,
  input_pattern TEXT NOT NULL,
  correct_output TEXT NOT NULL,
  vendor_id VARCHAR(36),
  entity_id VARCHAR(36),
  confidence_boost DECIMAL(5,2) DEFAULT 10.00,
  times_applied INT DEFAULT 0,
  times_correct INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_from_correction_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pattern_type (pattern_type),
  INDEX idx_vendor (vendor_id)
);
