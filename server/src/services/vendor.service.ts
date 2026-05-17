import type { PrismaClient } from '@prisma/client'
import { ok, err, Errors, type Result } from '../lib/result.js'
import { runVendorKyc, type KycContext } from './kyc.orchestrator.js'
import { writeAuditLog, AuditAction } from '../lib/audit.js'
import { cacheInvalidate, CacheKeys, type Redis } from '../lib/redis.js'

// ── Types ──

export interface BankAccountInput {
  id?:                string
  accountNo:          string
  ifsc:               string
  bankName?:          string
  branch?:            string
  accountType?:       string
  currencyCode?:      string
  accountHolderName?: string
  isPrimary?:         boolean
}

export interface GstRegistrationInput {
  id?:               string
  stateCode:         string
  gstin:             string
  registrationType?: string
  isPrimary?:        boolean
  spocName?:         string
  spocEmail?:        string
  spocPhone?:        string
}

export interface EntityMappingInput {
  id?:              string
  entityId:         string
  glCodeId?:        string
  costCentreId?:    string
  profitCentreId?:  string
  currencyCode?:    string
  creditLimit?:     number
  blockPO?:         boolean
  blockPayment?:    boolean
  blockReason?:     string
  paymentTermsDays?: number
  paymentMode?:     string
  erpVendorCode?:   string
  erpSystem?:       string
}

export interface VendorCreateInput {
  // Identity
  legalName:         string
  tradeName?:        string
  gstin?:            string
  pan:               string
  cin?:              string
  udyamNumber?:      string
  vendorType:        string
  vendorCategoryId?: string
  vendorGroupId?:    string
  countryCode?:      string
  taxRegimeCode?:    string
  // Contact
  email?:            string
  mobile?:           string
  contactName?:      string
  website?:          string
  // Address
  addressLine1?:     string
  addressLine2?:     string
  city?:             string
  state?:            string
  stateCode?:        string
  pincode?:          string
  // Payment
  paymentTerms?:     number
  paymentMode?:      string
  paymentCurrency?:  string
  // TDS
  tdsApplicable?:     boolean
  tdsSectionCode?:    string
  tdsSectionId?:      string
  tdsRate?:           number
  tdsExempt?:         boolean
  lowerTdsCertNo?:    string
  lowerTdsSection?:   string
  lowerTdsRate?:      number
  lowerTdsValidFrom?: string
  lowerTdsValidTo?:   string
  lowerTdsAlertDays?: number
  einvoiceRequired?:  boolean
  is206ABApplicable?: boolean
  tan?:               string
  panCompliance?:     string
  // ERP
  erpVendorCode?: string
  erpSystem?:     string
  // PAN / Aadhaar / MSME
  panEntityType?: string
  aadharNo?:      string
  msmeCategory?:  string
  llpRegNo?:      string
  trustRegNo?:    string
  // Sub-tables (full replace on update)
  bankAccounts?:     BankAccountInput[]
  gstRegistrations?: GstRegistrationInput[]
  entityMappings?:   EntityMappingInput[]
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

  // 3. Create vendor + sub-tables in a transaction
  const vendor = await prisma.$transaction(async (tx) => {
    const v = await tx.vendor.create({
      data: {
        tenantId,
        vendorCode,
        legalName:         input.legalName,
        tradeName:         input.tradeName,
        gstin:             input.gstin,
        pan:               input.pan.toUpperCase(),
        cin:               input.cin?.toUpperCase(),
        udyamNumber:       input.udyamNumber?.toUpperCase(),
        vendorType:        input.vendorType as any,
        vendorCategoryId:  input.vendorCategoryId,
        vendorGroupId:     input.vendorGroupId,
        countryCode:       input.countryCode ?? 'IN',
        taxRegimeCode:     input.taxRegimeCode,
        email:             input.email?.toLowerCase(),
        mobile:            input.mobile,
        contactName:       input.contactName,
        website:           input.website,
        addressLine1:      input.addressLine1,
        addressLine2:      input.addressLine2,
        city:              input.city,
        state:             input.state,
        stateCode:         input.stateCode,
        pincode:           input.pincode,
        paymentTerms:      input.paymentTerms ?? 30,
        paymentMode:       input.paymentMode ?? 'NEFT',
        paymentCurrency:   input.paymentCurrency ?? 'INR',
        tdsApplicable:     input.tdsApplicable ?? false,
        tdsSectionCode:    input.tdsSectionCode,
        tdsSectionId:      input.tdsSectionId,
        tdsRate:           input.tdsRate,
        tdsExempt:         input.tdsExempt ?? false,
        lowerTdsCertNo:    input.lowerTdsCertNo,
        lowerTdsSection:   input.lowerTdsSection,
        lowerTdsRate:      input.lowerTdsRate,
        lowerTdsValidFrom: input.lowerTdsValidFrom ? new Date(input.lowerTdsValidFrom) : undefined,
        lowerTdsValidTo:   input.lowerTdsValidTo   ? new Date(input.lowerTdsValidTo)   : undefined,
        lowerTdsAlertDays: input.lowerTdsAlertDays ?? 30,
        einvoiceRequired:  input.einvoiceRequired  ?? false,
        is206ABApplicable: input.is206ABApplicable ?? false,
        tan:               input.tan?.toUpperCase(),
        panCompliance:     (input.panCompliance ?? 'COMPLIANT') as any,
        erpVendorCode:     input.erpVendorCode,
        erpSystem:         input.erpSystem,
        panEntityType:     input.panEntityType,
        aadharNo:          input.aadharNo,
        msmeCategory:      input.msmeCategory,
        llpRegNo:          input.llpRegNo,
        trustRegNo:        input.trustRegNo,
        status:            'PENDING_APPROVAL',
      },
    })

    if (input.bankAccounts?.length) {
      await tx.vendorBankAccount.createMany({
        data: input.bankAccounts.map(b => ({
          vendorId:          v.id,
          accountNo:         b.accountNo,
          ifsc:              b.ifsc.toUpperCase(),
          bankName:          b.bankName,
          branch:            b.branch,
          accountType:       b.accountType ?? 'CURRENT',
          currencyCode:      b.currencyCode ?? 'INR',
          accountHolderName: b.accountHolderName,
          isPrimary:         b.isPrimary ?? false,
        })),
      })
    }

    if (input.gstRegistrations?.length) {
      await tx.vendorGstRegistration.createMany({
        data: input.gstRegistrations.map(g => ({
          vendorId:         v.id,
          stateCode:        g.stateCode,
          gstin:            g.gstin.toUpperCase(),
          registrationType: g.registrationType ?? 'REGULAR',
          isPrimary:        g.isPrimary ?? false,
          spocName:         g.spocName,
          spocEmail:        g.spocEmail,
          spocPhone:        g.spocPhone,
        })),
      })
    }

    if (input.entityMappings?.length) {
      await tx.vendorEntityMapping.createMany({
        data: input.entityMappings.map(e => ({
          vendorId:        v.id,
          entityId:        e.entityId,
          glCodeId:        e.glCodeId,
          costCentreId:    e.costCentreId,
          profitCentreId:  e.profitCentreId,
          currencyCode:    e.currencyCode ?? 'INR',
          creditLimit:     e.creditLimit,
          blockPO:         e.blockPO ?? false,
          blockPayment:    e.blockPayment ?? false,
          blockReason:     e.blockReason,
          paymentTermsDays: e.paymentTermsDays ?? 30,
          paymentMode:     e.paymentMode ?? 'NEFT',
          erpVendorCode:   e.erpVendorCode,
          erpSystem:       e.erpSystem,
        })),
      })
    }

    return v
  })

  await writeAuditLog(prisma, {
    tenantId, userId: ctx.userId,
    action: AuditAction.VENDOR_CREATED,
    entityType: 'vendor', entityId: vendor.id,
    after: { vendorCode, legalName: input.legalName },
    ipAddress: ctx.ip,
  })

  await cacheInvalidate(redis, CacheKeys.masterData(tenantId))

  runVendorKyc(prisma, {
    id: vendor.id, pan: vendor.pan, gstin: vendor.gstin ?? undefined,
    cin: vendor.cin ?? undefined, udyamNumber: vendor.udyamNumber ?? undefined,
    bankAccountNo: undefined, ifscCode: undefined,
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

// ── Get single vendor (includes sub-tables for detail/edit) ──

export async function getVendor(prisma: PrismaClient, id: string, tenantId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id, tenantId },
    include: {
      bankAccounts:     { where: { status: 'ACTIVE' }, orderBy: { isPrimary: 'desc' } },
      gstRegistrations: { where: { status: 'ACTIVE' }, orderBy: { isPrimary: 'desc' } },
      entityMappings:   { where: { isActive: true } },
    },
  })
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

  await prisma.$transaction(async (tx) => {
    await tx.vendor.update({
      where: { id },
      data: {
        legalName:         input.legalName,
        tradeName:         input.tradeName,
        gstin:             input.gstin,
        pan:               input.pan?.toUpperCase(),
        cin:               input.cin?.toUpperCase(),
        udyamNumber:       input.udyamNumber?.toUpperCase(),
        vendorType:        input.vendorType as any,
        vendorCategoryId:  input.vendorCategoryId,
        vendorGroupId:     input.vendorGroupId,
        countryCode:       input.countryCode,
        taxRegimeCode:     input.taxRegimeCode,
        email:             input.email?.toLowerCase(),
        mobile:            input.mobile,
        contactName:       input.contactName,
        website:           input.website,
        addressLine1:      input.addressLine1,
        addressLine2:      input.addressLine2,
        city:              input.city,
        state:             input.state,
        stateCode:         input.stateCode,
        pincode:           input.pincode,
        paymentTerms:      input.paymentTerms,
        paymentMode:       input.paymentMode,
        paymentCurrency:   input.paymentCurrency,
        tdsApplicable:     input.tdsApplicable,
        tdsSectionCode:    input.tdsSectionCode,
        tdsSectionId:      input.tdsSectionId,
        tdsRate:           input.tdsRate,
        tdsExempt:         input.tdsExempt,
        lowerTdsCertNo:    input.lowerTdsCertNo,
        lowerTdsSection:   input.lowerTdsSection,
        lowerTdsRate:      input.lowerTdsRate,
        lowerTdsValidFrom: input.lowerTdsValidFrom ? new Date(input.lowerTdsValidFrom) : undefined,
        lowerTdsValidTo:   input.lowerTdsValidTo   ? new Date(input.lowerTdsValidTo)   : undefined,
        lowerTdsAlertDays: input.lowerTdsAlertDays,
        einvoiceRequired:  input.einvoiceRequired,
        is206ABApplicable: input.is206ABApplicable,
        tan:               input.tan?.toUpperCase(),
        panCompliance:     input.panCompliance as any,
        erpVendorCode:     input.erpVendorCode,
        erpSystem:         input.erpSystem,
        panEntityType:     input.panEntityType,
        aadharNo:          input.aadharNo,
        msmeCategory:      input.msmeCategory,
        llpRegNo:          input.llpRegNo,
        trustRegNo:        input.trustRegNo,
      },
    })

    if (input.bankAccounts !== undefined) {
      await tx.vendorBankAccount.deleteMany({ where: { vendorId: id } })
      if (input.bankAccounts.length) {
        await tx.vendorBankAccount.createMany({
          data: input.bankAccounts.map(b => ({
            vendorId:          id,
            accountNo:         b.accountNo,
            ifsc:              b.ifsc.toUpperCase(),
            bankName:          b.bankName,
            branch:            b.branch,
            accountType:       b.accountType ?? 'CURRENT',
            currencyCode:      b.currencyCode ?? 'INR',
            accountHolderName: b.accountHolderName,
            isPrimary:         b.isPrimary ?? false,
          })),
        })
      }
    }

    if (input.gstRegistrations !== undefined) {
      await tx.vendorGstRegistration.deleteMany({ where: { vendorId: id } })
      if (input.gstRegistrations.length) {
        await tx.vendorGstRegistration.createMany({
          data: input.gstRegistrations.map(g => ({
            vendorId:         id,
            stateCode:        g.stateCode,
            gstin:            g.gstin.toUpperCase(),
            registrationType: g.registrationType ?? 'REGULAR',
            isPrimary:        g.isPrimary ?? false,
            spocName:         g.spocName,
            spocEmail:        g.spocEmail,
            spocPhone:        g.spocPhone,
          })),
        })
      }
    }

    if (input.entityMappings !== undefined) {
      await tx.vendorEntityMapping.deleteMany({ where: { vendorId: id } })
      if (input.entityMappings.length) {
        await tx.vendorEntityMapping.createMany({
          data: input.entityMappings.map(e => ({
            vendorId:        id,
            entityId:        e.entityId,
            glCodeId:        e.glCodeId,
            costCentreId:    e.costCentreId,
            profitCentreId:  e.profitCentreId,
            currencyCode:    e.currencyCode ?? 'INR',
            creditLimit:     e.creditLimit,
            blockPO:         e.blockPO ?? false,
            blockPayment:    e.blockPayment ?? false,
            blockReason:     e.blockReason,
            paymentTermsDays: e.paymentTermsDays ?? 30,
            paymentMode:     e.paymentMode ?? 'NEFT',
            erpVendorCode:   e.erpVendorCode,
            erpSystem:       e.erpSystem,
          })),
        })
      }
    }
  })

  await writeAuditLog(prisma, {
    tenantId, userId: ctx.userId,
    action: AuditAction.VENDOR_UPDATED,
    entityType: 'vendor', entityId: id,
    before: { legalName: existing.legalName, status: existing.status },
    after:  { legalName: input.legalName ?? existing.legalName, status: existing.status },
    ipAddress: ctx.ip,
  })

  await cacheInvalidate(redis, CacheKeys.masterData(tenantId))

  const kycTriggerFields = ['pan', 'gstin', 'cin', 'udyamNumber']
  const needsKyc = kycTriggerFields.some(f => (input as any)[f] !== undefined)
  if (needsKyc) {
    const updated = await prisma.vendor.findFirst({ where: { id } })
    if (updated) {
      runVendorKyc(prisma, {
        id, pan: updated.pan, gstin: updated.gstin ?? undefined,
        cin: updated.cin ?? undefined, udyamNumber: updated.udyamNumber ?? undefined,
        bankAccountNo: undefined, ifscCode: undefined,
        legalName: updated.legalName, email: updated.email ?? undefined, mobile: updated.mobile ?? undefined,
      }, ctx).catch(e => console.error('[KYC] Re-check failed:', e))
    }
  }

  return ok({ id })
}
