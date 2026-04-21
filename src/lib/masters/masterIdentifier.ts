/**
 * Identify which master schema a parsed sheet most likely belongs to by scoring
 * its headers against the schema registry. Pure, synchronous, and schema-driven.
 *
 * Scoring weights:
 *   header signature matches        0.45
 *   required field alias coverage   0.35
 *   optional field alias coverage   0.20
 */

import type {
  ColumnMapping,
  IdentificationOutcome,
  MasterMatchResult,
  MasterSchema,
  MasterSchemaRegistry,
  ParsedSheet,
} from './bulkUploadTypes';
import { normalizeHeader } from './excelParser';

const WEIGHT_SIGNATURE = 0.35;
const WEIGHT_REQUIRED = 0.30;
const WEIGHT_OPTIONAL = 0.15;
const WEIGHT_FILENAME = 0.20;

const PRIMARY_THRESHOLD = 0.4;
const ALTERNATIVE_THRESHOLD = 0.25;

function filenameMatchScore(schema: MasterSchema, fileName: string): number {
  const fn = normalizeHeader(fileName);
  const keyTokens = schema.masterKey.replace(/_master$/, '').replace(/_/g, ' ');
  const nameTokens = schema.displayName.toLowerCase().replace(/master$/i, '').trim();
  if (fn.includes(keyTokens)) return 1;
  if (fn.includes(nameTokens)) return 1;
  const words = keyTokens.split(' ');
  const wordHits = words.filter((w) => fn.includes(w)).length;
  return words.length > 0 ? wordHits / words.length : 0;
}

function scoreSchema(
  schema: MasterSchema,
  headerSet: Set<string>,
  normalizedToRaw: Map<string, string>,
  fileName: string,
): MasterMatchResult {
  // Signature score
  const signature = schema.headerSignature ?? [];
  const signatureHits = signature.filter((sig) => headerSet.has(normalizeHeader(sig))).length;
  const signatureScore = signature.length > 0 ? signatureHits / signature.length : 0;

  // Required / optional coverage
  const requiredFields = schema.fields.filter((f) => f.required);
  const optionalFields = schema.fields.filter((f) => !f.required);

  const fieldHasAliasInHeaders = (aliases: string[]): string | null => {
    for (const alias of aliases) {
      const normalized = normalizeHeader(alias);
      if (headerSet.has(normalized)) {
        return normalized;
      }
    }
    return null;
  };

  let requiredHits = 0;
  let optionalHits = 0;
  const mapping: ColumnMapping = {};

  for (const field of schema.fields) {
    const matchedNormalized = fieldHasAliasInHeaders(field.aliases ?? []);
    if (matchedNormalized) {
      const raw = normalizedToRaw.get(matchedNormalized) ?? null;
      mapping[field.key] = raw;
      if (field.required) requiredHits++;
      else optionalHits++;
    } else {
      mapping[field.key] = null;
    }
  }

  const requiredScore = requiredFields.length > 0 ? requiredHits / requiredFields.length : 1;
  const optionalScore = optionalFields.length > 0 ? optionalHits / optionalFields.length : 0;

  const fnScore = filenameMatchScore(schema, fileName);

  const confidence =
    WEIGHT_SIGNATURE * signatureScore +
    WEIGHT_REQUIRED * requiredScore +
    WEIGHT_OPTIONAL * optionalScore +
    WEIGHT_FILENAME * fnScore;

  const missingRequired = requiredFields
    .filter((f) => !mapping[f.key])
    .map((f) => f.key);
  const mappedOptional = optionalFields
    .filter((f) => mapping[f.key])
    .map((f) => f.key);

  return {
    masterKey: schema.masterKey,
    confidence: Math.max(0, Math.min(1, confidence)),
    mapping,
    missingRequired,
    mappedOptional,
  };
}

/**
 * Score the given sheet against every schema in the registry and return the
 * best match (if any) plus alternatives.
 */
export function identifySheet(
  sheet: ParsedSheet,
  registry: MasterSchemaRegistry,
  fileName = '',
): IdentificationOutcome {
  const headerSet = new Set<string>(sheet.normalizedHeaders);
  const normalizedToRaw = new Map<string, string>();
  sheet.normalizedHeaders.forEach((norm, idx) => {
    if (!normalizedToRaw.has(norm)) {
      normalizedToRaw.set(norm, sheet.rawHeaders[idx]);
    }
  });

  const results: MasterMatchResult[] = Object.values(registry)
    .map((schema) => scoreSchema(schema, headerSet, normalizedToRaw, fileName))
    .sort((a, b) => b.confidence - a.confidence);

  const top = results[0] ?? null;
  const best = top && top.confidence >= PRIMARY_THRESHOLD ? top : null;
  const alternatives = results
    .slice(1, 4)
    .filter((r) => r.confidence >= ALTERNATIVE_THRESHOLD);

  return {
    best,
    alternatives,
    unresolved: best === null,
  };
}
