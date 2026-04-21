import type { MasterFieldDef, ParsedSheet, ColumnMapping } from './bulkUploadTypes';

export interface FieldSuggestion {
  header: string;      // raw Excel column header
  confidence: number;  // 0-1
  reason: string;      // human-readable explanation
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Normalize a string for comparison: lowercase, strip punctuation, collapse whitespace. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split into unique word tokens. */
function words(s: string): string[] {
  return norm(s).split(' ').filter(Boolean);
}

/** Word-overlap similarity between two strings (0-1). */
function wordOverlap(a: string, b: string): number {
  const wa = new Set(words(a));
  const wb = new Set(words(b));
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) {
    if (wb.has(w)) shared += 1;
  }
  return shared / Math.max(wa.size, wb.size);
}

/** Sample first N non-empty values from a column. */
function sampleValues(sheet: ParsedSheet, rawHeader: string, n: number): string[] {
  const out: string[] = [];
  for (const row of sheet.rows) {
    if (out.length >= n) break;
    const v = (row as Record<string, unknown>)[rawHeader];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      out.push(String(v).trim());
    }
  }
  return out;
}

/** Fraction of values matching a predicate. */
function fractionMatching(values: string[], predicate: (v: string) => boolean): number {
  if (values.length === 0) return 0;
  let count = 0;
  for (const v of values) {
    if (predicate(v)) count += 1;
  }
  return count / values.length;
}

/* ------------------------------------------------------------------ */
/* Heuristic scorers                                                   */
/* ------------------------------------------------------------------ */

function scoreNameSimilarity(
  field: MasterFieldDef,
  rawHeader: string,
): { score: number; reason: string } {
  let best = 0;
  let bestAlias = '';
  for (const alias of field.aliases) {
    const sim = wordOverlap(rawHeader, alias);
    if (sim > best) {
      best = sim;
      bestAlias = alias;
    }
  }
  // Also try against the label itself
  const labelSim = wordOverlap(rawHeader, field.label);
  if (labelSim > best) {
    best = labelSim;
    bestAlias = field.label;
  }
  const reason =
    best > 0
      ? `Column name '${rawHeader}' partially matches alias '${bestAlias}'`
      : '';
  return { score: best, reason };
}

function scoreTypeMatch(
  field: MasterFieldDef,
  samples: string[],
): { score: number; reason: string } {
  if (samples.length === 0) return { score: 0, reason: '' };

  const type = field.type;
  let score = 0;
  let reason = '';

  if (type === 'email') {
    const frac = fractionMatching(samples, (v) => v.includes('@'));
    if (frac >= 0.7) {
      score = 1;
      reason = `${Math.round(frac * 100)}% of values contain @ -- matches field type 'email'`;
    }
  } else if (type === 'number' || type === 'integer') {
    const frac = fractionMatching(samples, (v) => {
      const n = Number(v.replace(/,/g, ''));
      return Number.isFinite(n);
    });
    if (frac >= 0.7) {
      score = 1;
      reason = `${Math.round(frac * 100)}% of values are numeric -- matches field type '${type}'`;
    }
  } else if (type === 'url') {
    const frac = fractionMatching(samples, (v) => v.toLowerCase().startsWith('http'));
    if (frac >= 0.5) {
      score = 1;
      reason = `${Math.round(frac * 100)}% of values start with http -- matches field type 'url'`;
    }
  } else if (type === 'boolean') {
    const boolSet = new Set(['true', 'false', 'yes', 'no', '0', '1']);
    const frac = fractionMatching(samples, (v) => boolSet.has(v.toLowerCase()));
    if (frac >= 0.7) {
      score = 1;
      reason = `${Math.round(frac * 100)}% of values are boolean-like -- matches field type 'boolean'`;
    }
  } else if (type === 'date') {
    const frac = fractionMatching(samples, (v) => {
      const d = new Date(v);
      return !isNaN(d.getTime());
    });
    if (frac >= 0.5) {
      score = 1;
      reason = `${Math.round(frac * 100)}% of values parse as dates -- matches field type 'date'`;
    }
  } else if (type === 'enum' && field.enumValues) {
    const allowed = new Set(field.enumValues.map((e) => e.toLowerCase()));
    const frac = fractionMatching(samples, (v) => allowed.has(v.toLowerCase()));
    score = frac;
    if (frac > 0) {
      reason = `${Math.round(frac * 100)}% of values match enum options`;
    }
  }

  return { score, reason };
}

function scoreEnumOverlap(
  field: MasterFieldDef,
  samples: string[],
): { score: number; reason: string } {
  if (!field.enumValues || field.enumValues.length === 0 || samples.length === 0) {
    return { score: 0, reason: '' };
  }
  const allowed = new Set(field.enumValues.map((e) => e.toLowerCase()));
  const unique = new Set(samples.map((s) => s.toLowerCase()));
  let matched = 0;
  const matchedValues: string[] = [];
  for (const v of unique) {
    if (allowed.has(v)) {
      matched += 1;
      matchedValues.push(v);
    }
  }
  const score = unique.size > 0 ? matched / unique.size : 0;
  const reason =
    score > 0
      ? `Values '${matchedValues.slice(0, 3).join(', ')}' match enum options`
      : '';
  return { score, reason };
}

function scoreUniqueness(
  field: MasterFieldDef,
  schema: { primaryCodeField: string },
  samples: string[],
): { score: number; reason: string } {
  if (field.key !== schema.primaryCodeField || samples.length === 0) {
    return { score: 0, reason: '' };
  }
  const unique = new Set(samples);
  const ratio = unique.size / samples.length;
  const score = ratio > 0.9 ? 1 : ratio;
  const reason =
    ratio > 0.9
      ? `High uniqueness (${Math.round(ratio * 100)}%) -- consistent with a primary code field`
      : '';
  return { score, reason };
}

/* ------------------------------------------------------------------ */
/* Main entry                                                          */
/* ------------------------------------------------------------------ */

export function suggestMappings(
  fields: MasterFieldDef[],
  sheet: ParsedSheet,
  currentMapping: ColumnMapping,
  primaryCodeField?: string,
): Map<string, FieldSuggestion[]> {
  const result = new Map<string, FieldSuggestion[]>();

  // Set of headers already used in the current mapping
  const usedHeaders = new Set<string>();
  for (const h of Object.values(currentMapping)) {
    if (h) usedHeaders.add(h);
  }

  // Set of field keys already mapped
  const mappedFieldKeys = new Set<string>();
  for (const [key, val] of Object.entries(currentMapping)) {
    if (val) mappedFieldKeys.add(key);
  }

  const schemaInfo = { primaryCodeField: primaryCodeField ?? '' };

  for (const field of fields) {
    // Skip already-mapped fields
    if (mappedFieldKeys.has(field.key)) continue;

    const suggestions: FieldSuggestion[] = [];

    for (const rawHeader of sheet.rawHeaders) {
      // Skip headers already used
      if (usedHeaders.has(rawHeader)) continue;

      const samples = sampleValues(sheet, rawHeader, 20);

      const name = scoreNameSimilarity(field, rawHeader);
      const type = scoreTypeMatch(field, samples);
      const enumOv = scoreEnumOverlap(field, samples);
      const uniq = scoreUniqueness(field, schemaInfo, samples);

      const combined =
        0.4 * name.score + 0.3 * type.score + 0.2 * enumOv.score + 0.1 * uniq.score;

      if (combined < 0.3) continue;

      // Pick the best reason
      const reasons: string[] = [];
      if (name.reason) reasons.push(name.reason);
      if (type.reason) reasons.push(type.reason);
      if (enumOv.reason) reasons.push(enumOv.reason);
      if (uniq.reason) reasons.push(uniq.reason);

      suggestions.push({
        header: rawHeader,
        confidence: combined,
        reason: reasons[0] || `Combined score ${Math.round(combined * 100)}%`,
      });
    }

    // Sort descending, keep top 3
    suggestions.sort((a, b) => b.confidence - a.confidence);
    const top = suggestions.slice(0, 3);
    if (top.length > 0) {
      result.set(field.key, top);
    }
  }

  return result;
}
