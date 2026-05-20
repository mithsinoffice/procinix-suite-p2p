// Pure helpers for the provisioning module. Suggestion rules + proposal
// generation are deliberately DB-free so they can be unit-tested with
// hand-rolled fixtures. The route layer (provisions.ts) handles the
// transactional reads/writes; this file only does the math + classification.

export type MoMStatus = 'INV' | 'PROV' | 'MAN' | 'MISS' | 'NA'

export interface MoMCell {
  status:      MoMStatus
  amount:      number
  jvRef?:      string
  invoiceRef?: string
  isManual?:   boolean
  source?:     string
}

export interface MoMItem {
  itemId:        string
  description:   string
  masterAmount:  number
  frequency:     string
  months:        Record<string, MoMCell>   // keyed YYYY-MM
  totalAmount:   number
  gapCount:      number
  pattern:       'CONSISTENT' | 'GAPS' | 'MANUAL' | 'UNDER_PROVISION'
}

export interface Suggestion {
  type:            'PROMOTE_TO_RECURRING' | 'UPDATE_PROVISION_AMOUNT' | 'BACKDATE_JV'
  itemId:          string
  description:     string
  message:         string
  suggestedAmount?: number
  frequency?:      string
  confidence:      'HIGH' | 'MEDIUM' | 'LOW'
  canAccept:       boolean
}

// ── Proposal generation ──
// Given the master items flagged provisionRequired and a map of (itemId,
// period) → invoice that already covers them, produce the live proposal list
// merged with any persisted draft proposals. The route layer adds vendor /
// GL fields after this returns.

export interface ItemForProposal {
  itemId:             string
  description:        string
  provisionAmount:    number
  provisionFrequency: string | null
  expenseGlCode:      string
  provisionGlCode:    string
  tdsSection:         string | null
  vendorId?:          string | null
  vendorName?:        string | null
}

export interface InvoiceCoverage {
  itemId:      string
  invoiceId:   string
  invoiceRef:  string
  amount:      number
}

export interface ProposalDraft {
  id?:               string
  itemId?:           string
  vendorId?:         string
  vendorName?:       string
  description:       string
  proposedAmount:    number
  isManual:          boolean
  source:            string
  status:            string
  invoiceCovered:    boolean
  invoiceRef?:       string
  invoiceAmount?:    number
  expenseGlCode:     string
  provisionGlCode:   string
  tdsSection?:       string
  frequency:         string
}

// QUARTERLY provisions only count for periods that fall on Q-end months
// (Jun/Sep/Dec/Mar — Indian FY quarters). Returning false here means the
// item is skipped for that period entirely.
const Q_END_MONTHS = new Set([5, 8, 11, 2]) // 0-indexed: Jun, Sep, Dec, Mar

export function isPeriodApplicable(frequency: string | null, period: string): boolean {
  if (!frequency || frequency === 'MONTHLY') return true
  if (frequency === 'QUARTERLY') {
    const [, mm] = period.split('-')
    const m = Number(mm) - 1
    return Q_END_MONTHS.has(m)
  }
  // YEARLY: only March (financial year close)
  if (frequency === 'YEARLY') {
    const [, mm] = period.split('-')
    return Number(mm) === 3
  }
  return true
}

export function generateProposals(
  items:        ItemForProposal[],
  period:       string,
  coverage:     InvoiceCoverage[],
  persistedDrafts: ProposalDraft[] = [],
): ProposalDraft[] {
  const coverageByItem = new Map(coverage.map(c => [c.itemId, c]))
  const persistedByItem = new Map<string, ProposalDraft>()
  for (const d of persistedDrafts) {
    if (d.itemId) persistedByItem.set(d.itemId, d)
  }

  const proposals: ProposalDraft[] = []

  // Item-driven proposals (auto-generated from item master).
  for (const item of items) {
    if (!isPeriodApplicable(item.provisionFrequency, period)) continue
    const persisted = persistedByItem.get(item.itemId)
    const cov = coverageByItem.get(item.itemId)

    proposals.push(persisted ?? {
      itemId:          item.itemId,
      vendorId:        item.vendorId ?? undefined,
      vendorName:      item.vendorName ?? undefined,
      description:     item.description,
      proposedAmount:  cov?.amount ?? Number(item.provisionAmount) ?? 0,
      isManual:        false,
      source:          'ITEM_MASTER',
      status:          cov ? 'AUTO_COVERED' : 'DRAFT',
      invoiceCovered:  !!cov,
      invoiceRef:      cov?.invoiceRef,
      invoiceAmount:   cov?.amount,
      expenseGlCode:   item.expenseGlCode,
      provisionGlCode: item.provisionGlCode,
      tdsSection:      item.tdsSection ?? undefined,
      frequency:       item.provisionFrequency ?? 'MONTHLY',
    })
  }

  // Manual additions (persisted drafts without itemId).
  for (const d of persistedDrafts) {
    if (!d.itemId) proposals.push(d)
  }

  return proposals
}

// ── Pattern classifier (used by MoM) ──
export function classifyPattern(months: Record<string, MoMCell>, monthKeys: string[]): MoMItem['pattern'] {
  const cells = monthKeys.map(k => months[k]).filter(Boolean)
  if (cells.length === 0) return 'GAPS'

  const hasManual = cells.some(c => c.status === 'MAN' || c.isManual)
  const missCount = cells.filter(c => c.status === 'MISS').length
  const presentCount = cells.filter(c => c.status === 'INV' || c.status === 'PROV').length

  // Under-provision: invoice consistently > provision amount. The actual
  // drift calc is done by detectAmountDrift — here we just classify by
  // presence of a drift signal.
  // Heuristic: if any INV cell amount > 20% above the average PROV amount.
  const provs = cells.filter(c => c.status === 'PROV').map(c => c.amount)
  const invs  = cells.filter(c => c.status === 'INV').map(c => c.amount)
  if (provs.length > 0 && invs.length > 0) {
    const provAvg = provs.reduce((s, n) => s + n, 0) / provs.length
    const overshoots = invs.filter(v => v > provAvg * 1.2)
    if (overshoots.length >= 2) return 'UNDER_PROVISION'
  }

  if (hasManual && presentCount === 0) return 'MANUAL'
  if (missCount >= 2)                  return 'GAPS'
  return 'CONSISTENT'
}

// ── Suggestion rules (pure) ──

// Rule 1: if a manual item appears in 2+ consecutive months from the same
// vendor at the same amount, suggest promoting it to recurring.
export interface ManualOccurrence {
  itemId:      string
  description: string
  vendorId?:   string
  vendorName?: string
  period:      string
  amount:      number
}

export function detectPromoteToRecurring(occurrences: ManualOccurrence[]): Suggestion[] {
  // Group by (description + vendorId), then look for ≥2 consecutive months
  // with the same amount.
  const byKey = new Map<string, ManualOccurrence[]>()
  for (const occ of occurrences) {
    const key = `${occ.description.toLowerCase()}::${occ.vendorId ?? ''}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(occ)
  }

  const suggestions: Suggestion[] = []
  for (const list of byKey.values()) {
    if (list.length < 2) continue
    const sorted = [...list].sort((a, b) => a.period.localeCompare(b.period))
    let bestRun = 1, runStart = 0
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      const isConsecutive = consecutiveMonths(prev.period, curr.period)
      const sameAmount    = Math.abs(prev.amount - curr.amount) < 0.5
      if (isConsecutive && sameAmount) {
        const run = i - runStart + 1
        if (run > bestRun) bestRun = run
      } else {
        runStart = i
      }
    }
    if (bestRun >= 2) {
      const sample = sorted[0]
      suggestions.push({
        type:            'PROMOTE_TO_RECURRING',
        itemId:          sample.itemId,
        description:     sample.description,
        message:         `${sample.description} has been added manually for ${bestRun} consecutive months${sample.vendorName ? ` to ${sample.vendorName}` : ''} at ₹${sample.amount.toLocaleString('en-IN')}. Promote to a recurring provision?`,
        suggestedAmount: sample.amount,
        frequency:       'MONTHLY',
        confidence:      'HIGH',
        canAccept:       true,
      })
    }
  }
  return suggestions
}

// Rule 2: if actual invoice amount > provision amount by >20% for 2+ months,
// suggest updating the master provision amount to the avg of last 3 invoices.
export interface DriftObservation {
  itemId:           string
  description:      string
  period:           string
  provisionAmount:  number
  invoiceAmount:    number
}

export function detectAmountDrift(observations: DriftObservation[]): Suggestion[] {
  const byItem = new Map<string, DriftObservation[]>()
  for (const obs of observations) {
    if (!byItem.has(obs.itemId)) byItem.set(obs.itemId, [])
    byItem.get(obs.itemId)!.push(obs)
  }
  const out: Suggestion[] = []
  for (const list of byItem.values()) {
    const sorted = [...list].sort((a, b) => a.period.localeCompare(b.period))
    const overshoots = sorted.filter(o => o.provisionAmount > 0 && o.invoiceAmount > o.provisionAmount * 1.2)
    if (overshoots.length < 2) continue
    const last3 = sorted.slice(-3).map(o => o.invoiceAmount)
    const avg = last3.reduce((s, n) => s + n, 0) / last3.length
    const sample = sorted[0]
    out.push({
      type:            'UPDATE_PROVISION_AMOUNT',
      itemId:          sample.itemId,
      description:     sample.description,
      message:         `${sample.description} actuals have been >20% above provision for ${overshoots.length} months. Update provision amount to ₹${Math.round(avg).toLocaleString('en-IN')} (avg of last ${last3.length}).`,
      suggestedAmount: Math.round(avg),
      confidence:      'MEDIUM',
      canAccept:       true,
    })
  }
  return out
}

// Rule 3: if an item shows MISS in 2+ consecutive months, surface a gap
// alert recommending a backdated JV. Frontend handles the manual addition
// form — this suggestion is informational + cannot be auto-accepted.
export interface GapObservation {
  itemId:      string
  description: string
  period:      string
  status:      MoMStatus
}

export function detectGaps(observations: GapObservation[]): Suggestion[] {
  const byItem = new Map<string, GapObservation[]>()
  for (const obs of observations) {
    if (!byItem.has(obs.itemId)) byItem.set(obs.itemId, [])
    byItem.get(obs.itemId)!.push(obs)
  }
  const out: Suggestion[] = []
  for (const list of byItem.values()) {
    const sorted = [...list].sort((a, b) => a.period.localeCompare(b.period))
    let runStart = 0
    let bestRun  = 0
    let bestRunStart = -1
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].status !== 'MISS') {
        runStart = i + 1
        continue
      }
      const isConsecutive = i === runStart || consecutiveMonths(sorted[i - 1].period, sorted[i].period)
      if (!isConsecutive) runStart = i
      const run = i - runStart + 1
      if (run > bestRun) {
        bestRun = run
        bestRunStart = runStart
      }
    }
    if (bestRun >= 2 && bestRunStart >= 0) {
      const sample = sorted[bestRunStart]
      out.push({
        type:        'BACKDATE_JV',
        itemId:      sample.itemId,
        description: sample.description,
        message:     `${sample.description} is missing a provision JV for ${bestRun} consecutive months starting ${sample.period}. Consider posting a backdated entry.`,
        confidence:  'HIGH',
        canAccept:   false,
      })
    }
  }
  return out
}

// "YYYY-MM" consecutive-month check. Returns true when prev → curr is +1
// month (calendar-wise — wraps Dec → next Jan).
export function consecutiveMonths(prev: string, curr: string): boolean {
  const [py, pm] = prev.split('-').map(Number)
  const [cy, cm] = curr.split('-').map(Number)
  if (!py || !pm || !cy || !cm) return false
  const months = (cy - py) * 12 + (cm - pm)
  return months === 1
}

// Build month-on-month rows from raw cell data. Used by GET /api/provisions/mom
// after the route assembles the per-item cell map.
export function buildMoMRows(
  items: { itemId: string; description: string; masterAmount: number; frequency: string }[],
  cellsByItem: Map<string, Record<string, MoMCell>>,
  monthKeys: string[],
): MoMItem[] {
  return items.map(item => {
    const months = cellsByItem.get(item.itemId) ?? {}
    const totalAmount = monthKeys.reduce((sum, k) => sum + (months[k]?.amount ?? 0), 0)
    const gapCount = monthKeys.filter(k => months[k]?.status === 'MISS').length
    const pattern = classifyPattern(months, monthKeys)
    return {
      itemId:       item.itemId,
      description:  item.description,
      masterAmount: item.masterAmount,
      frequency:    item.frequency,
      months,
      totalAmount,
      gapCount,
      pattern,
    }
  })
}
