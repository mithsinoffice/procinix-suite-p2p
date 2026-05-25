// Outbound email service (Sprint 6).
//
// Single nodemailer transport reused across the app. Config comes from env
// vars; in dev when SMTP_HOST is unset, the transport short-circuits and
// just logs the payload — keeps `npm run dev` fast and means tests don't
// need a mail server. In production a missing config logs a loud warning
// but still fails the send (fail-loud > silent drop for vendor-facing
// emails).
//
// Senders should treat this as fire-and-forget: route handlers should NOT
// await sendEmail and should attach .catch(console.error). The vendor's
// response to "your invitation was sent" must not be blocked by SMTP.

import nodemailer, { type Transporter } from 'nodemailer'

export interface EmailInput {
  to:       string | string[]
  subject:  string
  html:     string
  // Optional plain-text fallback. When omitted nodemailer strips HTML
  // automatically — good enough for the transactional templates we ship.
  text?:    string
  replyTo?: string
}

let cachedTransport: Transporter | null = null
let cachedTransportConfig = ''

function resolveTransport(): { transport: Transporter | null; from: string } {
  const host = process.env.SMTP_HOST?.trim()
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM?.trim() ?? 'no-reply@procinix.local'

  if (!host) {
    // Dev fallback — no SMTP host configured. Returning null tells
    // sendEmail to log-only rather than open a connection.
    return { transport: null, from }
  }

  // Cache the transport keyed by its config so swapping SMTP creds in
  // .env.local during dev doesn't keep the stale connection open.
  const configKey = `${host}|${port}|${user ?? ''}`
  if (cachedTransport && cachedTransportConfig === configKey) {
    return { transport: cachedTransport, from }
  }
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    // 465 = implicit TLS; 587/2525 = STARTTLS-upgrade.
    secure: port === 465,
    auth:   user && pass ? { user, pass } : undefined,
  })
  cachedTransportConfig = configKey
  return { transport: cachedTransport, from }
}

/**
 * Send a transactional email. In dev with no SMTP_HOST set, logs the
 * payload and resolves successfully — letting feature work proceed
 * without bringing up a mail server. In all other cases relays via the
 * configured SMTP relay.
 */
export async function sendEmail(input: EmailInput): Promise<void> {
  const { transport, from } = resolveTransport()
  if (!transport) {
    console.info(
      `[email] DEV (no SMTP_HOST configured) → would send "${input.subject}" to ${
        Array.isArray(input.to) ? input.to.join(', ') : input.to
      }`,
    )
    return
  }
  await transport.sendMail({
    from,
    to:      input.to,
    subject: input.subject,
    html:    input.html,
    text:    input.text,
    replyTo: input.replyTo,
  })
}
