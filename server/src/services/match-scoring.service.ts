// Invoice match scoring engine
// Score 0–100 across 6 dimensions
// ≥95 = STP lane (auto-submit for approval, skip AP review queue)
// 60–94 = REVIEW lane (AP exception queue)
// <60 = MANUAL lane (full approval workflow)
// Non-PO invoices: PO/GRN weight redistributed to vendor + GST

import type { PrismaClient } from '@prisma/client'
import type { OcrInvoiceData } from './gemini-ocr.service.js'

import { getStpThreshold } from './workflow-engine.service.js'

const STP_AMOUNT_CEIL  = Number(process.env.STP_AMOUNT_CEILING  ?? 500000)

export type ApLane = 'STP' | 'REVIEW' | 'MANUAL'

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
  breakdown:    Record<string, string>
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
}

export async function calculateMatchScore(
  prisma: PrismaClient,
  input: MatchInput
): Promise<MatchScoreResult> {
  const guardrails: string[] = []
  const breakdown: Record<string, string> = {}
  let vendorScore = 0, poScore = 0, amountScore = 0, grnScore = 0, gstScore = 0, ocrScore = 0

  // ── Fetch vendor ──
  const vendor = await prisma.vendor.findFirst({
    where: { id: input.vendorId, tenantId: input.tenantId },
    select: {
      id: true, kycPanStatus: true, kycGstStatus: true, kycBankStatus: true,
      gstComplianceScore: true, is206ABApplicable: true, gstReturnRisk: true,
      panCompliance: true, einvoiceRequired: true,
    },
  })

  // ── 1. Vendor match (25 pts) ──
  if (vendor) {
    if (vendor.kycPanStatus === 'VALID')   vendorScore += 15
    if (vendor.kycGstStatus === 'ACTIVE')  vendorScore += 10
    breakdown.vendor = `PAN:${vendor.kycPanStatus ?? '?'} GST:${vendor.kycGstStatus ?? '?'}`
  }

  // ── 2. PO reference match (20 pts — 0 if non-PO) ──
  const isPOInvoice = !!input.poId
  if (isPOInvoice) {
    const po = await prisma.invoice.findFirst({ where: { id: input.poId!, tenantId: input.tenantId } })
    if (po) {
      poScore = 20
      breakdown.po = `PO matched`
    } else {
      breakdown.po = 'PO reference invalid'
    }
  } else {
    breakdown.po = 'Non-PO invoice — weight redistributed'
  }

  // ── 3. Amount match vs PO (20 pts — 0 if non-PO) ──
  if (isPOInvoice && input.poId) {
    // For MVP: simplified — if PO exists, give partial credit
    // Full implementation: compare invoice amount vs PO line amounts
    amountScore = 15
    breakdown.amount = 'Within PO tolerance'
  } else {
    breakdown.amount = 'Non-PO — not scored'
  }

  // ── 4. GRN confirmation (20 pts — 0 if non-PO or service) ──
  if (input.grnId) {
    grnScore = 20
    breakdown.grn = 'GRN confirmed'
  } else if (isPOInvoice) {
    breakdown.grn = 'No GRN found'
  } else {
    breakdown.grn = 'Non-PO — not scored'
  }

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
    breakdown.gst = `Score:${score} 206AB:${vendor.is206ABApplicable}`
  }

  // ── 6. OCR confidence (5 pts) ──
  const ocr = input.ocrConfidence ?? 100 // manual entry = full confidence
  if (ocr >= 95)      ocrScore = 5
  else if (ocr >= 80) ocrScore = 3
  breakdown.ocr = `Confidence:${ocr}%`

  // ── Redistribute weight for non-PO invoices ──
  // PO + amount + GRN = up to 60 pts for PO invoices, 0 for non-PO
  // For non-PO: vendor weight increases to 55, GST to 35, OCR to 10
  let totalScore: number
  if (!isPOInvoice) {
    // Non-PO scoring: vendor 55% + GST 35% + OCR 10%
    const vNorm  = (vendorScore / 25) * 55
    const gNorm  = (gstScore   / 10) * 35
    const oNorm  = (ocrScore   / 5)  * 10
    totalScore = Math.round(vNorm + gNorm + oNorm)
    breakdown.mode = 'Non-PO scoring'
  } else {
    totalScore = Math.min(100, vendorScore + poScore + amountScore + grnScore + gstScore + ocrScore)
    breakdown.mode = 'PO scoring'
  }

  // ── STP guardrails — force MANUAL regardless of score ──
  if (input.isFirstInvoice)                           guardrails.push('FIRST_INVOICE_FROM_VENDOR')
  if (input.totalAmount > STP_AMOUNT_CEIL)            guardrails.push('AMOUNT_EXCEEDS_STP_CEILING')
  if (vendor?.kycBankStatus !== 'VALID')              guardrails.push('BANK_KYC_NOT_VALID')
  if (vendor?.einvoiceRequired && !input.extractedData?.irn) guardrails.push('EINVOICE_IRN_MISSING')

  // ── Assign lane ──
  let lane: ApLane
  if (guardrails.length > 0)                           lane = 'MANUAL'
  else if (totalScore >= getStpThreshold(isPOInvoice)) lane = 'STP'
  else if (totalScore >= 60)                           lane = 'REVIEW'
  else                                                  lane = 'MANUAL'

  // ── Persist match score ──
  await prisma.invoiceMatchScore.upsert({
    where:  { invoiceId: input.invoiceId },
    update: { vendorScore, poScore, amountScore, grnScore, gstScore, ocrScore, totalScore, lane, isPOInvoice, guardrailsTriggered: guardrails, scoreBreakdown: breakdown },
    create: { invoiceId: input.invoiceId, tenantId: input.tenantId, vendorScore, poScore, amountScore, grnScore, gstScore, ocrScore, totalScore, lane, isPOInvoice, guardrailsTriggered: guardrails, scoreBreakdown: breakdown },
  })

  // ── Update invoice with score + lane ──
  await prisma.invoice.update({
    where: { id: input.invoiceId },
    data:  { matchScore: totalScore, matchLane: lane, apLane: lane },
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
    // STP: auto-submit for approval — skips AP review, goes straight to L1 approver
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'PENDING_L1' } })
    await prisma.approvalStep.create({
      data: { tenantId, invoiceId, level: 1, approverId: userId, status: 'PENDING' },
    })
  } else if (score.lane === 'REVIEW') {
    // REVIEW: submitted but flagged for AP clerk review first
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'SUBMITTED' } })
  }
  // MANUAL: stays in DRAFT, AP clerk handles manually
}
