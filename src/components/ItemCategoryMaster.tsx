import { ArrowLeft, Plus, Trash2, X, Hash, Type, FileText, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { ApprovalModal } from './ApprovalModal';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';

interface ItemCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Changes Requested';
  originalData?: ItemCategory;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function ItemCategoryMaster() {
  const navigate = useNavigate();
  const [categories, setCategories] = useIncrementalMasterRecords<ItemCategory>('item_category_master', [
    { id: '1', code: 'RAW-MAT', name: 'Raw Materials', description: 'Raw materials for production', status: 'Active', approvalStatus: 'Approved' },
    { id: '2', code: 'PKG', name: 'Packaging', description: 'Packaging materials and supplies', status: 'Active', approvalStatus: 'Approved' },
    { id: '3', code: 'SVC', name: 'Services', description: 'Professional and consulting services', status: 'Active', approvalStatus: 'Approved' }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<ItemCategory | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);

  const handleSubmit = (approvalStatus: NonNullable<ItemCategory['approvalStatus']> = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = categories.find((category) => category.id === editingId);
      const updatedCategory: ItemCategory = {
        id: editingId,
        code,
        name,
        description,
        status,
        approvalStatus,
        originalData: originalRecord
      };

      setCategories(categories.map(c => c.id === editingId ? updatedCategory : c));
    } else {
      const newCategory: ItemCategory = {
        id: Date.now().toString(),
        code,
        name,
        description,
        status,
        approvalStatus
      };
      setCategories([...categories, newCategory]);
    }

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setDescription('');
    setStatus('Active');
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (category: ItemCategory) => {
    setIsEditMode(true);
    setEditingId(category.id);
    setCode(category.code);
    setName(category.name);
    setDescription(category.description);
    setStatus(category.status);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const category = categories.find((item) => item.id === id);
    if ((category?.approvalStatus ?? 'Approved') === 'Approved') {
      alert('Cannot delete approved/live records. Submit an edit and approve it through workflow.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this category?')) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const handleReview = (category: ItemCategory) => {
    const changes: Change[] = [];
    const original = category.originalData;
    if (original) {
      if (original.code !== category.code) changes.push({ field: 'Category Code', oldValue: original.code, newValue: category.code });
      if (original.name !== category.name) changes.push({ field: 'Category Name', oldValue: original.name, newValue: category.name });
      if (original.description !== category.description) changes.push({ field: 'Description', oldValue: original.description, newValue: category.description });
      if (original.status !== category.status) changes.push({ field: 'Status', oldValue: original.status, newValue: category.status });
    }
    setCurrentReviewRecord(category);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('item_category_master', categories, currentReviewRecord.id, 'approve');
    setCategories(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('item_category_master', categories, currentReviewRecord.id, 'reject');
    setCategories(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (!currentReviewRecord) return;
    const comments = window.prompt('Enter comments for the request:', '');
    if (comments === null) return;
    const nextRecords = await applyMasterApprovalAction('item_category_master', categories, currentReviewRecord.id, 'request_info', comments);
    setCategories(nextRecords);
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
    const fields = [code, name, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [code, name, status]);

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
        title={isEditMode ? 'Edit Item Category' : 'Create Item Category'}
        subtitle="Manage procurement item categories"
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
        <FormSection title="Category Details" columns={2}>
          <PxFormField label="Category Code" required filled={!!code.trim()}>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g., RAW-MAT" className="px-input" />
          </PxFormField>
          <PxFormField label="Category Name" required filled={!!name.trim()}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Raw Materials" className="px-input" />
          </PxFormField>
          <PxFormField label="Description" filled={!!description.trim()}>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the category" className="px-input" />
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
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>Item Category Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Manage procurement item categories</p>
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
          Add Category
        </button>
      </div>

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Category Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Category Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Description</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => (
                <tr key={category.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{category.code}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{category.name}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{category.description}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: category.status === 'Active' ? 'var(--color-teal-tint)' : '#E5E7EB', color: category.status === 'Active' ? 'var(--color-teal)' : 'var(--color-mercury-grey)' }}>
                      {category.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getApprovalBadgeStyle(category.approvalStatus)}>
                      {category.approvalStatus ?? 'Approved'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(category)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      {(category.approvalStatus === 'Pending Approval' || category.approvalStatus === 'Changes Requested' || category.approvalStatus === 'Draft') && (
                        <button onClick={() => handleReview(category)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-teal)' }} title="Review Changes">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(category.id)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-error)' }} title="Delete">
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
        recordType="Item Category Master"
        recordId={currentReviewRecord?.id ?? ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />
    </div>
  );
}
