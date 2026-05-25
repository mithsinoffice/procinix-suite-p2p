// Vendor portal transactional layer (Sprint 4).
//
// Helpers that back the /api/portal/vendor/* routes:
//   - nextAsnNumber / nextDisputeNumber — per-tenant + year sequences,
//     same shape as VR-/CR- codes from prior sprints.
//   - resolveVendorJoinKeys — looks up the live Vendor (AP master) for a
//     given VendorProfile (governance). The two are connected via
//     vendorCode; routes use this to query existing P2P tables (PO,
//     Invoice, Payment) by vendorId.
//   - buildReconSummary — aggregates outstanding / paid / disputed across
//     a vendor's invoices and payments.

import type { PrismaClient } from '@prisma/client'

// ── Number generators ────────────────────────────────────────────────────

export async function nextAsnNumber(prisma: PrismaClient, tenantId: string, now: Date = new Date()): Promise<string> {
  const prefix = `ASN-${now.getUTCFullYear()}-`
  const last = await prisma.advanceShipmentNotice.findFirst({
    where:   { tenantId, asnNumber: { startsWith: prefix } },
    orderBy: { asnNumber: 'desc' },
    select:  { asnNumber: true },
  })
  const next = last ? Number(last.asnNumber.slice(prefix.length)) + 1 : 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

export async function nextDisputeNumber(prisma: PrismaClient, tenantId: string, now: Date = new Date()): Promise<string> {
  const prefix = `DIS-${now.getUTCFullYear()}-`
  const last = await prisma.vendorDispute.findFirst({
    where:   { tenantId, disputeNumber: { startsWith: prefix } },
    orderBy: { disputeNumber: 'desc' },
    select:  { disputeNumber: true },
  })
  const next = last ? Number(last.disputeNumber.slice(prefix.length)) + 1 : 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

// ── Profile → AP master bridge ───────────────────────────────────────────

export interface VendorJoinKeys {
  tenantId:        string
  vendorProfileId: string
  apVendorId:      string | null     // null until ERP sync has happened
  apVendorCode:    string | null
  email:           string
}

/**
 * Look up the buyer-side AP vendor (existing `Vendor` table) for a
 * VendorProfile. Returns null `apVendorId` if the profile hasn't been
 * ERP-synced yet — callers can short-circuit empty lists for unsynced
 * profiles rather than blasting unfiltered queries.
 */
export async function resolveVendorJoinKeys(
  prisma:    PrismaClient,
  vendorProfileId: string,
): Promise<VendorJoinKeys | null> {
  const profile = await prisma.vendorProfile.findUnique({
    where:  { id: vendorProfileId },
    select: {
      id: true, tenantId: true, vendorCode: true,
      request: { select: { vendorEmail: true } },
    },
  })
  if (!profile) return null

  let apVendorId: string | null = null
  if (profile.vendorCode) {
    const apVendor = await prisma.vendor.findFirst({
      where:  { tenantId: profile.tenantId, vendorCode: profile.vendorCode },
      select: { id: true },
    })
    apVendorId = apVendor?.id ?? null
  }

  return {
    tenantId:        profile.tenantId,
    vendorProfileId: profile.id,
    apVendorId,
    apVendorCode:    profile.vendorCode,
    email:           profile.request.vendorEmail,
  }
}

// ── Reconciliation aggregator ────────────────────────────────────────────

export interface ReconInvoiceRow {
  id:             string
  invoiceNumber:  string
  invoiceDate:    string
  totalAmount:    number
  paidAmount:     number
  outstanding:    number
  paymentStatus:  string
  currencyCode:   string
}

export interface ReconPaymentRow {
  id:           string
  paymentDate:  string | null
  amount:       number
  utr:          string | null
  invoiceId:    string | null
}

export interface ReconSummary {
  totalInvoiced:     number
  totalPaid:         number
  outstanding:       number
  invoiceCount:      number
  paidInvoiceCount:  number
  invoices:          ReconInvoiceRow[]
  unmatchedPayments: ReconPaymentRow[]
}

/**
 * Build the reconciliation summary for a vendor. "Unmatched payments" are
 * Payment rows with no Invoice.invoiceId join hit — typically advances or
 * payments still being attributed by AP.
 */
export async function buildReconSummary(
  prisma:     PrismaClient,
  tenantId:   string,
  apVendorId: string,
): Promise<ReconSummary> {
  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      where:  { tenantId, vendorId: apVendorId },
      select: {
        id: true, invoiceNumber: true, invoiceDate: true,
        totalAmount: true, paidAmount: true, paymentStatus: true,
        currencyCode: true,
      },
      orderBy: { invoiceDate: 'desc' },
      take: 100,
    }),
    prisma.payment.findMany({
      where:  { tenantId, vendorId: apVendorId },
      select: { id: true, paymentDate: true, amount: true, transbnkUtr: true, invoiceId: true },
      orderBy: { paymentDate: 'desc' },
      take: 100,
    }),
  ])

  // Index payments by invoiceId for the unmatched filter.
  const invoiceIds = new Set(invoices.map((i) => i.id))

  let totalInvoiced = 0
  let totalPaid     = 0
  let paidCount     = 0
  const invoiceRows: ReconInvoiceRow[] = invoices.map((i) => {
    const total       = Number(i.totalAmount)
    const paid        = Number(i.paidAmount)
    const outstanding = Math.max(0, total - paid)
    totalInvoiced += total
    totalPaid     += paid
    if (i.paymentStatus === 'PAID') paidCount++
    return {
      id:             i.id,
      invoiceNumber:  i.invoiceNumber,
      invoiceDate:    i.invoiceDate.toISOString().slice(0, 10),
      totalAmount:    total,
      paidAmount:     paid,
      outstanding,
      paymentStatus:  i.paymentStatus,
      currencyCode:   i.currencyCode,
    }
  })

  const unmatchedPayments: ReconPaymentRow[] = payments
    .filter((p) => !p.invoiceId || !invoiceIds.has(p.invoiceId))
    .map((p) => ({
      id:          p.id,
      paymentDate: p.paymentDate ? p.paymentDate.toISOString().slice(0, 10) : null,
      amount:      Number(p.amount),
      utr:         p.transbnkUtr,
      invoiceId:   p.invoiceId,
    }))

  return {
    totalInvoiced,
    totalPaid,
    outstanding:      Math.max(0, totalInvoiced - totalPaid),
    invoiceCount:     invoices.length,
    paidInvoiceCount: paidCount,
    invoices:         invoiceRows,
    unmatchedPayments,
  }
}
