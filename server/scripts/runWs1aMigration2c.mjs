/**
 * Runs sql/mysql/migrations/20260424_ws1a_2c_new_tables.sql against Azure MySQL.
 *
 * 2c creates 10 new WS-1a tables (all empty at creation time). Each statement
 * uses CREATE TABLE IF NOT EXISTS, so the batch is idempotent — safe to re-run.
 *
 * Usage (same env as API server):
 *   node --env-file=.env.mysql.local server/scripts/runWs1aMigration2c.mjs
 *
 * Dry run (connects + runs pre-flight, but skips SQL execution):
 *   MIGRATE_DRY_RUN=1 node --env-file=.env.mysql.local server/scripts/runWs1aMigration2c.mjs
 */

import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = join(__dirname, '../../sql/mysql/migrations/20260424_ws1a_2c_new_tables.sql');

// --- Expected post-2c surface: 10 new tables ---
const NEW_TABLES = [
  'invoice_audit_log',
  'payments',
  'invoice_rejection_reasons',
  'invoice_duplicate_config',
  'tds_section_config',
  'gst_validation_config',
  'kyc_provider_config',
  'kyc_check_config',
  'tds_ytd_aggregates',
  'vendor_opening_balances',
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

async function countExistingTables(conn, dbName) {
  const [rows] = await conn.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${NEW_TABLES.map(() => '?').join(',')})`,
    [dbName, ...NEW_TABLES]
  );
  const existing = new Set(rows.map((r) => r.TABLE_NAME));
  return NEW_TABLES.map((t) => ({ table: t, exists: existing.has(t) }));
}

function summarizeTables(results, label) {
  const total = results.length;
  const present = results.filter((r) => r.exists).length;
  console.log(`\n${label}: ${present} of ${total} new tables exist.`);
  for (const r of results) {
    console.log(`  ${r.table}: ${r.exists ? 'EXISTS' : 'MISSING'}`);
  }
  return { present, total };
}

async function main() {
  console.log('--- WS-1a chunk 2c: 10 new tables (CREATE TABLE IF NOT EXISTS) ---\n');
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
    const pre = await countExistingTables(conn, dbName);
    const preSummary = summarizeTables(pre, 'Pre-flight tables');

    if (preSummary.present === preSummary.total) {
      console.log('\nAll 10 new tables already exist — 2c will be a pure no-op re-run.');
    } else if (preSummary.present === 0) {
      console.log('\nNo 2c tables present — fresh run.');
    } else {
      console.log('\nPartial state detected — 2c will CREATE only the missing tables.');
    }

    if (process.env.MIGRATE_DRY_RUN === '1') {
      console.log('\nMIGRATE_DRY_RUN=1 — skipping SQL execution.');
      return;
    }

    // --- Execute ---
    await conn.query(sql);
    console.log('\n2c migration SQL batch: OK (no driver error).');

    // --- Post-run verification ---
    console.log('\n--- Post-2c verification ---');
    const post = await countExistingTables(conn, dbName);
    const postSummary = summarizeTables(post, 'Post-run tables');

    if (postSummary.present === postSummary.total) {
      console.log('\nAll 10 new tables present. 2c verified.');
    } else {
      const missing = post.filter((r) => !r.exists).map((r) => r.table);
      console.log(
        `\nVerification FAILED: tables ${postSummary.present}/${postSummary.total}. Missing: ${missing.join(', ')}.`
      );
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('\n2c migration error:', err.message || err);
    process.exitCode = 1;
    throw err;
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

main().catch(() => process.exit(1));
