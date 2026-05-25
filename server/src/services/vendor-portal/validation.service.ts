// Validation dashboard service (Sprint 6).
//
// Surfaces the compliance review backlog: documents pending review, bank
// accounts pending verification, compliance records pending verification.
// All scoped to the calling tenant via the join through VendorProfile.

import type { PrismaClient } from '@prisma/client'

export interface ValidationQueueSummary {
  total:           number
  byType:          { documents: number; bankAccounts: number; complianceRecords: number }
  byCountry:       Array<{ countryCode: string; count: number }>
}

export interface ValidationQueueResult {
  pendingDocuments:         Awaited<ReturnType<PrismaClient['vendorProfileDocument']['findMany']>>
  pendingBankVerifications: Awaited<ReturnType<PrismaClient['vendorProfileBankAccount']['findMany']>>
  pendingComplianceRecords: Awaited<ReturnType<PrismaClient['vendorComplianceRecord']['findMany']>>
  summary:                  ValidationQueueSummary
}

export async function getValidationQueue(
  prisma:   PrismaClient,
  tenantId: string,
): Promise<ValidationQueueResult> {
  // VendorProfile.tenantId is the gate; child rows join through `vendor`.
  const vendorTenantFilter = { vendor: { tenantId } }

  const [pendingDocuments, pendingBankVerifications, pendingComplianceRecords] = await Promise.all([
    prisma.vendorProfileDocument.findMany({
      where:   { ...vendorTenantFilter, reviewStatus: 'PENDING' },
      orderBy: { uploadedAt: 'asc' },
      take:    200,
      include: { vendor: { select: { id: true, legalName: true, countryCode: true, vendorCode: true } } },
    }),
    prisma.vendorProfileBankAccount.findMany({
      where:   { ...vendorTenantFilter, verificationStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take:    200,
      include: { vendor: { select: { id: true, legalName: true, countryCode: true, vendorCode: true } } },
    }),
    prisma.vendorComplianceRecord.findMany({
      where:   { ...vendorTenantFilter, verificationStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take:    200,
      include: { vendor: { select: { id: true, legalName: true, countryCode: true, vendorCode: true } } },
    }),
  ])

  // Country aggregation across all three queues — useful for the dashboard
  // strip ("most validations sitting in IN today").
  const byCountryMap = new Map<string, number>()
  const bumpCountry = (cc: string | null | undefined) => {
    if (!cc) return
    byCountryMap.set(cc, (byCountryMap.get(cc) ?? 0) + 1)
  }
  for (const d of pendingDocuments)         bumpCountry(d.vendor.countryCode)
  for (const b of pendingBankVerifications) bumpCountry(b.vendor.countryCode)
  for (const c of pendingComplianceRecords) bumpCountry(c.vendor.countryCode)

  const byCountry = [...byCountryMap.entries()]
    .map(([countryCode, count]) => ({ countryCode, count }))
    .sort((a, b) => b.count - a.count)

  return {
    pendingDocuments,
    pendingBankVerifications,
    pendingComplianceRecords,
    summary: {
      total:    pendingDocuments.length + pendingBankVerifications.length + pendingComplianceRecords.length,
      byType:   {
        documents:         pendingDocuments.length,
        bankAccounts:      pendingBankVerifications.length,
        complianceRecords: pendingComplianceRecords.length,
      },
      byCountry,
    },
  }
}

export async function approveDocument(prisma: PrismaClient, documentId: string, tenantId: string, reviewerId: string) {
  const doc = await prisma.vendorProfileDocument.findFirst({
    where: { id: documentId, vendor: { tenantId } },
    select: { id: true },
  })
  if (!doc) return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'Document not found' } }
  const updated = await prisma.vendorProfileDocument.update({
    where: { id: documentId },
    data:  { reviewStatus: 'APPROVED', reviewedAt: new Date(), reviewedByUserId: reviewerId, rejectionReason: null },
  })
  return { ok: true as const, document: updated }
}

export async function rejectDocument(prisma: PrismaClient, documentId: string, tenantId: string, reviewerId: string, reason: string) {
  const doc = await prisma.vendorProfileDocument.findFirst({
    where: { id: documentId, vendor: { tenantId } },
    select: { id: true },
  })
  if (!doc) return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'Document not found' } }
  const updated = await prisma.vendorProfileDocument.update({
    where: { id: documentId },
    data:  { reviewStatus: 'REJECTED', reviewedAt: new Date(), reviewedByUserId: reviewerId, rejectionReason: reason },
  })
  return { ok: true as const, document: updated }
}

export async function verifyBankAccount(prisma: PrismaClient, bankAccountId: string, tenantId: string, reviewerId: string) {
  const bank = await prisma.vendorProfileBankAccount.findFirst({
    where: { id: bankAccountId, vendor: { tenantId } },
    select: { id: true },
  })
  if (!bank) return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'Bank account not found' } }
  const updated = await prisma.vendorProfileBankAccount.update({
    where: { id: bankAccountId },
    data:  { verificationStatus: 'VERIFIED', verifiedAt: new Date(), verifiedByUserId: reviewerId },
  })
  return { ok: true as const, bankAccount: updated }
}
