// Invoice match scoring engine
// Score 0–100 across 6 buckets — Vendor 25 / PO 20 / Amount 15 / GRN 20 / GST 10 / OCR 10.
// ≥95 = STP, 60–94 = REVIEW, <60 = MANUAL. Guardrails force MANUAL regardless of score.
//
// Per-field display scores (GSTIN/PAN exact-match chip, currency chip) are
// computed frontend-side from raw fields; the buckets here aggregate them.

import type { PrismaClient } from '@prisma/client'
import type { OcrInvoiceData } from './gemini-ocr.service.js'
import type { ItemMatchResult } from './item-match.service.js'
import { getStpThreshold } from './workflow-engine.service.js'

const STP_AMOUNT_CEIL  = Number(process.env.STP_AMOUNT_CEILING  ?? 500000)

export type ApLane = 'STP' | 'REVIEW' | 'MANUAL'
export type VendorMatchMethod = 'gstin_lookup' | 'fuzzy_name' | 'email_domain' | 'manual'

export interface VendorCandidate {
  id:        string
  legalName: string
  vendorCode: string
  gstin?:    string | null
  /** 0–100 — fuzzy similarity score. */
  score:     number
}

// scoreBreakdown is persisted as JSON on InvoiceMatchScore.scoreBreakdown.
// The match agent stores both human-readable lines (rendered as audit text)
// and structured data (vendorNearMatches, itemMatches) that the detail page
// reads to surface near-match dropdowns.
export interface LineItemMatchSummary {
  /** 0-based index into Invoice.lines (ordered by lineNumber). */
  lineIndex:  number
  winnerId:   string | null
  winnerName: string | null
  /** 0–100 of the winning candidate. */
  score:      number
  /** Top-3 candidates including the winner — feeds the per-line dropdown. */
  candidates: { id: string; itemCode: string; name: string; hsnCode: string | null; gstRate: number | null; score: number }[]
}

export interface ScoreBreakdown {
  // human-readable per-bucket explanation
  vendor:  string
  po:      string
  amount:  string
  grn:     string
  gst:     string
  ocr:     string
  mode:    string
  // structured data for the UI
  vendorMatchMethod?: VendorMatchMethod | null
  vendorNearMatches?: VendorCandidate[]
  itemMatchAvgScore?: number
  itemMatches?:       LineItemMatchSummary[]
  currencyMatch?:     boolean
  narrationConfidence?: number
}

export interface MatchScoreResult {
  vendorScore:  number
  poScore:      number
  amountScore:  number
  grnScore:     number
  gstScore:     number
  ocrScore:     number
  totalScore:   number
  lane:         ApLane
  isPOInvoice:  boolean
  guardrailsTriggered: string[]
  breakdown:    ScoreBreakdown
}

export interface MatchInput {
  invoiceId:     string
  tenantId:      string
  vendorId:      string
  totalAmount:   number
  poId?:         string
  grnId?:        string
  ocrConfidence?: number
  extractedData?: OcrInvoiceData | null
  isFirstInvoice?: boolean
  vendorMatchMethod?:  VendorMatchMethod | null
  vendorNearMatches?:  VendorCandidate[]
  itemMatches?:        ItemMatchResult[]
  /** Entity's default currency; mismatch with invoice currency raises a guardrail. */
  entityDefaultCurrency?: string
}

// Average item-master match score across all line items, normalised 0–1.
// Used as the line-item-quality factor inside the Amount bucket.
function avgItemQuality(matches: ItemMatchResult[] | undefined): number {
  if (!matches?.length) return 0
  const scores = matches.map(m => m.winner?.score ?? 0)
  const sum    = scores.reduce((a, b) => a + b, 0)
  return Math.max(0, Math.min(1, sum / scores.length / 100))
}

export async function calculateMatchScore(
  prisma: PrismaClient,
  input: MatchInput
): Promise<MatchScoreResult> {
  const guardrails: string[] = []
  let vendorScore = 0, poScore = 0, amountScore = 0, grnScore = 0, gstScore = 0, ocrScore = 0

  // ── Fetch vendor ──
  const vendor = await prisma.vendor.findFirst({
    where: { id: input.vendorId, tenantId: input.tenantId },
    select: {
      id: true, gstin: true, pan: true,
      kycPanStatus: true, kycGstStatus: true, kycBankStatus: true,
      gstComplianceScore: true, is206ABApplicable: true, gstReturnRisk: true,
      panCompliance: true, einvoiceRequired: true,
    },
  })

  const ocr = input.extractedData ?? null
  const isPOInvoice = !!input.poId

  // ── 1. Vendor match (25 pts) ──
  // 15 pts PAN-valid KYC + 10 pts GST-active KYC. Field-level exact-match for
  // GSTIN/PAN is shown as separate chips on the detail page; the bucket score
  // here measures the vendor master's compliance posture, not OCR similarity.
  if (vendor) {
    if (vendor.kycPanStatus === 'VALID')   vendorScore += 15
    if (vendor.kycGstStatus === 'ACTIVE')  vendorScore += 10
  }

  // ── 2. PO reference match (20 pts — 0 if non-PO) ──
  if (isPOInvoice && input.poId) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: input.poId, tenantId: input.tenantId }, select: { id: true },
    })
    if (po) poScore = 20
  }

  // ── 3. Amount match (15 pts) ──
  // Split: 8 pts for PO amount tolerance, 7 pts for line-item-master quality.
  // Non-PO invoices redirect the full 15 into line-item quality so the bucket
  // still represents "do the amounts on this invoice match anything authoritative".
  const itemQuality = avgItemQuality(input.itemMatches)
  if (isPOInvoice) {
    const poTol = input.poId ? 8 : 0       // simplified — full PO line-amount diff is a follow-up
    amountScore = Math.round(poTol + itemQuality * 7)
  } else {
    amountScore = Math.round(itemQuality * 15)
  }

  // ── 4. GRN confirmation (20 pts — 0 if non-PO or service) ──
  if (input.grnId) grnScore = 20

  // ── 5. GST compliance (10 pts) ──
  if (vendor) {
    const score = vendor.gstComplianceScore ?? 0
    if (score >= 80)      gstScore = 10
    else if (score >= 60) gstScore = 5
    if (vendor.is206ABApplicable) {
      gstScore = Math.max(0, gstScore - 10)
      guardrails.push('206AB_FLAG')
    }
    if (vendor.gstReturnRisk === 'HIGH') guardrails.push('GST_RETURN_RISK_HIGH')
  }

  // ── 6. OCR confidence (10 pts) ──
  // Blend overall confidence with narration confidence when narration was
  // extracted. Narration is high-signal free-text; weak narration confidence
  // usually means the model didn't actually find the field.
  const overall    = input.ocrConfidence ?? 100   // manual entry = full confidence
  const narConf    = ocr?.fieldConfidence?.narration
  const ocrBlended = narConf != null ? Math.round(overall * 0.7 + narConf * 0.3) : overall
  ocrScore = Math.min(10, Math.round((ocrBlended / 100) * 10))

  // ── Currency match — guardrail when invoice currency disagrees with entity ──
  let currencyMatch = true
  if (input.entityDefaultCurrency && ocr?.currency) {
    currencyMatch = ocr.currency.toUpperCase() === input.entityDefaultCurrency.toUpperCase()
    if (!currencyMatch) guardrails.push('CURRENCY_MISMATCH')
  }

  // ── Redistribute weight for non-PO invoices ──
  // PO + GRN go to 0 for non-PO; vendor + GST + OCR scale up to fill 100.
  let totalScore: number
  let mode: string
  if (!isPOInvoice) {
    const vNorm = (vendorScore / 25) * 55
    const aNorm = (amountScore / 15) * 20
    const gNorm = (gstScore    / 10) * 15
    const oNorm = (ocrScore    / 10) * 10
    totalScore = Math.round(vNorm + aNorm + gNorm + oNorm)
    mode = 'Non-PO scoring'
  } else {
    totalScore = Math.min(100, vendorScore + poScore + amountScore + grnScore + gstScore + ocrScore)
    mode = 'PO scoring'
  }

  // ── STP guardrails — force MANUAL regardless of score ──
  if (input.isFirstInvoice)                                  guardrails.push('FIRST_INVOICE_FROM_VENDOR')
  if (input.totalAmount > STP_AMOUNT_CEIL)                   guardrails.push('AMOUNT_EXCEEDS_STP_CEILING')
  if (vendor?.kycBankStatus !== 'VALID')                     guardrails.push('BANK_KYC_NOT_VALID')
  if (vendor?.einvoiceRequired && !ocr?.irn)                 guardrails.push('EINVOICE_IRN_MISSING')

  // ── Assign lane ──
  let lane: ApLane
  if (guardrails.length > 0)                           lane = 'MANUAL'
  else if (totalScore >= getStpThreshold(isPOInvoice)) lane = 'STP'
  else if (totalScore >= 60)                           lane = 'REVIEW'
  else                                                  lane = 'MANUAL'

  const breakdown: ScoreBreakdown = {
    vendor: `PAN:${vendor?.kycPanStatus ?? '?'} GST:${vendor?.kycGstStatus ?? '?'}`,
    po:     isPOInvoice ? (input.poId ? 'PO matched' : 'PO reference invalid') : 'Non-PO invoice',
    amount: isPOInvoice
      ? `PO tol + items (avg ${Math.round(itemQuality * 100)}%)`
      : `Items (avg ${Math.round(itemQuality * 100)}%)`,
    grn:    input.grnId ? 'GRN confirmed' : (isPOInvoice ? 'No GRN found' : 'Non-PO — not scored'),
    gst:    `Score:${vendor?.gstComplianceScore ?? 0} 206AB:${vendor?.is206ABApplicable ?? false}`,
    ocr:    `Blend:${ocrBlended}% (overall:${overall}, narration:${narConf ?? '-'})`,
    mode,
    vendorMatchMethod:   input.vendorMatchMethod ?? null,
    vendorNearMatches:   input.vendorNearMatches ?? [],
    itemMatchAvgScore:   Math.round(itemQuality * 100),
    itemMatches:         (input.itemMatches ?? []).map((m, lineIndex) => ({
      lineIndex,
      winnerId:   m.winner?.id ?? null,
      winnerName: m.winner?.name ?? null,
      score:      m.winner?.score ?? 0,
      candidates: m.candidates.map(c => ({
        id: c.id, itemCode: c.itemCode, name: c.name, hsnCode: c.hsnCode, gstRate: c.gstRate, score: c.score,
      })),
    })),
    currencyMatch,
    narrationConfidence: narConf,
  }

  // ── Persist match score ──
  await prisma.invoiceMatchScore.upsert({
    where:  { invoiceId: input.invoiceId },
    update: { vendorScore, poScore, amountScore, grnScore, gstScore, ocrScore, totalScore, lane, isPOInvoice, guardrailsTriggered: guardrails, scoreBreakdown: breakdown as unknown as object },
    create: { invoiceId: input.invoiceId, tenantId: input.tenantId, vendorScore, poScore, amountScore, grnScore, gstScore, ocrScore, totalScore, lane, isPOInvoice, guardrailsTriggered: guardrails, scoreBreakdown: breakdown as unknown as object },
  })

  // ── Update invoice with score + lane + match method ──
  await prisma.invoice.update({
    where: { id: input.invoiceId },
    data:  {
      matchScore:        totalScore,
      matchLane:         lane,
      apLane:            lane,
      vendorMatchMethod: input.vendorMatchMethod ?? undefined,
    },
  })

  return { vendorScore, poScore, amountScore, grnScore, gstScore, ocrScore, totalScore, lane, isPOInvoice, guardrailsTriggered: guardrails, breakdown }
}

export async function routeInvoiceToLane(
  prisma: PrismaClient,
  invoiceId: string,
  tenantId: string,
  userId: string,
  score: MatchScoreResult
): Promise<void> {
  if (score.lane === 'STP') {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'PENDING_L1' } })
    await prisma.approvalStep.create({
      data: { tenantId, invoiceId, level: 1, approverId: userId, status: 'PENDING' },
    })
  } else if (score.lane === 'REVIEW') {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'SUBMITTED' } })
  }
  // MANUAL: stays in DRAFT, AP clerk handles manually
}

// ── Pure scoring helpers (exported for unit tests) ──
// These run without a Prisma client so the scoring rules can be tested in
// isolation. The async calculateMatchScore() above orchestrates DB I/O and
// delegates the maths to these.

export interface PureScoreInput {
  isPOInvoice:        boolean
  poMatched:          boolean
  grnPresent:         boolean
  itemQualityPct:     number     // 0–100 average across line items
  vendor: {
    kycPanStatus:    string | null
    kycGstStatus:    string | null
    gstComplianceScore: number | null
    is206ABApplicable:  boolean
    gstReturnRisk:   string | null
  }
  ocrOverall:         number     // 0–100
  ocrNarration?:      number     // 0–100
}

export interface PureScoreOutput {
  vendor:  number
  po:      number
  amount:  number
  grn:     number
  gst:     number
  ocr:     number
  total:   number
  ocrBlended: number
}

export function scoreFromInputs(p: PureScoreInput): PureScoreOutput {
  let vendor = 0
  if (p.vendor.kycPanStatus === 'VALID')  vendor += 15
  if (p.vendor.kycGstStatus === 'ACTIVE') vendor += 10

  const po = p.isPOInvoice && p.poMatched ? 20 : 0

  const itemQ = Math.max(0, Math.min(1, p.itemQualityPct / 100))
  const amount = p.isPOInvoice
    ? Math.round((p.poMatched ? 8 : 0) + itemQ * 7)
    : Math.round(itemQ * 15)

  const grn = p.grnPresent ? 20 : 0

  let gst = 0
  const gstC = p.vendor.gstComplianceScore ?? 0
  if (gstC >= 80)      gst = 10
  else if (gstC >= 60) gst = 5
  if (p.vendor.is206ABApplicable) gst = Math.max(0, gst - 10)

  const ocrBlended = p.ocrNarration != null
    ? Math.round(p.ocrOverall * 0.7 + p.ocrNarration * 0.3)
    : p.ocrOverall
  const ocr = Math.min(10, Math.round((ocrBlended / 100) * 10))

  let total: number
  if (!p.isPOInvoice) {
    total = Math.round((vendor / 25) * 55 + (amount / 15) * 20 + (gst / 10) * 15 + (ocr / 10) * 10)
  } else {
    total = Math.min(100, vendor + po + amount + grn + gst + ocr)
  }

  return { vendor, po, amount, grn, gst, ocr, total, ocrBlended }
}
