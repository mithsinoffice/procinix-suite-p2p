import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Info } from 'lucide-react'
import { http } from '../../../lib/http'
import {
  FormSection, FormField, FormInput, FormSelect, FormTextarea,
  FormPageHeader, FormFooter, WorkflowBanner, ApiSelect, MasterPageHeader,
} from '../../../components/masters/MasterFormLayout'
import { cn } from '../../../lib/utils'

// ── Constants ──

const GOODS_NATURES = [
  { value: 'RAW_MATERIAL',  label: 'Raw Material'  },
  { value: 'FINISHED_GOODS', label: 'Finished Goods' },
  { value: 'CONSUMABLE',    label: 'Consumable'    },
  { value: 'CAPITAL_ASSET', label: 'Capital Asset' },
]
const SERVICES_NATURES = [
  { value: 'PROFESSIONAL',  label: 'Professional Services' },
  { value: 'SUBSCRIPTION',  label: 'Subscription'          },
  { value: 'MAINTENANCE',   label: 'Maintenance / AMC'     },
  { value: 'TRANSPORT',     label: 'Transport'             },
  { value: 'UTILITY',       label: 'Utility'               },
]
const GST_RATES = [0, 5, 12, 18, 28]

// ── Toggle group helper ──

function ToggleGroup({ value, options, onChange, size = 'sm' }: {
  value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
  size?: 'sm' | 'xs'
}) {
  return (
    <div className="flex items-center rounded-lg border border-input overflow-hidden w-fit">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cn(
            'font-medium transition-colors',
            size === 'xs' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
            value === o.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Toggle switch helper ──

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        )}>
        <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )} />
      </button>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  )
}

// ── Info banner ──

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-2 flex items-start gap-2 rounded-lg bg-sky-50 border border-sky-200 px-3 py-2.5">
      <Info className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
      <p className="text-[11px] text-sky-800 leading-relaxed">{children}</p>
    </div>
  )
}

// ── Entity mapping row type ──

interface EntityMappingRow {
  id?: string
  entityId: string
  itemDescription?: string
  expenseGlCodeId?: string
  assetGlCodeId?: string
  depreciationGlCodeId?: string
  accumulatedDepnGlCodeId?: string
  provisionGlCodeId?: string
  provisionExpenseGlCodeId?: string
  rcmGlCodeId?: string
  tdsPayableGlCodeId?: string
  gstItcGlCodeId?: string
  costCentreId?: string
  profitCentreId?: string
  assetCategoryId?: string
  poThresholdOverride?: string
  capitalisationLimitOverride?: string
  provisionAmountOverride?: string
  isActive: boolean
}

// ── Main form defaults ──

interface ItemFormValues {
  name: string; description: string; itemType: string; nature: string; expenseType: string
  uom: string; itemCategoryId: string
  hsnCode: string; sacCode: string; gstRate: string; rcmApplicable: boolean
  tdsSectionId: string; taxCodeId: string
  poRequired: string; poThresholdAmount: string; poAtLocation: boolean
  threeWayMatch: boolean; grnRequired: boolean; advanceAllowed: boolean
  assetCategoryId: string; usefulLifeYears: string; depreciationMethod: string
  depreciationRate: string; residualValuePct: string; capitalisationLimit: string
  autoCreateAsset: boolean; autoPostDepreciation: boolean
  depreciationFrequency: string; depreciationStartDate: string
  provisionRequired: boolean; autoPostProvision: boolean; provisionFrequency: string
  provisionBasis: string; provisionAmount: string
  autoReverse: boolean; reversalTrigger: string
  ocrKeywords: string; ocrSynonyms: string; ocrMatchConfidence: number; ocrNegativeKeywords: string
  approvedVendorsOnly: boolean
}

const DEFAULTS: ItemFormValues = {
  name: '', description: '', itemType: 'SERVICES', nature: '', expenseType: 'OPEX',
  uom: '', itemCategoryId: '',
  hsnCode: '', sacCode: '', gstRate: '18', rcmApplicable: false,
  tdsSectionId: '', taxCodeId: '',
  poRequired: 'YES', poThresholdAmount: '', poAtLocation: false,
  threeWayMatch: false, grnRequired: false, advanceAllowed: false,
  assetCategoryId: '', usefulLifeYears: '', depreciationMethod: 'SLM',
  depreciationRate: '', residualValuePct: '5', capitalisationLimit: '5000',
  autoCreateAsset: false, autoPostDepreciation: false,
  depreciationFrequency: 'MONTHLY', depreciationStartDate: '',
  provisionRequired: false, autoPostProvision: false, provisionFrequency: 'MONTHLY',
  provisionBasis: 'FIXED_AMOUNT', provisionAmount: '',
  autoReverse: true, reversalTrigger: 'ON_INVOICE_APPROVAL',
  ocrKeywords: '', ocrSynonyms: '', ocrMatchConfidence: 80, ocrNegativeKeywords: '',
  approvedVendorsOnly: false,
}

// ── Page component ──

export default function ItemFormPage() {
  const navigate  = useNavigate()
  const { id }    = useParams<{ id: string }>()
  const qc        = useQueryClient()
  const isEdit    = !!id
  const [entityMappings, setEntityMappings] = useState<EntityMappingRow[]>([])

  const { data: existing } = useQuery({
    queryKey: ['itemMaster', id],
    queryFn:  () => http.get<any>(`/api/masters/items/${id}`),
    enabled:  isEdit,
  })

  // Pending change request, if any. Loaded for ACTIVE items in edit mode so
  // the form can render the amber banner explaining that live values are
  // locked until the request resolves.
  const { data: pendingChange, refetch: refetchPendingChange } = useQuery<any>({
    queryKey: ['itemMaster', id, 'pending-change'],
    queryFn:  () => http.get<any>(`/api/masters/items/${id}/pending-change`),
    enabled:  isEdit && existing?.status === 'ACTIVE',
  })

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ItemFormValues>({
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    if (existing) {
      const vals: Partial<ItemFormValues> = {
        name:              existing.name             ?? '',
        description:       existing.description      ?? '',
        itemType:          existing.itemType          ?? 'SERVICES',
        nature:            existing.nature            ?? '',
        expenseType:       existing.expenseType       ?? 'OPEX',
        uom:               existing.uom              ?? '',
        itemCategoryId:    existing.itemCategoryId    ?? '',
        hsnCode:           existing.hsnCode           ?? '',
        sacCode:           existing.sacCode           ?? '',
        gstRate:           existing.gstRate != null ? String(existing.gstRate) : '18',
        rcmApplicable:     !!existing.rcmApplicable,
        tdsSectionId:      existing.tdsSectionId      ?? '',
        taxCodeId:         existing.taxCodeId         ?? '',
        poRequired:        existing.poRequired        ?? 'YES',
        poThresholdAmount: existing.poThresholdAmount != null ? String(existing.poThresholdAmount) : '',
        poAtLocation:      !!existing.poAtLocation,
        threeWayMatch:     !!existing.threeWayMatch,
        grnRequired:       !!existing.grnRequired,
        advanceAllowed:    !!existing.advanceAllowed,
        usefulLifeYears:   existing.usefulLifeYears != null ? String(existing.usefulLifeYears) : '',
        depreciationMethod: existing.depreciationMethod ?? 'SLM',
        depreciationRate:  existing.depreciationRate != null ? String(existing.depreciationRate) : '',
        residualValuePct:  existing.residualValuePct  != null ? String(existing.residualValuePct)  : '5',
        capitalisationLimit: existing.capitalisationLimit != null ? String(existing.capitalisationLimit) : '',
        autoCreateAsset:   !!existing.autoCreateAsset,
        autoPostDepreciation: !!existing.autoPostDepreciation,
        depreciationFrequency: existing.depreciationFrequency ?? 'MONTHLY',
        depreciationStartDate: existing.depreciationStartDate ? existing.depreciationStartDate.slice(0, 10) : '',
        provisionRequired: !!existing.provisionRequired,
        autoPostProvision: !!existing.autoPostProvision,
        provisionFrequency: existing.provisionFrequency ?? 'MONTHLY',
        provisionBasis:    existing.provisionBasis    ?? 'FIXED_AMOUNT',
        provisionAmount:   existing.provisionAmount != null ? String(existing.provisionAmount) : '',
        autoReverse:       existing.autoReverse !== false,
        reversalTrigger:   existing.reversalTrigger   ?? 'ON_INVOICE_APPROVAL',
        ocrKeywords:       existing.ocrKeywords       ?? '',
        ocrSynonyms:       existing.ocrSynonyms       ?? '',
        ocrMatchConfidence: existing.ocrMatchConfidence ?? 80,
        ocrNegativeKeywords: existing.ocrNegativeKeywords ?? '',
        approvedVendorsOnly: !!existing.approvedVendorsOnly,
      }
      reset(vals)
      if (existing.entityMappings?.length) setEntityMappings(existing.entityMappings)
    }
  }, [existing, reset])

  // ── Watched fields for conditional rendering ──
  const itemType           = watch('itemType')
  const expenseType        = watch('expenseType')
  const poRequired         = watch('poRequired')
  const rcmApplicable      = watch('rcmApplicable')
  const provisionRequired  = watch('provisionRequired')
  const autoPostProvision  = watch('autoPostProvision')
  const autoPostDepreciation = watch('autoPostDepreciation')
  const autoReverse        = watch('autoReverse')
  const approvedVendorsOnly = watch('approvedVendorsOnly')
  const depreciationMethod = watch('depreciationMethod')
  const usefulLifeYears    = watch('usefulLifeYears')
  const ocrConfidence      = watch('ocrMatchConfidence')

  const isCAPEX    = expenseType === 'CAPEX'
  const isOPEX     = expenseType === 'OPEX'
  const showProvision = provisionRequired
  const showRCM       = rcmApplicable

  const natures = itemType === 'GOODS' ? GOODS_NATURES : SERVICES_NATURES

  // Auto-calc SLM depreciation rate from useful life
  useEffect(() => {
    if (depreciationMethod === 'SLM' && usefulLifeYears) {
      const rate = (100 / Number(usefulLifeYears)).toFixed(2)
      setValue('depreciationRate', rate)
    }
  }, [depreciationMethod, usefulLifeYears, setValue])

  // Save-mode ref so we can branch on which footer button was clicked WITHOUT
  // duplicating the RHF handleSubmit wrapper. The ref is read inside the
  // wrapped handler — using state would race with React batching.
  const submitModeRef = useRef<'draft' | 'submit'>('draft')
  const [submitting, setSubmitting] = useState(false)
  const [changeRequestNotice, setChangeRequestNotice] = useState<string | null>(null)

  // Mirrors server/src/services/item-change.service.ts MATERIAL_FIELDS.
  // Best-effort frontend detection of "this edit needs the change-request
  // path" — backend is the source of truth (422 NO_MATERIAL_CHANGE if our
  // detection mis-fires, in which case we fall back to PUT).
  const MATERIAL_FIELDS_FE = [
    'gstRate', 'tdsSectionId', 'hsnCode', 'sacCode',
    'provisionRequired', 'provisionAmount', 'provisionFrequency', 'provisionBasis',
  ] as const

  function hasMaterialChange(oldItem: any, next: any): boolean {
    if (!oldItem) return false
    const norm = (v: any) => v === '' || v == null ? null : v
    return MATERIAL_FIELDS_FE.some(f => {
      const o = norm(oldItem[f])
      const n = norm(next[f])
      // Numeric Decimal fields can drift between '18' and 18 — compare as Number.
      if ((f === 'gstRate' || f === 'provisionAmount') && (o != null || n != null)) {
        return Number(o ?? 0) !== Number(n ?? 0)
      }
      return String(o) !== String(n)
    })
  }

  const performSave = handleSubmit(async (data) => {
    const entityMappingsPayload = entityMappings.map(e => ({
      ...e,
      poThresholdOverride: e.poThresholdOverride ? Number(e.poThresholdOverride) : null,
      capitalisationLimitOverride: e.capitalisationLimitOverride ? Number(e.capitalisationLimitOverride) : null,
      provisionAmountOverride: e.provisionAmountOverride ? Number(e.provisionAmountOverride) : null,
    }))

    const payload = {
      ...data,
      gstRate:             data.gstRate           ? Number(data.gstRate)           : null,
      poThresholdAmount:   data.poThresholdAmount  ? Number(data.poThresholdAmount)  : null,
      usefulLifeYears:     data.usefulLifeYears    ? Number(data.usefulLifeYears)    : null,
      depreciationRate:    data.depreciationRate   ? Number(data.depreciationRate)   : null,
      residualValuePct:    data.residualValuePct   ? Number(data.residualValuePct)   : null,
      capitalisationLimit: data.capitalisationLimit ? Number(data.capitalisationLimit) : null,
      provisionAmount:     data.provisionAmount    ? Number(data.provisionAmount)    : null,
      ocrMatchConfidence:  Number(data.ocrMatchConfidence),
      entityMappings:      entityMappingsPayload,
    }

    setSubmitting(true)
    setChangeRequestNotice(null)
    try {
      // Material edits on an ACTIVE item don't mutate the live record — they
      // create a workflow-gated change request. Caller can still save non-
      // material edits (description, OCR keywords, RCM toggle) directly via
      // the regular PUT below.
      if (isEdit && existing?.status === 'ACTIVE' && hasMaterialChange(existing, payload)) {
        // Build the proposed-values block — only material fields. Sending
        // the whole payload would be ignored server-side but is wasteful.
        const proposed: Record<string, unknown> = {}
        for (const f of MATERIAL_FIELDS_FE) proposed[f] = (payload as any)[f]
        const created = await http.post<{ ok: boolean; changeRequestId: string; changedFields: string[] }>(
          `/api/masters/items/${id}/request-change`, proposed,
        )
        setChangeRequestNotice(
          `Change request submitted — pending approval. Fields: ${created.changedFields.join(', ')}. Live values remain active until approved.`,
        )
        qc.invalidateQueries({ queryKey: ['itemMaster'] })
        await refetchPendingChange()
        // Stay on the page so the user can see the banner + read the notice.
        return
      }

      const saved = isEdit
        ? await http.put<{ id: string }>(`/api/masters/items/${id}`, payload)
        : await http.post<{ id: string; itemCode: string }>('/api/masters/items', payload)

      // Submit-for-approval path: also kick off the workflow. Save-draft path
      // just persists and exits — the record stays in DRAFT.
      if (submitModeRef.current === 'submit') {
        await http.post(`/api/masters/items/${saved.id}/submit`, {})
      }
      qc.invalidateQueries({ queryKey: ['itemMaster'] })
      navigate('/masters/items')
    } finally {
      setSubmitting(false)
    }
  })

  const handleSaveDraft = () => { submitModeRef.current = 'draft';  performSave() }
  const handleSubmitForApproval = () => { submitModeRef.current = 'submit'; performSave() }
  const isPending = submitting

  // ── Entity mapping helpers ──
  function addEntityRow() {
    setEntityMappings(prev => [...prev, { entityId: '', isActive: true }])
  }
  function removeEntityRow(i: number) {
    setEntityMappings(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateEntityRow(i: number, field: keyof EntityMappingRow, value: unknown) {
    setEntityMappings(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? 'Edit Item' : 'New Item'}
        description="Configure item with tax, PO rules, GL mapping and OCR keywords"
        onRefresh={() => {}}
      />

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={performSave} className="max-w-5xl mx-auto px-6 py-6 space-y-4">
          <FormPageHeader
            title={isEdit ? `Edit — ${existing?.name ?? '…'}` : 'Create Item Master'}
            subtitle="Fill all sections. CAPEX and Provision sections appear based on your expense type selection."
            onBack={() => navigate('/masters/items')}
          />

          {/* Amber banner when a pending change request exists OR when one was
              just created from this form. Material edits on ACTIVE items go
              through this workflow — live values stay active until approved. */}
          {(pendingChange || changeRequestNotice) && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">
                {changeRequestNotice ? 'Change request submitted' : 'Change request pending approval'}
              </p>
              <p className="text-xs text-amber-800 mt-1">
                {changeRequestNotice ?? 'A material-field change is awaiting approval. Current values remain active until approved.'}
              </p>
              {pendingChange?.changedFields?.fields?.length > 0 && !changeRequestNotice && (
                <p className="text-xs text-amber-700 mt-1.5 font-mono">
                  Fields: {(pendingChange.changedFields.fields as string[]).join(', ')}
                </p>
              )}
            </div>
          )}

          {/* A. Identity */}
          <FormSection title="A. Identity & Classification">
            {isEdit && (
              <FormField label="Item Code" hint="Auto-generated — read only">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-primary">{existing?.itemCode}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Auto</span>
                </div>
              </FormField>
            )}
            <FormField label="Name" required error={errors.name?.message}>
              <FormInput placeholder="Core Banking Software License" {...register('name', { required: 'Name is required' })} />
            </FormField>
            <FormField label="Description" hint="Optional — shows on PO and invoice lines">
              <FormTextarea rows={2} placeholder="Detailed description…" {...register('description')} />
            </FormField>
            <FormField label="Item Type" required hint="Goods = physical; Services = work or license">
              <ToggleGroup
                value={itemType}
                options={[{ label: 'Services', value: 'SERVICES' }, { label: 'Goods', value: 'GOODS' }]}
                onChange={v => { setValue('itemType', v); setValue('nature', '') }}
              />
            </FormField>
            <FormField label="Nature" hint="Sub-classification within item type">
              <FormSelect {...register('nature')}>
                <option value="">Select nature…</option>
                {natures.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </FormSelect>
            </FormField>
            <FormField label="Expense Type" required hint="CAPEX = asset; OPEX = period expense">
              <ToggleGroup
                value={expenseType}
                options={[{ label: 'OPEX', value: 'OPEX' }, { label: 'CAPEX', value: 'CAPEX' }]}
                onChange={v => setValue('expenseType', v)}
              />
            </FormField>
            <FormField label="Item Category">
              <ApiSelect
                endpoint="/api/masters/item-categories"
                queryKey={['itemCategory']}
                value={watch('itemCategoryId')}
                onChange={v => setValue('itemCategoryId', v)}
                valueKey="id" labelKey="name"
                placeholder="Select category…"
              />
            </FormField>
            <FormField label="Unit of Measure" hint="e.g. EA, HR, KG, MT, LTR">
              <FormInput placeholder="EA" {...register('uom')} />
            </FormField>
          </FormSection>

          {/* B. Tax Configuration */}
          <FormSection title="B. Tax Configuration">
            {itemType === 'GOODS' && (
              <FormField label="HSN Code" hint="4–8 digit Harmonised System of Nomenclature">
                <FormInput placeholder="84713" maxLength={8} {...register('hsnCode')} />
              </FormField>
            )}
            {itemType === 'SERVICES' && (
              <FormField label="SAC Code" hint="Service Accounting Code">
                <FormInput placeholder="998314" maxLength={6} {...register('sacCode')} />
              </FormField>
            )}
            <FormField label="GST Rate" hint="Select applicable GST slab">
              <FormSelect {...register('gstRate')}>
                {GST_RATES.map(r => <option key={r} value={String(r)}>{r}%</option>)}
              </FormSelect>
            </FormField>
            <FormField label="RCM Applicable" hint="Buyer pays GST under Reverse Charge Mechanism">
              <Toggle checked={rcmApplicable} onChange={v => setValue('rcmApplicable', v)} />
            </FormField>
            {rcmApplicable && (
              <InfoBanner>RCM is applicable — the buyer (your company) is liable to deposit GST directly with the government. Vendor invoice will not include GST.</InfoBanner>
            )}
            <FormField label="TDS Section">
              <ApiSelect
                endpoint="/api/masters/tds-sections"
                queryKey={['tdsSections']}
                value={watch('tdsSectionId')}
                onChange={v => setValue('tdsSectionId', v)}
                valueKey="id" labelKey="section"
                placeholder="Select TDS section…"
              />
            </FormField>
            <FormField label="Tax Code">
              <ApiSelect
                endpoint="/api/masters/tax-codes"
                queryKey={['taxCodes']}
                value={watch('taxCodeId')}
                onChange={v => setValue('taxCodeId', v)}
                valueKey="id" labelKey="code"
                placeholder="Select tax code…"
              />
            </FormField>
          </FormSection>

          {/* C. PO Rules */}
          <FormSection title="C. Purchase Order Rules">
            <FormField label="PO Required" hint="Controls whether a PO is mandatory for this item">
              <ToggleGroup
                value={poRequired}
                options={[
                  { label: 'Yes', value: 'YES' },
                  { label: 'No', value: 'NO' },
                  { label: 'Conditional', value: 'CONDITIONAL' },
                ]}
                onChange={v => setValue('poRequired', v)}
              />
            </FormField>
            {poRequired === 'CONDITIONAL' && (
              <FormField label="PO Threshold (₹)" hint="PO not required if invoice amount is below this value">
                <FormInput type="number" min="0" placeholder="50000" {...register('poThresholdAmount')} />
              </FormField>
            )}
            <FormField label="PO at Location" hint="PO can be raised at individual location level">
              <Toggle checked={watch('poAtLocation')} onChange={v => setValue('poAtLocation', v)} />
            </FormField>
            <FormField label="3-Way Match" hint="Invoice must match PO + GRN before approval">
              <Toggle checked={watch('threeWayMatch')} onChange={v => setValue('threeWayMatch', v)} />
            </FormField>
            <FormField label="GRN Required" hint="Goods Receipt Note mandatory before invoice approval">
              <Toggle checked={watch('grnRequired')} onChange={v => setValue('grnRequired', v)} />
            </FormField>
            <FormField label="Advance Allowed" hint="Allow vendor advance payments for this item">
              <Toggle checked={watch('advanceAllowed')} onChange={v => setValue('advanceAllowed', v)} />
            </FormField>
          </FormSection>

          {/* D. CAPEX / Asset Config — only if CAPEX */}
          {expenseType === 'CAPEX' && (
            <FormSection title="D. Asset & Depreciation Config">
              <FormField label="Useful Life (Years)">
                <FormInput type="number" min="1" max="99" placeholder="5" {...register('usefulLifeYears')} />
              </FormField>
              <FormField label="Depreciation Method">
                <ToggleGroup
                  value={depreciationMethod}
                  options={[{ label: 'SLM', value: 'SLM' }, { label: 'WDV', value: 'WDV' }]}
                  onChange={v => setValue('depreciationMethod', v)}
                />
              </FormField>
              <FormField label="Depreciation Rate (%)" hint={depreciationMethod === 'SLM' ? 'Auto-calculated from useful life' : 'Enter WDV rate manually'}>
                <FormInput type="number" step="0.01" min="0" max="100"
                  placeholder="20.00"
                  {...register('depreciationRate')}
                  readOnly={depreciationMethod === 'SLM'}
                  className={depreciationMethod === 'SLM' ? 'opacity-60' : ''}
                />
              </FormField>
              <FormField label="Residual Value (%)" hint="Percentage of original cost retained at end of life">
                <FormInput type="number" step="0.01" min="0" max="100" placeholder="5" {...register('residualValuePct')} />
              </FormField>
              <FormField label="Capitalisation Limit (₹)" hint="Items below this amount are expensed to P&L directly">
                <FormInput type="number" min="0" placeholder="5000" {...register('capitalisationLimit')} />
              </FormField>
              <FormField label="Auto-create Asset" hint="Create asset register entry automatically on GRN approval">
                <Toggle checked={watch('autoCreateAsset')} onChange={v => setValue('autoCreateAsset', v)} />
              </FormField>
              <FormField label="Auto-post Depreciation" hint="Post monthly depreciation journal entries automatically">
                <Toggle checked={autoPostDepreciation} onChange={v => setValue('autoPostDepreciation', v)} />
              </FormField>
              {autoPostDepreciation && (
                <>
                  <FormField label="Depreciation Frequency">
                    <FormSelect {...register('depreciationFrequency')}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="ANNUAL">Annual</option>
                    </FormSelect>
                  </FormField>
                  <FormField label="Depreciation Start Date">
                    <FormInput type="date" {...register('depreciationStartDate')} />
                  </FormField>
                </>
              )}
            </FormSection>
          )}

          {/* E. Provision Config */}
          <FormSection title="E. Accrual & Provision Config">
            <FormField label="Provision Required" hint="Accrue expense in advance before invoice is received">
              <Toggle checked={provisionRequired} onChange={v => setValue('provisionRequired', v)} />
            </FormField>
            {provisionRequired && (
              <>
                <FormField label="Auto-post Provision" hint="Post provision journal entries automatically">
                  <Toggle checked={autoPostProvision} onChange={v => setValue('autoPostProvision', v)} />
                </FormField>
                <FormField label="Provision Frequency">
                  <FormSelect {...register('provisionFrequency')}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUAL">Annual</option>
                  </FormSelect>
                </FormField>
                <FormField label="Provision Basis">
                  <ToggleGroup
                    value={watch('provisionBasis')}
                    options={[{ label: 'Fixed Amount', value: 'FIXED_AMOUNT' }, { label: 'Percentage', value: 'PERCENTAGE' }]}
                    onChange={v => setValue('provisionBasis', v)}
                  />
                </FormField>
                <FormField label="Provision Amount / Rate" hint="Amount in ₹ for fixed; percentage for percentage basis">
                  <FormInput type="number" step="0.01" min="0" placeholder="0" {...register('provisionAmount')} />
                </FormField>
                <FormField label="Auto-reverse Provision" hint="Automatically reverse provision entry on invoice posting">
                  <Toggle checked={autoReverse} onChange={v => setValue('autoReverse', v)} />
                </FormField>
                {autoReverse && (
                  <FormField label="Reversal Trigger" hint="When should the provision be reversed?">
                    <FormSelect {...register('reversalTrigger')}>
                      <option value="ON_INVOICE_APPROVAL">On invoice approval</option>
                      <option value="ON_PAYMENT">On payment</option>
                      <option value="MANUAL">Manual</option>
                    </FormSelect>
                  </FormField>
                )}
              </>
            )}
          </FormSection>

          <FormSection title="G. Entity-level Overrides">
            <div className="col-span-2">
              <div className="overflow-x-auto rounded-lg border border-border mb-3">
                <table className="min-w-[1200px] w-full text-xs">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Entity *</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item description</th>
                      {isOPEX && <th className="px-3 py-2 text-left font-medium text-muted-foreground">Expense GL</th>}
                      {isCAPEX && <th className="px-3 py-2 text-left font-medium text-muted-foreground">Asset GL</th>}
                      {isCAPEX && <th className="px-3 py-2 text-left font-medium text-muted-foreground">Depn GL</th>}
                      {isCAPEX && <th className="px-3 py-2 text-left font-medium text-muted-foreground">Accum Depn GL</th>}
                      {showProvision && <th className="px-3 py-2 text-left font-medium text-muted-foreground">Provision GL</th>}
                      {showRCM && <th className="px-3 py-2 text-left font-medium text-muted-foreground">RCM GL</th>}
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">TDS Payable GL</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">GST ITC GL</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cost Centre</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Profit Centre</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Asset Category</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">PO Threshold Override</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cap Limit Override</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Prov Amount Override</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Active</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entityMappings.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-2 py-1.5 min-w-[180px]">
                          <ApiSelect
                            endpoint="/api/masters/entities"
                            queryKey={['entities']}
                            value={row.entityId}
                            onChange={v => updateEntityRow(i, 'entityId', v)}
                            valueKey="id" labelKey="name"
                            placeholder="Select entity…"
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[220px]">
                          <FormInput
                            placeholder="Description override"
                            value={row.itemDescription ?? ''}
                            onChange={e => updateEntityRow(i, 'itemDescription', e.target.value)}
                          />
                        </td>
                        {isOPEX && (
                          <td className="px-2 py-1.5 min-w-[180px]">
                            <ApiSelect
                              endpoint="/api/masters/gl-codes"
                              queryKey={['glCodes']}
                              value={row.expenseGlCodeId ?? ''}
                              onChange={v => updateEntityRow(i, 'expenseGlCodeId', v)}
                              valueKey="id" labelKey="name"
                              placeholder="Expense GL…"
                            />
                          </td>
                        )}
                        {isCAPEX && (
                          <>
                            <td className="px-2 py-1.5 min-w-[180px]">
                              <ApiSelect
                                endpoint="/api/masters/gl-codes"
                                queryKey={['glCodes']}
                                value={row.assetGlCodeId ?? ''}
                                onChange={v => updateEntityRow(i, 'assetGlCodeId', v)}
                                valueKey="id" labelKey="name"
                                placeholder="Asset GL…"
                              />
                            </td>
                            <td className="px-2 py-1.5 min-w-[180px]">
                              <ApiSelect
                                endpoint="/api/masters/gl-codes"
                                queryKey={['glCodes']}
                                value={row.depreciationGlCodeId ?? ''}
                                onChange={v => updateEntityRow(i, 'depreciationGlCodeId', v)}
                                valueKey="id" labelKey="name"
                                placeholder="Depn GL…"
                              />
                            </td>
                            <td className="px-2 py-1.5 min-w-[180px]">
                              <ApiSelect
                                endpoint="/api/masters/gl-codes"
                                queryKey={['glCodes']}
                                value={row.accumulatedDepnGlCodeId ?? ''}
                                onChange={v => updateEntityRow(i, 'accumulatedDepnGlCodeId', v)}
                                valueKey="id" labelKey="name"
                                placeholder="Accum Depn GL…"
                              />
                            </td>
                          </>
                        )}
                        {showProvision && (
                          <td className="px-2 py-1.5 min-w-[180px]">
                            <ApiSelect
                              endpoint="/api/masters/gl-codes"
                              queryKey={['glCodes']}
                              value={row.provisionGlCodeId ?? ''}
                              onChange={v => updateEntityRow(i, 'provisionGlCodeId', v)}
                              valueKey="id" labelKey="name"
                              placeholder="Provision GL…"
                            />
                          </td>
                        )}
                        {showRCM && (
                          <td className="px-2 py-1.5 min-w-[180px]">
                            <ApiSelect
                              endpoint="/api/masters/gl-codes"
                              queryKey={['glCodes']}
                              value={row.rcmGlCodeId ?? ''}
                              onChange={v => updateEntityRow(i, 'rcmGlCodeId', v)}
                              valueKey="id" labelKey="name"
                              placeholder="RCM GL…"
                            />
                          </td>
                        )}
                        <td className="px-2 py-1.5 min-w-[180px]">
                          <ApiSelect
                            endpoint="/api/masters/gl-codes"
                            queryKey={['glCodes']}
                            value={row.tdsPayableGlCodeId ?? ''}
                            onChange={v => updateEntityRow(i, 'tdsPayableGlCodeId', v)}
                            valueKey="id" labelKey="name"
                            placeholder="TDS Payable GL…"
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[180px]">
                          <ApiSelect
                            endpoint="/api/masters/gl-codes"
                            queryKey={['glCodes']}
                            value={row.gstItcGlCodeId ?? ''}
                            onChange={v => updateEntityRow(i, 'gstItcGlCodeId', v)}
                            valueKey="id" labelKey="name"
                            placeholder="GST ITC GL…"
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[180px]">
                          <ApiSelect
                            endpoint="/api/masters/cost-centres"
                            queryKey={['costCentres']}
                            value={row.costCentreId ?? ''}
                            onChange={v => updateEntityRow(i, 'costCentreId', v)}
                            valueKey="id" labelKey="name"
                            placeholder="Cost centre…"
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[180px]">
                          <ApiSelect
                            endpoint={`/api/masters/profit-centres${row.entityId ? `?entityId=${row.entityId}` : ''}`}
                            queryKey={[ 'profitCentres', row.entityId ]}
                            value={row.profitCentreId ?? ''}
                            onChange={v => updateEntityRow(i, 'profitCentreId', v)}
                            valueKey="id" labelKey="name"
                            placeholder="Profit centre…"
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[180px]">
                          <FormInput
                            placeholder="Asset category"
                            value={row.assetCategoryId ?? ''}
                            onChange={e => updateEntityRow(i, 'assetCategoryId', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[140px]">
                          <FormInput
                            type="number"
                            min="0"
                            placeholder="50000"
                            value={row.poThresholdOverride ?? ''}
                            onChange={e => updateEntityRow(i, 'poThresholdOverride', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[140px]">
                          <FormInput
                            type="number"
                            min="0"
                            placeholder="5000"
                            value={row.capitalisationLimitOverride ?? ''}
                            onChange={e => updateEntityRow(i, 'capitalisationLimitOverride', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1.5 min-w-[140px]">
                          <FormInput
                            type="number"
                            min="0"
                            placeholder="0"
                            value={row.provisionAmountOverride ?? ''}
                            onChange={e => updateEntityRow(i, 'provisionAmountOverride', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Toggle checked={row.isActive} onChange={v => updateEntityRow(i, 'isActive', v)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => removeEntityRow(i)}
                            className="rounded p-1 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addEntityRow}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add entity mapping
              </button>
            </div>
          </FormSection>

          {/* H. OCR Configuration */}
          <FormSection title="H. OCR & Auto-match Configuration">
            <InfoBanner>
              OCR keywords drive automatic item identification when invoices are processed. High-confidence matches auto-populate item fields on invoice lines.
            </InfoBanner>
            <FormField label="OCR Keywords" hint="Comma-separated keywords OCR matches against invoice line descriptions">
              <FormTextarea rows={2} placeholder="core banking, CBS license, software license" {...register('ocrKeywords')} />
            </FormField>
            <FormField label="Synonyms" hint="Alternative names and phrases for this item">
              <FormTextarea rows={2} placeholder="CBS, core system, banking platform" {...register('ocrSynonyms')} />
            </FormField>
            <FormField label={`Auto-match Confidence ≥ ${ocrConfidence}%`} hint="OCR will auto-suggest this item only when confidence meets or exceeds this threshold">
              <div className="space-y-1">
                <input
                  type="range" min="50" max="100" step="5"
                  className="w-full accent-primary"
                  {...register('ocrMatchConfidence', { valueAsNumber: true })}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>50% (permissive)</span>
                  <span className="font-semibold text-primary">{ocrConfidence}%</span>
                  <span>100% (strict)</span>
                </div>
              </div>
            </FormField>
            <FormField label="Negative Keywords" hint="Phrases that should NOT match this item (exclusions)">
              <FormTextarea rows={2} placeholder="maintenance, AMC, repair" {...register('ocrNegativeKeywords')} />
            </FormField>
          </FormSection>

          {/* I. Vendor Restrictions */}
          <FormSection title="I. Vendor Restrictions">
            <FormField label="Approved Vendors Only" hint="Restrict purchases to pre-approved vendors only">
              <Toggle checked={approvedVendorsOnly} onChange={v => setValue('approvedVendorsOnly', v)} />
            </FormField>
            {approvedVendorsOnly && (
              <div className="col-span-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3">
                <p className="text-xs text-amber-800 font-medium">Approved vendor list — coming soon</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Vendor restriction enforcement is active. Vendor whitelist management will be available in the next release.</p>
              </div>
            )}
          </FormSection>

          <WorkflowBanner />
          <FormFooter
            onCancel={() => navigate('/masters/items')}
            onDraft={handleSaveDraft}
            onSubmit={handleSubmitForApproval}
            isPending={isPending}
          />
        </form>
      </div>
    </div>
  )
}
