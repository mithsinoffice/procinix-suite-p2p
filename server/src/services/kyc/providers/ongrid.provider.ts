import type { KYCProvider } from '../kyc.interface.js'

const BASE = process.env.ONGRID_BASE_URL ?? 'https://api.ongrid.in/v1'
const KEY  = process.env.ONGRID_API_KEY

function headers(): Record<string, string> {
  if (!KEY) throw new Error('KYC_NOT_CONFIGURED: ONGRID_API_KEY missing')
  return { 'Content-Type': 'application/json', 'x-api-key': KEY }
}

async function post(path: string, body: object): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Ongrid error ${res.status}: ${await res.text()}`)
  return res.json()
}

export const OngridProvider: KYCProvider = {
  async verifyPAN(pan) {
    try {
      const data = await post('/pan/verify', { pan_number: pan })
      return { status: data.status === 'VALID' ? 'VALID' : 'INVALID', name: data.name, type: data.type, message: data.message }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED', message: e.message }
      return { status: 'INVALID', message: e.message }
    }
  },

  async verifyGST(gstin) {
    try {
      const data = await post('/gst/verify', { gstin })
      return { status: data.status ?? 'VALID', legalName: data.legal_name, tradeName: data.trade_name, registrationDate: data.registration_date, complianceScore: data.compliance_score }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED', message: e.message }
      return { status: 'INVALID', message: e.message }
    }
  },

  async verifyGSTReturns(gstin) {
    try {
      const data = await post('/gst/returns', { gstin })
      return { status: data.risk_level ?? 'LOW_RISK', gstr1LastFiled: data.gstr1_last_filed, gstr3bLastFiled: data.gstr3b_last_filed }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED' }
      return { status: 'HIGH_RISK', message: e.message }
    }
  },

  async check206AB(pan) {
    try {
      const data = await post('/pan/206ab', { pan_number: pan })
      return { status: data.applicable ? 'FLAGGED' : 'CHECKED', applicable: data.applicable, rate: data.rate, reason: data.reason }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED', applicable: false }
      return { status: 'KYC_NOT_CONFIGURED', applicable: false, reason: e.message }
    }
  },

  async pennyDrop(accountNo, ifsc, holderName) {
    try {
      const data = await post('/bank/penny-drop', { account_number: accountNo, ifsc, name: holderName })
      return { status: data.name_match_score >= 80 ? 'VALID' : 'NAME_MISMATCH', accountName: data.account_name, nameMatchScore: data.name_match_score, bankName: data.bank_name, branch: data.branch }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED' }
      return { status: 'INVALID', message: e.message }
    }
  },

  async verifyCIN(cin) {
    try {
      const data = await post('/cin/verify', { cin_number: cin })
      return { status: data.status ?? 'VALID', companyName: data.company_name, companyStatus: data.company_status }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED' }
      return { status: 'INVALID', message: e.message }
    }
  },

  async verifyMSME(udyamNo) {
    try {
      const data = await post('/msme/verify', { udyam_number: udyamNo })
      return { status: 'VALID', category: data.enterprise_category, name: data.enterprise_name }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED' }
      return { status: 'INVALID', message: e.message }
    }
  },
}
