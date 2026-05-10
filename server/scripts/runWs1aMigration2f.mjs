/**
 * Runs sql/mysql/migrations/20260424_ws1a_2f_tenants_turnover.sql against Azure MySQL.
 *
 * Adds prior_fy_turnover DECIMAL(18,2) NULL to tenants table for the
 * 194Q buyer turnover gate in the TDS deduction engine.
 *
 * Usage (same env as API server):
 *   node --env-file=.env.mysql.local server/scripts/runWs1aMigration2f.mjs
 *
 * Dry run (connects for pre-flight but skips SQL execution):
 *   MIGRATE_DRY_RUN=1 node --env-file=.env.mysql.local server/scripts/runWs1aMigration2f.mjs
 */

import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = join(
  __dirname,
  '../../sql/mysql/migrations/20260424_ws1a_2f_tenants_turnover.sql'
);

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
  console.log('--- WS-1a chunk 2f: tenants.prior_fy_turnover for 194Q gate ---\n');
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

    // --- Pre-flight: check if column already exists ---
    const [existingCols] = await conn.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'prior_fy_turnover'`,
      [dbName]
    );
    const exists = existingCols.length > 0;

    console.log(`\nPre-flight check against ${dbName}:`);
    console.log(`  tenants.prior_fy_turnover: ${exists ? 'EXISTS' : 'MISSING'}`);

    if (exists) {
      console.log('\nSummary: column already exists — SQL batch will be pure no-op.');
    } else {
      console.log(
        '\nSummary: column missing. Will ADD COLUMN prior_fy_turnover DECIMAL(18,2) NULL.'
      );
    }

    if (process.env.MIGRATE_DRY_RUN === '1') {
      console.log('\nMIGRATE_DRY_RUN=1 — skipping SQL execution.');
      return;
    }

    await conn.query(sql);
    console.log('\n2f migration SQL batch: OK (no driver error).');

    // --- Post-verification ---
    const [postCheck] = await conn.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'prior_fy_turnover'`,
      [dbName]
    );

    if (postCheck.length > 0) {
      const col = postCheck[0];
      console.log(`\nPost-verification: tenants.prior_fy_turnover`);
      console.log(`  data_type: ${col.DATA_TYPE}`);
      console.log(`  nullable: ${col.IS_NULLABLE}`);
      console.log(`  comment: ${col.COLUMN_COMMENT}`);
    } else {
      console.error('\nPost-verification FAILED: column not found after migration.');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('\n2f migration error:', err.message || err);
    process.exitCode = 1;
    throw err;
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

main().catch(() => process.exit(1));
