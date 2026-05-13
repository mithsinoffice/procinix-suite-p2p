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

  console.log('\n✅ Seed complete.')
  console.log('   Login: mithilesh@procinix.ai / Demo@123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
