import type { FastifyInstance } from 'fastify'
import { createInvoice, listInvoices, getInvoice, approveInvoice, rejectInvoice } from '../services/invoice.service.js'
import { startWorkflow } from '../services/workflow-engine.service.js'
import { extractInvoiceFromFile } from '../services/gemini-ocr.service.js'

export async function invoiceRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // ── OCR extract (no persist) — fills the InvoiceFormPage on upload ──
  // Returns structured fields from a single file so the React form can auto-
  // populate. Persistence happens later when the user clicks Save Draft / Submit.
  app.post('/ocr-extract', auth, async (req, reply) => {
    const { base64Data, mimeType } = (req.body ?? {}) as { base64Data?: string; mimeType?: string }
    if (!base64Data || !mimeType) {
      return reply.code(400).send({ error: 'base64Data and mimeType required' })
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(mimeType)) {
      return reply.code(400).send({ error: `unsupported mimeType — must be one of ${allowed.join(', ')}` })
    }
    const result = await extractInvoiceFromFile(base64Data, mimeType as any)
    if (!result.ok) {
      return reply.code(result.error.httpStatus ?? 502).send(result.error)
    }
    // Attempt vendor match by GSTIN so the form can pre-select the vendor row
    let matchedVendorId: string | null = null
    if (result.data.vendorGstin) {
      const v = await app.prisma.vendor.findFirst({
        where:  { tenantId: req.tenant.id, gstin: result.data.vendorGstin },
        select: { id: true },
      })
      matchedVendorId = v?.id ?? null
    }
    return reply.send({ ocr: result.data, matchedVendorId })
  })

  // ── List invoices ──
  app.get('/', auth, async (req, reply) => {
    const { status, vendorId, entityId, search, apLane, dateFrom, dateTo } = req.query as any
    const where: any = { tenantId: req.tenant.id }
    if (status && status !== 'ALL') where.status   = status
    if (vendorId)                   where.vendorId  = vendorId
    if (entityId)                   where.entityId  = entityId
    if (apLane && apLane !== 'ALL') where.apLane    = apLane
    if (dateFrom) where.invoiceDate = { gte: new Date(dateFrom) }
    if (dateTo)   where.invoiceDate = { ...where.invoiceDate, lte: new Date(dateTo) }
    if (search)   where.OR = [
      { invoiceNumber: { contains: search } },
      { vendor: { legalName: { contains: search } } },
    ]

    const [data, total] = await Promise.all([
      app.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take:    50,
        include: { vendor: { select: { legalName: true, vendorCode: true, kycPanStatus: true } } },
      }),
      app.prisma.invoice.count({ where }),
    ])
    return reply.send({ data, total })
  })

  // ── Stats ──
  app.get('/stats', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const [total, draft, submitted, approved, rejected, onHold, paid] = await Promise.all([
      app.prisma.invoice.count({ where: { tenantId } }),
      app.prisma.invoice.count({ where: { tenantId, status: 'DRAFT' } }),
      app.prisma.invoice.count({ where: { tenantId, status: 'SUBMITTED' } }),
      app.prisma.invoice.count({ where: { tenantId, status: 'APPROVED' } }),
      app.prisma.invoice.count({ where: { tenantId, status: 'REJECTED' } }),
      app.prisma.invoice.count({ where: { tenantId, status: 'ON_HOLD' } }),
      app.prisma.invoice.count({ where: { tenantId, status: 'PAID' } }),
    ])
    return reply.send({ total, draft, submitted, approved, rejected, onHold, paid })
  })

  // ── Pending approvals (current user) ──
  app.get('/pending-approvals', auth, async (req, reply) => {
    const userId   = req.user.sub
    const tenantId = req.tenant.id

    const pendingStages = await app.prisma.workflowInstanceStage.findMany({
      where:   { tenantId, assignedTo: userId, status: 'PENDING' },
      include: { instance: true },
    })

    const invoiceIds = pendingStages
      .filter(s => s.instance.entityType === 'invoice')
      .map(s => s.instance.entityId)

    if (!invoiceIds.length) return reply.send([])

    const invoices = await app.prisma.invoice.findMany({
      where:   { id: { in: invoiceIds }, tenantId },
      include: { vendor: { select: { legalName: true, vendorCode: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send(invoices.map(inv => ({
      ...inv,
      pendingStage: pendingStages.find(s => s.instance.entityId === inv.id),
    })))
  })

  // ── Get detail ──
  app.get('/:id', auth, async (req, reply) => {
    const result = await getInvoice(app.prisma, (req.params as any).id, req.tenant.id)
    if (!result.ok) return reply.code(result.error.httpStatus ?? 404).send(result.error)
    return reply.send(result.data)
  })

  // ── Create invoice ──
  // Accepts optional poRefs[] (multi-PO link) and matchType / grnIds[] for PO-based
  // invoices. For each poRef the server validates that invoiceAmount <= openValue
  // (totalAmount - consumedAmount) and bumps PO.consumedAmount in the same
  // transaction. Pure DIRECT invoices pass no poRefs.
  app.post('/', auth, async (req, reply) => {
    const {
      lines = [],
      poRefs = [],
      matchType,
      grnIds: _grnIds = [],
      ...data
    } = req.body as {
      lines?: any[]
      poRefs?: { poId: string; consumptionType: 'PARTIAL' | 'FULL'; invoiceAmount: number }[]
      matchType?: '2way' | '3way'
      grnIds?: string[]
      [k: string]: unknown
    }

    // Validate poRefs consumption against PO open value.
    if (poRefs.length > 0) {
      const poIds = poRefs.map(p => p.poId)
      const pos = await app.prisma.purchaseOrder.findMany({
        where:  { id: { in: poIds }, tenantId: req.tenant.id },
        select: { id: true, poRef: true, totalAmount: true, consumedAmount: true },
      })
      const { validatePOConsumption } = await import('../services/po-consumption.service.js')
      const result = validatePOConsumption(
        poRefs.map(p => ({ poId: p.poId, invoiceAmount: p.invoiceAmount })),
        pos.map(p => ({ id: p.id, poRef: p.poRef, totalAmount: Number(p.totalAmount), consumedAmount: Number(p.consumedAmount) })),
      )
      if (!result.ok) {
        if (result.error.code === 'PO_NOT_FOUND') {
          return reply.code(400).send({ code: 'VALIDATION_ERROR', message: `PO ${result.error.poId} not found in this tenant` })
        }
        return reply.code(400).send({
          code:    'VALIDATION_ERROR',
          message: `Invoice amount ${result.error.invoiceAmount} exceeds open value ${result.error.openValue.toFixed(2)} on PO ${result.error.poRef}`,
        })
      }
    }

    const invoice = await app.prisma.$transaction(async tx => {
      const inv = await tx.invoice.create({
        data: {
          ...data,
          tenantId:        req.tenant.id,
          createdByUserId: req.user.sub,
          status:          'DRAFT',
          isPOInvoice:     poRefs.length > 0,
          matchType:       poRefs.length > 0 ? (matchType ?? '2way') : null,
        },
      })
      if (lines.length) {
        await tx.invoiceLine.createMany({
          data: lines.map((l: any, i: number) => ({ ...l, invoiceId: inv.id, lineNumber: i + 1 })),
        })
      }
      if (poRefs.length > 0) {
        await tx.invoicePOLink.createMany({
          data: poRefs.map(p => ({
            tenantId:        req.tenant.id,
            invoiceId:       inv.id,
            poId:            p.poId,
            invoiceAmount:   p.invoiceAmount,
            consumptionType: p.consumptionType,
          })),
        })
        // Bump consumedAmount on each PO. Stays inside the transaction so the
        // running total can't drift if two invoices race against the same PO.
        for (const p of poRefs) {
          await tx.purchaseOrder.update({
            where: { id: p.poId },
            data:  { consumedAmount: { increment: p.invoiceAmount } },
          })
        }
      }
      await tx.invoiceAuditLog.create({
        data: { invoiceId: inv.id, tenantId: req.tenant.id, action: 'CREATED', userId: req.user.sub, userName: (req.user as any).name },
      })
      return inv
    })
    return reply.code(201).send(invoice)
  })

  // ── Update invoice ──
  app.put('/:id', auth, async (req, reply) => {
    const { lines, ...data } = req.body as any
    const invoice = await app.prisma.$transaction(async tx => {
      const inv = await tx.invoice.update({ where: { id: (req.params as any).id }, data })
      if (lines) {
        await tx.invoiceLine.deleteMany({ where: { invoiceId: inv.id } })
        if (lines.length) {
          await tx.invoiceLine.createMany({
            data: lines.map((l: any, i: number) => ({ ...l, invoiceId: inv.id, lineNumber: i + 1 })),
          })
        }
      }
      await tx.invoiceAuditLog.create({
        data: { invoiceId: inv.id, tenantId: req.tenant.id, action: 'UPDATED', userId: req.user.sub, userName: (req.user as any).name },
      })
      return inv
    })
    return reply.send(invoice)
  })

  // ── Submit for approval ──
  app.post('/:id/submit', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const userId   = req.user.sub
    const invoiceId = (req.params as any).id

    const invoice = await app.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    })
    if (!invoice) return reply.code(404).send({ message: 'Invoice not found' })
    if (!['DRAFT', 'REJECTED'].includes(invoice.status)) {
      return reply.code(400).send({ message: `Cannot submit invoice in ${invoice.status} status` })
    }

    const record = {
      totalAmount:     Number(invoice.totalAmount),
      entityId:        invoice.entityId,
      vendorId:        invoice.vendorId,
      currencyCode:    invoice.currencyCode,
      isPOInvoice:     invoice.isPOInvoice ?? false,
      departmentId:    null,
      createdByUserId: invoice.createdByUserId,
    }

    const wfResult = await startWorkflow(
      app.prisma, 'INVOICE', 'invoice', invoiceId, record,
      { tenantId, userId, userName: (req.user as any).name ?? userId }
    )

    const wfInstanceId = wfResult.ok ? wfResult.data.instanceId : null
    const newStatus    = wfResult.ok ? 'PENDING_L1' : 'SUBMITTED'

    await app.prisma.invoice.update({
      where: { id: invoiceId },
      data:  { status: newStatus, workflowInstanceId: wfInstanceId },
    })

    await app.prisma.invoiceAuditLog.create({
      data: {
        invoiceId, tenantId, action: 'SUBMITTED',
        userId, userName: (req.user as any).name,
        details: { workflowStarted: wfResult.ok, newStatus },
      },
    })

    return reply.send({ ok: true, status: newStatus, workflowInstanceId: wfInstanceId })
  })

  // ── Approve ──
  app.post('/:id/approve', auth, async (req, reply) => {
    const { comments } = (req.body ?? {}) as { comments?: string }
    const result = await approveInvoice(app.prisma, (req.params as any).id, comments, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip })
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
    await app.prisma.invoiceAuditLog.create({
      data: { invoiceId: (req.params as any).id, tenantId: req.tenant.id, action: 'APPROVED', userId: req.user.sub, userName: (req.user as any).name, details: { comments } },
    })
    return reply.send({ ok: true })
  })

  // ── Reject ──
  app.post('/:id/reject', auth, async (req, reply) => {
    const { comments } = (req.body ?? {}) as { comments: string }
    if (!comments) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Rejection reason is required' })
    const result = await rejectInvoice(app.prisma, (req.params as any).id, comments, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip })
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
    await app.prisma.invoice.update({ where: { id: (req.params as any).id }, data: { rejectionReason: comments } })
    await app.prisma.invoiceAuditLog.create({
      data: { invoiceId: (req.params as any).id, tenantId: req.tenant.id, action: 'REJECTED', userId: req.user.sub, userName: (req.user as any).name, details: { comments } },
    })
    return reply.send({ ok: true })
  })

  // ── Put on hold ──
  app.post('/:id/hold', auth, async (req, reply) => {
    const { reason } = (req.body ?? {}) as { reason?: string }
    const inv = await app.prisma.invoice.update({
      where: { id: (req.params as any).id },
      data:  { status: 'ON_HOLD' },
    })
    await app.prisma.invoiceAuditLog.create({
      data: { invoiceId: inv.id, tenantId: req.tenant.id, action: 'ON_HOLD', userId: req.user.sub, userName: (req.user as any).name, details: { reason } },
    })
    return reply.send(inv)
  })

  // ── Release hold ──
  app.post('/:id/release-hold', auth, async (req, reply) => {
    const inv = await app.prisma.invoice.update({
      where: { id: (req.params as any).id },
      data:  { status: 'SUBMITTED' },
    })
    await app.prisma.invoiceAuditLog.create({
      data: { invoiceId: inv.id, tenantId: req.tenant.id, action: 'HOLD_RELEASED', userId: req.user.sub, userName: (req.user as any).name },
    })
    return reply.send(inv)
  })

  // ── OCR ingest (file upload → extract → create draft) ──
  app.post('/ingest', { ...auth, config: { rawBody: true } }, async (req, reply) => {
    const body = req.body as any
    const { base64Data, mimeType, fileName, channelType = 'MANUAL_UPLOAD' } = body
    if (!base64Data || !mimeType) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'base64Data and mimeType are required' })
    }
    const { ingestInvoice } = await import('../services/invoice-ingestion.service.js')
    const result = await ingestInvoice(app.prisma, { channelType, base64Data, mimeType, fileName }, { tenantId: req.tenant.id, userId: req.user.sub, ip: req.ip })
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
    return reply.code(201).send(result.data)
  })

  // ── Match score ──
  app.get('/:id/score', auth, async (req, reply) => {
    const score = await app.prisma.invoiceMatchScore.findFirst({
      where: { invoiceId: (req.params as any).id, tenantId: req.tenant.id },
    })
    if (!score) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Score not found' })
    return reply.send(score)
  })
}
