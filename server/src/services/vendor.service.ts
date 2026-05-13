import type { PrismaClient } from '@prisma/client'
import { ok, err, Errors, type Result } from '../lib/result.js'
import { runVendorKyc, type KycContext } from './kyc.orchestrator.js'
import { writeAuditLog, AuditAction } from '../lib/audit.js'
import { cacheInvalidate, CacheKeys, type Redis } from '../lib/redis.js'

// ── Types ──

export interface VendorCreateInput {
  legalName:      string
  tradeName?:     string
  gstin?:         string
  pan:            string
  cin?:           string
  udyamNumber?:   string
  vendorType:     string
  email?:         string
  mobile?:        string
  city?:          string
  state?:         string
  pincode?:       string
  bankAccountNo?: string
  ifscCode?:      string
  bankName?:      string
  paymentTerms?:  number
  tdsApplicable?: boolean
  tdsSectionCode?: string
}

export interface VendorListFilter {
  search?:  string
  status?:  string
  cursor?:  string
  take?:    number
}

// ── Create vendor ──

export async function createVendor(
  prisma: PrismaClient,
  redis: Redis,
  tenantId: string,
  input: VendorCreateInput,
  ctx: KycContext
): Promise<Result<{ id: string; vendorCode: string }>> {

  // 1. Check GSTIN uniqueness
  if (input.gstin) {
    const existing = await prisma.vendor.findFirst({ where: { tenantId, gstin: input.gstin } })
    if (existing) return err(Errors.duplicateRecord('Vendor', 'GSTIN', input.gstin))
  }

  // 2. Generate vendor code
  const count = await prisma.vendor.count({ where: { tenantId } })
  const vendorCode = `VND-${String(count + 1).padStart(5, '0')}`

  // 3. Create vendor
  const vendor = await prisma.vendor.create({
    data: {
      tenantId,
      vendorCode,
      legalName:     input.legalName,
      tradeName:     input.tradeName,
      gstin:         input.gstin,
      pan:           input.pan.toUpperCase(),
      cin:           input.cin?.toUpperCase(),
      udyamNumber:   input.udyamNumber?.toUpperCase(),
      vendorType:    input.vendorType as any,
      email:         input.email?.toLowerCase(),
      mobile:        input.mobile,
      city:          input.city,
      state:         input.state,
      pincode:       input.pincode,
      bankAccountNo: input.bankAccountNo,
      ifscCode:      input.ifscCode?.toUpperCase(),
      bankName:      input.bankName,
      paymentTerms:  input.paymentTerms ?? 30,
      tdsApplicable: input.tdsApplicable ?? false,
      tdsSectionCode: input.tdsSectionCode,
      status:        'PENDING_APPROVAL',
    },
  })

  // 4. Audit
  await writeAuditLog(prisma, {
    tenantId, userId: ctx.userId,
    action: AuditAction.VENDOR_CREATED,
    entityType: 'vendor', entityId: vendor.id,
    after: { vendorCode, legalName: input.legalName },
    ipAddress: ctx.ip,
  })

  // 5. Invalidate master data cache
  await cacheInvalidate(redis, CacheKeys.masterData(tenantId))

  // 6. Fire KYC checks async (non-blocking)
  runVendorKyc(prisma, {
    id: vendor.id, pan: vendor.pan, gstin: vendor.gstin ?? undefined,
    cin: vendor.cin ?? undefined, udyamNumber: vendor.udyamNumber ?? undefined,
    bankAccountNo: vendor.bankAccountNo ?? undefined, ifscCode: vendor.ifscCode ?? undefined,
    legalName: vendor.legalName, email: vendor.email ?? undefined, mobile: vendor.mobile ?? undefined,
  }, ctx).catch(e => console.error('[KYC] Background check failed:', e))

  return ok({ id: vendor.id, vendorCode })
}

// ── List vendors ──

export async function listVendors(
  prisma: PrismaClient,
  tenantId: string,
  filter: VendorListFilter
) {
  const take = filter.take ?? 25
  const where: any = { tenantId }
  if (filter.status) where.status = filter.status
  if (filter.search) {
    where.OR = [
      { legalName:  { contains: filter.search } },
      { vendorCode: { contains: filter.search } },
      { gstin:      { contains: filter.search } },
      { pan:        { contains: filter.search } },
    ]
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      take: take + 1,
      ...(filter.cursor && { cursor: { id: filter.cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, vendorCode: true, legalName: true, tradeName: true,
        gstin: true, pan: true, vendorType: true, status: true,
        kycPanStatus: true, kycGstStatus: true, kycBankStatus: true,
        is206ABApplicable: true, gstComplianceScore: true,
        kycMsmeStatus: true, kycCinStatus: true, kycLastCheckedAt: true,
        paymentTerms: true, createdAt: true,
      },
    }),
    prisma.vendor.count({ where }),
  ])

  const hasMore    = vendors.length > take
  const data       = hasMore ? vendors.slice(0, -1) : vendors
  const nextCursor = hasMore ? data[data.length - 1].id : null

  return { data, total, nextCursor, hasMore }
}

// ── Get single vendor ──

export async function getVendor(prisma: PrismaClient, id: string, tenantId: string) {
  const vendor = await prisma.vendor.findFirst({ where: { id, tenantId } })
  if (!vendor) return err(Errors.notFound('Vendor', id))
  return ok(vendor)
}

// ── Update vendor ──

export async function updateVendor(
  prisma: PrismaClient,
  redis: Redis,
  id: string,
  tenantId: string,
  input: Partial<VendorCreateInput>,
  ctx: KycContext
): Promise<Result<{ id: string }>> {
  const existing = await prisma.vendor.findFirst({ where: { id, tenantId } })
  if (!existing) return err(Errors.notFound('Vendor', id))

  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      ...input,
      pan:      input.pan?.toUpperCase(),
      gstin:    input.gstin,
      cin:      input.cin?.toUpperCase(),
      ifscCode: input.ifscCode?.toUpperCase(),
      email:    input.email?.toLowerCase(),
    },
  })

  await writeAuditLog(prisma, {
    tenantId, userId: ctx.userId,
    action: AuditAction.VENDOR_UPDATED,
    entityType: 'vendor', entityId: id,
    before: { legalName: existing.legalName, status: existing.status },
    after:  { legalName: updated.legalName,  status: updated.status  },
    ipAddress: ctx.ip,
  })

  await cacheInvalidate(redis, CacheKeys.masterData(tenantId))

  // Re-run KYC if key compliance fields changed
  const kycFields = ['pan', 'gstin', 'cin', 'udyamNumber', 'bankAccountNo', 'ifscCode']
  const needsKyc  = kycFields.some(f => (input as any)[f] !== undefined)
  if (needsKyc) {
    runVendorKyc(prisma, {
      id, pan: updated.pan, gstin: updated.gstin ?? undefined,
      cin: updated.cin ?? undefined, udyamNumber: updated.udyamNumber ?? undefined,
      bankAccountNo: updated.bankAccountNo ?? undefined, ifscCode: updated.ifscCode ?? undefined,
      legalName: updated.legalName, email: updated.email ?? undefined, mobile: updated.mobile ?? undefined,
    }, ctx).catch(e => console.error('[KYC] Re-check failed:', e))
  }

  return ok({ id })
}
