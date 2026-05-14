import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createInvoice, listInvoices, getInvoice, submitInvoice, approveInvoice, rejectInvoice } from '../services/invoice.service.js'

const lineSchema = z.object({
  lineNumber:   z.number().int().positive(),
  description:  z.string().min(1).max(500),
  quantity:     z.coerce.number().positive(),
  unitPrice:    z.coerce.number().positive(),
  taxCodeId:    z.string().optional(),
  isRcm:        z.boolean().default(false),
  glCodeId:     z.string().optional(),
  costCentreId: z.string().optional(),
})

const createSchema = z.object({
  invoiceNumber: z.string().min(1).max(100),
  vendorId:      z.string().uuid(),
  invoiceDate:   z.string().min(1),
  dueDate:       z.string().optional(),
  currency:      z.string().default('INR'),
  glCodeId:      z.string().optional(),
  costCentreId:  z.string().optional(),
  departmentId:  z.string().optional(),
  poId:          z.string().optional(),
  grnId:         z.string().optional(),
  narration:     z.string().max(1000).optional(),
  lines:         z.array(lineSchema).min(1),
})

const listSchema = z.object({
  status:   z.string().optional(),
  vendorId: z.string().optional(),
  search:   z.string().optional(),
  cursor:   z.string().optional(),
  take:     z.coerce.number().int().min(1).max(100).default(25),
})

export async function invoiceRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/', auth, async (req, reply) => {
    const filter = listSchema.parse(req.query)
    return reply.send(await listInvoices(app.prisma, req.tenant.id, filter))
  })

  app.post('/', auth, async (req, reply) => {
    const input  = createSchema.parse(req.body)
    const result = await createInvoice(app.prisma, app.redis, input, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip })
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
    return reply.code(201).send(result.data)
  })

  app.get('/:id', auth, async (req, reply) => {
    const result = await getInvoice(app.prisma, (req.params as any).id, req.tenant.id)
    if (!result.ok) return reply.code(result.error.httpStatus ?? 404).send(result.error)
    return reply.send(result.data)
  })

  app.post('/:id/submit', auth, async (req, reply) => {
    const result = await submitInvoice(app.prisma, (req.params as any).id, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip })
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
    return reply.send({ ok: true })
  })

  app.post('/:id/approve', auth, async (req, reply) => {
    const { comments } = (req.body ?? {}) as { comments?: string }
    const result = await approveInvoice(app.prisma, (req.params as any).id, comments, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip })
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
    return reply.send({ ok: true })
  })

  app.post('/:id/reject', auth, async (req, reply) => {
    const { comments } = (req.body ?? {}) as { comments: string }
    if (!comments) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Rejection reason is required' })
    const result = await rejectInvoice(app.prisma, (req.params as any).id, comments, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip })
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
    return reply.send({ ok: true })
  })

  // POST /api/invoices/ingest — manual file upload with OCR
  app.post('/ingest', { ...auth, config: { rawBody: true } }, async (req, reply) => {
    const body = req.body as any
    const { base64Data, mimeType, fileName, channelType = 'MANUAL_UPLOAD' } = body

    if (!base64Data || !mimeType) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'base64Data and mimeType are required' })
    }

    const { ingestInvoice } = await import('../services/invoice-ingestion.service.js')
    const result = await ingestInvoice(app.prisma, {
      channelType, base64Data, mimeType, fileName,
    }, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip })

    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
    return reply.code(201).send(result.data)
  })

  // GET /api/invoices/:id/score — get match score breakdown
  app.get('/:id/score', auth, async (req, reply) => {
    const score = await app.prisma.invoiceMatchScore.findFirst({
      where: { invoiceId: (req.params as any).id, tenantId: req.tenant.id },
    })
    if (!score) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Score not found' })
    return reply.send(score)
  })
}
