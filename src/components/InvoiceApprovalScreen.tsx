import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, XCircle, MessageSquare, AlertTriangle,
  FileText, Building2, Calendar, DollarSign, Package, Eye,
  Zap, Shield, TrendingUp, Info, AlertCircle, Target, Ban
} from 'lucide-react';
import { AIInsightsPanel } from './AIInsightsPanel';
import { AIAssurancePanel } from './AIAssurancePanel';

interface AIInsight {
  id: string;
  severity: 'blocker' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  reason: string;
  evidence: string[];
  confidence: number;
  recommendedActions: string[];
  canBypass?: boolean;
}

export function InvoiceApprovalScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [comments, setComments] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSendBackModal, setShowSendBackModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [aiPanelExpanded, setAiPanelExpanded] = useState(true);
  const [bypassedInsights, setBypassedInsights] = useState<Set<string>>(new Set());

  // Mock invoice data
  const invoice = {
    id: 'INV-001',
    invoiceNumber: 'INV-2024-00123',
    vendorName: 'Tech Solutions Pvt Ltd',
    vendorCode: 'VEN-1001',
    vendorGSTIN: '29AABCT1234F1Z5',
    poNumber: 'PO-2024-001',
    poAmount: 150000,
    grnNumber: 'GRN-2024-056',
    grnQty: 100,
    invoiceDate: '2024-12-10',
    invoiceAmount: 125000,
    gstAmount: 11250,
    tdsAmount: 2250,
    netPayable: 134000,
    dueDate: '2025-01-09',
    paymentTerms: 'Net 30 Days',
    currency: 'INR',
    submittedBy: 'John Doe',
    submittedDate: '2024-12-11 11:00 AM',
    agingDays: 2
  };

  const [aiInsights] = useState<AIInsight[]>([
    {
      id: 'INS-001',
      severity: 'blocker',
      category: 'Duplicate Detection',
      title: 'Possible Duplicate Invoice Detected',
      description: 'Invoice INV-2024-00100 for the same vendor with similar amount (₹123,500) was approved 15 days ago.',
      reason: 'Same vendor and similar amount with a small variance.',
      evidence: [
        'Same vendor: Tech Solutions Pvt Ltd',
        'Similar amount: ₹123,500 vs ₹125,000 (1.2% variance)',
        'Same PO reference: PO-2024-001',
        'Time gap: 15 days'
      ],
      confidence: 87,
      recommendedActions: [
        'View duplicate invoice INV-2024-00100',
        'Compare line items',
        'Verify with vendor',
        'Put on hold for investigation'
      ],
      canBypass: true
    },
    {
      id: 'INS-002',
      severity: 'warning',
      category: '3-Way Match',
      title: 'Amount Variance Detected',
      description: 'Invoice amount is 5% below PO amount. This is within tolerance but requires review.',
      reason: 'Invoice amount has a significant variance compared to the PO amount, though within acceptable limits.',
      evidence: [
        'PO Amount: ₹150,000',
        'Invoice Amount: ₹125,000',
        'Variance: -₹25,000 (-16.67%)',
        'Tolerance: ±20%',
        'GRN Quantity: 100 units received'
      ],
      confidence: 95,
      recommendedActions: [
        'Review GRN for partial delivery',
        'Verify unit prices',
        'Check for pending invoices for balance'
      ],
      canBypass: false
    },
    {
      id: 'INS-003',
      severity: 'info',
      category: 'Vendor Intelligence',
      title: 'MSME Vendor Identified',
      description: 'This vendor is MSME-registered. Payment due within 45 days to maintain compliance.',
      reason: 'Vendor is registered as MSME, requiring special payment compliance.',
      evidence: [
        'MSME Registration: MSME-KA-29-123456',
        'Payment due: 2025-01-09',
        'Days remaining: 28 days',
        'Compliance status: On track'
      ],
      confidence: 100,
      recommendedActions: [
        'Prioritize for early payment',
        'Apply MSME payment terms'
      ],
      canBypass: false
    },
    {
      id: 'INS-004',
      severity: 'info',
      category: 'Tax Compliance',
      title: 'TDS Calculation Verified',
      description: 'TDS section 194C correctly applied at 2%. No discrepancies found.',
      reason: 'TDS has been calculated correctly according to Section 194C guidelines.',
      evidence: [
        'TDS Section: 194C - Payments to contractors',
        'Rate Applied: 2%',
        'Base Amount: ₹125,000',
        'TDS Deducted: ₹2,250',
        'Calculation: Correct'
      ],
      confidence: 100,
      recommendedActions: [],
      canBypass: false
    },
    {
      id: 'INS-005',
      severity: 'info',
      category: 'Payment Optimization',
      title: 'Early Payment Discount Available',
      description: 'Vendor offers 2% discount if paid within 10 days. Potential savings: ₹2,500.',
      reason: 'Contract includes early payment discount terms that can save costs.',
      evidence: [
        'Contract terms: 2/10 Net 30',
        'Discount: 2% if paid by 2024-12-20',
        'Potential savings: ₹2,500',
        'Current due date: 2025-01-09'
      ],
      confidence: 92,
      recommendedActions: [
        'Consider early payment',
        'Verify cash flow availability',
        'Apply discount in payment'
      ],
      canBypass: false
    }
  ]);

  const getInsightIcon = (severity: AIInsight['severity']) => {
    switch (severity) {
      case 'blocker': return Ban;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
    }
  };

  const getInsightStyle = (severity: AIInsight['severity']) => {
    switch (severity) {
      case 'blocker':
        return { 
          bg: 'var(--color-error-light)', 
          border: 'var(--color-error-dark)', 
          color: 'var(--color-error-dark)',
          icon: 'var(--color-error-dark)'
        };
      case 'warning':
        return { 
          bg: '#FEF3C7', 
          border: '#D97706', 
          color: '#D97706',
          icon: '#D97706'
        };
      case 'info':
        return { 
          bg: '#DBEAFE', 
          border: '#2563EB', 
          color: '#2563EB',
          icon: '#2563EB'
        };
    }
  };

  const hasBlockers = aiInsights.some(
    insight => insight.severity === 'blocker' && !bypassedInsights.has(insight.id)
  );

  const handleApprove = () => {
    if (hasBlockers) {
      alert('Cannot approve: There are unresolved blocking issues');
      return;
    }

    if (confirm('Approve this invoice?')) {
      alert('Invoice approved successfully');
      navigate('/ap/invoices-for-approval');
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    alert(`Invoice rejected. Reason: ${rejectionReason}`);
    navigate('/ap/invoices-for-approval');
  };

  const handleSendBack = () => {
    if (!comments.trim()) {
      alert('Please provide comments');
      return;
    }

    alert(`Invoice sent back with comments: ${comments}`);
    navigate('/ap/invoices-for-approval');
  };

  const handleBypassInsight = (insightId: string) => {
    const insight = aiInsights.find(i => i.id === insightId);
    if (!insight?.canBypass) return;

    const reason = prompt('Enter reason for bypassing this check:');
    if (reason) {
      const newBypassed = new Set(bypassedInsights);
      newBypassed.add(insightId);
      setBypassedInsights(newBypassed);
      alert('Check bypassed. This action will be recorded in audit trail.');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }} className="flex flex-col">
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-white shadow-sm" style={{ borderBottom: '2px solid var(--color-silver)' }}>
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/ap/invoices-for-approval')}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100" 
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl" style={{ color: 'var(--color-ink)' }}>Invoice Approval</h1>
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{invoice.invoiceNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSendBackModal(true)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D1D6DA'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-silver)'}
              >
                <MessageSquare className="w-4 h-4" />
                Send Back
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: 'var(--color-error-dark)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-error-dark)'}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={hasBlockers}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: hasBlockers ? 'var(--color-mercury-grey)' : '#047857' }}
                onMouseEnter={(e) => !hasBlockers && (e.currentTarget.style.backgroundColor = '#065F46')}
                onMouseLeave={(e) => !hasBlockers && (e.currentTarget.style.backgroundColor = '#047857')}
                title={hasBlockers ? 'Resolve or bypass blocking issues to approve' : 'Approve Invoice'}
              >
                <CheckCircle className="w-4 h-4" />
                Approve
                {hasBlockers && (
                  <span className="ml-2 px-2 py-0.5 bg-[var(--color-error-dark)] text-white text-xs rounded">
                    {aiInsights.filter(i => i.severity === 'blocker' && !bypassedInsights.has(i.id)).length} Blockers
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Invoice Details */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Invoice Header */}
          <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: 'var(--color-silver)' }}>
            <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Invoice Details</h2>
            
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Invoice Number</label>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--color-teal)]" />
                  <span style={{ color: 'var(--color-ink)' }}>{invoice.invoiceNumber}</span>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Vendor</label>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  <div>
                    <p style={{ color: 'var(--color-ink)' }}>{invoice.vendorName}</p>
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{invoice.vendorCode}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Invoice Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  <span style={{ color: 'var(--color-ink)' }}>{invoice.invoiceDate}</span>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>PO Number</label>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  <span style={{ color: 'var(--color-ink)' }}>{invoice.poNumber}</span>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>GRN Number</label>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  <span style={{ color: 'var(--color-ink)' }}>{invoice.grnNumber}</span>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Payment Terms</label>
                <span style={{ color: 'var(--color-ink)' }}>{invoice.paymentTerms}</span>
              </div>
            </div>
          </div>

          {/* Amount Details */}
          <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: 'var(--color-silver)' }}>
            <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Amount Breakdown</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                <span style={{ color: 'var(--color-mercury-grey)' }}>Invoice Amount</span>
                <span className="text-lg" style={{ color: 'var(--color-ink)' }}>₹{invoice.invoiceAmount.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                <span style={{ color: 'var(--color-mercury-grey)' }}>GST</span>
                <span className="text-lg" style={{ color: 'var(--color-ink)' }}>₹{invoice.gstAmount.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                <span style={{ color: 'var(--color-mercury-grey)' }}>TDS (Deducted)</span>
                <span className="text-lg" style={{ color: 'var(--color-error-dark)' }}>-₹{invoice.tdsAmount.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="border-t-2 pt-3" style={{ borderColor: 'var(--color-silver)' }}>
                <div className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: 'var(--color-teal)10' }}>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-[var(--color-teal)]" />
                    <span className="text-lg" style={{ color: 'var(--color-ink)' }}>Net Payable</span>
                  </div>
                  <span className="text-2xl" style={{ color: 'var(--color-teal)' }}>
                    ₹{invoice.netPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Approver Comments */}
          <div className="bg-white rounded-xl border-2 p-6" style={{ borderColor: 'var(--color-silver)' }}>
            <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Approver Comments</h2>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add your comments here (optional)..."
              className="w-full px-4 py-3 rounded-lg border-2 min-h-[120px]"
              style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
            />
          </div>
        </div>

        {/* AI Assurance Panel */}
        <AIAssurancePanel 
          invoiceId={id || 'INV-001'}
          invoiceData={{
            ...invoice,
            vendorId: invoice.vendorCode,
            vendorStatus: 'Active',
            vendorPAN: 'AABCT1234F',
            bankDetailsChanged: true,
            bankChangeDate: '2024-11-15',
            previousBankAccount: '****5678',
            currentBankAccount: '****9012',
            section206ABApplicable: false,
            higherTDSApplied: false,
            tdsSection: '194J',
            expectedTDSSection: '194C',
            tdsRate: '10%',
            expectedTDSRate: '2%',
            tdsBaseAmount: 125000,
            invoiceNature: 'Contractor Payment',
            glCode: 'GL-5001',
            lowerTDSCertificate: null,
            isMSME: true,
            msmeCategory: 'Micro Enterprise',
            msmeRegistrationNumber: 'MSME-KA-29-123456',
            msmePaymentDaysOverdue: 35,
            openAdvanceBalance: 50000,
            advanceAdjusted: 0,
            totalAdvances: 50000,
            advanceIds: ['ADV-001', 'ADV-002'],
            gstReturnStatus: 'Not Found',
            invoiceGSTIN: invoice.vendorGSTIN,
            gstReturnPeriod: '2024-12',
            duplicateDetected: false,
            duplicateInvoiceNumber: null,
            duplicateInvoiceId: null,
            duplicateInvoiceDate: null,
            duplicateInvoiceAmount: null,
            createdBy: invoice.submittedBy,
            createdDate: invoice.submittedDate
          }}
          onActionTaken={(action, insight) => {
            console.log('Action taken:', action, insight);
            // Handle actions like audit logging
          }}
        />
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Reject Invoice</h3>
            <p className="mb-4" style={{ color: 'var(--color-mercury-grey)' }}>
              Please provide a reason for rejecting this invoice:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-4 py-3 rounded-lg border-2 min-h-[120px] mb-4"
              style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border-2"
                style={{ borderColor: 'var(--color-silver)', color: 'var(--color-mercury-grey)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: 'var(--color-error-dark)' }}
              >
                Reject Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Back Modal */}
      {showSendBackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Send Back Invoice</h3>
            <p className="mb-4" style={{ color: 'var(--color-mercury-grey)' }}>
              Provide comments for the submitter:
            </p>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter your comments..."
              className="w-full px-4 py-3 rounded-lg border-2 min-h-[120px] mb-4"
              style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendBackModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border-2"
                style={{ borderColor: 'var(--color-silver)', color: 'var(--color-mercury-grey)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendBack}
                className="flex-1 px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: 'var(--color-teal)' }}
              >
                Send Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}