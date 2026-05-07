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
export async function sendPortalWelcomeEmailServer(body) {
  const to = typeof body?.to === 'string' ? body.to.trim().toLowerCase() : '';
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
  const loginUrl = typeof body?.loginUrl === 'string' ? body.loginUrl.trim() : '';
  const vendorName =
    typeof body?.vendorName === 'string' && body.vendorName.trim()
      ? body.vendorName.trim()
      : undefined;
  const role = typeof body?.role === 'string' && body.role.trim() ? body.role.trim() : undefined;

  if (!to || !isValidEmailShape(to)) {
    return { ok: false, error: 'Invalid or missing "to" email address.', status: 400 };
  }
  if (!firstName || !lastName) {
    return { ok: false, error: 'Missing first or last name.', status: 400 };
  }
  if (!loginUrl || !isHttpUrl(loginUrl)) {
    return { ok: false, error: 'Invalid or missing "loginUrl".', status: 400 };
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  const mailFrom = getAppMailFrom();

  if (!smtpHost) {
    console.info('[portal-users/welcome-email] SMTP not configured; logging only', {
      from: mailFrom,
      to,
      firstName,
      lastName,
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

  const subject = 'Your vendor portal access — Procinix';
  const fullName = `${firstName} ${lastName}`.trim();
  const text = `Hello ${firstName},

Your account for the vendor portal has been created${vendorName ? ` for ${vendorName}` : ''}${role ? ` (${role})` : ''}.

Sign in here to continue:
${loginUrl}

If you did not expect this message, you can ignore it.

— Procinix`;

  const html = `<p>Hello ${escapeHtml(firstName)},</p>
<p>Your account for the vendor portal has been created${vendorName ? ` for <strong>${escapeHtml(vendorName)}</strong>` : ''}${role ? ` (${escapeHtml(role)})` : ''}.</p>
<p><a href="${escapeHtml(loginUrl)}">Sign in to the vendor portal</a></p>
<p style="color:#666;font-size:12px;">If you did not expect this message, you can ignore it.</p>`;

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
    console.error('[portal-users/welcome-email] SMTP error', message);
    return { ok: false, error: `Email delivery failed: ${message}`, status: 502 };
  }
}
