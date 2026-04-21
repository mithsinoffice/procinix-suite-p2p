-- =============================================================================
-- Multi-tenant + multi-entity (additive, backward compatible)
-- Target: Azure MySQL (idempotent ADD COLUMN via information_schema; no IF NOT EXISTS)
-- =============================================================================
-- Maps this codebase:
--   "users"     -> `user_master`.`user_master`
--   "items"     -> `item_master`.`item_master`
--   vendors/PO/invoices -> current database (e.g. p2p_schema_mt)
--   "grn"       -> not present in repo schema; skipped intentionally
-- =============================================================================
-- DO NOT DROP tables. Safe to re-run: idempotent inserts + IF NOT EXISTS DDL.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Core tenant tables (in connection default schema, e.g. p2p_schema_mt)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenants_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entities (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NULL,
  currency VARCHAR(10) NULL,
  country VARCHAR(100) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_entities_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  KEY idx_entities_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- STEP 5 / 9: Access + optional tenant registry (same schema as tenants)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_entity_access (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(191) NULL,
  tenant_id VARCHAR(36) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  role VARCHAR(100) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_uea_user (user_id),
  KEY idx_uea_tenant_entity (tenant_id, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_registry (
  tenant_id VARCHAR(36) NOT NULL PRIMARY KEY,
  db_host VARCHAR(255) NULL,
  db_name VARCHAR(255) NULL,
  db_user VARCHAR(255) NULL,
  db_password TEXT NULL COMMENT 'Do not store cleartext credentials in production; use a vault ref instead',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- STEP 2: Default tenant + entity (idempotent by primary key)
-- -----------------------------------------------------------------------------

INSERT INTO tenants (id, name, code, status)
SELECT 'tenant-default-001', 'Default Tenant', 'DEFAULT', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE id = 'tenant-default-001');

INSERT INTO entities (id, tenant_id, name, code, is_default)
SELECT 'entity-default-001', 'tenant-default-001', 'Default Entity', 'DEFAULT', TRUE
WHERE NOT EXISTS (SELECT 1 FROM entities WHERE id = 'entity-default-001');

-- -----------------------------------------------------------------------------
-- STEP 3: ALTER existing tables (additive columns only, MySQL 5.7+ compatible)
-- -----------------------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'user_master' AND TABLE_NAME = 'user_master' AND COLUMN_NAME = 'tenant_id');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `user_master`.`user_master` ADD COLUMN tenant_id VARCHAR(36) NULL', 'SELECT ''skip user_master.tenant_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'user_master' AND TABLE_NAME = 'user_master' AND COLUMN_NAME = 'default_entity_id');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `user_master`.`user_master` ADD COLUMN default_entity_id VARCHAR(36) NULL', 'SELECT ''skip user_master.default_entity_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'item_master' AND TABLE_NAME = 'item_master' AND COLUMN_NAME = 'tenant_id');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `item_master`.`item_master` ADD COLUMN tenant_id VARCHAR(36) NULL', 'SELECT ''skip item_master.tenant_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE CONVERT(TABLE_SCHEMA USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(DATABASE() USING utf8mb4) COLLATE utf8mb4_unicode_ci AND TABLE_NAME = 'vendors' AND COLUMN_NAME = 'tenant_id');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE vendors ADD COLUMN tenant_id VARCHAR(36) NULL', 'SELECT ''skip vendors.tenant_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE CONVERT(TABLE_SCHEMA USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(DATABASE() USING utf8mb4) COLLATE utf8mb4_unicode_ci AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'tenant_id');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE purchase_orders ADD COLUMN tenant_id VARCHAR(36) NULL', 'SELECT ''skip purchase_orders.tenant_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE CONVERT(TABLE_SCHEMA USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(DATABASE() USING utf8mb4) COLLATE utf8mb4_unicode_ci AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'entity_id');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE purchase_orders ADD COLUMN entity_id VARCHAR(36) NULL', 'SELECT ''skip purchase_orders.entity_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE CONVERT(TABLE_SCHEMA USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(DATABASE() USING utf8mb4) COLLATE utf8mb4_unicode_ci AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'tenant_id');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE invoices ADD COLUMN tenant_id VARCHAR(36) NULL', 'SELECT ''skip invoices.tenant_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE CONVERT(TABLE_SCHEMA USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(DATABASE() USING utf8mb4) COLLATE utf8mb4_unicode_ci AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'entity_id');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE invoices ADD COLUMN entity_id VARCHAR(36) NULL', 'SELECT ''skip invoices.entity_id'' AS migration_note');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- STEP 4: Backfill (NULL-safe; re-runnable)
-- -----------------------------------------------------------------------------

UPDATE `user_master`.`user_master`
SET tenant_id = 'tenant-default-001'
WHERE tenant_id IS NULL;

UPDATE `user_master`.`user_master`
SET default_entity_id = 'entity-default-001'
WHERE tenant_id = 'tenant-default-001' AND default_entity_id IS NULL;

UPDATE `item_master`.`item_master`
SET tenant_id = 'tenant-default-001'
WHERE tenant_id IS NULL;

UPDATE vendors
SET tenant_id = 'tenant-default-001'
WHERE tenant_id IS NULL;

UPDATE purchase_orders
SET tenant_id = 'tenant-default-001',
    entity_id = COALESCE(entity_id, 'entity-default-001')
WHERE tenant_id IS NULL;

UPDATE invoices
SET tenant_id = 'tenant-default-001',
    entity_id = COALESCE(entity_id, 'entity-default-001')
WHERE tenant_id IS NULL;

-- -----------------------------------------------------------------------------
-- STEP 6: User ↔ entity access (one default ADMIN row per user, idempotent)
-- -----------------------------------------------------------------------------

INSERT INTO user_entity_access (id, user_id, tenant_id, entity_id, role, is_default)
SELECT UUID(), um.id, 'tenant-default-001', 'entity-default-001', 'ADMIN', TRUE
FROM `user_master`.`user_master` um
WHERE NOT EXISTS (
  SELECT 1 FROM user_entity_access uea WHERE BINARY uea.user_id = BINARY um.id
);

-- -----------------------------------------------------------------------------
-- STEP 7: Indexes (skip if already present — safe for re-run)
-- -----------------------------------------------------------------------------

SET @exist := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = 'user_master' AND table_name = 'user_master' AND index_name = 'idx_user_master_tenant'
);
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_user_master_tenant ON `user_master`.`user_master` (tenant_id)',
  'SELECT ''skip idx_user_master_tenant'' AS migration_note'
);
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = 'item_master' AND table_name = 'item_master' AND index_name = 'idx_item_master_tenant'
);
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_item_master_tenant ON `item_master`.`item_master` (tenant_id)',
  'SELECT ''skip idx_item_master_tenant'' AS migration_note'
);
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE CONVERT(table_schema USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(DATABASE() USING utf8mb4) COLLATE utf8mb4_unicode_ci AND table_name = 'vendors' AND index_name = 'idx_vendors_tenant'
);
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_vendors_tenant ON vendors (tenant_id)',
  'SELECT ''skip idx_vendors_tenant'' AS migration_note'
);
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE CONVERT(table_schema USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(DATABASE() USING utf8mb4) COLLATE utf8mb4_unicode_ci AND table_name = 'purchase_orders' AND index_name = 'idx_po_tenant_entity'
);
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_po_tenant_entity ON purchase_orders (tenant_id, entity_id)',
  'SELECT ''skip idx_po_tenant_entity'' AS migration_note'
);
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE CONVERT(table_schema USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(DATABASE() USING utf8mb4) COLLATE utf8mb4_unicode_ci AND table_name = 'invoices' AND index_name = 'idx_invoice_tenant_entity'
);
SET @sqlstmt := IF(@exist = 0,
  'CREATE INDEX idx_invoice_tenant_entity ON invoices (tenant_id, entity_id)',
  'SELECT ''skip idx_invoice_tenant_entity'' AS migration_note'
);
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
