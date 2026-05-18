import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
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

const STATUS_TABS = [
  'ALL', 'DRAFT', 'SUBMITTED', 'PENDING_L1', 'PENDING_L2',
  'APPROVED', 'ON_HOLD', 'REJECTED', 'PAYMENT_INITIATED', 'PAID',
]

export default function InvoiceListPage() {
  const navigate        = useNavigate()
  const [status, setStatus] = useState('ALL')
  const [apLane, setApLane] = useState('ALL')
  const [search, setSearch] = useState('')
  const [pollBanner, setPollBanner] = useState<{ tone: 'success' | 'error'; text: string; detail?: string } | null>(null)

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['invoices', status, apLane, search],
    queryFn: () => {
      const p = new URLSearchParams()
      if (status !== 'ALL') p.set('status', status)
      if (apLane !== 'ALL') p.set('apLane', apLane)
      if (search)           p.set('search', search)
      return http.get<any>(`/api/invoices?${p}`).then((r: any) => Array.isArray(r) ? r : (r?.data ?? []))
    },
    gcTime:         0,
    refetchOnMount: true,
    staleTime:      30_000,
  })

  const pollEmails = useMutation({
    mutationFn: () => http.post<{ processed: number; errors: string[] }>('/api/email-poll/trigger', {}),
    onSuccess:  (res) => {
      refetch()
      const errCount = res.errors?.length ?? 0
      setPollBanner({
        tone:   res.processed > 0 || errCount === 0 ? 'success' : 'error',
        text:   `Email poll complete — ${res.processed} invoice${res.processed === 1 ? '' : 's'} ingested` + (errCount ? `, ${errCount} skipped` : ''),
        detail: errCount ? res.errors.slice(0, 3).join(' · ') : undefined,
      })
    },
    onError: (err: unknown) => {
      const msg = err instanceof HttpError ? err.error.message : err instanceof Error ? err.message : 'Email poll failed — check server logs'
      setPollBanner({ tone: 'error', text: 'Email poll failed', detail: msg })
    },
  })

  // Auto-dismiss the success banner after 6s
  useEffect(() => {
    if (pollBanner?.tone !== 'success') return
    const t = setTimeout(() => setPollBanner(null), 6000)
    return () => clearTimeout(t)
  }, [pollBanner])

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Invoices"
        description="AP invoice processing — OCR ingestion, match scoring, approval workflow"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => pollEmails.mutate()} disabled={pollEmails.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
              {pollEmails.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Mail className="h-3.5 w-3.5" />}
              {pollEmails.isPending ? 'Polling…' : 'Poll emails'}
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
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
              status === s ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {s === 'ALL' ? 'All' : formatStatus(s)}
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
              {invoices.map((inv: any) => (
                <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="border-b border-border hover:bg-muted/20 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-xs">{inv.vendor?.legalName}</div>
                    <div className="text-xs text-muted-foreground">{inv.vendor?.vendorCode}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{inv.entityId ?? '—'}</td>
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
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(inv.status))}>
                      {formatStatus(inv.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/invoices/${inv.id}`)}
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
