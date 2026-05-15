import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30_000,
      gcTime:               5 * 60_000,
      retry:                1,
      refetchOnWindowFocus: false,
      refetchOnReconnect:   true,
    },
    mutations: {
      onError: (error: any) => {
        console.error('[Mutation error]', error?.message ?? 'Something went wrong')
      },
    },
  },
})

export const STALE_TIMES = {
  MASTER:    5 * 60_000,
  LIST:      30_000,
  DASHBOARD: 60_000,
  APPROVALS: 15_000,
  DETAIL:    60_000,
} as const

export const queryKeys = {
  invoices: {
    all:    ()                               => ['invoices'] as const,
    list:   (f: Record<string, unknown>)    => ['invoices', 'list', f] as const,
    detail: (id: string)                    => ['invoices', 'detail', id] as const,
    dedupe: (vendorId: string)              => ['invoices', 'dedupe', vendorId] as const,
  },
  payments: {
    all:    ()                               => ['payments'] as const,
    list:   (f: Record<string, unknown>)    => ['payments', 'list', f] as const,
    detail: (id: string)                    => ['payments', 'detail', id] as const,
  },
  masters: {
    all:         () => ['masters'] as const,
    vendors:     () => ['masters', 'vendors'] as const,
    departments: () => ['masters', 'departments'] as const,
    glCodes:     () => ['masters', 'gl-codes'] as const,
    costCentres: () => ['masters', 'cost-centres'] as const,
    taxCodes:    () => ['masters', 'tax-codes'] as const,
  },
  dashboard: {
    kpis:       ()           => ['dashboard', 'kpis'] as const,
    approvals:  ()           => ['dashboard', 'approvals'] as const,
    spendTrend: (fy: string) => ['dashboard', 'spend-trend', fy] as const,
  },
}
