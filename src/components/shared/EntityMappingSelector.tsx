import { Building2, Globe, Check } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';
import type { EntityScopeMapping } from '../../lib/masters/entityMapping';

/**
 * Multi-entity mapping selector — renders as its own visual section
 * with the Procinix teal-dot section header style.
 */
export function EntityMappingSelector({
  value = [],
  onChange,
}: {
  value: EntityScopeMapping[];
  onChange: (mappings: EntityScopeMapping[]) => void;
}) {
  const { entities } = useMasterData();
  const activeEntities = entities.filter((e: any) => e.isActive !== false);
  const selectedIds = new Set(value.map((m) => m.entityId));
  const allSelected = activeEntities.length > 0 && activeEntities.every((e: any) => selectedIds.has(e.id));
  const noneSelected = selectedIds.size === 0;

  const toggle = (entity: any) => {
    if (selectedIds.has(entity.id)) {
      onChange(value.filter((m) => m.entityId !== entity.id));
    } else {
      onChange([...value, { entityId: entity.id, entityName: entity.name }]);
    }
  };

  return (
    <div className="md:col-span-2 mt-2">
      {/* Section header with teal dot */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="px-section-dot" />
        <span className="px-section-label">Entity Mapping</span>
        <hr className="flex-1 border-0 h-px" style={{ backgroundColor: 'var(--color-silver)' }} />
        {noneSelected ? (
          <span
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal-dark)', fontWeight: 600 }}
          >
            <Globe className="w-3 h-3" /> Global
          </span>
        ) : (
          <span
            className="text-xs px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)', fontWeight: 600 }}
          >
            {selectedIds.size} of {activeEntities.length} entities
          </span>
        )}
        <button
          type="button"
          className="text-xs"
          style={{ color: 'var(--color-teal)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500 }}
          onClick={() => {
            if (allSelected) {
              onChange([]);
            } else {
              onChange(activeEntities.map((e: any) => ({ entityId: e.id, entityName: e.name })));
            }
          }}
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>

      {/* Entity cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {activeEntities.map((entity: any) => {
          const isChecked = selectedIds.has(entity.id);
          return (
            <button
              key={entity.id}
              type="button"
              onClick={() => toggle(entity)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
              style={{
                border: `1.5px solid ${isChecked ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                backgroundColor: isChecked ? 'var(--color-teal-tint)' : '#FFFFFF',
                boxShadow: isChecked ? '0 2px 8px rgba(0, 169, 183, 0.10)' : 'none',
              }}
            >
              {/* Checkbox indicator */}
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  backgroundColor: isChecked ? 'var(--color-teal)' : '#FFFFFF',
                  border: isChecked ? 'none' : '1.5px solid var(--color-silver)',
                }}
              >
                {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
              </div>

              {/* Entity icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: isChecked ? 'var(--color-teal)' : 'var(--color-cloud)',
                }}
              >
                <Building2
                  className="w-4 h-4"
                  style={{ color: isChecked ? '#FFFFFF' : 'var(--color-mercury-grey)' }}
                />
              </div>

              {/* Entity info */}
              <div className="min-w-0 flex-1">
                <div
                  className="text-sm truncate"
                  style={{
                    color: isChecked ? 'var(--color-teal-dark)' : 'var(--color-ink)',
                    fontWeight: isChecked ? 600 : 400,
                  }}
                >
                  {entity.name || entity.legalName || entity.code}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--color-mercury-grey)' }}>
                  {[entity.country, entity.currency].filter(Boolean).join(' · ') || 'No details'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <p className="text-xs mt-2" style={{ color: 'var(--color-slate)' }}>
        Select which entities can use this record. Leave empty for Global — visible to all entities.
      </p>
    </div>
  );
}
