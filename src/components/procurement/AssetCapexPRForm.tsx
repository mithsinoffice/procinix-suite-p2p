import { useMemo, useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useProcurementData,
  type PurchaseRequestStatus,
} from '../../contexts/ProcurementDataContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ASSET/CAPEX PR FORM
 * For high-value capital assets requiring asset tagging and depreciation
 */

interface AssetItem {
  id: string;
  assetCode: string;
  assetName: string;
  assetCategory: string;
  quantity: number;
  unitPrice: number;
  vendor: string;
  location: string;
  usefulLife: number;
  depreciationMethod: string;
  budgetYear: string;
}

export function AssetCapexPRForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPurchaseRequest } = useProcurementData();
  const {
    vendors,
    entities,
    costCentres,
    currentCompany,
    locations,
    assetCategories: assetCategoryRecords,
    depreciationMethods: depreciationMethodRecords,
  } = useMasterData();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState(
    currentCompany?.name || entities[0]?.name || ''
  );

  // Indian fiscal year runs Apr–Mar. Compute current + next 2 FYs from today.
  const fyOptions = useMemo(() => {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return [0, 1, 2].map((offset) => {
      const s = startYear + offset;
      return `FY ${s}-${String((s + 1) % 100).padStart(2, '0')}`;
    });
  }, []);
  const [budgetYear, setBudgetYear] = useState(fyOptions[0]);
  const [businessJustification, setBusinessJustification] = useState('');

  const assetCategories = useMemo(
    () =>
      assetCategoryRecords && assetCategoryRecords.length > 0
        ? assetCategoryRecords.map((r) =>
            String(r.recordName ?? r.name ?? r.recordCode ?? r.code ?? '')
          )
        : [
            'Machinery & Equipment',
            'Vehicles',
            'IT Hardware',
            'Infrastructure',
            'Furniture & Fixtures',
          ],
    [assetCategoryRecords]
  );
  const depreciationMethods = useMemo(
    () =>
      depreciationMethodRecords && depreciationMethodRecords.length > 0
        ? depreciationMethodRecords.map((r) =>
            String(r.recordName ?? r.name ?? r.recordCode ?? r.code ?? '')
          )
        : ['Straight Line', 'Written Down Value', 'Double Declining Balance'],
    [depreciationMethodRecords]
  );
  const activeVendors = vendors
    .filter((vendor) => vendor.status === 'Active')
    .map((vendor) => vendor.name);
  // locations from location_master are already available via useMasterData()

  const handleAddAsset = () => {
    const newAsset: AssetItem = {
      id: `ASSET-${Date.now()}`,
      assetCode: '',
      assetName: '',
      assetCategory: assetCategories[0],
      quantity: 1,
      unitPrice: 0,
      vendor: activeVendors[0] || '',
      location: locations[0]?.name || '',
      usefulLife: 5,
      depreciationMethod: depreciationMethods[0],
      budgetYear: '2024-25',
    };
    setAssets([...assets, newAsset]);
  };

  const handleRemoveAsset = (id: string) => {
    setAssets(assets.filter((a) => a.id !== id));
  };

  const handleUpdateAsset = (id: string, field: string, value: any) => {
    setAssets(assets.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const totalValue = assets.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const submitPurchaseRequest = (status: PurchaseRequestStatus) => {
    const timestamp = Date.now();
    const createdDate = new Date().toISOString().split('T')[0];

    addPurchaseRequest({
      id: `asset-${timestamp}`,
      prNumber: `PR-${timestamp}`,
      type: 'Asset/CAPEX',
      entity: selectedEntity,
      requestor: user?.name || 'Current User',
      department: 'Operations',
      costCentre: costCentres.find((costCentre) => costCentre.isActive)?.code || '',
      needByDate: createdDate,
      deliveryLocation: assets[0]?.location || 'Mumbai Factory',
      totalAmount: totalValue,
      currency: 'INR',
      status,
      nextApprover: status === 'Draft' ? '—' : 'CFO',
      aiRiskLevel: totalValue > 5000000 ? 'High' : 'Medium',
      createdDate,
      submittedDate: status === 'Draft' ? undefined : createdDate,
      vendor: assets[0]?.vendor,
      itemCount: assets.length,
      justification: businessJustification || `CAPEX request for ${assets.length} asset item(s)`,
      policyFlags: ['Budget Review', 'Asset Tagging'],
      lineItems: assets.map((asset) => ({
        ...asset,
        budgetYear,
      })),
    });

    navigate('/procurement/pr/my-prs');
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/procurement/pr/create')}
            className="p-2 rounded-lg hover:bg-gray-100"
            style={{ color: 'var(--color-mercury-grey)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl mb-1" style={{ color: 'var(--color-ink)', margin: 0 }}>
              Asset/CAPEX Purchase Requisition
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              High-value capital assets requiring asset tagging and depreciation
            </p>
          </div>
          <div className="flex items-center gap-3">
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
              Submit for CFO Approval
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Header */}
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <h3
                className="text-base mb-4"
                style={{ color: 'var(--color-ink)', fontWeight: '600' }}
              >
                CAPEX Details
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
                    {entities
                      .filter((entity) => entity.isActive)
                      .map((entity) => (
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
                    Budget Year <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    value={budgetYear}
                    onChange={(e) => setBudgetYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {fyOptions.map((fy) => (
                      <option key={fy} value={fy}>
                        {fy}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Business Justification <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <textarea
                    value={businessJustification}
                    onChange={(e) => setBusinessJustification(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    rows={3}
                    placeholder="ROI analysis, production capacity increase, etc..."
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Assets */}
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  Capital Assets
                </h3>
                <button
                  onClick={handleAddAsset}
                  className="px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Asset
                </button>
              </div>

              {assets.length === 0 ? (
                <div
                  className="text-center py-12"
                  style={{ backgroundColor: 'var(--color-cloud)', borderRadius: '8px' }}
                >
                  <Building2
                    className="w-12 h-12 mx-auto mb-3"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  />
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    No assets added. Click "Add Asset" to start
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-4 rounded-lg"
                      style={{
                        backgroundColor: 'var(--color-cloud)',
                        border: '1px solid var(--color-silver)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4
                          className="text-sm"
                          style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                        >
                          Asset Entry
                        </h4>
                        <button
                          onClick={() => handleRemoveAsset(asset.id)}
                          className="p-1 rounded hover:bg-red-50"
                        >
                          <Trash2
                            className="w-4 h-4"
                            style={{ color: 'var(--color-error-dark)' }}
                          />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label
                            className="block text-xs mb-1"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Asset Name <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={asset.assetName}
                            onChange={(e) =>
                              handleUpdateAsset(asset.id, 'assetName', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-ink)',
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="block text-xs mb-1"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Category <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <select
                            value={asset.assetCategory}
                            onChange={(e) =>
                              handleUpdateAsset(asset.id, 'assetCategory', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-ink)',
                            }}
                          >
                            {assetCategories.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            className="block text-xs mb-1"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Vendor <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <select
                            value={asset.vendor}
                            onChange={(e) => handleUpdateAsset(asset.id, 'vendor', e.target.value)}
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-ink)',
                            }}
                          >
                            {activeVendors.map((vendorName) => (
                              <option key={vendorName} value={vendorName}>
                                {vendorName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            className="block text-xs mb-1"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={asset.quantity}
                            onChange={(e) =>
                              handleUpdateAsset(asset.id, 'quantity', parseInt(e.target.value) || 1)
                            }
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-ink)',
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="block text-xs mb-1"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Unit Price <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={asset.unitPrice}
                            onChange={(e) =>
                              handleUpdateAsset(
                                asset.id,
                                'unitPrice',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-ink)',
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="block text-xs mb-1"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Total
                          </label>
                          <input
                            type="text"
                            value={formatCurrency(asset.quantity * asset.unitPrice)}
                            disabled
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: 'var(--color-cloud)',
                              color: '#7B1FA2',
                              fontWeight: '600',
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="block text-xs mb-1"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Location <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <select
                            value={asset.location}
                            onChange={(e) =>
                              handleUpdateAsset(asset.id, 'location', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-ink)',
                            }}
                          >
                            {locations.map((l) => (
                              <option key={l.id} value={l.name}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            className="block text-xs mb-1"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Useful Life (years){' '}
                            <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={asset.usefulLife}
                            onChange={(e) =>
                              handleUpdateAsset(
                                asset.id,
                                'usefulLife',
                                parseInt(e.target.value) || 5
                              )
                            }
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-ink)',
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="block text-xs mb-1"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Depreciation Method{' '}
                            <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <select
                            value={asset.depreciationMethod}
                            onChange={(e) =>
                              handleUpdateAsset(asset.id, 'depreciationMethod', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-ink)',
                            }}
                          >
                            {depreciationMethods.map((m) => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            {assets.length > 0 && (
              <div className="bg-white p-6 rounded-lg" style={{ border: '2px solid #7B1FA2' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                      Total CAPEX Investment
                    </p>
                    <p className="text-3xl" style={{ color: '#7B1FA2', fontWeight: '600' }}>
                      {formatCurrency(totalValue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                      Total Assets
                    </p>
                    <p
                      className="text-2xl"
                      style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                    >
                      {assets.length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-warning-dark)' }} />
                <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  CAPEX Requirements
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    CFO approval <strong>mandatory</strong> for all CAPEX
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Budget allocation <strong>must exist</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Asset tagging after GRN
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Depreciation schedule auto-created
                  </span>
                </li>
              </ul>
            </div>

            {totalValue > 0 && (
              <div
                className="bg-white p-6 rounded-lg"
                style={{ border: '1px solid var(--color-silver)' }}
              >
                <h3
                  className="text-base mb-4"
                  style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                >
                  CAPEX Budget Check
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      {budgetYear} CAPEX Budget
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                    >
                      ₹5.00 Cr
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      PR Amount
                    </span>
                    <span className="text-sm" style={{ color: '#7B1FA2', fontWeight: '600' }}>
                      {formatCurrency(totalValue)}
                    </span>
                  </div>
                  <div
                    className="flex justify-between pt-3"
                    style={{ borderTop: '1px solid var(--color-silver)' }}
                  >
                    <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      Remaining
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: 'var(--color-success-dark)', fontWeight: '600' }}
                    >
                      {formatCurrency(50000000 - totalValue)}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2 p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--color-success-light)' }}
                  >
                    <CheckCircle
                      className="w-4 h-4"
                      style={{ color: 'var(--color-success-dark)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--color-success-dark)' }}>
                      Within Budget
                    </span>
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
