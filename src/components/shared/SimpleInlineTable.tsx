import { type CSSProperties, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

export interface SimpleColumn {
  key: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'checkbox' | 'readonly';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Column width as CSS (e.g. "140px" or "16%"). Leave undefined for auto. */
  width?: string;
  /** Cell align */
  align?: 'left' | 'center' | 'right';
}

interface SimpleInlineTableProps {
  columns: SimpleColumn[];
  rows: any[];
  onRowChange: (index: number, field: string, value: any) => void;
  onRemoveRow?: (index: number) => void;
  primaryField?: string;
  onPrimaryChange?: (index: number) => void;
  emptyMessage?: string;
  /** Extra action cells to render at the end of each row (before the trash icon). */
  renderRowActions?: (row: any, index: number) => ReactNode;
}

const cellStyle: CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid var(--color-silver)',
  verticalAlign: 'middle',
  fontSize: 13,
};

const headerStyle: CSSProperties = {
  padding: '10px 8px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  color: 'var(--color-mercury-grey)',
  textAlign: 'left',
  borderBottom: '2px solid var(--color-silver)',
  backgroundColor: '#FAFBFC',
  whiteSpace: 'nowrap',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: 13,
  border: '1px solid var(--color-silver)',
  borderRadius: 6,
  outline: 'none',
  color: 'var(--color-ink)',
  backgroundColor: '#fff',
};

export function SimpleInlineTable({
  columns,
  rows,
  onRowChange,
  onRemoveRow,
  primaryField,
  onPrimaryChange,
  emptyMessage = 'No entries yet. Click the Add button above to create one.',
  renderRowActions,
}: SimpleInlineTableProps) {
  if (rows.length === 0) {
    return (
      <div style={{
        padding: '24px 16px', textAlign: 'center', fontSize: 13,
        color: 'var(--color-mercury-grey)',
        border: '1px dashed var(--color-silver)', borderRadius: 8, backgroundColor: '#FAFBFC',
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--color-silver)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr>
            {primaryField && (
              <th style={{ ...headerStyle, width: 56, textAlign: 'center' }}>Primary</th>
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  ...headerStyle,
                  width: c.width,
                  textAlign: c.align || 'left',
                }}
              >
                {c.label}
                {c.required && <span style={{ color: 'var(--color-error-dark)' }}> *</span>}
              </th>
            ))}
            {renderRowActions && <th style={{ ...headerStyle, width: 120 }}>Action</th>}
            {onRemoveRow && <th style={{ ...headerStyle, width: 48 }} aria-label="Remove" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} style={{ backgroundColor: '#fff' }}>
              {primaryField && (
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  <input
                    type="radio"
                    name={`${primaryField}`}
                    checked={Boolean(row[primaryField])}
                    onChange={() => onPrimaryChange?.(idx)}
                    style={{ accentColor: 'var(--color-teal)', cursor: 'pointer' }}
                  />
                </td>
              )}
              {columns.map((c) => {
                const value = row[c.key] ?? '';
                const tdStyle: CSSProperties = { ...cellStyle, textAlign: c.align || 'left' };
                if (c.type === 'readonly') {
                  return (
                    <td key={c.key} style={tdStyle}>
                      <span style={{ color: 'var(--color-mercury-grey)' }}>{String(value || '—')}</span>
                    </td>
                  );
                }
                if (c.type === 'select') {
                  return (
                    <td key={c.key} style={tdStyle}>
                      <select
                        value={value}
                        onChange={(e) => onRowChange(idx, c.key, e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">{c.placeholder || 'Select...'}</option>
                        {c.options?.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                  );
                }
                if (c.type === 'checkbox') {
                  return (
                    <td key={c.key} style={{ ...tdStyle, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onRowChange(idx, c.key, e.target.checked)}
                        style={{ accentColor: 'var(--color-teal)', cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </td>
                  );
                }
                return (
                  <td key={c.key} style={tdStyle}>
                    <input
                      type={c.type === 'email' ? 'email' : c.type === 'number' ? 'number' : 'text'}
                      value={value}
                      placeholder={c.placeholder}
                      onChange={(e) => onRowChange(idx, c.key, e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                );
              })}
              {renderRowActions && (
                <td style={{ ...cellStyle, textAlign: 'left' }}>
                  {renderRowActions(row, idx)}
                </td>
              )}
              {onRemoveRow && (
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => onRemoveRow(idx)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--color-mercury-grey)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#DC2626'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-mercury-grey)'; }}
                    title="Remove row"
                  >
                    <Trash2 style={{ width: 16, height: 16 }} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
        border: '1px solid #9FE8EE', backgroundColor: '#FFFFFF',
        color: '#007D87', cursor: 'pointer',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E6FBFD'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF'; }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> {label}
    </button>
  );
}
