import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Clock } from 'lucide-react'
import { http } from '../../lib/http'
import { FlagImage } from '../../components/shared/FlagImage'
import { MasterTabs, type MasterTab } from '../../components/masters/MasterTabs'
import { AuditTrailDrawer } from '../../components/shared/AuditTrailDrawer'
import {
  FormSection, FormField, FormInput, FormSelect, FormPageHeader, FormFooter, WorkflowBanner, ApiSelect,
} from '../../components/masters/MasterFormLayout'
import { formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
]

interface City { id: string; name: string; stateCode: string; countryCode?: string; timezone?: string; isCapital: boolean; isMetro: boolean; status: string }

function CityForm({ record, onClose, onSaved }: { record?: City; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, unknown>>(record ? { ...record } : { isCapital: false, isMetro: false, status: 'DRAFT' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name) e.name = 'City name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = useMutation({
    mutationFn: (submit: boolean) => record
      ? http.put(`/api/masters/cities/${record.id}`, { ...form, submitForApproval: submit })
      : http.post('/api/masters/cities', { ...form, submitForApproval: submit }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['city'] }); onSaved(); onClose() },
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
      <FormPageHeader title={record ? `Edit — ${record.name}` : 'Create City'} subtitle="Fill details to create or update a city record" onBack={onClose} />
      <FormSection title="City details">
        <FormField label="Country">
          <ApiSelect
            endpoint="/api/masters/countries"
            queryKey={['countries']}
            value={String(form.countryCode ?? '')}
            onChange={v => { set('countryCode', v); set('stateCode', '') }}
            valueKey="code" labelKey="name"
            placeholder="Select country…"
          />
        </FormField>
        <FormField label="State" hint={form.countryCode ? '' : 'Pick a country first'}>
          <ApiSelect
            endpoint={`/api/masters/states?countryCode=${form.countryCode ?? ''}`}
            queryKey={['states', form.countryCode]}
            enabled={!!form.countryCode}
            value={String(form.stateCode ?? '')}
            onChange={v => set('stateCode', v)}
            valueKey="code" labelKey="name"
            placeholder={form.countryCode ? 'Select state…' : 'Pick a country first'}
          />
        </FormField>
        <FormField label="City Name" required error={errors.name}>
          <FormInput value={String(form.name ?? '')} placeholder="Mumbai, Bangalore, Dubai"
            onChange={e => set('name', e.target.value)} onBlur={validate} />
        </FormField>
        <FormField label="Timezone">
          <FormSelect value={String(form.timezone ?? '')} onChange={e => set('timezone', e.target.value)}>
            <option value="">Select timezone…</option>
            {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
          </FormSelect>
        </FormField>
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border p-3">
            <input type="checkbox" id="isCapital" checked={Boolean(form.isCapital)}
              onChange={e => set('isCapital', e.target.checked)} className="h-4 w-4 accent-primary" />
            <label htmlFor="isCapital" className="text-sm text-muted-foreground cursor-pointer">Capital city</label>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border p-3">
            <input type="checkbox" id="isMetro" checked={Boolean(form.isMetro)}
              onChange={e => set('isMetro', e.target.checked)} className="h-4 w-4 accent-primary" />
            <label htmlFor="isMetro" className="text-sm text-muted-foreground cursor-pointer">Major commercial center (Metro)</label>
          </div>
        </div>
      </FormSection>
      <WorkflowBanner />
      <FormFooter onCancel={onClose} onDraft={() => { if (validate()) save.mutate(false) }} onSubmit={() => { if (validate()) save.mutate(true) }} isPending={save.isPending} />
    </div>
  )
}

export default function CityMasterPage() {
  const navigate = useNavigate()
  const [formOpen, setFormOpen]   = useState(false)
  const [edit, setEdit]           = useState<City | null>(null)
  const [activeTab, setActiveTab] = useState<MasterTab>('ACTIVE')
  const [search, setSearch]       = useState('')
  const [audit, setAudit]         = useState<{ id: string; name: string } | null>(null)

  const { data: cities = [], isLoading, refetch } = useQuery({
    queryKey: ['city', activeTab, search],
    queryFn:  () => {
      const p = new URLSearchParams()
      if (search)            p.set('search', search)
      if (activeTab !== 'ALL') p.set('status', activeTab)
      return http.get<City[]>(`/api/masters/cities?${p}`)
    },
  })

  if (formOpen) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <CityForm record={edit ?? undefined} onClose={() => { setFormOpen(false); setEdit(null) }} onSaved={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 pt-3 sm:px-6">
        <button onClick={() => navigate('/masters')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          ← Masters
        </button>
      </div>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-base font-semibold">City Master</h1>
          <p className="text-xs text-muted-foreground">Cities cascading from Country → State. Capital + metro flags drive downstream forms.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="search" placeholder="Search cities…" value={search} onChange={e => setSearch(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring w-48" />
          <button onClick={() => { setEdit(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Add New
          </button>
        </div>
      </div>

      <MasterTabs active={activeTab} onChange={setActiveTab} apiPath="/api/masters/cities" />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>{['City name', 'State', 'Country', 'Timezone', 'Capital', 'Metro', 'Status', 'Actions'].map(h =>
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {cities.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.stateCode}</td>
                  <td className="px-4 py-3">
                    {c.countryCode
                      ? <FlagImage code={c.countryCode} size="24x18" showCode />
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.timezone ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {c.isCapital && <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs">Capital</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.isMetro && <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs">Metro</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(c.status ?? 'ACTIVE'))}>
                      {formatStatus(c.status ?? 'ACTIVE')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEdit(c); setFormOpen(true) }} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setAudit({ id: c.id, name: c.name })} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"><Clock className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AuditTrailDrawer open={!!audit} onClose={() => setAudit(null)} entityType="city" entityId={audit?.id ?? ''} entityName={audit?.name ?? ''} />
    </div>
  )
}
