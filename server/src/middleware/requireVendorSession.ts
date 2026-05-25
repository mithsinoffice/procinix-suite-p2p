// Vendor portal session middleware (Sprint 4).
//
// All /api/portal/vendor/* routes run UNAUTHENTICATED at the buyer JWT
// layer — vendors don't have buyer accounts. Instead, the vendor portal
// mints a `VendorPortalSession` row at login time; this preHandler
// validates that session by reading either the `X-Vendor-Token` header or
// the `vendorSessionToken` httpOnly cookie.
//
// On success it attaches `req.vendor` so route handlers can read
// `req.vendor.vendorId` (= VendorProfile.id) + email without re-fetching.
// On failure it short-circuits with `401 { error: 'VENDOR_SESSION_INVALID' }`
// — a single discriminator the client uses to bounce back to /portal/login.

import type { FastifyReply, FastifyRequest } from 'fastify'

export interface VendorSessionContext {
  vendorSessionId: string
  vendorId:        string
  email:           string
}

declare module 'fastify' {
  interface FastifyRequest {
    vendor?: VendorSessionContext
  }
}

const HEADER_NAME = 'x-vendor-token'
const COOKIE_NAME = 'vendorSessionToken'

export async function requireVendorSession(req: FastifyRequest, reply: FastifyReply) {
  // Header wins over cookie when both present — same precedence as the
  // existing @fastify/jwt convention so the client can override the cookie
  // for testing.
  const headerToken = req.headers[HEADER_NAME]
  const token = typeof headerToken === 'string'
    ? headerToken
    : (req.cookies?.[COOKIE_NAME] ?? null)

  if (!token) {
    return reply.code(401).send({ error: 'VENDOR_SESSION_INVALID' })
  }

  const session = await req.server.prisma.vendorPortalSession.findUnique({
    where:  { sessionToken: token },
    select: { id: true, vendorId: true, email: true, expiresAt: true },
  })

  if (!session || session.expiresAt.getTime() < Date.now()) {
    return reply.code(401).send({ error: 'VENDOR_SESSION_INVALID' })
  }

  // Bump lastActiveAt — cheap audit signal, fire-and-forget so a slow write
  // doesn't add latency to every authorised request.
  void req.server.prisma.vendorPortalSession.update({
    where: { id: session.id },
    data:  { lastActiveAt: new Date() },
  }).catch(() => {/* non-critical */})

  req.vendor = {
    vendorSessionId: session.id,
    vendorId:        session.vendorId,
    email:           session.email,
  }
}
