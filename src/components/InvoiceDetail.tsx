import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Send, X, FileText, AlertCircle, CheckCircle, 
  XCircle, Clock, Edit3, Download, Printer, MessageSquare, History,
  DollarSign, Calendar, User, Building2, Package, Hash, ExternalLink,
  CheckCheck, Ban, AlertTriangle, Sparkles, RefreshCw, FileMinus
} from 'lucide-react';
import { WorkflowHistory, WorkflowHistoryItem } from './WorkflowHistory';

type InvoiceStatus = 'Draft' | 'Validation Error' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Posted to ERP';

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ApprovalHistory {
  id: string;
  action: 'Submitted' | 'Approved' | 'Rejected' | 'Requested Info' | 'Posted to ERP';
  by: string;
  role: string;
  date: string;
  time: string;
  comments?: string;
}

export function InvoiceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [status, setStatus] = useState<InvoiceStatus>('Draft');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState('');

  // Validation errors (for Validation Error state)
  const validationErrors: ValidationError[] = [
    {
      field: 'Invoice Amount',
      message: 'Invoice amount (₹125,000) exceeds PO amount (₹120,000) by ₹5,000',
      severity: 'error'
    },
    {
      field: 'GST Number',
      message: 'GST number format is invalid. Expected format: 00AAAAA0000A0Z0',
      severity: 'error'
    },
    {
      field: 'Due Date',
      message: 'Due date is in the past. Invoice may be overdue.',
      severity: 'warning'
    }
  ];

  // Approval history
  const approvalHistory: WorkflowHistoryItem[] = [
    {
      id: '1',
      action: 'Submitted',
      by: 'Priya Sharma',
      role: 'AP Clerk',
      date: '2024-12-13',
      time: '09:30 AM',
      timestamp: '2024-12-13T09:30:00',
      comments: 'Invoice received from vendor via email'
    },
    {
      id: '2',
      action: 'Approved',
      by: 'Rajesh Kumar',
      role: 'Finance Manager',
      date: '2024-12-13',
      time: '11:45 AM',
      timestamp: '2024-12-13T11:45:00',
      comments: 'Verified against PO-2024-001. Amounts match.'
    },
    {
      id: '3',
      action: 'Approved',
      by: 'Anjali Singh',
      role: 'CFO',
      date: '2024-12-13',
      time: '02:15 PM',
      timestamp: '2024-12-13T14:15:00',
      comments: 'Approved for payment'
    },
    {
      id: '4',
      action: 'Posted to ERP',
      by: 'System',
      role: 'Auto Process',
      date: '2024-12-13',
      time: '02:20 PM',
      timestamp: '2024-12-13T14:20:00',
      comments: 'Successfully posted to SAP. Document ID: 5000123456'
    }
  ];

  // Mock invoice data
  const invoice = {
    invoiceNumber: 'INV-2024-001',
    invoiceDate: '2024-12-10',
    dueDate: '2025-01-09',
    vendorName: 'Textile Solutions Pvt Ltd',
    vendorCode: 'VEN-001',
    vendorGST: '27AAAAA0000A1Z5',
    poNumber: 'PO-2024-001',
    grnNumbers: ['GRN-2024-056', 'GRN-2024-057'],
    invoiceType: 'PO',
    currency: 'INR',
    paymentTerms: 'Net 30',
    erpDocumentId: status === 'Posted to ERP' ? '5000123456' : null,
    lineItems: [
      {
        id: '1',
        description: 'Cotton Fabric - Premium Grade',
        quantity: 500,
        unitPrice: 250,
        taxPercent: 18,
        lineAmount: 125000,
        costCenter: 'CC-MFG-001',
        glCode: '5100 - Raw Materials',
        department: 'Manufacturing'
      }
    ],
    subtotal: 125000,
    gstAmount: 22500,
    tdsAmount: 2500,
    totalAmount: 145000,
    createdBy: 'Priya Sharma',
    createdDate: '2024-12-13',
    lastModifiedBy: 'Rajesh Kumar',
    lastModifiedDate: '2024-12-13'
  };

  const getStatusConfig = (currentStatus: InvoiceStatus) => {
    switch (currentStatus) {
      case 'Draft':
        return {
          color: '#9AA6AF',
          bgColor: '#F6F9FC',
          icon: FileText,
          label: 'Draft',
          description: 'Invoice is in draft state. You can edit and make changes.',
          actions: ['Edit', 'Delete', 'Submit for Validation']
        };
      case 'Validation Error':
        return {
          color: '#EF4444',
          bgColor: '#FEE2E2',
          icon: XCircle,
          label: 'Validation Error',
          description: 'Invoice has validation errors that must be resolved before submission.',
          actions: ['Edit & Fix Errors', 'Delete']
        };
      case 'Pending Approval':
        return {
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          icon: Clock,
          label: 'Pending Approval',
          description: 'Invoice is awaiting approval from Finance Manager.',
          actions: ['View History', 'Recall']
        };
      case 'Approved':
        return {
          color: '#00A9B7',
          bgColor: '#00A9B710',
          icon: CheckCircle,
          label: 'Approved',
          description: 'Invoice has been approved and is ready for ERP posting.',
          actions: ['Post to ERP', 'View Approvals', 'Download']
        };
      case 'Rejected':
        return {
          color: '#DC2626',
          bgColor: '#FEE2E2',
          icon: Ban,
          label: 'Rejected',
          description: 'Invoice has been rejected. Review comments and resubmit.',
          actions: ['View Rejection Reason', 'Edit & Resubmit', 'Delete']
        };
      case 'Posted to ERP':
        return {
          color: '#10B981',
          bgColor: '#D1FAE5',
          icon: CheckCheck,
          label: 'Posted to ERP',
          description: 'Invoice has been successfully posted to SAP ERP system.',
          actions: ['View in ERP', 'Download', 'Print']
        };
      default:
        return {
          color: '#6E7A82',
          bgColor: '#F6F9FC',
          icon: FileText,
          label: 'Unknown',
          description: '',
          actions: []
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  const handleApprove = () => {
    setStatus('Approved');
    alert('Invoice approved successfully');
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setStatus('Rejected');
    setShowRejectModal(false);
    setRejectReason('');
  };

  const handlePostToERP = () => {
    setStatus('Posted to ERP');
    alert('Invoice posted to SAP ERP successfully. Document ID: 5000123456');
  };

  const handleSubmitForApproval = () => {
    // Check for validation errors
    if (validationErrors.filter(e => e.severity === 'error').length > 0) {
      setStatus('Validation Error');
      alert('Cannot submit. Please fix validation errors first.');
      return;
    }
    setStatus('Pending Approval');
    alert('Invoice submitted for approval');
  };

  const handleEdit = () => {
    navigate(`/invoices/edit/${id}`);
  };

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm" style={{ borderBottom: '2px solid #E1E6EA' }}>
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/invoices')}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100" 
                style={{ color: '#6E7A82' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl" style={{ color: '#0A0F14' }}>
                    Invoice {invoice.invoiceNumber}
                  </h1>
                  <span 
                    className="flex items-center gap-2 px-4 py-1 rounded-full"
                    style={{ 
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color,
                      border: `2px solid ${statusConfig.color}`
                    }}
                  >
                    <StatusIcon className="w-4 h-4" />
                    <span style={{ fontWeight: '600' }}>{statusConfig.label}</span>
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: '#6E7A82' }}>
                  {statusConfig.description}
                </p>
              </div>
            </div>

            {/* Action Buttons based on status */}
            <div className="flex items-center gap-3">
              {status === 'Draft' && (
                <>
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: '#E1E6EA', color: '#0A0F14' }}
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleSubmitForApproval}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#00A9B7' }}
                  >
                    <Send className="w-4 h-4" />
                    Submit for Approval
                  </button>
                </>
              )}

              {status === 'Validation Error' && (
                <>
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#EF4444' }}
                  >
                    <Edit3 className="w-4 h-4" />
                    Fix Errors
                  </button>
                </>
              )}

              {status === 'Pending Approval' && (
                <>
                  <button
                    onClick={() => setShowCommentModal(true)}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: '#E1E6EA', color: '#0A0F14' }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Add Comment
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#EF4444' }}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#00A9B7' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                </>
              )}

              {status === 'Approved' && (
                <>
                  <button
                    className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: '#E1E6EA', color: '#0A0F14' }}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={handlePostToERP}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#00A9B7' }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Post to ERP
                  </button>
                </>
              )}

              {status === 'Rejected' && (
                <>
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#00A9B7' }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Edit & Resubmit
                  </button>
                </>
              )}

              {status === 'Posted to ERP' && (
                <>
                  <button
                    className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: '#E1E6EA', color: '#0A0F14' }}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: '#E1E6EA', color: '#0A0F14' }}
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View in SAP
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto">
        {/* State Switcher (for demo purposes) */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            <h3 style={{ color: '#0A0F14', fontWeight: '600' }}>Demo: Switch Invoice State</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {(['Draft', 'Validation Error', 'Pending Approval', 'Approved', 'Rejected', 'Posted to ERP'] as InvoiceStatus[]).map((state) => (
              <button
                key={state}
                onClick={() => setStatus(state)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: status === state ? getStatusConfig(state).color : '#F6F9FC',
                  color: status === state ? '#FFFFFF' : '#0A0F14',
                  border: `2px solid ${getStatusConfig(state).color}`,
                  fontWeight: status === state ? '600' : '400'
                }}
              >
                {state}
              </button>
            ))}
          </div>
        </div>

        {/* Validation Errors (only for Validation Error state) */}
        {status === 'Validation Error' && (
          <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #EF4444' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <XCircle className="w-5 h-5" style={{ color: '#EF4444' }} />
              </div>
              <div>
                <h2 className="text-xl" style={{ color: '#0A0F14' }}>Validation Errors</h2>
                <p className="text-sm" style={{ color: '#6E7A82' }}>
                  {validationErrors.filter(e => e.severity === 'error').length} error(s) and {validationErrors.filter(e => e.severity === 'warning').length} warning(s) found
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {validationErrors.map((error, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg flex items-start gap-3"
                  style={{ 
                    backgroundColor: error.severity === 'error' ? '#FEE2E2' : '#FEF3C7',
                    border: `1px solid ${error.severity === 'error' ? '#FCA5A5' : '#FDE68A'}`
                  }}
                >
                  {error.severity === 'error' ? (
                    <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                  ) : (
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                  )}
                  <div className="flex-1">
                    <p className="text-sm mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
                      {error.field}
                    </p>
                    <p className="text-sm" style={{ color: error.severity === 'error' ? '#7F1D1D' : '#78350F' }}>
                      {error.message}
                    </p>
                  </div>
                  <button
                    onClick={handleEdit}
                    className="px-3 py-1 rounded text-xs text-white transition-colors"
                    style={{ backgroundColor: error.severity === 'error' ? '#EF4444' : '#F59E0B' }}
                  >
                    Fix Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejection Details (only for Rejected state) */}
        {status === 'Rejected' && (
          <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #DC2626' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <Ban className="w-5 h-5" style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h2 className="text-xl" style={{ color: '#0A0F14' }}>Rejection Details</h2>
                <p className="text-sm" style={{ color: '#6E7A82' }}>Invoice was rejected by approver</p>
              </div>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
              <p className="text-sm mb-2" style={{ color: '#7F1D1D', fontWeight: '600' }}>
                Rejected by: Rajesh Kumar (Finance Manager)
              </p>
              <p className="text-sm mb-2" style={{ color: '#7F1D1D' }}>
                Date: 2024-12-13 at 11:45 AM
              </p>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid #FCA5A5' }}>
                <p className="text-sm mb-1" style={{ color: '#7F1D1D', fontWeight: '600' }}>Reason:</p>
                <p className="text-sm" style={{ color: '#7F1D1D' }}>
                  Invoice amount exceeds PO amount. Please verify with vendor and obtain revised invoice or PO amendment.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#FEF3C7' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
              <p className="text-sm" style={{ color: '#78350F' }}>
                Please address the rejection reason and resubmit the invoice for approval.
              </p>
            </div>
          </div>
        )}

        {/* ERP Posting Details (only for Posted to ERP state) */}
        {status === 'Posted to ERP' && (
          <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #10B981' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <CheckCheck className="w-5 h-5" style={{ color: '#10B981' }} />
              </div>
              <div>
                <h2 className="text-xl" style={{ color: '#0A0F14' }}>ERP Integration Status</h2>
                <p className="text-sm" style={{ color: '#6E7A82' }}>Successfully posted to SAP ERP system</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
                <p className="text-sm mb-1" style={{ color: '#065F46', fontWeight: '600' }}>ERP Document ID</p>
                <p className="text-lg" style={{ color: '#047857', fontWeight: '700' }}>5000123456</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
                <p className="text-sm mb-1" style={{ color: '#065F46', fontWeight: '600' }}>Posting Date</p>
                <p className="text-lg" style={{ color: '#047857', fontWeight: '700' }}>2024-12-13</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
                <p className="text-sm mb-1" style={{ color: '#065F46', fontWeight: '600' }}>Company Code</p>
                <p className="text-lg" style={{ color: '#047857', fontWeight: '700' }}>1000</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
                <p className="text-sm mb-1" style={{ color: '#065F46', fontWeight: '600' }}>Fiscal Year</p>
                <p className="text-lg" style={{ color: '#047857', fontWeight: '700' }}>2024</p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#DBEAFE' }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#1D4ED8' }} />
              <p className="text-sm" style={{ color: '#1E3A8A' }}>
                This invoice has been posted to the ERP system and is now part of your financial records. Payment processing will be initiated as per payment terms.
              </p>
            </div>
          </div>
        )}

        {/* Invoice Details */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00A9B710' }}>
              <FileText className="w-5 h-5" style={{ color: '#00A9B7' }} />
            </div>
            <h2 className="text-xl" style={{ color: '#0A0F14' }}>Invoice Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6E7A82' }}>Invoice Number</label>
              <p style={{ color: '#0A0F14', fontWeight: '600' }}>{invoice.invoiceNumber}</p>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6E7A82' }}>Invoice Date</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: '#6E7A82' }} />
                <p style={{ color: '#0A0F14' }}>{invoice.invoiceDate}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6E7A82' }}>Due Date</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: '#6E7A82' }} />
                <p style={{ color: '#0A0F14' }}>{invoice.dueDate}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6E7A82' }}>Vendor Name</label>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" style={{ color: '#6E7A82' }} />
                <p style={{ color: '#0A0F14' }}>{invoice.vendorName}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6E7A82' }}>Vendor Code</label>
              <p style={{ color: '#0A0F14' }}>{invoice.vendorCode}</p>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6E7A82' }}>GST Number</label>
              <p style={{ color: '#0A0F14' }}>{invoice.vendorGST}</p>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6E7A82' }}>PO Number</label>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: '#6E7A82' }} />
                <p style={{ color: '#0A0F14', fontWeight: '600' }}>{invoice.poNumber}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6E7A82' }}>GRN Numbers</label>
              <p style={{ color: '#0A0F14' }}>{invoice.grnNumbers.join(', ')}</p>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: '#6E7A82' }}>Payment Terms</label>
              <p style={{ color: '#0A0F14' }}>{invoice.paymentTerms}</p>
            </div>
          </div>

          {/* Line Items */}
          <div className="mt-6 pt-6" style={{ borderTop: '2px solid #E1E6EA' }}>
            <h3 className="mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>Line Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: '#F6F9FC' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Description</th>
                    <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Quantity</th>
                    <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Unit Price</th>
                    <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Tax %</th>
                    <th className="text-left px-4 py-3 text-xs" style={{ color: '#6E7A82', fontWeight: '600' }}>Line Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id} style={{ borderTop: '1px solid #E1E6EA' }}>
                      <td className="px-4 py-3" style={{ color: '#0A0F14' }}>{item.description}</td>
                      <td className="px-4 py-3" style={{ color: '#0A0F14' }}>{item.quantity}</td>
                      <td className="px-4 py-3" style={{ color: '#0A0F14' }}>₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3" style={{ color: '#0A0F14' }}>{item.taxPercent}%</td>
                      <td className="px-4 py-3" style={{ color: '#0A0F14', fontWeight: '600' }}>₹{item.lineAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="mt-6 pt-6 flex justify-end" style={{ borderTop: '2px solid #E1E6EA' }}>
            <div className="w-full md:w-1/2 space-y-3">
              <div className="flex justify-between">
                <span style={{ color: '#6E7A82' }}>Subtotal:</span>
                <span style={{ color: '#0A0F14', fontWeight: '600' }}>₹{invoice.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#6E7A82' }}>GST (18%):</span>
                <span style={{ color: '#0A0F14', fontWeight: '600' }}>₹{invoice.gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#6E7A82' }}>TDS (2%):</span>
                <span style={{ color: '#EF4444', fontWeight: '600' }}>-₹{invoice.tdsAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-3 flex justify-between" style={{ borderTop: '2px solid #E1E6EA' }}>
                <span className="text-lg" style={{ color: '#0A0F14', fontWeight: '600' }}>Total Amount:</span>
                <span className="text-2xl" style={{ color: '#00A9B7', fontWeight: '700' }}>₹{invoice.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Debit Notes / Adjustments */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '2px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <FileMinus className="w-5 h-5" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <h2 className="text-xl" style={{ color: '#0A0F14' }}>Adjustments</h2>
                <p className="text-sm" style={{ color: '#6E7A82' }}>Debit notes linked to this invoice</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/ap/debit-notes/create?invoice=${invoice.invoiceNumber}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{ border: '1px solid #00A9B7', color: '#00A9B7', backgroundColor: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8F7F8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <FileMinus className="w-4 h-4" />
              Create Debit Note
            </button>
          </div>

          {/* Mock Debit Notes */}
          {id && id === 'INV-001' ? (
            <div className="space-y-3">
              <div 
                className="p-4 rounded-lg transition-colors cursor-pointer" 
                style={{ border: '1px solid #E1E6EA' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                onClick={() => navigate('/ap/debit-notes/detail/DN-001')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ color: '#00A9B7', fontWeight: '600' }}>DN-2024-001</span>
                    <span 
                      className="px-2 py-1 rounded-full text-xs"
                      style={{ backgroundColor: '#E8F7F8', color: '#00A9B7' }}
                    >
                      Issued
                    </span>
                  </div>
                  <span style={{ color: '#0A0F14', fontWeight: '600' }}>-₹15,000</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span style={{ color: '#6E7A82' }}>Date: 15-Dec-2024</span>
                  <span style={{ color: '#6E7A82' }}>•</span>
                  <span style={{ color: '#6E7A82' }}>Reason: Short Supply</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileMinus className="w-12 h-12 mx-auto mb-3" style={{ color: '#E1E6EA' }} />
              <p className="text-sm" style={{ color: '#6E7A82' }}>
                No debit notes found for this invoice
              </p>
            </div>
          )}

          {/* Net Payable Calculation */}
          {id && id === 'INV-001' && (
            <div className="mt-6 pt-6" style={{ borderTop: '2px solid #E1E6EA' }}>
              <div className="flex justify-end">
                <div className="w-full md:w-1/2 space-y-2">
                  <div className="flex justify-between">
                    <span style={{ color: '#6E7A82' }}>Invoice Amount:</span>
                    <span style={{ color: '#0A0F14', fontWeight: '600' }}>₹{invoice.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#6E7A82' }}>Debit Note Adjustments:</span>
                    <span style={{ color: '#EF4444', fontWeight: '600' }}>-₹15,000</span>
                  </div>
                  <div className="pt-2 flex justify-between" style={{ borderTop: '1px solid #E1E6EA' }}>
                    <span style={{ color: '#0A0F14', fontWeight: '600' }}>Net Payable:</span>
                    <span className="text-xl" style={{ color: '#00A9B7', fontWeight: '700' }}>
                      ₹{(invoice.totalAmount - 15000).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Approval History */}
        {(status === 'Approved' || status === 'Posted to ERP' || status === 'Pending Approval') && (
          <WorkflowHistory history={approvalHistory} title="Approval History" />
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" style={{ border: '2px solid #E1E6EA' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <Ban className="w-5 h-5" style={{ color: '#EF4444' }} />
              </div>
              <h3 className="text-lg" style={{ color: '#0A0F14', fontWeight: '600' }}>Reject Invoice</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: '#6E7A82' }}>
              Please provide a reason for rejecting this invoice.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Enter rejection reason..."
              className="w-full px-4 py-2 rounded-lg mb-4"
              style={{ border: '1px solid #E1E6EA', color: '#0A0F14', resize: 'vertical' }}
            />
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-6 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#E1E6EA', color: '#0A0F14' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#EF4444' }}
              >
                Reject Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" style={{ border: '2px solid #E1E6EA' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                <MessageSquare className="w-5 h-5" style={{ color: '#3B82F6' }} />
              </div>
              <h3 className="text-lg" style={{ color: '#0A0F14', fontWeight: '600' }}>Add Comment</h3>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Enter your comment..."
              className="w-full px-4 py-2 rounded-lg mb-4"
              style={{ border: '1px solid #E1E6EA', color: '#0A0F14', resize: 'vertical' }}
            />
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowCommentModal(false)}
                className="px-6 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#E1E6EA', color: '#0A0F14' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Comment added successfully');
                  setShowCommentModal(false);
                  setComment('');
                }}
                className="px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#00A9B7' }}
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}