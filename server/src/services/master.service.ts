// Generic master data service
// Handles CRUD + draft/submit/approve workflow for all master tables
// Audit log written on every mutation

import type { PrismaClient } from '@prisma/client'
import { ok, err, Errors, type Result } from '../lib/result.js'
import { writeAuditLog } from '../lib/audit.js'
import { cacheInvalidate, CacheKeys, type Redis } from '../lib/redis.js'
import { startWorkflow, type WfModule } from './workflow-engine.service.js'
import {
  validateMasterSubmittable, resolveMasterStatusAfterSubmit,
} from './master-submit.service.js'

export type MasterTable = 'department' | 'glCode' | 'costCentre' | 'taxCode' | 'designation' | 'entity' | 'location' | 'taxRegime' | 'workflowRule' | 'employee'

interface Ctx { tenantId: string; userId: string; ip?: string; userName?: string }

// Maps each generic-CRUD master table to its workflow module + entityType.
// Keeps the seed's WF-XXX-001 module names, the /submit endpoint, and the
// workflow approve/reject branches aligned via a single source of truth.
const TABLE_TO_WF: Record<MasterTable, { module: WfModule; entityType: string }> = {
  department:   { module: 'DEPARTMENT',  entityType: 'department'   },
  glCode:       { module: 'GL_CODE',     entityType: 'gl_code'      },
  costCentre:   { module: 'COST_CENTRE', entityType: 'cost_centre'  },
  taxCode:      { module: 'TAX_CODE',    entityType: 'tax_code'     },
  designation:  { module: 'DESIGNATION', entityType: 'designation'  },
  entity:       { module: 'ENTITY',      entityType: 'entity'       },
  location:     { module: 'LOCATION',    entityType: 'location'     },
  taxRegime:    { module: 'MASTER',      entityType: 'tax_regime'   },
  workflowRule: { module: 'MASTER',      entityType: 'workflow_rule' },
  employee:     { module: 'EMPLOYEE',    entityType: 'employee'     },
}

// ── Map table name to Prisma delegate ──
function getDelegate(prisma: PrismaClient, table: MasterTable) {
  const map: Record<MasterTable, any> = {
    department:   prisma.department,
    glCode:       prisma.glCode,
    costCentre:   prisma.costCentre,
    taxCode:      prisma.taxCode,
    designation:  prisma.designation,
    entity:       prisma.entity,
    location:     prisma.location,
    taxRegime:    prisma.taxRegime,
    workflowRule: prisma.workflowRule,
    employee:     prisma.employee,
  }
  return map[table]
}

// ── List ──
export async function listMaster(
  prisma: PrismaClient,
  table: MasterTable,
  tenantId: string,
  filter: { search?: string; status?: string; cursor?: string; take?: number; mine?: boolean; userId?: string; entityId?: string }
) {
  const delegate = getDelegate(prisma, table)
  const take     = filter.take ?? 50
  const where: any = { tenantId }
  if (filter.status)                       where.status           = filter.status
  if (filter.mine && filter.userId)        where.createdByUserId  = filter.userId
  if (filter.entityId)                     where.entityId         = filter.entityId
  if (filter.search) where.OR = [
    { name: { contains: filter.search } },
    { code: { contains: filter.search } },
  ]

  const [rows, total] = await Promise.all([
    delegate.findMany({
      where,
      take: take + 1,
      ...(filter.cursor && { cursor: { id: filter.cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    }),
    delegate.count({ where }),
  ])

  const hasMore    = rows.length > take
  const data       = hasMore ? rows.slice(0, -1) : rows
  const nextCursor = hasMore ? data[data.length - 1].id : null
  return { data, total, nextCursor, hasMore }
}

const CODE_PREFIXES: Partial<Record<MasterTable, string>> = {
  department:   'DEPT',
  glCode:       'GL',
  costCentre:   'CC',
  taxCode:      'TAX',
  designation:  'DESG',
  entity:       'ENT',
  location:     'LOC',
  employee:     'EMP',
  workflowRule: 'WF',
  taxRegime:    'TREG',
}

async function generateCode(
  prisma: PrismaClient,
  table: MasterTable,
  tenantId: string
): Promise<string> {
  const prefix = CODE_PREFIXES[table] ?? table.toUpperCase().slice(0, 4)
  const count  = await getDelegate(prisma, table).count({ where: { tenantId } })
  return `${prefix}-${String(count + 1).padStart(4, '0')}`
}

// ── Create (as DRAFT) ──
// submitForApproval=true → record is created as DRAFT, then immediately
// submitted through submitMasterRecord() so the workflow engine kicks in.
// Two-step (create + submit) keeps the workflow start logic centralised
// rather than duplicating audit/workflow plumbing in the create path.
export async function createMasterRecord(
  prisma: PrismaClient,
  redis: Redis,
  table: MasterTable,
  tenantId: string,
  input: Record<string, unknown>,
  ctx: Ctx,
  submitForApproval = false
): Promise<Result<{ id: string }>> {
  const delegate = getDelegate(prisma, table)

  if (!input.code) {
    input.code = await generateCode(prisma, table, tenantId)
  } else {
    const existing = await delegate.findFirst({ where: { tenantId, code: String(input.code) } })
    if (existing) return err(Errors.duplicateRecord(table, 'code', String(input.code)))
  }

  const row = await delegate.create({
    data: {
      ...input,
      tenantId,
      status:          'DRAFT',
      createdByUserId: ctx.userId,
      isActive:        false, // only becomes true on approval
    },
  })

  await writeAuditLog(prisma, {
    tenantId, userId: ctx.userId,
    action: `${table}.created`,
    entityType: table, entityId: row.id,
    after: { ...input, status: row.status },
    ipAddress: ctx.ip,
  })

  await cacheInvalidate(redis, CacheKeys.masterData(tenantId))

  if (submitForApproval) {
    const submit = await submitMasterRecord(prisma, table, row.id, tenantId, ctx)
    if (!submit.ok) return err(submit.error)
  }
  return ok({ id: row.id })
}

// ── Update ──
export async function updateMasterRecord(
  prisma: PrismaClient,
  redis: Redis,
  table: MasterTable,
  id: string,
  tenantId: string,
  input: Record<string, unknown>,
  ctx: Ctx
): Promise<Result<{ id: string }>> {
  const delegate = getDelegate(prisma, table)
  const existing = await delegate.findFirst({ where: { id, tenantId } })
  if (!existing) return err(Errors.notFound(table, id))

  await delegate.update({
    where: { id },
    data:  { ...input, status: existing.status === 'ACTIVE' ? 'PENDING_APPROVAL' : existing.status },
  })

  await writeAuditLog(prisma, {
    tenantId, userId: ctx.userId,
    action: `${table}.updated`,
    entityType: table, entityId: id,
    before: existing, after: input,
    ipAddress: ctx.ip,
  })

  await cacheInvalidate(redis, CacheKeys.masterData(tenantId))
  return ok({ id })
}

// ── Submit for approval ──
// Kicks off the workflow engine so the record appears on the Approval Desk
// alongside invoices/POs/items. NO_WORKFLOW_DEFINED still flips to
// PENDING_APPROVAL so the record visibly leaves DRAFT — tenant-admin can
// hand-flip on the listing page. Mirrors the item-master pattern.
export async function submitMasterRecord(
  prisma: PrismaClient,
  table: MasterTable,
  id: string,
  tenantId: string,
  ctx: Ctx
): Promise<Result<void>> {
  const delegate = getDelegate(prisma, table)
  const existing = await delegate.findFirst({ where: { id, tenantId } })
  if (!existing) return err(Errors.notFound(table, id))

  const guard = validateMasterSubmittable(table, existing.status)
  if (!guard.ok) {
    return err({ code: 'WORKFLOW_INVALID_STATE' as const, message: guard.message ?? 'Not submittable', httpStatus: 422 })
  }

  const wfRoute = TABLE_TO_WF[table]
  const wf = await startWorkflow(
    prisma, wfRoute.module, wfRoute.entityType, id, {},
    { tenantId, userId: ctx.userId, userName: ctx.userName ?? ctx.userId },
  )
  if (!wf.ok && wf.error.message !== 'NO_WORKFLOW_DEFINED') {
    return err({ code: 'WORKFLOW_INVALID_STATE' as const, message: wf.error.message, httpStatus: wf.error.httpStatus ?? 400 })
  }
  const newStatus = resolveMasterStatusAfterSubmit({
    ok:                wf.ok,
    autoApproved:      wf.ok ? wf.data.autoApproved : false,
    noWorkflowDefined: !wf.ok,
  })

  await delegate.update({ where: { id }, data: { status: newStatus, isActive: newStatus === 'ACTIVE' } })
  await writeAuditLog(prisma, {
    tenantId, userId: ctx.userId,
    action: `${table}.submitted`,
    entityType: table, entityId: id,
    after: { status: newStatus, workflowInstanceId: wf.ok ? wf.data.instanceId : null },
    ipAddress: ctx.ip,
  })
  return ok(undefined)
}

// ── Approve ──
export async function approveMasterRecord(
  prisma: PrismaClient,
  redis: Redis,
  table: MasterTable,
  id: string,
  tenantId: string,
  ctx: Ctx
): Promise<Result<void>> {
  const delegate = getDelegate(prisma, table)
  const existing = await delegate.findFirst({ where: { id, tenantId } })
  if (!existing) return err(Errors.notFound(table, id))

  await delegate.update({
    where: { id },
    data:  { status: 'ACTIVE', isActive: true, approvedByUserId: ctx.userId, approvedAt: new Date() },
  })

  await writeAuditLog(prisma, { tenantId, userId: ctx.userId, action: `${table}.approved`, entityType: table, entityId: id, ipAddress: ctx.ip })
  await cacheInvalidate(redis, CacheKeys.masterData(tenantId))
  return ok(undefined)
}

// ── Bulk create from CSV rows ──
export async function bulkCreateMasterRecords(
  prisma: PrismaClient,
  redis: Redis,
  table: MasterTable,
  tenantId: string,
  rows: Record<string, unknown>[],
  ctx: Ctx,
  submitForApproval = false
): Promise<{ created: number; failed: { row: number; reason: string }[] }> {
  const delegate = getDelegate(prisma, table)
  let created = 0
  const failed: { row: number; reason: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.code || !row.name) { failed.push({ row: i + 1, reason: 'code and name are required' }); continue }

    const existing = await delegate.findFirst({ where: { tenantId, code: row.code } })
    if (existing) { failed.push({ row: i + 1, reason: `Code '${row.code}' already exists` }); continue }

    try {
      const created_ = await delegate.create({
        data: {
          ...row,
          tenantId,
          status:          'DRAFT',
          createdByUserId: ctx.userId,
          isActive:        false,
        },
      })
      if (submitForApproval) {
        // Best-effort submit — a single failure shouldn't roll back the batch.
        await submitMasterRecord(prisma, table, created_.id, tenantId, ctx)
      }
      created++
    } catch (e) {
      failed.push({ row: i + 1, reason: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  await writeAuditLog(prisma, {
    tenantId, userId: ctx.userId,
    action: `${table}.bulk_uploaded`,
    entityType: table, entityId: 'bulk',
    after: { created, failed: failed.length, submitForApproval },
    ipAddress: ctx.ip,
  })

  await cacheInvalidate(redis, CacheKeys.masterData(tenantId))
  return { created, failed }
}
