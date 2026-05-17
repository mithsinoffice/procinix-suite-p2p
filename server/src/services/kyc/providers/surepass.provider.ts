import type { KYCProvider, PANResult, GSTResult, GSTReturnResult, Check206ABResult, BankResult, CINResult, MSMEResult } from '../kyc.interface.js'

const BASE  = process.env.SUREPASS_BASE_URL ?? 'https://kyc-api.surepass.io/api/v1'
const TOKEN = process.env.SUREPASS_TOKEN

function headers(): Record<string, string> {
  if (!TOKEN) throw new Error('KYC_NOT_CONFIGURED: SUREPASS_TOKEN missing')
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` }
}

async function post(path: string, body: object): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Surepass error ${res.status}: ${await res.text()}`)
  return res.json()
}

export const SurepassProvider: KYCProvider = {
  async verifyPAN(pan) {
    try {
      const data = await post('/pan', { id_number: pan })
      return { status: data.data?.status === 'VALID' ? 'VALID' : 'INVALID', name: data.data?.full_name, type: data.data?.type }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED', message: e.message }
      return { status: 'INVALID', message: e.message }
    }
  },

  async verifyGST(gstin) {
    try {
      const data = await post('/gstin', { id_number: gstin })
      return { status: data.data?.gstin_status === 'Active' ? 'VALID' : 'INVALID', legalName: data.data?.legal_name_of_business, tradeName: data.data?.trade_name_of_business }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED', message: e.message }
      return { status: 'INVALID', message: e.message }
    }
  },

  async verifyGSTReturns(gstin) {
    try {
      const data = await post('/gstin-return-status', { id_number: gstin })
      return { status: data.data?.risk ?? 'LOW_RISK', gstr1LastFiled: data.data?.gstr1_last_filed, gstr3bLastFiled: data.data?.gstr3b_last_filed }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED' }
      return { status: 'HIGH_RISK', message: e.message }
    }
  },

  async check206AB(pan) {
    try {
      const data = await post('/pan/206ab', { id_number: pan })
      return { status: data.data?.applicable ? 'FLAGGED' : 'CHECKED', applicable: data.data?.applicable ?? false, rate: data.data?.tds_rate, reason: data.data?.reason }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED', applicable: false }
      return { status: 'KYC_NOT_CONFIGURED', applicable: false }
    }
  },

  async pennyDrop(accountNo, ifsc, holderName) {
    try {
      const data = await post('/bank-verification', { id_number: accountNo, ifsc, name: holderName })
      const score = data.data?.name_match_score ?? 0
      return { status: score >= 80 ? 'VALID' : 'NAME_MISMATCH', accountName: data.data?.registered_name, nameMatchScore: score, bankName: data.data?.bank_name }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED' }
      return { status: 'INVALID', message: e.message }
    }
  },

  async verifyCIN(cin) {
    try {
      const data = await post('/cin', { id_number: cin })
      return { status: 'VALID', companyName: data.data?.company_name, companyStatus: data.data?.company_status }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED' }
      return { status: 'INVALID', message: e.message }
    }
  },

  async verifyMSME(udyamNo) {
    try {
      const data = await post('/udyam-registration', { id_number: udyamNo })
      return { status: 'VALID', category: data.data?.enterprise_category, name: data.data?.enterprise_name }
    } catch (e: any) {
      if (e.message?.includes('KYC_NOT_CONFIGURED')) return { status: 'KYC_NOT_CONFIGURED' }
      return { status: 'INVALID', message: e.message }
    }
  },
}
