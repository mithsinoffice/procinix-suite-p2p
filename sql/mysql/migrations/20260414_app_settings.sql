-- Runtime configuration store. Read on server start and overlayed onto process.env
-- so existing process.env.X consumers pick up values without code changes.
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(128) NOT NULL PRIMARY KEY,
  setting_value TEXT NULL,
  is_secret TINYINT(1) NOT NULL DEFAULT 0,
  is_encrypted TINYINT(1) NOT NULL DEFAULT 0,
  description VARCHAR(500) NULL,
  updated_by VARCHAR(120) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
