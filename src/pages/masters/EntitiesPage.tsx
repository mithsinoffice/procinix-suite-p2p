import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Upload, Pencil, Clock, Send, CheckCircle } from 'lucide-react'
import { http } from '../../lib/http'
import { AuditTrailDrawer } from '../../components/shared/AuditTrailDrawer'
import { BulkUploadModal } from '../../components/shared/BulkUploadModal'
import { formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

interface TaxRegime { id: string; code: string; name: string; regimeType: string; countryCode: string; requiresGstin: boolean; requiresVat: boolean; tdsApplicable: boolean; vatRate?: number }
interface Country   { code: string; name: string; currency: string }
interface Entity    { id: string; code: string; name: string; gstin?: string; pan?: string; vatNumber?: string; countryCode: string; taxRegimeId?: string; city?: string; state?: string; status: string; createdAt: string; updatedAt?: string }

function EntityForm({ record, onClose, onSaved }: { record?: Entity; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient()
  const { data: countries = [] } = useQuery({ queryKey: ['masters', 'countries'], queryFn: () => http.get<Country[]>('/api/masters/countries') })
  const [form, setForm]     = useState<Record<string, unknown>>(record ? { ...record } : { countryCode: 'IN' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: taxRegimes = [] } = useQuery({
    queryKey: ['masters', 'tax-regimes-by-country', form.countryCode],
    queryFn:  () => http.get<TaxRegime[]>(`/api/masters/tax-regimes-by-country?countryCode=${form.countryCode}`),
    enabled:  !!form.countryCode,
  })

  const selectedRegime = taxRegimes.find((r: TaxRegime) => r.id === form.taxRegimeId)
  const isGst          = selectedRegime?.regimeType === 'GST'
  const isVat          = selectedRegime?.regimeType === 'VAT'
  const isIndia        = form.countryCode === 'IN'

  const save = useMutation({
    mutationFn: (submitForApproval: boolean) => {
      const payload = { ...form, submitForApproval }
      return record ? http.put<any>(`/api/masters/entities/${record.id}`, payload) : http.post<any>('/api/masters/entities', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entity'] }); onSaved(); onClose() },
  })

  function set(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.name)                    e.name      = 'Legal name is required'
    if (isGst && !form.gstin)          e.gstin     = 'GSTIN is required for GST regime'
    if (isGst && !form.pan)            e.pan       = 'PAN is required for GST regime'
    if (isVat && !form.vatNumber)      e.vatNumber = 'VAT number is required for VAT regime'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const F = ({ k, label, span = false, readOnly = false }: { k: string; label: string; span?: boolean; readOnly?: boolean }) => (
    <div className={cn('space-y-1.5', span && 'col-span-2')}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {k === 'code' && !record ? (
        <div className="w-full rounded-md border border-dashed border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">Auto-generated on save</div>
      ) : (
        <input type="text" value={String(form[k] ?? '')}
          readOnly={readOnly || (k === 'code' && !!record)}
          onChange={e => set(k, e.target.value)}
          onBlur={() => validate()}
          className={cn('w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring',
            (readOnly || (k === 'code' && !!record)) && 'bg-muted/30 text-muted-foreground cursor-not-allowed'
          )}
        />
      )}
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">{record ? 'Edit entity' : 'New entity'}</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* A. Basic */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1">A. Basic details</p>
          <div className="grid grid-cols-2 gap-3">
            <F k="code" label="Entity code" />
            <F k="name" label="Legal name *" span />
          </div>
        </div>

        {/* B. Country + Tax regime */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1">B. Country & tax regime</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country *</label>
              <select value={String(form.countryCode ?? 'IN')}
                onChange={e => { set('countryCode', e.target.value); set('taxRegimeId', '') }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {countries.map((c: Country) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tax regime *</label>
              <select value={String(form.taxRegimeId ?? '')}
                onChange={e => set('taxRegimeId', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select regime…</option>
                {taxRegimes.map((r: TaxRegime) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.regimeType})</option>
                ))}
              </select>
              {selectedRegime && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedRegime.requiresGstin && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">GSTIN required</span>}
                  {selectedRegime.requiresVat   && <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5">VAT number required</span>}
                  {selectedRegime.tdsApplicable && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">TDS applicable</span>}
                  {selectedRegime.vatRate       && <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">VAT {selectedRegime.vatRate}%</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* C. Tax identifiers — conditional */}
        {(isGst || isVat || isIndia) && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1">C. Tax identifiers</p>
            <div className="grid grid-cols-2 gap-3">
              {(isGst || isIndia) && <F k="gstin"     label={`GSTIN${isGst ? ' *' : ''}`} />}
              {(isGst || isIndia) && <F k="pan"       label={`PAN${isGst ? ' *' : ''}`}   />}
              {(isGst || isIndia) && <F k="tan"       label="TAN" />}
              {isVat              && <F k="vatNumber"  label="VAT number *" />}
            </div>
          </div>
        )}

        {/* D. Address */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1">D. Address</p>
          <div className="grid grid-cols-2 gap-3">
            <F k="addressLine1" label="Address" span />
            <F k="city"    label="City"      />
            <F k="state"   label="State"     />
            <F k="pincode" label="PIN / ZIP"  />
          </div>
        </div>

      </div>

      <div className="border-t border-border p-4 flex gap-2">
        <button onClick={() => { if (validate()) save.mutate(false) }}
          disabled={save.isPending}
          className="flex-1 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60">
          Save as draft
        </button>
        <button onClick={() => { if (validate()) save.mutate(true) }}
          disabled={save.isPending}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          <Send className="h-3.5 w-3.5" /> Submit for approval
        </button>
      </div>
    </div>
  )
}

export default function EntitiesPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]         = useState(false)
  const [editRecord, setEditRecord]     = useState<Entity | null>(null)
  const [auditRecord, setAuditRecord]   = useState<{ id: string; name: string } | null>(null)
  const [bulkOpen, setBulkOpen]         = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['entity'],
    queryFn:  () => http.get<{ data: Entity[]; total: number }>('/api/masters/entities?take=50'),
  })

  const approve = useMutation({
    mutationFn: (id: string) => http.post(`/api/masters/entities/${id}/approve`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['entity'] }),
  })
  const submit = useMutation({
    mutationFn: (id: string) => http.post(`/api/masters/entities/${id}/submit`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['entity'] }),
  })

  const entities = data?.data ?? []

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-base font-semibold">Entities</h1>
          <p className="text-xs text-muted-foreground">{data?.total ?? 0} entities</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setBulkOpen(true)} className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Upload className="h-3.5 w-3.5" /> Bulk upload
          </button>
          <button onClick={() => { setEditRecord(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New entity
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : entities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No entities yet</p>
            <button onClick={() => setFormOpen(true)} className="mt-3 text-sm text-primary hover:underline">Add first entity</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>{['Code', 'Legal name', 'Country', 'GSTIN / VAT', 'Status', 'Updated', 'Actions'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {entities.map(e => (
                <tr key={e.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{e.code}</td>
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.countryCode}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.gstin ?? e.vatNumber ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(e.status))}>
                      {formatStatus(e.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(e.updatedAt ?? e.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditRecord(e); setFormOpen(true) }} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setAuditRecord({ id: e.id, name: e.name })} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted" title="Audit"><Clock className="h-3.5 w-3.5" /></button>
                      {e.status === 'DRAFT'            && <button onClick={() => submit.mutate(e.id)}  className="rounded p-1 text-amber-600 hover:bg-amber-50"  title="Submit"><Send         className="h-3.5 w-3.5" /></button>}
                      {e.status === 'PENDING_APPROVAL' && <button onClick={() => approve.mutate(e.id)} className="rounded p-1 text-green-600 hover:bg-green-50" title="Approve"><CheckCircle className="h-3.5 w-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setFormOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background shadow-2xl">
            <EntityForm record={editRecord ?? undefined} onClose={() => { setFormOpen(false); setEditRecord(null) }} onSaved={() => refetch()} />
          </div>
        </>
      )}

      <AuditTrailDrawer open={!!auditRecord} onClose={() => setAuditRecord(null)} entityType="entity" entityId={auditRecord?.id ?? ''} entityName={auditRecord?.name ?? ''} />
      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} onSuccess={() => { refetch(); setBulkOpen(false) }}
        masterName="Entities" apiPath="/api/masters/entities"
        csvHeaders={['name', 'countryCode', 'gstin', 'pan', 'city', 'state']}
        csvExample={{ name: 'Procinix UK Ltd', countryCode: 'GB', gstin: '', pan: '', city: 'London', state: 'England' }}
      />
    </div>
  )
}
