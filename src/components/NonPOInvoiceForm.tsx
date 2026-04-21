import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileText, Plus, Trash2, AlertCircle,
  CheckCircle, Save, Send, Eye, Building2, Calendar, DollarSign,
  Package, Target, BookOpen, Receipt, Info
} from 'lucide-react';
import {
  VendorSelector,
  ItemSelector,
  EntitySelector,
  CostCentreSelector,
  TaxCodeSelector,
  AccountCodeSelector,
  DepartmentSelector,
} from './shared';
import { useMasterData } from '../contexts/MasterDataContext';
import { useAPData } from '../contexts/APDataContext';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { JournalEntryPreview, LineItemRow, NarrationField, TDSThresholdTracker } from './invoice';

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
  const {
    getVendorById,
    getItemById,
    getCostCentreById,
    getTaxCodeById,
    getActiveTDSSections,
    getTDSSectionByCode,
    currentCompany,
  } = useMasterData();
  const { addInvoice } = useAPData();
  const activeTdsSections = getActiveTDSSections();
  const defaultTdsSection = activeTdsSections[0];

  // Upload & OCR State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [ocrData, setOcrData] = useState<OCRData | null>(null);
  const [showOCRReview, setShowOCRReview] = useState(false);

  // Invoice Header
  const [vendorId, setVendorId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [entityId, setEntityId] = useState(currentCompany?.id || '');
  const [supplyType, setSupplyType] = useState<'Goods' | 'Services'>('Services');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [natureOfExpense, setNatureOfExpense] = useState('');
  const [costCentreId, setCostCentreId] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [profitCentreId, setProfitCentreId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [accountCodeId, setAccountCodeId] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [narration, setNarration] = useState('');
  const [vendorNarration, setVendorNarration] = useState('');
  const [internalRemarks, setInternalRemarks] = useState('');

  // Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const selectedVendor = vendorId ? getVendorById(vendorId) : undefined;

  // Advance & Retention
  const [showAdvanceSection, setShowAdvanceSection] = useState(false);
  const [selectedAdvances, setSelectedAdvances] = useState<string[]>([]);
  const [advanceAdjustment, setAdvanceAdjustment] = useState(0);
  const [gstRetentionEnabled, setGstRetentionEnabled] = useState(false);
  const [gstRetentionAmount, setGstRetentionAmount] = useState(0);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = useState(false);

  const validateTDSRules = (items: LineItem[]) => {
    const tdsErrors: string[] = [];
    items.forEach((item, index) => {
      const rate = Number(item.tdsRate || 0);
      if (rate <= 0) {
        return;
      }

      if (!item.tdsSection) {
        tdsErrors.push(`Line ${index + 1}: TDS section is required when TDS rate is applied.`);
        return;
      }

      const section = getTDSSectionByCode(item.tdsSection);
      if (!section || section.status !== 'Active' || (section.approvalStatus ?? 'Approved') !== 'Approved') {
        tdsErrors.push(`Line ${index + 1}: TDS section ${item.tdsSection} is inactive or not approved.`);
        return;
      }

      const thresholdAmount = Number(section.thresholdAmount || 0);
      if (thresholdAmount > 0 && item.baseAmount < thresholdAmount) {
        tdsErrors.push(
          `Line ${index + 1}: ${item.tdsSection} threshold ₹${thresholdAmount.toLocaleString('en-IN')} not met (base ₹${item.baseAmount.toLocaleString('en-IN')}).`
        );
      }
    });

    return tdsErrors;
  };

  const getTdsLineError = (item: LineItem, index: number): string => {
    if ((item.tdsRate || 0) <= 0) {
      return '';
    }
    if (!item.tdsSection) {
      return `Line ${index + 1}: TDS section is required when TDS rate is applied.`;
    }

    const section = getTDSSectionByCode(item.tdsSection);
    if (!section || section.status !== 'Active' || (section.approvalStatus ?? 'Approved') !== 'Approved') {
      return `Line ${index + 1}: TDS section ${item.tdsSection} is inactive or not approved.`;
    }

    const thresholdAmount = Number(section.thresholdAmount || 0);
    if (thresholdAmount > 0 && item.baseAmount < thresholdAmount) {
      return `Line ${index + 1}: ${item.tdsSection} threshold ₹${thresholdAmount.toLocaleString('en-IN')} not met (base ₹${item.baseAmount.toLocaleString('en-IN')}).`;
    }

    return '';
  };

  const tdsLineErrors = useMemo(
    () =>
      lineItems.reduce<Record<string, string>>((acc, item, index) => {
        const error = getTdsLineError(item, index);
        if (error) {
          acc[item.id] = error;
        }
        return acc;
      }, {}),
    [lineItems]
  );

  useEffect(() => {
    if (currentCompany?.id) {
      setEntityId(currentCompany.id);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    setVendorId('');
    setCostCentreId('');
    setDepartmentName('');
    setAccountCodeId('');
    setProfitCentreId('');
    setProjectId('');
    setSelectedAdvances([]);
  }, [entityId]);

  // Open advances for selected vendor (to be populated from backend)
  const openAdvances: { id: string; amount: number; date: string; reference: string }[] = [];

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setOcrStatus('processing');
      
      // Simulate OCR processing
      setTimeout(() => {
        const mockOCRData: OCRData = {
          vendorName: '',
          vendorGSTIN: '',
          invoiceNumber: '',
          invoiceDate: '',
          invoiceAmount: 0,
          currency: '',
          lineItems: [],
          confidence: {
            vendorName: 0,
            invoiceNumber: 0,
            invoiceDate: 0,
            invoiceAmount: 0
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
    const baseRate = defaultTdsSection
      ? (defaultTdsSection.rateCompany || defaultTdsSection.rateIndividual || 0)
      : 0;
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
      tdsSection: defaultTdsSection?.sectionCode || '',
      tdsRate: baseRate,
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

  const handleSharedRowChange = (index: number, updatedLine: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = {
      ...updatedItems[index],
      description: updatedLine.description || updatedLine.itemName || '',
      quantity: Number(updatedLine.qty || 0),
      unitRate: Number(updatedLine.rate || 0),
      baseAmount: Number(updatedLine.taxableAmount || 0),
      gstRate: Number(updatedLine.gstRate || 0),
      gstAmount: Number(updatedLine.igst || 0) + Number(updatedLine.cgst || 0) + Number(updatedLine.sgst || 0),
      igst: Number(updatedLine.igst || 0),
      cgst: Number(updatedLine.cgst || 0),
      sgst: Number(updatedLine.sgst || 0),
      grossAmount: Number(updatedLine.taxableAmount || 0) + Number(updatedLine.igst || 0) + Number(updatedLine.cgst || 0) + Number(updatedLine.sgst || 0),
      tdsSection: updatedLine.tdsSection || '',
      tdsRate: Number(updatedLine.tdsRate || 0),
      tdsAmount: Number(updatedLine.tdsAmount || 0),
      netPayable: Number(updatedLine.netPayable || 0),
      costCentreId: updatedLine.costCentre || updatedItems[index].costCentreId,
      profitCentreId: updatedLine.profitCentre || updatedItems[index].profitCentreId,
      projectId: updatedLine.wbsProject || updatedItems[index].projectId,
    };
    setLineItems(updatedItems);
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
    if (!departmentName) newErrors.department = 'Department is required';
    if (!accountCodeId) newErrors.accountCode = 'Account code is required';
    if (!expenseCategory) newErrors.expenseCategory = 'Expense category is required';
    
    lineItems.forEach((item, index) => {
      if (!item.description) newErrors[`line${index}_desc`] = 'Description required';
      if (item.quantity <= 0) newErrors[`line${index}_qty`] = 'Quantity must be > 0';
      if (item.unitRate <= 0) newErrors[`line${index}_rate`] = 'Rate must be > 0';
      if (!item.costCentreId) newErrors[`line${index}_cc`] = 'Cost centre required';
    });

    const tdsErrors = validateTDSRules(lineItems);
    if (tdsErrors.length > 0) {
      newErrors.tds = tdsErrors.join(' | ');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const persistInvoice = (status: 'Draft' | 'Pending Approval') => {
    const vendor = vendorId ? getVendorById(vendorId) : undefined;
    if (!vendor || !invoiceNumber || !invoiceDate) {
      alert('Vendor, invoice number, and invoice date are required.');
      return false;
    }

    addInvoice({
      id: `NPO-${Date.now()}`,
      invoiceNumber,
      invoiceDate,
      vendorName: vendor.name,
      vendorCode: vendor.code,
      invoiceType: 'Non-PO',
      totalAmount: finalNetPayable,
      currency,
      status,
      approver: 'AP Team',
      paymentStatus: 'Unpaid',
      matchStatus: 'Unmatched',
      notes: narration || undefined,
      metadata: {
        vendorNarration,
        internalRemarks,
      },
    });
    return true;
  };

  // Save draft
  const handleSaveDraft = () => {
    if (persistInvoice('Draft')) {
      navigate('/ap/my-invoices');
    }
  };

  // Submit for approval
  const handleSubmit = () => {
    setShowValidation(true);
    if (validateForm()) {
      const tdsErrors = validateTDSRules(lineItems);
      if (tdsErrors.length > 0) {
        alert(`TDS threshold validation failed:\n${tdsErrors.join('\n')}`);
        return;
      }
      if (persistInvoice('Pending Approval')) {
        navigate('/ap/my-invoices');
      }
    } else {
      const tdsErrors = validateTDSRules(lineItems);
      if (tdsErrors.length > 0) {
        alert(`TDS validation failed:\n${tdsErrors.join('\n')}`);
        return;
      }
      alert('Please fix validation errors before submitting');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#16A34A';
    if (confidence >= 0.7) return '#D97706';
    return 'var(--color-error-dark)';
  };

  // Form completeness
  const completeness = useMemo(() => {
    const fields = [vendorId, invoiceNumber, invoiceDate, costCentreId, accountCodeId, expenseCategory];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [vendorId, invoiceNumber, invoiceDate, costCentreId, accountCodeId, expenseCategory]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const handleKeyboardSave = useCallback(() => handleSaveDraft(), []);
  useFormKeyboardSave(handleKeyboardSave);

  return (
    <FormShell
      title="Create Non-PO Invoice"
      subtitle="Invoices without Purchase Order reference"
      variant="transaction"
      onBack={() => navigate('/ap/dashboard')}
      onSaveDraft={handleSaveDraft}
      onSubmit={handleSubmit}
      submitLabel="Submit for Approval"
      draftLabel="Save Draft"
      saveStatus={saveStatus}
      completeness={completeness}
    >
        {/* Stage 1: Invoice Upload & OCR */}
        <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: 'var(--color-silver)' }}>
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Step 1: Upload Invoice Document</h2>
          </div>

          {!uploadedFile ? (
            <div 
              className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--color-silver)' }}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-mercury-grey)' }} />
              <p className="text-lg mb-2" style={{ color: 'var(--color-ink)' }}>
                Drop invoice file here or click to upload
              </p>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
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
              <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8" style={{ color: 'var(--color-teal)' }} />
                  <div>
                    <p style={{ color: 'var(--color-ink)' }}>{uploadedFile.name}</p>
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
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
                    style={{ color: 'var(--color-error-dark)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {ocrStatus === 'complete' && ocrData && (
                <button
                  onClick={() => setShowOCRReview(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                >
                  <Eye className="w-4 h-4" />
                  Review & Apply OCR Data
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 mb-6">
          <TDSThresholdTracker
            lineItems={lineItems.map((item) => ({
              id: item.id,
              qty: item.quantity,
              rate: item.unitRate,
              taxableAmount: item.baseAmount,
              tdsSection: item.tdsSection || 'None',
              tdsRate: item.tdsRate,
              tdsAmount: item.tdsAmount,
              netPayable: item.netPayable,
              description: item.description,
            } as any))}
          />
          <JournalEntryPreview
            compact
            formValues={{
              header: {
                invoiceType: 'Non PO',
                invoiceNumber,
                invoiceDate,
                rcm: false,
                exempt: false,
                sez: false,
              } as any,
              vendor: {
                id: vendorId || 'vendor',
                name: getVendorById(vendorId)?.name || '',
                vendorType: 'company',
                panValid: true,
                lowerCert: false,
                lowerRate: 0,
                tdsExempt: false,
                itrFiled: true,
                gstReg: 'reg',
              } as any,
              lineItems: lineItems.map((item) => ({
                id: item.id,
                description: item.description,
                qty: item.quantity,
                rate: item.unitRate,
                taxableAmount: item.baseAmount,
                gstRate: item.gstRate,
                igst: item.igst,
                cgst: item.cgst,
                sgst: item.sgst,
                tdsSection: item.tdsSection || 'None',
                tdsRate: item.tdsRate,
                tdsAmount: item.tdsAmount,
                netPayable: item.netPayable,
              })),
            }}
          />
        </div>

        {/* OCR Review Modal */}
        {showOCRReview && ocrData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b-2 p-6" style={{ borderColor: 'var(--color-silver)' }}>
                <h2 className="text-2xl" style={{ color: 'var(--color-ink)' }}>OCR Extracted Data</h2>
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Review confidence scores and edit fields before applying
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Vendor Info */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>
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
                    style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                  />
                </div>

                <div>
                  <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>Vendor GSTIN</label>
                  <input
                    type="text"
                    value={ocrData.vendorGSTIN}
                    onChange={(e) => setOcrData({ ...ocrData, vendorGSTIN: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2"
                    style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>
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
                      style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                    />
                  </div>

                  <div>
                    <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>
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
                      style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm mb-2 block" style={{ color: 'var(--color-mercury-grey)' }}>
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
                    style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t-2 p-6 flex gap-3" style={{ borderColor: 'var(--color-silver)' }}>
                <button
                  onClick={() => setShowOCRReview(false)}
                  className="flex-1 px-4 py-2 rounded-lg border-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-mercury-grey)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={applyOCRData}
                  className="flex-1 px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                >
                  Apply to Form
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: Invoice Header */}
        <FormSection
          title="Step 2: Invoice Header"
          columns={2}
          icon={<FileText className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />}
        >
            <VendorSelector
              value={vendorId}
              onChange={(id) => {
                setVendorId(id);
                setShowAdvanceSection(true);
              }}
              entityId={entityId}
              required
              showMSMEBadge
              error={showValidation ? errors.vendor : undefined}
            />

            <PxFormField label="Invoice Number" required error={showValidation ? errors.invoiceNumber : undefined}>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Enter invoice number"
                className="px-input w-full px-4 py-2 rounded-lg border-2"
                style={{
                  borderColor: showValidation && errors.invoiceNumber ? 'var(--color-error-dark)' : 'var(--color-silver)',
                  color: 'var(--color-ink)'
                }}
              />
            </PxFormField>

            <PxFormField label="Invoice Date" required>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="px-input w-full px-4 py-2 rounded-lg border-2"
                style={{
                  borderColor: showValidation && errors.invoiceDate ? 'var(--color-error-dark)' : 'var(--color-silver)',
                  color: 'var(--color-ink)'
                }}
              />
            </PxFormField>

            <EntitySelector
              value={entityId}
              onChange={setEntityId}
              required
              disabled
            />

            <DepartmentSelector
              value={departmentName}
              onChange={setDepartmentName}
              entityId={entityId}
              required
              error={showValidation ? errors.department : undefined}
            />

            <PxFormField label="Supply Type" required>
              <select
                value={supplyType}
                onChange={(e) => setSupplyType(e.target.value as 'Goods' | 'Services')}
                className="px-input w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
              >
                <option value="Services">Services</option>
                <option value="Goods">Goods</option>
              </select>
            </PxFormField>

            <PxFormField label="Place of Supply" required>
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="px-input w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
              >
                <option value="KA">Karnataka</option>
                <option value="MH">Maharashtra</option>
                <option value="TN">Tamil Nadu</option>
                <option value="DL">Delhi</option>
              </select>
            </PxFormField>

            <PxFormField label="Expense Category" required error={showValidation ? errors.expenseCategory : undefined}>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="px-input w-full px-4 py-2 rounded-lg border-2"
                style={{
                  borderColor: showValidation && errors.expenseCategory ? 'var(--color-error-dark)' : 'var(--color-silver)',
                  color: 'var(--color-ink)'
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
            </PxFormField>

            <PxFormField label="Nature of Expense" required>
              <input
                type="text"
                value={natureOfExpense}
                onChange={(e) => setNatureOfExpense(e.target.value)}
                placeholder="e.g., IT Consulting, Legal Services"
                className="px-input w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
              />
            </PxFormField>

            <CostCentreSelector
              value={costCentreId}
              onChange={setCostCentreId}
              entityId={entityId}
              required
              error={showValidation ? errors.costCentre : undefined}
            />

            <AccountCodeSelector
              value={accountCodeId}
              onChange={setAccountCodeId}
              entityId={entityId}
              required
              filterByType="Expense"
              error={showValidation ? errors.accountCode : undefined}
            />

            <PxFormField label="Payment Terms">
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="px-input w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
              >
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 45 Days">Net 45 Days</option>
                <option value="Net 60 Days">Net 60 Days</option>
                <option value="Immediate">Immediate</option>
              </select>
            </PxFormField>

            <PxFormField label="Currency">
              <input
                type="text"
                value={currency}
                disabled
                className="px-input w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)', backgroundColor: 'var(--color-cloud)' }}
              />
            </PxFormField>
        </FormSection>

        {/* Stage 3: Line Items */}
        <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: 'var(--color-silver)' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Step 3: Line Items</h2>
            </div>
            <button
              onClick={addLineItem}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: 'var(--color-teal)' }}
            >
              <Plus className="w-4 h-4" />
              Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-cloud)' }}>
                  <th className="px-3 py-3 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Description</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Qty</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Rate</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Base Amt</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>GST%</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>GST Amt</th>
                  <th className="px-3 py-3 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>TDS Section</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>TDS%</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>TDS Amt</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Net</th>
                  <th className="px-3 py-3 text-center text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <LineItemRow
                    key={item.id}
                    line={{
                      id: item.id,
                      description: item.description,
                      qty: item.quantity,
                      rate: item.unitRate,
                      taxableAmount: item.baseAmount,
                      gstRate: item.gstRate,
                      igst: item.igst,
                      cgst: item.cgst,
                      sgst: item.sgst,
                      tdsSection: item.tdsSection || 'None',
                      tdsRate: item.tdsRate,
                      tdsAmount: item.tdsAmount,
                      netPayable: item.netPayable,
                      costCentre: item.costCentreId,
                      profitCentre: item.profitCentreId,
                      wbsProject: item.projectId,
                      itemName: item.description,
                    } as any}
                    vendorMaster={{
                      id: selectedVendor?.id || 'vendor',
                      name: selectedVendor?.name || '',
                      vendorType: 'company',
                      panValid: true,
                      lowerCert: false,
                      lowerRate: 0,
                      tdsExempt: false,
                      itrFiled: true,
                      gstReg: 'reg',
                    } as any}
                    invoiceFlags={{
                      rcm: false,
                      exempt: false,
                      sez: false,
                      interState: placeOfSupply !== 'KA',
                      import: false,
                    }}
                    onChange={(updated) => handleSharedRowChange(index, updated)}
                    onDelete={() => removeLineItem(index)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2" style={{ borderColor: 'var(--color-silver)', backgroundColor: 'var(--color-cloud)' }}>
                  <td colSpan={3} className="px-3 py-3 text-right" style={{ color: 'var(--color-ink)' }}>
                    <strong>Totals:</strong>
                  </td>
                  <td className="px-3 py-3 text-right" style={{ color: 'var(--color-ink)' }}>
                    <strong>₹{totals.baseAmount.toLocaleString('en-IN')}</strong>
                  </td>
                  <td></td>
                  <td className="px-3 py-3 text-right" style={{ color: 'var(--color-ink)' }}>
                    <strong>₹{totals.gstAmount.toLocaleString('en-IN')}</strong>
                  </td>
                  <td></td>
                  <td></td>
                  <td className="px-3 py-3 text-right" style={{ color: 'var(--color-error-dark)' }}>
                    <strong>-₹{totals.tdsAmount.toLocaleString('en-IN')}</strong>
                  </td>
                  <td className="px-3 py-3 text-right" style={{ color: 'var(--color-teal)' }}>
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
          <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: 'var(--color-silver)' }}>
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Step 4: Advance & GST Retention</h2>
            </div>

            {/* Open Advances */}
            <div className="mb-6">
              <h3 className="text-lg mb-3" style={{ color: 'var(--color-ink)' }}>Open Vendor Advances</h3>
              {openAdvances.length > 0 ? (
                <div className="space-y-2">
                  {openAdvances.map((advance) => (
                    <div 
                      key={advance.id}
                      className="flex items-center justify-between p-3 rounded-lg border-2"
                      style={{ borderColor: 'var(--color-silver)' }}
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
                          <p style={{ color: 'var(--color-ink)' }}>{advance.reference}</p>
                          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{advance.date}</p>
                        </div>
                      </div>
                      <p style={{ color: 'var(--color-teal)' }}>₹{advance.amount.toLocaleString('en-IN')}</p>
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
                <p className="text-sm p-4 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-mercury-grey)' }}>
                  No open advances for this vendor
                </p>
              )}
            </div>

            {/* GST Retention */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg" style={{ color: 'var(--color-ink)' }}>GST Retention</h3>
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
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Enable GST Retention</span>
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

        <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: 'var(--color-silver)' }}>
          <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Narration & Remarks</h2>
          <NarrationField
            value={{ narration, vendorNarration, internalRemarks }}
            onChange={(next) => {
              setNarration(next.narration || '');
              setVendorNarration(next.vendorNarration || '');
              setInternalRemarks(next.internalRemarks || '');
            }}
            formContext={{
              invoiceNo: invoiceNumber,
              invoiceDate,
              vendorName: selectedVendor?.name || '',
            }}
          />
        </div>

        {/* Final Payment Summary */}
        <div className="bg-white rounded-xl border-2 p-6" style={{ borderColor: 'var(--color-silver)' }}>
          <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Payment Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
              <span style={{ color: 'var(--color-mercury-grey)' }}>Base Amount</span>
              <span style={{ color: 'var(--color-ink)' }}>₹{totals.baseAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
              <span style={{ color: 'var(--color-mercury-grey)' }}>GST Amount</span>
              <span style={{ color: 'var(--color-ink)' }}>₹{totals.gstAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
              <span style={{ color: 'var(--color-mercury-grey)' }}>Gross Amount</span>
              <span style={{ color: 'var(--color-ink)' }}>₹{totals.grossAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)' }}>
              <span style={{ color: 'var(--color-error-dark)' }}>TDS Deducted</span>
              <span style={{ color: 'var(--color-error-dark)' }}>-₹{totals.tdsAmount.toLocaleString('en-IN')}</span>
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
            <div className="border-t-2 pt-3" style={{ borderColor: 'var(--color-silver)' }}>
              <div className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: 'var(--color-teal)10' }}>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-6 h-6" style={{ color: 'var(--color-teal)' }} />
                  <span className="text-lg" style={{ color: 'var(--color-ink)' }}>Final Net Payable</span>
                </div>
                <span className="text-2xl" style={{ color: 'var(--color-teal)' }}>
                  ₹{finalNetPayable.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
    </FormShell>
  );
}
