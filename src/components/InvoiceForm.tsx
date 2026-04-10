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
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-white shadow-sm" style={{ borderBottom: '2px solid #E1E6EA' }}>
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleCancel}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100" 
                style={{ color: '#6E7A82' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl" style={{ color: '#0A0F14' }}>Create Invoice</h1>
                <p className="text-sm" style={{ color: '#6E7A82' }}>Capture and process supplier invoice</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#E1E6EA', color: '#0A0F14' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D1D6DA'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E1E6EA'}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#6E7A82' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5E6A72'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6E7A82'}
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#00A9B7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
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
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00A9B710' }}>
              <CreditCard className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <h2 className="text-xl" style={{ color: '#0A0F14' }}>Invoice Type</h2>
          </div>

          <div>
            <label className="block text-sm mb-3" style={{ color: '#6E7A82' }}>
              Select Invoice Type <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div className="flex items-center gap-4 max-w-2xl">
              {(['PO', 'Non PO', 'Rent', 'Utilities'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setInvoiceType(type)}
                  className="flex-1 px-6 py-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: invoiceType === type ? '#00A9B7' : '#F6F9FC',
                    color: invoiceType === type ? '#FFFFFF' : '#0A0F14',
                    border: `2px solid ${invoiceType === type ? '#00A9B7' : '#E1E6EA'}`,
                    fontWeight: invoiceType === type ? '600' : '500'
                  }}
                  onMouseEnter={(e) => {
                    if (invoiceType !== type) {
                      e.currentTarget.style.backgroundColor = '#E1E6EA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (invoiceType !== type) {
                      e.currentTarget.style.backgroundColor = '#F6F9FC';
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
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00A9B710' }}>
              <FileText className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <h2 className="text-xl" style={{ color: '#0A0F14' }}>Invoice Header</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Vendor Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={formData.vendorCode}
                onChange={(e) => handleVendorChange(e.target.value)}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
              >
                <option value="">Select Vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor.code} value={vendor.code}>{vendor.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Vendor Code
              </label>
              <input
                type="text"
                value={formData.vendorCode}
                disabled
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', backgroundColor: '#F6F9FC', color: '#6E7A82' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Invoice Number <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="INV-2024-001"
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Invoice Date <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Invoice Amount <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="number"
                value={formData.invoiceAmount}
                onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
              >
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                GST Applicable
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGstApplicable(true)}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: gstApplicable ? '#00A9B7' : '#F6F9FC',
                    color: gstApplicable ? '#FFFFFF' : '#0A0F14',
                    border: `1px solid ${gstApplicable ? '#00A9B7' : '#E1E6EA'}`
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setGstApplicable(false)}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: !gstApplicable ? '#00A9B7' : '#F6F9FC',
                    color: !gstApplicable ? '#FFFFFF' : '#0A0F14',
                    border: `1px solid ${!gstApplicable ? '#00A9B7' : '#E1E6EA'}`
                  }}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                GST Number
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                disabled
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', backgroundColor: '#F6F9FC', color: '#6E7A82' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: PO / GRN Reference (Conditional) */}
        {invoiceType === 'PO' && (
          <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00A9B710' }}>
                <Package className="w-5 h-5" style={{ color: '#00A9B7' }} />
              </div>
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>PO / GRN Reference</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  PO Number <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={selectedPO}
                  onChange={(e) => setSelectedPO(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
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
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  Match Type
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMatchType('2-way')}
                    className="flex-1 px-4 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: matchType === '2-way' ? '#00A9B7' : '#F6F9FC',
                      color: matchType === '2-way' ? '#FFFFFF' : '#0A0F14',
                      border: `1px solid ${matchType === '2-way' ? '#00A9B7' : '#E1E6EA'}`
                    }}
                  >
                    2-Way Match
                  </button>
                  <button
                    onClick={() => setMatchType('3-way')}
                    className="flex-1 px-4 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: matchType === '3-way' ? '#00A9B7' : '#F6F9FC',
                      color: matchType === '3-way' ? '#FFFFFF' : '#0A0F14',
                      border: `1px solid ${matchType === '3-way' ? '#00A9B7' : '#E1E6EA'}`
                    }}
                  >
                    3-Way Match
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  GRN Number(s)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {grnNumbers.map(grn => (
                    <label key={grn} className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer" style={{ border: '1px solid #E1E6EA' }}>
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
                        style={{ accentColor: '#00A9B7' }}
                      />
                      <span style={{ color: '#0A0F14' }}>{grn}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  Matched Amount
                </label>
                <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: '#00A9B710', border: '1px solid #00A9B730' }}>
                  <p style={{ color: '#00A9B7', fontWeight: '600' }}>₹1,18,500</p>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  Unmatched Amount
                </label>
                <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
                  <p style={{ color: '#EF4444', fontWeight: '600' }}>₹6,500</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Line Item Details */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00A9B710' }}>
                <Hash className="w-5 h-5" style={{ color: '#00A9B7' }} />
              </div>
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>Line Item Details</h2>
            </div>
            <button
              onClick={addLineItem}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: '#00A9B7' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
            >
              <Plus className="w-4 h-4" />
              Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F6F9FC' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Description</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Quantity</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Unit Price</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Tax %</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Line Amount</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Cost Center</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>GL Code</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Department</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Project</th>
                  <th className="text-center px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={item.id} style={{ borderTop: index > 0 ? '1px solid #E1E6EA' : 'none' }}>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.itemDescription}
                        onChange={(e) => updateLineItem(item.id, 'itemDescription', e.target.value)}
                        placeholder="Item description"
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid #E1E6EA', color: '#0A0F14', minWidth: '200px' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.qty || ''}
                        onChange={(e) => updateLineItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid #E1E6EA', color: '#0A0F14', minWidth: '80px' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid #E1E6EA', color: '#0A0F14', minWidth: '100px' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.gstPercent}
                        onChange={(e) => updateLineItem(item.id, 'gstPercent', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid #E1E6EA', color: '#0A0F14', minWidth: '80px' }}
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
                        style={{ border: '1px solid #E1E6EA', backgroundColor: '#F6F9FC', color: '#0A0F14', minWidth: '120px' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.costCentre}
                        onChange={(e) => updateLineItem(item.id, 'costCentre', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid #E1E6EA', color: '#0A0F14', minWidth: '120px' }}
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
                        style={{ border: '1px solid #E1E6EA', color: '#0A0F14', minWidth: '180px' }}
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
                        style={{ border: '1px solid #E1E6EA', color: '#0A0F14', minWidth: '140px' }}
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
                        style={{ border: '1px solid #E1E6EA', color: '#0A0F14', minWidth: '100px' }}
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
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00A9B710' }}>
              <DollarSign className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <h2 className="text-xl" style={{ color: '#0A0F14' }}>Tax & Charges Summary</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Taxable Value
              </label>
              <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}>
                <p style={{ color: '#0A0F14', fontWeight: '600' }}>
                  ₹{calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                GST Amount (CGST + SGST / IGST)
              </label>
              <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}>
                <p style={{ color: '#0A0F14', fontWeight: '600' }}>
                  ₹{calculateTax().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                TDS Applicable
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTdsApplicable(true)}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: tdsApplicable ? '#00A9B7' : '#F6F9FC',
                    color: tdsApplicable ? '#FFFFFF' : '#0A0F14',
                    border: `1px solid ${tdsApplicable ? '#00A9B7' : '#E1E6EA'}`
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setTdsApplicable(false)}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: !tdsApplicable ? '#00A9B7' : '#F6F9FC',
                    color: !tdsApplicable ? '#FFFFFF' : '#0A0F14',
                    border: `1px solid ${!tdsApplicable ? '#00A9B7' : '#E1E6EA'}`
                  }}
                >
                  No
                </button>
              </div>
            </div>

            {tdsApplicable && (
              <>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                    TDS Section
                  </label>
                  <select className="w-full px-4 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}>
                    <option value="">Select TDS Section</option>
                    <option value="194C">194C - Contractor Payments</option>
                    <option value="194J">194J - Professional Services</option>
                    <option value="194I">194I - Rent</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
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
              <div className="rounded-lg p-4" style={{ backgroundColor: '#00A9B710', border: '2px solid #00A9B7' }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#0A0F14', fontWeight: '600' }}>Total Invoice Value</span>
                  <span className="text-2xl" style={{ color: '#00A9B7', fontWeight: '700' }}>
                    ₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Payment Terms & Cashflow Impact */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00A9B710' }}>
              <Calendar className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <h2 className="text-xl" style={{ color: '#0A0F14' }}>Payment Terms & Cashflow Impact</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Payment Terms
              </label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
              >
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 45">Net 45 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="Net 90">Net 90 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Invoice Due Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', backgroundColor: '#F6F9FC', color: '#6E7A82' }}
                disabled
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Early Payment Discount (%)
              </label>
              <input
                type="number"
                value={formData.earlyPaymentDiscount}
                onChange={(e) => setFormData({ ...formData, earlyPaymentDiscount: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Expected Payment Date
              </label>
              <input
                type="date"
                value={formData.expectedPaymentDate}
                onChange={(e) => setFormData({ ...formData, expectedPaymentDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Cashflow Month
              </label>
              <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}>
                <p style={{ color: '#0A0F14' }}>January 2025</p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Cashflow Impact
              </label>
              <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
                <p style={{ color: '#EF4444', fontWeight: '600' }}>
                  -₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Attachments & Notes */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00A9B710' }}>
              <Upload className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <h2 className="text-xl" style={{ color: '#0A0F14' }}>Attachments & Notes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Invoice Document <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#E1E6EA' }}
              >
                <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: '#6E7A82' }} />
                <p className="text-sm mb-1" style={{ color: '#0A0F14' }}>Upload Invoice PDF/Image</p>
                <p className="text-xs" style={{ color: '#6E7A82' }}>PDF, JPG, PNG up to 10MB</p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Supporting Documents
              </label>
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#E1E6EA' }}
              >
                <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: '#6E7A82' }} />
                <p className="text-sm mb-1" style={{ color: '#0A0F14' }}>Upload Additional Documents</p>
                <p className="text-xs" style={{ color: '#6E7A82' }}>Optional supporting files</p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Internal Notes
              </label>
              <textarea
                value={formData.internalNotes}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                rows={4}
                placeholder="Add internal notes for approvers..."
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14', resize: 'vertical' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Vendor Notes
              </label>
              <textarea
                value={formData.vendorNotes}
                onChange={(e) => setFormData({ ...formData, vendorNotes: e.target.value })}
                rows={4}
                placeholder="Add notes from vendor..."
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14', resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* Section 7: Approval & Workflow */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00A9B710' }}>
              <Clock className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <h2 className="text-xl" style={{ color: '#0A0F14' }}>Approval & Workflow</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Approval Workflow
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFormData({ ...formData, approvalWorkflow: 'auto' })}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: formData.approvalWorkflow === 'auto' ? '#00A9B7' : '#F6F9FC',
                    color: formData.approvalWorkflow === 'auto' ? '#FFFFFF' : '#0A0F14',
                    border: `1px solid ${formData.approvalWorkflow === 'auto' ? '#00A9B7' : '#E1E6EA'}`
                  }}
                >
                  Auto
                </button>
                <button
                  onClick={() => setFormData({ ...formData, approvalWorkflow: 'manual' })}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: formData.approvalWorkflow === 'manual' ? '#00A9B7' : '#F6F9FC',
                    color: formData.approvalWorkflow === 'manual' ? '#FFFFFF' : '#0A0F14',
                    border: `1px solid ${formData.approvalWorkflow === 'manual' ? '#00A9B7' : '#E1E6EA'}`
                  }}
                >
                  Manual
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Priority Level
              </label>
              <select
                value={formData.priorityLevel}
                onChange={(e) => setFormData({ ...formData, priorityLevel: e.target.value })}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {formData.approvalWorkflow === 'manual' && (
              <div className="md:col-span-2">
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  Select Approver(s)
                </label>
                <select className="w-full px-4 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}>
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
        <div className="bg-white rounded-xl p-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6" style={{ color: '#00A9B7' }} />
            <h3 className="text-lg" style={{ color: '#0A0F14' }}>Validation Summary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#00A9B7' }} />
              <span className="text-sm" style={{ color: '#6E7A82' }}>Invoice header complete</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#00A9B7' }} />
              <span className="text-sm" style={{ color: '#6E7A82' }}>Line items validated</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: '#F59E0B' }} />
              <span className="text-sm" style={{ color: '#6E7A82' }}>Invoice document pending upload</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#00A9B7' }} />
              <span className="text-sm" style={{ color: '#6E7A82' }}>Tax calculations verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}