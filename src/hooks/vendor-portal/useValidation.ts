import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { STALE_TIMES } from '../../lib/query-client'

export interface PendingDocument {
  id:           string
  documentType: string
  fileName:     string
  uploadedAt:   string
  reviewStatus: string
  vendor:       { id: string; legalName: string; countryCode: string; vendorCode: string | null }
}

export interface PendingBankAccount {
  id:                 string
  accountName:        string
  accountNumber:      string
  bankName:           string
  verificationStatus: string
  vendor:             { id: string; legalName: string; countryCode: string; vendorCode: string | null }
}

export interface PendingComplianceRecord {
  id:                 string
  documentType:       string
  documentNumber:     string | null
  verificationStatus: string
  vendor:             { id: string; legalName: string; countryCode: string; vendorCode: string | null }
}

export interface ValidationQueueResponse {
  pendingDocuments:         PendingDocument[]
  pendingBankVerifications: PendingBankAccount[]
  pendingComplianceRecords: PendingComplianceRecord[]
  summary: {
    total:     number
    byType:    { documents: number; bankAccounts: number; complianceRecords: number }
    byCountry: Array<{ countryCode: string; count: number }>
  }
}

const keys = {
  queue: () => ['vendor-portal', 'validation', 'queue'] as const,
}

export function useValidationQueue() {
  return useQuery({
    queryKey:  keys.queue(),
    queryFn:   () => http.get<ValidationQueueResponse>('/api/vendor-portal/validation'),
    staleTime: STALE_TIMES.LIST,
  })
}

export function useApproveDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      http.post<PendingDocument>(`/api/vendor-portal/validation/documents/${id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.queue() }) },
  })
}

export function useRejectDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      http.post<PendingDocument>(`/api/vendor-portal/validation/documents/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.queue() }) },
  })
}

export function useVerifyBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      http.post<PendingBankAccount>(`/api/vendor-portal/validation/bank-accounts/${id}/verify`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.queue() }) },
  })
}
