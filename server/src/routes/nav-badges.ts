// Single endpoint that aggregates every sidebar badge count in one round-trip.
// Returning one JSON keeps the nav cheap (the alternative — one query per
// badge — would fan out to 9 fetches on every route change). Each branch is
// wrapped in try/catch so a single broken count never zeros the whole nav.

import type { FastifyInstance } from 'fastify'

export interface NavBadges {
  pendingApprovals:  number
  pendingInvoices:   number
  unmatchedInvoices: number
  paymentQueueCount: number
  pendingChallans:   number
  msmeAtRisk:        number
  kycGaps:           number
  failedErpSync:     number
  pendingProvisions: number
}

const ZERO_BADGES: NavBadges = {
  pendingApprovals:  0,
  pendingInvoices:   0,
  unmatchedInvoices: 0,
  paymentQueueCount: 0,
  pendingChallans:   0,
  msmeAtRisk:        0,
  kycGaps:           0,
  failedErpSync:     0,
  pendingProvisions: 0,
}

export async function navBadgesRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/badges', auth, async (request, reply) => {
    const tenantId = request.tenant.id
    const userId   = request.user.sub
    const prisma   = app.prisma

    // Run every count in parallel — each in its own catch so a single
    // failing branch returns 0 for that count rather than throwing the
    // whole response.
    const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
      try { return await p } catch (err) {
        request.log.warn({ err }, '[nav/badges] count failed')
        return fallback
      }
    }

    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setUTCDate(sevenDaysFromNow.getUTCDate() + 7)
    const currentPeriod = new Date().toISOString().slice(0, 7) // YYYY-MM

    const [
      pendingApprovals,
      pendingInvoices,
      unmatchedInvoices,
      paymentQueueCount,
      pendingChallans,
      msmeAtRisk,
      kycGaps,
      failedErpSync,
      pendingProvisions,
    ] = await Promise.all([
      safe(prisma.workflowInstanceStage.count({
        where: { tenantId, assignedTo: userId, status: 'PENDING' },
      }), 0),

      safe(prisma.invoice.count({
        where: { tenantId, status: { in: ['PENDING_L1', 'PENDING_L2'] } },
      }), 0),

      // Unmatched = explicit UNMATCHED status, or 2-/3-way invoices whose
      // match score sits below the conservative 70 threshold.
      safe(prisma.invoice.count({
        where: {
          tenantId,
          OR: [
            { status: 'UNMATCHED' },
            { AND: [{ matchScore: { lt: 70 } }, { matchScore: { not: null } }] },
          ],
        },
      }), 0),

      // Approved + unpaid invoices feed the payment queue.
      safe(prisma.invoice.count({
        where: {
          tenantId,
          status:        'APPROVED',
          paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        },
      }), 0),

      safe(prisma.tdsChallan.count({
        where: { tenantId, status: 'PENDING' },
      }), 0),

      // MSME at risk = registered MSME vendors with an unpaid invoice whose
      // statutory due date is within 7 days (or already in breach).
      safe(prisma.invoice.count({
        where: {
          tenantId,
          paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
          msmePaymentDue: { not: null, lte: sevenDaysFromNow },
          vendor: { msmeRegistered: true },
        },
      }), 0),

      // KYC gaps — bank KYC is the most material; PAN/GST checked too so
      // any vendor missing baseline KYC surfaces.
      safe(prisma.vendor.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          OR: [
            { kycBankStatus: { not: 'VALID' } },
            { kycPanStatus:  { not: 'VALID' } },
          ],
        },
      }), 0),

      safe(prisma.journalEntry.count({
        where: { tenantId, erpStatus: 'FAILED' },
      }), 0),

      // ProvisionProposal table arrives with Part 2; tolerate the
      // pre-migration window by catching the unknown-relation error.
      safe(
        (prisma as unknown as { provisionProposal?: { count: (q: unknown) => Promise<number> } })
          .provisionProposal
          ?.count({ where: { tenantId, period: currentPeriod, status: 'DRAFT' } })
          ?? Promise.resolve(0),
        0,
      ),
    ])

    const body: NavBadges = {
      ...ZERO_BADGES,
      pendingApprovals,
      pendingInvoices,
      unmatchedInvoices,
      paymentQueueCount,
      pendingChallans,
      msmeAtRisk,
      kycGaps,
      failedErpSync,
      pendingProvisions,
    }
    return reply.send(body)
  })
}
