import type { FastifyRequest, FastifyReply } from 'fastify'
import type { PrismaClient } from '@prisma/client'

export function requireFeature(moduleCode: string, featureCode: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenant?.id
    if (!tenantId) return reply.code(401).send({ code: 'UNAUTHORIZED' })
    const prisma: PrismaClient = (req.server as any).prisma
    const feature = await prisma.tenantFeature.findFirst({
      where: { tenantId, moduleCode, featureCode, isEnabled: true },
    })
    if (!feature) {
      return reply.code(403).send({
        code:    'FEATURE_DISABLED',
        module:  moduleCode,
        feature: featureCode,
        message: `${moduleCode}.${featureCode} is not enabled for your account. Contact your administrator.`,
      })
    }
  }
}

export function requireModule(moduleCode: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (req as any).tenant?.id
    if (!tenantId) return reply.code(401).send({ code: 'UNAUTHORIZED' })
    const prisma: PrismaClient = (req.server as any).prisma
    const module = await prisma.tenantModule.findFirst({
      where: { tenantId, moduleCode, isEnabled: true },
    })
    if (!module) {
      return reply.code(403).send({
        code:    'MODULE_DISABLED',
        module:  moduleCode,
        message: `${moduleCode} module is not enabled for your account.`,
      })
    }
  }
}

export function requireSuperAdmin() {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user
    if (!user || user.role !== 'SUPER_ADMIN') {
      return reply.code(403).send({ code: 'FORBIDDEN', message: 'Super admin access required' })
    }
  }
}
