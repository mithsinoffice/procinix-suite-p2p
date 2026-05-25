// Vendor governance seed (Sprint 5).
//
// Idempotent — uses upsert on every row so re-running `npm run db:seed`
// doesn't multiply data. Called from prisma/seed.ts after the demo tenant
// is created.
//
// Seeds three sets:
//   1. VendorCountryConfig  — 8 countries with per-jurisdiction document
//                             requirements, tax ID format, bank fields,
//                             and the sanctions lists to screen against.
//   2. VendorRiskMatrixRule — 5 default scoring rules covering the four
//                             spend tiers plus a high-risk-country override.
//   3. VendorRiskFactor     — 5 factors that risk-engine evaluates.

import type { PrismaClient } from '@prisma/client'

// ── Country configs ─────────────────────────────────────────────────────

interface CountrySeed {
  countryCode:          string
  countryName:          string
  taxIdLabel:           string
  taxIdFormat:          string | null
  requiredDocuments:    Array<{ documentType: string; label: string; mandatory: boolean; autoVerify: boolean }>
  bankFieldsRequired:   string[]
  sanctionListsToCheck: string[]
}

const COUNTRIES: CountrySeed[] = [
  {
    countryCode: 'IN',
    countryName: 'India',
    taxIdLabel:  'GST Number',
    // 15-char GSTIN: 2-digit state + 10-char PAN + entity + Z + check
    taxIdFormat: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
    requiredDocuments: [
      { documentType: 'GST_CERTIFICATE',   label: 'GST Registration Certificate',     mandatory: true,  autoVerify: true  },
      { documentType: 'PAN_CARD',          label: 'PAN Card',                         mandatory: true,  autoVerify: true  },
      { documentType: 'MSME_CERTIFICATE',  label: 'MSME/Udyam Certificate',           mandatory: false, autoVerify: false },
      { documentType: 'TDS_CERTIFICATE',   label: 'TDS Certificate (Form 16A)',       mandatory: false, autoVerify: false },
      { documentType: 'CANCELLED_CHEQUE',  label: 'Cancelled Cheque / Bank Letter',   mandatory: true,  autoVerify: false },
      { documentType: 'INCORPORATION_CERT',label: 'Certificate of Incorporation',     mandatory: true,  autoVerify: false },
    ],
    bankFieldsRequired:   ['accountName', 'accountNumber', 'bankName', 'ifscCode'],
    sanctionListsToCheck: ['UN', 'EU', 'OFAC'],
  },
  {
    countryCode: 'US',
    countryName: 'United States',
    taxIdLabel:  'EIN (Employer Identification Number)',
    taxIdFormat: '^[0-9]{2}-[0-9]{7}$',
    requiredDocuments: [
      { documentType: 'W9_FORM',           label: 'W-9 Form',                                  mandatory: true,  autoVerify: false },
      { documentType: 'EIN_LETTER',        label: 'IRS EIN Confirmation Letter',               mandatory: true,  autoVerify: false },
      { documentType: 'INCORPORATION_CERT',label: 'Certificate of Incorporation / Articles',   mandatory: true,  autoVerify: false },
      { documentType: 'VOIDED_CHECK',      label: 'Voided Check / Bank Letter',                mandatory: true,  autoVerify: false },
      { documentType: 'SOC2_REPORT',       label: 'SOC 2 Report (if IT vendor)',               mandatory: false, autoVerify: false },
    ],
    bankFieldsRequired:   ['accountName', 'accountNumber', 'routingNumber', 'bankName'],
    sanctionListsToCheck: ['OFAC', 'UN', 'EU', 'BIS_DENIED'],
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    taxIdLabel:  'VAT Registration Number',
    taxIdFormat: null,
    requiredDocuments: [
      { documentType: 'VAT_CERTIFICATE',   label: 'VAT Registration Certificate',     mandatory: true, autoVerify: true  },
      { documentType: 'COMPANIES_HOUSE',   label: 'Companies House Registration',     mandatory: true, autoVerify: true  },
      { documentType: 'BANK_LETTER',       label: 'Bank Confirmation Letter',         mandatory: true, autoVerify: false },
      { documentType: 'INCORPORATION_CERT',label: 'Certificate of Incorporation',     mandatory: true, autoVerify: false },
    ],
    bankFieldsRequired:   ['accountName', 'accountNumber', 'sortCode', 'bankName'],
    sanctionListsToCheck: ['UN', 'EU', 'OFAC', 'UKHO'],
  },
  {
    countryCode: 'DE',
    countryName: 'Germany',
    taxIdLabel:  'USt-IdNr (VAT ID)',
    taxIdFormat: null,
    requiredDocuments: [
      { documentType: 'VAT_CERTIFICATE',   label: 'USt-IdNr Certificate',             mandatory: true, autoVerify: true  },
      { documentType: 'HANDELSREGISTER',   label: 'Handelsregister Extract',          mandatory: true, autoVerify: false },
      { documentType: 'BANK_LETTER',       label: 'Bankverbindungsnachweis',          mandatory: true, autoVerify: false },
    ],
    bankFieldsRequired:   ['accountName', 'iban', 'bic', 'bankName'],
    sanctionListsToCheck: ['UN', 'EU', 'OFAC'],
  },
  {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    taxIdLabel:  'TRN (Tax Registration Number)',
    taxIdFormat: null,
    requiredDocuments: [
      { documentType: 'TRN_CERTIFICATE',   label: 'VAT/TRN Certificate',                       mandatory: true, autoVerify: false },
      { documentType: 'TRADE_LICENSE',     label: 'Trade License (CR)',                         mandatory: true, autoVerify: false },
      { documentType: 'MOA',               label: 'Memorandum of Association',                  mandatory: true, autoVerify: false },
      { documentType: 'BANK_LETTER',       label: 'Bank Account Confirmation Letter',           mandatory: true, autoVerify: false },
      { documentType: 'EMIRATES_ID',       label: 'Emirates ID of Authorized Signatory',        mandatory: true, autoVerify: false },
    ],
    bankFieldsRequired:   ['accountName', 'iban', 'swiftCode', 'bankName'],
    sanctionListsToCheck: ['UN', 'EU', 'OFAC'],
  },
  {
    countryCode: 'SG',
    countryName: 'Singapore',
    taxIdLabel:  'UEN (Unique Entity Number)',
    taxIdFormat: null,
    requiredDocuments: [
      { documentType: 'UEN_BIZFILE',       label: 'ACRA BizFile+ Profile',                      mandatory: true, autoVerify: true  },
      { documentType: 'BANK_LETTER',       label: 'Bank Account Confirmation',                   mandatory: true, autoVerify: false },
      { documentType: 'GST_CERTIFICATE',   label: 'GST Registration (if applicable)',            mandatory: false, autoVerify: false },
    ],
    bankFieldsRequired:   ['accountName', 'accountNumber', 'bankCode', 'branchCode', 'bankName'],
    sanctionListsToCheck: ['UN', 'EU', 'OFAC', 'MAS'],
  },
  {
    countryCode: 'BR',
    countryName: 'Brazil',
    taxIdLabel:  'CNPJ',
    taxIdFormat: null,
    requiredDocuments: [
      { documentType: 'CNPJ_CARD',         label: 'Cartão CNPJ',                                 mandatory: true, autoVerify: false },
      { documentType: 'CONTRATO_SOCIAL',   label: 'Contrato Social / Estatuto',                  mandatory: true, autoVerify: false },
      { documentType: 'BANK_LETTER',       label: 'Comprovante Bancário',                         mandatory: true, autoVerify: false },
      { documentType: 'CERTIDAO_NEGATIVA', label: 'Certidão Negativa de Débitos',                mandatory: false,autoVerify: false },
    ],
    bankFieldsRequired:   ['accountName', 'accountNumber', 'agencia', 'bankCode', 'pixKey'],
    sanctionListsToCheck: ['UN', 'EU', 'OFAC'],
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    taxIdLabel:  'ABN (Australian Business Number)',
    taxIdFormat: null,
    requiredDocuments: [
      { documentType: 'ABN_CERTIFICATE',   label: 'ABN Registration',                            mandatory: true, autoVerify: true  },
      { documentType: 'ASIC_EXTRACT',      label: 'ASIC Company Extract',                        mandatory: true, autoVerify: false },
      { documentType: 'BANK_LETTER',       label: 'Bank Account Confirmation',                   mandatory: true, autoVerify: false },
      { documentType: 'GST_REGISTRATION',  label: 'GST Registration (if applicable)',            mandatory: false, autoVerify: false },
    ],
    bankFieldsRequired:   ['accountName', 'bsb', 'accountNumber', 'bankName'],
    sanctionListsToCheck: ['UN', 'EU', 'OFAC', 'AUSTRAC'],
  },
]

// ── Risk matrix rules ───────────────────────────────────────────────────

interface MatrixRuleSeed {
  name:                  string
  description:           string
  vendorType:            string | null
  spendTier:             string | null
  countryCode:           string | null
  industryCategory:      string | null
  priority:              number
  riskWeights:           Record<string, number>
  riskTierThresholds:    Record<string, number>
  screeningFrequencyDays: number
  screeningLists:        string[]
  onboardingSlaHours:    number
  autoApproveThreshold:  number | null
}

const MATRIX_RULES: MatrixRuleSeed[] = [
  {
    name:                  'Default — Low spend any country',
    description:           '2-level approval, light screening. Auto-approves vendors scoring < 30.',
    vendorType:            null,
    spendTier:             'LOW',
    countryCode:           null,
    industryCategory:      null,
    priority:              10,
    riskWeights:           { financialRisk: 20, geopoliticalRisk: 20, complianceRisk: 40, operationalRisk: 20 },
    riskTierThresholds:    { low: 39, medium: 59, high: 79, critical: 100 },
    screeningFrequencyDays: 365,
    screeningLists:        ['UN', 'EU', 'OFAC'],
    onboardingSlaHours:    48,
    autoApproveThreshold:  30,
  },
  {
    name:                  'Medium spend — standard compliance',
    description:           'Balanced weights; semi-annual rescreening; no auto-approval.',
    vendorType:            null,
    spendTier:             'MEDIUM',
    countryCode:           null,
    industryCategory:      null,
    priority:              20,
    riskWeights:           { financialRisk: 25, geopoliticalRisk: 25, complianceRisk: 30, operationalRisk: 20 },
    riskTierThresholds:    { low: 39, medium: 59, high: 79, critical: 100 },
    screeningFrequencyDays: 180,
    screeningLists:        ['UN', 'EU', 'OFAC'],
    onboardingSlaHours:    72,
    autoApproveThreshold:  null,
  },
  {
    name:                  'High spend — enhanced due diligence',
    description:           'EDD weighting bias to financial + compliance. Quarterly rescreening.',
    vendorType:            null,
    spendTier:             'HIGH',
    countryCode:           null,
    industryCategory:      null,
    priority:              30,
    riskWeights:           { financialRisk: 30, geopoliticalRisk: 25, complianceRisk: 30, operationalRisk: 15 },
    riskTierThresholds:    { low: 39, medium: 59, high: 79, critical: 100 },
    screeningFrequencyDays: 90,
    screeningLists:        ['UN', 'EU', 'OFAC', 'BIS_DENIED'],
    onboardingSlaHours:    96,
    autoApproveThreshold:  null,
  },
  {
    name:                  'Strategic vendor — full governance',
    description:           'Monthly screening, longest SLA, leadership sign-off path.',
    vendorType:            null,
    spendTier:             'STRATEGIC',
    countryCode:           null,
    industryCategory:      null,
    priority:              40,
    riskWeights:           { financialRisk: 35, geopoliticalRisk: 25, complianceRisk: 25, operationalRisk: 15 },
    riskTierThresholds:    { low: 39, medium: 59, high: 79, critical: 100 },
    screeningFrequencyDays: 30,
    screeningLists:        ['UN', 'EU', 'OFAC', 'BIS_DENIED', 'WORLD_CHECK'],
    onboardingSlaHours:    120,
    autoApproveThreshold:  null,
  },
  {
    // Sentinel rule — applies when the vendor's countryCode is in the
    // hardcoded high-risk list. The risk-matcher resolves this sentinel
    // by adding an OR branch when req.countryCode matches the list
    // (see risk-matrix.service.ts → HIGH_RISK_COUNTRIES).
    name:                  'High-risk country — critical screening',
    description:           'Overrides all spend-tier rules when vendor is registered in a sanctioned-risk country. Geopolitical-weighted scoring; 30-day rescreen.',
    vendorType:            null,
    spendTier:             null,
    countryCode:           'HIGH_RISK_COUNTRY_LIST',
    industryCategory:      null,
    priority:              50,
    riskWeights:           { financialRisk: 20, geopoliticalRisk: 50, complianceRisk: 20, operationalRisk: 10 },
    riskTierThresholds:    { low: 39, medium: 59, high: 79, critical: 100 },
    screeningFrequencyDays: 30,
    screeningLists:        ['UN', 'EU', 'OFAC', 'BIS_DENIED'],
    onboardingSlaHours:    168,
    autoApproveThreshold:  null,
  },
]

// ── Risk factors ────────────────────────────────────────────────────────

interface FactorSeed {
  factorKey:    string
  factorLabel:  string
  factorGroup:  string
  scoringLogic: Record<string, unknown>
}

const FACTORS: FactorSeed[] = [
  {
    factorKey:    'SANCTIONS_HIT',
    factorLabel:  'Sanctions list match',
    factorGroup:  'GEOPOLITICAL',
    scoringLogic: { type: 'BOOLEAN', ifTrue: 40 },
  },
  {
    factorKey:    'DOC_EXPIRY',
    factorLabel:  'Compliance document expiring within 30 days',
    factorGroup:  'COMPLIANCE',
    scoringLogic: { type: 'BOOLEAN', ifTrue: 15 },
  },
  {
    factorKey:    'COUNTRY_RISK',
    factorLabel:  'Vendor in high-risk country',
    factorGroup:  'GEOPOLITICAL',
    scoringLogic: {
      type:               'LOOKUP',
      highRiskCountries:  ['RU', 'BY', 'IR', 'KP', 'MM', 'CU', 'VE', 'SY'],
      ifMatch:            20,
    },
  },
  {
    factorKey:    'NEW_VENDOR',
    factorLabel:  'Vendor onboarded less than 90 days ago',
    factorGroup:  'OPERATIONAL',
    scoringLogic: { type: 'BOOLEAN', ifTrue: 10 },
  },
  {
    factorKey:    'UNVERIFIED_BANK',
    factorLabel:  'Primary bank account unverified',
    factorGroup:  'FINANCIAL',
    scoringLogic: { type: 'BOOLEAN', ifTrue: 10 },
  },
]

// ── Entry point ──────────────────────────────────────────────────────────

export async function runVendorGovernanceSeed(prisma: PrismaClient, tenantId: string) {
  console.log('Seeding vendor governance config…')

  // 1. Country configs — keyed by (tenantId, countryCode).
  for (const c of COUNTRIES) {
    await prisma.vendorCountryConfig.upsert({
      where: { tenantId_countryCode: { tenantId, countryCode: c.countryCode } },
      update: {
        countryName:          c.countryName,
        requiredDocuments:    c.requiredDocuments,
        taxIdLabel:           c.taxIdLabel,
        taxIdFormat:          c.taxIdFormat,
        bankFieldsRequired:   c.bankFieldsRequired,
        sanctionListsToCheck: c.sanctionListsToCheck,
        status:               'ACTIVE',
      },
      create: {
        tenantId,
        countryCode:          c.countryCode,
        countryName:          c.countryName,
        requiredDocuments:    c.requiredDocuments,
        taxIdLabel:           c.taxIdLabel,
        taxIdFormat:          c.taxIdFormat,
        bankFieldsRequired:   c.bankFieldsRequired,
        sanctionListsToCheck: c.sanctionListsToCheck,
      },
    })
  }
  console.log(`✓ ${COUNTRIES.length} country configs upserted`)

  // 2. Matrix rules. No natural unique key on (tenantId, name) in the
  //    schema, so use a delete-then-recreate pattern within a tx that's
  //    still idempotent at the level the seed cares about (the result is
  //    deterministic regardless of how many times you run it).
  await prisma.$transaction(async (tx) => {
    await tx.vendorRiskMatrixRule.deleteMany({
      where: { tenantId, name: { in: MATRIX_RULES.map((r) => r.name) } },
    })
    for (const r of MATRIX_RULES) {
      await tx.vendorRiskMatrixRule.create({
        data: {
          tenantId,
          name:                   r.name,
          description:            r.description,
          status:                 'ACTIVE',
          vendorType:             r.vendorType,
          spendTier:              r.spendTier,
          countryCode:            r.countryCode,
          industryCategory:       r.industryCategory,
          priority:               r.priority,
          riskWeights:            r.riskWeights,
          riskTierThresholds:     r.riskTierThresholds,
          screeningFrequencyDays: r.screeningFrequencyDays,
          screeningLists:         r.screeningLists,
          onboardingSlaHours:     r.onboardingSlaHours,
          autoApproveThreshold:   r.autoApproveThreshold,
        },
      })
    }
  })
  console.log(`✓ ${MATRIX_RULES.length} risk matrix rules upserted`)

  // 3. Factors — keyed by (tenantId, factorKey).
  for (const f of FACTORS) {
    await prisma.vendorRiskFactor.upsert({
      where:  { tenantId_factorKey: { tenantId, factorKey: f.factorKey } },
      update: {
        factorLabel:  f.factorLabel,
        factorGroup:  f.factorGroup,
        scoringLogic: f.scoringLogic,
        status:       'ACTIVE',
      },
      create: {
        tenantId,
        factorKey:    f.factorKey,
        factorLabel:  f.factorLabel,
        factorGroup:  f.factorGroup,
        scoringLogic: f.scoringLogic,
      },
    })
  }
  console.log(`✓ ${FACTORS.length} risk factors upserted`)
}
