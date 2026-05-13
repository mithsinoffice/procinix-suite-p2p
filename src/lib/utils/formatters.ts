import { format, parseISO, isValid } from 'date-fns'

// ── Currency & numbers ──

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const NUM = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatINR(amount: number | string | null | undefined): string {
  const n = Number(amount)
  return isNaN(n) ? '—' : INR.format(n)
}

export function formatINRCompact(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '—'
  if (Math.abs(amount) >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)}Cr`
  if (Math.abs(amount) >= 1_00_000)    return `₹${(amount / 1_00_000).toFixed(2)}L`
  if (Math.abs(amount) >= 1_000)       return `₹${(amount / 1_000).toFixed(1)}K`
  return formatINR(amount)
}

export function formatNumber(n: number | null | undefined): string {
  return n == null || isNaN(n) ? '—' : NUM.format(n)
}

export function parseIndianNumber(s: string): number { return parseFloat(s.replace(/,/g, '')) }

export function formatPercent(n: number | null | undefined, decimals = 2): string {
  return n == null || isNaN(n) ? '—' : `${n.toFixed(decimals)}%`
}

// ── Dates ──

function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null
  const date = typeof d === 'string' ? parseISO(d) : d
  return isValid(date) ? date : null
}

export function formatDate(d: Date | string | null | undefined): string {
  const date = toDate(d)
  return date ? format(date, 'dd/MM/yyyy') : '—'
}

export function formatDateLong(d: Date | string | null | undefined): string {
  const date = toDate(d)
  return date ? format(date, 'dd MMM yyyy') : '—'
}

export function formatDateTime(d: Date | string | null | undefined): string {
  const date = toDate(d)
  return date ? format(date, 'dd MMM yyyy, h:mm a') : '—'
}

export function formatFiscalYear(d: Date | string | null | undefined): string {
  const date = toDate(d)
  if (!date) return '—'
  const month = date.getMonth()
  const year  = date.getFullYear()
  const fyStart = month >= 3 ? year : year - 1
  return `FY ${fyStart}–${String(fyStart + 1).slice(2)}`
}

export function daysFromToday(d: Date | string | null | undefined): number {
  const date = toDate(d)
  if (!date) return 0
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - date.getTime()) / 86_400_000)
}

// ── Status display ──

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', PENDING_L1: 'Pending L1',
  PENDING_L2: 'Pending L2', PENDING_L3: 'Pending L3', APPROVED: 'Approved',
  REJECTED: 'Rejected', ON_HOLD: 'On Hold', PAID: 'Paid',
  PARTIALLY_PAID: 'Partially Paid', CANCELLED: 'Cancelled',
  PROCESSING: 'Processing', COMPLETED: 'Completed', FAILED: 'Failed',
  ACTIVE: 'Active', INACTIVE: 'Inactive', BLOCKED: 'Blocked',
  PENDING: 'Pending', REVERSED: 'Reversed',
}

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PENDING_L1: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PENDING_L2: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PENDING_L3: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  ON_HOLD: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  PARTIALLY_PAID: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'
}

export function formatDocRef(prefix: string, sequence: number, year?: number): string {
  return `${prefix}-${year ?? new Date().getFullYear()}-${String(sequence).padStart(5, '0')}`
}
