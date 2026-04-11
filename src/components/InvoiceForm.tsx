import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Send, X, Upload, Plus, Trash2, 
  FileText, AlertCircle, CheckCircle, DollarSign, Calendar,
  User, Building2, Hash, CreditCard, Package, Clock
} from 'lucide-react';

interface LineItem {
  id: string;
  itemName: string;
  itemCode: string;
  itemDescription: string;
  accountCode: string;
  accountDescription: string;
  unitPrice: number;
  qty: number;
  amount: number;
  gstPercent: number;
  gstTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grossAmount: number;
  tds: number;
  netPayable: number;
  costCentre: string;
  profitCentre: string;
  project: string;
  poNumber: string;
  grnNumber: string;
}

export function InvoiceForm() {
  const navigate = useNavigate();
  const [invoiceType, setInvoiceType] = useState<'PO' | 'Non PO' | 'Rent' | 'Utilities'>('PO');
  const [gstApplicable, setGstApplicable] = useState(true);
  const [tdsApplicable, setTdsApplicable] = useState(false);
  const [matchType, setMatchType] = useState<'2-way' | '3-way'>('3-way');
  const [selectedPO, setSelectedPO] = useState('');
  const [selectedGRNs, setSelectedGRNs] = useState<string[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      itemName: '',
      itemCode: '',
      itemDescription: '',
      accountCode: '',
      accountDescription: '',
      unitPrice: 0,
      qty: 0,
      amount: 0,
      gstPercent: 18,
      gstTotal: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      grossAmount: 0,
      tds: 0,
      netPayable: 0,
      costCentre: '',
      profitCentre: '',
      project: '',
      poNumber: '',
      grnNumber: ''
    }
  ]);

  const [formData, setFormData] = useState({
    vendorName: '',
    vendorCode: '',
    invoiceNumber: '',
    invoiceDate: '',
    invoiceAmount: '',
    currency: 'INR',
    gstNumber: '',
    poNumber: '',
    paymentTerms: 'Net 30',
    earlyPaymentDiscount: '',
    expectedPaymentDate: '',
    approvalWorkflow: 'auto',
    priorityLevel: 'Medium',
    internalNotes: '',
    vendorNotes: ''
  });

  // Mock data
  const vendors = [
    { code: 'VEN-001', name: 'Textile Solutions Pvt Ltd', gst: '27AAAAA0000A1Z5' },
    { code: 'VEN-002', name: 'Fashion Fabrics India', gst: '27BBBBB0000B1Z5' },
    { code: 'VEN-003', name: 'Global Accessories Ltd', gst: '27CCCCC0000C1Z5' }
  ];

  const purchaseOrders = [
    { code: 'PO-2024-001', vendor: 'VEN-001', amount: 125000 },
    { code: 'PO-2024-002', vendor: 'VEN-002', amount: 89500 },
    { code: 'PO-2024-003', vendor: 'VEN-003', amount: 45600 }
  ];

  const grnNumbers = ['GRN-2024-056', 'GRN-2024-057', 'GRN-2024-058', 'GRN-2024-059'];
  const costCenters = ['CC-MFG-001', 'CC-MFG-002', 'CC-ADMIN-001', 'CC-SALES-001'];
  const glCodes = ['5100 - Raw Materials', '5200 - Packaging', '6100 - Utilities', '6200 - Services'];
  const departments = ['Manufacturing', 'Administration', 'Sales', 'Warehouse'];

  const handleVendorChange = (vendorCode: string) => {
    const vendor = vendors.find(v => v.code === vendorCode);
    if (vendor) {
      setFormData({
        ...formData,
        vendorName: vendor.name,
        vendorCode: vendor.code,
        gstNumber: vendor.gst
      });
    }
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      itemName: '',
      itemCode: '',
      itemDescription: '',
      accountCode: '',
      accountDescription: '',
      unitPrice: 0,
      qty: 0,
      amount: 0,
      gstPercent: 18,
      gstTotal: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      grossAmount: 0,
      tds: 0,
      netPayable: 0,
      costCentre: '',
      profitCentre: '',
      project: '',
      poNumber: '',
      grnNumber: ''
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-calculate line amount
        if (field === 'qty' || field === 'unitPrice') {
          updated.amount = updated.qty * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = () => {
    return lineItems.reduce((sum, item) => sum + (item.amount * item.gstPercent / 100), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const tds = tdsApplicable ? subtotal * 0.02 : 0; // Assuming 2% TDS
    return subtotal + tax - tds;
  };

  const handleSaveDraft = () => {
    alert('Invoice saved as draft');
  };

  const handleSubmit = () => {
    alert('Invoice submitted for approval');
    navigate('/invoices');
  };

  const handleCancel = () => {
    navigate('/invoices');
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-white shadow-sm" style={{ borderBottom: '2px solid var(--color-silver)' }}>
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleCancel}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100" 
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl" style={{ color: 'var(--color-ink)' }}>Create Invoice</h1>
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Capture and process supplier invoice</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D1D6DA'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-silver)'}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: 'var(--color-mercury-grey)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5E6A72'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-mercury-grey)'}
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: 'var(--color-teal)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
              >
                <Send className="w-4 h-4" />
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-8 max-w-7xl mx-auto">
        {/* Invoice Type Selection - At the Top */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
              <CreditCard className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Invoice Type</h2>
          </div>

          <div>
            <label className="block text-sm mb-3" style={{ color: 'var(--color-mercury-grey)' }}>
              Select Invoice Type <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div className="flex items-center gap-4 max-w-2xl">
              {(['PO', 'Non PO', 'Rent', 'Utilities'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setInvoiceType(type)}
                  className="flex-1 px-6 py-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: invoiceType === type ? 'var(--color-teal)' : 'var(--color-cloud)',
                    color: invoiceType === type ? '#FFFFFF' : 'var(--color-ink)',
                    border: `2px solid ${invoiceType === type ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                    fontWeight: invoiceType === type ? '600' : '500'
                  }}
                  onMouseEnter={(e) => {
                    if (invoiceType !== type) {
                      e.currentTarget.style.backgroundColor = 'var(--color-silver)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (invoiceType !== type) {
                      e.currentTarget.style.backgroundColor = 'var(--color-cloud)';
                    }
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 1: Invoice Header */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
              <FileText className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Invoice Header</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Vendor Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={formData.vendorCode}
                onChange={(e) => handleVendorChange(e.target.value)}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
              >
                <option value="">Select Vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor.code} value={vendor.code}>{vendor.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Vendor Code
              </label>
              <input
                type="text"
                value={formData.vendorCode}
                disabled
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Invoice Number <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="INV-2024-001"
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Invoice Date <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Invoice Amount <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="number"
                value={formData.invoiceAmount}
                onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
              >
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                GST Applicable
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGstApplicable(true)}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: gstApplicable ? 'var(--color-teal)' : 'var(--color-cloud)',
                    color: gstApplicable ? '#FFFFFF' : 'var(--color-ink)',
                    border: `1px solid ${gstApplicable ? 'var(--color-teal)' : 'var(--color-silver)'}`
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setGstApplicable(false)}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: !gstApplicable ? 'var(--color-teal)' : 'var(--color-cloud)',
                    color: !gstApplicable ? '#FFFFFF' : 'var(--color-ink)',
                    border: `1px solid ${!gstApplicable ? 'var(--color-teal)' : 'var(--color-silver)'}`
                  }}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                GST Number
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                disabled
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: PO / GRN Reference (Conditional) */}
        {invoiceType === 'PO' && (
          <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
                <Package className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>PO / GRN Reference</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                  PO Number <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={selectedPO}
                  onChange={(e) => setSelectedPO(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                >
                  <option value="">Select PO</option>
                  {purchaseOrders.map(po => (
                    <option key={po.code} value={po.code}>
                      {po.code} - ₹{po.amount.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                  Match Type
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMatchType('2-way')}
                    className="flex-1 px-4 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: matchType === '2-way' ? 'var(--color-teal)' : 'var(--color-cloud)',
                      color: matchType === '2-way' ? '#FFFFFF' : 'var(--color-ink)',
                      border: `1px solid ${matchType === '2-way' ? 'var(--color-teal)' : 'var(--color-silver)'}`
                    }}
                  >
                    2-Way Match
                  </button>
                  <button
                    onClick={() => setMatchType('3-way')}
                    className="flex-1 px-4 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: matchType === '3-way' ? 'var(--color-teal)' : 'var(--color-cloud)',
                      color: matchType === '3-way' ? '#FFFFFF' : 'var(--color-ink)',
                      border: `1px solid ${matchType === '3-way' ? 'var(--color-teal)' : 'var(--color-silver)'}`
                    }}
                  >
                    3-Way Match
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                  GRN Number(s)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {grnNumbers.map(grn => (
                    <label key={grn} className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-silver)' }}>
                      <input
                        type="checkbox"
                        checked={selectedGRNs.includes(grn)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGRNs([...selectedGRNs, grn]);
                          } else {
                            setSelectedGRNs(selectedGRNs.filter(g => g !== grn));
                          }
                        }}
                        className="w-4 h-4"
                        style={{ accentColor: 'var(--color-teal)' }}
                      />
                      <span style={{ color: 'var(--color-ink)' }}>{grn}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                  Matched Amount
                </label>
                <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-teal)10', border: '1px solid var(--color-teal)30' }}>
                  <p style={{ color: 'var(--color-teal)', fontWeight: '600' }}>₹1,18,500</p>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                  Unmatched Amount
                </label>
                <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)', border: '1px solid #FCA5A5' }}>
                  <p style={{ color: '#EF4444', fontWeight: '600' }}>₹6,500</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Line Item Details */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
                <Hash className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Line Item Details</h2>
            </div>
            <button
              onClick={addLineItem}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: 'var(--color-teal)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
            >
              <Plus className="w-4 h-4" />
              Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Description</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Quantity</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Unit Price</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Tax %</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Line Amount</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Cost Center</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>GL Code</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Department</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Project</th>
                  <th className="text-center px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={item.id} style={{ borderTop: index > 0 ? '1px solid var(--color-silver)' : 'none' }}>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.itemDescription}
                        onChange={(e) => updateLineItem(item.id, 'itemDescription', e.target.value)}
                        placeholder="Item description"
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)', minWidth: '200px' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.qty || ''}
                        onChange={(e) => updateLineItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)', minWidth: '80px' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)', minWidth: '100px' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.gstPercent}
                        onChange={(e) => updateLineItem(item.id, 'gstPercent', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)', minWidth: '80px' }}
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={`₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        disabled
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)', color: 'var(--color-ink)', minWidth: '120px' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.costCentre}
                        onChange={(e) => updateLineItem(item.id, 'costCentre', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)', minWidth: '120px' }}
                      >
                        <option value="">Select</option>
                        {costCenters.map(cc => (
                          <option key={cc} value={cc}>{cc}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.glCode}
                        onChange={(e) => updateLineItem(item.id, 'glCode', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)', minWidth: '180px' }}
                      >
                        <option value="">Select</option>
                        {glCodes.map(gl => (
                          <option key={gl} value={gl}>{gl}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.department}
                        onChange={(e) => updateLineItem(item.id, 'department', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)', minWidth: '140px' }}
                      >
                        <option value="">Select</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.project}
                        onChange={(e) => updateLineItem(item.id, 'project', e.target.value)}
                        placeholder="PRJ-001"
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)', minWidth: '100px' }}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                        className="p-2 rounded-lg transition-colors disabled:opacity-30"
                        style={{ color: '#EF4444' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Tax & Charges Summary */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
              <DollarSign className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Tax & Charges Summary</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Taxable Value
              </label>
              <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}>
                <p style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  ₹{calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                GST Amount (CGST + SGST / IGST)
              </label>
              <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}>
                <p style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  ₹{calculateTax().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                TDS Applicable
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTdsApplicable(true)}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: tdsApplicable ? 'var(--color-teal)' : 'var(--color-cloud)',
                    color: tdsApplicable ? '#FFFFFF' : 'var(--color-ink)',
                    border: `1px solid ${tdsApplicable ? 'var(--color-teal)' : 'var(--color-silver)'}`
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTdsApplicable(false)}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: !tdsApplicable ? 'var(--color-teal)' : 'var(--color-cloud)',
                    color: !tdsApplicable ? '#FFFFFF' : 'var(--color-ink)',
                    border: `1px solid ${!tdsApplicable ? 'var(--color-teal)' : 'var(--color-silver)'}`
                  }}
                >
                  No
                </button>
              </div>
            </div>

            {tdsApplicable && (
              <>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    TDS Section
                  </label>
                  <select className="w-full px-4 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}>
                    <option value="">Select TDS Section</option>
                    <option value="194C">194C - Contractor Payments</option>
                    <option value="194J">194J - Professional Services</option>
                    <option value="194I">194I - Rent</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    TDS Amount (2%)
                  </label>
                  <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
                    <p style={{ color: '#92400E', fontWeight: '600' }}>
                      ₹{(calculateSubtotal() * 0.02).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-teal)10', border: '2px solid var(--color-teal)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-ink)', fontWeight: '600' }}>Total Invoice Value</span>
                  <span className="text-2xl" style={{ color: 'var(--color-teal)', fontWeight: '700' }}>
                    ₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Payment Terms & Cashflow Impact */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
              <Calendar className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Payment Terms & Cashflow Impact</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Payment Terms
              </label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
              >
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 45">Net 45 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="Net 90">Net 90 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Invoice Due Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}
                disabled
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Early Payment Discount (%)
              </label>
              <input
                type="number"
                value={formData.earlyPaymentDiscount}
                onChange={(e) => setFormData({ ...formData, earlyPaymentDiscount: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Expected Payment Date
              </label>
              <input
                type="date"
                value={formData.expectedPaymentDate}
                onChange={(e) => setFormData({ ...formData, expectedPaymentDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Cashflow Month
              </label>
              <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}>
                <p style={{ color: 'var(--color-ink)' }}>January 2025</p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Cashflow Impact
              </label>
              <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)', border: '1px solid #FCA5A5' }}>
                <p style={{ color: '#EF4444', fontWeight: '600' }}>
                  -₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Attachments & Notes */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
              <Upload className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Attachments & Notes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Invoice Document <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: 'var(--color-silver)' }}
              >
                <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-mercury-grey)' }} />
                <p className="text-sm mb-1" style={{ color: 'var(--color-ink)' }}>Upload Invoice PDF/Image</p>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>PDF, JPG, PNG up to 10MB</p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Supporting Documents
              </label>
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: 'var(--color-silver)' }}
              >
                <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-mercury-grey)' }} />
                <p className="text-sm mb-1" style={{ color: 'var(--color-ink)' }}>Upload Additional Documents</p>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Optional supporting files</p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Internal Notes
              </label>
              <textarea
                value={formData.internalNotes}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                rows={4}
                placeholder="Add internal notes for approvers..."
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)', resize: 'vertical' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Vendor Notes
              </label>
              <textarea
                value={formData.vendorNotes}
                onChange={(e) => setFormData({ ...formData, vendorNotes: e.target.value })}
                rows={4}
                placeholder="Add notes from vendor..."
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)', resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* Section 7: Approval & Workflow */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
              <Clock className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Approval & Workflow</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Approval Workflow
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFormData({ ...formData, approvalWorkflow: 'auto' })}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: formData.approvalWorkflow === 'auto' ? 'var(--color-teal)' : 'var(--color-cloud)',
                    color: formData.approvalWorkflow === 'auto' ? '#FFFFFF' : 'var(--color-ink)',
                    border: `1px solid ${formData.approvalWorkflow === 'auto' ? 'var(--color-teal)' : 'var(--color-silver)'}`
                  }}
                >
                  Auto
                </button>
                <button
                  onClick={() => setFormData({ ...formData, approvalWorkflow: 'manual' })}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: formData.approvalWorkflow === 'manual' ? 'var(--color-teal)' : 'var(--color-cloud)',
                    color: formData.approvalWorkflow === 'manual' ? '#FFFFFF' : 'var(--color-ink)',
                    border: `1px solid ${formData.approvalWorkflow === 'manual' ? 'var(--color-teal)' : 'var(--color-silver)'}`
                  }}
                >
                  Manual
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                Priority Level
              </label>
              <select
                value={formData.priorityLevel}
                onChange={(e) => setFormData({ ...formData, priorityLevel: e.target.value })}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {formData.approvalWorkflow === 'manual' && (
              <div className="md:col-span-2">
                <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                  Select Approver(s)
                </label>
                <select className="w-full px-4 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}>
                  <option value="">Select Approver</option>
                  <option value="rajesh">Rajesh Kumar - PO Approver</option>
                  <option value="anjali">Anjali Singh - Finance Manager</option>
                  <option value="vikram">Vikram Reddy - CFO</option>
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <div className="rounded-lg p-4 flex items-start gap-3" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#92400E' }} />
                <div>
                  <p className="text-sm" style={{ color: '#92400E', fontWeight: '600' }}>Auto-Approval Rules</p>
                  <p className="text-sm mt-1" style={{ color: '#92400E' }}>
                    Invoices below ₹50,000 with 100% PO match will be auto-approved. 
                    All others require approval from Finance Manager.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Summary */}
        <div className="bg-white rounded-xl p-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6" style={{ color: 'var(--color-teal)' }} />
            <h3 className="text-lg" style={{ color: 'var(--color-ink)' }}>Validation Summary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
              <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Invoice header complete</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
              <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Line items validated</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: '#F59E0B' }} />
              <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Invoice document pending upload</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
              <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Tax calculations verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}