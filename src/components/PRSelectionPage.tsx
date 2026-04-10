import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { useMasterData } from '../contexts/MasterDataContext';
import { getApprovedPRs, PurchaseRequestTransaction } from '../contexts/PurchaseRequestData';

export function PRSelectionPage() {
  const navigate = useNavigate();
  const { currentCompany } = useMasterData();
  const [selectedPRs, setSelectedPRs] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Get approved PRs for current entity
  const availablePRs = currentCompany 
    ? getApprovedPRs(currentCompany.id)
    : [];

  // Toggle PR selection
  const togglePRSelection = (prId: string) => {
    const newSelection = new Set(selectedPRs);
    
    if (newSelection.has(prId)) {
      newSelection.delete(prId);
    } else {
      newSelection.add(prId);
    }
    
    setSelectedPRs(newSelection);
    setErrorMessage('');
  };

  // Validate and proceed to PO creation
  const handleProceed = () => {
    if (selectedPRs.size === 0) {
      setErrorMessage('Please select at least one PR to proceed.');
      return;
    }

    // Get selected PR objects
    const selectedPRObjects = availablePRs.filter(pr => selectedPRs.has(pr.id));
    
    // Validate same vendor
    const vendors = new Set(selectedPRObjects.map(pr => pr.vendorId));
    if (vendors.size > 1) {
      setErrorMessage('All selected PRs must be for the same vendor.');
      return;
    }

    // Validate same entity (should already be filtered but double check)
    const entities = new Set(selectedPRObjects.map(pr => pr.entityId));
    if (entities.size > 1) {
      setErrorMessage('All selected PRs must be from the same entity.');
      return;
    }

    // Navigate to PO creation with selected PR IDs
    const prIds = Array.from(selectedPRs).join(',');
    navigate(`/purchase-orders/create?mode=from-pr&prIds=${prIds}`);
  };

  // Calculate totals for selected PRs
  const selectedPRObjects = availablePRs.filter(pr => selectedPRs.has(pr.id));
  const totalAmount = selectedPRObjects.reduce((sum, pr) => sum + pr.totalAmount, 0);
  const totalLineItems = selectedPRObjects.reduce((sum, pr) => sum + pr.lineItems.length, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#6E7A82', border: '1px solid #E1E6EA' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>
              Select Purchase Requests
            </h1>
            <p style={{ color: '#6E7A82', marginTop: '8px' }}>
              Select one or more approved PRs to create a Purchase Order
            </p>
          </div>
        </div>
        
        <button
          onClick={handleProceed}
          disabled={selectedPRs.size === 0}
          className="px-6 py-2 rounded-lg text-white transition-colors"
          style={{
            backgroundColor: selectedPRs.size === 0 ? '#9AA6AF' : '#00A9B7',
            cursor: selectedPRs.size === 0 ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => {
            if (selectedPRs.size > 0) {
              e.currentTarget.style.backgroundColor = '#007D87';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedPRs.size > 0) {
              e.currentTarget.style.backgroundColor = '#00A9B7';
            }
          }}
        >
          Proceed to Create PO ({selectedPRs.size})
        </button>
      </div>

      {/* Entity Info */}
      <div className="bg-white rounded-lg p-4 mb-6" style={{ border: '1px solid #E1E6EA' }}>
        <div style={{ color: '#6E7A82', fontSize: '14px' }}>
          <strong style={{ color: '#0A0F14' }}>Entity:</strong> {currentCompany?.name || 'Unknown'}
        </div>
        <div style={{ color: '#6E7A82', fontSize: '13px', marginTop: '4px' }}>
          Only approved PRs from this entity are shown
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div 
          className="mb-6 p-4 rounded-lg flex items-start gap-3"
          style={{ 
            backgroundColor: '#FFF5F5',
            border: '1px solid #FED7D7'
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#E53E3E' }} />
          <div style={{ color: '#742A2A', fontSize: '14px' }}>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedPRs.size > 0 && (
        <div className="bg-white rounded-lg p-4 mb-6" style={{ border: '1px solid #00A9B7' }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ color: '#0A0F14', fontWeight: 500 }}>
                {selectedPRs.size} PR(s) Selected
              </div>
              <div style={{ color: '#6E7A82', fontSize: '13px', marginTop: '4px' }}>
                Total: {totalLineItems} line items · ₹{totalAmount.toLocaleString('en-IN')}
              </div>
            </div>
            <button
              onClick={() => setSelectedPRs(new Set())}
              style={{
                color: '#00A9B7',
                fontSize: '14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* PR Table */}
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #E1E6EA' }}>
        {availablePRs.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#9AA6AF' }} />
            <div style={{ color: '#0A0F14', fontSize: '18px', marginBottom: '8px' }}>
              No Approved PRs Available
            </div>
            <div style={{ color: '#6E7A82', fontSize: '14px' }}>
              There are no approved purchase requests available for this entity.
            </div>
            <button
              onClick={() => navigate('/purchase-orders')}
              className="mt-6 px-6 py-2 rounded-lg"
              style={{
                border: '1px solid #E1E6EA',
                color: '#0A0F14',
                background: 'white'
              }}
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#2A3A42' }}>
                  <th className="px-6 py-4 text-white text-center" style={{ width: '60px' }}>
                    Select
                  </th>
                  <th className="text-left px-6 py-4 text-white">PR Number</th>
                  <th className="text-left px-6 py-4 text-white">Department</th>
                  <th className="text-left px-6 py-4 text-white">Vendor</th>
                  <th className="text-center px-6 py-4 text-white">Item Count</th>
                  <th className="text-right px-6 py-4 text-white">Amount</th>
                  <th className="text-left px-6 py-4 text-white">Status</th>
                </tr>
              </thead>
              <tbody>
                {availablePRs.map((pr, index) => {
                  const isSelected = selectedPRs.has(pr.id);
                  return (
                    <tr
                      key={pr.id}
                      onClick={() => togglePRSelection(pr.id)}
                      style={{
                        borderBottom: index !== availablePRs.length - 1 ? '1px solid #E1E6EA' : 'none',
                        backgroundColor: isSelected ? '#F0FDFF' : 'white',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#F6F9FC';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <td className="px-6 py-4 text-center">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 mx-auto" style={{ color: '#00A9B7' }} />
                        ) : (
                          <Square className="w-5 h-5 mx-auto" style={{ color: '#9AA6AF' }} />
                        )}
                      </td>
                      <td className="px-6 py-4" style={{ color: '#0A0F14', fontWeight: 500 }}>
                        {pr.prNumber}
                      </td>
                      <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                        {pr.departmentName}
                      </td>
                      <td className="px-6 py-4" style={{ color: '#0A0F14' }}>
                        {pr.vendorName}
                      </td>
                      <td className="px-6 py-4 text-center" style={{ color: '#6E7A82' }}>
                        {pr.lineItems.length}
                      </td>
                      <td className="px-6 py-4 text-right" style={{ color: '#0A0F14' }}>
                        {pr.currency} {pr.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-block px-3 py-1 rounded-full text-white text-sm"
                          style={{ backgroundColor: '#00A9B7' }}
                        >
                          {pr.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}>
        <div style={{ color: '#0A0F14', fontWeight: 500, marginBottom: '8px' }}>
          Selection Guidelines:
        </div>
        <ul style={{ color: '#6E7A82', fontSize: '14px', paddingLeft: '20px' }}>
          <li>Select one or more approved PRs</li>
          <li>All selected PRs must be for the same vendor</li>
          <li>All selected PRs must be from the same entity</li>
          <li>Line items from all selected PRs will be combined in the PO</li>
          <li>You can modify quantities in the PO form (cannot exceed PR quantities)</li>
        </ul>
      </div>
    </div>
  );
}
