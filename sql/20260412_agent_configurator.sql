-- Agent Configurator — 4 tables
-- Run against the p2p_schema_mt database

USE p2p_schema_mt;

CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('Validation','Automation','Enrichment','Approval','Ingestion') NOT NULL DEFAULT 'Validation',
  purpose TEXT,
  module VARCHAR(128),
  form_name VARCHAR(128),
  application_on ENUM('Form','Master') NOT NULL DEFAULT 'Form',
  entity_scope VARCHAR(255) DEFAULT '',
  trigger_event ENUM('On email received','On form submission','On record creation','On status change','Scheduled','Manual') NOT NULL DEFAULT 'Manual',
  target_accuracy DECIMAL(5,2) DEFAULT 95.00,
  fallback_action ENUM('Create exception','Notify admin','Reject','Retry','Skip') DEFAULT 'Create exception',
  status ENUM('Active','Inactive','Draft','Testing') NOT NULL DEFAULT 'Draft',
  accuracy_score DECIMAL(5,2) DEFAULT 0.00,
  created_by VARCHAR(128) DEFAULT 'System',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agents_status (status),
  INDEX idx_agents_module (module)
);

CREATE TABLE IF NOT EXISTS agent_field_rules (
  id VARCHAR(64) PRIMARY KEY,
  agent_id VARCHAR(64) NOT NULL,
  field_name VARCHAR(128) NOT NULL,
  field_type VARCHAR(64) DEFAULT 'string',
  rule_type ENUM('Required','Format validation','Duplicate check','Cross-reference','Math validation','Threshold check','Custom') NOT NULL,
  rule_config JSON,
  logic_description TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  severity ENUM('Error','Warning','Info') DEFAULT 'Error',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rules_agent (agent_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_actions (
  id VARCHAR(64) PRIMARY KEY,
  agent_id VARCHAR(64) NOT NULL,
  trigger_condition VARCHAR(128) DEFAULT 'Always',
  action_type VARCHAR(64) NOT NULL,
  action_config JSON,
  execution_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_actions_agent (agent_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_run_logs (
  id VARCHAR(64) PRIMARY KEY,
  agent_id VARCHAR(64) NOT NULL,
  trigger_data JSON,
  results JSON,
  accuracy_score DECIMAL(5,2) DEFAULT 0.00,
  touchless BOOLEAN DEFAULT FALSE,
  duration_ms INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_agent (agent_id),
  INDEX idx_logs_created (created_at),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_corrections (
  id VARCHAR(64) PRIMARY KEY,
  agent_id VARCHAR(64) NOT NULL,
  run_log_id VARCHAR(64),
  field_name VARCHAR(128),
  original_value TEXT,
  corrected_value TEXT,
  corrected_by VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_corrections_agent (agent_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
