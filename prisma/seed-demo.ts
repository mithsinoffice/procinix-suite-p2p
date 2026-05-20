/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
// Demo seed — complete end-to-end transactional data on top of the base masters
// from prisma/seed.ts. Run with:
//
//   npx tsx prisma/seed-demo.ts
//
// Idempotent: every transactional row keys off a stable demo ref
// (PR-2026-001, PO-2026-001, INV-… etc), so re-runs skip what exists. The
// script logs ✓ / ✗ per step and never aborts on a single failure — it
// completes as much as possible and prints a summary.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  startWorkflow,
  approveStage,
} from '../server/src/services/workflow-engine.service.js'
import { triggerOnInvoiceApproval, resolveApGlCodeFromList } from '../server/src/services/accounting-trigger.service.js'
import { runMonthEnd } from '../server/src/jobs/month-end.job.js'
import {
  buildPaymentJVs,
  computeMsmePaymentDue,
  computeMsmeDaysRemaining,
  getMsmePriority,
  computeBatchTotals,
  type PaymentGLCodes,
} from '../server/src/services/payment-engine.service.js'
import { groupLinesByTdsSection, upsertChallans } from '../server/src/services/tds-challan.service.js'

const prisma = new PrismaClient()

// ── Summary tracker ─────────────────────────────────────────────────────────
const summary: Record<string, string> = {}
const errors: { step: string; msg: string }[] = []

function ok(step: string, msg: string) {
  console.log(`✓ ${step} — ${msg}`)
  summary[step] = msg
}
function fail(step: string, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  console.error(`✗ ${step} — ${msg}`)
  errors.push({ step, msg })
  summary[step] = `FAILED: ${msg}`
}
async function step<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const out = await fn()
    return out
  } catch (e) {
    fail(name, e)
    return null
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function d(s: string): Date {
  // YYYY-MM-DD UTC
  const [y, m, day] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Build invoice line totals — single-rate intrastate (CGST/SGST split).
function lineTotals(qty: number, rate: number, gstRate: number, tdsRate = 0) {
  const taxable = round2(qty * rate)
  const cgst = round2((taxable * gstRate) / 200)
  const sgst = cgst
  const igst = 0
  const tds = round2((taxable * tdsRate) / 100)
  const lineTotal = round2(taxable + cgst + sgst)
  return { taxable, cgst, sgst, igst, tds, lineTotal }
}

// ── Engine wrapper — start + walk through approvals until APPROVED ─────────
async function runWorkflowToCompletion(
  module: any,
  entityType: string,
  entityId: string,
  record: Record<string, unknown>,
  ctx: { tenantId: string; userId: string; userName: string },
): Promise<{ instanceId: string | null; autoApproved: boolean; finalApproved: boolean }> {
  const wf = await startWorkflow(prisma, module, entityType, entityId, record, ctx)
  if (!wf.ok) {
    if (wf.error.message === 'NO_WORKFLOW_DEFINED') {
      return { instanceId: null, autoApproved: false, finalApproved: true } // treat as auto-approve
    }
    throw new Error(`startWorkflow: ${wf.error.message}`)
  }
  if (wf.data.autoApproved) {
    return { instanceId: wf.data.instanceId, autoApproved: true, finalApproved: true }
  }
  // Walk approvals — call approveStage repeatedly until APPROVED
  let guard = 0
  while (guard++ < 10) {
    const inst = await prisma.workflowInstance.findFirst({ where: { id: wf.data.instanceId }, select: { status: true } })
    if (!inst) break
    if (inst.status === 'APPROVED') break
    if (inst.status !== 'IN_PROGRESS') break
    const r = await approveStage(prisma, wf.data.instanceId, 'Demo seed — auto-approved by seed script', ctx)
    if (!r.ok) throw new Error(`approveStage: ${r.error.message}`)
    if (r.data.finalStatus === 'APPROVED') break
  }
  return { instanceId: wf.data.instanceId, autoApproved: false, finalApproved: true }
}

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════════')
  console.log(' Procinix v2 — DEMO SEED  (transactional end-to-end data)')
  console.log('══════════════════════════════════════════════════════════════════\n')

  // ── Look up tenant + admin ──────────────────────────────────────────────
  const tenant = await prisma.tenant.findFirst({ where: { code: 'procinix-demo' } })
  if (!tenant) throw new Error('Base seed not run — `npm run db:seed` first to create the procinix-demo tenant.')
  const tenantId = tenant.id
  const adminUserRaw = await prisma.user.findFirst({ where: { tenantId, email: 'mithilesh@procinix.ai' } })
  if (!adminUserRaw) throw new Error('Admin user mithilesh@procinix.ai missing — re-run base seed.')
  const adminUser: NonNullable<typeof adminUserRaw> = adminUserRaw
  const ctx = { tenantId, userId: adminUser.id, userName: adminUser.name }

  // ── Pre-step: top up users + vendors so verification thresholds pass ────
  await step('Pre-step (a) extra users (Finance Manager + AP Clerk)', async () => {
    const hash = await bcrypt.hash('Demo@123', 12)
    const extras = [
      { email: 'finance.manager@procinix.ai', name: 'Priya Sharma', role: 'FINANCE_MANAGER' as const },
      { email: 'ap.clerk@procinix.ai',        name: 'Raj Verma',     role: 'AP_CLERK' as const },
      { email: 'cfo@procinix.ai',             name: 'Anita Desai',   role: 'CFO' as const },
    ]
    for (const u of extras) {
      await prisma.user.upsert({
        where:  { tenantId_email: { tenantId, email: u.email } },
        update: { name: u.name, role: u.role, isActive: true, status: 'ACTIVE' },
        create: { tenantId, email: u.email, passwordHash: hash, name: u.name, role: u.role, isActive: true, status: 'ACTIVE' },
      })
    }
    ok('Pre-step users', `+${extras.length} users (Finance Manager, AP Clerk, CFO)`)
    return extras.length
  })

  // ── Pre-step (b) top up vendors to 10 ──────────────────────────────────
  await step('Pre-step (b) extra vendors (top up to ≥10)', async () => {
    const entity = await prisma.entity.findFirst({ where: { tenantId, code: 'PTPL' } })
    if (!entity) throw new Error('PTPL entity missing')
    const gls = await prisma.glCode.findMany({ where: { tenantId } })
    const glIdByCode = (code: string) => gls.find(g => g.code === code)?.id ?? null

    const t194C = await prisma.tDSSection.findFirst({ where: { tenantId, code: '194C' } })
    const t194J = await prisma.tDSSection.findFirst({ where: { tenantId, code: '194J' } })
    const t194I = await prisma.tDSSection.findFirst({ where: { tenantId, code: '194IA' } })

    const extra: any[] = [
      {
        vendorCode: 'VND-0006', legalName: 'TCS Cloud Services India Private Limited', tradeName: 'TCS Cloud',
        vendorType: 'SERVICE_PROVIDER', panEntityType: 'COMPANY',
        pan: 'AABCT1234R', gstin: '27AABCT1234R1ZK', cin: 'U72200MH2003PLC139800',
        tdsApplicable: true, tdsSectionId: t194J?.id, tdsRate: 10,
        kycPanStatus: 'VALID', kycPanName: 'TCS CLOUD SERVICES INDIA PVT LTD',
        kycGstStatus: 'VALID', kycGstName: 'TCS CLOUD SERVICES INDIA PVT LTD',
        gstComplianceScore: 90, gstReturnRisk: 'LOW_RISK',
        addressLine1: 'Olympus, Hiranandani Estate, Powai', city: 'Mumbai', stateCode: 'MH', pincode: '400076',
        contactName: 'Karan Bhatia', email: 'ap@tcs.com', mobile: '9821067890',
        paymentTerms: 30, paymentCurrency: 'INR', paymentMode: 'NEFT', status: 'ACTIVE',
        gstReg: { stateCode: 'MH', gstin: '27AABCT1234R1ZK' }, bankGl: '5001', bankAcc: { accountNo: '00112345678901', ifsc: 'HDFC0000123', bankName: 'HDFC Bank', branch: 'Powai' },
        creditLimit: 8000000,
      },
      {
        vendorCode: 'VND-0007', legalName: 'Sodexo Facility Management Services Pvt Ltd', tradeName: 'Sodexo Facilities',
        vendorType: 'SERVICE_PROVIDER', panEntityType: 'COMPANY',
        pan: 'AAACS6543M', gstin: '27AAACS6543M1ZN', cin: 'U93000MH2009PTC198761',
        tdsApplicable: true, tdsSectionId: t194C?.id, tdsRate: 2,
        kycPanStatus: 'VALID', kycPanName: 'SODEXO FACILITY MANAGEMENT SERVICES PVT LTD',
        kycGstStatus: 'VALID', gstComplianceScore: 86, gstReturnRisk: 'LOW_RISK',
        addressLine1: 'Andheri East', city: 'Mumbai', stateCode: 'MH', pincode: '400069',
        contactName: 'Pooja Iyer', email: 'billing.in@sodexo.com', mobile: '9819045678',
        paymentTerms: 30, paymentMode: 'NEFT', status: 'ACTIVE',
        gstReg: { stateCode: 'MH', gstin: '27AAACS6543M1ZN' }, bankGl: '5021', bankAcc: { accountNo: '50100098761234', ifsc: 'HDFC0000456', bankName: 'HDFC Bank', branch: 'Andheri' },
        creditLimit: 3000000,
      },
      {
        vendorCode: 'VND-0008', legalName: 'Spectrum Talent Management Pvt Ltd', tradeName: 'Spectrum Talent',
        vendorType: 'SERVICE_PROVIDER', panEntityType: 'COMPANY',
        pan: 'AABCS8901E', gstin: '07AABCS8901E1ZG', cin: 'U74140DL2005PTC139988',
        tdsApplicable: true, tdsSectionId: t194J?.id, tdsRate: 10,
        kycPanStatus: 'VALID', kycGstStatus: 'VALID', gstComplianceScore: 82, gstReturnRisk: 'LOW_RISK',
        addressLine1: 'Sector 18, Noida', city: 'Noida', stateCode: 'DL', pincode: '110092',
        contactName: 'Anjali Bhardwaj', email: 'invoice@spectrumtalent.com', mobile: '9810023456',
        paymentTerms: 30, paymentMode: 'NEFT', status: 'ACTIVE',
        gstReg: { stateCode: 'DL', gstin: '07AABCS8901E1ZG' }, bankGl: '5051', bankAcc: { accountNo: '001234500098765', ifsc: 'ICIC0001234', bankName: 'ICICI Bank', branch: 'Connaught Place' },
        creditLimit: 1500000,
        msme: true, msmeCategory: 'SMALL', udyamNumber: 'UDYAM-DL-08-0098765',
      },
      {
        vendorCode: 'VND-0009', legalName: 'Bharti Airtel Limited', tradeName: 'Airtel Business',
        vendorType: 'SERVICE_PROVIDER', panEntityType: 'COMPANY',
        pan: 'AAACB2894G', gstin: '07AAACB2894G1ZJ', cin: 'L74899DL1995PLC070609',
        tdsApplicable: false,
        kycPanStatus: 'VALID', kycGstStatus: 'VALID', gstComplianceScore: 96, gstReturnRisk: 'LOW_RISK',
        addressLine1: 'Bharti Crescent, Nelson Mandela Road, Vasant Kunj', city: 'New Delhi', stateCode: 'DL', pincode: '110070',
        contactName: 'Rohit Mehra', email: 'corp.billing@airtel.com', mobile: '9818012345',
        paymentTerms: 15, paymentMode: 'NEFT', status: 'ACTIVE',
        gstReg: { stateCode: 'DL', gstin: '07AAACB2894G1ZJ' }, bankGl: '5012', bankAcc: { accountNo: '00770010202020', ifsc: 'HDFC0000099', bankName: 'HDFC Bank', branch: 'Vasant Kunj' },
        creditLimit: 5000000,
      },
      {
        vendorCode: 'VND-0010', legalName: 'Quick Heal Technologies Limited', tradeName: 'Quick Heal',
        vendorType: 'SERVICE_PROVIDER', panEntityType: 'COMPANY',
        pan: 'AABCQ1357H', gstin: '27AABCQ1357H1ZD', cin: 'L72200MH1995PLC091408',
        tdsApplicable: true, tdsSectionId: t194J?.id, tdsRate: 10,
        kycPanStatus: 'VALID', kycGstStatus: 'VALID', gstComplianceScore: 87, gstReturnRisk: 'LOW_RISK',
        addressLine1: 'Plot 7, Phase 3, Hinjewadi', city: 'Pune', stateCode: 'MH', pincode: '411057',
        contactName: 'Nikhil Joshi', email: 'enterprise@quickheal.com', mobile: '9822087654',
        paymentTerms: 30, paymentMode: 'NEFT', status: 'ACTIVE',
        gstReg: { stateCode: 'MH', gstin: '27AABCQ1357H1ZD' }, bankGl: '5001', bankAcc: { accountNo: '50100078945612', ifsc: 'AXIS0001234', bankName: 'Axis Bank', branch: 'Hinjewadi' },
        creditLimit: 2500000,
      },
    ]

    let created = 0
    for (const v of extra) {
      const existing = await prisma.vendor.findFirst({ where: { tenantId, vendorCode: v.vendorCode } })
      if (existing) continue
      const { gstReg, bankAcc, bankGl, creditLimit, msme, msmeCategory, udyamNumber, ...vendorData } = v
      const vendor = await prisma.vendor.create({
        data: {
          ...vendorData, tenantId,
          msmeRegistered: !!msme, msmeCategory: msme ? msmeCategory : null, udyamNumber: msme ? udyamNumber : null,
        } as any,
      })
      await prisma.vendorGstRegistration.create({ data: { vendorId: vendor.id, ...gstReg, registrationType: 'REGULAR', isPrimary: true, kycStatus: 'VALID', status: 'ACTIVE' } })
      await prisma.vendorBankAccount.create({ data: { vendorId: vendor.id, ...bankAcc, accountType: 'CURRENT', currencyCode: 'INR', accountHolderName: v.legalName, isPrimary: true, kycStatus: 'VALID', status: 'ACTIVE' } })
      await prisma.vendorEntityMapping.create({
        data: {
          vendorId: vendor.id, entityId: entity.id, glCodeId: glIdByCode(bankGl),
          currencyCode: 'INR', creditLimit, paymentTermsDays: v.paymentTerms ?? 30, paymentMode: v.paymentMode ?? 'NEFT',
          isActive: true,
        },
      })
      created++
    }
    ok('Pre-step vendors', `+${created} new vendors (VND-0006…0010)`)
    return created
  })

  // ── STEP 1 — Verify masters ──────────────────────────────────────────────
  const counts: Record<string, number> = {}
  await step('Step 1 — Verify masters', async () => {
    counts.vendors      = await prisma.vendor.count({ where: { tenantId, status: 'ACTIVE' } })
    counts.items        = await prisma.itemMaster.count({ where: { tenantId, status: 'ACTIVE' } })
    counts.glCodes      = await prisma.glCode.count({ where: { tenantId, status: 'ACTIVE' } })
    counts.costCentres  = await prisma.costCentre.count({ where: { tenantId, status: 'ACTIVE' } })
    counts.departments  = await prisma.department.count({ where: { tenantId, status: 'ACTIVE' } })
    counts.locations    = await prisma.location.count({ where: { tenantId, status: 'ACTIVE' } })
    counts.users        = await prisma.user.count({ where: { tenantId, isActive: true } })
    const wfDefs = await prisma.workflowDefinition.findMany({ where: { tenantId, status: 'ACTIVE' }, select: { code: true } })
    counts.workflowDefs = wfDefs.length
    const wfHas = (code: string) => wfDefs.some(w => w.code === code)

    const missing: string[] = []
    if (counts.vendors     < 10) missing.push(`vendors=${counts.vendors} (<10)`)
    if (counts.items       < 10) missing.push(`items=${counts.items} (<10)`)
    if (counts.glCodes     < 50) missing.push(`glCodes=${counts.glCodes} (<50)`)
    if (counts.costCentres < 5)  missing.push(`costCentres=${counts.costCentres} (<5)`)
    if (counts.departments < 5)  missing.push(`departments=${counts.departments} (<5)`)
    if (counts.locations   < 5)  missing.push(`locations=${counts.locations} (<5)`)
    if (counts.users       < 3)  missing.push(`users=${counts.users} (<3)`)
    const wfMissing: string[] = []
    for (const code of ['WF-PR-001', 'INV-STD-LOW', 'WF-PAYMENT-001']) {
      if (!wfHas(code)) wfMissing.push(code)
    }
    if (wfMissing.length) missing.push(`workflow defs missing: ${wfMissing.join(',')}`)

    if (missing.length) throw new Error(`Master prerequisites unmet: ${missing.join('; ')}`)
    ok('Step 1', `verified — vendors=${counts.vendors}, items=${counts.items}, GL=${counts.glCodes}, CC=${counts.costCentres}, dept=${counts.departments}, loc=${counts.locations}, users=${counts.users}, workflows=${counts.workflowDefs}`)
    return counts
  })

  // ── Cache common lookups ────────────────────────────────────────────────
  const entity = (await prisma.entity.findFirst({ where: { tenantId, code: 'PTPL' } }))!
  const allVendors  = await prisma.vendor.findMany({ where: { tenantId }, orderBy: { vendorCode: 'asc' } })
  const allItems    = await prisma.itemMaster.findMany({ where: { tenantId }, orderBy: { itemCode: 'asc' } })
  const allGls      = await prisma.glCode.findMany({ where: { tenantId } })
  const allCcs      = await prisma.costCentre.findMany({ where: { tenantId } })
  const allDepts    = await prisma.department.findMany({ where: { tenantId } })
  const allLocs     = await prisma.location.findMany({ where: { tenantId } })
  const tdsSections = await prisma.tDSSection.findMany({ where: { tenantId } })

  const vendorByCode = (code: string) => allVendors.find(v => v.vendorCode === code)!
  const itemByCode   = (code: string) => allItems.find(i => i.itemCode === code)!
  const glByCode     = (code: string) => allGls.find(g => g.code === code)!
  const ccByCode     = (code: string) => allCcs.find(c => c.code === code)!
  const deptByCode   = (code: string) => allDepts.find(d => d.code === code)!
  const locByCode    = (code: string) => allLocs.find(l => l.code === code)!
  const tdsByCode    = (code: string) => tdsSections.find(t => t.code === code)!

  // ── STEP 2 — Mark 3 vendors MSME ────────────────────────────────────────
  let msmeCount = 0
  await step('Step 2 — Mark MSME vendors', async () => {
    const msmeUpdates = [
      { vendorCode: 'VND-0002', msmeCategory: 'MICRO',  udyamNumber: 'UDYAM-MH-19-0001234' }, // G4S → MICRO
      { vendorCode: 'VND-0007', msmeCategory: 'SMALL',  udyamNumber: 'UDYAM-MH-15-0023456' }, // Sodexo Facilities → SMALL
      { vendorCode: 'VND-0008', msmeCategory: 'MEDIUM', udyamNumber: 'UDYAM-DL-08-0098765' }, // Spectrum Talent → MEDIUM (already set)
    ]
    for (const u of msmeUpdates) {
      const v = vendorByCode(u.vendorCode)
      await prisma.vendor.update({
        where: { id: v.id },
        data: { msmeRegistered: true, msmeCategory: u.msmeCategory, udyamNumber: u.udyamNumber, kycMsmeStatus: 'VALID', kycMsmeCategory: u.msmeCategory },
      })
      msmeCount++
    }
    ok('Step 2', `${msmeCount} vendors flagged MSME (G4S Security=MICRO, Sodexo=SMALL, Spectrum Talent=MEDIUM)`)
    return msmeCount
  })

  // Re-load vendors to pick up MSME flags
  const vendors = await prisma.vendor.findMany({ where: { tenantId }, orderBy: { vendorCode: 'asc' } })
  const v = (code: string) => vendors.find(x => x.vendorCode === code)!

  // ── STEP 3 — Purchase Requisitions (10) ─────────────────────────────────
  const prResults: { ref: string; id: string; status: string }[] = []
  await step('Step 3 — Purchase Requisitions', async () => {
    const prSpecs = [
      // Approved 1-8
      { ref: 'PR-2026-001', vendor: 'VND-0001', deptCode: 'IT',    locCode: 'LOC-MUM-HO',  ccCode: 'CC-IT',    priority: 'NORMAL', narration: 'Annual CBS license renewal (Q1 FY26)',
        lines: [{ itemCode: 'ITM-0001', qty: 1,   rate: 250000 }] },
      { ref: 'PR-2026-002', vendor: 'VND-0005', deptCode: 'IT',    locCode: 'LOC-MUM-HO',  ccCode: 'CC-IT',    priority: 'NORMAL', narration: 'AWS Mumbai region — quarterly hosting',
        lines: [{ itemCode: 'ITM-0003', qty: 3,   rate: 60000 }] },
      { ref: 'PR-2026-003', vendor: 'VND-0002', deptCode: 'OPS',   locCode: 'LOC-MUM-BKC', ccCode: 'CC-OPS',   priority: 'HIGH',   narration: 'Security guards — Mumbai BKC office (Apr–Jun 2026)',
        lines: [{ itemCode: 'ITM-0007', qty: 1,   rate: 180000 }] },
      { ref: 'PR-2026-004', vendor: 'VND-0007', deptCode: 'ADMIN', locCode: 'LOC-MUM-HO',  ccCode: 'CC-CORP',  priority: 'NORMAL', narration: 'Housekeeping & facility services — HO (monthly)',
        lines: [{ itemCode: 'ITM-0008', qty: 1,   rate: 95000 }] },
      { ref: 'PR-2026-005', vendor: 'VND-0006', deptCode: 'IT',    locCode: 'LOC-BLR-HO',  ccCode: 'CC-TECH',  priority: 'NORMAL', narration: 'TCS implementation support — Q1 retainer',
        lines: [{ itemCode: 'ITM-0006', qty: 1,   rate: 200000 }] },
      { ref: 'PR-2026-006', vendor: 'VND-0001', deptCode: 'IT',    locCode: 'LOC-MUM-HO',  ccCode: 'CC-IT',    priority: 'NORMAL', narration: '20 Dell laptops for new joiners',
        lines: [{ itemCode: 'ITM-0021', qty: 20, rate: 65000 }] },
      { ref: 'PR-2026-007', vendor: 'VND-0010', deptCode: 'IT',    locCode: 'LOC-MUM-HO',  ccCode: 'CC-IT',    priority: 'HIGH',   narration: 'Quick Heal Total Security — 500 user licenses',
        lines: [{ itemCode: 'ITM-0001', qty: 500, rate: 800 }] },
      { ref: 'PR-2026-008', vendor: 'VND-0009', deptCode: 'IT',    locCode: 'LOC-MUM-HO',  ccCode: 'CC-IT',    priority: 'NORMAL', narration: 'Airtel leased line — Mumbai HO (annual)',
        lines: [{ itemCode: 'ITM-0013', qty: 12, rate: 18000 }] },
      // Pending
      { ref: 'PR-2026-009', vendor: 'VND-0003', deptCode: 'LEGAL', locCode: 'LOC-MUM-HO',  ccCode: 'CC-LEGAL', priority: 'HIGH',   narration: 'Crawford Bayley — retainer for Q1 FY26',
        lines: [{ itemCode: 'ITM-0004', qty: 1, rate: 150000 }] },
      // Draft
      { ref: 'PR-2026-010', vendor: 'VND-0004', deptCode: 'ADMIN', locCode: 'LOC-MUM-HO',  ccCode: 'CC-CORP',  priority: 'URGENT', narration: 'Office rent — Mumbai HO (Q1 FY26 quarterly)',
        lines: [{ itemCode: 'ITM-0009', qty: 3, rate: 250000 }] },
    ]

    let created = 0
    for (let i = 0; i < prSpecs.length; i++) {
      const spec = prSpecs[i]
      const existing = await prisma.purchaseRequisition.findFirst({ where: { tenantId, prRef: spec.ref } })
      if (existing) {
        prResults.push({ ref: spec.ref, id: existing.id, status: existing.status })
        continue
      }
      const dept = deptByCode(spec.deptCode)
      const loc  = locByCode(spec.locCode)
      const cc   = ccByCode(spec.ccCode)
      const estTotal = spec.lines.reduce((s, l) => s + l.qty * l.rate, 0)
      const tdsSec = tdsByCode('194C')

      const pr = await prisma.purchaseRequisition.create({
        data: {
          tenantId, prRef: spec.ref, prType: 'STANDARD',
          requestedBy: adminUser.id, entityId: entity.id,
          departmentId: dept.id,
          requiredBy: d('2026-06-30'), justification: spec.narration,
          priority: spec.priority, estimatedTotal: estTotal, currencyCode: 'INR',
          createdByUserId: adminUser.id, status: 'DRAFT',
        },
      })
      const items = spec.lines.map((l, idx) => {
        const item = itemByCode(l.itemCode)
        return {
          prId: pr.id, lineNo: idx + 1, itemId: item.id,
          description: item.name, qty: l.qty,
          uom: item.uom ?? 'NOS', estimatedPrice: l.rate,
          deliveryLocation: loc.name, requiredBy: d('2026-06-30'),
          glCodeId: null, costCentreId: cc.id,
        }
      })
      await prisma.purchaseRequisitionLine.createMany({ data: items })

      // Decide flow based on index
      if (i < 8) {
        // PR-001..008: full workflow → APPROVED
        try {
          const wfRes = await runWorkflowToCompletion(
            'PR', 'purchase_requisition', pr.id,
            { totalAmount: estTotal, entityId: entity.id, vendorId: v(spec.vendor).id, createdByUserId: adminUser.id, departmentId: dept.id, isPOInvoice: false },
            ctx,
          )
          await prisma.purchaseRequisition.update({
            where: { id: pr.id },
            data: { status: 'APPROVED', workflowInstanceId: wfRes.instanceId ?? undefined },
          })
          prResults.push({ ref: spec.ref, id: pr.id, status: 'APPROVED' })
        } catch (e) {
          // Workflow failed — flip to APPROVED anyway so downstream POs can link
          console.warn(`[PR ${spec.ref}] workflow failed: ${(e as Error).message} — forcing APPROVED`)
          await prisma.purchaseRequisition.update({ where: { id: pr.id }, data: { status: 'APPROVED' } })
          prResults.push({ ref: spec.ref, id: pr.id, status: 'APPROVED' })
        }
      } else if (i === 8) {
        // PR-009: submitted, awaiting (PENDING_APPROVAL)
        try {
          const wfRes = await runWorkflowToCompletion(
            'PR', 'purchase_requisition', pr.id,
            { totalAmount: estTotal, entityId: entity.id, vendorId: v(spec.vendor).id, createdByUserId: adminUser.id, departmentId: dept.id, isPOInvoice: false },
            ctx,
          )
          // Don't finish the walk — start a fresh workflow that stays pending
          // Override: revert to PENDING_L1
          if (wfRes.instanceId) {
            await prisma.workflowInstance.update({ where: { id: wfRes.instanceId }, data: { status: 'IN_PROGRESS', completedAt: null, currentStageOrder: 1 } })
            const stages = await prisma.workflowInstanceStage.findMany({ where: { instanceId: wfRes.instanceId }, orderBy: { stageOrder: 'asc' } })
            for (const s of stages) {
              await prisma.workflowInstanceStage.update({
                where: { id: s.id },
                data: { status: 'PENDING', actionAt: null, actionBy: null, comments: null },
              })
            }
          }
          await prisma.purchaseRequisition.update({
            where: { id: pr.id },
            data: { status: 'PENDING_L1', workflowInstanceId: wfRes.instanceId ?? undefined },
          })
          prResults.push({ ref: spec.ref, id: pr.id, status: 'PENDING_L1' })
        } catch (e) {
          await prisma.purchaseRequisition.update({ where: { id: pr.id }, data: { status: 'PENDING_L1' } })
          prResults.push({ ref: spec.ref, id: pr.id, status: 'PENDING_L1' })
        }
      } else {
        // PR-010: stays DRAFT
        prResults.push({ ref: spec.ref, id: pr.id, status: 'DRAFT' })
      }
      created++
      console.log(`  ✓ ${spec.ref} (${spec.priority}, ₹${estTotal.toLocaleString('en-IN')}) — ${i < 8 ? 'APPROVED' : i === 8 ? 'PENDING' : 'DRAFT'}`)
    }
    ok('Step 3', `${created}/10 PRs created (${prResults.filter(p => p.status === 'APPROVED').length} approved, ${prResults.filter(p => p.status === 'PENDING_L1').length} pending, ${prResults.filter(p => p.status === 'DRAFT').length} draft)`)
    return prResults.length
  })

  // ── STEP 4 — Purchase Orders (15) ───────────────────────────────────────
  const poResults: { ref: string; id: string; vendorId: string; total: number }[] = []
  await step('Step 4 — Purchase Orders', async () => {
    type PoSpec = { ref: string; prRef?: string; vendor: string; lines: { itemCode: string; qty: number; rate: number; tdsRate?: number }[]; paymentTerms: number }
    const poSpecs: PoSpec[] = [
      // 5 POs from approved PRs
      { ref: 'PO-2026-001', prRef: 'PR-2026-001', vendor: 'VND-0001', paymentTerms: 30, lines: [{ itemCode: 'ITM-0001', qty: 1, rate: 250000, tdsRate: 10 }] },
      { ref: 'PO-2026-002', prRef: 'PR-2026-002', vendor: 'VND-0005', paymentTerms: 30, lines: [{ itemCode: 'ITM-0003', qty: 3, rate: 60000, tdsRate: 10 }] },
      { ref: 'PO-2026-003', prRef: 'PR-2026-003', vendor: 'VND-0002', paymentTerms: 30, lines: [{ itemCode: 'ITM-0007', qty: 3, rate: 180000, tdsRate: 2 }] }, // MSME — 3 months
      { ref: 'PO-2026-004', prRef: 'PR-2026-004', vendor: 'VND-0007', paymentTerms: 30, lines: [{ itemCode: 'ITM-0008', qty: 3, rate: 95000, tdsRate: 2 }] }, // MSME
      { ref: 'PO-2026-005', prRef: 'PR-2026-005', vendor: 'VND-0006', paymentTerms: 45, lines: [{ itemCode: 'ITM-0006', qty: 1, rate: 200000, tdsRate: 10 }] },
      // 10 Direct POs (no PR)
      { ref: 'PO-2026-006', vendor: 'VND-0003', paymentTerms: 45, lines: [{ itemCode: 'ITM-0004', qty: 3, rate: 75000, tdsRate: 10 }] },
      { ref: 'PO-2026-007', vendor: 'VND-0004', paymentTerms: 0,  lines: [{ itemCode: 'ITM-0009', qty: 1, rate: 350000, tdsRate: 10 }] },
      { ref: 'PO-2026-008', vendor: 'VND-0010', paymentTerms: 30, lines: [{ itemCode: 'ITM-0001', qty: 100, rate: 1500, tdsRate: 10 }] },
      { ref: 'PO-2026-009', vendor: 'VND-0008', paymentTerms: 30, lines: [{ itemCode: 'ITM-0011', qty: 1, rate: 45000, tdsRate: 10 }] }, // MSME
      { ref: 'PO-2026-010', vendor: 'VND-0009', paymentTerms: 15, lines: [{ itemCode: 'ITM-0013', qty: 12, rate: 18000, tdsRate: 0 }] },
      { ref: 'PO-2026-011', vendor: 'VND-0002', paymentTerms: 30, lines: [{ itemCode: 'ITM-0007', qty: 1, rate: 175000, tdsRate: 2 }] }, // MSME
      { ref: 'PO-2026-012', vendor: 'VND-0001', paymentTerms: 30, lines: [{ itemCode: 'ITM-0022', qty: 2, rate: 120000, tdsRate: 0 }] },
      { ref: 'PO-2026-013', vendor: 'VND-0005', paymentTerms: 30, lines: [{ itemCode: 'ITM-0003', qty: 1, rate: 95000, tdsRate: 10 }] },
      { ref: 'PO-2026-014', vendor: 'VND-0006', paymentTerms: 45, lines: [{ itemCode: 'ITM-0010', qty: 1, rate: 60000, tdsRate: 10 }] },
      { ref: 'PO-2026-015', vendor: 'VND-0007', paymentTerms: 30, lines: [{ itemCode: 'ITM-0021', qty: 5, rate: 65000, tdsRate: 0 }] },
    ]

    let created = 0
    for (let idx = 0; idx < poSpecs.length; idx++) {
      const spec = poSpecs[idx]
      const existing = await prisma.purchaseOrder.findFirst({ where: { tenantId, poRef: spec.ref } })
      if (existing) {
        poResults.push({ ref: spec.ref, id: existing.id, vendorId: existing.vendorId, total: Number(existing.totalAmount) })
        continue
      }
      const vendor = v(spec.vendor)
      const linesData = spec.lines.map((l, i) => {
        const item = itemByCode(l.itemCode)
        const gstRate = Number(item.gstRate ?? 18)
        const taxable = l.qty * l.rate
        const cgst = (taxable * gstRate) / 200
        const sgst = (taxable * gstRate) / 200
        const tdsRate = l.tdsRate ?? 0
        const tdsAmount = (taxable * tdsRate) / 100
        return {
          lineNo: i + 1, itemId: item.id, description: item.name,
          qty: l.qty, uom: item.uom ?? 'NOS', unitPrice: l.rate,
          gstRate, taxType: 'EXCLUSIVE', cgstAmount: round2(cgst), sgstAmount: round2(sgst), igstAmount: 0,
          tdsApplicable: tdsRate > 0, tdsRate, tdsAmount: round2(tdsAmount),
          hsnCode: item.hsnCode, sacCode: item.sacCode,
          pendingQty: l.qty,
          lineTotal: round2(taxable + cgst + sgst),
        }
      })
      const subtotal = linesData.reduce((s, l) => s + Number(l.unitPrice) * Number(l.qty), 0)
      const taxAmount = linesData.reduce((s, l) => s + Number(l.cgstAmount) + Number(l.sgstAmount) + Number(l.igstAmount), 0)
      const tdsAmount = linesData.reduce((s, l) => s + Number(l.tdsAmount), 0)
      const totalAmount = round2(subtotal + taxAmount)

      const prRefArr = spec.prRef ? [{ prRef: spec.prRef }] : []

      const po = await prisma.purchaseOrder.create({
        data: {
          tenantId, poRef: spec.ref, poType: 'STANDARD',
          poDate: d('2026-04-15'),
          vendorId: vendor.id, entityId: entity.id,
          paymentTermsDays: spec.paymentTerms, paymentMode: 'NEFT',
          taxType: 'EXCLUSIVE',
          subtotal: round2(subtotal), taxAmount: round2(taxAmount), tdsAmount: round2(tdsAmount), totalAmount,
          currencyCode: 'INR',
          notes: `Demo PO — ${spec.lines.map(l => itemByCode(l.itemCode).name).join(', ')}`,
          prRefs: prRefArr,
          createdByUserId: adminUser.id,
          status: 'DRAFT',
          lines: { createMany: { data: linesData } },
        },
      })

      // Workflow → APPROVED
      try {
        const wfRes = await runWorkflowToCompletion(
          'PO', 'purchase_order', po.id,
          { totalAmount, entityId: entity.id, vendorId: vendor.id, createdByUserId: adminUser.id, isPOInvoice: false },
          ctx,
        )
        await prisma.purchaseOrder.update({
          where: { id: po.id },
          data: { status: 'APPROVED', workflowInstanceId: wfRes.instanceId ?? undefined },
        })
      } catch (e) {
        console.warn(`[PO ${spec.ref}] workflow failed: ${(e as Error).message} — forcing APPROVED`)
        await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: 'APPROVED' } })
      }
      poResults.push({ ref: spec.ref, id: po.id, vendorId: vendor.id, total: totalAmount })
      created++
      console.log(`  ✓ ${spec.ref} (₹${totalAmount.toLocaleString('en-IN')}) — APPROVED`)
    }
    ok('Step 4', `${created}/15 POs created (5 from PRs, 10 direct, all APPROVED)`)
    return poResults.length
  })

  // ── STEP 5 — GRNs (8) ────────────────────────────────────────────────────
  const grnResults: { ref: string; id: string; poRef: string }[] = []
  await step('Step 5 — GRNs', async () => {
    // GRN for POs 1-8 (the ones that will have 3-way match later — actually only 5-8 will be 3-way, but we'll create GRNs for the first 8 anyway since the spec says 8)
    const grnPos = poResults.slice(0, 8)
    let created = 0
    for (let i = 0; i < grnPos.length; i++) {
      const po = grnPos[i]
      const ref = `GRN-2026-${String(i + 1).padStart(3, '0')}`
      const existing = await prisma.goodsReceiptNote.findFirst({ where: { tenantId, grnRef: ref } })
      if (existing) {
        grnResults.push({ ref, id: existing.id, poRef: po.ref })
        continue
      }
      const poFull = await prisma.purchaseOrder.findFirst({ where: { id: po.id }, include: { lines: true } })
      if (!poFull) continue

      const linesData = poFull.lines.map(pl => ({
        poLineId: pl.id, itemId: pl.itemId ?? null, description: pl.description,
        orderedQty: pl.qty, receivedQty: pl.qty, acceptedQty: pl.qty, rejectedQty: 0,
        qualityStatus: 'ACCEPTED',
      }))

      const grn = await prisma.goodsReceiptNote.create({
        data: {
          tenantId, grnRef: ref, grnDate: d('2026-04-20'),
          poId: po.id, vendorId: po.vendorId,
          deliveryLocation: 'Mumbai HO — Receiving Bay 1',
          vehicleNo: `MH-04-AB-${1234 + i}`, lrNumber: `LR/${2026}/${10000 + i}`,
          createdByUserId: adminUser.id,
          status: 'APPROVED',
          lines: { createMany: { data: linesData } },
        },
      })

      // Update PO line pending/grn qty + PO status
      for (const pl of poFull.lines) {
        await prisma.purchaseOrderLine.update({
          where: { id: pl.id },
          data: { grnQty: pl.qty, pendingQty: 0 },
        })
      }
      grnResults.push({ ref, id: grn.id, poRef: po.ref })
      created++
      console.log(`  ✓ ${ref} for ${po.ref}`)
    }
    ok('Step 5', `${created}/8 GRNs created (APPROVED, qty fully received)`)
    return grnResults.length
  })

  // ── STEP 6 — Vendor Advances (5) ────────────────────────────────────────
  const advanceResults: { ref: string; id: string; vendorId: string; amount: number }[] = []
  await step('Step 6 — Vendor Advances', async () => {
    // 5 advances against 5 different POs
    const advSpecs = [
      { ref: 'ADV-2026-001', poIdx: 0, pct: 25, purpose: 'Mobilisation advance — CBS Annual License',  tdsSection: '194J' },
      { ref: 'ADV-2026-002', poIdx: 4, pct: 30, purpose: 'Advance — TCS Q1 implementation support',    tdsSection: '194J' },
      { ref: 'ADV-2026-003', poIdx: 7, pct: 20, purpose: 'Material advance — Quick Heal licenses',     tdsSection: '194J' },
      { ref: 'ADV-2026-004', poIdx: 11, pct: 25, purpose: 'Mobilisation advance — Dell laptops',       tdsSection: '194C' },
      { ref: 'ADV-2026-005', poIdx: 5, pct: 30, purpose: 'Retainer advance — Crawford Bayley FY26',    tdsSection: '194J' },
    ]
    let created = 0
    for (const spec of advSpecs) {
      const po = poResults[spec.poIdx]
      if (!po) continue
      const existing = await prisma.vendorAdvance.findFirst({ where: { tenantId, advanceRef: spec.ref } })
      if (existing) {
        advanceResults.push({ ref: spec.ref, id: existing.id, vendorId: existing.vendorId, amount: Number(existing.advanceAmount) })
        continue
      }
      const amount = round2((po.total * spec.pct) / 100)
      const tds = tdsByCode(spec.tdsSection)
      const adv = await prisma.vendorAdvance.create({
        data: {
          tenantId, advanceRef: spec.ref,
          vendorId: po.vendorId, entityId: entity.id, poId: po.id,
          advanceAmount: amount, currencyCode: 'INR',
          advanceDate: d('2026-04-10'),
          purpose: spec.purpose,
          tdsApplicable: !!tds, tdsSectionId: tds?.id ?? null,
          tdsAmount: round2((amount * 10) / 100),
          pendingAmount: amount,
          createdByUserId: adminUser.id,
          status: 'APPROVED',
        },
      })
      advanceResults.push({ ref: spec.ref, id: adv.id, vendorId: po.vendorId, amount })
      created++
      console.log(`  ✓ ${spec.ref} for ${po.ref} (${spec.pct}% = ₹${amount.toLocaleString('en-IN')})`)
    }
    ok('Step 6', `${created}/5 advances created (all APPROVED)`)
    return advanceResults.length
  })

  // ── STEP 7 — Invoices (19) ───────────────────────────────────────────────
  const invoiceResults: {
    ref: string; id: string; group: string; vendorCode: string; total: number; netPayable: number; tdsAmount: number;
    status: string; isMsme: boolean; tdsSection?: string | null;
  }[] = []
  const accountingResults: { invoiceRef: string; result: string }[] = []

  async function createInvoice(opts: {
    ref: string
    group: string
    vendorCode: string
    invoiceDate: Date
    dueDate?: Date | null
    periodFrom?: Date | null
    periodTo?: Date | null
    isPo: boolean
    matchType?: '2way' | '3way'
    poRefs?: { poRef: string; consumptionType: 'PARTIAL' | 'FULL'; invoiceAmount: number }[]
    grnRef?: string | null
    glCode?: string | null  // for direct invoices
    ccCode?: string | null
    lines: { itemCode: string; qty: number; rate: number; tdsRate?: number; description?: string }[]
    matchScore?: number
    narration?: string
    autoApprove?: boolean
    notes?: string
  }) {
    const existing = await prisma.invoice.findFirst({ where: { tenantId, invoiceNumber: opts.ref } })
    if (existing) {
      invoiceResults.push({
        ref: opts.ref, id: existing.id, group: opts.group, vendorCode: opts.vendorCode,
        total: Number(existing.totalAmount), netPayable: Number(existing.netPayable),
        tdsAmount: Number(existing.tdsAmount), status: existing.status, isMsme: !!existing.msmePaymentDue,
      })
      return existing.id
    }
    const vendor = v(opts.vendorCode)
    const isInterstate = (vendor.stateCode ?? 'MH') !== 'MH'
    const linesData = opts.lines.map((l, i) => {
      const item = itemByCode(l.itemCode)
      const gstRate = Number(item.gstRate ?? 18)
      const taxable = l.qty * l.rate
      const cgst = isInterstate ? 0 : (taxable * gstRate) / 200
      const sgst = isInterstate ? 0 : (taxable * gstRate) / 200
      const igst = isInterstate ? (taxable * gstRate) / 100 : 0
      const tdsRate = l.tdsRate ?? 0
      const tdsAmt = (taxable * tdsRate) / 100
      return {
        lineNumber: i + 1, itemId: item.id, itemCode: item.itemCode,
        description: l.description ?? item.name,
        quantity: l.qty, uom: item.uom ?? 'NOS', unitPrice: l.rate,
        taxableAmount: round2(taxable), gstRate,
        cgstAmount: round2(cgst), sgstAmount: round2(sgst), igstAmount: round2(igst),
        tdsRate, tdsAmount: round2(tdsAmt),
        hsnCode: item.hsnCode, sacCode: item.sacCode,
        lineTotal: round2(taxable + cgst + sgst + igst),
      }
    })
    const subtotal = linesData.reduce((s, l) => s + Number(l.taxableAmount), 0)
    const cgstAmount = linesData.reduce((s, l) => s + Number(l.cgstAmount), 0)
    const sgstAmount = linesData.reduce((s, l) => s + Number(l.sgstAmount), 0)
    const igstAmount = linesData.reduce((s, l) => s + Number(l.igstAmount), 0)
    const tdsAmount = linesData.reduce((s, l) => s + Number(l.tdsAmount), 0)
    const totalAmount = round2(subtotal + cgstAmount + sgstAmount + igstAmount)
    const netPayable = round2(totalAmount - tdsAmount)

    const glIdForDirect = opts.glCode ? glByCode(opts.glCode).id : null
    const ccIdForDirect = opts.ccCode ? ccByCode(opts.ccCode).id : null
    const tdsSection = linesData.find(l => Number(l.tdsRate) > 0)
    const tdsSectionCode = tdsSection ? (vendor.tdsSectionCode ?? '194J') : null

    // MSME deadline
    let msmeDue: Date | null = null
    let msmeDays: number | null = null
    if (vendor.msmeRegistered) {
      msmeDue = computeMsmePaymentDue(opts.invoiceDate, vendor.paymentTerms)
      msmeDays = computeMsmeDaysRemaining(msmeDue, d('2026-05-19'))
    }

    const invoiceRefStr = `${opts.ref}-${vendor.vendorCode}`
    const ocrRaw = {
      vendorName: vendor.legalName,
      invoiceNumber: opts.ref,
      invoiceDate: opts.invoiceDate.toISOString().slice(0, 10),
      totalAmount,
      narration: opts.narration ?? '',
      vendorGSTIN: vendor.gstin,
      vendorPAN: vendor.pan,
      overallConfidence: 92,
      fieldConfidence: { vendorName: 95, invoiceNumber: 98, invoiceDate: 96, totalAmount: 99, narration: 80 },
    }

    const invoice = await prisma.invoice.create({
      data: {
        tenantId, invoiceNumber: opts.ref, invoiceRef: invoiceRefStr,
        invoiceDate: opts.invoiceDate,
        dueDate: opts.dueDate ?? new Date(opts.invoiceDate.getTime() + (vendor.paymentTerms * 86400000)),
        vendorId: vendor.id, vendorGSTIN: vendor.gstin, vendorPAN: vendor.pan,
        entityId: entity.id,
        channelType: 'MANUAL_UPLOAD',
        status: 'DRAFT',
        apLane: opts.matchScore && opts.matchScore >= 96 ? 'STP' : 'MANUAL',
        matchScore: opts.matchScore ?? 88,
        matchLane: opts.matchScore && opts.matchScore >= 96 ? 'STP' : 'MANUAL',
        isPOInvoice: opts.isPo,
        poRef: opts.poRefs?.[0]?.poRef ?? null,
        grnRef: opts.grnRef ?? null,
        matchType: opts.isPo ? (opts.matchType ?? '2way') : null,
        costCentreId: ccIdForDirect ?? null,
        glCodeId: glIdForDirect ?? null,
        subtotal: round2(subtotal),
        taxableAmount: round2(subtotal),
        cgstAmount: round2(cgstAmount), sgstAmount: round2(sgstAmount), igstAmount: round2(igstAmount),
        tdsAmount: round2(tdsAmount),
        totalAmount, netPayable,
        currencyCode: 'INR',
        narration: opts.narration,
        periodFrom: opts.periodFrom ?? null,
        periodTo: opts.periodTo ?? null,
        vendorMatchMethod: 'gstin_lookup',
        irnNumber: `${Math.random().toString(36).slice(2, 12).toUpperCase()}IRN${opts.invoiceDate.getUTCFullYear()}`,
        irnVerified: true,
        ocrConfidence: 92,
        ocrRawData: ocrRaw,
        notes: opts.notes,
        msmePaymentDue: msmeDue,
        msmeDaysRemaining: msmeDays,
        msmeBreach: false,
        createdByUserId: adminUser.id,
        lines: { createMany: { data: linesData } },
      },
    })

    // Match score row
    await prisma.invoiceMatchScore.create({
      data: {
        invoiceId: invoice.id, tenantId,
        vendorScore: 25, poScore: opts.isPo ? 20 : 0,
        amountScore: opts.isPo ? 14 : 13, grnScore: opts.matchType === '3way' ? 20 : 0,
        gstScore: 10, ocrScore: 9,
        totalScore: opts.matchScore ?? 88,
        lane: opts.matchScore && opts.matchScore >= 96 ? 'STP' : 'MANUAL',
        isPOInvoice: opts.isPo,
      },
    })

    // PO links
    if (opts.poRefs) {
      for (const pr of opts.poRefs) {
        const poRow = poResults.find(p => p.ref === pr.poRef)
        if (poRow) {
          await prisma.invoicePOLink.create({
            data: {
              tenantId, invoiceId: invoice.id, poId: poRow.id,
              invoiceAmount: pr.invoiceAmount, consumptionType: pr.consumptionType,
            },
          })
          await prisma.purchaseOrder.update({
            where: { id: poRow.id },
            data: { consumedAmount: { increment: pr.invoiceAmount } },
          })
        }
      }
    }

    await prisma.invoiceAuditLog.create({ data: { invoiceId: invoice.id, tenantId, action: 'invoice.created', userId: adminUser.id, userName: adminUser.name, details: { source: 'demo-seed' } } })

    // Workflow → APPROVED
    try {
      const record = {
        totalAmount, entityId: entity.id, vendorId: vendor.id,
        createdByUserId: adminUser.id, isPOInvoice: opts.isPo, matchScore: opts.matchScore ?? 88,
      }
      const wfRes = await runWorkflowToCompletion('INVOICE', 'invoice', invoice.id, record, ctx)
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'APPROVED', approvedAt: new Date(), approvedByUserId: adminUser.id, workflowInstanceId: wfRes.instanceId ?? undefined },
      })
      await prisma.invoiceAuditLog.create({ data: { invoiceId: invoice.id, tenantId, action: 'invoice.approved', userId: adminUser.id, userName: adminUser.name } })

      // Fire accounting trigger
      try {
        const trig = await triggerOnInvoiceApproval(prisma, invoice.id, { tenantId, userId: adminUser.id })
        accountingResults.push({ invoiceRef: opts.ref, result: JSON.stringify({ accrual: !!trig.accrualJvId, amort: !!trig.amortizationScheduleId, firstAmort: !!trig.firstAmortizationJvId, nullifications: trig.nullifications?.length ?? 0, skipped: trig.skipped }) })
      } catch (e) {
        accountingResults.push({ invoiceRef: opts.ref, result: `ERR: ${(e as Error).message}` })
      }
    } catch (e) {
      console.warn(`[INV ${opts.ref}] workflow failed: ${(e as Error).message} — forcing APPROVED`)
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'APPROVED', approvedAt: new Date(), approvedByUserId: adminUser.id },
      })
      try {
        const trig = await triggerOnInvoiceApproval(prisma, invoice.id, { tenantId, userId: adminUser.id })
        accountingResults.push({ invoiceRef: opts.ref, result: `(no-wf) ${JSON.stringify({ accrual: !!trig.accrualJvId, amort: !!trig.amortizationScheduleId })}` })
      } catch (ee) {
        accountingResults.push({ invoiceRef: opts.ref, result: `(no-wf) ERR: ${(ee as Error).message}` })
      }
    }

    invoiceResults.push({
      ref: opts.ref, id: invoice.id, group: opts.group, vendorCode: opts.vendorCode,
      total: totalAmount, netPayable, tdsAmount: round2(tdsAmount),
      status: 'APPROVED', isMsme: !!vendor.msmeRegistered, tdsSection: tdsSectionCode,
    })
    return invoice.id
  }

  await step('Step 7 — Invoices (Groups A, B, E)', async () => {
    let count = 0

    // helper to load PO lines + resolve item codes via cached item map
    async function poLinesAsInvLines(poId: string): Promise<{ itemCode: string; qty: number; rate: number; tdsRate: number }[]> {
      const lines = await prisma.purchaseOrderLine.findMany({ where: { poId }, orderBy: { lineNo: 'asc' } })
      return lines.map(pl => {
        const item = allItems.find(i => i.id === pl.itemId)
        return {
          itemCode: item?.itemCode ?? 'ITM-0001',
          qty: Number(pl.qty), rate: Number(pl.unitPrice),
          tdsRate: Number(pl.tdsRate ?? 0),
        }
      })
    }

    // Group A — 4 PO-based 2-way match
    const groupA = [
      { ref: 'INV-A-001', poIdx: 0, score: 88 },
      { ref: 'INV-A-002', poIdx: 1, score: 91 },
      { ref: 'INV-A-003', poIdx: 2, score: 84 }, // MSME (G4S)
      { ref: 'INV-A-004', poIdx: 3, score: 90 }, // MSME (Sodexo)
    ]
    for (const a of groupA) {
      const po = poResults[a.poIdx]
      const invLines = await poLinesAsInvLines(po.id)
      if (!invLines.length) continue
      const vendorCode = vendors.find(x => x.id === po.vendorId)!.vendorCode
      await createInvoice({
        ref: a.ref, group: 'A', vendorCode,
        invoiceDate: d('2026-04-25'),
        isPo: true, matchType: '2way',
        poRefs: [{ poRef: po.ref, consumptionType: 'FULL', invoiceAmount: po.total }],
        lines: invLines,
        matchScore: a.score,
        narration: `Goods/services delivered against ${po.ref}`,
      })
      count++
    }

    // Group B — 4 PO-based 3-way match (with GRN)
    const groupB = [
      { ref: 'INV-B-001', poIdx: 4, score: 92 },
      { ref: 'INV-B-002', poIdx: 5, score: 86 },
      { ref: 'INV-B-003', poIdx: 6, score: 89 },
      { ref: 'INV-B-004', poIdx: 7, score: 78 },
    ]
    for (const b of groupB) {
      const po = poResults[b.poIdx]
      const invLines = await poLinesAsInvLines(po.id)
      if (!invLines.length) continue
      const grn = grnResults.find(g => g.poRef === po.ref)
      const vendorCode = vendors.find(x => x.id === po.vendorId)!.vendorCode
      await createInvoice({
        ref: b.ref, group: 'B', vendorCode,
        invoiceDate: d('2026-04-26'),
        isPo: true, matchType: '3way', grnRef: grn?.ref ?? null,
        poRefs: [{ poRef: po.ref, consumptionType: 'FULL', invoiceAmount: po.total }],
        lines: invLines,
        matchScore: b.score,
        narration: `3-way matched (PO ${po.ref} + GRN ${grn?.ref ?? '-'})`,
      })
      count++
    }

    // Group E — 5 direct invoices
    const groupE = [
      { ref: 'INV-E-001', vendor: 'VND-0009', glCode: '5012', ccCode: 'CC-CORP', items: [{ itemCode: 'ITM-0013', qty: 1, rate: 18000, tdsRate: 0 }],  narration: 'Airtel bill — Apr 2026 (Mumbai HO)' },
      { ref: 'INV-E-002', vendor: 'VND-0009', glCode: '5012', ccCode: 'CC-CORP', items: [{ itemCode: 'ITM-0013', qty: 1, rate: 22000, tdsRate: 0 }],  narration: 'Airtel bill — Apr 2026 (BKC office)' },
      { ref: 'INV-E-003', vendor: 'VND-0003', glCode: '5030', ccCode: 'CC-LEGAL', items: [{ itemCode: 'ITM-0004', qty: 1, rate: 60000, tdsRate: 10 }], narration: 'Legal advisory — Q4 FY25 disputes' },
      { ref: 'INV-E-004', vendor: 'VND-0006', glCode: '5001', ccCode: 'CC-IT',    items: [{ itemCode: 'ITM-0006', qty: 1, rate: 95000, tdsRate: 10 }], narration: 'TCS — additional implementation support' },
      { ref: 'INV-E-005', vendor: 'VND-0010', glCode: '5001', ccCode: 'CC-IT',    items: [{ itemCode: 'ITM-0001', qty: 50, rate: 800, tdsRate: 10 }],   narration: 'Quick Heal — 50 additional licenses' },
    ]
    for (const e of groupE) {
      await createInvoice({
        ref: e.ref, group: 'E', vendorCode: e.vendor,
        invoiceDate: d('2026-04-28'),
        isPo: false,
        glCode: e.glCode, ccCode: e.ccCode,
        lines: e.items,
        narration: e.narration,
        matchScore: 80,
      })
      count++
    }

    ok('Step 7 (A+B+E)', `${count}/13 invoices created (4 group A, 4 group B, 5 group E)`)
    return count
  })

  // ── STEP 7 (Group D pre-work) — Create provision schedules & post April provisions ─────
  await step('Step 7 — Provision schedules + backdated April provisions', async () => {
    const provItems = [
      { itemCode: 'ITM-0002', vendorCode: 'VND-0001', amount: 50000,  exGl: '5003', provGl: '2001' }, // IT AMC
      { itemCode: 'ITM-0007', vendorCode: 'VND-0002', amount: 75000,  exGl: '5020', provGl: '2001' }, // Security
      { itemCode: 'ITM-0004', vendorCode: 'VND-0003', amount: 120000, exGl: '5030', provGl: '2004' }, // Legal
    ]
    let created = 0
    for (const p of provItems) {
      const item = itemByCode(p.itemCode)
      const vendor = v(p.vendorCode)
      const existing = await prisma.provisionSchedule.findFirst({ where: { tenantId, itemId: item.id, vendorId: vendor.id } })
      if (existing) continue
      await prisma.provisionSchedule.create({
        data: {
          tenantId, itemId: item.id, vendorId: vendor.id,
          frequency: 'MONTHLY', amount: p.amount, basis: 'FIXED_AMOUNT',
          status: 'ACTIVE',
          lastRunDate: null,
          nextRunDate: d('2026-04-30'),
          expenseGlCode: p.exGl,
          provisionGlCode: p.provGl,
        },
      })
      created++
    }
    ok('Step 7 prov-schedules', `${created} ACTIVE provision schedules (ITM-0002, ITM-0007, ITM-0004)`)
    return created
  })

  await step('Step 7 — Run backdated month-end 2026-04 to post open provisions', async () => {
    const res = await runMonthEnd(prisma, ctx, '2026-04')
    ok('Step 7 me-04 (provision-seed)', `provisions=${res.provisionsPosted}, amortizations=${res.amortizationsPosted}, reversalsExec=${res.reversalsExecuted}, reversalsSkip=${res.reversalsSkipped}`)
    return res.provisionsPosted
  })

  await step('Step 7 — Amortization invoices (Group C, 3) + Provision invoices (Group D, 3)', async () => {
    // Group C — 3 invoices with multi-month period → auto-amortization schedule
    await createInvoice({
      ref: 'INV-AMORT-001', group: 'C', vendorCode: 'VND-0004',
      invoiceDate: d('2026-04-01'),
      periodFrom: d('2026-04-01'), periodTo: d('2026-09-30'),
      isPo: false, glCode: '5010', ccCode: 'CC-CORP',
      lines: [{ itemCode: 'ITM-0009', qty: 6, rate: 20000, tdsRate: 10, description: 'Office Rent — Apr–Sep 2026 (6 months × ₹20K)' }],
      narration: 'Mumbai HO office rent — 6-month advance',
      matchScore: 86,
    })

    await createInvoice({
      ref: 'INV-AMORT-002', group: 'C', vendorCode: 'VND-0001',
      invoiceDate: d('2026-03-01'),
      periodFrom: d('2026-03-01'), periodTo: d('2026-08-31'),
      isPo: false, glCode: '5003', ccCode: 'CC-IT',
      lines: [{ itemCode: 'ITM-0002', qty: 1, rate: 72000, tdsRate: 10, description: 'AMC — Mar to Aug 2026 (6-month coverage)' }],
      narration: 'Annual Maintenance Contract — first 6 months',
      matchScore: 90,
    })

    await createInvoice({
      ref: 'INV-AMORT-003', group: 'C', vendorCode: 'VND-0004',
      invoiceDate: d('2026-01-15'),
      periodFrom: d('2026-01-01'), periodTo: d('2026-12-31'),
      isPo: false, glCode: '5060', ccCode: 'CC-CORP',
      lines: [{ itemCode: 'ITM-0015', qty: 1, rate: 240000, tdsRate: 10, description: 'Property insurance premium — Cal Yr 2026' }],
      narration: 'Annual insurance premium — Mumbai HO + branches',
      matchScore: 92,
    })

    // Group D — 3 provision-item invoices (single month, in April so they nullify the April provisions)
    await createInvoice({
      ref: 'INV-PROV-001', group: 'D', vendorCode: 'VND-0001',
      invoiceDate: d('2026-04-22'),
      isPo: false, glCode: '5003', ccCode: 'CC-IT',
      lines: [{ itemCode: 'ITM-0002', qty: 1, rate: 50000, tdsRate: 10 }],
      narration: 'IT AMC — Apr 2026 servers + storage',
      matchScore: 88,
    })

    await createInvoice({
      ref: 'INV-PROV-002', group: 'D', vendorCode: 'VND-0002',
      invoiceDate: d('2026-04-23'),
      isPo: false, glCode: '5020', ccCode: 'CC-OPS',
      lines: [{ itemCode: 'ITM-0007', qty: 1, rate: 75000, tdsRate: 2 }],
      narration: 'Security services — Apr 2026 (Mumbai HO)',
      matchScore: 86,
    })

    await createInvoice({
      ref: 'INV-PROV-003', group: 'D', vendorCode: 'VND-0003',
      invoiceDate: d('2026-04-24'),
      isPo: false, glCode: '5030', ccCode: 'CC-LEGAL',
      lines: [{ itemCode: 'ITM-0004', qty: 1, rate: 120000, tdsRate: 10 }],
      narration: 'Legal retainer — Apr 2026',
      matchScore: 89,
    })

    ok('Step 7 (C+D)', '3 amortization + 3 provision invoices created')
    return 6
  })

  // ── STEP 8 — Month-end runs ──────────────────────────────────────────────
  let me04: any = null
  let me05: any = null
  await step('Step 8 — Month-end 2026-04', async () => {
    me04 = await runMonthEnd(prisma, ctx, '2026-04')
    ok('Step 8 me-04', `provisions=${me04.provisionsPosted}, amortizations=${me04.amortizationsPosted}, reversalsExec=${me04.reversalsExecuted}, reversalsSkip=${me04.reversalsSkipped}, JVs=${me04.jvs.length}`)
    return me04
  })

  await step('Step 8 — Month-end 2026-05', async () => {
    me05 = await runMonthEnd(prisma, ctx, '2026-05')
    ok('Step 8 me-05', `provisions=${me05.provisionsPosted}, amortizations=${me05.amortizationsPosted}, reversalsExec=${me05.reversalsExecuted}, reversalsSkip=${me05.reversalsSkipped}, JVs=${me05.jvs.length}`)
    return me05
  })

  // ── STEP 9 — Payment module ─────────────────────────────────────────────
  // Helper: resolve GL codes for payment JV (mirrors payments.ts route)
  async function resolvePaymentGlCodes(tdsSection: string | null): Promise<PaymentGLCodes> {
    const liabilityGls = allGls.filter(g => g.accountType === 'LIABILITY').map(g => ({ code: g.code, name: g.name }))
    const apCode = resolveApGlCodeFromList(liabilityGls) ?? '2030'
    const bankGl = allGls.find(g => g.name.toLowerCase().includes('bank') && g.code.startsWith('100'))?.code ?? '1002'
    let tdsPayableGlCode: string | undefined
    if (tdsSection) {
      const sec = tdsSection.replace(/\D/g, '').replace(/^0+/, '')
      const match = allGls.find(g => g.name.toLowerCase().includes(`tds payable`) && g.name.includes(sec))
      tdsPayableGlCode = match?.code
    }
    return { apGlCode: apCode, bankGlCode: bankGl, tdsPayableGlCode }
  }

  // Mark one approved invoice urgent (BATCH-004 candidate, MSME)
  // Find an MSME invoice from Group A
  const msmeInvoiceForUrgent = invoiceResults.find(i => i.group === 'A' && i.isMsme && i.status === 'APPROVED')

  // Mark an invoice urgent for the queue (not paid)
  const queueInvoices = invoiceResults.filter(i => i.status === 'APPROVED' && i.group !== 'C' && i.group !== 'D')
  // Pick 3 unpaid invoices for the queue
  // 1 MSME, 1 URGENT, 1 overdue
  await step('Step 9 — Flag invoices for queue (MSME / Urgent / Overdue)', async () => {
    // Pick a non-batched MSME invoice for the queue. We'll use INV-A-004 (Sodexo MSME, Group A).
    const queueMsme = invoiceResults.find(i => i.ref === 'INV-A-004')
    const queueUrgent = invoiceResults.find(i => i.ref === 'INV-A-001')
    const queueOverdue = invoiceResults.find(i => i.ref === 'INV-E-003')
    if (queueUrgent) {
      await prisma.invoice.update({
        where: { id: queueUrgent.id },
        data: { isUrgent: true, urgentReason: 'Vendor cash-flow stress — committed payment by 2026-05-22' },
      })
    }
    if (queueOverdue) {
      // Backdate due date to make it overdue relative to 2026-05-19
      await prisma.invoice.update({
        where: { id: queueOverdue.id },
        data: { dueDate: d('2026-05-10') },
      })
    }
    ok('Step 9 queue-flags', `MSME=${queueMsme?.ref}, URGENT=${queueUrgent?.ref}, OVERDUE=${queueOverdue?.ref}`)
    return 3
  })

  // Helper to execute a payment batch: walk submit → workflow approve → execute
  async function executePaymentBatch(opts: {
    batchRef: string
    isUrgent?: boolean
    urgentReason?: string
    lines: {
      lineType: 'INVOICE' | 'ADVANCE'
      invoiceRef?: string
      advanceRef?: string
      paymentMethod: 'NEFT' | 'RTGS' | 'IMPS' | 'CHEQUE'
      paymentAmount?: number  // override for partial
      utrNumber?: string
      chequeNumber?: string
      chequeDate?: Date
    }[]
  }): Promise<{ id: string }> {
    const existing = await prisma.paymentBatch.findFirst({ where: { tenantId, batchRef: opts.batchRef } })
    if (existing) return { id: existing.id }

    // Build line shapes
    const lineShapes: any[] = []
    for (const l of opts.lines) {
      if (l.lineType === 'INVOICE') {
        const inv = invoiceResults.find(i => i.ref === l.invoiceRef)
        if (!inv) throw new Error(`Invoice ${l.invoiceRef} not found for batch ${opts.batchRef}`)
        const invFull = await prisma.invoice.findFirst({ where: { id: inv.id } })
        if (!invFull) throw new Error(`Invoice ${l.invoiceRef} not in DB`)
        const vendorRow = vendors.find(x => x.id === invFull.vendorId)!
        const paymentAmt = l.paymentAmount ?? Number(invFull.netPayable)
        lineShapes.push({
          tenantId, lineType: 'INVOICE',
          invoiceId: invFull.id, advanceId: null,
          vendorId: vendorRow.id,
          isMsme: vendorRow.msmeRegistered,
          msmePaymentDue: invFull.msmePaymentDue, msmeDaysRemaining: invFull.msmeDaysRemaining,
          invoiceAmount: invFull.totalAmount, tdsAmount: invFull.tdsAmount,
          advanceAdjusted: 0,
          paymentAmount: paymentAmt,
          paymentType: paymentAmt < Number(invFull.netPayable) ? 'PARTIAL' : 'FULL',
          paymentMethod: l.paymentMethod,
          tdsSection: invFull.tdsAmount.toNumber ? (invFull.tdsAmount.toNumber() > 0 ? '194C' : null) : (Number(invFull.tdsAmount) > 0 ? '194C' : null), // placeholder, overridden below
          status: 'PENDING',
          _utrNumber: l.utrNumber, _chequeNumber: l.chequeNumber, _chequeDate: l.chequeDate,
        })
      } else {
        const adv = advanceResults.find(a => a.ref === l.advanceRef)
        if (!adv) throw new Error(`Advance ${l.advanceRef} not found`)
        const advFull = await prisma.vendorAdvance.findFirst({ where: { id: adv.id } })
        if (!advFull) throw new Error(`Advance ${l.advanceRef} not in DB`)
        const vendorRow = vendors.find(x => x.id === advFull.vendorId)!
        lineShapes.push({
          tenantId, lineType: 'ADVANCE',
          invoiceId: null, advanceId: advFull.id,
          vendorId: vendorRow.id,
          isMsme: vendorRow.msmeRegistered,
          msmePaymentDue: null, msmeDaysRemaining: null,
          invoiceAmount: advFull.advanceAmount, tdsAmount: advFull.tdsAmount,
          advanceAdjusted: 0,
          paymentAmount: Number(advFull.advanceAmount) - Number(advFull.tdsAmount),
          paymentType: 'FULL',
          paymentMethod: l.paymentMethod,
          tdsSection: '194J',
          status: 'PENDING',
          _utrNumber: l.utrNumber, _chequeNumber: l.chequeNumber, _chequeDate: l.chequeDate,
        })
      }
    }

    // Derive tdsSection per line. VendorAdvance has no `vendor` relation in the
    // schema, so we read tdsSection off the cached vendor list by vendorId.
    for (const sh of lineShapes) {
      if (sh.lineType === 'INVOICE' && Number(sh.tdsAmount) > 0) {
        const vendorRow = vendors.find(x => x.id === sh.vendorId)
        sh.tdsSection = vendorRow?.tdsSectionCode ?? '194C'
      } else if (sh.lineType === 'ADVANCE') {
        const vendorRow = vendors.find(x => x.id === sh.vendorId)
        sh.tdsSection = vendorRow?.tdsSectionCode ?? '194J'
      } else {
        sh.tdsSection = null
      }
    }

    const totals = computeBatchTotals(lineShapes.map((l: any) => ({ invoiceAmount: Number(l.invoiceAmount), tdsAmount: Number(l.tdsAmount), advanceAdjusted: Number(l.advanceAdjusted), paymentAmount: Number(l.paymentAmount) })))
    const msmeLines = lineShapes.filter(l => l.isMsme)

    const batch = await prisma.paymentBatch.create({
      data: {
        tenantId, batchRef: opts.batchRef,
        status: 'DRAFT',
        isUrgent: !!opts.isUrgent, urgentReason: opts.urgentReason ?? null,
        urgentFlaggedBy: opts.isUrgent ? adminUser.id : null,
        containsMsme: msmeLines.length > 0,
        msmeVendorCount: new Set(msmeLines.map(l => l.vendorId)).size,
        totalAmount: round2(totals.totalInvoice),
        totalTds: round2(totals.totalTds),
        totalNetPayable: round2(totals.totalNetPayable),
        paymentDate: d('2026-05-19'),
        entityId: entity.id,
        narration: `Payment batch ${opts.batchRef}`,
        createdBy: adminUser.id,
      },
    })

    // Create batch lines
    for (const sh of lineShapes) {
      const { _utrNumber, _chequeNumber, _chequeDate, ...lineData } = sh
      await prisma.paymentBatchLine.create({
        data: { ...lineData, batchId: batch.id },
      })
    }

    // Submit → workflow
    try {
      const wfRes = await runWorkflowToCompletion(
        'PAYMENT', 'payment_batch', batch.id,
        { totalAmount: Number(batch.totalNetPayable), entityId: entity.id, isUrgent: !!opts.isUrgent, isPOInvoice: false },
        ctx,
      )
      await prisma.paymentBatch.update({
        where: { id: batch.id },
        data: { status: 'APPROVED', workflowInstanceId: wfRes.instanceId ?? undefined },
      })
    } catch (e) {
      console.warn(`[BATCH ${opts.batchRef}] workflow failed: ${(e as Error).message} — forcing APPROVED`)
      await prisma.paymentBatch.update({ where: { id: batch.id }, data: { status: 'APPROVED' } })
    }

    // Execute — capture UTR/cheque, post JVs, update invoice paymentStatus
    const batchLines = await prisma.paymentBatchLine.findMany({ where: { batchId: batch.id } })
    const lineShapeByIdx = new Map<number, any>()
    lineShapes.forEach((sh, i) => lineShapeByIdx.set(i, sh))

    let executedOk = 0
    const jvCreated: string[] = []
    for (let i = 0; i < batchLines.length; i++) {
      const bl = batchLines[i]
      const sh = lineShapeByIdx.get(i)
      try {
        await prisma.paymentBatchLine.update({
          where: { id: bl.id },
          data: {
            status: 'PAID',
            utrNumber: sh?._utrNumber ?? null,
            chequeNumber: sh?._chequeNumber ?? null,
            chequeDate: sh?._chequeDate ?? null,
            paidAt: new Date(),
          },
        })
        // Update invoice paymentStatus
        if (bl.lineType === 'INVOICE' && bl.invoiceId) {
          const inv = await prisma.invoice.findFirst({ where: { id: bl.invoiceId } })
          if (inv) {
            const newPaid = Number(inv.paidAmount) + Number(bl.paymentAmount)
            const status = newPaid >= Number(inv.netPayable) - 0.5 ? 'PAID' : 'PARTIALLY_PAID'
            await prisma.invoice.update({
              where: { id: inv.id },
              data: {
                paidAmount: newPaid,
                paymentStatus: status,
                ...(status === 'PAID' ? { status: 'PAID', paidAt: new Date() } : {}),
              },
            })
            // Build payment JV(s)
            const glCodes = await resolvePaymentGlCodes(bl.tdsSection)
            const jvs = buildPaymentJVs(
              {
                id: bl.id, tenantId, batchId: batch.id,
                invoiceId: inv.id, vendorId: bl.vendorId,
                paymentAmount: Number(bl.paymentAmount),
                tdsAmount: Number(bl.tdsAmount),
                paymentMethod: bl.paymentMethod,
              },
              glCodes,
              adminUser.id,
              { postingDate: d('2026-05-19'), invoiceRef: inv.invoiceRef ?? inv.invoiceNumber },
            )
            for (const jv of jvs) {
              const row = await prisma.journalEntry.create({ data: jv })
              jvCreated.push(row.id)
            }
          }
        } else if (bl.lineType === 'ADVANCE' && bl.advanceId) {
          await prisma.vendorAdvance.update({
            where: { id: bl.advanceId },
            data: { status: 'PAID', paidAt: new Date(), pendingAmount: 0 },
          })
        }
        executedOk++
      } catch (e) {
        console.warn(`[BATCH ${opts.batchRef}] line ${i} execute failed: ${(e as Error).message}`)
        await prisma.paymentBatchLine.update({
          where: { id: bl.id },
          data: { status: 'FAILED', failureReason: (e as Error).message },
        })
      }
    }

    // Upsert TDS challans
    try {
      const tdsGroups = groupLinesByTdsSection(batchLines.map(l => ({ tdsSection: l.tdsSection, tdsAmount: Number(l.tdsAmount) })))
      if (tdsGroups.length) {
        await upsertChallans(prisma, tenantId, '2026-05', tdsGroups)
      }
    } catch (e) {
      console.warn(`[BATCH ${opts.batchRef}] challan upsert failed: ${(e as Error).message}`)
    }

    // Final batch status
    const finalStatus = executedOk === batchLines.length ? 'EXECUTED' : executedOk > 0 ? 'PARTIALLY_EXECUTED' : 'FAILED'
    await prisma.paymentBatch.update({
      where: { id: batch.id },
      data: { status: finalStatus, executedAt: new Date() },
    })
    console.log(`  ✓ ${opts.batchRef} ${finalStatus} (${executedOk}/${batchLines.length} lines paid, ${jvCreated.length} JVs)`)
    return { id: batch.id }
  }

  await step('Step 9 — BATCH-001 (2 invoices NEFT+RTGS)', async () => {
    // Find 2 fully-approved invoices we haven't queued (avoid INV-A-001 which is queue-urgent and INV-A-004 which is queue-msme)
    await executePaymentBatch({
      batchRef: 'BATCH-001',
      lines: [
        { lineType: 'INVOICE', invoiceRef: 'INV-A-002', paymentMethod: 'NEFT', utrNumber: 'UTR202605190001' },
        { lineType: 'INVOICE', invoiceRef: 'INV-A-003', paymentMethod: 'RTGS', utrNumber: 'UTR202605190002' },
      ],
    })
    return 1
  })

  await step('Step 9 — BATCH-002 (cheque + advance)', async () => {
    await executePaymentBatch({
      batchRef: 'BATCH-002',
      lines: [
        { lineType: 'INVOICE', invoiceRef: 'INV-E-002', paymentMethod: 'CHEQUE', chequeNumber: 'CHQ-001', chequeDate: d('2026-05-15') },
        { lineType: 'ADVANCE', advanceRef: 'ADV-2026-003', paymentMethod: 'NEFT', utrNumber: 'UTR202605190003' },
      ],
    })
    return 1
  })

  await step('Step 9 — BATCH-003 (partial payment)', async () => {
    // Find a large invoice — INV-B-003 (PO-2026-007 → Oberoi Realty rent ₹3.5L) or one with totalAmount >= 200000
    const target = invoiceResults.find(i =>
      i.ref === 'INV-B-003' || (i.group === 'B' && i.total >= 200000)) ?? invoiceResults.find(i => i.total >= 200000 && i.status === 'APPROVED' && !['INV-A-001', 'INV-A-002', 'INV-A-003', 'INV-A-004', 'INV-E-002'].includes(i.ref))
    if (!target) throw new Error('No suitable large invoice for partial payment')
    await executePaymentBatch({
      batchRef: 'BATCH-003',
      lines: [
        { lineType: 'INVOICE', invoiceRef: target.ref, paymentMethod: 'RTGS', paymentAmount: 100000, utrNumber: 'UTR202605190004' },
      ],
    })
    return target.ref
  })

  await step('Step 9 — BATCH-004 (urgent MSME)', async () => {
    // MSME vendor invoice, isUrgent — let's use INV-B-004 if MSME, else any MSME invoice not yet paid
    const candidate = invoiceResults.find(i => i.isMsme && i.status === 'APPROVED' && !['INV-A-003', 'INV-A-004'].includes(i.ref))
      ?? invoiceResults.find(i => i.isMsme && i.status === 'APPROVED')
    if (!candidate) throw new Error('No MSME candidate invoice')
    // Flag urgent on the invoice
    await prisma.invoice.update({
      where: { id: candidate.id },
      data: { isUrgent: true, urgentReason: 'MSME 45-day statutory deadline approaching' },
    })
    await executePaymentBatch({
      batchRef: 'BATCH-004',
      isUrgent: true,
      urgentReason: 'MSME vendor — statutory 45-day deadline',
      lines: [
        { lineType: 'INVOICE', invoiceRef: candidate.ref, paymentMethod: 'NEFT', utrNumber: 'UTR202605190005' },
      ],
    })
    return candidate.ref
  })

  // ── STEP 10 — Verification ──────────────────────────────────────────────
  await step('Step 10 — Verification', async () => {
    const jvCount = await prisma.journalEntry.count({ where: { tenantId } })
    const amortActive = await prisma.amortizationSchedule.count({ where: { tenantId, status: 'ACTIVE' } })
    const provActive = await prisma.provisionSchedule.count({ where: { tenantId, status: 'ACTIVE' } })
    const me04Jvs = await prisma.journalEntry.count({ where: { tenantId, period: '2026-04' } })
    const me05Jvs = await prisma.journalEntry.count({ where: { tenantId, period: '2026-05' } })
    const pendingErp = await prisma.journalEntry.count({ where: { tenantId, erpStatus: 'PENDING' } })

    const queueInv = await prisma.invoice.count({ where: { tenantId, status: 'APPROVED', paymentStatus: 'UNPAID' } })
    const advQueue = await prisma.vendorAdvance.count({ where: { tenantId, status: 'APPROVED' } })
    const batchesExec = await prisma.paymentBatch.count({ where: { tenantId, status: 'EXECUTED' } })
    const batchesPart = await prisma.paymentBatch.count({ where: { tenantId, status: 'PARTIALLY_EXECUTED' } })
    const challans = await prisma.tdsChallan.count({ where: { tenantId } })

    const totalInv = await prisma.invoice.count({ where: { tenantId } })
    const paidInv = await prisma.invoice.count({ where: { tenantId, paymentStatus: 'PAID' } })
    const partInv = await prisma.invoice.count({ where: { tenantId, paymentStatus: 'PARTIALLY_PAID' } })
    const amortInv = await prisma.invoice.count({ where: { tenantId, periodFrom: { not: null } } })

    const prCount = await prisma.purchaseRequisition.count({ where: { tenantId } })
    const poCount = await prisma.purchaseOrder.count({ where: { tenantId } })
    const poConsumed = await prisma.purchaseOrder.count({ where: { tenantId, consumedAmount: { gt: 0 } } })

    console.log('\n──── Verification snapshot ────')
    console.log(`  JVs total:            ${jvCount}  (Apr=${me04Jvs}, May=${me05Jvs}, ERP-pending=${pendingErp})`)
    console.log(`  Amortization active:  ${amortActive}`)
    console.log(`  Provision active:     ${provActive}`)
    console.log(`  Invoices: total=${totalInv}  paid=${paidInv}  partial=${partInv}  withAmort=${amortInv}`)
    console.log(`  Queue: unpaid invoices=${queueInv}  advances=${advQueue}`)
    console.log(`  Batches: executed=${batchesExec}  partial=${batchesPart}`)
    console.log(`  TDS challans: ${challans}`)
    console.log(`  PR/PO: PR=${prCount}  PO=${poCount}  (consumed=${poConsumed})`)
    console.log('────────────────────────────────\n')

    ok('Step 10', `JVs=${jvCount}, Invoices=${totalInv}, Batches=${batchesExec}, Challans=${challans}`)
    return { jvCount, totalInv, batchesExec, challans }
  })

  // ── Final summary ───────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════')
  console.log(' DEMO SEED — Final Summary')
  console.log('══════════════════════════════════════════════════════════════════')
  for (const [k, v2] of Object.entries(summary)) {
    console.log(`  ${k.padEnd(56)} ${v2}`)
  }
  if (errors.length) {
    console.log('\n  Errors encountered:')
    for (const e of errors) console.log(`    ✗ ${e.step}: ${e.msg}`)
  } else {
    console.log('\n  ✅ All steps completed without errors.')
  }
  console.log('══════════════════════════════════════════════════════════════════\n')
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
