import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { vendorFetch } from './useVendorPortalSession'

// ── Common types ────────────────────────────────────────────────────────

interface PaginatedList<T> { rows: T[]; total: number; page: number; limit: number }
interface ListFilters { status?: string; page?: number; limit?: number }
interface DateRangeFilters { fromDate?: string; toDate?: string; page?: number; limit?: number }

function qs(filters: object): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters as Record<string, unknown>)) {
    if (v !== undefined && v !== '') params.set(k, String(v))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

// ── POs ─────────────────────────────────────────────────────────────────

export interface VendorPORow {
  id:           string
  poRef:        string
  poDate:       string
  totalAmount:  number
  currencyCode: string
  status:       string
  lineCount:    number
  latestAck:    {
    id: string
    acknowledgementType: string
    status: string
    acknowledgedAt: string
  } | null
}

export function useVendorPOs(filters: ListFilters = {}) {
  return useQuery({
    queryKey: ['vendor-portal-tx', 'pos', filters],
    queryFn:  () => vendorFetch<PaginatedList<VendorPORow>>(`/api/portal/vendor/pos${qs(filters)}`),
  })
}

export interface AcknowledgePOInput {
  poId:                 string
  acknowledgementType:  'FULL' | 'PARTIAL' | 'REJECTED'
  comments?:            string
  expectedDeliveryDate?: string
}

export function useAcknowledgePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ poId, ...body }: AcknowledgePOInput) =>
      vendorFetch<{ id: string; status: string }>(`/api/portal/vendor/pos/${poId}/acknowledge`, {
        method: 'POST',
        body:   JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-portal-tx', 'pos'] })
    },
  })
}

// ── ASNs ────────────────────────────────────────────────────────────────

export interface VendorASNRow {
  id:                   string
  asnNumber:            string
  poRef:                string
  status:               string
  dispatchDate:         string
  expectedDeliveryDate: string
  carrierName:          string | null
  trackingNumber:       string | null
  lineCount:            number
}

export function useVendorASNs(filters: ListFilters = {}) {
  return useQuery({
    queryKey: ['vendor-portal-tx', 'asn', filters],
    queryFn:  () => vendorFetch<PaginatedList<VendorASNRow>>(`/api/portal/vendor/asn${qs(filters)}`),
  })
}

export interface CreateASNInput {
  poId:                 string
  lines:                Array<{ poLineId: string; quantity: number; uom: string }>
  dispatchDate:         string
  expectedDeliveryDate: string
  carrierName?:         string
  trackingNumber?:      string
  comments?:            string
}

export function useCreateASN() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateASNInput) =>
      vendorFetch<{ asnId: string; asnNumber: string; status: string }>('/api/portal/vendor/asn', {
        method: 'POST',
        body:   JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-portal-tx', 'asn'] })
    },
  })
}

// ── Invoices ────────────────────────────────────────────────────────────

export interface VendorInvoiceRow {
  id:             string
  invoiceNumber:  string
  invoiceDate:    string
  poRef:          string | null
  totalAmount:    number
  currencyCode:   string
  status:         string
  paymentStatus:  string
}

export function useVendorPortalInvoices(filters: ListFilters = {}) {
  return useQuery({
    queryKey: ['vendor-portal-tx', 'invoices', filters],
    queryFn:  () => vendorFetch<PaginatedList<VendorInvoiceRow>>(`/api/portal/vendor/invoices${qs(filters)}`),
  })
}

export interface SubmitInvoiceInput {
  invoiceType:    'PO_BACKED' | 'NON_PO'
  poId?:          string
  lines:          Array<{ description: string; qty: number; unitPrice: number; lineTotal?: number }>
  invoiceNumber:  string
  invoiceDate:    string
  totalAmount:    number
  currencyCode:   string
  taxAmount?:     number
  attachmentBlobUrl?: string
}

export function useSubmitPortalInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitInvoiceInput) =>
      vendorFetch<{ invoiceId: string; invoiceNumber: string; status: string }>('/api/portal/vendor/invoices', {
        method: 'POST',
        body:   JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-portal-tx', 'invoices'] })
      qc.invalidateQueries({ queryKey: ['vendor-portal-tx', 'recon'] })
    },
  })
}

// ── Payments ────────────────────────────────────────────────────────────

export interface VendorPaymentRow {
  id:           string
  paymentRef:   string
  paymentDate:  string | null
  amount:       number
  currencyCode: string
  utr:          string | null
  invoiceId:    string | null
  status:       string
}

export function useVendorPayments(filters: DateRangeFilters = {}) {
  return useQuery({
    queryKey: ['vendor-portal-tx', 'payments', filters],
    queryFn:  () => vendorFetch<PaginatedList<VendorPaymentRow>>(`/api/portal/vendor/payments${qs(filters)}`),
  })
}

// ── Reconciliation + Disputes ──────────────────────────────────────────

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
  id:          string
  paymentDate: string | null
  amount:      number
  utr:         string | null
  invoiceId:   string | null
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

export function useVendorRecon() {
  return useQuery({
    queryKey: ['vendor-portal-tx', 'recon'],
    queryFn:  () => vendorFetch<ReconSummary>('/api/portal/vendor/recon'),
  })
}

export interface RaiseDisputeInput {
  invoiceId?:        string
  paymentId?:        string
  disputeType:       'PAYMENT_DELAY' | 'AMOUNT_MISMATCH' | 'DUPLICATE_PAYMENT' | 'WRONG_DEDUCTION' | 'OTHER'
  description:       string
  attachmentBlobUrl?: string
}

export function useRaiseDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RaiseDisputeInput) =>
      vendorFetch<{ disputeId: string; disputeNumber: string; status: string }>('/api/portal/vendor/recon/dispute', {
        method: 'POST',
        body:   JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-portal-tx', 'recon'] })
    },
  })
}
