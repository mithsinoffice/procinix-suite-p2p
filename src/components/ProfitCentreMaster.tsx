import { ArrowLeft, Plus, Trash2, X, Hash, TrendingUp, User, Building2, Edit, Eye } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { useNavigate } from 'react-router-dom';
import { MasterPageShell } from './ui/MasterPageShell';
import { useState, useMemo, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface ProfitCentre {
  id: string;
  profitCentreCode: string;
  profitCentreName: string;
  department: string;
  headOfPC: string;
  revenueTarget: number;
  region: string;
  status: string;
  entityMappings?: EntityScopeMapping[];
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  originalData?: ProfitCentre;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function ProfitCentreMaster() {
  const navigate = useNavigate();
  const [profitCentres, setProfitCentres] = useIncrementalMasterRecords<ProfitCentre>('profit_centre_master', [
    { id: '1', profitCentreCode: 'PC-NORTH-001', profitCentreName: 'North Region Sales', department: 'Sales', headOfPC: 'Rahul Mehta', revenueTarget: 50000000, region: 'North', status: 'Active', approvalStatus: 'Approved' },
    { id: '2', profitCentreCode: 'PC-SOUTH-001', profitCentreName: 'South Region Sales', department: 'Sales', headOfPC: 'Lakshmi Iyer', revenueTarget: 45000000, region: 'South', status: 'Active', approvalStatus: 'Approved' },
    { id: '3', profitCentreCode: 'PC-EAST-001', profitCentreName: 'East Region Operations', department: 'Operations', headOfPC: 'Amit Bose', revenueTarget: 35000000, region: 'East', status: 'Active', approvalStatus: 'Approved' },
    { id: '4', profitCentreCode: 'PC-WEST-001', profitCentreName: 'West Region Manufacturing', department: 'Manufacturing', headOfPC: 'Priya Shah', revenueTarget: 60000000, region: 'West', status: 'Active', approvalStatus: 'Pending Approval' },
    { id: '5', profitCentreCode: 'PC-CORP-001', profitCentreName: 'Corporate Services', department: 'Finance', headOfPC: 'Sandeep Kumar', revenueTarget: 25000000, region: 'Corporate', status: 'Active', approvalStatus: 'Draft' }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [profitCentreCode, setProfitCentreCode] = useState('');
  const [profitCentreName, setProfitCentreName] = useState('');
  const [department, setDepartment] = useState('');
  const [headOfPC, setHeadOfPC] = useState('');
  const [revenueTarget, setRevenueTarget] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);


  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<ProfitCentre | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredProfitCentres = useMemo(() => {
    return profitCentres.filter((pc) => {
      const haystack = [pc.profitCentreCode, pc.profitCentreName, pc.department, pc.headOfPC, pc.region].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(pc.status);
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(pc.approvalStatus);
      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [profitCentres, searchTerm, statusFilter, approvalFilter]);

  // Mock departments for dropdown
  const departments = [
    'Sales', 'Operations', 'Manufacturing', 'Finance', 'Marketing', 
    'IT', 'Procurement', 'Admin', 'Facilities', 'HR'
  ];

  const regions = [
    'North', 'South', 'East', 'West', 'Central', 'Corporate'
  ];

  const handleSubmit = (approvalStatus: ProfitCentre['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = profitCentres.find(p => p.id === editingId);
      
      const updatedProfitCentre: ProfitCentre = {
        id: editingId,
        profitCentreCode,
        profitCentreName,
        department,
        headOfPC,
        revenueTarget: parseFloat(revenueTarget),
        region,
        status,
        approvalStatus,
        originalData: originalRecord,
        entityMappings,
      };
      
      setProfitCentres(profitCentres.map(p => p.id === editingId ? updatedProfitCentre : p));
    } else {
      const newProfitCentre: ProfitCentre = {
        id: Date.now().toString(),
        profitCentreCode,
        profitCentreName,
        department,
        headOfPC,
        revenueTarget: parseFloat(revenueTarget),
        region,
        status,
        approvalStatus,
        entityMappings,
      };
      setProfitCentres([...profitCentres, newProfitCentre]);
    }
    
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setProfitCentreCode('');
    setProfitCentreName('');
    setDepartment('');
    setHeadOfPC('');
    setRevenueTarget('');
    setRegion('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (profitCentre: ProfitCentre) => {
    setIsEditMode(true);
    setEditingId(profitCentre.id);
    setProfitCentreCode(profitCentre.profitCentreCode);
    setProfitCentreName(profitCentre.profitCentreName);
    setDepartment(profitCentre.department);
    setHeadOfPC(profitCentre.headOfPC);
    setRevenueTarget(profitCentre.revenueTarget.toString());
    setRegion(profitCentre.region);
    setStatus(profitCentre.status);
    setEntityMappings(profitCentre.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const profitCentre = profitCentres.find(p => p.id === id);
    
    if (profitCentre?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this profit centre?')) {
      setProfitCentres(profitCentres.filter(p => p.id !== id));
    }
  };

  const handleReview = (profitCentre: ProfitCentre) => {
    const changes: Change[] = [];
    
    if (profitCentre.originalData) {
      const orig = profitCentre.originalData;
      if (orig.profitCentreCode !== profitCentre.profitCentreCode) changes.push({ field: 'Profit Centre Code', oldValue: orig.profitCentreCode, newValue: profitCentre.profitCentreCode });
      if (orig.profitCentreName !== profitCentre.profitCentreName) changes.push({ field: 'Profit Centre Name', oldValue: orig.profitCentreName, newValue: profitCentre.profitCentreName });
      if (orig.department !== profitCentre.department) changes.push({ field: 'Department', oldValue: orig.department, newValue: profitCentre.department });
      if (orig.headOfPC !== profitCentre.headOfPC) changes.push({ field: 'Head of PC', oldValue: orig.headOfPC, newValue: profitCentre.headOfPC });
      if (orig.revenueTarget !== profitCentre.revenueTarget) changes.push({ field: 'Revenue Target', oldValue: `₹${orig.revenueTarget.toLocaleString('en-IN')}`, newValue: `₹${profitCentre.revenueTarget.toLocaleString('en-IN')}` });
      if (orig.region !== profitCentre.region) changes.push({ field: 'Region', oldValue: orig.region, newValue: profitCentre.region });
      if (orig.status !== profitCentre.status) changes.push({ field: 'Status', oldValue: orig.status, newValue: profitCentre.status });
    }
    
    setDetectedChanges(changes);
    setCurrentReviewRecord(profitCentre);
    setShowApprovalModal(true);
  };

  const handleApprovalAction = async (action: 'approve' | 'reject' | 'moreinfo', comments: string) => {
    if (!currentReviewRecord) return;

    const nextRecords = await applyMasterApprovalAction(
      'profit_centre_master',
      profitCentres,
      currentReviewRecord.id,
      action === 'moreinfo' ? 'request_info' : action,
      comments,
    );
    setProfitCentres(nextRecords);

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
    const fields = [profitCentreCode, profitCentreName, department, headOfPC, revenueTarget, region, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [profitCentreCode, profitCentreName, department, headOfPC, revenueTarget, region, status]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSubmit]);

  useFormKeyboardSave(handleSaveDraft);

  if (showForm) {
    return (
      <FormShell masterName="Profit Centre Master"
        title={isEditMode ? 'Edit Profit Centre' : 'Create Profit Centre'}
        subtitle="Manage profit centres linked to departments"
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
        <FormSection title="Profit Centre Details" columns={2}>
          <PxFormField label="Profit Centre Code" required filled={!!profitCentreCode.trim()} hint="Unique identifier for the profit centre">
            <input type="text" value={profitCentreCode} onChange={(e) => setProfitCentreCode(e.target.value)} placeholder="e.g., PC-NORTH-001" className="px-input" />
          </PxFormField>
          <PxFormField label="Profit Centre Name" required filled={!!profitCentreName.trim()}>
            <input type="text" value={profitCentreName} onChange={(e) => setProfitCentreName(e.target.value)} placeholder="e.g., North Region Sales" className="px-input" />
          </PxFormField>
          <PxFormField label="Department" required filled={!!department.trim()}>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="px-select">
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Head of PC" required filled={!!headOfPC.trim()}>
            <input type="text" value={headOfPC} onChange={(e) => setHeadOfPC(e.target.value)} placeholder="Head of profit centre" className="px-input" />
          </PxFormField>
          <PxFormField label="Revenue Target" required filled={!!revenueTarget.trim()} hint="Annual revenue target in INR">
            <input type="number" value={revenueTarget} onChange={(e) => setRevenueTarget(e.target.value)} placeholder="e.g., 50000000" className="px-input" />
          </PxFormField>
          <PxFormField label="Region" required filled={!!region.trim()}>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="px-select">
              <option value="">Select Region</option>
              {regions.map((regionValue) => (
                <option key={regionValue} value={regionValue}>{regionValue}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Status" required filled={!!status.trim()}>
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
    <MasterPageShell masterName="Profit Centre Master" description="Manage profit centres">
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
          Add Profit Centre
        </button>
      </div>

      <MasterListToolbar
        masterName="Profit Centre Master"
        masterKey="profit_centre_master"
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
        records={filteredProfitCentres}
        columns={[
          { key: 'profitCentreCode', label: 'Profit Centre Code' },
          { key: 'profitCentreName', label: 'Profit Centre Name' },
          { key: 'department', label: 'Department' },
          { key: 'headOfPC', label: 'Head of PC' },
          { key: 'revenueTarget', label: 'Revenue Target' },
          { key: 'region', label: 'Region' },
          { key: 'status', label: 'Status' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '2px solid var(--color-silver)' }}>
        <table className="w-full">
          <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
            <tr>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Code
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Profit Centre Name
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Department
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Head of PC
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Revenue Target
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Region
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
            {filteredProfitCentres.map((profitCentre) => (
              <tr key={profitCentre.id} style={{ borderTop: '1px solid var(--color-silver)' }}>
                <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    {profitCentre.profitCentreCode}
                  </div>
                </td>
                <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{profitCentre.profitCentreName}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                    <Building2 className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    {profitCentre.department}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                    <User className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    {profitCentre.headOfPC}
                  </div>
                </td>
                <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: '#10B981' }} />
                    ₹{profitCentre.revenueTarget.toLocaleString('en-IN')}
                  </div>
                </td>
                <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>{profitCentre.region}</td>
                <td className="px-6 py-4">
                  <span 
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: `${getStatusColor(profitCentre.status)}20`,
                      color: getStatusColor(profitCentre.status),
                      fontWeight: '600'
                    }}
                  >
                    {profitCentre.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span 
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: `${getApprovalStatusColor(profitCentre.approvalStatus)}20`,
                      color: getApprovalStatusColor(profitCentre.approvalStatus),
                      fontWeight: '600'
                    }}
                  >
                    {profitCentre.approvalStatus}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {profitCentre.approvalStatus === 'Pending Approval' && (
                      <button
                        onClick={() => handleReview(profitCentre)}
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
                      onClick={() => handleEdit(profitCentre)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-mercury-grey)', backgroundColor: 'var(--color-cloud)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-silver)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-cloud)'}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(profitCentre.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#EF4444', backgroundColor: 'var(--color-error-light)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FECACA'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-error-light)'}
                      title="Delete"
                      disabled={profitCentre.approvalStatus === 'Approved'}
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
                {isEditMode ? 'Edit Profit Centre' : 'Add New Profit Centre'}
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
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Profit Centre Code <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="text"
                    value={profitCentreCode}
                    onChange={(e) => setProfitCentreCode(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    placeholder="e.g., PC-NORTH-001"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Profit Centre Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="text"
                    value={profitCentreName}
                    onChange={(e) => setProfitCentreName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    placeholder="e.g., North Region Sales"
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
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Head of PC <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="text"
                    value={headOfPC}
                    onChange={(e) => setHeadOfPC(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    placeholder="Head name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Revenue Target (₹) <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="number"
                    value={revenueTarget}
                    onChange={(e) => setRevenueTarget(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    placeholder="e.g., 50000000"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Region <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                  >
                    <option value="">Select Region</option>
                    {regions.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>
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
                  onClick={() => handleSubmit()}
                  className="px-6 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
                >
                  {isEditMode ? 'Update Profit Centre' : 'Add Profit Centre'}
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
          recordType="Profit Centre"
          recordName={currentReviewRecord.profitCentreName}
          changes={detectedChanges}
          onApprove={(comments) => { void handleApprovalAction('approve', comments); }}
          onReject={(comments) => { void handleApprovalAction('reject', comments); }}
          onMoreInfo={(comments) => { void handleApprovalAction('moreinfo', comments); }}
        />
      )}
    </MasterPageShell>
  );
}
