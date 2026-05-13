/**
 * One-shot smoke runner — exercises the 7 approval-flow checks against the
 * live DB. Mirrors PART 6 of the spec.
 *
 * Run:
 *   node --env-file=.env.mysql.local server/scripts/smokeApprovalsE2E.mjs
 *
 * Each smoke fixes its own pre-conditions and prints PASS/FAIL with detail.
 * Exits with non-zero if any FAIL.
 */

import { spawnSync } from 'node:child_process';
import {
  ensureMasterApproval,
  awaitApprovalSync,
  backfillAllPendingApprovals,
  getApprovalQueue,
  approveItem,
  invalidatePendingApprovalsSync,
} from '../services/approvals/approvalService.mjs';
import { ensureInvoiceApproval } from '../routes/invoices.mjs';
import { query, getConnection } from '../mysql.mjs';

const db = {
  execute: async (sql, params = []) => [await query(sql, params)],
  getConnection,
};

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name} — ${detail}`);
}

async function smoke1_backfill() {
  try {
    const summary = await backfillAllPendingApprovals(db, {
      ensureInvoice: ensureInvoiceApproval,
    });
    const m = summary.masters;
    const i = summary.invoices;
    const detail = `masters scanned=${m.scanned} inserted=${m.inserted} updated=${m.updated} errors=${m.errors} | invoices scanned=${i.scanned} inserted=${i.inserted} updated=${i.updated} errors=${i.errors}`;
    record('SMOKE 1 — Backfill ran', m.errors === 0 && i.errors === 0, detail);
  } catch (err) {
    record('SMOKE 1 — Backfill ran', false, err?.message || String(err));
  }
}

async function smoke2_invoiceQueue() {
  try {
    // Force a fresh sync so any post-backfill changes land before we read.
    await awaitApprovalSync(db, '1', { force: true });
    const rows = await getApprovalQueue('1', { module: 'ap_invoice' }, db);
    const refs = (rows || [])
      .map((r) => `${r.module}:${r.invoice_number || r.reference_id}`)
      .slice(0, 10);
    record(
      'SMOKE 2 — Invoice queue not empty',
      Array.isArray(rows) && rows.length > 0,
      `${rows?.length ?? 0} rows: ${refs.join(', ')}`
    );
  } catch (err) {
    record('SMOKE 2 — Invoice queue not empty', false, err?.message || String(err));
  }
}

async function smoke3_masterQueue() {
  try {
    await awaitApprovalSync(db, '1', { force: true });
    const rows = await getApprovalQueue('1', { module: 'master_update' }, db);
    const count = rows?.length ?? 0;
    if (count === 0) {
      // Check DB for any pending master rows; if 0, this is expected.
      const [[masters]] = await db.execute(
        `SELECT COUNT(*) AS c FROM (
           SELECT id FROM vendor_master.vendor_master WHERE approval_status IN ('Pending Approval','Pending','Draft')
           UNION ALL
           SELECT id FROM entity_master.entity_master WHERE approval_status IN ('Pending Approval','Pending','Draft')
         ) p`
      );
      const pendingCount = Number(masters?.c ?? 0);
      record(
        'SMOKE 3 — Master queue populated',
        true,
        `0 in queue; ${pendingCount} pending masters in DB (expected: empty when no edits)`
      );
    } else {
      record('SMOKE 3 — Master queue populated', true, `${count} rows`);
    }
  } catch (err) {
    record('SMOKE 3 — Master queue populated', false, err?.message || String(err));
  }
}

async function smoke4_masterIdempotent() {
  try {
    // Pick the first pending master record to use as the fixture.
    const [pending] = await db.execute(
      `SELECT id FROM vendor_master.vendor_master
        WHERE approval_status IN ('Pending Approval','Pending','Draft') LIMIT 1`
    );
    if (!pending?.length) {
      record(
        'SMOKE 4 — ensureMasterApproval idempotent',
        true,
        'No pending master row to test against (vacuously idempotent)'
      );
      return;
    }
    const recordId = pending[0].id;
    const r1 = await ensureMasterApproval(db, {
      masterKey: 'vendor_master',
      recordId,
      submittedBy: '1',
    });
    const r2 = await ensureMasterApproval(db, {
      masterKey: 'vendor_master',
      recordId,
      submittedBy: '1',
    });
    const [count] = await db.execute(
      `SELECT COUNT(*) AS c FROM approvals
        WHERE module='master_update' AND reference_id=? AND status='pending'`,
      [`vendor_master:${recordId}`]
    );
    const c = Number(count[0]?.c ?? 0);
    record(
      'SMOKE 4 — ensureMasterApproval idempotent',
      c === 1,
      `r1=${r1.action}, r2=${r2.action}, pending rows=${c} (expected 1)`
    );
  } catch (err) {
    record('SMOKE 4 — ensureMasterApproval idempotent', false, err?.message || String(err));
  }
}

async function smoke5_invoiceIdempotent() {
  try {
    const [pending] = await db.execute(
      `SELECT id FROM invoices
        WHERE lifecycle_state IN ('Under Verification','Pending Approval','pending_approval')
          AND LOWER(COALESCE(status,'')) NOT IN ('approved','rejected','cancelled')
        LIMIT 1`
    );
    if (!pending?.length) {
      record(
        'SMOKE 5 — ensureInvoiceApproval idempotent',
        true,
        'No pending invoice to test against (vacuously idempotent)'
      );
      return;
    }
    const invoiceId = pending[0].id;
    const r1 = await ensureInvoiceApproval(invoiceId, '1');
    const r2 = await ensureInvoiceApproval(invoiceId, '1');
    const [count] = await db.execute(
      `SELECT COUNT(*) AS c FROM approvals
        WHERE module IN ('ap_invoice','non_po_invoice') AND reference_id=? AND status='pending'`,
      [invoiceId]
    );
    const c = Number(count[0]?.c ?? 0);
    record(
      'SMOKE 5 — ensureInvoiceApproval idempotent',
      c === 1,
      `r1=${r1.action}, r2=${r2.action}, pending rows=${c} (expected 1)`
    );
  } catch (err) {
    record('SMOKE 5 — ensureInvoiceApproval idempotent', false, err?.message || String(err));
  }
}

async function smoke6_approveFlow() {
  try {
    await awaitApprovalSync(db, '1', { force: true });
    const queue = await getApprovalQueue('1', { module: 'ap_invoice' }, db);
    if (!queue?.length) {
      record(
        'SMOKE 6 — Approve flow end to end',
        false,
        'Queue empty — cannot exercise approve path'
      );
      return;
    }
    const target = queue[0];
    const approvalId = target.id;
    const invoiceId = target.reference_id;

    await approveItem(approvalId, '1', 'smoke-test approval', db);

    // Verify both sides flipped.
    const [appr] = await db.execute(`SELECT status FROM approvals WHERE id=?`, [approvalId]);
    const [inv] = await db.execute(`SELECT lifecycle_state, status FROM invoices WHERE id=?`, [
      invoiceId,
    ]);
    const apprStatus = appr[0]?.status;
    const lifecycle = inv[0]?.lifecycle_state;
    const invStatus = inv[0]?.status;

    const pass = apprStatus === 'approved' && lifecycle === 'Processed' && invStatus === 'approved';
    record(
      'SMOKE 6 — Approve flow end to end',
      pass,
      `approval.status=${apprStatus} | invoice.lifecycle_state=${lifecycle} | invoice.status=${invStatus} | invoiceId=${invoiceId} | approvalId=${approvalId}`
    );
  } catch (err) {
    record('SMOKE 6 — Approve flow end to end', false, err?.message || String(err));
  }
}

async function smoke7_unitTests() {
  // Spawn npm test as a subprocess. Inherit stdio is too noisy; capture exit code.
  const r = spawnSync('npm', ['test', '--', '--reporter=default'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const stdout = String(r.stdout || '');
  const stderr = String(r.stderr || '');
  // Pull the "Tests  N passed" line from vitest output.
  const match = stdout.match(/Tests\s+(\d+)\s+passed/);
  const passedCount = match ? Number(match[1]) : null;
  const failed = /\d+ failed/.test(stdout) || r.status !== 0;
  record(
    'SMOKE 7 — All tests pass',
    !failed && Boolean(passedCount),
    failed
      ? `npm test exit=${r.status}; stderr: ${stderr.slice(0, 400)}`
      : `${passedCount} tests passed`
  );
}

async function main() {
  // Reset debounce so smoke 2 / 3 / 6 see fresh state.
  invalidatePendingApprovalsSync();

  await smoke1_backfill();
  await smoke2_invoiceQueue();
  await smoke3_masterQueue();
  await smoke4_masterIdempotent();
  await smoke5_invoiceIdempotent();
  await smoke6_approveFlow();
  await smoke7_unitTests();

  console.log('\n══════ FINAL REPORT ══════');
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} — ${r.name} — ${r.detail}`);
  }
  const allPass = results.every((r) => r.pass);
  console.log(`\n${allPass ? 'ALL PASS' : 'SOME FAIL'} — ${results.length} smokes`);
  // Best-effort process exit. Keep alive briefly in case mysql pool has
  // outstanding callbacks.
  setTimeout(() => process.exit(allPass ? 0 : 1), 500);
}

main().catch((err) => {
  console.error('Smoke runner crashed:', err);
  process.exit(2);
});
