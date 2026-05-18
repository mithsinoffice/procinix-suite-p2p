import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Loader2, Send, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { http } from '../../lib/http'
import {
  MasterPageHeader, FormInput, FormSelect, FormTextarea, AutoCodeField,
} from '../../components/masters/MasterFormLayout'
import { formatCurrency } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface POLine {
  itemId?:         string
  description:     string
  qty:             number
  uom?:            string
  unitPrice:       number
  discountPct?:    number
  gstRate?:        number
  tdsApplicable:   boolean
  tdsRate?:        number
  rcmApplicable:   boolean
  hsnCode?:        string
  sacCode?:        string
  glCodeId?:       string
  costCentreId?:   string
  shipToLocationId?: string
  // Computed
  taxableAmount:   number
  cgstAmount:      number
  sgstAmount:      number
  igstAmount:      number
  tdsAmount:       number
  lineTotal:       number
}

interface Milestone {
  description:  string
  pct:          number
  amount:       number
  triggerEvent: string
  dueDate?:     string
  isAdvance:    boolean
}

interface POForm {
  poType:           string
  vendorId:         string
  entityId:         string
  shipToLocationId?: string
  poDate:           string
  poExpiryDate?:    string
  autoExpire:       boolean
  currencyCode:     string
  exchangeRate?:    number
  paymentTermsDays: number
  paymentMode:      string
  taxType:          string
  notes?:           string
  prRefs:           string[]
  glCodeId?:        string
  costCentreId?:    string
  lines:            POLine[]
  milestones:       Milestone[]
}

const emptyLine = (): POLine => ({
  description: '', qty: 1, unitPrice: 0, discountPct: 0,
  tdsApplicable: false, rcmApplicable: false,
  taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, tdsAmount: 0, lineTotal: 0,
})

const emptyMilestone = (): Milestone => ({
  description: '', pct: 0, amount: 0, triggerEvent: 'ON_GRN', isAdvance: false,
})

// ── Per-line calc (depends on gstType: INTRASTATE | INTERSTATE | IGST) ──

function calcLine(line: POLine, gstType: string, taxType: string): POLine {
  const qty       = Number(line.qty)         || 0
  const unitPrice = Number(line.unitPrice)   || 0
  const discPct   = Number(line.discountPct) || 0
  const gstRate   = Number(line.gstRate)     || 0
  const tdsRate   = line.tdsApplicable ? (Number(line.tdsRate) || 0) : 0

  const gross    = qty * unitPrice
  const discount = (gross * discPct) / 100
  const afterDisc = gross - discount

  let taxable: number
  let gstAmt:  number
  if (taxType === 'INCLUSIVE' && gstRate > 0) {
    // Back-calculate: taxable = afterDisc / (1 + gstRate/100)
    taxable = afterDisc / (1 + gstRate / 100)
    gstAmt  = afterDisc - taxable
  } else {
    taxable = afterDisc
    gstAmt  = (taxable * gstRate) / 100
  }

  const isIntrastate = gstType === 'INTRASTATE'
  const cgst = isIntrastate ? gstAmt / 2 : 0
  const sgst = isIntrastate ? gstAmt / 2 : 0
  const igst = isIntrastate ? 0 : gstAmt

  const tdsAmt = (taxable * tdsRate) / 100
  const total  = taxType === 'INCLUSIVE' ? afterDisc - tdsAmt : taxable + gstAmt - tdsAmt

  return {
    ...line,
    taxableAmount: taxable,
    cgstAmount:    cgst,
    sgstAmount:    sgst,
    igstAmount:    igst,
    tdsAmount:     tdsAmt,
    lineTotal:     total,
  }
}

function calcTotals(lines: POLine[]) {
  return lines.reduce((acc, l) => ({
    subtotal:   acc.subtotal   + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0),
    discount:   acc.discount   + ((Number(l.qty) || 0) * (Number(l.unitPrice) || 0) - Number(l.taxableAmount || 0) - (Number(l.cgstAmount || 0) + Number(l.sgstAmount || 0) + Number(l.igstAmount || 0))),
    taxable:    acc.taxable    + Number(l.taxableAmount || 0),
    cgst:       acc.cgst       + Number(l.cgstAmount || 0),
    sgst:       acc.sgst       + Number(l.sgstAmount || 0),
    igst:       acc.igst       + Number(l.igstAmount || 0),
    tds:        acc.tds        + Number(l.tdsAmount || 0),
    total:      acc.total      + Number(l.lineTotal || 0),
  }), { subtotal: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, tds: 0, total: 0 })
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ letter, title, subtitle }: { letter: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-border pb-2 mb-4">
      <span className="text-sm font-bold text-primary">{letter}.</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

function Field({ label, required, error, span, children }: {
  label: string; required?: boolean; error?: string; span?: boolean; children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', span && 'col-span-2')}>
      <label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function POFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const isEdit   = !!id
  const qc       = useQueryClient()

  const [gstType, setGstType] = useState<string>('')
  const [budgetCheck, setBudgetCheck] = useState<{ status: string; available: number | null } | null>(null)

  // ── Lookups ──
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-lookup'],
    queryFn:  () => http.get<any>('/api/masters/vendors').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: entities = [] } = useQuery({
    queryKey: ['entities-lookup'],
    queryFn:  () => http.get<any>('/api/masters/entities').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: locations = [] } = useQuery({
    queryKey: ['locations-lookup'],
    queryFn:  () => http.get<any>('/api/masters/locations').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: items = [] } = useQuery({
    queryKey: ['items-lookup'],
    queryFn:  () => http.get<any>('/api/masters/items').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: glCodes = [] } = useQuery({
    queryKey: ['gl-codes-lookup'],
    queryFn:  () => http.get<any>('/api/masters/gl-codes').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: costCentres = [] } = useQuery({
    queryKey: ['cost-centres-lookup'],
    queryFn:  () => http.get<any>('/api/masters/cost-centres').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: openPRs = [] } = useQuery({
    queryKey: ['pr-list', 'APPROVED'],
    queryFn:  () => http.get<any>('/api/pr?status=APPROVED').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 60_000,
  })

  const { data: existing, isLoading: loadingPo } = useQuery({
    queryKey: ['po', id],
    queryFn:  () => http.get<any>(`/api/po/${id}`),
    enabled:  isEdit,
    staleTime: 0,
  })

  // ── Form ──
  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<POForm>({
      defaultValues: {
        poType:           'STANDARD',
        currencyCode:     'INR',
        paymentTermsDays: 30,
        paymentMode:      'NEFT',
        taxType:          'EXCLUSIVE',
        autoExpire:       false,
        prRefs:           [],
        lines:            [emptyLine()],
        milestones:       [],
      },
    })

  const { fields: lineFields, append: appendLine, remove: removeLine, update: updateLine } =
    useFieldArray({ control, name: 'lines' })
  const { fields: msFields, append: appendMs, remove: removeMs } =
    useFieldArray({ control, name: 'milestones' })

  const lines      = useWatch({ control, name: 'lines' }) ?? []
  const milestones = useWatch({ control, name: 'milestones' }) ?? []
  const vendorId   = useWatch({ control, name: 'vendorId' })
  const entityId   = useWatch({ control, name: 'entityId' })
  const poType     = useWatch({ control, name: 'poType' })
  const taxType    = useWatch({ control, name: 'taxType' })
  const glCodeId   = useWatch({ control, name: 'glCodeId' })
  const costCentreId = useWatch({ control, name: 'costCentreId' })

  const totals = calcTotals(lines as POLine[])
  const milestonePctTotal = milestones.reduce((s, m) => s + (Number(m.pct) || 0), 0)

  // Hydrate on edit
  useEffect(() => {
    if (existing) {
      reset({
        poType:           existing.poType,
        vendorId:         existing.vendorId,
        entityId:         existing.entityId,
        shipToLocationId: existing.shipToLocationId ?? '',
        poDate:           existing.poDate ? String(existing.poDate).slice(0, 10) : '',
        poExpiryDate:     existing.poExpiryDate ? String(existing.poExpiryDate).slice(0, 10) : '',
        autoExpire:       !!existing.autoExpire,
        currencyCode:     existing.currencyCode ?? 'INR',
        exchangeRate:     existing.exchangeRate ?? undefined,
        paymentTermsDays: existing.paymentTermsDays ?? 30,
        paymentMode:      existing.paymentMode ?? 'NEFT',
        taxType:          existing.taxType ?? 'EXCLUSIVE',
        notes:            existing.notes ?? '',
        prRefs:           Array.isArray(existing.prRefs) ? existing.prRefs : [],
        lines: (existing.lines ?? []).map((l: any) => ({
          itemId:           l.itemId ?? '',
          description:      l.description,
          qty:              Number(l.qty),
          uom:              l.uom ?? '',
          unitPrice:        Number(l.unitPrice),
          discountPct:      Number(l.discountPct ?? 0),
          gstRate:          Number(l.gstRate ?? 0),
          tdsApplicable:    !!l.tdsApplicable,
          tdsRate:          Number(l.tdsRate ?? 0),
          rcmApplicable:    !!l.rcmApplicable,
          hsnCode:          l.hsnCode ?? '',
          sacCode:          l.sacCode ?? '',
          glCodeId:         l.glCodeId ?? '',
          costCentreId:     l.costCentreId ?? '',
          shipToLocationId: l.shipToLocationId ?? '',
          taxableAmount:    Number(l.lineTotal ?? 0),
          cgstAmount:       Number(l.cgstAmount ?? 0),
          sgstAmount:       Number(l.sgstAmount ?? 0),
          igstAmount:       Number(l.igstAmount ?? 0),
          tdsAmount:        Number(l.tdsAmount ?? 0),
          lineTotal:        Number(l.lineTotal ?? 0),
        })),
        milestones: (existing.milestones ?? []).map((m: any) => ({
          description:  m.description,
          pct:          Number(m.pct),
          amount:       Number(m.amount),
          triggerEvent: m.triggerEvent,
          dueDate:      m.dueDate ? String(m.dueDate).slice(0, 10) : '',
          isAdvance:    !!m.isAdvance,
        })),
      })
    }
  }, [existing, reset])

  // Resolve GST type when vendor + entity selected
  useEffect(() => {
    if (!vendorId || !entityId) {
      setGstType('')
      return
    }
    http.get<any>(`/api/po/gst-type?vendorId=${vendorId}&entityId=${entityId}`)
      .then(r => setGstType(r.gstType ?? ''))
      .catch(() => setGstType(''))
  }, [vendorId, entityId])

  // Recalc lines whenever gstType or taxType changes
  useEffect(() => {
    if (!gstType) return
    lines.forEach((l, i) => updateLine(i, calcLine(l as POLine, gstType, taxType)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstType, taxType])

  const recalc = (idx: number) => {
    const l = lines[idx]
    if (!l) return
    updateLine(idx, calcLine(l as POLine, gstType || 'INTERSTATE', taxType))
  }

  // Item auto-fill
  const handleItemChange = (idx: number, itemId: string) => {
    setValue(`lines.${idx}.itemId`, itemId)
    const item = (items as any[]).find(i => i.id === itemId)
    if (item) {
      setValue(`lines.${idx}.description`, item.name ?? item.description ?? '')
      setValue(`lines.${idx}.uom`,         item.uom ?? '')
      setValue(`lines.${idx}.gstRate`,     Number(item.gstRate ?? 0))
      setValue(`lines.${idx}.hsnCode`,     item.hsnCode ?? '')
      setValue(`lines.${idx}.sacCode`,     item.sacCode ?? '')
      setValue(`lines.${idx}.rcmApplicable`, !!item.rcmApplicable)
      setTimeout(() => recalc(idx), 0)
    }
  }

  // Auto-set milestone amount from %
  useEffect(() => {
    milestones.forEach((m, i) => {
      const expected = (totals.total * (Number(m.pct) || 0)) / 100
      if (Math.abs(expected - (Number(m.amount) || 0)) > 0.01) {
        setValue(`milestones.${i}.amount`, expected)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.total, milestones.map(m => m.pct).join(',')])

  // Budget check
  useEffect(() => {
    if (!entityId || totals.total <= 0) {
      setBudgetCheck(null)
      return
    }
    const t = setTimeout(() => {
      http.post<any>('/api/po/budget-check', {
        entityId, glCodeId: glCodeId || null, costCentreId: costCentreId || null, amount: totals.total,
      }).then(setBudgetCheck).catch(() => setBudgetCheck(null))
    }, 400)
    return () => clearTimeout(t)
  }, [entityId, glCodeId, costCentreId, totals.total])

  // ── Mutations ──
  const buildPayload = (data: POForm) => ({
    ...data,
    subtotal:   totals.subtotal,
    taxAmount:  totals.cgst + totals.sgst + totals.igst,
    tdsAmount:  totals.tds,
    totalAmount: totals.total,
    lines: (data.lines as POLine[]).map(l => {
      const calc = calcLine(l, gstType || 'INTERSTATE', data.taxType)
      return {
        ...calc,
        qty:         Number(calc.qty),
        unitPrice:   Number(calc.unitPrice),
        discountPct: Number(calc.discountPct ?? 0),
        gstRate:     Number(calc.gstRate ?? 0),
        tdsRate:     Number(calc.tdsRate ?? 0),
      }
    }),
    milestones: data.milestones.map(m => ({
      ...m, pct: Number(m.pct), amount: Number(m.amount),
    })),
  })

  const saveDraft = useMutation({
    mutationFn: (data: POForm) => {
      const payload = buildPayload(data)
      return isEdit ? http.put<any>(`/api/po/${id}`, payload) : http.post<any>('/api/po', payload)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['po-list'] })
      navigate(`/purchase-orders/${res.id ?? id}`)
    },
  })

  const submitForApproval = useMutation({
    mutationFn: async (data: POForm) => {
      const payload = buildPayload(data)
      const po = isEdit ? await http.put<any>(`/api/po/${id}`, payload) : await http.post<any>('/api/po', payload)
      await http.post(`/api/po/${po.id}/submit`, {})
      return po
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['po-list'] })
      navigate(`/purchase-orders/${res.id ?? id}`)
    },
  })

  if (isEdit && loadingPo) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  const isPending = saveDraft.isPending || submitForApproval.isPending
  const isHardBlock = budgetCheck?.status === 'HARD_BLOCK'
  const isServicePO = poType === 'SERVICE'
  const milestoneInvalid = isServicePO && milestones.length > 0 && Math.abs(milestonePctTotal - 100) > 0.01

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? `Edit ${existing?.poRef ?? 'PO'}` : 'New Purchase Order'}
        description="Issue PO against vendor — GST, TDS and milestones auto-calculated"
        backLabel="Purchase Orders"
        backTo="/purchase-orders"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/purchase-orders')}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
            <button type="button" disabled={isPending}
              onClick={handleSubmit(d => saveDraft.mutate(d))}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
              {saveDraft.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />}
              Save draft
            </button>
            <button type="button" disabled={isPending || isHardBlock || milestoneInvalid}
              onClick={handleSubmit(d => submitForApproval.mutate(d))}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Send className="h-3.5 w-3.5" />
              Submit for approval
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">

          {/* A. PO Identity */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="A" title="PO Identity" subtitle="Vendor, entity, dates and commercial terms" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="PO Ref">
                <AutoCodeField value={existing?.poRef} />
              </Field>
              <Field label="PO Type" required>
                <FormSelect {...register('poType')}>
                  {['STANDARD', 'BLANKET', 'RATE_CONTRACT', 'SERVICE'].map(t => <option key={t} value={t}>{t}</option>)}
                </FormSelect>
              </Field>
              <Field label="Vendor" required error={errors.vendorId?.message}>
                <FormSelect {...register('vendorId', { required: 'Vendor is required' })}>
                  <option value="">Select vendor…</option>
                  {(vendors as any[]).map(v => <option key={v.id} value={v.id}>{v.legalName} — {v.vendorCode}</option>)}
                </FormSelect>
              </Field>
              <Field label="Entity" required error={errors.entityId?.message}>
                <FormSelect {...register('entityId', { required: 'Entity is required' })}>
                  <option value="">Select entity…</option>
                  {(entities as any[]).map(e => <option key={e.id} value={e.id}>{e.name} — {e.code}</option>)}
                </FormSelect>
              </Field>
              <Field label="Ship to Location">
                <FormSelect {...register('shipToLocationId')}>
                  <option value="">—</option>
                  {(locations as any[]).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="PO Date" required>
                <FormInput type="date" {...register('poDate', { required: true })} />
              </Field>
              <Field label="PO Expiry Date">
                <FormInput type="date" {...register('poExpiryDate')} />
              </Field>
              <Field label="Auto-expire">
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" {...register('autoExpire')} className="h-4 w-4 rounded" />
                  <span className="text-sm text-muted-foreground">Auto-close PO after expiry date</span>
                </label>
              </Field>
              <Field label="Currency">
                <FormSelect {...register('currencyCode')}>
                  {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'].map(c => <option key={c}>{c}</option>)}
                </FormSelect>
              </Field>
              <Field label="Exchange Rate">
                <FormInput type="number" step="0.0001" placeholder="1.00"
                  {...register('exchangeRate', { valueAsNumber: true })} />
              </Field>
              <Field label="Payment Terms (days)">
                <FormInput type="number" min="0" {...register('paymentTermsDays', { valueAsNumber: true })} />
              </Field>
              <Field label="Payment Mode">
                <FormSelect {...register('paymentMode')}>
                  {['NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'CASH', 'CARD'].map(m => <option key={m}>{m}</option>)}
                </FormSelect>
              </Field>
              <Field label="Tax Type" span>
                <div className="flex items-center rounded-lg border border-input overflow-hidden w-fit">
                  {['EXCLUSIVE', 'INCLUSIVE'].map(t => (
                    <button key={t} type="button" onClick={() => setValue('taxType', t)}
                      className={cn('px-3 py-1.5 text-xs font-medium transition-colors',
                        taxType === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {taxType === 'INCLUSIVE' ? 'Unit price already includes GST — back-calculated' : 'GST added on top of unit price'}
                </p>
              </Field>
              <Field label="PR References" span>
                <FormSelect multiple {...register('prRefs')} className="min-h-[80px]">
                  {(openPRs as any[]).map(pr => <option key={pr.id} value={pr.id}>{pr.prRef} — {formatCurrency(pr.estimatedTotal)}</option>)}
                </FormSelect>
                <p className="text-xs text-muted-foreground">Hold Cmd/Ctrl to select multiple approved PRs</p>
              </Field>
              <Field label="Notes" span>
                <FormTextarea rows={2} placeholder="Special terms, delivery notes…" {...register('notes')} />
              </Field>
            </div>

            {gstType && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5">
                <Info className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-700">
                  {gstType === 'INTRASTATE'
                    ? 'Intrastate — CGST + SGST applies (same state)'
                    : 'Interstate — IGST applies (different state)'}
                </p>
              </div>
            )}
          </div>

          {/* B. PO Lines */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="B" title="PO Lines" subtitle="Items or services — auto-calculated GST, TDS and totals" />
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs min-w-[1400px]">
                <thead>
                  <tr className="border-b border-border">
                    {['#', 'Item', 'Description', 'Qty', 'UOM', 'Unit Price', 'Disc%', 'Taxable', 'GST%',
                      gstType === 'INTRASTATE' ? 'CGST' : 'IGST',
                      gstType === 'INTRASTATE' ? 'SGST' : '',
                      'TDS%', 'TDS', 'RCM', 'Total', 'GL', 'CC', ''].filter(Boolean).map(h => (
                      <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lineFields.map((field, i) => {
                    const l = (lines[i] ?? {}) as POLine
                    return (
                      <tr key={field.id} className="align-top">
                        <td className="px-2 py-2 pt-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-2 min-w-[140px]">
                          <FormSelect value={watch(`lines.${i}.itemId`) ?? ''}
                            onChange={e => handleItemChange(i, e.target.value)}>
                            <option value="">Select…</option>
                            {(items as any[]).map(it => <option key={it.id} value={it.id}>{it.itemCode} — {it.name}</option>)}
                          </FormSelect>
                        </td>
                        <td className="px-2 py-2 min-w-[160px]">
                          <FormInput placeholder="Description" {...register(`lines.${i}.description`)} />
                        </td>
                        <td className="px-2 py-2 w-20">
                          <FormInput type="number" step="0.01" min="0"
                            {...register(`lines.${i}.qty`, { valueAsNumber: true })}
                            onBlur={() => recalc(i)} />
                        </td>
                        <td className="px-2 py-2 w-16">
                          <FormInput placeholder="Nos" {...register(`lines.${i}.uom`)} />
                        </td>
                        <td className="px-2 py-2 w-24">
                          <FormInput type="number" step="0.01" min="0"
                            {...register(`lines.${i}.unitPrice`, { valueAsNumber: true })}
                            onBlur={() => recalc(i)} />
                        </td>
                        <td className="px-2 py-2 w-16">
                          <FormInput type="number" step="0.01" min="0" max="100"
                            {...register(`lines.${i}.discountPct`, { valueAsNumber: true })}
                            onBlur={() => recalc(i)} />
                        </td>
                        <td className="px-2 py-2 w-24 pt-3 font-mono tabular-nums text-right">
                          {formatCurrency(l.taxableAmount)}
                        </td>
                        <td className="px-2 py-2 w-16">
                          <FormInput type="number" step="0.01" min="0" max="100"
                            {...register(`lines.${i}.gstRate`, { valueAsNumber: true })}
                            onBlur={() => recalc(i)} />
                        </td>
                        {gstType === 'INTRASTATE' ? (
                          <>
                            <td className="px-2 py-2 w-24 pt-3 font-mono tabular-nums text-right">{formatCurrency(l.cgstAmount)}</td>
                            <td className="px-2 py-2 w-24 pt-3 font-mono tabular-nums text-right">{formatCurrency(l.sgstAmount)}</td>
                          </>
                        ) : (
                          <td className="px-2 py-2 w-24 pt-3 font-mono tabular-nums text-right">{formatCurrency(l.igstAmount)}</td>
                        )}
                        <td className="px-2 py-2 w-16">
                          <FormInput type="number" step="0.01" min="0" max="100"
                            {...register(`lines.${i}.tdsRate`, { valueAsNumber: true })}
                            onBlur={() => {
                              setValue(`lines.${i}.tdsApplicable`, (Number(watch(`lines.${i}.tdsRate`)) || 0) > 0)
                              recalc(i)
                            }} />
                        </td>
                        <td className="px-2 py-2 w-24 pt-3 font-mono tabular-nums text-right text-amber-600">
                          {formatCurrency(l.tdsAmount)}
                        </td>
                        <td className="px-2 py-2 w-12 pt-3">
                          <input type="checkbox" {...register(`lines.${i}.rcmApplicable`)} className="h-4 w-4 rounded" />
                        </td>
                        <td className="px-2 py-2 w-28 pt-3 font-mono tabular-nums text-right font-semibold">
                          {formatCurrency(l.lineTotal)}
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <FormSelect {...register(`lines.${i}.glCodeId`)}>
                            <option value="">—</option>
                            {(glCodes as any[]).map(g => <option key={g.id} value={g.id}>{g.code}</option>)}
                          </FormSelect>
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <FormSelect {...register(`lines.${i}.costCentreId`)}>
                            <option value="">—</option>
                            {(costCentres as any[]).map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                          </FormSelect>
                        </td>
                        <td className="px-2 py-2 pt-3">
                          <button type="button" onClick={() => removeLine(i)} disabled={lineFields.length === 1}
                            className="text-muted-foreground hover:text-destructive disabled:opacity-30">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => appendLine(emptyLine())}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-input px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40">
              <Plus className="h-3.5 w-3.5" /> Add line
            </button>
          </div>

          {/* C. Milestones (SERVICE only) */}
          {isServicePO && (
            <div className="rounded-xl border border-border bg-card p-6">
              <SectionHeader letter="C" title="Payment Milestones" subtitle="Split payment by milestone — total must equal 100%" />
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border">
                      {['#', 'Description', '%', 'Amount', 'Trigger', 'Due Date', 'Advance', ''].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {msFields.map((field, i) => {
                      const m = milestones[i] ?? {} as Milestone
                      return (
                        <tr key={field.id} className="align-top">
                          <td className="px-2 py-2 pt-3 text-muted-foreground">{i + 1}</td>
                          <td className="px-2 py-2 min-w-[200px]">
                            <FormInput placeholder="Description" {...register(`milestones.${i}.description`)} />
                          </td>
                          <td className="px-2 py-2 w-20">
                            <FormInput type="number" step="0.01" min="0" max="100"
                              {...register(`milestones.${i}.pct`, { valueAsNumber: true })} />
                          </td>
                          <td className="px-2 py-2 w-28 pt-3 font-mono tabular-nums text-right">
                            {formatCurrency(m.amount)}
                          </td>
                          <td className="px-2 py-2 min-w-[140px]">
                            <FormSelect {...register(`milestones.${i}.triggerEvent`)}>
                              {['ON_PO_ISSUE', 'ON_GRN', 'ON_INVOICE', 'ON_DATE', 'ON_DELIVERY'].map(t => <option key={t} value={t}>{t}</option>)}
                            </FormSelect>
                          </td>
                          <td className="px-2 py-2 w-32">
                            <FormInput type="date" {...register(`milestones.${i}.dueDate`)} />
                          </td>
                          <td className="px-2 py-2 w-16 pt-3">
                            <input type="checkbox" {...register(`milestones.${i}.isAdvance`)} className="h-4 w-4 rounded" />
                          </td>
                          <td className="px-2 py-2 pt-3">
                            <button type="button" onClick={() => removeMs(i)}
                              className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button type="button" onClick={() => appendMs(emptyMilestone())}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-input px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40">
                  <Plus className="h-3.5 w-3.5" /> Add milestone
                </button>
                <p className={cn('text-xs font-medium', milestoneInvalid ? 'text-destructive' : 'text-muted-foreground')}>
                  Total: {milestonePctTotal.toFixed(2)}% {milestoneInvalid && '— must equal 100%'}
                </p>
              </div>
            </div>
          )}

          {/* D. Budget Check */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter={isServicePO ? 'D' : 'C'} title="Budget Check" subtitle="Live availability against entity GL allocation" />
            <div className="grid grid-cols-2 gap-4 mb-3">
              <Field label="GL Code (for budget)">
                <FormSelect {...register('glCodeId')}>
                  <option value="">—</option>
                  {(glCodes as any[]).map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Cost Centre (for budget)">
                <FormSelect {...register('costCentreId')}>
                  <option value="">—</option>
                  {(costCentres as any[]).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </FormSelect>
              </Field>
            </div>
            {!budgetCheck ? (
              <p className="text-xs text-muted-foreground">Select entity, GL code and line amounts to run a budget check.</p>
            ) : budgetCheck.status === 'OK' ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-700">Available · {formatCurrency(budgetCheck.available)} budget remaining</p>
              </div>
            ) : budgetCheck.status === 'WARNING' ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-700">Warning · within tolerance zone, only {formatCurrency(budgetCheck.available)} remaining</p>
              </div>
            ) : budgetCheck.status === 'HARD_BLOCK' ? (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700 font-medium">Budget exhausted — exceptional approval required</p>
                  <p className="text-xs text-red-600 mt-0.5">Only {formatCurrency(budgetCheck.available)} available. Submission disabled until budget is revised.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm text-muted-foreground">No budget configured for this entity + GL combination</p>
              </div>
            )}
          </div>

          {/* E. Tax Summary */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter={isServicePO ? 'E' : 'D'} title="Tax Summary" subtitle="Read-only — derived from lines" />
            <div className="space-y-1.5 text-sm">
              <Row label="Subtotal"        value={totals.subtotal} />
              <Row label="Discount"        value={-totals.discount} />
              <Row label="Taxable amount"  value={totals.taxable} />
              {gstType === 'INTRASTATE' ? (
                <>
                  <Row label="CGST" value={totals.cgst} />
                  <Row label="SGST" value={totals.sgst} />
                </>
              ) : (
                <Row label="IGST" value={totals.igst} />
              )}
              <Row label="TDS" value={-totals.tds} className="text-amber-600" />
              <div className="pt-2 mt-2 border-t border-border">
                <Row label="Total" value={totals.total} bold />
                <Row label="Net Payable" value={totals.total} bold />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, className }: { label: string; value: number; bold?: boolean; className?: string }) {
  return (
    <div className={cn('flex justify-between', bold && 'font-semibold text-base', className)}>
      <span className={cn(!bold && 'text-muted-foreground')}>{label}</span>
      <span className="font-mono tabular-nums">{formatCurrency(value)}</span>
    </div>
  )
}
