// Side-effect glue called from the workflow approve / reject branches when
// an entityType='provision_batch' instance transitions. Provision JVs +
// their paired reversal JVs are written here so the workflow route stays
// thin and the provisions route stays focused on read paths.
//
// Posting model:
//   PROVISION JV          DR <expenseGL>   CR <provisionGL>   postingDate = last day of period
//   PROVISION_REVERSAL JV DR <provisionGL> CR <expenseGL>     postingDate = first day of next period
// The reversal JV is only created when proposal.reversalTrigger ===
// 'FIRST_OF_NEXT_MONTH'; MANUAL / ON_INVOICE_APPROVAL skip the reversal here
// (the trigger fires elsewhere when it's time).

import type { PrismaClient } from '@prisma/client'

export interface PostJVsResult {
  jvIds:         string[]
  reversalJvIds: string[]
}

export async function postBatchJVs(
  prisma:  PrismaClient,
  batchId: string,
  userId:  string,
): Promise<PostJVsResult> {
  const batch = await prisma.provisionBatch.findFirst({ where: { id: batchId } })
  if (!batch) throw new Error(`Provision batch ${batchId} not found`)

  const proposalIds = Array.isArray(batch.proposalIds) ? batch.proposalIds as string[] : []
  if (proposalIds.length === 0) return { jvIds: [], reversalJvIds: [] }

  const proposals = await prisma.provisionProposal.findMany({ where: { id: { in: proposalIds } } })
  const jvIds: string[] = []
  const reversalJvIds: string[] = []

  for (const p of proposals) {
    const amount = Number(p.approvedAmount ?? p.proposedAmount)
    if (amount <= 0) continue

    const provJv = await prisma.journalEntry.create({
      data: {
        tenantId:     batch.tenantId,
        entryDate:    lastOfPeriod(batch.period),
        postingDate:  lastOfPeriod(batch.period),
        period:       batch.period,
        entryType:    'PROVISION',
        debitGlCode:  p.expenseGlCode,
        creditGlCode: p.provisionGlCode,
        amount,
        narration:    p.narration ?? `Provision: ${p.description}`,
        createdBy:    userId,
      },
    })
    jvIds.push(provJv.id)

    let reversalId: string | null = null
    if (p.reversalTrigger === 'FIRST_OF_NEXT_MONTH') {
      const reversalJv = await prisma.journalEntry.create({
        data: {
          tenantId:     batch.tenantId,
          entryDate:    firstOfNextMonth(batch.period),
          postingDate:  firstOfNextMonth(batch.period),
          period:       nextPeriodKey(batch.period),
          entryType:    'PROVISION_REVERSAL',
          debitGlCode:  p.provisionGlCode,
          creditGlCode: p.expenseGlCode,
          amount,
          narration:    `Reversal: ${p.description}`,
          reversalOfId: provJv.id,
          createdBy:    userId,
        },
      })
      await prisma.journalEntry.update({
        where: { id: provJv.id },
        data:  { reversalJvId: reversalJv.id },
      })
      reversalJvIds.push(reversalJv.id)
      reversalId = reversalJv.id
    }

    await prisma.provisionProposal.update({
      where: { id: p.id },
      data: {
        status:         'APPROVED',
        approvedAmount: amount,
        jvId:           provJv.id,
        reversalJvId:   reversalId,
        approvedAt:     new Date(),
        reviewedBy:     userId,
      },
    })
  }

  await prisma.provisionBatch.update({
    where: { id: batch.id },
    data:  { status: 'APPROVED', approvedAt: new Date(), approvedBy: userId },
  })

  return { jvIds, reversalJvIds }
}

export async function rejectBatch(prisma: PrismaClient, batchId: string): Promise<void> {
  const batch = await prisma.provisionBatch.findFirst({ where: { id: batchId } })
  if (!batch) return
  const proposalIds = Array.isArray(batch.proposalIds) ? batch.proposalIds as string[] : []
  await prisma.provisionProposal.updateMany({
    where: { id: { in: proposalIds } },
    data:  { status: 'DRAFT', batchId: null },
  })
  await prisma.provisionBatch.update({
    where: { id: batch.id },
    data:  { status: 'REJECTED' },
  })
}

function lastOfPeriod(period: string): Date {
  const [y, m] = period.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0))
}
function firstOfNextMonth(period: string): Date {
  const [y, m] = period.split('-').map(Number)
  return new Date(Date.UTC(y, m, 1))
}
function nextPeriodKey(period: string): string {
  const [y, m] = period.split('-').map(Number)
  const next = new Date(Date.UTC(y, m, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}
