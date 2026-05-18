import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

const STATUS_TABS = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']

export default function GRNPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('ALL')

  const { data: grns = [], isLoading } = useQuery({
    queryKey: ['grn-list', status],
    queryFn: () => {
      const p = new URLSearchParams()
      if (status !== 'ALL') p.set('status', status)
      return http.get<any>(`/api/grn?${p}`).then((r: any) => Array.isArray(r) ? r : (r?.data ?? []))
    },
    staleTime: 30_000,
  })

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-lookup'],
    queryFn:  () => http.get<any>('/api/masters/vendors').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })
  const vendorMap = Object.fromEntries((vendors as any[]).map(v => [v.id, v]))

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Goods Receipt Note"
        description="Record receipt of goods against open purchase orders"
        backLabel="Dashboard"
        backTo="/dashboard"
        actions={
          <button onClick={() => navigate('/grn/new')}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New GRN
          </button>
        }
      />

      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
              status === s ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {s === 'ALL' ? 'All' : formatStatus(s)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : grns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">No goods receipt notes found</p>
            <button onClick={() => navigate('/grn/new')} className="mt-3 text-sm text-primary hover:underline">Create first GRN</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0">
              <tr>
                {['GRN Ref', 'PO Ref', 'Vendor', 'GRN Date', 'Location', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grns.map((grn: any) => (
                <tr key={grn.id} onClick={() => navigate(`/grn/${grn.id}`)}
                  className="border-b border-border hover:bg-muted/20 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{grn.grnRef}</td>
                  <td className="px-4 py-3 font-mono text-xs">{grn.po?.poRef ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {vendorMap[grn.vendorId]?.legalName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">{formatDate(grn.grnDate)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{grn.deliveryLocation ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(grn.status))}>
                      {formatStatus(grn.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/grn/${grn.id}`)}
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
