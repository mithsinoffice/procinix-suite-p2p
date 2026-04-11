import { ArrowLeft, Plus, Trash2, X, Hash, Building2, User, FileText, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface CostCentre {
  id: string;
  costCentreCode: string;
  costCentreName: string;
  department: string;
  manager: string;
  budgetLimit: number;
  status: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  originalData?: CostCentre;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function CostCentreMaster() {
  const navigate = useNavigate();
  const [costCentres, setCostCentres] = useIncrementalMasterRecords<CostCentre>('cost_centre_master', [
    { id: '1', costCentreCode: 'CC-IT-001', costCentreName: 'IT Infrastructure', department: 'IT', manager: 'Vikram Singh', budgetLimit: 5000000, status: 'Active', approvalStatus: 'Approved' },
    { id: '2', costCentreCode: 'CC-FIN-001', costCentreName: 'Finance Operations', department: 'Finance', manager: 'Priya Sharma', budgetLimit: 2000000, status: 'Active', approvalStatus: 'Approved' },
    { id: '3', costCentreCode: 'CC-PROC-001', costCentreName: 'Procurement Division', department: 'Procurement', manager: 'Rajesh Kumar', budgetLimit: 8000000, status: 'Active', approvalStatus: 'Approved' },
    { id: '4', costCentreCode: 'CC-MFG-001', costCentreName: 'Manufacturing Unit A', department: 'Manufacturing', manager: 'Amit Patel', budgetLimit: 15000000, status: 'Active', approvalStatus: 'Pending Approval' },
    { id: '5', costCentreCode: 'CC-MKT-001', costCentreName: 'Marketing Campaigns', department: 'Marketing', manager: 'Sneha Verma', budgetLimit: 3500000, status: 'Active', approvalStatus: 'Draft' }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [costCentreCode, setCostCentreCode] = useState('');
  const [costCentreName, setCostCentreName] = useState('');
  const [department, setDepartment] = useState('');
  const [manager, setManager] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [status, setStatus] = useState('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);


  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<CostCentre | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);

  // Mock departments for dropdown
  const departments = [
    'IT', 'Finance', 'Procurement', 'Manufacturing', 'Marketing', 
    'Operations', 'Admin', 'Facilities', 'HR', 'Sales'
  ];

  const handleSubmit = (approvalStatus: CostCentre['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = costCentres.find(c => c.id === editingId);
      
      const updatedCostCentre: CostCentre = {
        id: editingId,
        costCentreCode,
        costCentreName,
        department,
        manager,
        budgetLimit: parseFloat(budgetLimit),
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };
      
      setCostCentres(costCentres.map(c => c.id === editingId ? updatedCostCentre : c));
    } else {
      const newCostCentre: CostCentre = {
        id: Date.now().toString(),
        costCentreCode,
        costCentreName,
        department,
        manager,
        budgetLimit: parseFloat(budgetLimit),
        status,
        approvalStatus,
        entityMappings,
      };
      setCostCentres([...costCentres, newCostCentre]);
    }
    
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setCostCentreCode('');
    setCostCentreName('');
    setDepartment('');
    setManager('');
    setBudgetLimit('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (costCentre: CostCentre) => {
    setIsEditMode(true);
    setEditingId(costCentre.id);
    setCostCentreCode(costCentre.costCentreCode);
    setCostCentreName(costCentre.costCentreName);
    setDepartment(costCentre.department);
    setManager(costCentre.manager);
    setBudgetLimit(costCentre.budgetLimit.toString());
    setStatus(costCentre.status);
    setEntityMappings(costCentre.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const costCentre = costCentres.find(c => c.id === id);
    
    if (costCentre?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this cost centre?')) {
      setCostCentres(costCentres.filter(c => c.id !== id));
    }
  };

  const handleReview = (costCentre: CostCentre) => {
    const changes: Change[] = [];
    
    if (costCentre.originalData) {
      const orig = costCentre.originalData;
      if (orig.costCentreCode !== costCentre.costCentreCode) changes.push({ field: 'Cost Centre Code', oldValue: orig.costCentreCode, newValue: costCentre.costCentreCode });
      if (orig.costCentreName !== costCentre.costCentreName) changes.push({ field: 'Cost Centre Name', oldValue: orig.costCentreName, newValue: costCentre.costCentreName });
      if (orig.department !== costCentre.department) changes.push({ field: 'Department', oldValue: orig.department, newValue: costCentre.department });
      if (orig.manager !== costCentre.manager) changes.push({ field: 'Manager', oldValue: orig.manager, newValue: costCentre.manager });
      if (orig.budgetLimit !== costCentre.budgetLimit) changes.push({ field: 'Budget Limit', oldValue: `₹${orig.budgetLimit.toLocaleString('en-IN')}`, newValue: `₹${costCentre.budgetLimit.toLocaleString('en-IN')}` });
      if (orig.status !== costCentre.status) changes.push({ field: 'Status', oldValue: orig.status, newValue: costCentre.status });
    }
    
    setDetectedChanges(changes);
    setCurrentReviewRecord(costCentre);
    setShowApprovalModal(true);
  };

  const handleApprovalAction = async (action: 'approve' | 'reject' | 'moreinfo', comments: string) => {
    if (!currentReviewRecord) return;

    const nextRecords = await applyMasterApprovalAction(
      'cost_centre_master',
      costCentres,
      currentReviewRecord.id,
      action === 'moreinfo' ? 'request_info' : action,
      comments,
    );
    setCostCentres(nextRecords);

    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
    setDetectedChanges([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'var(--color-teal)';
      case 'Inactive': return 'var(--color-mercury-grey)';
      default: return 'var(--color-mercury-grey)';
    }
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'var(--color-slate)';
      case 'Pending Approval': return '#F59E0B';
      case 'Approved': return 'var(--color-teal)';
      case 'Rejected': return '#EF4444';
      default: return 'var(--color-mercury-grey)';
    }
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [costCentreCode, costCentreName, department, manager, budgetLimit];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [costCentreCode, costCentreName, department, manager, budgetLimit]);

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
        title={isEditMode ? 'Edit Cost Centre' : 'Create Cost Centre'}
        subtitle="Manage cost centres linked to departments"
        modeLabel={isEditMode ? 'Edit Master Record' : 'Create Master Record'}
        draftStatus={isEditMode ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => setShowForm(false)}
        onCancel={() => { setShowForm(false); resetForm(); }}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="Identification" columns={2}>
          <PxFormField label="Cost Centre Code" required filled={!!costCentreCode.trim()}>
            <input type="text" value={costCentreCode} onChange={(e) => setCostCentreCode(e.target.value)} placeholder="e.g., CC-IT-001" className="px-input" />
          </PxFormField>
          <PxFormField label="Cost Centre Name" required filled={!!costCentreName.trim()}>
            <input type="text" value={costCentreName} onChange={(e) => setCostCentreName(e.target.value)} placeholder="e.g., IT Infrastructure" className="px-input" />
          </PxFormField>
        </FormSection>

        <FormSection title="Classification" columns={2}>
          <PxFormField label="Department" required filled={!!department}>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="px-select">
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Manager" required filled={!!manager.trim()}>
            <input type="text" value={manager} onChange={(e) => setManager(e.target.value)} placeholder="Manager name" className="px-input" />
          </PxFormField>
          <PxFormField label="Budget Limit (₹)" required filled={!!budgetLimit.trim()}>
            <input type="number" value={budgetLimit} onChange={(e) => setBudgetLimit(e.target.value)} placeholder="e.g., 5000000" className="px-input" />
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
          <button 
            onClick={() => navigate('/masters')} 
            className="p-2 rounded-lg transition-colors hover:bg-white" 
            style={{ color: 'var(--color-mercury-grey)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>Cost Centre Master</h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Manage cost centres linked to departments</p>
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
          Add Cost Centre
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '2px solid var(--color-silver)' }}>
        <table className="w-full">
          <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
            <tr>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Code
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Cost Centre Name
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Department
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Manager
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Budget Limit
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Status
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Approval Status
              </th>
              <th className="text-center px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {costCentres.map((costCentre) => (
              <tr key={costCentre.id} style={{ borderTop: '1px solid var(--color-silver)' }}>
                <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    {costCentre.costCentreCode}
                  </div>
                </td>
                <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{costCentre.costCentreName}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                    <Building2 className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    {costCentre.department}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                    <User className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    {costCentre.manager}
                  </div>
                </td>
                <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                  ₹{costCentre.budgetLimit.toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4">
                  <span 
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: `${getStatusColor(costCentre.status)}20`,
                      color: getStatusColor(costCentre.status),
                      fontWeight: '600'
                    }}
                  >
                    {costCentre.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span 
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: `${getApprovalStatusColor(costCentre.approvalStatus)}20`,
                      color: getApprovalStatusColor(costCentre.approvalStatus),
                      fontWeight: '600'
                    }}
                  >
                    {costCentre.approvalStatus}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {costCentre.approvalStatus === 'Pending Approval' && (
                      <button
                        onClick={() => handleReview(costCentre)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--color-teal)', backgroundColor: 'var(--color-teal)10' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)20'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)10'}
                        title="Review Changes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(costCentre)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-mercury-grey)', backgroundColor: 'var(--color-cloud)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-silver)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-cloud)'}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(costCentre.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#EF4444', backgroundColor: 'var(--color-error-light)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FECACA'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-error-light)'}
                      title="Delete"
                      disabled={costCentre.approvalStatus === 'Approved'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4" style={{ border: '2px solid var(--color-silver)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl" style={{ color: 'var(--color-ink)' }}>
                {isEditMode ? 'Edit Cost Centre' : 'Add New Cost Centre'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Cost Centre Code <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="text"
                    value={costCentreCode}
                    onChange={(e) => setCostCentreCode(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    placeholder="e.g., CC-IT-001"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Cost Centre Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="text"
                    value={costCentreName}
                    onChange={(e) => setCostCentreName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    placeholder="e.g., IT Infrastructure"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Department <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Manager <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="text"
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    placeholder="Manager name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Budget Limit (₹) <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="number"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    placeholder="e.g., 5000000"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Status <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2 rounded-lg transition-colors"
                  style={{ border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
                >
                  {isEditMode ? 'Update Cost Centre' : 'Add Cost Centre'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && currentReviewRecord && (
        <ApprovalModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setCurrentReviewRecord(null);
            setDetectedChanges([]);
          }}
          recordType="Cost Centre"
          recordName={currentReviewRecord.costCentreName}
          changes={detectedChanges}
          onApprove={(comments) => handleApprovalAction('approve', comments)}
          onReject={(comments) => handleApprovalAction('reject', comments)}
          onMoreInfo={(comments) => handleApprovalAction('moreinfo', comments)}
        />
      )}
    </div>
  );
}
