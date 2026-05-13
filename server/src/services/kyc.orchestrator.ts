import type { PrismaClient } from '@prisma/client'
import { verifyPan, verifyGstin, verifyBankAccount, verifyCin, verifyMsme } from './ongrid.service.js'
import { getGstCompliance, getGstReturnFilingStatus, check206AB } from './surepass.service.js'
import { registerBeneficiary } from './transbnk.service.js'
import { writeAuditLog } from '../lib/audit.js'

export interface KycContext  { tenantId: string; userId: string; ip?: string }
export interface VendorKycInput {
  id: string; pan: string; gstin?: string; cin?: string; udyamNumber?: string
  bankAccountNo?: string; ifscCode?: string; legalName: string; email?: string; mobile?: string
}

export async function runVendorKyc(prisma: PrismaClient, vendor: VendorKycInput, ctx: KycContext): Promise<void> {
  const u: Record<string, unknown> = { kycLastCheckedAt: new Date() }

  // 1. PAN
  const panR = await verifyPan(vendor.pan)
  if (panR.ok) { u.kycPanStatus = panR.data.status; u.kycPanName = panR.data.name }
  else u.kycPanStatus = 'ERROR'

  // 2. GST verify
  if (vendor.gstin) {
    const gstR = await verifyGstin(vendor.gstin)
    if (gstR.ok) { u.kycGstStatus = gstR.data.status; u.kycGstName = gstR.data.legalName }
    else u.kycGstStatus = 'ERROR'

    // 3. GST compliance score
    const compR = await getGstCompliance(vendor.gstin)
    if (compR.ok) {
      u.gstComplianceScore  = compR.data.complianceScore
      u.einvoiceRequired    = compR.data.einvoiceApplicable
      u.itcRisk             = compR.data.itcRisk
      u.is206ABApplicable   = compR.data.is206ABApplicable
      u.complianceCheckedAt = new Date()
    }

    // 4. GST return filing status
    const retR = await getGstReturnFilingStatus(vendor.gstin)
    if (retR.ok) {
      u.gstr1LastFiledPeriod  = retR.data.gstr1.lastFiledPeriod
      u.gstr1LastFiledDate    = retR.data.gstr1.lastFiledDate
      u.gstr3bLastFiledPeriod = retR.data.gstr3b.lastFiledPeriod
      u.gstr3bLastFiledDate   = retR.data.gstr3b.lastFiledDate
      u.gstReturnRisk         = retR.data.overallRisk
      u.gstReturnCheckedAt    = new Date()
    }
  }

  // 5. CIN
  if (vendor.cin) {
    const cinR = await verifyCin(vendor.cin)
    if (cinR.ok) { u.kycCinStatus = cinR.data.status; u.kycCinCompanyName = cinR.data.companyName; u.kycCinDateOfReg = cinR.data.dateOfReg }
    else u.kycCinStatus = 'ERROR'
  }

  // 6. MSME
  if (vendor.udyamNumber) {
    const msmeR = await verifyMsme(vendor.udyamNumber)
    if (msmeR.ok) { u.kycMsmeStatus = msmeR.data.status; u.kycMsmeCategory = msmeR.data.category; u.kycMsmeRegisteredAt = msmeR.data.dateOfReg }
    else u.kycMsmeStatus = 'ERROR'
  }

  // 7. Section 206AB
  const s206R = await check206AB(vendor.pan)
  if (s206R.ok) {
    u.section206ABRate      = s206R.data.applicableRate
    u.section206ABReason    = s206R.data.reason
    u.lastItrFiledYear      = s206R.data.lastItrFiledYear ?? undefined
    u.section206ABCheckedAt = new Date()
    u.is206ABApplicable     = s206R.data.is206ABApplicable
    u.panCompliance = s206R.data.is206ABApplicable ? 'NON_FILER'
                    : s206R.data.applicableRate < 10 ? 'LOWER_DEDUCTION'
                    : 'COMPLIANT'
  }

  // 8. Bank + beneficiary name match
  if (vendor.bankAccountNo && vendor.ifscCode) {
    const bankR = await verifyBankAccount(vendor.bankAccountNo, vendor.ifscCode, vendor.legalName)
    if (bankR.ok) {
      u.kycBankStatus         = bankR.data.status
      u.kycBankAccountName    = bankR.data.accountName
      u.kycBankNameMatchScore = bankR.data.nameMatchScore
      u.kycBankNameMatch      = bankR.data.nameMatchScore >= 70
      u.kycBankNameMatchedAt  = new Date()
    } else u.kycBankStatus = 'ERROR'

    // 9. Register Transbnk beneficiary if bank valid
    if (u.kycBankStatus === 'VALID') {
      const benR = await registerBeneficiary({ name: vendor.legalName, accountNumber: vendor.bankAccountNo, ifsc: vendor.ifscCode, email: vendor.email, mobile: vendor.mobile })
      if (benR.ok) { u.transbnkBeneficiaryId = benR.data.beneficiaryId; u.transbnkRegisteredAt = new Date() }
    }
  }

  await prisma.vendor.update({ where: { id: vendor.id }, data: u })
  await writeAuditLog(prisma, { tenantId: ctx.tenantId, userId: ctx.userId, action: 'vendor.kyc_completed', entityType: 'vendor', entityId: vendor.id, after: u, ipAddress: ctx.ip })
}
