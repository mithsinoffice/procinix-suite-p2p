// Regression tests for GET /api/invoices.
//
// Background: a freshly-ingested ON_HOLD/EMAIL invoice was invisible in the UI
// listing. Root cause was NOT a filter bug — the route's `findMany` selected
// all columns (including 5 heavy JSON blobs added by the LLM-scoring commit),
// and Azure MySQL's `sort_buffer_size` couldn't hold 50 such wide rows. The
// endpoint started returning 500. The fix added an explicit INVOICE_LIST_SELECT
// that omits the heavy JSON columns and a buildInvoiceListWhere helper.
//
// These tests hit the same handler body (listInvoicesForRoute) the route does,
// with a mocked Prisma so they assert the actual WHERE / SELECT shape — not a
// parallel "test version".

import { describe, it, expect, vi } from 'vitest'
import {
  buildInvoiceListWhere,
  listInvoicesForRoute,
  getInvoiceSummary,
  INVOICE_LIST_SELECT,
  INVOICE_STRIP_FIELDS,
  coerceInvoiceDates,
  sanitiseLineItemIds,
} from '../invoices'

const TENANT = 'tenant-default-001'

// ── 1. buildInvoiceListWhere — no implicit filters ──────────────────────────

describe('buildInvoiceListWhere', () => {
  // Test 4 (spec): no query params → only tenantId scopes the result. Catches
  // anyone adding "WHERE status != ON_HOLD" or similar default that would hide
  // freshly-ingested rows.
  it('with no filters → returns only the tenant scope (no status / channel / lifecycle exclusion)', () => {
    expect(buildInvoiceListWhere(TENANT, {})).toEqual({ tenantId: TENANT })
  })

  it('treats status="ALL" as no filter', () => {
    expect(buildInvoiceListWhere(TENANT, { status: 'ALL' })).toEqual({ tenantId: TENANT })
  })

  it('applies the status filter when a specific value is passed', () => {
    expect(buildInvoiceListWhere(TENANT, { status: 'ON_HOLD' })).toEqual({
      tenantId: TENANT,
      status:   'ON_HOLD',
    })
  })

  it('combines status + vendorId + entityId', () => {
    const w = buildInvoiceListWhere(TENANT, {
      status:  'DRAFT',
      vendorId: 'v-1',
      entityId: 'e-1',
    })
    expect(w).toMatchObject({ tenantId: TENANT, status: 'DRAFT', vendorId: 'v-1', entityId: 'e-1' })
  })

  it('does not inject any channelType filter even when EMAIL invoices exist', () => {
    const w = buildInvoiceListWhere(TENANT, {}) as Record<string, unknown>
    expect(w.channelType).toBeUndefined()
  })

  it('does not filter by lifecycle_state (column does not exist on this schema)', () => {
    const w = buildInvoiceListWhere(TENANT, {}) as Record<string, unknown>
    expect(w.lifecycleState).toBeUndefined()
    expect((w as Record<string, unknown>)['lifecycle_state']).toBeUndefined()
  })

  // UNMATCHED is a derived bucket. Filtering for status='UNMATCHED' from the UI
  // must expand to the OR clause that nav-badges.ts uses — not a literal status
  // match (which would always return zero rows).
  it('expands status="UNMATCHED" into the OR clause (explicit UNMATCHED status OR matchScore < 70)', () => {
    const w = buildInvoiceListWhere(TENANT, { status: 'UNMATCHED' }) as Record<string, unknown>
    expect(w.tenantId).toBe(TENANT)
    expect(w.status).toBeUndefined()
    expect(w.OR).toEqual([
      { status: 'UNMATCHED' },
      { AND: [{ matchScore: { lt: 70 } }, { matchScore: { not: null } }] },
    ])
  })

  it('applies amountMin / amountMax to totalAmount', () => {
    const w = buildInvoiceListWhere(TENANT, { amountMin: 1000, amountMax: 50000 })
    expect(w.totalAmount).toEqual({ gte: 1000, lte: 50000 })
  })
})

// ── sanitiseLineItemIds — guards the InvoiceLine FK constraint
//
// The item-matcher / OCR / hand-crafted payloads can surface non-UUID strings
// (e.g. an item code "ITM-0008") or stale UUIDs that don't resolve in the
// current tenant's item master. Either would make invoice_lines.item_id
// throw a foreign-key violation. Sanitise: drop the bad id, keep the line.

describe('sanitiseLineItemIds', () => {
  function mockTx(existingIds: string[]) {
    const findMany = vi.fn().mockResolvedValue(existingIds.map(id => ({ id })))
    return {
      tx: { itemMaster: { findMany } } as any,
      findMany,
    }
  }

  it('nulls non-UUID itemIds (e.g. "ITM-0008") without hitting the DB for them', async () => {
    const { tx, findMany } = mockTx([])
    const lines = [
      { itemId: 'ITM-0008', description: 'a' },
      { itemId: '',         description: 'b' },
      { itemId: null,       description: 'c' },
    ]
    const out = await sanitiseLineItemIds(tx, 't-1', lines)
    expect(out.map(l => l.itemId)).toEqual([null, null, null])
    // No UUID candidates surfaced — DB lookup never runs.
    expect(findMany).not.toHaveBeenCalled()
  })

  it('keeps UUIDs that resolve in the same tenant', async () => {
    const uuid = '11111111-1111-1111-1111-111111111111'
    const { tx, findMany } = mockTx([uuid])
    const lines = [{ itemId: uuid, description: 'x' }]
    const out = await sanitiseLineItemIds(tx, 't-1', lines)
    expect(out[0].itemId).toBe(uuid)
    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany.mock.calls[0][0].where).toEqual({ id: { in: [uuid] }, tenantId: 't-1' })
  })

  it('drops UUIDs that do NOT exist in this tenant (stale id or cross-tenant)', async () => {
    const uuid = '22222222-2222-2222-2222-222222222222'
    const { tx } = mockTx([])  // DB returns no rows
    const out = await sanitiseLineItemIds(tx, 't-1', [{ itemId: uuid, description: 'x' }])
    expect(out[0].itemId).toBeNull()
  })

  it('handles a mixed batch — keep valid, null bad shape, null missing UUID', async () => {
    const good   = '33333333-3333-3333-3333-333333333333'
    const stale  = '44444444-4444-4444-4444-444444444444'
    const { tx } = mockTx([good])
    const lines = [
      { itemId: good,       description: 'keep' },
      { itemId: stale,      description: 'stale' },
      { itemId: 'ITM-0008', description: 'shape' },
      { itemId: undefined,  description: 'blank' },
    ]
    const out = await sanitiseLineItemIds(tx, 't-1', lines)
    expect(out.map(l => l.itemId)).toEqual([good, null, null, null])
  })

  it('returns the input untouched when the array is empty', async () => {
    const { tx, findMany } = mockTx([])
    const out = await sanitiseLineItemIds(tx, 't-1', [])
    expect(out).toEqual([])
    expect(findMany).not.toHaveBeenCalled()
  })
})

// ── coerceInvoiceDates — promotes "YYYY-MM-DD" to full ISO DateTime
//
// Prisma's DateTime columns reject the date-only form the form's
// <input type="date"> emits. Without this coercion, POST /api/invoices
// returns 500 with "Got invalid value '2026-05-05' for DateTime".

describe('coerceInvoiceDates', () => {
  it('promotes a date-only string to ISO DateTime (UTC midnight)', () => {
    const out = coerceInvoiceDates({ invoiceDate: '2026-05-05', dueDate: '2026-06-04' })
    expect(out.invoiceDate).toBe('2026-05-05T00:00:00.000Z')
    expect(out.dueDate).toBe('2026-06-04T00:00:00.000Z')
  })

  it('passes through a full ISO DateTime unchanged (idempotent)', () => {
    const out = coerceInvoiceDates({ invoiceDate: '2026-05-05T00:00:00.000Z' })
    expect(out.invoiceDate).toBe('2026-05-05T00:00:00.000Z')
  })

  it('keeps null/empty as null', () => {
    const out = coerceInvoiceDates({ invoiceDate: null, dueDate: '', periodFrom: undefined })
    expect(out.invoiceDate).toBeNull()
    expect(out.dueDate).toBeNull()
    expect(out.periodFrom).toBeUndefined()
  })

  it('leaves untouched fields not in the date list', () => {
    const out = coerceInvoiceDates({ invoiceDate: '2026-05-05', notes: '2026-05-05' })
    expect(out.notes).toBe('2026-05-05')   // not coerced — column is String, not DateTime
  })

  it('returns invalid strings unchanged so Prisma can raise a clear error', () => {
    const out = coerceInvoiceDates({ invoiceDate: 'not-a-date' })
    expect(out.invoiceDate).toBe('not-a-date')
  })
})

// ── INVOICE_STRIP_FIELDS — locks the form-only fields that must NOT reach Prisma
//
// The Invoice model has no `baseAmount` / `grossAmount` columns — those are
// Section-B cross-check inputs that live only on the React form. If they
// flow into tx.invoice.create({ data: ... }), Prisma rejects with
// "Unknown argument 'baseAmount'" and POST /api/invoices returns 500. Same
// for `entityName` / `entityCode` (list-route enrichment that the form
// echoes back on edit). Lock the strip list against accidental shrinkage.

describe('INVOICE_STRIP_FIELDS', () => {
  it('strips Section-B form-only fields (baseAmount, grossAmount)', () => {
    expect(INVOICE_STRIP_FIELDS).toContain('baseAmount')
    expect(INVOICE_STRIP_FIELDS).toContain('grossAmount')
  })

  it('strips Map-by-id enrichment fields (entityName, entityCode)', () => {
    expect(INVOICE_STRIP_FIELDS).toContain('entityName')
    expect(INVOICE_STRIP_FIELDS).toContain('entityCode')
  })

  it('strips GET-response relation accessors (vendor, lines, auditLogs, approvals, poLinks, hasFile)', () => {
    for (const f of ['vendor', 'lines', 'auditLogs', 'approvals', 'poLinks', 'hasFile']) {
      expect(INVOICE_STRIP_FIELDS).toContain(f)
    }
  })
})

// ── 4. getInvoiceSummary — the chrome data ────────────────────────────────

describe('getInvoiceSummary', () => {
  function setupPrisma(opts?: { all?: number; pendingApproval?: number; overdue?: number; totalAmount?: number; netPayable?: number }) {
    const all             = opts?.all ?? 5
    const pendingApproval = opts?.pendingApproval ?? 0
    const overdue         = opts?.overdue ?? 0
    const totalAmount     = opts?.totalAmount ?? 0
    const netPayable      = opts?.netPayable ?? 0
    const callLog: any[] = []
    const count = vi.fn().mockImplementation(args => {
      callLog.push(args)
      const w = args?.where ?? {}
      if (w.status === 'DRAFT')             return 1
      if (w.status === 'SUBMITTED')         return 2
      if (w.status === 'PENDING_L1')        return 3
      if (w.status === 'PENDING_L2')        return 4
      if (w.status === 'APPROVED')          return 5
      if (w.status === 'ON_HOLD')           return 6
      if (w.status === 'REJECTED')          return 7
      if (w.status === 'PAYMENT_INITIATED') return 8
      if (w.status === 'PAID')              return 9
      if (Array.isArray(w.OR))              return 10  // UNMATCHED bucket
      if (w.status?.in?.length === 3)       return pendingApproval
      if (w.dueDate?.lt)                    return overdue
      return all
    })
    const aggregate = vi.fn().mockResolvedValue({ _sum: { totalAmount, netPayable } })
    const prisma: any = { invoice: { count, aggregate } }
    return { prisma, count, aggregate, callLog }
  }

  it('returns status counts for all 11 tabs including the derived UNMATCHED bucket', async () => {
    const { prisma } = setupPrisma({ all: 15 })
    const out = await getInvoiceSummary(prisma, TENANT)
    expect(out.statusCounts).toEqual({
      ALL: 15, UNMATCHED: 10, DRAFT: 1, SUBMITTED: 2,
      PENDING_L1: 3, PENDING_L2: 4, APPROVED: 5,
      ON_HOLD: 6, REJECTED: 7, PAYMENT_INITIATED: 8, PAID: 9,
    })
  })

  it('returns footer totals + pending approval + overdue', async () => {
    const { prisma } = setupPrisma({ all: 128, pendingApproval: 12, overdue: 4, totalAmount: 12_50_000, netPayable: 11_00_000 })
    const out = await getInvoiceSummary(prisma, TENANT)
    expect(out.footer).toEqual({
      totalInvoices:   128,
      totalAmount:     12_50_000,
      netPayable:      11_00_000,
      pendingApproval: 12,
      overdue:         4,
    })
  })

  it('counts overdue using NOT IN [PAID, APPROVED, REJECTED, CANCELLED]', async () => {
    const { prisma, callLog } = setupPrisma()
    await getInvoiceSummary(prisma, TENANT, new Date('2026-05-22'))
    const overdueCall = callLog.find(c => c.where?.dueDate?.lt instanceof Date)
    expect(overdueCall.where.status.notIn).toEqual(['PAID', 'APPROVED', 'REJECTED', 'CANCELLED'])
  })
})

// ── 2. INVOICE_LIST_SELECT — locks the projection ───────────────────────────

describe('INVOICE_LIST_SELECT', () => {
  it('selects the columns the UI needs', () => {
    // Spot-check the columns InvoiceListPage.tsx reads.
    expect(INVOICE_LIST_SELECT.id).toBe(true)
    expect(INVOICE_LIST_SELECT.invoiceNumber).toBe(true)
    expect(INVOICE_LIST_SELECT.status).toBe(true)
    expect(INVOICE_LIST_SELECT.channelType).toBe(true)
    expect(INVOICE_LIST_SELECT.totalAmount).toBe(true)
    expect(INVOICE_LIST_SELECT.netPayable).toBe(true)
    expect(INVOICE_LIST_SELECT.apLane).toBe(true)
    expect(INVOICE_LIST_SELECT.recommendedAction).toBe(true)
    expect(INVOICE_LIST_SELECT.vendor).toEqual({
      select: { legalName: true, vendorCode: true, kycPanStatus: true },
    })
  })

  // The reason this fix exists. If a future change re-introduces a heavy
  // JSON column to the listing projection, the sort buffer trips again and
  // the listing endpoint silently 500s. Lock the exclusion.
  it('does NOT select the heavy JSON columns (sort-buffer protection)', () => {
    const sel = INVOICE_LIST_SELECT as Record<string, unknown>
    expect(sel.ocrRawData).toBeUndefined()
    expect(sel.ocrConfidenceMap).toBeUndefined()
    expect(sel.validationIssues).toBeUndefined()
    expect(sel.reviewFlags).toBeUndefined()
    expect(sel.vendorMatchSuggestion).toBeUndefined()
  })
})

// ── 3. listInvoicesForRoute — end-to-end against a mocked prisma ────────────

// Sample rows include the exact failure case: ON_HOLD + EMAIL + recommendedAction='hold'.
// The mock asserts the call shape (select used, no surprise WHERE keys) AND the
// returned data flows through unchanged.
function fakeRows() {
  return [
    {
      id: 'inv-1', invoiceNumber: 'TCS-2026-001', invoiceDate: new Date('2026-07-18'),
      status: 'ON_HOLD', channelType: 'EMAIL',
      totalAmount: '11800', tdsAmount: '0', netPayable: '11800', currencyCode: 'INR',
      apLane: 'MANUAL', matchScore: 69, matchLane: 'MANUAL',
      recommendedAction: 'hold', llmScoredAt: new Date('2026-05-21T13:23:28Z'),
      ocrConfidence: 0, paymentStatus: 'UNPAID', paidAmount: '0',
      isPOInvoice: false, irnNumber: null, irnVerified: false,
      msmeBreach: false, isUrgent: false,
      vendorId: 'v-1', entityId: null,
      createdAt: new Date('2026-05-21'), updatedAt: new Date('2026-05-21'),
      vendor: { legalName: 'TCS Cloud Services India Private Limited', vendorCode: 'VND-0006', kycPanStatus: 'VERIFIED' },
    },
  ]
}

describe('listInvoicesForRoute', () => {
  it('returns ON_HOLD + EMAIL invoices when no filter is passed (no default exclusion)', async () => {
    const findMany = vi.fn().mockResolvedValue(fakeRows())
    const count    = vi.fn().mockResolvedValue(1)
    const prisma: any = { invoice: { findMany, count } }

    const out = await listInvoicesForRoute(prisma, TENANT, {})

    expect(out.total).toBe(1)
    expect(out.data).toHaveLength(1)
    expect(out.data[0]).toMatchObject({
      invoiceNumber: 'TCS-2026-001',
      status:        'ON_HOLD',
      channelType:   'EMAIL',
    })
  })

  // Test 1 (spec): ON_HOLD + EMAIL passes through.
  // Test 2 (spec): no lifecycle_state column on this schema, so this test
  // collapses with #1 — the only equivalent is "freshly-ingested rows
  // (channelType=EMAIL, recommendedAction=hold) appear in the listing".
  // Asserted via the data passing through unchanged.
  // Test 3 (spec): recommendedAction='hold' passes through.
  it('passes recommendedAction=hold rows through unchanged', async () => {
    const findMany = vi.fn().mockResolvedValue(fakeRows())
    const prisma: any = { invoice: { findMany, count: vi.fn().mockResolvedValue(1) } }

    const out = await listInvoicesForRoute(prisma, TENANT, {})
    expect(out.data[0].recommendedAction).toBe('hold')
  })

  // The actual bug guard. Without an explicit select, MySQL trips 1038 on
  // wide rows. This locks the route to ALWAYS pass INVOICE_LIST_SELECT.
  it('calls findMany with INVOICE_LIST_SELECT (never the default "all columns" shape)', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const prisma: any = { invoice: { findMany, count: vi.fn().mockResolvedValue(0) } }
    await listInvoicesForRoute(prisma, TENANT, {})

    const call = findMany.mock.calls[0][0]
    expect(call.select).toBe(INVOICE_LIST_SELECT)
    expect(call.include).toBeUndefined()
  })

  // Test 4 (spec): zero filters → WHERE is only tenantId.
  it('passes no surprise WHERE keys when called with empty query', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const count    = vi.fn().mockResolvedValue(0)
    const prisma: any = { invoice: { findMany, count } }
    await listInvoicesForRoute(prisma, TENANT, {})

    expect(findMany.mock.calls[0][0].where).toEqual({ tenantId: TENANT })
    expect(count.mock.calls[0][0].where).toEqual({ tenantId: TENANT })
  })

  it('orders by createdAt desc and caps at 50 rows', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const prisma: any = { invoice: { findMany, count: vi.fn().mockResolvedValue(0) } }
    await listInvoicesForRoute(prisma, TENANT, {})

    const call = findMany.mock.calls[0][0]
    expect(call.orderBy).toEqual({ createdAt: 'desc' })
    expect(call.take).toBe(50)
  })

  it('forwards specific status filter when caller passes one', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const prisma: any = { invoice: { findMany, count: vi.fn().mockResolvedValue(0) } }
    await listInvoicesForRoute(prisma, TENANT, { status: 'ON_HOLD' })

    expect(findMany.mock.calls[0][0].where).toEqual({ tenantId: TENANT, status: 'ON_HOLD' })
  })

  // Fix 6: entity name surfaces via Map-by-id (no Prisma relation declared on
  // Invoice.entity, so include: { entity } would crash at runtime). Listing
  // column previously rendered the raw UUID for webhook-ingested rows.
  it('resolves entityName via separate entity.findMany lookup', async () => {
    const rows = [{ ...fakeRows()[0], entityId: 'ent-1' }]
    const invoiceFindMany = vi.fn().mockResolvedValue(rows)
    const entityFindMany  = vi.fn().mockResolvedValue([
      { id: 'ent-1', name: 'Procinix Mumbai HQ', code: 'PMHQ' },
    ])
    const prisma: any = {
      invoice: { findMany: invoiceFindMany, count: vi.fn().mockResolvedValue(1) },
      entity:  { findMany: entityFindMany },
    }
    const out = await listInvoicesForRoute(prisma, TENANT, {})

    expect(entityFindMany).toHaveBeenCalledTimes(1)
    // Lookup is filtered by tenant and the distinct ids that appear in the page
    expect(entityFindMany.mock.calls[0][0].where).toEqual({
      id: { in: ['ent-1'] }, tenantId: TENANT,
    })
    expect(out.data[0]).toMatchObject({ entityName: 'Procinix Mumbai HQ', entityCode: 'PMHQ' })
  })

  // Pagination — pageSize defaults to 50 (preserved above) but a caller can
  // override it. Page > 1 attaches `skip`; page === 1 (or absent) does not.
  it('uses caller-supplied pageSize when provided', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const prisma: any = { invoice: { findMany, count: vi.fn().mockResolvedValue(0) } }
    await listInvoicesForRoute(prisma, TENANT, { pageSize: 10 })
    expect(findMany.mock.calls[0][0].take).toBe(10)
    expect(findMany.mock.calls[0][0].skip).toBeUndefined()
  })

  it('applies skip = (page-1) * pageSize when page > 1', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const prisma: any = { invoice: { findMany, count: vi.fn().mockResolvedValue(0) } }
    await listInvoicesForRoute(prisma, TENANT, { pageSize: 10, page: 3 })
    expect(findMany.mock.calls[0][0].take).toBe(10)
    expect(findMany.mock.calls[0][0].skip).toBe(20)
  })

  it('returns entityName=null without calling entity.findMany when no row has an entityId', async () => {
    const entityFindMany = vi.fn()
    const prisma: any = {
      invoice: { findMany: vi.fn().mockResolvedValue(fakeRows()), count: vi.fn().mockResolvedValue(1) },
      entity:  { findMany: entityFindMany },
    }
    const out = await listInvoicesForRoute(prisma, TENANT, {})
    expect(entityFindMany).not.toHaveBeenCalled()
    expect(out.data[0].entityName).toBeNull()
  })
})
