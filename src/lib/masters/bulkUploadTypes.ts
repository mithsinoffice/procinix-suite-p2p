/**
 * Shared types for the Master Bulk Upload feature.
 * Registry (masterSchemaRegistry.ts), library logic (parser/identifier/validator/prerequisites),
 * and UI (MasterBulkUpload.tsx) all import from here.
 */

import type { MasterKey } from '../mysql/masterTables';

export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'email' | 'url' | 'enum';

export interface MasterFieldDef {
  /** Canonical field key on the record (matches the TS interface on the master component). */
  key: string;
  /** User-facing label. */
  label: string;
  /** Whether this field must be present and non-empty for the row to be valid. */
  required: boolean;
  /** Data type for coercion + validation. */
  type: FieldType;
  /** Header aliases — lowercased, trimmed, punctuation-stripped strings that map to this field in uploaded files. */
  aliases: string[];
  /** For type 'enum' — allowed values (case-insensitive match, stored canonically). */
  enumValues?: string[];
  /** If this column is a foreign key into another master, specify which and by which field. */
  foreignKey?: {
    refMaster: MasterKey;
    refField: string;
    /** If true, the row is rejected when the FK value isn't found. If false, just warn. */
    strict?: boolean;
  };
  /** Optional default when the column is absent or blank (applied after type coercion). */
  defaultValue?: unknown;
}

export interface MasterSchema {
  /** Must match a MasterKey (e.g. 'department_master'). */
  masterKey: MasterKey;
  /** Human-facing name (e.g. "Department Master"). */
  displayName: string;
  /** Short description shown in identification result card. */
  description?: string;
  /** Strongly-identifying headers used to score a file against this schema. */
  headerSignature: string[];
  /** All fields — required first, then optional. Used for mapping, validation, and display order. */
  fields: MasterFieldDef[];
  /** Master keys that should be populated/approved before this one can be meaningfully uploaded. */
  prerequisites: MasterKey[];
  /** Human-readable note about why those prerequisites matter. */
  prerequisiteNote?: string;
  /** Row-code inference — which field(s) make up the "primary code" used for duplicate detection. */
  primaryCodeField: string;
}

export type MasterSchemaRegistry = Record<string, MasterSchema>;

/** Result of parsing a single workbook file. */
export interface ParsedSheet {
  sheetName: string;
  /** Original headers as they appeared in the file (first row). */
  rawHeaders: string[];
  /** Normalized headers (lowercased, trimmed, punctuation stripped). */
  normalizedHeaders: string[];
  /** All data rows as raw cell values, one object per row keyed by rawHeaders. */
  rows: Array<Record<string, unknown>>;
}

export interface ParsedFile {
  fileName: string;
  sheets: ParsedSheet[];
}

/** Column mapping for a single sheet — which file header maps to which master field. */
export type ColumnMapping = Record<string, string | null>; // masterFieldKey -> rawFileHeader (or null if unmapped)

export interface MasterMatchResult {
  /** Best-matching master key. */
  masterKey: MasterKey;
  /** 0-1 confidence score. */
  confidence: number;
  /** Proposed column mapping based on aliases. */
  mapping: ColumnMapping;
  /** Required fields that are NOT mapped in the file. */
  missingRequired: string[];
  /** Optional fields that ARE mapped. */
  mappedOptional: string[];
}

export interface IdentificationOutcome {
  /** Best match for the sheet (if any score above the threshold). */
  best: MasterMatchResult | null;
  /** Other plausible matches ranked by descending confidence. */
  alternatives: MasterMatchResult[];
  /** True if no schema scored high enough for confidence >= 0.4. */
  unresolved: boolean;
}

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  rowIndex: number; // 0-based within the sheet (excluding header)
  field: string; // canonical master field key
  severity: ValidationSeverity;
  message: string;
}

export interface ValidatedRow<T = Record<string, unknown>> {
  rowIndex: number;
  /** Transformed row in canonical master field shape, ready for upsert. */
  record: T;
  issues: ValidationIssue[];
  /** True if the row has no 'error' severity issues. */
  valid: boolean;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  withWarnings: number;
  withErrors: number;
}

export interface ValidationResult<T = Record<string, unknown>> {
  rows: ValidatedRow<T>[];
  issues: ValidationIssue[];
  summary: ValidationSummary;
}

export interface PrerequisiteStatus {
  masterKey: MasterKey;
  displayName: string;
  /** Number of approved records present in that prereq master. */
  approvedCount: number;
  /** True if approvedCount > 0 (prereq has usable data). */
  satisfied: boolean;
}

export interface PrerequisiteReport {
  /** Per-master status for each prereq. */
  prerequisites: PrerequisiteStatus[];
  /** True if every prereq is satisfied. */
  allSatisfied: boolean;
  /** FK columns in the upload that refer to records that don't exist in their target masters. */
  unresolvedForeignKeys: Array<{
    rowIndex: number;
    field: string;
    refMaster: MasterKey;
    lookupValue: string;
  }>;
}

/** Aggregate state for a single uploaded file, surfaced to the UI. */
export interface UploadQueueItem<T = Record<string, unknown>> {
  /** Client-generated uuid for React list key. */
  id: string;
  file: File;
  parsed?: ParsedFile;
  /** For each sheet in the workbook, the identification + validation state. */
  sheets: Array<{
    sheetName: string;
    identification: IdentificationOutcome;
    mapping: ColumnMapping;
    validation: ValidationResult<T>;
    prerequisites: PrerequisiteReport;
    /** Whether the user has explicitly excluded this sheet from upload. */
    skipped: boolean;
    /** Whether this sheet has already been uploaded in the current session. */
    uploaded: boolean;
  }>;
  /** Top-level error (e.g. file couldn't be parsed). */
  fatalError?: string;
}
