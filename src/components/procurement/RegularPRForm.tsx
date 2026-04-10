import { useState } from 'react';
import { FileText, Plus, Trash2, Search, AlertTriangle, CheckCircle, ArrowLeft, X, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProcurementData, type PurchaseRequestStatus } from '../../contexts/ProcurementDataContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';

/**
 * REGULAR PR FORM
 * Multi-item, multi-vendor procurement with price variance tracking
 */

interface PRLineItem {
  id: string;
  itemCode: string;
  itemName: string;
  description: string;
  quantity: number;
  uom: string;
  vendor: string;
  vendorCode: string;
  unitPrice: number;
  gstRate: number;
  hsnCode: string;
  costCentre: string;
  glAccount: string;
  budgetAvailable: number;
  lastPurchasePrice?: number;
  priceVariance?: number;
}

export function RegularPRForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPurchaseRequest } = useProcurementData();
  const {
    entities,
    departments,
    items,
    vendors,
    costCentres,
    accountCodes,
    currentCompany,
  } = useMasterData();
  const [lineItems, setLineItems] = useState<PRLineItem[]>([]);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(currentCompany?.name || entities[0]?.name || 'India HQ');
  const [selectedDepartment, setSelectedDepartment] = useState(departments[0]?.name || 'IT');
  const [deliveryLocation, setDeliveryLocation] = useState(currentCompany?.name || entities[0]?.name || 'Mumbai Office');
  const [needByDate, setNeedByDate] = useState(new Date().toISOString().split('T')[0]);
  const [businessJustification, setBusinessJustification] = useState('');

  const itemsCatalog = items.map((item) => ({
    itemCode: item.code,
    itemName: item.name,
    description: item.description,
    uom: item.uom,
    gstRate: item.gstRate,
    hsnCode: item.hsnCode,
    lastPrice: item.standardPrice || 0,
  }));

  const liveVendors = vendors
    .filter((vendor) => vendor.status === 'Active')
    .map((vendor) => ({
      vendorCode: vendor.code,
      vendorName: vendor.name,
    }));

  const liveCostCentres = costCentres.map((costCentre) => costCentre.code);
  const glAccounts = accountCodes
    .filter((account) => account.isActive)
    .map((account) => `${account.code} - ${account.name}`);

  const handleAddItem = () => {
    const newItem: PRLineItem = {
      id: `LINE-${Date.now()}`,
      itemCode: '',
      itemName: '',
      description: '',
      quantity: 1,
      uom: 'Unit',
      vendor: '',
      vendorCode: '',
      unitPrice: 0,
      gstRate: 18,
      hsnCode: '',
      costCentre: liveCostCentres[0] || '',
      glAccount: glAccounts[0] || '',
      budgetAvailable: 500000,
      lastPurchasePrice: 0,
      priceVariance: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: string, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Calculate price variance if unit price changes
        if (field === 'unitPrice' && item.lastPurchasePrice) {
          const variance = ((value - item.lastPurchasePrice) / item.lastPurchasePrice) * 100;
          updated.priceVariance = variance;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const calculateLineTotal = (item: PRLineItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const gst = subtotal * (item.gstRate / 100);
    return { subtotal, gst, total: subtotal + gst };
  };

  const calculateGrandTotal = () => {
    let subtotal = 0;
    let gst = 0;
    lineItems.forEach(item => {
      const totals = calculateLineTotal(item);
      subtotal += totals.subtotal;
      gst += totals.gst;
    });
    return { subtotal, gst, total: subtotal + gst };
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const grandTotal = calculateGrandTotal();

  // Count unique vendors
  const uniqueVendors = new Set(lineItems.filter(item => item.vendor).map(item => item.vendor)).size;

  const submitPurchaseRequest = (status: PurchaseRequestStatus) => {
    const timestamp = Date.now();
    const createdDate = new Date().toISOString().split('T')[0];

    addPurchaseRequest({
      id: `regular-${timestamp}`,
      prNumber: `PR-${timestamp}`,
      type: 'Regular',
      entity: selectedEntity,
      requestor: user?.name || 'Current User',
      department: selectedDepartment,
      costCentre: lineItems[0]?.costCentre || liveCostCentres[0] || '',
      needByDate,
      deliveryLocation,
      totalAmount: grandTotal.total,
      currency: 'INR',
      status,
      nextApprover: status === 'Draft' ? '—' : 'Department Head',
      aiRiskLevel: grandTotal.total > 1000000 ? 'Medium' : 'Low',
      createdDate,
      submittedDate: status === 'Draft' ? undefined : createdDate,
      vendor: uniqueVendors === 1 ? lineItems[0]?.vendor : `${uniqueVendors || 0} vendors`,
      itemCount: lineItems.length,
      justification: businessJustification || `Regular PR with ${lineItems.length} line item(s)`,
      policyFlags: grandTotal.total > 1000000 ? ['Budget Review'] : [],
      lineItems: lineItems.map((item) => ({
        ...item,
        lineTotal: calculateLineTotal(item).total
      }))
    });

    navigate('/procurement/pr/my-prs');
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => navigate('/procurement/pr/create')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: '#6E7A82' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl mb-1" style={{ color: '#0A0F14', margin: 0 }}>Regular Purchase Requisition</h1>
            <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>Multi-item, multi-vendor procurement with price variance tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', color: '#6E7A82' }}
              onClick={() => submitPurchaseRequest('Draft')}
            >
              Save as Draft
            </button>
            <button
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#00A9B7' }}
              onClick={() => submitPurchaseRequest('Pending Approval')}
            >
              Submit for Approval
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Form - Left 2 Columns */}
          <div className="col-span-2 space-y-6">
            {/* Header Section */}
            <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
              <h3 className="text-base mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>PR Header Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Entity <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                  >
                    {entities.filter((entity) => entity.isActive).map((entity) => (
                      <option key={entity.id} value={entity.name}>{entity.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Department <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                  >
                    {departments.filter((department) => department.isActive).map((department) => (
                      <option key={department.id} value={department.name}>{department.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Delivery Location <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                  >
                    {entities.filter((entity) => entity.isActive).map((entity) => (
                      <option key={entity.id} value={entity.name}>{entity.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Need-by Date <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input type="date" value={needByDate} onChange={(e) => setNeedByDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Business Justification <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <textarea value={businessJustification} onChange={(e) => setBusinessJustification(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" rows={2} placeholder="Explain why these items are needed..." style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}></textarea>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base" style={{ color: '#0A0F14', fontWeight: '600' }}>Line Items</h3>
                <button 
                  onClick={handleAddItem}
                  className="px-4 py-2 rounded-lg text-white flex items-center gap-2"
                  style={{ backgroundColor: '#00A9B7' }}
                >
                  <Plus className="w-4 h-4" />
                  Add Line Item
                </button>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-12" style={{ backgroundColor: '#F6F9FC', borderRadius: '8px' }}>
                  <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#6E7A82' }} />
                  <p className="text-sm mb-1" style={{ color: '#0A0F14' }}>No items added yet</p>
                  <p className="text-sm" style={{ color: '#6E7A82' }}>Click "Add Line Item" to start building your PR</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: '#F6F9FC' }}>
                      <tr>
                        <th className="px-3 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Item Details</th>
                        <th className="px-3 py-3 text-left text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Vendor</th>
                        <th className="px-3 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Qty</th>
                        <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Unit Price</th>
                        <th className="px-3 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Price Variance</th>
                        <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Total</th>
                        <th className="px-3 py-3 text-center text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: '#E1E6EA' }}>
                      {lineItems.map((item, index) => {
                        const totals = calculateLineTotal(item);
                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-4">
                              <select 
                                className="w-full px-2 py-1 rounded text-sm mb-2"
                                style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                                value={item.itemCode}
                                onChange={(e) => {
                                  const selectedItem = itemsCatalog.find(i => i.itemCode === e.target.value);
                                  if (selectedItem) {
                                    handleUpdateItem(item.id, 'itemCode', selectedItem.itemCode);
                                    handleUpdateItem(item.id, 'itemName', selectedItem.itemName);
                                    handleUpdateItem(item.id, 'description', selectedItem.description);
                                    handleUpdateItem(item.id, 'uom', selectedItem.uom);
                                    handleUpdateItem(item.id, 'gstRate', selectedItem.gstRate);
                                    handleUpdateItem(item.id, 'hsnCode', selectedItem.hsnCode);
                                    handleUpdateItem(item.id, 'lastPurchasePrice', selectedItem.lastPrice);
                                  }
                                }}
                              >
                                <option value="">Select Item</option>
                                {itemsCatalog.map(i => (
                                  <option key={i.itemCode} value={i.itemCode}>{i.itemCode} - {i.itemName}</option>
                                ))}
                              </select>
                              {item.itemName && (
                                <div>
                                  <p className="text-xs" style={{ color: '#0A0F14', fontWeight: '600' }}>{item.itemName}</p>
                                  <p className="text-xs" style={{ color: '#6E7A82' }}>{item.description}</p>
                                  <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>HSN: {item.hsnCode} | GST: {item.gstRate}%</p>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-4">
                              <select 
                                className="w-full px-2 py-1 rounded text-sm"
                                style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                                value={item.vendorCode}
                                onChange={(e) => {
                                  const selectedVendor = liveVendors.find(v => v.vendorCode === e.target.value);
                                  if (selectedVendor) {
                                    handleUpdateItem(item.id, 'vendorCode', selectedVendor.vendorCode);
                                    handleUpdateItem(item.id, 'vendor', selectedVendor.vendorName);
                                  }
                                }}
                              >
                                <option value="">Select Vendor</option>
                                {liveVendors.map(v => (
                                  <option key={v.vendorCode} value={v.vendorCode}>{v.vendorName}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-4">
                              <input 
                                type="number" 
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 rounded text-sm text-center"
                                style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                              />
                              <p className="text-xs text-center mt-1" style={{ color: '#6E7A82' }}>{item.uom}</p>
                            </td>
                            <td className="px-3 py-4">
                              <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-28 px-2 py-1 rounded text-sm text-right"
                                style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', color: '#0A0F14' }}
                              />
                              {item.lastPurchasePrice && item.lastPurchasePrice > 0 && (
                                <p className="text-xs text-right mt-1" style={{ color: '#6E7A82' }}>
                                  Last: {formatCurrency(item.lastPurchasePrice)}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-4 text-center">
                              {item.priceVariance !== undefined && item.priceVariance !== 0 ? (
                                <div className="flex items-center justify-center gap-1">
                                  {item.priceVariance > 0 ? (
                                    <TrendingUp className="w-4 h-4" style={{ color: '#DC2626' }} />
                                  ) : (
                                    <TrendingDown className="w-4 h-4" style={{ color: '#2E7D32' }} />
                                  )}
                                  <span 
                                    className="text-xs"
                                    style={{ color: item.priceVariance > 0 ? '#DC2626' : '#2E7D32', fontWeight: '600' }}
                                  >
                                    {item.priceVariance > 0 ? '+' : ''}{item.priceVariance.toFixed(1)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs" style={{ color: '#6E7A82' }}>—</span>
                              )}
                            </td>
                            <td className="px-3 py-4 text-right">
                              <p className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>{formatCurrency(totals.total)}</p>
                              <p className="text-xs" style={{ color: '#6E7A82' }}>incl. GST</p>
                            </td>
                            <td className="px-3 py-4 text-center">
                              <button 
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 rounded hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Grand Total */}
            {lineItems.length > 0 && (
              <div className="bg-white p-6 rounded-lg" style={{ border: '2px solid #00A9B7' }}>
                <h3 className="text-base mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>PR Total Summary</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                    <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Total Items</p>
                    <p className="text-2xl" style={{ color: '#0A0F14', fontWeight: '600' }}>{lineItems.length}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                    <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Unique Vendors</p>
                    <p className="text-2xl" style={{ color: '#0A0F14', fontWeight: '600' }}>{uniqueVendors}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                    <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>Subtotal</p>
                    <p className="text-xl" style={{ color: '#0A0F14', fontWeight: '600' }}>{formatCurrency(grandTotal.subtotal)}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#E8F7F8' }}>
                    <p className="text-sm mb-2" style={{ color: '#00A9B7' }}>Grand Total</p>
                    <p className="text-2xl" style={{ color: '#00A9B7', fontWeight: '600' }}>{formatCurrency(grandTotal.total)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Alerts & Help */}
          <div className="space-y-6">
            {/* Price Variance Alerts */}
            {lineItems.some(item => item.priceVariance && Math.abs(item.priceVariance) > 10) && (
              <div className="bg-white p-6 rounded-lg" style={{ border: '2px solid #F57C00' }}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5" style={{ color: '#F57C00' }} />
                  <h3 className="text-base" style={{ color: '#F57C00', fontWeight: '600' }}>Price Variance Alert</h3>
                </div>
                <div className="space-y-2">
                  {lineItems
                    .filter(item => item.priceVariance && Math.abs(item.priceVariance) > 10)
                    .map(item => (
                      <div key={item.id} className="p-3 rounded-lg" style={{ backgroundColor: '#FFF3E0' }}>
                        <p className="text-sm mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>{item.itemName}</p>
                        <p className="text-xs" style={{ color: '#F57C00' }}>
                          Price {item.priceVariance! > 0 ? 'increase' : 'decrease'} of {Math.abs(item.priceVariance!).toFixed(1)}%
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>
                          Last: {formatCurrency(item.lastPurchasePrice || 0)} → Current: {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Procurement Guidelines */}
            <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5" style={{ color: '#2E7D32' }} />
                <h3 className="text-base" style={{ color: '#0A0F14', fontWeight: '600' }}>Procurement Guidelines</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#2E7D32' }} />
                  <span className="text-sm" style={{ color: '#6E7A82' }}>Get <strong>3 quotes</strong> for items over ₹50,000</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#2E7D32' }} />
                  <span className="text-sm" style={{ color: '#6E7A82' }}>Price variance <strong>&gt;10%</strong> needs CFO approval</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#2E7D32' }} />
                  <span className="text-sm" style={{ color: '#6E7A82' }}>Vendor must be <strong>approved</strong> in master</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#2E7D32' }} />
                  <span className="text-sm" style={{ color: '#6E7A82' }}>Items must be <strong>budgeted</strong> for current FY</span>
                </li>
              </ul>
            </div>

            {/* Multi-Vendor Impact */}
            {uniqueVendors > 1 && (
              <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
                <h3 className="text-base mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>Multi-Vendor Impact</h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFF3E0' }}>
                    <p className="text-sm" style={{ color: '#F57C00', fontWeight: '600' }}>⚠️ Multiple POs Required</p>
                    <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>
                      This PR will create {uniqueVendors} separate POs (one per vendor)
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#E3F2FD' }}>
                    <p className="text-sm" style={{ color: '#1976D2', fontWeight: '600' }}>💡 Consolidation Tip</p>
                    <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>
                      Consider consolidating items with same vendor to reduce logistics costs
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Budget Check */}
            {lineItems.length > 0 && (
              <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
                <h3 className="text-base mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>Budget Check</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#6E7A82' }}>Department Budget</span>
                    <span className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>₹15,00,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#6E7A82' }}>PR Amount</span>
                    <span className="text-sm" style={{ color: '#00A9B7', fontWeight: '600' }}>{formatCurrency(grandTotal.total)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #E1E6EA' }}>
                    <span className="text-sm" style={{ color: '#6E7A82' }}>Remaining Budget</span>
                    <span className="text-sm" style={{ color: '#2E7D32', fontWeight: '600' }}>
                      {formatCurrency(1500000 - grandTotal.total)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: '#2E7D32' }} />
                    <span className="text-sm" style={{ color: '#2E7D32' }}>Within Budget</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
