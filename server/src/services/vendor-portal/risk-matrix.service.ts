// Risk-matrix rule selection for the vendor-portal module.
//
// Given a buyer-supplied set of vendor dimensions (vendorType + spendTier +
// countryCode + industryCategory), find the single VendorRiskMatrixRule
// that should govern this onboarding. Rules with a null dimension match any
// value of that dimension; the most-specific match wins. Ties broken by
// the rule's `priority` field (higher first), then `updatedAt` desc as a
// final tiebreaker so the most recently edited rule wins.

import type { PrismaClient } from '@prisma/client'

export type SpendTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'STRATEGIC'

/**
 * Spend-tier thresholds are interpreted in the tenant's reporting currency.
 * The model doesn't currently carry a currency on VendorOnboardingRequest, so
 * we treat estimatedSpend as a normalised number — buyers using non-USD entry
 * forms are expected to convert before calling.
 */
export function computeSpendTier(estimatedSpend: number | null | undefined): SpendTier | null {
  if (estimatedSpend == null || Number.isNaN(estimatedSpend)) return null
  if (estimatedSpend <         10_000) return 'LOW'
  if (estimatedSpend <        100_000) return 'MEDIUM'
  if (estimatedSpend <      1_000_000) return 'HIGH'
  return 'STRATEGIC'
}

export interface RuleDimensions {
  vendorType?:       string | null
  spendTier?:        SpendTier | null
  countryCode?:      string | null
  industryCategory?: string | null
}

/**
 * Score how specific a rule is for the request — one point per dimension the
 * rule explicitly matches (non-null and equal). Null dimensions are wildcards
 * and contribute zero to specificity (they still allow the rule to apply,
 * but a more-specific rule wins).
 */
function specificity(
  rule: { vendorType: string | null; spendTier: string | null; countryCode: string | null; industryCategory: string | null },
  req:  RuleDimensions,
): number {
  let n = 0
  if (rule.vendorType       && rule.vendorType       === req.vendorType)       n++
  if (rule.spendTier        && rule.spendTier        === req.spendTier)        n++
  if (rule.countryCode      && rule.countryCode      === req.countryCode)      n++
  if (rule.industryCategory && rule.industryCategory === req.industryCategory) n++
  return n
}

/**
 * Returns the best-matching rule for the dimensions, or null if no ACTIVE
 * rule applies. Pulls only the columns we need so the selection stays cheap
 * even with hundreds of rules per tenant.
 */
export async function findBestMatchingRule(
  prisma:   PrismaClient,
  tenantId: string,
  req:      RuleDimensions,
) {
  // Pull every ACTIVE rule for the tenant whose declared dimensions are
  // compatible with the request — i.e. each rule dimension is either null
  // (wildcard) OR equal to the request's value for that dimension.
  const candidates = await prisma.vendorRiskMatrixRule.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      AND: [
        { OR: [{ vendorType:       null }, { vendorType:       req.vendorType       ?? undefined }] },
        { OR: [{ spendTier:        null }, { spendTier:        req.spendTier        ?? undefined }] },
        { OR: [{ countryCode:      null }, { countryCode:      req.countryCode      ?? undefined }] },
        { OR: [{ industryCategory: null }, { industryCategory: req.industryCategory ?? undefined }] },
      ],
    },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
  })

  if (candidates.length === 0) return null

  // Stable sort: specificity desc, then priority desc (already pre-sorted),
  // then updatedAt desc (pre-sorted). Picking the head gives us the winner.
  candidates.sort((a, b) => specificity(b, req) - specificity(a, req))
  return candidates[0]
}

/**
 * Default 2-level approval template used when the matched rule has no
 * workflowTemplate attached (or when no rule matches at all). Keeps the
 * onboarding flow functional out of the box — buyers tune their own
 * templates later via the Workflow Designer.
 */
export const DEFAULT_APPROVAL_STEPS = [
  { level: 1, stepName: 'Compliance Review', approverRole: 'COMPLIANCE_OFFICER', slaHours: 24 },
  { level: 2, stepName: 'Finance Approval',  approverRole: 'FINANCE_MANAGER',    slaHours: 48 },
] as const

export type WorkflowStepInput = {
  level:        number
  stepName:     string
  approverRole: string
  slaHours?:    number
}
