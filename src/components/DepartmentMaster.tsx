import { ArrowLeft, Plus, Trash2, X, Hash, Briefcase, User, FileText, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { MasterFormPage } from './ui/MasterFormPage';

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
        originalData: originalRecord
      };
      
      setDepartments(departments.map(d => d.id === editingId ? updatedDept : d));
    } else {
      const newDept: Department = {
        id: Date.now().toString(),
        deptCode,
        deptName,
        headOfDept,
        status,
        approvalStatus
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
        return { backgroundColor: '#E8F7F8', color: '#00A9B7' };
      case 'Pending Approval':
        return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: '#6E7A82' };
      case 'Rejected':
        return { backgroundColor: '#FFE8EA', color: '#FF4E5B' };
      default:
        return { backgroundColor: '#E5E7EB', color: '#6E7A82' };
    }
  };

  if (showForm) {
    return (
      <MasterFormPage
        title="Department Master"
        subtitle="Manage departments with approval workflow"
        modeLabel={isEditMode ? 'Edit Department' : 'Create Department'}
        onBack={() => setShowForm(false)}
        onCancel={() => setShowForm(false)}
        onSaveDraft={() => handleSubmit('Draft')}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
      >
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Department Code <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} placeholder="e.g., HR" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Department Name <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g., Human Resources" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Head of Department</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={headOfDept} onChange={(e) => setHeadOfDept(e.target.value)} placeholder="Department head name" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
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
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Department Master</h1>
            <p style={{ color: '#6E7A82' }}>Manage departments with approval workflow</p>
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
          Add Department
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: '#E1E6EA' }}>
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>
                {isEditMode ? 'Edit Department' : 'Add New Department'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg transition-colors" style={{ color: '#6E7A82' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Department Code <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input type="text" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} placeholder="e.g., HR" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Department Name <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g., Human Resources" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Head of Department</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input type="text" value={headOfDept} onChange={(e) => setHeadOfDept(e.target.value)} placeholder="Department head name" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
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
              <button onClick={handleSubmit} className="px-6 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: '#00A9B7' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}>
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

      <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Dept Code</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Department Name</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Head of Department</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Approval Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, index) => (
                <tr key={dept.id} style={{ borderTop: index === 0 ? 'none' : '1px solid #E1E6EA' }}>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>{dept.deptCode}</td>
                  <td className="px-6 py-4" style={{ color: '#0A0F14' }}>{dept.deptName}</td>
                  <td className="px-6 py-4" style={{ color: '#6E7A82' }}>{dept.headOfDept}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: dept.status === 'Active' ? '#E8F7F8' : '#FFE8EA', color: dept.status === 'Active' ? '#00A9B7' : '#FF4E5B' }}>
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
                        <button onClick={() => handleReview(dept)} className="p-2 rounded-lg transition-colors" style={{ color: '#00A9B7' }} title="Review Changes">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleEdit(dept)} className="p-2 rounded-lg transition-colors" style={{ color: '#6E7A82' }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(dept.id)} className="p-2 rounded-lg transition-colors" style={{ color: dept.approvalStatus === 'Approved' ? '#C4C4C4' : '#FF4E5B', cursor: dept.approvalStatus === 'Approved' ? 'not-allowed' : 'pointer' }} title={dept.approvalStatus === 'Approved' ? 'Cannot delete approved records' : 'Delete'} disabled={dept.approvalStatus === 'Approved'}>
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
