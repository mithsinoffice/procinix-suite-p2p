// TDS challan helpers — pure functions that compute the monthly TDS
// aggregation owed to the government, plus the DB upsert for the
// tds_challans table.
//
// Statutory rule: TDS deducted in month M is due to the government by the
// 7th of month M+1 (TDS rules under Income Tax Act §200). After that date
// it's overdue and attracts interest under §201(1A).

import type { PrismaClient } from '@prisma/client'

// ── Due date: 7th of the month following `period` ─────────────────────────
// Dec → Jan year-roll handled; Feb has no special case (always 28/29 + 7).
export function computeChallanDueDate(period: string): Date {
  if (!/^\d{4}-\d{2}$/.test(period)) {
    throw new Error(`Invalid period "${period}" — expected YYYY-MM`)
  }
  const [yStr, mStr] = period.split('-')
  let y = Number(yStr)
  let m = Number(mStr) // 1-based
  m += 1
  if (m > 12) { m = 1; y += 1 }
  // Month is 0-based in Date.UTC, so subtract 1
  return new Date(Date.UTC(y, m - 1, 7))
}

// ── Grouping: sum line.tdsAmount by tdsSection ────────────────────────────
export interface TdsChallanLine {
  tdsSection: string | null
  tdsAmount:  number
}

export interface TdsChallanGroup {
  tdsSection: string
  amount:     number
}

export function groupLinesByTdsSection(lines: TdsChallanLine[]): TdsChallanGroup[] {
  const map = new Map<string, number>()
  for (const l of lines) {
    if (!l.tdsSection || l.tdsAmount <= 0) continue
    map.set(l.tdsSection, (map.get(l.tdsSection) ?? 0) + Number(l.tdsAmount))
  }
  return [...map.entries()]
    .map(([tdsSection, amount]) => ({ tdsSection, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => a.tdsSection.localeCompare(b.tdsSection))
}

// ── DB upsert — additive (existing PENDING challan accumulates) ───────────
// If a challan for (tenant, period, section) already exists in PENDING
// status, the new amount is added. Once a challan is DEPOSITED (challan
// number recorded), further withholding for that section in the same
// period creates a new challan row — the deposited one is locked.
export async function upsertChallans(
  prisma:  PrismaClient,
  tenantId: string,
  period:   string,
  groups:   TdsChallanGroup[],
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0
  const dueDate = computeChallanDueDate(period)

  for (const g of groups) {
    const existing = await prisma.tdsChallan.findFirst({
      where: { tenantId, period, tdsSection: g.tdsSection, status: 'PENDING' },
    })
    if (existing) {
      await prisma.tdsChallan.update({
        where: { id: existing.id },
        data:  { amount: { increment: g.amount } },
      })
      updated++
    } else {
      await prisma.tdsChallan.create({
        data: { tenantId, period, tdsSection: g.tdsSection, amount: g.amount, dueDate, status: 'PENDING' },
      })
      created++
    }
  }
  return { created, updated }
}
