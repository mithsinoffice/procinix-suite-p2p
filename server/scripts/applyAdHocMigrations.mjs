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

const MIGRATIONS = [
  'sql/mysql/migrations/20260510_vendor_group_master.sql',
  'sql/mysql/migrations/20260510_master_seeds.sql',
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
