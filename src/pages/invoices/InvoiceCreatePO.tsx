import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Send, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react'
import { http, HttpError } from '../../lib/http'
import { MasterPageHeader, FormInput, FormSelect } from '../../components/masters/MasterFormLayout'
import { formatCurrency, formatDate } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'
import { toArray } from './components/invoice-shared'

interface POSummary {
  id:              string
  poRef:           string
  poDate:          string
  vendorId:        string
  entityId:        string
  notes?:          string | null
  totalAmount:     string | number
  consumedAmount:  string | number
  openValue:       number
  grnCount:        number
  status:          string
}

interface POLinkDraft {
  poId:            string
  consumptionType: 'PARTIAL' | 'FULL'
  invoiceAmount:   number
}

type Step = 'vendor' | 'link' | 'details' | 'review'

const STEPS: { id: Step; label: string }[] = [
  { id: 'vendor',  label: 'Vendor'  },
  { id: 'link',    label: 'Link PO' },
  { id: 'details', label: 'Details' },
  { id: 'review',  label: 'Review'  },
]

export default function InvoiceCreatePO() {
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [step,        setStep]        = useState<Step>('vendor')
  const [vendorId,    setVendorId]    = useState('')
  const [poLinks,     setPoLinks]     = useState<POLinkDraft[]>([])
  const [matchType,   setMatchType]   = useState<'2way' | '3way'>('2way')
  const [invoiceNum,  setInvoiceNum]  = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate,     setDueDate]     = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Reference data ────────────────────────────────────────────────────────
  // /auth/me carries the pre-resolved entityId / departmentId / locationId
  // (see server/src/routes/auth.ts §5.2 of ARCHITECTURE.md). The Zustand store
  // only holds the JWT-claim subset which doesn't include entityId.
  const { data: currentUser } = useQuery({
    queryKey:  ['current-user'],
    queryFn:   () => http.get<{ entityId?: string | null }>('/auth/me'),
    staleTime: 5 * 60_000,
  })
  const entityId = currentUser?.entityId
  const { data: vendors = [] } = useQuery({
    queryKey:  ['vendors-list'],
    queryFn:   () => http.get<any>('/api/masters/vendors').then(toArray),
    staleTime: 5 * 60_000,
  })
  // INTERCOMPANY vendors are treated as "entity vendors" — excluded per spec.
  const externalVendors = useMemo(
    () => (vendors as any[]).filter(v => v.status === 'ACTIVE' && v.vendorType !== 'INTERCOMPANY'),
    [vendors],
  )

  // POs for the chosen vendor + current entity, only those with headroom.
  const { data: openPOs = [], isLoading: posLoading } = useQuery<POSummary[]>({
    queryKey: ['po-list', vendorId, entityId],
    queryFn:  () => http.get<POSummary[]>(`/api/po?vendorId=${vendorId}&entityId=${entityId}&status=APPROVED&hasOpenValue=true`),
    enabled:  !!vendorId && !!entityId && step !== 'vendor',
    staleTime: 30_000,
  })

  // Totals derived from poLinks
  const totalInvoiceAmount = poLinks.reduce((s, l) => s + (Number(l.invoiceAmount) || 0), 0)
  const anyGrnAvailable    = openPOs.some(p => poLinks.some(l => l.poId === p.id) && p.grnCount > 0)

  function togglePO(po: POSummary, checked: boolean) {
    setPoLinks(prev => {
      if (checked) {
        if (prev.some(l => l.poId === po.id)) return prev
        return [...prev, { poId: po.id, consumptionType: 'PARTIAL', invoiceAmount: po.openValue }]
      }
      return prev.filter(l => l.poId !== po.id)
    })
  }

  function updateLink(poId: string, patch: Partial<POLinkDraft>) {
    setPoLinks(prev => prev.map(l => l.poId === poId ? { ...l, ...patch } : l))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = useMutation({
    mutationFn: () => {
      if (!entityId) throw new Error('No entity context — refresh and try again')
      const body = {
        entityId,
        vendorId,
        invoiceNumber: invoiceNum,
        invoiceDate,
        dueDate: dueDate || undefined,
        channelType:   'MANUAL_UPLOAD',
        currencyCode:  'INR',
        subtotal:      totalInvoiceAmount,
        totalAmount:   totalInvoiceAmount,
        netPayable:    totalInvoiceAmount,
        taxableAmount: totalInvoiceAmount,
        poRefs:        poLinks,
        matchType,
      }
      return http.post<{ id: string }>('/api/invoices', body)
    },
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/invoices/${inv.id}`)
    },
    onError: (err: unknown) => {
      const msg = err instanceof HttpError ? err.error.message
                : err instanceof Error    ? err.message
                : 'Failed to create invoice'
      setSubmitError(msg)
    },
  })

  // ── Step gating ────────────────────────────────────────────────────────────
  const canAdvance: Record<Step, boolean> = {
    vendor:  !!vendorId,
    link:    poLinks.length > 0 && poLinks.every(l => l.invoiceAmount > 0),
    details: !!invoiceNum && !!invoiceDate,
    review:  true,
  }

  const stepIdx = STEPS.findIndex(s => s.id === step)
  const advance = () => stepIdx < STEPS.length - 1 && setStep(STEPS[stepIdx + 1].id)
  const back    = () => stepIdx > 0 && setStep(STEPS[stepIdx - 1].id)

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="New PO-based Invoice"
        description="Multi-step wizard — references an approved purchase order"
        backLabel="Invoices"
        backTo="/invoices"
      />

      {/* Step indicator */}
      <Stepper current={step} />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-5">

          {/* Vendor step */}
          {step === 'vendor' && (
            <Section letter="A" title="Vendor" subtitle="Pick the vendor billing this invoice">
              <FormSelect value={vendorId} onChange={e => { setVendorId(e.target.value); setPoLinks([]) }}>
                <option value="">Select vendor…</option>
                {externalVendors.map(v => (
                  <option key={v.id} value={v.id}>{v.legalName} — {v.vendorCode}</option>
                ))}
              </FormSelect>
              {externalVendors.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">No active external vendors found.</p>
              )}
            </Section>
          )}

          {/* Link PO step */}
          {step === 'link' && (
            <Section letter="A" title="Link purchase order" subtitle="Multi-select; one invoice can span multiple POs">
              {posLoading ? (
                <p className="text-sm text-muted-foreground">Loading approved POs…</p>
              ) : openPOs.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    No approved POs with open value found for this vendor + entity. Try Direct invoice instead, or create a PO first.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/40">
                        <tr>
                          {['', 'PO ref', 'Date', 'Description', 'PO value', 'Consumed', 'Open value', 'GRN'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {openPOs.map(po => {
                          const checked   = poLinks.some(l => l.poId === po.id)
                          const link      = poLinks.find(l => l.poId === po.id)
                          const total     = Number(po.totalAmount)
                          const consumed  = Number(po.consumedAmount)
                          const pct       = total > 0 ? (consumed / total) * 100 : 0
                          const amberBar  = pct > 80
                          return (
                            <>
                              <tr key={po.id} className="border-b border-border hover:bg-muted/20">
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={e => togglePO(po, e.target.checked)}
                                    className="h-4 w-4 accent-primary"
                                  />
                                </td>
                                <td className="px-3 py-2 font-mono text-xs font-medium text-primary">{po.poRef}</td>
                                <td className="px-3 py-2 text-xs">{formatDate(po.poDate)}</td>
                                <td className="px-3 py-2 text-xs max-w-[160px] truncate" title={po.notes ?? undefined}>{po.notes ?? '—'}</td>
                                <td className="px-3 py-2 text-xs font-mono tabular-nums">{formatCurrency(total)}</td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono tabular-nums">{formatCurrency(consumed)}</span>
                                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div className={cn('h-full', amberBar ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-xs font-mono tabular-nums font-semibold">{formatCurrency(po.openValue)}</td>
                                <td className="px-3 py-2 text-center">
                                  {po.grnCount > 0 ? (
                                    <span className="rounded-full bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 text-[10px] font-medium">{po.grnCount}</span>
                                  ) : <span className="text-xs text-muted-foreground">—</span>}
                                </td>
                              </tr>
                              {checked && link && (
                                <tr className="border-b border-border bg-muted/10">
                                  <td colSpan={8} className="px-3 py-3">
                                    <div className="flex flex-wrap items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">Consumption:</span>
                                        {(['PARTIAL', 'FULL'] as const).map(t => (
                                          <button
                                            key={t}
                                            type="button"
                                            onClick={() => updateLink(po.id, { consumptionType: t, invoiceAmount: t === 'FULL' ? po.openValue : link.invoiceAmount })}
                                            className={cn(
                                              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                                              link.consumptionType === t
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-input hover:bg-muted',
                                            )}
                                          >
                                            {t === 'PARTIAL' ? 'Partial' : 'Full'}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">Invoice amount:</span>
                                        <FormInput
                                          type="number"
                                          step="0.01"
                                          value={link.invoiceAmount}
                                          onChange={e => updateLink(po.id, { invoiceAmount: Number(e.target.value) })}
                                          disabled={link.consumptionType === 'FULL'}
                                          className="h-8 w-32 text-xs font-mono tabular-nums"
                                        />
                                      </div>
                                      {link.consumptionType === 'FULL' && (
                                        <span className="text-[11px] text-amber-700">⚠ Closes the PO — no further invoices can be raised</span>
                                      )}
                                      {link.consumptionType === 'PARTIAL' && link.invoiceAmount > po.openValue && (
                                        <span className="text-[11px] text-red-700">Amount exceeds open value</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Match type toggle */}
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">Match type:</span>
                    <div className="flex items-center rounded-lg border border-input overflow-hidden">
                      {(['2way', '3way'] as const).map(m => {
                        const grnRequired = m === '3way'
                        const disabled    = grnRequired && !anyGrnAvailable
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => !disabled && setMatchType(m)}
                            disabled={disabled}
                            title={disabled ? 'Create a GRN first' : undefined}
                            className={cn(
                              'px-3 py-1.5 text-xs font-medium transition-colors',
                              matchType === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                              disabled && 'opacity-40 cursor-not-allowed',
                            )}
                          >
                            {m === '2way' ? '2-way (PO ↔ Invoice)' : '3-way (PO ↔ GRN ↔ Invoice)'}
                          </button>
                        )
                      })}
                    </div>
                    {matchType === '2way' && anyGrnAvailable && (
                      <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] text-amber-700">
                        3-way match available — switch to include GRN
                      </span>
                    )}
                  </div>
                </>
              )}
            </Section>
          )}

          {/* Details step */}
          {step === 'details' && (
            <Section letter="B" title="Invoice Details" subtitle="Identifier + dates from the supplier invoice">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Invoice number *</label>
                  <FormInput
                    value={invoiceNum}
                    onChange={e => setInvoiceNum(e.target.value)}
                    placeholder="e.g. INV-2026-0001"
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">PO references</label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {poLinks.map(l => {
                      const po = openPOs.find(p => p.id === l.poId)
                      return (
                        <span key={l.poId} className="rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 text-xs font-mono">
                          {po?.poRef ?? l.poId.slice(0, 8)} · {formatCurrency(l.invoiceAmount)}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Invoice date *</label>
                  <FormInput type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Due date</label>
                  <FormInput type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Total invoice amount (auto from PO links)</label>
                  <div className="mt-1 flex min-h-9 items-center rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm font-mono tabular-nums">
                    {formatCurrency(totalInvoiceAmount)}
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* Review step */}
          {step === 'review' && (
            <Section letter="C" title="Review" subtitle="Final check before creating the invoice">
              <div className="space-y-3 text-sm">
                <Row label="Vendor"        value={(externalVendors.find(v => v.id === vendorId)?.legalName) ?? '—'} />
                <Row label="Invoice no."   value={<span className="font-mono">{invoiceNum}</span>} />
                <Row label="Invoice date"  value={formatDate(invoiceDate)} />
                <Row label="Due date"      value={dueDate ? formatDate(dueDate) : '—'} />
                <Row label="Match type"    value={matchType.toUpperCase()} />
                <Row label="PO links"      value={
                  <div className="flex flex-col gap-1">
                    {poLinks.map(l => {
                      const po = openPOs.find(p => p.id === l.poId)
                      return (
                        <span key={l.poId} className="text-xs font-mono">
                          {po?.poRef ?? l.poId.slice(0, 8)} · {l.consumptionType} · {formatCurrency(l.invoiceAmount)}
                        </span>
                      )
                    })}
                  </div>
                } />
                <Row label="Total" value={<span className="font-mono font-semibold tabular-nums">{formatCurrency(totalInvoiceAmount)}</span>} />
              </div>
              {submitError && (
                <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}
            </Section>
          )}

          {/* Footer nav */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={back}
              disabled={stepIdx === 0}
              className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
            {step !== 'review' ? (
              <button
                onClick={advance}
                disabled={!canAdvance[step]}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Continue <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={() => { setSubmitError(null); submit.mutate() }}
                disabled={submit.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Create invoice
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Local components ────────────────────────────────────────────────────────

function Section({ letter, title, subtitle, children }: { letter: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">
          <span className="text-primary font-bold mr-1.5">{letter}.</span>
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-medium text-muted-foreground w-28 flex-shrink-0 mt-0.5">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

function Stepper({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex(s => s.id === current)
  return (
    <div className="flex items-center gap-2 px-4 py-3 sm:px-6 border-b border-border bg-muted/20 overflow-x-auto">
      {STEPS.map((s, i) => {
        const done   = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={s.id} className="flex items-center gap-2 whitespace-nowrap">
            <div className={cn(
              'flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border',
              done   ? 'bg-green-500 text-white border-green-500' :
              active ? 'bg-primary text-primary-foreground border-primary' :
                       'bg-muted text-muted-foreground border-border',
            )}>
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn('text-xs font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        )
      })}
    </div>
  )
}
