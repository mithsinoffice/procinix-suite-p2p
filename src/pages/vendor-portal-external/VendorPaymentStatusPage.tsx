import { Download } from 'lucide-react'
import { useVendorPayments } from '../../hooks/vendor-portal/useVendorPortalTransactions'

function fmtMoney(n: number, ccy: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n)
}

export default function VendorPaymentStatusPage() {
  const paymentsQuery = useVendorPayments({ limit: 100 })

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Payment Status</h1>
        <p className="text-sm text-slate-500 mt-1">Track payments, UTR references, and download remittance advice.</p>
      </header>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Payment Ref', 'Date', 'Amount', 'UTR', 'Linked Invoice', 'Status', 'Remittance'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(paymentsQuery.data?.rows ?? []).map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-teal-600">{p.paymentRef}</td>
                <td className="px-4 py-3 text-slate-600">{p.paymentDate ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums">{fmtMoney(p.amount, p.currencyCode)}</td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.utr ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.invoiceId ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700'
                    : p.status === 'FAILED'    ? 'bg-rose-50 text-rose-700'
                    :                            'bg-slate-100 text-slate-700'
                  }`}>{p.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled
                    title="Remittance advice download lands in Sprint 5"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </td>
              </tr>
            ))}
            {(paymentsQuery.data?.rows ?? []).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">No payments received yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
