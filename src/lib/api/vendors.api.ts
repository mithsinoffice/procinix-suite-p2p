import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { http } from '../http'
import { queryKeys, STALE_TIMES } from '../query-client'

export interface VendorBankAccount {
  id: string; vendorId: string; accountNo: string; ifsc: string
  bankName?: string; branch?: string; accountType: string; currencyCode: string
  accountHolderName?: string; isPrimary: boolean
  kycStatus?: string; kycNameMatchScore?: number; kycVerifiedAt?: string
  transbnkBeneficiaryId?: string; status: string
}

export interface VendorGstRegistration {
  id: string; vendorId: string; stateCode: string; gstin: string
  registrationType: string; isPrimary: boolean
  spocName?: string; spocEmail?: string; spocPhone?: string
  kycStatus?: string; kycVerifiedAt?: string; status: string
}

export interface VendorEntityMapping {
  id: string; vendorId: string; entityId: string
  glCodeId?: string; costCentreId?: string; profitCentreId?: string
  currencyCode: string; creditLimit?: number
  blockPO: boolean; blockPayment: boolean; blockReason?: string; isActive: boolean
  paymentTermsDays?: number; paymentMode?: string
  erpVendorCode?: string; erpSystem?: string
}

export interface VendorSummary {
  id: string; vendorCode: string; legalName: string; tradeName?: string
  gstin?: string; pan: string; vendorType: string; status: string
  kycPanStatus?: string; kycGstStatus?: string; kycBankStatus?: string
  is206ABApplicable: boolean; gstComplianceScore?: number
  kycMsmeStatus?: string; kycLastCheckedAt?: string; paymentTerms: number
}

export interface VendorDetail extends VendorSummary {
  // Contact
  email?: string; mobile?: string; contactName?: string; website?: string
  // Address
  addressLine1?: string; addressLine2?: string
  city?: string; state?: string; stateCode?: string; pincode?: string
  // Classification
  vendorCategoryId?: string; vendorGroupId?: string
  countryCode: string; taxRegimeCode?: string
  // Statutory
  cin?: string; udyamNumber?: string; tan?: string; panCompliance: string
  // TDS
  tdsApplicable: boolean; tdsSectionCode?: string; tdsSectionId?: string
  tdsRate?: number; tdsExempt: boolean
  lowerTdsCertNo?: string; lowerTdsSection?: string; lowerTdsRate?: number
  lowerTdsValidFrom?: string; lowerTdsValidTo?: string; lowerTdsAlertDays: number
  einvoiceRequired: boolean
  // Payment
  paymentMode: string; paymentCurrency: string
  // PAN / Aadhaar / MSME
  panEntityType?: string; aadharNo?: string; aadharPanLinked?: string; msmeCategory?: string
  // KYC (read-only)
  kycPanName?: string; kycGstName?: string; kycBankAccountName?: string
  kycBankNameMatchScore?: number; kycCinStatus?: string; kycCinCompanyName?: string
  kycMsmeCategory?: string; section206ABRate?: number; section206ABReason?: string
  gstr1LastFiledPeriod?: string; gstr3bLastFiledPeriod?: string; gstReturnRisk?: string
  itcRisk?: string; transbnkBeneficiaryId?: string
  // ERP
  erpVendorCode?: string; erpSystem?: string; erpSyncStatus?: string; erpSyncedAt?: string
  // Timestamps
  createdAt: string; updatedAt: string
  // Sub-tables
  bankAccounts:     VendorBankAccount[]
  gstRegistrations: VendorGstRegistration[]
  entityMappings:   VendorEntityMapping[]
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
    queryKey: ['masters', 'vendors', id],
    queryFn:  () => http.get<VendorDetail>(`/api/masters/vendors/${id}`),
    enabled:  !!id,
    staleTime: STALE_TIMES.DETAIL,
  })
}

export function useCreateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      http.post<{ id: string; vendorCode: string }>('/api/masters/vendors', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.masters.vendors() }),
  })
}

export function useUpdateVendor(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      http.put<{ id: string }>(`/api/masters/vendors/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.masters.vendors() })
      qc.invalidateQueries({ queryKey: ['masters', 'vendors', id] })
    },
  })
}

export function useTriggerKyc(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => http.post(`/api/masters/vendors/${id}/kyc`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['masters', 'vendors', id] }),
  })
}
