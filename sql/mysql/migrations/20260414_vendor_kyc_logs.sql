-- Audit log for every KYC verification call (Ongrid Gridlines)
CREATE TABLE IF NOT EXISTS vendor_kyc_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  vendor_id CHAR(36) NULL,
  pan VARCHAR(10) NULL,
  gstin VARCHAR(15) NULL,
  check_type VARCHAR(40) NOT NULL,
  provider VARCHAR(40) NOT NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  mock_mode TINYINT(1) NOT NULL DEFAULT 0,
  transaction_id VARCHAR(120) NULL,
  response_json JSON NULL,
  checked_by VARCHAR(120) NULL,
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vendor_kyc_logs_vendor_id (vendor_id),
  KEY idx_vendor_kyc_logs_pan (pan),
  KEY idx_vendor_kyc_logs_gstin (gstin),
  KEY idx_vendor_kyc_logs_checked_at (checked_at)
);
