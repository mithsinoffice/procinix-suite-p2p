/**
 * Runs sql/mysql/migrations/20260424_ws1a_2b_alters_on_existing_tables.sql
 * against Azure MySQL.
 *
 * 2b is additive-only: 75 ALTER TABLE ADD COLUMN + 10 CREATE INDEX statements,
 * each guarded by information_schema existence checks wrapped in PREPARE/EXECUTE.
 * Safe to re-run (skips existing columns/indexes).
 *
 * Usage (same env as API server):
 *   node --env-file=.env.mysql.local server/scripts/runWs1aMigration2b.mjs
 *
 * Dry run (connects + runs pre-flight, but skips SQL execution):
 *   MIGRATE_DRY_RUN=1 node --env-file=.env.mysql.local server/scripts/runWs1aMigration2b.mjs
 */

import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = join(
  __dirname,
  '../../sql/mysql/migrations/20260424_ws1a_2b_alters_on_existing_tables.sql'
);

// --- Expected post-2b surface: 75 columns across 8 tables ---
const EXPECTED_COLUMNS = [
  // 1. vendors (1)
  { table: 'vendors', column: 'client_erp_vendor_code' },

  // 2. vendor_pan_compliance — lower TDS cert (3)
  { table: 'vendor_pan_compliance', column: 'lower_tds_cert_valid_from' },
  { table: 'vendor_pan_compliance', column: 'lower_tds_cert_valid_to' },
  { table: 'vendor_pan_compliance', column: 'lower_tds_cert_rate' },

  // 3. vendor_pan_compliance — KYC source-tracking (12)
  { table: 'vendor_pan_compliance', column: 'pan_verification_source' },
  { table: 'vendor_pan_compliance', column: 'pan_verified_at' },
  { table: 'vendor_pan_compliance', column: 'pan_verification_reference' },
  { table: 'vendor_pan_compliance', column: 'msme_verification_source' },
  { table: 'vendor_pan_compliance', column: 'msme_verified_at' },
  { table: 'vendor_pan_compliance', column: 'msme_verification_reference' },
  { table: 'vendor_pan_compliance', column: 'cin_verification_source' },
  { table: 'vendor_pan_compliance', column: 'cin_verified_at' },
  { table: 'vendor_pan_compliance', column: 'cin_verification_reference' },
  { table: 'vendor_pan_compliance', column: 'section_206ab_verification_source' },
  { table: 'vendor_pan_compliance', column: 'section_206ab_verified_at' },
  { table: 'vendor_pan_compliance', column: 'section_206ab_verification_reference' },

  // 4. vendor_gst_registrations (4)
  { table: 'vendor_gst_registrations', column: 'verification_source' },
  { table: 'vendor_gst_registrations', column: 'verified_at' },
  { table: 'vendor_gst_registrations', column: 'verification_reference' },
  { table: 'vendor_gst_registrations', column: 'verification_raw_response' },

  // 5. vendor_bank_accounts (4)
  { table: 'vendor_bank_accounts', column: 'verification_source' },
  { table: 'vendor_bank_accounts', column: 'verified_at' },
  { table: 'vendor_bank_accounts', column: 'verification_reference' },
  { table: 'vendor_bank_accounts', column: 'verification_raw_response' },

  // 6. vendor_entity_mappings (3)
  { table: 'vendor_entity_mappings', column: 'credit_days' },
  { table: 'vendor_entity_mappings', column: 'credit_limit' },
  { table: 'vendor_entity_mappings', column: 'default_tds_section_override' },

  // 7. invoices — lifecycle + audit (12)
  { table: 'invoices', column: 'lifecycle_state' },
  { table: 'invoices', column: 'financial_year' },
  { table: 'invoices', column: 'service_period_from' },
  { table: 'invoices', column: 'service_period_to' },
  { table: 'invoices', column: 'resubmission_count' },
  { table: 'invoices', column: 'source_invoice_id' },
  { table: 'invoices', column: 'rejection_reason_code' },
  { table: 'invoices', column: 'rejection_reason_note' },
  { table: 'invoices', column: 'vendor_id' },
  { table: 'invoices', column: 'vendor_id_match_confidence' },
  { table: 'invoices', column: 'last_action' },
  { table: 'invoices', column: 'last_action_at' },

  // 8. invoices — expense voucher (6)
  { table: 'invoices', column: 'expense_voucher_status' },
  { table: 'invoices', column: 'expense_voucher_id' },
  { table: 'invoices', column: 'expense_voucher_posted_at' },
  { table: 'invoices', column: 'expense_voucher_error' },
  { table: 'invoices', column: 'expense_voucher_retry_count' },
  { table: 'invoices', column: 'expense_voucher_payload' },

  // 9. invoices — 3-way match (4)
  { table: 'invoices', column: 'match_result' },
  { table: 'invoices', column: 'match_score' },
  { table: 'invoices', column: 'match_details' },
  { table: 'invoices', column: 'match_computed_at' },

  // 10. invoices — duplicate detection (5)
  { table: 'invoices', column: 'duplicate_decision' },
  { table: 'invoices', column: 'duplicate_checked_at' },
  { table: 'invoices', column: 'duplicate_override_by' },
  { table: 'invoices', column: 'duplicate_override_at' },
  { table: 'invoices', column: 'duplicate_override_reason' },

  // 11. invoices — GST (6)
  { table: 'invoices', column: 'supplier_gstin' },
  { table: 'invoices', column: 'recipient_gstin' },
  { table: 'invoices', column: 'place_of_supply' },
  { table: 'invoices', column: 'gst_invoice_type' },
  { table: 'invoices', column: 'itc_eligible' },
  { table: 'invoices', column: 'itc_ineligible_reason' },

  // 12. invoice_line_items — TDS (7)
  { table: 'invoice_line_items', column: 'tds_applicable' },
  { table: 'invoice_line_items', column: 'tds_section' },
  { table: 'invoice_line_items', column: 'tds_rate' },
  { table: 'invoice_line_items', column: 'tds_base_amount' },
  { table: 'invoice_line_items', column: 'tds_amount' },
  { table: 'invoice_line_items', column: 'tds_threshold_exempted' },
  { table: 'invoice_line_items', column: 'tds_certificate_ref' },

  // 13. invoice_line_items — GST (8)
  { table: 'invoice_line_items', column: 'taxable_amount' },
  { table: 'invoice_line_items', column: 'cgst_amount' },
  { table: 'invoice_line_items', column: 'sgst_amount' },
  { table: 'invoice_line_items', column: 'igst_amount' },
  { table: 'invoice_line_items', column: 'utgst_amount' },
  { table: 'invoice_line_items', column: 'cess_rate' },
  { table: 'invoice_line_items', column: 'cess_amount' },
  { table: 'invoice_line_items', column: 'gst_ocr_discrepancy' },
];

// --- Expected post-2b indexes: 10 across 2 tables ---
const EXPECTED_INDEXES = [
  { table: 'invoices', index: 'idx_financial_year' },
  { table: 'invoices', index: 'idx_service_period' },
  { table: 'invoices', index: 'idx_last_action_at' },
  { table: 'invoices', index: 'idx_invoices_vendor_id' },
  { table: 'invoices', index: 'idx_source_invoice_id' },
  { table: 'invoices', index: 'idx_supplier_gstin' },
  { table: 'invoices', index: 'idx_place_of_supply' },
  { table: 'invoices', index: 'idx_lifecycle_state' },
  { table: 'invoices', index: 'idx_duplicate_decision' },
  { table: 'invoice_line_items', index: 'idx_tds_section' },
];

function buildSslConfig() {
  const sslMode = (process.env.MYSQL_SSL_MODE ?? 'required').toLowerCase();
  if (sslMode === 'disabled' || sslMode === 'false' || sslMode === 'off') {
    return undefined;
  }
  const caPath = process.env.MYSQL_SSL_CA;
  if (caPath) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(caPath),
    };
  }
  return { rejectUnauthorized: true };
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

async function countExistingColumns(conn, dbName) {
  const touchedTables = Array.from(new Set(EXPECTED_COLUMNS.map((c) => c.table)));
  const [rows] = await conn.execute(
    `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${touchedTables.map(() => '?').join(',')})`,
    [dbName, ...touchedTables]
  );
  const existing = new Set(rows.map((r) => `${r.TABLE_NAME}.${r.COLUMN_NAME}`));
  return EXPECTED_COLUMNS.map((c) => ({
    ...c,
    exists: existing.has(`${c.table}.${c.column}`),
  }));
}

async function countExistingIndexes(conn, dbName) {
  const touchedTables = Array.from(new Set(EXPECTED_INDEXES.map((i) => i.table)));
  const [rows] = await conn.execute(
    `SELECT DISTINCT TABLE_NAME, INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${touchedTables.map(() => '?').join(',')})`,
    [dbName, ...touchedTables]
  );
  const existing = new Set(rows.map((r) => `${r.TABLE_NAME}.${r.INDEX_NAME}`));
  return EXPECTED_INDEXES.map((i) => ({
    ...i,
    exists: existing.has(`${i.table}.${i.index}`),
  }));
}

function summarizeColumns(results, label) {
  const total = results.length;
  const present = results.filter((r) => r.exists).length;
  console.log(`\n${label}: ${present} of ${total} new columns exist.`);

  const byTable = new Map();
  for (const r of results) {
    if (!byTable.has(r.table)) byTable.set(r.table, { present: 0, total: 0, missing: [] });
    const bucket = byTable.get(r.table);
    bucket.total += 1;
    if (r.exists) bucket.present += 1;
    else bucket.missing.push(r.column);
  }

  const tablesWithMissing = [...byTable.entries()].filter(([, b]) => b.missing.length > 0);
  if (tablesWithMissing.length === 0) {
    console.log('  All expected columns present on all 8 tables.');
  } else {
    console.log('  Tables with missing columns:');
    for (const [table, b] of tablesWithMissing) {
      console.log(
        `    ${table}: ${b.present}/${b.total} present; missing: ${b.missing.join(', ')}`
      );
    }
  }
  return { present, total };
}

function summarizeIndexes(results, label) {
  const total = results.length;
  const present = results.filter((r) => r.exists).length;
  console.log(`\n${label}: ${present} of ${total} indexes exist.`);
  const missing = results.filter((r) => !r.exists);
  if (missing.length > 0) {
    console.log('  Missing:');
    for (const m of missing) {
      console.log(`    ${m.table}.${m.index}`);
    }
  }
  return { present, total };
}

async function main() {
  console.log('--- WS-1a chunk 2b: ALTER TABLE additions (75 columns + 10 indexes) ---\n');
  console.log('SQL file:', MIGRATION_SQL);

  const sql = await readFile(MIGRATION_SQL, 'utf8');
  const dbName = requireEnv('MYSQL_DATABASE');

  let conn;
  try {
    conn = await mysql.createConnection({
      host: requireEnv('MYSQL_HOST'),
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: requireEnv('MYSQL_USER'),
      password: requireEnv('MYSQL_PASSWORD'),
      database: dbName,
      ssl: buildSslConfig(),
      multipleStatements: true,
    });

    // --- Pre-flight ---
    console.log(`\nPre-flight check against ${dbName}:`);
    const preCols = await countExistingColumns(conn, dbName);
    const preIdx = await countExistingIndexes(conn, dbName);
    const preColSummary = summarizeColumns(preCols, 'Pre-flight columns');
    const preIdxSummary = summarizeIndexes(preIdx, 'Pre-flight indexes');

    if (
      preColSummary.present === preColSummary.total &&
      preIdxSummary.present === preIdxSummary.total
    ) {
      console.log('\nAll columns and indexes already exist — 2b will be a pure no-op re-run.');
    } else if (preColSummary.present === 0 && preIdxSummary.present === 0) {
      console.log('\nNo 2b columns or indexes present — fresh run.');
    } else {
      console.log('\nPartial state detected — 2b will add only the missing columns/indexes.');
    }

    if (process.env.MIGRATE_DRY_RUN === '1') {
      console.log('\nMIGRATE_DRY_RUN=1 — skipping SQL execution.');
      return;
    }

    // --- Execute ---
    await conn.query(sql);
    console.log('\n2b migration SQL batch: OK (no driver error).');

    // --- Post-run verification ---
    console.log('\n--- Post-2b verification ---');
    const postCols = await countExistingColumns(conn, dbName);
    const postIdx = await countExistingIndexes(conn, dbName);
    const postColSummary = summarizeColumns(postCols, 'Post-run columns');
    const postIdxSummary = summarizeIndexes(postIdx, 'Post-run indexes');

    const colOk = postColSummary.present === postColSummary.total;
    const idxOk = postIdxSummary.present === postIdxSummary.total;
    if (colOk && idxOk) {
      console.log('\nAll 75 columns and 10 indexes present. 2b verified.');
    } else {
      console.log(
        `\nVerification FAILED: columns ${postColSummary.present}/${postColSummary.total}, indexes ${postIdxSummary.present}/${postIdxSummary.total}.`
      );
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('\n2b migration error:', err.message || err);
    process.exitCode = 1;
    throw err;
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

main().catch(() => process.exit(1));
