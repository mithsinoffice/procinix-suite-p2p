import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus, Trash2, ShieldCheck, AlertTriangle, MinusCircle, CheckCircle2 } from 'lucide-react'
import { useEffect } from 'react'
import { vendorFormSchema, type VendorFormInput } from '../../../../shared/schemas/vendor.schema'
import { useCreateVendor, useUpdateVendor, useVendor, type VendorDetail } from '../../../lib/api/vendors.api'
import { useMasterData } from '../../../hooks/useMasterData'
import { MasterPageHeader } from '../../../components/masters/MasterFormLayout'
import { http } from '../../../lib/http'
import { STALE_TIMES } from '../../../lib/query-client'
import { cn } from '../../../lib/utils'

interface Props { mode: 'create' | 'edit' }

// ── Primitives ──

function SI({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn('w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50', className)}
      {...p}
    />
  )
}

function SS({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn('w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring', className)}
      {...p}
    >
      {children}
    </select>
  )
}

function F({ label, error, required, span, children }: {
  label: string; error?: string; required?: boolean; span?: boolean; children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', span && 'col-span-2 sm:col-span-2')}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Section({ letter, title, subtitle, children, extra }: {
  letter: string; title: string; subtitle?: string
  children: React.ReactNode; extra?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-muted-foreground w-5">{letter}.</span>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {extra}
      </div>
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
      </div>
    </div>
  )
}

function KycChip({ status, label }: { status?: string | null; label: string }) {
  if (!status || status === 'NOT_CHECKED') return null
  const map: Record<string, string> = {
    VERIFIED:     'bg-green-50 text-green-700 border-green-200',
    PASSED:       'bg-green-50 text-green-700 border-green-200',
    COMPLIANT:    'bg-green-50 text-green-700 border-green-200',
    FAILED:       'bg-red-50 text-red-700 border-red-200',
    NON_COMPLIANT:'bg-red-50 text-red-700 border-red-200',
    PENDING:      'bg-amber-50 text-amber-700 border-amber-200',
    MISMATCH:     'bg-orange-50 text-orange-700 border-orange-200',
  }
  const Icon = status.includes('FAIL') || status.includes('NON') ? AlertTriangle
             : status.includes('PENDING') ? MinusCircle
             : CheckCircle2
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', map[status] ?? 'bg-muted text-muted-foreground border-border')}>
      <Icon className="h-2.5 w-2.5" />
      {label}: {status.replace(/_/g, ' ')}
    </span>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          checked ? 'bg-primary' : 'bg-input'
        )}
      >
        <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
      </button>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}

// ── Inline table row for bank accounts ──

function BankRow({
  i, register, errors, onRemove, isPrimary, onSetPrimary,
}: {
  i: number
  register: UseFormRegister<VendorFormInput>
  errors: FieldErrors<VendorFormInput>
  onRemove: () => void
  isPrimary: boolean
  onSetPrimary: () => void
}) {
  const e = (errors.bankAccounts?.[i] ?? {}) as Record<string, { message?: string }>
  return (
    <div className={cn('rounded-lg border p-3 space-y-3', isPrimary ? 'border-primary/40 bg-primary/5' : 'border-border bg-background')}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-muted-foreground mb-1 block">A/c No *</label>
          <SI placeholder="12 digit account no" {...register(`bankAccounts.${i}.accountNo`)} />
          {e.accountNo?.message && <p className="text-[10px] text-destructive mt-0.5">{e.accountNo.message}</p>}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">IFSC *</label>
          <SI placeholder="HDFC0001234" className="uppercase" {...register(`bankAccounts.${i}.ifsc`)} />
          {e.ifsc?.message && <p className="text-[10px] text-destructive mt-0.5">{e.ifsc.message}</p>}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Bank name</label>
          <SI placeholder="HDFC Bank" {...register(`bankAccounts.${i}.bankName`)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Branch</label>
          <SI placeholder="Powai" {...register(`bankAccounts.${i}.branch`)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Account type</label>
          <SS {...register(`bankAccounts.${i}.accountType`)}>
            <option value="CURRENT">Current</option>
            <option value="SAVINGS">Savings</option>
            <option value="ESCROW">Escrow</option>
            <option value="OD">Overdraft</option>
          </SS>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Currency</label>
          <SS {...register(`bankAccounts.${i}.currencyCode`)}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="AED">AED</option>
          </SS>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">A/c holder name</label>
          <SI placeholder="As per bank records" {...register(`bankAccounts.${i}.accountHolderName`)} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={onSetPrimary}
            className="h-3.5 w-3.5 rounded border-input accent-primary"
          />
          <span className="text-xs text-muted-foreground">Primary account</span>
        </label>
        <button type="button" onClick={onRemove} className="flex items-center gap-1 text-xs text-destructive hover:underline">
          <Trash2 className="h-3 w-3" /> Remove
        </button>
      </div>
    </div>
  )
}

// ── Inline table row for GST registrations ──

function GstRow({
  i, register, errors, onRemove, isPrimary, onSetPrimary,
}: {
  i: number
  register: UseFormRegister<VendorFormInput>
  errors: FieldErrors<VendorFormInput>
  onRemove: () => void
  isPrimary: boolean
  onSetPrimary: () => void
}) {
  const e = (errors.gstRegistrations?.[i] ?? {}) as Record<string, { message?: string }>
  return (
    <div className={cn('rounded-lg border p-3 space-y-3', isPrimary ? 'border-primary/40 bg-primary/5' : 'border-border bg-background')}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">State code *</label>
          <SI placeholder="27" maxLength={2} className="uppercase" {...register(`gstRegistrations.${i}.stateCode`)} />
          {e.stateCode?.message && <p className="text-[10px] text-destructive mt-0.5">{e.stateCode.message}</p>}
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">GSTIN *</label>
          <SI placeholder="27AABCU9603R1ZV" className="uppercase" {...register(`gstRegistrations.${i}.gstin`)} />
          {e.gstin?.message && <p className="text-[10px] text-destructive mt-0.5">{e.gstin.message}</p>}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Registration type</label>
          <SS {...register(`gstRegistrations.${i}.registrationType`)}>
            <option value="REGULAR">Regular</option>
            <option value="COMPOSITION">Composition</option>
            <option value="UNREGISTERED">Unregistered</option>
            <option value="SEZ">SEZ</option>
            <option value="EXPORT">Export</option>
            <option value="ISD">ISD</option>
          </SS>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">SPOC name</label>
          <SI placeholder="Contact name" {...register(`gstRegistrations.${i}.spocName`)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">SPOC email</label>
          <SI type="email" placeholder="spoc@vendor.com" {...register(`gstRegistrations.${i}.spocEmail`)} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={onSetPrimary}
            className="h-3.5 w-3.5 rounded border-input accent-primary"
          />
          <span className="text-xs text-muted-foreground">Primary registration</span>
        </label>
        <button type="button" onClick={onRemove} className="flex items-center gap-1 text-xs text-destructive hover:underline">
          <Trash2 className="h-3 w-3" /> Remove
        </button>
      </div>
    </div>
  )
}

// ── Entity mapping row ──

function EntityRow({
  i, register, errors, onRemove, entities, glCodes, costCentres, profitCentres,
}: {
  i: number
  register: UseFormRegister<VendorFormInput>
  errors: FieldErrors<VendorFormInput>
  onRemove: () => void
  entities: { id: string; code: string; name: string }[]
  glCodes:  { id: string; code: string; name: string }[]
  costCentres: { id: string; code: string; name: string }[]
  profitCentres: { id: string; code: string; name: string }[]
}) {
  const e = (errors.entityMappings?.[i] ?? {}) as Record<string, { message?: string }>
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Entity *</label>
          <SS {...register(`entityMappings.${i}.entityId`)}>
            <option value="">Select entity</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.code} — {e.name}</option>)}
          </SS>
          {e.entityId?.message && <p className="text-[10px] text-destructive mt-0.5">{e.entityId.message}</p>}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">GL Code</label>
          <SS {...register(`entityMappings.${i}.glCodeId`)}>
            <option value="">None</option>
            {glCodes.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
          </SS>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Cost centre</label>
          <SS {...register(`entityMappings.${i}.costCentreId`)}>
            <option value="">None</option>
            {costCentres.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </SS>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Profit centre</label>
          <SS {...register(`entityMappings.${i}.profitCentreId`)}>
            <option value="">None</option>
            {profitCentres.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </SS>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Currency</label>
          <SS {...register(`entityMappings.${i}.currencyCode`)}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="AED">AED</option>
          </SS>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Credit limit</label>
          <SI type="number" placeholder="0" {...register(`entityMappings.${i}.creditLimit`)} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register(`entityMappings.${i}.blockPO`)} className="h-3.5 w-3.5 rounded border-input accent-destructive" />
            <span className="text-xs text-muted-foreground">Block PO</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register(`entityMappings.${i}.blockPayment`)} className="h-3.5 w-3.5 rounded border-input accent-destructive" />
            <span className="text-xs text-muted-foreground">Block payment</span>
          </label>
        </div>
        <button type="button" onClick={onRemove} className="flex items-center gap-1 text-xs text-destructive hover:underline">
          <Trash2 className="h-3 w-3" /> Remove
        </button>
      </div>
    </div>
  )
}

// ── Main form ──

export default function VendorFormPage({ mode }: Props) {
  const navigate     = useNavigate()
  const { id }       = useParams<{ id: string }>()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor(id ?? '')

  const { data: vendor } = useVendor(mode === 'edit' ? (id ?? '') : '')

  // Master data for dropdowns
  const { entities, glCodes, costCentres } = useMasterData()

  const { data: vendorCategories = [] } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ['masters', 'vendor-categories'],
    queryFn:  () => http.get('/api/masters/vendor-categories'),
    staleTime: STALE_TIMES.MASTER,
  })
  const { data: vendorGroups = [] } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ['masters', 'vendor-groups'],
    queryFn:  () => http.get('/api/masters/vendor-groups'),
    staleTime: STALE_TIMES.MASTER,
  })
  const { data: tdsSections = [] } = useQuery<{ id: string; section: string; description?: string; defaultRate?: number }[]>({
    queryKey: ['masters', 'tds-sections'],
    queryFn:  () => http.get('/api/masters/tds-sections'),
    staleTime: STALE_TIMES.MASTER,
  })
  const { data: taxRegimesRaw } = useQuery<{ data: { id: string; code: string; name: string }[] }>({
    queryKey: ['masters', 'tax-regimes', 'list'],
    queryFn:  () => http.get('/api/masters/tax-regimes?take=100'),
    staleTime: STALE_TIMES.MASTER,
  })
  const taxRegimes = taxRegimesRaw?.data ?? []

  const { data: profitCentresRaw = [] } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ['masters', 'profit-centres'],
    queryFn:  () => http.get('/api/masters/profit-centres'),
    staleTime: STALE_TIMES.MASTER,
  })

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
    control,
  } = useForm<VendorFormInput>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      countryCode:      'IN',
      vendorType:       'SUPPLIER',
      panCompliance:    'COMPLIANT',
      paymentTerms:     30,
      paymentMode:      'NEFT',
      paymentCurrency:  'INR',
      tdsApplicable:    false,
      tdsExempt:        false,
      einvoiceRequired: false,
      is206ABApplicable: false,
      lowerTdsAlertDays: 30,
      bankAccounts:     [],
      gstRegistrations: [],
      entityMappings:   [],
    },
  })

  const {
    fields: bankFields, append: appendBank, remove: removeBank,
  } = useFieldArray({ control, name: 'bankAccounts' })

  const {
    fields: gstFields, append: appendGst, remove: removeGst,
  } = useFieldArray({ control, name: 'gstRegistrations' })

  const {
    fields: entityFields, append: appendEntity, remove: removeEntity,
  } = useFieldArray({ control, name: 'entityMappings' })

  const tdsApplicable = watch('tdsApplicable')
  const tdsExempt     = watch('tdsExempt')

  useEffect(() => {
    if (vendor && mode === 'edit') {
      const v = vendor as VendorDetail & {
        bankAccounts: any[]
        gstRegistrations: any[]
        entityMappings: any[]
      }
      reset({
        legalName:        v.legalName       ?? '',
        tradeName:        v.tradeName        ?? '',
        vendorType:       v.vendorType       as any,
        vendorCategoryId: v.vendorCategoryId ?? '',
        vendorGroupId:    v.vendorGroupId    ?? '',
        countryCode:      v.countryCode      ?? 'IN',
        email:            v.email            ?? '',
        mobile:           v.mobile           ?? '',
        contactName:      v.contactName      ?? '',
        website:          v.website          ?? '',
        addressLine1:     v.addressLine1     ?? '',
        addressLine2:     v.addressLine2     ?? '',
        city:             v.city             ?? '',
        state:            v.state            ?? '',
        stateCode:        v.stateCode        ?? '',
        pincode:          v.pincode          ?? '',
        pan:              v.pan              ?? '',
        panCompliance:    (v.panCompliance   ?? 'COMPLIANT') as any,
        gstin:            v.gstin            ?? '',
        cin:              v.cin              ?? '',
        tan:              v.tan              ?? '',
        udyamNumber:      v.udyamNumber      ?? '',
        tdsApplicable:    v.tdsApplicable    ?? false,
        tdsSectionCode:   v.tdsSectionCode   ?? '',
        tdsSectionId:     v.tdsSectionId     ?? '',
        tdsRate:          v.tdsRate          ?? undefined,
        tdsExempt:        v.tdsExempt        ?? false,
        lowerTdsCertNo:   v.lowerTdsCertNo   ?? '',
        lowerTdsSection:  v.lowerTdsSection  ?? '',
        lowerTdsRate:     v.lowerTdsRate     ?? undefined,
        lowerTdsValidFrom: v.lowerTdsValidFrom ? v.lowerTdsValidFrom.substring(0, 10) : '',
        lowerTdsValidTo:   v.lowerTdsValidTo   ? v.lowerTdsValidTo.substring(0, 10)   : '',
        lowerTdsAlertDays: v.lowerTdsAlertDays ?? 30,
        einvoiceRequired:  v.einvoiceRequired  ?? false,
        is206ABApplicable: v.is206ABApplicable ?? false,
        paymentTerms:     v.paymentTerms     ?? 30,
        paymentMode:      (v.paymentMode     ?? 'NEFT') as any,
        paymentCurrency:  v.paymentCurrency  ?? 'INR',
        taxRegimeCode:    v.taxRegimeCode    ?? '',
        erpVendorCode:    v.erpVendorCode    ?? '',
        erpSystem:        v.erpSystem        ?? '',
        bankAccounts:     (v.bankAccounts ?? []).map((b: any) => ({
          id: b.id, accountNo: b.accountNo, ifsc: b.ifsc,
          bankName: b.bankName ?? '', branch: b.branch ?? '',
          accountType: b.accountType ?? 'CURRENT',
          currencyCode: b.currencyCode ?? 'INR',
          accountHolderName: b.accountHolderName ?? '',
          isPrimary: b.isPrimary ?? false,
        })),
        gstRegistrations: (v.gstRegistrations ?? []).map((g: any) => ({
          id: g.id, stateCode: g.stateCode, gstin: g.gstin,
          registrationType: g.registrationType ?? 'REGULAR',
          isPrimary: g.isPrimary ?? false,
          spocName: g.spocName ?? '', spocEmail: g.spocEmail ?? '', spocPhone: g.spocPhone ?? '',
        })),
        entityMappings: (v.entityMappings ?? []).map((e: any) => ({
          id: e.id, entityId: e.entityId,
          glCodeId: e.glCodeId ?? '', costCentreId: e.costCentreId ?? '',
          profitCentreId: e.profitCentreId ?? '',
          currencyCode: e.currencyCode ?? 'INR',
          creditLimit: e.creditLimit ?? undefined,
          blockPO: e.blockPO ?? false, blockPayment: e.blockPayment ?? false,
          blockReason: e.blockReason ?? '',
        })),
      })
    }
  }, [vendor, mode, reset])

  async function onSubmit(data: VendorFormInput) {
    try {
      const payload = {
        ...data,
        gstin:       data.gstin       || undefined,
        cin:         data.cin         || undefined,
        udyamNumber: data.udyamNumber || undefined,
        tan:         data.tan         || undefined,
        // Map empty optional string fields to undefined
        vendorCategoryId: data.vendorCategoryId || undefined,
        vendorGroupId:    data.vendorGroupId    || undefined,
        taxRegimeCode:    data.taxRegimeCode    || undefined,
        tdsSectionId:     data.tdsSectionId     || undefined,
        bankAccounts:     data.bankAccounts.map(b => ({
          ...b, id: b.id || undefined,
          bankName: b.bankName || undefined,
          branch: b.branch || undefined,
          accountHolderName: b.accountHolderName || undefined,
        })),
        gstRegistrations: data.gstRegistrations.map(g => ({
          ...g, id: g.id || undefined,
          spocName: g.spocName || undefined,
          spocEmail: g.spocEmail || undefined,
          spocPhone: g.spocPhone || undefined,
        })),
        entityMappings: data.entityMappings.map(e => ({
          ...e, id: e.id || undefined,
          glCodeId: e.glCodeId || undefined,
          costCentreId: e.costCentreId || undefined,
          profitCentreId: e.profitCentreId || undefined,
          blockReason: e.blockReason || undefined,
        })),
      }
      if (mode === 'create') {
        const res = await createVendor.mutateAsync(payload as any)
        navigate(`/masters/vendors/${res.id}`)
      } else {
        await updateVendor.mutateAsync(payload as any)
        navigate(`/masters/vendors/${id}`)
      }
    } catch { /* errors surfaced by query client toast */ }
  }

  const err = (field: keyof VendorFormInput) => errors[field]?.message as string | undefined

  const v = vendor as (VendorDetail & { bankAccounts: any[]; gstRegistrations: any[]; entityMappings: any[] }) | undefined

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={mode === 'create' ? 'New Vendor' : 'Edit Vendor'}
        description={mode === 'create' ? 'KYC checks run automatically after save' : `Editing ${v?.legalName ?? '…'}`}
        actions={
          <button
            form="vendor-form"
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isSubmitting ? 'Saving…' : 'Save vendor'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <form id="vendor-form" onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-5">

          {/* ── A. Identity & Classification ── */}
          <Section letter="A" title="Identity & Classification" subtitle="Core identifiers and type">
            <F label="Legal name" required error={err('legalName')}>
              <SI placeholder="As per PAN / MCA records" {...register('legalName')} />
            </F>
            <F label="Trade name" error={err('tradeName')}>
              <SI placeholder="Operating / brand name" {...register('tradeName')} />
            </F>
            <F label="Vendor type" required error={err('vendorType')}>
              <SS {...register('vendorType')}>
                <option value="SUPPLIER">Supplier</option>
                <option value="SERVICE_PROVIDER">Service provider</option>
                <option value="CONTRACTOR">Contractor</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="INTERCOMPANY">Intercompany</option>
              </SS>
            </F>
            <F label="Country" error={err('countryCode')}>
              <SS {...register('countryCode')}>
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="AE">UAE</option>
                <option value="SG">Singapore</option>
              </SS>
            </F>
            {vendorCategories.length > 0 && (
              <F label="Vendor category">
                <SS {...register('vendorCategoryId')}>
                  <option value="">None</option>
                  {vendorCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SS>
              </F>
            )}
            {vendorGroups.length > 0 && (
              <F label="Vendor group">
                <SS {...register('vendorGroupId')}>
                  <option value="">None</option>
                  {vendorGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </SS>
              </F>
            )}
          </Section>

          {/* ── B. Contact ── */}
          <Section letter="B" title="Contact" subtitle="Email, phone and web">
            <F label="Email" error={err('email')}>
              <SI type="email" placeholder="accounts@vendor.com" {...register('email')} />
            </F>
            <F label="Mobile" error={err('mobile')}>
              <SI type="tel" placeholder="9800000000" {...register('mobile')} />
            </F>
            <F label="Contact name">
              <SI placeholder="Primary contact person" {...register('contactName')} />
            </F>
            <F label="Website">
              <SI placeholder="https://vendor.com" {...register('website')} />
            </F>
          </Section>

          {/* ── C. Address ── */}
          <Section letter="C" title="Registered Address" subtitle="Business address for correspondence">
            <F label="Address line 1" span>
              <SI placeholder="Building / street" {...register('addressLine1')} />
            </F>
            <F label="Address line 2" span>
              <SI placeholder="Area / landmark" {...register('addressLine2')} />
            </F>
            <F label="City">
              <SI placeholder="Mumbai" {...register('city')} />
            </F>
            <F label="State">
              <SI placeholder="Maharashtra" {...register('state')} />
            </F>
            <F label="State code">
              <SI placeholder="27" maxLength={2} {...register('stateCode')} />
            </F>
            <F label="PIN code" error={err('pincode')}>
              <SI placeholder="400001" maxLength={6} {...register('pincode')} />
            </F>
          </Section>

          {/* ── D. Statutory ── */}
          <Section
            letter="D"
            title="Tax & Statutory"
            subtitle="PAN, GSTIN, CIN, TAN — India compliance"
            extra={
              mode === 'edit' && v ? (
                <div className="flex flex-wrap gap-1.5">
                  <KycChip status={v.kycPanStatus} label="PAN" />
                  <KycChip status={v.kycCinStatus} label="CIN" />
                  <KycChip status={v.kycMsmeStatus} label="MSME" />
                </div>
              ) : null
            }
          >
            <F label="PAN" required error={err('pan')}>
              <SI placeholder="ABCDE1234F" maxLength={10} className="uppercase" {...register('pan')} />
            </F>
            <F label="PAN compliance">
              <SS {...register('panCompliance')}>
                <option value="COMPLIANT">Compliant</option>
                <option value="NON_FILER">Non-filer (206AB)</option>
                <option value="LOWER_DEDUCTION">Lower deduction cert</option>
                <option value="EXEMPTED">Exempted</option>
              </SS>
            </F>
            <F label="Primary GSTIN" error={err('gstin')}>
              <SI placeholder="27AABCU9603R1ZV" className="uppercase" {...register('gstin')} />
            </F>
            <F label="CIN" error={err('cin')}>
              <SI placeholder="U12345MH2010PTC123456" className="uppercase" {...register('cin')} />
            </F>
            <F label="TAN">
              <SI placeholder="MUMB12345A" className="uppercase" {...register('tan')} />
            </F>
            <F label="Udyam / MSME no." error={err('udyamNumber')}>
              <SI placeholder="UDYAM-MH-00-0012345" className="uppercase" {...register('udyamNumber')} />
            </F>
          </Section>

          {/* ── E. GST Registrations ── */}
          <Section
            letter="E"
            title="GST Registrations"
            subtitle="Multi-state GSTIN registrations"
            extra={
              mode === 'edit' && v ? (
                <div className="flex flex-wrap gap-1.5">
                  {v.gstComplianceScore != null && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold">
                      GST score: {v.gstComplianceScore}%
                    </span>
                  )}
                  {v.gstReturnRisk && <KycChip status={v.gstReturnRisk} label="Return risk" />}
                </div>
              ) : null
            }
          >
            <div className="col-span-2 space-y-3">
              {gstFields.map((field, i) => (
                <GstRow
                  key={field.id} i={i}
                  register={register} errors={errors}
                  onRemove={() => removeGst(i)}
                  isPrimary={!!watch(`gstRegistrations.${i}.isPrimary`)}
                  onSetPrimary={() => {
                    gstFields.forEach((_, j) => {
                      setValue(`gstRegistrations.${j}.isPrimary`, j === i)
                    })
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => appendGst({ stateCode: '', gstin: '', registrationType: 'REGULAR', isPrimary: gstFields.length === 0, spocName: '', spocEmail: '', spocPhone: '' })}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Add GST registration
              </button>
            </div>
          </Section>

          {/* ── F. TDS & Withholding ── */}
          <Section letter="F" title="TDS & Withholding" subtitle="Tax deduction at source settings">
            <F label="TDS applicable" span>
              <Toggle
                checked={tdsApplicable}
                onChange={v => setValue('tdsApplicable', v)}
                label="Deduct TDS on invoices from this vendor"
              />
            </F>
            {tdsApplicable && (
              <>
                {tdsSections.length > 0 && (
                  <F label="TDS section">
                    <SS {...register('tdsSectionId')}>
                      <option value="">Select section</option>
                      {tdsSections.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.section}{s.description ? ` — ${s.description}` : ''}
                          {s.defaultRate != null ? ` (${s.defaultRate}%)` : ''}
                        </option>
                      ))}
                    </SS>
                  </F>
                )}
                <F label="TDS section code (manual)">
                  <SI placeholder="194C / 194J / 194Q" {...register('tdsSectionCode')} />
                </F>
                <F label="TDS rate (%)" error={err('tdsRate')}>
                  <SI type="number" step="0.01" placeholder="10.00" {...register('tdsRate')} />
                </F>
                <F label="TDS exempt">
                  <Toggle
                    checked={tdsExempt}
                    onChange={v => setValue('tdsExempt', v)}
                    label="Vendor is TDS exempt"
                  />
                </F>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Lower deduction certificate</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Certificate no.</label>
                      <SI placeholder="LDC/12345/2024" {...register('lowerTdsCertNo')} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Section</label>
                      <SI placeholder="197" {...register('lowerTdsSection')} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Rate (%)</label>
                      <SI type="number" step="0.01" placeholder="5.00" {...register('lowerTdsRate')} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Valid from</label>
                      <SI type="date" {...register('lowerTdsValidFrom')} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Valid to</label>
                      <SI type="date" {...register('lowerTdsValidTo')} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Alert (days before expiry)</label>
                      <SI type="number" placeholder="30" {...register('lowerTdsAlertDays')} />
                    </div>
                  </div>
                </div>
              </>
            )}
            <F label="e-Invoice required">
              <Toggle
                checked={!!watch('einvoiceRequired')}
                onChange={v => setValue('einvoiceRequired', v)}
                label="Vendor must issue e-Invoice"
              />
            </F>
            <F label="206AB flag">
              <Toggle
                checked={!!watch('is206ABApplicable')}
                onChange={v => setValue('is206ABApplicable', v)}
                label="Apply higher TDS under Section 206AB"
              />
            </F>
          </Section>

          {/* ── G. Bank Accounts ── */}
          <Section
            letter="G"
            title="Bank Accounts"
            subtitle="Penny drop verification runs on save"
            extra={
              mode === 'edit' && v ? (
                <div className="flex flex-wrap gap-1.5">
                  <KycChip status={v.kycBankStatus} label="Bank" />
                </div>
              ) : null
            }
          >
            <div className="col-span-2 space-y-3">
              {bankFields.map((field, i) => (
                <BankRow
                  key={field.id} i={i}
                  register={register} errors={errors}
                  onRemove={() => removeBank(i)}
                  isPrimary={!!watch(`bankAccounts.${i}.isPrimary`)}
                  onSetPrimary={() => {
                    bankFields.forEach((_, j) => {
                      setValue(`bankAccounts.${j}.isPrimary`, j === i)
                    })
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => appendBank({ accountNo: '', ifsc: '', bankName: '', branch: '', accountType: 'CURRENT', currencyCode: 'INR', accountHolderName: '', isPrimary: bankFields.length === 0 })}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Add bank account
              </button>
            </div>
          </Section>

          {/* ── H. Entity Mappings ── */}
          <Section letter="H" title="Entity Mappings" subtitle="GL, cost centre and credit settings per legal entity">
            <div className="col-span-2 space-y-3">
              {entityFields.map((field, i) => (
                <EntityRow
                  key={field.id} i={i}
                  register={register} errors={errors}
                  onRemove={() => removeEntity(i)}
                  entities={entities}
                  glCodes={glCodes}
                  costCentres={costCentres}
                  profitCentres={profitCentresRaw}
                />
              ))}
              <button
                type="button"
                onClick={() => appendEntity({ entityId: '', glCodeId: '', costCentreId: '', profitCentreId: '', currencyCode: 'INR', blockPO: false, blockPayment: false, blockReason: '' })}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Add entity mapping
              </button>
            </div>
          </Section>

          {/* ── I. Payment Settings ── */}
          <Section letter="I" title="Payment Settings" subtitle="Terms, mode and currency">
            <F label="Payment terms (days)" error={err('paymentTerms')}>
              <SI type="number" placeholder="30" {...register('paymentTerms')} />
            </F>
            <F label="Payment mode">
              <SS {...register('paymentMode')}>
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
                <option value="CHEQUE">Cheque</option>
                <option value="DD">Demand Draft</option>
                <option value="CASH">Cash</option>
                <option value="SWIFT">SWIFT (International)</option>
              </SS>
            </F>
            <F label="Payment currency">
              <SS {...register('paymentCurrency')}>
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="SGD">SGD — Singapore Dollar</option>
              </SS>
            </F>
            {taxRegimes.length > 0 && (
              <F label="Tax regime">
                <SS {...register('taxRegimeCode')}>
                  <option value="">Default</option>
                  {taxRegimes.map(r => <option key={r.id} value={r.code ?? r.id}>{r.name}</option>)}
                </SS>
              </F>
            )}
          </Section>

          {/* ── J. ERP Sync ── */}
          <Section letter="J" title="ERP Sync" subtitle="Vendor code in your ERP system">
            <F label="ERP vendor code">
              <SI placeholder="SAP / Oracle vendor ID" {...register('erpVendorCode')} />
            </F>
            <F label="ERP system">
              <SI placeholder="SAP S/4HANA" {...register('erpSystem')} />
            </F>
            {mode === 'edit' && v?.erpSyncStatus && (
              <F label="Sync status" span>
                <div className="flex items-center gap-2 pt-1">
                  <ShieldCheck className={cn('h-4 w-4', v.erpSyncStatus === 'SYNCED' ? 'text-green-600' : 'text-amber-500')} />
                  <span className="text-sm">{v.erpSyncStatus}</span>
                  {v.erpSyncedAt && <span className="text-xs text-muted-foreground">{new Date(v.erpSyncedAt).toLocaleDateString()}</span>}
                </div>
              </F>
            )}
          </Section>

        </form>
      </div>
    </div>
  )
}
