import { FolderTree, AlertCircle } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { isRecordMappedToEntity } from '../../lib/masters/entityMapping';

/**
 * DEPARTMENT SELECTOR — Department Master, scoped by legal entity.
 * Uses the same entity rules as VendorSelector / CostCentreSelector (entityMappings + entityId).
 */

interface DepartmentSelectorProps {
  value?: string;
  /** Stored value is department display name (matches InvoiceFormDirectV2 and cost centre flows). */
  onChange: (departmentName: string) => void;
  label?: ReactNode;
  /** When true, only the select control is rendered (use an external label). */
  hideLabel?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  entityId?: string;
  /** e.g. px-select for inline forms */
  selectClassName?: string;
  showMasterBadge?: boolean;
}

export function DepartmentSelector({
  value,
  onChange,
  label = 'Department',
  hideLabel = false,
  placeholder = 'Select department...',
  required = false,
  disabled = false,
  error,
  entityId,
  selectClassName = '',
  showMasterBadge = true,
}: DepartmentSelectorProps) {
  const { departments } = useMasterData();

  const options = useMemo(() => {
    const active = departments.filter(
      (d) => d.isActive !== false && (d as { status?: string }).status !== 'Inactive'
    );
    if (!entityId) return active;
    return active.filter((d) => isRecordMappedToEntity(d, entityId));
  }, [departments, entityId]);

  const selectClasses = [
    'w-full',
    'pl-10',
    'pr-4',
    'py-2',
    'rounded-lg',
    'appearance-none',
    selectClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-2">
      {!hideLabel && (
        <label className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
          {label}
          {required && <span style={{ color: 'var(--color-error-dark)' }}> *</span>}
          {showMasterBadge && (
            <span
              className="ml-2 text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}
              title="Linked to Department Master — filtered by entity"
            >
              Linked to Master
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={selectClasses}
          style={{
            border: error ? '2px solid var(--color-error-dark)' : '2px solid var(--color-silver)',
            backgroundColor: disabled ? 'var(--color-cloud)' : '#FFFFFF',
            color: 'var(--color-ink)',
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
              {d.code ? ` (${d.code})` : ''}
            </option>
          ))}
        </select>

        <FolderTree
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--color-mercury-grey)' }}
        />

        {error && (
          <AlertCircle
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--color-error-dark)' }}
          />
        )}
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-error-dark)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
