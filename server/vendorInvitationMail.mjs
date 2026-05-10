import nodemailer from 'nodemailer';
import { getAppMailFrom } from './appMail.mjs';

function isValidEmailShape(normalized) {
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function isHttpUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ ok: true; mock?: boolean } | { ok: false; error: string; status?: number }>}
 */
export async function sendVendorInvitationEmailServer(body) {
  const to = typeof body?.to === 'string' ? body.to.trim().toLowerCase() : '';
  const invitationUrl = typeof body?.invitationUrl === 'string' ? body.invitationUrl.trim() : '';
  const legalName = typeof body?.legalName === 'string' ? body.legalName.trim() : '';
  const entityName =
    typeof body?.entityName === 'string' && body.entityName.trim()
      ? body.entityName.trim()
      : undefined;

  if (!to || !isValidEmailShape(to)) {
    return { ok: false, error: 'Invalid or missing "to" email address.', status: 400 };
  }
  if (!invitationUrl || !isHttpUrl(invitationUrl)) {
    return { ok: false, error: 'Invalid or missing "invitationUrl".', status: 400 };
  }
  if (!legalName) {
    return { ok: false, error: 'Missing "legalName".', status: 400 };
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  const mailFrom = getAppMailFrom();

  if (!smtpHost) {
    console.info('[vendor-invitations/send] SMTP not configured; logging only', {
      from: mailFrom,
      to,
      invitationUrl,
      legalName,
      entityName,
    });
    return { ok: true, mock: true };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  const subject = `Vendor onboarding invitation — ${legalName}`;
  const text = `Hello,

You have been invited to complete vendor onboarding for ${legalName}${entityName ? ` (${entityName})` : ''}.

Open this link to continue:
${invitationUrl}

Thank you.`;

  const html = `<p>Hello,</p><p>You have been invited to complete vendor onboarding for <strong>${escapeHtml(legalName)}</strong>${
    entityName ? ` (${escapeHtml(entityName)})` : ''
  }.</p><p><a href="${escapeHtml(invitationUrl)}">Open onboarding link</a></p>`;

  try {
    await transporter.sendMail({
      from: mailFrom,
      to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[vendor-invitations/send] SMTP error', message);
    return { ok: false, error: `Email delivery failed: ${message}`, status: 502 };
  }
}
