import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

export interface TenantContext { id: string; code: string }

declare module 'fastify' {
  interface FastifyRequest { tenant: TenantContext }
}

export const tenantPlugin = fp(async (app: FastifyInstance) => {
  app.addHook('preHandler', async (request, reply) => {
    if (!request.user) return
    const { tenantId, tenantCode } = request.user
    if (!tenantId) {
      return reply.code(401).send({ error: 'Tenant context missing from token' })
    }
    request.tenant = { id: tenantId, code: tenantCode }
  })
})
