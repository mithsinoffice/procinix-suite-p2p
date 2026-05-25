import { Link } from 'react-router-dom'
import { ShoppingCart, FileText, Banknote, AlertCircle } from 'lucide-react'
import { useVendorPOs, useVendorPortalInvoices, useVendorPayments, useVendorRecon } from '../../hooks/vendor-portal/useVendorPortalTransactions'

function fmtMoney(n: number, ccy = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n)
}

function KpiCard({ label, value, hint, icon: Icon, accent }: { label: string; value: string; hint?: string; icon: React.ComponentType<{ className?: string }>; accent: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  )
}

export default function VendorPortalDashboard() {
  const posQuery      = useVendorPOs({ limit: 5 })
  const invoicesQuery = useVendorPortalInvoices({ limit: 5 })
  const paymentsQuery = useVendorPayments({ limit: 5 })
  const reconQuery    = useVendorRecon()

  const openPos       = (posQuery.data?.rows ?? []).filter(p => !p.latestAck || p.latestAck.status === 'PENDING').length
  const pendingInv    = (invoicesQuery.data?.rows ?? []).filter(i => i.paymentStatus !== 'PAID').length
  const lastPayment   = paymentsQuery.data?.rows[0] ?? null
  const outstanding   = reconQuery.data?.outstanding ?? 0

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Your real-time view of orders, invoices and payments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Open POs awaiting acknowledgement"
          value={String(openPos)}
          icon={ShoppingCart}
          accent="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="Invoices pending payment"
          value={String(pendingInv)}
          icon={FileText}
          accent="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Last payment received"
          value={lastPayment ? fmtMoney(lastPayment.amount, lastPayment.currencyCode) : '—'}
          hint={lastPayment?.paymentDate ? `on ${lastPayment.paymentDate}` : 'No payments yet'}
          icon={Banknote}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="Outstanding receivables"
          value={fmtMoney(outstanding)}
          icon={AlertCircle}
          accent="bg-rose-50 text-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Recent purchase orders" linkTo="/portal/vendor/pos">
          <ul className="divide-y divide-slate-100">
            {(posQuery.data?.rows ?? []).slice(0, 5).map(po => (
              <li key={po.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">{po.poRef}</div>
                  <div className="text-xs text-slate-500">{po.poDate} · {po.lineCount} line{po.lineCount === 1 ? '' : 's'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums text-slate-900">{fmtMoney(po.totalAmount, po.currencyCode)}</div>
                  <div className="text-xs text-slate-500">{po.latestAck?.status ?? 'Not acknowledged'}</div>
                </div>
              </li>
            ))}
            {(posQuery.data?.rows ?? []).length === 0 && <EmptyRow label="No POs yet" />}
          </ul>
        </Section>

        <Section title="Recent invoices" linkTo="/portal/vendor/invoices">
          <ul className="divide-y divide-slate-100">
            {(invoicesQuery.data?.rows ?? []).slice(0, 5).map(inv => (
              <li key={inv.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">{inv.invoiceNumber}</div>
                  <div className="text-xs text-slate-500">{inv.invoiceDate}{inv.poRef ? ` · ${inv.poRef}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums text-slate-900">{fmtMoney(inv.totalAmount, inv.currencyCode)}</div>
                  <div className="text-xs text-slate-500">{inv.paymentStatus}</div>
                </div>
              </li>
            ))}
            {(invoicesQuery.data?.rows ?? []).length === 0 && <EmptyRow label="No invoices yet" />}
          </ul>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, linkTo, children }: { title: string; linkTo: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <Link to={linkTo} className="text-xs text-teal-600 hover:underline">View all</Link>
      </div>
      {children}
    </section>
  )
}

function EmptyRow({ label }: { label: string }) {
  return <li className="py-6 text-center text-sm text-slate-400">{label}</li>
}
