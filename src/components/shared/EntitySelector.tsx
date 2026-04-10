import { Building, AlertCircle } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';

/**
 * ENTITY SELECTOR - SHARED COMPONENT
 * 
 * LINKED TO: Entity Master (System of Record)
 * USED BY: Procurement, AP Invoices, Payments, Budgeting
 */

interface EntitySelectorProps {
  value?: string;
  onChange: (entityId: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export function EntitySelector({
  value,
  onChange,
  label = 'Entity',
  placeholder = 'Select entity...',
  required = false,
  disabled = false,
  error
}: EntitySelectorProps) {
  const { entities, getActiveEntities, getEntityById } = useMasterData();
  const activeEntities = getActiveEntities();
  const selectedEntity = value ? getEntityById(value) : undefined;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm" style={{ color: '#6E7A82' }}>
          {label}
          {required && <span style={{ color: '#DC2626' }}> *</span>}
          <span 
            className="ml-2 text-xs px-2 py-0.5 rounded" 
            style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}
            title="Linked to Entity Master"
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
            border: error ? '2px solid #DC2626' : '2px solid #E1E6EA',
            backgroundColor: disabled ? '#F6F9FC' : '#FFFFFF',
            color: '#0A0F14'
          }}
        >
          <option value="">{placeholder}</option>
          {activeEntities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.code} - {entity.name}
            </option>
          ))}
        </select>
        
        <Building 
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
          style={{ color: '#6E7A82' }} 
        />
        
        {error && (
          <AlertCircle 
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: '#DC2626' }} 
          />
        )}
      </div>

      {selectedEntity && (
        <div className="text-xs p-2 rounded" style={{ backgroundColor: '#F6F9FC', color: '#6E7A82' }}>
          GSTIN: {selectedEntity.gstin} | {selectedEntity.city}, {selectedEntity.state}
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>
      )}
    </div>
  );
}
