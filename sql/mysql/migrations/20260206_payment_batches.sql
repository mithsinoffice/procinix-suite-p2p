-- Payment batches (maker-checker) + lines; execution inserts into `payments`.
-- Idempotent: safe to re-run (CREATE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS `payment_batches` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NOT NULL,
  `entity_id` VARCHAR(36) NULL,
  `batch_no` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `payment_date` DATE NULL,
  `payment_mode` VARCHAR(32) NULL DEFAULT 'neft',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `total_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `created_by_email` VARCHAR(255) NULL,
  `created_by_name` VARCHAR(255) NULL,
  `approved_by_email` VARCHAR(255) NULL,
  `approved_at` DATETIME NULL,
  `executed_by_email` VARCHAR(255) NULL,
  `executed_at` DATETIME NULL,
  `bank_account_json` JSON NULL,
  `comments` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_batches_no_tenant` (`tenant_id`, `batch_no`),
  KEY `idx_pb_tenant_status` (`tenant_id`, `status`),
  KEY `idx_pb_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `payment_batch_lines` (
  `id` VARCHAR(36) NOT NULL,
  `batch_id` VARCHAR(36) NOT NULL,
  `invoice_id` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pbl_batch_invoice` (`batch_id`, `invoice_id`),
  KEY `idx_pbl_invoice` (`invoice_id`),
  KEY `idx_pbl_batch` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
