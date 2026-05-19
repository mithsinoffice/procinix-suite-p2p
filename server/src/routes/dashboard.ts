import type { FastifyInstance } from 'fastify'
import { cacheGet, cacheSet, TTL, CacheKeys } from '../lib/redis.js'
import { getAccountBalance } from '../services/transbnk.service.js'
import {
  calcStpRate, calcAvgProcessingDays, matchScoreHistogram, calcLaneDistribution,
  resolveDateRange,
} from '../services/dashboard.service.js'

interface DashboardQuery {
  entityId?: string
  dateFrom?: string   // ISO YYYY-MM-DD
  dateTo?:   string
}

export async function dashboardRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // ── Main KPIs ────────────────────────────────────────────────────────────
  // Accepts entityId / dateFrom / dateTo as query params. With no filters it
  // falls back to "this month" and reads from Redis cache (60s TTL); filtered
  // requests skip the cache because the cache key isn't filter-aware.
  app.get('/kpis', auth, async (request, reply) => {
    const tenantId  = request.tenant.id
    const q         = request.query as DashboardQuery
    const filtered  = !!(q.entityId || q.dateFrom || q.dateTo)
    const cacheKey  = CacheKeys.dashboard(tenantId)

    if (!filtered) {
      const cached = await cacheGet(app.redis, cacheKey)
      if (cached) return reply.send(cached)
    }

    const now      = new Date()
    const { start: rangeStart, end: rangeEnd } = resolveDateRange(q.dateFrom, q.dateTo, now)
    const fyStart  = now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1)

    // Pull all invoices in the active window once — the pure helpers slice it
    // for STP rate / avg processing time / histogram. Saves the cost of
    // running 4 separate groupBy queries on the same window.
    const windowWhere = {
      tenantId,
      ...(q.entityId ? { entityId: q.entityId } : {}),
      invoiceDate: { gte: rangeStart, lte: rangeEnd },
    }

    const [
      pendingApprovalsCount,
      pendingApprovals,
      overdueCount,
      overdueAmount,
      monthlySpend,
      monthlyTds,
      quarterTds,
      totalVendors,
      msmeDueIn7Days,
      paymentBatchesPending,
      invoicesInWindow,
      invoicesByStatus,
    ] = await Promise.all([
      // Pending approval count (always tenant-wide — filter doesn't apply to "what's on my plate today")
      app.prisma.invoice.count({
        where: { tenantId, status: { in: ['PENDING_L1', 'PENDING_L2', 'PENDING_L3'] }, ...(q.entityId ? { entityId: q.entityId } : {}) },
      }),
      // Pending approvals list — enriched with daysPending + approver name
      app.prisma.invoice.findMany({
        where:   { tenantId, status: { in: ['PENDING_L1', 'PENDING_L2', 'PENDING_L3'] }, ...(q.entityId ? { entityId: q.entityId } : {}) },
        orderBy: { createdAt: 'asc' },
        take:    20,
        select:  {
          id: true, invoiceNumber: true, netPayable: true, totalAmount: true, status: true,
          invoiceDate: true, dueDate: true, createdAt: true,
          vendor:   { select: { legalName: true, vendorCode: true } },
          approvals: {
            where: { status: 'PENDING' }, orderBy: { level: 'asc' }, take: 1,
            select: { approverId: true, level: true },
          },
        },
      }),
      // Overdue invoices count (approved but past due date and not paid)
      app.prisma.invoice.count({
        where: { tenantId, status: { in: ['APPROVED', 'PENDING_L1', 'PENDING_L2'] }, dueDate: { lt: now }, ...(q.entityId ? { entityId: q.entityId } : {}) },
      }),
      app.prisma.invoice.aggregate({
        where: { tenantId, status: { in: ['APPROVED', 'PENDING_L1', 'PENDING_L2'] }, dueDate: { lt: now }, ...(q.entityId ? { entityId: q.entityId } : {}) },
        _sum:  { netPayable: true },
      }),
      // Monthly AP spend (in the active window)
      app.prisma.invoice.aggregate({
        where: { ...windowWhere, status: { in: ['APPROVED', 'PAID'] } },
        _sum:  { totalAmount: true },
      }),
      // TDS this month (in the active window)
      app.prisma.invoice.aggregate({
        where: { ...windowWhere, status: { in: ['APPROVED', 'PAID'] } },
        _sum:  { tdsAmount: true },
      }),
      // TDS this quarter (FY) — separate from window so it stays comparable
      app.prisma.invoice.aggregate({
        where: { tenantId, status: { in: ['APPROVED', 'PAID'] }, invoiceDate: { gte: fyStart }, ...(q.entityId ? { entityId: q.entityId } : {}) },
        _sum:  { tdsAmount: true },
      }),
      app.prisma.vendor.count({ where: { tenantId, status: 'ACTIVE' } }),
      // MSME-due-in-7-days — invoices where the 45-day statutory deadline
      // falls in the next week. Drives the Dashboard payment-urgency card.
      app.prisma.invoice.findMany({
        where: {
          tenantId,
          status: 'APPROVED',
          paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
          msmePaymentDue: { lte: new Date(now.getTime() + 7 * 86_400_000), not: null },
          vendor: { msmeRegistered: true },
        },
        select: { netPayable: true, paidAmount: true },
      }),
      // Payment batches pending finance-manager approval — shows on the
      // dashboard so approvers don't miss them.
      app.prisma.paymentBatch.count({
        where: { tenantId, status: 'PENDING_APPROVAL' },
      }),
      // Raw invoice rows in the window — drives STP rate, avg processing, histogram, lane donut
      app.prisma.invoice.findMany({
        where:  windowWhere,
        select: { id: true, apLane: true, status: true, createdAt: true, approvedAt: true, matchScore: true, totalAmount: true, vendorId: true },
      }),
      app.prisma.invoice.groupBy({
        by: ['status'], where: { tenantId, ...(q.entityId ? { entityId: q.entityId } : {}) }, _count: true,
      }),
    ])

    // Approver lookup — pending list rows carry only approverId; the UI wants names.
    const approverIds = pendingApprovals.flatMap(p => p.approvals.map(a => a.approverId)).filter(Boolean)
    const approvers   = approverIds.length > 0
      ? await app.prisma.user.findMany({ where: { id: { in: approverIds } }, select: { id: true, name: true, email: true } })
      : []
    const approverMap = Object.fromEntries(approvers.map(u => [u.id, u]))

    const pendingApprovalsEnriched = pendingApprovals.map(p => {
      const daysPending = Math.floor((now.getTime() - p.createdAt.getTime()) / 86_400_000)
      const a           = p.approvals[0]
      const approver    = a ? approverMap[a.approverId] : null
      return {
        id:            p.id,
        invoiceNumber: p.invoiceNumber,
        netPayable:    Number(p.netPayable),
        totalAmount:   Number(p.totalAmount),
        status:        p.status,
        invoiceDate:   p.invoiceDate,
        dueDate:       p.dueDate,
        createdAt:     p.createdAt,
        vendor:        p.vendor,
        daysPending,
        approverName:  approver?.name ?? null,
        approverLevel: a?.level ?? null,
      }
    }).sort((a, b) => b.daysPending - a.daysPending)

    // Pure-function calcs over the in-window invoice set
    const stpRate           = calcStpRate(invoicesInWindow)
    const avgProcessingDays = calcAvgProcessingDays(invoicesInWindow)

    // Account balance (non-blocking — use mock if Transbnk not configured)
    const balResult = await getAccountBalance().catch(() => null)
    const balance   = balResult?.ok ? balResult.data : null

    const kpis = {
      pendingApprovalsCount,
      pendingApprovals: pendingApprovalsEnriched,
      overdueCount,
      overdueAmount:      Number(overdueAmount._sum.netPayable ?? 0),
      monthlySpend:       Number(monthlySpend._sum.totalAmount ?? 0),
      monthlyTds:         Number(monthlyTds._sum.tdsAmount ?? 0),
      quarterTds:         Number(quarterTds._sum.tdsAmount ?? 0),
      stpRate:            stpRate.rate,
      stpCount:           stpRate.stpCount,
      avgProcessingDays,
      totalVendors,
      msmeDueIn7Days: {
        count:  msmeDueIn7Days.length,
        amount: msmeDueIn7Days.reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0),
      },
      paymentBatchesPending,
      invoicesThisMonth:  invoicesInWindow.length,
      invoicesByStatus:   invoicesByStatus.map(s => ({ status: s.status, count: s._count })),
      balance,
      dateRange:          { from: rangeStart.toISOString(), to: rangeEnd.toISOString() },
      generatedAt:        new Date().toISOString(),
    }

    if (!filtered) await cacheSet(app.redis, cacheKey, kpis, TTL.DASHBOARD)
    return reply.send(kpis)
  })

  // ── Charts — 4 datasets in one call ──────────────────────────────────────
  // Status-by-day (last 30 days), lane distribution (window), top-5 vendors
  // (window), match-score histogram (window). Same filter params as /kpis.
  app.get('/charts', auth, async (request, reply) => {
    const tenantId  = request.tenant.id
    const q         = request.query as DashboardQuery
    const now       = new Date()
    const { start: rangeStart, end: rangeEnd } = resolveDateRange(q.dateFrom, q.dateTo, now)
    const last30Start = new Date(now)
    last30Start.setDate(last30Start.getDate() - 30)
    last30Start.setHours(0, 0, 0, 0)

    const windowWhere = {
      tenantId,
      ...(q.entityId ? { entityId: q.entityId } : {}),
      invoiceDate: { gte: rangeStart, lte: rangeEnd },
    }

    const [statusLast30, windowInvoices, topVendors] = await Promise.all([
      // Status bar — last 30 days grouped by status (independent of date filter)
      app.prisma.invoice.groupBy({
        by: ['status'],
        where: { tenantId, createdAt: { gte: last30Start }, ...(q.entityId ? { entityId: q.entityId } : {}) },
        _count: true,
      }),
      // Pull all in-window invoices once — feeds lane donut + match histogram
      app.prisma.invoice.findMany({
        where:  windowWhere,
        select: { apLane: true, status: true, createdAt: true, approvedAt: true, matchScore: true, totalAmount: true, vendorId: true },
      }),
      // Top-5 vendors by total invoice value in window
      app.prisma.invoice.groupBy({
        by: ['vendorId'],
        where: { ...windowWhere, vendorId: { not: null } },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
    ])

    const vendorIds = topVendors.map(v => v.vendorId).filter(Boolean) as string[]
    const vendors   = vendorIds.length > 0
      ? await app.prisma.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true, legalName: true, vendorCode: true } })
      : []
    const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]))

    return reply.send({
      statusLast30: statusLast30.map(s => ({ status: s.status, count: s._count })),
      laneDonut:    calcLaneDistribution(windowInvoices),
      topVendors:   topVendors.map(v => ({
        vendorId:   v.vendorId,
        legalName:  v.vendorId ? vendorMap[v.vendorId]?.legalName  ?? '—' : '—',
        vendorCode: v.vendorId ? vendorMap[v.vendorId]?.vendorCode ?? '—' : '—',
        amount:     Number(v._sum.totalAmount ?? 0),
      })),
      matchHistogram: matchScoreHistogram(windowInvoices),
      dateRange:      { from: rangeStart.toISOString(), to: rangeEnd.toISOString() },
    })
  })

  // ── Spend trend — last 6 months (unchanged) ──────────────────────────────
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

  // ── Spend by GL code (unchanged) ─────────────────────────────────────────
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

  // ── Recent activity (unchanged) ──────────────────────────────────────────
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
