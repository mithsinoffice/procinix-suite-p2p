import { useState } from 'react'
import { useVendorPOs, useAcknowledgePO, type VendorPORow } from '../../hooks/vendor-portal/useVendorPortalTransactions'

function fmtMoney(n: number, ccy: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n)
}

export default function VendorPOListPage() {
  const posQuery   = useVendorPOs({ limit: 50 })
  const ackMut     = useAcknowledgePO()
  const [selected, setSelected] = useState<VendorPORow | null>(null)

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Purchase Orders</h1>
        <p className="text-sm text-slate-500 mt-1">Review POs, acknowledge or reject — partial commitments supported.</p>
      </header>

      {posQuery.isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['PO Ref', 'Date', 'Status', 'Lines', 'Amount', 'Acknowledgement', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(posQuery.data?.rows ?? []).map(po => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-teal-600">{po.poRef}</td>
                  <td className="px-4 py-3 text-slate-600">{po.poDate}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">{po.lineCount}</td>
                  <td className="px-4 py-3 tabular-nums">{fmtMoney(po.totalAmount, po.currencyCode)}</td>
                  <td className="px-4 py-3 text-xs">
                    {po.latestAck
                      ? <span className={po.latestAck.acknowledgementType === 'REJECTED' ? 'text-rose-600' : 'text-emerald-600'}>{po.latestAck.acknowledgementType}</span>
                      : <span className="text-slate-400">Not acknowledged</span>}
                  </td>
                  <td className="px-4 py-3">
                    {!po.latestAck && (
                      <button
                        onClick={() => setSelected(po)}
                        className="text-xs text-teal-600 hover:underline font-medium"
                      >
                        Acknowledge →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(posQuery.data?.rows ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">No POs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <AcknowledgeModal
          po={selected}
          onClose={() => setSelected(null)}
          onSubmit={async (input) => {
            await ackMut.mutateAsync({ poId: selected.id, ...input })
            setSelected(null)
          }}
          submitting={ackMut.isPending}
        />
      )}
    </div>
  )
}

function AcknowledgeModal({
  po, onClose, onSubmit, submitting,
}: {
  po: VendorPORow
  onClose: () => void
  onSubmit: (input: { acknowledgementType: 'FULL' | 'PARTIAL' | 'REJECTED'; comments?: string; expectedDeliveryDate?: string }) => Promise<void>
  submitting: boolean
}) {
  const [type, setType] = useState<'FULL' | 'PARTIAL' | 'REJECTED'>('FULL')
  const [comments, setComments] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Acknowledge {po.poRef}</h2>
        <p className="text-sm text-slate-500 mb-4">Confirm receipt and commit to delivery, or reject with reason.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Acknowledgement</label>
            <div className="grid grid-cols-3 gap-2">
              {(['FULL', 'PARTIAL', 'REJECTED'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                    type === t
                      ? t === 'REJECTED' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-teal-50 border-teal-500 text-teal-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {type !== 'REJECTED' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Expected delivery date</label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={e => setExpectedDeliveryDate(e.target.value)}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Comments {type === 'REJECTED' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={3}
              placeholder={type === 'REJECTED' ? 'Reason for rejection…' : 'Optional notes…'}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
          <button
            disabled={submitting || (type === 'REJECTED' && !comments.trim())}
            onClick={() => onSubmit({ acknowledgementType: type, comments: comments || undefined, expectedDeliveryDate: expectedDeliveryDate || undefined })}
            className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-md disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
