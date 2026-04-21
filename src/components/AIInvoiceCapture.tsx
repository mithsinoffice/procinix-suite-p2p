import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAPData } from '../contexts/APDataContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { 
  ArrowLeft, Save, Send, X, Upload, Plus, Trash2, 
  FileText, AlertCircle, CheckCircle, DollarSign, Calendar,
  User, Building2, Hash, CreditCard, Package, Clock, Sparkles,
  Edit3, AlertTriangle, Ban, Copy, Zap
} from 'lucide-react';

interface ExtractedField {
  value: any;
  confidence: number;
  isEdited: boolean;
  originalValue?: any;
}

interface LineItem {
  id: string;
  description: ExtractedField;
  quantity: ExtractedField;
  unitPrice: ExtractedField;
  taxPercent: ExtractedField;
  lineAmount: number;
  costCenter: string;
  glCode: string;
  department: string;
  projectCode: string;
}

interface Exception {
  type: 'price_mismatch' | 'quantity_mismatch' | 'tax_mismatch' | 'duplicate_invoice';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  details: string;
  affectedField?: string;
  suggestedAction?: string;
}

export function AIInvoiceCapture() {
  const navigate = useNavigate();
  const { addInvoice } = useAPData();
  const { getActiveVendors, getVendorByCode } = useMasterData();
  const activeVendors = getActiveVendors();
  const primaryVendor = activeVendors[0];
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionComplete, setExtractionComplete] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'PO' | 'Non-PO' | 'Expense'>('PO');
  const [gstApplicable, setGstApplicable] = useState(true);
  const [tdsApplicable, setTdsApplicable] = useState(false);
  const [matchType, setMatchType] = useState<'2-way' | '3-way'>('3-way');
  const [selectedPO, setSelectedPO] = useState('');
  const [selectedGRNs, setSelectedGRNs] = useState<string[]>([]);
  const [showExceptions, setShowExceptions] = useState(true);

  // Extracted fields with confidence scores
  const [extractedData, setExtractedData] = useState({
    vendorName: { value: primaryVendor?.name || '', confidence: 0.98, isEdited: false } as ExtractedField,
    vendorCode: { value: primaryVendor?.code || '', confidence: 0.95, isEdited: false } as ExtractedField,
    invoiceNumber: { value: 'INV-2024-1234', confidence: 0.99, isEdited: false } as ExtractedField,
    invoiceDate: { value: '2024-12-13', confidence: 0.97, isEdited: false } as ExtractedField,
    invoiceAmount: { value: '125000', confidence: 0.96, isEdited: false } as ExtractedField,
    currency: { value: 'INR', confidence: 0.99, isEdited: false } as ExtractedField,
    gstNumber: { value: primaryVendor?.gstin || '', confidence: 0.94, isEdited: false } as ExtractedField,
    poNumber: { value: 'PO-2024-001', confidence: 0.92, isEdited: false } as ExtractedField,
    paymentTerms: { value: 'Net 30', confidence: 0.88, isEdited: false } as ExtractedField,
    dueDate: { value: '2025-01-12', confidence: 0.90, isEdited: false } as ExtractedField,
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      description: { value: 'Cotton Fabric - Premium Grade', confidence: 0.95, isEdited: false },
      quantity: { value: 500, confidence: 0.98, isEdited: false },
      unitPrice: { value: 250, confidence: 0.97, isEdited: false },
      taxPercent: { value: 18, confidence: 0.99, isEdited: false },
      lineAmount: 125000,
      costCenter: 'CC-MFG-001',
      glCode: '5100 - Raw Materials',
      department: 'Manufacturing',
      projectCode: 'PRJ-001'
    }
  ]);

  // Exception detection
  const [exceptions, setExceptions] = useState<Exception[]>([
    {
      type: 'price_mismatch',
      severity: 'high',
      message: 'Price Mismatch Detected',
      details: 'Invoice unit price (₹250) differs from PO price (₹245). Variance: ₹5 (+2.04%)',
      affectedField: 'unitPrice',
      suggestedAction: 'Verify with vendor or update PO pricing'
    },
    {
      type: 'quantity_mismatch',
      severity: 'medium',
      message: 'Quantity Variance',
      details: 'Invoice quantity (500 units) exceeds GRN quantity (480 units). Over-delivery: 20 units',
      affectedField: 'quantity',
      suggestedAction: 'Check with warehouse team for actual received quantity'
    },
    {
      type: 'duplicate_invoice',
      severity: 'critical',
      message: 'Possible Duplicate Invoice',
      details: 'Invoice number INV-2024-1234 from vendor VEN-001 matches existing invoice (92% similarity)',
      suggestedAction: 'Review invoice INV-2024-001 submitted on 2024-12-10'
    }
  ]);

  const costCenters = ['CC-MFG-001', 'CC-MFG-002', 'CC-ADMIN-001', 'CC-SALES-001'];
  const glCodes = ['5100 - Raw Materials', '5200 - Packaging', '6100 - Utilities', '6200 - Services'];
  const departments = ['Manufacturing', 'Administration', 'Sales', 'Warehouse'];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Simulate AI extraction
      setIsExtracting(true);
      setTimeout(() => {
        setIsExtracting(false);
        setExtractionComplete(true);
      }, 2000);
    }
  };

  const handleFieldEdit = (field: keyof typeof extractedData, newValue: any) => {
    setExtractedData({
      ...extractedData,
      [field]: {
        ...extractedData[field],
        value: newValue,
        isEdited: true,
        originalValue: extractedData[field].originalValue || extractedData[field].value
      }
    });
  };

  const handleLineItemEdit = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item };
        if (field === 'description' || field === 'quantity' || field === 'unitPrice' || field === 'taxPercent') {
          updated[field] = {
            ...updated[field],
            value,
            isEdited: true,
            originalValue: updated[field].originalValue || updated[field].value
          };
          
          // Recalculate line amount
          if (field === 'quantity' || field === 'unitPrice') {
            updated.lineAmount = (updated.quantity.value || 0) * (updated.unitPrice.value || 0);
          }
        } else {
          (updated as any)[field] = value;
        }
        return updated;
      }
      return item;
    }));
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: { value: '', confidence: 1, isEdited: false },
      quantity: { value: 0, confidence: 1, isEdited: false },
      unitPrice: { value: 0, confidence: 1, isEdited: false },
      taxPercent: { value: 18, confidence: 1, isEdited: false },
      lineAmount: 0,
      costCenter: '',
      glCode: '',
      department: '',
      projectCode: ''
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.lineAmount, 0);
  };

  const calculateTax = () => {
    return lineItems.reduce((sum, item) => sum + (item.lineAmount * (item.taxPercent.value || 0) / 100), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const tds = tdsApplicable ? subtotal * 0.02 : 0;
    return subtotal + tax - tds;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.95) return 'var(--color-teal)'; // Teal - High confidence
    if (confidence >= 0.85) return '#F59E0B'; // Amber - Medium confidence
    return '#EF4444'; // Red - Low confidence
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.95) return 'High';
    if (confidence >= 0.85) return 'Medium';
    return 'Low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'var(--color-error-dark)';
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#007D87';
      default: return 'var(--color-mercury-grey)';
    }
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'duplicate_invoice': return Ban;
      case 'price_mismatch': return DollarSign;
      case 'quantity_mismatch': return Package;
      case 'tax_mismatch': return AlertTriangle;
      default: return AlertCircle;
    }
  };

  const dismissException = (index: number) => {
    setExceptions(exceptions.filter((_, i) => i !== index));
  };

  const persistInvoice = (status: 'Draft' | 'Pending Approval') => {
    if (!extractedData.vendorCode.value || !extractedData.invoiceNumber.value || !extractedData.invoiceDate.value) {
      alert('Vendor, invoice number, and invoice date are required.');
      return false;
    }

    const resolvedVendor = getVendorByCode(String(extractedData.vendorCode.value));

    addInvoice({
      id: `AI-INV-${Date.now()}`,
      invoiceNumber: String(extractedData.invoiceNumber.value),
      invoiceDate: String(extractedData.invoiceDate.value),
      vendorName: resolvedVendor?.name || String(extractedData.vendorName.value),
      vendorCode: resolvedVendor?.code || String(extractedData.vendorCode.value),
      invoiceType: extractedData.poNumber.value ? 'PO' : 'Non-PO',
      poNumber: extractedData.poNumber.value ? String(extractedData.poNumber.value) : undefined,
      totalAmount: calculateTotal(),
      currency: resolvedVendor?.currency || String(extractedData.currency.value || 'INR'),
      status,
      dueDate: extractedData.dueDate.value ? String(extractedData.dueDate.value) : undefined,
      approver: 'AP Team',
      paymentStatus: 'Unpaid',
      matchStatus: extractedData.poNumber.value ? (matchType === '3-way' ? '3-Way Matched' : 'Partially Matched') : 'Unmatched',
    });
    return true;
  };

  const handleSaveDraft = () => {
    persistInvoice('Draft');
  };

  const handleSubmit = () => {
    if (exceptions.length > 0) {
      const criticalExceptions = exceptions.filter(e => e.severity === 'critical');
      if (criticalExceptions.length > 0) {
        alert('Cannot submit: Critical exceptions must be resolved first');
        return;
      }
    }
    if (persistInvoice('Pending Approval')) {
      navigate('/invoices');
    }
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
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl" style={{ color: 'var(--color-ink)' }}>AI-Assisted Invoice Capture</h1>
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--color-teal)10' }}>
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>AI Powered</span>
                  </div>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Upload invoice document for automatic data extraction</p>
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
                disabled={!extractionComplete}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-mercury-grey)' }}
                onMouseEnter={(e) => !extractionComplete ? null : e.currentTarget.style.backgroundColor = '#5E6A72'}
                onMouseLeave={(e) => !extractionComplete ? null : e.currentTarget.style.backgroundColor = 'var(--color-mercury-grey)'}
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={handleSubmit}
                disabled={!extractionComplete}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-teal)' }}
                onMouseEnter={(e) => !extractionComplete ? null : e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
                onMouseLeave={(e) => !extractionComplete ? null : e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
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
        {/* Upload Section */}
        {!extractionComplete && (
          <div className="bg-white rounded-xl p-8 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
                <Upload className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Upload Invoice Document</h2>
            </div>

            <div className="flex items-center justify-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div 
                  className="border-2 border-dashed rounded-xl p-12 text-center hover:bg-gray-50 transition-colors"
                  style={{ borderColor: 'var(--color-silver)', minWidth: '600px' }}
                >
                  {isExtracting ? (
                    <div>
                      <Zap className="w-16 h-16 mx-auto mb-4 animate-pulse" style={{ color: 'var(--color-teal)' }} />
                      <p className="text-lg mb-2" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        AI Extracting Invoice Data...
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                        Processing document with OCR and intelligent field recognition
                      </p>
                      <div className="mt-4 w-64 mx-auto h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full animate-pulse"
                          style={{ backgroundColor: 'var(--color-teal)', width: '70%' }}
                        />
                      </div>
                    </div>
                  ) : uploadedFile ? (
                    <div>
                      <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-teal)' }} />
                      <p className="text-lg mb-2" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        {uploadedFile.name}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                        Click to upload a different file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-mercury-grey)' }} />
                      <p className="text-lg mb-2" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                        PDF, JPG, PNG up to 10MB
                      </p>
                      <p className="text-xs mt-4" style={{ color: 'var(--color-teal)' }}>
                        ✨ AI will automatically extract vendor details, line items, amounts, and dates
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {!isExtracting && uploadedFile && (
              <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-teal)10', border: '1px solid var(--color-teal)30' }}>
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-teal)' }} />
                  <div>
                    <p className="text-sm mb-2" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                      AI Extraction Features:
                    </p>
                    <ul className="text-sm space-y-1" style={{ color: 'var(--color-mercury-grey)' }}>
                      <li>• Intelligent OCR for scanned and digital invoices</li>
                      <li>• Auto-detection of vendor, invoice number, dates, and amounts</li>
                      <li>• Line item extraction with quantities and prices</li>
                      <li>• PO matching and duplicate invoice detection</li>
                      <li>• Confidence scoring for each extracted field</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Exceptions Panel */}
        {extractionComplete && exceptions.length > 0 && showExceptions && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                <h3 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  Exceptions Detected ({exceptions.length})
                </h3>
              </div>
              <button
                onClick={() => setShowExceptions(false)}
                className="text-sm px-4 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-mercury-grey)', backgroundColor: 'var(--color-cloud)' }}
              >
                Minimize
              </button>
            </div>

            {exceptions.map((exception, index) => {
              const Icon = getSeverityIcon(exception.type);
              return (
                <div 
                  key={index}
                  className="bg-white rounded-xl p-6"
                  style={{ border: `2px solid ${getSeverityColor(exception.severity)}40` }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${getSeverityColor(exception.severity)}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: getSeverityColor(exception.severity) }} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h4 style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                            {exception.message}
                          </h4>
                          <span 
                            className="px-3 py-1 rounded-full text-xs uppercase"
                            style={{ 
                              backgroundColor: `${getSeverityColor(exception.severity)}20`,
                              color: getSeverityColor(exception.severity),
                              fontWeight: '700',
                              letterSpacing: '0.5px'
                            }}
                          >
                            {exception.severity}
                          </span>
                        </div>
                        <button
                          onClick={() => dismissException(index)}
                          className="p-1 rounded-lg transition-colors"
                          style={{ color: 'var(--color-mercury-grey)' }}
                          title="Dismiss exception"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <p className="text-sm mb-3" style={{ color: 'var(--color-mercury-grey)' }}>
                        {exception.details}
                      </p>
                      
                      {exception.suggestedAction && (
                        <div 
                          className="p-3 rounded-lg flex items-start gap-2"
                          style={{ backgroundColor: 'var(--color-cloud)' }}
                        >
                          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-teal)' }} />
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>
                              Suggested Action:
                            </p>
                            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                              {exception.suggestedAction}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!showExceptions && exceptions.length > 0 && (
          <button
            onClick={() => setShowExceptions(true)}
            className="mb-6 w-full p-4 rounded-lg transition-colors flex items-center justify-between"
            style={{ backgroundColor: 'var(--color-error-light)', border: '1px solid #FCA5A5' }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
              <span style={{ color: '#EF4444', fontWeight: '600' }}>
                {exceptions.length} exception{exceptions.length > 1 ? 's' : ''} require attention
              </span>
            </div>
            <span className="text-sm" style={{ color: '#EF4444' }}>Click to expand</span>
          </button>
        )}

        {/* Extracted Data Display */}
        {extractionComplete && (
          <>
            {/* AI Extraction Summary */}
            <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid var(--color-teal)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
                    <Sparkles className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--color-ink)', fontWeight: '600' }}>AI Extraction Complete</h3>
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      Review extracted fields below. Edit any field to correct AI predictions.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl mb-1" style={{ color: 'var(--color-teal)', fontWeight: '700' }}>98%</p>
                    <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Avg Confidence</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>12</p>
                    <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Fields Extracted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl mb-1" style={{ color: '#EF4444', fontWeight: '700' }}>{exceptions.length}</p>
                    <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Exceptions</p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 flex items-center gap-6 text-sm" style={{ borderTop: '1px solid var(--color-silver)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--color-teal)20', border: '2px solid var(--color-teal)' }} />
                  <span style={{ color: 'var(--color-mercury-grey)' }}>AI Extracted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: '#FEF3C7', border: '2px solid #F59E0B' }}>
                    <Edit3 className="w-2 h-2" style={{ color: '#F59E0B' }} />
                  </div>
                  <span style={{ color: 'var(--color-mercury-grey)' }}>User Edited</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" style={{ color: '#EF4444' }} />
                  <span style={{ color: 'var(--color-mercury-grey)' }}>Has Exception</span>
                </div>
              </div>
            </div>

            {/* Invoice Header with AI Indicators */}
            <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
                  <FileText className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                </div>
                <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Invoice Header</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Vendor Name */}
                <div className="relative">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Vendor Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={extractedData.vendorName.value}
                      onChange={(e) => handleFieldEdit('vendorName', e.target.value)}
                      className="w-full px-4 py-2 pr-20 rounded-lg"
                      style={{ 
                        border: extractedData.vendorName.isEdited 
                          ? '2px solid #F59E0B' 
                          : '2px solid var(--color-teal)',
                        backgroundColor: extractedData.vendorName.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                        color: 'var(--color-ink)'
                      }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {extractedData.vendorName.isEdited && (
                        <Edit3 className="w-4 h-4" style={{ color: '#F59E0B' }} />
                      )}
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: getConfidenceColor(extractedData.vendorName.confidence) + '20',
                          color: getConfidenceColor(extractedData.vendorName.confidence),
                          fontWeight: '600'
                        }}
                      >
                        {Math.round(extractedData.vendorName.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  {extractedData.vendorName.isEdited && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                      Original: {extractedData.vendorName.originalValue}
                    </p>
                  )}
                </div>

                {/* Vendor Code */}
                <div className="relative">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Vendor Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={extractedData.vendorCode.value}
                      onChange={(e) => handleFieldEdit('vendorCode', e.target.value)}
                      className="w-full px-4 py-2 pr-20 rounded-lg"
                      style={{ 
                        border: extractedData.vendorCode.isEdited 
                          ? '2px solid #F59E0B' 
                          : '2px solid var(--color-teal)',
                        backgroundColor: extractedData.vendorCode.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                        color: 'var(--color-ink)'
                      }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {extractedData.vendorCode.isEdited && (
                        <Edit3 className="w-4 h-4" style={{ color: '#F59E0B' }} />
                      )}
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: getConfidenceColor(extractedData.vendorCode.confidence) + '20',
                          color: getConfidenceColor(extractedData.vendorCode.confidence),
                          fontWeight: '600'
                        }}
                      >
                        {Math.round(extractedData.vendorCode.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Invoice Number with Exception */}
                <div className="relative">
                  <label className="block text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Invoice Number <span style={{ color: '#EF4444' }}>*</span>
                    {exceptions.some(e => e.type === 'duplicate_invoice') && (
                      <AlertCircle className="w-4 h-4" style={{ color: '#EF4444' }} />
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={extractedData.invoiceNumber.value}
                      onChange={(e) => handleFieldEdit('invoiceNumber', e.target.value)}
                      className="w-full px-4 py-2 pr-20 rounded-lg"
                      style={{ 
                        border: exceptions.some(e => e.type === 'duplicate_invoice')
                          ? '2px solid #EF4444'
                          : extractedData.invoiceNumber.isEdited 
                          ? '2px solid #F59E0B' 
                          : '2px solid var(--color-teal)',
                        backgroundColor: exceptions.some(e => e.type === 'duplicate_invoice')
                          ? 'var(--color-error-light)'
                          : extractedData.invoiceNumber.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                        color: 'var(--color-ink)'
                      }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {extractedData.invoiceNumber.isEdited && (
                        <Edit3 className="w-4 h-4" style={{ color: '#F59E0B' }} />
                      )}
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: getConfidenceColor(extractedData.invoiceNumber.confidence) + '20',
                          color: getConfidenceColor(extractedData.invoiceNumber.confidence),
                          fontWeight: '600'
                        }}
                      >
                        {Math.round(extractedData.invoiceNumber.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Invoice Date */}
                <div className="relative">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Invoice Date <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={extractedData.invoiceDate.value}
                      onChange={(e) => handleFieldEdit('invoiceDate', e.target.value)}
                      className="w-full px-4 py-2 pr-20 rounded-lg"
                      style={{ 
                        border: extractedData.invoiceDate.isEdited 
                          ? '2px solid #F59E0B' 
                          : '2px solid var(--color-teal)',
                        backgroundColor: extractedData.invoiceDate.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                        color: 'var(--color-ink)'
                      }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {extractedData.invoiceDate.isEdited && (
                        <Edit3 className="w-4 h-4" style={{ color: '#F59E0B' }} />
                      )}
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: getConfidenceColor(extractedData.invoiceDate.confidence) + '20',
                          color: getConfidenceColor(extractedData.invoiceDate.confidence),
                          fontWeight: '600'
                        }}
                      >
                        {Math.round(extractedData.invoiceDate.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Invoice Amount */}
                <div className="relative">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Invoice Amount <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={extractedData.invoiceAmount.value}
                      onChange={(e) => handleFieldEdit('invoiceAmount', e.target.value)}
                      className="w-full px-4 py-2 pr-20 rounded-lg"
                      style={{ 
                        border: extractedData.invoiceAmount.isEdited 
                          ? '2px solid #F59E0B' 
                          : '2px solid var(--color-teal)',
                        backgroundColor: extractedData.invoiceAmount.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                        color: 'var(--color-ink)'
                      }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {extractedData.invoiceAmount.isEdited && (
                        <Edit3 className="w-4 h-4" style={{ color: '#F59E0B' }} />
                      )}
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: getConfidenceColor(extractedData.invoiceAmount.confidence) + '20',
                          color: getConfidenceColor(extractedData.invoiceAmount.confidence),
                          fontWeight: '600'
                        }}
                      >
                        {Math.round(extractedData.invoiceAmount.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Currency */}
                <div className="relative">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Currency
                  </label>
                  <div className="relative">
                    <select
                      value={extractedData.currency.value}
                      onChange={(e) => handleFieldEdit('currency', e.target.value)}
                      className="w-full px-4 py-2 pr-20 rounded-lg"
                      style={{ 
                        border: extractedData.currency.isEdited 
                          ? '2px solid #F59E0B' 
                          : '2px solid var(--color-teal)',
                        backgroundColor: extractedData.currency.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                        color: 'var(--color-ink)'
                      }}
                    >
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                      {extractedData.currency.isEdited && (
                        <Edit3 className="w-4 h-4" style={{ color: '#F59E0B' }} />
                      )}
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: getConfidenceColor(extractedData.currency.confidence) + '20',
                          color: getConfidenceColor(extractedData.currency.confidence),
                          fontWeight: '600'
                        }}
                      >
                        {Math.round(extractedData.currency.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* GST Number */}
                <div className="relative">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    GST Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={extractedData.gstNumber.value}
                      onChange={(e) => handleFieldEdit('gstNumber', e.target.value)}
                      className="w-full px-4 py-2 pr-20 rounded-lg"
                      style={{ 
                        border: extractedData.gstNumber.isEdited 
                          ? '2px solid #F59E0B' 
                          : '2px solid var(--color-teal)',
                        backgroundColor: extractedData.gstNumber.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                        color: 'var(--color-ink)'
                      }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {extractedData.gstNumber.isEdited && (
                        <Edit3 className="w-4 h-4" style={{ color: '#F59E0B' }} />
                      )}
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: getConfidenceColor(extractedData.gstNumber.confidence) + '20',
                          color: getConfidenceColor(extractedData.gstNumber.confidence),
                          fontWeight: '600'
                        }}
                      >
                        {Math.round(extractedData.gstNumber.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* PO Number */}
                <div className="relative">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    PO Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={extractedData.poNumber.value}
                      onChange={(e) => handleFieldEdit('poNumber', e.target.value)}
                      className="w-full px-4 py-2 pr-20 rounded-lg"
                      style={{ 
                        border: extractedData.poNumber.isEdited 
                          ? '2px solid #F59E0B' 
                          : '2px solid var(--color-teal)',
                        backgroundColor: extractedData.poNumber.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                        color: 'var(--color-ink)'
                      }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {extractedData.poNumber.isEdited && (
                        <Edit3 className="w-4 h-4" style={{ color: '#F59E0B' }} />
                      )}
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: getConfidenceColor(extractedData.poNumber.confidence) + '20',
                          color: getConfidenceColor(extractedData.poNumber.confidence),
                          fontWeight: '600'
                        }}
                      >
                        {Math.round(extractedData.poNumber.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="relative">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Payment Terms
                  </label>
                  <div className="relative">
                    <select
                      value={extractedData.paymentTerms.value}
                      onChange={(e) => handleFieldEdit('paymentTerms', e.target.value)}
                      className="w-full px-4 py-2 pr-20 rounded-lg"
                      style={{ 
                        border: extractedData.paymentTerms.isEdited 
                          ? '2px solid #F59E0B' 
                          : '2px solid var(--color-teal)',
                        backgroundColor: extractedData.paymentTerms.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                        color: 'var(--color-ink)'
                      }}
                    >
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 45">Net 45 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                    </select>
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                      {extractedData.paymentTerms.isEdited && (
                        <Edit3 className="w-4 h-4" style={{ color: '#F59E0B' }} />
                      )}
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: getConfidenceColor(extractedData.paymentTerms.confidence) + '20',
                          color: getConfidenceColor(extractedData.paymentTerms.confidence),
                          fontWeight: '600'
                        }}
                      >
                        {Math.round(extractedData.paymentTerms.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items with AI Indicators */}
            <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
                    <Hash className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                  </div>
                  <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Line Item Details (AI Extracted)</h2>
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
                      <th className="text-left px-4 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => {
                      const hasQuantityException = exceptions.some(e => e.type === 'quantity_mismatch' && e.affectedField === 'quantity');
                      const hasPriceException = exceptions.some(e => e.type === 'price_mismatch' && e.affectedField === 'unitPrice');
                      
                      return (
                        <tr key={item.id} style={{ borderTop: index > 0 ? '1px solid var(--color-silver)' : 'none' }}>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <input
                                type="text"
                                value={item.description.value}
                                onChange={(e) => handleLineItemEdit(item.id, 'description', e.target.value)}
                                className="w-full px-3 py-2 pr-16 rounded-lg text-sm"
                                style={{ 
                                  border: item.description.isEdited ? '2px solid #F59E0B' : '2px solid var(--color-teal)',
                                  backgroundColor: item.description.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                                  color: 'var(--color-ink)',
                                  minWidth: '250px'
                                }}
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                {item.description.isEdited && (
                                  <Edit3 className="w-3 h-3" style={{ color: '#F59E0B' }} />
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <input
                                type="number"
                                value={item.quantity.value || ''}
                                onChange={(e) => handleLineItemEdit(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 pr-16 rounded-lg text-sm"
                                style={{ 
                                  border: hasQuantityException 
                                    ? '2px solid #EF4444'
                                    : item.quantity.isEdited ? '2px solid #F59E0B' : '2px solid var(--color-teal)',
                                  backgroundColor: hasQuantityException
                                    ? 'var(--color-error-light)'
                                    : item.quantity.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                                  color: 'var(--color-ink)',
                                  minWidth: '120px'
                                }}
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {hasQuantityException && (
                                  <AlertCircle className="w-3 h-3" style={{ color: '#EF4444' }} />
                                )}
                                {item.quantity.isEdited && (
                                  <Edit3 className="w-3 h-3" style={{ color: '#F59E0B' }} />
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <input
                                type="number"
                                value={item.unitPrice.value || ''}
                                onChange={(e) => handleLineItemEdit(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 pr-16 rounded-lg text-sm"
                                style={{ 
                                  border: hasPriceException 
                                    ? '2px solid #EF4444'
                                    : item.unitPrice.isEdited ? '2px solid #F59E0B' : '2px solid var(--color-teal)',
                                  backgroundColor: hasPriceException
                                    ? 'var(--color-error-light)'
                                    : item.unitPrice.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                                  color: 'var(--color-ink)',
                                  minWidth: '120px'
                                }}
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {hasPriceException && (
                                  <AlertCircle className="w-3 h-3" style={{ color: '#EF4444' }} />
                                )}
                                {item.unitPrice.isEdited && (
                                  <Edit3 className="w-3 h-3" style={{ color: '#F59E0B' }} />
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <select
                                value={item.taxPercent.value}
                                onChange={(e) => handleLineItemEdit(item.id, 'taxPercent', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 pr-16 rounded-lg text-sm"
                                style={{ 
                                  border: item.taxPercent.isEdited ? '2px solid #F59E0B' : '2px solid var(--color-teal)',
                                  backgroundColor: item.taxPercent.isEdited ? '#FEF3C7' : 'var(--color-teal)10',
                                  color: 'var(--color-ink)',
                                  minWidth: '100px'
                                }}
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                              </select>
                              <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                                {item.taxPercent.isEdited && (
                                  <Edit3 className="w-3 h-3" style={{ color: '#F59E0B' }} />
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)', color: 'var(--color-ink)', fontWeight: '600' }}>
                              ₹{item.lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Summary */}
            <div className="bg-white rounded-xl p-6" style={{ border: '2px solid var(--color-silver)' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--color-mercury-grey)' }}>Subtotal:</span>
                    <span style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                      ₹{calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--color-mercury-grey)' }}>GST (18%):</span>
                    <span style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                      ₹{calculateTax().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-3" style={{ borderTop: '2px solid var(--color-silver)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>Total Invoice Value:</span>
                      <span className="text-2xl" style={{ color: 'var(--color-teal)', fontWeight: '700' }}>
                        ₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
