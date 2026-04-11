import { ArrowLeft, Plus, Trash2, X, Hash, Briefcase, User, FileText, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface Department {
  id: string;
  deptCode: string;
  deptName: string;
  headOfDept: string;
  status: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  originalData?: Department;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function DepartmentMaster() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useIncrementalMasterRecords<Department>('department_master', [
    { id: '1', deptCode: 'PROC', deptName: 'Procurement', headOfDept: 'Rajesh Kumar', status: 'Active', approvalStatus: 'Approved' },
    { id: '2', deptCode: 'FIN', deptName: 'Finance', headOfDept: 'Priya Sharma', status: 'Active', approvalStatus: 'Approved' },
    { id: '3', deptCode: 'WH', deptName: 'Warehouse', headOfDept: 'Amit Patel', status: 'Active', approvalStatus: 'Pending Approval' },
    { id: '4', deptCode: 'QC', deptName: 'Quality Control', headOfDept: 'Sneha Verma', status: 'Active', approvalStatus: 'Approved' },
    { id: '5', deptCode: 'IT', deptName: 'Information Technology', headOfDept: 'Vikram Singh', status: 'Active', approvalStatus: 'Draft' }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [headOfDept, setHeadOfDept] = useState('');
  const [status, setStatus] = useState('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);


  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Department | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);

  const handleSubmit = (approvalStatus: Department['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = departments.find(d => d.id === editingId);
      
      const updatedDept: Department = {
        id: editingId,
        deptCode,
        deptName,
        headOfDept,
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };
      
      setDepartments(departments.map(d => d.id === editingId ? updatedDept : d));
    } else {
      const newDept: Department = {
        id: Date.now().toString(),
        deptCode,
        deptName,
        headOfDept,
        status,
        approvalStatus,
        entityMappings,
      };
      setDepartments([...departments, newDept]);
    }
    
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setDeptCode('');
    setDeptName('');
    setHeadOfDept('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (dept: Department) => {
    setIsEditMode(true);
    setEditingId(dept.id);
    setDeptCode(dept.deptCode);
    setDeptName(dept.deptName);
    setHeadOfDept(dept.headOfDept);
    setStatus(dept.status);
    setEntityMappings(dept.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const dept = departments.find(d => d.id === id);
    
    if (dept?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    
    setDepartments(departments.filter(d => d.id !== id));
  };

  const handleReview = (dept: Department) => {
    const changes: Change[] = [];
    
    if (dept.originalData) {
      const original = dept.originalData;
      
      if (original.deptCode !== dept.deptCode) {
        changes.push({ field: 'Department Code', oldValue: original.deptCode, newValue: dept.deptCode });
      }
      if (original.deptName !== dept.deptName) {
        changes.push({ field: 'Department Name', oldValue: original.deptName, newValue: dept.deptName });
      }
      if (original.headOfDept !== dept.headOfDept) {
        changes.push({ field: 'Head of Department', oldValue: original.headOfDept, newValue: dept.headOfDept });
      }
      if (original.status !== dept.status) {
        changes.push({ field: 'Status', oldValue: original.status, newValue: dept.status });
      }
    }
    
    setCurrentReviewRecord(dept);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('department_master', departments, currentReviewRecord.id, 'approve');
      setDepartments(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('department_master', departments, currentReviewRecord.id, 'reject');
      setDepartments(nextRecords);
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
      const nextRecords = await applyMasterApprovalAction('department_master', departments, currentReviewRecord.id, 'request_info', comments);
      setDepartments(nextRecords);
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
    const fields = [deptCode, deptName, headOfDept, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [deptCode, deptName, headOfDept, status]);

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
        title={editingId ? 'Edit Department' : 'Create Department'}
        subtitle="Manage departments with approval workflow"
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
        <FormSection title="Department Details" columns={2}>
          <PxFormField label="Department Code" required filled={!!deptCode.trim()}>
            <input type="text" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} placeholder="e.g., HR" className="px-input" />
          </PxFormField>
          <PxFormField label="Department Name" required filled={!!deptName.trim()}>
            <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g., Human Resources" className="px-input" />
          </PxFormField>
          <PxFormField label="Head of Department" filled={!!headOfDept.trim()}>
            <input type="text" value={headOfDept} onChange={(e) => setHeadOfDept(e.target.value)} placeholder="Department head name" className="px-input" />
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
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>Department Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Manage departments with approval workflow</p>
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
          Add Department
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--color-silver)' }}>
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
                {isEditMode ? 'Edit Department' : 'Add New Department'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Department Code <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <input type="text" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} placeholder="e.g., HR" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Department Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g., Human Resources" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Head of Department</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <input type="text" value={headOfDept} onChange={(e) => setHeadOfDept(e.target.value)} placeholder="Department head name" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }} />
                  </div>
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
              <button onClick={handleSubmit} className="px-6 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: 'var(--color-teal)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}>
                {isEditMode ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Department Master"
        recordId={currentReviewRecord?.deptCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Dept Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Department Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Head of Department</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Approval Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, index) => (
                <tr key={dept.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{dept.deptCode}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{dept.deptName}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>{dept.headOfDept}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: dept.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA', color: dept.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)' }}>
                      {dept.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={getStatusBadgeStyle(dept.approvalStatus)}>
                      {dept.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {dept.approvalStatus === 'Pending Approval' && (
                        <button onClick={() => handleReview(dept)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-teal)' }} title="Review Changes">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleEdit(dept)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(dept.id)} className="p-2 rounded-lg transition-colors" style={{ color: dept.approvalStatus === 'Approved' ? '#C4C4C4' : 'var(--color-error)', cursor: dept.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer' }} title={dept.approvalStatus === 'Approved' ? 'Cannot delete approved records' : 'Delete'} disabled={dept.approvalStatus === 'Approved'}>
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
    </div>
  );
}
