/**
 * Notification service for the workflow engine.
 *
 * Two channels per event:
 *   1. Bell — INSERT into the `notifications` table (header bell + count API).
 *   2. Email — best-effort via nodemailer when SMTP_HOST is set; logged
 *      otherwise so dev environments don't fail.
 *
 * Email "approve" / "reject" buttons hit GET /api/approvals/action?token=&action=
 * with one-time tokens (set by the dispatcher, expire in 72h). The handlers
 * live in `server/routes/workflows.mjs`.
 */

import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';

const FROM_DEFAULT = 'noreply@procinix.ai';

function envOr(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTransporter() {
  const host = envOr('SMTP_HOST', 'AP_EMAIL_HOST');
  if (!host) return null;
  const port = Number(envOr('SMTP_PORT', 'AP_EMAIL_PORT') || 587);
  const secure = envOr('SMTP_SECURE', 'AP_EMAIL_SECURE') === 'true' || port === 465;
  const user = envOr('SMTP_USER', 'AP_EMAIL_USER');
  const pass = envOr('SMTP_PASS', 'AP_EMAIL_PASS', 'AP_EMAIL_PASSWORD');
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
}

/** Look up the user's email address. Best-effort — returns null on miss. */
async function resolveUserEmail(userId, db) {
  if (!userId) return null;
  try {
    const [rows] = await db.execute(
      `SELECT JSON_UNQUOTE(JSON_EXTRACT(payload, '$.email')) AS email,
              record_name AS name
         FROM erp_master_users
        WHERE id = ?
        LIMIT 1`,
      [userId]
    );
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

/** INSERT a bell notification row. Tenant-scoped. */
export async function insertBellNotification(db, params) {
  const { userId, tenantId, type, title, body, link } = params;
  if (!userId || !tenantId) return null;
  const id = randomUUID();
  await db.execute(
    `INSERT INTO notifications (id, user_id, tenant_id, type, title, body, link)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, tenantId, type, title, body || null, link || null]
  );
  return id;
}

function buildApprovalEmailHtml(p) {
  const {
    documentType,
    documentRef,
    documentName,
    amount,
    submittedByName,
    approveUrl,
    rejectUrl,
  } = p;
  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:640px;margin:auto;padding:24px">
  <h2 style="color:#007D87;margin:0 0 12px 0">Approval required</h2>
  <p style="margin:0 0 16px 0">${escapeHtml(submittedByName)} submitted a <strong>${escapeHtml(documentType)}</strong> for your approval.</p>
  <table style="border-collapse:collapse;margin-bottom:16px;font-size:14px">
    <tr><td style="padding:4px 12px 4px 0;color:#666">Reference</td><td style="padding:4px 0"><strong>${escapeHtml(documentRef || '—')}</strong></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#666">Name</td><td style="padding:4px 0">${escapeHtml(documentName || '—')}</td></tr>
    ${amount != null ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Amount</td><td style="padding:4px 0">${escapeHtml(amount)}</td></tr>` : ''}
    <tr><td style="padding:4px 12px 4px 0;color:#666">Submitted by</td><td style="padding:4px 0">${escapeHtml(submittedByName)}</td></tr>
  </table>
  <div style="margin:24px 0">
    <a href="${escapeHtml(approveUrl)}" style="background:#007D87;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-right:12px">Approve</a>
    <a href="${escapeHtml(rejectUrl)}" style="background:#B0322F;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Reject</a>
  </div>
  <p style="font-size:11px;color:#888;margin-top:24px">Links expire in 72 hours · Single use</p>
</body></html>`;
}

function getBaseUrl() {
  return envOr('APP_BASE_URL', 'PUBLIC_BASE_URL') || 'http://localhost:8787';
}

/**
 * Send the "approval required" bell + email to the approver assigned to a
 * newly-created approvals row.
 */
export async function sendApprovalRequestNotification(params) {
  const {
    approverUserId,
    documentType,
    documentRef,
    documentName,
    amount,
    submittedByName,
    approvalId,
    token,
    tenantId,
    db,
  } = params;
  if (!approverUserId || !tenantId || !db) return { ok: false, reason: 'missing_params' };

  await insertBellNotification(db, {
    userId: approverUserId,
    tenantId,
    type: 'approval_request',
    title: `Approval required: ${documentRef || documentType}`,
    body: `${submittedByName || 'A user'} submitted ${documentName || documentType} for approval`,
    link: '/approvals',
  });

  // Email is best-effort. SMTP misconfig / unreachable server logs but
  // doesn't fail the dispatch.
  const transporter = buildTransporter();
  const recipient = await resolveUserEmail(approverUserId, db);
  if (!transporter || !recipient?.email) {
    console.log('[Notifications] approval_request: bell only (no SMTP or no email)', {
      approverUserId,
      approvalId,
      hasSmtp: !!transporter,
      hasEmail: !!recipient?.email,
    });
    return { ok: true, bell: true, email: false };
  }

  const baseUrl = getBaseUrl();
  const approveUrl = `${baseUrl}/api/approvals/action?token=${encodeURIComponent(token)}&action=approve`;
  const rejectUrl = `${baseUrl}/api/approvals/action?token=${encodeURIComponent(token)}&action=reject`;

  try {
    await transporter.sendMail({
      from: envOr('MAIL_FROM', 'AP_EMAIL_FROM') || FROM_DEFAULT,
      to: recipient.email,
      subject: `Approval required: ${documentRef || documentType}`,
      html: buildApprovalEmailHtml({
        documentType,
        documentRef,
        documentName,
        amount,
        submittedByName,
        approveUrl,
        rejectUrl,
      }),
    });
    return { ok: true, bell: true, email: true };
  } catch (err) {
    console.error('[Notifications] email send failed:', err.message);
    return { ok: true, bell: true, email: false, emailError: err.message };
  }
}

/** Bell + email to submitter when a step is skipped. */
export async function sendStepSkippedNotification(params) {
  const { submittedByUserId, tenantId, stepRole, reason, documentRef, db } = params;
  if (!submittedByUserId || !tenantId || !db) return { ok: false };
  await insertBellNotification(db, {
    userId: submittedByUserId,
    tenantId,
    type: 'step_skipped',
    title: `Step skipped: ${stepRole}`,
    body: `${documentRef || 'Submission'} — ${reason}`,
    link: '/approvals',
  });
  const transporter = buildTransporter();
  const recipient = await resolveUserEmail(submittedByUserId, db);
  if (!transporter || !recipient?.email) return { ok: true, email: false };
  try {
    await transporter.sendMail({
      from: envOr('MAIL_FROM', 'AP_EMAIL_FROM') || FROM_DEFAULT,
      to: recipient.email,
      subject: `Step skipped: ${stepRole} — ${documentRef || ''}`,
      text: `The "${stepRole}" approval step on ${documentRef || 'your submission'} was skipped.\nReason: ${reason}`,
    });
    return { ok: true, email: true };
  } catch (err) {
    return { ok: true, email: false, emailError: err.message };
  }
}

/** Bell + email when all steps complete (final approval). */
export async function sendApprovalCompleteNotification(params) {
  const { submittedByUserId, tenantId, documentRef, documentName, db } = params;
  if (!submittedByUserId || !tenantId || !db) return { ok: false };
  await insertBellNotification(db, {
    userId: submittedByUserId,
    tenantId,
    type: 'approval_complete',
    title: `Approved: ${documentRef || 'your submission'}`,
    body: `${documentName || 'Document'} has been fully approved`,
    link: '/approvals',
  });
  const transporter = buildTransporter();
  const recipient = await resolveUserEmail(submittedByUserId, db);
  if (!transporter || !recipient?.email) return { ok: true, email: false };
  try {
    await transporter.sendMail({
      from: envOr('MAIL_FROM', 'AP_EMAIL_FROM') || FROM_DEFAULT,
      to: recipient.email,
      subject: `Approved: ${documentRef || 'your submission'}`,
      text: `Your submission ${documentRef || ''} ${documentName ? `(${documentName})` : ''} has been fully approved.`,
    });
    return { ok: true, email: true };
  } catch (err) {
    return { ok: true, email: false, emailError: err.message };
  }
}

/** Bell + email when an approval is rejected. */
export async function sendRejectionNotification(params) {
  const { submittedByUserId, tenantId, documentRef, documentName, remarks, db } = params;
  if (!submittedByUserId || !tenantId || !db) return { ok: false };
  await insertBellNotification(db, {
    userId: submittedByUserId,
    tenantId,
    type: 'approval_rejected',
    title: `Rejected: ${documentRef || 'your submission'}`,
    body: `Reason: ${remarks || 'No reason provided'}`,
    link: '/approvals',
  });
  const transporter = buildTransporter();
  const recipient = await resolveUserEmail(submittedByUserId, db);
  if (!transporter || !recipient?.email) return { ok: true, email: false };
  try {
    await transporter.sendMail({
      from: envOr('MAIL_FROM', 'AP_EMAIL_FROM') || FROM_DEFAULT,
      to: recipient.email,
      subject: `Rejected: ${documentRef || 'your submission'}`,
      text: `Your submission ${documentRef || ''} ${documentName ? `(${documentName})` : ''} was rejected.\nReason: ${remarks || 'No reason provided'}`,
    });
    return { ok: true, email: true };
  } catch (err) {
    return { ok: true, email: false, emailError: err.message };
  }
}
