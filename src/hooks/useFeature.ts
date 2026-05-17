import { useQuery } from '@tanstack/react-query'
import { http } from '../lib/http'
import { useAuthStore } from '../stores/auth.store'

interface FeatureMatrix {
  moduleCode: string
  isEnabled:  boolean
  features:   { featureCode: string; isEnabled: boolean }[]
}

export function useFeatures() {
  const tenantId = useAuthStore(s => s.user?.tenantId)
  return useQuery({
    queryKey:  ['tenant-features', tenantId],
    queryFn:   () => http.get<FeatureMatrix[]>('/api/admin/tenants/me/modules'),
    staleTime: 5 * 60_000,
    enabled:   !!tenantId,
  })
}

export function useFeature(moduleCode: string, featureCode?: string) {
  const { data: matrix = [] } = useFeatures()
  const mod = matrix.find(m => m.moduleCode === moduleCode)
  if (!mod) return { isEnabled: false, moduleEnabled: false }
  if (!featureCode) return { isEnabled: mod.isEnabled, moduleEnabled: mod.isEnabled }
  const feat = mod.features.find(f => f.featureCode === featureCode)
  return {
    moduleEnabled: mod.isEnabled,
    isEnabled:     mod.isEnabled && (feat?.isEnabled ?? false),
  }
}
