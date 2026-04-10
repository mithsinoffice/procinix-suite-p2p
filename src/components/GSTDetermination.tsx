import { Shield, Info, AlertCircle } from 'lucide-react';

interface GSTDeterminationProps {
  companyGSTIN: string;
  setCompanyGSTIN: (value: string) => void;
  companyState: string;
  vendorGSTNumber: string;
  supplierState: string;
  placeOfSupply: string;
  setPlaceOfSupply: (value: string) => void;
  shipToState: string;
  setShipToState: (value: string) => void;
  supplyType: 'Goods' | 'Services';
  setSupplyType: (value: 'Goods' | 'Services') => void;
  reverseChargeApplicable: boolean;
  setReverseChargeApplicable: (value: boolean) => void;
  isSEZ: boolean;
  setIsSEZ: (value: boolean) => void;
  isExport: boolean;
  setIsExport: (value: boolean) => void;
  gstType: 'CGST+SGST' | 'IGST';
  gstTypeOverridden: boolean;
  showGSTOverride: boolean;
  setShowGSTOverride: (value: boolean) => void;
  gstOverrideReason: string;
  setGstOverrideReason: (value: string) => void;
  gstOverrideComments: string;
  setGstOverrideComments: (value: string) => void;
  handleGSTTypeOverride: (newType: 'CGST+SGST' | 'IGST') => void;
  gstValidationIssues: { type: 'blocker' | 'warning'; message: string; action?: string }[];
  selectedPO: string;
  statesList: Array<{ code: string; name: string }>;
}

export function GSTDetermination({
  companyGSTIN,
  setCompanyGSTIN,
  companyState,
  vendorGSTNumber,
  supplierState,
  placeOfSupply,
  setPlaceOfSupply,
  shipToState,
  setShipToState,
  supplyType,
  setSupplyType,
  reverseChargeApplicable,
  setReverseChargeApplicable,
  isSEZ,
  setIsSEZ,
  isExport,
  setIsExport,
  gstType,
  gstTypeOverridden,
  showGSTOverride,
  setShowGSTOverride,
  gstOverrideReason,
  setGstOverrideReason,
  gstOverrideComments,
  setGstOverrideComments,
  handleGSTTypeOverride,
  gstValidationIssues,
  selectedPO,
  statesList
}: GSTDeterminationProps) {
  return (
    <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#00A9B710' }}>
            <Shield className="w-5 h-5" style={{ color: '#00A9B7' }} />
          </div>
          <div>
            <h2 className="text-xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>GST Determination</h2>
            <p className="text-sm" style={{ color: '#6E7A82' }}>Auto-calculated GST type and tax split</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4" style={{ color: '#6E7A82' }} />
          <span className="text-xs" style={{ color: '#6E7A82' }} title="GST type is determined based on Place of Supply and Ship-to State. If both states are same, CGST+SGST applies. Otherwise, IGST applies.">
            How GST is determined
          </span>
        </div>
      </div>

      {/* GSTIN Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
        <div>
          <label className="block text-xs mb-1" style={{ color: '#6E7A82', fontWeight: '600' }}>Company GSTIN</label>
          <input
            type="text"
            value={companyGSTIN}
            onChange={(e) => setCompanyGSTIN(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
          />
          <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>State: {companyState || 'N/A'}</p>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: '#6E7A82', fontWeight: '600' }}>Supplier GSTIN</label>
          <input
            type="text"
            value={vendorGSTNumber}
            disabled
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#6E7A82' }}
          />
          <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>State: {supplierState || 'N/A'}</p>
        </div>
      </div>

      {/* Place of Supply & Ship-to */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div>
          <label className="block text-sm mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Place of Supply <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <select
            value={placeOfSupply}
            onChange={(e) => setPlaceOfSupply(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-base"
            style={{
              border: placeOfSupply ? '2px solid #00A9B7' : '2px solid #E1E6EA',
              color: '#0A0F14'
            }}
            required
          >
            <option value="">-- Select State --</option>
            {statesList.map(state => (
              <option key={state.code} value={state.name}>{state.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Ship-to State <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <select
            value={shipToState}
            onChange={(e) => setShipToState(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-base"
            style={{
              border: shipToState ? '2px solid #00A9B7' : '2px solid #E1E6EA',
              color: '#0A0F14'
            }}
            required
          >
            <option value="">-- Select State --</option>
            {statesList.map(state => (
              <option key={state.code} value={state.name}>{state.name}</option>
            ))}
          </select>
          {selectedPO && (
            <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>Derived from PO</p>
          )}
        </div>
        <div>
          <label className="block text-sm mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>Supply Type</label>
          <select
            value={supplyType}
            onChange={(e) => setSupplyType(e.target.value as 'Goods' | 'Services')}
            className="w-full px-4 py-3 rounded-lg text-base"
            style={{ border: '2px solid #E1E6EA', color: '#0A0F14' }}
          >
            <option value="Goods">Goods</option>
            <option value="Services">Services</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>Special Category</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm" style={{ color: '#0A0F14' }}>
              <input
                type="checkbox"
                checked={reverseChargeApplicable}
                onChange={(e) => setReverseChargeApplicable(e.target.checked)}
                className="rounded"
              />
              Reverse Charge
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: '#0A0F14' }}>
              <input
                type="checkbox"
                checked={isSEZ}
                onChange={(e) => setIsSEZ(e.target.checked)}
                className="rounded"
              />
              SEZ
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: '#0A0F14' }}>
              <input
                type="checkbox"
                checked={isExport}
                onChange={(e) => setIsExport(e.target.checked)}
                className="rounded"
              />
              Export
            </label>
          </div>
        </div>
      </div>

      {/* GST Type Display */}
      {placeOfSupply && shipToState && (
        <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: gstType === 'CGST+SGST' ? '#DCFCE7' : '#DBEAFE', border: gstType === 'CGST+SGST' ? '2px solid #10B981' : '2px solid #3B82F6' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded text-xs" style={{ backgroundColor: gstType === 'CGST+SGST' ? '#10B981' : '#3B82F6', color: '#FFFFFF', fontWeight: '700' }}>
                  GST Type Applied: {gstType}
                </span>
                {gstTypeOverridden && (
                  <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#F59E0B', color: '#FFFFFF' }}>OVERRIDDEN</span>
                )}
              </div>
              <p className="text-sm" style={{ color: '#0A0F14' }}>
                <strong>Reason:</strong> {placeOfSupply === shipToState
                  ? `Intra-state supply (${placeOfSupply})`
                  : `Inter-state supply (${placeOfSupply} → ${shipToState})`}
              </p>
            </div>
            <button
              onClick={() => setShowGSTOverride(!showGSTOverride)}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{ backgroundColor: '#6E7A82', color: '#FFFFFF' }}
            >
              Override GST Type
            </button>
          </div>

          {/* GST Override Panel */}
          {showGSTOverride && (
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E6EA' }}>
              <h4 className="text-sm mb-3" style={{ color: '#0A0F14', fontWeight: '600' }}>Override GST Type (Requires Justification)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#6E7A82' }}>New GST Type</label>
                  <select
                    onChange={(e) => {
                      const newType = e.target.value as 'CGST+SGST' | 'IGST';
                      if (newType && newType !== gstType) {
                        handleGSTTypeOverride(newType);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                  >
                    <option value="">-- Select Type --</option>
                    <option value="CGST+SGST">CGST + SGST</option>
                    <option value="IGST">IGST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#6E7A82' }}>Override Reason</label>
                  <select
                    value={gstOverrideReason}
                    onChange={(e) => setGstOverrideReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                  >
                    <option value="">-- Select Reason --</option>
                    <option value="supplier-gstin-error">Supplier GSTIN Error</option>
                    <option value="po-state-mismatch">PO State Mismatch</option>
                    <option value="billing-vs-delivery">Billing vs Delivery Location</option>
                    <option value="other">Other (Specify in comments)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6E7A82' }}>Comments (Mandatory)</label>
                <textarea
                  value={gstOverrideComments}
                  onChange={(e) => setGstOverrideComments(e.target.value)}
                  placeholder="Explain why this override is necessary..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* GST Validation Issues */}
      {gstValidationIssues.length > 0 && (
        <div className="space-y-2">
          {gstValidationIssues.map((issue, index) => (
            <div
              key={index}
              className="p-3 rounded-lg flex items-start gap-3"
              style={{
                backgroundColor: issue.type === 'blocker' ? '#FEE2E2' : '#FEF3C7',
                border: issue.type === 'blocker' ? '1px solid #EF4444' : '1px solid #F59E0B'
              }}
            >
              <AlertCircle
                className="w-5 h-5 mt-0.5"
                style={{ color: issue.type === 'blocker' ? '#EF4444' : '#F59E0B' }}
              />
              <div className="flex-1">
                <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>
                  {issue.type === 'blocker' ? 'BLOCKER' : 'WARNING'}: {issue.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
