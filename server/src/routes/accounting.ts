// Accounting endpoints — journal entries, schedules, ERP sync, month-end close.
// All routes are tenant-scoped via req.tenant.id (from JWT cookie). Mutating
// routes (month-end, ERP push) require TENANT_ADMIN; reads are auth-only.

import type { FastifyInstance } from 'fastify'
import { runMonthEnd } from '../jobs/month-end.job.js'
import { pushJournalEntry, pushBulk, retryFailed } from '../services/erp-push.service.js'

interface ListQuery {
  period?:     string
  entryType?:  string
  erpStatus?:  string
  invoiceId?:  string
  scheduleId?: string
  take?:       string
  cursor?:     string
}

export async function accountingRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  const requireAdmin = async (req: { user: { role?: string } }, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) => {
    const role = req.user.role
    if (role !== 'TENANT_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'CFO') {
      return reply.code(403).send({ code: 'FORBIDDEN', message: 'Month-end requires TENANT_ADMIN role' })
    }
  }

  // ── Journal entries ─────────────────────────────────────────────────
  app.get('/journal-entries', auth, async (req, reply) => {
    const q = req.query as ListQuery
    const take = Math.min(Math.max(Number(q.take ?? 25), 1), 200)

    const where = {
      tenantId: req.tenant.id,
      ...(q.period    && { period: q.period }),
      ...(q.entryType && { entryType: q.entryType }),
      ...(q.erpStatus && { erpStatus: q.erpStatus }),
      ...(q.invoiceId && { invoiceId: q.invoiceId }),
      ...(q.scheduleId && {
        OR: [
          { provisionScheduleId: q.scheduleId },
          { amortizationScheduleId: q.scheduleId },
        ],
      }),
    }

    const [rows, total] = await Promise.all([
      app.prisma.journalEntry.findMany({
        where,
        take: take + 1,
        ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.journalEntry.count({ where }),
    ])

    const hasMore = rows.length > take
    const data    = hasMore ? rows.slice(0, -1) : rows
    const nextCursor = hasMore ? data[data.length - 1].id : null

    // Enrich with invoice ref + item name for display
    const invoiceIds = [...new Set(data.map(r => r.invoiceId).filter(Boolean) as string[])]
    const invoices = invoiceIds.length > 0
      ? await app.prisma.invoice.findMany({
          where: { id: { in: invoiceIds }, tenantId: req.tenant.id },
          select: { id: true, invoiceNumber: true, invoiceRef: true, vendor: { select: { legalName: true } } },
        })
      : []
    const invMap = Object.fromEntries(invoices.map(i => [i.id, i]))

    return reply.send({
      data: data.map(r => ({
        ...r,
        amount: Number(r.amount),
        invoice: r.invoiceId ? invMap[r.invoiceId] ?? null : null,
      })),
      total, nextCursor, hasMore,
    })
  })

  // Push a single JV to the ERP stub
  app.post('/journal-entries/:id/push-erp', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const jv = await app.prisma.journalEntry.findFirst({ where: { id, tenantId: req.tenant.id } })
    if (!jv) return reply.code(404).send({ code: 'NOT_FOUND', message: 'JV not found' })
    const result = await pushJournalEntry(app.prisma, jv)
    return reply.send(result)
  })

  // Bulk push by id list
  app.post('/journal-entries/push-erp-bulk', auth, async (req, reply) => {
    const { ids } = (req.body ?? {}) as { ids?: string[] }
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'ids must be a non-empty array' })
    }
    const result = await pushBulk(app.prisma, req.tenant.id, ids)
    return reply.send(result)
  })

  // Retry a single FAILED JV
  app.post('/journal-entries/:id/retry', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const jv = await app.prisma.journalEntry.findFirst({ where: { id, tenantId: req.tenant.id } })
    if (!jv) return reply.code(404).send({ code: 'NOT_FOUND', message: 'JV not found' })
    if (jv.erpStatus !== 'FAILED') {
      return reply.code(422).send({ code: 'NOT_RETRIABLE', message: `JV is ${jv.erpStatus}, not FAILED` })
    }
    const result = await pushJournalEntry(app.prisma, jv)
    return reply.send(result)
  })

  // Retry-all-failed across tenant
  app.post('/journal-entries/retry-all-failed', auth, async (req, reply) => {
    const result = await retryFailed(app.prisma, req.tenant.id)
    return reply.send(result)
  })

  // ── Provision schedules ─────────────────────────────────────────────
  app.get('/provision-schedules', auth, async (req, reply) => {
    const rows = await app.prisma.provisionSchedule.findMany({
      where:   { tenantId: req.tenant.id },
      orderBy: { createdAt: 'desc' },
    })
    const itemIds = [...new Set(rows.map(r => r.itemId))]
    const items = itemIds.length > 0
      ? await app.prisma.itemMaster.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true, itemCode: true } })
      : []
    const itemMap = Object.fromEntries(items.map(i => [i.id, i]))
    return reply.send(rows.map(r => ({
      ...r,
      amount: Number(r.amount),
      item: itemMap[r.itemId] ?? null,
    })))
  })

  // Pause / resume / close a provision schedule
  app.patch('/provision-schedules/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = (req.body ?? {}) as { status?: 'ACTIVE' | 'PAUSED' | 'CLOSED' }
    if (!status || !['ACTIVE', 'PAUSED', 'CLOSED'].includes(status)) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'status must be ACTIVE | PAUSED | CLOSED' })
    }
    const r = await app.prisma.provisionSchedule.updateMany({
      where: { id, tenantId: req.tenant.id }, data: { status },
    })
    if (r.count === 0) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Schedule not found' })
    return reply.send({ ok: true })
  })

  // ── Amortization schedules ──────────────────────────────────────────
  app.get('/amortization-schedules', auth, async (req, reply) => {
    const q = req.query as { invoiceId?: string }
    const rows = await app.prisma.amortizationSchedule.findMany({
      where:   {
        tenantId: req.tenant.id,
        ...(q.invoiceId && { invoiceId: q.invoiceId }),
      },
      orderBy: { createdAt: 'desc' },
    })
    const invoiceIds = [...new Set(rows.map(r => r.invoiceId))]
    const invoices = invoiceIds.length > 0
      ? await app.prisma.invoice.findMany({
          where: { id: { in: invoiceIds }, tenantId: req.tenant.id },
          select: {
            id: true, invoiceNumber: true, invoiceRef: true,
            vendor: { select: { legalName: true, vendorCode: true } },
            lines: { take: 1, select: { description: true, item: { select: { name: true } } } },
          },
        })
      : []
    const invMap = Object.fromEntries(invoices.map(i => [i.id, i]))

    // Count posted months per schedule
    const postedCounts = await app.prisma.journalEntry.groupBy({
      by: ['amortizationScheduleId'],
      where: {
        tenantId: req.tenant.id, entryType: 'AMORTIZATION', status: 'POSTED',
        amortizationScheduleId: { in: rows.map(r => r.id) },
      },
      _count: true,
    })
    const postedMap = Object.fromEntries(postedCounts.map(p => [p.amortizationScheduleId, p._count]))

    return reply.send(rows.map(r => {
      const inv = invMap[r.invoiceId]
      const postedMonths = postedMap[r.id] ?? 0
      return {
        ...r,
        totalAmount:   Number(r.totalAmount),
        monthlyAmount: Number(r.monthlyAmount),
        postedMonths,
        progressPct:   r.totalMonths > 0 ? Math.round((postedMonths / r.totalMonths) * 100) : 0,
        invoice:       inv ?? null,
        item:          inv?.lines[0]?.item?.name ?? inv?.lines[0]?.description ?? null,
      }
    }))
  })

  // Full month-by-month timeline for one schedule — JVs already posted +
  // future months (synthetic, not in DB yet).
  app.get('/amortization-schedules/:id/timeline', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const schedule = await app.prisma.amortizationSchedule.findFirst({
      where: { id, tenantId: req.tenant.id },
    })
    if (!schedule) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Schedule not found' })

    const jvs = await app.prisma.journalEntry.findMany({
      where: { tenantId: req.tenant.id, amortizationScheduleId: id, entryType: 'AMORTIZATION' },
      orderBy: { period: 'asc' },
    })
    const jvMap = Object.fromEntries(jvs.map(j => [j.period, j]))

    // Re-compute the canonical split so we can list "expected" months even
    // before they're posted.
    const { computeAmortizationSchedule } = await import('../services/amortization-engine.service.js')
    const rows = computeAmortizationSchedule(
      Number(schedule.totalAmount),
      schedule.periodFrom, schedule.periodTo,
      (schedule.basis as 'STRAIGHT_LINE' | 'DAY_APPORTIONED'),
    )

    return reply.send({
      schedule: {
        ...schedule,
        totalAmount:   Number(schedule.totalAmount),
        monthlyAmount: Number(schedule.monthlyAmount),
      },
      timeline: rows.map(r => {
        const jv = jvMap[r.month]
        return {
          month:       r.month,
          plannedAmount: r.amount,
          daysInPeriod: r.daysInPeriod,
          jv: jv ? {
            id: jv.id, amount: Number(jv.amount),
            erpRef: jv.erpRef, erpStatus: jv.erpStatus,
            status: jv.status, postingDate: jv.postingDate,
          } : null,
        }
      }),
    })
  })

  // ── Month-end close ─────────────────────────────────────────────────
  app.post('/month-end', auth, async (req, reply) => {
    const guard = await requireAdmin(req as never, reply as never)
    if (guard) return guard
    const { period } = (req.body ?? {}) as { period?: string }
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'period must be YYYY-MM' })
    }
    const result = await runMonthEnd(app.prisma, { tenantId: req.tenant.id, userId: req.user.sub }, period, { dryRun: false })
    return reply.send(result)
  })

  app.post('/month-end/preview', auth, async (req, reply) => {
    const guard = await requireAdmin(req as never, reply as never)
    if (guard) return guard
    const { period } = (req.body ?? {}) as { period?: string }
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'period must be YYYY-MM' })
    }
    const result = await runMonthEnd(app.prisma, { tenantId: req.tenant.id, userId: req.user.sub }, period, { dryRun: true })
    return reply.send(result)
  })

  // ── Dashboard ────────────────────────────────────────────────────────
  app.get('/dashboard', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const now = new Date()
    const period = `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}`

    const [
      jvsPostedThisMonth, jvsPending, erpFailures, activeProvisionSchedules,
      activeAmortizationSchedules, provisionsThisMonth, amortizationsThisMonth,
    ] = await Promise.all([
      app.prisma.journalEntry.count({ where: { tenantId, period } }),
      app.prisma.journalEntry.count({ where: { tenantId, erpStatus: 'PENDING' } }),
      app.prisma.journalEntry.count({ where: { tenantId, erpStatus: 'FAILED' } }),
      app.prisma.provisionSchedule.count({ where: { tenantId, status: 'ACTIVE' } }),
      app.prisma.amortizationSchedule.count({ where: { tenantId, status: 'ACTIVE' } }),
      app.prisma.journalEntry.aggregate({
        where: { tenantId, entryType: 'PROVISION', period },
        _sum: { amount: true }, _count: true,
      }),
      app.prisma.journalEntry.aggregate({
        where: { tenantId, entryType: 'AMORTIZATION', period },
        _sum: { amount: true }, _count: true,
      }),
    ])

    return reply.send({
      period,
      jvsPostedThisMonth,
      jvsPending,
      erpFailures,
      activeSchedules: activeProvisionSchedules + activeAmortizationSchedules,
      activeProvisionSchedules,
      activeAmortizationSchedules,
      provisionsThisMonth: {
        count: provisionsThisMonth._count,
        amount: Number(provisionsThisMonth._sum.amount ?? 0),
      },
      amortizationsThisMonth: {
        count: amortizationsThisMonth._count,
        amount: Number(amortizationsThisMonth._sum.amount ?? 0),
      },
    })
  })
}
