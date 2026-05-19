import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import { http } from '../../../lib/http'
import { MasterTabs, type MasterTab } from '../../../components/masters/MasterTabs'
import { MasterPageHeader } from '../../../components/masters/MasterFormLayout'
import { formatStatus, getStatusColor } from '../../../lib/utils/formatters'
import { cn } from '../../../lib/utils'

interface ItemRow {
  id: string; itemCode: string; name: string; itemType: string; nature?: string
  expenseType: string; hsnCode?: string; sacCode?: string; gstRate?: number
  poRequired: string; rcmApplicable: boolean; provisionRequired: boolean
  autoPostDepreciation: boolean; depreciationMethod?: string; status: string
  hasPendingChange?: boolean
}

const NATURE_LABELS: Record<string, string> = {
  RAW_MATERIAL:   'Raw Material', FINISHED_GOODS: 'Finished Goods',
  CONSUMABLE:     'Consumable',   CAPITAL_ASSET:  'Capital Asset',
  PROFESSIONAL:   'Professional', SUBSCRIPTION:   'Subscription',
  MAINTENANCE:    'Maintenance',  TRANSPORT:      'Transport',
  UTILITY:        'Utility',
}

export default function ItemMasterPage() {
  const navigate   = useNavigate()
  const qc         = useQueryClient()
  const [activeTab, setActiveTab] = useState<MasterTab>('ACTIVE')
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter]    = useState<string>('ALL')
  const [expenseFilter, setExpenseFilter] = useState<string>('ALL')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['itemMaster', activeTab, search, typeFilter, expenseFilter],
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
    refetchOnMount: true,
    queryFn: () => {
      const p = new URLSearchParams()
      if (search)                  p.set('search', search)
      if (activeTab !== 'ALL')     p.set('status', activeTab)
      if (typeFilter !== 'ALL')    p.set('itemType', typeFilter)
      if (expenseFilter !== 'ALL') p.set('expenseType', expenseFilter)
      return http.get<ItemRow[]>(`/api/masters/items?${p}`)
    },
  })

  function PillToggle({ value, options, onChange }: { value: string; options: { label: string; value: string }[]; onChange: (v: string) => void }) {
    return (
      <div className="flex items-center rounded-lg border border-input overflow-hidden">
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={cn('px-3 py-1.5 text-xs font-medium transition-colors',
              value === o.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}>
            {o.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Item Master"
        description="Items, services and assets — PO rules, tax configuration and OCR keywords"
        onRefresh={() => qc.invalidateQueries({ queryKey: ['itemMaster'] })}
        actions={
          <>
            <input type="search" placeholder="Search items…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring w-48" />
            <button onClick={() => navigate('/masters/items/new')}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add New
            </button>
          </>
        }
      />

      {/* Filter pills */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background">
        <span className="text-xs text-muted-foreground font-medium">Type:</span>
        <PillToggle
          value={typeFilter}
          options={[{ label: 'All', value: 'ALL' }, { label: 'Goods', value: 'GOODS' }, { label: 'Services', value: 'SERVICES' }]}
          onChange={setTypeFilter}
        />
        <span className="text-xs text-muted-foreground font-medium ml-2">Expense:</span>
        <PillToggle
          value={expenseFilter}
          options={[{ label: 'All', value: 'ALL' }, { label: 'CAPEX', value: 'CAPEX' }, { label: 'OPEX', value: 'OPEX' }]}
          onChange={setExpenseFilter}
        />
      </div>

      <MasterTabs active={activeTab} onChange={setActiveTab} apiPath="/api/masters/items" />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No items found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['Item Code', 'Name', 'Type', 'Nature', 'Expense', 'HSN/SAC', 'GST%', 'PO Required', 'Flags', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: ItemRow) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{r.itemCode}</td>
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium',
                      r.itemType === 'GOODS' ? 'bg-violet-50 border border-violet-200 text-violet-700' : 'bg-sky-50 border border-sky-200 text-sky-700'
                    )}>
                      {r.itemType === 'GOODS' ? 'Goods' : 'Services'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.nature ? (NATURE_LABELS[r.nature] ?? r.nature) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold',
                      r.expenseType === 'CAPEX' ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-blue-50 border border-blue-200 text-blue-700'
                    )}>
                      {r.expenseType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.hsnCode ?? r.sacCode ?? '—'}</td>
                  <td className="px-4 py-3 text-xs tabular-nums">{r.gstRate != null ? `${r.gstRate}%` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium',
                      r.poRequired === 'YES' ? 'bg-green-50 border border-green-200 text-green-700' :
                      r.poRequired === 'NO'  ? 'bg-muted border border-border text-muted-foreground' :
                      'bg-orange-50 border border-orange-200 text-orange-700'
                    )}>
                      {r.poRequired}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {r.rcmApplicable       && <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-purple-50 border border-purple-200 text-purple-700">RCM</span>}
                      {r.provisionRequired   && <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-teal-50 border border-teal-200 text-teal-700">PROV</span>}
                      {r.autoPostDepreciation && r.depreciationMethod && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 border border-amber-200 text-amber-700">{r.depreciationMethod}</span>
                      )}
                      {r.hasPendingChange    && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 border border-amber-300 text-amber-800"
                          title="A material-field change is awaiting approval"
                        >
                          CHANGE PENDING
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(r.status))}>
                      {formatStatus(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/masters/items/${r.id}`)} title="Edit"
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
