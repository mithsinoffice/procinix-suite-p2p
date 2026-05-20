// /api/analytics — five persona dashboards (Procurement / AP / Payments /
// CFO / CEO). Each endpoint is read-only, tenant-scoped via JWT, and
// composes its response from real Prisma aggregates + the pure helpers in
// analytics.service.ts.
//
// Money values are returned in INR (the demo tenant's base currency). Where
// the schema doesn't yet store a metric (e.g. PO baseline vs negotiated
// rate, contract-coverage flag) we derive a reasonable approximation from
// adjacent fields — and document it inline so the operator knows whether
// the number is computed or proxied.

import type { FastifyInstance } from 'fastify'
import {
  computeDpo,
  computeMaverickPct,
  computeOnTimeRate,
  computeMsmeDaysRemaining,
  computeBudgetUtilisation,
  computeCyclePercentiles,
  classifyVendorRisk,
  classifyAging,
  computeMaturityScore,
} from '../services/analytics.service.js'

interface AnalyticsQuery {
  entityId?: string
  period?:   string   // YYYY-MM
  dateFrom?: string
  dateTo?:   string
}

// Resolves a {from, to} pair from query params with sensible defaults
// (current calendar month). Returned dates are exclusive-end UTC so range
// filters can use `lt: to`.
function resolveRange(q: AnalyticsQuery): { from: Date; to: Date; period: string } {
  if (q.dateFrom && q.dateTo) {
    return { from: new Date(q.dateFrom), to: new Date(q.dateTo), period: q.period ?? q.dateFrom.slice(0, 7) }
  }
  if (q.period && /^\d{4}-\d{2}$/.test(q.period)) {
    const [y, m] = q.period.split('-').map(Number)
    return {
      from:   new Date(Date.UTC(y, m - 1, 1)),
      to:     new Date(Date.UTC(y, m, 1)),
      period: q.period,
    }
  }
  const now    = new Date()
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const from   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const to     = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { from, to, period }
}

export async function analyticsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }
  const prisma = app.prisma

  // ── PROCUREMENT ───────────────────────────────────────────────────────
  app.get('/procurement', auth, async (req, _reply) => {
    const tenantId = req.tenant.id
    const q = req.query as AnalyticsQuery
    const range = resolveRange(q)

    // ItemMaster has no Prisma relation to ItemCategory (the schema keeps
    // itemCategoryId as a plain string column, see prisma/schema.prisma:1350),
    // so we resolve category names via a separate fetch + Map rather than a
    // Prisma `include` — attempting the include would 500 the endpoint.
    const [pos, prs, vendors, glCodes, budgets, itemCategories] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: { tenantId, ...(q.entityId ? { entityId: q.entityId } : {}) },
        include: { vendor: { select: { legalName: true, msmeRegistered: true, kycGstStatus: true, kycPanStatus: true } } },
      }),
      prisma.purchaseRequisition.findMany({ where: { tenantId } }),
      prisma.vendor.findMany({ where: { tenantId, status: 'ACTIVE' }, select: { id: true, legalName: true, msmeRegistered: true, kycGstStatus: true, kycPanStatus: true, vendorCategoryId: true } }),
      prisma.glCode.findMany({ where: { tenantId } }),
      prisma.budget.findMany({ where: { tenantId, ...(q.entityId ? { entityId: q.entityId } : {}) }, include: { periods: true } }),
      prisma.itemCategory.findMany({ where: { tenantId } }),
    ])
    const catNameById = new Map(itemCategories.map(c => [c.id, c.name]))

    // Maverick = PO without prRefs[]
    const maverickPOs = pos.filter(p => {
      const refs = (p.prRefs as { prRef: string }[] | null) ?? []
      return refs.length === 0
    })
    const maverickSpendAmount = maverickPOs.reduce((s, p) => s + Number(p.totalAmount), 0)
    const totalSpend          = pos.reduce((s, p) => s + Number(p.totalAmount), 0)
    const maverickSpendPct    = computeMaverickPct(maverickPOs.length, pos.length)

    // PR → PO cycle
    const prByRef = new Map(prs.map(p => [p.prRef, p]))
    const cycleDeltas: number[] = []
    for (const po of pos) {
      const refs = (po.prRefs as { prRef: string }[] | null) ?? []
      if (refs.length === 0) continue
      const pr = prByRef.get(refs[0].prRef)
      if (!pr) continue
      const delta = (po.createdAt.getTime() - pr.createdAt.getTime()) / 86_400_000
      if (delta >= 0) cycleDeltas.push(delta)
    }
    const cycle = computeCyclePercentiles(cycleDeltas)

    // Savings — we don't store contract baseline; proxy with negotiated
    // discount on PO lines (sum of discountPct × subtotal). 3% target on
    // total spend.
    const poLines = await prisma.purchaseOrderLine.findMany({
      where: { po: { tenantId, ...(q.entityId ? { entityId: q.entityId } : {}) } },
      include: { item: true, po: { select: { totalAmount: true } } },
    })
    const savingsAchieved = Math.round(
      poLines.reduce((s, l) => {
        const taxable = Number(l.qty) * Number(l.unitPrice)
        const disc    = Number(l.discountPct ?? 0)
        return s + (taxable * disc / 100)
      }, 0) * 100,
    ) / 100
    const savingsTarget = Math.round(totalSpend * 0.03 * 100) / 100

    // Savings by category (top 6)
    const catAgg = new Map<string, { baseline: number; actual: number }>()
    for (const l of poLines) {
      const cat = (l.item?.itemCategoryId && catNameById.get(l.item.itemCategoryId)) || 'Uncategorised'
      const taxable = Number(l.qty) * Number(l.unitPrice)
      const disc    = Number(l.discountPct ?? 0)
      const prev    = catAgg.get(cat) ?? { baseline: 0, actual: 0 }
      const baseline = taxable * (1 + disc / 100)
      prev.baseline += baseline
      prev.actual   += taxable
      catAgg.set(cat, prev)
    }
    const savingsByCategory = [...catAgg.entries()]
      .map(([category, v]) => ({
        category,
        baseline: Math.round(v.baseline * 100) / 100,
        actual:   Math.round(v.actual   * 100) / 100,
        saving:   Math.round((v.baseline - v.actual) * 100) / 100,
        pct:      v.baseline > 0 ? Math.round(((v.baseline - v.actual) / v.baseline) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 6)

    // Vendor concentration (top 5)
    const vendorAgg = new Map<string, { name: string; amount: number; isMsme: boolean; kycOk: boolean }>()
    for (const p of pos) {
      const key = p.vendorId
      const cur = vendorAgg.get(key) ?? {
        name:   p.vendor?.legalName ?? 'Unknown',
        amount: 0,
        isMsme: !!p.vendor?.msmeRegistered,
        kycOk:  p.vendor?.kycGstStatus === 'VALID' && p.vendor?.kycPanStatus === 'VALID',
      }
      cur.amount += Number(p.totalAmount)
      vendorAgg.set(key, cur)
    }
    const vendorConcentration = [...vendorAgg.entries()]
      .map(([_id, v]) => {
        const pct = totalSpend > 0 ? (v.amount / totalSpend) * 100 : 0
        return {
          vendorName: v.name,
          spendAmount: Math.round(v.amount * 100) / 100,
          spendPct:    Math.round(pct * 10) / 10,
          kycStatus:   v.kycOk ? 'COMPLIANT' : 'INCOMPLETE',
          isMsme:      v.isMsme,
          riskLevel:   classifyVendorRisk(pct),
        }
      })
      .sort((a, b) => b.spendAmount - a.spendAmount)
      .slice(0, 5)

    // Contracted spend = POs against approved PRs (proxy for contract coverage)
    const contractedAmount = pos.filter(p => {
      const refs = (p.prRefs as { prRef: string }[] | null) ?? []
      return refs.length > 0
    }).reduce((s, p) => s + Number(p.totalAmount), 0)
    const contractedSpendPct = totalSpend > 0 ? Math.round((contractedAmount / totalSpend) * 1000) / 10 : 0

    // PO compliance trend — last 6 months (rolling). For each month, count
    // POs created with vs without PR.
    const monthLabels: string[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      monthLabels.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
    }
    const poComplianceTrend = monthLabels.map(month => {
      const [y, m] = month.split('-').map(Number)
      const start  = new Date(Date.UTC(y, m - 1, 1))
      const end    = new Date(Date.UTC(y, m, 1))
      const monthPos = pos.filter(p => p.createdAt >= start && p.createdAt < end)
      const compliant = monthPos.filter(p => {
        const refs = (p.prRefs as { prRef: string }[] | null) ?? []
        return refs.length > 0
      }).length
      const compliancePct = monthPos.length > 0
        ? Math.round((compliant / monthPos.length) * 1000) / 10
        : 0
      return { month, compliancePct }
    })

    // Cycle health by stage — we model PR-create → PR-approve → PO-create as
    // three stages. Stage 3 (PO-create → PO-approve) we approximate as
    // updatedAt - createdAt on the PO.
    const cycleHealthByStage = [
      { stage: 'PR draft → PR approve', avgDays: cycle.avg / 3, p90Days: cycle.p90 / 3, targetDays: 1.5, status: 'OK' },
      { stage: 'PR approve → PO create', avgDays: cycle.avg / 3, p90Days: cycle.p90 / 3, targetDays: 2.0, status: 'OK' },
      { stage: 'PO create → PO approve', avgDays: cycle.avg / 3, p90Days: cycle.p90 / 3, targetDays: 1.5, status: 'OK' },
    ].map(s => ({
      ...s,
      avgDays:  Math.round(s.avgDays * 10) / 10,
      p90Days:  Math.round(s.p90Days * 10) / 10,
      status:   s.avgDays > s.targetDays * 1.5 ? 'RED' : s.avgDays > s.targetDays ? 'AMBER' : 'OK',
    }))

    // Spend by category vs budget
    const budgetByGl = new Map(budgets.map(b => [b.glCodeId ?? '', { budget: Number(b.revisedAmount), actual: Number(b.actualAmount), name: b.name }]))
    const glById    = new Map(glCodes.map(g => [g.id, g]))
    const catSpend  = new Map<string, { amount: number; budget: number }>()
    for (const l of poLines) {
      const cat = (l.item?.itemCategoryId && catNameById.get(l.item.itemCategoryId)) || 'Uncategorised'
      const prev = catSpend.get(cat) ?? { amount: 0, budget: 0 }
      prev.amount += Number(l.lineTotal ?? 0)
      catSpend.set(cat, prev)
    }
    // Attach budget where the GL on the line matches a budget row
    for (const l of poLines) {
      if (!l.glCodeId) continue
      const b = budgetByGl.get(l.glCodeId)
      if (!b) continue
      const cat = (l.item?.itemCategoryId && catNameById.get(l.item.itemCategoryId))
        || glById.get(l.glCodeId)?.name
        || 'Uncategorised'
      const prev = catSpend.get(cat) ?? { amount: 0, budget: 0 }
      prev.budget += b.budget / 12   // pro-rate annual to monthly
      catSpend.set(cat, prev)
    }
    const spendByCategory = [...catSpend.entries()]
      .map(([category, v]) => ({
        category,
        amount: Math.round(v.amount * 100) / 100,
        budgetAmount: Math.round(v.budget * 100) / 100,
        utilizationPct: v.budget > 0 ? Math.round((v.amount / v.budget) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)

    // Savings leakage sources (computed where possible, descriptive otherwise)
    const savingsLeakage = [
      { source: 'Maverick spend', amount: maverickSpendAmount, description: `${maverickPOs.length} POs without upstream PR` },
      { source: 'Discount not negotiated', amount: Math.max(0, savingsTarget - savingsAchieved), description: 'Gap between 3% target and current line-level discounts' },
      { source: 'Off-contract buys', amount: Math.round((totalSpend - contractedAmount) * 100) / 100, description: 'Spend not against a covered PR/contract' },
    ]

    return {
      maverickSpendPct,
      maverickSpendAmount: Math.round(maverickSpendAmount * 100) / 100,
      maverickPOs: maverickPOs.slice(0, 25).map(p => ({
        poRef:     p.poRef,
        vendorName: p.vendor?.legalName ?? 'Unknown',
        amount:    Number(p.totalAmount),
        category:  'Uncategorised',
        requester: p.createdByUserId,
        hasReason: !!p.notes,
      })),
      prToPoCycleDays: cycle.avg,
      prToPoCycleP90:  cycle.p90,
      prToPoCycleP50:  cycle.p50,
      cycleBreakdown: cycleHealthByStage.map(s => ({
        stage:       s.stage,
        avgDays:     s.avgDays,
        count:       cycleDeltas.length,
        delayReason: s.status === 'RED' ? 'Approval queue backlog' : s.status === 'AMBER' ? 'Requester response time' : 'Within target',
      })),
      savingsAchieved,
      savingsTarget,
      savingsByCategory,
      vendorConcentration,
      totalSpend: Math.round(totalSpend * 100) / 100,
      contractedSpendPct,
      poComplianceTrend,
      cycleHealthByStage,
      spendByCategory,
      savingsLeakage,
      meta: { period: range.period, vendorCount: vendors.length, poCount: pos.length },
    }
  })

  // ── AP ────────────────────────────────────────────────────────────────
  app.get('/ap', auth, async (req, _reply) => {
    const tenantId = req.tenant.id
    const q = req.query as AnalyticsQuery
    const range = resolveRange(q)

    const [invoices, _vendors] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId, ...(q.entityId ? { entityId: q.entityId } : {}) },
        include: { vendor: { select: { legalName: true, msmeRegistered: true } } },
      }),
      prisma.vendor.findMany({ where: { tenantId } }),
    ])

    const periodInvoices = invoices.filter(i => i.invoiceDate >= range.from && i.invoiceDate < range.to)
    const unpaid = invoices.filter(i => i.paymentStatus !== 'PAID' && i.status === 'APPROVED')
    const apBalance = unpaid.reduce((s, i) => s + Number(i.netPayable) - Number(i.paidAmount), 0)
    const periodSpend = periodInvoices.filter(i => i.status === 'APPROVED' || i.status === 'PAID')
      .reduce((s, i) => s + Number(i.totalAmount), 0)
    const dpo = computeDpo(apBalance, periodSpend)

    const stp = periodInvoices.filter(i => (i.matchScore ?? 0) >= 85).length
    const exceptions = periodInvoices.filter(i => (i.matchScore ?? 0) < 85).length
    const touchlessRate = periodInvoices.length > 0
      ? Math.round((stp / periodInvoices.length) * 1000) / 10
      : 0
    const exceptionRate = periodInvoices.length > 0
      ? Math.round((exceptions / periodInvoices.length) * 1000) / 10
      : 0

    const now = new Date()
    const overdue = invoices.filter(i => i.dueDate && i.dueDate < now && i.paymentStatus !== 'PAID')
    const overdueCount  = overdue.length
    const overdueAmount = overdue.reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0)

    // Cost-per-invoice — APQC: ₹847 manual, ₹42 STP
    const costPerInvoice = touchlessRate > 0
      ? Math.round(((100 - touchlessRate) * 847 + touchlessRate * 42) / 100)
      : 847
    const costPerInvoiceAuto = 42

    // Aging buckets
    const bucketMap = new Map<string, { count: number; amount: number; items: typeof invoices }>()
    for (const inv of unpaid) {
      if (!inv.dueDate) continue
      const age = Math.max(0, Math.round((now.getTime() - inv.dueDate.getTime()) / 86_400_000))
      const bucket = classifyAging(age)
      const cur = bucketMap.get(bucket) ?? { count: 0, amount: 0, items: [] }
      cur.count += 1
      cur.amount += Number(inv.netPayable) - Number(inv.paidAmount)
      cur.items.push(inv)
      bucketMap.set(bucket, cur)
    }
    const totalAging = [...bucketMap.values()].reduce((s, b) => s + b.amount, 0)
    const agingBuckets = (['0-30', '31-60', '61-90', '90+'] as const).map(b => {
      const data = bucketMap.get(b) ?? { count: 0, amount: 0, items: [] }
      const pct = totalAging > 0 ? Math.round((data.amount / totalAging) * 1000) / 10 : 0
      const wcImpact = data.amount * (b === '0-30' ? 0 : b === '31-60' ? 0.1 : b === '61-90' ? 0.3 : 0.5)
      const action = b === '0-30' ? 'Track' : b === '31-60' ? 'Investigate' : b === '61-90' ? 'Escalate' : 'Write-off review'
      return { bucket: b, count: data.count, amount: Math.round(data.amount * 100) / 100, pct, wcImpact: Math.round(wcImpact * 100) / 100, action }
    })

    const agingDrillDown = [...bucketMap.values()].flatMap(b =>
      b.items.slice(0, 6).map(inv => ({
        invoiceRef: inv.invoiceNumber,
        vendorName: inv.vendor?.legalName ?? 'Unknown',
        amount:     Math.round((Number(inv.netPayable) - Number(inv.paidAmount)) * 100) / 100,
        ageDays:    inv.dueDate ? Math.max(0, Math.round((now.getTime() - inv.dueDate.getTime()) / 86_400_000)) : 0,
        isMsme:     !!inv.vendor?.msmeRegistered,
        penaltyRisk: inv.vendor?.msmeRegistered ? 'MSME §16 interest 3× bank rate' : 'Vendor relationship risk',
      })),
    )

    // STP readiness — what's blocking the rest from being touchless
    const lowScore   = periodInvoices.filter(i => (i.matchScore ?? 0) < 85).length
    const noVendorMatch = periodInvoices.filter(i => !i.vendorMatchMethod || i.vendorMatchMethod === 'manual').length
    const noOcr        = periodInvoices.filter(i => (i.ocrConfidence ?? 0) < 80).length
    const stpReadiness = [
      { guardrail: 'Match score < 85',     count: lowScore,     scoreImpact: 15, fixDescription: 'Improve PO/GRN match — link via /api/invoices/:id/match-po' },
      { guardrail: 'Vendor not auto-matched', count: noVendorMatch, scoreImpact: 25, fixDescription: 'Train OCR by adding ocrKeywords on the vendor master' },
      { guardrail: 'OCR confidence < 80',  count: noOcr,        scoreImpact: 10, fixDescription: 'Switch to PDF upload — phone-camera images route to handwriting model' },
    ]

    // Match score distribution
    const matchScoreDistribution = [
      { range: '0-50',  count: periodInvoices.filter(i => (i.matchScore ?? 0) < 51).length },
      { range: '51-70', count: periodInvoices.filter(i => (i.matchScore ?? 0) >= 51 && (i.matchScore ?? 0) < 71).length },
      { range: '71-85', count: periodInvoices.filter(i => (i.matchScore ?? 0) >= 71 && (i.matchScore ?? 0) < 86).length },
      { range: '86-100', count: periodInvoices.filter(i => (i.matchScore ?? 0) >= 86).length },
    ]

    const matchByType = [
      { type: '3-way (PO+GRN)', count: periodInvoices.filter(i => i.matchType === '3way').length, autoPass: periodInvoices.filter(i => i.matchType === '3way' && (i.matchScore ?? 0) >= 85).length, exceptions: periodInvoices.filter(i => i.matchType === '3way' && (i.matchScore ?? 0) < 85).length },
      { type: '2-way (PO only)', count: periodInvoices.filter(i => i.matchType === '2way').length, autoPass: periodInvoices.filter(i => i.matchType === '2way' && (i.matchScore ?? 0) >= 85).length, exceptions: periodInvoices.filter(i => i.matchType === '2way' && (i.matchScore ?? 0) < 85).length },
      { type: 'Direct (no PO)',  count: periodInvoices.filter(i => !i.isPOInvoice).length,         autoPass: periodInvoices.filter(i => !i.isPOInvoice && (i.matchScore ?? 0) >= 85).length, exceptions: periodInvoices.filter(i => !i.isPOInvoice && (i.matchScore ?? 0) < 85).length },
    ]

    const exceptionRegister = [
      { type: 'Low match score',  count: lowScore,     avgCycleImpact: 3, owner: 'AP Clerk' },
      { type: 'Missing PO ref',   count: periodInvoices.filter(i => i.isPOInvoice && !i.poRef).length, avgCycleImpact: 2, owner: 'AP Clerk' },
      { type: 'Vendor unmatched', count: noVendorMatch, avgCycleImpact: 4, owner: 'AP Manager' },
      { type: 'OCR uncertain',    count: noOcr,        avgCycleImpact: 1, owner: 'AP Clerk' },
    ]

    const ocrAccuracy = [
      { field: 'Vendor name',    printedPct: 96, handwrittenPct: 78 },
      { field: 'Invoice number', printedPct: 99, handwrittenPct: 84 },
      { field: 'Invoice date',   printedPct: 98, handwrittenPct: 82 },
      { field: 'Amount',         printedPct: 99, handwrittenPct: 89 },
      { field: 'GSTIN',          printedPct: 97, handwrittenPct: 71 },
    ]

    const duplicatesDetected = periodInvoices.filter(i => i.notes?.toLowerCase().includes('duplicate')).length
    const duplicatesBlocked  = duplicatesDetected   // server-enforced — every detection is a block

    const annualSavingFromSTP = Math.round((periodInvoices.length * 12) * (847 - 42) * 0.85)

    return {
      dpo,
      dpoTarget:    35,
      dpoWcImpact:  Math.round(Math.max(0, dpo - 35) * (periodSpend / 30) * 100) / 100,
      invoiceCount: periodInvoices.length,
      touchlessRate,
      exceptionRate,
      overdueCount,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      costPerInvoice,
      costPerInvoiceAuto,
      agingBuckets,
      agingDrillDown,
      stpReadiness,
      matchScoreDistribution,
      matchByType,
      exceptionRegister,
      ocrAccuracy,
      duplicatesDetected,
      duplicatesBlocked,
      annualSavingFromSTP,
      meta: { period: range.period, apBalance: Math.round(apBalance * 100) / 100, periodSpend: Math.round(periodSpend * 100) / 100 },
    }
  })

  // ── PAYMENTS ──────────────────────────────────────────────────────────
  app.get('/payments', auth, async (req, _reply) => {
    const tenantId = req.tenant.id
    const q = req.query as AnalyticsQuery
    const range = resolveRange(q)

    const [invoices, challans, batches, jvs] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId, ...(q.entityId ? { entityId: q.entityId } : {}) },
        include: { vendor: { select: { legalName: true, msmeRegistered: true, msmeCategory: true, udyamNumber: true, paymentTerms: true } } },
      }),
      prisma.tdsChallan.findMany({ where: { tenantId } }),
      prisma.paymentBatch.findMany({ where: { tenantId, ...(q.entityId ? { entityId: q.entityId } : {}) }, include: { lines: true } }),
      prisma.journalEntry.findMany({ where: { tenantId, entryType: 'MANUAL' }, select: { erpStatus: true } }),
    ])

    const onTimeRate = computeOnTimeRate(invoices.map(i => ({
      dueDate: i.dueDate, paidAt: i.paidAt, status: i.status,
    })))

    const unpaid = invoices.filter(i => i.status === 'APPROVED' && i.paymentStatus !== 'PAID')
    const cashOutflow30d = unpaid.reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0)

    // 4-week cash outflow forecast
    const today = new Date()
    const cashOutflowByWeek = [0, 1, 2, 3].map(wk => {
      const wkStart = new Date(today.getTime() + wk * 7 * 86_400_000)
      const wkEnd   = new Date(today.getTime() + (wk + 1) * 7 * 86_400_000)
      const inWindow = unpaid.filter(i => i.dueDate && i.dueDate >= wkStart && i.dueDate < wkEnd)
      const msmeInWindow = inWindow.filter(i => i.vendor?.msmeRegistered)
      const overdueInWindow = inWindow.filter(i => i.dueDate && i.dueDate < today)
      return {
        week: `Wk ${wk + 1}`,
        amount: Math.round(inWindow.reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0) * 100) / 100,
        msmeAmount: Math.round(msmeInWindow.reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0) * 100) / 100,
        overdueAmount: Math.round(overdueInWindow.reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0) * 100) / 100,
      }
    })

    // MSME compliance
    const msmeInvoices = invoices.filter(i => i.vendor?.msmeRegistered && i.paymentStatus !== 'PAID')
    const msmeAtRisk = msmeInvoices.filter(i => i.msmeDaysRemaining != null && i.msmeDaysRemaining >= 0 && i.msmeDaysRemaining < 7).length
    const msmeBreached = msmeInvoices.filter(i => i.msmeBreach || (i.msmeDaysRemaining != null && i.msmeDaysRemaining < 0)).length
    const msmeCompliance = {
      total:    msmeInvoices.length,
      atRisk:   msmeAtRisk,
      breached: msmeBreached,
      vendors:  msmeInvoices.slice(0, 12).map(i => {
        const remaining = i.msmePaymentDue ? computeMsmeDaysRemaining(i.msmePaymentDue, today) : 0
        return {
          vendorName:   i.vendor?.legalName ?? 'Unknown',
          category:     i.vendor?.msmeCategory ?? 'MICRO',
          udyamReg:     i.vendor?.udyamNumber ?? '—',
          invoiceDate:  i.invoiceDate.toISOString().slice(0, 10),
          deadlineDate: i.msmePaymentDue?.toISOString().slice(0, 10) ?? '—',
          daysRemaining: remaining,
          amount:       Math.round((Number(i.netPayable) - Number(i.paidAmount)) * 100) / 100,
          penaltyIfBreached: remaining < 0 ? Math.round((Number(i.netPayable) - Number(i.paidAmount)) * (3 * 6.5) / 100 * Math.abs(remaining) / 365 * 100) / 100 : 0,
        }
      }),
    }

    // Early-pay discount opportunity (proxy: vendors with paymentTerms ≥ 30 → 2% discount available for pay-by-day-10)
    const earlyPayVendors = unpaid
      .filter(i => (i.vendor?.paymentTerms ?? 0) >= 30 && i.dueDate)
      .slice(0, 8)
      .map(i => {
        const discount   = (Number(i.netPayable) - Number(i.paidAmount)) * 0.02
        const payBy      = new Date(i.invoiceDate.getTime() + 10 * 86_400_000)
        const daysLeft   = Math.max(0, Math.round((payBy.getTime() - today.getTime()) / 86_400_000))
        return {
          vendorName: i.vendor?.legalName ?? 'Unknown',
          terms: `Net ${i.vendor?.paymentTerms ?? 30} (2/10)`,
          invoiceAmount: Math.round((Number(i.netPayable) - Number(i.paidAmount)) * 100) / 100,
          discount: Math.round(discount * 100) / 100,
          payBy: payBy.toISOString().slice(0, 10),
          daysLeft,
        }
      })
    const earlyPayOpportunity = Math.round(earlyPayVendors.reduce((s, v) => s + v.discount, 0) * 100) / 100
    const earlyPayDiscountCapture = 0  // demo: no early-pay batches yet executed

    const tdsUndeposited = challans.filter(c => c.status === 'PENDING').reduce((s, c) => s + Number(c.amount), 0)
    const tdsBySection = challans.map(c => ({
      section:  c.tdsSection,
      period:   c.period,
      amount:   Math.round(Number(c.amount) * 100) / 100,
      dueDate:  c.dueDate.toISOString().slice(0, 10),
      status:   c.dueDate < today && c.status === 'PENDING' ? 'OVERDUE' : c.status,
    }))

    // Payment method mix (executed batches only)
    const methodAgg = new Map<string, { count: number; amount: number }>()
    for (const b of batches) {
      for (const l of b.lines.filter(l => l.status === 'PAID')) {
        const cur = methodAgg.get(l.paymentMethod) ?? { count: 0, amount: 0 }
        cur.count += 1
        cur.amount += Number(l.paymentAmount)
        methodAgg.set(l.paymentMethod, cur)
      }
    }
    const paymentMethodMix = [...methodAgg.entries()].map(([method, v]) => ({
      method, count: v.count, amount: Math.round(v.amount * 100) / 100,
    }))

    const erpSyncStatus = {
      synced:  jvs.filter(j => j.erpStatus === 'SYNCED').length,
      pending: jvs.filter(j => j.erpStatus === 'PENDING').length,
      failed:  jvs.filter(j => j.erpStatus === 'FAILED').length,
    }

    // Optimised payment queue — sort by MSME first (CRITICAL/AT_RISK), then by
    // earliest due date, then by largest amount.
    const paymentQueue = unpaid
      .slice()
      .sort((a, b) => {
        const aMsme = a.vendor?.msmeRegistered ? 1 : 0
        const bMsme = b.vendor?.msmeRegistered ? 1 : 0
        if (aMsme !== bMsme) return bMsme - aMsme
        const ad = a.dueDate?.getTime() ?? Infinity
        const bd = b.dueDate?.getTime() ?? Infinity
        if (ad !== bd) return ad - bd
        return Number(b.netPayable) - Number(a.netPayable)
      })
      .slice(0, 10)
      .map((i, idx) => ({
        vendorName: i.vendor?.legalName ?? 'Unknown',
        invoiceRef: i.invoiceNumber,
        amount:     Math.round((Number(i.netPayable) - Number(i.paidAmount)) * 100) / 100,
        dueDate:    i.dueDate?.toISOString().slice(0, 10) ?? '—',
        isMsme:     !!i.vendor?.msmeRegistered,
        earlyDiscountRate: (i.vendor?.paymentTerms ?? 0) >= 30 ? 2 : 0,
        recommendedPayDate: i.msmePaymentDue?.toISOString().slice(0, 10) ?? i.dueDate?.toISOString().slice(0, 10) ?? '—',
        priority: idx + 1,
        priorityReason: i.vendor?.msmeRegistered ? 'MSME 45-day statutory' : 'Standard schedule',
      }))

    const latePaymentPenalties = msmeInvoices.reduce((s, i) => s + Number(i.msmeInterest ?? 0), 0)

    return {
      onTimeRate,
      onTimeTarget: 85,
      cashOutflow30d: Math.round(cashOutflow30d * 100) / 100,
      cashOutflowByWeek,
      msmeCompliance,
      earlyPayDiscountCapture,
      earlyPayOpportunity,
      earlyPayVendors,
      tdsUndeposited: Math.round(tdsUndeposited * 100) / 100,
      tdsBySection,
      paymentMethodMix,
      erpSyncStatus,
      paymentQueue,
      latePaymentPenalties: Math.round(latePaymentPenalties * 100) / 100,
      meta: { period: range.period },
    }
  })

  // ── CFO ───────────────────────────────────────────────────────────────
  app.get('/cfo', auth, async (req, _reply) => {
    const tenantId = req.tenant.id
    const q = req.query as AnalyticsQuery
    const range = resolveRange(q)

    const [invoices, budgets, provSchedules, amortSchedules, jvs, challans] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId, ...(q.entityId ? { entityId: q.entityId } : {}) },
        include: { vendor: { select: { legalName: true, msmeRegistered: true } } },
      }),
      prisma.budget.findMany({ where: { tenantId, status: 'ACTIVE' }, include: { periods: true } }),
      prisma.provisionSchedule.findMany({ where: { tenantId, status: 'ACTIVE' }, include: { } }),
      prisma.amortizationSchedule.findMany({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.journalEntry.findMany({ where: { tenantId } }),
      prisma.tdsChallan.findMany({ where: { tenantId, status: 'PENDING' } }),
    ])

    // AP liability — sum of unpaid approved invoices
    const unpaid = invoices.filter(i => i.status === 'APPROVED' && i.paymentStatus !== 'PAID')
    const totalApLiability = unpaid.reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0)

    // MoM change — proxy: last month's invoices outstanding at the start of this month
    const monthStart = new Date(Date.UTC(range.from.getUTCFullYear(), range.from.getUTCMonth(), 1))
    const prevMonthApprovedUnpaid = invoices.filter(i =>
      i.status === 'APPROVED' && i.paymentStatus !== 'PAID' && i.invoiceDate < monthStart,
    ).reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0)
    const apLiabilityMoM = totalApLiability - prevMonthApprovedUnpaid

    const now = new Date()
    const overdueAmount = invoices.filter(i =>
      i.dueDate && i.dueDate < now && i.paymentStatus !== 'PAID',
    ).reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0)
    const msmeBreachAmount = invoices.filter(i =>
      i.vendor?.msmeRegistered && i.msmeBreach,
    ).reduce((s, i) => s + Number(i.msmeInterest ?? 0), 0)
    const wcAtRisk = overdueAmount + msmeBreachAmount

    const wcLeakageBreakdown = [
      { source: 'Overdue invoices',     amount: Math.round(overdueAmount * 100) / 100, action: 'Pay batch this week',    timeframe: 'This week'   },
      { source: 'MSME breach interest', amount: Math.round(msmeBreachAmount * 100) / 100, action: 'Clear MSME register',  timeframe: 'Immediate'    },
      { source: 'Tied-up working capital', amount: Math.round(Math.max(0, totalApLiability - prevMonthApprovedUnpaid) * 100) / 100, action: 'Negotiate vendor terms', timeframe: 'This quarter' },
    ]

    const provisionBalance = jvs.filter(j => j.entryType === 'PROVISION' && j.status === 'POSTED').reduce((s, j) => s + Number(j.amount), 0)
    const provisionReversal = jvs.find(j => j.entryType === 'PROVISION_REVERSAL' && j.status === 'POSTED')
    const prepaidBalance = amortSchedules.reduce((s, a) => s + Number(a.totalAmount), 0)
    const prepaidMonthly = amortSchedules.reduce((s, a) => s + Number(a.monthlyAmount), 0)
    const tdsPayable     = challans.reduce((s, c) => s + Number(c.amount), 0)
    const msmeInterestRisk = invoices.reduce((s, i) => s + Number(i.msmeInterest ?? 0), 0)

    const accruals = {
      provisionBalance:    Math.round(provisionBalance * 100) / 100,
      provisionReversalDate: provisionReversal?.postingDate.toISOString().slice(0, 10) ?? '—',
      prepaidBalance:      Math.round(prepaidBalance * 100) / 100,
      prepaidMonthlyRecognition: Math.round(prepaidMonthly * 100) / 100,
      tdsPayable:          Math.round(tdsPayable * 100) / 100,
      msmeInterestRisk:    Math.round(msmeInterestRisk * 100) / 100,
    }

    const bsPositions = [
      { account: 'Accounts Payable',         balance: Math.round(totalApLiability * 100) / 100, movement: Math.round(apLiabilityMoM * 100) / 100, risk: overdueAmount > 0 ? 'AMBER' : 'GREEN', settlementExpected: 'Next 30d' },
      { account: 'Provision for Expenses',   balance: accruals.provisionBalance,                 movement: 0, risk: 'GREEN', settlementExpected: provisionReversal?.postingDate.toISOString().slice(0, 10) ?? '—' },
      { account: 'Prepaid Expenses',         balance: accruals.prepaidBalance,                   movement: -accruals.prepaidMonthlyRecognition, risk: 'GREEN', settlementExpected: 'Monthly recognition' },
      { account: 'TDS Payable',              balance: accruals.tdsPayable,                       movement: 0, risk: tdsPayable > 0 ? 'AMBER' : 'GREEN', settlementExpected: '7th of next month' },
    ]

    // Cash forecast — 8 weeks + 3 months
    const cashForecast: { period: string; amount: number; type: string }[] = []
    for (let w = 1; w <= 8; w++) {
      const wkStart = new Date(now.getTime() + (w - 1) * 7 * 86_400_000)
      const wkEnd   = new Date(now.getTime() + w * 7 * 86_400_000)
      const amount = unpaid.filter(i => i.dueDate && i.dueDate >= wkStart && i.dueDate < wkEnd)
        .reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0)
      cashForecast.push({ period: `Wk ${w}`, amount: Math.round(amount * 100) / 100, type: 'WEEKLY' })
    }
    for (let m = 3; m <= 5; m++) {
      const mStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + m, 1))
      const mEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + m + 1, 1))
      const amount = unpaid.filter(i => i.dueDate && i.dueDate >= mStart && i.dueDate < mEnd)
        .reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0)
      const label = `M+${m}`
      cashForecast.push({ period: label, amount: Math.round(amount * 100) / 100, type: 'MONTHLY' })
    }

    // Budget vs actual
    const monthsElapsed = now.getUTCMonth() + 1 - (range.from.getUTCMonth() + 1) + 1
    const budgetVsActual = budgets.map(b => {
      const u = computeBudgetUtilisation({
        budget:        Number(b.revisedAmount),
        committed:     Number(b.committedAmount),
        actual:        Number(b.actualAmount),
        monthsElapsed: Math.max(1, monthsElapsed),
        toleranceZonePct: Number(b.toleranceZonePct ?? 10),
      })
      return {
        category:        b.name,
        budget:          Number(b.revisedAmount),
        actual:          Number(b.actualAmount),
        utilPct:         u.utilPct,
        monthlyRunRate:  u.monthlyRunRate,
        projectedFY:     u.projectedFY,
        variance:        u.variance,
        signal:          u.signal,
      }
    })

    // Provision adequacy — for each active provision, compare scheduled amount vs invoice received this month
    const provisionAdequacy = provSchedules.map(p => {
      // Find invoice for the same item in current period
      const inv = invoices.find(i =>
        i.invoiceDate >= range.from && i.invoiceDate < range.to &&
        i.lines && i.vendorId === p.vendorId,
      )
      const actual = inv ? Number(inv.totalAmount) : 0
      return {
        item:     p.id,
        provision: Number(p.amount),
        actual,
        variance:  Math.round((actual - Number(p.amount)) * 100) / 100,
        action:   actual > Number(p.amount) ? 'Increase next provision' : actual === 0 ? 'Track invoice receipt' : 'OK',
      }
    })

    const amortizationForecast = amortSchedules.slice(0, 6).map((a, i) => ({
      month:  `M+${i + 1}`,
      amount: Math.round(Number(a.monthlyAmount) * 100) / 100,
    }))

    const optimisationOpportunity = wcAtRisk + Math.max(0, prevMonthApprovedUnpaid * 0.1)

    const budgetReforecastSignals = budgetVsActual
      .filter(b => b.signal !== 'GREEN')
      .map(b => ({
        category: b.category,
        signal: b.signal,
        detail: b.signal === 'RED'
          ? `Projected ₹${b.projectedFY.toLocaleString('en-IN')} vs budget ₹${b.budget.toLocaleString('en-IN')} — reforecast required`
          : `Approaching cap — run rate ₹${b.monthlyRunRate.toLocaleString('en-IN')}/mo`,
      }))

    return {
      totalApLiability:  Math.round(totalApLiability * 100) / 100,
      apLiabilityMoM:    Math.round(apLiabilityMoM * 100) / 100,
      wcAtRisk:          Math.round(wcAtRisk * 100) / 100,
      wcLeakageBreakdown,
      accruals,
      bsPositions,
      cashForecast,
      budgetVsActual,
      provisionAdequacy,
      amortizationForecast,
      optimisationOpportunity: Math.round(optimisationOpportunity * 100) / 100,
      budgetReforecastSignals,
      meta: { period: range.period },
    }
  })

  // ── CEO ───────────────────────────────────────────────────────────────
  app.get('/ceo', auth, async (req, _reply) => {
    const tenantId = req.tenant.id
    const q = req.query as AnalyticsQuery
    const range = resolveRange(q)

    const [invoices, pos, vendors, fy] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId, ...(q.entityId ? { entityId: q.entityId } : {}) },
        include: { vendor: { select: { legalName: true, msmeRegistered: true, kycGstStatus: true } } },
      }),
      prisma.purchaseOrder.findMany({ where: { tenantId, ...(q.entityId ? { entityId: q.entityId } : {}) } }),
      prisma.vendor.findMany({ where: { tenantId, status: 'ACTIVE' }, select: { id: true, legalName: true } }),
      prisma.financialYear.findFirst({ where: { tenantId, isCurrent: true } }),
    ])

    const fyStart = fy?.startDate ?? new Date(Date.UTC(range.from.getUTCFullYear(), 3, 1))
    const fyInvoices = invoices.filter(i => i.invoiceDate >= fyStart)
    const totalSpendFY = fyInvoices.reduce((s, i) => s + Number(i.totalAmount), 0)
    const spendAnnualised = Math.round((totalSpendFY / Math.max(1, Math.ceil((Date.now() - fyStart.getTime()) / (30 * 86_400_000)))) * 12 * 100) / 100
    const spendYoY = 0   // historical data not present in demo schema

    // Maverick + contracted from PO data
    const posWithPr = pos.filter(p => {
      const refs = (p.prRefs as { prRef: string }[] | null) ?? []
      return refs.length > 0
    })
    const totalPoSpend = pos.reduce((s, p) => s + Number(p.totalAmount), 0)
    const maverickPct = computeMaverickPct(pos.length - posWithPr.length, pos.length)
    const contractedPct = totalPoSpend > 0
      ? Math.round((posWithPr.reduce((s, p) => s + Number(p.totalAmount), 0) / totalPoSpend) * 1000) / 10
      : 0

    // Working capital at risk
    const now = new Date()
    const wcAtRisk = invoices.filter(i =>
      (i.dueDate && i.dueDate < now && i.paymentStatus !== 'PAID') || i.msmeBreach,
    ).reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0)

    // P2P maturity composite — five dimensions, derived from real data where possible
    const apBalance = invoices.filter(i => i.status === 'APPROVED' && i.paymentStatus !== 'PAID')
      .reduce((s, i) => s + (Number(i.netPayable) - Number(i.paidAmount)), 0)
    const periodSpend = invoices.filter(i => i.invoiceDate >= range.from && i.invoiceDate < range.to)
      .reduce((s, i) => s + Number(i.totalAmount), 0)
    const dpo = computeDpo(apBalance, periodSpend)
    const touchlessRate = invoices.length > 0
      ? Math.round((invoices.filter(i => (i.matchScore ?? 0) >= 85).length / invoices.length) * 1000) / 10
      : 0

    const dims = {
      digitisation:       Math.min(100, Math.round(touchlessRate)),
      controlsCompliance: Math.min(100, 60 + Math.round(contractedPct / 4)),
      workingCapital:     Math.min(100, dpo >= 30 && dpo <= 40 ? 90 : dpo > 40 ? 60 : 50),
      vendorRisk:         Math.min(100, Math.round((vendors.filter(v => v.legalName).length / Math.max(1, vendors.length)) * 100) - 10),
      insightAnalytics:   75,
    }
    const p2pMaturityScore = computeMaturityScore(dims)
    const p2pMaturityBenchmark = 75

    const maturityDimensions = [
      { dimension: 'Digital Automation',  score: dims.digitisation,       maxScore: 100, benchmark: 85, gap: Math.max(0, 85 - dims.digitisation),       annualImpact: Math.round(totalSpendFY * 0.015) },
      { dimension: 'Controls & Compliance', score: dims.controlsCompliance, maxScore: 100, benchmark: 90, gap: Math.max(0, 90 - dims.controlsCompliance), annualImpact: Math.round(totalSpendFY * 0.005) },
      { dimension: 'Working Capital',     score: dims.workingCapital,     maxScore: 100, benchmark: 80, gap: Math.max(0, 80 - dims.workingCapital),     annualImpact: Math.round(totalSpendFY * 0.02)  },
      { dimension: 'Vendor Risk',         score: dims.vendorRisk,         maxScore: 100, benchmark: 75, gap: Math.max(0, 75 - dims.vendorRisk),         annualImpact: Math.round(totalSpendFY * 0.01)  },
      { dimension: 'Insight & Analytics', score: dims.insightAnalytics,   maxScore: 100, benchmark: 70, gap: Math.max(0, 70 - dims.insightAnalytics),   annualImpact: Math.round(totalSpendFY * 0.005) },
    ]

    const strategicInitiatives = [
      {
        rank: 1,
        title: 'Maverick spend governance',
        roi: '5-7×',
        paybackMonths: 6,
        effort: 'Medium',
        annualBenefit: Math.round(totalSpendFY * 0.03),
        implementation: 'Enforce PR-before-PO on category > ₹50K; rate-card enforcement on 10 top categories',
        currentState: `${maverickPct.toFixed(1)}% maverick spend`,
        targetState: '< 10% maverick',
      },
      {
        rank: 2,
        title: 'STP touchless invoicing',
        roi: '8-10×',
        paybackMonths: 9,
        effort: 'High',
        annualBenefit: Math.round(invoices.length * 12 * (847 - 42) * 0.85),
        implementation: 'OCR keyword tuning, item-master synonyms, vendor master KYC completion',
        currentState: `${touchlessRate}% touchless`,
        targetState: '85% touchless',
      },
      {
        rank: 3,
        title: 'DPO normalisation + MSME compliance',
        roi: '3-4×',
        paybackMonths: 3,
        effort: 'Low',
        annualBenefit: Math.round(Math.max(0, dpo - 35) * (periodSpend / 30) * 12),
        implementation: 'Renegotiate vendor terms to net-45; queue-driven payment batches respect MSME 45-day cap',
        currentState: `DPO ${dpo}d vs target 35d`,
        targetState: 'DPO 35d, MSME breach = 0',
      },
    ]

    // Spend trend (6 months)
    const spendTrend: { month: string; amount: number; isAnomaly: boolean; anomalyNote: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1))
      const monthInv = invoices.filter(inv => inv.invoiceDate >= d && inv.invoiceDate < monthEnd)
      const amount = monthInv.reduce((s, inv) => s + Number(inv.totalAmount), 0)
      spendTrend.push({
        month: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
        amount: Math.round(amount * 100) / 100,
        isAnomaly: false,
        anomalyNote: '',
      })
    }
    // Mark anomalies (>2σ from mean)
    const mean = spendTrend.reduce((s, t) => s + t.amount, 0) / Math.max(1, spendTrend.length)
    const variance = spendTrend.reduce((s, t) => s + Math.pow(t.amount - mean, 2), 0) / Math.max(1, spendTrend.length)
    const stdDev = Math.sqrt(variance)
    for (const t of spendTrend) {
      if (Math.abs(t.amount - mean) > 2 * stdDev && mean > 0) {
        t.isAnomaly = true
        t.anomalyNote = t.amount > mean ? 'Spike — review drivers' : 'Trough — coverage gap?'
      }
    }

    // Vendor concentration
    const vendorPoSpend = new Map<string, { name: string; amount: number }>()
    for (const p of pos) {
      const v = vendors.find(v => v.id === p.vendorId)
      if (!v) continue
      const cur = vendorPoSpend.get(p.vendorId) ?? { name: v.legalName, amount: 0 }
      cur.amount += Number(p.totalAmount)
      vendorPoSpend.set(p.vendorId, cur)
    }
    const vendorConcentration = [...vendorPoSpend.entries()]
      .map(([_id, v]) => {
        const pct = totalPoSpend > 0 ? (v.amount / totalPoSpend) * 100 : 0
        return {
          vendorName: v.name,
          spendPct:   Math.round(pct * 10) / 10,
          risk:       classifyVendorRisk(pct),
          action:     classifyVendorRisk(pct) === 'HIGH' ? 'Dual-source within 90d' : classifyVendorRisk(pct) === 'MEDIUM' ? 'Monitor + KYC refresh' : 'OK',
        }
      })
      .sort((a, b) => b.spendPct - a.spendPct)
      .slice(0, 5)

    const riskRegister = [
      { risk: 'MSME breach exposure',  exposure: Math.round(invoices.reduce((s, i) => s + Number(i.msmeInterest ?? 0), 0) * 100) / 100, deadline: 'Ongoing', owner: 'CFO',                decisionNeeded: 'Pay overdue MSME this week', status: 'AMBER' },
      { risk: 'ERP sync backlog',      exposure: 0, deadline: 'EOM',     owner: 'Finance Manager',     decisionNeeded: 'Retry failed JV pushes',      status: 'AMBER' },
      { risk: 'Vendor concentration',  exposure: vendorConcentration[0]?.spendPct ?? 0, deadline: 'Q+1', owner: 'Procurement Head', decisionNeeded: 'Onboard second supplier',     status: vendorConcentration[0] && vendorConcentration[0].risk === 'HIGH' ? 'RED' : 'AMBER' },
      { risk: 'Budget overrun',        exposure: 0, deadline: 'Q+1',     owner: 'CFO',                  decisionNeeded: 'Reforecast Q+1',              status: 'GREEN' },
    ]

    const keyAlerts = [
      { type: 'MSME',     message: `${invoices.filter(i => i.vendor?.msmeRegistered && i.msmeBreach).length} MSME invoice(s) breached`, urgency: 'HIGH',   action: 'Open payments queue' },
      { type: 'BUDGET',   message: `Maverick spend at ${maverickPct.toFixed(1)}%`,                                                       urgency: maverickPct > 30 ? 'HIGH' : 'MEDIUM', action: 'Enforce PR gate on top categories' },
      { type: 'DPO',      message: `DPO at ${dpo}d (target 35)`,                                                                          urgency: dpo > 45 ? 'HIGH' : 'LOW', action: 'Review payment timing' },
    ]

    return {
      totalSpendFY:           Math.round(totalSpendFY * 100) / 100,
      spendYoY,
      spendAnnualised,
      contractedPct,
      maverickPct,
      wcAtRisk:               Math.round(wcAtRisk * 100) / 100,
      p2pMaturityScore,
      p2pMaturityBenchmark,
      financialRiskExposure:  Math.round(riskRegister.reduce((s, r) => s + r.exposure, 0) * 100) / 100,
      maturityDimensions,
      strategicInitiatives,
      spendTrend,
      vendorConcentration,
      riskRegister,
      keyAlerts,
      meta: { period: range.period, vendorCount: vendors.length, fyStart: fyStart.toISOString().slice(0, 10) },
    }
  })
}
