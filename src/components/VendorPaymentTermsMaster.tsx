import { ArrowLeft, Plus, Trash2, X, Hash, Type, FileText, Edit, Calendar, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { ApprovalModal } from './ApprovalModal';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';

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
        return { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
      case 'Changes Requested':
        return { backgroundColor: '#E0F2FE', color: '#0284C7' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
      default:
        return { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
    }
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [code, description, creditDays, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [code, description, creditDays, status]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSubmit]);

  useFormKeyboardSave(handleSaveDraft);

  if (showForm) {
    return (
      <FormShell
        title={isEditMode ? 'Edit Payment Term' : 'Create Payment Term'}
        subtitle="Manage vendor payment terms and credit periods"
        modeLabel={isEditMode ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={isEditMode ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => setShowForm(false)}
        onCancel={() => {
          setShowForm(false);
          resetForm();
        }}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="Payment Term Details" columns={2}>
          <PxFormField label="Term Code" required filled={!!code.trim()}>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g., NET15" className="px-input" />
          </PxFormField>
          <PxFormField label="Credit Days" required filled={!!creditDays.trim()}>
            <input type="number" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} placeholder="e.g., 15" className="px-input" />
          </PxFormField>
          <PxFormField label="Description" required filled={!!description.trim()}>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Payment due in 15 days" className="px-input" />
          </PxFormField>
          <PxFormField label="Status" required filled={!!status}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-select">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </PxFormField>
        </FormSection>
      </FormShell>
    );
  }

  return (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/masters')} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>Vendor Payment Terms Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Manage vendor payment terms and credit periods</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
        >
          <Plus className="w-5 h-5" />
          Add Payment Term
        </button>
      </div>

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Term Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Description</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Credit Days</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentTerms.map((term, index) => (
                <tr key={term.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{term.code}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{term.description}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{term.creditDays} days</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: term.status === 'Active' ? 'var(--color-teal-tint)' : '#E5E7EB', color: term.status === 'Active' ? 'var(--color-teal)' : 'var(--color-mercury-grey)' }}>
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
                      <button onClick={() => handleEdit(term)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      {(term.approvalStatus === 'Pending Approval' || term.approvalStatus === 'Changes Requested' || term.approvalStatus === 'Draft') && (
                        <button onClick={() => handleReview(term)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-teal)' }} title="Review Changes">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(term.id)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-error)' }} title="Delete">
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
