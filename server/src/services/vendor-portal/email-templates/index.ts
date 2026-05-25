// Vendor governance email templates (Sprint 6).
//
// Pure functions — no I/O, no state. Each returns { subject, html } so the
// caller pipes the result directly into the email service. Plain-text
// fallback is derived by nodemailer automatically.
//
// Styling philosophy: inline CSS only (gmail/outlook drop <style>), simple
// table-based layout, no images (logo is a coloured text mark to avoid
// dealing with hosting + tracking pixels). Procinix teal #00A9B7 is the
// only accent colour.

const TEAL   = '#00A9B7'
const SLATE  = '#475569'
const DARK   = '#0A0F14'
const LIGHT  = '#F6F9FC'

function shell(bodyHtml: string, opts: { previewText?: string } = {}): string {
  return `
<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:${LIGHT};font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${DARK};">
  ${opts.previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${opts.previewText}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;border:1px solid #e6eef2;">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #e6eef2;">
          <table role="presentation" width="100%"><tr>
            <td style="font-weight:700;font-size:18px;color:${TEAL};">Procinix</td>
            <td align="right" style="font-size:12px;color:${SLATE};">Vendor Governance</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px;font-size:14px;line-height:1.6;color:${DARK};">${bodyHtml}</td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #e6eef2;font-size:11px;color:${SLATE};">
          You're receiving this email because you're a registered vendor or invited counterparty in the Procinix Vendor Portal.
          If this wasn't you, please reply to this email so we can investigate.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
  `.trim()
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 22px;background:${TEAL};color:#fff;font-weight:600;border-radius:6px;text-decoration:none;font-size:14px;">${label}</a>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

// ── Template inputs ─────────────────────────────────────────────────────

export interface VendorInvitationInput {
  vendorName:    string
  invitedByName: string
  companyName:   string
  portalUrl:     string
  expiresAt:     Date
}

export function vendorInvitationEmail(input: VendorInvitationInput) {
  const expiresOn = input.expiresAt.toUTCString()
  const body = `
<p>Hi ${escapeHtml(input.vendorName)},</p>
<p><strong>${escapeHtml(input.invitedByName)}</strong> at <strong>${escapeHtml(input.companyName)}</strong> has invited you to onboard as a vendor through the Procinix Vendor Portal.</p>
<p>The onboarding form takes about 10 minutes. You'll need your company registration details, tax IDs, banking information, and a few compliance documents.</p>
<p style="margin:28px 0;">${button(input.portalUrl, 'Start Onboarding')}</p>
<p style="font-size:12px;color:${SLATE};">This invitation link expires on <strong>${expiresOn}</strong>. If you didn't expect this email, you can safely ignore it.</p>
<p style="font-size:12px;color:${SLATE};margin-top:24px;">Questions? Reply to this email and the ${escapeHtml(input.companyName)} procurement team will respond.</p>
  `
  return {
    subject: `You have been invited to onboard as a vendor with ${input.companyName}`,
    html:    shell(body, { previewText: `${input.invitedByName} has invited you to onboard with ${input.companyName}.` }),
  }
}

export interface OnboardingApprovedInput {
  vendorName:     string
  companyName:    string
  vendorCode:     string
  portalLoginUrl: string
}

export function onboardingApprovedEmail(input: OnboardingApprovedInput) {
  const body = `
<p>Hi ${escapeHtml(input.vendorName)},</p>
<p>Great news — your vendor onboarding application has been <strong style="color:#16A34A;">approved</strong> by ${escapeHtml(input.companyName)}.</p>
<p>You've been assigned vendor code <strong style="font-family:Menlo,monospace;background:${LIGHT};padding:2px 6px;border-radius:4px;">${escapeHtml(input.vendorCode)}</strong>. Reference this code on all future invoices, shipment notices, and correspondence.</p>
<p><strong>What's next:</strong></p>
<ul style="padding-left:18px;color:${SLATE};">
  <li>Sign into the Vendor Portal to acknowledge purchase orders</li>
  <li>Submit invoices and track payment status</li>
  <li>Update banking or compliance details anytime via change requests</li>
</ul>
<p style="margin:28px 0;">${button(input.portalLoginUrl, 'Open Vendor Portal')}</p>
  `
  return {
    subject: `Your vendor onboarding has been approved — ${input.companyName}`,
    html:    shell(body, { previewText: `Welcome aboard. Your vendor code is ${input.vendorCode}.` }),
  }
}

export interface OnboardingRejectedInput {
  vendorName:   string
  companyName:  string
  reason:       string
  contactEmail: string
}

export function onboardingRejectedEmail(input: OnboardingRejectedInput) {
  const body = `
<p>Hi ${escapeHtml(input.vendorName)},</p>
<p>Thanks for your interest in becoming a vendor with ${escapeHtml(input.companyName)}. After review, your onboarding application has not been approved at this time.</p>
<p><strong>Reason:</strong></p>
<blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid #DC2626;background:#FEF2F2;color:${DARK};font-size:13px;">${escapeHtml(input.reason)}</blockquote>
<p>If you'd like to discuss the decision or reapply with updated information, please reach out to us at <a href="mailto:${escapeHtml(input.contactEmail)}" style="color:${TEAL};">${escapeHtml(input.contactEmail)}</a>.</p>
<p style="font-size:12px;color:${SLATE};margin-top:24px;">We appreciate the time you took to apply.</p>
  `
  return {
    subject: `Update on your vendor onboarding application — ${input.companyName}`,
    html:    shell(body, { previewText: 'Onboarding decision attached.' }),
  }
}

export interface DocumentExpiryInput {
  vendorName:   string
  documentType: string
  expiresAt:    Date
  uploadUrl:    string
}

export function documentExpiryEmail(input: DocumentExpiryInput) {
  const msRemaining = input.expiresAt.getTime() - Date.now()
  const daysLeft = Math.max(0, Math.ceil(msRemaining / 86_400_000))
  const body = `
<p>Hi ${escapeHtml(input.vendorName)},</p>
<p>Your <strong>${escapeHtml(input.documentType)}</strong> on file is expiring in <strong style="color:#F59E0B;">${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong> (on ${input.expiresAt.toUTCString()}).</p>
<p>Please upload a fresh copy before the expiry date to avoid disruption to invoicing and payments.</p>
<p style="margin:28px 0;">${button(input.uploadUrl, 'Upload Refreshed Document')}</p>
<p style="font-size:12px;color:${SLATE};">If you've already submitted an updated copy, please disregard this message — our reviewers process uploads within 24 hours.</p>
  `
  return {
    subject: `Action required: ${input.documentType} expiring in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html:    shell(body, { previewText: `${input.documentType} expires in ${daysLeft} days.` }),
  }
}

export interface ChangeRequestStatusInput {
  vendorName:  string
  changeType:  string
  status:      'APPROVED' | 'REJECTED'
  comments?:   string
}

export function changeRequestStatusEmail(input: ChangeRequestStatusInput) {
  const statusColor = input.status === 'APPROVED' ? '#16A34A' : '#DC2626'
  const statusLabel = input.status === 'APPROVED' ? 'approved' : 'rejected'
  const body = `
<p>Hi ${escapeHtml(input.vendorName)},</p>
<p>Your change request for <strong>${escapeHtml(input.changeType)}</strong> has been <strong style="color:${statusColor};">${statusLabel}</strong>.</p>
${input.comments ? `<p><strong>Reviewer note:</strong></p><blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid ${statusColor};background:${LIGHT};color:${DARK};font-size:13px;">${escapeHtml(input.comments)}</blockquote>` : ''}
<p style="font-size:12px;color:${SLATE};margin-top:24px;">${input.status === 'APPROVED' ? 'The change will reflect on your vendor profile shortly.' : 'You can raise an updated change request from the Vendor Portal at any time.'}</p>
  `
  return {
    subject: `Your change request has been ${statusLabel}`,
    html:    shell(body, { previewText: `Change request ${statusLabel}.` }),
  }
}
