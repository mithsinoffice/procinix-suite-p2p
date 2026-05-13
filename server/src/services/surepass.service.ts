import { ok, err, type Result } from '../lib/result.js'

const BASE_URL = process.env.SUREPASS_BASE_URL ?? 'https://kyc-api.surepass.io'
const TOKEN    = process.env.SUREPASS_TOKEN    ?? ''
const MOCK     = process.env.KYC_MOCK_MODE     === 'true'

export interface GstComplianceResult {
  gstin: string; complianceScore: number; lastReturnFiled: string
  lastFiledDate: string; returnFilingFreq: 'Monthly' | 'Quarterly' | 'Annual'
  einvoiceApplicable: boolean; itcRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  is206ABApplicable: boolean; is206AAApplicable: boolean
}
export interface GstReturnFilingResult {
  gstin: string
  gstr1:  { lastFiledPeriod: string; lastFiledDate: string; pendingPeriods: string[]; filingRisk: 'LOW' | 'MEDIUM' | 'HIGH' }
  gstr3b: { lastFiledPeriod: string; lastFiledDate: string; pendingPeriods: string[]; filingRisk: 'LOW' | 'MEDIUM' | 'HIGH' }
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH'
}
export interface Section206ABResult {
  pan: string; is206ABApplicable: boolean; applicableRate: number
  reason: string; lastItrFiledYear: string | null; itrFiledCount: number
}

async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<Result<T>> {
  if (!TOKEN) return err({ code: 'INTERNAL_ERROR' as const, message: 'SUREPASS_TOKEN not configured', httpStatus: 500 })
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    const data = await res.json() as any
    if (!res.ok || !data.success) return err({ code: 'EXTERNAL_SERVICE_ERROR' as const, message: data.message ?? `Surepass error (${res.status})`, httpStatus: 502 })
    return ok(data.data as T)
  } catch (e) {
    return err({ code: 'EXTERNAL_SERVICE_ERROR' as const, message: `Surepass unreachable: ${e instanceof Error ? e.message : String(e)}`, httpStatus: 502 })
  }
}

const today = new Date().toISOString().slice(0, 10)
const mock = {
  compliance:   (gstin: string): GstComplianceResult    => ({ gstin, complianceScore: 85, lastReturnFiled: 'GSTR-3B', lastFiledDate: today, returnFilingFreq: 'Monthly', einvoiceApplicable: false, itcRisk: 'LOW', is206ABApplicable: false, is206AAApplicable: false }),
  gstReturns:   (gstin: string): GstReturnFilingResult  => ({ gstin, gstr1: { lastFiledPeriod: 'Nov-2024', lastFiledDate: '11/12/2024', pendingPeriods: [], filingRisk: 'LOW' }, gstr3b: { lastFiledPeriod: 'Nov-2024', lastFiledDate: '20/12/2024', pendingPeriods: [], filingRisk: 'LOW' }, overallRisk: 'LOW' }),
  section206AB: (pan: string):  Section206ABResult      => ({ pan, is206ABApplicable: false, applicableRate: 10, reason: 'ITR filed for both assessment years', lastItrFiledYear: 'AY 2024-25', itrFiledCount: 2 }),
}

export async function getGstCompliance(gstin: string):         Promise<Result<GstComplianceResult>>   { return MOCK ? ok(mock.compliance(gstin))   : post('/api/v1/compliance/gst-compliance-score', { gstin }) }
export async function getGstReturnFilingStatus(gstin: string): Promise<Result<GstReturnFilingResult>> { return MOCK ? ok(mock.gstReturns(gstin))   : post('/api/v1/gst/return-filing-status', { gstin }) }
export async function check206AB(pan: string):                 Promise<Result<Section206ABResult>>    { return MOCK ? ok(mock.section206AB(pan))   : post('/api/v1/compliance/206ab-check', { pan }) }
