-- ============================================================================
-- 20260510_org_master_seeds.sql
-- Realistic Indian mid-market organisational seeds for tenant-default-001 /
-- PTPL + MTPL. No industry-specific assumptions.
--
-- Notes on idempotency:
--   • department_master, location_master, gl_code_master predate the tenancy
--     refactor and have no `tenant_id` column. Tenant scope therefore lives
--     in the JSON `payload` field, not as a column. UNIQUE INDEX on
--     `record_code` is added (guarded) so INSERT IGNORE skips re-runs.
--   • designation_master is brand new — created with proper tenant_id column +
--     UNIQUE KEY on (record_code, tenant_id) so INSERT IGNORE works directly.
--   • user_master has no UNIQUE constraint on the email-in-payload field so
--     each user insert uses WHERE NOT EXISTS to avoid duplicates on re-run.
-- ============================================================================

-- ── ensure idempotency guards on the existing master tables ────────────────

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'department_master' AND TABLE_NAME = 'department_master'
    AND INDEX_NAME = 'uq_department_record_code');
SET @sqlstmt := IF(@exist = 0,
  'CREATE UNIQUE INDEX uq_department_record_code ON department_master.department_master (record_code)',
  'SELECT ''skip uq_department_record_code'' AS migration_note');
PREPARE s FROM @sqlstmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'location_master' AND TABLE_NAME = 'location_master'
    AND INDEX_NAME = 'uq_location_record_code');
SET @sqlstmt := IF(@exist = 0,
  'CREATE UNIQUE INDEX uq_location_record_code ON location_master.location_master (record_code)',
  'SELECT ''skip uq_location_record_code'' AS migration_note');
PREPARE s FROM @sqlstmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'gl_code_master' AND TABLE_NAME = 'gl_code_master'
    AND INDEX_NAME = 'uq_gl_record_code');
SET @sqlstmt := IF(@exist = 0,
  'CREATE UNIQUE INDEX uq_gl_record_code ON gl_code_master.gl_code_master (record_code)',
  'SELECT ''skip uq_gl_record_code'' AS migration_note');
PREPARE s FROM @sqlstmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 1. Expand department_master ────────────────────────────────────────────
INSERT IGNORE INTO department_master.department_master
  (id, record_code, record_name, status, approval_status, payload) VALUES
  (UUID(), 'DEPT-001', 'Finance & Accounts', 'Active', 'Approved',
    JSON_OBJECT('tenant_id','tenant-default-001','head','CFO','costCentreCode','CC-FIN-001')),
  (UUID(), 'DEPT-002', 'Human Resources', 'Active', 'Approved',
    JSON_OBJECT('tenant_id','tenant-default-001','head','CHRO','costCentreCode','CC-HR-001')),
  (UUID(), 'DEPT-003', 'Information Technology', 'Active', 'Approved',
    JSON_OBJECT('tenant_id','tenant-default-001','head','CTO','costCentreCode','CC-IT-001')),
  (UUID(), 'DEPT-004', 'Operations', 'Active', 'Approved',
    JSON_OBJECT('tenant_id','tenant-default-001','head','COO','costCentreCode','CC-OPS-001')),
  (UUID(), 'DEPT-005', 'Sales & Marketing', 'Active', 'Approved',
    JSON_OBJECT('tenant_id','tenant-default-001','head','VP Sales','costCentreCode','CC-SAL-001')),
  (UUID(), 'DEPT-006', 'Procurement', 'Active', 'Approved',
    JSON_OBJECT('tenant_id','tenant-default-001','head','Procurement Head','costCentreCode','CC-PRO-001')),
  (UUID(), 'DEPT-007', 'Legal & Compliance', 'Active', 'Approved',
    JSON_OBJECT('tenant_id','tenant-default-001','head','General Counsel','costCentreCode','CC-LEG-001')),
  (UUID(), 'DEPT-008', 'Administration', 'Active', 'Approved',
    JSON_OBJECT('tenant_id','tenant-default-001','head','Admin Manager','costCentreCode','CC-ADM-001')),
  (UUID(), 'DEPT-009', 'Engineering', 'Active', 'Approved',
    JSON_OBJECT('tenant_id','tenant-default-001','head','VP Engineering','costCentreCode','CC-ENG-001')),
  (UUID(), 'DEPT-010', 'Customer Success', 'Active', 'Approved',
    JSON_OBJECT('tenant_id','tenant-default-001','head','VP Customer Success','costCentreCode','CC-CS-001'));

-- ── 2. Create + seed designation_master ────────────────────────────────────
CREATE DATABASE IF NOT EXISTS designation_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS designation_master.designation_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  record_code VARCHAR(50) NOT NULL,
  record_name VARCHAR(200) NOT NULL,
  level INT DEFAULT 5,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  approval_status ENUM('Approved','Pending Approval','Rejected') NOT NULL DEFAULT 'Approved',
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code_tenant (record_code, tenant_id),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS designation_master.designation_master_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  action VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_payload JSON,
  after_payload JSON,
  INDEX idx_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO designation_master.designation_master
  (id, tenant_id, record_code, record_name, level, status, approval_status, payload) VALUES
  (UUID(),'tenant-default-001','DESIG-001','Managing Director',1,'Active','Approved',JSON_OBJECT('grade','L1','approvalLimit',10000000)),
  (UUID(),'tenant-default-001','DESIG-002','Chief Executive Officer',1,'Active','Approved',JSON_OBJECT('grade','L1','approvalLimit',10000000)),
  (UUID(),'tenant-default-001','DESIG-003','Chief Financial Officer',1,'Active','Approved',JSON_OBJECT('grade','L1','approvalLimit',5000000)),
  (UUID(),'tenant-default-001','DESIG-004','Chief Technology Officer',1,'Active','Approved',JSON_OBJECT('grade','L1','approvalLimit',2000000)),
  (UUID(),'tenant-default-001','DESIG-005','Chief Operating Officer',1,'Active','Approved',JSON_OBJECT('grade','L1','approvalLimit',2000000)),
  (UUID(),'tenant-default-001','DESIG-006','Vice President',2,'Active','Approved',JSON_OBJECT('grade','L2','approvalLimit',1000000)),
  (UUID(),'tenant-default-001','DESIG-007','General Manager',2,'Active','Approved',JSON_OBJECT('grade','L2','approvalLimit',500000)),
  (UUID(),'tenant-default-001','DESIG-008','Deputy General Manager',2,'Active','Approved',JSON_OBJECT('grade','L2','approvalLimit',300000)),
  (UUID(),'tenant-default-001','DESIG-009','Senior Manager',3,'Active','Approved',JSON_OBJECT('grade','L3','approvalLimit',200000)),
  (UUID(),'tenant-default-001','DESIG-010','Manager',3,'Active','Approved',JSON_OBJECT('grade','L3','approvalLimit',100000)),
  (UUID(),'tenant-default-001','DESIG-011','Deputy Manager',3,'Active','Approved',JSON_OBJECT('grade','L3','approvalLimit',50000)),
  (UUID(),'tenant-default-001','DESIG-012','Senior Executive',4,'Active','Approved',JSON_OBJECT('grade','L4','approvalLimit',25000)),
  (UUID(),'tenant-default-001','DESIG-013','Executive',4,'Active','Approved',JSON_OBJECT('grade','L4','approvalLimit',10000)),
  (UUID(),'tenant-default-001','DESIG-014','Junior Executive',5,'Active','Approved',JSON_OBJECT('grade','L5','approvalLimit',5000)),
  (UUID(),'tenant-default-001','DESIG-015','Analyst',5,'Active','Approved',JSON_OBJECT('grade','L5','approvalLimit',0)),
  (UUID(),'tenant-default-001','DESIG-016','Senior Analyst',4,'Active','Approved',JSON_OBJECT('grade','L4','approvalLimit',0)),
  (UUID(),'tenant-default-001','DESIG-017','Team Lead',3,'Active','Approved',JSON_OBJECT('grade','L3','approvalLimit',50000)),
  (UUID(),'tenant-default-001','DESIG-018','Project Manager',3,'Active','Approved',JSON_OBJECT('grade','L3','approvalLimit',100000)),
  (UUID(),'tenant-default-001','DESIG-019','Procurement Head',2,'Active','Approved',JSON_OBJECT('grade','L2','approvalLimit',500000)),
  (UUID(),'tenant-default-001','DESIG-020','Finance Controller',2,'Active','Approved',JSON_OBJECT('grade','L2','approvalLimit',300000));

-- ── 4. Expand gl_code_master with full Indian COA (45 entries total) ───────
INSERT IGNORE INTO gl_code_master.gl_code_master
  (id, record_code, record_name, status, approval_status, payload) VALUES
  -- Assets
  (UUID(),'1001','Cash in Hand',                      'Active','Approved',JSON_OBJECT('type','Asset','group','Current Assets','tenant_id','tenant-default-001')),
  (UUID(),'1002','Bank - HDFC Current Account',       'Active','Approved',JSON_OBJECT('type','Asset','group','Current Assets','tenant_id','tenant-default-001')),
  (UUID(),'1003','Bank - ICICI Current Account',      'Active','Approved',JSON_OBJECT('type','Asset','group','Current Assets','tenant_id','tenant-default-001')),
  (UUID(),'1100','Accounts Receivable (Trade)',       'Active','Approved',JSON_OBJECT('type','Asset','group','Current Assets','tenant_id','tenant-default-001')),
  (UUID(),'1200','Advance to Vendors',                'Active','Approved',JSON_OBJECT('type','Asset','group','Current Assets','tenant_id','tenant-default-001')),
  (UUID(),'1300','Input GST Credit (IGST)',           'Active','Approved',JSON_OBJECT('type','Asset','group','Current Assets','tenant_id','tenant-default-001')),
  (UUID(),'1301','Input GST Credit (CGST)',           'Active','Approved',JSON_OBJECT('type','Asset','group','Current Assets','tenant_id','tenant-default-001')),
  (UUID(),'1302','Input GST Credit (SGST)',           'Active','Approved',JSON_OBJECT('type','Asset','group','Current Assets','tenant_id','tenant-default-001')),
  (UUID(),'1400','TDS Receivable',                    'Active','Approved',JSON_OBJECT('type','Asset','group','Current Assets','tenant_id','tenant-default-001')),
  (UUID(),'1500','Prepaid Expenses',                  'Active','Approved',JSON_OBJECT('type','Asset','group','Current Assets','tenant_id','tenant-default-001')),
  (UUID(),'1600','Fixed Assets - Tangible',           'Active','Approved',JSON_OBJECT('type','Asset','group','Fixed Assets','tenant_id','tenant-default-001')),
  (UUID(),'1601','Fixed Assets - Intangible',         'Active','Approved',JSON_OBJECT('type','Asset','group','Fixed Assets','tenant_id','tenant-default-001')),
  (UUID(),'1700','Accumulated Depreciation',          'Active','Approved',JSON_OBJECT('type','Asset','group','Fixed Assets','tenant_id','tenant-default-001')),
  -- Liabilities
  (UUID(),'2001','Accounts Payable (Trade)',          'Active','Approved',JSON_OBJECT('type','Liability','group','Current Liabilities','tenant_id','tenant-default-001')),
  (UUID(),'2002','Advance from Customers',            'Active','Approved',JSON_OBJECT('type','Liability','group','Current Liabilities','tenant_id','tenant-default-001')),
  (UUID(),'2100','TDS Payable - 194C (Contractors)',  'Active','Approved',JSON_OBJECT('type','Liability','group','Current Liabilities','tenant_id','tenant-default-001')),
  (UUID(),'2101','TDS Payable - 194J (Professional)', 'Active','Approved',JSON_OBJECT('type','Liability','group','Current Liabilities','tenant_id','tenant-default-001')),
  (UUID(),'2102','TDS Payable - 194I (Rent)',         'Active','Approved',JSON_OBJECT('type','Liability','group','Current Liabilities','tenant_id','tenant-default-001')),
  (UUID(),'2200','GST Payable (IGST)',                'Active','Approved',JSON_OBJECT('type','Liability','group','Current Liabilities','tenant_id','tenant-default-001')),
  (UUID(),'2201','GST Payable (CGST)',                'Active','Approved',JSON_OBJECT('type','Liability','group','Current Liabilities','tenant_id','tenant-default-001')),
  (UUID(),'2202','GST Payable (SGST)',                'Active','Approved',JSON_OBJECT('type','Liability','group','Current Liabilities','tenant_id','tenant-default-001')),
  (UUID(),'2300','PF Payable',                        'Active','Approved',JSON_OBJECT('type','Liability','group','Current Liabilities','tenant_id','tenant-default-001')),
  (UUID(),'2301','ESIC Payable',                      'Active','Approved',JSON_OBJECT('type','Liability','group','Current Liabilities','tenant_id','tenant-default-001')),
  (UUID(),'2400','Salary Payable',                    'Active','Approved',JSON_OBJECT('type','Liability','group','Current Liabilities','tenant_id','tenant-default-001')),
  -- Revenue
  (UUID(),'4001','Revenue - Product Sales',           'Active','Approved',JSON_OBJECT('type','Revenue','group','Operating Revenue','tenant_id','tenant-default-001')),
  (UUID(),'4002','Revenue - Services',                'Active','Approved',JSON_OBJECT('type','Revenue','group','Operating Revenue','tenant_id','tenant-default-001')),
  (UUID(),'4003','Revenue - AMC & Maintenance',       'Active','Approved',JSON_OBJECT('type','Revenue','group','Operating Revenue','tenant_id','tenant-default-001')),
  (UUID(),'4100','Other Income',                      'Active','Approved',JSON_OBJECT('type','Revenue','group','Other Income','tenant_id','tenant-default-001')),
  -- Expenses
  (UUID(),'5001','Cost of Goods Sold',                'Active','Approved',JSON_OBJECT('type','Expense','group','Direct Costs','tenant_id','tenant-default-001')),
  (UUID(),'5002','Direct Labour Cost',                'Active','Approved',JSON_OBJECT('type','Expense','group','Direct Costs','tenant_id','tenant-default-001')),
  (UUID(),'5101','Salaries & Wages',                  'Active','Approved',JSON_OBJECT('type','Expense','group','Employee Costs','tenant_id','tenant-default-001')),
  (UUID(),'5102','Staff Welfare',                     'Active','Approved',JSON_OBJECT('type','Expense','group','Employee Costs','tenant_id','tenant-default-001')),
  (UUID(),'5201','Rent & Lease',                      'Active','Approved',JSON_OBJECT('type','Expense','group','Overhead','tenant_id','tenant-default-001')),
  (UUID(),'5202','Electricity & Utilities',           'Active','Approved',JSON_OBJECT('type','Expense','group','Overhead','tenant_id','tenant-default-001')),
  (UUID(),'5203','Internet & Telecom',                'Active','Approved',JSON_OBJECT('type','Expense','group','Overhead','tenant_id','tenant-default-001')),
  (UUID(),'5301','Professional & Legal Fees',         'Active','Approved',JSON_OBJECT('type','Expense','group','Admin','tenant_id','tenant-default-001')),
  (UUID(),'5302','Audit & Accounting Fees',           'Active','Approved',JSON_OBJECT('type','Expense','group','Admin','tenant_id','tenant-default-001')),
  (UUID(),'5401','Travel & Conveyance',               'Active','Approved',JSON_OBJECT('type','Expense','group','Admin','tenant_id','tenant-default-001')),
  (UUID(),'5402','Hotel & Accommodation',             'Active','Approved',JSON_OBJECT('type','Expense','group','Admin','tenant_id','tenant-default-001')),
  (UUID(),'5501','Marketing & Advertising',           'Active','Approved',JSON_OBJECT('type','Expense','group','Sales & Marketing','tenant_id','tenant-default-001')),
  (UUID(),'5601','IT Software & Subscriptions',       'Active','Approved',JSON_OBJECT('type','Expense','group','IT','tenant_id','tenant-default-001')),
  (UUID(),'5602','IT Hardware & Equipment',           'Active','Approved',JSON_OBJECT('type','Expense','group','IT','tenant_id','tenant-default-001')),
  (UUID(),'5701','Repairs & Maintenance',             'Active','Approved',JSON_OBJECT('type','Expense','group','Overhead','tenant_id','tenant-default-001')),
  (UUID(),'5801','Depreciation',                      'Active','Approved',JSON_OBJECT('type','Expense','group','Non-cash','tenant_id','tenant-default-001')),
  (UUID(),'5901','Miscellaneous Expenses',            'Active','Approved',JSON_OBJECT('type','Expense','group','Admin','tenant_id','tenant-default-001'));

-- ── 5. Expand location_master ──────────────────────────────────────────────
INSERT IGNORE INTO location_master.location_master
  (id, record_code, record_name, status, approval_status, payload) VALUES
  (UUID(),'LOC-DEL-01','Delhi Regional Office', 'Active','Approved',
    JSON_OBJECT('type','Office','city','New Delhi','state','Delhi','stateCode','07','tenant_id','tenant-default-001')),
  (UUID(),'LOC-BLR-01','Bangalore Tech Centre', 'Active','Approved',
    JSON_OBJECT('type','Office','city','Bangalore','state','Karnataka','stateCode','29','tenant_id','tenant-default-001')),
  (UUID(),'LOC-CHN-01','Chennai Operations',    'Active','Approved',
    JSON_OBJECT('type','Office','city','Chennai','state','Tamil Nadu','stateCode','33','tenant_id','tenant-default-001')),
  (UUID(),'LOC-HYD-01','Hyderabad Hub',         'Active','Approved',
    JSON_OBJECT('type','Office','city','Hyderabad','state','Telangana','stateCode','36','tenant_id','tenant-default-001')),
  (UUID(),'LOC-PUN-01','Pune Office',           'Active','Approved',
    JSON_OBJECT('type','Office','city','Pune','state','Maharashtra','stateCode','27','tenant_id','tenant-default-001')),
  (UUID(),'LOC-MUM-WH','Mumbai Warehouse Central','Active','Approved',
    JSON_OBJECT('type','Warehouse','city','Mumbai','state','Maharashtra','stateCode','27','tenant_id','tenant-default-001')),
  (UUID(),'LOC-DEL-WH','Delhi Warehouse',       'Active','Approved',
    JSON_OBJECT('type','Warehouse','city','New Delhi','state','Delhi','stateCode','07','tenant_id','tenant-default-001'));

-- ── 6. Seed users into user_master.user_master ─────────────────────────────
-- All users share the bcrypt hash of "Demo@123" (same hash as
-- mithilesh@procinix.ai). WHERE NOT EXISTS guards each insert against
-- duplicate email on re-run, since user_master has no UNIQUE constraint
-- on the email-in-payload field.

SET @TENANT := 'tenant-default-001';
SET @ENTITY := 'entity-ptpl-001';
SET @PWHASH := '$2b$12$3gHSOwGOsplbR4OXlqLB9Oz4ouoTUXmW/FlefkfUApPcq5BbsGX1e';

-- Helper macro pattern: each insert wraps the values block in
-- INSERT … SELECT … WHERE NOT EXISTS (SELECT 1 ...email=?).
-- Repeated 11× below.

INSERT INTO user_master.user_master
  (id, record_code, record_name, status, approval_status, payload, tenant_id, default_entity_id)
SELECT UUID(),'EMP101','Arun Pillai','Active','Approved',
  JSON_OBJECT('email','arun.pillai@procinix.ai','passwordHash',@PWHASH,'role','cfo',
    'departmentName','Finance & Accounts','designationCode','DESIG-003','locationCode','LOC-MUM-01',
    'displayName','Arun Pillai'),
  @TENANT,@ENTITY
WHERE NOT EXISTS (SELECT 1 FROM user_master.user_master
  WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.email')))='arun.pillai@procinix.ai');

INSERT INTO user_master.user_master
  (id, record_code, record_name, status, approval_status, payload, tenant_id, default_entity_id)
SELECT UUID(),'EMP102','Sundar Rao','Active','Approved',
  JSON_OBJECT('email','sundar.rao@procinix.ai','passwordHash',@PWHASH,'role','payment_approver',
    'departmentName','Finance & Accounts','designationCode','DESIG-020','locationCode','LOC-MUM-01',
    'displayName','Sundar Rao'),
  @TENANT,@ENTITY
WHERE NOT EXISTS (SELECT 1 FROM user_master.user_master
  WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.email')))='sundar.rao@procinix.ai');

INSERT INTO user_master.user_master
  (id, record_code, record_name, status, approval_status, payload, tenant_id, default_entity_id)
SELECT UUID(),'EMP103','Priya Nair','Active','Approved',
  JSON_OBJECT('email','priya.nair@procinix.ai','passwordHash',@PWHASH,'role','finance_manager',
    'departmentName','Finance & Accounts','designationCode','DESIG-009','locationCode','LOC-MUM-01',
    'displayName','Priya Nair'),
  @TENANT,@ENTITY
WHERE NOT EXISTS (SELECT 1 FROM user_master.user_master
  WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.email')))='priya.nair@procinix.ai');

INSERT INTO user_master.user_master
  (id, record_code, record_name, status, approval_status, payload, tenant_id, default_entity_id)
SELECT UUID(),'EMP104','Rohan Mehta','Active','Approved',
  JSON_OBJECT('email','rohan.mehta@procinix.ai','passwordHash',@PWHASH,'role','finance_executive',
    'departmentName','Finance & Accounts','designationCode','DESIG-012','locationCode','LOC-MUM-01',
    'displayName','Rohan Mehta'),
  @TENANT,@ENTITY
WHERE NOT EXISTS (SELECT 1 FROM user_master.user_master
  WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.email')))='rohan.mehta@procinix.ai');

INSERT INTO user_master.user_master
  (id, record_code, record_name, status, approval_status, payload, tenant_id, default_entity_id)
SELECT UUID(),'EMP105','Kiran Desai','Active','Approved',
  JSON_OBJECT('email','kiran.desai@procinix.ai','passwordHash',@PWHASH,'role','finance_executive',
    'departmentName','Finance & Accounts','designationCode','DESIG-013','locationCode','LOC-BLR-01',
    'displayName','Kiran Desai'),
  @TENANT,@ENTITY
WHERE NOT EXISTS (SELECT 1 FROM user_master.user_master
  WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.email')))='kiran.desai@procinix.ai');

INSERT INTO user_master.user_master
  (id, record_code, record_name, status, approval_status, payload, tenant_id, default_entity_id)
SELECT UUID(),'EMP106','Meena Iyer','Active','Approved',
  JSON_OBJECT('email','meena.iyer@procinix.ai','passwordHash',@PWHASH,'role','procurement_manager',
    'departmentName','Procurement','designationCode','DESIG-009','locationCode','LOC-MUM-01',
    'displayName','Meena Iyer'),
  @TENANT,@ENTITY
WHERE NOT EXISTS (SELECT 1 FROM user_master.user_master
  WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.email')))='meena.iyer@procinix.ai');

INSERT INTO user_master.user_master
  (id, record_code, record_name, status, approval_status, payload, tenant_id, default_entity_id)
SELECT UUID(),'EMP107','Deepak Nair','Active','Approved',
  JSON_OBJECT('email','deepak.nair@procinix.ai','passwordHash',@PWHASH,'role','procurement_executive',
    'departmentName','Procurement','designationCode','DESIG-013','locationCode','LOC-DEL-01',
    'displayName','Deepak Nair'),
  @TENANT,@ENTITY
WHERE NOT EXISTS (SELECT 1 FROM user_master.user_master
  WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.email')))='deepak.nair@procinix.ai');

INSERT INTO user_master.user_master
  (id, record_code, record_name, status, approval_status, payload, tenant_id, default_entity_id)
SELECT UUID(),'EMP108','Ananya Sharma','Active','Approved',
  JSON_OBJECT('email','ananya.sharma@procinix.ai','passwordHash',@PWHASH,'role','hr_manager',
    'departmentName','Human Resources','designationCode','DESIG-010','locationCode','LOC-MUM-01',
    'displayName','Ananya Sharma'),
  @TENANT,@ENTITY
WHERE NOT EXISTS (SELECT 1 FROM user_master.user_master
  WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.email')))='ananya.sharma@procinix.ai');

-- Vikram Singh / vikram.singh@procinix.ai already exists (EMP005). Skipped
-- by the WHERE NOT EXISTS guard, but documented here for clarity.
INSERT INTO user_master.user_master
  (id, record_code, record_name, status, approval_status, payload, tenant_id, default_entity_id)
SELECT UUID(),'EMP109','Vikram Singh','Active','Approved',
  JSON_OBJECT('email','vikram.singh@procinix.ai','passwordHash',@PWHASH,'role','operations_manager',
    'departmentName','Operations','designationCode','DESIG-007','locationCode','LOC-DEL-01',
    'displayName','Vikram Singh'),
  @TENANT,@ENTITY
WHERE NOT EXISTS (SELECT 1 FROM user_master.user_master
  WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.email')))='vikram.singh@procinix.ai');

INSERT INTO user_master.user_master
  (id, record_code, record_name, status, approval_status, payload, tenant_id, default_entity_id)
SELECT UUID(),'EMP110','Neha Joshi','Active','Approved',
  JSON_OBJECT('email','neha.joshi@procinix.ai','passwordHash',@PWHASH,'role','finance_executive',
    'departmentName','Finance & Accounts','designationCode','DESIG-015','locationCode','LOC-PUN-01',
    'displayName','Neha Joshi'),
  @TENANT,@ENTITY
WHERE NOT EXISTS (SELECT 1 FROM user_master.user_master
  WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.email')))='neha.joshi@procinix.ai');

INSERT INTO user_master.user_master
  (id, record_code, record_name, status, approval_status, payload, tenant_id, default_entity_id)
SELECT UUID(),'EMP111','Rahul Gupta','Active','Approved',
  JSON_OBJECT('email','rahul.gupta@procinix.ai','passwordHash',@PWHASH,'role','procurement_executive',
    'departmentName','Procurement','designationCode','DESIG-014','locationCode','LOC-HYD-01',
    'displayName','Rahul Gupta'),
  @TENANT,@ENTITY
WHERE NOT EXISTS (SELECT 1 FROM user_master.user_master
  WHERE LOWER(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.email')))='rahul.gupta@procinix.ai');
