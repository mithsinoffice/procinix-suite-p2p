import { useState, useEffect, useCallback } from 'react';
import { Info, Copy, X, ChevronDown, ExternalLink } from 'lucide-react';
import { mysqlApiRequest } from '../../lib/mysql/client';
import { useMasterData } from '../../contexts/MasterDataContext';
import type { EntityScopeMapping } from '../../lib/masters/entityMapping';
import { useNavigate } from 'react-router-dom';

export interface GLMapping {
  entity_id: string;
  entityName: string;
  expense_gl_code: string;
  expense_gl_description: string;
  cogs_gl_code: string;
  cogs_gl_description: string;
  input_tax_gl_code: string;
  input_tax_gl_description: string;
  stock_gl_code: string;
  stock_gl_description: string;
  cost_centre: string;
  profit_centre: string;
}

interface GLCodeMappingSectionProps {
  itemId: string;
  entityMappings: EntityScopeMapping[];
  onMappingsChange: (mappings: GLMapping[]) => void;
}

const ENTITY_COLORS = ['#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899'];

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function emptyMapping(entityId: string, entityName: string): GLMapping {
  return {
    entity_id: entityId, entityName,
    expense_gl_code: '', expense_gl_description: '',
    cogs_gl_code: '', cogs_gl_description: '',
    input_tax_gl_code: '', input_tax_gl_description: '',
    stock_gl_code: '', stock_gl_description: '',
    cost_centre: '', profit_centre: '',
  };
}

function isRowConfigured(m: GLMapping): boolean {
  return !!(m.expense_gl_code || m.cogs_gl_code || m.input_tax_gl_code || m.stock_gl_code);
}

function isRowFull(m: GLMapping): boolean {
  return !!(m.expense_gl_code && m.cogs_gl_code && m.input_tax_gl_code && m.stock_gl_code);
}

const inputBase: React.CSSProperties = {
  height: 32, borderRadius: 6, fontSize: 12, padding: '0 8px',
  border: '1px solid #E1E6EA', outline: 'none', width: '100%',
  backgroundColor: '#fff', transition: 'border-color 0.15s, box-shadow 0.15s',
};
const inputFilled: React.CSSProperties = { borderColor: '#9FE8EE', backgroundColor: '#FAFEFF' };

export function GLCodeMappingSection({ itemId, entityMappings, onMappingsChange }: GLCodeMappingSectionProps) {
  const { entities } = useMasterData();
  const navigate = useNavigate();
  const allEntities = entities.filter((e: any) => e.isActive !== false);
  const selectedIds = new Set(entityMappings.map(m => m.entityId));

  const [mappings, setMappings] = useState<GLMapping[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Build mappings from all entities
  useEffect(() => {
    setMappings(prev => {
      const next = allEntities.map((e: any) => {
        const existing = prev.find(m => m.entity_id === e.id);
        return existing || emptyMapping(e.id, e.name);
      });
      // Only notify parent about active entity mappings
      onMappingsChange(next.filter(m => selectedIds.has(m.entity_id)));
      return next;
    });
  }, [entityMappings, entities]);

  // Fetch existing GL mappings on mount
  useEffect(() => {
    if (!itemId || loaded) return;
    mysqlApiRequest<{ success: boolean; data: any[] }>(`/items/${itemId}/gl-mappings`)
      .then(res => {
        if (res.data?.length > 0) {
          setMappings(prev => {
            const updated = prev.map(m => {
              const fromDb = res.data.find((d: any) => d.entity_id === m.entity_id);
              if (!fromDb) return m;
              return {
                ...m,
                expense_gl_code: fromDb.expense_gl_code || '',
                expense_gl_description: fromDb.expense_gl_description || '',
                cogs_gl_code: fromDb.cogs_gl_code || '',
                cogs_gl_description: fromDb.cogs_gl_description || '',
                input_tax_gl_code: fromDb.input_tax_gl_code || '',
                input_tax_gl_description: fromDb.input_tax_gl_description || '',
                stock_gl_code: fromDb.stock_gl_code || '',
                stock_gl_description: fromDb.stock_gl_description || '',
                cost_centre: fromDb.cost_centre || '',
                profit_centre: fromDb.profit_centre || '',
              };
            });
            onMappingsChange(updated.filter(m => selectedIds.has(m.entity_id)));
            return updated;
          });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [itemId]);

  const updateMapping = useCallback((entityId: string, field: keyof GLMapping, value: string) => {
    setMappings(prev => {
      const updated = prev.map(m => m.entity_id === entityId ? { ...m, [field]: value } : m);
      onMappingsChange(updated.filter(m => selectedIds.has(m.entity_id)));
      return updated;
    });
  }, [onMappingsChange, selectedIds]);

  const clearRow = useCallback((entityId: string) => {
    setMappings(prev => {
      const updated = prev.map(m => m.entity_id === entityId
        ? { ...m, expense_gl_code: '', expense_gl_description: '', cogs_gl_code: '', cogs_gl_description: '', input_tax_gl_code: '', input_tax_gl_description: '', stock_gl_code: '', stock_gl_description: '', cost_centre: '', profit_centre: '' }
        : m);
      onMappingsChange(updated.filter(m => selectedIds.has(m.entity_id)));
      return updated;
    });
  }, [onMappingsChange, selectedIds]);

  const copyToAll = useCallback(() => {
    const activeRows = mappings.filter(m => selectedIds.has(m.entity_id));
    if (activeRows.length < 2) return;
    const source = activeRows[0];
    setMappings(prev => {
      const updated = prev.map(m => {
        if (!selectedIds.has(m.entity_id) || m.entity_id === source.entity_id) return m;
        return {
          ...m,
          expense_gl_code: source.expense_gl_code, expense_gl_description: source.expense_gl_description,
          cogs_gl_code: source.cogs_gl_code, cogs_gl_description: source.cogs_gl_description,
          input_tax_gl_code: source.input_tax_gl_code, input_tax_gl_description: source.input_tax_gl_description,
          stock_gl_code: source.stock_gl_code, stock_gl_description: source.stock_gl_description,
          cost_centre: source.cost_centre, profit_centre: source.profit_centre,
        };
      });
      onMappingsChange(updated.filter(m => selectedIds.has(m.entity_id)));
      return updated;
    });
  }, [mappings, onMappingsChange, selectedIds]);

  const activeCount = mappings.filter(m => selectedIds.has(m.entity_id)).length;
  const fullyConfigured = mappings.filter(m => selectedIds.has(m.entity_id) && isRowFull(m)).length;
  const partiallyConfigured = mappings.filter(m => selectedIds.has(m.entity_id) && isRowConfigured(m) && !isRowFull(m)).length;
  const configuredCount = mappings.filter(m => selectedIds.has(m.entity_id) && isRowConfigured(m)).length;

  const getInputStyle = (value: string, fieldKey: string): React.CSSProperties => ({
    ...inputBase,
    ...(value ? inputFilled : {}),
    ...(focusedField === fieldKey ? { borderColor: '#00A9B7', boxShadow: '0 0 0 2px rgba(0,169,183,0.1)' } : {}),
  });

  if (allEntities.length === 0) return null;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-section-dot" />
        <span className="px-section-label">GL CODE MAPPING</span>
        <hr className="flex-1 border-0 h-px" style={{ backgroundColor: 'var(--color-silver)' }} />
      </div>

      {/* Info banner */}
      <button
        type="button"
        onClick={() => setShowInfo(!showInfo)}
        className="w-full flex items-center justify-between px-4 py-3 mb-4 text-left"
        style={{ backgroundColor: '#FFF8EC', border: '0.5px solid #FFE4A0', borderRadius: 10 }}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4" style={{ color: '#D97706' }} />
          <span style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>
            GL Code mapping assigns ledger accounts per entity for automatic journal entries
          </span>
        </div>
        <ChevronDown className="w-4 h-4" style={{ color: '#D97706', transform: showInfo ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {showInfo && (
        <div className="px-4 py-3 mb-4" style={{ backgroundColor: '#FFFDF7', border: '0.5px solid #FFE4A0', borderRadius: 8, fontSize: 12, color: '#78716C', lineHeight: 1.7 }}>
          Map each entity to the appropriate GL accounts for expense booking, COGS, input tax credit,
          and stock valuation. These mappings drive automatic journal entries when transactions are posted.
        </div>
      )}

      {/* Table wrapper */}
      <div style={{ border: '0.5px solid #E1E6EA', borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header bar */}
        <div className="flex items-center justify-between" style={{ backgroundColor: '#F6F9FC', padding: '12px 16px' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>GL accounts per entity</span>
            <span style={{ fontSize: 12, color: 'var(--color-mercury-grey)', fontWeight: 500 }}>
              {configuredCount} of {activeCount} configured
            </span>
          </div>
          {activeCount > 1 && (
            <button
              type="button"
              onClick={copyToAll}
              className="flex items-center gap-1.5"
              style={{ fontSize: 12, color: '#00A9B7', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Copy className="w-3.5 h-3.5" /> Copy row 1 to all &rarr;
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ backgroundColor: '#F6F9FC', borderTop: '0.5px solid #E1E6EA' }}>
                <th style={{ width: 180, padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8B95A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Entity</th>
                <th style={{ width: 150, padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8B95A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expense GL*</th>
                <th style={{ width: 150, padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8B95A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COGS GL</th>
                <th style={{ width: 150, padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8B95A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Input Tax GL</th>
                <th style={{ width: 150, padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8B95A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stock GL</th>
                <th style={{ width: 120, padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8B95A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cost Centre</th>
                <th style={{ width: 36, padding: '10px 8px' }} />
              </tr>
            </thead>
            <tbody>
              {allEntities.map((entity: any, idx: number) => {
                const isActive = selectedIds.has(entity.id);
                const m = mappings.find(r => r.entity_id === entity.id) || emptyMapping(entity.id, entity.name);
                const color = ENTITY_COLORS[idx % ENTITY_COLORS.length];
                const fk = (field: string) => `${entity.id}-${field}`;

                return (
                  <tr key={entity.id} style={{ borderTop: '0.5px solid #E1E6EA', opacity: isActive ? 1 : 0.45 }}>
                    {/* Entity cell */}
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-2.5">
                        <div style={{
                          width: 30, height: 30, borderRadius: 6, backgroundColor: color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {getInitials(entity.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.3 }}>{entity.name}</div>
                          {!isActive ? (
                            <div style={{ fontSize: 10, color: '#B0B8C1', fontStyle: 'italic' }}>not selected above</div>
                          ) : (
                            <div style={{ fontSize: 10, color: '#8B95A1' }}>{entity.country || 'IN'} &middot; {entity.currency || 'INR'}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Expense GL */}
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={m.expense_gl_code}
                        onChange={e => updateMapping(entity.id, 'expense_gl_code', e.target.value)}
                        onFocus={() => setFocusedField(fk('expense'))}
                        onBlur={() => setFocusedField(null)}
                        placeholder="e.g. 5001"
                        disabled={!isActive}
                        style={getInputStyle(m.expense_gl_code, fk('expense'))}
                      />
                    </td>
                    {/* COGS GL */}
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={m.cogs_gl_code}
                        onChange={e => updateMapping(entity.id, 'cogs_gl_code', e.target.value)}
                        onFocus={() => setFocusedField(fk('cogs'))}
                        onBlur={() => setFocusedField(null)}
                        placeholder="e.g. 4001"
                        disabled={!isActive}
                        style={getInputStyle(m.cogs_gl_code, fk('cogs'))}
                      />
                    </td>
                    {/* Input Tax GL */}
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={m.input_tax_gl_code}
                        onChange={e => updateMapping(entity.id, 'input_tax_gl_code', e.target.value)}
                        onFocus={() => setFocusedField(fk('tax'))}
                        onBlur={() => setFocusedField(null)}
                        placeholder="e.g. 1501"
                        disabled={!isActive}
                        style={getInputStyle(m.input_tax_gl_code, fk('tax'))}
                      />
                    </td>
                    {/* Stock GL */}
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={m.stock_gl_code}
                        onChange={e => updateMapping(entity.id, 'stock_gl_code', e.target.value)}
                        onFocus={() => setFocusedField(fk('stock'))}
                        onBlur={() => setFocusedField(null)}
                        placeholder="e.g. 1401"
                        disabled={!isActive}
                        style={getInputStyle(m.stock_gl_code, fk('stock'))}
                      />
                    </td>
                    {/* Cost Centre */}
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={m.cost_centre}
                        onChange={e => updateMapping(entity.id, 'cost_centre', e.target.value)}
                        onFocus={() => setFocusedField(fk('cc'))}
                        onBlur={() => setFocusedField(null)}
                        placeholder="CC"
                        disabled={!isActive}
                        style={getInputStyle(m.cost_centre, fk('cc'))}
                      />
                    </td>
                    {/* Clear */}
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      {isActive && isRowConfigured(m) && (
                        <button
                          type="button"
                          onClick={() => clearRow(entity.id)}
                          title="Clear row"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0B8C1', padding: 2 }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between" style={{ backgroundColor: '#F6F9FC', padding: '10px 16px', borderTop: '0.5px solid #E1E6EA' }}>
          <div className="flex items-center gap-4" style={{ fontSize: 12 }}>
            {fullyConfigured > 0 && (
              <span className="flex items-center gap-1.5">
                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                <span style={{ color: '#6B7280' }}>{fullyConfigured} fully configured</span>
              </span>
            )}
            {partiallyConfigured > 0 && (
              <span className="flex items-center gap-1.5">
                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }} />
                <span style={{ color: '#6B7280' }}>{partiallyConfigured} partially</span>
              </span>
            )}
            {fullyConfigured === 0 && partiallyConfigured === 0 && (
              <span style={{ color: '#9CA3AF' }}>No entities configured yet</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/masters/gl-code-master')}
            className="flex items-center gap-1"
            style={{ fontSize: 12, color: '#00A9B7', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            + Add GL code master <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
