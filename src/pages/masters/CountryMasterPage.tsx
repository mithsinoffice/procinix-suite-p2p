import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Clock, CheckCircle } from 'lucide-react'
import { http } from '../../lib/http'
import { FlagImage } from '../../components/shared/FlagImage'
import { MasterTabs, type MasterTab } from '../../components/masters/MasterTabs'
import { AuditTrailDrawer } from '../../components/shared/AuditTrailDrawer'
import {
  FormSection, FormField, FormInput, FormSelect,
  FormPageHeader, FormFooter, WorkflowBanner, ApiSelect, MasterPageHeader,
} from '../../components/masters/MasterFormLayout'
import { formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

const REGIONS = ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania', 'Middle East']

interface Country { id: string; code: string; name: string; isoCode3?: string; localName?: string; region?: string; dialCode?: string; currency?: string; status: string; createdAt: string }

function CountryForm({ record, onClose, onSaved }: { record?: Country; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, unknown>>(record ? { ...record } : { status: 'DRAFT' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: (submit: boolean) => {
      const payload = { ...form, submitForApproval: submit }
      return record
        ? http.put<any>(`/api/masters/countries/${record.code}`, payload)
        : http.post<any>('/api/masters/countries', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['country'] }); onSaved(); onClose() },
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }
  function validate() {
    const e: Record<string, string> = {}
    if (!form.code) e.code = 'Country code is required'
    if (!form.name) e.name = 'Country name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
      <FormPageHeader
        title={record ? `Edit — ${record.name}` : 'Create Country'}
        subtitle="Fill details to create or update a country record"
        onBack={onClose}
      />

      <FormSection title="Identity">
        <FormField label="Country Code" required hint="2-letter ISO 3166 — e.g. IN, US, GB" error={errors.code}>
          <div className="flex items-center gap-2">
            {!!form.code && <FlagImage code={String(form.code)} size="24x18" />}
            <FormInput value={String(form.code ?? '')} placeholder="IN" maxLength={2} className="uppercase"
              onChange={e => set('code', e.target.value.toUpperCase())} onBlur={validate}
              disabled={!!record} />
          </div>
        </FormField>
        <FormField label="Country Name" required hint="Display name shown across the app" error={errors.name}>
          <FormInput value={String(form.name ?? '')} placeholder="India"
            onChange={e => set('name', e.target.value)} onBlur={validate} />
        </FormField>
        <FormField label="ISO Code (3-letter)" hint="ISO 3166-1 alpha-3 — e.g. IND, USA">
          <FormInput value={String(form.isoCode3 ?? '')} placeholder="IND" maxLength={3} className="uppercase"
            onChange={e => set('isoCode3', e.target.value.toUpperCase())} />
        </FormField>
        <FormField label="Local Name" hint="Name in local language or script">
          <FormInput value={String(form.localName ?? '')} placeholder="भारत"
            onChange={e => set('localName', e.target.value)} />
        </FormField>
      </FormSection>

      <FormSection title="Classification">
        <FormField label="Region" hint="Continent or geographic region">
          <FormSelect value={String(form.region ?? '')} onChange={e => set('region', e.target.value)}>
            <option value="">Select region…</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Dial Code" hint="International dialling prefix e.g. +91">
          <FormInput value={String(form.dialCode ?? '')} placeholder="+91"
            onChange={e => set('dialCode', e.target.value)} />
        </FormField>
        <FormField label="Currency">
          <ApiSelect
            endpoint="/api/masters/currencies"
            queryKey={['currencies']}
            value={String(form.currency ?? '')}
            onChange={v => set('currency', v)}
            valueKey="code" labelKey="name"
            placeholder="Select currency…"
          />
        </FormField>
        <FormField label="Status">
          <FormSelect value={String(form.status ?? 'DRAFT')} onChange={e => set('status', e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="INACTIVE">Inactive</option>
          </FormSelect>
        </FormField>
      </FormSection>

      <WorkflowBanner />
      <FormFooter
        onCancel={onClose}
        onDraft={() => { if (validate()) save.mutate(false) }}
        onSubmit={() => { if (validate()) save.mutate(true) }}
        isPending={save.isPending}
      />
    </div>
  )
}

export default function CountryMasterPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]   = useState(false)
  const [edit, setEdit]           = useState<Country | null>(null)
  const [activeTab, setActiveTab] = useState<MasterTab>('ACTIVE')
  const [search, setSearch]       = useState('')
  const [audit, setAudit]         = useState<{ id: string; name: string } | null>(null)

  const { data: countries = [], isLoading, refetch } = useQuery({
    queryKey:  ['country', activeTab, search],
    staleTime: 30_000,
    queryFn:   () => {
      const p = new URLSearchParams()
      if (search)            p.set('search', search)
      if (activeTab !== 'ALL') p.set('status', activeTab)
      return http.get<Country[]>(`/api/masters/countries?${p}`)
    },
  })

  const approve = useMutation({
    mutationFn: (code: string) => http.post(`/api/masters/countries/${code}/approve`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['country'] }),
  })

  if (formOpen) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <CountryForm record={edit ?? undefined} onClose={() => { setFormOpen(false); setEdit(null) }} onSaved={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Country Master"
        description="Global country reference data with flags and tax regime mapping"
        actions={
          <>
            <input type="search" placeholder="Search countries…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring w-48" />
            <button onClick={() => { setEdit(null); setFormOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add New
            </button>
          </>
        }
      />

      <MasterTabs active={activeTab} onChange={setActiveTab} apiPath="/api/masters/countries" />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : countries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No countries found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['Code', 'Country', 'ISO3', 'Region', 'Currency', 'Dial code', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {countries.map((c: Country) => (
                <tr key={c.id ?? c.code} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FlagImage code={c.code} size="24x18" />
                      <span className="font-mono text-xs font-medium">{c.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.isoCode3 ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.region ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono">{c.currency ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.dialCode ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(c.status))}>
                      {formatStatus(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEdit(c); setFormOpen(true) }} title="Edit"
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setAudit({ id: c.id ?? c.code, name: c.name })} title="Audit"
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                      {c.status === 'PENDING_APPROVAL' && (
                        <button onClick={() => approve.mutate(c.code)} title="Approve"
                          className="rounded p-1 text-green-600 hover:bg-green-50">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AuditTrailDrawer open={!!audit} onClose={() => setAudit(null)}
        entityType="country" entityId={audit?.id ?? ''} entityName={audit?.name ?? ''} />
    </div>
  )
}
