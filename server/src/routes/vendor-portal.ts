// Vendor portal HTTP layer — Sprint 1.
//
// Two separate route functions exposed from this file:
//
//   vendorPortalRoutes        → buyer-side, auth'd, mounted at /api/vendor-portal
//   vendorPortalPublicRoutes  → vendor self-service, UNAUTHENTICATED, mounted at /api/portal
//
// Splitting them keeps the auth boundary obvious — anything routed through
// vendorPortalPublicRoutes is reachable without a JWT, by design (the
// vendor accesses it via the tokenised invite link).

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createInvitation } from '../services/vendor-portal/invitation.service.js'
import {
  resolveOnboardingToken,
  submitOnboarding,
} from '../services/vendor-portal/onboarding.service.js'

// ── Validation schemas ───────────────────────────────────────────────────

const createInvitationSchema = z.object({
  vendorLegalName:   z.string().min(1).max(200).optional(),
  vendorEmail:       z.string().email(),
  vendorCountryCode: z.string().length(2).optional(),
  vendorType:        z.string().min(1).optional(),
  industryCategory:  z.string().optional(),
  estimatedSpend:    z.coerce.number().nonnegative().optional(),
}).strict()

const listInvitationsQuerySchema = z.object({
  status: z.string().optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
}).strict()

const listRequestsQuerySchema = z.object({
  status:       z.string().optional(),
  countryCode:  z.string().length(2).optional(),
  vendorType:   z.string().optional(),
  riskTier:     z.string().optional(),
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(100).default(20),
}).strict()

const submitOnboardingSchema = z.object({
  profile: z.object({
    legalName:          z.string().min(1).max(200),
    tradeName:          z.string().optional(),
    registrationNumber: z.string().optional(),
    incorporationDate:  z.string().optional().nullable(),
    countryCode:        z.string().length(2),
    vendorType:         z.string().min(1),
    industryCategory:   z.string().optional(),
    website:            z.string().optional(),
    currency:           z.string().length(3).optional(),
    annualRevenue:      z.coerce.number().nonnegative().optional(),
    employeeCount:      z.coerce.number().int().nonnegative().optional(),
    dunsNumber:         z.string().optional(),
  }),
  contacts: z.array(z.object({
    contactType: z.string(),
    firstName:   z.string().min(1),
    lastName:    z.string().min(1),
    email:       z.string().email(),
    phone:       z.string().optional(),
    designation: z.string().optional(),
    isPrimary:   z.boolean().optional(),
  })).default([]),
  addresses: z.array(z.object({
    addressType:  z.string(),
    line1:        z.string().min(1),
    line2:        z.string().optional(),
    city:         z.string().min(1),
    state:        z.string().optional(),
    postalCode:   z.string().optional(),
    countryCode:  z.string().length(2),
    isRegistered: z.boolean().optional(),
  })).default([]),
  bankAccounts: z.array(z.object({
    countryCode:    z.string().length(2),
    accountName:    z.string().min(1),
    accountNumber:  z.string().min(1),
    bankName:       z.string().min(1),
    bankCode:       z.string().optional(),
    ifscSwiftIban:  z.string().optional(),
    currency:       z.string().length(3),
    isPrimary:      z.boolean().optional(),
  })).default([]),
  complianceRecords: z.array(z.object({
    countryCode:     z.string().length(2),
    documentType:    z.string().min(1),
    documentNumber:  z.string().optional(),
    expiresAt:       z.string().optional().nullable(),
  })).default([]),
}).strict()

// Token-shaped param. randomUUID() gives a 36-char hex+dashes string; we
// accept any non-empty short-ish string so we don't have to keep the regex
// in sync if the generator changes.
const tokenParamSchema = z.object({
  token: z.string().min(8).max(128),
})

// ── Buyer-side (authenticated) ───────────────────────────────────────────

export async function vendorPortalRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // POST /api/vendor-portal/invitations — buyer invites a vendor.
  app.post('/invitations', auth, async (req, reply) => {
    const parsed = createInvitationSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid invitation payload',
        issues: parsed.error.flatten(),
      })
    }
    const result = await createInvitation(
      app.prisma,
      req.tenant.id,
      req.user.sub,
      parsed.data,
    )
    return reply.code(201).send(result)
  })

  // GET /api/vendor-portal/invitations — paginated list of invitations the
  // buyer has sent. Sorted newest first.
  app.get('/invitations', auth, async (req, reply) => {
    const parsed = listInvitationsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid query',
        issues: parsed.error.flatten(),
      })
    }
    const { status, page, limit } = parsed.data
    const tenantId = req.tenant.id

    // Filter by status on the join key (request.status when supplied — we
    // don't filter on invitation.status because the buyer almost always
    // wants to see the latest state of the underlying request).
    const where: any = { request: { tenantId } }
    if (status) where.request.status = status

    const [total, rows] = await Promise.all([
      app.prisma.vendorOnboardingInvitation.count({ where }),
      app.prisma.vendorOnboardingInvitation.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id: true, sentToEmail: true, sentAt: true, expiresAt: true,
          status: true, resendCount: true,
          request: {
            select: {
              id: true, requestCode: true, vendorLegalName: true, status: true,
            },
          },
        },
      }),
    ])

    return reply.send({
      rows: rows.map((r) => ({
        id:              r.id,
        requestId:       r.request.id,
        requestCode:     r.request.requestCode,
        vendorLegalName: r.request.vendorLegalName,
        vendorEmail:     r.sentToEmail,
        sentAt:          r.sentAt,
        expiresAt:       r.expiresAt,
        status:          r.status,
        requestStatus:   r.request.status,
        resendCount:     r.resendCount,
      })),
      total, page, limit,
    })
  })

  // GET /api/vendor-portal/requests — paginated, filterable list of all
  // onboarding requests the buyer has visibility into. Used by the
  // Requests page on the desk.
  app.get('/requests', auth, async (req, reply) => {
    const parsed = listRequestsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid query',
        issues: parsed.error.flatten(),
      })
    }
    const { status, countryCode, vendorType, riskTier, page, limit } = parsed.data
    const tenantId = req.tenant.id

    const where: any = { tenantId }
    if (status)      where.status            = status
    if (countryCode) where.vendorCountryCode = countryCode
    if (vendorType)  where.vendorType        = vendorType
    if (riskTier)    where.profile           = { riskTier }

    const [total, rows] = await Promise.all([
      app.prisma.vendorOnboardingRequest.count({ where }),
      app.prisma.vendorOnboardingRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id:                true,
          requestCode:       true,
          vendorLegalName:   true,
          vendorEmail:       true,
          vendorCountryCode: true,
          vendorType:        true,
          spendTier:         true,
          status:            true,
          riskMatrixRuleId:  true,
          invitedAt:         true,
          submittedAt:       true,
          erpSyncStatus:     true,
          profile: { select: { riskScore: true, riskTier: true } },
          workflow: { select: { status: true, currentLevel: true, totalLevels: true } },
        },
      }),
    ])

    return reply.send({ rows, total, page, limit })
  })
}

// ── Vendor self-service (UNAUTHENTICATED) ────────────────────────────────

export async function vendorPortalPublicRoutes(app: FastifyInstance) {
  // GET /api/portal/onboarding/:token — vendor lands on the self-service
  // page via the tokenised email link. Returns request basics + country
  // config + risk-weight projection so the form can render. No auth.
  app.get('/onboarding/:token', async (req, reply) => {
    const params = tokenParamSchema.safeParse(req.params)
    if (!params.success) {
      return reply.code(401).send({ error: 'INVALID_TOKEN' })
    }

    const lookup = await resolveOnboardingToken(app.prisma, params.data.token)
    if (!lookup.ok) {
      return reply.code(401).send({ error: lookup.error })
    }
    const request = lookup.request!

    // Pull country config + matrix rule in parallel — both are small reads.
    const [countryConfig, matrixRule] = await Promise.all([
      request.vendorCountryCode
        ? app.prisma.vendorCountryConfig.findUnique({
            where: { tenantId_countryCode: { tenantId: request.tenantId, countryCode: request.vendorCountryCode } },
            select: {
              countryName:         true,
              requiredDocuments:   true,
              taxIdLabel:          true,
              taxIdFormat:         true,
              bankFieldsRequired:  true,
              sanctionListsToCheck: true,
            },
          })
        : Promise.resolve(null),
      request.riskMatrixRuleId
        ? app.prisma.vendorRiskMatrixRule.findUnique({
            where:  { id: request.riskMatrixRuleId },
            select: { riskWeights: true },
          })
        : Promise.resolve(null),
    ])

    return reply.send({
      request: {
        requestCode:       request.requestCode,
        vendorLegalName:   request.vendorLegalName,
        vendorEmail:       request.vendorEmail,
        vendorCountryCode: request.vendorCountryCode,
        vendorType:        request.vendorType,
      },
      countryConfig,
      appliedRiskWeights: matrixRule?.riskWeights ?? null,
    })
  })

  // POST /api/portal/onboarding/:token/submit — vendor returns the
  // completed profile. Same token validation; on success, the token is
  // burned (tokenUsedAt) so the form can't be re-submitted.
  app.post('/onboarding/:token/submit', async (req, reply) => {
    const params = tokenParamSchema.safeParse(req.params)
    if (!params.success) {
      return reply.code(401).send({ error: 'INVALID_TOKEN' })
    }

    const lookup = await resolveOnboardingToken(app.prisma, params.data.token)
    if (!lookup.ok) {
      return reply.code(401).send({ error: lookup.error })
    }
    const request = lookup.request!

    const body = submitOnboardingSchema.safeParse(req.body)
    if (!body.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid submission payload',
        issues: body.error.flatten(),
      })
    }

    try {
      const result = await submitOnboarding(app.prisma, request, body.data)
      return reply.code(201).send(result)
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'vendor-portal submit failed')
      return reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Submission could not be persisted',
      })
    }
  })
}
