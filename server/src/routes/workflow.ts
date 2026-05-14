import type { FastifyInstance } from 'fastify'
import {
  approveStage, rejectStage, putOnHold, releaseFromHold,
  addChatMessage, getWorkflowInstance,
} from '../services/workflow-engine.service.js'

export async function workflowRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

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
    const result = await approveStage(app.prisma, (req.params as any).id, comments, {
      tenantId: req.tenant.id, userId: req.user.sub,
      userName: (req.user as any).name ?? req.user.sub, userRole: (req.user as any).role,
    })
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
    return reply.send(result.data)
  })

  // Reject current stage
  app.post('/instances/:id/reject', auth, async (req, reply) => {
    const { mode = 'RETURN_TO_DRAFT', comments } = req.body as any
    if (!comments) return reply.code(400).send({ message: 'Comments required for rejection' })
    const result = await rejectStage(app.prisma, (req.params as any).id, mode, comments, {
      tenantId: req.tenant.id, userId: req.user.sub,
      userName: (req.user as any).name ?? req.user.sub, userRole: (req.user as any).role,
    })
    if (!result.ok) return reply.code(result.error.httpStatus ?? 400).send(result.error)
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
    const { module } = req.query as any
    return reply.send(await app.prisma.workflowDefinition.findMany({
      where:   { tenantId: req.tenant.id, ...(module && { module }) },
      include: { stages: { orderBy: { order: 'asc' } }, conditions: true, _count: { select: { instances: true } } },
      orderBy: { priority: 'desc' },
    }))
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
