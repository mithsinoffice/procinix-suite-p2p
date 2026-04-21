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
      return val.map((v: any) => v?.entityName || v?.name || v?.label || v?.roleName || v?.code || (typeof v === 'string' ? v : JSON.stringify(v))).join(', ');
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
    XLSX.writeFile(
      wb,
      `${masterKey}_export_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleUpload = () => {
    navigate('/masters/bulk-upload');
  };

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    filters.some((f) => f.selected.length > 0);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-silver)',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 16,
        flexWrap: 'wrap',
      }}
    >
      {/* Search input */}
      <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
        <Search
          className="w-4 h-4"
          style={{
            position: 'absolute',
            left: 12,
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
            paddingLeft: 36,
            paddingRight: 12,
            paddingTop: 8,
            paddingBottom: 8,
            borderRadius: 8,
            border: '1px solid var(--color-fog, #E8F0F4)',
            backgroundColor: '#F8FBFD',
            fontSize: 13,
            color: 'var(--color-ink)',
            outline: 'none',
          }}
        />
      </div>

      {/* Filter pills */}
      {filters.map((filter) => (
        <div key={filter.key} style={{ flexShrink: 0 }}>
          <PremiumFilterMenu
            label={filter.label}
            options={filter.options}
            selected={filter.selected}
            onToggle={(value) =>
              onFilterChange(
                filter.key,
                toggleMultiSelect(filter.selected, value)
              )
            }
          />
        </div>
      ))}

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            onSearchChange('');
            filters.forEach((f) => onFilterChange(f.key, []));
          }}
          style={{
            flexShrink: 0,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #FED7D7',
            backgroundColor: '#FFF5F5',
            color: '#C53030',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      )}

      {/* Spacer */}
      <div style={{ flex: '0 0 1px' }} />

      {/* Download Excel */}
      <button
        type="button"
        onClick={handleDownload}
        title="Download Excel"
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--color-fog, #E8F0F4)',
          backgroundColor: 'transparent',
          color: 'var(--color-teal)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Download className="w-4 h-4" />
        Download
      </button>

      {/* Upload Excel */}
      <button
        type="button"
        onClick={handleUpload}
        title="Bulk Upload"
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--color-fog, #E8F0F4)',
          backgroundColor: 'transparent',
          color: 'var(--color-teal)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Upload className="w-4 h-4" />
        Upload
      </button>
    </div>
  );
}
