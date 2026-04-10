import mysql from 'mysql2/promise';
import { MASTER_STORAGE, getGenericMasterKeys } from '../server/masterStorage.mjs';

function connectionConfig() {
  return {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
  };
}

function genericMasterTableSql(database, table) {
  return `
    CREATE TABLE IF NOT EXISTS \`${database}\`.\`${table}\` (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      record_code VARCHAR(191) NULL,
      record_name VARCHAR(255) NULL,
      status VARCHAR(50) NULL,
      approval_status VARCHAR(50) NULL,
      payload JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_${table}_updated_at (updated_at)
    )
  `;
}

function genericAuditTableSql(database, auditTable) {
  return `
    CREATE TABLE IF NOT EXISTS \`${database}\`.\`${auditTable}\` (
      id CHAR(36) NOT NULL PRIMARY KEY,
      record_id VARCHAR(191) NOT NULL,
      action_type VARCHAR(20) NOT NULL,
      old_values JSON NULL,
      new_values JSON NULL,
      changed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      KEY idx_${auditTable}_lookup (record_id, changed_at)
    )
  `;
}

function itemTableSql(database, table) {
  return `
    CREATE TABLE IF NOT EXISTS \`${database}\`.\`${table}\` (
      id CHAR(36) NOT NULL PRIMARY KEY,
      item_code VARCHAR(100) NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      item_alias VARCHAR(255) NULL,
      item_status VARCHAR(50) NOT NULL DEFAULT 'Active',
      item_description TEXT NULL,
      uom VARCHAR(100) NULL,
      item_group_master VARCHAR(255) NULL,
      procurement_category VARCHAR(255) NULL,
      entity_name VARCHAR(255) NULL,
      expenditure_type VARCHAR(255) NULL,
      gl_account_code VARCHAR(100) NULL,
      gl_account_description VARCHAR(255) NULL,
      nature VARCHAR(100) NULL,
      rcm_applicable VARCHAR(50) NULL,
      hsn_code VARCHAR(100) NULL,
      sac_code VARCHAR(100) NULL,
      gst_rate VARCHAR(50) NULL,
      default_itc_eligibility VARCHAR(100) NULL,
      po_required VARCHAR(50) NULL,
      reorder_level VARCHAR(100) NULL,
      max_order_qty VARCHAR(100) NULL,
      approval_status VARCHAR(50) NOT NULL DEFAULT 'Draft',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_${table}_item_code (item_code)
    )
  `;
}

async function ensureDatabaseAndTables(pool, masterKey) {
  const storage = MASTER_STORAGE[masterKey];
  await pool.query(`CREATE DATABASE IF NOT EXISTS \`${storage.database}\``);

  if (masterKey === 'item_master') {
    await pool.query(itemTableSql(storage.database, storage.table));
  } else {
    await pool.query(genericMasterTableSql(storage.database, storage.table));
  }

  await pool.query(genericAuditTableSql(storage.database, storage.auditTable));
  await pool.query(
    `ALTER TABLE \`${storage.database}\`.\`${storage.auditTable}\` MODIFY COLUMN changed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`
  );
}

async function migrateGenericMaster(pool, masterKey) {
  const storage = MASTER_STORAGE[masterKey];
  const [rows] = await pool.query(
    `SELECT id, record_code, record_name, status, approval_status, payload, created_at, updated_at FROM \`${process.env.MYSQL_DATABASE}\`.\`${storage.legacyTable}\``,
  );

  for (const row of rows) {
    await pool.query(
      `
        INSERT INTO \`${storage.database}\`.\`${storage.table}\`
          (id, record_code, record_name, status, approval_status, payload, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)
        ON DUPLICATE KEY UPDATE
          record_code = VALUES(record_code),
          record_name = VALUES(record_name),
          status = VALUES(status),
          approval_status = VALUES(approval_status),
          payload = VALUES(payload),
          updated_at = VALUES(updated_at)
      `,
      [
        row.id,
        row.record_code,
        row.record_name,
        row.status,
        row.approval_status,
        typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
        row.created_at,
        row.updated_at,
      ],
    );
  }

  const [auditRows] = await pool.query(
    `SELECT id, master_record_id, action_type, old_values, new_values, created_at FROM \`${process.env.MYSQL_DATABASE}\`.master_record_versions WHERE master_key = ?`,
    [masterKey],
  );

  for (const row of auditRows) {
    await pool.query(
      `
        INSERT INTO \`${storage.database}\`.\`${storage.auditTable}\`
          (id, record_id, action_type, old_values, new_values, changed_at)
        VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?)
        ON DUPLICATE KEY UPDATE
          action_type = VALUES(action_type),
          old_values = VALUES(old_values),
          new_values = VALUES(new_values),
          changed_at = VALUES(changed_at)
      `,
      [
        row.id,
        row.master_record_id,
        row.action_type,
        typeof row.old_values === 'string' ? row.old_values : JSON.stringify(row.old_values ?? {}),
        typeof row.new_values === 'string' ? row.new_values : JSON.stringify(row.new_values ?? {}),
        row.created_at,
      ],
    );
  }

  return { rows: rows.length, auditRows: auditRows.length };
}

async function migrateItemMaster(pool) {
  const storage = MASTER_STORAGE.item_master;
  const [rows] = await pool.query(
    `SELECT * FROM \`${process.env.MYSQL_DATABASE}\`.\`${storage.legacyTable}\``,
  );

  for (const row of rows) {
    await pool.query(
      `
        INSERT INTO \`${storage.database}\`.\`${storage.table}\` (
          id, item_code, item_name, item_alias, item_status, item_description, uom,
          item_group_master, procurement_category, entity_name, expenditure_type,
          gl_account_code, gl_account_description, nature, rcm_applicable, hsn_code,
          sac_code, gst_rate, default_itc_eligibility, po_required, reorder_level,
          max_order_qty, approval_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          item_code = VALUES(item_code),
          item_name = VALUES(item_name),
          item_alias = VALUES(item_alias),
          item_status = VALUES(item_status),
          item_description = VALUES(item_description),
          uom = VALUES(uom),
          item_group_master = VALUES(item_group_master),
          procurement_category = VALUES(procurement_category),
          entity_name = VALUES(entity_name),
          expenditure_type = VALUES(expenditure_type),
          gl_account_code = VALUES(gl_account_code),
          gl_account_description = VALUES(gl_account_description),
          nature = VALUES(nature),
          rcm_applicable = VALUES(rcm_applicable),
          hsn_code = VALUES(hsn_code),
          sac_code = VALUES(sac_code),
          gst_rate = VALUES(gst_rate),
          default_itc_eligibility = VALUES(default_itc_eligibility),
          po_required = VALUES(po_required),
          reorder_level = VALUES(reorder_level),
          max_order_qty = VALUES(max_order_qty),
          approval_status = VALUES(approval_status),
          updated_at = VALUES(updated_at)
      `,
      [
        row.id,
        row.item_code,
        row.item_name,
        row.item_alias,
        row.item_status,
        row.item_description,
        row.uom,
        row.item_group_master,
        row.procurement_category,
        row.entity_name,
        row.expenditure_type,
        row.gl_account_code,
        row.gl_account_description,
        row.nature,
        row.rcm_applicable,
        row.hsn_code,
        row.sac_code,
        row.gst_rate,
        row.default_itc_eligibility,
        row.po_required,
        row.reorder_level,
        row.max_order_qty,
        row.approval_status,
        row.created_at,
        row.updated_at,
      ],
    );
  }

  return { rows: rows.length, auditRows: 0 };
}

async function main() {
  const pool = await mysql.createPool(connectionConfig());
  const summary = {};

  for (const masterKey of Object.keys(MASTER_STORAGE)) {
    await ensureDatabaseAndTables(pool, masterKey);
    summary[masterKey] =
      masterKey === 'item_master'
        ? await migrateItemMaster(pool)
        : await migrateGenericMaster(pool, masterKey);
  }

  await pool.end();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
