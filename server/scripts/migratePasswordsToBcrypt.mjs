/**
 * B2: Migrate plaintext passwords in user_master.payload to bcrypt hashes.
 *
 * Run:        npm run migrate:password-hash
 * Dry-run:    MIGRATE_DRY_RUN=1 npm run migrate:password-hash
 * Idempotent: rows that already have payload.passwordHash are skipped.
 */
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'node:url';
import { query, withTransaction, connExecute } from '../mysql.mjs';

const COST = 12;

function parsePayload(row) {
  if (!row?.payload) return {};
  return typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
}

function resolvePlaintext(payload) {
  return payload.password ?? payload.loginPassword ?? payload.tempPassword ?? null;
}

export async function run({ dryRun = process.env.MIGRATE_DRY_RUN === '1' } = {}) {
  if (dryRun) {
    console.log('[migrate:password-hash] DRY RUN — no writes will occur');
  }

  const rows = await query(
    'SELECT id, payload FROM `user_master`.`user_master` ORDER BY id ASC',
  );

  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    const payload = parsePayload(row);
    const label = payload.email ?? payload.employeeId ?? row.id;

    if (payload.passwordHash) {
      console.log(`[migrate:password-hash] Skipping user ${label} (id=${row.id}) — already hashed`);
      skipped++;
      continue;
    }

    const plaintext = resolvePlaintext(payload);
    if (!plaintext) {
      console.log(`[migrate:password-hash] Skipping user ${label} (id=${row.id}) — no password field`);
      skipped++;
      continue;
    }

    const hash = await bcrypt.hash(plaintext, COST);
    const updatedPayload = { ...payload, passwordHash: hash };
    delete updatedPayload.password;
    delete updatedPayload.loginPassword;
    delete updatedPayload.tempPassword;

    if (dryRun) {
      console.log(`[migrate:password-hash] DRY RUN: would migrate user ${label} (id=${row.id})`);
    } else {
      await withTransaction(async (conn) => {
        await connExecute(
          conn,
          'UPDATE `user_master`.`user_master` SET payload = CAST(? AS JSON) WHERE id = ?',
          [JSON.stringify(updatedPayload), row.id],
        );
      });
      console.log(`[migrate:password-hash] Migrated user ${label} (id=${row.id})`);
    }
    migrated++;
  }

  console.log(`[migrate:password-hash] Done. migrated=${migrated} skipped=${skipped}`);
  return { migrated, skipped };
}

// Only auto-run when invoked directly (not imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    console.error('[migrate:password-hash] Fatal error:', err);
    process.exit(1);
  });
}
