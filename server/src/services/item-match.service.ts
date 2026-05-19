// Item-master fuzzy match — resolves an OCR-extracted line-item description
// to a row in `item_master`. Used by the match agent (line-item match feeds
// the Amount bucket) and surfaced on InvoiceDetailPage so the AP clerk can
// pick between the top candidates when the winner isn't a strong match.

import type { PrismaClient } from '@prisma/client'
import Fuse from 'fuse.js'

export interface ItemCandidate {
  id:          string
  itemCode:    string
  name:        string
  description: string | null
  hsnCode:     string | null
  gstRate:     number | null
  /** 0–100 — higher is better. ≥98 is the "auto-accept" threshold. */
  score:       number
}

export interface ItemMatchResult {
  /** Top candidate (best match) — null if no items in tenant. */
  winner:      ItemCandidate | null
  /** Top-3 candidates by score, including the winner. Used for the near-matches dropdown. */
  candidates:  ItemCandidate[]
}

interface ItemRow {
  id:          string
  itemCode:    string
  name:        string
  description: string | null
  hsnCode:     string | null
  gstRate:     unknown            // Prisma Decimal — coerced to number below
  ocrKeywords: string | null
  ocrSynonyms: string | null
}

// fuse.js returns 0 = perfect, 1 = no match. Invert + scale to 0–100.
function fuseScoreToPct(score: number | undefined): number {
  if (score == null) return 0
  return Math.round((1 - Math.min(Math.max(score, 0), 1)) * 100)
}

/**
 * Fuzzy-match an OCR description against active items in the tenant.
 * Searches across `name`, `description`, `itemCode`, `ocrKeywords`, `ocrSynonyms`
 * with weights favouring name/description matches.
 *
 * Returns top-3 candidates with scores. Empty array when the tenant has no items.
 */
export function matchItemDescription(
  items: ItemRow[],
  description: string,
): ItemMatchResult {
  if (items.length === 0 || !description.trim()) {
    return { winner: null, candidates: [] }
  }

  const fuse = new Fuse(items, {
    keys: [
      { name: 'name',         weight: 0.5  },
      { name: 'description',  weight: 0.25 },
      { name: 'ocrKeywords',  weight: 0.15 },
      { name: 'ocrSynonyms',  weight: 0.05 },
      { name: 'itemCode',     weight: 0.05 },
    ],
    includeScore: true,
    threshold:    0.6,    // loose enough to surface near-matches
    ignoreLocation: true, // descriptions may have keywords anywhere
  })

  const results = fuse.search(description, { limit: 3 })
  const candidates: ItemCandidate[] = results.map(r => ({
    id:          r.item.id,
    itemCode:    r.item.itemCode,
    name:        r.item.name,
    description: r.item.description,
    hsnCode:     r.item.hsnCode,
    gstRate:     r.item.gstRate == null ? null : Number(r.item.gstRate),
    score:       fuseScoreToPct(r.score),
  }))

  return {
    winner:     candidates[0] ?? null,
    candidates,
  }
}

/**
 * Batch helper — pulls items once, matches every OCR line. The DB read happens
 * once per invoice (not per line) which matters when an invoice has 20+ lines.
 */
export async function matchOcrLinesToItems(
  prisma:      PrismaClient,
  tenantId:    string,
  descriptions: string[],
): Promise<ItemMatchResult[]> {
  if (descriptions.length === 0) return []

  const items = await prisma.itemMaster.findMany({
    where:  { tenantId, status: 'ACTIVE' },
    select: {
      id: true, itemCode: true, name: true, description: true,
      hsnCode: true, gstRate: true, ocrKeywords: true, ocrSynonyms: true,
    },
  })

  return descriptions.map(d => matchItemDescription(items as ItemRow[], d))
}
