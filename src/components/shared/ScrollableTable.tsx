import { useRef, useState, useEffect, type CSSProperties } from 'react';
import { Plus, Trash2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Column {
  key: string;
  label: string;
  width: number;
  type: 'text' | 'email' | 'select' | 'checkbox' | 'readonly' | 'chips';
  required?: boolean;
  sticky?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ScrollableTableProps {
  columns: Column[];
  rows: any[];
  onRowChange: (index: number, field: string, value: any) => void;
  onAddRow?: () => void;
  onRemoveRow?: (index: number) => void;
  addButtonLabel?: string;
  minWidth?: number;
  primaryField?: string;
  onPrimaryChange?: (index: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  fontSize: 13,
  border: '1.5px solid var(--color-silver)',
  borderRadius: 8,
  outline: 'none',
  color: 'var(--color-ink)',
  backgroundColor: '#fff',
  transition: 'border-color 0.15s',
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  appearance: 'auto' as any,
};

const readonlyStyle: CSSProperties = {
  ...inputStyle,
  backgroundColor: 'var(--color-cloud, #F8F9FA)',
  cursor: 'default',
  color: 'var(--color-mercury-grey)',
};

const headerCellStyle: CSSProperties = {
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-mercury-grey)',
  whiteSpace: 'nowrap',
  borderBottom: '2px solid var(--color-silver)',
  backgroundColor: 'var(--color-cloud, #F8F9FA)',
};

const bodyCellStyle: CSSProperties = {
  padding: '8px 12px',
  verticalAlign: 'middle',
  borderBottom: '1px solid var(--color-silver)',
};

/* ------------------------------------------------------------------ */
/*  ScrollableTable                                                    */
/* ------------------------------------------------------------------ */

export function ScrollableTable({
  columns,
  rows,
  onRowChange,
  onAddRow,
  onRemoveRow,
  addButtonLabel = 'Add Row',
  minWidth,
  primaryField,
  onPrimaryChange,
}: ScrollableTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [columns.length, rows.length]);

  const totalWidth = minWidth || columns.reduce((s, c) => s + c.width, 0) + 60;

  function renderCell(col: Column, row: any, rowIdx: number) {
    const val = row[col.key] ?? '';

    if (col.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={!!val}
          onChange={(e) => {
            if (primaryField && col.key === primaryField && onPrimaryChange) {
              onPrimaryChange(rowIdx);
            } else {
              onRowChange(rowIdx, col.key, e.target.checked);
            }
          }}
          style={{ width: 18, height: 18, accentColor: 'var(--color-teal)', cursor: 'pointer' }}
        />
      );
    }

    if (col.type === 'readonly') {
      return <div style={readonlyStyle}>{val || '-'}</div>;
    }

    if (col.type === 'select') {
      return (
        <select
          value={val}
          onChange={(e) => onRowChange(rowIdx, col.key, e.target.value)}
          style={selectStyle}
        >
          <option value="">{col.placeholder || 'Select...'}</option>
          {(col.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    if (col.type === 'chips') {
      const chips: string[] = Array.isArray(val) ? val : [];
      return (
        <div
          style={{ display: 'flex', gap: 4, flexWrap: 'wrap', minHeight: 32, alignItems: 'center' }}
        >
          {chips.map((c, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: 'var(--color-teal-tint, #ECFEFF)',
                color: 'var(--color-teal)',
                fontWeight: 500,
              }}
            >
              {c}
            </span>
          ))}
          {chips.length === 0 && (
            <span style={{ color: 'var(--color-mercury-grey)', fontSize: 12 }}>-</span>
          )}
        </div>
      );
    }

    return (
      <input
        type={col.type === 'email' ? 'email' : 'text'}
        value={val}
        placeholder={col.placeholder || ''}
        onChange={(e) => onRowChange(rowIdx, col.key, e.target.value)}
        style={inputStyle}
        onFocus={(e) => {
          (e.target as HTMLInputElement).style.borderColor = 'var(--color-teal)';
        }}
        onBlur={(e) => {
          (e.target as HTMLInputElement).style.borderColor = 'var(--color-silver)';
        }}
      />
    );
  }

  const isPrimary = (row: any) => (primaryField ? !!row[primaryField] : false);

  return (
    <div>
      {/* Scroll hint */}
      {canScroll && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '6px 0',
            fontSize: 11,
            color: 'var(--color-mercury-grey)',
            fontStyle: 'italic',
          }}
        >
          <span style={{ fontSize: 14 }}>&larr;&rarr;</span> Scroll to see all fields
        </div>
      )}

      {/* Table wrapper */}
      <div
        ref={scrollRef}
        style={{
          overflowX: 'auto',
          borderRadius: 10,
          border: '1.5px solid var(--color-silver)',
        }}
        className="vendor-scrollable-table"
      >
        <table style={{ width: totalWidth, minWidth: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...headerCellStyle, width: 36, textAlign: 'center' }}>#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...headerCellStyle,
                    width: col.width,
                    ...(col.sticky
                      ? {
                          position: 'sticky' as const,
                          left: 0,
                          zIndex: 2,
                          boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
                        }
                      : {}),
                  }}
                >
                  {col.label}
                  {col.required && <span style={{ color: 'var(--color-error-dark)' }}> *</span>}
                </th>
              ))}
              {onRemoveRow && (
                <th style={{ ...headerCellStyle, width: 44, textAlign: 'center' }}></th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  style={{
                    textAlign: 'center',
                    padding: 24,
                    color: 'var(--color-mercury-grey)',
                    fontSize: 13,
                  }}
                >
                  No rows added yet. Click "{addButtonLabel}" below.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const primary = isPrimary(row);
              const rowStyle: CSSProperties = primary
                ? { backgroundColor: '#FAFEFF', borderLeft: '3px solid #9FE8EE' }
                : {};
              return (
                <tr key={idx} style={rowStyle}>
                  <td
                    style={{
                      ...bodyCellStyle,
                      textAlign: 'center',
                      fontSize: 12,
                      color: 'var(--color-mercury-grey)',
                      fontWeight: 600,
                    }}
                  >
                    {idx + 1}
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        ...bodyCellStyle,
                        width: col.width,
                        ...(col.sticky
                          ? {
                              position: 'sticky' as const,
                              left: 0,
                              zIndex: 1,
                              backgroundColor: primary ? '#FAFEFF' : '#fff',
                              boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
                            }
                          : {}),
                      }}
                    >
                      {renderCell(col, row, idx)}
                    </td>
                  ))}
                  {onRemoveRow && (
                    <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onRemoveRow(idx)}
                        style={{
                          color: 'var(--color-error-dark)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                        title="Remove row"
                      >
                        <Trash2 style={{ width: 15, height: 15 }} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      {onAddRow && (
        <button
          type="button"
          onClick={onAddRow}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 12,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            border: '1.5px dashed var(--color-teal)',
            backgroundColor: 'var(--color-teal-tint, #ECFEFF)',
            color: 'var(--color-teal)',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          {addButtonLabel}
        </button>
      )}

      {/* Custom scrollbar styling */}
      <style>{`
        .vendor-scrollable-table::-webkit-scrollbar { height: 7px; }
        .vendor-scrollable-table::-webkit-scrollbar-track { background: var(--color-cloud, #F8F9FA); border-radius: 4px; }
        .vendor-scrollable-table::-webkit-scrollbar-thumb { background: var(--color-teal); border-radius: 4px; }
        .vendor-scrollable-table::-webkit-scrollbar-thumb:hover { background: #0D9488; }
      `}</style>
    </div>
  );
}
