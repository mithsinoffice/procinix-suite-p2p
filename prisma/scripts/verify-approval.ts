// Verifies the admin-override fix for GET /api/invoices/pending-approvals.
// Replicates the same WHERE clause + admin-detect logic the route uses, then
// asserts that SDX/MUM/2026-27/05/0892 is in the result set for Mithilesh.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT  = '63d0e5e2-2a89-427e-abb6-fd315e2873ae'
const INV_NO  = 'SDX/MUM/2026-27/05/0892'
const USER_EM = 'mithilesh@procinix.ai'

async function main() {
  const me = await prisma.user.findFirst({
    where:  { email: USER_EM, tenantId: TENANT, isActive: true },
    select: { id: true, role: true, name: true },
  })
  if (!me) throw new Error('Mithilesh not found')

  const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN'] as const
  let isAdmin = (ADMIN_ROLES as readonly string[]).includes(me.role)
  if (!isAdmin) {
    const r = await prisma.userEntityRole.findFirst({
      where:  { userId: me.id, isActive: true, roleCode: { in: [...ADMIN_ROLES] } },
      select: { id: true },
    })
    isAdmin = !!r
  }
  console.log(`User: ${me.name} (${me.role}) — isAdmin = ${isAdmin}`)

  const stages = await prisma.workflowInstanceStage.findMany({
    where: {
      tenantId: TENANT,
      status:   'PENDING',
      ...(isAdmin ? {} : { assignedTo: me.id }),
    },
    include: { instance: true },
  })
  const current = stages.filter(
    s => s.instance.status === 'IN_PROGRESS' && s.stageOrder === s.instance.currentStageOrder,
  )
  console.log(`Pending stages: ${stages.length} (current: ${current.length})`)

  const invoiceIds = current.filter(s => s.instance.entityType === 'invoice').map(s => s.instance.entityId)
  const invoices = invoiceIds.length
    ? await prisma.invoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, invoiceNumber: true, status: true } })
    : []
  console.log('\nInvoices in queue:')
  for (const inv of invoices) console.log(`  · ${inv.invoiceNumber}  (${inv.status})`)

  const target = invoices.find(i => i.invoiceNumber === INV_NO)
  console.log(`\nResult: ${target ? '✓ PASS — ' + INV_NO + ' is visible' : '✗ FAIL — ' + INV_NO + ' missing'}`)
  process.exitCode = target ? 0 : 1
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
