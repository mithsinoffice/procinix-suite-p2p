import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { cacheGet, cacheSet, TTL, CacheKeys } from '../lib/redis.js'
import {
  listMaster, createMasterRecord, updateMasterRecord,
  submitMasterRecord, approveMasterRecord, bulkCreateMasterRecords,
  type MasterTable,
} from '../services/master.service.js'

const TABLE_ROUTE_MAP: Record<string, MasterTable> = {
  'departments':    'department',
  'gl-codes':       'glCode',
  'cost-centres':   'costCentre',
  'tax-codes':      'taxCode',
  'designations':   'designation',
  'entities':       'entity',
  'locations':      'location',
  'tax-regimes':    'taxRegime',
  'workflow-rules': 'workflowRule',
  'employees':      'employee',
}

const listSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  cursor: z.string().optional(),
  take:   z.coerce.number().int().min(1).max(200).default(50),
})

const createSchema = z.object({
  code:              z.string().min(1).max(20),
  name:              z.string().min(1).max(200),
  description:       z.string().optional(),
  // GL code specific
  accountType:       z.string().optional(),
  // Tax code specific
  cgstRate:          z.coerce.number().optional(),
  sgstRate:          z.coerce.number().optional(),
  igstRate:          z.coerce.number().optional(),
  // Misc
  submitForApproval: z.boolean().default(false),
})

export async function masterRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // ── Dropdown endpoint (used by all forms) ──
  app.get('/dropdown', auth, async (request, reply) => {
    const tenantId = request.tenant.id
    const cacheKey = CacheKeys.masterData(tenantId)
    const cached   = await cacheGet(app.redis, cacheKey)
    if (cached) return reply.send(cached)

    const [vendors, glCodes, departments, costCentres, taxCodes] = await Promise.all([
      app.prisma.vendor.findMany({
        where:   { tenantId, status: 'ACTIVE' },
        select:  { id: true, vendorCode: true, legalName: true, gstin: true, pan: true, panCompliance: true, tdsApplicable: true, tdsSectionCode: true, paymentTerms: true, transbnkBeneficiaryId: true },
        orderBy: { legalName: 'asc' },
      }),
      app.prisma.glCode.findMany({ where: { tenantId, isActive: true }, select: { id: true, code: true, name: true, accountType: true }, orderBy: { code: 'asc' } }),
      app.prisma.department.findMany({ where: { tenantId, isActive: true }, select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } }),
      app.prisma.costCentre.findMany({ where: { tenantId, isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
      app.prisma.taxCode.findMany({ where: { tenantId, isActive: true }, select: { id: true, code: true, description: true, cgstRate: true, sgstRate: true, igstRate: true }, orderBy: { code: 'asc' } }),
    ])

    const result = { vendors, glCodes, departments, costCentres, taxCodes }
    await cacheSet(app.redis, cacheKey, result, TTL.MASTER_DATA)
    return reply.send(result)
  })

  // ── Geography (read-only, system-seeded) ──
  app.get('/countries', auth, async (_req, reply) => {
    return reply.send(await app.prisma.country.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }))
  })

  app.get('/states', auth, async (req, reply) => {
    const { countryCode = 'IN' } = req.query as any
    return reply.send(await app.prisma.state.findMany({ where: { countryCode, isActive: true }, orderBy: { name: 'asc' } }))
  })

  app.get('/cities', auth, async (req, reply) => {
    const { stateCode } = req.query as any
    const where: any = { isActive: true }
    if (stateCode) where.stateCode = stateCode
    return reply.send(await app.prisma.city.findMany({ where, orderBy: { name: 'asc' }, take: 100 }))
  })

  // ── Currencies (system-wide) ──
  app.get('/currencies', auth, async (_req, reply) => {
    return reply.send(await app.prisma.currency.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } }))
  })

  // ── Tax regimes by country (for entity form cascade) ──
  app.get('/tax-regimes-by-country', auth, async (req, reply) => {
    const { countryCode } = req.query as { countryCode?: string }
    const regimes = await app.prisma.taxRegime.findMany({
      where: {
        tenantId: req.tenant.id,
        isActive: true,
        ...(countryCode && { countryCode }),
      },
      orderBy: { name: 'asc' },
    })
    return reply.send(regimes)
  })

  // ── Entity compliance detail ──
  app.get('/entities/:id/compliance', auth, async (req, reply) => {
    const entity = await app.prisma.entity.findFirst({
      where:   { id: (req.params as any).id, tenantId: req.tenant.id },
      include: { taxRegime: true },
    })
    if (!entity) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Entity not found' })
    return reply.send({
      ...entity,
      isGstRegime:   entity.taxRegime?.regimeType === 'GST',
      isVatRegime:   entity.taxRegime?.regimeType === 'VAT',
      tdsApplicable: entity.taxRegime?.tdsApplicable ?? false,
      requiresGstin: entity.taxRegime?.requiresGstin ?? false,
      requiresVat:   entity.taxRegime?.requiresVat ?? false,
      vatRate:       entity.taxRegime?.vatRate ?? null,
    })
  })

  // ── Financial Years ──
  app.get('/financial-years', auth, async (req, reply) => {
    return reply.send(await app.prisma.financialYear.findMany({ where: { tenantId: req.tenant.id }, orderBy: { startDate: 'desc' } }))
  })

  app.post('/financial-years', auth, async (req, reply) => {
    const { code, name, startDate, endDate, isCurrent = false } = req.body as any
    const fy = await app.prisma.financialYear.create({
      data: { tenantId: req.tenant.id, code, name, startDate: new Date(startDate), endDate: new Date(endDate), isCurrent, status: 'ACTIVE', isActive: true, createdByUserId: req.user.sub },
    })
    return reply.code(201).send({ id: fy.id })
  })

  // ── Generic CRUD for all masters ──
  for (const [route, table] of Object.entries(TABLE_ROUTE_MAP)) {

    // List
    app.get(`/${route}`, auth, async (req, reply) => {
      const filter = listSchema.parse(req.query)
      return reply.send(await listMaster(app.prisma, table, req.tenant.id, filter))
    })

    // Get one
    app.get(`/${route}/:id`, auth, async (req, reply) => {
      const { id } = req.params as { id: string }
      const delegate = (app.prisma as any)[table]
      const row = await delegate.findFirst({ where: { id, tenantId: req.tenant.id } })
      if (!row) return reply.code(404).send({ code: 'NOT_FOUND', message: `${table} not found` })
      return reply.send(row)
    })

    // Create
    app.post(`/${route}`, auth, async (req, reply) => {
      const { submitForApproval, ...input } = createSchema.parse(req.body)
      const result = await createMasterRecord(app.prisma, app.redis, table, req.tenant.id, input, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip }, submitForApproval)
      if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
      return reply.code(201).send(result.data)
    })

    // Update
    app.put(`/${route}/:id`, auth, async (req, reply) => {
      const { id }  = req.params as { id: string }
      const { submitForApproval: _sf, ...input } = createSchema.partial().parse(req.body)
      const result  = await updateMasterRecord(app.prisma, app.redis, table, id, req.tenant.id, input, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip })
      if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
      return reply.send(result.data)
    })

    // Submit for approval
    app.post(`/${route}/:id/submit`, auth, async (req, reply) => {
      const result = await submitMasterRecord(app.prisma, table, (req.params as any).id, req.tenant.id, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip })
      if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
      return reply.send({ ok: true })
    })

    // Approve
    app.post(`/${route}/:id/approve`, auth, async (req, reply) => {
      const result = await approveMasterRecord(app.prisma, app.redis, table, (req.params as any).id, req.tenant.id, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip })
      if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
      return reply.send({ ok: true })
    })

    // Bulk upload
    app.post(`/${route}/bulk`, auth, async (req, reply) => {
      const { rows, submitForApproval = false } = req.body as { rows: Record<string, unknown>[]; submitForApproval?: boolean }
      if (!Array.isArray(rows) || rows.length === 0) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'rows array is required' })
      if (rows.length > 500) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Maximum 500 rows per upload' })
      const result = await bulkCreateMasterRecords(app.prisma, app.redis, table, req.tenant.id, rows, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip }, submitForApproval)
      return reply.send(result)
    })

    // Audit trail for a record
    app.get(`/${route}/:id/audit`, auth, async (req, reply) => {
      const logs = await app.prisma.auditLog.findMany({
        where:   { tenantId: req.tenant.id, entityType: table, entityId: (req.params as any).id },
        orderBy: { createdAt: 'desc' },
        take:    50,
      })
      return reply.send(logs)
    })
  }
}
