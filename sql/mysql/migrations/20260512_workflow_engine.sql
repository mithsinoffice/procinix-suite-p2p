-- ════════════════════════════════════════════════════════════════════════════
-- 20260512 — Workflow Engine (PART 1, 9 of the engine build)
-- Wires:
--   • user_roles                — role-name → user-id mapping per tenant
--   • workflow_field_registry   — dynamic field catalogue per document type
--   • approvals.*               — multi-step routing columns + token + enum widening
--   • notifications             — bell + email log
--   • workflow_configurations   — default Active seeds for every document type
--   • user_roles                — role seeds for tenant-default-001 → user-mith-001
-- Idempotent: ALTER ADD COLUMN errors (ER_DUP_FIELDNAME) are tolerated by
-- applyAdHocMigrations.mjs; INSERT IGNORE / ON DUPLICATE KEY UPDATE protect seeds.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1A) user_roles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenant_role_user (tenant_id, role_name, user_id),
  KEY idx_tenant_role (tenant_id, role_name),
  KEY idx_user (user_id)
);

-- Seed every workflow role → mithilesh (the single seed user). Every role
-- maps to user-mith-001 in tenant-default-001 so smoke testing can route a
-- newly-submitted document end-to-end before real role users are onboarded.
INSERT IGNORE INTO user_roles (id, tenant_id, role_name, user_id, is_primary) VALUES
  ('role-fm-mith',   'tenant-default-001', 'Finance Manager',    'user-mith-001', 1),
  ('role-hod-mith',  'tenant-default-001', 'HOD',                'user-mith-001', 1),
  ('role-cfo-mith',  'tenant-default-001', 'CFO',                'user-mith-001', 1),
  ('role-ph-mith',   'tenant-default-001', 'Procurement Head',   'user-mith-001', 1),
  ('role-adm-mith',  'tenant-default-001', 'Admin',              'user-mith-001', 1),
  ('role-pm-mith',   'tenant-default-001', 'Procurement Manager','user-mith-001', 1),
  ('role-lm-mith',   'tenant-default-001', 'Location Manager',   'user-mith-001', 1),
  ('role-poa-mith',  'tenant-default-001', 'PO Approver',        'user-mith-001', 1),
  ('role-inv-mith',  'tenant-default-001', 'Invoice Approver',   'user-mith-001', 1),
  ('role-mst-mith',  'tenant-default-001', 'Master Approver',    'user-mith-001', 1);

-- ── 1B) approvals — multi-step routing columns ──────────────────────────────
-- (Each ADD COLUMN is run individually so ER_DUP_FIELDNAME from the applier's
--  ignorable list short-circuits the already-applied ones.)
ALTER TABLE approvals ADD COLUMN step_number INT NOT NULL DEFAULT 1;
ALTER TABLE approvals ADD COLUMN total_steps INT NOT NULL DEFAULT 1;
ALTER TABLE approvals ADD COLUMN workflow_config_id VARCHAR(36) NULL;
ALTER TABLE approvals ADD COLUMN next_step_role VARCHAR(100) NULL;
ALTER TABLE approvals ADD COLUMN parent_approval_id VARCHAR(36) NULL;
ALTER TABLE approvals ADD COLUMN token VARCHAR(128) NULL;
ALTER TABLE approvals ADD COLUMN token_expires_at DATETIME NULL;
ALTER TABLE approvals ADD COLUMN rejection_remarks TEXT NULL;
ALTER TABLE approvals ADD COLUMN skipped_reason VARCHAR(255) NULL;
-- document_ref/document_name carry the human-readable identifier so My
-- Approvals can render without round-tripping the source table.
ALTER TABLE approvals ADD COLUMN document_ref VARCHAR(255) NULL;
ALTER TABLE approvals ADD COLUMN document_name VARCHAR(255) NULL;
ALTER TABLE approvals ADD COLUMN tenant_id VARCHAR(100) NULL;
-- Indices supporting the new lookup patterns.
ALTER TABLE approvals ADD INDEX idx_token (token);
ALTER TABLE approvals ADD INDEX idx_parent (parent_approval_id);
ALTER TABLE approvals ADD INDEX idx_workflow_config (workflow_config_id);
ALTER TABLE approvals ADD INDEX idx_tenant (tenant_id);

-- Widen status enum: add pending_predecessor + cancelled. Required by the
-- dispatcher (subsequent steps land as 'pending_predecessor') and by the
-- reject path (cancels remaining predecessor rows).
ALTER TABLE approvals MODIFY COLUMN status
  ENUM('pending','approved','rejected','pending_predecessor','cancelled')
  NOT NULL;

-- Widen module enum: add purchase_request + grn (current enum is missing them
-- but the spec routes all 9 document types). Re-running with the same enum
-- spec is a no-op so this is idempotent.
ALTER TABLE approvals MODIFY COLUMN module
  ENUM('ap_invoice','non_po_invoice','purchase_order','purchase_request','grn',
       'payment','vendor_onboarding','master_update','vendor_advance','debit_note')
  NOT NULL;

-- ── 1C) workflow_field_registry ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_field_registry (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  document_type VARCHAR(100) NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(150) NOT NULL,
  field_source VARCHAR(100) NOT NULL,
  source_table VARCHAR(100) NULL,
  source_column VARCHAR(100) NULL,
  data_type ENUM('string','number','boolean','enum') NOT NULL DEFAULT 'string',
  tenant_id VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doctype_field (document_type, field_key),
  KEY idx_doctype (document_type)
);

-- Field seeds. `field_source` is the document JSON key; `source_table` +
-- `source_column` are populated for fields whose options come from a master
-- table (the field API hydrates DISTINCT values at read time).
INSERT IGNORE INTO workflow_field_registry
  (id, document_type, field_key, field_label, field_source, source_table, source_column, data_type)
VALUES
  -- AP invoice / Non-PO invoice (share schema)
  ('fr-inv-amt',      'ap_invoice', 'invoice_amount',   'Invoice Amount',    'document.total_amount',  NULL, NULL, 'number'),
  ('fr-inv-dept',     'ap_invoice', 'department',       'Department',        'document.department',    'departments', 'name', 'enum'),
  ('fr-inv-sd',       'ap_invoice', 'sub_department',   'Sub Department',    'document.sub_department', NULL, NULL, 'string'),
  ('fr-inv-ent',      'ap_invoice', 'entity',           'Entity',            'document.entity_id',     'entities', 'name', 'enum'),
  ('fr-inv-ven',      'ap_invoice', 'vendor_id',        'Vendor',            'document.vendor_id',     'vendors', 'vendor_code', 'enum'),
  ('fr-inv-vty',      'ap_invoice', 'vendor_type',      'Vendor Type',       'document.vendor_type',   NULL, NULL, 'string'),
  ('fr-inv-vg',       'ap_invoice', 'vendor_group',     'Vendor Group',      'document.vendor_group',  'vendor_group_master', 'record_code', 'enum'),
  ('fr-inv-msme',     'ap_invoice', 'msme_flag',        'MSME Flag',         'document.msme_flag',     NULL, NULL, 'boolean'),
  ('fr-inv-pos',      'ap_invoice', 'place_of_supply',  'Place of Supply',   'document.place_of_supply', NULL, NULL, 'string'),
  ('fr-inv-gst',      'ap_invoice', 'gst_type',         'GST Type',          'document.gst_type',      NULL, NULL, 'string'),
  ('fr-inv-tds',      'ap_invoice', 'tds_section',      'TDS Section',       'document.tds_section',   'tds_section_master', 'section_code', 'enum'),
  ('fr-inv-pt',       'ap_invoice', 'payment_terms',    'Payment Terms',     'document.payment_terms', NULL, NULL, 'string'),
  ('fr-inv-it',       'ap_invoice', 'invoice_type',     'Invoice Type',      'document.invoice_type',  NULL, NULL, 'string'),
  ('fr-inv-cur',      'ap_invoice', 'currency',         'Currency',          'document.currency',      NULL, NULL, 'string'),
  ('fr-inv-gl',       'ap_invoice', 'gl_code',          'GL Code',           'document.gl_code',       'gl_codes', 'gl_code', 'enum'),
  ('fr-inv-in',       'ap_invoice', 'item_name',        'Item Name',         'document.item_name',     NULL, NULL, 'string'),
  ('fr-inv-ic',       'ap_invoice', 'item_category',    'Item Category',     'document.item_category', 'item_category_master', 'record_code', 'enum'),
  ('fr-inv-sac',      'ap_invoice', 'sac_code',         'SAC Code',          'document.sac_code',      NULL, NULL, 'string'),
  ('fr-inv-cc',       'ap_invoice', 'cost_centre',      'Cost Centre',       'document.cost_centre',   'cost_centre_master', 'record_code', 'enum'),
  ('fr-inv-pc',       'ap_invoice', 'profit_centre',    'Profit Centre',     'document.profit_centre', 'profit_centre_master', 'record_code', 'enum'),
  ('fr-inv-proj',     'ap_invoice', 'project',          'Project',           'document.project_code',  NULL, NULL, 'string'),
  ('fr-inv-bl',       'ap_invoice', 'billing_location', 'Billing Location',  'document.billing_location', 'location_master', 'record_code', 'enum'),
  ('fr-inv-lic',      'ap_invoice', 'line_item_count',  'Line Item Count',   'document.line_item_count', NULL, NULL, 'number'),
  ('fr-inv-rcm',      'ap_invoice', 'rcm_applicable',   'RCM Applicable',    'document.rcm_applicable', NULL, NULL, 'boolean'),

  -- Non-PO invoice — same as ap_invoice but with non_po_invoice key.
  ('fr-npi-amt',      'non_po_invoice', 'invoice_amount', 'Invoice Amount',  'document.total_amount',  NULL, NULL, 'number'),
  ('fr-npi-dept',     'non_po_invoice', 'department',     'Department',      'document.department',    'departments', 'name', 'enum'),
  ('fr-npi-ent',      'non_po_invoice', 'entity',         'Entity',          'document.entity_id',     'entities', 'name', 'enum'),
  ('fr-npi-ven',      'non_po_invoice', 'vendor_id',      'Vendor',          'document.vendor_id',     'vendors', 'vendor_code', 'enum'),
  ('fr-npi-vg',       'non_po_invoice', 'vendor_group',   'Vendor Group',    'document.vendor_group',  'vendor_group_master', 'record_code', 'enum'),
  ('fr-npi-pos',      'non_po_invoice', 'place_of_supply','Place of Supply', 'document.place_of_supply', NULL, NULL, 'string'),
  ('fr-npi-gl',       'non_po_invoice', 'gl_code',        'GL Code',         'document.gl_code',       'gl_codes', 'gl_code', 'enum'),
  ('fr-npi-cc',       'non_po_invoice', 'cost_centre',    'Cost Centre',     'document.cost_centre',   'cost_centre_master', 'record_code', 'enum'),
  ('fr-npi-pc',       'non_po_invoice', 'profit_centre',  'Profit Centre',   'document.profit_centre', 'profit_centre_master', 'record_code', 'enum'),
  ('fr-npi-rcm',      'non_po_invoice', 'rcm_applicable', 'RCM Applicable',  'document.rcm_applicable', NULL, NULL, 'boolean'),

  -- Purchase order / request (share keys)
  ('fr-po-amt',       'purchase_order', 'total_amount',  'Total Amount',     'document.total_amount',  NULL, NULL, 'number'),
  ('fr-po-dept',      'purchase_order', 'department',    'Department',       'document.department',    'departments', 'name', 'enum'),
  ('fr-po-ent',       'purchase_order', 'entity',        'Entity',           'document.entity_id',     'entities', 'name', 'enum'),
  ('fr-po-item',      'purchase_order', 'item_name',     'Item Name',        'document.item_name',     NULL, NULL, 'string'),
  ('fr-po-ic',        'purchase_order', 'item_category', 'Item Category',    'document.item_category', 'item_category_master', 'record_code', 'enum'),
  ('fr-po-gl',        'purchase_order', 'gl_code',       'GL Code',          'document.gl_code',       'gl_codes', 'gl_code', 'enum'),
  ('fr-po-cc',        'purchase_order', 'cost_centre',   'Cost Centre',      'document.cost_centre',   'cost_centre_master', 'record_code', 'enum'),
  ('fr-po-pc',        'purchase_order', 'profit_centre', 'Profit Centre',    'document.profit_centre', 'profit_centre_master', 'record_code', 'enum'),
  ('fr-po-proj',      'purchase_order', 'project',       'Project',          'document.project_code',  NULL, NULL, 'string'),
  ('fr-po-ven',       'purchase_order', 'vendor_id',     'Vendor',           'document.vendor_id',     'vendors', 'vendor_code', 'enum'),
  ('fr-po-vty',       'purchase_order', 'vendor_type',   'Vendor Type',      'document.vendor_type',   NULL, NULL, 'string'),
  ('fr-po-cap',       'purchase_order', 'capex_opex_flag','CAPEX/OPEX Flag', 'document.capex_opex',    NULL, NULL, 'enum'),

  ('fr-pr-amt',       'purchase_request', 'total_amount',  'Total Amount',   'document.total_amount',  NULL, NULL, 'number'),
  ('fr-pr-dept',      'purchase_request', 'department',    'Department',     'document.department',    'departments', 'name', 'enum'),
  ('fr-pr-ent',       'purchase_request', 'entity',        'Entity',         'document.entity_id',     'entities', 'name', 'enum'),
  ('fr-pr-item',      'purchase_request', 'item_name',     'Item Name',      'document.item_name',     NULL, NULL, 'string'),
  ('fr-pr-ic',        'purchase_request', 'item_category', 'Item Category',  'document.item_category', 'item_category_master', 'record_code', 'enum'),
  ('fr-pr-gl',        'purchase_request', 'gl_code',       'GL Code',        'document.gl_code',       'gl_codes', 'gl_code', 'enum'),
  ('fr-pr-cc',        'purchase_request', 'cost_centre',   'Cost Centre',    'document.cost_centre',   'cost_centre_master', 'record_code', 'enum'),
  ('fr-pr-pc',        'purchase_request', 'profit_centre', 'Profit Centre',  'document.profit_centre', 'profit_centre_master', 'record_code', 'enum'),
  ('fr-pr-proj',      'purchase_request', 'project',       'Project',        'document.project_code',  NULL, NULL, 'string'),
  ('fr-pr-cap',       'purchase_request', 'capex_opex_flag','CAPEX/OPEX Flag','document.capex_opex',   NULL, NULL, 'enum'),

  -- GRN
  ('fr-grn-dept',     'grn', 'department', 'Department',                     'document.department',    'departments', 'name', 'enum'),
  ('fr-grn-ent',      'grn', 'entity',     'Entity',                         'document.entity_id',     'entities', 'name', 'enum'),
  ('fr-grn-loc',      'grn', 'location',   'Location',                       'document.location',      'location_master', 'record_code', 'enum'),
  ('fr-grn-ven',      'grn', 'vendor_id',  'Vendor',                         'document.vendor_id',     'vendors', 'vendor_code', 'enum'),
  ('fr-grn-tv',       'grn', 'total_value','Total Value',                    'document.total_value',   NULL, NULL, 'number'),

  -- Payment
  ('fr-pay-amt',      'payment', 'amount',         'Amount',                 'document.amount',        NULL, NULL, 'number'),
  ('fr-pay-dept',     'payment', 'department',     'Department',             'document.department',    'departments', 'name', 'enum'),
  ('fr-pay-ent',      'payment', 'entity',         'Entity',                 'document.entity_id',     'entities', 'name', 'enum'),
  ('fr-pay-ven',      'payment', 'vendor_id',      'Vendor',                 'document.vendor_id',     'vendors', 'vendor_code', 'enum'),
  ('fr-pay-pm',       'payment', 'payment_method', 'Payment Method',         'document.payment_method', NULL, NULL, 'string'),

  -- Vendor advance
  ('fr-adv-amt',      'vendor_advance', 'amount',     'Amount',              'document.amount',        NULL, NULL, 'number'),
  ('fr-adv-dept',     'vendor_advance', 'department', 'Department',          'document.department',    'departments', 'name', 'enum'),
  ('fr-adv-ent',      'vendor_advance', 'entity',     'Entity',              'document.entity_id',     'entities', 'name', 'enum'),
  ('fr-adv-ven',      'vendor_advance', 'vendor_id',  'Vendor',              'document.vendor_id',     'vendors', 'vendor_code', 'enum'),

  -- Debit note
  ('fr-dn-amt',       'debit_note', 'amount',     'Amount',                  'document.amount',        NULL, NULL, 'number'),
  ('fr-dn-ven',       'debit_note', 'vendor_id',  'Vendor',                  'document.vendor_id',     'vendors', 'vendor_code', 'enum'),
  ('fr-dn-dept',      'debit_note', 'department', 'Department',              'document.department',    'departments', 'name', 'enum'),

  -- Master update
  ('fr-mu-mt',        'master_update', 'master_type', 'Master Type',         'document.master_type',   NULL, NULL, 'string'),
  ('fr-mu-dept',      'master_update', 'department',  'Department',          'document.department',    'departments', 'name', 'enum'),
  ('fr-mu-ent',       'master_update', 'entity',      'Entity',              'document.entity_id',     'entities', 'name', 'enum'),
  ('fr-mu-sb',        'master_update', 'submitted_by','Submitted By',        'document.submitted_by',  NULL, NULL, 'string');

-- ── 1D) notifications ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  link VARCHAR(255) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_unread (user_id, is_read),
  KEY idx_tenant_user (tenant_id, user_id)
);

-- ── 1E) Default Active workflow seeds (PART 9) ──────────────────────────────
-- One seed per document type. Steps are roles only (resolver looks them up
-- against user_roles at dispatch time, so any tenant onboarding new approvers
-- just inserts into user_roles without touching workflow_configurations).
-- conditionJson omitted (or empty) means "always include this step".
INSERT IGNORE INTO workflow_configurations
  (id, workflow_name, module_name, description, trigger_event, conditions, steps, status, created_date)
VALUES
  ('wf-ap-invoice-001', 'AP Invoice Approval',           'ap_invoice',
   'Default 3-step AP invoice approval — Finance Manager → HOD → CFO.', 'On Record Submission',
   CAST('[]' AS JSON),
   CAST('[
     {"stepNumber":1,"approverRole":"Finance Manager","isMandatory":true,"allowDelegation":false},
     {"stepNumber":2,"approverRole":"HOD","isMandatory":true,"allowDelegation":false},
     {"stepNumber":3,"approverRole":"CFO","isMandatory":true,"allowDelegation":false}
   ]' AS JSON), 'Active', CURRENT_DATE),
  ('wf-non-po-invoice-001', 'Non-PO Invoice Approval', 'non_po_invoice',
   'Default 2-step Non-PO invoice approval — Finance Manager → HOD.', 'On Record Submission',
   CAST('[]' AS JSON),
   CAST('[
     {"stepNumber":1,"approverRole":"Finance Manager","isMandatory":true,"allowDelegation":false},
     {"stepNumber":2,"approverRole":"HOD","isMandatory":true,"allowDelegation":false}
   ]' AS JSON), 'Active', CURRENT_DATE),
  ('wf-purchase-order-001', 'Purchase Order Approval', 'purchase_order',
   'Default 2-step PO approval — Procurement Head → Finance Manager.', 'On Record Submission',
   CAST('[]' AS JSON),
   CAST('[
     {"stepNumber":1,"approverRole":"Procurement Head","isMandatory":true,"allowDelegation":false},
     {"stepNumber":2,"approverRole":"Finance Manager","isMandatory":true,"allowDelegation":false}
   ]' AS JSON), 'Active', CURRENT_DATE),
  ('wf-purchase-request-001', 'Purchase Request Approval', 'purchase_request',
   'Default 2-step PR approval — HOD → Procurement Head.', 'On Record Submission',
   CAST('[]' AS JSON),
   CAST('[
     {"stepNumber":1,"approverRole":"HOD","isMandatory":true,"allowDelegation":false},
     {"stepNumber":2,"approverRole":"Procurement Head","isMandatory":true,"allowDelegation":false}
   ]' AS JSON), 'Active', CURRENT_DATE),
  ('wf-grn-001', 'GRN Approval', 'grn',
   'Default single-step GRN approval — Location Manager.', 'On Record Submission',
   CAST('[]' AS JSON),
   CAST('[
     {"stepNumber":1,"approverRole":"Location Manager","isMandatory":true,"allowDelegation":false}
   ]' AS JSON), 'Active', CURRENT_DATE),
  ('wf-payment-001', 'Payment Approval', 'payment',
   'Default 2-step payment approval — Finance Manager → CFO.', 'On Record Submission',
   CAST('[]' AS JSON),
   CAST('[
     {"stepNumber":1,"approverRole":"Finance Manager","isMandatory":true,"allowDelegation":false},
     {"stepNumber":2,"approverRole":"CFO","isMandatory":true,"allowDelegation":false}
   ]' AS JSON), 'Active', CURRENT_DATE),
  ('wf-vendor-advance-001', 'Vendor Advance Approval', 'vendor_advance',
   'Default 2-step vendor advance approval — Finance Manager → HOD.', 'On Record Submission',
   CAST('[]' AS JSON),
   CAST('[
     {"stepNumber":1,"approverRole":"Finance Manager","isMandatory":true,"allowDelegation":false},
     {"stepNumber":2,"approverRole":"HOD","isMandatory":true,"allowDelegation":false}
   ]' AS JSON), 'Active', CURRENT_DATE),
  ('wf-debit-note-001', 'Debit Note Approval', 'debit_note',
   'Default single-step debit note approval — Finance Manager.', 'On Record Submission',
   CAST('[]' AS JSON),
   CAST('[
     {"stepNumber":1,"approverRole":"Finance Manager","isMandatory":true,"allowDelegation":false}
   ]' AS JSON), 'Active', CURRENT_DATE),
  ('wf-master-update-001', 'Master Update Approval', 'master_update',
   'Default single-step master change approval — Admin.', 'On Record Submission',
   CAST('[]' AS JSON),
   CAST('[
     {"stepNumber":1,"approverRole":"Admin","isMandatory":true,"allowDelegation":false}
   ]' AS JSON), 'Active', CURRENT_DATE);
