// Demo seed — creates tenant + admin user for development
// Run: npm run db:seed

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding demo data...')

  // ── Tenant ──────────────────────────────────────────────────────────────────
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

  // ── Admin user ───────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo@123', 12)
  const admin = await prisma.user.upsert({
    where:  { tenantId_email: { tenantId, email: 'mithilesh@procinix.ai' } },
    update: { passwordHash },
    create: {
      tenantId,
      email:        'mithilesh@procinix.ai',
      passwordHash,
      name:         'Mithilesh',
      role:         'ADMIN',
      isActive:     true,
    },
  })
  console.log(`✓ User: ${admin.email} (role: ${admin.role})`)

  // ── Departments ──────────────────────────────────────────────────────────────
  const depts = [
    { code: 'FIN',    name: 'Finance & Accounts'     },
    { code: 'IT',     name: 'Information Technology'  },
    { code: 'OPS',    name: 'Banking Operations'      },
    { code: 'HR',     name: 'Human Resources'         },
    { code: 'MKT',    name: 'Marketing'               },
    { code: 'LEGAL',  name: 'Legal & Compliance'      },
    { code: 'RISK',   name: 'Risk Management'         },
    { code: 'AUDIT',  name: 'Internal Audit'          },
    { code: 'TECH',   name: 'Technology & Innovation' },
    { code: 'ADMIN',  name: 'Administration'          },
  ]
  for (const d of depts) {
    await prisma.department.upsert({
      where:  { tenantId_code: { tenantId, code: d.code } },
      update: {},
      create: { tenantId, ...d, isActive: true },
    })
  }
  console.log(`✓ ${depts.length} departments`)

  // ── GL Codes — full banking chart of accounts (50) ───────────────────────────
  const glCodeData = [
    // ─ Current Assets ─
    { code: '1001', name: 'Cash & Cash Equivalents',          accountType: 'ASSET' },
    { code: '1002', name: 'Bank Current Account — HDFC',      accountType: 'ASSET' },
    { code: '1003', name: 'Bank Current Account — SBI',       accountType: 'ASSET' },
    { code: '1050', name: 'GST Input Tax Credit',             accountType: 'ASSET' },
    { code: '1051', name: 'TDS Receivable',                   accountType: 'ASSET' },
    { code: '1052', name: 'Advance to Vendors',               accountType: 'ASSET' },
    // ─ Fixed Assets ─
    { code: '1100', name: 'Computer Equipment',               accountType: 'ASSET' },
    { code: '1101', name: 'Accumulated Depn — Computer',      accountType: 'ASSET' },
    { code: '1102', name: 'Furniture & Fixtures',             accountType: 'ASSET' },
    { code: '1103', name: 'Accumulated Depn — Furniture',     accountType: 'ASSET' },
    { code: '1104', name: 'Office Equipment',                 accountType: 'ASSET' },
    { code: '1105', name: 'Accumulated Depn — Office Equip',  accountType: 'ASSET' },
    { code: '1106', name: 'Vehicles',                         accountType: 'ASSET' },
    { code: '1107', name: 'Accumulated Depn — Vehicles',      accountType: 'ASSET' },
    { code: '1108', name: 'ATM Machines',                     accountType: 'ASSET' },
    { code: '1109', name: 'Accumulated Depn — ATM',           accountType: 'ASSET' },
    // ─ Current Liabilities ─
    { code: '2001', name: 'Provision for Expenses',           accountType: 'LIABILITY' },
    { code: '2002', name: 'Provision for Rent',               accountType: 'LIABILITY' },
    { code: '2003', name: 'Provision for Audit Fees',         accountType: 'LIABILITY' },
    { code: '2004', name: 'Provision for Legal Fees',         accountType: 'LIABILITY' },
    { code: '2010', name: 'TDS Payable — 194C',               accountType: 'LIABILITY' },
    { code: '2011', name: 'TDS Payable — 194I',               accountType: 'LIABILITY' },
    { code: '2012', name: 'TDS Payable — 194J',               accountType: 'LIABILITY' },
    { code: '2013', name: 'TDS Payable — 194Q',               accountType: 'LIABILITY' },
    { code: '2020', name: 'GST RCM Liability',                accountType: 'LIABILITY' },
    { code: '2021', name: 'CGST Payable',                     accountType: 'LIABILITY' },
    { code: '2022', name: 'SGST Payable',                     accountType: 'LIABILITY' },
    { code: '2023', name: 'IGST Payable',                     accountType: 'LIABILITY' },
    { code: '2030', name: 'Accounts Payable — IT Vendors',    accountType: 'LIABILITY' },
    { code: '2031', name: 'Accounts Payable — Services',      accountType: 'LIABILITY' },
    { code: '2032', name: 'Accounts Payable — Rent',          accountType: 'LIABILITY' },
    // ─ Expenses ─
    { code: '5001', name: 'IT Services & Software',           accountType: 'EXPENSE' },
    { code: '5002', name: 'IT Hardware & Equipment',          accountType: 'EXPENSE' },
    { code: '5003', name: 'AMC & Maintenance',                accountType: 'EXPENSE' },
    { code: '5010', name: 'Office Rent',                      accountType: 'EXPENSE' },
    { code: '5011', name: 'Electricity & Utilities',          accountType: 'EXPENSE' },
    { code: '5012', name: 'Telecom & Internet',               accountType: 'EXPENSE' },
    { code: '5020', name: 'Security Services',                accountType: 'EXPENSE' },
    { code: '5021', name: 'Housekeeping & Facility',          accountType: 'EXPENSE' },
    { code: '5030', name: 'Legal & Professional Fees',        accountType: 'EXPENSE' },
    { code: '5031', name: 'Audit Fees',                       accountType: 'EXPENSE' },
    { code: '5032', name: 'Consulting Fees',                  accountType: 'EXPENSE' },
    { code: '5040', name: 'Marketing & Advertising',          accountType: 'EXPENSE' },
    { code: '5041', name: 'Printing & Stationery',            accountType: 'EXPENSE' },
    { code: '5050', name: 'HR & Training',                    accountType: 'EXPENSE' },
    { code: '5051', name: 'Recruitment Expenses',             accountType: 'EXPENSE' },
    { code: '5060', name: 'Insurance Premium',                accountType: 'EXPENSE' },
    { code: '5070', name: 'Depreciation — IT',                accountType: 'EXPENSE' },
    { code: '5071', name: 'Depreciation — Furniture',         accountType: 'EXPENSE' },
    { code: '5072', name: 'Depreciation — Vehicles',          accountType: 'EXPENSE' },
    { code: '5080', name: 'Miscellaneous Expenses',           accountType: 'EXPENSE' },
  ]
  for (const gl of glCodeData) {
    await prisma.glCode.upsert({
      where:  { tenantId_code: { tenantId, code: gl.code } },
      update: { name: gl.name },
      create: { tenantId, ...gl, isActive: true, status: 'ACTIVE' },
    })
  }
  // Build lookup after upsert
  const allGlCodes = await prisma.glCode.findMany({ where: { tenantId }, select: { id: true, code: true } })
  const gl = (code: string) => allGlCodes.find(g => g.code === code)?.id ?? null
  console.log(`✓ ${glCodeData.length} GL codes`)

  // ── Cost Centres — 10 banking departments ────────────────────────────────────
  const costCentres = [
    { code: 'CC-CORP',  name: 'Corporate Office'           },
    { code: 'CC-IT',    name: 'Information Technology'     },
    { code: 'CC-OPS',   name: 'Banking Operations'         },
    { code: 'CC-FIN',   name: 'Finance & Accounts'         },
    { code: 'CC-HR',    name: 'Human Resources'            },
    { code: 'CC-LEGAL', name: 'Legal & Compliance'         },
    { code: 'CC-MKT',   name: 'Marketing & Communications' },
    { code: 'CC-RISK',  name: 'Risk Management'            },
    { code: 'CC-TECH',  name: 'Technology & Innovation'    },
    { code: 'CC-AUDIT', name: 'Internal Audit'             },
  ]
  for (const cc of costCentres) {
    await prisma.costCentre.upsert({
      where:  { tenantId_code: { tenantId, code: cc.code } },
      update: {},
      create: { tenantId, ...cc, isActive: true, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${costCentres.length} cost centres`)

  // ── Tax Codes ────────────────────────────────────────────────────────────────
  const taxCodes = [
    { code: 'GST0',   description: 'GST Exempt / Nil rated',          cgstRate: 0,   sgstRate: 0,   igstRate: 0  },
    { code: 'GST5',   description: 'GST 5%',                          cgstRate: 2.5, sgstRate: 2.5, igstRate: 5  },
    { code: 'GST12',  description: 'GST 12%',                         cgstRate: 6,   sgstRate: 6,   igstRate: 12 },
    { code: 'GST18',  description: 'GST 18% — most services',         cgstRate: 9,   sgstRate: 9,   igstRate: 18 },
    { code: 'GST28',  description: 'GST 28% — luxury goods',          cgstRate: 14,  sgstRate: 14,  igstRate: 28 },
    { code: 'RCM18',  description: 'GST 18% — Reverse Charge (RCM)',  cgstRate: 9,   sgstRate: 9,   igstRate: 18 },
    { code: 'TDS2',   description: 'TDS 2% — 194C contractors',       cgstRate: 0,   sgstRate: 0,   igstRate: 0  },
    { code: 'TDS10',  description: 'TDS 10% — 194J professional',     cgstRate: 0,   sgstRate: 0,   igstRate: 0  },
  ]
  for (const tc of taxCodes) {
    await prisma.taxCode.upsert({
      where:  { tenantId_code: { tenantId, code: tc.code } },
      update: {},
      create: { tenantId, ...tc, isActive: true, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${taxCodes.length} tax codes`)

  // ── Countries ────────────────────────────────────────────────────────────────
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

  // ── Indian States ────────────────────────────────────────────────────────────
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
      where:  { code_countryCode: { code: s.code, countryCode: 'IN' } },
      update: {},
      create: { ...s, countryCode: 'IN' },
    })
  }
  console.log(`✓ ${states.length} Indian states`)

  // ── Major Indian Cities ──────────────────────────────────────────────────────
  const cities = [
    { name: 'Mumbai',             stateCode: 'MH', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Pune',               stateCode: 'MH', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Nagpur',             stateCode: 'MH', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'New Delhi',          stateCode: 'DL', countryCode: 'IN', isCapital: true,  isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Bangalore',          stateCode: 'KA', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Chennai',            stateCode: 'TN', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Coimbatore',         stateCode: 'TN', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Ahmedabad',          stateCode: 'GJ', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Surat',              stateCode: 'GJ', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Jaipur',             stateCode: 'RJ', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Lucknow',            stateCode: 'UP', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Kanpur',             stateCode: 'UP', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Kolkata',            stateCode: 'WB', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Hyderabad',          stateCode: 'TS', countryCode: 'IN', isCapital: false, isMetro: true,  timezone: 'Asia/Kolkata' },
    { name: 'Visakhapatnam',      stateCode: 'AP', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Kochi',              stateCode: 'KL', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Thiruvananthapuram', stateCode: 'KL', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Chandigarh',         stateCode: 'PB', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Gurugram',           stateCode: 'HR', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Faridabad',          stateCode: 'HR', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Indore',             stateCode: 'MP', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Bhopal',             stateCode: 'MP', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Patna',              stateCode: 'BR', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
    { name: 'Bhubaneswar',        stateCode: 'OR', countryCode: 'IN', isCapital: false, isMetro: false, timezone: 'Asia/Kolkata' },
  ]
  await prisma.city.createMany({
    data:           cities.map(c => ({ ...c, status: 'ACTIVE', isActive: true })),
    skipDuplicates: true,
  })
  console.log(`✓ ${cities.length} Indian cities`)

  // ── Currencies ───────────────────────────────────────────────────────────────
  const currencies = [
    { code: 'INR', name: 'Indian Rupee',     symbol: '₹',   exchangeRate: 1,      isBase: true  },
    { code: 'USD', name: 'US Dollar',        symbol: '$',   exchangeRate: 0.012,  isBase: false },
    { code: 'EUR', name: 'Euro',             symbol: '€',   exchangeRate: 0.011,  isBase: false },
    { code: 'GBP', name: 'British Pound',    symbol: '£',   exchangeRate: 0.0095, isBase: false },
    { code: 'AED', name: 'UAE Dirham',       symbol: 'د.إ', exchangeRate: 0.044,  isBase: false },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$',  exchangeRate: 0.016,  isBase: false },
  ]
  for (const c of currencies) {
    await prisma.currency.upsert({ where: { code: c.code }, update: {}, create: c })
  }
  console.log(`✓ ${currencies.length} currencies`)

  // ── Tax Regimes ──────────────────────────────────────────────────────────────
  const taxRegimes = [
    { code: 'GST-IN', name: 'India GST',        countryCode: 'IN', regimeType: 'GST',         requiresGstin: true,  requiresVat: false, requiresPan: true,  tdsApplicable: true,  vatRate: null, currencyCode: 'INR' },
    { code: 'VAT-AE', name: 'UAE VAT 5%',       countryCode: 'AE', regimeType: 'VAT',         requiresGstin: false, requiresVat: true,  requiresPan: false, tdsApplicable: false, vatRate: 5,    currencyCode: 'AED' },
    { code: 'VAT-GB', name: 'UK VAT 20%',       countryCode: 'GB', regimeType: 'VAT',         requiresGstin: false, requiresVat: true,  requiresPan: false, tdsApplicable: false, vatRate: 20,   currencyCode: 'GBP' },
    { code: 'VAT-DE', name: 'Germany VAT 19%',  countryCode: 'DE', regimeType: 'VAT',         requiresGstin: false, requiresVat: true,  requiresPan: false, tdsApplicable: false, vatRate: 19,   currencyCode: 'EUR' },
    { code: 'VAT-SG', name: 'Singapore GST 9%', countryCode: 'SG', regimeType: 'VAT',         requiresGstin: false, requiresVat: true,  requiresPan: false, tdsApplicable: false, vatRate: 9,    currencyCode: 'SGD' },
    { code: 'WHT-US', name: 'US Withholding',   countryCode: 'US', regimeType: 'WITHHOLDING', requiresGstin: false, requiresVat: false, requiresPan: false, tdsApplicable: false, vatRate: null, currencyCode: 'USD' },
    { code: 'NONE',   name: 'No Tax / Exempt',  countryCode: '',   regimeType: 'NONE',        requiresGstin: false, requiresVat: false, requiresPan: false, tdsApplicable: false, vatRate: null, currencyCode: 'USD' },
  ]
  for (const tr of taxRegimes) {
    await prisma.taxRegime.upsert({
      where:  { tenantId_code: { tenantId, code: tr.code } },
      update: {},
      create: { tenantId, ...tr, isActive: true, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${taxRegimes.length} tax regimes`)

  // ── Financial Year ───────────────────────────────────────────────────────────
  await prisma.financialYear.upsert({
    where:  { tenantId_code: { tenantId, code: 'FY2025-26' } },
    update: {},
    create: {
      tenantId, code: 'FY2025-26', name: 'FY 2025-26',
      startDate: new Date('2025-04-01'),
      endDate:   new Date('2026-03-31'),
      isCurrent: true, isActive: true, status: 'ACTIVE',
    },
  })
  console.log('✓ Financial year FY2025-26')

  // ── Default Entity (PTPL) ────────────────────────────────────────────────────
  await prisma.entity.upsert({
    where:  { tenantId_code: { tenantId, code: 'PTPL' } },
    update: {},
    create: {
      tenantId, code: 'PTPL',
      name:  'Procinix Technologies Pvt Ltd',
      gstin: '27AABCP1234R1ZV', pan: 'AABCP1234R',
      city:  'Mumbai', state: 'Maharashtra',
      isActive: true, status: 'ACTIVE',
    },
  })
  const ptplEntity = await prisma.entity.findFirst({ where: { tenantId }, select: { id: true } })
  console.log('✓ Default entity PTPL')

  // ── Admin user entity access ─────────────────────────────────────────────────
  if (ptplEntity) {
    await prisma.userEntityAccess.upsert({
      where:  { userId_entityId: { userId: admin.id, entityId: ptplEntity.id } },
      update: {},
      create: {
        userId:           admin.id,
        entityId:         ptplEntity.id,
        canApprove:       true,
        approvalLimit:    10_000_000,
        canCreatePO:      true,
        canCreateInvoice: true,
        isActive:         true,
      },
    })
    console.log('✓ Admin user entity access seeded')
  }

  // ── Role privileges (RBAC) ───────────────────────────────────────────────────
  type Perms = Record<string, Record<string, boolean>>

  const MODULES = ['INTAKE', 'PO', 'GRN', 'INVOICE', 'PAYMENT', 'VENDOR', 'BUDGET', 'MASTERS', 'ADMIN'] as const
  const ACTIONS = ['create', 'view', 'edit', 'delete', 'submit', 'approve'] as const

  function noPerms(): Perms {
    return Object.fromEntries(MODULES.map(m => [m, Object.fromEntries(ACTIONS.map(a => [a, false]))]))
  }
  function allPerms(mods: readonly string[], actions: readonly string[]): Perms {
    return Object.fromEntries(MODULES.map(m =>
      [m, Object.fromEntries(ACTIONS.map(a => [a, mods.includes(m) && actions.includes(a)]))]
    ))
  }
  function merge(base: Perms, overrides: Partial<Record<string, Partial<Record<string, boolean>>>>): Perms {
    const result: Perms = JSON.parse(JSON.stringify(base))
    for (const [mod, actionMap] of Object.entries(overrides)) {
      if (!actionMap) continue
      if (!result[mod]) result[mod] = {}
      for (const [action, val] of Object.entries(actionMap)) {
        if (val !== undefined) result[mod][action] = val
      }
    }
    return result
  }

  const rolePrivileges = [
    {
      roleCode: 'AP_CLERK', roleName: 'AP Clerk', isSystem: true,
      description: 'Creates and submits invoices, PRs and GRNs. Cannot approve.',
      permissions: merge(noPerms(), {
        INTAKE:  { create: true, view: true, edit: true, submit: true },
        INVOICE: { create: true, view: true, edit: true, submit: true },
        GRN:     { create: true, view: true, edit: true, submit: true },
        VENDOR:  { view: true },
        PO:      { view: true },
        PAYMENT: { view: true },
        BUDGET:  { view: true },
      }),
    },
    {
      roleCode: 'AP_MANAGER', roleName: 'AP Manager', isSystem: true,
      description: 'Full AP operations including approvals. Manages masters.',
      permissions: merge(noPerms(), {
        INTAKE:   { create: true, view: true, edit: true, submit: true, approve: true },
        INVOICE:  { create: true, view: true, edit: true, submit: true, approve: true },
        GRN:      { create: true, view: true, edit: true, submit: true, approve: true },
        VENDOR:   { create: true, view: true, edit: true, submit: true },
        PO:       { view: true, submit: true },
        PAYMENT:  { view: true, approve: true },
        BUDGET:   { view: true },
        MASTERS:  { create: true, view: true, edit: true, approve: true },
      }),
    },
    {
      roleCode: 'PROCUREMENT_HEAD', roleName: 'Procurement Head', isSystem: true,
      description: 'Full procurement cycle — PR, PO, GRN, Vendor.',
      permissions: merge(noPerms(), {
        INTAKE:  { create: true, view: true, edit: true, submit: true, approve: true },
        PO:      { create: true, view: true, edit: true, submit: true, approve: true },
        GRN:     { create: true, view: true, edit: true, submit: true, approve: true },
        VENDOR:  { create: true, view: true, edit: true, submit: true, approve: true },
        INVOICE: { view: true, submit: true },
        BUDGET:  { view: true },
        MASTERS: { view: true },
      }),
    },
    {
      roleCode: 'FINANCE_MANAGER', roleName: 'Finance Manager', isSystem: true,
      description: 'Approves invoices and payments. Manages budgets.',
      permissions: merge(noPerms(), {
        INVOICE:  { view: true, approve: true },
        PAYMENT:  { view: true, approve: true },
        BUDGET:   { view: true, edit: true, approve: true },
        PO:       { view: true, approve: true },
        INTAKE:   { view: true, approve: true },
        VENDOR:   { view: true },
        MASTERS:  { view: true },
      }),
    },
    {
      roleCode: 'APPROVER_L1', roleName: 'Approver L1', isSystem: true,
      description: 'First-level approver for PRs, POs and invoices.',
      permissions: merge(noPerms(), {
        INTAKE:  { view: true, approve: true },
        PO:      { view: true, approve: true },
        INVOICE: { view: true, approve: true },
        PAYMENT: { view: true },
      }),
    },
    {
      roleCode: 'APPROVER_L2', roleName: 'Approver L2', isSystem: true,
      description: 'Second-level approver.',
      permissions: merge(noPerms(), {
        INTAKE:  { view: true, approve: true },
        PO:      { view: true, approve: true },
        INVOICE: { view: true, approve: true },
        PAYMENT: { view: true, approve: true },
      }),
    },
    {
      roleCode: 'APPROVER_L3', roleName: 'Approver L3', isSystem: true,
      description: 'Third-level approver — highest authority.',
      permissions: merge(noPerms(), {
        INTAKE:  { view: true, approve: true },
        PO:      { view: true, approve: true },
        INVOICE: { view: true, approve: true },
        PAYMENT: { view: true, approve: true },
        BUDGET:  { view: true, approve: true },
      }),
    },
    {
      roleCode: 'CFO', roleName: 'CFO', isSystem: true,
      description: 'Full financial authority except Admin.',
      permissions: allPerms(MODULES.filter(m => m !== 'ADMIN'), ACTIONS),
    },
    {
      roleCode: 'MD', roleName: 'MD / CEO', isSystem: true,
      description: 'Full authority except Admin.',
      permissions: allPerms(MODULES.filter(m => m !== 'ADMIN'), ACTIONS),
    },
    {
      roleCode: 'TENANT_ADMIN', roleName: 'Tenant Admin', isSystem: true,
      description: 'Full system access including masters and user management.',
      permissions: allPerms(MODULES, ACTIONS),
    },
  ]

  for (const role of rolePrivileges) {
    await prisma.rolePrivilege.upsert({
      where:  { tenantId_roleCode: { tenantId, roleCode: role.roleCode } },
      update: { roleName: role.roleName, description: role.description, permissions: role.permissions, isSystem: role.isSystem },
      create: { tenantId, ...role },
    })
  }
  console.log(`✓ ${rolePrivileges.length} role privileges seeded`)

  // Admin user → TENANT_ADMIN role on the default entity
  if (ptplEntity) {
    await prisma.userEntityRole.upsert({
      where:  { userId_entityId_roleCode: { userId: admin.id, entityId: ptplEntity.id, roleCode: 'TENANT_ADMIN' } },
      update: { isActive: true },
      create: { userId: admin.id, entityId: ptplEntity.id, roleCode: 'TENANT_ADMIN' },
    })
    console.log('✓ Admin user entity role (TENANT_ADMIN) seeded')
  }

  // ── Designations ─────────────────────────────────────────────────────────────
  const designations = [
    { code: 'MD',    name: 'Managing Director',         level: 1 },
    { code: 'CEO',   name: 'Chief Executive Officer',   level: 1 },
    { code: 'CFO',   name: 'Chief Financial Officer',   level: 2 },
    { code: 'CTO',   name: 'Chief Technology Officer',  level: 2 },
    { code: 'VP',    name: 'Vice President',            level: 3 },
    { code: 'AVP',   name: 'Assistant Vice President',  level: 4 },
    { code: 'MGR',   name: 'Manager',                   level: 5 },
    { code: 'SMGR',  name: 'Senior Manager',            level: 4 },
    { code: 'SR',    name: 'Senior Executive',          level: 6 },
    { code: 'EXE',   name: 'Executive',                 level: 7 },
    { code: 'ASST',  name: 'Assistant',                 level: 8 },
  ]
  for (const d of designations) {
    await prisma.designation.upsert({
      where:  { tenantId_code: { tenantId, code: d.code } },
      update: {},
      create: { tenantId, ...d, isActive: true, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${designations.length} designations`)

  // ── Workflow Rules (amount-tier rules for legacy workflow engine) ─────────────
  const workflowRules = [
    { code: 'INV-STD', name: 'Invoice Standard',    module: 'INVOICE', amountFrom: 0,      amountTo: 100000,  levels: 1 },
    { code: 'INV-MID', name: 'Invoice Mid-value',   module: 'INVOICE', amountFrom: 100001, amountTo: 500000,  levels: 2 },
    { code: 'INV-HGH', name: 'Invoice High-value',  module: 'INVOICE', amountFrom: 500001, amountTo: null,    levels: 3 },
    { code: 'PAY-STD', name: 'Payment Standard',    module: 'PAYMENT', amountFrom: 0,      amountTo: 500000,  levels: 1 },
    { code: 'PAY-HGH', name: 'Payment High-value',  module: 'PAYMENT', amountFrom: 500001, amountTo: null,    levels: 2 },
    { code: 'VND-NEW', name: 'New Vendor Approval',  module: 'VENDOR',  amountFrom: null,   amountTo: null,    levels: 2 },
  ]
  for (const w of workflowRules) {
    await prisma.workflowRule.upsert({
      where:  { tenantId_code: { tenantId, code: w.code } },
      update: {},
      create: { tenantId, ...w, isActive: true, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${workflowRules.length} workflow rules`)

  // ── FX Rates ─────────────────────────────────────────────────────────────────
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
  await prisma.fxRate.createMany({
    data:           fxRates.map(f => ({ ...f, effectiveDate: new Date('2025-04-01'), status: 'ACTIVE' })),
    skipDuplicates: true,
  })
  console.log(`✓ ${fxRates.length} FX rates`)

  // ── Vendor Categories ─────────────────────────────────────────────────────────
  const vendorCategories = [
    { code: 'IT',  name: 'IT & Technology'            },
    { code: 'LOG', name: 'Logistics & Supply Chain'   },
    { code: 'MKT', name: 'Marketing & Advertising'    },
    { code: 'LEG', name: 'Legal & Compliance'         },
    { code: 'FAC', name: 'Facilities & Admin'         },
    { code: 'MFG', name: 'Manufacturing & Production' },
    { code: 'PRO', name: 'Professional Services'      },
    { code: 'FIN', name: 'Finance & Accounting'       },
    { code: 'HR',  name: 'HR & Staffing'              },
    { code: 'OTH', name: 'Others'                     },
  ]
  for (const c of vendorCategories) {
    await prisma.vendorCategory.upsert({
      where:  { tenantId_code: { tenantId, code: c.code } },
      update: {},
      create: { ...c, tenantId, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${vendorCategories.length} vendor categories`)

  // ── Vendor Groups ─────────────────────────────────────────────────────────────
  const vendorGroups = [
    { code: 'STRATEGIC', name: 'Strategic Partners' },
    { code: 'PREFERRED', name: 'Preferred Vendors'  },
    { code: 'APPROVED',  name: 'Approved Vendors'   },
    { code: 'ONE_TIME',  name: 'One-time Vendors'   },
    { code: 'BLACKLIST', name: 'Blacklisted'        },
  ]
  for (const g of vendorGroups) {
    await prisma.vendorGroup.upsert({
      where:  { tenantId_code: { tenantId, code: g.code } },
      update: {},
      create: { ...g, tenantId, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${vendorGroups.length} vendor groups`)

  // ── Profit Centres — 5 banking business units ────────────────────────────────
  if (ptplEntity) {
    const profitCentres = [
      { code: 'PC-RETAIL',  name: 'Retail Banking'    },
      { code: 'PC-CORP',    name: 'Corporate Banking'  },
      { code: 'PC-WEALTH',  name: 'Wealth Management'  },
      { code: 'PC-DIGITAL', name: 'Digital Banking'    },
      { code: 'PC-OPS',     name: 'Operations'         },
    ]
    for (const pc of profitCentres) {
      await prisma.profitCentre.upsert({
        where:  { tenantId_entityId_code: { tenantId, entityId: ptplEntity.id, code: pc.code } },
        update: {},
        create: { ...pc, tenantId, entityId: ptplEntity.id, status: 'ACTIVE' },
      })
    }
    console.log(`✓ ${profitCentres.length} profit centres`)
  }

  // ── Locations — 5 office locations ───────────────────────────────────────────
  const locations = [
    { code: 'LOC-MUM-HO',  name: 'Mumbai Head Office',    locationType: 'HEAD_OFFICE', city: 'Mumbai',    state: 'MH', pincode: '400021', addressLine1: 'Nariman Point, Mumbai'          },
    { code: 'LOC-MUM-BKC', name: 'Mumbai BKC Office',     locationType: 'BRANCH',      city: 'Mumbai',    state: 'MH', pincode: '400051', addressLine1: 'Bandra Kurla Complex'           },
    { code: 'LOC-DEL-HO',  name: 'Delhi Regional Office', locationType: 'BRANCH',      city: 'New Delhi', state: 'DL', pincode: '110001', addressLine1: 'Connaught Place, New Delhi'     },
    { code: 'LOC-BLR-HO',  name: 'Bengaluru Office',      locationType: 'BRANCH',      city: 'Bengaluru', state: 'KA', pincode: '560001', addressLine1: 'MG Road, Bengaluru'             },
    { code: 'LOC-CHE-HO',  name: 'Chennai Office',        locationType: 'BRANCH',      city: 'Chennai',   state: 'TN', pincode: '600001', addressLine1: 'Anna Salai, Chennai'            },
  ]
  for (const loc of locations) {
    await prisma.location.upsert({
      where:  { tenantId_code: { tenantId, code: loc.code } },
      update: {},
      create: { tenantId, ...loc, isActive: true, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${locations.length} locations`)

  // ── TDS Sections — full 15 common sections ───────────────────────────────────
  const tdsSections = [
    { code: '194A',     section: '194A',    description: 'Interest other than interest on securities',    defaultRate: 10,  applicableTo: 'BOTH'       },
    { code: '194B',     section: '194B',    description: 'Winnings from lottery or crossword puzzle',     defaultRate: 30,  applicableTo: 'BOTH'       },
    { code: '194C',     section: '194C',    description: 'Payment to contractors — Company/Firm',        defaultRate: 2,   applicableTo: 'COMPANY'    },
    { code: '194C-IND', section: '194C',    description: 'Payment to contractors — Individual/HUF',      defaultRate: 1,   applicableTo: 'INDIVIDUAL' },
    { code: '194D',     section: '194D',    description: 'Insurance commission',                          defaultRate: 5,   applicableTo: 'BOTH'       },
    { code: '194H',     section: '194H',    description: 'Commission or brokerage',                       defaultRate: 5,   applicableTo: 'BOTH'       },
    { code: '194I',     section: '194I',    description: 'Rent — plant, machinery or equipment',          defaultRate: 2,   applicableTo: 'BOTH'       },
    { code: '194IA',    section: '194I(a)', description: 'Rent — land, building or furniture',            defaultRate: 10,  applicableTo: 'BOTH'       },
    { code: '194J',     section: '194J',    description: 'Professional or technical services fees',       defaultRate: 10,  applicableTo: 'BOTH'       },
    { code: '194J-TEC', section: '194J',    description: 'Technical services — royalty/call centre',      defaultRate: 2,   applicableTo: 'BOTH'       },
    { code: '194K',     section: '194K',    description: 'Income from mutual fund units',                 defaultRate: 10,  applicableTo: 'BOTH'       },
    { code: '194N',     section: '194N',    description: 'Cash withdrawal from bank',                     defaultRate: 2,   applicableTo: 'BOTH'       },
    { code: '194Q',     section: '194Q',    description: 'Purchase of goods above ₹50L',                 defaultRate: 0.1, applicableTo: 'COMPANY'    },
    { code: '195',      section: '195',     description: 'Payment to non-residents',                      defaultRate: 20,  applicableTo: 'BOTH'       },
    { code: '206AA',    section: '206AA',   description: 'Higher TDS — no PAN furnished',                 defaultRate: 20,  applicableTo: 'BOTH'       },
  ]
  for (const tds of tdsSections) {
    await prisma.tDSSection.upsert({
      where:  { tenantId_code: { tenantId, code: tds.code } },
      update: {},
      create: { tenantId, ...tds, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${tdsSections.length} TDS sections`)

  // ── Item Categories ───────────────────────────────────────────────────────────
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
      where:  { tenantId_code: { tenantId, code: c.code } },
      update: {},
      create: { ...c, tenantId, status: 'ACTIVE' },
    })
  }
  console.log(`✓ ${itemCategories.length} item categories`)

  // ── Item Master — 30 banking items ───────────────────────────────────────────
  const items: any[] = [
    // SERVICES — OPEX
    { itemCode:'ITM-0001', name:'Core Banking Software License',  itemType:'SERVICES', expenseType:'OPEX',  nature:'SUBSCRIPTION',  sacCode:'998314', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'core banking, CBS license, software license',                     ocrMatchConfidence:85 },
    { itemCode:'ITM-0002', name:'IT AMC - Servers',               itemType:'SERVICES', expenseType:'OPEX',  nature:'MAINTENANCE',   sacCode:'998314', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'annual maintenance, AMC, server maintenance',                    ocrMatchConfidence:80 },
    { itemCode:'ITM-0003', name:'Cloud Hosting AWS/Azure',        itemType:'SERVICES', expenseType:'OPEX',  nature:'SUBSCRIPTION',  sacCode:'998315', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'cloud hosting, AWS, Azure, cloud services',                      ocrMatchConfidence:85 },
    { itemCode:'ITM-0004', name:'Legal Retainer',                 itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'998211', gstRate:18, rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'legal retainer, legal fees, advocate fees, solicitor',           ocrMatchConfidence:80 },
    { itemCode:'ITM-0005', name:'Statutory Audit Fees',           itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'998221', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'QUARTERLY', ocrKeywords:'statutory audit, audit fees, CA fees',                           ocrMatchConfidence:85 },
    { itemCode:'ITM-0006', name:'Internal Audit Services',        itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'998221', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'internal audit, audit services',                                 ocrMatchConfidence:80 },
    { itemCode:'ITM-0007', name:'Security Services',              itemType:'SERVICES', expenseType:'OPEX',  nature:'MAINTENANCE',   sacCode:'998523', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'security guard, security services, manpower',                    ocrMatchConfidence:80 },
    { itemCode:'ITM-0008', name:'Housekeeping Services',          itemType:'SERVICES', expenseType:'OPEX',  nature:'MAINTENANCE',   sacCode:'998531', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'housekeeping, cleaning services, facility management',            ocrMatchConfidence:80 },
    { itemCode:'ITM-0009', name:'Office Rent',                    itemType:'SERVICES', expenseType:'OPEX',  nature:'UTILITY',       sacCode:'997211', gstRate:18, rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'rent, office rent, lease rent, rental charges',                  ocrMatchConfidence:90 },
    { itemCode:'ITM-0010', name:'Training & Development',         itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'999293', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'training, development, workshop, seminar',                       ocrMatchConfidence:75 },
    { itemCode:'ITM-0011', name:'Recruitment Services',           itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'998511', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'recruitment, placement, staffing, headhunting',                  ocrMatchConfidence:80 },
    { itemCode:'ITM-0012', name:'Advertising & Marketing',        itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'998361', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'advertising, marketing, media, campaign, digital marketing',     ocrMatchConfidence:80 },
    { itemCode:'ITM-0013', name:'Telecom & Internet',             itemType:'SERVICES', expenseType:'OPEX',  nature:'UTILITY',       sacCode:'998422', gstRate:18, rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'telecom, internet, broadband, phone bill, mobile bill',          ocrMatchConfidence:85 },
    { itemCode:'ITM-0014', name:'Electricity',                    itemType:'SERVICES', expenseType:'OPEX',  nature:'UTILITY',       sacCode:'998911', gstRate:0,  rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'electricity, power bill, MSEDCL, BESCOM, TATA power',           ocrMatchConfidence:90 },
    { itemCode:'ITM-0015', name:'Insurance Premium - Property',   itemType:'SERVICES', expenseType:'OPEX',  nature:'SUBSCRIPTION',  sacCode:'997137', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'insurance premium, property insurance, fire insurance',          ocrMatchConfidence:85 },
    { itemCode:'ITM-0016', name:'Insurance Premium - D&O',        itemType:'SERVICES', expenseType:'OPEX',  nature:'SUBSCRIPTION',  sacCode:'997137', gstRate:18, rcmApplicable:false, poRequired:'YES',  threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'MONTHLY',   ocrKeywords:'directors officers insurance, D&O insurance, liability insurance',ocrMatchConfidence:85 },
    { itemCode:'ITM-0017', name:'SWIFT Charges',                  itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'997119', gstRate:18, rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:false, autoPostProvision:false,                                 ocrKeywords:'SWIFT, wire transfer charges, correspondent bank charges',       ocrMatchConfidence:90 },
    { itemCode:'ITM-0018', name:'RBI Regulatory Fees',            itemType:'SERVICES', expenseType:'OPEX',  nature:'PROFESSIONAL',  sacCode:'997119', gstRate:0,  rcmApplicable:false, poRequired:'NO',   threeWayMatch:false, grnRequired:false, provisionRequired:true,  autoPostProvision:true,  provisionFrequency:'QUARTERLY', ocrKeywords:'RBI fees, regulatory fees, SEBI fees, compliance fees',         ocrMatchConfidence:90 },
    { itemCode:'ITM-0019', name:'Printing & Stationery',          itemType:'GOODS',    expenseType:'OPEX',  nature:'CONSUMABLE',    hsnCode:'48219',  gstRate:12, rcmApplicable:false, poRequired:'CONDITIONAL', poThresholdAmount:50000, threeWayMatch:true, grnRequired:true, provisionRequired:false, ocrKeywords:'stationery, printing, paper, toner',                           ocrMatchConfidence:75 },
    { itemCode:'ITM-0020', name:'Office Supplies',                itemType:'GOODS',    expenseType:'OPEX',  nature:'CONSUMABLE',    hsnCode:'48219',  gstRate:12, rcmApplicable:false, poRequired:'CONDITIONAL', poThresholdAmount:25000, threeWayMatch:true, grnRequired:true, provisionRequired:false, ocrKeywords:'office supplies, consumables, stationery items',               ocrMatchConfidence:70 },
    // CAPEX — Fixed Assets
    { itemCode:'ITM-0021', name:'Laptop / Desktop Computer',      itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'84713', gstRate:18, rcmApplicable:false, poRequired:'YES', threeWayMatch:true, grnRequired:true, usefulLifeYears:3,  depreciationMethod:'SLM', depreciationRate:33.33, residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000,   autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'laptop, desktop, computer, notebook',                           ocrMatchConfidence:85 },
    { itemCode:'ITM-0022', name:'Server & Network Equipment',     itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'84715', gstRate:18, rcmApplicable:false, poRequired:'YES', threeWayMatch:true, grnRequired:true, usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000,   autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'server, network equipment, router, switch, firewall',           ocrMatchConfidence:85 },
    { itemCode:'ITM-0023', name:'UPS & Power Equipment',          itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'85044', gstRate:28, rcmApplicable:false, poRequired:'YES', threeWayMatch:true, grnRequired:true, usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000,   autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'UPS, inverter, power backup, stabilizer',                       ocrMatchConfidence:85 },
    { itemCode:'ITM-0024', name:'CCTV & Security Systems',        itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'85258', gstRate:18, rcmApplicable:false, poRequired:'YES', threeWayMatch:true, grnRequired:true, usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000,   autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'CCTV, surveillance, security camera, access control',           ocrMatchConfidence:85 },
    { itemCode:'ITM-0025', name:'Office Furniture',               itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'94032', gstRate:18, rcmApplicable:false, poRequired:'YES', threeWayMatch:true, grnRequired:true, usefulLifeYears:10, depreciationMethod:'SLM', depreciationRate:10,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000,   autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'furniture, chairs, table, workstation, cabin',                  ocrMatchConfidence:80 },
    { itemCode:'ITM-0026', name:'Air Conditioner',                itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'84159', gstRate:28, rcmApplicable:false, poRequired:'YES', threeWayMatch:true, grnRequired:true, usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000,   autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'air conditioner, AC, HVAC, split AC',                           ocrMatchConfidence:85 },
    { itemCode:'ITM-0027', name:'Vehicle',                        itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'87120', gstRate:28, rcmApplicable:false, poRequired:'YES', threeWayMatch:true, grnRequired:true, usefulLifeYears:8,  depreciationMethod:'WDV', depreciationRate:18.75, residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000,   autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'vehicle, car, automobile, transport vehicle',                   ocrMatchConfidence:85 },
    { itemCode:'ITM-0028', name:'ATM Machine',                    itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'84721', gstRate:18, rcmApplicable:false, poRequired:'YES', threeWayMatch:true, grnRequired:true, usefulLifeYears:7,  depreciationMethod:'SLM', depreciationRate:14.29, residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000,   autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'ATM, cash dispenser, automated teller machine',                 ocrMatchConfidence:90 },
    { itemCode:'ITM-0029', name:'Core Banking Software (CAPEX)',  itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'85234', gstRate:18, rcmApplicable:false, poRequired:'YES', threeWayMatch:false,grnRequired:false,usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:0, autoCreateAsset:true, capitalisationLimit:100000, autoPostDepreciation:false,                                  ocrKeywords:'core banking system, CBS implementation, software implementation',ocrMatchConfidence:85 },
    { itemCode:'ITM-0030', name:'Printing Machine / Copier',      itemType:'GOODS',    expenseType:'CAPEX', nature:'CAPITAL_ASSET',  hsnCode:'84433', gstRate:18, rcmApplicable:false, poRequired:'YES', threeWayMatch:true, grnRequired:true, usefulLifeYears:5,  depreciationMethod:'SLM', depreciationRate:20,    residualValuePct:5, autoCreateAsset:true, capitalisationLimit:5000,   autoPostDepreciation:true,  depreciationFrequency:'MONTHLY', ocrKeywords:'printer, copier, photocopier, MFD, multifunction device',      ocrMatchConfidence:85 },
  ]
  for (const item of items) {
    const { gstRate, depreciationRate, residualValuePct, poThresholdAmount, capitalisationLimit, ...rest } = item
    await prisma.itemMaster.upsert({
      where:  { tenantId_itemCode: { tenantId, itemCode: item.itemCode } },
      update: {},
      create: {
        ...rest,
        tenantId,
        status:              'ACTIVE',
        gstRate:             gstRate           != null ? gstRate           : null,
        depreciationRate:    depreciationRate   != null ? depreciationRate  : null,
        residualValuePct:    residualValuePct   != null ? residualValuePct  : null,
        poThresholdAmount:   poThresholdAmount  != null ? poThresholdAmount : null,
        capitalisationLimit: capitalisationLimit != null ? capitalisationLimit : null,
      },
    })
  }
  console.log(`✓ ${items.length} items seeded`)

  // ── Item Entity Mappings with proper GL codes ────────────────────────────────
  if (ptplEntity) {
    const cc   = await prisma.costCentre.findUnique({ where: { tenantId_code: { tenantId, code: 'CC-CORP' } },  select: { id: true } })
    const pc   = await prisma.profitCentre.findFirst({ where: { tenantId, entityId: ptplEntity.id, code: 'PC-CORP' }, select: { id: true } })

    const itemGLMap: Record<string, any> = {
      'ITM-0001': { expenseGlCodeId: gl('5001'), provisionGlCodeId: gl('2001'), tdsPayableGlCodeId: gl('2012') },
      'ITM-0002': { expenseGlCodeId: gl('5003'), provisionGlCodeId: gl('2001'), tdsPayableGlCodeId: gl('2012') },
      'ITM-0003': { expenseGlCodeId: gl('5001'),                                tdsPayableGlCodeId: gl('2012') },
      'ITM-0004': { expenseGlCodeId: gl('5030'), provisionGlCodeId: gl('2004'), tdsPayableGlCodeId: gl('2012') },
      'ITM-0005': { expenseGlCodeId: gl('5031'), provisionGlCodeId: gl('2003'), tdsPayableGlCodeId: gl('2012') },
      'ITM-0006': { expenseGlCodeId: gl('5031'),                                tdsPayableGlCodeId: gl('2012') },
      'ITM-0007': { expenseGlCodeId: gl('5020'), provisionGlCodeId: gl('2001'), tdsPayableGlCodeId: gl('2010') },
      'ITM-0008': { expenseGlCodeId: gl('5021'), provisionGlCodeId: gl('2001'), tdsPayableGlCodeId: gl('2010') },
      'ITM-0009': { expenseGlCodeId: gl('5010'), provisionGlCodeId: gl('2002'), tdsPayableGlCodeId: gl('2011') },
      'ITM-0010': { expenseGlCodeId: gl('5050'),                                tdsPayableGlCodeId: gl('2012') },
      'ITM-0011': { expenseGlCodeId: gl('5051'),                                tdsPayableGlCodeId: gl('2012') },
      'ITM-0012': { expenseGlCodeId: gl('5040'),                                tdsPayableGlCodeId: gl('2010') },
      'ITM-0013': { expenseGlCodeId: gl('5012'), provisionGlCodeId: gl('2001'), tdsPayableGlCodeId: gl('2012') },
      'ITM-0014': { expenseGlCodeId: gl('5011'), provisionGlCodeId: gl('2001') },
      'ITM-0015': { expenseGlCodeId: gl('5060'), provisionGlCodeId: gl('2001') },
      'ITM-0016': { expenseGlCodeId: gl('5060'), provisionGlCodeId: gl('2001') },
      'ITM-0017': { expenseGlCodeId: gl('5001') },
      'ITM-0018': { expenseGlCodeId: gl('5030') },
      'ITM-0019': { expenseGlCodeId: gl('5041') },
      'ITM-0020': { expenseGlCodeId: gl('5041') },
      'ITM-0021': { assetGlCodeId: gl('1100'), depreciationGlCodeId: gl('5070'), accumulatedDepnGlCodeId: gl('1101'), tdsPayableGlCodeId: gl('2010') },
      'ITM-0022': { assetGlCodeId: gl('1100'), depreciationGlCodeId: gl('5070'), accumulatedDepnGlCodeId: gl('1101') },
      'ITM-0023': { assetGlCodeId: gl('1104'), depreciationGlCodeId: gl('5070'), accumulatedDepnGlCodeId: gl('1105') },
      'ITM-0024': { assetGlCodeId: gl('1104'), depreciationGlCodeId: gl('5070'), accumulatedDepnGlCodeId: gl('1105') },
      'ITM-0025': { assetGlCodeId: gl('1102'), depreciationGlCodeId: gl('5071'), accumulatedDepnGlCodeId: gl('1103') },
      'ITM-0026': { assetGlCodeId: gl('1104'), depreciationGlCodeId: gl('5070'), accumulatedDepnGlCodeId: gl('1105') },
      'ITM-0027': { assetGlCodeId: gl('1106'), depreciationGlCodeId: gl('5072'), accumulatedDepnGlCodeId: gl('1107') },
      'ITM-0028': { assetGlCodeId: gl('1108'), depreciationGlCodeId: gl('5070'), accumulatedDepnGlCodeId: gl('1109') },
      'ITM-0029': { assetGlCodeId: gl('1100'), depreciationGlCodeId: gl('5070'), accumulatedDepnGlCodeId: gl('1101') },
      'ITM-0030': { assetGlCodeId: gl('1104'), depreciationGlCodeId: gl('5070'), accumulatedDepnGlCodeId: gl('1105') },
    }

    const itemMaps = await prisma.itemMaster.findMany({
      where:  { tenantId },
      select: { id: true, itemCode: true, expenseType: true, rcmApplicable: true, provisionRequired: true, poRequired: true, poThresholdAmount: true },
    })

    for (const item of itemMaps) {
      const isCapex   = item.expenseType === 'CAPEX'
      const glOverride = itemGLMap[item.itemCode] ?? {}
      await prisma.itemEntityMapping.upsert({
        where:  { itemId_entityId: { itemId: item.id, entityId: ptplEntity.id } },
        update: { ...glOverride, gstItcGlCodeId: gl('1050') },
        create: {
          itemId:                    item.id,
          entityId:                  ptplEntity.id,
          itemDescription:           item.itemCode,
          ...glOverride,
          gstItcGlCodeId:            gl('1050'),
          rcmGlCodeId:               item.rcmApplicable ? gl('2020') : null,
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
    console.log(`✓ ${itemMaps.length} item entity mappings (GL codes wired)`)
  }

  // ── Status normalisation ──────────────────────────────────────────────────────
  await prisma.$executeRaw`UPDATE countries    SET status='ACTIVE' WHERE status IS NULL OR status=''`
  await prisma.$executeRaw`UPDATE states       SET status='ACTIVE' WHERE status IS NULL OR status=''`
  await prisma.$executeRaw`UPDATE cities       SET status='ACTIVE' WHERE status IS NULL OR status=''`
  await prisma.$executeRaw`UPDATE currencies   SET status='ACTIVE' WHERE status IS NULL OR status=''`
  console.log('✓ Status normalised')

  // ── Tenant Modules + Features ─────────────────────────────────────────────────
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
      where:  { tenantId_moduleCode: { tenantId, moduleCode } },
      update: { isEnabled: true },
      create: { tenantId, moduleCode, isEnabled: true },
    })
    for (const featureCode of features) {
      await prisma.tenantFeature.upsert({
        where:  { tenantId_moduleCode_featureCode: { tenantId, moduleCode, featureCode } },
        update: { isEnabled: true },
        create: { tenantId, moduleCode, featureCode, isEnabled: true },
      })
    }
  }
  console.log('✓ Tenant modules + features')

  // ── Workflow Definitions — 3-tier invoice approval ───────────────────────────
  const workflowDefs = [
    {
      code: 'INV-STD-LOW', name: 'Invoice Approval — Below ₹1L',
      module: 'INVOICE', isDefault: false, priority: 10,
      conditions: [
        { field: 'totalAmount', operator: 'LT', value: '100000', logicGroup: 'AND' },
      ],
      stages: [
        { order: 1, name: 'Finance Manager Approval', approverType: 'ROLE', approverRole: 'FINANCE_MANAGER', slaHours: 24, requiresComment: false, onReject: 'RETURN_TO_DRAFT' },
      ],
    },
    {
      code: 'INV-STD-MID', name: 'Invoice Approval — ₹1L to ₹5L',
      module: 'INVOICE', isDefault: false, priority: 20,
      conditions: [
        { field: 'totalAmount', operator: 'GTE', value: '100000', logicGroup: 'AND' },
        { field: 'totalAmount', operator: 'LT',  value: '500000', logicGroup: 'AND' },
      ],
      stages: [
        { order: 1, name: 'Finance Manager',  approverType: 'ROLE', approverRole: 'FINANCE_MANAGER', slaHours: 24, requiresComment: false, onReject: 'RETURN_TO_DRAFT'      },
        { order: 2, name: 'CFO Approval',     approverType: 'ROLE', approverRole: 'CFO',             slaHours: 48, requiresComment: true,  onReject: 'RETURN_TO_PREV_STAGE' },
      ],
    },
    {
      code: 'INV-STD-HIGH', name: 'Invoice Approval — Above ₹5L',
      module: 'INVOICE', isDefault: true, priority: 30,
      conditions: [
        { field: 'totalAmount', operator: 'GTE', value: '500000', logicGroup: 'AND' },
      ],
      stages: [
        { order: 1, name: 'Finance Manager', approverType: 'ROLE', approverRole: 'FINANCE_MANAGER', slaHours: 24, requiresComment: false, onReject: 'RETURN_TO_DRAFT'      },
        { order: 2, name: 'CFO Approval',    approverType: 'ROLE', approverRole: 'CFO',             slaHours: 48, requiresComment: true,  onReject: 'RETURN_TO_PREV_STAGE' },
        { order: 3, name: 'MD Sign-off',     approverType: 'ROLE', approverRole: 'MD',              slaHours: 72, requiresComment: true,  onReject: 'RETURN_TO_PREV_STAGE' },
      ],
    },
  ]
  for (const def of workflowDefs) {
    const { conditions, stages, ...defData } = def
    const existing = await prisma.workflowDefinition.findFirst({ where: { tenantId, code: def.code } })
    if (existing) continue
    const created = await prisma.workflowDefinition.create({
      data: { ...defData, tenantId, status: 'ACTIVE', isActive: true },
    })
    await prisma.workflowDefinitionCondition.createMany({ data: conditions.map(c => ({ ...c, definitionId: created.id })) })
    await prisma.workflowDefinitionStage.createMany({    data: stages.map(s => ({ ...s, definitionId: created.id })) })
  }
  console.log('✓ 3 workflow definitions + stages seeded')

  // ── Super Admin ───────────────────────────────────────────────────────────────
  await prisma.user.update({
    where: { tenantId_email: { tenantId, email: 'mithilesh@procinix.ai' } },
    data:  { role: 'SUPER_ADMIN' },
  })
  console.log('✓ Super admin role set')

  // ── Vendor Seeds ─────────────────────────────────────────────────────────────
  const tdsSection194J = await prisma.tDSSection.findFirst({ where: { tenantId, section: '194J',    code: '194J' },  select: { id: true } })
  const tdsSection194C = await prisma.tDSSection.findFirst({ where: { tenantId, section: '194C',    code: '194C' },  select: { id: true } })
  const tdsSection194I = await prisma.tDSSection.findFirst({ where: { tenantId, section: '194I(a)', code: '194IA' }, select: { id: true } })

  const vendors = [
    {
      vendorCode:         'VND-0001',
      legalName:          'Infosys BPM Limited',
      tradeName:          'Infosys BPM',
      vendorType:         'SERVICE_PROVIDER',
      panEntityType:      'COMPANY',
      pan:                'AACCI1234C',
      gstin:              '27AACCI1234C1ZV',
      tan:                'MUMB12345A',
      cin:                'U72200MH2002PLC134718',
      tdsApplicable:      true,
      tdsSectionId:       tdsSection194J?.id,
      tdsRate:            10,
      is206ABApplicable:  false,
      einvoiceRequired:   true,
      kycPanStatus:       'VALID',
      kycPanName:         'INFOSYS BPM LIMITED',
      kycGstStatus:       'VALID',
      kycGstName:         'INFOSYS BPM LIMITED',
      gstComplianceScore: 92,
      gstReturnRisk:      'LOW_RISK',
      kycCinStatus:       'VALID',
      addressLine1:       'Electronics City, Phase 1',
      city:               'Bengaluru',
      stateCode:          'KA',
      pincode:            '560100',
      contactName:        'Rajesh Kumar',
      email:              'ap@infosysbpm.com',
      mobile:             '9845012345',
      website:            'https://www.infosysbpm.com',
      paymentTerms:       30,
      paymentCurrency:    'INR',
      paymentMode:        'NEFT',
      status:             'ACTIVE',
      gstRegistrations: [{
        stateCode: 'KA', gstin: '29AACCI1234C1ZV', registrationType: 'REGULAR',
        isPrimary: true, spocName: 'Anita Sharma', spocEmail: 'gst.ka@infosysbpm.com',
        spocPhone: '9845098765', kycStatus: 'VALID', status: 'ACTIVE',
      }],
      bankAccounts: [{
        accountNo: '50200012345678', ifsc: 'HDFC0001234', bankName: 'HDFC Bank',
        branch: 'Koramangala Branch', accountType: 'CURRENT', currencyCode: 'INR',
        accountHolderName: 'INFOSYS BPM LIMITED', isPrimary: true,
        kycStatus: 'VALID', kycNameMatchScore: 98, status: 'ACTIVE',
      }],
      entityMappings: [{
        entityId: ptplEntity!.id, glCodeId: gl('5001'),
        currencyCode: 'INR', creditLimit: 5000000,
        blockPO: false, blockPayment: false, paymentTermsDays: 30, paymentMode: 'NEFT',
      }],
    },
    {
      vendorCode:         'VND-0002',
      legalName:          'G4S Secure Solutions (India) Private Limited',
      tradeName:          'G4S Security',
      vendorType:         'SERVICE_PROVIDER',
      panEntityType:      'COMPANY',
      pan:                'AABCG4567D',
      gstin:              '27AABCG4567D1ZP',
      tan:                'MUMG56789B',
      cin:                'U74920MH1997PTC108732',
      tdsApplicable:      true,
      tdsSectionId:       tdsSection194C?.id,
      tdsRate:            2,
      is206ABApplicable:  false,
      einvoiceRequired:   true,
      kycPanStatus:       'VALID',
      kycPanName:         'G4S SECURE SOLUTIONS INDIA PVT LTD',
      kycGstStatus:       'VALID',
      kycGstName:         'G4S SECURE SOLUTIONS INDIA PVT LTD',
      gstComplianceScore: 88,
      gstReturnRisk:      'LOW_RISK',
      kycCinStatus:       'VALID',
      addressLine1:       '5th Floor, Nirmal Building, Nariman Point',
      city:               'Mumbai',
      stateCode:          'MH',
      pincode:            '400021',
      contactName:        'Suresh Nair',
      email:              'billing@g4sindia.com',
      mobile:             '9820012345',
      website:            'https://www.g4s.com/en-in',
      paymentTerms:       30,
      paymentCurrency:    'INR',
      paymentMode:        'NEFT',
      status:             'ACTIVE',
      gstRegistrations: [{
        stateCode: 'MH', gstin: '27AABCG4567D1ZP', registrationType: 'REGULAR',
        isPrimary: true, spocName: 'Priya Mehta', spocEmail: 'gst.mh@g4sindia.com',
        spocPhone: '9820098765', kycStatus: 'VALID', status: 'ACTIVE',
      }],
      bankAccounts: [{
        accountNo: '00000031234567890', ifsc: 'SBIN0001234', bankName: 'State Bank of India',
        branch: 'Nariman Point Branch', accountType: 'CURRENT', currencyCode: 'INR',
        accountHolderName: 'G4S SECURE SOLUTIONS INDIA PVT LTD', isPrimary: true,
        kycStatus: 'VALID', kycNameMatchScore: 95, status: 'ACTIVE',
      }],
      entityMappings: [{
        entityId: ptplEntity!.id, glCodeId: gl('5020'),
        currencyCode: 'INR', creditLimit: 2000000,
        blockPO: false, blockPayment: false, paymentTermsDays: 30, paymentMode: 'NEFT',
      }],
    },
    {
      vendorCode:         'VND-0003',
      legalName:          'Crawford Bayley & Co',
      tradeName:          'Crawford Bayley',
      vendorType:         'SERVICE_PROVIDER',
      panEntityType:      'FIRM',
      pan:                'AABCC1234F',
      gstin:              '27AABCC1234F1ZQ',
      tan:                'MUMC34567C',
      cin:                null,
      tdsApplicable:      true,
      tdsSectionId:       tdsSection194J?.id,
      tdsRate:            10,
      is206ABApplicable:  false,
      einvoiceRequired:   false,
      kycPanStatus:       'VALID',
      kycPanName:         'CRAWFORD BAYLEY AND CO',
      kycGstStatus:       'VALID',
      kycGstName:         'CRAWFORD BAYLEY AND CO',
      gstComplianceScore: 85,
      gstReturnRisk:      'LOW_RISK',
      addressLine1:       'State Bank Buildings, 4th Floor, N.G.N. Vaidya Marg',
      city:               'Mumbai',
      stateCode:          'MH',
      pincode:            '400023',
      contactName:        'Arjun Crawford',
      email:              'billing@crawfordbayley.com',
      mobile:             '9821056789',
      website:            'https://www.crawfordbayley.com',
      paymentTerms:       45,
      paymentCurrency:    'INR',
      paymentMode:        'RTGS',
      status:             'ACTIVE',
      gstRegistrations: [{
        stateCode: 'MH', gstin: '27AABCC1234F1ZQ', registrationType: 'REGULAR',
        isPrimary: true, spocName: 'Meera Iyer', spocEmail: 'gst@crawfordbayley.com',
        spocPhone: '9821087654', kycStatus: 'VALID', status: 'ACTIVE',
      }],
      bankAccounts: [{
        accountNo: '001234500012345', ifsc: 'ICIC0001234', bankName: 'ICICI Bank',
        branch: 'Fort Branch', accountType: 'CURRENT', currencyCode: 'INR',
        accountHolderName: 'CRAWFORD BAYLEY AND CO', isPrimary: true,
        kycStatus: 'VALID', kycNameMatchScore: 96, status: 'ACTIVE',
      }],
      entityMappings: [{
        entityId: ptplEntity!.id, glCodeId: gl('5030'),
        currencyCode: 'INR', creditLimit: 1000000,
        blockPO: false, blockPayment: false, paymentTermsDays: 45, paymentMode: 'RTGS',
      }],
    },
    {
      vendorCode:         'VND-0004',
      legalName:          'Oberoi Realty Limited',
      tradeName:          'Oberoi Realty',
      vendorType:         'SERVICE_PROVIDER',
      panEntityType:      'COMPANY',
      pan:                'AABCO1234E',
      gstin:              '27AABCO1234E1ZR',
      tan:                'MUMO78901D',
      cin:                'L45200MH1998PLC114818',
      tdsApplicable:      true,
      tdsSectionId:       tdsSection194I?.id,
      tdsRate:            10,
      is206ABApplicable:  false,
      einvoiceRequired:   true,
      kycPanStatus:       'VALID',
      kycPanName:         'OBEROI REALTY LIMITED',
      kycGstStatus:       'VALID',
      kycGstName:         'OBEROI REALTY LIMITED',
      gstComplianceScore: 94,
      gstReturnRisk:      'LOW_RISK',
      kycCinStatus:       'VALID',
      addressLine1:       'Commerz, International Business Park, Oberoi Garden City',
      city:               'Mumbai',
      stateCode:          'MH',
      pincode:            '400063',
      contactName:        'Vivek Oberoi',
      email:              'leasing@oberoirealty.com',
      mobile:             '9867012345',
      website:            'https://www.oberoirealty.com',
      paymentTerms:       0,
      paymentCurrency:    'INR',
      paymentMode:        'RTGS',
      status:             'ACTIVE',
      gstRegistrations: [{
        stateCode: 'MH', gstin: '27AABCO1234E1ZR', registrationType: 'REGULAR',
        isPrimary: true, spocName: 'Deepa Sharma', spocEmail: 'gst@oberoirealty.com',
        spocPhone: '9867098765', kycStatus: 'VALID', status: 'ACTIVE',
      }],
      bankAccounts: [{
        accountNo: '50200087654321', ifsc: 'HDFC0004321', bankName: 'HDFC Bank',
        branch: 'Goregaon Branch', accountType: 'CURRENT', currencyCode: 'INR',
        accountHolderName: 'OBEROI REALTY LIMITED', isPrimary: true,
        kycStatus: 'VALID', kycNameMatchScore: 99, status: 'ACTIVE',
      }],
      entityMappings: [{
        entityId: ptplEntity!.id, glCodeId: gl('5010'),
        currencyCode: 'INR', creditLimit: 10000000,
        blockPO: false, blockPayment: false, paymentTermsDays: 0, paymentMode: 'RTGS',
      }],
    },
  ]

  for (const v of vendors) {
    const { gstRegistrations, bankAccounts, entityMappings, ...vendorData } = v
    const existing = await prisma.vendor.findFirst({ where: { tenantId, vendorCode: v.vendorCode } })
    if (existing) continue
    const vendor = await prisma.vendor.create({ data: { ...vendorData, tenantId } as any })
    await prisma.vendorGstRegistration.createMany({ data: gstRegistrations.map(g => ({ ...g, vendorId: vendor.id })) })
    await prisma.vendorBankAccount.createMany({ data: bankAccounts.map(b => ({ ...b, vendorId: vendor.id })) })
    await prisma.vendorEntityMapping.createMany({ data: entityMappings.map(e => ({ ...e, vendorId: vendor.id, isActive: true })) })
  }
  console.log('✓ 4 vendors seeded (Infosys BPM, G4S Security, Crawford Bayley, Oberoi Realty)')

  // ── Budgets — FY 2025-26, PTPL ───────────────────────────────────────────────
  const currentFy = await prisma.financialYear.findFirst({ where: { tenantId, isCurrent: true } })
  const allCostCentres = await prisma.costCentre.findMany({ where: { tenantId }, select: { id: true, code: true } })
  const cc = (code: string) => allCostCentres.find(c => c.code === code)?.id ?? null

  if (currentFy && ptplEntity) {
    const budgets = [
      { budgetRef: 'BUD-2526-IT-001',    name: 'IT Services & Software FY26',    glCode: '5001', ccCode: 'CC-IT',    amount: 5000000 },
      { budgetRef: 'BUD-2526-FAC-001',   name: 'Facilities & Rent FY26',         glCode: '5010', ccCode: 'CC-CORP',  amount: 3600000 },
      { budgetRef: 'BUD-2526-SEC-001',   name: 'Security Services FY26',         glCode: '5020', ccCode: 'CC-OPS',   amount: 1800000 },
      { budgetRef: 'BUD-2526-LEGAL-001', name: 'Legal & Professional Fees FY26', glCode: '5030', ccCode: 'CC-LEGAL', amount: 1200000 },
      { budgetRef: 'BUD-2526-HR-001',    name: 'HR & Training FY26',             glCode: '5050', ccCode: 'CC-HR',    amount: 800000  },
      { budgetRef: 'BUD-2526-MKT-001',   name: 'Marketing & Advertising FY26',   glCode: '5040', ccCode: 'CC-MKT',   amount: 600000  },
    ]
    for (const b of budgets) {
      const existing = await prisma.budget.findFirst({ where: { tenantId, budgetRef: b.budgetRef } })
      if (existing) continue
      const budget = await prisma.budget.create({
        data: {
          tenantId,
          budgetRef:       b.budgetRef,
          name:            b.name,
          financialYearId: currentFy.id,
          entityId:        ptplEntity.id,
          glCodeId:        gl(b.glCode),
          costCentreId:    cc(b.ccCode),
          periodType:      'MONTHLY',
          budgetAmount:    b.amount,
          revisedAmount:   b.amount,
          toleranceZonePct: 10,
          hardBlock:       true,
          carryForward:    false,
          status:          'ACTIVE',
        },
      })
      const monthlyAmount = b.amount / 12
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(2025, 3 + i, 1)
        return {
          budgetId:        budget.id,
          periodLabel:     d.toLocaleString('default', { month: 'short', year: '2-digit' }),
          periodStart:     new Date(d.getFullYear(), d.getMonth(), 1),
          periodEnd:       new Date(d.getFullYear(), d.getMonth() + 1, 0),
          allocatedAmount: monthlyAmount,
        }
      })
      await prisma.budgetPeriod.createMany({ data: months })
    }
    console.log(`✓ ${budgets.length} budgets seeded with monthly periods`)
  }

  console.log('\n✅ Seed complete.')
  console.log('   Login: mithilesh@procinix.ai / Demo@123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
