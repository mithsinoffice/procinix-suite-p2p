import { Building2, Check, AlertCircle } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { isRecordMappedToEntity } from '../../lib/masters/entityMapping';

/**
 * VENDOR SELECTOR - SHARED COMPONENT
 * 
 * This is the ONLY approved way to select vendors in AP Automation.
 * 
 * LINKED TO: Vendor Master (System of Record)
 * USED BY: Procurement, AP Invoices, Payments, Advances
 * 
 * GOVERNANCE: Do NOT create standalone vendor dropdowns.
 * Always use this component to ensure master data consistency.
 */

interface VendorSelectorProps {
  value?: string; // Vendor ID
  onChange: (vendorId: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showMSMEBadge?: boolean;
  error?: string;
  requireCompleteBillingAddress?: boolean; // NEW: Filter vendors with complete billing address
  entityId?: string;
}

export function VendorSelector({
  value,
  onChange,
  label = 'Vendor',
  placeholder = 'Select vendor...',
  required = false,
  disabled = false,
  showMSMEBadge = true,
  error,
  requireCompleteBillingAddress = false, // NEW: Default false for backward compatibility
  entityId
}: VendorSelectorProps) {
  const { vendors, getActiveVendors, getVendorById } = useMasterData();
  const activeVendors = entityId
    ? vendors.filter((vendor) => vendor.status === 'Active' && isRecordMappedToEntity(vendor, entityId))
    : getActiveVendors();
  
  // Filter vendors based on billing address completeness if required
  const availableVendors = requireCompleteBillingAddress
    ? activeVendors.filter(vendor => {
        // Check if vendor has at least one billing address with state populated
        const billingAddress = vendor.addresses?.find(addr => addr.type === 'Billing');
        return billingAddress && billingAddress.state && billingAddress.state.trim() !== '';
      })
    : activeVendors;
  
  const selectedVendor = value ? getVendorById(value) : undefined;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
          {label}
          {required && <span style={{ color: 'var(--color-error-dark)' }}> *</span>}
          <span 
            className="ml-2 text-xs px-2 py-0.5 rounded" 
            style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}
            title="Linked to Vendor Master - System of Record"
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
          {availableVendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.code} - {vendor.name}
              {showMSMEBadge && vendor.msmeRegistered ? ' [MSME]' : ''}
            </option>
          ))}
        </select>
        
        <Building2 
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

      {selectedVendor && showMSMEBadge && selectedVendor.msmeRegistered && (
        <div className="flex items-center gap-2 text-xs p-2 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
          <Check className="w-3 h-3" />
          <span>MSME Registered - {selectedVendor.msmeCategory} Enterprise</span>
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-error-dark)' }}>{error}</p>
      )}
      
      {/* Debug info - hidden by default */}
      {value && process.env.NODE_ENV === 'development' && (
        <details className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
          <summary>Master Data Reference (Debug)</summary>
          <pre className="mt-2 p-2 rounded" style={{ backgroundColor: 'var(--color-cloud)' }}>
            {JSON.stringify(selectedVendor, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
