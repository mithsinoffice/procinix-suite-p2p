import type { FastifyInstance } from 'fastify'
import { requireSuperAdmin } from '../middleware/feature-gate.js'

const MODULE_FEATURES: Record<string, string[]> = {
  INVOICE:  ['UPLOAD', 'OCR', 'EMAIL_INGEST', 'STP', 'MATCH_SCORING', 'EINVOICE'],
  VENDOR:   ['KYC', 'PORTAL', '206AB', 'MSME', 'ERP_SYNC'],
  PAYMENT:  ['TRANSBNK', 'TDS', 'BATCH', 'CHALLAN'],
  WORKFLOW: ['DYNAMIC', 'CHAT', 'SLA'],
  PR:       ['CREATE', 'APPROVE', 'CONVERT_PO'],
  PO:       ['CREATE', 'APPROVE', 'GRN'],
  GRN:      ['CREATE', 'APPROVE'],
  REPORTS:  ['AP_AGING', 'SPEND', 'TDS_SUMMARY'],
}

function buildModuleMatrix(modules: any[]) {
  return Object.entries(MODULE_FEATURES).map(([moduleCode, features]) => {
    const mod = modules.find((m: any) => m.moduleCode === moduleCode)
    return {
      moduleCode,
      isEnabled: mod?.isEnabled ?? false,
      features:  features.map(featureCode => ({
        featureCode,
        isEnabled: mod?.features?.find((f: any) => f.featureCode === featureCode)?.isEnabled ?? false,
      })),
    }
  })
}

export async function adminRoutes(app: FastifyInstance) {
  const guard = { preHandler: [app.authenticate, requireSuperAdmin()] }

  // Current tenant's modules — no super admin required
  app.get('/admin/tenants/me/modules', { preHandler: [app.authenticate] }, async (req, reply) => {
    const tenantId = (req as any).tenant.id
    const modules  = await app.prisma.tenantModule.findMany({
      where:   { tenantId },
      include: { features: true },
    })
    return reply.send(buildModuleMatrix(modules))
  })

  // List all tenants
  app.get('/admin/tenants', guard, async (_req, reply) => {
    const tenants = await app.prisma.tenant.findMany({
      include: {
        modules: { select: { moduleCode: true, isEnabled: true } },
        _count:  { select: { modules: true, features: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(tenants)
  })

  // Create tenant
  app.post('/admin/tenants', guard, async (req, reply) => {
    const { code, name, plan = 'TRIAL', maxEntities = 1, maxUsers = 5, trialDays = 30 } = req.body as any
    const tenant = await app.prisma.tenant.create({
      data: {
        code, name, plan, maxEntities, maxUsers,
        trialExpiresAt: plan === 'TRIAL' ? new Date(Date.now() + trialDays * 86_400_000) : null,
        status: 'ACTIVE',
      },
    })
    return reply.code(201).send(tenant)
  })

  // Update tenant
  app.put('/admin/tenants/:id', guard, async (req, reply) => {
    const tenant = await app.prisma.tenant.update({
      where: { id: (req.params as any).id },
      data:  req.body as any,
    })
    return reply.send(tenant)
  })

  // Get tenant modules + features matrix
  app.get('/admin/tenants/:id/modules', guard, async (req, reply) => {
    const tenantId = (req.params as any).id
    const modules  = await app.prisma.tenantModule.findMany({
      where:   { tenantId },
      include: { features: true },
    })
    return reply.send(buildModuleMatrix(modules))
  })

  // Toggle module
  app.put('/admin/tenants/:id/modules/:moduleCode', guard, async (req, reply) => {
    const { id: tenantId, moduleCode } = req.params as any
    const { isEnabled } = req.body as any
    const mod = await app.prisma.tenantModule.upsert({
      where:  { tenantId_moduleCode: { tenantId, moduleCode } },
      update: { isEnabled, enabledAt: isEnabled ? new Date() : null, enabledBy: (req as any).user.sub },
      create: { tenantId, moduleCode, isEnabled, enabledAt: isEnabled ? new Date() : null },
    })
    return reply.send(mod)
  })

  // Toggle feature
  app.put('/admin/tenants/:id/modules/:moduleCode/features/:featureCode', guard, async (req, reply) => {
    const { id: tenantId, moduleCode, featureCode } = req.params as any
    const { isEnabled } = req.body as any
    const feat = await app.prisma.tenantFeature.upsert({
      where:  { tenantId_moduleCode_featureCode: { tenantId, moduleCode, featureCode } },
      update: { isEnabled, enabledAt: isEnabled ? new Date() : null, enabledBy: (req as any).user.sub },
      create: { tenantId, moduleCode, featureCode, isEnabled },
    })
    return reply.send(feat)
  })

  // Provision admin user for tenant
  app.post('/admin/tenants/:id/users', guard, async (req, reply) => {
    const { name, email, role = 'ADMIN' } = req.body as any
    const tenantId = (req.params as any).id
    const bcrypt   = await import('bcryptjs')
    const tempPass = Math.random().toString(36).slice(-10)
    const user     = await app.prisma.user.create({
      data: {
        tenantId, name, email, role,
        passwordHash: await bcrypt.hash(tempPass, 10),
        isActive:     true,
      },
    })
    return reply.code(201).send({ ...user, tempPassword: tempPass })
  })

  // Tenant stats
  app.get('/admin/tenants/:id/stats', guard, async (req, reply) => {
    const tenantId = (req.params as any).id
    const [users, vendors, invoices, payments] = await Promise.all([
      app.prisma.user.count({ where: { tenantId } }),
      app.prisma.vendor.count({ where: { tenantId } }),
      app.prisma.invoice.count({ where: { tenantId } }),
      app.prisma.payment.count({ where: { tenantId } }),
    ])
    return reply.send({ users, vendors, invoices, payments })
  })

  // Global module definitions
  app.get('/admin/module-definitions', guard, async (_req, reply) => {
    return reply.send(
      Object.entries(MODULE_FEATURES).map(([moduleCode, features]) => ({ moduleCode, features }))
    )
  })
}
