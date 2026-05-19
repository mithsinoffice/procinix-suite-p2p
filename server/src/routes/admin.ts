import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { requireSuperAdmin } from '../middleware/feature-gate.js'
import { startWorkflow } from '../services/workflow-engine.service.js'
import {
  validateMasterSubmittable, resolveMasterStatusAfterSubmit,
} from '../services/master-submit.service.js'

// Fields safe to return for User rows — passwordHash never leaves the server
const USER_SELECT = {
  id: true, name: true, email: true, mobile: true, role: true,
  additionalRoles: true, departmentId: true, employeeId: true,
  profilePhoto: true, mustResetPassword: true,
  emailNotifications: true, inAppNotifications: true, dailyDigest: true,
  isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true,
  entityAccess: true,
} as const

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

  // ════════════════════════════════════════════════════════════
  // USER MASTER — tenant-scoped (any authenticated user)
  // ════════════════════════════════════════════════════════════

  const tenantAuth = { preHandler: [app.authenticate] }

  // List users in current tenant
  app.get('/admin/users', tenantAuth, async (req, reply) => {
    const { status, search, role } = req.query as { status?: string; search?: string; role?: string }
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.isActive = status === 'ACTIVE'
    if (role && role !== 'ALL')     where.role     = role
    if (search) where.OR = [
      { name:  { contains: search } },
      { email: { contains: search } },
    ]
    const users = await app.prisma.user.findMany({
      where, orderBy: { createdAt: 'desc' }, select: USER_SELECT,
    })
    return reply.send({ data: users, total: users.length })
  })

  // Get user by id
  app.get('/admin/users/:id', tenantAuth, async (req, reply) => {
    const user = await app.prisma.user.findFirst({
      where:  { id: (req.params as any).id, tenantId: req.tenant.id },
      select: USER_SELECT,
    })
    if (!user) return reply.code(404).send({ message: 'User not found' })
    return reply.send(user)
  })

  // Create user
  app.post('/admin/users', tenantAuth, async (req, reply) => {
    const { entityAccess = [], password, ...data } = req.body as any
    // Drop fields the frontend may send that aren't part of the User model
    delete data.confirmPassword
    delete data.id
    delete data.createdAt
    delete data.updatedAt
    delete data.lastLoginAt

    const supplied = !!password
    const rawPwd   = supplied ? password : Math.random().toString(36).slice(-12)
    const passwordHash = await bcrypt.hash(rawPwd, 12)

    try {
      const user = await app.prisma.$transaction(async tx => {
        const u = await tx.user.create({
          data: {
            ...data,
            tenantId:          req.tenant.id,
            passwordHash,
            mustResetPassword: data.mustResetPassword ?? !supplied,
            // New users start as DRAFT — TENANT_ADMIN approval activates them.
            // The User.isActive boolean is the live auth gate; status drives
            // workflow visibility on the Approval Desk.
            status:            (data.status as string | undefined) ?? 'DRAFT',
            isActive:          false,
          },
        })
        if (Array.isArray(entityAccess) && entityAccess.length) {
          await tx.userEntityAccess.createMany({
            data: entityAccess.map((e: any) => ({
              userId:           u.id,
              entityId:         e.entityId,
              roleOverride:     e.roleOverride ?? null,
              canApprove:       !!e.canApprove,
              approvalLimit:    e.approvalLimit ?? null,
              canCreatePO:      !!e.canCreatePO,
              canCreateInvoice: e.canCreateInvoice !== false,
              canViewOnly:      !!e.canViewOnly,
              isActive:         e.isActive !== false,
            })),
          })
        }
        return tx.user.findUnique({ where: { id: u.id }, select: USER_SELECT })
      })
      // Include the auto-generated password in the response only when we generated it
      return reply.code(201).send({ ...user, ...(supplied ? {} : { generatedPassword: rawPwd }) })
    } catch (err: any) {
      if (err?.code === 'P2002') return reply.code(409).send({ message: 'A user with that email already exists in this tenant' })
      throw err
    }
  })

  // Update user
  app.put('/admin/users/:id', tenantAuth, async (req, reply) => {
    const { entityAccess, password, ...data } = req.body as any
    delete data.confirmPassword
    delete data.id
    delete data.createdAt
    delete data.updatedAt
    delete data.lastLoginAt
    delete data.tenantId
    delete data.passwordHash

    const updateData: any = { ...data }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12)
      updateData.mustResetPassword = false
    }

    const id = (req.params as any).id
    const existing = await app.prisma.user.findFirst({ where: { id, tenantId: req.tenant.id } })
    if (!existing) return reply.code(404).send({ message: 'User not found' })

    const user = await app.prisma.$transaction(async tx => {
      await tx.user.update({ where: { id }, data: updateData })
      if (Array.isArray(entityAccess)) {
        await tx.userEntityAccess.deleteMany({ where: { userId: id } })
        if (entityAccess.length) {
          await tx.userEntityAccess.createMany({
            data: entityAccess.map((e: any) => ({
              userId:           id,
              entityId:         e.entityId,
              roleOverride:     e.roleOverride ?? null,
              canApprove:       !!e.canApprove,
              approvalLimit:    e.approvalLimit ?? null,
              canCreatePO:      !!e.canCreatePO,
              canCreateInvoice: e.canCreateInvoice !== false,
              canViewOnly:      !!e.canViewOnly,
              isActive:         e.isActive !== false,
            })),
          })
        }
      }
      return tx.user.findUnique({ where: { id }, select: USER_SELECT })
    })
    return reply.send(user)
  })

  // Reset password — caller supplies the new password
  app.post('/admin/users/:id/reset-password', tenantAuth, async (req, reply) => {
    const { newPassword } = req.body as { newPassword?: string }
    if (!newPassword || newPassword.length < 8) {
      return reply.code(400).send({ message: 'Password must be at least 8 characters' })
    }
    const id = (req.params as any).id
    const existing = await app.prisma.user.findFirst({ where: { id, tenantId: req.tenant.id } })
    if (!existing) return reply.code(404).send({ message: 'User not found' })
    await app.prisma.user.update({
      where: { id },
      data:  { passwordHash: await bcrypt.hash(newPassword, 12), mustResetPassword: false },
    })
    return reply.send({ ok: true })
  })

  // Submit user for approval — DRAFT/REJECTED → workflow start → PENDING_APPROVAL
  // (or ACTIVE if auto-approved). isActive flips with status: a user only
  // becomes a live login once an approver flips them to ACTIVE.
  app.post('/admin/users/:id/submit', tenantAuth, async (req, reply) => {
    const id = (req.params as { id: string }).id
    const existing = await app.prisma.user.findFirst({
      where: { id, tenantId: req.tenant.id }, select: { id: true, status: true },
    })
    if (!existing) return reply.code(404).send({ code: 'NOT_FOUND', message: 'User not found' })
    const guard = validateMasterSubmittable('user', existing.status)
    if (!guard.ok) return reply.code(422).send({ code: 'WORKFLOW_INVALID_STATE', message: guard.message })
    const wf = await startWorkflow(
      app.prisma, 'USER', 'user', id, {},
      { tenantId: req.tenant.id, userId: req.user.sub, userName: (req.user as { name?: string }).name ?? req.user.sub },
    )
    if (!wf.ok && wf.error.message !== 'NO_WORKFLOW_DEFINED') {
      return reply.code(wf.error.httpStatus ?? 400).send(wf.error)
    }
    const newStatus = resolveMasterStatusAfterSubmit({
      ok: wf.ok, autoApproved: wf.ok ? wf.data.autoApproved : false, noWorkflowDefined: !wf.ok,
    })
    await app.prisma.user.update({ where: { id }, data: { status: newStatus, isActive: newStatus === 'ACTIVE' } })
    return reply.send({ ok: true, status: newStatus, workflowInstanceId: wf.ok ? wf.data.instanceId : null })
  })

  // Toggle active
  app.post('/admin/users/:id/toggle-active', tenantAuth, async (req, reply) => {
    const id = (req.params as any).id
    const user = await app.prisma.user.findFirst({ where: { id, tenantId: req.tenant.id } })
    if (!user) return reply.code(404).send({ message: 'User not found' })
    const updated = await app.prisma.user.update({ where: { id }, data: { isActive: !user.isActive } })
    return reply.send({ isActive: updated.isActive })
  })
}
