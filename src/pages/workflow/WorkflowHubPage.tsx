import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, Plus } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { formatCurrency, formatDate } from '../../lib/utils/formatters'

const QUICK_LINKS = [
  { label: 'Workflow Definitions', desc: 'Create and manage approval workflows',     to: '/workflow/definitions',         icon: '⚙️' },
  { label: 'Invoice Approvals',    desc: 'All invoice workflow instances',            to: '/invoices?status=PENDING_L1',   icon: '📄' },
  { label: 'Payment Approvals',    desc: 'All payment workflow instances',            to: '/payments',                     icon: '💳' },
]

export default function WorkflowHubPage() {
  const navigate = useNavigate()

  const { data: pending = [] } = useQuery({
    queryKey:        ['pending-approvals'],
    queryFn:         () => http.get<any[]>('/api/invoices/pending-approvals'),
    refetchInterval: 60_000,
  })

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Workflow Engine"
        description="Approval workflows, stage configuration and pending actions"
        backLabel="Dashboard"
        backTo="/dashboard"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/workflow/definitions')}
              className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <GitBranch className="h-3.5 w-3.5" /> Manage definitions
            </button>
            <button
              onClick={() => navigate('/workflow/definitions/new')}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> New Workflow
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        {/* Pending approvals */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">
            My pending approvals ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending approvals — you are all caught up ✓
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  {['Reference', 'Vendor', 'Amount', 'Stage', 'SLA', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-mono text-xs text-primary">{inv.invoiceNumber}</td>
                    <td className="px-3 py-2.5 text-xs">{inv.vendor?.legalName}</td>
                    <td className="px-3 py-2.5 text-xs font-mono tabular-nums">
                      {formatCurrency(inv.totalAmount, inv.currencyCode)}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{inv.pendingStage?.stageName ?? inv.status}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {inv.pendingStage?.slaDeadline ? formatDate(inv.pendingStage.slaDeadline) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="text-xs text-primary hover:underline"
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

        {/* Quick links */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map(card => (
            <div
              key={card.label}
              onClick={() => navigate(card.to)}
              className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <div className="text-2xl mb-2">{card.icon}</div>
              <p className="text-sm font-semibold">{card.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
