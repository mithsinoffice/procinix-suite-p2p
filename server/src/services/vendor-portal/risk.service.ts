// Vendor risk-scoring engine — Sprint 3.
//
// Computes a 0–100 risk score for a vendor by collecting factor "hits"
// across four buckets (financialRisk, geopoliticalRisk, complianceRisk,
// operationalRisk), then collapsing them to a single weighted total using
// the weights from the matched VendorRiskMatrixRule. The result is
// persisted to VendorRiskHistory (immutable audit trail) and reflected on
// VendorProfile.riskScore / riskTier for quick reads.
//
// The factor → bucket mapping is intentionally hardcoded here rather than
// stored in VendorRiskFactor: the factor table lives in the schema for
// future buyer-configurable scoring, but Sprint 3 ships with a fixed,
// well-documented baseline so risk numbers don't drift between releases
// before the buyer-side scoring rules UI lands.

import type { Prisma, PrismaClient } from '@prisma/client'

// ── Public types ──────────────────────────────────────────────────────────

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type RiskTrigger =
  | 'ONBOARDING'
  | 'SPEND_CHANGE'
  | 'DOC_EXPIRY'
  | 'SANCTIONS_HIT'
  | 'MANUAL'
  | 'SCHEDULED'

export interface RiskBuckets {
  financialRisk:    number
  geopoliticalRisk: number
  complianceRisk:   number
  operationalRisk:  number
}

export interface RiskFactorHit {
  key:    string
  label:  string
  bucket: keyof RiskBuckets
  points: number
  detail: string
}

export interface RiskBreakdown {
  buckets:  RiskBuckets         // raw bucket totals (before weighting)
  weights:  RiskBuckets         // weights applied (0–100, must sum to ~100)
  weighted: RiskBuckets         // bucket × weight / 100
  factors:  RiskFactorHit[]     // every factor that contributed
  total:    number              // final 0–100 score
  tier:     RiskTier
}

export interface CalculateRiskScoreResult {
  riskScore: number
  riskTier:  RiskTier
  breakdown: RiskBreakdown
}

// ── Static config ─────────────────────────────────────────────────────────

// Countries flagged for elevated geopolitical risk by major sanctions
// regimes (OFAC + EU + UN composite list). Buyers in regulated industries
// can shrink or expand this via the matrix rules later; the hardcoded list
// is the safe-default Sprint 3 baseline.
const HIGH_RISK_COUNTRIES = new Set(['RU', 'CN', 'IR', 'KP', 'BY', 'MM', 'CU'])

// Default weights when no matrix rule matches OR the matched rule's
// riskWeights JSON is malformed. Sum = 100. Bias geopolitical + compliance
// slightly higher than financial + operational since sanctions/KYC findings
// have the most legal exposure on the buyer side.
const DEFAULT_WEIGHTS: RiskBuckets = {
  financialRisk:    25,
  geopoliticalRisk: 30,
  complianceRisk:   30,
  operationalRisk:  15,
}

// Tier cutoffs — closed-open intervals: [0,40) → LOW, [40,60) → MEDIUM,
// [60,80) → HIGH, [80,100] → CRITICAL. Edge points (40, 60, 80) belong to
// the higher tier so a "borderline" score doesn't get the more permissive
// label.
function tierFor(score: number): RiskTier {
  if (score >= 80) return 'CRITICAL'
  if (score >= 60) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  return 'LOW'
}

// Read the weight JSON off a matrix rule with a defensive fallback. Any
// missing field falls back to the default; any non-numeric value (string,
// null) is dropped. The sum is normalised to 100 in case the rule's
// weights don't add up — keeps the math comparable across rules.
function normaliseWeights(raw: unknown): RiskBuckets {
  const w: RiskBuckets = { ...DEFAULT_WEIGHTS }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    for (const k of Object.keys(w) as (keyof RiskBuckets)[]) {
      const v = r[k]
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) w[k] = v
    }
  }
  const sum = w.financialRisk + w.geopoliticalRisk + w.complianceRisk + w.operationalRisk
  if (sum === 0) return { ...DEFAULT_WEIGHTS }
  // Normalise so weighted total maxes out at 100.
  const scale = 100 / sum
  return {
    financialRisk:    w.financialRisk    * scale,
    geopoliticalRisk: w.geopoliticalRisk * scale,
    complianceRisk:   w.complianceRisk   * scale,
    operationalRisk:  w.operationalRisk  * scale,
  }
}

// ── Factor evaluators ────────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

interface ProfileForRisk {
  id:           string
  tenantId:     string
  countryCode:  string
  vendorType:   string
  industryCategory: string | null
  createdAt:    Date
  bankAccounts:      Array<{ verificationStatus: string }>
  complianceRecords: Array<{ expiresAt: Date | null; documentType: string }>
  screenings:        Array<{ status: string; listName: string; screeningProvider: string }>
}

function collectFactors(profile: ProfileForRisk): RiskFactorHit[] {
  const hits: RiskFactorHit[] = []
  const now = Date.now()

  // SANCTIONS_HIT — any screening with status=HIT contributes a large chunk
  // to geopolitical. Multiple hits compound (each adds 40) up to a cap of
  // 100 inside the bucket — we don't cap here, the bucket math handles it.
  for (const s of profile.screenings) {
    if (s.status === 'HIT') {
      hits.push({
        key:    'SANCTIONS_HIT',
        label:  `Sanctions hit on ${s.listName} (${s.screeningProvider})`,
        bucket: 'geopoliticalRisk',
        points: 40,
        detail: `${s.screeningProvider} flagged this vendor against the ${s.listName} list`,
      })
    }
  }

  // DOC_EXPIRY — compliance records with expiresAt inside the next 30d.
  // Already-expired records count too (negative msRemaining still ≤ 30d).
  for (const c of profile.complianceRecords) {
    if (!c.expiresAt) continue
    const msRemaining = c.expiresAt.getTime() - now
    if (msRemaining <= THIRTY_DAYS_MS) {
      const expired = msRemaining < 0
      hits.push({
        key:    'DOC_EXPIRY',
        label:  expired ? `${c.documentType} document expired` : `${c.documentType} document expiring soon`,
        bucket: 'complianceRisk',
        points: 15,
        detail: expired
          ? `${c.documentType} expired ${Math.abs(Math.round(msRemaining / 86_400_000))} days ago`
          : `${c.documentType} expires in ${Math.round(msRemaining / 86_400_000)} days`,
      })
    }
  }

  // COUNTRY_RISK — vendor's countryCode is on the high-risk list.
  if (HIGH_RISK_COUNTRIES.has(profile.countryCode)) {
    hits.push({
      key:    'COUNTRY_RISK',
      label:  `High-risk country: ${profile.countryCode}`,
      bucket: 'geopoliticalRisk',
      points: 20,
      detail: `${profile.countryCode} is on the OFAC/EU/UN elevated-risk list`,
    })
  }

  // NEW_VENDOR — profile created within 90 days. New vendors carry more
  // operational risk because they don't have a transaction history with
  // the buyer yet.
  if (now - profile.createdAt.getTime() < NINETY_DAYS_MS) {
    const days = Math.floor((now - profile.createdAt.getTime()) / 86_400_000)
    hits.push({
      key:    'NEW_VENDOR',
      label:  'Recently onboarded vendor',
      bucket: 'operationalRisk',
      points: 10,
      detail: `Vendor onboarded ${days} days ago — no prior transaction history`,
    })
  }

  // UNVERIFIED_BANK — at least one bank account still PENDING penny-drop /
  // KYC verification. Doesn't matter how many; the existence is the flag.
  if (profile.bankAccounts.some((b) => b.verificationStatus === 'PENDING')) {
    hits.push({
      key:    'UNVERIFIED_BANK',
      label:  'Unverified bank account',
      bucket: 'financialRisk',
      points: 10,
      detail: 'At least one bank account is still PENDING penny-drop verification',
    })
  }

  return hits
}

// ── Main entry point ──────────────────────────────────────────────────────

/**
 * Compute and persist the risk score for a vendor. Side-effects:
 *   - Inserts a row in VendorRiskHistory (immutable audit).
 *   - Updates VendorProfile.{riskScore, riskTier, lastRiskScoredAt}.
 * Throws if the vendor isn't found (callers should guard on the route
 * boundary so the 404 carries a clean payload).
 */
export async function calculateRiskScore(
  prisma:    PrismaClient,
  vendorId:  string,
  trigger:   RiskTrigger,
): Promise<CalculateRiskScoreResult> {
  const profile = await prisma.vendorProfile.findUnique({
    where: { id: vendorId },
    include: {
      bankAccounts:      { select: { verificationStatus: true } },
      complianceRecords: { select: { expiresAt: true, documentType: true } },
      screenings:        { select: { status: true, listName: true, screeningProvider: true } },
    },
  })
  if (!profile) throw new Error(`VendorProfile not found: ${vendorId}`)

  // Look up the matrix rule using the same dimensions Sprint 1 used when
  // selecting the rule at invitation time. We keep the lookup local rather
  // than reusing risk-matrix.service's findBestMatchingRule because the
  // profile already has the dimensions on-hand — saves a round trip.
  const matchingRules = await prisma.vendorRiskMatrixRule.findMany({
    where: {
      tenantId: profile.tenantId,
      status:   'ACTIVE',
      AND: [
        { OR: [{ vendorType:       null }, { vendorType:       profile.vendorType       }] },
        { OR: [{ countryCode:      null }, { countryCode:      profile.countryCode      }] },
        { OR: [{ industryCategory: null }, { industryCategory: profile.industryCategory ?? undefined }] },
      ],
    },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    take:    20,
  })
  const matchedRule = matchingRules[0] ?? null

  // Sum factor hits into raw bucket totals.
  const factors = collectFactors(profile as ProfileForRisk)
  const buckets: RiskBuckets = {
    financialRisk:    0,
    geopoliticalRisk: 0,
    complianceRisk:   0,
    operationalRisk:  0,
  }
  for (const f of factors) buckets[f.bucket] += f.points
  // Cap each bucket at 100 — a vendor with 4 sanctions hits shouldn't
  // overflow a bucket past the universe.
  for (const k of Object.keys(buckets) as (keyof RiskBuckets)[]) {
    if (buckets[k] > 100) buckets[k] = 100
  }

  // Apply weights.
  const weights = normaliseWeights(matchedRule?.riskWeights)
  const weighted: RiskBuckets = {
    financialRisk:    (buckets.financialRisk    * weights.financialRisk)    / 100,
    geopoliticalRisk: (buckets.geopoliticalRisk * weights.geopoliticalRisk) / 100,
    complianceRisk:   (buckets.complianceRisk   * weights.complianceRisk)   / 100,
    operationalRisk:  (buckets.operationalRisk  * weights.operationalRisk)  / 100,
  }

  const totalRaw = Math.round(
    weighted.financialRisk + weighted.geopoliticalRisk + weighted.complianceRisk + weighted.operationalRisk
  )
  const total = Math.min(100, Math.max(0, totalRaw))
  const tier  = tierFor(total)

  const breakdown: RiskBreakdown = {
    buckets, weights, weighted, factors, total, tier,
  }

  // Persist: history row + profile snapshot. Single transaction so a
  // history row never exists without a matching profile update.
  await prisma.$transaction(async (tx) => {
    await tx.vendorRiskHistory.create({
      data: {
        vendorId:       vendorId,
        riskScore:      total,
        riskTier:       tier,
        scoreBreakdown: JSON.stringify(breakdown) satisfies Prisma.VendorRiskHistoryCreateInput['scoreBreakdown'],
        triggeredBy:    trigger,
      },
    })
    await tx.vendorProfile.update({
      where: { id: vendorId },
      data:  { riskScore: total, riskTier: tier, lastRiskScoredAt: new Date() },
    })
  })

  return { riskScore: total, riskTier: tier, breakdown }
}
