import Fuse from 'fuse.js'

// ── Vendor deduplication ──

export interface VendorSummary {
  id: string; legalName: string; tradeName?: string; gstin?: string; pan: string
}
export interface VendorMatch {
  vendor: VendorSummary; score: number; matchPercent: number; matchedOn: 'name' | 'gstin' | 'pan'
}

function normaliseVendorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(pvt|private|ltd|limited|llp|llc|inc|co|corp|corporation|enterprises?|trading|industries?|solutions?|services?|group)\b\.?/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function findVendorDuplicates(
  candidateName: string,
  existing: VendorSummary[],
  options?: { threshold?: number; maxResults?: number }
): VendorMatch[] {
  const { threshold = 0.4, maxResults = 3 } = options ?? {}
  const list = existing.map(v => ({ ...v, _n: normaliseVendorName(v.legalName), _t: v.tradeName ? normaliseVendorName(v.tradeName) : '' }))
  const fuse = new Fuse(list, { keys: ['_n', '_t'], includeScore: true, threshold, minMatchCharLength: 3 })
  return fuse
    .search(normaliseVendorName(candidateName), { limit: maxResults })
    .filter(r => (r.score ?? 1) < threshold)
    .map(r => ({
      vendor: { id: r.item.id, legalName: r.item.legalName, tradeName: r.item.tradeName, gstin: r.item.gstin, pan: r.item.pan },
      score: r.score ?? 1,
      matchPercent: Math.round((1 - (r.score ?? 1)) * 100),
      matchedOn: 'name' as const,
    }))
    .sort((a, b) => a.score - b.score)
}

// ── Invoice deduplication ──

export interface InvoiceSummary {
  id: string; invoiceNumber: string; vendorId: string; invoiceDate: string; totalAmount: number; status: string
}
export interface InvoiceMatch {
  invoice: InvoiceSummary; reason: 'exact_number' | 'near_duplicate'; detail: string
}

export function findExactInvoiceDuplicate(
  invoiceNumber: string, vendorId: string, existing: InvoiceSummary[]
): InvoiceSummary | null {
  const norm = (s: string) => s.replace(/\s/g, '').toUpperCase()
  return existing.find(i => i.vendorId === vendorId && norm(i.invoiceNumber) === norm(invoiceNumber)) ?? null
}

export function findNearInvoiceDuplicates(
  candidate: { vendorId: string; totalAmount: number; invoiceDate: Date },
  existing: InvoiceSummary[],
  options?: { amountTolerancePct?: number; dayWindow?: number }
): InvoiceMatch[] {
  const { amountTolerancePct = 5, dayWindow = 30 } = options ?? {}
  const windowMs = dayWindow * 86_400_000
  const ct = candidate.invoiceDate.getTime()
  const min = candidate.totalAmount * (1 - amountTolerancePct / 100)
  const max = candidate.totalAmount * (1 + amountTolerancePct / 100)
  return existing
    .filter(i => {
      if (i.vendorId !== candidate.vendorId) return false
      if (['CANCELLED', 'REJECTED'].includes(i.status)) return false
      return Math.abs(new Date(i.invoiceDate).getTime() - ct) <= windowMs &&
             i.totalAmount >= min && i.totalAmount <= max
    })
    .map(i => ({
      invoice: i,
      reason: 'near_duplicate' as const,
      detail: `Same vendor, similar amount (₹${i.totalAmount.toLocaleString('en-IN')}), within ${dayWindow} days`,
    }))
}

// ── Bank account deduplication ──

export interface BankDetails { vendorId: string; vendorName: string; ifscCode: string; bankAccountNo: string }

export function findDuplicateBankAccount(
  candidate: { ifscCode: string; bankAccountNo: string; vendorId?: string },
  existing: BankDetails[]
): BankDetails[] {
  return existing.filter(b =>
    b.ifscCode === candidate.ifscCode &&
    b.bankAccountNo === candidate.bankAccountNo &&
    b.vendorId !== candidate.vendorId
  )
}
