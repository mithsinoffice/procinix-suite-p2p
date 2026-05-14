import type { PrismaClient } from '@prisma/client'
import { ok, err, Errors, type Result } from '../lib/result.js'
import { writeAuditLog, AuditAction } from '../lib/audit.js'
import type { Redis } from '../lib/redis.js'

// ── Types ──

export interface InvoiceLineInput {
  lineNumber:    number
  description:   string
  quantity:      number
  unitPrice:     number
  taxCodeId?:    string
  isRcm?:        boolean
  glCodeId?:     string
  costCentreId?: string
}

export interface InvoiceCreateInput {
  invoiceNumber: string
  vendorId:      string
  invoiceDate:   string
  dueDate?:      string
  currency?:     string
  glCodeId?:     string
  costCentreId?: string
  departmentId?: string
  poId?:         string
  grnId?:        string
  narration?:    string
  lines:         InvoiceLineInput[]
}

interface Ctx { tenantId: string; userId: string; ip?: string }

// ── Totals calculator ──

async function calcTotals(prisma: PrismaClient, tenantId: string, lines: InvoiceLineInput[], vendorId: string) {
  const taxCodeIds = [...new Set(lines.map(l => l.taxCodeId).filter(Boolean))] as string[]
  const [taxCodes] = await Promise.all([
    taxCodeIds.length ? prisma.taxCode.findMany({ where: { id: { in: taxCodeIds }, tenantId } }) : Promise.resolve([]),
    prisma.vendor.findFirst({ where: { id: vendorId, tenantId }, select: { tdsApplicable: true, gstin: true } }),
  ])

  const tcMap = Object.fromEntries(taxCodes.map(t => [t.id, t]))

  let subtotal = 0, taxAmount = 0, tdsAmount = 0
  const enrichedLines = lines.map(line => {
    const amount  = Number(line.quantity) * Number(line.unitPrice)
    const tc      = line.taxCodeId ? tcMap[line.taxCodeId] : null
    const cgst    = tc && !line.isRcm ? amount * Number(tc.cgstRate) / 100 : 0
    const sgst    = tc && !line.isRcm ? amount * Number(tc.sgstRate) / 100 : 0
    const igst    = tc && !line.isRcm ? amount * Number(tc.igstRate) / 100 : 0
    const lineTax = cgst + sgst + igst
    subtotal  += amount
    taxAmount += lineTax
    return { ...line, amount, cgst, sgst, igst, tdsAmount: 0 }
  })

  const totalAmount = subtotal + taxAmount
  const netPayable  = totalAmount - tdsAmount
  return { enrichedLines, subtotal, taxAmount, tdsAmount, totalAmount, netPayable }
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
  const { enrichedLines, subtotal, taxAmount, tdsAmount, totalAmount, netPayable } =
    await calcTotals(prisma, ctx.tenantId, input.lines, input.vendorId)

  // 4. Create invoice + lines in transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        tenantId:        ctx.tenantId,
        invoiceNumber:   input.invoiceNumber,
        vendorId:        input.vendorId,
        invoiceDate:     new Date(input.invoiceDate),
        dueDate:         input.dueDate ? new Date(input.dueDate) : null,
        currency:        input.currency ?? 'INR',
        subtotal,
        taxAmount,
        tdsAmount,
        totalAmount,
        netPayable,
        glCodeId:        input.glCodeId,
        costCentreId:    input.costCentreId,
        departmentId:    input.departmentId,
        poId:            input.poId,
        grnId:           input.grnId,
        narration:       input.narration,
        status:          'DRAFT',
        approvalLane:    'MANUAL',
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
        amount:       l.amount,
        taxCodeId:    l.taxCodeId,
        cgst:         l.cgst,
        sgst:         l.sgst,
        igst:         l.igst,
        tdsAmount:    l.tdsAmount,
        isRcm:        l.isRcm ?? false,
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
      vendor:    { select: { legalName: true, vendorCode: true, gstin: true, pan: true, panCompliance: true } },
      lines:     { orderBy: { lineNumber: 'asc' } },
      approvals: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!invoice) return err(Errors.notFound('Invoice', id))
  return ok(invoice)
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
  })

  await writeAuditLog(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId,
    action: AuditAction.INVOICE_APPROVED, entityType: 'invoice', entityId: id,
    after: { comments }, ipAddress: ctx.ip,
  })

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
