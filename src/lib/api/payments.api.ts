// Typed API wrappers for /api/payments/*. Routes return everything tenant-
// scoped from JWT; this module is the only place we encode the URL shape.
// Components import these via TanStack Query (useQuery / useMutation).

import { http } from '../http'

// ── Queue & summary ───────────────────────────────────────────────────────
export type QueuePriority = 'URGENT' | 'MSME' | 'OVERDUE' | 'ALL'
export type QueueType     = 'INVOICE' | 'ADVANCE' | 'ALL'
export type MsmePriority  = 'CRITICAL' | 'AT_RISK' | 'NORMAL'

export interface QueueRow {
  type:              'INVOICE' | 'ADVANCE'
  id:                string
  ref:               string
  vendorId:          string
  vendorName:        string | null
  vendorCode:        string | null
  isMsme:            boolean
  msmeCategory:      string | null
  msmePaymentDue:    string | null
  msmeDaysRemaining: number | null
  msmePriority:      MsmePriority | null
  isUrgent:          boolean
  urgentReason?:     string | null
  dueDate:           string | null
  isOverdue:         boolean
  overdueDays:       number
  invoiceAmount:     number
  tdsAmount:         number
  netPayable:        number
  paidAmount:        number
  finalPayable:      number
  paymentStatus:     'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
  invoiceDate:       string
  currencyCode:      string
}

export interface QueueSummary {
  total:        number
  urgent:       number
  msmeAtRisk:   number
  overdue:      number
  dueThisWeek:  number
  advances:     number
}

export interface QueueParams {
  entityId?:  string
  type?:      QueueType
  priority?:  QueuePriority
  vendorId?:  string
  dueBefore?: string
  dueAfter?:  string
}

// ── Payment batches ───────────────────────────────────────────────────────
export type PaymentMethod = 'NEFT' | 'RTGS' | 'IMPS' | 'CHEQUE'
export type PaymentType   = 'FULL' | 'PARTIAL'
export type BatchStatus   = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTED' | 'PARTIALLY_EXECUTED' | 'FAILED'
export type LineStatus    = 'PENDING' | 'PAID' | 'FAILED'

export interface PaymentBatchRow {
  id:                 string
  batchRef:           string
  status:             BatchStatus
  isUrgent:           boolean
  urgentReason?:      string | null
  containsMsme:       boolean
  msmeVendorCount:    number
  totalAmount:        number
  totalTds:           number
  totalNetPayable:    number
  paymentDate?:       string | null
  entityId:           string
  bankAccountId?:     string | null
  narration?:         string | null
  workflowInstanceId?: string | null
  createdBy:          string
  createdAt:          string
  executedAt?:        string | null
  lineCount:          number
}

export interface PaymentBatchLine {
  id:                string
  batchId:           string
  lineType:          'INVOICE' | 'ADVANCE'
  invoiceId:         string | null
  advanceId:         string | null
  vendorId:          string
  isMsme:            boolean
  msmePaymentDue:    string | null
  msmeDaysRemaining: number | null
  invoiceAmount:     number
  tdsAmount:         number
  advanceAdjusted:   number
  paymentAmount:     number
  paymentType:       PaymentType
  paymentMethod:     PaymentMethod
  tdsSection:        string | null
  utrNumber:         string | null
  chequeNumber:      string | null
  chequeDate:        string | null
  status:            LineStatus
  failureReason:     string | null
  paidAt:            string | null
  vendor:            { id: string; legalName: string; vendorCode: string; msmeRegistered: boolean; msmeCategory: string | null; paymentTerms: number } | null
  invoice:           { id: string; invoiceNumber: string; invoiceDate: string; totalAmount: number; paidAmount: number; paymentStatus: string } | null
}

export interface PaymentBatchDetail extends PaymentBatchRow {
  lines: PaymentBatchLine[]
}

export interface CreateBatchLine {
  invoiceId?:    string
  advanceId?:    string
  paymentType:   PaymentType
  paymentMethod: PaymentMethod
  paymentAmount: number
  tdsSection?:   string
}

export interface CreateBatchInput {
  lines:        CreateBatchLine[]
  entityId:     string
  isUrgent?:    boolean
  urgentReason?: string
  narration?:   string
  paymentDate?: string
  bankAccountId?: string
}

export interface ExecuteBatchLine {
  lineId:        string
  utrNumber?:    string
  chequeNumber?: string
  chequeDate?:   string
  failureReason?: string
}

export interface ExecuteBatchInput {
  lines:       ExecuteBatchLine[]
  postingDate?: string
}

export interface ExecuteBatchResult {
  ok:               boolean
  status:           BatchStatus
  paid:             number
  failed:           number
  jvIds:            string[]
  challansUpserted: number
}

// ── TDS challans ──────────────────────────────────────────────────────────
export interface TdsChallan {
  id:              string
  tdsSection:      string
  period:          string
  amount:          number
  dueDate:         string
  status:          'PENDING' | 'DEPOSITED' | 'OVERDUE'
  challanNumber:   string | null
  depositedAt:     string | null
  depositedBy:     string | null
  daysToDue:       number
  effectiveStatus: 'PENDING' | 'DEPOSITED' | 'OVERDUE'
}

// ── Listing pagination envelope ───────────────────────────────────────────
interface ListEnvelope<T> {
  data:       T[]
  total:      number
  nextCursor: string | null
  hasMore:    boolean
}

// ── API client ────────────────────────────────────────────────────────────
export const paymentsApi = {
  // Queue
  queue:        (params: QueueParams = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)) })
    return http.get<{ data: QueueRow[]; total: number }>(`/api/payments/queue?${qs}`)
  },
  queueSummary: () => http.get<QueueSummary>('/api/payments/queue/summary'),

  // Batches
  listBatches: (params: { status?: string; entityId?: string; isUrgent?: boolean; containsMsme?: boolean; dateFrom?: string; dateTo?: string; take?: number; cursor?: string } = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)) })
    return http.get<ListEnvelope<PaymentBatchRow>>(`/api/payments/batches?${qs}`)
  },
  getBatch:     (id: string) => http.get<PaymentBatchDetail>(`/api/payments/batches/${id}`),
  createBatch:  (body: CreateBatchInput) => http.post<{ id: string; batchRef: string }>('/api/payments/batches', body),
  submitBatch:  (id: string) => http.post<{ ok: boolean; status: BatchStatus; workflowInstanceId: string | null }>(`/api/payments/batches/${id}/submit`, {}),
  executeBatch: (id: string, body: ExecuteBatchInput) => http.post<ExecuteBatchResult>(`/api/payments/batches/${id}/execute`, body),
  flagUrgent:   (id: string, reason: string) => http.post<{ ok: boolean }>(`/api/payments/batches/${id}/flag-urgent`, { reason }),

  // TDS challans
  listChallans: (params: { period?: string; status?: string; tdsSection?: string } = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)) })
    return http.get<TdsChallan[]>(`/api/payments/tds-challans?${qs}`)
  },
  markChallanDeposited: (id: string, body: { challanNumber: string; depositedAt?: string }) =>
    http.patch<{ ok: boolean }>(`/api/payments/tds-challans/${id}/mark-deposited`, body),

  // MSME refresh — manual trigger for the daily breach/interest recompute
  msmeRefresh: () => http.post<{ updated: number; breached: number }>('/api/payments/msme-refresh', {}),
}
