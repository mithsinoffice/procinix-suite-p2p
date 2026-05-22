import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Mail, Loader2, CheckCircle2, AlertTriangle, ChevronDown,
  FileText, IndianRupee, Wallet, Clock, AlertCircle, SlidersHorizontal,
  LayoutGrid, LayoutList, MoreVertical, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { http, HttpError } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { formatDate, formatCurrency, formatINRCompact, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

// ── Constants ──────────────────────────────────────────────────────────────

const AP_LANES = [
  { id: 'ALL',    label: 'All'    },
  { id: 'STP',    label: 'STP'    },
  { id: 'REVIEW', label: 'Review' },
  { id: 'MANUAL', label: 'Manual' },
]

const STATUS_TABS: { value: string; label: string; amber?: boolean }[] = [
  { value: 'ALL',               label: 'All'               },
  { value: 'UNMATCHED',         label: 'Unmatched',        amber: true },
  { value: 'DRAFT',             label: 'Draft'             },
  { value: 'SUBMITTED',         label: 'Submitted'         },
  { value: 'PENDING_L1',        label: 'Pending L1'        },
  { value: 'PENDING_L2',        label: 'Pending L2'        },
  { value: 'APPROVED',          label: 'Approved'          },
  { value: 'ON_HOLD',           label: 'On Hold'           },
  { value: 'REJECTED',          label: 'Rejected'          },
  { value: 'PAYMENT_INITIATED', label: 'Payment Initiated' },
  { value: 'PAID',              label: 'Paid'              },
]

// Form treats these as "still in progress" — listing surfaces them with a
// "Review" action; everything else gets "View" (read-only form).
const EDITABLE_STATUSES = new Set(['DRAFT', 'INGESTED', 'NEEDS_REVIEW', 'ON_HOLD'])
function rowLabel(inv: { status?: string | null }): 'Review' | 'View' {
  return inv.status && EDITABLE_STATUSES.has(inv.status) ? 'Review' : 'View'
}

const PAGE_SIZES = [10, 25, 50, 100]

interface PollJobStatus { processed: number; errors: string[]; done: boolean; startedAt: string }

interface SummaryResponse {
  statusCounts: Record<string, number>
  footer: {
    totalInvoices: number; totalAmount: number; netPayable: number;
    pendingApproval: number; overdue: number;
  }
}

interface AdvancedFilters {
  dateFrom:  string
  dateTo:    string
  amountMin: string
  amountMax: string
}

const EMPTY_ADV: AdvancedFilters = { dateFrom: '', dateTo: '', amountMin: '', amountMax: '' }

// Overdue rule (matches server-side count in getInvoiceSummary).
const NON_OVERDUE_STATUSES = new Set(['PAID', 'APPROVED', 'REJECTED', 'CANCELLED'])
function isOverdue(inv: { dueDate?: string | null; status?: string | null }): boolean {
  if (!inv.dueDate) return false
  if (inv.status && NON_OVERDUE_STATUSES.has(inv.status)) return false
  return new Date(inv.dueDate).getTime() < Date.now()
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function InvoiceListPage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  const [status,       setStatus]       = useState('ALL')
  const [apLane,       setApLane]       = useState('ALL')
  const [search,       setSearch]       = useState('')
  const [duplicate,    setDuplicate]    = useState<'OFF' | 'ANY' | 'EXACT' | 'SUSPICIOUS'>('OFF')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advanced,     setAdvanced]     = useState<AdvancedFilters>(EMPTY_ADV)
  const [appliedAdv,   setAppliedAdv]   = useState<AdvancedFilters>(EMPTY_ADV)
  const [viewMode,     setViewMode]     = useState<'list' | 'grid'>('list')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(10)
  const [pollBanner,   setPollBanner]   = useState<{ tone: 'success' | 'error'; text: string; detail?: string } | null>(null)
  const [pollJobId,    setPollJobId]    = useState<string | null>(null)
  const [pollStatus,   setPollStatus]   = useState<PollJobStatus | null>(null)
  const [newMenuOpen,  setNewMenuOpen]  = useState(false)
  const [rowMenuId,    setRowMenuId]    = useState<string | null>(null)

  // Reset to page 1 whenever a filter changes — otherwise stale pagination can
  // leave a user staring at an empty page 3 when the result set shrank to 5.
  const filtersKey = `${status}|${apLane}|${search}|${duplicate}|${appliedAdv.dateFrom}|${appliedAdv.dateTo}|${appliedAdv.amountMin}|${appliedAdv.amountMax}`
  const lastFiltersKey = useRef(filtersKey)
  useEffect(() => {
    if (lastFiltersKey.current !== filtersKey) {
      lastFiltersKey.current = filtersKey
      setPage(1)
    }
  }, [filtersKey])

  // ── Data ────────────────────────────────────────────────────────────────

  const { data: listResp, isLoading, refetch } = useQuery({
    queryKey: ['invoices', filtersKey, page, pageSize],
    queryFn: () => {
      const p = new URLSearchParams()
      if (status !== 'ALL') p.set('status', status)
      if (apLane !== 'ALL') p.set('apLane', apLane)
      if (search)           p.set('search', search)
      if (duplicate !== 'OFF') p.set('duplicate', duplicate)
      if (appliedAdv.dateFrom)  p.set('dateFrom',  appliedAdv.dateFrom)
      if (appliedAdv.dateTo)    p.set('dateTo',    appliedAdv.dateTo)
      if (appliedAdv.amountMin) p.set('amountMin', appliedAdv.amountMin)
      if (appliedAdv.amountMax) p.set('amountMax', appliedAdv.amountMax)
      p.set('page',     String(page))
      p.set('pageSize', String(pageSize))
      return http.get<{ data: any[]; total: number }>(`/api/invoices?${p}`)
    },
    gcTime:         0,
    refetchOnMount: true,
    staleTime:      30_000,
  })
  const invoices = listResp?.data  ?? []
  const total    = listResp?.total ?? 0

  const { data: summary } = useQuery<SummaryResponse>({
    queryKey: ['invoices-summary'],
    queryFn:  () => http.get<SummaryResponse>('/api/invoices/summary'),
    staleTime: 30_000,
  })
  const counts = summary?.statusCounts ?? {}
  const footer = summary?.footer

  // ── Email poll trigger (preserved verbatim) ─────────────────────────────

  const pollEmails = useMutation({
    mutationFn: () => http.post<{ jobId: string; message: string }>('/api/email-poll/trigger', {}),
    onSuccess:  (res) => {
      setPollJobId(res.jobId)
      setPollStatus({ processed: 0, errors: [], done: false, startedAt: new Date().toISOString() })
      setPollBanner(null)
    },
    onError: (err: unknown) => {
      const msg = err instanceof HttpError ? err.error.message : err instanceof Error ? err.message : 'Email poll failed — check server logs'
      setPollBanner({ tone: 'error', text: 'Email poll failed', detail: msg })
    },
  })

  useEffect(() => {
    if (!pollJobId || pollStatus?.done) return
    const interval = setInterval(async () => {
      try {
        const next = await http.get<PollJobStatus>(`/api/email-poll/status/${pollJobId}`)
        setPollStatus(next)
        if (next.done) {
          clearInterval(interval)
          setPollJobId(null)
          queryClient.invalidateQueries({ queryKey: ['invoices'] })
          queryClient.invalidateQueries({ queryKey: ['invoices-summary'] })
          refetch()
          const processed = next.processed ?? 0
          const errCount  = next.errors?.length ?? 0
          setPollBanner({
            tone:   processed > 0 || errCount === 0 ? 'success' : 'error',
            text:   `Email poll complete — ${processed} invoice${processed === 1 ? '' : 's'} ingested` + (errCount ? `, ${errCount} skipped` : ''),
            detail: errCount ? next.errors.slice(0, 3).join(' · ') : undefined,
          })
        }
      } catch { /* transient — try again next tick */ }
    }, 2000)
    return () => clearInterval(interval)
  }, [pollJobId, pollStatus?.done, queryClient, refetch])

  useEffect(() => {
    if (pollBanner?.tone !== 'success') return
    const t = setTimeout(() => setPollBanner(null), 6000)
    return () => clearTimeout(t)
  }, [pollBanner])

  // Close popovers on outside click.
  useEffect(() => {
    const close = () => { setNewMenuOpen(false); setRowMenuId(null) }
    if (newMenuOpen || rowMenuId) {
      document.addEventListener('click', close)
      return () => document.removeEventListener('click', close)
    }
  }, [newMenuOpen, rowMenuId])

  const isPolling = pollEmails.isPending || !!pollJobId

  // ── Derived values ──────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageStart  = total === 0 ? 0 : (page - 1) * pageSize + 1
  const pageEnd    = Math.min(total, page * pageSize)
  const pageNums   = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages])

  const duplicateCount = (counts.UNMATCHED ?? 0) // approximation if no dedicated count; the chip works as a filter regardless

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background">
      <MasterPageHeader
        title="Invoices"
        description="AI-powered invoice processing with OCR, matching & approval workflow"
        backLabel="Dashboard"
        backTo="/dashboard"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => pollEmails.mutate()}
              disabled={isPolling}
              className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
            >
              {isPolling
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Mail className="h-3.5 w-3.5" />}
              {isPolling
                ? `Polling… (${pollStatus?.processed ?? 0} processed)`
                : 'Poll emails'}
            </button>
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setNewMenuOpen(v => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" /> New Invoice
                <ChevronDown className="h-3 w-3" />
              </button>
              {newMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-popover shadow-md z-20">
                  <button
                    onClick={() => { setNewMenuOpen(false); navigate('/invoices/new?type=direct') }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-muted rounded-t-lg"
                  >
                    Direct invoice
                  </button>
                  <button
                    onClick={() => { setNewMenuOpen(false); navigate('/invoices/new?type=po') }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-muted rounded-b-lg"
                  >
                    PO-linked invoice
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      />

      {pollBanner && (
        <div className={cn(
          'flex items-start gap-2 border-b px-4 py-2.5 sm:px-6',
          pollBanner.tone === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-amber-50 border-amber-200 text-amber-800',
        )}>
          {pollBanner.tone === 'success'
            ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            : <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{pollBanner.text}</p>
            {pollBanner.detail && <p className="text-xs opacity-80 mt-0.5 truncate" title={pollBanner.detail}>{pollBanner.detail}</p>}
          </div>
          <button onClick={() => setPollBanner(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* ── Status tabs with live counts ─────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-4 sm:px-6">
        <div className="flex gap-0 overflow-x-auto">
          {STATUS_TABS.map(s => {
            const isActive = status === s.value
            const count    = counts[s.value]
            return (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
                  isActive
                    ? s.amber ? 'border-amber-500 text-amber-600' : 'border-primary text-primary'
                    : s.amber ? 'border-transparent text-amber-600/70 hover:text-amber-600' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {s.label}
                {typeof count === 'number' && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                    isActive
                      ? s.amber ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Search + filter bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border sm:px-6 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search invoice no., vendor, entity…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {AP_LANES.map(l => (
            <button
              key={l.id}
              onClick={() => setApLane(l.id)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                apLane === l.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Duplicates filter chip — three-state: off → all flagged → exact only.
            Click cycles. Reads the duplicateFlag column populated by the
            duplicate-detector service at ingestion. */}
        <button
          type="button"
          onClick={() => setDuplicate(d => d === 'OFF' ? 'ANY' : d === 'ANY' ? 'EXACT' : 'OFF')}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
            duplicate === 'OFF'   ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' :
            duplicate === 'EXACT' ? 'border-red-200 bg-red-50 text-red-700' :
                                    'border-amber-300 bg-amber-100 text-amber-800',
          )}
          title="Filter by duplicate flag (off → any → exact)"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Duplicates
          {duplicate !== 'OFF' && <span className="ml-0.5 text-[10px] opacity-80">· {duplicate.toLowerCase()}</span>}
          {duplicate === 'OFF' && duplicateCount > 0 && (
            <span className="ml-0.5 rounded-full bg-amber-200 px-1.5 text-[10px] font-semibold tabular-nums">
              {duplicateCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setAdvancedOpen(v => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Advanced Filters
        </button>

        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-1 rounded-md transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            title="List view"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-1 rounded-md transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {advancedOpen && (
        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FilterField label="Date from">
              <input type="date" value={advanced.dateFrom}
                onChange={e => setAdvanced(s => ({ ...s, dateFrom: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs" />
            </FilterField>
            <FilterField label="Date to">
              <input type="date" value={advanced.dateTo}
                onChange={e => setAdvanced(s => ({ ...s, dateTo: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs" />
            </FilterField>
            <FilterField label="Amount min (₹)">
              <input type="number" inputMode="numeric" min="0" value={advanced.amountMin}
                onChange={e => setAdvanced(s => ({ ...s, amountMin: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs" />
            </FilterField>
            <FilterField label="Amount max (₹)">
              <input type="number" inputMode="numeric" min="0" value={advanced.amountMax}
                onChange={e => setAdvanced(s => ({ ...s, amountMax: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs" />
            </FilterField>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setAppliedAdv(advanced)}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Apply filters
            </button>
            <button
              onClick={() => { setAdvanced(EMPTY_ADV); setAppliedAdv(EMPTY_ADV) }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Table / empty state ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">No invoices found</p>
            <button onClick={() => navigate('/invoices/new')} className="mt-3 text-sm text-primary hover:underline">Create first invoice</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0">
              <tr>
                {['Invoice no.', 'Vendor', 'Entity', 'Date', 'Due', 'Amount', 'TDS', 'Net payable', 'Lane', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => {
                const dupFlag    = inv.duplicateFlag as string | null | undefined
                const isExactDup = dupFlag === 'EXACT'
                const hasDup     = !!dupFlag
                const overdue    = isOverdue(inv)
                return (
                  <tr key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className={cn(
                      'border-b border-border cursor-pointer transition-colors',
                      hasDup
                        ? 'bg-red-50/70 hover:bg-red-100/70 border-l-[3px] border-l-red-500'
                        : 'hover:bg-muted/30',
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-medium text-primary">{inv.invoiceNumber}</span>
                        {isExactDup && (
                          <span className="inline-flex w-fit items-center gap-1 rounded bg-red-600 text-white px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                            ⚠ Duplicate
                          </span>
                        )}
                        {hasDup && !isExactDup && (
                          <span className="inline-flex w-fit items-center gap-1 rounded bg-amber-500 text-white px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                            ⚠ Possible dup
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-xs">{inv.vendor?.legalName ?? '—'}</div>
                      {inv.vendor?.vendorCode && (
                        <div className="text-[11px] text-muted-foreground">{inv.vendor.vendorCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{inv.entityName ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-4 py-3 text-xs">
                      {inv.dueDate ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={cn('flex items-center gap-1', overdue && 'text-red-600 font-medium')}>
                            {overdue && <Clock className="h-3 w-3" />}
                            {formatDate(inv.dueDate)}
                          </span>
                          {overdue && (
                            <span className="inline-flex w-fit items-center rounded bg-red-100 text-red-700 px-1.5 py-0.5 text-[10px] font-semibold">
                              Overdue
                            </span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono tabular-nums">{formatCurrency(inv.totalAmount, inv.currencyCode)}</td>
                    <td className={cn('px-4 py-3 text-xs font-mono tabular-nums', Number(inv.tdsAmount) > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                      {formatCurrency(inv.tdsAmount, inv.currencyCode)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono tabular-nums font-semibold">{formatCurrency(inv.netPayable, inv.currencyCode)}</td>
                    <td className="px-4 py-3">
                      {inv.apLane && (
                        <LaneBadge lane={inv.apLane} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(inv.status))}>
                        {formatStatus(inv.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          {rowLabel(inv)}
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setRowMenuId(id => id === inv.id ? null : inv.id) }}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="More actions"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                          {rowMenuId === inv.id && (
                            <RowMenu
                              invoiceId={inv.id}
                              status={inv.status}
                              onClose={() => setRowMenuId(null)}
                              navigate={navigate}
                              afterMutate={() => {
                                queryClient.invalidateQueries({ queryKey: ['invoices'] })
                                queryClient.invalidateQueries({ queryKey: ['invoices-summary'] })
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Stats footer bar (5 cards) ───────────────────────────────────── */}
      {footer && (
        <div className="border-t border-border bg-muted/30 px-4 py-2.5 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={<FileText className="h-4 w-4 text-primary" />}
              label="Total Invoices" value={String(footer.totalInvoices)} sub="Across all statuses" />
            <StatCard icon={<IndianRupee className="h-4 w-4 text-blue-600" />}
              label="Total Amount" value={formatINRCompact(footer.totalAmount)} sub="All invoice value" />
            <StatCard icon={<Wallet className="h-4 w-4 text-primary" />}
              label="Net Payable" value={formatINRCompact(footer.netPayable)} sub="After TDS & deductions" />
            <StatCard icon={<Clock className="h-4 w-4 text-amber-600" />}
              label="Pending Approval" value={String(footer.pendingApproval)} sub="Awaiting your approval" />
            <StatCard icon={<AlertCircle className="h-4 w-4 text-red-600" />}
              label="Overdue" value={String(footer.overdue)} sub="Past due invoices"
              valueColor={footer.overdue > 0 ? 'text-red-600' : undefined} />
          </div>
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-border bg-background px-4 py-2 sm:px-6 flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{pageStart}</span> to <span className="font-medium text-foreground">{pageEnd}</span> of <span className="font-medium text-foreground">{total}</span> invoice{total === 1 ? '' : 's'}
        </p>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-input p-1 text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {pageNums.map((n, i) => n === '…' ? (
            <span key={`gap-${i}`} className="px-2 text-xs text-muted-foreground">…</span>
          ) : (
            <button
              key={n}
              onClick={() => setPage(n as number)}
              className={cn(
                'min-w-[28px] rounded-md px-2 py-1 text-xs font-medium tabular-nums',
                n === page ? 'bg-primary text-primary-foreground' : 'border border-input text-muted-foreground hover:bg-muted',
              )}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-input p-1 text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Rows per page:</label>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="rounded-md border border-input bg-background px-1.5 py-1 text-xs"
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function LaneBadge({ lane }: { lane: string }) {
  const style =
    lane === 'STP'       ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    lane === 'REVIEW'    ? 'bg-amber-50 text-amber-700 border-amber-200' :
    lane === 'UNMATCHED' ? 'bg-red-50 text-red-700 border-red-200' :
                           'bg-gray-50 text-gray-700 border-gray-200'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold border', style)}>
      {lane}
    </span>
  )
}

function StatCard({ icon, label, value, sub, valueColor }: {
  icon: React.ReactNode; label: string; value: string; sub: string; valueColor?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn('text-base font-semibold mt-0.5 tabular-nums', valueColor)}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  )
}

function RowMenu({ invoiceId, status, onClose, navigate, afterMutate }: {
  invoiceId: string
  status?:   string | null
  onClose:   () => void
  navigate:  ReturnType<typeof useNavigate>
  afterMutate: () => void
}) {
  const canReject = status && ['SUBMITTED', 'PENDING_L1', 'PENDING_L2', 'ON_HOLD'].includes(status)

  const handleReject = async () => {
    const comments = window.prompt('Reason for rejecting this invoice:')
    if (!comments) return
    try {
      await http.post(`/api/invoices/${invoiceId}/reject`, { comments })
      afterMutate()
    } catch (e) {
      const msg = e instanceof HttpError ? e.error.message : e instanceof Error ? e.message : 'Reject failed'
      window.alert(msg)
    } finally {
      onClose()
    }
  }

  return (
    <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-border bg-popover shadow-md z-10"
      onClick={e => e.stopPropagation()}>
      <button onClick={() => { onClose(); navigate(`/invoices/${invoiceId}/edit`) }}
        className="w-full px-3 py-2 text-left text-xs hover:bg-muted rounded-t-lg">
        Edit
      </button>
      <button onClick={() => { onClose(); navigate(`/invoices/new?cloneFrom=${invoiceId}`) }}
        className="w-full px-3 py-2 text-left text-xs hover:bg-muted">
        Clone
      </button>
      <button onClick={() => { onClose(); window.open(`/api/invoices/${invoiceId}/file`, '_blank') }}
        className="w-full px-3 py-2 text-left text-xs hover:bg-muted">
        Download
      </button>
      <div className="border-t border-border" />
      <button onClick={handleReject}
        disabled={!canReject}
        className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 rounded-b-lg disabled:opacity-40 disabled:cursor-not-allowed">
        Reject
      </button>
    </div>
  )
}

// Builds a compact page-number array with ellipses, e.g. for 13 pages on page 5:
//   [1, '…', 4, 5, 6, '…', 13]
function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, current - 1)
  const end   = Math.min(total - 1, current + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
}
