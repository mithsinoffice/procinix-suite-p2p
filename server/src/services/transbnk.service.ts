import { ok, err, type Result } from '../lib/result.js'

const BASE_URL       = process.env.TRANSBNK_BASE_URL       ?? 'https://api.transbnk.com'
const CLIENT_ID      = process.env.TRANSBNK_CLIENT_ID      ?? ''
const CLIENT_SECRET  = process.env.TRANSBNK_CLIENT_SECRET  ?? ''
const ACCOUNT_NUMBER = process.env.TRANSBNK_ACCOUNT_NUMBER ?? ''
const MOCK           = process.env.PAYMENT_MOCK_MODE === 'true'

export type PaymentMode = 'NEFT' | 'RTGS' | 'IMPS'
export interface BeneficiaryPayload { name: string; accountNumber: string; ifsc: string; email?: string; mobile?: string }
export interface BeneficiaryResult  { beneficiaryId: string; status: 'ACTIVE' | 'PENDING' | 'FAILED' }
export interface PaymentPayload     { beneficiaryId: string; amount: number; mode: PaymentMode; remarks: string; referenceId: string }
export interface PaymentResult      { transactionId: string; status: 'PROCESSING' | 'COMPLETED' | 'FAILED'; utr?: string; timestamp: string }
export interface BalanceResult      { accountNumber: string; availableBalance: number; currentBalance: number; currency: string; asOf: string }

let _token: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _token.expiresAt - 60_000) return _token.value
  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  })
  if (!res.ok) throw new Error(`Transbnk auth failed: ${res.status}`)
  const data = await res.json() as any
  _token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in * 1000) }
  return _token.value
}

async function tbReq<T>(method: 'GET' | 'POST', endpoint: string, body?: Record<string, unknown>): Promise<Result<T>> {
  if (!CLIENT_ID || !CLIENT_SECRET) return err({ code: 'INTERNAL_ERROR' as const, message: 'Transbnk credentials not configured', httpStatus: 500 })
  try {
    const token = await getAccessToken()
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    })
    const data = await res.json() as any
    if (!res.ok || data.success === false) return err({ code: 'EXTERNAL_SERVICE_ERROR' as const, message: data.message ?? `Transbnk error (${res.status})`, httpStatus: 502 })
    return ok(data.data ?? data as T)
  } catch (e) {
    return err({ code: 'EXTERNAL_SERVICE_ERROR' as const, message: `Transbnk unreachable: ${e instanceof Error ? e.message : String(e)}`, httpStatus: 502 })
  }
}

export async function registerBeneficiary(p: BeneficiaryPayload): Promise<Result<BeneficiaryResult>> {
  if (MOCK) return ok({ beneficiaryId: `MOCK-BEN-${Date.now()}`, status: 'ACTIVE' })
  return tbReq('POST', '/v1/beneficiary/add', { name: p.name, account_number: p.accountNumber, ifsc: p.ifsc, email: p.email, mobile: p.mobile })
}
export async function initiatePayment(p: PaymentPayload): Promise<Result<PaymentResult>> {
  if (MOCK) return ok({ transactionId: `MOCK-TXN-${Date.now()}`, status: 'COMPLETED', utr: `MOCK${Date.now()}`, timestamp: new Date().toISOString() })
  return tbReq('POST', '/v1/payment/initiate', { beneficiary_id: p.beneficiaryId, amount: p.amount, payment_mode: p.mode, remarks: p.remarks, reference_id: p.referenceId, debit_account: ACCOUNT_NUMBER })
}
export async function getPaymentStatus(transactionId: string): Promise<Result<PaymentResult>> {
  if (MOCK) return ok({ transactionId, status: 'COMPLETED', utr: `MOCK${Date.now()}`, timestamp: new Date().toISOString() })
  return tbReq('GET', `/v1/payment/status/${transactionId}`)
}
export async function getAccountBalance(): Promise<Result<BalanceResult>> {
  if (MOCK) return ok({ accountNumber: ACCOUNT_NUMBER, availableBalance: 5000000, currentBalance: 5000000, currency: 'INR', asOf: new Date().toISOString() })
  return tbReq('GET', `/v1/account/balance/${ACCOUNT_NUMBER}`)
}
export async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  const secret = process.env.TRANSBNK_WEBHOOK_SECRET ?? ''
  if (!secret) return false
  const { createHmac } = await import('crypto')
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  return signature === `sha256=${expected}`
}
