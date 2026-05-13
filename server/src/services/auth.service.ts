import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { ok, err, Errors, type Result } from '../lib/result.js'
import { getPrismaClient } from '../lib/prisma.js'
import { writeAuditLog, AuditAction } from '../lib/audit.js'
import type { JwtPayload } from '../plugins/auth.js'

export interface LoginInput {
  email:    string
  password: string
}

export interface AuthTokens {
  user: {
    id:         string
    name:       string
    email:      string
    role:       string
    tenantId:   string
    tenantCode: string
  }
  accessToken:  string
  refreshToken: string
}

const ACCESS_EXPIRES_IN  = process.env.JWT_EXPIRES_IN         ?? '15m'
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'

// Cookie options — httpOnly, Secure, SameSite=Strict
export const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path:     '/',
  maxAge:   15 * 60,        // 15 min in seconds
}
export const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path:     '/auth/refresh',
  maxAge:   7 * 24 * 60 * 60, // 7 days in seconds
}

export async function loginUser(
  app: FastifyInstance,
  input: LoginInput,
  ip?: string
): Promise<Result<AuthTokens>> {
  const prisma = getPrismaClient()

  // 1. Find user by email (search across all active tenants)
  const user = await prisma.user.findFirst({
    where:   { email: input.email.toLowerCase().trim(), isActive: true },
    include: { tenant: { select: { id: true, code: true, name: true, isActive: true } } },
  })

  if (!user || !user.tenant.isActive) {
    await writeAuditLog(prisma, {
      tenantId: user?.tenantId ?? 'unknown', userId: 'anonymous',
      action: AuditAction.USER_LOGIN_FAILED, entityType: 'user',
      entityId: input.email, ipAddress: ip,
      after: { reason: 'user_not_found' },
    })
    return err(Errors.unauthorised('Invalid email or password'))
  }

  // 2. Verify password
  const valid = await bcrypt.compare(input.password, user.passwordHash)
  if (!valid) {
    await writeAuditLog(prisma, {
      tenantId: user.tenantId, userId: user.id,
      action: AuditAction.USER_LOGIN_FAILED, entityType: 'user',
      entityId: user.id, ipAddress: ip,
      after: { reason: 'invalid_password' },
    })
    return err(Errors.unauthorised('Invalid email or password'))
  }

  // 3. Build JWT payload
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub:        user.id,
    email:      user.email,
    tenantId:   user.tenantId,
    tenantCode: user.tenant.code,
    role:       user.role,
    name:       user.name,
  }

  // 4. Sign tokens
  const accessToken  = app.jwt.sign(payload, { expiresIn: ACCESS_EXPIRES_IN })
  const refreshToken = app.jwt.sign({ sub: user.id, tenantId: user.tenantId }, { expiresIn: REFRESH_EXPIRES_IN })

  // 5. Update last login
  await prisma.user.update({
    where: { id: user.id },
    data:  { lastLoginAt: new Date() },
  })

  // 6. Audit log
  await writeAuditLog(prisma, {
    tenantId: user.tenantId, userId: user.id,
    action: AuditAction.USER_LOGIN, entityType: 'user',
    entityId: user.id, ipAddress: ip,
  })

  return ok({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId, tenantCode: user.tenant.code },
    accessToken,
    refreshToken,
  })
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}
