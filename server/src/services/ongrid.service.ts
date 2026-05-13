import { ok, err, type Result } from '../lib/result.js'

const BASE_URL = process.env.ONGRID_BASE_URL ?? 'https://kyc-api.ongrid.in'
const API_KEY  = process.env.ONGRID_API_KEY  ?? ''
const MOCK     = process.env.KYC_MOCK_MODE   === 'true'

export interface PanVerifyResult {
  panNumber: string; name: string; status: 'VALID' | 'INVALID' | 'DEACTIVATED'
  panType: string; aadhaarLinked: boolean
}
export interface GstVerifyResult {
  gstin: string; legalName: string; tradeName: string; state: string
  registrationDate: string; status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED'
  entityType: string; filingStatus: string
}
export interface BankVerifyResult {
  accountNumber: string; ifsc: string; bankName: string; accountName: string
  status: 'VALID' | 'INVALID' | 'NAME_MISMATCH' | 'ACCOUNT_CLOSED'; nameMatchScore: number
}
export interface CinVerifyResult {
  cin: string; companyName: string
  status: 'ACTIVE' | 'STRUCK_OFF' | 'UNDER_LIQUIDATION' | 'NOT_FOUND'
  dateOfReg: string; registeredState: string; companyType: string
  directors: Array<{ name: string; din: string }>
}
export interface MsmeVerifyResult {
  udyamNumber: string; entityName: string
  status: 'REGISTERED' | 'NOT_REGISTERED' | 'EXPIRED'
  category: 'MICRO' | 'SMALL' | 'MEDIUM'
  dateOfReg: string; majorActivity: string
}

async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<Result<T>> {
  if (!API_KEY) return err({ code: 'INTERNAL_ERROR' as const, message: 'ONGRID_API_KEY not configured', httpStatus: 500 })
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    const data = await res.json() as any
    if (!res.ok || data.success === false) {
      return err({ code: 'EXTERNAL_SERVICE_ERROR' as const, message: data.message ?? `Ongrid error (${res.status})`, httpStatus: 502 })
    }
    return ok(data.data as T)
  } catch (e) {
    return err({ code: 'EXTERNAL_SERVICE_ERROR' as const, message: `Ongrid unreachable: ${e instanceof Error ? e.message : String(e)}`, httpStatus: 502 })
  }
}

const mock = {
  pan:  (pan: string):   PanVerifyResult  => ({ panNumber: pan, name: 'MOCK VENDOR PVT LTD', status: 'VALID', panType: 'COMPANY', aadhaarLinked: false }),
  gst:  (gstin: string): GstVerifyResult  => ({ gstin, legalName: 'MOCK VENDOR PVT LTD', tradeName: 'MOCK VENDOR', state: gstin.slice(0,2), registrationDate: '01/01/2020', status: 'ACTIVE', entityType: 'Private Limited Company', filingStatus: 'Regular' }),
  bank: (acc: string, ifsc: string): BankVerifyResult => ({ accountNumber: acc, ifsc, bankName: 'HDFC BANK', accountName: 'MOCK VENDOR PVT LTD', status: 'VALID', nameMatchScore: 92 }),
  cin:  (cin: string):   CinVerifyResult  => ({ cin, companyName: 'MOCK VENDOR PVT LTD', status: 'ACTIVE', dateOfReg: '01/01/2020', registeredState: 'Maharashtra', companyType: 'Private Limited', directors: [{ name: 'MOCK DIRECTOR', din: '12345678' }] }),
  msme: (udyam: string): MsmeVerifyResult => ({ udyamNumber: udyam, entityName: 'MOCK VENDOR PVT LTD', status: 'REGISTERED', category: 'SMALL', dateOfReg: '01/01/2021', majorActivity: 'Services' }),
}

export async function verifyPan(pan: string):                                       Promise<Result<PanVerifyResult>>  { return MOCK ? ok(mock.pan(pan))        : post('/v1/pan/verify', { pan }) }
export async function verifyGstin(gstin: string):                                   Promise<Result<GstVerifyResult>>  { return MOCK ? ok(mock.gst(gstin))      : post('/v1/gst/verify', { gstin }) }
export async function verifyBankAccount(acc: string, ifsc: string, name: string):  Promise<Result<BankVerifyResult>> { return MOCK ? ok(mock.bank(acc, ifsc)) : post('/v1/bank/penny-drop', { account_number: acc, ifsc, name }) }
export async function verifyCin(cin: string):                                       Promise<Result<CinVerifyResult>>  { return MOCK ? ok(mock.cin(cin))        : post('/v1/mca/cin', { cin }) }
export async function verifyMsme(udyam: string):                                    Promise<Result<MsmeVerifyResult>> { return MOCK ? ok(mock.msme(udyam))     : post('/v1/msme/udyam', { udyam_number: udyam }) }
