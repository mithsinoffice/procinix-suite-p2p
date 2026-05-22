import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Mail, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { http, HttpError } from '../../lib/http'
import { MasterPageHeader } from '../../components/masters/MasterFormLayout'
import { formatDate, formatCurrency, formatStatus, getStatusColor } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

const AP_LANES = [
  { id: 'ALL',    label: 'All' },
  { id: 'STP',    label: 'STP'    },
  { id: 'REVIEW', label: 'Review' },
  { id: 'MANUAL', label: 'Manual' },
]

// Single A→F form handles every invoice — the form itself flips to read-only
// when the status is terminal/post-workflow, so routing collapses to /:id.
// Editable statuses surface as "Review" so reviewers spot work pending.
const EDITABLE_STATUSES = new Set(['DRAFT', 'INGESTED', 'NEEDS_REVIEW', 'ON_HOLD'])
function rowLabel(inv: { status?: string | null }): 'Review' | 'View' {
  return inv.status && EDITABLE_STATUSES.has(inv.status) ? 'Review' : 'View'
}

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

interface PollJobStatus { processed: number; errors: string[]; done: boolean; startedAt: string }

export default function InvoiceListPage() {
  const navigate        = useNavigate()
  const queryClient     = useQueryClient()
  const [status, setStatus]       = useState('ALL')
  const [apLane, setApLane]       = useState('ALL')
  const [search, setSearch]       = useState('')
  const [duplicate, setDuplicate] = useState<'OFF' | 'ANY' | 'EXACT' | 'SUSPICIOUS'>('OFF')
  const [pollBanner, setPollBanner] = useState<{ tone: 'success' | 'error'; text: string; detail?: string } | null>(null)
  const [pollJobId, setPollJobId]   = useState<string | null>(null)
  const [pollStatus, setPollStatus] = useState<PollJobStatus | null>(null)

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['invoices', status, apLane, search, duplicate],
    queryFn: () => {
      const p = new URLSearchParams()
      if (status !== 'ALL') p.set('status', status)
      if (apLane !== 'ALL') p.set('apLane', apLane)
      if (search)           p.set('search', search)
      if (duplicate !== 'OFF') p.set('duplicate', duplicate)
      return http.get<any>(`/api/invoices?${p}`).then((r: any) => Array.isArray(r) ? r : (r?.data ?? []))
    },
    gcTime:         0,
    refetchOnMount: true,
    staleTime:      30_000,
  })

  // Trigger fires the poll on the server and immediately returns a jobId.
  // The setInterval below polls /status/:jobId every 2s until done — this lets
  // us show live progress instead of a single open request that hangs for minutes.
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

  // Poll /status/:jobId every 2s while a job is running. Stops when done.
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

  // Auto-dismiss the success banner after 6s
  useEffect(() => {
    if (pollBanner?.tone !== 'success') return
    const t = setTimeout(() => setPollBanner(null), 6000)
    return () => clearTimeout(t)
  }, [pollBanner])

  const isPolling = pollEmails.isPending || !!pollJobId

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Invoices"
        description="AP invoice processing — OCR ingestion, match scoring, approval workflow"
        backLabel="Dashboard"
        backTo="/dashboard"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => pollEmails.mutate()} disabled={isPolling}
              className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
              {isPolling
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Mail className="h-3.5 w-3.5" />}
              {isPolling
                ? `Polling… (${pollStatus?.processed ?? 0} processed)`
                : 'Poll emails'}
            </button>
            <button onClick={() => navigate('/invoices/new')}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> New Invoice
            </button>
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

      {/* Status tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {STATUS_TABS.map(s => (
          <button key={s.value} onClick={() => setStatus(s.value)}
            className={cn(
              'px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
              status === s.value
                ? s.amber ? 'border-amber-500 text-amber-600' : 'border-primary text-primary'
                : s.amber ? 'border-transparent text-amber-600/70 hover:text-amber-600' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border sm:px-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="search" placeholder="Search invoice no, vendor…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {AP_LANES.map(l => (
            <button key={l.id} onClick={() => setApLane(l.id)}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                apLane === l.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {l.label}
            </button>
          ))}
        </div>
        {/* Duplicates filter chip — three-state: off → all flagged → exact only.
            Click cycles. Reads the duplicateFlag column populated by the
            duplicate-detector service at ingestion. */}
        <button
          type="button"
          onClick={() => setDuplicate(d => d === 'OFF' ? 'ANY' : d === 'ANY' ? 'EXACT' : 'OFF')}
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
            duplicate === 'OFF'   ? 'border-input text-muted-foreground hover:text-foreground' :
            duplicate === 'EXACT' ? 'border-red-200 bg-red-50 text-red-700'
                                  : 'border-amber-200 bg-amber-50 text-amber-700',
          )}
          title="Filter by duplicate flag (off → any → exact)"
        >
          Duplicates{duplicate === 'OFF' ? '' : ` · ${duplicate.toLowerCase()}`}
        </button>
      </div>

      {/* Table */}
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
                {['Invoice no.','Vendor','Entity','Date','Due','Amount','TDS','Net payable','Lane','Status',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => {
                const dupFlag    = inv.duplicateFlag as string | null | undefined
                const isExactDup = dupFlag === 'EXACT'
                const hasDup     = !!dupFlag
                return (
                <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                  className={cn(
                    'border-b border-border cursor-pointer',
                    hasDup
                      ? 'bg-red-50/70 hover:bg-red-100/70 border-l-[3px] border-l-red-500'
                      : 'hover:bg-muted/20',
                  )}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-xs">{inv.vendor?.legalName}</div>
                    <div className="text-xs text-muted-foreground">{inv.vendor?.vendorCode}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{inv.entityName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(inv.invoiceDate)}</td>
                  <td className="px-4 py-3 text-xs">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums">{formatCurrency(inv.totalAmount, inv.currencyCode)}</td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums text-amber-600">{formatCurrency(inv.tdsAmount, inv.currencyCode)}</td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums font-semibold">{formatCurrency(inv.netPayable, inv.currencyCode)}</td>
                  <td className="px-4 py-3">
                    {inv.apLane && (
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold border',
                        inv.apLane === 'STP'    ? 'bg-green-50 text-green-700 border-green-200' :
                        inv.apLane === 'REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                  'bg-red-50 text-red-700 border-red-200')}>
                        {inv.apLane}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(inv.status))}>
                        {formatStatus(inv.status)}
                      </span>
                      {isExactDup && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-600 text-white px-2 py-1 text-xs font-bold shadow-sm">
                          ⚠ Exact duplicate
                        </span>
                      )}
                      {hasDup && !isExactDup && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 text-white px-2 py-1 text-xs font-bold shadow-sm">
                          ⚠ Possible duplicate
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="text-xs text-primary hover:underline">
                      {rowLabel(inv)}
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
