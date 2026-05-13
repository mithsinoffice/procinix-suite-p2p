import type { FastifyInstance } from 'fastify'
import { verifyWebhookSignature } from '../services/transbnk.service.js'
import { writeAuditLog, AuditAction } from '../lib/audit.js'

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
}
