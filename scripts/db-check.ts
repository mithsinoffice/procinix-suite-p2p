// Smoke-check that critical tables have data. Run after `db:push` or
// `db:seed` so an unexpectedly-empty table surfaces immediately instead of
// after the next debugging session.
//
// Usage:  npm run db:check
// Exits 1 when any critical table is empty so this can gate a deploy or
// pre-commit hook in CI.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Check {
  label:   string
  table:   string
  count:   () => Promise<number>
  warnAt:  number   // warn (yellow) below this
  failAt:  number   // exit 1 below this
}

const checks: Check[] = [
  { label: 'tenants',          table: 'tenant',         count: () => prisma.tenant.count(),         warnAt: 1, failAt: 1 },
  { label: 'users',            table: 'user',           count: () => prisma.user.count(),           warnAt: 1, failAt: 1 },
  { label: 'vendors',          table: 'vendor',         count: () => prisma.vendor.count(),         warnAt: 3, failAt: 1 },
  { label: 'item masters',     table: 'itemMaster',     count: () => prisma.itemMaster.count(),     warnAt: 5, failAt: 1 },
  { label: 'GL codes',         table: 'glCode',         count: () => prisma.glCode.count(),         warnAt: 20, failAt: 1 },
  { label: 'invoices',         table: 'invoice',        count: () => prisma.invoice.count(),        warnAt: 1, failAt: 0 },
  { label: 'purchase orders',  table: 'purchaseOrder',  count: () => prisma.purchaseOrder.count(),  warnAt: 1, failAt: 0 },
  { label: 'workflow defs',    table: 'workflowDef',    count: () => prisma.workflowDefinition.count(), warnAt: 10, failAt: 1 },
]

async function main(): Promise<void> {
  let hardFail = false
  let warned   = 0
  for (const c of checks) {
    const n = await c.count()
    const tag =
      n < c.failAt ? '\x1b[31m✗ FAIL\x1b[0m' :
      n < c.warnAt ? '\x1b[33m⚠ low \x1b[0m' :
                     '\x1b[32m✓ ok  \x1b[0m'
    if (n < c.failAt)      hardFail = true
    else if (n < c.warnAt) warned++
    console.log(`  ${tag}  ${c.label.padEnd(18)} ${String(n).padStart(6)} rows`)
  }
  console.log()
  if (hardFail) {
    console.log('\x1b[31mFAIL: at least one critical table is empty.\x1b[0m Run `npm run db:seed`.')
    process.exit(1)
  } else if (warned) {
    console.log(`\x1b[33mOK with ${warned} low-count warning(s).\x1b[0m Consider \`npx tsx prisma/seed-demo.ts\`.`)
  } else {
    console.log('\x1b[32mAll critical tables populated.\x1b[0m')
  }
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
