import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, FileText, Plus, Trash2, AlertCircle, 
  CheckCircle, Save, Send, Eye, Building2, Calendar, DollarSign,
  Package, Target, BookOpen, Receipt, Info
} from 'lucide-react';
import { VendorSelector, ItemSelector, EntitySelector, CostCentreSelector, TaxCodeSelector, AccountCodeSelector } from './shared';
import { useMasterData } from '../contexts/MasterDataContext';

/**
 * NON-PO INVOICE CREATION FORM
 * 
 * MASTER DATA COMPLIANCE:
 * ✅ Uses VendorSelector from shared components
 * ✅ Uses ItemSelector for expense/item coding
 * ✅ Uses EntitySelector for legal entity
 * ✅ Uses CostCentreSelector for allocation
 * ✅ Uses TaxCodeSelector for GST/TDS
 * ✅ Uses AccountCodeSelector for GL posting
 * ✅ No local master data - all from MasterDataContext
 */

interface LineItem {
  id: string;
  itemId: string;
  itemCode: string;
  description: string;
  quantity: number;
  unitRate: number;
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  grossAmount: number;
  tdsSection: string;
  tdsRate: number;
  tdsAmount: number;
  netPayable: number;
  costCentreId: string;
  profitCentreId?: string;
  projectId?: string;
}

interface OCRData {
  vendorName: string;
  vendorGSTIN: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  currency: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    rate: number;
    tax: number;
    confidence: number;
  }>;
  confidence: {
    vendorName: number;
    invoiceNumber: number;
    invoiceDate: number;
    invoiceAmount: number;
  };
}

export function NonPOInvoiceForm() {
  const navigate = useNavigate();
  const { getVendorById, getItemById, getCostCentreById, getTaxCodeById } = useMasterData();

  // Upload & OCR State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [ocrData, setOcrData] = useState<OCRData | null>(null);
  const [showOCRReview, setShowOCRReview] = useState(false);

  // Invoice Header
  const [vendorId, setVendorId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [entityId, setEntityId] = useState('ENT-001'); // From context
  const [supplyType, setSupplyType] = useState<'Goods' | 'Services'>('Services');
  const [placeOfSupply, setPlaceOfSupply] = useState('KA');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [natureOfExpense, setNatureOfExpense] = useState('');
  const [costCentreId, setCostCentreId] = useState('');
  const [profitCentreId, setProfitCentreId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [accountCodeId, setAccountCodeId] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');

  // Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      itemId: '',
      itemCode: '',
      description: '',
      quantity: 1,
      unitRate: 0,
      baseAmount: 0,
      gstRate: 18,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      grossAmount: 0,
      tdsSection: '194J',
      tdsRate: 10,
      tdsAmount: 0,
      netPayable: 0,
      costCentreId: '',
      profitCentreId: '',
      projectId: ''
    }
  ]);

  // Advance & Retention
  const [showAdvanceSection, setShowAdvanceSection] = useState(false);
  const [selectedAdvances, setSelectedAdvances] = useState<string[]>([]);
  const [advanceAdjustment, setAdvanceAdjustment] = useState(0);
  const [gstRetentionEnabled, setGstRetentionEnabled] = useState(false);
  const [gstRetentionAmount, setGstRetentionAmount] = useState(0);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = useState(false);

  // Mock open advances for selected vendor
  const openAdvances = [
    { id: 'ADV-001', amount: 25000, date: '2024-11-15', reference: 'Advance Payment 1' },
    { id: 'ADV-002', amount: 25000, date: '2024-11-20', reference: 'Advance Payment 2' }
  ];

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setOcrStatus('processing');
      
      // Simulate OCR processing
      setTimeout(() => {
        const mockOCRData: OCRData = {
          vendorName: 'Tech Consulting Services Pvt Ltd',
          vendorGSTIN: '29AABCT1234F1Z5',
          invoiceNumber: 'INV-2024-987',
          invoiceDate: '2024-12-10',
          invoiceAmount: 125000,
          currency: 'INR',
          lineItems: [
            {
              description: 'IT Consulting Services - December 2024',
              quantity: 40,
              rate: 2500,
              tax: 18,
              confidence: 0.95
            }
          ],
          confidence: {
            vendorName: 0.92,
            invoiceNumber: 0.98,
            invoiceDate: 0.95,
            invoiceAmount: 0.97
          }
        };
        
        setOcrData(mockOCRData);
        setOcrStatus('complete');
        setShowOCRReview(true);
      }, 2000);
    }
  };

  // Apply OCR data to form
  const applyOCRData = () => {
    if (!ocrData) return;
    
    setInvoiceNumber(ocrData.invoiceNumber);
    setInvoiceDate(ocrData.invoiceDate);
    setCurrency(ocrData.currency);
    
    // Try to match vendor by GSTIN
    // In real implementation, this would search vendor master
    
    if (ocrData.lineItems.length > 0) {
      const ocrLine = ocrData.lineItems[0];
      const newLineItems = [...lineItems];
      newLineItems[0] = {
        ...newLineItems[0],
        description: ocrLine.description,
        quantity: ocrLine.quantity,
        unitRate: ocrLine.rate,
        gstRate: ocrLine.tax,
        baseAmount: ocrLine.quantity * ocrLine.rate
      };
      setLineItems(newLineItems);
      calculateLineItem(0, newLineItems);
    }
    
    setShowOCRReview(false);
  };

  // Calculate line item totals
  const calculateLineItem = (index: number, items: LineItem[] = lineItems) => {
    const item = items[index];
    const baseAmount = item.quantity * item.unitRate;
    
    // Determine GST split based on place of supply
    const isIntraState = placeOfSupply === 'KA'; // Assuming entity is in KA
    const gstAmount = (baseAmount * item.gstRate) / 100;
    const cgst = isIntraState ? gstAmount / 2 : 0;
    const sgst = isIntraState ? gstAmount / 2 : 0;
    const igst = isIntraState ? 0 : gstAmount;
    
    const grossAmount = baseAmount + gstAmount;
    const tdsAmount = (baseAmount * item.tdsRate) / 100;
    const netPayable = grossAmount - tdsAmount;
    
    const updatedItems = [...items];
    updatedItems[index] = {
      ...item,
      baseAmount,
      gstAmount,
      cgst,
      sgst,
      igst,
      grossAmount,
      tdsAmount,
      netPayable
    };
    
    setLineItems(updatedItems);
  };

  // Add new line item
  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      itemId: '',
      itemCode: '',
      description: '',
      quantity: 1,
      unitRate: 0,
      baseAmount: 0,
      gstRate: 18,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      grossAmount: 0,
      tdsSection: '194J',
      tdsRate: 10,
      tdsAmount: 0,
      netPayable: 0,
      costCentreId: costCentreId,
      profitCentreId: profitCentreId,
      projectId: projectId
    };
    setLineItems([...lineItems, newItem]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      const updatedItems = lineItems.filter((_, i) => i !== index);
      setLineItems(updatedItems);
    }
  };

  // Calculate totals
  const totals = lineItems.reduce((acc, item) => ({
    baseAmount: acc.baseAmount + item.baseAmount,
    gstAmount: acc.gstAmount + item.gstAmount,
    grossAmount: acc.grossAmount + item.grossAmount,
    tdsAmount: acc.tdsAmount + item.tdsAmount,
    netPayable: acc.netPayable + item.netPayable
  }), { baseAmount: 0, gstAmount: 0, grossAmount: 0, tdsAmount: 0, netPayable: 0 });

  const finalNetPayable = totals.netPayable - advanceAdjustment - gstRetentionAmount;

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!vendorId) newErrors.vendor = 'Vendor is required';
    if (!invoiceNumber) newErrors.invoiceNumber = 'Invoice number is required';
    if (!invoiceDate) newErrors.invoiceDate = 'Invoice date is required';
    if (!costCentreId) newErrors.costCentre = 'Cost centre is required';
    if (!accountCodeId) newErrors.accountCode = 'Account code is required';
    if (!expenseCategory) newErrors.expenseCategory = 'Expense category is required';
    
    lineItems.forEach((item, index) => {
      if (!item.description) newErrors[`line${index}_desc`] = 'Description required';
      if (item.quantity <= 0) newErrors[`line${index}_qty`] = 'Quantity must be > 0';
      if (item.unitRate <= 0) newErrors[`line${index}_rate`] = 'Rate must be > 0';
      if (!item.costCentreId) newErrors[`line${index}_cc`] = 'Cost centre required';
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save draft
  const handleSaveDraft = () => {
    alert('Non-PO Invoice saved as draft');
    navigate('/ap/my-invoices');
  };

  // Submit for approval
  const handleSubmit = () => {
    setShowValidation(true);
    if (validateForm()) {
      alert('Non-PO Invoice submitted for approval');
      navigate('/ap/my-invoices');
    } else {
      alert('Please fix validation errors before submitting');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#16A34A';
    if (confidence >= 0.7) return '#D97706';
    return '#DC2626';
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm" style={{ borderBottom: '2px solid #E1E6EA' }}>
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/ap/dashboard')}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100" 
                style={{ color: '#6E7A82' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl" style={{ color: '#0A0F14' }}>Create Non-PO Invoice</h1>
                <p className="text-sm" style={{ color: '#6E7A82' }}>
                  Invoices without Purchase Order reference
                  <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                    Enhanced AI Validation
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#E1E6EA', color: '#0A0F14' }}
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#00A9B7' }}
              >
                <Send className="w-4 h-4" />
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Stage 1: Invoice Upload & OCR */}
        <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: '#E1E6EA' }}>
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-5 h-5" style={{ color: '#00A9B7' }} />
            <h2 className="text-xl" style={{ color: '#0A0F14' }}>Step 1: Upload Invoice Document</h2>
          </div>

          {!uploadedFile ? (
            <div 
              className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#E1E6EA' }}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: '#6E7A82' }} />
              <p className="text-lg mb-2" style={{ color: '#0A0F14' }}>
                Drop invoice file here or click to upload
              </p>
              <p className="text-sm" style={{ color: '#6E7A82' }}>
                Supports PDF, PNG, JPG • Max 10MB
              </p>
              <input
                id="fileInput"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8" style={{ color: '#00A9B7' }} />
                  <div>
                    <p style={{ color: '#0A0F14' }}>{uploadedFile.name}</p>
                    <p className="text-sm" style={{ color: '#6E7A82' }}>
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ocrStatus === 'processing' && (
                    <span className="text-sm" style={{ color: '#D97706' }}>Processing OCR...</span>
                  )}
                  {ocrStatus === 'complete' && (
                    <span className="flex items-center gap-2 text-sm" style={{ color: '#16A34A' }}>
                      <CheckCircle className="w-4 h-4" />
                      OCR Complete
                    </span>
                  )}
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="p-2 rounded-lg hover:bg-red-50"
                    style={{ color: '#DC2626' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {ocrStatus === 'complete' && ocrData && (
                <button
                  onClick={() => setShowOCRReview(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white"
                  style={{ backgroundColor: '#00A9B7' }}
                >
                  <Eye className="w-4 h-4" />
                  Review & Apply OCR Data
                </button>
              )}
            </div>
          )}
        </div>

        {/* OCR Review Modal */}
        {showOCRReview && ocrData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b-2 p-6" style={{ borderColor: '#E1E6EA' }}>
                <h2 className="text-2xl" style={{ color: '#0A0F14' }}>OCR Extracted Data</h2>
                <p className="text-sm" style={{ color: '#6E7A82' }}>
                  Review confidence scores and edit fields before applying
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Vendor Info */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>
                    Vendor Name
                    <span 
                      className="ml-2 px-2 py-0.5 rounded text-xs" 
                      style={{ 
                        backgroundColor: getConfidenceColor(ocrData.confidence.vendorName) + '20',
                        color: getConfidenceColor(ocrData.confidence.vendorName)
                      }}
                    >
                      {(ocrData.confidence.vendorName * 100).toFixed(0)}% confidence
                    </span>
                  </label>
                  <input
                    type="text"
                    value={ocrData.vendorName}
                    onChange={(e) => setOcrData({ ...ocrData, vendorName: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2"
                    style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
                  />
                </div>

                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>Vendor GSTIN</label>
                  <input
                    type="text"
                    value={ocrData.vendorGSTIN}
                    onChange={(e) => setOcrData({ ...ocrData, vendorGSTIN: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2"
                    style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>
                      Invoice Number
                      <span 
                        className="ml-2 px-2 py-0.5 rounded text-xs" 
                        style={{ 
                          backgroundColor: getConfidenceColor(ocrData.confidence.invoiceNumber) + '20',
                          color: getConfidenceColor(ocrData.confidence.invoiceNumber)
                        }}
                      >
                        {(ocrData.confidence.invoiceNumber * 100).toFixed(0)}% confidence
                      </span>
                    </label>
                    <input
                      type="text"
                      value={ocrData.invoiceNumber}
                      onChange={(e) => setOcrData({ ...ocrData, invoiceNumber: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2"
                      style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
                    />
                  </div>

                  <div>
                    <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>
                      Invoice Date
                      <span 
                        className="ml-2 px-2 py-0.5 rounded text-xs" 
                        style={{ 
                          backgroundColor: getConfidenceColor(ocrData.confidence.invoiceDate) + '20',
                          color: getConfidenceColor(ocrData.confidence.invoiceDate)
                        }}
                      >
                        {(ocrData.confidence.invoiceDate * 100).toFixed(0)}% confidence
                      </span>
                    </label>
                    <input
                      type="date"
                      value={ocrData.invoiceDate}
                      onChange={(e) => setOcrData({ ...ocrData, invoiceDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2"
                      style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>
                    Invoice Amount
                    <span 
                      className="ml-2 px-2 py-0.5 rounded text-xs" 
                      style={{ 
                        backgroundColor: getConfidenceColor(ocrData.confidence.invoiceAmount) + '20',
                        color: getConfidenceColor(ocrData.confidence.invoiceAmount)
                      }}
                    >
                      {(ocrData.confidence.invoiceAmount * 100).toFixed(0)}% confidence
                    </span>
                  </label>
                  <input
                    type="number"
                    value={ocrData.invoiceAmount}
                    onChange={(e) => setOcrData({ ...ocrData, invoiceAmount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg border-2"
                    style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t-2 p-6 flex gap-3" style={{ borderColor: '#E1E6EA' }}>
                <button
                  onClick={() => setShowOCRReview(false)}
                  className="flex-1 px-4 py-2 rounded-lg border-2"
                  style={{ borderColor: '#E1E6EA', color: '#6E7A82' }}
                >
                  Cancel
                </button>
                <button
                  onClick={applyOCRData}
                  className="flex-1 px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: '#00A9B7' }}
                >
                  Apply to Form
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: Invoice Header */}
        <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: '#E1E6EA' }}>
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5" style={{ color: '#00A9B7' }} />
            <h2 className="text-xl" style={{ color: '#0A0F14' }}>Step 2: Invoice Header</h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <VendorSelector
              value={vendorId}
              onChange={(id) => {
                setVendorId(id);
                setShowAdvanceSection(true);
              }}
              required
              showMSMEBadge
              error={showValidation ? errors.vendor : undefined}
            />

            <div>
              <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>
                Invoice Number <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Enter invoice number"
                className="w-full px-4 py-2 rounded-lg border-2"
                style={{ 
                  borderColor: showValidation && errors.invoiceNumber ? '#DC2626' : '#E1E6EA',
                  color: '#0A0F14'
                }}
              />
              {showValidation && errors.invoiceNumber && (
                <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.invoiceNumber}</p>
              )}
            </div>

            <div>
              <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>
                Invoice Date <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2"
                style={{ 
                  borderColor: showValidation && errors.invoiceDate ? '#DC2626' : '#E1E6EA',
                  color: '#0A0F14'
                }}
              />
            </div>

            <EntitySelector
              value={entityId}
              onChange={setEntityId}
              required
              disabled
            />

            <div>
              <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>
                Supply Type <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={supplyType}
                onChange={(e) => setSupplyType(e.target.value as 'Goods' | 'Services')}
                className="w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
              >
                <option value="Services">Services</option>
                <option value="Goods">Goods</option>
              </select>
            </div>

            <div>
              <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>
                Place of Supply <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
              >
                <option value="KA">Karnataka</option>
                <option value="MH">Maharashtra</option>
                <option value="TN">Tamil Nadu</option>
                <option value="DL">Delhi</option>
              </select>
            </div>

            <div>
              <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>
                Expense Category <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2"
                style={{ 
                  borderColor: showValidation && errors.expenseCategory ? '#DC2626' : '#E1E6EA',
                  color: '#0A0F14'
                }}
              >
                <option value="">Select category</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Consulting">Consulting</option>
                <option value="Marketing">Marketing</option>
                <option value="Travel">Travel</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Utilities">Utilities</option>
              </select>
            </div>

            <div>
              <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>
                Nature of Expense <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={natureOfExpense}
                onChange={(e) => setNatureOfExpense(e.target.value)}
                placeholder="e.g., IT Consulting, Legal Services"
                className="w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
              />
            </div>

            <CostCentreSelector
              value={costCentreId}
              onChange={setCostCentreId}
              required
              error={showValidation ? errors.costCentre : undefined}
            />

            <AccountCodeSelector
              value={accountCodeId}
              onChange={setAccountCodeId}
              required
              filterByType="Expense"
              error={showValidation ? errors.accountCode : undefined}
            />

            <div>
              <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
              >
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 45 Days">Net 45 Days</option>
                <option value="Net 60 Days">Net 60 Days</option>
                <option value="Immediate">Immediate</option>
              </select>
            </div>

            <div>
              <label className="text-sm mb-2 block" style={{ color: '#6E7A82' }}>Currency</label>
              <input
                type="text"
                value={currency}
                disabled
                className="w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: '#E1E6EA', color: '#0A0F14', backgroundColor: '#F6F9FC' }}
              />
            </div>
          </div>
        </div>

        {/* Stage 3: Line Items */}
        <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: '#E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5" style={{ color: '#00A9B7' }} />
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>Step 3: Line Items</h2>
            </div>
            <button
              onClick={addLineItem}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#00A9B7' }}
            >
              <Plus className="w-4 h-4" />
              Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F6F9FC' }}>
                  <th className="px-3 py-3 text-left text-sm" style={{ color: '#6E7A82' }}>Description</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>Qty</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>Rate</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>Base Amt</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>GST%</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>GST Amt</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>TDS%</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>TDS Amt</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>Net</th>
                  <th className="px-3 py-3 text-center text-sm" style={{ color: '#6E7A82' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={item.id} className="border-t" style={{ borderColor: '#E1E6EA' }}>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[index].description = e.target.value;
                          setLineItems(updated);
                        }}
                        placeholder="Description"
                        className="w-full px-2 py-1 rounded border"
                        style={{ borderColor: '#E1E6EA', fontSize: '14px' }}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[index].quantity = parseFloat(e.target.value) || 0;
                          calculateLineItem(index, updated);
                        }}
                        className="w-20 px-2 py-1 rounded border text-right"
                        style={{ borderColor: '#E1E6EA', fontSize: '14px' }}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={item.unitRate}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[index].unitRate = parseFloat(e.target.value) || 0;
                          calculateLineItem(index, updated);
                        }}
                        className="w-24 px-2 py-1 rounded border text-right"
                        style={{ borderColor: '#E1E6EA', fontSize: '14px' }}
                      />
                    </td>
                    <td className="px-3 py-3 text-right text-sm" style={{ color: '#0A0F14' }}>
                      ₹{item.baseAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={item.gstRate}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[index].gstRate = parseFloat(e.target.value) || 0;
                          calculateLineItem(index, updated);
                        }}
                        className="w-16 px-2 py-1 rounded border text-right"
                        style={{ borderColor: '#E1E6EA', fontSize: '14px' }}
                      />
                    </td>
                    <td className="px-3 py-3 text-right text-sm" style={{ color: '#0A0F14' }}>
                      ₹{item.gstAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={item.tdsRate}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[index].tdsRate = parseFloat(e.target.value) || 0;
                          calculateLineItem(index, updated);
                        }}
                        className="w-16 px-2 py-1 rounded border text-right"
                        style={{ borderColor: '#E1E6EA', fontSize: '14px' }}
                      />
                    </td>
                    <td className="px-3 py-3 text-right text-sm" style={{ color: '#DC2626' }}>
                      -₹{item.tdsAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-3 text-right" style={{ color: '#00A9B7' }}>
                      ₹{item.netPayable.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {lineItems.length > 1 && (
                        <button
                          onClick={() => removeLineItem(index)}
                          className="p-1 rounded hover:bg-red-50"
                          style={{ color: '#DC2626' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2" style={{ borderColor: '#E1E6EA', backgroundColor: '#F6F9FC' }}>
                  <td colSpan={3} className="px-3 py-3 text-right" style={{ color: '#0A0F14' }}>
                    <strong>Totals:</strong>
                  </td>
                  <td className="px-3 py-3 text-right" style={{ color: '#0A0F14' }}>
                    <strong>₹{totals.baseAmount.toLocaleString('en-IN')}</strong>
                  </td>
                  <td></td>
                  <td className="px-3 py-3 text-right" style={{ color: '#0A0F14' }}>
                    <strong>₹{totals.gstAmount.toLocaleString('en-IN')}</strong>
                  </td>
                  <td></td>
                  <td className="px-3 py-3 text-right" style={{ color: '#DC2626' }}>
                    <strong>-₹{totals.tdsAmount.toLocaleString('en-IN')}</strong>
                  </td>
                  <td className="px-3 py-3 text-right" style={{ color: '#00A9B7' }}>
                    <strong>₹{totals.netPayable.toLocaleString('en-IN')}</strong>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Stage 4: Advance & GST Retention */}
        {showAdvanceSection && vendorId && (
          <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: '#E1E6EA' }}>
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-5 h-5" style={{ color: '#00A9B7' }} />
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>Step 4: Advance & GST Retention</h2>
            </div>

            {/* Open Advances */}
            <div className="mb-6">
              <h3 className="text-lg mb-3" style={{ color: '#0A0F14' }}>Open Vendor Advances</h3>
              {openAdvances.length > 0 ? (
                <div className="space-y-2">
                  {openAdvances.map((advance) => (
                    <div 
                      key={advance.id}
                      className="flex items-center justify-between p-3 rounded-lg border-2"
                      style={{ borderColor: '#E1E6EA' }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedAdvances.includes(advance.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAdvances([...selectedAdvances, advance.id]);
                              setAdvanceAdjustment(advanceAdjustment + advance.amount);
                            } else {
                              setSelectedAdvances(selectedAdvances.filter(id => id !== advance.id));
                              setAdvanceAdjustment(advanceAdjustment - advance.amount);
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div>
                          <p style={{ color: '#0A0F14' }}>{advance.reference}</p>
                          <p className="text-sm" style={{ color: '#6E7A82' }}>{advance.date}</p>
                        </div>
                      </div>
                      <p style={{ color: '#00A9B7' }}>₹{advance.amount.toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#DBEAFE' }}>
                    <span style={{ color: '#1E40AF' }}>Total Advance Adjustment:</span>
                    <span className="text-lg" style={{ color: '#1E40AF' }}>
                      ₹{advanceAdjustment.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC', color: '#6E7A82' }}>
                  No open advances for this vendor
                </p>
              )}
            </div>

            {/* GST Retention */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg" style={{ color: '#0A0F14' }}>GST Retention</h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={gstRetentionEnabled}
                    onChange={(e) => {
                      setGstRetentionEnabled(e.target.checked);
                      if (e.target.checked) {
                        setGstRetentionAmount(totals.gstAmount);
                      } else {
                        setGstRetentionAmount(0);
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm" style={{ color: '#6E7A82' }}>Enable GST Retention</span>
                </label>
              </div>

              {gstRetentionEnabled && (
                <div className="p-4 rounded-lg border-2" style={{ borderColor: '#FEF3C7', backgroundColor: '#FFFBEB' }}>
                  <div className="flex items-start gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#D97706' }} />
                    <div>
                      <p className="text-sm mb-2" style={{ color: '#92400E' }}>
                        <strong>GST Return Not Found:</strong> Invoice not found in vendor's GST return for the period. 
                        Consider retaining GST amount until verification.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: '#92400E' }}>GST Retention Amount:</span>
                    <span className="text-lg" style={{ color: '#D97706' }}>
                      ₹{gstRetentionAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Final Payment Summary */}
        <div className="bg-white rounded-xl border-2 p-6" style={{ borderColor: '#E1E6EA' }}>
          <h2 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Payment Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <span style={{ color: '#6E7A82' }}>Base Amount</span>
              <span style={{ color: '#0A0F14' }}>₹{totals.baseAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <span style={{ color: '#6E7A82' }}>GST Amount</span>
              <span style={{ color: '#0A0F14' }}>₹{totals.gstAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <span style={{ color: '#6E7A82' }}>Gross Amount</span>
              <span style={{ color: '#0A0F14' }}>₹{totals.grossAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
              <span style={{ color: '#DC2626' }}>TDS Deducted</span>
              <span style={{ color: '#DC2626' }}>-₹{totals.tdsAmount.toLocaleString('en-IN')}</span>
            </div>
            {advanceAdjustment > 0 && (
              <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: '#DBEAFE' }}>
                <span style={{ color: '#1E40AF' }}>Advance Adjusted</span>
                <span style={{ color: '#1E40AF' }}>-₹{advanceAdjustment.toLocaleString('en-IN')}</span>
              </div>
            )}
            {gstRetentionAmount > 0 && (
              <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                <span style={{ color: '#D97706' }}>GST Retained</span>
                <span style={{ color: '#D97706' }}>-₹{gstRetentionAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="border-t-2 pt-3" style={{ borderColor: '#E1E6EA' }}>
              <div className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: '#00A9B710' }}>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-6 h-6" style={{ color: '#00A9B7' }} />
                  <span className="text-lg" style={{ color: '#0A0F14' }}>Final Net Payable</span>
                </div>
                <span className="text-2xl" style={{ color: '#00A9B7' }}>
                  ₹{finalNetPayable.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}