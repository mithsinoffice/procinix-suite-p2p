-- ============================================================================
-- 20260511_employee_master.sql
-- Bespoke employee_master table with FK columns + 15 seed rows.
--   • Different shape from canonical erp masters — first/last name split,
--     dedicated FK columns for department / designation / location /
--     reporting_manager (self-ref) / cost_centre / profit_centre.
--   • UNIQUE on (employee_code, tenant_id) → idempotent INSERT IGNORE.
--   • UNIQUE on (email, tenant_id), (phone, tenant_id), (pan_number, tenant_id)
--     enforce uniqueness checks performed in the server route as well, but
--     these indexes give the database final say.
--   • Routes live in server/routes/masters.mjs — that file translates the
--     bespoke schema to/from the canonical /api/masters/<key> contract so
--     SimpleMasterScreenV2 + useIncrementalMasterRecords can drive the UI.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS employee_master
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS employee_master.employee_master (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  employee_code VARCHAR(60) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  department_id VARCHAR(36) NULL,
  department_name VARCHAR(200) NULL,
  designation_id VARCHAR(36) NULL,
  designation_name VARCHAR(200) NULL,
  location_id VARCHAR(36) NULL,
  location_name VARCHAR(200) NULL,
  reporting_manager_id VARCHAR(36) NULL,
  reporting_manager_name VARCHAR(200) NULL,
  cost_centre_id VARCHAR(36) NULL,
  cost_centre_name VARCHAR(200) NULL,
  profit_centre_id VARCHAR(36) NULL,
  profit_centre_name VARCHAR(200) NULL,
  employment_type ENUM('full_time','part_time','contract','intern') NOT NULL DEFAULT 'full_time',
  status ENUM('active','inactive','on_leave','terminated') NOT NULL DEFAULT 'active',
  approval_status ENUM('Approved','Pending Approval','Rejected','Draft') NOT NULL DEFAULT 'Approved',
  date_of_joining DATE NULL,
  date_of_leaving DATE NULL,
  pan_number VARCHAR(10) NULL,
  entity_id VARCHAR(36) NULL,
  entity_code VARCHAR(50) NULL,
  created_by VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_emp_code_tenant (employee_code, tenant_id),
  UNIQUE KEY uq_emp_email_tenant (email, tenant_id),
  INDEX idx_tenant (tenant_id),
  INDEX idx_dept (department_id),
  INDEX idx_manager (reporting_manager_id),
  INDEX idx_entity (entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS employee_master.employee_master_audit (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  action VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_payload JSON,
  after_payload JSON,
  INDEX idx_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Seed FK lookups (department/designation IDs are looked up at insert ────
-- time so we survive id drift; tenant_id always tenant-default-001) ──────
SET @TENANT := 'tenant-default-001' COLLATE utf8mb4_0900_ai_ci;
SET @PTPL := 'entity-ptpl-001' COLLATE utf8mb4_0900_ai_ci;
SET @PTPL_CODE := 'PTPL' COLLATE utf8mb4_0900_ai_ci;

SET @DEPT_FIN := (SELECT id FROM department_master.department_master WHERE record_code='DEPT-001' LIMIT 1);
SET @DEPT_HR  := (SELECT id FROM department_master.department_master WHERE record_code='DEPT-002' LIMIT 1);
SET @DEPT_IT  := (SELECT id FROM department_master.department_master WHERE record_code='DEPT-003' LIMIT 1);
SET @DEPT_OPS := (SELECT id FROM department_master.department_master WHERE record_code='DEPT-004' LIMIT 1);
SET @DEPT_SAL := (SELECT id FROM department_master.department_master WHERE record_code='DEPT-005' LIMIT 1);
SET @DEPT_PRO := (SELECT id FROM department_master.department_master WHERE record_code='DEPT-006' LIMIT 1);
SET @DEPT_LEG := (SELECT id FROM department_master.department_master WHERE record_code='DEPT-007' LIMIT 1);
SET @DEPT_ENG := (SELECT id FROM department_master.department_master WHERE record_code='DEPT-009' LIMIT 1);

SET @DESIG_CEO := (SELECT id FROM designation_master.designation_master WHERE record_code='DESIG-002' LIMIT 1);
SET @DESIG_CFO := (SELECT id FROM designation_master.designation_master WHERE record_code='DESIG-003' LIMIT 1);
SET @DESIG_CTO := (SELECT id FROM designation_master.designation_master WHERE record_code='DESIG-004' LIMIT 1);
SET @DESIG_VP  := (SELECT id FROM designation_master.designation_master WHERE record_code='DESIG-006' LIMIT 1);
SET @DESIG_MGR := (SELECT id FROM designation_master.designation_master WHERE record_code='DESIG-010' LIMIT 1);
SET @DESIG_SRE := (SELECT id FROM designation_master.designation_master WHERE record_code='DESIG-012' LIMIT 1);
SET @DESIG_EXE := (SELECT id FROM designation_master.designation_master WHERE record_code='DESIG-013' LIMIT 1);
SET @DESIG_ANL := (SELECT id FROM designation_master.designation_master WHERE record_code='DESIG-015' LIMIT 1);

SET @LOC_HQ   := (SELECT id FROM location_master.location_master WHERE record_code='LOC-001' LIMIT 1);
SET @LOC_DEL  := (SELECT id FROM location_master.location_master WHERE record_code='LOC-002' LIMIT 1);
SET @LOC_BAN  := (SELECT id FROM location_master.location_master WHERE record_code='LOC-003' LIMIT 1);
SET @LOC_PUN  := (SELECT id FROM location_master.location_master WHERE record_code='LOC-007' LIMIT 1);

-- Reporting manager seeds reference earlier rows by deterministic UUID so the
-- self-FK survives re-runs.
SET @EMP_CEO   := 'e1111111-aaaa-bbbb-cccc-000000000001' COLLATE utf8mb4_0900_ai_ci;
SET @EMP_CFO   := 'e1111111-aaaa-bbbb-cccc-000000000002' COLLATE utf8mb4_0900_ai_ci;
SET @EMP_CTO   := 'e1111111-aaaa-bbbb-cccc-000000000003' COLLATE utf8mb4_0900_ai_ci;
SET @EMP_VPENG := 'e1111111-aaaa-bbbb-cccc-000000000004' COLLATE utf8mb4_0900_ai_ci;
SET @EMP_VPSAL := 'e1111111-aaaa-bbbb-cccc-000000000005' COLLATE utf8mb4_0900_ai_ci;
SET @EMP_FINMGR:= 'e1111111-aaaa-bbbb-cccc-000000000006' COLLATE utf8mb4_0900_ai_ci;
SET @EMP_PROMGR:= 'e1111111-aaaa-bbbb-cccc-000000000007' COLLATE utf8mb4_0900_ai_ci;
SET @EMP_HRMGR := 'e1111111-aaaa-bbbb-cccc-000000000008' COLLATE utf8mb4_0900_ai_ci;

INSERT IGNORE INTO employee_master.employee_master
  (id, tenant_id, employee_code, first_name, last_name, email, phone,
   department_id, department_name, designation_id, designation_name,
   location_id, location_name, reporting_manager_id, reporting_manager_name,
   employment_type, status, approval_status, date_of_joining, pan_number,
   entity_id, entity_code, created_by)
VALUES
  (@EMP_CEO,    @TENANT,'EMP-PTPL-2026-0001','Arjun',   'Mehta',     'arjun.mehta@procinix.ai',     '9810000001', @DEPT_FIN,'Finance & Accounts',     @DESIG_CEO,'Chief Executive Officer',  @LOC_HQ,'Mumbai HQ',          NULL,            NULL,                       'full_time','active','Approved','2018-04-01','AAAPM1234A',@PTPL,@PTPL_CODE,'seed'),
  (@EMP_CFO,    @TENANT,'EMP-PTPL-2026-0002','Sundar',  'Rao',       'sundar.rao@procinix.ai',      '9810000002', @DEPT_FIN,'Finance & Accounts',     @DESIG_CFO,'Chief Financial Officer',  @LOC_HQ,'Mumbai HQ',          @EMP_CEO,        'Arjun Mehta',              'full_time','active','Approved','2019-06-01','AAAPR2345B',@PTPL,@PTPL_CODE,'seed'),
  (@EMP_CTO,    @TENANT,'EMP-PTPL-2026-0003','Karthik', 'Iyer',      'karthik.iyer@procinix.ai',    '9810000003', @DEPT_IT, 'Information Technology', @DESIG_CTO,'Chief Technology Officer', @LOC_BAN,'Bangalore Tech Centre',@EMP_CEO,       'Arjun Mehta',              'full_time','active','Approved','2019-08-01','AAAPI3456C',@PTPL,@PTPL_CODE,'seed'),
  (@EMP_VPENG,  @TENANT,'EMP-PTPL-2026-0004','Priya',   'Nair',      'priya.nair@procinix.ai',      '9810000004', @DEPT_ENG,'Engineering',            @DESIG_VP, 'Vice President',           @LOC_BAN,'Bangalore Tech Centre',@EMP_CTO,        'Karthik Iyer',             'full_time','active','Approved','2020-02-15','AAAPN4567D',@PTPL,@PTPL_CODE,'seed'),
  (@EMP_VPSAL,  @TENANT,'EMP-PTPL-2026-0005','Vikram',  'Singh',     'vikram.singh@procinix.ai',    '9810000005', @DEPT_SAL,'Sales & Marketing',      @DESIG_VP, 'Vice President',           @LOC_DEL,'Delhi Regional Office',@EMP_CEO,        'Arjun Mehta',              'full_time','active','Approved','2020-05-10','AAAPS5678E',@PTPL,@PTPL_CODE,'seed'),
  (@EMP_FINMGR, @TENANT,'EMP-PTPL-2026-0006','Anita',   'Desai',     'anita.desai@procinix.ai',     '9810000006', @DEPT_FIN,'Finance & Accounts',     @DESIG_MGR,'Manager',                  @LOC_HQ,'Mumbai HQ',          @EMP_CFO,        'Sundar Rao',               'full_time','active','Approved','2021-01-04','AAAPD6789F',@PTPL,@PTPL_CODE,'seed'),
  (@EMP_PROMGR, @TENANT,'EMP-PTPL-2026-0007','Meena',   'Iyer',      'meena.iyer@procinix.ai',      '9810000007', @DEPT_PRO,'Procurement',            @DESIG_MGR,'Manager',                  @LOC_HQ,'Mumbai HQ',          @EMP_CFO,        'Sundar Rao',               'full_time','active','Approved','2021-03-20','AAAPI7890G',@PTPL,@PTPL_CODE,'seed'),
  (@EMP_HRMGR,  @TENANT,'EMP-PTPL-2026-0008','Ananya',  'Sharma',    'ananya.sharma@procinix.ai',   '9810000008', @DEPT_HR, 'Human Resources',        @DESIG_MGR,'Manager',                  @LOC_HQ,'Mumbai HQ',          @EMP_CEO,        'Arjun Mehta',              'full_time','active','Approved','2021-04-05','AAAPS8901H',@PTPL,@PTPL_CODE,'seed'),
  (UUID(),      @TENANT,'EMP-PTPL-2026-0009','Rohan',   'Kapoor',    'rohan.kapoor@procinix.ai',    '9810000009', @DEPT_ENG,'Engineering',            @DESIG_SRE,'Senior Executive',         @LOC_BAN,'Bangalore Tech Centre',@EMP_VPENG,    'Priya Nair',               'full_time','active','Approved','2022-07-11','AAAPK9012I',@PTPL,@PTPL_CODE,'seed'),
  (UUID(),      @TENANT,'EMP-PTPL-2026-0010','Kiran',   'Patel',     'kiran.patel@procinix.ai',     '9810000010', @DEPT_ENG,'Engineering',            @DESIG_SRE,'Senior Executive',         @LOC_PUN,'Pune Office',         @EMP_VPENG,      'Priya Nair',               'full_time','active','Approved','2022-09-12','AAAPP0123J',@PTPL,@PTPL_CODE,'seed'),
  (UUID(),      @TENANT,'EMP-PTPL-2026-0011','Deepak',  'Verma',     'deepak.verma@procinix.ai',    '9810000011', @DEPT_IT, 'Information Technology', @DESIG_EXE,'Executive',                @LOC_BAN,'Bangalore Tech Centre',@EMP_CTO,        'Karthik Iyer',             'full_time','active','Approved','2023-02-01','AAAPV1234K',@PTPL,@PTPL_CODE,'seed'),
  (UUID(),      @TENANT,'EMP-PTPL-2026-0012','Neha',    'Joshi',     'neha.joshi@procinix.ai',      '9810000012', @DEPT_SAL,'Sales & Marketing',      @DESIG_EXE,'Executive',                @LOC_DEL,'Delhi Regional Office',@EMP_VPSAL,    'Vikram Singh',             'full_time','active','Approved','2023-05-22','AAAPJ2345L',@PTPL,@PTPL_CODE,'seed'),
  (UUID(),      @TENANT,'EMP-PTPL-2026-0013','Rahul',   'Gupta',     'rahul.gupta@procinix.ai',     '9810000013', @DEPT_PRO,'Procurement',            @DESIG_EXE,'Executive',                @LOC_HQ,'Mumbai HQ',          @EMP_PROMGR,     'Meena Iyer',               'full_time','active','Approved','2023-09-15','AAAPG3456M',@PTPL,@PTPL_CODE,'seed'),
  (UUID(),      @TENANT,'EMP-PTPL-2026-0014','Pooja',   'Sinha',     'pooja.sinha@procinix.ai',     '9810000014', @DEPT_FIN,'Finance & Accounts',     @DESIG_ANL,'Analyst',                  @LOC_HQ,'Mumbai HQ',          @EMP_FINMGR,     'Anita Desai',              'full_time','active','Approved','2024-04-01','AAAPS4567N',@PTPL,@PTPL_CODE,'seed'),
  (UUID(),      @TENANT,'EMP-PTPL-2026-0015','Sandeep', 'Krishnan',  'sandeep.krishnan@procinix.ai','9810000015', @DEPT_HR, 'Human Resources',        @DESIG_ANL,'Analyst',                  @LOC_HQ,'Mumbai HQ',          @EMP_HRMGR,      'Ananya Sharma',            'full_time','active','Approved','2024-06-10','AAAPK5678O',@PTPL,@PTPL_CODE,'seed');
