import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { loginUser, ACCESS_COOKIE_OPTS, REFRESH_COOKIE_OPTS } from '../services/auth.service.js'
import { writeAuditLog, AuditAction } from '../lib/audit.js'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid email or password format' })
    }

    const result = await loginUser(app, body.data, request.ip)
    if (!result.ok) {
      return reply.code(result.error.httpStatus ?? 401).send(result.error)
    }

    const { user, accessToken, refreshToken } = result.data

    // Set httpOnly cookies — tokens never exposed to JavaScript
    reply
      .setCookie('access_token',  accessToken,  ACCESS_COOKIE_OPTS)
      .setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTS)

    return reply.code(200).send({ user })
  })

  // POST /auth/logout
  app.post('/logout', async (request, reply) => {
    const userId   = request.user?.sub
    const tenantId = request.user?.tenantId

    if (userId && tenantId) {
      await writeAuditLog(app.prisma, {
        tenantId, userId,
        action: AuditAction.USER_LOGOUT,
        entityType: 'user', entityId: userId,
        ipAddress: request.ip,
      })
    }

    reply
      .clearCookie('access_token',  { path: '/' })
      .clearCookie('refresh_token', { path: '/auth/refresh' })

    return reply.code(200).send({ ok: true })
  })

  // GET /auth/me — returns current user from JWT + profile-level defaults (departmentId)
  app.get('/me', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const profile = await app.prisma.user.findFirst({
      where:  { id: request.user.sub },
      select: { departmentId: true },
    })
    return reply.send({
      id:           request.user.sub,
      name:         request.user.name,
      email:        request.user.email,
      role:         request.user.role,
      tenantId:     request.user.tenantId,
      tenantCode:   request.user.tenantCode,
      departmentId: profile?.departmentId ?? null,
    })
  })

  // POST /auth/refresh — rotate access token using refresh cookie
  app.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies?.refresh_token
    if (!refreshToken) {
      return reply.code(401).send({ code: 'UNAUTHORISED', message: 'No refresh token' })
    }
    try {
      const payload = app.jwt.verify(refreshToken) as any
      const user    = await app.prisma.user.findFirst({
        where:   { id: payload.sub, isActive: true },
        include: { tenant: { select: { id: true, code: true } } },
      })
      if (!user) return reply.code(401).send({ code: 'UNAUTHORISED', message: 'User not found' })

      const newAccess = app.jwt.sign({
        sub: user.id, email: user.email, tenantId: user.tenantId,
        tenantCode: user.tenant.code, role: user.role, name: user.name,
      }, { expiresIn: '15m' })

      reply.setCookie('access_token', newAccess, ACCESS_COOKIE_OPTS)
      return reply.code(200).send({ ok: true })
    } catch {
      return reply.code(401).send({ code: 'TOKEN_EXPIRED', message: 'Refresh token invalid or expired' })
    }
  })
}
