import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { cn } from '../../lib/utils'
import { formatCurrency, formatDate } from '../../lib/utils/formatters'

export default function ApprovalDeskPage() {
  const navigate = useNavigate()
  const [activeModule, setActiveModule] = useState('ALL')

  const { data: pending = [], isLoading } = useQuery({
    queryKey:        ['approval-desk', activeModule],
    queryFn:         () => http.get<any[]>('/api/invoices/pending-approvals'),
    refetchInterval: 30_000,
  })

  const modules = ['ALL', 'INVOICE', 'PAYMENT', 'VENDOR', 'PO']

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Approval Desk"
        description="All pending approvals across modules — your action required"
        backLabel="Dashboard"
        backTo="/dashboard"
      />

      {/* Module tabs */}
      <div className="flex gap-1 border-b border-border px-4 py-2">
        {modules.map(m => (
          <button key={m} onClick={() => setActiveModule(m)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeModule === m
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}>
            {m === 'ALL' ? `All (${pending.length})` : m}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No pending approvals</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0">
              <tr>
                {['Type', 'Reference', 'Vendor / Requester', 'Amount', 'Stage', 'SLA deadline', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pending.map((item: any) => (
                <tr key={item.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs font-medium">
                      Invoice
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                    {item.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-xs">{item.vendor?.legalName}</td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums">
                    {formatCurrency(item.totalAmount, item.currencyCode)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs font-medium">
                      {item.pendingStage?.stageName ?? item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.pendingStage?.slaDeadline ? formatDate(item.pendingStage.slaDeadline) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/invoices/${item.id}`)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Review →
                    </button>
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
