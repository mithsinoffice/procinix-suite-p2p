import type { FastifyInstance } from 'fastify'
import {
  approveStage, rejectStage, putOnHold, releaseFromHold,
  addChatMessage, getWorkflowInstance, startWorkflow,
  type WfModule,
} from '../services/workflow-engine.service.js'
import { resolveItemStatusAfterReject } from '../services/item-submit.service.js'
import { applyChangeDiff } from '../services/item-change.service.js'
import { triggerOnInvoiceApproval } from '../services/accounting-trigger.service.js'
import { resolveMasterStatusAfterReject } from '../services/master-submit.service.js'
import { postBatchJVs, rejectBatch } from '../services/provision-jv.service.js'

// Maps entityType (workflow_instance.entity_type) → Prisma delegate name.
// Used by the generic master approve/reject branches below so every master
// follows the same final-flip semantics: APPROVED → status=ACTIVE +
// isActive=true (where applicable). Centralised here so adding a new master
// is one map entry, not a new handler branch.
const MASTER_ENTITY_DELEGATES: Record<string, { delegate: string; setsIsActive: boolean }> = {
  vendor:         { delegate: 'vendor',         setsIsActive: false },
  employee:       { delegate: 'employee',       setsIsActive: true  },
  user:           { delegate: 'user',           setsIsActive: true  },
  budget:         { delegate: 'budget',         setsIsActive: false },
  financial_year: { delegate: 'financialYear',  setsIsActive: true  },
  currency:       { delegate: 'currency',       setsIsActive: true  },
  profit_centre:  { delegate: 'profitCentre',   setsIsActive: false },
  item_category:  { delegate: 'itemCategory',   setsIsActive: false },
  // Generic-CRUD masters that route through TABLE_ROUTE_MAP also flow through
  // here on approve/reject — keeps the workflow engine the single source of
  // truth for "what does APPROVED do to the master record".
  department:     { delegate: 'department',     setsIsActive: true  },
  gl_code:        { delegate: 'glCode',         setsIsActive: true  },
  cost_centre:    { delegate: 'costCentre',     setsIsActive: true  },
  tax_code:       { delegate: 'taxCode',        setsIsActive: true  },
  designation:    { delegate: 'designation',    setsIsActive: true  },
  entity:         { delegate: 'entity',         setsIsActive: true  },
  location:       { delegate: 'location',       setsIsActive: true  },
  tax_regime:     { delegate: 'taxRegime',      setsIsActive: true  },
  workflow_rule:  { delegate: 'workflowRule',   setsIsActive: true  },
}

// payment_batch has its own approve/reject contract: APPROVED is not the
// terminal state (execute → EXECUTED comes later), so it's handled in its
// own branch below rather than via MASTER_ENTITY_DELEGATES (which assumes
// final approval → ACTIVE).

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
        // Accounting trigger: post accrual / amortization schedule /
        // provision nullification depending on invoice shape. Wrapped in
        // try/catch — accounting errors must not block the approval itself.
        try {
          await triggerOnInvoiceApproval(app.prisma, instanceInfo.entityId, {
            tenantId: req.tenant.id, userId: req.user.sub,
          })
        } catch (err) {
          app.log.error({ err, invoiceId: instanceInfo.entityId }, '[Accounting] trigger failed')
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
    } else if (instanceInfo?.entityType === 'payment_batch') {
      // Payment batch: final approval flips to APPROVED (not ACTIVE) — the
      // batch is then executed manually via POST /batches/:id/execute which
      // posts JVs + creates TDS challans. Interim stages keep PENDING_APPROVAL.
      if (result.data.finalStatus === 'APPROVED') {
        await app.prisma.paymentBatch.update({
          where: { id: instanceInfo.entityId, tenantId: req.tenant.id },
          data:  { status: 'APPROVED' },
        })
      }
    } else if (instanceInfo?.entityType && MASTER_ENTITY_DELEGATES[instanceInfo.entityType]) {
      // Generic master approve flow — applies to vendor, employee, user,
      // budget, financial_year, currency, profit_centre, item_category and
      // the 9 generic-CRUD masters from TABLE_ROUTE_MAP. Final approval flips
      // status → ACTIVE (+ isActive for masters that track both); interim
      // stages keep PENDING_APPROVAL.
      if (result.data.finalStatus === 'APPROVED') {
        const cfg = MASTER_ENTITY_DELEGATES[instanceInfo.entityType]
        const delegate = (app.prisma as unknown as Record<string, { update: (q: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> }>)[cfg.delegate]
        await delegate.update({
          where: { id: instanceInfo.entityId },
          data:  cfg.setsIsActive
            ? { status: 'ACTIVE', isActive: true, approvedByUserId: req.user.sub, approvedAt: new Date() }
            : { status: 'ACTIVE' },
        })
      }
    } else if (instanceInfo?.entityType === 'provision_batch') {
      // Provision batch — on final approval, post the provision JV (DR
      // expense / CR provision) and its paired reversal JV for the first of
      // next month. Interim stages keep the batch in SUBMITTED. Wrapped in
      // try/catch — JV posting errors must not block the approval action
      // itself; operators can replay via the provisions register.
      if (result.data.finalStatus === 'APPROVED') {
        try {
          await postBatchJVs(app.prisma, instanceInfo.entityId, req.user.sub)
        } catch (err) {
          app.log.error({ err, batchId: instanceInfo.entityId }, '[Provisions] JV post failed')
        }
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
    } else if (instanceInfo?.entityType === 'payment_batch') {
      // Reject a payment batch — collapse back to DRAFT so the creator can
      // edit and resubmit. REQUEST_INFO keeps it in PENDING_APPROVAL while
      // the chat thread resolves the question.
      if (mode !== 'REQUEST_INFO') {
        await app.prisma.paymentBatch.update({
          where: { id: instanceInfo.entityId, tenantId: req.tenant.id },
          data:  { status: 'DRAFT' },
        })
      }
    } else if (instanceInfo?.entityType && MASTER_ENTITY_DELEGATES[instanceInfo.entityType]) {
      // Generic master reject flow. RETURN_TO_DRAFT / RETURN_TO_PREV_STAGE
      // flip the master back to DRAFT (single-stage default). REQUEST_INFO
      // holds PENDING_APPROVAL while the chat thread resolves.
      const cfg = MASTER_ENTITY_DELEGATES[instanceInfo.entityType]
      const newStatus = resolveMasterStatusAfterReject(mode as 'RETURN_TO_DRAFT' | 'RETURN_TO_PREV_STAGE' | 'REQUEST_INFO')
      const delegate = (app.prisma as unknown as Record<string, { update: (q: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> }>)[cfg.delegate]
      await delegate.update({
        where: { id: instanceInfo.entityId },
        data:  cfg.setsIsActive ? { status: newStatus, isActive: false } : { status: newStatus },
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
    } else if (instanceInfo?.entityType === 'provision_batch') {
      // Reject a provision batch — flip all proposals back to DRAFT so the
      // creator can edit and resubmit. REQUEST_INFO keeps the batch in
      // SUBMITTED while the chat thread resolves.
      if (mode !== 'REQUEST_INFO') {
        await rejectBatch(app.prisma, instanceInfo.entityId)
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

  // PATCH — partial update used by the listing page toggle action.
  // The full PUT above replaces stages + conditions which would lose data
  // when the caller only wants to flip status. PATCH whitelists the
  // metadata-only fields that the listing can mutate.
  app.patch('/definitions/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as Partial<{
      status: string; name: string; description: string; priority: number; isDefault: boolean
    }>
    const data: Record<string, unknown> = {}
    if (body.status      !== undefined) data.status      = body.status
    if (body.name        !== undefined) data.name        = body.name
    if (body.description !== undefined) data.description = body.description
    if (body.priority    !== undefined) data.priority    = body.priority
    if (body.isDefault   !== undefined) data.isDefault   = body.isDefault
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'No mutable fields supplied' })
    }
    const updated = await app.prisma.workflowDefinition.update({
      where: { id, tenantId: req.tenant.id },
      data,
    })
    return reply.send(updated)
  })

  // DELETE — guarded against in-flight instances so we don't strand live
  // approvals. Use status=ARCHIVED + soft hide if the caller wants to retire
  // a definition that's been used.
  app.delete('/definitions/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const instanceCount = await app.prisma.workflowInstance.count({
      where: { definitionId: id, tenantId: req.tenant.id, status: { in: ['IN_PROGRESS', 'ON_HOLD'] } },
    })
    if (instanceCount > 0) {
      return reply.code(409).send({
        code:    'IN_USE',
        message: `Cannot delete — ${instanceCount} in-flight instance${instanceCount === 1 ? '' : 's'} reference this definition. Archive instead.`,
      })
    }
    await app.prisma.$transaction([
      app.prisma.workflowDefinitionStage.deleteMany({ where: { definitionId: id } }),
      app.prisma.workflowDefinitionCondition.deleteMany({ where: { definitionId: id } }),
      app.prisma.workflowDefinition.delete({ where: { id, tenantId: req.tenant.id } }),
    ])
    return reply.send({ ok: true })
  })

  // Clone — same as /duplicate but a separate name to match the redesigned
  // UI's vocabulary. Returns the new id so the caller can jump straight
  // into the configurator.
  app.post('/definitions/:id/clone', auth, async (req, reply) => {
    const src = await app.prisma.workflowDefinition.findFirst({
      where:   { id: (req.params as { id: string }).id, tenantId: req.tenant.id },
      include: { stages: { orderBy: { order: 'asc' } }, conditions: true },
    })
    if (!src) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Workflow definition not found' })

    const { id: _id, tenantId: _t, createdAt: _ca, updatedAt: _ua, stages, conditions, ...rest } = src as Record<string, unknown> & {
      stages: Array<Record<string, unknown>>; conditions: Array<Record<string, unknown>>
    }

    const copy = await app.prisma.$transaction(async tx => {
      const d = await tx.workflowDefinition.create({
        data: {
          ...(rest as Record<string, unknown>),
          tenantId:        req.tenant.id,
          createdByUserId: req.user.sub,
          name:            `${src.name} (Copy)`,
          code:            `${src.code}-COPY-${Date.now().toString(36).slice(-4).toUpperCase()}`,
          status:          'DRAFT',
        } as never,
      })
      if (stages.length) {
        await tx.workflowDefinitionStage.createMany({
          data: stages.map(({ id: _sid, definitionId: _did, ...s }) => ({ ...s, definitionId: d.id })) as never,
        })
      }
      if (conditions.length) {
        await tx.workflowDefinitionCondition.createMany({
          data: conditions.map(({ id: _cid, definitionId: _did, ...c }) => ({ ...c, definitionId: d.id })) as never,
        })
      }
      return d
    })
    return reply.code(201).send(copy)
  })

  // Field catalog for the condition builder. Static per module — moving it
  // server-side means the UI doesn't have to duplicate the list and new
  // fields appear everywhere without a frontend deploy. Selecting modules
  // not in the catalog returns an empty list (free-form field name fallback
  // is fine for those — admin-only masters rarely need conditions).
  app.get('/fields', auth, async (req, reply) => {
    const { module } = req.query as { module?: string }
    return reply.send(FIELD_CATALOG[module ?? ''] ?? [])
  })

  // AI assistant — rule-based plain-English → step list. No external LLM
  // call; instead we keyword-match against known role names + recognise
  // a small set of connectors ("then", "and then", "if X then"). Returns
  // a draft chain the user can then edit in the configurator. The contract
  // matches what the configurator expects so the prefill is one-shot.
  app.post('/assistant', auth, async (req, reply) => {
    const body = (req.body ?? {}) as { prompt?: string; module?: string }
    if (!body.prompt) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'prompt is required' })
    const draft = parsePromptToChain(body.prompt, body.module ?? 'INVOICE')
    return reply.send(draft)
  })
}

// ── Field catalog ──
// Per-module condition fields. Mirrors the inline catalog in the legacy
// configurator so the new UI can call the API instead of hard-coding it.
// Adding a new module: drop another entry here.
type FieldDef = { field: string; label: string; type: 'number' | 'string' | 'boolean' | 'select' }
const FIELD_CATALOG: Record<string, FieldDef[]> = {
  INVOICE: [
    { field: 'totalAmount',    label: 'Total amount (₹)', type: 'number'  },
    { field: 'entityId',       label: 'Entity',           type: 'select'  },
    { field: 'vendorType',     label: 'Vendor type',      type: 'select'  },
    { field: 'currencyCode',   label: 'Currency',         type: 'select'  },
    { field: 'isPOInvoice',    label: 'Is PO invoice',    type: 'boolean' },
    { field: 'isFirstInvoice', label: 'First invoice',    type: 'boolean' },
    { field: 'channelType',    label: 'Channel type',     type: 'select'  },
  ],
  VENDOR: [
    { field: 'vendorType',  label: 'Vendor type', type: 'select' },
    { field: 'countryCode', label: 'Country',     type: 'select' },
  ],
  PAYMENT: [
    { field: 'totalAmount',  label: 'Batch amount (₹)', type: 'number'  },
    { field: 'currencyCode', label: 'Currency',         type: 'select'  },
    { field: 'isUrgent',     label: 'Urgent',           type: 'boolean' },
  ],
  PR: [
    { field: 'totalAmount',  label: 'PR amount (₹)', type: 'number' },
    { field: 'departmentId', label: 'Department',    type: 'select' },
    { field: 'entityId',     label: 'Entity',        type: 'select' },
  ],
  PO: [
    { field: 'totalAmount',  label: 'PO amount (₹)', type: 'number' },
    { field: 'entityId',     label: 'Entity',        type: 'select' },
  ],
  PROVISION: [
    { field: 'totalAmount', label: 'Batch amount (₹)', type: 'number' },
  ],
  GRN: [
    { field: 'totalAmount', label: 'GRN value (₹)', type: 'number' },
  ],
}

// ── AI assistant — rule-based prompt parser ──
// Recognised role keywords map English phrases ("HOD", "finance manager",
// "CFO") to the canonical role codes the engine resolves against. Order
// in this map matters — longer keys are matched first so "finance
// manager" wins over a stray "manager".
const ROLE_KEYWORDS: Array<{ keys: string[]; role: string; name: string }> = [
  { keys: ['finance manager', 'finance head'],   role: 'FINANCE_MANAGER', name: 'Finance Manager Review'  },
  { keys: ['ap manager', 'ap head', 'ap clerk'], role: 'AP_MANAGER',      name: 'AP Review'               },
  { keys: ['procurement head', 'procurement'],   role: 'PROCUREMENT_HEAD',name: 'Procurement Review'      },
  { keys: ['dept head', 'department head', 'hod'], role: 'DEPT_HEAD',     name: 'Department Head Approval'},
  { keys: ['tenant admin', 'admin'],             role: 'TENANT_ADMIN',    name: 'Tenant Admin Approval'   },
  { keys: ['cfo'],                                role: 'CFO',             name: 'CFO Approval'            },
  { keys: ['md', 'managing director'],           role: 'MD',              name: 'MD Approval'             },
  { keys: ['ceo'],                                role: 'CEO',             name: 'CEO Approval'            },
]

interface DraftStage {
  order:           number
  name:            string
  approverType:    'ROLE' | 'USER' | 'MANAGER_OF' | 'DEPT_HEAD'
  approverRole:    string | null
  slaHours:        number
  requiresComment: boolean
  allowDelegation: boolean
  onReject:        'RETURN_TO_DRAFT' | 'RETURN_TO_PREV_STAGE' | 'REQUEST_INFO'
}
interface DraftCondition {
  field:      string
  operator:   string
  value:      string
  logicGroup: 'AND' | 'OR'
}
interface DraftChain {
  name:        string
  description: string
  stages:      DraftStage[]
  conditions:  DraftCondition[]
}

// Naive prompt parser. Splits on connectors, walks the resulting fragments
// in order, matches each against ROLE_KEYWORDS. "if amount > X then Y"
// gets pulled out as a condition. Good enough for a UX-helper draft —
// the user always confirms in the configurator before save.
export function parsePromptToChain(prompt: string, module: string): DraftChain {
  const lower = prompt.toLowerCase()
  const stages: DraftStage[] = []
  const conditions: DraftCondition[] = []
  let order = 1

  // Extract any "if AMOUNT > X" / ">= X" condition at the front. Anchors
  // the rest of the parser since the condition routes a specific later step.
  const numMatch = lower.match(/(?:if|when|above|over|>\s*=?|greater than)\s*[₹]?\s*([\d,]+(?:\.\d+)?)\s*(?:k|lakh|cr|crore)?/i)
  let amountThreshold: number | null = null
  if (numMatch) {
    const raw = numMatch[1].replace(/,/g, '')
    let v = Number(raw)
    if (/lakh/i.test(lower)) v *= 100_000
    if (/cr|crore/i.test(lower)) v *= 10_000_000
    if (/k\b/i.test(lower) && !/lakh|cr/.test(lower)) v *= 1_000
    amountThreshold = v
  }

  // Walk through the role keywords in textual order — `indexOf` lets us
  // sort the matches by their appearance in the prompt.
  const found: Array<{ idx: number; role: string; name: string }> = []
  for (const r of ROLE_KEYWORDS) {
    for (const key of r.keys) {
      const idx = lower.indexOf(key)
      if (idx >= 0) {
        found.push({ idx, role: r.role, name: r.name })
        break
      }
    }
  }
  found.sort((a, b) => a.idx - b.idx)

  // Deduplicate consecutive same-role hits.
  const ordered: typeof found = []
  for (const f of found) {
    if (ordered.at(-1)?.role !== f.role) ordered.push(f)
  }

  for (const f of ordered) {
    stages.push({
      order:           order++,
      name:            f.name,
      approverType:    'ROLE',
      approverRole:    f.role,
      slaHours:        48,
      requiresComment: false,
      allowDelegation: true,
      onReject:        'RETURN_TO_DRAFT',
    })
  }

  // If a threshold was found and we have ≥2 stages, gate the LAST stage
  // behind the condition. This mirrors the spec's "if > X then CFO" example.
  if (amountThreshold != null && stages.length >= 2) {
    conditions.push({
      field:      module === 'INVOICE' || module === 'PR' || module === 'PO' ? 'totalAmount' : 'totalAmount',
      operator:   'GT',
      value:      String(amountThreshold),
      logicGroup: 'AND',
    })
  }

  // Fallback — empty parse just emits a single Finance Manager stage so
  // the user has *something* to edit.
  if (stages.length === 0) {
    stages.push({
      order:           1,
      name:            'Finance Manager Review',
      approverType:    'ROLE',
      approverRole:    'FINANCE_MANAGER',
      slaHours:        48,
      requiresComment: false,
      allowDelegation: true,
      onReject:        'RETURN_TO_DRAFT',
    })
  }

  return {
    name:        prompt.length > 60 ? prompt.slice(0, 57) + '…' : prompt,
    description: `Drafted from prompt: "${prompt}"`,
    stages,
    conditions,
  }
}
