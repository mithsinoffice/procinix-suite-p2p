import type { PrismaClient } from '@prisma/client'
import { ok, err, Errors, type Result } from '../lib/result.js'
import { writeAuditLog, AuditAction } from '../lib/audit.js'
import type { Redis } from '../lib/redis.js'
import { triggerOnInvoiceApproval } from './accounting-trigger.service.js'

// ── Types ──

export interface InvoiceLineInput {
  lineNumber:    number
  description:   string
  quantity:      number
  unitPrice:     number
  rcmApplicable?: boolean
  glCodeId?:     string
  costCentreId?: string
}

export interface InvoiceCreateInput {
  invoiceNumber: string
  vendorId:      string
  entityId?:     string
  invoiceDate:   string
  dueDate?:      string
  currencyCode?: string
  notes?:        string
  lines:         InvoiceLineInput[]
}

interface Ctx { tenantId: string; userId: string; ip?: string }

// ── Totals calculator ──

async function calcTotals(_prisma: PrismaClient, _tenantId: string, lines: InvoiceLineInput[], _vendorId: string) {

  let subtotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0, tdsAmount = 0
  const enrichedLines = lines.map(line => {
    const lineBase    = Number(line.quantity) * Number(line.unitPrice)
    const cgstAmount  = 0  // GST calc via line-level gstRate on new form; legacy service zeroes out
    const sgstAmount  = 0
    const igstAmount  = 0
    subtotal    += lineBase
    return { ...line, lineTotal: lineBase, cgstAmount, sgstAmount, igstAmount, tdsAmount: 0 }
  })

  const totalAmount = subtotal + cgstTotal + sgstTotal + igstTotal
  const netPayable  = totalAmount - tdsAmount
  return { enrichedLines, subtotal, cgstTotal, sgstTotal, igstTotal, tdsAmount, totalAmount, netPayable }
}

// ── Create ──

export async function createInvoice(
  prisma: PrismaClient,
  _redis: Redis,
  input: InvoiceCreateInput,
  ctx: Ctx
): Promise<Result<{ id: string; invoiceNumber: string }>> {

  // 1. Hard dedupe — same vendor + invoice number
  const existing = await prisma.invoice.findFirst({
    where: { tenantId: ctx.tenantId, vendorId: input.vendorId, invoiceNumber: input.invoiceNumber },
  })
  if (existing) {
    return err(Errors.duplicateRecord('Invoice', 'invoice number', input.invoiceNumber))
  }

  // 2. Validate vendor exists
  const vendor = await prisma.vendor.findFirst({ where: { id: input.vendorId, tenantId: ctx.tenantId } })
  if (!vendor) return err(Errors.notFound('Vendor', input.vendorId))

  // 3. Calculate totals
  const { enrichedLines, subtotal, cgstTotal, sgstTotal, igstTotal, tdsAmount, totalAmount, netPayable } =
    await calcTotals(prisma, ctx.tenantId, input.lines, input.vendorId)

  // 4. Create invoice + lines in transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        tenantId:        ctx.tenantId,
        invoiceNumber:   input.invoiceNumber,
        vendorId:        input.vendorId,
        entityId:        input.entityId,
        invoiceDate:     new Date(input.invoiceDate),
        dueDate:         input.dueDate ? new Date(input.dueDate) : null,
        currencyCode:    input.currencyCode ?? 'INR',
        subtotal,
        cgstAmount:      cgstTotal,
        sgstAmount:      sgstTotal,
        igstAmount:      igstTotal,
        tdsAmount,
        totalAmount,
        netPayable,
        notes:           input.notes,
        status:          'DRAFT',
        apLane:          'MANUAL',
        createdByUserId: ctx.userId,
      },
    })

    await tx.invoiceLine.createMany({
      data: enrichedLines.map((l, i) => ({
        invoiceId:    inv.id,
        lineNumber:   l.lineNumber ?? i + 1,
        description:  l.description,
        quantity:     l.quantity,
        unitPrice:    l.unitPrice,
        lineTotal:    l.lineTotal,
        cgstAmount:   l.cgstAmount,
        sgstAmount:   l.sgstAmount,
        igstAmount:   l.igstAmount,
        tdsAmount:    l.tdsAmount,
        rcmApplicable: l.rcmApplicable ?? false,
        glCodeId:     l.glCodeId,
        costCentreId: l.costCentreId,
      })),
    })

    return inv
  })

  await writeAuditLog(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId,
    action: AuditAction.INVOICE_CREATED, entityType: 'invoice', entityId: invoice.id,
    after: { invoiceNumber: input.invoiceNumber, totalAmount, vendorId: input.vendorId },
    ipAddress: ctx.ip,
  })

  return ok({ id: invoice.id, invoiceNumber: invoice.invoiceNumber })
}

// ── List ──

export async function listInvoices(prisma: PrismaClient, tenantId: string, filter: {
  status?: string; vendorId?: string; search?: string; cursor?: string; take?: number
}) {
  const take = filter.take ?? 25
  const where: any = { tenantId }
  if (filter.status)   where.status   = filter.status
  if (filter.vendorId) where.vendorId = filter.vendorId
  if (filter.search)   where.OR = [{ invoiceNumber: { contains: filter.search } }]

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      take: take + 1,
      ...(filter.cursor && { cursor: { id: filter.cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: { vendor: { select: { legalName: true, vendorCode: true } } },
    }),
    prisma.invoice.count({ where }),
  ])

  const hasMore    = invoices.length > take
  const data       = hasMore ? invoices.slice(0, -1) : invoices
  const nextCursor = hasMore ? data[data.length - 1].id : null

  return { data, total, nextCursor, hasMore }
}

// ── Get ──

export async function getInvoice(prisma: PrismaClient, id: string, tenantId: string) {
  const invoice = await prisma.invoice.findFirst({
    where:   { id, tenantId },
    include: {
      // paymentTerms drives the auto-due-date chip on the detail page.
      vendor:    { select: { legalName: true, vendorCode: true, gstin: true, pan: true, panCompliance: true, paymentTerms: true, kycPanStatus: true, kycGstStatus: true, kycBankStatus: true } },
      lines:     {
        orderBy: { lineNumber: 'asc' },
        // item.name renders as the line's headline; the raw OCR description
        // is kept on the line itself and shown smaller underneath.
        include: { item: { select: { id: true, name: true, hsnCode: true, gstRate: true } } },
      },
      auditLogs: { orderBy: { createdAt: 'asc' } },
      approvals: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!invoice) return err(Errors.notFound('Invoice', id))

  // Strip the inlined PDF bytes from ocrRawData so detail responses stay small —
  // the bytes are streamed separately via GET /api/invoices/:id/file. `hasFile`
  // tells the UI whether to render the preview at all.
  const ocr = invoice.ocrRawData as { attachmentData?: string; attachmentMime?: string } | null
  const hasFile = !!invoice.fileUrl || !!ocr?.attachmentData
  const ocrSlim = ocr
    ? (() => { const { attachmentData: _d, ...rest } = ocr; return rest })()
    : ocr

  // Merge per-line item-master match summaries from InvoiceMatchScore.scoreBreakdown
  // onto each line. The match agent stores top-3 candidates + winner score
  // keyed by line index when the invoice was ingested.
  const matchScoreRow = await prisma.invoiceMatchScore.findUnique({
    where: { invoiceId: id }, select: { scoreBreakdown: true },
  })
  const breakdown   = matchScoreRow?.scoreBreakdown as { itemMatches?: { lineIndex: number; score: number; candidates: unknown[] }[] } | null
  const itemMatches = breakdown?.itemMatches ?? []
  const enrichedLines = invoice.lines.map((l, idx) => {
    const m = itemMatches.find(im => im.lineIndex === idx)
    return {
      ...l,
      itemName:        l.item?.name ?? null,
      itemMatchScore:  m?.score ?? null,
      itemCandidates:  m?.candidates ?? [],
    }
  })

  return ok({ ...invoice, lines: enrichedLines, ocrRawData: ocrSlim, hasFile })
}

// ── Submit ──

export async function submitInvoice(prisma: PrismaClient, id: string, ctx: Ctx): Promise<Result<void>> {
  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId: ctx.tenantId } })
  if (!invoice) return err(Errors.notFound('Invoice', id))
  if (invoice.status !== 'DRAFT') return err({ code: 'WORKFLOW_INVALID_STATE' as const, message: `Cannot submit an invoice in ${invoice.status} status`, httpStatus: 422 })

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({ where: { id }, data: { status: 'PENDING_L1' } })
    await tx.approvalStep.create({
      data: { tenantId: ctx.tenantId, invoiceId: id, level: 1, approverId: ctx.userId, status: 'PENDING' },
    })
  })

  await writeAuditLog(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId,
    action: AuditAction.INVOICE_SUBMITTED, entityType: 'invoice', entityId: id,
    ipAddress: ctx.ip,
  })

  return ok(undefined)
}

// ── Approve ──

export async function approveInvoice(
  prisma: PrismaClient, id: string, comments: string | undefined, ctx: Ctx
): Promise<Result<void>> {
  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId: ctx.tenantId } })
  if (!invoice) return err(Errors.notFound('Invoice', id))

  const pendingStep = await prisma.approvalStep.findFirst({
    where: { invoiceId: id, status: 'PENDING' }, orderBy: { level: 'asc' },
  })
  if (!pendingStep) return err({ code: 'APPROVAL_NOT_ALLOWED' as const, message: 'No pending approval step', httpStatus: 422 })

  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.update({ where: { id: pendingStep.id }, data: { status: 'APPROVED', comments, actionAt: new Date() } })
    await tx.invoice.update({ where: { id }, data: { status: 'APPROVED' } })
    // Any linked PO marked FULL by this invoice is now fully invoiced — flip
    // its status so it stops appearing in the "open POs" list.
    const fullLinks = await tx.invoicePOLink.findMany({
      where:  { invoiceId: id, consumptionType: 'FULL' },
      select: { poId: true },
    })
    if (fullLinks.length > 0) {
      await tx.purchaseOrder.updateMany({
        where: { id: { in: fullLinks.map(l => l.poId) }, tenantId: ctx.tenantId },
        data:  { status: 'FULLY_INVOICED' },
      })
    }
  })

  await writeAuditLog(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId,
    action: AuditAction.INVOICE_APPROVED, entityType: 'invoice', entityId: id,
    after: { comments }, ipAddress: ctx.ip,
  })

  // Accounting trigger — wrapped: accounting errors don't block approval.
  try {
    await triggerOnInvoiceApproval(prisma, id, { tenantId: ctx.tenantId, userId: ctx.userId })
  } catch (e) {
    console.error('[Accounting] trigger failed for invoice', id, e)
  }

  return ok(undefined)
}

// ── Reject ──

export async function rejectInvoice(
  prisma: PrismaClient, id: string, comments: string, ctx: Ctx
): Promise<Result<void>> {
  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId: ctx.tenantId } })
  if (!invoice) return err(Errors.notFound('Invoice', id))

  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.updateMany({ where: { invoiceId: id, status: 'PENDING' }, data: { status: 'REJECTED', comments, actionAt: new Date() } })
    await tx.invoice.update({ where: { id }, data: { status: 'REJECTED' } })
  })

  await writeAuditLog(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId,
    action: AuditAction.INVOICE_REJECTED, entityType: 'invoice', entityId: id,
    after: { comments }, ipAddress: ctx.ip,
  })

  return ok(undefined)
}
