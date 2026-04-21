import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';

interface VendorGroupSelectorProps {
  value?: string;
  onChange: (groupCode: string) => void;
  entityScope?: string;
}

export function VendorGroupSelector({ value, onChange, entityScope }: VendorGroupSelectorProps) {
  const { vendorGroups } = useMasterData();
  const [expanded, setExpanded] = useState(false);

  const selected = useMemo(
    () => vendorGroups.find((group) => group.code === value),
    [vendorGroups, value]
  );

  const entityFilteredNodes = useMemo(() => {
    const nodes = selected?.entities || [];
    if (!entityScope) return nodes;
    return nodes.filter((node) => node.id === entityScope);
  }, [selected, entityScope]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
            Vendor Group Code
          </label>
          <select
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            className="w-full px-3 py-2 rounded-lg border"
            style={{ borderColor: 'var(--color-silver)' }}
          >
            <option value="">Select group</option>
            {vendorGroups.map((group) => (
              <option key={group.code} value={group.code}>
                {group.code}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label className="block text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
            Vendor Group Name
          </label>
          <input
            value={selected?.name || ''}
            readOnly
            className="w-full px-3 py-2 rounded-lg border"
            style={{ borderColor: 'var(--color-silver)', backgroundColor: 'var(--color-cloud)' }}
          />
        </div>
      </div>

      {selected && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
            {selected.code}
          </span>
          {selected.relationshipType && (
            <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
              {selected.relationshipType}
            </span>
          )}
        </div>
      )}

      {selected && (
        <div className="rounded-lg border" style={{ borderColor: 'var(--color-silver)' }}>
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-sm"
            onClick={() => setExpanded((prev) => !prev)}
            style={{ color: 'var(--color-ink)' }}
          >
            <span>Group hierarchy members</span>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expanded && (
            <div className="px-3 pb-3 space-y-1">
              {(entityFilteredNodes.length > 0 ? entityFilteredNodes : selected.entities || []).map((entity) => (
                <div key={entity.id} className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  {entity.name}
                </div>
              ))}
              {(selected.entities || []).length === 0 && (
                <div className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  No mapped entities configured.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

