import { useEffect, useMemo, useState } from 'react'
import { Send, Save } from 'lucide-react'
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
  // non-covered, non-manual draft starts as selected so the common path is
  // one click to submit.
  useEffect(() => {
    if (!data) return
    const next = new Set<string>()
    for (const p of data.proposals) {
      if (!p.invoiceCovered && p.status !== 'AUTO_COVERED') next.add(keyOf(p))
    }
    setSelected(next)
    setOverrides({})
  }, [data])

  function keyOf(p: Proposal): string {
    return p.id ?? `gen::${p.itemId ?? p.description}`
  }

  const totals = useMemo(() => {
    if (!data) return { total: 0, count: 0 }
    let total = 0, count = 0
    for (const p of data.proposals) {
      const k = keyOf(p)
      if (!selected.has(k)) continue
      total += overrides[k] ?? p.proposedAmount
      count += 1
    }
    return { total, count }
  }, [data, selected, overrides])

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

  function toggle(k: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      return next
    })
  }

  function setAmount(k: string, val: number) {
    setOverrides(prev => ({ ...prev, [k]: val }))
  }

  async function handleSaveDraft() {
    setFeedback(null)
    const payload = data!.proposals
      .filter(p => selected.has(keyOf(p)) && !p.invoiceCovered)
      .map(p => {
        const k = keyOf(p)
        return { ...p, proposedAmount: overrides[k] ?? p.proposedAmount }
      })
    const res = await draftMut.mutateAsync({ period, proposals: payload })
    setFeedback(`Saved ${res.saved} draft proposal${res.saved === 1 ? '' : 's'}.`)
  }

  async function handleSubmit() {
    setFeedback(null)
    // We need IDs to submit — for proposals not yet persisted, save them
    // first so the batch references real rows. The backend's submit endpoint
    // expects persisted proposalIds.
    const toPersist = data!.proposals
      .filter(p => selected.has(keyOf(p)) && !p.invoiceCovered)
      .map(p => {
        const k = keyOf(p)
        return { ...p, proposedAmount: overrides[k] ?? p.proposedAmount }
      })
    const draftRes = await draftMut.mutateAsync({ period, proposals: toPersist })
    if (draftRes.ids.length === 0) {
      setFeedback('No proposals to submit.')
      return
    }
    const amounts: Record<string, number> = {}
    draftRes.ids.forEach((id, idx) => {
      amounts[id] = toPersist[idx].proposedAmount
    })
    const submitRes = await submitMut.mutateAsync({ period, proposalIds: draftRes.ids, amounts })
    setFeedback(
      submitRes.warning === 'NO_WORKFLOW_DEFINED'
        ? `Batch saved (${draftRes.ids.length} proposals) but workflow WF-PROVISION-001 is not seeded yet.`
        : `Batch ${submitRes.batchId} submitted for approval.`,
    )
  }

  const sortedProposals = [...data.proposals].sort((a, b) => {
    // Invoice covered → bottom, then manual → bottom-ish, others → top.
    const score = (p: Proposal) => p.invoiceCovered ? 2 : p.isManual ? 1 : 0
    return score(a) - score(b) || a.description.localeCompare(b.description)
  })

  return (
    <div className="space-y-3">
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
                <th className="px-3 py-2 text-left">Invoice this month</th>
                <th className="px-3 py-2 text-right">Proposed amount</th>
                <th className="px-3 py-2 text-right">Edit amount</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedProposals.map(p => {
                const k = keyOf(p)
                const isSelected = selected.has(k)
                const adequacy = p.invoiceCovered && p.invoiceAmount && p.invoiceAmount > p.proposedAmount * 1.2
                return (
                  <tr
                    key={k}
                    className={cn(
                      p.invoiceCovered && 'bg-muted/30 text-muted-foreground',
                      p.isManual && !p.invoiceCovered && 'bg-purple-50/30',
                    )}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={p.invoiceCovered}
                        onChange={() => toggle(k)}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{p.description}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.vendorName ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium">{p.frequency}</span>
                    </td>
                    <td className="px-3 py-2">
                      {p.invoiceCovered ? (
                        <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium">
                          Invoice received {p.invoiceRef ? `· ${p.invoiceRef}` : ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">₹{p.proposedAmount.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-right">
                      {p.invoiceCovered ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <input
                          type="number"
                          className="w-28 rounded border border-input bg-background px-2 py-1 text-right text-xs"
                          value={overrides[k] ?? p.proposedAmount}
                          onChange={e => setAmount(k, Number(e.target.value))}
                        />
                      )}
                      {adequacy && (
                        <div className="text-[10px] text-amber-700 mt-1">
                          Last invoice was &gt;20% above provision — consider raising the master amount.
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusChip status={p.invoiceCovered ? 'AUTO_COVERED' : p.status} isManual={p.isManual} />
                    </td>
                  </tr>
                )
              })}
              {sortedProposals.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No provisionable items configured for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <div className="text-xs text-muted-foreground">
          {totals.count} selected · <span className="font-medium text-foreground">₹{totals.total.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center gap-2">
          {feedback && <span className="text-[11px] text-muted-foreground">{feedback}</span>}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={draftMut.isPending || totals.count === 0}
            className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
          >
            <Save className="h-3 w-3" /> Save draft
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitMut.isPending || draftMut.isPending || totals.count === 0}
            className="flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            <Send className="h-3 w-3" /> Submit for approval
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryStrip({ summary }: { summary: { totalApplicable: number; invoiceCovered: number; provisionRequired: number; manualAdditions: number; totalProposedAmount: number } }) {
  const tiles = [
    { label: 'Applicable',         value: summary.totalApplicable,  tone: 'neutral' as const },
    { label: 'Invoice covered',    value: summary.invoiceCovered,   tone: 'emerald' as const },
    { label: 'Provision required', value: summary.provisionRequired, tone: 'amber'  as const },
    { label: 'Manual',             value: summary.manualAdditions,  tone: 'purple' as const },
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
      <div className="rounded-xl border border-border bg-card px-3 py-2.5 col-span-2 md:col-span-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total proposed</p>
        <p className="text-xl font-semibold tabular-nums mt-0.5">₹{summary.totalProposedAmount.toLocaleString('en-IN')}</p>
      </div>
    </div>
  )
}

function StatusChip({ status, isManual }: { status: string; isManual: boolean }) {
  if (isManual) {
    return <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-medium">MAN</span>
  }
  switch (status) {
    case 'AUTO_COVERED':
      return <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium">Auto covered</span>
    case 'SUBMITTED':
      return <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-medium">Submitted</span>
    case 'APPROVED':
      return <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium">Approved</span>
    case 'REJECTED':
      return <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-medium">Rejected</span>
    default:
      return <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium">Pending review</span>
  }
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
