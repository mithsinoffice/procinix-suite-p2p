import { AIInsight, AIAction } from '../components/AIInsightsPanel';

interface InvoiceData {
  vendorCode: string;
  vendorName: string;
  vendorGSTIN: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  currency: string;
  poNumber?: string;
  lineItems: any[];
  selectedGRNs?: string[];
}

interface VendorData {
  code: string;
  name: string;
  gstin: string;
  isMSME: boolean;
  msmeRegNumber?: string;
  category: string;
  bankAccountChanged?: boolean;
  bankAccountChangeDate?: string;
  averageInvoiceAmount?: number;
  paymentTerms?: string;
  currency: string;
}

interface HistoricalInvoice {
  invoiceNumber: string;
  vendorCode: string;
  invoiceDate: string;
  amount: number;
  poNumber?: string;
}

/**
 * Generate AI insights for invoice creation
 */
export function generateAIInsights(
  invoiceData: InvoiceData,
  vendorData: VendorData | null,
  historicalInvoices: HistoricalInvoice[],
  poData?: any,
  grnData?: any[]
): AIInsight[] {
  const insights: AIInsight[] = [];

  // 1. Duplicate Invoice Detection (Exact Match)
  if (invoiceData.invoiceNumber && invoiceData.vendorCode) {
    const exactDuplicate = historicalInvoices.find(
      (inv) =>
        inv.invoiceNumber === invoiceData.invoiceNumber && inv.vendorCode === invoiceData.vendorCode
    );

    if (exactDuplicate) {
      insights.push({
        id: 'duplicate-exact',
        severity: 'blocker',
        category: 'duplicate',
        title: 'Duplicate Invoice Detected',
        explanation: `This invoice number (${invoiceData.invoiceNumber}) has already been entered for this vendor on ${exactDuplicate.invoiceDate}.`,
        confidence: 98,
        recommendedActions: [
          {
            label: 'View Existing Invoice',
            action: 'view-duplicate',
            type: 'primary',
          },
          {
            label: 'Change Invoice Number',
            action: 'change-invoice-number',
            type: 'secondary',
          },
        ],
        evidence: [
          `Invoice Number: ${exactDuplicate.invoiceNumber}`,
          `Vendor: ${invoiceData.vendorName}`,
          `Previously Entered: ${exactDuplicate.invoiceDate}`,
          `Amount: ${exactDuplicate.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`,
        ],
        relatedData: exactDuplicate,
      });
    }
  }

  // 2. Similar Invoice Detection (Fuzzy Match)
  if (invoiceData.invoiceAmount > 0 && invoiceData.invoiceDate && invoiceData.vendorCode) {
    const similarInvoices = historicalInvoices.filter((inv) => {
      if (inv.vendorCode !== invoiceData.vendorCode) return false;

      // Check if amount is within 5% tolerance
      const amountDiff = Math.abs(inv.amount - invoiceData.invoiceAmount);
      const amountTolerance = invoiceData.invoiceAmount * 0.05;

      // Check if dates are within 7 days
      const invDate = new Date(invoiceData.invoiceDate);
      const histDate = new Date(inv.invoiceDate);
      const daysDiff = Math.abs((invDate.getTime() - histDate.getTime()) / (1000 * 60 * 60 * 24));

      return amountDiff <= amountTolerance && daysDiff <= 7;
    });

    if (similarInvoices.length > 0 && !insights.find((i) => i.id === 'duplicate-exact')) {
      insights.push({
        id: 'duplicate-fuzzy',
        severity: 'warning',
        category: 'duplicate',
        title: 'Similar Invoice Found',
        explanation: `Found ${similarInvoices.length} invoice(s) with similar amount and date for this vendor. Please verify this is not a duplicate.`,
        confidence: 72,
        recommendedActions: [
          {
            label: 'Compare Invoices',
            action: 'compare-similar',
            type: 'primary',
          },
          {
            label: 'Proceed Anyway',
            action: 'proceed',
            type: 'secondary',
          },
        ],
        evidence: similarInvoices
          .slice(0, 3)
          .map(
            (inv) =>
              `${inv.invoiceNumber} - ${inv.invoiceDate} - ${inv.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`
          ),
        relatedData: similarInvoices,
      });
    }
  }

  // 3. MSME Vendor Detection
  if (vendorData && vendorData.isMSME) {
    insights.push({
      id: 'msme-compliance',
      severity: 'info',
      category: 'msme',
      title: 'MSME Vendor - Compliance Reminder',
      explanation: `This is an MSME registered vendor (${vendorData.msmeRegNumber}). Payment must be made within 45 days as per MSME Act to avoid penalty interest.`,
      confidence: 100,
      recommendedActions: [
        {
          label: 'Set Payment Priority',
          action: 'set-msme-priority',
          type: 'primary',
        },
        {
          label: 'View MSME Certificate',
          action: 'view-msme-cert',
          type: 'secondary',
        },
      ],
      evidence: [
        `MSME Registration: ${vendorData.msmeRegNumber}`,
        'Payment Due: Within 45 days from invoice date',
        'Penalty: Compound interest @ 3x bank rate if delayed',
        'Compliance: MSME Development Act, 2006',
      ],
    });
  }

  // 4. PO/GRN Mismatch Detection
  if (poData && grnData && invoiceData.lineItems.length > 0) {
    const mismatches: string[] = [];
    let maxVariance = 0;

    invoiceData.lineItems.forEach((lineItem) => {
      // Check quantity variance
      if (lineItem.qty > lineItem.grnQty) {
        const variance = ((lineItem.qty - lineItem.grnQty) / lineItem.grnQty) * 100;
        mismatches.push(
          `${lineItem.itemName}: Invoice qty (${lineItem.qty}) exceeds GRN qty (${lineItem.grnQty}) by ${variance.toFixed(1)}%`
        );
        maxVariance = Math.max(maxVariance, variance);
      }

      // Check rate variance
      if (lineItem.unitPrice !== lineItem.poRate) {
        const variance = ((lineItem.unitPrice - lineItem.poRate) / lineItem.poRate) * 100;
        mismatches.push(
          `${lineItem.itemName}: Rate variance of ${variance.toFixed(1)}% (PO: ₹${lineItem.poRate}, Invoice: ₹${lineItem.unitPrice})`
        );
        maxVariance = Math.max(maxVariance, Math.abs(variance));
      }
    });

    if (mismatches.length > 0) {
      insights.push({
        id: 'po-grn-mismatch',
        severity: maxVariance > 5 ? 'blocker' : 'warning',
        category: 'mismatch',
        title: 'PO/GRN Mismatch Detected',
        explanation: `Found ${mismatches.length} discrepancy(ies) between PO/GRN and invoice data. Maximum variance: ${maxVariance.toFixed(1)}%.`,
        confidence: 95,
        recommendedActions: [
          {
            label: 'View Variance Details',
            action: 'view-variance',
            type: 'primary',
          },
          {
            label: 'Request Exception',
            action: 'request-exception',
            type: 'secondary',
          },
        ],
        evidence: mismatches.slice(0, 5),
      });
    }
  }

  // 5. GSTIN Validation
  if (invoiceData.vendorGSTIN && vendorData) {
    const isValidFormat = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
      invoiceData.vendorGSTIN
    );

    if (!isValidFormat) {
      insights.push({
        id: 'gstin-invalid-format',
        severity: 'blocker',
        category: 'compliance',
        title: 'Invalid GSTIN Format',
        explanation:
          'The GSTIN provided does not match the standard 15-character format required by GST regulations.',
        confidence: 100,
        recommendedActions: [
          {
            label: 'Verify GSTIN',
            action: 'verify-gstin',
            type: 'primary',
          },
          {
            label: 'Update Vendor Master',
            action: 'update-vendor-gstin',
            type: 'secondary',
          },
        ],
        evidence: [
          `Entered GSTIN: ${invoiceData.vendorGSTIN}`,
          'Expected Format: 00AAAAA0000A0Z0',
          'Length: 15 characters',
          'Pattern: 2-digit state code + 10-digit PAN + check digits',
        ],
      });
    } else if (invoiceData.vendorGSTIN !== vendorData.gstin) {
      insights.push({
        id: 'gstin-mismatch',
        severity: 'warning',
        category: 'compliance',
        title: 'GSTIN Mismatch with Vendor Master',
        explanation:
          'The GSTIN on this invoice differs from the GSTIN registered in the vendor master.',
        confidence: 88,
        recommendedActions: [
          {
            label: 'Use Vendor Master GSTIN',
            action: 'use-master-gstin',
            type: 'primary',
          },
          {
            label: 'Update Vendor Master',
            action: 'update-vendor-gstin',
            type: 'secondary',
          },
        ],
        evidence: [
          `Invoice GSTIN: ${invoiceData.vendorGSTIN}`,
          `Vendor Master GSTIN: ${vendorData.gstin}`,
          'Possible Cause: Multiple GSTINs for different branches',
        ],
      });
    }
  }

  // 6. Bank Details Changed Recently
  if (vendorData && vendorData.bankAccountChanged) {
    const changeDate = new Date(vendorData.bankAccountChangeDate || '');
    const daysSinceChange = Math.floor(
      (new Date().getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceChange <= 30) {
      insights.push({
        id: 'bank-details-changed',
        severity: 'warning',
        category: 'fraud',
        title: 'Bank Account Recently Changed',
        explanation: `Vendor's bank account was changed ${daysSinceChange} days ago. Verify the change request was legitimate before processing payment.`,
        confidence: 85,
        recommendedActions: [
          {
            label: 'Verify with Vendor',
            action: 'verify-bank-change',
            type: 'primary',
          },
          {
            label: 'View Change History',
            action: 'view-bank-history',
            type: 'secondary',
          },
          {
            label: 'Request Approval',
            action: 'request-approval',
            type: 'secondary',
          },
        ],
        evidence: [
          `Changed On: ${vendorData.bankAccountChangeDate}`,
          `Days Since Change: ${daysSinceChange}`,
          'Risk: Potential fraud or account hijacking',
          'Action: Verify through official vendor contact',
        ],
      });
    }
  }

  // 7. Unusual Invoice Amount
  if (vendorData && vendorData.averageInvoiceAmount && invoiceData.invoiceAmount > 0) {
    const variance =
      ((invoiceData.invoiceAmount - vendorData.averageInvoiceAmount) /
        vendorData.averageInvoiceAmount) *
      100;

    if (Math.abs(variance) > 200) {
      // 200% deviation
      insights.push({
        id: 'unusual-amount',
        severity: 'warning',
        category: 'fraud',
        title: 'Unusual Invoice Amount Detected',
        explanation: `This invoice amount is ${Math.abs(variance).toFixed(0)}% ${variance > 0 ? 'higher' : 'lower'} than the vendor's average invoice amount.`,
        confidence: 78,
        recommendedActions: [
          {
            label: 'Review Invoice Details',
            action: 'review-details',
            type: 'primary',
          },
          {
            label: 'Compare with History',
            action: 'compare-history',
            type: 'secondary',
          },
        ],
        evidence: [
          `Current Invoice: ${invoiceData.invoiceAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`,
          `Average Invoice: ${vendorData.averageInvoiceAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`,
          `Variance: ${variance > 0 ? '+' : ''}${variance.toFixed(1)}%`,
        ],
      });
    }
  }

  // 8. Missing Mandatory Documents
  const missingDocs: string[] = [];

  if (!invoiceData.poNumber) {
    missingDocs.push('Purchase Order reference');
  }

  if (invoiceData.invoiceAmount > 50000 && !vendorData?.gstin) {
    missingDocs.push('GST Invoice copy (required for amounts > ₹50,000)');
  }

  if (missingDocs.length > 0) {
    insights.push({
      id: 'missing-documents',
      severity: 'warning',
      category: 'compliance',
      title: 'Missing Mandatory Documents',
      explanation: `${missingDocs.length} required document(s) missing. Complete documentation is needed for compliance and audit trail.`,
      confidence: 100,
      recommendedActions: [
        {
          label: 'Upload Documents',
          action: 'upload-documents',
          type: 'primary',
        },
        {
          label: 'Request from Vendor',
          action: 'request-documents',
          type: 'secondary',
        },
      ],
      evidence: missingDocs,
    });
  }

  // 9. TDS Section Suggestion
  if (invoiceData.lineItems.length > 0 && vendorData) {
    const suggestedTDS = suggestTDSSection(vendorData.category, invoiceData);

    if (suggestedTDS.section) {
      const currentTDS = invoiceData.lineItems[0]?.tdsSection;

      if (!currentTDS || currentTDS !== suggestedTDS.section) {
        insights.push({
          id: 'tds-suggestion',
          severity: 'info',
          category: 'optimization',
          title: 'TDS Section Recommendation',
          explanation: suggestedTDS.rationale,
          confidence: 92,
          recommendedActions: [
            {
              label: `Apply ${suggestedTDS.section}`,
              action: 'apply-tds',
              type: 'primary',
            },
            {
              label: 'Keep Current',
              action: 'keep-tds',
              type: 'secondary',
            },
          ],
          evidence: [
            `Suggested Section: ${suggestedTDS.section}`,
            `Suggested Rate: ${suggestedTDS.rate}%`,
            `Vendor Category: ${vendorData.category}`,
            `Reason: ${suggestedTDS.rationale}`,
          ],
          relatedData: suggestedTDS,
        });
      }
    }
  }

  // 10. Payment Terms Suggestion
  if (vendorData && vendorData.paymentTerms) {
    const dueDate = calculateDueDate(invoiceData.invoiceDate, vendorData.paymentTerms);

    insights.push({
      id: 'payment-terms',
      severity: 'info',
      category: 'optimization',
      title: 'Payment Due Date Calculated',
      explanation: `Based on vendor payment terms (${vendorData.paymentTerms}), the payment is due on ${dueDate}.`,
      confidence: 100,
      recommendedActions: [
        {
          label: 'Set Due Date',
          action: 'set-due-date',
          type: 'primary',
        },
        {
          label: 'View Payment Schedule',
          action: 'view-schedule',
          type: 'secondary',
        },
      ],
      evidence: [
        `Invoice Date: ${invoiceData.invoiceDate}`,
        `Payment Terms: ${vendorData.paymentTerms}`,
        `Due Date: ${dueDate}`,
        vendorData.isMSME
          ? 'MSME Compliance: Must pay within 45 days'
          : 'Standard payment terms apply',
      ],
    });
  }

  return insights;
}

/**
 * Generate AI Actions
 */
export function generateAIActions(invoiceData: InvoiceData): AIAction[] {
  return [
    {
      id: 'check-duplicates',
      label: 'Auto-check duplicates',
      status: 'idle',
      description: 'Scan historical invoices for exact and fuzzy matches',
    },
    {
      id: 'validate-gst',
      label: 'Auto-validate GST',
      status: 'idle',
      description: 'Verify GSTIN format and validate against vendor master',
    },
    {
      id: 'reconcile-po-grn',
      label: 'Auto-reconcile PO/GRN',
      status: 'idle',
      description: 'Compare invoice line items with PO and GRN data',
    },
    {
      id: 'suggest-tds',
      label: 'Auto-fill TDS section',
      status: 'idle',
      description: 'Recommend appropriate TDS section based on vendor type',
    },
  ];
}

/**
 * Suggest TDS Section based on vendor category and invoice data
 */
function suggestTDSSection(
  vendorCategory: string,
  invoiceData: InvoiceData
): {
  section: string;
  rate: number;
  rationale: string;
} {
  const categoryMap: { [key: string]: { section: string; rate: number; rationale: string } } = {
    Contractor: {
      section: '194C',
      rate: 2,
      rationale: 'Contractor payments attract TDS under Section 194C at 2% for companies',
    },
    'Professional Services': {
      section: '194J',
      rate: 10,
      rationale: 'Professional/technical services attract TDS under Section 194J at 10%',
    },
    Rent: {
      section: '194I',
      rate: 10,
      rationale: 'Rent payments attract TDS under Section 194I at 10%',
    },
    Commission: {
      section: '194H',
      rate: 5,
      rationale: 'Commission payments attract TDS under Section 194H at 5%',
    },
    Interest: {
      section: '194A',
      rate: 10,
      rationale: 'Interest payments attract TDS under Section 194A at 10%',
    },
  };

  return (
    categoryMap[vendorCategory] || {
      section: '194Q',
      rate: 0.1,
      rationale:
        'Purchase of goods from vendors with turnover > 10 crores attracts TDS under Section 194Q at 0.1%',
    }
  );
}

/**
 * Calculate payment due date based on payment terms
 */
function calculateDueDate(invoiceDate: string, paymentTerms: string): string {
  if (!invoiceDate) return 'Not set';

  const date = new Date(invoiceDate);

  // Parse payment terms (e.g., "Net 30", "Net 45", "Net 60")
  const daysMatch = paymentTerms.match(/\d+/);
  const days = daysMatch ? parseInt(daysMatch[0]) : 30;

  date.setDate(date.getDate() + days);

  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
