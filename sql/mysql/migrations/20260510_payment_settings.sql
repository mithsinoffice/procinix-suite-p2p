-- ============================================================================
-- Tenant-level payment configuration
-- Risk-flag thresholds, business hours, payment defaults, approver roles,
-- payout file format. One row per tenant. Auto-seeded on first read by
-- server/services/payments/paymentSettings.mjs::getSettings().
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_settings (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL UNIQUE,
  -- Risk flag thresholds
  flag_bank_changed_days INT NOT NULL DEFAULT 30,
  flag_duplicate_inv_days INT NOT NULL DEFAULT 30,
  flag_amount_anomaly_multiplier DECIMAL(4,1) NOT NULL DEFAULT 2.5,
  flag_inv_splitting_count INT NOT NULL DEFAULT 3,
  flag_inv_splitting_days INT NOT NULL DEFAULT 7,
  flag_dual_approval_threshold DECIMAL(15,2) NOT NULL DEFAULT 200000.00,
  flag_round_number_min DECIMAL(15,2) NOT NULL DEFAULT 50000.00,
  flag_round_number_divisor INT NOT NULL DEFAULT 1000,
  -- Business hours (IST, 24h)
  business_hours_start TIME NOT NULL DEFAULT '09:00:00',
  business_hours_end TIME NOT NULL DEFAULT '19:00:00',
  business_days VARCHAR(40) NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI',
  -- Payment defaults
  default_payment_mode VARCHAR(10) NOT NULL DEFAULT 'NEFT',
  rtgs_threshold DECIMAL(15,2) NOT NULL DEFAULT 200000.00,
  -- MSME
  msme_warning_days INT NOT NULL DEFAULT 7,
  -- Approver roles (comma-separated, lowercase, underscore-separated)
  payment_approver_roles VARCHAR(500) NOT NULL DEFAULT 'payment_approver,cfo,admin',
  -- Payout
  default_payout_format VARCHAR(20) NOT NULL DEFAULT 'HDFC_BULK',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed default row for the existing tenant. The service layer will INSERT
-- IGNORE for any other tenant on first read.
INSERT IGNORE INTO payment_settings (id, tenant_id)
VALUES (UUID(), 'tenant-default-001');
