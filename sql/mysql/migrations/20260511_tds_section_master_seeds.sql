-- ============================================================================
-- 20260511_tds_section_master_seeds.sql
-- Real Indian TDS sections — purges the 4 stale `test-tds-audit-*` seed rows
-- that landed in tds_section_master.tds_section_master and replaces them with
-- a curated 10-section roster covering Contractors / Professional / Commission /
-- Rent (Land+Plant split) / Interest / Insurance / Individual contractual /
-- Purchase of Goods / E-commerce.
--
-- Schema: canonical generic master shape — record_code / record_name / payload.
-- The live table does NOT carry a tenant_id column; tenant scoping lives in
-- the JSON payload. Idempotency: explicit DELETE of the 4 stale ids + a
-- DELETE-by-payload-tenant pass so re-runs converge.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS tds_section_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tds_section_master.tds_section_master (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  record_code VARCHAR(255) NULL,
  record_name VARCHAR(255) NULL,
  status VARCHAR(64) NULL,
  approval_status VARCHAR(64) NULL,
  payload JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_approval (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tds_section_master.tds_section_master_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  record_id VARCHAR(64) NOT NULL,
  action VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_payload JSON,
  after_payload JSON,
  INDEX idx_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── 1. Purge the 4 stale test rows by exact id ─────────────────────────────
DELETE FROM tds_section_master.tds_section_master
WHERE id IN ('test-tds-audit-1','test-tds-audit-2','test-tds-audit-3','test-tds-audit-4');

-- ── 2. Purge any other rows for this tenant so re-runs converge ────────────
DELETE FROM tds_section_master.tds_section_master
WHERE JSON_UNQUOTE(JSON_EXTRACT(payload, '$.tenant_id')) = 'tenant-default-001';

-- ── 3. Seed 10 real Indian TDS sections (194C + 9 from spec) ───────────────
-- payload carries sectionCode / sectionName / rateIndividual / rateCompany /
-- rateNoTan / thresholdAmount / applicableTo / isActive + tenant_id. Forms
-- read these via getActiveTDSSections() / getTDSSectionByCode() on
-- MasterDataContext.
INSERT INTO tds_section_master.tds_section_master
  (id, record_code, record_name, status, approval_status, payload) VALUES
  ('tds-194C','194C','Payment to Contractors','Active','Approved',
    JSON_OBJECT(
      'id','tds-194C',
      'sectionCode','194C',
      'sectionName','Payment to Contractors',
      'description','TDS on payments to contractors and sub-contractors (works contracts, transport, AMC, manpower)',
      'rateIndividual',1,
      'rateCompany',2,
      'rateNoTan',20,
      'thresholdAmount',30000,
      'applicableTo','Contractors',
      'isActive',true,
      'status','Active',
      'recordCode','194C',
      'recordName','Payment to Contractors',
      'tenant_id','tenant-default-001')),
  ('tds-194J','194J','Professional / Technical Fees','Active','Approved',
    JSON_OBJECT(
      'id','tds-194J',
      'sectionCode','194J',
      'sectionName','Professional / Technical Fees',
      'description','TDS on professional, technical, royalty, or non-compete fees',
      'rateIndividual',10,
      'rateCompany',10,
      'rateNoTan',20,
      'thresholdAmount',30000,
      'applicableTo','Professionals',
      'isActive',true,
      'status','Active',
      'recordCode','194J',
      'recordName','Professional / Technical Fees',
      'tenant_id','tenant-default-001')),
  ('tds-194H','194H','Commission / Brokerage','Active','Approved',
    JSON_OBJECT(
      'id','tds-194H',
      'sectionCode','194H',
      'sectionName','Commission or Brokerage',
      'description','TDS on commission or brokerage payments (excluding insurance commission)',
      'rateIndividual',5,
      'rateCompany',5,
      'rateNoTan',20,
      'thresholdAmount',15000,
      'applicableTo','Agents / Brokers',
      'isActive',true,
      'status','Active',
      'recordCode','194H',
      'recordName','Commission / Brokerage',
      'tenant_id','tenant-default-001')),
  ('tds-194I-LAND','194I-LAND','Rent - Land & Building','Active','Approved',
    JSON_OBJECT(
      'id','tds-194I-LAND',
      'sectionCode','194I-LAND',
      'sectionName','Rent - Land & Building',
      'description','TDS on rent of land, building, furniture and fittings under Section 194-I(b)',
      'rateIndividual',10,
      'rateCompany',10,
      'rateNoTan',20,
      'thresholdAmount',240000,
      'applicableTo','Landlords (Land / Building)',
      'isActive',true,
      'status','Active',
      'recordCode','194I-LAND',
      'recordName','Rent - Land & Building',
      'tenant_id','tenant-default-001')),
  ('tds-194I-PLANT','194I-PLANT','Rent - Plant & Machinery','Active','Approved',
    JSON_OBJECT(
      'id','tds-194I-PLANT',
      'sectionCode','194I-PLANT',
      'sectionName','Rent - Plant & Machinery',
      'description','TDS on rent of plant, machinery or equipment under Section 194-I(a)',
      'rateIndividual',2,
      'rateCompany',2,
      'rateNoTan',20,
      'thresholdAmount',240000,
      'applicableTo','Lessors (Plant / Machinery)',
      'isActive',true,
      'status','Active',
      'recordCode','194I-PLANT',
      'recordName','Rent - Plant & Machinery',
      'tenant_id','tenant-default-001')),
  ('tds-194A','194A','Interest (Other than Securities)','Active','Approved',
    JSON_OBJECT(
      'id','tds-194A',
      'sectionCode','194A',
      'sectionName','Interest other than Interest on Securities',
      'description','TDS on interest paid by payers other than banks/NBFCs/post-office on deposits and loans',
      'rateIndividual',10,
      'rateCompany',10,
      'rateNoTan',20,
      'thresholdAmount',40000,
      'applicableTo','Lenders / Depositors',
      'isActive',true,
      'status','Active',
      'recordCode','194A',
      'recordName','Interest (Other than Securities)',
      'tenant_id','tenant-default-001')),
  ('tds-194D','194D','Insurance Commission','Active','Approved',
    JSON_OBJECT(
      'id','tds-194D',
      'sectionCode','194D',
      'sectionName','Insurance Commission',
      'description','TDS on commission paid to insurance agents and corporate agents',
      'rateIndividual',5,
      'rateCompany',5,
      'rateNoTan',20,
      'thresholdAmount',15000,
      'applicableTo','Insurance Agents',
      'isActive',true,
      'status','Active',
      'recordCode','194D',
      'recordName','Insurance Commission',
      'tenant_id','tenant-default-001')),
  ('tds-194M','194M','Contractual Payments by Individuals / HUF','Active','Approved',
    JSON_OBJECT(
      'id','tds-194M',
      'sectionCode','194M',
      'sectionName','Contractual Payments by Individuals / HUF',
      'description','TDS by individuals/HUF (not liable to audit) on contractual, professional, or commission payments',
      'rateIndividual',5,
      'rateCompany',5,
      'rateNoTan',20,
      'thresholdAmount',5000000,
      'applicableTo','Individuals / HUF Payers',
      'isActive',true,
      'status','Active',
      'recordCode','194M',
      'recordName','Contractual Payments by Individuals / HUF',
      'tenant_id','tenant-default-001')),
  ('tds-194Q','194Q','Purchase of Goods','Active','Approved',
    JSON_OBJECT(
      'id','tds-194Q',
      'sectionCode','194Q',
      'sectionName','Purchase of Goods',
      'description','TDS on purchase of goods by buyers with turnover > Rs.10 Cr (deducted above Rs.50L per seller per FY)',
      'rateIndividual',0.1,
      'rateCompany',0.1,
      'rateNoTan',5,
      'thresholdAmount',5000000,
      'applicableTo','Buyers > Rs.10Cr Turnover',
      'isActive',true,
      'status','Active',
      'recordCode','194Q',
      'recordName','Purchase of Goods',
      'tenant_id','tenant-default-001')),
  ('tds-194O','194O','E-commerce Operator Payments','Active','Approved',
    JSON_OBJECT(
      'id','tds-194O',
      'sectionCode','194O',
      'sectionName','E-commerce Operator Payments',
      'description','TDS by e-commerce operator on payments to e-commerce participants for sale of goods or services',
      'rateIndividual',1,
      'rateCompany',1,
      'rateNoTan',5,
      'thresholdAmount',500000,
      'applicableTo','E-commerce Participants',
      'isActive',true,
      'status','Active',
      'recordCode','194O',
      'recordName','E-commerce Operator Payments',
      'tenant_id','tenant-default-001'));
