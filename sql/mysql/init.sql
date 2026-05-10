CREATE TABLE IF NOT EXISTS item_master (
  id CHAR(36) NOT NULL PRIMARY KEY,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  item_alias VARCHAR(255) NULL,
  item_status VARCHAR(50) NOT NULL DEFAULT 'Active',
  item_description TEXT NULL,
  uom VARCHAR(100) NULL,
  item_group_master VARCHAR(255) NULL,
  procurement_category VARCHAR(255) NULL,
  entity_name VARCHAR(255) NULL,
  expenditure_type VARCHAR(255) NULL,
  gl_account_code VARCHAR(100) NULL,
  gl_account_description VARCHAR(255) NULL,
  nature VARCHAR(100) NULL,
  rcm_applicable VARCHAR(50) NULL,
  hsn_code VARCHAR(100) NULL,
  sac_code VARCHAR(100) NULL,
  gst_rate VARCHAR(50) NULL,
  default_itc_eligibility VARCHAR(100) NULL,
  po_required VARCHAR(50) NULL,
  reorder_level VARCHAR(100) NULL,
  max_order_qty VARCHAR(100) NULL,
  approval_status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_item_master_item_code (item_code)
);

CREATE TABLE IF NOT EXISTS erp_master_categories (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  record_code VARCHAR(191) NULL,
  record_name VARCHAR(255) NULL,
  status VARCHAR(50) NULL,
  approval_status VARCHAR(50) NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_erp_master_categories_updated_at (updated_at)
);

CREATE TABLE IF NOT EXISTS erp_master_colors (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_countries (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_states (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_departments (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_tax_codes (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_sizes (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_item_categories (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_vendor_payment_terms (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_products (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_skus (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_uoms (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_debit_note_reasons (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_cost_centres (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_profit_centres (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_employees (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_contracts (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_roles (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_users (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_currencies (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_entities (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_exchange_rates (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_vendors (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_account_codes (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS erp_master_banks (
  LIKE erp_master_categories
);

CREATE TABLE IF NOT EXISTS master_records (
  master_key VARCHAR(100) NOT NULL,
  id VARCHAR(191) NOT NULL,
  record_code VARCHAR(191) NULL,
  record_name VARCHAR(255) NULL,
  status VARCHAR(50) NULL,
  approval_status VARCHAR(50) NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (master_key, id),
  KEY idx_master_records_master_key_updated_at (master_key, updated_at)
);

CREATE TABLE IF NOT EXISTS master_record_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  master_key VARCHAR(100) NOT NULL,
  master_record_id VARCHAR(191) NOT NULL,
  action_type VARCHAR(20) NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_master_record_versions_lookup (master_key, master_record_id, created_at)
);

CREATE TABLE IF NOT EXISTS approval_workflows (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_name VARCHAR(255) NOT NULL,
  min_amount VARCHAR(100) NULL,
  max_amount VARCHAR(100) NULL,
  approver VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_configurations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_name VARCHAR(255) NOT NULL,
  module_name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  trigger_event VARCHAR(100) NOT NULL DEFAULT 'On Record Submission',
  conditions JSON NOT NULL,
  steps JSON NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  created_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS domain_documents (
  domain_name VARCHAR(100) NOT NULL PRIMARY KEY,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Supported JSON document domains (payload shapes differ by domain):
--   vendor_invitations → { "invitations": [ ... ] } — vendor onboarding invites + submissions
--   (see sql/mysql/migrations/20260410_vendor_invitations_document.sql)

-- ============================================================================
-- Per-master DB tables that fall outside the erp_master_* template (fresh-DB
-- provisioning bootstrap; seed data lives in dated migrations).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS location_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS location_master.location_master (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  record_code VARCHAR(255),
  record_name VARCHAR(255),
  status VARCHAR(64),
  approval_status VARCHAR(64),
  payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_record_code (record_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE DATABASE IF NOT EXISTS gl_code_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS gl_code_master.gl_code_master (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  record_code VARCHAR(255),
  record_name VARCHAR(255),
  status VARCHAR(64),
  approval_status VARCHAR(64),
  payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_record_code (record_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE DATABASE IF NOT EXISTS vendor_group_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS vendor_group_master.vendor_group_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  record_code VARCHAR(50) NOT NULL,
  record_name VARCHAR(200) NOT NULL,
  group_type VARCHAR(100),
  industry VARCHAR(100),
  headquarters VARCHAR(200),
  website VARCHAR(200),
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  approval_status ENUM('Approved','Pending Approval','Rejected') NOT NULL DEFAULT 'Approved',
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code_tenant (record_code, tenant_id),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE DATABASE IF NOT EXISTS designation_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS designation_master.designation_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  record_code VARCHAR(50) NOT NULL,
  record_name VARCHAR(200) NOT NULL,
  level INT DEFAULT 5,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  approval_status ENUM('Approved','Pending Approval','Rejected') NOT NULL DEFAULT 'Approved',
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code_tenant (record_code, tenant_id),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
