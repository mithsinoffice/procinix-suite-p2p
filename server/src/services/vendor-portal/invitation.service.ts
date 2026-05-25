// Vendor onboarding invitation service.
//
// Composes the buyer-side "invite a vendor" flow: pick the best risk-matrix
// rule, generate the canonical request code, mint a portal token, and persist
// the OnboardingRequest + Invitation row in a single transaction.

import { randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import {
  computeSpendTier,
  findBestMatchingRule,
  type RuleDimensions,
} from './risk-matrix.service.js'

// 72-hour validity matches the SLA most buyers expect from a typical
// "click-to-onboard" email link; long enough that a vendor can collect
// documents over a weekend, short enough that stale tokens get reissued
// rather than living forever.
const TOKEN_TTL_HOURS = 72

export interface CreateInvitationInput {
  vendorLegalName?:   string
  vendorEmail:        string
  vendorCountryCode?: string
  vendorType?:        string
  industryCategory?:  string
  estimatedSpend?:    number
}

export interface CreateInvitationOutput {
  invitationId:   string
  requestId:      string
  requestCode:    string
  portalToken:    string
  tokenExpiresAt: Date
  vendorEmail:    string
}

/**
 * Generate the next `VR-YYYY-NNNN` request code for a tenant. Scoped per-
 * tenant + per-year so each tenant gets its own clean sequence and the year
 * rolls over cleanly. Race-prone in principle (two parallel inserts could
 * collide on the next number); guarded by the unique constraint on
 * `requestCode` which will raise — caller should retry once on P2002.
 */
export async function nextRequestCode(
  prisma:   PrismaClient,
  tenantId: string,
  now:      Date = new Date(),
): Promise<string> {
  const year   = now.getUTCFullYear()
  const prefix = `VR-${year}-`
  const last = await prisma.vendorOnboardingRequest.findFirst({
    where:   { tenantId, requestCode: { startsWith: prefix } },
    orderBy: { requestCode: 'desc' },
    select:  { requestCode: true },
  })
  const next = last ? Number(last.requestCode.slice(prefix.length)) + 1 : 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

/**
 * Create a new onboarding request + invitation row. Run in a transaction so
 * a half-written record can't leak. The returned `portalToken` is the bearer
 * token the vendor receives in their invite email — do not log it.
 */
export async function createInvitation(
  prisma:        PrismaClient,
  tenantId:      string,
  userId:        string,
  input:         CreateInvitationInput,
): Promise<CreateInvitationOutput> {
  const spendTier = computeSpendTier(input.estimatedSpend)

  const dimensions: RuleDimensions = {
    vendorType:       input.vendorType,
    spendTier,
    countryCode:      input.vendorCountryCode,
    industryCategory: input.industryCategory,
  }

  const matchedRule = await findBestMatchingRule(prisma, tenantId, dimensions)

  const requestCode    = await nextRequestCode(prisma, tenantId)
  const portalToken    = randomUUID()
  const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000)

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.vendorOnboardingRequest.create({
      data: {
        tenantId,
        requestCode,
        initiationType:     'INVITE',
        status:             'INVITED',
        vendorLegalName:    input.vendorLegalName,
        vendorEmail:        input.vendorEmail,
        vendorCountryCode:  input.vendorCountryCode,
        vendorType:         input.vendorType,
        industryCategory:   input.industryCategory,
        estimatedSpend:     input.estimatedSpend ?? null,
        spendTier,
        portalToken,
        tokenExpiresAt,
        riskMatrixRuleId:   matchedRule?.id ?? null,
        appliedRiskWeights: matchedRule
          ? (matchedRule.riskWeights as Prisma.InputJsonValue)
          : undefined,
        invitedByUserId: userId,
        invitedAt:       new Date(),
      },
    })

    const invitation = await tx.vendorOnboardingInvitation.create({
      data: {
        requestId:    request.id,
        sentToEmail:  input.vendorEmail,
        sentByUserId: userId,
        expiresAt:    tokenExpiresAt,
        status:       'PENDING',
      },
    })

    return { request, invitation }
  })

  return {
    invitationId:   result.invitation.id,
    requestId:      result.request.id,
    requestCode:    result.request.requestCode,
    portalToken,
    tokenExpiresAt,
    vendorEmail:    input.vendorEmail,
  }
}

