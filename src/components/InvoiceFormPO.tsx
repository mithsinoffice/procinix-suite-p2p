import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  X,
  Upload,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Calendar,
  User,
  Building2,
  Hash,
  CreditCard,
  Package,
  Clock,
  Receipt,
  Lock,
  Info,
  Shield,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  ChevronRight,
  Edit2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAPData } from '../contexts/APDataContext';
import { mysqlApiRequest } from '../lib/mysql/client';
import { POInvoiceExceptionModal, ExceptionRequestData } from './POInvoiceExceptionModal';
import { isMsmeVendor, maxMsmeDueDate, msmeDueDateWarning } from '../lib/msmeDueDate';
import { AIInsightsPanel, AIInsight, AIAction } from './AIInsightsPanel';
import { generateAIInsights, generateAIActions } from '../utils/aiInsightsGenerator';
import { GSTDetermination } from './GSTDetermination';
import { EntityCurrencyBadge } from './shared/EntityCurrencyBadge';
import { useMasterData } from '../contexts/MasterDataContext';
import { isRecordMappedToEntity } from '../lib/masters/entityMapping';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { JournalEntryPreview, TDSThresholdTracker } from './invoice';
import { deriveApprovalMatrix } from '../utils/poInvoicePolicy';

// OCR Types
interface ExtractedField {
  value: string;
  confidence: 'High' | 'Medium' | 'Low';
  isEdited: boolean;
}

interface ExtractedLineItem {
  id: string;
  description: ExtractedField;
  hsnSac: ExtractedField;
  qty: ExtractedField;
  rate: ExtractedField;
  amount: ExtractedField;
  gstRate: ExtractedField;
  gstAmount: ExtractedField;
  cgst?: ExtractedField;
  sgst?: ExtractedField;
  igst?: ExtractedField;
}

interface OCRData {
  vendorName: ExtractedField;
  vendorGSTIN: ExtractedField;
  invoiceNumber: ExtractedField;
  invoiceDate: ExtractedField;
  invoiceAmount: ExtractedField;
  currency: ExtractedField;
  poNumber: ExtractedField;
  grnNumber: ExtractedField;
  lineItems: ExtractedLineItem[];
  paymentTerms: ExtractedField;
  dueDate: ExtractedField;
  cgstTotal?: ExtractedField;
  sgstTotal?: ExtractedField;
  igstTotal?: ExtractedField;
}

interface LineItem {
  id: string;
  selected?: boolean;
  itemName: string;
  itemCode: string;
  itemDescription: string;
  hsnSac?: string;
  accountCode: string;
  accountDescription: string;
  unitPrice: number;
  poRate: number; // PO rate for validation
  qty: number;
  amount: number;
  gstPercent: number;
  gstTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grossAmount: number;
  tdsPercent: number;
  tdsSection: string;
  tds: number;
  netPayable: number;
  costCentre: string;
  profitCentre: string;
  project: string;
  poNumber: string;
  grnNumber: string;
  // PO validation data
  poQty: number;
  grnQty: number;
  previouslyInvoicedQty: number;
  remainingQtyBalance: number;
  remainingAmountBalance: number;
}

// Helper functions for GST determination
const stateCodeMapping: { [key: string]: string } = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

const extractStateFromGSTIN = (gstin: string): { stateCode: string; stateName: string } | null => {
  if (!gstin || gstin.length < 2) return null;
  const stateCode = gstin.substring(0, 2);
  const stateName = stateCodeMapping[stateCode];
  return stateName ? { stateCode, stateName } : null;
};

const getStatesList = (): string[] => {
  return Object.values(stateCodeMapping);
};

const getStatesListWithCodes = (): Array<{ code: string; name: string }> => {
  return Object.entries(stateCodeMapping).map(([code, name]) => ({ code, name }));
};

export function InvoiceFormPO() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editingId } = useParams<{ id?: string }>();
  const isEditMode = Boolean(editingId);
  const {
    vendors,
    getPOsByVendor,
    getGRNsByPO,
    getAdvancesByVendor,
    getVendorByCode,
    getPOByNumber,
  } = useAPData();
  const {
    costCentres: liveCostCentres,
    profitCentres: liveProfitCentres,
    accountCodes: liveAccountCodes,
    getActiveTDSSections,
    getTDSSectionByCode,
    currencies: liveCurrencies,
    currentCompany,
    liveVendors: relationalVendors,
  } = useMasterData();
  const currencyOptions =
    liveCurrencies && liveCurrencies.length > 0
      ? liveCurrencies.map((c) => ({
          code: c.code ?? '',
          name: c.name ?? '',
          symbol: c.symbol ?? '',
        }))
      : [
          { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
          { code: 'USD', name: 'US Dollar', symbol: '$' },
          { code: 'EUR', name: 'Euro', symbol: '€' },
          { code: 'GBP', name: 'British Pound', symbol: '£' },
          { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
          { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
        ];
  const invoiceEntityId = currentCompany?.id ?? undefined;

  // OCR Upload Mode State
  const [entryMode, setEntryMode] = useState<'choose' | 'upload' | 'manual'>('choose');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrData, setOcrData] = useState<OCRData | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [invoiceType, setInvoiceType] = useState<'PO' | 'Non PO' | 'Rent' | 'Utilities'>('PO');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedPO, setSelectedPO] = useState('');
  const [selectedGRNs, setSelectedGRNs] = useState<string[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paymentDueDateManuallySet, setPaymentDueDateManuallySet] = useState(false);
  const [vendorGSTNumber, setVendorGSTNumber] = useState('');
  const [expensePeriod, setExpensePeriod] = useState('');
  const [narration, setNarration] = useState('');
  const [retentionRequired, setRetentionRequired] = useState<string[]>([]);
  const [retentionAmounts, setRetentionAmounts] = useState({
    GST: 0,
    PF: 0,
    ESI: 0,
    Other: 0,
  });

  // New fields for enhanced vendor & invoice context
  const [vendorCode, setVendorCode] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState('INR');
  const [showOpenPOs, setShowOpenPOs] = useState(false);

  // GST Determination state
  const [companyGSTIN, setCompanyGSTIN] = useState(''); // Populated from entity master
  const [companyState, setCompanyState] = useState('');
  const [supplierState, setSupplierState] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [shipToState, setShipToState] = useState('');
  const [supplyType, setSupplyType] = useState<'Goods' | 'Services'>('Goods');
  const [reverseChargeApplicable, setReverseChargeApplicable] = useState(false);
  const [isSEZ, setIsSEZ] = useState(false);
  const [isExport, setIsExport] = useState(false);
  const [isImport, setIsImport] = useState(false);
  const [gstType, setGstType] = useState<'CGST+SGST' | 'IGST'>('CGST+SGST');
  const [gstTypeOverridden, setGstTypeOverridden] = useState(false);
  const [gstOverrideReason, setGstOverrideReason] = useState('');
  const [gstOverrideComments, setGstOverrideComments] = useState('');
  const [showGSTOverride, setShowGSTOverride] = useState(false);
  const [gstValidationIssues, setGstValidationIssues] = useState<
    { type: 'blocker' | 'warning'; message: string; action?: string }[]
  >([]);

  // Advance adjustment state
  const [advanceAdjustments, setAdvanceAdjustments] = useState<{ [key: string]: number }>({});

  // Smart validation state
  const [policyConfig] = useState({
    hardLockRate: true, // Hard lock rate by default
    allowToleranceOverride: false,
    maxTolerancePercent: 2,
    maxToleranceAmount: 1000,
    enforce3WayMatch: true,
  });
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [exceptionLineItem, setExceptionLineItem] = useState<LineItem | null>(null);
  const [rateErrors, setRateErrors] = useState<{ [key: string]: string }>({});
  const [gstr2bMatched, setGstr2bMatched] = useState(false);
  const [requiredApprovers, setRequiredApprovers] = useState<string[]>([]);

  // AI Insights state
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [aiActions, setAiActions] = useState<AIAction[]>([]);
  const [overallConfidence, setOverallConfidence] = useState<'high' | 'medium' | 'low'>('high');
  const [aiPanelExpanded, setAiPanelExpanded] = useState(true);
  const [ignoredInsights, setIgnoredInsights] = useState<Set<string>>(new Set());

  // ── Hydrate from AI-ingested invoice (when navigated from Invoices listing) ──
  useEffect(() => {
    const state = location.state as { fromAI?: boolean; dbId?: string } | null;
    if (!state?.fromAI || !state?.dbId) return;

    const fetchAIInvoice = async () => {
      try {
        const json = await mysqlApiRequest<{ success: boolean; data: any }>(
          `/invoices/${state.dbId}`
        );
        if (!json.success) return;
        const inv = json.data;

        // Pre-fill form fields from extracted data
        setInvoiceNumber(inv.invoice_number || '');
        setInvoiceDate(inv.invoice_date ? String(inv.invoice_date).split('T')[0] : '');
        setInvoiceCurrency(inv.currency || 'INR');
        if (inv.vendor_gstin) setVendorGSTNumber(inv.vendor_gstin);
        if (inv.po_number) setSelectedPO(inv.po_number);

        // Try to match vendor from vendors list
        if (inv.vendor_name) {
          const match = vendors.find(
            (v) =>
              v.name.toLowerCase().includes(inv.vendor_name.toLowerCase()) ||
              inv.vendor_name.toLowerCase().includes(v.name.toLowerCase())
          );
          if (match) {
            setSelectedVendor(match.code);
            setVendorCode(match.code);
          }
        }

        // Pre-fill line items from extracted data
        if (Array.isArray(inv.line_items) && inv.line_items.length > 0) {
          setLineItems(
            inv.line_items.map((li: any, i: number) => ({
              id: String(i + 1),
              itemName: li.description || '',
              itemCode: '',
              itemDescription: li.description || '',
              accountCode: '',
              accountDescription: '',
              unitPrice: Number(li.unit_price) || 0,
              poQty: Number(li.quantity) || 1,
              grnQty: Number(li.quantity) || 1,
              qty: Number(li.quantity) || 1,
              gstPercent: li.gst_rate != null ? Number(li.gst_rate) * 100 : 18,
              amount: Number(li.amount) || 0,
              hsnSac: li.hsn_sac || '',
              poRate: Number(li.unit_price) || 0,
              rateVariance: 0,
              selected: true,
              costCentre: '',
              profitCentre: '',
            }))
          );
        }

        // Jump to manual entry mode so the form shows
        setEntryMode('manual');

        console.log(
          '[InvoiceFormPO] Hydrated from AI invoice:',
          inv.invoice_number,
          inv.vendor_name
        );
      } catch (err) {
        console.error('[InvoiceFormPO] Failed to hydrate AI invoice:', err);
      }
    };

    fetchAIInvoice();
  }, [location.state, vendors]);

  // Line items (populated from PO/GRN selection or manual entry)
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // ── Edit-mode prefill ─────────────────────────────────────────────────────
  // When mounted at /invoices/edit/:id, GET the existing invoice and map
  // every editable field back into form state. No second fetch path — the
  // AI-hydration flow above uses location.state.fromAI, this branch keys
  // off the URL param.
  useEffect(() => {
    if (!isEditMode || !editingId) return;
    let cancelled = false;
    (async () => {
      try {
        const json = await mysqlApiRequest<{ success: boolean; data: any }>(
          `/invoices/${encodeURIComponent(editingId)}`
        );
        if (cancelled || !json?.success || !json.data) return;
        const inv = json.data;

        setInvoiceNumber(inv.invoice_number || '');
        setInvoiceDate(inv.invoice_date ? String(inv.invoice_date).split('T')[0] : '');
        setPaymentDueDate(inv.due_date ? String(inv.due_date).split('T')[0] : '');
        setPaymentDueDateManuallySet(Boolean(inv.due_date));
        setInvoiceCurrency(inv.currency || 'INR');
        if (inv.vendor_gstin) setVendorGSTNumber(inv.vendor_gstin);
        if (inv.po_number) setSelectedPO(inv.po_number);
        if (inv.notes) setNarration(inv.notes);

        // Vendor lookup — prefer relational vendor by UUID (vendor_id), fall
        // back to AP-blob vendor by name. The form's selectedVendor is keyed
        // on vendor.code, so resolve to that.
        if (inv.vendor_id) {
          const relVendor = relationalVendors?.find((v) => v.id === inv.vendor_id);
          if (relVendor) {
            setSelectedVendor(relVendor.code);
            setVendorCode(relVendor.code);
          }
        }
        if (!vendorCode && inv.vendor_name) {
          const match = vendors.find(
            (v) =>
              v.name.toLowerCase() === String(inv.vendor_name).toLowerCase() ||
              v.name.toLowerCase().includes(String(inv.vendor_name).toLowerCase()) ||
              String(inv.vendor_name).toLowerCase().includes(v.name.toLowerCase())
          );
          if (match) {
            setSelectedVendor(match.code);
            setVendorCode(match.code);
          }
        }

        if (Array.isArray(inv.line_items) && inv.line_items.length > 0) {
          setLineItems(
            inv.line_items.map((li: any, i: number) => ({
              id: String(li.id ?? i + 1),
              itemName: li.description || '',
              itemCode: '',
              itemDescription: li.description || '',
              accountCode: '',
              accountDescription: '',
              unitPrice: Number(li.unit_price) || 0,
              poQty: Number(li.quantity) || 1,
              grnQty: Number(li.quantity) || 1,
              qty: Number(li.quantity) || 1,
              gstPercent:
                li.gst_rate != null
                  ? Number(li.gst_rate) > 1
                    ? Number(li.gst_rate)
                    : Number(li.gst_rate) * 100
                  : 18,
              amount: Number(li.amount) || 0,
              hsnSac: li.hsn_sac || '',
              poRate: Number(li.unit_price) || 0,
              rateVariance: 0,
              selected: true,
              costCentre: '',
              profitCentre: '',
            }))
          );
        }

        // Skip the entry-mode landing screen — go straight to the form.
        setEntryMode('manual');
      } catch (err) {
        console.error('[InvoiceFormPO] Edit-mode prefill failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once on mount with whatever masters are hydrated at that point;
    // we deliberately don't re-run on vendors/relationalVendors changes
    // because that would clobber user edits mid-session.
  }, [isEditMode, editingId]);
  const activeTdsSections = getActiveTDSSections();
  const defaultTdsSection = activeTdsSections[0];
  const defaultTdsSectionCode = defaultTdsSection?.sectionCode || '';
  const tdsSectionNameMap = useMemo(
    () =>
      activeTdsSections.reduce<Record<string, string>>((acc, section) => {
        acc[section.sectionCode] = section.sectionName;
        return acc;
      }, {}),
    [activeTdsSections]
  );
  const tdsRateOptions = useMemo(
    () =>
      Array.from(
        new Set(
          activeTdsSections.map((section) => section.rateCompany || section.rateIndividual || 0)
        )
      ).sort((a, b) => a - b),
    [activeTdsSections]
  );

  // OCR Upload Handlers
  const handleFileSelect = (file: File) => {
    if (!file) return;

    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or image file (PNG, JPG)');
      return;
    }

    setUploadedFile(file);

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          startOCRExtraction(file);
        }, 500);
      }
    }, 100);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const startOCRExtraction = (file: File) => {
    setIsExtracting(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setDocumentPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate OCR extraction
    setTimeout(() => {
      const mockOCRData = generateMockOCRData();
      setOcrData(mockOCRData);
      setIsExtracting(false);
      setEntryMode('upload'); // Move to OCR review
      prefillFormFromOCR(mockOCRData);
    }, 3000);
  };

  const generateMockOCRData = (): OCRData => {
    return {
      vendorName: { value: '', confidence: 'Low', isEdited: false },
      vendorGSTIN: { value: '', confidence: 'Low', isEdited: false },
      invoiceNumber: { value: '', confidence: 'Low', isEdited: false },
      invoiceDate: { value: '', confidence: 'Low', isEdited: false },
      invoiceAmount: { value: '', confidence: 'Low', isEdited: false },
      currency: { value: '', confidence: 'Low', isEdited: false },
      poNumber: { value: '', confidence: 'Low', isEdited: false },
      grnNumber: { value: '', confidence: 'Low', isEdited: false },
      paymentTerms: { value: '', confidence: 'Low', isEdited: false },
      dueDate: { value: '', confidence: 'Low', isEdited: false },
      lineItems: [],
    };
  };

  const prefillFormFromOCR = (data: OCRData) => {
    // Prefill vendor and invoice details
    setInvoiceNumber(data.invoiceNumber.value);
    setInvoiceDate(data.invoiceDate.value);
    setVendorGSTNumber(data.vendorGSTIN.value);

    // Try to match vendor from masters
    const matchedVendor = vendors.find(
      (v) =>
        v.gstin === data.vendorGSTIN.value ||
        v.name.toLowerCase().includes(data.vendorName.value.toLowerCase())
    );
    if (matchedVendor) {
      setSelectedVendor(matchedVendor.code);
    }

    // Try to match PO
    if (data.poNumber.value) {
      setSelectedPO(data.poNumber.value);
    }
  };

  const handleContinueFromOCR = () => {
    setEntryMode('manual');
  };

  const handleSkipOCR = () => {
    setEntryMode('manual');
  };

  // Get purchase orders and GRNs for selected vendor
  const purchaseOrders = selectedVendor ? getPOsByVendor(selectedVendor) : [];
  const availableGRNs = selectedPO ? getGRNsByPO(selectedPO) : [];
  const vendorAdvances = selectedVendor ? getAdvancesByVendor(selectedVendor) : [];

  // MSME 45-day rule: warn (don't block) when due date exceeds invoiceDate + 45 days
  const _msmeVendor = getVendorByCode(vendorCode || selectedVendor);
  const vendorIsMsme = isMsmeVendor(_msmeVendor as any);
  useEffect(() => {
    if (!invoiceDate || paymentDueDateManuallySet) return;
    if (!vendorIsMsme) return;
    const suggested = maxMsmeDueDate(invoiceDate);
    if (suggested) setPaymentDueDate(suggested);
  }, [invoiceDate, vendorIsMsme, paymentDueDateManuallySet]);
  const msmeWarning = msmeDueDateWarning({
    invoiceDate,
    dueDate: paymentDueDate,
    msmeRegistered: vendorIsMsme,
  });

  const costCentres = useMemo(() => {
    const scoped = liveCostCentres.filter(
      (cc) => cc.isActive && (!invoiceEntityId || isRecordMappedToEntity(cc, invoiceEntityId))
    );
    if (scoped.length > 0) return scoped.map((cc) => cc.code);
    return [];
  }, [liveCostCentres, invoiceEntityId]);

  const profitCentres = useMemo(() => {
    const scoped = liveProfitCentres.filter(
      (pc) => pc.isActive && (!invoiceEntityId || isRecordMappedToEntity(pc, invoiceEntityId))
    );
    if (scoped.length > 0) return scoped.map((pc) => pc.code);
    return [];
  }, [liveProfitCentres, invoiceEntityId]);

  const accountCodes = useMemo(() => {
    const scoped = liveAccountCodes.filter(
      (ac) => ac.isActive && (!invoiceEntityId || isRecordMappedToEntity(ac, invoiceEntityId))
    );
    if (scoped.length > 0) {
      return scoped.map((accountCode) => ({
        code: accountCode.code,
        description: accountCode.name,
      }));
    }
    return [];
  }, [liveAccountCodes, invoiceEntityId]);

  // Auto-derive states from GSTINs
  useEffect(() => {
    const companyStateData = extractStateFromGSTIN(companyGSTIN);
    if (companyStateData) {
      setCompanyState(companyStateData.stateName);
    }
  }, [companyGSTIN]);

  useEffect(() => {
    const supplierStateData = extractStateFromGSTIN(vendorGSTNumber);
    if (supplierStateData) {
      setSupplierState(supplierStateData.stateName);
    }
  }, [vendorGSTNumber]);

  // Auto-determine GST type based on place of supply and ship-to state
  useEffect(() => {
    if (!gstTypeOverridden && placeOfSupply && shipToState) {
      const determinedType = placeOfSupply === shipToState ? 'CGST+SGST' : 'IGST';
      if (determinedType !== gstType) {
        setGstType(determinedType);
        // Recalculate all line items
        recalculateAllLineItemsGST(determinedType);
      }
    }
  }, [placeOfSupply, shipToState, gstTypeOverridden]);

  // GST Validation checks
  useEffect(() => {
    const issues: { type: 'blocker' | 'warning'; message: string; action?: string }[] = [];

    // Blockers
    if (selectedVendor && !placeOfSupply) {
      issues.push({
        type: 'blocker',
        message: 'Place of Supply is mandatory',
        action: 'select-place-of-supply',
      });
    }

    if (vendorGSTNumber && vendorGSTNumber.length !== 15) {
      issues.push({
        type: 'blocker',
        message: 'Invalid GSTIN format - must be 15 characters',
        action: 'fix-gstin',
      });
    }

    if (vendorGSTNumber && !supplierState) {
      issues.push({
        type: 'blocker',
        message: 'Supplier state cannot be derived from GSTIN',
        action: 'verify-gstin',
      });
    }

    if (placeOfSupply && shipToState && !gstType) {
      issues.push({
        type: 'blocker',
        message: 'GST type cannot be determined due to missing states',
        action: 'review-states',
      });
    }

    // Warnings
    if (selectedPO && shipToState && placeOfSupply && placeOfSupply !== shipToState) {
      issues.push({
        type: 'warning',
        message: 'Place of supply differs from PO ship-to state - needs confirmation',
        action: 'confirm-supply-state',
      });
    }

    const vendor = getVendorByCode(selectedVendor);
    if (vendor && vendorGSTNumber && vendor.gstin !== vendorGSTNumber) {
      issues.push({
        type: 'warning',
        message: 'Supplier GSTIN differs from Vendor Master',
        action: 'use-master-gstin',
      });
    }

    setGstValidationIssues(issues);
  }, [
    placeOfSupply,
    shipToState,
    vendorGSTNumber,
    supplierState,
    gstType,
    selectedVendor,
    selectedPO,
  ]);

  const recalculateAllLineItemsGST = (type: 'CGST+SGST' | 'IGST') => {
    setLineItems((items) =>
      items.map((item) => {
        const gstTotal = (item.amount * item.gstPercent) / 100;
        return {
          ...item,
          gstTotal,
          cgst: type === 'CGST+SGST' ? gstTotal / 2 : 0,
          sgst: type === 'CGST+SGST' ? gstTotal / 2 : 0,
          igst: type === 'IGST' ? gstTotal : 0,
          grossAmount: item.amount + gstTotal,
          netPayable: item.amount + gstTotal - item.tds,
        };
      })
    );
  };

  const handleGSTTypeOverride = (newType: 'CGST+SGST' | 'IGST') => {
    if (!gstOverrideReason || !gstOverrideComments) {
      alert('Please provide override reason and comments');
      return;
    }
    setGstType(newType);
    setGstTypeOverridden(true);
    setShowGSTOverride(false);
    recalculateAllLineItemsGST(newType);
    // Log to audit trail in production
    console.log('GST Type Override:', {
      newType,
      reason: gstOverrideReason,
      comments: gstOverrideComments,
    });
  };

  const handleVendorChange = (vendorCode: string) => {
    setSelectedVendor(vendorCode);
    const vendor = getVendorByCode(vendorCode);
    if (vendor) {
      setVendorCode(vendor.code);
      setVendorGSTNumber(vendor.gstin);
      setInvoiceCurrency(vendor.currency);
      setShowOpenPOs(true);
    }
    // Reset PO and GRN selection when vendor changes
    setSelectedPO('');
    setSelectedGRNs([]);
    setLineItems([]);
  };

  const handlePOSelection = (poNumber: string) => {
    if (selectedPO === poNumber) {
      // Deselect if clicking the same PO
      setSelectedPO('');
      setSelectedGRNs([]);
      setLineItems([]);
      return;
    }

    setSelectedPO(poNumber);
    setSelectedGRNs([]);

    // Auto-populate line items from PO
    const po = getPOByNumber(poNumber);
    if (po && po.lineItems) {
      // Auto-set ship-to state from PO
      if (po.shipToState) {
        setShipToState(po.shipToState);
        // If place of supply not set, default to ship-to state
        if (!placeOfSupply) {
          setPlaceOfSupply(po.shipToState);
        }
      }

      const invoiceLineItems: LineItem[] = po.lineItems.map((poLine) => ({
        id: poLine.id,
        itemName: poLine.itemName,
        itemCode: poLine.itemCode,
        itemDescription: poLine.itemDescription,
        accountCode: poLine.accountCode,
        accountDescription: poLine.accountDescription,
        unitPrice: poLine.unitPrice,
        poRate: poLine.unitPrice, // Store original PO rate for validation
        qty: poLine.qty - poLine.invoicedQty, // Available quantity
        amount: poLine.amount,
        gstPercent: poLine.gstPercent,
        gstTotal: poLine.gstAmount,
        cgst: poLine.cgst,
        sgst: poLine.sgst,
        igst: poLine.igst,
        grossAmount: poLine.grossAmount,
        tdsPercent: poLine.tdsPercent || 0,
        tdsSection: poLine.tdsSection || defaultTdsSectionCode,
        tds: poLine.tdsAmount || 0,
        netPayable: poLine.netAmount,
        costCentre: poLine.costCentre,
        profitCentre: poLine.profitCentre,
        project: poLine.project,
        poNumber: poNumber,
        grnNumber: '',
        // Validation data
        poQty: poLine.qty,
        grnQty: poLine.receivedQty,
        previouslyInvoicedQty: poLine.invoicedQty,
        remainingQtyBalance: poLine.remainingQty,
        remainingAmountBalance: poLine.amount - poLine.invoicedQty * poLine.unitPrice,
      }));
      setLineItems(invoiceLineItems);
    }
  };

  const handleGRNToggle = (grnNumber: string) => {
    if (selectedGRNs.includes(grnNumber)) {
      setSelectedGRNs(selectedGRNs.filter((g) => g !== grnNumber));
    } else {
      setSelectedGRNs([...selectedGRNs, grnNumber]);
    }
  };

  // Update line items when GRN selection changes
  useEffect(() => {
    if (selectedPO && selectedGRNs.length > 0) {
      const po = getPOByNumber(selectedPO);
      if (!po) return;

      const updatedLineItems: LineItem[] = [];

      selectedGRNs.forEach((grnNumber) => {
        const grn = availableGRNs.find((g) => g.grnNumber === grnNumber);
        if (grn && grn.lineItems) {
          grn.lineItems.forEach((grnLine) => {
            const poLine = po.lineItems.find((pl) => pl.id === grnLine.poLineItemId);
            if (poLine) {
              // Calculate GST based on determined GST type
              const itemGstTotal = (grnLine.amount * poLine.gstPercent) / 100;
              const itemCgst = gstType === 'CGST+SGST' ? itemGstTotal / 2 : 0;
              const itemSgst = gstType === 'CGST+SGST' ? itemGstTotal / 2 : 0;
              const itemIgst = gstType === 'IGST' ? itemGstTotal : 0;
              const itemTds = (grnLine.amount * (poLine.tdsPercent || 0)) / 100;

              updatedLineItems.push({
                id: `${grnLine.id}`,
                itemName: grnLine.itemName,
                itemCode: grnLine.itemCode,
                itemDescription: grnLine.itemDescription,
                accountCode: poLine.accountCode,
                accountDescription: poLine.accountDescription,
                unitPrice: grnLine.unitPrice,
                poRate: poLine.unitPrice, // Add PO rate for validation
                qty: grnLine.qtyAccepted,
                amount: grnLine.amount,
                gstPercent: poLine.gstPercent,
                gstTotal: itemGstTotal,
                cgst: itemCgst,
                sgst: itemSgst,
                igst: itemIgst,
                grossAmount: grnLine.amount + itemGstTotal,
                tdsPercent: poLine.tdsPercent || 0,
                tdsSection: poLine.tdsSection || defaultTdsSectionCode,
                tds: itemTds,
                netPayable: grnLine.amount + itemGstTotal - itemTds,
                costCentre: poLine.costCentre,
                profitCentre: poLine.profitCentre,
                project: poLine.project,
                poNumber: selectedPO,
                grnNumber: grnNumber,
                // Add validation fields
                poQty: poLine.qty,
                grnQty: grnLine.qtyAccepted,
                previouslyInvoicedQty: poLine.invoicedQty || 0,
                remainingQtyBalance: poLine.remainingQty || poLine.qty - (poLine.invoicedQty || 0),
                remainingAmountBalance: (poLine.qty - (poLine.invoicedQty || 0)) * poLine.unitPrice,
              });
            }
          });
        }
      });

      setLineItems(updatedLineItems);
    }
  }, [selectedGRNs, selectedPO, gstType]);

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    // Validate rate changes
    if (field === 'unitPrice') {
      const item = lineItems.find((lineItem) => lineItem.id === id);
      if (item && item.poRate !== undefined) {
        if (policyConfig.hardLockRate && value > item.poRate) {
          // Hard lock - prevent rate increase
          setRateErrors({
            ...rateErrors,
            [id]: `Rate cannot exceed PO rate of ₹${item.poRate.toFixed(2)}`,
          });
          return; // Don't update
        } else if (policyConfig.allowToleranceOverride && !policyConfig.hardLockRate) {
          const variancePercent = ((value - item.poRate) / item.poRate) * 100;
          const varianceAmount = value - item.poRate;
          if (
            variancePercent > policyConfig.maxTolerancePercent ||
            varianceAmount > policyConfig.maxToleranceAmount
          ) {
            setRateErrors({
              ...rateErrors,
              [id]: `Rate exceeds tolerance. Max: ${policyConfig.maxTolerancePercent}% or ₹${policyConfig.maxToleranceAmount}`,
            });
            return; // Don't update
          }
        }
        // Clear error if validation passes
        const newErrors = { ...rateErrors };
        delete newErrors[id];
        setRateErrors(newErrors);
      }
    }

    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // Recalculate amounts when qty or unitPrice changes
          if (field === 'qty' || field === 'unitPrice') {
            updated.amount = updated.qty * updated.unitPrice;
          }

          // Recalculate GST when amount or gstPercent changes
          if (field === 'qty' || field === 'unitPrice' || field === 'gstPercent') {
            updated.gstTotal = (updated.amount * updated.gstPercent) / 100;
            // Use the determined GST type for tax split
            if (gstType === 'CGST+SGST') {
              updated.cgst = updated.gstTotal / 2;
              updated.sgst = updated.gstTotal / 2;
              updated.igst = 0;
            } else {
              updated.cgst = 0;
              updated.sgst = 0;
              updated.igst = updated.gstTotal;
            }
          }

          // Calculate gross amount
          updated.grossAmount = updated.amount + updated.gstTotal;

          // Suggest TDS Section based on configured TDS section master rates.
          if (field === 'tdsPercent') {
            if (value === 0) {
              updated.tdsSection = '';
            } else {
              const matched = activeTdsSections.find(
                (section) => (section.rateCompany || section.rateIndividual || 0) === value
              );
              if (matched) {
                updated.tdsSection = matched.sectionCode;
              } else if (!updated.tdsSection && defaultTdsSectionCode) {
                updated.tdsSection = defaultTdsSectionCode;
              }
            }
          }

          if (field === 'tdsSection') {
            const selectedSection = getTDSSectionByCode(String(value));
            if (selectedSection) {
              updated.tdsPercent =
                selectedSection.rateCompany || selectedSection.rateIndividual || 0;
            }
          }

          // Calculate TDS
          if (field === 'qty' || field === 'unitPrice' || field === 'tdsPercent') {
            updated.tds = (updated.amount * updated.tdsPercent) / 100;
          }

          // Calculate net payable
          updated.netPayable = updated.grossAmount - updated.tds;

          return updated;
        }
        return item;
      })
    );
  };

  const calculateTotals = () => {
    const totals = lineItems.reduce(
      (acc, item) => ({
        amount: acc.amount + item.amount,
        gstTotal: acc.gstTotal + item.gstTotal,
        cgst: acc.cgst + item.cgst,
        sgst: acc.sgst + item.sgst,
        igst: acc.igst + item.igst,
        grossAmount: acc.grossAmount + item.grossAmount,
        tds: acc.tds + item.tds,
        netPayable: acc.netPayable + item.netPayable,
      }),
      {
        amount: 0,
        gstTotal: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        grossAmount: 0,
        tds: 0,
        netPayable: 0,
      }
    );

    // Subtract retention amounts
    const totalRetention = Object.values(retentionAmounts).reduce((sum, val) => sum + val, 0);
    totals.netPayable -= totalRetention;

    return totals;
  };

  const getTDSLineError = (item: LineItem, index: number): string => {
    const rate = Number(item.tdsPercent || 0);
    if (rate <= 0) {
      return '';
    }

    if (!item.tdsSection) {
      return `Line ${index + 1}: TDS section is required when TDS rate is applied.`;
    }

    const section = getTDSSectionByCode(item.tdsSection);
    if (
      !section ||
      section.status !== 'Active' ||
      (section.approvalStatus ?? 'Approved') !== 'Approved'
    ) {
      return `Line ${index + 1}: TDS section ${item.tdsSection} is inactive or not approved.`;
    }

    const thresholdAmount = Number(section.thresholdAmount || 0);
    if (thresholdAmount > 0 && item.amount < thresholdAmount) {
      return `Line ${index + 1}: ${item.tdsSection} threshold ₹${thresholdAmount.toLocaleString('en-IN')} not met (base ₹${item.amount.toLocaleString('en-IN')}).`;
    }

    return '';
  };

  const validateTDSRules = (items: LineItem[]) => {
    const tdsErrors: string[] = [];
    items.forEach((item, index) => {
      const lineError = getTDSLineError(item, index);
      if (lineError) {
        tdsErrors.push(lineError);
      }
    });

    return tdsErrors;
  };

  const tdsLineErrors = useMemo(
    () =>
      lineItems.reduce<Record<string, string>>((acc, item, index) => {
        const lineError = getTDSLineError(item, index);
        if (lineError) {
          acc[item.id] = lineError;
        }
        return acc;
      }, {}),
    [lineItems]
  );

  const handleRetentionToggle = (type: string) => {
    if (retentionRequired.includes(type)) {
      setRetentionRequired(retentionRequired.filter((r) => r !== type));
      setRetentionAmounts({ ...retentionAmounts, [type]: 0 });
    } else {
      setRetentionRequired([...retentionRequired, type]);
    }
  };

  const checkDuplicateInvoice = async () => {
    const vendor = getVendorByCode(vendorCode || selectedVendor);
    const vendorId = (vendor as { id?: string } | null | undefined)?.id;
    if (!vendor || !vendorId || !invoiceNumber) return true;
    try {
      const json = await mysqlApiRequest<{ success: boolean; data: any[] }>(
        `/invoices?vendorId=${encodeURIComponent(vendorId)}&invoiceNo=${encodeURIComponent(invoiceNumber)}`
      );
      const matches = Array.isArray(json?.data) ? json.data : [];
      if (matches.length === 0) return true;
      const confirmProceed = window.confirm(
        `Duplicate invoice detected (${matches[0].invoice_number}) for vendor ${matches[0].vendor_name}. Proceed anyway?`
      );
      return confirmProceed;
    } catch {
      return true;
    }
  };

  const runThreeWayMatchValidation = () => {
    const errors: string[] = [];
    for (const item of lineItems) {
      if (!item.selected) continue;
      if (item.grnQty != null && item.qty > item.grnQty) {
        errors.push(
          `${item.itemName || item.itemCode}: Invoice qty (${item.qty}) exceeds GRN qty (${item.grnQty})`
        );
      }
      if (
        item.poRate != null &&
        item.unitPrice > item.poRate * (1 + policyConfig.maxTolerancePercent / 100)
      ) {
        setExceptionLineItem(item);
        setExceptionModalOpen(true);
      }
    }
    return errors;
  };

  const computeMsmeDueDate = () => {
    const vendor = getVendorByCode(vendorCode || selectedVendor);
    if (!vendor || vendor.category !== 'MSME' || !invoiceDate) return null;
    const due = new Date(invoiceDate);
    due.setDate(due.getDate() + 45);
    return due;
  };

  /**
   * Build the flat payload shared by POST (create) and PUT (edit). Note:
   *   • POST stores `total_amount = netPayable` (status-quo behaviour kept
   *     so existing rows stay consistent).
   *   • PUT stores `total_amount = grossAmount` (subtotal + GST) because the
   *     server's PUT reconciler enforces lineTaxable + lineGST ≈ total_amount.
   *     `invoice_number` is included only on PUT — server generates / leaves
   *     null on create (universal-master-rule: read-only on the form).
   */
  const buildPayload = (status: 'Draft' | 'Pending Approval', mode: 'create' | 'edit') => {
    const resolvedVendorCode = vendorCode || selectedVendor;
    const vendor = getVendorByCode(resolvedVendorCode);
    if (!vendor || !invoiceDate) return null;
    const totals = calculateTotals();
    const lifecycleState = status === 'Draft' ? 'Ingested' : 'Under Verification';
    const relVendor = relationalVendors?.find(
      (v) => v.code === vendor.code || v.name === vendor.name
    );
    const vendorUuid = relVendor?.id ?? vendor.code;

    const flat: Record<string, unknown> = {
      invoice_date: invoiceDate,
      due_date: paymentDueDate || null,
      vendor_id: vendorUuid,
      vendor_name: vendor.name,
      vendor_code: vendor.code,
      vendor_gstin: vendorGSTNumber || null,
      invoice_type: 'po',
      po_number: selectedPO || null,
      subtotal: totals.amount,
      tax_amount: totals.gstTotal,
      total_amount: mode === 'edit' ? totals.grossAmount : totals.netPayable,
      currency: invoiceCurrency,
      entity_id: currentCompany?.id ?? '',
      status: status === 'Draft' ? 'draft' : 'pending_approval',
      lifecycle_state: lifecycleState,
      notes: narration || null,
    };
    if (mode === 'edit') {
      flat.invoice_number = invoiceNumber || null;
    }
    return { vendor, flat, totals };
  };

  const buildLineItemsForPut = () =>
    lineItems.map((li) => ({
      id: li.id,
      description: li.itemDescription || li.itemName || '',
      quantity: li.qty,
      unit_price: li.unitPrice,
      amount: li.amount,
      hsn_sac: li.hsnSac || null,
      gst_rate: li.gstPercent != null ? Number(li.gstPercent) / 100 : null,
      // The server's PUT reconciliation reads these to verify
      // lineTaxable + lineGST ≈ header total_amount. They aren't persisted
      // on the line item but the math runs server-side.
      cgst: li.cgst ?? 0,
      sgst: li.sgst ?? 0,
      igst: li.igst ?? 0,
    }));

  const persistInvoice = async (status: 'Draft' | 'Pending Approval'): Promise<boolean> => {
    if (isEditMode && !editingId) {
      alert('Missing invoice id for edit.');
      return false;
    }
    const built = buildPayload(status, isEditMode ? 'edit' : 'create');
    if (!built) {
      alert('Vendor and invoice date are required.');
      return false;
    }
    try {
      if (isEditMode && editingId) {
        const res = await mysqlApiRequest<{ success: boolean; data: { id: string } }>(
          `/invoices/${encodeURIComponent(editingId)}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              invoice: built.flat,
              line_items: buildLineItemsForPut(),
            }),
          }
        );
        if (!res?.success) {
          alert('Failed to update invoice.');
          return false;
        }
        return true;
      }
      const res = await mysqlApiRequest<{ success: boolean; data: { id: string } }>('/invoices', {
        method: 'POST',
        body: JSON.stringify(built.flat),
      });
      if (!res?.success) {
        alert('Failed to save invoice.');
        return false;
      }
      return true;
    } catch (err) {
      const apiErr = err as { message?: string; details?: string[] };
      alert(
        apiErr?.details?.length
          ? apiErr.details.join('\n')
          : apiErr?.message || 'Failed to save invoice.'
      );
      return false;
    }
  };

  const handleSubmit = async () => {
    const tdsErrors = validateTDSRules(lineItems);
    if (tdsErrors.length > 0) {
      alert(`Cannot submit due to TDS validation errors:\n${tdsErrors.join('\n')}`);
      return;
    }

    if (!gstr2bMatched) {
      alert(
        'Warning: ITC claim at risk — vendor has not filed GSTR-1 for this period. ITC may be reversed under Rule 37A.'
      );
    }

    const dueDate = computeMsmeDueDate();
    if (dueDate && dueDate < new Date()) {
      alert(
        `MSME due date breached (${dueDate.toISOString().slice(0, 10)}). MSMED Act interest may apply at 3x bank rate.`
      );
    }

    const canProceed = await checkDuplicateInvoice();
    if (!canProceed) return;

    const threeWayErrors = runThreeWayMatchValidation();
    if (threeWayErrors.length > 0) {
      alert(`3-way match failed:\n${threeWayErrors.join('\n')}`);
      return;
    }

    if (await persistInvoice('Pending Approval')) {
      navigate(isEditMode && editingId ? `/invoices/${editingId}` : '/invoices');
    }
  };

  const handleSaveDraft = async () => {
    if (await persistInvoice('Draft')) {
      navigate(isEditMode && editingId ? `/invoices/${editingId}` : '/invoices');
    }
  };

  const handleCancel = () => {
    navigate('/invoices');
  };

  // Generate AI Insights when form data changes
  useEffect(() => {
    if (!selectedVendor) {
      setAiInsights([]);
      setAiActions(
        generateAIActions({
          vendorCode: '',
          vendorName: '',
          vendorGSTIN: '',
          invoiceNumber: '',
          invoiceDate: '',
          invoiceAmount: 0,
          currency: 'INR',
          lineItems: [],
        })
      );
      return;
    }

    const vendor = getVendorByCode(selectedVendor);
    if (!vendor) return;

    const totalAmount = lineItems.reduce((sum, item) => sum + item.netPayable, 0);

    const invoiceData = {
      vendorCode: vendor.code,
      vendorName: vendor.name,
      vendorGSTIN: vendorGSTNumber,
      invoiceNumber,
      invoiceDate,
      invoiceAmount: totalAmount,
      currency: invoiceCurrency,
      poNumber: selectedPO,
      lineItems,
      selectedGRNs,
    };

    const vendorDataEnhanced = {
      ...vendor,
      isMSME: vendor.category === 'MSME',
      msmeRegNumber: vendor.category === 'MSME' ? 'MSME-' + vendor.code : undefined,
      bankAccountChanged: false,
      averageInvoiceAmount: 75000,
      paymentTerms: 'Net 30',
    };

    // Mock historical invoices for duplicate detection
    const historicalInvoices = [
      // Add some mock data - in production this would come from backend
    ];

    const po = selectedPO ? getPOByNumber(selectedPO) : undefined;
    const grns = selectedGRNs.length > 0 ? selectedGRNs.map((g) => ({ number: g })) : undefined;

    const insights = generateAIInsights(
      invoiceData,
      vendorDataEnhanced,
      historicalInvoices,
      po,
      grns
    );

    // Filter out ignored insights
    const activeInsights = insights.filter((insight) => !ignoredInsights.has(insight.id));

    setAiInsights(activeInsights);
    setAiActions(generateAIActions(invoiceData));

    // Set overall confidence based on insights
    const blockerCount = activeInsights.filter((insight) => insight.severity === 'blocker').length;
    const warningCount = activeInsights.filter((insight) => insight.severity === 'warning').length;

    if (blockerCount > 0) {
      setOverallConfidence('low');
    } else if (warningCount > 2) {
      setOverallConfidence('medium');
    } else {
      setOverallConfidence('high');
    }
  }, [
    selectedVendor,
    invoiceNumber,
    invoiceDate,
    lineItems,
    selectedPO,
    selectedGRNs,
    vendorGSTNumber,
    ignoredInsights,
  ]);

  useEffect(() => {
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.netPayable || 0), 0);
    setRequiredApprovers(deriveApprovalMatrix(totalAmount));
  }, [lineItems]);

  // Handle AI action clicks
  const handleAIActionClick = (insightId: string, action: string) => {
    const insight = aiInsights.find((ins) => ins.id === insightId);
    if (!insight) return;

    switch (action) {
      case 'view-duplicate':
        alert('Opening duplicate invoice: ' + JSON.stringify(insight.relatedData));
        break;
      case 'apply-tds':
        if (insight.relatedData) {
          const tdsRecommendation = insight.relatedData as { section?: string; rate?: number };
          const updatedItems = lineItems.map((item) => ({
            ...item,
            tdsSection: tdsRecommendation.section ?? item.tdsSection,
            tdsPercent: tdsRecommendation.rate ?? item.tdsPercent,
          }));
          setLineItems(updatedItems);
        }
        break;
      case 'use-master-gstin': {
        const vendor = getVendorByCode(selectedVendor);
        if (vendor) {
          setVendorGSTNumber(vendor.gstin);
        }
        break;
      }
      case 'set-msme-priority':
        alert('MSME payment priority flag set');
        break;
      case 'view-variance':
        alert('Opening PO and GRN variance comparison modal');
        break;
      case 'request-exception':
        setExceptionModalOpen(true);
        break;
      case 'upload-documents':
        alert('Opening document upload dialog');
        break;
      case 'set-due-date':
        alert('Setting payment due date based on terms');
        break;
      default:
        console.log('Action clicked:', action, 'for insight:', insightId);
    }
  };

  // Handle AI action runs
  const handleRunAIAction = (actionId: string) => {
    setAiActions((actions) =>
      actions.map((a) => (a.id === actionId ? { ...a, status: 'running' as const } : a))
    );

    // Simulate action processing
    setTimeout(() => {
      let result = '';
      switch (actionId) {
        case 'check-duplicates':
          result = 'No duplicates found';
          break;
        case 'validate-gst':
          result = 'GSTIN format valid';
          break;
        case 'reconcile-po-grn':
          result = 'All line items match PO and GRN';
          break;
        case 'suggest-tds':
          result = 'TDS Section 194C applied';
          break;
      }

      setAiActions((actions) =>
        actions.map((a) => (a.id === actionId ? { ...a, status: 'completed' as const, result } : a))
      );
    }, 2000);
  };

  // Handle insight ignore
  const handleIgnoreInsight = (insightId: string, justification: string) => {
    setIgnoredInsights((prev) => new Set([...prev, insightId]));
    console.log('Ignored insight:', insightId, 'Reason:', justification);
    // In production, this would be logged to audit trail
  };

  // Handle explain insight
  const handleExplainInsight = (insightId: string) => {
    const insight = aiInsights.find((ins) => ins.id === insightId);
    if (insight) {
      alert(
        `Insight Explanation:\n\n${insight.explanation}\n\nEvidence:\n${insight.evidence?.join('\n')}`
      );
    }
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [selectedVendor, invoiceNumber, invoiceDate, selectedPO, invoiceCurrency];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [selectedVendor, invoiceNumber, invoiceDate, selectedPO, invoiceCurrency]);

  const handleSaveDraftKb = useCallback(() => {
    setSaveStatus('saving');
    handleSaveDraft();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSaveDraft]);

  useFormKeyboardSave(handleSaveDraftKb);

  const totals = calculateTotals();

  // Check if there are blocking insights
  const hasBlockers = aiInsights.some((insight) => insight.severity === 'blocker');

  // Helper component for OCR field display
  const OCRField = ({ label, field }: { label: string; field: ExtractedField }) => {
    const confidenceColor = {
      High: 'bg-green-50 border-green-200',
      Medium: 'bg-yellow-50 border-yellow-200',
      Low: 'bg-red-50 border-red-200',
    };
    const badgeColor = {
      High: 'bg-green-100 text-green-700',
      Medium: 'bg-yellow-100 text-yellow-700',
      Low: 'bg-red-100 text-red-700',
    };

    return (
      <div>
        <label
          className="text-sm mb-1 flex items-center justify-between"
          style={{ color: 'var(--color-mercury-grey)' }}
        >
          <span>{label}</span>
          <span className={`px-2 py-0.5 rounded text-xs ${badgeColor[field.confidence]}`}>
            {field.confidence}
          </span>
        </label>
        <div className={`px-3 py-2 rounded-lg border-2 ${confidenceColor[field.confidence]}`}>
          <span style={{ color: 'var(--color-ink)' }}>{field.value || '-'}</span>
        </div>
      </div>
    );
  };

  // Render upload/OCR mode first
  if (entryMode === 'choose') {
    return (
      <div
        style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}
        className="flex items-center justify-center p-8"
      >
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
              Create PO-Based Invoice
            </h1>
            <p className="text-lg" style={{ color: 'var(--color-mercury-grey)' }}>
              Choose how you'd like to enter invoice data
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Upload Invoice */}
            <button
              onClick={() => setEntryMode('upload')}
              className="bg-white rounded-xl p-8 border-2 hover:border-[var(--color-teal)] hover:bg-[#F0FAFB] transition-all group"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-[var(--color-teal)10] flex items-center justify-center mb-4 group-hover:bg-[var(--color-teal)] transition-colors">
                  <Upload className="w-10 h-10 text-[var(--color-teal)] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl mb-2" style={{ color: 'var(--color-ink)' }}>
                  Upload Invoice
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-mercury-grey)' }}>
                  Upload a PDF or image and let AI extract data automatically
                </p>
                <div className="flex items-center gap-2 text-sm text-[var(--color-teal)]">
                  <Sparkles className="w-4 h-4" />
                  <span>AI-Powered OCR</span>
                </div>
              </div>
            </button>

            {/* Manual Entry */}
            <button
              onClick={() => setEntryMode('manual')}
              className="bg-white rounded-xl p-8 border-2 hover:border-[var(--color-teal)] hover:bg-[#F0FAFB] transition-all group"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-[var(--color-mercury-grey)10] flex items-center justify-center mb-4 group-hover:bg-[var(--color-mercury-grey)] transition-colors">
                  <Edit2 className="w-10 h-10 text-[var(--color-mercury-grey)] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl mb-2" style={{ color: 'var(--color-ink)' }}>
                  Manual Entry
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-mercury-grey)' }}>
                  Enter invoice details manually using the form
                </p>
                <div
                  className="flex items-center gap-2 text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  <FileText className="w-4 h-4" />
                  <span>Traditional Method</span>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/invoices')}
              className="text-sm text-[var(--color-mercury-grey)] hover:text-[var(--color-ink)]"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (entryMode === 'upload' && !ocrData) {
    return (
      <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }} className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => setEntryMode('choose')}
              className="flex items-center gap-2 text-[var(--color-mercury-grey)] hover:text-[var(--color-ink)] mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Options
            </button>
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)' }}>
              Upload Supplier Invoice
            </h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>
              Upload a PDF or image for automatic data extraction
            </p>
          </div>

          <div
            className="bg-white rounded-xl border-2 p-8"
            style={{ borderColor: 'var(--color-silver)' }}
          >
            {!uploadedFile ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-[var(--color-teal)] hover:bg-[#F0FAFB] transition-colors"
                style={{ borderColor: 'var(--color-silver)' }}
              >
                <FileText className="w-12 h-12 text-[var(--color-mercury-grey)] mx-auto mb-4" />
                <p className="mb-2" style={{ color: 'var(--color-ink)' }}>
                  Drag and drop your invoice here, or click to browse
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--color-mercury-grey)' }}>
                  Supported formats: PDF, PNG, JPG (Max 10MB)
                </p>
                <button
                  className="px-6 py-2 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[var(--color-cloud)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-[var(--color-teal)]" />
                    <div>
                      <p style={{ color: 'var(--color-ink)' }}>{uploadedFile.name}</p>
                      <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                        {(uploadedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  {!isExtracting && (
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadProgress(0);
                      }}
                      className="text-[var(--color-mercury-grey)] hover:text-[var(--color-error)]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--color-mercury-grey)' }}>Uploading...</span>
                      <span style={{ color: 'var(--color-teal)' }}>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-[var(--color-silver)] rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${uploadProgress}%`,
                          backgroundColor: 'var(--color-teal)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {isExtracting && (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <div
                      className="animate-spin rounded-full h-6 w-6 border-b-2"
                      style={{ borderColor: 'var(--color-teal)' }}
                    ></div>
                    <span style={{ color: 'var(--color-mercury-grey)' }}>
                      Extracting data from invoice...
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={handleSkipOCR}
                className="text-sm text-[var(--color-mercury-grey)] hover:text-[var(--color-ink)]"
              >
                Skip and enter manually
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (entryMode === 'upload' && ocrData) {
    return (
      <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }} className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl mb-2" style={{ color: 'var(--color-ink)' }}>
              Review Extracted Data
            </h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>
              Verify the extracted information before proceeding
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Document Preview */}
            <div
              className="bg-white rounded-xl border-2 p-6"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ color: 'var(--color-ink)' }}>Document Preview</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(prev - 10, 50))}
                    className="p-2 hover:bg-[var(--color-cloud)] rounded"
                  >
                    <ZoomOut className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  </button>
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(prev + 10, 200))}
                    className="p-2 hover:bg-[var(--color-cloud)] rounded"
                  >
                    <ZoomIn className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  </button>
                  <button
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="p-2 hover:bg-[var(--color-cloud)] rounded"
                  >
                    <RotateCw className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  </button>
                </div>
              </div>
              <div className="bg-[var(--color-cloud)] rounded-lg p-4 h-[500px] overflow-auto flex items-center justify-center">
                {documentPreview && (
                  <img
                    src={documentPreview}
                    alt="Invoice preview"
                    className="max-w-full h-auto shadow-lg"
                    style={{
                      transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Extracted Data */}
            <div
              className="bg-white rounded-xl border-2 p-6 overflow-auto h-[600px]"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ color: 'var(--color-ink)' }}>Extracted Data</h3>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-teal)]" />
                  <span className="text-sm text-[var(--color-teal)]">AI Extracted</span>
                </div>
              </div>

              <div className="space-y-4">
                <OCRField label="Vendor Name" field={ocrData.vendorName} />
                <OCRField label="Vendor GSTIN" field={ocrData.vendorGSTIN} />
                <OCRField label="Invoice Number" field={ocrData.invoiceNumber} />
                <OCRField label="Invoice Date" field={ocrData.invoiceDate} />
                <OCRField label="Invoice Amount" field={ocrData.invoiceAmount} />
                <OCRField label="PO Number" field={ocrData.poNumber} />
                <OCRField label="GRN Number" field={ocrData.grnNumber} />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => {
                setOcrData(null);
                setUploadedFile(null);
                setEntryMode('choose');
              }}
              className="px-6 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSkipOCR}
                className="px-6 py-2 rounded-lg border-2"
                style={{ borderColor: 'var(--color-silver)', color: 'var(--color-mercury-grey)' }}
              >
                Start Fresh
              </button>
              <button
                onClick={handleContinueFromOCR}
                className="px-6 py-2 rounded-lg text-white flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-teal)' }}
              >
                Continue with This Data
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FormShell
      title="Create PO-Based Invoice"
      subtitle="3-way matching with PO and GRN"
      modeLabel="New Transaction"
      variant="transaction"
      completeness={completeness}
      onBack={handleCancel}
      onCancel={handleCancel}
      onSaveDraft={handleSaveDraftKb}
      onSubmit={handleSubmit}
      submitLabel="Submit for Approval"
      draftLabel="Save Draft"
      submitDisabled={hasBlockers}
      saveStatus={saveStatus}
    >
      {/* Main Content Area with AI Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Vendor & Invoice Context */}
          <div
            className="bg-white rounded-xl p-6 mb-6"
            style={{ border: '2px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2
                  className="text-xl mb-1"
                  style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                >
                  Vendor & Invoice Context
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Select vendor and enter invoice details
                </p>
              </div>
              <div className="flex items-center gap-4">
                <EntityCurrencyBadge entityId="entity-ptpl-001" variant="compact" />
                <div
                  className="px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-teal)10',
                    border: '1px solid var(--color-teal)',
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                    Invoice Type
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-teal)', fontWeight: '700' }}>
                    PO-Based
                  </p>
                </div>
              </div>
            </div>

            <FormSection title="Vendor Details" columns={3}>
              <PxFormField
                label="Vendor Name"
                required
                filled={!!selectedVendor}
                hint={!selectedVendor ? 'Vendor selection is mandatory to proceed' : undefined}
              >
                <select
                  value={selectedVendor}
                  onChange={(e) => handleVendorChange(e.target.value)}
                  className="px-input"
                  required
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.code} value={vendor.code}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </PxFormField>

              <PxFormField label="Vendor Code" filled={!!vendorCode}>
                <div className="relative">
                  <input
                    type="text"
                    value={vendorCode}
                    disabled
                    placeholder="Auto-populated"
                    className="px-input"
                    style={{
                      backgroundColor: 'var(--color-cloud)',
                      color: 'var(--color-mercury-grey)',
                    }}
                  />
                  {vendorCode && (
                    <CheckCircle
                      className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2"
                      style={{ color: 'var(--color-teal)' }}
                    />
                  )}
                </div>
              </PxFormField>

              <PxFormField label="Vendor GSTIN" filled={!!vendorGSTNumber}>
                <div className="relative">
                  <input
                    type="text"
                    value={vendorGSTNumber}
                    disabled
                    placeholder="Auto-populated"
                    className="px-input"
                    style={{
                      backgroundColor: 'var(--color-cloud)',
                      color: 'var(--color-mercury-grey)',
                    }}
                  />
                  {vendorGSTNumber && (
                    <CheckCircle
                      className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2"
                      style={{ color: 'var(--color-teal)' }}
                    />
                  )}
                </div>
              </PxFormField>
            </FormSection>

            <FormSection title="Invoice Details" columns={3}>
              {/* System-generated. Read-only always — placeholder on create,
                  real value on edit (still not editable). */}
              <PxFormField label="Invoice Number" filled={!!invoiceNumber.trim()}>
                <div className="relative">
                  <Hash
                    className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  />
                  <input
                    type="text"
                    value={invoiceNumber}
                    readOnly
                    placeholder="Auto-generated on save"
                    className="px-input pl-11 px-input-readonly"
                  />
                </div>
              </PxFormField>

              <PxFormField label="Invoice Date" required filled={!!invoiceDate}>
                <div className="relative">
                  <Calendar
                    className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  />
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="px-input pl-11"
                    required
                  />
                </div>
              </PxFormField>

              <PxFormField label="Payment Due Date" filled={!!paymentDueDate}>
                <div className="relative">
                  <Calendar
                    className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  />
                  <input
                    type="date"
                    value={paymentDueDate}
                    onChange={(e) => {
                      setPaymentDueDate(e.target.value);
                      setPaymentDueDateManuallySet(true);
                    }}
                    className="px-input pl-11"
                    style={msmeWarning.violated ? { borderColor: '#F59E0B' } : undefined}
                  />
                </div>
                {msmeWarning.violated && msmeWarning.message && (
                  <div
                    className="mt-2 p-3 rounded-lg text-sm flex items-start gap-2"
                    style={{
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #F59E0B',
                      color: '#92400E',
                    }}
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{msmeWarning.message}</span>
                  </div>
                )}
              </PxFormField>

              <PxFormField label="Invoice Currency" required filled={!!invoiceCurrency}>
                <div className="relative">
                  <DollarSign
                    className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  />
                  <select
                    value={invoiceCurrency}
                    onChange={(e) => setInvoiceCurrency(e.target.value)}
                    className="px-input pl-11"
                    required
                  >
                    {currencyOptions.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                        {c.symbol ? ` (${c.symbol})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </PxFormField>
            </FormSection>

            {/* Open POs Alert */}
            {selectedVendor && showOpenPOs && purchaseOrders.length > 0 && (
              <div
                className="mt-6 p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-teal)10',
                  border: '1px solid var(--color-teal)',
                }}
              >
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-teal)' }} />
                  <div className="flex-1">
                    <p
                      className="text-sm mb-1"
                      style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                    >
                      Open Purchase Orders Available
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      This vendor has {purchaseOrders.length} open purchase order(s). Proceed to the
                      next step to select PO and GRN.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Open Purchase Orders Section */}
          {selectedVendor && (
            <div
              className="bg-white rounded-xl p-6 mb-6"
              style={{ border: '2px solid var(--color-silver)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className="text-xl mb-1"
                    style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                  >
                    Open Purchase Orders
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Select one or multiple POs for this invoice
                  </p>
                </div>
                <div
                  className="px-3 py-1 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                  }}
                >
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    {purchaseOrders.length} Open PO(s)
                  </p>
                </div>
              </div>

              {/* PO Selection Table */}
              <div className="overflow-x-auto">
                <table
                  className="w-full"
                  style={{ borderCollapse: 'separate', borderSpacing: '0' }}
                >
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: 'var(--color-cloud)' }}>
                      <th
                        className="px-4 py-3 text-left text-xs"
                        style={{
                          color: 'var(--color-mercury-grey)',
                          fontWeight: '600',
                          borderBottom: '2px solid var(--color-silver)',
                        }}
                      >
                        Select
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs"
                        style={{
                          color: 'var(--color-mercury-grey)',
                          fontWeight: '600',
                          borderBottom: '2px solid var(--color-silver)',
                        }}
                      >
                        PO Number
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs"
                        style={{
                          color: 'var(--color-mercury-grey)',
                          fontWeight: '600',
                          borderBottom: '2px solid var(--color-silver)',
                        }}
                      >
                        PO Date
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs"
                        style={{
                          color: 'var(--color-mercury-grey)',
                          fontWeight: '600',
                          borderBottom: '2px solid var(--color-silver)',
                        }}
                      >
                        PO Type
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs"
                        style={{
                          color: 'var(--color-mercury-grey)',
                          fontWeight: '600',
                          borderBottom: '2px solid var(--color-silver)',
                        }}
                      >
                        PO Value
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs"
                        style={{
                          color: 'var(--color-mercury-grey)',
                          fontWeight: '600',
                          borderBottom: '2px solid var(--color-silver)',
                        }}
                      >
                        Open PO Amount
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs"
                        style={{
                          color: 'var(--color-mercury-grey)',
                          fontWeight: '600',
                          borderBottom: '2px solid var(--color-silver)',
                        }}
                      >
                        PO Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((po, index) => {
                      const isSelected = selectedPO === po.poNumber;

                      return (
                        <tr
                          key={po.poNumber}
                          onClick={() => handlePOSelection(po.poNumber)}
                          className="cursor-pointer transition-colors hover:bg-opacity-50"
                          style={{
                            backgroundColor: isSelected
                              ? 'var(--color-teal)10'
                              : index % 2 === 0
                                ? '#FFFFFF'
                                : 'var(--color-cloud)',
                            borderLeft: isSelected
                              ? '3px solid var(--color-teal)'
                              : '3px solid transparent',
                          }}
                        >
                          <td
                            className="px-4 py-3"
                            style={{ borderBottom: '1px solid var(--color-silver)' }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handlePOSelection(po.poNumber)}
                              className="w-4 h-4"
                              style={{ accentColor: 'var(--color-teal)' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td
                            className="px-4 py-3"
                            style={{ borderBottom: '1px solid var(--color-silver)' }}
                          >
                            <p
                              className="text-sm"
                              style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                            >
                              {po.poNumber}
                            </p>
                          </td>
                          <td
                            className="px-4 py-3 text-sm"
                            style={{
                              color: 'var(--color-mercury-grey)',
                              borderBottom: '1px solid var(--color-silver)',
                            }}
                          >
                            {po.date}
                          </td>
                          <td
                            className="px-4 py-3"
                            style={{ borderBottom: '1px solid var(--color-silver)' }}
                          >
                            <span
                              className="px-2 py-1 rounded text-xs"
                              style={{
                                backgroundColor: po.type === 'Goods' ? '#10B98110' : '#007D8710',
                                color: po.type === 'Goods' ? '#10B981' : '#007D87',
                                fontWeight: '600',
                              }}
                            >
                              {po.type}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-right"
                            style={{
                              color: 'var(--color-ink)',
                              fontWeight: '600',
                              borderBottom: '1px solid var(--color-silver)',
                            }}
                          >
                            ₹{po.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-right"
                            style={{
                              color: 'var(--color-teal)',
                              fontWeight: '600',
                              borderBottom: '1px solid var(--color-silver)',
                            }}
                          >
                            ₹{po.openAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td
                            className="px-4 py-3"
                            style={{ borderBottom: '1px solid var(--color-silver)' }}
                          >
                            <span
                              className="px-2 py-1 rounded text-xs"
                              style={{
                                backgroundColor: 'var(--color-teal)10',
                                color: 'var(--color-teal)',
                                fontWeight: '600',
                              }}
                            >
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {purchaseOrders.length === 0 && (
                <div className="py-12 text-center">
                  <Package
                    className="w-12 h-12 mx-auto mb-3"
                    style={{ color: 'var(--color-silver)' }}
                  />
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    No open purchase orders found for this vendor
                  </p>
                </div>
              )}
            </div>
          )}

          {/* GRN-SRN Selection Section */}
          {selectedPO && (
            <div
              className="bg-white rounded-xl p-6 mb-6"
              style={{ border: '2px solid var(--color-silver)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className="text-xl mb-1"
                    style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                  >
                    GRN - SRN Selection
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Select goods-service receipt notes linked to PO {selectedPO}
                  </p>
                </div>
                {availableGRNs.length > 0 && (
                  <div
                    className="px-3 py-1 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-cloud)',
                      border: '1px solid var(--color-silver)',
                    }}
                  >
                    <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                      {selectedGRNs.length} / {availableGRNs.length} Selected
                    </p>
                  </div>
                )}
              </div>

              {availableGRNs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table
                    className="w-full"
                    style={{ borderCollapse: 'separate', borderSpacing: '0' }}
                  >
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr style={{ backgroundColor: 'var(--color-cloud)' }}>
                        <th
                          className="px-4 py-3 text-left text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '600',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Select
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '600',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          GRN-SRN Number
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '600',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Date
                        </th>
                        <th
                          className="px-4 py-3 text-right text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '600',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Item Count
                        </th>
                        <th
                          className="px-4 py-3 text-right text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '600',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Quantity Received
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '600',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableGRNs.map((grn, index) => {
                        const isSelected = selectedGRNs.includes(grn.grnNumber);
                        const itemCount = grn.lineItems?.length || 0;

                        return (
                          <tr
                            key={grn.grnNumber}
                            onClick={() => handleGRNToggle(grn.grnNumber)}
                            className="cursor-pointer transition-colors hover:bg-opacity-50"
                            style={{
                              backgroundColor: isSelected
                                ? 'var(--color-teal)10'
                                : index % 2 === 0
                                  ? '#FFFFFF'
                                  : 'var(--color-cloud)',
                              borderLeft: isSelected
                                ? '3px solid var(--color-teal)'
                                : '3px solid transparent',
                            }}
                          >
                            <td
                              className="px-4 py-3"
                              style={{ borderBottom: '1px solid var(--color-silver)' }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleGRNToggle(grn.grnNumber)}
                                className="w-4 h-4"
                                style={{ accentColor: 'var(--color-teal)' }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td
                              className="px-4 py-3"
                              style={{ borderBottom: '1px solid var(--color-silver)' }}
                            >
                              <p
                                className="text-sm"
                                style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                              >
                                {grn.grnNumber}
                              </p>
                            </td>
                            <td
                              className="px-4 py-3 text-sm"
                              style={{
                                color: 'var(--color-mercury-grey)',
                                borderBottom: '1px solid var(--color-silver)',
                              }}
                            >
                              {grn.receiptDate}
                            </td>
                            <td
                              className="px-4 py-3 text-sm text-right"
                              style={{
                                color: 'var(--color-ink)',
                                borderBottom: '1px solid var(--color-silver)',
                              }}
                            >
                              {itemCount}
                            </td>
                            <td
                              className="px-4 py-3 text-sm text-right"
                              style={{
                                color: 'var(--color-ink)',
                                fontWeight: '600',
                                borderBottom: '1px solid var(--color-silver)',
                              }}
                            >
                              {grn.qtyReceived}
                            </td>
                            <td
                              className="px-4 py-3"
                              style={{ borderBottom: '1px solid var(--color-silver)' }}
                            >
                              <span
                                className="px-2 py-1 rounded text-xs"
                                style={{
                                  backgroundColor: '#10B98110',
                                  color: '#10B981',
                                  fontWeight: '600',
                                }}
                              >
                                {grn.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  className="p-6 rounded-lg"
                  style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B' }}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: '#F59E0B' }} />
                    <div>
                      <p
                        className="text-sm mb-1"
                        style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                      >
                        No GRN-SRN Available
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                        Invoice can proceed with PO quantities. Line items will be populated from
                        the PO.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GST Determination Section */}
          {selectedPO && (
            <GSTDetermination
              companyGSTIN={companyGSTIN}
              setCompanyGSTIN={setCompanyGSTIN}
              companyState={companyState}
              vendorGSTNumber={vendorGSTNumber}
              supplierState={supplierState}
              placeOfSupply={placeOfSupply}
              setPlaceOfSupply={setPlaceOfSupply}
              shipToState={shipToState}
              setShipToState={setShipToState}
              supplyType={supplyType}
              setSupplyType={setSupplyType}
              reverseChargeApplicable={reverseChargeApplicable}
              setReverseChargeApplicable={setReverseChargeApplicable}
              isSEZ={isSEZ}
              setIsSEZ={setIsSEZ}
              isExport={isExport}
              setIsExport={setIsExport}
              gstType={gstType}
              gstTypeOverridden={gstTypeOverridden}
              showGSTOverride={showGSTOverride}
              setShowGSTOverride={setShowGSTOverride}
              gstOverrideReason={gstOverrideReason}
              setGstOverrideReason={setGstOverrideReason}
              gstOverrideComments={gstOverrideComments}
              setGstOverrideComments={setGstOverrideComments}
              handleGSTTypeOverride={handleGSTTypeOverride}
              gstValidationIssues={gstValidationIssues}
              selectedPO={selectedPO}
              statesList={getStatesListWithCodes()}
            />
          )}

          {/* Line Items Table (Auto-populated from PO and GRN) */}
          {selectedPO &&
            (selectedGRNs.length > 0 ||
              availableGRNs.filter((grn) => grn.poNumber === selectedPO).length === 0) && (
              <div
                className="bg-white rounded-xl p-6 mb-6"
                style={{ border: '2px solid var(--color-silver)' }}
              >
                {/* Smart Validation Info Banner */}
                {policyConfig.hardLockRate && (
                  <div
                    className="mb-4 p-4 rounded-lg flex items-start gap-3"
                    style={{
                      backgroundColor: 'var(--color-teal-tint)',
                      border: '1px solid var(--color-teal)',
                    }}
                  >
                    <Lock
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--color-teal)' }}
                    />
                    <div>
                      <p
                        className="text-sm mb-1"
                        style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                      >
                        Smart Rate Validation Active - 3-Way Match Control
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                        Invoice rates are locked to PO rates for audit compliance. Rate fields are
                        read-only and cannot exceed PO values. To change a rate, you must either
                        amend the PO or request an exception approval from CFO.
                      </p>
                    </div>
                  </div>
                )}

                {/* Smart TDS Info Banner */}
                <div
                  className="mb-6 p-4 rounded-lg flex items-start gap-3"
                  style={{ backgroundColor: '#FEF3F2', border: '1px solid #FCA5A5' }}
                >
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                  <div>
                    <p
                      className="text-sm mb-1"
                      style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                    >
                      Smart TDS Section Auto-Suggestion Enabled
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      When you select a TDS Rate, the system will automatically suggest the most
                      appropriate TDS Section based on common tax regulations. You can override the
                      suggestion by manually selecting a different section. TDS is calculated on the
                      base amount (before GST).
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2
                      className="text-xl mb-1"
                      style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                    >
                      Invoice Line Items
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      {selectedGRNs.length > 0
                        ? 'Auto-populated from selected PO and GRN(s) - editable quantities within limits'
                        : 'Auto-populated from PO - no GRN available'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div
                      className="px-3 py-1 rounded-lg"
                      style={{
                        backgroundColor: 'var(--color-cloud)',
                        border: '1px solid var(--color-silver)',
                      }}
                    >
                      <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        {
                          lineItems.filter((item) =>
                            selectedGRNs.length > 0 ? selectedGRNs.includes(item.grnNumber) : true
                          ).length
                        }{' '}
                        Line Item(s)
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="overflow-x-auto"
                  style={{ maxHeight: '500px', position: 'relative' }}
                >
                  <table
                    className="w-full"
                    style={{ minWidth: '2600px', borderCollapse: 'separate', borderSpacing: '0' }}
                  >
                    <thead
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 20,
                        backgroundColor: 'var(--color-cloud)',
                      }}
                    >
                      <tr>
                        <th
                          className="text-left px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '140px',
                            borderBottom: '2px solid var(--color-silver)',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: 'var(--color-cloud)',
                            zIndex: 21,
                          }}
                        >
                          Item Field
                        </th>
                        <th
                          className="text-left px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '200px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Item Description
                        </th>
                        <th
                          className="text-left px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '120px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Account Code
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '80px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Qty
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '100px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Rate
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '120px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Base Amount
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '90px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          GST Rate
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '120px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          GST Amount
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '100px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          CGST
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '100px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          SGST
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '100px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          IGST
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '130px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Gross Amount
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '100px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          TDS Rate
                        </th>
                        <th
                          className="text-left px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '110px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          TDS Section
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '120px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          TDS Amount
                        </th>
                        <th
                          className="text-right px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '130px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Net Payable
                        </th>
                        <th
                          className="text-left px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '130px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Cost Centre
                        </th>
                        <th
                          className="text-left px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '130px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Profit Centre
                        </th>
                        <th
                          className="text-left px-3 py-3 text-xs"
                          style={{
                            color: 'var(--color-mercury-grey)',
                            fontWeight: '700',
                            width: '120px',
                            borderBottom: '2px solid var(--color-silver)',
                          }}
                        >
                          Project
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems
                        .filter((item) => selectedGRNs.includes(item.grnNumber))
                        .map((item, index) => (
                          <tr
                            key={item.id}
                            style={{
                              borderTop: index > 0 ? '1px solid var(--color-silver)' : 'none',
                              backgroundColor: tdsLineErrors[item.id]
                                ? 'var(--color-error-light)'
                                : 'transparent',
                            }}
                          >
                            {/* 1. Item Name */}
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={item.itemName}
                                disabled
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  backgroundColor: 'var(--color-cloud)',
                                  color: 'var(--color-mercury-grey)',
                                }}
                              />
                            </td>
                            {/* 2. Item Description */}
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={item.itemDescription}
                                onChange={(e) =>
                                  updateLineItem(item.id, 'itemDescription', e.target.value)
                                }
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  color: 'var(--color-ink)',
                                }}
                              />
                            </td>
                            {/* 3. Account Code */}
                            <td className="px-3 py-3">
                              <select
                                value={item.accountCode}
                                onChange={(e) =>
                                  updateLineItem(item.id, 'accountCode', e.target.value)
                                }
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  color: 'var(--color-ink)',
                                }}
                              >
                                {accountCodes.map((acc) => (
                                  <option key={acc.code} value={acc.code}>
                                    {acc.code}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {/* 4. Qty */}
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) =>
                                  updateLineItem(item.id, 'qty', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  color: 'var(--color-ink)',
                                }}
                              />
                            </td>
                            {/* 5. Rate (Unit Price) - LOCKED TO PO */}
                            <td className="px-3 py-3" style={{ verticalAlign: 'top' }}>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  disabled={policyConfig.hardLockRate}
                                  onChange={(e) =>
                                    updateLineItem(
                                      item.id,
                                      'unitPrice',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full px-2 py-2 pr-8 rounded text-sm"
                                  style={{
                                    border: rateErrors[item.id]
                                      ? '2px solid var(--color-error)'
                                      : '1px solid var(--color-silver)',
                                    color: 'var(--color-ink)',
                                    backgroundColor: policyConfig.hardLockRate
                                      ? 'var(--color-cloud)'
                                      : rateErrors[item.id]
                                        ? 'var(--color-error-light)'
                                        : 'white',
                                    cursor: policyConfig.hardLockRate ? 'not-allowed' : 'text',
                                  }}
                                  title={
                                    policyConfig.hardLockRate
                                      ? 'Rate locked to PO. To change rate, amend the PO or request an exception.'
                                      : ''
                                  }
                                />
                                {policyConfig.hardLockRate && (
                                  <Lock
                                    className="absolute right-2 top-2.5 w-4 h-4"
                                    style={{ color: 'var(--color-mercury-grey)' }}
                                  />
                                )}
                                {item.poRate !== undefined && (
                                  <div className="flex items-center justify-between mt-1">
                                    <div className="flex items-center gap-1">
                                      <Info
                                        className="w-3 h-3"
                                        style={{ color: 'var(--color-mercury-grey)' }}
                                      />
                                      <span
                                        className="text-xs"
                                        style={{ color: 'var(--color-mercury-grey)' }}
                                      >
                                        PO: ₹{item.poRate.toFixed(2)}
                                      </span>
                                    </div>
                                    {item.unitPrice > item.poRate && (
                                      <span
                                        className="text-xs"
                                        style={{ color: 'var(--color-error)', fontWeight: '600' }}
                                      >
                                        +
                                        {(
                                          ((item.unitPrice - item.poRate) / item.poRate) *
                                          100
                                        ).toFixed(1)}
                                        %
                                      </span>
                                    )}
                                  </div>
                                )}
                                {rateErrors[item.id] && (
                                  <div
                                    className="mt-2 p-2 rounded text-xs"
                                    style={{
                                      backgroundColor: 'var(--color-error-light)',
                                      border: '1px solid var(--color-error)',
                                    }}
                                  >
                                    <div className="flex items-start gap-1 mb-2">
                                      <AlertCircle
                                        className="w-3 h-3 flex-shrink-0 mt-0.5"
                                        style={{ color: 'var(--color-error)' }}
                                      />
                                      <span style={{ color: 'var(--color-error)' }}>
                                        {rateErrors[item.id]}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setExceptionLineItem(item);
                                        setExceptionModalOpen(true);
                                      }}
                                      className="w-full px-2 py-1.5 rounded text-xs transition-colors"
                                      style={{
                                        backgroundColor: 'var(--color-teal)',
                                        color: '#FFFFFF',
                                        fontWeight: '600',
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                          'var(--color-teal-dark)')
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                          'var(--color-teal)')
                                      }
                                    >
                                      Request Exception Approval
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            {/* 6. Base Amount */}
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={`₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                disabled
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  backgroundColor: 'var(--color-cloud)',
                                  color: 'var(--color-ink)',
                                  fontWeight: '600',
                                }}
                              />
                            </td>
                            {/* 7. GST Rate */}
                            <td className="px-3 py-3">
                              <select
                                value={item.gstPercent}
                                onChange={(e) =>
                                  updateLineItem(item.id, 'gstPercent', parseFloat(e.target.value))
                                }
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  color: 'var(--color-ink)',
                                }}
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                              </select>
                            </td>
                            {/* 8. GST Amount (Total) */}
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={`₹${item.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                disabled
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  backgroundColor: '#FEF3C7',
                                  color: '#92400E',
                                  fontWeight: '600',
                                }}
                              />
                            </td>
                            {/* 9. CGST */}
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={`₹${item.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                disabled
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  backgroundColor: '#FEF3C7',
                                  color: '#92400E',
                                  fontWeight: '600',
                                }}
                              />
                            </td>
                            {/* 10. SGST */}
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={`₹${item.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                disabled
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  backgroundColor: '#FEF3C7',
                                  color: '#92400E',
                                  fontWeight: '600',
                                }}
                              />
                            </td>
                            {/* 11. IGST */}
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={`₹${item.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                disabled
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  backgroundColor: '#FEF3C7',
                                  color: '#92400E',
                                  fontWeight: '600',
                                }}
                              />
                            </td>
                            {/* 12. Gross Amount */}
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={`₹${item.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                disabled
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  backgroundColor: 'var(--color-teal)10',
                                  color: 'var(--color-teal)',
                                  fontWeight: '700',
                                }}
                              />
                            </td>
                            {/* 13. TDS Rate */}
                            <td className="px-3 py-3">
                              <select
                                value={item.tdsPercent}
                                onChange={(e) =>
                                  updateLineItem(item.id, 'tdsPercent', parseFloat(e.target.value))
                                }
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  color: 'var(--color-ink)',
                                }}
                                title="Select TDS rate from configured TDS master sections"
                              >
                                <option value={0}>0%</option>
                                {tdsRateOptions.map((rate) => (
                                  <option key={rate} value={rate}>
                                    {rate}%
                                  </option>
                                ))}
                              </select>
                            </td>
                            {/* 14. TDS Section */}
                            <td className="px-3 py-3">
                              <select
                                value={item.tdsSection}
                                onChange={(e) =>
                                  updateLineItem(item.id, 'tdsSection', e.target.value)
                                }
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  color: 'var(--color-ink)',
                                }}
                                title="TDS Section determines the nature of payment and applicable rate"
                              >
                                <option value="">Select section</option>
                                {activeTdsSections.map((section) => (
                                  <option key={section.id} value={section.sectionCode}>
                                    {section.sectionCode} - {section.sectionName}
                                  </option>
                                ))}
                              </select>
                              {tdsLineErrors[item.id] && (
                                <p
                                  className="mt-1 text-xs"
                                  style={{ color: 'var(--color-error-dark)' }}
                                >
                                  {tdsLineErrors[item.id]}
                                </p>
                              )}
                            </td>
                            {/* 15. TDS Amount */}
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={`₹${item.tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                disabled
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  backgroundColor: 'var(--color-error-light)',
                                  color: '#EF4444',
                                  fontWeight: '600',
                                }}
                              />
                            </td>
                            {/* 16. Net Payable */}
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={`₹${item.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                disabled
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  backgroundColor: '#DCFCE7',
                                  color: '#166534',
                                  fontWeight: '700',
                                }}
                              />
                            </td>
                            {/* 17. Cost Centre */}
                            <td className="px-3 py-3">
                              <select
                                value={item.costCentre}
                                onChange={(e) =>
                                  updateLineItem(item.id, 'costCentre', e.target.value)
                                }
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  color: 'var(--color-ink)',
                                }}
                              >
                                {costCentres.map((cc) => (
                                  <option key={cc} value={cc}>
                                    {cc}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {/* 18. Profit Centre */}
                            <td className="px-3 py-3">
                              <select
                                value={item.profitCentre}
                                onChange={(e) =>
                                  updateLineItem(item.id, 'profitCentre', e.target.value)
                                }
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  color: 'var(--color-ink)',
                                }}
                              >
                                {profitCentres.map((pc) => (
                                  <option key={pc} value={pc}>
                                    {pc}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {/* 19. Project */}
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={item.project}
                                onChange={(e) => updateLineItem(item.id, 'project', e.target.value)}
                                className="w-full px-2 py-2 rounded text-sm"
                                style={{
                                  border: '1px solid var(--color-silver)',
                                  color: 'var(--color-ink)',
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot
                      style={{
                        backgroundColor: 'var(--color-cloud)',
                        borderTop: '2px solid var(--color-silver)',
                      }}
                    >
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-3 text-right"
                          style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                        >
                          TOTALS:
                        </td>
                        {/* Base Amount */}
                        <td className="px-3 py-3">
                          <div
                            className="px-2 py-2 rounded text-sm"
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '2px solid var(--color-teal)',
                              color: 'var(--color-teal)',
                              fontWeight: '700',
                              textAlign: 'center',
                            }}
                          >
                            ₹{totals.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="px-3 py-3"></td>
                        {/* GST Amount */}
                        <td className="px-3 py-3">
                          <div
                            className="px-2 py-2 rounded text-sm"
                            style={{
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              fontWeight: '700',
                              textAlign: 'center',
                            }}
                          >
                            ₹{totals.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        {/* CGST */}
                        <td className="px-3 py-3">
                          <div
                            className="px-2 py-2 rounded text-sm"
                            style={{
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              fontWeight: '700',
                              textAlign: 'center',
                            }}
                          >
                            ₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        {/* SGST */}
                        <td className="px-3 py-3">
                          <div
                            className="px-2 py-2 rounded text-sm"
                            style={{
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              fontWeight: '700',
                              textAlign: 'center',
                            }}
                          >
                            ₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        {/* IGST */}
                        <td className="px-3 py-3">
                          <div
                            className="px-2 py-2 rounded text-sm"
                            style={{
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              fontWeight: '700',
                              textAlign: 'center',
                            }}
                          >
                            ₹{totals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        {/* Gross Amount */}
                        <td className="px-3 py-3">
                          <div
                            className="px-2 py-2 rounded text-sm"
                            style={{
                              backgroundColor: 'var(--color-teal)',
                              color: '#FFFFFF',
                              fontWeight: '700',
                              textAlign: 'center',
                            }}
                          >
                            ₹
                            {totals.grossAmount.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </td>
                        {/* TDS Rate - Empty */}
                        <td className="px-3 py-3"></td>
                        {/* TDS Section - Empty */}
                        <td className="px-3 py-3"></td>
                        {/* TDS Amount */}
                        <td className="px-3 py-3">
                          <div
                            className="px-2 py-2 rounded text-sm"
                            style={{
                              backgroundColor: 'var(--color-error-light)',
                              color: '#EF4444',
                              fontWeight: '700',
                              textAlign: 'center',
                            }}
                          >
                            ₹{totals.tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        {/* Net Payable */}
                        <td className="px-3 py-3">
                          <div
                            className="px-2 py-2 rounded text-sm"
                            style={{
                              backgroundColor: '#166534',
                              color: '#FFFFFF',
                              fontWeight: '700',
                              textAlign: 'center',
                            }}
                          >
                            ₹
                            {totals.netPayable.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </td>
                        <td colSpan={3}></td>
                      </tr>

                      {/* Tax Summary Rows */}
                      <tr style={{ borderTop: '1px solid var(--color-silver)' }}>
                        <td
                          colSpan={6}
                          className="px-3 py-3 text-right"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                        >
                          Taxable Amount:
                        </td>
                        <td colSpan={13} className="px-3 py-3">
                          <span style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                            ₹{totals.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-3 text-right"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                        >
                          Total CGST:
                        </td>
                        <td colSpan={13} className="px-3 py-3">
                          <span style={{ color: '#92400E', fontWeight: '700' }}>
                            ₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-3 text-right"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                        >
                          Total SGST:
                        </td>
                        <td colSpan={13} className="px-3 py-3">
                          <span style={{ color: '#92400E', fontWeight: '700' }}>
                            ₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-3 text-right"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                        >
                          Total IGST:
                        </td>
                        <td colSpan={13} className="px-3 py-3">
                          <span style={{ color: '#92400E', fontWeight: '700' }}>
                            ₹{totals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-3 text-right"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                        >
                          Total GST:
                        </td>
                        <td colSpan={13} className="px-3 py-3">
                          <span style={{ color: '#92400E', fontWeight: '700' }}>
                            ₹{totals.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>

                      <tr style={{ borderTop: '2px solid var(--color-silver)' }}>
                        <td
                          colSpan={6}
                          className="px-3 py-3 text-right"
                          style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}
                        >
                          Gross Invoice Amount:
                        </td>
                        <td colSpan={13} className="px-3 py-3">
                          <span
                            style={{
                              color: 'var(--color-teal)',
                              fontWeight: '700',
                              fontSize: '18px',
                            }}
                          >
                            ₹
                            {totals.grossAmount.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                      </tr>

                      <tr style={{ borderTop: '1px solid var(--color-silver)' }}>
                        <td
                          colSpan={6}
                          className="px-3 py-3 text-right"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                        >
                          Less: TDS:
                        </td>
                        <td colSpan={13} className="px-3 py-3">
                          <span style={{ color: '#EF4444', fontWeight: '700' }}>
                            -₹{totals.tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>

                      {retentionRequired.length > 0 &&
                        Object.values(retentionAmounts).reduce((sum, val) => sum + val, 0) > 0 && (
                          <>
                            {retentionRequired.map(
                              (type) =>
                                retentionAmounts[type as keyof typeof retentionAmounts] > 0 && (
                                  <tr key={type}>
                                    <td
                                      colSpan={6}
                                      className="px-3 py-3 text-right"
                                      style={{
                                        color: 'var(--color-mercury-grey)',
                                        fontWeight: '600',
                                      }}
                                    >
                                      Less: {type} Retention:
                                    </td>
                                    <td colSpan={13} className="px-3 py-3">
                                      <span style={{ color: '#EF4444', fontWeight: '700' }}>
                                        -₹
                                        {retentionAmounts[
                                          type as keyof typeof retentionAmounts
                                        ].toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </span>
                                    </td>
                                  </tr>
                                )
                            )}
                            <tr>
                              <td
                                colSpan={6}
                                className="px-3 py-3 text-right"
                                style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                              >
                                Total Retention:
                              </td>
                              <td colSpan={13} className="px-3 py-3">
                                <span style={{ color: '#EF4444', fontWeight: '700' }}>
                                  -₹
                                  {Object.values(retentionAmounts)
                                    .reduce((sum, val) => sum + val, 0)
                                    .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                            </tr>
                          </>
                        )}

                      <tr style={{ borderTop: '2px solid #166534', backgroundColor: '#166534' }}>
                        <td
                          colSpan={6}
                          className="px-3 py-4 text-right"
                          style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '18px' }}
                        >
                          NET PAYABLE AMOUNT:
                        </td>
                        <td colSpan={13} className="px-3 py-4">
                          <span style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '20px' }}>
                            ₹
                            {totals.netPayable.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* TDS Summary Section */}
                {lineItems.filter(
                  (item) => selectedGRNs.includes(item.grnNumber) && item.tdsPercent > 0
                ).length > 0 && (
                  <div
                    className="mt-6 p-5 rounded-xl"
                    style={{ backgroundColor: '#FEF3F2', border: '2px solid #FCA5A5' }}
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <Receipt className="w-5 h-5 mt-0.5" style={{ color: '#EF4444' }} />
                      <div>
                        <h3
                          className="text-sm mb-1"
                          style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                        >
                          TDS Summary by Section
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          Tax deducted at source breakdown for compliance reporting
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Array.from(
                        new Set(
                          lineItems
                            .filter(
                              (item) => selectedGRNs.includes(item.grnNumber) && item.tdsPercent > 0
                            )
                            .map((item) => item.tdsSection)
                        )
                      ).map((section) => {
                        const sectionItems = lineItems.filter(
                          (item) =>
                            selectedGRNs.includes(item.grnNumber) &&
                            item.tdsSection === section &&
                            item.tdsPercent > 0
                        );
                        const sectionTDS = sectionItems.reduce((sum, item) => sum + item.tds, 0);
                        const sectionBase = sectionItems.reduce(
                          (sum, item) => sum + item.amount,
                          0
                        );
                        const avgRate = sectionItems.length > 0 ? sectionItems[0].tdsPercent : 0;

                        return (
                          <div
                            key={section}
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: '#FFFFFF', border: '1px solid #FCA5A5' }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className="text-xs px-2 py-1 rounded"
                                style={{
                                  backgroundColor: 'var(--color-error-light)',
                                  color: '#991B1B',
                                  fontWeight: '700',
                                }}
                              >
                                {section}
                              </span>
                              <span
                                className="text-xs"
                                style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                              >
                                {avgRate}%
                              </span>
                            </div>
                            <p
                              className="text-xs mb-2"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              {tdsSectionNameMap[section] || 'Configured section'}
                            </p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span style={{ color: 'var(--color-mercury-grey)' }}>
                                  Base Amount:
                                </span>
                                <span style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                                  ₹
                                  {sectionBase.toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span style={{ color: 'var(--color-mercury-grey)' }}>
                                  TDS Amount:
                                </span>
                                <span style={{ color: '#EF4444', fontWeight: '700' }}>
                                  ₹
                                  {sectionTDS.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-6 grid gap-4">
                  <TDSThresholdTracker
                    lineItems={lineItems.map(
                      (line) =>
                        ({
                          id: line.id,
                          qty: line.qty,
                          rate: line.unitPrice,
                          taxableAmount: line.amount,
                          tdsSection: line.tdsSection || 'None',
                          tdsRate: line.tdsPercent || 0,
                          tdsAmount: line.tds || 0,
                          netPayable: line.netPayable || 0,
                          description: line.itemDescription || line.itemName || '',
                        }) as any
                    )}
                  />
                  <JournalEntryPreview
                    compact
                    formValues={{
                      header: {
                        invoiceType,
                        invoiceNumber,
                        invoiceDate,
                        rcm: reverseChargeApplicable,
                        exempt: false,
                        sez: isSEZ,
                      } as any,
                      vendor: {
                        id: selectedVendor || 'vendor',
                        name: selectedVendor || '',
                        vendorType: 'company',
                        panValid: true,
                        lowerCert: false,
                        lowerRate: 0,
                        tdsExempt: false,
                        itrFiled: true,
                        gstReg: 'reg',
                      } as any,
                      lineItems: lineItems.map((line) => ({
                        id: line.id,
                        description: line.itemDescription || line.itemName || '',
                        qty: line.qty,
                        rate: line.unitPrice,
                        taxableAmount: line.amount,
                        gstRate: line.gstPercent,
                        igst: line.igst,
                        cgst: line.cgst,
                        sgst: line.sgst,
                        tdsSection: line.tdsSection || 'None',
                        tdsRate: line.tdsPercent || 0,
                        tdsAmount: line.tds || 0,
                        netPayable: line.netPayable || 0,
                        glCode: line.accountCode || '',
                        costCentre: line.costCentre || '',
                      })),
                    }}
                  />
                </div>
              </div>
            )}

          {/* Retention Capture Section */}
          {selectedPO &&
            (selectedGRNs.length > 0 ||
              availableGRNs.filter((grn) => grn.poNumber === selectedPO).length === 0) && (
              <div
                className="bg-white rounded-xl p-6 mb-6"
                style={{ border: '2px solid var(--color-silver)' }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2
                      className="text-xl mb-1"
                      style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                    >
                      Retention Management
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      Contract-based retention for this invoice
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={retentionRequired.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Default to enabling at least one type
                          } else {
                            setRetentionRequired([]);
                            setRetentionAmounts({ GST: 0, PF: 0, ESI: 0, Other: 0 });
                          }
                        }}
                        className="w-5 h-5"
                        style={{ accentColor: 'var(--color-teal)' }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                      >
                        Retention Applicable
                      </span>
                    </label>
                  </div>
                </div>

                {retentionRequired.length > 0 ? (
                  <div className="space-y-6">
                    {/* Retention Type Selection */}
                    <div>
                      <label
                        className="block text-sm mb-3"
                        style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                      >
                        Retention Type
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['GST', 'PF', 'ESI', 'Other'].map((type) => (
                          <label
                            key={type}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all"
                            style={{
                              border: `2px solid ${retentionRequired.includes(type) ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                              backgroundColor: retentionRequired.includes(type)
                                ? 'var(--color-teal)10'
                                : '#FFFFFF',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={retentionRequired.includes(type)}
                              onChange={() => handleRetentionToggle(type)}
                              className="w-5 h-5"
                              style={{ accentColor: 'var(--color-teal)' }}
                            />
                            <span style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                              {type}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Retention Amount Fields */}
                    {retentionRequired.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {retentionRequired.map((type) => (
                          <div key={type}>
                            <label
                              className="block text-sm mb-2"
                              style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                            >
                              {type} Retention Amount (₹)
                            </label>
                            <input
                              type="number"
                              value={retentionAmounts[type as keyof typeof retentionAmounts] || ''}
                              onChange={(e) =>
                                setRetentionAmounts({
                                  ...retentionAmounts,
                                  [type]: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.00"
                              className="w-full px-4 py-3 rounded-lg text-base"
                              style={{
                                border: '2px solid var(--color-silver)',
                                color: 'var(--color-ink)',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Retention Summary */}
                    {Object.values(retentionAmounts).reduce((sum, val) => sum + val, 0) > 0 && (
                      <div
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B' }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-sm"
                            style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                          >
                            Total Retention Deducted:
                          </span>
                          <span className="text-lg" style={{ color: '#92400E', fontWeight: '700' }}>
                            -₹
                            {Object.values(retentionAmounts)
                              .reduce((sum, val) => sum + val, 0)
                              .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <p className="text-xs mt-2" style={{ color: 'var(--color-mercury-grey)' }}>
                          Retention will impact net payable but remains as a liability on the books.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="p-6 rounded-lg text-center"
                    style={{ backgroundColor: 'var(--color-cloud)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      No retention applicable for this invoice. Toggle "Retention Applicable" to
                      configure.
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* Advance Adjustment Section */}
          {selectedPO &&
            (selectedGRNs.length > 0 ||
              availableGRNs.filter((grn) => grn.poNumber === selectedPO).length === 0) && (
              <div
                className="bg-white rounded-xl p-6 mb-6"
                style={{ border: '2px solid var(--color-silver)' }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2
                      className="text-xl mb-1"
                      style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                    >
                      Advance Adjustment
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      Adjust open advances for the selected vendor
                    </p>
                  </div>
                  <div
                    className="px-3 py-1 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-cloud)',
                      border: '1px solid var(--color-silver)',
                    }}
                  >
                    <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                      {vendorAdvances.length} Open Advance(s)
                    </p>
                  </div>
                </div>

                {selectedVendor ? (
                  vendorAdvances.length > 0 ? (
                    <>
                      <div className="overflow-x-auto mb-4">
                        <table
                          className="w-full"
                          style={{ borderCollapse: 'separate', borderSpacing: '0' }}
                        >
                          <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                            <tr>
                              <th
                                className="px-4 py-3 text-left text-xs"
                                style={{
                                  color: 'var(--color-mercury-grey)',
                                  fontWeight: '700',
                                  borderBottom: '2px solid var(--color-silver)',
                                }}
                              >
                                Advance Type
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs"
                                style={{
                                  color: 'var(--color-mercury-grey)',
                                  fontWeight: '700',
                                  borderBottom: '2px solid var(--color-silver)',
                                }}
                              >
                                Reference
                              </th>
                              <th
                                className="px-4 py-3 text-right text-xs"
                                style={{
                                  color: 'var(--color-mercury-grey)',
                                  fontWeight: '700',
                                  borderBottom: '2px solid var(--color-silver)',
                                }}
                              >
                                Original Advance
                              </th>
                              <th
                                className="px-4 py-3 text-right text-xs"
                                style={{
                                  color: 'var(--color-mercury-grey)',
                                  fontWeight: '700',
                                  borderBottom: '2px solid var(--color-silver)',
                                }}
                              >
                                Adjusted Till Date
                              </th>
                              <th
                                className="px-4 py-3 text-right text-xs"
                                style={{
                                  color: 'var(--color-mercury-grey)',
                                  fontWeight: '700',
                                  borderBottom: '2px solid var(--color-silver)',
                                }}
                              >
                                Open Balance
                              </th>
                              <th
                                className="px-4 py-3 text-right text-xs"
                                style={{
                                  color: 'var(--color-mercury-grey)',
                                  fontWeight: '700',
                                  borderBottom: '2px solid var(--color-silver)',
                                  width: '150px',
                                }}
                              >
                                Adjustment Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorAdvances.map((advance, index) => {
                              const adjustmentAmount = advanceAdjustments[advance.id] || 0;
                              const isPOLinked = advance.type === 'PO-linked';

                              return (
                                <tr
                                  key={advance.id}
                                  style={{
                                    backgroundColor:
                                      index % 2 === 0 ? '#FFFFFF' : 'var(--color-cloud)',
                                  }}
                                >
                                  <td
                                    className="px-4 py-3"
                                    style={{ borderBottom: '1px solid var(--color-silver)' }}
                                  >
                                    <span
                                      className="px-2 py-1 rounded text-xs"
                                      style={{
                                        backgroundColor: isPOLinked
                                          ? 'var(--color-teal)10'
                                          : '#007D8710',
                                        color: isPOLinked ? 'var(--color-teal)' : '#007D87',
                                        fontWeight: '600',
                                      }}
                                    >
                                      {advance.type}
                                    </span>
                                  </td>
                                  <td
                                    className="px-4 py-3 text-sm"
                                    style={{
                                      color: 'var(--color-ink)',
                                      fontWeight: '600',
                                      borderBottom: '1px solid var(--color-silver)',
                                    }}
                                  >
                                    {advance.reference}
                                  </td>
                                  <td
                                    className="px-4 py-3 text-sm text-right"
                                    style={{
                                      color: 'var(--color-ink)',
                                      borderBottom: '1px solid var(--color-silver)',
                                    }}
                                  >
                                    ₹
                                    {advance.originalAmount.toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td
                                    className="px-4 py-3 text-sm text-right"
                                    style={{
                                      color: 'var(--color-mercury-grey)',
                                      borderBottom: '1px solid var(--color-silver)',
                                    }}
                                  >
                                    ₹
                                    {advance.adjustedAmount.toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td
                                    className="px-4 py-3 text-sm text-right"
                                    style={{
                                      color: 'var(--color-teal)',
                                      fontWeight: '600',
                                      borderBottom: '1px solid var(--color-silver)',
                                    }}
                                  >
                                    ₹
                                    {advance.openBalance.toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td
                                    className="px-4 py-3"
                                    style={{ borderBottom: '1px solid var(--color-silver)' }}
                                  >
                                    <input
                                      type="number"
                                      value={adjustmentAmount || ''}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        const maxAdjustment = Math.min(
                                          advance.openBalance,
                                          totals.grossAmount
                                        );
                                        setAdvanceAdjustments({
                                          ...advanceAdjustments,
                                          [advance.id]: Math.min(value, maxAdjustment),
                                        });
                                      }}
                                      placeholder="0.00"
                                      max={Math.min(advance.openBalance, totals.grossAmount)}
                                      className="w-full px-3 py-2 rounded-lg text-sm text-right"
                                      style={{
                                        border: '2px solid var(--color-silver)',
                                        color: 'var(--color-ink)',
                                      }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot style={{ backgroundColor: 'var(--color-cloud)' }}>
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-3 text-right"
                                style={{
                                  color: 'var(--color-ink)',
                                  fontWeight: '700',
                                  borderTop: '2px solid var(--color-silver)',
                                }}
                              >
                                Total Advance Adjustment:
                              </td>
                              <td
                                className="px-4 py-3 text-right"
                                style={{ borderTop: '2px solid var(--color-silver)' }}
                              >
                                <span
                                  className="text-sm"
                                  style={{ color: '#EF4444', fontWeight: '700' }}
                                >
                                  -₹
                                  {Object.values(advanceAdjustments)
                                    .reduce((sum, val) => sum + val, 0)
                                    .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: '#EFF6FF', border: '1px solid #3B82F6' }}
                      >
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: '#3B82F6' }} />
                          <div className="flex-1">
                            <p
                              className="text-sm mb-1"
                              style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                            >
                              Adjustment Rules
                            </p>
                            <ul
                              className="text-xs space-y-1"
                              style={{ color: 'var(--color-mercury-grey)' }}
                            >
                              <li>
                                • PO-linked advances are displayed first for easy identification
                              </li>
                              <li>
                                • Adjustment amount cannot exceed open balance or invoice gross
                                amount
                              </li>
                              <li>• Net payable updates in real-time as you adjust advances</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      className="p-6 rounded-lg text-center"
                      style={{ backgroundColor: 'var(--color-cloud)' }}
                    >
                      <Receipt
                        className="w-12 h-12 mx-auto mb-3"
                        style={{ color: 'var(--color-silver)' }}
                      />
                      <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                        No open advances found for this vendor
                      </p>
                    </div>
                  )
                ) : (
                  <div
                    className="p-6 rounded-lg text-center"
                    style={{ backgroundColor: 'var(--color-cloud)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      Select a vendor to view open advances
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* Final Summary */}
          {selectedPO && (selectedGRNs.length > 0 || availableGRNs.length === 0) && (
            <div
              className="bg-white rounded-xl p-6"
              style={{ border: '2px solid var(--color-teal)' }}
            >
              <h3 className="text-lg mb-4" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                Invoice Summary
              </h3>

              {/* Summary Grid */}
              <div className="space-y-3 mb-4">
                <div
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-cloud)' }}
                >
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Total Base Amount
                  </span>
                  <span
                    className="text-lg"
                    style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                  >
                    ₹{totals.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-cloud)' }}
                >
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Total GST
                  </span>
                  <span
                    className="text-lg"
                    style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                  >
                    +₹{totals.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-teal)10',
                    border: '2px solid var(--color-teal)',
                  }}
                >
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                  >
                    Gross Invoice Amount
                  </span>
                  <span
                    className="text-xl"
                    style={{ color: 'var(--color-teal)', fontWeight: '700' }}
                  >
                    ₹{totals.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {Object.values(retentionAmounts).reduce((sum, val) => sum + val, 0) > 0 && (
                  <div
                    className="flex items-center justify-between p-4 rounded-lg"
                    style={{ backgroundColor: '#FEF3C7' }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                    >
                      Retention Deducted
                    </span>
                    <span className="text-lg" style={{ color: '#92400E', fontWeight: '700' }}>
                      -₹
                      {Object.values(retentionAmounts)
                        .reduce((sum, val) => sum + val, 0)
                        .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {Object.values(advanceAdjustments).reduce((sum, val) => sum + val, 0) > 0 && (
                  <div
                    className="flex items-center justify-between p-4 rounded-lg"
                    style={{ backgroundColor: '#EFF6FF' }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                    >
                      Advance Adjusted
                    </span>
                    <span className="text-lg" style={{ color: '#3B82F6', fontWeight: '700' }}>
                      -₹
                      {Object.values(advanceAdjustments)
                        .reduce((sum, val) => sum + val, 0)
                        .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-error-light)' }}
                >
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    TDS Deducted
                  </span>
                  <span className="text-lg" style={{ color: '#EF4444', fontWeight: '700' }}>
                    -₹{totals.tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div
                  className="flex items-center justify-between p-5 rounded-lg"
                  style={{ backgroundColor: '#166534' }}
                >
                  <span style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '18px' }}>
                    Net Payable Amount
                  </span>
                  <span style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '24px' }}>
                    ₹
                    {(
                      totals.netPayable -
                      Object.values(advanceAdjustments).reduce((sum, val) => sum + val, 0)
                    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="mb-4 space-y-3">
                <label
                  className="flex items-center gap-2 text-sm"
                  style={{ color: 'var(--color-ink)' }}
                >
                  <input
                    type="checkbox"
                    checked={gstr2bMatched}
                    onChange={(e) => setGstr2bMatched(e.target.checked)}
                    style={{ accentColor: 'var(--color-teal)' }}
                  />
                  Vendor invoice appears in GSTR-2B
                </label>
                {!gstr2bMatched && (
                  <div
                    className="px-3 py-2 rounded-lg text-xs"
                    style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                  >
                    ITC claim at risk — vendor has not filed GSTR-1 for this period. ITC may be
                    reversed under Rule 37A.
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {requiredApprovers.map((approver) => (
                    <span
                      key={approver}
                      className="px-2 py-1 rounded-full text-xs"
                      style={{ backgroundColor: '#E0F2FE', color: '#075985' }}
                    >
                      Required approver: {approver}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className="flex gap-3 pt-4"
                style={{ borderTop: '2px solid var(--color-silver)' }}
              >
                <button
                  onClick={() => {
                    handleSaveDraft();
                    alert('Invoice saved as draft');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '2px solid var(--color-silver)',
                    color: 'var(--color-ink)',
                  }}
                >
                  <Save className="w-5 h-5" />
                  Save as Draft
                </button>

                <button
                  onClick={() => {
                    // Validate logic
                    const errors = [];
                    if (!selectedVendor) errors.push('Vendor not selected');
                    if (!selectedPO) errors.push('PO not selected');
                    if (!invoiceNumber) errors.push('Invoice number missing');
                    if (!invoiceDate) errors.push('Invoice date missing');
                    const tdsErrors = validateTDSRules(lineItems);
                    if (tdsErrors.length > 0) {
                      errors.push(...tdsErrors);
                    }

                    if (errors.length > 0) {
                      alert('Validation Errors:\n' + errors.join('\n'));
                    } else {
                      alert('✓ Invoice validated successfully!');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors"
                  style={{ backgroundColor: '#F59E0B', color: '#FFFFFF' }}
                >
                  <CheckCircle className="w-5 h-5" />
                  Validate Invoice
                </button>

                <button
                  onClick={async () => {
                    // Submit logic
                    const errors = [];
                    if (!selectedVendor) errors.push('Vendor not selected');
                    if (!selectedPO) errors.push('PO not selected');
                    if (!invoiceNumber) errors.push('Invoice number missing');
                    if (!invoiceDate) errors.push('Invoice date missing');
                    const tdsErrors = validateTDSRules(lineItems);
                    if (tdsErrors.length > 0) {
                      errors.push(...tdsErrors);
                    }

                    if (errors.length > 0) {
                      alert('Cannot Submit - Validation Errors:\n' + errors.join('\n'));
                    } else {
                      await handleSubmit();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--color-teal)', color: '#FFFFFF' }}
                >
                  <Send className="w-5 h-5" />
                  Submit for Approval
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Exception Request Modal */}
        {exceptionModalOpen && exceptionLineItem && exceptionLineItem.poRate !== undefined && (
          <POInvoiceExceptionModal
            isOpen={exceptionModalOpen}
            onClose={() => {
              setExceptionModalOpen(false);
              setExceptionLineItem(null);
            }}
            onSubmit={(data: ExceptionRequestData) => {
              console.log('Exception request submitted:', data);
              // In real implementation, this would trigger approval workflow
              alert(
                'Exception request submitted for CFO approval. Invoice will be held in Pending Exception Approval status.'
              );
              setExceptionModalOpen(false);
              setExceptionLineItem(null);
            }}
            lineItem={{
              itemName: exceptionLineItem.itemName,
              itemCode: exceptionLineItem.itemCode,
              poRate: exceptionLineItem.poRate,
              requestedRate: exceptionLineItem.unitPrice,
              quantity: exceptionLineItem.qty,
            }}
          />
        )}

        {/* AI Insights Panel */}
        <AIInsightsPanel
          insights={aiInsights}
          aiActions={aiActions}
          overallConfidence={overallConfidence}
          onActionClick={handleAIActionClick}
          onRunAIAction={handleRunAIAction}
          onIgnoreInsight={handleIgnoreInsight}
          onExplainInsight={handleExplainInsight}
          isExpanded={aiPanelExpanded}
          onToggleExpand={() => setAiPanelExpanded(!aiPanelExpanded)}
        />
      </div>
    </FormShell>
  );
}
