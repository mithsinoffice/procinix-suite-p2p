import { describe, it, expect } from 'vitest'
import {
  computeNextRunDate, isProvisionDue, buildProvisionJV,
  buildReversalJV, buildNullificationJV, shouldSkipReversal,
  periodOf, lastDayOfMonth, firstDayOfMonth,
  type ProvisionScheduleInput, type JournalEntryLike,
} from '../provision-engine.service'

// Helpers
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))

const schedule: ProvisionScheduleInput = {
  id: 'sch-1', tenantId: 't-1', itemId: 'item-1234abcd', vendorId: 'v-1',
  frequency: 'MONTHLY', amount: 5000, basis: 'FIXED_AMOUNT', status: 'ACTIVE',
  lastRunDate: null, nextRunDate: utc(2026, 5, 31),
  expenseGlCode: '5101', provisionGlCode: '2201',
}

const provJV: JournalEntryLike = {
  id: 'jv-1', tenantId: 't-1',
  entryDate:   utc(2026, 5, 31), postingDate: utc(2026, 5, 31),
  period: '2026-05', entryType: 'PROVISION', status: 'POSTED',
  debitGlCode: '5101', creditGlCode: '2201', amount: 5000,
  currencyCode: 'INR', narration: 'Software License — May 2026 provision',
  invoiceId: null, invoiceLineId: null, provisionScheduleId: 'sch-1',
  nullifiedByInvoiceId: null, reversalOfId: null, reversalSkipped: false,
}

describe('computeNextRunDate', () => {
  it('MONTHLY: from May 31 → June 30', () => {
    const r = computeNextRunDate(utc(2026, 5, 31), 'MONTHLY')
    expect(r.toISOString().slice(0, 10)).toBe('2026-06-30')
  })

  it('MONTHLY: from Dec 31 → next Jan 31 (year roll)', () => {
    const r = computeNextRunDate(utc(2026, 12, 31), 'MONTHLY')
    expect(r.toISOString().slice(0, 10)).toBe('2027-01-31')
  })

  it('MONTHLY: from Jan 31 → Feb 28 (Feb has fewer days)', () => {
    const r = computeNextRunDate(utc(2026, 1, 31), 'MONTHLY')
    expect(r.toISOString().slice(0, 10)).toBe('2026-02-28')
  })

  it('QUARTERLY: from Q1 (Mar 31) → Q2 end (Jun 30)', () => {
    const r = computeNextRunDate(utc(2026, 3, 31), 'QUARTERLY')
    expect(r.toISOString().slice(0, 10)).toBe('2026-06-30')
  })

  it('QUARTERLY: from Q4 (Dec 31) → next Q1 end (Mar 31)', () => {
    const r = computeNextRunDate(utc(2026, 12, 31), 'QUARTERLY')
    expect(r.toISOString().slice(0, 10)).toBe('2027-03-31')
  })

  it('QUARTERLY: from mid-quarter (May 15) → Q3 end (Sep 30)', () => {
    const r = computeNextRunDate(utc(2026, 5, 15), 'QUARTERLY')
    expect(r.toISOString().slice(0, 10)).toBe('2026-09-30')
  })
})

describe('isProvisionDue', () => {
  it('returns true when nextRunDate <= forDate and ACTIVE', () => {
    expect(isProvisionDue(schedule, utc(2026, 5, 31))).toBe(true)
    expect(isProvisionDue(schedule, utc(2026, 6, 15))).toBe(true)
  })

  it('returns false when nextRunDate > forDate', () => {
    expect(isProvisionDue(schedule, utc(2026, 5, 30))).toBe(false)
  })

  it('returns false when status is PAUSED', () => {
    expect(isProvisionDue({ ...schedule, status: 'PAUSED' }, utc(2026, 6, 1))).toBe(false)
  })

  it('returns false when status is CLOSED', () => {
    expect(isProvisionDue({ ...schedule, status: 'CLOSED' }, utc(2026, 6, 1))).toBe(false)
  })

  it('returns true when nextRunDate is null (never run before)', () => {
    expect(isProvisionDue({ ...schedule, nextRunDate: null }, utc(2026, 6, 1))).toBe(true)
  })
})

describe('buildProvisionJV', () => {
  it('builds PROVISION JV with DR=expense, CR=provision', () => {
    const jv = buildProvisionJV(schedule, utc(2026, 5, 31), 'user-1', { itemName: 'Software License' })
    expect(jv.entryType).toBe('PROVISION')
    expect(jv.status).toBe('POSTED')
    expect(jv.debitGlCode).toBe('5101')
    expect(jv.creditGlCode).toBe('2201')
    expect(jv.amount).toBe(5000)
    expect(jv.period).toBe('2026-05')
    expect(jv.narration).toBe('Software License — May 2026 provision')
    expect(jv.provisionScheduleId).toBe('sch-1')
    expect(jv.createdBy).toBe('user-1')
  })

  it('falls back to itemId label when itemName not provided', () => {
    const jv = buildProvisionJV(schedule, utc(2026, 6, 30), 'user-1')
    expect(jv.narration).toContain('item-123')
    expect(jv.narration).toContain('Jun 2026')
  })

  it('sets entryDate = postingDate = forDate', () => {
    const d  = utc(2026, 7, 31)
    const jv = buildProvisionJV(schedule, d, 'user-1')
    expect(jv.entryDate).toEqual(d)
    expect(jv.postingDate).toEqual(d)
  })
})

describe('buildReversalJV', () => {
  it('swaps DR/CR from original', () => {
    const rev = buildReversalJV(provJV, utc(2026, 6, 1), 'user-1')
    expect(rev.debitGlCode).toBe('2201')   // was credit on original
    expect(rev.creditGlCode).toBe('5101')  // was debit on original
    expect(rev.amount).toBe(5000)
  })

  it('postingDate = 1st of month after original posting', () => {
    const rev = buildReversalJV(provJV, utc(2026, 6, 1), 'user-1')
    expect(rev.postingDate.toISOString().slice(0, 10)).toBe('2026-06-01')
    expect(rev.period).toBe('2026-06')
  })

  it('postingDate rolls year on December → January', () => {
    const decJV = { ...provJV, postingDate: utc(2026, 12, 31), period: '2026-12' }
    const rev = buildReversalJV(decJV, utc(2027, 1, 1), 'user-1')
    expect(rev.postingDate.toISOString().slice(0, 10)).toBe('2027-01-01')
    expect(rev.period).toBe('2027-01')
  })

  it('sets reversalOfId to original JV id', () => {
    const rev = buildReversalJV(provJV, utc(2026, 6, 1), 'user-1')
    expect(rev.reversalOfId).toBe('jv-1')
    expect(rev.entryType).toBe('PROVISION_REVERSAL')
  })
})

describe('buildNullificationJV', () => {
  it('swaps DR/CR and sets nullifiedByInvoiceId', () => {
    const nf = buildNullificationJV(provJV, 'inv-1', utc(2026, 5, 20), 'user-1')
    expect(nf.entryType).toBe('PROVISION_NULLIFIED')
    expect(nf.debitGlCode).toBe('2201')
    expect(nf.creditGlCode).toBe('5101')
    expect(nf.nullifiedByInvoiceId).toBe('inv-1')
    expect(nf.invoiceId).toBe('inv-1')
  })

  it('uses invoiceDate as entry+posting date', () => {
    const nf = buildNullificationJV(provJV, 'inv-1', utc(2026, 5, 20), 'user-1')
    expect(nf.entryDate.toISOString().slice(0, 10)).toBe('2026-05-20')
    expect(nf.postingDate.toISOString().slice(0, 10)).toBe('2026-05-20')
    expect(nf.period).toBe('2026-05')
  })
})

describe('shouldSkipReversal', () => {
  it('returns true when original PROVISION is NULLIFIED', () => {
    expect(shouldSkipReversal({ ...provJV, status: 'NULLIFIED' })).toBe(true)
  })

  it('returns false when original PROVISION is still POSTED', () => {
    expect(shouldSkipReversal(provJV)).toBe(false)
  })
})

describe('date helpers', () => {
  it('periodOf returns YYYY-MM', () => {
    expect(periodOf(utc(2026, 5, 31))).toBe('2026-05')
    expect(periodOf(utc(2026, 12, 1))).toBe('2026-12')
  })

  it('lastDayOfMonth handles leap year February', () => {
    expect(lastDayOfMonth(2028, 1).toISOString().slice(0, 10)).toBe('2028-02-29')
    expect(lastDayOfMonth(2026, 1).toISOString().slice(0, 10)).toBe('2026-02-28')
  })

  it('firstDayOfMonth handles month rollover', () => {
    expect(firstDayOfMonth(2026, 12).toISOString().slice(0, 10)).toBe('2027-01-01')
  })
})
