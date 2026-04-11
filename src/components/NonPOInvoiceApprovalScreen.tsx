import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, XCircle, MessageSquare,
  FileText, Building2, Calendar, DollarSign, Eye, AlertTriangle
} from 'lucide-react';
import { AIAssurancePanel } from './AIAssurancePanel';

export function NonPOInvoiceApprovalScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [comments, setComments] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSendBackModal, setShowSendBackModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Mock Non-PO invoice data
  const invoice = {
    id: 'NPOINV-001',
    invoiceNumber: 'INV-VENDOR-2024-456',
    invoiceType: 'Non-PO',
    vendorName: 'Tech Consulting Services Pvt Ltd',
    vendorCode: 'VEN-1001',
    vendorGSTIN: '29AABCT1234F1Z5',
    invoiceDate: '2024-12-10',
    entity: 'Bangalore Office',
    supplyType: 'Services',
    placeOfSupply: 'Karnataka',
    expenseCategory: 'Professional Services',
    natureOfExpense: 'IT Consulting',
    costCentre: 'CC-IT - IT Department',
    profitCentre: 'PC-SOUTH - South Region',
    accountCode: '5003 - IT Services',
    currency: 'INR',
    paymentTerms: 'Net 30 Days',
    baseAmount: 100000,
    gstAmount: 18000,
    cgst: 9000,
    sgst: 9000,
    igst: 0,
    grossAmount: 118000,
    tdsAmount: 10000,
    tdsSection: '194J',
    tdsRate: 10,
    advanceAdjustment: 25000,
    gstRetention: 18000,
    netPayable: 65000,
    dueDate: '2025-01-09',
    submittedBy: 'John Doe',
    submittedDate: '2024-12-11 11:00 AM',
    agingDays: 2,
    lineItems: [
      {
        description: 'IT Consulting Services - December 2024',
        quantity: 40,
        unitRate: 2500,
        baseAmount: 100000,
        gstRate: 18,
        gstAmount: 18000,
        tdsRate: 10,
        tdsAmount: 10000,
        netPayable: 108000
      }
    ],
    attachments: [
      { name: 'Invoice_Vendor_456.pdf', size: '2.3 MB', uploadedDate: '2024-12-11' }
    ]
  };

  const handleApprove = () => {
    if (confirm('Approve this Non-PO invoice?')) {
      alert('Non-PO Invoice approved successfully');
      navigate('/ap/invoices-for-approval');
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    alert(`Non-PO Invoice rejected. Reason: ${rejectionReason}`);
    navigate('/ap/invoices-for-approval');
  };

  const handleSendBack = () => {
    if (!comments.trim()) {
      alert('Please provide comments');
      return;
    }

    alert(`Non-PO Invoice sent back with comments: ${comments}`);
    navigate('/ap/invoices-for-approval');
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
                <h1 className="text-2xl" style={{ color: 'var(--color-ink)' }}>
                  Non-PO Invoice Approval
                  <span className="ml-3 px-3 py-1 rounded text-sm" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                    Non-PO
                  </span>
                </h1>
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{invoice.invoiceNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSendBackModal(true)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
              >
                <MessageSquare className="w-4 h-4" />
                Send Back
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: 'var(--color-error-dark)' }}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#047857' }}
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Invoice Details */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Non-PO Warning Banner */}
          <div className="bg-white rounded-xl border-2 p-4 mb-6" style={{ borderColor: '#FEF3C7', backgroundColor: '#FFFBEB' }}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#D97706' }} />
              <div>
                <p className="text-sm mb-1" style={{ color: '#92400E' }}>
                  <strong>Non-PO Invoice:</strong> This invoice does not have a Purchase Order reference. 
                  Enhanced validation and approval controls are in effect.
                </p>
                <p className="text-xs" style={{ color: '#92400E' }}>
                  Review AI Assurance panel for compliance checks, fraud detection, and budget validation.
                </p>
              </div>
            </div>
          </div>

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
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Entity</label>
                <span style={{ color: 'var(--color-ink)' }}>{invoice.entity}</span>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Supply Type</label>
                <span className="px-2 py-1 rounded text-sm" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                  {invoice.supplyType}
                </span>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Place of Supply</label>
                <span style={{ color: 'var(--color-ink)' }}>{invoice.placeOfSupply}</span>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Expense Category</label>
                <span style={{ color: 'var(--color-ink)' }}>{invoice.expenseCategory}</span>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Nature of Expense</label>
                <span style={{ color: 'var(--color-ink)' }}>{invoice.natureOfExpense}</span>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Payment Terms</label>
                <span style={{ color: 'var(--color-ink)' }}>{invoice.paymentTerms}</span>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Cost Centre</label>
                <span style={{ color: 'var(--color-ink)' }}>{invoice.costCentre}</span>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Profit Centre</label>
                <span style={{ color: 'var(--color-ink)' }}>{invoice.profitCentre}</span>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--color-mercury-grey)' }}>Account Code</label>
                <span style={{ color: 'var(--color-ink)' }}>{invoice.accountCode}</span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: 'var(--color-silver)' }}>
            <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Line Items</h2>
            
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-cloud)' }}>
                  <th className="px-3 py-3 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Description</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Qty</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Rate</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Base</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>GST</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>TDS</th>
                  <th className="px-3 py-3 text-right text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr key={index} className="border-t" style={{ borderColor: 'var(--color-silver)' }}>
                    <td className="px-3 py-3" style={{ color: 'var(--color-ink)' }}>{item.description}</td>
                    <td className="px-3 py-3 text-right" style={{ color: 'var(--color-ink)' }}>{item.quantity}</td>
                    <td className="px-3 py-3 text-right" style={{ color: 'var(--color-ink)' }}>₹{item.unitRate.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-3 text-right" style={{ color: 'var(--color-ink)' }}>₹{item.baseAmount.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-3 text-right" style={{ color: 'var(--color-ink)' }}>₹{item.gstAmount.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-3 text-right" style={{ color: 'var(--color-error-dark)' }}>-₹{item.tdsAmount.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-3 text-right" style={{ color: 'var(--color-teal)' }}>₹{item.netPayable.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Amount Breakdown */}
          <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: 'var(--color-silver)' }}>
            <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Amount Breakdown</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                <span style={{ color: 'var(--color-mercury-grey)' }}>Base Amount</span>
                <span className="text-lg" style={{ color: 'var(--color-ink)' }}>₹{invoice.baseAmount.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                <span style={{ color: 'var(--color-mercury-grey)' }}>GST (CGST: ₹{invoice.cgst.toLocaleString('en-IN')} + SGST: ₹{invoice.sgst.toLocaleString('en-IN')})</span>
                <span className="text-lg" style={{ color: 'var(--color-ink)' }}>₹{invoice.gstAmount.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                <span style={{ color: 'var(--color-mercury-grey)' }}>Gross Amount</span>
                <span className="text-lg" style={{ color: 'var(--color-ink)' }}>₹{invoice.grossAmount.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)' }}>
                <span style={{ color: 'var(--color-error-dark)' }}>TDS Deducted ({invoice.tdsSection} @ {invoice.tdsRate}%)</span>
                <span className="text-lg" style={{ color: 'var(--color-error-dark)' }}>-₹{invoice.tdsAmount.toLocaleString('en-IN')}</span>
              </div>

              {invoice.advanceAdjustment > 0 && (
                <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#DBEAFE' }}>
                  <span style={{ color: '#1E40AF' }}>Advance Adjusted</span>
                  <span className="text-lg" style={{ color: '#1E40AF' }}>-₹{invoice.advanceAdjustment.toLocaleString('en-IN')}</span>
                </div>
              )}

              {invoice.gstRetention > 0 && (
                <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                  <span style={{ color: '#D97706' }}>GST Retained (pending verification)</span>
                  <span className="text-lg" style={{ color: '#D97706' }}>-₹{invoice.gstRetention.toLocaleString('en-IN')}</span>
                </div>
              )}
              
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

          {/* Attachments */}
          <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: 'var(--color-silver)' }}>
            <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Attachments</h2>
            {invoice.attachments.map((attachment, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ borderColor: 'var(--color-silver)' }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                  <div>
                    <p style={{ color: 'var(--color-ink)' }}>{attachment.name}</p>
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                      {attachment.size} • Uploaded {attachment.uploadedDate}
                    </p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-silver)', color: 'var(--color-ink)' }}>
                  <Eye className="w-4 h-4" />
                  View
                </button>
              </div>
            ))}
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

        {/* AI Assurance Panel - Enhanced for Non-PO */}
        <AIAssurancePanel 
          invoiceId={id || 'NPOINV-001'}
          invoiceData={{
            ...invoice,
            vendorId: invoice.vendorCode,
            vendorStatus: 'Active',
            vendorPAN: 'AABCT1234F',
            bankDetailsChanged: false,
            bankChangeDate: null,
            previousBankAccount: null,
            currentBankAccount: '****9012',
            section206ABApplicable: false,
            higherTDSApplied: false,
            tdsSection: invoice.tdsSection,
            expectedTDSSection: '194J',
            tdsRate: invoice.tdsRate + '%',
            expectedTDSRate: '10%',
            tdsBaseAmount: invoice.baseAmount,
            invoiceNature: invoice.natureOfExpense,
            glCode: invoice.accountCode,
            lowerTDSCertificate: null,
            isMSME: true,
            msmeCategory: 'Micro Enterprise',
            msmeRegistrationNumber: 'MSME-KA-29-123456',
            msmePaymentDaysOverdue: 0,
            openAdvanceBalance: invoice.advanceAdjustment,
            advanceAdjusted: invoice.advanceAdjustment,
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
            createdDate: invoice.submittedDate,
            poNumber: null, // Non-PO marker
            grnNumber: null
          }}
          onActionTaken={(action, insight) => {
            console.log('Action taken:', action, insight);
          }}
        />
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Reject Non-PO Invoice</h3>
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
            <h3 className="text-xl mb-4" style={{ color: 'var(--color-ink)' }}>Send Back Non-PO Invoice</h3>
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