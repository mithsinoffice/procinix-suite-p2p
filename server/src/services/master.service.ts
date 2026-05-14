// Generic master data service
// Handles CRUD + draft/submit/approve workflow for all master tables
// Audit log written on every mutation

import type { PrismaClient } from '@prisma/client'
import { ok, err, Errors, type Result } from '../lib/result.js'
import { writeAuditLog } from '../lib/audit.js'
import { cacheInvalidate, CacheKeys, type Redis } from '../lib/redis.js'

export type MasterTable = 'department' | 'glCode' | 'costCentre' | 'taxCode'

interface Ctx { tenantId: string; userId: string; ip?: string }

// ── Map table name to Prisma delegate ──
function getDelegate(prisma: PrismaClient, table: MasterTable) {
  const map: Record<MasterTable, any> = {
    department:  prisma.department,
    glCode:      prisma.glCode,
    costCentre:  prisma.costCentre,
    taxCode:     prisma.taxCode,
  }
  return map[table]
}

// ── List ──
export async function listMaster(
  prisma: PrismaClient,
  table: MasterTable,
  tenantId: string,
  filter: { search?: string; status?: string; cursor?: string; take?: number }
) {
  const delegate = getDelegate(prisma, table)
  const take     = filter.take ?? 50
  const where: any = { tenantId }
  if (filter.status) where.status = filter.status
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

// ── Create (as DRAFT) ──
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

  // Check code uniqueness
  if (input.code) {
    const existing = await delegate.findFirst({ where: { tenantId, code: input.code } })
    if (existing) return err(Errors.duplicateRecord(table, 'code', String(input.code)))
  }

  const row = await delegate.create({
    data: {
      ...input,
      tenantId,
      status:          submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT',
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
  if (existing.status !== 'DRAFT') {
    return err({ code: 'WORKFLOW_INVALID_STATE' as const, message: `Cannot submit — status is ${existing.status}`, httpStatus: 422 })
  }

  await delegate.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } })
  await writeAuditLog(prisma, { tenantId, userId: ctx.userId, action: `${table}.submitted`, entityType: table, entityId: id, ipAddress: ctx.ip })
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
      await delegate.create({
        data: {
          ...row,
          tenantId,
          status:          submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT',
          createdByUserId: ctx.userId,
          isActive:        false,
        },
      })
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
