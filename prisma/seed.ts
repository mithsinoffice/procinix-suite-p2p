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

  // Item Categories
  const itemCategories = [
    { code: 'IT-HW',    name: 'IT Hardware & Infrastructure' },
    { code: 'IT-SW',    name: 'IT Software & Licenses'       },
    { code: 'IT-SVC',   name: 'IT Services & AMC'            },
    { code: 'PROF',     name: 'Professional Services'        },
    { code: 'LEGAL',    name: 'Legal & Compliance'           },
    { code: 'AUDIT',    name: 'Audit & Assurance'            },
    { code: 'HR',       name: 'HR & Training'                },
    { code: 'MKT',      name: 'Marketing & Communications'   },
    { code: 'FAC',      name: 'Premises & Facilities'        },
    { code: 'SEC',      name: 'Security Services'            },
    { code: 'UTIL',     name: 'Utilities'                    },
    { code: 'BANK-OPS', name: 'Banking Operations'           },
    { code: 'INSUR',    name: 'Insurance'                    },
    { code: 'PRINT',    name: 'Printing & Stationery'        },
    { code: 'MISC',     name: 'Miscellaneous'                },
  ]
  for (const c of itemCategories) {
    await prisma.itemCategory.upsert({
      where:  { tenantId_code: { tenantId: tenant.id, code: c.code } },
      update: {},
      create: { ...c, tenantId: tenant.id, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${itemCategories.length} item categories`)

  // Item Master — 30 banking items
  const items: any[] = [
    // SERVICES — OPEX
    { itemCode:'ITM-0001', name:'Core Banking Software License',  itemType:'SERVICES', expenseType:'OPEX',  nature:'SUBSCRIPTION',  sacCode:'998314', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'core banking, CBS license, software license', ocrMatchConfidence:85 },
    { itemCode:'ITM-0002', name:'IT AMC - Servers',               itemType:'SERVICES', expenseType:'OPEX',  nature:'MAINTENANCE',   sacCode:'998314', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'annual maintenance, AMC, server maintenance', ocrMatchConfidence:80 },
    { itemCode:'ITM-0003', name:'Cloud Hosting AWS/Azure',        itemType:'SERVICES', expenseType:'OPEX',  nature:'SUBSCRIPTION',  sacCode:'998315', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'cloud hosting, AWS, Azure, cloud services', ocrMatchConfidence:85 },
    { itemCode:'ITM-0004', name:'Legal Retainer',                 itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'998211', gstRate:18, rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'legal retainer, legal fees, advocate fees, solicitor', ocrMatchConfidence:80 },
    { itemCode:'ITM-0005', name:'Statutory Audit Fees',           itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'998221', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'QUARTERLY', ocrKeywords:'statutory audit, audit fees, CA fees', ocrMatchConfidence:85 },
    { itemCode:'ITM-0006', name:'Internal Audit Services',        itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'998221', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'internal audit, audit services', ocrMatchConfidence:80 },
    { itemCode:'ITM-0007', name:'Security Services',              itemType:'SERVICES', expenseType:'OPEX',  nature:'MAINTENANCE',   sacCode:'998523', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'security guard, security services, manpower', ocrMatchConfidence:80 },
    { itemCode:'ITM-0008', name:'Housekeeping Services',          itemType:'SERVICES', expenseType:'OPEX',  nature:'MAINTENANCE',   sacCode:'998531', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'housekeeping, cleaning services, facility management', ocrMatchConfidence:80 },
    { itemCode:'ITM-0009', name:'Office Rent',                    itemType:'SERVICES', expenseType:'OPEX',  nature:'UTILITY',       sacCode:'997211', gstRate:18, rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'rent, office rent, lease rent, rental charges', ocrMatchConfidence:90 },
    { itemCode:'ITM-0010', name:'Training & Development',         itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'999293', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'training, development, workshop, seminar', ocrMatchConfidence:75 },
    { itemCode:'ITM-0011', name:'Recruitment Services',           itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'998511', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'recruitment, placement, staffing, headhunting', ocrMatchConfidence:80 },
    { itemCode:'ITM-0012', name:'Advertising & Marketing',        itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'998361', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'advertising, marketing, media, campaign, digital marketing', ocrMatchConfidence:80 },
    { itemCode:'ITM-0013', name:'Telecom & Internet',             itemType:'SERVICES', expenseType:'OPEX',  nature:'UTILITY',       sacCode:'998422', gstRate:18, rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'telecom, internet, broadband, phone bill, mobile bill', ocrMatchConfidence:85 },
    { itemCode:'ITM-0014', name:'Electricity',                    itemType:'SERVICES', expenseType:'OPEX',  nature:'UTILITY',       sacCode:'998911', gstRate:0,  rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'electricity, power bill, MSEDCL, BESCOM, TATA power', ocrMatchConfidence:90 },
    { itemCode:'ITM-0015', name:'Insurance Premium - Property',   itemType:'SERVICES', expenseType:'OPEX',  nature:'SUBSCRIPTION',  sacCode:'997137', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'insurance premium, property insurance, fire insurance', ocrMatchConfidence:85 },
    { itemCode:'ITM-0016', name:'Insurance Premium - D&O',        itemType:'SERVICES', expenseType:'OPEX',  nature:'SUBSCRIPTION',  sacCode:'997137', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'directors officers insurance, D&O insurance, liability insurance', ocrMatchConfidence:85 },
    { itemCode:'ITM-0017', name:'SWIFT Charges',                  itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'997119', gstRate:18, rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'SWIFT, wire transfer charges, correspondent bank charges', ocrMatchConfidence:90 },
    { itemCode:'ITM-0018', name:'RBI Regulatory Fees',            itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'997119', gstRate:0,  rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'QUARTERLY', ocrKeywords:'RBI fees, regulatory fees, SEBI fees, compliance fees', ocrMatchConfidence:90 },
    { itemCode:'ITM-0019', name:'Printing & Stationery',          itemType:'GOODS',    expenseType:'OPEX',  nature:'CONSUMABLE',    hsnCode:'48219',  gstRate:12, rcmApplicable:false, poRequired:'CONDITIONAL', poThresholdAmount:50000, threeWayMatch:true, grnRequired:true, provisionRequired:false, ocrKeywords:'stationery, printing, paper, toner', ocrMatchConfidence:75 },
    { itemCode:'ITM-0020', name:'Office Supplies',                itemType:'GOODS',    expenseType:'OPEX',  nature:'CONSUMABLE',    hsnCode:'48219',  gstRate:12, rcmApplicable:false, poRequired:'CONDITIONAL', poThresholdAmount:25000, threeWayMatch:true, grnRequired:true, provisionRequired:false, ocrKeywords:'office supplies, consumables, stationery items', ocrMatchConfidence:70 },
    // CAPEX — Fixed Assets
    { itemCode:'ITM-0021', name:'Laptop / Desktop Computer',      itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'84713',  gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:true,  grnRequired:true,  usefulLifeYears:3,  depreciationMethod:'SLM', depreciationRate:33.33, residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000, autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'laptop, desktop, computer, notebook', ocrMatchConfidence:85 },
    { itemCode:'ITM-0022', name:'Server & Network Equipment',     itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'84715',  gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:true,  grnRequired:true,  usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000, autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'server, network equipment, router, switch, firewall', ocrMatchConfidence:85 },
    { itemCode:'ITM-0023', name:'UPS & Power Equipment',          itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'85044',  gstRate:28, rcmApplicable:false, poRequired:'YES',  threeWayMatch:true,  grnRequired:true,  usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000, autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'UPS, inverter, power backup, stabilizer', ocrMatchConfidence:85 },
    { itemCode:'ITM-0024', name:'CCTV & Security Systems',        itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'85258',  gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:true,  grnRequired:true,  usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000, autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'CCTV, surveillance, security camera, access control', ocrMatchConfidence:85 },
    { itemCode:'ITM-0025', name:'Office Furniture',               itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'94032',  gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:true,  grnRequired:true,  usefulLifeYears:10, depreciationMethod:'SLM', depreciationRate:10,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000, autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'furniture, chairs, table, workstation, cabin', ocrMatchConfidence:80 },
    { itemCode:'ITM-0026', name:'Air Conditioner',                itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'84159',  gstRate:28, rcmApplicable:false, poRequired:'YES',  threeWayMatch:true,  grnRequired:true,  usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000, autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'air conditioner, AC, HVAC, split AC', ocrMatchConfidence:85 },
    { itemCode:'ITM-0027', name:'Vehicle',                        itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'87120',  gstRate:28, rcmApplicable:false, poRequired:'YES',  threeWayMatch:true,  grnRequired:true,  usefulLifeYears:8,  depreciationMethod:'WDV', depreciationRate:18.75, residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000, autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'vehicle, car, automobile, transport vehicle', ocrMatchConfidence:85 },
    { itemCode:'ITM-0028', name:'ATM Machine',                    itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'84721',  gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:true,  grnRequired:true,  usefulLifeYears:7,  depreciationMethod:'SLM', depreciationRate:14.29, residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000, autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'ATM, cash dispenser, automated teller machine', ocrMatchConfidence:90 },
    { itemCode:'ITM-0029', name:'Core Banking Software (CAPEX)',  itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'85234',  gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:0, autoCreateAsset:true, capitalisationLimit:100000, autoPostDepreciation:false, ocrKeywords:'core banking system, CBS implementation, software implementation', ocrMatchConfidence:85 },
    { itemCode:'ITM-0030', name:'Printing Machine / Copier',      itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'84433',  gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:true,  grnRequired:true,  usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000, autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'printer, copier, photocopier, MFD, multifunction device', ocrMatchConfidence:85 },
  ]
  for (const item of items) {
    const { gstRate, depreciationRate, residualValuePct, poThresholdAmount, capitalisationLimit, ...rest } = item
    await prisma.itemMaster.upsert({
      where:  { tenantId_itemCode: { tenantId: tenant.id, itemCode: item.itemCode } },
      update: {},
      create: {
        ...rest,
        tenantId: tenant.id,
        status:   'ACTIVE',
        gstRate:             gstRate           != null ? gstRate           : null,
        depreciationRate:    depreciationRate   != null ? depreciationRate  : null,
        residualValuePct:    residualValuePct   != null ? residualValuePct  : null,
        poThresholdAmount:   poThresholdAmount  != null ? poThresholdAmount : null,
        capitalisationLimit: capitalisationLimit != null ? capitalisationLimit : null,
      },
    })
  }
  console.log(`✓ ${items.length} items seeded`)

  // Item entity mappings for PTPL
  const defaultEntity = await prisma.entity.findFirst({ where: { tenantId: tenant.id }, select: { id: true } })
  if (defaultEntity) {
    const glCodes = await prisma.glCode.findMany({ where: { tenantId: tenant.id }, select: { id: true, code: true } })
    const gl = (code: string) => glCodes.find(g => g.code === code)?.id ?? null

    const cc = await prisma.costCentre.findUnique({ where: { tenantId_code: { tenantId: tenant.id, code: 'CC-CORP' } }, select: { id: true } })
    const pc = await prisma.profitCentre.findFirst({ where: { tenantId: tenant.id, entityId: defaultEntity.id, code: 'PC-CORP' }, select: { id: true } })

    const itemMaps = await prisma.itemMaster.findMany({ where: { tenantId: tenant.id }, select: { id: true, itemCode: true, expenseType: true, rcmApplicable: true, provisionRequired: true, poRequired: true, poThresholdAmount: true } })
    for (const item of itemMaps) {
      const isCapex = item.expenseType === 'CAPEX'
      await prisma.itemEntityMapping.upsert({
        where:  { itemId_entityId: { itemId: item.id, entityId: defaultEntity.id } },
        update: {},
        create: {
          itemId:                    item.id,
          entityId:                  defaultEntity.id,
          itemDescription:           item.itemCode,
          expenseGlCodeId:           !isCapex ? gl('5001') : null,
          assetGlCodeId:             isCapex ? gl('1001') : null,
          depreciationGlCodeId:      isCapex ? gl('5001') : null,
          accumulatedDepnGlCodeId:   isCapex ? gl('1001') : null,
          provisionGlCodeId:         item.provisionRequired ? gl('5002') : null,
          provisionExpenseGlCodeId:  item.provisionRequired ? gl('5001') : null,
          rcmGlCodeId:               item.rcmApplicable ? gl('2001') : null,
          tdsPayableGlCodeId:        gl('2001'),
          gstItcGlCodeId:            gl('1001'),
          costCentreId:              cc?.id ?? null,
          profitCentreId:            pc?.id ?? null,
          assetCategoryId:           isCapex ? 'ASSET-DEFAULT' : null,
          poThresholdOverride:       item.poRequired === 'CONDITIONAL' && item.poThresholdAmount != null ? item.poThresholdAmount : null,
          capitalisationLimitOverride: isCapex ? 5000 : null,
          provisionAmountOverride:   item.provisionRequired ? 0 : null,
          isActive:                  true,
        },
      })
    }
    console.log(`✓ ${itemMaps.length} PTPL item entity mappings seeded`)
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
