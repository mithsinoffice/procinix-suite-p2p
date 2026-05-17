import { OngridProvider }   from './providers/ongrid.provider.js'
import { SurepassProvider } from './providers/surepass.provider.js'
import type { KYCProvider } from './kyc.interface.js'
import type { PrismaClient } from '@prisma/client'

function getProvider(check: string): KYCProvider {
  const key      = `KYC_${check.toUpperCase()}_PROVIDER`
  const provider = process.env[key] ?? process.env.KYC_PROVIDER ?? 'ongrid'
  return provider === 'surepass' ? SurepassProvider : OngridProvider
}

export async function runPANChain(
  prisma:   PrismaClient,
  vendorId: string,
  pan:      string,
  cin?:     string,
  udyamNo?: string,
): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {}

  const panResult = await getProvider('PAN').verifyPAN(pan)
  results.kycPanStatus = panResult.status
  results.kycPanName   = panResult.name

  const ab206Result = await getProvider('206AB').check206AB(pan)
  results.is206ABApplicable = ab206Result.applicable
  results.section206ABRate  = ab206Result.rate ?? null

  if (cin) {
    const cinResult = await getProvider('CIN').verifyCIN(cin)
    results.kycCinStatus      = cinResult.status
    results.kycCinCompanyName = cinResult.companyName
  }

  if (udyamNo) {
    const msmeResult = await getProvider('MSME').verifyMSME(udyamNo)
    results.kycMsmeStatus   = msmeResult.status
    results.kycMsmeCategory = msmeResult.category
  }

  results.kycLastRunAt = new Date()

  await prisma.vendor.update({ where: { id: vendorId }, data: results })
  return results
}

export async function runGSTChain(
  prisma:   PrismaClient,
  vendorId: string,
  gstin:    string,
): Promise<Record<string, unknown>> {
  const gstResult    = await getProvider('GST').verifyGST(gstin)
  const returnResult = await getProvider('RETURNS').verifyGSTReturns(gstin)

  const updates: Record<string, unknown> = {
    kycGstStatus:      gstResult.status,
    kycGstName:        gstResult.legalName ?? null,
    gstComplianceScore: gstResult.complianceScore ?? null,
    gstReturnRisk:     returnResult.status,
    kycLastRunAt:      new Date(),
  }
  await prisma.vendor.update({ where: { id: vendorId }, data: updates })
  return updates
}

export async function runBankChain(
  prisma:         PrismaClient,
  bankAccountId:  string,
  accountNo:      string,
  ifsc:           string,
  holderName:     string,
): Promise<Record<string, unknown>> {
  const bankResult = await getProvider('BANK').pennyDrop(accountNo, ifsc, holderName)

  const updates: Record<string, unknown> = {
    kycStatus:         bankResult.status,
    kycNameMatchScore: bankResult.nameMatchScore ?? null,
    bankName:          bankResult.bankName ?? null,
    kycVerifiedAt:     new Date(),
  }
  await prisma.vendorBankAccount.update({ where: { id: bankAccountId }, data: updates })
  return { ...updates, accountName: bankResult.accountName }
}
