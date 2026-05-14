import { useNavigate } from 'react-router-dom'
import { OcrUploader } from '../../components/shared/OcrUploader'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { useState, useCallback } from 'react'
import { invoiceFormSchema, type InvoiceFormInput } from '../../../shared/schemas/invoice.schema'
import { useCreateInvoice } from '../../lib/api/invoices.api'
import { useMasterData } from '../../hooks/useMasterData'
import { formatINR } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Inp({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50', className)} {...p} />
}

function Sel({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring', className)} {...p} />
}

function Section({ letter, title, subtitle, children }: { letter: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2 border-b border-border pb-2">
        <span className="text-sm font-semibold text-muted-foreground">{letter}.</span>
        <div><p className="text-sm font-semibold">{title}</p>{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}</div>
      </div>
      {children}
    </div>
  )
}

export default function InvoiceNewPage() {
  const navigate      = useNavigate()
  const createInvoice = useCreateInvoice()
  const masters       = useMasterData()
  const [dupeWarning, setDupeWarning] = useState<string | null>(null)

  const { register, control, handleSubmit, watch, formState: { errors } } =
    useForm<InvoiceFormInput>({
      resolver: zodResolver(invoiceFormSchema),
      defaultValues: { currency: 'INR', lines: [{ lineNumber: 1, description: '', quantity: 1, unitPrice: 0, isRcm: false }] },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const lines     = watch('lines') ?? []
  const vendorId  = watch('vendorId')
  const invNumber = watch('invoiceNumber')

  // Live totals
  const totals = lines.reduce((acc, l) => {
    const tc      = masters.taxCodes.find(t => t.id === l.taxCodeId)
    const amount  = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0)
    const tax     = tc ? amount * (Number(tc.cgstRate) + Number(tc.sgstRate)) / 100 : 0
    acc.subtotal  += amount
    acc.taxAmount += tax
    return acc
  }, { subtotal: 0, taxAmount: 0 })

  const netPayable = totals.subtotal + totals.taxAmount

  // Dedupe check on blur — server does the hard block
  const checkDedupe = useCallback(() => {
    if (!vendorId || !invNumber) return
    setDupeWarning(null)
  }, [vendorId, invNumber])

  async function onSubmit(data: InvoiceFormInput) {
    setDupeWarning(null)
    try {
      const res = await createInvoice.mutateAsync(data)
      navigate(`/invoices/${res.id}`)
    } catch (e: any) {
      if (e?.error?.code === 'DUPLICATE_RECORD') {
        setDupeWarning(`Invoice number ${data.invoiceNumber} already exists for this vendor.`)
      }
    }
  }

  const err = (path: string) => {
    const parts = path.split('.')
    let obj: any = errors
    for (const p of parts) obj = obj?.[p]
    return obj?.message as string | undefined
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">New invoice</h1>
          <p className="text-xs text-muted-foreground">All amounts in INR · GST calculated automatically</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
          <button form="inv-form" type="submit" disabled={createInvoice.isPending}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {createInvoice.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {createInvoice.isPending ? 'Saving…' : 'Save draft'}
          </button>
        </div>
      </div>

      {dupeWarning && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {dupeWarning}
        </div>
      )}

      {/* OCR Upload */}
      <OcrUploader
        onIngested={(result) => {
          // Navigate to the created invoice detail page
          navigate(`/invoices/${result.invoiceId}`)
        }}
      />

      <form id="inv-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* A. Invoice header */}
        <Section letter="A" title="Invoice details" subtitle="Header information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Vendor *" error={err('vendorId')}>
              <Sel {...register('vendorId')}>
                <option value="">Select vendor…</option>
                {masters.vendors.map(v => <option key={v.id} value={v.id}>{v.legalName} — {v.vendorCode}</option>)}
              </Sel>
            </Field>
            <Field label="Invoice number *" error={err('invoiceNumber')}>
              <Inp placeholder="INV-2024-001" {...register('invoiceNumber')} onBlur={checkDedupe} />
            </Field>
            <Field label="Invoice date *" error={err('invoiceDate')}>
              <Inp type="date" {...register('invoiceDate')} />
            </Field>
            <Field label="Due date" error={err('dueDate')}>
              <Inp type="date" {...register('dueDate')} />
            </Field>
            <Field label="Currency">
              <Sel {...register('currency')}>
                {['INR','USD','EUR','GBP','AED'].map(c => <option key={c}>{c}</option>)}
              </Sel>
            </Field>
            <Field label="GL code">
              <Sel {...register('glCodeId')}>
                <option value="">Select GL code…</option>
                {masters.glCodes.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
              </Sel>
            </Field>
            <Field label="Cost centre">
              <Sel {...register('costCentreId')}>
                <option value="">Select cost centre…</option>
                {masters.costCentres.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </Sel>
            </Field>
            <Field label="Department">
              <Sel {...register('departmentId')}>
                <option value="">Select department…</option>
                {masters.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Sel>
            </Field>
          </div>
          <Field label="Narration / remarks">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-none"
              rows={2} placeholder="Internal notes…" {...register('narration')}
            />
          </Field>
        </Section>

        {/* B. Line items */}
        <Section letter="B" title="Line items" subtitle="Add one row per product or service">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground w-6">#</th>
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Description *</th>
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground w-20">Qty *</th>
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground w-28">Unit price *</th>
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground w-28">Tax code</th>
                  <th className="pb-2 text-right text-xs font-medium text-muted-foreground w-28">Amount</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fields.map((field, i) => {
                  const qty   = Number(watch(`lines.${i}.quantity`)) || 0
                  const price = Number(watch(`lines.${i}.unitPrice`)) || 0
                  const amt   = qty * price
                  return (
                    <tr key={field.id}>
                      <td className="py-2 pr-2 text-xs text-muted-foreground align-top pt-3">{i + 1}</td>
                      <td className="py-2 pr-2">
                        <Inp placeholder="Description" {...register(`lines.${i}.description`)} />
                        {err(`lines.${i}.description`) && <p className="text-xs text-destructive mt-0.5">{err(`lines.${i}.description`)}</p>}
                      </td>
                      <td className="py-2 pr-2">
                        <Inp type="number" step="0.001" min="0" placeholder="1" {...register(`lines.${i}.quantity`)} />
                      </td>
                      <td className="py-2 pr-2">
                        <Inp type="number" step="0.01" min="0" placeholder="0.00" {...register(`lines.${i}.unitPrice`)} />
                      </td>
                      <td className="py-2 pr-2">
                        <Sel {...register(`lines.${i}.taxCodeId`)}>
                          <option value="">None</option>
                          {masters.taxCodes.map(t => <option key={t.id} value={t.id}>{t.code}</option>)}
                        </Sel>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums font-medium align-top pt-3 text-sm">
                        {formatINR(amt)}
                      </td>
                      <td className="py-2 align-top pt-2.5">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
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

          <button
            type="button"
            onClick={() => append({ lineNumber: fields.length + 1, description: '', quantity: 1, unitPrice: 0, isRcm: false })}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add line
          </button>

          {err('lines') && <p className="text-xs text-destructive">{err('lines')}</p>}
        </Section>

        {/* C. Totals */}
        <Section letter="C" title="Totals" subtitle="Auto-calculated from line items">
          <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatINR(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST</span>
              <span className="tabular-nums">{formatINR(totals.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Net payable</span>
              <span className="tabular-nums">{formatINR(netPayable)}</span>
            </div>
          </div>
        </Section>

      </form>
    </div>
  )
}
