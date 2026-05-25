// Vendor self-service onboarding service.
//
// Token validation + the full "submit your profile" transaction. Runs on
// behalf of the vendor (no auth) so every payload field is treated as
// untrusted input; the route handler is expected to have Zod-validated the
// body before passing it in.

import type { Prisma, PrismaClient } from '@prisma/client'
import { DEFAULT_APPROVAL_STEPS, type WorkflowStepInput } from './risk-matrix.service.js'

export type TokenError = 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'TOKEN_USED'

export interface TokenLookupOk {
  ok:      true
  request: Awaited<ReturnType<PrismaClient['vendorOnboardingRequest']['findUnique']>>
}
export interface TokenLookupErr {
  ok:    false
  error: TokenError
}

/**
 * Resolve a portal token to its onboarding request, or one of three error
 * codes that the route handler maps to a 401 response. The shape is a
 * discriminated union to keep the call site explicit.
 */
export async function resolveOnboardingToken(
  prisma: PrismaClient,
  token:  string,
): Promise<TokenLookupOk | TokenLookupErr> {
  const request = await prisma.vendorOnboardingRequest.findUnique({
    where: { portalToken: token },
  })
  if (!request) return { ok: false, error: 'INVALID_TOKEN' }
  if (request.tokenUsedAt) return { ok: false, error: 'TOKEN_USED' }
  if (request.tokenExpiresAt && request.tokenExpiresAt.getTime() < Date.now()) {
    return { ok: false, error: 'TOKEN_EXPIRED' }
  }
  return { ok: true, request }
}

// ── Submit payload ────────────────────────────────────────────────────────

export interface SubmitProfileInput {
  legalName:          string
  tradeName?:         string
  registrationNumber?: string
  incorporationDate?: string | null
  countryCode:        string
  vendorType:         string
  industryCategory?:  string
  website?:           string
  currency?:          string
  annualRevenue?:     number
  employeeCount?:     number
  dunsNumber?:        string
}

export interface SubmitContactInput {
  contactType: string
  firstName:   string
  lastName:    string
  email:       string
  phone?:      string
  designation?: string
  isPrimary?:  boolean
}

export interface SubmitAddressInput {
  addressType:  string
  line1:        string
  line2?:       string
  city:         string
  state?:       string
  postalCode?:  string
  countryCode:  string
  isRegistered?: boolean
}

export interface SubmitBankAccountInput {
  countryCode:    string
  accountName:    string
  accountNumber:  string
  bankName:       string
  bankCode?:      string
  ifscSwiftIban?: string
  currency:       string
  isPrimary?:     boolean
}

export interface SubmitComplianceInput {
  countryCode:   string
  documentType:  string
  documentNumber?: string
  expiresAt?:    string | null
}

export interface SubmitOnboardingInput {
  profile:           SubmitProfileInput
  contacts:          SubmitContactInput[]
  addresses:         SubmitAddressInput[]
  bankAccounts:      SubmitBankAccountInput[]
  complianceRecords: SubmitComplianceInput[]
}

export interface SubmitOnboardingOutput {
  requestCode:     string
  vendorProfileId: string
  workflowId:      string
  message:         string
}

/**
 * Materialise the vendor's submission into the full set of profile rows +
 * an approval workflow. The whole thing runs in a single transaction; if
 * anything fails (constraint violation, optimistic-lock collision on the
 * token, etc.) nothing is persisted and the route returns 500.
 *
 * Workflow construction:
 * - If the original onboarding request was linked to a risk-matrix rule
 *   that points at a VendorWorkflowTemplate, instantiate the steps from
 *   that template.
 * - Otherwise fall back to DEFAULT_APPROVAL_STEPS (2-level).
 */
export async function submitOnboarding(
  prisma:   PrismaClient,
  request:  NonNullable<TokenLookupOk['request']>,
  input:    SubmitOnboardingInput,
): Promise<SubmitOnboardingOutput> {
  // Resolve the workflow template (if any) outside the transaction so we
  // don't hold the connection open while reading config.
  const stepsToCreate = await resolveWorkflowSteps(prisma, request.riskMatrixRuleId)

  return prisma.$transaction(async (tx) => {
    const profile = await tx.vendorProfile.create({
      data: {
        requestId:          request.id,
        tenantId:           request.tenantId,
        legalName:          input.profile.legalName,
        tradeName:          input.profile.tradeName,
        registrationNumber: input.profile.registrationNumber,
        incorporationDate:  input.profile.incorporationDate ? new Date(input.profile.incorporationDate) : null,
        countryCode:        input.profile.countryCode,
        vendorType:         input.profile.vendorType,
        industryCategory:   input.profile.industryCategory,
        website:            input.profile.website,
        currency:           input.profile.currency ?? 'USD',
        annualRevenue:      input.profile.annualRevenue ?? null,
        employeeCount:      input.profile.employeeCount,
        dunsNumber:         input.profile.dunsNumber,
        status:             'UNDER_REVIEW',
        isErpSynced:        false,
      },
    })

    if (input.contacts.length > 0) {
      await tx.vendorContact.createMany({
        data: input.contacts.map((c) => ({
          vendorId:    profile.id,
          contactType: c.contactType,
          firstName:   c.firstName,
          lastName:    c.lastName,
          email:       c.email,
          phone:       c.phone,
          designation: c.designation,
          isPrimary:   c.isPrimary ?? false,
          isActive:    true,
        })),
      })
    }

    if (input.addresses.length > 0) {
      await tx.vendorAddress.createMany({
        data: input.addresses.map((a) => ({
          vendorId:     profile.id,
          addressType:  a.addressType,
          line1:        a.line1,
          line2:        a.line2,
          city:         a.city,
          state:        a.state,
          postalCode:   a.postalCode,
          countryCode:  a.countryCode,
          isRegistered: a.isRegistered ?? false,
        })),
      })
    }

    if (input.bankAccounts.length > 0) {
      await tx.vendorProfileBankAccount.createMany({
        data: input.bankAccounts.map((b) => ({
          vendorId:           profile.id,
          countryCode:        b.countryCode,
          accountName:        b.accountName,
          accountNumber:      b.accountNumber,
          bankName:           b.bankName,
          bankCode:           b.bankCode,
          ifscSwiftIban:      b.ifscSwiftIban,
          currency:           b.currency,
          isPrimary:          b.isPrimary ?? false,
          verificationStatus: 'PENDING',
        })),
      })
    }

    if (input.complianceRecords.length > 0) {
      await tx.vendorComplianceRecord.createMany({
        data: input.complianceRecords.map((c) => ({
          vendorId:           profile.id,
          countryCode:        c.countryCode,
          documentType:       c.documentType,
          documentNumber:     c.documentNumber,
          expiresAt:          c.expiresAt ? new Date(c.expiresAt) : null,
          verificationStatus: 'PENDING',
        })),
      })
    }

    // Workflow + steps. We pre-compute SLA deadlines for each step and the
    // overall workflow so the desk's "X hours remaining" countdown can read
    // directly without recalculating from the template.
    const now = new Date()
    const totalLevels   = stepsToCreate.length
    const totalSlaHours = stepsToCreate.reduce((s, st) => s + (st.slaHours ?? 24), 0)
    const slaDeadlineAt = new Date(now.getTime() + totalSlaHours * 60 * 60 * 1000)

    const workflow = await tx.vendorApprovalWorkflow.create({
      data: {
        requestId:          request.id,
        tenantId:           request.tenantId,
        workflowTemplateId: null,
        status:             'IN_PROGRESS',
        currentLevel:       1,
        totalLevels,
        startedAt:          now,
        slaDeadlineAt,
      },
    })

    let cumulativeHours = 0
    const stepRows = stepsToCreate.map((st) => {
      cumulativeHours += st.slaHours ?? 24
      return {
        workflowId:   workflow.id,
        level:        st.level,
        stepName:     st.stepName,
        approverRole: st.approverRole,
        status:       'PENDING',
        dueAt:        new Date(now.getTime() + cumulativeHours * 60 * 60 * 1000),
      } satisfies Prisma.VendorApprovalStepCreateManyInput
    })
    await tx.vendorApprovalStep.createMany({ data: stepRows })

    // Burn the token + flip the request to IN_PROGRESS so subsequent
    // GET /portal/onboarding/:token attempts return TOKEN_USED rather than
    // silently re-opening the form.
    await tx.vendorOnboardingRequest.update({
      where: { id: request.id },
      data:  {
        tokenUsedAt: now,
        status:      'IN_PROGRESS',
        submittedAt: now,
      },
    })
    await tx.vendorOnboardingInvitation.updateMany({
      where: { requestId: request.id, status: 'PENDING' },
      data:  { status: 'ACCEPTED' },
    })

    return {
      requestCode:     request.requestCode,
      vendorProfileId: profile.id,
      workflowId:      workflow.id,
      message:         'Submission received',
    } satisfies SubmitOnboardingOutput
  })
}

/**
 * Resolve the approval-step list for a request. If the matched matrix rule
 * has a workflow template, instantiate it; otherwise return the 2-level
 * default. Templates store steps as a Json array shaped like
 * { level, role, approverType, slaHours, … } — we normalise to our
 * canonical {level, stepName, approverRole, slaHours} shape here.
 */
async function resolveWorkflowSteps(
  prisma:        PrismaClient,
  matrixRuleId:  string | null,
): Promise<WorkflowStepInput[]> {
  if (!matrixRuleId) return [...DEFAULT_APPROVAL_STEPS]
  const rule = await prisma.vendorRiskMatrixRule.findUnique({
    where:   { id: matrixRuleId },
    select:  { workflowTemplate: { select: { steps: true } } },
  })
  const templateSteps = rule?.workflowTemplate?.steps as unknown
  if (!Array.isArray(templateSteps) || templateSteps.length === 0) return [...DEFAULT_APPROVAL_STEPS]

  return templateSteps.map((s: any, idx: number) => ({
    level:        Number(s.level ?? idx + 1),
    stepName:     String(s.stepName ?? s.label ?? `Approval ${idx + 1}`),
    approverRole: String(s.role ?? s.approverRole ?? 'APPROVER'),
    slaHours:     Number.isFinite(s.slaHours) ? Number(s.slaHours) : 24,
  }))
}
