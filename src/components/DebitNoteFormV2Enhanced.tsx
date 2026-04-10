import { useState, useEffect, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Send, Calendar, Building2, FileText, 
  Hash, AlertCircle, Upload, Eye, EyeOff, Trash2,
  DollarSign, TrendingUp, Package2, Info, RotateCcw
} from 'lucide-react';
import { useMasterData } from '../contexts/MasterDataContext';
import { useAPData } from '../contexts/APDataContext';
import { StandardInput, StandardSelect } from './shared/StandardInput';

interface DebitNoteLineItem {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemCategory: string;
  glAccountCode: string;
  glAccountName: string;
  prQty: number;
  poQty: number;
  grnQty: number;
  invoiceQty: number;
  debitQty: number;
  uom: string;
  poRate: number;
  invoiceRate: number;
  rateToBeDebited: number;
  debitAmount: number;
  gstPercent: number;
  gstAmount: number;
  costCenter: string;
  profitCenter: string;
}

interface SupportingDocument {
  id: string;
  fileName: string;
  documentType: string;
  referenceDocNo: string;
  visibility: 'Internal Only' | 'Vendor Visible';
  uploadedBy: string;
  uploadedDate: string;
  status: 'Valid' | 'Pending Review';
  file: File;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  hasGRN: boolean;
}

interface GRN {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  status: 'Delivered' | 'Partially Delivered';
  lineItems: {
    itemId: string;
    itemCode: string;
    itemName: string;
    itemCategory: string;
    glAccountCode: string;
    glAccountName: string;
    prQty: number;
    poQty: number;
    grnQty: number;
    invoiceQty: number;
    uom: string;
    poRate: number;
    invoiceRate: number;
    gstPercent: number;
    costCenter: string;
    profitCenter: string;
  }[];
}

interface JournalLine {
  lineNo: number;
  glAccount: string;
  glAccountName: string;
  costCenter: string;
  profitCenter: string;
  debit: number;
  credit: number;
}

type DebitNoteStatus = 'Draft' | 'Submitted' | 'Approved' | 'Issued' | 'Adjusted' | 'Closed';
type DebitNoteReasonType = 'quantity-based' | 'price-difference';
type DebitNoteReasonSubtype = 'price-difference' | 'short-supply' | 'quality-damage';

export function DebitNoteFormV2Enhanced() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { debitNoteReasons = [], vendors = [] } = useMasterData();
  const { purchaseOrders, grns, debitNotes, addDebitNote, updateDebitNote } = useAPData();
  
  const isEditMode = !!id;

  // Form state
  const [debitNoteNumber] = useState('DN-2024-0023');
  const [debitNoteDate, setDebitNoteDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [debitNoteStatus, setDebitNoteStatus] = useState<DebitNoteStatus>('Draft');
  const [reasonId, setReasonId] = useState('');
  const [reasonType, setReasonType] = useState<DebitNoteReasonType>('quantity-based');
  const [reasonSubtype, setReasonSubtype] = useState<DebitNoteReasonSubtype>('short-supply');
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [poId, setPoId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [grnId, setGrnId] = useState('');
  const [grnNumber, setGrnNumber] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [lineItems, setLineItems] = useState<DebitNoteLineItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showAccountingPreview, setShowAccountingPreview] = useState(false);
  
  // Supporting Documents state
  const [supportingDocuments, setSupportingDocuments] = useState<SupportingDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState('');
  const [uploadingRefDocNo, setUploadingRefDocNo] = useState('');
  const [uploadingVisibility, setUploadingVisibility] = useState<'Internal Only' | 'Vendor Visible'>('Internal Only');
  const [docValidationError, setDocValidationError] = useState<string>('');

  useEffect(() => {
    if (!isEditMode || !id) {
      return;
    }

    const existing = debitNotes.find((entry) => entry.id === id);
    if (!existing) {
      return;
    }

    setDebitNoteDate(existing.debitNoteDate);
    setDebitNoteStatus(existing.status === 'Pending Approval' ? 'Submitted' : existing.status);
    setReasonId(existing.reasonId);
    setVendorId(existing.vendorId || existing.vendorCode);
    setVendorName(existing.vendorName);
    setVendorCode(existing.vendorCode);
    setPoNumber(existing.referenceType === 'GRN' ? '' : existing.referenceNumber);
    setGrnNumber(existing.referenceType === 'GRN' ? existing.referenceNumber : '');
    setCurrency(existing.currency);
  }, [debitNotes, id, isEditMode]);

  const selectedVendorRecord = vendors.find((vendor) => vendor.id === vendorId || vendor.code === vendorId);
  const availablePOs: PurchaseOrder[] = selectedVendorRecord
    ? purchaseOrders
        .filter((po) => po.vendorCode === selectedVendorRecord.code && grns.some((grn) => grn.poNumber === po.poNumber))
        .map((po) => ({
          id: po.id,
          poNumber: po.poNumber,
          vendorId: selectedVendorRecord.id,
          vendorName: po.vendor,
          hasGRN: true,
        }))
    : [];

  const availableGRNs: GRN[] = poNumber
    ? grns
        .filter((grn) => grn.poNumber === poNumber)
        .map((grn) => {
          const parentPO = purchaseOrders.find((po) => po.poNumber === grn.poNumber);
          return {
            id: grn.id,
            grnNumber: grn.grnNumber,
            poId: parentPO?.id ?? grn.poNumber,
            poNumber: grn.poNumber,
            vendorId: selectedVendorRecord?.id ?? '',
            vendorName: grn.vendor,
            vendorCode: parentPO?.vendorCode ?? '',
            status: grn.status === 'Complete' ? 'Delivered' : 'Partially Delivered',
            lineItems: grn.lineItems.map((lineItem) => {
              const poLineItem = parentPO?.lineItems.find((poEntry) => poEntry.id === lineItem.poLineItemId);
              return {
                itemId: lineItem.id,
                itemCode: lineItem.itemCode,
                itemName: lineItem.itemName,
                itemCategory: poLineItem?.accountDescription ?? 'General',
                glAccountCode: poLineItem?.accountCode ?? '',
                glAccountName: poLineItem?.accountDescription ?? 'Expense',
                prQty: poLineItem?.qty ?? lineItem.qtyOrdered,
                poQty: poLineItem?.qty ?? lineItem.qtyOrdered,
                grnQty: lineItem.qtyReceived,
                invoiceQty: lineItem.qtyAccepted || lineItem.qtyReceived,
                uom: 'Unit',
                poRate: poLineItem?.unitPrice ?? lineItem.unitPrice,
                invoiceRate: poLineItem?.unitPrice ?? lineItem.unitPrice,
                gstPercent: poLineItem?.gstPercent ?? 0,
                costCenter: poLineItem?.costCentre ?? '',
                profitCenter: poLineItem?.profitCentre ?? '',
              };
            }),
          };
        })
    : [];

  const handleReasonChange = (newReasonId: string) => {
    setReasonId(newReasonId);
    
    // Determine reason type and subtype based on reason name
    const selectedReason = debitNoteReasons.find(r => r.id === newReasonId);
    if (selectedReason) {
      const reasonName = selectedReason.name.toLowerCase();
      const isPriceDifference = reasonName.includes('price difference');
      const isShortSupply = reasonName.includes('short supply');
      const isQualityOrDamage = reasonName.includes('quality') || reasonName.includes('damage');
      
      setReasonType(isPriceDifference ? 'price-difference' : 'quantity-based');
      
      // Set subtype
      if (isPriceDifference) {
        setReasonSubtype('price-difference');
      } else if (isShortSupply) {
        setReasonSubtype('short-supply');
      } else {
        setReasonSubtype('quality-damage');
      }
      
      // Update line items based on reason type and subtype
      if (isPriceDifference && lineItems.length > 0) {
        setLineItems(prevItems =>
          prevItems.map(item => {
            const debitRateDelta = Math.max(0, item.invoiceRate - item.poRate);
            return {
              ...item,
              debitQty: item.invoiceQty, // Auto-set to invoice qty for price difference
              rateToBeDebited: debitRateDelta, // Initialize with delta rate (Inv Rate - PO Rate)
              debitAmount: debitRateDelta * item.invoiceQty,
              gstAmount: (debitRateDelta * item.invoiceQty * item.gstPercent) / 100
            };
          })
        );
      } else if (lineItems.length > 0) {
        // Reset for quantity-based (Short Supply or Quality/Damage)
        setLineItems(prevItems =>
          prevItems.map(item => {
            // Short Supply: suggested qty = max(0, Inv Qty - GRN Qty)
            // Quality/Damage: suggested qty = 0
            const suggestedQty = isShortSupply ? Math.max(0, item.invoiceQty - item.grnQty) : 0;
            return {
              ...item,
              debitQty: suggestedQty,
              rateToBeDebited: item.poRate,
              debitAmount: suggestedQty * item.poRate,
              gstAmount: (suggestedQty * item.poRate * item.gstPercent) / 100
            };
          })
        );
      }
    }
  };

  const handleVendorChange = (vId: string) => {
    setVendorId(vId);
    setPoId('');
    setPoNumber('');
    setGrnId('');
    setGrnNumber('');
    setLineItems([]);
    setErrors([]);
    
    const selectedVendor = vendors.find(v => v.id === vId || v.code === vId);
    if (selectedVendor) {
      setVendorName(selectedVendor.name);
      setVendorCode(selectedVendor.code);
    }
  };

  const handlePOChange = (selectedPoId: string) => {
    setPoId(selectedPoId);
    setGrnId('');
    setGrnNumber('');
    setLineItems([]);
    setErrors([]);
    
    const po = availablePOs.find(p => p.id === selectedPoId);
    if (po) {
      setPoNumber(po.poNumber);
    }
  };

  const handleGRNChange = (selectedGrnId: string) => {
    setGrnId(selectedGrnId);
    setErrors([]);
    
    const grn = availableGRNs.find(g => g.id === selectedGrnId);
    if (grn) {
      setGrnNumber(grn.grnNumber);
      
      // Auto-populate line items from GRN with full visibility and suggested defaults
      const items: DebitNoteLineItem[] = grn.lineItems.map((item, index) => {
        const isPriceDiff = reasonType === 'price-difference';
        
        // Calculate suggested values based on reason type and subtype
        let debitQty = 0;
        let rateToDebit = item.poRate;
        let debitAmount = 0;
        
        if (isPriceDiff) {
          // Price Difference: Debit Qty = Invoice Qty, Debit Rate (Delta) = Inv Rate - PO Rate (suggested)
          debitQty = item.invoiceQty;
          rateToDebit = Math.max(0, item.invoiceRate - item.poRate); // Delta rate, user can edit
          debitAmount = rateToDebit * debitQty;
        } else {
          // Qty-based reasons
          rateToDebit = item.poRate;
          
          if (reasonSubtype === 'short-supply') {
            // Short Supply: Suggested Debit Qty = max(0, Inv Qty - GRN Qty)
            debitQty = Math.max(0, item.invoiceQty - item.grnQty);
          } else {
            // Quality/Damage: Suggested Debit Qty = 0 (user must enter)
            debitQty = 0;
          }
          
          debitAmount = debitQty * item.poRate;
        }
        
        const gstAmount = (debitAmount * item.gstPercent) / 100;
        
        return {
          id: `line-${index + 1}`,
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          itemCategory: item.itemCategory,
          glAccountCode: item.glAccountCode,
          glAccountName: item.glAccountName,
          prQty: item.prQty,
          poQty: item.poQty,
          grnQty: item.grnQty,
          invoiceQty: item.invoiceQty,
          debitQty: debitQty,
          uom: item.uom,
          poRate: item.poRate,
          invoiceRate: item.invoiceRate,
          rateToBeDebited: rateToDebit,
          debitAmount: debitAmount,
          gstPercent: item.gstPercent,
          gstAmount: gstAmount,
          costCenter: item.costCenter,
          profitCenter: item.profitCenter
        };
      });
      setLineItems(items);
    }
  };

  const handleDebitQtyChange = (itemId: string, debitQty: number) => {
    setLineItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          // For quantity-based: Debit Qty should not exceed min(Invoice Qty, GRN Qty)
          const maxAllowed = Math.min(item.invoiceQty, item.grnQty);
          const validDebitQty = Math.min(Math.max(0, debitQty), maxAllowed);
          const debitAmount = validDebitQty * item.poRate;
          const gstAmount = (debitAmount * item.gstPercent) / 100;
          return { ...item, debitQty: validDebitQty, debitAmount, gstAmount };
        }
        return item;
      })
    );
  };

  const handleRateToBeDebitedChange = (itemId: string, rate: number) => {
    setLineItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const validRate = Math.max(0, rate);
          // For price difference: rate is the delta, so debitAmount = delta × qty
          const debitAmount = validRate * item.debitQty;
          const gstAmount = (debitAmount * item.gstPercent) / 100;
          return { ...item, rateToBeDebited: validRate, debitAmount, gstAmount };
        }
        return item;
      })
    );
  };

  const resetToSuggested = (itemId: string) => {
    setLineItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          if (reasonType === 'price-difference') {
            // Reset Debit Rate (Delta) to suggested value (Inv Rate - PO Rate)
            const debitRateDelta = Math.max(0, item.invoiceRate - item.poRate);
            const debitAmount = debitRateDelta * item.debitQty;
            const gstAmount = (debitAmount * item.gstPercent) / 100;
            return { ...item, rateToBeDebited: debitRateDelta, debitAmount, gstAmount };
          } else {
            // Reset Debit Qty to suggested value based on subtype
            let suggestedQty = 0;
            
            if (reasonSubtype === 'short-supply') {
              suggestedQty = Math.max(0, item.invoiceQty - item.grnQty);
            } else {
              // Quality/Damage: suggested qty = 0
              suggestedQty = 0;
            }
            
            const debitAmount = suggestedQty * item.rateToBeDebited;
            const gstAmount = (debitAmount * item.gstPercent) / 100;
            return { ...item, debitQty: suggestedQty, debitAmount, gstAmount };
          }
        }
        return item;
      })
    );
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.debitAmount, 0);
  };

  const calculateTotalGST = () => {
    return lineItems.reduce((sum, item) => sum + item.gstAmount, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTotalGST();
  };

  const generateJournalLines = (): JournalLine[] => {
    const lines: JournalLine[] = [];
    let lineNo = 1;

    // Group by GL Account, Cost Center, Profit Center
    const grouped: { [key: string]: { debit: number; credit: number; glAccountName: string; costCenter: string; profitCenter: string } } = {};

    lineItems.forEach(item => {
      if (item.debitAmount > 0) {
        const key = `${item.glAccountCode}_${item.costCenter}_${item.profitCenter}`;
        if (!grouped[key]) {
          grouped[key] = {
            debit: 0,
            credit: 0,
            glAccountName: item.glAccountName,
            costCenter: item.costCenter,
            profitCenter: item.profitCenter
          };
        }
        grouped[key].debit += item.debitAmount + item.gstAmount;
      }
    });

    // Create debit lines for expenses
    Object.entries(grouped).forEach(([key, value]) => {
      const [glAccount, costCenter, profitCenter] = key.split('_');
      lines.push({
        lineNo: lineNo++,
        glAccount,
        glAccountName: value.glAccountName,
        costCenter,
        profitCenter,
        debit: value.debit,
        credit: 0
      });
    });

    // Create single credit line for vendor payable
    lines.push({
      lineNo: lineNo++,
      glAccount: '210100',
      glAccountName: 'Accounts Payable - Vendors',
      costCenter: '-',
      profitCenter: '-',
      debit: 0,
      credit: calculateTotal()
    });

    return lines;
  };

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    if (!reasonId) {
      validationErrors.push('Please select a debit note reason');
    }

    if (!vendorId) {
      validationErrors.push('Please select a vendor');
    }

    if (!poId) {
      validationErrors.push('Please select a PO');
    }

    if (!grnId) {
      validationErrors.push('Please select a GRN');
    }

    if (lineItems.length === 0) {
      validationErrors.push('No line items found. Please select a valid GRN.');
    }

    const totalDebitAmount = lineItems.reduce((sum, item) => sum + item.debitAmount, 0);
    if (totalDebitAmount <= 0) {
      validationErrors.push('Total debit amount must be greater than zero');
    }

    // Price difference validations
    if (reasonType === 'price-difference') {
      const hasAnyVariance = lineItems.some(item => item.invoiceRate > item.poRate);
      
      if (!hasAnyVariance) {
        validationErrors.push('No price variance found. All invoice rates are equal to or less than PO rates.');
      }
      
      lineItems.forEach((item, index) => {
        const maxDelta = Math.max(0, item.invoiceRate - item.poRate);
        
        // Hard block: Debit Rate (Delta) must be >= 0
        if (item.rateToBeDebited < 0) {
          validationErrors.push(`Line ${index + 1}: Debit rate (delta) cannot be negative`);
        }
        
        // Hard block: Debit Rate (Delta) must be <= (Invoice Rate - PO Rate)
        if (item.rateToBeDebited > maxDelta) {
          validationErrors.push(`Line ${index + 1}: Debit rate (delta) ${item.rateToBeDebited.toFixed(2)} cannot exceed the price variance ${maxDelta.toFixed(2)} (Invoice Rate − PO Rate)`);
        }
        
        // Validation: If no variance, debit amount should be 0
        if (item.invoiceRate <= item.poRate && item.debitAmount > 0) {
          validationErrors.push(`Line ${index + 1}: No price variance found (Invoice rate ${item.invoiceRate} ≤ PO rate ${item.poRate}). Debit amount must be zero.`);
        }
      });
      
      // Check if all debit amounts are zero
      const allDeltasZero = lineItems.every(item => item.rateToBeDebited === 0);
      if (allDeltasZero) {
        validationErrors.push('Cannot submit: All lines have Debit Rate (Delta) = 0. Please ensure there are price variances to claim.');
      }
    } else {
      // Quantity-based validations (Short Supply / Quality/Damage)
      lineItems.forEach((item, index) => {
        // Hard block: Debit Qty must be >= 0
        if (item.debitQty < 0) {
          validationErrors.push(`Line ${index + 1}: Debit qty cannot be negative`);
        }
        
        // Hard block: Debit Qty must be <= Invoice Qty
        if (item.debitQty > item.invoiceQty) {
          validationErrors.push(`Line ${index + 1}: Debit qty (${item.debitQty}) cannot exceed invoice qty (${item.invoiceQty})`);
        }
        
        // Hard block: Debit Qty must be <= GRN Qty (where applicable)
        if (item.debitQty > item.grnQty) {
          validationErrors.push(`Line ${index + 1}: Debit qty (${item.debitQty}) cannot exceed GRN qty (${item.grnQty})`);
        }
      });
      
      // Check if all debit quantities are zero
      const allQtysZero = lineItems.every(item => item.debitQty === 0);
      if (allQtysZero) {
        validationErrors.push('Cannot submit: All lines have Debit Qty = 0. At least one line must have a debit quantity.');
      }
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const validateSupportingDocuments = (): string | null => {
    if (supportingDocuments.length === 0) {
      return 'At least one supporting document (GRN, Invoice or QC Report) is required';
    }

    const hasRequiredDoc = supportingDocuments.some(
      doc => ['GRN', 'Invoice Copy', 'QC / Inspection Report'].includes(doc.documentType)
    );
    
    if (!hasRequiredDoc) {
      return 'At least one "GRN", "Invoice Copy" or "QC / Inspection Report" document is required';
    }

    const hasPendingReview = supportingDocuments.some(doc => doc.status === 'Pending Review');
    if (hasPendingReview) {
      return 'All supporting documents must be valid before submission';
    }

    return null;
  };

  const handleSaveDraft = () => {
    if (!validateForm()) {
      return;
    }

    const reasonName =
      debitNoteReasons.find((reason) => reason.id === reasonId)?.name ??
      debitNoteReasons.find((reason) => reason.id === reasonId)?.reasonName ??
      'Debit Note';

    const debitNoteRecord = {
      id: id ?? `DN-${Date.now()}`,
      debitNoteNumber,
      debitNoteDate,
      vendorId,
      vendorName,
      vendorCode,
      vendorAPAccount: `2100-${vendorCode || '000'}`,
      referenceType: grnNumber ? 'GRN' as const : 'Invoice' as const,
      referenceNumber: grnNumber || poNumber || 'Unlinked',
      referenceId: grnId || poId || `REF-${Date.now()}`,
      reasonId,
      reasonName,
      debitAmount: calculateTotal(),
      currency,
      status: 'Draft' as const,
      lineItems: lineItems.map((item) => ({
        id: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        referenceQty: item.grnQty || item.invoiceQty,
        invoicedQty: item.invoiceQty,
        debitQty: item.debitQty,
        uom: item.uom,
        rate: reasonType === 'price-difference' ? item.rateToBeDebited : item.poRate,
        debitAmount: item.debitAmount,
        expenseGL: item.glAccountCode,
      })),
      createdBy: 'Current User',
      createdDate: new Date().toISOString(),
    };

    if (isEditMode && id) {
      updateDebitNote(id, debitNoteRecord);
    } else {
      addDebitNote(debitNoteRecord);
    }

    navigate('/ap/debit-notes');
  };

  const handleSubmitForApproval = () => {
    if (!validateForm()) {
      return;
    }

    const docError = validateSupportingDocuments();
    if (docError) {
      setErrors([docError]);
      return;
    }

    const reasonName =
      debitNoteReasons.find((reason) => reason.id === reasonId)?.name ??
      debitNoteReasons.find((reason) => reason.id === reasonId)?.reasonName ??
      'Debit Note';

    const debitNoteRecord = {
      id: id ?? `DN-${Date.now()}`,
      debitNoteNumber,
      debitNoteDate,
      vendorId,
      vendorName,
      vendorCode,
      vendorAPAccount: `2100-${vendorCode || '000'}`,
      referenceType: grnNumber ? 'GRN' as const : 'Invoice' as const,
      referenceNumber: grnNumber || poNumber || 'Unlinked',
      referenceId: grnId || poId || `REF-${Date.now()}`,
      reasonId,
      reasonName,
      debitAmount: calculateTotal(),
      currency,
      status: 'Pending Approval' as const,
      lineItems: lineItems.map((item) => ({
        id: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        referenceQty: item.grnQty || item.invoiceQty,
        invoicedQty: item.invoiceQty,
        debitQty: item.debitQty,
        uom: item.uom,
        rate: reasonType === 'price-difference' ? item.rateToBeDebited : item.poRate,
        debitAmount: item.debitAmount,
        expenseGL: item.glAccountCode,
      })),
      createdBy: 'Current User',
      createdDate: new Date().toISOString(),
    };

    if (isEditMode && id) {
      updateDebitNote(id, debitNoteRecord);
    } else {
      addDebitNote(debitNoteRecord);
    }

    navigate('/ap/debit-notes');
  };

  const handleCancel = () => {
    navigate('/ap/debit-notes');
  };

  // Supporting Documents Functions
  const getReferenceSuggestions = (): string[] => {
    const suggestions: string[] = [];
    
    if (grnNumber) {
      suggestions.push(grnNumber);
    }
    if (poNumber) {
      suggestions.push(poNumber);
    }
    
    return suggestions;
  };

  const validateDocumentMetadata = (doc: Partial<SupportingDocument>): string | null => {
    if (doc.file && doc.file.size > 20 * 1024 * 1024) {
      return 'File size exceeds 20 MB limit';
    }

    const allowedFormats = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (doc.file && !allowedFormats.includes(doc.file.type)) {
      return 'Unsupported file format. Please upload PDF, JPG, PNG, or XLSX';
    }

    if (!doc.documentType) {
      return 'Document Type is required';
    }

    const requiresRefDoc = ['Invoice Copy', 'GRN', 'QC / Inspection Report', 'Freight Bill'];
    if (requiresRefDoc.includes(doc.documentType) && !doc.referenceDocNo) {
      return 'Reference Document No is required for this document type';
    }

    return null;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    if (!uploadingDocType) {
      setDocValidationError('Please select a Document Type before uploading');
      return;
    }

    const requiresRefDoc = ['Invoice Copy', 'GRN', 'QC / Inspection Report', 'Freight Bill'];
    if (requiresRefDoc.includes(uploadingDocType) && !uploadingRefDocNo) {
      setDocValidationError('Reference Document No is required for this document type');
      return;
    }
    
    const validationError = validateDocumentMetadata({ 
      file, 
      documentType: uploadingDocType, 
      referenceDocNo: uploadingRefDocNo 
    });
    
    if (validationError) {
      setDocValidationError(validationError);
      return;
    }

    const newDoc: SupportingDocument = {
      id: `doc-${Date.now()}`,
      fileName: file.name,
      documentType: uploadingDocType,
      referenceDocNo: uploadingRefDocNo,
      visibility: uploadingVisibility,
      uploadedBy: 'Current User',
      uploadedDate: new Date().toISOString(),
      status: 'Pending Review',
      file: file
    };

    const docError = validateDocumentMetadata(newDoc);
    if (!docError) {
      newDoc.status = 'Valid';
    }

    setSupportingDocuments(prev => [...prev, newDoc]);
    
    setUploadingDocType('');
    setUploadingRefDocNo('');
    setUploadingVisibility('Internal Only');
    setDocValidationError('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDeleteDocument = (docId: string) => {
    if (debitNoteStatus !== 'Draft') return;
    setSupportingDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const getStatusBadge = () => {
    const statusConfig = {
      Draft: { bg: '#F6F9FC', color: '#6E7A82', border: '#E1E6EA' },
      Submitted: { bg: '#FFF4ED', color: '#C4320A', border: '#FECDCA' },
      Approved: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
      Issued: { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
      Adjusted: { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
      Closed: { bg: '#E5E7EB', color: '#374151', border: '#D1D5DB' }
    };

    const config = statusConfig[debitNoteStatus];
    return (
      <div 
        className="inline-flex items-center px-3 py-1 rounded-lg text-sm"
        style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}` }}
      >
        {debitNoteStatus}
      </div>
    );
  };

  const isPriceDifference = reasonType === 'price-difference';

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg transition-colors hover:bg-white"
            style={{ color: '#6E7A82' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl mb-2" style={{ color: '#0A0F14' }}>
              {isEditMode ? 'Edit Debit Note' : 'Create Debit Note'}
            </h1>
            <p style={{ color: '#6E7A82' }}>
              Create a debit note with full PR-PO-GRN-Invoice visibility
            </p>
          </div>
        </div>
        <div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-white p-4 rounded-lg mb-6" style={{ border: '1px solid #EF4444' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <div className="flex-1">
              <h3 className="mb-2" style={{ color: '#EF4444' }}>
                Please fix the following errors:
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm" style={{ color: '#EF4444' }}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Reason Behavior Info */}
      {reasonId && (
        <div className="bg-white p-4 rounded-lg mb-6" style={{ border: '1px solid #00A9B7' }}>
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#00A9B7' }} />
            <div className="flex-1">
              <h3 className="mb-1" style={{ color: '#00A9B7' }}>
                {isPriceDifference ? 'Price Difference Mode' : 'Quantity-Based Mode'}
              </h3>
              <p className="text-sm" style={{ color: '#6E7A82' }}>
                {isPriceDifference 
                  ? 'Price variance detected. Debit Rate (Delta) is suggested from Invoice Rate − PO Rate. You may adjust where allowed.'
                  : 'Debit Qty is suggested from quantity mismatch. Review and adjust where allowed.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '1px solid #E1E6EA' }}>
        {/* STEP 1: Header (System Controlled) */}
        <div className="mb-6 pb-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
          <h2 className="text-lg mb-4" style={{ color: '#0A0F14' }}>System Information</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Debit Note Number
              </label>
              <StandardInput
                type="text"
                value={debitNoteNumber}
                onChange={() => {}}
                readOnly
                icon={<Hash className="w-4 h-4" />}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Debit Note Date *
              </label>
              <StandardInput
                type="date"
                value={debitNoteDate}
                onChange={(e) => setDebitNoteDate(e.target.value)}
                disabled={debitNoteStatus !== 'Draft'}
                icon={<Calendar className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>

        {/* STEP 2: Commercial Context */}
        <div className="mb-6 pb-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
          <h2 className="text-lg mb-4" style={{ color: '#0A0F14' }}>Commercial Context</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Debit Note Reason *
              </label>
              <StandardSelect
                value={reasonId}
                onChange={(e) => handleReasonChange(e.target.value)}
                disabled={debitNoteStatus !== 'Draft'}
                icon={<FileText className="w-4 h-4" />}
              >
                <option value="">Select Reason</option>
                {debitNoteReasons.filter(r => r.status === 'Active').map(reason => (
                  <option key={reason.id} value={reason.id}>
                    {reason.name}
                  </option>
                ))}
              </StandardSelect>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Vendor *
              </label>
              <StandardSelect
                value={vendorId}
                onChange={(e) => handleVendorChange(e.target.value)}
                disabled={debitNoteStatus !== 'Draft'}
                icon={<Building2 className="w-4 h-4" />}
              >
                <option value="">Select Vendor</option>
                {vendors.filter(v => v.status === 'Active').map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name} ({vendor.code})
                  </option>
                ))}
              </StandardSelect>
            </div>
          </div>
        </div>

        {/* STEP 3: Reference Selection (GRN-Driven) */}
        <div className="mb-6 pb-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
          <h2 className="text-lg mb-4" style={{ color: '#0A0F14' }}>Reference Selection</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                PO Number *
              </label>
              <StandardSelect
                value={poId}
                onChange={(e) => handlePOChange(e.target.value)}
                disabled={debitNoteStatus !== 'Draft' || !vendorId}
                icon={<Package2 className="w-4 h-4" />}
              >
                <option value="">Select PO with GRN</option>
                {availablePOs.map(po => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber}
                  </option>
                ))}
              </StandardSelect>
              {vendorId && availablePOs.length === 0 && (
                <p className="text-xs mt-1" style={{ color: '#F59E0B' }}>
                  No POs with GRN available for this vendor
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                GRN Number *
              </label>
              <StandardSelect
                value={grnId}
                onChange={(e) => handleGRNChange(e.target.value)}
                disabled={debitNoteStatus !== 'Draft' || !poId}
                icon={<FileText className="w-4 h-4" />}
              >
                <option value="">Select GRN</option>
                {availableGRNs.map(grn => (
                  <option key={grn.id} value={grn.id}>
                    {grn.grnNumber} - {grn.status}
                  </option>
                ))}
              </StandardSelect>
              {poId && availableGRNs.length === 0 && (
                <p className="text-xs mt-1" style={{ color: '#F59E0B' }}>
                  No GRNs available for this PO
                </p>
              )}
            </div>
          </div>
        </div>

        {/* STEP 4: Line Item Table with Full Visibility */}
        {lineItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg mb-4" style={{ color: '#0A0F14' }}>
              Line Items - Full PR→PO→GRN→Invoice Visibility
            </h2>
            
            {/* System Suggestion Banner */}
            {lineItems.length > 0 && (
              <div className="mb-4 p-3 rounded" style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}>
                <p className="text-xs" style={{ color: '#6E7A82' }}>
                  💡 Suggested values have been pre-filled based on PO, GRN and Invoice. You can adjust where allowed.
                </p>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: '#F6F9FC' }}>
                  <tr>
                    {/* Identification */}
                    <th className="px-3 py-3 text-left text-xs" style={{ color: '#6E7A82', minWidth: '200px' }}>
                      Item Name
                    </th>
                    <th className="px-3 py-3 text-left text-xs" style={{ color: '#6E7A82', minWidth: '120px' }}>
                      Category
                    </th>
                    <th className="px-3 py-3 text-left text-xs" style={{ color: '#6E7A82', minWidth: '100px' }}>
                      GL Account
                    </th>
                    {/* Quantity Comparison - Show PR Qty and PO Qty only for qty-based */}
                    {!isPriceDifference && (
                      <>
                        <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '80px' }}>
                          PR Qty
                        </th>
                        <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '80px' }}>
                          PO Qty
                        </th>
                      </>
                    )}
                    <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '80px' }}>
                      GRN Qty
                    </th>
                    <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '80px' }}>
                      Inv Qty
                    </th>
                    <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '100px' }}>
                      Debit Qty {isPriceDifference ? '(Auto)' : '*'}
                    </th>
                    {/* Rate Comparison - Show PO/Inv/Delta only for Price Difference */}
                    {isPriceDifference ? (
                      <>
                        <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '100px' }}>
                          PO Rate
                        </th>
                        <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '100px' }}>
                          Inv Rate
                        </th>
                        <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '140px' }}>
                          <div>Debit Rate (Delta) *</div>
                          <div style={{ fontWeight: 'normal', fontSize: '10px', marginTop: '2px', color: '#9CA3AF' }}>Invoice Rate − PO Rate</div>
                        </th>
                      </>
                    ) : (
                      <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '100px' }}>
                        PO Rate
                      </th>
                    )}
                    {/* Financial Calculation */}
                    <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '100px' }}>
                      Debit Amt
                    </th>
                    <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '70px' }}>
                      GST %
                    </th>
                    <th className="px-3 py-3 text-right text-xs" style={{ color: '#6E7A82', minWidth: '90px' }}>
                      GST Amt
                    </th>
                    {/* Allocation */}
                    <th className="px-3 py-3 text-left text-xs" style={{ color: '#6E7A82', minWidth: '100px' }}>
                      Cost Center
                    </th>
                    <th className="px-3 py-3 text-left text-xs" style={{ color: '#6E7A82', minWidth: '100px' }}>
                      Profit Center
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <Fragment key={item.id}>
                    <tr style={{ borderTop: '1px solid #E1E6EA' }}>
                      {/* Identification */}
                      <td className="px-3 py-3">
                        <div>
                          <div className="text-sm" style={{ color: '#0A0F14' }}>{item.itemName}</div>
                          <div className="text-xs" style={{ color: '#6E7A82' }}>{item.itemCode}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm" style={{ color: '#6E7A82' }}>{item.itemCategory}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div>
                          <div className="text-sm" style={{ color: '#0A0F14' }}>{item.glAccountCode}</div>
                          <div className="text-xs" style={{ color: '#6E7A82' }}>{item.glAccountName}</div>
                        </div>
                      </td>
                      {/* Quantity Comparison - Show PR Qty and PO Qty only for qty-based */}
                      {!isPriceDifference && (
                        <>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm" style={{ color: '#6E7A82' }}>
                              {item.prQty} {item.uom}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm" style={{ color: '#6E7A82' }}>
                              {item.poQty} {item.uom}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm" style={{ color: '#0A0F14' }}>
                          {item.grnQty} {item.uom}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm" style={{ color: '#0A0F14' }}>
                          {item.invoiceQty} {item.uom}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {isPriceDifference ? (
                          <span className="text-sm px-2 py-1.5 rounded" style={{ color: '#6E7A82', backgroundColor: '#F6F9FC' }}>
                            {item.debitQty} {item.uom}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              min="0"
                              max={Math.min(item.invoiceQty, item.grnQty)}
                              step="0.01"
                              value={item.debitQty || ''}
                              onChange={(e) => handleDebitQtyChange(item.id, parseFloat(e.target.value) || 0)}
                              disabled={debitNoteStatus !== 'Draft'}
                              className="w-20 px-2 py-1.5 text-right rounded text-sm"
                              style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                              placeholder="0"
                            />
                            {(() => {
                              const suggestedQty = reasonSubtype === 'short-supply' 
                                ? Math.max(0, item.invoiceQty - item.grnQty) 
                                : 0;
                              return item.debitQty !== suggestedQty && debitNoteStatus === 'Draft' && (
                                <button
                                  type="button"
                                  onClick={() => resetToSuggested(item.id)}
                                  className="p-1 rounded hover:bg-white transition-colors"
                                  style={{ color: '#00A9B7' }}
                                  title="Reset to Suggested"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </td>
                      {/* Rate Comparison - Show PO/Inv/Delta only for Price Difference */}
                      {isPriceDifference ? (
                        <>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm" style={{ color: '#0A0F14' }}>
                              {currency} {item.poRate.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm" style={{ color: '#C4320A' }}>
                              {currency} {item.invoiceRate.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="relative flex items-center gap-1 justify-end">
                              <input
                                type="number"
                                min="0"
                                max={Math.max(0, item.invoiceRate - item.poRate)}
                                step="0.01"
                                value={item.rateToBeDebited || ''}
                                onChange={(e) => handleRateToBeDebitedChange(item.id, parseFloat(e.target.value) || 0)}
                                disabled={debitNoteStatus !== 'Draft'}
                                className="w-24 px-2 py-1.5 text-right rounded text-sm"
                                style={{ 
                                  border: '1px solid #E1E6EA', 
                                  color: '#0A0F14',
                                  backgroundColor: 'white'
                                }}
                                placeholder="0"
                              />
                              {item.rateToBeDebited !== Math.max(0, item.invoiceRate - item.poRate) && debitNoteStatus === 'Draft' && (
                                <button
                                  type="button"
                                  onClick={() => resetToSuggested(item.id)}
                                  className="p-1 rounded hover:bg-white transition-colors"
                                  style={{ color: '#00A9B7' }}
                                  title="Reset to Suggested Delta"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      ) : (
                        <td className="px-3 py-3 text-right">
                          <span className="text-sm" style={{ color: '#0A0F14' }}>
                            {currency} {item.poRate.toLocaleString('en-IN')}
                          </span>
                        </td>
                      )}
                      {/* Financial Calculation */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm" style={{ color: '#0A0F14' }}>
                          {currency} {item.debitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm" style={{ color: '#6E7A82' }}>
                          {item.gstPercent}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm" style={{ color: '#0A0F14' }}>
                          {currency} {item.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      {/* Allocation */}
                      <td className="px-3 py-3">
                        <span className="text-sm" style={{ color: '#6E7A82' }}>{item.costCenter}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm" style={{ color: '#6E7A82' }}>{item.profitCenter}</span>
                      </td>
                    </tr>
                    {isPriceDifference && item.invoiceRate <= item.poRate && (
                      <tr style={{ borderTop: '1px solid #E1E6EA' }}>
                        <td colSpan={13} className="px-3 py-2" style={{ backgroundColor: '#FEF3C7' }}>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" style={{ color: '#F59E0B' }} />
                            <span className="text-xs" style={{ color: '#92400E' }}>
                              No price variance found for this line (Invoice rate ₹{item.invoiceRate.toLocaleString('en-IN')} ≤ PO rate ₹{item.poRate.toLocaleString('en-IN')}). Debit amount is zero.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculation Explanation */}
            <div className="mt-4 p-3 rounded" style={{ backgroundColor: '#F6F9FC' }}>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                {isPriceDifference 
                  ? '💡 Calculation: Debit Amount = Debit Rate (Delta) × Debit Qty, where Debit Rate (Delta) = Invoice Rate − PO Rate.'
                  : '💡 Calculation: Debit Amount = Debit Qty × PO Rate.'}
              </p>
            </div>
          </div>
        )}

        {/* STEP 5: Totals Section */}
        {lineItems.length > 0 && (
          <div className="pt-6" style={{ borderTop: '1px solid #E1E6EA' }}>
            <div className="flex justify-end">
              <div className="w-96 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6E7A82' }}>Subtotal</span>
                  <span className="text-sm" style={{ color: '#0A0F14' }}>
                    {currency} {calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6E7A82' }}>Total GST</span>
                  <span className="text-sm" style={{ color: '#0A0F14' }}>
                    {currency} {calculateTotalGST().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E1E6EA' }}>
                  <span style={{ color: '#0A0F14' }}>Debit Note Total</span>
                  <span className="text-xl" style={{ color: '#0A0F14' }}>
                    {currency} {calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 6: Supporting Documents */}
      <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '1px solid #E1E6EA' }}>
        <h2 className="text-lg mb-4" style={{ color: '#0A0F14' }}>Supporting Documents</h2>

        {/* Upload Area */}
        {debitNoteStatus === 'Draft' && (
          <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
            <div className="grid grid-cols-4 gap-4 mb-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#6E7A82' }}>
                  Document Type *
                </label>
                <select
                  value={uploadingDocType}
                  onChange={(e) => {
                    setUploadingDocType(e.target.value);
                    setDocValidationError('');
                  }}
                  className="w-full px-2 py-2 rounded text-sm"
                  style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                >
                  <option value="">Select</option>
                  <option value="GRN">GRN</option>
                  <option value="Invoice Copy">Invoice Copy</option>
                  <option value="QC / Inspection Report">QC / Inspection Report</option>
                  <option value="Tax Working">Tax Working</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#6E7A82' }}>
                  Reference No {['GRN', 'Invoice Copy', 'QC / Inspection Report'].includes(uploadingDocType) && '*'}
                </label>
                <select
                  value={uploadingRefDocNo}
                  onChange={(e) => {
                    setUploadingRefDocNo(e.target.value);
                    setDocValidationError('');
                  }}
                  className="w-full px-2 py-2 rounded text-sm"
                  style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                >
                  <option value="">Select</option>
                  {getReferenceSuggestions().map((ref, idx) => (
                    <option key={idx} value={ref}>{ref}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#6E7A82' }}>
                  Visibility *
                </label>
                <select
                  value={uploadingVisibility}
                  onChange={(e) => setUploadingVisibility(e.target.value as 'Internal Only' | 'Vendor Visible')}
                  className="w-full px-2 py-2 rounded text-sm"
                  style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                >
                  <option value="Internal Only">Internal Only</option>
                  <option value="Vendor Visible">Vendor Visible</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#6E7A82' }}>
                  File *
                </label>
                <label
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors text-sm text-white"
                  style={{ backgroundColor: '#00A9B7' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
                >
                  <Upload className="w-4 h-4" />
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                  />
                </label>
              </div>
            </div>

            <div
              className={`p-2 rounded border-2 border-dashed text-center ${isDragging ? 'border-teal-500 bg-teal-50' : 'border-gray-300'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                Or drag & drop • PDF, JPG, PNG, XLSX • Max 20 MB
              </p>
            </div>

            {docValidationError && (
              <div className="mt-2 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                <p className="text-xs" style={{ color: '#EF4444' }}>{docValidationError}</p>
              </div>
            )}
          </div>
        )}

        {/* Documents Table */}
        {supportingDocuments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F6F9FC' }}>
                <tr>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>Document Type</th>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>File Name</th>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>Reference</th>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>Visibility</th>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>Uploaded By</th>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>Uploaded On</th>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>Status</th>
                  {debitNoteStatus === 'Draft' && (
                    <th className="px-3 py-2 text-center text-xs" style={{ color: '#6E7A82' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {supportingDocuments.map((doc) => (
                  <tr key={doc.id} style={{ borderTop: '1px solid #E1E6EA' }}>
                    <td className="px-3 py-2">
                      <span className="text-sm" style={{ color: '#0A0F14' }}>{doc.documentType}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm" style={{ color: '#0A0F14' }}>{doc.fileName}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm" style={{ color: '#6E7A82' }}>{doc.referenceDocNo || '-'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {doc.visibility === 'Vendor Visible' ? (
                          <Eye className="w-3 h-3" style={{ color: '#00A9B7' }} />
                        ) : (
                          <EyeOff className="w-3 h-3" style={{ color: '#6E7A82' }} />
                        )}
                        <span className="text-xs" style={{ color: '#6E7A82' }}>{doc.visibility}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm" style={{ color: '#6E7A82' }}>{doc.uploadedBy}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm" style={{ color: '#6E7A82' }}>
                        {new Date(doc.uploadedDate).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span 
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ 
                          backgroundColor: doc.status === 'Valid' ? '#D1FAE5' : '#FEF3C7',
                          color: doc.status === 'Valid' ? '#065F46' : '#92400E'
                        }}
                      >
                        {doc.status}
                      </span>
                    </td>
                    {debitNoteStatus === 'Draft' && (
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 rounded hover:bg-red-50 transition-colors"
                          style={{ color: '#EF4444' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6" style={{ color: '#6E7A82' }}>
            <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: '#E1E6EA' }} />
            <p className="text-sm">No supporting documents uploaded</p>
            {debitNoteStatus === 'Draft' && (
              <p className="text-xs mt-1">At least one GRN, Invoice, or QC Report is required</p>
            )}
          </div>
        )}
      </div>

      {/* STEP 8: Accounting Preview (Post-Approval) */}
      {(debitNoteStatus === 'Approved' || showAccountingPreview) && calculateTotal() > 0 && (
        <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg" style={{ color: '#0A0F14' }}>Accounting Preview - Journal Entry</h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded" style={{ backgroundColor: '#F6F9FC' }}>
              <DollarSign className="w-4 h-4" style={{ color: '#6E7A82' }} />
              <span className="text-sm" style={{ color: '#6E7A82' }}>Read-only preview</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F6F9FC' }}>
                <tr>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>Line</th>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>GL Account</th>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>Account Name</th>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>Cost Center</th>
                  <th className="px-3 py-2 text-left text-xs" style={{ color: '#6E7A82' }}>Profit Center</th>
                  <th className="px-3 py-2 text-right text-xs" style={{ color: '#6E7A82' }}>Debit</th>
                  <th className="px-3 py-2 text-right text-xs" style={{ color: '#6E7A82' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {generateJournalLines().map((line) => (
                  <tr key={line.lineNo} style={{ borderTop: '1px solid #E1E6EA' }}>
                    <td className="px-3 py-2">
                      <span className="text-sm" style={{ color: '#6E7A82' }}>{line.lineNo}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm" style={{ color: '#0A0F14' }}>{line.glAccount}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm" style={{ color: '#6E7A82' }}>{line.glAccountName}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm" style={{ color: '#6E7A82' }}>{line.costCenter}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm" style={{ color: '#6E7A82' }}>{line.profitCenter}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-sm" style={{ color: line.debit > 0 ? '#0A0F14' : '#6E7A82' }}>
                        {line.debit > 0 ? `${currency} ${line.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-sm" style={{ color: line.credit > 0 ? '#0A0F14' : '#6E7A82' }}>
                        {line.credit > 0 ? `${currency} ${line.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #E1E6EA', backgroundColor: '#F6F9FC' }}>
                  <td colSpan={5} className="px-3 py-2 text-right">
                    <span style={{ color: '#0A0F14' }}>Total</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span style={{ color: '#0A0F14' }}>
                      {currency} {calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span style={{ color: '#0A0F14' }}>
                      {currency} {calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 7: Action Buttons */}
      <div className="flex justify-between items-center">
        <div>
          {debitNoteStatus === 'Draft' && calculateTotal() > 0 && (
            <button
              onClick={() => setShowAccountingPreview(!showAccountingPreview)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm"
              style={{ border: '1px solid #E1E6EA', color: '#6E7A82', backgroundColor: 'white' }}
            >
              <TrendingUp className="w-4 h-4" />
              {showAccountingPreview ? 'Hide' : 'Preview'} Journal Entry
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 rounded-lg transition-colors"
            style={{ border: '1px solid #E1E6EA', color: '#6E7A82', backgroundColor: 'white' }}
          >
            Cancel
          </button>
          
          {debitNoteStatus === 'Draft' && (
            <>
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg transition-colors"
                style={{ border: '1px solid #00A9B7', color: '#00A9B7', backgroundColor: 'white' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8F7F8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <Save className="w-4 h-4" />
                Save as Draft
              </button>
              
              <button
                onClick={handleSubmitForApproval}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#00A9B7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
              >
                <Send className="w-4 h-4" />
                Submit for Approval
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
