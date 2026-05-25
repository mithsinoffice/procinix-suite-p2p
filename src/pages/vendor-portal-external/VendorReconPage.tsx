import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useVendorRecon, useRaiseDispute, type ReconInvoiceRow } from '../../hooks/vendor-portal/useVendorPortalTransactions'

function fmtMoney(n: number, ccy = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n)
}

export default function VendorReconPage() {
  const reconQuery = useVendorRecon()
  const disputeMut = useRaiseDispute()
  const [disputeFor, setDisputeFor] = useState<{ invoiceId?: string; paymentId?: string; label: string } | null>(null)

  const d = reconQuery.data
  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Reconciliation</h1>
        <p className="text-sm text-slate-500 mt-1">Match invoices to payments and raise disputes on discrepancies.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Total invoiced"      value={fmtMoney(d?.totalInvoiced ?? 0)} hint={`${d?.invoiceCount ?? 0} invoices`} />
        <SummaryCard label="Total paid"          value={fmtMoney(d?.totalPaid     ?? 0)} hint={`${d?.paidInvoiceCount ?? 0} fully paid`} tone="emerald" />
        <SummaryCard label="Outstanding"         value={fmtMoney(d?.outstanding   ?? 0)} hint="pending receipt" tone="amber" />
      </div>

      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Invoice ledger</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Invoice #', 'Date', 'Total', 'Paid', 'Outstanding', 'Status', 'Action'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(d?.invoices ?? []).map((inv: ReconInvoiceRow) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-teal-600">{inv.invoiceNumber}</td>
                <td className="px-4 py-3 text-slate-600">{inv.invoiceDate}</td>
                <td className="px-4 py-3 tabular-nums">{fmtMoney(inv.totalAmount, inv.currencyCode)}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-700">{fmtMoney(inv.paidAmount, inv.currencyCode)}</td>
                <td className="px-4 py-3 tabular-nums">{fmtMoney(inv.outstanding, inv.currencyCode)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    inv.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700'
                    : inv.paymentStatus === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-700'
                  }`}>{inv.paymentStatus}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDisputeFor({ invoiceId: inv.id, label: inv.invoiceNumber })}
                    className="text-xs text-rose-600 hover:underline font-medium"
                  >
                    Raise dispute
                  </button>
                </td>
              </tr>
            ))}
            {(d?.invoices ?? []).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">No invoices in the ledger yet</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {(d?.unmatchedPayments?.length ?? 0) > 0 && (
        <section className="bg-white border border-amber-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-200 bg-amber-50 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-900">Unmatched payments</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Date', 'Amount', 'UTR', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(d?.unmatchedPayments ?? []).map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{p.paymentDate ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums">{fmtMoney(p.amount)}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.utr ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDisputeFor({ paymentId: p.id, label: p.utr ?? p.id.slice(0, 8) })}
                      className="text-xs text-rose-600 hover:underline font-medium"
                    >
                      Raise dispute
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {disputeFor && (
        <DisputeModal
          target={disputeFor}
          onClose={() => setDisputeFor(null)}
          onSubmit={async (input) => {
            await disputeMut.mutateAsync({
              invoiceId: disputeFor.invoiceId,
              paymentId: disputeFor.paymentId,
              ...input,
            })
            setDisputeFor(null)
          }}
          submitting={disputeMut.isPending}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'emerald' | 'amber' }) {
  const valueCls = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-900'
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${valueCls}`}>{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  )
}

function DisputeModal({
  target, onClose, onSubmit, submitting,
}: {
  target: { invoiceId?: string; paymentId?: string; label: string }
  onClose: () => void
  onSubmit: (input: {
    disputeType: 'PAYMENT_DELAY' | 'AMOUNT_MISMATCH' | 'DUPLICATE_PAYMENT' | 'WRONG_DEDUCTION' | 'OTHER'
    description: string
    attachmentBlobUrl?: string
  }) => Promise<void>
  submitting: boolean
}) {
  const [disputeType, setDisputeType] = useState<'PAYMENT_DELAY' | 'AMOUNT_MISMATCH' | 'DUPLICATE_PAYMENT' | 'WRONG_DEDUCTION' | 'OTHER'>('AMOUNT_MISMATCH')
  const [description, setDescription] = useState('')
  const [attachmentBlobUrl, setAttachmentBlobUrl] = useState('')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Raise dispute</h2>
        <p className="text-sm text-slate-500 mb-4">Targeting: <span className="font-mono">{target.label}</span></p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
            <select value={disputeType} onChange={e => setDisputeType(e.target.value as typeof disputeType)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm">
              <option value="PAYMENT_DELAY">Payment delay</option>
              <option value="AMOUNT_MISMATCH">Amount mismatch</option>
              <option value="DUPLICATE_PAYMENT">Duplicate payment</option>
              <option value="WRONG_DEDUCTION">Wrong deduction</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Attachment URL (optional)</label>
            <input value={attachmentBlobUrl} onChange={e => setAttachmentBlobUrl(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono text-xs" placeholder="https://…/evidence.pdf" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
          <button
            disabled={!description.trim() || submitting}
            onClick={() => onSubmit({ disputeType, description, attachmentBlobUrl: attachmentBlobUrl || undefined })}
            className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-md disabled:opacity-50"
          >
            {submitting ? 'Filing…' : 'File dispute'}
          </button>
        </div>
      </div>
    </div>
  )
}
