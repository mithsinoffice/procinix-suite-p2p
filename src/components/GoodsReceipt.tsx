import { useState } from 'react';
import { Search, Filter, Plus, Package, X, ChevronDown, MapPin, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAPData } from '../contexts/APDataContext';

interface GRN {
  id: string;
  grnNumber: string;
  poNumber: string;
  vendor: string;
  receiptDate: string;
  amount: number;
  qtyReceived: number;
  poQty: number;
  status: 'Pending' | 'Partial' | 'Complete';
  allocationStatus: 'Not Allocated' | 'Partially Allocated' | 'Fully Allocated' | 'Accepted';
  allocations?: LocationAllocation[];
}

interface LocationAllocation {
  id: string;
  location: string;
  allocatedQty: number;
  acceptedQty: number;
  status: 'Pending Acceptance' | 'Accepted' | 'Rejected';
  acceptedBy?: string;
  acceptedDate?: string;
}

interface POItem {
  id: string;
  poNumber: string;
  vendor: string;
  orderQty: number;
  receivedQty: number;
  remainingQty: number;
  unitPrice: number;
  itemName: string;
  deliveryLocation: string;
}

const locations = [
  'Mumbai Warehouse',
  'Bangalore Store',
  'Pune Store',
  'Delhi Hub',
  'Chennai Depot',
  'Kolkata Branch'
];

const getStatusColor = (status: GRN['status']) => {
  switch (status) {
    case 'Pending': return '#9AA6AF';
    case 'Partial': return '#007D87';
    case 'Complete': return '#00A9B7';
    default: return '#6E7A82';
  }
};

const getAllocationStatusColor = (status: GRN['allocationStatus']) => {
  switch (status) {
    case 'Not Allocated': return '#FF4E5B';
    case 'Partially Allocated': return '#D97706';
    case 'Fully Allocated': return '#00A9B7';
    case 'Accepted': return '#00A9B7';
    default: return '#6E7A82';
  }
};

export function GoodsReceipt() {
  const { grns: persistedGrns, purchaseOrders, addGRN } = useAPData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<POItem | null>(null);
  const [qtyReceived, setQtyReceived] = useState(0);
  
  // Part B - Allocation states
  const [currentStep, setCurrentStep] = useState<'partA' | 'partB'>('partA');
  const [allocations, setAllocations] = useState<LocationAllocation[]>([]);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);

  const grns: GRN[] = persistedGrns.map((grn) => ({
    id: grn.id,
    grnNumber: grn.grnNumber,
    poNumber: grn.poNumber,
    vendor: grn.vendor,
    receiptDate: grn.receiptDate,
    amount: grn.amount,
    qtyReceived: grn.qtyReceived,
    poQty: grn.poQty,
    status: grn.status,
    allocationStatus: grn.allocationStatus,
    allocations: grn.lineItems?.map((lineItem) => ({
      id: lineItem.id,
      location: lineItem.itemDescription || 'Allocated Location',
      allocatedQty: lineItem.qtyReceived,
      acceptedQty: lineItem.qtyAccepted,
      status: lineItem.qtyAccepted > 0 ? 'Accepted' : 'Pending Acceptance',
    })),
  }));

  const availablePOItems: POItem[] = purchaseOrders.flatMap((po) =>
    po.lineItems
      .filter((lineItem) => lineItem.remainingQty > 0)
      .map((lineItem) => ({
        id: `${po.id}:${lineItem.id}`,
        poNumber: po.poNumber,
        vendor: po.vendor,
        orderQty: lineItem.qty,
        receivedQty: lineItem.receivedQty,
        remainingQty: lineItem.remainingQty,
        unitPrice: lineItem.unitPrice,
        itemName: lineItem.itemName,
        deliveryLocation: lineItem.project || po.department || 'Primary Location',
      }))
  );

  const filteredGRNs = grns.filter(grn => 
    grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addAllocationLine = () => {
    const newAllocation: LocationAllocation = {
      id: Date.now().toString(),
      location: '',
      allocatedQty: 0,
      acceptedQty: 0,
      status: 'Pending Acceptance'
    };
    setAllocations([...allocations, newAllocation]);
  };

  const updateAllocation = (id: string, field: keyof LocationAllocation, value: any) => {
    setAllocations(allocations.map(alloc => 
      alloc.id === id ? { ...alloc, [field]: value } : alloc
    ));
  };

  const removeAllocation = (id: string) => {
    setAllocations(allocations.filter(alloc => alloc.id !== id));
  };

  const getTotalAllocated = () => {
    return allocations.reduce((sum, alloc) => sum + (alloc.allocatedQty || 0), 0);
  };

  const isAllocationValid = () => {
    const total = getTotalAllocated();
    const allHaveLocation = allocations.every(alloc => alloc.location && alloc.allocatedQty > 0);
    return total === qtyReceived && allHaveLocation && allocations.length > 0;
  };

  const handleCreatePartA = () => {
    if (selectedPO && qtyReceived > 0) {
      setCurrentStep('partB');
      // Initialize with original PO location
      setAllocations([{
        id: '1',
        location: selectedPO.deliveryLocation,
        allocatedQty: qtyReceived,
        acceptedQty: 0,
        status: 'Pending Acceptance'
      }]);
    }
  };

  const handleCreateGRN = () => {
    if (isAllocationValid()) {
      const newGRN: GRN = {
        id: `grn-${Date.now()}`,
        grnNumber: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(3, '0')}`,
        poNumber: selectedPO?.poNumber || '',
        vendor: selectedPO?.vendor || '',
        receiptDate: new Date().toISOString().split('T')[0],
        amount: (selectedPO?.unitPrice || 0) * qtyReceived,
        qtyReceived,
        poQty: selectedPO?.orderQty || qtyReceived,
        status: qtyReceived >= (selectedPO?.remainingQty || qtyReceived) ? 'Complete' : 'Partial',
        allocationStatus: 'Partially Allocated',
        allocations,
      };

      addGRN({
        id: newGRN.id,
        grnNumber: newGRN.grnNumber,
        poNumber: newGRN.poNumber,
        vendor: newGRN.vendor,
        receiptDate: newGRN.receiptDate,
        amount: newGRN.amount,
        qtyReceived: newGRN.qtyReceived,
        poQty: newGRN.poQty,
        status: newGRN.status,
        allocationStatus: allocations.every((allocation) => allocation.acceptedQty >= allocation.allocatedQty)
          ? 'Accepted'
          : allocations.length > 0
            ? 'Partially Allocated'
            : 'Not Allocated',
        lineItems: allocations.map((allocation) => ({
          id: allocation.id,
          grnNumber: newGRN.grnNumber,
          poLineItemId: selectedPO?.id || '',
          itemCode: selectedPO?.id || '',
          itemName: selectedPO?.itemName || '',
          itemDescription: allocation.location,
          qtyOrdered: selectedPO?.orderQty || qtyReceived,
          qtyReceived: allocation.allocatedQty,
          qtyAccepted: allocation.acceptedQty,
          qtyRejected: Math.max(0, allocation.allocatedQty - allocation.acceptedQty),
          unitPrice: selectedPO?.unitPrice || 0,
          amount: allocation.allocatedQty * (selectedPO?.unitPrice || 0),
        })),
      });
      
      // Reset
      setShowCreateModal(false);
      setCurrentStep('partA');
      setSelectedPO(null);
      setQtyReceived(0);
      setAllocations([]);
    }
  };

  const handleViewAllocations = (grn: GRN) => {
    setSelectedGRN(grn);
    setShowAllocationModal(true);
  };

  const handleAcceptAllocation = (grnId: string, allocationId: string) => {
    alert(`Allocation accepted for ${allocationId}`);
    setShowAllocationModal(false);
  };

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Goods Receipt (GRN)</h1>
          <p style={{ color: '#6E7A82' }}>Record vendor deliveries and manage location allocations</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#00A9B7' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
        >
          <Plus className="w-5 h-5" />
          Create GRN from PO
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '1px solid #E1E6EA' }}>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#6E7A82' }} />
            <input
              type="text"
              placeholder="Search by GRN number, PO number, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg"
              style={{ 
                border: '1px solid #E1E6EA',
                backgroundColor: '#F6F9FC',
                color: '#0A0F14'
              }}
            />
          </div>
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ 
              border: '1px solid #E1E6EA',
              color: '#0A0F14',
              backgroundColor: 'white'
            }}
          >
            <Filter className="w-5 h-5" />
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #E1E6EA' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="text-left px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>GRN Number</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>PO Number</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>Vendor</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>Receipt Date</th>
                <th className="text-right px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>Qty Received</th>
                <th className="text-right px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>Amount</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>Allocation Status</th>
                <th className="text-left px-6 py-4 text-sm" style={{ color: '#6E7A82' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGRNs.map((grn, index) => (
                <tr 
                  key={grn.id}
                  style={{ 
                    borderTop: index === 0 ? 'none' : '1px solid #E1E6EA'
                  }}
                >
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" style={{ color: '#00A9B7' }} />
                      {grn.grnNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                    {grn.poNumber}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>
                    {grn.vendor}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                    {new Date(grn.receiptDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right" style={{ color: '#0A0F14' }}>
                    {grn.qtyReceived}
                  </td>
                  <td className="px-6 py-4 text-right" style={{ color: '#0A0F14' }}>
                    ₹{grn.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                      style={{ 
                        backgroundColor: getAllocationStatusColor(grn.allocationStatus) + '20',
                        color: getAllocationStatusColor(grn.allocationStatus)
                      }}
                    >
                      {grn.allocationStatus === 'Accepted' && <CheckCircle className="w-3 h-3" />}
                      {grn.allocationStatus === 'Partially Allocated' && <Clock className="w-3 h-3" />}
                      {grn.allocationStatus === 'Not Allocated' && <AlertCircle className="w-3 h-3" />}
                      {grn.allocationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewAllocations(grn)}
                      className="px-3 py-1 rounded text-sm transition-colors"
                      style={{ 
                        backgroundColor: '#E8F7F8',
                        color: '#00A9B7'
                      }}
                    >
                      View Allocations
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create GRN Modal - Two Part System */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
              <div>
                <h2 className="text-xl" style={{ color: '#0A0F14' }}>
                  {currentStep === 'partA' ? 'Part A: Record Physical Receipt' : 'Part B: Allocate to Locations'}
                </h2>
                <p className="text-sm mt-1" style={{ color: '#6E7A82' }}>
                  {currentStep === 'partA' 
                    ? 'Record the actual quantity received from vendor' 
                    : 'Distribute received quantity to multiple locations'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setCurrentStep('partA');
                  setSelectedPO(null);
                  setQtyReceived(0);
                  setAllocations([]);
                }}
                style={{ color: '#6E7A82' }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="px-6 pt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                    style={{ 
                      backgroundColor: currentStep === 'partA' || currentStep === 'partB' ? '#00A9B7' : '#E1E6EA',
                      color: currentStep === 'partA' || currentStep === 'partB' ? 'white' : '#6E7A82'
                    }}
                  >
                    {currentStep === 'partB' ? '✓' : '1'}
                  </div>
                  <span className="text-sm" style={{ color: '#0A0F14' }}>Physical Receipt</span>
                </div>
                <div className="flex-1 h-px" style={{ backgroundColor: '#E1E6EA' }}></div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                    style={{ 
                      backgroundColor: currentStep === 'partB' ? '#00A9B7' : '#E1E6EA',
                      color: currentStep === 'partB' ? 'white' : '#6E7A82'
                    }}
                  >
                    2
                  </div>
                  <span className="text-sm" style={{ color: '#0A0F14' }}>Location Allocation</span>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {currentStep === 'partA' ? (
                <>
                  {/* Select PO */}
                  <div className="mb-6">
                    <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                      Select Purchase Order *
                    </label>
                    <div className="relative">
                      <select
                        value={selectedPO?.id || ''}
                        onChange={(e) => {
                          const po = availablePOItems.find(p => p.id === e.target.value);
                          setSelectedPO(po || null);
                          setQtyReceived(0);
                        }}
                        className="w-full px-4 py-3 rounded-lg appearance-none"
                        style={{ 
                          border: '1px solid #E1E6EA',
                          backgroundColor: '#F6F9FC',
                          color: '#0A0F14'
                        }}
                      >
                        <option value="">Choose a PO...</option>
                        {availablePOItems.map(po => (
                          <option key={po.id} value={po.id}>
                            {po.poNumber} - {po.vendor} - {po.itemName} (Remaining: {po.remainingQty})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#6E7A82' }} />
                    </div>
                  </div>

                  {/* PO Details */}
                  {selectedPO && (
                    <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}>
                      <h3 className="mb-3" style={{ color: '#0A0F14' }}>PO Details</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Item Name</p>
                          <p style={{ color: '#0A0F14' }}>{selectedPO.itemName}</p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Vendor</p>
                          <p style={{ color: '#0A0F14' }}>{selectedPO.vendor}</p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Original Delivery Location</p>
                          <p className="flex items-center gap-1" style={{ color: '#00A9B7' }}>
                            <MapPin className="w-4 h-4" />
                            {selectedPO.deliveryLocation}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Order Qty</p>
                          <p style={{ color: '#0A0F14' }}>{selectedPO.orderQty}</p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Already Received</p>
                          <p style={{ color: '#0A0F14' }}>{selectedPO.receivedQty}</p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Remaining Qty</p>
                          <p style={{ color: '#00A9B7' }}>{selectedPO.remainingQty}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quantity Received */}
                  {selectedPO && (
                    <div className="mb-6">
                      <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                        Quantity Received from Vendor *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={selectedPO.remainingQty}
                        value={qtyReceived}
                        onChange={(e) => setQtyReceived(Math.min(parseInt(e.target.value) || 0, selectedPO.remainingQty))}
                        className="w-full px-4 py-3 rounded-lg"
                        style={{ 
                          border: '1px solid #E1E6EA',
                          backgroundColor: 'white',
                          color: '#0A0F14'
                        }}
                        placeholder="Enter quantity received"
                      />
                      <p className="text-sm mt-1" style={{ color: '#6E7A82' }}>
                        Max: {selectedPO.remainingQty} units
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Part B - Location Allocations */}
                  <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#FFF9E6', border: '1px solid #D97706' }}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: '#D97706' }} />
                      <div>
                        <p className="text-sm" style={{ color: '#0A0F14' }}>
                          <strong>Total Received: {qtyReceived} units</strong>
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#6E7A82' }}>
                          Allocate the complete quantity to one or more locations. Total allocation must equal {qtyReceived} units.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Allocation Lines */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm" style={{ color: '#6E7A82' }}>
                        Location Allocations
                      </label>
                      <button
                        onClick={addAllocationLine}
                        className="flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors"
                        style={{ 
                          backgroundColor: '#E8F7F8',
                          color: '#00A9B7'
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Add Location
                      </button>
                    </div>

                    <div className="space-y-3">
                      {allocations.map((allocation, index) => (
                        <div 
                          key={allocation.id} 
                          className="p-4 rounded-lg"
                          style={{ border: '1px solid #E1E6EA', backgroundColor: 'white' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs mb-1" style={{ color: '#6E7A82' }}>
                                  Location *
                                </label>
                                <select
                                  value={allocation.location}
                                  onChange={(e) => updateAllocation(allocation.id, 'location', e.target.value)}
                                  className="w-full px-3 py-2 rounded text-sm"
                                  style={{ 
                                    border: '1px solid #E1E6EA',
                                    color: '#0A0F14'
                                  }}
                                >
                                  <option value="">Select location...</option>
                                  {locations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs mb-1" style={{ color: '#6E7A82' }}>
                                  Allocated Quantity *
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={allocation.allocatedQty || ''}
                                  onChange={(e) => updateAllocation(allocation.id, 'allocatedQty', parseInt(e.target.value) || 0)}
                                  className="w-full px-3 py-2 rounded text-sm"
                                  style={{ 
                                    border: '1px solid #E1E6EA',
                                    color: '#0A0F14'
                                  }}
                                  placeholder="Enter quantity"
                                />
                              </div>
                            </div>
                            {allocations.length > 1 && (
                              <button
                                onClick={() => removeAllocation(allocation.id)}
                                className="p-2 rounded transition-colors"
                                style={{ color: '#FF4E5B' }}
                                title="Remove allocation"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Allocation Summary */}
                  <div className="p-4 rounded-lg" style={{ 
                    backgroundColor: getTotalAllocated() === qtyReceived ? '#E8F7F8' : '#FFE8EA',
                    border: `1px solid ${getTotalAllocated() === qtyReceived ? '#00A9B7' : '#FF4E5B'}`
                  }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm" style={{ color: '#0A0F14' }}>
                          Total Allocated: <strong>{getTotalAllocated()} units</strong>
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>
                          {getTotalAllocated() === qtyReceived 
                            ? '✓ Allocation complete - matches received quantity' 
                            : `${qtyReceived - getTotalAllocated()} units ${getTotalAllocated() > qtyReceived ? 'over' : 'remaining'}`}
                        </p>
                      </div>
                      {getTotalAllocated() === qtyReceived && (
                        <CheckCircle className="w-5 h-5" style={{ color: '#00A9B7' }} />
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6" style={{ borderTop: '1px solid #E1E6EA' }}>
              <button
                onClick={() => {
                  if (currentStep === 'partB') {
                    setCurrentStep('partA');
                  } else {
                    setShowCreateModal(false);
                    setCurrentStep('partA');
                    setSelectedPO(null);
                    setQtyReceived(0);
                    setAllocations([]);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-lg"
                style={{ 
                  border: '1px solid #E1E6EA',
                  color: '#0A0F14',
                  backgroundColor: 'white'
                }}
              >
                {currentStep === 'partB' ? 'Back' : 'Cancel'}
              </button>
              {currentStep === 'partA' ? (
                <button
                  onClick={handleCreatePartA}
                  disabled={!selectedPO || qtyReceived === 0}
                  className="flex-1 px-4 py-3 rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#00A9B7' }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#007D87')}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#00A9B7')}
                >
                  Continue to Allocation →
                </button>
              ) : (
                <button
                  onClick={handleCreateGRN}
                  disabled={!isAllocationValid()}
                  className="flex-1 px-4 py-3 rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#00A9B7' }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#007D87')}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#00A9B7')}
                >
                  Create GRN & Notify Locations
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Allocations Modal */}
      {showAllocationModal && selectedGRN && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
              <div>
                <h2 className="text-xl" style={{ color: '#0A0F14' }}>
                  GRN Allocations - {selectedGRN.grnNumber}
                </h2>
                <p className="text-sm mt-1" style={{ color: '#6E7A82' }}>
                  Total Received: {selectedGRN.qtyReceived} units
                </p>
              </div>
              <button onClick={() => setShowAllocationModal(false)} style={{ color: '#6E7A82' }}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {selectedGRN.allocations?.map((allocation) => (
                  <div 
                    key={allocation.id}
                    className="p-4 rounded-lg"
                    style={{ border: '1px solid #E1E6EA' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" style={{ color: '#00A9B7' }} />
                        <div>
                          <p style={{ color: '#0A0F14' }}>{allocation.location}</p>
                          <p className="text-sm" style={{ color: '#6E7A82' }}>
                            Allocated: {allocation.allocatedQty} units
                          </p>
                        </div>
                      </div>
                      <span 
                        className="px-3 py-1 rounded-full text-sm"
                        style={{ 
                          backgroundColor: allocation.status === 'Accepted' ? '#E8F7F8' : '#FFF9E6',
                          color: allocation.status === 'Accepted' ? '#00A9B7' : '#D97706'
                        }}
                      >
                        {allocation.status}
                      </span>
                    </div>

                    {allocation.status === 'Accepted' && (
                      <div className="pt-3" style={{ borderTop: '1px solid #E1E6EA' }}>
                        <p className="text-sm" style={{ color: '#6E7A82' }}>
                          Accepted by: <strong style={{ color: '#0A0F14' }}>{allocation.acceptedBy}</strong>
                        </p>
                        <p className="text-sm" style={{ color: '#6E7A82' }}>
                          Date: {allocation.acceptedDate}
                        </p>
                      </div>
                    )}

                    {allocation.status === 'Pending Acceptance' && (
                      <button
                        onClick={() => handleAcceptAllocation(selectedGRN.id, allocation.id)}
                        className="mt-3 w-full px-4 py-2 rounded-lg text-white transition-colors"
                        style={{ backgroundColor: '#00A9B7' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
                      >
                        Accept Allocation
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
