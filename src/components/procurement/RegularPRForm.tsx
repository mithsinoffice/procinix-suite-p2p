import { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  X,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useProcurementData,
  type PurchaseRequestStatus,
} from '../../contexts/ProcurementDataContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { FormShell, FormSection, PxFormField, type SaveStatus } from '../ui/form-primitives';
import { useFormKeyboardSave } from '../../hooks/useFormKeyboardSave';

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
    liveVendors: contextLiveVendors,
    costCentres,
    accountCodes,
    currentCompany,
    locations,
  } = useMasterData();
  const [lineItems, setLineItems] = useState<PRLineItem[]>([]);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(
    currentCompany?.name || entities[0]?.name || 'India HQ'
  );
  const [selectedDepartment, setSelectedDepartment] = useState(departments[0]?.name || 'IT');
  const [deliveryLocation, setDeliveryLocation] = useState(locations[0]?.name || '');
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

  const availableVendors = contextLiveVendors
    .filter((vendor) => vendor.status === 'active' && vendor.vendorType !== 'entity')
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
      priceVariance: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: string, value: any) => {
    setLineItems((prev) =>
      prev.map((item) => {
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
      })
    );
  };

  const handleUpdateItemBatch = (id: string, updates: Partial<PRLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      })
    );
  };

  const calculateLineTotal = (item: PRLineItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const gst = subtotal * (item.gstRate / 100);
    return { subtotal, gst, total: subtotal + gst };
  };

  const calculateGrandTotal = () => {
    let subtotal = 0;
    let gst = 0;
    lineItems.forEach((item) => {
      const totals = calculateLineTotal(item);
      subtotal += totals.subtotal;
      gst += totals.gst;
    });
    return { subtotal, gst, total: subtotal + gst };
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const grandTotal = calculateGrandTotal();

  // Count unique vendors
  const uniqueVendors = new Set(lineItems.filter((item) => item.vendor).map((item) => item.vendor))
    .size;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const completeness = useMemo(() => {
    const fields = [
      selectedEntity,
      selectedDepartment,
      deliveryLocation,
      needByDate,
      businessJustification,
    ];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [selectedEntity, selectedDepartment, deliveryLocation, needByDate, businessJustification]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    submitPurchaseRequest('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, []);

  useFormKeyboardSave(handleSaveDraft);

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
        lineTotal: calculateLineTotal(item).total,
      })),
    });

    navigate('/procurement/pr/my-prs');
  };

  return (
    <FormShell
      variant="transaction"
      title="Regular Purchase Requisition"
      subtitle="Multi-item, multi-vendor procurement with price variance tracking"
      onBack={() => navigate('/procurement/pr/create')}
      onSaveDraft={handleSaveDraft}
      onSubmit={() => submitPurchaseRequest('Pending Approval')}
      submitLabel="Submit for Approval"
      draftLabel="Save as Draft"
      saveStatus={saveStatus}
      completeness={completeness}
    >
      <div className="grid grid-cols-3 gap-6">
        {/* Main Form - Left 2 Columns */}
        <div className="col-span-2 space-y-6">
          {/* Header Section */}
          <FormSection title="PR Header Information" columns={2}>
            <PxFormField label="Entity" required>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="px-select"
              >
                {entities
                  .filter((entity) => entity.isActive)
                  .map((entity) => (
                    <option key={entity.id} value={entity.name}>
                      {entity.name}
                    </option>
                  ))}
              </select>
            </PxFormField>
            <PxFormField label="Department" required>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-select"
              >
                {departments
                  .filter((department) => department.isActive)
                  .map((department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
              </select>
            </PxFormField>
            <PxFormField label="Delivery Location" required>
              <select
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                className="px-select"
              >
                {locations
                  .filter((location) => location.isActive !== false)
                  .map((location) => (
                    <option key={location.id} value={location.name}>
                      {location.name}
                    </option>
                  ))}
              </select>
            </PxFormField>
            <PxFormField label="Need-by Date" required>
              <input
                type="date"
                value={needByDate}
                onChange={(e) => setNeedByDate(e.target.value)}
                className="px-input"
              />
            </PxFormField>
            <PxFormField label="Business Justification" required colSpan={2}>
              <textarea
                value={businessJustification}
                onChange={(e) => setBusinessJustification(e.target.value)}
                className="px-input"
                rows={2}
                placeholder="Explain why these items are needed..."
                style={{ height: 'auto' }}
              ></textarea>
            </PxFormField>
          </FormSection>

          {/* Line Items */}
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                Line Items
              </h3>
              <button
                onClick={handleAddItem}
                className="px-4 py-2 rounded-lg text-white flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-teal)' }}
              >
                <Plus className="w-4 h-4" />
                Add Line Item
              </button>
            </div>

            {lineItems.length === 0 ? (
              <div
                className="text-center py-12"
                style={{ backgroundColor: 'var(--color-cloud)', borderRadius: '8px' }}
              >
                <FileText
                  className="w-12 h-12 mx-auto mb-3"
                  style={{ color: 'var(--color-mercury-grey)' }}
                />
                <p className="text-sm mb-1" style={{ color: 'var(--color-ink)' }}>
                  No items added yet
                </p>
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Click "Add Line Item" to start building your PR
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                    <tr>
                      <th
                        className="px-3 py-3 text-left text-xs"
                        style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                      >
                        Item Details
                      </th>
                      <th
                        className="px-3 py-3 text-left text-xs"
                        style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                      >
                        Vendor
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs"
                        style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                      >
                        Qty
                      </th>
                      <th
                        className="px-3 py-3 text-right text-xs"
                        style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                      >
                        Unit Price
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs"
                        style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                      >
                        Price Variance
                      </th>
                      <th
                        className="px-3 py-3 text-right text-xs"
                        style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                      >
                        Total
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs"
                        style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-silver)' }}>
                    {lineItems.map((item, index) => {
                      const totals = calculateLineTotal(item);
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-4">
                            <select
                              className="px-select-compact mb-2"
                              value={item.itemCode}
                              onChange={(e) => {
                                const selectedItem = itemsCatalog.find(
                                  (i) => i.itemCode === e.target.value
                                );
                                if (selectedItem) {
                                  handleUpdateItemBatch(item.id, {
                                    itemCode: selectedItem.itemCode,
                                    itemName: selectedItem.itemName,
                                    description: selectedItem.description,
                                    uom: selectedItem.uom,
                                    gstRate: selectedItem.gstRate,
                                    hsnCode: selectedItem.hsnCode,
                                    lastPurchasePrice: selectedItem.lastPrice,
                                  });
                                }
                              }}
                            >
                              <option value="">Select Item</option>
                              {itemsCatalog.map((i) => (
                                <option key={i.itemCode} value={i.itemCode}>
                                  {i.itemCode} - {i.itemName}
                                </option>
                              ))}
                            </select>
                            {item.itemName && (
                              <div>
                                <p
                                  className="text-xs"
                                  style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                                >
                                  {item.itemName}
                                </p>
                                <p
                                  className="text-xs"
                                  style={{ color: 'var(--color-mercury-grey)' }}
                                >
                                  {item.description}
                                </p>
                                <p
                                  className="text-xs mt-1"
                                  style={{ color: 'var(--color-mercury-grey)' }}
                                >
                                  HSN: {item.hsnCode} | GST: {item.gstRate}%
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-4">
                            <select
                              className="px-select-compact"
                              value={item.vendorCode}
                              onChange={(e) => {
                                const selectedVendor = availableVendors.find(
                                  (v) => v.vendorCode === e.target.value
                                );
                                if (selectedVendor) {
                                  handleUpdateItemBatch(item.id, {
                                    vendorCode: selectedVendor.vendorCode,
                                    vendor: selectedVendor.vendorName,
                                  });
                                }
                              }}
                            >
                              <option value="">Select Vendor</option>
                              {availableVendors.map((v) => (
                                <option key={v.vendorCode} value={v.vendorCode}>
                                  {v.vendorName}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-4">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                              }
                              className="px-input-compact w-20 text-center"
                            />
                            <p
                              className="text-xs text-center mt-1"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              {item.uom}
                            </p>
                          </td>
                          <td className="px-3 py-4">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.id,
                                  'unitPrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="px-input-compact w-28 text-right"
                            />
                            {item.lastPurchasePrice && item.lastPurchasePrice > 0 && (
                              <p
                                className="text-xs text-right mt-1"
                                style={{ color: 'var(--color-mercury-grey)' }}
                              >
                                Last: {formatCurrency(item.lastPurchasePrice)}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-4 text-center">
                            {item.priceVariance !== undefined && item.priceVariance !== 0 ? (
                              <div className="flex items-center justify-center gap-1">
                                {item.priceVariance > 0 ? (
                                  <TrendingUp
                                    className="w-4 h-4"
                                    style={{ color: 'var(--color-error-dark)' }}
                                  />
                                ) : (
                                  <TrendingDown
                                    className="w-4 h-4"
                                    style={{ color: 'var(--color-success-dark)' }}
                                  />
                                )}
                                <span
                                  className="text-xs"
                                  style={{
                                    color:
                                      item.priceVariance > 0
                                        ? 'var(--color-error-dark)'
                                        : 'var(--color-success-dark)',
                                    fontWeight: '600',
                                  }}
                                >
                                  {item.priceVariance > 0 ? '+' : ''}
                                  {item.priceVariance.toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: 'var(--color-mercury-grey)' }}
                              >
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-4 text-right">
                            <p
                              className="text-sm"
                              style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                            >
                              {formatCurrency(totals.total)}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                              incl. GST
                            </p>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 rounded hover:bg-red-50"
                            >
                              <Trash2
                                className="w-4 h-4"
                                style={{ color: 'var(--color-error-dark)' }}
                              />
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
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '2px solid var(--color-teal)' }}
            >
              <h3
                className="text-base mb-4"
                style={{ color: 'var(--color-ink)', fontWeight: '600' }}
              >
                PR Total Summary
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-cloud)' }}
                >
                  <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Total Items
                  </p>
                  <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                    {lineItems.length}
                  </p>
                </div>
                <div
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-cloud)' }}
                >
                  <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Unique Vendors
                  </p>
                  <p className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                    {uniqueVendors}
                  </p>
                </div>
                <div
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-cloud)' }}
                >
                  <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Subtotal
                  </p>
                  <p className="text-xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                    {formatCurrency(grandTotal.subtotal)}
                  </p>
                </div>
                <div
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-teal-tint)' }}
                >
                  <p className="text-sm mb-2" style={{ color: 'var(--color-teal)' }}>
                    Grand Total
                  </p>
                  <p className="text-2xl" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>
                    {formatCurrency(grandTotal.total)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Alerts & Help */}
        <div className="space-y-6">
          {/* Price Variance Alerts */}
          {lineItems.some((item) => item.priceVariance && Math.abs(item.priceVariance) > 10) && (
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '2px solid var(--color-warning-dark)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-warning-dark)' }} />
                <h3
                  className="text-base"
                  style={{ color: 'var(--color-warning-dark)', fontWeight: '600' }}
                >
                  Price Variance Alert
                </h3>
              </div>
              <div className="space-y-2">
                {lineItems
                  .filter((item) => item.priceVariance && Math.abs(item.priceVariance) > 10)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--color-warning-light)' }}
                    >
                      <p
                        className="text-sm mb-1"
                        style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                      >
                        {item.itemName}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-warning-dark)' }}>
                        Price {item.priceVariance! > 0 ? 'increase' : 'decrease'} of{' '}
                        {Math.abs(item.priceVariance!).toFixed(1)}%
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        Last: {formatCurrency(item.lastPurchasePrice || 0)} → Current:{' '}
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Procurement Guidelines */}
          <div
            className="bg-white p-6 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success-dark)' }} />
              <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                Procurement Guidelines
              </h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--color-success-dark)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Get <strong>3 quotes</strong> for items over ₹50,000
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--color-success-dark)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Price variance <strong>&gt;10%</strong> needs CFO approval
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--color-success-dark)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Vendor must be <strong>approved</strong> in master
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--color-success-dark)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Items must be <strong>budgeted</strong> for current FY
                </span>
              </li>
            </ul>
          </div>

          {/* Multi-Vendor Impact */}
          {uniqueVendors > 1 && (
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <h3
                className="text-base mb-4"
                style={{ color: 'var(--color-ink)', fontWeight: '600' }}
              >
                Multi-Vendor Impact
              </h3>
              <div className="space-y-3">
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--color-warning-light)' }}
                >
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-warning-dark)', fontWeight: '600' }}
                  >
                    ⚠️ Multiple POs Required
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                    This PR will create {uniqueVendors} separate POs (one per vendor)
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#E3F2FD' }}>
                  <p className="text-sm" style={{ color: '#1976D2', fontWeight: '600' }}>
                    💡 Consolidation Tip
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                    Consider consolidating items with same vendor to reduce logistics costs
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Budget Check */}
          {lineItems.length > 0 && (
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <h3
                className="text-base mb-4"
                style={{ color: 'var(--color-ink)', fontWeight: '600' }}
              >
                Budget Check
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Department Budget
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                  >
                    ₹15,00,000
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    PR Amount
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-teal)', fontWeight: '600' }}
                  >
                    {formatCurrency(grandTotal.total)}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: '1px solid var(--color-silver)' }}
                >
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Remaining Budget
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-success-dark)', fontWeight: '600' }}
                  >
                    {formatCurrency(1500000 - grandTotal.total)}
                  </span>
                </div>
                <div
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--color-success-light)' }}
                >
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-success-dark)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-success-dark)' }}>
                    Within Budget
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </FormShell>
  );
}
