import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, XCircle, MessageSquare,
  FileText, Building2, Calendar, DollarSign, Package
} from 'lucide-react';
import { AIAssurancePanel } from './AIAssurancePanel';

export function InvoiceApprovalScreenV2() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [comments, setComments] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSendBackModal, setShowSendBackModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

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

  const handleApprove = () => {
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

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }} className="flex flex-col">
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-white shadow-sm" style={{ borderBottom: '2px solid #E1E6EA' }}>
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/ap/invoices-for-approval')}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100" 
                style={{ color: '#6E7A82' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl" style={{ color: '#0A0F14' }}>Invoice Approval</h1>
                <p className="text-sm" style={{ color: '#6E7A82' }}>{invoice.invoiceNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSendBackModal(true)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#E1E6EA', color: '#0A0F14' }}
              >
                <MessageSquare className="w-4 h-4" />
                Send Back
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#DC2626' }}
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
          {/* Invoice Header */}
          <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: '#E1E6EA' }}>
            <h2 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Invoice Details</h2>
            
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="text-sm mb-1 block" style={{ color: '#6E7A82' }}>Invoice Number</label>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00A9B7]" />
                  <span style={{ color: '#0A0F14' }}>{invoice.invoiceNumber}</span>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: '#6E7A82' }}>Vendor</label>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" style={{ color: '#6E7A82' }} />
                  <div>
                    <p style={{ color: '#0A0F14' }}>{invoice.vendorName}</p>
                    <p className="text-sm" style={{ color: '#6E7A82' }}>{invoice.vendorCode}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: '#6E7A82' }}>Invoice Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: '#6E7A82' }} />
                  <span style={{ color: '#0A0F14' }}>{invoice.invoiceDate}</span>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: '#6E7A82' }}>PO Number</label>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" style={{ color: '#6E7A82' }} />
                  <span style={{ color: '#0A0F14' }}>{invoice.poNumber}</span>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: '#6E7A82' }}>GRN Number</label>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" style={{ color: '#6E7A82' }} />
                  <span style={{ color: '#0A0F14' }}>{invoice.grnNumber}</span>
                </div>
              </div>

              <div>
                <label className="text-sm mb-1 block" style={{ color: '#6E7A82' }}>Payment Terms</label>
                <span style={{ color: '#0A0F14' }}>{invoice.paymentTerms}</span>
              </div>
            </div>
          </div>

          {/* Amount Details */}
          <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: '#E1E6EA' }}>
            <h2 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Amount Breakdown</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                <span style={{ color: '#6E7A82' }}>Invoice Amount</span>
                <span className="text-lg" style={{ color: '#0A0F14' }}>₹{invoice.invoiceAmount.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                <span style={{ color: '#6E7A82' }}>GST</span>
                <span className="text-lg" style={{ color: '#0A0F14' }}>₹{invoice.gstAmount.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
                <span style={{ color: '#6E7A82' }}>TDS (Deducted)</span>
                <span className="text-lg" style={{ color: '#DC2626' }}>-₹{invoice.tdsAmount.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="border-t-2 pt-3" style={{ borderColor: '#E1E6EA' }}>
                <div className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: '#00A9B710' }}>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-[#00A9B7]" />
                    <span className="text-lg" style={{ color: '#0A0F14' }}>Net Payable</span>
                  </div>
                  <span className="text-2xl" style={{ color: '#00A9B7' }}>
                    ₹{invoice.netPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Approver Comments */}
          <div className="bg-white rounded-xl border-2 p-6" style={{ borderColor: '#E1E6EA' }}>
            <h2 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Approver Comments</h2>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add your comments here (optional)..."
              className="w-full px-4 py-3 rounded-lg border-2 min-h-[120px]"
              style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
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
          }}
        />
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Reject Invoice</h3>
            <p className="mb-4" style={{ color: '#6E7A82' }}>
              Please provide a reason for rejecting this invoice:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-4 py-3 rounded-lg border-2 min-h-[120px] mb-4"
              style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border-2"
                style={{ borderColor: '#E1E6EA', color: '#6E7A82' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#DC2626' }}
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
            <h3 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Send Back Invoice</h3>
            <p className="mb-4" style={{ color: '#6E7A82' }}>
              Provide comments for the submitter:
            </p>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter your comments..."
              className="w-full px-4 py-3 rounded-lg border-2 min-h-[120px] mb-4"
              style={{ borderColor: '#E1E6EA', color: '#0A0F14' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendBackModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border-2"
                style={{ borderColor: '#E1E6EA', color: '#6E7A82' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendBack}
                className="flex-1 px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#00A9B7' }}
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