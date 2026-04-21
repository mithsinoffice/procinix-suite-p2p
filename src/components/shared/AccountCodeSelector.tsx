import { BookOpen, AlertCircle } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { isRecordMappedToEntity } from '../../lib/masters/entityMapping';

/**
 * ACCOUNT CODE SELECTOR - SHARED COMPONENT
 * 
 * LINKED TO: Account Code Master / Chart of Accounts (System of Record)
 * USED BY: AP Invoices, Payments, Budgeting
 */

interface AccountCodeSelectorProps {
  value?: string;
  onChange: (accountCodeId: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  filterByType?: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  entityId?: string;
}

export function AccountCodeSelector({
  value,
  onChange,
  label = 'Account Code',
  placeholder = 'Select account code...',
  required = false,
  disabled = false,
  error,
  filterByType,
  entityId
}: AccountCodeSelectorProps) {
  const { accountCodes, getActiveAccountCodes, getAccountCodeById } = useMasterData();
  
  let availableAccountCodes = entityId
    ? accountCodes.filter((ac) => ac.isActive && isRecordMappedToEntity(ac, entityId))
    : getActiveAccountCodes();
  if (filterByType) {
    availableAccountCodes = availableAccountCodes.filter(ac => ac.accountType === filterByType);
  }
  
  const selectedAccountCode = value ? getAccountCodeById(value) : undefined;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
          {label}
          {required && <span style={{ color: 'var(--color-error-dark)' }}> *</span>}
          <span 
            className="ml-2 text-xs px-2 py-0.5 rounded" 
            style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}
            title="Linked to Chart of Accounts Master"
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
          {availableAccountCodes.map((ac) => (
            <option key={ac.id} value={ac.id}>
              {ac.code} - {ac.name}
            </option>
          ))}
        </select>
        
        <BookOpen 
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

      {selectedAccountCode && (
        <div className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}>
          Type: {selectedAccountCode.accountType} - {selectedAccountCode.accountSubType}
          {selectedAccountCode.requiresCostCentre && <span className="ml-2 text-amber-600">• Requires Cost Centre</span>}
          {selectedAccountCode.requiresProject && <span className="ml-2 text-amber-600">• Requires Project</span>}
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-error-dark)' }}>{error}</p>
      )}
    </div>
  );
}
