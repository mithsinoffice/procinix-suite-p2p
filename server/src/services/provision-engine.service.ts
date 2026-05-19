// Pure helpers for the provisioning cycle. No Prisma, no DB — all I/O lives
// in routes/jobs (month-end.job, accounting routes). The shapes here are the
// "create inputs" for prisma.journalEntry.create({ data: ... }); callers
// inject schedule + GL data and decide when to persist.
//
// Provisioning lifecycle:
//   1. Month-end runs → post PROVISION JV (DR expense, CR provision)
//   2. Same job creates the paired PROVISION_REVERSAL JV dated 1st of next
//      month (kept POSTED until month-end of the following period executes it)
//   3. If an invoice for the same item+vendor arrives mid-month before reversal
//      executes → NULLIFICATION JV is posted (swaps DR/CR), original PROVISION
//      flips to NULLIFIED, paired reversal is marked SKIP_REVERSAL.
//
// `forDate` is always the as-of posting date (typically the last day of the
// provisioning period for a PROVISION JV, the invoice date for nullification).

export interface ProvisionScheduleInput {
  id:              string
  tenantId:        string
  itemId:          string
  vendorId:        string | null
  frequency:       'MONTHLY' | 'QUARTERLY' | string
  amount:          number
  basis:           'FIXED_AMOUNT' | 'PERCENTAGE' | string
  status:          'ACTIVE' | 'PAUSED' | 'CLOSED' | string
  lastRunDate:     Date | null
  nextRunDate:     Date | null
  expenseGlCode:   string
  provisionGlCode: string
}

export interface JournalEntryLike {
  id:                   string
  tenantId:             string
  entryDate:            Date
  postingDate:          Date
  period:               string
  entryType:            string
  status:               string
  debitGlCode:          string
  creditGlCode:         string
  amount:               number
  currencyCode:         string
  narration:            string
  invoiceId:            string | null
  invoiceLineId:        string | null
  provisionScheduleId:  string | null
  nullifiedByInvoiceId: string | null
  reversalOfId:         string | null
  reversalSkipped:      boolean
}

export interface JournalEntryCreateInput {
  tenantId:               string
  entryDate:              Date
  postingDate:            Date
  period:                 string
  entryType:              string
  status:                 string
  debitGlCode:            string
  creditGlCode:           string
  amount:                 number
  currencyCode:           string
  narration:              string
  invoiceId?:             string | null
  invoiceLineId?:         string | null
  provisionScheduleId?:   string | null
  amortizationScheduleId?: string | null
  nullifiedByInvoiceId?:  string | null
  reversalOfId?:          string | null
  reversalSkipped?:       boolean
  createdBy:              string
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function periodOf(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`
}

export function lastDayOfMonth(year: number, monthIndex: number): Date {
  // monthIndex is 0-based; using day 0 of next month yields last day of monthIndex
  return new Date(Date.UTC(year, monthIndex + 1, 0))
}

export function firstDayOfMonth(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex, 1))
}

// MONTHLY: last day of the month *after* the month containing lastRunDate.
// QUARTERLY: last day of the quarter *after* the quarter containing lastRunDate.
// First-ever run (lastRunDate is "today") → next run is end of next month/quarter.
export function computeNextRunDate(lastRunDate: Date, frequency: 'MONTHLY' | 'QUARTERLY'): Date {
  const y = lastRunDate.getUTCFullYear()
  const m = lastRunDate.getUTCMonth()
  if (frequency === 'QUARTERLY') {
    // Quarter index 0..3 (0=Q1 Jan-Mar, 1=Q2 Apr-Jun, 2=Q3 Jul-Sep, 3=Q4 Oct-Dec)
    const q       = Math.floor(m / 3)
    const nextQ   = q + 1
    const nextY   = y + Math.floor(nextQ / 4)
    const wrapped = nextQ % 4
    // Last month of that quarter is wrapped*3 + 2
    return lastDayOfMonth(nextY, wrapped * 3 + 2)
  }
  // MONTHLY
  return lastDayOfMonth(y, m + 1)
}

export function isProvisionDue(schedule: ProvisionScheduleInput, forDate: Date): boolean {
  if (schedule.status !== 'ACTIVE') return false
  // Never run before → due immediately
  if (!schedule.nextRunDate) return true
  return schedule.nextRunDate.getTime() <= forDate.getTime()
}

export function buildProvisionJV(
  schedule: ProvisionScheduleInput,
  forDate:  Date,
  createdBy: string,
  opts: { itemName?: string } = {},
): JournalEntryCreateInput {
  const itemLabel = opts.itemName ?? `Item ${schedule.itemId.slice(0, 8)}`
  const monthName = MONTHS_SHORT[forDate.getUTCMonth()]
  const yearStr   = String(forDate.getUTCFullYear())
  return {
    tenantId:            schedule.tenantId,
    entryDate:           forDate,
    postingDate:         forDate,
    period:              periodOf(forDate),
    entryType:           'PROVISION',
    status:              'POSTED',
    debitGlCode:         schedule.expenseGlCode,
    creditGlCode:        schedule.provisionGlCode,
    amount:              schedule.amount,
    currencyCode:        'INR',
    narration:           `${itemLabel} — ${monthName} ${yearStr} provision`,
    provisionScheduleId: schedule.id,
    invoiceId:           null,
    invoiceLineId:       null,
    nullifiedByInvoiceId: null,
    reversalOfId:        null,
    reversalSkipped:     false,
    createdBy,
  }
}

// Reverses on 1st of the month *after* the original posting month — DR/CR
// swap. The paired JV is created at the same time as the original PROVISION
// and lives in POSTED status until month-end-of-next-period executes it (or
// nullification short-circuits it via shouldSkipReversal).
export function buildReversalJV(
  originalJV: JournalEntryLike,
  reversalDate: Date,
  createdBy:  string,
): JournalEntryCreateInput {
  const orig         = originalJV.postingDate
  const postingDate  = firstDayOfMonth(orig.getUTCFullYear(), orig.getUTCMonth() + 1)
  return {
    tenantId:             originalJV.tenantId,
    entryDate:            reversalDate,
    postingDate,
    period:               periodOf(postingDate),
    entryType:            'PROVISION_REVERSAL',
    status:               'POSTED',
    debitGlCode:          originalJV.creditGlCode,
    creditGlCode:         originalJV.debitGlCode,
    amount:               originalJV.amount,
    currencyCode:         originalJV.currencyCode,
    narration:            `Reversal of ${originalJV.narration}`,
    invoiceId:            originalJV.invoiceId,
    invoiceLineId:        originalJV.invoiceLineId,
    provisionScheduleId:  originalJV.provisionScheduleId,
    nullifiedByInvoiceId: null,
    reversalOfId:         originalJV.id,
    reversalSkipped:      false,
    createdBy,
  }
}

// Nullification posts when an invoice arrives mid-month and "absorbs" the
// open provision. DR/CR are swapped (effectively clearing the provision
// liability), the original PROVISION is then flipped to NULLIFIED by the
// route, and the paired PROVISION_REVERSAL is marked SKIP_REVERSAL so it
// doesn't double-clear.
export function buildNullificationJV(
  originalJV:  JournalEntryLike,
  invoiceId:   string,
  invoiceDate: Date,
  createdBy:   string,
): JournalEntryCreateInput {
  return {
    tenantId:             originalJV.tenantId,
    entryDate:            invoiceDate,
    postingDate:          invoiceDate,
    period:               periodOf(invoiceDate),
    entryType:            'PROVISION_NULLIFIED',
    status:               'POSTED',
    debitGlCode:          originalJV.creditGlCode,
    creditGlCode:         originalJV.debitGlCode,
    amount:               originalJV.amount,
    currencyCode:         originalJV.currencyCode,
    narration:            `Nullified by invoice — ${originalJV.narration}`,
    invoiceId,
    invoiceLineId:        originalJV.invoiceLineId,
    provisionScheduleId:  originalJV.provisionScheduleId,
    nullifiedByInvoiceId: invoiceId,
    reversalOfId:         originalJV.id,
    reversalSkipped:      false,
    createdBy,
  }
}

export function shouldSkipReversal(jv: JournalEntryLike): boolean {
  return jv.status === 'NULLIFIED'
}
