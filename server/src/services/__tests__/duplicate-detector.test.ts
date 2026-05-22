// Locks the duplicate-detector rule shape against regressions. Pure-helper
// tests run runRulesInMemory directly; DB-filter tests mock `prisma.invoice
// .findMany` so we can assert the WHERE clause it sends.
//
// The 10 specs map 1:1 to the user's check-list:
//   1  EXACT — same invoice number
//   2  FUZZY_NUMBER — INV-001 vs INV-0001
//   3  FUZZY_AMOUNT — ±2% / ±7 days
//   4  FUZZY_VENDOR_DATE — exact date / ±10%
//   5  LINE_ITEM — ≥2 matching lines
//   6  REJECTED / CANCELLED excluded from candidate pull
//   7  sourceId filtered (no self-matches)
//   8  No matches → both flags false
//   9  levenshtein("INV-001","INV-0001") == 1
//   10 Multiple matches sorted by confidence desc

import { describe, it, expect, vi } from 'vitest'
import {
  detectDuplicates,
  runRulesInMemory,
  levenshtein,
  similarity,
  type CandidateInvoice,
  type IncomingInvoice,
} from '../duplicate-detector.service'

const TENANT = 'tenant-1'
const V1 = 'vendor-1'
const V2 = 'vendor-2'

function candidate(over: Partial<CandidateInvoice> & { id: string; invoiceNumber: string }): CandidateInvoice {
  return {
    id:            over.id,
    invoiceNumber: over.invoiceNumber,
    vendorId:      over.vendorId      ?? V1,
    vendorGSTIN:   over.vendorGSTIN   ?? null,
    invoiceDate:   over.invoiceDate   ?? '2026-05-01',
    totalAmount:   over.totalAmount   ?? 10000,
    vendor:        over.vendor        ?? { legalName: 'Acme Corp' },
    lines:         over.lines,
  }
}

describe('runRulesInMemory', () => {
  // Test 1
  it('flags an EXACT match when invoice number is identical (confidence 1.0)', () => {
    const incoming: IncomingInvoice = {
      invoiceNumber: 'INV-001',
      vendorId:      V1,
      totalAmount:   10000,
      invoiceDate:   '2026-05-01',
    }
    const cands = [candidate({ id: 'a', invoiceNumber: 'INV-001' })]
    const out = runRulesInMemory(incoming, cands)
    expect(out.isDuplicate).toBe(true)
    expect(out.matches[0].matchType).toBe('EXACT')
    expect(out.matches[0].confidence).toBe(1.0)
  })

  // Test 2
  it('flags FUZZY_NUMBER when number is similar (>=85%) and vendor matches', () => {
    const incoming: IncomingInvoice = {
      invoiceNumber: 'INV-001',
      vendorId:      V1,
    }
    const cands = [candidate({ id: 'a', invoiceNumber: 'INV-0001' })]
    const out = runRulesInMemory(incoming, cands)
    expect(out.matches[0].matchType).toBe('FUZZY_NUMBER')
    expect(out.matches[0].confidence).toBe(0.9)
    expect(out.isSuspicious).toBe(true)
    expect(out.isDuplicate).toBe(false)
  })

  // Test 3
  it('flags FUZZY_AMOUNT when amount within 1% and date within 5 days, same vendor', () => {
    const incoming: IncomingInvoice = {
      invoiceNumber: 'INV-NEW',
      vendorId:      V1,
      totalAmount:   10050, // +0.5% vs 10000
      invoiceDate:   '2026-05-06',
    }
    const cands = [candidate({ id: 'a', invoiceNumber: 'INV-OLD', totalAmount: 10000, invoiceDate: '2026-05-01' })]
    const out = runRulesInMemory(incoming, cands)
    expect(out.matches[0].matchType).toBe('FUZZY_AMOUNT')
    expect(out.matches[0].confidence).toBe(0.85)
    expect(out.isSuspicious).toBe(true)
  })

  // Test 4
  it('flags FUZZY_VENDOR_DATE when same vendor + exact date + ±10% amount', () => {
    const incoming: IncomingInvoice = {
      invoiceNumber: 'INV-NEW',
      vendorId:      V1,
      totalAmount:   10800, // 8% above 10000 — under 10% threshold
      invoiceDate:   '2026-05-01',
    }
    const cands = [candidate({ id: 'a', invoiceNumber: 'INV-OLD', totalAmount: 10000, invoiceDate: '2026-05-01' })]
    const out = runRulesInMemory(incoming, cands)
    // FUZZY_VENDOR_DATE confidence is 0.75 — Rule 3 also matches (8% > 2% so won't), so this is the winning rule.
    expect(out.matches[0].matchType).toBe('FUZZY_VENDOR_DATE')
    expect(out.matches[0].confidence).toBe(0.75)
  })

  // Test 5
  it('flags LINE_ITEM when 2+ line items match on same vendor', () => {
    const incoming: IncomingInvoice = {
      invoiceNumber: 'INV-NEW',
      vendorId:      V1,
      lineItems: [
        { description: 'AWS EC2',  amount: 1500 },
        { description: 'AWS S3',   amount:  300 },
        { description: 'Lambda',   amount:  200 },
      ],
    }
    const cands = [candidate({
      id: 'a',
      invoiceNumber: 'INV-OLD',
      lines: [
        { description: 'aws ec2', lineTotal: 1500 },
        { description: 'AWS S3',  lineTotal: 300 },
        { description: 'Different', lineTotal: 999 },
      ],
    })]
    const out = runRulesInMemory(incoming, cands)
    expect(out.matches[0].matchType).toBe('LINE_ITEM')
    expect(out.matches[0].confidence).toBe(0.8)
    expect(out.matches[0].reason).toMatch(/2 matching line items/)
  })

  // Test 8
  it('returns isDuplicate=false / isSuspicious=false when nothing matches', () => {
    const incoming: IncomingInvoice = {
      invoiceNumber: 'INV-NEW',
      vendorId:      V1,
      totalAmount:   99999,
      invoiceDate:   '2026-06-15',
    }
    const cands = [candidate({ id: 'a', invoiceNumber: 'INV-X', vendorId: V2, totalAmount: 100, invoiceDate: '2025-01-01' })]
    const out = runRulesInMemory(incoming, cands)
    expect(out.matches).toEqual([])
    expect(out.isDuplicate).toBe(false)
    expect(out.isSuspicious).toBe(false)
  })

  // Test 10
  it('returns multiple matches sorted by confidence desc', () => {
    const incoming: IncomingInvoice = {
      invoiceNumber: 'INV-001',
      vendorId:      V1,
      totalAmount:   10000,
      invoiceDate:   '2026-05-01',
      lineItems: [
        { description: 'Line A', amount: 5000 },
        { description: 'Line B', amount: 5000 },
      ],
    }
    const cands = [
      // EXACT
      candidate({ id: 'exact',  invoiceNumber: 'INV-001' }),
      // LINE_ITEM (different invoice number, lines match)
      candidate({
        id: 'lineMatch',
        invoiceNumber: 'OTHER-99',
        invoiceDate: '2026-04-01',
        totalAmount: 50000,
        lines: [
          { description: 'Line A', lineTotal: 5000 },
          { description: 'Line B', lineTotal: 5000 },
        ],
      }),
      // FUZZY_NUMBER
      candidate({ id: 'fuzzyNum', invoiceNumber: 'INV-0001' }),
    ]
    const out = runRulesInMemory(incoming, cands)
    expect(out.matches.map(m => m.matchType)).toEqual(['EXACT', 'FUZZY_NUMBER', 'LINE_ITEM'])
    // Confidences strictly non-increasing
    for (let i = 1; i < out.matches.length; i++) {
      expect(out.matches[i - 1].confidence).toBeGreaterThanOrEqual(out.matches[i].confidence)
    }
  })

  // Test 7 (in-memory): self-check excluded when sourceId matches a candidate.
  it('excludes the source invoice from results when sourceId is passed', () => {
    const incoming: IncomingInvoice = {
      invoiceNumber: 'INV-001',
      vendorId:      V1,
      sourceId:      'self',
    }
    const cands = [
      candidate({ id: 'self', invoiceNumber: 'INV-001' }),
      candidate({ id: 'other', invoiceNumber: 'INV-001' }),
    ]
    const out = runRulesInMemory(incoming, cands)
    expect(out.matches).toHaveLength(1)
    expect(out.matches[0].invoiceId).toBe('other')
  })
})

// ── Levenshtein / similarity ────────────────────────────────────────────────

describe('levenshtein + similarity', () => {
  // Test 9
  it('levenshtein("INV-001","INV-0001") returns 1 (one insertion)', () => {
    expect(levenshtein('INV-001', 'INV-0001')).toBe(1)
  })

  it('similarity("INV-001","INV-0001") >= 0.85', () => {
    expect(similarity('INV-001', 'INV-0001')).toBeGreaterThanOrEqual(0.85)
  })

  it('similarity is 1.0 for identical strings and 0 for unrelated', () => {
    expect(similarity('ABC', 'ABC')).toBe(1)
    expect(similarity('', '')).toBe(1)
    expect(similarity('ABC', 'XYZ')).toBe(0)
  })
})

// ── DB-bound entry: assert the WHERE shape ──────────────────────────────────

describe('detectDuplicates (DB layer)', () => {
  // Test 6
  it('filters out REJECTED + CANCELLED candidates via prisma.where.status', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const db: any  = { invoice: { findMany } }
    await detectDuplicates(
      { invoiceNumber: 'INV-A', vendorId: V1 },
      TENANT,
      db,
    )
    const where = findMany.mock.calls[0][0].where
    expect(where.tenantId).toBe(TENANT)
    expect(where.status).toEqual({ notIn: ['REJECTED', 'CANCELLED'] })
  })

  // Test 7 (DB filter side)
  it('attaches the sourceId exclusion to the WHERE clause', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const db: any  = { invoice: { findMany } }
    await detectDuplicates(
      { invoiceNumber: 'INV-A', vendorId: V1, sourceId: 'inv-self' },
      TENANT,
      db,
    )
    expect(findMany.mock.calls[0][0].where.id).toEqual({ not: 'inv-self' })
  })

  it('returns empty result without hitting the DB when no identifier provided', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const db: any  = { invoice: { findMany } }
    const out = await detectDuplicates({}, TENANT, db)
    expect(findMany).not.toHaveBeenCalled()
    expect(out).toEqual({ isDuplicate: false, isSuspicious: false, matches: [] })
  })
})
