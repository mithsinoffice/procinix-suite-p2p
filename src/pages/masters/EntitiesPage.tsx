import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Upload, Pencil, Clock, Send, CheckCircle } from 'lucide-react'
import { http } from '../../lib/http'
import { AuditTrailDrawer } from '../../components/shared/AuditTrailDrawer'
import { BulkUploadModal } from '../../components/shared/BulkUploadModal'
import { formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'
import {
  FormSection, FormField, FormInput, FormSelect,
  AutoCodeField, WorkflowBanner, FormPageHeader, FormFooter,
} from '../../components/masters/MasterFormLayout'

interface TaxRegime { id: string; code: string; name: string; regimeType: string; countryCode: string; requiresGstin: boolean; requiresVat: boolean; tdsApplicable: boolean; vatRate?: number }
interface Country   { code: string; name: string; currency: string }
interface Entity    {
  id: string; code: string; name: string; shortName?: string; entityType?: string;
  gstin?: string; pan?: string; tan?: string; vatNumber?: string; cinNumber?: string; incorporationDate?: string;
  countryCode: string; taxRegimeId?: string; city?: string; state?: string; pincode?: string; addressLine1?: string;
  email?: string; phone?: string; website?: string;
  status: string; createdAt: string; updatedAt?: string
}

const ENTITY_TYPES = [
  { value: 'HOLDING_COMPANY',       label: 'Holding Company' },
  { value: 'SUBSIDIARY',            label: 'Subsidiary' },
  { value: 'BRANCH',                label: 'Branch' },
  { value: 'JV',                    label: 'Joint Venture' },
  { value: 'REPRESENTATIVE_OFFICE', label: 'Representative Office' },
]

function EntityForm({ record, onSaved, onCancel }: { record?: Entity; onSaved: () => void; onCancel: () => void }) {
  const qc = useQueryClient()
  const { data: countries = [] } = useQuery({
    queryKey: ['masters', 'countries'],
    queryFn:  () => http.get<Country[]>('/api/masters/countries'),
  })
  const [form, setForm]     = useState<Record<string, unknown>>(record ? { ...record } : { countryCode: 'IN', entityType: 'SUBSIDIARY' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedCountry = String(form.countryCode ?? 'IN')

  const { data: taxRegimes = [] } = useQuery({
    queryKey:  ['tax-regimes-by-country', selectedCountry],
    queryFn:   () => http.get<TaxRegime[]>(`/api/masters/tax-regimes-by-country?countryCode=${selectedCountry}`),
    enabled:   !!selectedCountry,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (taxRegimes.length === 1 && !form.taxRegimeId) {
      setForm(f => ({ ...f, taxRegimeId: taxRegimes[0].id }))
    }
  }, [taxRegimes])

  console.log('[Entity] countryCode:', selectedCountry, 'regimes:', taxRegimes.length)

  const selectedRegime = taxRegimes.find((r: TaxRegime) => r.id === form.taxRegimeId)
  const isGst          = selectedRegime?.regimeType === 'GST'
  const isVat          = selectedRegime?.regimeType === 'VAT'
  const isIndia        = form.countryCode === 'IN'

  const save = useMutation({
    mutationFn: (submitForApproval: boolean) => {
      const payload = { ...form, submitForApproval }
      return record
        ? http.put<Entity>(`/api/masters/entities/${record.id}`, payload)
        : http.post<Entity>('/api/masters/entities', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entity'] }); onSaved() },
  })

  function set(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.name)               e.name      = 'Legal name is required'
    if (isGst && !form.gstin)     e.gstin     = 'GSTIN is required for GST regime'
    if (isGst && !form.pan)       e.pan       = 'PAN is required for GST regime'
    if (isVat && !form.vatNumber) e.vatNumber = 'VAT number is required for VAT regime'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="space-y-4">

      {/* A. Identity — 2-col grid */}
      <FormSection title="A. Identity">
        {/* Col 1 */}
        <FormField label="Entity code" hint="Auto-generated — unique identifier">
          <AutoCodeField value={record?.code} />
        </FormField>
        {/* Col 2 */}
        <FormField label="Legal name" required error={errors.name}>
          <FormInput
            value={String(form.name ?? '')}
            placeholder="Procinix Technologies Pvt Ltd"
            onChange={e => set('name', e.target.value)}
            onBlur={validate}
            className={errors.name ? 'border-destructive' : ''}
          />
        </FormField>
        {/* Col 1 */}
        <FormField label="Short name / trade name" hint="Abbreviated name used in reports">
          <FormInput
            value={String(form.shortName ?? '')}
            placeholder="Procinix"
            onChange={e => set('shortName', e.target.value)}
          />
        </FormField>
        {/* Col 2 */}
        <FormField label="Entity type">
          <FormSelect value={String(form.entityType ?? 'SUBSIDIARY')} onChange={e => set('entityType', e.target.value)}>
            {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </FormSelect>
        </FormField>
      </FormSection>

      {/* B. Country + Tax Regime — 2-col grid */}
      <FormSection title="B. Country &amp; Tax Regime">
        {/* Col 1 */}
        <FormField label="Country" required>
          <FormSelect
            value={String(form.countryCode ?? 'IN')}
            onChange={e => { set('countryCode', e.target.value); set('taxRegimeId', '') }}
          >
            {countries.map((c: Country) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </FormSelect>
        </FormField>
        {/* Col 2 */}
        <FormField label="Tax regime" required>
          <FormSelect value={String(form.taxRegimeId ?? '')} onChange={e => set('taxRegimeId', e.target.value)}>
            <option value="">Select regime…</option>
            {taxRegimes.map((r: TaxRegime) => (
              <option key={r.id} value={r.id}>{r.name} ({r.regimeType})</option>
            ))}
          </FormSelect>
        </FormField>
        {/* Chips row — col-span-2 */}
        {selectedRegime && (
          <div className="col-span-2 flex flex-wrap gap-1.5">
            {selectedRegime.requiresGstin && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md px-2 py-0.5">GSTIN required</span>}
            {selectedRegime.requiresVat   && <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-md px-2 py-0.5">VAT number required</span>}
            {selectedRegime.tdsApplicable && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5">TDS applicable</span>}
            {selectedRegime.vatRate       && <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-md px-2 py-0.5">VAT {selectedRegime.vatRate}%</span>}
          </div>
        )}
      </FormSection>

      {/* C. Tax Identifiers — 2-col grid, conditional */}
      {(isGst || isVat || isIndia) && (
        <FormSection title="C. Tax Identifiers">
          {/* Col 1 */}
          {(isGst || isIndia) && (
            <FormField label={isGst ? 'GSTIN' : 'GSTIN (optional)'} required={isGst} error={errors.gstin}
              hint="15-character GST Identification Number">
              <FormInput
                value={String(form.gstin ?? '')}
                placeholder="27AABCP1234R1ZV"
                onChange={e => set('gstin', e.target.value)}
                onBlur={validate}
                className={errors.gstin ? 'border-destructive' : ''}
              />
            </FormField>
          )}
          {/* Col 2 */}
          {(isGst || isIndia) && (
            <FormField label={isGst ? 'PAN' : 'PAN (optional)'} required={isGst} error={errors.pan}
              hint="10-character Permanent Account Number">
              <FormInput
                value={String(form.pan ?? '')}
                placeholder="AABCP1234R"
                onChange={e => set('pan', e.target.value)}
                onBlur={validate}
                className={errors.pan ? 'border-destructive' : ''}
              />
            </FormField>
          )}
          {/* Col 1 */}
          {(isGst || isIndia) && (
            <FormField label="TAN" hint="Tax Deduction Account Number">
              <FormInput
                value={String(form.tan ?? '')}
                placeholder="MUMX12345A"
                onChange={e => set('tan', e.target.value)}
              />
            </FormField>
          )}
          {/* Col 2 */}
          {isIndia && (
            <FormField label="CIN" hint="Corporate Identification Number">
              <FormInput
                value={String(form.cinNumber ?? '')}
                placeholder="U72200MH2020PTC123456"
                onChange={e => set('cinNumber', e.target.value)}
              />
            </FormField>
          )}
          {/* Col 1 */}
          {isIndia && (
            <FormField label="Date of incorporation">
              <FormInput
                type="date"
                value={String(form.incorporationDate ?? '')}
                onChange={e => set('incorporationDate', e.target.value)}
              />
            </FormField>
          )}
          {/* Col 2 */}
          {isVat && (
            <FormField label="VAT number" required error={errors.vatNumber}>
              <FormInput
                value={String(form.vatNumber ?? '')}
                onChange={e => set('vatNumber', e.target.value)}
                onBlur={validate}
                className={errors.vatNumber ? 'border-destructive' : ''}
              />
            </FormField>
          )}
        </FormSection>
      )}

      {/* D. Address — 2-col grid */}
      <FormSection title="D. Address">
        {/* Col 1+2 span */}
        <FormField label="Address line" span>
          <FormInput
            value={String(form.addressLine1 ?? '')}
            placeholder="123, Main Street"
            onChange={e => set('addressLine1', e.target.value)}
          />
        </FormField>
        {/* Col 1 */}
        <FormField label="City">
          <FormInput value={String(form.city ?? '')} placeholder="Mumbai" onChange={e => set('city', e.target.value)} />
        </FormField>
        {/* Col 2 */}
        <FormField label="State">
          <FormInput value={String(form.state ?? '')} placeholder="Maharashtra" onChange={e => set('state', e.target.value)} />
        </FormField>
        {/* Col 1 */}
        <FormField label="PIN / ZIP">
          <FormInput value={String(form.pincode ?? '')} placeholder="400001" onChange={e => set('pincode', e.target.value)} />
        </FormField>
        {/* Col 2 — intentionally empty, keeps grid balanced */}
        <div />
      </FormSection>

      {/* E. Contact — 2-col grid */}
      <FormSection title="E. Contact">
        {/* Col 1 */}
        <FormField label="Email" icon="@">
          <FormInput
            type="email"
            value={String(form.email ?? '')}
            placeholder="finance@company.com"
            onChange={e => set('email', e.target.value)}
          />
        </FormField>
        {/* Col 2 */}
        <FormField label="Phone">
          <FormInput
            value={String(form.phone ?? '')}
            placeholder="+91 98765 43210"
            onChange={e => set('phone', e.target.value)}
          />
        </FormField>
        {/* Col 1+2 span */}
        <FormField label="Website" span>
          <FormInput
            value={String(form.website ?? '')}
            placeholder="https://company.com"
            onChange={e => set('website', e.target.value)}
          />
        </FormField>
      </FormSection>

      <WorkflowBanner />

      <FormFooter
        onCancel={onCancel}
        onDraft={() => { if (validate()) save.mutate(false) }}
        onSubmit={() => { if (validate()) save.mutate(true) }}
        isPending={save.isPending}
      />
    </div>
  )
}

export default function EntitiesPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]       = useState(false)
  const [editRecord, setEditRecord]   = useState<Entity | null>(null)
  const [auditRecord, setAuditRecord] = useState<{ id: string; name: string } | null>(null)
  const [bulkOpen, setBulkOpen]       = useState(false)

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

  function openNew()   { setEditRecord(null); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditRecord(null) }

  const entities = data?.data ?? []

  if (formOpen) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <FormPageHeader
              title={editRecord ? 'Edit entity' : 'Create entity'}
              subtitle={editRecord ? `Editing ${editRecord.code}` : 'Fill in the details to register a new entity'}
              onBack={closeForm}
            />
            <EntityForm
              record={editRecord ?? undefined}
              onSaved={() => { refetch(); closeForm() }}
              onCancel={closeForm}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-base font-semibold">Entities</h1>
          <p className="text-xs text-muted-foreground">{data?.total ?? 0} entities</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setBulkOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Upload className="h-3.5 w-3.5" /> Bulk upload
          </button>
          <button onClick={openNew}
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
            <button onClick={openNew} className="mt-3 text-sm text-primary hover:underline">Add first entity</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>{['Code', 'Legal name', 'Type', 'Country', 'GSTIN / VAT', 'Status', 'Updated', 'Actions'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {entities.map(e => (
                <tr key={e.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{e.code}</td>
                  <td className="px-4 py-3 font-medium">
                    {e.name}
                    {e.shortName && <span className="ml-1 text-xs text-muted-foreground">({e.shortName})</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {ENTITY_TYPES.find(t => t.value === e.entityType)?.label ?? e.entityType ?? '—'}
                  </td>
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
                      <button onClick={() => { setEditRecord(e); setFormOpen(true) }}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setAuditRecord({ id: e.id, name: e.name })}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted" title="Audit">
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                      {e.status === 'DRAFT' && (
                        <button onClick={() => submit.mutate(e.id)}
                          className="rounded p-1 text-amber-600 hover:bg-amber-50" title="Submit">
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {e.status === 'PENDING_APPROVAL' && (
                        <button onClick={() => approve.mutate(e.id)}
                          className="rounded p-1 text-green-600 hover:bg-green-50" title="Approve">
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

      <AuditTrailDrawer open={!!auditRecord} onClose={() => setAuditRecord(null)}
        entityType="entity" entityId={auditRecord?.id ?? ''} entityName={auditRecord?.name ?? ''} />
      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)}
        onSuccess={() => { refetch(); setBulkOpen(false) }}
        masterName="Entities" apiPath="/api/masters/entities"
        csvHeaders={['name', 'countryCode', 'gstin', 'pan', 'city', 'state']}
        csvExample={{ name: 'Procinix UK Ltd', countryCode: 'GB', gstin: '', pan: '', city: 'London', state: 'England' }}
      />
    </div>
  )
}
