import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Save,
  Send,
  Eye,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Target,
  BookOpen,
  Receipt,
  Info,
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
import { useAuth } from '../contexts/AuthContext';
import { isMsmeVendor, maxMsmeDueDate, msmeDueDateWarning } from '../lib/msmeDueDate';
import {
  buildMysqlApiHeaders,
  mysqlApiBaseUrl,
  isMysqlApiEnabled,
  mysqlApiRequest,
} from '../lib/mysql/client';
import { ensureRelationalMasterRecords } from '../lib/mysql/masterTables';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { JournalEntryPreview, LineItemRow, NarrationField, TDSThresholdTracker } from './invoice';

// India's 36 GST place-of-supply codes (compliance-defined enum). Codes are
// the GST state codes — first 2 digits of any GSTIN must match this list.
const INDIA_GST_STATES: ReadonlyArray<{ code: string; name: string }> = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman & Diu' },
  { code: '26', name: 'Dadra & Nagar Haveli' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' },
];

const FALLBACK_PAYMENT_TERMS: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'Net 30 Days', name: 'Net 30 Days' },
  { code: 'Net 45 Days', name: 'Net 45 Days' },
  { code: 'Net 60 Days', name: 'Net 60 Days' },
  { code: 'Immediate', name: 'Immediate' },
];

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

interface OCRFieldData {
  value: string;
  confidence: number;
  suggestions: Array<{ value: string; confidence: number }>;
}

/**
 * GSTIN state code (first 2 digits) → 2-letter abbreviation used by the
 * place-of-supply dropdown. Same convention as InvoiceFormPO.extractStateFromGSTIN
 * but returning the abbreviation we compare against.
 */
const GSTIN_STATE_CODE_TO_ABBREV: Record<string, string> = {
  '01': 'JK',
  '02': 'HP',
  '03': 'PB',
  '04': 'CH',
  '05': 'UK',
  '06': 'HR',
  '07': 'DL',
  '08': 'RJ',
  '09': 'UP',
  '10': 'BR',
  '11': 'SK',
  '12': 'AR',
  '13': 'NL',
  '14': 'MN',
  '15': 'MZ',
  '16': 'TR',
  '17': 'ML',
  '18': 'AS',
  '19': 'WB',
  '20': 'JH',
  '21': 'OR',
  '22': 'CT',
  '23': 'MP',
  '24': 'GJ',
  '26': 'DN',
  '27': 'MH',
  '28': 'AP',
  '29': 'KA',
  '30': 'GA',
  '31': 'LD',
  '32': 'KL',
  '33': 'TN',
  '34': 'PY',
  '35': 'AN',
  '36': 'TG',
  '37': 'AD',
  '38': 'LA',
};

function extractEntityStateAbbrev(gstin?: string | null): string | null {
  if (!gstin || gstin.length < 2) return null;
  return GSTIN_STATE_CODE_TO_ABBREV[gstin.substring(0, 2)] || null;
}

export function NonPOInvoiceForm() {
  const navigate = useNavigate();
  const { id: editingId } = useParams<{ id?: string }>();
  const isEditMode = Boolean(editingId);
  const {
    vendors,
    getVendorById,
    getItemById,
    getCostCentreById,
    getTaxCodeById,
    getActiveTDSSections,
    getTDSSectionByCode,
    currentCompany,
    entities,
    expenseCategories: expenseCategoryRecords,
  } = useMasterData();
  const expenseCategoryOptions =
    expenseCategoryRecords && expenseCategoryRecords.length > 0
      ? expenseCategoryRecords.map((r) =>
          String(r.recordName ?? r.name ?? r.recordCode ?? r.code ?? '')
        )
      : ['Professional Services', 'Consulting', 'Marketing', 'Travel', 'Maintenance', 'Utilities'];
  const { user } = useAuth();

  // Resolve the user's current entity → state abbreviation (e.g., "MH" for Maharashtra).
  // Used to determine intra-state vs inter-state GST split. Falls back to 'MH'.
  const currentEntity =
    entities.find(
      (e) =>
        (user?.currentPlatformEntityId && e.id === user.currentPlatformEntityId) ||
        (user?.currentEntity && e.name === user.currentEntity.name)
    ) || null;
  const entityStateAbbrev = extractEntityStateAbbrev(currentEntity?.gstin) || 'MH';
  const activeTdsSections = getActiveTDSSections();
  const defaultTdsSection = activeTdsSections[0];

  // Upload & OCR State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [ocrData, setOcrData] = useState<OCRData | null>(null);
  const [showOCRReview, setShowOCRReview] = useState(false);
  const [ocrFields, setOcrFields] = useState<Record<string, OCRFieldData>>({});
  const [paymentTermsOptions, setPaymentTermsOptions] =
    useState<ReadonlyArray<{ code: string; name: string }>>(FALLBACK_PAYMENT_TERMS);

  // Hydrate Payment Terms from vendor_payment_terms_master; fall back to the
  // hardcoded 4-option list if the master returns empty / errors.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const records = await ensureRelationalMasterRecords<{
          recordCode?: string;
          code?: string;
          recordName?: string;
          name?: string;
        }>('vendor_payment_terms_master', []);
        if (cancelled) return;
        const mapped = records
          .map((r) => ({
            code: String(r.recordCode ?? r.code ?? r.recordName ?? r.name ?? '').trim(),
            name: String(r.recordName ?? r.name ?? r.recordCode ?? r.code ?? '').trim(),
          }))
          .filter((r) => r.code && r.name);
        setPaymentTermsOptions(mapped.length > 0 ? mapped : FALLBACK_PAYMENT_TERMS);
      } catch {
        if (!cancelled) setPaymentTermsOptions(FALLBACK_PAYMENT_TERMS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Invoice Header
  const [vendorId, setVendorId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueDateManuallySet, setDueDateManuallySet] = useState(false);
  const [entityId, setEntityId] = useState(
    currentCompany?.id || user?.currentPlatformEntityId || ''
  );
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

  // ── Edit-mode prefill ─────────────────────────────────────────────────────
  // When mounted at /invoices/edit/:id (via InvoiceEditLoader), GET the
  // existing invoice and map every editable field into form state.
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
        setDueDate(inv.due_date ? String(inv.due_date).split('T')[0] : '');
        setDueDateManuallySet(Boolean(inv.due_date));
        setCurrency(inv.currency || 'INR');
        if (inv.entity_id) setEntityId(inv.entity_id);
        if (inv.payment_terms) setPaymentTerms(inv.payment_terms);
        if (inv.notes) setNarration(inv.notes);

        // Resolve vendor by UUID first (server stores vendor_id), then by name.
        if (inv.vendor_id) {
          const byId = vendors.find((v) => v.id === inv.vendor_id);
          if (byId) setVendorId(byId.id);
        }
        if (!vendorId && inv.vendor_name) {
          const byName = vendors.find(
            (v) =>
              v.name.toLowerCase() === String(inv.vendor_name).toLowerCase() ||
              v.name.toLowerCase().includes(String(inv.vendor_name).toLowerCase())
          );
          if (byName) setVendorId(byName.id);
        }

        if (Array.isArray(inv.line_items) && inv.line_items.length > 0) {
          setLineItems(
            inv.line_items.map((li: any, i: number) => {
              const baseAmount = Number(li.amount) || 0;
              const gstRatePct =
                li.gst_rate != null
                  ? Number(li.gst_rate) > 1
                    ? Number(li.gst_rate)
                    : Number(li.gst_rate) * 100
                  : 18;
              const gstAmount = +(baseAmount * gstRatePct) / 100;
              return {
                id: String(li.id ?? i + 1),
                itemId: '',
                itemCode: '',
                description: li.description || '',
                quantity: Number(li.quantity) || 1,
                unitRate: Number(li.unit_price) || 0,
                baseAmount,
                gstRate: gstRatePct,
                gstAmount,
                cgst: 0,
                sgst: 0,
                igst: gstAmount,
                grossAmount: baseAmount + gstAmount,
                tdsSection: '',
                tdsRate: 0,
                tdsAmount: 0,
                netPayable: baseAmount + gstAmount,
                costCentreId: '',
              };
            })
          );
        }
      } catch (err) {
        console.error('[NonPOInvoiceForm] Edit-mode prefill failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once on mount with whatever masters are hydrated at that point.
  }, [isEditMode, editingId]);

  // MSME 45-day rule: auto-suggest due date for MSME vendors when user hasn't set one
  const vendorIsMsme = isMsmeVendor(selectedVendor as any);
  useEffect(() => {
    if (!invoiceDate || dueDateManuallySet) return;
    if (!vendorIsMsme) return;
    const suggested = maxMsmeDueDate(invoiceDate);
    if (suggested) setDueDate(suggested);
  }, [invoiceDate, vendorIsMsme, dueDateManuallySet]);

  const msmeWarning = msmeDueDateWarning({
    invoiceDate,
    dueDate,
    msmeRegistered: vendorIsMsme,
  });

  // Blob URL for in-form PDF/image preview — revoked whenever uploadedFile changes or on unmount
  useEffect(() => {
    if (!uploadedFile) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(uploadedFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadedFile]);

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
      if (
        !section ||
        section.status !== 'Active' ||
        (section.approvalStatus ?? 'Approved') !== 'Approved'
      ) {
        tdsErrors.push(
          `Line ${index + 1}: TDS section ${item.tdsSection} is inactive or not approved.`
        );
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
    if (
      !section ||
      section.status !== 'Active' ||
      (section.approvalStatus ?? 'Approved') !== 'Approved'
    ) {
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
    } else if (user?.currentPlatformEntityId) {
      setEntityId(user.currentPlatformEntityId);
    }
  }, [currentCompany?.id, user?.currentPlatformEntityId]);

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

  // File upload handler — calls real OCR endpoint when MySQL API is enabled
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setOcrStatus('processing');

    if (!isMysqlApiEnabled()) {
      // Offline / demo mode: surface empty OCR so user can fill manually
      setOcrData({
        vendorName: '',
        vendorGSTIN: '',
        invoiceNumber: '',
        invoiceDate: '',
        invoiceAmount: 0,
        currency: 'INR',
        lineItems: [],
        confidence: { vendorName: 0, invoiceNumber: 0, invoiceDate: 0, invoiceAmount: 0 },
      });
      setOcrStatus('complete');
      setShowOCRReview(true);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Omit Content-Type so the browser sets the correct multipart boundary
      const { 'Content-Type': _ct, ...authHeaders } = buildMysqlApiHeaders();
      const res = await fetch(`${mysqlApiBaseUrl}/invoice-ingestion/manual-upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = (await res.json()) as {
        success: boolean;
        extracted?: {
          invoice_number: string | null;
          vendor_name: string | null;
          vendor_gstin: string | null;
          invoice_date: string | null;
          total_amount: number;
          tax_amount: number;
          currency: string;
          line_items: Array<{
            description: string | null;
            quantity: number;
            unit_price: number;
            amount: number;
            gst_rate: number | null;
          }>;
          _raw?: Record<string, any>;
        };
      };

      const ext = json.extracted;
      if (!ext) throw new Error('Server returned no extracted data');
      setOcrData({
        vendorName: ext.vendor_name ?? '',
        vendorGSTIN: ext.vendor_gstin ?? '',
        invoiceNumber: ext.invoice_number ?? '',
        invoiceDate: ext.invoice_date ?? '',
        invoiceAmount: ext.total_amount ?? 0,
        currency: ext.currency ?? 'INR',
        lineItems: (ext.line_items ?? []).map((li) => ({
          description: li.description ?? '',
          quantity: li.quantity ?? 1,
          rate: li.unit_price ?? (li.quantity ? li.amount / li.quantity : li.amount),
          tax: li.gst_rate ?? 0,
          confidence: 0.85,
        })),
        confidence: {
          vendorName: 0.85,
          invoiceNumber: 0.85,
          invoiceDate: 0.85,
          invoiceAmount: 0.85,
        },
      });
      // Build per-field OCR confidence map from N8N raw payload (_raw carries
      // { value, confidence, suggestions } per field; fall back to synthetic data
      // for Anthropic-extracted fields which have no per-field scores).
      const raw: Record<string, any> = ext._raw ?? {};
      const newOcrFields: Record<string, OCRFieldData> = {};
      const tryAddField = (
        ocrKey: string,
        rawKey: string,
        extractedVal: string | number | null | undefined
      ) => {
        const r = raw[rawKey];
        if (
          r &&
          typeof r === 'object' &&
          !Array.isArray(r) &&
          typeof r.confidence === 'number' &&
          r.confidence > 0 &&
          r.value != null &&
          r.value !== ''
        ) {
          newOcrFields[ocrKey] = {
            value: String(r.value),
            confidence: r.confidence,
            suggestions: Array.isArray(r.suggestions) ? r.suggestions : [],
          };
        } else if (extractedVal != null && extractedVal !== '' && extractedVal !== 0) {
          const cleaned = String(extractedVal).trim();
          const titleCased = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
          newOcrFields[ocrKey] = {
            value: cleaned,
            confidence: 0.88,
            suggestions: [
              { value: cleaned, confidence: 0.88 },
              ...(titleCased !== cleaned ? [{ value: titleCased, confidence: 0.82 }] : []),
            ],
          };
        }
      };
      tryAddField('vendor', 'vendorName', ext.vendor_name);
      tryAddField('vendorGstin', 'vendorGstin', ext.vendor_gstin);
      tryAddField('invoiceNumber', 'invoiceNumber', ext.invoice_number);
      tryAddField('invoiceDate', 'invoiceDate', ext.invoice_date);
      tryAddField('totalAmount', 'grossAmount', ext.total_amount);
      tryAddField('taxAmount', 'taxAmount', ext.tax_amount);
      setOcrFields(newOcrFields);

      setOcrStatus('complete');
      setShowOCRReview(true);
    } catch (err) {
      console.error('[NonPOInvoiceForm] OCR upload failed:', err);
      setOcrStatus('error');
    }
  };

  // Apply OCR data to form
  const applyOCRData = () => {
    if (!ocrData) return;

    if (ocrData.invoiceNumber) setInvoiceNumber(ocrData.invoiceNumber);
    if (ocrData.invoiceDate) setInvoiceDate(ocrData.invoiceDate);
    if (ocrData.currency) setCurrency(ocrData.currency);

    // Match vendor by GSTIN first, then by name (case-insensitive)
    if (ocrData.vendorGSTIN || ocrData.vendorName) {
      const gstin = ocrData.vendorGSTIN?.trim().toUpperCase();
      const name = ocrData.vendorName?.trim().toLowerCase();
      const matched = vendors.find(
        (v) =>
          (gstin && v.gstin?.trim().toUpperCase() === gstin) ||
          (name && v.name.trim().toLowerCase() === name)
      );
      if (matched) setVendorId(matched.id);
    }

    // Map all extracted line items into form line items
    if (ocrData.lineItems.length > 0) {
      const baseRate = defaultTdsSection
        ? (defaultTdsSection.rateCompany ?? defaultTdsSection.rateIndividual ?? 0)
        : 0;
      const isIntraState = placeOfSupply === entityStateAbbrev;
      const newItems: LineItem[] = ocrData.lineItems.map((ocrLine, i) => {
        const qty = ocrLine.quantity || 1;
        const rate = ocrLine.rate || 0;
        const baseAmount = qty * rate;
        const gstRate = ocrLine.tax || 0;
        const gstAmount = (baseAmount * gstRate) / 100;
        const cgst = isIntraState ? gstAmount / 2 : 0;
        const sgst = isIntraState ? gstAmount / 2 : 0;
        const igst = isIntraState ? 0 : gstAmount;
        const tdsAmount = (baseAmount * baseRate) / 100;
        return {
          id: `ocr-${Date.now()}-${i}`,
          itemId: '',
          itemCode: '',
          description: ocrLine.description,
          quantity: qty,
          unitRate: rate,
          baseAmount,
          gstRate,
          gstAmount,
          cgst,
          sgst,
          igst,
          grossAmount: baseAmount + gstAmount,
          tdsSection: defaultTdsSection?.sectionCode || '',
          tdsRate: baseRate,
          tdsAmount,
          netPayable: baseAmount + gstAmount - tdsAmount,
          costCentreId,
          profitCentreId,
          projectId,
        };
      });
      setLineItems(newItems);
    }

    setShowOCRReview(false);
  };

  // Calculate line item totals
  const calculateLineItem = (index: number, items: LineItem[] = lineItems) => {
    const item = items[index];
    const baseAmount = item.quantity * item.unitRate;

    // Determine GST split based on place of supply
    const isIntraState = placeOfSupply === entityStateAbbrev;
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
      netPayable,
    };

    setLineItems(updatedItems);
  };

  // Add new line item
  const addLineItem = () => {
    const baseRate = defaultTdsSection
      ? defaultTdsSection.rateCompany || defaultTdsSection.rateIndividual || 0
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
      projectId: projectId,
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
      gstAmount:
        Number(updatedLine.igst || 0) +
        Number(updatedLine.cgst || 0) +
        Number(updatedLine.sgst || 0),
      igst: Number(updatedLine.igst || 0),
      cgst: Number(updatedLine.cgst || 0),
      sgst: Number(updatedLine.sgst || 0),
      grossAmount:
        Number(updatedLine.taxableAmount || 0) +
        Number(updatedLine.igst || 0) +
        Number(updatedLine.cgst || 0) +
        Number(updatedLine.sgst || 0),
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
  const totals = lineItems.reduce(
    (acc, item) => ({
      baseAmount: acc.baseAmount + item.baseAmount,
      gstAmount: acc.gstAmount + item.gstAmount,
      grossAmount: acc.grossAmount + item.grossAmount,
      tdsAmount: acc.tdsAmount + item.tdsAmount,
      netPayable: acc.netPayable + item.netPayable,
    }),
    { baseAmount: 0, gstAmount: 0, grossAmount: 0, tdsAmount: 0, netPayable: 0 }
  );

  const finalNetPayable = totals.netPayable - advanceAdjustment - gstRetentionAmount;

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!vendorId) newErrors.vendor = 'Vendor is required';
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

  /**
   * Build the flat payload shared by POST (create) and PUT (edit).
   * POST stores `total_amount = finalNetPayable` (status-quo). PUT stores
   * `total_amount = totals.grossAmount` because the server's PUT reconciler
   * enforces lineTaxable + lineGST ≈ total_amount.
   */
  const buildPayload = (status: 'Draft' | 'Pending Approval', mode: 'create' | 'edit') => {
    const vendor = vendorId ? getVendorById(vendorId) : undefined;
    if (!vendor || !invoiceDate) return null;
    const lifecycleState = status === 'Draft' ? 'Ingested' : 'Under Verification';
    const flat: Record<string, unknown> = {
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      vendor_code: vendor.code,
      invoice_type: 'non_po',
      subtotal: totals.baseAmount,
      tax_amount: totals.gstAmount,
      total_amount: mode === 'edit' ? totals.grossAmount : finalNetPayable,
      currency,
      entity_id: entityId || currentCompany?.id || '',
      status: status === 'Draft' ? 'draft' : 'pending_approval',
      lifecycle_state: lifecycleState,
      payment_terms: paymentTerms || null,
      notes: narration || null,
    };
    if (mode === 'edit') {
      flat.invoice_number = invoiceNumber || null;
    }
    return { vendor, flat };
  };

  const buildLineItemsForPut = () =>
    lineItems.map((li) => ({
      id: li.id,
      description: li.description || '',
      quantity: li.quantity,
      unit_price: li.unitRate,
      amount: li.baseAmount,
      hsn_sac: null,
      gst_rate: li.gstRate != null ? Number(li.gstRate) / 100 : null,
      // Server-side reconciliation reads these but does not persist them.
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

  const successNavigateTo = isEditMode && editingId ? `/invoices/${editingId}` : '/ap/my-invoices';

  // Save draft
  const handleSaveDraft = async () => {
    if (await persistInvoice('Draft')) {
      navigate(successNavigateTo);
    }
  };

  // Submit for approval
  const handleSubmit = async () => {
    setShowValidation(true);
    if (validateForm()) {
      const tdsErrors = validateTDSRules(lineItems);
      if (tdsErrors.length > 0) {
        alert(`TDS threshold validation failed:\n${tdsErrors.join('\n')}`);
        return;
      }
      if (await persistInvoice('Pending Approval')) {
        navigate(successNavigateTo);
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
    const fields = [
      vendorId,
      invoiceNumber,
      invoiceDate,
      costCentreId,
      accountCodeId,
      expenseCategory,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [vendorId, invoiceNumber, invoiceDate, costCentreId, accountCodeId, expenseCategory]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const handleKeyboardSave = useCallback(() => handleSaveDraft(), []);
  useFormKeyboardSave(handleKeyboardSave);

  const ocrSummary = useMemo(() => {
    const fields = Object.values(ocrFields);
    if (!fields.length) return null;
    const avgConf = fields.reduce((s, f) => s + f.confidence, 0) / fields.length;
    const needsReview = fields.filter((f) => f.confidence < 0.9).length;
    return { avgConf, needsReview };
  }, [ocrFields]);

  const getConfidencePill = (fieldKey: string) => {
    const f = ocrFields[fieldKey];
    if (!f)
      return (
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontWeight: 600,
            backgroundColor: '#F1F5F9',
            color: '#64748B',
          }}
        >
          Auto
        </span>
      );
    const pct = Math.round(f.confidence * 100);
    if (f.confidence >= 0.9)
      return (
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontWeight: 600,
            backgroundColor: '#DCFCE7',
            color: '#15803D',
          }}
        >
          ✓ {pct}%
        </span>
      );
    if (f.confidence >= 0.7)
      return (
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontWeight: 600,
            backgroundColor: '#FEF3C7',
            color: '#B45309',
          }}
        >
          ~ {pct}%
        </span>
      );
    return (
      <span
        style={{
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontWeight: 600,
          backgroundColor: '#FEE2E2',
          color: '#B91C1C',
        }}
      >
        ! {pct}%
      </span>
    );
  };

  const getSuggestionChips = (fieldKey: string, onSelect: (v: string) => void) => {
    const f = ocrFields[fieldKey];
    if (!showSuggestions || !f || f.confidence >= 0.95 || !f.suggestions.length) return null;
    return (
      <div
        style={{
          marginTop: '5px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          flexWrap: 'wrap',
          animation: 'ocr-fadein 0.15s ease',
        }}
      >
        <span style={{ fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
          Nearest matches:
        </span>
        {f.suggestions.slice(0, 2).map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(s.value)}
            className="transition-colors hover:bg-teal-50"
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '9999px',
              border: '1px solid var(--color-teal)',
              color: 'var(--color-teal)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {s.value} · {Math.round(s.confidence * 100)}%
          </button>
        ))}
      </div>
    );
  };

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
      <div
        className="bg-white rounded-xl border-2 p-6 mb-6"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Upload className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
          <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
            Step 1: Upload Invoice Document
          </h2>
        </div>

        {!uploadedFile ? (
          <div
            className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--color-silver)' }}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <Upload
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: 'var(--color-mercury-grey)' }}
            />
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
            <div
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-cloud)' }}
            >
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
                  <span className="text-sm" style={{ color: '#D97706' }}>
                    Processing OCR...
                  </span>
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

            {filePreviewUrl && (
              <div
                className="rounded-lg overflow-hidden"
                style={{ height: '420px', border: '1px solid var(--color-silver)' }}
              >
                {uploadedFile?.type === 'application/pdf' ? (
                  <object
                    data={filePreviewUrl}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                    style={{ border: 'none', display: 'block' }}
                  >
                    <div
                      className="flex flex-col items-center justify-center h-full gap-2"
                      style={{
                        backgroundColor: 'var(--color-cloud)',
                        color: 'var(--color-mercury-grey)',
                      }}
                    >
                      <FileText className="w-10 h-10" />
                      <p className="text-sm">PDF preview unavailable in this browser.</p>
                      <a
                        href={filePreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm"
                        style={{ color: 'var(--color-teal)' }}
                      >
                        Open in new tab
                      </a>
                    </div>
                  </object>
                ) : (
                  <img
                    src={filePreviewUrl}
                    alt="Invoice preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      backgroundColor: 'var(--color-cloud)',
                    }}
                  />
                )}
              </div>
            )}

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
          lineItems={lineItems.map(
            (item) =>
              ({
                id: item.id,
                qty: item.quantity,
                rate: item.unitRate,
                taxableAmount: item.baseAmount,
                tdsSection: item.tdsSection || 'None',
                tdsRate: item.tdsRate,
                tdsAmount: item.tdsAmount,
                netPayable: item.netPayable,
                description: item.description,
              }) as any
          )}
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
            <div
              className="sticky top-0 bg-white border-b-2 p-6"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <h2 className="text-2xl" style={{ color: 'var(--color-ink)' }}>
                OCR Extracted Data
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Review confidence scores and edit fields before applying
              </p>
            </div>

            {/* OCR Summary Bar */}
            {ocrSummary && (
              <div
                className="mx-6 mt-5 px-4 py-3 rounded-lg flex items-center gap-3"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                      OCR Confidence: {Math.round(ocrSummary.avgConf * 100)}%
                    </span>
                    {ocrSummary.needsReview > 0 && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '1px 7px',
                          borderRadius: '9999px',
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                          fontWeight: 600,
                        }}
                      >
                        {ocrSummary.needsReview} field{ocrSummary.needsReview > 1 ? 's' : ''} need
                        review
                      </span>
                    )}
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#E2E8F0' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(ocrSummary.avgConf * 100)}%`,
                        backgroundColor:
                          ocrSummary.avgConf >= 0.9
                            ? '#16A34A'
                            : ocrSummary.avgConf >= 0.7
                              ? '#D97706'
                              : '#DC2626',
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSuggestions((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white"
                  style={{
                    color: 'var(--color-mercury-grey)',
                    border: '1px solid var(--color-silver)',
                  }}
                  title={showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showSuggestions ? 'Hide' : 'Show'} suggestions
                </button>
              </div>
            )}

            <div className="p-6 space-y-5">
              {/* Vendor Name */}
              <div>
                <label
                  className="text-sm mb-1.5 flex items-center gap-2"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Vendor Name
                  {getConfidencePill('vendor')}
                </label>
                <input
                  type="text"
                  value={ocrData.vendorName}
                  onChange={(e) => setOcrData({ ...ocrData, vendorName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                />
                {getSuggestionChips('vendor', (v) =>
                  setOcrData((prev) => prev && { ...prev, vendorName: v })
                )}
              </div>

              {/* Vendor GSTIN */}
              <div>
                <label
                  className="text-sm mb-1.5 flex items-center gap-2"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Vendor GSTIN
                  {getConfidencePill('vendorGstin')}
                </label>
                <input
                  type="text"
                  value={ocrData.vendorGSTIN}
                  onChange={(e) => setOcrData({ ...ocrData, vendorGSTIN: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                />
                {getSuggestionChips('vendorGstin', (v) =>
                  setOcrData((prev) => prev && { ...prev, vendorGSTIN: v })
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Invoice Number */}
                <div>
                  <label
                    className="text-sm mb-1.5 flex items-center gap-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Invoice Number
                    {getConfidencePill('invoiceNumber')}
                  </label>
                  <input
                    type="text"
                    value={ocrData.invoiceNumber}
                    onChange={(e) => setOcrData({ ...ocrData, invoiceNumber: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2"
                    style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                  />
                  {getSuggestionChips('invoiceNumber', (v) =>
                    setOcrData((prev) => prev && { ...prev, invoiceNumber: v })
                  )}
                </div>

                {/* Invoice Date */}
                <div>
                  <label
                    className="text-sm mb-1.5 flex items-center gap-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Invoice Date
                    {getConfidencePill('invoiceDate')}
                  </label>
                  <input
                    type="text"
                    value={ocrData.invoiceDate}
                    onChange={(e) => setOcrData({ ...ocrData, invoiceDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2"
                    style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                    placeholder="e.g. 31 Jan 2026 or 2026-01-31"
                  />
                  {getSuggestionChips('invoiceDate', (v) =>
                    setOcrData((prev) => prev && { ...prev, invoiceDate: v })
                  )}
                </div>
              </div>

              {/* Invoice Amount */}
              <div>
                <label
                  className="text-sm mb-1.5 flex items-center gap-2"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Invoice Amount (Gross)
                  {getConfidencePill('totalAmount')}
                </label>
                <input
                  type="number"
                  value={ocrData.invoiceAmount}
                  onChange={(e) =>
                    setOcrData({ ...ocrData, invoiceAmount: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 rounded-lg border-2"
                  style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                />
                {getSuggestionChips('totalAmount', (v) =>
                  setOcrData((prev) => prev && { ...prev, invoiceAmount: parseFloat(v) || 0 })
                )}
              </div>

              {/* Line items preview */}
              {ocrData.lineItems.length > 0 && (
                <div>
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Line Items ({ocrData.lineItems.length})
                  </p>
                  <div className="space-y-1.5">
                    {ocrData.lineItems.map((li, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                        style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-ink)' }}
                      >
                        <span className="flex-1 truncate">{li.description || '—'}</span>
                        <span
                          className="ml-4 shrink-0"
                          style={{ color: 'var(--color-mercury-grey)' }}
                        >
                          {li.quantity} × ₹{li.rate.toLocaleString('en-IN')}
                        </span>
                        <span
                          className="ml-4 shrink-0 font-semibold"
                          style={{ color: 'var(--color-teal)' }}
                        >
                          ₹{(li.quantity * li.rate).toLocaleString('en-IN')}
                        </span>
                        <span className="ml-3 shrink-0">
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '1px 6px',
                              borderRadius: '9999px',
                              fontWeight: 600,
                              backgroundColor:
                                li.confidence >= 0.9
                                  ? '#DCFCE7'
                                  : li.confidence >= 0.7
                                    ? '#FEF3C7'
                                    : '#FEE2E2',
                              color:
                                li.confidence >= 0.9
                                  ? '#15803D'
                                  : li.confidence >= 0.7
                                    ? '#B45309'
                                    : '#B91C1C',
                            }}
                          >
                            {Math.round(li.confidence * 100)}%
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="sticky bottom-0 bg-white border-t-2 p-6 flex gap-3"
              style={{ borderColor: 'var(--color-silver)' }}
            >
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

      {/* OCR applied indicator — shown in main form after OCR data is applied */}
      {ocrSummary && ocrStatus === 'complete' && !showOCRReview && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg flex items-center gap-3"
          style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
        >
          <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#16A34A' }} />
          <span className="text-sm flex-1" style={{ color: '#15803D' }}>
            OCR data applied · Overall confidence{' '}
            <strong>{Math.round(ocrSummary.avgConf * 100)}%</strong>
            {ocrSummary.needsReview > 0 && (
              <>
                {' '}
                ·{' '}
                <span style={{ color: '#B45309' }}>
                  {ocrSummary.needsReview} field{ocrSummary.needsReview > 1 ? 's' : ''} below 90%
                </span>
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => setShowSuggestions((v) => !v)}
            className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
            style={{ color: '#15803D' }}
          >
            <Eye className="w-3 h-3" />
            {showSuggestions ? 'Hide' : 'Show'} hints
          </button>
        </div>
      )}

      {/* Stage 2: Invoice Header */}
      <FormSection
        title="Step 2: Invoice Header"
        columns={2}
        icon={<FileText className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />}
      >
        <div>
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
          {ocrFields.vendor && (
            <div className="mt-1 flex items-center gap-1.5">
              {getConfidencePill('vendor')}
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                OCR: {ocrFields.vendor.value}
              </span>
            </div>
          )}
          {getSuggestionChips('vendor', (v) => {
            const match = vendors.find(
              (vn) => vn.name.trim().toLowerCase() === v.trim().toLowerCase()
            );
            if (match) {
              setVendorId(match.id);
              setShowAdvanceSection(true);
            }
          })}
        </div>

        {/* System-generated. Read-only always — placeholder on create,
            real value on edit (still not editable). */}
        <PxFormField label="Invoice Number">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={invoiceNumber}
              readOnly
              placeholder="Auto-generated on save"
              className="px-input px-input-readonly flex-1 px-4 py-2 rounded-lg border-2"
              style={{
                borderColor: 'var(--color-silver)',
                color: 'var(--color-ink)',
              }}
            />
            {ocrFields.invoiceNumber && getConfidencePill('invoiceNumber')}
          </div>
        </PxFormField>

        <PxFormField label="Invoice Date" required>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="px-input flex-1 px-4 py-2 rounded-lg border-2"
              style={{
                borderColor:
                  showValidation && errors.invoiceDate
                    ? 'var(--color-error-dark)'
                    : 'var(--color-silver)',
                color: 'var(--color-ink)',
              }}
            />
            {ocrFields.invoiceDate && getConfidencePill('invoiceDate')}
          </div>
          {getSuggestionChips('invoiceDate', setInvoiceDate)}
        </PxFormField>

        <PxFormField label="Due Date">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              setDueDateManuallySet(true);
            }}
            className="px-input w-full px-4 py-2 rounded-lg border-2"
            style={{
              borderColor: msmeWarning.violated ? '#F59E0B' : 'var(--color-silver)',
              color: 'var(--color-ink)',
            }}
          />
          {msmeWarning.violated && msmeWarning.message && (
            <div
              className="mt-2 p-3 rounded-lg text-sm flex items-start gap-2"
              style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E' }}
              role="alert"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{msmeWarning.message}</span>
            </div>
          )}
        </PxFormField>

        <EntitySelector value={entityId} onChange={setEntityId} required disabled />

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
            <option value="">Select state / UT</option>
            {INDIA_GST_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </PxFormField>

        <PxFormField
          label="Expense Category"
          required
          error={showValidation ? errors.expenseCategory : undefined}
        >
          <select
            value={expenseCategory}
            onChange={(e) => setExpenseCategory(e.target.value)}
            className="px-input w-full px-4 py-2 rounded-lg border-2"
            style={{
              borderColor:
                showValidation && errors.expenseCategory
                  ? 'var(--color-error-dark)'
                  : 'var(--color-silver)',
              color: 'var(--color-ink)',
            }}
          >
            <option value="">Select category</option>
            {expenseCategoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
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
            {paymentTermsOptions.map((term) => (
              <option key={term.code} value={term.code}>
                {term.name}
              </option>
            ))}
          </select>
        </PxFormField>

        <PxFormField label="Currency">
          <input
            type="text"
            value={currency}
            disabled
            className="px-input w-full px-4 py-2 rounded-lg border-2"
            style={{
              borderColor: 'var(--color-silver)',
              color: 'var(--color-ink)',
              backgroundColor: 'var(--color-cloud)',
            }}
          />
        </PxFormField>
      </FormSection>

      {/* Stage 3: Line Items */}
      <div
        className="bg-white rounded-xl border-2 p-6 mb-6"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
              Step 3: Line Items
            </h2>
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
                <th
                  className="px-3 py-3 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Description
                </th>
                <th
                  className="px-3 py-3 text-right text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Qty
                </th>
                <th
                  className="px-3 py-3 text-right text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Rate
                </th>
                <th
                  className="px-3 py-3 text-right text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Base Amt
                </th>
                <th
                  className="px-3 py-3 text-right text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  GST%
                </th>
                <th
                  className="px-3 py-3 text-right text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  GST Amt
                </th>
                <th
                  className="px-3 py-3 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  TDS Section
                </th>
                <th
                  className="px-3 py-3 text-right text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  TDS%
                </th>
                <th
                  className="px-3 py-3 text-right text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  TDS Amt
                </th>
                <th
                  className="px-3 py-3 text-right text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Net
                </th>
                <th
                  className="px-3 py-3 text-center text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <LineItemRow
                  key={item.id}
                  line={
                    {
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
                    } as any
                  }
                  vendorMaster={
                    {
                      id: selectedVendor?.id || 'vendor',
                      name: selectedVendor?.name || '',
                      vendorType: 'company',
                      panValid: true,
                      lowerCert: false,
                      lowerRate: 0,
                      tdsExempt: false,
                      itrFiled: true,
                      gstReg: 'reg',
                    } as any
                  }
                  invoiceFlags={{
                    rcm: false,
                    exempt: false,
                    sez: false,
                    interState: placeOfSupply !== entityStateAbbrev,
                    import: false,
                  }}
                  onChange={(updated) => handleSharedRowChange(index, updated)}
                  onDelete={() => removeLineItem(index)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr
                className="border-t-2"
                style={{
                  borderColor: 'var(--color-silver)',
                  backgroundColor: 'var(--color-cloud)',
                }}
              >
                <td
                  colSpan={3}
                  className="px-3 py-3 text-right"
                  style={{ color: 'var(--color-ink)' }}
                >
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
        <div
          className="bg-white rounded-xl border-2 p-6 mb-6"
          style={{ borderColor: 'var(--color-silver)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
              Step 4: Advance & GST Retention
            </h2>
          </div>

          {/* Open Advances */}
          <div className="mb-6">
            <h3 className="text-lg mb-3" style={{ color: 'var(--color-ink)' }}>
              Open Vendor Advances
            </h3>
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
                            setSelectedAdvances(selectedAdvances.filter((id) => id !== advance.id));
                            setAdvanceAdjustment(advanceAdjustment - advance.amount);
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <div>
                        <p style={{ color: 'var(--color-ink)' }}>{advance.reference}</p>
                        <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                          {advance.date}
                        </p>
                      </div>
                    </div>
                    <p style={{ color: 'var(--color-teal)' }}>
                      ₹{advance.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
                <div
                  className="flex justify-between items-center p-3 rounded-lg"
                  style={{ backgroundColor: '#DBEAFE' }}
                >
                  <span style={{ color: '#1E40AF' }}>Total Advance Adjustment:</span>
                  <span className="text-lg" style={{ color: '#1E40AF' }}>
                    ₹{advanceAdjustment.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ) : (
              <p
                className="text-sm p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  color: 'var(--color-mercury-grey)',
                }}
              >
                No open advances for this vendor
              </p>
            )}
          </div>

          {/* GST Retention */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg" style={{ color: 'var(--color-ink)' }}>
                GST Retention
              </h3>
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
                <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Enable GST Retention
                </span>
              </label>
            </div>

            {gstRetentionEnabled && (
              <div
                className="p-4 rounded-lg border-2"
                style={{ borderColor: '#FEF3C7', backgroundColor: '#FFFBEB' }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#D97706' }} />
                  <div>
                    <p className="text-sm mb-2" style={{ color: '#92400E' }}>
                      <strong>GST Return Not Found:</strong> Invoice not found in vendor's GST
                      return for the period. Consider retaining GST amount until verification.
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#92400E' }}>
                    GST Retention Amount:
                  </span>
                  <span className="text-lg" style={{ color: '#D97706' }}>
                    ₹{gstRetentionAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="bg-white rounded-xl border-2 p-6 mb-6"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>
          Narration & Remarks
        </h2>
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
      <div
        className="bg-white rounded-xl border-2 p-6"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>
          Payment Summary
        </h2>
        <div className="space-y-3">
          <div
            className="flex justify-between p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-cloud)' }}
          >
            <span style={{ color: 'var(--color-mercury-grey)' }}>Base Amount</span>
            <span style={{ color: 'var(--color-ink)' }}>
              ₹{totals.baseAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <div
            className="flex justify-between p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-cloud)' }}
          >
            <span style={{ color: 'var(--color-mercury-grey)' }}>GST Amount</span>
            <span style={{ color: 'var(--color-ink)' }}>
              ₹{totals.gstAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <div
            className="flex justify-between p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-cloud)' }}
          >
            <span style={{ color: 'var(--color-mercury-grey)' }}>Gross Amount</span>
            <span style={{ color: 'var(--color-ink)' }}>
              ₹{totals.grossAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <div
            className="flex justify-between p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-error-light)' }}
          >
            <span style={{ color: 'var(--color-error-dark)' }}>TDS Deducted</span>
            <span style={{ color: 'var(--color-error-dark)' }}>
              -₹{totals.tdsAmount.toLocaleString('en-IN')}
            </span>
          </div>
          {advanceAdjustment > 0 && (
            <div
              className="flex justify-between p-3 rounded-lg"
              style={{ backgroundColor: '#DBEAFE' }}
            >
              <span style={{ color: '#1E40AF' }}>Advance Adjusted</span>
              <span style={{ color: '#1E40AF' }}>
                -₹{advanceAdjustment.toLocaleString('en-IN')}
              </span>
            </div>
          )}
          {gstRetentionAmount > 0 && (
            <div
              className="flex justify-between p-3 rounded-lg"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <span style={{ color: '#D97706' }}>GST Retained</span>
              <span style={{ color: '#D97706' }}>
                -₹{gstRetentionAmount.toLocaleString('en-IN')}
              </span>
            </div>
          )}
          <div className="border-t-2 pt-3" style={{ borderColor: 'var(--color-silver)' }}>
            <div
              className="flex justify-between items-center p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-teal)10' }}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-6 h-6" style={{ color: 'var(--color-teal)' }} />
                <span className="text-lg" style={{ color: 'var(--color-ink)' }}>
                  Final Net Payable
                </span>
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
