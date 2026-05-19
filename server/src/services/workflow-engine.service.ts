// Dynamic Workflow Engine
// Handles: definition matching, approver resolution, stage routing,
// SLA tracking, on-hold, chat, reject modes
// Score thresholds: PO-based ≥98, Non-PO ≥96

import type { PrismaClient } from '@prisma/client'
import { writeAuditLog } from '../lib/audit.js'
import { ok, err, type Result } from '../lib/result.js'

export const WORKFLOW_ERR = {
  NO_WORKFLOW_DEFINED: 'NO_WORKFLOW_DEFINED',
} as const

// ── Constants ──
export const STP_THRESHOLD_PO     = 98
export const STP_THRESHOLD_NON_PO = 96

// Module codes accepted by the workflow engine. Transactional modules + every
// master that can be submitted for approval via MasterListScreen.
// Persisted as a plain string in WorkflowDefinition.module — the union is for
// type-safety on the callers, not a DB constraint.
export type WfModule =
  | 'INVOICE' | 'PAYMENT' | 'VENDOR' | 'MASTER' | 'PR' | 'PO' | 'GRN' | 'BUDGET'
  | 'DEPARTMENT' | 'GL_CODE' | 'COST_CENTRE' | 'EMPLOYEE' | 'DESIGNATION'
  | 'LOCATION' | 'ITEM' | 'VENDOR_CATEGORY' | 'FINANCIAL_YEAR' | 'TAX_CODE'
  | 'TDS_SECTION' | 'ENTITY' | 'USER' | 'CURRENCY' | 'PROFIT_CENTRE'
export type WfStatus    = 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'ON_HOLD' | 'CANCELLED'
export type StageStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED' | 'AUTO_APPROVED' | 'ESCALATED' | 'INFO_REQUESTED'

interface EngineCtx { tenantId: string; userId: string; userName: string; userRole?: string; ip?: string }

// ── Condition evaluator ──

function evaluateCondition(field: string, operator: string, condValue: string, record: Record<string, unknown>): boolean {
  const val = record[field]
  switch (operator) {
    case 'GT':       return Number(val) > Number(condValue)
    case 'LT':       return Number(val) < Number(condValue)
    case 'GTE':      return Number(val) >= Number(condValue)
    case 'LTE':      return Number(val) <= Number(condValue)
    case 'EQ':       return String(val) === condValue
    case 'NOT_EQ':   return String(val) !== condValue
    case 'IN':       return condValue.split(',').map(v => v.trim()).includes(String(val))
    case 'NOT_IN':   return !condValue.split(',').map(v => v.trim()).includes(String(val))
    case 'CONTAINS': return String(val ?? '').toLowerCase().includes(condValue.toLowerCase())
    case 'STARTS':   return String(val ?? '').startsWith(condValue)
    default:         return false
  }
}

function matchesDefinition(conditions: { field: string; operator: string; value: string; logicGroup: string }[], record: Record<string, unknown>): boolean {
  if (conditions.length === 0) return true
  const andConds = conditions.filter(c => c.logicGroup === 'AND')
  const orConds  = conditions.filter(c => c.logicGroup === 'OR')
  const andPass  = andConds.every(c => evaluateCondition(c.field, c.operator, c.value, record))
  const orPass   = orConds.length === 0 || orConds.some(c => evaluateCondition(c.field, c.operator, c.value, record))
  return andPass && orPass
}

// ── Definition selector ──

// Pure: pick the matching definition from a pre-loaded list. Exported for tests.
type DefinitionRow = {
  id: string
  entityId: string | null
  departmentId: string | null
  isDefault: boolean
  conditions: { field: string; operator: string; value: string; logicGroup: string }[]
}

export function selectDefinitionFromList(
  definitions: DefinitionRow[],
  entityId: string | null,
  departmentId: string | null,
  record: Record<string, unknown>
): string | null {
  for (const def of definitions) {
    if (def.entityId && def.entityId !== entityId) continue
    if (def.departmentId && def.departmentId !== departmentId) continue
    if (matchesDefinition(def.conditions, record)) return def.id
  }
  const defaultDef = definitions.find(d => d.isDefault && !d.entityId && !d.departmentId)
  return defaultDef?.id ?? null
}

export async function selectDefinition(
  prisma: PrismaClient,
  tenantId: string,
  module: WfModule,
  entityId: string | null,
  departmentId: string | null,
  record: Record<string, unknown>
): Promise<string | null> {
  // CLAUDE.md: filter by `status` (canonical), not the legacy `isActive` boolean.
  const definitions = await prisma.workflowDefinition.findMany({
    where:   { tenantId, module, status: 'ACTIVE' },
    include: { conditions: true },
    orderBy: { priority: 'desc' },
  })
  return selectDefinitionFromList(definitions, entityId, departmentId, record)
}

// ── Approver resolver ──
// ROLE resolution consults TWO sources in order:
//   1. User.role (primary role on the user record)
//   2. UserEntityRole.roleCode (per-entity roles — the canonical RBAC table)
// A SUPER_ADMIN tenant user is the universal fallback so workflow stages never
// silently end up unassigned. Returns null only when zero users exist for the
// tenant — the caller logs a warning in that case.

async function resolveApprover(
  prisma: PrismaClient,
  tenantId: string,
  stage: { approverType: string; approverRole: string | null; approverUserId: string | null },
  record: Record<string, unknown>
): Promise<string | null> {
  switch (stage.approverType) {
    case 'USER':
      // Validate the configured user is in this tenant — prevents cross-tenant leak.
      if (!stage.approverUserId) return null
      {
        const u = await prisma.user.findFirst({
          where:  { id: stage.approverUserId, tenantId, isActive: true },
          select: { id: true },
        })
        return u?.id ?? null
      }

    case 'ROLE': {
      if (!stage.approverRole) return null
      const departmentId = record.departmentId as string | undefined

      // Source 1: User.role (legacy single role on user record).
      const userByRole = await prisma.user.findFirst({
        where: {
          tenantId,
          role: stage.approverRole as never,
          isActive: true,
          ...(departmentId && { departmentId }),
        },
        orderBy: { createdAt: 'asc' },
      })
      if (userByRole) return userByRole.id

      // Source 2: UserEntityRole (per-entity role assignment — the canonical
      // table). Most demo/real users get their role via this path, not User.role.
      const entityRole = await prisma.userEntityRole.findFirst({
        where:   { roleCode: stage.approverRole, isActive: true, user: { tenantId, isActive: true } },
        include: { user: { select: { id: true, departmentId: true } } },
        orderBy: { user: { createdAt: 'asc' } },
      })
      if (entityRole?.user) {
        if (!departmentId || entityRole.user.departmentId === departmentId) {
          return entityRole.user.id
        }
      }

      // Fallback: any SUPER_ADMIN in the tenant. SUPER_ADMIN bypasses RBAC
      // anyway, so they're a legitimate approver for any stage that would
      // otherwise be unassigned (preserves business-flow continuity in dev /
      // partially-seeded tenants instead of stranding the workflow).
      const superAdmin = await prisma.user.findFirst({
        where:   { tenantId, role: 'SUPER_ADMIN' as never, isActive: true },
        orderBy: { createdAt: 'asc' },
        select:  { id: true },
      })
      return superAdmin?.id ?? null
    }

    case 'MANAGER_OF': {
      const requesterId = record.createdByUserId as string | undefined
      if (!requesterId) return null
      // Look up the requester's employee row, not an arbitrary employee.
      const requesterUser = await prisma.user.findFirst({
        where:  { id: requesterId, tenantId },
        select: { email: true, employeeId: true },
      })
      if (!requesterUser) return null

      const emp = requesterUser.employeeId
        ? await prisma.employee.findFirst({
            where:  { id: requesterUser.employeeId, tenantId },
            select: { managerId: true },
          })
        : await prisma.employee.findFirst({
            where:  { tenantId, email: requesterUser.email },
            select: { managerId: true },
          })
      return emp?.managerId ?? null
    }

    case 'DEPT_HEAD': {
      const deptId = record.departmentId as string | undefined
      if (!deptId) return null
      const head = await prisma.user.findFirst({
        where: { tenantId, role: 'DEPT_HEAD' as never, departmentId: deptId, isActive: true },
      })
      if (head) return head.id

      // Fallback via UserEntityRole when User.role isn't set.
      const entityHead = await prisma.userEntityRole.findFirst({
        where:   { roleCode: 'DEPT_HEAD', isActive: true, user: { tenantId, isActive: true, departmentId: deptId } },
        include: { user: { select: { id: true } } },
      })
      return entityHead?.user.id ?? null
    }

    default:
      return null
  }
}

// ── Auto-advance helper ──
// Pure: walks consecutive AUTO_APPROVED-eligible stages from stage 1, returning
// the list of stage orders to auto-approve and the next-pending stage order
// (null when all stages auto-approve). Exposed for unit tests.

export interface AutoAdvanceStageInput { order: number; autoApproveBelow: number | null }
export interface AutoAdvancePlan { autoApprovedOrders: number[]; nextPendingOrder: number | null }

export function computeAutoAdvance(
  stages: AutoAdvanceStageInput[],
  amount: number
): AutoAdvancePlan {
  const sorted = [...stages].sort((a, b) => a.order - b.order)
  const autoApprovedOrders: number[] = []
  let nextPendingOrder: number | null = null
  for (const s of sorted) {
    const eligible = s.autoApproveBelow != null && amount < Number(s.autoApproveBelow)
    if (eligible) {
      autoApprovedOrders.push(s.order)
      continue
    }
    nextPendingOrder = s.order
    break
  }
  return { autoApprovedOrders, nextPendingOrder }
}

// ── Start workflow ──
//
// Returns err(NO_WORKFLOW_DEFINED) when no ACTIVE definition matches. Callers
// (invoice/PR/PO submit) handle that explicitly — typically by flipping the
// document to SUBMITTED with no workflow instance, so the engine never leaves
// orphan IN_PROGRESS rows with zero stages.

export async function startWorkflow(
  prisma: PrismaClient,
  module: WfModule,
  entityType: string,
  entityId: string,
  record: Record<string, unknown>,
  ctx: EngineCtx
): Promise<Result<{ instanceId: string; autoApproved?: boolean }>> {

  const defId = await selectDefinition(
    prisma, ctx.tenantId, module,
    record.entityId as string | null,
    record.departmentId as string | null,
    record
  )

  if (!defId) {
    return err({
      code: 'NOT_FOUND' as const,
      message: 'NO_WORKFLOW_DEFINED',
      details: { reason: 'NO_WORKFLOW_DEFINED', module },
      httpStatus: 404,
    })
  }

  const defStages = await prisma.workflowDefinitionStage.findMany({
    where:   { definitionId: defId },
    orderBy: { order: 'asc' },
  })

  if (defStages.length === 0) {
    return err({
      code: 'WORKFLOW_INVALID_STATE' as const,
      message: 'Workflow definition has no stages',
      httpStatus: 422,
    })
  }

  const amount = Number(record.totalAmount ?? record.netPayable ?? 0)
  const plan   = computeAutoAdvance(
    defStages.map(s => ({ order: s.order, autoApproveBelow: s.autoApproveBelow == null ? null : Number(s.autoApproveBelow) })),
    amount,
  )
  const allAuto = plan.nextPendingOrder === null

  const instance = await prisma.workflowInstance.create({
    data: {
      tenantId:          ctx.tenantId,
      definitionId:      defId,
      entityType,
      entityId,
      status:            allAuto ? 'APPROVED' : 'IN_PROGRESS',
      currentStageOrder: plan.nextPendingOrder ?? defStages[defStages.length - 1].order,
      completedAt:       allAuto ? new Date() : null,
    },
  })

  const now = new Date()
  for (const stage of defStages) {
    const isAuto      = plan.autoApprovedOrders.includes(stage.order)
    const slaDeadline = !isAuto && stage.slaHours ? new Date(Date.now() + stage.slaHours * 3_600_000) : null
    const isCurrent   = !isAuto && stage.order === plan.nextPendingOrder
    const assignedTo  = isCurrent || (!isAuto && !allAuto)
      ? await resolveApprover(prisma, ctx.tenantId, stage, record)
      : null

    if (isCurrent && !assignedTo) {
      // Surfacing unassigned-stage clearly rather than letting it sit silently.
      // The stage is still created (PENDING) so a SUPER_ADMIN can resolve it
      // via the workflow detail page; but logging tells operators why nobody is
      // seeing it on their Approval Desk.
      console.warn('[workflow] PENDING stage has no resolvable approver', {
        tenantId:     ctx.tenantId,
        instanceId:   instance.id,
        stageOrder:   stage.order,
        stageName:    stage.name,
        approverType: stage.approverType,
        approverRole: stage.approverRole,
      })
    }

    await prisma.workflowInstanceStage.create({
      data: {
        instanceId:   instance.id,
        tenantId:     ctx.tenantId,
        stageOrder:   stage.order,
        stageName:    stage.name,
        approverRole: stage.approverRole ?? undefined,
        assignedTo:   assignedTo ?? undefined,
        status:       isAuto ? 'AUTO_APPROVED' : (isCurrent ? 'PENDING' : 'PENDING'),
        actionAt:     isAuto ? now : null,
        slaDeadline,
      },
    })
  }

  await writeAuditLog(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId,
    action:     allAuto ? 'workflow.started_auto_approved' : 'workflow.started',
    entityType: 'workflow_instance', entityId: instance.id,
    after: { module, definitionId: defId, autoApprovedStages: plan.autoApprovedOrders, currentStageOrder: plan.nextPendingOrder },
    ipAddress: ctx.ip,
  })

  return ok({ instanceId: instance.id, autoApproved: allAuto })
}

// ── Approve stage ──

export async function approveStage(
  prisma: PrismaClient,
  instanceId: string,
  comments: string | undefined,
  ctx: EngineCtx
): Promise<Result<{ nextStage?: number; finalStatus?: WfStatus }>> {
  const instance = await prisma.workflowInstance.findFirst({
    where:   { id: instanceId, tenantId: ctx.tenantId },
    include: { stages: { orderBy: { stageOrder: 'asc' } } },
  })
  if (!instance) return err({ code: 'NOT_FOUND' as const, message: 'Workflow instance not found', httpStatus: 404 })

  const currentStage = instance.stages.find(s => s.stageOrder === instance.currentStageOrder && s.status === 'PENDING')
  if (!currentStage) return err({ code: 'WORKFLOW_INVALID_STATE' as const, message: 'No pending stage found', httpStatus: 422 })

  const nextStage = instance.stages.find(s => s.stageOrder === instance.currentStageOrder + 1)

  await prisma.$transaction(async tx => {
    await tx.workflowInstanceStage.update({
      where: { id: currentStage.id },
      data:  { status: 'APPROVED', comments, actionAt: new Date(), actionBy: ctx.userId },
    })

    if (nextStage) {
      await tx.workflowInstance.update({
        where: { id: instanceId },
        data:  { currentStageOrder: nextStage.stageOrder },
      })
    } else {
      await tx.workflowInstance.update({
        where: { id: instanceId },
        data:  { status: 'APPROVED', completedAt: new Date() },
      })
    }
  })

  await writeAuditLog(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId,
    action:     'workflow.stage_approved',
    entityType: 'workflow_instance', entityId: instanceId,
    after:      { stage: currentStage.stageOrder, comments },
    ipAddress:  ctx.ip,
  })

  return ok({ nextStage: nextStage?.stageOrder, finalStatus: nextStage ? undefined : 'APPROVED' })
}

// ── Reject stage ──

export async function rejectStage(
  prisma: PrismaClient,
  instanceId: string,
  mode: 'RETURN_TO_DRAFT' | 'RETURN_TO_PREV_STAGE' | 'REQUEST_INFO',
  comments: string,
  ctx: EngineCtx
): Promise<Result<void>> {
  const instance = await prisma.workflowInstance.findFirst({
    where:   { id: instanceId, tenantId: ctx.tenantId },
    include: { stages: { orderBy: { stageOrder: 'asc' } } },
  })
  if (!instance) return err({ code: 'NOT_FOUND' as const, message: 'Instance not found', httpStatus: 404 })

  const currentStage = instance.stages.find(s => s.stageOrder === instance.currentStageOrder && s.status === 'PENDING')
  if (!currentStage) return err({ code: 'WORKFLOW_INVALID_STATE' as const, message: 'No pending stage', httpStatus: 422 })

  await prisma.$transaction(async tx => {
    if (mode === 'REQUEST_INFO') {
      await tx.workflowInstanceStage.update({
        where: { id: currentStage.id },
        data:  { status: 'INFO_REQUESTED', comments },
      })
      await tx.workflowChat.create({
        data: {
          instanceId, tenantId: ctx.tenantId,
          senderId:    ctx.userId, senderName: ctx.userName,
          senderRole:  ctx.userRole,
          message:     comments,
          messageType: 'INFO_REQUEST',
        },
      })
    } else if (mode === 'RETURN_TO_PREV_STAGE' && instance.currentStageOrder > 1) {
      await tx.workflowInstanceStage.update({
        where: { id: currentStage.id },
        data:  { status: 'REJECTED', comments, actionAt: new Date(), actionBy: ctx.userId },
      })
      const prevStage = instance.stages.find(s => s.stageOrder === instance.currentStageOrder - 1)
      if (prevStage) {
        await tx.workflowInstanceStage.update({
          where: { id: prevStage.id },
          data:  { status: 'PENDING', actionAt: null, actionBy: null, comments: null },
        })
        await tx.workflowInstance.update({
          where: { id: instanceId },
          data:  { currentStageOrder: prevStage.stageOrder },
        })
      }
    } else {
      await tx.workflowInstanceStage.update({
        where: { id: currentStage.id },
        data:  { status: 'REJECTED', comments, actionAt: new Date(), actionBy: ctx.userId },
      })
      await tx.workflowInstance.update({
        where: { id: instanceId },
        data:  { status: 'REJECTED', completedAt: new Date() },
      })
    }
  })

  await writeAuditLog(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId,
    action:     'workflow.stage_rejected',
    entityType: 'workflow_instance', entityId: instanceId,
    after:      { mode, comments },
    ipAddress:  ctx.ip,
  })

  return ok(undefined)
}

// ── Put on hold / release ──

export async function putOnHold(
  prisma: PrismaClient,
  instanceId: string,
  reason: string,
  ctx: EngineCtx
): Promise<Result<void>> {
  await prisma.workflowInstance.update({
    where: { id: instanceId, tenantId: ctx.tenantId },
    data:  { status: 'ON_HOLD', onHoldReason: reason, onHoldBy: ctx.userId, onHoldAt: new Date() },
  })
  return ok(undefined)
}

export async function releaseFromHold(
  prisma: PrismaClient,
  instanceId: string,
  remarks: string,
  ctx: EngineCtx
): Promise<Result<void>> {
  await prisma.workflowInstance.update({
    where: { id: instanceId, tenantId: ctx.tenantId },
    data:  { status: 'IN_PROGRESS', releasedBy: ctx.userId, releasedAt: new Date(), releaseRemarks: remarks },
  })
  return ok(undefined)
}

// ── Add chat message ──

export async function addChatMessage(
  prisma: PrismaClient,
  instanceId: string,
  message: string,
  messageType: string,
  attachments: { fileName: string; fileUrl: string; mimeType: string; fileSize?: number }[],
  ctx: EngineCtx
): Promise<Result<{ chatId: string }>> {
  const chat = await prisma.workflowChat.create({
    data: {
      instanceId, tenantId: ctx.tenantId,
      senderId:    ctx.userId, senderName: ctx.userName,
      senderRole:  ctx.userRole, message, messageType,
      attachments: {
        create: attachments.map(a => ({
          fileName: a.fileName, fileUrl: a.fileUrl,
          mimeType: a.mimeType, fileSize: a.fileSize,
        })),
      },
    },
  })

  if (messageType === 'INFO_REPLY') {
    const inst = await prisma.workflowInstance.findFirst({
      where:   { id: instanceId },
      include: { stages: true },
    })
    const infoStage = inst?.stages.find(s => s.status === 'INFO_REQUESTED')
    if (infoStage) {
      await prisma.workflowInstanceStage.update({
        where: { id: infoStage.id },
        data:  { status: 'PENDING' },
      })
    }
  }

  return ok({ chatId: chat.id })
}

// ── Get instance with full detail ──

export async function getWorkflowInstance(
  prisma: PrismaClient,
  entityType: string,
  entityId: string,
  tenantId: string
) {
  return prisma.workflowInstance.findFirst({
    where:   { entityType, entityId, tenantId, status: { not: 'CANCELLED' } },
    include: {
      stages:     { orderBy: { stageOrder: 'asc' } },
      chats:      { orderBy: { createdAt: 'asc' }, include: { attachments: true } },
      definition: { select: { name: true, code: true } },
    },
    orderBy: { startedAt: 'desc' },
  })
}

// ── STP threshold helper (called from match-scoring.service.ts) ──
export function getStpThreshold(isPOInvoice: boolean): number {
  return isPOInvoice ? STP_THRESHOLD_PO : STP_THRESHOLD_NON_PO
}
