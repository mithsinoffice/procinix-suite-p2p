import { useQuery } from '@tanstack/react-query'
import { http } from '../lib/http'
import { STALE_TIMES } from '../lib/query-client'
import { useAuthStore } from '../stores/auth.store'

export interface MasterDropdowns {
  vendors:     { id: string; vendorCode: string; legalName: string; gstin?: string; pan: string; panCompliance: string; tdsApplicable: boolean; tdsSectionCode?: string; paymentTerms: number; transbnkBeneficiaryId?: string }[]
  glCodes:     { id: string; code: string; name: string; accountType: string }[]
  departments: { id: string; code: string; name: string }[]
  costCentres: { id: string; code: string; name: string }[]
  taxCodes:    { id: string; code: string; description: string; cgstRate: number; sgstRate: number; igstRate: number }[]
}

export interface EntitySummary { id: string; code: string; name: string }

export function useMasterData() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { data, isLoading } = useQuery({
    queryKey:  ['masters', 'dropdown'],
    queryFn:   () => http.get<MasterDropdowns>('/api/masters/dropdown'),
    staleTime: STALE_TIMES.MASTER,
    enabled:   isAuthenticated,
  })
  const { data: entities = [] } = useQuery({
    queryKey:  ['masters', 'entities-list'],
    queryFn:   () => http.get<{ data: EntitySummary[] }>('/api/masters/entities?take=200&status=ACTIVE').then(r => r.data),
    staleTime: STALE_TIMES.MASTER,
    enabled:   isAuthenticated,
  })
  return {
    vendors:     data?.vendors     ?? [],
    glCodes:     data?.glCodes     ?? [],
    departments: data?.departments ?? [],
    costCentres: data?.costCentres ?? [],
    taxCodes:    data?.taxCodes    ?? [],
    entities,
    isLoading,
  }
}
