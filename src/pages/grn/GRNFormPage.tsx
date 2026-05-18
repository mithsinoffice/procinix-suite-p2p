import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Send, AlertTriangle } from 'lucide-react'
import { http } from '../../lib/http'
import {
  MasterPageHeader, FormInput, FormSelect, AutoCodeField,
} from '../../components/masters/MasterFormLayout'
import { cn } from '../../lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface GRNLine {
  poLineId:        string
  itemId?:         string
  description:     string
  orderedQty:      number
  previouslyReceived: number
  pendingQty:      number
  receivedQty:     number
  acceptedQty:     number
  rejectedQty:     number
  rejectionReason?: string
  batchNo?:        string
  qualityStatus:   string
}

interface GRNForm {
  poId:             string
  vendorId:         string
  grnDate:          string
  deliveryLocation?: string
  vehicleNo?:       string
  lrNumber?:        string
  deliveryNote?:    string
  lines:            GRNLine[]
}

// ── Sub ────────────────────────────────────────────────────────────────────────

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

export default function GRNFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const isEdit   = !!id
  const qc       = useQueryClient()

  // Open POs (APPROVED, SENT, PARTIAL_GRN)
  const { data: openPOs = [] } = useQuery({
    queryKey: ['po-open'],
    queryFn: async () => {
      const [a, s, p] = await Promise.all([
        http.get<any>('/api/po?status=APPROVED').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
        http.get<any>('/api/po?status=SENT').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
        http.get<any>('/api/po?status=PARTIAL_GRN').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
      ])
      return [...a, ...s, ...p]
    },
    staleTime: 60_000,
  })

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-lookup'],
    queryFn:  () => http.get<any>('/api/masters/vendors').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: locations = [] } = useQuery({
    queryKey: ['locations-lookup'],
    queryFn:  () => http.get<any>('/api/masters/locations').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const vendorMap = Object.fromEntries((vendors as any[]).map(v => [v.id, v]))

  const { data: existing, isLoading: loadingGrn } = useQuery({
    queryKey: ['grn', id],
    queryFn:  () => http.get<any>(`/api/grn/${id}`),
    enabled:  isEdit,
    staleTime: 0,
  })

  const { register, control, handleSubmit, reset, setValue, watch } =
    useForm<GRNForm>({
      defaultValues: { lines: [] },
    })

  const { fields, replace } = useFieldArray({ control, name: 'lines' })
  const lines = useWatch({ control, name: 'lines' }) ?? []
  const poId  = useWatch({ control, name: 'poId' })

  // Hydrate on edit
  useEffect(() => {
    if (existing) {
      reset({
        poId:             existing.poId,
        vendorId:         existing.vendorId,
        grnDate:          existing.grnDate ? String(existing.grnDate).slice(0, 10) : '',
        deliveryLocation: existing.deliveryLocation ?? '',
        vehicleNo:        existing.vehicleNo ?? '',
        lrNumber:         existing.lrNumber ?? '',
        deliveryNote:     existing.deliveryNote ?? '',
        lines: (existing.lines ?? []).map((l: any) => ({
          poLineId:           l.poLineId,
          itemId:             l.itemId ?? '',
          description:        l.description,
          orderedQty:         Number(l.orderedQty),
          previouslyReceived: 0,
          pendingQty:         Number(l.orderedQty) - Number(l.receivedQty),
          receivedQty:        Number(l.receivedQty),
          acceptedQty:        Number(l.acceptedQty),
          rejectedQty:        Number(l.rejectedQty ?? 0),
          rejectionReason:    l.rejectionReason ?? '',
          batchNo:            l.batchNo ?? '',
          qualityStatus:      l.qualityStatus ?? 'PENDING',
        })),
      })
    }
  }, [existing, reset])

  // Auto-load PO lines on PO select
  useEffect(() => {
    if (!poId || isEdit) return
    http.get<any>(`/api/po/${poId}`).then((po: any) => {
      setValue('vendorId', po.vendorId)
      const grnLines: GRNLine[] = (po.lines ?? []).map((l: any) => ({
        poLineId:           l.id,
        itemId:             l.itemId ?? '',
        description:        l.description,
        orderedQty:         Number(l.qty),
        previouslyReceived: Number(l.grnQty ?? 0),
        pendingQty:         Number(l.pendingQty ?? l.qty),
        receivedQty:        Number(l.pendingQty ?? l.qty),
        acceptedQty:        Number(l.pendingQty ?? l.qty),
        rejectedQty:        0,
        rejectionReason:    '',
        batchNo:            '',
        qualityStatus:      'PENDING',
      }))
      replace(grnLines)
    }).catch(() => {})
  }, [poId, isEdit, setValue, replace])

  const lineErrors = lines.map(l => {
    const rec = Number(l.receivedQty) || 0
    const acc = Number(l.acceptedQty) || 0
    const rej = Number(l.rejectedQty) || 0
    const sum = acc + rej
    if (Math.abs(sum - rec) > 0.0001) return `Accepted + Rejected (${sum}) ≠ Received (${rec})`
    if (rec > Number(l.pendingQty) * 1.05) return `Exceeds pending qty + 5% tolerance`
    return null
  })
  const hasLineErrors = lineErrors.some(Boolean)

  // ── Mutations ──
  const buildPayload = (data: GRNForm) => ({
    poId:             data.poId,
    vendorId:         data.vendorId,
    grnDate:          data.grnDate,
    deliveryLocation: data.deliveryLocation,
    vehicleNo:        data.vehicleNo,
    lrNumber:         data.lrNumber,
    deliveryNote:     data.deliveryNote,
    lines: data.lines.map(l => ({
      poLineId:        l.poLineId,
      itemId:          l.itemId,
      description:     l.description,
      orderedQty:      Number(l.orderedQty),
      receivedQty:     Number(l.receivedQty),
      acceptedQty:     Number(l.acceptedQty),
      rejectedQty:     Number(l.rejectedQty),
      rejectionReason: l.rejectionReason,
      batchNo:         l.batchNo,
      qualityStatus:   l.qualityStatus,
    })),
  })

  const saveDraft = useMutation({
    mutationFn: (data: GRNForm) => {
      const payload = buildPayload(data)
      return http.post<any>('/api/grn', payload)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['grn-list'] })
      navigate(`/grn/${res.id}`)
    },
  })

  const submitForApproval = useMutation({
    mutationFn: async (data: GRNForm) => {
      const payload = buildPayload(data)
      const grn = await http.post<any>('/api/grn', payload)
      await http.post(`/api/grn/${grn.id}/approve`, {})
      return grn
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['grn-list'] })
      navigate(`/grn/${res.id}`)
    },
  })

  if (isEdit && loadingGrn) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  const isPending = saveDraft.isPending || submitForApproval.isPending

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? `Edit ${existing?.grnRef ?? 'GRN'}` : 'New Goods Receipt Note'}
        description="Record receipt against an open purchase order"
        backLabel="GRN"
        backTo="/grn"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/grn')}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
            <button type="button" disabled={isPending || hasLineErrors}
              onClick={handleSubmit(d => saveDraft.mutate(d))}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
              {saveDraft.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />}
              Save draft
            </button>
            <button type="button" disabled={isPending || hasLineErrors || lines.length === 0}
              onClick={handleSubmit(d => submitForApproval.mutate(d))}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Send className="h-3.5 w-3.5" />
              Submit
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">

          {/* A. GRN Identity */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="A" title="GRN Identity" subtitle="Reference and delivery details" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="GRN Ref">
                <AutoCodeField value={existing?.grnRef} />
              </Field>
              <Field label="Purchase Order" required>
                <FormSelect value={watch('poId') ?? ''} onChange={e => setValue('poId', e.target.value)} disabled={isEdit}>
                  <option value="">Select an open PO…</option>
                  {(openPOs as any[]).map(po => (
                    <option key={po.id} value={po.id}>
                      {po.poRef} — {vendorMap[po.vendorId]?.legalName ?? '—'}
                    </option>
                  ))}
                </FormSelect>
              </Field>
              <Field label="GRN Date" required>
                <FormInput type="date" {...register('grnDate', { required: true })} />
              </Field>
              <Field label="Delivery Location">
                <FormSelect {...register('deliveryLocation')}>
                  <option value="">—</option>
                  {(locations as any[]).map(l => <option key={l.id} value={l.code}>{l.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Vehicle No">
                <FormInput placeholder="MH-01-AB-1234" {...register('vehicleNo')} />
              </Field>
              <Field label="LR Number">
                <FormInput placeholder="LR / Docket no" {...register('lrNumber')} />
              </Field>
              <Field label="Delivery Note" span>
                <FormInput placeholder="Vendor delivery challan no" {...register('deliveryNote')} />
              </Field>
            </div>
          </div>

          {/* B. GRN Lines */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="B" title="GRN Lines" subtitle="Lines auto-loaded from selected PO — fill received/accepted quantities" />
            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Select a purchase order above to load lines</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs min-w-[1200px]">
                  <thead>
                    <tr className="border-b border-border">
                      {['Item', 'Description', 'PO Qty', 'Prev. Rcvd', 'Pending', 'Received', 'Accepted', 'Rejected', 'Reason', 'Batch', 'Quality'].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {fields.map((field, i) => {
                      const l = lines[i] ?? {} as GRNLine
                      const err = lineErrors[i]
                      return (
                        <tr key={field.id} className={cn('align-top', err && 'bg-red-50/40')}>
                          <td className="px-2 py-2 pt-3 font-mono text-muted-foreground">{l.itemId ? l.itemId.slice(0, 6) : '—'}</td>
                          <td className="px-2 py-2 min-w-[180px] pt-3">{l.description}</td>
                          <td className="px-2 py-2 w-20 pt-3 font-mono tabular-nums text-right">{Number(l.orderedQty).toFixed(2)}</td>
                          <td className="px-2 py-2 w-20 pt-3 font-mono tabular-nums text-right text-muted-foreground">{Number(l.previouslyReceived).toFixed(2)}</td>
                          <td className="px-2 py-2 w-20 pt-3 font-mono tabular-nums text-right text-amber-600 font-medium">{Number(l.pendingQty).toFixed(2)}</td>
                          <td className="px-2 py-2 w-24">
                            <FormInput type="number" step="0.01" min="0"
                              {...register(`lines.${i}.receivedQty`, { valueAsNumber: true })} />
                          </td>
                          <td className="px-2 py-2 w-24">
                            <FormInput type="number" step="0.01" min="0"
                              {...register(`lines.${i}.acceptedQty`, { valueAsNumber: true })} />
                          </td>
                          <td className="px-2 py-2 w-24">
                            <FormInput type="number" step="0.01" min="0"
                              {...register(`lines.${i}.rejectedQty`, { valueAsNumber: true })} />
                          </td>
                          <td className="px-2 py-2 min-w-[140px]">
                            <FormInput placeholder="Reason" {...register(`lines.${i}.rejectionReason`)}
                              disabled={!Number(l.rejectedQty)} />
                          </td>
                          <td className="px-2 py-2 w-24">
                            <FormInput placeholder="Batch" {...register(`lines.${i}.batchNo`)} />
                          </td>
                          <td className="px-2 py-2 min-w-[120px]">
                            <FormSelect {...register(`lines.${i}.qualityStatus`)}>
                              {['PENDING', 'PASSED', 'FAILED', 'CONDITIONAL'].map(q => <option key={q} value={q}>{q}</option>)}
                            </FormSelect>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {hasLineErrors && (
                  <div className="mt-3 space-y-1">
                    {lineErrors.map((e, i) => e && (
                      <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Line {i + 1}: {e}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
