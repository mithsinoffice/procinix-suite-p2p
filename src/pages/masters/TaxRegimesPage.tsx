import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Clock, Pencil, CheckCircle } from 'lucide-react'
import { http } from '../../lib/http'
import {
  FormField, FormInput, FormSelect, FormTextarea,
  AutoCodeField, WorkflowBanner, FormFooter, FormPageHeader
} from '../../components/masters/MasterFormLayout'
import { AuditTrailDrawer } from '../../components/shared/AuditTrailDrawer'
import { formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

// ── Types ──

interface KycField {
  key: string; label: string; type: string
  appliesTo: string; required: boolean
  hasDoc: boolean; hasExpiry: boolean; regex: string
}

interface TaxType {
  code: string; name: string; defaultRate: string
  effectiveFrom: string; effectiveTo: string
}

interface TaxRegime {
  id: string; code: string; name: string; description?: string
  countryCode: string; regimeType: string
  requiresGstin: boolean; requiresVat: boolean; requiresPan: boolean
  tdsApplicable: boolean; vatRate?: number; currencyCode: string
  effectiveFrom?: string; effectiveTo?: string
  einvoicingRequired: boolean; einvoicingProvider?: string
  einvoicingThreshold?: number; einvoicingFormat?: string
  placeOfSupplyRuleSet?: string
  kycFieldSchema?: KycField[]; taxTypes?: TaxType[]
  status: string; createdAt: string
}

// ── KYC field row ──

function KycFieldRow({ field, index, onChange, onRemove }: {
  field: KycField; index: number
  onChange: (i: number, f: KycField) => void
  onRemove: (i: number) => void
}) {
  const set = (k: keyof KycField, v: unknown) => onChange(index, { ...field, [k]: v })
  return (
    <tr className="border-b border-border">
      <td className="px-3 py-2"><FormInput value={field.key} onChange={e => set('key', e.target.value)} placeholder="e.g. gstin" className="text-xs font-mono" /></td>
      <td className="px-3 py-2"><FormInput value={field.label} onChange={e => set('label', e.target.value)} placeholder="GSTIN (15-digit)" className="text-xs" /></td>
      <td className="px-3 py-2">
        <FormSelect value={field.type} onChange={e => set('type', e.target.value)} className="text-xs">
          <option value="text">text</option>
          <option value="number">number</option>
          <option value="date">date</option>
          <option value="file">file</option>
          <option value="regex">regex</option>
        </FormSelect>
      </td>
      <td className="px-3 py-2">
        <FormSelect value={field.appliesTo} onChange={e => set('appliesTo', e.target.value)} className="text-xs">
          <option value="both">both</option>
          <option value="vendor">vendor</option>
          <option value="entity">entity</option>
        </FormSelect>
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={field.required} onChange={e => set('required', e.target.checked)} className="accent-primary" />
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={field.hasDoc} onChange={e => set('hasDoc', e.target.checked)} className="accent-primary" />
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={field.hasExpiry} onChange={e => set('hasExpiry', e.target.checked)} className="accent-primary" />
      </td>
      <td className="px-3 py-2"><FormInput value={field.regex} onChange={e => set('regex', e.target.value)} placeholder="optional" className="text-xs font-mono" /></td>
      <td className="px-3 py-2">
        <button onClick={() => onRemove(index)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

// ── Tax type row ──

function TaxTypeRow({ tt, index, onChange, onRemove }: {
  tt: TaxType; index: number
  onChange: (i: number, t: TaxType) => void
  onRemove: (i: number) => void
}) {
  const set = (k: keyof TaxType, v: string) => onChange(index, { ...tt, [k]: v })
  return (
    <tr className="border-b border-border">
      <td className="px-3 py-2"><FormInput value={tt.code} onChange={e => set('code', e.target.value)} placeholder="CGST" className="text-xs font-mono w-24" /></td>
      <td className="px-3 py-2"><FormInput value={tt.name} onChange={e => set('name', e.target.value)} placeholder="Central GST" className="text-xs" /></td>
      <td className="px-3 py-2"><FormInput value={tt.defaultRate} onChange={e => set('defaultRate', e.target.value)} placeholder="(varies)" className="text-xs w-24" /></td>
      <td className="px-3 py-2"><input type="date" value={tt.effectiveFrom} onChange={e => set('effectiveFrom', e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" /></td>
      <td className="px-3 py-2"><input type="date" value={tt.effectiveTo} onChange={e => set('effectiveTo', e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" /></td>
      <td className="px-3 py-2">
        <button onClick={() => onRemove(index)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

// ── Full page form ──

function TaxRegimeForm({ record, onClose, onSaved }: {
  record?: TaxRegime; onClose: () => void; onSaved: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, unknown>>(record ? { ...record } : {
    countryCode: 'IN', regimeType: 'GST', currencyCode: 'INR',
    einvoicingRequired: false, requiresGstin: false, requiresVat: false,
    requiresPan: false, tdsApplicable: false,
  })
  const [kycFields, setKycFields] = useState<KycField[]>(record?.kycFieldSchema ?? [])
  const [taxTypes, setTaxTypes]   = useState<TaxType[]>(record?.taxTypes ?? [])
  const [errors, setErrors]       = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: (submitForApproval: boolean) => {
      const payload = { ...form, kycFieldSchema: kycFields, taxTypes, submitForApproval }
      return record
        ? http.put<any>(`/api/masters/tax-regimes/${record.id}`, payload)
        : http.post<any>('/api/masters/tax-regimes', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['taxRegime'] }); onSaved(); onClose() },
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.name) e.name = 'Name is required'
    if (!form.countryCode) e.countryCode = 'Country is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function addKycField() {
    setKycFields(f => [...f, { key: '', label: '', type: 'text', appliesTo: 'both', required: false, hasDoc: false, hasExpiry: false, regex: '' }])
  }

  function addTaxType() {
    setTaxTypes(t => [...t, { code: '', name: '', defaultRate: '', effectiveFrom: '', effectiveTo: '' }])
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
      <FormPageHeader
        title={record ? `Edit — ${record.name}` : 'Create Tax Regime'}
        subtitle="Fill details to create new record"
        onBack={onClose}
      />

      {/* A. Identity */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold">Identity</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tax Regime Code" hint="Auto-generated — immutable after create">
            <AutoCodeField value={record?.code} />
          </FormField>
          <FormField label="Tax Regime Name *" error={errors.name}>
            <FormInput value={String(form.name ?? '')} placeholder="e.g. India GST Regime"
              onChange={e => set('name', e.target.value)} onBlur={() => validate()} />
          </FormField>
          <FormField label="Description" span>
            <FormTextarea rows={2} value={String(form.description ?? '')} placeholder="Short description shown on the master list"
              onChange={e => set('description', e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Free-text. Displayed on the regime list page.</p>
          </FormField>
        </div>
      </div>

      {/* B. Effective dating */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold">Effective dating</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Effective From *" hint="Date this regime becomes active">
            <FormInput type="date" value={String(form.effectiveFrom ?? '')} onChange={e => set('effectiveFrom', e.target.value)} />
          </FormField>
          <FormField label="Effective To" hint="Optional. Leave blank if currently effective.">
            <FormInput type="date" value={String(form.effectiveTo ?? '')} onChange={e => set('effectiveTo', e.target.value)} />
          </FormField>
        </div>
      </div>

      {/* C. E-invoicing */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold">E-invoicing</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="E-invoicing Required" hint="Toggle to surface provider/threshold/format fields">
            <FormSelect value={String(form.einvoicingRequired ?? 'false')}
              onChange={e => set('einvoicingRequired', e.target.value === 'true')}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </FormSelect>
          </FormField>
          <FormField label="E-invoicing Provider" hint="Disabled — toggle e-invoicing on to enable">
            <FormSelect value={String(form.einvoicingProvider ?? '')}
              onChange={e => set('einvoicingProvider', e.target.value)}
              disabled={!form.einvoicingRequired}>
              <option value="">Select provider</option>
              <option value="IRP">IRP (India)</option>
              <option value="PEPPOL">PEPPOL</option>
              <option value="ZATCA">ZATCA (Saudi)</option>
              <option value="CUSTOM">Custom</option>
            </FormSelect>
          </FormField>
          <FormField label="E-invoicing Threshold (currency-agnostic)" hint="Amount above which e-invoicing applies">
            <FormInput type="number" value={String(form.einvoicingThreshold ?? '')}
              placeholder="e.g. 50000000"
              disabled={!form.einvoicingRequired}
              onChange={e => set('einvoicingThreshold', e.target.value)} />
          </FormField>
          <FormField label="E-invoicing Format" hint="JSON, XML, UBL_2_1, PINT — depends on the provider's spec">
            <FormSelect value={String(form.einvoicingFormat ?? '')}
              onChange={e => set('einvoicingFormat', e.target.value)}
              disabled={!form.einvoicingRequired}>
              <option value="">Select format</option>
              <option value="JSON">JSON</option>
              <option value="XML">XML</option>
              <option value="UBL_2_1">UBL 2.1</option>
              <option value="PINT">PINT</option>
            </FormSelect>
          </FormField>
        </div>
      </div>

      {/* D. Settings */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold">Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Place of Supply Rule Set" hint="Identifier for the supply-rule lookup (defined in code)">
            <FormInput value={String(form.placeOfSupplyRuleSet ?? '')}
              placeholder="e.g. INDIA_B2B_GST"
              onChange={e => set('placeOfSupplyRuleSet', e.target.value)} />
          </FormField>
          <FormField label="Status" hint="Tenant created">
            <FormSelect value={String(form.status ?? 'ACTIVE')} onChange={e => set('status', e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="INACTIVE">Inactive</option>
            </FormSelect>
          </FormField>
          <FormField label="Regime type">
            <FormSelect value={String(form.regimeType ?? 'GST')} onChange={e => set('regimeType', e.target.value)}>
              <option value="GST">GST</option>
              <option value="VAT">VAT</option>
              <option value="SALES_TAX">Sales Tax</option>
              <option value="WITHHOLDING">Withholding Tax</option>
              <option value="NONE">None / Exempt</option>
            </FormSelect>
          </FormField>
          <FormField label="Country code">
            <FormInput value={String(form.countryCode ?? '')} placeholder="IN / AE / GB"
              onChange={e => set('countryCode', e.target.value.toUpperCase())} />
          </FormField>
          <FormField label="Currency code">
            <FormInput value={String(form.currencyCode ?? '')} placeholder="INR / AED / GBP"
              onChange={e => set('currencyCode', e.target.value.toUpperCase())} />
          </FormField>
          <FormField label="VAT rate (%)">
            <FormInput type="number" step="0.5" value={String(form.vatRate ?? '')}
              onChange={e => set('vatRate', e.target.value)} />
          </FormField>
          <div className="col-span-2 grid grid-cols-4 gap-3">
            {[
              { k: 'requiresGstin', l: 'Requires GSTIN'   },
              { k: 'requiresPan',   l: 'Requires PAN'     },
              { k: 'requiresVat',   l: 'Requires VAT no.' },
              { k: 'tdsApplicable', l: 'TDS applicable'   },
            ].map(({ k, l }) => (
              <div key={k} className="flex items-center gap-2 rounded-lg border border-border p-3">
                <input type="checkbox" id={k} checked={Boolean(form[k])}
                  onChange={e => set(k, e.target.checked)}
                  className="h-4 w-4 rounded accent-primary" />
                <label htmlFor={k} className="text-sm text-muted-foreground">{l}</label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* E. KYC field schema */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">KYC field schema</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Define compliance fields required for vendors under this regime</p>
          </div>
          <button onClick={addKycField}
            className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Plus className="h-3.5 w-3.5" /> Add field
          </button>
        </div>
        {kycFields.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No fields defined — click Add field to start</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {['Key', 'Label', 'Type', 'Applies to', 'Req', 'Doc', 'Expiry', 'Regex', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kycFields.map((f, i) => (
                  <KycFieldRow key={i} field={f} index={i}
                    onChange={(idx, updated) => setKycFields(prev => prev.map((x, j) => j === idx ? updated : x))}
                    onRemove={idx => setKycFields(prev => prev.filter((_, j) => j !== idx))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* F. Tax types */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Tax types</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Define the tax components for this regime (e.g. CGST, SGST, IGST)</p>
          </div>
          <button onClick={addTaxType}
            className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Plus className="h-3.5 w-3.5" /> Add tax type
          </button>
        </div>
        {taxTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No tax types defined — click Add tax type to start</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {['Code', 'Name', 'Default Rate (%)', 'Effective From', 'Effective To', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taxTypes.map((tt, i) => (
                  <TaxTypeRow key={i} tt={tt} index={i}
                    onChange={(idx, updated) => setTaxTypes(prev => prev.map((x, j) => j === idx ? updated : x))}
                    onRemove={idx => setTaxTypes(prev => prev.filter((_, j) => j !== idx))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

// ── List page ──

export default function TaxRegimesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [formOpen, setFormOpen]       = useState(false)
  const [editRecord, setEditRecord]   = useState<TaxRegime | null>(null)
  const [auditRecord, setAuditRecord] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['taxRegime'],
    queryFn:  () => http.get<{ data: TaxRegime[]; total: number }>('/api/masters/tax-regimes?take=50'),
  })

  const approve = useMutation({
    mutationFn: (id: string) => http.post(`/api/masters/tax-regimes/${id}/approve`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['taxRegime'] }),
  })

  const regimes = data?.data ?? []

  if (formOpen) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <TaxRegimeForm
          record={editRecord ?? undefined}
          onClose={() => { setFormOpen(false); setEditRecord(null) }}
          onSaved={() => refetch()}
        />
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
          <h1 className="text-base font-semibold">Tax Regimes</h1>
          <p className="text-xs text-muted-foreground">{data?.total ?? 0} regimes</p>
        </div>
        <button onClick={() => { setEditRecord(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> New regime
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : regimes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No tax regimes yet</p>
            <button onClick={() => setFormOpen(true)} className="mt-3 text-sm text-primary hover:underline">Add first regime</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>{['Code', 'Name', 'Country', 'Type', 'KYC fields', 'Tax types', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {regimes.map(r => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.code}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.countryCode}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">{r.regimeType}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground text-center">
                    {(r.kycFieldSchema as any[])?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground text-center">
                    {(r.taxTypes as any[])?.length ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(r.status))}>
                      {formatStatus(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditRecord(r); setFormOpen(true) }}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setAuditRecord({ id: r.id, name: r.name })}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted" title="Audit">
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                      {r.status === 'PENDING_APPROVAL' && (
                        <button onClick={() => approve.mutate(r.id)}
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
        entityType="taxRegime" entityId={auditRecord?.id ?? ''} entityName={auditRecord?.name ?? ''} />
    </div>
  )
}
