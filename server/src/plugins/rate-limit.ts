import fp from 'fastify-plugin'
import rateLimitPlugin from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'

export const rateLimitConfig = fp(async (app: FastifyInstance) => {
  await app.register(rateLimitPlugin, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    redis: app.redis,
    keyGenerator: (request) => {
      // Rate limit per tenant + IP for authenticated, per IP for public
      const tenantId = request.user?.tenantId ?? 'anonymous'
      return `rl:${tenantId}:${request.ip}`
    },
    errorResponseBuilder: () => ({
      code: 'RATE_LIMITED',
      message: 'Too many requests — please slow down',
    }),
  })
})
