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
import {
  createInvitation,
  resendInvitation,
} from '../services/vendor-portal/invitation.service.js'
import {
  resolveOnboardingToken,
  submitOnboarding,
} from '../services/vendor-portal/onboarding.service.js'
import {
  approveCurrentStep,
  rejectWorkflow,
  sendBackWorkflow,
} from '../services/vendor-portal/workflow.service.js'
import { calculateRiskScore } from '../services/vendor-portal/risk.service.js'
import {
  createChangeRequest,
  approveChangeRequest,
  rejectChangeRequest,
} from '../services/vendor-portal/change-request.service.js'

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

const idParamSchema     = z.object({ id: z.string().min(1) })

const approveBodySchema = z.object({
  comments: z.string().max(2000).optional(),
  decision: z.literal('APPROVED').optional(),
}).strict()

const rejectBodySchema = z.object({
  comments: z.string().max(2000).optional(),
  reason:   z.string().min(1).max(2000),
}).strict()

const sendBackBodySchema = z.object({
  comments: z.string().min(1).max(2000),
}).strict()

const listChangeRequestsQuerySchema = z.object({
  status:     z.string().optional(),
  changeType: z.string().optional(),
  vendorId:   z.string().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
}).strict()

const createChangeRequestSchema = z.object({
  vendorId:        z.string().min(1),
  changeType:      z.string().min(1),
  // z.unknown() instead of z.any() so the inferred TS type marks these as
  // required (z.any() optional-widens, which conflicts with the service's
  // required beforeSnapshot/afterSnapshot input shape).
  beforeSnapshot:  z.unknown(),
  afterSnapshot:   z.unknown(),
  comments:        z.string().optional(),
  priority:        z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  requestedByType: z.enum(['BUYER', 'VENDOR']).optional(),
}).strict()

const changeRequestActionSchema = z.object({
  comments: z.string().optional(),
}).strict()

const changeRequestRejectSchema = z.object({
  comments: z.string().optional(),
  reason:   z.string().min(1).max(2000),
}).strict()

const vendorIdParamSchema = z.object({ vendorId: z.string().min(1) })

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

  // GET /api/vendor-portal/requests/:id — full request detail. Surfaces
  // every child collection in one round-trip so the approval/profile pages
  // don't have to N+1.
  app.get('/requests/:id', auth, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid id' })
    }
    const tenantId = req.tenant.id
    const detail = await app.prisma.vendorOnboardingRequest.findFirst({
      where: { id: params.data.id, tenantId },
      include: {
        invitations: { orderBy: { sentAt: 'desc' } },
        profile: {
          include: {
            contacts:          true,
            addresses:         true,
            bankAccounts:      true,
            complianceRecords: { include: { documents: true } },
            documents:         true,
          },
        },
        workflow: {
          include: { steps: { orderBy: { level: 'asc' } } },
        },
      },
    })
    if (!detail) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Request not found' })
    }
    return reply.send(detail)
  })

  // POST /api/vendor-portal/requests/:id/approve — advance the workflow.
  app.post('/requests/:id/approve', auth, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params)
    const body   = approveBodySchema.safeParse(req.body)
    if (!params.success || !body.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        issues: !params.success ? params.error.flatten() : body.success ? undefined : body.error.flatten(),
      })
    }
    const result = await approveCurrentStep(
      app.prisma, params.data.id, req.tenant.id, req.user.sub, body.data.comments,
    )
    if (result.ok === false) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 409
      return reply.code(status).send(result.error)
    }
    return reply.send(result)
  })

  // POST /api/vendor-portal/requests/:id/reject — terminate the workflow.
  app.post('/requests/:id/reject', auth, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params)
    const body   = rejectBodySchema.safeParse(req.body)
    if (!params.success || !body.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        issues: !params.success ? params.error.flatten() : body.success ? undefined : body.error.flatten(),
      })
    }
    const result = await rejectWorkflow(
      app.prisma, params.data.id, req.tenant.id, req.user.sub, body.data.comments, body.data.reason,
    )
    if (result.ok === false) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 409
      return reply.code(status).send(result.error)
    }
    return reply.send(result)
  })

  // POST /api/vendor-portal/requests/:id/send-back — roll back one level.
  app.post('/requests/:id/send-back', auth, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params)
    const body   = sendBackBodySchema.safeParse(req.body)
    if (!params.success || !body.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        issues: !params.success ? params.error.flatten() : body.success ? undefined : body.error.flatten(),
      })
    }
    const result = await sendBackWorkflow(
      app.prisma, params.data.id, req.tenant.id, req.user.sub, body.data.comments,
    )
    if (result.ok === false) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 409
      return reply.code(status).send(result.error)
    }
    return reply.send(result)
  })

  // ── Risk scoring (Sprint 3) ─────────────────────────────────────────────

  // POST /api/vendor-portal/risk/score/:vendorId — re-score a vendor on
  // demand. Always uses trigger=MANUAL; scheduled re-scoring will use a
  // job runner with trigger=SCHEDULED later.
  app.post('/risk/score/:vendorId', auth, async (req, reply) => {
    const params = vendorIdParamSchema.safeParse(req.params)
    if (!params.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid vendorId' })
    }
    // Tenant gate — the service trusts whatever vendorId it's given, so
    // verify ownership at the route boundary.
    const owned = await app.prisma.vendorProfile.findFirst({
      where:  { id: params.data.vendorId, tenantId: req.tenant.id },
      select: { id: true },
    })
    if (!owned) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Vendor not found' })
    }
    try {
      const result = await calculateRiskScore(app.prisma, params.data.vendorId, 'MANUAL')
      return reply.send(result)
    } catch (err) {
      app.log.error({ err, vendorId: params.data.vendorId }, 'risk score calculation failed')
      return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'Risk score calculation failed' })
    }
  })

  // GET /api/vendor-portal/risk/dashboard — aggregate read for the risk
  // dashboard page. Returns KPIs, distribution, geographic + category
  // breakouts, top high-risk vendors, recent alerts. All scoped to tenant.
  app.get('/risk/dashboard', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const now      = new Date()
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 86_400_000)
    const sixMonthsAgo    = new Date(now.getTime() - 180 * 86_400_000)

    // Pull everything we need in parallel — keeps the dashboard P95 down.
    const [
      allProfiles,
      hitScreenings,
      expiringRecords,
      historyRows,
    ] = await Promise.all([
      app.prisma.vendorProfile.findMany({
        where:  { tenantId },
        select: {
          id: true, vendorCode: true, legalName: true, countryCode: true,
          industryCategory: true, riskScore: true, riskTier: true, status: true,
          createdAt: true,
        },
      }),
      app.prisma.vendorSanctionScreening.findMany({
        where: { status: 'HIT', vendor: { tenantId } },
        orderBy: { screenedAt: 'desc' },
        take: 10,
        select: {
          id: true, screeningProvider: true, listName: true, matchType: true,
          matchScore: true, screenedAt: true,
          vendor: { select: { id: true, legalName: true, vendorCode: true } },
        },
      }),
      app.prisma.vendorComplianceRecord.findMany({
        where: {
          vendor: { tenantId },
          expiresAt: { lte: thirtyDaysAhead, gte: new Date(now.getTime() - 30 * 86_400_000) },
        },
        orderBy: { expiresAt: 'asc' },
        take: 10,
        select: {
          id: true, documentType: true, documentNumber: true, expiresAt: true,
          vendor: { select: { id: true, legalName: true, vendorCode: true } },
        },
      }),
      app.prisma.vendorRiskHistory.findMany({
        where: { vendor: { tenantId }, scoredAt: { gte: sixMonthsAgo } },
        orderBy: { scoredAt: 'asc' },
        select: { scoredAt: true, riskTier: true },
      }),
    ])

    // KPIs.
    const kpis = {
      totalVendors:        allProfiles.length,
      highRiskCount:       allProfiles.filter((p) => p.riskTier === 'HIGH').length,
      criticalRiskCount:   allProfiles.filter((p) => p.riskTier === 'CRITICAL').length,
      newAlertsCount:      hitScreenings.length + expiringRecords.length,
      sanctionsMatchCount: hitScreenings.length,
      expiringDocsCount:   expiringRecords.length,
    }

    // Distribution. Default each bucket to 0 so the donut shows all four
    // slices even when one's empty.
    const distribution: Record<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', number> = {
      LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0,
    }
    for (const p of allProfiles) {
      const t = (p.riskTier ?? 'LOW') as keyof typeof distribution
      if (t in distribution) distribution[t]++
    }

    // 6-month tier trend, grouped by YYYY-MM. Empty months are filled in so
    // the chart's x-axis stays continuous.
    const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      months.push(monthKey(d))
    }
    const trendByMonth: Record<string, { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number }> = {}
    for (const m of months) trendByMonth[m] = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
    for (const h of historyRows) {
      const m = monthKey(h.scoredAt)
      if (trendByMonth[m]) trendByMonth[m][h.riskTier as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL']++
    }
    const riskTrend = months.map((m) => ({ month: m, ...trendByMonth[m] }))

    // Geographic + category aggregates. Skip nulls; sort desc by vendor count;
    // top 10.
    const geoMap = new Map<string, { vendorCount: number; scoreSum: number }>()
    const catMap = new Map<string, { vendorCount: number; scoreSum: number }>()
    for (const p of allProfiles) {
      const score = p.riskScore ?? 0
      if (p.countryCode) {
        const cur = geoMap.get(p.countryCode) ?? { vendorCount: 0, scoreSum: 0 }
        cur.vendorCount++; cur.scoreSum += score
        geoMap.set(p.countryCode, cur)
      }
      if (p.industryCategory) {
        const cur = catMap.get(p.industryCategory) ?? { vendorCount: 0, scoreSum: 0 }
        cur.vendorCount++; cur.scoreSum += score
        catMap.set(p.industryCategory, cur)
      }
    }
    const geographicRisk = [...geoMap.entries()]
      .map(([countryCode, v]) => ({
        countryCode,
        vendorCount:  v.vendorCount,
        avgRiskScore: Math.round(v.scoreSum / v.vendorCount),
        riskPercent:  Math.round((v.scoreSum / v.vendorCount)),
      }))
      .sort((a, b) => b.vendorCount - a.vendorCount)
      .slice(0, 10)

    const categoryRisk = [...catMap.entries()]
      .map(([category, v]) => ({
        category,
        vendorCount:  v.vendorCount,
        avgRiskScore: Math.round(v.scoreSum / v.vendorCount),
      }))
      .sort((a, b) => b.vendorCount - a.vendorCount)
      .slice(0, 10)

    // Top 20 vendors by current riskScore desc. `primaryRiskFactor` is a
    // best-effort label derived from the tier — full factor breakdowns are
    // available via POST /risk/score/:vendorId.
    const highRiskVendors = [...allProfiles]
      .filter((p) => (p.riskScore ?? 0) > 0)
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
      .slice(0, 20)
      .map((p) => ({
        id:               p.id,
        vendorCode:       p.vendorCode,
        legalName:        p.legalName,
        countryCode:      p.countryCode,
        industryCategory: p.industryCategory,
        riskScore:        p.riskScore,
        riskTier:         p.riskTier,
        status:           p.status,
        primaryRiskFactor:
          p.riskTier === 'CRITICAL' ? 'Critical exposure' :
          p.riskTier === 'HIGH'     ? 'Elevated risk profile' :
          p.riskTier === 'MEDIUM'   ? 'Monitoring required' :
                                      'Within tolerance',
      }))

    const recentAlerts = {
      sanctions: hitScreenings,
      expiring:  expiringRecords,
    }

    return reply.send({
      kpis,
      riskDistribution: distribution,
      riskTrend,
      geographicRisk,
      categoryRisk,
      highRiskVendors,
      recentAlerts,
    })
  })

  // ── Change requests (Sprint 3) ──────────────────────────────────────────

  // GET /api/vendor-portal/change-requests — paginated list with filters.
  app.get('/change-requests', auth, async (req, reply) => {
    const parsed = listChangeRequestsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid query', issues: parsed.error.flatten() })
    }
    const { status, changeType, vendorId, page, limit } = parsed.data
    const tenantId = req.tenant.id

    const where: any = { vendor: { tenantId } }
    if (status)     where.status     = status
    if (changeType) where.changeType = changeType
    if (vendorId)   where.vendorId   = vendorId

    const [total, rows] = await Promise.all([
      app.prisma.vendorChangeRequest.count({ where }),
      app.prisma.vendorChangeRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id: true, requestCode: true, vendorId: true, changeType: true,
          priority: true, status: true, approvalStatus: true,
          requestedByType: true, requestedAt: true,
          vendor: { select: { id: true, legalName: true, vendorCode: true } },
        },
      }),
    ])
    return reply.send({ rows, total, page, limit })
  })

  // POST /api/vendor-portal/change-requests — create.
  app.post('/change-requests', auth, async (req, reply) => {
    const parsed = createChangeRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid payload', issues: parsed.error.flatten() })
    }
    const result = await createChangeRequest(
      app.prisma, req.tenant.id, req.user.sub, parsed.data,
    )
    if (result.ok === false) {
      return reply.code(404).send(result.error)
    }
    return reply.code(201).send(result.changeRequest)
  })

  // GET /api/vendor-portal/change-requests/:id — single detail with full
  // before/after snapshots + vendor profile context.
  app.get('/change-requests/:id', auth, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid id' })
    }
    const cr = await app.prisma.vendorChangeRequest.findFirst({
      where: { id: params.data.id, vendor: { tenantId: req.tenant.id } },
      include: {
        vendor: {
          select: {
            id: true, vendorCode: true, legalName: true, tradeName: true,
            countryCode: true, vendorType: true, riskScore: true, riskTier: true, status: true,
          },
        },
      },
    })
    if (!cr) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Change request not found' })
    }
    return reply.send(cr)
  })

  // POST /api/vendor-portal/change-requests/:id/approve
  app.post('/change-requests/:id/approve', auth, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params)
    const body   = changeRequestActionSchema.safeParse(req.body)
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid request' })
    }
    const result = await approveChangeRequest(
      app.prisma, params.data.id, req.tenant.id, req.user.sub, body.data.comments,
    )
    if (result.ok === false) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 409
      return reply.code(status).send(result.error)
    }
    return reply.send(result.changeRequest)
  })

  // POST /api/vendor-portal/change-requests/:id/reject
  app.post('/change-requests/:id/reject', auth, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params)
    const body   = changeRequestRejectSchema.safeParse(req.body)
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid request' })
    }
    const result = await rejectChangeRequest(
      app.prisma, params.data.id, req.tenant.id, req.user.sub, body.data.comments, body.data.reason,
    )
    if (result.ok === false) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 409
      return reply.code(status).send(result.error)
    }
    return reply.send(result.changeRequest)
  })

  // POST /api/vendor-portal/invitations/:id/resend — refresh the portal
  // token + expiry. The route returns the new token so the caller can
  // re-fire the outbound email (email plumbing lands later).
  app.post('/invitations/:id/resend', auth, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid id' })
    }
    const result = await resendInvitation(
      app.prisma, params.data.id, req.tenant.id, req.user.sub,
    )
    if ('ok' in result && result.ok === false) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 409
      return reply.code(status).send(result.error)
    }
    return reply.send(result)
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
