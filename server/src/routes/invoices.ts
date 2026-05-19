import type { FastifyInstance } from 'fastify'
import { createInvoice, listInvoices, getInvoice, approveInvoice, rejectInvoice } from '../services/invoice.service.js'
import { startWorkflow } from '../services/workflow-engine.service.js'
import { extractInvoiceFromFile } from '../services/gemini-ocr.service.js'
import { saveInvoiceFile, readInvoiceFile } from '../services/invoice-file-storage.service.js'
import { sanitisePayload } from '../lib/payload.js'

// Invoice DateTime? columns surfaced as HTML <input type="date"> on the form —
// empty input sends `""`, which Prisma rejects with "premature end of input".
// Listed once so POST + PUT share the same coercion.
const INVOICE_NULLABLE_DATES = ['dueDate', 'periodFrom', 'periodTo'] as const

// Relation / derived fields that the GET response includes but Prisma's
// scalar update() rejects ("Unknown argument `vendor`"). Stripped before
// the payload reaches Prisma so InvoiceFormPage can edit by reading the
// full record and PUTting it back without per-field surgery on the client.
const INVOICE_STRIP_FIELDS = ['vendor', 'lines', 'auditLogs', 'approvals', 'poLinks', 'hasFile'] as const

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

  // ── Pending approvals (current user, cross-module) ──
  // Returns every PENDING WorkflowInstanceStage assigned to the user across
  // invoice / purchase_requisition / purchase_order. Each row is enriched with
  // a `module` tag, document reference + amount + label so the Approval Desk
  // can render a unified queue without N module-specific endpoints.
  app.get('/pending-approvals', auth, async (req, reply) => {
    const userId   = req.user.sub
    const tenantId = req.tenant.id

    // Future stages of a multi-stage workflow are pre-created with status
    // PENDING (so the timeline is visible upfront). Filter to the CURRENT
    // stage of each instance — instance.currentStageOrder must match.
    const allPending = await app.prisma.workflowInstanceStage.findMany({
      where:   { tenantId, assignedTo: userId, status: 'PENDING' },
      include: { instance: true },
    })
    const pendingStages = allPending.filter(
      s => s.instance.status === 'IN_PROGRESS' && s.stageOrder === s.instance.currentStageOrder
    )
    if (pendingStages.length === 0) return reply.send([])

    const invoiceIds     = pendingStages.filter(s => s.instance.entityType === 'invoice').map(s => s.instance.entityId)
    const prIds          = pendingStages.filter(s => s.instance.entityType === 'purchase_requisition').map(s => s.instance.entityId)
    const poIds          = pendingStages.filter(s => s.instance.entityType === 'purchase_order').map(s => s.instance.entityId)
    const itemIds        = pendingStages.filter(s => s.instance.entityType === 'item').map(s => s.instance.entityId)
    const itemChangeIds  = pendingStages.filter(s => s.instance.entityType === 'item_change').map(s => s.instance.entityId)
    // Master modules — same cross-module pattern; each gets a separate batch
    // findMany so we can include the relations each one needs for display.
    const vendorIds      = pendingStages.filter(s => s.instance.entityType === 'vendor').map(s => s.instance.entityId)
    const employeeIds    = pendingStages.filter(s => s.instance.entityType === 'employee').map(s => s.instance.entityId)
    const userIds        = pendingStages.filter(s => s.instance.entityType === 'user').map(s => s.instance.entityId)
    const budgetIds      = pendingStages.filter(s => s.instance.entityType === 'budget').map(s => s.instance.entityId)
    const fyIds          = pendingStages.filter(s => s.instance.entityType === 'financial_year').map(s => s.instance.entityId)
    const currencyIds    = pendingStages.filter(s => s.instance.entityType === 'currency').map(s => s.instance.entityId)
    const pcIds          = pendingStages.filter(s => s.instance.entityType === 'profit_centre').map(s => s.instance.entityId)
    const itemCatIds     = pendingStages.filter(s => s.instance.entityType === 'item_category').map(s => s.instance.entityId)
    const paymentBatchIds = pendingStages.filter(s => s.instance.entityType === 'payment_batch').map(s => s.instance.entityId)

    const [
      invoices, prs, pos, items, itemChanges,
      vendors, employees, users, budgets, fys, currencies, profitCentres, itemCategories,
      paymentBatches,
    ] = await Promise.all([
      invoiceIds.length
        ? app.prisma.invoice.findMany({
            where:   { id: { in: invoiceIds }, tenantId },
            include: { vendor: { select: { legalName: true, vendorCode: true } } },
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.invoice.findMany>>),
      prIds.length
        ? app.prisma.purchaseRequisition.findMany({ where: { id: { in: prIds }, tenantId } })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.purchaseRequisition.findMany>>),
      poIds.length
        ? app.prisma.purchaseOrder.findMany({
            where:   { id: { in: poIds }, tenantId },
            include: { vendor: { select: { legalName: true, vendorCode: true } } },
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.purchaseOrder.findMany>>),
      itemIds.length
        ? app.prisma.itemMaster.findMany({ where: { id: { in: itemIds }, tenantId } })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.itemMaster.findMany>>),
      itemChangeIds.length
        ? app.prisma.itemMasterChangeRequest.findMany({
            where:   { id: { in: itemChangeIds }, tenantId },
            include: { item: { select: { itemCode: true, name: true } } },
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.itemMasterChangeRequest.findMany>>),
      vendorIds.length
        ? app.prisma.vendor.findMany({ where: { id: { in: vendorIds }, tenantId } })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.vendor.findMany>>),
      employeeIds.length
        ? app.prisma.employee.findMany({ where: { id: { in: employeeIds }, tenantId } })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.employee.findMany>>),
      userIds.length
        ? app.prisma.user.findMany({ where: { id: { in: userIds }, tenantId }, select: { id: true, name: true, email: true, role: true, status: true, createdAt: true } })
        : Promise.resolve([] as Array<{ id: string; name: string; email: string; role: string; status: string; createdAt: Date }>),
      budgetIds.length
        ? app.prisma.budget.findMany({ where: { id: { in: budgetIds }, tenantId } })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.budget.findMany>>),
      fyIds.length
        ? app.prisma.financialYear.findMany({ where: { id: { in: fyIds }, tenantId } })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.financialYear.findMany>>),
      currencyIds.length
        ? app.prisma.currency.findMany({ where: { id: { in: currencyIds } } })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.currency.findMany>>),
      pcIds.length
        ? app.prisma.profitCentre.findMany({ where: { id: { in: pcIds }, tenantId } })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.profitCentre.findMany>>),
      itemCatIds.length
        ? app.prisma.itemCategory.findMany({ where: { id: { in: itemCatIds }, tenantId } })
        : Promise.resolve([] as Awaited<ReturnType<typeof app.prisma.itemCategory.findMany>>),
      paymentBatchIds.length
        ? app.prisma.paymentBatch.findMany({
            where: { id: { in: paymentBatchIds }, tenantId },
            include: { _count: { select: { lines: true } } },
          })
        : Promise.resolve([] as Array<{ id: string; batchRef: string; status: string; isUrgent: boolean; containsMsme: boolean; totalNetPayable: unknown; createdAt: Date; _count: { lines: number } }>),
    ])

    const rows: unknown[] = []
    for (const stage of pendingStages) {
      const { entityType, entityId } = stage.instance
      if (entityType === 'invoice') {
        const inv = invoices.find(i => i.id === entityId)
        if (inv) rows.push({ ...inv, module: 'INVOICE', pendingStage: stage })
      } else if (entityType === 'purchase_requisition') {
        const pr = prs.find(p => p.id === entityId)
        if (pr) rows.push({
          ...pr, module: 'PR', pendingStage: stage,
          // Keep field names parallel to the invoice shape so the desk renders
          // both without per-module column logic.
          invoiceNumber: pr.prRef, totalAmount: pr.estimatedTotal, currencyCode: 'INR',
        })
      } else if (entityType === 'purchase_order') {
        const po = pos.find(p => p.id === entityId)
        if (po) rows.push({
          ...po, module: 'PO', pendingStage: stage,
          invoiceNumber: po.poRef,
        })
      } else if (entityType === 'item') {
        const it = items.find(i => i.id === entityId)
        if (it) rows.push({
          ...it, module: 'ITEM', pendingStage: stage,
          invoiceNumber: it.itemCode, totalAmount: 0, currencyCode: 'INR',
        })
      } else if (entityType === 'item_change') {
        const cr = itemChanges.find(c => c.id === entityId)
        if (cr) {
          const fieldsList = ((cr.changedFields as { fields?: string[] })?.fields ?? []).join(', ')
          rows.push({
            ...cr, module: 'ITEM_CHANGE', pendingStage: stage,
            invoiceNumber: cr.item?.itemCode ?? cr.itemId,
            name:          `${cr.item?.name ?? 'Item'} — change: ${fieldsList}`,
            totalAmount:   0, currencyCode: 'INR',
          })
        }
      } else if (entityType === 'vendor') {
        const v = vendors.find(r => r.id === entityId)
        if (v) rows.push({ ...v, module: 'VENDOR', pendingStage: stage, invoiceNumber: v.vendorCode, name: v.legalName, totalAmount: 0, currencyCode: 'INR' })
      } else if (entityType === 'employee') {
        const e = employees.find(r => r.id === entityId)
        if (e) rows.push({ ...e, module: 'EMPLOYEE', pendingStage: stage, invoiceNumber: e.code, totalAmount: 0, currencyCode: 'INR' })
      } else if (entityType === 'user') {
        const u = users.find(r => r.id === entityId)
        if (u) rows.push({ ...u, module: 'USER', pendingStage: stage, invoiceNumber: u.email, name: u.name, totalAmount: 0, currencyCode: 'INR' })
      } else if (entityType === 'budget') {
        const b = budgets.find(r => r.id === entityId)
        if (b) rows.push({ ...b, module: 'BUDGET', pendingStage: stage, invoiceNumber: b.budgetRef, totalAmount: Number(b.budgetAmount), currencyCode: 'INR' })
      } else if (entityType === 'financial_year') {
        const f = fys.find(r => r.id === entityId)
        if (f) rows.push({ ...f, module: 'FY', pendingStage: stage, invoiceNumber: f.code, totalAmount: 0, currencyCode: 'INR' })
      } else if (entityType === 'currency') {
        const c = currencies.find(r => r.id === entityId)
        if (c) rows.push({ ...c, module: 'CURRENCY', pendingStage: stage, invoiceNumber: c.code, totalAmount: 0, currencyCode: c.code })
      } else if (entityType === 'profit_centre') {
        const p = profitCentres.find(r => r.id === entityId)
        if (p) rows.push({ ...p, module: 'PROFIT_CENTRE', pendingStage: stage, invoiceNumber: p.code, totalAmount: 0, currencyCode: 'INR' })
      } else if (entityType === 'item_category') {
        const ic = itemCategories.find(r => r.id === entityId)
        if (ic) rows.push({ ...ic, module: 'ITEM_CATEGORY', pendingStage: stage, invoiceNumber: ic.code, totalAmount: 0, currencyCode: 'INR' })
      } else if (entityType === 'payment_batch') {
        const pb = paymentBatches.find(r => r.id === entityId)
        if (pb) rows.push({
          ...pb,
          module: 'PAYMENT',
          pendingStage: stage,
          invoiceNumber: pb.batchRef,
          name:          `Payment batch (${pb._count.lines} lines)${pb.isUrgent ? ' — URGENT' : ''}${pb.containsMsme ? ' · MSME' : ''}`,
          totalAmount:   Number(pb.totalNetPayable),
          currencyCode:  'INR',
        })
      }
    }

    rows.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return reply.send(rows)
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
      fileBase64,
      fileMimeType,
      fileName,
      ...data
    } = req.body as {
      lines?:        any[]
      poRefs?:       { poId: string; consumptionType: 'PARTIAL' | 'FULL'; invoiceAmount: number }[]
      matchType?:    '2way' | '3way'
      grnIds?:       string[]
      fileBase64?:   string
      fileMimeType?: string
      fileName?:     string
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

    // Strip immutable fields + coerce empty-string dates to null. The form's
    // <input type="date"> emits "" for blank fields, which Prisma rejects.
    const cleanData = sanitisePayload(data, {
      nullableFields: [...INVOICE_NULLABLE_DATES],
      stripFields:    [...INVOICE_STRIP_FIELDS],
    })

    const invoice = await app.prisma.$transaction(async tx => {
      const inv = await tx.invoice.create({
        data: {
          ...cleanData,
          tenantId:        req.tenant.id,
          createdByUserId: req.user.sub,
          status:          'DRAFT',
          isPOInvoice:     poRefs.length > 0,
          matchType:       poRefs.length > 0 ? (matchType ?? '2way') : null,
        } as never,
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

    // Persist the uploaded PDF/image after the transaction commits — disk I/O
    // shouldn't hold the DB transaction open. fileUrl is a relative path under
    // uploads/ so a future move to object storage only changes the resolver.
    if (fileBase64 && fileMimeType) {
      try {
        const saved = await saveInvoiceFile(
          req.tenant.id, invoice.id, fileBase64, fileMimeType, fileName ?? 'invoice',
        )
        await app.prisma.invoice.update({
          where: { id: invoice.id },
          data:  { fileUrl: saved.fileUrl, fileName: saved.fileName, mimeType: saved.mimeType },
        })
      } catch (e) {
        // Don't fail the invoice create on a storage hiccup — just log and move on.
        app.log.error({ err: e, invoiceId: invoice.id }, 'invoice file persist failed')
      }
    }

    return reply.code(201).send(invoice)
  })

  // ── Stream the original attachment ──
  // Auth + tenant-scoped. Reads from disk if `fileUrl` is set, otherwise falls
  // back to bytes stashed in `ocrRawData.attachmentData` (email-poller legacy
  // path). Used by the detail-page iframe + "Open in new tab" fallback.
  app.get('/:id/file', auth, async (req, reply) => {
    const inv = await app.prisma.invoice.findFirst({
      where:  { id: (req.params as any).id, tenantId: req.tenant.id },
      select: { id: true, fileUrl: true, fileName: true, mimeType: true, ocrRawData: true },
    })
    if (!inv) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Invoice not found' })

    const file = await readInvoiceFile(inv)
    if (!file) return reply.code(404).send({ code: 'NOT_FOUND', message: 'No file attached' })

    reply.header('Content-Type', file.mimeType)
    reply.header('Content-Disposition', `inline; filename="${file.fileName.replace(/"/g, '')}"`)
    reply.header('Cache-Control', 'private, max-age=300')
    return reply.send(file.buffer)
  })

  // ── Update invoice ──
  app.put('/:id', auth, async (req, reply) => {
    const { lines, fileBase64: _fb, fileMimeType: _fm, fileName: _fn, ...data } = req.body as Record<string, unknown> & { lines?: unknown[] }
    const invoiceId = (req.params as { id: string }).id

    // Tenant-scope guard before mutation.
    const existing = await app.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: req.tenant.id }, select: { id: true },
    })
    if (!existing) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Invoice not found' })

    const cleanData = sanitisePayload(data, {
      nullableFields: [...INVOICE_NULLABLE_DATES],
      stripFields:    [...INVOICE_STRIP_FIELDS],
    })

    const invoice = await app.prisma.$transaction(async tx => {
      const inv = await tx.invoice.update({ where: { id: invoiceId }, data: cleanData as never })
      if (Array.isArray(lines)) {
        await tx.invoiceLine.deleteMany({ where: { invoiceId: inv.id } })
        if (lines.length) {
          // Strip line-level relation accessors (item, invoice) + immutable
          // fields. Real form payloads don't carry these, but if a caller
          // echoes the GET response (which includes them via include:), the
          // createMany would crash.
          const cleanLines = lines.map((l, i) => {
            const raw = l as Record<string, unknown>
            const { id: _id, invoiceId: _iid, item: _it, invoice: _inv, itemMatchScore: _ims, itemCandidates: _ic, createdAt: _ca, updatedAt: _ua, ...rest } = raw
            return { ...rest, invoiceId: inv.id, lineNumber: i + 1 }
          })
          await tx.invoiceLine.createMany({ data: cleanLines as never })
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

    // wfResult.ok with autoApproved=true → entire definition was auto-approved
    //   (every stage had autoApproveBelow > amount). Invoice goes straight to
    //   APPROVED — same end state as the final approve route would produce.
    // wfResult.ok without autoApproved → workflow is IN_PROGRESS, invoice is
    //   PENDING_L1.
    // wfResult.error.message === 'NO_WORKFLOW_DEFINED' → no matching workflow
    //   config for this tenant/module. Fall back to plain SUBMITTED so the
    //   document isn't stranded in an unactionable state.
    let wfInstanceId: string | null = null
    let newStatus: string
    if (wfResult.ok) {
      wfInstanceId = wfResult.data.instanceId
      newStatus    = wfResult.data.autoApproved ? 'APPROVED' : 'PENDING_L1'
    } else if (wfResult.error.message === 'NO_WORKFLOW_DEFINED') {
      newStatus = 'SUBMITTED'
    } else {
      return reply.code(wfResult.error.httpStatus ?? 400).send(wfResult.error)
    }

    await app.prisma.invoice.update({
      where: { id: invoiceId },
      data:  { status: newStatus, workflowInstanceId: wfInstanceId },
    })

    await app.prisma.invoiceAuditLog.create({
      data: {
        invoiceId, tenantId, action: 'SUBMITTED',
        userId, userName: (req.user as any).name,
        details: { workflowStarted: wfResult.ok, autoApproved: wfResult.ok && wfResult.data.autoApproved, newStatus },
      },
    })

    return reply.send({ ok: true, status: newStatus, workflowInstanceId: wfInstanceId, autoApproved: wfResult.ok && (wfResult.data.autoApproved ?? false) })
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
