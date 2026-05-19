import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { cacheGet, cacheSet, TTL, CacheKeys } from '../lib/redis.js'
import { sanitisePayload } from '../lib/payload.js'
import { startWorkflow } from '../services/workflow-engine.service.js'
import {
  validateItemSubmittable, resolveItemStatusAfterSubmit,
} from '../services/item-submit.service.js'
import {
  validateMasterSubmittable, resolveMasterStatusAfterSubmit,
} from '../services/master-submit.service.js'
import {
  detectMaterialChange, buildChangeRequestPayload, validateChangeRequest,
  MATERIAL_FIELDS,
} from '../services/item-change.service.js'
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
  search:   z.string().optional(),
  status:   z.string().optional(),
  cursor:   z.string().optional(),
  take:     z.coerce.number().int().min(1).max(200).default(50),
  mine:     z.coerce.boolean().default(false),
  entityId: z.string().optional(),
})

// Permissive schema: `code` is optional (service auto-generates via generateCode), and
// unknown keys pass through so master-specific fields (email, mobile, departmentId, …)
// reach Prisma. Prisma's NOT NULL columns still enforce real required-ness at the DB layer.
const createSchema = z.object({
  code:              z.string().min(1).max(20).optional(),
  name:              z.string().min(1).max(200).optional(),
  description:       z.string().optional(),
  accountType:       z.string().optional(),
  cgstRate:          z.coerce.number().optional(),
  sgstRate:          z.coerce.number().optional(),
  igstRate:          z.coerce.number().optional(),
  submitForApproval: z.boolean().default(false),
}).passthrough()

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

  // ── Country CRUD ──
  app.get('/countries', auth, async (req, reply) => {
    const { status, search } = req.query as any
    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (search) where.OR = [{ name: { contains: search } }, { code: { contains: search } }]
    return reply.send(await app.prisma.country.findMany({ where, orderBy: { name: 'asc' } }))
  })
  app.post('/countries', auth, async (req, reply) => {
    const { code, name, isoCode3, localName, region, dialCode, currency, status = 'ACTIVE' } = req.body as any
    const row = await app.prisma.country.create({ data: { code: code.toUpperCase(), name, isoCode3, localName, region, dialCode, currency, status } })
    return reply.code(201).send(row)
  })
  app.put('/countries/:code', auth, async (req, reply) => {
    const { submitForApproval: _sf, ...data } = req.body as any
    const row = await app.prisma.country.update({ where: { code: (req.params as any).code }, data })
    return reply.send(row)
  })
  app.post('/countries/:code/approve', auth, async (req, reply) => {
    const row = await app.prisma.country.update({ where: { code: (req.params as any).code }, data: { status: 'ACTIVE' } })
    return reply.send(row)
  })
  app.get('/countries/:code/audit', auth, async (req, reply) => {
    const logs = await app.prisma.auditLog.findMany({
      where:   { tenantId: req.tenant.id, entityType: 'country', entityId: (req.params as any).code },
      orderBy: { createdAt: 'desc' }, take: 50,
    })
    return reply.send(logs)
  })

  // ── State CRUD ──
  app.get('/states', auth, async (req, reply) => {
    const { countryCode, status, search } = req.query as any
    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (countryCode) where.countryCode = countryCode
    if (search) where.OR = [{ name: { contains: search } }, { code: { contains: search } }]
    return reply.send(await app.prisma.state.findMany({ where, orderBy: { name: 'asc' } }))
  })
  app.post('/states', auth, async (req, reply) => {
    const { code, name, countryCode, gstCode, status = 'ACTIVE' } = req.body as any
    const row = await app.prisma.state.create({ data: { code, name, countryCode, gstCode, status } })
    return reply.code(201).send(row)
  })
  app.put('/states/:id', auth, async (req, reply) => {
    const { submitForApproval: _sf, ...data } = req.body as any
    const row = await app.prisma.state.update({ where: { id: (req.params as any).id }, data })
    return reply.send(row)
  })
  app.post('/states/:id/approve', auth, async (req, reply) => {
    const row = await app.prisma.state.update({ where: { id: (req.params as any).id }, data: { status: 'ACTIVE' } })
    return reply.send(row)
  })

  // ── City CRUD ──
  app.get('/cities', auth, async (req, reply) => {
    const { stateCode, countryCode, status, search } = req.query as any
    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (stateCode)   where.stateCode   = stateCode
    if (countryCode) where.countryCode = countryCode
    if (search) where.OR = [{ name: { contains: search } }]
    return reply.send(await app.prisma.city.findMany({ where, orderBy: { name: 'asc' }, take: 200 }))
  })
  app.post('/cities', auth, async (req, reply) => {
    const { submitForApproval: _sf, ...data } = req.body as any
    const row = await app.prisma.city.create({ data: { ...data, status: data.status ?? 'ACTIVE' } })
    return reply.code(201).send(row)
  })
  app.put('/cities/:id', auth, async (req, reply) => {
    const { submitForApproval: _sf, ...data } = req.body as any
    const row = await app.prisma.city.update({ where: { id: (req.params as any).id }, data })
    return reply.send(row)
  })
  app.post('/cities/:id/approve', auth, async (req, reply) => {
    const row = await app.prisma.city.update({ where: { id: (req.params as any).id }, data: { status: 'ACTIVE' } })
    return reply.send(row)
  })
  app.get('/cities/:id/audit', auth, async (req, reply) => {
    const logs = await app.prisma.auditLog.findMany({
      where:   { tenantId: req.tenant.id, entityType: 'city', entityId: (req.params as any).id },
      orderBy: { createdAt: 'desc' }, take: 50,
    })
    return reply.send(logs)
  })

  // ── Currency CRUD ──
  app.get('/currencies', auth, async (req, reply) => {
    const { status, search } = req.query as any
    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (search) where.OR = [{ name: { contains: search } }, { code: { contains: search } }]
    return reply.send(await app.prisma.currency.findMany({ where, orderBy: { code: 'asc' } }))
  })
  app.post('/currencies', auth, async (req, reply) => {
    const body = req.body as Record<string, unknown>
    const row = await app.prisma.currency.create({
      data: { ...body, status: (body.status as string) ?? 'DRAFT', createdByUserId: req.user.sub } as never,
    })
    return reply.code(201).send(row)
  })
  app.put('/currencies/:code', auth, async (req, reply) => {
    const { submitForApproval: _sf, ...data } = req.body as Record<string, unknown>
    const row = await app.prisma.currency.update({ where: { code: (req.params as { code: string }).code }, data: data as never })
    return reply.send(row)
  })
  // Submit currency for approval. Currency is global (no tenantId column) but
  // we still gate by DRAFT/REJECTED and start a workflow scoped to the
  // submitter's tenant so the Approval Desk in that tenant picks it up.
  app.post('/currencies/:id/submit', auth, async (req, reply) => {
    const id = (req.params as { id: string }).id
    const existing = await app.prisma.currency.findFirst({ where: { id }, select: { id: true, status: true } })
    if (!existing) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Currency not found' })
    const guard = validateMasterSubmittable('currency', existing.status)
    if (!guard.ok) return reply.code(422).send({ code: 'WORKFLOW_INVALID_STATE', message: guard.message })
    const wf = await startWorkflow(
      app.prisma, 'CURRENCY', 'currency', id, {},
      { tenantId: req.tenant.id, userId: req.user.sub, userName: (req.user as { name?: string }).name ?? req.user.sub },
    )
    if (!wf.ok && wf.error.message !== 'NO_WORKFLOW_DEFINED') {
      return reply.code(wf.error.httpStatus ?? 400).send(wf.error)
    }
    const newStatus = resolveMasterStatusAfterSubmit({
      ok: wf.ok, autoApproved: wf.ok ? wf.data.autoApproved : false, noWorkflowDefined: !wf.ok,
    })
    await app.prisma.currency.update({ where: { id }, data: { status: newStatus, isActive: newStatus === 'ACTIVE' } })
    return reply.send({ ok: true, status: newStatus, workflowInstanceId: wf.ok ? wf.data.instanceId : null })
  })
  app.post('/currencies/:id/approve', auth, async (req, reply) => {
    const row = await app.prisma.currency.update({ where: { id: (req.params as { id: string }).id }, data: { status: 'ACTIVE', isActive: true } })
    return reply.send(row)
  })
  app.get('/currencies/:id/audit', auth, async (req, reply) => {
    const logs = await app.prisma.auditLog.findMany({
      where:   { tenantId: req.tenant.id, entityType: 'currency', entityId: (req.params as any).id },
      orderBy: { createdAt: 'desc' }, take: 50,
    })
    return reply.send(logs)
  })

  // ── FX Rate CRUD ──
  app.get('/fx-rates', auth, async (req, reply) => {
    const { fromCurrency, toCurrency, status } = req.query as any
    const where: any = {}
    if (fromCurrency) where.fromCurrency = fromCurrency
    if (toCurrency)   where.toCurrency   = toCurrency
    if (status && status !== 'ALL') where.status = status
    return reply.send(await app.prisma.fxRate.findMany({
      where, orderBy: [{ effectiveDate: 'desc' }, { fromCurrency: 'asc' }], take: 200,
    }))
  })
  app.post('/fx-rates', auth, async (req, reply) => {
    const { fromCurrency, toCurrency, rate, effectiveDate, expiryDate, source = 'MANUAL' } = req.body as any
    const row = await app.prisma.fxRate.create({
      data: {
        fromCurrency, toCurrency, rate, source,
        effectiveDate: new Date(effectiveDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: 'ACTIVE', createdByUserId: req.user.sub,
      },
    })
    return reply.code(201).send(row)
  })
  app.put('/fx-rates/:id', auth, async (req, reply) => {
    const { submitForApproval: _sf, ...data } = req.body as any
    const row = await app.prisma.fxRate.update({
      where: { id: (req.params as any).id },
      data,
    })
    return reply.send(row)
  })
  app.get('/fx-rates/:id/audit', auth, async (req, reply) => {
    const logs = await app.prisma.auditLog.findMany({
      where:   { tenantId: req.tenant.id, entityType: 'fxRate', entityId: (req.params as any).id },
      orderBy: { createdAt: 'desc' }, take: 50,
    })
    return reply.send(logs)
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
    const { status, search } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.status = status
    if (search) where.OR = [{ name: { contains: search } }, { code: { contains: search } }]
    return reply.send(await app.prisma.financialYear.findMany({ where, orderBy: { startDate: 'desc' } }))
  })

  app.post('/financial-years', auth, async (req, reply) => {
    const { code, name, startDate, endDate, isCurrent = false, status: bodyStatus } = req.body as Record<string, unknown>
    // Always create as DRAFT — the workflow engine (POST /:id/submit) drives
    // the PENDING_APPROVAL → ACTIVE transition. Callers that explicitly need
    // ACTIVE (seeds, admin tools) can pass a status override in the body.
    const status = (bodyStatus as string | undefined) ?? 'DRAFT'
    const fy = await app.prisma.financialYear.create({
      data: { tenantId: req.tenant.id, code: code as string, name: name as string, startDate: new Date(startDate as string), endDate: new Date(endDate as string), isCurrent: !!isCurrent, status, isActive: status === 'ACTIVE', createdByUserId: req.user.sub },
    })
    return reply.code(201).send(fy)
  })

  app.put('/financial-years/:id', auth, async (req, reply) => {
    const { submitForApproval: _sf, startDate, endDate, ...rest } = req.body as any
    const data: any = { ...rest }
    if (startDate) data.startDate = new Date(startDate)
    if (endDate)   data.endDate   = new Date(endDate)
    const fy = await app.prisma.financialYear.update({ where: { id: (req.params as any).id }, data })
    return reply.send(fy)
  })

  app.post('/financial-years/:id/submit', auth, async (req, reply) => {
    const id = (req.params as { id: string }).id
    const existing = await app.prisma.financialYear.findFirst({ where: { id, tenantId: req.tenant.id }, select: { id: true, status: true } })
    if (!existing) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Financial year not found' })
    const guard = validateMasterSubmittable('financial year', existing.status)
    if (!guard.ok) return reply.code(422).send({ code: 'WORKFLOW_INVALID_STATE', message: guard.message })
    const wf = await startWorkflow(
      app.prisma, 'FINANCIAL_YEAR', 'financial_year', id, {},
      { tenantId: req.tenant.id, userId: req.user.sub, userName: (req.user as { name?: string }).name ?? req.user.sub },
    )
    if (!wf.ok && wf.error.message !== 'NO_WORKFLOW_DEFINED') {
      return reply.code(wf.error.httpStatus ?? 400).send(wf.error)
    }
    const newStatus = resolveMasterStatusAfterSubmit({
      ok: wf.ok, autoApproved: wf.ok ? wf.data.autoApproved : false, noWorkflowDefined: !wf.ok,
    })
    await app.prisma.financialYear.update({ where: { id }, data: { status: newStatus, isActive: newStatus === 'ACTIVE' } })
    return reply.send({ ok: true, status: newStatus, workflowInstanceId: wf.ok ? wf.data.instanceId : null })
  })

  app.post('/financial-years/:id/approve', auth, async (req, reply) => {
    const fy = await app.prisma.financialYear.update({
      where: { id: (req.params as any).id },
      data:  { status: 'ACTIVE', isActive: true, approvedByUserId: req.user.sub, approvedAt: new Date() },
    })
    return reply.send(fy)
  })

  // ── Vendor Categories ──
  app.get('/vendor-categories', auth, async (req, reply) => {
    const { status } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.status = status
    return reply.send(await app.prisma.vendorCategory.findMany({ where, orderBy: { name: 'asc' } }))
  })
  app.post('/vendor-categories', auth, async (req, reply) => {
    const row = await app.prisma.vendorCategory.create({
      data: { ...(req.body as any), tenantId: req.tenant.id, createdByUserId: req.user.sub },
    })
    return reply.code(201).send(row)
  })
  app.put('/vendor-categories/:id', auth, async (req, reply) => {
    const row = await app.prisma.vendorCategory.update({ where: { id: (req.params as any).id }, data: req.body as any })
    return reply.send(row)
  })

  // ── Vendor Groups ──
  app.get('/vendor-groups', auth, async (req, reply) => {
    const { status } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.status = status
    return reply.send(await app.prisma.vendorGroup.findMany({ where, orderBy: { name: 'asc' } }))
  })
  app.post('/vendor-groups', auth, async (req, reply) => {
    const row = await app.prisma.vendorGroup.create({
      data: { ...(req.body as any), tenantId: req.tenant.id, createdByUserId: req.user.sub },
    })
    return reply.code(201).send(row)
  })
  app.put('/vendor-groups/:id', auth, async (req, reply) => {
    const row = await app.prisma.vendorGroup.update({ where: { id: (req.params as any).id }, data: req.body as any })
    return reply.send(row)
  })

  // ── Profit Centres (entity-scoped) ──
  app.get('/profit-centres', auth, async (req, reply) => {
    const { entityId, status } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (entityId) where.entityId = entityId
    if (status && status !== 'ALL') where.status = status
    return reply.send(await app.prisma.profitCentre.findMany({ where, orderBy: { code: 'asc' } }))
  })
  app.post('/profit-centres', auth, async (req, reply) => {
    const body = req.body as Record<string, unknown>
    const row = await app.prisma.profitCentre.create({
      data: { ...body, tenantId: req.tenant.id, createdByUserId: req.user.sub, status: (body.status as string) ?? 'DRAFT' } as never,
    })
    return reply.code(201).send(row)
  })
  app.put('/profit-centres/:id', auth, async (req, reply) => {
    const row = await app.prisma.profitCentre.update({ where: { id: (req.params as any).id }, data: req.body as any })
    return reply.send(row)
  })
  app.post('/profit-centres/:id/submit', auth, async (req, reply) => {
    const id = (req.params as { id: string }).id
    const existing = await app.prisma.profitCentre.findFirst({ where: { id, tenantId: req.tenant.id }, select: { id: true, status: true } })
    if (!existing) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Profit centre not found' })
    const guard = validateMasterSubmittable('profit centre', existing.status)
    if (!guard.ok) return reply.code(422).send({ code: 'WORKFLOW_INVALID_STATE', message: guard.message })
    const wf = await startWorkflow(
      app.prisma, 'PROFIT_CENTRE', 'profit_centre', id, {},
      { tenantId: req.tenant.id, userId: req.user.sub, userName: (req.user as { name?: string }).name ?? req.user.sub },
    )
    if (!wf.ok && wf.error.message !== 'NO_WORKFLOW_DEFINED') {
      return reply.code(wf.error.httpStatus ?? 400).send(wf.error)
    }
    const newStatus = resolveMasterStatusAfterSubmit({
      ok: wf.ok, autoApproved: wf.ok ? wf.data.autoApproved : false, noWorkflowDefined: !wf.ok,
    })
    await app.prisma.profitCentre.update({ where: { id }, data: { status: newStatus } })
    return reply.send({ ok: true, status: newStatus, workflowInstanceId: wf.ok ? wf.data.instanceId : null })
  })

  // ── TDS Sections ──
  app.get('/tds-sections', auth, async (req, reply) => {
    const { status } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.status = status
    return reply.send(await app.prisma.tDSSection.findMany({ where, orderBy: { section: 'asc' } }))
  })
  app.post('/tds-sections', auth, async (req, reply) => {
    const row = await app.prisma.tDSSection.create({
      data: { ...(req.body as any), tenantId: req.tenant.id, createdByUserId: req.user.sub },
    })
    return reply.code(201).send(row)
  })
  app.put('/tds-sections/:id', auth, async (req, reply) => {
    return reply.send(await app.prisma.tDSSection.update({ where: { id: (req.params as any).id }, data: req.body as any }))
  })

  // ── Tenant KYC Settings ──
  app.get('/settings/kyc', auth, async (req, reply) => {
    const settings = await app.prisma.tenantSettings.findFirst({ where: { tenantId: req.tenant.id } })
    return reply.send(settings ?? {
      kycEnabled: true,
      kycProvider: 'ongrid',
      kycAutoRun: false,
      kycMandatoryFields: ['PAN', 'BANK'],
    })
  })
  app.put('/settings/kyc', auth, async (req, reply) => {
    const settings = await app.prisma.tenantSettings.upsert({
      where:  { tenantId: req.tenant.id },
      create: { tenantId: req.tenant.id, ...(req.body as any) },
      update: req.body as any,
    })
    return reply.send(settings)
  })

  // ── Item Categories ──
  app.get('/item-categories', auth, async (req, reply) => {
    const { status, search } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.status = status
    if (search) where.OR = [{ name: { contains: search } }, { code: { contains: search } }]
    return reply.send(await app.prisma.itemCategory.findMany({ where, orderBy: { name: 'asc' } }))
  })
  app.post('/item-categories', auth, async (req, reply) => {
    const body = req.body as Record<string, unknown>
    const row = await app.prisma.itemCategory.create({
      data: { ...body, tenantId: req.tenant.id, createdByUserId: req.user.sub, status: (body.status as string) ?? 'DRAFT' } as never,
    })
    return reply.code(201).send(row)
  })
  app.put('/item-categories/:id', auth, async (req, reply) => {
    const row = await app.prisma.itemCategory.update({ where: { id: (req.params as any).id }, data: req.body as any })
    return reply.send(row)
  })
  app.post('/item-categories/:id/submit', auth, async (req, reply) => {
    const id = (req.params as { id: string }).id
    const existing = await app.prisma.itemCategory.findFirst({ where: { id, tenantId: req.tenant.id }, select: { id: true, status: true } })
    if (!existing) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Item category not found' })
    const guard = validateMasterSubmittable('item category', existing.status)
    if (!guard.ok) return reply.code(422).send({ code: 'WORKFLOW_INVALID_STATE', message: guard.message })
    const wf = await startWorkflow(
      app.prisma, 'ITEM_CATEGORY', 'item_category', id, {},
      { tenantId: req.tenant.id, userId: req.user.sub, userName: (req.user as { name?: string }).name ?? req.user.sub },
    )
    if (!wf.ok && wf.error.message !== 'NO_WORKFLOW_DEFINED') {
      return reply.code(wf.error.httpStatus ?? 400).send(wf.error)
    }
    const newStatus = resolveMasterStatusAfterSubmit({
      ok: wf.ok, autoApproved: wf.ok ? wf.data.autoApproved : false, noWorkflowDefined: !wf.ok,
    })
    await app.prisma.itemCategory.update({ where: { id }, data: { status: newStatus } })
    return reply.send({ ok: true, status: newStatus, workflowInstanceId: wf.ok ? wf.data.instanceId : null })
  })

  // ── Item Master ──
  app.get('/items', auth, async (req, reply) => {
    const { status, search, itemType, expenseType } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.status = status
    if (itemType)    where.itemType    = itemType
    if (expenseType) where.expenseType = expenseType
    if (search) where.OR = [
      { name:     { contains: search } },
      { itemCode: { contains: search } },
      { hsnCode:  { contains: search } },
      { sacCode:  { contains: search } },
    ]
    const items = await app.prisma.itemMaster.findMany({
      where, orderBy: { itemCode: 'asc' },
      include: {
        entityMappings: true,
        changeRequests: {
          where:  { status: 'PENDING_APPROVAL' },
          select: { id: true },
          take:   1,
        },
      },
    })
    // Flatten the relation into a boolean so the listing can render a
    // "CHANGE PENDING" badge without exposing the join shape to the client.
    return reply.send(items.map(({ changeRequests, ...rest }) => ({
      ...rest,
      hasPendingChange: changeRequests.length > 0,
    })))
  })

  app.get('/items/:id', auth, async (req, reply) => {
    const item = await app.prisma.itemMaster.findFirst({
      where:   { id: (req.params as any).id, tenantId: req.tenant.id },
      include: { entityMappings: true, approvedVendors: true },
    })
    if (!item) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Item not found' })
    return reply.send(item)
  })

  app.post('/items', auth, async (req, reply) => {
    const { entityMappings = [], approvedVendors = [], ...rawData } = req.body as any
    // Same coercion as PUT: form may emit "" for depreciationStartDate + FK
    // string fields, which Prisma rejects on insert with a bare 500.
    const data = sanitisePayload(rawData, {
      nullableFields: [
        'depreciationStartDate',
        'tdsSectionId', 'taxCodeId', 'itemCategoryId', 'assetCategoryId',
      ],
    })
    const lastItem = await app.prisma.itemMaster.findFirst({
      where: { tenantId: req.tenant.id }, orderBy: { createdAt: 'desc' }, select: { itemCode: true },
    })
    const nextNum  = lastItem ? parseInt(lastItem.itemCode.replace('ITM-', '')) + 1 : 1
    const itemCode = `ITM-${String(nextNum).padStart(4, '0')}`
    const item = await app.prisma.$transaction(async tx => {
      const i = await tx.itemMaster.create({
        data: {
          ...data,
          itemCode,
          tenantId: req.tenant.id,
          createdByUserId: req.user.sub,
          // Items start as DRAFT so they go through the approval workflow.
          // Caller can flip to PENDING_APPROVAL via POST /items/:id/submit.
          // Honour an explicit status in the body when seeding/admin paths
          // need to create something already ACTIVE.
          status: (data.status as string | undefined) ?? 'DRAFT',
        } as never,
      })
      if (entityMappings.length) {
        await tx.itemEntityMapping.createMany({
          data: entityMappings.map((e: Record<string, unknown>) => {
            const { id: _id, itemId: _iid, ...rest } = e
            return { ...rest, itemId: i.id }
          }) as never,
        })
      }
      if (approvedVendors.length) {
        await tx.itemApprovedVendor.createMany({ data: approvedVendors.map((v: any) => ({ itemId: i.id, vendorId: v.vendorId })) })
      }
      return i
    })
    return reply.code(201).send(item)
  })

  // ── Submit item for approval ──
  // DRAFT or REJECTED → PENDING_APPROVAL, with a workflow instance kicked off
  // via the dynamic engine. NO_WORKFLOW_DEFINED still flips the status (so the
  // record visibly leaves DRAFT) but no instance is created — matches the
  // invoice/PR/PO submit pattern.
  app.post('/items/:id/submit', auth, async (req, reply) => {
    const id = (req.params as { id: string }).id
    const existing = await app.prisma.itemMaster.findFirst({
      where: { id, tenantId: req.tenant.id },
      select: { id: true, status: true, name: true },
    })
    if (!existing) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Item not found' })

    const guard = validateItemSubmittable(existing.status)
    if (!guard.ok) {
      return reply.code(422).send({ code: 'WORKFLOW_INVALID_STATE', message: guard.message })
    }

    const wf = await startWorkflow(
      app.prisma, 'ITEM', 'item', id, {},
      { tenantId: req.tenant.id, userId: req.user.sub, userName: (req.user as any).name ?? req.user.sub },
    )
    if (!wf.ok && wf.error.message !== 'NO_WORKFLOW_DEFINED') {
      return reply.code(wf.error.httpStatus ?? 400).send(wf.error)
    }
    const newStatus = resolveItemStatusAfterSubmit({
      ok:                wf.ok,
      autoApproved:      wf.ok ? wf.data.autoApproved : false,
      noWorkflowDefined: !wf.ok,
    })
    await app.prisma.itemMaster.update({ where: { id }, data: { status: newStatus } })

    return reply.send({
      ok: true,
      status: newStatus,
      workflowInstanceId: wf.ok ? wf.data.instanceId : null,
    })
  })

  app.put('/items/:id', auth, async (req, reply) => {
    const itemId = (req.params as { id: string }).id
    const { entityMappings, approvedVendors, ...raw } = req.body as Record<string, unknown>

    // Tenant-scoped read first — never trust an unverified PK from the URL.
    const existing = await app.prisma.itemMaster.findFirst({
      where: { id: itemId, tenantId: req.tenant.id }, select: { id: true },
    })
    if (!existing) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Item not found' })

    // Empty strings on these nullable fields trip Prisma:
    //   - depreciationStartDate (DateTime?) → "premature end of input"
    //   - tdsSectionId / taxCodeId / itemCategoryId / assetCategoryId (FK String?) → FK constraint
    // Coerce "" → null on all of them so the form can stay UX-friendly with
    // empty inputs without each consumer needing to remember to normalise.
    const data = sanitisePayload(raw, {
      nullableFields: [
        'depreciationStartDate',
        'tdsSectionId', 'taxCodeId', 'itemCategoryId', 'assetCategoryId',
      ],
    })

    try {
      const item = await app.prisma.$transaction(async tx => {
        const i = await tx.itemMaster.update({ where: { id: itemId }, data })
        if (Array.isArray(entityMappings)) {
          await tx.itemEntityMapping.deleteMany({ where: { itemId: i.id } })
          if (entityMappings.length) {
            // Strip auto-managed fields off each mapping row so the form can
            // echo the GET response (which includes them) without crashing.
            const cleaned = entityMappings.map((e) => {
              const { id: _id, itemId: _iid, ...rest } = e as Record<string, unknown>
              return { ...rest, itemId: i.id }
            })
            await tx.itemEntityMapping.createMany({ data: cleaned as never })
          }
        }
        if (Array.isArray(approvedVendors)) {
          await tx.itemApprovedVendor.deleteMany({ where: { itemId: i.id } })
          if (approvedVendors.length) {
            await tx.itemApprovedVendor.createMany({
              data: approvedVendors.map((v) => ({ itemId: i.id, vendorId: (v as { vendorId: string }).vendorId })),
            })
          }
        }
        return i
      })
      return reply.send(item)
    } catch (err) {
      // Surface Prisma validation/constraint errors as a 422 with a useful
      // body — the global handler would otherwise return a generic 500 and
      // bury the actionable detail.
      if (err instanceof Prisma.PrismaClientValidationError) {
        req.log.warn({ err, itemId }, 'item update — validation rejection')
        return reply.code(422).send({
          code: 'VALIDATION_ERROR',
          message: 'Item update failed — invalid field value',
          detail: err.message.split('\n').slice(-1)[0]?.trim(),
        })
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        req.log.warn({ err, itemId }, 'item update — Prisma error ' + err.code)
        return reply.code(422).send({
          code: err.code,
          message: 'Item update failed',
          detail: err.message.split('\n').slice(-1)[0]?.trim(),
        })
      }
      throw err
    }
  })

  // ── Item master change request (material edits on ACTIVE items) ──
  // Material fields (gstRate, tdsSectionId, hsn/sac, provision *) on an
  // ACTIVE item are gated behind a workflow. Posting the proposed values
  // creates a PENDING_APPROVAL change request — the live item is unchanged
  // until the workflow approves and the diff is applied.
  app.post('/items/:id/request-change', auth, async (req, reply) => {
    const itemId = (req.params as { id: string }).id
    const proposed = req.body as Record<string, unknown>

    const item = await app.prisma.itemMaster.findFirst({
      where: { id: itemId, tenantId: req.tenant.id },
    })
    if (!item) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Item not found' })

    // Build the diff using only material fields the caller sent. Non-material
    // edits are not this route's concern — caller should hit PUT instead.
    const diff = detectMaterialChange(item as unknown as Record<string, unknown>, proposed)

    // One pending request at a time per item. Approve/reject the existing
    // one before submitting a new diff.
    const pendingExisting = await app.prisma.itemMasterChangeRequest.findFirst({
      where: { itemId, tenantId: req.tenant.id, status: 'PENDING_APPROVAL' },
    })

    const guard = validateChangeRequest(item.status, diff, !!pendingExisting)
    if (!guard.ok) {
      return reply.code(422).send({ code: 'WORKFLOW_INVALID_STATE', message: guard.message, reason: guard.reason })
    }

    const payload = buildChangeRequestPayload(diff)
    const created = await app.prisma.itemMasterChangeRequest.create({
      data: {
        tenantId:      req.tenant.id,
        itemId,
        changedFields: payload as never,
        status:        'PENDING_APPROVAL',
        createdBy:     req.user.sub,
      },
    })

    // Start the workflow against the change-request id (not the item id) so
    // approve/reject in the engine can locate the diff to apply.
    const wf = await startWorkflow(
      app.prisma, 'ITEM_CHANGE', 'item_change', created.id, {},
      { tenantId: req.tenant.id, userId: req.user.sub, userName: (req.user as any).name ?? req.user.sub },
    )
    if (wf.ok) {
      await app.prisma.itemMasterChangeRequest.update({
        where: { id: created.id }, data: { workflowInstanceId: wf.data.instanceId },
      })
    }
    // NO_WORKFLOW_DEFINED leaves the request in PENDING_APPROVAL with no
    // instance — admin can manually approve via PATCH if needed (out of
    // scope for this commit).

    return reply.code(201).send({
      ok: true,
      changeRequestId:    created.id,
      workflowInstanceId: wf.ok ? wf.data.instanceId : null,
      changedFields:      payload.fields,
    })
  })

  // GET the active pending change request for an item, or null.
  app.get('/items/:id/pending-change', auth, async (req, reply) => {
    const itemId = (req.params as { id: string }).id
    const pending = await app.prisma.itemMasterChangeRequest.findFirst({
      where: { itemId, tenantId: req.tenant.id, status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(pending ?? null)
  })

  // Wire MATERIAL_FIELDS into the response so frontend can drive parity diff UI.
  app.get('/items/material-fields', auth, async (_req, reply) => {
    return reply.send({ fields: [...MATERIAL_FIELDS] })
  })

  // ── Role privileges (RBAC) ──
  app.get('/roles', auth, async (req, reply) => {
    const { status } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.status = status
    const rows = await app.prisma.rolePrivilege.findMany({
      where, orderBy: { roleCode: 'asc' },
    })
    return reply.send({ data: rows, total: rows.length })
  })

  app.get('/roles/:id', auth, async (req, reply) => {
    const row = await app.prisma.rolePrivilege.findFirst({
      where: { id: (req.params as any).id, tenantId: req.tenant.id },
    })
    if (!row) return reply.code(404).send({ message: 'Role not found' })
    return reply.send(row)
  })

  app.post('/roles', auth, async (req, reply) => {
    const data = req.body as any
    delete data.id; delete data.createdAt; delete data.updatedAt; delete data.tenantId
    try {
      const row = await app.prisma.rolePrivilege.create({
        data: { ...data, tenantId: req.tenant.id, isSystem: false },
      })
      return reply.code(201).send(row)
    } catch (err: any) {
      if (err?.code === 'P2002') return reply.code(409).send({ message: 'A role with that code already exists' })
      throw err
    }
  })

  app.put('/roles/:id', auth, async (req, reply) => {
    const data = req.body as any
    delete data.id; delete data.createdAt; delete data.updatedAt; delete data.tenantId
    // Don't allow flipping isSystem via PUT
    delete data.isSystem
    const existing = await app.prisma.rolePrivilege.findFirst({
      where: { id: (req.params as any).id, tenantId: req.tenant.id },
    })
    if (!existing) return reply.code(404).send({ message: 'Role not found' })
    const row = await app.prisma.rolePrivilege.update({
      where: { id: existing.id }, data,
    })
    return reply.send(row)
  })

  // ── IFSC lookup proxy (used by Employee + Vendor bank-detail forms) ──
  app.get('/lookup/ifsc/:code', auth, async (req, reply) => {
    const { code } = req.params as { code: string }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      return reply.code(400).send({ message: 'Invalid IFSC format' })
    }
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${code}`)
      if (!res.ok) return reply.code(404).send({ message: 'IFSC not found' })
      const data = await res.json() as { BANK?: string; BRANCH?: string; CITY?: string; STATE?: string }
      return reply.send({ bank: data.BANK, branch: data.BRANCH, city: data.CITY, state: data.STATE })
    } catch {
      return reply.code(503).send({ message: 'IFSC lookup unavailable' })
    }
  })

  // ── Generic CRUD for all masters ──
  for (const [route, table] of Object.entries(TABLE_ROUTE_MAP)) {

    // List
    app.get(`/${route}`, auth, async (req, reply) => {
      const filter = listSchema.parse(req.query)
      return reply.send(await listMaster(app.prisma, table, req.tenant.id, {
        ...filter,
        userId: req.user.sub,
      }))
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
      const result = await submitMasterRecord(app.prisma, table, (req.params as any).id, req.tenant.id, {
        tenantId: req.tenant.id, userId: req.user.sub,
        userName: (req.user as { name?: string }).name ?? req.user.sub,
        ip: req.ip,
      })
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
