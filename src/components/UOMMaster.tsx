import { ArrowLeft, Plus, Trash2, X, Hash, Type, FileText, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { ApprovalModal } from './ApprovalModal';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface UOM {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  approvalStatus?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Changes Requested';
  originalData?: UOM;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function UOMMaster() {
  const navigate = useNavigate();
  const [uoms, setUOMs] = useIncrementalMasterRecords<UOM>('uom_master', [
    { id: '1', code: 'KG', name: 'Kilogram', description: 'Unit of weight measurement', status: 'Active', approvalStatus: 'Approved' },
    { id: '2', code: 'LITRE', name: 'Litre', description: 'Unit of volume measurement', status: 'Active', approvalStatus: 'Approved' },
    { id: '3', code: 'NOS', name: 'Numbers', description: 'Count of items', status: 'Active', approvalStatus: 'Approved' },
    { id: '4', code: 'HOUR', name: 'Hour', description: 'Unit of time for services', status: 'Active', approvalStatus: 'Approved' },
    { id: '5', code: 'MT', name: 'Metric Ton', description: '1000 kilograms', status: 'Active', approvalStatus: 'Approved' },
    { id: '6', code: 'PKT', name: 'Packet', description: 'Standard packet', status: 'Active', approvalStatus: 'Approved' },
    { id: '7', code: 'BOX', name: 'Box', description: 'Standard box or carton', status: 'Active', approvalStatus: 'Approved' }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<UOM | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);

  const handleSubmit = (approvalStatus: NonNullable<UOM['approvalStatus']> = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = uoms.find((uom) => uom.id === editingId);
      const updatedUOM: UOM = {
        id: editingId,
        code,
        name,
        description,
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };
      
      setUOMs(uoms.map(u => u.id === editingId ? updatedUOM : u));
    } else {
      const newUOM: UOM = {
        id: Date.now().toString(),
        code,
        name,
        description,
        status,
        approvalStatus,
        entityMappings,
      };
      setUOMs([...uoms, newUOM]);
    }
    
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setDescription('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (uom: UOM) => {
    setIsEditMode(true);
    setEditingId(uom.id);
    setCode(uom.code);
    setName(uom.name);
    setDescription(uom.description);
    setStatus(uom.status);
    setEntityMappings(uom.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const uom = uoms.find((item) => item.id === id);
    if ((uom?.approvalStatus ?? 'Approved') === 'Approved') {
      alert('Cannot delete approved/live records. Submit an edit and approve it through workflow.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this UOM?')) {
      setUOMs(uoms.filter(u => u.id !== id));
    }
  };

  const handleReview = (uom: UOM) => {
    const changes: Change[] = [];
    const original = uom.originalData;
    if (original) {
      if (original.code !== uom.code) changes.push({ field: 'UOM Code', oldValue: original.code, newValue: uom.code });
      if (original.name !== uom.name) changes.push({ field: 'UOM Name', oldValue: original.name, newValue: uom.name });
      if (original.description !== uom.description) changes.push({ field: 'Description', oldValue: original.description, newValue: uom.description });
      if (original.status !== uom.status) changes.push({ field: 'Status', oldValue: original.status, newValue: uom.status });
    }
    setCurrentReviewRecord(uom);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('uom_master', uoms, currentReviewRecord.id, 'approve');
    setUOMs(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (!currentReviewRecord) return;
    const nextRecords = await applyMasterApprovalAction('uom_master', uoms, currentReviewRecord.id, 'reject');
    setUOMs(nextRecords);
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (!currentReviewRecord) return;
    const comments = window.prompt('Enter comments for the request:', '');
    if (comments === null) return;
    const nextRecords = await applyMasterApprovalAction('uom_master', uoms, currentReviewRecord.id, 'request_info', comments);
    setUOMs(nextRecords);
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
    const fields = [code, name, description];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [code, name, description]);

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
        title={editingId ? 'Edit UOM' : 'Create UOM'}
        subtitle="Manage units of measure for items and services"
        modeLabel={editingId ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={editingId ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => setShowForm(false)}
        onCancel={() => { setShowForm(false); resetForm(); }}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="UOM Details" columns={2}>
          <PxFormField label="UOM Code" required filled={!!code.trim()} hint="Unique identifier (auto-uppercased)">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g., KG" className="px-input" />
          </PxFormField>
          <PxFormField label="UOM Name" required filled={!!name.trim()}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Kilogram" className="px-input" />
          </PxFormField>
          <PxFormField label="Description" filled={!!description.trim()}>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the unit" className="px-input" />
          </PxFormField>
          <PxFormField label="Status" required filled={!!status}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-select">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </PxFormField>
                  <EntityMappingSelector value={entityMappings} onChange={setEntityMappings} />
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
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>UOM Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Manage units of measure for items and services</p>
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
          Add UOM
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--color-silver)' }}>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
                {isEditMode ? 'Edit UOM' : 'Add New UOM'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>UOM Code <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g., KG" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>UOM Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Kilogram" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Description</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the unit" className="w-full px-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Status <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderColor: 'var(--color-silver)' }}>
              <button onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg transition-colors" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)', backgroundColor: 'white' }}>
                Cancel
              </button>
              <button onClick={() => handleSubmit('Draft')} className="px-6 py-2 rounded-lg transition-colors" style={{ border: '1px solid #BFE8EC', color: '#0F8A95', backgroundColor: '#ECFEFF', fontWeight: 700 }}>
                Save Draft
              </button>
              <button onClick={() => handleSubmit('Pending Approval')} className="px-6 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: 'var(--color-teal)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>UOM Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>UOM Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Description</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Approval</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uoms.map((uom, index) => (
                <tr key={uom.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{uom.code}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{uom.name}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{uom.description}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: uom.status === 'Active' ? 'var(--color-teal-tint)' : '#E5E7EB', color: uom.status === 'Active' ? 'var(--color-teal)' : 'var(--color-mercury-grey)' }}>
                      {uom.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getApprovalBadgeStyle(uom.approvalStatus)}>
                      {uom.approvalStatus ?? 'Approved'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(uom)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      {(uom.approvalStatus === 'Pending Approval' || uom.approvalStatus === 'Changes Requested' || uom.approvalStatus === 'Draft') && (
                        <button onClick={() => handleReview(uom)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-teal)' }} title="Review Changes">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(uom.id)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-error)' }} title="Delete">
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
        recordType="UOM Master"
        recordId={currentReviewRecord?.id ?? ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />
    </div>
  );
}
