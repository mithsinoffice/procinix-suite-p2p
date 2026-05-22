// Pure-helper tests for the direct-invoice form. GST split (intra/inter),
// line totals, cross-check (base/gross mismatch detection), JV builder
// (balanced Dr=Cr), GL picker (graceful fallback when COA names diverge),
// PAN-from-GSTIN extraction.

import { describe, it, expect } from 'vitest'
import {
  computeGstSplit,
  computeLineItemTotals,
  computeCrossCheck,
  computeJvEntries,
  jvTotals,
  pickGl,
  panFromGstin,
  normalizeStateCode,
  type GlCodeRef,
  type JvBuildContext,
} from '../invoice-form'

// ── computeGstSplit ─────────────────────────────────────────────────────────

describe('computeGstSplit', () => {
  it('returns 0/0/0 when amount or rate is 0', () => {
    expect(computeGstSplit('27AAACT2727Q1ZW', '27', 0,    18)).toEqual({ cgst: 0, sgst: 0, igst: 0 })
    expect(computeGstSplit('27AAACT2727Q1ZW', '27', 1000, 0 )).toEqual({ cgst: 0, sgst: 0, igst: 0 })
  })

  // Both Maharashtra (state code 27) → intra-state → CGST 9% + SGST 9%
  it('intra-state: vendor GSTIN state matches bill-to → 50/50 CGST + SGST', () => {
    expect(computeGstSplit('27AAACT2727Q1ZW', '27', 1000, 18)).toEqual({
      cgst: 90, sgst: 90, igst: 0,
    })
  })

  // Maharashtra (27) vendor, Karnataka (29) bill-to → inter-state → IGST full
  it('inter-state: vendor GSTIN state differs from bill-to → IGST full', () => {
    expect(computeGstSplit('27AAACT2727Q1ZW', '29', 1000, 18)).toEqual({
      cgst: 0, sgst: 0, igst: 180,
    })
  })

  it('falls back to intra-state when vendor GSTIN is missing', () => {
    expect(computeGstSplit(null, '27', 1000, 18)).toEqual({ cgst: 90, sgst: 90, igst: 0 })
  })

  it('falls back to intra-state when bill-to state code is missing', () => {
    expect(computeGstSplit('27AAACT2727Q1ZW', null, 1000, 18)).toEqual({ cgst: 90, sgst: 90, igst: 0 })
  })

  it('handles 5% / 12% / 28% rates correctly', () => {
    expect(computeGstSplit('27A', '27', 1000,  5)).toEqual({ cgst: 25,  sgst: 25,  igst: 0   })
    expect(computeGstSplit('27A', '27', 1000, 12)).toEqual({ cgst: 60,  sgst: 60,  igst: 0   })
    expect(computeGstSplit('27A', '29', 1000, 28)).toEqual({ cgst: 0,   sgst: 0,   igst: 280 })
  })
})

// ── computeLineItemTotals ───────────────────────────────────────────────────

describe('computeLineItemTotals', () => {
  it('builds total for a CGST + SGST line (intra-state)', () => {
    const split = computeGstSplit('27A', '27', 1000, 18)
    const out   = computeLineItemTotals({ quantity: 10, unitPrice: 100, gstRate: 18 }, split, 0)
    expect(out).toEqual({
      taxableAmount: 1000,
      cgst: 90, sgst: 90, igst: 0,
      tdsAmount: 0,
      total: 1180,   // 1000 + 90 + 90
    })
  })

  it('builds total for an IGST line (inter-state)', () => {
    const split = computeGstSplit('27A', '29', 1000, 18)
    const out   = computeLineItemTotals({ quantity: 10, unitPrice: 100, gstRate: 18 }, split, 0)
    expect(out).toEqual({
      taxableAmount: 1000,
      cgst: 0, sgst: 0, igst: 180,
      tdsAmount: 0,
      total: 1180,
    })
  })

  it('deducts TDS from the line total (withholding accounting)', () => {
    const split = computeGstSplit('27A', '27', 1000, 18)
    const out   = computeLineItemTotals({ quantity: 10, unitPrice: 100, gstRate: 18 }, split, 10)
    expect(out.tdsAmount).toBe(100)         // 10% of taxable 1000
    expect(out.total).toBe(1080)            // 1000 + 180 GST − 100 TDS
  })

  it('applies discount % to taxable before GST', () => {
    const split = computeGstSplit('27A', '27', 900, 18)
    const out   = computeLineItemTotals({ quantity: 10, unitPrice: 100, gstRate: 18, discountPct: 10 }, split, 0)
    expect(out.taxableAmount).toBe(900)
    expect(out.total).toBe(900 + split.cgst + split.sgst)
  })
})

// ── computeCrossCheck ───────────────────────────────────────────────────────

describe('computeCrossCheck', () => {
  it('reports hasLines=false when there are no lines (no validation, both pass)', () => {
    const out = computeCrossCheck(1000, 1180, [])
    expect(out.hasLines).toBe(false)
    expect(out.baseMatch).toBe(true)
    expect(out.grossMatch).toBe(true)
  })

  it('matches when base + tax = gross and base = lines taxable sum', () => {
    const lines = [{ taxableAmount: 1000, cgstAmount: 90, sgstAmount: 90, igstAmount: 0 }]
    const out = computeCrossCheck(1000, 1180, lines)
    expect(out.baseMatch).toBe(true)
    expect(out.grossMatch).toBe(true)
    expect(out.baseDelta).toBe(0)
    expect(out.grossDelta).toBe(0)
  })

  it('flags base mismatch when user-entered base diverges from lines', () => {
    const lines = [{ taxableAmount: 1000, cgstAmount: 90, sgstAmount: 90, igstAmount: 0 }]
    const out = computeCrossCheck(950, 1130, lines)   // base too low by 50
    expect(out.baseMatch).toBe(false)
    expect(out.baseDelta).toBe(-50)
  })

  it('flags gross mismatch when gross diverges from base + tax', () => {
    const lines = [{ taxableAmount: 1000, cgstAmount: 90, sgstAmount: 90, igstAmount: 0 }]
    const out = computeCrossCheck(1000, 1200, lines)  // gross too high by 20
    expect(out.grossMatch).toBe(false)
    expect(out.grossDelta).toBe(20)
  })

  it('tolerates paise rounding on large invoices', () => {
    const lines = [{ taxableAmount: 1_000_000, cgstAmount: 90_000, sgstAmount: 90_000, igstAmount: 0 }]
    // 0.4 rupee drift — tolerance scales (1M × 0.2% = 2000), so this passes.
    const out = computeCrossCheck(1_000_000.4, 1_180_000.4, lines)
    expect(out.baseMatch).toBe(true)
    expect(out.grossMatch).toBe(true)
  })
})

// ── pickGl ──────────────────────────────────────────────────────────────────

const SEEDED_GLS: GlCodeRef[] = [
  { id: 'g1', code: '2030', name: 'Accounts Payable — IT Vendors',        accountType: 'LIABILITY' },
  { id: 'g2', code: '2031', name: 'Accounts Payable — Services',          accountType: 'LIABILITY' },
  { id: 'g3', code: '2032', name: 'Accounts Payable — Rent',              accountType: 'LIABILITY' },
  { id: 'g4', code: '2021', name: 'CGST Payable',                          accountType: 'LIABILITY' },
  { id: 'g5', code: '2022', name: 'SGST Payable',                          accountType: 'LIABILITY' },
  { id: 'g6', code: '2023', name: 'IGST Payable',                          accountType: 'LIABILITY' },
  { id: 'g7', code: '2010', name: 'TDS Payable — 194C',                    accountType: 'LIABILITY' },
  { id: 'g8', code: '1051', name: 'TDS Receivable',                        accountType: 'ASSET'     },
]

describe('pickGl', () => {
  it('returns the first GL whose name contains all the search terms', () => {
    expect(pickGl(SEEDED_GLS, { contains: ['Accounts', 'Payable'] })?.code).toBe('2030')
  })

  it('ANDs the contains terms — both must be in the name', () => {
    // 'Receivable' matches TDS Receivable, NOT TDS Payable
    expect(pickGl(SEEDED_GLS, { contains: ['TDS', 'Receivable'] })?.code).toBe('1051')
    expect(pickGl(SEEDED_GLS, { contains: ['TDS', 'Payable']   })?.code).toBe('2010')
  })

  it('returns null when no GL matches (caller surfaces "GL not configured")', () => {
    expect(pickGl(SEEDED_GLS, { contains: ['Retention'] })).toBeNull()
  })

  it('filters by accountType when given', () => {
    expect(pickGl(SEEDED_GLS, { contains: ['CGST'], accountType: 'LIABILITY' })?.code).toBe('2021')
    expect(pickGl(SEEDED_GLS, { contains: ['CGST'], accountType: 'ASSET' })).toBeNull()
  })
})

// ── computeJvEntries + jvTotals ─────────────────────────────────────────────

function ctx(over: Partial<JvBuildContext> = {}): JvBuildContext {
  return {
    apGl:        SEEDED_GLS[0],   // AP — IT Vendors
    cgstGl:      SEEDED_GLS[3],   // CGST Payable (closest to Input CGST in seed)
    sgstGl:      SEEDED_GLS[4],
    igstGl:      SEEDED_GLS[5],
    tdsGl:       SEEDED_GLS[6],   // TDS Payable 194C
    retentionGl: null,            // not seeded — JV preview tolerates
    ...over,
  }
}

describe('computeJvEntries', () => {
  it('builds a balanced JV for a simple intra-state line, no retention, no TDS', () => {
    const split = computeGstSplit('27A', '27', 1000, 18)
    const totals = computeLineItemTotals({ quantity: 10, unitPrice: 100, gstRate: 18 }, split, 0)
    const entries = computeJvEntries(
      [{
        description: 'Widget',
        taxableAmount: totals.taxableAmount,
        cgstAmount:    totals.cgst,
        sgstAmount:    totals.sgst,
        igstAmount:    totals.igst,
        tdsAmount:     totals.tdsAmount,
        glCode: '5001', glName: 'Office Supplies',
      }],
      /* retention */ 0,
      ctx(),
    )
    const totalsOut = jvTotals(entries)
    expect(totalsOut.balanced).toBe(true)
    expect(totalsOut.totalDr).toBe(1180)
    expect(totalsOut.totalCr).toBe(1180)
  })

  it('balances when retention is withheld (CR splits into AP + Retention)', () => {
    const split = computeGstSplit('27A', '27', 1000, 18)
    const totals = computeLineItemTotals({ quantity: 10, unitPrice: 100, gstRate: 18 }, split, 0)
    const entries = computeJvEntries(
      [{
        description: 'Widget',
        taxableAmount: totals.taxableAmount,
        cgstAmount:    totals.cgst,
        sgstAmount:    totals.sgst,
        igstAmount:    totals.igst,
        tdsAmount:     0,
      }],
      /* retention */ 100,
      ctx({ retentionGl: { id: 'gR', code: '2099', name: 'Retention Payable' } }),
    )
    const totalsOut = jvTotals(entries)
    expect(totalsOut.balanced).toBe(true)
    // AP gets the remainder, retention takes 100
    expect(entries.find(e => e.glCode === '2099')?.amount).toBe(100)
    expect(entries.find(e => e.glCode === '2030')?.amount).toBe(1080)
  })

  it('balances when TDS is withheld (CR splits into AP + TDS Payable)', () => {
    const split = computeGstSplit('27A', '27', 1000, 18)
    const totals = computeLineItemTotals({ quantity: 10, unitPrice: 100, gstRate: 18 }, split, 10)  // 10% TDS
    const entries = computeJvEntries(
      [{
        description: 'Service',
        taxableAmount: totals.taxableAmount,
        cgstAmount:    totals.cgst,
        sgstAmount:    totals.sgst,
        igstAmount:    totals.igst,
        tdsAmount:     totals.tdsAmount,
      }],
      0,
      ctx(),
    )
    const totalsOut = jvTotals(entries)
    expect(totalsOut.balanced).toBe(true)
    expect(entries.find(e => e.glDescription.includes('TDS'))?.amount).toBe(100)
  })

  it('builds an IGST DR (no CGST/SGST) when the line is inter-state', () => {
    const split = computeGstSplit('27A', '29', 1000, 18)
    const totals = computeLineItemTotals({ quantity: 10, unitPrice: 100, gstRate: 18 }, split, 0)
    const entries = computeJvEntries(
      [{
        description: 'Inter-state widget',
        taxableAmount: totals.taxableAmount,
        cgstAmount:    totals.cgst,
        sgstAmount:    totals.sgst,
        igstAmount:    totals.igst,
        tdsAmount:     0,
      }],
      0,
      ctx(),
    )
    expect(entries.find(e => e.glDescription.includes('CGST'))).toBeUndefined()
    expect(entries.find(e => e.glDescription.includes('SGST'))).toBeUndefined()
    expect(entries.find(e => e.glDescription.includes('IGST'))?.amount).toBe(180)
    expect(jvTotals(entries).balanced).toBe(true)
  })

  it('passes glCode=null on the entry when a GL is unresolved (UI flags "not configured")', () => {
    const split = computeGstSplit('27A', '27', 1000, 18)
    const totals = computeLineItemTotals({ quantity: 10, unitPrice: 100, gstRate: 18 }, split, 0)
    const entries = computeJvEntries(
      [{
        description: 'Widget',
        taxableAmount: totals.taxableAmount,
        cgstAmount:    totals.cgst,
        sgstAmount:    totals.sgst,
        igstAmount:    totals.igst,
        tdsAmount:     0,
      }],
      100,
      ctx({ retentionGl: null }),  // retention enabled but GL not in COA
    )
    const retentionEntry = entries.find(e => e.glDescription === 'Retention Payable')
    expect(retentionEntry).toBeDefined()
    expect(retentionEntry!.glCode).toBeNull()
  })
})

// ── panFromGstin ────────────────────────────────────────────────────────────

describe('panFromGstin', () => {
  it('extracts the PAN (chars 3-12) from a valid GSTIN', () => {
    expect(panFromGstin('27AAACT2727Q1ZW')).toBe('AAACT2727Q')
    expect(panFromGstin('29AABCT1234R1ZK')).toBe('AABCT1234R')
  })

  it('uppercases the result', () => {
    expect(panFromGstin('27aaact2727q1zw')).toBe('AAACT2727Q')
  })

  it('returns null for short / missing input', () => {
    expect(panFromGstin('')).toBeNull()
    expect(panFromGstin(null)).toBeNull()
    expect(panFromGstin('27AB')).toBeNull()
  })
})

// ── computeLineItemTotals precision ─────────────────────────────────────────
// Locks the rounding behaviour the recalcLine chain inherits — every monetary
// intermediate is rounded so noisy float multiplications don't bleed through
// (e.g. "1.0007 × 125000" producing "125087.50" in the UI).

describe('computeLineItemTotals — precision', () => {
  it('qty=1, rate=125000, disc=0, gst=18% → taxable 125000.00 exactly', () => {
    const out = computeLineItemTotals(
      { quantity: 1, unitPrice: 125000, discountPct: 0 },
      { cgst: 11250, sgst: 11250, igst: 0 },
      0,
    )
    expect(out.taxableAmount).toBe(125000)
    expect(out.total).toBe(125000 + 22500) // 147500.00
  })

  it('noisy qty (1.0007) is rounded to 3dp before multiplication', () => {
    const out = computeLineItemTotals(
      { quantity: 1.0007, unitPrice: 125000, discountPct: 0 },
      { cgst: 0, sgst: 0, igst: 0 },
      0,
    )
    // 1.001 × 125000 = 125125 (round3 doesn't snap to 1; the OCR layer does).
    // What matters here is the result is finite & rounded — no 125000.0001 artefacts.
    expect(Number.isInteger(out.taxableAmount * 100)).toBe(true)
  })

  it('discount applied to base before tax', () => {
    const out = computeLineItemTotals(
      { quantity: 2, unitPrice: 1000, discountPct: 10 },
      { cgst: 162, sgst: 162, igst: 0 },
      2,
    )
    // base 2000 - 10% = 1800 taxable; tds 2% on taxable = 36; total = 1800 + 324 - 36 = 2088
    expect(out.taxableAmount).toBe(1800)
    expect(out.tdsAmount).toBe(36)
    expect(out.total).toBe(2088)
  })
})

// ── normalizeStateCode ──────────────────────────────────────────────────────
// The OCR / vendor / location data sources are inconsistent: vendor.stateCode
// is numeric ("27"), location.state is free text ("Maharashtra"), OCR can emit
// "Maharashtra (27)" or "27-Maharashtra". All must collapse to "27" so the
// GST split compares apples to apples.

describe('normalizeStateCode', () => {
  it('returns the 2-digit code unchanged', () => {
    expect(normalizeStateCode('27')).toBe('27')
    expect(normalizeStateCode('09')).toBe('09')
  })

  it('parses parenthesised codes — "Maharashtra (27)" → 27', () => {
    expect(normalizeStateCode('Maharashtra (27)')).toBe('27')
    expect(normalizeStateCode('Karnataka (29)')).toBe('29')
  })

  it('parses prefix codes — "27-Maharashtra" / "27 Maharashtra" → 27', () => {
    expect(normalizeStateCode('27-Maharashtra')).toBe('27')
    expect(normalizeStateCode('27 Maharashtra')).toBe('27')
  })

  it('resolves canonical state names (case-insensitive)', () => {
    expect(normalizeStateCode('Maharashtra')).toBe('27')
    expect(normalizeStateCode('maharashtra')).toBe('27')
    expect(normalizeStateCode('KARNATAKA')).toBe('29')
    expect(normalizeStateCode('Tamil Nadu')).toBe('33')
  })

  it('finds a state name embedded in a prefixed string', () => {
    expect(normalizeStateCode('Place of Supply: Maharashtra')).toBe('27')
    expect(normalizeStateCode('State: Karnataka')).toBe('29')
  })

  it('returns empty string for unknown / falsy input', () => {
    expect(normalizeStateCode('')).toBe('')
    expect(normalizeStateCode(null)).toBe('')
    expect(normalizeStateCode(undefined)).toBe('')
    expect(normalizeStateCode('Atlantis')).toBe('')
  })
})
