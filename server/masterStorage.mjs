export const MASTER_STORAGE = {
  category_master: { database: 'category_master', table: 'category_master', auditTable: 'category_master_audit', legacyTable: 'erp_master_categories' },
  color_master: { database: 'color_master', table: 'color_master', auditTable: 'color_master_audit', legacyTable: 'erp_master_colors' },
  country_master: { database: 'country_master', table: 'country_master', auditTable: 'country_master_audit', legacyTable: 'erp_master_countries' },
  state_master: { database: 'state_master', table: 'state_master', auditTable: 'state_master_audit', legacyTable: 'erp_master_states' },
  department_master: { database: 'department_master', table: 'department_master', auditTable: 'department_master_audit', legacyTable: 'erp_master_departments' },
  tax_code_master: { database: 'tax_code_master', table: 'tax_code_master', auditTable: 'tax_code_master_audit', legacyTable: 'erp_master_tax_codes' },
  size_master: { database: 'size_master', table: 'size_master', auditTable: 'size_master_audit', legacyTable: 'erp_master_sizes' },
  item_category_master: { database: 'item_category_master', table: 'item_category_master', auditTable: 'item_category_master_audit', legacyTable: 'erp_master_item_categories' },
  vendor_payment_terms_master: { database: 'vendor_payment_terms_master', table: 'vendor_payment_terms_master', auditTable: 'vendor_payment_terms_master_audit', legacyTable: 'erp_master_vendor_payment_terms' },
  product_master: { database: 'product_master', table: 'product_master', auditTable: 'product_master_audit', legacyTable: 'erp_master_products' },
  sku_master: { database: 'sku_master', table: 'sku_master', auditTable: 'sku_master_audit', legacyTable: 'erp_master_skus' },
  uom_master: { database: 'uom_master', table: 'uom_master', auditTable: 'uom_master_audit', legacyTable: 'erp_master_uoms' },
  debit_note_reason_master: { database: 'debit_note_reason_master', table: 'debit_note_reason_master', auditTable: 'debit_note_reason_master_audit', legacyTable: 'erp_master_debit_note_reasons' },
  cost_centre_master: { database: 'cost_centre_master', table: 'cost_centre_master', auditTable: 'cost_centre_master_audit', legacyTable: 'erp_master_cost_centres' },
  profit_centre_master: { database: 'profit_centre_master', table: 'profit_centre_master', auditTable: 'profit_centre_master_audit', legacyTable: 'erp_master_profit_centres' },
  employee_master: { database: 'employee_master', table: 'employee_master', auditTable: 'employee_master_audit', legacyTable: 'erp_master_employees' },
  contract_master: { database: 'contract_master', table: 'contract_master', auditTable: 'contract_master_audit', legacyTable: 'erp_master_contracts' },
  roles_master: { database: 'roles_master', table: 'roles_master', auditTable: 'roles_master_audit', legacyTable: 'erp_master_roles' },
  user_master: { database: 'user_master', table: 'user_master', auditTable: 'user_master_audit', legacyTable: 'erp_master_users' },
  currency_master: { database: 'currency_master', table: 'currency_master', auditTable: 'currency_master_audit', legacyTable: 'erp_master_currencies' },
  entity_master: { database: 'entity_master', table: 'entity_master', auditTable: 'entity_master_audit', legacyTable: 'erp_master_entities' },
  exchange_rate_master: { database: 'exchange_rate_master', table: 'exchange_rate_master', auditTable: 'exchange_rate_master_audit', legacyTable: 'erp_master_exchange_rates' },
  vendor_master: { database: 'vendor_master', table: 'vendor_master', auditTable: 'vendor_master_audit', legacyTable: 'erp_master_vendors' },
  account_code_master: { database: 'account_code_master', table: 'account_code_master', auditTable: 'account_code_master_audit', legacyTable: 'erp_master_account_codes' },
  bank_master: { database: 'bank_master', table: 'bank_master', auditTable: 'bank_master_audit', legacyTable: 'erp_master_banks' },
  item_master: { database: 'item_master', table: 'item_master', auditTable: 'item_master_audit', legacyTable: 'item_master' },
};

export function getMasterStorage(masterKey) {
  return MASTER_STORAGE[masterKey] ?? null;
}

export function getQualifiedTableName(masterKey) {
  const storage = getMasterStorage(masterKey);
  if (!storage) {
    return null;
  }

  return `\`${storage.database}\`.\`${storage.table}\``;
}

export function getQualifiedAuditTableName(masterKey) {
  const storage = getMasterStorage(masterKey);
  if (!storage) {
    return null;
  }

  return `\`${storage.database}\`.\`${storage.auditTable}\``;
}

export function getGenericMasterKeys() {
  return Object.keys(MASTER_STORAGE).filter((masterKey) => masterKey !== 'item_master');
}
