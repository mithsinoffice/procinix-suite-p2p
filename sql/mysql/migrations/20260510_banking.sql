-- ============================================================================
-- Banking module — Mode A (Connected) + Mode B (Manual file) per bank account
-- ============================================================================
-- Three new tables:
--   bank_accounts             — registry of company bank accounts, per tenant/entity
--   bank_payment_batches      — payment batches initiated from the Banking tab
--   bank_payment_batch_items  — per-vendor lines inside a batch
--
-- NOTE: a separate `payment_batches` table already exists for the
-- PaymentProposal flow (server/services/payments/paymentBatches.mjs) with a
-- completely different schema. We deliberately use `bank_payment_batches` /
-- `bank_payment_batch_items` here to avoid colliding with that flow.
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  bank_name VARCHAR(20) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  account_type VARCHAR(20) NOT NULL DEFAULT 'current',
  integration_mode VARCHAR(20) NOT NULL DEFAULT 'manual',
  api_key_ref VARCHAR(200),
  api_secret_ref VARCHAR(200),
  last_balance DECIMAL(18,2),
  last_balance_at DATETIME,
  payout_format VARCHAR(20) DEFAULT 'HDFC_BULK',
  bank_gl_code VARCHAR(50),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id),
  INDEX idx_entity (entity_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bank_payment_batches (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  batch_ref VARCHAR(50) NOT NULL,
  bank_account_id VARCHAR(36) NOT NULL,
  total_amount DECIMAL(18,2) NOT NULL,
  item_count INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  integration_mode VARCHAR(20) NOT NULL,
  payment_mode VARCHAR(10) NOT NULL DEFAULT 'NEFT',
  payment_date DATE NULL,
  bank_transaction_ref VARCHAR(200),
  initiated_at DATETIME,
  payout_file_path VARCHAR(500),
  payout_file_format VARCHAR(50),
  file_generated_at DATETIME,
  uploaded_at DATETIME,
  utr_file_path VARCHAR(500),
  utr_ingested_at DATETIME,
  jv_created TINYINT(1) NOT NULL DEFAULT 0,
  jv_ref VARCHAR(100),
  jv_created_at DATETIME,
  created_by VARCHAR(100),
  approved_by VARCHAR(100),
  approved_at DATETIME,
  reject_reason TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bpb_ref_tenant (tenant_id, batch_ref),
  INDEX idx_tenant_status (tenant_id, status),
  INDEX idx_bank (bank_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bank_payment_batch_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  batch_id VARCHAR(36) NOT NULL,
  invoice_id VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  vendor_id VARCHAR(100) NOT NULL,
  vendor_name VARCHAR(200) NOT NULL,
  bank_account_no VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  payment_mode VARCHAR(10) NOT NULL DEFAULT 'NEFT',
  narration VARCHAR(255),
  client_ref VARCHAR(100),
  utr VARCHAR(100),
  utr_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  utr_confirmed_at DATETIME,
  jv_line_ref VARCHAR(100),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_batch (batch_id),
  INDEX idx_invoice (invoice_id),
  INDEX idx_utr (utr),
  INDEX idx_client_ref (client_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
