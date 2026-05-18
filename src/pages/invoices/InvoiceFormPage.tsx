import { useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Loader2, Upload, FileText, AlertTriangle, Send } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterPageHeader, FormInput, FormSelect, FormTextarea } from '../../components/masters/MasterFormLayout'
import { formatCurrency } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

// ── Types ──

interface LineItem {
  itemId?:        string
  itemCode?:      string
  description:    string
  quantity:       number
  uom?:           string
  unitPrice:      number
  discountPct?:   number
  discountAmount: number
  taxableAmount:  number
  gstRate?:       number
  cgstAmount:     number
  sgstAmount:     number
  igstAmount:     number
  tdsRate?:       number
  tdsAmount:      number
  rcmApplicable:  boolean
  hsnCode?:       string
  sacCode?:       string
  glCodeId?:      string
  costCentreId?:  string
  profitCentreId?: string
  lineTotal:      number
}

interface FormValues {
  vendorId:     string
  entityId:     string
  invoiceNumber: string
  invoiceDate:  string
  dueDate?:     string
  channelType:  string
  currencyCode: string
  poRef?:       string
  irnNumber?:   string
  notes?:       string
  lines:        LineItem[]
}

// ── Auto-calc helpers ──

function recalcLine(line: LineItem, vendorState: string, entityState: string): LineItem {
  const qty        = Number(line.quantity)    || 0
  const unitPrice  = Number(line.unitPrice)   || 0
  const discPct    = Number(line.discountPct) || 0
  const gstRate    = Number(line.gstRate)     || 0
  const tdsRate    = Number(line.tdsRate)     || 0

  const lineBase      = qty * unitPrice
  const discountAmt   = (lineBase * discPct) / 100
  const taxableAmt    = lineBase - discountAmt
  const gstAmt        = (taxableAmt * gstRate) / 100
  const tdsAmt        = (taxableAmt * tdsRate) / 100
  const isInterstate  = vendorState && entityState && vendorState !== entityState
  const cgst          = isInterstate ? 0 : gstAmt / 2
  const sgst          = isInterstate ? 0 : gstAmt / 2
  const igst          = isInterstate ? gstAmt : 0
  const total         = taxableAmt + gstAmt - tdsAmt

  return { ...line, discountAmount: discountAmt, taxableAmount: taxableAmt, cgstAmount: cgst, sgstAmount: sgst, igstAmount: igst, tdsAmount: tdsAmt, lineTotal: total }
}

function recalcTotals(lines: LineItem[]) {
  return {
    subtotal:       lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0),
    discountAmount: lines.reduce((s, l) => s + Number(l.discountAmount), 0),
    taxableAmount:  lines.reduce((s, l) => s + Number(l.taxableAmount), 0),
    cgstAmount:     lines.reduce((s, l) => s + Number(l.cgstAmount), 0),
    sgstAmount:     lines.reduce((s, l) => s + Number(l.sgstAmount), 0),
    igstAmount:     lines.reduce((s, l) => s + Number(l.igstAmount), 0),
    tdsAmount:      lines.reduce((s, l) => s + Number(l.tdsAmount), 0),
    totalAmount:    lines.reduce((s, l) => s + Number(l.lineTotal), 0),
    netPayable:     lines.reduce((s, l) => s + Number(l.lineTotal), 0),
  }
}

const emptyLine = (): LineItem => ({
  description: '', quantity: 1, unitPrice: 0, discountPct: 0,
  discountAmount: 0, taxableAmount: 0, gstRate: 0,
  cgstAmount: 0, sgstAmount: 0, igstAmount: 0, tdsRate: 0,
  tdsAmount: 0, rcmApplicable: false, lineTotal: 0,
})

// ── Sub-components ──

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

// ── OCR Upload section ──

function OcrUploadSection({ onExtracted }: { onExtracted: (data: any) => void }) {
  const [file, setFile]         = useState<File | null>(null)
  const [isDragOver, setDragOver] = useState(false)
  const [isExtracting, setExtracting] = useState(false)
  const [confidence, setConfidence]   = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(f.type)) return
    setFile(f)
    setConfidence(null)
  }

  const extract = async () => {
    if (!file) return
    setExtracting(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Data = (e.target?.result as string).split(',')[1]
        const result = await http.post<any>('/api/invoices/ingest', {
          base64Data, mimeType: file.type, fileName: file.name, channelType: 'MANUAL_UPLOAD',
        })
        setConfidence(result.score ?? null)
        onExtracted(result)
      }
      reader.readAsDataURL(file)
    } catch {
      // OCR failed — user proceeds manually
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => inputRef.current?.click()}
        className={cn('flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 cursor-pointer transition-colors',
          isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30')}
      >
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {file ? (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-medium">{file.name}</span>
            <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Drop invoice PDF or image here</p>
            <p className="text-xs text-muted-foreground mt-0.5">PDF · PNG · JPG up to 10 MB</p>
          </>
        )}
      </div>

      {file && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={extract} disabled={isExtracting}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {isExtracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {isExtracting ? 'Extracting…' : 'Extract with OCR'}
          </button>
          {confidence !== null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">OCR confidence</span>
              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={cn('h-full rounded-full', confidence >= 80 ? 'bg-green-500' : confidence >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                  style={{ width: `${confidence}%` }} />
              </div>
              <span className={cn('font-medium', confidence >= 80 ? 'text-green-600' : confidence >= 60 ? 'text-amber-600' : 'text-red-600')}>
                {confidence}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main form ──

export default function InvoiceFormPage() {
  const navigate     = useNavigate()
  const { id }       = useParams<{ id: string }>()
  const isEdit       = !!id
  const qc           = useQueryClient()
  const [dupeWarn, setDupeWarn] = useState<string | null>(null)
  const [vendorState, setVendorState] = useState('')
  const [entityState, setEntityState] = useState('')

  // ── Load existing invoice on edit ──
  const { isLoading: loadingInv } = useQuery({
    queryKey: ['invoices', id],
    queryFn:  () => http.get<any>(`/api/invoices/${id}`),
    enabled:  isEdit,
    staleTime: 0,
  })

  // ── API data ──
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-list'],
    queryFn:  () => http.get<any>('/api/masters/vendors').then((r: any) => Array.isArray(r) ? r : r?.data ?? []),
    staleTime: 5 * 60_000,
  })
  const { data: entities = [] } = useQuery({
    queryKey: ['entities-list'],
    queryFn:  () => http.get<any>('/api/masters/entities').then((r: any) => Array.isArray(r) ? r : r?.data ?? []),
    staleTime: 5 * 60_000,
  })
  const { data: glCodes = [] } = useQuery({
    queryKey: ['gl-codes-list'],
    queryFn:  () => http.get<any>('/api/masters/gl-codes').then((r: any) => Array.isArray(r) ? r : r?.data ?? []),
    staleTime: 5 * 60_000,
  })
  const { data: costCentres = [] } = useQuery({
    queryKey: ['cost-centres-list'],
    queryFn:  () => http.get<any>('/api/masters/cost-centres').then((r: any) => Array.isArray(r) ? r : r?.data ?? []),
    staleTime: 5 * 60_000,
  })

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        channelType: 'MANUAL_UPLOAD',
        currencyCode: 'INR',
        lines: [emptyLine()],
      },
    })

  const { fields, append, remove, update } = useFieldArray({ control, name: 'lines' })
  const lines       = useWatch({ control, name: 'lines' }) ?? []
  const vendorId    = useWatch({ control, name: 'vendorId' })
  const invNumber   = useWatch({ control, name: 'invoiceNumber' })
  const currencyCode = useWatch({ control, name: 'currencyCode' }) || 'INR'

  const totals = recalcTotals(lines)

  // Update vendor state when vendor changes
  const handleVendorChange = useCallback((vid: string) => {
    setValue('vendorId', vid)
    const v = (vendors as any[]).find((x: any) => x.id === vid)
    setVendorState(v?.stateCode ?? v?.state ?? '')
  }, [vendors, setValue])

  // Update entity state when entity changes
  const handleEntityChange = useCallback((eid: string) => {
    setValue('entityId', eid)
    const e = (entities as any[]).find((x: any) => x.id === eid)
    setEntityState(e?.state ?? '')
  }, [entities, setValue])

  // Recalc a line when qty/price/rates change
  const recalc = useCallback((idx: number) => {
    const l = lines[idx]
    if (!l) return
    update(idx, recalcLine(l as LineItem, vendorState, entityState))
  }, [lines, vendorState, entityState, update])

  // ── Mutations ──
  const saveDraft = useMutation({
    mutationFn: (data: FormValues) => {
      const payload = { ...data, ...totals }
      return isEdit
        ? http.put<any>(`/api/invoices/${id}`, payload)
        : http.post<any>('/api/invoices', payload)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/invoices/${res.id ?? id}`)
    },
  })

  const submitForApproval = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = { ...data, ...totals }
      const inv = isEdit
        ? await http.put<any>(`/api/invoices/${id}`, payload)
        : await http.post<any>('/api/invoices', payload)
      await http.post(`/api/invoices/${inv.id}/submit`, {})
      return inv
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/invoices/${res.id ?? id}`)
    },
  })

  const checkDedupe = useCallback(() => {
    if (!vendorId || !invNumber) return
    setDupeWarn(null)
  }, [vendorId, invNumber])

  if (isEdit && loadingInv) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  const isPending = saveDraft.isPending || submitForApproval.isPending

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? 'Edit Invoice' : 'New Invoice'}
        description="AP Invoice — OCR · GST auto-calc · 3-way match"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/invoices')}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">
              Cancel
            </button>
            <button type="button" disabled={isPending}
              onClick={handleSubmit(d => saveDraft.mutate(d))}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
              {saveDraft.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : null}
              Save draft
            </button>
            <button type="button" disabled={isPending}
              onClick={handleSubmit(d => submitForApproval.mutate(d))}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Send className="h-3.5 w-3.5" />
              Submit for approval
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-8">

          {dupeWarn && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {dupeWarn}
            </div>
          )}

          {/* A. Invoice Header */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="A" title="Invoice Header" subtitle="Core invoice identifiers and dates" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vendor" required error={errors.vendorId?.message}>
                <FormSelect value={watch('vendorId') ?? ''} onChange={e => handleVendorChange(e.target.value)}>
                  <option value="">Select vendor…</option>
                  {(vendors as any[]).map((v: any) => (
                    <option key={v.id} value={v.id}>{v.legalName} — {v.vendorCode}</option>
                  ))}
                </FormSelect>
              </Field>
              <Field label="Entity" required error={errors.entityId?.message}>
                <FormSelect value={watch('entityId') ?? ''} onChange={e => handleEntityChange(e.target.value)}>
                  <option value="">Select entity…</option>
                  {(entities as any[]).map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name} — {e.code}</option>
                  ))}
                </FormSelect>
              </Field>
              <Field label="Invoice number" required error={errors.invoiceNumber?.message}>
                <FormInput placeholder="INV-2025-001" {...register('invoiceNumber')} onBlur={checkDedupe} />
              </Field>
              <Field label="Invoice date" required>
                <FormInput type="date" {...register('invoiceDate')} />
              </Field>
              <Field label="Due date">
                <FormInput type="date" {...register('dueDate')} />
              </Field>
              <Field label="Channel">
                <FormSelect {...register('channelType')}>
                  {['MANUAL_UPLOAD','EMAIL','VENDOR_PORTAL','API'].map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
                </FormSelect>
              </Field>
              <Field label="Currency">
                <FormSelect {...register('currencyCode')}>
                  {['INR','USD','EUR','GBP','AED','SGD'].map(c => <option key={c}>{c}</option>)}
                </FormSelect>
              </Field>
              <Field label="PO reference">
                <FormInput placeholder="PO-2025-0001" {...register('poRef')} />
              </Field>
              <Field label="IRN (e-Invoice)" span>
                <FormInput placeholder="e-Invoice IRN — auto-populated from OCR" {...register('irnNumber')} />
              </Field>
              <Field label="Notes" span>
                <FormTextarea rows={2} placeholder="Internal notes / narration…" {...register('notes')} />
              </Field>
            </div>
          </div>

          {/* B. OCR Upload */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="B" title="OCR Upload" subtitle="Upload invoice PDF or image — fields auto-fill from extraction" />
            <OcrUploadSection onExtracted={(result) => {
              if (result.invoiceId) navigate(`/invoices/${result.invoiceId}`)
            }} />
          </div>

          {/* C. Invoice Lines */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="C" title="Invoice Lines" subtitle="One row per product or service — GST auto-calculated" />
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-border">
                    {['#','Description','Qty','UOM','Unit Price','Disc%','Taxable','GST%','CGST','SGST','IGST','TDS%','TDS','RCM','GL','CC','Total',''].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fields.map((field, i) => {
                    const l = lines[i] ?? {}
                    return (
                      <tr key={field.id} className="align-top">
                        <td className="px-2 py-2 pt-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-2 min-w-[160px]">
                          <FormInput placeholder="Description" {...register(`lines.${i}.description`)}
                            onBlur={() => recalc(i)} />
                        </td>
                        <td className="px-2 py-2 w-16">
                          <FormInput type="number" step="0.0001" min="0" placeholder="1"
                            {...register(`lines.${i}.quantity`, { valueAsNumber: true })}
                            onBlur={() => recalc(i)} />
                        </td>
                        <td className="px-2 py-2 w-16">
                          <FormInput placeholder="Nos" {...register(`lines.${i}.uom`)} />
                        </td>
                        <td className="px-2 py-2 w-24">
                          <FormInput type="number" step="0.01" min="0" placeholder="0.00"
                            {...register(`lines.${i}.unitPrice`, { valueAsNumber: true })}
                            onBlur={() => recalc(i)} />
                        </td>
                        <td className="px-2 py-2 w-16">
                          <FormInput type="number" step="0.01" min="0" max="100" placeholder="0"
                            {...register(`lines.${i}.discountPct`, { valueAsNumber: true })}
                            onBlur={() => recalc(i)} />
                        </td>
                        <td className="px-2 py-2 w-24 pt-3 tabular-nums font-mono text-right">
                          {formatCurrency(l.taxableAmount, currencyCode)}
                        </td>
                        <td className="px-2 py-2 w-16">
                          <FormInput type="number" step="0.01" min="0" placeholder="18"
                            {...register(`lines.${i}.gstRate`, { valueAsNumber: true })}
                            onBlur={() => recalc(i)} />
                        </td>
                        <td className="px-2 py-2 w-20 pt-3 tabular-nums font-mono text-right text-green-700">
                          {formatCurrency(l.cgstAmount, currencyCode)}
                        </td>
                        <td className="px-2 py-2 w-20 pt-3 tabular-nums font-mono text-right text-green-700">
                          {formatCurrency(l.sgstAmount, currencyCode)}
                        </td>
                        <td className="px-2 py-2 w-20 pt-3 tabular-nums font-mono text-right text-blue-700">
                          {formatCurrency(l.igstAmount, currencyCode)}
                        </td>
                        <td className="px-2 py-2 w-16">
                          <FormInput type="number" step="0.01" min="0" placeholder="10"
                            {...register(`lines.${i}.tdsRate`, { valueAsNumber: true })}
                            onBlur={() => recalc(i)} />
                        </td>
                        <td className="px-2 py-2 w-20 pt-3 tabular-nums font-mono text-right text-amber-600">
                          {formatCurrency(l.tdsAmount, currencyCode)}
                        </td>
                        <td className="px-2 py-2 w-12 pt-3 text-center">
                          <input type="checkbox" {...register(`lines.${i}.rcmApplicable`)}
                            className="rounded border-input" />
                        </td>
                        <td className="px-2 py-2 w-28">
                          <FormSelect {...register(`lines.${i}.glCodeId`)}>
                            <option value="">GL…</option>
                            {(glCodes as any[]).map((g: any) => <option key={g.id} value={g.id}>{g.code}</option>)}
                          </FormSelect>
                        </td>
                        <td className="px-2 py-2 w-28">
                          <FormSelect {...register(`lines.${i}.costCentreId`)}>
                            <option value="">CC…</option>
                            {(costCentres as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
                          </FormSelect>
                        </td>
                        <td className="px-2 py-2 w-24 pt-3 tabular-nums font-mono text-right font-semibold">
                          {formatCurrency(l.lineTotal, currencyCode)}
                        </td>
                        <td className="px-2 py-2 pt-3">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(i)}
                              className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => append(emptyLine())}
              className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add line
            </button>
          </div>

          {/* D. Tax Summary */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="D" title="Tax Summary" subtitle="Auto-calculated from line items" />
            <div className="ml-auto max-w-sm space-y-2 text-sm">
              {[
                { label: 'Subtotal',         value: totals.subtotal },
                { label: 'Discount',          value: -totals.discountAmount, className: 'text-muted-foreground' },
                { label: 'Taxable amount',    value: totals.taxableAmount },
                { label: 'CGST',              value: totals.cgstAmount, className: 'text-green-700' },
                { label: 'SGST',              value: totals.sgstAmount, className: 'text-green-700' },
                { label: 'IGST',              value: totals.igstAmount, className: 'text-blue-700' },
                { label: 'TDS deducted',      value: -totals.tdsAmount, className: 'text-amber-600' },
                { label: 'Total',             value: totals.totalAmount, bold: true },
                { label: 'Net payable',       value: totals.netPayable, bold: true },
              ].map(row => (
                <div key={row.label} className={cn('flex justify-between', row.bold && 'border-t border-border pt-2 font-semibold', row.className)}>
                  <span>{row.label}</span>
                  <span className="tabular-nums font-mono">{formatCurrency(Math.abs(row.value), currencyCode)}</span>
                </div>
              ))}
              {totals.igstAmount === 0 && totals.cgstAmount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Intrastate supply — CGST + SGST applied</p>
              )}
              {totals.igstAmount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Interstate supply — IGST applied</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
