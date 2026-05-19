import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Send, AlertTriangle, Info } from 'lucide-react'
import { http, HttpError } from '../../lib/http'
import { MasterPageHeader, FormInput, FormSelect } from '../../components/masters/MasterFormLayout'
import { formatCurrency } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'
import { toArray } from './components/invoice-shared'

// Threshold above which a direct invoice is routed through the L2 workflow
// definition (WF-INV-DIRECT-L2 seeded in prisma/seed.ts).
const L2_THRESHOLD = 25_000

export default function InvoiceCreateDirect() {
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [vendorId,     setVendorId]     = useState('')
  const [costCentreId, setCostCentreId] = useState('')
  const [glCodeId,     setGlCodeId]     = useState('')
  const [invoiceNum,   setInvoiceNum]   = useState('')
  const [invoiceDate,  setInvoiceDate]  = useState(new Date().toISOString().slice(0, 10))
  const [dueDate,      setDueDate]      = useState('')
  const [amount,       setAmount]       = useState<number>(0)
  const [notes,        setNotes]        = useState('')
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  // ── Reference data ────────────────────────────────────────────────────────
  // /auth/me carries the pre-resolved entityId — see §5.2 of ARCHITECTURE.md.
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
  const { data: costCentres = [] } = useQuery({
    queryKey:  ['cost-centres-list'],
    queryFn:   () => http.get<any>('/api/masters/cost-centres').then(toArray),
    staleTime: 10 * 60_000,
  })
  const { data: glCodes = [] } = useQuery({
    queryKey:  ['gl-codes-list'],
    queryFn:   () => http.get<any>('/api/masters/gl-codes').then(toArray),
    staleTime: 10 * 60_000,
  })

  const externalVendors = useMemo(
    () => (vendors as any[]).filter(v => v.status === 'ACTIVE' && v.vendorType !== 'INTERCOMPANY'),
    [vendors],
  )

  const triggersL2 = amount > L2_THRESHOLD

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
        subtotal:      amount,
        totalAmount:   amount,
        netPayable:    amount,
        taxableAmount: amount,
        costCentreId,
        glCodeId,
        notes:         notes || undefined,
        // No poRefs / matchType — direct invoices are non-PO by definition.
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

  const canSubmit = !!vendorId && !!costCentreId && !!glCodeId && !!invoiceNum && amount > 0

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="New Direct Invoice"
        description="No PO required — utilities, reimbursements, one-off purchases"
        backLabel="Invoices"
        backTo="/invoices"
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-5">

          {/* L2 routing banner */}
          {triggersL2 && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
              <Info className="h-4 w-4 text-blue-700 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Amount exceeds ₹{L2_THRESHOLD.toLocaleString('en-IN')} — invoice will route through{' '}
                <span className="font-semibold">L2 approval</span> (Finance Manager → CFO) per workflow rule{' '}
                <code className="font-mono text-xs">WF-INV-DIRECT-L2</code>.
              </p>
            </div>
          )}

          {/* Section A — Cost Allocation */}
          <Section letter="A" title="Cost Allocation" subtitle="Charge this invoice to a cost centre + GL">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Cost centre *</label>
                <FormSelect value={costCentreId} onChange={e => setCostCentreId(e.target.value)}>
                  <option value="">Select cost centre…</option>
                  {(costCentres as any[]).filter(c => c.status === 'ACTIVE').map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">GL code *</label>
                <FormSelect value={glCodeId} onChange={e => setGlCodeId(e.target.value)}>
                  <option value="">Select GL code…</option>
                  {(glCodes as any[]).filter(g => g.status === 'ACTIVE').map(g => (
                    <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
                  ))}
                </FormSelect>
              </div>
            </div>
          </Section>

          {/* Section B — Vendor + Invoice Details */}
          <Section letter="B" title="Vendor & Invoice Details" subtitle="Identify the supplier and the invoice they issued">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Vendor *</label>
                <FormSelect value={vendorId} onChange={e => setVendorId(e.target.value)}>
                  <option value="">Select vendor…</option>
                  {externalVendors.map(v => (
                    <option key={v.id} value={v.id}>{v.legalName} — {v.vendorCode}</option>
                  ))}
                </FormSelect>
              </div>
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
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  PO reference
                  <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium">DIRECT — no PO</span>
                </label>
                <div className="mt-1 flex min-h-9 items-center rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  Not applicable
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
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <FormInput
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional — e.g. April electricity bill, Q1 office supplies"
                />
              </div>
            </div>
          </Section>

          {/* Section C — Amount */}
          <Section letter="C" title="Amount" subtitle="Tax-inclusive net payable">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Total amount (₹) *</label>
                <FormInput
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Approval lane</label>
                <div className={cn(
                  'mt-1 flex min-h-9 items-center rounded-lg border px-3 py-2 text-sm font-medium',
                  triggersL2
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-muted/30 text-muted-foreground border-input',
                )}>
                  {triggersL2 ? 'L2 (Finance Manager → CFO)' : 'L1 (Finance Manager only)'}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Preview</label>
                <div className="mt-1 flex min-h-9 items-center rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm font-mono tabular-nums">
                  {formatCurrency(amount)}
                </div>
              </div>
            </div>
          </Section>

          {submitError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          <div className="flex items-center justify-end pt-2 gap-2">
            <button
              onClick={() => navigate('/invoices/new')}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => { setSubmitError(null); submit.mutate() }}
              disabled={!canSubmit || submit.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Create invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
