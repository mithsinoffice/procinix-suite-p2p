export interface EntityScopeMapping {
  entityId: string;
  entityName?: string;
}

export interface EntityScopedRecord {
  entityId?: string;
  entityName?: string;
  entityMappings?: EntityScopeMapping[];
}

export function normalizeEntityMappings(record: EntityScopedRecord): EntityScopeMapping[] {
  const mappings = Array.isArray(record.entityMappings)
    ? record.entityMappings.filter(Boolean)
    : [];
  if (mappings.length > 0) {
    return mappings;
  }

  if (record.entityId) {
    return [{ entityId: record.entityId, entityName: record.entityName }];
  }

  return [];
}

export function isRecordMappedToEntity(record: EntityScopedRecord, entityId?: string | null) {
  if (!entityId || entityId === 'CONSOLIDATED') {
    return true;
  }

  const mappings = normalizeEntityMappings(record);
  if (mappings.length === 0) {
    return true;
  }

  return mappings.some((mapping) => mapping.entityId === entityId);
}

export function getRecordEntityIds(record: EntityScopedRecord) {
  return normalizeEntityMappings(record).map((mapping) => mapping.entityId);
}
