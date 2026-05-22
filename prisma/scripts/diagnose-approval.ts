// Diagnostic for "Invoice X is Pending L1 but not in Mithilesh's Approval Desk".
// Prints (1A-1E) from the spec so we can pin the root cause before changing
// any code. Read-only; never mutates.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT  = '63d0e5e2-2a89-427e-abb6-fd315e2873ae'
const INV_NO  = 'SDX/MUM/2026-27/05/0892'
const USER_EM = 'mithilesh@procinix.ai'

async function main() {
  // ── 1A. Invoice + workflow instance ────────────────────────────────────
  const inv = await prisma.invoice.findFirst({
    where:  { tenantId: TENANT, invoiceNumber: INV_NO },
    select: { id: true, invoiceNumber: true, status: true, workflowInstanceId: true, vendorId: true, totalAmount: true, isPOInvoice: true, entityId: true, departmentId: true, createdByUserId: true },
  })
  console.log('\n── 1A. Invoice ────────────────────────────────')
  console.log(inv ?? '(not found)')

  if (!inv) return

  const instance = inv.workflowInstanceId
    ? await prisma.workflowInstance.findFirst({
        where:   { id: inv.workflowInstanceId },
        include: { definition: { select: { id: true, name: true, module: true, priority: true, status: true } } },
      })
    : await prisma.workflowInstance.findFirst({
        where:   { tenantId: TENANT, entityType: 'invoice', entityId: inv.id },
        include: { definition: { select: { id: true, name: true, module: true, priority: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      })
  console.log('\n── 1A. Workflow instance ──────────────────────')
  console.log(instance ?? '(no instance)')

  // ── 1B. Stages ─────────────────────────────────────────────────────────
  if (instance) {
    const stages = await prisma.workflowInstanceStage.findMany({
      where:   { instanceId: instance.id },
      orderBy: { stageOrder: 'asc' },
    })
    const userIds = stages.map(s => s.assignedTo).filter((u): u is string => !!u)
    const users = userIds.length
      ? await prisma.user.findMany({
          where:  { id: { in: userIds } },
          select: { id: true, name: true, email: true, role: true },
        })
      : []
    const userById = new Map(users.map(u => [u.id, u]))
    console.log('\n── 1B. Stages ─────────────────────────────────')
    for (const s of stages) {
      const u = s.assignedTo ? userById.get(s.assignedTo) : null
      console.log({
        order:        s.stageOrder,
        status:       s.status,
        approverType: s.approverType,
        approverRole: s.approverRole,
        assignedTo:   s.assignedTo,
        assignedName: u?.name ?? '(no user)',
        assignedRole: u?.role ?? null,
      })
    }
  }

  // ── 1C. Mithilesh's roles ──────────────────────────────────────────────
  const me = await prisma.user.findFirst({
    where:  { email: USER_EM, tenantId: TENANT },
    select: { id: true, name: true, role: true, departmentId: true, isActive: true },
  })
  console.log('\n── 1C. User (mithilesh) ───────────────────────')
  console.log(me ?? '(not found)')
  if (me) {
    const entityRoles = await prisma.userEntityRole.findMany({
      where:  { userId: me.id, isActive: true },
      select: { entityId: true, roleCode: true },
    })
    console.log('  entityRoles:', entityRoles)
  }

  // ── 1D. Approval-desk WHERE clause (code reference, see invoices.ts:371) ─
  console.log('\n── 1D. Approval-desk WHERE clause ─────────────')
  console.log("  where: { tenantId, assignedTo: userId, status: 'PENDING' }")
  console.log("  + filter: instance.status === 'IN_PROGRESS' && stage.stageOrder === instance.currentStageOrder")

  // ── 1E. Cross-check ────────────────────────────────────────────────────
  if (instance && me) {
    const currentStage = await prisma.workflowInstanceStage.findFirst({
      where:   { instanceId: instance.id, stageOrder: instance.currentStageOrder },
    })
    console.log('\n── 1E. Cross-check ────────────────────────────')
    console.log('  Current stage:', {
      order:        currentStage?.stageOrder,
      status:       currentStage?.status,
      approverRole: currentStage?.approverRole,
      assignedTo:   currentStage?.assignedTo,
    })
    console.log('  instance.status:', instance.status)
    console.log('  Mithilesh.id:   ', me.id)
    console.log('  Match (assignedTo == me.id)?',
      currentStage?.assignedTo === me.id ? '✓ YES' : '✗ NO — root cause candidate')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
