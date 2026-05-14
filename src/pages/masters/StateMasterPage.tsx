import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Clock, CheckCircle } from 'lucide-react'
import { http } from '../../lib/http'
import { FlagImage } from '../../components/shared/FlagImage'
import { MasterTabs, type MasterTab } from '../../components/masters/MasterTabs'
import { AuditTrailDrawer } from '../../components/shared/AuditTrailDrawer'
import {
  FormSection, FormField, FormInput, FormPageHeader, FormFooter, WorkflowBanner, ApiSelect, MasterPageHeader,
} from '../../components/masters/MasterFormLayout'
import { formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

interface State { id: string; code: string; name: string; countryCode: string; gstCode?: string; status: string }

function StateForm({ record, onClose, onSaved }: { record?: State; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, unknown>>(record ? { ...record } : { countryCode: 'IN', status: 'DRAFT' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: (submit: boolean) =>
      record
        ? http.put(`/api/masters/states/${record.id}`, { ...form, submitForApproval: submit })
        : http.post('/api/masters/states', { ...form, submitForApproval: submit }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['state'] }); onSaved(); onClose() },
  })

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.code)        e.code        = 'State code is required'
    if (!form.name)        e.name        = 'State name is required'
    if (!form.countryCode) e.countryCode = 'Country is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
      <FormPageHeader title={record ? `Edit — ${record.name}` : 'Create State'} subtitle="Fill details to create or update a state record" onBack={onClose} />
      <FormSection title="State details">
        <FormField label="State Code" required hint="e.g. MH, KA, DL" error={errors.code}>
          <FormInput value={String(form.code ?? '')} placeholder="MH" className="uppercase"
            onChange={e => set('code', e.target.value.toUpperCase())} disabled={!!record} />
        </FormField>
        <FormField label="State Name" required hint="e.g. Maharashtra" error={errors.name}>
          <FormInput value={String(form.name ?? '')} placeholder="Maharashtra"
            onChange={e => set('name', e.target.value)} />
        </FormField>
        <FormField label="Country" required error={errors.countryCode}>
          <ApiSelect
            endpoint="/api/masters/countries"
            queryKey={['countries']}
            value={String(form.countryCode ?? '')}
            onChange={v => set('countryCode', v)}
            valueKey="code" labelKey="name"
            placeholder="Select country…"
          />
        </FormField>
        <FormField label="GST State Code" hint="India only — 2-digit e.g. 27, 29">
          <FormInput value={String(form.gstCode ?? '')} placeholder="27"
            onChange={e => set('gstCode', e.target.value)} maxLength={2} />
        </FormField>
      </FormSection>
      <WorkflowBanner />
      <FormFooter onCancel={onClose} onDraft={() => { if (validate()) save.mutate(false) }} onSubmit={() => { if (validate()) save.mutate(true) }} isPending={save.isPending} />
    </div>
  )
}

export default function StateMasterPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]   = useState(false)
  const [edit, setEdit]           = useState<State | null>(null)
  const [activeTab, setActiveTab] = useState<MasterTab>('ACTIVE')
  const [country, setCountry]     = useState('IN')
  const [audit, setAudit]         = useState<{ id: string; name: string } | null>(null)

  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn:  () => http.get<any[]>('/api/masters/countries'),
    staleTime: 5 * 60_000,
  })
  const { data: states = [], isLoading, refetch } = useQuery({
    queryKey: ['state', activeTab, country],
    queryFn:  () => {
      const p = new URLSearchParams({ countryCode: country })
      if (activeTab !== 'ALL') p.set('status', activeTab)
      return http.get<State[]>(`/api/masters/states?${p}`)
    },
  })

  const approve = useMutation({
    mutationFn: (id: string) => http.post(`/api/masters/states/${id}/approve`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['state'] }),
  })

  if (formOpen) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <StateForm record={edit ?? undefined} onClose={() => { setFormOpen(false); setEdit(null) }} onSaved={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="State Master"
        description="States and provinces with GST code mapping"
        actions={
          <>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring">
              {countries.map((c: any) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <button onClick={() => { setEdit(null); setFormOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add New
            </button>
          </>
        }
      />

      <MasterTabs active={activeTab} onChange={setActiveTab} apiPath="/api/masters/states" />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>{['Code', 'State name', 'Country', 'GST code', 'Status', 'Actions'].map(h =>
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {states.map(s => (
                <tr key={s.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{s.code}</td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FlagImage code={s.countryCode} size="24x18" />
                      <span className="text-xs text-muted-foreground">{s.countryCode}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.gstCode ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(s.status ?? 'ACTIVE'))}>
                      {formatStatus(s.status ?? 'ACTIVE')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEdit(s); setFormOpen(true) }} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setAudit({ id: s.id, name: s.name })} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"><Clock className="h-3.5 w-3.5" /></button>
                      {s.status === 'PENDING_APPROVAL' && (
                        <button onClick={() => approve.mutate(s.id)} className="rounded p-1 text-green-600 hover:bg-green-50"><CheckCircle className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AuditTrailDrawer open={!!audit} onClose={() => setAudit(null)} entityType="state" entityId={audit?.id ?? ''} entityName={audit?.name ?? ''} />
    </div>
  )
}
