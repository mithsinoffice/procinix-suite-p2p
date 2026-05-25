import { useState } from 'react'
import { useVendorPortalInvoices, useSubmitPortalInvoice, useVendorPOs } from '../../hooks/vendor-portal/useVendorPortalTransactions'

function fmtMoney(n: number, ccy: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n)
}

export default function VendorInvoicePortalPage() {
  const invQuery   = useVendorPortalInvoices({ limit: 50 })
  const posQuery   = useVendorPOs({ limit: 100 })
  const submitMut  = useSubmitPortalInvoice()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="p-8 max-w-7xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Submit new invoices and track payment status.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md">
          + Submit Invoice
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Invoice #', 'Date', 'PO Ref', 'Amount', 'Status', 'Payment'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(invQuery.data?.rows ?? []).map(i => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-teal-600">{i.invoiceNumber}</td>
                <td className="px-4 py-3 text-slate-600">{i.invoiceDate}</td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{i.poRef ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums">{fmtMoney(i.totalAmount, i.currencyCode)}</td>
                <td className="px-4 py-3"><Badge tone="slate">{i.status}</Badge></td>
                <td className="px-4 py-3">
                  <Badge tone={i.paymentStatus === 'PAID' ? 'emerald' : i.paymentStatus === 'PARTIALLY_PAID' ? 'amber' : 'slate'}>
                    {i.paymentStatus}
                  </Badge>
                </td>
              </tr>
            ))}
            {(invQuery.data?.rows ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">No invoices submitted yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <SubmitInvoiceForm
          pos={posQuery.data?.rows ?? []}
          onClose={() => setShowForm(false)}
          onSubmit={async (input) => {
            await submitMut.mutateAsync(input)
            setShowForm(false)
          }}
          submitting={submitMut.isPending}
        />
      )}
    </div>
  )
}

function Badge({ tone, children }: { tone: 'emerald' | 'amber' | 'slate'; children: React.ReactNode }) {
  const cls = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700'
            : tone === 'amber'   ? 'bg-amber-50 text-amber-700'
            :                       'bg-slate-100 text-slate-700'
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{children}</span>
}

function SubmitInvoiceForm({
  pos, onClose, onSubmit, submitting,
}: {
  pos: Array<{ id: string; poRef: string }>
  onClose: () => void
  onSubmit: (input: {
    invoiceType: 'PO_BACKED' | 'NON_PO'
    poId?: string
    lines: Array<{ description: string; qty: number; unitPrice: number }>
    invoiceNumber: string
    invoiceDate: string
    totalAmount: number
    currencyCode: string
    taxAmount?: number
    attachmentBlobUrl?: string
  }) => Promise<void>
  submitting: boolean
}) {
  const [invoiceType, setInvoiceType] = useState<'PO_BACKED' | 'NON_PO'>('PO_BACKED')
  const [poId, setPoId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [description, setDescription] = useState('')
  const [qty, setQty] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [taxAmount, setTaxAmount] = useState('')
  const [currencyCode, setCurrencyCode] = useState('INR')
  const [attachmentBlobUrl, setAttachmentBlobUrl] = useState('')

  const canSubmit = invoiceType === 'PO_BACKED'
    ? !!(poId && invoiceNumber && invoiceDate && totalAmount && description && qty && unitPrice)
    : !!(invoiceNumber && invoiceDate && totalAmount && description && qty && unitPrice)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Submit Invoice</h2>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['PO_BACKED', 'NON_PO'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setInvoiceType(t)}
              className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                invoiceType === t ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t === 'PO_BACKED' ? 'PO-backed invoice' : 'Non-PO invoice'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {invoiceType === 'PO_BACKED' && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Purchase Order</label>
              <select value={poId} onChange={e => setPoId(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm">
                <option value="">Select PO…</option>
                {pos.map(p => <option key={p.id} value={p.id}>{p.poRef}</option>)}
              </select>
            </div>
          )}
          <Field label="Invoice number"><input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" /></Field>
          <Field label="Invoice date"><input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" /></Field>
          <Field label="Currency"><input value={currencyCode} onChange={e => setCurrencyCode(e.target.value.toUpperCase())} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" /></Field>
          <Field label="Tax amount"><input type="number" value={taxAmount} onChange={e => setTaxAmount(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" /></Field>
          <Field label="Description (line 1)"><input value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" /></Field>
          <Field label="Qty"><input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" /></Field>
          <Field label="Unit price"><input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" /></Field>
          <Field label="Total amount"><input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" /></Field>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Attachment URL (Azure Blob, optional)</label>
            <input value={attachmentBlobUrl} onChange={e => setAttachmentBlobUrl(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono text-xs" placeholder="https://…/invoice.pdf" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
          <button
            disabled={!canSubmit || submitting}
            onClick={() => onSubmit({
              invoiceType,
              poId: invoiceType === 'PO_BACKED' ? poId : undefined,
              lines: [{ description, qty: Number(qty), unitPrice: Number(unitPrice) }],
              invoiceNumber, invoiceDate,
              totalAmount: Number(totalAmount),
              currencyCode,
              taxAmount: taxAmount ? Number(taxAmount) : undefined,
              attachmentBlobUrl: attachmentBlobUrl || undefined,
            })}
            className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-md disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
