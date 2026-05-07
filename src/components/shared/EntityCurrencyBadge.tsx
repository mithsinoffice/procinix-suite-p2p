/**
 * ENTITY CURRENCY BADGE - READ-ONLY CONTEXT DISPLAY
 *
 * Displays entity name and functional currency as read-only context labels
 * in transaction headers (PR, PO, GRN, Invoice, Debit Note, Payment).
 *
 * USAGE SCOPE:
 * - Display only - NO currency conversion logic
 * - NO currency dropdowns or editable fields
 * - All amounts implicitly use entity's functional currency
 *
 * REGRESSION SAFETY:
 * - Pure display component - ZERO impact on transaction logic
 * - No calculations, validations, or state changes
 */

import { Building2, Coins } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';

interface EntityCurrencyBadgeProps {
  entityId?: string;
  entityName?: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export function EntityCurrencyBadge({
  entityId,
  entityName,
  className = '',
  variant = 'default',
}: EntityCurrencyBadgeProps) {
  const { getEntityById, getCurrencyByCode } = useMasterData();

  // Get entity details
  const entity = entityId ? getEntityById(entityId) : null;
  const displayEntityName = entityName || entity?.name || 'Not Selected';
  const currencyCode = entity?.currency || 'INR';

  // Get currency details
  const currency = getCurrencyByCode(currencyCode);
  const currencySymbol = currency?.symbol || '₹';
  const currencyName = currency?.name || 'Indian Rupee';

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md ${className}`}
      >
        <div className="flex items-center gap-1.5 text-sm text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">{displayEntityName}</span>
        </div>
        <div className="w-px h-4 bg-slate-300" />
        <div className="flex items-center gap-1.5 text-sm text-slate-700">
          <Coins className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">
            {currencySymbol} {currencyCode}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-4 px-4 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-md border border-slate-200">
          <Building2 className="w-4 h-4 text-slate-600" />
        </div>
        <div>
          <div className="text-xs text-slate-500">Entity</div>
          <div className="font-medium text-slate-900">{displayEntityName}</div>
        </div>
      </div>

      <div className="w-px h-10 bg-slate-300" />

      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-md border border-slate-200">
          <Coins className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <div className="text-xs text-slate-500">Currency</div>
          <div className="font-medium text-slate-900">
            {currencySymbol} {currencyCode}
            <span className="ml-1.5 text-xs text-slate-500">({currencyName})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * INTEGRATION NOTES FOR TRANSACTION FORMS:
 *
 * 1. Add to header area of PR, PO, GRN, Invoice, Debit Note, Payment forms
 * 2. Pass entityId or entityName as prop
 * 3. Component is READ-ONLY - no callbacks or events
 * 4. Currency updates automatically when entity changes
 * 5. No currency conversion logic - display only
 *
 * Example usage:
 * ```tsx
 * <EntityCurrencyBadge
 *   entityId={selectedEntityId}
 *   variant="compact"
 * />
 * ```
 */
