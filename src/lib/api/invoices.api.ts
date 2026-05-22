import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { http } from '../http'
import { queryKeys, STALE_TIMES } from '../query-client'

export interface InvoiceLine {
  id: string; lineNumber: number; description: string
  quantity: number; unitPrice: number; amount: number
  cgst: number; sgst: number; igst: number; tdsAmount: number
  isRcm: boolean; taxCodeId?: string; glCodeId?: string
}

export interface InvoiceSummary {
  id: string; invoiceNumber: string; vendorId: string
  vendor: { legalName: string; vendorCode: string }
  invoiceDate: string; dueDate?: string; currency: string
  subtotal: number; taxAmount: number; tdsAmount: number
  totalAmount: number; netPayable: number
  status: string; matchStatus: string; approvalLane: string
  createdAt: string
}

export interface InvoiceFullData extends InvoiceSummary {
  lines: InvoiceLine[]
  approvals: { id: string; level: number; approverId: string; status: string; comments?: string; actionAt?: string }[]
  glCodeId?: string; costCentreId?: string; narration?: string
}

interface InvoiceFilters { status?: string; vendorId?: string; search?: string; take?: number }

export function useInvoices(filters: InvoiceFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.invoices.list(filters as any),
    queryFn:  ({ pageParam }) => {
      const p = new URLSearchParams()
      if (filters.status)   p.set('status',   filters.status)
      if (filters.vendorId) p.set('vendorId', filters.vendorId)
      if (filters.search)   p.set('search',   filters.search)
      if (pageParam)        p.set('cursor',   pageParam as string)
      p.set('take', String(filters.take ?? 25))
      return http.get<{ data: InvoiceSummary[]; total: number; nextCursor: string | null; hasMore: boolean }>(`/api/invoices?${p}`)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: STALE_TIMES.LIST,
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn:  () => http.get<InvoiceFullData>(`/api/invoices/${id}`),
    enabled:  !!id,
    staleTime: STALE_TIMES.DETAIL,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => http.post<{ id: string; invoiceNumber: string }>('/api/invoices', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invoices.all() }),
  })
}

export function useSubmitInvoice(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => http.post(`/api/invoices/${id}/submit`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: queryKeys.invoices.detail(id) }),
  })
}

export function useApproveInvoice(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (comments?: string) => http.post(`/api/invoices/${id}/approve`, { comments }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: queryKeys.invoices.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.approvals() })
    },
  })
}

export function useRejectInvoice(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (comments: string) => http.post(`/api/invoices/${id}/reject`, { comments }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: queryKeys.invoices.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.approvals() })
    },
  })
}
