import type { FastifyInstance } from 'fastify'
import { cacheGet, cacheSet, TTL, CacheKeys } from '../lib/redis.js'
import { getAccountBalance } from '../services/transbnk.service.js'

export async function dashboardRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // ── Main KPIs ──
  app.get('/kpis', auth, async (request, reply) => {
    const tenantId  = request.tenant.id
    const cacheKey  = CacheKeys.dashboard(tenantId)
    const cached    = await cacheGet(app.redis, cacheKey)
    if (cached) return reply.send(cached)

    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const fyStart    = now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1)

    const [
      pendingApprovalsCount,
      pendingApprovals,
      overdueCount,
      overdueAmount,
      monthlySpend,
      quarterTds,
      totalVendors,
      invoicesThisMonth,
      invoicesByStatus,
    ] = await Promise.all([
      // Pending approval count
      app.prisma.invoice.count({
        where: { tenantId, status: { in: ['PENDING_L1', 'PENDING_L2', 'PENDING_L3'] } },
      }),
      // Pending approvals list (top 5)
      app.prisma.invoice.findMany({
        where:   { tenantId, status: { in: ['PENDING_L1', 'PENDING_L2', 'PENDING_L3'] } },
        orderBy: { createdAt: 'asc' },
        take:    5,
        select:  {
          id: true, invoiceNumber: true, netPayable: true, status: true,
          invoiceDate: true, dueDate: true, createdAt: true,
          vendor: { select: { legalName: true, vendorCode: true } },
        },
      }),
      // Overdue invoices count (approved but past due date and not paid)
      app.prisma.invoice.count({
        where: { tenantId, status: { in: ['APPROVED', 'PENDING_L1', 'PENDING_L2'] }, dueDate: { lt: now } },
      }),
      // Overdue total amount
      app.prisma.invoice.aggregate({
        where: { tenantId, status: { in: ['APPROVED', 'PENDING_L1', 'PENDING_L2'] }, dueDate: { lt: now } },
        _sum:  { netPayable: true },
      }),
      // Monthly AP spend
      app.prisma.invoice.aggregate({
        where: { tenantId, status: { in: ['APPROVED', 'PAID'] }, invoiceDate: { gte: monthStart } },
        _sum:  { netPayable: true },
      }),
      // TDS liability this quarter
      app.prisma.invoice.aggregate({
        where: { tenantId, status: { in: ['APPROVED', 'PAID'] }, invoiceDate: { gte: fyStart } },
        _sum:  { tdsAmount: true },
      }),
      // Active vendors
      app.prisma.vendor.count({ where: { tenantId, status: 'ACTIVE' } }),
      // Invoices this month
      app.prisma.invoice.count({
        where: { tenantId, createdAt: { gte: monthStart } },
      }),
      // Invoices by status
      app.prisma.invoice.groupBy({
        by:    ['status'],
        where: { tenantId },
        _count: true,
      }),
    ])

    // Account balance (non-blocking — use mock if Transbnk not configured)
    const balResult = await getAccountBalance().catch(() => null)
    const balance   = balResult?.ok ? balResult.data : null

    const kpis = {
      pendingApprovalsCount,
      pendingApprovals,
      overdueCount,
      overdueAmount:    Number(overdueAmount._sum.netPayable ?? 0),
      monthlySpend:     Number(monthlySpend._sum.netPayable ?? 0),
      quarterTds:       Number(quarterTds._sum.tdsAmount ?? 0),
      totalVendors,
      invoicesThisMonth,
      invoicesByStatus: invoicesByStatus.map(s => ({ status: s.status, count: s._count })),
      balance,
      generatedAt: new Date().toISOString(),
    }

    await cacheSet(app.redis, cacheKey, kpis, TTL.DASHBOARD)
    return reply.send(kpis)
  })

  // ── Spend trend — last 6 months ──
  app.get('/spend-trend', auth, async (request, reply) => {
    const tenantId = request.tenant.id
    const months: { label: string; start: Date; end: Date }[] = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      })
    }

    const trend = await Promise.all(
      months.map(async m => {
        const agg = await app.prisma.invoice.aggregate({
          where: { tenantId, status: { in: ['APPROVED', 'PAID'] }, invoiceDate: { gte: m.start, lte: m.end } },
          _sum:  { netPayable: true, tdsAmount: true },
          _count: true,
        })
        return {
          month:   m.label,
          spend:   Number(agg._sum.netPayable ?? 0),
          tds:     Number(agg._sum.tdsAmount  ?? 0),
          count:   agg._count,
        }
      })
    )

    return reply.send(trend)
  })

  // ── Spend by GL code ──
  app.get('/spend-by-gl', auth, async (request, reply) => {
    const tenantId  = request.tenant.id
    const now       = new Date()
    const fyStart   = now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1)

    const grouped = await app.prisma.invoice.groupBy({
      by:    ['glCodeId'],
      where: { tenantId, status: { in: ['APPROVED', 'PAID'] }, invoiceDate: { gte: fyStart }, glCodeId: { not: null } },
      _sum:  { netPayable: true },
      orderBy: { _sum: { netPayable: 'desc' } },
      take: 8,
    })

    // Fetch GL code names
    const glIds = grouped.map(g => g.glCodeId).filter(Boolean) as string[]
    const glCodes = await app.prisma.glCode.findMany({ where: { id: { in: glIds } }, select: { id: true, code: true, name: true } })
    const glMap   = Object.fromEntries(glCodes.map(g => [g.id, g]))

    return reply.send(grouped.map(g => ({
      glCodeId: g.glCodeId,
      glCode:   g.glCodeId ? glMap[g.glCodeId]?.code : 'Unassigned',
      name:     g.glCodeId ? glMap[g.glCodeId]?.name : 'Unassigned',
      amount:   Number(g._sum.netPayable ?? 0),
    })))
  })

  // ── Recent activity ──
  app.get('/activity', auth, async (request, reply) => {
    const events = await app.prisma.auditLog.findMany({
      where:   { tenantId: request.tenant.id },
      orderBy: { createdAt: 'desc' },
      take:    15,
      select:  { id: true, action: true, entityType: true, entityId: true, userId: true, createdAt: true, after: true },
    })
    return reply.send(events)
  })
}
