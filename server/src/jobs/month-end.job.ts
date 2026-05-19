// Month-end close — orchestrates the three-step closing process for a tenant:
//   1. Provisions  — post PROVISION JV + paired PROVISION_REVERSAL for every
//                    ACTIVE schedule due in the period, unless the item was
//                    invoiced in-month (nullification handled in invoice
//                    approval trigger).
//   2. Amortizations — for every ACTIVE schedule, post AMORTIZATION JVs for
//                    months due up to `period`. Closes the schedule when its
//                    final month is posted.
//   3. Execute reversals — find PROVISION_REVERSAL JVs whose postingDate is
//                    today-or-past and whose source provision is still
//                    POSTED (not NULLIFIED). Mark the source REVERSED.
//
// Dry-run mode (`preview=true`) computes the same plan without writing any
// rows — used by the "What will be posted" panel before the user commits.

import type { PrismaClient } from '@prisma/client'
import {
  buildProvisionJV, buildReversalJV, computeNextRunDate,
  type ProvisionScheduleInput, type JournalEntryLike,
} from '../services/provision-engine.service.js'
import {
  buildAmortizationJV, computeAmortizationSchedule, isAmortizationDue,
  type AmortizationScheduleInput,
} from '../services/amortization-engine.service.js'

interface Ctx { tenantId: string; userId: string }

export interface MonthEndJvSummary {
  id:            string
  entryType:     string
  amount:        number
  debit:         string
  credit:        string
  narration:     string
  postingDate:   string
  invoiceId?:    string | null
  scheduleId?:   string | null
}

export interface MonthEndResult {
  period:              string
  provisionsPosted:    number
  amortizationsPosted: number
  reversalsExecuted:   number
  reversalsSkipped:    number
  jvs:                 MonthEndJvSummary[]
  dryRun:              boolean
}

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n) }

function lastDayOfPeriod(period: string): Date {
  const [y, m] = period.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0))
}

function firstDayOfPeriod(period: string): Date {
  const [y, m] = period.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1))
}

function monthBetween(period: string, target: string): boolean {
  return target <= period
}

function previousMonth(period: string): string {
  const [yStr, mStr] = period.split('-')
  let y = Number(yStr), m = Number(mStr) - 1
  if (m === 0) { m = 12; y-- }
  return `${y}-${pad2(m)}`
}

function summary(jv: { id: string; entryType: string; amount: unknown; debitGlCode: string; creditGlCode: string; narration: string; postingDate: Date; invoiceId: string | null; provisionScheduleId?: string | null; amortizationScheduleId?: string | null }): MonthEndJvSummary {
  return {
    id:          jv.id,
    entryType:   jv.entryType,
    amount:      Number(jv.amount),
    debit:       jv.debitGlCode,
    credit:      jv.creditGlCode,
    narration:   jv.narration,
    postingDate: jv.postingDate.toISOString().slice(0, 10),
    invoiceId:   jv.invoiceId,
    scheduleId:  jv.provisionScheduleId ?? jv.amortizationScheduleId ?? null,
  }
}

export async function runMonthEnd(
  prisma:  PrismaClient,
  ctx:     Ctx,
  period:  string,
  options: { dryRun?: boolean } = {},
): Promise<MonthEndResult> {
  const dryRun = !!options.dryRun
  const periodEnd = lastDayOfPeriod(period)

  let provisionsPosted = 0
  let amortizationsPosted = 0
  let reversalsExecuted = 0
  let reversalsSkipped = 0
  const jvs: MonthEndJvSummary[] = []

  // ── Step 1: Provisions ──────────────────────────────────────────────
  const schedules = await prisma.provisionSchedule.findMany({
    where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
  })

  // Preload item names in one go (avoid N+1 across schedules)
  const itemIds  = [...new Set(schedules.map(s => s.itemId))]
  const items    = itemIds.length > 0
    ? await prisma.itemMaster.findMany({ where: { id: { in: itemIds }, tenantId: ctx.tenantId }, select: { id: true, name: true } })
    : []
  const itemMap  = Object.fromEntries(items.map(i => [i.id, i.name]))

  for (const s of schedules) {
    // Skip if not due in/before this period — the next-run date determines eligibility
    if (s.nextRunDate && s.nextRunDate.getTime() > periodEnd.getTime()) continue

    // Skip if any invoice was approved this month for this item (the invoice
    // approval trigger has already nullified the open provision; posting a
    // new one would double-count)
    const invoicedThisMonth = await prisma.invoice.findFirst({
      where: {
        tenantId: ctx.tenantId, status: { in: ['APPROVED', 'PAID'] },
        invoiceDate: { gte: firstDayOfPeriod(period), lte: lastDayOfPeriod(period) },
        lines: { some: { itemId: s.itemId } },
        ...(s.vendorId ? { vendorId: s.vendorId } : {}),
      },
      select: { id: true },
    })
    if (invoicedThisMonth) continue

    const input: ProvisionScheduleInput = {
      id: s.id, tenantId: s.tenantId, itemId: s.itemId, vendorId: s.vendorId,
      frequency: s.frequency, amount: Number(s.amount), basis: s.basis, status: s.status,
      lastRunDate: s.lastRunDate, nextRunDate: s.nextRunDate,
      expenseGlCode: s.expenseGlCode, provisionGlCode: s.provisionGlCode,
    }

    const provData = buildProvisionJV(input, periodEnd, ctx.userId, { itemName: itemMap[s.itemId] })

    if (dryRun) {
      jvs.push({
        id: `(preview)`, entryType: provData.entryType, amount: provData.amount,
        debit: provData.debitGlCode, credit: provData.creditGlCode,
        narration: provData.narration, postingDate: provData.postingDate.toISOString().slice(0, 10),
        invoiceId: null, scheduleId: s.id,
      })
      provisionsPosted++
      // Also preview the reversal
      jvs.push({
        id: `(preview)`, entryType: 'PROVISION_REVERSAL', amount: provData.amount,
        debit: provData.creditGlCode, credit: provData.debitGlCode,
        narration: `Reversal of ${provData.narration}`,
        postingDate: new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth() + 1, 1)).toISOString().slice(0, 10),
        invoiceId: null, scheduleId: s.id,
      })
      continue
    }

    await prisma.$transaction(async tx => {
      const created = await tx.journalEntry.create({ data: provData })
      const reversal = buildReversalJV(
        { ...created, amount: Number(created.amount) } as unknown as JournalEntryLike,
        periodEnd, ctx.userId,
      )
      const revRow = await tx.journalEntry.create({ data: reversal })
      // Stash the pair on both rows for quick lookup later
      await tx.journalEntry.update({ where: { id: created.id }, data: { reversalJvId: revRow.id } })

      const nextRun = computeNextRunDate(periodEnd, (s.frequency as 'MONTHLY' | 'QUARTERLY'))
      await tx.provisionSchedule.update({
        where: { id: s.id },
        data:  { lastRunDate: periodEnd, nextRunDate: nextRun },
      })
      jvs.push(summary(created))
      jvs.push(summary(revRow))
    })
    provisionsPosted++
  }

  // ── Step 2: Amortizations ───────────────────────────────────────────
  const amortSchedules = await prisma.amortizationSchedule.findMany({
    where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
  })

  for (const s of amortSchedules) {
    // Find months already posted for this schedule
    const alreadyPosted = await prisma.journalEntry.findMany({
      where:  { tenantId: ctx.tenantId, amortizationScheduleId: s.id, entryType: 'AMORTIZATION', status: 'POSTED' },
      select: { period: true },
    })
    const postedSet = new Set(alreadyPosted.map(p => p.period))

    const allRows = computeAmortizationSchedule(
      Number(s.totalAmount), s.periodFrom, s.periodTo,
      (s.basis as 'STRAIGHT_LINE' | 'DAY_APPORTIONED'),
    )

    const input: AmortizationScheduleInput = {
      id: s.id, tenantId: s.tenantId, invoiceId: s.invoiceId, invoiceLineId: s.invoiceLineId,
      totalAmount: Number(s.totalAmount), monthlyAmount: Number(s.monthlyAmount),
      periodFrom: s.periodFrom, periodTo: s.periodTo, totalMonths: s.totalMonths,
      basis: s.basis, status: s.status,
      expenseGlCode: s.expenseGlCode, prepaidGlCode: s.prepaidGlCode, apGlCode: s.apGlCode,
    }

    let postedAny = false
    for (const row of allRows) {
      // Only post months that are due (month <= current period) and not yet posted
      if (!monthBetween(period, row.month)) continue
      if (!isAmortizationDue(input, row.month, postedSet)) continue

      const jvData = buildAmortizationJV(input, row.month, row.amount, ctx.userId)

      if (dryRun) {
        jvs.push({
          id: `(preview)`, entryType: jvData.entryType, amount: jvData.amount,
          debit: jvData.debitGlCode, credit: jvData.creditGlCode,
          narration: jvData.narration, postingDate: jvData.postingDate.toISOString().slice(0, 10),
          invoiceId: jvData.invoiceId ?? null, scheduleId: s.id,
        })
        amortizationsPosted++
        postedAny = true
        continue
      }

      const created = await prisma.journalEntry.create({ data: jvData })
      jvs.push(summary(created))
      amortizationsPosted++
      postedAny = true
    }

    // If all months are now posted (count from allRows vs posted+just-posted),
    // close the schedule.
    if (!dryRun && postedAny) {
      const refreshed = await prisma.journalEntry.findMany({
        where:  { tenantId: ctx.tenantId, amortizationScheduleId: s.id, entryType: 'AMORTIZATION' },
        select: { period: true },
      })
      if (refreshed.length >= allRows.length) {
        await prisma.amortizationSchedule.update({
          where: { id: s.id }, data: { status: 'COMPLETED' },
        })
      }
    }
  }

  // ── Step 3: Execute scheduled reversals ─────────────────────────────
  // Find PROVISION_REVERSAL JVs whose postingDate falls in this period (or
  // earlier) and haven't been actioned. Their source PROVISION decides what
  // happens: NULLIFIED → mark this reversal SKIP_REVERSAL; otherwise mark
  // the source REVERSED.
  // We only process reversals that we created in the *previous* period
  // (their postingDate is 1st-of-this-period). Older reversals already
  // ran in previous closes.
  const prevPeriod = previousMonth(period)
  const dueReversals = await prisma.journalEntry.findMany({
    where: {
      tenantId: ctx.tenantId, entryType: 'PROVISION_REVERSAL',
      period: { in: [prevPeriod, period] },
      status: 'POSTED',  // not yet acted on
      postingDate: { lte: periodEnd },
    },
  })

  for (const rev of dueReversals) {
    if (!rev.reversalOfId) continue
    const source = await prisma.journalEntry.findFirst({ where: { id: rev.reversalOfId } })
    if (!source) continue

    if (source.status === 'NULLIFIED') {
      if (dryRun) { reversalsSkipped++; continue }
      await prisma.journalEntry.update({
        where: { id: rev.id }, data: { status: 'SKIP_REVERSAL', reversalSkipped: true },
      })
      reversalsSkipped++
    } else {
      if (dryRun) { reversalsExecuted++; continue }
      await prisma.$transaction([
        prisma.journalEntry.update({ where: { id: rev.id },    data: { status: 'POSTED' /* now considered active */ } }),
        prisma.journalEntry.update({ where: { id: source.id }, data: { status: 'REVERSED' } }),
      ])
      reversalsExecuted++
    }
  }

  return {
    period,
    provisionsPosted, amortizationsPosted, reversalsExecuted, reversalsSkipped,
    jvs, dryRun,
  }
}
