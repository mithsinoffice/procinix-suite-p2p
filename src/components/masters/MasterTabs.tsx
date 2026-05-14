import { useQuery } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { cn } from '../../lib/utils'

export type MasterTab = 'ACTIVE' | 'DRAFT' | 'PENDING_APPROVAL' | 'INACTIVE' | 'ALL'

interface TabDef { id: MasterTab; label: string; count?: number }

interface Props {
  active:    MasterTab
  onChange:  (tab: MasterTab) => void
  apiPath:   string
  entityId?: string
}

export function MasterTabs({ active, onChange, apiPath, entityId }: Props) {
  const { data: counts } = useQuery({
    queryKey: ['master-tab-counts', apiPath, entityId],
    queryFn:  async () => {
      const statuses = ['ACTIVE', 'DRAFT', 'PENDING_APPROVAL', 'INACTIVE']
      const results = await Promise.all(statuses.map(s =>
        http.get<{ total: number }>(`${apiPath}?status=${s}&take=1${entityId ? `&entityId=${entityId}` : ''}`)
          .then(r => ({ status: s, count: r.total ?? 0 }))
          .catch(() => ({ status: s, count: 0 }))
      ))
      return Object.fromEntries(results.map(r => [r.status, r.count])) as Record<string, number>
    },
    staleTime: 30_000,
  })

  const total = Object.values(counts ?? {}).reduce((a, b) => a + b, 0)

  const tabs: TabDef[] = [
    { id: 'ACTIVE',           label: 'Active',           count: counts?.ACTIVE           },
    { id: 'DRAFT',            label: 'My drafts',        count: counts?.DRAFT            },
    { id: 'PENDING_APPROVAL', label: 'Pending approval', count: counts?.PENDING_APPROVAL },
    { id: 'INACTIVE',         label: 'Inactive',         count: counts?.INACTIVE         },
    { id: 'ALL',              label: 'All',              count: total || undefined       },
  ]

  return (
    <div className="flex gap-0 border-b border-border">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
            active === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-xs font-semibold min-w-[18px] text-center',
              active === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
