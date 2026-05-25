import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { cn } from '../../lib/utils'
import { formatCurrency, formatDate } from '../../lib/utils/formatters'

// ── Type discriminator ────────────────────────────────────────────────────
// 'INVOICE' | 'PR' | 'PO' come from the backend (routes/invoices.ts emits
// `module` per row). The three vendor-governance types are surfaced via mock
// rows until the workflow engine starts emitting them.
type ApprovalType =
  | 'INVOICE' | 'PR' | 'PO'
  | 'VENDOR_ONBOARDING' | 'VENDOR_CHANGE' | 'RISK_ESCALATION'

interface ApprovalRow {
  id:           string
  module:       ApprovalType
  reference:    string                                    // invoice number, PR ref, vendor request id, etc.
  subject:      string                                    // vendor name, requester name, etc.
  amount?:      number | null                             // null when the row isn't money-shaped (e.g. risk escalation)
  currencyCode?: string
  stageLabel:   string                                    // 'PENDING_L2', 'High Risk', 'Awaiting CFO', etc.
  slaDeadline?: string | null
  // Vendor-governance extras — only set on vendor types, rendered inline in
  // the Stage cell to avoid breaking the column count.
  riskScore?:   number
  priority?:    'High' | 'Medium' | 'Low'
  approvalId?:  string                                    // origin stage id, used to round-trip back to the desk
}

// ── Type filter definitions ───────────────────────────────────────────────
const TYPE_FILTERS: { id: 'ALL' | ApprovalType; label: string }[] = [
  { id: 'ALL',               label: 'All'                     },
  { id: 'PR',                label: 'Purchase Requests'       },
  { id: 'PO',                label: 'Purchase Orders'         },
  { id: 'INVOICE',           label: 'Invoices'                },
  { id: 'VENDOR_ONBOARDING', label: 'Vendor Onboarding'       },
  { id: 'VENDOR_CHANGE',     label: 'Vendor Change Requests'  },
  { id: 'RISK_ESCALATION',   label: 'Risk Escalations'        },
]

// Mock data for the three vendor-governance approval sources. The workflow
// engine will emit these for real once the vendor-portal pages are wired up
// server-side; until then these stand in so the desk shows the shape.
const MOCK_VENDOR_APPROVALS: ApprovalRow[] = [
  {
    id:         'mock-vo-1',
    approvalId: 'mock-vo-1-stage',
    module:     'VENDOR_ONBOARDING',
    reference:  'VR-2026-0234',
    subject:    'Tech Innovators Pvt Ltd',
    stageLabel: 'Compliance Review',
    riskScore:  25,
    priority:   'Medium',
    slaDeadline: '2026-05-28',
  },
  {
    id:         'mock-vo-2',
    approvalId: 'mock-vo-2-stage',
    module:     'VENDOR_ONBOARDING',
    reference:  'VR-2026-0237',
    subject:    'Eastern Manufacturing Ltd',
    stageLabel: 'High-risk Review',
    riskScore:  82,
    priority:   'High',
    slaDeadline: '2026-05-26',
  },
  {
    id:         'mock-vc-1',
    approvalId: 'mock-vc-1-stage',
    module:     'VENDOR_CHANGE',
    reference:  'CR-2026-0089',
    subject:    'Deutsche Logistics GmbH',
    stageLabel: 'Bank Detail Change',
    priority:   'High',
    slaDeadline: '2026-05-27',
  },
  {
    id:         'mock-vc-2',
    approvalId: 'mock-vc-2-stage',
    module:     'VENDOR_CHANGE',
    reference:  'CR-2026-0091',
    subject:    'Global Supplies Inc',
    stageLabel: 'Address Change',
    priority:   'Low',
    slaDeadline: '2026-06-01',
  },
  {
    id:         'mock-risk-1',
    approvalId: 'mock-risk-1-stage',
    module:     'RISK_ESCALATION',
    reference:  'RSK-2026-0042',
    subject:    'GlobalTech Industries Ltd',
    stageLabel: 'Sanctions Match',
    priority:   'High',
    slaDeadline: '2026-05-25',
  },
  {
    id:         'mock-risk-2',
    approvalId: 'mock-risk-2-stage',
    module:     'RISK_ESCALATION',
    reference:  'RSK-2026-0043',
    subject:    'Apex Manufacturing Inc',
    stageLabel: 'Score Increase',
    priority:   'Medium',
    slaDeadline: '2026-05-29',
  },
]

// Normalise a row from the /pending-approvals endpoint into our ApprovalRow
// shape. Backend already tags `module` per row.
function normaliseBackendRow(item: any): ApprovalRow {
  const module = (item.module ?? 'INVOICE') as 'INVOICE' | 'PR' | 'PO'
  return {
    id:           String(item.id),
    module,
    reference:    item.invoiceNumber ?? item.reference ?? item.id,
    subject:      item.vendor?.legalName ?? item.requesterName ?? '—',
    amount:       item.totalAmount ?? null,
    currencyCode: item.currencyCode ?? 'INR',
    stageLabel:   item.pendingStage?.stageName ?? item.status ?? '—',
    slaDeadline:  item.pendingStage?.slaDeadline ?? null,
    approvalId:   item.pendingStage?.id ? String(item.pendingStage.id) : undefined,
  }
}

// Type badge palette — one tone per source, picked to match the rest of the app.
const TYPE_BADGE: Record<ApprovalType, { label: string; classes: string }> = {
  INVOICE:           { label: 'Invoice',          classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  PR:                { label: 'Purchase Request', classes: 'bg-violet-50 text-violet-700 border-violet-200' },
  PO:                { label: 'Purchase Order',   classes: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  VENDOR_ONBOARDING: { label: 'Vendor Onboarding',     classes: 'bg-teal-50 text-teal-700 border-teal-200' },
  VENDOR_CHANGE:     { label: 'Vendor Change Request', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  RISK_ESCALATION:   { label: 'Risk Escalation',       classes: 'bg-red-50 text-red-700 border-red-200' },
}

const PRIORITY_TONE: Record<'High' | 'Medium' | 'Low', string> = {
  High:   'text-red-700',
  Medium: 'text-amber-700',
  Low:    'text-slate-600',
}

export default function ApprovalDeskPage() {
  const navigate = useNavigate()
  const [activeType, setActiveType] = useState<'ALL' | ApprovalType>('ALL')

  const { data: pending = [], isLoading } = useQuery({
    queryKey:        ['approval-desk'],
    queryFn:         () => http.get<any[]>('/api/invoices/pending-approvals'),
    refetchInterval: 30_000,
  })

  // Merge backend rows + vendor-governance mocks. Backend rows go first so
  // real approvals stay at the top.
  const rows = useMemo<ApprovalRow[]>(() => {
    const backend = pending.map(normaliseBackendRow)
    return [...backend, ...MOCK_VENDOR_APPROVALS]
  }, [pending])

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length }
    for (const r of rows) c[r.module] = (c[r.module] ?? 0) + 1
    return c
  }, [rows])

  const visible = activeType === 'ALL' ? rows : rows.filter(r => r.module === activeType)

  // Per-type routing for the Review action. Each detail page reads
  // `?from=approvals&approvalId=…` to render the right action set and
  // route back to the desk on cancel/submit.
  function handleReview(row: ApprovalRow) {
    const params = new URLSearchParams({ from: 'approvals' })
    if (row.approvalId) params.set('approvalId', row.approvalId)

    switch (row.module) {
      case 'INVOICE':           navigate(`/invoices/${row.id}?${params}`); break
      case 'PR':                navigate(`/intake/${row.id}?${params}`); break
      case 'PO':                navigate(`/purchase-orders/${row.id}?${params}`); break
      case 'VENDOR_ONBOARDING': navigate(`/vendor-portal/approvals/${row.id}?${params}`); break
      case 'VENDOR_CHANGE':     navigate(`/vendor-portal/change-requests/${row.id}?${params}`); break
      case 'RISK_ESCALATION':   navigate(`/vendor-portal/risk?${params}`); break
    }
  }

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Approval Desk"
        description="All pending approvals across modules — your action required"
        backLabel="Dashboard"
        backTo="/dashboard"
      />

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
        {TYPE_FILTERS.map(f => {
          const n = f.id === 'ALL' ? counts.ALL ?? 0 : counts[f.id] ?? 0
          return (
            <button
              key={f.id}
              onClick={() => setActiveType(f.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                activeType === f.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground border-border hover:bg-muted',
              )}
            >
              {f.label}
              <span className={cn(
                'inline-flex items-center justify-center min-w-[1.25rem] px-1 rounded-full text-[10px] font-semibold',
                activeType === f.id ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
              )}>
                {n}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No pending approvals in this view</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0">
              <tr>
                {['Type', 'Reference', 'Vendor / Requester', 'Amount / Risk', 'Stage', 'SLA deadline', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(row => {
                const typeMeta = TYPE_BADGE[row.module]
                return (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium border', typeMeta.classes)}>
                        {typeMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                      {row.reference}
                    </td>
                    <td className="px-4 py-3 text-xs">{row.subject}</td>
                    <td className="px-4 py-3 text-xs font-mono tabular-nums">
                      {row.module === 'VENDOR_ONBOARDING' && row.riskScore !== undefined ? (
                        <span className={cn(
                          'font-semibold',
                          row.riskScore >= 70 ? 'text-red-700' : row.riskScore >= 40 ? 'text-amber-700' : 'text-emerald-700',
                        )}>
                          Risk {row.riskScore}
                        </span>
                      ) : row.amount != null ? (
                        formatCurrency(row.amount, row.currencyCode ?? 'INR')
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs font-medium w-fit">
                          {row.stageLabel}
                        </span>
                        {row.priority && (
                          <span className={cn('text-[10px] font-semibold uppercase tracking-wider', PRIORITY_TONE[row.priority])}>
                            {row.priority} priority
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.slaDeadline ? formatDate(row.slaDeadline) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleReview(row)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
