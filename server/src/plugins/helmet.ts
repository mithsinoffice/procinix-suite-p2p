import fp from 'fastify-plugin'
import helmetPlugin from '@fastify/helmet'
import type { FastifyInstance } from 'fastify'
export const helmetConfig = fp(async (app: FastifyInstance) => {
  await app.register(helmetPlugin, {
    contentSecurityPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
})
