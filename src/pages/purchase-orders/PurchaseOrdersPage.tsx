import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

const PO_STATUS_TABS = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'SENT', 'PARTIAL_GRN', 'FULL_GRN', 'CLOSED']

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [poStatus, setPoStatus] = useState('ALL')

  const { data: pos = [], isLoading } = useQuery({
    queryKey: ['po-list', poStatus],
    queryFn: () => {
      const p = new URLSearchParams()
      if (poStatus !== 'ALL') p.set('status', poStatus)
      return http.get<any>(`/api/po?${p}`).then((r: any) => Array.isArray(r) ? r : (r?.data ?? []))
    },
    staleTime: 30_000,
  })

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-lookup'],
    queryFn: () => http.get<any>('/api/masters/vendors').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const { data: entities = [] } = useQuery({
    queryKey: ['entities-lookup'],
    queryFn: () => http.get<any>('/api/masters/entities').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })

  const vendorMap = Object.fromEntries((vendors as any[]).map(v => [v.id, v]))
  const entityMap = Object.fromEntries((entities as any[]).map(e => [e.id, e]))

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Purchase Orders"
        description="Orders issued to vendors — budget-committed and workflow-driven"
        backLabel="Dashboard"
        backTo="/dashboard"
        actions={
          <button onClick={() => navigate('/purchase-orders/new')}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New PO
          </button>
        }
      />

      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {PO_STATUS_TABS.map(s => (
          <button key={s} onClick={() => setPoStatus(s)}
            className={cn('px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
              poStatus === s ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {s === 'ALL' ? 'All' : formatStatus(s)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : pos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">No purchase orders found</p>
            <button onClick={() => navigate('/purchase-orders/new')} className="mt-3 text-sm text-primary hover:underline">Create first PO</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0">
              <tr>
                {['PO Ref', 'Vendor', 'Entity', 'PO Date', 'Expiry', 'Amount', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pos.map((po: any) => (
                <tr key={po.id} onClick={() => navigate(`/purchase-orders/${po.id}`)}
                  className="border-b border-border hover:bg-muted/20 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{po.poRef}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-xs">{vendorMap[po.vendorId]?.legalName ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{vendorMap[po.vendorId]?.vendorCode}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{entityMap[po.entityId]?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(po.poDate)}</td>
                  <td className="px-4 py-3 text-xs">{po.poExpiryDate ? formatDate(po.poExpiryDate) : '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums font-semibold">{formatCurrency(po.totalAmount, po.currencyCode)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(po.status))}>
                      {formatStatus(po.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      className="text-xs text-primary hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
