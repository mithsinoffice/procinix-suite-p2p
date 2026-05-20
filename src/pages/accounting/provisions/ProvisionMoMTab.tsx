import { useState } from 'react'
import { Lightbulb, X, Check } from 'lucide-react'
import { cn, toArray } from '../../../lib/utils'
import {
  useProvisionMoM, useProvisionSuggestions, useAcceptSuggestion,
  type MoMStatus, type MoMItem, type Suggestion,
} from '../../../lib/api/provisions.api'

const STATUS_CLASSES: Record<MoMStatus, string> = {
  INV:   'bg-emerald-50 text-emerald-800 border-emerald-200',
  PROV:  'bg-blue-50 text-blue-800 border-blue-200',
  MAN:   'bg-purple-50 text-purple-800 border-2 border-dashed border-purple-300',
  MISS:  'bg-red-50 text-red-800 border-red-200',
  NA:    'bg-muted/40 text-muted-foreground border-muted',
}

export default function ProvisionMoMTab() {
  const currentPeriod = new Date().toISOString().slice(0, 7)
  const { data, isLoading, error } = useProvisionMoM(6)
  const { data: suggRaw } = useProvisionSuggestions(currentPeriod)
  const accept = useAcceptSuggestion()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [editingAmount, setEditingAmount] = useState<Record<string, number>>({})
  const [promoteOpen, setPromoteOpen] = useState<Set<string>>(new Set())

  const items = toArray<MoMItem>(data?.items)
  const months = data?.months ?? []
  const suggestions = toArray<Suggestion>(suggRaw).filter(s => !dismissed.has(s.itemId + s.type))

  if (isLoading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
        <p className="text-sm font-medium text-red-800">Could not load month-on-month view.</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Unknown error — check /api/provisions/mom'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
        <span>Legend:</span>
        <LegendChip status="INV" />
        <LegendChip status="PROV" />
        <LegendChip status="MAN" />
        <LegendChip status="MISS" />
        <LegendChip status="NA" />
      </div>

      {/* MoM grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Master</th>
                {months.map(m => (
                  <th key={m} className="px-2 py-2 text-center font-medium">{labelFor(m)}</th>
                ))}
                <th className="px-3 py-2 text-right">6-mo total</th>
                <th className="px-3 py-2 text-center">Gaps</th>
                <th className="px-3 py-2 text-left">Pattern</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map(it => {
                const isManualRow = it.frequency === 'MANUAL'
                const promoteShown = isManualRow && promoteOpen.has(it.itemId)
                return (
                  <>
                    <tr key={it.itemId}>
                      <td className="px-3 py-2 font-medium">
                        {it.description}
                        {isManualRow && (
                          <button
                            type="button"
                            onClick={() =>
                              setPromoteOpen(prev => {
                                const next = new Set(prev)
                                if (next.has(it.itemId)) next.delete(it.itemId); else next.add(it.itemId)
                                return next
                              })
                            }
                            className="ml-2 rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-medium hover:bg-purple-200"
                          >
                            Promote to recurring →
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.masterAmount ? `₹${it.masterAmount.toLocaleString('en-IN')}` : '—'}</td>
                      {months.map(m => (
                        <td key={m} className="px-1 py-1 align-top">
                          <Cell cell={it.months[m]} />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right tabular-nums">₹{it.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-center">
                        {it.gapCount > 0 ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700">{it.gapCount}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <PatternChip pattern={it.pattern} />
                      </td>
                    </tr>
                    {promoteShown && (
                      <PromotePanel itemId={it.itemId} description={it.description} masterAmount={it.masterAmount} />
                    )}
                  </>
                )
              })}
              {items.length === 0 && (
                <tr><td colSpan={months.length + 5} className="px-3 py-6 text-center text-muted-foreground">No provisionable items.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System suggestions</h3>
        </div>
        {suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No suggestions — everything looks consistent.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestions.map(s => (
              <SuggestionCard
                key={s.itemId + s.type}
                suggestion={s}
                editingAmount={editingAmount[s.itemId + s.type]}
                onAmountChange={v => setEditingAmount(prev => ({ ...prev, [s.itemId + s.type]: v }))}
                onAccept={async () => {
                  const final = editingAmount[s.itemId + s.type] ?? s.suggestedAmount
                  await accept.mutateAsync({ type: s.type, itemId: s.itemId, suggestedAmount: final, frequency: s.frequency })
                  setDismissed(prev => { const n = new Set(prev); n.add(s.itemId + s.type); return n })
                }}
                onDismiss={() =>
                  setDismissed(prev => { const n = new Set(prev); n.add(s.itemId + s.type); return n })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PromotePanel({ itemId, description, masterAmount }: { itemId: string; description: string; masterAmount: number }) {
  const accept = useAcceptSuggestion()
  const [frequency, setFrequency] = useState('MONTHLY')
  const [amount, setAmount] = useState(masterAmount)
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    if (itemId.startsWith('manual::')) {
      setMsg('Manual additions need to be linked to an item master row before promotion.')
      return
    }
    const res = await accept.mutateAsync({ type: 'PROMOTE_TO_RECURRING', itemId, suggestedAmount: amount, frequency })
    setMsg(res.ok ? 'Promoted — item master updated.' : res.message ?? 'Could not promote.')
  }

  return (
    <tr className="bg-purple-50/30">
      <td colSpan={99} className="px-3 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-[11px] font-medium text-muted-foreground">Promote "{description}":</span>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Frequency</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value)} className="rounded border border-input bg-background px-2 py-1 text-xs">
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Amount</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-32 rounded border border-input bg-background px-2 py-1 text-xs text-right" />
          </div>
          <button type="button" onClick={save} disabled={accept.isPending} className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60">
            Save to item master & promote
          </button>
          {msg && <span className="text-[11px] text-muted-foreground">{msg}</span>}
        </div>
      </td>
    </tr>
  )
}

function Cell({ cell }: { cell: { status: MoMStatus; amount: number; jvRef?: string; invoiceRef?: string; isManual?: boolean } | undefined }) {
  if (!cell) return <div className="h-10" />
  const title = [
    cell.invoiceRef && `Invoice: ${cell.invoiceRef}`,
    cell.jvRef     && `JV: ${cell.jvRef.slice(0, 8)}`,
  ].filter(Boolean).join('  ·  ')
  return (
    <div
      title={title}
      className={cn('mx-auto w-full rounded border px-1.5 py-1 text-center', STATUS_CLASSES[cell.status])}
    >
      <div className="text-[9px] font-semibold uppercase tracking-wider">{cell.status}</div>
      <div className="text-[10px] tabular-nums">{cell.amount ? `₹${(cell.amount / 1000).toFixed(0)}k` : '—'}</div>
    </div>
  )
}

function LegendChip({ status }: { status: MoMStatus }) {
  const labels: Record<MoMStatus, string> = {
    INV: 'Invoice received', PROV: 'Provisioned', MAN: 'Manual', MISS: 'Missing', NA: 'Not applicable',
  }
  return (
    <span className={cn('rounded border px-1.5 py-0.5 text-[10px]', STATUS_CLASSES[status])}>
      {status} · {labels[status]}
    </span>
  )
}

function PatternChip({ pattern }: { pattern: MoMItem['pattern'] }) {
  const map: Record<MoMItem['pattern'], string> = {
    CONSISTENT:       'bg-emerald-100 text-emerald-700',
    GAPS:             'bg-amber-100 text-amber-700',
    MANUAL:           'bg-purple-100 text-purple-700',
    UNDER_PROVISION:  'bg-red-100 text-red-700',
  }
  const labels: Record<MoMItem['pattern'], string> = {
    CONSISTENT:       'Consistent',
    GAPS:             'Gaps',
    MANUAL:           'Manual',
    UNDER_PROVISION:  'Under-provision',
  }
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[pattern]}`}>{labels[pattern]}</span>
}

function SuggestionCard({ suggestion, editingAmount, onAmountChange, onAccept, onDismiss }: {
  suggestion: Suggestion
  editingAmount: number | undefined
  onAmountChange: (v: number) => void
  onAccept: () => void
  onDismiss: () => void
}) {
  const confidenceTone = {
    HIGH:   'bg-emerald-100 text-emerald-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW:    'bg-muted text-muted-foreground',
  }[suggestion.confidence]

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold">{titleForType(suggestion.type)}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${confidenceTone}`}>{suggestion.confidence}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">{suggestion.message}</p>
          {suggestion.canAccept && suggestion.suggestedAmount != null && (
            <div className="mb-2">
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Edit amount</label>
              <input
                type="number"
                value={editingAmount ?? suggestion.suggestedAmount}
                onChange={e => onAmountChange(Number(e.target.value))}
                className="w-32 rounded border border-input bg-background px-2 py-1 text-xs text-right"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            {suggestion.canAccept && (
              <button type="button" onClick={onAccept} className="flex items-center gap-1 rounded-md bg-teal-600 px-2 py-1 text-[11px] font-medium text-white hover:opacity-90">
                <Check className="h-3 w-3" /> Accept
              </button>
            )}
            <button type="button" onClick={onDismiss} className="flex items-center gap-1 rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-muted">
              <X className="h-3 w-3" /> Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function titleForType(type: Suggestion['type']): string {
  switch (type) {
    case 'PROMOTE_TO_RECURRING':    return 'Promote to recurring'
    case 'UPDATE_PROVISION_AMOUNT': return 'Update provision amount'
    case 'BACKDATE_JV':             return 'Backdate JV (gap alert)'
  }
}

function labelFor(period: string): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, 1))
  return d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })
}
