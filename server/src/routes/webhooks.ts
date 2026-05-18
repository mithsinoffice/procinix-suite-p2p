import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { timingSafeEqual } from 'node:crypto'
import { verifyWebhookSignature } from '../services/transbnk.service.js'
import { writeAuditLog, AuditAction } from '../lib/audit.js'
import { ingestInvoice } from '../services/invoice-ingestion.service.js'
import type { OcrInvoiceData } from '../services/gemini-ocr.service.js'

// Pre-OCR'd invoice payload from n8n. OCR happens in n8n (Gemini/Mistral/etc),
// our server only persists and scores.
const n8nInvoiceSchema = z.object({
  tenantId:        z.string().uuid(),
  messageId:       z.string().min(1),               // dedup key (Gmail msg id, n8n exec id, …)
  channelType:     z.string().default('EMAIL_INGEST'),
  senderEmail:     z.string().email().optional().nullable(),
  subject:         z.string().optional().nullable(),
  attachmentName:  z.string().optional().nullable(),
  mimeType:        z.string().optional().nullable(),
  invoice: z.object({
    invoiceNumber: z.string().nullable().optional(),
    invoiceDate:   z.string().nullable().optional(), // ISO YYYY-MM-DD
    dueDate:       z.string().nullable().optional(),
    vendorGSTIN:   z.string().nullable().optional(),
    vendorPAN:     z.string().nullable().optional(),
    irnNumber:     z.string().nullable().optional(),
    subtotal:      z.number().default(0),
    cgstAmount:    z.number().default(0),
    sgstAmount:    z.number().default(0),
    igstAmount:    z.number().default(0),
    tdsAmount:     z.number().default(0),
    totalAmount:   z.number().default(0),
    ocrConfidence: z.number().min(0).max(100).optional().nullable(),
    lineItems: z.array(z.object({
      description: z.string().default('Line item'),
      hsnCode:     z.string().nullable().optional(),
      sacCode:     z.string().nullable().optional(),
      quantity:    z.number().default(1),
      uom:         z.string().nullable().optional(),
      unitPrice:   z.number().default(0),
      gstRate:     z.number().default(0),
      amount:      z.number().default(0),
    })).default([]),
  }),
})

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// ISO YYYY-MM-DD → DD/MM/YYYY (the format ingestInvoice expects on OcrInvoiceData)
function isoToDmy(iso: string | null | undefined): string | null {
  if (!iso) return null
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

export async function webhookRoutes(app: FastifyInstance) {
  app.post('/webhooks/transbnk', async (request, reply) => {
    const signature = (request.headers['x-transbnk-signature'] as string) ?? ''
    const isValid   = await verifyWebhookSignature(JSON.stringify(request.body), signature)
    if (!isValid && process.env.NODE_ENV === 'production') {
      app.log.warn({ ip: request.ip }, 'Transbnk webhook: invalid signature')
      return reply.code(401).send({ error: 'Invalid signature' })
    }
    const { transaction_id, status, utr, reference_id, failure_reason } = request.body as any
    app.log.info({ transaction_id, status, utr }, 'Transbnk webhook received')
    try {
      const payment = await app.prisma.payment.findFirst({
        where: { OR: [{ transbnkTransactionId: transaction_id }, { id: reference_id }] },
      })
      if (!payment) return reply.code(200).send({ received: true })

      const statusMap: Record<string, string> = { SUCCESS: 'COMPLETED', COMPLETED: 'COMPLETED', FAILED: 'FAILED', REVERSED: 'REVERSED', PROCESSING: 'PROCESSING' }
      const newStatus = statusMap[status?.toUpperCase()] ?? 'PROCESSING'

      await app.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus as any, transbnkUtr: utr ?? payment.transbnkUtr,
          transbnkRawStatus: status, transbnkFailureReason: failure_reason ?? null,
          ...(newStatus === 'COMPLETED' && { transbnkCompletedAt: new Date() }),
        },
      })
      if (newStatus === 'COMPLETED' && payment.invoiceId) {
        await app.prisma.invoice.update({ where: { id: payment.invoiceId }, data: { status: 'PAID' } })
      }
      await writeAuditLog(app.prisma, {
        tenantId: payment.tenantId, userId: 'system',
        action: newStatus === 'COMPLETED' ? AuditAction.PAYMENT_PROCESSED : 'payment.status_updated',
        entityType: 'payment', entityId: payment.id,
        after: { status: newStatus, utr, transaction_id },
      })
      return reply.code(200).send({ received: true })
    } catch (e) {
      app.log.error({ err: e, transaction_id }, 'Webhook processing error')
      return reply.code(200).send({ received: true })
    }
  })

  // N8N email invoice webhook
  // N8N monitors ap@procinix.ai → extracts PDF attachments → calls this endpoint
  app.post('/webhooks/n8n/invoice-email', async (request, reply) => {
    // Verify N8N shared secret
    const secret     = process.env.N8N_WEBHOOK_SECRET ?? ''
    const authHeader = request.headers['x-n8n-secret'] as string ?? ''
    if (secret && authHeader !== secret) {
      app.log.warn({ ip: request.ip }, 'N8N webhook: invalid secret')
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const body = request.body as any
    const { from, subject, attachments = [] } = body

    app.log.info({ from, subject, attachmentCount: attachments.length }, 'N8N email invoice received')

    const results = []

    // Process each PDF/image attachment
    for (const att of attachments) {
      const mimeType = att.mimeType ?? att.mime_type ?? 'application/pdf'
      const base64   = att.data ?? att.base64 ?? att.content
      const fileName = att.filename ?? att.name ?? 'invoice.pdf'

      if (!base64) continue

      // Determine tenant from email recipient (for multi-tenant setups)
      // For now: use a default tenant — extend later for multi-tenant email routing
      const tenant = await app.prisma.tenant.findFirst({ where: { isActive: true } })
      if (!tenant) continue

      const systemUser = await app.prisma.user.findFirst({
        where: { tenantId: tenant.id, role: 'ADMIN' },
      })
      if (!systemUser) continue

      const result = await ingestInvoice(app.prisma, {
        channelType:  'EMAIL',
        base64Data:   base64,
        mimeType:     mimeType as any,
        fileName,
        emailFrom:    from,
        emailSubject: subject,
      }, {
        tenantId: tenant.id,
        userId:   systemUser.id,
      })

      results.push({ fileName, ok: result.ok, data: result.ok ? result.data : result.error.message })
    }

    return reply.code(200).send({ received: true, processed: results.length, results })
  })

  // ── n8n invoice-ingest webhook (pre-OCR'd JSON) ─────────────────────────────
  // n8n owns the OCR step (Gemini node, Mistral OCR, …) and POSTs structured
  // invoice data here. This route is a thin wrapper around the existing
  // ingestInvoice() service — vendor match (fuse.js fuzzy), dedup, invoice
  // create, match scoring, audit log, and InvoiceIngestionJob bookkeeping all
  // live there. We only add: webhook auth, body validation, and per-message
  // idempotency (so n8n retries don't double-create).
  app.post('/webhooks/n8n/invoice-ingest', async (request, reply) => {
    const secret      = process.env.N8N_WEBHOOK_SECRET ?? ''
    const headerValue = (request.headers['x-n8n-secret'] as string) ?? ''
    if (!secret) {
      app.log.error('N8N_WEBHOOK_SECRET not configured — refusing all ingest webhooks')
      return reply.code(503).send({ error: 'webhook not configured' })
    }
    if (!constantTimeEqual(headerValue, secret)) {
      app.log.warn({ ip: request.ip }, 'n8n invoice-ingest: bad secret')
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const parsed = n8nInvoiceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid body', issues: parsed.error.flatten() })
    }
    const body = parsed.data

    // Tenant + system user (for createdByUserId FK in ingestInvoice's ctx)
    const tenant = await app.prisma.tenant.findFirst({ where: { id: body.tenantId } })
    if (!tenant) return reply.code(404).send({ error: 'tenant not found' })

    const systemUser = await app.prisma.user.findFirst({
      where:   { tenantId: tenant.id, role: { in: ['SUPER_ADMIN', 'TENANT_ADMIN', 'AP_MANAGER'] } },
      orderBy: { createdAt: 'asc' },
      select:  { id: true },
    }) ?? await app.prisma.user.findFirst({
      where:   { tenantId: tenant.id },
      orderBy: { createdAt: 'asc' },
      select:  { id: true },
    })
    if (!systemUser) return reply.code(409).send({ error: 'no user for tenant' })

    // Per-message idempotency — match prior job whose extractedData carries the
    // same messageId. Catches n8n retries cleanly without a new table column.
    const priorJob = await app.prisma.invoiceIngestionJob.findFirst({
      where: {
        tenantId: tenant.id,
        extractedData: { path: '$.messageId', equals: body.messageId },
      },
      select: { id: true, invoiceId: true, status: true },
    })
    if (priorJob) {
      return reply.code(200).send({
        skipped:   'duplicate_message',
        jobId:     priorJob.id,
        invoiceId: priorJob.invoiceId,
        status:    priorJob.status,
      })
    }

    // Map the wire body → OcrInvoiceData. The messageId is stashed inside the
    // payload so the idempotency lookup above works on next call.
    const structuredData: Partial<OcrInvoiceData> & { messageId: string } = {
      messageId:     body.messageId,
      invoiceNumber: body.invoice.invoiceNumber ?? null,
      invoiceDate:   isoToDmy(body.invoice.invoiceDate),
      dueDate:       isoToDmy(body.invoice.dueDate),
      vendorGstin:   body.invoice.vendorGSTIN ?? null,
      vendorPan:     body.invoice.vendorPAN   ?? null,
      irn:           body.invoice.irnNumber   ?? null,
      subtotal:      body.invoice.subtotal,
      cgst:          body.invoice.cgstAmount,
      sgst:          body.invoice.sgstAmount,
      igst:          body.invoice.igstAmount,
      tdsAmount:     body.invoice.tdsAmount,
      tdsRate:       null,
      tdsSection:    null,
      totalTax:      body.invoice.cgstAmount + body.invoice.sgstAmount + body.invoice.igstAmount,
      totalAmount:   body.invoice.totalAmount,
      currency:      'INR',
      isEInvoice:    !!body.invoice.irnNumber,
      overallConfidence: body.invoice.ocrConfidence ?? 0,
      rawText:       '',
      lineItems: body.invoice.lineItems.map(l => ({
        description: l.description,
        hsn:         l.hsnCode ?? undefined,
        quantity:    l.quantity,
        unitPrice:   l.unitPrice,
        amount:      l.amount,
        gstRate:     l.gstRate,
        confidence:  body.invoice.ocrConfidence ?? 0,
      })),
    }

    const result = await ingestInvoice(
      app.prisma,
      {
        channelType:    'EMAIL',
        structuredData,
        emailFrom:      body.senderEmail   ?? undefined,
        emailSubject:   body.subject       ?? undefined,
        fileName:       body.attachmentName ?? 'invoice.pdf',
        mimeType:       (body.mimeType as any) ?? 'application/pdf',
      },
      { tenantId: tenant.id, userId: systemUser.id, ip: request.ip },
    )

    if (!result.ok) {
      // 409 from ingestInvoice = duplicate (tenant+vendor+invoiceNumber already exists)
      const status = result.error.httpStatus ?? 500
      return reply.code(status).send({ error: result.error.code, message: result.error.message })
    }

    return reply.code(201).send(result.data)
  })
}
