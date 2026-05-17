import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createVendor, listVendors, getVendor, updateVendor } from '../services/vendor.service.js'

const createSchema = z.object({
  legalName:    z.string().min(1).max(200),
  tradeName:    z.string().optional(),
  gstin:        z.string().optional(),
  pan:          z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN'),
  cin:          z.string().optional(),
  udyamNumber:  z.string().optional(),
  vendorType:   z.enum(['SUPPLIER','SERVICE_PROVIDER','CONTRACTOR','EMPLOYEE','INTERCOMPANY']),
  email:        z.string().email().optional().or(z.literal('')),
  mobile:       z.string().optional(),
  city:         z.string().optional(),
  state:        z.string().optional(),
  pincode:      z.string().optional(),
  bankAccountNo: z.string().optional(),
  ifscCode:     z.string().optional(),
  bankName:     z.string().optional(),
  paymentTerms: z.coerce.number().int().min(0).max(365).default(30),
  tdsApplicable:  z.boolean().default(false),
  tdsSectionCode: z.string().optional(),
})

const listSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  cursor: z.string().optional(),
  take:   z.coerce.number().int().min(1).max(100).default(25),
})

export async function vendorRoutes(app: FastifyInstance) {
  const opts = { preHandler: [app.authenticate] }

  // Duplicate PAN check — must be before /:id to avoid param capture
  app.get('/check-duplicate', opts, async (req, reply) => {
    const { pan, vendorId } = req.query as any
    if (!pan) return reply.send({ isDuplicate: false })
    const existing = await app.prisma.vendor.findFirst({
      where: { tenantId: req.tenant.id, pan, ...(vendorId && { id: { not: vendorId } }) },
      select: { id: true, legalName: true, vendorCode: true },
    })
    return reply.send({ isDuplicate: !!existing, existingVendor: existing })
  })

  // List
  app.get('/', opts, async (request, reply) => {
    const filter = listSchema.parse(request.query)
    const result = await listVendors(app.prisma, request.tenant.id, filter)
    return reply.send(result)
  })

  // Create
  app.post('/', opts, async (request, reply) => {
    const input = createSchema.parse(request.body)
    const result = await createVendor(app.prisma, app.redis, request.tenant.id, input, {
      tenantId: request.tenant.id, userId: request.user.sub, ip: request.ip,
    })
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
    return reply.code(201).send(result.data)
  })

  // Get one
  app.get('/:id', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await getVendor(app.prisma, id, request.tenant.id)
    if (!result.ok) return reply.code(result.error.httpStatus ?? 404).send(result.error)
    return reply.send(result.data)
  })

  // Update
  app.put('/:id', opts, async (request, reply) => {
    const { id }  = request.params as { id: string }
    const input   = createSchema.partial().parse(request.body)
    const result  = await updateVendor(app.prisma, app.redis, id, request.tenant.id, input, {
      tenantId: request.tenant.id, userId: request.user.sub, ip: request.ip,
    })
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
    return reply.send(result.data)
  })

  // KYC — one-click PAN chain
  app.post('/:id/kyc/pan', opts, async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = await getVendor(app.prisma, id, req.tenant.id)
    if (!result.ok) return reply.code(404).send(result.error)
    const v = result.data
    if (!v.pan) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'PAN is required for this check' })
    const { runPANChain } = await import('../services/kyc/kyc.service.js')
    const data = await runPANChain(app.prisma, v.id, v.pan, v.cin ?? undefined, v.udyamNumber ?? undefined)
    return reply.send(data)
  })

  // KYC — one-click GST chain
  app.post('/:id/kyc/gst', opts, async (req, reply) => {
    const { id }    = req.params as { id: string }
    const { gstin } = req.body as any
    if (!gstin) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'gstin is required' })
    const result = await getVendor(app.prisma, id, req.tenant.id)
    if (!result.ok) return reply.code(404).send(result.error)
    const { runGSTChain } = await import('../services/kyc/kyc.service.js')
    const data = await runGSTChain(app.prisma, id, gstin)
    return reply.send(data)
  })

  // KYC — bank penny drop
  app.post('/:id/kyc/bank/:bankAccountId', opts, async (req, reply) => {
    const { bankAccountId } = req.params as any
    const bank = await app.prisma.vendorBankAccount.findFirst({ where: { id: bankAccountId } })
    if (!bank) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Bank account not found' })
    const { runBankChain } = await import('../services/kyc/kyc.service.js')
    const data = await runBankChain(app.prisma, bank.id, bank.accountNo, bank.ifsc, bank.accountHolderName ?? '')
    return reply.send(data)
  })

  // Trigger full KYC (all checks)
  app.post('/:id/kyc', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await getVendor(app.prisma, id, request.tenant.id)
    if (!result.ok) return reply.code(404).send(result.error)
    const v = result.data
    // Fire and forget
    const { runVendorKyc } = await import('../services/kyc.orchestrator.js')
    runVendorKyc(app.prisma, {
      id, pan: v.pan, gstin: v.gstin ?? undefined, cin: v.cin ?? undefined,
      udyamNumber: v.udyamNumber ?? undefined, bankAccountNo: v.bankAccountNo ?? undefined,
      ifscCode: v.ifscCode ?? undefined, legalName: v.legalName,
      email: v.email ?? undefined, mobile: v.mobile ?? undefined,
    }, { tenantId: request.tenant.id, userId: request.user.sub, ip: request.ip })
    .catch(e => app.log.error(e, 'Manual KYC failed'))
    return reply.send({ ok: true, message: 'KYC checks triggered' })
  })
}
