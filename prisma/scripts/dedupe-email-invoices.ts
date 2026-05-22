// One-shot dedupe: keep the newest (createdAt desc) Invoice per
// (tenantId, invoiceNumber) where channelType = 'EMAIL'; delete the rest.
//
// Run: tsx /tmp/dedupe-email-invoices.ts
//
// The Invoice cascade (per prisma/schema.prisma) handles InvoiceLine,
// InvoiceAuditLog and InvoicePOLink — those rows go with their parent.
// InvoiceIngestionJob.invoiceId is a nullable relation without onDelete:
// those rows survive and orphan-point to nothing (harmless — they're
// ingestion logs, not transactional data).

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.invoice.findMany({
    where:   { channelType: 'EMAIL' },
    select:  { id: true, tenantId: true, invoiceNumber: true, createdAt: true, status: true },
    orderBy: [{ tenantId: 'asc' }, { invoiceNumber: 'asc' }, { createdAt: 'desc' }],
  })

  console.log(`Scanned ${rows.length} EMAIL-channel invoices across all tenants.`)

  // Group by (tenantId | invoiceNumber). Within each group the rows are
  // already sorted newest-first by the orderBy above, so the first is the
  // keeper and the tail is the duplicate set.
  const groups = new Map<string, typeof rows>()
  for (const inv of rows) {
    const key = `${inv.tenantId}|${inv.invoiceNumber ?? '(null)'}`
    const bucket = groups.get(key)
    if (bucket) bucket.push(inv)
    else groups.set(key, [inv])
  }

  const toDelete: string[] = []
  let groupCount = 0
  for (const [key, bucket] of groups) {
    if (bucket.length <= 1) continue
    groupCount++
    const [keep, ...dupes] = bucket
    console.log(
      `\n  ${key}`
      + `\n    keep ${keep.id}  ${keep.createdAt.toISOString()}  ${keep.status}`,
    )
    for (const d of dupes) {
      console.log(`    drop ${d.id}  ${d.createdAt.toISOString()}  ${d.status}`)
      toDelete.push(d.id)
    }
  }

  if (toDelete.length === 0) {
    console.log('\nNo duplicates found. Nothing to delete.')
    return
  }

  console.log(`\nDeleting ${toDelete.length} duplicate invoice rows across ${groupCount} groups…`)
  const result = await prisma.invoice.deleteMany({ where: { id: { in: toDelete } } })
  console.log(`Deleted ${result.count} rows.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
