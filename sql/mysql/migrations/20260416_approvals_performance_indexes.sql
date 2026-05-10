-- Approvals read-path performance indexes

CREATE INDEX idx_approvals_queue
  ON approvals (status, assigned_to, module, approval_priority, created_at, id);

CREATE INDEX idx_approvals_module_ref_status
  ON approvals (module, reference_id, status);

CREATE INDEX idx_approvals_status_created
  ON approvals (status, created_at);

CREATE INDEX idx_invoices_status_entity_created
  ON invoices (status, entity_id, created_at, id);

CREATE INDEX idx_purchase_orders_status_entity_created
  ON purchase_orders (status, entity_id, created_at, id);

CREATE INDEX idx_vendors_legal_name_updated
  ON vendors (vendor_legal_name, updated_at, id);

CREATE INDEX idx_vendors_trade_name_updated
  ON vendors (vendor_trade_name, updated_at, id);

CREATE INDEX idx_vendor_pan_compliance_vendor_msme
  ON vendor_pan_compliance (vendor_id, msme_category);
