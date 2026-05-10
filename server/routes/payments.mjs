/**
 * Payment Queue + Risk Flags — domain route file (kept out of the 4 100-line
 * server/index.mjs monolith). Mounted at `if (await handlePaymentsRoute(...))`.
 *
 *   GET  /api/ap/payment-queue                — paginated list with risk flags
 *   GET  /api/ap/payment-queue/:id            — single item detail
 *   POST /api/ap/payment-queue/:id/due-date   — { newDue, reason } update + audit
 *   POST /api/ap/payment-queue/:id/pay        — { payAmt, payDate, utr, newStatus }
 *   POST /api/ap/payment-queue/:id/hold       — toggle on-hold
 *   POST /api/ap/payment-queue/:id/clear-flags — { clearanceNote } approver-only
 *   GET  /api/ap/payment-queue/flags/summary  — { count, totalValue, severity counts }
 *
 * Risk flag evaluator runs on every queue fetch and on `Queued for Payment`
 * transitions. High-severity flags push the invoice to `Exception Hold` and
 * write a `risk_hold` exception row.
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { query } from '../mysql.mjs';
import { generatePayoutFile } from '../services/payments/payoutFileGenerator.mjs';
import { parseUTRFile } from '../services/payments/utrIngestParser.mjs';
import { createPaymentJV } from '../services/payments/jvCreator.mjs';
import {
  getSettings,
  updateSettings,
  resetSettings,
} from '../services/payments/paymentSettings.mjs';

// ============================================================================
// Approver role gating
// ============================================================================

// Default approver roles — used as a fallback when payment_settings.payment_approver_roles
// is empty or settings can't be loaded (e.g. unit tests).
const DEFAULT_APPROVER_ROLES = new Set(['payment_approver', 'cfo', 'admin']);
const ADMIN_ROLES = new Set(['admin']);

function normaliseRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function readActorRole(req) {
  // Prefer authenticated session role; fall back to explicit header for tests.
  return normaliseRole(req.user?.role || req.headers['x-user-role'] || '');
}

function readActorEmail(req) {
  return String(req.user?.email || req.headers['x-user-email'] || '').trim();
}

/**
 * Synchronous approver check using the static default list. Kept for
 * backward-compatibility with tests + paths that don't have a tenantId
 * available. Prefer `isPaymentApprover(req, tenantId)` for live config.
 */
function isApprover(req) {
  return DEFAULT_APPROVER_ROLES.has(readActorRole(req));
}

/**
 * Live approver check — reads `payment_settings.payment_approver_roles`
 * for the tenant. Falls back to the default list if settings aren't
 * available or contain an empty list. Async because it may hit the DB.
 */
async function isPaymentApprover(req, tenantId) {
  const role = readActorRole(req);
  if (!role) return false;
  if (!tenantId) return DEFAULT_APPROVER_ROLES.has(role);
  try {
    const settings = await getSettings(tenantId);
    const roles = String(settings?.paymentApproverRoles || '')
      .split(',')
      .map((r) => normaliseRole(r))
      .filter(Boolean);
    if (roles.length === 0) return DEFAULT_APPROVER_ROLES.has(role);
    return roles.includes(role);
  } catch {
    return DEFAULT_APPROVER_ROLES.has(role);
  }
}

function isAdmin(req) {
  if (ADMIN_ROLES.has(readActorRole(req))) return true;
  // SUPER_ADMIN_EMAILS env-var override — comma-separated list.
  const envList = String(process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  const email = readActorEmail(req);
  return Boolean(email) && envList.includes(email);
}

// ============================================================================
// Tenant + body helpers
// ============================================================================

function readTenant(req, url) {
  const h = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
  if (h && String(h).trim()) return String(h).trim();
  const q = url?.searchParams?.get?.('tenantId');
  return q ? String(q).trim() : '';
}

function readEntity(req, url) {
  const h = req.headers['x-entity-id'] || req.headers['X-Entity-Id'];
  if (h && String(h).trim()) return String(h).trim();
  return url?.searchParams?.get?.('entityId') || null;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

// ============================================================================
// 12-rule Risk Flag Evaluator
// ============================================================================

// Tunable thresholds — could later be persisted in app_settings table.
const FLAG_CONFIG = {
  bankChangedDays: 30,
  duplicateWindowDays: 30,
  dualApprovalThreshold: 200000, // ₹2L
  amountAnomalyMultiplier: 2.5,
  roundNumberMin: 50000,
  invSplittingWindowDays: 7,
  invSplittingThreshold: 3,
};

const FLAG_DEFS = {
  bank_changed: {
    severity: 'high',
    icon: 'Banknote',
    title: 'Bank account recently changed',
  },
  vendor_blocked: {
    severity: 'high',
    icon: 'Ban',
    title: 'Vendor is blocked or inactive',
  },
  duplicate_inv: {
    severity: 'high',
    icon: 'Copy',
    title: 'Possible duplicate invoice',
  },
  name_mismatch: {
    severity: 'high',
    icon: 'AlertTriangle',
    title: 'Bank-account name mismatch',
  },
  dual_approval: {
    severity: 'medium',
    icon: 'UserCheck',
    title: 'Dual approval required',
  },
  new_vendor: {
    severity: 'medium',
    icon: 'UserPlus',
    title: 'New vendor (no prior payments)',
  },
  amount_anomaly: {
    severity: 'medium',
    icon: 'TrendingUp',
    title: 'Amount higher than vendor average',
  },
  no_grn: {
    severity: 'medium',
    icon: 'Package',
    title: 'PO present but no GRN match',
  },
  round_number: {
    severity: 'low',
    icon: 'Hash',
    title: 'Round-number amount',
  },
  inv_splitting: {
    severity: 'low',
    icon: 'Scissors',
    title: 'Possible invoice splitting',
  },
  advance_no_doc: {
    severity: 'medium',
    icon: 'FileWarning',
    title: 'Advance with no supporting document',
  },
  after_hours: {
    severity: 'low',
    icon: 'Moon',
    title: 'Approved outside business hours',
  },
};

function buildFlag(flagId, detail) {
  const def = FLAG_DEFS[flagId];
  return {
    flagId,
    severity: def.severity,
    title: def.title,
    detail,
    icon: def.icon,
  };
}

/**
 * Resolve a thresholds bundle from either tenant-level settings (preferred)
 * or the hardcoded defaults. Settings ship in the camelCase shape produced
 * by `paymentSettings.mjs::getSettings`.
 */
function resolveThresholds(settings) {
  if (!settings) return { ...FLAG_CONFIG, businessHoursStart: 9, businessHoursEnd: 19 };
  const parseHour = (s) => {
    const m = String(s || '09:00:00').match(/^(\d{1,2}):/);
    return m ? Math.max(0, Math.min(23, Number(m[1]))) : 9;
  };
  return {
    bankChangedDays: Number(settings.flagBankChangedDays) || FLAG_CONFIG.bankChangedDays,
    duplicateWindowDays: Number(settings.flagDuplicateInvDays) || FLAG_CONFIG.duplicateWindowDays,
    dualApprovalThreshold:
      Number(settings.flagDualApprovalThreshold) || FLAG_CONFIG.dualApprovalThreshold,
    amountAnomalyMultiplier:
      Number(settings.flagAmountAnomalyMultiplier) || FLAG_CONFIG.amountAnomalyMultiplier,
    roundNumberMin: Number(settings.flagRoundNumberMin) || FLAG_CONFIG.roundNumberMin,
    roundNumberDivisor: Number(settings.flagRoundNumberDivisor) || 1000,
    invSplittingWindowDays:
      Number(settings.flagInvSplittingDays) || FLAG_CONFIG.invSplittingWindowDays,
    invSplittingThreshold:
      Number(settings.flagInvSplittingCount) || FLAG_CONFIG.invSplittingThreshold,
    businessHoursStart: parseHour(settings.businessHoursStart),
    businessHoursEnd: parseHour(settings.businessHoursEnd),
  };
}

/**
 * Evaluate the 12 rules against a single invoice + its enriched context.
 * Returns RiskFlag[] (may be empty). Pure function — does not write DB.
 *
 * Settings can be passed via `ctx.settings` (live from DB) or omitted to
 * fall back to the hardcoded FLAG_CONFIG defaults — keeps tests + offline
 * environments working.
 */
function evaluateRiskFlags(ctx) {
  const flags = [];
  const { invoice, vendor, vendorBank, paidInvoiceCount, vendorAvgAmount, recentVendorInvoices } =
    ctx;
  const cfg = resolveThresholds(ctx.settings);

  const amount = Number(invoice.total_amount) || 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. bank_changed
  if (vendorBank?.updated_at) {
    const ageDays = (now - new Date(vendorBank.updated_at).getTime()) / dayMs;
    if (ageDays >= 0 && ageDays < cfg.bankChangedDays) {
      flags.push(
        buildFlag(
          'bank_changed',
          `Vendor bank account was updated ${Math.round(ageDays)} day(s) ago`
        )
      );
    }
  }

  // 2. vendor_blocked
  if (vendor && vendor.status && String(vendor.status).toLowerCase() !== 'active') {
    flags.push(buildFlag('vendor_blocked', `Vendor status is "${vendor.status}"`));
  }

  // 3. duplicate_inv — same vendor + same amount in window
  if (recentVendorInvoices?.some((r) => r.id !== invoice.id && Number(r.total_amount) === amount)) {
    flags.push(
      buildFlag(
        'duplicate_inv',
        `Another invoice with the same amount exists in the last ${cfg.duplicateWindowDays} days`
      )
    );
  }

  // 4. name_mismatch — bank account name vs vendor master name
  if (vendorBank?.account_name && vendor?.vendor_legal_name) {
    const a = String(vendorBank.account_name).trim().toLowerCase();
    const b = String(vendor.vendor_legal_name).trim().toLowerCase();
    if (a && b && a !== b) {
      flags.push(
        buildFlag('name_mismatch', `Bank account "${vendorBank.account_name}" ≠ vendor master`)
      );
    }
  }

  // 5. dual_approval — amount > threshold but only 1 approval recorded
  if (amount > cfg.dualApprovalThreshold) {
    const approvalCount = ctx.approvalCount ?? 0;
    if (approvalCount < 2) {
      flags.push(
        buildFlag(
          'dual_approval',
          `Amount ₹${amount.toLocaleString('en-IN')} exceeds dual-approval threshold; only ${approvalCount} approver(s) on record`
        )
      );
    }
  }

  // 6. new_vendor — zero prior paid invoices
  if (paidInvoiceCount === 0) {
    flags.push(buildFlag('new_vendor', 'First payment to this vendor'));
  }

  // 7. amount_anomaly
  if (vendorAvgAmount && vendorAvgAmount > 0) {
    const ratio = amount / vendorAvgAmount;
    if (ratio >= cfg.amountAnomalyMultiplier) {
      flags.push(
        buildFlag(
          'amount_anomaly',
          `Amount is ${ratio.toFixed(1)}× vendor average (₹${Math.round(vendorAvgAmount).toLocaleString('en-IN')})`
        )
      );
    }
  }

  // 8. no_grn — po_number present but no matching GRN
  if (invoice.po_number && !ctx.hasMatchingGrn) {
    flags.push(buildFlag('no_grn', `PO ${invoice.po_number} has no matching GRN on record`));
  }

  // 9. round_number
  if (amount >= cfg.roundNumberMin && amount % cfg.roundNumberDivisor === 0) {
    flags.push(
      buildFlag('round_number', `Amount is a round multiple of ${cfg.roundNumberDivisor}`)
    );
  }

  // 10. inv_splitting — many invoices same vendor in short window
  if (recentVendorInvoices && recentVendorInvoices.length > cfg.invSplittingThreshold) {
    flags.push(
      buildFlag(
        'inv_splitting',
        `${recentVendorInvoices.length} invoices from this vendor in last ${cfg.invSplittingWindowDays} days`
      )
    );
  }

  // 11. advance_no_doc — type advance, no supporting URL/note
  const isAdvance = String(invoice.invoice_type || '').toLowerCase() === 'advance';
  if (isAdvance && !invoice.supporting_doc_url && !invoice.attachment_path) {
    flags.push(buildFlag('advance_no_doc', 'Advance has no supporting document attached'));
  }

  // 12. after_hours — most recent approval outside business hours (IST)
  if (ctx.lastApprovalAt) {
    const d = new Date(ctx.lastApprovalAt);
    const istHour = (d.getUTCHours() + 5 + Math.floor((d.getUTCMinutes() + 30) / 60)) % 24;
    if (istHour < cfg.businessHoursStart || istHour >= cfg.businessHoursEnd) {
      flags.push(
        buildFlag('after_hours', `Approval recorded outside business hours (${istHour}:00 IST)`)
      );
    }
  }

  return flags;
}

// ============================================================================
// Persist evaluated flags + auto-hold high-severity invoices
// ============================================================================

async function persistFlags(invoiceId, tenantId, flags) {
  // Insert any new flags that aren't already on the invoice (uncleared).
  // Cheap approach: delete all uncleared flags for this invoice/tenant, re-insert.
  // Cleared flags are preserved.
  await query(
    'DELETE FROM invoice_risk_flags WHERE invoice_id = ? AND tenant_id = ? AND is_cleared = 0',
    [invoiceId, tenantId]
  );
  for (const f of flags) {
    await query(
      'INSERT INTO invoice_risk_flags (invoice_id, tenant_id, flag_id, severity, detail) VALUES (?, ?, ?, ?, ?)',
      [invoiceId, tenantId, f.flagId, f.severity, f.detail]
    );
  }
}

async function autoHoldOnHighSeverity(invoiceId, tenantId, flags) {
  const high = flags.filter((f) => f.severity === 'high');
  if (high.length === 0) return false;
  await query(
    `UPDATE invoices SET lifecycle_state = 'Exception Hold', updated_at = NOW()
       WHERE id = ? AND tenant_id = ? AND lifecycle_state NOT IN ('Paid','Rejected')`,
    [invoiceId, tenantId]
  );
  // Best-effort exception row; ignore if table or columns differ.
  try {
    await query(
      `INSERT INTO invoice_exceptions (id, tenant_id, invoice_id, exception_type, severity, detail, created_at)
         VALUES (?, ?, ?, 'risk_hold', 'high', ?, NOW())`,
      [randomUUID(), tenantId, invoiceId, high.map((f) => f.flagId).join(',')]
    );
  } catch {
    /* exception table optional */
  }
  return true;
}

// ============================================================================
// Enrichment SQL — gathers everything evaluator needs in O(2N) queries instead
// of O(N²). Called once per queue fetch.
// ============================================================================

async function loadEnrichmentForInvoices(invoices, tenantId, settings = null) {
  const cfg = resolveThresholds(settings);
  const vendorIds = [...new Set(invoices.map((i) => i.vendor_id).filter(Boolean))];
  const invoiceIds = invoices.map((i) => i.id);

  if (vendorIds.length === 0) {
    return {
      vendorById: new Map(),
      vendorBankById: new Map(),
      paidCountByVendor: new Map(),
      avgByVendor: new Map(),
      recentByVendor: new Map(),
      grnPoSet: new Set(),
      auditByInvoice: new Map(),
      clearedFlagsByInvoice: new Map(),
    };
  }

  const placeholders = vendorIds.map(() => '?').join(',');
  let vendorRows = [];
  try {
    vendorRows = await query(
      `SELECT id, vendor_legal_name, vendor_trade_name, status FROM p2p_schema_mt.vendors WHERE id IN (${placeholders})`,
      vendorIds
    );
  } catch {
    vendorRows = [];
  }
  const vendorById = new Map(vendorRows.map((v) => [String(v.id), v]));

  let bankRows = [];
  try {
    bankRows = await query(
      `SELECT vendor_id, account_number, ifsc_code, bank_name,
              COALESCE(account_name, '') AS account_name,
              updated_at
         FROM p2p_schema_mt.vendor_bank_accounts
         WHERE vendor_id IN (${placeholders})
         ORDER BY is_primary DESC, updated_at DESC`,
      vendorIds
    );
  } catch {
    bankRows = [];
  }
  const vendorBankById = new Map();
  for (const b of bankRows) {
    if (!vendorBankById.has(String(b.vendor_id))) vendorBankById.set(String(b.vendor_id), b);
  }

  // Paid invoice count per vendor (for new_vendor flag)
  const paidCountByVendor = new Map();
  const avgByVendor = new Map();
  try {
    const aggRows = await query(
      `SELECT i.vendor_id,
              COUNT(DISTINCT CASE WHEN p.status = 'confirmed' THEN i.id END) AS paid_count,
              AVG(i.total_amount) AS avg_amount
         FROM invoices i
         LEFT JOIN payments p ON p.invoice_id = i.id
         WHERE i.tenant_id = ? AND i.vendor_id IN (${placeholders})
         GROUP BY i.vendor_id`,
      [tenantId, ...vendorIds]
    );
    for (const r of aggRows) {
      paidCountByVendor.set(String(r.vendor_id), Number(r.paid_count) || 0);
      avgByVendor.set(String(r.vendor_id), Number(r.avg_amount) || 0);
    }
  } catch {
    /* tolerate missing tables in tests */
  }

  // Recent invoices per vendor (window = max of duplicate + splitting)
  const recentByVendor = new Map();
  try {
    const windowDays = Math.max(cfg.duplicateWindowDays, cfg.invSplittingWindowDays);
    const recentRows = await query(
      `SELECT id, vendor_id, total_amount, invoice_date
         FROM invoices
         WHERE tenant_id = ? AND vendor_id IN (${placeholders})
           AND invoice_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [tenantId, ...vendorIds, windowDays]
    );
    for (const r of recentRows) {
      const key = String(r.vendor_id);
      if (!recentByVendor.has(key)) recentByVendor.set(key, []);
      recentByVendor.get(key).push(r);
    }
  } catch {
    /* ignore */
  }

  // GRN match — minimal: see whether any GRN row exists for the PO.
  const grnPoSet = new Set();
  const poNumbers = [...new Set(invoices.map((i) => i.po_number).filter(Boolean))];
  if (poNumbers.length > 0) {
    try {
      const grnRows = await query(
        `SELECT DISTINCT po_number FROM goods_receipts
           WHERE tenant_id = ? AND po_number IN (${poNumbers.map(() => '?').join(',')})`,
        [tenantId, ...poNumbers]
      );
      for (const r of grnRows) grnPoSet.add(String(r.po_number));
    } catch {
      // GRN table may not exist; treat all POs as having matching GRN to avoid false positives.
      for (const p of poNumbers) grnPoSet.add(String(p));
    }
  }

  // Approval trail per invoice (audit log)
  const auditByInvoice = new Map();
  if (invoiceIds.length > 0) {
    try {
      const auditRows = await query(
        `SELECT invoice_id, action, actor_id, actor_source, from_state, to_state,
                reason_note, created_at
           FROM invoice_audit_log
           WHERE invoice_id IN (${invoiceIds.map(() => '?').join(',')})
           ORDER BY created_at ASC`,
        invoiceIds
      );
      for (const r of auditRows) {
        const key = String(r.invoice_id);
        if (!auditByInvoice.has(key)) auditByInvoice.set(key, []);
        auditByInvoice.get(key).push(r);
      }
    } catch {
      /* ignore */
    }
  }

  // Already-cleared flags per invoice (so the row's `cleared` flag is correct)
  const clearedFlagsByInvoice = new Map();
  if (invoiceIds.length > 0) {
    try {
      const clearedRows = await query(
        `SELECT invoice_id, clearance_note, cleared_at
           FROM invoice_risk_flags
           WHERE invoice_id IN (${invoiceIds.map(() => '?').join(',')}) AND is_cleared = 1
           ORDER BY cleared_at DESC`,
        invoiceIds
      );
      for (const r of clearedRows) {
        const key = String(r.invoice_id);
        if (!clearedFlagsByInvoice.has(key)) clearedFlagsByInvoice.set(key, r);
      }
    } catch {
      /* invoice_risk_flags table may not exist yet — migration not run */
    }
  }

  return {
    vendorById,
    vendorBankById,
    paidCountByVendor,
    avgByVendor,
    recentByVendor,
    grnPoSet,
    auditByInvoice,
    clearedFlagsByInvoice,
  };
}

// ============================================================================
// Adapt DB row → PaymentQueueItem
// ============================================================================

function computeMsmeRemaining(invoice, vendor) {
  if (!vendor || vendor.is_msme !== 1) return null;
  if (!invoice.invoice_date) return null;
  const start = new Date(invoice.invoice_date).getTime();
  const elapsed = Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000));
  return Math.max(0, 45 - elapsed);
}

function deriveStatus(invoice, paidAmt, hasUnclearedFlags) {
  if (hasUnclearedFlags) return 'flagged';
  const ls = String(invoice.lifecycle_state || '').toLowerCase();
  if (ls === 'paid') return 'paid';
  if (ls === 'exception hold') return 'onhold';
  const total = Number(invoice.total_amount) || 0;
  if (paidAmt > 0 && paidAmt < total) return 'partial';
  if (paidAmt > 0 && paidAmt >= total) return 'paid';
  if (ls === 'queued for payment') return 'queued';
  if (ls === 'under verification') return 'pending';
  return 'queued';
}

function derivePriority(invoice, msmeRemaining) {
  const ap = String(invoice.approval_priority || '').toLowerCase();
  if (ap === 'critical') return 'critical';
  if (msmeRemaining !== null && msmeRemaining <= 5) return 'critical';
  if (ap === 'high') return 'high';
  if (msmeRemaining !== null && msmeRemaining <= 15) return 'high';
  if (ap === 'low') return 'low';
  return 'medium';
}

function adaptInvoice(invoice, ctx, flags, clearedRow) {
  const vendor = ctx.vendor;
  const bank = ctx.vendorBank;
  const total = Number(invoice.total_amount) || 0;
  const paidAmt = Number(invoice.payment_total) || 0;
  const msmeRemaining = computeMsmeRemaining(invoice, vendor);
  const isMSME = vendor?.is_msme === 1;
  const isCritical = String(invoice.approval_priority || '').toLowerCase() === 'critical';
  const critTag =
    String(invoice.invoice_type || '').toLowerCase() === 'advance'
      ? 'advance'
      : invoice.is_statutory
        ? 'statutory'
        : null;

  const cleared = Boolean(clearedRow) || flags.length === 0;
  const hasUnclearedFlags = !cleared && flags.length > 0;

  const approvalTrail = (ctx.audit || []).map((a) => ({
    by: a.actor_id || a.actor_source || 'system',
    role: a.actor_source || '',
    at: a.created_at instanceof Date ? a.created_at.toISOString() : String(a.created_at || ''),
    action: a.action || `${a.from_state || ''} → ${a.to_state || ''}`,
  }));

  return {
    id: invoice.id,
    name: invoice.vendor_name || vendor?.vendor_legal_name || '—',
    ref: invoice.invoice_number || invoice.id,
    type: String(invoice.invoice_type || '').toLowerCase() === 'advance' ? 'advance' : 'invoice',
    amount: total,
    paidAmt,
    invoiceDate: invoice.invoice_date ? String(invoice.invoice_date).slice(0, 10) : '',
    due: invoice.due_date ? String(invoice.due_date).slice(0, 10) : '',
    priority: derivePriority(invoice, msmeRemaining),
    status: deriveStatus(invoice, paidAmt, hasUnclearedFlags),
    isMSME,
    isCritical,
    critTag,
    dept: invoice.cost_centre_name || '',
    vendor: {
      gstin: invoice.vendor_gstin || '',
      pan: vendor?.pan || '',
      bank: bank ? `${bank.bank_name || ''} ••${String(bank.account_number || '').slice(-4)}` : '',
      masterName: vendor?.vendor_legal_name || '',
    },
    flags,
    cleared,
    clearanceNote: clearedRow?.clearance_note || '',
    approvalTrail,
    msmeRemaining,
  };
}

// ============================================================================
// Build the queue list
// ============================================================================

async function buildPaymentQueue({ tenantId, entityId, status, search, page = 1, limit = 100 }) {
  // Load tenant settings once and pass them through enrichment + evaluator.
  const settings = await getSettings(tenantId);
  const params = [tenantId];
  let entityClause = '';
  if (entityId) {
    entityClause = ' AND i.entity_id = ? ';
    params.push(entityId);
  }
  const offset = (Math.max(1, page) - 1) * limit;

  const sql = `
    SELECT i.id, i.invoice_number, i.invoice_date, i.due_date, i.vendor_name, i.vendor_id,
           i.vendor_gstin, i.po_number, i.currency, i.total_amount,
           i.lifecycle_state, i.approval_priority, i.tenant_id, i.entity_id,
           COALESCE(pay.payment_total, 0) AS payment_total,
           COALESCE(pay.payment_count, 0) AS payment_count
      FROM invoices i
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS payment_total, COUNT(id) AS payment_count
          FROM payments WHERE status = 'confirmed' GROUP BY invoice_id
      ) pay ON pay.invoice_id = i.id
     WHERE i.tenant_id = ?
       ${entityClause}
       AND i.lifecycle_state IN ('Processed','Queued for Payment','Exception Hold')
     ORDER BY COALESCE(i.due_date, i.invoice_date) ASC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;
  const rows = await query(sql, params);
  const enrichment = await loadEnrichmentForInvoices(rows, tenantId, settings);

  const items = [];
  for (const inv of rows) {
    const vendor = enrichment.vendorById.get(String(inv.vendor_id));
    const vendorBank = enrichment.vendorBankById.get(String(inv.vendor_id));
    const audit = enrichment.auditByInvoice.get(String(inv.id)) || [];
    const recentVendorInvoices = enrichment.recentByVendor.get(String(inv.vendor_id)) || [];
    const lastApprovalAt = audit.length > 0 ? audit[audit.length - 1].created_at : null;

    const flagCtx = {
      invoice: inv,
      vendor,
      vendorBank,
      paidInvoiceCount: enrichment.paidCountByVendor.get(String(inv.vendor_id)) ?? 0,
      vendorAvgAmount: enrichment.avgByVendor.get(String(inv.vendor_id)) ?? 0,
      recentVendorInvoices,
      hasMatchingGrn: inv.po_number ? enrichment.grnPoSet.has(String(inv.po_number)) : true,
      approvalCount: audit.filter((a) =>
        String(a.action || '')
          .toLowerCase()
          .includes('approve')
      ).length,
      lastApprovalAt,
      settings,
    };

    const flags = evaluateRiskFlags(flagCtx);
    const clearedRow = enrichment.clearedFlagsByInvoice.get(String(inv.id));

    // Persist + auto-hold (best-effort, errors swallowed)
    try {
      await persistFlags(inv.id, tenantId, flags);
      await autoHoldOnHighSeverity(inv.id, tenantId, flags);
    } catch {
      /* ignore — DB not migrated or transient */
    }

    items.push(adaptInvoice(inv, { vendor, vendorBank, audit }, flags, clearedRow));
  }

  // Optional client-side filters
  let filtered = items;
  if (status && status !== 'all') {
    filtered = filtered.filter((it) => it.status === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.ref.toLowerCase().includes(q) ||
        it.vendor.gstin.toLowerCase().includes(q)
    );
  }
  return { data: filtered, page, limit, total: filtered.length };
}

// ============================================================================
// Single-item detail
// ============================================================================

async function buildSingleQueueItem(invoiceId, tenantId) {
  const rows = await query(
    `SELECT i.id, i.invoice_number, i.invoice_date, i.due_date, i.vendor_name, i.vendor_id,
            i.vendor_gstin, i.po_number, i.currency, i.total_amount,
            i.lifecycle_state, i.approval_priority, i.tenant_id, i.entity_id,
            COALESCE(pay.payment_total, 0) AS payment_total
       FROM invoices i
       LEFT JOIN (
         SELECT invoice_id, SUM(amount) AS payment_total
           FROM payments WHERE status = 'confirmed' GROUP BY invoice_id
       ) pay ON pay.invoice_id = i.id
      WHERE i.id = ? AND i.tenant_id = ? LIMIT 1`,
    [invoiceId, tenantId]
  );
  if (!rows.length) return null;
  const inv = rows[0];
  const settings = await getSettings(tenantId);
  const enrichment = await loadEnrichmentForInvoices([inv], tenantId, settings);
  const vendor = enrichment.vendorById.get(String(inv.vendor_id));
  const vendorBank = enrichment.vendorBankById.get(String(inv.vendor_id));
  const audit = enrichment.auditByInvoice.get(String(inv.id)) || [];
  const recentVendorInvoices = enrichment.recentByVendor.get(String(inv.vendor_id)) || [];
  const lastApprovalAt = audit.length > 0 ? audit[audit.length - 1].created_at : null;

  const flags = evaluateRiskFlags({
    invoice: inv,
    vendor,
    vendorBank,
    paidInvoiceCount: enrichment.paidCountByVendor.get(String(inv.vendor_id)) ?? 0,
    vendorAvgAmount: enrichment.avgByVendor.get(String(inv.vendor_id)) ?? 0,
    recentVendorInvoices,
    hasMatchingGrn: inv.po_number ? enrichment.grnPoSet.has(String(inv.po_number)) : true,
    approvalCount: audit.filter((a) =>
      String(a.action || '')
        .toLowerCase()
        .includes('approve')
    ).length,
    lastApprovalAt,
    settings,
  });
  const clearedRow = enrichment.clearedFlagsByInvoice.get(String(inv.id));
  return adaptInvoice(inv, { vendor, vendorBank, audit }, flags, clearedRow);
}

// ============================================================================
// Route handler — registered by server/index.mjs
// ============================================================================

export async function handlePaymentsRoute(req, res, pathname, sendJson) {
  // Parse URL once for query-string access; existing handlers (auth/invoices)
  // pass only 4 args, so we derive `url` from req.
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  // ──────────────────────────────────────────────────────────────────────
  // Settings — tenant-level payment configuration
  // ──────────────────────────────────────────────────────────────────────

  // GET /api/ap/payment-settings/available-roles
  // Lists roles from the Access Master (roles_master.roles_master). Falls
  // back to the default static list when the table is empty or unavailable.
  // NOTE: declared BEFORE the generic /api/ap/payment-settings GET so the
  // more-specific path matches first.
  if (req.method === 'GET' && pathname === '/api/ap/payment-settings/available-roles') {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const FALLBACK_ROLES = [
      { key: 'admin', label: 'Admin' },
      { key: 'cfo', label: 'CFO' },
      { key: 'payment_approver', label: 'Payment Approver' },
      { key: 'finance_manager', label: 'Finance Manager' },
      { key: 'finance_executive', label: 'Finance Executive' },
    ];
    try {
      const rows = await query(
        `SELECT id, record_code, record_name, payload
           FROM roles_master.roles_master
           WHERE COALESCE(status, 'active') = 'active'
           ORDER BY record_name ASC`
      );
      if (!rows || rows.length === 0) {
        sendJson(res, 200, { success: true, data: FALLBACK_ROLES });
        return true;
      }
      const data = rows.map((r) => {
        let description;
        try {
          const payload =
            typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
          description = payload?.description || undefined;
        } catch {
          description = undefined;
        }
        return {
          key: normaliseRole(r.record_code || r.record_name || ''),
          label: r.record_name || r.record_code || '',
          ...(description ? { description } : {}),
        };
      });
      sendJson(res, 200, { success: true, data });
    } catch {
      sendJson(res, 200, { success: true, data: FALLBACK_ROLES });
    }
    return true;
  }

  // GET /api/ap/payment-settings
  if (req.method === 'GET' && pathname === '/api/ap/payment-settings') {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    try {
      const data = await getSettings(tenantId);
      sendJson(res, 200, { success: true, data });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return true;
  }

  // PUT /api/ap/payment-settings  (admin-only)
  if (req.method === 'PUT' && pathname === '/api/ap/payment-settings') {
    if (!isAdmin(req)) {
      sendJson(res, 403, { success: false, error: 'admin_role_required' });
      return true;
    }
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const body = await readJsonBody(req);
    try {
      const data = await updateSettings(tenantId, body);
      sendJson(res, 200, { success: true, data });
    } catch (e) {
      sendJson(res, e.statusCode || 500, { success: false, error: e.message });
    }
    return true;
  }

  // POST /api/ap/payment-settings/reset  (admin-only)
  if (req.method === 'POST' && pathname === '/api/ap/payment-settings/reset') {
    if (!isAdmin(req)) {
      sendJson(res, 403, { success: false, error: 'admin_role_required' });
      return true;
    }
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    try {
      const data = await resetSettings(tenantId);
      sendJson(res, 200, { success: true, data });
    } catch (e) {
      sendJson(res, e.statusCode || 500, { success: false, error: e.message });
    }
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Banking — bank accounts
  // ──────────────────────────────────────────────────────────────────────

  // GET /api/ap/banking/accounts
  if (req.method === 'GET' && pathname === '/api/ap/banking/accounts') {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    try {
      const rows = await query(
        'SELECT * FROM bank_accounts WHERE tenant_id = ? AND is_active = 1 ORDER BY is_default DESC, created_at ASC',
        [tenantId]
      );
      sendJson(res, 200, { success: true, data: rows.map(adaptBankAccount) });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return true;
  }

  // POST /api/ap/banking/accounts
  if (req.method === 'POST' && pathname === '/api/ap/banking/accounts') {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const body = await readJsonBody(req);
    const required = ['accountName', 'bankName', 'accountNumber', 'ifscCode'];
    for (const k of required) {
      if (!body[k]) {
        sendJson(res, 400, { success: false, error: `${k} required` });
        return true;
      }
    }
    if (!BANK_NAMES.has(String(body.bankName).toUpperCase())) {
      sendJson(res, 400, {
        success: false,
        error: `bankName must be one of ${[...BANK_NAMES].join(', ')}`,
      });
      return true;
    }
    const integrationMode = INTEGRATION_MODES.has(body.integrationMode)
      ? body.integrationMode
      : 'manual';
    const payoutFormat = PAYOUT_FORMATS.has(body.payoutFormat) ? body.payoutFormat : 'HDFC_BULK';
    const accountType = ACCOUNT_TYPES.has(body.accountType) ? body.accountType : 'current';
    const id = randomUUID();
    const entityId = body.entityId || readEntity(req, url) || tenantId;
    try {
      await query(
        `INSERT INTO bank_accounts
           (id, tenant_id, entity_id, account_name, bank_name, account_number,
            ifsc_code, account_type, integration_mode, api_key_ref, api_secret_ref,
            payout_format, bank_gl_code, is_active, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          id,
          tenantId,
          entityId,
          body.accountName,
          String(body.bankName).toUpperCase(),
          body.accountNumber,
          String(body.ifscCode).toUpperCase(),
          accountType,
          integrationMode,
          body.apiKeyRef || null,
          body.apiSecretRef || null,
          payoutFormat,
          body.bankGlCode || null,
          body.isDefault ? 1 : 0,
        ]
      );
      const rows = await query('SELECT * FROM bank_accounts WHERE id = ? LIMIT 1', [id]);
      sendJson(res, 200, { success: true, data: adaptBankAccount(rows[0]) });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return true;
  }

  // PUT /api/ap/banking/accounts/:id
  const acctUpdateMatch = pathname.match(/^\/api\/ap\/banking\/accounts\/([^/]+)$/);
  if (req.method === 'PUT' && acctUpdateMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const accountId = acctUpdateMatch[1];
    const body = await readJsonBody(req);
    const sets = [];
    const params = [];
    if (body.accountName !== undefined) {
      sets.push('account_name = ?');
      params.push(body.accountName);
    }
    if (body.integrationMode !== undefined) {
      if (!INTEGRATION_MODES.has(body.integrationMode)) {
        sendJson(res, 400, {
          success: false,
          error: 'integrationMode must be connected or manual',
        });
        return true;
      }
      sets.push('integration_mode = ?');
      params.push(body.integrationMode);
    }
    if (body.payoutFormat !== undefined) {
      if (!PAYOUT_FORMATS.has(body.payoutFormat)) {
        sendJson(res, 400, { success: false, error: 'invalid payoutFormat' });
        return true;
      }
      sets.push('payout_format = ?');
      params.push(body.payoutFormat);
    }
    if (body.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(body.isActive ? 1 : 0);
    }
    if (body.isDefault !== undefined) {
      sets.push('is_default = ?');
      params.push(body.isDefault ? 1 : 0);
    }
    if (body.bankGlCode !== undefined) {
      sets.push('bank_gl_code = ?');
      params.push(body.bankGlCode);
    }
    if (sets.length === 0) {
      sendJson(res, 400, { success: false, error: 'no_updatable_fields' });
      return true;
    }
    params.push(accountId, tenantId);
    try {
      await query(
        `UPDATE bank_accounts SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`,
        params
      );
      const rows = await query(
        'SELECT * FROM bank_accounts WHERE id = ? AND tenant_id = ? LIMIT 1',
        [accountId, tenantId]
      );
      if (!rows.length) {
        sendJson(res, 404, { success: false, error: 'not_found' });
      } else {
        sendJson(res, 200, { success: true, data: adaptBankAccount(rows[0]) });
      }
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return true;
  }

  // POST /api/ap/banking/accounts/:id/fetch-balance
  const fetchBalanceMatch = pathname.match(
    /^\/api\/ap\/banking\/accounts\/([^/]+)\/fetch-balance$/
  );
  if (req.method === 'POST' && fetchBalanceMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const accountId = fetchBalanceMatch[1];
    const rows = await query('SELECT * FROM bank_accounts WHERE id = ? AND tenant_id = ? LIMIT 1', [
      accountId,
      tenantId,
    ]);
    if (!rows.length) {
      sendJson(res, 404, { success: false, error: 'not_found' });
      return true;
    }
    const acct = rows[0];
    if (acct.integration_mode !== 'connected') {
      sendJson(res, 400, { success: false, error: 'account_is_manual_mode' });
      return true;
    }
    // Stub — real bank API integration is a future sprint.
    const mockBalance = Math.round(5_000_000 + Math.random() * 5_000_000);
    await query('UPDATE bank_accounts SET last_balance = ?, last_balance_at = NOW() WHERE id = ?', [
      mockBalance,
      accountId,
    ]);
    sendJson(res, 200, {
      success: true,
      data: { lastBalance: mockBalance, lastBalanceAt: new Date().toISOString(), mockMode: true },
    });
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Banking — payment batches
  // ──────────────────────────────────────────────────────────────────────

  // GET /api/ap/banking/batches
  if (req.method === 'GET' && pathname === '/api/ap/banking/batches') {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const status = url?.searchParams?.get?.('status') || '';
    const page = Math.max(1, Number(url?.searchParams?.get?.('page')) || 1);
    const limit = Math.min(Math.max(Number(url?.searchParams?.get?.('limit')) || 50, 1), 200);
    const offset = (page - 1) * limit;
    const conditions = ['tenant_id = ?'];
    const params = [tenantId];
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    try {
      const rows = await query(
        `SELECT * FROM bank_payment_batches WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
        params
      );
      sendJson(res, 200, { success: true, data: rows.map(adaptBatch), page, limit });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return true;
  }

  // POST /api/ap/banking/batches  — create from invoice ids
  if (req.method === 'POST' && pathname === '/api/ap/banking/batches') {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const body = await readJsonBody(req);
    try {
      const result = await createBatchFromInvoices({
        tenantId,
        bankAccountId: body.bankAccountId,
        invoiceIds: body.invoiceIds,
        paymentMode: body.paymentMode,
        paymentDate: body.paymentDate,
        createdBy: readActorEmail(req) || null,
      });
      const detail = await loadBatchWithItems(result.id, tenantId);
      sendJson(res, 200, { success: true, data: detail });
    } catch (e) {
      const status = e.statusCode || 500;
      const payload = { success: false, error: e.message };
      if (e.invoiceId) payload.invoiceId = e.invoiceId;
      sendJson(res, status, payload);
    }
    return true;
  }

  // GET /api/ap/banking/batches/:id
  const batchDetailMatch = pathname.match(/^\/api\/ap\/banking\/batches\/([^/]+)$/);
  if (req.method === 'GET' && batchDetailMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const detail = await loadBatchWithItems(batchDetailMatch[1], tenantId);
    if (!detail) {
      sendJson(res, 404, { success: false, error: 'not_found' });
      return true;
    }
    sendJson(res, 200, { success: true, data: detail });
    return true;
  }

  // POST /api/ap/banking/batches/:id/submit
  const submitMatch = pathname.match(/^\/api\/ap\/banking\/batches\/([^/]+)\/submit$/);
  if (req.method === 'POST' && submitMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const batchId = submitMatch[1];
    const cur = await query(
      'SELECT status FROM bank_payment_batches WHERE id = ? AND tenant_id = ?',
      [batchId, tenantId]
    );
    if (!cur.length) {
      sendJson(res, 404, { success: false, error: 'not_found' });
      return true;
    }
    if (cur[0].status !== 'draft') {
      sendJson(res, 400, { success: false, error: 'invalid_status_transition' });
      return true;
    }
    await query("UPDATE bank_payment_batches SET status = 'pending_approval' WHERE id = ?", [
      batchId,
    ]);
    sendJson(res, 200, { success: true, data: { id: batchId, status: 'pending_approval' } });
    return true;
  }

  // POST /api/ap/banking/batches/:id/approve  (approver only — live config)
  const batchApproveMatch = pathname.match(/^\/api\/ap\/banking\/batches\/([^/]+)\/approve$/);
  if (req.method === 'POST' && batchApproveMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    if (!(await isPaymentApprover(req, tenantId))) {
      sendJson(res, 403, { success: false, error: 'approver_role_required' });
      return true;
    }
    const batchId = batchApproveMatch[1];
    const cur = await query(
      'SELECT status FROM bank_payment_batches WHERE id = ? AND tenant_id = ?',
      [batchId, tenantId]
    );
    if (!cur.length) {
      sendJson(res, 404, { success: false, error: 'not_found' });
      return true;
    }
    if (cur[0].status !== 'pending_approval') {
      sendJson(res, 400, { success: false, error: 'invalid_status_transition' });
      return true;
    }
    await query(
      "UPDATE bank_payment_batches SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?",
      [readActorEmail(req) || null, batchId]
    );
    sendJson(res, 200, { success: true, data: { id: batchId, status: 'approved' } });
    return true;
  }

  // POST /api/ap/banking/batches/:id/reject  (approver only — live config)
  const batchRejectMatch = pathname.match(/^\/api\/ap\/banking\/batches\/([^/]+)\/reject$/);
  if (req.method === 'POST' && batchRejectMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    if (!(await isPaymentApprover(req, tenantId))) {
      sendJson(res, 403, { success: false, error: 'approver_role_required' });
      return true;
    }
    const batchId = batchRejectMatch[1];
    const body = await readJsonBody(req);
    await query(
      "UPDATE bank_payment_batches SET status = 'cancelled', reject_reason = ? WHERE id = ? AND tenant_id = ?",
      [body.reason || null, batchId, tenantId]
    );
    sendJson(res, 200, { success: true, data: { id: batchId, status: 'cancelled' } });
    return true;
  }

  // POST /api/ap/banking/batches/:id/generate-file
  const generateFileMatch = pathname.match(/^\/api\/ap\/banking\/batches\/([^/]+)\/generate-file$/);
  if (req.method === 'POST' && generateFileMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const batchId = generateFileMatch[1];
    const detail = await loadBatchWithItems(batchId, tenantId);
    if (!detail) {
      sendJson(res, 404, { success: false, error: 'not_found' });
      return true;
    }
    if (detail.batch.integrationMode !== 'manual') {
      sendJson(res, 400, { success: false, error: 'batch_is_connected_mode' });
      return true;
    }
    if (detail.batch.status !== 'approved') {
      sendJson(res, 400, { success: false, error: 'batch_must_be_approved' });
      return true;
    }
    const acctRows = await query('SELECT * FROM bank_accounts WHERE id = ? LIMIT 1', [
      detail.batch.bankAccountId,
    ]);
    const acct = acctRows[0];
    const format = acct?.payout_format || 'HDFC_BULK';
    const file = await generatePayoutFile(
      {
        batch_ref: detail.batch.batchRef,
        payment_date: detail.batch.paymentDate || new Date(),
        debit_account_number: acct?.account_number || '',
      },
      detail.rawItems.map((r) => ({
        bank_account_no: r.bank_account_no,
        ifsc_code: r.ifsc_code,
        vendor_name: r.vendor_name,
        amount: r.amount,
        payment_mode: r.payment_mode,
        narration: r.narration,
        client_ref: r.client_ref,
      })),
      format
    );
    await fs.mkdir(PAYOUT_DIR, { recursive: true });
    const fullPath = path.join(PAYOUT_DIR, file.filename);
    await fs.writeFile(fullPath, file.content, 'utf8');
    await query(
      `UPDATE bank_payment_batches
          SET status = 'file_generated', payout_file_path = ?, payout_file_format = ?,
              file_generated_at = NOW()
        WHERE id = ?`,
      [fullPath, format, batchId]
    );
    sendJson(res, 200, {
      success: true,
      data: {
        downloadUrl: `/api/ap/banking/batches/${batchId}/download-file`,
        filename: file.filename,
        format,
      },
    });
    return true;
  }

  // GET /api/ap/banking/batches/:id/download-file  (streams file)
  const downloadFileMatch = pathname.match(/^\/api\/ap\/banking\/batches\/([^/]+)\/download-file$/);
  if (req.method === 'GET' && downloadFileMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const batchId = downloadFileMatch[1];
    const rows = await query(
      'SELECT payout_file_path FROM bank_payment_batches WHERE id = ? AND tenant_id = ? LIMIT 1',
      [batchId, tenantId]
    );
    if (!rows.length || !rows[0].payout_file_path) {
      sendJson(res, 404, { success: false, error: 'file_not_generated' });
      return true;
    }
    try {
      const filePath = rows[0].payout_file_path;
      const data = await fs.readFile(filePath);
      const filename = path.basename(filePath);
      const ext = path.extname(filename).toLowerCase();
      const mime = ext === '.csv' ? 'text/csv' : 'text/plain';
      res.writeHead(200, {
        'Content-Type': `${mime}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': data.length,
      });
      res.end(data);
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return true;
  }

  // POST /api/ap/banking/batches/:id/upload-utr  (multipart)
  const uploadUtrMatch = pathname.match(/^\/api\/ap\/banking\/batches\/([^/]+)\/upload-utr$/);
  if (req.method === 'POST' && uploadUtrMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const batchId = uploadUtrMatch[1];
    const detail = await loadBatchWithItems(batchId, tenantId);
    if (!detail) {
      sendJson(res, 404, { success: false, error: 'not_found' });
      return true;
    }
    const ct = req.headers['content-type'] || '';
    let fileText = '';
    if (ct.includes('multipart/form-data')) {
      const boundary = ct.split('boundary=')[1];
      if (!boundary) {
        sendJson(res, 400, { success: false, error: 'missing_multipart_boundary' });
        return true;
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks);
      const parts = parseMultipart(raw, boundary);
      const filePart = parts.find((p) => p.name === 'utrFile' || p.name === 'file');
      if (!filePart) {
        sendJson(res, 400, { success: false, error: 'utrFile field required' });
        return true;
      }
      fileText = filePart.data.toString('utf8');
    } else {
      const body = await readJsonBody(req);
      fileText = String(body.content || '');
    }
    if (!fileText.trim()) {
      sendJson(res, 400, { success: false, error: 'empty_file' });
      return true;
    }

    const parsed = await parseUTRFile(fileText, 'auto');
    const byClientRef = new Map(parsed.map((p) => [p.clientRef, p]));

    const matched = [];
    const unmatched = [];
    const confirmedItems = [];
    for (const it of detail.rawItems) {
      const ack = byClientRef.get(it.client_ref);
      if (!ack) {
        unmatched.push(adaptBatchItem(it));
        continue;
      }
      await query(
        `UPDATE bank_payment_batch_items
            SET utr = ?, utr_status = ?, utr_confirmed_at = NOW()
          WHERE id = ?`,
        [ack.utr, ack.status, it.id]
      );
      matched.push({ clientRef: it.client_ref, utr: ack.utr, status: ack.status });
      if (ack.status === 'confirmed') confirmedItems.push(it);
    }

    let jvRef = null;
    if (confirmedItems.length > 0) {
      const acctRows = await query('SELECT bank_gl_code FROM bank_accounts WHERE id = ? LIMIT 1', [
        detail.batch.bankAccountId,
      ]);
      const jv = await createPaymentJV(
        {
          batch_ref: detail.batch.batchRef,
          payment_date: detail.batch.paymentDate || new Date(),
          bank_gl_code: acctRows[0]?.bank_gl_code,
        },
        confirmedItems.map((it) => ({
          invoice_id: it.invoice_id,
          invoice_ref: it.client_ref,
          vendor_name: it.vendor_name,
          amount: it.amount,
        })),
        tenantId
      );
      jvRef = jv.jvRef;
    }

    const allConfirmed =
      detail.rawItems.length > 0 &&
      detail.rawItems.every((it) => byClientRef.get(it.client_ref)?.status === 'confirmed');
    const newStatus = allConfirmed ? 'executed' : 'processing';
    await query(
      `UPDATE bank_payment_batches
          SET status = ?, utr_ingested_at = NOW(),
              jv_created = ?, jv_ref = ?, jv_created_at = ?
        WHERE id = ?`,
      [newStatus, jvRef ? 1 : 0, jvRef, jvRef ? new Date() : null, batchId]
    );

    sendJson(res, 200, {
      success: true,
      data: {
        matched,
        unmatched,
        jvRef,
        status: newStatus,
        matchCount: matched.length,
        unmatchedCount: unmatched.length,
      },
    });
    return true;
  }

  // POST /api/ap/banking/batches/:id/initiate  (Mode A stub)
  const initiateMatch = pathname.match(/^\/api\/ap\/banking\/batches\/([^/]+)\/initiate$/);
  if (req.method === 'POST' && initiateMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const batchId = initiateMatch[1];
    const detail = await loadBatchWithItems(batchId, tenantId);
    if (!detail) {
      sendJson(res, 404, { success: false, error: 'not_found' });
      return true;
    }
    if (detail.batch.integrationMode !== 'connected') {
      sendJson(res, 400, { success: false, error: 'batch_is_manual_mode' });
      return true;
    }
    if (detail.batch.status !== 'approved') {
      sendJson(res, 400, { success: false, error: 'batch_must_be_approved' });
      return true;
    }
    // Stub: simulate bank acceptance
    await query(
      `UPDATE bank_payment_batches
          SET status = 'processing', initiated_at = NOW(),
              bank_transaction_ref = ?
        WHERE id = ?`,
      [`MOCK-${randomUUID().slice(0, 8).toUpperCase()}`, batchId]
    );
    // Generate mock UTRs for each item
    for (const it of detail.rawItems) {
      const mockUtr = `UTR${yyyymmdd()}${it.id.slice(0, 8).toUpperCase()}`;
      await query(
        `UPDATE bank_payment_batch_items
            SET utr = ?, utr_status = 'confirmed', utr_confirmed_at = NOW()
          WHERE id = ?`,
        [mockUtr, it.id]
      );
    }
    const acctRows = await query('SELECT bank_gl_code FROM bank_accounts WHERE id = ? LIMIT 1', [
      detail.batch.bankAccountId,
    ]);
    const jv = await createPaymentJV(
      {
        batch_ref: detail.batch.batchRef,
        payment_date: detail.batch.paymentDate || new Date(),
        bank_gl_code: acctRows[0]?.bank_gl_code,
      },
      detail.rawItems.map((it) => ({
        invoice_id: it.invoice_id,
        invoice_ref: it.client_ref,
        vendor_name: it.vendor_name,
        amount: it.amount,
      })),
      tenantId
    );
    await query(
      `UPDATE bank_payment_batches
          SET status = 'executed', jv_created = 1, jv_ref = ?, jv_created_at = NOW()
        WHERE id = ?`,
      [jv.jvRef, batchId]
    );
    sendJson(res, 200, {
      success: true,
      data: { initiated: true, mockMode: true, jvRef: jv.jvRef, status: 'executed' },
    });
    return true;
  }

  // GET /api/ap/payment-forecast
  if (req.method === 'GET' && pathname === '/api/ap/payment-forecast') {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const fromStr = url?.searchParams?.get?.('from') || '';
    const toStr = url?.searchParams?.get?.('to') || '';
    const fromDate = parseIsoDate(fromStr);
    const toDate = parseIsoDate(toStr);
    if (!fromDate || !toDate) {
      sendJson(res, 400, { success: false, error: 'from and to (YYYY-MM-DD) required' });
      return true;
    }
    if (fromDate.getTime() > toDate.getTime()) {
      sendJson(res, 400, { success: false, error: 'from must be on or before to' });
      return true;
    }
    const groupBy = (url?.searchParams?.get?.('groupBy') || 'due_date').toLowerCase();
    if (!VALID_GROUP_BYS.has(groupBy)) {
      sendJson(res, 400, {
        success: false,
        error: `groupBy must be one of: ${[...VALID_GROUP_BYS].join(', ')}`,
      });
      return true;
    }
    const status = (url?.searchParams?.get?.('status') || 'unpaid').toLowerCase();
    const entityId = readEntity(req, url);
    try {
      const data = await buildForecast({
        tenantId,
        entityId,
        fromDate,
        toDate,
        groupBy,
        status,
      });
      sendJson(res, 200, { success: true, ...data });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return true;
  }

  // GET /api/ap/payment-queue/flags/summary
  if (req.method === 'GET' && pathname === '/api/ap/payment-queue/flags/summary') {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    try {
      const rows = await query(
        `SELECT severity, COUNT(*) AS cnt, COALESCE(SUM(i.total_amount), 0) AS total_value
           FROM invoice_risk_flags f
           JOIN invoices i ON i.id = f.invoice_id
          WHERE f.tenant_id = ? AND f.is_cleared = 0
          GROUP BY severity`,
        [tenantId]
      );
      let count = 0;
      let totalValue = 0;
      const sev = { high: 0, medium: 0, low: 0 };
      for (const r of rows) {
        count += Number(r.cnt) || 0;
        totalValue += Number(r.total_value) || 0;
        sev[r.severity] = Number(r.cnt) || 0;
      }
      sendJson(res, 200, {
        success: true,
        data: {
          count,
          totalValue,
          highCount: sev.high,
          mediumCount: sev.medium,
          lowCount: sev.low,
        },
      });
    } catch {
      sendJson(res, 200, {
        success: true,
        data: { count: 0, totalValue: 0, highCount: 0, mediumCount: 0, lowCount: 0 },
      });
    }
    return true;
  }

  // GET /api/ap/payment-queue
  if (req.method === 'GET' && pathname === '/api/ap/payment-queue') {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const entityId = readEntity(req, url);
    const status = url?.searchParams?.get?.('status') || '';
    const search = url?.searchParams?.get?.('search') || '';
    const page = Number(url?.searchParams?.get?.('page')) || 1;
    const limit = Math.min(Math.max(Number(url?.searchParams?.get?.('limit')) || 100, 1), 500);
    try {
      const result = await buildPaymentQueue({
        tenantId,
        entityId,
        status,
        search,
        page,
        limit,
      });
      sendJson(res, 200, { success: true, ...result });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return true;
  }

  // GET /api/ap/payment-queue/:id  (must come AFTER summary + list)
  const detailMatch = pathname.match(/^\/api\/ap\/payment-queue\/([^/]+)$/);
  if (req.method === 'GET' && detailMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const invoiceId = detailMatch[1];
    try {
      const item = await buildSingleQueueItem(invoiceId, tenantId);
      if (!item) {
        sendJson(res, 404, { success: false, error: 'not_found' });
        return true;
      }
      sendJson(res, 200, { success: true, data: item });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return true;
  }

  // POST /api/ap/payment-queue/:id/due-date
  const dueMatch = pathname.match(/^\/api\/ap\/payment-queue\/([^/]+)\/due-date$/);
  if (req.method === 'POST' && dueMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const invoiceId = dueMatch[1];
    const body = await readJsonBody(req);
    const newDue = body.newDue || body.new_due || '';
    const reason = body.reason || '';
    if (!newDue) {
      sendJson(res, 400, { success: false, error: 'newDue required' });
      return true;
    }
    if (!reason) {
      sendJson(res, 400, { success: false, error: 'reason required' });
      return true;
    }

    const cur = await query(
      'SELECT due_date FROM invoices WHERE id = ? AND tenant_id = ? LIMIT 1',
      [invoiceId, tenantId]
    );
    if (!cur.length) {
      sendJson(res, 404, { success: false, error: 'not_found' });
      return true;
    }
    const oldDue = cur[0].due_date ? String(cur[0].due_date).slice(0, 10) : '';

    await query(
      'UPDATE invoices SET due_date = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
      [newDue, invoiceId, tenantId]
    );
    try {
      await query(
        `INSERT INTO invoice_audit_log
           (id, tenant_id, invoice_id, action, change_type, old_value, new_value, reason, actor_id, actor_source, created_at)
         VALUES (?, ?, ?, 'due_date_change', 'due_date', ?, ?, ?, ?, 'user', NOW())`,
        [randomUUID(), tenantId, invoiceId, oldDue, newDue, reason, readActorEmail(req)]
      );
    } catch {
      /* audit columns may not be migrated yet */
    }
    sendJson(res, 200, { success: true, data: { invoiceId, oldDue, newDue, reason } });
    return true;
  }

  // POST /api/ap/payment-queue/:id/pay
  const payMatch = pathname.match(/^\/api\/ap\/payment-queue\/([^/]+)\/pay$/);
  if (req.method === 'POST' && payMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const invoiceId = payMatch[1];
    const body = await readJsonBody(req);
    const payAmt = Number(body.payAmt ?? body.pay_amt ?? 0);
    const payDate = body.payDate || body.pay_date || new Date().toISOString().slice(0, 10);
    const utr = body.utr || '';
    const newStatus = body.newStatus || body.new_status || 'partial';
    if (!(payAmt > 0)) {
      sendJson(res, 400, { success: false, error: 'payAmt must be > 0' });
      return true;
    }

    const inv = await query(
      'SELECT id, total_amount, entity_id, currency FROM invoices WHERE id = ? AND tenant_id = ? LIMIT 1',
      [invoiceId, tenantId]
    );
    if (!inv.length) {
      sendJson(res, 404, { success: false, error: 'not_found' });
      return true;
    }
    const total = Number(inv[0].total_amount) || 0;

    await query(
      `INSERT INTO payments (id, tenant_id, entity_id, invoice_id, payment_date, utr, amount, payment_mode, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
      [
        randomUUID(),
        tenantId,
        inv[0].entity_id || null,
        invoiceId,
        payDate,
        utr || null,
        payAmt,
        body.paymentMode || 'neft',
        body.notes || null,
      ]
    );

    // Recompute paid total and update lifecycle
    const paidRow = await query(
      "SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE invoice_id = ? AND status = 'confirmed'",
      [invoiceId]
    );
    const paid = Number(paidRow[0]?.paid) || 0;
    const finalStatus =
      paid >= total ? 'Paid' : newStatus === 'paid' ? 'Paid' : 'Queued for Payment';
    await query('UPDATE invoices SET lifecycle_state = ?, updated_at = NOW() WHERE id = ?', [
      finalStatus,
      invoiceId,
    ]);

    sendJson(res, 200, {
      success: true,
      data: { invoiceId, paidTotal: paid, lifecycleState: finalStatus },
    });
    return true;
  }

  // POST /api/ap/payment-queue/:id/hold
  const holdMatch = pathname.match(/^\/api\/ap\/payment-queue\/([^/]+)\/hold$/);
  if (req.method === 'POST' && holdMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    const invoiceId = holdMatch[1];
    const cur = await query(
      'SELECT lifecycle_state FROM invoices WHERE id = ? AND tenant_id = ? LIMIT 1',
      [invoiceId, tenantId]
    );
    if (!cur.length) {
      sendJson(res, 404, { success: false, error: 'not_found' });
      return true;
    }
    const isHeld = String(cur[0].lifecycle_state || '').toLowerCase() === 'exception hold';
    const next = isHeld ? 'Queued for Payment' : 'Exception Hold';
    await query('UPDATE invoices SET lifecycle_state = ?, updated_at = NOW() WHERE id = ?', [
      next,
      invoiceId,
    ]);
    sendJson(res, 200, { success: true, data: { invoiceId, lifecycleState: next } });
    return true;
  }

  // POST /api/ap/payment-queue/:id/clear-flags  (approver-only — live config)
  const clearMatch = pathname.match(/^\/api\/ap\/payment-queue\/([^/]+)\/clear-flags$/);
  if (req.method === 'POST' && clearMatch) {
    const tenantId = readTenant(req, url);
    if (!tenantId) {
      sendJson(res, 400, { success: false, error: 'tenant_required' });
      return true;
    }
    if (!(await isPaymentApprover(req, tenantId))) {
      sendJson(res, 403, { success: false, error: 'approver_role_required' });
      return true;
    }
    const invoiceId = clearMatch[1];
    const body = await readJsonBody(req);
    const note = String(body.clearanceNote || body.clearance_note || '').trim();
    if (!note) {
      sendJson(res, 400, { success: false, error: 'clearanceNote required' });
      return true;
    }
    const actor = readActorEmail(req) || 'approver';

    await query(
      `UPDATE invoice_risk_flags
          SET is_cleared = 1, cleared_by = ?, clearance_note = ?, cleared_at = NOW()
        WHERE invoice_id = ? AND tenant_id = ? AND is_cleared = 0`,
      [actor, note, invoiceId, tenantId]
    );
    // Release hold so the invoice goes back to the queue
    await query(
      `UPDATE invoices SET lifecycle_state = 'Queued for Payment', updated_at = NOW()
         WHERE id = ? AND tenant_id = ? AND lifecycle_state = 'Exception Hold'`,
      [invoiceId, tenantId]
    );
    sendJson(res, 200, {
      success: true,
      data: { invoiceId, clearedBy: actor, clearanceNote: note },
    });
    return true;
  }

  return false;
}

// ============================================================================
// Payment Forecast — GET /api/ap/payment-forecast
// ============================================================================

const FORECAST_LIFECYCLE_STATES = ['Queued for Payment', 'Exception Hold'];
const VALID_GROUP_BYS = new Set([
  'due_date',
  'vendor',
  'department',
  'type',
  'priority',
  'msme_critical',
]);

function parseIsoDate(s) {
  if (!s) return null;
  // Accept YYYY-MM-DD only
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function diffDaysInclusive(fromDate, toDate) {
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000)) + 1;
}

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

function startOfIsoWeekUtc(d) {
  // ISO weeks start Monday. d is a Date (UTC midnight).
  const day = d.getUTCDay() || 7; // 1..7 (Mon..Sun)
  const monday = new Date(d.getTime());
  monday.setUTCDate(d.getUTCDate() - (day - 1));
  return monday;
}

function buildPaymentQueueItemFromForecastRow(row) {
  // Lightweight item shape — no full enrichment, just enough for the
  // expandable table rows in the Forecast tab.
  const total = Number(row.total_amount) || 0;
  const paid = Number(row.payment_total) || 0;
  return {
    id: String(row.id),
    name: row.vendor_name || row.vendor_legal_name || '—',
    ref: row.invoice_number || String(row.id),
    type: String(row.invoice_type || '').toLowerCase() === 'advance' ? 'advance' : 'invoice',
    amount: total,
    paidAmt: paid,
    invoiceDate: row.invoice_date ? String(row.invoice_date).slice(0, 10) : '',
    due: row.due_date ? String(row.due_date).slice(0, 10) : '',
    priority:
      String(row.approval_priority || '').toLowerCase() === 'critical'
        ? 'critical'
        : String(row.approval_priority || '').toLowerCase() === 'high'
          ? 'high'
          : String(row.approval_priority || '').toLowerCase() === 'low'
            ? 'low'
            : 'medium',
    status:
      String(row.lifecycle_state || '').toLowerCase() === 'exception hold'
        ? 'onhold'
        : paid > 0 && paid < total
          ? 'partial'
          : paid >= total && total > 0
            ? 'paid'
            : 'queued',
    isMSME: row.is_msme === 1,
    isCritical:
      row.is_statutory === 1 || String(row.approval_priority || '').toLowerCase() === 'critical',
    critTag:
      row.is_statutory === 1
        ? 'statutory'
        : String(row.invoice_type || '').toLowerCase() === 'advance'
          ? 'advance'
          : null,
    dept: row.cost_centre_name || row.department || '',
    vendor: {
      gstin: row.vendor_gstin || '',
      pan: row.vendor_pan || '',
      bank: '',
      masterName: row.vendor_legal_name || row.vendor_name || '',
    },
    flags: [],
    cleared: true,
    clearanceNote: '',
    approvalTrail: [],
    msmeRemaining: null,
  };
}

/**
 * Aggregate forecast invoices by the requested groupBy mode.
 * Returns ForecastTableRow[] in the response shape.
 */
function aggregateForecastTable(items, groupBy) {
  const buckets = new Map();
  for (const it of items) {
    let key;
    let label;
    if (groupBy === 'due_date') {
      key = it.due || '—';
      label = key;
    } else if (groupBy === 'vendor') {
      key = it.vendor.masterName || it.name || '—';
      label = key;
    } else if (groupBy === 'department') {
      key = it.dept || 'Unassigned';
      label = key;
    } else if (groupBy === 'type') {
      key = it.type;
      label = it.type === 'advance' ? 'Advance' : 'Invoice';
    } else if (groupBy === 'priority') {
      key = it.priority;
      label = key.charAt(0).toUpperCase() + key.slice(1);
    } else if (groupBy === 'msme_critical') {
      key =
        it.isMSME && it.isCritical
          ? 'msme_critical'
          : it.isMSME
            ? 'msme'
            : it.isCritical
              ? 'critical'
              : 'standard';
      label =
        key === 'msme_critical'
          ? 'MSME + Critical'
          : key === 'msme'
            ? 'MSME'
            : key === 'critical'
              ? 'Critical / Statutory'
              : 'Standard';
    } else {
      key = '—';
      label = '—';
    }

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        groupKey: key,
        groupValue: label,
        count: 0,
        totalAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        msmeAmount: 0,
        criticalAmount: 0,
        earliestDue: '',
        latestDue: '',
        items: [],
      };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    bucket.totalAmount += it.amount;
    bucket.paidAmount += it.paidAmt;
    bucket.outstandingAmount += Math.max(0, it.amount - it.paidAmt);
    if (it.isMSME) bucket.msmeAmount += it.amount;
    if (it.isCritical) bucket.criticalAmount += it.amount;
    if (it.due) {
      if (!bucket.earliestDue || it.due < bucket.earliestDue) bucket.earliestDue = it.due;
      if (!bucket.latestDue || it.due > bucket.latestDue) bucket.latestDue = it.due;
    }
    bucket.items.push(it);
  }

  const rows = [...buckets.values()];
  // Drop heavy items[] for due_date grouping to keep payload small.
  if (groupBy === 'due_date') {
    for (const r of rows) delete r.items;
  }
  // Sort: largest totalAmount first
  rows.sort((a, b) => b.totalAmount - a.totalAmount);
  return rows;
}

/**
 * Build daily-or-weekly chart series. If the range spans more than 60 days,
 * we collapse to ISO-week buckets (Monday) to avoid overplotting.
 */
function buildForecastChart(items, fromDate, toDate) {
  const span = diffDaysInclusive(fromDate, toDate);
  const useWeekly = span > 60;

  const buckets = new Map();
  for (const it of items) {
    if (!it.due) continue;
    const dueDate = parseIsoDate(it.due);
    if (!dueDate) continue;
    if (dueDate < fromDate || dueDate > toDate) continue;
    const bucketKey = useWeekly ? isoDay(startOfIsoWeekUtc(dueDate)) : isoDay(dueDate);
    let b = buckets.get(bucketKey);
    if (!b) {
      b = { date: bucketKey, total: 0, msme: 0, critical: 0, standard: 0 };
      buckets.set(bucketKey, b);
    }
    b.total += it.amount;
    if (it.isMSME) b.msme += it.amount;
    else if (it.isCritical) b.critical += it.amount;
    else b.standard += it.amount;
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function buildForecast({ tenantId, entityId, fromDate, toDate, groupBy, status }) {
  const params = [tenantId];
  let entityClause = '';
  if (entityId) {
    entityClause = ' AND i.entity_id = ? ';
    params.push(entityId);
  }

  // Vendor join for is_msme, vendor_legal_name. Tolerant if column missing.
  const sql = `
    SELECT i.id, i.invoice_number, i.invoice_date, i.due_date, i.vendor_name,
           i.vendor_id, i.vendor_gstin, i.po_number, i.currency, i.total_amount,
           i.lifecycle_state, i.approval_priority, i.entity_id,
           COALESCE(i.invoice_type, '') AS invoice_type,
           COALESCE(i.is_statutory, 0) AS is_statutory,
           COALESCE(i.cost_centre_name, '') AS cost_centre_name,
           COALESCE(v.is_msme, 0) AS is_msme,
           COALESCE(v.vendor_legal_name, '') AS vendor_legal_name,
           COALESCE(v.pan, '') AS vendor_pan,
           COALESCE(pay.payment_total, 0) AS payment_total,
           COALESCE(pay.payment_count, 0) AS payment_count
      FROM invoices i
      LEFT JOIN p2p_schema_mt.vendors v ON v.id = i.vendor_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS payment_total, COUNT(id) AS payment_count
          FROM payments WHERE status = 'confirmed' GROUP BY invoice_id
      ) pay ON pay.invoice_id = i.id
     WHERE i.tenant_id = ?
       ${entityClause}
       AND i.lifecycle_state IN (${FORECAST_LIFECYCLE_STATES.map(() => '?').join(',')})
       AND i.due_date IS NOT NULL
       AND i.due_date BETWEEN ? AND ?
     ORDER BY i.due_date ASC
  `;
  params.push(...FORECAST_LIFECYCLE_STATES, isoDay(fromDate), isoDay(toDate));

  let rows;
  try {
    rows = await query(sql, params);
  } catch {
    rows = [];
  }

  const items = rows.map(buildPaymentQueueItemFromForecastRow);

  // status filter (default: unpaid — i.e. anything not fully paid)
  let filtered = items;
  if (status === 'unpaid') {
    filtered = filtered.filter((i) => i.status !== 'paid');
  } else if (status === 'paid' || status === 'partial' || status === 'onhold') {
    filtered = filtered.filter((i) => i.status === status);
  }

  const totalOutflow = filtered.reduce((s, i) => s + Math.max(0, i.amount - i.paidAmt), 0);
  const msmeOutflow = filtered
    .filter((i) => i.isMSME)
    .reduce((s, i) => s + Math.max(0, i.amount - i.paidAmt), 0);
  const criticalOutflow = filtered
    .filter((i) => i.isCritical)
    .reduce((s, i) => s + Math.max(0, i.amount - i.paidAmt), 0);

  const chart = buildForecastChart(filtered, fromDate, toDate);
  const table = aggregateForecastTable(filtered, groupBy);

  return {
    meta: {
      from: isoDay(fromDate),
      to: isoDay(toDate),
      groupBy,
      totalOutflow,
      msmeOutflow,
      criticalOutflow,
      bankBalance: null, // banking not connected yet — Banking tab placeholder
      netCashPosition: null,
      bankConnected: false,
      currency: 'INR',
    },
    chart,
    table,
  };
}

// ============================================================================
// Banking — bank accounts + payment batches (Mode A connected / Mode B manual)
// ============================================================================

const PAYOUT_DIR = process.env.PAYOUT_DIR || '/tmp/payouts';

const BANK_NAMES = new Set(['HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK', 'OTHER']);
const ACCOUNT_TYPES = new Set(['current', 'savings', 'cc']);
const INTEGRATION_MODES = new Set(['connected', 'manual']);
const PAYOUT_FORMATS = new Set(['HDFC_BULK', 'ICICI_BULK', 'GENERIC_CSV']);
const PAYMENT_MODES = new Set(['NEFT', 'RTGS', 'IMPS', 'UPI']);

function pad2(n) {
  return String(n).padStart(2, '0');
}
function yyyymmdd(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}`;
}

/**
 * Tiny multipart parser — same shape as server/index.mjs::parseMultipart.
 * Inlined here to avoid coupling this route file to that monolith.
 */
function parseMultipart(raw, boundary) {
  const parts = [];
  const sep = Buffer.from(`--${boundary}`);
  let start = 0;
  while (true) {
    const idx = raw.indexOf(sep, start);
    if (idx === -1) break;
    if (start > 0) {
      const chunk = raw.slice(start, idx);
      const headerEnd = chunk.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const headerStr = chunk.slice(0, headerEnd).toString('utf8');
        const body = chunk.slice(headerEnd + 4, chunk.length - 2);
        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);
        const ctMatch = headerStr.match(/Content-Type:\s*(.+)/i);
        parts.push({
          name: nameMatch?.[1] || '',
          filename: filenameMatch?.[1] || '',
          contentType: ctMatch?.[1]?.trim() || '',
          data: body,
        });
      }
    }
    start = idx + sep.length;
    if (raw[start] === 0x2d && raw[start + 1] === 0x2d) break;
    if (raw[start] === 0x0d) start += 2;
  }
  return parts;
}

async function nextBatchRef(tenantId) {
  const today = yyyymmdd();
  // Count existing batches with today's date prefix to assign a sequence.
  let rows;
  try {
    rows = await query(
      `SELECT batch_ref FROM bank_payment_batches
         WHERE tenant_id = ? AND batch_ref LIKE ?
         ORDER BY batch_ref DESC LIMIT 1`,
      [tenantId, `BATCH-${today}-%`]
    );
  } catch {
    rows = [];
  }
  let next = 1;
  if (rows.length > 0) {
    const m = String(rows[0].batch_ref).match(/-(\d+)$/);
    if (m) next = Number(m[1]) + 1;
  }
  return `BATCH-${today}-${pad2(next).padStart(3, '0')}`;
}

function adaptBankAccount(row) {
  return {
    id: row.id,
    accountName: row.account_name,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    ifscCode: row.ifsc_code,
    accountType: row.account_type,
    integrationMode: row.integration_mode,
    payoutFormat: row.payout_format,
    lastBalance: row.last_balance == null ? null : Number(row.last_balance),
    lastBalanceAt: row.last_balance_at,
    bankGlCode: row.bank_gl_code,
    isActive: row.is_active === 1,
    isDefault: row.is_default === 1,
    entityId: row.entity_id,
  };
}

function adaptBatch(row) {
  return {
    id: row.id,
    batchRef: row.batch_ref,
    bankAccountId: row.bank_account_id,
    totalAmount: Number(row.total_amount) || 0,
    itemCount: Number(row.item_count) || 0,
    status: row.status,
    integrationMode: row.integration_mode,
    paymentMode: row.payment_mode,
    paymentDate: row.payment_date ? String(row.payment_date).slice(0, 10) : null,
    bankTransactionRef: row.bank_transaction_ref,
    initiatedAt: row.initiated_at,
    payoutFilePath: row.payout_file_path,
    payoutFileFormat: row.payout_file_format,
    fileGeneratedAt: row.file_generated_at,
    uploadedAt: row.uploaded_at,
    utrFilePath: row.utr_file_path,
    utrIngestedAt: row.utr_ingested_at,
    jvCreated: row.jv_created === 1,
    jvRef: row.jv_ref,
    jvCreatedAt: row.jv_created_at,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectReason: row.reject_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function adaptBatchItem(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    bankAccountNo: row.bank_account_no,
    ifscCode: row.ifsc_code,
    amount: Number(row.amount) || 0,
    paymentMode: row.payment_mode,
    narration: row.narration,
    clientRef: row.client_ref,
    utr: row.utr,
    utrStatus: row.utr_status,
    utrConfirmedAt: row.utr_confirmed_at,
    jvLineRef: row.jv_line_ref,
  };
}

async function loadBatchWithItems(batchId, tenantId) {
  const rows = await query(
    'SELECT * FROM bank_payment_batches WHERE id = ? AND tenant_id = ? LIMIT 1',
    [batchId, tenantId]
  );
  if (!rows.length) return null;
  const items = await query(
    'SELECT * FROM bank_payment_batch_items WHERE batch_id = ? AND tenant_id = ? ORDER BY created_at ASC',
    [batchId, tenantId]
  );
  return { batch: adaptBatch(rows[0]), items: items.map(adaptBatchItem), rawItems: items };
}

// Exported separately so tests can call it directly without spinning up
// the full route handler.
async function createBatchFromInvoices({
  tenantId,
  bankAccountId,
  invoiceIds,
  paymentMode,
  paymentDate,
  createdBy,
}) {
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    const err = new Error('invoiceIds required');
    err.statusCode = 400;
    throw err;
  }
  if (!PAYMENT_MODES.has(String(paymentMode || '').toUpperCase())) {
    const err = new Error('paymentMode must be NEFT, RTGS, IMPS or UPI');
    err.statusCode = 400;
    throw err;
  }

  const accountRows = await query(
    'SELECT * FROM bank_accounts WHERE id = ? AND tenant_id = ? LIMIT 1',
    [bankAccountId, tenantId]
  );
  if (!accountRows.length) {
    const err = new Error('bank_account_not_found');
    err.statusCode = 404;
    throw err;
  }
  const account = accountRows[0];

  const placeholders = invoiceIds.map(() => '?').join(',');
  const invoiceRows = await query(
    `SELECT i.id, i.invoice_number, i.vendor_name, i.vendor_id, i.total_amount,
            i.lifecycle_state,
            COALESCE(pay.payment_total, 0) AS payment_total,
            (SELECT COUNT(*) FROM invoice_risk_flags f
              WHERE f.invoice_id = i.id AND f.tenant_id = i.tenant_id AND f.is_cleared = 0) AS active_flags
       FROM invoices i
       LEFT JOIN (
         SELECT invoice_id, SUM(amount) AS payment_total
           FROM payments WHERE status = 'confirmed' GROUP BY invoice_id
       ) pay ON pay.invoice_id = i.id
      WHERE i.tenant_id = ? AND i.id IN (${placeholders})`,
    [tenantId, ...invoiceIds]
  );

  if (invoiceRows.length !== invoiceIds.length) {
    const err = new Error('some_invoices_not_found');
    err.statusCode = 404;
    throw err;
  }
  for (const inv of invoiceRows) {
    if (Number(inv.active_flags) > 0) {
      const err = new Error('invoice_has_active_flags');
      err.statusCode = 400;
      err.invoiceId = inv.id;
      throw err;
    }
    if (String(inv.lifecycle_state || '') !== 'Queued for Payment') {
      const err = new Error('invoice_not_queued_for_payment');
      err.statusCode = 400;
      err.invoiceId = inv.id;
      throw err;
    }
  }

  // Vendor bank accounts (primary, per vendor)
  const vendorIds = [...new Set(invoiceRows.map((i) => i.vendor_id).filter(Boolean))];
  const vendorBankByVendor = new Map();
  if (vendorIds.length > 0) {
    try {
      const bankRows = await query(
        `SELECT vendor_id, account_number, ifsc_code, is_primary
           FROM p2p_schema_mt.vendor_bank_accounts
           WHERE vendor_id IN (${vendorIds.map(() => '?').join(',')})
           ORDER BY is_primary DESC, updated_at DESC`,
        vendorIds
      );
      for (const b of bankRows) {
        if (!vendorBankByVendor.has(String(b.vendor_id))) {
          vendorBankByVendor.set(String(b.vendor_id), b);
        }
      }
    } catch {
      // tolerate missing vendor bank schema
    }
  }

  const batchId = randomUUID();
  const batchRef = await nextBatchRef(tenantId);
  const totalAmount = invoiceRows.reduce(
    (s, i) => s + Math.max(0, Number(i.total_amount) - Number(i.payment_total)),
    0
  );
  const itemCount = invoiceRows.length;

  await query(
    `INSERT INTO bank_payment_batches
       (id, tenant_id, batch_ref, bank_account_id, total_amount, item_count, status,
        integration_mode, payment_mode, payment_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
    [
      batchId,
      tenantId,
      batchRef,
      account.id,
      totalAmount,
      itemCount,
      account.integration_mode,
      String(paymentMode).toUpperCase(),
      paymentDate || new Date().toISOString().slice(0, 10),
      createdBy || null,
    ]
  );

  for (const inv of invoiceRows) {
    const bank = vendorBankByVendor.get(String(inv.vendor_id));
    const itemAmt = Math.max(0, Number(inv.total_amount) - Number(inv.payment_total));
    const clientRef = `${tenantId.slice(0, 8).toUpperCase()}-${yyyymmdd()}-${(invoiceRows.indexOf(inv) + 1).toString().padStart(3, '0')}`;
    await query(
      `INSERT INTO bank_payment_batch_items
         (id, batch_id, invoice_id, tenant_id, vendor_id, vendor_name,
          bank_account_no, ifsc_code, amount, payment_mode, narration, client_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        batchId,
        inv.id,
        tenantId,
        inv.vendor_id,
        inv.vendor_name,
        bank?.account_number || '',
        bank?.ifsc_code || '',
        itemAmt,
        String(paymentMode).toUpperCase(),
        `${inv.invoice_number || inv.id} payment`,
        clientRef,
      ]
    );
  }

  return { id: batchId, batchRef };
}

// Exported for tests
export {
  evaluateRiskFlags,
  resolveThresholds,
  FLAG_DEFS,
  FLAG_CONFIG,
  isApprover,
  isPaymentApprover,
  isAdmin,
  normaliseRole,
  buildForecast,
  aggregateForecastTable,
  parseIsoDate,
  createBatchFromInvoices,
  adaptBatch,
  adaptBatchItem,
  PAYOUT_DIR,
};
