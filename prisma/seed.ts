// Demo seed — creates tenant + admin user for development
// Run: npm run db:seed

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding demo data...')

  // Tenant
  const tenant = await prisma.tenant.upsert({
    where:  { code: 'procinix-demo' },
    update: {},
    create: {
      code:     'procinix-demo',
      name:     'Procinix Technologies Pvt Ltd',
      gstin:    '27AABCP1234R1ZV',
      pan:      'AABCP1234R',
      isActive: true,
    },
  })
  console.log(`✓ Tenant: ${tenant.name}`)
  const tenantId = tenant.id

  // Admin user
  const passwordHash = await bcrypt.hash('Demo@123', 12)
  const admin = await prisma.user.upsert({
    where:  { tenantId_email: { tenantId: tenant.id, email: 'mithilesh@procinix.ai' } },
    update: { passwordHash },
    create: {
      tenantId:     tenant.id,
      email:        'mithilesh@procinix.ai',
      passwordHash,
      name:         'Mithilesh',
      role:         'ADMIN',
      isActive:     true,
    },
  })
  console.log(`✓ User: ${admin.email} (role: ${admin.role})`)

  // Departments
  const depts = ['Finance', 'Engineering', 'Operations', 'HR', 'Marketing', 'Legal']
  for (const name of depts) {
    await prisma.department.upsert({
      where:  { tenantId_code: { tenantId: tenant.id, code: name.toUpperCase().slice(0, 6) } },
      update: {},
      create: { tenantId: tenant.id, code: name.toUpperCase().slice(0, 6), name, isActive: true },
    })
  }
  console.log(`✓ ${depts.length} departments`)

  // GL codes
  const glCodes = [
    { code: '5001', name: 'Software & Subscriptions', accountType: 'EXPENSE' },
    { code: '5002', name: 'Professional Services',    accountType: 'EXPENSE' },
    { code: '5003', name: 'Office Supplies',          accountType: 'EXPENSE' },
    { code: '5004', name: 'Travel & Entertainment',   accountType: 'EXPENSE' },
    { code: '5005', name: 'Marketing & Advertising',  accountType: 'EXPENSE' },
    { code: '2001', name: 'Accounts Payable',         accountType: 'LIABILITY' },
    { code: '1001', name: 'Cash & Bank',              accountType: 'ASSET' },
  ]
  for (const gl of glCodes) {
    await prisma.glCode.upsert({
      where:  { tenantId_code: { tenantId: tenant.id, code: gl.code } },
      update: {},
      create: { tenantId: tenant.id, ...gl, isActive: true },
    })
  }
  console.log(`✓ ${glCodes.length} GL codes`)

  // Cost centres
  const costCentres = ['CC-CORP', 'CC-ENGG', 'CC-SALES', 'CC-OPS', 'CC-HR']
  for (const code of costCentres) {
    await prisma.costCentre.upsert({
      where:  { tenantId_code: { tenantId: tenant.id, code } },
      update: {},
      create: { tenantId: tenant.id, code, name: code.replace('CC-', ''), isActive: true },
    })
  }
  console.log(`✓ ${costCentres.length} cost centres`)

  // Tax codes
  const taxCodes = [
    { code: 'GST0',  description: 'GST Exempt', cgstRate: 0,   sgstRate: 0,   igstRate: 0  },
    { code: 'GST5',  description: 'GST 5%',     cgstRate: 2.5, sgstRate: 2.5, igstRate: 5  },
    { code: 'GST12', description: 'GST 12%',    cgstRate: 6,   sgstRate: 6,   igstRate: 12 },
    { code: 'GST18', description: 'GST 18%',    cgstRate: 9,   sgstRate: 9,   igstRate: 18 },
    { code: 'GST28', description: 'GST 28%',    cgstRate: 14,  sgstRate: 14,  igstRate: 28 },
  ]
  for (const tc of taxCodes) {
    await prisma.taxCode.upsert({
      where:  { tenantId_code: { tenantId: tenant.id, code: tc.code } },
      update: {},
      create: { tenantId: tenant.id, ...tc, isActive: true },
    })
  }
  console.log(`✓ ${taxCodes.length} tax codes`)

  // Countries (top trading partners for India)
  const countries = [
    { code: 'IN', name: 'India',          dialCode: '+91',  currency: 'INR' },
    { code: 'US', name: 'United States',  dialCode: '+1',   currency: 'USD' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44',  currency: 'GBP' },
    { code: 'AE', name: 'UAE',            dialCode: '+971', currency: 'AED' },
    { code: 'SG', name: 'Singapore',      dialCode: '+65',  currency: 'SGD' },
    { code: 'DE', name: 'Germany',        dialCode: '+49',  currency: 'EUR' },
    { code: 'AU', name: 'Australia',      dialCode: '+61',  currency: 'AUD' },
    { code: 'JP', name: 'Japan',          dialCode: '+81',  currency: 'JPY' },
  ]
  for (const c of countries) {
    await prisma.country.upsert({ where: { code: c.code }, update: {}, create: c })
  }
  console.log(`✓ ${countries.length} countries`)

  // Indian states
  const states = [
    { code: 'MH', name: 'Maharashtra',    gstCode: '27' },
    { code: 'DL', name: 'Delhi',          gstCode: '07' },
    { code: 'KA', name: 'Karnataka',      gstCode: '29' },
    { code: 'TN', name: 'Tamil Nadu',     gstCode: '33' },
    { code: 'GJ', name: 'Gujarat',        gstCode: '24' },
    { code: 'RJ', name: 'Rajasthan',      gstCode: '08' },
    { code: 'UP', name: 'Uttar Pradesh',  gstCode: '09' },
    { code: 'WB', name: 'West Bengal',    gstCode: '19' },
    { code: 'TS', name: 'Telangana',      gstCode: '36' },
    { code: 'AP', name: 'Andhra Pradesh', gstCode: '37' },
    { code: 'KL', name: 'Kerala',         gstCode: '32' },
    { code: 'PB', name: 'Punjab',         gstCode: '03' },
    { code: 'HR', name: 'Haryana',        gstCode: '06' },
    { code: 'MP', name: 'Madhya Pradesh', gstCode: '23' },
    { code: 'BR', name: 'Bihar',          gstCode: '10' },
    { code: 'OR', name: 'Odisha',         gstCode: '21' },
  ]
  for (const s of states) {
    await prisma.state.upsert({
      where: { code_countryCode: { code: s.code, countryCode: 'IN' } },
      update: {},
      create: { ...s, countryCode: 'IN' },
    })
  }
  console.log(`✓ ${states.length} Indian states`)

  // Major Indian cities
  const cities = [
    { name: 'Mumbai',           stateCode: 'MH', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Pune',             stateCode: 'MH', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Nagpur',           stateCode: 'MH', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'New Delhi',        stateCode: 'DL', countryCode: 'IN', isCapital: true,  isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Bangalore',        stateCode: 'KA', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Chennai',          stateCode: 'TN', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Coimbatore',       stateCode: 'TN', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Ahmedabad',        stateCode: 'GJ', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Surat',            stateCode: 'GJ', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Jaipur',           stateCode: 'RJ', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Lucknow',          stateCode: 'UP', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Kanpur',           stateCode: 'UP', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Kolkata',          stateCode: 'WB', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Hyderabad',        stateCode: 'TS', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Visakhapatnam',    stateCode: 'AP', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Kochi',            stateCode: 'KL', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Thiruvananthapuram', stateCode: 'KL', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Chandigarh',       stateCode: 'PB', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Gurugram',         stateCode: 'HR', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Faridabad',        stateCode: 'HR', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Indore',           stateCode: 'MP', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Bhopal',           stateCode: 'MP', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Patna',            stateCode: 'BR', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Bhubaneswar',      stateCode: 'OR', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
  ]
  await prisma.city.createMany({
    data:          cities.map(c => ({ ...c, status: 'ACTIVE', isActive: true })),
    skipDuplicates: true,
  })
  console.log(`✓ ${cities.length} Indian cities`)

  // Currencies
  const currencies = [
    { code: 'INR', name: 'Indian Rupee',      symbol: '₹',   exchangeRate: 1,      isBase: true  },
    { code: 'USD', name: 'US Dollar',         symbol: '$',   exchangeRate: 0.012,  isBase: false },
    { code: 'EUR', name: 'Euro',              symbol: '€',   exchangeRate: 0.011,  isBase: false },
    { code: 'GBP', name: 'British Pound',     symbol: '£',   exchangeRate: 0.0095, isBase: false },
    { code: 'AED', name: 'UAE Dirham',        symbol: 'د.إ', exchangeRate: 0.044,  isBase: false },
    { code: 'SGD', name: 'Singapore Dollar',  symbol: 'S$',  exchangeRate: 0.016,  isBase: false },
  ]
  for (const c of currencies) {
    await prisma.currency.upsert({ where: { code: c.code }, update: {}, create: c })
  }
  console.log(`✓ ${currencies.length} currencies`)

  // Tax regimes — seeded globally
  const taxRegimes = [
    { code: 'GST-IN', name: 'India GST',        countryCode: 'IN', regimeType: 'GST',         requiresGstin: true,  requiresVat: false, requiresPan: true,  tdsApplicable: true,  vatRate: null, currencyCode: 'INR' },
    { code: 'VAT-AE', name: 'UAE VAT 5%',        countryCode: 'AE', regimeType: 'VAT',         requiresGstin: false, requiresVat: true,  requiresPan: false, tdsApplicable: false, vatRate: 5,    currencyCode: 'AED' },
    { code: 'VAT-GB', name: 'UK VAT 20%',         countryCode: 'GB', regimeType: 'VAT',         requiresGstin: false, requiresVat: true,  requiresPan: false, tdsApplicable: false, vatRate: 20,   currencyCode: 'GBP' },
    { code: 'VAT-DE', name: 'Germany VAT 19%',    countryCode: 'DE', regimeType: 'VAT',         requiresGstin: false, requiresVat: true,  requiresPan: false, tdsApplicable: false, vatRate: 19,   currencyCode: 'EUR' },
    { code: 'VAT-SG', name: 'Singapore GST 9%',   countryCode: 'SG', regimeType: 'VAT',         requiresGstin: false, requiresVat: true,  requiresPan: false, tdsApplicable: false, vatRate: 9,    currencyCode: 'SGD' },
    { code: 'WHT-US', name: 'US Withholding Tax', countryCode: 'US', regimeType: 'WITHHOLDING', requiresGstin: false, requiresVat: false, requiresPan: false, tdsApplicable: false, vatRate: null, currencyCode: 'USD' },
    { code: 'NONE',   name: 'No Tax / Exempt',    countryCode: '',   regimeType: 'NONE',        requiresGstin: false, requiresVat: false, requiresPan: false, tdsApplicable: false, vatRate: null, currencyCode: 'USD' },
  ]
  for (const tr of taxRegimes) {
    await prisma.taxRegime.upsert({
      where:  { tenantId_code: { tenantId: tenant.id, code: tr.code } },
      update: {},
      create: { tenantId, ...tr, isActive: true, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${taxRegimes.length} tax regimes`)

  // Current financial year
  await prisma.financialYear.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'FY2025-26' } },
    update: {},
    create: {
      tenantId, code: 'FY2025-26', name: 'FY 2025-26',
      startDate: new Date('2025-04-01'),
      endDate:   new Date('2026-03-31'),
      isCurrent: true, isActive: true, status: 'ACTIVE',
    },
  })
  console.log('✓ Financial year FY2025-26')

  // Default entity
  await prisma.entity.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'PTPL' } },
    update: {},
    create: {
      tenantId, code: 'PTPL',
      name: 'Procinix Technologies Pvt Ltd',
      gstin: '27AABCP1234R1ZV', pan: 'AABCP1234R',
      city: 'Mumbai', state: 'Maharashtra',
      isActive: true, status: 'ACTIVE',
    },
  })
  console.log('✓ Default entity')

  // Designations
  const designations = [
    { code: 'MD',  name: 'Managing Director',      level: 1 },
    { code: 'CEO', name: 'Chief Executive Officer', level: 1 },
    { code: 'CFO', name: 'Chief Financial Officer', level: 2 },
    { code: 'VP',  name: 'Vice President',          level: 3 },
    { code: 'MGR', name: 'Manager',                 level: 4 },
    { code: 'SR',  name: 'Senior Executive',        level: 5 },
    { code: 'EXE', name: 'Executive',               level: 6 },
  ]
  for (const d of designations) {
    await prisma.designation.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: d.code } },
      update: {},
      create: { tenantId, ...d, isActive: true, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${designations.length} designations`)

  // Default workflow rules
  const workflows = [
    { code: 'INV-STD', name: 'Invoice Standard',   module: 'INVOICE', amountFrom: 0,      amountTo: 100000,  levels: 1 },
    { code: 'INV-MID', name: 'Invoice Mid-value',  module: 'INVOICE', amountFrom: 100001, amountTo: 500000,  levels: 2 },
    { code: 'INV-HGH', name: 'Invoice High-value', module: 'INVOICE', amountFrom: 500001, amountTo: null,    levels: 3 },
    { code: 'PAY-STD', name: 'Payment Standard',   module: 'PAYMENT', amountFrom: 0,      amountTo: 500000,  levels: 1 },
    { code: 'PAY-HGH', name: 'Payment High-value', module: 'PAYMENT', amountFrom: 500001, amountTo: null,    levels: 2 },
    { code: 'VND-NEW', name: 'New Vendor Approval', module: 'VENDOR',  amountFrom: null,   amountTo: null,    levels: 2 },
  ]
  for (const w of workflows) {
    await prisma.workflowRule.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: w.code } },
      update: {},
      create: { tenantId, ...w, isActive: true, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${workflows.length} workflow rules`)

  // FX rates vs INR base
  const fxRates = [
    { fromCurrency: 'INR', toCurrency: 'USD', rate: 0.012,  source: 'MANUAL' },
    { fromCurrency: 'INR', toCurrency: 'EUR', rate: 0.011,  source: 'MANUAL' },
    { fromCurrency: 'INR', toCurrency: 'GBP', rate: 0.0095, source: 'MANUAL' },
    { fromCurrency: 'INR', toCurrency: 'AED', rate: 0.044,  source: 'MANUAL' },
    { fromCurrency: 'INR', toCurrency: 'SGD', rate: 0.016,  source: 'MANUAL' },
    { fromCurrency: 'USD', toCurrency: 'INR', rate: 83.5,   source: 'MANUAL' },
    { fromCurrency: 'AED', toCurrency: 'INR', rate: 22.7,   source: 'MANUAL' },
    { fromCurrency: 'GBP', toCurrency: 'INR', rate: 105.2,  source: 'MANUAL' },
  ]
  for (const fx of fxRates) {
    await prisma.fxRate.create({
      data: { ...fx, effectiveDate: new Date('2025-04-01'), status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${fxRates.length} FX rates`)

  // Vendor Categories
  const vendorCategories = [
    { code: 'IT',  name: 'IT & Technology' },
    { code: 'LOG', name: 'Logistics & Supply Chain' },
    { code: 'MKT', name: 'Marketing & Advertising' },
    { code: 'LEG', name: 'Legal & Compliance' },
    { code: 'FAC', name: 'Facilities & Admin' },
    { code: 'MFG', name: 'Manufacturing & Production' },
    { code: 'PRO', name: 'Professional Services' },
    { code: 'FIN', name: 'Finance & Accounting' },
    { code: 'HR',  name: 'HR & Staffing' },
    { code: 'OTH', name: 'Others' },
  ]
  for (const c of vendorCategories) {
    await prisma.vendorCategory.upsert({
      where:  { tenantId_code: { tenantId: tenant.id, code: c.code } },
      update: {},
      create: { ...c, tenantId: tenant.id, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${vendorCategories.length} vendor categories`)

  // Vendor Groups
  const vendorGroups = [
    { code: 'STRATEGIC', name: 'Strategic Partners' },
    { code: 'PREFERRED', name: 'Preferred Vendors' },
    { code: 'APPROVED',  name: 'Approved Vendors' },
    { code: 'ONE_TIME',  name: 'One-time Vendors' },
    { code: 'BLACKLIST', name: 'Blacklisted' },
  ]
  for (const g of vendorGroups) {
    await prisma.vendorGroup.upsert({
      where:  { tenantId_code: { tenantId: tenant.id, code: g.code } },
      update: {},
      create: { ...g, tenantId: tenant.id, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${vendorGroups.length} vendor groups`)

  // Profit Centres (entity-scoped — seed for PTPL)
  const ptpl = await prisma.entity.findFirst({ where: { tenantId: tenant.id } })
  if (ptpl) {
    const profitCentres = [
      { code: 'PC-CORP',  name: 'Corporate' },
      { code: 'PC-TECH',  name: 'Technology' },
      { code: 'PC-OPS',   name: 'Operations' },
      { code: 'PC-SALES', name: 'Sales & Marketing' },
      { code: 'PC-FIN',   name: 'Finance' },
    ]
    for (const pc of profitCentres) {
      await prisma.profitCentre.upsert({
        where:  { tenantId_entityId_code: { tenantId: tenant.id, entityId: ptpl.id, code: pc.code } },
        update: {},
        create: { ...pc, tenantId: tenant.id, entityId: ptpl.id, status: 'ACTIVE' },
      })
    }
    console.log(`✓ ${profitCentres.length} profit centres`)
  }

  // Ensure all seeded records have status=ACTIVE
  await prisma.$executeRaw`UPDATE countries    SET status='ACTIVE' WHERE status IS NULL OR status=''`
  await prisma.$executeRaw`UPDATE states       SET status='ACTIVE' WHERE status IS NULL OR status=''`
  await prisma.$executeRaw`UPDATE cities       SET status='ACTIVE' WHERE status IS NULL OR status=''`
  await prisma.$executeRaw`UPDATE currencies   SET status='ACTIVE' WHERE status IS NULL OR status=''`
  console.log('✓ Status normalised on all seeded records')

  // Tenant modules + features
  const MODULE_FEATURES: Record<string, string[]> = {
    INVOICE:  ['UPLOAD', 'OCR', 'EMAIL_INGEST', 'STP', 'MATCH_SCORING', 'EINVOICE'],
    VENDOR:   ['KYC', 'PORTAL', '206AB', 'MSME', 'ERP_SYNC'],
    PAYMENT:  ['TRANSBNK', 'TDS', 'BATCH', 'CHALLAN'],
    WORKFLOW: ['DYNAMIC', 'CHAT', 'SLA'],
    PR:       ['CREATE', 'APPROVE', 'CONVERT_PO'],
    PO:       ['CREATE', 'APPROVE', 'GRN'],
    GRN:      ['CREATE', 'APPROVE'],
    REPORTS:  ['AP_AGING', 'SPEND', 'TDS_SUMMARY'],
  }
  for (const [moduleCode, features] of Object.entries(MODULE_FEATURES)) {
    await prisma.tenantModule.upsert({
      where:  { tenantId_moduleCode: { tenantId: tenant.id, moduleCode } },
      update: { isEnabled: true },
      create: { tenantId: tenant.id, moduleCode, isEnabled: true },
    })
    for (const featureCode of features) {
      await prisma.tenantFeature.upsert({
        where:  { tenantId_moduleCode_featureCode: { tenantId: tenant.id, moduleCode, featureCode } },
        update: { isEnabled: true },
        create: { tenantId: tenant.id, moduleCode, featureCode, isEnabled: true },
      })
    }
  }
  console.log('✓ Tenant modules + features seeded')

  // Set super admin role on seed user
  await prisma.user.update({
    where: { tenantId_email: { tenantId: tenant.id, email: 'mithilesh@procinix.ai' } },
    data:  { role: 'SUPER_ADMIN' },
  })
  console.log('✓ Super admin role set')

  console.log('\n✅ Seed complete.')
  console.log('   Login: mithilesh@procinix.ai / Demo@123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
