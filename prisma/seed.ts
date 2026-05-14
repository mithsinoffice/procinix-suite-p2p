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

  console.log('\n✅ Seed complete.')
  console.log('   Login: mithilesh@procinix.ai / Demo@123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
