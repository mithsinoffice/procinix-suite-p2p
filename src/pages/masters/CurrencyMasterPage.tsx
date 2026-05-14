import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Clock } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterTabs, type MasterTab } from '../../components/masters/MasterTabs'
import { AuditTrailDrawer } from '../../components/shared/AuditTrailDrawer'
import {
  FormSection, FormField, FormInput, FormPageHeader, FormFooter,
  WorkflowBanner, MasterPageHeader,
} from '../../components/masters/MasterFormLayout'
import { formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

interface Currency {
  id: string; code: string; name: string; symbol: string
  isBase?: boolean; status: string
}

function CurrencyForm({ record, onClose, onSaved }: {
  record?: Currency; onClose: () => void; onSaved: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, unknown>>(
    record ? { ...record } : { isBase: false, status: 'DRAFT' }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.code) e.code = 'Currency code is required'
    if (!form.name) e.name = 'Currency name is required'
    if (!form.symbol) e.symbol = 'Symbol is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = useMutation({
    mutationFn: (submit: boolean) => record
      ? http.put(`/api/masters/currencies/${record.code}`, { ...form, submitForApproval: submit })
      : http.post('/api/masters/currencies', { ...form, submitForApproval: submit }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['currency'] }); onSaved(); onClose() },
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
      <FormPageHeader
        title={record ? `Edit — ${record.name}` : 'Create Currency'}
        subtitle="Fill details to create or update a currency record"
        onBack={onClose}
      />
      <FormSection title="Currency details">
        <FormField label="Currency Code" required hint="3-letter ISO code e.g. INR, USD, EUR" error={errors.code}>
          <FormInput value={String(form.code ?? '')} placeholder="INR" maxLength={3}
            className="uppercase"
            onChange={e => set('code', e.target.value.toUpperCase())}
            onBlur={validate}
            disabled={!!record}
          />
        </FormField>
        <FormField label="Currency Name" required error={errors.name}>
          <FormInput value={String(form.name ?? '')} placeholder="Indian Rupee"
            onChange={e => set('name', e.target.value)} onBlur={validate} />
        </FormField>
        <FormField label="Symbol" required hint="Currency symbol e.g. ₹, $, €" error={errors.symbol}>
          <FormInput value={String(form.symbol ?? '')} placeholder="₹"
            onChange={e => set('symbol', e.target.value)} onBlur={validate} />
        </FormField>
        <div className="col-span-2">
          <div className="flex items-center gap-2 rounded-lg border border-border p-3">
            <input type="checkbox" id="isBase" checked={Boolean(form.isBase)}
              onChange={e => set('isBase', e.target.checked)} className="h-4 w-4 accent-primary" />
            <label htmlFor="isBase" className="text-sm text-muted-foreground cursor-pointer">
              Base currency (all exchange rates expressed relative to this)
            </label>
          </div>
        </div>
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

export default function CurrencyMasterPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]   = useState(false)
  const [edit, setEdit]           = useState<Currency | null>(null)
  const [activeTab, setActiveTab] = useState<MasterTab>('ACTIVE')
  const [search, setSearch]       = useState('')
  const [audit, setAudit]         = useState<{ id: string; name: string } | null>(null)

  const { data: currencies = [], isLoading, refetch } = useQuery({
    queryKey:  ['currency', activeTab, search],
    staleTime: 30_000,
    queryFn:   () => {
      const p = new URLSearchParams()
      if (search)              p.set('search', search)
      if (activeTab !== 'ALL') p.set('status', activeTab)
      return http.get<Currency[]>(`/api/masters/currencies?${p}`)
    },
  })

  const approve = useMutation({
    mutationFn: (id: string) => http.post(`/api/masters/currencies/${id}/approve`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['currency'] }),
  })

  if (formOpen) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <CurrencyForm
          record={edit ?? undefined}
          onClose={() => { setFormOpen(false); setEdit(null) }}
          onSaved={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Currency Master"
        description="Global currencies with exchange rates and base currency designation"
        actions={
          <>
            <input type="search" placeholder="Search currencies…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring w-48" />
            <button onClick={() => { setEdit(null); setFormOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add New
            </button>
          </>
        }
      />

      <MasterTabs active={activeTab} onChange={setActiveTab} apiPath="/api/masters/currencies" />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['Code', 'Name', 'Symbol', 'Base', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currencies.map(c => (
                <tr key={c.id ?? c.code} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{c.code}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-base">{c.symbol}</td>
                  <td className="px-4 py-3 text-center">
                    {c.isBase && (
                      <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs">Base</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(c.status ?? 'ACTIVE'))}>
                      {formatStatus(c.status ?? 'ACTIVE')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEdit(c); setFormOpen(true) }}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setAudit({ id: c.id ?? c.code, name: c.name })}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                      {c.status === 'PENDING_APPROVAL' && (
                        <button onClick={() => approve.mutate(c.id)}
                          className="rounded p-1 text-green-600 hover:bg-green-50">
                          ✓
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
        entityType="currency" entityId={audit?.id ?? ''} entityName={audit?.name ?? ''} />
    </div>
  )
}
