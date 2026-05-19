// Thin API client for accounting endpoints. Every function returns a typed
// promise — callers wire them into TanStack Query (`useQuery` / `useMutation`).
// No raw fetch() — http handles auth refresh + error mapping.

import { http } from '../http'

export interface JournalEntry {
  id:                     string
  tenantId:               string
  entryDate:              string
  postingDate:            string
  period:                 string
  entryType:              'PROVISION' | 'PROVISION_REVERSAL' | 'PROVISION_NULLIFIED' | 'ACCRUAL' | 'AMORTIZATION' | 'MANUAL'
  status:                 'POSTED' | 'REVERSED' | 'NULLIFIED' | 'SKIP_REVERSAL'
  debitGlCode:            string
  creditGlCode:           string
  amount:                 number
  currencyCode:           string
  narration:              string
  invoiceId:              string | null
  invoiceLineId:          string | null
  provisionScheduleId:    string | null
  amortizationScheduleId: string | null
  nullifiedByInvoiceId:   string | null
  reversalOfId:           string | null
  reversalJvId:           string | null
  reversalSkipped:        boolean
  erpStatus:              'PENDING' | 'SYNCED' | 'FAILED' | 'SKIPPED' | 'MANUAL_OVERRIDE'
  erpRef:                 string | null
  erpPushedAt:            string | null
  retryCount:             number
  createdAt:              string
  invoice?:               { id: string; invoiceNumber: string; invoiceRef: string | null; vendor: { legalName: string } | null } | null
}

export interface ProvisionScheduleRow {
  id:              string
  itemId:          string
  vendorId:        string | null
  frequency:       'MONTHLY' | 'QUARTERLY'
  amount:          number
  basis:           string
  status:          'ACTIVE' | 'PAUSED' | 'CLOSED'
  lastRunDate:     string | null
  nextRunDate:     string | null
  expenseGlCode:   string
  provisionGlCode: string
  item:            { id: string; name: string; itemCode: string } | null
}

export interface AmortizationScheduleRow {
  id:            string
  invoiceId:     string
  invoiceLineId: string | null
  totalAmount:   number
  monthlyAmount: number
  periodFrom:    string
  periodTo:      string
  totalMonths:   number
  basis:         'STRAIGHT_LINE' | 'DAY_APPORTIONED'
  status:        'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  expenseGlCode: string
  prepaidGlCode: string
  apGlCode:      string
  postedMonths:  number
  progressPct:   number
  item:          string | null
  invoice: {
    id:             string
    invoiceNumber:  string
    invoiceRef:     string | null
    vendor:         { legalName: string; vendorCode: string } | null
  } | null
}

export interface AmortizationTimelineRow {
  month:         string
  plannedAmount: number
  daysInPeriod:  number
  jv: {
    id:          string
    amount:      number
    erpRef:      string | null
    erpStatus:   string
    status:      string
    postingDate: string
  } | null
}

export interface AccountingDashboard {
  period:                       string
  jvsPostedThisMonth:           number
  jvsPending:                   number
  erpFailures:                  number
  activeSchedules:              number
  activeProvisionSchedules:     number
  activeAmortizationSchedules:  number
  provisionsThisMonth:          { count: number; amount: number }
  amortizationsThisMonth:       { count: number; amount: number }
}

export interface MonthEndJv {
  id:            string
  entryType:     string
  amount:        number
  debit:         string
  credit:        string
  narration:     string
  postingDate:   string
  invoiceId?:    string | null
  scheduleId?:   string | null
}

export interface MonthEndResult {
  period:              string
  provisionsPosted:    number
  amortizationsPosted: number
  reversalsExecuted:   number
  reversalsSkipped:    number
  jvs:                 MonthEndJv[]
  dryRun:              boolean
}

interface JvListResponse {
  data:        JournalEntry[]
  total:       number
  nextCursor:  string | null
  hasMore:     boolean
}

export const accountingApi = {
  // Dashboard
  getDashboard: () => http.get<AccountingDashboard>('/api/accounting/dashboard'),

  // Journal entries
  listJvs: (params: { period?: string; entryType?: string; erpStatus?: string; invoiceId?: string; scheduleId?: string; take?: number; cursor?: string }) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)) })
    return http.get<JvListResponse>(`/api/accounting/journal-entries?${qs}`)
  },
  pushJv:      (id: string) => http.post<{ success: boolean; erpRef?: string }>(`/api/accounting/journal-entries/${id}/push-erp`, {}),
  pushBulk:    (ids: string[]) => http.post<{ pushed: number; succeeded: number }>('/api/accounting/journal-entries/push-erp-bulk', { ids }),
  retryJv:     (id: string) => http.post<{ success: boolean; erpRef?: string }>(`/api/accounting/journal-entries/${id}/retry`, {}),
  retryAll:    () => http.post<{ retried: number; succeeded: number }>('/api/accounting/journal-entries/retry-all-failed', {}),

  // Schedules
  listProvisionSchedules:    () => http.get<ProvisionScheduleRow[]>('/api/accounting/provision-schedules'),
  patchProvisionSchedule:    (id: string, status: 'ACTIVE' | 'PAUSED' | 'CLOSED') => http.patch<{ ok: true }>(`/api/accounting/provision-schedules/${id}`, { status }),
  listAmortizationSchedules: (params: { invoiceId?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.invoiceId) qs.set('invoiceId', params.invoiceId)
    return http.get<AmortizationScheduleRow[]>(`/api/accounting/amortization-schedules?${qs}`)
  },
  getAmortizationTimeline:   (id: string) => http.get<{ schedule: AmortizationScheduleRow; timeline: AmortizationTimelineRow[] }>(`/api/accounting/amortization-schedules/${id}/timeline`),

  // Month-end
  previewMonthEnd: (period: string) => http.post<MonthEndResult>('/api/accounting/month-end/preview', { period }),
  runMonthEnd:     (period: string) => http.post<MonthEndResult>('/api/accounting/month-end',         { period }),
}
