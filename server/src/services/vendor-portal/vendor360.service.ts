// Vendor 360 console service (Sprint 6C).
//
// Single-call read that returns everything the per-vendor console needs:
// profile + contacts + addresses + banking + compliance + documents +
// risk history (12mo) + screenings (last 5) + change requests (last 10) +
// onboarding workflow + recent invoices (last 5 from AP) + cumulative
// spend (sum from AP Invoice rows).
//
// Tenant gate is enforced on the top-level VendorProfile query; nested
// finds inherit through the same tenantId.

import type { PrismaClient } from '@prisma/client'

export async function getVendor360(
  prisma:          PrismaClient,
  vendorProfileId: string,
  tenantId:        string,
) {
  const profile = await prisma.vendorProfile.findFirst({
    where: { id: vendorProfileId, tenantId },
    include: {
      contacts:    true,
      addresses:   true,
      bankAccounts: true,
      complianceRecords: { include: { documents: true } },
      documents:   true,
      changeRequests: {
        orderBy: { requestedAt: 'desc' },
        take:    10,
      },
      screenings: {
        orderBy: { screenedAt: 'desc' },
        take:    5,
      },
      riskHistory: {
        orderBy: { scoredAt: 'desc' },
        take:    50, // ~12 months at a few rescreens per month
      },
      request: {
        include: {
          workflow: {
            include: { steps: { orderBy: { level: 'asc' } } },
          },
        },
      },
    },
  })
  if (!profile) return null

  // Cross-domain reads — invoices live on the AP-side Vendor table, not on
  // VendorProfile. Resolve the AP vendor by vendorCode (assigned on ERP
  // sync). If the profile isn't synced yet, return empty invoices + 0
  // spend rather than failing the whole 360 call.
  let recentInvoices: Array<{
    id: string; invoiceNumber: string; invoiceDate: string;
    totalAmount: unknown; status: string; paymentStatus: string; currencyCode: string;
  }> = []
  let totalSpend = 0

  if (profile.vendorCode) {
    const apVendor = await prisma.vendor.findFirst({
      where:  { tenantId, vendorCode: profile.vendorCode },
      select: { id: true },
    })
    if (apVendor) {
      const [recent, sum] = await Promise.all([
        prisma.invoice.findMany({
          where:   { tenantId, vendorId: apVendor.id },
          orderBy: { invoiceDate: 'desc' },
          take:    5,
          select:  { id: true, invoiceNumber: true, invoiceDate: true, totalAmount: true, status: true, paymentStatus: true, currencyCode: true },
        }),
        prisma.invoice.aggregate({
          where: { tenantId, vendorId: apVendor.id },
          _sum:  { totalAmount: true },
        }),
      ])
      recentInvoices = recent.map((i) => ({
        ...i,
        invoiceDate: i.invoiceDate.toISOString().slice(0, 10),
      }))
      totalSpend = Number(sum._sum.totalAmount ?? 0)
    }
  }

  return {
    profile: {
      id:               profile.id,
      vendorCode:       profile.vendorCode,
      legalName:        profile.legalName,
      tradeName:        profile.tradeName,
      countryCode:      profile.countryCode,
      vendorType:       profile.vendorType,
      industryCategory: profile.industryCategory,
      website:          profile.website,
      currency:         profile.currency,
      annualRevenue:    profile.annualRevenue ? Number(profile.annualRevenue) : null,
      employeeCount:    profile.employeeCount,
      riskScore:        profile.riskScore,
      riskTier:         profile.riskTier,
      lastRiskScoredAt: profile.lastRiskScoredAt,
      status:           profile.status,
      isErpSynced:      profile.isErpSynced,
    },
    contacts:          profile.contacts,
    addresses:         profile.addresses,
    bankAccounts:      profile.bankAccounts,
    complianceRecords: profile.complianceRecords,
    documents:         profile.documents,
    screenings:        profile.screenings,
    changeRequests:    profile.changeRequests,
    riskHistory:       profile.riskHistory,
    onboardingRequest: profile.request ? {
      id:                profile.request.id,
      requestCode:       profile.request.requestCode,
      status:            profile.request.status,
      initiationType:    profile.request.initiationType,
      invitedAt:         profile.request.invitedAt,
      submittedAt:       profile.request.submittedAt,
      approvedAt:        profile.request.approvedAt,
    } : null,
    workflow:          profile.request?.workflow ?? null,
    recentInvoices,
    totalSpend,
  }
}
