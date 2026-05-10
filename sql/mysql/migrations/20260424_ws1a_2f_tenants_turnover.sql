-- WS-1a chunk 2f: prior_fy_turnover on tenants (for 194Q buyer turnover gate)
-- Per implementation plan §2.8 and engine-work backlog item 10.
-- Section 194Q only applies when buyer's prior-FY turnover > ₹10 cr.

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'tenants'
                    AND COLUMN_NAME = 'prior_fy_turnover');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE tenants ADD COLUMN prior_fy_turnover DECIMAL(18,2) NULL COMMENT "For 194Q buyer turnover gate — unset means 194Q does not apply"',
  'SELECT "prior_fy_turnover already exists" AS skip');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
