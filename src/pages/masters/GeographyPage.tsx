import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { cn } from '../../lib/utils'

export default function GeographyPage() {
  const [tab, setTab] = useState<'countries' | 'states'>('countries')

  const { data: countries = [] } = useQuery({ queryKey: ['masters', 'countries'], queryFn: () => http.get<any[]>('/api/masters/countries') })
  const { data: states = []    } = useQuery({ queryKey: ['masters', 'states'],    queryFn: () => http.get<any[]>('/api/masters/states?countryCode=IN') })

  const tabs = [
    { id: 'countries', label: `Countries (${countries.length})` },
    { id: 'states',    label: `Indian States (${states.length})` },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3 sm:px-6">
        <h1 className="text-base font-semibold">Geography</h1>
        <p className="text-xs text-muted-foreground">System-seeded reference data</p>
      </div>
      <div className="flex gap-2 border-b border-border px-4 py-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as 'countries' | 'states')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md', tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {tab === 'countries' && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {countries.map((c: any) => (
              <div key={c.code} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{c.code} · {c.dialCode}</p>
                <p className="text-xs text-muted-foreground">{c.currency}</p>
              </div>
            ))}
          </div>
        )}
        {tab === 'states' && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {states.map((s: any) => (
              <div key={s.code} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{s.code} · GST {s.gstCode}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
