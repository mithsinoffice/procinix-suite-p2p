// Provisioning endpoints — proposal generation, batch workflow, register,
// month-on-month view, system suggestions. All routes tenant-scoped via
// req.tenant.id. Pure logic (suggestion rules, MoM assembly, proposal merge)
// lives in services/provision.service.ts; this file does the DB plumbing.

import type { FastifyInstance } from 'fastify'
import type { Prisma, PrismaClient } from '@prisma/client'
import { sanitisePayload } from '../lib/payload.js'
import {
  generateProposals,
  buildMoMRows,
  detectPromoteToRecurring,
  detectAmountDrift,
  detectGaps,
  type ProposalDraft,
  type InvoiceCoverage,
  type MoMCell,
  type MoMStatus,
  type ManualOccurrence,
  type DriftObservation,
  type GapObservation,
} from '../services/provision.service.js'
import { startWorkflow } from '../services/workflow-engine.service.js'

interface PeriodQuery { period?: string }
interface MomQuery { months?: string }

// Sanity-check + default. Returns YYYY-MM matching the current month if no
// period given. Throws on garbage like "2026-13" so the rest of the route
// can assume a real period.
function normalisePeriod(input?: string): string {
  if (!input) return new Date().toISOString().slice(0, 7)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input)) {
    throw new Error(`Invalid period "${input}" — expected YYYY-MM`)
  }
  return input
}

// Reduce N months back from a YYYY-MM, returning the resulting period list
// (oldest → newest, inclusive of the anchor). Used by MoM and suggestions.
function priorPeriods(anchor: string, months: number): string[] {
  const [y, m] = anchor.split('-').map(Number)
  const out: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

interface ProvisionableItem {
  itemId:             string
  description:        string
  provisionAmount:    number
  provisionFrequency: string | null
  expenseGlCode:      string
  provisionGlCode:    string
  tdsSection:         string | null
}

// Fetch every provisionable item (provisionRequired=true) for the tenant,
// resolving each item's expense + provision GL codes from ItemEntityMapping
// (first mapping wins — caller can extend with entity scoping later).
async function fetchProvisionableItems(prisma: PrismaClient, tenantId: string): Promise<ProvisionableItem[]> {
  const items = await prisma.itemMaster.findMany({
    where: { tenantId, status: 'ACTIVE', provisionRequired: true },
    select: {
      id: true, name: true, provisionAmount: true, provisionFrequency: true,
      tdsSectionId: true,
      entityMappings: {
        take: 1,
        select: { expenseGlCodeId: true, provisionGlCodeId: true, provisionAmountOverride: true },
      },
    },
  })
  // Resolve TDS sections to their code strings.
  const tdsIds = [...new Set(items.map(i => i.tdsSectionId).filter(Boolean) as string[])]
  const tdsRows = tdsIds.length > 0
    ? await prisma.tDSSection.findMany({ where: { id: { in: tdsIds }, tenantId }, select: { id: true, section: true } })
    : []
  const tdsById = new Map(tdsRows.map(r => [r.id, r.section]))

  // Resolve every GL id we'll need in one round-trip.
  const glIds = new Set<string>()
  for (const i of items) {
    for (const m of i.entityMappings) {
      if (m.expenseGlCodeId)   glIds.add(m.expenseGlCodeId)
      if (m.provisionGlCodeId) glIds.add(m.provisionGlCodeId)
    }
  }
  const glRows = glIds.size > 0
    ? await prisma.glCode.findMany({ where: { id: { in: [...glIds] }, tenantId }, select: { id: true, code: true } })
    : []
  const glById = new Map(glRows.map(r => [r.id, r.code]))

  return items.map(i => {
    const mapping = i.entityMappings[0]
    const expenseCode  = mapping ? glById.get(mapping.expenseGlCodeId ?? '') ?? '5080' : '5080'
    const provisionCode = mapping ? glById.get(mapping.provisionGlCodeId ?? '') ?? '2001' : '2001'
    const amount = mapping?.provisionAmountOverride
      ? Number(mapping.provisionAmountOverride)
      : Number(i.provisionAmount ?? 0)
    return {
      itemId:             i.id,
      description:        i.name,
      provisionAmount:    amount,
      provisionFrequency: i.provisionFrequency,
      expenseGlCode:      expenseCode,
      provisionGlCode:    provisionCode,
      tdsSection:         (i.tdsSectionId && tdsById.get(i.tdsSectionId)) ?? null,
    }
  })
}

// Build the (itemId → coverage) map for a given period from approved invoices.
async function fetchInvoiceCoverage(prisma: PrismaClient, tenantId: string, period: string): Promise<InvoiceCoverage[]> {
  const [y, m] = period.split('-').map(Number)
  const periodStart = new Date(Date.UTC(y, m - 1, 1))
  const periodEnd   = new Date(Date.UTC(y, m, 1))

  const lines = await prisma.invoiceLine.findMany({
    where: {
      itemId: { not: null },
      invoice: {
        tenantId,
        status: 'APPROVED',
        invoiceDate: { gte: periodStart, lt: periodEnd },
      },
    },
    select: {
      itemId: true, lineTotal: true,
      invoice: { select: { id: true, invoiceNumber: true, invoiceRef: true } },
    },
  })

  // Collapse by itemId — multiple lines / invoices for the same item in the
  // same period: sum amounts, pick the first invoice ref.
  const byItem = new Map<string, InvoiceCoverage>()
  for (const l of lines) {
    if (!l.itemId) continue
    const existing = byItem.get(l.itemId)
    if (existing) {
      existing.amount += Number(l.lineTotal)
    } else {
      byItem.set(l.itemId, {
        itemId:     l.itemId,
        invoiceId:  l.invoice.id,
        invoiceRef: l.invoice.invoiceRef ?? l.invoice.invoiceNumber,
        amount:     Number(l.lineTotal),
      })
    }
  }
  return [...byItem.values()]
}

export async function provisionsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // ── GET /api/provisions/proposals?period=YYYY-MM ─────────────────────
  app.get('/proposals', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    let period: string
    try { period = normalisePeriod((req.query as PeriodQuery).period) }
    catch (e: unknown) { return reply.code(400).send({ code: 'VALIDATION_ERROR', message: (e as Error).message }) }

    const [items, coverage, persistedRows] = await Promise.all([
      fetchProvisionableItems(app.prisma, tenantId),
      fetchInvoiceCoverage(app.prisma, tenantId, period),
      app.prisma.provisionProposal.findMany({ where: { tenantId, period } }),
    ])

    // Vendor names for any persisted draft that has a vendorId. We resolve in
    // bulk to avoid an N+1 inside the merge loop.
    const vendorIds = [...new Set(persistedRows.map(p => p.vendorId).filter(Boolean) as string[])]
    const vendors = vendorIds.length > 0
      ? await app.prisma.vendor.findMany({ where: { id: { in: vendorIds }, tenantId }, select: { id: true, legalName: true, tradeName: true } })
      : []
    const vendorById = new Map(vendors.map(v => [v.id, v.tradeName ?? v.legalName]))

    const persistedDrafts: ProposalDraft[] = persistedRows.map(r => ({
      id:              r.id,
      itemId:          r.itemId ?? undefined,
      vendorId:        r.vendorId ?? undefined,
      vendorName:      r.vendorId ? vendorById.get(r.vendorId) ?? undefined : undefined,
      description:     r.description,
      proposedAmount:  Number(r.proposedAmount),
      isManual:        r.isManual,
      source:          r.source,
      status:          r.status,
      invoiceCovered:  !!r.invoiceCoveredId,
      expenseGlCode:   r.expenseGlCode,
      provisionGlCode: r.provisionGlCode,
      tdsSection:      r.tdsSection ?? undefined,
      frequency:       'MONTHLY',
    }))

    const proposals = generateProposals(items, period, coverage, persistedDrafts)

    const summary = {
      totalApplicable:    proposals.length,
      invoiceCovered:     proposals.filter(p => p.invoiceCovered).length,
      provisionRequired:  proposals.filter(p => !p.invoiceCovered && !p.isManual).length,
      manualAdditions:    proposals.filter(p => p.isManual).length,
      totalProposedAmount: proposals
        .filter(p => !p.invoiceCovered)
        .reduce((s, p) => s + (p.proposedAmount ?? 0), 0),
    }

    return reply.send({ period, proposals, summary })
  })

  // ── POST /api/provisions/proposals ───────────────────────────────────
  // Upsert N proposals at once. Items the user didn't tick aren't persisted —
  // they remain ephemeral, regenerated on every GET. Items that lose their
  // proposal row revert to draft on next view.
  app.post('/proposals', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const userId   = req.user.sub
    const raw = sanitisePayload(req.body as Record<string, unknown>) as {
      period?:    string
      proposals?: Array<{
        id?: string; itemId?: string; vendorId?: string; description: string;
        proposedAmount: number; isManual?: boolean; source?: string;
        expenseGlCode: string; provisionGlCode: string;
        tdsSection?: string | null; reversalTrigger?: string; narration?: string | null
      }>
    }
    if (!raw.period || !raw.proposals) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'period + proposals required' })
    let period: string
    try { period = normalisePeriod(raw.period) }
    catch (e: unknown) { return reply.code(400).send({ code: 'VALIDATION_ERROR', message: (e as Error).message }) }

    // Upsert one-by-one — Prisma's createMany skips relations and we want
    // the row IDs for the response.
    const persisted = []
    for (const p of raw.proposals) {
      if (p.id) {
        const row = await app.prisma.provisionProposal.update({
          where: { id: p.id },
          data: {
            description:     p.description,
            proposedAmount:  p.proposedAmount,
            expenseGlCode:   p.expenseGlCode,
            provisionGlCode: p.provisionGlCode,
            tdsSection:      p.tdsSection ?? null,
            reversalTrigger: p.reversalTrigger ?? 'FIRST_OF_NEXT_MONTH',
            narration:       p.narration ?? null,
            status:          'DRAFT',
          },
        })
        persisted.push(row)
      } else {
        const row = await app.prisma.provisionProposal.create({
          data: {
            tenantId, period,
            itemId:          p.itemId ?? null,
            vendorId:        p.vendorId ?? null,
            description:     p.description,
            proposedAmount:  p.proposedAmount,
            isManual:        p.isManual ?? false,
            source:          p.source ?? (p.isManual ? 'MANUAL' : 'ITEM_MASTER'),
            expenseGlCode:   p.expenseGlCode,
            provisionGlCode: p.provisionGlCode,
            tdsSection:      p.tdsSection ?? null,
            reversalTrigger: p.reversalTrigger ?? 'FIRST_OF_NEXT_MONTH',
            narration:       p.narration ?? null,
            createdBy:       userId,
            status:          'DRAFT',
          },
        })
        persisted.push(row)
      }
    }
    return reply.send({ saved: persisted.length, ids: persisted.map(r => r.id) })
  })

  // ── POST /api/provisions/batch/submit ────────────────────────────────
  // Wraps the selected proposals in a ProvisionBatch + kicks off WF-PROVISION-001.
  app.post('/batch/submit', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const userId   = req.user.sub
    const body = (req.body ?? {}) as {
      period?: string
      proposalIds?: string[]
      amounts?: Record<string, number>
    }
    if (!body.period || !Array.isArray(body.proposalIds) || body.proposalIds.length === 0) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'period + non-empty proposalIds required' })
    }
    let period: string
    try { period = normalisePeriod(body.period) }
    catch (e: unknown) { return reply.code(400).send({ code: 'VALIDATION_ERROR', message: (e as Error).message }) }

    // Update each proposal's amount if the caller supplied one, then snapshot
    // the total. We do this in a single transaction so an aborted submit
    // doesn't leave proposals half-updated.
    const totalAmount = await app.prisma.$transaction(async tx => {
      let total = 0
      for (const id of body.proposalIds!) {
        const overrideAmt = body.amounts?.[id]
        const updated = await tx.provisionProposal.update({
          where: { id },
          data: {
            ...(overrideAmt != null && { proposedAmount: overrideAmt }),
            status: 'SUBMITTED',
          },
        })
        total += Number(updated.proposedAmount)
      }
      return total
    })

    const batch = await app.prisma.provisionBatch.create({
      data: {
        tenantId, period,
        totalAmount,
        proposalIds: body.proposalIds as Prisma.InputJsonValue,
        status: 'SUBMITTED',
        submittedBy: userId,
      },
    })

    // Stamp each proposal with the batch id for back-reference.
    await app.prisma.provisionProposal.updateMany({
      where: { id: { in: body.proposalIds } },
      data:  { batchId: batch.id },
    })

    // Kick off workflow — the engine returns NO_WORKFLOW_DEFINED when no
    // ACTIVE WF-PROVISION-* matches. We surface that as a non-fatal result
    // so the user knows to seed the workflow before the next submit.
    const wf = await startWorkflow(
      app.prisma,
      'PROVISION',
      'provision_batch', batch.id,
      { totalAmount, period },
      { tenantId, userId, userName: (req.user as { name?: string }).name ?? userId, userRole: (req.user as { role?: string }).role },
    )
    if (!wf.ok) {
      if (wf.error.message === 'NO_WORKFLOW_DEFINED') {
        return reply.send({ ok: true, batchId: batch.id, workflowInstanceId: null, warning: 'NO_WORKFLOW_DEFINED' })
      }
      return reply.code(400).send(wf.error)
    }
    await app.prisma.provisionBatch.update({
      where: { id: batch.id },
      data: { workflowInstanceId: wf.data.instanceId },
    })
    return reply.send({ ok: true, batchId: batch.id, workflowInstanceId: wf.data.instanceId })
  })

  // ── GET /api/provisions/register?period=YYYY-MM ─────────────────────
  // Approved proposals + linked JV refs + reversal info.
  app.get('/register', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    let period: string
    try { period = normalisePeriod((req.query as PeriodQuery).period) }
    catch (e: unknown) { return reply.code(400).send({ code: 'VALIDATION_ERROR', message: (e as Error).message }) }

    const rows = await app.prisma.provisionProposal.findMany({
      where: { tenantId, period, status: 'APPROVED' },
      orderBy: { createdAt: 'asc' },
    })

    const jvIds = [...new Set(rows.flatMap(r => [r.jvId, r.reversalJvId]).filter(Boolean) as string[])]
    const jvs = jvIds.length > 0
      ? await app.prisma.journalEntry.findMany({
          where: { id: { in: jvIds }, tenantId },
          select: { id: true, entryDate: true, postingDate: true, debitGlCode: true, creditGlCode: true, erpStatus: true, amount: true },
        })
      : []
    const jvById = new Map(jvs.map(j => [j.id, j]))

    const vendorIds = [...new Set(rows.map(r => r.vendorId).filter(Boolean) as string[])]
    const vendors = vendorIds.length > 0
      ? await app.prisma.vendor.findMany({ where: { id: { in: vendorIds }, tenantId }, select: { id: true, legalName: true, tradeName: true } })
      : []
    const vendorById = new Map(vendors.map(v => [v.id, v.tradeName ?? v.legalName]))

    return reply.send(rows.map(r => {
      const jv = r.jvId ? jvById.get(r.jvId) : null
      const reversal = r.reversalJvId ? jvById.get(r.reversalJvId) : null
      return {
        id:              r.id,
        description:     r.description,
        vendorName:      r.vendorId ? vendorById.get(r.vendorId) ?? null : null,
        amount:          Number(r.approvedAmount ?? r.proposedAmount),
        jvRef:           jv?.id ?? null,
        debitGl:         jv?.debitGlCode ?? r.expenseGlCode,
        creditGl:        jv?.creditGlCode ?? r.provisionGlCode,
        reversalJvRef:   reversal?.id ?? null,
        reversalDate:    reversal?.postingDate ?? null,
        erpStatus:       jv?.erpStatus ?? null,
      }
    }))
  })

  // ── GET /api/provisions/mom?months=6 ──────────────────────────────────
  app.get('/mom', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const months = Math.min(Math.max(Number((req.query as MomQuery).months ?? 6), 1), 24)
    const anchor = new Date().toISOString().slice(0, 7)
    const monthKeys = priorPeriods(anchor, months)

    const items = await fetchProvisionableItems(app.prisma, tenantId)
    const itemMeta = items.map(i => ({
      itemId:       i.itemId,
      description:  i.description,
      masterAmount: i.provisionAmount,
      frequency:    i.provisionFrequency ?? 'MONTHLY',
    }))

    // Gather all relevant data in one go per period: proposals + invoice
    // coverage + manual additions.
    const allProposals = await app.prisma.provisionProposal.findMany({
      where: { tenantId, period: { in: monthKeys } },
    })

    // Approved invoices per period (item-keyed).
    const [yA, mA] = monthKeys[0].split('-').map(Number)
    const [yB, mB] = monthKeys[monthKeys.length - 1].split('-').map(Number)
    const start = new Date(Date.UTC(yA, mA - 1, 1))
    const end   = new Date(Date.UTC(yB, mB, 1))
    const invoiceLines = await app.prisma.invoiceLine.findMany({
      where: {
        itemId: { not: null },
        invoice: { tenantId, status: 'APPROVED', invoiceDate: { gte: start, lt: end } },
      },
      select: {
        itemId: true, lineTotal: true,
        invoice: { select: { id: true, invoiceNumber: true, invoiceRef: true, invoiceDate: true } },
      },
    })

    // Build cell map.
    const cells = new Map<string, Record<string, MoMCell>>()
    function ensure(itemId: string): Record<string, MoMCell> {
      if (!cells.has(itemId)) cells.set(itemId, {})
      return cells.get(itemId)!
    }

    for (const line of invoiceLines) {
      if (!line.itemId) continue
      const period = `${line.invoice.invoiceDate.getUTCFullYear()}-${String(line.invoice.invoiceDate.getUTCMonth() + 1).padStart(2, '0')}`
      const row = ensure(line.itemId)
      const existing = row[period]
      const amount = Number(line.lineTotal) + (existing?.amount ?? 0)
      row[period] = {
        status:     'INV',
        amount,
        invoiceRef: line.invoice.invoiceRef ?? line.invoice.invoiceNumber,
      }
    }

    for (const p of allProposals) {
      if (!p.itemId) {
        // Pure manual — surface a synthetic row via description as itemId so
        // it still renders. We use a stable prefix to avoid colliding.
        const syntheticId = `manual::${p.id}`
        const row = ensure(syntheticId)
        row[p.period] = {
          status:   'MAN',
          amount:   Number(p.approvedAmount ?? p.proposedAmount),
          isManual: true,
          source:   p.source,
        }
        // Inject into itemMeta lazily.
        if (!itemMeta.some(i => i.itemId === syntheticId)) {
          itemMeta.push({
            itemId: syntheticId,
            description: p.description,
            masterAmount: Number(p.proposedAmount),
            frequency: 'MANUAL',
          })
        }
        continue
      }
      const row = ensure(p.itemId)
      // Don't overwrite an INV cell (already received an invoice).
      if (row[p.period]?.status === 'INV') continue
      if (p.status === 'APPROVED') {
        row[p.period] = {
          status:   p.isManual ? 'MAN' : 'PROV',
          amount:   Number(p.approvedAmount ?? p.proposedAmount),
          jvRef:    p.jvId ?? undefined,
          isManual: p.isManual,
          source:   p.source,
        }
      }
    }

    // Fill MISS cells for any period a provisionable item has no coverage.
    for (const item of itemMeta) {
      const row = ensure(item.itemId)
      for (const key of monthKeys) {
        if (!row[key]) {
          // QUARTERLY/YEARLY items aren't applicable every month → mark NA.
          const applicable = item.frequency === 'MONTHLY' || isApplicable(item.frequency, key)
          row[key] = applicable
            ? { status: 'MISS', amount: 0 }
            : { status: 'NA', amount: 0 }
        }
      }
    }

    const rows = buildMoMRows(itemMeta, cells, monthKeys)

    // Surface a flat gap list alongside the matrix for quick scanning.
    const gaps: { itemId: string; description: string; month: string; suggestedAction: string }[] = []
    for (const r of rows) {
      for (const key of monthKeys) {
        if (r.months[key]?.status === 'MISS') {
          gaps.push({
            itemId:          r.itemId,
            description:     r.description,
            month:           key,
            suggestedAction: 'Post a backdated provision JV or mark as covered',
          })
        }
      }
    }

    return reply.send({ months: monthKeys, items: rows, gaps })
  })

  // ── GET /api/provisions/suggestions?period=YYYY-MM ──────────────────
  app.get('/suggestions', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const anchor = normalisePeriod((req.query as PeriodQuery).period)
    const monthKeys = priorPeriods(anchor, 6)

    const proposals = await app.prisma.provisionProposal.findMany({
      where: { tenantId, period: { in: monthKeys } },
    })
    const vendorIds = [...new Set(proposals.map(p => p.vendorId).filter(Boolean) as string[])]
    const vendors = vendorIds.length > 0
      ? await app.prisma.vendor.findMany({ where: { id: { in: vendorIds }, tenantId }, select: { id: true, legalName: true, tradeName: true } })
      : []
    const vendorById = new Map(vendors.map(v => [v.id, v.tradeName ?? v.legalName]))

    // Manual occurrences for promote-to-recurring detection.
    const manualOccurrences: ManualOccurrence[] = proposals
      .filter(p => p.isManual)
      .map(p => ({
        itemId:      p.itemId ?? `manual::${p.description.toLowerCase()}`,
        description: p.description,
        vendorId:    p.vendorId ?? undefined,
        vendorName:  p.vendorId ? vendorById.get(p.vendorId) ?? undefined : undefined,
        period:      p.period,
        amount:      Number(p.approvedAmount ?? p.proposedAmount),
      }))

    // Drift: compare approved provisions vs approved invoices per item-period.
    const [yA, mA] = monthKeys[0].split('-').map(Number)
    const [yB, mB] = monthKeys[monthKeys.length - 1].split('-').map(Number)
    const lines = await app.prisma.invoiceLine.findMany({
      where: {
        itemId: { not: null },
        invoice: {
          tenantId, status: 'APPROVED',
          invoiceDate: { gte: new Date(Date.UTC(yA, mA - 1, 1)), lt: new Date(Date.UTC(yB, mB, 1)) },
        },
      },
      select: {
        itemId: true, lineTotal: true, description: true,
        invoice: { select: { invoiceDate: true } },
      },
    })
    const drift: DriftObservation[] = []
    const provByKey = new Map<string, number>()
    for (const p of proposals) {
      if (!p.itemId) continue
      provByKey.set(`${p.itemId}::${p.period}`, Number(p.approvedAmount ?? p.proposedAmount))
    }
    const itemIds = [...new Set(lines.map(l => l.itemId!).filter(Boolean))]
    const itemNames = itemIds.length > 0
      ? await app.prisma.itemMaster.findMany({ where: { id: { in: itemIds }, tenantId }, select: { id: true, name: true } })
      : []
    const nameByItem = new Map(itemNames.map(i => [i.id, i.name]))

    for (const l of lines) {
      const period = `${l.invoice.invoiceDate.getUTCFullYear()}-${String(l.invoice.invoiceDate.getUTCMonth() + 1).padStart(2, '0')}`
      const prov = provByKey.get(`${l.itemId}::${period}`) ?? 0
      if (prov <= 0) continue
      drift.push({
        itemId:          l.itemId!,
        description:     nameByItem.get(l.itemId!) ?? l.description,
        period,
        provisionAmount: prov,
        invoiceAmount:   Number(l.lineTotal),
      })
    }

    // Gaps: every (item, period) where status===MISS becomes a GapObservation.
    const items = await fetchProvisionableItems(app.prisma, tenantId)
    const gapObs: GapObservation[] = []
    for (const item of items) {
      for (const period of monthKeys) {
        const proposalRow = proposals.find(p => p.itemId === item.itemId && p.period === period)
        const status: MoMStatus = proposalRow?.status === 'APPROVED' ? 'PROV' : 'MISS'
        if (status === 'MISS') {
          gapObs.push({ itemId: item.itemId, description: item.description, period, status })
        }
      }
    }

    const suggestions = [
      ...detectPromoteToRecurring(manualOccurrences),
      ...detectAmountDrift(drift),
      ...detectGaps(gapObs),
    ]
    return reply.send(suggestions)
  })

  // ── POST /api/provisions/suggestions/accept ─────────────────────────
  app.post('/suggestions/accept', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const body = sanitisePayload(req.body as Record<string, unknown>) as {
      type?: string; itemId?: string; suggestedAmount?: number; frequency?: string
    }
    if (!body.type || !body.itemId) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'type + itemId required' })

    if (body.type === 'PROMOTE_TO_RECURRING') {
      // Manual additions have synthetic itemIds (manual::...) — those can't
      // be promoted directly because there's no live item row. Treat as a
      // no-op + signal to UI.
      if (body.itemId.startsWith('manual::')) {
        return reply.send({ ok: false, reason: 'NO_LIVE_ITEM', message: 'Promote requires linking to an item master row first.' })
      }
      await app.prisma.itemMaster.update({
        where: { id: body.itemId, tenantId },
        data:  {
          provisionRequired:  true,
          provisionAmount:    body.suggestedAmount ?? undefined,
          provisionFrequency: body.frequency ?? 'MONTHLY',
          autoPostProvision:  true,
        },
      })
      return reply.send({ ok: true })
    }

    if (body.type === 'UPDATE_PROVISION_AMOUNT') {
      if (body.suggestedAmount == null) return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'suggestedAmount required' })
      await app.prisma.itemMaster.update({
        where: { id: body.itemId, tenantId },
        data:  { provisionAmount: body.suggestedAmount },
      })
      return reply.send({ ok: true })
    }

    return reply.send({ ok: false, reason: 'NOT_AUTO_ACCEPTABLE', message: 'BACKDATE_JV requires manual addition via Manual Additions tab.' })
  })

  // ── POST /api/provisions/manual ──────────────────────────────────────
  app.post('/manual', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const userId   = req.user.sub
    const raw = sanitisePayload(req.body as Record<string, unknown>) as {
      period?: string; description?: string; vendorId?: string; amount?: number;
      expenseGlCode?: string; provisionGlCode?: string;
      tdsSection?: string; reversalTrigger?: string; narration?: string
    }
    if (!raw.period || !raw.description || !raw.amount || !raw.expenseGlCode || !raw.provisionGlCode) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'period, description, amount, expenseGlCode, provisionGlCode required' })
    }
    let period: string
    try { period = normalisePeriod(raw.period) }
    catch (e: unknown) { return reply.code(400).send({ code: 'VALIDATION_ERROR', message: (e as Error).message }) }

    const proposal = await app.prisma.provisionProposal.create({
      data: {
        tenantId, period,
        itemId:          null,
        vendorId:        raw.vendorId ?? null,
        description:     raw.description,
        proposedAmount:  raw.amount,
        isManual:        true,
        source:          'MANUAL',
        expenseGlCode:   raw.expenseGlCode,
        provisionGlCode: raw.provisionGlCode,
        tdsSection:      raw.tdsSection ?? null,
        reversalTrigger: raw.reversalTrigger ?? 'FIRST_OF_NEXT_MONTH',
        narration:       raw.narration ?? null,
        createdBy:       userId,
        status:          'DRAFT',
      },
    })
    return reply.code(201).send(proposal)
  })

  // ── DELETE /api/provisions/proposals/:id ─────────────────────────────
  // Used by Manual Additions tab to remove an entry before it's submitted.
  app.delete('/proposals/:id', auth, async (req, reply) => {
    const tenantId = req.tenant.id
    const { id } = req.params as { id: string }
    const row = await app.prisma.provisionProposal.findFirst({ where: { id, tenantId } })
    if (!row) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Proposal not found' })
    if (row.status !== 'DRAFT') return reply.code(400).send({ code: 'INVALID_STATE', message: 'Only DRAFT proposals can be deleted' })
    await app.prisma.provisionProposal.delete({ where: { id } })
    return reply.send({ ok: true })
  })

}

// QUARTERLY/YEARLY applicability for MoM cell tagging.
function isApplicable(frequency: string, period: string): boolean {
  if (frequency === 'QUARTERLY') {
    const [, mm] = period.split('-')
    const m = Number(mm) - 1
    return m === 2 || m === 5 || m === 8 || m === 11
  }
  if (frequency === 'YEARLY') {
    return period.endsWith('-03')
  }
  return true
}

