import { Package, AlertCircle } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { isRecordMappedToEntity } from '../../lib/masters/entityMapping';

/**
 * ITEM SELECTOR - SHARED COMPONENT
 * 
 * This is the ONLY approved way to select items in AP Automation.
 * 
 * LINKED TO: Item Master (System of Record)
 * USED BY: Procurement PO, AP Invoices, GRN
 * 
 * GOVERNANCE: Do NOT create standalone item dropdowns.
 * Always use this component to ensure master data consistency.
 */

interface ItemSelectorProps {
  value?: string; // Item ID
  onChange: (itemId: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  filterByCategory?: string;
  filterByType?: 'Goods' | 'Services';
  entityId?: string;
}

export function ItemSelector({
  value,
  onChange,
  label = 'Item',
  placeholder = 'Select item...',
  required = false,
  disabled = false,
  error,
  filterByCategory,
  filterByType,
  entityId
}: ItemSelectorProps) {
  const { items, getActiveItems, getItemById } = useMasterData();
  let activeItems = entityId
    ? items.filter((item) => item.status === 'Active' && isRecordMappedToEntity(item, entityId))
    : getActiveItems();
  
  // Apply filters
  if (filterByCategory) {
    activeItems = activeItems.filter(item => item.category === filterByCategory);
  }
  if (filterByType) {
    activeItems = activeItems.filter(item => item.itemType === filterByType);
  }
  
  const selectedItem = value ? getItemById(value) : undefined;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
          {label}
          {required && <span style={{ color: 'var(--color-error-dark)' }}> *</span>}
          <span 
            className="ml-2 text-xs px-2 py-0.5 rounded" 
            style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}
            title="Linked to Item Master - System of Record"
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
          {activeItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} - {item.name} ({item.uom})
            </option>
          ))}
        </select>
        
        <Package 
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

      {selectedItem && (
        <div className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}>
          <div className="grid grid-cols-2 gap-2">
            <div>HSN: {selectedItem.hsnCode}</div>
            <div>GST: {selectedItem.gstRate}%</div>
            <div>Category: {selectedItem.category}</div>
            <div>Type: {selectedItem.itemType}</div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-error-dark)' }}>{error}</p>
      )}
    </div>
  );
}
