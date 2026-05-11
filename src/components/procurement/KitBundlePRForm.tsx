import { useState } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Building2,
  MapPin,
  ArrowLeft,
  X,
  DollarSign,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useProcurementData,
  type PurchaseRequestStatus,
} from '../../contexts/ProcurementDataContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { BudgetComingSoon } from './BudgetComingSoon';

/**
 * KIT/BUNDLE PR FORM
 * For products that comprise multiple SKUs (e.g., Laptop Kit = Laptop + Charger + Mouse + Bag)
 * All SKUs from same vendor, cannot be split
 */

interface BundleSKU {
  id: string;
  itemCode: string;
  itemName: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  gstRate: number;
  hsnCode: string;
  mandatory: boolean;
}

interface KitBundle {
  id: string;
  bundleCode: string;
  bundleName: string;
  vendor: string;
  vendorCode: string;
  skus: BundleSKU[];
  totalQuantity: number;
}

export function KitBundlePRForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPurchaseRequest } = useProcurementData();
  const { entities, departments, locations, kitBundles } = useMasterData();
  const activeEntities = entities.filter((entity) => entity.isActive);
  const activeDepartments = departments.filter((department) => department.isActive);
  const activeLocations = locations.filter((location) => location.isActive !== false);
  const [selectedEntity, setSelectedEntity] = useState<string>(activeEntities[0]?.name ?? '');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    user?.department || activeDepartments[0]?.name || ''
  );
  const [selectedLocation, setSelectedLocation] = useState<string>(activeLocations[0]?.name ?? '');
  const [bundles, setBundles] = useState<KitBundle[]>([]);
  const [showBundleSearch, setShowBundleSearch] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<KitBundle | null>(null);
  const [bundleQty, setBundleQty] = useState(1);

  // Live bundle catalogue from kit_bundle_master.
  const bundleCatalog: KitBundle[] = kitBundles
    .filter((kb) => String(kb.status ?? 'Active').toLowerCase() === 'active')
    .map((kb) => ({
      id: kb.id,
      bundleCode: kb.bundleCode || kb.code,
      bundleName: kb.bundleName || kb.name,
      vendor: kb.vendorName ?? '',
      vendorCode: kb.vendorCode ?? '',
      skus: (kb.items ?? []).map((item, idx) => ({
        id: item.id ?? `${kb.id}-sku-${idx + 1}`,
        itemCode: item.itemCode ?? '',
        itemName: item.itemName,
        description: item.description ?? '',
        quantity: Number(item.qty ?? 1),
        uom: item.uom ?? 'NOS',
        unitPrice: Number(item.unitPrice ?? 0),
        gstRate: Number(item.gstRate ?? 0),
        hsnCode: item.hsnCode ?? '',
        mandatory: item.mandatory !== false,
      })),
      totalQuantity: 1,
    }));

  const handleAddBundle = () => {
    if (!selectedBundle) return;

    const newBundle: KitBundle = {
      ...selectedBundle,
      id: `BUNDLE-${Date.now()}`,
      totalQuantity: bundleQty,
      skus: selectedBundle.skus.map((sku) => ({
        ...sku,
        quantity: sku.quantity * bundleQty,
      })),
    };

    setBundles([...bundles, newBundle]);
    setSelectedBundle(null);
    setBundleQty(1);
    setShowBundleSearch(false);
  };

  const handleRemoveBundle = (bundleId: string) => {
    setBundles(bundles.filter((b) => b.id !== bundleId));
  };

  const calculateBundleTotal = (bundle: KitBundle) => {
    const subtotal = bundle.skus.reduce((sum, sku) => {
      return sum + sku.unitPrice * sku.quantity;
    }, 0);
    const gst = bundle.skus.reduce((sum, sku) => {
      return sum + (sku.unitPrice * sku.quantity * sku.gstRate) / 100;
    }, 0);
    return { subtotal, gst, total: subtotal + gst };
  };

  const calculateGrandTotal = () => {
    let subtotal = 0;
    let gst = 0;
    bundles.forEach((bundle) => {
      const totals = calculateBundleTotal(bundle);
      subtotal += totals.subtotal;
      gst += totals.gst;
    });
    return { subtotal, gst, total: subtotal + gst };
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const grandTotal = calculateGrandTotal();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitPurchaseRequest = async (status: PurchaseRequestStatus) => {
    const timestamp = Date.now();
    const createdDate = new Date().toISOString().split('T')[0];
    const entityRecord =
      entities.find((e) => e.id === activeEntities[0]?.id || e.name === selectedEntity) ??
      entities[0];

    setSubmitError(null);
    const result = await addPurchaseRequest({
      id: `bundle-${timestamp}`,
      prNumber: `PR-${timestamp}`,
      type: 'Kit/Bundle',
      entity: selectedEntity || entityRecord?.name || 'India HQ',
      entityId: activeEntities[0]?.id ?? entityRecord?.id ?? '',
      entityCode: entityRecord?.code ?? '',
      entityGstin: entityRecord?.gstin ?? '',
      requestor: user?.name || 'Current User',
      requesterId: user?.id ?? '',
      department: selectedDepartment || 'IT',
      costCentre: 'CC-IT-001',
      needByDate: createdDate,
      deliveryLocation: selectedLocation || 'Mumbai Office',
      totalAmount: grandTotal.total,
      currency: 'INR',
      status,
      nextApprover: status === 'Draft' ? '—' : 'Department Head',
      aiRiskLevel: 'Low',
      createdDate,
      submittedDate: status === 'Draft' ? undefined : createdDate,
      vendor: bundles[0]?.vendor,
      itemCount: bundles.reduce((sum, bundle) => sum + bundle.skus.length, 0),
      justification: `Bundle PR with ${bundles.length} kit(s)`,
      policyFlags: [],
      lineItems: bundles as unknown as Array<Record<string, unknown>>,
    });

    if (result.success) {
      navigate('/procurement/pr/listing');
    } else {
      const msg = result.details?.length
        ? result.details.join(' · ')
        : (result.error ?? 'Failed to save PR. Please try again.');
      setSubmitError(msg);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/procurement/pr/create')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--color-mercury-grey)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl mb-1" style={{ color: 'var(--color-ink)', margin: 0 }}>
              Kit/Bundle Purchase Requisition
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Create PR for products with multiple SKUs (e.g., Laptop Kit with accessories)
            </p>
          </div>
          <div className="flex items-center gap-3">
            {submitError && (
              <span role="alert" style={{ color: '#C62828', fontSize: 12, fontWeight: 500 }}>
                {submitError}
              </span>
            )}
            <button
              className="px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-cloud)',
                border: '1px solid var(--color-silver)',
                color: 'var(--color-mercury-grey)',
              }}
              onClick={() => submitPurchaseRequest('Draft')}
            >
              Save as Draft
            </button>
            <button
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: 'var(--color-teal)' }}
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
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <h3
                className="text-base mb-4"
                style={{ color: 'var(--color-ink)', fontWeight: '600' }}
              >
                PR Header Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Entity <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {activeEntities.map((entity) => (
                      <option key={entity.id} value={entity.name}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Department <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {activeDepartments.map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Delivery Location <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {activeLocations.map((location) => (
                      <option key={location.id} value={location.name}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Need-by Date <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Business Justification <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    rows={2}
                    placeholder="Why are these kit/bundles needed?"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Bundle Selection */}
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  Kit/Bundle Items
                </h3>
                <button
                  onClick={() => setShowBundleSearch(true)}
                  className="px-4 py-2 rounded-lg text-white flex items-center gap-2"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                >
                  <Plus className="w-4 h-4" />
                  Add Kit/Bundle
                </button>
              </div>

              {bundles.length === 0 ? (
                <div
                  className="text-center py-12"
                  style={{ backgroundColor: 'var(--color-cloud)', borderRadius: '8px' }}
                >
                  <Package
                    className="w-12 h-12 mx-auto mb-3"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  />
                  <p className="text-sm mb-1" style={{ color: 'var(--color-ink)' }}>
                    No kit/bundles added yet
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Click "Add Kit/Bundle" to select from catalog
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bundles.map((bundle) => {
                    const totals = calculateBundleTotal(bundle);
                    return (
                      <div
                        key={bundle.id}
                        className="p-4 rounded-lg"
                        style={{
                          backgroundColor: 'var(--color-cloud)',
                          border: '1px solid var(--color-silver)',
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Package className="w-5 h-5" style={{ color: '#1976D2' }} />
                              <h4
                                className="text-base"
                                style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                              >
                                {bundle.bundleName}
                              </h4>
                              <span
                                className="px-2 py-0.5 rounded text-xs"
                                style={{ backgroundColor: '#E3F2FD', color: '#1976D2' }}
                              >
                                {bundle.bundleCode}
                              </span>
                            </div>
                            <p
                              className="text-sm mb-1"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              <strong>Vendor:</strong> {bundle.vendor} ({bundle.vendorCode})
                            </p>
                            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                              <strong>Quantity:</strong> {bundle.totalQuantity}{' '}
                              {bundle.totalQuantity > 1 ? 'kits' : 'kit'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveBundle(bundle.id)}
                            className="p-1 rounded hover:bg-red-50"
                          >
                            <Trash2
                              className="w-4 h-4"
                              style={{ color: 'var(--color-error-dark)' }}
                            />
                          </button>
                        </div>

                        {/* SKU Table */}
                        <div
                          className="bg-white rounded-lg overflow-hidden"
                          style={{ border: '1px solid var(--color-silver)' }}
                        >
                          <table className="w-full">
                            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                              <tr>
                                <th
                                  className="px-3 py-2 text-left text-xs"
                                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                                >
                                  Item Code
                                </th>
                                <th
                                  className="px-3 py-2 text-left text-xs"
                                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                                >
                                  Description
                                </th>
                                <th
                                  className="px-3 py-2 text-center text-xs"
                                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                                >
                                  Qty
                                </th>
                                <th
                                  className="px-3 py-2 text-center text-xs"
                                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                                >
                                  UOM
                                </th>
                                <th
                                  className="px-3 py-2 text-right text-xs"
                                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                                >
                                  Unit Price
                                </th>
                                <th
                                  className="px-3 py-2 text-center text-xs"
                                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                                >
                                  GST
                                </th>
                                <th
                                  className="px-3 py-2 text-right text-xs"
                                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                                >
                                  Total
                                </th>
                                <th
                                  className="px-3 py-2 text-center text-xs"
                                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                                >
                                  Type
                                </th>
                              </tr>
                            </thead>
                            <tbody
                              className="divide-y"
                              style={{ borderColor: 'var(--color-silver)' }}
                            >
                              {bundle.skus.map((sku) => (
                                <tr key={sku.id}>
                                  <td
                                    className="px-3 py-2 text-xs"
                                    style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                                  >
                                    {sku.itemCode}
                                  </td>
                                  <td
                                    className="px-3 py-2 text-xs"
                                    style={{ color: 'var(--color-mercury-grey)' }}
                                  >
                                    <div>{sku.itemName}</div>
                                    <div
                                      className="text-xs"
                                      style={{ color: 'var(--color-mercury-grey)' }}
                                    >
                                      {sku.description}
                                    </div>
                                  </td>
                                  <td
                                    className="px-3 py-2 text-xs text-center"
                                    style={{ color: 'var(--color-ink)' }}
                                  >
                                    {sku.quantity}
                                  </td>
                                  <td
                                    className="px-3 py-2 text-xs text-center"
                                    style={{ color: 'var(--color-mercury-grey)' }}
                                  >
                                    {sku.uom}
                                  </td>
                                  <td
                                    className="px-3 py-2 text-xs text-right"
                                    style={{ color: 'var(--color-ink)' }}
                                  >
                                    {formatCurrency(sku.unitPrice)}
                                  </td>
                                  <td
                                    className="px-3 py-2 text-xs text-center"
                                    style={{ color: 'var(--color-mercury-grey)' }}
                                  >
                                    {sku.gstRate}%
                                  </td>
                                  <td
                                    className="px-3 py-2 text-xs text-right"
                                    style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                                  >
                                    {formatCurrency(sku.unitPrice * sku.quantity)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs`}
                                      style={
                                        sku.mandatory
                                          ? {
                                              backgroundColor: 'var(--color-error-light)',
                                              color: 'var(--color-error-dark)',
                                            }
                                          : {
                                              backgroundColor: 'var(--color-success-light)',
                                              color: 'var(--color-success-dark)',
                                            }
                                      }
                                    >
                                      {sku.mandatory ? 'Mandatory' : 'Optional'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Bundle Totals */}
                        <div
                          className="mt-3 pt-3 flex justify-end gap-8"
                          style={{ borderTop: '1px solid var(--color-silver)' }}
                        >
                          <div className="text-right">
                            <p
                              className="text-xs mb-1"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              Subtotal
                            </p>
                            <p
                              className="text-sm"
                              style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                            >
                              {formatCurrency(totals.subtotal)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-xs mb-1"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              GST
                            </p>
                            <p
                              className="text-sm"
                              style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                            >
                              {formatCurrency(totals.gst)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-xs mb-1"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              Total
                            </p>
                            <p
                              className="text-base"
                              style={{ color: 'var(--color-teal)', fontWeight: '600' }}
                            >
                              {formatCurrency(totals.total)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Grand Total */}
            {bundles.length > 0 && (
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
                <div className="grid grid-cols-3 gap-4">
                  <div
                    className="text-center p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--color-cloud)' }}
                  >
                    <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Total Kits/Bundles
                    </p>
                    <p
                      className="text-2xl"
                      style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                    >
                      {bundles.length}
                    </p>
                  </div>
                  <div
                    className="text-center p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--color-cloud)' }}
                  >
                    <p className="text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                      Total SKUs
                    </p>
                    <p
                      className="text-2xl"
                      style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                    >
                      {bundles.reduce(
                        (sum, b) => sum + b.skus.reduce((s, sku) => s + sku.quantity, 0),
                        0
                      )}
                    </p>
                  </div>
                  <div
                    className="text-center p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--color-teal-tint)' }}
                  >
                    <p className="text-sm mb-2" style={{ color: 'var(--color-teal)' }}>
                      Grand Total (incl. GST)
                    </p>
                    <p
                      className="text-2xl"
                      style={{ color: 'var(--color-teal)', fontWeight: '600' }}
                    >
                      {formatCurrency(grandTotal.total)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Policy & Help */}
          <div className="space-y-6">
            {/* Kit/Bundle Constraints */}
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-warning-dark)' }} />
                <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  Kit/Bundle Rules
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    All SKUs in a bundle must be from the <strong>same vendor</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    <strong>Cannot split</strong> bundle items across vendors or POs
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Mandatory SKUs <strong>must be included</strong> in the bundle
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Optional SKUs can be removed from bundle if not needed
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Bundle pricing is <strong>pre-negotiated</strong> with vendor
                  </span>
                </li>
              </ul>
            </div>

            {/* Help Guide */}
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <h3
                className="text-base mb-4"
                style={{ color: 'var(--color-ink)', fontWeight: '600' }}
              >
                💡 When to Use Kit/Bundle PR?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#E3F2FD' }}>
                  <p className="text-sm mb-1" style={{ color: '#1976D2', fontWeight: '600' }}>
                    Employee Onboarding
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    Laptop + Mouse + Headset + Webcam as one kit
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--color-success-light)' }}
                >
                  <p
                    className="text-sm mb-1"
                    style={{ color: 'var(--color-success-dark)', fontWeight: '600' }}
                  >
                    Desktop Setup
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    CPU + Monitor + Keyboard + Mouse + Speakers
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--color-warning-light)' }}
                >
                  <p
                    className="text-sm mb-1"
                    style={{ color: 'var(--color-warning-dark)', fontWeight: '600' }}
                  >
                    Conference Room
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    Projector + Screen + AV System + Cables
                  </p>
                </div>
              </div>
            </div>

            <BudgetComingSoon />
          </div>
        </div>
      </div>

      {/* Bundle Search Modal */}
      {showBundleSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-4/5 max-h-[90vh] overflow-hidden">
            <div
              className="flex items-center justify-between p-6"
              style={{ borderBottom: '1px solid var(--color-silver)' }}
            >
              <h2 className="text-xl" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                Select Kit/Bundle from Catalog
              </h2>
              <button
                onClick={() => setShowBundleSearch(false)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="mb-4">
                <div className="relative">
                  <Search
                    className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search bundles by name, code, or vendor..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {bundleCatalog.map((bundle) => (
                  <div
                    key={bundle.id}
                    className={`p-4 rounded-lg cursor-pointer transition-all`}
                    style={{
                      border:
                        selectedBundle?.id === bundle.id
                          ? '2px solid #1976D2'
                          : '1px solid var(--color-silver)',
                      backgroundColor: selectedBundle?.id === bundle.id ? '#E3F2FD' : '#FFFFFF',
                    }}
                    onClick={() => setSelectedBundle(bundle)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4
                          className="text-base mb-1"
                          style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                        >
                          {bundle.bundleName}
                        </h4>
                        <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                          Code: {bundle.bundleCode}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                          Vendor: {bundle.vendor}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                          {bundle.skus.length} SKUs
                        </p>
                        <p className="text-base" style={{ color: '#1976D2', fontWeight: '600' }}>
                          {formatCurrency(
                            bundle.skus.reduce((sum, sku) => sum + sku.unitPrice * sku.quantity, 0)
                          )}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          per kit (excl. GST)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {bundle.skus.map((sku) => (
                        <div
                          key={sku.id}
                          className="text-xs p-2 rounded"
                          style={{ backgroundColor: 'var(--color-cloud)' }}
                        >
                          <span style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                            {sku.itemName}
                          </span>
                          <span
                            className={`ml-2 px-1.5 py-0.5 rounded text-xs`}
                            style={
                              sku.mandatory
                                ? {
                                    backgroundColor: 'var(--color-error-light)',
                                    color: 'var(--color-error-dark)',
                                  }
                                : {
                                    backgroundColor: 'var(--color-success-light)',
                                    color: 'var(--color-success-dark)',
                                  }
                            }
                          >
                            {sku.mandatory ? 'M' : 'O'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="flex items-center justify-between p-6"
              style={{ borderTop: '1px solid var(--color-silver)' }}
            >
              <div className="flex items-center gap-4">
                <label className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Quantity:
                </label>
                <input
                  type="number"
                  min="1"
                  value={bundleQty}
                  onChange={(e) => setBundleQty(parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid var(--color-silver)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--color-ink)',
                  }}
                />
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  kit(s)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBundleSearch(false)}
                  className="px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                    color: 'var(--color-mercury-grey)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBundle}
                  disabled={!selectedBundle}
                  className="px-4 py-2 rounded-lg text-white"
                  style={{
                    backgroundColor: selectedBundle ? '#1976D2' : 'var(--color-silver)',
                    cursor: selectedBundle ? 'pointer' : 'not-allowed',
                  }}
                >
                  Add to PR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
