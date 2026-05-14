// Dynamic Workflow Engine
// Handles: definition matching, approver resolution, stage routing,
// SLA tracking, on-hold, chat, reject modes
// Score thresholds: PO-based ≥98, Non-PO ≥96

import type { PrismaClient } from '@prisma/client'
import { writeAuditLog } from '../lib/audit.js'
import { ok, err, type Result } from '../lib/result.js'

// ── Constants ──
export const STP_THRESHOLD_PO     = 98
export const STP_THRESHOLD_NON_PO = 96

export type WfModule    = 'INVOICE' | 'PAYMENT' | 'VENDOR' | 'MASTER' | 'PR' | 'PO'
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

export async function selectDefinition(
  prisma: PrismaClient,
  tenantId: string,
  module: WfModule,
  entityId: string | null,
  departmentId: string | null,
  record: Record<string, unknown>
): Promise<string | null> {
  const definitions = await prisma.workflowDefinition.findMany({
    where:   { tenantId, module, isActive: true, status: 'ACTIVE' },
    include: { conditions: true },
    orderBy: { priority: 'desc' },
  })

  for (const def of definitions) {
    if (def.entityId && def.entityId !== entityId) continue
    if (def.departmentId && def.departmentId !== departmentId) continue
    if (matchesDefinition(def.conditions, record)) return def.id
  }

  const defaultDef = definitions.find(d => d.isDefault && !d.entityId && !d.departmentId)
  return defaultDef?.id ?? null
}

// ── Approver resolver ──

async function resolveApprover(
  prisma: PrismaClient,
  tenantId: string,
  stage: { approverType: string; approverRole: string | null; approverUserId: string | null },
  record: Record<string, unknown>
): Promise<string | null> {
  switch (stage.approverType) {
    case 'USER':
      return stage.approverUserId ?? null

    case 'ROLE': {
      const departmentId = record.departmentId as string | undefined
      const user = await prisma.user.findFirst({
        where: {
          tenantId,
          role: stage.approverRole as any,
          isActive: true,
          ...(departmentId && { departmentId }),
        },
        orderBy: { createdAt: 'asc' },
      })
      return user?.id ?? null
    }

    case 'MANAGER_OF': {
      const requesterId = record.createdByUserId as string | undefined
      if (!requesterId) return null
      const emp = await prisma.employee.findFirst({ where: { tenantId }, select: { managerId: true } })
      return emp?.managerId ?? null
    }

    case 'DEPT_HEAD': {
      const deptId = record.departmentId as string | undefined
      if (!deptId) return null
      const head = await prisma.user.findFirst({
        where: { tenantId, role: 'DEPT_HEAD' as any, departmentId: deptId, isActive: true },
      })
      return head?.id ?? null
    }

    default:
      return null
  }
}

// ── Start workflow ──

export async function startWorkflow(
  prisma: PrismaClient,
  module: WfModule,
  entityType: string,
  entityId: string,
  record: Record<string, unknown>,
  ctx: EngineCtx
): Promise<Result<{ instanceId: string }>> {

  const defId = await selectDefinition(
    prisma, ctx.tenantId, module,
    record.entityId as string | null,
    record.departmentId as string | null,
    record
  )

  const instance = await prisma.workflowInstance.create({
    data: {
      tenantId:          ctx.tenantId,
      definitionId:      defId,
      entityType,
      entityId,
      status:            'IN_PROGRESS',
      currentStageOrder: 1,
    },
  })

  if (defId) {
    const stages = await prisma.workflowDefinitionStage.findMany({
      where:   { definitionId: defId },
      orderBy: { order: 'asc' },
    })

    for (const stage of stages) {
      const assignedTo  = await resolveApprover(prisma, ctx.tenantId, stage, record)
      const slaDeadline = stage.slaHours ? new Date(Date.now() + stage.slaHours * 3_600_000) : null
      const amount      = Number(record.totalAmount ?? record.netPayable ?? 0)
      const autoApprove = stage.autoApproveBelow != null && amount < Number(stage.autoApproveBelow)

      await prisma.workflowInstanceStage.create({
        data: {
          instanceId:  instance.id,
          tenantId:    ctx.tenantId,
          stageOrder:  stage.order,
          stageName:   stage.name,
          approverRole: stage.approverRole ?? undefined,
          assignedTo:  assignedTo ?? undefined,
          status:      stage.order === 1 ? (autoApprove ? 'AUTO_APPROVED' : 'PENDING') : 'PENDING',
          slaDeadline,
        },
      })
    }
  }

  return ok({ instanceId: instance.id })
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
