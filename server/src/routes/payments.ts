// Payment module routes — queue, batch CRUD, execution, MSME refresh,
// TDS challan tracking. All tenant-scoped via JWT (`req.tenant.id`).
//
// Lifecycle: DRAFT → submit → workflow start → PENDING_APPROVAL → approve →
// APPROVED → execute → EXECUTED (or PARTIALLY_EXECUTED if any line fails).
//
// Execute writes:
//   - PaymentBatchLine.status = PAID (+ UTR/cheque ref + paidAt)
//   - Invoice.paidAmount + Invoice.paymentStatus
//   - JournalEntry rows (DR AP, CR Bank, + TDS leg per line)
//   - TdsChallan rows (per-section monthly aggregates)
//   - ERP push (stub) for each JV created

import type { FastifyInstance } from 'fastify'
import { sanitisePayload } from '../lib/payload.js'
import { startWorkflow } from '../services/workflow-engine.service.js'
import {
  validateMasterSubmittable, resolveMasterStatusAfterSubmit,
} from '../services/master-submit.service.js'
import {
  computeMsmePaymentDue, computeMsmeDaysRemaining, getMsmePriority,
  computeInterest, generateBatchRef, computeBatchTotals,
  buildPaymentJVs, type PaymentGLCodes, type PaymentLineForJv,
} from '../services/payment-engine.service.js'
import {
  groupLinesByTdsSection, upsertChallans,
} from '../services/tds-challan.service.js'
import { pushJournalEntry } from '../services/erp-push.service.js'
import { writeAuditLog } from '../lib/audit.js'

// ── Default RBI bank rate for MSME interest calc ──────────────────────────
// 6.5% as of FY2025-26 — should ideally come from tenant settings or a daily
// rate fetch, but kept inline here so the module ships without a new master.
// Tenant admins can override per-tenant by adding a TenantSettings field later.
const DEFAULT_RBI_RATE = 6.5

// ── GL code resolution for payment JVs ────────────────────────────────────
// Mirrors the AP-priority resolver in accounting-trigger.service.ts: exact
// name match → code-range → fuzzy → fallback. Returns null when nothing fits
// so the caller can decide whether to skip JV posting (e.g. for cheques).
async function resolvePaymentGlCodes(
  prisma:       FastifyInstance['prisma'],
  tenantId:     string,
  tdsSection?:  string | null,
): Promise<PaymentGLCodes> {
  // AP — same priority as accounting-trigger.
  const liabilityGls = await prisma.glCode.findMany({
    where: { tenantId, status: 'ACTIVE', accountType: 'LIABILITY' },
    select: { code: true, name: true },
    orderBy: { code: 'asc' },
  })
  const apGl =
       liabilityGls.find(g => g.name.toLowerCase() === 'accounts payable')
    ?? liabilityGls.find(g => g.code.startsWith('203'))
    ?? liabilityGls.find(g => g.name.toLowerCase().includes('accounts payable'))
    ?? liabilityGls.find(g => g.name.toLowerCase().includes('payable'))
  const apGlCode = apGl?.code ?? '2030'

  // Bank — prefer the first bank current account by name match.
  const bankGl = await prisma.glCode.findFirst({
    where: { tenantId, status: 'ACTIVE', accountType: 'ASSET', name: { contains: 'Bank' } },
    select: { code: true },
    orderBy: { code: 'asc' },
  })
  const bankGlCode = bankGl?.code ?? '1002'

  // TDS section-specific GL — code pattern 20XX based on section number.
  // e.g. 194C → 2010, 194I → 2011, 194J → 2012, 194Q → 2013 (per seed).
  let tdsPayableGlCode: string | undefined
  if (tdsSection) {
    const tdsGl = await prisma.glCode.findFirst({
      where: {
        tenantId, status: 'ACTIVE', accountType: 'LIABILITY',
        name: { contains: tdsSection },
      },
      select: { code: true },
    })
    tdsPayableGlCode = tdsGl?.code
  }

  return { apGlCode, bankGlCode, tdsPayableGlCode }
}

// ── Sequence helper for batchRef ──────────────────────────────────────────
async function nextBatchSequence(prisma: FastifyInstance['prisma'], tenantId: string, year: number): Promise<number> {
  const last = await prisma.paymentBatch.findFirst({
    where:   { tenantId, batchRef: { startsWith: `PAY-${year}-` } },
    orderBy: { createdAt: 'desc' },
    select:  { batchRef: true },
  })
  if (!last) return 1
  const tail = last.batchRef.split('-').pop() ?? '0'
  return parseInt(tail, 10) + 1
}

export async function paymentRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // ── Payment queue: approved invoices + advances pending payment ─────
  // Pulls invoices where status=APPROVED and paymentStatus IN (UNPAID,
  // PARTIALLY_PAID), enriched with MSME priority + overdue flags. Same
  // shape as VendorAdvance entries for advances (lineType='ADVANCE').
  app.get('/queue', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const q = req.query as {
      entityId?: string; type?: 'INVOICE'|'ADVANCE'|'ALL';
      priority?: 'URGENT'|'MSME'|'OVERDUE'|'ALL';
      vendorId?: string; dueBefore?: string; dueAfter?: string;
    }
    const today = new Date()

    const invoiceWhere = {
      tenantId,
      status: 'APPROVED' as const,
      paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
      ...(q.entityId && { entityId: q.entityId }),
      ...(q.vendorId && { vendorId: q.vendorId }),
      ...(q.dueBefore && { dueDate: { lte: new Date(q.dueBefore) } }),
      ...(q.dueAfter  && { dueDate: { gte: new Date(q.dueAfter)  } }),
    }
    const includeInvoices = !q.type || q.type === 'ALL' || q.type === 'INVOICE'
    const includeAdvances = !q.type || q.type === 'ALL' || q.type === 'ADVANCE'

    const [invoices, advances] = await Promise.all([
      includeInvoices
        ? app.prisma.invoice.findMany({
            where: invoiceWhere,
            include: {
              vendor: { select: { id: true, legalName: true, vendorCode: true, msmeRegistered: true, msmeCategory: true, paymentTerms: true, udyamNumber: true } },
            },
            orderBy: { dueDate: 'asc' },
          })
        : Promise.resolve([]),
      includeAdvances
        ? app.prisma.vendorAdvance.findMany({
            where: {
              tenantId,
              status: 'APPROVED',
              pendingAmount: { gt: 0 },
              ...(q.entityId && { entityId: q.entityId }),
              ...(q.vendorId && { vendorId: q.vendorId }),
            },
            orderBy: { advanceDate: 'asc' },
          })
        : Promise.resolve([]),
    ])

    // Enrich + filter by priority
    const enrichedInvoices = invoices.map(inv => {
      const netPayable    = Number(inv.netPayable)
      const paidAmount    = Number(inv.paidAmount)
      const finalPayable  = netPayable - paidAmount
      const daysRem       = inv.msmePaymentDue ? computeMsmeDaysRemaining(inv.msmePaymentDue, today) : null
      const msmePriority  = daysRem != null ? getMsmePriority(daysRem) : null
      const overdueDays   = inv.dueDate && inv.dueDate < today
        ? Math.floor((today.getTime() - inv.dueDate.getTime()) / 86_400_000)
        : 0
      return {
        type:         'INVOICE',
        id:           inv.id,
        ref:          inv.invoiceNumber,
        vendorId:     inv.vendorId,
        vendorName:   inv.vendor?.legalName ?? null,
        vendorCode:   inv.vendor?.vendorCode ?? null,
        isMsme:       !!inv.vendor?.msmeRegistered,
        msmeCategory: inv.vendor?.msmeCategory ?? null,
        msmePaymentDue:    inv.msmePaymentDue,
        msmeDaysRemaining: daysRem,
        msmePriority,
        isUrgent:     inv.isUrgent,
        urgentReason: inv.urgentReason,
        dueDate:      inv.dueDate,
        isOverdue:    overdueDays > 0,
        overdueDays,
        invoiceAmount: Number(inv.totalAmount),
        tdsAmount:     Number(inv.tdsAmount),
        netPayable,
        paidAmount,
        finalPayable,
        paymentStatus: inv.paymentStatus,
        invoiceDate:   inv.invoiceDate,
        currencyCode:  inv.currencyCode,
      }
    })

    const enrichedAdvances = advances.map(a => ({
      type:         'ADVANCE',
      id:           a.id,
      ref:          a.advanceRef,
      vendorId:     a.vendorId,
      vendorName:   null as string | null,
      vendorCode:   null as string | null,
      isMsme:       false,
      msmeCategory: null,
      msmePaymentDue:    null,
      msmeDaysRemaining: null,
      msmePriority:      null,
      isUrgent:          false,
      dueDate:           a.advanceDate,
      isOverdue:         false,
      overdueDays:       0,
      invoiceAmount:     Number(a.advanceAmount),
      tdsAmount:         Number(a.tdsAmount),
      netPayable:        Number(a.pendingAmount),
      paidAmount:        Number(a.adjustedAmount),
      finalPayable:      Number(a.pendingAmount),
      paymentStatus:     'UNPAID',
      invoiceDate:       a.advanceDate,
      currencyCode:      a.currencyCode,
    }))

    // Decorate advances with vendor names in one trip
    const advVendorIds = [...new Set(enrichedAdvances.map(a => a.vendorId))]
    if (advVendorIds.length) {
      const vendors = await app.prisma.vendor.findMany({
        where: { id: { in: advVendorIds } },
        select: { id: true, legalName: true, vendorCode: true },
      })
      const vmap = Object.fromEntries(vendors.map(v => [v.id, v]))
      for (const a of enrichedAdvances) {
        a.vendorName = vmap[a.vendorId]?.legalName ?? null
        a.vendorCode = vmap[a.vendorId]?.vendorCode ?? null
      }
    }

    let rows: Array<(typeof enrichedInvoices)[number] | (typeof enrichedAdvances)[number]> =
      [...enrichedInvoices, ...enrichedAdvances]

    if (q.priority === 'URGENT')  rows = rows.filter(r => r.isUrgent)
    if (q.priority === 'MSME')    rows = rows.filter(r => r.isMsme && r.msmePriority !== 'NORMAL')
    if (q.priority === 'OVERDUE') rows = rows.filter(r => r.isOverdue || (r.msmeDaysRemaining != null && r.msmeDaysRemaining < 0))

    return reply.send({ data: rows, total: rows.length })
  })

  // ── Queue summary — drives the tab badges ───────────────────────────
  app.get('/queue/summary', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const today = new Date()
    const sevenDaysOut = new Date(today.getTime() + 7 * 86_400_000)
    const fifteenDaysOut = new Date(today.getTime() + 15 * 86_400_000)

    const [total, urgent, msmeAtRisk, overdue, dueThisWeek, advances] = await Promise.all([
      app.prisma.invoice.count({ where: { tenantId, status: 'APPROVED', paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] } } }),
      app.prisma.invoice.count({ where: { tenantId, status: 'APPROVED', paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] }, isUrgent: true } }),
      app.prisma.invoice.count({
        where: {
          tenantId, status: 'APPROVED', paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
          msmePaymentDue: { lte: fifteenDaysOut, not: null },
          vendor: { msmeRegistered: true },
        },
      }),
      app.prisma.invoice.count({
        where: {
          tenantId, status: 'APPROVED', paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
          OR: [
            { dueDate: { lt: today } },
            { msmePaymentDue: { lt: today, not: null } },
          ],
        },
      }),
      app.prisma.invoice.count({
        where: {
          tenantId, status: 'APPROVED', paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
          dueDate: { gte: today, lte: sevenDaysOut },
        },
      }),
      app.prisma.vendorAdvance.count({ where: { tenantId, status: 'APPROVED', pendingAmount: { gt: 0 } } }),
    ])

    return reply.send({ total, urgent, msmeAtRisk, overdue, dueThisWeek, advances })
  })

  // ── Batches: list ───────────────────────────────────────────────────
  app.get('/batches', auth, async (req, reply) => {
    const q = req.query as {
      status?: string; entityId?: string; isUrgent?: string;
      containsMsme?: string; dateFrom?: string; dateTo?: string;
      take?: string; cursor?: string;
    }
    const take = Math.min(Math.max(Number(q.take ?? 25), 1), 200)

    const where = {
      tenantId: req.tenant.id,
      ...(q.status && q.status !== 'ALL' && { status: q.status }),
      ...(q.entityId && { entityId: q.entityId }),
      ...(q.isUrgent === 'true' && { isUrgent: true }),
      ...(q.containsMsme === 'true' && { containsMsme: true }),
      ...((q.dateFrom || q.dateTo) && {
        createdAt: {
          ...(q.dateFrom && { gte: new Date(q.dateFrom) }),
          ...(q.dateTo   && { lte: new Date(q.dateTo)   }),
        },
      }),
    }
    const [rows, total] = await Promise.all([
      app.prisma.paymentBatch.findMany({
        where,
        take: take + 1,
        ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { lines: true } } },
      }),
      app.prisma.paymentBatch.count({ where }),
    ])
    const hasMore = rows.length > take
    const data = hasMore ? rows.slice(0, -1) : rows
    return reply.send({
      data: data.map(b => ({
        ...b,
        totalAmount:     Number(b.totalAmount),
        totalTds:        Number(b.totalTds),
        totalNetPayable: Number(b.totalNetPayable),
        lineCount:       b._count.lines,
      })),
      total, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore,
    })
  })

  // ── Batches: get one ───────────────────────────────────────────────
  app.get('/batches/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const batch = await app.prisma.paymentBatch.findFirst({
      where: { id, tenantId: req.tenant.id },
      // PaymentBatchLine has no createdAt column; UUID `id` order is the
      // only stable sort the schema currently supports without a migration.
      include: { lines: { orderBy: { id: 'asc' } } },
    })
    if (!batch) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Batch not found' })

    // Enrich lines with vendor + invoice refs
    const vendorIds  = [...new Set(batch.lines.map(l => l.vendorId))]
    const invoiceIds = [...new Set(batch.lines.map(l => l.invoiceId).filter(Boolean) as string[])]
    const [vendors, invoices] = await Promise.all([
      vendorIds.length
        ? app.prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
            select: { id: true, legalName: true, vendorCode: true, msmeRegistered: true, msmeCategory: true, paymentTerms: true },
          })
        : Promise.resolve([] as Array<{ id: string; legalName: string; vendorCode: string; msmeRegistered: boolean; msmeCategory: string | null; paymentTerms: number }>),
      invoiceIds.length
        ? app.prisma.invoice.findMany({
            where: { id: { in: invoiceIds } },
            select: { id: true, invoiceNumber: true, invoiceDate: true, totalAmount: true, paidAmount: true, paymentStatus: true },
          })
        : Promise.resolve([] as Array<{ id: string; invoiceNumber: string; invoiceDate: Date; totalAmount: unknown; paidAmount: unknown; paymentStatus: string }>),
    ])
    const vmap = Object.fromEntries(vendors.map(v => [v.id, v]))
    const imap = Object.fromEntries(invoices.map(i => [i.id, i]))

    return reply.send({
      ...batch,
      totalAmount:     Number(batch.totalAmount),
      totalTds:        Number(batch.totalTds),
      totalNetPayable: Number(batch.totalNetPayable),
      lines: batch.lines.map(l => ({
        ...l,
        invoiceAmount:   Number(l.invoiceAmount),
        tdsAmount:       Number(l.tdsAmount),
        advanceAdjusted: Number(l.advanceAdjusted),
        paymentAmount:   Number(l.paymentAmount),
        vendor:          vmap[l.vendorId] ?? null,
        invoice:         l.invoiceId ? imap[l.invoiceId] ?? null : null,
      })),
    })
  })

  // ── Batches: create ─────────────────────────────────────────────────
  app.post('/batches', auth, async (req, reply) => {
    const body = sanitisePayload(req.body as Record<string, unknown>, {
      nullableFields: ['paymentDate', 'bankAccountId', 'narration', 'urgentReason'],
    })
    type InLine = {
      invoiceId?: string | null; advanceId?: string | null;
      paymentType: 'FULL' | 'PARTIAL'; paymentMethod: string;
      paymentAmount: number; tdsSection?: string;
    }
    const lines = (body.lines as InLine[] | undefined) ?? []
    if (lines.length === 0) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'At least one line is required' })
    }
    const entityId = body.entityId as string | undefined
    if (!entityId) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'entityId is required' })
    }

    // Resolve each line: pull invoice (if INVOICE line), validate state, derive MSME flags
    type ResolvedLine = {
      input: InLine
      lineType: 'INVOICE' | 'ADVANCE'
      invoiceId: string | null
      advanceId: string | null
      vendorId: string
      invoiceAmount: number
      tdsAmount: number
      advanceAdjusted: number
      isMsme: boolean
      msmePaymentDue: Date | null
      msmeDaysRemaining: number | null
      tdsSection: string | null
    }
    const resolved: ResolvedLine[] = []
    const today = new Date()

    for (const l of lines) {
      if (l.invoiceId) {
        const inv = await app.prisma.invoice.findFirst({
          where:   { id: l.invoiceId, tenantId: req.tenant.id },
          include: { vendor: { select: { id: true, msmeRegistered: true, paymentTerms: true } } },
        })
        if (!inv) return reply.code(422).send({ code: 'INVOICE_NOT_FOUND', message: `Invoice ${l.invoiceId} not found` })
        if (inv.status !== 'APPROVED') {
          return reply.code(422).send({ code: 'INVOICE_NOT_APPROVED', message: `Invoice ${inv.invoiceNumber} is ${inv.status}, not APPROVED` })
        }
        if (inv.paymentStatus === 'PAID') {
          return reply.code(422).send({ code: 'INVOICE_ALREADY_PAID', message: `Invoice ${inv.invoiceNumber} is already paid` })
        }
        const isMsme = !!inv.vendor?.msmeRegistered
        const due    = isMsme && inv.vendor ? computeMsmePaymentDue(inv.invoiceDate, inv.vendor.paymentTerms) : null
        const daysRem = due ? computeMsmeDaysRemaining(due, today) : null
        const firstLineTdsSection = await app.prisma.invoiceLine.findFirst({
          where: { invoiceId: inv.id, NOT: { tdsRate: null } },
          select: { tdsRate: true },
        })
        // Derive tdsSection from the line's TDS rate via TdsSection master (best-effort)
        let tdsSection: string | null = l.tdsSection ?? null
        if (!tdsSection && firstLineTdsSection?.tdsRate) {
          const sec = await app.prisma.tDSSection.findFirst({
            where: { tenantId: req.tenant.id, defaultRate: firstLineTdsSection.tdsRate },
            select: { section: true },
          })
          tdsSection = sec?.section ?? null
        }
        resolved.push({
          input: l,
          lineType: 'INVOICE',
          invoiceId: inv.id,
          advanceId: null,
          vendorId: inv.vendorId!,
          invoiceAmount: Number(inv.totalAmount),
          tdsAmount: Number(inv.tdsAmount),
          advanceAdjusted: 0,
          isMsme,
          msmePaymentDue: due,
          msmeDaysRemaining: daysRem,
          tdsSection,
        })
      } else if (l.advanceId) {
        const adv = await app.prisma.vendorAdvance.findFirst({
          where: { id: l.advanceId, tenantId: req.tenant.id },
        })
        if (!adv) return reply.code(422).send({ code: 'ADVANCE_NOT_FOUND', message: `Advance ${l.advanceId} not found` })
        if (adv.status !== 'APPROVED') {
          return reply.code(422).send({ code: 'ADVANCE_NOT_APPROVED', message: `Advance ${adv.advanceRef} is ${adv.status}, not APPROVED` })
        }
        resolved.push({
          input: l,
          lineType: 'ADVANCE',
          invoiceId: null,
          advanceId: adv.id,
          vendorId: adv.vendorId,
          invoiceAmount: Number(adv.advanceAmount),
          tdsAmount: Number(adv.tdsAmount),
          advanceAdjusted: 0,
          isMsme: false,
          msmePaymentDue: null,
          msmeDaysRemaining: null,
          tdsSection: null,
        })
      } else {
        return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Each line needs invoiceId or advanceId' })
      }
    }

    const totals = computeBatchTotals(resolved.map(r => ({
      invoiceAmount:   r.invoiceAmount,
      tdsAmount:       r.tdsAmount,
      advanceAdjusted: r.advanceAdjusted,
      paymentAmount:   r.input.paymentAmount,
    })))
    const msmeCount  = resolved.filter(r => r.isMsme).length
    const seq        = await nextBatchSequence(app.prisma, req.tenant.id, today.getUTCFullYear())
    const batchRef   = generateBatchRef(seq, today.getUTCFullYear())

    const batch = await app.prisma.$transaction(async tx => {
      const b = await tx.paymentBatch.create({
        data: {
          tenantId:        req.tenant.id,
          batchRef,
          status:          'DRAFT',
          isUrgent:        !!body.isUrgent,
          urgentReason:    (body.urgentReason as string | null) ?? null,
          urgentFlaggedBy: body.isUrgent ? req.user.sub : null,
          containsMsme:    msmeCount > 0,
          msmeVendorCount: msmeCount,
          totalAmount:     totals.totalInvoice,
          totalTds:        totals.totalTds,
          totalNetPayable: totals.totalNetPayable,
          paymentDate:     body.paymentDate ? new Date(body.paymentDate as string) : null,
          entityId:        entityId,
          bankAccountId:   (body.bankAccountId as string | null) ?? null,
          narration:       (body.narration as string | null) ?? null,
          createdBy:       req.user.sub,
        },
      })
      await tx.paymentBatchLine.createMany({
        data: resolved.map(r => ({
          tenantId:          req.tenant.id,
          batchId:           b.id,
          lineType:          r.lineType,
          invoiceId:         r.invoiceId,
          advanceId:         r.advanceId,
          vendorId:          r.vendorId,
          isMsme:            r.isMsme,
          msmePaymentDue:    r.msmePaymentDue,
          msmeDaysRemaining: r.msmeDaysRemaining,
          invoiceAmount:     r.invoiceAmount,
          tdsAmount:         r.tdsAmount,
          advanceAdjusted:   r.advanceAdjusted,
          paymentAmount:     r.input.paymentAmount,
          paymentType:       r.input.paymentType,
          paymentMethod:     r.input.paymentMethod,
          tdsSection:        r.tdsSection,
          status:            'PENDING',
        })),
      })
      return b
    })

    await writeAuditLog(app.prisma, {
      tenantId: req.tenant.id, userId: req.user.sub,
      action: 'payment_batch.created',
      entityType: 'payment_batch', entityId: batch.id,
      after: { batchRef: batch.batchRef, lineCount: resolved.length, totalNetPayable: totals.totalNetPayable },
      ipAddress: req.ip,
    })

    return reply.code(201).send({ id: batch.id, batchRef: batch.batchRef })
  })

  // ── Batches: submit for approval ────────────────────────────────────
  app.post('/batches/:id/submit', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const batch = await app.prisma.paymentBatch.findFirst({
      where: { id, tenantId: req.tenant.id }, select: { id: true, status: true, isUrgent: true },
    })
    if (!batch) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Batch not found' })
    const guard = validateMasterSubmittable('payment batch', batch.status)
    if (!guard.ok) return reply.code(422).send({ code: 'WORKFLOW_INVALID_STATE', message: guard.message })

    // record carries isUrgent so the urgent-workflow condition matches.
    const wf = await startWorkflow(
      app.prisma, 'PAYMENT', 'payment_batch', id, { isUrgent: batch.isUrgent },
      { tenantId: req.tenant.id, userId: req.user.sub, userName: (req.user as { name?: string }).name ?? req.user.sub },
    )
    if (!wf.ok && wf.error.message !== 'NO_WORKFLOW_DEFINED') {
      return reply.code(wf.error.httpStatus ?? 400).send(wf.error)
    }
    const newStatus = resolveMasterStatusAfterSubmit({
      ok: wf.ok, autoApproved: wf.ok ? wf.data.autoApproved : false, noWorkflowDefined: !wf.ok,
    })
    // master-submit returns ACTIVE for auto-approve; payment batches use APPROVED.
    const batchStatus = newStatus === 'ACTIVE' ? 'APPROVED' : newStatus
    await app.prisma.paymentBatch.update({
      where: { id }, data: { status: batchStatus, workflowInstanceId: wf.ok ? wf.data.instanceId : null },
    })
    return reply.send({ ok: true, status: batchStatus, workflowInstanceId: wf.ok ? wf.data.instanceId : null })
  })

  // ── Batches: execute (cash out) ─────────────────────────────────────
  // Body shape: { lines: [{ lineId, utrNumber?, chequeNumber?, chequeDate? }] }
  // Idempotent on line.id: lines already PAID are skipped silently. Lines
  // that fail (failureReason set in body) flip to FAILED + drag the batch
  // to PARTIALLY_EXECUTED.
  app.post('/batches/:id/execute', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    type ExecLine = { lineId: string; utrNumber?: string; chequeNumber?: string; chequeDate?: string; failureReason?: string }
    const body = req.body as { lines?: ExecLine[]; postingDate?: string }
    const execLines = body.lines ?? []
    if (execLines.length === 0) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'lines is required' })
    }
    const batch = await app.prisma.paymentBatch.findFirst({
      where: { id, tenantId: req.tenant.id }, include: { lines: true },
    })
    if (!batch) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Batch not found' })
    if (batch.status !== 'APPROVED') {
      return reply.code(422).send({ code: 'BATCH_NOT_APPROVED', message: `Batch is ${batch.status}, must be APPROVED to execute` })
    }
    const postingDate = body.postingDate ? new Date(body.postingDate) : new Date()
    const lineMap = new Map(batch.lines.map(l => [l.id, l]))

    let paid    = 0
    let failed  = 0
    const jvIds: string[] = []

    for (const e of execLines) {
      const line = lineMap.get(e.lineId)
      if (!line) continue
      if (line.status === 'PAID') continue  // idempotent

      if (e.failureReason) {
        await app.prisma.paymentBatchLine.update({
          where: { id: line.id },
          data: { status: 'FAILED', failureReason: e.failureReason },
        })
        failed++
        continue
      }

      // Mark PAID + capture rail refs
      await app.prisma.paymentBatchLine.update({
        where: { id: line.id },
        data: {
          status:       'PAID',
          utrNumber:    e.utrNumber ?? null,
          chequeNumber: e.chequeNumber ?? null,
          chequeDate:   e.chequeDate ? new Date(e.chequeDate) : null,
          paidAt:       postingDate,
        },
      })

      // Update invoice payment status / paidAmount (advance lines handled separately below)
      if (line.invoiceId) {
        const inv = await app.prisma.invoice.findFirst({
          where: { id: line.invoiceId, tenantId: req.tenant.id },
          select: { id: true, netPayable: true, paidAmount: true },
        })
        if (inv) {
          const newPaid    = Number(inv.paidAmount) + Number(line.paymentAmount)
          const netPayable = Number(inv.netPayable)
          const newStatus  = newPaid >= netPayable ? 'PAID'
                           : newPaid > 0          ? 'PARTIALLY_PAID'
                           : 'UNPAID'
          await app.prisma.invoice.update({
            where: { id: inv.id },
            data: {
              paidAmount:    newPaid,
              paymentStatus: newStatus,
              ...(newStatus === 'PAID' && { paidAt: postingDate, status: 'PAID' }),
            },
          })
        }
      } else if (line.advanceId) {
        // Mark advance as disbursed — pendingAmount goes to zero, paidAt set
        await app.prisma.vendorAdvance.update({
          where: { id: line.advanceId },
          data: { pendingAmount: 0, paidAt: postingDate, status: 'PAID' },
        })
      }

      // ── JV posting ──
      const gls = await resolvePaymentGlCodes(app.prisma, req.tenant.id, line.tdsSection)
      const invoiceRef = line.invoiceId
        ? (await app.prisma.invoice.findFirst({ where: { id: line.invoiceId }, select: { invoiceNumber: true } }))?.invoiceNumber
        : undefined
      const jvData = buildPaymentJVs(
        {
          id: line.id, tenantId: req.tenant.id, batchId: line.batchId,
          invoiceId: line.invoiceId, vendorId: line.vendorId,
          paymentAmount: Number(line.paymentAmount),
          tdsAmount:     Number(line.tdsAmount),
          paymentMethod: line.paymentMethod,
        } satisfies PaymentLineForJv,
        gls, req.user.sub, { postingDate, invoiceRef: invoiceRef ?? undefined },
      )
      for (const data of jvData) {
        const created = await app.prisma.journalEntry.create({ data })
        jvIds.push(created.id)
        // Stub ERP push — fire-and-forget; failures land on the ERP sync log
        try { await pushJournalEntry(app.prisma, created) } catch (err) {
          app.log.error({ err, jvId: created.id }, '[Payment] ERP push failed')
        }
      }
      paid++
    }

    // ── TDS challan upsert — group by section + monthly period ──
    const period = `${postingDate.getUTCFullYear()}-${(postingDate.getUTCMonth() + 1).toString().padStart(2, '0')}`
    const tdsLines = batch.lines
      .filter(l => l.tdsSection && Number(l.tdsAmount) > 0 && l.status !== 'FAILED')
      .map(l => ({ tdsSection: l.tdsSection, tdsAmount: Number(l.tdsAmount) }))
    const challanGroups = groupLinesByTdsSection(tdsLines)
    if (challanGroups.length) {
      await upsertChallans(app.prisma, req.tenant.id, period, challanGroups)
    }

    // Final batch status
    const newBatchStatus = failed === 0 ? 'EXECUTED'
                         : paid === 0   ? 'FAILED'
                         : 'PARTIALLY_EXECUTED'
    await app.prisma.paymentBatch.update({
      where: { id }, data: { status: newBatchStatus, executedAt: postingDate },
    })

    await writeAuditLog(app.prisma, {
      tenantId: req.tenant.id, userId: req.user.sub,
      action: 'payment_batch.executed',
      entityType: 'payment_batch', entityId: id,
      after: { status: newBatchStatus, paid, failed, jvCount: jvIds.length, challanGroups: challanGroups.length },
      ipAddress: req.ip,
    })

    return reply.send({ ok: true, status: newBatchStatus, paid, failed, jvIds, challansUpserted: challanGroups.length })
  })

  // ── Batches: flag urgent ────────────────────────────────────────────
  app.post('/batches/:id/flag-urgent', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { reason } = (req.body ?? {}) as { reason?: string }
    if (!reason) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'reason is required' })
    const updated = await app.prisma.paymentBatch.updateMany({
      where: { id, tenantId: req.tenant.id },
      data: { isUrgent: true, urgentReason: reason, urgentFlaggedBy: req.user.sub },
    })
    if (updated.count === 0) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Batch not found' })
    return reply.send({ ok: true })
  })

  // ── TDS challans: list ──────────────────────────────────────────────
  app.get('/tds-challans', auth, async (req, reply) => {
    const q = req.query as { period?: string; status?: string; tdsSection?: string }
    const today = new Date()
    const rows = await app.prisma.tdsChallan.findMany({
      where: {
        tenantId: req.tenant.id,
        ...(q.period     && { period: q.period }),
        ...(q.status     && { status: q.status }),
        ...(q.tdsSection && { tdsSection: q.tdsSection }),
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    })
    return reply.send(rows.map(r => ({
      ...r,
      amount:        Number(r.amount),
      daysToDue:     Math.floor((r.dueDate.getTime() - today.getTime()) / 86_400_000),
      // Re-derive status: PENDING + past due date = OVERDUE (not stored to
      // keep the row immutable until deposited).
      effectiveStatus: r.status === 'PENDING' && r.dueDate < today ? 'OVERDUE' : r.status,
    })))
  })

  app.patch('/tds-challans/:id/mark-deposited', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { challanNumber, depositedAt } = (req.body ?? {}) as { challanNumber?: string; depositedAt?: string }
    if (!challanNumber) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'challanNumber is required' })
    const updated = await app.prisma.tdsChallan.updateMany({
      where: { id, tenantId: req.tenant.id, status: 'PENDING' },
      data: { status: 'DEPOSITED', challanNumber, depositedAt: depositedAt ? new Date(depositedAt) : new Date(), depositedBy: req.user.sub },
    })
    if (updated.count === 0) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Challan not found or already deposited' })
    return reply.send({ ok: true })
  })

  // ── MSME refresh: recompute msmeDaysRemaining + breach + interest ──
  app.post('/msme-refresh', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const today = new Date()
    const invoices = await app.prisma.invoice.findMany({
      where: {
        tenantId, status: 'APPROVED', paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        vendor: { msmeRegistered: true },
      },
      include: { vendor: { select: { paymentTerms: true } } },
    })
    let updated = 0
    let breached = 0
    for (const inv of invoices) {
      const due  = inv.msmePaymentDue ?? (inv.vendor ? computeMsmePaymentDue(inv.invoiceDate, inv.vendor.paymentTerms) : null)
      if (!due) continue
      const days = computeMsmeDaysRemaining(due, today)
      const isBreach = days < 0
      const daysLate = isBreach ? -days : 0
      const interest = isBreach
        ? computeInterest(Number(inv.netPayable) - Number(inv.paidAmount), daysLate, DEFAULT_RBI_RATE)
        : null
      await app.prisma.invoice.update({
        where: { id: inv.id },
        data: {
          msmePaymentDue:    due,
          msmeDaysRemaining: days,
          msmeBreach:        isBreach,
          msmeInterest:      interest,
        },
      })
      updated++
      if (isBreach) breached++
    }
    return reply.send({ updated, breached })
  })
}
