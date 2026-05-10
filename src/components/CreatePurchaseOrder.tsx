import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Search, Calendar, FileText } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { POPreview } from './POPreview';
import { useProcurementData, createPOApi } from '../contexts/ProcurementDataContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';

interface LineItem {
  id: string;
  sku: string;
  productName: string;
  qty: number;
  rate: number;
  total: number;
  deliveryDate: string;
  shipToLocation: string;
  costCentre: string;
  profitCentre: string;
}

interface Milestone {
  id: string;
  name: string;
  type: 'Fabric Sourcing' | 'Production';
  estimatedDate: string;
  actualDate: string;
}

interface PaymentMilestone {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  calculatedAmount: number;
}

export function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { prs, refresh } = useProcurementData();
  const { currentCompany, entities } = useMasterData();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitPO = async () => {
    setSubmitError(null);
    if (lineItems.length === 0) {
      setSubmitError('Add at least one line item before submitting.');
      return;
    }
    if (linkedPRs.length === 0) {
      setSubmitError('Pick at least one approved PR to convert.');
      return;
    }
    // Resolve entity slug (AuthContext-aligned) + GSTIN + vendor (from source PR).
    const entityRecord =
      entities.find((e) => e.id === currentCompany?.id || e.name === currentCompany?.name) ??
      entities[0];
    const sourcePR = prs.find((p) => linkedPRs.includes(p.id));
    const firstLine = sourcePR?.lineItems?.[0];
    const vendorId = firstLine?.vendorId || '';
    const vendorName = firstLine?.vendorName || '';
    if (!vendorId || !vendorName) {
      setSubmitError(
        'Vendor missing on the source PR line items. Pick a vendor on the PR before converting.'
      );
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPOApi({
        entityId: currentCompany?.id ?? entityRecord?.id ?? '',
        entityCode: entityRecord?.code ?? currentCompany?.code ?? '',
        vendorId,
        vendorName,
        vendorGstin: entityRecord?.gstin ?? null,
        poType: poType === 'Service PO' ? 'service' : 'regular',
        paymentTerms: '',
        prIds: linkedPRs,
        lineItems: lineItems.map((li, idx) => ({
          lineNumber: idx + 1,
          itemType: 'material',
          itemCode: li.sku || '',
          itemDescription: li.productName || '',
          quantity: Number(li.qty) || 0,
          unit: 'Each',
          unitPrice: Number(li.rate) || 0,
          gstRate: 18,
          shipToLocation: li.shipToLocation || '',
          deliveryDate: li.deliveryDate || null,
        })),
      } as unknown as Parameters<typeof createPOApi>[0]);
      if (created) {
        await refresh();
        navigate('/purchase-orders');
      } else {
        setSubmitError('Failed to create PO. Please retry.');
      }
    } catch (err) {
      const apiErr = err as { message?: string; details?: string[] };
      setSubmitError(
        apiErr?.details?.length
          ? apiErr.details.join(' · ')
          : apiErr?.message || 'Failed to create PO.'
      );
    } finally {
      setSubmitting(false);
    }
  };
  const [poType, setPoType] = useState('Catalogue PO');
  const [advanceRequired, setAdvanceRequired] = useState('No');
  const [taxInclusive, setTaxInclusive] = useState('Exclusive');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [autoEmailVendor, setAutoEmailVendor] = useState(false);
  const [internalComments, setInternalComments] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [paymentMilestones, setPaymentMilestones] = useState<PaymentMilestone[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // PR-based mode states
  const mode = searchParams.get('mode') || 'direct';
  const prIds = searchParams.get('prIds')?.split(',') || [];
  const [linkedPRs, setLinkedPRs] = useState<string[]>([]);
  const [sourcePRData, setSourcePRData] = useState<{ prNumber: string; vendorName: string } | null>(
    null
  );

  // New item form
  const [newItem, setNewItem] = useState({
    sku: '',
    productName: '',
    qty: 0,
    rate: 0,
    deliveryDate: '',
    shipToLocation: '',
    costCentre: '',
    profitCentre: '',
  });

  const handleAddItem = () => {
    if (newItem.productName && newItem.qty > 0 && newItem.rate > 0) {
      const item: LineItem = {
        id: Date.now().toString(),
        sku: newItem.sku,
        productName: newItem.productName,
        qty: newItem.qty,
        rate: newItem.rate,
        total: newItem.qty * newItem.rate,
        deliveryDate: newItem.deliveryDate,
        shipToLocation: newItem.shipToLocation,
        costCentre: newItem.costCentre,
        profitCentre: newItem.profitCentre,
      };
      setLineItems([...lineItems, item]);
      setNewItem({
        sku: '',
        productName: '',
        qty: 0,
        rate: 0,
        deliveryDate: '',
        shipToLocation: '',
        costCentre: '',
        profitCentre: '',
      });
      setShowAddItem(false);
    }
  };

  const handleRemoveItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleAddMilestone = (type: 'Fabric Sourcing' | 'Production') => {
    const milestone: Milestone = {
      id: Date.now().toString(),
      name: type,
      type: type,
      estimatedDate: '',
      actualDate: '',
    };
    setMilestones([...milestones, milestone]);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleMilestoneChange = (id: string, field: keyof Milestone, value: string) => {
    setMilestones(milestones.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  // Payment Milestones functions
  const handleAddPaymentMilestone = () => {
    const newMilestone: PaymentMilestone = {
      id: Date.now().toString(),
      name: '',
      type: 'percentage',
      value: 0,
      calculatedAmount: 0,
    };
    setPaymentMilestones([...paymentMilestones, newMilestone]);
  };

  const handleRemovePaymentMilestone = (id: string) => {
    setPaymentMilestones(paymentMilestones.filter((pm) => pm.id !== id));
  };

  const handlePaymentMilestoneChange = (
    id: string,
    field: keyof PaymentMilestone,
    value: string | number
  ) => {
    setPaymentMilestones(
      paymentMilestones.map((pm) => {
        if (pm.id === id) {
          const updated = { ...pm, [field]: value };
          // Recalculate amount based on type and value
          if (field === 'type' || field === 'value') {
            if (updated.type === 'percentage') {
              updated.calculatedAmount = totalPOValue * (updated.value / 100);
            } else {
              updated.calculatedAmount = updated.value;
            }
          }
          return updated;
        }
        return pm;
      })
    );
  };

  const calculateTotalPaymentPercentage = () => {
    return paymentMilestones.reduce((total, pm) => {
      if (pm.type === 'percentage') {
        return total + pm.value;
      } else {
        // Convert fixed amount to percentage
        return total + (pm.value / totalPOValue) * 100;
      }
    }, 0);
  };

  const calculateTotalPaymentAmount = () => {
    return paymentMilestones.reduce((total, pm) => total + pm.calculatedAmount, 0);
  };

  const isPaymentMilestonesValid = () => {
    const totalPercentage = calculateTotalPaymentPercentage();
    return Math.abs(totalPercentage - 100) < 0.01; // Allow for small floating point errors
  };

  const calculateMilestoneDelay = (estimatedDate: string, actualDate: string) => {
    if (!estimatedDate) return 0;
    const today = new Date();
    const estimated = new Date(estimatedDate);
    const actual = actualDate ? new Date(actualDate) : today;
    const diffTime = actual.getTime() - estimated.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculateOverallDelay = () => {
    return milestones.reduce((total, m) => {
      return total + calculateMilestoneDelay(m.estimatedDate, m.actualDate);
    }, 0);
  };

  // Calculations
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 0.18; // 18% GST
  const totalTax = subtotal * taxRate;
  const totalPOValue = subtotal + totalTax;

  // Form completeness
  const completeness = useMemo(() => {
    const fields = [poType, lineItems.length > 0 ? 'has-items' : ''];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [poType, lineItems.length]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const handleSaveDraft = useCallback(() => {
    alert('Purchase Order saved as draft');
  }, []);
  useFormKeyboardSave(handleSaveDraft);

  // PR-based mode logic — sourced from ProcurementDataContext.prs (relational)
  useEffect(() => {
    if (mode === 'from-pr' && prIds.length > 0) {
      const prObjects = prIds
        .map((id) => prs.find((p) => p.id === id || p.prRef === id))
        .filter(Boolean);

      if (prObjects.length > 0) {
        const prLineItems: LineItem[] = prObjects.flatMap((pr) =>
          (pr?.lineItems ?? []).map((item) => ({
            id: `pr-${pr?.id}-${item.id}`,
            sku: item.itemCode || '',
            productName: item.itemDescription,
            qty: item.quantity,
            rate: item.unitPrice,
            total: item.lineAmount,
            deliveryDate: item.deliveryDate || '',
            shipToLocation: item.shipToLocation || '',
            costCentre: '',
            profitCentre: '',
          }))
        );

        setLineItems(prLineItems);
        setLinkedPRs(prIds);

        // Set source PR data for display. The relational PR shape doesn't
        // carry a header-level vendor — derive it from the first line item.
        setSourcePRData({
          prNumber: prObjects.map((pr) => pr?.prRef ?? '').join(', '),
          vendorName: prObjects[0]?.lineItems?.[0]?.vendorName ?? '',
        });
      }
    }
  }, [mode, prIds.join(',')]);

  return (
    <FormShell
      title="Purchase Order Creation"
      subtitle="Create, review and submit a purchase order to your vendor."
      variant="transaction"
      onBack={() => navigate('/purchase-orders')}
      onSaveDraft={handleSaveDraft}
      onSubmit={() => void handleSubmitPO()}
      submitLabel={submitting ? 'Saving…' : 'Submit PO for Approval'}
      draftLabel="Save Draft"
      saveStatus={saveStatus}
      completeness={completeness}
      extraActions={
        <>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              border: '1px solid var(--color-silver)',
              color: 'var(--color-ink)',
              backgroundColor: 'white',
            }}
          >
            Print PO
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              border: '1px solid var(--color-silver)',
              color: 'var(--color-ink)',
              backgroundColor: 'white',
            }}
            onClick={() => setShowPreview(true)}
          >
            PO Preview
          </button>
        </>
      }
    >
      {submitError && (
        <div
          role="alert"
          style={{
            margin: '0 0 12px 0',
            padding: '10px 14px',
            borderRadius: 6,
            background: '#FFEBEE',
            color: '#C62828',
            fontSize: 13,
          }}
        >
          {submitError}
        </div>
      )}
      {/* PR-Based Mode Indicator */}
      {mode === 'from-pr' && linkedPRs.length > 0 && sourcePRData && (
        <div
          className="mb-6 p-4 rounded-lg"
          style={{ backgroundColor: '#E3F2FD', border: '1px solid var(--color-teal)' }}
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            <div className="flex-1">
              <div style={{ color: 'var(--color-ink)', fontWeight: 500, marginBottom: '4px' }}>
                Source: PR-Based PO
              </div>
              <div style={{ color: 'var(--color-mercury-grey)', fontSize: '14px' }}>
                Created from Purchase Request(s): {sourcePRData.prNumber} · Vendor:{' '}
                {sourcePRData.vendorName}
              </div>
              <div
                style={{ color: 'var(--color-mercury-grey)', fontSize: '13px', marginTop: '4px' }}
              >
                {lineItems.length} line item(s) populated from selected PR(s). Quantities are
                editable but cannot exceed PR quantities.
              </div>
            </div>
            <div
              className="px-3 py-1 rounded-full text-sm"
              style={{ backgroundColor: 'var(--color-teal)', color: 'white' }}
            >
              PR-Based
            </div>
          </div>
        </div>
      )}

      {/* Section 1: General & Vendor Information */}
      <FormSection
        title="General & Vendor Information"
        subtitle="Vendor, PO type, billing & GST details"
        columns={2}
        icon={
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#E3F2FD', color: 'var(--color-teal)' }}
          >
            1
          </div>
        }
      >
        <PxFormField label="PO Type">
          <select
            value={poType}
            onChange={(e) => setPoType(e.target.value)}
            className="px-input w-full px-4 py-3 rounded-lg"
            style={{
              border: '1px solid var(--color-silver)',
              backgroundColor: 'var(--color-cloud)',
              color: 'var(--color-ink)',
            }}
          >
            <option>Catalogue PO</option>
            <option>Service PO</option>
            <option>Contract PO</option>
          </select>
        </PxFormField>

        <PxFormField label="PO Number">
          <input
            type="text"
            value="PO-IND-2025-00001"
            disabled
            className="px-input w-full px-4 py-3 rounded-lg"
            style={{
              border: '1px solid var(--color-silver)',
              backgroundColor: 'var(--color-cloud)',
              color: 'var(--color-mercury-grey)',
            }}
          />
        </PxFormField>

        <PxFormField label="Vendor Name">
          <select
            className="px-input w-full px-4 py-3 rounded-lg"
            style={{
              border: '1px solid var(--color-silver)',
              backgroundColor: 'white',
              color: 'var(--color-ink)',
            }}
          >
            <option>Select Vendor...</option>
            <option>Acme Supplies Ltd</option>
            <option>Global Tech Solutions</option>
            <option>Office Depot India</option>
            <option>Engineering Parts Co</option>
          </select>
        </PxFormField>

        <PxFormField label="Vendor State">
          <select
            className="px-input w-full px-4 py-3 rounded-lg"
            style={{
              border: '1px solid var(--color-silver)',
              backgroundColor: 'white',
              color: 'var(--color-ink)',
            }}
          >
            <option>Select State</option>
            <option>Maharashtra</option>
            <option>Karnataka</option>
            <option>Tamil Nadu</option>
            <option>Delhi</option>
          </select>
        </PxFormField>

        <PxFormField label="Vendor GSTIN">
          <input
            type="text"
            placeholder="-- Auto-Populated or Enter Manually --"
            className="px-input w-full px-4 py-3 rounded-lg"
            style={{
              border: '1px solid var(--color-silver)',
              backgroundColor: 'white',
              color: 'var(--color-ink)',
            }}
          />
        </PxFormField>

        <PxFormField label="Bill-To Entity">
          <select
            className="px-input w-full px-4 py-3 rounded-lg"
            style={{
              border: '1px solid var(--color-silver)',
              backgroundColor: 'white',
              color: 'var(--color-ink)',
            }}
          >
            <option>Select Entity</option>
            <option>Procinix Solutions Pvt Ltd</option>
            <option>Procinix India Branch</option>
          </select>
        </PxFormField>

        <PxFormField label="Payment Terms">
          <select
            className="px-input w-full px-4 py-3 rounded-lg"
            style={{
              border: '1px solid var(--color-silver)',
              backgroundColor: 'white',
              color: 'var(--color-ink)',
            }}
          >
            <option>Select Terms</option>
            <option>Net 30</option>
            <option>Net 45</option>
            <option>Net 60</option>
            <option>Immediate</option>
          </select>
        </PxFormField>

        <PxFormField label="Advance Required?">
          <div className="flex items-center gap-6 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="Yes"
                checked={advanceRequired === 'Yes'}
                onChange={(e) => setAdvanceRequired(e.target.value)}
                className="w-4 h-4"
                style={{ accentColor: 'var(--color-teal)' }}
              />
              <span style={{ color: 'var(--color-ink)' }}>Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="No"
                checked={advanceRequired === 'No'}
                onChange={(e) => setAdvanceRequired(e.target.value)}
                className="w-4 h-4"
                style={{ accentColor: 'var(--color-teal)' }}
              />
              <span style={{ color: 'var(--color-ink)' }}>No</span>
            </label>
          </div>
        </PxFormField>
      </FormSection>

      {/* Section 2: Delivery Information */}
      <FormSection
        title="Delivery Information"
        subtitle="Destination port, delivery port & final handover details"
        columns={3}
        icon={
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#F3E5F5', color: '#9C27B0' }}
          >
            2
          </div>
        }
      >
        <PxFormField label="Destination Port">
          <select
            className="px-input w-full px-4 py-3 rounded-lg"
            style={{
              border: '1px solid var(--color-silver)',
              backgroundColor: 'white',
              color: 'var(--color-ink)',
            }}
          >
            <option>Select Destination Port</option>
            <option>Mumbai Port</option>
            <option>Chennai Port</option>
            <option>Bangalore Warehouse</option>
          </select>
        </PxFormField>

        <PxFormField label="Delivery Port">
          <select
            className="px-input w-full px-4 py-3 rounded-lg"
            style={{
              border: '1px solid var(--color-silver)',
              backgroundColor: 'white',
              color: 'var(--color-ink)',
            }}
          >
            <option>Select Delivery Port</option>
            <option>Mumbai Warehouse</option>
            <option>Delhi Hub</option>
            <option>Bangalore Facility</option>
          </select>
        </PxFormField>

        <PxFormField label="Final Delivery Port">
          <select
            className="px-input w-full px-4 py-3 rounded-lg"
            style={{
              border: '1px solid var(--color-silver)',
              backgroundColor: 'white',
              color: 'var(--color-ink)',
            }}
          >
            <option>Select Final Delivery Port</option>
            <option>Head Office - Mumbai</option>
            <option>Branch Office - Bangalore</option>
            <option>Factory - Pune</option>
          </select>
        </PxFormField>
      </FormSection>

      {/* Section 3: PO Line Items & Logistics */}
      <div
        className="bg-white rounded-lg p-6 mb-6"
        style={{ border: '1px solid var(--color-silver)' }}
      >
        <div className="flex items-start gap-3 mb-6">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-success-light)', color: '#4CAF50' }}
          >
            3
          </div>
          <div className="flex-1">
            <h2 className="text-xl mb-1" style={{ color: 'var(--color-ink)' }}>
              PO Line Items & Logistics
            </h2>
            <p className="text-sm" style={{ color: '#4CAF50' }}>
              Add SKUs, quantities, GST, shipping & delivery
            </p>
          </div>
          <button
            onClick={() => setShowAddItem(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: 'var(--color-teal)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {/* Add Item Form */}
        {showAddItem && (
          <div
            className="mb-6 p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--color-cloud)',
              border: '1px solid var(--color-silver)',
            }}
          >
            <div className="grid grid-cols-5 gap-4 mb-4">
              <input
                type="text"
                placeholder="SKU"
                value={newItem.sku}
                onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                className="px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--color-silver)',
                  backgroundColor: 'white',
                  color: 'var(--color-ink)',
                }}
              />
              <input
                type="text"
                placeholder="Product Name"
                value={newItem.productName}
                onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--color-silver)',
                  backgroundColor: 'white',
                  color: 'var(--color-ink)',
                }}
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newItem.qty || ''}
                onChange={(e) => setNewItem({ ...newItem, qty: parseInt(e.target.value) || 0 })}
                className="px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--color-silver)',
                  backgroundColor: 'white',
                  color: 'var(--color-ink)',
                }}
              />
              <input
                type="number"
                placeholder="Rate"
                value={newItem.rate || ''}
                onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })}
                className="px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--color-silver)',
                  backgroundColor: 'white',
                  color: 'var(--color-ink)',
                }}
              />
              <input
                type="date"
                placeholder="Delivery Date"
                value={newItem.deliveryDate}
                onChange={(e) => setNewItem({ ...newItem, deliveryDate: e.target.value })}
                className="px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--color-silver)',
                  backgroundColor: 'white',
                  color: 'var(--color-ink)',
                }}
              />
              <input
                type="text"
                placeholder="Ship To Location"
                value={newItem.shipToLocation}
                onChange={(e) => setNewItem({ ...newItem, shipToLocation: e.target.value })}
                className="px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--color-silver)',
                  backgroundColor: 'white',
                  color: 'var(--color-ink)',
                }}
              />
              <input
                type="text"
                placeholder="Cost Centre"
                value={newItem.costCentre}
                onChange={(e) => setNewItem({ ...newItem, costCentre: e.target.value })}
                className="px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--color-silver)',
                  backgroundColor: 'white',
                  color: 'var(--color-ink)',
                }}
              />
              <input
                type="text"
                placeholder="Profit Centre"
                value={newItem.profitCentre}
                onChange={(e) => setNewItem({ ...newItem, profitCentre: e.target.value })}
                className="px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--color-silver)',
                  backgroundColor: 'white',
                  color: 'var(--color-ink)',
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddItem}
                className="px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: 'var(--color-teal)' }}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddItem(false);
                  setNewItem({
                    sku: '',
                    productName: '',
                    qty: 0,
                    rate: 0,
                    deliveryDate: '',
                    shipToLocation: '',
                    costCentre: '',
                    profitCentre: '',
                  });
                }}
                className="px-4 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-mercury-grey)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  borderBottom: '1px solid var(--color-silver)',
                }}
              >
                <th
                  className="text-left px-4 py-3 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  SKU
                </th>
                <th
                  className="text-left px-4 py-3 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Product Name
                </th>
                <th
                  className="text-right px-4 py-3 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Qty
                </th>
                <th
                  className="text-right px-4 py-3 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Rate
                </th>
                <th
                  className="text-right px-4 py-3 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Total
                </th>
                <th
                  className="text-left px-4 py-3 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Delivery Date
                </th>
                <th
                  className="text-left px-4 py-3 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Ship To
                </th>
                <th
                  className="text-left px-4 py-3 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Cost Centre
                </th>
                <th
                  className="text-left px-4 py-3 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Profit Centre
                </th>
                <th
                  className="text-center px-4 py-3 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-12"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    No Items Added
                  </td>
                </tr>
              ) : (
                lineItems.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom:
                        index !== lineItems.length - 1 ? '1px solid var(--color-silver)' : 'none',
                    }}
                  >
                    <td className="px-4 py-3" style={{ color: 'var(--color-mercury-grey)' }}>
                      {item.sku}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-ink)' }}>
                      {item.productName}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--color-ink)' }}>
                      {item.qty}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--color-ink)' }}>
                      ₹{item.rate.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--color-ink)' }}>
                      ₹{item.total.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-mercury-grey)' }}>
                      {item.deliveryDate
                        ? new Date(item.deliveryDate).toLocaleDateString('en-IN')
                        : '-'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-mercury-grey)' }}>
                      {item.shipToLocation || '-'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-mercury-grey)' }}>
                      {item.costCentre || '-'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-mercury-grey)' }}>
                      {item.profitCentre || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--color-error)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Totals & Controls */}
      <div
        className="bg-white rounded-lg p-6 mb-6"
        style={{ border: '1px solid var(--color-silver)' }}
      >
        <div className="flex items-start gap-3 mb-6">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#FCE4EC', color: '#E91E63' }}
          >
            4
          </div>
          <div>
            <h2 className="text-xl mb-1" style={{ color: 'var(--color-ink)' }}>
              Totals & Controls
            </h2>
            <p className="text-sm" style={{ color: '#E91E63' }}>
              Review taxes, subtotal & PO value
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Tax Radio */}
          <div>
            <label className="block text-sm mb-3" style={{ color: 'var(--color-mercury-grey)' }}>
              Taxes Included in Unit Price?
            </label>
            <div className="flex items-center gap-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="Exclusive"
                  checked={taxInclusive === 'Exclusive'}
                  onChange={(e) => setTaxInclusive(e.target.value)}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--color-teal)' }}
                />
                <span style={{ color: 'var(--color-ink)' }}>Exclusive (Taxes added)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="Inclusive"
                  checked={taxInclusive === 'Inclusive'}
                  onChange={(e) => setTaxInclusive(e.target.value)}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--color-teal)' }}
                />
                <span style={{ color: 'var(--color-ink)' }}>Inclusive (Taxes in rate)</span>
              </label>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Subtotal (Excl. Tax)
              </label>
              <div
                className="px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                }}
              >
                <span style={{ color: 'var(--color-ink)' }}>
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Total Applicable Tax
              </label>
              <div
                className="px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                }}
              >
                <span style={{ color: 'var(--color-ink)' }}>
                  ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Total PO Value
              </label>
              <div
                className="px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-teal)',
                  border: '1px solid var(--color-teal)',
                }}
              >
                <span className="text-white">
                  ₹{totalPOValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Terms, Quoting & Automation */}
      <div
        className="bg-white rounded-lg p-6 mb-6"
        style={{ border: '1px solid var(--color-silver)' }}
      >
        <div className="flex items-start gap-3 mb-6">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-warning-light)', color: '#FF9800' }}
          >
            5
          </div>
          <div>
            <h2 className="text-xl mb-1" style={{ color: 'var(--color-ink)' }}>
              Terms, Quoting & Automation
            </h2>
            <p className="text-sm" style={{ color: '#FF9800' }}>
              Payment milestones, comments & vendor communication
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* General Terms */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              General Terms and Conditions (Print on PO)
            </label>
            <textarea
              rows={3}
              placeholder="Standard warranty terms apply. Governing law: India. Force Majeure applies."
              className="w-full px-4 py-3 rounded-lg"
              style={{
                border: '1px solid var(--color-silver)',
                backgroundColor: 'white',
                color: 'var(--color-ink)',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Delivery Terms */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Delivery Terms and Conditions (Print on PO)
            </label>
            <textarea
              rows={3}
              placeholder="Delivery must be accompanied by a commercial invoice and quality certificate. Goods are subject to inspection upon receipt."
              className="w-full px-4 py-3 rounded-lg"
              style={{
                border: '1px solid var(--color-silver)',
                backgroundColor: 'white',
                color: 'var(--color-ink)',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Payment Milestones */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Payment Milestones (Must equal 100% of Total PO Value)
              </label>
              <button
                onClick={handleAddPaymentMilestone}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white transition-colors text-sm"
                style={{ backgroundColor: 'var(--color-teal)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
              >
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            </div>

            {paymentMilestones.length === 0 ? (
              <div
                className="text-center py-8 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                }}
              >
                <p style={{ color: 'var(--color-mercury-grey)' }}>
                  No payment milestones added. Click "Add Milestone" to define payment schedule.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {paymentMilestones.map((pm, index) => (
                    <div
                      key={pm.id}
                      className="p-4 rounded-lg"
                      style={{
                        backgroundColor: 'var(--color-cloud)',
                        border: '1px solid var(--color-silver)',
                      }}
                    >
                      <div className="grid grid-cols-5 gap-4">
                        <div className="col-span-2">
                          <label
                            className="block text-sm mb-2"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Milestone Name
                          </label>
                          <input
                            type="text"
                            value={pm.name}
                            onChange={(e) =>
                              handlePaymentMilestoneChange(pm.id, 'name', e.target.value)
                            }
                            placeholder="e.g., Advance Payment, On Delivery"
                            className="w-full px-3 py-2 rounded-lg"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: 'white',
                              color: 'var(--color-ink)',
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="block text-sm mb-2"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            Type
                          </label>
                          <select
                            value={pm.type}
                            onChange={(e) =>
                              handlePaymentMilestoneChange(pm.id, 'type', e.target.value)
                            }
                            className="w-full px-3 py-2 rounded-lg"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: 'white',
                              color: 'var(--color-ink)',
                            }}
                          >
                            <option value="percentage">Percentage %</option>
                            <option value="fixed">Fixed Amount</option>
                          </select>
                        </div>
                        <div>
                          <label
                            className="block text-sm mb-2"
                            style={{ color: 'var(--color-mercury-grey)' }}
                          >
                            {pm.type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
                          </label>
                          <input
                            type="number"
                            value={pm.value || ''}
                            onChange={(e) =>
                              handlePaymentMilestoneChange(
                                pm.id,
                                'value',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder={pm.type === 'percentage' ? '30' : '10000'}
                            className="w-full px-3 py-2 rounded-lg"
                            style={{
                              border: '1px solid var(--color-silver)',
                              backgroundColor: 'white',
                              color: 'var(--color-ink)',
                            }}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label
                              className="block text-sm mb-2"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              Calculated Amount
                            </label>
                            <div
                              className="px-3 py-2 rounded-lg"
                              style={{
                                backgroundColor: '#E3F2FD',
                                border: '1px solid var(--color-teal)',
                                color: 'var(--color-teal)',
                              }}
                            >
                              ₹
                              {pm.calculatedAmount.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemovePaymentMilestone(pm.id)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: 'var(--color-error)' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Validation Summary */}
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: isPaymentMilestonesValid()
                      ? 'var(--color-success-light)'
                      : 'var(--color-warning-light)',
                    border: `1px solid ${isPaymentMilestonesValid() ? '#4CAF50' : '#FF9800'}`,
                  }}
                >
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        Total Percentage
                      </p>
                      <p
                        className="text-xl"
                        style={{ color: isPaymentMilestonesValid() ? '#4CAF50' : '#FF9800' }}
                      >
                        {calculateTotalPaymentPercentage().toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        Total Amount
                      </p>
                      <p
                        className="text-xl"
                        style={{ color: isPaymentMilestonesValid() ? '#4CAF50' : '#FF9800' }}
                      >
                        ₹
                        {calculateTotalPaymentAmount().toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        Total PO Value
                      </p>
                      <p className="text-xl" style={{ color: 'var(--color-ink)' }}>
                        ₹{totalPOValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  {!isPaymentMilestonesValid() && (
                    <p className="text-sm mt-3" style={{ color: '#FF9800' }}>
                      ⚠️ Warning: Payment milestones must total exactly 100% of the PO value.
                      Currently at {calculateTotalPaymentPercentage().toFixed(2)}%
                    </p>
                  )}
                  {isPaymentMilestonesValid() && (
                    <p className="text-sm mt-3" style={{ color: '#4CAF50' }}>
                      ✓ Payment milestones are correctly configured (100% of PO value)
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Auto Email Vendor */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoEmailVendor}
                onChange={(e) => setAutoEmailVendor(e.target.checked)}
                className="w-4 h-4"
                style={{ accentColor: 'var(--color-teal)' }}
              />
              <span style={{ color: 'var(--color-ink)' }}>Auto-email vendor upon approval</span>
            </label>
          </div>

          {/* Internal Comments */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Internal Comments (Do NOT print on PO)
            </label>
            <textarea
              rows={3}
              value={internalComments}
              onChange={(e) => setInternalComments(e.target.value)}
              placeholder="Internal-only remarks for reviewers/approvers"
              className="w-full px-4 py-3 rounded-lg"
              style={{
                border: '1px solid var(--color-silver)',
                backgroundColor: 'white',
                color: 'var(--color-ink)',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </div>

      {/* Section 6: Delivery Milestone Tracking */}
      <div
        className="bg-white rounded-lg p-6 mb-6"
        style={{ border: '1px solid var(--color-silver)' }}
      >
        <div className="flex items-start gap-3 mb-6">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#E8EAF6', color: '#5E35B1' }}
          >
            6
          </div>
          <div className="flex-1">
            <h2 className="text-xl mb-1" style={{ color: 'var(--color-ink)' }}>
              Delivery Milestone Tracking
            </h2>
            <p className="text-sm" style={{ color: '#5E35B1' }}>
              Track sourcing, production & delivery delays
            </p>
            <div
              className="flex items-center gap-2 mt-2 px-3 py-2 rounded"
              style={{ backgroundColor: '#FFF8E1', border: '1px solid #FFE082' }}
            >
              <span className="text-xs" style={{ color: 'var(--color-warning-dark)' }}>
                ℹ️ This section remains editable post-approval. Updates trigger auto-calculation &
                email notifications to stakeholders.
              </span>
            </div>
          </div>
        </div>

        {milestones.length === 0 ? (
          <div className="text-center py-8 mb-6">
            <p style={{ color: 'var(--color-mercury-grey)' }} className="mb-4">
              No milestones added yet. Use the buttons below to add milestones.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-4">
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                  }}
                >
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <label
                        className="block text-sm mb-2"
                        style={{ color: 'var(--color-mercury-grey)' }}
                      >
                        Milestone Name
                      </label>
                      <input
                        type="text"
                        value={milestone.name}
                        onChange={(e) =>
                          handleMilestoneChange(milestone.id, 'name', e.target.value)
                        }
                        placeholder={milestone.type}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          border: '1px solid var(--color-silver)',
                          backgroundColor: 'white',
                          color: 'var(--color-ink)',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm mb-2"
                        style={{ color: 'var(--color-mercury-grey)' }}
                      >
                        Estimated Completion Date
                      </label>
                      <input
                        type="date"
                        value={milestone.estimatedDate}
                        onChange={(e) =>
                          handleMilestoneChange(milestone.id, 'estimatedDate', e.target.value)
                        }
                        placeholder="dd/mm/yyyy"
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          border: '1px solid var(--color-silver)',
                          backgroundColor: 'white',
                          color: 'var(--color-ink)',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm mb-2"
                        style={{ color: 'var(--color-mercury-grey)' }}
                      >
                        Actual Completion Date
                      </label>
                      <input
                        type="date"
                        value={milestone.actualDate}
                        onChange={(e) =>
                          handleMilestoneChange(milestone.id, 'actualDate', e.target.value)
                        }
                        placeholder="dd/mm/yyyy"
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          border: '1px solid var(--color-silver)',
                          backgroundColor: 'white',
                          color: 'var(--color-ink)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--color-mercury-grey)' }}>
                        Status: Pending | Delay:
                      </span>
                      <span style={{ color: 'var(--color-error)' }}>
                        {calculateMilestoneDelay(milestone.estimatedDate, milestone.actualDate)}{' '}
                        days
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveMilestone(milestone.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Auto-calculated delay summary with notification */}
            <div
              className="mb-6 p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-warning-light)', border: '1px solid #FFE082' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-ink)' }}>Overall Cumulative Delay:</span>
                  <span style={{ color: 'var(--color-error)' }} className="text-lg">
                    {calculateOverallDelay()} Days
                  </span>
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-teal)')
                  }
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Send Update to Stakeholders
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Email notification will be sent to: Procurement Manager, Approver, Finance Team &
                Vendor
              </p>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleAddMilestone('Fabric Sourcing')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#4CAF50' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#388E3C')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4CAF50')}
          >
            <Plus className="w-4 h-4" />
            Add Fabric Sourcing
          </button>
          <button
            onClick={() => handleAddMilestone('Production')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#4CAF50' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#388E3C')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4CAF50')}
          >
            <Plus className="w-4 h-4" />
            Add Production
          </button>
        </div>
      </div>

      {/* PO Preview Modal */}
      {showPreview && (
        <POPreview
          onClose={() => setShowPreview(false)}
          lineItems={lineItems}
          subtotal={subtotal}
          totalTax={totalTax}
          totalPOValue={totalPOValue}
        />
      )}
    </FormShell>
  );
}
