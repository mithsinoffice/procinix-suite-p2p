import { describe, it, expect } from 'vitest'
import { resolveApGlCodeFromList } from '../accounting-trigger.service'

// The AP-GL resolver picks the credit leg of every AP accrual JV. Mis-resolving
// it (e.g. selecting TDS Payable instead of Accounts Payable) silently
// mis-allocates the liability and breaks GL reconciliation, so the priority
// here is locked down and load-bearing — bump the test if you change it.

describe('resolveApGlCodeFromList', () => {
  // The actual seed shape — 2030/2031/2032 are AP, 2010-2013 are TDS, 2020-2023
  // are GST. Loose /payable/i fires on all of them; the fix is that AP wins.
  const SEEDED: { code: string; name: string }[] = [
    { code: '2001', name: 'Provision for Expenses' },
    { code: '2002', name: 'Provision for Rent' },
    { code: '2003', name: 'Provision for Audit Fees' },
    { code: '2004', name: 'Provision for Legal Fees' },
    { code: '2010', name: 'TDS Payable — 194C' },
    { code: '2011', name: 'TDS Payable — 194I' },
    { code: '2012', name: 'TDS Payable — 194J' },
    { code: '2013', name: 'TDS Payable — 194Q' },
    { code: '2020', name: 'GST RCM Liability' },
    { code: '2021', name: 'CGST Payable' },
    { code: '2022', name: 'SGST Payable' },
    { code: '2023', name: 'IGST Payable' },
    { code: '2030', name: 'Accounts Payable — IT Vendors' },
    { code: '2031', name: 'Accounts Payable — Services' },
    { code: '2032', name: 'Accounts Payable — Rent' },
  ]

  it('returns 2030 (Accounts Payable) — never 2010 (TDS Payable)', () => {
    // The regression: with the old `name.contains("Payable")` resolver, Prisma
    // returned 2010 (TDS) because it sorts ahead of 2030.
    expect(resolveApGlCodeFromList(SEEDED)).toBe('2030')
  })

  it('prefers exact name match over 203x code range', () => {
    const gls = [
      { code: '2030', name: 'Accounts Payable — IT Vendors' },
      { code: '9999', name: 'Accounts Payable' }, // exact match wins
    ]
    expect(resolveApGlCodeFromList(gls)).toBe('9999')
  })

  it('case-insensitive exact match', () => {
    const gls = [{ code: '9999', name: 'ACCOUNTS PAYABLE' }]
    expect(resolveApGlCodeFromList(gls)).toBe('9999')
  })

  it('falls through to 203x code range when no exact name match', () => {
    const gls = [
      { code: '2010', name: 'TDS Payable — 194C' },
      { code: '2031', name: 'Accounts Payable — Services' }, // matches 203x
    ]
    expect(resolveApGlCodeFromList(gls)).toBe('2031')
  })

  it('falls through to /accounts payable/i fuzzy when no 203x', () => {
    const gls = [
      { code: '2010', name: 'TDS Payable — 194C' },
      { code: '5500', name: 'Accounts Payable — Misc' }, // non-203x but fuzzy match
    ]
    expect(resolveApGlCodeFromList(gls)).toBe('5500')
  })

  it('falls through to /payable/i last-resort only when nothing better', () => {
    const gls = [
      { code: '2010', name: 'TDS Payable — 194C' },
    ]
    expect(resolveApGlCodeFromList(gls)).toBe('2010')
  })

  it('returns null when no payable GL exists', () => {
    const gls = [
      { code: '2001', name: 'Provision for Expenses' },
      { code: '2020', name: 'GST RCM Liability' },
    ]
    expect(resolveApGlCodeFromList(gls)).toBeNull()
  })

  it('returns null for empty list', () => {
    expect(resolveApGlCodeFromList([])).toBeNull()
  })
})
