import { useQuery } from '@tanstack/react-query'
import { http } from '../http'
import { STALE_TIMES } from '../query-client'

// ── Shared filter shape ─────────────────────────────────────────────────────
export interface AnalyticsFilters {
  entityId?: string
  period?:   string   // YYYY-MM
  dateFrom?: string
  dateTo?:   string
}

function toQuery(f: AnalyticsFilters | undefined): string {
  if (!f) return ''
  const parts: string[] = []
  if (f.entityId) parts.push(`entityId=${encodeURIComponent(f.entityId)}`)
  if (f.period)   parts.push(`period=${encodeURIComponent(f.period)}`)
  if (f.dateFrom) parts.push(`dateFrom=${encodeURIComponent(f.dateFrom)}`)
  if (f.dateTo)   parts.push(`dateTo=${encodeURIComponent(f.dateTo)}`)
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

// ── Procurement ─────────────────────────────────────────────────────────────
export interface ProcurementMaverickPO { poRef: string; vendorName: string; amount: number; category: string; requester: string | null; hasReason: boolean }
export interface ProcurementCycleStage  { stage: string; avgDays: number; count: number; delayReason: string }
export interface ProcurementSavingsCat  { category: string; baseline: number; actual: number; saving: number; pct: number }
export interface ProcurementVendorCon   { vendorName: string; spendAmount: number; spendPct: number; kycStatus: string; isMsme: boolean; riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' }
export interface ProcurementComplianceTrend { month: string; compliancePct: number }
export interface ProcurementCycleHealth     { stage: string; avgDays: number; p90Days: number; targetDays: number; status: string }
export interface ProcurementSpendByCat      { category: string; amount: number; budgetAmount: number; utilizationPct: number }
export interface ProcurementLeakage         { source: string; amount: number; description: string }

export interface ProcurementAnalytics {
  maverickSpendPct:    number
  maverickSpendAmount: number
  maverickPOs:         ProcurementMaverickPO[]
  prToPoCycleDays:     number
  prToPoCycleP90:      number
  prToPoCycleP50:      number
  cycleBreakdown:      ProcurementCycleStage[]
  savingsAchieved:     number
  savingsTarget:       number
  savingsByCategory:   ProcurementSavingsCat[]
  vendorConcentration: ProcurementVendorCon[]
  totalSpend:          number
  contractedSpendPct:  number
  poComplianceTrend:   ProcurementComplianceTrend[]
  cycleHealthByStage:  ProcurementCycleHealth[]
  spendByCategory:     ProcurementSpendByCat[]
  savingsLeakage:      ProcurementLeakage[]
  meta:                { period: string; vendorCount: number; poCount: number }
}

// ── AP ──────────────────────────────────────────────────────────────────────
export interface AgingBucket { bucket: string; count: number; amount: number; pct: number; wcImpact: number; action: string }
export interface AgingItem   { invoiceRef: string; vendorName: string; amount: number; ageDays: number; isMsme: boolean; penaltyRisk: string }
export interface StpReadinessItem { guardrail: string; count: number; scoreImpact: number; fixDescription: string }
export interface MatchRange       { range: string; count: number }
export interface MatchTypeRow     { type: string; count: number; autoPass: number; exceptions: number }
export interface ExceptionRow     { type: string; count: number; avgCycleImpact: number; owner: string }
export interface OcrAccuracyRow   { field: string; printedPct: number; handwrittenPct: number }

export interface ApAnalytics {
  dpo: number; dpoTarget: number; dpoWcImpact: number
  invoiceCount: number; touchlessRate: number; exceptionRate: number
  overdueCount: number; overdueAmount: number
  costPerInvoice: number; costPerInvoiceAuto: number
  agingBuckets: AgingBucket[]; agingDrillDown: AgingItem[]
  stpReadiness: StpReadinessItem[]
  matchScoreDistribution: MatchRange[]; matchByType: MatchTypeRow[]
  exceptionRegister: ExceptionRow[]
  ocrAccuracy: OcrAccuracyRow[]
  duplicatesDetected: number; duplicatesBlocked: number
  annualSavingFromSTP: number
  meta: { period: string; apBalance: number; periodSpend: number }
}

// ── Payments ────────────────────────────────────────────────────────────────
export interface CashOutflowWeek { week: string; amount: number; msmeAmount: number; overdueAmount: number }
export interface MsmeVendorRow   { vendorName: string; category: string; udyamReg: string; invoiceDate: string; deadlineDate: string; daysRemaining: number; amount: number; penaltyIfBreached: number }
export interface EarlyPayVendorRow { vendorName: string; terms: string; invoiceAmount: number; discount: number; payBy: string; daysLeft: number }
export interface TdsBySectionRow { section: string; period: string; amount: number; dueDate: string; status: string }
export interface PaymentMethodRow { method: string; count: number; amount: number }
export interface PaymentQueueRow {
  vendorName: string; invoiceRef: string; amount: number; dueDate: string;
  isMsme: boolean; earlyDiscountRate: number; recommendedPayDate: string;
  priority: number; priorityReason: string;
}

export interface PaymentsAnalytics {
  onTimeRate: number; onTimeTarget: number
  cashOutflow30d: number
  cashOutflowByWeek: CashOutflowWeek[]
  msmeCompliance: { total: number; atRisk: number; breached: number; vendors: MsmeVendorRow[] }
  earlyPayDiscountCapture: number
  earlyPayOpportunity: number
  earlyPayVendors: EarlyPayVendorRow[]
  tdsUndeposited: number
  tdsBySection: TdsBySectionRow[]
  paymentMethodMix: PaymentMethodRow[]
  erpSyncStatus: { synced: number; pending: number; failed: number }
  paymentQueue: PaymentQueueRow[]
  latePaymentPenalties: number
  meta: { period: string }
}

// ── CFO ─────────────────────────────────────────────────────────────────────
export interface WcLeakageRow { source: string; amount: number; action: string; timeframe: string }
export interface BsPositionRow { account: string; balance: number; movement: number; risk: string; settlementExpected: string }
export interface CashForecastRow { period: string; amount: number; type: string }
export interface BudgetActualRow {
  category: string; budget: number; actual: number; utilPct: number;
  monthlyRunRate: number; projectedFY: number; variance: number; signal: 'RED' | 'AMBER' | 'GREEN'
}
export interface ProvisionAdequacyRow { item: string; provision: number; actual: number; variance: number; action: string }
export interface AmortForecastRow { month: string; amount: number }
export interface ReforecastSignal { category: string; signal: 'RED' | 'AMBER' | 'GREEN'; detail: string }

export interface CfoAnalytics {
  totalApLiability: number; apLiabilityMoM: number
  wcAtRisk: number; wcLeakageBreakdown: WcLeakageRow[]
  accruals: {
    provisionBalance: number; provisionReversalDate: string;
    prepaidBalance: number; prepaidMonthlyRecognition: number;
    tdsPayable: number; msmeInterestRisk: number;
  }
  bsPositions: BsPositionRow[]
  cashForecast: CashForecastRow[]
  budgetVsActual: BudgetActualRow[]
  provisionAdequacy: ProvisionAdequacyRow[]
  amortizationForecast: AmortForecastRow[]
  optimisationOpportunity: number
  budgetReforecastSignals: ReforecastSignal[]
  meta: { period: string }
}

// ── CEO ─────────────────────────────────────────────────────────────────────
export interface MaturityDimensionRow { dimension: string; score: number; maxScore: number; benchmark: number; gap: number; annualImpact: number }
export interface StrategicInitiative {
  rank: number; title: string; roi: string; paybackMonths: number; effort: string;
  annualBenefit: number; implementation: string; currentState: string; targetState: string;
}
export interface SpendTrendRow      { month: string; amount: number; isAnomaly: boolean; anomalyNote: string }
export interface CeoVendorConRow    { vendorName: string; spendPct: number; risk: 'HIGH' | 'MEDIUM' | 'LOW'; action: string }
export interface RiskRegisterRow    { risk: string; exposure: number; deadline: string; owner: string; decisionNeeded: string; status: string }
export interface KeyAlert           { type: string; message: string; urgency: string; action: string }

export interface CeoAnalytics {
  totalSpendFY: number; spendYoY: number; spendAnnualised: number
  contractedPct: number; maverickPct: number; wcAtRisk: number
  p2pMaturityScore: number; p2pMaturityBenchmark: number
  financialRiskExposure: number
  maturityDimensions: MaturityDimensionRow[]
  strategicInitiatives: StrategicInitiative[]
  spendTrend: SpendTrendRow[]
  vendorConcentration: CeoVendorConRow[]
  riskRegister: RiskRegisterRow[]
  keyAlerts: KeyAlert[]
  meta: { period: string; vendorCount: number; fyStart: string }
}

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useProcurementAnalytics(f?: AnalyticsFilters) {
  return useQuery({
    queryKey:  ['analytics', 'procurement', f ?? {}],
    queryFn:   () => http.get<ProcurementAnalytics>(`/api/analytics/procurement${toQuery(f)}`),
    staleTime: STALE_TIMES.DASHBOARD,
  })
}
export function useApAnalytics(f?: AnalyticsFilters) {
  return useQuery({
    queryKey:  ['analytics', 'ap', f ?? {}],
    queryFn:   () => http.get<ApAnalytics>(`/api/analytics/ap${toQuery(f)}`),
    staleTime: STALE_TIMES.DASHBOARD,
  })
}
export function usePaymentsAnalytics(f?: AnalyticsFilters) {
  return useQuery({
    queryKey:  ['analytics', 'payments', f ?? {}],
    queryFn:   () => http.get<PaymentsAnalytics>(`/api/analytics/payments${toQuery(f)}`),
    staleTime: STALE_TIMES.DASHBOARD,
  })
}
export function useCfoAnalytics(f?: AnalyticsFilters) {
  return useQuery({
    queryKey:  ['analytics', 'cfo', f ?? {}],
    queryFn:   () => http.get<CfoAnalytics>(`/api/analytics/cfo${toQuery(f)}`),
    staleTime: STALE_TIMES.DASHBOARD,
  })
}
export function useCeoAnalytics(f?: AnalyticsFilters) {
  return useQuery({
    queryKey:  ['analytics', 'ceo', f ?? {}],
    queryFn:   () => http.get<CeoAnalytics>(`/api/analytics/ceo${toQuery(f)}`),
    staleTime: STALE_TIMES.DASHBOARD,
  })
}
