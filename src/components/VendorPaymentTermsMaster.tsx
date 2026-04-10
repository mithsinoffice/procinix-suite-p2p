import { ArrowLeft, Plus, Trash2, X, Hash, Type, FileText, Edit, Calendar, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { ApprovalModal } from './ApprovalModal';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { MasterFormPage } from './ui/MasterFormPage';

interface PaymentTerm {
  id: string;
  code: string;
  description: string;
  creditDays: string;
  status: string;
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Changes Requested';
  originalData?: PaymentTerm;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function VendorPaymentTermsMaster() {
  const navigate = useNavigate();
  const [paymentTerms, setPaymentTerms] = useIncrementalMasterRecords<PaymentTerm>('vendor_payment_terms_master', [
    { id: '1', code: 'NET15', description: 'Payment due in 15 days', creditDays: '15', status: 'Active', approvalStatus: 'Approved' },
    { id: '2', code: 'NET30', description: 'Payment due in 30 days', creditDays: '30', status: 'Active', approvalStatus: 'Approved' }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [creditDays, setCreditDays] = useState('');
  const [status, setStatus] = useState('Active');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<PaymentTerm | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);

  const handleSubmit = (approvalStatus: PaymentTerm['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = paymentTerms.find((term) => term.id === editingId);
      const updatedTerm: PaymentTerm = {
        id: editingId,
        code,
        description,
        creditDays,
        status,
        approvalStatus,
        originalData: originalRecord
      };
      
      setPaymentTerms(paymentTerms.map(t => t.id === editingId ? updatedTerm : t));
    } else {
      const newTerm: PaymentTerm = {
        id: Date.now().toString(),
        code,
        description,
        creditDays,
        status,
        approvalStatus
      };
      setPaymentTerms([...paymentTerms, newTerm]);
    }
    
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setCode('');
    setDescription('');
    setCreditDays('');
    setStatus('Active');
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (term: PaymentTerm) => {
    setIsEditMode(true);
    setEditingId(term.id);
    setCode(term.code);
    setDescription(term.description);
    setCreditDays(term.creditDays);
    setStatus(term.status);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const term = paymentTerms.find((item) => item.id === id);
    if ((term?.approvalStatus ?? 'Approved') === 'Approved') {
      alert('Cannot delete approved/live records. Submit an edit and approve it through workflow.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this payment term?')) {
      setPaymentTerms(paymentTerms.filter(t => t.id !== id));
    }
  };

  const handleReview = (term: PaymentTerm) => {
    const changes: Change[] = [];
    const original = term.originalData;
    if (original) {
      if (original.code !== term.code) changes.push({ field: 'Term Code', oldValue: original.code, newValue: term.code });
      if (original.description !== term.description) changes.push({ field: 'Description', oldValue: original.description, newValue: term.description });
      if (original.creditDays !== term.creditDays) changes.push({ field: 'Credit Days', oldValue: original.creditDays, newValue: term.creditDays });
      if (original.status !== term.status) changes.push({ field: 'Status', oldValue: original.status, newValue: term.status });
    }
    setCurrentReviewRecord(term);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('vendor_payment_terms_master', paymentTerms, currentReviewRecord.id, 'approve');
    setPaymentTerms(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('vendor_payment_terms_master', paymentTerms, currentReviewRecord.id, 'reject');
    setPaymentTerms(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (!currentReviewRecord) return;
    const comments = window.prompt('Enter comments for the request:', '');
    if (comments === null) return;
    const nextRecords = await applyMasterApprovalAction('vendor_payment_terms_master', paymentTerms, currentReviewRecord.id, 'request_info', comments);
    setPaymentTerms(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const getApprovalBadgeStyle = (approvalStatus?: string) => {
    switch (approvalStatus) {
      case 'Pending Approval':
        return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Rejected':
        return { backgroundColor: '#FFE8EA', color: '#FF4E5B' };
      case 'Changes Requested':
        return { backgroundColor: '#E0F2FE', color: '#0284C7' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: '#6E7A82' };
      default:
        return { backgroundColor: '#E8F7F8', color: '#00A9B7' };
    }
  };

  if (showForm) {
    return (
      <MasterFormPage
        title={isEditMode ? 'Edit Payment Term' : 'Create Payment Term'}
        subtitle="Manage vendor payment terms and credit periods"
        modeLabel={isEditMode ? 'Edit Master Record' : 'Create Master Record'}
        onBack={() => setShowForm(false)}
        onCancel={() => {
          setShowForm(false);
          resetForm();
        }}
        onSaveDraft={() => handleSubmit('Draft')}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Term Code <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g., NET15" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Credit Days <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="number" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} placeholder="e.g., 15" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Description <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Payment due in 15 days" className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Status <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full pl-10 pr-3 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </MasterFormPage>
    );
  }

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/masters')} className="p-2 rounded-lg transition-colors" style={{ color: '#6E7A82' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Vendor Payment Terms Master</h1>
            <p style={{ color: '#6E7A82' }}>Manage vendor payment terms and credit periods</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#00A9B7' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
        >
          <Plus className="w-5 h-5" />
          Add Payment Term
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: '#E1E6EA' }}>
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>
                {isEditMode ? 'Edit Payment Term' : 'Add New Payment Term'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg transition-colors" style={{ color: '#6E7A82' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Term Code <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g., NET15" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Credit Days <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input type="number" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} placeholder="e.g., 15" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Description <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Payment due in 15 days" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Status <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderColor: '#E1E6EA' }}>
              <button onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg transition-colors" style={{ border: '1px solid #E1E6EA', color: '#6E7A82', backgroundColor: 'white' }}>
                Cancel
              </button>
              <button onClick={() => handleSubmit('Draft')} className="px-6 py-2 rounded-lg transition-colors" style={{ border: '1px solid #BFE8EC', color: '#0F8A95', backgroundColor: '#ECFEFF', fontWeight: 700 }}>
                Save Draft
              </button>
              <button onClick={() => handleSubmit('Pending Approval')} className="px-6 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: '#00A9B7' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Term Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Description</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Credit Days</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentTerms.map((term, index) => (
                <tr key={term.id} style={{ borderTop: index === 0 ? 'none' : '1px solid #E1E6EA' }}>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>{term.code}</td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>{term.description}</td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>{term.creditDays} days</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: term.status === 'Active' ? '#E8F7F8' : '#E5E7EB', color: term.status === 'Active' ? '#00A9B7' : '#6E7A82' }}>
                      {term.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getApprovalBadgeStyle(term.approvalStatus)}>
                      {term.approvalStatus ?? 'Approved'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(term)} className="p-2 rounded-lg transition-colors" style={{ color: '#6E7A82' }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      {(term.approvalStatus === 'Pending Approval' || term.approvalStatus === 'Changes Requested' || term.approvalStatus === 'Draft') && (
                        <button onClick={() => handleReview(term)} className="p-2 rounded-lg transition-colors" style={{ color: '#00A9B7' }} title="Review Changes">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(term.id)} className="p-2 rounded-lg transition-colors" style={{ color: '#FF4E5B' }} title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Vendor Payment Terms Master"
        recordId={currentReviewRecord?.id ?? ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />
    </div>
  );
}
