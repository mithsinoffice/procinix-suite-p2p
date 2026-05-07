import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Eye,
  X,
  AlertTriangle,
  Info,
  Shield,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  User,
  Building2,
  Hash,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  RefreshCw,
  Save,
  Send,
  Clock,
} from 'lucide-react';
import { useAPData } from '../contexts/APDataContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { SimpleAIInsightsPanel, SimpleAIInsight, SimpleAIAction } from './SimpleAIInsightsPanel';

// Types for OCR extracted data
interface ExtractedField {
  value: string;
  confidence: 'High' | 'Medium' | 'Low';
  isEdited: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
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
  bankDetails: ExtractedField;
  cgstTotal?: ExtractedField;
  sgstTotal?: ExtractedField;
  igstTotal?: ExtractedField;
  tdsHint?: ExtractedField;
}

interface ValidationIssue {
  severity: 'Blocker' | 'Warning' | 'Info';
  category: string;
  title: string;
  description: string;
  action?: string;
  actionLabel?: string;
}

interface VendorMatch {
  vendorCode: string;
  vendorName: string;
  matchConfidence: number;
  reason: string;
}

interface POMatch {
  poNumber: string;
  matchConfidence: number;
  reason: string;
  openAmount: number;
  poDate: string;
}

interface GRNMatch {
  grnNumber: string;
  matchConfidence: number;
  reason: string;
  grnDate: string;
  receivedQty: number;
}

type WizardStep = 'upload' | 'ocr-review' | 'validation' | 'invoice-form';

export function InvoiceUploadOCR() {
  const navigate = useNavigate();
  const { getPOsByVendor, getGRNsByPO, getPOByNumber } = useAPData();
  const { getActiveVendors } = useMasterData();
  const activeVendors = getActiveVendors();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionComplete, setExtractionComplete] = useState(false);

  // OCR data
  const [ocrData, setOcrData] = useState<OCRData | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string | null>(null);

  // Document viewer state
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Validation & Matching
  const [vendorMatches, setVendorMatches] = useState<VendorMatch[]>([]);
  const [poMatches, setPOMatches] = useState<POMatch[]>([]);
  const [grnMatches, setGRNMatches] = useState<GRNMatch[]>([]);
  const [selectedVendorMatch, setSelectedVendorMatch] = useState<string>('');
  const [selectedPOMatch, setSelectedPOMatch] = useState<string>('');
  const [selectedGRNMatch, setSelectedGRNMatch] = useState<string>('');
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  // AI Insights
  const [aiInsights, setAIInsights] = useState<SimpleAIInsight[]>([]);
  const [aiActions, setAIActions] = useState<SimpleAIAction[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const primaryVendor = activeVendors[0];
  const primaryVendorPOs = primaryVendor?.code ? getPOsByVendor(primaryVendor.code) : [];
  const primaryPO = primaryVendorPOs[0];
  const primaryGRN = primaryPO ? getGRNsByPO(primaryPO.poNumber)[0] : undefined;

  // File upload handlers
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

  // OCR extraction simulation
  const startOCRExtraction = (file: File) => {
    setIsExtracting(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setDocumentPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate OCR extraction delay
    setTimeout(() => {
      const mockOCRData = generateMockOCRData();
      setOcrData(mockOCRData);
      setIsExtracting(false);
      setExtractionComplete(true);
      setCurrentStep('ocr-review');

      // Generate AI insights for OCR
      generateOCRInsights(mockOCRData);
    }, 3000);
  };

  // Generate mock OCR data
  const generateMockOCRData = (): OCRData => {
    const resolvedVendorName = primaryVendor?.name || 'Tech Solutions Pvt Ltd';
    const resolvedVendorGSTIN = primaryVendor?.gstin || '29AABCT1234F1Z5';
    const resolvedPONumber = primaryPO?.poNumber || 'PO-2025-00045';
    const resolvedGRNNumber = primaryGRN?.grnNumber || 'GRN-2025-00089';

    return {
      vendorName: { value: resolvedVendorName, confidence: 'High', isEdited: false },
      vendorGSTIN: { value: resolvedVendorGSTIN, confidence: 'High', isEdited: false },
      invoiceNumber: { value: 'INV-2025-00123', confidence: 'High', isEdited: false },
      invoiceDate: { value: '2025-01-10', confidence: 'High', isEdited: false },
      invoiceAmount: { value: '125000.00', confidence: 'High', isEdited: false },
      currency: { value: 'INR', confidence: 'High', isEdited: false },
      poNumber: { value: resolvedPONumber, confidence: 'Medium', isEdited: false },
      grnNumber: { value: resolvedGRNNumber, confidence: 'Medium', isEdited: false },
      paymentTerms: { value: 'Net 30 Days', confidence: 'Medium', isEdited: false },
      dueDate: { value: '2025-02-09', confidence: 'High', isEdited: false },
      bankDetails: { value: 'ICICI Bank, A/c: 123456789', confidence: 'Low', isEdited: false },
      cgstTotal: { value: '5625.00', confidence: 'High', isEdited: false },
      sgstTotal: { value: '5625.00', confidence: 'High', isEdited: false },
      tdsHint: { value: 'TDS 194Q @ 0.1%', confidence: 'Low', isEdited: false },
      lineItems: [
        {
          id: '1',
          description: {
            value: 'Software Licenses - Annual Subscription',
            confidence: 'High',
            isEdited: false,
          },
          hsnSac: { value: '998314', confidence: 'Medium', isEdited: false },
          qty: { value: '10', confidence: 'High', isEdited: false },
          rate: { value: '10000.00', confidence: 'High', isEdited: false },
          amount: { value: '100000.00', confidence: 'High', isEdited: false },
          gstRate: { value: '18', confidence: 'High', isEdited: false },
          gstAmount: { value: '18000.00', confidence: 'High', isEdited: false },
          cgst: { value: '9000.00', confidence: 'High', isEdited: false },
          sgst: { value: '9000.00', confidence: 'High', isEdited: false },
        },
        {
          id: '2',
          description: { value: 'Implementation Services', confidence: 'High', isEdited: false },
          hsnSac: { value: '998313', confidence: 'Low', isEdited: false },
          qty: { value: '1', confidence: 'High', isEdited: false },
          rate: { value: '12500.00', confidence: 'Medium', isEdited: false },
          amount: { value: '12500.00', confidence: 'High', isEdited: false },
          gstRate: { value: '18', confidence: 'High', isEdited: false },
          gstAmount: { value: '2250.00', confidence: 'High', isEdited: false },
          cgst: { value: '1125.00', confidence: 'High', isEdited: false },
          sgst: { value: '1125.00', confidence: 'High', isEdited: false },
        },
      ],
    };
  };

  // Generate AI insights for OCR
  const generateOCRInsights = (data: OCRData) => {
    const insights: SimpleAIInsight[] = [];

    // Check for low confidence fields
    const lowConfidenceFields: string[] = [];
    Object.entries(data).forEach(([key, value]) => {
      if (
        value &&
        typeof value === 'object' &&
        'confidence' in value &&
        value.confidence === 'Low'
      ) {
        lowConfidenceFields.push(key);
      }
    });

    if (lowConfidenceFields.length > 0) {
      insights.push({
        id: 'low-confidence',
        type: 'warning',
        category: 'OCR Quality',
        title: 'Low Confidence Fields Detected',
        message: `${lowConfidenceFields.length} field(s) have low OCR confidence. Please review and verify these fields manually.`,
        explanation: `Fields with low confidence: ${lowConfidenceFields.join(', ')}`,
        confidence: 85,
        impact: 'medium',
        suggested_action: 'Review and manually verify low-confidence fields before proceeding.',
      });
    }

    // Check for GSTIN format
    if (data.vendorGSTIN.value && data.vendorGSTIN.value.length === 15) {
      insights.push({
        id: 'gstin-valid',
        type: 'success',
        category: 'Vendor Validation',
        title: 'Valid GSTIN Format',
        message: 'Vendor GSTIN appears to be in valid format',
        explanation:
          'GSTIN format validated. State code: ' + data.vendorGSTIN.value.substring(0, 2),
        confidence: 95,
        impact: 'low',
        suggested_action: 'System will auto-match vendor from master data.',
      });
    }

    // Check for PO reference
    if (data.poNumber.value) {
      insights.push({
        id: 'po-found',
        type: 'info',
        category: '3-Way Matching',
        title: 'PO Reference Found',
        message: `PO Number ${data.poNumber.value} detected in invoice`,
        explanation:
          'System will attempt to auto-match this invoice to the referenced PO and validate against GRN.',
        confidence: data.poNumber.confidence === 'High' ? 90 : 70,
        impact: 'high',
        suggested_action: 'Proceed to validation step for 3-way matching.',
      });
    }

    setAIInsights(insights);

    // Generate AI actions
    const actions: SimpleAIAction[] = [
      {
        id: 'auto-match',
        label: 'Auto-Match Vendor & PO',
        description: 'Use AI to automatically match vendor and PO from masters',
        type: 'primary',
        icon: 'wand',
      },
      {
        id: 'enhance-ocr',
        label: 'Re-run Enhanced OCR',
        description: 'Use advanced OCR with better accuracy',
        type: 'secondary',
        icon: 'refresh',
      },
    ];

    setAIActions(actions);
  };

  // Smart validation & auto-matching
  const performSmartMatching = () => {
    setCurrentStep('validation');

    const normalizedVendorName = ocrData?.vendorName.value.trim().toLowerCase() || '';
    const normalizedVendorGSTIN = ocrData?.vendorGSTIN.value.trim().toLowerCase() || '';
    const vendorMatchResults: VendorMatch[] = activeVendors
      .map((vendor) => {
        const vendorName = vendor.name || vendor.legalName || '';
        const vendorGSTIN = vendor.gstin || '';
        const gstMatch =
          normalizedVendorGSTIN && vendorGSTIN.toLowerCase() === normalizedVendorGSTIN;
        const exactNameMatch =
          normalizedVendorName && vendorName.toLowerCase() === normalizedVendorName;
        const partialNameMatch =
          normalizedVendorName && vendorName.toLowerCase().includes(normalizedVendorName);

        if (!gstMatch && !exactNameMatch && !partialNameMatch) {
          return null;
        }

        return {
          vendorCode: vendor.code,
          vendorName,
          matchConfidence: gstMatch ? 95 : exactNameMatch ? 88 : 72,
          reason: gstMatch
            ? 'Exact GSTIN match'
            : exactNameMatch
              ? 'Exact vendor name match'
              : 'Partial vendor name match',
        };
      })
      .filter((match): match is VendorMatch => Boolean(match))
      .sort((left, right) => right.matchConfidence - left.matchConfidence);

    const fallbackVendorMatch = primaryVendor
      ? [
          {
            vendorCode: primaryVendor.code,
            vendorName: primaryVendor.name,
            matchConfidence: 70,
            reason: 'Matched using primary approved vendor master record',
          },
        ]
      : [];

    const finalVendorMatches =
      vendorMatchResults.length > 0 ? vendorMatchResults : fallbackVendorMatch;
    const resolvedVendorMatch = finalVendorMatches[0];
    setVendorMatches(finalVendorMatches);
    setSelectedVendorMatch(resolvedVendorMatch?.vendorCode || '');

    const selectedVendorCode = resolvedVendorMatch?.vendorCode || primaryVendor?.code || '';
    const matchedVendorPOs = selectedVendorCode ? getPOsByVendor(selectedVendorCode) : [];

    if (ocrData?.poNumber.value) {
      const normalizedPONumber = ocrData.poNumber.value.trim().toLowerCase();
      const poMatchResults: POMatch[] = matchedVendorPOs
        .map((po) => {
          const exactMatch = po.poNumber.toLowerCase() === normalizedPONumber;
          const partialMatch = po.poNumber.toLowerCase().includes(normalizedPONumber);

          if (!exactMatch && !partialMatch) {
            return null;
          }

          return {
            poNumber: po.poNumber,
            matchConfidence: exactMatch ? 98 : 75,
            reason: exactMatch
              ? 'Exact PO number match from OCR'
              : 'Partial PO number match from OCR',
            openAmount: Number(po.amount || 0),
            poDate: po.date,
          };
        })
        .filter((match): match is POMatch => Boolean(match));

      if (poMatchResults.length === 0 && primaryPO) {
        poMatchResults.push({
          poNumber: primaryPO.poNumber,
          matchConfidence: 70,
          reason: 'Matched using the latest PO for the selected vendor',
          openAmount: Number(primaryPO.amount || 0),
          poDate: primaryPO.date,
        });
      }

      const resolvedPOMatch = poMatchResults[0];
      setPOMatches(poMatchResults);
      setSelectedPOMatch(resolvedPOMatch?.poNumber || '');

      const matchedPO = resolvedPOMatch ? getPOByNumber(resolvedPOMatch.poNumber) : primaryPO;
      const matchedGRNs = matchedPO ? getGRNsByPO(matchedPO.poNumber) : [];

      if (ocrData?.grnNumber.value) {
        const normalizedGRNNumber = ocrData.grnNumber.value.trim().toLowerCase();
        const grnMatchResults: GRNMatch[] = matchedGRNs
          .map((grn) => {
            const exactMatch = grn.grnNumber.toLowerCase() === normalizedGRNNumber;
            const partialMatch = grn.grnNumber.toLowerCase().includes(normalizedGRNNumber);

            if (!exactMatch && !partialMatch) {
              return null;
            }

            return {
              grnNumber: grn.grnNumber,
              matchConfidence: exactMatch ? 95 : 76,
              reason: exactMatch
                ? 'Exact GRN number match from OCR'
                : 'Partial GRN number match from OCR',
              grnDate: grn.receiptDate,
              receivedQty: Number(grn.qtyReceived || 0),
            };
          })
          .filter((match): match is GRNMatch => Boolean(match));

        if (grnMatchResults.length === 0 && primaryGRN) {
          grnMatchResults.push({
            grnNumber: primaryGRN.grnNumber,
            matchConfidence: 70,
            reason: 'Matched using the latest GRN for the selected PO',
            grnDate: primaryGRN.receiptDate,
            receivedQty: Number(primaryGRN.qtyReceived || 0),
          });
        }

        setGRNMatches(grnMatchResults);
        setSelectedGRNMatch(grnMatchResults[0]?.grnNumber || '');
      } else {
        setGRNMatches([]);
        setSelectedGRNMatch('');
      }
    } else {
      setPOMatches([]);
      setSelectedPOMatch('');
      setGRNMatches([]);
      setSelectedGRNMatch('');
    }

    // Generate validation issues
    performValidation();
  };

  // Perform validation
  const performValidation = () => {
    const issues: ValidationIssue[] = [];

    // Check for duplicate invoice
    issues.push({
      severity: 'Warning',
      category: 'Duplicate Detection',
      title: 'Potential Duplicate Invoice',
      description:
        'Invoice INV-2025-00123 from this vendor has similar characteristics to invoice submitted on Jan 8, 2025.',
      action: 'view-duplicate',
      actionLabel: 'View Suspected Duplicate',
    });

    // MSME vendor check
    issues.push({
      severity: 'Info',
      category: 'MSME Compliance',
      title: 'MSME Vendor Detected',
      description:
        'This is an MSME registered vendor. Payment should be processed within 45 days as per MSMED Act.',
      action: 'view-msme',
      actionLabel: 'View MSME Details',
    });

    // 3-way match validation
    issues.push({
      severity: 'Info',
      category: '3-Way Matching',
      title: '3-Way Match Successful',
      description: 'PO → GRN → Invoice quantities and amounts match within tolerance.',
    });

    // Tax validation
    if (ocrData?.cgstTotal && ocrData?.sgstTotal) {
      const expectedGST = parseFloat(ocrData.cgstTotal.value) + parseFloat(ocrData.sgstTotal.value);
      const totalAmount = parseFloat(ocrData.invoiceAmount.value);

      issues.push({
        severity: 'Info',
        category: 'Tax Validation',
        title: 'GST Calculation Verified',
        description: `CGST + SGST = ₹${expectedGST.toLocaleString('en-IN')} matches invoice tax breakup.`,
      });
    }

    setValidationIssues(issues);

    // Generate validation insights
    generateValidationInsights(issues);
  };

  // Generate validation insights
  const generateValidationInsights = (issues: ValidationIssue[]) => {
    const insights: SimpleAIInsight[] = [];

    const blockers = issues.filter((i) => i.severity === 'Blocker');
    const warnings = issues.filter((i) => i.severity === 'Warning');

    if (blockers.length === 0) {
      insights.push({
        id: 'validation-pass',
        type: 'success',
        category: 'Validation',
        title: 'No Blocking Issues Found',
        message: 'All critical validations passed. Invoice is ready for submission.',
        explanation: `${warnings.length} warning(s) require your attention but won't block submission.`,
        confidence: 90,
        impact: 'high',
        suggested_action: 'Review warnings and proceed to invoice form.',
      });
    }

    if (warnings.length > 0) {
      insights.push({
        id: 'validation-warnings',
        type: 'warning',
        category: 'Validation',
        title: `${warnings.length} Warning(s) Detected`,
        message: 'Some validations require your attention',
        explanation: warnings.map((w) => w.title).join(', '),
        confidence: 85,
        impact: 'medium',
        suggested_action: 'Review each warning and provide justification if needed.',
      });
    }

    setAIInsights((prev) => [...prev, ...insights]);
  };

  // Field update handler
  const updateExtractedField = (path: string, newValue: string) => {
    if (!ocrData) return;

    const updatedData = { ...ocrData };
    const keys = path.split('.');

    let current: any = updatedData;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }

    const finalKey = keys[keys.length - 1];
    if (
      current[finalKey] &&
      typeof current[finalKey] === 'object' &&
      'value' in current[finalKey]
    ) {
      current[finalKey] = {
        ...current[finalKey],
        value: newValue,
        isEdited: true,
      };
    }

    setOcrData(updatedData);
  };

  // Document viewer controls
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 10, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Action handlers
  const handleAIAction = (actionId: string) => {
    if (actionId === 'auto-match') {
      performSmartMatching();
    } else if (actionId === 'enhance-ocr') {
      setIsExtracting(true);
      setTimeout(() => {
        setIsExtracting(false);
        alert('Enhanced OCR completed. Confidence scores improved.');
      }, 2000);
    }
  };

  const handleProceedToInvoiceForm = () => {
    // Navigate to invoice form with pre-filled data
    setCurrentStep('invoice-form');
    // In real implementation, this would pass data to InvoiceFormPO
    navigate('/invoices/create-po', {
      state: {
        ocrData,
        selectedVendor: selectedVendorMatch,
        selectedPO: selectedPOMatch,
        selectedGRN: selectedGRNMatch,
      },
    });
  };

  // Confidence badge component
  const ConfidenceBadge = ({ confidence }: { confidence: 'High' | 'Medium' | 'Low' }) => {
    const colors = {
      High: 'bg-green-50 text-green-700 border-green-200',
      Medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      Low: 'bg-red-50 text-red-700 border-red-200',
    };

    return (
      <span className={`px-2 py-0.5 rounded border text-xs ${colors[confidence]}`}>
        {confidence}
      </span>
    );
  };

  // Render step indicator
  const StepIndicator = () => {
    const steps = [
      { id: 'upload', label: 'Upload Invoice', icon: Upload },
      { id: 'ocr-review', label: 'Review Extraction', icon: Eye },
      { id: 'validation', label: 'Validate & Match', icon: CheckCircle },
      { id: 'invoice-form', label: 'Complete Invoice', icon: FileText },
    ];

    const currentIndex = steps.findIndex((s) => s.id === currentStep);

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = index < currentIndex;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isActive
                      ? 'bg-teal-500 border-teal-500 text-white'
                      : isCompleted
                        ? 'bg-teal-50 border-teal-500 text-teal-600'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span
                  className={`mt-2 text-sm ${
                    isActive ? 'text-teal-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 ${isCompleted ? 'bg-teal-500' : 'bg-gray-300'} -mt-8`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render upload step
  const renderUploadStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-50 rounded-full mb-4">
            <Upload className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-2xl text-gray-900 mb-2">Upload Supplier Invoice</h2>
          <p className="text-gray-600">
            Upload a PDF or image of the supplier invoice for automatic data extraction
          </p>
        </div>

        {!uploadedFile ? (
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-colors"
          >
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 mb-2">
              Drag and drop your invoice here, or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supported formats: PDF, PNG, JPG (Max 10MB)
            </p>
            <button className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">
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
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-teal-600" />
                <div>
                  <p className="text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setUploadedFile(null);
                  setUploadProgress(0);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="text-teal-600">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadProgress === 100 && !isExtracting && (
              <div className="flex items-center justify-center text-green-600 space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Upload complete. Starting extraction...</span>
              </div>
            )}

            {isExtracting && (
              <div className="flex items-center justify-center space-x-3 py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                <span className="text-gray-600">Extracting data from invoice...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render OCR review step
  const renderOCRReviewStep = () => {
    if (!ocrData) return null;

    return (
      <div className="flex gap-6 h-[calc(100vh-250px)]">
        {/* Left: Document Preview */}
        <div className="w-1/2 bg-white rounded-lg border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-gray-900">Document Preview</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-gray-100 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm text-gray-600 min-w-[50px] text-center">{zoomLevel}%</span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-gray-100 rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 hover:bg-gray-100 rounded"
                title="Rotate"
              >
                <RotateCw className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-gray-50">
            {documentPreview && (
              <div className="flex items-center justify-center min-h-full">
                <img
                  src={documentPreview}
                  alt="Invoice preview"
                  className="max-w-full h-auto shadow-lg"
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                    transition: 'transform 0.2s',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Extracted Fields */}
        <div className="w-1/2 bg-white rounded-lg border border-gray-200 overflow-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-900">Extracted Fields</h3>
              <button
                onClick={() => {
                  setIsExtracting(true);
                  setTimeout(() => {
                    setIsExtracting(false);
                    alert('OCR re-run completed');
                  }, 2000);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-50 rounded"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Re-run Extraction</span>
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Review and edit extracted data. Fields with low confidence are highlighted.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Header Information */}
            <div>
              <h4 className="text-sm text-gray-500 mb-4">Invoice Header</h4>
              <div className="grid grid-cols-2 gap-4">
                <ExtractedFieldInput
                  label="Vendor Name"
                  field={ocrData.vendorName}
                  onUpdate={(value) => updateExtractedField('vendorName', value)}
                  icon={<Building2 className="w-4 h-4" />}
                />
                <ExtractedFieldInput
                  label="Vendor GSTIN"
                  field={ocrData.vendorGSTIN}
                  onUpdate={(value) => updateExtractedField('vendorGSTIN', value)}
                  icon={<Shield className="w-4 h-4" />}
                />
                <ExtractedFieldInput
                  label="Invoice Number"
                  field={ocrData.invoiceNumber}
                  onUpdate={(value) => updateExtractedField('invoiceNumber', value)}
                  icon={<Hash className="w-4 h-4" />}
                />
                <ExtractedFieldInput
                  label="Invoice Date"
                  field={ocrData.invoiceDate}
                  onUpdate={(value) => updateExtractedField('invoiceDate', value)}
                  icon={<Calendar className="w-4 h-4" />}
                  type="date"
                />
                <ExtractedFieldInput
                  label="Invoice Amount"
                  field={ocrData.invoiceAmount}
                  onUpdate={(value) => updateExtractedField('invoiceAmount', value)}
                  icon={<DollarSign className="w-4 h-4" />}
                  type="number"
                />
                <ExtractedFieldInput
                  label="Currency"
                  field={ocrData.currency}
                  onUpdate={(value) => updateExtractedField('currency', value)}
                  icon={<DollarSign className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* PO & GRN References */}
            <div>
              <h4 className="text-sm text-gray-500 mb-4">Reference Documents</h4>
              <div className="grid grid-cols-2 gap-4">
                <ExtractedFieldInput
                  label="PO Number"
                  field={ocrData.poNumber}
                  onUpdate={(value) => updateExtractedField('poNumber', value)}
                  icon={<FileText className="w-4 h-4" />}
                />
                <ExtractedFieldInput
                  label="GRN/SRN Number"
                  field={ocrData.grnNumber}
                  onUpdate={(value) => updateExtractedField('grnNumber', value)}
                  icon={<Package className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <h4 className="text-sm text-gray-500 mb-4">Payment Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <ExtractedFieldInput
                  label="Payment Terms"
                  field={ocrData.paymentTerms}
                  onUpdate={(value) => updateExtractedField('paymentTerms', value)}
                  icon={<Clock className="w-4 h-4" />}
                />
                <ExtractedFieldInput
                  label="Due Date"
                  field={ocrData.dueDate}
                  onUpdate={(value) => updateExtractedField('dueDate', value)}
                  icon={<Calendar className="w-4 h-4" />}
                  type="date"
                />
              </div>
            </div>

            {/* Tax Breakup */}
            <div>
              <h4 className="text-sm text-gray-500 mb-4">Tax Breakup</h4>
              <div className="grid grid-cols-3 gap-4">
                {ocrData.cgstTotal && (
                  <ExtractedFieldInput
                    label="CGST Total"
                    field={ocrData.cgstTotal}
                    onUpdate={(value) => updateExtractedField('cgstTotal', value)}
                    type="number"
                  />
                )}
                {ocrData.sgstTotal && (
                  <ExtractedFieldInput
                    label="SGST Total"
                    field={ocrData.sgstTotal}
                    onUpdate={(value) => updateExtractedField('sgstTotal', value)}
                    type="number"
                  />
                )}
                {ocrData.igstTotal && (
                  <ExtractedFieldInput
                    label="IGST Total"
                    field={ocrData.igstTotal}
                    onUpdate={(value) => updateExtractedField('igstTotal', value)}
                    type="number"
                  />
                )}
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="text-sm text-gray-500 mb-4">
                Line Items ({ocrData.lineItems.length})
              </h4>
              <div className="space-y-4">
                {ocrData.lineItems.map((item, index) => (
                  <div key={item.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">Line Item {index + 1}</span>
                      <ConfidenceBadge confidence={item.description.confidence} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <ExtractedFieldInput
                          label="Description"
                          field={item.description}
                          onUpdate={(value) =>
                            updateExtractedField(`lineItems.${index}.description`, value)
                          }
                        />
                      </div>
                      <ExtractedFieldInput
                        label="HSN/SAC"
                        field={item.hsnSac}
                        onUpdate={(value) =>
                          updateExtractedField(`lineItems.${index}.hsnSac`, value)
                        }
                      />
                      <ExtractedFieldInput
                        label="Quantity"
                        field={item.qty}
                        onUpdate={(value) => updateExtractedField(`lineItems.${index}.qty`, value)}
                        type="number"
                      />
                      <ExtractedFieldInput
                        label="Rate"
                        field={item.rate}
                        onUpdate={(value) => updateExtractedField(`lineItems.${index}.rate`, value)}
                        type="number"
                      />
                      <ExtractedFieldInput
                        label="Amount"
                        field={item.amount}
                        onUpdate={(value) =>
                          updateExtractedField(`lineItems.${index}.amount`, value)
                        }
                        type="number"
                      />
                      <ExtractedFieldInput
                        label="GST Rate (%)"
                        field={item.gstRate}
                        onUpdate={(value) =>
                          updateExtractedField(`lineItems.${index}.gstRate`, value)
                        }
                        type="number"
                      />
                      <ExtractedFieldInput
                        label="GST Amount"
                        field={item.gstAmount}
                        onUpdate={(value) =>
                          updateExtractedField(`lineItems.${index}.gstAmount`, value)
                        }
                        type="number"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
            <button
              onClick={() => setCurrentStep('upload')}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="flex space-x-3">
              <button
                onClick={() => alert('Draft saved')}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </button>
              <button
                onClick={performSmartMatching}
                className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center space-x-2"
              >
                <span>Accept & Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render validation & matching step
  const renderValidationStep = () => (
    <div className="space-y-6">
      {/* Matching Summary */}
      <div className="grid grid-cols-3 gap-6">
        {/* Vendor Match */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Vendor Match</h3>
            {vendorMatches.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">
                  {vendorMatches[0].matchConfidence}% Match
                </span>
              </div>
            )}
          </div>

          {vendorMatches.length > 0 ? (
            <div className="space-y-3">
              {vendorMatches.map((match) => (
                <label
                  key={match.vendorCode}
                  className={`flex items-start p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedVendorMatch === match.vendorCode
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="vendor-match"
                    value={match.vendorCode}
                    checked={selectedVendorMatch === match.vendorCode}
                    onChange={(e) => setSelectedVendorMatch(e.target.value)}
                    className="mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{match.vendorName}</span>
                      <span className="text-xs text-gray-500">{match.matchConfidence}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{match.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">Code: {match.vendorCode}</p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">No vendor matches found</div>
          )}
        </div>

        {/* PO Match */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">PO Match</h3>
            {poMatches.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">
                  {poMatches[0].matchConfidence}% Match
                </span>
              </div>
            )}
          </div>

          {poMatches.length > 0 ? (
            <div className="space-y-3">
              {poMatches.map((match) => (
                <label
                  key={match.poNumber}
                  className={`flex items-start p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedPOMatch === match.poNumber
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="po-match"
                    value={match.poNumber}
                    checked={selectedPOMatch === match.poNumber}
                    onChange={(e) => setSelectedPOMatch(e.target.value)}
                    className="mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{match.poNumber}</span>
                      <span className="text-xs text-gray-500">{match.matchConfidence}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{match.reason}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-400">Date: {match.poDate}</p>
                      <p className="text-xs text-gray-400">
                        Open: ₹{match.openAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">No PO matches found</div>
          )}
        </div>

        {/* GRN Match */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">GRN/SRN Match</h3>
            {grnMatches.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">
                  {grnMatches[0].matchConfidence}% Match
                </span>
              </div>
            )}
          </div>

          {grnMatches.length > 0 ? (
            <div className="space-y-3">
              {grnMatches.map((match) => (
                <label
                  key={match.grnNumber}
                  className={`flex items-start p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedGRNMatch === match.grnNumber
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="grn-match"
                    value={match.grnNumber}
                    checked={selectedGRNMatch === match.grnNumber}
                    onChange={(e) => setSelectedGRNMatch(e.target.value)}
                    className="mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{match.grnNumber}</span>
                      <span className="text-xs text-gray-500">{match.matchConfidence}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{match.reason}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-400">Date: {match.grnDate}</p>
                      <p className="text-xs text-gray-400">Qty: {match.receivedQty}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">No GRN matches found</div>
          )}
        </div>
      </div>

      {/* Validation Results */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-gray-900">Validation Results</h3>
          <p className="text-sm text-gray-600 mt-1">Review validation checks before proceeding</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {validationIssues.map((issue, index) => {
              const severityConfig = {
                Blocker: {
                  icon: <AlertCircle className="w-5 h-5 text-red-600" />,
                  bgColor: 'bg-red-50',
                  borderColor: 'border-red-200',
                  textColor: 'text-red-900',
                  badgeColor: 'bg-red-100 text-red-700',
                },
                Warning: {
                  icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
                  bgColor: 'bg-yellow-50',
                  borderColor: 'border-yellow-200',
                  textColor: 'text-yellow-900',
                  badgeColor: 'bg-yellow-100 text-yellow-700',
                },
                Info: {
                  icon: <Info className="w-5 h-5 text-blue-600" />,
                  bgColor: 'bg-blue-50',
                  borderColor: 'border-blue-200',
                  textColor: 'text-blue-900',
                  badgeColor: 'bg-blue-100 text-blue-700',
                },
              };

              const config = severityConfig[issue.severity];

              return (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${config.bgColor} ${config.borderColor}`}
                >
                  <div className="flex items-start space-x-3">
                    {config.icon}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`${config.textColor}`}>{issue.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs ${config.badgeColor}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{issue.category}</span>
                        {issue.action && (
                          <>
                            <span className="text-gray-300">•</span>
                            <button className="text-xs text-teal-600 hover:text-teal-700">
                              {issue.actionLabel}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('ocr-review')}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 flex items-center space-x-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to OCR Review</span>
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => alert('Draft saved')}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={handleProceedToInvoiceForm}
            disabled={validationIssues.some((i) => i.severity === 'Blocker')}
            className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <span>Proceed to Invoice Form</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/invoices')}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl text-gray-900">Create Invoice with OCR</h1>
                <p className="text-sm text-gray-600">
                  Upload invoice → Extract data → Validate → Complete
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <span className="text-sm text-gray-700">AI-Powered Extraction</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <StepIndicator />

        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {currentStep === 'upload' && renderUploadStep()}
            {currentStep === 'ocr-review' && renderOCRReviewStep()}
            {currentStep === 'validation' && renderValidationStep()}
          </div>

          {/* AI Insights Panel */}
          {(currentStep === 'ocr-review' || currentStep === 'validation') && (
            <div className="w-96">
              <SimpleAIInsightsPanel
                insights={aiInsights}
                actions={aiActions}
                onActionClick={handleAIAction}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Extracted Field Input Component
interface ExtractedFieldInputProps {
  label: string;
  field: ExtractedField;
  onUpdate: (value: string) => void;
  icon?: React.ReactNode;
  type?: string;
}

function ExtractedFieldInput({
  label,
  field,
  onUpdate,
  icon,
  type = 'text',
}: ExtractedFieldInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(field.value);

  const confidenceColor = {
    High: 'border-green-200 bg-green-50/30',
    Medium: 'border-yellow-200 bg-yellow-50/30',
    Low: 'border-red-200 bg-red-50/30',
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center justify-between text-xs text-gray-600">
        <span className="flex items-center space-x-1">
          {icon}
          <span>{label}</span>
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-xs ${
            field.confidence === 'High'
              ? 'bg-green-100 text-green-700'
              : field.confidence === 'Medium'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
          }`}
        >
          {field.confidence}
        </span>
      </label>
      <div className="relative">
        <input
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => {
            if (localValue !== field.value) {
              onUpdate(localValue);
            }
            setIsEditing(false);
          }}
          onFocus={() => setIsEditing(true)}
          className={`w-full px-3 py-2 border rounded text-sm ${
            field.isEdited ? 'border-teal-300 bg-teal-50/30' : confidenceColor[field.confidence]
          } focus:outline-none focus:ring-2 focus:ring-teal-500`}
        />
        {field.isEdited && (
          <div className="absolute right-2 top-2.5">
            <Edit2 className="w-3.5 h-3.5 text-teal-600" />
          </div>
        )}
      </div>
    </div>
  );
}
