import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Trash2, AlertTriangle, Send, Loader2 } from 'lucide-react'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { paymentsApi, type CreateBatchLine, type PaymentMethod, type PaymentType } from '../../lib/api/payments.api'
import { http } from '../../lib/http'
import { formatINR } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

// Draft payload structure deposited by PaymentQueuePage's selection bar.
interface DraftRow {
  id:            string
  type:          'INVOICE' | 'ADVANCE'
  vendorName:    string | null
  vendorId:      string
  ref:           string
  invoiceAmount: number
  tdsAmount:     number
  finalPayable:  number
  isMsme:        boolean
}

interface LineForm extends DraftRow {
  paymentType:   PaymentType
  paymentMethod: PaymentMethod
  paymentAmount: number  // editable
  tdsSection?:   string
}

interface Entity { id: string; name: string; code: string }

export default function CreatePaymentBatch() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Pull the draft set from sessionStorage (set by PaymentQueuePage). If the
  // user navigated here directly, we redirect back to the queue.
  const [lines, setLines] = useState<LineForm[]>(() => {
    const raw = sessionStorage.getItem('payment.batch.draft')
    if (!raw) return []
    try {
      const draft = JSON.parse(raw) as DraftRow[]
      return draft.map(r => ({
        ...r,
        paymentType:   'FULL' as PaymentType,
        paymentMethod: 'NEFT' as PaymentMethod,
        paymentAmount: r.finalPayable,
      }))
    } catch {
      return []
    }
  })
  const [entityId, setEntityId] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [narration, setNarration] = useState<string>('')
  const [isUrgent, setIsUrgent] = useState<boolean>(false)
  const [urgentReason, setUrgentReason] = useState<string>('')

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn:  () => http.get<Entity[]>('/api/masters/entities'),
  })

  // Default entityId to the first available once entities load.
  useEffect(() => {
    if (!entityId && entities.length > 0) setEntityId(entities[0].id)
  }, [entities, entityId])

  // No draft → bounce back to queue.
  useEffect(() => {
    if (lines.length === 0) {
      const id = setTimeout(() => navigate('/payments'), 300)
      return () => clearTimeout(id)
    }
  }, [lines.length, navigate])

  const totals = useMemo(() => {
    return lines.reduce((acc, l) => ({
      invoice: acc.invoice + l.invoiceAmount,
      tds:     acc.tds     + l.tdsAmount,
      net:     acc.net     + l.paymentAmount,
    }), { invoice: 0, tds: 0, net: 0 })
  }, [lines])
  const msmeCount = lines.filter(l => l.isMsme).length

  function updateLine(i: number, patch: Partial<LineForm>) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }
  function removeLine(i: number) {
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  // submitModeRef mirrors the ItemFormPage pattern: a ref records which
  // footer button kicked off the save so the mutation can decide whether
  // to chain into /submit.
  const submitModeRef = useRef<'draft' | 'submit'>('draft')

  const save = useMutation({
    mutationFn: async () => {
      if (!entityId) throw new Error('Entity is required')
      const body = {
        lines: lines.map(l => ({
          invoiceId:     l.type === 'INVOICE' ? l.id : undefined,
          advanceId:     l.type === 'ADVANCE' ? l.id : undefined,
          paymentType:   l.paymentType,
          paymentMethod: l.paymentMethod,
          paymentAmount: l.paymentAmount,
          tdsSection:    l.tdsSection,
        } satisfies CreateBatchLine)),
        entityId,
        paymentDate,
        narration:    narration || undefined,
        isUrgent,
        urgentReason: isUrgent ? urgentReason || undefined : undefined,
      }
      const created = await paymentsApi.createBatch(body)
      if (submitModeRef.current === 'submit') {
        await paymentsApi.submitBatch(created.id)
      }
      return created
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      sessionStorage.removeItem('payment.batch.draft')
      navigate(`/payments/batches/${data.id}`)
    },
  })

  const canSubmit = lines.length > 0 && entityId && (!isUrgent || !!urgentReason.trim())

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Create Payment Batch"
        description={`${lines.length} line${lines.length === 1 ? '' : 's'} · ${formatINR(totals.net)} · ${msmeCount} MSME`}
        backLabel="Queue"
        backTo="/payments"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" disabled={!canSubmit || save.isPending}
              onClick={() => { submitModeRef.current = 'draft'; save.mutate() }}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
              Save draft
            </button>
            <button type="button" disabled={!canSubmit || save.isPending}
              onClick={() => { submitModeRef.current = 'submit'; save.mutate() }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit for approval
            </button>
          </div>
        }
      />

      {save.error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 sm:px-6 text-xs text-red-800">
          {(save.error as Error).message}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        {/* Section A — Batch details */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Batch details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Entity" required>
              <select value={entityId} onChange={e => setEntityId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm">
                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Payment date">
              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm" />
            </Field>
            <Field label="Narration">
              <input value={narration} onChange={e => setNarration(e.target.value)}
                placeholder="Optional batch description"
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm" />
            </Field>
          </div>
          <div className="rounded-lg border border-border p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} />
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Flag as urgent — routes to fast-track approval (4h SLA)</span>
            </label>
            {isUrgent && (
              <input value={urgentReason} onChange={e => setUrgentReason(e.target.value)}
                placeholder="Reason for urgency (required)" required
                className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm" />
            )}
          </div>
        </div>

        {/* Section B — Lines */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Payment lines · {lines.length}</h3>
            <div className="text-xs text-muted-foreground">Total {formatINR(totals.net)}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs font-medium text-muted-foreground">
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Ref</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Invoice</th>
                  <th className="px-3 py-2 text-right">TDS</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Pmt type</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-3 py-2 max-w-[180px] truncate">
                      <div className="flex items-center gap-1">
                        {l.isMsme && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">MSME</span>
                        )}
                        <span>{l.vendorName ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{l.ref}</td>
                    <td className="px-3 py-2 text-xs">{l.type === 'INVOICE' ? 'Invoice' : 'Advance'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(l.invoiceAmount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatINR(l.tdsAmount)}</td>
                    <td className="px-3 py-2">
                      <select value={l.paymentMethod} onChange={e => updateLine(i, { paymentMethod: e.target.value as PaymentMethod })}
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                        <option value="NEFT">NEFT</option>
                        <option value="RTGS">RTGS</option>
                        <option value="IMPS">IMPS</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select value={l.paymentType} onChange={e => updateLine(i, { paymentType: e.target.value as PaymentType })}
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                        <option value="FULL">Full</option>
                        <option value="PARTIAL">Partial</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" min={0} value={l.paymentAmount}
                        onChange={e => updateLine(i, { paymentAmount: Number(e.target.value) })}
                        className="w-24 rounded-md border border-input bg-background px-2 py-1 text-xs text-right tabular-nums" />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeLine(i)} title="Remove"
                        className="rounded p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40">
                <tr className="text-xs font-medium">
                  <td colSpan={3} className="px-3 py-2 text-right">Totals</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(totals.invoice)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(totals.tds)}</td>
                  <td colSpan={2} />
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatINR(totals.net)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section C — Summary */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Cell label="Total payment"  value={formatINR(totals.net)} bold />
            <Cell label="TDS withheld"   value={formatINR(totals.tds)} />
            <Cell label="MSME vendors"   value={msmeCount > 0 ? `${msmeCount}` : '0'} tone={msmeCount > 0 ? 'amber' : 'default'} />
            <Cell label="Urgent"         value={isUrgent ? 'YES' : 'NO'} tone={isUrgent ? 'red' : 'default'} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Cell({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: 'red' | 'amber' | 'default' }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 tabular-nums',
        bold && 'text-lg font-semibold',
        tone === 'red' && 'text-red-700',
        tone === 'amber' && 'text-amber-700',
      )}>{value}</div>
    </div>
  )
}
