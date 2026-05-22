// Item master fuzzy matcher — runs after OCR populates line-item descriptions
// so the form can auto-select an Item from the master catalog instead of asking
// the user to scroll through hundreds of options.
//
// Same pattern as the vendor GSTIN auto-match: pure function with no DB or
// network — the route fetches candidates from Prisma and hands them in. Unit
// tests drive the function directly.

import { similarity } from './duplicate-detector.service.js'

// Words that carry no matching signal — "Services", "Management" etc.
// appear in almost every item name and would inflate confidence on
// unrelated rows if treated as evidence of a match.
const STOP_WORDS = new Set([
  'services', 'service',
  'management',
  'pvt', 'ltd', 'limited', 'private',
  'and', '&', 'of', 'for', 'the', 'a', 'an', 'with',
  'inc', 'corp', 'co',
])

export type MatchType = 'EXACT' | 'HIGH' | 'FUZZY' | 'PARTIAL'

export interface ItemForMatch {
  itemId:            string
  itemCode:          string
  itemName:          string
  description:       string | null
  gstRate:           number | null
  tdsRate:           number | null
  defaultGlCode:     string | null
  defaultCostCentre: string | null
  sacHsnCode:        string | null
}

export interface ItemMatch {
  itemId:            string
  itemCode:          string
  itemName:          string
  description:       string | null
  gstRate:           number | null
  tdsRate:           number | null
  defaultGlCode:     string | null
  defaultCostCentre: string | null
  sacHsnCode:        string | null
  confidence:        number       // 0-1
  matchType:         MatchType
}

export interface ItemMatchResult {
  inputDescription: string
  matches:          ItemMatch[]    // top 3 sorted by confidence desc
  bestMatch:        ItemMatch | null
  autoSelect:       boolean        // true if bestMatch.confidence >= 0.85
}

// Tokenises a string into significant (non-stop, non-empty) words.
// Lowercased so caller doesn't have to. Splits on any non-alphanumeric run
// so "Pantry & Refreshment Services" → ['pantry', 'refreshment'].
function significantWords(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w))
}

// Score one (input, item) pair. Returns the highest-confidence rule that
// fires, or null when nothing applies. Pure — no closure over candidate list.
//
// Rule ladder:
//   1. EXACT   (1.0)        — input == name OR input == description (after trim+lc)
//   2. HIGH    (0.9)        — item.name is a contiguous substring of input
//                              (catches "Cafeteria Management Services" → "Cafeteria Management"),
//                              OR every significant input word appears in item text
//                              (catches input ⊆ item by tokens)
//   3. FUZZY   (0.75–0.89)  — every significant item-name word is contained in
//                              the input's significant words (input is a longer
//                              description of the item — "Pantry & Refreshment
//                              Services" → "Pantry Services"),
//                              OR Levenshtein similarity > 0.7 on itemName,
//                              OR first 3 significant input words all match the
//                              item name's significant words
//   4. PARTIAL (0.5–0.74)   — ≥ 2 significant words overlap between input and item text
function scorePair(input: string, item: ItemForMatch): { confidence: number; matchType: MatchType } | null {
  const inLc       = input.trim().toLowerCase()
  const nameLc     = item.itemName.trim().toLowerCase()
  const descLc     = (item.description ?? '').trim().toLowerCase()

  // Rule 1 — EXACT (1.0)
  if (inLc === nameLc || (descLc !== '' && inLc === descLc)) {
    return { confidence: 1.0, matchType: 'EXACT' }
  }

  const inputWords    = significantWords(input)
  const itemNameWords = significantWords(item.itemName)
  const itemTextWords = new Set([...itemNameWords, ...significantWords(item.description ?? '')])

  // Rule 2(a) — HIGH via substring. Item name (raw lc) appears contiguously
  // in the input. Catches the very common "Cafeteria Management Services
  // Pvt Ltd" → "Cafeteria Management" case where the input wraps the item
  // name with extra stop words. Require the item name has at least one
  // significant word so blanks like "Services" don't trivially match.
  if (itemNameWords.length > 0 && nameLc.length >= 3 && inLc.includes(nameLc)) {
    return { confidence: 0.9, matchType: 'HIGH' }
  }

  // Rule 2(b) — HIGH via tokens. Every significant input word is in the
  // item text (name ∪ description). Requires at least one significant input
  // word so a stop-words-only input can't pass.
  if (inputWords.length > 0 && inputWords.every(w => itemTextWords.has(w))) {
    return { confidence: 0.9, matchType: 'HIGH' }
  }

  // Rule 3(a) — FUZZY via item ⊆ input. Every significant item-name word is
  // present in the input (input is a "longer description" containing all
  // item keywords plus noise). Confidence scales by how much extra noise
  // the input carries — tighter overlap → higher confidence.
  if (itemNameWords.length > 0 && inputWords.length > 0
      && itemNameWords.every(w => inputWords.includes(w))) {
    const ratio = itemNameWords.length / inputWords.length
    const conf  = Math.min(0.89, Math.max(0.75, 0.75 + ratio * 0.14))
    return { confidence: conf, matchType: 'FUZZY' }
  }

  // Rule 3(b) — FUZZY via Levenshtein on full name (catches typos and
  // small re-orderings the token rules miss).
  const sim = similarity(inLc, nameLc)
  if (sim > 0.7) {
    const conf = Math.min(0.89, Math.max(0.75, 0.75 + (sim - 0.7) * (0.89 - 0.75) / 0.3))
    return { confidence: conf, matchType: 'FUZZY' }
  }

  // Rule 3(c) — first-3 significant words match the item name. Only fires
  // for inputs with ≥3 sig words so it doesn't trivialise short inputs.
  if (inputWords.length >= 3 && inputWords.slice(0, 3).every(w => itemNameWords.includes(w))) {
    return { confidence: 0.8, matchType: 'FUZZY' }
  }

  // Rule 4 — PARTIAL (0.5 – 0.74). At least two significant words overlap.
  const overlap = inputWords.filter(w => itemTextWords.has(w))
  if (overlap.length >= 2) {
    const ratio = inputWords.length > 0 ? overlap.length / inputWords.length : 0
    const conf  = Math.min(0.74, Math.max(0.5, 0.5 + ratio * 0.24))
    return { confidence: conf, matchType: 'PARTIAL' }
  }

  return null
}

// Match a single description against the candidate catalog. Returns top 3
// matches sorted by confidence desc. bestMatch + autoSelect are derived
// trivially from the head of the array.
export function matchSingleDescription(input: string, items: ItemForMatch[]): ItemMatchResult {
  const empty: ItemMatchResult = { inputDescription: input, matches: [], bestMatch: null, autoSelect: false }
  if (!input || input.trim().length === 0) return empty

  const scored: ItemMatch[] = []
  for (const it of items) {
    const s = scorePair(input, it)
    if (!s) continue
    scored.push({
      itemId:            it.itemId,
      itemCode:          it.itemCode,
      itemName:          it.itemName,
      description:       it.description,
      gstRate:           it.gstRate,
      tdsRate:           it.tdsRate,
      defaultGlCode:     it.defaultGlCode,
      defaultCostCentre: it.defaultCostCentre,
      sacHsnCode:        it.sacHsnCode,
      confidence:        s.confidence,
      matchType:         s.matchType,
    })
  }
  scored.sort((a, b) => b.confidence - a.confidence)
  const top3 = scored.slice(0, 3)
  const best = top3[0] ?? null
  return {
    inputDescription: input,
    matches:          top3,
    bestMatch:        best,
    autoSelect:       !!best && best.confidence >= 0.85,
  }
}

// Batch entrypoint — used by POST /api/items/match. Just calls
// matchSingleDescription per row; broken out so the route stays a thin shim.
export function matchItemDescriptions(descriptions: string[], items: ItemForMatch[]): ItemMatchResult[] {
  return descriptions.map(d => matchSingleDescription(d, items))
}
