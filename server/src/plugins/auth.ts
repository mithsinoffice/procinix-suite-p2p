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

// `@fastify/jwt` ships its own module augmentation for FastifyRequest.user
// (typed `string | object | Buffer`). Augmenting fastify directly collides
// with that. The supported override path is FastifyJWT — `user`
// (request.user) gets the concrete shape; `payload` (input to sign()) is
// more permissive so both the full access-token payload and the slimmer
// refresh-token payload `{ sub, tenantId }` typecheck without casts.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: Partial<Omit<JwtPayload, 'iat' | 'exp'>> & { sub: string }
    user:    JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>
  }
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
