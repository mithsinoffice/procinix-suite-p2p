/**
 * Runs sql/mysql/migrations/20260424_ws1a_2a_baseline_schema.sql against Azure MySQL.
 *
 * 2a is the baseline drift-fill: 12 CREATE TABLE IF NOT EXISTS statements
 * reproducing the current Azure schema. On Azure (tables already exist),
 * every statement is a no-op. On a fresh DB, it creates all 12 tables.
 *
 * Usage (same env as API server):
 *   node --env-file=.env.mysql.local server/scripts/runWs1aMigration2a.mjs
 *
 * Dry run (no DB connection — lists scope only):
 *   MIGRATE_DRY_RUN=1 node server/scripts/runWs1aMigration2a.mjs
 */

import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = join(
  __dirname,
  '../../sql/mysql/migrations/20260424_ws1a_2a_baseline_schema.sql'
);

const BASELINE_TABLES = [
  'vendors',
  'vendor_spocs',
  'vendor_pan_compliance',
  'vendor_gst_registrations',
  'vendor_bank_accounts',
  'vendor_entity_mappings',
  'invoices',
  'invoice_line_items',
  'invoice_exceptions',
  'purchase_orders',
  'approvals',
  'domain_documents',
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

async function main() {
  console.log('--- WS-1a chunk 2a: baseline CREATE TABLE IF NOT EXISTS ---\n');
  console.log('Tables (12):', BASELINE_TABLES.join(', '));
  console.log('\nSQL file:', MIGRATION_SQL);

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

    // --- Pre-flight: check which tables already exist ---
    const [existingRows] = await conn.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${BASELINE_TABLES.map(() => '?').join(',')})`,
      [dbName, ...BASELINE_TABLES]
    );
    const existingSet = new Set(existingRows.map((r) => r.TABLE_NAME));
    const missing = BASELINE_TABLES.filter((t) => !existingSet.has(t));

    console.log(`\nPre-flight check against ${dbName}:`);
    for (const table of BASELINE_TABLES) {
      console.log(`  ${table}: ${existingSet.has(table) ? 'EXISTS' : 'MISSING'}`);
    }
    if (missing.length === 0) {
      console.log(
        `\nSummary: ${BASELINE_TABLES.length}/${BASELINE_TABLES.length} tables already exist — SQL batch will be pure no-op.`
      );
    } else {
      console.log(
        `\nSummary: ${existingSet.size}/${BASELINE_TABLES.length} tables exist. Will CREATE: ${missing.join(', ')}.`
      );
    }

    if (process.env.MIGRATE_DRY_RUN === '1') {
      console.log('\nMIGRATE_DRY_RUN=1 — skipping SQL execution.');
      return;
    }

    await conn.query(sql);
    console.log('\n2a migration SQL batch: OK (no driver error).');

    console.log('\n--- Row counts (post-2a snapshot) ---');
    for (const table of BASELINE_TABLES) {
      try {
        const [rows] = await conn.execute(`SELECT COUNT(*) AS n FROM \`${table}\``);
        console.log(`  ${table}: ${rows[0].n}`);
      } catch (err) {
        console.log(`  ${table}: ERROR — ${err.message}`);
      }
    }
  } catch (err) {
    console.error('\n2a migration error:', err.message || err);
    process.exitCode = 1;
    throw err;
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

main().catch(() => process.exit(1));
