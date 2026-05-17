import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createVendor, listVendors, getVendor, updateVendor } from '../services/vendor.service.js'

const bankAccountRowSchema = z.object({
  id:                z.string().optional(),
  accountNo:         z.string().min(9).max(18),
  ifsc:              z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC'),
  bankName:          z.string().optional(),
  branch:            z.string().optional(),
  accountType:       z.enum(['CURRENT','SAVINGS','ESCROW','OD']).default('CURRENT'),
  currencyCode:      z.string().default('INR'),
  accountHolderName: z.string().optional(),
  isPrimary:         z.boolean().default(false),
})

const gstRegRowSchema = z.object({
  id:               z.string().optional(),
  stateCode:        z.string().min(1).max(2),
  gstin:            z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN'),
  registrationType: z.enum(['REGULAR','COMPOSITION','UNREGISTERED','SEZ','EXPORT','ISD']).default('REGULAR'),
  isPrimary:        z.boolean().default(false),
  spocName:         z.string().optional(),
  spocEmail:        z.string().email().optional().or(z.literal('')),
  spocPhone:        z.string().optional(),
})

const entityMappingRowSchema = z.object({
  id:              z.string().optional(),
  entityId:        z.string().min(1),
  glCodeId:        z.string().optional(),
  costCentreId:    z.string().optional(),
  profitCentreId:  z.string().optional(),
  currencyCode:    z.string().default('INR'),
  creditLimit:     z.coerce.number().min(0).optional(),
  blockPO:         z.boolean().default(false),
  blockPayment:    z.boolean().default(false),
  blockReason:     z.string().optional(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(30),
  paymentMode:     z.string().optional(),
  erpVendorCode:   z.string().optional(),
  erpSystem:       z.string().optional(),
})

const createSchema = z.object({
  // Identity
  legalName:        z.string().min(1).max(200),
  tradeName:        z.string().optional(),
  gstin:            z.string().optional(),
  pan:              z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN'),
  cin:              z.string().optional(),
  udyamNumber:      z.string().optional(),
  vendorType:       z.enum(['SUPPLIER','SERVICE_PROVIDER','CONTRACTOR','EMPLOYEE','INTERCOMPANY']),
  vendorCategoryId: z.string().optional(),
  vendorGroupId:    z.string().optional(),
  countryCode:      z.string().default('IN'),
  taxRegimeCode:    z.string().optional(),
  // Contact
  email:       z.string().email().optional().or(z.literal('')),
  mobile:      z.string().optional(),
  contactName: z.string().optional(),
  website:     z.string().optional(),
  // Address
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city:         z.string().optional(),
  state:        z.string().optional(),
  stateCode:    z.string().optional(),
  pincode:      z.string().optional(),
  // Payment
  paymentTerms:    z.coerce.number().int().min(0).max(365).default(30),
  paymentMode:     z.string().optional(),
  paymentCurrency: z.string().optional(),
  // TDS
  tdsApplicable:     z.boolean().default(false),
  tdsSectionCode:    z.string().optional(),
  tdsSectionId:      z.string().optional(),
  tdsRate:           z.coerce.number().optional(),
  tdsExempt:         z.boolean().default(false),
  lowerTdsCertNo:    z.string().optional(),
  lowerTdsSection:   z.string().optional(),
  lowerTdsRate:      z.coerce.number().optional(),
  lowerTdsValidFrom: z.string().optional(),
  lowerTdsValidTo:   z.string().optional(),
  lowerTdsAlertDays: z.coerce.number().int().default(30),
  einvoiceRequired:  z.boolean().default(false),
  is206ABApplicable: z.boolean().default(false),
  tan:               z.string().optional(),
  panCompliance:     z.enum(['COMPLIANT','NON_FILER','LOWER_DEDUCTION','EXEMPTED']).default('COMPLIANT'),
  // ERP
  erpVendorCode: z.string().optional(),
  erpSystem:     z.string().optional(),
  // PAN / Aadhaar / MSME
  panEntityType: z.string().optional(),
  aadharNo:      z.string().optional(),
  msmeCategory:  z.string().optional(),
  // Sub-tables
  bankAccounts:     z.array(bankAccountRowSchema).optional(),
  gstRegistrations: z.array(gstRegRowSchema).optional(),
  entityMappings:   z.array(entityMappingRowSchema).optional(),
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
    const data = await runPANChain(app.prisma, v.id, v.pan, v.cin ?? undefined, v.udyamNumber ?? undefined, req.tenant.id)
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
    const data = await runGSTChain(app.prisma, id, gstin, req.tenant.id)
    return reply.send(data)
  })

  // KYC — bank penny drop
  app.post('/:id/kyc/bank/:bankAccountId', opts, async (req, reply) => {
    const { bankAccountId } = req.params as any
    const bank = await app.prisma.vendorBankAccount.findFirst({ where: { id: bankAccountId } })
    if (!bank) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Bank account not found' })
    const { runBankChain } = await import('../services/kyc/kyc.service.js')
    const data = await runBankChain(app.prisma, bank.id, bank.accountNo, bank.ifsc, bank.accountHolderName ?? '', req.tenant.id)
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
