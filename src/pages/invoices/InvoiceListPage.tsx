import { useState, useDeferredValue } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useInvoices } from '../../lib/api/invoices.api'
import { formatINR, formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

const STATUSES = ['DRAFT','SUBMITTED','PENDING_L1','PENDING_L2','APPROVED','REJECTED','ON_HOLD','PAID','CANCELLED']

export default function InvoiceListPage() {
  const navigate            = useNavigate()
  const [search, setSearch]  = useState('')
  const [status, setStatus]  = useState('')
  const deferred             = useDeferredValue(search)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInvoices({ search: deferred || undefined, status: status || undefined })

  const invoices = data?.pages.flatMap(p => p.data) ?? []
  const total    = data?.pages[0]?.total ?? 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-base font-semibold">Invoices</h1>
          <p className="text-xs text-muted-foreground">{total} invoices</p>
        </div>
        <button
          onClick={() => navigate('/invoices/new')}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          New invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 sm:px-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search" placeholder="Search invoice number…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={status} onChange={e => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No invoices found</p>
            <button onClick={() => navigate('/invoices/new')} className="mt-3 text-sm text-primary hover:underline">Create your first invoice</button>
          </div>
        ) : (
          <>
            <table className="hidden w-full text-sm sm:table">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {['Invoice #', 'Vendor', 'Date', 'Due', 'Amount', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="border-b border-border cursor-pointer hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{inv.vendor.legalName}</p>
                      <p className="text-xs text-muted-foreground">{inv.vendor.vendorCode}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">{formatINR(inv.netPayable)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(inv.status))}>
                        {formatStatus(inv.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{inv.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-border">
              {invoices.map(inv => (
                <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="px-4 py-3 cursor-pointer hover:bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{inv.vendor.legalName}</p>
                      <p className="text-xs font-mono text-muted-foreground">{inv.invoiceNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{formatINR(inv.netPayable)}</p>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(inv.status))}>{formatStatus(inv.status)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center py-4">
                <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="text-sm text-primary hover:underline disabled:opacity-50">
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
