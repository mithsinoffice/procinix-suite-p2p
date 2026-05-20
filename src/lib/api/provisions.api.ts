// Provisions module — TanStack Query hooks + response types. All routes
// tenant-scoped server-side via the JWT cookie; no headers needed here.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../http'

export type MoMStatus = 'INV' | 'PROV' | 'MAN' | 'MISS' | 'NA'

export interface MoMCell {
  status:      MoMStatus
  amount:      number
  jvRef?:      string
  invoiceRef?: string
  isManual?:   boolean
  source?:     string
}

export interface MoMItem {
  itemId:        string
  description:   string
  masterAmount:  number
  frequency:     string
  months:        Record<string, MoMCell>
  totalAmount:   number
  gapCount:      number
  pattern:       'CONSISTENT' | 'GAPS' | 'MANUAL' | 'UNDER_PROVISION'
}

export interface MomResponse {
  months: string[]
  items:  MoMItem[]
  gaps:   { itemId: string; description: string; month: string; suggestedAction: string }[]
}

export interface Proposal {
  id?:               string
  itemId?:           string
  vendorId?:         string
  vendorName?:       string
  description:       string
  proposedAmount:    number
  isManual:          boolean
  source:            string
  status:            string
  invoiceCovered:    boolean
  invoiceRef?:       string
  invoiceAmount?:    number
  expenseGlCode:     string
  provisionGlCode:   string
  tdsSection?:       string
  frequency:         string
}

export interface ProposalsResponse {
  period:    string
  proposals: Proposal[]
  summary: {
    totalApplicable:     number
    invoiceCovered:      number
    provisionRequired:   number
    manualAdditions:     number
    totalProposedAmount: number
  }
}

export interface RegisterRow {
  id:             string
  description:    string
  vendorName:     string | null
  amount:         number
  jvRef:          string | null
  debitGl:        string
  creditGl:       string
  reversalJvRef:  string | null
  reversalDate:   string | null
  erpStatus:      string | null
}

export interface Suggestion {
  type:            'PROMOTE_TO_RECURRING' | 'UPDATE_PROVISION_AMOUNT' | 'BACKDATE_JV'
  itemId:          string
  description:     string
  message:         string
  suggestedAmount?: number
  frequency?:      string
  confidence:      'HIGH' | 'MEDIUM' | 'LOW'
  canAccept:       boolean
}

// ── Hooks ─────────────────────────────────────────────────────────────────
export function useProposals(period: string | undefined) {
  return useQuery<ProposalsResponse>({
    queryKey: ['provisions', 'proposals', period],
    queryFn:  () => http.get<ProposalsResponse>(`/api/provisions/proposals?period=${period}`),
    enabled:  !!period,
  })
}

export function useProvisionRegister(period: string | undefined) {
  return useQuery<RegisterRow[]>({
    queryKey: ['provisions', 'register', period],
    queryFn:  () => http.get<RegisterRow[]>(`/api/provisions/register?period=${period}`),
    enabled:  !!period,
  })
}

export function useProvisionMoM(months = 6) {
  return useQuery<MomResponse>({
    queryKey: ['provisions', 'mom', months],
    queryFn:  () => http.get<MomResponse>(`/api/provisions/mom?months=${months}`),
  })
}

export function useProvisionSuggestions(period: string | undefined) {
  return useQuery<Suggestion[]>({
    queryKey: ['provisions', 'suggestions', period],
    queryFn:  () => http.get<Suggestion[]>(`/api/provisions/suggestions?period=${period}`),
    enabled:  !!period,
  })
}

export function useSaveProposalsDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { period: string; proposals: Proposal[] }) =>
      http.post<{ saved: number; ids: string[] }>('/api/provisions/proposals', payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['provisions', 'proposals', vars.period] })
    },
  })
}

export function useSubmitProvisionBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { period: string; proposalIds: string[]; amounts: Record<string, number> }) =>
      http.post<{ ok: boolean; batchId: string; workflowInstanceId: string | null; warning?: string }>('/api/provisions/batch/submit', payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['provisions', 'proposals', vars.period] })
      qc.invalidateQueries({ queryKey: ['provisions', 'register', vars.period] })
      qc.invalidateQueries({ queryKey: ['nav', 'badges'] })
    },
  })
}

export function useAcceptSuggestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { type: string; itemId: string; suggestedAmount?: number; frequency?: string }) =>
      http.post<{ ok: boolean; reason?: string; message?: string }>('/api/provisions/suggestions/accept', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provisions'] })
    },
  })
}

export function useAddManualProvision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      period: string; description: string; vendorId?: string; amount: number;
      expenseGlCode: string; provisionGlCode: string; tdsSection?: string;
      reversalTrigger?: string; narration?: string
    }) => http.post<{ id: string }>('/api/provisions/manual', payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['provisions', 'proposals', vars.period] })
    },
  })
}

export function useDeleteProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => http.delete<{ ok: boolean }>(`/api/provisions/proposals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provisions'] }),
  })
}
