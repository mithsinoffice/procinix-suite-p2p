/**
 * Runs sql/mysql/migrations/20260424_ws1a_2d_seeds_and_backfills.sql against Azure MySQL.
 *
 * 2d seeds config tables and backfills invoice columns added by 2b.
 * Prerequisite: chunks 2a, 2b, 2c must have run first.
 *
 * Usage (same env as API server):
 *   node --env-file=.env.mysql.local server/scripts/runWs1aMigration2d.mjs
 *
 * Dry run (connects for pre-flight but skips SQL execution):
 *   MIGRATE_DRY_RUN=1 node --env-file=.env.mysql.local server/scripts/runWs1aMigration2d.mjs
 */

import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = join(
  __dirname,
  '../../sql/mysql/migrations/20260424_ws1a_2d_seeds_and_backfills.sql'
);

const SEED_TABLES = [
  { table: 'invoice_rejection_reasons', expected: 14 },
  { table: 'invoice_duplicate_config', expected: 2 },
  { table: 'gst_validation_config', expected: 2 },
  { table: 'kyc_provider_config', expected: 2 },
  { table: 'kyc_check_config', expected: 14 },
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

async function getCount(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  if (!rows || !rows[0]) return 0;
  return Number(rows[0].n);
}

async function runPreFlight(conn) {
  console.log('\n--- Pre-flight: current state before mutation ---\n');

  // Invoice column coverage
  const totalInvoices = await getCount(conn, 'SELECT COUNT(*) AS n FROM invoices');
  const nullLifecycle = await getCount(
    conn,
    'SELECT COUNT(*) AS n FROM invoices WHERE lifecycle_state IS NULL'
  );
  const nullFinancialYear = await getCount(
    conn,
    'SELECT COUNT(*) AS n FROM invoices WHERE financial_year IS NULL'
  );
  const nullVendorId = await getCount(
    conn,
    'SELECT COUNT(*) AS n FROM invoices WHERE vendor_id IS NULL'
  );
  const nullLastAction = await getCount(
    conn,
    'SELECT COUNT(*) AS n FROM invoices WHERE last_action IS NULL'
  );

  console.log('Invoice columns:');
  console.log(`  Total invoices:             ${totalInvoices}`);
  console.log(`  lifecycle_state IS NULL:     ${nullLifecycle}`);
  console.log(`  financial_year IS NULL:      ${nullFinancialYear}`);
  console.log(`  vendor_id IS NULL:           ${nullVendorId}`);
  console.log(`  last_action IS NULL:         ${nullLastAction}`);

  // Seed table row counts
  console.log('\nSeed tables:');
  for (const { table, expected } of SEED_TABLES) {
    const count = await getCount(conn, `SELECT COUNT(*) AS n FROM \`${table}\``);
    console.log(`  ${table}: ${count} rows (expected ${expected})`);
  }

  // Payments
  const paymentsCount = await getCount(conn, 'SELECT COUNT(*) AS n FROM payments');
  console.log(`\nPayments table: ${paymentsCount} rows`);

  // Paid invoices eligible for synthesis
  const paidEligible = await getCount(
    conn,
    "SELECT COUNT(*) AS n FROM invoices WHERE LOWER(status) = 'paid' AND total_amount IS NOT NULL"
  );
  console.log(`Paid invoices eligible for synthesis: ${paidEligible}`);

  // Audit log
  const auditLogCount = await getCount(conn, 'SELECT COUNT(*) AS n FROM invoice_audit_log');
  console.log(`invoice_audit_log: ${auditLogCount} rows`);

  // Three-branch interpretation
  const seedsPresent =
    (await getCount(conn, `SELECT COUNT(*) AS n FROM invoice_rejection_reasons`)) > 0;
  const invoicesPopulated = nullLifecycle === 0 && nullFinancialYear === 0 && nullLastAction === 0;

  console.log('\n--- Pre-flight interpretation ---');
  if (seedsPresent && invoicesPopulated && totalInvoices > 0) {
    console.log('State: PURE NO-OP — all seeds present, all invoice columns already populated.');
    console.log('Re-running 2d is safe (idempotent) but will not change data.');
  } else if (!seedsPresent && nullLifecycle === totalInvoices && totalInvoices > 0) {
    console.log(
      'State: FRESH RUN — no seeds, all nullable columns null. Full 2d execution expected.'
    );
  } else if (totalInvoices === 0) {
    console.log('State: EMPTY DB — zero invoices. Seeds will populate; backfills will be no-ops.');
  } else {
    console.log(
      'State: PARTIAL — some data present, some missing. 2d will fill gaps (idempotent).'
    );
  }
}

async function runPostVerification(conn) {
  console.log('\n--- Post-run verification ---\n');
  let failures = 0;

  // Invoice column coverage
  const totalInvoices = await getCount(conn, 'SELECT COUNT(*) AS n FROM invoices');
  const populatedLifecycle = await getCount(
    conn,
    'SELECT COUNT(*) AS n FROM invoices WHERE lifecycle_state IS NOT NULL'
  );
  const nullLifecycle = totalInvoices - populatedLifecycle;
  const populatedFY = await getCount(
    conn,
    'SELECT COUNT(*) AS n FROM invoices WHERE financial_year IS NOT NULL'
  );
  const populatedVendorId = await getCount(
    conn,
    'SELECT COUNT(*) AS n FROM invoices WHERE vendor_id IS NOT NULL'
  );
  const populatedLastAction = await getCount(
    conn,
    'SELECT COUNT(*) AS n FROM invoices WHERE last_action IS NOT NULL'
  );

  console.log('Invoice backfill coverage:');
  console.log(`  lifecycle_state populated:   ${populatedLifecycle}/${totalInvoices}`);
  console.log(`  financial_year populated:    ${populatedFY}/${totalInvoices}`);
  console.log(
    `  vendor_id populated:         ${populatedVendorId}/${totalInvoices} (unresolved are logged above)`
  );
  console.log(`  last_action populated:       ${populatedLastAction}/${totalInvoices}`);

  if (nullLifecycle > 0) {
    console.log(
      `\n  WARNING: ${nullLifecycle} invoice(s) still have NULL lifecycle_state (check lifecycle_unmapped output above)`
    );
    const [unmapped] = await conn.execute(
      'SELECT id, status, processing_status FROM invoices WHERE lifecycle_state IS NULL'
    );
    for (const row of unmapped) {
      console.log(
        `    id=${row.id}  status=${row.status}  processing_status=${row.processing_status}`
      );
    }
    failures++;
  }

  // Seed table verification
  console.log('\nSeed table counts:');
  for (const { table, expected } of SEED_TABLES) {
    const count = await getCount(conn, `SELECT COUNT(*) AS n FROM \`${table}\``);
    const ok = count >= expected;
    console.log(`  ${table}: ${count} (expected >= ${expected}) ${ok ? 'OK' : 'FAIL'}`);
    if (!ok) failures++;
  }

  // Payments
  const paymentsCount = await getCount(conn, 'SELECT COUNT(*) AS n FROM payments');
  console.log(`\nPayments: ${paymentsCount} rows`);

  // Audit log
  const auditBackfill = await getCount(
    conn,
    "SELECT COUNT(*) AS n FROM invoice_audit_log WHERE action = 'lifecycle_state_backfilled'"
  );
  const auditQ3 = await getCount(
    conn,
    "SELECT COUNT(*) AS n FROM invoice_audit_log WHERE action = 'migrated_to_exception_hold'"
  );
  console.log(
    `invoice_audit_log: ${auditBackfill} lifecycle_state_backfilled + ${auditQ3} migrated_to_exception_hold`
  );

  return failures;
}

async function main() {
  console.log('--- WS-1a chunk 2d: seeds + backfills ---\n');
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

    await runPreFlight(conn);

    if (process.env.MIGRATE_DRY_RUN === '1') {
      console.log('\nMIGRATE_DRY_RUN=1 — skipping SQL execution.');
      return;
    }

    // Execute the migration batch
    console.log('\n--- Executing 2d SQL batch ---');
    const [queryResults] = await conn.query(sql);

    // Capture diagnostic SELECT outputs (tag rows).
    // mysql2 with multipleStatements returns [results, fields].
    // queryResults is an array of per-statement results: each SELECT
    // yields a rows array, each INSERT/UPDATE yields a ResultSetHeader.
    // For a batch with N statements, queryResults has N elements.
    // Single-statement edge case: queryResults is the result itself.
    const allResults =
      Array.isArray(queryResults) && queryResults.length > 0 && Array.isArray(queryResults[0])
        ? queryResults
        : [queryResults];

    let tagOutputCount = 0;
    for (const rs of allResults) {
      if (
        Array.isArray(rs) &&
        rs.length > 0 &&
        rs[0] &&
        typeof rs[0] === 'object' &&
        'tag' in rs[0]
      ) {
        tagOutputCount++;
        const tag = rs[0].tag;
        console.log(`\n  [${tag}] ${rs.length} row(s):`);
        for (const row of rs) {
          const { tag: _tag, ...rest } = row;
          console.log(`    ${JSON.stringify(rest)}`);
        }
      }
    }
    if (tagOutputCount === 0) {
      console.log('\n  (no diagnostic tag rows emitted — all clean)');
    }

    console.log('\n2d migration SQL batch: OK (no driver error).');

    // Post-run verification
    const failures = await runPostVerification(conn);

    if (failures > 0) {
      console.error(`\nVERIFICATION FAILED: ${failures} check(s) did not pass.`);
      process.exitCode = 1;
    } else {
      console.log('\nAll post-run checks passed.');
    }
  } catch (err) {
    console.error('\n2d migration error:', err.message || err);
    process.exitCode = 1;
    throw err;
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

main().catch(() => process.exit(1));
