import { Upload } from 'lucide-react'
import { useProvisionRegister, type RegisterRow } from '../../../lib/api/provisions.api'
import { toArray } from '../../../lib/utils'

export default function ProvisionRegisterTab({ period }: { period: string }) {
  const { data, isLoading, error } = useProvisionRegister(period)
  const rows = toArray<RegisterRow>(data)

  if (isLoading) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
        <p className="text-sm font-medium text-red-800">Could not load provision register.</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Unknown error — check /api/provisions/register'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Vendor</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">JV ref</th>
                <th className="px-3 py-2 text-left">DR GL</th>
                <th className="px-3 py-2 text-left">CR GL</th>
                <th className="px-3 py-2 text-left">Reversal JV</th>
                <th className="px-3 py-2 text-left">Reversal date</th>
                <th className="px-3 py-2 text-left">ERP status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-medium">{r.description}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.vendorName ?? '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">₹{r.amount.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{r.jvRef ? r.jvRef.slice(0, 8) : '—'}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{r.debitGl}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{r.creditGl}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{r.reversalJvRef ? r.reversalJvRef.slice(0, 8) : '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.reversalDate ? new Date(r.reversalDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-3 py-2">
                    <ErpStatusChip status={r.erpStatus} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No approved provisions for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled
          title="ERP push not yet wired for provisions"
          className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium opacity-60"
        >
          <Upload className="h-3 w-3" /> Push pending to ERP
        </button>
      </div>
    </div>
  )
}

function ErpStatusChip({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>
  const map: Record<string, string> = {
    SYNCED:           'bg-emerald-100 text-emerald-700',
    PENDING:          'bg-amber-100 text-amber-700',
    FAILED:           'bg-red-100 text-red-700',
    SKIPPED:          'bg-muted text-muted-foreground',
    MANUAL_OVERRIDE:  'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status] ?? 'bg-muted'}`}>
      {status}
    </span>
  )
}
