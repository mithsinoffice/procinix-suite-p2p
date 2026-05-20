import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Save, AlertTriangle, Check, X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import {
  useProposals, useSubmitProvisionBatch, useSaveProposalsDraft,
  type Proposal,
} from '../../../lib/api/provisions.api'

export default function ProvisionOverviewTab({ period }: { period: string }) {
  const { data, isLoading, error } = useProposals(period)
  const submitMut = useSubmitProvisionBatch()
  const draftMut  = useSaveProposalsDraft()

  // Local editable state — amount edits + selection are stored here so the
  // round-trip on save/submit is the only network operation.
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [feedback, setFeedback]   = useState<string | null>(null)

  // Seed selection from server response whenever proposals reload — every
  // selectable (non-covered, non-zero) row starts as selected so the common
  // path is one click to submit.
  useEffect(() => {
    if (!data) return
    const next = new Set<string>()
    for (const p of data.proposals) {
      if (p.invoiceCovered) continue
      if (p.amountNotSet)   continue   // can't submit a zero-amount row
      next.add(keyOf(p))
    }
    setSelected(next)
    setOverrides({})
  }, [data])

  if (isLoading) return <SkeletonTable />
  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
        <p className="text-sm font-medium text-red-800">Could not load provision proposals.</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Unknown error — check /api/provisions/proposals'}
        </p>
      </div>
    )
  }

  const proposals = data.proposals
  const missingAmounts = proposals.filter(p => p.amountNotSet && !p.invoiceCovered && !p.isManual)

  // Type-A (covered) sinks to the bottom, type-B (provision-required) at top,
  // type-C (manual) sandwiched between. Items with missing amounts surface
  // below the actionable ones so the table top reads "things to act on".
  const sortedProposals = [...proposals].sort((a, b) => {
    const score = (p: Proposal) => {
      if (p.invoiceCovered) return 4
      if (p.amountNotSet)   return 3
      if (p.isManual)       return 2
      return 1
    }
    return score(a) - score(b) || a.description.localeCompare(b.description)
  })

  const totals = computeTotals(proposals, selected, overrides)
  const showFooter = totals.count > 0

  async function handleSaveDraft() {
    setFeedback(null)
    const payload = proposals
      .filter(p => selected.has(keyOf(p)) && !p.invoiceCovered)
      .map(p => ({ ...p, proposedAmount: overrides[keyOf(p)] ?? p.proposedAmount }))
    const res = await draftMut.mutateAsync({ period, proposals: payload })
    setFeedback(`Saved ${res.saved} draft proposal${res.saved === 1 ? '' : 's'}.`)
  }

  async function handleSubmit() {
    setFeedback(null)
    const toPersist = proposals
      .filter(p => selected.has(keyOf(p)) && !p.invoiceCovered)
      .map(p => ({ ...p, proposedAmount: overrides[keyOf(p)] ?? p.proposedAmount }))
    const draftRes = await draftMut.mutateAsync({ period, proposals: toPersist })
    if (draftRes.ids.length === 0) {
      setFeedback('No proposals to submit.')
      return
    }
    const amounts: Record<string, number> = {}
    draftRes.ids.forEach((id, idx) => { amounts[id] = toPersist[idx].proposedAmount })
    const submitRes = await submitMut.mutateAsync({ period, proposalIds: draftRes.ids, amounts })
    setFeedback(
      submitRes.warning === 'NO_WORKFLOW_DEFINED'
        ? `Batch saved (${draftRes.ids.length} proposals) but workflow WF-PROVISION-001 is not seeded yet.`
        : `Batch ${submitRes.batchId} submitted for approval.`,
    )
  }

  return (
    <div className="space-y-3">
      {/* Missing-amount banner — only triggers for items with neither a master
          amount nor invoice history. Items rescued by last-invoice fallback
          are submittable so they don't surface here. */}
      {missingAmounts.length > 0 && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium text-orange-900">
              {missingAmounts.length} item{missingAmounts.length === 1 ? '' : 's'} have no provision amount and no invoice history.
            </p>
            <p className="text-[11px] text-orange-800 mt-0.5">
              Set <code className="bg-orange-100 px-1 rounded">provisionAmount</code> in item master to include them in this month's provisioning.
            </p>
          </div>
          <Link
            to="/masters/items"
            className="text-[11px] font-medium text-orange-900 underline hover:no-underline whitespace-nowrap"
          >
            Go to item master →
          </Link>
        </div>
      )}

      <SummaryStrip summary={data.summary} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left w-8" />
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Vendor</th>
                <th className="px-3 py-2 text-left">Frequency</th>
                <th className="px-3 py-2 text-left">Basis</th>
                <th className="px-3 py-2 text-left">Invoice this month?</th>
                <th className="px-3 py-2 text-right">Proposed amount</th>
                <th className="px-3 py-2 text-right">Edit amount</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedProposals.map(p => (
                <ProposalRow
                  key={keyOf(p)}
                  proposal={p}
                  selected={selected}
                  overrides={overrides}
                  onToggle={k => setSelected(prev => {
                    const next = new Set(prev)
                    if (next.has(k)) next.delete(k); else next.add(k)
                    return next
                  })}
                  onAmountChange={(k, v) => setOverrides(prev => ({ ...prev, [k]: v }))}
                />
              ))}
              {sortedProposals.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No provisionable items configured for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer — only renders when at least one selectable row is checked. */}
      {showFooter && (
        <div className="sticky bottom-2 flex items-center justify-between rounded-xl border border-teal-200 bg-white shadow-md px-4 py-3">
          <div className="text-xs">
            <span className="font-medium">{totals.count}</span> selected
            <span className="text-muted-foreground"> · </span>
            <span className="font-semibold text-foreground tabular-nums">₹{totals.total.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center gap-2">
            {feedback && <span className="text-[11px] text-muted-foreground">{feedback}</span>}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={draftMut.isPending}
              className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
            >
              <Save className="h-3 w-3" /> Save draft
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitMut.isPending || draftMut.isPending}
              className="flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              <Send className="h-3 w-3" /> Submit for approval
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface ProposalRowProps {
  proposal:       Proposal
  selected:       Set<string>
  overrides:      Record<string, number>
  onToggle:       (k: string) => void
  onAmountChange: (k: string, v: number) => void
}

function ProposalRow({ proposal: p, selected, overrides, onToggle, onAmountChange }: ProposalRowProps) {
  const k = keyOf(p)
  const isSelected = selected.has(k)

  // TYPE A — Invoice covered. Greyed at 60%, disabled checkbox, green badging.
  if (p.invoiceCovered) {
    return (
      <tr className="bg-muted/20 text-muted-foreground opacity-60">
        <td className="px-3 py-2">
          <input type="checkbox" disabled checked={false} />
        </td>
        <td className="px-3 py-2 font-medium">{p.description}</td>
        <td className="px-3 py-2">{p.vendorName ?? '—'}</td>
        <td className="px-3 py-2"><FrequencyChip value={p.frequency} muted /></td>
        <td className="px-3 py-2"><BasisChip value={p.basis} muted /></td>
        <td className="px-3 py-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium">
            <Check className="h-3 w-3" /> {p.invoiceRef ?? 'Invoice'} · ₹{(p.invoiceAmount ?? 0).toLocaleString('en-IN')}
          </span>
        </td>
        <td className="px-3 py-2 text-right tabular-nums">₹{p.proposedAmount.toLocaleString('en-IN')}</td>
        <td className="px-3 py-2 text-right text-[11px]">Not needed</td>
        <td className="px-3 py-2">
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium">Invoice received</span>
        </td>
      </tr>
    )
  }

  // TYPE C tint when the row is a manual addition; otherwise TYPE B base.
  const rowClass = p.isManual ? 'bg-purple-50/30' : ''

  // Missing-amount row — keep selectable=false (zero-amount can't submit) and
  // surface the warning chip + link in the Proposed-amount column.
  // TYPE C — truly unknown (no master amount AND no invoice history).
  // Disabled checkbox, orange chip in the Proposed-amount column.
  if (p.amountNotSet) {
    return (
      <tr className={cn(rowClass)}>
        <td className="px-3 py-2">
          <input type="checkbox" disabled checked={false} />
        </td>
        <td className="px-3 py-2 font-medium">
          {p.description}
          {p.isManual && <ManualBadge />}
        </td>
        <td className="px-3 py-2 text-muted-foreground">{p.vendorName ?? '—'}</td>
        <td className="px-3 py-2"><FrequencyChip value={p.frequency} /></td>
        <td className="px-3 py-2"><BasisChip value={p.basis} /></td>
        <td className="px-3 py-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-medium">
            <X className="h-3 w-3" /> No invoice
          </span>
        </td>
        <td className="px-3 py-2 text-right">
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 text-orange-800 px-2 py-0.5 text-[10px] font-medium">
            <AlertTriangle className="h-3 w-3" /> No amount or invoice history
          </span>
          {p.itemId && (
            <div className="text-[10px] mt-1">
              <Link to={`/masters/items/${p.itemId}`} className="text-orange-900 underline hover:no-underline">
                → Update in item master
              </Link>
            </div>
          )}
        </td>
        <td className="px-3 py-2 text-right text-[11px] text-muted-foreground">—</td>
        <td className="px-3 py-2">
          <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-medium">Needs setup</span>
        </td>
      </tr>
    )
  }

  // TYPE B (provision required, has a proposable amount). Source chip
  // surfaces when the amount came from a prior invoice rather than the item
  // master — that's the case finance most often wants to fix in the master.
  const fromLastInvoice = p.amountSource === 'LAST_INVOICE'
  // Adequacy hint only fires when the master is the source of truth and a
  // prior invoice exceeded it by >20% — the "your master is stale" signal.
  const masterAdequacy =
    p.amountSource === 'ITEM_MASTER' &&
    p.lastInvoiceAmount != null &&
    p.proposedAmount > 0 &&
    p.lastInvoiceAmount > p.proposedAmount * 1.2

  return (
    <tr className={cn(rowClass)}>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(k)}
        />
      </td>
      <td className="px-3 py-2 font-medium">
        {p.description}
        {p.isManual && <ManualBadge />}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{p.vendorName ?? '—'}</td>
      <td className="px-3 py-2"><FrequencyChip value={p.frequency} /></td>
      <td className="px-3 py-2"><BasisChip value={p.basis} /></td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-medium">
          <X className="h-3 w-3" /> No invoice
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="tabular-nums font-semibold">₹{p.proposedAmount.toLocaleString('en-IN')}</div>
        {fromLastInvoice && p.lastInvoiceRef && (
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 text-[10px] font-medium">
            From last invoice · {p.lastInvoiceRef}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          className="w-28 rounded border border-input bg-background px-2 py-1 text-right text-xs"
          value={overrides[k] ?? p.proposedAmount}
          onChange={e => onAmountChange(k, Number(e.target.value))}
        />
        {fromLastInvoice && (
          <div className="text-[10px] text-amber-700 mt-1 flex items-center gap-1 justify-end">
            <AlertTriangle className="h-3 w-3" />
            Set provisionAmount in item master for future auto-proposals.
          </div>
        )}
        {masterAdequacy && (
          <div className="text-[10px] text-amber-700 mt-1 flex items-center gap-1 justify-end">
            <AlertTriangle className="h-3 w-3" />
            Last invoice ₹{p.lastInvoiceAmount!.toLocaleString('en-IN')} was {Math.round((p.lastInvoiceAmount! / p.proposedAmount - 1) * 100)}% above this — consider raising master.
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium">
          Pending review
        </span>
      </td>
    </tr>
  )
}

function SummaryStrip({ summary }: { summary: { totalApplicable: number; invoiceCovered: number; provisionRequired: number; manualAdditions: number; totalProposedAmount: number } }) {
  const tiles = [
    { label: 'Applicable',         value: summary.totalApplicable,   tone: 'neutral' as const, big: false },
    { label: 'Invoice covered',    value: summary.invoiceCovered,    tone: 'emerald' as const, big: false },
    { label: 'Provision required', value: summary.provisionRequired, tone: 'amber'   as const, big: false },
    { label: 'Manual additions',   value: summary.manualAdditions,   tone: 'purple'  as const, big: false },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {tiles.map(t => (
        <div key={t.label} className="rounded-xl border border-border bg-card px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.label}</p>
          <p className={cn(
            'text-xl font-semibold tabular-nums mt-0.5',
            t.tone === 'emerald' && 'text-emerald-700',
            t.tone === 'amber'   && 'text-amber-700',
            t.tone === 'purple'  && 'text-purple-700',
          )}>{t.value}</p>
        </div>
      ))}
      <div className="rounded-xl border border-teal-200 bg-teal-50/30 px-3 py-2.5 col-span-2 md:col-span-1">
        <p className="text-[10px] uppercase tracking-wider text-teal-700">Total proposed</p>
        <p className="text-xl font-bold tabular-nums mt-0.5 text-teal-800">₹{summary.totalProposedAmount.toLocaleString('en-IN')}</p>
      </div>
    </div>
  )
}

function ManualBadge() {
  return (
    <span className="ml-2 rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
      MAN
    </span>
  )
}

function FrequencyChip({ value, muted }: { value: string; muted?: boolean }) {
  const labels: Record<string, string> = {
    MONTHLY:   'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY:    'Yearly',
    MANUAL:    'Manual',
  }
  return (
    <span className={cn(
      'rounded-full px-2 py-0.5 text-[10px] font-medium',
      muted ? 'bg-muted/40 text-muted-foreground' : 'bg-blue-50 text-blue-700 border border-blue-200',
    )}>
      {labels[value] ?? value}
    </span>
  )
}

function BasisChip({ value, muted }: { value: string | null | undefined; muted?: boolean }) {
  if (!value) return <span className="text-muted-foreground text-[10px]">—</span>
  const labels: Record<string, string> = {
    FIXED_AMOUNT: 'Fixed',
    PERCENTAGE:   '%',
  }
  return (
    <span className={cn(
      'rounded-full px-2 py-0.5 text-[10px] font-medium',
      muted ? 'bg-muted/40 text-muted-foreground' : 'bg-slate-100 text-slate-700 border border-slate-200',
    )}>
      {labels[value] ?? value}
    </span>
  )
}

function keyOf(p: Proposal): string {
  return p.id ?? `gen::${p.itemId ?? p.description}`
}

function computeTotals(proposals: Proposal[], selected: Set<string>, overrides: Record<string, number>) {
  let total = 0, count = 0
  for (const p of proposals) {
    const k = keyOf(p)
    if (!selected.has(k)) continue
    total += overrides[k] ?? p.proposedAmount
    count += 1
  }
  return { total, count }
}

function SkeletonTable() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
      </div>
      <div className="h-64 rounded-xl bg-muted animate-pulse" />
    </div>
  )
}
