import { useMemo, useState } from 'react';
import { ShoppingCart, Plus, Trash2, Search, CheckCircle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useProcurementData,
  type PurchaseRequestStatus,
} from '../../contexts/ProcurementDataContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';

/**
 * CATALOGUE PR FORM
 * Pre-fixed vendor and rates from catalog master
 */

export function CataloguePRForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addPurchaseRequest } = useProcurementData();
  const { items, liveVendors, entities, departments, costCentres, currentCompany, locations } =
    useMasterData();
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(
    currentCompany?.name || entities[0]?.name || ''
  );
  const [selectedDepartment, setSelectedDepartment] = useState(
    user?.department || departments[0]?.name || ''
  );
  const [needByDate, setNeedByDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState('Normal');
  const [deliveryLocation, setDeliveryLocation] = useState(
    currentCompany?.name || entities[0]?.name || ''
  );
  const [selectedCostCentre, setSelectedCostCentre] = useState(costCentres[0]?.code || '');
  const [businessJustification, setBusinessJustification] = useState('');

  const activeVendors = useMemo(
    () =>
      liveVendors.filter((vendor) => vendor.status === 'active' && vendor.vendorType !== 'entity'),
    [liveVendors]
  );

  const catalogItems = useMemo(
    () =>
      items
        .filter((item) => item.status === 'Active')
        .map((item, index) => {
          const assignedVendor = activeVendors[index % Math.max(activeVendors.length, 1)];
          return {
            id: item.id,
            code: item.code,
            name: item.name,
            category: item.category,
            vendor: assignedVendor?.name || 'Vendor to be assigned',
            vendorCode: assignedVendor?.code || '',
            rate: item.standardPrice || 0,
            uom: item.uom,
            gst: item.gstRate,
            sla: '3-5 days',
            contract: `CTR-${item.code}`,
          };
        }),
    [items, activeVendors]
  );

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const addToCart = (item: any) => {
    const exists = cart.find((c) => c.id === item.id);
    if (exists) {
      setCart(cart.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      setCart([...cart, { ...item, qty: 1, lineNo: cart.length + 1 }]);
    }
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => c.id !== id));
    } else {
      setCart(cart.map((c) => (c.id === id ? { ...c, qty } : c)));
    }
  };

  const calculateLineTotal = (item: any) => {
    const base = item.rate * item.qty;
    const gstAmount = (base * item.gst) / 100;
    return base + gstAmount;
  };

  const cartTotal = cart.reduce((sum, item) => sum + calculateLineTotal(item), 0);

  const filteredItems = catalogItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const submitPurchaseRequest = (status: PurchaseRequestStatus) => {
    const timestamp = Date.now();
    const createdDate = new Date().toISOString().split('T')[0];
    const vendors = Array.from(new Set(cart.map((item) => item.vendor)));
    const entityRecord =
      entities.find((e) => e.id === currentCompany?.id || e.name === selectedEntity) || entities[0];

    addPurchaseRequest({
      id: `catalogue-${timestamp}`,
      prNumber: `PR-${timestamp}`,
      type: 'Catalogue',
      entity: selectedEntity,
      entityId: entityRecord?.id || currentCompany?.id || '',
      entityCode: entityRecord?.code || currentCompany?.code || '',
      entityGstin: entityRecord?.gstin || '',
      requestor: user?.name || 'Current User',
      requesterId: user?.id || '',
      department: selectedDepartment,
      costCentre: selectedCostCentre,
      needByDate,
      deliveryLocation,
      totalAmount: cartTotal,
      currency: 'INR',
      status,
      nextApprover: status === 'Draft' ? '—' : 'Auto / Department Head',
      aiRiskLevel: 'Low',
      createdDate,
      submittedDate: status === 'Draft' ? undefined : createdDate,
      vendor: vendors.length === 1 ? vendors[0] : `${vendors.length} vendors`,
      itemCount: cart.length,
      justification:
        businessJustification || `Catalogue PR with ${cart.length} approved catalogue item(s)`,
      policyFlags: cartTotal > 500000 ? ['Budget Review'] : [],
      lineItems: cart.map((item) => ({
        ...item,
        total: calculateLineTotal(item),
      })),
    });

    navigate('/procurement/pr/my-prs');
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* HEADER */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl" style={{ color: 'var(--color-ink)', margin: 0 }}>
                Create Catalogue PR
              </h1>
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded"
                style={{
                  backgroundColor: 'var(--color-teal-tint)',
                  border: '1px solid var(--color-teal)',
                }}
              >
                <ShoppingCart className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
                <span className="text-xs" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>
                  CATALOGUE
                </span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
              Select items from approved catalogue with pre-fixed vendors and rates
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg"
              style={{
                backgroundColor: '#FFFFFF',
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
              disabled={cart.length === 0}
              onClick={() => submitPurchaseRequest('Pending Approval')}
            >
              Submit for Approval
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-8">
          {/* LEFT: PR Header */}
          <div className="col-span-2 space-y-6">
            {/* Header Section */}
            <div
              className="bg-white rounded-lg p-6"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <h3
                className="text-base mb-4"
                style={{ color: 'var(--color-ink)', fontWeight: '600' }}
              >
                PR Header
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs mb-2"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
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
                    className="block text-xs mb-2"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Department
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
                    {departments
                      .filter((department) => department.isActive)
                      .map((department) => (
                        <option key={department.id} value={department.name}>
                          {department.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs mb-2"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Need-by Date <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={needByDate}
                      onChange={(e) => setNeedByDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        border: '1px solid var(--color-silver)',
                        backgroundColor: '#FFFFFF',
                        color: 'var(--color-ink)',
                      }}
                    />
                    <Calendar
                      className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-xs mb-2"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  >
                    <option>Normal</option>
                    <option>Urgent</option>
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs mb-2"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Ship-to Location <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {locations
                      .filter((location) => location.isActive !== false)
                      .map((location) => (
                        <option key={location.id} value={location.name}>
                          {location.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs mb-2"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Cost Centre <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    value={selectedCostCentre}
                    onChange={(e) => setSelectedCostCentre(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {costCentres
                      .filter((costCentre) => costCentre.isActive)
                      .map((costCentre) => (
                        <option key={costCentre.id} value={costCentre.code}>
                          {costCentre.code} - {costCentre.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label
                    className="block text-xs mb-2"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Business Justification <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--color-silver)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-ink)',
                    }}
                    placeholder="Provide business justification for this requisition..."
                    value={businessJustification}
                    onChange={(e) => setBusinessJustification(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Catalog Selection */}
            <div
              className="bg-white rounded-lg p-6"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <h3
                className="text-base mb-4"
                style={{ color: 'var(--color-ink)', fontWeight: '600' }}
              >
                Browse Catalogue
              </h3>

              <div className="relative mb-4">
                <Search
                  className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2"
                  style={{ color: 'var(--color-mercury-grey)' }}
                />
                <input
                  type="text"
                  placeholder="Search by item name, code, or category..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid var(--color-silver)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--color-ink)',
                  }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-cloud)',
                      border: '1px solid var(--color-silver)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded flex items-center justify-center"
                            style={{ backgroundColor: 'var(--color-teal-tint)' }}
                          >
                            <ShoppingCart
                              className="w-5 h-5"
                              style={{ color: 'var(--color-teal)' }}
                            />
                          </div>
                          <div className="flex-1">
                            <h4
                              className="text-sm mb-1"
                              style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                            >
                              {item.name}
                            </h4>
                            <p
                              className="text-xs mb-2"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              {item.code} • {item.category}
                            </p>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div>
                                <p style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                                  Vendor
                                </p>
                                <p
                                  style={{
                                    color: 'var(--color-ink)',
                                    fontWeight: '600',
                                    margin: 0,
                                  }}
                                >
                                  {item.vendor}
                                </p>
                              </div>
                              <div>
                                <p style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>
                                  Rate
                                </p>
                                <p
                                  style={{
                                    color: 'var(--color-teal)',
                                    fontWeight: '600',
                                    margin: 0,
                                  }}
                                >
                                  {formatCurrency(item.rate)}
                                </p>
                              </div>
                              <div>
                                <p style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>GST</p>
                                <p
                                  style={{
                                    color: 'var(--color-ink)',
                                    fontWeight: '600',
                                    margin: 0,
                                  }}
                                >
                                  {item.gst}%
                                </p>
                              </div>
                              <div>
                                <p style={{ color: 'var(--color-mercury-grey)', margin: 0 }}>SLA</p>
                                <p
                                  style={{
                                    color: 'var(--color-success-dark)',
                                    fontWeight: '600',
                                    margin: 0,
                                  }}
                                >
                                  {item.sla}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        className="px-3 py-1.5 rounded-lg text-white text-xs"
                        style={{ backgroundColor: 'var(--color-teal)' }}
                        onClick={() => addToCart(item)}
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Cart & Summary */}
          <div className="space-y-6">
            {/* Cart */}
            <div
              className="bg-white rounded-lg p-6"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  Cart ({cart.length})
                </h3>
                {cart.length > 0 && (
                  <button
                    className="text-xs"
                    style={{ color: 'var(--color-error-dark)' }}
                    onClick={() => setCart([])}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart
                    className="w-12 h-12 mx-auto mb-3"
                    style={{ color: 'var(--color-silver)' }}
                  />
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Your cart is empty
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: 'var(--color-cloud)',
                        border: '1px solid var(--color-silver)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p
                          className="text-xs flex-1"
                          style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                        >
                          {item.name}
                        </p>
                        <button onClick={() => updateQty(item.id, 0)} className="ml-2">
                          <Trash2
                            className="w-3.5 h-3.5"
                            style={{ color: 'var(--color-error-dark)' }}
                          />
                        </button>
                      </div>
                      <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                        {item.vendor}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 rounded text-xs text-center"
                          style={{ border: '1px solid var(--color-silver)' }}
                        />
                        <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          × {formatCurrency(item.rate)}
                        </span>
                      </div>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--color-teal)', fontWeight: '600' }}
                      >
                        {formatCurrency(calculateLineTotal(item))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {cart.length > 0 && (
              <div
                className="bg-white rounded-lg p-6"
                style={{ border: '1px solid var(--color-silver)' }}
              >
                <h3
                  className="text-base mb-4"
                  style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                >
                  Summary
                </h3>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-mercury-grey)' }}>Total Items</span>
                    <span style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                      {cart.reduce((sum, i) => sum + i.qty, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-mercury-grey)' }}>Unique Items</span>
                    <span style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                      {cart.length}
                    </span>
                  </div>
                  <div className="pt-3" style={{ borderTop: '1px solid var(--color-silver)' }}>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        Total Amount
                      </span>
                      <span
                        className="text-lg"
                        style={{ color: 'var(--color-teal)', fontWeight: '600' }}
                      >
                        {formatCurrency(cartTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Policy Check */}
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-success-light)', border: '1px solid #81C784' }}
            >
              <div className="flex items-start gap-2">
                <CheckCircle
                  className="w-4 h-4 mt-0.5"
                  style={{ color: 'var(--color-success-dark)' }}
                />
                <div>
                  <p
                    className="text-xs mb-1"
                    style={{ color: 'var(--color-success-dark)', fontWeight: '600' }}
                  >
                    Policy Check: Passed
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    Budget available, approval route confirmed
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
