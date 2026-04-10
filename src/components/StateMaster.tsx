import { ArrowLeft, Plus, Trash2, X, Hash, MapPin, Globe, FileText, Edit, Eye, Search, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';
import { MasterFormPage } from './ui/MasterFormPage';

interface State {
  id: string;
  stateCode: string;
  stateName: string;
  country: string;
  status: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  originalData?: State;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function StateMaster() {
  const navigate = useNavigate();
  const [states, setStates] = useIncrementalMasterRecords<State>('state_master', [
    { id: '1', stateCode: 'MH', stateName: 'Maharashtra', country: 'India', status: 'Active', approvalStatus: 'Approved' },
    { id: '2', stateCode: 'DL', stateName: 'Delhi', country: 'India', status: 'Active', approvalStatus: 'Approved' },
    { id: '3', stateCode: 'KA', stateName: 'Karnataka', country: 'India', status: 'Active', approvalStatus: 'Pending Approval' },
    { id: '4', stateCode: 'TN', stateName: 'Tamil Nadu', country: 'India', status: 'Active', approvalStatus: 'Approved' },
    { id: '5', stateCode: 'GJ', stateName: 'Gujarat', country: 'India', status: 'Active', approvalStatus: 'Draft' }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [stateCode, setStateCode] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('Active');

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<State | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const filteredStates = useMemo(() => {
    return states.filter((state) => {
      const haystack = [state.stateCode, state.stateName, state.country].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesCountry = countryFilter.length === 0 || countryFilter.includes(state.country);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(state.status);
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(state.approvalStatus);
      return matchesSearch && matchesCountry && matchesStatus && matchesApproval;
    });
  }, [states, searchTerm, countryFilter, statusFilter, approvalFilter]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    countryFilter.length > 0 ||
    statusFilter.length > 0 ||
    approvalFilter.length > 0;

  const handleSubmit = (approvalStatus: State['approvalStatus'] = 'Pending Approval') => {
    if (isEditMode && editingId) {
      const originalRecord = states.find(s => s.id === editingId);
      
      const updatedState: State = {
        id: editingId,
        stateCode,
        stateName,
        country,
        status,
        approvalStatus,
        originalData: originalRecord
      };
      
      setStates(states.map(s => s.id === editingId ? updatedState : s));
    } else {
      const newState: State = {
        id: Date.now().toString(),
        stateCode,
        stateName,
        country,
        status,
        approvalStatus
      };
      setStates([...states, newState]);
    }
    
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setStateCode('');
    setStateName('');
    setCountry('');
    setStatus('Active');
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (state: State) => {
    setIsEditMode(true);
    setEditingId(state.id);
    setStateCode(state.stateCode);
    setStateName(state.stateName);
    setCountry(state.country);
    setStatus(state.status);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const state = states.find(s => s.id === id);
    
    if (state?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    
    setStates(states.filter(s => s.id !== id));
  };

  const handleReview = (state: State) => {
    const changes: Change[] = [];
    
    if (state.originalData) {
      const original = state.originalData;
      
      if (original.stateCode !== state.stateCode) {
        changes.push({ field: 'State Code', oldValue: original.stateCode, newValue: state.stateCode });
      }
      if (original.stateName !== state.stateName) {
        changes.push({ field: 'State Name', oldValue: original.stateName, newValue: state.stateName });
      }
      if (original.country !== state.country) {
        changes.push({ field: 'Country', oldValue: original.country, newValue: state.country });
      }
      if (original.status !== state.status) {
        changes.push({ field: 'Status', oldValue: original.status, newValue: state.status });
      }
    }
    
    setCurrentReviewRecord(state);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('state_master', states, currentReviewRecord.id, 'approve');
      setStates(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('state_master', states, currentReviewRecord.id, 'reject');
      setStates(nextRecords);
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
      const nextRecords = await applyMasterApprovalAction('state_master', states, currentReviewRecord.id, 'request_info', comments);
      setStates(nextRecords);
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
        title="State Master"
        subtitle="Manage states with approval workflow"
        modeLabel={isEditMode ? 'Edit State' : 'Create State'}
        onBack={() => setShowForm(false)}
        onCancel={() => setShowForm(false)}
        onSaveDraft={() => handleSubmit('Draft')}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
      >
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>State Code <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={stateCode} onChange={(e) => setStateCode(e.target.value)} placeholder="e.g., UP" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>State Name <span style={{ color: '#FF4E5B' }}>*</span></label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="e.g., Uttar Pradesh" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Country</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., India" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
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
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>State Master</h1>
            <p style={{ color: '#6E7A82' }}>Manage states with approval workflow</p>
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
          Add State
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: '#E1E6EA' }}>
              <h2 className="text-xl" style={{ color: '#0A0F14' }}>
                {isEditMode ? 'Edit State' : 'Add New State'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg transition-colors" style={{ color: '#6E7A82' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>State Code <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input type="text" value={stateCode} onChange={(e) => setStateCode(e.target.value)} placeholder="e.g., UP" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>State Name <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="e.g., Uttar Pradesh" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>Country</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6E7A82' }} />
                    <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., India" className="w-full pl-10 pr-3 py-2 rounded-lg" style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }} />
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
        recordType="State Master"
        recordId={currentReviewRecord?.stateCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <div className="rounded-[24px] overflow-hidden bg-white" style={{ border: '1px solid #D7E3EA', boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)' }}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: '1080px' }}>
            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '1.2fr 1.6fr 1.2fr 1fr 1.3fr 0.9fr', borderBottom: '1px solid #E8F0F4' }}>
              <div className="space-y-2">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6E7A82' }} />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search states..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm"
                    style={{ backgroundColor: '#F8FBFD', border: '1px solid #D7E3EA', color: '#0A0F14' }}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCountryFilter([]);
                      setStatusFilter([]);
                      setApprovalFilter([]);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style={{ backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', color: '#C53030', fontWeight: 600 }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              <div />
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Country"
                  options={[...new Set(states.map((state) => state.country).filter(Boolean))]}
                  selected={countryFilter}
                  onToggle={(value) => setCountryFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Status"
                  options={['Active', 'Inactive']}
                  selected={statusFilter}
                  onToggle={(value) => setStatusFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Approval"
                  options={['Draft', 'Pending Approval', 'Approved', 'Rejected']}
                  selected={approvalFilter}
                  onToggle={(value) => setApprovalFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div />
            </div>

            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '1.2fr 1.6fr 1.2fr 1fr 1.3fr 0.9fr', background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)', borderBottom: '1px solid #E4EDF2' }}>
              {['State Code', 'State Name', 'Country', 'Status', 'Approval Status', 'Action'].map((column) => (
                <div key={column} className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6E7A82', fontWeight: 700 }}>
                  {column}
                </div>
              ))}
            </div>

            <div>
              {filteredStates.map((state, index) => (
                <div
                  key={state.id}
                  className="grid gap-4 px-6 py-4 items-center"
                  style={{
                    gridTemplateColumns: '1.2fr 1.6fr 1.2fr 1fr 1.3fr 0.9fr',
                    borderBottom: index === filteredStates.length - 1 ? 'none' : '1px solid #EDF3F7',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div style={{ color: '#0A0F14', fontWeight: 700 }}>{state.stateCode}</div>
                  <div style={{ color: '#0A0F14' }}>{state.stateName}</div>
                  <div style={{ color: '#6E7A82' }}>{state.country}</div>
                  <div>
                    <span className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: state.status === 'Active' ? '#E8F7F8' : '#FFE8EA', color: state.status === 'Active' ? '#00A9B7' : '#FF4E5B', fontWeight: 700 }}>
                      {state.status}
                    </span>
                  </div>
                  <div>
                    <span className="px-3 py-1.5 rounded-full text-xs" style={{ ...getStatusBadgeStyle(state.approvalStatus), fontWeight: 700 }}>
                      {state.approvalStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {state.approvalStatus === 'Pending Approval' && (
                      <PremiumActionButton label="Review state" icon={<Eye className="w-4 h-4" />} tone="teal" onClick={() => handleReview(state)} />
                    )}
                    <PremiumActionButton label="Edit state" icon={<Edit className="w-4 h-4" />} tone="violet" onClick={() => handleEdit(state)} />
                    <PremiumActionButton label="Open state" icon={<ArrowUpRight className="w-4 h-4" />} tone="blue" onClick={() => handleEdit(state)} />
                    <PremiumActionButton label="Delete state" icon={<Trash2 className="w-4 h-4" />} tone="amber" onClick={() => handleDelete(state.id)} />
                  </div>
                </div>
              ))}
              {filteredStates.length === 0 && (
                <div className="px-8 py-16 text-center">
                  <p className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: 700 }}>No states match the current filters</p>
                  <p className="text-sm" style={{ color: '#6E7A82' }}>Clear one or more filters to bring the full register back.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
