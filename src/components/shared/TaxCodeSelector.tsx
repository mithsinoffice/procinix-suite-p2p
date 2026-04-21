import { Receipt, AlertCircle } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { isRecordMappedToEntity } from '../../lib/masters/entityMapping';

/**
 * TAX CODE SELECTOR - SHARED COMPONENT
 * 
 * LINKED TO: Tax Code Master (System of Record)
 * USED BY: Procurement, AP Invoices
 */

interface TaxCodeSelectorProps {
  value?: string;
  onChange: (taxCodeId: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  taxType?: 'GST' | 'TDS' | 'TCS';
  entityId?: string;
}

export function TaxCodeSelector({
  value,
  onChange,
  label = 'Tax Code',
  placeholder = 'Select tax code...',
  required = false,
  disabled = false,
  error,
  taxType,
  entityId
}: TaxCodeSelectorProps) {
  const { taxCodes, getActiveTaxCodes, getGSTCodes, getTDSCodes, getTaxCodeById } = useMasterData();
  
  let availableTaxCodes = entityId
    ? taxCodes.filter((tax) => tax.isActive && isRecordMappedToEntity(tax, entityId))
    : getActiveTaxCodes();
  if (taxType === 'GST') {
    availableTaxCodes = availableTaxCodes.filter((tax) => tax.taxType === 'GST');
  } else if (taxType === 'TDS') {
    availableTaxCodes = availableTaxCodes.filter((tax) => tax.taxType === 'TDS');
  }
  
  const selectedTaxCode = value ? getTaxCodeById(value) : undefined;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
          {label}
          {required && <span style={{ color: 'var(--color-error-dark)' }}> *</span>}
          <span 
            className="ml-2 text-xs px-2 py-0.5 rounded" 
            style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}
            title="Linked to Tax Code Master"
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
          {availableTaxCodes.map((tax) => (
            <option key={tax.id} value={tax.id}>
              {tax.taxCode} - {tax.taxName} ({tax.taxRate}%)
            </option>
          ))}
        </select>
        
        <Receipt 
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

      {selectedTaxCode && (
        <div className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}>
          {selectedTaxCode.taxType === 'GST' && (
            <>CGST: {selectedTaxCode.cgstRate}% | SGST: {selectedTaxCode.sgstRate}% | IGST: {selectedTaxCode.igstRate}%</>
          )}
          {selectedTaxCode.taxType === 'TDS' && (
            <>Section: {selectedTaxCode.tdsSection} | {selectedTaxCode.tdsNature}</>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-error-dark)' }}>{error}</p>
      )}
    </div>
  );
}
