import type { FastifyInstance } from 'fastify'
import { cacheGet, cacheSet, TTL, CacheKeys } from '../lib/redis.js'

export async function masterRoutes(app: FastifyInstance) {
  const opts = { preHandler: [app.authenticate] }

  // Single dropdown endpoint — all master data for forms
  app.get('/dropdown', opts, async (request, reply) => {
    const tenantId = request.tenant.id
    const cacheKey = CacheKeys.masterData(tenantId)

    // Try cache first
    const cached = await cacheGet<unknown>(app.redis, cacheKey)
    if (cached) return reply.send(cached)

    // Fetch all in parallel
    const [vendors, glCodes, departments, costCentres, taxCodes] = await Promise.all([
      app.prisma.vendor.findMany({
        where:   { tenantId, status: 'ACTIVE' },
        select:  { id: true, vendorCode: true, legalName: true, gstin: true, pan: true, panCompliance: true, tdsApplicable: true, tdsSectionCode: true, paymentTerms: true, transbnkBeneficiaryId: true },
        orderBy: { legalName: 'asc' },
      }),
      app.prisma.glCode.findMany({
        where:   { tenantId, isActive: true },
        select:  { id: true, code: true, name: true, accountType: true },
        orderBy: { code: 'asc' },
      }),
      app.prisma.department.findMany({
        where:   { tenantId, isActive: true },
        select:  { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      }),
      app.prisma.costCentre.findMany({
        where:   { tenantId, isActive: true },
        select:  { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
      app.prisma.taxCode.findMany({
        where:   { tenantId, isActive: true },
        select:  { id: true, code: true, description: true, cgstRate: true, sgstRate: true, igstRate: true },
        orderBy: { code: 'asc' },
      }),
    ])

    const result = { vendors, glCodes, departments, costCentres, taxCodes }

    // Cache for 1 hour
    await cacheSet(app.redis, cacheKey, result, TTL.MASTER_DATA)

    return reply.send(result)
  })
}
