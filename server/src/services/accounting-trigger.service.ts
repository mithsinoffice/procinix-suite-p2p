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
//   AP:      see resolveApGlCodeFromList — exact name → 203x code range →
//            /accounts payable/i → /payable/i last-resort → throws if none.
//            Loose /payable/i match was demoted because it would otherwise
//            return TDS Payable for the AP credit leg, which silently
//            mis-allocates the liability and breaks reconciliation.

import type { PrismaClient } from '@prisma/client'
import { buildAccrualJV, buildAmortizationJV, computeAmortizationSchedule, type AmortizationBasis } from './amortization-engine.service.js'
import { buildNullificationJV, periodOf, type JournalEntryLike } from './provision-engine.service.js'

interface Ctx { tenantId: string; userId: string }

// Pure resolver — chooses the Accounts Payable GL code from a list of the
// tenant's LIABILITY GLs. Exported so the priority can be unit-tested
// without a live DB. Priority is strict and order-sensitive: an earlier
// match short-circuits later steps.
//
//   1. Exact name match `accounts payable` (case-insensitive)
//   2. Code starts with '203' — matches the seed range
//      (2030 IT Vendors / 2031 Services / 2032 Rent)
//   3. Name contains `accounts payable` (handles "Accounts Payable — Foo")
//   4. Last-resort: name contains `payable` — only fires when nothing
//      better exists. Picking TDS Payable here mis-allocates the liability,
//      so this step is intentionally last.
//
// Returns null when no candidate matches; the DB-aware wrapper throws.
export function resolveApGlCodeFromList(gls: { code: string; name: string }[]): string | null {
  const exact = gls.find(g => g.name.toLowerCase() === 'accounts payable')
  if (exact) return exact.code

  const codeRange = gls.find(g => g.code.startsWith('203'))
  if (codeRange) return codeRange.code

  const fuzzy = gls.find(g => g.name.toLowerCase().includes('accounts payable'))
  if (fuzzy) return fuzzy.code

  const fallback = gls.find(g => g.name.toLowerCase().includes('payable'))
  if (fallback) return fallback.code

  return null
}

async function resolveApGlCode(
  prisma:   PrismaClient,
  tenantId: string,
  entityId: string | null,
): Promise<string> {
  const gls = await prisma.glCode.findMany({
    where:   { tenantId, status: 'ACTIVE', accountType: 'LIABILITY' },
    select:  { code: true, name: true },
    orderBy: { code: 'asc' },
  })
  const code = resolveApGlCodeFromList(gls)
  if (!code) {
    throw new Error(
      `No Accounts Payable GL found for entity ${entityId ?? '(default)'} — ` +
      `configure AP GL in entity master or seed GL codes starting with 203x`,
    )
  }
  return code
}

// Cached per-tenant defaults — fetched once per trigger run. Prepaid uses
// the loose /prepaid/i match (only one match in the seed); AP delegates to
// the strict resolver above which throws on miss.
async function resolveTenantDefaults(
  prisma:   PrismaClient,
  tenantId: string,
  entityId: string | null,
): Promise<{ prepaidGlCode: string; apGlCode: string }> {
  const [prepaid, apCode] = await Promise.all([
    prisma.glCode.findFirst({
      where:  { tenantId, status: 'ACTIVE', accountType: 'ASSET', name: { contains: 'Prepaid' } },
      select: { code: true },
    }),
    resolveApGlCode(prisma, tenantId, entityId),
  ])
  return {
    prepaidGlCode: prepaid?.code ?? '1060',
    apGlCode:      apCode,
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

  const defaults = await resolveTenantDefaults(prisma, ctx.tenantId, invoice.entityId)
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
