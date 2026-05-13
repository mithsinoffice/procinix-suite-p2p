import fp from 'fastify-plugin'
import jwtPlugin from '@fastify/jwt'
import cookiePlugin from '@fastify/cookie'
import type { FastifyInstance, FastifyRequest } from 'fastify'

export interface JwtPayload {
  sub:        string
  email:      string
  tenantId:   string
  tenantCode: string
  role:       string
  name:       string
  iat:        number
  exp:        number
}

declare module 'fastify' {
  interface FastifyRequest { user: JwtPayload }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(cookiePlugin, { secret: app.config.COOKIE_SECRET })

  await app.register(jwtPlugin, {
    secret: app.config.JWT_SECRET,
    cookie: { cookieName: 'access_token', signed: false },
  })

  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify()
    } catch {
      throw { statusCode: 401, message: 'Unauthorised' }
    }
  })

  app.addHook('preHandler', async (request) => {
    try { await request.jwtVerify() } catch { /* public route */ }
  })
})
