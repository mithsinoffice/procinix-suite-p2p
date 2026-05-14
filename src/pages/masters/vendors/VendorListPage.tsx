import { useState, useDeferredValue } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { MasterPageHeader } from '../../../components/masters/MasterFormLayout'
import { useVendors } from '../../../lib/api/vendors.api'
import { KycBadge } from '../../../components/shared/KycBadge'
import { formatStatus, getStatusColor } from '../../../lib/utils/formatters'
import { cn } from '../../../lib/utils'

export default function VendorListPage() {
  const navigate            = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const deferred            = useDeferredValue(search)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useVendors({ search: deferred || undefined, status: status || undefined })

  const vendors = data?.pages.flatMap(p => p.data) ?? []
  const total   = data?.pages[0]?.total ?? 0

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Vendors"
        description={`${total} vendors`}
        actions={
          <button onClick={() => navigate('/masters/vendors/new')}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New vendor
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 sm:px-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search name, GSTIN, PAN…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_APPROVAL">Pending</option>
          <option value="INACTIVE">Inactive</option>
          <option value="BLOCKED">Blocked</option>
        </select>
        <button onClick={() => refetch()} className="rounded-md border border-input p-1.5 text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No vendors found</p>
            <button onClick={() => navigate('/masters/vendors/new')} className="mt-3 text-sm text-primary hover:underline">Add your first vendor</button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm sm:table">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {['Code', 'Legal name', 'GSTIN', 'Type', 'Status', 'KYC', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/masters/vendors/${v.id}`)}
                    className="border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.vendorCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{v.legalName}</p>
                      {v.tradeName && <p className="text-xs text-muted-foreground">{v.tradeName}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{v.gstin ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{v.vendorType}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(v.status))}>
                        {formatStatus(v.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <KycBadge label="PAN"  status={v.kycPanStatus} />
                        <KycBadge label="GST"  status={v.kycGstStatus} />
                        <KycBadge label="Bank" status={v.kycBankStatus} />
                        {v.is206ABApplicable && <KycBadge label="206AB" status="INVALID" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {v.paymentTerms}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {vendors.map(v => (
                <div
                  key={v.id}
                  onClick={() => navigate(`/masters/vendors/${v.id}`)}
                  className="px-4 py-3 cursor-pointer hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{v.legalName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{v.vendorCode}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(v.status))}>
                      {formatStatus(v.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <KycBadge label="PAN"  status={v.kycPanStatus} />
                    <KycBadge label="GST"  status={v.kycGstStatus} />
                    <KycBadge label="Bank" status={v.kycBankStatus} />
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasNextPage && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
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
