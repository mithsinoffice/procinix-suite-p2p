import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Send, Trash2, Search,
  FileText, AlertCircle, Info, Calendar, Hash, Receipt, X, CheckCircle, MapPin, Building
} from 'lucide-react';
import { useMasterData } from '../contexts/MasterDataContext';
import { VendorSelector } from './shared/VendorSelector';
import { StandardInput } from './shared/StandardInput';
import { StandardSelect } from './shared/StandardInput';
import { StandardTextarea } from './shared/StandardInput';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';

interface LineItem {
  id: string;
  // Item & Accounting (read-only)
  itemId: string;
  itemCode: string;
  itemName: string;
  glCode: string;
  glName: string;
  hsnCode: string;
  itemType: 'Goods' | 'Services';
  gstRateFromMaster: number;
  
  // Commercial Inputs (editable)
  quantity: number;
  rate: number;
  
  // Auto-Calculated Amounts (read-only)
  baseAmount: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  grossAmount: number;
  tdsPayable: number;
  netPayable: number;
  
  // Allocations (mandatory)
  costCentre: string;
  profitCentre: string;
  projectWbs: string;
}

interface AccountingEntry {
  account: string;
  accountCode: string;
  debit: number;
  credit: number;
}

// Mock Cost Centres, Profit Centres, Projects
const COST_CENTRES = [
  { id: 'CC-MFG-001', name: 'Manufacturing - Mumbai' },
  { id: 'CC-MFG-002', name: 'Manufacturing - Bangalore' },
  { id: 'CC-ADM-001', name: 'Administration - HQ' },
  { id: 'CC-SAL-001', name: 'Sales & Marketing' },
  { id: 'CC-RND-001', name: 'R&D - Bangalore' },
];

const PROFIT_CENTRES = [
  { id: 'PC-INDIA-001', name: 'India Operations' },
  { id: 'PC-EXPORT-001', name: 'Export Division' },
  { id: 'PC-RETAIL-001', name: 'Retail Business' },
  { id: 'PC-CORP-001', name: 'Corporate Services' },
];

const PROJECTS = [
  { id: 'PRJ-2024-001', name: 'Factory Expansion - Phase 2' },
  { id: 'PRJ-2024-002', name: 'ERP Implementation' },
  { id: 'PRJ-2024-003', name: 'New Product Launch - Winter Collection' },
  { id: 'PRJ-GENERAL', name: 'General Operations' },
];

// Mock Bill-to Locations (from Entity Master)
const BILL_TO_LOCATIONS = [
  { id: 'LOC-BLR-001', name: 'Bangalore HQ - Koramangala', entityId: 'ENT-SUBKO-IN', address: '123 Coffee Street, Koramangala', state: 'Karnataka', gstin: '29AAACT1234A1Z1' },
  { id: 'LOC-BLR-002', name: 'Bangalore Factory - Peenya', entityId: 'ENT-SUBKO-IN', address: 'Plot 45, Peenya Industrial Area', state: 'Karnataka', gstin: '29AAACT1234A1Z2' },
  { id: 'LOC-MUM-001', name: 'Mumbai Office - Nariman Point', entityId: 'ENT-PROCINIX-IN', address: '301 Maker Chambers V', state: 'Maharashtra', gstin: '27AABCP5678E1Z9' },
];

// Invoice Classifications
const INVOICE_CLASSIFICATIONS = [
  { value: 'Domestic', label: 'Domestic' },
  { value: 'Import', label: 'Import' },
  { value: 'SEZ', label: 'SEZ' },
  { value: 'Export', label: 'Export' },
  { value: 'RCM', label: 'Reverse Charge (RCM)' },
];

// Mock existing invoices for duplicate check
const EXISTING_INVOICES = [
  { vendorId: 'VEN-SUBKO-001', entityId: 'ENT-SUBKO-IN', invoiceNumber: 'INV-2024-001', fy: '2024-25' },
  { vendorId: 'VEN-SUBKO-002', entityId: 'ENT-SUBKO-IN', invoiceNumber: 'INV-2024-002', fy: '2024-25' },
  { vendorId: 'VEN-SUBKO-005', entityId: 'ENT-PROCINIX-IN', invoiceNumber: 'SVC/2024/001', fy: '2024-25' },
  { vendorId: 'VEN-SUBKO-005', entityId: 'ENT-PROCINIX-IN', invoiceNumber: 'SVC-2024-002', fy: '2024-25' },
];

export function InvoiceFormDirect() {
  const navigate = useNavigate();
  const { getVendorById, getItemById, items, entities, costCentres, profitCentres, getEntityById, currentCompany } = useMasterData();
  
  // Entity context from global state (set in Header)
  const entityId = currentCompany;
  
  // Form state - HEADER
  const [vendorId, setVendorId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]); // Stored as YYYY-MM-DD
  const [invoiceDateDisplay, setInvoiceDateDisplay] = useState(''); // Displayed as DD-MM-YYYY
  const [invoiceDateError, setInvoiceDateError] = useState('');
  const [dueDate, setDueDate] = useState(''); // Stored as YYYY-MM-DD
  const [dueDateDisplay, setDueDateDisplay] = useState(''); // Displayed as DD-MM-YYYY
  const [dueDateError, setDueDateError] = useState('');
  const [dueDateOverridden, setDueDateOverridden] = useState(false);
  const [billToLocationId, setBillToLocationId] = useState('');
  const [invoiceClassification, setInvoiceClassification] = useState('Domestic');
  
  // E-invoice fields
  const [eInvoiceAvailable, setEInvoiceAvailable] = useState(false);
  const [irn, setIrn] = useState('');
  const [returnStatus, setReturnStatus] = useState('Unknown');
  
  // Form state - LINE ITEMS
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Form state - POST LINE ITEMS
  const [retentionApplicable, setRetentionApplicable] = useState(false);
  const [retentionType, setRetentionType] = useState<'Percentage' | 'Fixed'>('Percentage');
  const [retentionValue, setRetentionValue] = useState(0);
  const [retentionReleaseDate, setRetentionReleaseDate] = useState('');
  const [narration, setNarration] = useState('');

  // Get master data
  const vendor = vendorId ? getVendorById(vendorId) : undefined;
  const entity = getEntityById(entityId);
  const billToLocations = entities.filter((entry) => entry.isActive).map((entry) => ({
    id: entry.id,
    name: `${entry.name} - Registered Office`,
    entityId: entry.id,
    address: entry.address,
    state: entry.state,
    gstin: entry.gstin,
  }));
  const liveCostCentres = costCentres.length > 0 ? costCentres : COST_CENTRES.map((cc) => ({ id: cc.id, code: cc.id, name: cc.name } as any));
  const liveProfitCentres = profitCentres.length > 0 ? profitCentres : PROFIT_CENTRES.map((pc) => ({ id: pc.id, code: pc.id, name: pc.name } as any));
  const billToLocation = billToLocationId ? billToLocations.find(loc => loc.id === billToLocationId) : undefined;
  const paymentTerms = vendor?.paymentTerms || '';

  // Vendor state and GSTIN from primary billing address
  const vendorState = vendor?.addresses?.find(addr => addr.type === 'Billing' && addr.isPrimary)?.state || 
                       vendor?.addresses?.find(addr => addr.type === 'Billing')?.state || '';
  const vendorGstin = vendor?.gstin || '';
  const entityState = billToLocation?.state || entity?.state || '';

  // Search items
  const searchResults = searchTerm.length > 0
    ? items
        .filter(item => item.status === 'Active')
        .filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.code.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 10)
    : [];

  // Calculate GST type based on state matching
  const getGstType = (vendorState: string, entityState: string): 'CGST_SGST' | 'IGST' => {
    if (!vendorState || !entityState) return 'IGST';
    return vendorState === entityState ? 'CGST_SGST' : 'IGST';
  };

  const gstType = getGstType(vendorState, entityState);

  // Date utility functions for DD-MM-YYYY format
  const convertYYYYMMDDtoDDMMYYYY = (dateStr: string): string => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return '';
    return `${day}-${month}-${year}`;
  };

  const convertDDMMYYYYtoYYYYMMDD = (dateStr: string): string => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('-');
    if (!year || !month || !day) return '';
    // Validate date components
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return '';
    if (dayNum < 1 || dayNum > 31) return '';
    if (monthNum < 1 || monthNum > 12) return '';
    if (yearNum < 1900 || yearNum > 2100) return '';
    
    return `${year}-${month}-${day}`;
  };

  const validateDDMMYYYYFormat = (dateStr: string): boolean => {
    if (!dateStr) return false;
    
    // Check format: DD-MM-YYYY
    const datePattern = /^(\d{2})-(\d{2})-(\d{4})$/;
    if (!datePattern.test(dateStr)) return false;
    
    const [day, month, year] = dateStr.split('-').map(num => parseInt(num, 10));
    
    // Validate ranges
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;
    
    // Validate actual date (e.g., no Feb 30)
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  // Format input with auto-hyphen insertion
  const formatDateInput = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Add hyphens automatically: DD-MM-YYYY
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4, 8)}`;
    }
  };

  // Initialize display dates on component mount
  useEffect(() => {
    if (invoiceDate && !invoiceDateDisplay) {
      setInvoiceDateDisplay(convertYYYYMMDDtoDDMMYYYY(invoiceDate));
    }
  }, [invoiceDate, invoiceDateDisplay]);

  // Auto-calculate Due Date based on Invoice Date + Payment Terms
  const calculateDueDate = (invDate: string, terms: string): string => {
    if (!invDate || !terms) return '';
    
    const invoiceDateObj = new Date(invDate);
    let daysToAdd = 0;
    
    // Parse payment terms (e.g., "Net 30", "Net 45", "Immediate", "Net 60")
    const match = terms.match(/(\d+)/);
    if (match) {
      daysToAdd = parseInt(match[1], 10);
    } else if (terms.toLowerCase().includes('immediate')) {
      daysToAdd = 0;
    } else {
      daysToAdd = 30; // Default to 30 days
    }
    
    const dueDateObj = new Date(invoiceDateObj);
    dueDateObj.setDate(dueDateObj.getDate() + daysToAdd);
    
    return dueDateObj.toISOString().split('T')[0];
  };

  const autoCalculatedDueDate = calculateDueDate(invoiceDate, paymentTerms);
  const autoCalculatedDueDateDisplay = convertYYYYMMDDtoDDMMYYYY(autoCalculatedDueDate);

  // Auto-calculate Due Date when Invoice Date or Payment Terms change (unless manually overridden)
  useEffect(() => {
    if (!dueDateOverridden && autoCalculatedDueDate) {
      setDueDate(autoCalculatedDueDate);
      setDueDateDisplay(convertYYYYMMDDtoDDMMYYYY(autoCalculatedDueDate));
    }
  }, [invoiceDate, paymentTerms, dueDateOverridden, autoCalculatedDueDate]);

  // Fuzzy duplicate check helper
  const checkFuzzyDuplicate = (invoiceNum: string): string[] => {
    if (!invoiceNum || !vendorId) return [];
    
    const normalized = invoiceNum.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matches: string[] = [];
    
    EXISTING_INVOICES
      .filter(inv => inv.vendorId === vendorId && inv.entityId === entityId)
      .forEach(inv => {
        const existingNormalized = inv.invoiceNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Check if very similar (allow 1-2 char difference)
        if (existingNormalized === normalized) {
          matches.push(`Exact match found: "${inv.invoiceNumber}"`);
        } else if (Math.abs(existingNormalized.length - normalized.length) <= 2) {
          let diff = 0;
          const maxLen = Math.max(existingNormalized.length, normalized.length);
          for (let i = 0; i < maxLen; i++) {
            if (existingNormalized[i] !== normalized[i]) diff++;
          }
          if (diff <= 2) {
            matches.push(`Similar invoice exists: "${inv.invoiceNumber}"`);
          }
        }
      });
    
    return matches;
  };

  const duplicateWarnings = checkFuzzyDuplicate(invoiceNumber);
  const hasExactDuplicate = duplicateWarnings.some(w => w.includes('Exact match'));

  // Add line item from search
  const handleSelectItem = (itemId: string) => {
    const item = getItemById(itemId);
    if (!item) return;

    // Mock GL mapping - in real system, this comes from Item Master
    const glCode = item.itemType === 'Services' ? '5200' : '5100';
    const glName = item.itemType === 'Services' ? 'Service Expenses' : 'Material Expenses';

    const gstType = getGstType(vendorState, entityState);

    const newLine: LineItem = {
      id: `line-${Date.now()}`,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      glCode,
      glName,
      hsnCode: item.hsnCode,
      itemType: item.itemType,
      gstRateFromMaster: item.gstRate,
      quantity: 1,
      rate: item.standardPrice || 0,
      baseAmount: 0,
      gstPercent: item.gstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalGstAmount: 0,
      grossAmount: 0,
      tdsPayable: 0,
      netPayable: 0,
      costCentre: '',
      profitCentre: '',
      projectWbs: ''
    };

    // Calculate amounts
    const calculated = calculateLineAmounts(newLine, gstType);
    setLineItems([...lineItems, calculated]);
    setSearchTerm('');
    setShowSearchResults(false);
  };

  // Calculate all amounts for a line item
  const calculateLineAmounts = (line: LineItem, gstType: 'CGST_SGST' | 'IGST'): LineItem => {
    const baseAmount = line.quantity * line.rate;
    const gstPercent = line.gstRateFromMaster;
    
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (gstType === 'CGST_SGST') {
      cgstAmount = (baseAmount * gstPercent) / 200; // Half of GST
      sgstAmount = (baseAmount * gstPercent) / 200; // Half of GST
    } else {
      igstAmount = (baseAmount * gstPercent) / 100;
    }

    const totalGstAmount = cgstAmount + sgstAmount + igstAmount;
    const grossAmount = baseAmount + totalGstAmount;

    // TDS Calculation: ONLY if item is Service AND vendor has TDS applicable
    let tdsPayable = 0;
    if (line.itemType === 'Services' && vendor?.tdsApplicable && vendor?.tdsSection) {
      // Mock TDS rate - in real system, this comes from Vendor Master TDS section mapping
      const tdsRate = vendor.tdsSection === '194C' ? 2 : 
                      vendor.tdsSection === '194J' ? 10 : 
                      vendor.tdsSection === '194I' ? 10 : 2;
      // TDS calculated ONLY on Base Amount (exclude GST)
      tdsPayable = (baseAmount * tdsRate) / 100;
    }

    const netPayable = grossAmount - tdsPayable;

    return {
      ...line,
      baseAmount,
      gstPercent,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalGstAmount,
      grossAmount,
      tdsPayable,
      netPayable
    };
  };

  // Update line item field
  const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(line => {
      if (line.id !== id) return line;

      const updated = { ...line, [field]: value };
      const gstType = getGstType(vendorState, entityState);
      return calculateLineAmounts(updated, gstType);
    }));
  };

  // Remove line item
  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  // Calculate totals
  const totals = lineItems.reduce((acc, line) => ({
    baseAmount: acc.baseAmount + line.baseAmount,
    cgstAmount: acc.cgstAmount + line.cgstAmount,
    sgstAmount: acc.sgstAmount + line.sgstAmount,
    igstAmount: acc.igstAmount + line.igstAmount,
    totalGstAmount: acc.totalGstAmount + line.totalGstAmount,
    grossAmount: acc.grossAmount + line.grossAmount,
    tdsPayable: acc.tdsPayable + line.tdsPayable,
    netPayable: acc.netPayable + line.netPayable
  }), {
    baseAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalGstAmount: 0,
    grossAmount: 0,
    tdsPayable: 0,
    netPayable: 0
  });

  // Calculate retention amount
  const retentionAmount = retentionApplicable
    ? retentionType === 'Percentage'
      ? (totals.grossAmount * retentionValue) / 100
      : retentionValue
    : 0;

  const finalNetPayable = totals.netPayable - retentionAmount;

  // Generate Accounting JV Preview
  const generateAccountingPreview = (): AccountingEntry[] => {
    const entries: AccountingEntry[] = [];

    // 1. Expense lines (one per unique GL)
    const glGroups = lineItems.reduce((acc, line) => {
      if (!acc[line.glCode]) {
        acc[line.glCode] = { code: line.glCode, name: line.glName, amount: 0 };
      }
      acc[line.glCode].amount += line.baseAmount;
      return acc;
    }, {} as Record<string, { code: string; name: string; amount: number }>);

    Object.values(glGroups).forEach(gl => {
      entries.push({
        account: gl.name,
        accountCode: gl.code,
        debit: gl.amount,
        credit: 0
      });
    });

    // 2. GST Input lines
    if (totals.cgstAmount > 0) {
      entries.push({
        account: 'CGST Input',
        accountCode: '1702',
        debit: totals.cgstAmount,
        credit: 0
      });
    }
    if (totals.sgstAmount > 0) {
      entries.push({
        account: 'SGST Input',
        accountCode: '1703',
        debit: totals.sgstAmount,
        credit: 0
      });
    }
    if (totals.igstAmount > 0) {
      entries.push({
        account: 'IGST Input',
        accountCode: '1704',
        debit: totals.igstAmount,
        credit: 0
      });
    }

    // 3. TDS Payable (if applicable)
    if (totals.tdsPayable > 0) {
      entries.push({
        account: 'TDS Payable',
        accountCode: '2401',
        debit: 0,
        credit: totals.tdsPayable
      });
    }

    // 4. Retention Payable (if applicable)
    if (retentionAmount > 0) {
      entries.push({
        account: 'Retention Payable',
        accountCode: '2402',
        debit: 0,
        credit: retentionAmount
      });
    }

    // 5. Vendor Accounts Payable (net amount)
    entries.push({
      account: `Vendor AP - ${vendor?.name || 'Unknown'}`,
      accountCode: '2100',
      debit: 0,
      credit: finalNetPayable
    });

    return entries;
  };

  const accountingEntries = generateAccountingPreview();
  const totalDebits = accountingEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredits = accountingEntries.reduce((sum, e) => sum + e.credit, 0);

  // Validate form
  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    // Header validations
    if (!vendorId) {
      validationErrors.push('Vendor is required');
    }

    if (!invoiceNumber) {
      validationErrors.push('Invoice number is required');
    }

    if (hasExactDuplicate) {
      validationErrors.push('Exact duplicate invoice number detected - cannot submit');
    }

    if (!invoiceDate) {
      validationErrors.push('Invoice date is required');
    }

    if (invoiceDateError) {
      validationErrors.push('Invoice date format is invalid - use DD-MM-YYYY');
    }

    if (!dueDate) {
      validationErrors.push('Due date is required');
    }

    if (dueDateError) {
      validationErrors.push('Due date format is invalid - use DD-MM-YYYY');
    }

    if (!billToLocationId) {
      validationErrors.push('Bill-to Location is required');
    }

    if (!vendorState) {
      validationErrors.push('Vendor State is missing - cannot determine GST applicability');
    }

    if (!vendorGstin && invoiceClassification === 'Domestic') {
      validationErrors.push('Vendor GSTIN is missing for Domestic invoice');
    }

    // Line item validations
    if (lineItems.length === 0) {
      validationErrors.push('At least one line item is required');
    }

    lineItems.forEach((item, index) => {
      if (!item.itemId) {
        validationErrors.push(`Line ${index + 1}: Item is required`);
      }
      if (!item.glCode) {
        validationErrors.push(`Line ${index + 1}: Item lacks GL mapping`);
      }
      if (!item.costCentre) {
        validationErrors.push(`Line ${index + 1}: Cost Centre is required`);
      }
      if (!item.profitCentre) {
        validationErrors.push(`Line ${index + 1}: Profit Centre is required`);
      }
      if (!item.projectWbs) {
        validationErrors.push(`Line ${index + 1}: Project / WBS is required`);
      }
      if (item.quantity <= 0) {
        validationErrors.push(`Line ${index + 1}: Quantity must be greater than 0`);
      }
      if (item.rate <= 0) {
        validationErrors.push(`Line ${index + 1}: Rate must be greater than 0`);
      }
    });

    if (totals.netPayable === 0) {
      validationErrors.push('Total invoice amount must be greater than 0');
    }

    // Retention validations
    if (retentionApplicable) {
      if (!retentionValue || retentionValue <= 0) {
        validationErrors.push('Retention value is required when retention is applicable');
      }
      if (!retentionReleaseDate) {
        validationErrors.push('Retention release date is required when retention is applicable');
      }
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // Submit handlers
  const handleSaveDraft = () => {
    if (!vendorId || !invoiceNumber) {
      alert('Please provide at least Vendor and Invoice Number to save draft');
      return;
    }
    alert('Direct Invoice saved as draft');
    navigate('/invoices');
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    alert('Direct Invoice submitted for approval');
    navigate('/invoices');
  };

  const handleCancel = () => {
    navigate('/invoices');
  };

  // Form completeness
  const completeness = useMemo(() => {
    const fields = [vendorId, invoiceNumber, invoiceDate, billToLocationId, dueDate];
    const filled = fields.filter(Boolean).length;
    const hasLines = lineItems.length > 0 ? 1 : 0;
    return Math.round(((filled + hasLines) / (fields.length + 1)) * 100);
  }, [vendorId, invoiceNumber, invoiceDate, billToLocationId, dueDate, lineItems.length]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const handleKeyboardSave = useCallback(() => handleSaveDraft(), [vendorId, invoiceNumber]);
  useFormKeyboardSave(handleKeyboardSave);

  return (
    <FormShell
      title="Create Direct Invoice"
      subtitle="Invoice without PO reference • Auto GST & TDS computation • Compliance checks"
      variant="transaction"
      onBack={handleCancel}
      onSaveDraft={handleSaveDraft}
      onSubmit={handleSubmit}
      submitLabel="Submit for Approval"
      draftLabel="Save Draft"
      saveStatus={saveStatus}
      completeness={completeness}
    >

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="mx-8 mt-6 bg-white rounded-lg p-6" style={{ border: '2px solid var(--color-error-light)' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: '#EF4444' }} />
            <div className="flex-1">
              <p className="font-semibold mb-2" style={{ color: '#EF4444' }}>
                Please fix the following errors:
              </p>
              <ul className="space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm" style={{ color: '#EF4444' }}>
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Fuzzy Duplicate Warnings */}
      {duplicateWarnings.length > 0 && !hasExactDuplicate && (
        <div className="mx-8 mt-6 bg-white rounded-lg p-6" style={{ border: '2px solid #FEF3C7' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: '#F59E0B' }} />
            <div className="flex-1">
              <p className="font-semibold mb-2" style={{ color: '#F59E0B' }}>
                Possible duplicate invoice warning:
              </p>
              <ul className="space-y-1">
                {duplicateWarnings.map((warning, index) => (
                  <li key={index} className="text-sm" style={{ color: '#92400E' }}>
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

        {/* Entity Context Display - READ-ONLY */}
        {entity && (
          <div className="bg-white rounded-lg p-4 mb-4" style={{ border: '2px solid var(--color-teal-tint)', backgroundColor: 'var(--color-teal-tint)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                <div>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Creating invoice for Entity</p>
                  <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                    {entity.name} ({entity.legalName})
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>Entity Code: {entity.code}</p>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>GSTIN: {entity.gstin}</p>
              </div>
            </div>
          </div>
        )}

        {/* No Entity Warning */}
        {!entityId && (
          <div className="bg-white rounded-lg p-6 mb-4" style={{ border: '2px solid var(--color-error-light)' }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: '#EF4444' }} />
              <div className="flex-1">
                <p className="font-semibold mb-1" style={{ color: '#EF4444' }}>
                  Entity not selected
                </p>
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Please select an Entity from the top bar before creating an invoice. Entity context is required for tax determination and accounting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Header */}
        <FormSection title="Invoice Header" columns={2}>
            {/* Row 1: Vendor Name & Invoice Number */}
            <div>
              <VendorSelector
                value={vendorId}
                onChange={(vendorId) => {
                  setVendorId(vendorId);
                  // Reset due date override when vendor changes
                  setDueDateOverridden(false);
                }}
                label="Vendor Name"
                placeholder="Select vendor"
                required={true}
                requireCompleteBillingAddress={true}
              />
              {vendor && (
                <div className="mt-2 p-3 rounded" style={{ backgroundColor: 'var(--color-cloud)' }}>
                  <div className="grid grid-cols-2 gap-3 text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    <div>
                      <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>State:</span> {vendorState || 'N/A'}
                    </div>
                    <div>
                      <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>TDS:</span> {vendor.tdsApplicable ? `Yes (${vendor.tdsSection})` : 'No'}
                    </div>
                    <div>
                      <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>MSME:</span> {vendor.msmeRegistered ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>GSTIN:</span> {vendorGstin || 'Unregistered'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <StandardInput
              label="Invoice Number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Enter invoice number"
              required={true}
              icon={<Hash className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />}
            />

            {/* Row 2: Invoice Date & Due Date */}
            <div>
              <StandardInput
                label="Invoice Date"
                type="text"
                value={invoiceDateDisplay}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setInvoiceDateDisplay(formatted);
                  
                  // Validate and convert to YYYY-MM-DD for internal storage
                  if (validateDDMMYYYYFormat(formatted)) {
                    const yyyymmdd = convertDDMMYYYYtoYYYYMMDD(formatted);
                    setInvoiceDate(yyyymmdd);
                    setInvoiceDateError('');
                    // Reset due date override when invoice date changes
                    setDueDateOverridden(false);
                  } else if (formatted.length === 10) {
                    setInvoiceDateError('Enter date in DD-MM-YYYY format');
                  }
                }}
                placeholder="DD-MM-YYYY"
                required={true}
                icon={<Calendar className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />}
                error={!!invoiceDateError}
                maxLength={10}
              />
              {invoiceDateError && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                  {invoiceDateError}
                </p>
              )}
            </div>

            <div>
              <StandardInput
                label="Due Date"
                type="text"
                value={dueDateDisplay}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setDueDateDisplay(formatted);
                  
                  // Validate and convert to YYYY-MM-DD for internal storage
                  if (validateDDMMYYYYFormat(formatted)) {
                    const yyyymmdd = convertDDMMYYYYtoYYYYMMDD(formatted);
                    setDueDate(yyyymmdd);
                    setDueDateError('');
                    setDueDateOverridden(true);
                  } else if (formatted.length === 10) {
                    setDueDateError('Enter date in DD-MM-YYYY format');
                  }
                }}
                placeholder="DD-MM-YYYY"
                required={true}
                icon={<Calendar className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />}
                error={!!dueDateError}
                maxLength={10}
              />
              {dueDateError && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                  {dueDateError}
                </p>
              )}
              {!dueDateError && dueDateOverridden && autoCalculatedDueDateDisplay && (
                <p className="text-xs mt-1" style={{ color: '#F59E0B' }}>
                  ⚠️ Due date manually modified (auto-calculated: {autoCalculatedDueDateDisplay})
                </p>
              )}
              {!dueDateError && !dueDateOverridden && paymentTerms && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  Auto-calculated from Payment Terms ({paymentTerms})
                </p>
              )}
            </div>

            {/* Row 3: Vendor GSTIN & Bill-to Location */}
            <StandardInput
              label="Vendor GSTIN"
              value={vendorGstin || 'Unregistered'}
              onChange={() => {}}
              disabled={true}
              icon={<FileText className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />}
            />

            <div>
              <StandardSelect
                label="Bill-to Location"
                value={billToLocationId}
                onChange={(e) => setBillToLocationId(e.target.value)}
                options={[
                  { value: '', label: 'Select bill-to location' },
                  ...billToLocations.filter(loc => loc.entityId === entityId).map(loc => ({
                    value: loc.id,
                    label: `${loc.name} - ${loc.state}`
                  }))
                ]}
                required={true}
                error={!billToLocationId && errors.length > 0}
                icon={<Building className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />}
              />
              {!billToLocationId && errors.length > 0 && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                  Bill-to Location is required to determine GST applicability
                </p>
              )}
            </div>

            {/* Row 4: Invoice Type & Payment Terms */}
            <StandardSelect
              label="Invoice Type"
              value={invoiceClassification}
              onChange={(e) => setInvoiceClassification(e.target.value)}
              options={INVOICE_CLASSIFICATIONS}
              required={true}
              icon={<FileText className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />}
            />

            <StandardInput
              label="Payment Terms"
              value={paymentTerms}
              onChange={() => {}}
              disabled={true}
              placeholder="Select vendor to populate"
              icon={<Receipt className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />}
            />

          {/* Row 5 (Full Width): GST Applicability Panel */}
          {billToLocationId && vendorId && (
            <div className="mt-6 p-4 rounded-lg" style={{ 
              backgroundColor: vendorState && entityState ? 'var(--color-teal-tint)' : '#FEF3C7', 
              border: vendorState && entityState ? '1px solid var(--color-teal)' : '1px solid #F59E0B'
            }}>
              <div className="flex items-start gap-2">
                {vendorState && entityState ? (
                  <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-teal)' }} />
                ) : (
                  <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: '#F59E0B' }} />
                )}
                <div className="flex-1">
                  <p className="font-semibold mb-1" style={{ color: vendorState && entityState ? 'var(--color-teal)' : '#F59E0B' }}>
                    {vendorState && entityState 
                      ? `GST Applicability: ${gstType === 'CGST_SGST' ? 'CGST + SGST (Intra-state)' : 'IGST (Inter-state)'}`
                      : 'GST Applicability: Cannot determine - Missing vendor/entity state'
                    }
                  </p>
                  <p className="text-sm" style={{ color: vendorState && entityState ? 'var(--color-teal-dark)' : '#92400E' }}>
                    {vendorState && entityState ? (
                      <>
                        Entity State: {entityState} | Vendor State: {vendorState}
                        {gstType === 'CGST_SGST' && ' → Same state → CGST + SGST applicable'}
                        {gstType === 'IGST' && ' → Different states → IGST applicable'}
                      </>
                    ) : (
                      'Please ensure vendor has billing address with state information and bill-to location is selected.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* E-Invoice / Return Verification Section */}
          <div className="mt-6 pt-6 border-t-2" style={{ borderColor: 'var(--color-silver)' }}>
            <h3 className="text-base mb-4" style={{ color: 'var(--color-ink)' }}>E-Invoice / Return Verification</h3>
            
            <div className="grid grid-cols-2 gap-6">
              {/* E-Invoice Available Toggle */}
              <div className="col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eInvoiceAvailable}
                    onChange={(e) => setEInvoiceAvailable(e.target.checked)}
                    className="w-5 h-5 rounded"
                    style={{ accentColor: 'var(--color-teal)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                    E-Invoice Available?
                  </span>
                </label>
              </div>

              {eInvoiceAvailable && (
                <>
                  {/* IRN */}
                  <StandardInput
                    label="IRN (Invoice Reference Number)"
                    value={irn}
                    onChange={(e) => setIrn(e.target.value)}
                    placeholder="Enter IRN if available"
                    icon={<Hash className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />}
                  />

                  {/* Return Status */}
                  <StandardSelect
                    label="Return Status"
                    value={returnStatus}
                    onChange={(e) => setReturnStatus(e.target.value)}
                    options={[
                      { value: 'Unknown', label: 'Unknown' },
                      { value: 'Filed', label: 'Filed' },
                      { value: 'Not Filed', label: 'Not Filed' }
                    ]}
                    icon={<FileText className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />}
                  />

                  <div className="col-span-2 p-3 rounded" style={{ backgroundColor: 'var(--color-cloud)' }}>
                    <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                      <Info className="w-3 h-3 inline mr-1" />
                      Note: E-invoice verification status may require external integration with GST portal.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </FormSection>

        {/* Line Items Section */}
        <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg" style={{ color: 'var(--color-ink)' }}>Line Items</h2>
          </div>

          {/* Search Bar - SEARCH-FIRST ENTRY */}
          <div className="mb-6 relative">
            <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Search item or service
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Type item name or code..."
                className="w-full pl-10 pr-4 py-3 rounded-lg"
                style={{ border: '2px solid var(--color-silver)', color: 'var(--color-ink)' }}
              />
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowSearchResults(false)}
                />
                <div 
                  className="absolute z-20 w-full mt-2 bg-white rounded-lg shadow-xl max-h-80 overflow-y-auto"
                  style={{ border: '2px solid var(--color-silver)' }}
                >
                  {searchResults.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectItem(item.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b transition-colors"
                      style={{ borderColor: 'var(--color-silver)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                            {item.code} - {item.name}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                            {item.itemType} | HSN: {item.hsnCode} | GST: {item.gstRate}%
                          </p>
                        </div>
                        <span 
                          className="px-2 py-1 rounded text-xs"
                          style={{ 
                            backgroundColor: item.itemType === 'Services' ? '#FEF3C7' : '#DBEAFE',
                            color: item.itemType === 'Services' ? '#92400E' : '#1E40AF'
                          }}
                        >
                          {item.itemType}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Line Items Grid */}
          {lineItems.length === 0 ? (
            <div className="text-center py-12" style={{ backgroundColor: 'var(--color-cloud)', borderRadius: '8px' }}>
              <Search className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-slate)' }} />
              <p style={{ color: 'var(--color-mercury-grey)' }}>No line items added yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-slate)' }}>
                Use the search bar above to add items
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                  <tr>
                    <th className="text-left px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Item Name</th>
                    <th className="text-left px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Item Code</th>
                    <th className="text-left px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>GL Name</th>
                    <th className="text-left px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>GL Code</th>
                    <th className="text-right px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Qty</th>
                    <th className="text-right px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Rate</th>
                    <th className="text-right px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Base Amt</th>
                    <th className="text-right px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>GST %</th>
                    <th className="text-right px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>CGST</th>
                    <th className="text-right px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>SGST</th>
                    <th className="text-right px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>IGST</th>
                    <th className="text-right px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Total GST</th>
                    <th className="text-right px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Gross Amt</th>
                    <th className="text-right px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>TDS</th>
                    <th className="text-right px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Net Payable</th>
                    <th className="text-left px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Cost Centre</th>
                    <th className="text-left px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Profit Centre</th>
                    <th className="text-left px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Project/WBS</th>
                    <th className="text-center px-3 py-3 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((line, index) => (
                    <tr key={line.id} className="border-t" style={{ borderColor: 'var(--color-silver)' }}>
                      <td className="px-3 py-3" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{line.itemName}</td>
                      <td className="px-3 py-3" style={{ color: 'var(--color-mercury-grey)' }}>{line.itemCode}</td>
                      <td className="px-3 py-3" style={{ color: 'var(--color-ink)' }}>{line.glName}</td>
                      <td className="px-3 py-3" style={{ color: 'var(--color-mercury-grey)' }}>{line.glCode}</td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={line.quantity || ''}
                          onChange={(e) => handleLineItemChange(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 rounded text-right"
                          style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={line.rate || ''}
                          onChange={(e) => handleLineItemChange(line.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 rounded text-right"
                          style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ color: 'var(--color-ink)' }}>₹{line.baseAmount.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right" style={{ color: 'var(--color-mercury-grey)' }}>{line.gstPercent}%</td>
                      <td className="px-3 py-3 text-right" style={{ color: 'var(--color-ink)' }}>{line.cgstAmount > 0 ? `₹${line.cgstAmount.toFixed(2)}` : '-'}</td>
                      <td className="px-3 py-3 text-right" style={{ color: 'var(--color-ink)' }}>{line.sgstAmount > 0 ? `₹${line.sgstAmount.toFixed(2)}` : '-'}</td>
                      <td className="px-3 py-3 text-right" style={{ color: 'var(--color-ink)' }}>{line.igstAmount > 0 ? `₹${line.igstAmount.toFixed(2)}` : '-'}</td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ color: 'var(--color-teal)' }}>₹{line.totalGstAmount.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ color: 'var(--color-ink)' }}>₹{line.grossAmount.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right" style={{ color: line.tdsPayable > 0 ? '#EF4444' : 'var(--color-mercury-grey)' }}>{line.tdsPayable > 0 ? `₹${line.tdsPayable.toFixed(2)}` : '-'}</td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ color: '#10B981' }}>₹{line.netPayable.toFixed(2)}</td>
                      <td className="px-3 py-3">
                        <select
                          value={line.costCentre}
                          onChange={(e) => handleLineItemChange(line.id, 'costCentre', e.target.value)}
                          className="w-full px-2 py-1 rounded text-sm"
                          style={{ border: !line.costCentre ? '2px solid #EF4444' : '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                        >
                          <option value="">Select...</option>
                          {liveCostCentres.map(cc => (<option key={cc.id} value={cc.id}>{cc.name}</option>))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={line.profitCentre}
                          onChange={(e) => handleLineItemChange(line.id, 'profitCentre', e.target.value)}
                          className="w-full px-2 py-1 rounded text-sm"
                          style={{ border: !line.profitCentre ? '2px solid #EF4444' : '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                        >
                          <option value="">Select...</option>
                          {liveProfitCentres.map(pc => (<option key={pc.id} value={pc.id}>{pc.name}</option>))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={line.projectWbs}
                          onChange={(e) => handleLineItemChange(line.id, 'projectWbs', e.target.value)}
                          className="w-full px-2 py-1 rounded text-sm"
                          style={{ border: !line.projectWbs ? '2px solid #EF4444' : '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                        >
                          <option value="">Select...</option>
                          {PROJECTS.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => handleRemoveLineItem(line.id)} className="p-1 rounded transition-colors" style={{ color: '#EF4444' }} title="Remove line">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals Summary */}
          {lineItems.length > 0 && (
            <div className="mt-6 pt-6 border-t-2" style={{ borderColor: 'var(--color-silver)' }}>
              <div className="grid grid-cols-4 gap-6">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Base Amount</p>
                  <p className="text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>₹{totals.baseAmount.toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-teal-tint)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Total GST {gstType === 'CGST_SGST' ? '(CGST+SGST)' : '(IGST)'}</p>
                  <p className="text-xl font-semibold" style={{ color: 'var(--color-teal)' }}>₹{totals.totalGstAmount.toFixed(2)}</p>
                  {gstType === 'CGST_SGST' && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>CGST: ₹{totals.cgstAmount.toFixed(2)} | SGST: ₹{totals.sgstAmount.toFixed(2)}</p>
                  )}
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Total TDS Payable</p>
                  <p className="text-xl font-semibold" style={{ color: '#EF4444' }}>₹{totals.tdsPayable.toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#DCFCE7', border: '2px solid #10B981' }}>
                  <p className="text-xs mb-1" style={{ color: '#15803D', fontWeight: '600' }}>NET PAYABLE (Before Retention)</p>
                  <p className="text-2xl font-semibold" style={{ color: '#10B981' }}>₹{totals.netPayable.toFixed(2)}</p>
                  <p className="text-xs mt-1" style={{ color: '#15803D' }}>Gross: ₹{totals.grossAmount.toFixed(2)} − TDS: ₹{totals.tdsPayable.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Retention Section */}
        <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
          <h2 className="text-lg mb-6" style={{ color: 'var(--color-ink)' }}>Retention Details</h2>

          <div className="grid grid-cols-2 gap-6">
            {/* Retention Applicable Toggle */}
            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retentionApplicable}
                  onChange={(e) => setRetentionApplicable(e.target.checked)}
                  className="w-5 h-5 rounded"
                  style={{ accentColor: 'var(--color-teal)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                  Retention Applicable?
                </span>
              </label>
            </div>

            {retentionApplicable && (
              <>
                {/* Retention Type */}
                <StandardSelect
                  label="Retention Type"
                  value={retentionType}
                  onChange={(e) => setRetentionType(e.target.value as 'Percentage' | 'Fixed')}
                  options={[
                    { value: 'Percentage', label: 'Percentage' },
                    { value: 'Fixed', label: 'Fixed Amount' }
                  ]}
                  required={true}
                />

                {/* Retention Value */}
                <StandardInput
                  label={retentionType === 'Percentage' ? 'Retention Percentage (%)' : 'Retention Amount (₹)'}
                  type="number"
                  value={retentionValue.toString()}
                  onChange={(e) => setRetentionValue(parseFloat(e.target.value) || 0)}
                  placeholder={retentionType === 'Percentage' ? 'Enter percentage' : 'Enter amount'}
                  required={true}
                  icon={<Hash className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />}
                />

                {/* Retention Amount - READ-ONLY */}
                <StandardInput
                  label="Retention Amount (Calculated)"
                  value={`₹${retentionAmount.toFixed(2)}`}
                  onChange={() => {}}
                  disabled={true}
                />

                {/* Expected Release Date */}
                <StandardInput
                  label="Expected Retention Release Date"
                  type="date"
                  value={retentionReleaseDate}
                  onChange={(e) => setRetentionReleaseDate(e.target.value)}
                  required={true}
                  icon={<Calendar className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />}
                />

                {/* Retention Summary */}
                <div className="col-span-2 p-4 rounded-lg" style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#92400E' }}>Retention Holdback: ₹{retentionAmount.toFixed(2)}</p>
                      <p className="text-xs mt-1" style={{ color: '#92400E' }}>This amount will be held and released on {retentionReleaseDate || 'specified date'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: '#92400E' }}>Final Net Payable</p>
                      <p className="text-xl font-semibold" style={{ color: '#92400E' }}>₹{finalNetPayable.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Narration Section */}
        <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
          <h2 className="text-lg mb-6" style={{ color: 'var(--color-ink)' }}>Narration</h2>
          
          <StandardTextarea
            label="Invoice Narration / Remarks"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Enter any additional context, notes, or audit remarks for this invoice..."
            rows={4}
          />
          <p className="text-xs mt-2" style={{ color: 'var(--color-mercury-grey)' }}>
            Optional but recommended for audit trail and context documentation
          </p>
        </div>

        {/* Accounting JV Preview */}
        {lineItems.length > 0 && (
          <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              <h2 className="text-lg" style={{ color: 'var(--color-ink)' }}>Preview Accounting Entry (Read-Only)</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
                  <tr>
                    <th className="text-left px-4 py-3" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Account Code</th>
                    <th className="text-left px-4 py-3" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Account Name</th>
                    <th className="text-right px-4 py-3" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Debit (₹)</th>
                    <th className="text-right px-4 py-3" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}>Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {accountingEntries.map((entry, index) => (
                    <tr key={index} className="border-t" style={{ borderColor: 'var(--color-silver)' }}>
                      <td className="px-4 py-3" style={{ color: 'var(--color-mercury-grey)' }}>{entry.accountCode}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-ink)' }}>{entry.account}</td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: entry.debit > 0 ? 'var(--color-ink)' : 'var(--color-slate)' }}>
                        {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: entry.credit > 0 ? 'var(--color-ink)' : 'var(--color-slate)' }}>
                        {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2" style={{ borderColor: 'var(--color-silver)', backgroundColor: 'var(--color-cloud)' }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-ink)' }} colSpan={2}>TOTALS</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--color-ink)' }}>{totalDebits.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--color-ink)' }}>{totalCredits.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Balance Check */}
            <div className="mt-4 p-4 rounded-lg flex items-center gap-3" style={{ 
              backgroundColor: Math.abs(totalDebits - totalCredits) < 0.01 ? '#DCFCE7' : 'var(--color-error-light)',
              border: Math.abs(totalDebits - totalCredits) < 0.01 ? '1px solid #10B981' : '1px solid #EF4444'
            }}>
              {Math.abs(totalDebits - totalCredits) < 0.01 ? (
                <>
                  <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                  <p className="text-sm font-semibold" style={{ color: '#15803D' }}>
                    Balanced Entry: Debits = Credits (₹{totalDebits.toFixed(2)})
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5" style={{ color: '#EF4444' }} />
                  <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>
                    Unbalanced Entry: Difference = ₹{Math.abs(totalDebits - totalCredits).toFixed(2)}
                  </p>
                </>
              )}
            </div>

            <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'var(--color-cloud)' }}>
              <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                <Info className="w-3 h-3 inline mr-1" />
                This is a preview only. Actual accounting entry will be posted upon approval and posting workflow.
              </p>
            </div>
          </div>
        )}

        {/* Computation Rules Info */}
        <div className="bg-white rounded-lg p-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            <h2 className="text-lg" style={{ color: 'var(--color-ink)' }}>Automatic Computation Rules</h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded" style={{ backgroundColor: 'var(--color-cloud)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>GST Calculation</p>
              <ul className="text-xs space-y-1" style={{ color: 'var(--color-mercury-grey)' }}>
                <li>• GST % from Item Master</li>
                <li>• Same state → CGST + SGST</li>
                <li>• Different state → IGST</li>
                <li>• No manual override allowed</li>
              </ul>
            </div>

            <div className="p-4 rounded" style={{ backgroundColor: '#FEF3C7' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#92400E' }}>TDS Calculation</p>
              <ul className="text-xs space-y-1" style={{ color: '#92400E' }}>
                <li>• Applied ONLY for Services</li>
                <li>• Requires Vendor TDS mapping</li>
                <li>• Calculated on Base Amount only</li>
                <li>• Rate from Vendor Master</li>
              </ul>
            </div>

            <div className="p-4 rounded" style={{ backgroundColor: '#DCFCE7' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#15803D' }}>Net Payable</p>
              <ul className="text-xs space-y-1" style={{ color: '#15803D' }}>
                <li>• Gross Amount − TDS − Retention</li>
                <li>• This is the payment amount</li>
                <li>• Used in cash flow forecasting</li>
                <li>• ERP posting basis</li>
              </ul>
            </div>
          </div>
        </div>
    </FormShell>
  );
}
