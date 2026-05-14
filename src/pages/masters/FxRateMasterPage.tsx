import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Clock, TrendingUp } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { MasterTabs, type MasterTab } from '../../components/masters/MasterTabs'
import { AuditTrailDrawer } from '../../components/shared/AuditTrailDrawer'
import {
  FormField, FormInput, FormSelect, FormPageHeader, FormFooter, WorkflowBanner,
} from '../../components/masters/MasterFormLayout'
import { formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

const SOURCES = ['MANUAL', 'RBI', 'ECB', 'CUSTOM']

interface FxRate {
  id: string; fromCurrency: string; toCurrency: string
  rate: number; effectiveDate: string; expiryDate?: string
  source: string; status: string; createdAt: string
}

function FxRateForm({ record, onClose, onSaved }: {
  record?: FxRate; onClose: () => void; onSaved: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, unknown>>(
    record ? { ...record } : { source: 'MANUAL', fromCurrency: 'INR' }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.fromCurrency)  e.fromCurrency  = 'From currency required'
    if (!form.toCurrency)    e.toCurrency    = 'To currency required'
    if (!form.rate)          e.rate          = 'Rate required'
    if (!form.effectiveDate) e.effectiveDate = 'Effective date required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = useMutation({
    mutationFn: () => record
      ? http.put(`/api/masters/fx-rates/${record.id}`, form)
      : http.post('/api/masters/fx-rates', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fxRate'] }); onSaved(); onClose() },
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
      <FormPageHeader
        title={record ? 'Edit FX Rate' : 'Add FX Rate'}
        subtitle="Define exchange rate between two currencies"
        onBack={onClose}
      />
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold">Rate details</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="From currency" required hint="Base currency" error={errors.fromCurrency}>
            <FormInput value={String(form.fromCurrency ?? '')} placeholder="INR"
              className="uppercase font-mono"
              onChange={e => set('fromCurrency', e.target.value.toUpperCase())} />
          </FormField>
          <FormField label="To currency" required hint="Target currency" error={errors.toCurrency}>
            <FormInput value={String(form.toCurrency ?? '')} placeholder="USD"
              className="uppercase font-mono"
              onChange={e => set('toCurrency', e.target.value.toUpperCase())} />
          </FormField>
          <FormField label="Exchange rate" required hint="1 unit of From = N units of To" error={errors.rate}>
            <FormInput type="number" step="0.00000001"
              value={String(form.rate ?? '')} placeholder="e.g. 0.012"
              onChange={e => set('rate', e.target.value)} />
          </FormField>
          <FormField label="Source" hint="Rate data source">
            <FormSelect value={String(form.source ?? 'MANUAL')} onChange={e => set('source', e.target.value)}>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Effective date" required hint="Rate valid from this date" error={errors.effectiveDate}>
            <FormInput type="date" value={String(form.effectiveDate ?? '')}
              onChange={e => set('effectiveDate', e.target.value)} />
          </FormField>
          <FormField label="Expiry date" hint="Leave blank if currently active">
            <FormInput type="date" value={String(form.expiryDate ?? '')}
              onChange={e => set('expiryDate', e.target.value)} />
          </FormField>
        </div>
      </div>
      <WorkflowBanner />
      <FormFooter
        onCancel={onClose}
        onDraft={() => { if (validate()) save.mutate() }}
        onSubmit={() => { if (validate()) save.mutate() }}
        isPending={save.isPending}
      />
    </div>
  )
}

export default function FxRateMasterPage() {
  const [formOpen, setFormOpen]   = useState(false)
  const [edit, setEdit]           = useState<FxRate | null>(null)
  const [activeTab, setActiveTab] = useState<MasterTab>('ACTIVE')
  const [audit, setAudit]         = useState<{ id: string; name: string } | null>(null)

  const { data: rates = [], isLoading, refetch } = useQuery({
    queryKey:  ['fxRate', activeTab],
    staleTime: 30_000,
    queryFn:   () => http.get<FxRate[]>(`/api/masters/fx-rates${activeTab !== 'ALL' ? `?status=${activeTab}` : ''}`),
  })

  if (formOpen) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <FxRateForm
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
        title="FX Rate Master"
        description="Currency exchange rates with effective dates and source tracking"
        actions={
          <button onClick={() => { setEdit(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Add Rate
          </button>
        }
      />

      <MasterTabs active={activeTab} onChange={setActiveTab} apiPath="/api/masters/fx-rates" />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : rates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No FX rates defined</p>
            <button onClick={() => setFormOpen(true)} className="mt-3 text-sm text-primary hover:underline">
              Add first rate
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['From', 'To', 'Rate', 'Effective date', 'Expiry', 'Source', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rates.map(r => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-primary">{r.fromCurrency}</td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold">{r.toCurrency}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{Number(r.rate).toFixed(6)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.effectiveDate)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.expiryDate ? formatDate(r.expiryDate) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs font-medium">
                      {r.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(r.status))}>
                      {formatStatus(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEdit(r); setFormOpen(true) }}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setAudit({ id: r.id, name: `${r.fromCurrency}→${r.toCurrency}` })}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AuditTrailDrawer
        open={!!audit} onClose={() => setAudit(null)}
        entityType="fxRate" entityId={audit?.id ?? ''} entityName={audit?.name ?? ''}
      />
    </div>
  )
}
