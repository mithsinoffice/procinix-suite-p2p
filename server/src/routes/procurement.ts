import type { FastifyInstance } from 'fastify'
import { startWorkflow } from '../services/workflow-engine.service.js'
import {
  validatePrEditable, diffPrFields, calcEstimatedTotal, EDITABLE_FIELDS,
} from '../services/pr-edit.service.js'

export async function procurementRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // ── AUTO-REF GENERATOR ──
  async function nextRef(prefix: string, model: any, field: string, tenantId: string) {
    const last = await model.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' }, select: { [field]: true } })
    const num  = last ? parseInt(last[field].replace(`${prefix}-`, '')) + 1 : 1
    return `${prefix}-${String(num).padStart(4, '0')}`
  }

  // ── BUDGET CHECK ──
  async function checkBudget(tenantId: string, entityId: string, glCodeId: string | null, costCentreId: string | null, amount: number) {
    if (!glCodeId) return { status: 'NO_BUDGET', available: null }
    const budget = await app.prisma.budget.findFirst({
      where: { tenantId, entityId, glCodeId, status: 'ACTIVE', ...(costCentreId && { costCentreId }) },
    })
    if (!budget) return { status: 'NO_BUDGET', available: null }
    const available = Number(budget.revisedAmount) - Number(budget.committedAmount) - Number(budget.actualAmount)
    const tolerance = available * (Number(budget.toleranceZonePct) / 100)
    if (amount <= available)             return { status: 'OK',         available, budgetId: budget.id }
    if (amount <= available + tolerance) return { status: 'WARNING',    available, budgetId: budget.id }
    if (budget.hardBlock)                return { status: 'HARD_BLOCK', available, budgetId: budget.id }
    return { status: 'SOFT_BLOCK', available, budgetId: budget.id }
  }

  // ── GST TYPE RESOLVER ──
  async function resolveGSTType(tenantId: string, vendorId: string, entityId: string) {
    const vendor = await app.prisma.vendor.findFirst({ where: { id: vendorId }, select: { gstin: true } })
    const entity = await app.prisma.entity.findFirst({ where: { id: entityId }, select: { gstin: true } })
    if (!vendor?.gstin || !entity?.gstin) return 'IGST'
    const vendorState = vendor.gstin.substring(0, 2)
    const entityState = entity.gstin.substring(0, 2)
    return vendorState === entityState ? 'INTRASTATE' : 'INTERSTATE'
  }

  // ════════════════════════════════
  // PURCHASE REQUISITION
  // ════════════════════════════════

  app.get('/pr', auth, async (req, reply) => {
    const { status, search } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.status = status
    if (search) where.OR = [{ prRef: { contains: search } }]
    return reply.send(await app.prisma.purchaseRequisition.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 50,
      include: { lines: true },
    }))
  })

  app.get('/pr/:id', auth, async (req, reply) => {
    const pr = await app.prisma.purchaseRequisition.findFirst({
      where:   { id: (req.params as any).id, tenantId: req.tenant.id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!pr) return reply.code(404).send({ message: 'PR not found' })
    return reply.send(pr)
  })

  app.post('/pr', auth, async (req, reply) => {
    const { lines = [], ...data } = req.body as any
    const prRef = await nextRef('PR', app.prisma.purchaseRequisition, 'prRef', req.tenant.id)
    const estimatedTotal = lines.reduce((s: number, l: any) => s + Number(l.qty) * Number(l.estimatedPrice), 0)
    const budgetCheck = await checkBudget(req.tenant.id, data.entityId, data.glCodeId ?? null, data.costCentreId ?? null, estimatedTotal)
    if (budgetCheck.status === 'HARD_BLOCK') {
      return reply.code(422).send({ code: 'BUDGET_HARD_BLOCK', message: `Budget exceeded. Available: ₹${budgetCheck.available?.toFixed(2)}. Approval required.`, available: budgetCheck.available })
    }
    const pr = await app.prisma.$transaction(async tx => {
      const p = await tx.purchaseRequisition.create({
        data: { ...data, prRef, tenantId: req.tenant.id, estimatedTotal, budgetStatus: budgetCheck.status, budgetId: budgetCheck.budgetId ?? undefined, createdByUserId: req.user.sub, status: 'DRAFT' },
      })
      if (lines.length) await tx.purchaseRequisitionLine.createMany({ data: lines.map((l: any, i: number) => ({ ...l, prId: p.id, lineNo: i + 1 })) })
      return p
    })
    return reply.code(201).send(pr)
  })

  app.put('/pr/:id', auth, async (req, reply) => {
    const prId  = (req.params as any).id
    const body  = req.body as Record<string, unknown>

    // Tenant-scoped read — never trust the request body for tenant.
    const existing = await app.prisma.purchaseRequisition.findFirst({
      where: { id: prId, tenantId: req.tenant.id },
    })
    if (!existing) return reply.code(404).send({ code: 'NOT_FOUND', message: 'PR not found' })

    const guard = validatePrEditable(existing)
    if (!guard.ok) {
      return reply.code(422).send({
        code: 'WORKFLOW_INVALID_STATE',
        message: `Cannot edit a PR in ${guard.status} status — only DRAFT PRs are editable`,
      })
    }

    // Filter the payload down to the explicitly editable fields. Anything else
    // (prRef, requesterId, entityId, createdAt, status …) is silently dropped.
    const editable: Record<string, unknown> = {}
    for (const f of EDITABLE_FIELDS) {
      if (f === 'lines' || f === 'estimatedTotal') continue   // handled below
      if (f in body) editable[f] = body[f]
    }
    const incomingLines = Array.isArray(body.lines) ? body.lines as any[] : null

    // Compute the changed-fields list for the audit log BEFORE we mutate.
    const changedFields = diffPrFields(existing, { ...editable, ...(incomingLines ? { lines: incomingLines } : {}) })

    const pr = await app.prisma.$transaction(async tx => {
      const data: Record<string, unknown> = { ...editable }
      if (incomingLines) {
        data.estimatedTotal = calcEstimatedTotal(incomingLines)
      }
      const p = await tx.purchaseRequisition.update({ where: { id: prId }, data })
      if (incomingLines) {
        await tx.purchaseRequisitionLine.deleteMany({ where: { prId: p.id } })
        if (incomingLines.length) {
          await tx.purchaseRequisitionLine.createMany({
            data: incomingLines.map((l: any, i: number) => ({ ...l, prId: p.id, lineNo: i + 1 })),
          })
        }
      }
      return p
    })

    // Audit log — append-only, never failing the request on log errors.
    try {
      await app.prisma.auditLog.create({
        data: {
          tenantId:   req.tenant.id,
          userId:     req.user.sub,
          action:     'pr.edited',
          entityType: 'purchase_requisition',
          entityId:   pr.id,
          after:      { changedFields, userName: (req.user as any).name ?? null },
        },
      })
    } catch (err) {
      app.log.warn({ err, prId }, 'audit log write failed for pr.edited')
    }

    return reply.send(pr)
  })

  app.post('/pr/:id/submit', auth, async (req, reply) => {
    const pr = await app.prisma.purchaseRequisition.findFirst({ where: { id: (req.params as any).id, tenantId: req.tenant.id } })
    if (!pr) return reply.code(404).send({ message: 'PR not found' })
    if (!['DRAFT', 'REJECTED'].includes(pr.status)) {
      return reply.code(400).send({ code: 'WORKFLOW_INVALID_STATE', message: `Cannot submit PR in ${pr.status} status` })
    }
    const record = { totalAmount: Number(pr.estimatedTotal), entityId: pr.entityId, departmentId: pr.departmentId ?? undefined, createdByUserId: pr.createdByUserId ?? undefined }
    const wf = await startWorkflow(app.prisma, 'PR', 'purchase_requisition', pr.id, record, { tenantId: req.tenant.id, userId: req.user.sub, userName: (req.user as any).name ?? req.user.sub })
    let wfInstanceId: string | null = null
    let newStatus = 'SUBMITTED'
    if (wf.ok) {
      wfInstanceId = wf.data.instanceId
      newStatus    = wf.data.autoApproved ? 'APPROVED' : 'PENDING_L1'
    } else if (wf.error.message !== 'NO_WORKFLOW_DEFINED') {
      return reply.code(wf.error.httpStatus ?? 400).send(wf.error)
    }
    const updated = await app.prisma.purchaseRequisition.update({
      where: { id: pr.id },
      data:  { status: newStatus, workflowInstanceId: wfInstanceId ?? undefined },
    })
    return reply.send(updated)
  })

  app.post('/pr/:id/approve', auth, async (req, reply) => {
    const updated = await app.prisma.purchaseRequisition.update({ where: { id: (req.params as any).id }, data: { status: 'APPROVED' } })
    return reply.send(updated)
  })

  app.post('/pr/:id/reject', auth, async (req, reply) => {
    const { reason } = req.body as any
    const updated = await app.prisma.purchaseRequisition.update({ where: { id: (req.params as any).id }, data: { status: 'REJECTED', rejectionReason: reason } })
    return reply.send(updated)
  })

  // ════════════════════════════════
  // PURCHASE ORDER
  // ════════════════════════════════

  // Budget check + GST type endpoints registered first to avoid matching :id param
  app.post('/po/budget-check', auth, async (req, reply) => {
    const { entityId, glCodeId, costCentreId, amount } = req.body as any
    const result = await checkBudget(req.tenant.id, entityId, glCodeId, costCentreId, amount)
    return reply.send(result)
  })

  app.get('/po/gst-type', auth, async (req, reply) => {
    const { vendorId, entityId } = req.query as any
    const gstType = await resolveGSTType(req.tenant.id, vendorId, entityId)
    return reply.send({ gstType })
  })

  app.get('/po', auth, async (req, reply) => {
    const { status, vendorId, entityId, search, hasOpenValue } = req.query as {
      status?: string; vendorId?: string; entityId?: string; search?: string; hasOpenValue?: string
    }
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.status = status
    if (vendorId) where.vendorId = vendorId
    if (entityId) where.entityId = entityId
    if (search) where.OR = [{ poRef: { contains: search } }]

    const pos = await app.prisma.purchaseOrder.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 50,
      include: {
        lines:      true,
        milestones: true,
        _count:     { select: { grns: true } },
      },
    })

    // Augment + optional filter through pure helpers (covered by unit tests).
    const { augmentPOWithOpenValue, filterByOpenValue } = await import('../services/po-consumption.service.js')
    const augmented = filterByOpenValue(pos.map(augmentPOWithOpenValue), hasOpenValue === 'true')
    return reply.send(augmented)
  })

  app.get('/po/:id', auth, async (req, reply) => {
    const po = await app.prisma.purchaseOrder.findFirst({
      where:   { id: (req.params as any).id, tenantId: req.tenant.id },
      include: { lines: { orderBy: { lineNo: 'asc' } }, milestones: true, grns: true },
    })
    if (!po) return reply.code(404).send({ message: 'PO not found' })
    return reply.send(po)
  })

  app.post('/po', auth, async (req, reply) => {
    const { lines = [], milestones = [], prRefs = [], ...data } = req.body as any
    const poRef = await nextRef('PO', app.prisma.purchaseOrder, 'poRef', req.tenant.id)
    const gstType = await resolveGSTType(req.tenant.id, data.vendorId, data.entityId)
    const totalAmount = lines.reduce((s: number, l: any) => s + Number(l.lineTotal ?? 0), 0)
    const budgetCheck = await checkBudget(req.tenant.id, data.entityId, data.glCodeId ?? null, data.costCentreId ?? null, totalAmount)
    if (budgetCheck.status === 'HARD_BLOCK') return reply.code(422).send({ code: 'BUDGET_HARD_BLOCK', message: `Budget exceeded. Available: ₹${budgetCheck.available?.toFixed(2)}` })
    const po = await app.prisma.$transaction(async tx => {
      const p = await tx.purchaseOrder.create({
        data: { ...data, poRef, tenantId: req.tenant.id, prRefs, totalAmount, budgetId: budgetCheck.budgetId ?? undefined, createdByUserId: req.user.sub, status: 'DRAFT' },
      })
      if (lines.length) await tx.purchaseOrderLine.createMany({
        data: lines.map((l: any, i: number) => ({
          ...l, poId: p.id, lineNo: i + 1,
          pendingQty: l.qty,
          cgstAmount: gstType === 'INTRASTATE' ? (Number(l.taxableAmount ?? 0) * Number(l.gstRate ?? 0)) / 200 : 0,
          sgstAmount: gstType === 'INTRASTATE' ? (Number(l.taxableAmount ?? 0) * Number(l.gstRate ?? 0)) / 200 : 0,
          igstAmount: gstType === 'INTERSTATE'  ? (Number(l.taxableAmount ?? 0) * Number(l.gstRate ?? 0)) / 100 : 0,
        })),
      })
      if (milestones.length) await tx.pOPaymentMilestone.createMany({ data: milestones.map((m: any, i: number) => ({ ...m, poId: p.id, milestoneNo: i + 1 })) })
      if (budgetCheck.budgetId) await tx.budget.update({ where: { id: budgetCheck.budgetId }, data: { committedAmount: { increment: totalAmount } } })
      return p
    })
    return reply.code(201).send(po)
  })

  app.put('/po/:id', auth, async (req, reply) => {
    const { lines, milestones, ...data } = req.body as any
    const po = await app.prisma.$transaction(async tx => {
      const p = await tx.purchaseOrder.update({ where: { id: (req.params as any).id }, data })
      if (lines) {
        await tx.purchaseOrderLine.deleteMany({ where: { poId: p.id } })
        if (lines.length) await tx.purchaseOrderLine.createMany({ data: lines.map((l: any, i: number) => ({ ...l, poId: p.id, lineNo: i + 1, pendingQty: l.qty })) })
      }
      if (milestones) {
        await tx.pOPaymentMilestone.deleteMany({ where: { poId: p.id } })
        if (milestones.length) await tx.pOPaymentMilestone.createMany({ data: milestones.map((m: any, i: number) => ({ ...m, poId: p.id, milestoneNo: i + 1 })) })
      }
      return p
    })
    return reply.send(po)
  })

  app.post('/po/:id/submit', auth, async (req, reply) => {
    const po = await app.prisma.purchaseOrder.findFirst({ where: { id: (req.params as any).id, tenantId: req.tenant.id } })
    if (!po) return reply.code(404).send({ message: 'PO not found' })
    if (!['DRAFT', 'REJECTED'].includes(po.status)) {
      return reply.code(400).send({ code: 'WORKFLOW_INVALID_STATE', message: `Cannot submit PO in ${po.status} status` })
    }
    const record = { totalAmount: Number(po.totalAmount), entityId: po.entityId, vendorId: po.vendorId, createdByUserId: po.createdByUserId ?? undefined }
    const wf = await startWorkflow(app.prisma, 'PO', 'purchase_order', po.id, record, { tenantId: req.tenant.id, userId: req.user.sub, userName: (req.user as any).name ?? req.user.sub })
    let wfInstanceId: string | null = null
    let newStatus = 'SUBMITTED'
    if (wf.ok) {
      wfInstanceId = wf.data.instanceId
      newStatus    = wf.data.autoApproved ? 'APPROVED' : 'PENDING_L1'
    } else if (wf.error.message !== 'NO_WORKFLOW_DEFINED') {
      return reply.code(wf.error.httpStatus ?? 400).send(wf.error)
    }
    const updated = await app.prisma.purchaseOrder.update({
      where: { id: po.id },
      data:  { status: newStatus, workflowInstanceId: wfInstanceId ?? undefined },
    })
    return reply.send(updated)
  })

  app.post('/po/:id/approve', auth, async (req, reply) => {
    const updated = await app.prisma.purchaseOrder.update({ where: { id: (req.params as any).id }, data: { status: 'APPROVED' } })
    return reply.send(updated)
  })

  app.post('/po/:id/reject', auth, async (req, reply) => {
    const { reason } = req.body as any
    const po = await app.prisma.purchaseOrder.update({ where: { id: (req.params as any).id }, data: { status: 'REJECTED', rejectionReason: reason } })
    if (po.budgetId) await app.prisma.budget.update({ where: { id: po.budgetId }, data: { committedAmount: { decrement: Number(po.totalAmount) } } })
    return reply.send(po)
  })

  // ════════════════════════════════
  // GRN
  // ════════════════════════════════

  app.get('/grn', auth, async (req, reply) => {
    const { status, poId } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.status = status
    if (poId) where.poId = poId
    return reply.send(await app.prisma.goodsReceiptNote.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 50,
      include: { lines: true, po: { select: { poRef: true } } },
    }))
  })

  app.get('/grn/:id', auth, async (req, reply) => {
    const grn = await app.prisma.goodsReceiptNote.findFirst({
      where:   { id: (req.params as any).id, tenantId: req.tenant.id },
      include: { lines: { orderBy: { id: 'asc' }, include: { poLine: true } }, po: true },
    })
    if (!grn) return reply.code(404).send({ message: 'GRN not found' })
    return reply.send(grn)
  })

  app.post('/grn', auth, async (req, reply) => {
    const { lines = [], ...data } = req.body as any
    const grnRef = await nextRef('GRN', app.prisma.goodsReceiptNote, 'grnRef', req.tenant.id)
    const grn = await app.prisma.$transaction(async tx => {
      const g = await tx.goodsReceiptNote.create({
        data: { ...data, grnRef, tenantId: req.tenant.id, createdByUserId: req.user.sub, status: 'DRAFT' },
      })
      if (lines.length) await tx.goodsReceiptLine.createMany({ data: lines.map((l: any) => ({ ...l, grnId: g.id })) })
      return g
    })
    return reply.code(201).send(grn)
  })

  app.post('/grn/:id/approve', auth, async (req, reply) => {
    const grn = await app.prisma.goodsReceiptNote.findFirst({
      where: { id: (req.params as any).id, tenantId: req.tenant.id },
      include: { lines: { include: { poLine: true } } },
    })
    if (!grn) return reply.code(404).send({ message: 'GRN not found' })
    await app.prisma.$transaction(async tx => {
      await tx.goodsReceiptNote.update({ where: { id: grn.id }, data: { status: 'APPROVED' } })
      for (const line of grn.lines) {
        await tx.purchaseOrderLine.update({
          where: { id: line.poLineId },
          data:  { grnQty: { increment: Number(line.acceptedQty) }, pendingQty: { decrement: Number(line.acceptedQty) } },
        })
        if (line.poLine) {
          const item = line.itemId ? await tx.itemMaster.findFirst({ where: { id: line.itemId } }) : null
          if (item?.expenseType === 'CAPEX' && item.autoCreateAsset) {
            console.log(`[GRN] Auto-create asset for item ${item.itemCode} qty ${line.acceptedQty}`)
          }
        }
      }
      const po = await tx.purchaseOrder.findFirst({ where: { id: grn.poId }, include: { lines: true } })
      const allReceived = po?.lines.every(l => Number(l.pendingQty) <= 0)
      await tx.purchaseOrder.update({ where: { id: grn.poId }, data: { status: allReceived ? 'FULL_GRN' : 'PARTIAL_GRN' } })
    })
    return reply.send({ ok: true })
  })

  // ════════════════════════════════
  // SRN
  // ════════════════════════════════

  app.get('/srn', auth, async (req, reply) => {
    const where: any = { tenantId: req.tenant.id }
    return reply.send(await app.prisma.supplierReturnNote.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 }))
  })

  app.post('/srn', auth, async (req, reply) => {
    const { lines = [], ...data } = req.body as any
    const srnRef = await nextRef('SRN', app.prisma.supplierReturnNote, 'srnRef', req.tenant.id)
    const srn = await app.prisma.$transaction(async tx => {
      const s = await tx.supplierReturnNote.create({
        data: { ...data, srnRef, tenantId: req.tenant.id, createdByUserId: req.user.sub, status: 'DRAFT' },
      })
      if (lines.length) await tx.supplierReturnLine.createMany({ data: lines.map((l: any) => ({ ...l, srnId: s.id })) })
      for (const line of lines) {
        await tx.goodsReceiptLine.update({ where: { id: line.grnLineId }, data: { acceptedQty: { decrement: Number(line.returnQty) } } })
      }
      return s
    })
    return reply.code(201).send(srn)
  })

  // ════════════════════════════════
  // VENDOR ADVANCE
  // ════════════════════════════════

  app.get('/advances/open/:vendorId', auth, async (req, reply) => {
    const advances = await app.prisma.vendorAdvance.findMany({
      where: { tenantId: req.tenant.id, vendorId: (req.params as any).vendorId, status: { in: ['PAID', 'PARTIALLY_ADJUSTED'] }, pendingAmount: { gt: 0 } },
    })
    return reply.send(advances)
  })

  app.get('/advances', auth, async (req, reply) => {
    const { vendorId, status } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (vendorId) where.vendorId = vendorId
    if (status && status !== 'ALL') where.status = status
    return reply.send(await app.prisma.vendorAdvance.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { adjustments: true },
    }))
  })

  app.post('/advances', auth, async (req, reply) => {
    const advanceRef = await nextRef('ADV', app.prisma.vendorAdvance, 'advanceRef', req.tenant.id)
    const data = req.body as any
    const advance = await app.prisma.vendorAdvance.create({
      data: { ...data, advanceRef, tenantId: req.tenant.id, pendingAmount: data.advanceAmount, createdByUserId: req.user.sub, status: 'DRAFT' },
    })
    return reply.code(201).send(advance)
  })

  app.post('/advances/:id/approve', auth, async (req, reply) => {
    const updated = await app.prisma.vendorAdvance.update({ where: { id: (req.params as any).id }, data: { status: 'APPROVED' } })
    return reply.send(updated)
  })

  app.post('/advances/:id/mark-paid', auth, async (req, reply) => {
    const updated = await app.prisma.vendorAdvance.update({ where: { id: (req.params as any).id }, data: { status: 'PAID', paidAt: new Date() } })
    return reply.send(updated)
  })

  app.post('/advances/:id/adjust', auth, async (req, reply) => {
    const { invoiceId, adjustedAmount } = req.body as any
    const advance = await app.prisma.vendorAdvance.findFirst({ where: { id: (req.params as any).id, tenantId: req.tenant.id } })
    if (!advance) return reply.code(404).send({ message: 'Advance not found' })
    if (Number(adjustedAmount) > Number(advance.pendingAmount)) return reply.code(400).send({ message: 'Adjustment exceeds pending advance amount' })
    await app.prisma.$transaction(async tx => {
      await tx.vendorAdvanceAdjustment.create({
        data: { advanceId: advance.id, invoiceId, adjustedAmount, adjustmentDate: new Date(), tdsCredit: 0 },
      })
      const newPending = Number(advance.pendingAmount) - Number(adjustedAmount)
      await tx.vendorAdvance.update({
        where: { id: advance.id },
        data:  { adjustedAmount: { increment: Number(adjustedAmount) }, pendingAmount: newPending, status: newPending <= 0 ? 'ADJUSTED' : 'PAID' },
      })
      await tx.invoice.update({ where: { id: invoiceId }, data: { netPayable: { decrement: Number(adjustedAmount) } } })
    })
    return reply.send({ ok: true })
  })

  // ════════════════════════════════
  // BUDGET
  // ════════════════════════════════

  app.get('/budgets', auth, async (req, reply) => {
    const { entityId, glCodeId, costCentreId, status } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (entityId)     where.entityId     = entityId
    if (glCodeId)     where.glCodeId     = glCodeId
    if (costCentreId) where.costCentreId = costCentreId
    if (status && status !== 'ALL') where.status = status
    const budgets = await app.prisma.budget.findMany({
      where, orderBy: { budgetRef: 'asc' },
      include: { periods: { orderBy: { periodStart: 'asc' } }, _count: { select: { revisions: true } } },
    })
    return reply.send(budgets.map(b => {
      const revised   = Number(b.revisedAmount)
      const committed = Number(b.committedAmount)
      const actual    = Number(b.actualAmount)
      const available = revised - committed - actual
      const used      = committed + actual
      const utilisedPct = revised > 0 ? (used / revised) * 100 : 0
      return { ...b, availableAmount: available, utilisedPct: utilisedPct.toFixed(1) }
    }))
  })

  app.get('/budgets/:id', auth, async (req, reply) => {
    const budget = await app.prisma.budget.findFirst({
      where:   { id: (req.params as any).id, tenantId: req.tenant.id },
      include: { periods: { orderBy: { periodStart: 'asc' } }, revisions: { orderBy: { revisionNo: 'desc' } } },
    })
    if (!budget) return reply.code(404).send({ message: 'Budget not found' })
    return reply.send(budget)
  })

  app.post('/budgets', auth, async (req, reply) => {
    const { periods = [], ...data } = req.body as any
    const budgetRef = await nextRef('BUD', app.prisma.budget, 'budgetRef', req.tenant.id)
    const budget = await app.prisma.$transaction(async tx => {
      const b = await tx.budget.create({ data: { ...data, budgetRef, tenantId: req.tenant.id, revisedAmount: data.budgetAmount, createdByUserId: req.user.sub } })
      if (periods.length) await tx.budgetPeriod.createMany({ data: periods.map((p: any) => ({ ...p, budgetId: b.id })) })
      return b
    })
    return reply.code(201).send(budget)
  })

  app.put('/budgets/:id', auth, async (req, reply) => {
    const { periods, ...data } = req.body as any
    const id = (req.params as any).id
    const existing = await app.prisma.budget.findFirst({ where: { id, tenantId: req.tenant.id } })
    if (!existing) return reply.code(404).send({ message: 'Budget not found' })
    const updated = await app.prisma.$transaction(async tx => {
      const b = await tx.budget.update({
        where: { id },
        data: {
          ...data,
          // While still a DRAFT, keep revisedAmount aligned with budgetAmount — formal revisions only kick in after activation
          ...(existing.status === 'DRAFT' && data.budgetAmount != null && { revisedAmount: data.budgetAmount }),
        },
      })
      if (periods) {
        await tx.budgetPeriod.deleteMany({ where: { budgetId: id } })
        if (periods.length) await tx.budgetPeriod.createMany({ data: periods.map((p: any) => ({ ...p, budgetId: id })) })
      }
      return b
    })
    return reply.send(updated)
  })

  app.post('/budgets/:id/revise', auth, async (req, reply) => {
    const { revisedAmount, reason } = req.body as any
    const budget = await app.prisma.budget.findFirst({ where: { id: (req.params as any).id } })
    if (!budget) return reply.code(404).send({ message: 'Budget not found' })
    const lastRevision = await app.prisma.budgetRevision.findFirst({ where: { budgetId: budget.id }, orderBy: { revisionNo: 'desc' } })
    await app.prisma.$transaction(async tx => {
      await tx.budgetRevision.create({
        data: { budgetId: budget.id, revisionNo: (lastRevision?.revisionNo ?? 0) + 1, previousAmount: budget.revisedAmount, revisedAmount, reason, approvedBy: req.user.sub },
      })
      await tx.budget.update({ where: { id: budget.id }, data: { revisedAmount } })
    })
    return reply.send({ ok: true })
  })

  app.get('/budgets/:id/utilisation', auth, async (req, reply) => {
    const budget = await app.prisma.budget.findFirst({
      where:   { id: (req.params as any).id, tenantId: req.tenant.id },
      include: { periods: true },
    })
    if (!budget) return reply.code(404).send({ message: 'Budget not found' })
    const available    = Number(budget.revisedAmount) - Number(budget.committedAmount) - Number(budget.actualAmount)
    const utilisedPct  = ((Number(budget.committedAmount) + Number(budget.actualAmount)) / Number(budget.revisedAmount)) * 100
    return reply.send({ budget, available, utilisedPct: utilisedPct.toFixed(1), status: utilisedPct >= 100 ? 'EXHAUSTED' : utilisedPct >= 90 ? 'CRITICAL' : utilisedPct >= 75 ? 'WARNING' : 'OK' })
  })
}
