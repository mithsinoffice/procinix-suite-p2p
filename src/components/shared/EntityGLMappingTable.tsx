import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { Copy, X, ExternalLink } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { mysqlApiRequest } from '../../lib/mysql/client';
import { useNavigate } from 'react-router-dom';

export interface GLMapping {
  entity_id: string;
  expense_gl_code: string;
  expense_gl_description: string;
  cogs_gl_code: string;
  cogs_gl_description: string;
  input_tax_gl_code: string;
  input_tax_gl_description: string;
  stock_gl_code: string;
  stock_gl_description: string;
  cost_centre: string;
}

interface GLCode {
  id: string;
  gl_code: string;
  gl_description: string;
  gl_type: string;
  entity_id: string;
}

export interface EntityGLMappingTableProps {
  itemId: string | null;
  onChange: (data: { selectedEntityIds: string[]; glMappings: GLMapping[] }) => void;
  initialEntityIds?: string[];
  initialGLMappings?: GLMapping[];
}

const ENTITY_COLORS = ['#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899'];

const GL_TYPES = ['expense', 'cogs', 'tax', 'stock'] as const;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function emptyMapping(entityId: string): GLMapping {
  return {
    entity_id: entityId,
    expense_gl_code: '',
    expense_gl_description: '',
    cogs_gl_code: '',
    cogs_gl_description: '',
    input_tax_gl_code: '',
    input_tax_gl_description: '',
    stock_gl_code: '',
    stock_gl_description: '',
    cost_centre: '',
  };
}

function requiredFieldsFilled(m: GLMapping): boolean {
  return !!(m.expense_gl_code && m.input_tax_gl_code);
}

function anyFieldFilled(m: GLMapping): boolean {
  return !!(
    m.expense_gl_code ||
    m.cogs_gl_code ||
    m.input_tax_gl_code ||
    m.stock_gl_code ||
    m.cost_centre
  );
}

function countMissing(m: GLMapping): number {
  let n = 0;
  if (!m.expense_gl_code) n++;
  if (!m.input_tax_gl_code) n++;
  return n;
}

const colHeaderStyle: CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: '#6E7A82',
  backgroundColor: '#F6F9FC',
  fontWeight: 600,
  padding: '10px 12px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const glSelectStyle = (filled: boolean, disabled: boolean): CSSProperties => ({
  height: 30,
  border: `0.5px solid ${filled ? '#9FE8EE' : '#E1E6EA'}`,
  borderRadius: 6,
  padding: '0 22px 0 8px',
  fontSize: '11.5px',
  backgroundColor: disabled ? '#F6F9FC' : filled ? '#FAFEFF' : '#FFFFFF',
  color: filled ? '#007D87' : disabled ? '#9CA3AF' : 'var(--color-ink)',
  width: '100%',
  cursor: disabled ? 'not-allowed' : 'pointer',
  appearance: 'none' as const,
  outline: 'none',
});

export function EntityGLMappingTable({
  itemId,
  onChange,
  initialEntityIds = [],
  initialGLMappings = [],
}: EntityGLMappingTableProps) {
  const { entities, costCentres } = useMasterData();
  const navigate = useNavigate();
  const allEntities = entities.filter((e: any) => e.isActive !== false);
  const activeCostCentres = costCentres.filter((c: any) => c.isActive !== false);

  const [checkedEntities, setCheckedEntities] = useState<Set<string>>(new Set(initialEntityIds));
  const [rowData, setRowData] = useState<Map<string, GLMapping>>(new Map());
  const [glCodeCache, setGlCodeCache] = useState<Map<string, GLCode[]>>(new Map());
  const [loaded, setLoaded] = useState(false);

  // Build cache key: entityId-glType
  const cacheKey = (entityId: string, glType: string) => `${entityId}-${glType}`;

  // Fetch GL codes for a given entity and type
  const fetchGLCodes = useCallback(
    async (entityId: string) => {
      const fetches = GL_TYPES.map(async (type) => {
        const key = cacheKey(entityId, type);
        if (glCodeCache.has(key)) return;
        try {
          const res = await mysqlApiRequest<{ success: boolean; data: GLCode[] }>(
            `/gl-codes?entityId=${entityId}&gl_type=${type}`
          );
          setGlCodeCache((prev) => {
            const next = new Map(prev);
            next.set(key, res.data || []);
            return next;
          });
        } catch {
          // If entity-specific fetch fails, try without entity filter
          try {
            const res = await mysqlApiRequest<{ success: boolean; data: GLCode[] }>(
              `/gl-codes?gl_type=${type}`
            );
            setGlCodeCache((prev) => {
              const next = new Map(prev);
              next.set(
                key,
                (res.data || []).filter((g) => !g.entity_id || g.entity_id === entityId)
              );
              return next;
            });
          } catch {
            setGlCodeCache((prev) => {
              const next = new Map(prev);
              next.set(key, []);
              return next;
            });
          }
        }
      });
      await Promise.all(fetches);
    },
    [glCodeCache]
  );

  // Fetch GL codes when entity is checked
  useEffect(() => {
    checkedEntities.forEach((entityId) => {
      const hasAll = GL_TYPES.every((t) => glCodeCache.has(cacheKey(entityId, t)));
      if (!hasAll) fetchGLCodes(entityId);
    });
  }, [checkedEntities]);

  // Fetch existing GL mappings on mount
  useEffect(() => {
    if (!itemId || loaded) return;
    mysqlApiRequest<{ success: boolean; data: any[] }>(`/items/${itemId}/gl-mappings`)
      .then((res) => {
        if (res.data?.length > 0) {
          const newRowData = new Map<string, GLMapping>();
          const newChecked = new Set(checkedEntities);
          for (const d of res.data) {
            newChecked.add(d.entity_id);
            newRowData.set(d.entity_id, {
              entity_id: d.entity_id,
              expense_gl_code: d.expense_gl_code || '',
              expense_gl_description: d.expense_gl_description || '',
              cogs_gl_code: d.cogs_gl_code || '',
              cogs_gl_description: d.cogs_gl_description || '',
              input_tax_gl_code: d.input_tax_gl_code || '',
              input_tax_gl_description: d.input_tax_gl_description || '',
              stock_gl_code: d.stock_gl_code || '',
              stock_gl_description: d.stock_gl_description || '',
              cost_centre: d.cost_centre || '',
            });
          }
          setCheckedEntities(newChecked);
          setRowData(newRowData);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [itemId]);

  // Notify parent on changes
  useEffect(() => {
    const selectedEntityIds = [...checkedEntities];
    const glMappings = selectedEntityIds.map((eid) => rowData.get(eid) || emptyMapping(eid));
    onChange({ selectedEntityIds, glMappings });
  }, [checkedEntities, rowData]);

  const toggleEntity = useCallback((entityId: string) => {
    setCheckedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setCheckedEntities(new Set(allEntities.map((e: any) => e.id)));
  }, [allEntities]);

  const updateField = useCallback((entityId: string, field: keyof GLMapping, value: string) => {
    setRowData((prev) => {
      const next = new Map(prev);
      const current = next.get(entityId) || emptyMapping(entityId);
      next.set(entityId, { ...current, [field]: value });
      return next;
    });
  }, []);

  const copyRow1 = useCallback(() => {
    const checkedArr = allEntities.filter((e: any) => checkedEntities.has(e.id));
    if (checkedArr.length < 2) return;
    const sourceId = checkedArr[0].id;
    const source = rowData.get(sourceId) || emptyMapping(sourceId);
    setRowData((prev) => {
      const next = new Map(prev);
      for (let i = 1; i < checkedArr.length; i++) {
        const eid = checkedArr[i].id;
        next.set(eid, { ...source, entity_id: eid });
      }
      return next;
    });
  }, [allEntities, checkedEntities, rowData]);

  const getGLOptions = (entityId: string, glType: string): GLCode[] => {
    return glCodeCache.get(cacheKey(entityId, glType)) || [];
  };

  const checkedCount = checkedEntities.size;
  const totalCount = allEntities.length;

  // Status counts
  const doneCount = allEntities.filter(
    (e: any) =>
      checkedEntities.has(e.id) && requiredFieldsFilled(rowData.get(e.id) || emptyMapping(e.id))
  ).length;
  const missingCount = allEntities.filter((e: any) => {
    if (!checkedEntities.has(e.id)) return false;
    const m = rowData.get(e.id) || emptyMapping(e.id);
    return anyFieldFilled(m) && !requiredFieldsFilled(m);
  }).length;

  if (allEntities.length === 0) return null;

  return (
    <div className="md:col-span-2 mt-2">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="px-section-dot" />
        <span className="px-section-label">Entity Mapping & GL Codes</span>
        <hr className="flex-1 border-0 h-px" style={{ backgroundColor: 'var(--color-silver)' }} />
      </div>

      {/* Hint text */}
      <p className="text-xs mb-3" style={{ color: 'var(--color-slate)', marginTop: -6 }}>
        Select entities then configure GL accounts. Required fields are marked with *.
      </p>

      {/* Table wrapper */}
      <div style={{ border: '0.5px solid #E1E6EA', borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header bar */}
        <div
          className="flex items-center justify-between flex-wrap gap-2"
          style={{ backgroundColor: '#F6F9FC', padding: '12px 16px' }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
              Entity mapping & GL accounts
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--color-mercury-grey)' }}>
              &middot; Select entity to activate GL dropdowns
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 12, color: 'var(--color-mercury-grey)', fontWeight: 500 }}>
              {checkedCount} of {totalCount} selected
            </span>
            <button
              type="button"
              onClick={selectAll}
              style={{
                fontSize: 12,
                color: '#00A9B7',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Select all
            </button>
            {checkedCount > 1 && (
              <button
                type="button"
                onClick={copyRow1}
                className="flex items-center gap-1"
                style={{
                  fontSize: 12,
                  color: '#00A9B7',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Copy className="w-3.5 h-3.5" /> Copy row 1 &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 950 }}>
            <thead>
              <tr style={{ borderTop: '0.5px solid #E1E6EA' }}>
                <th style={{ ...colHeaderStyle, width: 30, padding: '10px 8px 10px 16px' }}></th>
                <th style={{ ...colHeaderStyle, width: 170 }}>Entity</th>
                <th style={{ ...colHeaderStyle, width: 155 }}>Expense GL*</th>
                <th style={{ ...colHeaderStyle, width: 145 }}>COGS GL</th>
                <th style={{ ...colHeaderStyle, width: 145 }}>Input Tax GL*</th>
                <th style={{ ...colHeaderStyle, width: 140 }}>Stock GL</th>
                <th style={{ ...colHeaderStyle, width: 130 }}>Cost Centre</th>
                <th style={{ ...colHeaderStyle, width: 80 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {allEntities.map((entity: any, idx: number) => {
                const isActive = checkedEntities.has(entity.id);
                const m = rowData.get(entity.id) || emptyMapping(entity.id);
                const color = ENTITY_COLORS[idx % ENTITY_COLORS.length];

                // Status badge
                let statusLabel: string;
                let statusStyle: CSSProperties;
                if (!isActive) {
                  statusLabel = 'Not selected';
                  statusStyle = { backgroundColor: '#F6F9FC', color: '#9CA3AF' };
                } else if (requiredFieldsFilled(m)) {
                  statusLabel = '\u2713 Done';
                  statusStyle = { backgroundColor: '#E6FBF5', color: '#007D60' };
                } else if (anyFieldFilled(m)) {
                  const n = countMissing(m);
                  statusLabel = `${n} missing`;
                  statusStyle = { backgroundColor: '#FFF8EC', color: '#9A6800' };
                } else {
                  statusLabel = 'Configure GL';
                  statusStyle = { backgroundColor: '#FFF8EC', color: '#9A6800' };
                }

                const expenseOptions = getGLOptions(entity.id, 'expense');
                const cogsOptions = getGLOptions(entity.id, 'cogs');
                const taxOptions = getGLOptions(entity.id, 'tax');
                const stockOptions = getGLOptions(entity.id, 'stock');

                return (
                  <tr
                    key={entity.id}
                    style={{
                      borderTop: '0.5px solid #E1E6EA',
                      opacity: isActive ? 1 : 0.6,
                      backgroundColor: isActive ? undefined : '#FAFCFC',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (isActive) e.currentTarget.style.backgroundColor = '#FAFEFF';
                    }}
                    onMouseLeave={(e) => {
                      if (isActive) e.currentTarget.style.backgroundColor = '';
                      else e.currentTarget.style.backgroundColor = '#FAFCFC';
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '10px 8px 10px 16px', verticalAlign: 'middle' }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleEntity(entity.id)}
                        style={{ accentColor: '#00A9B7', cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </td>

                    {/* Entity */}
                    <td
                      style={{
                        padding: '10px 12px',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'middle',
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(entity.name || entity.legalName || entity.code || '')}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: 'var(--color-ink)',
                              lineHeight: 1.3,
                            }}
                          >
                            {entity.name || entity.legalName || entity.code}
                          </div>
                          <div style={{ fontSize: 10, color: '#8B95A1' }}>
                            {[entity.country, entity.currency].filter(Boolean).join(' \u00B7 ') ||
                              'No details'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Expense GL */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <select
                        value={m.expense_gl_code}
                        onChange={(e) => {
                          const code = e.target.value;
                          const desc =
                            expenseOptions.find((g) => g.gl_code === code)?.gl_description || '';
                          updateField(entity.id, 'expense_gl_code', code);
                          updateField(entity.id, 'expense_gl_description', desc);
                        }}
                        disabled={!isActive}
                        style={glSelectStyle(!!m.expense_gl_code, !isActive)}
                      >
                        <option value="">{isActive ? 'Select...' : 'Select entity first'}</option>
                        {expenseOptions.map((g) => (
                          <option key={g.id || g.gl_code} value={g.gl_code}>
                            {g.gl_code} - {g.gl_description}
                          </option>
                        ))}
                        {isActive && expenseOptions.length === 0 && (
                          <option disabled>No GL codes found</option>
                        )}
                      </select>
                    </td>

                    {/* COGS GL */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <select
                        value={m.cogs_gl_code}
                        onChange={(e) => {
                          const code = e.target.value;
                          const desc =
                            cogsOptions.find((g) => g.gl_code === code)?.gl_description || '';
                          updateField(entity.id, 'cogs_gl_code', code);
                          updateField(entity.id, 'cogs_gl_description', desc);
                        }}
                        disabled={!isActive}
                        style={glSelectStyle(!!m.cogs_gl_code, !isActive)}
                      >
                        <option value="">{isActive ? 'Select...' : 'Select entity first'}</option>
                        {cogsOptions.map((g) => (
                          <option key={g.id || g.gl_code} value={g.gl_code}>
                            {g.gl_code} - {g.gl_description}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Input Tax GL */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <select
                        value={m.input_tax_gl_code}
                        onChange={(e) => {
                          const code = e.target.value;
                          const desc =
                            taxOptions.find((g) => g.gl_code === code)?.gl_description || '';
                          updateField(entity.id, 'input_tax_gl_code', code);
                          updateField(entity.id, 'input_tax_gl_description', desc);
                        }}
                        disabled={!isActive}
                        style={glSelectStyle(!!m.input_tax_gl_code, !isActive)}
                      >
                        <option value="">{isActive ? 'Select...' : 'Select entity first'}</option>
                        {taxOptions.map((g) => (
                          <option key={g.id || g.gl_code} value={g.gl_code}>
                            {g.gl_code} - {g.gl_description}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Stock GL */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <select
                        value={m.stock_gl_code}
                        onChange={(e) => {
                          const code = e.target.value;
                          const desc =
                            stockOptions.find((g) => g.gl_code === code)?.gl_description || '';
                          updateField(entity.id, 'stock_gl_code', code);
                          updateField(entity.id, 'stock_gl_description', desc);
                        }}
                        disabled={!isActive}
                        style={glSelectStyle(!!m.stock_gl_code, !isActive)}
                      >
                        <option value="">{isActive ? 'Select...' : 'Select entity first'}</option>
                        {stockOptions.map((g) => (
                          <option key={g.id || g.gl_code} value={g.gl_code}>
                            {g.gl_code} - {g.gl_description}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Cost Centre */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <select
                        value={m.cost_centre}
                        onChange={(e) => updateField(entity.id, 'cost_centre', e.target.value)}
                        disabled={!isActive}
                        style={glSelectStyle(!!m.cost_centre, !isActive)}
                      >
                        <option value="">{isActive ? 'Select...' : 'Select entity first'}</option>
                        {activeCostCentres.map((cc: any) => (
                          <option key={cc.id} value={cc.code || cc.name}>
                            {cc.code || cc.name}
                            {cc.name && cc.code ? ` - ${cc.name}` : ''}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          ...statusStyle,
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 6,
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                      >
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div
          className="flex items-center justify-between flex-wrap gap-2"
          style={{
            backgroundColor: '#F6F9FC',
            padding: '10px 16px',
            borderTop: '0.5px solid #E1E6EA',
          }}
        >
          <div className="flex items-center gap-4" style={{ fontSize: 12 }}>
            {doneCount > 0 && (
              <span className="flex items-center gap-1.5">
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: '#6B7280' }}>{doneCount} done</span>
              </span>
            )}
            {missingCount > 0 && (
              <span className="flex items-center gap-1.5">
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: '#F59E0B',
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: '#6B7280' }}>{missingCount} incomplete</span>
              </span>
            )}
            {doneCount === 0 && missingCount === 0 && (
              <span style={{ color: '#9CA3AF' }}>
                {checkedCount === 0 ? 'No entities selected' : 'No GL codes configured yet'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/masters/gl-code-master')}
            className="flex items-center gap-1"
            style={{
              fontSize: 12,
              color: '#00A9B7',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            + Add GL code master <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
