-- ═══════════════════════════════════════════════════════
-- Agent Configuration — UI-editable rules and thresholds
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ap_agent_config (
  id VARCHAR(36) PRIMARY KEY,
  agent_name VARCHAR(50) NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT NOT NULL,
  config_type ENUM('number','string','boolean','json') DEFAULT 'string',
  description TEXT,
  category VARCHAR(50),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  updated_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agent_key (agent_name, config_key),
  INDEX idx_agent (agent_name)
);

-- ── Intake Agent Config ─────────────────────────────────
INSERT IGNORE INTO ap_agent_config (id, agent_name, config_key, config_value, config_type, description, category, display_order) VALUES
(UUID(), 'intake', 'min_file_size_bytes', '1000', 'number', 'Minimum file size to accept (bytes). Files smaller are flagged as poor quality.', 'Quality', 1),
(UUID(), 'intake', 'max_file_size_bytes', '52428800', 'number', 'Maximum file size to accept (50MB).', 'Quality', 2),
(UUID(), 'intake', 'accepted_mime_types', '["application/pdf","image/jpeg","image/png","image/tiff","application/octet-stream"]', 'json', 'MIME types accepted for processing.', 'Filters', 3),
(UUID(), 'intake', 'accepted_file_extensions', '[".pdf",".jpg",".jpeg",".png",".tiff",".PDF",".JPG",".PNG"]', 'json', 'File extensions accepted (case-insensitive fallback).', 'Filters', 4),
(UUID(), 'intake', 'enable_content_hash_dedup', 'true', 'boolean', 'Deduplicate documents by SHA-256 content hash.', 'Dedup', 5);

-- ── Extraction Agent Config ─────────────────────────────
INSERT IGNORE INTO ap_agent_config (id, agent_name, config_key, config_value, config_type, description, category, display_order) VALUES
(UUID(), 'extraction', 'primary_provider', 'claude', 'string', 'Primary OCR provider (claude, openai, gemini).', 'Provider', 1),
(UUID(), 'extraction', 'fallback_providers', '["openai","gemini"]', 'json', 'Fallback providers in order of preference.', 'Provider', 2),
(UUID(), 'extraction', 'claude_model', 'claude-sonnet-4-20250514', 'string', 'Claude model version.', 'Provider', 3),
(UUID(), 'extraction', 'openai_model', 'gpt-4o', 'string', 'OpenAI model version.', 'Provider', 4),
(UUID(), 'extraction', 'gemini_model', 'gemini-2.5-flash', 'string', 'Google Gemini model version.', 'Provider', 5),
(UUID(), 'extraction', 'min_confidence_threshold', '0.7', 'number', 'Below this confidence, flag for manual review.', 'Thresholds', 6),
(UUID(), 'extraction', 'max_retries', '2', 'number', 'Max retries per provider before falling back.', 'Retries', 7);

-- ── Vendor Identity Agent Config ────────────────────────
INSERT IGNORE INTO ap_agent_config (id, agent_name, config_key, config_value, config_type, description, category, display_order) VALUES
(UUID(), 'vendor_identity', 'gstin_match_confidence', '0.99', 'number', 'Confidence score for GSTIN exact match.', 'Matching', 1),
(UUID(), 'vendor_identity', 'pan_match_confidence', '0.95', 'number', 'Confidence score for PAN exact match.', 'Matching', 2),
(UUID(), 'vendor_identity', 'name_fuzzy_min_confidence', '0.60', 'number', 'Minimum confidence for fuzzy name match.', 'Matching', 3),
(UUID(), 'vendor_identity', 'name_fuzzy_max_confidence', '0.90', 'number', 'Maximum confidence for fuzzy name match.', 'Matching', 4),
(UUID(), 'vendor_identity', 'email_domain_confidence', '0.70', 'number', 'Confidence for email domain match.', 'Matching', 5),
(UUID(), 'vendor_identity', 'suspicious_threshold', '3', 'number', 'If more than N vendors match by name, flag as suspicious.', 'Flags', 6),
(UUID(), 'vendor_identity', 'enable_new_vendor_flag', 'true', 'boolean', 'Flag invoices from unrecognized vendors.', 'Flags', 7);

-- ── Duplicate & Fraud Agent Config ──────────────────────
INSERT IGNORE INTO ap_agent_config (id, agent_name, config_key, config_value, config_type, description, category, display_order) VALUES
(UUID(), 'duplicate_fraud', 'exact_match_risk', '100', 'number', 'Risk score for exact duplicate (same invoice# + vendor).', 'Risk Scores', 1),
(UUID(), 'duplicate_fraud', 'fuzzy_match_risk', '70', 'number', 'Risk score for fuzzy duplicate (similar invoice# + amount within tolerance).', 'Risk Scores', 2),
(UUID(), 'duplicate_fraud', 'hash_match_risk', '90', 'number', 'Risk score for content hash duplicate.', 'Risk Scores', 3),
(UUID(), 'duplicate_fraud', 'fuzzy_amount_tolerance_pct', '1', 'number', 'Amount tolerance for fuzzy matching (%).', 'Tolerance', 4),
(UUID(), 'duplicate_fraud', 'fuzzy_date_window_days', '7', 'number', 'Date window for fuzzy matching (days).', 'Tolerance', 5),
(UUID(), 'duplicate_fraud', 'duplicate_threshold', '70', 'number', 'Risk score at or above which invoice is flagged as duplicate.', 'Thresholds', 6);

-- ── Match Agent Config ──────────────────────────────────
INSERT IGNORE INTO ap_agent_config (id, agent_name, config_key, config_value, config_type, description, category, display_order) VALUES
(UUID(), 'match', 'po_amount_tolerance_pct', '5', 'number', 'PO amount matching tolerance (%).', 'Tolerance', 1),
(UUID(), 'match', 'po_date_window_days', '90', 'number', 'PO date window for fuzzy matching (days).', 'Tolerance', 2),
(UUID(), 'match', 'recurring_min_invoices', '3', 'number', 'Minimum historical invoices to qualify as recurring pattern.', 'Recurring', 3),
(UUID(), 'match', 'recurring_amount_tolerance_pct', '10', 'number', 'Amount tolerance for recurring pattern detection (%).', 'Recurring', 4),
(UUID(), 'match', 'recurring_lookback_months', '6', 'number', 'How far back to check for recurring patterns (months).', 'Recurring', 5),
(UUID(), 'match', 'enable_3way_match', 'false', 'boolean', 'Enable 3-way PO + GRN matching (requires GRN data).', 'Features', 6);

-- ── Tax & Compliance Agent Config ───────────────────────
INSERT IGNORE INTO ap_agent_config (id, agent_name, config_key, config_value, config_type, description, category, display_order) VALUES
(UUID(), 'tax_compliance', 'arithmetic_tolerance', '0.01', 'number', 'Tolerance for subtotal + tax = total check.', 'Validation', 1),
(UUID(), 'tax_compliance', 'valid_gst_rates', '[0, 5, 12, 18, 28]', 'json', 'Valid GST rate percentages.', 'Validation', 2),
(UUID(), 'tax_compliance', 'tds_threshold_amount', '30000', 'number', 'Amount above which TDS is applicable (INR).', 'TDS', 3),
(UUID(), 'tax_compliance', 'tds_goods_section', '194C', 'string', 'TDS section for goods/contracts.', 'TDS', 4),
(UUID(), 'tax_compliance', 'tds_services_section', '194J', 'string', 'TDS section for professional services.', 'TDS', 5),
(UUID(), 'tax_compliance', 'tds_goods_rate', '2', 'number', 'TDS rate for goods/contracts (%).', 'TDS', 6),
(UUID(), 'tax_compliance', 'tds_services_rate', '10', 'number', 'TDS rate for professional services (%).', 'TDS', 7),
(UUID(), 'tax_compliance', 'score_penalty_per_failure', '20', 'number', 'Points deducted from tax score per validation failure.', 'Scoring', 8);

-- ── Coding Agent Config ─────────────────────────────────
INSERT IGNORE INTO ap_agent_config (id, agent_name, config_key, config_value, config_type, description, category, display_order) VALUES
(UUID(), 'coding', 'po_source_confidence', '0.98', 'number', 'Confidence when GL code derived from PO.', 'Confidence', 1),
(UUID(), 'coding', 'vendor_history_confidence', '0.90', 'number', 'Confidence when GL code derived from vendor history.', 'Confidence', 2),
(UUID(), 'coding', 'keyword_confidence', '0.75', 'number', 'Confidence when GL code derived from keyword matching.', 'Confidence', 3),
(UUID(), 'coding', 'fallback_confidence', '0.50', 'number', 'Confidence for default fallback GL code.', 'Confidence', 4),
(UUID(), 'coding', 'fallback_gl_code', '6900-GE', 'string', 'Default GL code when no match found.', 'Defaults', 5),
(UUID(), 'coding', 'fallback_gl_name', 'General Expense', 'string', 'Default GL name.', 'Defaults', 6),
(UUID(), 'coding', 'fallback_cost_center', 'CC-GENERAL', 'string', 'Default cost center.', 'Defaults', 7),
(UUID(), 'coding', 'fallback_profit_center', 'PC-GENERAL', 'string', 'Default profit center.', 'Defaults', 8),
(UUID(), 'coding', 'keyword_mappings', '{"cloud":"6200-IT","hosting":"6200-IT","server":"6200-IT","AWS":"6200-IT","Azure":"6200-IT","license":"6210-SW","software":"6210-SW","SaaS":"6210-SW","rent":"6300-RE","lease":"6300-RE","office":"6300-RE","travel":"6400-TR","cab":"6400-TR","flight":"6400-TR","hotel":"6400-TR","consulting":"6500-PR","advisory":"6500-PR","professional":"6500-PR","raw material":"5001-RM","supplies":"5001-RM","packaging":"5001-RM"}', 'json', 'Keyword-to-GL-code mapping for description-based coding.', 'Mappings', 9),
(UUID(), 'coding', 'vendor_history_lookback', '5', 'number', 'Number of recent invoices to check for vendor history.', 'History', 10);

-- ── Workflow Routing Agent Config ────────────────────────
INSERT IGNORE INTO ap_agent_config (id, agent_name, config_key, config_value, config_type, description, category, display_order) VALUES
(UUID(), 'workflow_routing', 'green_header_min', '0.985', 'number', 'Min header extraction score for GREEN lane.', 'Green Lane', 1),
(UUID(), 'workflow_routing', 'green_lines_min', '0.97', 'number', 'Min line extraction score for GREEN lane.', 'Green Lane', 2),
(UUID(), 'workflow_routing', 'green_vendor_min', '0.99', 'number', 'Min vendor match score for GREEN lane.', 'Green Lane', 3),
(UUID(), 'workflow_routing', 'green_duplicate_max', '1', 'number', 'Max duplicate risk for GREEN lane.', 'Green Lane', 4),
(UUID(), 'workflow_routing', 'green_tax_min', '100', 'number', 'Min tax score for GREEN lane (must be 100 = all pass).', 'Green Lane', 5),
(UUID(), 'workflow_routing', 'green_accounting_min', '0.97', 'number', 'Min accounting certainty for GREEN lane.', 'Green Lane', 6),
(UUID(), 'workflow_routing', 'amber_header_min', '0.93', 'number', 'Min header score for AMBER lane (below = RED).', 'Amber Lane', 7),
(UUID(), 'workflow_routing', 'amber_lines_min', '0.90', 'number', 'Min line score for AMBER lane.', 'Amber Lane', 8),
(UUID(), 'workflow_routing', 'amber_vendor_min', '0.95', 'number', 'Min vendor score for AMBER lane.', 'Amber Lane', 9),
(UUID(), 'workflow_routing', 'amber_accounting_min', '0.90', 'number', 'Min accounting certainty for AMBER lane.', 'Amber Lane', 10),
(UUID(), 'workflow_routing', 'amber_duplicate_max', '10', 'number', 'Max duplicate risk for AMBER lane (above = RED).', 'Amber Lane', 11),
(UUID(), 'workflow_routing', 'default_sla_hours', '24', 'number', 'Default SLA for review tasks (hours).', 'SLA', 12),
(UUID(), 'workflow_routing', 'weight_extraction', '0.25', 'number', 'Weight of extraction score in posting readiness.', 'Weights', 13),
(UUID(), 'workflow_routing', 'weight_vendor', '0.20', 'number', 'Weight of vendor score in posting readiness.', 'Weights', 14),
(UUID(), 'workflow_routing', 'weight_duplicate', '0.15', 'number', 'Weight of duplicate score in posting readiness.', 'Weights', 15),
(UUID(), 'workflow_routing', 'weight_tax', '0.20', 'number', 'Weight of tax score in posting readiness.', 'Weights', 16),
(UUID(), 'workflow_routing', 'weight_accounting', '0.10', 'number', 'Weight of accounting score in posting readiness.', 'Weights', 17),
(UUID(), 'workflow_routing', 'weight_match', '0.10', 'number', 'Weight of match score in posting readiness.', 'Weights', 18);
