import fp from 'fastify-plugin'
import corsPlugin from '@fastify/cors'
import type { FastifyInstance } from 'fastify'

export const corsConfig = fp(async (app: FastifyInstance) => {
  await app.register(corsPlugin, {
    origin: app.config.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  })
})
