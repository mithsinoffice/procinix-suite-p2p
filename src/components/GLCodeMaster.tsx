import { ArrowLeft, Plus, Trash2, X, Hash, Briefcase, User, FileText, Edit, Eye } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { useNavigate } from 'react-router-dom';
import { MasterPageShell } from './ui/MasterPageShell';
import { useState, useMemo, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface GLCode {
  id: string;
  glCode: string;
  glDescription: string;
  glType: string;
  entityId: string;
  entityName?: string;
  status: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  entityMappings?: EntityScopeMapping[];
  originalData?: GLCode;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

const GL_TYPE_OPTIONS = [
  'expense', 'asset', 'liability', 'revenue', 'cogs', 'tax', 'stock', 'bank', 'other',
];

export function GLCodeMaster() {
  const navigate = useNavigate();
  const [glCodes, setGlCodes] = useIncrementalMasterRecords<GLCode>('gl_code_master', [
    { id: '1', glCode: '5001', glDescription: 'Office Expenses', glType: 'expense', entityId: '', status: 'Active', approvalStatus: 'Approved' },
    { id: '2', glCode: '1501', glDescription: 'Input GST', glType: 'tax', entityId: '', status: 'Active', approvalStatus: 'Approved' },
    { id: '3', glCode: '4001', glDescription: 'Cost of Goods Sold', glType: 'cogs', entityId: '', status: 'Active', approvalStatus: 'Approved' },
    { id: '4', glCode: '1401', glDescription: 'Raw Material Stock', glType: 'stock', entityId: '', status: 'Active', approvalStatus: 'Approved' },
    { id: '5', glCode: '3001', glDescription: 'Revenue - Sales', glType: 'revenue', entityId: '', status: 'Active', approvalStatus: 'Approved' },
    { id: '6', glCode: '2001', glDescription: 'Fixed Assets', glType: 'asset', entityId: '', status: 'Active', approvalStatus: 'Approved' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [glCode, setGlCode] = useState('');
  const [glDescription, setGlDescription] = useState('');
  const [glType, setGlType] = useState('expense');
  const [status, setStatus] = useState('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<GLCode | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredGlCodes = useMemo(() => {
    return glCodes.filter((gl) => {
      const haystack = [gl.glCode, gl.glDescription, gl.glType, gl.status, gl.approvalStatus].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(gl.status);
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(gl.approvalStatus);
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [glCodes, searchTerm, statusFilter, approvalFilter]);

  const handleSubmit = (approvalStatus: GLCode['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = glCodes.find(g => g.id === editingId);

      const updatedGl: GLCode = {
        id: editingId,
        glCode,
        glDescription,
        glType,
        entityId: '',
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };

      setGlCodes(glCodes.map(g => g.id === editingId ? updatedGl : g));
    } else {
      const newGl: GLCode = {
        id: Date.now().toString(),
        glCode,
        glDescription,
        glType,
        entityId: '',
        status,
        approvalStatus,
        entityMappings,
      };
      setGlCodes([...glCodes, newGl]);
    }

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setGlCode('');
    setGlDescription('');
    setGlType('expense');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (gl: GLCode) => {
    setIsEditMode(true);
    setEditingId(gl.id);
    setGlCode(gl.glCode || '');
    setGlDescription(gl.glDescription || '');
    setGlType(gl.glType || 'expense');
    setStatus(gl.status || 'Active');
    setEntityMappings(gl.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const gl = glCodes.find(g => g.id === id);

    if (gl?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }

    setGlCodes(glCodes.filter(g => g.id !== id));
  };

  const handleReview = (gl: GLCode) => {
    const changes: Change[] = [];

    if (gl.originalData) {
      const original = gl.originalData;

      if (original.glCode !== gl.glCode) {
        changes.push({ field: 'GL Code', oldValue: original.glCode, newValue: gl.glCode });
      }
      if (original.glDescription !== gl.glDescription) {
        changes.push({ field: 'GL Description', oldValue: original.glDescription, newValue: gl.glDescription });
      }
      if (original.glType !== gl.glType) {
        changes.push({ field: 'GL Type', oldValue: original.glType, newValue: gl.glType });
      }
      if (original.status !== gl.status) {
        changes.push({ field: 'Status', oldValue: original.status, newValue: gl.status });
      }
    }

    setCurrentReviewRecord(gl);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('gl_code_master', glCodes, currentReviewRecord.id, 'approve');
      setGlCodes(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('gl_code_master', glCodes, currentReviewRecord.id, 'reject');
      setGlCodes(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', '');
      if (comments === null) {
        return;
      }
      const nextRecords = await applyMasterApprovalAction('gl_code_master', glCodes, currentReviewRecord.id, 'request_info', comments);
      setGlCodes(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const getStatusBadgeStyle = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'Approved':
        return { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Pending Approval':
        return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
      case 'Rejected':
        return { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
      default:
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
    }
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [glCode, glDescription, glType, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [glCode, glDescription, glType, status]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSubmit]);

  useFormKeyboardSave(handleSaveDraft);

  if (showForm) {
    return (
      <FormShell masterName="GL Code Master"
        title={editingId ? 'Edit GL Code' : 'Create GL Code'}
        subtitle="Manage GL codes with approval workflow"
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
        <FormSection title="GL Code Details" columns={2}>
          <PxFormField label="GL Code" required filled={!!glCode.trim()}>
            <input type="text" value={glCode} onChange={(e) => setGlCode(e.target.value)} placeholder="e.g., 5001" className="px-input" />
          </PxFormField>
          <PxFormField label="GL Description" required filled={!!glDescription.trim()}>
            <input type="text" value={glDescription} onChange={(e) => setGlDescription(e.target.value)} placeholder="e.g., Office Expenses" className="px-input" />
          </PxFormField>
          <PxFormField label="GL Type" required filled={!!glType}>
            <select value={glType} onChange={(e) => setGlType(e.target.value)} className="px-select">
              {GL_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
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
    <MasterPageShell masterName="GL Code Master" description="Manage general ledger codes for accounting and entity mapping">
      <div className="flex items-center justify-end mb-8">
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
          Add GL Code
        </button>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="GL Code Master"
        recordId={currentReviewRecord?.glCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="GL Code Master"
        masterKey="gl_code_master"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          { key: 'status', label: 'Status', options: ['Active', 'Inactive'], selected: statusFilter },
          { key: 'approval', label: 'Approval', options: ['Draft', 'Pending Approval', 'Approved', 'Rejected'], selected: approvalFilter },
        ]}
        onFilterChange={(key, values) => {
          if (key === 'status') setStatusFilter(values);
          if (key === 'approval') setApprovalFilter(values);
        }}
        records={filteredGlCodes}
        columns={[
          { key: 'glCode', label: 'GL Code' },
          { key: 'glDescription', label: 'GL Description' },
          { key: 'glType', label: 'GL Type' },
          { key: 'entityId', label: 'Entity ID' },
          { key: 'entityName', label: 'Entity Name' },
          { key: 'status', label: 'Status' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>GL Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>GL Description</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>GL Type</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Approval Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGlCodes.map((gl, index) => (
                <tr key={gl.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{gl.glCode}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{gl.glDescription}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'var(--color-cloud)', color: 'var(--color-ink)' }}>
                      {gl.glType ? gl.glType.charAt(0).toUpperCase() + gl.glType.slice(1) : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: gl.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA', color: gl.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)' }}>
                      {gl.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getStatusBadgeStyle(gl.approvalStatus)}>
                      {gl.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {gl.approvalStatus === 'Pending Approval' && (
                        <button onClick={() => handleReview(gl)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-teal)' }} title="Review Changes">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleEdit(gl)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(gl.id)} className="p-2 rounded-lg transition-colors" style={{ color: gl.approvalStatus === 'Approved' ? '#C4C4C4' : 'var(--color-error)', cursor: gl.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer' }} title={gl.approvalStatus === 'Approved' ? 'Cannot delete approved records' : 'Delete'} disabled={gl.approvalStatus === 'Approved'}>
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
    </MasterPageShell>
  );
}
