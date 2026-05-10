import { useState } from 'react';
import {
  RefreshCw,
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
 * BLANKET PR FORM
 * For recurring orders with planned release schedule over a period
 */

interface ReleaseSchedule {
  id: string;
  releaseDate: string;
  quantity: number;
  deliveryLocation: string;
  notes: string;
}

export function BlanketPRForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPurchaseRequest } = useProcurementData();
  const { items: itemMasters, liveVendors, entities, currentCompany, locations } = useMasterData();
  const [item, setItem] = useState({
    itemCode: '',
    itemName: '',
    vendor: '',
    unitPrice: 0,
    uom: 'Unit',
  });
  const [totalQty, setTotalQty] = useState(0);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [releases, setReleases] = useState<ReleaseSchedule[]>([]);
  const [selectedEntity, setSelectedEntity] = useState(
    currentCompany?.name || entities[0]?.name || ''
  );

  const activeItems = itemMasters.filter((masterItem) => masterItem.status === 'Active');
  const activeVendors = liveVendors
    .filter((vendor) => vendor.status === 'active' && vendor.vendorType !== 'entity')
    .map((vendor) => vendor.name);
  // locations from location_master are already available via useMasterData()

  const handleAddRelease = () => {
    const newRelease: ReleaseSchedule = {
      id: `REL-${Date.now()}`,
      releaseDate: '',
      quantity: 0,
      deliveryLocation: locations[0]?.name || '',
      notes: '',
    };
    setReleases([...releases, newRelease]);
  };

  const handleRemoveRelease = (id: string) => {
    setReleases(releases.filter((r) => r.id !== id));
  };

  const handleUpdateRelease = (id: string, field: string, value: any) => {
    setReleases(releases.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const scheduledQty = releases.reduce((sum, r) => sum + r.quantity, 0);
  const totalValue = totalQty * item.unitPrice;
  const scheduledValue = scheduledQty * item.unitPrice;

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const submitPurchaseRequest = (status: PurchaseRequestStatus) => {
    const timestamp = Date.now();
    const createdDate = new Date().toISOString().split('T')[0];
    const entityRecord =
      entities.find((e) => e.id === currentCompany?.id || e.name === selectedEntity) || entities[0];

    addPurchaseRequest({
      id: `blanket-${timestamp}`,
      prNumber: `PR-${timestamp}`,
      type: 'Blanket',
      entity: selectedEntity,
      entityId: entityRecord?.id || currentCompany?.id || '',
      entityCode: entityRecord?.code || currentCompany?.code || '',
      entityGstin: entityRecord?.gstin || '',
      requestor: user?.name || 'Current User',
      requesterId: user?.id || '',
      department: user?.department || 'Operations',
      costCentre: item.itemCode || '',
      needByDate: validTo || createdDate,
      deliveryLocation: releases[0]?.deliveryLocation || locations[0]?.name || '',
      totalAmount: totalValue,
      currency: 'INR',
      status,
      nextApprover: status === 'Draft' ? '—' : 'Procurement Head',
      aiRiskLevel: scheduledQty === totalQty ? 'Low' : 'Medium',
      createdDate,
      submittedDate: status === 'Draft' ? undefined : createdDate,
      vendor: item.vendor,
      itemCount: releases.length || 1,
      justification: `Blanket PR for ${item.itemName || 'scheduled procurement'}`,
      policyFlags: scheduledQty === totalQty ? [] : ['Release Schedule Mismatch'],
      lineItems: releases as unknown as Array<Record<string, unknown>>,
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
              Blanket Purchase Requisition
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Recurring orders with planned release schedule over a period
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
              Submit for Approval
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
                Blanket Order Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Item <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                    onChange={(e) => {
                      const selected = activeItems.find((i) => i.code === e.target.value);
                      if (selected)
                        setItem({
                          ...item,
                          itemCode: selected.code,
                          itemName: selected.name,
                          uom: selected.uom,
                          unitPrice: selected.standardPrice || item.unitPrice,
                        });
                    }}
                  >
                    <option value="">Select Item</option>
                    {activeItems.map((i) => (
                      <option key={i.code} value={i.code}>
                        {i.code} - {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Vendor <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                    onChange={(e) => setItem({ ...item, vendor: e.target.value })}
                  >
                    <option value="">Select Vendor</option>
                    {activeVendors.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Total Quantity <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={totalQty}
                      onChange={(e) => setTotalQty(parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm"
                      style={{
                        border: '1px solid var(--color-silver)',
                        backgroundColor: '#FFFFFF',
                        color: 'var(--color-ink)',
                      }}
                    />
                    <input
                      type="text"
                      value={item.uom}
                      disabled
                      className="w-20 px-3 py-2 rounded-lg text-sm text-center"
                      style={{
                        border: '1px solid var(--color-silver)',
                        backgroundColor: 'var(--color-cloud)',
                        color: 'var(--color-mercury-grey)',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Unit Price <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      setItem({ ...item, unitPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Valid From <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Valid To <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#FFEBEE', border: '1px solid #C62828' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm mb-1" style={{ color: '#C62828', fontWeight: '600' }}>
                          Total Blanket Order Value
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          {totalQty} {item.uom} × {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="text-2xl" style={{ color: '#C62828', fontWeight: '600' }}>
                        {formatCurrency(totalValue)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Release Schedule */}
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3
                    className="text-base mb-1"
                    style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                  >
                    Release Schedule
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Define when and how much to deliver
                  </p>
                </div>
                <button
                  onClick={handleAddRelease}
                  className="px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Release
                </button>
              </div>

              {releases.length === 0 ? (
                <div
                  className="text-center py-12"
                  style={{ backgroundColor: 'var(--color-cloud)', borderRadius: '8px' }}
                >
                  <Calendar
                    className="w-12 h-12 mx-auto mb-3"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  />
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    No release schedule defined
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {releases.map((release, index) => (
                    <div
                      key={release.id}
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
                          Release {index + 1}
                        </h4>
                        <button
                          onClick={() => handleRemoveRelease(release.id)}
                          className="p-1 rounded hover:bg-red-50"
                        >
                          <Trash2
                            className="w-4 h-4"
                            style={{ color: 'var(--color-error-dark)' }}
                          />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label
                            className="block text-xs mb-1"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Release Date <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="date"
                            value={release.releaseDate}
                            onChange={(e) =>
                              handleUpdateRelease(release.id, 'releaseDate', e.target.value)
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
                            Quantity <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={release.quantity}
                            onChange={(e) =>
                              handleUpdateRelease(
                                release.id,
                                'quantity',
                                parseInt(e.target.value) || 0
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
                            Location <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <select
                            value={release.deliveryLocation}
                            onChange={(e) =>
                              handleUpdateRelease(release.id, 'deliveryLocation', e.target.value)
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
                            Value
                          </label>
                          <input
                            type="text"
                            value={formatCurrency(release.quantity * item.unitPrice)}
                            disabled
                            className="w-full px-2 py-1.5 rounded text-sm"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: 'var(--color-cloud)',
                              color: '#C62828',
                              fontWeight: '600',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Summary */}
                  <div
                    className="pt-4 flex justify-end gap-8"
                    style={{ borderTop: '2px solid var(--color-silver)' }}
                  >
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        Scheduled Qty
                      </p>
                      <p
                        className="text-base"
                        style={{
                          color:
                            scheduledQty === totalQty
                              ? 'var(--color-success-dark)'
                              : 'var(--color-error-dark)',
                          fontWeight: '600',
                        }}
                      >
                        {scheduledQty} / {totalQty} {item.uom}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        Scheduled Value
                      </p>
                      <p className="text-base" style={{ color: '#C62828', fontWeight: '600' }}>
                        {formatCurrency(scheduledValue)}
                      </p>
                    </div>
                  </div>

                  {scheduledQty !== totalQty && (
                    <div
                      className="flex items-center gap-2 p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--color-error-light)' }}
                    >
                      <AlertTriangle
                        className="w-4 h-4"
                        style={{ color: 'var(--color-error-dark)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--color-error-dark)' }}>
                        Scheduled quantity ({scheduledQty}) must match total quantity ({totalQty})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="w-5 h-5" style={{ color: '#C62828' }} />
                <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  Blanket Order Rules
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    <strong>Single item</strong> per blanket order
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    <strong>Fixed vendor & price</strong> for validity period
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Scheduled qty <strong>must equal</strong> total qty
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className="w-4 h-4 mt-0.5"
                    style={{ color: 'var(--color-success-dark)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Release dates must be <strong>within validity</strong>
                  </span>
                </li>
              </ul>
            </div>

            <div
              className="bg-white p-6 rounded-lg"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <h3
                className="text-base mb-4"
                style={{ color: 'var(--color-ink)', fontWeight: '600' }}
              >
                Use Cases
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFEBEE' }}>
                  <p className="text-sm mb-1" style={{ color: '#C62828', fontWeight: '600' }}>
                    Raw Materials
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    Monthly steel delivery for 6 months
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
                    Consumables
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    Quarterly stationery supplies
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
