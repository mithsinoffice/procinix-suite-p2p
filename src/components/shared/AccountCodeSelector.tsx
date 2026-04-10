import { BookOpen, AlertCircle } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';

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
}

export function AccountCodeSelector({
  value,
  onChange,
  label = 'Account Code',
  placeholder = 'Select account code...',
  required = false,
  disabled = false,
  error,
  filterByType
}: AccountCodeSelectorProps) {
  const { accountCodes, getActiveAccountCodes, getAccountCodeById } = useMasterData();
  
  let availableAccountCodes = getActiveAccountCodes();
  if (filterByType) {
    availableAccountCodes = availableAccountCodes.filter(ac => ac.accountType === filterByType);
  }
  
  const selectedAccountCode = value ? getAccountCodeById(value) : undefined;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm" style={{ color: '#6E7A82' }}>
          {label}
          {required && <span style={{ color: '#DC2626' }}> *</span>}
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
            border: error ? '2px solid #DC2626' : '2px solid #E1E6EA',
            backgroundColor: disabled ? '#F6F9FC' : '#FFFFFF',
            color: '#0A0F14'
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
          style={{ color: '#6E7A82' }} 
        />
        
        {error && (
          <AlertCircle 
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: '#DC2626' }} 
          />
        )}
      </div>

      {selectedAccountCode && (
        <div className="text-xs p-2 rounded" style={{ backgroundColor: '#F6F9FC', color: '#6E7A82' }}>
          Type: {selectedAccountCode.accountType} - {selectedAccountCode.accountSubType}
          {selectedAccountCode.requiresCostCentre && <span className="ml-2 text-amber-600">• Requires Cost Centre</span>}
          {selectedAccountCode.requiresProject && <span className="ml-2 text-amber-600">• Requires Project</span>}
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>
      )}
    </div>
  );
}