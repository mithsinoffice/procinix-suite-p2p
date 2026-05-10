import { Search, Download, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PremiumFilterMenu, toggleMultiSelect } from './premium-register';

export interface FilterConfig {
  key: string;
  label: string;
  options: string[];
  selected: string[];
}

export interface ExportColumn {
  key: string;
  label: string;
}

interface MasterListToolbarProps {
  masterName: string;
  masterKey: string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filters: FilterConfig[];
  onFilterChange: (key: string, values: string[]) => void;
  records: any[];
  columns: ExportColumn[];
  totalCount?: number;
  filteredCount?: number;
  onUploadComplete?: () => void;
}

export function MasterListToolbar({
  masterName,
  masterKey,
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  records,
  columns,
}: MasterListToolbarProps) {
  const navigate = useNavigate();

  const flattenValue = (val: unknown): string => {
    if (val == null) return '';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (Array.isArray(val)) {
      return val
        .map(
          (v: any) =>
            v?.entityName ||
            v?.name ||
            v?.label ||
            v?.roleName ||
            v?.code ||
            (typeof v === 'string' ? v : JSON.stringify(v))
        )
        .join(', ');
    }
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const handleDownload = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(
      records.map((r) => {
        const row: Record<string, unknown> = {};
        columns.forEach((c) => {
          row[c.label] = flattenValue((r as any)[c.key]);
        });
        return row;
      })
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, masterName.slice(0, 31));
    XLSX.writeFile(wb, `${masterKey}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUpload = () => {
    navigate('/masters/bulk-upload');
  };

  const hasActiveFilters =
    searchTerm.trim().length > 0 || filters.some((f) => f.selected.length > 0);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 20px',
        background: 'var(--color-background-secondary)',
        borderBottom: '1px solid var(--color-fog)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
        <Search
          size={13}
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-mercury-grey)',
          }}
        />
        <input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Search ${masterName}...`}
          style={{
            width: '100%',
            height: 28,
            padding: '0 10px 0 26px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-silver)',
            background: '#FFFFFF',
            fontSize: 12,
            color: 'var(--color-ink)',
            outline: 'none',
          }}
        />
      </div>

      {filters.map((filter) => (
        <div key={filter.key} style={{ flexShrink: 0 }}>
          <PremiumFilterMenu
            label={filter.label}
            options={filter.options}
            selected={filter.selected}
            onToggle={(value) =>
              onFilterChange(filter.key, toggleMultiSelect(filter.selected, value))
            }
          />
        </div>
      ))}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            onSearchChange('');
            filters.forEach((f) => onFilterChange(f.key, []));
          }}
          style={toolbarMiniButton('#FFF5F5', '#FED7D7', '#C53030')}
        >
          Clear
        </button>
      )}

      <div style={{ flex: '0 0 1px' }} />

      <button
        type="button"
        onClick={handleDownload}
        title="Download Excel"
        style={toolbarMiniButton('#FFFFFF', 'var(--color-silver)', 'var(--color-teal)')}
      >
        <Download size={13} /> Download
      </button>

      <button
        type="button"
        onClick={handleUpload}
        title="Bulk Upload"
        style={toolbarMiniButton('#FFFFFF', 'var(--color-silver)', 'var(--color-teal)')}
      >
        <Upload size={13} /> Upload
      </button>
    </div>
  );
}

function toolbarMiniButton(bg: string, border: string, color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 28,
    padding: '0 10px',
    borderRadius: 'var(--border-radius-md)',
    border: `1px solid ${border}`,
    background: bg,
    color,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}
