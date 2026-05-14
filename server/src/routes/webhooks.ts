import type { FastifyInstance } from 'fastify'
import { verifyWebhookSignature } from '../services/transbnk.service.js'
import { writeAuditLog, AuditAction } from '../lib/audit.js'
import { ingestInvoice } from '../services/invoice-ingestion.service.js'

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
}
