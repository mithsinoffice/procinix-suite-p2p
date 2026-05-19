import { useQuery } from '@tanstack/react-query'
import { http } from '../lib/http'
import { STALE_TIMES } from '../lib/query-client'
import { useAuthStore } from '../stores/auth.store'
import { toArray } from '../lib/utils'

export interface MasterDropdowns {
  vendors:     { id: string; vendorCode: string; legalName: string; gstin?: string; pan: string; panCompliance: string; tdsApplicable: boolean; tdsSectionCode?: string; paymentTerms: number; transbnkBeneficiaryId?: string }[]
  glCodes:     { id: string; code: string; name: string; accountType: string }[]
  departments: { id: string; code: string; name: string }[]
  costCentres: { id: string; code: string; name: string }[]
  taxCodes:    { id: string; code: string; description: string; cgstRate: number; sgstRate: number; igstRate: number }[]
}

export interface EntitySummary { id: string; code: string; name: string }

// Every returned key is guaranteed to be an array. Callers can `.find`,
// `.filter`, `.map` without runtime defensive checks even during initial
// load, refetch, or when the backend returns an unexpected shape. The
// `data: x = []` destructure default only fires on `undefined` — `null`
// would slip through, so we run every response through `toArray()` which
// handles both null and the paginated `{ data: [] }` envelope.
export function useMasterData() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { data: dropdown, isLoading } = useQuery({
    queryKey:  ['masters', 'dropdown'],
    queryFn:   () => http.get<MasterDropdowns>('/api/masters/dropdown'),
    staleTime: STALE_TIMES.MASTER,
    enabled:   isAuthenticated,
  })
  const { data: entities } = useQuery({
    queryKey:  ['masters', 'entities-list'],
    queryFn:   async () => {
      const r = await http.get<unknown>('/api/masters/entities?take=200&status=ACTIVE')
      return toArray<EntitySummary>(r)
    },
    staleTime: STALE_TIMES.MASTER,
    enabled:   isAuthenticated,
  })
  return {
    vendors:     toArray<MasterDropdowns['vendors'][number]>(dropdown?.vendors),
    glCodes:     toArray<MasterDropdowns['glCodes'][number]>(dropdown?.glCodes),
    departments: toArray<MasterDropdowns['departments'][number]>(dropdown?.departments),
    costCentres: toArray<MasterDropdowns['costCentres'][number]>(dropdown?.costCentres),
    taxCodes:    toArray<MasterDropdowns['taxCodes'][number]>(dropdown?.taxCodes),
    entities:    toArray<EntitySummary>(entities),
    isLoading,
  }
}
