/**
 * Prerequisite + foreign-key resolution for Master Bulk Upload.
 *
 * This is the only module in the masters/ library that touches the database:
 * it pulls current records from each prerequisite master via
 * ensureRelationalMasterRecords and checks whether the upload's FK columns
 * resolve against live master data.
 */

import type {
  MasterSchema,
  PrerequisiteReport,
  PrerequisiteStatus,
  ValidatedRow,
} from './bulkUploadTypes';
import type { MasterKey } from '../mysql/masterTables';
import { ensureRelationalMasterRecords } from '../mysql/masterTables';
import { masterSchemaRegistry } from './masterSchemaRegistry';

interface GenericMasterRecord {
  approvalStatus?: string;
  code?: unknown;
  id?: unknown;
  [key: string]: unknown;
}

function normalizeLookup(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Fetch prerequisite master data and resolve foreign-key references present in
 * the validated rows. Returns an aggregate PrerequisiteReport suitable for UI
 * gating and per-row error surfacing.
 */
export async function resolvePrerequisites(
  schema: MasterSchema,
  rows: ValidatedRow[]
): Promise<PrerequisiteReport> {
  // 1) Prerequisite master status
  const prerequisiteStatuses: PrerequisiteStatus[] = [];
  for (const prereqKey of schema.prerequisites ?? []) {
    let approvedCount = 0;
    try {
      const records = await ensureRelationalMasterRecords<GenericMasterRecord>(
        prereqKey as MasterKey,
        []
      );
      if (records.length === 0) {
        approvedCount = 0;
      } else {
        const hasApprovalField = records.some(
          (r) => r && typeof r === 'object' && 'approvalStatus' in r
        );
        if (hasApprovalField) {
          approvedCount = records.filter((r) => r?.approvalStatus === 'Approved').length;
        } else {
          approvedCount = records.length;
        }
      }
    } catch (error) {
      console.warn(`resolvePrerequisites: failed to load ${prereqKey}`, error);
      approvedCount = 0;
    }

    prerequisiteStatuses.push({
      masterKey: prereqKey as MasterKey,
      displayName: masterSchemaRegistry[prereqKey]?.displayName ?? String(prereqKey),
      approvedCount,
      satisfied: approvedCount > 0,
    });
  }

  const allSatisfied = prerequisiteStatuses.every((p) => p.satisfied);

  // 2) FK resolution
  const fkFields = schema.fields.filter((f) => f.foreignKey);
  const unresolvedForeignKeys: PrerequisiteReport['unresolvedForeignKeys'] = [];

  if (fkFields.length > 0 && rows.length > 0) {
    // Build per-target lookup sets (case-insensitive, trimmed).
    const targetLookups = new Map<MasterKey, { refField: string; values: Set<string> }>();

    for (const field of fkFields) {
      const fk = field.foreignKey!;
      if (targetLookups.has(fk.refMaster)) continue;
      try {
        const records = await ensureRelationalMasterRecords<GenericMasterRecord>(fk.refMaster, []);
        const values = new Set<string>();
        for (const rec of records) {
          if (!rec || typeof rec !== 'object') continue;
          const primary = (rec as Record<string, unknown>)[fk.refField];
          if (primary !== undefined && primary !== null && String(primary).trim() !== '') {
            values.add(normalizeLookup(primary));
          }
          if (rec.code !== undefined && rec.code !== null && String(rec.code).trim() !== '') {
            values.add(normalizeLookup(rec.code));
          }
          if (rec.id !== undefined && rec.id !== null && String(rec.id).trim() !== '') {
            values.add(normalizeLookup(rec.id));
          }
        }
        targetLookups.set(fk.refMaster, { refField: fk.refField, values });
      } catch (error) {
        console.warn(`resolvePrerequisites: failed to load FK target ${fk.refMaster}`, error);
        targetLookups.set(fk.refMaster, { refField: fk.refField, values: new Set() });
      }
    }

    for (const row of rows) {
      for (const field of fkFields) {
        const fk = field.foreignKey!;
        const raw = row.record?.[field.key];
        if (raw === null || raw === undefined || String(raw).trim() === '') continue;

        const lookupNormalized = normalizeLookup(raw);
        const targetSet = targetLookups.get(fk.refMaster);
        if (!targetSet || !targetSet.values.has(lookupNormalized)) {
          unresolvedForeignKeys.push({
            rowIndex: row.rowIndex,
            field: field.key,
            refMaster: fk.refMaster,
            lookupValue: String(raw).trim(),
          });
        }
      }
    }
  }

  return {
    prerequisites: prerequisiteStatuses,
    allSatisfied,
    unresolvedForeignKeys,
  };
}
