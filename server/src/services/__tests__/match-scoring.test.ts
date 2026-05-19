import { describe, it, expect } from 'vitest'
import { scoreFromInputs } from '../match-scoring.service'
import { matchItemDescription } from '../item-match.service'

// ── Pure scoring rules ─────────────────────────────────────────────────────
// scoreFromInputs() is the pure-function core of calculateMatchScore — the
// async wrapper handles DB I/O. Tests here cover the bucket maths and the
// non-PO redistribution.

const goodVendor = {
  kycPanStatus:       'VALID',
  kycGstStatus:       'ACTIVE',
  gstComplianceScore: 90,
  is206ABApplicable:  false,
  gstReturnRisk:      null,
}

describe('scoreFromInputs — PO invoice', () => {
  it('full marks across every bucket', () => {
    const r = scoreFromInputs({
      isPOInvoice:    true,
      poMatched:      true,
      grnPresent:     true,
      itemQualityPct: 100,
      vendor:         goodVendor,
      ocrOverall:     100,
    })
    expect(r.vendor).toBe(25)
    expect(r.po).toBe(20)
    expect(r.amount).toBe(15)         // 8 PO + 7 items
    expect(r.grn).toBe(20)
    expect(r.gst).toBe(10)
    expect(r.ocr).toBe(10)
    expect(r.total).toBe(100)
  })

  it('zero line-item quality still gets PO-tol partial credit', () => {
    const r = scoreFromInputs({
      isPOInvoice:    true,
      poMatched:      true,
      grnPresent:     true,
      itemQualityPct: 0,
      vendor:         goodVendor,
      ocrOverall:     100,
    })
    expect(r.amount).toBe(8)          // PO tolerance only — items contribute 0
  })

  it('PO unmatched → po and amount-PO components both zero', () => {
    const r = scoreFromInputs({
      isPOInvoice:    true,
      poMatched:      false,
      grnPresent:     false,
      itemQualityPct: 100,
      vendor:         goodVendor,
      ocrOverall:     100,
    })
    expect(r.po).toBe(0)
    expect(r.amount).toBe(7)          // items full credit, PO-tol nil
    expect(r.grn).toBe(0)
  })
})

describe('scoreFromInputs — non-PO invoice', () => {
  it('redistributes weight: full line-item quality + vendor + GST + OCR fills 100', () => {
    const r = scoreFromInputs({
      isPOInvoice:    false,
      poMatched:      false,
      grnPresent:     false,
      itemQualityPct: 100,
      vendor:         goodVendor,
      ocrOverall:     100,
    })
    expect(r.po).toBe(0)
    expect(r.grn).toBe(0)
    expect(r.amount).toBe(15)
    expect(r.total).toBe(100)
  })

  it('line-item quality drives the amount bucket', () => {
    const r = scoreFromInputs({
      isPOInvoice:    false,
      poMatched:      false,
      grnPresent:     false,
      itemQualityPct: 50,
      vendor:         goodVendor,
      ocrOverall:     100,
    })
    expect(r.amount).toBe(8)          // 50% of 15 ≈ 8
  })

  it('weak vendor KYC tanks the non-PO total', () => {
    const r = scoreFromInputs({
      isPOInvoice:    false,
      poMatched:      false,
      grnPresent:     false,
      itemQualityPct: 100,
      vendor:         { ...goodVendor, kycPanStatus: 'INVALID', kycGstStatus: 'INACTIVE' },
      ocrOverall:     100,
    })
    expect(r.vendor).toBe(0)
    // vendor 0 × 55/25 + amount 15 × 20/15 + gst 10 × 15/10 + ocr 10 × 10/10
    expect(r.total).toBe(0 + 20 + 15 + 10)
  })
})

describe('scoreFromInputs — OCR blending with narration', () => {
  it('narration confidence pulls OCR bucket toward the narration value', () => {
    const baseline = scoreFromInputs({
      isPOInvoice: false, poMatched: false, grnPresent: false,
      itemQualityPct: 100, vendor: goodVendor,
      ocrOverall: 100,
    })
    const withNarration = scoreFromInputs({
      isPOInvoice: false, poMatched: false, grnPresent: false,
      itemQualityPct: 100, vendor: goodVendor,
      ocrOverall: 100, ocrNarration: 50,
    })
    // 100 * 0.7 + 50 * 0.3 = 85 → ocr = 9
    expect(baseline.ocrBlended).toBe(100)
    expect(baseline.ocr).toBe(10)
    expect(withNarration.ocrBlended).toBe(85)
    expect(withNarration.ocr).toBe(9)
  })

  it('omitting narration confidence uses overall as-is', () => {
    const r = scoreFromInputs({
      isPOInvoice: false, poMatched: false, grnPresent: false,
      itemQualityPct: 100, vendor: goodVendor,
      ocrOverall: 78,
    })
    expect(r.ocrBlended).toBe(78)
    expect(r.ocr).toBe(8)
  })
})

describe('scoreFromInputs — 206AB guardrail dock', () => {
  it('206AB-flagged vendor drops the GST bucket to zero', () => {
    const r = scoreFromInputs({
      isPOInvoice:    true, poMatched: true, grnPresent: true,
      itemQualityPct: 100,
      vendor:         { ...goodVendor, is206ABApplicable: true },
      ocrOverall:     100,
    })
    expect(r.gst).toBe(0)
    expect(r.total).toBe(90)
  })
})

// ── Item-master fuzzy match ─────────────────────────────────────────────────

const items = [
  { id: 'i1', itemCode: 'IT-001', name: 'Cloud hosting services', description: 'AWS EC2 monthly hosting',  hsnCode: '998313', gstRate: 18, ocrKeywords: 'AWS, hosting, cloud', ocrSynonyms: null },
  { id: 'i2', itemCode: 'IT-002', name: 'Audit fees',              description: 'Statutory audit services', hsnCode: '998212', gstRate: 18, ocrKeywords: 'audit, statutory',  ocrSynonyms: null },
  { id: 'i3', itemCode: 'IT-003', name: 'Office stationery',       description: 'A4 paper, pens',           hsnCode: '4802',   gstRate: 12, ocrKeywords: null,                 ocrSynonyms: null },
]

describe('matchItemDescription', () => {
  it('finds the cloud hosting item from an AWS-style invoice line', () => {
    const r = matchItemDescription(items, 'AWS Cloud hosting — March 2026')
    expect(r.winner?.id).toBe('i1')
    expect(r.candidates.length).toBeGreaterThan(0)
    expect(r.candidates.length).toBeLessThanOrEqual(3)
    expect(r.candidates[0].score).toBeGreaterThan(0)
  })

  it('returns up-to-top-3 candidates ordered by descending score', () => {
    const r = matchItemDescription(items, 'audit services')
    expect(r.winner?.id).toBe('i2')
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i - 1].score).toBeGreaterThanOrEqual(r.candidates[i].score)
    }
  })

  it('empty description returns no candidates', () => {
    const r = matchItemDescription(items, '   ')
    expect(r.winner).toBeNull()
    expect(r.candidates).toHaveLength(0)
  })

  it('empty item list returns no candidates', () => {
    const r = matchItemDescription([], 'anything')
    expect(r.winner).toBeNull()
    expect(r.candidates).toHaveLength(0)
  })
})
