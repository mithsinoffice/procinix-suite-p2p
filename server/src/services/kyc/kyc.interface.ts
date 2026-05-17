export interface PANResult {
  status:   'VALID' | 'INVALID' | 'NOT_FOUND' | 'KYC_NOT_CONFIGURED'
  name?:    string
  type?:    string
  message?: string
}
export interface GSTResult {
  status:              'VALID' | 'INVALID' | 'SUSPENDED' | 'CANCELLED' | 'KYC_NOT_CONFIGURED'
  legalName?:          string
  tradeName?:          string
  registrationDate?:   string
  filingStatus?:       string
  complianceScore?:    number
  message?:            string
}
export interface GSTReturnResult {
  status:           'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'KYC_NOT_CONFIGURED'
  gstr1LastFiled?:  string
  gstr3bLastFiled?: string
  message?:         string
}
export interface Check206ABResult {
  applicable: boolean
  rate?:      number
  reason?:    string
  status:     'CHECKED' | 'FLAGGED' | 'KYC_NOT_CONFIGURED'
}
export interface BankResult {
  status:          'VALID' | 'INVALID' | 'NAME_MISMATCH' | 'KYC_NOT_CONFIGURED'
  accountName?:    string
  nameMatchScore?: number
  bankName?:       string
  branch?:         string
  message?:        string
}
export interface CINResult {
  status:          'VALID' | 'INVALID' | 'STRUCK_OFF' | 'KYC_NOT_CONFIGURED'
  companyName?:    string
  companyStatus?:  string
  message?:        string
}
export interface MSMEResult {
  status:    'VALID' | 'INVALID' | 'KYC_NOT_CONFIGURED'
  category?: 'MICRO' | 'SMALL' | 'MEDIUM'
  name?:     string
  message?:  string
}

export interface KYCProvider {
  verifyPAN(pan: string): Promise<PANResult>
  verifyGST(gstin: string): Promise<GSTResult>
  verifyGSTReturns(gstin: string): Promise<GSTReturnResult>
  check206AB(pan: string): Promise<Check206ABResult>
  pennyDrop(accountNo: string, ifsc: string, holderName: string): Promise<BankResult>
  verifyCIN(cin: string): Promise<CINResult>
  verifyMSME(udyamNo: string): Promise<MSMEResult>
}
