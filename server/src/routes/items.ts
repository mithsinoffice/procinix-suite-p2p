import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { matchItemDescriptions, type ItemForMatch } from '../services/item-matcher.service.js'

// Match-request schema. `descriptions` is a flat array — order preserved in
// the response so the caller can map results back to its line items by index.
// tenantId is accepted in the body for parity with the spec but always
// overridden by req.tenant.id (JWT) — never trusted from the client.
const matchBodySchema = z.object({
  descriptions: z.array(z.string()).min(1).max(50),
  tenantId:     z.string().optional(),
}).strict()

export async function itemRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  // ── POST /api/items/match ──
  // Fuzzy-match a batch of free-text descriptions (typically extracted by OCR)
  // against the tenant's item master. Returns top-3 matches per description
  // plus an autoSelect flag the form can use to populate the Item dropdown
  // without user action when confidence is high (≥0.85).
  //
  // Item.defaultGlCode + defaultCostCentre live in ItemEntityMapping (per-
  // entity overrides), so the loader pulls the first active mapping per item.
  // The frontend can override later based on the entity actually picked on
  // the invoice header — these are first-pass defaults, not authoritative.
  app.post('/match', auth, async (req, reply) => {
    const parsed = matchBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'descriptions[] required', issues: parsed.error.flatten() })
    }
    const tenantId = req.tenant.id

    // Pull the catalog once. ItemEntityMapping is fetched in parallel — keyed
    // by itemId so we resolve a default GL + CC pair per item without an N+1.
    const [items, mappings, glCodes, costCentres] = await Promise.all([
      app.prisma.itemMaster.findMany({
        where:  { tenantId, status: 'ACTIVE' },
        select: {
          id: true, itemCode: true, name: true, description: true,
          gstRate: true, tdsSectionId: true, hsnCode: true, sacCode: true,
        },
      }),
      app.prisma.itemEntityMapping.findMany({
        where:  { isActive: true, item: { tenantId } },
        select: { itemId: true, expenseGlCodeId: true, costCentreId: true },
      }),
      app.prisma.glCode.findMany({ where: { tenantId }, select: { id: true, code: true } }),
      app.prisma.costCentre.findMany({ where: { tenantId }, select: { id: true, code: true } }),
    ])

    // tdsSection.defaultRate resolution — small lookup table built once so the
    // per-item resolve below is O(1).
    const tdsSections = await app.prisma.tDSSection.findMany({
      where:  { tenantId },
      select: { id: true, defaultRate: true },
    })
    const tdsRateById = new Map(tdsSections.map(s => [s.id, Number(s.defaultRate)]))
    const glCodeById  = new Map(glCodes.map(g     => [g.id, g.code]))
    const ccCodeById  = new Map(costCentres.map(c => [c.id, c.code]))

    // First active mapping per item gives us a default GL + CC. If the tenant
    // has multiple entities, this is the first one Prisma returns — good
    // enough for an OCR-time best guess; the form lets the user change it.
    const firstMappingByItem = new Map<string, { expenseGlCodeId: string | null; costCentreId: string | null }>()
    for (const m of mappings) {
      if (!firstMappingByItem.has(m.itemId)) firstMappingByItem.set(m.itemId, { expenseGlCodeId: m.expenseGlCodeId, costCentreId: m.costCentreId })
    }

    const catalog: ItemForMatch[] = items.map(it => {
      const map = firstMappingByItem.get(it.id) ?? { expenseGlCodeId: null, costCentreId: null }
      return {
        itemId:            it.id,
        itemCode:          it.itemCode,
        itemName:          it.name,
        description:       it.description,
        gstRate:           it.gstRate !== null ? Number(it.gstRate) : null,
        tdsRate:           it.tdsSectionId ? (tdsRateById.get(it.tdsSectionId) ?? null) : null,
        defaultGlCode:     map.expenseGlCodeId ? (glCodeById.get(map.expenseGlCodeId) ?? null) : null,
        defaultCostCentre: map.costCentreId    ? (ccCodeById.get(map.costCentreId)    ?? null) : null,
        sacHsnCode:        it.sacCode ?? it.hsnCode ?? null,
      }
    })

    const results = matchItemDescriptions(parsed.data.descriptions, catalog)
    return reply.send(results)
  })
}
