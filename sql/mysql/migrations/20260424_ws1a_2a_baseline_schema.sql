-- =============================================================================
-- WS-1a  CHUNK 2a  —  Baseline CREATE TABLE IF NOT EXISTS
-- =============================================================================
-- Source of truth: `mysqldump --no-data` against Azure dev DB
--   p2p-procinix-mysql-dev-db.mysql.database.azure.com / p2p_schema_mt
--   Dumped: 2026-04-24
--
-- Purpose: drift-fill. Reproduce the current Azure schema for the 12 tables
-- that WS-1a touches, so a fresh DB can be provisioned from migrations alone.
-- This file does NOT add new columns or change existing ones — it only records
-- what already exists. ALTERs + new tables land in chunks 2b and 2c.
--
-- Transformations vs the raw dump:
--   1. CREATE TABLE           → CREATE TABLE IF NOT EXISTS
--      (idempotent on Azure where all tables already exist; creates them on
--       a fresh DB.)
--   2. Stripped `/*!40101 SET character_set_client = ... */;` preambles
--      (MySQL 8 no-ops for the target version; noise for human review.)
--
-- Every column / index / default / engine / charset / collation is preserved
-- verbatim. The dump IS the spec.
--
-- Validation plan: after review-approval of this chunk, run it against a
-- fresh MySQL server, then `mysqldump --no-data` both the fresh DB and Azure
-- with matching flags; the diff must be empty.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Vendor cluster (6 tables — zero prior DDL in repo)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `vendors` (
  `id` varchar(36) NOT NULL,
  `vendor_code` varchar(50) NOT NULL,
  `vendor_legal_name` varchar(300) NOT NULL,
  `vendor_trade_name` varchar(300) DEFAULT NULL,
  `vendor_group_name` varchar(200) DEFAULT NULL,
  `vendor_group_code` varchar(50) DEFAULT NULL,
  `vendor_type` varchar(50) NOT NULL DEFAULT 'goods_supplier',
  `address_line` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pin_code` varchar(10) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'India',
  `status` varchar(50) DEFAULT 'draft',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` varchar(36) DEFAULT NULL,
  `updated_by` varchar(36) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vendor_code` (`vendor_code`),
  KEY `idx_status` (`status`),
  KEY `idx_vendors_legal_name_updated` (`vendor_legal_name`,`updated_at`,`id`),
  KEY `idx_vendors_trade_name_updated` (`vendor_trade_name`,`updated_at`,`id`),
  KEY `idx_vendors_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `vendor_spocs` (
  `id` varchar(36) NOT NULL,
  `vendor_id` varchar(36) NOT NULL,
  `spoc_name` varchar(200) NOT NULL,
  `designation` varchar(200) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `location_label` varchar(200) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pin_code` varchar(10) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vendor_id` (`vendor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `vendor_pan_compliance` (
  `id` varchar(36) NOT NULL,
  `vendor_id` varchar(36) NOT NULL,
  `pan` varchar(10) DEFAULT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `pan_status` varchar(30) DEFAULT 'not_verified',
  `cin_number` varchar(50) DEFAULT NULL,
  `msme_number` varchar(50) DEFAULT NULL,
  `msme_category` varchar(20) DEFAULT NULL,
  `section_206ab` varchar(50) DEFAULT 'not_applicable',
  `gst_return_filed` varchar(30) DEFAULT 'regular_filer',
  `tds_sections` json DEFAULT NULL,
  `rcm_applicable` varchar(30) DEFAULT 'no_forward_charge',
  `lower_tds_section` varchar(30) DEFAULT 'not_applicable',
  `lower_tds_cert_number` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `kyc_verified` tinyint(1) DEFAULT '0',
  `kyc_verified_at` datetime DEFAULT NULL,
  `kyc_provider` varchar(50) DEFAULT NULL,
  `kyc_raw_response` json DEFAULT NULL,
  `directors_json` json DEFAULT NULL,
  `date_of_incorporation` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vendor_pan` (`vendor_id`),
  KEY `idx_vendor_pan_compliance_vendor_msme` (`vendor_id`,`msme_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `vendor_gst_registrations` (
  `id` varchar(36) NOT NULL,
  `vendor_id` varchar(36) NOT NULL,
  `gstin` varchar(15) DEFAULT NULL,
  `gst_type` varchar(30) NOT NULL,
  `state` varchar(100) DEFAULT NULL,
  `gst_state_code` varchar(5) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `pin_code` varchar(10) DEFAULT NULL,
  `address` text,
  `spoc_id` varchar(36) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vendor_id` (`vendor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `vendor_bank_accounts` (
  `id` varchar(36) NOT NULL,
  `vendor_id` varchar(36) NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `ifsc_code` varchar(15) NOT NULL,
  `branch_name` varchar(200) DEFAULT NULL,
  `bank_name` varchar(200) DEFAULT NULL,
  `account_type` varchar(20) DEFAULT 'current',
  `currency` varchar(10) DEFAULT 'INR',
  `is_primary` tinyint(1) DEFAULT '0',
  `status` varchar(20) DEFAULT 'active',
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vendor_id` (`vendor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `vendor_entity_mappings` (
  `id` varchar(36) NOT NULL,
  `vendor_id` varchar(36) NOT NULL,
  `entity_id` varchar(36) NOT NULL,
  `gl_code_expense` varchar(50) DEFAULT NULL,
  `gl_code_expense_desc` varchar(200) DEFAULT NULL,
  `gl_code_cogs` varchar(50) DEFAULT NULL,
  `gl_code_cogs_desc` varchar(200) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `cost_centre_id` varchar(36) DEFAULT NULL,
  `profit_centre_id` varchar(36) DEFAULT NULL,
  `block_for_po` tinyint(1) DEFAULT '0',
  `block_for_po_reason` text,
  `block_for_payment` tinyint(1) DEFAULT '0',
  `block_for_payment_reason` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vendor_entity` (`vendor_id`,`entity_id`),
  KEY `idx_vendor_id` (`vendor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Invoice cluster (4 tables — outdated DDL existed in server/migrations/invoice_ingestion.sql)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` varchar(36) NOT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `vendor_name` varchar(255) DEFAULT NULL,
  `vendor_gstin` varchar(20) DEFAULT NULL,
  `vendor_pan` varchar(15) DEFAULT NULL,
  `vendor_email` varchar(255) DEFAULT NULL,
  `bill_to_entity` varchar(255) DEFAULT NULL,
  `bill_to_gstin` varchar(20) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `tax_rate` decimal(5,2) DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `po_number` varchar(100) DEFAULT NULL,
  `po_id` varchar(36) DEFAULT NULL,
  `irn` varchar(255) DEFAULT NULL,
  `hsn_sac_summary` text,
  `payment_terms` text,
  `bank_details` json DEFAULT NULL,
  `notes` text,
  `status` varchar(50) DEFAULT 'draft',
  `source` varchar(50) DEFAULT 'manual',
  `ingestion_log_id` varchar(36) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `attachment_path` text,
  `entity_id` varchar(36) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lane` varchar(10) DEFAULT NULL,
  `posting_readiness_score` decimal(5,2) DEFAULT NULL,
  `auto_post_flag` tinyint(1) DEFAULT '0',
  `human_touched_flag` tinyint(1) DEFAULT '0',
  `extraction_model_version` varchar(100) DEFAULT NULL,
  `document_id` varchar(36) DEFAULT NULL,
  `batch_id` varchar(36) DEFAULT NULL,
  `processing_status` varchar(50) DEFAULT NULL,
  `msme_45day_deadline` date DEFAULT NULL,
  `msme_days_remaining` int DEFAULT NULL,
  `is_msme_vendor` tinyint(1) DEFAULT '0',
  `msme_category` enum('micro','small','medium') DEFAULT NULL,
  `sla_deadline` datetime DEFAULT NULL,
  `sla_breached` tinyint(1) DEFAULT '0',
  `sla_breached_at` datetime DEFAULT NULL,
  `escalated` tinyint(1) DEFAULT '0',
  `escalated_at` datetime DEFAULT NULL,
  `escalated_to` varchar(36) DEFAULT NULL,
  `approval_priority` enum('critical','high','normal','low') DEFAULT 'normal',
  `priority_reason` varchar(500) DEFAULT NULL,
  `tenant_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_vendor` (`vendor_name`),
  KEY `idx_source` (`source`),
  KEY `idx_invoices_status_entity_created` (`status`,`entity_id`,`created_at`,`id`),
  KEY `idx_invoice_tenant_entity` (`tenant_id`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `invoice_line_items` (
  `id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) DEFAULT NULL,
  `line_number` int DEFAULT NULL,
  `description` text,
  `quantity` decimal(15,3) DEFAULT '0.000',
  `unit_price` decimal(15,2) DEFAULT '0.00',
  `amount` decimal(15,2) DEFAULT '0.00',
  `hsn_sac` varchar(20) DEFAULT NULL,
  `gst_rate` decimal(5,2) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_id` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `invoice_exceptions` (
  `id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) DEFAULT NULL,
  `exception_type` varchar(50) DEFAULT NULL,
  `exception_detail` text,
  `severity` enum('low','medium','high') DEFAULT 'medium',
  `resolved` tinyint(1) DEFAULT '0',
  `resolved_by` varchar(36) DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_id` (`invoice_id`),
  KEY `idx_resolved` (`resolved`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` varchar(36) NOT NULL,
  `po_number` varchar(100) DEFAULT NULL,
  `vendor_name` varchar(255) DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `po_date` date DEFAULT NULL,
  `entity_id` varchar(36) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_po_number` (`po_number`),
  KEY `idx_vendor` (`vendor_name`),
  KEY `idx_purchase_orders_status_entity_created` (`status`,`entity_id`,`created_at`,`id`),
  KEY `idx_po_tenant_entity` (`tenant_id`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Approvals (no prior DDL in repo) + domain_documents (present in init.sql, kept for completeness)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `approvals` (
  `id` varchar(36) NOT NULL,
  `module` enum('ap_invoice','non_po_invoice','purchase_order','payment','vendor_onboarding','master_update','vendor_advance','debit_note') NOT NULL,
  `reference_id` varchar(128) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `assigned_to` varchar(36) NOT NULL,
  `submitted_by` varchar(36) DEFAULT NULL,
  `comments` text,
  `reason` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `approved_by` varchar(36) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_by` varchar(36) DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `sla_breached` tinyint(1) DEFAULT '0',
  `sla_breached_at` datetime DEFAULT NULL,
  `escalated` tinyint(1) DEFAULT '0',
  `escalated_at` datetime DEFAULT NULL,
  `escalated_to` varchar(36) DEFAULT NULL,
  `approval_priority` enum('critical','high','normal','low') DEFAULT 'normal',
  `priority_reason` varchar(500) DEFAULT NULL,
  `pending_dedupe_key` varchar(255) GENERATED ALWAYS AS ((case when (`status` = _utf8mb4'pending') then concat(`module`,char(58),char(58),`reference_id`) else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_approvals_pending_dedupe` (`pending_dedupe_key`),
  KEY `idx_assigned_status` (`assigned_to`,`status`),
  KEY `idx_module` (`module`),
  KEY `idx_reference` (`reference_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_approvals_queue` (`status`,`assigned_to`,`module`,`approval_priority`,`created_at`,`id`),
  KEY `idx_approvals_module_ref_status` (`module`,`reference_id`,`status`),
  KEY `idx_approvals_status_created` (`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `domain_documents` (
  `domain_name` varchar(100) NOT NULL,
  `payload` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`domain_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
