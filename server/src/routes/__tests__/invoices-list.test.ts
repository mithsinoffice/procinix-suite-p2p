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
  INVOICE_LIST_SELECT,
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
