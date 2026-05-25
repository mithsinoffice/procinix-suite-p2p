import { useState } from 'react'
import { useVendorASNs, useCreateASN, useVendorPOs } from '../../hooks/vendor-portal/useVendorPortalTransactions'

export default function VendorASNPage() {
  const asnQuery   = useVendorASNs({ limit: 50 })
  const posQuery   = useVendorPOs({ limit: 100 })
  const createMut  = useCreateASN()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="p-8 max-w-7xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Advance Shipment Notices</h1>
          <p className="text-sm text-slate-500 mt-1">Inform your buyer of dispatch ahead of delivery.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md"
        >
          + Create ASN
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['ASN #', 'PO Ref', 'Status', 'Dispatch', 'Expected', 'Carrier', 'Tracking', 'Lines'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(asnQuery.data?.rows ?? []).map(a => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-teal-600">{a.asnNumber}</td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{a.poRef}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">{a.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{a.dispatchDate}</td>
                <td className="px-4 py-3 text-slate-600">{a.expectedDeliveryDate}</td>
                <td className="px-4 py-3 text-slate-600">{a.carrierName ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{a.trackingNumber ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600 tabular-nums">{a.lineCount}</td>
              </tr>
            ))}
            {(asnQuery.data?.rows ?? []).length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">No shipment notices yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CreateASNForm
          pos={posQuery.data?.rows ?? []}
          onClose={() => setShowForm(false)}
          onSubmit={async (input) => {
            await createMut.mutateAsync(input)
            setShowForm(false)
          }}
          submitting={createMut.isPending}
        />
      )}
    </div>
  )
}

function CreateASNForm({
  pos, onClose, onSubmit, submitting,
}: {
  pos: Array<{ id: string; poRef: string }>
  onClose: () => void
  onSubmit: (input: {
    poId: string
    lines: Array<{ poLineId: string; quantity: number; uom: string }>
    dispatchDate: string
    expectedDeliveryDate: string
    carrierName?: string
    trackingNumber?: string
    comments?: string
  }) => Promise<void>
  submitting: boolean
}) {
  const [poId, setPoId] = useState('')
  const [dispatchDate, setDispatchDate] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [carrierName, setCarrierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [comments, setComments] = useState('')
  // Lines are entered as a single row for the MVP; the API accepts an
  // array so the form can grow without breaking the contract.
  const [poLineId, setPoLineId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [uom, setUom] = useState('EA')

  const canSubmit = !!(poId && poLineId && quantity && dispatchDate && expectedDeliveryDate)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Create ASN</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Purchase Order">
            <select value={poId} onChange={e => setPoId(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm">
              <option value="">Select PO…</option>
              {pos.map(p => <option key={p.id} value={p.id}>{p.poRef}</option>)}
            </select>
          </Field>
          <Field label="PO Line ID (paste from PO)">
            <input value={poLineId} onChange={e => setPoLineId(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono text-xs" placeholder="line-uuid" />
          </Field>
          <Field label="Quantity">
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="UoM">
            <input value={uom} onChange={e => setUom(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Dispatch date">
            <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Expected delivery">
            <input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Carrier">
            <input value={carrierName} onChange={e => setCarrierName(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Tracking #">
            <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </Field>
        </div>

        <Field label="Comments">
          <textarea value={comments} onChange={e => setComments(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
        </Field>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
          <button
            disabled={!canSubmit || submitting}
            onClick={() => onSubmit({
              poId,
              lines: [{ poLineId, quantity: Number(quantity), uom }],
              dispatchDate, expectedDeliveryDate,
              carrierName: carrierName || undefined,
              trackingNumber: trackingNumber || undefined,
              comments: comments || undefined,
            })}
            className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-md disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create ASN'}
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
