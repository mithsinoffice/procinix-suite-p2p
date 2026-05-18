import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

type TopTab = 'PR' | 'PO'

const PR_STATUS_TABS = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']
const PO_STATUS_TABS = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'SENT', 'PARTIAL_GRN', 'FULL_GRN', 'CLOSED']

const BUDGET_CHIP: Record<string, string> = {
  OK:         'bg-green-50 text-green-700 border-green-200',
  WARNING:    'bg-amber-50 text-amber-700 border-amber-200',
  HARD_BLOCK: 'bg-red-50 text-red-700 border-red-200',
  SOFT_BLOCK: 'bg-orange-50 text-orange-700 border-orange-200',
  NO_BUDGET:  'bg-muted text-muted-foreground border-border',
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TopTab>('PR')
  const [prStatus, setPrStatus] = useState('ALL')
  const [poStatus, setPoStatus] = useState('ALL')

  const { data: prs = [], isLoading: prLoading } = useQuery({
    queryKey: ['pr-list', prStatus],
    queryFn: () => {
      const p = new URLSearchParams()
      if (prStatus !== 'ALL') p.set('status', prStatus)
      return http.get<any>(`/api/pr?${p}`).then((r: any) => Array.isArray(r) ? r : (r?.data ?? []))
    },
    staleTime: 30_000,
    enabled: tab === 'PR',
  })

  const { data: pos = [], isLoading: poLoading } = useQuery({
    queryKey: ['po-list', poStatus],
    queryFn: () => {
      const p = new URLSearchParams()
      if (poStatus !== 'ALL') p.set('status', poStatus)
      return http.get<any>(`/api/po?${p}`).then((r: any) => Array.isArray(r) ? r : (r?.data ?? []))
    },
    staleTime: 30_000,
    enabled: tab === 'PO',
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
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-lookup'],
    queryFn: () => http.get<any>('/api/masters/departments').then((r: any) => Array.isArray(r) ? r : (r?.data ?? [])),
    staleTime: 5 * 60_000,
  })

  const vendorMap = Object.fromEntries((vendors as any[]).map(v => [v.id, v]))
  const entityMap = Object.fromEntries((entities as any[]).map(e => [e.id, e]))
  const deptMap   = Object.fromEntries((departments as any[]).map(d => [d.id, d]))

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Purchase Orders"
        description="Purchase requisitions and orders — budget-checked and workflow-driven"
        backLabel="Dashboard"
        backTo="/dashboard"
        actions={
          tab === 'PR' ? (
            <button onClick={() => navigate('/purchase-orders/pr/new')}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> New PR
            </button>
          ) : (
            <button onClick={() => navigate('/purchase-orders/new')}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> New PO
            </button>
          )
        }
      />

      {/* Top tabs */}
      <div className="flex gap-1 border-b border-border px-4 sm:px-6">
        {[
          { id: 'PR' as TopTab, label: 'Purchase Requisitions' },
          { id: 'PO' as TopTab, label: 'Purchase Orders' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Status sub-tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {(tab === 'PR' ? PR_STATUS_TABS : PO_STATUS_TABS).map(s => {
          const active = tab === 'PR' ? prStatus === s : poStatus === s
          return (
            <button key={s} onClick={() => tab === 'PR' ? setPrStatus(s) : setPoStatus(s)}
              className={cn('px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
                active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {s === 'ALL' ? 'All' : formatStatus(s)}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'PR' ? (
          prLoading ? (
            <div className="space-y-2 p-4">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : prs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-sm text-muted-foreground">No purchase requisitions found</p>
              <button onClick={() => navigate('/purchase-orders/pr/new')} className="mt-3 text-sm text-primary hover:underline">Create first PR</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 sticky top-0">
                <tr>
                  {['PR Ref', 'Department', 'Required By', 'Est. Amount', 'Budget', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prs.map((pr: any) => (
                  <tr key={pr.id} onClick={() => navigate(`/purchase-orders/pr/${pr.id}`)}
                    className="border-b border-border hover:bg-muted/20 cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{pr.prRef}</td>
                    <td className="px-4 py-3 text-xs">{deptMap[pr.departmentId]?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(pr.requiredBy)}</td>
                    <td className="px-4 py-3 text-xs font-mono tabular-nums">{formatCurrency(pr.estimatedTotal, pr.currencyCode)}</td>
                    <td className="px-4 py-3">
                      {pr.budgetStatus ? (
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold border', BUDGET_CHIP[pr.budgetStatus] ?? BUDGET_CHIP.NO_BUDGET)}>
                          {pr.budgetStatus === 'NO_BUDGET' ? 'No budget' : pr.budgetStatus.replace('_', ' ')}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(pr.status))}>
                        {formatStatus(pr.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/purchase-orders/pr/${pr.id}`)}
                        className="text-xs text-primary hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          poLoading ? (
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
          )
        )}
      </div>
    </div>
  )
}
