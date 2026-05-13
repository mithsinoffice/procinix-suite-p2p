/**
 * One-shot migration applier for the master-fix sprint (2026-05-10).
 * Reads connection from env (MYSQL_*), executes the listed .sql files in order,
 * splitting on semicolons that aren't inside string literals.
 *
 * Run via:
 *   node --env-file=.env.mysql.local server/scripts/applyAdHocMigrations.mjs
 *
 * Each statement is wrapped in try/catch so re-runs are idempotent. A statement
 * failing with a recognised "already exists / duplicate column" error logs but
 * does not abort.
 */
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

// One-shot list — only migrations that haven't been fully applied. Once they
// land, drop them from this list (or delete the script) since this repo lacks
// a proper schema_migrations runner (B5 in queue). Migrations are idempotent
// (CREATE TABLE IF NOT EXISTS / INSERT IGNORE / WHERE NOT EXISTS) so running
// them once more is safe but wasteful.
const MIGRATIONS = [
  // Sprint 2: debit notes relational tables.
  'sql/mysql/migrations/20260510_debit_notes.sql',
  // Item master seeds (25 generic mid-market items).
  'sql/mysql/migrations/20260510_item_master_seeds.sql',
  // Move ITM-PTPL-* uploads that landed in product_master → item_master.
  'sql/mysql/migrations/20260510_migrate_product_to_item_master.sql',
  // Add upload_source col + backfill ITM-PTPL approval + align vg audit.
  'sql/mysql/migrations/20260510_upload_source_and_audit_fix.sql',
  // 2026-05-11 item master v2: standard_price + item_type + tax_code_id +
  // expense_category_id columns; 13 new ITM-* rows that converge with the
  // kit + rate-contract codes. MUST run before the kit/rate-contract seeds
  // below since those reference item_master by item_code/item_id.
  'sql/mysql/migrations/20260511_item_master_v2.sql',
  // 2026-05-11 sprint: profit centre + kit bundle + employee masters.
  'sql/mysql/migrations/20260511_profit_centre_master.sql',
  'sql/mysql/migrations/20260511_kit_bundle_master.sql',
  'sql/mysql/migrations/20260511_employee_master.sql',
  // 2026-05-11 sprint 2: rate contract master (header + items).
  'sql/mysql/migrations/20260511_rate_contract_master.sql',
  // 2026-05-11 sprint 3: TDS sections (10 real Indian sections, replaces
  // 4 stale test rows), item_master data fix (rcm/nature/uom/gl backfill),
  // and vendor_pan_compliance seeds for every seeded vendor.
  'sql/mysql/migrations/20260511_tds_section_master_seeds.sql',
  'sql/mysql/migrations/20260511_item_master_data_fix.sql',
  'sql/mysql/migrations/20260511_vendor_pan_compliance_seeds.sql',
  // 2026-05-12 vendor seeds v2: brings V-* set to 20 realistic Indian vendors
  // with GSTIN + PAN + address + bank + SPOC + MSME flag. Upsert pattern keyed
  // on vendor_code + vendor_id, so re-runs enrich existing rows without dupes.
  'sql/mysql/migrations/20260512_vendor_seeds_v2.sql',
  // 2026-05-12 vendor_gst_registrations.is_primary column + backfill. Mirrors
  // the `is_primary` convention used by vendor_spocs / vendor_bank_accounts;
  // GST endpoints now JOIN on `is_primary=1` for canonical lookup.
  'sql/mysql/migrations/20260512_vendor_gst_is_primary.sql',
  // 2026-05-12 workflow engine v1: user_roles + workflow_field_registry +
  // notifications + approvals multi-step columns + default Active workflow
  // configurations seeded for every document type. See §6 of ARCHITECTURE.md.
  'sql/mysql/migrations/20260512_workflow_engine.sql',
  // 2026-05-12 TDS section master normalisation + vendor → tds_section
  // mapping. 10 canonical sections (194C/J/I-a/I-b/H/D/A/Q/206AA/206AB);
  // operational vendors get tds_section per vendor_type (service → 194J,
  // goods → 194Q); MSME vendors keep their existing section.
  'sql/mysql/migrations/20260512_tds_vendor_mapping.sql',
];

const IGNORABLE_ERRORS = new Set([
  'ER_DUP_KEYNAME',
  'ER_DUP_FIELDNAME',
  'ER_TABLE_EXISTS_ERROR',
  'ER_DB_CREATE_EXISTS',
  'ER_CANT_DROP_FIELD_OR_KEY',
]);

function splitStatements(sql) {
  // Naive splitter that ignores semicolons inside single-quoted strings and
  // line comments. SQL files in this repo don't use stored procedures so this
  // is sufficient.
  const stmts = [];
  let cur = '';
  let inSingle = false;
  let inLineComment = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (inLineComment) {
      cur += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (!inSingle && ch === '-' && next === '-') {
      inLineComment = true;
      cur += ch;
      continue;
    }
    if (ch === "'" && sql[i - 1] !== '\\') {
      inSingle = !inSingle;
    }
    if (ch === ';' && !inSingle) {
      const trimmed = cur.trim();
      if (trimmed) stmts.push(trimmed);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts;
}

async function run() {
  const ssl = process.env.MYSQL_SSL_MODE
    ? {
        rejectUnauthorized: false,
        ...(process.env.MYSQL_SSL_CA ? { ca: process.env.MYSQL_SSL_CA } : {}),
      }
    : undefined;
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl,
    multipleStatements: false,
  });

  try {
    for (const migPath of MIGRATIONS) {
      const fullPath = resolve(REPO_ROOT, migPath);
      const sql = await readFile(fullPath, 'utf8');
      const stmts = splitStatements(sql);
      console.log(`\n── ${migPath} (${stmts.length} statements)`);
      let ok = 0;
      let skipped = 0;
      for (let i = 0; i < stmts.length; i++) {
        const stmt = stmts[i];
        try {
          await conn.query(stmt);
          ok++;
        } catch (err) {
          if (IGNORABLE_ERRORS.has(err.code)) {
            skipped++;
            console.log(`  [skip] stmt ${i + 1}: ${err.code}`);
          } else {
            console.error(`  [fail] stmt ${i + 1}: ${err.code} — ${err.message}`);
            console.error(`         SQL: ${stmt.slice(0, 200)}`);
            throw err;
          }
        }
      }
      console.log(`  ✓ ${ok} applied, ${skipped} skipped`);
    }
    console.log('\n✓ all migrations applied');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('\n✗ migration failed:', err.message);
  process.exit(1);
});
