import { ArrowLeft, Plus, Trash2, X, Hash, TrendingUp, User, Building2, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { MasterFormPage } from './ui/MasterFormPage';

interface ProfitCentre {
  id: string;
  profitCentreCode: string;
  profitCentreName: string;
  department: string;
  headOfPC: string;
  revenueTarget: number;
  region: string;
  status: string;
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

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<ProfitCentre | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);

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
        originalData: originalRecord
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
        approvalStatus
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
      case 'Active': return '#00A9B7';
      case 'Inactive': return '#6E7A82';
      default: return '#6E7A82';
    }
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return '#9AA6AF';
      case 'Pending Approval': return '#F59E0B';
      case 'Approved': return '#00A9B7';
      case 'Rejected': return '#EF4444';
      default: return '#6E7A82';
    }
  };

  if (showForm) {
    return (
      <MasterFormPage
        title={isEditMode ? 'Edit Profit Centre' : 'Create Profit Centre'}
        subtitle="Manage profit centres linked to departments"
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Profit Centre Code <span style={{ color: '#FF4E5B' }}>*</span></label>
              <input type="text" value={profitCentreCode} onChange={(e) => setProfitCentreCode(e.target.value)} className="w-full px-4 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} placeholder="e.g., PC-NORTH-001" />
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Profit Centre Name <span style={{ color: '#FF4E5B' }}>*</span></label>
              <input type="text" value={profitCentreName} onChange={(e) => setProfitCentreName(e.target.value)} className="w-full px-4 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} placeholder="e.g., North Region Sales" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Department <span style={{ color: '#FF4E5B' }}>*</span></label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-4 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Head of PC <span style={{ color: '#FF4E5B' }}>*</span></label>
              <input type="text" value={headOfPC} onChange={(e) => setHeadOfPC(e.target.value)} className="w-full px-4 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} placeholder="Head of profit centre" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Revenue Target (₹) <span style={{ color: '#FF4E5B' }}>*</span></label>
              <input type="number" value={revenueTarget} onChange={(e) => setRevenueTarget(e.target.value)} className="w-full px-4 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }} placeholder="e.g., 50000000" />
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Region <span style={{ color: '#FF4E5B' }}>*</span></label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-4 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
                <option value="">Select Region</option>
                {regions.map((regionValue) => (
                  <option key={regionValue} value={regionValue}>{regionValue}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Status <span style={{ color: '#FF4E5B' }}>*</span></label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl" style={{ border: '1px solid #D7E3EA', color: '#0A0F14', backgroundColor: '#FFFFFF' }}>
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
          <button 
            onClick={() => navigate('/masters')} 
            className="p-2 rounded-lg transition-colors hover:bg-white" 
            style={{ color: '#6E7A82' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl mb-1" style={{ color: '#0A0F14' }}>Profit Centre Master</h1>
            <p className="text-sm" style={{ color: '#6E7A82' }}>Manage profit centres linked to departments</p>
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
          Add Profit Centre
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '2px solid #E1E6EA' }}>
        <table className="w-full">
          <thead style={{ backgroundColor: '#F6F9FC' }}>
            <tr>
              <th className="text-left px-6 py-4 text-xs" style={{ color: '#6E7A82', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Code
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: '#6E7A82', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Profit Centre Name
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: '#6E7A82', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Department
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: '#6E7A82', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Head of PC
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: '#6E7A82', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Revenue Target
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: '#6E7A82', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Region
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: '#6E7A82', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Status
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: '#6E7A82', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Approval Status
              </th>
              <th className="text-center px-6 py-4 text-xs" style={{ color: '#6E7A82', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {profitCentres.map((profitCentre) => (
              <tr key={profitCentre.id} style={{ borderTop: '1px solid #E1E6EA' }}>
                <td className="px-6 py-4" style={{ color: '#0A0F14' }}>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" style={{ color: '#6E7A82' }} />
                    {profitCentre.profitCentreCode}
                  </div>
                </td>
                <td className="px-6 py-4" style={{ color: '#0A0F14' }}>{profitCentre.profitCentreName}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2" style={{ color: '#0A0F14' }}>
                    <Building2 className="w-4 h-4" style={{ color: '#6E7A82' }} />
                    {profitCentre.department}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2" style={{ color: '#0A0F14' }}>
                    <User className="w-4 h-4" style={{ color: '#6E7A82' }} />
                    {profitCentre.headOfPC}
                  </div>
                </td>
                <td className="px-6 py-4" style={{ color: '#0A0F14' }}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: '#10B981' }} />
                    ₹{profitCentre.revenueTarget.toLocaleString('en-IN')}
                  </div>
                </td>
                <td className="px-6 py-4" style={{ color: '#0A0F14' }}>{profitCentre.region}</td>
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
                        style={{ color: '#00A9B7', backgroundColor: '#00A9B710' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00A9B720'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B710'}
                        title="Review Changes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(profitCentre)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#6E7A82', backgroundColor: '#F6F9FC' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E1E6EA'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(profitCentre.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#EF4444', backgroundColor: '#FEE2E2' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FECACA'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
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
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4" style={{ border: '2px solid #E1E6EA' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl" style={{ color: '#0A0F14' }}>
                {isEditMode ? 'Edit Profit Centre' : 'Add New Profit Centre'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#6E7A82' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Profit Centre Code <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input
                    type="text"
                    value={profitCentreCode}
                    onChange={(e) => setProfitCentreCode(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                    placeholder="e.g., PC-NORTH-001"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Profit Centre Name <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input
                    type="text"
                    value={profitCentreName}
                    onChange={(e) => setProfitCentreName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                    placeholder="e.g., North Region Sales"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Department <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Head of PC <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input
                    type="text"
                    value={headOfPC}
                    onChange={(e) => setHeadOfPC(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                    placeholder="Head name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Revenue Target (₹) <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input
                    type="number"
                    value={revenueTarget}
                    onChange={(e) => setRevenueTarget(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                    placeholder="e.g., 50000000"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Region <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
                  >
                    <option value="">Select Region</option>
                    {regions.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Status <span style={{ color: '#FF4E5B' }}>*</span></label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
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
                  style={{ border: '1px solid #E1E6EA', color: '#6E7A82' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: '#00A9B7' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
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
          onApprove={(comments) => handleApprovalAction('approve', comments)}
          onReject={(comments) => handleApprovalAction('reject', comments)}
          onMoreInfo={(comments) => handleApprovalAction('moreinfo', comments)}
        />
      )}
    </div>
  );
}
