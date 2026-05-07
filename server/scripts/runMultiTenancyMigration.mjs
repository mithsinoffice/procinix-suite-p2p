/**
 * Runs sql/mysql/migrations/20260421_multi_tenant_entity.sql against Azure MySQL.
 *
 * Usage (same env as API server):
 *   node --env-file=.env.mysql.local server/scripts/runMultiTenancyMigration.mjs
 *
 * Dry run (no DB connection — lists scope only):
 *   MIGRATE_DRY_RUN=1 node server/scripts/runMultiTenancyMigration.mjs
 */

import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = join(
  __dirname,
  '../../sql/mysql/migrations/20260421_multi_tenant_entity.sql'
);

const ALTERED_OR_NEW = [
  'tenants (new)',
  'entities (new)',
  'user_entity_access (new)',
  'tenant_registry (new)',
  '`user_master`.`user_master`',
  '`item_master`.`item_master`',
  'vendors',
  'purchase_orders',
  'invoices',
];

const SKIPPED = [
  'users (not in schema — use `user_master`.`user_master`)',
  'grn (no table in this codebase)',
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

async function countRows(conn, sql) {
  const [rows] = await conn.execute(sql);
  if (!rows || !rows[0]) return null;
  return rows[0];
}

async function main() {
  console.log('--- Multi-tenant / multi-entity migration ---\n');
  console.log('Altered or new tables:', ALTERED_OR_NEW.join(', '));
  console.log('\nSkipped (vs pasted spec):', SKIPPED.join('; '));
  console.log('\nSQL file:', MIGRATION_SQL);

  if (process.env.MIGRATE_DRY_RUN === '1') {
    console.log(
      '\nMIGRATE_DRY_RUN=1 — not connecting. Backward compatible: additive DDL/DML only, no DROP.'
    );
    return;
  }

  const sql = await readFile(MIGRATION_SQL, 'utf8');

  let conn;
  try {
    conn = await mysql.createConnection({
      host: requireEnv('MYSQL_HOST'),
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: requireEnv('MYSQL_USER'),
      password: requireEnv('MYSQL_PASSWORD'),
      database: requireEnv('MYSQL_DATABASE'),
      ssl: buildSslConfig(),
      multipleStatements: true,
    });

    await conn.query(sql);
    console.log('\nMigration SQL batch: OK (no driver error).');

    const reports = [];

    reports.push(
      await countRows(
        conn,
        "SELECT COUNT(*) AS n FROM `user_master`.`user_master` WHERE tenant_id = 'tenant-default-001'"
      )
    );
    reports.push(
      await countRows(
        conn,
        "SELECT COUNT(*) AS n FROM `item_master`.`item_master` WHERE tenant_id = 'tenant-default-001'"
      )
    );
    reports.push(
      await countRows(
        conn,
        `SELECT COUNT(*) AS n FROM vendors WHERE tenant_id = 'tenant-default-001'`
      )
    );
    reports.push(
      await countRows(
        conn,
        `SELECT COUNT(*) AS n FROM purchase_orders WHERE tenant_id = 'tenant-default-001'`
      )
    );
    reports.push(
      await countRows(
        conn,
        `SELECT COUNT(*) AS n FROM invoices WHERE tenant_id = 'tenant-default-001'`
      )
    );
    reports.push(await countRows(conn, 'SELECT COUNT(*) AS n FROM user_entity_access'));
    reports.push(await countRows(conn, 'SELECT COUNT(*) AS n FROM tenants'));
    reports.push(await countRows(conn, 'SELECT COUNT(*) AS n FROM entities'));

    console.log('\n--- Row counts (post-migration snapshot) ---');
    const labels = [
      'user_master rows with default tenant_id',
      'item_master rows with default tenant_id',
      'vendors rows with default tenant_id',
      'purchase_orders rows with default tenant_id',
      'invoices rows with default tenant_id',
      'user_entity_access rows',
      'tenants rows',
      'entities rows',
    ];
    labels.forEach((label, i) => {
      const row = reports[i];
      console.log(`  ${label}: ${row && 'n' in row ? row.n : 'n/a'}`);
    });

    console.log(
      '\nBackward compatible: existing columns unchanged; new columns nullable until app enforces filters.'
    );
    console.log('Default IDs: tenant_id=tenant-default-001, entity_id=entity-default-001');
  } catch (err) {
    console.error('\nMigration error:', err.message || err);
    process.exitCode = 1;
    throw err;
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

main().catch(() => process.exit(1));
