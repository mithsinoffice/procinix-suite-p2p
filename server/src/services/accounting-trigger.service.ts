// Side-effect glue that fires when an invoice is approved. Reads invoice +
// lines + GL setup, then orchestrates the pure helpers from
// provision-engine and amortization-engine to write JV rows.
//
// Three branches:
//   A. Multi-month period   → AmortizationSchedule + ACCRUAL JV (DR prepaid)
//                             + first-month AMORTIZATION JV if already due
//   B. Single-month / no period → simple ACCRUAL JV (DR expense, CR AP)
//   C. Open provision exists for this item+vendor in the invoice's period
//                             → NULLIFICATION JV + flip original PROVISION
//                             status → NULLIFIED + mark paired reversal SKIP
//
// GL resolution falls back in this order:
//   expense: line.glCodeId → itemEntityMapping.expenseGlCodeId
//            → invoice.glCodeId (direct invoices) → default '5080' (Misc)
//   prepaid: tenant GL named matching /prepaid/i → default '1060'
//   AP:      tenant GL with accountType=LIABILITY + name matching
//            /accounts? payable/i → default '2030'

import type { PrismaClient } from '@prisma/client'
import { buildAccrualJV, buildAmortizationJV, computeAmortizationSchedule, type AmortizationBasis } from './amortization-engine.service.js'
import { buildNullificationJV, periodOf, type JournalEntryLike } from './provision-engine.service.js'

interface Ctx { tenantId: string; userId: string }

// Cached per-tenant defaults — fetched once per trigger run; falls back to
// hardcoded codes when the tenant has no matching GL row (e.g. fresh
// install). Returning codes (strings), not ids — JournalEntry stores codes.
async function resolveTenantDefaults(prisma: PrismaClient, tenantId: string): Promise<{ prepaidGlCode: string; apGlCode: string }> {
  const [prepaid, ap] = await Promise.all([
    prisma.glCode.findFirst({
      where: { tenantId, status: 'ACTIVE', accountType: 'ASSET', name: { contains: 'Prepaid' } },
      select: { code: true },
    }),
    prisma.glCode.findFirst({
      where: { tenantId, status: 'ACTIVE', accountType: 'LIABILITY', name: { contains: 'Payable' } },
      select: { code: true },
    }),
  ])
  return {
    prepaidGlCode: prepaid?.code ?? '1060',
    apGlCode:      ap?.code      ?? '2030',
  }
}

async function resolveLineGlCode(
  prisma: PrismaClient,
  tenantId: string,
  line: { glCodeId: string | null, itemId: string | null },
  invoice: { entityId: string | null, glCodeId: string | null },
): Promise<string> {
  // 1. line-level GL
  if (line.glCodeId) {
    const gl = await prisma.glCode.findFirst({ where: { id: line.glCodeId, tenantId }, select: { code: true } })
    if (gl) return gl.code
  }
  // 2. item entity mapping
  if (line.itemId && invoice.entityId) {
    const map = await prisma.itemEntityMapping.findFirst({
      where:  { itemId: line.itemId, entityId: invoice.entityId },
      select: { expenseGlCodeId: true },
    })
    if (map?.expenseGlCodeId) {
      const gl = await prisma.glCode.findFirst({ where: { id: map.expenseGlCodeId, tenantId }, select: { code: true } })
      if (gl) return gl.code
    }
  }
  // 3. invoice-level GL (direct invoice)
  if (invoice.glCodeId) {
    const gl = await prisma.glCode.findFirst({ where: { id: invoice.glCodeId, tenantId }, select: { code: true } })
    if (gl) return gl.code
  }
  // 4. fallback to miscellaneous
  return '5080'
}

// Months spanned by [from..to] — used to short-circuit branch A vs B.
function monthsSpanned(from: Date, to: Date): number {
  const fy = from.getUTCFullYear(), fm = from.getUTCMonth()
  const ty = to.getUTCFullYear(),   tm = to.getUTCMonth()
  return (ty - fy) * 12 + (tm - fm) + 1
}

export interface TriggerResult {
  accrualJvId?:         string
  amortizationScheduleId?: string
  firstAmortizationJvId?: string
  nullifications?:      { originalJvId: string, nullificationJvId: string }[]
  skipped?:             string  // reason if nothing posted
}

// Main entry point. Idempotent on retry — the unique constraint on
// (tenantId, invoiceId, entryType='ACCRUAL') is not enforced at the DB level,
// so the caller (workflow approve route) must only call this once per
// finalStatus=APPROVED transition. Guarded by status flip in the same tx.
export async function triggerOnInvoiceApproval(
  prisma: PrismaClient,
  invoiceId: string,
  ctx: Ctx,
): Promise<TriggerResult> {
  const invoice = await prisma.invoice.findFirst({
    where:  { id: invoiceId, tenantId: ctx.tenantId },
    include: {
      lines: { orderBy: { lineNumber: 'asc' } },
      vendor: { select: { id: true, legalName: true } },
    },
  })
  if (!invoice) return { skipped: 'INVOICE_NOT_FOUND' }

  // Already triggered? — bail to keep idempotent
  const existing = await prisma.journalEntry.findFirst({
    where: { tenantId: ctx.tenantId, invoiceId, entryType: { in: ['ACCRUAL', 'AMORTIZATION'] } },
  })
  if (existing) return { skipped: 'ALREADY_TRIGGERED' }

  const defaults = await resolveTenantDefaults(prisma, ctx.tenantId)
  const result: TriggerResult = { nullifications: [] }

  const hasPeriod    = !!(invoice.periodFrom && invoice.periodTo)
  const totalAmount  = Number(invoice.totalAmount)
  const invoiceDate  = invoice.invoiceDate

  // ── Branch A: multi-month amortization ────────────────────────────────
  // Use line[0] for GL resolution (the typical case has a single dominant
  // expense line; if you ever need per-line schedules, extend this loop
  // and create one AmortizationSchedule per line).
  const firstLine = invoice.lines[0] ?? null
  if (hasPeriod && invoice.periodFrom && invoice.periodTo) {
    const months = monthsSpanned(invoice.periodFrom, invoice.periodTo)
    if (months > 1) {
      const expenseGl = firstLine
        ? await resolveLineGlCode(prisma, ctx.tenantId, firstLine, invoice)
        : '5080'

      const schedule = await prisma.amortizationSchedule.create({
        data: {
          tenantId:      ctx.tenantId,
          invoiceId:     invoice.id,
          invoiceLineId: firstLine?.id ?? null,
          totalAmount,
          monthlyAmount: totalAmount / months,
          periodFrom:    invoice.periodFrom,
          periodTo:      invoice.periodTo,
          totalMonths:   months,
          basis:         'STRAIGHT_LINE',
          status:        'ACTIVE',
          expenseGlCode: expenseGl,
          prepaidGlCode: defaults.prepaidGlCode,
          apGlCode:      defaults.apGlCode,
        },
      })
      result.amortizationScheduleId = schedule.id

      // ACCRUAL JV: DR prepaid, CR AP, full invoice amount
      const accrual = buildAccrualJV(
        {
          id:           invoice.id,
          tenantId:     ctx.tenantId,
          totalAmount,
          invoiceDate,
          invoiceRef:   invoice.invoiceRef ?? invoice.invoiceNumber,
          currencyCode: invoice.currencyCode,
        },
        { debitGlCode: defaults.prepaidGlCode, creditGlCode: defaults.apGlCode },
        ctx.userId,
      )
      const accrualRow = await prisma.journalEntry.create({ data: { ...accrual, invoiceId: invoice.id } })
      result.accrualJvId = accrualRow.id

      // First-month AMORTIZATION JV if periodFrom month <= current invoice month
      const rows = computeAmortizationSchedule(totalAmount, invoice.periodFrom, invoice.periodTo, 'STRAIGHT_LINE')
      const currentMonth = periodOf(invoice.periodFrom)
      const firstRow = rows.find(r => r.month === currentMonth)
      if (firstRow) {
        const jv = buildAmortizationJV(
          {
            id: schedule.id, tenantId: ctx.tenantId, invoiceId: invoice.id, invoiceLineId: firstLine?.id ?? null,
            totalAmount, monthlyAmount: schedule.monthlyAmount as never as number,
            periodFrom: invoice.periodFrom, periodTo: invoice.periodTo, totalMonths: months,
            basis: 'STRAIGHT_LINE' as AmortizationBasis, status: 'ACTIVE',
            expenseGlCode: expenseGl, prepaidGlCode: defaults.prepaidGlCode, apGlCode: defaults.apGlCode,
          },
          firstRow.month,
          firstRow.amount,
          ctx.userId,
          { invoiceRef: invoice.invoiceRef ?? invoice.invoiceNumber },
        )
        const jvRow = await prisma.journalEntry.create({ data: jv })
        result.firstAmortizationJvId = jvRow.id
      }
    }
  }

  // ── Branch B: single-month / no period (simple ACCRUAL) ───────────────
  // Skip if we already posted the multi-month accrual above. Use line[0]'s
  // expense GL or the invoice's direct-allocation GL.
  if (!result.accrualJvId) {
    const expenseGl = firstLine
      ? await resolveLineGlCode(prisma, ctx.tenantId, firstLine, invoice)
      : invoice.glCodeId
        ? (await prisma.glCode.findFirst({ where: { id: invoice.glCodeId, tenantId: ctx.tenantId }, select: { code: true } }))?.code ?? '5080'
        : '5080'

    const accrual = buildAccrualJV(
      {
        id:           invoice.id,
        tenantId:     ctx.tenantId,
        totalAmount,
        invoiceDate,
        invoiceRef:   invoice.invoiceRef ?? invoice.invoiceNumber,
        currencyCode: invoice.currencyCode,
      },
      { debitGlCode: expenseGl, creditGlCode: defaults.apGlCode },
      ctx.userId,
    )
    const row = await prisma.journalEntry.create({ data: { ...accrual, invoiceId: invoice.id } })
    result.accrualJvId = row.id
  }

  // ── Branch C: nullify open provisions for this item+vendor+period ─────
  // Scan invoice lines for item ids that have an ACTIVE ProvisionSchedule
  // whose vendor matches (or vendor is null). For each match, find the
  // open PROVISION JV for the current month, post NULLIFICATION, flip
  // statuses.
  const invPeriod = periodOf(invoice.invoiceDate)
  for (const line of invoice.lines) {
    if (!line.itemId) continue
    const schedule = await prisma.provisionSchedule.findFirst({
      where: {
        tenantId: ctx.tenantId, itemId: line.itemId, status: 'ACTIVE',
        OR: [
          { vendorId: invoice.vendorId },
          { vendorId: null },
        ],
      },
    })
    if (!schedule) continue

    const openProvision = await prisma.journalEntry.findFirst({
      where: {
        tenantId: ctx.tenantId, provisionScheduleId: schedule.id,
        entryType: 'PROVISION', status: 'POSTED', period: invPeriod,
      },
    })
    if (!openProvision) continue

    const nullification = buildNullificationJV(
      openProvision as unknown as JournalEntryLike,
      invoice.id, invoiceDate, ctx.userId,
    )
    const nfRow = await prisma.$transaction(async tx => {
      const r = await tx.journalEntry.create({ data: nullification })
      await tx.journalEntry.update({ where: { id: openProvision.id }, data: { status: 'NULLIFIED' } })
      // Mark the paired reversal as SKIP_REVERSAL (lookup by reversalOfId)
      const reversal = await tx.journalEntry.findFirst({
        where: { tenantId: ctx.tenantId, reversalOfId: openProvision.id, entryType: 'PROVISION_REVERSAL' },
      })
      if (reversal) {
        await tx.journalEntry.update({
          where: { id: reversal.id },
          data:  { status: 'SKIP_REVERSAL', reversalSkipped: true },
        })
      }
      return r
    })
    result.nullifications!.push({ originalJvId: openProvision.id, nullificationJvId: nfRow.id })
  }

  return result
}
