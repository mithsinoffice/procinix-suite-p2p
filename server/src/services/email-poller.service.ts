// Gmail inbox poller — fetches unread invoice attachments, OCRs via Gemini,
// and creates DRAFT Invoice rows for the matched tenant + vendor.
//
// Triggered manually via POST /api/email-poll/trigger and on a 5-minute cron
// from server.ts. Skips silently when GMAIL_REFRESH_TOKEN is not configured.

import { google } from 'googleapis'
import type { PrismaClient } from '@prisma/client'
import { extractInvoiceFromPDF, extractInvoiceFromImage, type EmailPollerOcrResult } from './gemini-ocr.service.js'
import { calculateMatchScore } from './match-scoring.service.js'

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI,
  )
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  return google.gmail({ version: 'v1', auth: oauth2Client })
}

export interface PollResult {
  processed:        number
  errors:           string[]
  rateLimitedUntil?: number   // epoch ms when polling can resume
}

// Module-level guards. Single-process Node; if we ever go multi-instance we'll
// need a distributed lock (Redis) instead.
const inFlight = new Set<string>()     // tenantIds currently being polled
let   rateLimitedUntil: number | null = null  // global — Gemini quota is per-project, not per-tenant

const RATE_LIMIT_COOLDOWN_MS = 60 * 60 * 1000  // 1h cool-down after a 429

export async function pollGmailInbox(prisma: PrismaClient, tenantId: string): Promise<PollResult> {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    console.log('[EmailPoller] GMAIL_REFRESH_TOKEN not set — skipping poll')
    return { processed: 0, errors: [] }
  }

  // Circuit breaker — Gemini daily/minute quota exhausted; don't even open the
  // Gmail connection until cool-down expires.
  if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
    const minsLeft = Math.ceil((rateLimitedUntil - Date.now()) / 60_000)
    return {
      processed: 0,
      errors:    [`Gemini quota cooldown active — retry in ~${minsLeft} min`],
      rateLimitedUntil,
    }
  }

  // Concurrency guard — manual trigger + cron tick can both call this; prevent
  // overlapping polls that would saturate the event loop.
  if (inFlight.has(tenantId)) {
    return { processed: 0, errors: ['Poll already in progress for this tenant — skipped'] }
  }
  inFlight.add(tenantId)

  const gmail            = getGmailClient()
  const errors: string[] = []
  let processed          = 0
  let quotaTripped       = false

  try {
    const listRes = await gmail.users.messages.list({
      userId:     'me',
      q:          'has:attachment',
      maxResults: 10,
    })

    const messages = listRes.data.messages ?? []
    if (!messages.length) {
      console.log('[EmailPoller] No new invoice emails')
      return { processed: 0, errors: [] }
    }

    // Pre-fetch default entity once — used as fallback when invoice doesn't specify one
    const defaultEntity = await prisma.entity.findFirst({ where: { tenantId } })

    // Resolve a real createdByUserId — Invoice.createdByUserId is NOT NULL FK to User.
    // Prefer an admin/AP role on this tenant; fall back to oldest user.
    const systemUser = await prisma.user.findFirst({
      where:   { tenantId, role: { in: ['SUPER_ADMIN', 'TENANT_ADMIN', 'AP_MANAGER'] } },
      orderBy: { createdAt: 'asc' },
      select:  { id: true },
    }) ?? await prisma.user.findFirst({
      where:   { tenantId },
      orderBy: { createdAt: 'asc' },
      select:  { id: true },
    })

    if (!systemUser) {
      errors.push('No user found for tenant — cannot attribute ingested invoices')
      return { processed: 0, errors }
    }

    for (let msgIndex = 0; msgIndex < messages.length; msgIndex++) {
      const msg = messages[msgIndex]
      try {
        // Skip if this Gmail message was already ingested (dedup via audit log).
        // Required now that we no longer filter on is:unread — without this the
        // poller would re-process every message every tick.
        // MySQL JSON path uses '$.field' string syntax (Postgres uses string[]).
        if (msg.id) {
          const alreadyProcessed = await prisma.invoiceAuditLog.findFirst({
            where: {
              tenantId,
              action:  'EMAIL_INGESTED',
              details: { path: '$.gmailMessageId', equals: msg.id },
            },
            select: { id: true },
          })
          if (alreadyProcessed) {
            console.log(`[EmailPoller] Already processed ${msg.id} — skipping`)
            continue
          }
        }

        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id:     msg.id!,
          format: 'full',
        })

        // Skip Sent-folder messages — these are outgoing, not vendor invoices
        const labelIds = fullMsg.data.labelIds ?? []
        if (labelIds.includes('SENT')) {
          console.log(`[EmailPoller] Skipping SENT message ${msg.id}`)
          continue
        }

        const headers     = fullMsg.data.payload?.headers ?? []
        const fromHeader  = headers.find(h => h.name === 'From')?.value ?? ''
        const subject     = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)'
        const emailMatch  = fromHeader.match(/<(.+?)>/) ?? fromHeader.match(/(\S+@\S+)/)
        const senderEmail = emailMatch?.[1] ?? fromHeader
        const senderDomain = senderEmail.includes('@')
          ? senderEmail.split('@')[1]?.replace(/[>\s]/g, '') ?? ''
          : ''

        // Flatten nested parts (Gmail nests multipart attachments)
        const allParts = flattenParts(fullMsg.data.payload?.parts ?? [])
        const attachments = allParts.filter(p =>
          p.mimeType === 'application/pdf' || (p.mimeType ?? '').startsWith('image/')
        )

        if (!attachments.length) {
          errors.push(`Message "${subject}" has no PDF/image attachment — skipped`)
          continue
        }

        console.log(`[EmailPoller] (${msgIndex + 1}/${messages.length}) Processing "${subject}" from ${senderEmail}`)

        for (const attachment of attachments) {
          try {
            const attId = attachment.body?.attachmentId
            if (!attId) {
              errors.push(`Attachment in "${subject}" missing body.attachmentId`)
              continue
            }

            const attRes = await gmail.users.messages.attachments.get({
              userId:    'me',
              messageId: msg.id!,
              id:        attId,
            })

            // Gmail returns URL-safe base64; convert to standard base64 for Gemini
            const base64Data = (attRes.data.data ?? '').replace(/-/g, '+').replace(/_/g, '/')
            const mimeType   = attachment.mimeType!

            const ocr = await extractWithRetry(() =>
              mimeType === 'application/pdf'
                ? extractInvoiceFromPDF(base64Data)
                : extractInvoiceFromImage(base64Data, mimeType),
            )

            console.log(`[EmailPoller] OCR done — confidence: ${ocr.confidence?.overall ?? '—'}%, vendor: ${ocr.vendorGSTIN ?? 'unknown'}`)

            // Vendor match — priority order:
            //   1. GSTIN from OCR (most reliable — invoice itself carries it)
            //   2. Vendor name from OCR (contains-match on legalName / tradeName)
            //   3. Sender email (often the user's own inbox, not the vendor — kept as last resort)
            //   4. Sender domain (website contains)
            // Required because invoices are typically forwarded *from* the user's
            // mailbox, so senderEmail rarely matches a real vendor.
            // Invoice.vendorId FK is NOT NULL — missing match = skip with note.
            let vendor = null

            if (ocr.vendorGSTIN) {
              vendor = await prisma.vendor.findFirst({
                where: { tenantId, gstin: ocr.vendorGSTIN },
              })
            }

            if (!vendor && ocr.vendorName) {
              vendor = await prisma.vendor.findFirst({
                where: {
                  tenantId,
                  OR: [
                    { legalName: { contains: ocr.vendorName } },
                    { tradeName: { contains: ocr.vendorName } },
                  ],
                },
              })
            }

            if (!vendor && senderEmail) {
              vendor = await prisma.vendor.findFirst({
                where: { tenantId, email: senderEmail },
              })
            }

            if (!vendor && senderDomain) {
              vendor = await prisma.vendor.findFirst({
                where: { tenantId, website: { contains: senderDomain } },
              })
            }

            // No-vendor-match no longer skips the message — we persist an
            // UNMATCHED invoice (vendorId=null, apLane=MANUAL) so AP can triage
            // it from the UI instead of losing the row.
            if (!defaultEntity) {
              errors.push(`No entity configured for tenant — cannot create invoice from "${subject}"`)
              continue
            }

            const totalAmount = ocr.totalAmount ?? 0
            const tdsAmount   = ocr.tdsAmount   ?? 0
            const invoiceNum  = ocr.invoiceNumber || `EMAIL-${Date.now()}`

            // Pre-check duplicate only when we have a vendor — the unique
            // constraint (tenantId, invoiceNumber, vendorId) is effectively
            // non-restricting for null vendorIds in MySQL, and the audit-log
            // dedup at the top of the loop catches re-runs by gmailMessageId.
            if (vendor) {
              const existing = await prisma.invoice.findFirst({
                where:  { tenantId, invoiceNumber: invoiceNum, vendorId: vendor.id },
                select: { id: true },
              })
              if (existing) {
                errors.push(`Duplicate: invoice "${invoiceNum}" from ${vendor.legalName} already exists`)
                continue
              }
            }

            try {
              const invoice = await prisma.invoice.create({
                data: {
                  tenantId,
                  invoiceNumber:  invoiceNum,
                  invoiceDate:    ocr.invoiceDate ? new Date(ocr.invoiceDate) : new Date(),
                  vendorId:       vendor?.id ?? null,
                  entityId:       defaultEntity.id,
                  channelType:    'EMAIL_INGEST',
                  status:         vendor ? 'DRAFT' : 'UNMATCHED',
                  apLane:         vendor ? null : 'MANUAL',
                  notes:          vendor ? null : `Unmatched — OCR: ${ocr.vendorName ?? 'unknown'} | GSTIN: ${ocr.vendorGSTIN ?? '—'} | Sender: ${senderEmail}`,
                  subtotal:       ocr.subtotal,
                  cgstAmount:     ocr.cgstAmount,
                  sgstAmount:     ocr.sgstAmount,
                  igstAmount:     ocr.igstAmount,
                  tdsAmount,
                  totalAmount,
                  netPayable:     totalAmount - tdsAmount,
                  taxableAmount:  ocr.subtotal,
                  irnNumber:      ocr.irnNumber,
                  ocrConfidence:  Math.round(ocr.confidence?.overall ?? 0),
                  ocrRawData:     ocr as unknown as object,
                  fileName:       attachment.filename ?? 'invoice.pdf',
                  mimeType,
                  createdByUserId: systemUser.id,
                },
              })

              if (ocr.lineItems?.length) {
                await prisma.invoiceLine.createMany({
                  data: ocr.lineItems.map((l, i) => ({
                    invoiceId:     invoice.id,
                    lineNumber:    i + 1,
                    description:   l.description ?? 'Line item',
                    hsnCode:       l.hsnCode  ?? undefined,
                    sacCode:       l.sacCode  ?? undefined,
                    quantity:      l.quantity ?? 1,
                    uom:           l.uom      ?? undefined,
                    unitPrice:     l.unitPrice ?? 0,
                    gstRate:       l.gstRate   ?? 0,
                    lineTotal:     l.amount    ?? 0,
                    taxableAmount: l.amount    ?? 0,
                  })),
                })
              }

              // Match scoring — skipped entirely for UNMATCHED (no vendorId to score against).
              // For matched invoices: also persists invoiceMatchScore and updates apLane/matchScore/matchLane.
              // Failures must NOT fail the ingestion — invoice stays DRAFT with no score.
              let scoreLane: string | null = vendor ? null : 'MANUAL'
              if (vendor) {
                try {
                  const score = await calculateMatchScore(prisma, {
                    invoiceId:     invoice.id,
                    tenantId,
                    vendorId:      vendor.id,
                    totalAmount,
                    ocrConfidence: invoice.ocrConfidence ?? undefined,
                  })
                  scoreLane = score.lane
                  if (score.lane === 'STP') {
                    await prisma.invoice.update({
                      where: { id: invoice.id },
                      data:  { status: 'SUBMITTED' },
                    })
                  }
                } catch (scoreErr: any) {
                  console.warn('[EmailPoller] Match scoring failed for', invoice.id, scoreErr?.message ?? scoreErr)
                }
              }

              console.log(`[EmailPoller] Invoice created: ${invoice.invoiceNumber} — status: ${invoice.status}, lane: ${scoreLane ?? 'unscored'}`)

              // Ingestion audit log
              try {
                await prisma.invoiceAuditLog.create({
                  data: {
                    invoiceId: invoice.id,
                    tenantId,
                    action:    'EMAIL_INGESTED',
                    userId:    systemUser.id,
                    userName:  'Email Poller',
                    details: {
                      gmailMessageId: msg.id,
                      senderEmail,
                      subject,
                      ocrConfidence:  ocr.confidence?.overall ?? null,
                      attachmentName: attachment.filename ?? null,
                      matchedVendor:  vendor?.legalName ?? null,
                      unmatched:      !vendor,
                    },
                  },
                })
              } catch (logErr: any) {
                console.warn('[EmailPoller] Audit log write failed for', invoice.id, logErr?.message ?? logErr)
              }

              processed++
            } catch (createErr: any) {
              // P2002 = duplicate (tenantId, invoiceNumber, vendorId) — race against pre-check
              if (createErr?.code === 'P2002') {
                errors.push(`Duplicate invoice "${invoiceNum}" from ${vendor?.legalName ?? 'unmatched vendor'} — already ingested`)
              } else {
                errors.push(`DB error for "${subject}": ${createErr.message ?? createErr}`)
              }
            }
          } catch (attErr: any) {
            const m = String(attErr?.message ?? attErr)
            errors.push(`Attachment error in "${subject}": ${m}`)
            // Quota exhausted — trip the breaker and stop processing this cycle
            if (m.includes('429') || /quota/i.test(m)) {
              quotaTripped = true
              break
            }
          }
        }
        if (quotaTripped) break

        // Mark email as read (only after attempting all attachments — partial success still marks read)
        await gmail.users.messages.modify({
          userId:      'me',
          id:          msg.id!,
          requestBody: { removeLabelIds: ['UNREAD'] },
        })
      } catch (msgErr: any) {
        errors.push(`Message error: ${msgErr.message ?? msgErr}`)
      }
    }
  } catch (err: any) {
    const m = String(err?.message ?? err)
    errors.push(`Gmail API error: ${m}`)
    if (m.includes('429') || /quota/i.test(m)) quotaTripped = true
  } finally {
    inFlight.delete(tenantId)
    if (quotaTripped) {
      rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
      console.log(`[EmailPoller] Quota tripped — pausing all polls for 1h (until ${new Date(rateLimitedUntil).toISOString()})`)
    }
  }

  console.log(`[EmailPoller] Processed: ${processed}, Errors: ${errors.length}${quotaTripped ? ' (quota tripped)' : ''}`)
  return { processed, errors, ...(quotaTripped ? { rateLimitedUntil: rateLimitedUntil! } : {}) }
}

// Retry OCR calls on transient 5xx / network errors only. 429 = quota
// exhausted; retrying in-cycle is wasted work since Gemini's daily/minute
// limits won't recover in ~6s. The caller (pollGmailInbox) trips a 1h
// circuit-breaker on 429 instead.
async function extractWithRetry(
  fn: () => Promise<EmailPollerOcrResult>,
  maxRetries = 2,
): Promise<EmailPollerOcrResult> {
  let lastErr: unknown
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      lastErr = err
      const msg = String(err?.message ?? err)
      // Never retry on quota errors — propagate so the poll loop can break early
      if (msg.includes('429') || /quota/i.test(msg)) throw err
      // Retry transient network/5xx once
      const isTransient = /5\d\d|ETIMEDOUT|ECONNRESET|ENOTFOUND/i.test(msg)
      if (!isTransient || i === maxRetries - 1) throw err
      await new Promise(r => setTimeout(r, 1500))
    }
  }
  throw lastErr ?? new Error('OCR retry exhausted')
}

// Walk nested multipart structures to find leaf parts (Gmail nests parts under
// multipart/mixed → multipart/alternative → leaf, etc.)
function flattenParts(parts: any[]): any[] {
  const out: any[] = []
  for (const p of parts) {
    if (p?.parts?.length) out.push(...flattenParts(p.parts))
    else                  out.push(p)
  }
  return out
}
