import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { http } from '../http'
import { queryKeys, STALE_TIMES } from '../query-client'

export interface VendorSummary {
  id: string; vendorCode: string; legalName: string; tradeName?: string
  gstin?: string; pan: string; vendorType: string; status: string
  kycPanStatus?: string; kycGstStatus?: string; kycBankStatus?: string
  is206ABApplicable: boolean; gstComplianceScore?: number
  kycMsmeStatus?: string; kycLastCheckedAt?: string; paymentTerms: number
}

export interface VendorDetail extends VendorSummary {
  cin?: string; udyamNumber?: string; email?: string; mobile?: string
  city?: string; state?: string; pincode?: string
  bankAccountNo?: string; ifscCode?: string; bankName?: string
  kycPanName?: string; kycGstName?: string; kycBankAccountName?: string
  kycBankNameMatchScore?: number; kycCinStatus?: string; kycCinCompanyName?: string
  kycMsmeCategory?: string; section206ABRate?: number; section206ABReason?: string
  gstr1LastFiledPeriod?: string; gstr3bLastFiledPeriod?: string; gstReturnRisk?: string
  transbnkBeneficiaryId?: string; tdsApplicable: boolean; tdsSectionCode?: string
  panCompliance: string; einvoiceRequired: boolean; itcRisk?: string
  createdAt: string; updatedAt: string
}

export interface VendorListResponse {
  data: VendorSummary[]; total: number; nextCursor: string | null; hasMore: boolean
}

interface VendorFilters { search?: string; status?: string; take?: number }

export function useVendors(filters: VendorFilters = {}) {
  return useInfiniteQuery({
    queryKey:        queryKeys.masters.vendors(),
    queryFn:         ({ pageParam }) => {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.status) params.set('status', filters.status)
      if (pageParam)      params.set('cursor', pageParam as string)
      params.set('take', String(filters.take ?? 25))
      return http.get<VendorListResponse>(`/api/masters/vendors?${params}`)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: STALE_TIMES.MASTER,
  })
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: queryKeys.masters.vendors(),
    queryFn:  () => http.get<VendorDetail>(`/api/masters/vendors/${id}`),
    enabled:  !!id,
    staleTime: STALE_TIMES.DETAIL,
  })
}

export function useCreateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<VendorDetail>) => http.post<{ id: string; vendorCode: string }>('/api/masters/vendors', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.masters.vendors() }),
  })
}

export function useUpdateVendor(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<VendorDetail>) => http.put<{ id: string }>(`/api/masters/vendors/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.masters.vendors() }),
  })
}

export function useTriggerKyc(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => http.post(`/api/masters/vendors/${id}/kyc`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.masters.vendors() }),
  })
}
