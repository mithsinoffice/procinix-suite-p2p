-- B1: sessions table for server-issued auth tokens
-- token_hash stores SHA-256(raw_token) so the raw token is never persisted.

CREATE TABLE IF NOT EXISTS `p2p_schema_mt`.`sessions` (
  `id`          VARCHAR(36)  NOT NULL,
  `user_id`     VARCHAR(64)  NOT NULL,
  `tenant_id`   VARCHAR(64)  NOT NULL,
  `token_hash`  CHAR(64)     NOT NULL,        -- SHA-256 hex of the raw 64-char token
  `user_email`  VARCHAR(255) NOT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`  DATETIME     NOT NULL,
  `revoked_at`  DATETIME     NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_token_hash` (`token_hash`),
  KEY `idx_sessions_user`    (`user_id`),
  KEY `idx_sessions_expires` (`expires_at`, `revoked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
