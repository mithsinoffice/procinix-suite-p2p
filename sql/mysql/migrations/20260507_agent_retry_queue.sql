-- Agent retry queue: tracks bounded automatic retries for failed agent pipeline runs.
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS `agent_retry_queue` (
  `id`            VARCHAR(36)  NOT NULL,
  `invoice_id`    VARCHAR(36)  NOT NULL,
  `agent_name`    VARCHAR(100) NOT NULL,
  `attempt_count` INT          NOT NULL DEFAULT 1,
  `next_retry_at` DATETIME     NOT NULL,
  `status`        VARCHAR(20)  NOT NULL DEFAULT 'pending',
  `last_error`    TEXT         NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_arq_invoice` (`invoice_id`),
  KEY `idx_arq_retry` (`next_retry_at`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
