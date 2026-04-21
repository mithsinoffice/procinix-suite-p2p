import { Target, AlertCircle } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { isRecordMappedToEntity } from '../../lib/masters/entityMapping';

/**
 * COST CENTRE SELECTOR - SHARED COMPONENT
 * 
 * LINKED TO: Cost Centre Master (System of Record)
 * USED BY: Procurement, AP Invoices, Budgeting
 */

interface CostCentreSelectorProps {
  value?: string;
  onChange: (costCentreId: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  entityId?: string;
}

export function CostCentreSelector({
  value,
  onChange,
  label = 'Cost Centre',
  placeholder = 'Select cost centre...',
  required = false,
  disabled = false,
  error,
  entityId
}: CostCentreSelectorProps) {
  const { costCentres, getActiveCostCentres, getCostCentreById } = useMasterData();
  const activeCostCentres = entityId
    ? costCentres.filter((cc) => cc.isActive && isRecordMappedToEntity(cc, entityId))
    : getActiveCostCentres();
  const selectedCostCentre = value ? getCostCentreById(value) : undefined;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
          {label}
          {required && <span style={{ color: 'var(--color-error-dark)' }}> *</span>}
          <span 
            className="ml-2 text-xs px-2 py-0.5 rounded" 
            style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}
            title="Linked to Cost Centre Master"
          >
            Linked to Master
          </span>
        </label>
      )}
      
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 rounded-lg appearance-none"
          style={{
            border: error ? '2px solid var(--color-error-dark)' : '2px solid var(--color-silver)',
            backgroundColor: disabled ? 'var(--color-cloud)' : '#FFFFFF',
            color: 'var(--color-ink)'
          }}
        >
          <option value="">{placeholder}</option>
          {activeCostCentres.map((cc) => (
            <option key={cc.id} value={cc.id}>
              {cc.code} - {cc.name}
            </option>
          ))}
        </select>
        
        <Target 
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
          style={{ color: 'var(--color-mercury-grey)' }} 
        />
        
        {error && (
          <AlertCircle 
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: 'var(--color-error-dark)' }} 
          />
        )}
      </div>

      {selectedCostCentre && (
        <div className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}>
          Department: {selectedCostCentre.departmentName} | Head: {selectedCostCentre.headOfCentre}
          {selectedCostCentre.budgetAllocated && (
            <> | Budget: ₹{selectedCostCentre.budgetAllocated.toLocaleString('en-IN')}</>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-error-dark)' }}>{error}</p>
      )}
    </div>
  );
}
