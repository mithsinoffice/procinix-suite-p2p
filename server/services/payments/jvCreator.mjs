/**
 * Payment Journal-Voucher creator.
 *
 * For every confirmed batch line item we emit two ledger entries:
 *   DEBIT  Accounts Payable GL  (vendor's `ap_gl_code` or default 2100)
 *   CREDIT Bank GL              (bank account's `bank_gl_code` or default 1100)
 *
 * Persistence falls through gracefully:
 *   - If `journal_entries` table exists, INSERT one row per leg.
 *   - Otherwise, write a single record into `invoice_audit_log` with
 *     change_type='JV_CREATED' and new_value = JSON.stringify(entries).
 */

import { randomUUID } from 'node:crypto';
import { query } from '../../mysql.mjs';

const DEFAULT_AP_GL = '2100';
const DEFAULT_BANK_GL = '1100';

function pad2(n) {
  return String(n).padStart(2, '0');
}
function yyyymmdd(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}`;
}

async function tableExists(name) {
  try {
    const rows = await query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
      [name]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Build the JV entries for a payment batch.
 *
 * @param {object} batch — { batch_ref, payment_date?, bank_gl_code? }
 * @param {Array<object>} items — line items with vendor_name, amount, ap_gl_code?, invoice_id, ref
 * @param {string} tenantId
 * @returns {{ jvRef: string, entries: Array<{type:'DR'|'CR', glCode:string, amount:number, narration:string, lineNumber:number}> }}
 */
export async function createPaymentJV(batch, items, tenantId) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('createPaymentJV requires at least one item');
  }
  const jvRef = `JV-PAY-${yyyymmdd(batch.payment_date)}-${batch.batch_ref}`;
  const bankGl = String(batch.bank_gl_code || DEFAULT_BANK_GL);
  const entries = [];
  let lineNumber = 1;

  for (const it of items) {
    const apGl = String(it.ap_gl_code || DEFAULT_AP_GL);
    const invoiceRef = it.invoice_ref || it.ref || it.invoice_id || '';
    const narration = `Payment to ${it.vendor_name || '—'} against ${invoiceRef}`;
    entries.push({
      type: 'DR',
      glCode: apGl,
      amount: Number(it.amount) || 0,
      narration,
      lineNumber: lineNumber++,
    });
    entries.push({
      type: 'CR',
      glCode: bankGl,
      amount: Number(it.amount) || 0,
      narration,
      lineNumber: lineNumber++,
    });
  }

  // Persist — journal_entries table preferred, else fall back to audit log.
  const hasJournalTable = await tableExists('journal_entries');
  if (hasJournalTable) {
    for (const e of entries) {
      try {
        await query(
          `INSERT INTO journal_entries
             (id, tenant_id, jv_ref, line_number, entry_type, gl_code, amount, narration, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            randomUUID(),
            tenantId,
            jvRef,
            e.lineNumber,
            e.type,
            e.glCode,
            e.amount,
            e.narration,
          ]
        );
      } catch {
        // tolerate column mismatches across schemas
      }
    }
  } else {
    // Fallback: log to invoice_audit_log against the first item's invoice id.
    try {
      await query(
        `INSERT INTO invoice_audit_log
           (id, tenant_id, invoice_id, action, change_type, new_value, actor_source, created_at)
         VALUES (?, ?, ?, 'jv_created', 'JV_CREATED', ?, 'system', NOW())`,
        [
          randomUUID(),
          tenantId,
          items[0].invoice_id || '',
          JSON.stringify({ jvRef, entries }),
        ]
      );
    } catch {
      // best-effort — don't block the batch flow
    }
  }

  return { jvRef, entries };
}

// Exported for tests
export { DEFAULT_AP_GL, DEFAULT_BANK_GL };
