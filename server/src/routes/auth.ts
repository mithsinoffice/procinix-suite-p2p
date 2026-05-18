import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { google } from 'googleapis'
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

  // GET /auth/me — returns the current user with profile-level defaults
  // pre-resolved (entityId, departmentId, designationId, locationId) so forms
  // can pre-populate without N round-trips. Resolution chain:
  //   entityId       ← UserEntityAccess (first active) → fallback: first Entity
  //   departmentId   ← Employee linked by email        → fallback: first ACTIVE Department
  //   designation/loc ← Employee linked by email (null otherwise)
  // Fallbacks are UI defaults, not authorisation grants.
  app.get('/me', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const tenantId = request.tenant?.id

    // 1. Entity — UserEntityAccess first, then first entity in tenant
    const entityAccess = await app.prisma.userEntityAccess.findMany({
      where:   { userId: request.user.sub, isActive: true },
      select:  { entityId: true },
      orderBy: { id: 'asc' },
    })
    const accessibleEntityIds = entityAccess.map(e => e.entityId)
    let entityId: string | null = accessibleEntityIds[0] ?? null
    if (!entityId && tenantId) {
      const firstEntity = await app.prisma.entity.findFirst({
        where:   { tenantId },
        orderBy: { createdAt: 'asc' },
        select:  { id: true },
      })
      entityId = firstEntity?.id ?? null
    }

    // 2. Department / designation / location — Employee linked by email
    const employee = tenantId
      ? await app.prisma.employee.findFirst({
          where:  { tenantId, email: request.user.email },
          select: { departmentId: true, designationId: true, locationId: true },
        })
      : null
    let departmentId: string | null = employee?.departmentId ?? null
    if (!departmentId && tenantId) {
      const firstDept = await app.prisma.department.findFirst({
        where:   { tenantId, status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        select:  { id: true },
      })
      departmentId = firstDept?.id ?? null
    }

    return reply.send({
      id:            request.user.sub,
      name:          request.user.name,
      email:         request.user.email,
      role:          request.user.role,
      tenantId:      request.user.tenantId,
      tenantCode:    request.user.tenantCode,
      entityId,
      accessibleEntityIds,
      departmentId,
      designationId: employee?.designationId ?? null,
      locationId:    employee?.locationId    ?? null,
    })
  })

  // GET /auth/my-permissions — RBAC permission matrix for the logged-in user
  // Merges every role assigned via UserEntityRole (and falls back to User.role
  // when no entity roles exist). OR semantics across roles.
  app.get('/my-permissions', { preHandler: [app.authenticate] }, async (request, reply) => {
    const tenantId = request.tenant?.id
    if (!tenantId) return reply.send({})

    if (request.user.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN gets implicit all-access; client matches the server-side bypass
      const MODULES = ['INTAKE', 'PO', 'GRN', 'INVOICE', 'PAYMENT', 'VENDOR', 'BUDGET', 'MASTERS', 'ADMIN']
      const ACTIONS = ['create', 'view', 'edit', 'delete', 'submit', 'approve']
      const full: Record<string, Record<string, boolean>> = {}
      for (const m of MODULES) {
        full[m] = {}
        for (const a of ACTIONS) full[m][a] = true
      }
      return reply.send(full)
    }

    const entityRoles = await app.prisma.userEntityRole.findMany({
      where:  { userId: request.user.sub, isActive: true },
      select: { roleCode: true },
    })
    const roleCodes = entityRoles.length
      ? [...new Set(entityRoles.map(r => r.roleCode))]
      : [request.user.role]

    const privileges = await app.prisma.rolePrivilege.findMany({
      where:  { tenantId, roleCode: { in: roleCodes }, status: 'ACTIVE' },
      select: { permissions: true },
    })

    const merged: Record<string, Record<string, boolean>> = {}
    for (const priv of privileges) {
      const perms = priv.permissions as Record<string, Record<string, boolean>> | null
      if (!perms) continue
      for (const [mod, actions] of Object.entries(perms)) {
        if (!merged[mod]) merged[mod] = {}
        for (const [action, val] of Object.entries(actions)) {
          merged[mod][action] = merged[mod][action] || !!val
        }
      }
    }
    return reply.send(merged)
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

  // ── Gmail OAuth one-time setup (dev only — do not deploy to prod) ────────────
  // Mounted under the `/auth` prefix, so the actual URLs are:
  //   GET /auth/oauth/gmail/init      → kicks off the OAuth flow in the browser
  //   GET /auth/oauth/gmail/callback  → Google redirects here with ?code=…

  function gmailOAuthClient() {
    return new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI,
    )
  }

  app.get('/oauth/gmail/init', async (_req, reply) => {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REDIRECT_URI) {
      return reply.code(500).send({
        code:    'OAUTH_NOT_CONFIGURED',
        message: 'Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REDIRECT_URI in server/.env before starting the flow.',
      })
    }
    const url = gmailOAuthClient().generateAuthUrl({
      access_type: 'offline',
      scope:       ['https://www.googleapis.com/auth/gmail.modify'],
      prompt:      'consent',
    })
    return reply.redirect(url)
  })

  app.get('/oauth/gmail/callback', async (req, reply) => {
    const { code, error } = req.query as { code?: string; error?: string }
    if (error) return reply.code(400).send({ code: 'OAUTH_ERROR', message: error })
    if (!code) return reply.code(400).send({ code: 'OAUTH_NO_CODE', message: 'Missing ?code in callback' })
    try {
      const { tokens } = await gmailOAuthClient().getToken(code)
      return reply.send({
        message:       'Copy GMAIL_REFRESH_TOKEN into server/.env then restart the dev server.',
        refresh_token: tokens.refresh_token,
        access_token:  tokens.access_token,
        scope:         tokens.scope,
        expiry_date:   tokens.expiry_date,
      })
    } catch (err: any) {
      return reply.code(400).send({
        code:    'OAUTH_EXCHANGE_FAILED',
        message: err?.message ?? 'Failed to exchange code for tokens',
      })
    }
  })
}
