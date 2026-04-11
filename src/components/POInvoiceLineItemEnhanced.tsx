import { useState } from 'react';
import { Lock, Info, AlertCircle, FileText, TrendingUp, CheckCircle } from 'lucide-react';
import { POInvoiceExceptionModal, ExceptionRequestData } from './POInvoiceExceptionModal';

interface POLineItemData {
  poRate: number;
  poQuantity: number;
  grnQuantity: number;
  previouslyInvoicedQty: number;
  previouslyInvoicedAmount: number;
  remainingQtyBalance: number;
  remainingAmountBalance: number;
}

interface LineItemProps {
  item: {
    id: string;
    itemName: string;
    itemCode: string;
    itemDescription: string;
    accountCode: string;
    unitPrice: number;
    qty: number;
    amount: number;
    gstPercent: number;
    gstTotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    grossAmount: number;
    tds: number;
    tdsPercent: number;
    netPayable: number;
    costCentre: string;
    profitCentre: string;
    project: string;
    poNumber: string;
    grnNumber: string;
  };
  poData: POLineItemData;
  onUpdate: (id: string, field: string, value: any) => void;
  accountCodes: { code: string; description: string }[];
  costCentres: string[];
  profitCentres: string[];
  policyConfig: {
    hardLockRate: boolean;
    allowToleranceOverride: boolean;
    maxTolerancePercent: number;
    maxToleranceAmount: number;
    enforce3WayMatch: boolean;
  };
}

export function POInvoiceLineItemEnhanced({ item, poData, onUpdate, accountCodes, costCentres, profitCentres, policyConfig }: LineItemProps) {
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [showPODetails, setShowPODetails] = useState(false);

  // Validation state
  const [rateError, setRateError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  // Rate validation
  const validateRate = (newRate: number) => {
    if (policyConfig.hardLockRate) {
      if (newRate > poData.poRate) {
        setRateError(`Rate cannot exceed PO rate of ₹${poData.poRate.toFixed(2)}`);
        return false;
      }
    } else if (policyConfig.allowToleranceOverride) {
      const variancePercent = ((newRate - poData.poRate) / poData.poRate) * 100;
      const varianceAmount = newRate - poData.poRate;
      
      if (variancePercent > policyConfig.maxTolerancePercent || varianceAmount > policyConfig.maxToleranceAmount) {
        setRateError(`Rate exceeds tolerance. Max: ${policyConfig.maxTolerancePercent}% or ₹${policyConfig.maxToleranceAmount}`);
        return false;
      }
    }
    setRateError(null);
    return true;
  };

  // Quantity validation (3-way match)
  const validateQuantity = (newQty: number) => {
    if (policyConfig.enforce3WayMatch) {
      if (newQty > poData.grnQuantity) {
        setQuantityError(`Quantity cannot exceed GRN quantity of ${poData.grnQuantity}`);
        return false;
      }
      if (newQty > poData.remainingQtyBalance) {
        setQuantityError(`Quantity exceeds remaining PO balance of ${poData.remainingQtyBalance}`);
        return false;
      }
    }
    setQuantityError(null);
    return true;
  };

  // Amount validation
  const validateAmount = (newAmount: number) => {
    if (newAmount > poData.remainingAmountBalance) {
      setAmountError(`Amount exceeds remaining PO balance of ₹${poData.remainingAmountBalance.toLocaleString('en-IN')}`);
      return false;
    }
    setAmountError(null);
    return true;
  };

  const handleRateChange = (newRate: number) => {
    if (!validateRate(newRate)) {
      return;
    }
    onUpdate(item.id, 'unitPrice', newRate);
  };

  const handleQuantityChange = (newQty: number) => {
    if (!validateQuantity(newQty)) {
      return;
    }
    onUpdate(item.id, 'qty', newQty);
  };

  const handleExceptionRequest = (data: ExceptionRequestData) => {
    console.log('Exception request submitted:', data);
    // Would trigger approval workflow in real implementation
    alert('Exception request submitted for approval. Invoice will be held pending CFO approval.');
  };

  const isRateLocked = policyConfig.hardLockRate;
  const hasRateVariance = item.unitPrice > poData.poRate;
  const variancePercent = hasRateVariance ? ((item.unitPrice - poData.poRate) / poData.poRate) * 100 : 0;

  return (
    <>
      <tr style={{ borderTop: '2px solid var(--color-silver)' }}>
        {/* Item Name */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <div className="relative">
            <input
              type="text"
              value={item.itemName}
              disabled
              className="w-full px-2 py-2 rounded text-sm"
              style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)', color: 'var(--color-ink)', fontWeight: '600' }}
            />
            <div className="mt-1 text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
              {item.itemCode}
            </div>
            {/* PO Info Popover Button */}
            <button
              onClick={() => setShowPODetails(!showPODetails)}
              className="absolute right-2 top-2 p-1 rounded hover:bg-white transition-colors"
              title="View PO Details"
            >
              <Info className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
            </button>
          </div>

          {/* PO Details Popover */}
          {showPODetails && (
            <div className="absolute z-10 mt-2 p-3 rounded-lg shadow-lg" style={{ backgroundColor: '#FFFFFF', border: '2px solid var(--color-teal)', minWidth: '280px' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}>PO REFERENCE DATA</p>
                <button onClick={() => setShowPODetails(false)}>
                  <Info className="w-3.5 h-3.5" style={{ color: 'var(--color-mercury-grey)' }} />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>PO Number:</span>
                  <span className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{item.poNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>PO Rate:</span>
                  <span className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>₹{poData.poRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>PO Quantity:</span>
                  <span className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{poData.poQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>GRN Quantity:</span>
                  <span className="text-xs" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{poData.grnQuantity}</span>
                </div>
                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--color-silver)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Previously Invoiced:</span>
                  <span className="text-xs" style={{ color: '#D97706', fontWeight: '600' }}>{poData.previouslyInvoicedQty} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Remaining Balance:</span>
                  <span className="text-xs" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>{poData.remainingQtyBalance} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Remaining Amount:</span>
                  <span className="text-xs" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>₹{poData.remainingAmountBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}
        </td>

        {/* Item Description */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <input
            type="text"
            value={item.itemDescription}
            onChange={(e) => onUpdate(item.id, 'itemDescription', e.target.value)}
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
          />
        </td>

        {/* Account Code */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <select
            value={item.accountCode}
            onChange={(e) => onUpdate(item.id, 'accountCode', e.target.value)}
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
          >
            {accountCodes.map(acc => (
              <option key={acc.code} value={acc.code}>{acc.code}</option>
            ))}
          </select>
        </td>

        {/* Quantity with Validation */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <div className="relative">
            <input
              type="number"
              value={item.qty}
              onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-2 rounded text-sm"
              style={{ 
                border: quantityError ? '2px solid var(--color-error)' : '1px solid var(--color-silver)', 
                color: 'var(--color-ink)',
                backgroundColor: quantityError ? 'var(--color-error-light)' : 'white'
              }}
            />
            {quantityError && (
              <div className="absolute left-0 right-0 mt-1 p-2 rounded text-xs" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>
                <div className="flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{quantityError}</span>
                </div>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between text-xs">
              <span style={{ color: 'var(--color-mercury-grey)' }}>GRN: {poData.grnQuantity}</span>
              <span style={{ color: 'var(--color-teal)' }}>Bal: {poData.remainingQtyBalance}</span>
            </div>
          </div>
        </td>

        {/* Rate with Lock/Validation */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <div className="relative">
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={item.unitPrice}
                onChange={(e) => handleRateChange(parseFloat(e.target.value) || 0)}
                disabled={isRateLocked}
                className="w-full px-2 py-2 rounded text-sm"
                style={{ 
                  border: rateError ? '2px solid var(--color-error)' : '1px solid var(--color-silver)', 
                  color: 'var(--color-ink)',
                  backgroundColor: isRateLocked ? 'var(--color-cloud)' : (rateError ? 'var(--color-error-light)' : 'white'),
                  cursor: isRateLocked ? 'not-allowed' : 'text'
                }}
                title={isRateLocked ? 'Rate locked to PO. To change rate, amend the PO or request an exception.' : ''}
              />
              {isRateLocked && (
                <div className="absolute right-2 top-2">
                  <Lock className="w-3.5 h-3.5" style={{ color: 'var(--color-mercury-grey)' }} />
                </div>
              )}
            </div>

            {/* Rate Info */}
            <div className="mt-1 flex items-center justify-between text-xs">
              <span style={{ color: 'var(--color-mercury-grey)' }}>PO: ₹{poData.poRate.toFixed(2)}</span>
              {hasRateVariance && (
                <span style={{ color: variancePercent > policyConfig.maxTolerancePercent ? 'var(--color-error)' : '#D97706' }}>
                  +{variancePercent.toFixed(1)}%
                </span>
              )}
            </div>

            {/* Rate Error */}
            {rateError && (
              <div className="absolute left-0 right-0 mt-1 p-2 rounded text-xs z-10" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>
                <div className="flex items-start gap-1 mb-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{rateError}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowExceptionModal(true)}
                    className="flex-1 px-2 py-1 rounded text-xs transition-colors"
                    style={{ backgroundColor: 'var(--color-teal)', color: '#FFFFFF', fontWeight: '600' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
                  >
                    Request Exception
                  </button>
                </div>
              </div>
            )}
          </div>
        </td>

        {/* Base Amount */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <input
            type="text"
            value={`₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            disabled
            className="w-full px-2 py-2 rounded text-sm"
            style={{ 
              border: amountError ? '2px solid var(--color-error)' : '1px solid var(--color-silver)', 
              backgroundColor: amountError ? 'var(--color-error-light)' : 'var(--color-cloud)', 
              color: 'var(--color-ink)', 
              fontWeight: '600' 
            }}
          />
          {amountError && (
            <div className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
              {amountError}
            </div>
          )}
        </td>

        {/* GST Rate */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <select
            value={item.gstPercent}
            onChange={(e) => onUpdate(item.id, 'gstPercent', parseFloat(e.target.value))}
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
          >
            <option value={0}>0%</option>
            <option value={5}>5%</option>
            <option value={12}>12%</option>
            <option value={18}>18%</option>
            <option value={28}>28%</option>
          </select>
        </td>

        {/* GST Amount */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <input
            type="text"
            value={`₹${item.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            disabled
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: '600' }}
          />
        </td>

        {/* CGST */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <input
            type="text"
            value={`₹${item.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            disabled
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}
          />
        </td>

        {/* SGST */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <input
            type="text"
            value={`₹${item.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            disabled
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}
          />
        </td>

        {/* IGST */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <input
            type="text"
            value={`₹${item.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            disabled
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}
          />
        </td>

        {/* Gross Amount */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <input
            type="text"
            value={`₹${item.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            disabled
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)', fontWeight: '700' }}
          />
        </td>

        {/* TDS Amount */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <input
            type="text"
            value={`₹${item.tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            disabled
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-error-light)', color: 'var(--color-error-dark)', fontWeight: '600' }}
          />
        </td>

        {/* Net Payable */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <input
            type="text"
            value={`₹${item.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            disabled
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '2px solid var(--color-teal)', backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)', fontWeight: '700' }}
          />
        </td>

        {/* Cost Centre */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <select
            value={item.costCentre}
            onChange={(e) => onUpdate(item.id, 'costCentre', e.target.value)}
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
          >
            {costCentres.map(cc => (
              <option key={cc} value={cc}>{cc}</option>
            ))}
          </select>
        </td>

        {/* Profit Centre */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <select
            value={item.profitCentre}
            onChange={(e) => onUpdate(item.id, 'profitCentre', e.target.value)}
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
          >
            {profitCentres.map(pc => (
              <option key={pc} value={pc}>{pc}</option>
            ))}
          </select>
        </td>

        {/* Project */}
        <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
          <input
            type="text"
            value={item.project}
            onChange={(e) => onUpdate(item.id, 'project', e.target.value)}
            className="w-full px-2 py-2 rounded text-sm"
            style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
          />
        </td>
      </tr>

      {/* Exception Modal */}
      {showExceptionModal && (
        <POInvoiceExceptionModal
          isOpen={showExceptionModal}
          onClose={() => setShowExceptionModal(false)}
          onSubmit={handleExceptionRequest}
          lineItem={{
            itemName: item.itemName,
            itemCode: item.itemCode,
            poRate: poData.poRate,
            requestedRate: item.unitPrice,
            quantity: item.qty
          }}
        />
      )}
    </>
  );
}
