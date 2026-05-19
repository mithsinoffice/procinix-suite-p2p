import type { FastifyInstance } from 'fastify'
import {
  approveStage, rejectStage, putOnHold, releaseFromHold,
  addChatMessage, getWorkflowInstance, startWorkflow,
  type WfModule,
} from '../services/workflow-engine.service.js'
import { resolveItemStatusAfterReject } from '../services/item-submit.service.js'
import { applyChangeDiff } from '../services/item-change.service.js'

export async function workflowRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // Start a workflow for any module (transactional or master).
  // The engine's startWorkflow() itself returns err(NO_WORKFLOW_DEFINED) when
  // no ACTIVE definition matches — we surface that with the legacy
  // { ok: false, reason: 'NO_WORKFLOW_DEFINED' } shape so callers can fall
  // back to a direct status update.
  app.post('/start', auth, async (req, reply) => {
    const { module, entityType, entityId, record } = (req.body ?? {}) as {
      module?: string; entityType?: string; entityId?: string; record?: Record<string, unknown>
    }
    if (!module || !entityType || !entityId) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'module, entityType and entityId are required' })
    }

    const result = await startWorkflow(
      app.prisma,
      module as WfModule,
      entityType,
      entityId,
      record ?? {},
      { tenantId: req.tenant.id, userId: req.user.sub, userName: (req.user as any).name ?? req.user.sub, userRole: (req.user as any).role },
    )
    if (!result.ok) {
      if (result.error.message === 'NO_WORKFLOW_DEFINED') {
        return reply.send({ ok: false, reason: 'NO_WORKFLOW_DEFINED' })
      }
      return reply.code(result.error.httpStatus ?? 400).send(result.error)
    }
    return reply.send({ ok: true, instanceId: result.data.instanceId, autoApproved: result.data.autoApproved ?? false })
  })

  // Get instance by ID directly
  app.get('/instances/:id', auth, async (req, reply) => {
    const instance = await app.prisma.workflowInstance.findFirst({
      where:   { id: (req.params as any).id, tenantId: req.tenant.id },
      include: {
        stages:     { orderBy: { stageOrder: 'asc' } },
        chats:      { orderBy: { createdAt: 'asc' }, include: { attachments: true } },
        definition: { select: { name: true, code: true } },
      },
    })
    if (!instance) return reply.code(404).send({ message: 'Workflow instance not found' })
    return reply.send(instance)
  })

  // Get instance for a record
  app.get('/:entityType/:entityId', auth, async (req, reply) => {
    const { entityType, entityId } = req.params as any
    const instance = await getWorkflowInstance(app.prisma, entityType, entityId, req.tenant.id)
    if (!instance) return reply.code(404).send({ code: 'NOT_FOUND', message: 'No active workflow' })
    return reply.send(instance)
  })

  // Approve current stage
  app.post('/instances/:id/approve', auth, async (req, reply) => {
    const { comments } = (req.body ?? {}) as { comments?: string }
    const instanceId = (req.params as any).id as string
    const ctx = {
      tenantId: req.tenant.id, userId: req.user.sub,
      userName: (req.user as any).name ?? req.user.sub, userRole: (req.user as any).role,
    }

    const instanceInfo = await app.prisma.workflowInstance.findFirst({
      where:  { id: instanceId, tenantId: req.tenant.id },
      select: { entityType: true, entityId: true },
    })

    const result = await approveStage(app.prisma, instanceId, comments, ctx)
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)

    if (instanceInfo?.entityType === 'invoice') {
      const newInvStatus = result.data.finalStatus === 'APPROVED' ? 'APPROVED'
        : result.data.nextStage === 3 ? 'PENDING_L3'
        : result.data.nextStage === 2 ? 'PENDING_L2'
        : 'PENDING_L1'
      await app.prisma.invoice.update({
        where: { id: instanceInfo.entityId },
        data:  { status: newInvStatus },
      })
      // Final approval — flip linked POs marked FULL to FULLY_INVOICED so they
      // disappear from the open-POs list.
      if (result.data.finalStatus === 'APPROVED') {
        const fullLinks = await app.prisma.invoicePOLink.findMany({
          where:  { invoiceId: instanceInfo.entityId, consumptionType: 'FULL' },
          select: { poId: true },
        })
        if (fullLinks.length > 0) {
          await app.prisma.purchaseOrder.updateMany({
            where: { id: { in: fullLinks.map(l => l.poId) }, tenantId: req.tenant.id },
            data:  { status: 'FULLY_INVOICED' },
          })
        }
      }
      await app.prisma.invoiceAuditLog.create({
        data: {
          invoiceId: instanceInfo.entityId, tenantId: req.tenant.id,
          action: result.data.finalStatus === 'APPROVED' ? 'APPROVED' : 'STAGE_APPROVED',
          userId: req.user.sub, userName: (req.user as any).name,
          details: { comments, newStatus: newInvStatus },
        },
      })
    } else if (instanceInfo?.entityType === 'purchase_requisition') {
      // PR follows a simpler ladder: PENDING_L1/L2/… while stages progress,
      // APPROVED on final stage approval. Status reflects the active stage.
      const newStatus = result.data.finalStatus === 'APPROVED'
        ? 'APPROVED'
        : `PENDING_L${result.data.nextStage ?? 1}`
      await app.prisma.purchaseRequisition.update({
        where: { id: instanceInfo.entityId, tenantId: req.tenant.id },
        data:  { status: newStatus },
      })
    } else if (instanceInfo?.entityType === 'purchase_order') {
      const newStatus = result.data.finalStatus === 'APPROVED'
        ? 'APPROVED'
        : `PENDING_L${result.data.nextStage ?? 1}`
      await app.prisma.purchaseOrder.update({
        where: { id: instanceInfo.entityId, tenantId: req.tenant.id },
        data:  { status: newStatus },
      })
    } else if (instanceInfo?.entityType === 'item') {
      // Item masters: typically a single-stage workflow (TENANT_ADMIN). On
      // final approval the item flips ACTIVE; otherwise stays PENDING_APPROVAL
      // while subsequent stages run.
      if (result.data.finalStatus === 'APPROVED') {
        await app.prisma.itemMaster.update({
          where: { id: instanceInfo.entityId, tenantId: req.tenant.id },
          data:  { status: 'ACTIVE' },
        })
      }
    } else if (instanceInfo?.entityType === 'item_change') {
      // Material-field change request on an ACTIVE item. On final approval,
      // load the persisted diff and apply it to the live item. The change
      // request itself is marked APPROVED and the reviewer is recorded.
      if (result.data.finalStatus === 'APPROVED') {
        const cr = await app.prisma.itemMasterChangeRequest.findFirst({
          where: { id: instanceInfo.entityId, tenantId: req.tenant.id },
        })
        if (cr) {
          const payload = cr.changedFields as { after: Record<string, unknown> }
          const update  = applyChangeDiff(payload.after ?? {})
          await app.prisma.$transaction([
            app.prisma.itemMaster.update({
              where: { id: cr.itemId, tenantId: req.tenant.id },
              data:  update as never,
            }),
            app.prisma.itemMasterChangeRequest.update({
              where: { id: cr.id },
              data:  { status: 'APPROVED', reviewedBy: req.user.sub, reviewedAt: new Date(), reviewComments: comments },
            }),
          ])
        }
      }
    }

    return reply.send(result.data)
  })

  // Reject current stage
  app.post('/instances/:id/reject', auth, async (req, reply) => {
    const { mode = 'RETURN_TO_DRAFT', comments } = req.body as any
    if (!comments) return reply.code(400).send({ message: 'Comments required for rejection' })
    const instanceId = (req.params as any).id as string
    const ctx = {
      tenantId: req.tenant.id, userId: req.user.sub,
      userName: (req.user as any).name ?? req.user.sub, userRole: (req.user as any).role,
    }

    const instanceInfo = await app.prisma.workflowInstance.findFirst({
      where:  { id: instanceId, tenantId: req.tenant.id },
      select: { entityType: true, entityId: true, currentStageOrder: true },
    })

    const result = await rejectStage(app.prisma, instanceId, mode, comments, ctx)
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)

    if (instanceInfo?.entityType === 'invoice') {
      let newInvStatus: string
      if (mode === 'REQUEST_INFO') {
        newInvStatus = instanceInfo.currentStageOrder <= 1 ? 'PENDING_L1' : 'PENDING_L2'
      } else if (mode === 'RETURN_TO_DRAFT') {
        newInvStatus = 'REJECTED'
      } else {
        const prevOrder = instanceInfo.currentStageOrder - 1
        newInvStatus = prevOrder <= 1 ? 'PENDING_L1' : 'PENDING_L2'
      }
      await app.prisma.invoice.update({
        where: { id: instanceInfo.entityId },
        data:  {
          status: newInvStatus,
          ...(mode === 'RETURN_TO_DRAFT' && { rejectionReason: comments }),
        },
      })
      await app.prisma.invoiceAuditLog.create({
        data: {
          invoiceId: instanceInfo.entityId, tenantId: req.tenant.id,
          action: mode === 'RETURN_TO_DRAFT' ? 'REJECTED'
            : mode === 'REQUEST_INFO'        ? 'INFO_REQUESTED'
            : 'RETURNED_TO_PREV_STAGE',
          userId: req.user.sub, userName: (req.user as any).name,
          details: { comments, mode, newStatus: newInvStatus },
        },
      })
    } else if (instanceInfo?.entityType === 'purchase_requisition') {
      const newStatus = mode === 'REQUEST_INFO'
        ? `PENDING_L${instanceInfo.currentStageOrder}`
        : mode === 'RETURN_TO_DRAFT' ? 'REJECTED'
        : `PENDING_L${Math.max(1, instanceInfo.currentStageOrder - 1)}`
      await app.prisma.purchaseRequisition.update({
        where: { id: instanceInfo.entityId, tenantId: req.tenant.id },
        data:  { status: newStatus, ...(mode === 'RETURN_TO_DRAFT' && { rejectionReason: comments }) },
      })
    } else if (instanceInfo?.entityType === 'purchase_order') {
      const newStatus = mode === 'REQUEST_INFO'
        ? `PENDING_L${instanceInfo.currentStageOrder}`
        : mode === 'RETURN_TO_DRAFT' ? 'REJECTED'
        : `PENDING_L${Math.max(1, instanceInfo.currentStageOrder - 1)}`
      await app.prisma.purchaseOrder.update({
        where: { id: instanceInfo.entityId, tenantId: req.tenant.id },
        data:  { status: newStatus, ...(mode === 'RETURN_TO_DRAFT' && { rejectionReason: comments }) },
      })
    } else if (instanceInfo?.entityType === 'item') {
      // Item workflows are single-stage in the default seed, so RETURN_TO_PREV
      // collapses to DRAFT same as RETURN_TO_DRAFT. REQUEST_INFO holds the
      // item in PENDING_APPROVAL while the chat thread resolves.
      const newStatus = resolveItemStatusAfterReject(mode as 'RETURN_TO_DRAFT' | 'RETURN_TO_PREV_STAGE' | 'REQUEST_INFO')
      await app.prisma.itemMaster.update({
        where: { id: instanceInfo.entityId, tenantId: req.tenant.id },
        data:  { status: newStatus },
      })
    } else if (instanceInfo?.entityType === 'item_change') {
      // Reject a change request — discard. The live item stays ACTIVE
      // (untouched). REQUEST_INFO leaves the request PENDING_APPROVAL.
      if (mode !== 'REQUEST_INFO') {
        await app.prisma.itemMasterChangeRequest.update({
          where: { id: instanceInfo.entityId, tenantId: req.tenant.id },
          data:  { status: 'REJECTED', reviewedBy: req.user.sub, reviewedAt: new Date(), reviewComments: comments },
        })
      }
    }

    return reply.send({ ok: true })
  })

  // Put on hold
  app.post('/instances/:id/hold', auth, async (req, reply) => {
    const { reason } = req.body as any
    await putOnHold(app.prisma, (req.params as any).id, reason ?? 'Manual hold', {
      tenantId: req.tenant.id, userId: req.user.sub,
      userName: (req.user as any).name ?? req.user.sub,
    })
    return reply.send({ ok: true })
  })

  // Release from hold
  app.post('/instances/:id/release', auth, async (req, reply) => {
    const { remarks } = req.body as any
    if (!remarks) return reply.code(400).send({ message: 'Release remarks required' })
    await releaseFromHold(app.prisma, (req.params as any).id, remarks, {
      tenantId: req.tenant.id, userId: req.user.sub,
      userName: (req.user as any).name ?? req.user.sub,
    })
    return reply.send({ ok: true })
  })

  // Add chat message (with optional attachments)
  app.post('/instances/:id/chat', auth, async (req, reply) => {
    const { message, messageType = 'COMMENT', attachments = [] } = req.body as any
    if (!message) return reply.code(400).send({ message: 'Message is required' })
    const result = await addChatMessage(
      app.prisma, (req.params as any).id, message, messageType, attachments,
      {
        tenantId: req.tenant.id, userId: req.user.sub,
        userName: (req.user as any).name ?? req.user.sub, userRole: (req.user as any).role,
      },
    )
    if (!result.ok) return reply.code(400).send(result.error)
    return reply.code(201).send(result.data)
  })

  // List workflow definitions
  app.get('/definitions', auth, async (req, reply) => {
    const { module, status } = req.query as any
    return reply.send(await app.prisma.workflowDefinition.findMany({
      where:   {
        tenantId: req.tenant.id,
        ...(module && { module }),
        ...(status && status !== 'ALL' && { status }),
      },
      include: { stages: { orderBy: { order: 'asc' } }, conditions: true, _count: { select: { instances: true } } },
      orderBy: { priority: 'desc' },
    }))
  })

  // Get single definition by ID
  app.get('/definitions/:id', auth, async (req, reply) => {
    const def = await app.prisma.workflowDefinition.findFirst({
      where:   { id: (req.params as any).id, tenantId: req.tenant.id },
      include: { stages: { orderBy: { order: 'asc' } }, conditions: true },
    })
    if (!def) return reply.code(404).send({ message: 'Workflow definition not found' })
    return reply.send(def)
  })

  // Duplicate a definition
  app.post('/definitions/:id/duplicate', auth, async (req, reply) => {
    const src = await app.prisma.workflowDefinition.findFirst({
      where:   { id: (req.params as any).id, tenantId: req.tenant.id },
      include: { stages: { orderBy: { order: 'asc' } }, conditions: true },
    })
    if (!src) return reply.code(404).send({ message: 'Workflow definition not found' })

    const { id: _id, tenantId: _t, createdAt: _ca, updatedAt: _ua,
      stages, conditions, ...rest } = src as any

    const copy = await app.prisma.$transaction(async tx => {
      const d = await tx.workflowDefinition.create({
        data: {
          ...rest,
          tenantId:        req.tenant.id,
          createdByUserId: req.user.sub,
          name:            `${src.name} (Copy)`,
          code:            `${src.code}-COPY-${Date.now().toString(36).slice(-4).toUpperCase()}`,
          status:          'DRAFT',
        },
      })
      if (stages.length) {
        await tx.workflowDefinitionStage.createMany({
          data: stages.map(({ id: _sid, definitionId: _did, ...s }: any) => ({ ...s, definitionId: d.id })),
        })
      }
      if (conditions.length) {
        await tx.workflowDefinitionCondition.createMany({
          data: conditions.map(({ id: _cid, definitionId: _did, ...c }: any) => ({ ...c, definitionId: d.id })),
        })
      }
      return d
    })
    return reply.code(201).send(copy)
  })

  // Create definition
  app.post('/definitions', auth, async (req, reply) => {
    const { stages = [], conditions = [], ...data } = req.body as any
    const def = await app.prisma.$transaction(async tx => {
      const d = await tx.workflowDefinition.create({
        data: { ...data, tenantId: req.tenant.id, createdByUserId: req.user.sub },
      })
      if (stages.length) {
        await tx.workflowDefinitionStage.createMany({
          data: stages.map((s: any) => ({ ...s, definitionId: d.id })),
        })
      }
      if (conditions.length) {
        await tx.workflowDefinitionCondition.createMany({
          data: conditions.map((c: any) => ({ ...c, definitionId: d.id })),
        })
      }
      return d
    })
    return reply.code(201).send(def)
  })

  // Update definition (replace stages + conditions)
  app.put('/definitions/:id', auth, async (req, reply) => {
    const { id } = req.params as any
    const { stages = [], conditions = [], ...data } = req.body as any
    await app.prisma.$transaction(async tx => {
      await tx.workflowDefinition.update({ where: { id }, data })
      await tx.workflowDefinitionStage.deleteMany({ where: { definitionId: id } })
      await tx.workflowDefinitionCondition.deleteMany({ where: { definitionId: id } })
      if (stages.length) {
        await tx.workflowDefinitionStage.createMany({ data: stages.map((s: any) => ({ ...s, definitionId: id })) })
      }
      if (conditions.length) {
        await tx.workflowDefinitionCondition.createMany({ data: conditions.map((c: any) => ({ ...c, definitionId: id })) })
      }
    })
    return reply.send({ ok: true })
  })
}
